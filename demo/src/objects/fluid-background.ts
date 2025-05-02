import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

export const FluidBackground = withReact(
  createVisualizerObject()
    .defaults(() => ({
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 512,
      DENSITY_DISSIPATION: 0.97,
      VELOCITY_DISSIPATION: 0.98,
      PRESSURE: 0.8,
      PRESSURE_ITERATIONS: 20,
      CURL: 30,
      SPLAT_RADIUS: 0.1,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLOR_UPDATE_SPEED: 0.2,
      BACK_COLOR: { r: 0.0, g: 0.0, b: 0.0 },
      TRANSPARENT: true,
    }))
    .geometry(({ props }) => {
      const geometry = new THREE.PlaneGeometry(2, 2);
      return geometry;
    })
    .material(({ props }) => {
      const uniforms = {
        u_time: { value: 0 },
        u_bass: { value: 0 },
        u_mid: { value: 0 },
        u_treble: { value: 0 },
        u_resolution: { value: new THREE.Vector2(props.SIM_RESOLUTION, props.SIM_RESOLUTION) },
        u_densityDissipation: { value: props.DENSITY_DISSIPATION },
        u_velocityDissipation: { value: props.VELOCITY_DISSIPATION },
        u_pressure: { value: props.PRESSURE },
        u_curl: { value: props.CURL },
        u_splatRadius: { value: props.SPLAT_RADIUS },
        u_splatForce: { value: props.SPLAT_FORCE },
        u_shading: { value: props.SHADING ? 1.0 : 0.0 },
        u_colorUpdateSpeed: { value: props.COLOR_UPDATE_SPEED },
        u_backColor: { value: new THREE.Vector3(props.BACK_COLOR.r, props.BACK_COLOR.g, props.BACK_COLOR.b) },
      };

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          varying vec2 vL;
          varying vec2 vR;
          varying vec2 vT;
          varying vec2 vB;
          uniform vec2 u_resolution;

          void main() {
            vUv = uv;
            vec2 texelSize = 1.0 / u_resolution;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          varying vec2 vUv;
          varying vec2 vL;
          varying vec2 vR;
          varying vec2 vT;
          varying vec2 vB;
          uniform float u_time;
          uniform float u_bass;
          uniform float u_mid;
          uniform float u_treble;
          uniform vec2 u_resolution;
          uniform float u_densityDissipation;
          uniform float u_velocityDissipation;
          uniform float u_pressure;
          uniform float u_curl;
          uniform float u_splatRadius;
          uniform float u_splatForce;
          uniform float u_shading;
          uniform float u_colorUpdateSpeed;
          uniform vec3 u_backColor;

          // Fluid simulation functions
          vec2 rotate2D(vec2 v, float a) {
            float s = sin(a);
            float c = cos(a);
            mat2 m = mat2(c, -s, s, c);
            return m * v;
          }

          // Simplex noise function
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
            // Calculate audio intensity
            float audioIntensity = (u_bass * 1.5 + u_mid + u_treble * 0.5) / 3.0;
            
            // Create fluid-like movement
            vec2 uv = vUv;
            vec2 center = vec2(0.5);
            
            // Create multiple splashes based on audio
            vec3 color = u_backColor;
            float totalSplash = 0.0;
            
            // Create splashes at different positions
            for(int i = 0; i < 4; i++) {
              float angle = u_time * 0.5 + float(i) * 1.57;
              vec2 splashPos = center + vec2(cos(angle), sin(angle)) * 0.3;
              
              // Calculate distance to splash center
              float dist = length(uv - splashPos);
              
              // Create splash effect
              float splash = smoothstep(0.2, 0.0, dist);
              
              // Add audio reactivity
              splash *= (1.0 + u_bass * 2.0);
              
              // Add color to splash
              vec3 splashColor = vec3(
                0.5 + 0.5 * sin(u_time * u_colorUpdateSpeed + float(i)),
                0.5 + 0.5 * sin(u_time * u_colorUpdateSpeed + float(i) + 2.094),
                0.5 + 0.5 * sin(u_time * u_colorUpdateSpeed + float(i) + 4.189)
              );
              
              color += splashColor * splash;
              totalSplash += splash;
            }
            
            // Add fluid-like movement
            vec2 movement = vec2(
              snoise(vec3(uv * 3.0, u_time * 0.2)),
              snoise(vec3(uv * 3.0 + 100.0, u_time * 0.2))
            ) * 0.1 * audioIntensity;
            
            // Add curl to movement
            float curl = snoise(vec3(uv * 2.0, u_time * 0.3)) * u_curl * 0.01;
            movement = rotate2D(movement, curl);
            
            // Apply movement to color
            vec2 newUv = uv + movement;
            vec3 movedColor = mix(color, u_backColor, smoothstep(0.0, 1.0, length(movement)));
            
            // Add shading
            if(u_shading > 0.5) {
              vec3 normal = normalize(vec3(movement, 1.0));
              float diffuse = max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
              movedColor *= (0.5 + 0.5 * diffuse);
            }
            
            // Add audio-reactive glow
            float glow = audioIntensity * 0.5;
            movedColor += movedColor * glow;
            
            // Add frequency-based color shifts
            movedColor.r += u_bass * 0.2;
            movedColor.g += u_mid * 0.2;
            movedColor.b += u_treble * 0.2;
            
            gl_FragColor = vec4(movedColor, 1.0);
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

      // Update other uniforms
      shader.uniforms.u_densityDissipation.value = props.DENSITY_DISSIPATION;
      shader.uniforms.u_velocityDissipation.value = props.VELOCITY_DISSIPATION;
      shader.uniforms.u_pressure.value = props.PRESSURE;
      shader.uniforms.u_curl.value = props.CURL;
      shader.uniforms.u_splatRadius.value = props.SPLAT_RADIUS;
      shader.uniforms.u_splatForce.value = props.SPLAT_FORCE;
      shader.uniforms.u_shading.value = props.SHADING ? 1.0 : 0.0;
      shader.uniforms.u_colorUpdateSpeed.value = props.COLOR_UPDATE_SPEED;
      shader.uniforms.u_backColor.value.set(
        props.BACK_COLOR.r,
        props.BACK_COLOR.g,
        props.BACK_COLOR.b
      );
    })
);