import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';

export class RiderIK {
  /**
   * 2-Bone Analytical IK Solver (e.g. Shoulder -> Elbow -> Hand or Hip -> Knee -> Foot)
   * Solves joint rotations to place end-effector at target position while respecting bend direction pole vector.
   */
  public static solveTwoBoneIK(
    rootNode: TransformNode,
    midNode: TransformNode,
    _endNode: TransformNode,
    targetPos: Vector3,
    poleTarget: Vector3,
    length1: number,
    length2: number
  ): void {
    const rootPos = rootNode.getAbsolutePosition();
    const toTarget = targetPos.subtract(rootPos);
    const targetDist = toTarget.length();

    // Clamp target distance to avoid hyper-extension singularities
    const maxReach = length1 + length2 - 0.002;
    const minReach = Math.abs(length1 - length2) + 0.002;
    const clampedDist = Math.max(minReach, Math.min(maxReach, targetDist));

    // Law of Cosines to calculate interior joint angles
    const cosAngle1 = (length1 * length1 + clampedDist * clampedDist - length2 * length2) / (2 * length1 * clampedDist);
    const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)));

    const cosAngle2 = (length1 * length1 + length2 * length2 - clampedDist * clampedDist) / (2 * length1 * length2);
    const angle2 = Math.acos(Math.max(-1, Math.min(1, cosAngle2)));

    // Aim root towards target
    const aimDir = toTarget.normalize();
    const poleDir = poleTarget.subtract(rootPos).normalize();

    // Normal to the bend plane
    let bendNormal = Vector3.Cross(aimDir, poleDir);
    if (bendNormal.lengthSquared() < 0.0001) {
      bendNormal = Vector3.Right();
    } else {
      bendNormal.normalize();
    }

    // Apply rotation around bend plane normal
    const qAim = Quaternion.FromLookDirectionRH(aimDir, Vector3.Up());
    const qBend1 = Quaternion.RotationAxis(bendNormal, angle1);
    rootNode.rotationQuaternion = qAim.multiply(qBend1);

    // Mid joint (elbow / knee) interior flexion
    midNode.rotation.x = Math.PI - angle2;
  }
}
