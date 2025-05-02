import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const FlowingLines = withReact(
  createVisualizerObject()
    .defaults(() => ({
      color: '#122F21',
      speed: 0.001,
      intensity: 0.001,
      glow: 1.0,
      lineCount: 20,
      lineWidth: 0.01,
      zoom: 0.5, // New zoom prop
      scaleX: 2,
      scaleY: 2,
      rotationX: 1,
    }))
    .geometry(() => {
      return new THREE.PlaneGeometry(20, 20);
    })
    .material(({ props }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_color: { value: new THREE.Color(props.color) },
        u_speed: { value: props.speed },
        u_intensity: { value: props.intensity },
        u_glow: { value: props.glow },
        u_lineCount: { value: props.lineCount },
        u_lineWidth: { value: props.lineWidth },
        u_zoom: { value: props.zoom }, // New uniform
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_treble: { value: 0 },
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float u_time;
          uniform vec3 u_color;
          uniform float u_speed;
          uniform float u_intensity;
          uniform float u_glow;
          uniform float u_lineCount;
          uniform float u_lineWidth;
          uniform float u_zoom;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          
          varying vec2 vUv;
          
          // Complex noise function
          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
          }
          
          float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }
          
          void main() {
            // Apply zoom
            vec2 uv = (vUv * 2.0 - 1.0) / u_zoom;
            
            // Create flowing lines
            float lines = 0.0;
            float lineSpacing = 2.0 / u_lineCount;
            
            for (float i = 0.0; i < u_lineCount; i++) {
              float linePos = -1.0 + i * lineSpacing;
              
              // Create flowing wave motion
              float wave1 = sin(uv.y * 5.0 + u_time * u_speed * 2.0 + i * 0.2) * 0.2;
              float wave2 = cos(uv.y * 3.0 + u_time * u_speed * 1.5 + i * 0.3) * 0.15;
              float wave3 = sin(uv.y * 7.0 + u_time * u_speed * 0.8 + i * 0.4) * 0.1;
              
              // Combine waves
              float combinedWave = (wave1 + wave2 + wave3) * (1.0 + u_bass * 2.0);
              
              // Add noise-based distortion
              float noiseDistortion = noise(vec2(uv.y * 3.0 + u_time * 0.1, i)) * 0.1;
              
              // Apply wave motion to line position
              linePos += combinedWave + noiseDistortion * u_intensity;
              
              // Create line with smooth edges
              float line = smoothstep(u_lineWidth, 0.0, abs(uv.x - linePos));
              
              // Combine lines
              lines += line;
            }
            
            // Add color variations
            vec3 color = u_color;
            color += vec3(
              sin(u_time * 0.2 + uv.y * 2.0) * 0.2,
              sin(u_time * 0.7 + uv.y * 3.0) * 0.02,
              sin(u_time * 0.1 + uv.y * 2.0) * 0.2
            );
            
            // Add audio-reactive color shifts
            color *= 9.0 + vec3(u_bass, u_mid, u_treble) * 0.1;
            
            // Add glow
            float glow = u_glow * (1.0 + u_bass * 2.0);
            color *= 2.0 + lines * glow;
            
            // Add pulsing effect
            float pulse = sin(u_time * 2.0) * 0.5 + 0.5;
            color *= 1.0 + pulse * u_bass;
            
            gl_FragColor = vec4(color * lines, 1.0);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
    })
    .render(({ mesh, audioData, props, delta }) => {
      if (!(mesh.material instanceof THREE.ShaderMaterial)) return;
      const shader = mesh.material as THREE.ShaderMaterial;

      // Update time uniform
      shader.uniforms.u_time.value += delta;

      // Update audio uniforms
      shader.uniforms.u_bass.value = AudioUtils.getBassEnergy(audioData);
      shader.uniforms.u_mid.value = AudioUtils.getMidEnergy(audioData);
      shader.uniforms.u_treble.value = AudioUtils.getTrebleEnergy(audioData);

      // Update other props
      shader.uniforms.u_color.value.set(props.color);
      shader.uniforms.u_speed.value = props.speed;
      shader.uniforms.u_intensity.value = props.intensity;
      shader.uniforms.u_glow.value = props.glow;
      shader.uniforms.u_lineCount.value = props.lineCount;
      shader.uniforms.u_lineWidth.value = props.lineWidth;
      shader.uniforms.u_zoom.value = props.zoom;
    })
);
