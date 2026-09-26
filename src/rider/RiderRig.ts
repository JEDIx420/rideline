import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { Bone } from '@babylonjs/core/Bones/bone';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { Space } from '@babylonjs/core/Maths/math.axis';
import { RIDER_BONE_NAMES } from './RiderDefinition';

export interface BoneState {
  bone: Bone;
  transformNode: TransformNode | null;
  restPosition: Vector3;
  restRotation: Quaternion;
}

export interface RiderLimbLengths {
  leftUpperArm: number;
  leftForearm: number;
  rightUpperArm: number;
  rightForearm: number;
  leftThigh: number;
  leftShin: number;
  rightThigh: number;
  rightShin: number;
}

export class RiderRig {
  public rootNode: TransformNode;
  public skeleton: Skeleton;
  public meshes: AbstractMesh[];
  public bones: Map<string, BoneState> = new Map();

  // Derived limb lengths from skeleton
  public limbLengths: RiderLimbLengths = {
    leftUpperArm: 0.285,
    leftForearm: 0.252,
    rightUpperArm: 0.285,
    rightForearm: 0.252,
    leftThigh: 0.458,
    leftShin: 0.444,
    rightThigh: 0.458,
    rightShin: 0.444,
  };

  // Bind pose Hips position relative to RiderAssetRoot
  public hipsBindLocalPosition: Vector3 = new Vector3(0, 1.019, 0.010);

  // Primary bone fast references
  public hips: BoneState | null = null;
  public spine: BoneState | null = null;
  public spine1: BoneState | null = null;
  public spine2: BoneState | null = null;
  public neck: BoneState | null = null;
  public head: BoneState | null = null;

  public leftShoulder: BoneState | null = null;
  public leftArm: BoneState | null = null;
  public leftForeArm: BoneState | null = null;
  public leftHand: BoneState | null = null;

  public rightShoulder: BoneState | null = null;
  public rightArm: BoneState | null = null;
  public rightForeArm: BoneState | null = null;
  public rightHand: BoneState | null = null;

  public leftUpLeg: BoneState | null = null;
  public leftLeg: BoneState | null = null;
  public leftFoot: BoneState | null = null;
  public leftToeBase: BoneState | null = null;

  public rightUpLeg: BoneState | null = null;
  public rightLeg: BoneState | null = null;
  public rightFoot: BoneState | null = null;
  public rightToeBase: BoneState | null = null;

  // Meshes for culling in 1st person POV
  private headMeshes: AbstractMesh[] = [];

  constructor(
    rootNode: TransformNode,
    skeleton: Skeleton,
    meshes: AbstractMesh[]
  ) {
    this.rootNode = rootNode;
    this.skeleton = skeleton;
    this.meshes = meshes;

    this.cacheBones();
    this.cacheMeshes();
  }

  private cacheBones(): void {
    for (const bone of this.skeleton.bones) {
      const tn = bone.getTransformNode();
      const restPos = tn ? tn.position.clone() : bone.getPosition(Space.LOCAL);
      const restRot = tn && tn.rotationQuaternion
        ? tn.rotationQuaternion.clone()
        : bone.getRotationQuaternion(Space.LOCAL);

      const state: BoneState = {
        bone,
        transformNode: tn,
        restPosition: restPos,
        restRotation: restRot,
      };

      this.bones.set(bone.name, state);
    }

    // Assign primary references
    this.hips = this.getBone(RIDER_BONE_NAMES.Hips);
    this.spine = this.getBone(RIDER_BONE_NAMES.Spine);
    this.spine1 = this.getBone(RIDER_BONE_NAMES.Spine1);
    this.spine2 = this.getBone(RIDER_BONE_NAMES.Spine2);
    this.neck = this.getBone(RIDER_BONE_NAMES.Neck);
    this.head = this.getBone(RIDER_BONE_NAMES.Head);

    this.leftShoulder = this.getBone(RIDER_BONE_NAMES.LeftShoulder);
    this.leftArm = this.getBone(RIDER_BONE_NAMES.LeftArm);
    this.leftForeArm = this.getBone(RIDER_BONE_NAMES.LeftForeArm);
    this.leftHand = this.getBone(RIDER_BONE_NAMES.LeftHand);

    this.rightShoulder = this.getBone(RIDER_BONE_NAMES.RightShoulder);
    this.rightArm = this.getBone(RIDER_BONE_NAMES.RightArm);
    this.rightForeArm = this.getBone(RIDER_BONE_NAMES.RightForeArm);
    this.rightHand = this.getBone(RIDER_BONE_NAMES.RightHand);

    this.leftUpLeg = this.getBone(RIDER_BONE_NAMES.LeftUpLeg);
    this.leftLeg = this.getBone(RIDER_BONE_NAMES.LeftLeg);
    this.leftFoot = this.getBone(RIDER_BONE_NAMES.LeftFoot);
    this.leftToeBase = this.getBone(RIDER_BONE_NAMES.LeftToeBase);

    this.rightUpLeg = this.getBone(RIDER_BONE_NAMES.RightUpLeg);
    this.rightLeg = this.getBone(RIDER_BONE_NAMES.RightLeg);
    this.rightFoot = this.getBone(RIDER_BONE_NAMES.RightFoot);
    this.rightToeBase = this.getBone(RIDER_BONE_NAMES.RightToeBase);

    // Derive bind-pose Hips position
    if (this.hips) {
      this.hipsBindLocalPosition.copyFrom(this.hips.restPosition);
    }

    // Derive limb lengths from skeleton rest poses
    this.deriveLimbLengths();
  }

  private deriveLimbLengths(): void {
    const getDist = (b: BoneState | null, fallback: number) => {
      if (!b) return fallback;
      const len = b.restPosition.length();
      return len > 0.05 ? len : fallback;
    };

    this.limbLengths = {
      leftUpperArm: getDist(this.leftForeArm, 0.285),
      leftForearm: getDist(this.leftHand, 0.252),
      rightUpperArm: getDist(this.rightForeArm, 0.285),
      rightForearm: getDist(this.rightHand, 0.252),
      leftThigh: getDist(this.leftLeg, 0.458),
      leftShin: getDist(this.leftFoot, 0.444),
      rightThigh: getDist(this.rightLeg, 0.458),
      rightShin: getDist(this.rightFoot, 0.444),
    };
  }

  private cacheMeshes(): void {
    for (const mesh of this.meshes) {
      const name = mesh.name.toLowerCase();
      if (
        name.includes('headwear') ||
        name.includes('head') ||
        name.includes('teeth') ||
        name.includes('eye')
      ) {
        this.headMeshes.push(mesh);
      }
    }
  }

  public getBone(name: string): BoneState | null {
    return this.bones.get(name) || null;
  }

  public setBoneLocalRotation(
    state: BoneState | null,
    deltaRot: Quaternion
  ): void {
    if (!state) return;
    const targetRot = state.restRotation.multiply(deltaRot);

    if (state.transformNode) {
      if (!state.transformNode.rotationQuaternion) {
        state.transformNode.rotationQuaternion = Quaternion.Identity();
      }
      state.transformNode.rotationQuaternion.copyFrom(targetRot);
    } else {
      state.bone.setRotationQuaternion(targetRot, Space.LOCAL);
    }
  }

  public setBoneEulerRotation(
    state: BoneState | null,
    pitchRad: number,
    yawRad: number,
    rollRad: number
  ): void {
    if (!state) return;
    const deltaQ = Quaternion.RotationYawPitchRoll(yawRad, pitchRad, rollRad);
    this.setBoneLocalRotation(state, deltaQ);
  }

  public setBoneLocalPosition(
    state: BoneState | null,
    pos: Vector3
  ): void {
    if (!state) return;
    if (state.transformNode) {
      state.transformNode.position.copyFrom(pos);
    } else {
      state.bone.setPosition(pos, Space.LOCAL);
    }
  }

  public getBoneWorldPosition(state: BoneState | null): Vector3 {
    if (!state) return Vector3.Zero();
    if (state.transformNode) {
      return state.transformNode.getAbsolutePosition();
    }
    const mesh = this.meshes[0];
    return state.bone.getAbsolutePosition(mesh);
  }

  public setFirstPersonMode(isFirstPerson: boolean): void {
    // Selectively cull helmet/head/teeth/eyes so interior polys aren't visible,
    // while keeping suit, arms, gloves, boots visible in cockpit view!
    for (const mesh of this.headMeshes) {
      mesh.setEnabled(!isFirstPerson);
    }
  }

  public setVisible(visible: boolean): void {
    this.rootNode.setEnabled(visible);
  }

  public dispose(): void {
    this.rootNode.dispose(false, true);
  }
}
