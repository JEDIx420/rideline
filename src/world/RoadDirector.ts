import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { RoadSplineGenerator, RoadSamplePoint } from './RoadSplineGenerator';
import { RoadSectionPlanner } from './RoadSectionPlanner';
import { RoadValidator } from './RoadValidator';
import { RoadProgressHint, RoadProgressState } from './WorldSurfaceQuery';

export interface RoadClosestPoint extends RoadProgressState {
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
  sectionId: number;
}

export class RoadDirector {
  public controlPoints: Vector3[] = [];
  public splineSamples: RoadSamplePoint[] = [];
  public totalLength: number = 0;

  private planner: RoadSectionPlanner;
  private lastHeadingRad: number = 0;
  private lastSampledSegmentIndex: number = 0;
  private currentSectionId: number = 0;

  constructor(seed: number = 777) {
    this.planner = new RoadSectionPlanner(seed);
    this.initBenchmarkCorridor();
  }

  /**
   * Initializes the road with the canonical 750m vertical slice benchmark road,
   * followed by 28 km of pre-generated continuous coastal corridors.
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

    // Initial spline generation for the benchmark road
    this.splineSamples = RoadSplineGenerator.generateSplineSamples(this.controlPoints, 2.5, 0);
    this.lastSampledSegmentIndex = Math.max(0, this.controlPoints.length - 3);
    if (this.splineSamples.length > 0) {
      this.totalLength = this.splineSamples[this.splineSamples.length - 1].distanceAlongRoad;
    }

    // Pre-generate 28 km ahead seamlessly upfront for 10 minutes of uninterrupted continuous riding
    let extensions = 0;
    while (this.totalLength < 28000.0 && extensions < 20) {
      this.extendRoadAhead(2000.0);
      extensions++;
    }
  }

  /**
   * Extends the road network forward by planning new sections.
   * Append-only: historical samples remain completely immutable.
   */
  public extendRoadAhead(distanceToAdd: number = 2000.0): void {
    const startPoint = this.controlPoints[this.controlPoints.length - 1];
    let planned = this.planner.planNextSection(
      startPoint,
      this.lastHeadingRad,
      distanceToAdd
    );

    // Validate no self-crossings / near-overlaps against historical road
    let isValid = RoadValidator.checkIntersections(this.controlPoints, planned.controlPoints);
    let attempts = 0;
    while (!isValid && attempts < 5) {
      attempts++;
      // Nudge heading to veer away from previous road loops
      this.lastHeadingRad += 0.35;
      planned = this.planner.planNextSection(startPoint, this.lastHeadingRad, distanceToAdd);
      isValid = RoadValidator.checkIntersections(this.controlPoints, planned.controlPoints);
    }

    // Append new control points (skip first duplicate)
    for (let i = 1; i < planned.controlPoints.length; i++) {
      this.controlPoints.push(planned.controlPoints[i]);
    }
    this.lastHeadingRad = planned.targetHeadingRad;

    // Increment section ID
    this.currentSectionId++;

    // Calculate new segments to generate
    const totalSegments = Math.max(0, this.controlPoints.length - 3);
    const startSegment = this.lastSampledSegmentIndex;
    const numSegments = totalSegments - startSegment;

    if (numSegments > 0) {
      const lastDist = this.splineSamples.length > 0
        ? this.splineSamples[this.splineSamples.length - 1].distanceAlongRoad
        : 0;
      const lastIndex = this.splineSamples.length;

      const newSamples = RoadSplineGenerator.generateSectionSamples(
        this.controlPoints,
        startSegment,
        numSegments,
        2.5,
        lastDist,
        lastIndex,
        this.currentSectionId
      );

      for (const s of newSamples) {
        this.splineSamples.push(s);
      }

      this.lastSampledSegmentIndex = totalSegments;
      this.totalLength = this.splineSamples[this.splineSamples.length - 1].distanceAlongRoad;
    }
  }

  /**
   * Fast spatial lookup: finds continuous closest road point, signed lateral offset, and surface data.
   * Continuous projection onto adjacent road spline segments eliminates discrete elevation step jumps.
   * Uses bounded search around hint to prevent snapping to geographically nearby road loops.
   */
  public getClosestPoint(pos: Vector3, hint?: RoadProgressHint | number): RoadClosestPoint {
    const samples = this.splineSamples;
    const n = samples.length;
    if (n === 0) {
      return {
        position: pos.clone(),
        continuousPosition: pos.clone(),
        tangent: new Vector3(0, 0, -1),
        continuousTangent: new Vector3(0, 0, -1),
        normal: Vector3.Up(),
        continuousNormal: Vector3.Up(),
        binormal: Vector3.Right(),
        continuousBinormal: Vector3.Right(),
        pitch: 0,
        camberAngleRad: 0,
        curvature: 0,
        distanceAlongRoad: 0,
        distanceToCenter: 0,
        lateralOffset: 0,
        sampleIndex: 0,
        segmentIndex: 0,
        segmentT: 0,
        elevation: pos.y,
        sectionId: 0,
      };
    }

    let hintIndex: number | undefined;
    let isTeleport = false;

    if (typeof hint === 'number') {
      hintIndex = hint;
    } else if (hint) {
      hintIndex = hint.lastSampleIndex;
      isTeleport = !!hint.isTeleport;
    }

    let bestIndex = 0;
    let minSqDist = Number.MAX_VALUE;

    if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < n && !isTeleport) {
      // Bounded local search: only search -30 to +80 samples around previous progress
      const windowBehind = 30;
      const windowAhead = 80;
      const start = Math.max(0, hintIndex - windowBehind);
      const end = Math.min(n, hintIndex + windowAhead);
      for (let i = start; i < end; i++) {
        const dSq = Vector3.DistanceSquared(pos, samples[i].position);
        if (dSq < minSqDist) {
          minSqDist = dSq;
          bestIndex = i;
        }
      }
    } else {
      // Coarse stride search across entire road for spawn / recovery
      const stride = 12;
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

    // Continuous projection onto adjacent segments
    let chosenSegStart = bestIndex;
    let chosenT = 0;
    let chosenProj = samples[bestIndex].position.clone();
    let minProjDistSq = Vector3.DistanceSquared(pos, chosenProj);

    const checkSegment = (idx0: number, idx1: number) => {
      if (idx0 < 0 || idx1 >= n || idx0 >= idx1) return;
      const p0 = samples[idx0].position;
      const p1 = samples[idx1].position;
      const segVec = p1.subtract(p0);
      const segLenSq = segVec.lengthSquared();
      if (segLenSq < 1e-6) return;

      const toPos = pos.subtract(p0);
      let t = Vector3.Dot(toPos, segVec) / segLenSq;
      t = Math.max(0, Math.min(1, t));
      const proj = p0.add(segVec.scale(t));
      const dSq = Vector3.DistanceSquared(pos, proj);
      if (dSq < minProjDistSq) {
        minProjDistSq = dSq;
        chosenSegStart = idx0;
        chosenT = t;
        chosenProj = proj;
      }
    };

    if (bestIndex > 0) {
      checkSegment(bestIndex - 1, bestIndex);
    }
    if (bestIndex < n - 1) {
      checkSegment(bestIndex, bestIndex + 1);
    }

    const s0 = samples[chosenSegStart];
    const s1 = chosenSegStart + 1 < n ? samples[chosenSegStart + 1] : s0;
    const t = chosenT;

    const continuousTangent = Vector3.Lerp(s0.tangent, s1.tangent, t).normalize();
    const continuousNormal = Vector3.Lerp(s0.normal, s1.normal, t).normalize();
    const continuousBinormal = Vector3.Lerp(s0.binormal, s1.binormal, t).normalize();
    const pitch = s0.pitch * (1 - t) + s1.pitch * t;
    const camberAngleRad = s0.camberAngleRad * (1 - t) + s1.camberAngleRad * t;
    const curvature = s0.curvature * (1 - t) + s1.curvature * t;
    const distanceAlongRoad = s0.distanceAlongRoad + t * (s1.distanceAlongRoad - s0.distanceAlongRoad);
    const distanceToCenter = Math.sqrt(minProjDistSq);

    const toPosFromProj = pos.subtract(chosenProj);
    const lateralOffset = Vector3.Dot(toPosFromProj, continuousBinormal);
    const sectionId = t < 0.5 ? s0.sectionId : s1.sectionId;

    return {
      position: chosenProj,
      continuousPosition: chosenProj,
      tangent: continuousTangent,
      continuousTangent,
      normal: continuousNormal,
      continuousNormal,
      binormal: continuousBinormal,
      continuousBinormal,
      pitch,
      camberAngleRad,
      curvature,
      distanceAlongRoad,
      distanceToCenter,
      lateralOffset,
      sampleIndex: chosenSegStart,
      segmentIndex: chosenSegStart,
      segmentT: t,
      elevation: chosenProj.y,
      sectionId,
    };
  }

  /**
   * Samples future road tangent ahead for rider head look-ahead.
   */
  public getLookAheadTangent(currentDistance: number, lookAheadMeters: number): Vector3 {
    const targetDist = currentDistance + lookAheadMeters;
    if (this.splineSamples.length === 0) return new Vector3(0, 0, -1);

    // Find sample near targetDist
    let low = 0;
    let high = this.splineSamples.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.splineSamples[mid].distanceAlongRoad < targetDist) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const idx = Math.min(this.splineSamples.length - 1, Math.max(0, low));
    return this.splineSamples[idx].tangent;
  }

  /**
   * Spawns bike on the streamed road at s = 0.
   */
  public getSpawnTransform(): { position: Vector3; headingRad: number; normal: Vector3 } {
    const s0 = this.splineSamples[0] || {
      position: Vector3.Zero(),
      tangent: new Vector3(0, 0, -1),
      normal: Vector3.Up(),
    };
    const headingRad = Math.atan2(-s0.tangent.x, -s0.tangent.z);
    return {
      position: s0.position.add(new Vector3(0, 0.05, 0)),
      headingRad,
      normal: s0.normal,
    };
  }

  /**
   * Checks if more road needs to be generated based on player position along the road.
   */
  public updatePlayerProgress(playerRoadDist: number): void {
    const remainingDistance = this.totalLength - playerRoadDist;
    // Keep at least 6.0 km planned ahead
    if (remainingDistance < 6000.0) {
      this.extendRoadAhead(3000.0);
    }
  }
}

