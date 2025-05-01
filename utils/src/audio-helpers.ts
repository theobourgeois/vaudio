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

function getPeak(audioData: Uint8Array): number {
  let max = 0;
  for (let i = 0; i < audioData.length; i++) {
    if (audioData[i] > max) max = audioData[i];
  }
  return max / 255;
}

function getRMS(audioData: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    const norm = audioData[i] / 255;
    sum += norm * norm;
  }
  return Math.sqrt(sum / audioData.length);
}

function getBandEnergy(audioData: Uint8Array, start: number, end: number): number {
  let sum = 0;
  const len = Math.min(end, audioData.length) - start;
  if (len <= 0) return 0;

  for (let i = start; i < end; i++) {
    sum += audioData[i];
  }

  return sum / len / 255;
}

function getBassEnergy(audioData: Uint8Array): number {
  const end = Math.floor(audioData.length * 0.1);
  return getBandEnergy(audioData, 0, end);
}

function getMidEnergy(audioData: Uint8Array): number {
  const start = Math.floor(audioData.length * 0.1);
  const end = Math.floor(audioData.length * 0.5);
  return getBandEnergy(audioData, start, end);
}

function getTrebleEnergy(audioData: Uint8Array): number {
  const start = Math.floor(audioData.length * 0.5);
  const end = Math.floor(audioData.length * 0.9);
  return getBandEnergy(audioData, start, end);
}

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