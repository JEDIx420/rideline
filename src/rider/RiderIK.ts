import { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
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
    if (!rootBone.transformNode || !midBone.transformNode || !endBone.transformNode) return;

    const rootTN = rootBone.transformNode;
    const midTN = midBone.transformNode;
    const endTN = endBone.transformNode;

    // 1. Maintain exact rest positions on child bones - NEVER translate bones
    midTN.position.copyFrom(midBone.restPosition);
    endTN.position.copyFrom(endBone.restPosition);

    const rootPos = rootTN.getAbsolutePosition();
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

    // In-plane bend direction perpendicular to target reach vector
    const bendDir = Vector3.Cross(bendNormal, dirTarget).normalize();

    // Desired upper limb direction in world space
    const d1 = dirTarget.scale(Math.cos(alpha)).add(bendDir.scale(Math.sin(alpha))).normalize();
    const midPos = rootPos.add(d1.scale(l1));
    // Desired lower limb direction in world space
    const d2 = targetWorldPos.subtract(midPos).normalize();

    // 2. Pure Rotational Analytical IK:
    // Rotate rootBone from its rest direction to d1 in parent space
    const parentMat = rootTN.parent
      ? (rootTN.parent as TransformNode).getWorldMatrix()
      : Matrix.Identity();
    const invParentMat = parentMat.clone().invert();

    const d1_parent = Vector3.TransformNormal(d1, invParentMat).normalize();
    const rootRestMat = new Matrix();
    rootBone.restRotation.toRotationMatrix(rootRestMat);
    const dir_rest_parent = Vector3.TransformCoordinates(midBone.restPosition, rootRestMat).normalize();

    const dot1 = Math.max(-1, Math.min(1, Vector3.Dot(dir_rest_parent, d1_parent)));
    const cross1 = Vector3.Cross(dir_rest_parent, d1_parent);
    let q_aim1: Quaternion;
    if (dot1 < -0.9999) {
      const ortho = Vector3.Cross(dir_rest_parent, Vector3.Up()).normalize();
      q_aim1 = Quaternion.RotationAxis(ortho, Math.PI);
    } else {
      q_aim1 = new Quaternion(cross1.x, cross1.y, cross1.z, 1 + dot1).normalize();
    }

    rootTN.rotationQuaternion = q_aim1.multiply(rootBone.restRotation);
    rootTN.computeWorldMatrix(true);
    midTN.computeWorldMatrix(true);

    // Rotate midBone from its rest direction to d2 in root space
    const rootMat = rootTN.getWorldMatrix();
    const invRootMat = rootMat.clone().invert();

    const d2_root = Vector3.TransformNormal(d2, invRootMat).normalize();
    const midRestMat = new Matrix();
    midBone.restRotation.toRotationMatrix(midRestMat);
    const dir_rest_root = Vector3.TransformCoordinates(endBone.restPosition, midRestMat).normalize();

    const dot2 = Math.max(-1, Math.min(1, Vector3.Dot(dir_rest_root, d2_root)));
    const cross2 = Vector3.Cross(dir_rest_root, d2_root);
    let q_aim2: Quaternion;
    if (dot2 < -0.9999) {
      const ortho = Vector3.Cross(dir_rest_root, Vector3.Up()).normalize();
      q_aim2 = Quaternion.RotationAxis(ortho, Math.PI);
    } else {
      q_aim2 = new Quaternion(cross2.x, cross2.y, cross2.z, 1 + dot2).normalize();
    }

    midTN.rotationQuaternion = q_aim2.multiply(midBone.restRotation);
    midTN.computeWorldMatrix(true);
    endTN.computeWorldMatrix(true);
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
    const leftInsideFlare = leanAngleRad < -0.05 ? -0.18 * Math.abs(leanAngleRad) : 0;
    const leftKneeDrop = leanAngleRad < -0.05 ? -0.08 * Math.abs(leanAngleRad) : 0;
    const leftTankHug = leanAngleRad > 0.05 ? 0.05 * leanAngleRad : 0;

    const rightInsideFlare = leanAngleRad > 0.05 ? 0.18 * leanAngleRad : 0;
    const rightKneeDrop = leanAngleRad > 0.05 ? -0.08 * leanAngleRad : 0;
    const rightTankHug = leanAngleRad < -0.05 ? -0.05 * Math.abs(leanAngleRad) : 0;

    const leftKneeLocal = new Vector3(
      -0.185 + leftInsideFlare + leftTankHug,
      0.18 + leftKneeDrop,
      0.05
    );
    const rightKneeLocal = new Vector3(
      0.185 + rightInsideFlare + rightTankHug,
      0.18 + rightKneeDrop,
      0.05
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

    // Foot on Peg Rotations - sole rests securely on rearsets
    if (rig.leftFoot) {
      rig.setBoneEulerRotation(rig.leftFoot, 0.20, 0.05, 0);
    }
    if (rig.rightFoot) {
      rig.setBoneEulerRotation(rig.rightFoot, 0.20, -0.05, 0);
    }
  }
}
