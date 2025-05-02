import * as THREE from 'three';
import { createVisualizerObject } from '@vaudio/core';
import { withReact } from '@vaudio/react';

export const Cylinder = withReact(
  createVisualizerObject()
    .defaults(() => ({
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      color: '#ffffff',
      opacity: 1,
    }))
    .geometry(
      ({ props: layer }) =>
        new THREE.CylinderGeometry(
          layer.radiusTop,
          layer.radiusBottom,
          layer.height,
          32
        )
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
