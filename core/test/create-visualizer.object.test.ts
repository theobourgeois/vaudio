import { createVisualizerObject } from '../src/create-visualizer-object';
import * as THREE from 'three';
import { VisualizerObject } from '../src/types';

describe('createVisualizerObject', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let idToMesh: Map<string, THREE.Object3D>;
  let audioData: Uint8Array;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    idToMesh = new Map();
    audioData = new Uint8Array(256);
  });

  it('should not be able to leave out geometry', () => {
    expect(() => {
      createVisualizerObject()
        .defaults(() => ({
          domain: 'frequency',
          x: 0,
          y: 0,
          z: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
        }))
        .material(() => new THREE.MeshStandardMaterial({ color: 0x00ff00 }))
        .render();
    }).toThrow('createVisualizerObject error: .geometry() or .createObject() must be called before .render()');
  });

  it('should not be able to leave out material', () => {
    expect(() => {
      createVisualizerObject()
        .defaults(() => ({
          domain: 'frequency',
          x: 0,
          y: 0,
          z: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
        }))
        .geometry(() => new THREE.BoxGeometry(1, 1, 1))
        .render();
    }).toThrow('createVisualizerObject error: .material() or .createObject() must be called before .render()');
  });

  it('should create a visualizer object with custom geometry and material', () => {
    const visualizer = createVisualizerObject()
      .defaults(() => ({
        domain: 'frequency',
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      }))
      .geometry(() => new THREE.BoxGeometry(1, 1, 1))
      .material(() => new THREE.MeshStandardMaterial({ color: 0x00ff00 }))
      .render();

    expect(visualizer).toBeDefined();
  });

  it('should create a visualizer object with custom object creation', () => {
    const visualizer = createVisualizerObject()
      .defaults(() => ({
        domain: 'frequency',
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      }))
      .createObject(({ props }) => {
        const group = new THREE.Group();
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(props.scaleX, props.scaleY, props.scaleZ),
          new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        group.add(mesh);
        return group;
      })
      .render();

    expect(visualizer).toBeDefined();
  });

  it('should execute start function when object is created', async () => {
    const startSpy = jest.fn();

    const visualizer = createVisualizerObject()
      .defaults(() => ({
        domain: 'frequency',
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      }))
      .geometry(() => new THREE.BoxGeometry(1, 1, 1))
      .material(() => new THREE.MeshStandardMaterial({ color: 0x00ff00 }))
      .start(startSpy)
      .render();

    const renderArgs = {
      id: 'test-id',
      props: {
        domain: 'frequency',
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      } as VisualizerObject,
      idToMesh,
      scene,
      camera,
      audioData,
      delta: 0,
    };

    const renderFn = visualizer.getRenderFn();
    await renderFn(renderArgs);
    expect(startSpy).toHaveBeenCalled();
  });

  it('should execute render function on each frame', async () => {
    const renderSpy = jest.fn();

    const visualizer = createVisualizerObject()
      .defaults(() => ({
        domain: 'frequency',
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      }))
      .geometry(() => new THREE.BoxGeometry(1, 1, 1))
      .material(() => new THREE.MeshStandardMaterial({ color: 0x00ff00 }))
      .render(renderSpy);

    const renderArgs = {
      id: 'test-id',
      props: {
        domain: 'frequency',
        x: 0,
        y: 0,
        z: 0,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
      } as VisualizerObject,
      idToMesh,
      scene,
      camera,
      audioData,
      delta: 0,
    };

    const renderFn = visualizer.getRenderFn();
    await renderFn(renderArgs);
    expect(renderSpy).toHaveBeenCalled();
  });
});