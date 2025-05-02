# vaudio Demo

A demo application showcasing the vaudio packages in action.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Start the development environment:
```bash
# Start the core package in watch mode
pnpm --filter @vaudio/core dev

# Start the react package in watch mode
pnpm --filter @vaudio/react dev

# Start the demo app
pnpm dev
```

The demo will be available at `http://localhost:5173`

## Features

- Real-time audio visualization
- Multiple visualization presets
- Audio file upload support
- Interactive controls

## Development

- The demo app uses Vite for fast development
- Changes to `@vaudio/core` and `@vaudio/react` will be reflected in real-time
- Use the demo to test new features and visualizations
