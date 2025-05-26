import * as THREE from 'three';
import { VisualizerObjectBuilder } from './create-visualizer-object';

/**
 * Represents a unique identifier for a visualizer object.
 * Can be either a number or a string.
 */
export type ObjectId = number | string;

/**
 * Represents the 3D transformation properties of an object.
 * Includes position, rotation, and scale in all three dimensions.
 */
export type Transform = {
  /** Position along the X-axis */
  x: number;
  /** Position along the Y-axis */
  y: number;
  /** Position along the Z-axis */
  z: number;
  /** Rotation around the X-axis in radians */
  rotationX: number;
  /** Rotation around the Y-axis in radians */
  rotationY: number;
  /** Rotation around the Z-axis in radians */
  rotationZ: number;
  /** Scale factor along the X-axis */
  scaleX: number;
  /** Scale factor along the Y-axis */
  scaleY: number;
  /** Scale factor along the Z-axis */
  scaleZ: number;
};

/**
 * Represents a visualizer object with domain-specific properties and 3D transformations.
 * The domain determines whether the object responds to frequency or time-based audio data.
 */
export type VisualizerObject = {
  /** Specifies whether the object responds to frequency or time domain audio data */
  domain: 'frequency' | 'time';
  /** Time in seconds when the object was created */
  startTime: number;
  /** Time in seconds when the object was last updated */
  endTime: number | null;
  /** Whether the object is hidden */
  hidden: boolean;
} & Transform;

/**
 * Arguments passed to a render function for processing and updating visualizer objects.
 * @template T - The type of properties specific to the visualizer object
 */
export type RenderArgs<T> = {
  /** Unique identifier of the object being rendered */
  id: ObjectId;
  /** Properties specific to the visualizer object */
  props: T;
  /** Map of object IDs to their corresponding Three.js objects */
  idToObjectMap: Map<ObjectId, THREE.Object3D>;
  /** Three.js scene containing the visualizer objects */
  scene: THREE.Scene;
  /** Camera used for rendering the scene */
  camera: THREE.PerspectiveCamera;
  /** Renderer used for rendering the scene */
  renderer: THREE.WebGLRenderer;
  /** Current audio data as an array of unsigned 8-bit integers */
  audioData: Uint8Array;
  /** Time elapsed since the last frame in seconds */
  delta: number;
  /** Current time in seconds since the start of the visualization */
  currentTime: number;
};

/**
 * Function type for rendering a visualizer object.
 * @template T - The type of properties specific to the visualizer object
 */
export type RenderFn<T extends VisualizerObject> = (
  args: RenderArgs<T>
) => Promise<void> | void;

/**
 * Function type for triggering the rendering of a visualizer object.
 * @template T - The type of properties specific to the visualizer object
 */
export type TriggerRenderFn = <T extends VisualizerObject>(
  /** Unique identifier of the object to render */
  id: ObjectId,
  /** Function to call for rendering the object */
  renderFn: RenderFn<T>,
  /** Properties to pass to the render function */
  props: T,
  /** Optional cleanup function to call when the object is removed */
  cleanupFn?: () => void,
) => void;

/**
 * Type representing a visualizer object with plugin-specific properties and methods.
 * @template TDefaults - Default properties for the plugin
 * @template TFullConfig - Full configuration type including defaults and custom properties
 * @template TObj - The type of Three.js object used by the plugin
 */
export type WithPlugin<
  TDefaults extends Record<string, unknown>,
  TFullConfig extends VisualizerObject,
  TObj extends THREE.Object3D
> = ReturnType<
  VisualizerObjectBuilder<TDefaults, TFullConfig, TObj>['render']
>;
