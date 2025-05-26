import { VisualizerObject, Transform } from "./types";

export function defaultTransform(): Transform {
  return {
    x: 0,
    y: 0,
    z: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
  };
}

export function defaultVisualizerObject(): VisualizerObject {
  return {
    ...defaultTransform(),
    domain: 'frequency',
    startTime: 0,
    endTime: null,
    hidden: false,
  }
}