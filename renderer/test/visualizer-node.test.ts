import { VisualizerNode } from '../src/visualizer-node';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { join } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { expect, describe, it } from '@jest/globals';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Decodes an audio file to AudioBuffer using ffmpeg
 */
async function decodeAudioFile(audioPath: string): Promise<AudioBuffer> {
  const tempWavPath = join(tmpdir(), `decode-${Date.now()}.wav`);

  return new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .outputOptions(['-acodec pcm_s16le', '-ar 44100', '-ac 2'])
      .output(tempWavPath)
      .on('end', () => {
        try {
          const wavBuffer = readFileSync(tempWavPath);
          const audioBuffer = wavToAudioBuffer(wavBuffer);
          unlinkSync(tempWavPath);
          resolve(audioBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        try {
          unlinkSync(tempWavPath);
        } catch {
          // Ignore cleanup errors
        }
        reject(err);
      })
      .run();
  });
}

/**
 * Converts WAV file buffer to AudioBuffer
 */
function wavToAudioBuffer(wavBuffer: Buffer): AudioBuffer {
  const view = new DataView(
    wavBuffer.buffer,
    wavBuffer.byteOffset,
    wavBuffer.byteLength
  );

  // Read WAV header
  const sampleRate = view.getUint32(24, true);
  const numChannels = view.getUint16(22, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataOffset = 44; // Standard WAV header size
  const dataLength = view.getUint32(40, true);
  const numSamples = dataLength / (numChannels * (bitsPerSample / 8));

  // Read PCM data
  const channelData: Float32Array[] = [];
  for (let channel = 0; channel < numChannels; channel++) {
    channelData[channel] = new Float32Array(numSamples);
  }

  // Convert 16-bit PCM to float32
  let offset = dataOffset;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = view.getInt16(offset, true);
      channelData[channel][i] = sample / 0x8000;
      offset += 2;
    }
  }

  return {
    sampleRate,
    length: numSamples,
    duration: numSamples / sampleRate,
    numberOfChannels: numChannels,
    getChannelData: (channel: number) => channelData[channel],
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as AudioBuffer;
}

describe('visualizer-node', () => {
  it('should render video with audio', async () => {
    const width = 1920;
    const height = 1080;
    const visualizerNode = new VisualizerNode(width, height);

    const audioPath = resolve(__dirname, '../fixtures/audio.mp3');
    const outputPath = resolve(__dirname, '../fixtures/output.mp4');

    if (!existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Decode MP3 to AudioBuffer
    const audioBuffer = await decodeAudioFile(audioPath);
    visualizerNode.attachAudioBuffer(audioBuffer);

    await visualizerNode.renderToVideo(outputPath, {
      fps: 30,
    });

    expect(existsSync(outputPath)).toBe(true);
  }, 120000); // 2 minute timeout
});
