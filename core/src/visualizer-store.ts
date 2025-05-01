import * as THREE from 'three';
import { ObjectId, RenderFn, VisualizerObject } from './types';

type CameraOptions = {
  fov?: number;
  near?: number;
  far?: number;
  x?: number;
  y?: number;
  z?: number;
};

export class VisualizerStore {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer;
  private renderFns: Record<ObjectId, { renderFn: RenderFn<VisualizerObject>, layer: VisualizerObject }> = {};
  private idToMesh = new Map<ObjectId, THREE.Object3D>();
  private container: HTMLElement;
  private fps = 60;
  private rafId: number | null = null;

  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer();
    container.appendChild(this.renderer.domElement);
  }

  init(options: {
    backgroundColor?: string;
    cameraOptions?: CameraOptions;
    fps?: number;
  }) {
    const { width, height } = this.container.getBoundingClientRect();
    const {
      x = 0, y = 0, z = 5,
      fov = 75, near = 0.1, far = 1000,
    } = options.cameraOptions || {};

    this.camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    this.camera.position.set(x, y, z);

    this.renderer.setSize(width, height);
    this.renderer.setClearColor(new THREE.Color(options.backgroundColor || '#000'));

    this.fps = options.fps ?? 60;
  }

  resize(width: number, height: number) {
    if (!this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderOnce(); // optional immediate render
  }

  setAudioElement(audioEl: HTMLAudioElement) {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const source = audioContext.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    this.analyser = analyser;
    this.dataArray = dataArray;

    // resume on play
    audioEl.addEventListener('play', () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    });
  }

  animate = () => {
    const loop = () => {
      for (const id of Object.keys(this.renderFns)) {
        const { renderFn, layer } = this.renderFns[id];
        if (!this.analyser || !this.dataArray) continue;

        if (layer.domain === 'frequency') {
          this.analyser.getByteFrequencyData(this.dataArray);
        } else {
          this.analyser.getByteTimeDomainData(this.dataArray);
        }

        renderFn({
          id,
          props: layer,
          delta: 1000 / this.fps,
          idToMesh: this.idToMesh,
          scene: this.scene,
          camera: this.camera!,
          audioData: this.dataArray,
        });
      }

      this.renderer.render(this.scene, this.camera!);
      this.rafId = requestAnimationFrame(loop);
    };

    loop();
  }

  registerRenderFn(id: ObjectId, renderFn: RenderFn<VisualizerObject>, layer: VisualizerObject) {
    this.renderFns[id] = { renderFn, layer };
  }

  removeObject(id: ObjectId) {
    const mesh = this.idToMesh.get(id);
    if (mesh) {
      if ((mesh as THREE.Mesh).geometry) {
        (mesh as THREE.Mesh).geometry.dispose();
      }
      if ((mesh as THREE.Mesh).material) {
        const materials = (Array.isArray((mesh as THREE.Mesh).material)
          ? (mesh as THREE.Mesh).material
          : [(mesh as THREE.Mesh).material]) as THREE.Material[];
        materials.forEach((mat) => mat.dispose());
      }
      this.scene.remove(mesh);
      this.idToMesh.delete(id);
    }
    delete this.renderFns[id];
  }

  stop() {
    if (this.rafId) {
      clearTimeout(this.rafId);
      this.rafId = null;
    }
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getIdToMesh() {
    return this.idToMesh;
  }

  renderOnce() {
    this.renderer.render(this.scene, this.camera!);
  }
}
