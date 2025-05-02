import * as THREE from 'three';
import { createVisualizerObject } from '@vaudio/core';
import { Font, FontLoader, TextGeometry } from 'three/examples/jsm/Addons.js';
import { withReact } from '@vaudio/react';

export type Text = {
  text: string;
  size: number;
  depth: number;
  font: keyof typeof fontMap;
  color: string;
  opacity: number;
};

const fontPath = 'https://threejs.org/examples/fonts/';
const fontMap = {
  helvetiker: fontPath + 'helvetiker_regular.typeface.json',
  optimer: fontPath + 'optimer_regular.typeface.json',
  gentilis: fontPath + 'gentilis_regular.typeface.json',
  droid: fontPath + 'droid/droid_serif_regular.typeface.json',
  droid_bold: fontPath + 'droid/droid_serif_bold.typeface.json',
} as const;

const fontCache: Partial<Record<keyof typeof fontMap, Font>> = {};

async function getFont(name: keyof typeof fontMap): Promise<Font> {
  if (fontCache[name]) return fontCache[name]!;

  const fontLoader = new FontLoader();
  const font = await new Promise<Font>((resolve) =>
    fontLoader.load(fontMap[name], resolve)
  );

  fontCache[name] = font;
  return font;
}

export const Text = withReact(
  createVisualizerObject()
    .defaults<Text>(() => ({
      text: 'Hello',
      size: 1,
      depth: 0.1,
      font: 'helvetiker',
      color: '#ffffff',
      opacity: 1,
    }))
    .geometry(async ({ props: layer }) => {
      const fontLoader = new FontLoader();
      const font: Font = await new Promise((resolve) => {
        fontLoader.load(fontMap[layer.font], (font) => {
          resolve(font);
        });
      });
      if (!font) {
        throw new Error('Font not loaded');
      }
      return new TextGeometry(layer.text, {
        font,
        size: layer.size,
        depth: layer.depth,
      });
    })
    .material(({ props: layer }) => {
      return new THREE.MeshStandardMaterial({
        color: layer.color,
        opacity: layer.opacity,
        transparent: layer.opacity < 1,
      });
    })
    .render(async ({ mesh, props: layer }) => {
      const params = mesh.geometry.parameters.options;
      const needsUpdate =
        mesh.userData.text !== layer.text ||
        params.size !== layer.size ||
        params.depth !== layer.depth ||
        params.font?.data?.familyName !== layer.font;

      if (needsUpdate) {
        mesh.geometry.dispose();

        const font = await getFont(layer.font);

        mesh.geometry = new TextGeometry(layer.text, {
          font,
          size: layer.size,
          depth: layer.depth,
        });
        mesh.userData.text = layer.text;
      }

      mesh.material.color.set(layer.color);
      mesh.material.opacity = layer.opacity;
    })
);
