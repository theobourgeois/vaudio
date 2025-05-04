import { Visualizer } from '@vaudio/react';
import { useState, useRef } from 'react';
import { Light } from './objects/light';
import { Cylinder } from './objects/cylinder';
// import { MeltingGas } from './objects/melty-gas';
import Rainbow3DDisc from './objects/circle-waveform';
import { PsychedelicTunnel } from './objects/psychadelic-particles';
import { GradientWaveform } from './objects/gradient-waveform';
import { Planet } from './objects/planet';
import CircularBars from './objects/trap-visualizer';
import { Topography } from './objects/topography';
import { FlowingLines } from './objects/flowing-lines';
import FluidWaves from './objects/fluid';
import { MandelBrot } from './objects/mandlebrot';
import { FractalTree } from './objects/spiral-galaxy';
import GameOfLife from './objects/game-of-life';
import Torus from './objects/torus';
import FuturisticCity from './objects/futuristic-city';

function App() {
  const [audioSource, setAudioSource] = useState<string>('audio.mp3');
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSource(url);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>vaudio Demo</h1>
      <input type="file" accept="audio/*" onChange={handleFileChange} />
      <button
        onClick={() => {
          audioRef.current?.play();
        }}
      >
        Play
      </button>
      <button
        onClick={() => {
          audioRef.current?.pause();
        }}
      >
        Pause
      </button>

      <div style={{ width: '100%', height: '800px', marginTop: '20px' }}>
        <Visualizer
          ref={audioRef}
          audioOptions={{
            src: audioSource,
          }}
          fps={60}
          backgroundColor="black"
        >
          <Light type="PointLight" intensity={200} x={0} y={0} z={0} />
          {/* <FuturisticCity /> */}
          <GameOfLife />
        </Visualizer>
      </div>
    </div>
  );
}

export default App;
