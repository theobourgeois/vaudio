import * as THREE from 'three';

type ObjectId = number | string;
type Transform = {
    x: number;
    y: number;
    z: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
};
type VisualizerObject = {
    domain: 'frequency' | 'time';
} & Transform;
type IdToMesh = Map<ObjectId, THREE.Object3D>;
type RenderArgs<T> = {
    id: ObjectId;
    props: T;
    idToMesh: IdToMesh;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    audioData: Uint8Array;
    delta: number;
};
type RenderFn<T extends VisualizerObject> = (args: RenderArgs<T>) => Promise<void> | void;
type TriggerRenderFn = <T extends VisualizerObject>(id: ObjectId, renderFn: RenderFn<T>, props: T) => void;

interface RenderObjectConfigState<TDefaults extends Record<string, unknown> = Record<string, unknown>, // User-defined defaults
TFullConfig extends VisualizerObject = VisualizerObject, // Combined defaults + VisualizerObject
TGeom extends THREE.BufferGeometry | undefined = undefined, TMat extends THREE.Material | undefined = undefined, TObj extends THREE.Object3D = THREE.Mesh> {
    defaultsFn?: () => TDefaults;
    geometryFn?: (args: RenderArgs<TFullConfig>) => MaybePromise<TGeom>;
    materialFn?: (args: RenderArgs<TFullConfig>) => MaybePromise<TMat>;
    createObjectFn?: (args: RenderArgs<TFullConfig>) => MaybePromise<TObj>;
    renderFn?: (args: RenderArgs<TFullConfig> & {
        mesh: TObj;
    }) => void;
    startFn?: (args: RenderArgs<TFullConfig> & {
        mesh: TObj;
    }) => void;
}
type MaybePromise<T> = T | Promise<T>;
type InferObjectType<TGeom extends THREE.BufferGeometry | undefined, TMat extends THREE.Material | undefined> = TGeom extends THREE.BufferGeometry ? TMat extends THREE.Material ? THREE.Mesh<TGeom, TMat> : THREE.Mesh<TGeom> : TMat extends THREE.Material ? THREE.Mesh<THREE.BufferGeometry, TMat> : THREE.Mesh;
declare class VisualizerObjectBuilder<TDefaults extends Record<string, unknown>, TFullConfig extends VisualizerObject, TGeom extends THREE.BufferGeometry | undefined, TMat extends THREE.Material | undefined, TObj extends THREE.Object3D> {
    private config;
    private constructor();
    static create(): VisualizerObjectBuilder<Record<string, unknown>, VisualizerObject, undefined, undefined, THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.Material | THREE.Material[], THREE.Object3DEventMap>>;
    /**
     * Defines the default properties for the object.
     * These properties will be merged with the base VisualizerObject properties.
     *
     * @param fn - Function that returns an object with default properties
     * @returns The builder instance for method chaining
     *
     * @example
     * ```tsx
     * .defaults(() => ({
     *   size: 1,
     *   color: 'red',
     *   customProperty: 'value'
     * }))
     * ```
     */
    defaults<TNewDefaults extends Record<string, unknown>>(fn: () => TNewDefaults): VisualizerObjectBuilder<TNewDefaults, TNewDefaults & VisualizerObject, TGeom, TMat, TObj>;
    /**
     * Defines the geometry for the object.
     *
     * @param fn - Function that returns a THREE.BufferGeometry
     * @returns The builder instance for method chaining
     *
     * @example
     * ```tsx
     * .geometry(({ layer }) => new THREE.BoxGeometry(layer.size))
     * ```
     */
    geometry<TNewGeom extends THREE.BufferGeometry>(fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewGeom>): VisualizerObjectBuilder<TDefaults, TFullConfig, TNewGeom, TMat, InferObjectType<TNewGeom, TMat>>;
    /**
     * Defines the material for the object.
     *
     * @param fn - Function that returns a THREE.Material
     * @returns The builder instance for method chaining
     *
     * @example
     * ```tsx
     * .material(({ layer }) => new THREE.MeshStandardMaterial({ color: layer.color }))
     * ```
     */
    material<TNewMat extends THREE.Material>(fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewMat>): VisualizerObjectBuilder<TDefaults, TFullConfig, TGeom, TNewMat, InferObjectType<TGeom, TNewMat>>;
    shader<TNewMat extends THREE.Material>(fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewMat>): VisualizerObjectBuilder<TDefaults, TFullConfig, TGeom, TNewMat, InferObjectType<TGeom, TNewMat>>;
    /**
     * Creates a custom object, overriding the default geometry/material creation.
     *
     * @param fn - Function that returns a THREE.Object3D
     * @returns The builder instance for method chaining
     *
     * @example
     * ```tsx
     * .createObject(({ layer }) => new THREE.Group())
     * ```
     */
    createObject<TNewObj extends THREE.Object3D>(fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewObj>): VisualizerObjectBuilder<TDefaults, TFullConfig, TGeom, TMat, TNewObj>;
    /**
     * Defines initialization logic that runs only once when the object is first created.
     *
     * @param fn - Function that performs one-time initialization
     * @returns The builder instance for method chaining
     *
     * @example
     * ```tsx
     * .start(({ mesh, layer, scene }) => {
     *   mesh.renderOrder = 1000;
     *   const light = new THREE.PointLight(layer.color, 1.0, 5.0);
     *   mesh.add(light);
     * })
     * ```
     */
    start(fn: (args: RenderArgs<TFullConfig> & {
        mesh: TObj;
    }) => void): VisualizerObjectBuilder<TDefaults, TFullConfig, TGeom, TMat, TObj>;
    /**
     * Defines custom rendering logic.
     *
     * @param fn - Function that handles custom rendering
     * @returns The builder instance for method chaining
     *
     * @example
     * ```tsx
     * .render(({ mesh, layer, audioData }) => {
     *   // Custom rendering logic
     * })
     * ```
     */
    render(fn?: (args: RenderArgs<TFullConfig> & {
        mesh: TObj;
    }) => void): {
        getRenderFn: () => RenderFn<TFullConfig>;
        getDefaults: () => TFullConfig;
        getConfig: () => RenderObjectConfigState<TDefaults, TFullConfig, TGeom, TMat, TObj>;
    };
}
/**
 * Creates a new render object builder for creating custom audio visualization objects.
 * This is the main entry point for creating custom visualization components.
 *
 * @example
 * ```tsx
 * const MyObject = renderObject()
 *   .defaults(() => ({ size: 1 }))
 *   .geometry(({ layer }) => new THREE.BoxGeometry(layer.size))
 *   .material(({ layer }) => new THREE.MeshStandardMaterial({ color: layer.color }))
 *   .autoTransform()
 *   .asVisualizerComponent();
 * ```
 */
declare function createVisualizerObject(): VisualizerObjectBuilder<Record<string, unknown>, VisualizerObject, undefined, undefined, THREE.Mesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.Material | THREE.Material[], THREE.Object3DEventMap>>;

declare function defaultTransform(): Transform;
declare function defaultVisualizerObject(): VisualizerObject;

type CameraOptions = {
    fov?: number;
    near?: number;
    far?: number;
    x?: number;
    y?: number;
    z?: number;
};
declare class VisualizerStore {
    private scene;
    private camera;
    private renderer;
    private renderFns;
    private idToMesh;
    private container;
    private fps;
    private rafId;
    private analyser;
    private dataArray;
    constructor(container: HTMLElement);
    init(options: {
        backgroundColor?: string;
        cameraOptions?: CameraOptions;
        fps?: number;
    }): void;
    resize(width: number, height: number): void;
    setAudioElement(audioEl: HTMLAudioElement): void;
    animate: () => void;
    registerRenderFn(id: ObjectId, renderFn: RenderFn<VisualizerObject>, layer: VisualizerObject): void;
    removeObject(id: ObjectId): void;
    stop(): void;
    getScene(): THREE.Scene;
    getCamera(): THREE.PerspectiveCamera | null;
    getRenderer(): THREE.WebGLRenderer;
    getIdToMesh(): Map<ObjectId, THREE.Object3D<THREE.Object3DEventMap>>;
    renderOnce(): void;
}

export { type IdToMesh, type ObjectId, type RenderArgs, type RenderFn, type Transform, type TriggerRenderFn, type VisualizerObject, VisualizerObjectBuilder, VisualizerStore, createVisualizerObject, defaultTransform, defaultVisualizerObject };
