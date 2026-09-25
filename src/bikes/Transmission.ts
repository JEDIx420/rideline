import { TransmissionConfig } from './BikeDefinition';

export class Transmission {
  public currentGear: number = 1; // 1 to 6
  public isShifting: boolean = false;
  private shiftTimer: number = 0;

  constructor(private config: TransmissionConfig) {}

  public reset(): void {
    this.currentGear = 1;
    this.isShifting = false;
    this.shiftTimer = 0;
  }

  /**
   * Automatic gear management
   */
  public update(dt: number, currentRpm: number, speedMps: number, throttle: number, brake: number): void {
    if (this.isShifting) {
      this.shiftTimer -= dt;
      if (this.shiftTimer <= 0) {
        this.isShifting = false;
      }
      return;
    }

    // Automatic upshift
    if (
      this.currentGear < this.config.gearRatios.length - 1 &&
      currentRpm >= this.config.upshiftRpm &&
      throttle > 0.4
    ) {
      this.shiftUp();
      return;
    }

    // Automatic downshift
    if (this.currentGear > 1) {
      const isBrakingHard = brake > 0.3;
      const downshiftThreshold = isBrakingHard
        ? this.config.downshiftRpm + 1800
        : this.config.downshiftRpm;

      if (currentRpm <= downshiftThreshold && speedMps < this.getExpectedSpeedForGear(this.currentGear - 1)) {
        this.shiftDown();
      }
    }
  }

  public shiftUp(): boolean {
    if (this.currentGear < this.config.gearRatios.length - 1) {
      this.currentGear++;
      this.isShifting = true;
      this.shiftTimer = this.config.shiftDelaySeconds;
      return true;
    }
    return false;
  }

  public shiftDown(): boolean {
    if (this.currentGear > 1) {
      this.currentGear--;
      this.isShifting = true;
      this.shiftTimer = this.config.shiftDelaySeconds;
      return true;
    }
    return false;
  }

  /**
   * Total gear reduction ratio from crankshaft to rear wheel
   */
  public getTotalRatio(): number {
    const gearRatio = this.config.gearRatios[this.currentGear] || this.config.gearRatios[1];
    return this.config.primaryReduction * gearRatio * this.config.finalDriveRatio;
  }

  /**
   * Calculates expected crankshaft RPM for a given road speed in meters/second
   */
  public calculateRpmFromSpeed(speedMps: number, wheelRadiusM: number): number {
    const wheelRadsPerSec = speedMps / wheelRadiusM;
    const wheelRpm = (wheelRadsPerSec * 60) / (2 * Math.PI);
    return wheelRpm * this.getTotalRatio();
  }

  private getExpectedSpeedForGear(gear: number): number {
    // Rough speed threshold table (m/s) for smooth downshifts
    const gearMaxMps = [0, 28, 42, 58, 70, 80, 88];
    return (gearMaxMps[gear] || 20) * 0.75;
  }
}
