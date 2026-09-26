import { BikePhysics } from '../src/bikes/BikePhysics';
import { DEFAULT_PHYSICS_CONFIG } from '../src/config/physics';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { WorldSurfaceQuery, WorldSurfaceQueryProvider, RoadProgressHint } from '../src/world/WorldSurfaceQuery';

class FlatRoadSurfaceProvider implements WorldSurfaceQueryProvider {
  sampleSurface(pos: Vector3, hint?: RoadProgressHint): WorldSurfaceQuery {
    return {
      elevation: 0,
      normal: new Vector3(0, 1, 0),
      surfaceType: 'asphalt',
      frictionMultiplier: 1.0,
      dragMultiplier: 1.0,
      pitch: 0,
      roadTangent: new Vector3(0, 0, -1),
      roadDistance: -pos.z,
      camberAngleRad: 0,
      recoveryPoint: new Vector3(0, 0, pos.z),
      roadSampleIndex: Math.floor(Math.max(0, -pos.z / 2.5)),
      distanceToCenter: Math.abs(pos.x),
      lateralOffset: pos.x,
    };
  }

  getSpawnTransform() {
    return {
      position: new Vector3(0, 0, 0),
      headingRad: 0,
      normal: new Vector3(0, 1, 0),
    };
  }
}

function runSteeringTest(initialSpeedKmh: number, steerInput: number, durationSec: number = 1.0) {
  const surfaceProvider = new FlatRoadSurfaceProvider();
  const physics = new BikePhysics(DEFAULT_PHYSICS_CONFIG);

  const startPos = new Vector3(0, 0, 0);
  const startHeading = 0; // Travelling along -Z
  physics.reset(startPos, startHeading);
  physics.speedMps = initialSpeedKmh / 3.6;

  const dt = 1 / 60;
  const steps = Math.round(durationSec / dt);

  for (let i = 0; i < steps; i++) {
    // Engine torque 300Nm, ratio 4.0 keeps bike cruising
    physics.update(dt, 0.3, 0, steerInput, 300, 4.0, surfaceProvider);
  }

  const displacement = physics.position.subtract(startPos);
  // At heading 0, bike travels along -Z, local right vector is +X
  const localRight = new Vector3(1, 0, 0);
  const lateralDot = Vector3.Dot(displacement, localRight);

  return {
    initialSpeedKmh,
    steerInput,
    finalSpeedKmh: physics.speedKmh,
    position: physics.position.clone(),
    headingRad: physics.headingRad,
    leanAngleRad: physics.leanAngleRad,
    lateralDot,
  };
}

function main() {
  console.log('====================================================');
  console.log('RIDELINE — DETERMINISTIC STEERING REGRESSION TEST');
  console.log('====================================================\n');

  const speeds = [10, 50, 120];
  let allPassed = true;

  for (const speed of speeds) {
    console.log(`--- Testing Speed: ${speed} km/h ---`);

    // Test Right Steer (+1)
    const rightRes = runSteeringTest(speed, +1.0, 1.0);
    const rightPass = rightRes.lateralDot > 0 && rightRes.leanAngleRad > 0;
    console.log(
      `[STEER +1 (RIGHT)] lateralDot: ${rightRes.lateralDot.toFixed(3)} (expected > 0), lean: ${(rightRes.leanAngleRad * 180 / Math.PI).toFixed(1)}° -> ${rightPass ? 'PASS' : 'FAIL'}`
    );
    if (!rightPass) allPassed = false;

    // Test Left Steer (-1)
    const leftRes = runSteeringTest(speed, -1.0, 1.0);
    const leftPass = leftRes.lateralDot < 0 && leftRes.leanAngleRad < 0;
    console.log(
      `[STEER -1 (LEFT)]  lateralDot: ${leftRes.lateralDot.toFixed(3)} (expected < 0), lean: ${(leftRes.leanAngleRad * 180 / Math.PI).toFixed(1)}° -> ${leftPass ? 'PASS' : 'FAIL'}`
    );
    if (!leftPass) allPassed = false;

    console.log('');
  }

  if (allPassed) {
    console.log('>>> ALL STEERING REGRESSION TESTS PASSED! <<<');
    process.exit(0);
  } else {
    console.error('>>> STEERING REGRESSION TESTS FAILED! <<<');
    process.exit(1);
  }
}

main();
