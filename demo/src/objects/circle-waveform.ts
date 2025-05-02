import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const CircleWaveform = withReact(
  createVisualizerObject()
    .defaults(() => ({
      color: '#800868',
      speed: 0.001,
      intensity: 0.05,
      glow: 0.0,
      segments: 100,
      radius: 6.0,
      distortion: 4.5,
      colorSpeed: 0.00005,
    }))
    .geometry(({ props }) => {
      return new THREE.SphereGeometry(props.radius, props.segments);
    })
    .material(({ props }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_color: { value: new THREE.Color(props.color) },
        u_speed: { value: props.speed },
        u_intensity: { value: props.intensity },
        u_glow: { value: props.glow },
        u_radius: { value: props.radius },
        u_distortion: { value: props.distortion },
        u_colorSpeed: { value: props.colorSpeed },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_treble: { value: 0 },
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          uniform float u_time;
          uniform float u_speed;
          uniform float u_intensity;
          uniform float u_distortion;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
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
            vUv = uv;
            vNormal = normal;
            vPosition = position;
            
            // Create radial distortion
            float angle = atan(position.y, position.x);
            float radius = length(position.xy);
            
            // Add multiple layers of distortion
            float distortion1 = sin(angle * 5.0 + u_time * u_speed) * 0.2;
            float distortion2 = cos(angle * 3.0 + u_time * u_speed * 1.5) * 0.15;
            float distortion3 = sin(angle * 7.0 + u_time * u_speed * 0.8) * 0.1;
            
            // Combine distortions with audio
            float combinedDistortion = (distortion1 + distortion2 + distortion3) * 
              (1.0 + u_bass * 3.0) * u_distortion;
            
            // Add noise-based distortion
            float noiseDistortion = noise(vec2(angle * 2.0 + u_time * 0.1, radius)) * 0.2;
            
            // Apply distortion to radius
            float newRadius = radius * (1.0 + combinedDistortion + noiseDistortion * u_intensity);
            
            // Create new position
            vec3 newPosition = position;
            newPosition.x = cos(angle) * newRadius;
            newPosition.y = sin(angle) * newRadius;
            
            // Add pulsing effect
            newPosition *= 1.0 + u_bass * 0.5;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `,
        fragmentShader: `
          uniform float u_time;
          uniform vec3 u_color;
          uniform float u_speed;
          uniform float u_intensity;
          uniform float u_glow;
          uniform float u_radius;
          uniform float u_colorSpeed;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
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
            // Calculate radial position
            float angle = atan(vPosition.y, vPosition.x);
            float radius = length(vPosition.xy);
            
            // Create color variations
            vec3 color = u_color;
            
            // Add multiple layers of color shifts
            color += vec3(
              sin(angle * 5.0 + u_time * u_colorSpeed) * 0.2,
              sin(angle * 3.0 + u_time * u_colorSpeed * 1.5) * 0.2,
              sin(angle * 7.0 + u_time * u_colorSpeed * 0.8) * 0.2
            );
            
            // Add audio-reactive color shifts
            color *= 1.0 + vec3(u_bass, u_mid, u_treble) * 0.5;
            
            // Add radial glow
            float glow = u_glow * (1.0 + u_bass * 2.0);
            float radialGlow = smoothstep(0.0, 1.0, 1.0 - radius / u_radius);
            color *= 1.0 + radialGlow * glow;
            
            // Add pulsing effect
            float pulse = sin(u_time * 2.0) * 0.5 + 0.5;
            color *= 1.0 + pulse * u_bass;
            
            // Add noise-based detail
            float noiseDetail = noise(vec2(angle * 10.0 + u_time * 0.2, radius * 5.0)) * 0.2;
            color *= 1.0 + noiseDetail;
            
            // Add edge glow
            float edgeGlow = smoothstep(0.95, 1.0, radius / u_radius);
            color += color * edgeGlow * 2.0;
            
            gl_FragColor = vec4(color, 1.0);
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
      shader.uniforms.u_radius.value = props.radius;
      shader.uniforms.u_distortion.value = props.distortion;
      shader.uniforms.u_colorSpeed.value = props.colorSpeed;
    })
);