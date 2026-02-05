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
  VisualizerBrowser,
} from '@vaudio/core';
import React from 'react';
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';

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
  liveAudio?: 'microphone' | 'desktop';
};

export type VisualizerRef = {
  audioElement: HTMLAudioElement;
  containerElement: HTMLDivElement;
  store: () => VisualizerBrowser | null;
  triggerRender: TriggerRenderFn;
  removeObject: (id: ObjectId) => void;
  camera: PerspectiveCamera | null;
  scene: Scene | null;
  renderer: WebGLRenderer | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  dataArray: Uint8Array | null;
};

export const Visualizer = forwardRef<VisualizerRef, VisualizerProps>(
  function Visualizer(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const storeRef = useRef<VisualizerBrowser | null>(null);
    const pendingRenderFns = useRef<
      Array<{
        id: ObjectId;
        renderFn: RenderFn<VisualizerObject>;
        layer: VisualizerObject;
        cleanupFn?: () => void;
      }>
    >([]);

    useImperativeHandle(ref, () => ({
      audioElement: audioRef.current!,
      containerElement: containerRef.current!,
      store: () => storeRef.current as VisualizerBrowser,
      triggerRender: triggerRender,
      removeObject: removeObject,
      camera: storeRef.current?.core.camera ?? null,
      scene: storeRef.current?.core.scene ?? null,
      renderer: storeRef.current?.core.renderer ?? null,
      audioContext: storeRef.current?.audioContext ?? null,
      analyser: storeRef.current?.analyser ?? null,
      dataArray: storeRef.current?.audioData ?? null,
    }));

    useEffect(() => {
      /**
       * Initialize the store
       */
      if (!containerRef.current || !audioRef.current || storeRef.current)
        return;

      const canvas = document.createElement('canvas');
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      containerRef.current.appendChild(canvas);

      const store = new VisualizerBrowser(canvas, {
        backgroundColor: props.backgroundColor,
        cameraOptions: props.cameraOptions,
        fps: props.fps,
      });
      storeRef.current = store;

      for (const {
        id,
        renderFn,
        layer,
        cleanupFn,
      } of pendingRenderFns.current) {
        store.core.registerRenderFn(id, renderFn, layer, cleanupFn);
      }
      pendingRenderFns.current = [];

      // if (props.liveAudio === 'microphone') {
      //   navigator.mediaDevices
      //     .getUserMedia({ audio: true })
      //     .then((stream) => {
      //       store.setAudioElement(undefined, stream);
      //       store.animate();
      //     })
      //     .catch((error) => {
      //       console.error('Error connecting user audio device', error);
      //     });
      // } else if (props.liveAudio === 'desktop') {
      //   navigator.mediaDevices
      //     .getDisplayMedia({
      //       video: true,
      //       audio: true,
      //     })
      //     .then((stream) => {
      //       store.setAudioElement(undefined, stream);
      //       store.animate();
      //     })
      //     .catch((error) => {
      //       console.error('Error connecting user audio device', error);
      //     });
      // } else {
      //   store.setAudioElement(audioRef.current);
      //   store.animate();
      // }

      store.attachAudioElement(audioRef.current);
      store.start();

      return () => {
        store.stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const store = storeRef.current;
      if (!store) return;
      if (props.backgroundColor) {
        store.core.setBackgroundColor(props.backgroundColor);
      }
    }, [props.backgroundColor]);

    useEffect(() => {
      const store = storeRef.current;
      if (!store) return;
      if (props.cameraOptions) {
        store.core.setCameraOptions(props.cameraOptions);
      }
    }, [props.cameraOptions]);

    useEffect(() => {
      const store = storeRef.current;
      if (!store) return;
      if (props.fps) {
        store.setFps(props.fps);
      }
    }, [props.fps]);

    // Resize handling
    useEffect(() => {
      if (!containerRef.current || !storeRef.current) return;

      let timeoutId: NodeJS.Timeout;
      const handleResize = () => {
        if (!containerRef.current || !storeRef.current) return;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const width = containerRef.current!.clientWidth;
          const height = containerRef.current!.clientHeight;
          storeRef.current!.resize(width, height);
        }, 100);
      };

      const observer = new ResizeObserver((entries) => {
        // Only trigger resize if the container's dimensions actually changed
        const entry = entries[0];
        if (entry && entry.contentRect) {
          handleResize();
        }
      });

      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
        clearTimeout(timeoutId);
      };
    }, []);

    const triggerRender = useCallback<TriggerRenderFn>(
      (id, renderFn, layer, cleanupFn) => {
        if (storeRef.current) {
          storeRef.current.core.registerRenderFn(
            id,
            renderFn as RenderFn<VisualizerObject>,
            layer,
            cleanupFn
          );
        } else {
          pendingRenderFns.current.push({
            id,
            renderFn: renderFn as RenderFn<VisualizerObject>,
            layer,
            cleanupFn,
          });
        }
      },
      []
    );

    const removeObject = useCallback((id: ObjectId) => {
      storeRef.current?.core.removeObject(id);
    }, []);

    const contextValue = useMemo(
      () => ({
        removeObject,
        triggerRender,
        storeRef,
        audioContextRef: { current: null },
        analyserRef: { current: null },
        dataArrayRef: { current: null },
        cameraRef: { current: storeRef.current?.core.camera ?? null },
        sceneRef: { current: storeRef.current?.core.scene ?? null },
        rendererRef: { current: storeRef.current?.core.renderer ?? null },
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
