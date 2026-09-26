import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { RoadSplineGenerator, RoadSamplePoint } from './RoadSplineGenerator';
import { RoadSectionPlanner } from './RoadSectionPlanner';

export interface RoadClosestPoint {
  position: Vector3;
  tangent: Vector3;
  normal: Vector3;
  binormal: Vector3;
  pitch: number;
  camberAngleRad: number;
  curvature: number;
  distanceAlongRoad: number;
  distanceToCenter: number;
  lateralOffset: number; // Signed distance (- is left lane, + is right lane)
  sampleIndex: number;
}

export class RoadDirector {
  public controlPoints: Vector3[] = [];
  public splineSamples: RoadSamplePoint[] = [];
  public totalLength: number = 0;

  private planner: RoadSectionPlanner;
  private lastHeadingRad: number = 0;

  constructor(seed: number = 777) {
    this.planner = new RoadSectionPlanner(seed);
    this.initBenchmarkCorridor();
  }

  /**
   * Initializes the road with the canonical 750m vertical slice benchmark road.
   */
  private initBenchmarkCorridor(): void {
    const pts: [number, number, number][] = [
      [0, 0, 80],       // Run-up
      [0, 0, 0],        // Start / Finish Line
      [0, 0.4, -120],   // Oceanfront high-speed straight
      [10, 1.2, -260],
      [35, 2.8, -380],
      [90, 5.5, -520],  // Coastal sweeping right sweeper
      [180, 9.2, -660],
      [300, 14.0, -780],
      [450, 20.5, -860], // Benchmark 750m exit onto coastal mountain ascent
      [620, 28.0, -900],
      [780, 38.5, -860],
      [900, 50.0, -720],
    ];

    this.controlPoints = pts.map((p) => new Vector3(p[0], p[1], p[2]));
    const lastP = this.controlPoints[this.controlPoints.length - 1];
    const prevP = this.controlPoints[this.controlPoints.length - 2];
    this.lastHeadingRad = Math.atan2(lastP.x - prevP.x, -(lastP.z - prevP.z));

    // Plan additional continuous 3 km ahead
    this.extendRoadAhead(3200.0);
    this.rebuildSpline();
  }

  /**
   * Extends the road network forward by planning new sections.
   */
  public extendRoadAhead(distanceToAdd: number = 1500.0): void {
    const startPoint = this.controlPoints[this.controlPoints.length - 1];
    const planned = this.planner.planNextSection(
      startPoint,
      this.lastHeadingRad,
      distanceToAdd
    );

    // Append new control points (skip first duplicate)
    for (let i = 1; i < planned.controlPoints.length; i++) {
      this.controlPoints.push(planned.controlPoints[i]);
    }
    this.lastHeadingRad = planned.targetHeadingRad;
  }

  /**
   * Rebuilds the high-density spline samples along the control points.
   */
  public rebuildSpline(): void {
    this.splineSamples = RoadSplineGenerator.generateSplineSamples(this.controlPoints, 2.5);
    if (this.splineSamples.length > 0) {
      this.totalLength = this.splineSamples[this.splineSamples.length - 1].distanceAlongRoad;
    }
  }

  /**
   * Fast spatial lookup: finds closest road point, signed lateral offset, and surface data.
   */
  public getClosestPoint(pos: Vector3, hintIndex?: number): RoadClosestPoint {
    const samples = this.splineSamples;
    const n = samples.length;
    if (n === 0) {
      return {
        position: pos.clone(),
        tangent: new Vector3(0, 0, -1),
        normal: Vector3.Up(),
        binormal: Vector3.Right(),
        pitch: 0,
        camberAngleRad: 0,
        curvature: 0,
        distanceAlongRoad: 0,
        distanceToCenter: 0,
        lateralOffset: 0,
        sampleIndex: 0,
      };
    }

    // Local search window around hintIndex if provided, otherwise coarse-then-fine search
    let bestIndex = 0;
    let minSqDist = Number.MAX_VALUE;

    if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < n) {
      const window = 40;
      const start = Math.max(0, hintIndex - window);
      const end = Math.min(n, hintIndex + window);
      for (let i = start; i < end; i++) {
        const dSq = Vector3.DistanceSquared(pos, samples[i].position);
        if (dSq < minSqDist) {
          minSqDist = dSq;
          bestIndex = i;
        }
      }
    } else {
      // Coarse stride search
      const stride = 10;
      let coarseBest = 0;
      for (let i = 0; i < n; i += stride) {
        const dSq = Vector3.DistanceSquared(pos, samples[i].position);
        if (dSq < minSqDist) {
          minSqDist = dSq;
          coarseBest = i;
        }
      }

      // Fine search around coarseBest
      const start = Math.max(0, coarseBest - stride);
      const end = Math.min(n, coarseBest + stride);
      for (let i = start; i < end; i++) {
        const dSq = Vector3.DistanceSquared(pos, samples[i].position);
        if (dSq < minSqDist) {
          minSqDist = dSq;
          bestIndex = i;
        }
      }
    }

    const sample = samples[bestIndex];
    const toPos = pos.subtract(sample.position);
    const distanceToCenter = Math.sqrt(minSqDist);

    // Signed lateral offset: dot product with binormal (lateral axis)
    const lateralOffset = Vector3.Dot(toPos, sample.binormal);

    return {
      position: sample.position,
      tangent: sample.tangent,
      normal: sample.normal,
      binormal: sample.binormal,
      pitch: sample.pitch,
      camberAngleRad: sample.camberAngleRad,
      curvature: sample.curvature,
      distanceAlongRoad: sample.distanceAlongRoad,
      distanceToCenter,
      lateralOffset,
      sampleIndex: bestIndex,
    };
  }

  /**
   * Checks if more road needs to be generated based on player position along the road.
   */
  public updatePlayerProgress(playerRoadDist: number): void {
    const remainingDistance = this.totalLength - playerRoadDist;
    // Keep at least 3.5 km planned ahead
    if (remainingDistance < 3500.0) {
      this.extendRoadAhead(2000.0);
      this.rebuildSpline();
    }
  }
}
