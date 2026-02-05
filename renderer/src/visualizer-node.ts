import FFT from 'fft.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { Readable } from 'stream';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { VisualizerCore } from '@vaudio/core';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * A store that manages the Three.js scene, camera, and renderer for audio visualization.
 * Handles rendering, audio analysis, and object management.
 */
export class VisualizerNode {
  private core: VisualizerCore;
  private audioBuffer: AudioBuffer | null = null;
  private fft: FFT | null = null;
  private frameSize: number = 2048;
  private width: number;
  private height: number;
  private gl: WebGLRenderingContext;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.gl = createContext(width, height);
    this.core = new VisualizerCore(this.gl, width, height);
    this.fft = new FFT(this.frameSize);
  }

  attachAudioBuffer(audioBuffer: AudioBuffer) {
    this.audioBuffer = audioBuffer;
  }

  /**
   * Gets the audio data at a specific time
   * @param t - The time in seconds
   * @returns The audio data as a Uint8Array
   */
  getAudioDataAtTime(t: number) {
    if (!this.audioBuffer) {
      throw new Error('Audio buffer not set');
    }
    const sampleRate = this.audioBuffer.sampleRate;
    const start = Math.floor(t * sampleRate);
    const channelData = this.audioBuffer
      .getChannelData(0)
      .slice(start, start + this.frameSize);

    if (!this.fft) {
      throw new Error('FFT not initialized');
    }

    const out = this.fft.createComplexArray();
    this.fft.realTransform(out, channelData);
    this.fft.completeSpectrum(out);

    const magnitudes = new Float32Array(this.frameSize / 2);
    for (let i = 0; i < this.frameSize / 2; i++) {
      const re = out?.[2 * i];
      const im = out?.[2 * i + 1];
      magnitudes[i] = Math.sqrt(re * re + im * im);
    }

    // Normalize to 0–255
    const normalized = new Uint8Array(
      magnitudes.map((v) => Math.min(255, v * 255))
    );
    return normalized;
  }

  /**
   * Captures the current frame from the WebGL context
   * @returns Raw RGBA pixel data as Uint8Array
   */
  captureFrame(): Uint8Array {
    const pixels = new Uint8Array(this.width * this.height * 4);
    this.gl.readPixels(
      0,
      0,
      this.width,
      this.height,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      pixels
    );
    // Flip vertically (WebGL reads bottom-to-top, but video expects top-to-bottom)
    const flipped = new Uint8Array(this.width * this.height * 4);
    for (let y = 0; y < this.height; y++) {
      const srcY = this.height - 1 - y;
      const srcOffset = srcY * this.width * 4;
      const dstOffset = y * this.width * 4;
      flipped.set(
        pixels.subarray(srcOffset, srcOffset + this.width * 4),
        dstOffset
      );
    }
    return flipped;
  }

  /**
   * Converts AudioBuffer to WAV file format
   * @param audioBuffer - The audio buffer to convert
   * @param outputPath - Path to write the WAV file
   */
  private audioBufferToWav(audioBuffer: AudioBuffer, outputPath: string): void {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, length * numChannels * 2, true);

    // Convert float samples to 16-bit PCM
    const pcmData = new Int16Array(length * numChannels);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        pcmData[i * numChannels + channel] =
          sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
    }

    // Write WAV file
    const wavBuffer = Buffer.concat([
      Buffer.from(header),
      Buffer.from(pcmData.buffer),
    ]);
    writeFileSync(outputPath, wavBuffer);
  }

  /**
   * Renders frames to a video file using ffmpeg
   * @param outputPath - Path to the output video file
   * @param options - Rendering options
   */
  async renderToVideo(
    outputPath: string,
    options: {
      fps?: number;
      codec?: string;
      pixelFormat?: string;
    } = {}
  ): Promise<void> {
    if (!this.audioBuffer) {
      throw new Error('Audio buffer not set');
    }

    const fps = options.fps ?? 60;
    const frameStep = 1 / fps;
    const frames: Uint8Array[] = [];

    // Render all frames and capture them
    for (let t = 0; t < this.audioBuffer.duration; t += frameStep) {
      const audioData = this.getAudioDataAtTime(t);
      const delta = frameStep;
      await this.core.renderFrame(audioData, t, delta);
      frames.push(this.captureFrame());
    }

    // Create a readable stream from frames
    let frameIndex = 0;
    const frameStream = new Readable({
      read() {
        if (frameIndex < frames.length) {
          this.push(frames[frameIndex++]);
        } else {
          this.push(null); // End stream
        }
      },
    });

    // Convert AudioBuffer to temporary WAV file for ffmpeg
    const tempWavPath = join(tmpdir(), `audio-${Date.now()}.wav`);
    this.audioBufferToWav(this.audioBuffer, tempWavPath);

    // Configure ffmpeg
    const command = ffmpeg()
      .input(frameStream)
      .inputFormat('rawvideo')
      .inputOptions([
        `-video_size ${this.width}x${this.height}`,
        `-pixel_format ${options.pixelFormat ?? 'rgba'}`,
        `-framerate ${fps}`,
      ])
      .input(tempWavPath)
      .outputOptions([
        `-c:v ${options.codec ?? 'libx264'}`,
        '-c:a aac',
        '-pix_fmt yuv420p',
        '-preset medium',
        '-crf 23',
        '-shortest', // Ensure video matches audio length
      ])
      .output(outputPath);

    return new Promise<void>((resolve, reject) => {
      command
        .on('end', () => {
          try {
            unlinkSync(tempWavPath);
          } catch (err) {
            console.error(err);
          }
          resolve();
        })
        .on('error', (err: Error) => {
          try {
            unlinkSync(tempWavPath);
          } catch {
            console.error(err);
          }
          reject(err);
        })
        .run();
    });
  }

  start() {
    if (!this.audioBuffer) {
      throw new Error('Audio buffer not set');
    }

    const fps = 60;
    const frameStep = 1 / fps;
    for (let t = 0; t < this.audioBuffer.duration; t += frameStep) {
      const audioData = this.getAudioDataAtTime(t);
      const delta = frameStep;
      this.core.renderFrame(audioData, t, delta);
    }
  }
}
