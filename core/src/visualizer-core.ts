import * as THREE from 'three';
import { ObjectId, RenderFn, VisualizerObject } from './types';
import { awaitMaybe } from './await-maybe';

/**
 * Options for configuring the camera in the visualizer
 */
export type CameraOptions = {
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
export class VisualizerCore {
  /** The Three.js scene containing all visual elements */
  scene: THREE.Scene;
  /** The perspective camera used for viewing the scene */
  camera: THREE.PerspectiveCamera | null = null;
  /** The WebGL renderer used to render the scene */
  renderer: THREE.WebGLRenderer;
  /** Map of render functions and their associated layers */
  private renderFns: Record<
    ObjectId,
    {
      renderFn: RenderFn<VisualizerObject>;
      layer: VisualizerObject;
      cleanupFn?: () => void;
    }
  > = {};
  private idToObjectMap = new Map<ObjectId, THREE.Object3D>();

  /**
   * Creates a new VisualizerStore instance
   * @param canvasOrGl - The canvas element or WebGL context to render to
   * @param width - Initial width
   * @param height - Initial height
   */
  constructor(canvasOrGl: HTMLCanvasElement | WebGLRenderingContext, width: number, height: number) {
    this.scene = new THREE.Scene();
    
    // Check if it's a canvas or a GL context
    if (canvasOrGl instanceof HTMLCanvasElement) {
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: canvasOrGl,
        antialias: true,
        alpha: true,
      });
    } else {
      // It's a WebGL context (for Node.js/headless rendering)
      this.renderer = new THREE.WebGLRenderer({ 
        context: canvasOrGl,
      });
    }
    
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.renderer.setSize(width, height, false);
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

  /**
   * Renders a frame of the visualizer
   * @param audioData - The audio data to render
   * @param currentTime - The current time in seconds
   * @param delta - The time since the last frame in seconds
   */
  async renderFrame(audioData: Uint8Array, currentTime: number, delta: number) {
    for (const id of Object.keys(this.renderFns)) {
      const { renderFn, layer } = this.renderFns[id];
      await awaitMaybe(
        renderFn({
          id,
          props: layer,
          delta,
          idToObjectMap: this.idToObjectMap,
          scene: this.scene,
          camera: this.camera!,
          audioData,
          currentTime,
          renderer: this.renderer,
        })
      );
    }
    this.renderer.render(this.scene, this.camera!);
  }

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

  setBackgroundColor(color: string) {
    this.renderer.setClearColor(new THREE.Color(color));
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
   * Renders the scene once without starting the animation loop
   */
  renderOnce() {
    this.renderer.render(this.scene, this.camera!);
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
   * Gets the map of object IDs to Three.js objects
   * @returns The ID to object map
   */
  getIdToObjectMap() {
    return this.idToObjectMap;
  }
}
