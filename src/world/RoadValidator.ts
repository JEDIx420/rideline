import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface RoadValidationResult {
  valid: boolean;
  reason?: string;
  maxCurvature: number;
  maxGrade: number;
}

export class RoadValidator {
  public static readonly MAX_GRADE: number = 0.12; // 12% maximum highway grade
  public static readonly MIN_RADIUS: number = 24.0; // 24m minimum curve radius
  public static readonly MAX_CURVATURE: number = 1.0 / RoadValidator.MIN_RADIUS; // ~0.0416

  /**
   * Validates a candidate control point against the preceding points.
   */
  public static validatePoint(
    previousPoints: Vector3[],
    candidate: Vector3,
    minDistance: number = 40.0,
    maxDistance: number = 180.0
  ): boolean {
    if (previousPoints.length === 0) return true;
    const last = previousPoints[previousPoints.length - 1];
    const dist = Vector3.Distance(last, candidate);

    if (dist < minDistance || dist > maxDistance) return false;

    // Check grade
    const horizontalDist = Math.hypot(candidate.x - last.x, candidate.z - last.z);
    if (horizontalDist < 1.0) return false;
    const grade = Math.abs(candidate.y - last.y) / horizontalDist;
    if (grade > RoadValidator.MAX_GRADE) return false;

    // Check angle from previous direction (no sharp switchbacks > 75 degrees)
    if (previousPoints.length >= 2) {
      const prevPrev = previousPoints[previousPoints.length - 2];
      const vPrev = last.subtract(prevPrev).normalize();
      const vNext = candidate.subtract(last).normalize();
      const dot = Vector3.Dot(vPrev, vNext);
      if (dot < 0.25) return false; // Turns sharper than ~75 degrees rejected
    }

    return true;
  }

  /**
   * Validates a sequence of points for grade and curvature.
   */
  public static validateSection(points: Vector3[]): RoadValidationResult {
    let maxCurvature = 0;
    let maxGrade = 0;

    for (let i = 1; i < points.length; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];

      const hDist = Math.hypot(pCurr.x - pPrev.x, pCurr.z - pPrev.z);
      if (hDist > 0.01) {
        const grade = Math.abs(pCurr.y - pPrev.y) / hDist;
        if (grade > maxGrade) maxGrade = grade;
        if (grade > RoadValidator.MAX_GRADE) {
          return {
            valid: false,
            reason: `Excessive grade: ${(grade * 100).toFixed(1)}% at segment ${i}`,
            maxCurvature,
            maxGrade,
          };
        }
      }

      if (i < points.length - 1) {
        const pNext = points[i + 1];
        const v1 = pCurr.subtract(pPrev).normalize();
        const v2 = pNext.subtract(pCurr).normalize();
        const chord = Vector3.Distance(pPrev, pNext);
        if (chord > 1.0) {
          const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(v1, v2))));
          const curvature = angle / (chord * 0.5);
          if (curvature > maxCurvature) maxCurvature = curvature;
          if (curvature > RoadValidator.MAX_CURVATURE) {
            return {
              valid: false,
              reason: `Excessive curvature: radius ${(1 / curvature).toFixed(1)}m at segment ${i}`,
              maxCurvature,
              maxGrade,
            };
          }
        }
      }
    }

    return { valid: true, maxCurvature, maxGrade };
  }
}
