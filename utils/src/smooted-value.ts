/**
 * A class for smoothing values over time.
 * 
 * @remarks
 * This class is useful for smoothing values over time, such as audio data.
 * 
 */
export class SmoothedValue {
  /**
   * The current value of the smoothed value.
   */
  private value = 0;

  /**
   * The alpha value for the smoothing.
   */
  constructor(private alpha = 0.8) { }

  /**
   * Updates the smoothed value with a new value.
   * 
   * @param next - The next value to smooth.
   * @returns The smoothed value.
   */
  update(next: number): number {
    this.value = this.alpha * next + (1 - this.alpha) * this.value;
    return this.value;
  }

  /**
   * Gets the current value of the smoothed value.
   * 
   * @returns The current value of the smoothed value.
   */
  get(): number {
    return this.value;
  }

  /**
   * Resets the smoothed value to a new value.
   * 
   * @param val - The new value to reset the smoothed value to.
   */
  reset(val = 0) {
    this.value = val;
  }
}
