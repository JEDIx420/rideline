import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface RiderBikeProfile {
  bikeId: string;
  seatOffset: Vector3;          // Pelvis / saddle contact position in bike space
  pelvisRotation: Vector3;      // Base pelvis rotation (Pitch, Yaw, Roll)
  baseSpinePitch: number;       // Base forward lean angle over fuel tank
  leftHandTarget: Vector3;      // Left clip-on grip position
  rightHandTarget: Vector3;     // Right throttle clip-on grip position
  leftFootTarget: Vector3;      // Left rearset footpeg position
  rightFootTarget: Vector3;     // Right rearset footpeg position
  kneeGripAngle: number;        // Inward knee angle hugging tank
  headCameraOffset: Vector3;    // Camera eye offset relative to head bone
  tuckSpinePitch: number;       // Max forward torso drop when aerodynamic tuck
  tuckPelvisOffset: Vector3;    // Pelvis shift during aerodynamic tuck
}

export const S1000RR_RIDER_PROFILE: RiderBikeProfile = {
  bikeId: 's1000rr-2019',
  seatOffset: new Vector3(0, -0.265, 0.06),
  pelvisRotation: new Vector3(0.35, 0, 0),
  baseSpinePitch: 0.78,
  leftHandTarget: new Vector3(-0.27, 0.87, -0.42),
  rightHandTarget: new Vector3(0.27, 0.87, -0.42),
  leftFootTarget: new Vector3(-0.23, 0.40, 0.24),
  rightFootTarget: new Vector3(0.23, 0.40, 0.24),
  kneeGripAngle: 0.18,
  headCameraOffset: new Vector3(0, 0.18, -0.54),
  tuckSpinePitch: 0.32,
  tuckPelvisOffset: new Vector3(0, -0.03, 0.04),
};

export const M1000RR_RIDER_PROFILE: RiderBikeProfile = {
  bikeId: 'bike-02',
  seatOffset: new Vector3(0, -0.255, 0.06),
  pelvisRotation: new Vector3(0.35, 0, 0),
  baseSpinePitch: 0.80,
  leftHandTarget: new Vector3(-0.28, 0.88, -0.42),
  rightHandTarget: new Vector3(0.28, 0.88, -0.42),
  leftFootTarget: new Vector3(-0.23, 0.41, 0.24),
  rightFootTarget: new Vector3(0.23, 0.41, 0.24),
  kneeGripAngle: 0.18,
  headCameraOffset: new Vector3(0, 0.18, -0.54),
  tuckSpinePitch: 0.32,
  tuckPelvisOffset: new Vector3(0, -0.03, 0.04),
};

export function getRiderBikeProfile(bikeId: string): RiderBikeProfile {
  if (bikeId === 'bike-02' || bikeId.includes('m1000rr')) {
    return M1000RR_RIDER_PROFILE;
  }
  return S1000RR_RIDER_PROFILE;
}
