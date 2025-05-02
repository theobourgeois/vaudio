# @vaudio/react

**React bindings for the @vaudio/core audio visualization library**

Use `@vaudio/react` to bring your custom `@vaudio/core` visualizer objects into a React app with a declarative, component-based API.

---

## 📦 Installation

```bash
npm install @vaudio/react @vaudio/core three
```

---

## 🧪 Quick Start

```tsx
import { Visualizer } from '@vaudio/react';
import { MyVisualizer } from './visualizers/MyVisualizer';

export default function App() {
  return (
    <Visualizer
      audioOptions={{ src: '/music.mp3' }}
      cameraOptions={{ z: 10 }}
      backgroundColor="black"
    >
      <MyVisualizer id="wave" size={2} color="red" />
    </Visualizer>
  );
}
```

---

## 🔧 API

### `Visualizer`

The root component that sets up the Three.js scene, manages audio analysis, and provides context for child visualizers.

**Props:**
- `audioOptions` – passed to `<audio>` element
- `cameraOptions` – `{ fov, x, y, z }`
- `backgroundColor` – scene background
- `fps` – target frames per second
- `containerProps` – props passed to the outer container

### `withReact()`

Turns a `createVisualizerObject()` builder into a React component.

```tsx
const MyVisualizer = withReact(
  createVisualizerObject()
    .defaults(() => ({ size: 1, color: 'blue' }))
    .geometry(({ layer }) => new THREE.BoxGeometry(layer.size))
    .material(({ layer }) => new THREE.MeshStandardMaterial({ color: layer.color }))
    .render()
);

<MyVisualizer.asVisualizerComponent() size={2} color="hotpink" />
```

### `createVisualizerComponent()`

Lower-level API for wrapping `@vaudio/core` render functions as React components.
Useful when not using the builder pattern.

```tsx
const Cube = createVisualizerComponent(defaults, renderFn);

<Cube id="cube1" size={2} />
```

---

## 🧠 Hooks & Context

### `useVisualizer()`

Access runtime scene, audio analysis, and rendering control.

```tsx
const { triggerRender, dataArrayRef } = useVisualizer();
```

---

## 🧱 Example Visualizer File

```ts
// MyVisualizer.ts
export const MyVisualizer = withReact(
  createVisualizerObject()
    .defaults(() => ({ size: 1, color: 'cyan', domain: 'frequency' }))
    .geometry(({ layer }) => new THREE.SphereGeometry(layer.size, 32, 32))
    .material(({ layer }) => new THREE.MeshStandardMaterial({ color: layer.color }))
    .render(({ mesh, audioData }) => {
      const avg = audioData.reduce((a, b) => a + b, 0) / audioData.length;
      const scale = 1 + avg / 256;
      mesh.scale.set(scale, scale, scale);
    })
);
```

---

## 🧩 Related

- [@vaudio/core](https://www.npmjs.com/package/@vaudio/core) – core builder system for defining visualizer objects

---

## 📘 License

MIT

