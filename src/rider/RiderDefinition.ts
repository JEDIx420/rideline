import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface RiderDefinition {
  id: string;
  name: string;
  modelPath: string;
  modelScale: Vector3;
  rotationOffset: Vector3;
}

export const RIDER_ASSET_YAW_CORRECTION = Math.PI;

export const CANONICAL_RIDER_DEFINITION: RiderDefinition = {
  id: 'bike-rider-3d',
  name: 'Bike Rider 3D',
  modelPath: 'assets/riders/bike-rider/rider.glb',
  modelScale: new Vector3(1.0, 1.0, 1.0),
  rotationOffset: new Vector3(0, RIDER_ASSET_YAW_CORRECTION, 0),
};

export const RIDER_BONE_NAMES = {
  // Core Spine & Head
  Hips: 'Hips',
  Spine: 'Spine',
  Spine1: 'Spine1',
  Spine2: 'Spine2',
  Neck: 'Neck',
  Head: 'Head',

  // Anatomical Left Arm (reaches to left handlebar grip at -X)
  LeftShoulder: 'RightShoulder',
  LeftArm: 'RightArm',
  LeftForeArm: 'RightForeArm',
  LeftHand: 'RightHand',

  // Anatomical Right Arm (reaches to right handlebar grip at +X)
  RightShoulder: 'LeftShoulder',
  RightArm: 'LeftArm',
  RightForeArm: 'LeftForeArm',
  RightHand: 'LeftHand',

  // Anatomical Left Leg (reaches to left rearset at -X)
  LeftUpLeg: 'RightUpLeg',
  LeftLeg: 'RightLeg',
  LeftFoot: 'RightFoot',
  LeftToeBase: 'RightToeBase',

  // Anatomical Right Leg (reaches to right rearset at +X)
  RightUpLeg: 'LeftUpLeg',
  RightLeg: 'LeftLeg',
  RightFoot: 'LeftFoot',
  RightToeBase: 'LeftToeBase',
} as const;

export type RiderBoneKey = keyof typeof RIDER_BONE_NAMES;
