import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { RiderRigNodes } from './RiderMeshBuilder';
import { BikeController } from '../bikes/BikeController';

export class RiderPoseController {
  private currentSpinePitch: number = 0.35; // Default forward lean over tank
  private currentSpineRoll: number = 0.0;
  private currentSpineYaw: number = 0.0;
  private currentHeadPitch: number = -0.25;
  private currentHeadYaw: number = 0.0;
  private currentPelvisOffset: Vector3 = new Vector3(0, 0, 0);

  public update(dt: number, bike: BikeController, rig: RiderRigNodes): void {
    const physics = bike.physics;
    const speedMps = physics.speedMps;
    const speedKmh = speedMps * 3.6;
    const accel = physics.accelerationMps2;
    const lean = physics.leanAngleRad; // Positive = leaning right, Negative = leaning left
    const brake = bike.engine.throttle === 0 && physics.speedMps > 5.0 && accel < -2.0 ? Math.min(1.0, -accel / 8.0) : 0;

    // 1. Aerodynamic Tuck State (speed > 160 km/h)
    const speedTuckFactor = Math.min(1.0, Math.max(0, (speedKmh - 120) / 100)); // 0 at 120km/h, 1 at 220km/h

    // 2. Acceleration Pull vs Braking Brace Target Pitch
    // Base forward lean = ~0.35 rad (~20 deg)
    // High-speed tuck = up to ~0.72 rad (~41 deg forward crouch)
    // Hard acceleration = +0.15 rad drop
    // Hard braking = -0.18 rad rise (bracing arms against deceleration)
    const targetSpinePitch = 0.35 + speedTuckFactor * 0.38 + (accel > 1.0 ? 0.12 : 0) - (brake > 0.1 ? brake * 0.18 : 0);

    // 3. Cornering Hang-off & Apex Glance
    // Upper body drops inside the corner
    const targetSpineRoll = -lean * 0.45;
    const targetSpineYaw = -lean * 0.20;

    // Pelvis lateral shift across saddle (subtle body positioning)
    const targetPelvisX = (lean / ((54 * Math.PI) / 180)) * 0.04;
    const targetPelvisY = -Math.abs(lean) * 0.02;

    // Head posture: lifts chin when tucked to keep sightline forward down the road, and turns head toward apex exit
    const targetHeadPitch = -(targetSpinePitch * 0.75) + 0.10;
    const targetHeadYaw = -lean * 0.35; // Looking through the turn

    // 4. Smooth Damped Interpolation
    const lerpRate = Math.min(1.0, dt * 14.0);
    this.currentSpinePitch += (targetSpinePitch - this.currentSpinePitch) * lerpRate;
    this.currentSpineRoll += (targetSpineRoll - this.currentSpineRoll) * lerpRate;
    this.currentSpineYaw += (targetSpineYaw - this.currentSpineYaw) * lerpRate;

    this.currentHeadPitch += (targetHeadPitch - this.currentHeadPitch) * lerpRate;
    this.currentHeadYaw += (targetHeadYaw - this.currentHeadYaw) * lerpRate;

    this.currentPelvisOffset = Vector3.Lerp(
      this.currentPelvisOffset,
      new Vector3(targetPelvisX, targetPelvisY, 0),
      lerpRate
    );

    // 5. Apply Transforms to Skeleton Nodes
    rig.pelvis.position.x = this.currentPelvisOffset.x;
    rig.pelvis.position.y = this.currentPelvisOffset.y;

    // Spine flexion
    rig.spineLower.rotation.x = this.currentSpinePitch * 0.4;
    rig.spineLower.rotation.z = this.currentSpineRoll * 0.3;
    rig.spineLower.rotation.y = this.currentSpineYaw * 0.3;

    rig.spineUpper.rotation.x = this.currentSpinePitch * 0.4;
    rig.spineUpper.rotation.z = this.currentSpineRoll * 0.4;

    rig.chest.rotation.x = this.currentSpinePitch * 0.2;
    rig.chest.rotation.z = this.currentSpineRoll * 0.3;
    rig.chest.rotation.y = this.currentSpineYaw * 0.4;

    // Head looking down the road & into apex
    rig.head.rotation.x = this.currentHeadPitch;
    rig.head.rotation.y = this.currentHeadYaw;
    rig.head.rotation.z = -this.currentSpineRoll * 0.25; // Keep horizon relatively level

    // Subtle knee flare on inside leg during cornering
    if (lean < -0.1) {
      // Left turn: open left knee
      rig.hipL.rotation.y = -0.35 * Math.abs(lean);
      rig.hipR.rotation.y = 0;
    } else if (lean > 0.1) {
      // Right turn: open right knee
      rig.hipR.rotation.y = 0.35 * Math.abs(lean);
      rig.hipL.rotation.y = 0;
    } else {
      rig.hipL.rotation.y = 0;
      rig.hipR.rotation.y = 0;
    }
  }
}
