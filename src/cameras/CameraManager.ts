import { Scene } from '@babylonjs/core/scene';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { ChaseCamera } from './ChaseCamera';
import { RiderPOVCamera } from './RiderPOVCamera';
import { BikeController } from '../bikes/BikeController';

export type CameraMode = 'chase' | 'cockpit';

export class CameraManager {
  public chaseCamera: ChaseCamera;
  public riderCamera: RiderPOVCamera;
  public currentMode: CameraMode = 'chase';

  constructor(private scene: Scene) {
    this.chaseCamera = new ChaseCamera(this.scene);
    this.riderCamera = new RiderPOVCamera(this.scene);
    this.setActiveMode('chase');
  }

  public setActiveMode(mode: CameraMode, bike?: BikeController): void {
    this.currentMode = mode;
    if (bike?.rider) {
      bike.rider.setFirstPerson(mode === 'cockpit');
    }
    if (mode === 'chase') {
      this.scene.activeCamera = this.chaseCamera.camera;
      if (bike) this.chaseCamera.reset(bike);
    } else {
      this.scene.activeCamera = this.riderCamera.camera;
      if (bike) this.riderCamera.reset(bike);
    }
  }

  public toggleCamera(bike?: BikeController): CameraMode {
    const nextMode: CameraMode = this.currentMode === 'chase' ? 'cockpit' : 'chase';
    this.setActiveMode(nextMode, bike);
    return this.currentMode;
  }

  public update(dt: number, bike: BikeController): void {
    if (this.currentMode === 'chase') {
      this.chaseCamera.update(dt, bike);
    } else {
      this.riderCamera.update(dt, bike);
    }
  }

  public getActiveCamera(): Camera {
    return this.currentMode === 'chase' ? this.chaseCamera.camera : this.riderCamera.camera;
  }
}
