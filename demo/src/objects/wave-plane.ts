import * as THREE from 'three';
import { createVisualizerObject } from '@vaudio/core';
import { AudioUtils, SmoothedValue } from '@vaudio/utils';
import { withReact } from '@vaudio/react';

const smoothedAudio = new SmoothedValue(0.6);

export const WavePlane = withReact(
  createVisualizerObject()
    .geometry(() => new THREE.PlaneGeometry(5, 5, 5, 5))
    .shader(
      ({ audioData }) =>
        new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uAudio: { value: AudioUtils.getAverage(audioData) },
          },
          vertexShader: `
      uniform float uTime;
      uniform float uAudio;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;
        float wave = sin((pos.x + uTime * 2.0) * 10.0) * 0.2 * uAudio;
        pos.z += wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
          fragmentShader: `
      uniform float uTime;
      uniform float uAudio;
      varying vec2 vUv;

      void main() {
        float pulse = sin(uTime * 2.0) * 0.5 + 0.5;
        vec3 color = vec3(vUv.x + uAudio, vUv.y * pulse, 1.0 - uAudio);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
          wireframe: false,
          transparent: true,
        })
    )
    .render(({ mesh, audioData }) => {
      const smoothVal = smoothedAudio.update(AudioUtils.getAverage(audioData));
      mesh.material.uniforms.uAudio.value = smoothVal;
      mesh.material.uniforms.uTime.value += 0.01;
    })
);
