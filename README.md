# vaudio

A collection of packages for creating beautiful audio visualizations in web applications.

## Packages

This monorepo contains the following packages:

- `@vaudio/core` - Core visualization functionality for audio applications
- `@vaudio/react` - React components and hooks for audio visualization
- `@vaudio/utils` - Utility functions for audio processing

## Installation

You can install the packages individually:

```bash
# For core functionality
npm install @vaudio/core

# For React components
npm install @vaudio/react

# For utility functions
npm install @vaudio/utils
```

## Features

- 🎵 Real-time audio visualization
- 🎨 Beautiful WebGL-based visualizations using Three.js
- ⚛️ React components and hooks for easy integration
- 📦 Modular architecture with separate packages
- 🔧 TypeScript support

## Usage

### With React

```tsx
import { Visualizer } from '@vaudio/react';
import { CustomVisualizer } from "@/components/visualizers"

function App() {
  return (
    <Visualizer
      cameraOptions={{
        fov: 105,
        z: 15, // Adjusted camera distance
      }}
      ref={audioRef}
      audioOptions={{
        src: audioSource,
      }}
      fps={60}
      backgroundColor="black"
    >
      <CustomVisualizer ... />
    </Visualizer>
  );
}
```

### Core Package

```typescript
import { createVisualizerObject } from '@vaudio/core';

const visualizer = createVisualizer({
  canvas: document.getElementById('canvas'),
  audioSource: audioElement
});

visualizer.start();
```

## Development

This project uses pnpm workspaces. To get started:

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build all packages:
   ```bash
   pnpm run build
   ```
4. Start development mode:
   ```bash
   pnpm run dev
   ```

### Testing

Run tests for all packages:
```bash
pnpm test
```

Or test a specific package:
```bash
# Test core package
pnpm --filter @vaudio/core test

# Test react package
pnpm --filter @vaudio/react test

# Test utils package
pnpm --filter @vaudio/utils test
```

### Demo

To run the demo application:
```bash
# Start core and react packages in watch mode
pnpm --filter @vaudio/core dev
pnpm --filter @vaudio/react dev

# Start the demo
cd demo
pnpm dev
```

## License

MIT © Théo Bourgeois
