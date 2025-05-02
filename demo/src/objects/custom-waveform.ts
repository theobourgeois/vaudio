import { AudioUtils } from '@vaudio/utils';
import { createVisualizerObject } from '@vaudio/core';
import * as THREE from 'three';
import { withReact } from '@vaudio/react';

// Define an interface for the expected processed audio data structure
interface ProcessedAudioData {
  waveform: Uint8Array; // Or Float32Array if normalized
  frequencies: Uint8Array; // Or Float32Array if normalized
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  averageEnergy: number;
}

// Helper function to process raw audio data (You might have this in AudioUtils)
// THIS IS A PLACEHOLDER - Implement based on your actual AudioUtils capabilities
function processAudio(
  audioData: Uint8Array,
  fftSize: number
): ProcessedAudioData {
  // Assuming audioData is time domain from AnalyserNode.getByteTimeDomainData
  // Assuming you also have access to frequency data (e.g., AnalyserNode.getByteFrequencyData)
  // This part needs actual implementation based on how you get both types of data

  // Placeholder: Assume audioData holds waveform, make fake frequency data
  const waveform = audioData; // Use directly if appropriate
  const frequencyBinCount = fftSize / 2;
  const frequencies = new Uint8Array(frequencyBinCount);
  // Example: Fill frequencies based on waveform energy for demo purposes
  let sum = 0;
  for (let i = 0; i < waveform.length; i++) {
    sum += Math.abs(waveform[i] / 128.0 - 1.0); // Approximate energy
  }
  const avgEnergy = waveform.length > 0 ? sum / waveform.length : 0;
  for (let i = 0; i < frequencyBinCount; i++) {
    frequencies[i] = Math.min(
      255,
      Math.max(0, avgEnergy * 255 * (1.0 - i / frequencyBinCount))
    ); // Fake falloff
  }

  // Use your AudioUtils for energy calculation
  const bassEnergy = AudioUtils.getBassEnergy(frequencies); // Pass FREQUENCY data
  const midEnergy = AudioUtils.getMidEnergy(frequencies); // Pass FREQUENCY data
  const highEnergy = AudioUtils.getTrebleEnergy(frequencies); // Pass FREQUENCY data

  return {
    waveform,
    frequencies,
    bassEnergy,
    midEnergy,
    highEnergy,
    averageEnergy: avgEnergy, // Example average
  };
}

export const SuperWaveform = withReact(
  createVisualizerObject()
    .defaults(() => ({
      // --- Keep all your defaults ---
      width: 10,
      height: 3,
      depth: 2,
      resolution: 256, // Points in the waveform / Number of bars/dots
      primaryColor: '#00ffff',
      secondaryColor: '#ff00ff',
      glowColor: '#ffffff',
      glowStrength: 0.5,
      waveSpeed: 1.0,
      pulseSpeed: 0.5,
      reactivity: 3.0,
      rotationSpeed: 0.2,
      waveCount: 3,
      waveAmplitude: 1.0,
      waveTension: 4.0, // May not be directly applicable to all modes now
      useGlow: true, // Glow will be shader-based where applicable
      use3D: true,
      useRotation: true,
      usePerspective: true, // Default camera manipulation to false
      useFrequencyInfluence: true,
      visualStyle: 'smooth', // 'smooth'(line), 'line'(points), 'bars'(instanced), 'dots'(points), 'ribbons'(mesh)
      colorMode: 'frequency', // 'gradient', 'frequency', 'spectrum', 'single'
      depthAmplitude: 0.5, // For 3D depth effect
      tessellation: 10, // Reduced default tessellation for ribbon performance
      noiseAmount: 0.2,
      mirrorMode: false, // Mirroring needs shader logic if desired
      delta: 0.016, // Usually provided by the renderer, but can be default
      lineWidth: 100, // For 'smooth' style (if using LineMaterial)
      pointSize: 4.0, // For 'line' and 'dots' styles
      barWidthScale: 1.8, // Scale factor for bar width relative to spacing
      fftSize: 512, // For audio processing resolution (power of 2)
    }))
    // Use createObject as different styles require different Three.js object types
    .createObject(({ props: layer }) => {
      switch (layer.visualStyle) {
        case 'bars': {
          // Use InstancedMesh for bars - More performant
          const barGeometry = new THREE.BoxGeometry(1, 1, 1); // Base geometry (scaled per instance)
          // Material will be defined in .material() step
          const barMaterial = new THREE.MeshBasicMaterial({
            color: layer.primaryColor,
          }); // Placeholder, will be replaced by .material()
          const instancedMesh = new THREE.InstancedMesh(
            barGeometry,
            barMaterial,
            layer.resolution
          );
          instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // Important for updates
          return instancedMesh;
        }

        case 'ribbons': {
          // Use Mesh with PlaneGeometry - requires .geometry() and .material()
          // Let the default Mesh creation handle this via geometry/material steps.
          // Need to ensure material is MeshStandardMaterial or similar if lighting is desired.
          const geometry = new THREE.PlaneGeometry(
            layer.width,
            layer.height,
            layer.resolution - 1,
            layer.tessellation
          );
          // Material will be defined in .material()
          const material = new THREE.MeshBasicMaterial(); // Placeholder
          return new THREE.Mesh(geometry, material); // Let .material override this
        }

        case 'dots':
        case 'line': {
          // Treat 'line' style as points for consistency with its shader
          // Use Points for 'dots' and 'line' style
          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array(layer.resolution * 3);
          const colors = new Float32Array(layer.resolution * 3); // Add color attribute
          const customSize = new Float32Array(layer.resolution); // Add size attribute

          for (let i = 0; i < layer.resolution; i++) {
            const x = (i / (layer.resolution - 1) - 0.5) * layer.width;
            positions[i * 3] = x;
            positions[i * 3 + 1] = 0; // Initial Y
            positions[i * 3 + 2] = 0; // Initial Z

            colors[i * 3] = 1.0; // Initial white color
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 1.0;

            customSize[i] = 1.0; // Initial size factor
          }
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3).setUsage(
              THREE.DynamicDrawUsage
            )
          );
          geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(colors, 3).setUsage(
              THREE.DynamicDrawUsage
            )
          );
          geometry.setAttribute(
            'customSize',
            new THREE.BufferAttribute(customSize, 1).setUsage(
              THREE.DynamicDrawUsage
            )
          ); // Use 'customSize' to avoid conflict

          // Material will be defined in .material() step
          const pointsMaterial = new THREE.PointsMaterial({
            size: layer.pointSize,
            vertexColors: true,
          }); // Placeholder
          return new THREE.Points(geometry, pointsMaterial);
        }

        case 'smooth': // Treat 'smooth' as a Line
        default: {
          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array(layer.resolution * 3);
          for (let i = 0; i < layer.resolution; i++) {
            const x = (i / (layer.resolution - 1) - 0.5) * layer.width;
            positions[i * 3] = x;
            positions[i * 3 + 1] = 0; // Initial Y
            positions[i * 3 + 2] = 0; // Initial Z
          }
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3).setUsage(
              THREE.DynamicDrawUsage
            )
          );

          // Material defined in .material()
          // Consider THREE.LineMaterial from addons for variable width if needed
          const lineMaterial = new THREE.LineBasicMaterial({
            color: layer.primaryColor,
            linewidth: layer.lineWidth,
          }); // Placeholder
          return new THREE.Line(geometry, lineMaterial);
        }
      }
    })
    // Define Material AFTER createObject - this will REPLACE the placeholder materials
    .material(({ props: layer }) => {
      // Common uniforms
      const uniforms = {
        u_time: { value: 0 },
        u_delta: { value: layer.delta },
        u_resolution: { value: layer.resolution },
        u_waveData: { value: new Float32Array(layer.fftSize / 2) }, // Store normalized waveform data if needed by shader
        u_frequencyData: { value: new Float32Array(layer.fftSize / 2) }, // Store normalized frequency data
        u_primaryColor: { value: new THREE.Color(layer.primaryColor) },
        u_secondaryColor: { value: new THREE.Color(layer.secondaryColor) },
        u_glowColor: { value: new THREE.Color(layer.glowColor) },
        u_glowStrength: { value: layer.glowStrength },
        u_waveCount: { value: layer.waveCount },
        u_waveAmplitude: { value: layer.waveAmplitude },
        u_noiseAmount: { value: layer.noiseAmount },
        u_bassEnergy: { value: 0 },
        u_midEnergy: { value: 0 },
        u_highEnergy: { value: 0 },
        u_averageEnergy: { value: 0 },
        u_reactivity: { value: layer.reactivity },
        u_waveSpeed: { value: layer.waveSpeed },
        u_pulseSpeed: { value: layer.pulseSpeed },
        u_depthAmplitude: { value: layer.depthAmplitude },
        // --- NEW Uniforms for shader branching ---
        u_use3D: { value: layer.use3D ? 1.0 : 0.0 },
        u_colorMode: {
          value: ['gradient', 'frequency', 'spectrum', 'single'].indexOf(
            layer.colorMode
          ),
        }, // Pass index
        u_visualStyle: {
          value: ['smooth', 'line', 'bars', 'dots', 'ribbons'].indexOf(
            layer.visualStyle
          ),
        },
        u_pointSize: { value: layer.pointSize },
      };

      // --- Define shader chunks (keep yours, maybe add more) ---
      const shaderChunks = {
        noise: `
            // Improved noise functions (keep your snoise/fbm)
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            float snoise(vec2 v) { const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439); vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx); vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod289(i); vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 )); vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m ; m = m*m ; vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h ); vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw; return 130.0 * dot(m, g); }
            float fbm(vec2 p) { float sum = 0.0; float amp = 1.0; float freq = 1.0; for(int i = 0; i < 4; i++) { sum += amp * snoise(p * freq); freq *= 2.0; amp *= 0.5; } return sum; }
        `,
        colorMapping: `
            // Color mapping functions (keep yours, adjust uniform names if needed)
            // Use u_colorMode uniform for branching
            vec3 frequencyToColor(float frequency) { /* ... keep ... */ vec3 color; float hue = frequency * 0.6; float x = 1.0 - abs(mod(hue * 6.0, 2.0) - 1.0); if(hue < 1.0/6.0) color = vec3(1.0, x, 0.0); else if(hue < 2.0/6.0) color = vec3(x, 1.0, 0.0); else if(hue < 3.0/6.0) color = vec3(0.0, 1.0, x); else if(hue < 4.0/6.0) color = vec3(0.0, x, 1.0); else if(hue < 5.0/6.0) color = vec3(x, 0.0, 1.0); else color = vec3(1.0, 0.0, x); return color; }
            vec3 getSpectrumColor(float position, float energyLevel) { /* ... keep ... */ vec3 lowEnergy = mix(u_primaryColor, vec3(0.0, 0.0, 0.2), 0.5); vec3 highEnergy = mix(u_secondaryColor, vec3(1.0, 0.2, 0.0), 0.5); float bassInfluence = sin(position * 3.14159 * 2.0) * 0.5 + 0.5; float midInfluence = cos(position * 3.14159 * 4.0) * 0.5 + 0.5; float highInfluence = sin(position * 3.14159 * 8.0 + u_time) * 0.5 + 0.5; float combinedInfluence = bassInfluence * u_bassEnergy * 0.5 + midInfluence * u_midEnergy * 0.3 + highInfluence * u_highEnergy * 0.2; float timeFactor = sin(u_time * u_pulseSpeed + position * 10.0) * 0.5 + 0.5; combinedInfluence = mix(combinedInfluence, timeFactor, 0.3); return mix(lowEnergy, highEnergy, combinedInfluence * energyLevel); }

             vec3 getColor(float normalizedX, float normalizedY, float elevation) {
                 vec3 color = u_primaryColor;
                 float energy = u_bassEnergy * 0.6 + u_midEnergy * 0.3 + u_highEnergy * 0.1;
                 float elevationFactor = (elevation + u_waveAmplitude) / (2.0 * u_waveAmplitude); // 0 to 1 approx

                 // u_colorMode: 0:gradient, 1:frequency, 2:spectrum, 3:single
                 if (abs(u_colorMode - 0.0) < 0.1) { // gradient
                     color = mix(u_primaryColor, u_secondaryColor, normalizedY); // Use normalized Y (e.g., ribbon uv.y)
                     float shimmer = sin(normalizedX * 20.0 + normalizedY * 15.0 + u_time * 2.0) * 0.5 + 0.5;
                     color += u_glowColor * shimmer * 0.2 * u_glowStrength;
                 } else if (abs(u_colorMode - 1.0) < 0.1) { // frequency
                     color = frequencyToColor(normalizedX); // Use normalized X
                     color *= 0.4 + energy * 0.8;
                 } else if (abs(u_colorMode - 2.0) < 0.1) { // spectrum
                     color = getSpectrumColor(normalizedX, elevationFactor); // Use normalized X
                 } else { // single (index 3 or default)
                     float variation = sin(normalizedX * 10.0 + normalizedY * 8.0 + u_time) * 0.5 + 0.5;
                     color = mix(color * 0.7, color * 1.3, variation);
                 }

                 // Add elevation-based highlights (applies to all modes)
                 color = mix(color, u_glowColor, pow(elevationFactor, 3.0) * u_glowStrength * (u_useGlow ? 1.0 : 0.0));

                // Add glow at peaks (applies to all modes)
                 float glow = pow(elevationFactor, 4.0) * u_glowStrength * (u_useGlow ? 1.0 : 0.0);
                 color += u_glowColor * glow;

                // Audio reactive brightness
                 float audioReactiveGlow = (u_bassEnergy * 0.4 + u_midEnergy * 0.4 + u_highEnergy * 0.2) * u_reactivity;
                 color *= 1.0 + audioReactiveGlow * 0.5;

                 return color;
             }
        `,
        waveform: `
             // Waveform calculation (keep yours, adjust uniform names if needed)
             // Use u_frequencyData if needed for frequency influence
             // Input x should be normalized (0 to 1)
             float calculateWaveform(float x, float timeOffset) {
                 float normalizedX = x * 2.0 - 1.0;
                 float wave = sin(normalizedX * 3.14159 * u_waveCount + u_time * u_waveSpeed + timeOffset);
                 wave += sin(normalizedX * 3.14159 * u_waveCount * 2.0 + u_time * u_waveSpeed * 0.7) * 0.5;
                 wave += sin(normalizedX * 3.14159 * u_waveCount * 0.5 + u_time * u_waveSpeed * 1.3) * 0.3;
                 wave /= 1.8; // Normalize

                 // Noise
                 float noise = fbm(vec2(normalizedX * 2.0, u_time * 0.2)) * u_noiseAmount;
                 wave += noise;

                 // Reactivity
                 float audioEnergy = u_bassEnergy * 0.6 + u_midEnergy * 0.3 + u_highEnergy * 0.1;
                 wave *= mix(0.5, audioEnergy * 3.0, u_reactivity * 2.0);

                 // Frequency Influence (use u_frequencyData)
                 // Note: u_frequencyData length is fftSize/2
                  if (x < 1.0 && u_useFrequencyInfluence > 0.5) {
                      float freqIndex = x * float(u_resolution / 2); // Assuming freq data length matches resolution/2
                      int idx = int(freqIndex);
                      // Safely access frequency data - ensure index is valid
                      // Check against actual length of u_frequencyData if needed
                      if (idx >= 0 && idx < u_resolution / 2) { // Adjust length check if needed
                          // u_frequencyData should contain normalized values (0-1)
                          float frequencyValue = u_frequencyData[idx];
                          wave = mix(wave, wave * (1.0 + frequencyValue * 1.5), 0.5); // Modulate by frequency value
                      }
                  }

                 return wave * u_waveAmplitude;
             }
        `,
      };

      // --- Define Materials based on Style ---
      switch (layer.visualStyle) {
        case 'ribbons':
          return new THREE.ShaderMaterial({
            uniforms,
            vertexShader: `
                    ${shaderChunks.noise}
                    ${shaderChunks.waveform}
                    varying vec2 vUv;
                    varying float vElevation;
                    uniform float u_use3D; // Use uniform

                    void main() {
                        vUv = uv;
                        float wave = calculateWaveform(uv.x, uv.y * 3.14159);
                        vElevation = wave;

                        vec3 newPosition = position;
                        newPosition.y += wave;
                         // Branch in shader using uniform
                         if (u_use3D > 0.5) {
                             newPosition.z += sin(uv.x * 10.0 + u_time) * cos(uv.y * 8.0 - u_time * 0.5) * u_depthAmplitude;
                         }

                        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                    }
                `,
            fragmentShader: `
                    ${shaderChunks.colorMapping} // Include full chunk
                    varying vec2 vUv;
                    varying float vElevation;
                    uniform bool u_useGlow; // Pass as uniform if needed inside getColor

                    void main() {
                        vec3 color = getColor(vUv.x, vUv.y, vElevation);
                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
            side: THREE.DoubleSide,
            transparent: true, // Depending on glow/blending
          });

        case 'bars':
          // Material for InstancedMesh
          return new THREE.ShaderMaterial({
            uniforms,
            vertexShader: `
                    ${shaderChunks.noise
              } // Include if noise affects bars somehow
                    ${shaderChunks.waveform
              } // Include if waveform affects bars somehow

                    varying vec3 vColor;
                    // Add other varyings if needed

                    void main() {
                        // Instance matrix contains position, rotation, scale
                        vec3 instancePosition = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                        float instanceScaleY = length(instanceMatrix[1].xyz); // Get Y scale from matrix
                        float normalizedX = instancePosition.x / ${layer.width.toFixed(
                1
              )} + 0.5;

                        // Color calculation (example: based on instance position)
                         vColor = getColor(normalizedX, 0.5, instanceScaleY * 0.5); // Pass normalized X, fixed Y, height proxy

                        // Apply instance matrix and then standard transformations
                        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
            fragmentShader: `
                    varying vec3 vColor;
                    uniform vec3 u_glowColor;
                    uniform float u_glowStrength;

                    void main() {
                        // Basic color, maybe add some lighting/glow later
                         vec3 color = vColor;
                         // Example: Add simple glow based on brightness
                         float intensity = dot(color, vec3(0.299, 0.587, 0.114));
                         color += u_glowColor * pow(intensity, 2.0) * u_glowStrength * (u_useGlow ? 1.0 : 0.0);

                        gl_FragColor = vec4(color, 1.0);
                    }
                `,
          });

        case 'dots':
        case 'line': // Use same point shader
          return new THREE.ShaderMaterial({
            uniforms,
            vertexShader: `
                    ${shaderChunks.noise} // Include noise for potential use
                    ${shaderChunks.waveform
              } // Include waveform for potential use
                    ${shaderChunks.colorMapping} // Include color logic

                    attribute vec3 color; // Receive color attribute
                    attribute float customSize; // Receive custom size attribute
                    varying vec3 vColor;
                    uniform float u_pointSize; // Base point size

                    void main() {
                        // The 'position' attribute holds the base X position set in createObject
                         float normalizedX = position.x / ${layer.width.toFixed(
                1
              )} + 0.5;

                        // Calculate Y/Z displacement in shader (can use waveform/noise)
                        // We get waveform/frequency uniforms, use them directly if needed
                         float waveHeight = 0.0; // Get from u_waveData[index]? Or calculate here?
                         // Example: Simplified wave calculation for points
                          waveHeight = calculateWaveform(normalizedX, 0.0);


                         vec3 newPosition = position;
                         newPosition.y = waveHeight; // Directly use calculated height

                         if (u_use3D > 0.5) {
                            newPosition.z = sin(normalizedX * 6.0 + u_time) * u_depthAmplitude;
                         }

                        // Calculate color based on position/height
                        vColor = getColor(normalizedX, 0.5, waveHeight); // Use normalized X, fixed Y for points

                        // Point Size
                        float audioEnergy = u_bassEnergy * 0.5 + u_midEnergy * 0.3 + u_highEnergy * 0.2;
                        float sizeMod = 1.0 + audioEnergy * u_reactivity * 2.0;

                        vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                        gl_Position = projectionMatrix * mvPosition;
                        // Use base size, custom attribute factor, and audio modulation
                        gl_PointSize = u_pointSize * customSize * sizeMod;
                    }
                `,
            fragmentShader: `
                    varying vec3 vColor;
                    uniform vec3 u_glowColor; // Example uniform for glow
                    uniform float u_glowStrength; // Example uniform for glow

                    void main() {
                        // Circular point shape
                        vec2 coord = gl_PointCoord - vec2(0.5);
                        float dist = length(coord);
                        if (dist > 0.5) discard;

                         // Add edge softening/glow
                        float edgeFactor = 1.0 - smoothstep(0.4, 0.5, dist);
                        vec3 finalColor = vColor;

                        // Optional: Add glow based on distance from center
                        finalColor += u_glowColor * pow(1.0 - dist * 2.0, 2.0) * u_glowStrength * (u_useGlow ? 1.0 : 0.0);

                        gl_FragColor = vec4(finalColor, edgeFactor); // Use edge factor for alpha
                    }
                `,
            transparent: true, // Needed for smooth point edges
            blending: THREE.AdditiveBlending, // Often looks good for points
            depthWrite: false, // Often needed with additive blending
          });

        case 'smooth': // Line style
        default:
          // Use LineBasicMaterial or potentially THREE.LineMaterial from addons
          // For simplicity, let's use LineBasicMaterial and update its color.
          // ShaderMaterial for lines is complex (need adjacent vertices).
          return new THREE.LineBasicMaterial({
            color: layer.primaryColor,
            linewidth: layer.lineWidth, // Note: linewidth > 1 requires LineMaterial addon usually
            vertexColors: false, // Set to true if you calculate colors per vertex in .render()
          });
      }
    })
    .start(({ mesh, props: layer }) => {
      // One-time setup for the PRIMARY mesh object
      if (mesh instanceof THREE.InstancedMesh) {
        // Initial setup for bars (set initial matrix)
        const dummy = new THREE.Object3D();
        const barWidth = layer.width / layer.resolution;
        for (let i = 0; i < layer.resolution; i++) {
          const x = (i / (layer.resolution - 1) - 0.5) * layer.width;
          dummy.position.set(x, 0, 0);
          dummy.scale.set(barWidth * layer.barWidthScale, 0.1, layer.depth); // Initial scale
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
      // No need to create child objects here anymore
      mesh.userData.lastUpdateTime = 0; // Example user data
    })
    .render(({ mesh, audioData: rawAudioData, props: layer, camera }) => {
      // 1. Process Audio Data
      // Ensure fftSize is compatible with AnalyserNode settings
      const processedAudio = processAudio(rawAudioData, layer.fftSize);

      // 2. Update Uniforms (Common)
      if (mesh.material instanceof THREE.ShaderMaterial) {
        const uniforms = mesh.material.uniforms;
        uniforms.u_time.value += layer.delta * layer.waveSpeed; // Consider using a proper clock delta
        uniforms.u_delta.value = layer.delta; // Update delta if needed by shader
        // --- Update audio uniforms ---
        uniforms.u_bassEnergy.value = processedAudio.bassEnergy;
        uniforms.u_midEnergy.value = processedAudio.midEnergy;
        uniforms.u_highEnergy.value = processedAudio.highEnergy;
        uniforms.u_averageEnergy.value = processedAudio.averageEnergy;
        // --- Update dynamic layer properties ---
        uniforms.u_reactivity.value = layer.reactivity;
        uniforms.u_waveAmplitude.value = layer.waveAmplitude;
        uniforms.u_noiseAmount.value = layer.noiseAmount;
        uniforms.u_use3D.value = layer.use3D ? 1.0 : 0.0; // Update boolean uniform
        uniforms.u_colorMode.value = [
          'gradient',
          'frequency',
          'spectrum',
          'single',
        ].indexOf(layer.colorMode); // Update mode
        uniforms.u_glowStrength.value = layer.glowStrength;
        uniforms.u_pointSize.value = layer.pointSize;

        // --- Update Waveform/Frequency Textures ---
        // Normalize and update frequency data texture
        const freqDataArray = uniforms.u_frequencyData.value as Float32Array;
        for (let i = 0; i < processedAudio.frequencies.length; i++) {
          freqDataArray[i] = processedAudio.frequencies[i] / 255.0; // Normalize
        }
        uniforms.u_frequencyData.value = freqDataArray; // Reassign if needed, or mark needsUpdate if Texture

        // Normalize and update waveform data texture (if used by shader)
        // Example: Normalize waveform data for u_waveData uniform
        const waveDataArray = uniforms.u_waveData.value as Float32Array;
        const neededLength = Math.min(
          waveDataArray.length,
          processedAudio.waveform.length
        );
        for (let i = 0; i < neededLength; i++) {
          waveDataArray[i] = processedAudio.waveform[i] / 128.0 - 1.0; // Normalize -1 to 1
        }
        uniforms.u_waveData.value = waveDataArray;
      } else if (
        mesh.material instanceof THREE.LineBasicMaterial &&
        layer.visualStyle === 'smooth'
      ) {
        // Update non-shader material properties if needed (e.g., color for smooth line)
        const energy = processedAudio.averageEnergy; // Example: use average energy
        const color = new THREE.Color(layer.primaryColor).lerp(
          new THREE.Color(layer.secondaryColor),
          energy
        );
        mesh.material.color.copy(color);
        // mesh.material.linewidth = layer.lineWidth; // Requires LineMaterial addon usually
      }

      // 3. Update Geometry / Instance Attributes
      switch (layer.visualStyle) {
        case 'bars':
          if (mesh instanceof THREE.InstancedMesh) {
            const dummy = new THREE.Object3D(); // Reusable helper object
            const barWidth = layer.width / layer.resolution;
            const freqData = processedAudio.frequencies; // Use processed data
            const binCount = freqData.length;

            for (let i = 0; i < layer.resolution; i++) {
              const freqIndex = Math.min(
                binCount - 1,
                Math.floor((i / layer.resolution) * binCount)
              );
              const freqValue = freqData[freqIndex] / 255.0; // Normalize 0-1

              const height = Math.max(
                0.05,
                freqValue * layer.height * layer.reactivity * 5.0
              ); // Calculate height
              const x = (i / (layer.resolution - 1) - 0.5) * layer.width;
              const y = height / 2.0; // Position at base

              dummy.position.set(x, y, 0);
              dummy.scale.set(
                barWidth * layer.barWidthScale,
                height, // Scale Y by height
                layer.depth * (layer.use3D ? 1.0 + freqValue * 0.5 : 1.0) // Optional 3D depth scaling
              );
              dummy.updateMatrix();
              mesh.setMatrixAt(i, dummy.matrix);
            }
            mesh.instanceMatrix.needsUpdate = true;
          }
          break;

        case 'dots':
        case 'line':
          if (mesh instanceof THREE.Points) {
            const positions = mesh.geometry.attributes.position
              .array as Float32Array;
            const colors = mesh.geometry.attributes.color.array as Float32Array; // Get color buffer
            const customSizes = mesh.geometry.attributes.customSize
              .array as Float32Array; // Get size buffer
            const time =
              mesh.material instanceof THREE.ShaderMaterial
                ? mesh.material.uniforms.u_time.value
                : 0; // Get time if shader
            const waveData = processedAudio.waveform; // Use processed waveform
            const waveLen = waveData.length;

            // Pre-calculate common values
            const amp = layer.waveAmplitude * layer.reactivity;
            const depthAmp = layer.depthAmplitude;
            const use3D = layer.use3D;

            const tempColor = new THREE.Color(); // Reusable color object

            for (let i = 0; i < layer.resolution; i++) {
              const idx = i * 3;
              const waveIndex = Math.min(
                waveLen - 1,
                Math.floor((i / layer.resolution) * waveLen)
              );
              const waveValue = waveData[waveIndex] / 128.0 - 1.0; // Normalize -1 to 1

              const x = positions[idx]; // Get base X
              let y = waveValue * amp;
              let z = 0;

              // Add noise/secondary waves if desired (could also be done in shader)
              const noise = Math.sin(x * 0.5 + time) * 0.1 * layer.noiseAmount;
              y += noise;

              if (use3D) {
                z = Math.sin(x * 2.0 + time) * depthAmp;
              }

              positions[idx + 1] = y;
              positions[idx + 2] = z;

              // --- Example: Calculate vertex colors dynamically ---
              // Simplified color logic here, shader handles complex modes
              tempColor.lerpColors(
                new THREE.Color(layer.primaryColor),
                new THREE.Color(layer.secondaryColor),
                (y / amp) * 0.5 + 0.5
              );
              colors[idx] = tempColor.r;
              colors[idx + 1] = tempColor.g;
              colors[idx + 2] = tempColor.b;

              // --- Example: Calculate custom size factor ---
              customSizes[i] = 1.0 + Math.abs(waveValue) * 0.5; // Example: bigger size for higher amplitude
            }
            mesh.geometry.attributes.position.needsUpdate = true;
            mesh.geometry.attributes.color.needsUpdate = true;
            mesh.geometry.attributes.customSize.needsUpdate = true;
          }
          break;

        case 'smooth': // Update Line geometry positions
          if (mesh instanceof THREE.Line) {
            const positions = mesh.geometry.attributes.position
              .array as Float32Array;
            const time = mesh.userData.lastUpdateTime ?? 0; // Get time approximation if needed
            const waveData = processedAudio.waveform;
            const waveLen = waveData.length;
            const amp = layer.waveAmplitude * layer.reactivity;
            const depthAmp = layer.depthAmplitude;
            const use3D = layer.use3D;

            for (let i = 0; i < layer.resolution; i++) {
              const idx = i * 3;
              const waveIndex = Math.min(
                waveLen - 1,
                Math.floor((i / layer.resolution) * waveLen)
              );
              const waveValue = waveData[waveIndex] / 128.0 - 1.0; // Normalize -1 to 1

              const x = positions[idx];
              let y = waveValue * amp;
              let z = 0;

              // Add noise/secondary waves if desired
              const noise = Math.sin(x * 0.5 + time) * 0.1 * layer.noiseAmount;
              y += noise;

              if (use3D) {
                z = Math.sin(x * 2.0 + time) * depthAmp;
              }

              positions[idx + 1] = y;
              positions[idx + 2] = z;
            }
            mesh.geometry.attributes.position.needsUpdate = true;
          }
          break;

        case 'ribbons':
          // Geometry updated via vertex shader, only need to update uniforms (done above)
          break;
      }

      // 4. Apply Rotation (To Primary Mesh)
      if (layer.useRotation) {
        const rotationSpeed = layer.rotationSpeed * 0.1; // Slow down default rotation
        const audioInfluence =
          (processedAudio.bassEnergy * 0.6 + processedAudio.midEnergy * 0.4) *
          layer.reactivity;
        const time =
          mesh.material instanceof THREE.ShaderMaterial
            ? mesh.material.uniforms.u_time.value
            : performance.now() * 0.001;

        // Apply rotation using quaternion for smoother results potentially
        // mesh.rotation.y = Math.sin(time * 0.5) * rotationSpeed;
        // mesh.rotation.x = Math.cos(time * 0.3) * rotationSpeed * 0.5;
        // mesh.rotation.z += Math.sin(time) * audioInfluence * 0.01; // Avoid += on rotation

        // Example using quaternion - smoother accumulation
        const rotY = Math.sin(time * 0.5) * rotationSpeed;
        const rotX = Math.cos(time * 0.3) * rotationSpeed * 0.5;
        const rotZ =
          Math.sin(time * 0.8) * audioInfluence * rotationSpeed * 2.0; // Audio influences Z the most
        mesh.rotation.set(rotX, rotY, rotZ, 'XYZ'); // Set directly
      } else {
        // Reset rotation if not used
        mesh.rotation.set(0, 0, 0);
      }

      // 5. Camera Perspective Adjustment (Optional - Use with caution)
      if (layer.usePerspective) {
        const time =
          mesh.material instanceof THREE.ShaderMaterial
            ? mesh.material.uniforms.u_time.value
            : performance.now() * 0.001;
        const targetZ =
          layer.depth * 2 +
          Math.sin(time * layer.pulseSpeed * 0.5) * layer.depthAmplitude * 2.0;
        // Smoothly interpolate camera position instead of setting directly
        camera.position.z += (targetZ - camera.position.z) * 0.05;
        camera.lookAt(mesh.position); // Ensure camera keeps looking at the object center
        // No need for camera.updateProjectionMatrix() unless FOV/aspect/near/far changes
      }

      // Update mesh user data if needed
      mesh.userData.lastUpdateTime =
        mesh.material instanceof THREE.ShaderMaterial
          ? mesh.material.uniforms.u_time.value
          : performance.now() * 0.001;
    })
);
