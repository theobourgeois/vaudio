import { AudioUtils, SmoothedValue } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const Topography = withReact(
  createVisualizerObject()
    .defaults(() => ({
      size: 50,
      segments: 100,
      baseColor: '#ffffff',
      waveDefinition: 1.5,
      waveAmplitude: 1.3, // Reduced from 0.7
      topoDefinition: 10,
      bassSensitivity: 1, // Reduced from 0.01
      midSensitivity: 0.0001, // Reduced from 0.001
      trebleSensitivity: 1, // Reduced from 0.03
      smoothingFactor: 0.5, // Reduced from 0.1 for smoother transitions
      height: 2.0,
      timeScale: 1 // Added to control overall animation speed
    }))
    .geometry(({ props }) => {
      const geometry = new THREE.PlaneGeometry(props.size, props.size, props.segments, props.segments);
      // Add some initial height variation
      const positions = geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] = Math.sin(positions[i] * 0.1) * Math.cos(positions[i + 1] * 0.1) * props.height;
      }
      geometry.computeVertexNormals();
      return geometry;
    })
    .material(({ props }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_treble: { value: 0 },
        u_waveDefinition: { value: props.waveDefinition },
        u_waveAmplitude: { value: props.waveAmplitude },
        u_topoDefinition: { value: props.topoDefinition },
        u_color: { value: new THREE.Color(props.baseColor) },
        u_bassSensitivity: { value: props.bassSensitivity },
        u_midSensitivity: { value: props.midSensitivity },
        u_trebleSensitivity: { value: props.trebleSensitivity },
        u_height: { value: props.height },
        u_timeScale: { value: props.timeScale }
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          uniform float u_time;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          uniform float u_waveDefinition;
          uniform float u_waveAmplitude;
          uniform float u_bassSensitivity;
          uniform float u_midSensitivity;
          uniform float u_trebleSensitivity;
          uniform float u_height;
          uniform float u_timeScale;

          varying vec3 vPosition;

          // Simplex noise implementation
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

          float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m;
            m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          void main() {
            // Base noise for terrain with initial height
            float baseNoise = snoise(uv) * u_height;
            
            // Wave pattern influenced by mid frequencies
            float waveNoise = snoise(uv * u_waveDefinition + u_time * u_timeScale);
            waveNoise *= u_mid * u_midSensitivity;
            
            // Combine noise with audio reactivity
            float newZ = baseNoise + waveNoise;
            newZ *= u_waveAmplitude * (1.0 + u_bass * u_bassSensitivity);
            
            vec3 newPosition = vec3(position.xy, position.z + newZ);
            vPosition = newPosition;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `,
        fragmentShader: `
          uniform float u_topoDefinition;
          uniform vec3 u_color;
          uniform float u_treble;
          uniform float u_trebleSensitivity;

          varying vec3 vPosition;

          void main() {
            // Create contour lines
            float coord = vPosition.z * u_topoDefinition;
            float line = abs(fract(coord - 0.1) - 0.5) / fwidth(coord);
            line /= 1.1;
            
            // Make lines more visible with treble frequencies
            float lineIntensity = 1.0 - line * (1.0 - u_treble * u_trebleSensitivity);
            
            gl_FragColor = vec4(u_color, lineIntensity);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });
    })
    .render(({ mesh, audioData, props, delta }) => {
      if (!(mesh.material instanceof THREE.ShaderMaterial)) return;
      const shader = mesh.material as THREE.ShaderMaterial;

      // Create smoothed values for audio data
      const smoothedBass = new SmoothedValue(props.smoothingFactor);
      const smoothedMid = new SmoothedValue(props.smoothingFactor);
      const smoothedTreble = new SmoothedValue(props.smoothingFactor);

      // Update smoothed values
      smoothedBass.update(AudioUtils.getBassEnergy(audioData));
      smoothedMid.update(AudioUtils.getMidEnergy(audioData));
      smoothedTreble.update(AudioUtils.getTrebleEnergy(audioData));

      // Update time and audio uniforms with smoothed values
      shader.uniforms.u_time.value += delta * props.timeScale; // Slowed down time increment
      shader.uniforms.u_bass.value = smoothedBass.get();
      shader.uniforms.u_mid.value = smoothedMid.get();
      shader.uniforms.u_treble.value = smoothedTreble.get();

      // Update other props
      shader.uniforms.u_waveDefinition.value = props.waveDefinition;
      shader.uniforms.u_waveAmplitude.value = props.waveAmplitude;
      shader.uniforms.u_topoDefinition.value = props.topoDefinition;
      shader.uniforms.u_color.value.set(props.baseColor);
      shader.uniforms.u_bassSensitivity.value = props.bassSensitivity;
      shader.uniforms.u_midSensitivity.value = props.midSensitivity;
      shader.uniforms.u_trebleSensitivity.value = props.trebleSensitivity;
      shader.uniforms.u_height.value = props.height;
      shader.uniforms.u_timeScale.value = props.timeScale;
    })
);