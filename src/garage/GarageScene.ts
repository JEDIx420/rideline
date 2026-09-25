import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';

export class GarageScene {
  public rootMesh: Mesh;
  public keyLight: SpotLight | null = null;
  public fillLight: SpotLight | null = null;
  public rimLight: SpotLight | null = null;
  public ambientLight: HemisphericLight | null = null;
  public shadowGenerator: ShadowGenerator | null = null;
  public studioEnvTexture: HDRCubeTexture | null = null;

  private floorMesh: Mesh | null = null;
  private pedestalMesh: Mesh | null = null;
  private rimRingMesh: Mesh | null = null;

  constructor(private scene: Scene) {
    this.rootMesh = new Mesh('garage_root', this.scene);
    this.setupLighting();
    this.setupEnvironmentTexture();
    this.setupGeometry();
  }

  private setupEnvironmentTexture(): void {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    const hdrUrl = baseUrl + 'assets/env/studio_showroom.hdr';

    try {
      this.studioEnvTexture = new HDRCubeTexture(hdrUrl, this.scene, 512, false, true, false, true);
      this.scene.environmentTexture = this.studioEnvTexture;
      this.scene.environmentIntensity = 0.70;
    } catch (e) {
      console.warn('Could not load studio HDR map, continuing with standard studio lights:', e);
    }
  }

  private setupLighting(): void {
    // Ambient fill
    this.ambientLight = new HemisphericLight(
      'garage_ambient',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.ambientLight.intensity = 0.25;
    this.ambientLight.diffuse = new Color3(0.8, 0.85, 0.95);
    this.ambientLight.groundColor = new Color3(0.08, 0.09, 0.12);

    // Key Spotlight (overhead front-left)
    this.keyLight = new SpotLight(
      'garage_key_light',
      new Vector3(1.8, 4.5, 2.4),
      new Vector3(-0.4, -0.9, -0.4).normalize(),
      Math.PI / 3,
      8,
      this.scene
    );
    this.keyLight.intensity = 8.5;
    this.keyLight.diffuse = new Color3(1.0, 0.98, 0.95);
    this.keyLight.specular = new Color3(1.0, 1.0, 1.0);

    // Fill Spotlight (front right low)
    this.fillLight = new SpotLight(
      'garage_fill_light',
      new Vector3(-3.0, 2.5, 2.0),
      new Vector3(0.7, -0.5, -0.4).normalize(),
      Math.PI / 2.5,
      10,
      this.scene
    );
    this.fillLight.intensity = 3.8;
    this.fillLight.diffuse = new Color3(0.75, 0.85, 1.0);

    // Rim Spotlight (rear right high - for dramatic bike silhouette edge)
    this.rimLight = new SpotLight(
      'garage_rim_light',
      new Vector3(2.4, 3.2, -3.2),
      new Vector3(-0.6, -0.7, 0.7).normalize(),
      Math.PI / 3,
      8,
      this.scene
    );
    this.rimLight.intensity = 6.5;
    this.rimLight.diffuse = new Color3(0.5, 0.85, 1.0);

    // Studio Shadows
    this.shadowGenerator = new ShadowGenerator(2048, this.keyLight);
    this.shadowGenerator.usePercentageCloserFiltering = true;
    this.shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    this.shadowGenerator.bias = 0.0015;
  }

  private setupGeometry(): void {
    // Dark epoxy reflective floor
    this.floorMesh = MeshBuilder.CreateGround(
      'garage_floor',
      { width: 80, height: 80, subdivisions: 2 },
      this.scene
    );
    this.floorMesh.parent = this.rootMesh;
    this.floorMesh.position.y = 0;

    const floorMat = new PBRMaterial('garage_floor_mat', this.scene);
    floorMat.albedoColor = new Color3(0.06, 0.07, 0.09); // Charcoal epoxy
    floorMat.metallic = 0.65;
    floorMat.roughness = 0.18; // Crisp showroom reflection
    floorMat.microSurface = 0.92;
    this.floorMesh.material = floorMat;
    this.floorMesh.receiveShadows = true;

    // Turntable showcase pedestal
    this.pedestalMesh = MeshBuilder.CreateCylinder(
      'garage_pedestal',
      { diameter: 3.8, height: 0.06, tessellation: 64 },
      this.scene
    );
    this.pedestalMesh.parent = this.rootMesh;
    this.pedestalMesh.position.y = 0.03;

    const pedestalMat = new PBRMaterial('garage_pedestal_mat', this.scene);
    pedestalMat.albedoColor = new Color3(0.12, 0.14, 0.18);
    pedestalMat.metallic = 0.85;
    pedestalMat.roughness = 0.28;
    this.pedestalMesh.material = pedestalMat;
    this.pedestalMesh.receiveShadows = true;
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(this.pedestalMesh, false);
    }

    // Glowing accent rim ring around pedestal
    this.rimRingMesh = MeshBuilder.CreateTorus(
      'pedestal_accent_ring',
      { diameter: 3.82, thickness: 0.02, tessellation: 64 },
      this.scene
    );
    this.rimRingMesh.parent = this.rootMesh;
    this.rimRingMesh.position.y = 0.055;

    const ringMat = new PBRMaterial('pedestal_ring_mat', this.scene);
    ringMat.emissiveColor = new Color3(0.0, 0.85, 1.0); // Cyan glow
    ringMat.roughness = 0.2;
    this.rimRingMesh.material = ringMat;

    // Dark backdrop sphere
    const studioDome = MeshBuilder.CreateSphere(
      'studio_dome',
      { diameter: 120, segments: 16 },
      this.scene
    );
    studioDome.parent = this.rootMesh;
    const domeMat = new PBRMaterial('dome_mat', this.scene);
    domeMat.albedoColor = new Color3(0.02, 0.03, 0.04);
    domeMat.roughness = 1.0;
    domeMat.backFaceCulling = false;
    studioDome.material = domeMat;
  }

  public setVisible(visible: boolean): void {
    this.rootMesh.setEnabled(visible);
    if (this.keyLight) this.keyLight.setEnabled(visible);
    if (this.fillLight) this.fillLight.setEnabled(visible);
    if (this.rimLight) this.rimLight.setEnabled(visible);
    if (this.ambientLight) this.ambientLight.setEnabled(visible);
  }

  public dispose(): void {
    this.rootMesh.dispose(false, true);
    this.keyLight?.dispose();
    this.fillLight?.dispose();
    this.rimLight?.dispose();
    this.ambientLight?.dispose();
    this.studioEnvTexture?.dispose();
  }
}
