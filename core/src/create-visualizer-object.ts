import * as THREE from 'three';
import { RenderArgs, RenderFn, VisualizerObject } from './types'; // Adjust path as needed
import { defaultVisualizerObject } from './defaults'; // Adjust path as needed
import { awaitMaybe } from './await-maybe'; // Adjust path as needed

// Keep track of the configuration state and types as they are defined
export interface RenderObjectConfigState<
  TDefaults extends Record<string, unknown> = Record<string, unknown>, // User-defined defaults
  TFullConfig extends VisualizerObject = VisualizerObject, // Combined defaults + VisualizerObject
  TGeom extends THREE.BufferGeometry | undefined = undefined,
  TMat extends THREE.Material | undefined = undefined,
  TObj extends THREE.Object3D = THREE.Mesh // Default Object3D type
> {
  defaultsFn?: () => TDefaults;
  geometryFn?: (args: RenderArgs<TFullConfig>) => MaybePromise<TGeom>;
  materialFn?: (args: RenderArgs<TFullConfig>) => MaybePromise<TMat>;
  createObjectFn?: (args: RenderArgs<TFullConfig>) => MaybePromise<TObj>;
  renderFn?: (args: RenderArgs<TFullConfig> & { mesh: TObj }) => void;
  startFn?: (args: RenderArgs<TFullConfig> & { mesh: TObj }) => void;
}

type MaybePromise<T> = T | Promise<T>;

// Helper to infer the Mesh type based on Geometry and Material
// If createObject is used, TObj passed to RenderObjectBuilder takes precedence.
type InferObjectType<
  TGeom extends THREE.BufferGeometry | undefined,
  TMat extends THREE.Material | undefined
> = TGeom extends THREE.BufferGeometry
  ? TMat extends THREE.Material
  ? THREE.Mesh<TGeom, TMat> // Both defined
  : THREE.Mesh<TGeom> // Only Geometry
  : TMat extends THREE.Material
  ? THREE.Mesh<THREE.BufferGeometry, TMat> // Only Material (use default geom)
  : THREE.Mesh; // Neither defined (fallback to basic Mesh)

// --- Builder Class ---

export class VisualizerObjectBuilder<
  // These generics track the *currently known* types
  TDefaults extends Record<string, unknown>,
  TFullConfig extends VisualizerObject,
  TGeom extends THREE.BufferGeometry | undefined,
  TMat extends THREE.Material | undefined,
  TObj extends THREE.Object3D
> {
  // Store the configuration functions
  private config: RenderObjectConfigState<
    TDefaults,
    TFullConfig,
    TGeom,
    TMat,
    TObj
  >;

  // Private constructor to be called by static method or internal methods
  private constructor(
    config: RenderObjectConfigState<TDefaults, TFullConfig, TGeom, TMat, TObj>
  ) {
    this.config = config;
  }

  // Static method to start the builder without initial types
  static create() {
    // Start with broad/undefined types
    return new VisualizerObjectBuilder<
      Record<string, unknown>, // TDefaults initially unknown
      VisualizerObject, // TFullConfig starts as base
      undefined, // TGeom starts undefined
      undefined, // TMat starts undefined
      THREE.Mesh // TObj defaults to Mesh
    >({});
  }

  // --- Builder Methods ---

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
  defaults<TNewDefaults extends Record<string, unknown>>(
    fn: () => TNewDefaults
  ): VisualizerObjectBuilder<
    TNewDefaults,
    TNewDefaults & VisualizerObject,
    TGeom,
    TMat,
    TObj
  > {
    // Capture TNewDefaults, merge with VisualizerObject for TFullConfig
    type TNewFullConfig = TNewDefaults & VisualizerObject;
    const newConfig: RenderObjectConfigState<
      TNewDefaults,
      TNewFullConfig,
      TGeom,
      TMat,
      TObj
    > = {
      ...this.config,
      defaultsFn: fn,
    } as any;
    // Return a new builder instance with the refined TDefaults and TFullConfig types
    return new VisualizerObjectBuilder(newConfig);
  }

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
  geometry<TNewGeom extends THREE.BufferGeometry>(
    fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewGeom>
  ): VisualizerObjectBuilder<
    TDefaults,
    TFullConfig,
    TNewGeom,
    TMat,
    InferObjectType<TNewGeom, TMat>
  > {
    // Capture TNewGeom, infer the Object type based on current Geom/Mat
    type NewObjType = InferObjectType<TNewGeom, TMat>;
    const newConfig: RenderObjectConfigState<
      TDefaults,
      TFullConfig,
      TNewGeom,
      TMat,
      NewObjType
    > = {
      ...this.config,
      geometryFn: fn,
    } as any;
    // Return new builder with refined TGeom and potentially TObj
    return new VisualizerObjectBuilder(newConfig as any) as any;
  }

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
  material<TNewMat extends THREE.Material>(
    fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewMat>
  ): VisualizerObjectBuilder<
    TDefaults,
    TFullConfig,
    TGeom,
    TNewMat,
    InferObjectType<TGeom, TNewMat>
  > {
    // Capture TNewMat, infer the Object type based on current Geom/Mat
    type NewObjType = InferObjectType<TGeom, TNewMat>;
    const newConfig: RenderObjectConfigState<
      TDefaults,
      TFullConfig,
      TGeom,
      TNewMat,
      NewObjType
    > = {
      ...this.config,
      materialFn: fn as any, // Cast needed as TMat changes
    } as any;
    // Return new builder with refined TMat and potentially TObj
    return new VisualizerObjectBuilder(newConfig as any) as any;
  }

  // Alias for material
  shader<TNewMat extends THREE.Material>(
    fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewMat>
  ): VisualizerObjectBuilder<
    TDefaults,
    TFullConfig,
    TGeom,
    TNewMat,
    InferObjectType<TGeom, TNewMat>
  > {
    // Just call material internally
    return this.material(fn);
  }

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
  createObject<TNewObj extends THREE.Object3D>(
    fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewObj>
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TGeom, TMat, TNewObj> {
    // Capture TNewObj. This *overrides* any inference from geometry/material.
    const newConfig: RenderObjectConfigState<
      TDefaults,
      TFullConfig,
      TGeom,
      TMat,
      TNewObj
    > = {
      ...this.config,
      createObjectFn: fn,
    } as any;
    // Return new builder with explicitly set TObj
    return new VisualizerObjectBuilder(newConfig);
  }

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
  start(
    fn: (args: RenderArgs<TFullConfig> & { mesh: TObj }) => void
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TGeom, TMat, TObj> {
    this.config.startFn = fn;
    return this; // Type doesn't change here
  }

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
  render(fn?: (args: RenderArgs<TFullConfig> & { mesh: TObj }) => void) {
    // Runtime check: Ensure enough info to create an object
    if (!this.config.createObjectFn && !this.config.geometryFn) {
      throw new Error(
        'renderObject error: .geometry() or .createObject() must be called before .render()'
      );
    }
    if (!this.config.createObjectFn && !this.config.materialFn) {
      throw new Error(
        'renderObject error: .material() or .createObject() must be called before .render()'
      );
    }

    this.config.renderFn = fn;

    // --- Define the Actual Render Function ---
    const renderFn: RenderFn<TFullConfig> = async (args) => {
      let obj = args.idToMesh.get(args.id) as TObj | undefined;

      if (!obj) {
        // Create object if it doesn't exist
        if (this.config.createObjectFn) {
          obj = await awaitMaybe(this.config.createObjectFn(args));
        } else {
          // We checked geometryFn and materialFn exist above
          const geometry = await awaitMaybe(this.config.geometryFn?.(args));
          const material = await awaitMaybe(this.config.materialFn?.(args));

          // Type assertion needed here because TS can't fully guarantee the
          // InferObjectType logic perfectly matches the runtime path,
          // especially with createObjectFn potentially overriding it earlier.
          // TObj *should* be correct based on the builder state.
          // @ts-expect-error There's a type mismatch here, but we know it's safe.
          obj = new THREE.Mesh(geometry, material) as TObj;
        }

        args.scene.add(obj);
        args.idToMesh.set(args.id, obj);
        if ('castShadow' in obj && typeof obj.castShadow === 'boolean') {
          obj.castShadow = true;
        }
        if ('receiveShadow' in obj && typeof obj.receiveShadow === 'boolean') {
          obj.receiveShadow = true;
        }

        // Run start function only once when object is created
        if (this.config.startFn) {
          this.config.startFn({ ...args, mesh: obj });
        }
      }

      // Default transform behavior (apply basic position/scale/rotation)
      obj.position.set(args.props.x, args.props.y, args.props.z);
      obj.scale.set(args.props.scaleX, args.props.scaleY, args.props.scaleZ);
      obj.rotation.set(
        args.props.rotationX,
        args.props.rotationY,
        args.props.rotationZ
      );

      // Execute the user-provided render function
      this.config.renderFn?.({ ...args, mesh: obj });
    };

    // We need the full default object including VisualizerObject props
    const finalDefaults = (): TFullConfig => ({
      ...(defaultVisualizerObject() as any),
      ...(this.config.defaultsFn?.() || {}),
    });

    return {
      getRenderFn: () => renderFn,
      getDefaults: () => finalDefaults(),
      getConfig: () => this.config,
    };
  }
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
export function createVisualizerObject() {
  return VisualizerObjectBuilder.create();
}
