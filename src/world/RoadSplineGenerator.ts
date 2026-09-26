import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface RoadSamplePoint {
  position: Vector3;
  tangent: Vector3;
  normal: Vector3;
  binormal: Vector3;
  pitch: number;
  camberAngleRad: number; // Super-elevation banking on turns
  curvature: number;      // 1 / radius
  distanceAlongRoad: number;
}

export class RoadSplineGenerator {
  /**
   * Evaluates a Catmull-Rom spline at parameter t in [0, 1] between p1 and p2,
   * given control points p0, p1, p2, p3.
   */
  public static catmullRomPosition(
    p0: Vector3,
    p1: Vector3,
    p2: Vector3,
    p3: Vector3,
    t: number
  ): Vector3 {
    return Vector3.CatmullRom(p0, p1, p2, p3, t);
  }

  /**
   * First derivative of Catmull-Rom spline with respect to t.
   */
  public static catmullRomTangent(
    p0: Vector3,
    p1: Vector3,
    p2: Vector3,
    p3: Vector3,
    t: number
  ): Vector3 {
    const t2 = t * t;
    // 0.5 * ((-p0 + p2) + (2*p0 - 5*p1 + 4*p2 - p3)*2t + (-p0 + 3*p1 - 3*p2 + p3)*3t^2)
    const a = p2.subtract(p0);
    const b = p0.scale(2).subtract(p1.scale(5)).add(p2.scale(4)).subtract(p3);
    const c = p0.scale(-1).add(p1.scale(3)).subtract(p2.scale(3)).add(p3);

    const tangent = a.add(b.scale(2 * t)).add(c.scale(3 * t2)).scale(0.5);
    return tangent.normalize();
  }

  /**
   * Second derivative of Catmull-Rom spline with respect to t (curvature acceleration).
   */
  public static catmullRomCurvature(
    p0: Vector3,
    p1: Vector3,
    p2: Vector3,
    p3: Vector3,
    t: number
  ): Vector3 {
    const b = p0.scale(2).subtract(p1.scale(5)).add(p2.scale(4)).subtract(p3);
    const c = p0.scale(-1).add(p1.scale(3)).subtract(p2.scale(3)).add(p3);
    return b.scale(2).add(c.scale(6 * t)).scale(0.5);
  }

  /**
   * Generates a dense, equidistant sequence of RoadSamplePoints along a series of control points.
   */
  public static generateSplineSamples(
    controlPoints: Vector3[],
    stepDistance: number = 2.5
  ): RoadSamplePoint[] {
    if (controlPoints.length < 4) return [];

    const samples: RoadSamplePoint[] = [];
    let accumulatedDistance = 0;
    const n = controlPoints.length;

    // Approximate chord length of each segment
    for (let i = 0; i < n - 3; i++) {
      const p0 = controlPoints[i];
      const p1 = controlPoints[i + 1];
      const p2 = controlPoints[i + 2];
      const p3 = controlPoints[i + 3];

      const segmentChord = Vector3.Distance(p1, p2);
      const subSteps = Math.max(4, Math.ceil(segmentChord / stepDistance));

      for (let s = 0; s < subSteps; s++) {
        const t = s / subSteps;
        const pos = RoadSplineGenerator.catmullRomPosition(p0, p1, p2, p3, t);
        const tangent = RoadSplineGenerator.catmullRomTangent(p0, p1, p2, p3, t);
        const accel = RoadSplineGenerator.catmullRomCurvature(p0, p1, p2, p3, t);

        // Curvature scalar kappa = ||v x a|| / ||v||^3
        const vCrossA = Vector3.Cross(tangent, accel);
        const curvature = vCrossA.length();

        // Camber / Banking angle: turns inwards into the corner
        // Turn direction given by sign of horizontal cross product
        const turnDir = Math.sign(tangent.x * accel.z - tangent.z * accel.x);
        // Superelevation formula: theta ~ min(0.12, v^2 * kappa / g)
        const camberAngleRad = Math.min(0.08, curvature * 0.45) * turnDir;

        // Normal perpendicular to tangent, banking with camber
        const lateral = Vector3.Cross(tangent, Vector3.Up()).normalize();
        const normal = Vector3.Cross(lateral, tangent).normalize();

        const pitch = Math.atan2(tangent.y, Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z));

        if (samples.length > 0) {
          accumulatedDistance += Vector3.Distance(samples[samples.length - 1].position, pos);
        }

        samples.push({
          position: pos,
          tangent,
          normal,
          binormal: lateral,
          pitch,
          camberAngleRad,
          curvature,
          distanceAlongRoad: accumulatedDistance,
        });
      }
    }

    return samples;
  }
}
