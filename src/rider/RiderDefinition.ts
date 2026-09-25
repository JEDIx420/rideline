import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface RiderAttachmentAnchors {
  seatPosition: Vector3;       // Pelvis / saddle contact position
  leftHandPosition: Vector3;   // Left clip-on grip position
  rightHandPosition: Vector3;  // Right throttle clip-on grip position
  leftFootPosition: Vector3;   // Left rearset footpeg position
  rightFootPosition: Vector3;  // Right rearset footpeg position
  helmetEyeOffset: Vector3;    // Eye-line relative to head center for cockpit POV
}

export interface RiderSuitConfig {
  primaryColor: string;
  accentColor: string;
  trimColor: string;
  leatherRoughness: number;
  armorMetallic: number;
  visorRoughness: number;
  visorMetallic: number;
  visorAlpha: number;
}

export const DEFAULT_RIDER_SUIT: RiderSuitConfig = {
  primaryColor: '#181c24',    // Dark carbon-black racing leathers
  accentColor: '#00e5ff',     // Cyan race team stripes
  trimColor: '#e0e6ed',       // Silver/white accent panels
  leatherRoughness: 0.65,
  armorMetallic: 0.85,
  visorRoughness: 0.05,       // Deep mirror dark iridium visor
  visorMetallic: 0.95,
  visorAlpha: 0.96,
};

export const S1000RR_RIDER_ANCHORS: RiderAttachmentAnchors = {
  seatPosition: new Vector3(0, 0.56, 0.05),
  leftHandPosition: new Vector3(-0.28, 0.88, -0.42),
  rightHandPosition: new Vector3(0.28, 0.88, -0.42),
  leftFootPosition: new Vector3(-0.24, 0.42, 0.22),
  rightFootPosition: new Vector3(0.24, 0.42, 0.22),
  helmetEyeOffset: new Vector3(0, 0.06, -0.09),
};

export const M1000RR_RIDER_ANCHORS: RiderAttachmentAnchors = {
  seatPosition: new Vector3(0, 0.57, 0.05),
  leftHandPosition: new Vector3(-0.28, 0.88, -0.42),
  rightHandPosition: new Vector3(0.28, 0.88, -0.42),
  leftFootPosition: new Vector3(-0.24, 0.42, 0.22),
  rightFootPosition: new Vector3(0.24, 0.42, 0.22),
  helmetEyeOffset: new Vector3(0, 0.06, -0.09),
};
