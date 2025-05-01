# @vaudio/utils

**A utility toolkit for real-time audio analysis and smoothing**

`@vaudio/utils` provides a set of helper functions to analyze audio data from a Web Audio `AnalyserNode`, as well as a class for smoothing values over time. All values are normalized to a 0–1 range for easy integration with animation and visualization systems.

---

## 📦 Installation

```bash
npm install @vaudio/utils
```

---

## 🔧 AudioUtils API

All functions accept a `Uint8Array` representing raw frequency or time-domain audio data (typically from `analyser.getByteFrequencyData(...)`).

### `getAverage(audioData: Uint8Array): number`
Returns the average value of the audio data, normalized to 0–1.

### `getPeak(audioData: Uint8Array): number`
Returns the maximum value of the audio data, normalized to 0–1.

### `getRMS(audioData: Uint8Array): number`
Returns the Root Mean Square (RMS) value — a measure of audio power.

### `getBandEnergy(audioData: Uint8Array, start: number, end: number): number`
Returns the normalized average energy within a specific index range.

### `getBassEnergy(audioData: Uint8Array): number`
Energy in the lower 0–10% of the frequency spectrum.

### `getMidEnergy(audioData: Uint8Array): number`
Energy in the 10–50% midrange of the frequency spectrum.

### `getTrebleEnergy(audioData: Uint8Array): number`
Energy in the 50–90% high-frequency range.

### `getCentroid(audioData: Uint8Array): number`
Computes the spectral centroid, or the "center of mass" of the frequency spectrum.

### `getDynamicRange(audioData: Uint8Array): number`
Calculates the range between the minimum and maximum values in the audio data.

---

## 🧮 SmoothedValue

A lightweight utility class for smoothing noisy values over time. Great for animations and easing effects.

### `constructor(alpha?: number)`
- `alpha` – smoothing factor (default: `0.1`)

### `update(next: number): number`
Feeds a new value into the smoother and returns the smoothed result.

### `get(): number`
Returns the current smoothed value.

### `reset(val?: number): void`
Resets the smoothed value.

---

## ✅ Example Usage

```ts
import { AudioUtils, SmoothedValue } from '@vaudio/utils';

const avg = AudioUtils.getAverage(audioData);
const bass = AudioUtils.getBassEnergy(audioData);

const smoothedBass = new SmoothedValue(0.2);
const displayValue = smoothedBass.update(bass);
```

---

## 📘 License

MIT

