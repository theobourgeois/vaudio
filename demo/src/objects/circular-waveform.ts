import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const CircularWaveform = withReact(
  createVisualizerObject()
    .defaults(() => ({
      segments: 500,
      radius: 9.0,
      color1: '#ff00ff',
      color2: '#00ffff',
      gradientSpeed: 0.05,
      pulseIntensity: 1.3,
      glowIntensity: 0.5,
      heightScale: 4.0,
      smoothFactor: 9,
      rotationSpeed: 0.1,
      lineWidth: 0.1,
    }))
    .geometry(({ props }) => {
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];
      const indices = [];

      const angleStep = (Math.PI * 2) / props.segments;
      const totalVertices = props.segments + 1;

      // Pre-allocate arrays
      positions.length = totalVertices * 3;
      colors.length = totalVertices * 3;
      indices.length = totalVertices;

      for (let i = 0; i <= props.segments; i++) {
        const angle = i * angleStep;
        const x = Math.cos(angle) * props.radius;
        const z = Math.sin(angle) * props.radius;

        // Position
        positions[i * 3] = x;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = z;

        // Color gradient
        const colorProgress = i / props.segments;
        const color = new THREE.Color(props.color1).lerp(
          new THREE.Color(props.color2),
          colorProgress
        );
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        // Index
        indices[i] = i;
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);

      return geometry;
    })
    .material(({ props }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_treble: { value: 0 },
        u_gradientSpeed: { value: props.gradientSpeed },
        u_pulseIntensity: { value: props.pulseIntensity },
        u_glowIntensity: { value: props.glowIntensity },
        u_heightScale: { value: props.heightScale },
        u_smoothFactor: { value: props.smoothFactor },
        u_rotationSpeed: { value: props.rotationSpeed },
        u_lineWidth: { value: props.lineWidth },
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          attribute vec3 customColor;
          varying vec3 vColor;
          varying float vHeight;
          uniform float u_time;
          uniform float u_gradientSpeed;
          uniform float u_pulseIntensity;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          uniform float u_heightScale;
          uniform float u_smoothFactor;
          uniform float u_rotationSpeed;
          uniform float u_lineWidth;

          void main() {
            vColor = customColor;
            
            // Calculate audio intensity
            float audioIntensity = (u_bass * 1.5 + u_mid + u_treble * 0.5) / 3.0;
            
            // Apply exponential scaling
            float scaledHeight = pow(audioIntensity, 0.5) * u_heightScale;
            
            // Add pulsing effect
            float angle = atan(position.z, position.x);
            float pulse = sin(u_time * 2.0 + angle * 5.0) * 0.5 + 0.5;
            scaledHeight *= (1.0 + u_pulseIntensity * pulse);
            
            // Calculate new position with height
            vec3 newPosition = position;
            newPosition.y = scaledHeight;
            
            // Rotate
            float rotation = u_time * u_rotationSpeed;
            float cosRot = cos(rotation);
            float sinRot = sin(rotation);
            newPosition.x = position.x * cosRot - position.z * sinRot;
            newPosition.z = position.x * sinRot + position.z * cosRot;
            
            vHeight = scaledHeight;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          
          varying vec3 vColor;
          varying float vHeight;
          uniform float u_time;
          uniform float u_glowIntensity;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          uniform float u_lineWidth;

          void main() {
            vec3 color = vColor;
            
            // Add audio-reactive glow
            float glow = u_glowIntensity * (u_bass + u_mid * 0.5 + u_treble * 0.2);
            color += color * glow;
            
            // Add frequency-based color shifts
            color.r += u_bass * 0.2;
            color.g += u_mid * 0.2;
            color.b += u_treble * 0.2;
            
            // Add height-based alpha for smooth edges
            float alpha = smoothstep(0.0, u_lineWidth, vHeight);
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
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

      // Update other uniforms
      shader.uniforms.u_gradientSpeed.value = props.gradientSpeed;
      shader.uniforms.u_pulseIntensity.value = props.pulseIntensity;
      shader.uniforms.u_glowIntensity.value = props.glowIntensity;
      shader.uniforms.u_heightScale.value = props.heightScale;
      shader.uniforms.u_smoothFactor.value = props.smoothFactor;
      shader.uniforms.u_rotationSpeed.value = props.rotationSpeed;
      shader.uniforms.u_lineWidth.value = props.lineWidth;
    })
);