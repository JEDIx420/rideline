import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { BikeLoader } from '../bikes/BikeLoader';
import '@babylonjs/loaders/glTF';

export interface WheelMeshReport {
  meshName: string;
  materialName: string;
  materialType: string;
  baseColorFactor: { r: number; g: number; b: number; a?: number } | null;
  baseColorTexture: any | null;
  normalTexture: any | null;
  metallicRoughnessTexture: any | null;
  aoTexture: any | null;
  emissiveTexture: any | null;
  texCoordIndex: number;
  textureReadyStatus: boolean;
  textureDimensions: { width: number; height: number } | null;
  gammaSpace: boolean | null;
  alphaMode: number;
  doubleSided: boolean;
  transparencyMode?: number;
}

export class ModelMaterialLab {
  public engine: Engine;
  public scene: Scene;
  public camera: ArcRotateCamera;
  public report: WheelMeshReport[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.18, 0.18, 0.20, 1.0);

    // ACES Tonemapping
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType =
      ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.0;
    this.scene.imageProcessingConfiguration.contrast = 1.0;

    // Neutral studio camera
    this.camera = new ArcRotateCamera(
      'lab_camera',
      -Math.PI / 2, // Side view initially
      Math.PI / 2.3,
      2.8,
      new Vector3(0, 0.5, 0),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.wheelPrecision = 50;

    this.setupLighting();
    this.setupNeutralFloor();

    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupLighting(): void {
    // Controlled neutral key light (Directional)
    const keyLight = new DirectionalLight(
      'lab_key_light',
      new Vector3(-0.6, -1.0, 0.5).normalize(),
      this.scene
    );
    keyLight.intensity = 1.6;
    keyLight.diffuse = new Color3(1.0, 0.98, 0.95);

    // Neutral fill / hemispheric light
    const hemiLight = new HemisphericLight(
      'lab_hemi_light',
      new Vector3(0, 1, 0),
      this.scene
    );
    hemiLight.intensity = 0.5;
    hemiLight.groundColor = new Color3(0.2, 0.2, 0.2);
    hemiLight.diffuse = new Color3(0.85, 0.88, 0.95);
  }

  private setupNeutralFloor(): void {
    const floor = MeshBuilder.CreateGround('lab_floor', { width: 20, height: 20 }, this.scene);
    const floorMat = new StandardMaterial('lab_floor_mat', this.scene);
    floorMat.diffuseColor = new Color3(0.22, 0.22, 0.24);
    floorMat.specularColor = new Color3(0.08, 0.08, 0.08);
    floor.material = floorMat;
    floor.position.y = 0;
  }

  public async loadModel(url: string = 'assets/bikes/s1000rr-2019/model.glb', tuneMaterials: boolean = true): Promise<void> {
    const res = await SceneLoader.ImportMeshAsync('', '', url, this.scene);
    const root = res.meshes[0];
    root.name = 'lab_bike_root';

    // Center root and place tyres on ground
    let minY = 999;
    res.meshes.forEach((m) => {
      const b = m.getBoundingInfo().boundingBox;
      if (b.minimumWorld.y < minY) minY = b.minimumWorld.y;
    });
    root.position.y = -minY;

    // Tune materials if requested
    if (tuneMaterials) {
      res.meshes.forEach((m) => {
        if (m.material) {
          BikeLoader.tuneMeshMaterials(m.material);
        }
      });
    }

    // Run audit on all submeshes
    this.report = this.auditAllMaterials(res.meshes);
    console.log('=== MODEL MATERIAL LAB: FULL AUDIT ===\n', JSON.stringify(this.report, null, 2));
  }

  public auditAllMaterials(meshes: any[]): WheelMeshReport[] {
    const reports: WheelMeshReport[] = [];

    const inspectMat = (m: any, mat: any) => {
      if (!mat) return;
      const isPBR = mat instanceof PBRMaterial || mat.getClassName() === 'PBRMaterial';
      const albedoTex = isPBR ? mat.albedoTexture : mat.diffuseTexture;
      const bumpTex = mat.bumpTexture;
      const metallicTex = isPBR ? mat.metallicTexture : null;
      const aoTex = isPBR ? mat.ambientTexture : null;
      const emissiveTex = mat.emissiveTexture;

      const texCoord = albedoTex ? albedoTex.coordinatesIndex : 0;
      const isReady = albedoTex ? albedoTex.isReady() : false;
      const dims = albedoTex && albedoTex.getSize ? albedoTex.getSize() : null;
      const gamma = albedoTex ? albedoTex.gammaSpace : null;

      reports.push({
        meshName: m.name,
        materialName: mat.name,
        materialType: mat.getClassName(),
        baseColorFactor: mat.albedoColor
          ? { r: mat.albedoColor.r, g: mat.albedoColor.g, b: mat.albedoColor.b }
          : null,
        baseColorTexture: albedoTex ? albedoTex.name : null,
        normalTexture: bumpTex ? bumpTex.name : null,
        metallicRoughnessTexture: metallicTex ? metallicTex.name : null,
        aoTexture: aoTex ? aoTex.name : null,
        emissiveTexture: emissiveTex ? emissiveTex.name : null,
        texCoordIndex: texCoord,
        textureReadyStatus: isReady,
        textureDimensions: dims ? { width: dims.width, height: dims.height } : null,
        gammaSpace: gamma,
        alphaMode: mat.alphaMode,
        doubleSided: mat.backFaceCulling === false,
        transparencyMode: mat.transparencyMode,
      });
    };

    meshes.forEach((m) => {
      if (m.material instanceof MultiMaterial) {
        m.material.subMaterials.forEach((sub: any) => inspectMat(m, sub));
      } else {
        inspectMat(m, m.material);
      }
    });

    return reports;
  }

  public auditWheelMaterials(meshes: any[]): WheelMeshReport[] {
    return this.auditAllMaterials(meshes).filter((r) => {
      const name = r.meshName.toLowerCase();
      return name.includes('wheel') || name.includes('tire') || name.includes('tyre') || name.includes('rim');
    });
  }

  public setFrontView(): void {
    this.camera.setTarget(new Vector3(0, 0.55, 0));
    this.camera.alpha = -Math.PI / 2; // Facing front
    this.camera.beta = Math.PI / 2.2;
    this.camera.radius = 2.6;
    this.resetCameraInertia();
  }

  public setRearView(): void {
    this.camera.setTarget(new Vector3(0, 0.55, 0));
    this.camera.alpha = Math.PI / 2; // Facing rear
    this.camera.beta = Math.PI / 2.2;
    this.camera.radius = 2.6;
    this.resetCameraInertia();
  }

  public setLeftView(): void {
    this.camera.setTarget(new Vector3(0, 0.55, 0));
    this.camera.alpha = Math.PI; // Pure left profile
    this.camera.beta = Math.PI / 2.3;
    this.camera.radius = 2.8;
    this.resetCameraInertia();
  }

  public setRightView(): void {
    this.camera.setTarget(new Vector3(0, 0.55, 0));
    this.camera.alpha = 0; // Pure right profile
    this.camera.beta = Math.PI / 2.3;
    this.camera.radius = 2.8;
    this.resetCameraInertia();
  }

  public setCockpitView(): void {
    // Rider cockpit POV overlooking triple clamp, clip-ons, and TFT dash
    this.camera.setTarget(new Vector3(0, 0.88, -0.22));
    this.camera.alpha = Math.PI / 2; // Looking forward
    this.camera.beta = Math.PI / 3.0; // Angled down towards instruments
    this.camera.radius = 0.65;
    this.resetCameraInertia();
  }

  public setRearWheelView(): void {
    // Focus tightly on rear wheel / tire and swingarm from 3/4 angle
    this.camera.setTarget(new Vector3(0, 0.35, 0.70));
    this.camera.alpha = Math.PI * 0.35;
    this.camera.beta = Math.PI / 2.3;
    this.camera.radius = 1.25;
    this.resetCameraInertia();
  }

  public setExhaustView(): void {
    // Focus tightly on exhaust silencer, collector, and hanger
    this.camera.setTarget(new Vector3(0.28, 0.32, 0.40));
    this.camera.alpha = Math.PI * 0.15;
    this.camera.beta = Math.PI / 2.4;
    this.camera.radius = 1.10;
    this.resetCameraInertia();
  }

  public setSideView(): void {
    this.setRightView();
  }

  public setRearTyreCloseup(): void {
    this.setRearWheelView();
  }

  private resetCameraInertia(): void {
    this.camera.inertialAlphaOffset = 0;
    this.camera.inertialBetaOffset = 0;
    this.camera.inertialRadiusOffset = 0;
  }
}
