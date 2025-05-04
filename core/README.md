# @vaudio/core

**Core engine for building 3D audio-reactive visualizations with Three.js**

`@vaudio/core` is the low-level library behind the [`@vaudio/react`](https://www.npmjs.com/package/@vaudio/react) system. It provides a builder-style API to define custom visualizer objects, including geometry, materials, animations, and audio-reactive behaviors.

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
import * as THREE from 'three';

export const MyVisualizer = createVisualizerObject()
  .defaults(() => ({
    size: 1,
    color: 'hotpink',
    domain: 'frequency',
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
  }))
  .object(({ props }) => {
    const geometry = new THREE.BoxGeometry(props.size, props.size, props.size);
    const material = new THREE.MeshStandardMaterial({ color: props.color });
    return new THREE.Mesh(geometry, material);
  })
  .start(({ object }) => {
    object.castShadow = true;
  })
  .render(({ object, audioData }) => {
    const scale = 1 + audioData[0] / 256;
    object.scale.set(scale, scale, scale);
  });
```

---

## 🔧 API Overview

### `createVisualizerObject()`

Returns a fluent builder to define a custom audio-reactive object.

#### `.defaults(fn)`
Define your object’s default props. These extend the base `VisualizerObject` (transform + domain).

#### `.geometry(fn)`
Define the geometry using a function that receives runtime props and audio context.

#### `.material(fn)` / `.shader(fn)`
Define the material. Use `.shader` if your material uses custom shaders.

#### `.createObject(fn)`
Use this to override default geometry/material logic and return a `THREE.Object3D`.

#### `.start(fn)`
Runs once after the object is added to the scene.

#### `.render(fn)`
Runs every frame with access to `audioData`, `delta`, `mesh`, and `props`.

---

## 🧠 VisualizerStore

`VisualizerStore` manages your Three.js scene and rendering loop.

```ts
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
  x, y, z: number;
  rotationX, rotationY, rotationZ: number;
  scaleX, scaleY, scaleZ: number;
};
```

### `RenderArgs<T>`

Passed into all builder functions (`geometry`, `material`, `render`, etc.)

```ts
{
  id: ObjectId;
  props: T;
  audioData: Uint8Array;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  idToObjectMap: Map<ObjectId, THREE.Object3D>;
  delta: number;
}
```

---

## 🧪 Utility Functions

### `defaultTransform()`
Returns a clean transform object.

### `defaultVisualizerObject()`
Returns a `VisualizerObject` with default domain and transform values.

---

## 🤝 Used With

Pair `@vaudio/core` with [`@vaudio/react`](https://www.npmjs.com/package/@vaudio/react) to easily mount visualizer components in React.

---

## 📘 License

MIT

---