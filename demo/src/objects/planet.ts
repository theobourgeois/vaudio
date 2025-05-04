import { createVisualizerObject } from '@vaudio/core';
import { withReact } from '@vaudio/react';
import { AudioUtils, SmoothedValue } from '@vaudio/utils';
import * as THREE from 'three';

// Type definitions for props
type PlanetProps = {
  // Base appearance
  radius: number;
  detail: number;
  baseColor: string;
  secondaryColor: string;
  atmosphereColor: string;

  // Pattern controls
  patternScale: number;
  patternDensity: number;
  reliefStrength: number;

  // Animation
  rotationSpeed: number;
  rotationAxis: [number, number, number];

  // Audio reactivity
  bassSensitivity: number;
  midSensitivity: number;
  trebleSensitivity: number;

  // Atmosphere 
  atmosphereThickness: number;
  atmosphereGlow: number;

  // Time effect
  timeScale: number;
  zoomSpeed: number;
};

const Planet = withReact(
  createVisualizerObject()
    .defaults<PlanetProps>(() => ({
      // Base appearance
      radius: 2,
      detail: 50,
      baseColor: '#0094ff',
      secondaryColor: '#ffffff',
      atmosphereColor: '#ffffff',
      zoomSpeed: 2,

      // Pattern controls
      patternScale: 0.9,
      patternDensity: 8.0,
      reliefStrength: 0.1,

      // Animation
      rotationSpeed: 0.0006,
      rotationAxis: [0.1, 1.0, 0.1],

      // Audio reactivity
      bassSensitivity: 2.0,
      midSensitivity: 0.5,
      trebleSensitivity: 0.8,

      // Atmosphere
      atmosphereThickness: 2,
      atmosphereGlow: 0,

      // Time effect
      timeScale: 0.001,
    }))
    .object(({ props }) => {
      const geometry = new THREE.IcosahedronGeometry(props.radius, props.detail);
      // Create uniforms for the shader
      const uniforms = {
        u_time: { value: 0 },
        u_baseColor: { value: new THREE.Color(props.baseColor) },
        u_secondaryColor: { value: new THREE.Color(props.secondaryColor) },
        u_atmosphereColor: { value: new THREE.Color(props.atmosphereColor) },
        u_patternScale: { value: props.patternScale },
        u_patternDensity: { value: props.patternDensity },
        u_relief: { value: props.reliefStrength },
        u_bass: { value: 0.0 },
        u_mid: { value: 0.0 },
        u_treble: { value: 0.0 },
        u_atmosphereThickness: { value: props.atmosphereThickness },
        u_atmosphereGlow: { value: props.atmosphereGlow },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          uniform float u_time;
          uniform float u_relief;
          uniform float u_bass;
          uniform float u_patternScale;
          
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec2 vUv;
          
          // Classic Perlin 3D Noise by Stefan Gustavson
          vec4 permute(vec4 x) {
            return mod(((x*34.0)+1.0)*x, 289.0);
          }
          
          vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
          }
          
          float snoise(vec3 v) { 
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            
            // First corner
            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            
            // Other corners
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            
            vec3 x1 = x0 - i1 + 1.0 * C.xxx;
            vec3 x2 = x0 - i2 + 2.0 * C.xxx;
            vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
            
            // Permutations
            i = mod(i, 289.0); 
            vec4 p = permute(permute(permute( 
                     i.z + vec4(0.0, i1.z, i2.z, 1.0))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                   
            // Gradients
            float n_ = 1.0/7.0; // N=7
            vec3  ns = n_ * D.wyz - D.xzx;
            
            vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
            
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            
            // Normalise gradients
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            
            // Mix final noise value
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
          }
          
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            
            // Apply noise-based displacement for surface relief
            float noiseValue = snoise(position * u_patternScale + vec3(0.0, 0.0, u_time * 0.1));
            
            // Calculate displacement with audio reactivity
            float displacement = noiseValue * u_relief * (1.0 + u_bass * 0.5);
            
            // Apply displacement along normal
            vec3 newPosition = position + normal * displacement;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          
          uniform vec3 u_baseColor;
          uniform vec3 u_secondaryColor;
          uniform vec3 u_atmosphereColor;
          uniform float u_patternScale;
          uniform float u_patternDensity;
          uniform float u_time;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          uniform float u_atmosphereThickness;
          uniform float u_atmosphereGlow;
          
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec2 vUv;
          
          // Classic Perlin 3D Noise (same as vertex shader)
          vec4 permute(vec4 x) {
            return mod(((x*34.0)+1.0)*x, 289.0);
          }
          
          vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
          }
          
          float snoise(vec3 v) { 
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            
            // First corner
            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            
            // Other corners
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            
            vec3 x1 = x0 - i1 + 1.0 * C.xxx;
            vec3 x2 = x0 - i2 + 2.0 * C.xxx;
            vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
            
            // Permutations
            i = mod(i, 289.0); 
            vec4 p = permute(permute(permute( 
                     i.z + vec4(0.0, i1.z, i2.z, 1.0))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                   
            // Gradients
            float n_ = 1.0/7.0; // N=7
            vec3  ns = n_ * D.wyz - D.xzx;
            
            vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
            
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            
            // Normalise gradients
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            
            // Mix final noise value
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
          }
          
          // Fractional Brownian Motion for layered noise
          float fbm(vec3 p, int octaves) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            
            // Add multiple layers of noise with different frequencies and amplitudes
            for (int i = 0; i < 8; i++) {
              if (i >= octaves) break;
              value += amplitude * snoise(p * frequency);
              frequency *= 2.0;
              amplitude *= 0.5;
            }
            
            return value;
          }
          
          void main() {
            // Normalized view direction for edge effects
            vec3 viewDirection = normalize(cameraPosition - vPosition);
            float fresnel = 1.0 - max(0.0, dot(viewDirection, vNormal));
            
            // Base terrain patterns with layered noise
            vec3 noisePos = vPosition * u_patternScale + vec3(0.0, 0.0, u_time * 0.2);
            float noise1 = fbm(noisePos, 4);
            float noise2 = fbm(noisePos * 2.0 + vec3(100.0), 3);
            
            // Create pattern variations based on noise layers
            float pattern = mix(noise1, noise2, 0.5);
            
            // Create terrain boundary regions for color transitions
            float terrainMix = smoothstep(0.2, 0.6, pattern);
            
            // Mix colors based on terrain boundaries
            vec3 terrainColor = mix(u_baseColor, u_secondaryColor, terrainMix);
            
            // Add detail pattern with higher frequency noise
            float detailNoise = fbm(vPosition * u_patternScale * u_patternDensity, 2);
            terrainColor = mix(terrainColor, u_secondaryColor * 1.2, detailNoise * 0.3);
            
            // Add bass-responsive highlights
            float highlight = smoothstep(0.6, 0.8, noise1) * (1.0 + u_bass * 0.5);
            terrainColor += highlight * u_secondaryColor * 0.5;
            
            // Mid-frequency responsive patterns
            float midPattern = fbm(vPosition * u_patternScale * 0.5 + vec3(u_time * 0.1, 0.0, 0.0), 2);
            float midInfluence = midPattern * u_mid * 0.3;
            terrainColor = mix(terrainColor, u_baseColor * 1.5, midInfluence);
            
            // Atmosphere effect using fresnel
            float atmosphereFactor = pow(fresnel, 3.0) * u_atmosphereThickness;
            vec3 atmosphereColor = u_atmosphereColor * (1.0 + u_treble * u_atmosphereGlow);
            
            // Final color with atmosphere
            vec3 finalColor = mix(terrainColor, atmosphereColor, atmosphereFactor);
            
            // Add slight rim lighting
            finalColor += atmosphereColor * pow(fresnel, 8.0) * 0.8;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
        side: THREE.FrontSide,
      });
      return new THREE.Mesh(geometry, material);
    })
    .render(({ object, audioData, props, delta }) => {
      const material = object.material;

      // Initialize state variables if they don't exist
      if (!(object as any).__state) {
        (object as any).__state = {
          bassSmoothed: new SmoothedValue(0.85),
          midSmoothed: new SmoothedValue(0.8),
          trebleSmoothed: new SmoothedValue(0.75),
          rotationAngle: 0
        };
      }

      const state = (object as any).__state;

      // Extract audio data
      const bassEnergy = AudioUtils.getBassEnergy(audioData);
      const midEnergy = AudioUtils.getMidEnergy(audioData);
      const trebleEnergy = AudioUtils.getTrebleEnergy(audioData);

      // Smooth the audio data for more fluid animations
      state.bassSmoothed.update(bassEnergy);
      state.midSmoothed.update(midEnergy);
      state.trebleSmoothed.update(trebleEnergy);

      // Update uniforms with smoothed audio data
      material.uniforms.u_bass.value = state.bassSmoothed.get() * props.bassSensitivity;
      material.uniforms.u_mid.value = state.midSmoothed.get() * props.midSensitivity;
      material.uniforms.u_treble.value = state.trebleSmoothed.get() * props.trebleSensitivity;

      // Update time uniform
      material.uniforms.u_time.value += delta * props.timeScale;

      // Update other uniforms from props
      material.uniforms.u_baseColor.value.set(props.baseColor);
      material.uniforms.u_secondaryColor.value.set(props.secondaryColor);
      material.uniforms.u_atmosphereColor.value.set(props.atmosphereColor);
      material.uniforms.u_patternScale.value = props.patternScale;
      material.uniforms.u_patternDensity.value = props.patternDensity;
      material.uniforms.u_relief.value = props.reliefStrength;
      material.uniforms.u_atmosphereThickness.value = props.atmosphereThickness;
      material.uniforms.u_atmosphereGlow.value = props.atmosphereGlow;

      // Apply rotation with speed influenced by mid frequency
      const rotationSpeed = props.rotationSpeed * (1.0 + state.midSmoothed.get() * 0.3);
      state.rotationAngle += delta * rotationSpeed;

      // Apply zoom with speed influenced by treble frequency
      const zoomSpeed = props.zoomSpeed * AudioUtils.getTrebleEnergy(audioData);
      const zoomFactor = 1.0 + zoomSpeed;
      object.scale.set(zoomFactor, zoomFactor, zoomFactor);

      // Apply rotation to the mesh
      const axis = new THREE.Vector3(...props.rotationAxis).normalize();
      object.setRotationFromAxisAngle(axis, state.rotationAngle);
    })
);

export default Planet;