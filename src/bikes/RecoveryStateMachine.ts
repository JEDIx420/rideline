import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { WorldSurfaceQuery } from '../world/WorldSurfaceQuery';

export type RecoveryState = 'NORMAL' | 'OFFROAD_WARNING' | 'RECOVERING' | 'COOLDOWN';

export class RecoveryStateMachine {
  public state: RecoveryState = 'NORMAL';
  public offroadTimer: number = 0;
  public cooldownTimer: number = 0;
  public recoveryTimer: number = 0;

  public readonly recoveryDuration: number = 0.45; // 450ms smooth blend
  public readonly offroadThresholdSec: number = 1.8;
  public readonly offroadMaxDist: number = 16.0; // 16m from centerline
  public readonly cooldownDuration: number = 1.0;

  // Recovery blend interpolation endpoints
  private startPosition: Vector3 = new Vector3(0, 0, 0);
  private targetPosition: Vector3 = new Vector3(0, 0, 0);
  private startHeadingRad: number = 0;
  private targetHeadingRad: number = 0;

  public reset(): void {
    this.state = 'NORMAL';
    this.offroadTimer = 0;
    this.cooldownTimer = 0;
    this.recoveryTimer = 0;
  }

  public triggerManual(currentPos: Vector3, surface: WorldSurfaceQuery, currentHeading: number): void {
    this.startRecovery(currentPos, surface, currentHeading);
  }

  private startRecovery(currentPos: Vector3, surface: WorldSurfaceQuery, currentHeading: number): void {
    this.state = 'RECOVERING';
    this.recoveryTimer = 0;
    this.offroadTimer = 0;

    this.startPosition.copyFrom(currentPos);
    this.targetPosition.copyFrom(surface.recoveryPoint);

    this.startHeadingRad = currentHeading;
    // Align forward with road tangent
    this.targetHeadingRad = Math.atan2(-surface.roadTangent.x, -surface.roadTangent.z);

    // Normalize angle difference to avoid spinning 360 degrees
    let diff = this.targetHeadingRad - this.startHeadingRad;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.targetHeadingRad = this.startHeadingRad + diff;
  }

  /**
   * Evaluates state transitions and returns updated physics values if recovering.
   */
  public update(
    dt: number,
    currentPos: Vector3,
    surface: WorldSurfaceQuery,
    currentHeading: number,
    _currentSpeedMps: number
  ): {
    isRecovering: boolean;
    blendedPosition?: Vector3;
    blendedHeading?: number;
    targetSpeedMps?: number;
  } {
    const distToCenter = surface.distanceToCenter;
    const isOffroad = surface.surfaceType === 'offroad' || distToCenter > 4.5;
    const isSevere =
      surface.surfaceType === 'out_of_bounds' ||
      surface.surfaceType === 'water' ||
      distToCenter > this.offroadMaxDist;

    switch (this.state) {
      case 'NORMAL': {
        if (isSevere) {
          this.startRecovery(currentPos, surface, currentHeading);
          return { isRecovering: true };
        } else if (isOffroad) {
          this.state = 'OFFROAD_WARNING';
          this.offroadTimer = dt;
        }
        return { isRecovering: false };
      }

      case 'OFFROAD_WARNING': {
        if (isSevere) {
          this.startRecovery(currentPos, surface, currentHeading);
          return { isRecovering: true };
        }

        if (isOffroad) {
          this.offroadTimer += dt;
          if (this.offroadTimer >= this.offroadThresholdSec) {
            this.startRecovery(currentPos, surface, currentHeading);
            return { isRecovering: true };
          }
        } else {
          // Returned to asphalt / shoulder safely
          this.state = 'NORMAL';
          this.offroadTimer = 0;
        }
        return { isRecovering: false };
      }

      case 'RECOVERING': {
        this.recoveryTimer += dt;
        const rawT = Math.min(1.0, this.recoveryTimer / this.recoveryDuration);
        // Smooth cubic ease-in-out
        const t = rawT * rawT * (3.0 - 2.0 * rawT);

        const blendedPosition = Vector3.Lerp(this.startPosition, this.targetPosition, t);
        const blendedHeading = this.startHeadingRad + (this.targetHeadingRad - this.startHeadingRad) * t;
        const targetSpeedMps = 11.1; // Cruise safely at 40 km/h

        if (rawT >= 1.0) {
          this.state = 'COOLDOWN';
          this.cooldownTimer = 0;
          this.offroadTimer = 0;
        }

        return {
          isRecovering: true,
          blendedPosition,
          blendedHeading,
          targetSpeedMps,
        };
      }

      case 'COOLDOWN': {
        this.cooldownTimer += dt;
        if (this.cooldownTimer >= this.cooldownDuration) {
          this.state = isOffroad ? 'OFFROAD_WARNING' : 'NORMAL';
          this.offroadTimer = 0;
        }
        return { isRecovering: false };
      }
    }
  }
}
