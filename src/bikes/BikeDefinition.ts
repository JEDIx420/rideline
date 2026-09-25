import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BikePhysicsConfig } from '../config/physics';
import { BikeAudioProfile } from '../audio/AudioProfile';

export interface EngineConfig {
  idleRpm: number;
  maxRpm: number;
  redlineRpm: number;
  peakTorqueNm: number;
  peakTorqueRpm: number;
  peakPowerHp: number;
  peakPowerRpm: number;
  flywheelInertia: number;
  engineBrakingTorque: number;
}

export interface TransmissionConfig {
  gearRatios: number[]; // Index 0 = Neutral (0), Index 1-6 = 1st through 6th
  finalDriveRatio: number;
  primaryReduction: number;
  upshiftRpm: number;
  downshiftRpm: number;
  shiftDelaySeconds: number;
}

export interface NodeMapping {
  rootNodeName?: string;
  frontWheelNodeName: string;
  frontWheelSubNodeNames?: string[];
  rearWheelNodeName: string;
  rearWheelSubNodeNames?: string[];
  frontForkNodeName?: string;
  frontForkSubNodeNames?: string[];
  handlebarsNodeName?: string;
  cockpitNodeName?: string;
  dialsNodeName?: string;
  chassisNodeName?: string;
  swingarmNodeName?: string;
  frontDiscNodeName?: string;
  rearDiscNodeName?: string;
  exhaustNodeName?: string;
}

export interface CameraAnchors {
  chaseOffset: Vector3;
  chaseLookAtOffset: Vector3;
  riderEyeOffset: Vector3;
  riderLookAtOffset: Vector3;
}

export interface GarageCameraConfig {
  radius: number;
  alpha: number;
  beta: number;
  targetOffset: Vector3;
}

export interface BikeDefinition {
  id: string;
  displayName: string;
  manufacturer: string;
  modelYear: number;
  description: string;
  modelPath: string;
  modelScale: Vector3;
  modelRotationOffset: Vector3;
  modelPositionOffset: Vector3;
  physics: BikePhysicsConfig;
  engine: EngineConfig;
  transmission: TransmissionConfig;
  nodeMapping: NodeMapping;
  cameraAnchors: CameraAnchors;
  audioProfile?: BikeAudioProfile;
  garageCamera?: GarageCameraConfig;
}

