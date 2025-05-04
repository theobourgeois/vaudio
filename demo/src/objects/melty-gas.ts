import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

const MeltingGas = withReact(
  createVisualizerObject()
    .defaults(() => ({
      radius: 1,
      segments: 10,
      color: '#ff55ff',
      warpIntensity: 1.5,
      pulseScale: 0.6,
      gasSpeed: 0.2,
      delta: 0.03,
      leakRate: 0.1,
      turbulence: 4.0,
      particleDensity: 2.0,
    }))
    .object(({ props }) => {
      const geometry = new THREE.TorusKnotGeometry(
        props.radius,
        props.segments
      );

      const uniforms = {
        u_time: { value: 0 },
        u_color: { value: new THREE.Color(props.color) },
        u_intensity: { value: props.warpIntensity },
        u_bass: { value: 0 },
        u_speed: { value: props.gasSpeed },
        u_leakRate: { value: props.leakRate },
        u_turbulence: { value: props.turbulence },
        u_particleDensity: { value: props.particleDensity },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
        uniform float u_time;
        uniform float u_intensity;
        uniform float u_bass;
        uniform float u_turbulence;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        // Improved 3D noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
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
          
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          
          // Permutations
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                  
          // Gradients
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          
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
          vNormal = normal;
          vPosition = position;
          
          // Create gas leak effect by distorting vertices
          float noise = snoise(position * 0.5 + u_time * 0.2);
          float distortion = snoise(position + vec3(0.0, u_time * 0.1, 0.0)) * u_intensity * (1.0 + u_bass * 0.5);
          
          // Gas leak effect - vertices move outward based on noise
          vec3 newPosition = position;
          
          // Top part of sphere leaks more (y > 0)
          float leakFactor = smoothstep(-0.2, 1.0, position.y);
          
          // Apply turbulent noise for the gas movement
          vec3 turbulence = normal * distortion * u_turbulence * leakFactor;
          
          // Add bass-reactive pulsing
          newPosition += normal * (noise * 0.1 + u_bass * 0.2) * leakFactor;
          
          // Add turbulence
          newPosition += turbulence * (0.1 + 0.1 * sin(u_time * 2.0));
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
        fragmentShader: `
        precision highp float;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        uniform float u_time;
        uniform float u_intensity;
        uniform float u_speed;
        uniform float u_bass;
        uniform float u_leakRate;
        uniform float u_particleDensity;
        uniform vec3 u_color;
        
        // Improved noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
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
          
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          
          // Permutations
          i = mod289(i);
          vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                  
          // Gradients
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          
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
        
        // Fbm (Fractal Brownian Motion) for layered noise
        float fbm(vec3 p) {
          float sum = 0.0;
          float amp = 1.0;
          float freq = 1.0;
          // Add 4 octaves of noise
          for(int i = 0; i < 4; i++) {
            sum += amp * snoise(p * freq);
            freq *= 2.0;
            amp *= 0.5;
          }
          return sum;
        }
        
        void main() {
          // Gas leak appearance parameters
          float particleSize = 0.05 * u_particleDensity;
          float leakSpeed = u_speed * u_leakRate;
          
          // Position-based leak effects (more at the top)
          float yGradient = smoothstep(-0.5, 1.0, vPosition.y);
          
          // Create swirling gas patterns using fbm noise
          vec3 noiseCoord = vPosition * 2.0 + vec3(0.0, u_time * leakSpeed, 0.0);
          float noise1 = fbm(noiseCoord);
          float noise2 = fbm(noiseCoord * 2.0 + vec3(100.0));
          
          // Combine noise layers for more complex patterns
          float combinedNoise = noise1 * 0.6 + noise2 * 0.4;
          
          // Create gas particles
          float particles = smoothstep(0.4, 0.6, sin(combinedNoise * 20.0) * 0.5 + 0.5);
          
          // Add time-based animation for the gas flow
          float timeWarp = sin(u_time * 0.5) * 0.5 + 0.5;
          
          // Create wisps of gas
          float wisps = smoothstep(0.3, 0.7, fbm(vPosition + u_time * 0.1));
          
          // Bass-reactive effects
          float bassEffect = u_bass * (sin(u_time * 3.0) * 0.5 + 0.5);
          
          // Combine all effects
          float gasEffect = mix(particles, wisps, 0.5) * (1.0 + bassEffect * 0.3);
          
          // Make the gas leak more apparent at the top of the sphere
          gasEffect *= mix(0.6, 1.0, yGradient);
          
          // Create gas opacity falloff to simulate dissipation
          float opacityFalloff = mix(0.2, 0.9, smoothstep(0.0, 1.0, combinedNoise));
          
          // Create color variations
          vec3 baseColor = u_color;
          vec3 secondaryColor = vec3(baseColor.g * 0.8, baseColor.b, baseColor.r * 0.9);
          vec3 finalColor = mix(baseColor, secondaryColor, combinedNoise);
          
          // Add subtle glow
          finalColor += baseColor * bassEffect * 0.3;
          
          // Final opacity calculation
          float opacity = opacityFalloff * (0.9 - yGradient * 0.3);
          
          // Adjust opacity based on gas effect
          opacity *= gasEffect;
          
          gl_FragColor = vec4(finalColor, opacity);
        }
      `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Mesh(geometry, material);
    })
    .render(({ object, audioData, props }) => {
      const shader = object.material;
      shader.uniforms.u_time.value += props.delta;
      shader.uniforms.u_bass.value = AudioUtils.getBassEnergy(audioData);
      shader.uniforms.u_leakRate.value =
        props.leakRate * (1.0 + AudioUtils.getBassEnergy(audioData) * 0.5);

      object.geometry = new THREE.TorusKnotGeometry(props.radius, props.segments);
    })
);

export default MeltingGas;
