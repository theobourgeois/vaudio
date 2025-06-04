# @vaudio/core

**Core engine for building 3D audio-reactive visualizations with Three.js**

`@vaudio/core` is the low-level library behind the [`@vaudio/react`](https://www.npmjs.com/package/@vaudio/react) system. It provides a fluent builder API to define custom visualizer objects, including geometry, materials, animations, and audio-reactive behaviors.

---

## 🚀 Features

- 🔧 **Builder API** for creating custom Three.js visualizer objects
- 🎧 Audio domain integration (`time` / `frequency`)
- 🎥 Centralized `VisualizerStore` for rendering and scene management
- 🧱 Type-safe defaults, geometry, and material definitions
- 💥 Supports both built-in and custom object construction logic

---

## 📦 Installation

```bash
npm install @vaudio/core three
```

---

## 🛠 Quick Start

```ts
import { createVisualizerObject } from '@vaudio/core';
import { AudioUtils } from '@vaudio/utils';
import * as THREE from 'three';

export const MyVisualizer = createVisualizerObject()
  .defaults(() => ({
    color: '#00ffff',
    speed: 0.3,
    intensity: 0.05,
    glow: 1.0,
    lineCount: 60,
    lineWidth: 0.01,
    zoom: 1.0,
    domain: 'frequency',
    x: 0, y: 0, z: 0,
    rotationX: 0, rotationY: 0, rotationZ: 0,
    scaleX: 1, scaleY: 1, scaleZ: 1,
  }))
  .object(({ props }) => {
    const geometry = new THREE.PlaneGeometry(10, 10);
    const uniforms = {
      u_time: { value: 0 },
      u_color: { value: new THREE.Color(props.color) },
      u_speed: { value: props.speed },
      u_intensity: { value: props.intensity },
      u_glow: { value: props.glow },
      u_lineCount: { value: props.lineCount },
      u_lineWidth: { value: props.lineWidth },
      u_zoom: { value: props.zoom },
      u_bass: { value: 0 },
      u_mid: { value: 0 },
      u_treble: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        // ... (your fragment shader code here)
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Mesh(geometry, material);
  })
  .update(({ object, props }) => {
    const shader = object.material;
    shader.uniforms.u_color.value.set(props.color);
    shader.uniforms.u_speed.value = props.speed;
    shader.uniforms.u_intensity.value = props.intensity;
    shader.uniforms.u_glow.value = props.glow;
    shader.uniforms.u_lineCount.value = props.lineCount;
    shader.uniforms.u_lineWidth.value = props.lineWidth;
    shader.uniforms.u_zoom.value = props.zoom;
  }, [
    'color',
    'speed',
    'intensity',
    'glow',
    'lineCount',
    'lineWidth',
    'zoom',
  ])
  .cleanup(({ object }) => {
    object.geometry.dispose();
    object.material.dispose();
    object.userData = {};
  })
  .render(({ object, audioData, delta }) => {
    const shader = object.material;
    shader.uniforms.u_time.value += delta;
    // Example: update audio uniforms (implement your own audio utils as needed)
    shader.uniforms.u_bass.value = AudioUtils.getBassEnergy(audioData) * 0.1;
    shader.uniforms.u_mid.value = AudioUtils.getMidEnergy(audioData) * 0.1;
    shader.uniforms.u_treble.value = AudioUtils.getTrebleEnergy(audioData) * 0.1;
  });
```

---

## 🔧 API Overview

### `createVisualizerObject()`
Returns a fluent builder for defining a custom audio-reactive object.

#### `.defaults(fn)`
Define your object's default props. These extend the base `VisualizerObject` (transform + domain).

#### `.object(fn)`
Define the Three.js object (Mesh, Group, etc) using a function that receives runtime props and audio context.

#### `.update(fn, [props])`
(Optional) Update the object's props.

#### `.cleanup(fn)`
(Optional) Clean up geometry/materials when the object is removed.

#### `.render(fn)`
Runs every frame with access to `audioData`, `delta`, `object`, and `props`.

---

## 🧠 VisualizerStore

`VisualizerStore` manages your Three.js scene and rendering loop.

```ts
import { VisualizerStore } from '@vaudio/core';

const store = new VisualizerStore(containerElement);

store.init({
  backgroundColor: '#000000',
  cameraOptions: { fov: 75, x: 0, y: 0, z: 10 },
  fps: 60,
});

store.setAudioElement(audioEl);
store.registerRenderFn('box1', MyVisualizer.getRenderFn(), MyVisualizer.getDefaults());
store.animate(); // Starts the loop
```

---

## 🧩 Types

### `VisualizerObject`
All visualizer objects extend the base transform props:

```ts
type VisualizerObject = {
  domain: 'time' | 'frequency';
  startTime: number;
  endTime: number | null;
  hidden: boolean;
  x: number; y: number; z: number;
  rotationX: number; rotationY: number; rotationZ: number;
  scaleX: number; scaleY: number; scaleZ: number;
};
```

### `RenderArgs<T>`
Passed into all builder functions (`object`, `render`, etc.)

```ts
{
  id: ObjectId;
  props: T;
  audioData: Uint8Array;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  idToObjectMap: Map<ObjectId, THREE.Object3D>;
  delta: number;
  currentTime: number;
}
```

---

## 🧪 Utility Functions

### `defaultTransform()`
Returns a clean transform object.

### `defaultVisualizerObject()`
Returns a `VisualizerObject` with default domain and transform values.

---

## 🤝 React Integration

Pair `@vaudio/core` with [`@vaudio/react`](https://www.npmjs.com/package/@vaudio/react) to easily mount visualizer components in React.

---

## �� License

MIT

---