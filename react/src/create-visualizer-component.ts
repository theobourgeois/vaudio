import { useEffect, useRef, useMemo } from 'react';
import { useDeepCompareEffect } from 'use-deep-compare';
import { ObjectId, RenderFn, VisualizerObject } from '@vaudio/core';
import { useVisualizer } from './visualizer-context';
import { applyDefaults } from './apply-defaults';
import * as THREE from 'three';

/**
 * Props accepted by the component created by createVisualizerComponent.
 * Includes an optional `id` and all properties from the default configuration.
 */
type VisualizerComponentProps<T> = {
  /** Optional unique identifier for the object. If not provided, a UUID is generated. */
  id?: ObjectId;
  /** Partial properties of the visualizer object, merged with defaults. */
} & Partial<T>;

/**
 * Creates a React component that represents a Three.js object within the Visualizer.
 * This component handles registering the object with the Visualizer context,
 * applying defaults, and managing its lifecycle.
 *
 * @template T - The specific type of the VisualizerObject, extending the base VisualizerObject.
 * @param defaults - The default properties for this visualizer object type.
 * @param renderFn - The function that defines the per-frame rendering logic for the object.
 * @param cleanupFn - Optional cleanup function to run before removing the object.
 * @returns A React functional component that manages the visualizer object.
 */
export function createVisualizerComponent<T extends VisualizerObject>(
  defaults: T,
  renderFn: RenderFn<T>,
  cleanupFn?: () => void
) {
  return function Component(userProps: VisualizerComponentProps<T>) {
    const { triggerRender, removeObject } = useVisualizer();

    const instanceIdRef = useRef<string | null>(null);

    if (instanceIdRef.current === null) {
      instanceIdRef.current = THREE.MathUtils.generateUUID();
    }

    const instanceId = userProps.id !== undefined ? userProps.id : instanceIdRef.current;

    const combinedProps: T = useMemo(
      () => {
        return applyDefaults(defaults, userProps as unknown as T);
      },
      [userProps]
    );

    /**
     * Effect to register the render function and properties with the Visualizer context.
     * Uses useDeepCompareEffect to re-run only when the content of combinedProps changes.
     */
    useDeepCompareEffect(() => {
      if (!triggerRender || !removeObject) {
        console.error(`Visualizer component "${instanceId || 'Unnamed'}" must be rendered inside a Visualizer component.`);
        return;
      }
      triggerRender(instanceId!, renderFn, combinedProps as VisualizerObject as T);
    }, [instanceId, combinedProps, triggerRender, renderFn]); // Deep comparison on combinedProps

    /**
     * Effect for cleanup when the component unmounts.
     * Removes the object from the Visualizer context and scene.
     */
    useEffect(() => {
      return () => {
        if (cleanupFn) {
          // Execute custom cleanup if provided.
          cleanupFn();
        }
        // Remove the object using its stable instance ID.
        removeObject(instanceId!);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceId]);

    return null;
  };
}
