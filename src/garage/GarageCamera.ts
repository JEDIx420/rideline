import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export class GarageCamera {
  public camera: ArcRotateCamera;
  private isUserInteracting: boolean = false;
  private currentBayTarget: Vector3 = new Vector3(-1.8, 0.65, 0);
  private desiredBayTarget: Vector3 = new Vector3(-1.8, 0.65, 0);

  constructor(private scene: Scene, private canvas: HTMLCanvasElement) {
    // Start at dynamic 3/4 front-side hero angle framing Bay 1
    this.camera = new ArcRotateCamera(
      'garage_orbit_camera',
      -Math.PI * 0.65,
      Math.PI * 0.38,
      3.0,
      new Vector3(-1.8, 0.65, 0),
      this.scene
    );

    this.configureLimits();
    this.setupInteractionListeners();
  }

  private configureLimits(): void {
    this.camera.lowerRadiusLimit = 2.2;
    this.camera.upperRadiusLimit = 4.5;
    this.camera.lowerBetaLimit = Math.PI * 0.25; // ~45 deg down
    this.camera.upperBetaLimit = Math.PI * 0.46; // keep above floor
    this.camera.wheelPrecision = 45;
    this.camera.pinchPrecision = 45;
    this.camera.angularSensibilityX = 1200;
    this.camera.angularSensibilityY = 1200;
    this.camera.inertia = 0.88;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 200;
  }

  private setupInteractionListeners(): void {
    const onUserAction = () => {
      this.isUserInteracting = true;
    };

    const onUserEnd = () => {
      this.isUserInteracting = false;
    };

    this.canvas.addEventListener('pointerdown', onUserAction);
    this.canvas.addEventListener('pointerup', onUserEnd);
    this.canvas.addEventListener('pointercancel', onUserEnd);
    this.canvas.addEventListener('wheel', onUserAction);
    this.canvas.addEventListener('touchstart', onUserAction, { passive: true });
    this.canvas.addEventListener('touchend', onUserEnd, { passive: true });
  }

  public get userInteracting(): boolean {
    return this.isUserInteracting;
  }

  public attachControl(): void {
    this.camera.attachControl(this.canvas, true);
    this.scene.activeCamera = this.camera;
  }

  public detachControl(): void {
    this.camera.detachControl();
  }

  public dollyToBay(targetPos: Vector3): void {
    this.desiredBayTarget.copyFrom(targetPos);
  }

  public update(dt: number): void {
    // Smooth camera dolly/pan transition between garage bays
    const lerpRate = Math.min(1.0, dt * 5.0);
    this.currentBayTarget = Vector3.Lerp(this.currentBayTarget, this.desiredBayTarget, lerpRate);
    this.camera.target.copyFrom(this.currentBayTarget);
  }

  public setHeroAngle(targetPos: Vector3): void {
    this.desiredBayTarget.copyFrom(targetPos);
    this.currentBayTarget.copyFrom(targetPos);
    this.camera.alpha = -Math.PI * 0.65;
    this.camera.beta = Math.PI * 0.38;
    this.camera.radius = 3.0;
    this.camera.target.copyFrom(targetPos);
  }

  public dispose(): void {
    this.camera.dispose();
  }
}
