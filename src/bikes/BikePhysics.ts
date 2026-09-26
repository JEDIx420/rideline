import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { BikePhysicsConfig } from '../config/physics';
import { WorldSurfaceQuery, WorldSurfaceQueryProvider, RoadProgressHint } from '../world/WorldSurfaceQuery';

export class BikePhysics {
  public position: Vector3 = new Vector3(0, 0, 0);
  public velocity: Vector3 = new Vector3(0, 0, 0);
  public speedMps: number = 0; // Speed in m/s
  public accelerationMps2: number = 0;

  public headingRad: number = 0; // Yaw angle in radians (0 = along -Z, negative = right, positive = left)
  public leanAngleRad: number = 0; // Roll / lean angle (positive = leaning right, negative = leaning left)
  public targetLeanRad: number = 0;
  public steerAngleRad: number = 0; // Visual steering angle of front forks
  public pitchAngleRad: number = 0; // Pitch angle along road/surface incline

  public suspensionPitch: number = 0; // Dynamic pitch squat/dive
  public surfaceContact: WorldSurfaceQuery | null = null;
  public roadProgressHint: RoadProgressHint = { isTeleport: true };

  private readonly AIR_DENSITY = 1.225; // kg/m^3
  private readonly GRAVITY = 9.81; // m/s^2

  constructor(public config: BikePhysicsConfig) {}

  public reset(spawnPos: Vector3, spawnHeadingRad: number): void {
    this.position.set(spawnPos.x, spawnPos.y + this.config.groundContactOffsetY, spawnPos.z);
    this.velocity.set(0, 0, 0);
    this.speedMps = 0;
    this.accelerationMps2 = 0;
    this.headingRad = spawnHeadingRad;
    this.leanAngleRad = 0;
    this.targetLeanRad = 0;
    this.steerAngleRad = 0;
    this.pitchAngleRad = 0;
    this.suspensionPitch = 0;
    this.surfaceContact = null;
    this.roadProgressHint = { isTeleport: true };
  }

  public update(
    dt: number,
    throttle: number,
    brake: number,
    steerInput: number, // -1 (left) to +1 (right)
    engineTorqueNm: number,
    totalGearRatio: number,
    surfaceProvider: WorldSurfaceQueryProvider
  ): void {
    // 0. Surface Contact Detection via WorldSurfaceQueryProvider
    const surface = surfaceProvider.sampleSurface(this.position, this.roadProgressHint);
    this.surfaceContact = surface;
    this.roadProgressHint = {
      lastSampleIndex: surface.roadSampleIndex,
      lastDistance: surface.roadDistance,
      isTeleport: false,
    };


    // 1. Longitudinal Forces & Acceleration
    const driveForce = (engineTorqueNm * totalGearRatio) / this.config.wheelRadiusMeters;
    const aeroDrag =
      0.5 *
      this.AIR_DENSITY *
      this.config.dragCoefficient *
      this.config.frontalAreaM2 *
      this.speedMps *
      this.speedMps;
    const rollingResistance =
      this.config.rollingResistance * this.config.massKg * this.GRAVITY * surface.dragMultiplier;
    const brakingForce = brake * this.config.massKg * this.config.maxBrakingDecel * surface.frictionMultiplier;

    let netForce = driveForce - aeroDrag - rollingResistance - (this.speedMps > 0.05 ? brakingForce : 0);

    // Prevent reverse motion from braking
    if (this.speedMps <= 0.05 && netForce < 0 && throttle === 0) {
      netForce = 0;
      this.speedMps = 0;
    }

    // Water deceleration
    if (surface.surfaceType === 'water') {
      this.speedMps = Math.max(0, this.speedMps - 16.0 * dt);
      netForce = Math.min(0, netForce);
    }

    this.accelerationMps2 = netForce / this.config.massKg;
    this.speedMps = Math.max(0, this.speedMps + this.accelerationMps2 * dt);

    // Hard top-speed governor (~315 km/h / 87.5 m/s for S1000RR)
    this.speedMps = Math.min(87.5, this.speedMps);

    // 2. Lateral Dynamics, Steering & Dynamic Lean
    const speedKmh = this.speedMps * 3.6;
    const maxLeanDeg = surface.surfaceType === 'offroad' ? Math.min(28, this.config.maxLeanAngleDeg * 0.6) : this.config.maxLeanAngleDeg;
    const maxLeanRad = (maxLeanDeg * Math.PI) / 180;

    // Speed-dependent steering agility & countersteering response
    const speedFactor = Math.min(1.0, this.speedMps / 6.0); // 0 at stop, 1 above 22 km/h

    // Target lean angle based on steering input and speed
    if (Math.abs(steerInput) > 0.01) {
      // High speed: steering input directly commands lean angle
      const leanDemand = steerInput * maxLeanRad;
      this.targetLeanRad = leanDemand * Math.min(1.0, (speedKmh + 15) / 60);
    } else {
      // Natural return to upright vertical stability
      this.targetLeanRad = 0;
    }

    // Smooth lean roll transition
    const leanRate = this.config.leanSpeed * (1.0 + speedFactor * 0.5) * surface.frictionMultiplier;
    const leanDiff = this.targetLeanRad - this.leanAngleRad;
    this.leanAngleRad += leanDiff * Math.min(1.0, dt * leanRate);

    // Physical cornering yaw rate from lean angle (centripetal balance)
    let yawRate = 0;
    if (this.speedMps > 0.5) {
      // Turn radius from lean angle: tan(lean) = v^2 / (g * R) => yawRate = v / R = (g * tan(lean)) / v
      const effectiveLean = this.leanAngleRad;
      const centripetalYawRate = ((this.GRAVITY * Math.tan(effectiveLean)) / Math.max(2.0, this.speedMps)) * surface.frictionMultiplier;
      // Low speed direct handlebar steering contribution
      const directYawRate = -steerInput * (1.0 - speedFactor) * 1.8;
      yawRate = -centripetalYawRate + directYawRate;
    } else if (Math.abs(steerInput) > 0.01) {
      // Push turn while stopped / creeping
      yawRate = -steerInput * 0.8;
    }

    this.headingRad += yawRate * dt;

    // Visual fork steering angle (turns into turn at low speed, countersteer flick at high speed)
    const visualSteerTarget =
      (1.0 - speedFactor) * (steerInput * 0.4) +
      speedFactor * (-this.leanAngleRad * 0.12 + steerInput * 0.06);
    this.steerAngleRad += (visualSteerTarget - this.steerAngleRad) * Math.min(1.0, dt * 10.0);

    // 3. World Position Update
    const forwardX = -Math.sin(this.headingRad);
    const forwardZ = -Math.cos(this.headingRad);

    this.position.x += forwardX * this.speedMps * dt;
    this.position.z += forwardZ * this.speedMps * dt;

    // 4. Surface Elevation & Pitch Snapping
    this.position.y = surface.elevation + this.config.groundContactOffsetY;
    this.pitchAngleRad = surface.pitch;

    // 5. Suspension Squat & Dive
    const targetSuspensionPitch = (this.accelerationMps2 / 10.0) * this.config.suspensionStiffness;
    this.suspensionPitch += (targetSuspensionPitch - this.suspensionPitch) * Math.min(1.0, dt * 12.0);

    // 6. Soft Road Edge Collision Boundary & Safety Auto-Recovery
    const distFromCenter = surface.distanceToCenter;
    const roadHalfWidth = 4.6 + 2.2; // Two 4.2m lanes + shoulder

    if (surface.surfaceType === 'out_of_bounds' || distFromCenter > 50.0) {
      // Emergency recovery corridor: smoothly glide bike back to road edge
      const toRoad = surface.recoveryPoint.subtract(this.position);
      toRoad.y = 0;
      const pullSpeed = Math.min(22.0, toRoad.length() * 2.0);
      const pullDir = toRoad.normalize();
      this.position.x += pullDir.x * pullSpeed * dt;
      this.position.z += pullDir.z * pullSpeed * dt;
      this.speedMps = Math.max(0, this.speedMps - 20.0 * dt);
      const targetHeading = Math.atan2(-surface.roadTangent.x, -surface.roadTangent.z);
      this.headingRad += (targetHeading - this.headingRad) * Math.min(1.0, dt * 6.0);
    } else if (distFromCenter > roadHalfWidth && surface.surfaceType !== 'water') {
      // Off-road drag & mild slide friction
      this.speedMps = Math.max(0, this.speedMps - 8.0 * dt);
    }
  }

  /**
   * Helper to get total motorcycle rotation quaternion
   */
  public getRotationQuaternion(): Quaternion {
    const totalPitch = this.pitchAngleRad + this.suspensionPitch;
    const qYaw = Quaternion.RotationAxis(Vector3.Up(), this.headingRad);
    const qPitch = Quaternion.RotationAxis(Vector3.Right(), totalPitch);
    const qRoll = Quaternion.RotationAxis(Vector3.Forward(), -this.leanAngleRad);
    return qYaw.multiply(qPitch).multiply(qRoll);
  }

  public get speedKmh(): number {
    return this.speedMps * 3.6;
  }
}
