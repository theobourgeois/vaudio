// @vaudio/react/create-react-component.ts
import { createVisualizerComponent } from './create-visualizer-component';
import { VisualizerObject, WithPlugin } from '@vaudio/core';
import * as THREE from 'three';
/**
 * A higher-order function that converts a VisualizerObjectBuilder's render output into a React component.
 * This function is used to bridge the gap between the core visualization system and React components.
 * 
 * @template TDefaults - The type of default properties for the visualizer object, must be a record of string keys to unknown values
 * @template TFullConfig - The complete configuration type that extends VisualizerObject, including both defaults and required properties
 * @template TGeom - The type of THREE.js geometry used by the visualizer, or undefined if not specified
 * @template TMat - The type of THREE.js material used by the visualizer, or undefined if not specified
 * @template TObj - The type of THREE.js object used by the visualizer, must extend THREE.Object3D
 * 
 * @param builderOutput - The output from a VisualizerObjectBuilder's render method, containing the defaults and render function
 * @returns An object containing the original builder output plus an asVisualizerComponent method that creates a React component
 * 
 * @example
 * ```tsx
 * const MyVisualizer = withReact(
 *   renderObject()
 *     .defaults(() => ({ size: 1 }))
 *     .geometry(({ layer }) => new THREE.BoxGeometry(layer.size))
 *     .material(({ layer }) => new THREE.MeshStandardMaterial({ color: layer.color }))
 *     .render()
 * );
 * 
 * // Use the component
 * <MyVisualizer.asVisualizerComponent() size={2} color="red" />
 * ```
 */
// create a type for this function

export function withReact<
  TDefaults extends Record<string, unknown>,
  TFullConfig extends VisualizerObject,
  TGeom extends THREE.BufferGeometry | undefined,
  TMat extends THREE.Material | undefined,
  TObj extends THREE.Object3D
>(builderOutput: WithPlugin<TDefaults, TFullConfig, TGeom, TMat, TObj>) {
  return {
    ...builderOutput,
    asVisualizerComponent: () =>
      createVisualizerComponent(
        builderOutput.getDefaults(),
        builderOutput.getRenderFn()
      ),
  };
}
