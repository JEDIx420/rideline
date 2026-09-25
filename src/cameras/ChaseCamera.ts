import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BikeController } from '../bikes/BikeController';

export class ChaseCamera {
  public camera: UniversalCamera;
  private currentPos: Vector3 = new Vector3(0, 5, 10);
  private currentLookAt: Vector3 = new Vector3(0, 1, 0);

  private readonly BASE_DIST = 3.8;
  private readonly BASE_HEIGHT = 1.35;
  private readonly BASE_FOV = 0.95; // ~54 degrees

  constructor(private scene: Scene) {
    this.camera = new UniversalCamera('chase_camera', this.currentPos, this.scene);
    this.camera.fov = this.BASE_FOV;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 3500;
  }

  public reset(bike: BikeController): void {
    const heading = bike.headingRad;
    const bikePos = bike.position;

    const backX = Math.sin(heading) * this.BASE_DIST;
    const backZ = Math.cos(heading) * this.BASE_DIST;

    this.currentPos.set(bikePos.x + backX, bikePos.y + this.BASE_HEIGHT, bikePos.z + backZ);
    this.currentLookAt.set(bikePos.x, bikePos.y + 0.8, bikePos.z);
    this.camera.position.copyFrom(this.currentPos);
    this.camera.setTarget(this.currentLookAt);
  }

  public update(dt: number, bike: BikeController): void {
    const bikePos = bike.position;
    const heading = bike.headingRad;
    const speedMps = bike.physics.speedMps;
    const speedRatio = Math.min(1.0, speedMps / 70.0); // 0 to 1 across 0-250 km/h

    // Dynamic camera distance & height based on speed
    const dynamicDist = this.BASE_DIST + speedRatio * 0.6;
    const dynamicHeight = this.BASE_HEIGHT + speedRatio * 0.15;

    // Camera target behind bike
    const backX = Math.sin(heading) * dynamicDist;
    const backZ = Math.cos(heading) * dynamicDist;

    // Mild lean roll influence on camera position
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);
    const leanOffset = bike.leanAngleRad * 0.25;

    const targetPos = new Vector3(
      bikePos.x + backX + rightX * leanOffset,
      bikePos.y + dynamicHeight,
      bikePos.z + backZ + rightZ * leanOffset
    );

    // LookAt position ahead of bike
    const forwardX = -Math.sin(heading) * 1.5;
    const forwardZ = -Math.cos(heading) * 1.5;
    const targetLookAt = new Vector3(
      bikePos.x + forwardX,
      bikePos.y + 0.85,
      bikePos.z + forwardZ
    );

    // Smooth position and look-at damping
    const posLerp = Math.min(1.0, dt * 10.0);
    const lookLerp = Math.min(1.0, dt * 14.0);

    this.currentPos = Vector3.Lerp(this.currentPos, targetPos, posLerp);
    this.currentLookAt = Vector3.Lerp(this.currentLookAt, targetLookAt, lookLerp);

    this.camera.position.copyFrom(this.currentPos);
    this.camera.setTarget(this.currentLookAt);

    // Subtle speed-dependent dynamic FOV
    this.camera.fov = this.BASE_FOV + speedRatio * 0.15;
  }
}
