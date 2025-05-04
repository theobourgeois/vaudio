import * as THREE from 'three';
import { RenderArgs, RenderFn, VisualizerObject } from './types';
import { defaultVisualizerObject } from './defaults';
import { awaitMaybe } from './await-maybe';

export interface RenderObjectConfigState<
  TDefaults extends Record<string, unknown> = Record<string, unknown>,
  TFullConfig extends VisualizerObject = VisualizerObject,
  TObj extends THREE.Object3D = THREE.Mesh,
> {
  defaultsFn?: () => TDefaults;
  objectFn?: (args: RenderArgs<TFullConfig>) => MaybePromise<TObj>;
  renderFn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
  startFn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
  cleanupFn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void;
}

type MaybePromise<T> = T | Promise<T>;

export class VisualizerObjectBuilder<
  TDefaults extends Record<string, unknown>,
  TFullConfig extends VisualizerObject,
  TObj extends THREE.Object3D,
> {
  private config: RenderObjectConfigState<TDefaults, TFullConfig, TObj>;

  private constructor(config: RenderObjectConfigState<TDefaults, TFullConfig, TObj>) {
    this.config = config;
  }

  static create() {
    return new VisualizerObjectBuilder<Record<string, unknown>, VisualizerObject, THREE.Mesh>({});
  }

  defaults<TNewDefaults extends Record<string, unknown>>(
    fn: () => TNewDefaults
  ): VisualizerObjectBuilder<TNewDefaults, TNewDefaults & VisualizerObject, TObj> {
    const newConfig: RenderObjectConfigState<TNewDefaults, TNewDefaults & VisualizerObject, TObj> = {
      ...this.config,
      defaultsFn: fn,
    } as any;
    return new VisualizerObjectBuilder(newConfig);
  }

  object<TNewObj extends THREE.Object3D>(
    fn: (args: RenderArgs<TFullConfig>) => MaybePromise<TNewObj>
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TNewObj> {
    const newConfig: RenderObjectConfigState<TDefaults, TFullConfig, TNewObj> = {
      ...this.config,
      objectFn: fn,
    } as any;
    return new VisualizerObjectBuilder(newConfig);
  }

  start(
    fn: (args: RenderArgs<TFullConfig> & { object: TObj }) => void
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TObj> {
    this.config.startFn = fn;
    return this;
  }

  cleanup(
    fn: (args: RenderArgs<TFullConfig> & { object: TObj }) => void
  ): VisualizerObjectBuilder<TDefaults, TFullConfig, TObj> {
    this.config.cleanupFn = fn;
    return this;
  }

  render(fn?: (args: RenderArgs<TFullConfig> & { object: TObj }) => void) {
    if (!this.config.objectFn) {
      throw new Error('.object() must be called before .render()');
    }

    this.config.renderFn = fn;
    let lastObject: TObj | undefined;
    let lastArgs: RenderArgs<TFullConfig> | undefined;

    const renderFn: RenderFn<TFullConfig> = async (args) => {
      let obj = args.idToObjectMap.get(args.id) as TObj | undefined;

      if (!obj) {
        obj = await awaitMaybe(this.config.objectFn?.(args));
        if (!obj) {
          throw new Error('objectFn must return an object');
        }
        args.scene.add(obj);
        args.idToObjectMap.set(args.id, obj);
        if ('castShadow' in obj && typeof obj.castShadow === 'boolean') obj.castShadow = true;
        if ('receiveShadow' in obj && typeof obj.receiveShadow === 'boolean') obj.receiveShadow = true;
        if (this.config.startFn) this.config.startFn({ ...args, object: obj });
      }

      obj.position.set(args.props.x, args.props.y, args.props.z);
      obj.scale.set(args.props.scaleX, args.props.scaleY, args.props.scaleZ);
      obj.rotation.set(args.props.rotationX, args.props.rotationY, args.props.rotationZ);

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
          throw new Error('cleanupFn must be called after renderFn');
        }
        return this.config.cleanupFn?.({ ...lastArgs, object: lastObject });
      },
    };
  }
}

export function createVisualizerObject() {
  return VisualizerObjectBuilder.create();
}