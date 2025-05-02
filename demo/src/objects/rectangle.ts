import * as THREE from 'three';
import { createVisualizerObject } from '@vaudio/core';
import { withReact } from '@vaudio/react';

export type Rectangle = {
  width: number;
  height: number;
  depth: number;
  color: string;
  opacity: number;
};

export const Rectangle = withReact(
  createVisualizerObject()
    .defaults(() => ({
      width: 1,
      height: 1,
      depth: 1,
      color: '#ffffff',
      opacity: 1,
    }))
    .geometry(
      ({ props: layer }) =>
        new THREE.BoxGeometry(layer.width, layer.height, layer.depth)
    )
    .material(
      ({ props: layer }) =>
        new THREE.MeshStandardMaterial({
          color: layer.color,
          opacity: layer.opacity,
          transparent: layer.opacity < 1,
        })
    )
    .render()
);
