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
    .object(
      ({ props }) => {
        const geometry = new THREE.CylinderGeometry(
          props.radiusTop,
          props.radiusBottom,
          props.height,
          32
        );
        const material = new THREE.MeshStandardMaterial({
          color: props.color,
          opacity: props.opacity,
          transparent: props.opacity < 1,
        });
        return new THREE.Mesh(geometry, material);
      }
    )
    .render({ object } => {
  // render logic. object should have infered type Mesh with CylinderGeometry geometry and MeshStandardMaterial material
})
);
