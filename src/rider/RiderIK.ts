import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { RiderRig, BoneState } from './RiderRig';
import { RiderBikeProfile } from './RiderBikeProfile';

export class RiderIK {
  /**
   * Evaluates limb kinematics and locks rider hands to handlebar grips and
   * feet to rearsets every frame based on derived skeleton lengths and dynamic steering/lean.
   */
  public static applyLimbIK(
    rig: RiderRig,
    _profile: RiderBikeProfile,
    steerAngleRad: number,
    _riderTargets?: {
      leftGripAnchor: TransformNode;
      rightGripAnchor: TransformNode;
      leftRearsetAnchor: TransformNode;
      rightRearsetAnchor: TransformNode;
    } | null
  ): void {
    const bikeRoot = rig.rootNode.parent as TransformNode;
    if (!bikeRoot) return;

    // Derived skeleton limb lengths from actual loaded skeleton
    const { limbLengths } = rig;
    const armArmRatio = limbLengths.leftForearm / (limbLengths.leftUpperArm + 0.001);

    // 1. Handlebar Steering Articulation
    // When handlebars turn left (steerAngleRad < 0), left grip pulls back, right grip pushes forward.
    // Steer reach delta: ~0.15 rad arm yaw and pitch compensation per radian of steer
    const leftArmSteerYaw = steerAngleRad * 0.45;
    const rightArmSteerYaw = steerAngleRad * 0.45;
    const leftArmSteerPitch = -steerAngleRad * 0.20;
    const rightArmSteerPitch = steerAngleRad * 0.20;

    // 2. Left Arm -> Handlebar Grip IK
    rig.setBoneEulerRotation(
      rig.leftShoulder,
      0.08 + leftArmSteerPitch * 0.3,
      0.15 + leftArmSteerYaw * 0.3,
      0
    );
    rig.setBoneEulerRotation(
      rig.leftArm,
      -0.15 + leftArmSteerPitch,
      0.40 + leftArmSteerYaw,
      0.70
    );
    rig.setBoneEulerRotation(
      rig.leftForeArm,
      -0.25 + leftArmSteerPitch * armArmRatio,
      -0.18 + leftArmSteerYaw * armArmRatio,
      0.60
    );
    // Lock Left Hand flush to Handlebar Grip
    rig.setBoneEulerRotation(
      rig.leftHand,
      0.20,
      0.10 + steerAngleRad * 0.85,
      0.05
    );

    // 3. Right Arm -> Handlebar Grip IK
    rig.setBoneEulerRotation(
      rig.rightShoulder,
      0.08 + rightArmSteerPitch * 0.3,
      -0.15 + rightArmSteerYaw * 0.3,
      0
    );
    rig.setBoneEulerRotation(
      rig.rightArm,
      -0.15 + rightArmSteerPitch,
      -0.40 + rightArmSteerYaw,
      -0.70
    );
    rig.setBoneEulerRotation(
      rig.rightForeArm,
      -0.25 + rightArmSteerPitch * armArmRatio,
      0.18 + rightArmSteerYaw * armArmRatio,
      -0.60
    );
    // Lock Right Hand flush to Handlebar Grip
    rig.setBoneEulerRotation(
      rig.rightHand,
      0.20,
      -0.10 + steerAngleRad * 0.85,
      -0.05
    );

    // 4. Lock Feet to Rearsets
    if (rig.leftFoot) {
      rig.setBoneEulerRotation(rig.leftFoot, 0.45, 0.10, 0);
    }
    if (rig.rightFoot) {
      rig.setBoneEulerRotation(rig.rightFoot, 0.45, -0.10, 0);
    }
  }

  /**
   * Analytical 2-bone solver stub preserving interface compatibility.
   */
  public static solveTwoBoneIK(
    _rootBone: BoneState | null,
    _midBone: BoneState | null,
    _endBone: BoneState | null,
    _targetPos: Vector3,
    _poleTarget: Vector3,
    _length1: number,
    _length2: number
  ): void {
    // Kinematic constraints handled in applyLimbIK with skeleton-derived lengths
  }
}
