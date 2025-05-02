import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const PsychedelicTunnel = withReact(
  createVisualizerObject()
    .defaults(() => ({
      color: '#00ff00',
      intensity: 1.0,
      speed: 0.05, // Reduced default speed
      distortion: 5.0,
      glow: 1.0,
      patternScale: 1.0,
      tunnelDepth: 10.0, // Reduced depth for better perspective
      size: 10,
      segments: 10,
    }))
    .geometry(({ props }) => {
      return new THREE.TorusKnotGeometry(props.size, props.size, props.segments, props.segments);
    })
    .material(({ props }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_color: { value: new THREE.Color(props.color) },
        u_intensity: { value: props.intensity },
        u_speed: { value: props.speed },
        u_distortion: { value: props.distortion },
        u_glow: { value: props.glow },
        u_patternScale: { value: props.patternScale },
        u_tunnelDepth: { value: props.tunnelDepth },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_treble: { value: 0 },
        u_smoothBass: { value: 0 },
        u_smoothMid: { value: 0 },
        u_smoothTreble: { value: 0 },
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          uniform float u_time;
          uniform float u_speed;
          uniform float u_distortion;
          uniform float u_intensity;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          uniform float u_tunnelDepth;
          uniform float u_smoothBass;
          uniform float u_smoothMid;
          uniform float u_smoothTreble;
          
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying float vDepth;
          
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
            
            // Calculate depth for tunnel effect
            vDepth = length(position) / u_tunnelDepth;
            
            // Create tunnel perspective with slower movement
            vec3 newPosition = position;
            newPosition.z -= u_tunnelDepth * vDepth;
            
            // Add distortion based on audio and intensity
            float distortion = u_distortion * (1.0 + u_smoothBass * 2.0) * u_intensity;
            float noise1 = noise(position.xy * 2.0 + u_time * u_speed * 0.1);
            float noise2 = noise(position.yz * 3.0 + u_time * u_speed * 0.15);
            
            // Apply distortion with intensity control
            newPosition.xy += normal.xy * distortion * (noise1 + noise2) * 0.3;
            
            // Add pulsing effect based on bass with intensity control
            newPosition *= 1.0 + u_smoothBass * 0.5 * u_intensity;
            
            // Add twisting effect based on mid frequencies with speed control
            float twist = u_smoothMid * 2.0 * u_intensity;
            float angle = length(position.xy) * twist * u_speed;
            float c = cos(angle);
            float s = sin(angle);
            newPosition.xy = vec2(
              c * newPosition.x - s * newPosition.y,
              s * newPosition.x + c * newPosition.y
            );
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `,
        fragmentShader: `
          uniform float u_time;
          uniform vec3 u_color;
          uniform float u_intensity;
          uniform float u_glow;
          uniform float u_patternScale;
          uniform float u_speed;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          uniform float u_smoothBass;
          uniform float u_smoothMid;
          uniform float u_smoothTreble;
          
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying float vDepth;
          
          // Complex pattern generation with speed control
          float pattern(vec2 p, float scale) {
            vec2 q = p * scale;
            float f = 0.0;
            f += sin(q.x * 10.0 + u_time * u_speed * 0.1) * 0.5 + 0.5;
            f += sin(q.y * 8.0 + u_time * u_speed * 0.12) * 0.5 + 0.5;
            f += sin(q.x * q.y * 0.1 + u_time * u_speed * 0.15) * 0.5 + 0.5;
            return f;
          }
          
          void main() {
            // Generate tunnel patterns with intensity control
            float p1 = pattern(vUv, u_patternScale * u_intensity);
            float p2 = pattern(vUv * 2.0, u_patternScale * 2.0 * u_intensity);
            float p3 = pattern(vUv * 4.0, u_patternScale * 4.0 * u_intensity);
            
            // Combine patterns with depth effect
            float combinedPattern = (p1 + p2 + p3) * 0.33;
            combinedPattern *= 1.0 - vDepth;
            
            // Create color variations
            vec3 color1 = u_color;
            vec3 color2 = vec3(u_color.g, u_color.b, u_color.r);
            vec3 color3 = vec3(u_color.b, u_color.r, u_color.g);
            
            // Mix colors based on patterns and audio with intensity control
            vec3 finalColor = mix(color1, color2, p1 * u_intensity);
            finalColor = mix(finalColor, color3, p2 * u_intensity);
            
            // Add glow effect with intensity control
            float glow = u_glow * (1.0 + u_smoothTreble * 2.0) * u_intensity;
            finalColor += finalColor * glow * combinedPattern;
            
            // Add psychedelic color shifts with speed control
            finalColor += vec3(
              sin(u_time * u_speed * 0.05 + vUv.x * 10.0) * 0.2,
              sin(u_time * u_speed * 0.07 + vUv.y * 8.0) * 0.2,
              sin(u_time * u_speed * 0.03 + vUv.x * vUv.y * 5.0) * 0.2
            );
            
            // Add depth-based color shift
            finalColor *= 1.0 - vDepth * 0.5;
            
            // Add audio-reactive brightness with intensity control
            finalColor *= 1.0 + u_smoothMid * 0.5 * u_intensity;
            
            // Add tunnel perspective effect
            float tunnelEffect = 1.0 - smoothstep(0.0, 1.0, vDepth);
            finalColor *= tunnelEffect;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    })
    .render(({ mesh, audioData, props, delta }) => {
      if (!(mesh.material instanceof THREE.ShaderMaterial)) return;
      const shader = mesh.material as THREE.ShaderMaterial;

      // Update time uniform with speed control
      shader.uniforms.u_time.value += delta * props.speed;

      // Get audio values
      const bass = AudioUtils.getBassEnergy(audioData);
      const mid = AudioUtils.getMidEnergy(audioData);
      const treble = AudioUtils.getTrebleEnergy(audioData);

      // Smooth audio values
      shader.uniforms.u_smoothBass.value += (bass - shader.uniforms.u_smoothBass.value) * 0.1;
      shader.uniforms.u_smoothMid.value += (mid - shader.uniforms.u_smoothMid.value) * 0.1;
      shader.uniforms.u_smoothTreble.value += (treble - shader.uniforms.u_smoothTreble.value) * 0.1;

      // Update other props
      shader.uniforms.u_color.value.set(props.color);
      shader.uniforms.u_intensity.value = props.intensity;
      shader.uniforms.u_distortion.value = props.distortion;
      shader.uniforms.u_glow.value = props.glow;
      shader.uniforms.u_patternScale.value = props.patternScale;
      shader.uniforms.u_tunnelDepth.value = props.tunnelDepth;
    })
);