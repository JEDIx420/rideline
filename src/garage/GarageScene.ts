import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
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
  public studioEnvTexture: HDRCubeTexture | null = null;

  public floorMesh: Mesh | null = null;
  private workshopMeshes: Mesh[] = [];

  constructor(private scene: Scene) {
    this.rootMesh = new Mesh('garage_root', this.scene);
    this.setupEnvironmentTexture();
    this.setupLighting();
    this.setupWorkshopGeometry();
  }

  private setupEnvironmentTexture(): void {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    const hdrUrl = baseUrl + 'assets/env/studio_showroom.hdr';

    try {
      this.studioEnvTexture = new HDRCubeTexture(hdrUrl, this.scene, 512, false, true, false, true);
      this.scene.environmentTexture = this.studioEnvTexture;
      this.scene.environmentIntensity = 0.82; // Calibrated to avoid blowing out white fairings
    } catch (e) {
      console.warn('Could not load studio HDR map, using fallback studio lighting:', e);
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

    // Primary Overhead Key Spotlight (soft wide cone over parking bays)
    this.keyLight = new SpotLight(
      'garage_key_spot',
      new Vector3(0, 3.8, 0.8),
      new Vector3(0, -0.92, -0.38).normalize(),
      Math.PI / 2.2,
      6,
      this.scene
    );
    this.keyLight.intensity = 5.5;
    this.keyLight.diffuse = new Color3(1.0, 0.98, 0.95);
    this.keyLight.specular = new Color3(0.9, 0.9, 0.9);

    // Soft Rim / Kick Light from rear wall
    this.rimLight = new DirectionalLight(
      'garage_rim_dir',
      new Vector3(0.3, -0.6, -0.7).normalize(),
      this.scene
    );
    this.rimLight.intensity = 1.2;
    this.rimLight.diffuse = new Color3(0.75, 0.85, 1.0);

    // Studio Contact Shadows
    this.shadowGenerator = new ShadowGenerator(2048, this.keyLight);
    this.shadowGenerator.usePercentageCloserFiltering = true;
    this.shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    this.shadowGenerator.bias = 0.0012;
  }

  private setupWorkshopGeometry(): void {
    // 1. Concrete / Dark Charcoal Epoxy Floor (subtle reflection, durable workshop aesthetic)
    this.floorMesh = MeshBuilder.CreateGround(
      'garage_epoxy_floor',
      { width: 18, height: 16, subdivisions: 2 },
      this.scene
    );
    this.floorMesh.parent = this.rootMesh;
    this.floorMesh.position.y = 0;

    const floorMat = new PBRMaterial('garage_floor_pbr', this.scene);
    floorMat.albedoColor = new Color3(0.08, 0.09, 0.11);
    floorMat.metallic = 0.15;
    floorMat.roughness = 0.28; // Restrained wet epoxy sheen
    floorMat.microSurface = 0.88;
    this.floorMesh.material = floorMat;
    this.floorMesh.receiveShadows = true;

    // Workshop Wall Material (painted industrial grey with subtle texture)
    const wallMat = new PBRMaterial('workshop_wall_mat', this.scene);
    wallMat.albedoColor = new Color3(0.18, 0.19, 0.22);
    wallMat.metallic = 0.05;
    wallMat.roughness = 0.85;

    // Accent Stripe Material (Motorsport Blue wainscot stripe)
    const stripeMat = new PBRMaterial('workshop_stripe_mat', this.scene);
    stripeMat.albedoColor = new Color3(0.08, 0.28, 0.65);
    stripeMat.roughness = 0.45;

    // 2. Back Wall (Z = +6.0m)
    const backWall = MeshBuilder.CreatePlane('garage_back_wall', { width: 18, height: 4.2 }, this.scene);
    backWall.parent = this.rootMesh;
    backWall.position.set(0, 2.1, 6.0);
    backWall.rotation.y = Math.PI;
    backWall.material = wallMat;
    backWall.receiveShadows = true;
    this.workshopMeshes.push(backWall);

    // Back wall accent lower stripe
    const backStripe = MeshBuilder.CreatePlane('garage_back_stripe', { width: 18, height: 0.15 }, this.scene);
    backStripe.parent = this.rootMesh;
    backStripe.position.set(0, 1.1, 5.99);
    backStripe.rotation.y = Math.PI;
    backStripe.material = stripeMat;
    this.workshopMeshes.push(backStripe);

    // 3. Left Wall (X = -7.5m)
    const leftWall = MeshBuilder.CreatePlane('garage_left_wall', { width: 16, height: 4.2 }, this.scene);
    leftWall.parent = this.rootMesh;
    leftWall.position.set(-7.5, 2.1, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.material = wallMat;
    this.workshopMeshes.push(leftWall);

    // 4. Right Wall (X = +7.5m)
    const rightWall = MeshBuilder.CreatePlane('garage_right_wall', { width: 16, height: 4.2 }, this.scene);
    rightWall.parent = this.rootMesh;
    rightWall.position.set(7.5, 2.1, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.material = wallMat;
    this.workshopMeshes.push(rightWall);

    // 5. Ceiling with Industrial Crossbeams (Y = 4.2m)
    const ceiling = MeshBuilder.CreatePlane('garage_ceiling', { width: 18, height: 16 }, this.scene);
    ceiling.parent = this.rootMesh;
    ceiling.position.set(0, 4.2, 0);
    ceiling.rotation.x = Math.PI / 2;
    const ceilingMat = new PBRMaterial('garage_ceiling_mat', this.scene);
    ceilingMat.albedoColor = new Color3(0.06, 0.07, 0.08);
    ceilingMat.roughness = 0.95;
    ceiling.material = ceilingMat;
    this.workshopMeshes.push(ceiling);

    // 6. Large Industrial Roller Shutter Door on Front/Back
    this.buildRollerDoor(0, 2.0, 5.95);

    // 7. Workbench on Right Wall (Snap-on / mechanic style)
    this.buildWorkbench(5.8, 0, 1.5);

    // 8. Tool Cabinet & Storage Shelving
    this.buildToolCabinet(5.8, 0, -1.8);

    // 9. Tyre Rack on Left Wall with Racing Slicks
    this.buildTyreRack(-6.2, 0, 0);

    // 10. Overhead Fluorescent Light Fixtures (recessed LED panels)
    this.buildCeilingLightFixtures();
  }

  private buildRollerDoor(x: number, y: number, z: number): void {
    const doorFrame = MeshBuilder.CreateBox('door_frame', { width: 6.2, height: 3.6, depth: 0.12 }, this.scene);
    doorFrame.parent = this.rootMesh;
    doorFrame.position.set(x, y, z);
    const frameMat = new PBRMaterial('door_frame_mat', this.scene);
    frameMat.albedoColor = new Color3(0.12, 0.13, 0.15);
    frameMat.metallic = 0.8;
    frameMat.roughness = 0.35;
    doorFrame.material = frameMat;
    this.workshopMeshes.push(doorFrame);

    // Corrugated horizontal slats
    for (let i = 0; i < 16; i++) {
      const slat = MeshBuilder.CreateBox(`slat_${i}`, { width: 5.9, height: 0.19, depth: 0.04 }, this.scene);
      slat.parent = this.rootMesh;
      slat.position.set(x, 0.35 + i * 0.21, z - 0.04);
      const slatMat = new PBRMaterial(`slat_mat_${i}`, this.scene);
      slatMat.albedoColor = new Color3(0.24, 0.26, 0.30);
      slatMat.metallic = 0.85;
      slatMat.roughness = 0.40;
      slat.material = slatMat;
      this.workshopMeshes.push(slat);
    }
  }

  private buildWorkbench(x: number, y: number, z: number): void {
    // Heavy wooden butcher block tabletop with steel legs
    const tableTop = MeshBuilder.CreateBox('bench_top', { width: 1.4, height: 0.10, depth: 3.2 }, this.scene);
    tableTop.parent = this.rootMesh;
    tableTop.position.set(x, y + 0.90, z);
    const woodMat = new PBRMaterial('bench_wood_mat', this.scene);
    woodMat.albedoColor = new Color3(0.48, 0.34, 0.20);
    woodMat.roughness = 0.65;
    tableTop.material = woodMat;
    this.workshopMeshes.push(tableTop);

    // Steel frame & legs
    const frame = MeshBuilder.CreateBox('bench_frame', { width: 1.3, height: 0.85, depth: 3.0 }, this.scene);
    frame.parent = this.rootMesh;
    frame.position.set(x, y + 0.425, z);
    const metalMat = new PBRMaterial('bench_metal_mat', this.scene);
    metalMat.albedoColor = new Color3(0.10, 0.11, 0.13);
    metalMat.metallic = 0.85;
    metalMat.roughness = 0.45;
    frame.material = metalMat;
    this.workshopMeshes.push(frame);

    // Pegboard on wall above bench
    const pegboard = MeshBuilder.CreateBox('bench_pegboard', { width: 0.05, height: 1.2, depth: 3.2 }, this.scene);
    pegboard.parent = this.rootMesh;
    pegboard.position.set(x + 0.68, y + 1.6, z);
    const pegMat = new PBRMaterial('pegboard_mat', this.scene);
    pegMat.albedoColor = new Color3(0.22, 0.23, 0.25);
    pegMat.roughness = 0.85;
    pegboard.material = pegMat;
    this.workshopMeshes.push(pegboard);
  }

  private buildToolCabinet(x: number, y: number, z: number): void {
    // Red professional mechanics rolling tool chest
    const chest = MeshBuilder.CreateBox('tool_chest', { width: 1.2, height: 1.35, depth: 1.5 }, this.scene);
    chest.parent = this.rootMesh;
    chest.position.set(x, y + 0.675, z);
    const redMat = new PBRMaterial('tool_chest_red', this.scene);
    redMat.albedoColor = new Color3(0.68, 0.08, 0.08); // Classic tool chest red
    redMat.metallic = 0.4;
    redMat.roughness = 0.35;
    chest.material = redMat;
    this.workshopMeshes.push(chest);

    // Drawer handle accents
    for (let d = 0; d < 6; d++) {
      const handle = MeshBuilder.CreateBox(`drawer_handle_${d}`, { width: 0.04, height: 0.03, depth: 1.1 }, this.scene);
      handle.parent = this.rootMesh;
      handle.position.set(x - 0.61, y + 0.25 + d * 0.18, z);
      const chromeMat = new PBRMaterial(`chrome_${d}`, this.scene);
      chromeMat.metallic = 0.95;
      chromeMat.roughness = 0.15;
      handle.material = chromeMat;
      this.workshopMeshes.push(handle);
    }
  }

  private buildTyreRack(x: number, y: number, z: number): void {
    // Steel scaffolding rack holding racing slick tyres
    const rackFrame = MeshBuilder.CreateBox('tyre_rack_frame', { width: 1.2, height: 1.9, depth: 3.2 }, this.scene);
    rackFrame.parent = this.rootMesh;
    rackFrame.position.set(x, y + 0.95, z);
    const rackMat = new PBRMaterial('tyre_rack_mat', this.scene);
    rackMat.albedoColor = new Color3(0.15, 0.16, 0.18);
    rackMat.metallic = 0.8;
    rackMat.roughness = 0.5;
    rackFrame.material = rackMat;
    this.workshopMeshes.push(rackFrame);

    // 6 Racing Slick tyres on rack
    const tyreMat = new PBRMaterial('rack_tyre_mat', this.scene);
    tyreMat.albedoColor = new Color3(0.04, 0.04, 0.04);
    tyreMat.roughness = 0.85;
    tyreMat.metallic = 0.02;

    for (let t = 0; t < 6; t++) {
      const tyre = MeshBuilder.CreateTorus(`rack_tyre_${t}`, { diameter: 0.64, thickness: 0.20, tessellation: 24 }, this.scene);
      tyre.parent = this.rootMesh;
      tyre.rotation.x = Math.PI / 2;
      tyre.position.set(x, y + 0.45 + (t % 2) * 0.80, z - 1.0 + Math.floor(t / 2) * 1.0);
      tyre.material = tyreMat;
      this.workshopMeshes.push(tyre);
    }
  }

  private buildCeilingLightFixtures(): void {
    // 4 Long Rectangular Fluorescent Light Fixture Housings
    const fixturePositions = [
      new Vector3(-2.2, 4.15, -0.8),
      new Vector3(-2.2, 4.15, 1.8),
      new Vector3(2.2, 4.15, -0.8),
      new Vector3(2.2, 4.15, 1.8),
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
    this.studioEnvTexture?.dispose();
  }
}
