import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BikeController } from '../bikes/BikeController';

export class RiderPOVCamera {
  public camera: UniversalCamera;
  private currentPos: Vector3 = new Vector3(0, 1.2, 0);

  constructor(private scene: Scene) {
    this.camera = new UniversalCamera('rider_pov_camera', this.currentPos, this.scene);
    this.camera.fov = 1.25; // ~72 degrees wider FOV for immersive cockpit perception
    this.camera.minZ = 0.05;
    this.camera.maxZ = 3500;
  }

  public reset(bike: BikeController): void {
    const anchors = bike.definition.cameraAnchors;
    const heading = bike.headingRad;
    const bikePos = bike.position;

    // Transform local eye offset into world space
    const forwardX = -Math.sin(heading);
    const forwardZ = -Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);

    const worldEyePos = new Vector3(
      bikePos.x + rightX * anchors.riderEyeOffset.x + forwardX * -anchors.riderEyeOffset.z,
      bikePos.y + anchors.riderEyeOffset.y,
      bikePos.z + rightZ * anchors.riderEyeOffset.x + forwardZ * -anchors.riderEyeOffset.z
    );

    this.currentPos.copyFrom(worldEyePos);
    this.camera.position.copyFrom(this.currentPos);
  }

  public update(dt: number, bike: BikeController): void {
    const anchors = bike.definition.cameraAnchors;
    const heading = bike.headingRad;
    const bikePos = bike.position;
    const lean = bike.leanAngleRad;
    const pitch = bike.physics.pitchAngleRad + bike.physics.suspensionPitch;
    const speedMps = bike.physics.speedMps;
    const speedRatio = Math.min(1.0, speedMps / 70.0);

    // Dynamic rider tuck forward at high speeds (aerodynamic crouch behind windscreen)
    const tuckOffsetZ = anchors.riderEyeOffset.z - speedRatio * 0.12;
    const tuckOffsetY = anchors.riderEyeOffset.y - speedRatio * 0.08;

    // Local eye position relative to motorcycle orientation
    const forwardX = -Math.sin(heading);
    const forwardZ = -Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);

    // Rider head lean inside into the corner (apex-focused rider posture)
    const riderHeadLeanOffset = lean * 0.12;

    const targetEyePos = new Vector3(
      bikePos.x + rightX * (anchors.riderEyeOffset.x + riderHeadLeanOffset) + forwardX * -tuckOffsetZ,
      bikePos.y + tuckOffsetY,
      bikePos.z + rightZ * (anchors.riderEyeOffset.x + riderHeadLeanOffset) + forwardZ * -tuckOffsetZ
    );

    // Fast tight damping for helmet camera
    this.currentPos = Vector3.Lerp(this.currentPos, targetEyePos, Math.min(1.0, dt * 25.0));
    this.camera.position.copyFrom(this.currentPos);

    // Horizon / Head stabilization:
    // Rider tilts head to keep horizon relatively level, banking ~20% of bike lean
    const stabilizedRoll = -lean * 0.22;
    const stabilizedPitch = pitch * 0.65;

    // Look-at point far ahead along road + apex glance into turns
    const lookDist = 25.0;
    const apexGlanceX = rightX * (lean * 4.0);
    const apexGlanceZ = rightZ * (lean * 4.0);

    const targetLookAt = new Vector3(
      targetEyePos.x + forwardX * lookDist + apexGlanceX,
      targetEyePos.y + Math.sin(stabilizedPitch) * lookDist - 0.2,
      targetEyePos.z + forwardZ * lookDist + apexGlanceZ
    );

    this.camera.setTarget(targetLookAt);

    // Apply stabilized roll rotation
    const rot = this.camera.rotation;
    rot.z = stabilizedRoll;
    this.camera.rotation = rot;
  }
}
