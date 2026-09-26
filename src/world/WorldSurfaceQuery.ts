import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export type SurfaceType =
  | 'asphalt'
  | 'shoulder'
  | 'offroad'
  | 'water'
  | 'out_of_bounds';

export interface WorldSurfaceQuery {
  elevation: number;
  normal: Vector3;
  surfaceType: SurfaceType;
  frictionMultiplier: number;
  dragMultiplier: number;
  pitch: number;
  roadTangent: Vector3;
  roadDistance: number;
  camberAngleRad: number;
  recoveryPoint: Vector3;
}
