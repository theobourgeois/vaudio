# @vaudio/core

Core visualization functionality for audio applications. Framework-agnostic audio visualization library built with Three.js.

## Installation

```bash
npm install @vaudio/core
# or
yarn add @vaudio/core
# or
pnpm add @vaudio/core
```

## Usage

```typescript
import { createVisualizerObject, VisualizerStore } from '@vaudio/core';

// Create a visualizer store
const store = new VisualizerStore();

// Create a visualizer object
const object = createVisualizerObject({
  // configuration
});
```

## License

MIT 