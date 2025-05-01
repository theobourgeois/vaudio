import * as THREE from 'three';

export type ObjectId = number | string;

export type Transform = {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
};

export type VisualizerObject = {
  domain: 'frequency' | 'time';
} & Transform;

export type IdToMesh = Map<ObjectId, THREE.Object3D>;

export type RenderArgs<T> = {
  id: ObjectId;
  props: T;
  idToMesh: IdToMesh;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  audioData: Uint8Array;
  delta: number;
};

export type RenderFn<T extends VisualizerObject> = (args: RenderArgs<T>) => Promise<void> | void;

export type TriggerRenderFn = <T extends VisualizerObject>(
  id: ObjectId,
  renderFn: RenderFn<T>,
  props: T
) => void;
