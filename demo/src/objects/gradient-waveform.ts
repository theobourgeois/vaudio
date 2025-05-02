import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const GradientWaveform = withReact(
  createVisualizerObject()
    .defaults(() => ({
      barCount: 88,
      barWidth: 0.3,
      barSpacing: 0.05,
      heightScale: 0.08, // Increased from 5.0 to 15.0
      scaleY: 20,
      color1: '#0000ff',
      color2: '#ff0000',
      gradientSpeed: 0.05,
      pulseIntensity: 0.4,
      glowIntensity: 0.5,
      maxHeight: 2.0, // Maximum height multiplier
      smoothFactor: 5, // Smoothing factor for height changes
    }))
    .geometry(({ props }) => {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      const indices = [];

      const totalWidth = props.barCount * (props.barWidth + props.barSpacing);
      const startX = -totalWidth / 2;

      for (let i = 0; i < props.barCount; i++) {
        const x = startX + i * (props.barWidth + props.barSpacing);

        // Create vertices for a bar
        const vertices = [
          // Bottom left
          x, -0.5, 0,
          // Bottom right
          x + props.barWidth, -0.5, 0,
          // Top right
          x + props.barWidth, 0.5, 0,
          // Top left
          x, 0.5, 0,
        ];

        positions.push(...vertices);
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

        const baseIndex = i * 4;
        indices.push(
          baseIndex, baseIndex + 1, baseIndex + 2,
          baseIndex, baseIndex + 2, baseIndex + 3
        );
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);

      return geometry;
    })
    .material(({ props }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_color1: { value: new THREE.Color(props.color1) },
        u_color2: { value: new THREE.Color(props.color2) },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_treble: { value: 0 },
        u_gradientSpeed: { value: props.gradientSpeed },
        u_pulseIntensity: { value: props.pulseIntensity },
        u_glowIntensity: { value: props.glowIntensity },
        u_heightScale: { value: props.heightScale },
        u_maxHeight: { value: props.maxHeight },
        u_smoothFactor: { value: props.smoothFactor },
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          varying float vHeight;
          uniform float u_time;
          uniform float u_gradientSpeed;
          uniform float u_pulseIntensity;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          uniform float u_heightScale;
          uniform float u_maxHeight;
          uniform float u_smoothFactor;

          void main() {
            vUv = uv;
            
            // Calculate height with more dynamic range
            float height = position.y;
            
            // Combine all frequency bands for more dramatic effect
            float audioIntensity = (u_bass * 1.5 + u_mid + u_treble * 0.5) / 3.0;
            
            // Apply exponential scaling for more dramatic height changes
            float scaledHeight = pow(audioIntensity, 0.5) * u_heightScale;
            
            // Add pulsing effect
            float pulse = sin(u_time * 2.0 + position.x * 5.0) * 0.5 + 0.5;
            scaledHeight *= (1.0 + u_pulseIntensity * pulse);
            
            // Cap the maximum height
            scaledHeight = min(scaledHeight, u_maxHeight);
            
            // Apply smooth height transition
            height *= scaledHeight;
            vHeight = height;
            
            vec3 newPosition = vec3(position.x, height, position.z);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          
          varying vec2 vUv;
          varying float vHeight;
          uniform vec3 u_color1;
          uniform vec3 u_color2;
          uniform float u_time;
          uniform float u_gradientSpeed;
          uniform float u_glowIntensity;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;

          void main() {
            // Create gradient based on height and time
            float gradient = vUv.y + sin(u_time * u_gradientSpeed) * 0.1;
            gradient = smoothstep(0.0, 1.0, gradient);
            
            // Mix colors based on gradient
            vec3 color = mix(u_color1, u_color2, gradient);
            
            // Add audio-reactive glow
            float glow = u_glowIntensity * (u_bass + u_mid * 0.5 + u_treble * 0.2);
            color += color * glow;
            
            // Add subtle color shift based on frequency bands
            color.r += u_bass * 0.2;
            color.g += u_mid * 0.2;
            color.b += u_treble * 0.2;
            
            // Add height-based alpha for smooth edges
            float alpha = smoothstep(0.0, 0.1, vHeight) * smoothstep(1.0, 0.9, vHeight);
            
            gl_FragColor = vec4(color, alpha);
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

      // Update audio uniforms with more dynamic range
      shader.uniforms.u_bass.value = AudioUtils.getBassEnergy(audioData);
      shader.uniforms.u_mid.value = AudioUtils.getMidEnergy(audioData);
      shader.uniforms.u_treble.value = AudioUtils.getTrebleEnergy(audioData);

      // Update other uniforms
      shader.uniforms.u_color1.value.set(props.color1);
      shader.uniforms.u_color2.value.set(props.color2);
      shader.uniforms.u_gradientSpeed.value = props.gradientSpeed;
      shader.uniforms.u_pulseIntensity.value = props.pulseIntensity;
      shader.uniforms.u_glowIntensity.value = props.glowIntensity;
      shader.uniforms.u_heightScale.value = props.heightScale;
      shader.uniforms.u_maxHeight.value = props.maxHeight;
      shader.uniforms.u_smoothFactor.value = props.smoothFactor;
    })
);