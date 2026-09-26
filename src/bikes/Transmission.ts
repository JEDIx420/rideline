import { TransmissionConfig } from './BikeDefinition';

export type ShiftState = 'IN_GEAR' | 'TORQUE_CUT' | 'CHANGE_GEAR' | 'REENGAGE' | 'LOCKOUT';

export class Transmission {
  public currentGear: number = 1; // 1 to 6
  public shiftState: ShiftState = 'IN_GEAR';
  public isShifting: boolean = false;
  public isTorqueCut: boolean = false;
  public lastShiftDirection: 'up' | 'down' | 'none' = 'none';

  public timeSinceLastShiftSec: number = 999;
  public preShiftRpm: number = 0;
  public postShiftTargetRpm: number = 0;

  private stateTimer: number = 0;
  private pendingNextGear: number = 1;

  // Calibrated sportbike quickshifter timings
  private readonly TORQUE_CUT_DUR = 0.075;   // 75ms torque cut
  private readonly CHANGE_GEAR_DUR = 0.045;  // 45ms gear engagement
  private readonly REENGAGE_DUR = 0.080;     // 80ms clutch / throttle re-engagement
  private readonly MIN_SHIFT_HOLD = 0.400;   // 400ms minimum spacing between gear shifts

  constructor(private config: TransmissionConfig) {}

  public reset(): void {
    this.currentGear = 1;
    this.shiftState = 'IN_GEAR';
    this.isShifting = false;
    this.isTorqueCut = false;
    this.timeSinceLastShiftSec = 999;
    this.preShiftRpm = 0;
    this.postShiftTargetRpm = 0;
    this.stateTimer = 0;
    this.pendingNextGear = 1;
  }

  /**
   * Sequential Automatic Transmission update loop
   */
  public update(
    dt: number,
    currentRpm: number,
    speedMps: number,
    throttle: number,
    brake: number,
    wheelRadiusM: number
  ): void {
    this.timeSinceLastShiftSec += dt;

    switch (this.shiftState) {
      case 'IN_GEAR': {
        this.isShifting = false;
        this.isTorqueCut = false;

        // 1. Automatic sequential upshift (strictly 1 gear at a time)
        const canUpshift =
          this.currentGear < this.config.gearRatios.length - 1 &&
          currentRpm >= this.config.upshiftRpm &&
          throttle > 0.35 &&
          this.timeSinceLastShiftSec >= this.MIN_SHIFT_HOLD;

        if (canUpshift) {
          this.triggerShift(this.currentGear + 1, currentRpm, speedMps, wheelRadiusM, true);
          return;
        }

        // 2. Automatic sequential downshift
        const isBraking = brake > 0.25;
        const downshiftThreshold = isBraking
          ? this.config.downshiftRpm + 1500
          : this.config.downshiftRpm;

        const canDownshift =
          this.currentGear > 1 &&
          throttle < 0.25 &&
          currentRpm <= downshiftThreshold &&
          this.timeSinceLastShiftSec >= this.MIN_SHIFT_HOLD;

        if (canDownshift) {
          this.triggerShift(this.currentGear - 1, currentRpm, speedMps, wheelRadiusM, false);
          return;
        }
        break;
      }

      case 'TORQUE_CUT': {
        this.isShifting = true;
        this.isTorqueCut = true;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.shiftState = 'CHANGE_GEAR';
          this.stateTimer = this.CHANGE_GEAR_DUR;
          // Change gear ONLY during this phase
          this.currentGear = this.pendingNextGear;
        }
        break;
      }

      case 'CHANGE_GEAR': {
        this.isShifting = true;
        this.isTorqueCut = true;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.shiftState = 'REENGAGE';
          this.stateTimer = this.REENGAGE_DUR;
          this.isTorqueCut = false;
        }
        break;
      }

      case 'REENGAGE': {
        this.isShifting = true;
        this.isTorqueCut = false;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.shiftState = 'LOCKOUT';
          this.stateTimer = this.MIN_SHIFT_HOLD - (this.TORQUE_CUT_DUR + this.CHANGE_GEAR_DUR + this.REENGAGE_DUR);
          this.isShifting = false;
        }
        break;
      }

      case 'LOCKOUT': {
        this.isShifting = false;
        this.isTorqueCut = false;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.shiftState = 'IN_GEAR';
        }
        break;
      }
    }
  }

  private triggerShift(
    targetGear: number,
    currentRpm: number,
    speedMps: number,
    wheelRadiusM: number,
    isUpshift: boolean
  ): void {
    this.pendingNextGear = targetGear;
    this.preShiftRpm = currentRpm;
    this.postShiftTargetRpm = this.calculateRpmForGear(speedMps, wheelRadiusM, targetGear);
    this.timeSinceLastShiftSec = 0;
    this.lastShiftDirection = isUpshift ? 'up' : 'down';

    if (isUpshift) {
      // Upshifts initiate with torque cut
      this.shiftState = 'TORQUE_CUT';
      this.stateTimer = this.TORQUE_CUT_DUR;
      this.isShifting = true;
      this.isTorqueCut = true;
    } else {
      // Downshifts change gear with engine blip
      this.shiftState = 'CHANGE_GEAR';
      this.stateTimer = this.CHANGE_GEAR_DUR;
      this.isShifting = true;
      this.isTorqueCut = false;
      this.currentGear = targetGear;
    }
  }

  public shiftUp(speedMps: number, wheelRadiusM: number, currentRpm: number): boolean {
    if (this.shiftState === 'IN_GEAR' && this.currentGear < this.config.gearRatios.length - 1) {
      this.triggerShift(this.currentGear + 1, currentRpm, speedMps, wheelRadiusM, true);
      return true;
    }
    return false;
  }

  public shiftDown(speedMps: number, wheelRadiusM: number, currentRpm: number): boolean {
    if (this.shiftState === 'IN_GEAR' && this.currentGear > 1) {
      this.triggerShift(this.currentGear - 1, currentRpm, speedMps, wheelRadiusM, false);
      return true;
    }
    return false;
  }

  /**
   * Total gear reduction ratio from crankshaft to rear wheel for a specific gear
   */
  public getTotalRatioForGear(gear: number): number {
    const gearRatio = this.config.gearRatios[gear] || this.config.gearRatios[1];
    return this.config.primaryReduction * gearRatio * this.config.finalDriveRatio;
  }

  /**
   * Current total reduction ratio
   */
  public getTotalRatio(): number {
    return this.getTotalRatioForGear(this.currentGear);
  }

  /**
   * Calculates expected crankshaft RPM for a given road speed in meters/second in a specific gear
   */
  public calculateRpmForGear(speedMps: number, wheelRadiusM: number, gear: number): number {
    const wheelRadsPerSec = speedMps / wheelRadiusM;
    const wheelRpm = (wheelRadsPerSec * 60) / (2 * Math.PI);
    return Math.max(1200, wheelRpm * this.getTotalRatioForGear(gear));
  }

  /**
   * Calculates expected crankshaft RPM for current gear
   */
  public calculateRpmFromSpeed(speedMps: number, wheelRadiusM: number): number {
    return this.calculateRpmForGear(speedMps, wheelRadiusM, this.currentGear);
  }
}
