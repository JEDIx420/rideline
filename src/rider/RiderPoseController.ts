import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { RiderRig } from './RiderRig';
import { RiderBikeProfile } from './RiderBikeProfile';
import { BikeController } from '../bikes/BikeController';

export class RiderPoseController {
  // Current dynamic posture state
  public currentSpinePitch: number = 0.42;
  public currentSpineRoll: number = 0.0;
  public currentSpineYaw: number = 0.0;

  public currentHeadPitch: number = -0.15;
  public currentHeadYaw: number = 0.0;
  public currentHeadRoll: number = 0.0;

  public currentPelvisOffset: Vector3 = new Vector3(0, 0, 0);
  public currentTuckFactor: number = 0.0;

  public update(
    dt: number,
    bike: BikeController,
    profile: RiderBikeProfile,
    rig: RiderRig,
    lookAheadTangent?: Vector3
  ): void {
    const physics = bike.physics;
    const speedMps = physics.speedMps;
    const speedKmh = speedMps * 3.6;
    const accel = physics.accelerationMps2;
    const lean = physics.leanAngleRad; // Negative = left, Positive = right

    // 1. High-Speed Aerodynamic Tuck (80 km/h to 180+ km/h)
    const targetTuck = Math.min(1.0, Math.max(0, (speedKmh - 75) / 100)); // 0 at 75km/h, 1 at 175km/h
    this.currentTuckFactor += (targetTuck - this.currentTuckFactor) * Math.min(1.0, dt * 8.0);

    // 2. Acceleration Pull vs Braking Brace
    const isBraking = accel < -2.0;
    const isAccelerating = accel > 2.0;

    const accelPitchDelta = isAccelerating ? -0.06 * Math.min(1.0, (accel - 2.0) / 6.0) : 0;
    const brakePitchDelta = isBraking ? +0.08 * Math.min(1.0, Math.abs(accel + 2.0) / 7.0) : 0;

    // 3. Torso Forward Lean Target
    const basePitch = profile.baseSpinePitch;
    const tuckPitch = profile.tuckSpinePitch * this.currentTuckFactor;
    const targetSpinePitch = basePitch + tuckPitch + accelPitchDelta + brakePitchDelta;

    // 4. Cornering Lean & Apex Glance
    // Torso drops subtly inside the turn
    const targetSpineRoll = -lean * 0.38;
    const targetSpineYaw = -lean * 0.16;

    // Pelvis lateral slide across saddle
    const maxLeanRad = (48 * Math.PI) / 180;
    const targetPelvisX = (lean / maxLeanRad) * 0.032;
    const targetPelvisY = -Math.abs(lean) * 0.015;
    const targetPelvisZ = this.currentTuckFactor * profile.tuckPelvisOffset.z;

    // Head posture: lift chin when tucked, turn head towards corner exit
    let roadGlanceYaw = 0;
    if (lookAheadTangent) {
      const bikeFwdX = -Math.sin(physics.headingRad);
      const bikeFwdZ = -Math.cos(physics.headingRad);
      const crossY = bikeFwdX * lookAheadTangent.z - bikeFwdZ * lookAheadTangent.x;
      roadGlanceYaw = Math.max(-0.45, Math.min(0.45, crossY * 0.85));
    }

    const targetHeadPitch = -targetSpinePitch * 0.72 + 0.12;
    const targetHeadYaw = -lean * 0.28 + roadGlanceYaw;
    const targetHeadRoll = -targetSpineRoll * 0.50; // Counter-bank head to keep horizon level

    // 5. Smooth Interpolation
    const lerpRate = Math.min(1.0, dt * 14.0);
    this.currentSpinePitch += (targetSpinePitch - this.currentSpinePitch) * lerpRate;
    this.currentSpineRoll += (targetSpineRoll - this.currentSpineRoll) * lerpRate;
    this.currentSpineYaw += (targetSpineYaw - this.currentSpineYaw) * lerpRate;

    this.currentHeadPitch += (targetHeadPitch - this.currentHeadPitch) * lerpRate;
    this.currentHeadYaw += (targetHeadYaw - this.currentHeadYaw) * lerpRate;
    this.currentHeadRoll += (targetHeadRoll - this.currentHeadRoll) * lerpRate;

    this.currentPelvisOffset = Vector3.Lerp(
      this.currentPelvisOffset,
      new Vector3(targetPelvisX, targetPelvisY, targetPelvisZ),
      lerpRate
    );

    // 6. Apply Spine & Head Articulation to Rig
    // Pelvis
    rig.setBoneEulerRotation(
      rig.hips,
      profile.pelvisRotation.x,
      profile.pelvisRotation.y + this.currentSpineYaw * 0.3,
      profile.pelvisRotation.z + this.currentSpineRoll * 0.3
    );

    // Progressive Spine curvature (Spine -> Spine1 -> Spine2)
    const spineSectionPitch = this.currentSpinePitch / 3.0;
    const spineSectionRoll = this.currentSpineRoll / 3.0;
    const spineSectionYaw = this.currentSpineYaw / 3.0;

    rig.setBoneEulerRotation(rig.spine, spineSectionPitch, spineSectionYaw, spineSectionRoll);
    rig.setBoneEulerRotation(rig.spine1, spineSectionPitch, spineSectionYaw, spineSectionRoll);
    rig.setBoneEulerRotation(rig.spine2, spineSectionPitch, spineSectionYaw, spineSectionRoll);

    // Neck & Head: lift chin to look ahead through visor
    rig.setBoneEulerRotation(rig.neck, -this.currentSpinePitch * 0.40, this.currentHeadYaw * 0.4, this.currentHeadRoll * 0.4);
    rig.setBoneEulerRotation(rig.head, -this.currentSpinePitch * 0.50, this.currentHeadYaw * 0.6, this.currentHeadRoll * 0.6);

    // 7. Clavicle & Shoulder Posture for reach to clip-ons
    const clavicleTuckFlex = this.currentTuckFactor * 0.08;
    rig.setBoneEulerRotation(rig.leftShoulder, 0.08 + clavicleTuckFlex, 0.12, 0);
    rig.setBoneEulerRotation(rig.rightShoulder, 0.08 + clavicleTuckFlex, -0.12, 0);
  }
}
