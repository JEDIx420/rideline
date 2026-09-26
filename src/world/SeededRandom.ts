/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Enables perfectly reproducible procedural road, terrain, and scenery generation.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed >>> 0;
  }

  public setSeed(seed: number): void {
    this.state = seed >>> 0;
  }

  /**
   * Generates a floating-point number in [0, 1).
   */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a floating-point number in [min, max).
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates an integer in [min, max] (inclusive).
   */
  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Generates a standard normally distributed number (mean = 0, stdDev = 1).
   * Box-Muller transform.
   */
  public gaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = Math.max(1e-8, this.next());
    const u2 = this.next();
    const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + stdDev * randStdNormal;
  }

  /**
   * Selects a random element from an array.
   */
  public choice<T>(array: T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }
}
