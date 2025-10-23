import { useEffect, useState } from 'react';
import { VisualizerRef } from './visualizer';

// Easing functions
const easeLinear = (t: number) => t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => t * (2 - t);

/**
 * Returns the appropriate easing function based on the provided easing type or function.
 * @param easing - The easing type or custom easing function
 * @returns A function that takes a progress value (0-1) and returns an eased value (0-1)
 */
const getEasingFunction = (easing: Keyframe['easing'] = 'linear') => {
  if (typeof easing === 'function') return easing;
  switch (easing) {
    case 'linear':
      return easeLinear;
    case 'ease-in-out':
      return easeInOut;
    case 'ease-in':
      return easeIn;
    case 'ease-out':
      return easeOut;
    default:
      return easeLinear;
  }
};

/**
 * Represents a single keyframe in an animation sequence.
 * @property {number} time - The time in seconds when this keyframe should be active
 * @property {number} value - The numeric value at this keyframe
 * @property {KeyframeEasing} [easing] - Optional easing function to use when interpolating to the next keyframe
 */
export type Keyframe = {
  time: number;
  value: number;
  /** Optional easing function or predefined easing string */
  easing?: 'linear' | 'ease-in-out' | 'ease-in' | 'ease-out' | ((t: number) => number);
};

/**
 * Hook that returns a function to evaluate interpolated values based on audio time and keyframes.
 * @param visualizerRef - A React ref to the Visualizer component containing the audio element
 * @returns A function that takes an array of keyframes and returns the current interpolated value
 */
export function useKeyframe(visualizerRef: React.RefObject<VisualizerRef | null>) {
  return (keyframes: Keyframe[]) => {
    return useIndividualKeyframe(visualizerRef, keyframes);
  };
}

/**
 * Internal hook that evaluates a list of keyframes to compute a time-based interpolated value.
 * This version only runs its update loop when the audio is playing.
 * 
 * @param visualizerRef - A React ref to the Visualizer component containing the audio element
 * @param keyframes - Array of keyframes defining the animation sequence
 * @returns The current interpolated value based on the audio time and keyframes
 * 
 * @example
 * ```tsx
 * const value = useIndividualKeyframe(visualizerRef, [
 *   { time: 0, value: 0 },
 *   { time: 2, value: 100, easing: 'ease-in-out' }
 * ]);
 * ```
 */
export function useIndividualKeyframe(
  visualizerRef: React.RefObject<VisualizerRef | null>,
  keyframes: Keyframe[]
) {
  const [value, setValue] = useState<number>(0);

  useEffect(() => {
    const audio = visualizerRef.current?.audioElement;
    if (!audio) return;

    let animationFrameId: number;

    const updateValue = () => {
      const currentTime = audio.currentTime;
      // Find the last keyframe whose time is <= currentTime
      const currentIndex = keyframes
        .map((k) => k.time)
        .reduce(
          (acc, t, i) => (t <= currentTime && (acc === -1 || t > keyframes[acc].time) ? i : acc),
          -1
        );

      const nextIndex = currentIndex + 1;
      if (currentIndex >= 0 && nextIndex < keyframes.length) {
        const currKf = keyframes[currentIndex];
        const nextKf = keyframes[nextIndex];
        const span = nextKf.time - currKf.time;
        const progress = span > 0 ? (currentTime - currKf.time) / span : 0;
        const easingFunction = getEasingFunction(currKf.easing);
        const eased = easingFunction(progress);
        const interpolated = currKf.value + (nextKf.value - currKf.value) * eased;
        setValue(interpolated);
      } else if (currentIndex >= 0) {
        // If we are past the last keyframe, just hold its value
        setValue(keyframes[currentIndex].value);
      }

      animationFrameId = requestAnimationFrame(updateValue);
    };

    const handlePlay = () => {
      // Start the loop when audio starts (or resumes)
      animationFrameId = requestAnimationFrame(updateValue);
    };

    const handlePause = () => {
      // Stop the loop when audio pauses
      cancelAnimationFrame(animationFrameId);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // If audio is already playing at mount time, kick off the loop immediately
    if (!audio.paused) {
      handlePlay();
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      cancelAnimationFrame(animationFrameId);
    };
  }, [visualizerRef.current, keyframes]);

  return value;
}

export function useDynamicKeyframes(
  visualizerRef: React.RefObject<VisualizerRef | null>,
  keyframeMap: Record<string, Keyframe[]>,
  fallback: Record<string, number>
): Record<string, number> {
  const [values, setValues] = useState<Record<string, number>>(fallback);

  useEffect(() => {
    const audio = visualizerRef.current?.audioElement;
    if (!audio) return;

    let frame: number;

    const update = () => {
      const currentTime = audio.currentTime;
      const updated: Record<string, number> = {};

      for (const [prop, keyframes] of Object.entries(keyframeMap)) {
        const currentIndex = keyframes
          .map((k) => k.time)
          .reduce(
            (acc, t, i) =>
              t <= currentTime && (acc === -1 || t > keyframes[acc].time)
                ? i
                : acc,
            -1
          );
        const nextIndex = currentIndex + 1;

        if (currentIndex >= 0 && nextIndex < keyframes.length) {
          const curr = keyframes[currentIndex];
          const next = keyframes[nextIndex];
          const span = next.time - curr.time;
          const progress = span > 0 ? (currentTime - curr.time) / span : 0;
          const easing = getEasingFunction(curr.easing);
          const eased = easing(progress);
          updated[prop] = curr.value + (next.value - curr.value) * eased;
        } else if (currentIndex >= 0) {
          updated[prop] = keyframes[currentIndex].value;
        } else {
          updated[prop] = fallback[prop] ?? 0;
        }
      }

      setValues(updated);
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frame);
  }, [visualizerRef.current, keyframeMap]);

  return values;
}
