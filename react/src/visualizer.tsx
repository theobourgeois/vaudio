'use client';
import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useMemo,
  useImperativeHandle,
} from 'react';
import { VisualizerContext } from './visualizer-context';
import {
  VisualizerStore,
  ObjectId,
  RenderFn,
  TriggerRenderFn,
  VisualizerObject,
} from '@vaudio/core';
import { debounce } from './debounce';
import React from 'react';

type CameraOptions = {
  fov?: number;
  near?: number;
  far?: number;
  x?: number;
  y?: number;
  z?: number;
};

export type VisualizerProps = {
  children: React.ReactNode;
  containerProps?: React.HTMLProps<HTMLDivElement>;
  backgroundColor?: string;
  fps?: number;
  cameraOptions?: CameraOptions;
  audioOptions?: React.AudioHTMLAttributes<HTMLAudioElement>;
};

export const Visualizer = forwardRef<HTMLAudioElement, VisualizerProps>(
  function Visualizer(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const storeRef = useRef<VisualizerStore | null>(null);
    const pendingRenderFns = useRef<
      Array<{
        id: ObjectId;
        renderFn: RenderFn<VisualizerObject>;
        layer: VisualizerObject;
      }>
    >([]);

    useImperativeHandle(ref, () => audioRef.current!);

    useEffect(() => {
      if (!containerRef.current || !audioRef.current || storeRef.current)
        return;

      const store = new VisualizerStore(containerRef.current);
      storeRef.current = store;

      for (const { id, renderFn, layer } of pendingRenderFns.current) {
        store.registerRenderFn(id, renderFn, layer);
      }
      pendingRenderFns.current = [];

      store.init({
        backgroundColor: props.backgroundColor,
        cameraOptions: props.cameraOptions,
        fps: props.fps,
      });

      store.setAudioElement(audioRef.current);
      store.animate();

      return () => {
        store.stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Update settings on prop changes (without recreating store)
    useEffect(() => {
      const store = storeRef.current;
      if (!store) return;

      store.init({
        backgroundColor: props.backgroundColor,
        cameraOptions: props.cameraOptions,
        fps: props.fps,
      });
    }, [props.backgroundColor, props.cameraOptions, props.fps]);

    // Resize handling
    useEffect(() => {
      if (!containerRef.current || !storeRef.current) return;

      const handleResize = debounce(() => {
        const width = containerRef.current!.clientWidth;
        const height = containerRef.current!.clientHeight;
        storeRef.current!.resize(width, height);
      }, 100);

      const observer = new ResizeObserver(handleResize);
      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }, []);
    const triggerRender = useCallback<TriggerRenderFn>(
      (id, renderFn, layer) => {
        if (storeRef.current) {
          storeRef.current.registerRenderFn(
            id,
            renderFn as RenderFn<VisualizerObject>,
            layer
          );
        } else {
          pendingRenderFns.current.push({
            id,
            renderFn: renderFn as RenderFn<VisualizerObject>,
            layer,
          });
        }
      },
      []
    );

    const removeObject = useCallback((id: ObjectId) => {
      storeRef.current?.removeObject(id);
    }, []);

    const contextValue = useMemo(
      () => ({
        removeObject,
        triggerRender,
        storeRef,
        audioContextRef: { current: null },
        analyserRef: { current: null },
        dataArrayRef: { current: null },
        cameraRef: { current: storeRef.current?.getCamera() ?? null },
        sceneRef: { current: storeRef.current?.getScene() ?? null },
        rendererRef: { current: storeRef.current?.getRenderer() ?? null },
      }),
      [removeObject, triggerRender]
    );

    return (
      <VisualizerContext.Provider value={contextValue}>
        <audio ref={audioRef} {...props.audioOptions} />
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
          {...props.containerProps}
        />
        {props.children}
      </VisualizerContext.Provider>
    );
  }
);
