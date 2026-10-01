import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { RiderRig } from './RiderRig';
import { RiderBikeProfile } from './RiderBikeProfile';
import { RiderIK, RiderTargets } from './RiderIK';
import { BikeController } from '../bikes/BikeController';

export interface RiderPoseLayerState {
  tuckFactor: number;
  spinePitch: number;
  spineRoll: number;
  spineYaw: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  pelvisOffset: Vector3;
}

export class RiderPoseGraph {
  // Layer state caches for smooth evaluation
  public state: RiderPoseLayerState = {
    tuckFactor: 0.0,
    spinePitch: 0.42,
    spineRoll: 0.0,
    spineYaw: 0.0,
    headPitch: -0.15,
    headYaw: 0.0,
    headRoll: 0.0,
    pelvisOffset: new Vector3(0, 0, 0),
  };

  /**
   * Evaluates the complete 5-layer rider kinematic graph:
   * Layer 0: Base Ergonomics
   * Layer 1: Longitudinal G-Force (Tuck vs Brace)
   * Layer 2: Lateral Lean & Weight Shift
   * Layer 3: Control Actuation (Throttle, Brake, Shifter, Footbrake)
   * Layer 4: Analytical 2-Bone IK (Hands to grips, Feet to rearsets)
   * Layer 5: Dynamic Look-Ahead & Horizon Leveling
   */
  public evaluate(
    dt: number,
    bike: BikeController,
    profile: RiderBikeProfile,
    rig: RiderRig,
    targets?: RiderTargets | null,
    lookAheadTangent?: Vector3
  ): void {
    const physics = bike.physics;
    const speedKmh = physics.speedKmh;
    const accel = physics.accelerationMps2;
    const lean = physics.leanAngleRad; // Negative = left, Positive = right

    // ========================================================
    // LAYER 0 & 1: BASE ERGONOMICS + LONGITUDINAL DYNAMICS
    // ========================================================
    // Aerodynamic tuck responds smoothly above 75 km/h
    const targetTuck = Math.min(1.0, Math.max(0, (speedKmh - 75) / 100));
    this.state.tuckFactor += (targetTuck - this.state.tuckFactor) * Math.min(1.0, dt * 8.0);

    const isBraking = accel < -2.0;
    const isAccelerating = accel > 2.0;
    const accelPitchDelta = isAccelerating ? -0.06 * Math.min(1.0, (accel - 2.0) / 6.0) : 0;
    const brakePitchDelta = isBraking ? +0.08 * Math.min(1.0, Math.abs(accel + 2.0) / 7.0) : 0;

    const basePitch = profile.baseSpinePitch;
    const tuckPitch = profile.tuckSpinePitch * this.state.tuckFactor;
    const targetSpinePitch = basePitch + tuckPitch + accelPitchDelta + brakePitchDelta;

    // ========================================================
    // LAYER 2: LATERAL LEAN & WEIGHT SHIFT
    // ========================================================
    const targetSpineRoll = -lean * 0.38;
    const targetSpineYaw = -lean * 0.16;

    const maxLeanRad = (48 * Math.PI) / 180;
    const targetPelvisX = (lean / maxLeanRad) * 0.032;
    const targetPelvisY = -Math.abs(lean) * 0.015;
    const targetPelvisZ = this.state.tuckFactor * profile.tuckPelvisOffset.z;

    // ========================================================
    // LAYER 5: LOOK-AHEAD & HORIZON STABILIZATION
    // ========================================================
    let roadGlanceYaw = 0;
    if (lookAheadTangent) {
      const bikeFwdX = -Math.sin(physics.headingRad);
      const bikeFwdZ = -Math.cos(physics.headingRad);
      const crossY = bikeFwdX * lookAheadTangent.z - bikeFwdZ * lookAheadTangent.x;
      roadGlanceYaw = Math.max(-0.45, Math.min(0.45, crossY * 0.85));
    }

    const targetHeadPitch = -targetSpinePitch * 0.72 + 0.12;
    const targetHeadYaw = -lean * 0.28 + roadGlanceYaw;
    const targetHeadRoll = -targetSpineRoll * 0.50; // Counter-bank to keep eyes horizontal

    // Interpolate torso posture smoothly
    const lerpRate = Math.min(1.0, dt * 14.0);
    this.state.spinePitch += (targetSpinePitch - this.state.spinePitch) * lerpRate;
    this.state.spineRoll += (targetSpineRoll - this.state.spineRoll) * lerpRate;
    this.state.spineYaw += (targetSpineYaw - this.state.spineYaw) * lerpRate;

    this.state.headPitch += (targetHeadPitch - this.state.headPitch) * lerpRate;
    this.state.headYaw += (targetHeadYaw - this.state.headYaw) * lerpRate;
    this.state.headRoll += (targetHeadRoll - this.state.headRoll) * lerpRate;

    this.state.pelvisOffset = Vector3.Lerp(
      this.state.pelvisOffset,
      new Vector3(targetPelvisX, targetPelvisY, targetPelvisZ),
      lerpRate
    );

    // Apply Pelvis & Progressive Spine
    rig.setBoneEulerRotation(
      rig.hips,
      profile.pelvisRotation.x,
      profile.pelvisRotation.y + this.state.spineYaw * 0.3,
      profile.pelvisRotation.z + this.state.spineRoll * 0.3
    );

    const sectionPitch = this.state.spinePitch / 3.0;
    const sectionRoll = this.state.spineRoll / 3.0;
    const sectionYaw = this.state.spineYaw / 3.0;
    rig.setBoneEulerRotation(rig.spine, sectionPitch, sectionYaw, sectionRoll);
    rig.setBoneEulerRotation(rig.spine1, sectionPitch, sectionYaw, sectionRoll);
    rig.setBoneEulerRotation(rig.spine2, sectionPitch, sectionYaw, sectionRoll);

    // Neck & Head
    rig.setBoneEulerRotation(rig.neck, -this.state.spinePitch * 0.40, this.state.headYaw * 0.4, this.state.headRoll * 0.4);
    rig.setBoneEulerRotation(rig.head, -this.state.spinePitch * 0.50, this.state.headYaw * 0.6, this.state.headRoll * 0.6);

    // Clavicles
    const clavicleFlex = this.state.tuckFactor * 0.08;
    rig.setBoneEulerRotation(rig.leftShoulder, 0.08 + clavicleFlex, 0.12, 0);
    rig.setBoneEulerRotation(rig.rightShoulder, 0.08 + clavicleFlex, -0.12, 0);

    // ========================================================
    // LAYER 3 & 4: CONTROL ACTIONS & ANALYTICAL 2-BONE IK
    // ========================================================
    const shiftDuration = 0.25;
    const isShifting = bike.transmission.timeSinceLastShiftSec < shiftDuration;
    const shiftAction = isShifting ? bike.transmission.lastShiftDirection : 'none';
    const shiftProgress = isShifting ? Math.min(1.0, bike.transmission.timeSinceLastShiftSec / shiftDuration) : 0;

    RiderIK.applyLimbIK(
      rig,
      profile,
      physics.steerAngleRad,
      targets,
      physics.leanAngleRad,
      bike.lastInputs.throttle,
      bike.lastInputs.brake,
      shiftAction,
      shiftProgress
    );
  }
}
