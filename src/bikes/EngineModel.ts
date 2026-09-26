import { EngineConfig } from './BikeDefinition';

export type EngineLifecycleState = 'OFF' | 'STARTING' | 'IDLING' | 'RUNNING';

export class EngineModel {
  public currentRpm: number;
  public throttle: number = 0;
  public isAtLimiter: boolean = false;
  public state: EngineLifecycleState = 'RUNNING';

  private limiterTimer: number = 0;
  private idlePhase: number = 0;
  private startTimer: number = 0;

  constructor(private config: EngineConfig) {
    this.currentRpm = config.idleRpm;
  }

  public reset(): void {
    this.state = 'RUNNING';
    this.currentRpm = this.config.idleRpm;
    this.throttle = 0;
    this.isAtLimiter = false;
    this.limiterTimer = 0;
    this.idlePhase = 0;
    this.startTimer = 0;
  }

  public startEngine(): void {
    this.state = 'STARTING';
    this.startTimer = 0.45; // 450ms starter motor crank
    this.currentRpm = 350;
  }

  /**
   * Updates RPM based on throttle, wheel speed feedback, transmission shift state, and lifecycle
   */
  public update(
    dt: number,
    throttleInput: number,
    engagedWheelRpm: number | null,
    isShifting: boolean = false,
    isTorqueCut: boolean = false,
    postShiftTargetRpm: number = 0
  ): void {
    this.throttle = Math.max(0, Math.min(1, throttleInput));
    this.idlePhase += dt;

    // 1. Engine Lifecycle State Machine
    if (this.state === 'OFF') {
      this.currentRpm = Math.max(0, this.currentRpm - 2500 * dt);
      return;
    }

    if (this.state === 'STARTING') {
      this.startTimer -= dt;
      // Starter motor cranking sound/RPM
      this.currentRpm = 400 + Math.sin(this.idlePhase * 25) * 60;
      if (this.startTimer <= 0) {
        // Engine catches and flares to idle
        this.state = 'IDLING';
        this.currentRpm = this.config.idleRpm + 600;
      }
      return;
    }

    // 2. Realistic Idle Variation (combustion irregularity)
    const idleFlutter =
      Math.sin(this.idlePhase * 18.0) * 16.0 +
      Math.cos(this.idlePhase * 37.0) * 12.0 +
      (Math.random() - 0.5) * 8.0;
    const baseIdleRpm = this.config.idleRpm + idleFlutter;

    // 3. Rev limiter bouncing at redline
    if (this.currentRpm >= this.config.redlineRpm) {
      this.limiterTimer += dt;
      if (this.limiterTimer > 0.035) {
        this.isAtLimiter = true;
        this.limiterTimer = 0;
      }
    } else {
      this.isAtLimiter = false;
      this.limiterTimer = 0;
    }

    // 4. Upshift torque cut RPM drop
    if (isShifting && isTorqueCut && postShiftTargetRpm > 0) {
      // Rapidly drop RPM to target higher-gear RPM during quickshifter ignition cut
      const dropRate = Math.min(1.0, dt * 18.0);
      this.currentRpm = this.currentRpm + (postShiftTargetRpm - this.currentRpm) * dropRate;
      return;
    }

    // 5. Engaged vs Disengaged Drivetrain RPM
    if (engagedWheelRpm === null || engagedWheelRpm < baseIdleRpm * 0.5) {
      // Neutral / clutch disengaged rev response (blip throttle at standstill)
      const targetFreeRpm = this.isAtLimiter
        ? this.config.redlineRpm - 400
        : baseIdleRpm + this.throttle * (this.config.maxRpm - baseIdleRpm);

      const revSpeed = this.throttle > 0.05 ? 32000 : 9000;
      const rpmDelta = (targetFreeRpm - this.currentRpm) * (dt * revSpeed / 1000);
      this.currentRpm = Math.max(baseIdleRpm, this.currentRpm + rpmDelta);
    } else {
      // Direct drivetrain coupling to rear wheel
      const targetEngagedRpm = Math.max(baseIdleRpm, engagedWheelRpm);

      // Smooth RPM coupling to simulate flywheel inertia
      const blend = Math.min(1.0, dt * (1.0 / this.config.flywheelInertia));
      this.currentRpm = this.currentRpm + (targetEngagedRpm - this.currentRpm) * blend;

      if (this.isAtLimiter && this.throttle > 0.8) {
        this.currentRpm = Math.min(this.config.maxRpm, this.currentRpm);
      }
    }

    // Idle vs Running state update
    if (this.currentRpm > this.config.idleRpm + 400 || this.throttle > 0.05) {
      this.state = 'RUNNING';
    } else {
      this.state = 'IDLING';
    }

    // Clamps
    this.currentRpm = Math.max(this.config.idleRpm * 0.8, Math.min(this.config.maxRpm, this.currentRpm));
  }

  /**
   * Computes engine output torque in Nm for the current RPM and throttle
   */
  public getTorque(isTorqueCut: boolean = false): number {
    if (this.isAtLimiter || isTorqueCut || this.state === 'OFF' || this.state === 'STARTING') {
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
