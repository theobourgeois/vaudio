export class SmoothedValue {
  private value = 0;

  constructor(private alpha = 0.8) { }

  update(next: number): number {
    this.value = this.alpha * next + (1 - this.alpha) * this.value;
    return this.value;
  }

  get(): number {
    return this.value;
  }

  reset(val = 0) {
    this.value = val;
  }
}
