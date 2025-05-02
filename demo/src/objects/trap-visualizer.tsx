import { createVisualizerObject } from '@vaudio/core';
import { withReact } from '@vaudio/react';
import { AudioUtils, SmoothedValue } from '@vaudio/utils';
import * as THREE from 'three';

export const CircularBars = withReact(
  createVisualizerObject()
    .defaults(() => ({
      barCount: 380, // Number of bars around the circle
      radius: 2, // Radius of the circle
      minHeight: 0.2, // Minimum height of bars
      maxHeight: 2.5, // Maximum height of bars
      barWidth: 0.1, // Width of each bar
      color: '#00ffff', // Primary color (cyan)
      accentColor: '#ff00ff', // Secondary color (magenta)
      glowIntensity: 1.8, // Intensity of the glow effect
      rotationSpeed: 0.1, // Speed of rotation
    }))
    .geometry(() => {
      // Create an empty geometry to be filled with bars
      return new THREE.BufferGeometry();
    })
    .material(({ props }) => {
      return new THREE.MeshBasicMaterial({
        color: new THREE.Color(props.color),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
    })
    .start(({ mesh, props }) => {
      if (!(mesh.material instanceof THREE.MeshBasicMaterial)) return;

      // Create bars around a circle
      const { barCount, radius, barWidth } = props;
      const positions = [];
      const colors = [];
      const indices = [];

      const mainColor = new THREE.Color(props.color);
      const accentColor = new THREE.Color(props.accentColor);

      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Calculate bar vertices
        const halfWidth = barWidth / 2;

        // Inner vertices
        const v0x = x - Math.sin(angle) * halfWidth;
        const v0z = z + Math.cos(angle) * halfWidth;
        const v1x = x + Math.sin(angle) * halfWidth;
        const v1z = z - Math.cos(angle) * halfWidth;

        // Add vertices for inner radius
        positions.push(v0x, 0, v0z);
        positions.push(v1x, 0, v1z);

        // Add vertices for outer radius (will be adjusted in render)
        positions.push(v0x, props.minHeight, v0z);
        positions.push(v1x, props.minHeight, v1z);

        // Calculate color gradient around the circle
        const colorMix = Math.sin(angle * 3) * 0.5 + 0.5;
        const color = new THREE.Color().lerpColors(
          mainColor,
          accentColor,
          colorMix
        );

        // Add colors for all vertices
        for (let j = 0; j < 4; j++) {
          colors.push(color.r, color.g, color.b);
        }

        // Create faces (two triangles for each bar)
        const baseIndex = i * 4;
        indices.push(
          baseIndex,
          baseIndex + 1,
          baseIndex + 2,
          baseIndex + 1,
          baseIndex + 3,
          baseIndex + 2
        );
      }

      // Add attributes to geometry
      const geometry = mesh.geometry as THREE.BufferGeometry;
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(colors, 3)
      );
      geometry.setIndex(indices);

      // Enable vertex colors
      mesh.material.vertexColors = true;

      // Create smoothed values for animation
      mesh.userData.smoothedValues = Array(props.barCount)
        .fill(0)
        .map(() => new SmoothedValue(0.2));
      mesh.userData.bassSmoothed = new SmoothedValue(0.15);
      mesh.userData.rotationSmoothed = new SmoothedValue(0.1);
    })
    .render(({ mesh, audioData, props, delta }) => {
      if (
        !(mesh.geometry instanceof THREE.BufferGeometry) ||
        !(mesh.material instanceof THREE.MeshBasicMaterial)
      )
        return;

      const { barCount, minHeight, maxHeight } = props;
      const geometry = mesh.geometry;

      // Get audio data using AudioUtils
      const frequencyData = audioData;
      const bassEnergy = AudioUtils.getBassEnergy(frequencyData);

      // Smooth the bass for glow effect
      const bassSmoothed = mesh.userData.bassSmoothed.update(bassEnergy);

      // Update rotation based on energy
      const rotationSpeed = mesh.userData.rotationSmoothed.update(
        props.rotationSpeed * (1 + bassEnergy * 0.5)
      );
      mesh.rotation.y += delta * rotationSpeed;

      // Get the position attribute for updating
      const positions = geometry.getAttribute('position');

      // Update the heights of each bar based on frequency data
      for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency data index
        const frequencyIndex = Math.floor(
          (i / barCount) * frequencyData.length * 0.75
        );
        const normalizedValue = frequencyData[frequencyIndex] / 255;

        // Apply smoothing
        const smoothedValue =
          mesh.userData.smoothedValues[i].update(normalizedValue);

        // Calculate height with bass boost
        const heightBoost = bassEnergy * 0.5;
        const barHeight =
          minHeight +
          smoothedValue * (maxHeight - minHeight) * (1 + heightBoost);

        // Apply height to outer vertices (inner vertices stay at y=0)
        const baseIndex = i * 4;

        // Update outer vertices with new height
        positions.setY(baseIndex + 2, barHeight);
        positions.setY(baseIndex + 3, barHeight);
      }

      // Let Three.js know to update the positions
      positions.needsUpdate = true;

      // Update opacity based on bass for glow effect
      mesh.material.opacity = 0.7 + bassSmoothed * 0.3;

      // Update glow intensity through emissive property
      mesh.material.color.setRGB(
        1 + bassSmoothed * props.glowIntensity,
        1 + bassSmoothed * props.glowIntensity * 0.7,
        1 + bassSmoothed * props.glowIntensity * 0.9
      );
    })
);
