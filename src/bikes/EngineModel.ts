import { EngineConfig } from './BikeDefinition';

export class EngineModel {
  public currentRpm: number;
  public throttle: number = 0;
  public isAtLimiter: boolean = false;
  private limiterTimer: number = 0;

  constructor(private config: EngineConfig) {
    this.currentRpm = config.idleRpm;
  }

  public reset(): void {
    this.currentRpm = this.config.idleRpm;
    this.throttle = 0;
    this.isAtLimiter = false;
    this.limiterTimer = 0;
  }

  /**
   * Updates RPM based on throttle, wheel speed feedback, and clutch engagement
   */
  public update(
    dt: number,
    throttleInput: number,
    engagedWheelRpm: number | null,
    isClutchDisengaged: boolean = false
  ): void {
    this.throttle = Math.max(0, Math.min(1, throttleInput));

    // Handle soft rev limiter bouncing at redline
    if (this.currentRpm >= this.config.redlineRpm) {
      this.limiterTimer += dt;
      if (this.limiterTimer > 0.04) {
        this.isAtLimiter = true;
        this.limiterTimer = 0;
      }
    } else {
      this.isAtLimiter = false;
      this.limiterTimer = 0;
    }

    if (isClutchDisengaged || engagedWheelRpm === null) {
      // Neutral / clutch disengaged rev response
      const targetFreeRpm = this.isAtLimiter
        ? this.config.redlineRpm - 350
        : this.config.idleRpm + this.throttle * (this.config.maxRpm - this.config.idleRpm);

      const revSpeed = this.throttle > 0.1 ? 28000 : 12000;
      const rpmDelta = (targetFreeRpm - this.currentRpm) * (dt * revSpeed / 1000);
      this.currentRpm = Math.max(this.config.idleRpm, this.currentRpm + rpmDelta);
    } else {
      // Direct drivetrain coupling to rear wheel
      const targetEngagedRpm = Math.max(this.config.idleRpm, engagedWheelRpm);

      // Smooth RPM lag/coupling to simulate flywheel inertia
      const blend = Math.min(1.0, dt * (1.0 / this.config.flywheelInertia));
      this.currentRpm = this.currentRpm + (targetEngagedRpm - this.currentRpm) * blend;

      if (this.isAtLimiter && this.throttle > 0.8) {
        this.currentRpm = Math.min(this.config.maxRpm, this.currentRpm);
      }
    }

    // Hard clamps
    this.currentRpm = Math.max(this.config.idleRpm, Math.min(this.config.maxRpm, this.currentRpm));
  }

  /**
   * Computes engine output torque in Nm for the current RPM and throttle
   */
  public getTorque(): number {
    if (this.isAtLimiter) {
      return 0;
    }

    const { idleRpm, peakTorqueRpm, peakTorqueNm, maxRpm, engineBrakingTorque } = this.config;

    // Torque curve shape approximation for high-revving inline-4 with ShiftCam
    let torqueFactor: number;
    if (this.currentRpm < peakTorqueRpm) {
      const t = (this.currentRpm - idleRpm) / (peakTorqueRpm - idleRpm);
      torqueFactor = 0.55 + 0.45 * Math.sin(t * (Math.PI / 2));
    } else {
      const t = (this.currentRpm - peakTorqueRpm) / (maxRpm - peakTorqueRpm);
      torqueFactor = 1.0 - 0.22 * Math.pow(t, 1.3);
    }

    const positiveTorque = peakTorqueNm * torqueFactor * this.throttle;
    const engineBrake = engineBrakingTorque * (this.currentRpm / maxRpm) * (1 - this.throttle);

    return positiveTorque - engineBrake;
  }

  public get normalizedRpm(): number {
    return (this.currentRpm - this.config.idleRpm) / (this.config.maxRpm - this.config.idleRpm);
  }

  public get redlineRatio(): number {
    return this.config.redlineRpm / this.config.maxRpm;
  }
}
