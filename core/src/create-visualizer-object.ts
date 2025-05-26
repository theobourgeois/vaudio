import * as THREE from 'three';
import { RenderArgs, RenderFn, VisualizerObject } from './types';
import { defaultVisualizerObject } from './defaults';
import { awaitMaybe } from './await-maybe';

/**
 * Type representing a value that can be either a direct value or a Promise
 * @template T - The type of the value
 */
type MaybePromise<T> = T | Promise<T>;

/**
 * Configuration for reactive properties
 * @template TFullConfig - Type of full configuration including defaults
 * @template TObj - Type of the Three.js object being created
 */
type ReactiveConfig<TFullConfig extends VisualizerObject, TObj extends THREE.Object3D> = {
  /** Whether to rebuild the object when the reactive property changes */
  rebuild?: boolean;
  /** Function to be called when the reactive properties change */
  customUpdate?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
}

function createDeepStub(path = ''): any {
  const fn = () => createDeepStub(`${path}()`);
  return new Proxy(fn, {
    get: (_, key) => createDeepStub(`${path}.${String(key)}`),
    apply: () => undefined,
    set: () => true,
  });
}


/**
 * Configuration state for a render object, containing all the necessary functions
 * to create and manage a visualizer object
 * @template TDefaults - Type of default configuration values
 * @template TFullConfig - Type of full configuration including defaults
 * @template TObj - Type of the Three.js object being created
 */
export interface RenderObjectConfigState<
  TDefaults extends Record<string, unknown> = Record<string, unknown>,
  TFullConfig extends VisualizerObject = VisualizerObject,
  TObj extends THREE.Object3D = THREE.Mesh
> {
  /** Function that returns default configuration values */
  defaultsFn?: () => TDefaults;
  /** Function that creates the Three.js object */
  objectFn?: (args: RenderArgs<TFullConfig>) => MaybePromise<TObj>;
  /** Function that handles rendering of the object */
  renderFn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
  /** Function called when the object is first created */
  startFn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
  /** Function called when the object needs to be cleaned up */
  cleanupFn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
  /** List of properties that should trigger a re-render */
  reactiveProps?: {
    props: (keyof TFullConfig)[];
    config?: ReactiveConfig<TFullConfig, TObj>;
  }[];
}

type Defaults = Record<string, unknown> & Partial<VisualizerObject>;

/**
 * Builder class for creating visualizer objects with a fluent interface
 * @template TDefaults - Type of default configuration values
 * @template TFullConfig - Type of full configuration including defaults
 * @template TObj - Type of the Three.js object being created
 */
export class VisualizerObjectBuilder<
  TDefaults extends Record<string, unknown>,
  TFullConfig extends VisualizerObject,
  TObj extends THREE.Object3D
> {
  private config: RenderObjectConfigState<TDefaults, TFullConfig, TObj>;

  /**
   * Creates a new VisualizerObjectBuilder instance
   * @param config - Initial configuration state
   */
  private constructor(
    config: RenderObjectConfigState<TDefaults, TFullConfig, TObj>
  ) {
    this.config = config;
  }

  /**
   * Creates a new VisualizerObjectBuilder with default configuration
   * @returns A new VisualizerObjectBuilder instance
   */
  static create() {
    return new VisualizerObjectBuilder<
      Record<string, unknown>,
      VisualizerObject,
      THREE.Mesh
    >({});
  }

  /**
   * Sets the default configuration function
   * @template TNewDefaults - New type for default configuration values
   * @param fn - Function that returns default configuration values
   * @returns A new VisualizerObjectBuilder with updated defaults type
   */
  defaults<TNewDefaults extends Defaults>(
    fn: () => TNewDefaults
  ): VisualizerObjectBuilder<
    TNewDefaults,
    TNewDefaults & VisualizerObject,
    TObj
  > {
    const newConfig: RenderObjectConfigState<
      TNewDefaults,
      TNewDefaults & VisualizerObject,
      TObj
    > = {
      ...this.config,
      defaultsFn: fn,
    } as any;
    return new VisualizerObjectBuilder(newConfig);
  }

  /**
   * Sets the reactive properties that should trigger a re-render
   * @param props - List of properties that should trigger a re-render
   * @returns The current VisualizerObjectBuilder instance
   */
  reactive(
    props: (keyof TFullConfig)[],
    config?: ReactiveConfig<TFullConfig, TObj>
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TObj> {
    this.config.reactiveProps = [...(this.config.reactiveProps || []), { props, config }];
    return this;
  }

  /**
   * Sets the update function that is called when the props change.
   * @param fn - Function to be called when the props change.
   * @returns The current VisualizerObjectBuilder instance
   */
  update(
    fn: (args: RenderArgs<TFullConfig> & { object: TObj }) => void,
    explicitProps?: (keyof TFullConfig)[]
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TObj> {
    // if caller passed explicit props, just wire them up
    if (explicitProps) {
      this.config.reactiveProps = [
        ...(this.config.reactiveProps || []),
        { props: explicitProps, config: { customUpdate: fn } },
      ]
      return this
    }

    const accessedProps = new Set<keyof TFullConfig>()

    // proxy logic
    const createDeepProxy = (obj: any, path: string[] = []): any =>
      new Proxy(obj, {
        get(target, prop: string) {
          accessedProps.add(prop as keyof TFullConfig)
          const v = target[prop]
          return (v && typeof v === 'object')
            ? createDeepProxy(v, path.concat(prop))
            : v
        },
      })

    const proxyProps = createDeepProxy({} as TFullConfig)

    // stub out object so forEach actually runs once
    let dummyObj: any = createDeepStub('object')
    const dummyChild: any = createDeepStub('object.children[0]')
    const dummyChildMaterial: any = createDeepStub('object.children[0].material')
    const dummyChildGeometry: any = createDeepStub('object.children[0].geometry')
    const dummyMaterial: any = createDeepStub('object.children[0].material')
    const dummyGeometry: any = createDeepStub('object.children[0].geometry')
    dummyChild.material = dummyChildMaterial
    dummyChild.geometry = dummyChildGeometry
    dummyObj.children = [dummyChild]
    dummyChild.material = dummyMaterial
    dummyChild.geometry = dummyGeometry

    dummyObj = {
      ...dummyObj,
      children: [dummyChild],
      material: dummyMaterial,
      geometry: dummyGeometry,
    }

    try {
      fn({
        props: proxyProps,
        object: dummyObj as TObj,
        audioData: createDeepStub('audioData'),
        scene: createDeepStub('scene'),
        idToObjectMap: new Map(),
        id: '__dryrun__',
        delta: 0,
        camera: createDeepStub('camera'),
        currentTime: 0,
        renderer: createDeepStub('renderer'),
      })
    } catch {
      // swallow errors
    }

    // fallback: scan fn.toString() for any props.foo occurrences
    const source = fn.toString()
    const propRegex = /props\.(\w+)/g
    let m: RegExpExecArray | null
    while ((m = propRegex.exec(source))) {
      accessedProps.add(m[1] as keyof TFullConfig)
    }

    if (accessedProps.size === 0) {
      console.warn('[vaudio] No props accessed in update fn; you may need explicit reactive list')
    }

    this.config.reactiveProps = [
      ...(this.config.reactiveProps || []),
      {
        props: Array.from(accessedProps),
        config: { customUpdate: fn },
      },
    ]
    return this
  }


  /**
   * Sets the object creation function
   * @template TNewObj - New type for the Three.js object
   * @param fn - Function that creates the Three.js object
   * @returns A new VisualizerObjectBuilder with updated object type
   */
  object<TNewObj extends THREE.Object3D>(
    fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewObj>
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TNewObj> {
    const newConfig: RenderObjectConfigState<TDefaults, TFullConfig, TNewObj> =
      {
        ...this.config,
        objectFn: fn,
      } as any;

    return new VisualizerObjectBuilder(newConfig);
  }

  /**
   * Sets the start function that is called when the object is first created
   * @param fn - Function to be called on object creation
   * @returns The current VisualizerObjectBuilder instance
   */
  start(
    fn: (args: RenderArgs<TFullConfig> & { object: TObj }) => void
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TObj> {
    this.config.startFn = fn;
    return this;
  }

  /**
   * Sets the cleanup function that is called when the object needs to be cleaned up
   * @param fn - Function to be called during cleanup
   * @returns The current VisualizerObjectBuilder instance
   */
  cleanup(
    fn: (args: RenderArgs<TFullConfig> & { object: TObj }) => void
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TObj> {
    this.config.cleanupFn = fn;
    return this;
  }

  /**
   * Sets the render function and finalizes the builder
   * @param fn - Optional function to be called during rendering
   * @returns An object containing the render function, defaults, config, and cleanup function
   */
  render(fn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void) {
    if (!this.config.objectFn) {
      throw new Error('.object() must be called before .render()');
    }

    this.config.renderFn = fn;
    let lastObject: TObj | undefined;
    let lastArgs: RenderArgs<TFullConfig> | undefined;

    const renderFn: RenderFn<TFullConfig> = async (args) => {
      let obj = args.idToObjectMap.get(args.id) as TObj | undefined;

      const updateObject = async () => {
        const newObj = await awaitMaybe(this.config.objectFn?.(args));
        if (!newObj) {
          throw new Error('objectFn must return an object');
        }
        args.scene.add(newObj);
        args.idToObjectMap.set(args.id, newObj);
        if ('castShadow' in newObj && typeof newObj.castShadow === 'boolean')
          newObj.castShadow = true;
        if ('receiveShadow' in newObj && typeof newObj.receiveShadow === 'boolean')
          newObj.receiveShadow = true;

        for (const reactiveConfig of this.config.reactiveProps || []) {
          for (const prop of reactiveConfig.props) {
            if (prop in args.props) {
              newObj.userData[prop as string] = args.props[prop];
            }
          }
        }

        if (this.config.startFn) {
          this.config.startFn({ ...args, object: newObj });
        }
        return newObj;
      }

      if (!obj) {
        const newObj = await updateObject();
        obj = newObj;
      }

      // check the reactive props. If they have changed, update the object
      if (this.config.reactiveProps) {
        for (const reactiveConfig of this.config.reactiveProps) {
          for (const prop of reactiveConfig.props) {
            if (obj.userData[prop as string] !== args.props[prop]) {
              if (reactiveConfig.config?.customUpdate) {
                reactiveConfig.config.customUpdate({ ...args, object: obj });
              }

              if (!reactiveConfig.config?.rebuild) {
                this.config.startFn?.({ ...args, object: obj });
                obj.userData[prop as string] = args.props[prop];
              }

              if (reactiveConfig.config?.rebuild) {
                if (this.config.cleanupFn) {
                  this.config.cleanupFn({ ...args, object: obj });
                }
                obj.removeFromParent();
                if ('geometry' in obj && 'material' in obj) {
                  (obj.geometry as THREE.BufferGeometry).dispose();
                  (obj.material as THREE.Material).dispose();
                }
                if ('dispose' in obj) {
                  (obj as any).dispose();
                }
                args.scene.remove(obj);

                args.idToObjectMap.delete(args.id);
                obj = await updateObject();
              }
            }
          }
        }
      }

      obj.position.set(args.props.x, args.props.y, args.props.z);
      obj.scale.set(args.props.scaleX, args.props.scaleY, args.props.scaleZ);
      obj.rotation.set(
        args.props.rotationX,
        args.props.rotationY,
        args.props.rotationZ
      );

      this.config.renderFn?.({ ...args, object: obj });
      lastObject = obj;
      lastArgs = args;
    };

    const finalDefaults = (): TFullConfig => ({
      ...(defaultVisualizerObject() as any),
      ...(this.config.defaultsFn?.() || {}),
    });

    return {
      getRenderFn: () => renderFn,
      getDefaults: () => finalDefaults(),
      getConfig: () => this.config,
      getCleanupFn: () => {
        if (!lastArgs || !lastObject) {
          return undefined;
        }
        return this.config.cleanupFn?.({ ...lastArgs, object: lastObject });
      },
    };
  }
}

/**
 * Creates a new VisualizerObjectBuilder instance
 * @returns A new VisualizerObjectBuilder instance
 */
export function createVisualizerObject() {
  return VisualizerObjectBuilder.create();
}
