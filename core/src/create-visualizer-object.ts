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
type ReactiveConfig<
  TFullConfig extends VisualizerObject,
  TObj extends THREE.Object3D
> = {
  /** Function to be called when the reactive properties change */
  customUpdate?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
};

function injectOpacity(material: THREE.ShaderMaterial) {
  if (material.userData.opacityPatched) return; // only once

  // add uniform
  material.uniforms.u_opacity ??= { value: 1.0 };
  material.transparent = true;

  material.onBeforeCompile = (shader) => {
    // hand the uniform to the compiled program
    shader.uniforms.u_opacity = material.uniforms.u_opacity;

    // insert the uniform definition at the top
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      'uniform float u_opacity;\nvoid main() {'
    );

    // multiply alpha just before final write
    shader.fragmentShader = shader.fragmentShader.replace(
      /gl_FragColor\s*=\s*vec4\((.*)\);/,
      'gl_FragColor = vec4($1 * u_opacity);'
    );
  };

  material.userData.opacityPatched = true;
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
  /** Function called when the object needs to be cleaned up */
  cleanupFn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
  /** List of properties that should trigger a re-render */
  reactiveProps?: {
    props: (keyof TFullConfig)[] | null;
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
   * Sets the update function that is called when the props change.
   * @param fn - Function to be called when the props change.
   * @returns The current VisualizerObjectBuilder instance
   */
  update(
    fn: (args: RenderArgs<TFullConfig> & { object: TObj }) => void,
    explicitProps?: (keyof TFullConfig)[]
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TObj> {
    this.config.reactiveProps = [
      ...(this.config.reactiveProps || []),
      { props: explicitProps ?? null, config: { customUpdate: fn } },
    ];
    return this;
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

    // Add reactive config for transform and opacity properties
    this.update(
      ({ object, props }) => {
        object.position.set(props.x, props.y, props.z);
        object.scale.set(props.scaleX, props.scaleY, props.scaleZ);
        object.rotation.set(props.rotationX, props.rotationY, props.rotationZ);

        // Handle opacity recursively for all objects and materials
        const setOpacity = (object: THREE.Object3D, value: number) => {
          if ('material' in object) {
            const mesh = object as THREE.Mesh;
            const apply = (mat: THREE.Material) => {
              if (mat instanceof THREE.ShaderMaterial) {
                injectOpacity(mat as THREE.ShaderMaterial);
                (mat as THREE.ShaderMaterial).uniforms.u_opacity.value = value;
              } else {
                mat.opacity = value;
                mat.transparent = value < 1;
              }
            };
            Array.isArray(mesh.material)
              ? mesh.material.forEach(apply)
              : apply(mesh.material);
          }
          object.children.forEach((child) => setOpacity(child, value));
        };
        setOpacity(object, props.opacity);
      },
      [
        'x',
        'y',
        'z',
        'scaleX',
        'scaleY',
        'scaleZ',
        'rotationX',
        'rotationY',
        'rotationZ',
        'opacity',
      ]
    );

    const renderFn: RenderFn<TFullConfig> = async (args) => {
      let obj = args.idToObjectMap.get(args.id) as TObj | undefined;

      const updateObject = async () => {
        const newObj = await awaitMaybe(this.config.objectFn?.(args));

        if (!newObj) {
          throw new Error('objectFn must return an object');
        }
        if (
          newObj instanceof THREE.Mesh &&
          newObj.material instanceof THREE.ShaderMaterial
        ) {
          injectOpacity(newObj.material);
        }
        args.scene.add(newObj);
        args.idToObjectMap.set(args.id, newObj);
        if ('castShadow' in newObj && typeof newObj.castShadow === 'boolean')
          newObj.castShadow = true;
        if (
          'receiveShadow' in newObj &&
          typeof newObj.receiveShadow === 'boolean'
        )
          newObj.receiveShadow = true;

        // set user data on the object
        for (const prop of Object.keys(args.props)) {
          newObj.userData[prop as string] =
            args.props[prop as keyof TFullConfig];
        }

        // render all update functions on first render
        if (this.config.reactiveProps) {
          for (const reactiveConfig of this.config.reactiveProps || []) {
            if (reactiveConfig.config?.customUpdate) {
              reactiveConfig.config.customUpdate({ ...args, object: newObj });
            }
          }
        }
        return newObj;
      };

      if (!obj) {
        const newObj = await updateObject();
        obj = newObj;
      }

      // check the reactive props. If they have changed, update the object
      if (this.config.reactiveProps) {
        const staleUserData = { ...obj.userData };
        for (const reactiveConfig of this.config.reactiveProps) {
          // if the props are null update the object on every frame
          if (reactiveConfig.props === null) {
            if (reactiveConfig.config?.customUpdate) {
              reactiveConfig.config.customUpdate({ ...args, object: obj });
            }
          } else {
            // if the props are not null, update the object only if the props have changed
            for (const prop of reactiveConfig.props || []) {
              if (staleUserData[prop as string] !== args.props[prop]) {
                if (reactiveConfig.config?.customUpdate) {
                  reactiveConfig.config.customUpdate({ ...args, object: obj });
                  obj.userData[prop as string] =
                    args.props[prop as keyof TFullConfig];
                }
              }
            }
          }
        }
      }

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
