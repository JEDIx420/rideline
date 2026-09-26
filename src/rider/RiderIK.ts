import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { RiderRig, BoneState } from './RiderRig';
import { RiderBikeProfile } from './RiderBikeProfile';

export interface RiderTargets {
  seatAnchor: TransformNode;
  leftGripAnchor: TransformNode;
  rightGripAnchor: TransformNode;
  leftRearsetAnchor: TransformNode;
  rightRearsetAnchor: TransformNode;
}

export class RiderIK {
  /**
   * True analytical 2-bone Inverse Kinematics solver based on the Law of Cosines.
   * Accurately solves joint positions and orientations to place end-effectors
   * (hands on grips, feet on rearsets) minimizing Euclidean error.
   */
  public static solveTwoBoneIK(
    rootBone: BoneState | null,
    midBone: BoneState | null,
    endBone: BoneState | null,
    targetWorldPos: Vector3,
    poleTargetWorldPos: Vector3,
    l1: number,
    l2: number
  ): void {
    if (!rootBone || !midBone || !endBone) return;

    const rootPos = rootBone.transformNode
      ? rootBone.transformNode.getAbsolutePosition()
      : rootBone.bone.getAbsolutePosition();

    const toTarget = targetWorldPos.subtract(rootPos);
    const dist = toTarget.length();
    if (dist < 0.001) return;

    const dirTarget = toTarget.scale(1.0 / dist);

    // Limit reach to prevent hyperextension singularity
    const maxReach = (l1 + l2) * 0.998;
    const minReach = Math.max(0.01, Math.abs(l1 - l2) * 1.002);
    const clampedDist = Math.max(minReach, Math.min(maxReach, dist));

    // Law of Cosines
    const cosAlpha = (l1 * l1 + clampedDist * clampedDist - l2 * l2) / (2 * l1 * clampedDist);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

    // Pole / Bend plane
    const toPole = poleTargetWorldPos.subtract(rootPos);
    let bendNormal = Vector3.Cross(dirTarget, toPole);
    if (bendNormal.lengthSquared() < 0.0001) {
      bendNormal = Vector3.Cross(dirTarget, Vector3.Up());
      if (bendNormal.lengthSquared() < 0.0001) {
        bendNormal = Vector3.Cross(dirTarget, Vector3.Right());
      }
    }
    bendNormal.normalize();

    // Bend direction in plane perpendicular to reach vector
    const bendDir = Vector3.Cross(bendNormal, dirTarget).normalize();

    // Calculate exact mid joint position (elbow or knee)
    const midPos = rootPos
      .add(dirTarget.scale(l1 * Math.cos(alpha)))
      .add(bendDir.scale(l1 * Math.sin(alpha)));

    // Position mid joint
    if (midBone.transformNode) {
      midBone.transformNode.setAbsolutePosition(midPos);
      midBone.transformNode.computeWorldMatrix(true);
    }

    // Position end joint (hand or foot) directly at target
    if (endBone.transformNode) {
      const lowerDir = targetWorldPos.subtract(midPos).normalize();
      const actualEndPos = midPos.add(lowerDir.scale(l2));
      endBone.transformNode.setAbsolutePosition(actualEndPos);
      endBone.transformNode.computeWorldMatrix(true);
    }
  }

  /**
   * Evaluates limb kinematics and locks rider hands to handlebar grips and
   * feet to rearsets every frame based on derived skeleton lengths and dynamic steering/lean.
   */
  public static applyLimbIK(
    rig: RiderRig,
    _profile: RiderBikeProfile,
    steerAngleRad: number,
    riderTargets?: RiderTargets | null,
    leanAngleRad: number = 0
  ): void {
    const bikeRoot = rig.rootNode.parent as TransformNode;
    if (!bikeRoot || !riderTargets) return;

    const { limbLengths } = rig;
    const bikeWorld = bikeRoot.getWorldMatrix();

    // 1. Grip and Rearset Targets in World Space
    const leftGripTarget = riderTargets.leftGripAnchor.getAbsolutePosition();
    const rightGripTarget = riderTargets.rightGripAnchor.getAbsolutePosition();
    const leftRearsetTarget = riderTargets.leftRearsetAnchor.getAbsolutePosition();
    const rightRearsetTarget = riderTargets.rightRearsetAnchor.getAbsolutePosition();

    // 2. Dynamic Arm Pole Targets (Elbows)
    // Left elbow: points outward (-X), slightly down, and back
    const leftElbowLocal = new Vector3(
      -0.38,
      0.48 - (leanAngleRad < -0.1 ? Math.abs(leanAngleRad) * 0.08 : 0),
      -0.25
    );
    // Right elbow: points outward (+X), slightly down, and back
    const rightElbowLocal = new Vector3(
      0.38,
      0.48 - (leanAngleRad > 0.1 ? leanAngleRad * 0.08 : 0),
      -0.25
    );

    const leftElbowPoleWorld = Vector3.TransformCoordinates(leftElbowLocal, bikeWorld);
    const rightElbowPoleWorld = Vector3.TransformCoordinates(rightElbowLocal, bikeWorld);

    // Solve Left Arm IK
    RiderIK.solveTwoBoneIK(
      rig.leftArm,
      rig.leftForeArm,
      rig.leftHand,
      leftGripTarget,
      leftElbowPoleWorld,
      limbLengths.leftUpperArm,
      limbLengths.leftForearm
    );

    // Solve Right Arm IK
    RiderIK.solveTwoBoneIK(
      rig.rightArm,
      rig.rightForeArm,
      rig.rightHand,
      rightGripTarget,
      rightElbowPoleWorld,
      limbLengths.rightUpperArm,
      limbLengths.rightForearm
    );

    // Hand Gripping Rotations
    if (rig.leftHand) {
      rig.setBoneEulerRotation(rig.leftHand, 0.22, 0.12 + steerAngleRad * 0.85, 0.04);
    }
    if (rig.rightHand) {
      rig.setBoneEulerRotation(rig.rightHand, 0.22, -0.12 + steerAngleRad * 0.85, -0.04);
    }

    // 3. Dynamic Leg Pole Targets (Knees)
    // Inside Knee Flare (track day / MotoGP knee down) + Outside Knee Tank Hug
    const leftInsideFlare = leanAngleRad < -0.05 ? -0.15 * Math.abs(leanAngleRad) : 0;
    const leftTankHug = leanAngleRad > 0.05 ? 0.06 * leanAngleRad : 0;

    const rightInsideFlare = leanAngleRad > 0.05 ? 0.15 * leanAngleRad : 0;
    const rightTankHug = leanAngleRad < -0.05 ? -0.06 * Math.abs(leanAngleRad) : 0;

    const leftKneeLocal = new Vector3(
      -0.20 + leftInsideFlare + leftTankHug,
      0.10,
      -0.05
    );
    const rightKneeLocal = new Vector3(
      0.20 + rightInsideFlare + rightTankHug,
      0.10,
      -0.05
    );

    const leftKneePoleWorld = Vector3.TransformCoordinates(leftKneeLocal, bikeWorld);
    const rightKneePoleWorld = Vector3.TransformCoordinates(rightKneeLocal, bikeWorld);

    // Solve Left Leg IK
    RiderIK.solveTwoBoneIK(
      rig.leftUpLeg,
      rig.leftLeg,
      rig.leftFoot,
      leftRearsetTarget,
      leftKneePoleWorld,
      limbLengths.leftThigh,
      limbLengths.leftShin
    );

    // Solve Right Leg IK
    RiderIK.solveTwoBoneIK(
      rig.rightUpLeg,
      rig.rightLeg,
      rig.rightFoot,
      rightRearsetTarget,
      rightKneePoleWorld,
      limbLengths.rightThigh,
      limbLengths.rightShin
    );

    // Foot on Peg Rotations
    if (rig.leftFoot) {
      rig.setBoneEulerRotation(rig.leftFoot, 0.42, 0.08, 0);
    }
    if (rig.rightFoot) {
      rig.setBoneEulerRotation(rig.rightFoot, 0.42, -0.08, 0);
    }
  }
}
