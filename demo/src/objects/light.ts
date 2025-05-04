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
    .object(({ props: layer }) => {
      const LightConstructor = THREE[layer.type || 'PointLight'];
      const light = new LightConstructor(layer.color, layer.intensity);
      return light;
    })
    .render(({ id, object: light, props, scene, idToObjectMap }) => {
      if (light.type !== props.type) {
        if (light) scene.remove(light);
        const LightConstructor = THREE[props.type];
        if (!LightConstructor) return;
        const newLight = new LightConstructor(props.color, props.intensity);
        scene.add(newLight);
        idToObjectMap.set(id, newLight);
      }

      light.color.set(props.color);
      light.intensity = props.intensity;
    })
);
