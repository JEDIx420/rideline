import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BikeDefinition } from './BikeDefinition';
import { BikePhysics } from './BikePhysics';
import { EngineModel } from './EngineModel';
import { Transmission } from './Transmission';
import { BikeVisualController } from './BikeVisualController';
import { Road } from '../world/Road';
import { Terrain } from '../world/Terrain';
import { RiderController } from '../rider/RiderController';
import { LoadedBike } from './BikeLoader';

export class BikeController {
  public physics: BikePhysics;
  public engine: EngineModel;
  public transmission: Transmission;
  public visual: BikeVisualController;
  public rider: RiderController | null = null;
  public loadedBike: LoadedBike | null = null;

  constructor(
    public definition: BikeDefinition,
    visualController: BikeVisualController,
    loadedBike?: LoadedBike
  ) {
    this.physics = new BikePhysics(definition.physics);
    this.engine = new EngineModel(definition.engine);
    this.transmission = new Transmission(definition.transmission);
    this.visual = visualController;
    if (loadedBike) {
      this.loadedBike = loadedBike;
    }
  }

  public setRider(rider: RiderController | null): void {
    this.rider = rider;
  }

  public setLoadedBike(loaded: LoadedBike): void {
    this.loadedBike = loaded;
  }

  public reset(spawnPos: Vector3, spawnHeadingRad: number): void {
    this.physics.reset(spawnPos, spawnHeadingRad);
    this.engine.reset();
    this.transmission.reset();
  }

  public update(
    dt: number,
    throttleInput: number,
    brakeInput: number,
    steerInput: number,
    road: Road,
    terrain?: Terrain
  ): void {
    // 1. Transmission & Automatic Gear shifting (sequential state machine)
    this.transmission.update(
      dt,
      this.engine.currentRpm,
      this.physics.speedMps,
      throttleInput,
      brakeInput,
      this.definition.physics.wheelRadiusMeters
    );

    // 2. Drivetrain & Engine update
    const engagedWheelRpm = this.transmission.calculateRpmFromSpeed(
      this.physics.speedMps,
      this.definition.physics.wheelRadiusMeters
    );

    this.engine.update(
      dt,
      throttleInput,
      engagedWheelRpm,
      this.transmission.isShifting,
      this.transmission.isTorqueCut,
      this.transmission.postShiftTargetRpm
    );

    // 3. Physical dynamics
    const engineTorque = this.engine.getTorque(this.transmission.isTorqueCut);
    const totalRatio = this.transmission.getTotalRatio();

    this.physics.update(
      dt,
      throttleInput,
      brakeInput,
      steerInput,
      engineTorque,
      totalRatio,
      road,
      terrain
    );

    // 4. Visual updates (wheels, forks, roll lean, pitch)
    this.visual.update(dt, this.physics);

    // 5. Rider Posture update
    if (this.rider) {
      this.rider.update(dt, this);
    }
  }

  // Telemetry getters
  public get speedKmh(): number {
    return this.physics.speedKmh;
  }

  public get currentRpm(): number {
    return this.engine.currentRpm;
  }

  public get currentGear(): number {
    return this.transmission.currentGear;
  }

  public get normalizedRpm(): number {
    return this.engine.normalizedRpm;
  }

  public get redlineRpm(): number {
    return this.definition.engine.redlineRpm;
  }

  public get position(): Vector3 {
    return this.physics.position;
  }

  public get headingRad(): number {
    return this.physics.headingRad;
  }

  public get leanAngleRad(): number {
    return this.physics.leanAngleRad;
  }
}
