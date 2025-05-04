import { createVisualizerObject } from '../src/create-visualizer-object';
import * as THREE from 'three';
import { VisualizerObject } from '../src/types';

describe('createVisualizerObject', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let idToObjectMap: Map<string, THREE.Object3D>;
  let audioData: Uint8Array;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    idToObjectMap = new Map();
    audioData = new Uint8Array(256);
  });

  it('should create a visualizer object', () => {
    const visualizerObject =
      createVisualizerObject()
        .defaults(() => ({
          color: '#000000',
          opacity: 1,
        }))
        .object(({ props }) => {
          return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: props.color }));
        }).render(({ object }) => {
          object.position.set(0, 0, 0);
        });

    expect(visualizerObject).toBeDefined();
  });
});