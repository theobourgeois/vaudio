import { createContext, useContext } from 'react';
import * as THREE from "three";
import { ObjectId, TriggerRenderFn } from '@vaudio/core';

interface VisualizerContextValue {
  audioContextRef: React.RefObject<AudioContext | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  dataArrayRef: React.RefObject<Uint8Array | null>;

  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>;
  sceneRef: React.RefObject<THREE.Scene | null>;
  rendererRef: React.RefObject<THREE.WebGLRenderer | null>;

  triggerRender: TriggerRenderFn;
  removeObject: (id: ObjectId) => void;
}

export const VisualizerContext = createContext<VisualizerContextValue | undefined>(undefined);

export const useVisualizer = (): VisualizerContextValue => {
  const context = useContext(VisualizerContext);
  if (!context) {
    throw new Error('useVisualizer must be used within a VisualizerProvider');
  }
  return context;
};