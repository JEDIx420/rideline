import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Space } from '@babylonjs/core/Maths/math.axis';
import { RiderRig, BoneState } from './RiderRig';
import { RiderBikeProfile } from './RiderBikeProfile';

export class RiderIK {
  /**
   * 2-Bone Analytical IK Solver (Shoulder -> Forearm -> Hand or Hip -> Knee -> Foot)
   */
  public static solveTwoBoneIK(
    rootBone: BoneState | null,
    midBone: BoneState | null,
    _endBone: BoneState | null,
    targetPos: Vector3,
    poleTarget: Vector3,
    length1: number,
    length2: number
  ): void {
    if (!rootBone || !midBone) return;

    const rootPos = rootBone.transformNode
      ? rootBone.transformNode.getAbsolutePosition()
      : rootBone.bone.getAbsolutePosition();

    const toTarget = targetPos.subtract(rootPos);
    const targetDist = toTarget.length();

    // Clamp reach to avoid singularities
    const maxReach = length1 + length2 - 0.005;
    const minReach = Math.abs(length1 - length2) + 0.005;
    const clampedDist = Math.max(minReach, Math.min(maxReach, targetDist));

    // Law of Cosines
    const cosAngle1 = (length1 * length1 + clampedDist * clampedDist - length2 * length2) / (2 * length1 * clampedDist);
    const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)));

    const cosAngle2 = (length1 * length1 + length2 * length2 - clampedDist * clampedDist) / (2 * length1 * length2);
    const angle2 = Math.acos(Math.max(-1, Math.min(1, cosAngle2)));

    // Aim root towards target
    const aimDir = toTarget.normalize();
    const poleDir = poleTarget.subtract(rootPos).normalize();

    let bendNormal = Vector3.Cross(aimDir, poleDir);
    if (bendNormal.lengthSquared() < 0.0001) {
      bendNormal = Vector3.Right();
    } else {
      bendNormal.normalize();
    }

    const qAim = Quaternion.FromLookDirectionRH(aimDir, Vector3.Up());
    const qBend1 = Quaternion.RotationAxis(bendNormal, angle1);
    const totalRootRot = qAim.multiply(qBend1);

    if (rootBone.transformNode) {
      if (!rootBone.transformNode.rotationQuaternion) {
        rootBone.transformNode.rotationQuaternion = Quaternion.Identity();
      }
      rootBone.transformNode.rotationQuaternion.copyFrom(totalRootRot);
    } else {
      rootBone.bone.setRotationQuaternion(totalRootRot, Space.WORLD);
    }

    // Interior joint angle (elbow / knee flexion)
    const midAngle = Math.PI - angle2;
    if (midBone.transformNode) {
      midBone.transformNode.rotation.x = midAngle;
    } else {
      midBone.bone.setRotation(new Vector3(midAngle, 0, 0), Space.LOCAL);
    }
  }

  public static applyLimbIK(
    rig: RiderRig,
    profile: RiderBikeProfile,
    steerAngleRad: number
  ): void {
    const bikeRoot = rig.rootNode.parent as any;
    if (!bikeRoot) return;

    // 1. Transform Hand Targets from Bike local space into World space (accounting for steering)
    const steerRot = Quaternion.RotationAxis(Vector3.Up(), steerAngleRad);

    const leftHandLocal = profile.leftHandTarget.clone();
    const rightHandLocal = profile.rightHandTarget.clone();

    // Rotate grips with handlebar steering
    const steeredLeftHand = leftHandLocal.applyRotationQuaternion(steerRot);
    const steeredRightHand = rightHandLocal.applyRotationQuaternion(steerRot);

    const worldLeftHand = Vector3.TransformCoordinates(steeredLeftHand, bikeRoot.getWorldMatrix());
    const worldRightHand = Vector3.TransformCoordinates(steeredRightHand, bikeRoot.getWorldMatrix());

    const worldLeftFoot = Vector3.TransformCoordinates(profile.leftFootTarget, bikeRoot.getWorldMatrix());
    const worldRightFoot = Vector3.TransformCoordinates(profile.rightFootTarget, bikeRoot.getWorldMatrix());

    // 2. Elbow & Knee Pole Targets
    const worldLeftElbowPole = worldLeftHand.add(new Vector3(-0.35, 0.10, 0.25));
    const worldRightElbowPole = worldRightHand.add(new Vector3(0.35, 0.10, 0.25));

    const worldLeftKneePole = worldLeftFoot.add(new Vector3(-0.15, 0.35, -0.30));
    const worldRightKneePole = worldRightFoot.add(new Vector3(0.15, 0.35, -0.30));

    // 3. Solve IK
    // Arm segment lengths: UpperArm ~0.28m, ForeArm ~0.26m
    this.solveTwoBoneIK(
      rig.leftArm,
      rig.leftForeArm,
      rig.leftHand,
      worldLeftHand,
      worldLeftElbowPole,
      0.28,
      0.26
    );

    this.solveTwoBoneIK(
      rig.rightArm,
      rig.rightForeArm,
      rig.rightHand,
      worldRightHand,
      worldRightElbowPole,
      0.28,
      0.26
    );

    // Leg segment lengths: Thigh ~0.42m, Shin ~0.40m
    this.solveTwoBoneIK(
      rig.leftUpLeg,
      rig.leftLeg,
      rig.leftFoot,
      worldLeftFoot,
      worldLeftKneePole,
      0.42,
      0.40
    );

    this.solveTwoBoneIK(
      rig.rightUpLeg,
      rig.rightLeg,
      rig.rightFoot,
      worldRightFoot,
      worldRightKneePole,
      0.42,
      0.40
    );
  }
}
