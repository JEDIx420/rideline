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

  // Left Arm
  LeftShoulder: 'LeftShoulder',
  LeftArm: 'LeftArm',
  LeftForeArm: 'LeftForeArm',
  LeftHand: 'LeftHand',

  // Right Arm
  RightShoulder: 'RightShoulder',
  RightArm: 'RightArm',
  RightForeArm: 'RightForeArm',
  RightHand: 'RightHand',

  // Left Leg
  LeftUpLeg: 'LeftUpLeg',
  LeftLeg: 'LeftLeg',
  LeftFoot: 'LeftFoot',
  LeftToeBase: 'LeftToeBase',

  // Right Leg
  RightUpLeg: 'RightUpLeg',
  RightLeg: 'RightLeg',
  RightFoot: 'RightFoot',
  RightToeBase: 'RightToeBase',
} as const;

export type RiderBoneKey = keyof typeof RIDER_BONE_NAMES;
