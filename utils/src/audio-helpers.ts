/**
 * Calculates the normalized average value of audio data, accounting for the full dynamic range.
 * The result is normalized to a 0-1 range by considering the minimum and maximum values.
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @returns A number between 0 and 1 representing the normalized average
 */
function getAverage(audioData: Uint8Array): number {
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < audioData.length; i++) {
    const value = audioData[i];
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const rawAvg = sum / audioData.length;
  return max > min ? (rawAvg - min) / (max - min) : 0;
}

/**
 * Calculates the peak value in the audio data, normalized to a 0-1 range.
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @returns A number between 0 and 1 representing the normalized peak value
 */
function getPeak(audioData: Uint8Array): number {
  let max = 0;
  for (let i = 0; i < audioData.length; i++) {
    if (audioData[i] > max) max = audioData[i];
  }
  return max / 255;
}

/**
 * Calculates the Root Mean Square (RMS) value of the audio data.
 * This provides a measure of the average power of the signal.
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @returns A number between 0 and 1 representing the normalized RMS value
 */
function getRMS(audioData: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    const norm = audioData[i] / 255;
    sum += norm * norm;
  }
  return Math.sqrt(sum / audioData.length);
}

/**
 * Calculates the average energy in a specific frequency band of the audio data.
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @param start - The starting index of the frequency band
 * @param end - The ending index of the frequency band
 * @returns A number between 0 and 1 representing the normalized energy in the specified band
 */
function getBandEnergy(audioData: Uint8Array, start: number, end: number): number {
  let sum = 0;
  const len = Math.min(end, audioData.length) - start;
  if (len <= 0) return 0;

  for (let i = start; i < end; i++) {
    sum += audioData[i];
  }

  return sum / len / 255;
}

/**
 * Calculates the energy in the bass frequency range (0-10% of the spectrum).
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @returns A number between 0 and 1 representing the normalized bass energy
 */
function getBassEnergy(audioData: Uint8Array): number {
  const end = Math.floor(audioData.length * 0.1);
  return getBandEnergy(audioData, 0, end);
}

/**
 * Calculates the energy in the mid frequency range (10-50% of the spectrum).
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @returns A number between 0 and 1 representing the normalized mid-range energy
 */
function getMidEnergy(audioData: Uint8Array): number {
  const start = Math.floor(audioData.length * 0.1);
  const end = Math.floor(audioData.length * 0.5);
  return getBandEnergy(audioData, start, end);
}

/**
 * Calculates the energy in the treble frequency range (50-90% of the spectrum).
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @returns A number between 0 and 1 representing the normalized treble energy
 */
function getTrebleEnergy(audioData: Uint8Array): number {
  const start = Math.floor(audioData.length * 0.5);
  const end = Math.floor(audioData.length * 0.9);
  return getBandEnergy(audioData, start, end);
}

/**
 * Calculates the spectral centroid of the audio data.
 * The spectral centroid represents the "center of mass" of the spectrum.
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @returns A number between 0 and 1 representing the normalized spectral centroid
 */
function getCentroid(audioData: Uint8Array): number {
  let num = 0;
  let denom = 0;

  for (let i = 0; i < audioData.length; i++) {
    const amp = audioData[i];
    num += i * amp;
    denom += amp;
  }

  return denom === 0 ? 0 : (num / denom) / audioData.length; // normalized to 0–1
}

/**
 * Calculates the dynamic range of the audio data.
 * This represents the difference between the highest and lowest values.
 * 
 * @param audioData - The audio data array (Uint8Array) to analyze
 * @returns A number between 0 and 1 representing the normalized dynamic range
 */
function getDynamicRange(audioData: Uint8Array): number {
  let min = 255;
  let max = 0;

  for (let i = 0; i < audioData.length; i++) {
    const v = audioData[i];
    if (v > max) max = v;
    if (v < min) min = v;
  }

  return (max - min) / 255;
}

/**
 * A collection of utility functions for analyzing audio data.
 * All functions operate on Uint8Array audio data and return normalized values between 0 and 1.
 */
export const AudioUtils = {
  getAverage,
  getPeak,
  getRMS,
  getBandEnergy,
  getBassEnergy,
  getCentroid,
  getDynamicRange,
  getMidEnergy,
  getTrebleEnergy,
};