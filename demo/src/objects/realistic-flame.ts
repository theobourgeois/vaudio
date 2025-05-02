import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const RealisticFlame = withReact(
  createVisualizerObject()
    .defaults(() => ({
      width: 9.0,
      height: 6.0,
      segments: 2,
      baseColor: '#ff0000',
      tipColor: '#ff0000',
      flickerSpeed: 0.5,
      audioReactivity: 1.0,
      delta: 0.016,
      intensity: 1.5,
      turbulence: 2.0,
    }))
    .geometry(({ props: layer }) => {
      return new THREE.PlaneGeometry(
        layer.width,
        layer.height,
        layer.segments,
        layer.segments * 2
      );
    })
    .material(({ props: layer }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_baseColor: { value: new THREE.Color(layer.baseColor) },
        u_tipColor: { value: new THREE.Color(layer.tipColor) },
        u_flickerSpeed: { value: layer.flickerSpeed },
        u_audioIntensity: { value: 0 },
        u_intensity: { value: layer.intensity },
        u_turbulence: { value: layer.turbulence },
        u_resolution: { value: new THREE.Vector2(1, 1) },
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        precision highp float;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        uniform float u_time;
        uniform float u_flickerSpeed;
        uniform float u_audioIntensity;
        uniform float u_intensity;
        uniform float u_turbulence;
        uniform vec3 u_baseColor;
        uniform vec3 u_tipColor;
        uniform vec2 u_resolution;
        
        // Noise functions based on classic Perlin noise implementation
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
        
        // Fractal Brownian Motion for layered fire detail
        float fbm(vec3 p) {
          float sum = 0.0;
          float amp = 1.0;
          float freq = 1.0;
          // Loop creates multiple octaves of noise for detail
          for(int i = 0; i < 5; i++) {
            sum += amp * snoise(p * freq);
            freq *= 2.0;
            amp *= 0.5;
          }
          return sum;
        }
        
        void main() {
          // Adjust UV space to have origin at bottom center
          vec2 uv = vUv;
          uv.y = 1.0 - uv.y; // Invert Y so flame grows upward
          uv = uv * 2.0 - 1.0; // Center UV
          
          // Flame shape parameters - affected by audio
          float audioBoost = 1.0 + u_audioIntensity * 2.0;
          float flameHeight = 1.0 * audioBoost;
          float flameWidth = 0.6 + u_audioIntensity * 0.3;
          
          // Time-based animation
          float time = u_time * u_flickerSpeed;
          
          // Base flame shape - narrower at top, wider at bottom
          float flameShape = pow(1.0 - uv.y, 2.0) * flameWidth;
          float mask = smoothstep(flameShape, flameShape + 0.01, abs(uv.x));
          
          // Early exit for pixels outside flame shape
          if (mask > 0.98) {
            discard;
          }
          
          // Audio-enhanced turbulence
          float turbulence = u_turbulence * (1.0 + u_audioIntensity * 0.5);
          
          // Create primary fire noise
          vec3 noiseCoord = vec3(uv.x * 2.0, uv.y, time * 0.1);
          float noise1 = fbm(noiseCoord * vec3(1.0, 2.0, 1.0) * turbulence);
          
          // Create secondary swirling fire noise
          vec3 noiseCoord2 = vec3(uv.x * 3.0 + time * 0.05, uv.y * 2.0, time * 0.2);
          float noise2 = fbm(noiseCoord2 * turbulence);
          
          // Create fine detail noise
          vec3 noiseCoord3 = vec3(uv.x * 5.0, uv.y * 8.0, time * 0.3);
          float detailNoise = fbm(noiseCoord3 * turbulence);
          
          // Combine noise layers
          float combinedNoise = noise1 * 0.6 + noise2 * 0.3 + detailNoise * 0.1;
          
          // Create height falloff for the flame
          float heightGradient = smoothstep(0.0, flameHeight, 1.0 - uv.y);
          
          // Enhance edges with detail noise
          float edgeDetail = smoothstep(0.3, 0.7, combinedNoise) * heightGradient;
          
          // Create flame core and outer flame
          float flameCore = smoothstep(0.2, 0.5, combinedNoise) * heightGradient;
          float flameOuter = smoothstep(0.0, 0.6, combinedNoise) * heightGradient;
          
          // Add flickering effect
          float flicker = sin(time * 2.0) * 0.1 + sin(time * 7.3) * 0.05 + sin(time * 13.7) * 0.025;
          flicker = flicker * (1.0 - uv.y); // More flickering at the top
          
          // Apply audio reactivity to the flames
          float audioFlicker = sin(time * 4.0 * (1.0 + u_audioIntensity)) * 0.1 * u_audioIntensity;
          
          // Combine core and outer flame with flicker
          float finalFlame = flameCore + flameOuter * 0.6 + flicker + audioFlicker;
          finalFlame *= (1.0 - mask); // Apply edge mask
          
          // Audio reactive intensity
          finalFlame *= u_intensity * audioBoost;
          
          // Color gradient from base to tip
          vec3 baseColor = u_baseColor;
          vec3 tipColor = u_tipColor;
          
          // Add yellow/white hot center based on noise and height
          vec3 hotColor = vec3(1.0, 0.9, 0.6) * (u_audioIntensity + 0.5);
          
          // Color variation based on noise
          float colorNoise = snoise(vec3(uv.x * 4.0, uv.y * 2.0, time * 0.2)) * 0.1;
          
          // Create color gradient along height
          vec3 flameColor = mix(baseColor, tipColor, pow(1.0 - uv.y, 1.2) + colorNoise);
          
          // Add hot center
          flameColor = mix(flameColor, hotColor, flameCore * (1.0 - uv.y) * 2.0);
          
          // Adjust brightness based on audio
          flameColor *= 1.0 + u_audioIntensity * 0.5;
          
          // Final color with opacity
          gl_FragColor = vec4(flameColor, finalFlame);
          
          // Add bloom effect for stronger flames (audio reactive)
          gl_FragColor.rgb += pow(finalFlame, 3.0) * u_audioIntensity * vec3(1.0, 0.6, 0.3) * 0.5;
        }
      `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
    })
    .start(({ mesh, props: layer }) => {
      // Make the flame face the camera
      mesh.renderOrder = 1000;

      // Optional: Create a point light for the flame to illuminate surroundings
      const flameLight = new THREE.PointLight(
        new THREE.Color(layer.baseColor),
        1.0,
        5.0
      );
      flameLight.position.set(0, 0.5, 0);
      mesh.add(flameLight);

      // Store light reference for animation
      mesh.userData.flameLight = flameLight;
    })
    .render(({ mesh, audioData, props: layer, camera }) => {
      const shader = mesh.material as THREE.ShaderMaterial;
      shader.uniforms.u_time.value += layer.delta;

      // Calculate audio intensity - use a mix of frequencies for more organic response
      const bassEnergy = AudioUtils.getBassEnergy(audioData);
      const midEnergy = AudioUtils.getMidEnergy(audioData);
      const audioIntensity = bassEnergy * 0.7 + midEnergy * 0.3;

      // Apply audio reactivity with smoother transitions
      shader.uniforms.u_audioIntensity.value =
        audioIntensity * layer.audioReactivity;

      // Make the flame face the camera (billboarding)
      mesh.lookAt(camera.position);

      // Animate the flame light based on audio intensity
      if (mesh.userData.flameLight) {
        const light = mesh.userData.flameLight as THREE.PointLight;
        light.intensity = 1.0 + audioIntensity * 2.0;

        // Color shift with intensity
        const hue = 0.05 - audioIntensity * 0.02; // Shift from orange-red to yellow
        light.color.setHSL(hue, 1.0, 0.5 + audioIntensity * 0.2);
      }
    })
);
