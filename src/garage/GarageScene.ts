import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { SpotLight } from '@babylonjs/core/Lights/spotLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
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
  public taskLight: PointLight | null = null;
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

    // 9. Workshop Pit Floor Mats
    this.buildWorkshopFloorMats();

    // 10. Tubular Racing Paddock Stands (Rear & Front)
    this.buildPaddockStands();

    // 11. Multi-Drawer Roll-Cab Tool Chests
    this.buildToolChests();

    // 12. Heavy-Duty Steel Workshop Workbench with Vice & Task Lamp
    this.buildWorkbench();

    // 13. Heavy-Duty Tyre Racks with Spare Racing Slicks
    this.buildTyreRacks();

    // 14. Wall-Mounted Lubricants & Consumables Shelving
    this.buildPartsShelves();

    // 15. Framed Motorsport & Circuit Telemetry Wall Art
    this.buildWallGraphics();
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

  private buildWorkshopFloorMats(): void {
    const rubberMat = new PBRMaterial('mat_rubber_pbr', this.scene);
    rubberMat.albedoColor = new Color3(0.08, 0.08, 0.09);
    rubberMat.roughness = 0.88;
    rubberMat.metallic = 0.05;

    const redTrimMat = new PBRMaterial('mat_red_trim', this.scene);
    redTrimMat.albedoColor = new Color3(0.85, 0.10, 0.10);
    redTrimMat.roughness = 0.40;

    const blueTrimMat = new PBRMaterial('mat_blue_trim', this.scene);
    blueTrimMat.albedoColor = new Color3(0.05, 0.35, 0.85);
    blueTrimMat.roughness = 0.40;

    const bays = [
      { x: -4.5, trim: redTrimMat, id: 'bay1' },
      { x: 4.5, trim: blueTrimMat, id: 'bay2' },
    ];

    for (const b of bays) {
      const pad = MeshBuilder.CreateBox(`pit_pad_${b.id}`, { width: 1.6, height: 0.012, depth: 3.6 }, this.scene);
      pad.parent = this.rootMesh;
      pad.position.set(b.x, 0.006, 0);
      pad.material = rubberMat;
      pad.receiveShadows = true;
      this.workshopMeshes.push(pad);

      const borderL = MeshBuilder.CreateBox(`pit_trim_l_${b.id}`, { width: 0.06, height: 0.014, depth: 3.6 }, this.scene);
      borderL.parent = this.rootMesh;
      borderL.position.set(b.x - 0.77, 0.007, 0);
      borderL.material = b.trim;
      this.workshopMeshes.push(borderL);

      const borderR = MeshBuilder.CreateBox(`pit_trim_r_${b.id}`, { width: 0.06, height: 0.014, depth: 3.6 }, this.scene);
      borderR.parent = this.rootMesh;
      borderR.position.set(b.x + 0.77, 0.007, 0);
      borderR.material = b.trim;
      this.workshopMeshes.push(borderR);

      const centerLine = MeshBuilder.CreateBox(`pit_center_${b.id}`, { width: 0.04, height: 0.015, depth: 3.2 }, this.scene);
      centerLine.parent = this.rootMesh;
      centerLine.position.set(b.x, 0.0075, 0);
      centerLine.material = b.trim;
      this.workshopMeshes.push(centerLine);
    }
  }

  private buildPaddockStands(): void {
    const standMat = new PBRMaterial('paddock_stand_red', this.scene);
    standMat.albedoColor = new Color3(0.85, 0.08, 0.08);
    standMat.metallic = 0.35;
    standMat.roughness = 0.28;

    const wheelMat = new PBRMaterial('paddock_wheel_black', this.scene);
    wheelMat.albedoColor = new Color3(0.06, 0.06, 0.07);
    wheelMat.roughness = 0.75;

    const chromeMat = new PBRMaterial('paddock_chrome', this.scene);
    chromeMat.albedoColor = new Color3(0.9, 0.9, 0.9);
    chromeMat.metallic = 0.95;
    chromeMat.roughness = 0.15;

    const bayX = [-4.5, 4.5];

    for (let i = 0; i < bayX.length; i++) {
      const x = bayX[i];
      const tag = `b${i}`;

      // Rear Paddock Stand
      const rCross = MeshBuilder.CreateCylinder(`r_cross_${tag}`, { height: 0.52, diameter: 0.032 }, this.scene);
      rCross.parent = this.rootMesh;
      rCross.rotation.z = Math.PI / 2;
      rCross.position.set(x, 0.05, -1.28);
      rCross.material = standMat;
      this.workshopMeshes.push(rCross);

      for (const side of [-0.27, 0.27]) {
        const w = MeshBuilder.CreateCylinder(`r_wheel_${tag}_${side}`, { height: 0.035, diameter: 0.10 }, this.scene);
        w.parent = this.rootMesh;
        w.rotation.z = Math.PI / 2;
        w.position.set(x + side, 0.05, -1.28);
        w.material = wheelMat;
        this.workshopMeshes.push(w);
      }

      const rHandle = MeshBuilder.CreateCylinder(`r_handle_${tag}`, { height: 0.55, diameter: 0.030 }, this.scene);
      rHandle.parent = this.rootMesh;
      rHandle.rotation.x = -Math.PI / 4;
      rHandle.position.set(x, 0.22, -1.48);
      rHandle.material = standMat;
      this.workshopMeshes.push(rHandle);

      for (const side of [-0.22, 0.22]) {
        const arm = MeshBuilder.CreateCylinder(`r_arm_${tag}_${side}`, { height: 0.36, diameter: 0.030 }, this.scene);
        arm.parent = this.rootMesh;
        arm.rotation.x = Math.PI / 6;
        arm.position.set(x + side, 0.20, -1.15);
        arm.material = standMat;
        this.workshopMeshes.push(arm);

        const hook = MeshBuilder.CreateBox(`r_hook_${tag}_${side}`, { width: 0.04, height: 0.06, depth: 0.04 }, this.scene);
        hook.parent = this.rootMesh;
        hook.position.set(x + side, 0.34, -1.06);
        hook.material = chromeMat;
        this.workshopMeshes.push(hook);
      }

      // Front Paddock Stand
      const fCross = MeshBuilder.CreateCylinder(`f_cross_${tag}`, { height: 0.46, diameter: 0.032 }, this.scene);
      fCross.parent = this.rootMesh;
      fCross.rotation.z = Math.PI / 2;
      fCross.position.set(x, 0.05, 1.28);
      fCross.material = standMat;
      this.workshopMeshes.push(fCross);

      for (const side of [-0.24, 0.24]) {
        const fw = MeshBuilder.CreateCylinder(`f_wheel_${tag}_${side}`, { height: 0.035, diameter: 0.10 }, this.scene);
        fw.parent = this.rootMesh;
        fw.rotation.z = Math.PI / 2;
        fw.position.set(x + side, 0.05, 1.28);
        fw.material = wheelMat;
        this.workshopMeshes.push(fw);

        const farm = MeshBuilder.CreateCylinder(`f_arm_${tag}_${side}`, { height: 0.34, diameter: 0.030 }, this.scene);
        farm.parent = this.rootMesh;
        farm.rotation.x = -Math.PI / 6;
        farm.position.set(x + side, 0.18, 1.15);
        farm.material = standMat;
        this.workshopMeshes.push(farm);

        const fpin = MeshBuilder.CreateCylinder(`f_pin_${tag}_${side}`, { height: 0.05, diameter: 0.018 }, this.scene);
        fpin.parent = this.rootMesh;
        fpin.position.set(x + side, 0.32, 1.07);
        fpin.material = chromeMat;
        this.workshopMeshes.push(fpin);
      }
    }
  }

  private buildToolChests(): void {
    const cabinetMat = new PBRMaterial('tool_cabinet_red', this.scene);
    cabinetMat.albedoColor = new Color3(0.78, 0.08, 0.08);
    cabinetMat.metallic = 0.30;
    cabinetMat.roughness = 0.30;

    const chromeMat = new PBRMaterial('tool_handle_chrome', this.scene);
    chromeMat.albedoColor = new Color3(0.92, 0.92, 0.94);
    chromeMat.metallic = 0.95;
    chromeMat.roughness = 0.18;

    const matBlack = new PBRMaterial('tool_top_mat', this.scene);
    matBlack.albedoColor = new Color3(0.08, 0.08, 0.09);
    matBlack.roughness = 0.90;

    const chestPositions = [
      { x: -7.5, z: 2.8 },
      { x: 7.5, z: 2.8 },
    ];

    for (let c = 0; c < chestPositions.length; c++) {
      const p = chestPositions[c];
      const tag = `tc_${c}`;

      const body = MeshBuilder.CreateBox(`body_${tag}`, { width: 1.35, height: 1.05, depth: 0.65 }, this.scene);
      body.parent = this.rootMesh;
      body.position.set(p.x, 0.62, p.z);
      body.material = cabinetMat;
      body.receiveShadows = true;
      this.workshopMeshes.push(body);

      const topTray = MeshBuilder.CreateBox(`top_${tag}`, { width: 1.33, height: 0.02, depth: 0.63 }, this.scene);
      topTray.parent = this.rootMesh;
      topTray.position.set(p.x, 1.155, p.z);
      topTray.material = matBlack;
      this.workshopMeshes.push(topTray);

      for (let d = 0; d < 6; d++) {
        const drawerY = 0.28 + d * 0.145;
        const handle = MeshBuilder.CreateBox(`h_${tag}_${d}`, { width: 1.20, height: 0.025, depth: 0.03 }, this.scene);
        handle.parent = this.rootMesh;
        handle.position.set(p.x, drawerY, p.z - 0.33);
        handle.material = chromeMat;
        this.workshopMeshes.push(handle);
      }

      const pushBar = MeshBuilder.CreateCylinder(`push_${tag}`, { height: 0.45, diameter: 0.03 }, this.scene);
      pushBar.parent = this.rootMesh;
      pushBar.rotation.x = Math.PI / 2;
      pushBar.position.set(p.x + 0.70, 0.95, p.z);
      pushBar.material = chromeMat;
      this.workshopMeshes.push(pushBar);

      for (const cx of [-0.55, 0.55]) {
        for (const cz of [-0.25, 0.25]) {
          const caster = MeshBuilder.CreateCylinder(`caster_${tag}_${cx}_${cz}`, { height: 0.04, diameter: 0.09 }, this.scene);
          caster.parent = this.rootMesh;
          caster.position.set(p.x + cx, 0.045, p.z + cz);
          caster.material = matBlack;
          this.workshopMeshes.push(caster);
        }
      }
    }
  }

  private buildWorkbench(): void {
    const steelMat = new PBRMaterial('bench_steel_mat', this.scene);
    steelMat.albedoColor = new Color3(0.14, 0.15, 0.17);
    steelMat.metallic = 0.70;
    steelMat.roughness = 0.40;

    const woodMat = new PBRMaterial('bench_wood_mat', this.scene);
    woodMat.albedoColor = new Color3(0.68, 0.48, 0.28);
    woodMat.metallic = 0.05;
    woodMat.roughness = 0.48;

    const pegMat = new PBRMaterial('bench_pegboard_mat', this.scene);
    pegMat.albedoColor = new Color3(0.20, 0.22, 0.25);
    pegMat.metallic = 0.40;
    pegMat.roughness = 0.65;

    const chromeMat = new PBRMaterial('bench_tool_chrome', this.scene);
    chromeMat.albedoColor = new Color3(0.88, 0.90, 0.92);
    chromeMat.metallic = 0.95;
    chromeMat.roughness = 0.15;

    const bx = -4.5;
    const bz = 7.1;

    for (const lx of [-1.32, 1.32]) {
      for (const lz of [-0.40, 0.40]) {
        const leg = MeshBuilder.CreateBox(`leg_${lx}_${lz}`, { width: 0.08, height: 0.90, depth: 0.08 }, this.scene);
        leg.parent = this.rootMesh;
        leg.position.set(bx + lx, 0.45, bz + lz);
        leg.material = steelMat;
        this.workshopMeshes.push(leg);
      }
    }

    const lowerShelf = MeshBuilder.CreateBox('bench_low_shelf', { width: 2.68, height: 0.03, depth: 0.84 }, this.scene);
    lowerShelf.parent = this.rootMesh;
    lowerShelf.position.set(bx, 0.20, bz);
    lowerShelf.material = steelMat;
    this.workshopMeshes.push(lowerShelf);

    const woodTop = MeshBuilder.CreateBox('bench_wood_top', { width: 2.85, height: 0.09, depth: 0.96 }, this.scene);
    woodTop.parent = this.rootMesh;
    woodTop.position.set(bx, 0.945, bz);
    woodTop.material = woodMat;
    woodTop.receiveShadows = true;
    this.workshopMeshes.push(woodTop);

    const pegboard = MeshBuilder.CreateBox('bench_pegboard', { width: 2.85, height: 1.20, depth: 0.03 }, this.scene);
    pegboard.parent = this.rootMesh;
    pegboard.position.set(bx, 1.60, bz + 0.47);
    pegboard.material = pegMat;
    this.workshopMeshes.push(pegboard);

    for (let s = 0; s < 7; s++) {
      const spannerW = 0.02 + s * 0.003;
      const spannerH = 0.14 + s * 0.025;
      const spanner = MeshBuilder.CreateBox(`spanner_${s}`, { width: spannerW, height: spannerH, depth: 0.01 }, this.scene);
      spanner.parent = this.rootMesh;
      spanner.position.set(bx - 0.90 + s * 0.14, 1.70, bz + 0.44);
      spanner.material = chromeMat;
      this.workshopMeshes.push(spanner);
    }

    const viceBase = MeshBuilder.CreateBox('vice_base', { width: 0.18, height: 0.08, depth: 0.18 }, this.scene);
    viceBase.parent = this.rootMesh;
    viceBase.position.set(bx - 1.25, 1.03, bz - 0.35);
    viceBase.material = steelMat;
    this.workshopMeshes.push(viceBase);

    const viceJaw = MeshBuilder.CreateBox('vice_jaw', { width: 0.14, height: 0.12, depth: 0.06 }, this.scene);
    viceJaw.parent = this.rootMesh;
    viceJaw.position.set(bx - 1.25, 1.13, bz - 0.35);
    viceJaw.material = steelMat;
    this.workshopMeshes.push(viceJaw);

    const viceHandle = MeshBuilder.CreateCylinder('vice_handle', { height: 0.22, diameter: 0.014 }, this.scene);
    viceHandle.parent = this.rootMesh;
    viceHandle.rotation.x = Math.PI / 2;
    viceHandle.position.set(bx - 1.25, 1.10, bz - 0.40);
    viceHandle.material = chromeMat;
    this.workshopMeshes.push(viceHandle);

    const lampArm = MeshBuilder.CreateCylinder('lamp_arm', { height: 0.55, diameter: 0.02 }, this.scene);
    lampArm.parent = this.rootMesh;
    lampArm.rotation.z = Math.PI / 6;
    lampArm.position.set(bx + 1.15, 1.28, bz + 0.25);
    lampArm.material = steelMat;
    this.workshopMeshes.push(lampArm);

    const lampShade = MeshBuilder.CreateCylinder('lamp_shade', { height: 0.16, diameterTop: 0.06, diameterBottom: 0.22 }, this.scene);
    lampShade.parent = this.rootMesh;
    lampShade.position.set(bx + 0.98, 1.55, bz + 0.10);
    lampShade.material = steelMat;
    this.workshopMeshes.push(lampShade);

    this.taskLight = new PointLight(
      'garage_workbench_task_light',
      new Vector3(bx + 0.98, 1.48, bz + 0.10),
      this.scene
    );
    this.taskLight.diffuse = new Color3(1.0, 0.82, 0.52);
    this.taskLight.intensity = 3.2;
    this.taskLight.range = 6.5;
  }

  private buildTyreRacks(): void {
    const rackMat = new PBRMaterial('tyre_rack_steel', this.scene);
    rackMat.albedoColor = new Color3(0.12, 0.13, 0.15);
    rackMat.metallic = 0.60;
    rackMat.roughness = 0.45;

    const tyreMat = new PBRMaterial('tyre_rubber_pbr', this.scene);
    tyreMat.albedoColor = new Color3(0.04, 0.04, 0.05);
    tyreMat.metallic = 0.08;
    tyreMat.roughness = 0.32;

    const tyreStripeMat = new PBRMaterial('tyre_slick_stripe', this.scene);
    tyreStripeMat.albedoColor = new Color3(0.95, 0.85, 0.10);
    tyreStripeMat.roughness = 0.40;

    const rx = -13.3;
    const rz = 0.5;

    for (const px of [-0.35, 0.35]) {
      for (const pz of [-1.10, 1.10]) {
        const post = MeshBuilder.CreateBox(`rack_post_${px}_${pz}`, { width: 0.06, height: 1.95, depth: 0.06 }, this.scene);
        post.parent = this.rootMesh;
        post.position.set(rx + px, 0.98, rz + pz);
        post.material = rackMat;
        this.workshopMeshes.push(post);
      }
    }

    for (const y of [0.22, 1.12]) {
      for (const side of [-0.30, 0.30]) {
        const rail = MeshBuilder.CreateCylinder(`rack_rail_${y}_${side}`, { height: 2.20, diameter: 0.035 }, this.scene);
        rail.parent = this.rootMesh;
        rail.rotation.x = Math.PI / 2;
        rail.position.set(rx + side, y, rz);
        rail.material = rackMat;
        this.workshopMeshes.push(rail);
      }
    }

    for (let t = 0; t < 4; t++) {
      const zOffset = -0.75 + t * 0.50;
      const slick = MeshBuilder.CreateTorus(`slick_tyre_${t}`, { diameter: 0.65, thickness: 0.19, tessellation: 36 }, this.scene);
      slick.parent = this.rootMesh;
      slick.rotation.y = Math.PI / 2;
      slick.position.set(rx, 0.54, rz + zOffset);
      slick.material = tyreMat;
      this.workshopMeshes.push(slick);

      const band = MeshBuilder.CreateCylinder(`slick_band_${t}`, { height: 0.04, diameter: 0.655 }, this.scene);
      band.parent = this.rootMesh;
      band.rotation.x = Math.PI / 2;
      band.position.set(rx, 0.54, rz + zOffset);
      band.material = tyreStripeMat;
      this.workshopMeshes.push(band);
    }
  }

  private buildPartsShelves(): void {
    const rackMat = new PBRMaterial('parts_rack_steel', this.scene);
    rackMat.albedoColor = new Color3(0.12, 0.14, 0.16);
    rackMat.metallic = 0.55;
    rackMat.roughness = 0.45;

    const motulMat = new PBRMaterial('motul_red_jug', this.scene);
    motulMat.albedoColor = new Color3(0.85, 0.08, 0.08);
    motulMat.roughness = 0.25;

    const aerosolMat = new PBRMaterial('aerosol_can_blue', this.scene);
    aerosolMat.albedoColor = new Color3(0.05, 0.40, 0.85);
    aerosolMat.metallic = 0.85;
    aerosolMat.roughness = 0.20;

    const discMat = new PBRMaterial('brake_disc_chrome', this.scene);
    discMat.albedoColor = new Color3(0.80, 0.82, 0.85);
    discMat.metallic = 0.95;
    discMat.roughness = 0.15;

    const sx = 4.5;
    const sz = 7.1;

    for (const px of [-1.15, 1.15]) {
      for (const pz of [-0.30, 0.30]) {
        const post = MeshBuilder.CreateBox(`shelf_post_${px}_${pz}`, { width: 0.06, height: 2.10, depth: 0.06 }, this.scene);
        post.parent = this.rootMesh;
        post.position.set(sx + px, 1.05, sz + pz);
        post.material = rackMat;
        this.workshopMeshes.push(post);
      }
    }

    const shelfHeights = [0.45, 0.95, 1.45, 1.95];
    for (let i = 0; i < shelfHeights.length; i++) {
      const deck = MeshBuilder.CreateBox(`shelf_deck_${i}`, { width: 2.35, height: 0.03, depth: 0.65 }, this.scene);
      deck.parent = this.rootMesh;
      deck.position.set(sx, shelfHeights[i], sz);
      deck.material = rackMat;
      this.workshopMeshes.push(deck);
    }

    for (let j = 0; j < 6; j++) {
      const jug = MeshBuilder.CreateBox(`motul_jug_${j}`, { width: 0.18, height: 0.26, depth: 0.12 }, this.scene);
      jug.parent = this.rootMesh;
      jug.position.set(sx - 0.75 + j * 0.30, 0.60, sz);
      jug.material = motulMat;
      this.workshopMeshes.push(jug);
    }

    for (let c = 0; c < 8; c++) {
      const can = MeshBuilder.CreateCylinder(`aerosol_can_${c}`, { height: 0.22, diameter: 0.075 }, this.scene);
      can.parent = this.rootMesh;
      can.position.set(sx - 0.85 + c * 0.24, 1.08, sz);
      can.material = aerosolMat;
      this.workshopMeshes.push(can);
    }

    for (let r = 0; r < 2; r++) {
      const rotor = MeshBuilder.CreateCylinder(`brake_rotor_${r}`, { height: 0.015, diameter: 0.32 }, this.scene);
      rotor.parent = this.rootMesh;
      rotor.position.set(sx - 0.40 + r * 0.70, 1.47, sz);
      rotor.material = discMat;
      this.workshopMeshes.push(rotor);
    }
  }

  private buildWallGraphics(): void {
    const frameMat = new PBRMaterial('poster_frame_mat', this.scene);
    frameMat.albedoColor = new Color3(0.08, 0.08, 0.10);
    frameMat.roughness = 0.5;

    const poster1Mat = new PBRMaterial('poster_telemetry_mat', this.scene);
    poster1Mat.albedoColor = new Color3(0.12, 0.16, 0.22);
    poster1Mat.roughness = 0.3;

    const poster2Mat = new PBRMaterial('poster_circuit_mat', this.scene);
    poster2Mat.albedoColor = new Color3(0.20, 0.12, 0.14);
    poster2Mat.roughness = 0.3;

    const frame1 = MeshBuilder.CreateBox('poster_frame_1', { width: 2.1, height: 1.4, depth: 0.04 }, this.scene);
    frame1.parent = this.rootMesh;
    frame1.position.set(-4.5, 3.8, 7.94);
    frame1.material = frameMat;
    this.workshopMeshes.push(frame1);

    const art1 = MeshBuilder.CreatePlane('poster_art_1', { width: 1.95, height: 1.25 }, this.scene);
    art1.parent = this.rootMesh;
    art1.rotation.y = Math.PI;
    art1.position.set(-4.5, 3.8, 7.91);
    art1.material = poster1Mat;
    this.workshopMeshes.push(art1);

    const frame2 = MeshBuilder.CreateBox('poster_frame_2', { width: 2.1, height: 1.4, depth: 0.04 }, this.scene);
    frame2.parent = this.rootMesh;
    frame2.position.set(4.5, 3.8, 7.94);
    frame2.material = frameMat;
    this.workshopMeshes.push(frame2);

    const art2 = MeshBuilder.CreatePlane('poster_art_2', { width: 1.95, height: 1.25 }, this.scene);
    art2.parent = this.rootMesh;
    art2.rotation.y = Math.PI;
    art2.position.set(4.5, 3.8, 7.91);
    art2.material = poster2Mat;
    this.workshopMeshes.push(art2);
  }

  public setVisible(visible: boolean): void {
    this.rootMesh.setEnabled(visible);
    if (this.keyLight) this.keyLight.setEnabled(visible);
    if (this.fillLight) this.fillLight.setEnabled(visible);
    if (this.rimLight) this.rimLight.setEnabled(visible);
    if (this.ambientLight) this.ambientLight.setEnabled(visible);
    if (this.taskLight) this.taskLight.setEnabled(visible);
  }

  public dispose(): void {
    this.rootMesh.dispose(false, true);
    this.keyLight?.dispose();
    this.fillLight?.dispose();
    this.rimLight?.dispose();
    this.ambientLight?.dispose();
    this.taskLight?.dispose();
    this.shadowGenerator?.dispose();
    this.shadowGenerator2?.dispose();
    this.studioEnvTexture?.dispose();
  }
}
