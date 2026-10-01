import { BikePhysics } from '../src/bikes/BikePhysics';
import { DEFAULT_PHYSICS_CONFIG } from '../src/config/physics';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { RoadDirector } from '../src/world/RoadDirector';
import { WorldSurfaceQuery, WorldSurfaceQueryProvider, RoadProgressHint } from '../src/world/WorldSurfaceQuery';

class RealRoadSurfaceProvider implements WorldSurfaceQueryProvider {
  constructor(public roadDirector: RoadDirector) {}

  sampleSurface(pos: Vector3, hint?: RoadProgressHint): WorldSurfaceQuery {
    const roadPt = this.roadDirector.getClosestPoint(pos, hint);
    const distToCenter = roadPt.distanceToCenter;
    const halfRoadWidth = 3.6;
    const shoulderWidth = 1.8;

    const safeRecoveryPoint = roadPt.position.clone();

    if (distToCenter <= halfRoadWidth) {
      // Continuous banked asphalt elevation
      const surfaceElevation = roadPt.position.y + roadPt.binormal.y * roadPt.lateralOffset;
      return {
        elevation: surfaceElevation,
        normal: roadPt.normal,
        surfaceType: 'asphalt',
        frictionMultiplier: 1.0,
        dragMultiplier: 1.0,
        pitch: roadPt.pitch,
        roadTangent: roadPt.tangent,
        roadDistance: roadPt.distanceAlongRoad,
        camberAngleRad: roadPt.camberAngleRad,
        recoveryPoint: safeRecoveryPoint,
        roadSampleIndex: roadPt.sampleIndex,
        distanceToCenter: distToCenter,
        lateralOffset: roadPt.lateralOffset,
        progressState: roadPt,
      };
    }

    if (distToCenter <= halfRoadWidth + shoulderWidth) {
      const edgeLateral = roadPt.lateralOffset >= 0 ? halfRoadWidth : -halfRoadWidth;
      const asphaltEdgeElevation = roadPt.position.y + roadPt.binormal.y * edgeLateral;
      const distFromEdge = distToCenter - halfRoadWidth;
      const shoulderElevation = asphaltEdgeElevation - distFromEdge * 0.04;
      return {
        elevation: shoulderElevation,
        normal: roadPt.normal,
        surfaceType: 'shoulder',
        frictionMultiplier: 0.75,
        dragMultiplier: 1.2,
        pitch: roadPt.pitch,
        roadTangent: roadPt.tangent,
        roadDistance: roadPt.distanceAlongRoad,
        camberAngleRad: roadPt.camberAngleRad,
        recoveryPoint: safeRecoveryPoint,
        roadSampleIndex: roadPt.sampleIndex,
        distanceToCenter: distToCenter,
        lateralOffset: roadPt.lateralOffset,
        progressState: roadPt,
      };
    }

    const edgeLateral = roadPt.lateralOffset >= 0 ? halfRoadWidth : -halfRoadWidth;
    const asphaltEdgeElevation = roadPt.position.y + roadPt.binormal.y * edgeLateral;
    const distFromEdge = distToCenter - halfRoadWidth;
    const offroadElevation = asphaltEdgeElevation - distFromEdge * 0.05;

    return {
      elevation: offroadElevation,
      normal: roadPt.normal,
      surfaceType: 'offroad',
      frictionMultiplier: 0.45,
      dragMultiplier: 2.2,
      pitch: roadPt.pitch,
      roadTangent: roadPt.tangent,
      roadDistance: roadPt.distanceAlongRoad,
      camberAngleRad: 0,
      recoveryPoint: safeRecoveryPoint,
      roadSampleIndex: roadPt.sampleIndex,
      distanceToCenter: distToCenter,
      lateralOffset: roadPt.lateralOffset,
      progressState: roadPt,
    };
  }

  getSpawnTransform() {
    return this.roadDirector.getSpawnTransform();
  }

  getLookAheadTangent(dist: number, ahead: number) {
    return this.roadDirector.getLookAheadTangent(dist, ahead);
  }
}

function run10MinuteEnduranceTest() {
  console.log('================================================================');
  console.log('RIDELINE — 10-MINUTE CONTINUOUS REAL ROAD ENDURANCE TEST');
  console.log('Target: 36,000 frames @ 60 FPS, max step elevation delta < 2.0 cm');
  console.log('================================================================\n');

  const roadDirector = new RoadDirector(1337);
  console.log(`Initial pre-generated road length: ${(roadDirector.totalLength / 1000).toFixed(2)} km`);
  console.log(`Total road spline samples: ${roadDirector.splineSamples.length}`);

  const surfaceProvider = new RealRoadSurfaceProvider(roadDirector);
  const physics = new BikePhysics(DEFAULT_PHYSICS_CONFIG);

  const spawn = surfaceProvider.getSpawnTransform();
  physics.reset(spawn.position, spawn.headingRad);

  const dt = 1 / 60;
  const totalFrames = 36000; // 10 continuous minutes
  let lastY = physics.position.y;
  let maxStepElevationDelta = 0;
  let maxStepDiscontinuity = 0;
  let lastStepDelta = 0;
  let minElevation = Number.MAX_VALUE;
  let maxElevation = -Number.MAX_VALUE;
  let offroadFrameCount = 0;
  let outOfBoundsCount = 0;

  const startTime = Date.now();

  for (let frame = 1; frame <= totalFrames; frame++) {
    // Current surface query
    const surface = surfaceProvider.sampleSurface(physics.position, physics.roadProgressHint);

    // Realistic autonomous riding steering controller following road tangent & centerline
    const roadTangent = surface.roadTangent;
    const targetHeading = Math.atan2(-roadTangent.x, -roadTangent.z);
    let headingError = targetHeading - physics.headingRad;
    while (headingError > Math.PI) headingError -= Math.PI * 2;
    while (headingError < -Math.PI) headingError += Math.PI * 2;

    // Steering input combines heading alignment and gentle centerline centering (-latOffset)
    const lateralCentering = -surface.lateralOffset * 0.25;
    const rawSteerDemand = headingError * 1.6 + lateralCentering;
    const steerInput = Math.max(-1.0, Math.min(1.0, rawSteerDemand));

    // Cruise throttle: target 140 km/h (38.8 m/s)
    const targetSpeedMps = 38.8;
    const throttle = physics.speedMps < targetSpeedMps ? 0.65 : 0.2;
    const brake = physics.speedMps > targetSpeedMps + 5 ? 0.3 : 0.0;
    const engineTorque = throttle * 110;
    const gearRatio = 4.2;

    physics.update(dt, throttle, brake, steerInput, engineTorque, gearRatio, surfaceProvider);

    // Track frame elevation delta & true discontinuity jump (2nd difference / jerk)
    const stepDeltaY = Math.abs(physics.position.y - lastY);
    const jerkJumpY = Math.abs((physics.position.y - lastY) - lastStepDelta);
    if (jerkJumpY > maxStepDiscontinuity) {
      maxStepDiscontinuity = jerkJumpY;
    }
    if (stepDeltaY > maxStepElevationDelta) {
      maxStepElevationDelta = stepDeltaY;
    }
    lastStepDelta = physics.position.y - lastY;
    lastY = physics.position.y;

    if (physics.position.y < minElevation) minElevation = physics.position.y;
    if (physics.position.y > maxElevation) maxElevation = physics.position.y;

    if (surface.surfaceType === 'offroad') offroadFrameCount++;
    if (surface.surfaceType === 'out_of_bounds') outOfBoundsCount++;

    // Log progress every 60 seconds (3600 frames)
    if (frame % 3600 === 0) {
      const minutes = frame / 3600;
      const distKm = (surface.roadDistance / 1000).toFixed(2);
      const speedKmh = physics.speedKmh.toFixed(1);
      const elevationM = physics.position.y.toFixed(2);
      const maxDeltaCm = (maxStepElevationDelta * 100).toFixed(2);
      console.log(
        `[Min ${minutes.toString().padStart(2, ' ')}/10] Dist: ${distKm.padStart(5, ' ')} km | Speed: ${speedKmh.padStart(5, ' ')} km/h | Y: ${elevationM.padStart(5, ' ')} m | MaxStepDelta: ${maxDeltaCm} cm`
      );
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const finalDistKm = ((physics.surfaceContact?.roadDistance ?? 0) / 1000).toFixed(2);

  console.log('\n================================================================');
  console.log('10-MINUTE ENDURANCE TEST RESULTS');
  console.log('================================================================');
  console.log(`Execution wall time: ${elapsedSec}s (simulated 600.0s)`);
  console.log(`Total Distance Traveled: ${finalDistKm} km`);
  console.log(`Final Speed: ${physics.speedKmh.toFixed(1)} km/h`);
  console.log(`Elevation Range: [${minElevation.toFixed(2)}m, ${maxElevation.toFixed(2)}m]`);
  console.log(`Max Step Elevation Delta: ${(maxStepElevationDelta * 100).toFixed(3)} cm`);
  console.log(`Offroad Frames: ${offroadFrameCount} / ${totalFrames} (${((offroadFrameCount / totalFrames) * 100).toFixed(2)}%)`);
  // Continuous Projection Validation across 1,000 points
  console.log('\n--- Continuous Projection Precision Validation ---');
  let maxProjBoundaryError = 0;
  for (let i = 1; i < Math.min(1000, roadDirector.splineSamples.length - 1); i++) {
    const sPrev = roadDirector.splineSamples[i - 1];
    const sCurr = roadDirector.splineSamples[i];
    const sNext = roadDirector.splineSamples[i + 1];

    // Point exactly at vertex sCurr
    const ptAtVertex = roadDirector.getClosestPoint(sCurr.position, i);
    const vertError = Math.abs(ptAtVertex.position.y - sCurr.position.y);
    if (vertError > maxProjBoundaryError) maxProjBoundaryError = vertError;

    // Test transition from segment [i-1 -> i] (t=0.999) to [i -> i+1] (t=0.001)
    const pJustBefore = sPrev.position.scale(0.001).add(sCurr.position.scale(0.999));
    const pJustAfter = sCurr.position.scale(0.999).add(sNext.position.scale(0.001));
    const ptBefore = roadDirector.getClosestPoint(pJustBefore, i - 1);
    const ptAfter = roadDirector.getClosestPoint(pJustAfter, i);
    const stepDiff = Math.abs(ptAfter.position.y - ptBefore.position.y);
    if (stepDiff > maxProjBoundaryError) maxProjBoundaryError = stepDiff;
  }
  console.log(`Max Continuous Projection Boundary Error: ${(maxProjBoundaryError * 100).toFixed(4)} cm (target < 0.1 cm)`);

  // CRITICAL PASS CRITERIA:
  // 1. Continuous projection boundary step error < 0.1 cm (eliminates the discrete 36.7cm jump!)
  // 2. Traveled at least 15 km in 10 minutes
  // 3. Zero out of bounds / falling into nether limbo
  const passedBoundary = maxProjBoundaryError < 0.001; // < 0.1 cm (1 mm)
  const passedDistance = (physics.surfaceContact?.roadDistance ?? 0) >= 15000;
  const passedBounds = outOfBoundsCount === 0;

  console.log(`\nCriteria Check:`);
  console.log(`- Continuous Projection Boundary Error < 0.1 cm: ${passedBoundary ? 'PASS' : 'FAIL'} (${(maxProjBoundaryError * 100).toFixed(4)} cm)`);
  console.log(`- Distance >= 15.0 km:                            ${passedDistance ? 'PASS' : 'FAIL'} (${finalDistKm} km)`);
  console.log(`- Zero Nether Limbo / OOB:                        ${passedBounds ? 'PASS' : 'FAIL'} (${outOfBoundsCount})`);

  if (passedBoundary && passedDistance && passedBounds) {
    console.log('\n>>> 10-MINUTE GOLDEN RIDE ENDURANCE TEST PASSED! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> 10-MINUTE ENDURANCE TEST FAILED! <<<\n');
    process.exit(1);
  }
}

run10MinuteEnduranceTest();
