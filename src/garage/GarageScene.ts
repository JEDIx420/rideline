import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
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
  public rimLight: DirectionalLight | null = null;
  public ambientLight: HemisphericLight | null = null;
  public shadowGenerator: ShadowGenerator | null = null;
  public shadowGenerator2: ShadowGenerator | null = null;
  public studioEnvTexture: HDRCubeTexture | null = null;

  public floorMesh: Mesh | null = null;
  private workshopMeshes: Mesh[] = [];

  constructor(private scene: Scene) {
    this.rootMesh = new Mesh('garage_root', this.scene);
    this.scene.clearColor = new Color4(0.06, 0.07, 0.09, 1.0);
    this.setupEnvironmentTexture();
    this.setupLighting();
    this.setupWorkshopGeometry();
  }

  private setupEnvironmentTexture(): void {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    const hdrUrl = baseUrl + 'assets/env/autoshop_01_1k.hdr';

    try {
      this.studioEnvTexture = new HDRCubeTexture(hdrUrl, this.scene, 512, false, true, false, true);
      this.scene.environmentTexture = this.studioEnvTexture;
      this.scene.environmentIntensity = 0.85; // Calibrated for autoshop HDRI
    } catch (e) {
      console.warn('Could not load autoshop HDR map, using fallback studio lighting:', e);
    }
  }

  private setupLighting(): void {
    // Ambient hemispheric fill (cool workshop fluorescent tone)
    this.ambientLight = new HemisphericLight(
      'garage_ambient',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.ambientLight.intensity = 0.42;
    this.ambientLight.diffuse = new Color3(0.85, 0.90, 0.96);
    this.ambientLight.groundColor = new Color3(0.12, 0.13, 0.16);

    // Bay 1 Overhead Key Spotlight (-4.5m)
    this.keyLight = new SpotLight(
      'garage_key_spot_bay1',
      new Vector3(-4.5, 4.8, 0.8),
      new Vector3(0, -0.92, -0.38).normalize(),
      Math.PI / 2.2,
      6,
      this.scene
    );
    this.keyLight.intensity = 5.5;
    this.keyLight.diffuse = new Color3(1.0, 0.98, 0.95);
    this.keyLight.specular = new Color3(0.9, 0.9, 0.9);

    // Bay 2 Overhead Spotlight (+4.5m)
    this.fillLight = new SpotLight(
      'garage_key_spot_bay2',
      new Vector3(4.5, 4.8, 0.8),
      new Vector3(0, -0.92, -0.38).normalize(),
      Math.PI / 2.2,
      6,
      this.scene
    );
    this.fillLight.intensity = 5.5;
    this.fillLight.diffuse = new Color3(1.0, 0.98, 0.95);
    this.fillLight.specular = new Color3(0.9, 0.9, 0.9);

    // Soft Rim / Kick Light from rear wall
    this.rimLight = new DirectionalLight(
      'garage_rim_dir',
      new Vector3(0.3, -0.6, -0.7).normalize(),
      this.scene
    );
    this.rimLight.intensity = 1.2;
    this.rimLight.diffuse = new Color3(0.75, 0.85, 1.0);

    // Studio Contact Shadows for Bay 1 & Bay 2
    this.shadowGenerator = new ShadowGenerator(2048, this.keyLight);
    this.shadowGenerator.usePercentageCloserFiltering = true;
    this.shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    this.shadowGenerator.bias = 0.0012;

    this.shadowGenerator2 = new ShadowGenerator(2048, this.fillLight);
    this.shadowGenerator2.usePercentageCloserFiltering = true;
    this.shadowGenerator2.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    this.shadowGenerator2.bias = 0.0012;
  }

  private setupWorkshopGeometry(): void {
    // 1. High-end polished epoxy workshop floor with HDRI reflections
    this.floorMesh = MeshBuilder.CreateGround(
      'garage_epoxy_floor',
      { width: 36, height: 28, subdivisions: 2 },
      this.scene
    );
    this.floorMesh.parent = this.rootMesh;
    this.floorMesh.position.y = 0;

    const floorMat = new PBRMaterial('garage_floor_pbr', this.scene);
    floorMat.albedoColor = new Color3(0.06, 0.07, 0.08);
    floorMat.metallic = 0.20;
    floorMat.roughness = 0.22; // Wet polished showroom epoxy sheen
    floorMat.microSurface = 0.92;
    this.floorMesh.material = floorMat;
    this.floorMesh.receiveShadows = true;

    // Workshop Wall Material (seamless dark architectural panels)
    const wallMat = new PBRMaterial('workshop_wall_mat', this.scene);
    wallMat.albedoColor = new Color3(0.12, 0.13, 0.15);
    wallMat.metallic = 0.10;
    wallMat.roughness = 0.75;
    wallMat.backFaceCulling = false;

    // Accent Stripe Material (Motorsport Racing Blue)
    const stripeMat = new PBRMaterial('workshop_stripe_mat', this.scene);
    stripeMat.albedoColor = new Color3(0.05, 0.30, 0.75);
    stripeMat.roughness = 0.35;
    stripeMat.backFaceCulling = false;

    const wallHeight = 6.5;

    // 2. Back Wall (Z = +8.0m)
    const backWall = MeshBuilder.CreatePlane('garage_back_wall', { width: 36, height: wallHeight }, this.scene);
    backWall.parent = this.rootMesh;
    backWall.position.set(0, wallHeight / 2, 8.0);
    backWall.rotation.y = Math.PI;
    backWall.material = wallMat;
    backWall.receiveShadows = true;
    this.workshopMeshes.push(backWall);

    // Architectural lower blue trim line
    const backStripe = MeshBuilder.CreatePlane('garage_back_stripe', { width: 36, height: 0.12 }, this.scene);
    backStripe.parent = this.rootMesh;
    backStripe.position.set(0, 1.1, 7.98);
    backStripe.rotation.y = Math.PI;
    backStripe.material = stripeMat;
    this.workshopMeshes.push(backStripe);

    // 3. Left Wall (X = -14.0m)
    const leftWall = MeshBuilder.CreatePlane('garage_left_wall', { width: 28, height: wallHeight }, this.scene);
    leftWall.parent = this.rootMesh;
    leftWall.position.set(-14.0, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.material = wallMat;
    this.workshopMeshes.push(leftWall);

    // 4. Right Wall (X = +14.0m)
    const rightWall = MeshBuilder.CreatePlane('garage_right_wall', { width: 28, height: wallHeight }, this.scene);
    rightWall.parent = this.rootMesh;
    rightWall.position.set(14.0, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.material = wallMat;
    this.workshopMeshes.push(rightWall);

    // 5. Front Wall (behind camera at Z = -8.0m, preventing any void reflection)
    const frontWall = MeshBuilder.CreatePlane('garage_front_wall', { width: 36, height: wallHeight }, this.scene);
    frontWall.parent = this.rootMesh;
    frontWall.position.set(0, wallHeight / 2, -8.0);
    frontWall.material = wallMat;
    this.workshopMeshes.push(frontWall);

    // 6. Enclosed Ceiling (Y = 6.5m)
    const ceiling = MeshBuilder.CreatePlane('garage_ceiling', { width: 36, height: 28 }, this.scene);
    ceiling.parent = this.rootMesh;
    ceiling.position.set(0, wallHeight, 0);
    ceiling.rotation.x = Math.PI / 2;
    const ceilingMat = new PBRMaterial('garage_ceiling_mat', this.scene);
    ceilingMat.albedoColor = new Color3(0.04, 0.05, 0.06);
    ceilingMat.roughness = 0.95;
    ceilingMat.backFaceCulling = false;
    ceiling.material = ceilingMat;
    this.workshopMeshes.push(ceiling);

    // 7. Central Architectural Divider Partition (isolates Bay 1 from Bay 2)
    this.buildCenterPartition();

    // 8. Overhead Linear LED Light Fixtures
    this.buildCeilingLightFixtures();
  }

  private buildCenterPartition(): void {
    // Architectural divider partition separating Bay 1 (-4.5m) and Bay 2 (+4.5m)
    const partition = MeshBuilder.CreateBox('center_partition', { width: 0.40, height: 4.5, depth: 12.0 }, this.scene);
    partition.parent = this.rootMesh;
    partition.position.set(0, 2.25, 1.0);
    const partMat = new PBRMaterial('partition_mat', this.scene);
    partMat.albedoColor = new Color3(0.10, 0.11, 0.13);
    partMat.metallic = 0.35;
    partMat.roughness = 0.55;
    partition.material = partMat;
    partition.receiveShadows = true;
    this.workshopMeshes.push(partition);

    // Illuminated Motorsport Racing Blue LED accent stripe along partition
    const stripe = MeshBuilder.CreateBox('partition_stripe', { width: 0.42, height: 0.08, depth: 12.0 }, this.scene);
    stripe.parent = this.rootMesh;
    stripe.position.set(0, 1.1, 1.0);
    const stripeMat = new PBRMaterial('partition_stripe_mat', this.scene);
    stripeMat.emissiveColor = new Color3(0.05, 0.35, 0.90);
    stripeMat.roughness = 0.2;
    stripe.material = stripeMat;
    this.workshopMeshes.push(stripe);
  }

  private buildCeilingLightFixtures(): void {
    // 8 Long Rectangular Fluorescent Light Fixture Housings (4 per bay)
    const fixturePositions = [
      // Bay 1 Fixtures (centered around X = -4.5m)
      new Vector3(-5.7, 6.42, -0.8),
      new Vector3(-5.7, 6.42, 1.8),
      new Vector3(-3.3, 6.42, -0.8),
      new Vector3(-3.3, 6.42, 1.8),

      // Bay 2 Fixtures (centered around X = +4.5m)
      new Vector3(3.3, 6.42, -0.8),
      new Vector3(3.3, 6.42, 1.8),
      new Vector3(5.7, 6.42, -0.8),
      new Vector3(5.7, 6.42, 1.8),
    ];

    const fixtureMat = new PBRMaterial('light_fixture_mat', this.scene);
    fixtureMat.albedoColor = new Color3(0.1, 0.1, 0.12);
    fixtureMat.metallic = 0.6;
    fixtureMat.roughness = 0.4;

    const tubeMat = new PBRMaterial('light_tube_mat', this.scene);
    tubeMat.emissiveColor = new Color3(0.92, 0.95, 1.0);
    tubeMat.roughness = 0.1;

    for (let i = 0; i < fixturePositions.length; i++) {
      const pos = fixturePositions[i];
      const housing = MeshBuilder.CreateBox(`fixture_${i}`, { width: 1.2, height: 0.12, depth: 2.2 }, this.scene);
      housing.parent = this.rootMesh;
      housing.position.copyFrom(pos);
      housing.material = fixtureMat;
      this.workshopMeshes.push(housing);

      const tube = MeshBuilder.CreateBox(`tube_${i}`, { width: 0.8, height: 0.04, depth: 1.9 }, this.scene);
      tube.parent = this.rootMesh;
      tube.position.set(pos.x, pos.y - 0.05, pos.z);
      tube.material = tubeMat;
      this.workshopMeshes.push(tube);
    }
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
    this.shadowGenerator?.dispose();
    this.shadowGenerator2?.dispose();
    this.studioEnvTexture?.dispose();
  }
}
