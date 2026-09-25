import { Scene } from '@babylonjs/core/scene';
import { GarageScene } from './GarageScene';
import { GarageCamera } from './GarageCamera';
import { GarageUI } from './GarageUI';
import { BikeDefinition } from '../bikes/BikeDefinition';
import { BikeLoader, LoadedBike } from '../bikes/BikeLoader';
import { BikeRegistry } from '../bikes/BikeRegistry';

export class GarageController {
  public garageScene: GarageScene;
  public garageCamera: GarageCamera;
  public garageUI: GarageUI;

  public loadedShowroomBike: LoadedBike | null = null;
  private isTransitioning: boolean = false;

  constructor(
    private scene: Scene,
    private canvas: HTMLCanvasElement,
    private onRideStart: (bike: BikeDefinition) => void,
    private onOpenSettings: () => void
  ) {
    this.garageScene = new GarageScene(this.scene);
    this.garageCamera = new GarageCamera(this.scene, this.canvas);
    this.garageUI = new GarageUI();

    this.bindEvents();
    this.garageCamera.attachControl();
  }

  private bindEvents(): void {
    this.garageUI.onSelectBike((bike) => {
      this.loadShowroomBike(bike);
    });

    this.garageUI.onRide((bike) => {
      this.onRideStart(bike);
    });

    this.garageUI.onSettingsClick(() => {
      this.onOpenSettings();
    });
  }

  public async init(): Promise<void> {
    const initialBike = this.garageUI.getSelectedBike() || BikeRegistry.getDefaultBike();
    await this.loadShowroomBike(initialBike);
  }

  public async loadShowroomBike(bikeDef: BikeDefinition): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Clean up current showroom bike
    if (this.loadedShowroomBike) {
      this.loadedShowroomBike.rootNode.dispose();
      this.loadedShowroomBike = null;
    }

    try {
      this.loadedShowroomBike = await BikeLoader.loadBike(
        bikeDef,
        this.scene,
        this.garageScene.shadowGenerator
      );

      // Place bike centered on showroom pedestal
      const pos = bikeDef.modelPositionOffset || { x: 0, y: 0.08, z: 0 };
      this.loadedShowroomBike.rootNode.position.set(pos.x, pos.y + 0.08, pos.z);
      this.loadedShowroomBike.rootNode.rotation.set(0, -Math.PI * 0.25, 0); // Hero 45-deg angle
    } catch (err) {
      console.error('Failed to load showroom bike:', err);
    } finally {
      this.isTransitioning = false;
    }
  }

  public update(dt: number): void {
    this.garageCamera.update(dt);
  }

  public enterGarageMode(): void {
    this.garageScene.setVisible(true);
    this.garageUI.show();
    this.garageCamera.attachControl();
    this.garageCamera.setHeroAngle();

    if (this.loadedShowroomBike) {
      this.loadedShowroomBike.rootNode.setEnabled(true);
    }
  }

  public exitGarageMode(): void {
    this.garageCamera.detachControl();
    this.garageUI.hide();
    this.garageScene.setVisible(false);

    if (this.loadedShowroomBike) {
      this.loadedShowroomBike.rootNode.dispose();
      this.loadedShowroomBike = null;
    }
  }

  public dispose(): void {
    this.garageCamera.dispose();
    this.garageUI.dispose();
    this.garageScene.dispose();
    if (this.loadedShowroomBike) {
      this.loadedShowroomBike.rootNode.dispose();
    }
  }
}
