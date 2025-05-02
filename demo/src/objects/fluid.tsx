import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const FluidWater = withReact(
  createVisualizerObject()
    .defaults(() => ({
      size: 15, // Increased size
      segments: 40, // More segments for smoother waves
      color: '#400002',
      waveHeight: 8, // Increased wave height
      waveSpeed: 0.001, // Faster waves
      rippleFrequency: 0.05,
      depth: 2,
      foamIntensity: 0,
      rotationX: -Math.PI / 2,
    }))
    .geometry(
      ({ props }) =>
        new THREE.TorusGeometry(
          props.size,
          props.size,
          props.segments,
          props.segments
        )
    )
    .material(({ props }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_color: { value: new THREE.Color(props.color) },
        u_waveHeight: { value: props.waveHeight },
        u_waveSpeed: { value: props.waveSpeed },
        u_rippleFrequency: { value: props.rippleFrequency },
        u_depth: { value: props.depth },
        u_foamIntensity: { value: props.foamIntensity },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_treble: { value: 0 },
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying float vDepth;

          uniform float u_time;
          uniform float u_waveHeight;
          uniform float u_waveSpeed;
          uniform float u_rippleFrequency;
          uniform float u_bass;
          uniform float u_mid;

          // Simplex noise function (unchanged)
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
          vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

          float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);

            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);

            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;

            i = mod289(i);
            vec4 p = permute(permute(permute(
                      i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

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

            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;

            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
          }

          void main() {
            vUv = uv;
            vPosition = position;

            // Create wave pattern with more pronounced waves
            float wave = snoise(vec3(position.x * u_rippleFrequency, position.z * u_rippleFrequency, u_time * u_waveSpeed));
            
            // Add bass-reactive waves with more impact
            float bassWave = u_bass * 3.0;
            
            // Add mid-frequency ripples with more visibility
            float ripple = sin(position.x * 5.0 + u_time * 3.0) * u_mid;
            
            // Combine effects with more emphasis
            float height = wave * u_waveHeight + bassWave + ripple;
            
            // Calculate normal for lighting
            vec3 newPosition = position;
            newPosition.y = height;
            
            // Calculate normal using finite differences
            float eps = 0.1;
            float hL = snoise(vec3(position.x - eps, position.z, u_time * u_waveSpeed));
            float hR = snoise(vec3(position.x + eps, position.z, u_time * u_waveSpeed));
            float hD = snoise(vec3(position.x, position.z - eps, u_time * u_waveSpeed));
            float hU = snoise(vec3(position.x, position.z + eps, u_time * u_waveSpeed));
            
            vec3 normal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
            vNormal = normal;
            
            // Calculate depth for color variation
            vDepth = height * 0.5 + 0.5;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;

          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying float vDepth;

          uniform vec3 u_color;
          uniform float u_depth;
          uniform float u_foamIntensity;
          uniform float u_treble;

          void main() {
            // Calculate lighting with more contrast
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            float diffuse = max(dot(vNormal, lightDir), 0.0) * 1.5;
            
            // Create depth-based color variation with more contrast
            vec3 deepColor = u_color * 0.3;
            vec3 shallowColor = u_color * 2.0;
            vec3 waterColor = mix(deepColor, shallowColor, vDepth);
            
            // Add foam at wave peaks with more visibility
            float foam = smoothstep(0.6, 1.0, vDepth) * u_foamIntensity;
            
            // Add treble-reactive sparkles with more intensity
            float sparkle = sin(vPosition.x * 30.0) * sin(vPosition.z * 30.0) * u_treble * 2.0;
            
            // Combine all effects with more emphasis
            vec3 finalColor = waterColor * (diffuse + 0.3) + vec3(foam) + vec3(sparkle);
            
            // Add depth-based transparency with more range
            float alpha = mix(0.5, 1.0, vDepth);
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      });
    })
    .render(({ mesh, audioData, props, delta }) => {
      const shader = mesh.material;

      // Update time uniform
      shader.uniforms.u_time.value += delta;

      // Update audio-reactive uniforms with more sensitivity
      shader.uniforms.u_bass.value = AudioUtils.getBassEnergy(audioData) * 1.5;
      shader.uniforms.u_mid.value = AudioUtils.getMidEnergy(audioData) * 1.2;
      shader.uniforms.u_treble.value =
        AudioUtils.getTrebleEnergy(audioData) * 1.2;

      // Update other props
      shader.uniforms.u_color.value.set(props.color);
      shader.uniforms.u_waveHeight.value = props.waveHeight;
      shader.uniforms.u_waveSpeed.value = props.waveSpeed;
      shader.uniforms.u_rippleFrequency.value = props.rippleFrequency;
      shader.uniforms.u_depth.value = props.depth;
      shader.uniforms.u_foamIntensity.value = props.foamIntensity;
    })
);
