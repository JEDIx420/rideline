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
  private isFirstLoad: boolean = true;

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
    this.updateInitialLoader(10, `DOWNLOADING ${initialBike.displayName.toUpperCase()}...`);
    await this.loadShowroomBike(initialBike);
    this.dismissInitialLoader();
    this.isFirstLoad = false;
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
        this.garageScene.shadowGenerator,
        (pct) => {
          if (this.isFirstLoad) {
            const mappedPct = Math.min(98, Math.max(10, Math.floor(10 + pct * 0.88)));
            this.updateInitialLoader(mappedPct, `LOADING ${bikeDef.displayName.toUpperCase()} (${pct}%)...`);
          }
        }
      );

      // Place bike centered on showroom pedestal
      const pos = bikeDef.modelPositionOffset || { x: 0, y: 0.08, z: 0 };
      this.loadedShowroomBike.rootNode.position.set(pos.x, pos.y + 0.08, pos.z);
      this.loadedShowroomBike.rootNode.rotation.set(0, -Math.PI * 0.25, 0); // Hero 45-deg angle
    } catch (err) {
      console.error('Failed to load showroom bike:', err);
      if (this.isFirstLoad) {
        this.updateInitialLoader(100, 'ERROR LOADING 3D MODEL. CHECK NETWORK.');
      }
    } finally {
      this.isTransitioning = false;
    }
  }

  private updateInitialLoader(pct: number, statusText: string): void {
    const bar = document.getElementById('init-loader-bar');
    const status = document.getElementById('init-loader-status');
    const pctElem = document.getElementById('init-loader-pct');

    if (bar) bar.style.width = `${pct}%`;
    if (status) status.textContent = statusText;
    if (pctElem) pctElem.textContent = `${pct}%`;
  }

  public dismissInitialLoader(): void {
    this.updateInitialLoader(100, 'SHOWROOM READY');
    const loader = document.getElementById('rideline-initial-loader');
    if (loader) {
      setTimeout(() => {
        loader.classList.add('loaded');
        setTimeout(() => loader.remove(), 700);
      }, 300);
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
