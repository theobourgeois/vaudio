import { VisualizerCore, CameraOptions } from './visualizer-core';
import * as THREE from 'three';

export class VisualizerBrowser {
  core: VisualizerCore;
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  audioData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  canvas: HTMLCanvasElement;
  private previousTime: number = 0;
  private isResizingDisabled: boolean = false;
  private fps: number = 60;
  private rafId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    options: {
      cameraOptions?: CameraOptions;
      fps?: number;
      backgroundColor?: string;
    }
  ) {
    this.canvas = canvas;

    // Use canvas.width/height attributes which are set explicitly
    // rather than clientWidth/getBoundingClientRect which may be inconsistent
    const width = canvas.width || canvas.clientWidth || 1;
    const height = canvas.height || canvas.clientHeight || 1;

    this.core = new VisualizerCore(canvas, width, height);

    const {
      x = 0,
      y = 0,
      z = 5,
      fov = 75,
      near = 0.1,
      far = 1000,
    } = options.cameraOptions || {};

    this.core.camera = new THREE.PerspectiveCamera(
      fov,
      width / height,
      near,
      far
    );
    this.core.camera?.position.set(x, y, z);

    this.core.renderer?.setPixelRatio(window.devicePixelRatio);
    this.core.renderer?.setSize(width, height, false); // false = don't update canvas style
    this.core.renderer?.setClearColor(
      new THREE.Color(options.backgroundColor || '#000')
    );

    this.fps = options.fps ?? 60;
  }

  attachAudioElement(audio: HTMLAudioElement) {
    this.audioContext = new AudioContext();
    if (!this.audioContext) {
      throw new Error('Audio context cannot be created');
    }

    audio.addEventListener('play', async () => {
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
    });

    const source = this.audioContext.createMediaElementSource(audio);
    if (!source) {
      throw new Error('Source cannot be created');
    }
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;

    if (!this.analyser) {
      throw new Error('Analyser cannot be created');
    }
    this.audioData = new Uint8Array(this.analyser.frequencyBinCount);

    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }

  /**
   * Resizes the visualizer to match the specified dimensions
   * @param width - New width of the visualizer
   * @param height - New height of the visualizer
   */
  resize(width: number, height: number) {
    if (!this.core.camera || this.isResizingDisabled) return;
    this.core.camera.aspect = width / height;
    this.core.camera.updateProjectionMatrix();
    this.core.renderer.setPixelRatio(window.devicePixelRatio);
    this.core.renderer.setSize(width, height, false); // false = don't update canvas style
    this.core.renderOnce();
  }

  setFps(fps: number) {
    this.fps = fps;
  }

  start() {
    const frameInterval = 1000 / this.fps;
    let lastFrameTime = performance.now();

    const loop = () => {
      if (!this.analyser || !this.audioContext) return;

      const now = performance.now();
      const elapsed = now - lastFrameTime;

      if (elapsed >= frameInterval) {
        const currentTime = this.audioContext.currentTime;
        const delta = currentTime - this.previousTime;
        this.analyser.getByteFrequencyData(this.audioData);
        this.core.renderFrame(this.audioData, currentTime, delta);

        this.previousTime = currentTime;
        lastFrameTime = now - (elapsed % frameInterval);
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
