import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';

import { BikeLoader, LoadedBike } from '../bikes/BikeLoader';
import { S1000RR_2019, M1000RR_RACE } from '../bikes/BikeRegistry';
import { BikeController } from '../bikes/BikeController';
import { RiderController } from '../rider/RiderController';
import { CANONICAL_RIDER_DEFINITION } from '../rider/RiderDefinition';
import { RiderLoader } from '../rider/RiderLoader';
import { getRiderBikeProfile } from '../rider/RiderBikeProfile';

export type CameraPresetKey =
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'front34'
  | 'rear34'
  | 'top';

export interface CameraPreset {
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
}

export const RIDER_FIT_CAMERA_PRESETS: Record<CameraPresetKey, CameraPreset> = {
  // Front: looking towards +Z (facing bike nose)
  front: {
    alpha: -Math.PI / 2,
    beta: 1.35,
    radius: 2.8,
    target: new Vector3(0, 0.65, 0),
  },
  // Rear: looking towards -Z (behind bike tail)
  rear: {
    alpha: Math.PI / 2,
    beta: 1.35,
    radius: 2.8,
    target: new Vector3(0, 0.65, 0),
  },
  // Left: looking at bike's left flank
  left: {
    alpha: Math.PI,
    beta: 1.38,
    radius: 2.7,
    target: new Vector3(0, 0.62, 0),
  },
  // Right: looking at bike's right flank
  right: {
    alpha: 0,
    beta: 1.38,
    radius: 2.7,
    target: new Vector3(0, 0.62, 0),
  },
  // Front 3/4: hero view of front 3/4
  front34: {
    alpha: -Math.PI * 0.72,
    beta: 1.28,
    radius: 2.9,
    target: new Vector3(0, 0.65, 0),
  },
  // Rear 3/4: hero view of rear 3/4 showing saddle & knee wrap
  rear34: {
    alpha: Math.PI * 0.72,
    beta: 1.28,
    radius: 2.9,
    target: new Vector3(0, 0.65, 0),
  },
  // Top: overhead view looking directly down onto tank & rider posture
  top: {
    alpha: -Math.PI / 2,
    beta: 0.08,
    radius: 3.1,
    target: new Vector3(0, 0.65, 0),
  },
};

export class RiderFitLab {
  public engine: Engine;
  public scene: Scene;
  public camera: ArcRotateCamera;
  public shadowGenerator: ShadowGenerator | null = null;

  public loadedBike: LoadedBike | null = null;
  public bikeController: BikeController | null = null;
  public riderController: RiderController | null = null;

  // Dynamic simulation parameters
  public leanAngleRad: number = 0;
  public steerAngleRad: number = 0;
  public speedKmh: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.14, 0.14, 0.16, 1.0);

    // ACES Tonemapping
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.0;
    this.scene.imageProcessingConfiguration.contrast = 1.05;

    // Studio camera
    this.camera = new ArcRotateCamera(
      'rider_fit_camera',
      -Math.PI * 0.72,
      1.28,
      2.9,
      new Vector3(0, 0.65, 0),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.wheelPrecision = 50;

    this.setupLighting();
    this.setupNeutralStudioFloor();

    this.engine.runRenderLoop(() => {
      this.update();
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupLighting(): void {
    const keyLight = new DirectionalLight(
      'rider_lab_key',
      new Vector3(-0.6, -1.0, 0.5).normalize(),
      this.scene
    );
    keyLight.intensity = 1.8;
    keyLight.diffuse = new Color3(1.0, 0.98, 0.95);

    this.shadowGenerator = new ShadowGenerator(2048, keyLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;

    const fillLight = new HemisphericLight(
      'rider_lab_fill',
      new Vector3(0, 1, 0),
      this.scene
    );
    fillLight.intensity = 0.55;
    fillLight.groundColor = new Color3(0.2, 0.2, 0.22);
    fillLight.diffuse = new Color3(0.88, 0.90, 0.96);
  }

  private setupNeutralStudioFloor(): void {
    const floor = MeshBuilder.CreateGround('rider_lab_floor', { width: 30, height: 30 }, this.scene);
    const floorMat = new StandardMaterial('rider_lab_floor_mat', this.scene);
    floorMat.diffuseColor = new Color3(0.18, 0.18, 0.20);
    floorMat.specularColor = new Color3(0.08, 0.08, 0.08);
    floor.material = floorMat;
    floor.receiveShadows = true;
  }

  public async loadBikeAndRider(bikeId: string = 's1000rr-2019'): Promise<void> {
    const bikeDef = bikeId === 'bike-02' ? M1000RR_RACE : S1000RR_2019;

    // 1. Load motorcycle
    this.loadedBike = await BikeLoader.loadBike(bikeDef, this.scene, this.shadowGenerator);
    this.bikeController = new BikeController(bikeDef, this.loadedBike.visualController, this.loadedBike);

    // Place bike with zero ground submersion
    const contactOffset = bikeDef.physics.groundContactOffsetY || 0.556;
    this.loadedBike.physicsRoot.position.set(0, contactOffset, 0);

    // 2. Load rider
    const loadedRider = await RiderLoader.loadRider(
      CANONICAL_RIDER_DEFINITION,
      this.scene,
      this.shadowGenerator
    );

    const profile = getRiderBikeProfile(bikeDef.id);
    this.riderController = new RiderController(loadedRider.rootNode, loadedRider.rig, profile);

    // Attach rider to motorcycle
    this.riderController.attachToBike(
      this.loadedBike.physicsRoot,
      this.loadedBike.riderTargets
    );

    console.log(`RiderFitLab loaded ${bikeDef.displayName} with canonical rider.`);
  }

  public setCameraView(presetKey: CameraPresetKey): void {
    const preset = RIDER_FIT_CAMERA_PRESETS[presetKey];
    if (!preset) return;
    this.camera.alpha = preset.alpha;
    this.camera.beta = preset.beta;
    this.camera.radius = preset.radius;
    this.camera.target.copyFrom(preset.target);
  }

  public setLeanAngle(leanDeg: number): void {
    this.leanAngleRad = (leanDeg * Math.PI) / 180;
    if (this.bikeController) {
      this.bikeController.physics.leanAngleRad = this.leanAngleRad;
    }
  }

  public setSpeedKmh(speedKmh: number): void {
    this.speedKmh = speedKmh;
    if (this.bikeController) {
      this.bikeController.physics.speedMps = speedKmh / 3.6;
    }
  }

  public setSteerAngle(steerDeg: number): void {
    this.steerAngleRad = (steerDeg * Math.PI) / 180;
    if (this.bikeController) {
      this.bikeController.physics.steerAngleRad = this.steerAngleRad;
    }
  }

  private update(): void {
    const dt = 1 / 60;
    if (this.bikeController && this.riderController) {
      const contactOffset = this.bikeController.definition.physics.groundContactOffsetY || 0.556;
      this.bikeController.physics.position.set(0, contactOffset, 0);

      // Update visual animations (forks, handlebars, etc.)
      this.bikeController.visual.update(dt, this.bikeController.physics);

      // Update rider kinematics & IK
      this.riderController.update(dt, this.bikeController);
    }
  }
}
