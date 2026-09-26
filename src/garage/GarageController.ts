import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { GarageScene } from './GarageScene';
import { GarageCamera } from './GarageCamera';
import { GarageUI } from './GarageUI';
import { BikeDefinition } from '../bikes/BikeDefinition';
import { BikeLoader, LoadedBike } from '../bikes/BikeLoader';
import { S1000RR_2019, M1000RR_RACE } from '../bikes/BikeRegistry';

export class GarageController {
  public garageScene: GarageScene;
  public garageCamera: GarageCamera;
  public garageUI: GarageUI;

  // Two physical garage bays
  public bay1Bike: LoadedBike | null = null;
  public bay2Bike: LoadedBike | null = null;

  public readonly BAY_1_POS: Vector3 = new Vector3(-1.85, 0, 0);
  public readonly BAY_2_POS: Vector3 = new Vector3(1.85, 0, 0);

  private selectedBikeDef: BikeDefinition = S1000RR_2019;

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
      this.focusBike(bike);
    });

    this.garageUI.onRide((bike) => {
      this.onRideStart(bike);
    });

    this.garageUI.onSettingsClick(() => {
      this.onOpenSettings();
    });
  }

  public async init(): Promise<void> {
    this.updateInitialLoader(10, 'PREPARING WORKSHOP...');

    // Load both canonical motorcycles into their respective garage bays
    try {
      this.updateInitialLoader(25, `PARKING ${S1000RR_2019.displayName.toUpperCase()} IN BAY 1...`);
      this.bay1Bike = await BikeLoader.loadBike(
        S1000RR_2019,
        this.scene,
        this.garageScene.shadowGenerator
      );
      this.alignBikeToFloor(this.bay1Bike, this.BAY_1_POS, -0.15, 0.546);

      this.updateInitialLoader(65, `PARKING ${M1000RR_RACE.displayName.toUpperCase()} IN BAY 2...`);
      this.bay2Bike = await BikeLoader.loadBike(
        M1000RR_RACE,
        this.scene,
        this.garageScene.shadowGenerator
      );
      this.alignBikeToFloor(this.bay2Bike, this.BAY_2_POS, 0.15, 0.444);

      // Focus Bay 1 initially
      this.selectedBikeDef = S1000RR_2019;
      this.garageCamera.setHeroAngle(new Vector3(this.BAY_1_POS.x, 0.65, this.BAY_1_POS.z));
    } catch (err) {
      console.error('Failed to populate garage bays:', err);
    } finally {
      this.dismissInitialLoader();
    }
  }

  private alignBikeToFloor(
    bike: LoadedBike,
    bayCenter: Vector3,
    yawAngleRad: number,
    calibratedGroundY: number
  ): void {
    // Dynamic minimum vertex ground calculation with fallback to calibrated value
    let groundOffset = calibratedGroundY;
    const lowestY = this.computeLowestVertexY(bike.meshes);
    if (lowestY !== null && isFinite(lowestY)) {
      groundOffset = -lowestY;
    }

    bike.physicsRoot.position.set(bayCenter.x, groundOffset, bayCenter.z);
    bike.physicsRoot.rotation.set(0, yawAngleRad, 0);
  }

  private computeLowestVertexY(meshes: AbstractMesh[]): number | null {
    let minY = Infinity;
    for (const mesh of meshes) {
      if (mesh.getTotalVertices() > 0) {
        mesh.computeWorldMatrix(true);
        const bInfo = mesh.getBoundingInfo();
        const worldMinY = bInfo.boundingBox.minimumWorld.y;
        if (worldMinY < minY) {
          minY = worldMinY;
        }
      }
    }
    return isFinite(minY) ? minY : null;
  }

  public focusBike(bikeDef: BikeDefinition): void {
    this.selectedBikeDef = bikeDef;
    if (bikeDef.id === S1000RR_2019.id) {
      this.garageCamera.dollyToBay(new Vector3(this.BAY_1_POS.x, 0.65, this.BAY_1_POS.z));
    } else {
      this.garageCamera.dollyToBay(new Vector3(this.BAY_2_POS.x, 0.65, this.BAY_2_POS.z));
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
    this.updateInitialLoader(100, 'RIDELINE WORKSHOP READY');
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

    if (this.bay1Bike) this.bay1Bike.physicsRoot.setEnabled(true);
    if (this.bay2Bike) this.bay2Bike.physicsRoot.setEnabled(true);

    this.focusBike(this.selectedBikeDef);
  }

  public exitGarageMode(): void {
    this.garageCamera.detachControl();
    this.garageUI.hide();
    this.garageScene.setVisible(false);

    // Hide bikes in garage while riding on road
    if (this.bay1Bike) this.bay1Bike.physicsRoot.setEnabled(false);
    if (this.bay2Bike) this.bay2Bike.physicsRoot.setEnabled(false);
  }

  public dispose(): void {
    this.garageCamera.dispose();
    this.garageUI.dispose();
    this.garageScene.dispose();
    this.bay1Bike?.physicsRoot.dispose();
    this.bay2Bike?.physicsRoot.dispose();
  }
}
