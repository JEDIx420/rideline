import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export class GarageCamera {
  public camera: ArcRotateCamera;
  private isUserInteracting: boolean = false;
  private lastInteractionTime: number = 0;
  private autoRotateSpeed: number = 0.15; // rad per sec

  constructor(private scene: Scene, private canvas: HTMLCanvasElement) {
    // Start at dynamic 3/4 front-side hero angle
    this.camera = new ArcRotateCamera(
      'garage_orbit_camera',
      -Math.PI * 0.65,
      Math.PI * 0.38,
      3.2,
      new Vector3(0, 0.65, 0),
      this.scene
    );

    this.configureLimits();
    this.setupInteractionListeners();
  }

  private configureLimits(): void {
    this.camera.lowerRadiusLimit = 2.2;
    this.camera.upperRadiusLimit = 4.8;
    this.camera.lowerBetaLimit = Math.PI * 0.25; // ~45 deg down
    this.camera.upperBetaLimit = Math.PI * 0.48; // just above ground
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
      this.lastInteractionTime = performance.now();
    };

    const onUserEnd = () => {
      this.isUserInteracting = false;
      this.lastInteractionTime = performance.now();
    };

    this.canvas.addEventListener('pointerdown', onUserAction);
    this.canvas.addEventListener('pointerup', onUserEnd);
    this.canvas.addEventListener('pointercancel', onUserEnd);
    this.canvas.addEventListener('wheel', onUserAction);
    this.canvas.addEventListener('touchstart', onUserAction, { passive: true });
    this.canvas.addEventListener('touchend', onUserEnd, { passive: true });
  }

  public attachControl(): void {
    this.camera.attachControl(this.canvas, true);
    this.scene.activeCamera = this.camera;
  }

  public detachControl(): void {
    this.camera.detachControl();
  }

  public update(dt: number): void {
    const now = performance.now();
    // Resume slow cinematic turntable auto-orbit after 2.5s of inactivity
    if (!this.isUserInteracting && (now - this.lastInteractionTime > 2500)) {
      this.camera.alpha += this.autoRotateSpeed * dt;
    }
  }

  public setHeroAngle(): void {
    this.camera.alpha = -Math.PI * 0.65;
    this.camera.beta = Math.PI * 0.38;
    this.camera.radius = 3.2;
    this.camera.target.set(0, 0.65, 0);
  }

  public dispose(): void {
    this.camera.dispose();
  }
}
