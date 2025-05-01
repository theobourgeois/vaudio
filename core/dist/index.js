"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  VisualizerObjectBuilder: () => VisualizerObjectBuilder,
  VisualizerStore: () => VisualizerStore,
  createVisualizerObject: () => createVisualizerObject,
  defaultTransform: () => defaultTransform,
  defaultVisualizerObject: () => defaultVisualizerObject
});
module.exports = __toCommonJS(index_exports);

// src/create-visualizer-object.ts
var THREE = __toESM(require("three"));

// src/defaults.ts
function defaultTransform() {
  return {
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1
  };
}
function defaultVisualizerObject() {
  return {
    ...defaultTransform(),
    domain: "frequency"
  };
}

// src/await-maybe.ts
function awaitMaybe(value) {
  return value instanceof Promise ? value : Promise.resolve(value);
}

// src/create-visualizer-object.ts
var VisualizerObjectBuilder = class _VisualizerObjectBuilder {
  // Private constructor to be called by static method or internal methods
  constructor(config) {
    this.config = config;
  }
  // Static method to start the builder without initial types
  static create() {
    return new _VisualizerObjectBuilder({});
  }
  // --- Builder Methods ---
  /**
   * Defines the default properties for the object.
   * These properties will be merged with the base VisualizerObject properties.
   * 
   * @param fn - Function that returns an object with default properties
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```tsx
   * .defaults(() => ({
   *   size: 1,
   *   color: 'red',
   *   customProperty: 'value'
   * }))
   * ```
   */
  defaults(fn) {
    const newConfig = {
      ...this.config,
      defaultsFn: fn
    };
    return new _VisualizerObjectBuilder(newConfig);
  }
  /**
   * Defines the geometry for the object.
   * 
   * @param fn - Function that returns a THREE.BufferGeometry
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```tsx
   * .geometry(({ layer }) => new THREE.BoxGeometry(layer.size))
   * ```
   */
  geometry(fn) {
    const newConfig = {
      ...this.config,
      geometryFn: fn
    };
    return new _VisualizerObjectBuilder(newConfig);
  }
  /**
   * Defines the material for the object.
   * 
   * @param fn - Function that returns a THREE.Material
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```tsx
   * .material(({ layer }) => new THREE.MeshStandardMaterial({ color: layer.color }))
   * ```
   */
  material(fn) {
    const newConfig = {
      ...this.config,
      materialFn: fn
      // Cast needed as TMat changes
    };
    return new _VisualizerObjectBuilder(newConfig);
  }
  // Alias for material
  shader(fn) {
    return this.material(fn);
  }
  /**
   * Creates a custom object, overriding the default geometry/material creation.
   * 
   * @param fn - Function that returns a THREE.Object3D
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```tsx
   * .createObject(({ layer }) => new THREE.Group())
   * ```
   */
  createObject(fn) {
    const newConfig = {
      ...this.config,
      createObjectFn: fn
    };
    return new _VisualizerObjectBuilder(newConfig);
  }
  /**
   * Defines initialization logic that runs only once when the object is first created.
   * 
   * @param fn - Function that performs one-time initialization
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```tsx
   * .start(({ mesh, layer, scene }) => {
   *   mesh.renderOrder = 1000;
   *   const light = new THREE.PointLight(layer.color, 1.0, 5.0);
   *   mesh.add(light);
   * })
   * ```
   */
  start(fn) {
    this.config.startFn = fn;
    return this;
  }
  /**
   * Defines custom rendering logic.
   * 
   * @param fn - Function that handles custom rendering
   * @returns The builder instance for method chaining
   * 
   * @example
   * ```tsx
   * .render(({ mesh, layer, audioData }) => {
   *   // Custom rendering logic
   * })
   * ```
   */
  render(fn) {
    if (!this.config.createObjectFn && !this.config.geometryFn) {
      throw new Error(
        "renderObject error: .geometry() or .createObject() must be called before .render()"
      );
    }
    if (!this.config.createObjectFn && !this.config.materialFn) {
      throw new Error(
        "renderObject error: .material() or .createObject() must be called before .render()"
      );
    }
    this.config.renderFn = fn;
    const renderFn = async (args) => {
      let obj = args.idToMesh.get(args.id);
      if (!obj) {
        if (this.config.createObjectFn) {
          obj = await awaitMaybe(this.config.createObjectFn(args));
        } else {
          const geometry = await awaitMaybe(this.config.geometryFn?.(args));
          const material = await awaitMaybe(this.config.materialFn?.(args));
          obj = new THREE.Mesh(geometry, material);
        }
        args.scene.add(obj);
        args.idToMesh.set(args.id, obj);
        if ("castShadow" in obj && typeof obj.castShadow === "boolean") {
          obj.castShadow = true;
        }
        if ("receiveShadow" in obj && typeof obj.receiveShadow === "boolean") {
          obj.receiveShadow = true;
        }
        if (this.config.startFn) {
          this.config.startFn({ ...args, mesh: obj });
        }
      }
      obj.position.set(args.props.x, args.props.y, args.props.z);
      obj.scale.set(args.props.scaleX, args.props.scaleY, args.props.scaleZ);
      obj.rotation.set(
        args.props.rotationX,
        args.props.rotationY,
        args.props.rotationZ
      );
      this.config.renderFn?.({ ...args, mesh: obj });
    };
    const finalDefaults = () => ({
      ...defaultVisualizerObject(),
      ...this.config.defaultsFn?.() || {}
    });
    return {
      getRenderFn: () => renderFn,
      getDefaults: () => finalDefaults(),
      getConfig: () => this.config
    };
  }
};
function createVisualizerObject() {
  return VisualizerObjectBuilder.create();
}

// src/visualizer-store.ts
var THREE2 = __toESM(require("three"));
var VisualizerStore = class {
  constructor(container) {
    this.camera = null;
    this.renderFns = {};
    this.idToMesh = /* @__PURE__ */ new Map();
    this.fps = 60;
    this.rafId = null;
    this.analyser = null;
    this.dataArray = null;
    this.animate = () => {
      const loop = () => {
        for (const id of Object.keys(this.renderFns)) {
          const { renderFn, layer } = this.renderFns[id];
          if (!this.analyser || !this.dataArray) continue;
          if (layer.domain === "frequency") {
            this.analyser.getByteFrequencyData(this.dataArray);
          } else {
            this.analyser.getByteTimeDomainData(this.dataArray);
          }
          renderFn({
            id,
            props: layer,
            delta: 1e3 / this.fps,
            idToMesh: this.idToMesh,
            scene: this.scene,
            camera: this.camera,
            audioData: this.dataArray
          });
        }
        this.renderer.render(this.scene, this.camera);
        this.rafId = requestAnimationFrame(loop);
      };
      loop();
    };
    this.container = container;
    this.scene = new THREE2.Scene();
    this.renderer = new THREE2.WebGLRenderer();
    container.appendChild(this.renderer.domElement);
  }
  init(options) {
    const { width, height } = this.container.getBoundingClientRect();
    const {
      x = 0,
      y = 0,
      z = 5,
      fov = 75,
      near = 0.1,
      far = 1e3
    } = options.cameraOptions || {};
    this.camera = new THREE2.PerspectiveCamera(fov, width / height, near, far);
    this.camera.position.set(x, y, z);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(new THREE2.Color(options.backgroundColor || "#000"));
    this.fps = options.fps ?? 60;
  }
  resize(width, height) {
    if (!this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderOnce();
  }
  setAudioElement(audioEl) {
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
    audioEl.addEventListener("play", () => {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
    });
  }
  registerRenderFn(id, renderFn, layer) {
    this.renderFns[id] = { renderFn, layer };
  }
  removeObject(id) {
    const mesh = this.idToMesh.get(id);
    if (mesh) {
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
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
    this.renderer.render(this.scene, this.camera);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VisualizerObjectBuilder,
  VisualizerStore,
  createVisualizerObject,
  defaultTransform,
  defaultVisualizerObject
});
