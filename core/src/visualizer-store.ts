import * as THREE from 'three';
import { ObjectId, RenderFn, VisualizerObject } from './types';
import { awaitMaybe } from './await-maybe';

/**
 * Options for configuring the camera in the visualizer
 */
type CameraOptions = {
  /** Field of view in degrees */
  fov?: number;
  /** Near clipping plane */
  near?: number;
  /** Far clipping plane */
  far?: number;
  /** X position of the camera */
  x?: number;
  /** Y position of the camera */
  y?: number;
  /** Z position of the camera */
  z?: number;
};

/**
 * A store that manages the Three.js scene, camera, and renderer for audio visualization.
 * Handles rendering, audio analysis, and object management.
 */
export class VisualizerStore {
  /** The Three.js scene containing all visual elements */
  private scene: THREE.Scene;
  /** The perspective camera used for viewing the scene */
  private camera: THREE.PerspectiveCamera | null = null;
  /** The WebGL renderer used to render the scene */
  private renderer: THREE.WebGLRenderer;
  /** Map of render functions and their associated layers */
  private renderFns: Record<
    ObjectId,
    {
      renderFn: RenderFn<VisualizerObject>;
      layer: VisualizerObject;
      cleanupFn?: () => void;
    }
  > = {};
  /** The audio context for processing audio data */
  private audioContext: AudioContext | null = null;
  /** The audio analyzer node for processing audio data */
  private analyser: AnalyserNode | null = null;
  /** The array buffer for storing audio analysis data */
  private dataArray: Uint8Array | null = null;
  /** Map of object IDs to Three.js objects */
  private idToObjectMap = new Map<ObjectId, THREE.Object3D>();
  /** The HTML container element for the visualizer */
  private container: HTMLElement;
  /** Target frames per second for animation */
  private fps = 60;
  /** ID of the current animation frame request */
  private rafId: number | null = null;
  /** Current time of the audio playback */
  private currentTime = 0;
  /** Whether to disable resizing */
  private isResizingDisabled = false;
  /** The audio element used for playback */
  private audioEl: HTMLAudioElement | null = null;

  /**
   * Creates a new VisualizerStore instance
   * @param container - The HTML element that will contain the visualizer
   */
  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    container.appendChild(this.renderer.domElement);
  }

  /**
   * Initializes the visualizer with the specified options
   * @param options - Configuration options for the visualizer
   * @param options.backgroundColor - Background color of the scene
   * @param options.cameraOptions - Camera configuration options
   * @param options.fps - Target frames per second for animation
   */
  init(options: {
    backgroundColor?: string;
    cameraOptions?: CameraOptions;
    fps?: number;
  }) {
    const { width, height } = this.container.getBoundingClientRect();
    const {
      x = 0,
      y = 0,
      z = 5,
      fov = 75,
      near = 0.1,
      far = 1000,
    } = options.cameraOptions || {};

    this.camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    this.camera.position.set(x, y, z);

    this.renderer.setSize(width, height);
    this.renderer.setClearColor(
      new THREE.Color(options.backgroundColor || '#000')
    );

    this.fps = options.fps ?? 60;
  }

  setCameraOptions(options: CameraOptions) {
    const { x = 0, y = 0, z = 5, fov = 75, near = 0.1, far = 1000 } = options;
    if (this.camera) {
      this.camera.position.set(x, y, z);
      this.camera.fov = fov;
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  setResizingDisabled(disabled: boolean) {
    this.isResizingDisabled = disabled;
  }

  setBackgroundColor(color: string) {
    this.renderer.setClearColor(new THREE.Color(color));
  }

  setFps(fps: number) {
    this.fps = fps;
  }

  /**
   * Resizes the visualizer to match the specified dimensions
   * @param width - New width of the visualizer
   * @param height - New height of the visualizer
   */
  resize(width: number, height: number) {
    if (!this.camera || this.isResizingDisabled) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderOnce(); // optional immediate render
  }

  /**
   * Sets up audio analysis for the specified audio element
   * @param audioEl - The HTML audio element to analyze
   */
  setAudioElement(audioEl: HTMLAudioElement) {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const source = audioContext.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    this.audioContext = audioContext;
    this.analyser = analyser;
    this.dataArray = dataArray;
    this.audioEl = audioEl;

    // resume on play
    audioEl.addEventListener('play', () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    });

    audioEl.addEventListener('timeupdate', () => {
      this.currentTime = audioEl.currentTime;
    });
  }

  /**
   * Starts the animation loop for the visualizer
   */
  animate = () => {
    let lastFrameTime = performance.now();

    const loop = async () => {
      const currentTime = performance.now();
      const frameInterval = 1000 / this.fps; // Time between frames in ms
      const deltaTime = currentTime - lastFrameTime;

      // Only render if enough time has passed for the target FPS
      if (deltaTime >= frameInterval) {
        for (const id of Object.keys(this.renderFns)) {
          const { renderFn, layer } = this.renderFns[id];
          if (!this.analyser || !this.dataArray) continue;

          if (layer.domain === 'frequency') {
            this.analyser.getByteFrequencyData(this.dataArray);
          } else {
            this.analyser.getByteTimeDomainData(this.dataArray);
          }
          const isTimeOutOfBounds =
            (layer.endTime !== null && layer.endTime < this.currentTime) ||
            layer.startTime > this.currentTime;

          if (isTimeOutOfBounds) {
            const object = this.idToObjectMap.get(id);
            if (object) {
              object.visible = false;
            }
            continue;
          }

          // Make sure object is visible when it should be shown
          const object = this.idToObjectMap.get(id);
          if (object) {
            object.visible = true;
            if (layer.hidden) {
              object.visible = false;
            }
          }

          await awaitMaybe(
            renderFn({
              id,
              props: layer,
              delta: deltaTime / 1000, // Use actual delta time instead of fixed value
              idToObjectMap: this.idToObjectMap,
              scene: this.scene,
              camera: this.camera!,
              audioData: this.dataArray,
              currentTime: this.currentTime,
              renderer: this.renderer,
            })
          );
        }

        this.renderer.render(this.scene, this.camera!);
        lastFrameTime = currentTime;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    loop();
  };

  /**
   * Registers a render function for a specific object
   * @param id - Unique identifier for the object
   * @param renderFn - Function to render the object
   * @param layer - Visualizer object configuration
   * @param cleanupFn - Optional cleanup function to call when removing the object
   */
  registerRenderFn(
    id: ObjectId,
    renderFn: RenderFn<VisualizerObject>,
    layer: VisualizerObject,
    cleanupFn?: () => void
  ) {
    this.renderFns[id] = { renderFn, layer, cleanupFn };
  }

  /**
   * Removes an object from the visualizer
   * @param id - ID of the object to remove
   */
  removeObject(id: ObjectId) {
    this.renderFns?.[id]?.cleanupFn?.();
    const object = this.idToObjectMap.get(id);
    if (object) {
      if ((object as THREE.Mesh).geometry) {
        (object as THREE.Mesh).geometry.dispose();
      }
      if ((object as THREE.Mesh).material) {
        const materials = (
          Array.isArray((object as THREE.Mesh).material)
            ? (object as THREE.Mesh).material
            : [(object as THREE.Mesh).material]
        ) as THREE.Material[];
        materials.forEach((mat) => mat.dispose());
      }
      this.scene.remove(object);
      this.idToObjectMap.delete(id);
    }
    delete this.renderFns[id];
  }

  /**
   * Stops the animation loop
   */
  stop() {
    if (this.rafId) {
      clearTimeout(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Gets the Three.js scene
   * @returns The scene object
   */
  getScene() {
    return this.scene;
  }

  /**
   * Gets the camera
   * @returns The camera object
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Gets the renderer
   * @returns The renderer object
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * Gets the audio context
   * @returns The audio context object
   */
  getAudioContext() {
    return this.audioContext;
  }

  /**
   * Gets the audio analyzer node
   * @returns The audio analyzer node
   */
  getAnalyser() {
    return this.analyser;
  }

  /**
   * Gets the array buffer for storing audio analysis data
   * @returns The array buffer
   */
  getDataArray() {
    return this.dataArray;
  }

  /**
   * Gets the map of object IDs to Three.js objects
   * @returns The ID to object map
   */
  getIdToObjectMap() {
    return this.idToObjectMap;
  }

  /**
   * Renders the scene once without starting the animation loop
   */
  renderOnce() {
    this.renderer.render(this.scene, this.camera!);
  }
}
