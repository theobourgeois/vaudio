import { createVisualizerComponent } from './create-visualizer-component';
import { VisualizerObject, RenderFn } from '@vaudio/core';

/**
 * A higher-order function that converts a VisualizerObjectBuilder's render output into a React component.
 * This function is used to bridge the gap between the core visualization system and React components.
 *
 * @template T - The type of the VisualizerObject configuration
 * @param builderOutput - The output from a VisualizerObjectBuilder's render method
 * @returns A React component that can be used to render the visualizer
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
 * <MyVisualizer size={2} color="red" />
 * ```
 */
export function withReact<T extends VisualizerObject>(builderOutput: {
  getDefaults: () => T;
  getRenderFn: () => RenderFn<T>;
  getCleanupFn: () => void;
}) {
  return createVisualizerComponent(
    builderOutput.getDefaults(),
    builderOutput.getRenderFn(),
    builderOutput.getCleanupFn
  );
}
