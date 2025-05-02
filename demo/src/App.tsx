import { Visualizer } from '@vaudio/react';
import { useState, useRef } from 'react';
import { Light } from './objects/light';
import { Cylinder } from './objects/cylinder';
import { MeltyGas } from './objects/melty-gas';
import { CircleWaveform } from './objects/circle-waveform';
import { PsychedelicTunnel } from './objects/psychadelic-particles';
import { GradientWaveform } from './objects/gradient-waveform';
import { Planet } from './objects/planet';
import { CircularBars } from './objects/trap-visualizer';
import { Topography } from './objects/topography';

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

      <div style={{ width: '1400px', height: '800px', marginTop: '20px' }}>
        <Visualizer
          cameraOptions={{
            fov: 75,
          }}
          ref={audioRef}
          audioOptions={{
            src: audioSource,
          }}
          fps={60}
          backgroundColor="black"
        >
          <Light type="PointLight" intensity={100} z={15} />
          <MeltyGas color="#ff5577" segments={200} z={-10} pulseScale={6} />
          {/* <FluidWater color="#005577" segments={200} z={-10} /> */}
          <PsychedelicTunnel color="#00ff00" />
          {/* <FlowingLines /> */}
          {/* <CircleWaveform radius={3} domain="frequency" /> */}
          <GradientWaveform />
          {/* <CircularBars color="#880000" accentColor="#000099" /> */}
          <Planet baseColor="#000000" secondaryColor="#ff0000" />
          {/* <Topography
            z={-60}
            height={20}
            baseColor="#880388"
            segments={7}
            topoDefinition={4}
          /> */}
        </Visualizer>
      </div>
    </div>
  );
}

export default App;
