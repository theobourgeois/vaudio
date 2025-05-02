import * as THREE from 'three';
import { createVisualizerObject } from '@vaudio/core';
import { withReact } from '@vaudio/react';

export type Sphere = {
  radius: number;
  radiusAmplitude: number;
};

export const Sphere = withReact(
  createVisualizerObject()
    .defaults(() => ({
      radius: 1,
      radiusAmplitude: 0,
      color: '#ffffff',
      opacity: 1,
    }))
    .geometry(
      ({ props: layer }) => new THREE.SphereGeometry(layer.radius, 32, 32)
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
