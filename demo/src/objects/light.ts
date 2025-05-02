// Light.ts
import * as THREE from 'three';
import { createVisualizerObject } from '@vaudio/core';
import { withReact } from '@vaudio/react';

export type Light = {
  intensity: number;
  type:
  | 'PointLight'
  | 'DirectionalLight'
  | 'AmbientLight'
  | 'SpotLight'
  | 'HemisphereLight';
  color: string;
};

export const Light = withReact(
  createVisualizerObject()
    .defaults<Light>(() => ({
      intensity: 1,
      type: 'PointLight',
      color: '#ffffff',
      z: 5,
    }))
    .createObject(({ props: layer }) => {
      const LightConstructor = THREE[layer.type || 'PointLight'];
      const light = new LightConstructor(layer.color, layer.intensity);
      return light;
    })
    .render(({ id, mesh: light, props: layer, scene, idToMesh }) => {
      if (light.type !== layer.type) {
        if (light) scene.remove(light);
        const LightConstructor = THREE[layer.type];
        if (!LightConstructor) return;
        const newLight = new LightConstructor(layer.color, layer.intensity);
        scene.add(newLight);
        idToMesh.set(id, newLight);
      }

      light.color.set(layer.color);
      light.intensity = layer.intensity;
    })
);
