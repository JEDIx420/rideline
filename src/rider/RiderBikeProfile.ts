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
  seatOffset: new Vector3(0, 0.355, 0.340),
  pelvisRotation: new Vector3(0.36, 0, 0),
  baseSpinePitch: 0.76,
  leftHandTarget: new Vector3(-0.320, 0.345, -0.420),
  rightHandTarget: new Vector3(0.320, 0.345, -0.420),
  leftFootTarget: new Vector3(-0.265, -0.130, 0.315),
  rightFootTarget: new Vector3(0.265, -0.130, 0.315),
  kneeGripAngle: 0.16,
  headCameraOffset: new Vector3(0, 0.06, -0.16),
  tuckSpinePitch: 0.28,
  tuckPelvisOffset: new Vector3(0, -0.02, 0.04),
};

export const M1000RR_RIDER_PROFILE: RiderBikeProfile = {
  bikeId: 'bike-02',
  seatOffset: new Vector3(0, 0.395, 0.340),
  pelvisRotation: new Vector3(0.36, 0, 0),
  baseSpinePitch: 0.78,
  leftHandTarget: new Vector3(-0.265, 0.405, -0.450),
  rightHandTarget: new Vector3(0.265, 0.405, -0.450),
  leftFootTarget: new Vector3(-0.254, -0.080, 0.290),
  rightFootTarget: new Vector3(0.254, -0.080, 0.290),
  kneeGripAngle: 0.16,
  headCameraOffset: new Vector3(0, 0.06, -0.16),
  tuckSpinePitch: 0.28,
  tuckPelvisOffset: new Vector3(0, -0.02, 0.04),
};

export function getRiderBikeProfile(bikeId: string): RiderBikeProfile {
  if (bikeId === 'bike-02' || bikeId.includes('m1000rr')) {
    return M1000RR_RIDER_PROFILE;
  }
  return S1000RR_RIDER_PROFILE;
}
