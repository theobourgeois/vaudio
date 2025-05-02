import { expect, describe, it } from '@jest/globals';
import { AudioUtils } from '../src/audio-utils';

describe('AudioUtils', () => {
  describe('getAverage', () => {
    it('should calculate normalized average for non-zero values', () => {
      const data = new Uint8Array([0, 127, 255]);
      expect(AudioUtils.getAverage(data)).toBeCloseTo(0.5, 2);
    });

    it('should return 0 for empty array', () => {
      const data = new Uint8Array([]);
      expect(AudioUtils.getAverage(data)).toBe(0);
    });

    it('should return 0 for all same values', () => {
      const data = new Uint8Array([255, 255, 255]);
      expect(AudioUtils.getAverage(data)).toBe(0);
    });
  });

  describe('getPeak', () => {
    it('should find the highest value normalized to 0-1', () => {
      const data = new Uint8Array([0, 127, 255]);
      expect(AudioUtils.getPeak(data)).toBe(1);
    });

    it('should return 0 for empty array', () => {
      const data = new Uint8Array([]);
      expect(AudioUtils.getPeak(data)).toBe(0);
    });

    it('should return 0 for all zeros', () => {
      const data = new Uint8Array([0, 0, 0]);
      expect(AudioUtils.getPeak(data)).toBe(0);
    });

    it('should return 1 for max value', () => {
      const data = new Uint8Array([0, 0, 255]);
      expect(AudioUtils.getPeak(data)).toBe(1);
    });
  });

  describe('getRMS', () => {
    it('should calculate RMS for varying values', () => {
      const data = new Uint8Array([0, 127, 255]);
      expect(AudioUtils.getRMS(data)).toBeCloseTo(0.644, 2);
    });

    it('should return 0 for all zeros', () => {
      const data = new Uint8Array([0, 0, 0]);
      expect(AudioUtils.getRMS(data)).toBe(0);
    });

    it('should return 1 for all max values', () => {
      const data = new Uint8Array([255, 255, 255]);
      expect(AudioUtils.getRMS(data)).toBe(1);
    });
  });

  describe('getBandEnergy', () => {
    it('should calculate energy for a specific band', () => {
      const data = new Uint8Array([0, 127, 255, 127, 0]);
      expect(AudioUtils.getBandEnergy(data, 1, 4)).toBeCloseTo(0.665);
    });

    it('should return 0 for empty range', () => {
      const data = new Uint8Array([0, 127, 255]);
      expect(AudioUtils.getBandEnergy(data, 0, 0)).toBe(0);
    });

    it('should handle out of bounds indices', () => {
      const data = new Uint8Array([0, 127, 255]);
      expect(AudioUtils.getBandEnergy(data, 10, 20)).toBe(0);
    });
  });

  describe('getBassEnergy', () => {
    it('should calculate bass energy (0-10% of spectrum)', () => {
      const data = new Uint8Array(100);
      data.fill(255, 0, 10); // Fill first 10% with max values
      expect(AudioUtils.getBassEnergy(data)).toBe(1);
    });

    it('should return 0 for no bass energy', () => {
      const data = new Uint8Array(100);
      data.fill(0, 0, 10); // Fill first 10% with zeros
      expect(AudioUtils.getBassEnergy(data)).toBe(0);
    });
  });

  describe('getMidEnergy', () => {
    it('should calculate mid energy (10-50% of spectrum)', () => {
      const data = new Uint8Array(100);
      data.fill(255, 10, 50); // Fill mid range with max values
      expect(AudioUtils.getMidEnergy(data)).toBe(1);
    });

    it('should return 0 for no mid energy', () => {
      const data = new Uint8Array(100);
      data.fill(0, 10, 50); // Fill mid range with zeros
      expect(AudioUtils.getMidEnergy(data)).toBe(0);
    });
  });

  describe('getTrebleEnergy', () => {
    it('should calculate treble energy (50-90% of spectrum)', () => {
      const data = new Uint8Array(100);
      data.fill(255, 50, 90); // Fill treble range with max values
      expect(AudioUtils.getTrebleEnergy(data)).toBe(1);
    });

    it('should return 0 for no treble energy', () => {
      const data = new Uint8Array(100);
      data.fill(0, 50, 90); // Fill treble range with zeros
      expect(AudioUtils.getTrebleEnergy(data)).toBe(0);
    });
  });

  describe('getCentroid', () => {
    it('should calculate spectral centroid', () => {
      const data = new Uint8Array(100);
      data.fill(255, 50, 100); // Higher frequencies have more energy
      expect(AudioUtils.getCentroid(data)).toBeGreaterThan(0.5);
    });

    it('should return 0 for empty array', () => {
      const data = new Uint8Array([]);
      expect(AudioUtils.getCentroid(data)).toBe(0);
    });

    it('should return 0 for all zeros', () => {
      const data = new Uint8Array(100);
      expect(AudioUtils.getCentroid(data)).toBe(0);
    });
  });

  describe('getDynamicRange', () => {
    it('should calculate dynamic range', () => {
      const data = new Uint8Array([0, 127, 255]);
      expect(AudioUtils.getDynamicRange(data)).toBe(1);
    });

    it('should return 0 for constant values', () => {
      const data = new Uint8Array([127, 127, 127]);
      expect(AudioUtils.getDynamicRange(data)).toBe(0);
    });
  });
});
