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
  roadSampleIndex: number;
  distanceToCenter: number;
  lateralOffset: number;
}

export interface RoadProgressHint {
  lastSampleIndex?: number;
  lastDistance?: number;
  isTeleport?: boolean;
}

export interface WorldSurfaceQueryProvider {
  sampleSurface(position: Vector3, hint?: RoadProgressHint): WorldSurfaceQuery;
  getSpawnTransform(): { position: Vector3; headingRad: number; normal: Vector3 };
  getLookAheadTangent?(distanceAlongRoad: number, lookAheadMeters: number): Vector3;
}

