import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { CascadedShadowGenerator } from '@babylonjs/core/Lights/Shadows/cascadedShadowGenerator';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { GraphicsSettings } from '../config/graphics';
import { Road } from './Road';

export class Environment {
  public sunLight: DirectionalLight | null = null;
  public ambientLight: HemisphericLight | null = null;
  public shadowGenerator: ShadowGenerator | null = null;
  public oceanMesh: Mesh | null = null;

  private guardrailMeshes: Mesh[] = [];
  private propMeshes: (Mesh | InstancedMesh)[] = [];

  constructor(
    private scene: Scene,
    private road: Road,
    private graphics: GraphicsSettings
  ) {
    this.setupAtmosphere();
    this.setupLighting();
    this.setupOcean();
    this.setupGuardrails();
    this.setupProps();
  }

  private setupAtmosphere(): void {
    // Subtle coastal atmospheric haze / fog
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.00045;
    this.scene.fogColor = new Color3(0.74, 0.82, 0.92); // Crisp maritime haze
    this.scene.clearColor = new Color4(0.74, 0.82, 0.92, 1.0);

    // Sky Dome
    const skybox = MeshBuilder.CreateSphere('sky_dome', { diameter: 4500, segments: 16 }, this.scene);
    const skyMat = new StandardMaterial('sky_mat', this.scene);
    skyMat.backFaceCulling = false;
    skyMat.diffuseColor = new Color3(0, 0, 0);
    skyMat.specularColor = new Color3(0, 0, 0);
    skyMat.emissiveColor = new Color3(0.42, 0.65, 0.88); // Sky blue
    skybox.material = skyMat;
    skybox.infiniteDistance = true;
  }

  private setupLighting(): void {
    // Hemispheric ambient light (Sky blue from above, warm earth from ground)
    this.ambientLight = new HemisphericLight(
      'hemi_ambient',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.ambientLight.intensity = 0.85;
    this.ambientLight.groundColor = new Color3(0.25, 0.22, 0.18);
    this.ambientLight.diffuse = new Color3(0.9, 0.94, 1.0);

    // Directional Sun Light
    this.sunLight = new DirectionalLight(
      'sun_dir',
      new Vector3(-0.6, -0.75, -0.4).normalize(),
      this.scene
    );
    this.sunLight.position = new Vector3(300, 500, 300);
    this.sunLight.intensity = 2.2;
    this.sunLight.diffuse = new Color3(1.0, 0.96, 0.88); // Warm sun
    this.sunLight.specular = new Color3(1.0, 1.0, 0.95);

    // Shadows based on graphics quality preset
    if (this.graphics.shadowsEnabled) {
      this.shadowGenerator = new CascadedShadowGenerator(
        this.graphics.shadowMapSize,
        this.sunLight
      );
      const csg = this.shadowGenerator as CascadedShadowGenerator;
      csg.numCascades = this.graphics.shadowCascades;
      csg.shadowMaxZ = 350;
      csg.lambda = 0.85;
      csg.cascadeBlendPercentage = 0.1;
      csg.usePercentageCloserFiltering = true;
      csg.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
      csg.bias = 0.003;
    }
  }

  private setupOcean(): void {
    // Ocean water surface plane
    this.oceanMesh = MeshBuilder.CreateGround(
      'ocean_plane',
      { width: 4000, height: 4000, subdivisions: 4 },
      this.scene
    );
    this.oceanMesh.position.set(-800, -3.5, -200);

    const oceanMat = new PBRMaterial('ocean_pbr_mat', this.scene);
    oceanMat.albedoColor = new Color3(0.04, 0.16, 0.32); // Deep coastal ocean blue
    oceanMat.metallic = 0.85;
    oceanMat.roughness = 0.12;
    oceanMat.alpha = 0.92;
    oceanMat.subSurface.isRefractionEnabled = true;
    oceanMat.subSurface.indexOfRefraction = 1.333;

    this.oceanMesh.material = oceanMat;
    this.oceanMesh.receiveShadows = true;
  }

  private setupGuardrails(): void {
    const splinePoints = this.road.getSplinePoints();
    const n = splinePoints.length;
    const halfWidth = this.road.width * 0.5 + 0.3;

    const guardMat = new PBRMaterial('guardrail_pbr_mat', this.scene);
    guardMat.metallic = 0.9;
    guardMat.roughness = 0.35;
    guardMat.albedoColor = new Color3(0.85, 0.87, 0.9);

    // Generate continuous outer metallic barrier along coastal edge
    const outerRailPath: Vector3[] = [];
    for (let i = 0; i < n; i += 2) {
      const curr = splinePoints[i];
      const next = splinePoints[(i + 1) % n];
      const tangent = next.subtract(curr).normalize();
      const right = Vector3.Cross(Vector3.Up(), tangent).normalize();

      // Outer side of road (right side)
      const railPos = curr.add(right.scale(halfWidth));
      railPos.y += 0.55; // 0.55m height
      outerRailPath.push(railPos);
    }
    outerRailPath.push(outerRailPath[0]);

    const railMesh = MeshBuilder.CreateTube(
      'outer_guardrail',
      {
        path: outerRailPath,
        radius: 0.1,
        tessellation: 6,
      },
      this.scene
    );
    railMesh.material = guardMat;
    railMesh.receiveShadows = true;
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(railMesh, false);
    }
    this.guardrailMeshes.push(railMesh);
  }

  private setupProps(): void {
    const density = this.graphics.environmentDensity;
    const splinePoints = this.road.getSplinePoints();
    const n = splinePoints.length;

    // Pine Tree Prototype
    const trunk = MeshBuilder.CreateCylinder(
      'proto_trunk',
      { height: 2.5, diameter: 0.4 },
      this.scene
    );
    trunk.position.y = 1.25;
    const foliage = MeshBuilder.CreateCylinder(
      'proto_foliage',
      { height: 5.5, diameterTop: 0.1, diameterBottom: 2.8 },
      this.scene
    );
    foliage.position.y = 4.2;

    const trunkMat = new PBRMaterial('trunk_mat', this.scene);
    trunkMat.albedoColor = new Color3(0.3, 0.2, 0.12);
    trunkMat.roughness = 0.9;
    trunk.material = trunkMat;

    const foliageMat = new PBRMaterial('foliage_mat', this.scene);
    foliageMat.albedoColor = new Color3(0.12, 0.28, 0.14); // Deep forest pine
    foliageMat.roughness = 0.85;
    foliage.material = foliageMat;

    const treeProto = Mesh.MergeMeshes([trunk, foliage], true, true, undefined, false, true);
    if (!treeProto) return;
    treeProto.isVisible = false;

    // Rock Prototype
    const rockProto = MeshBuilder.CreatePolyhedron(
      'proto_rock',
      { type: 1, size: 1.8 },
      this.scene
    );
    const rockMat = new PBRMaterial('rock_mat', this.scene);
    rockMat.albedoColor = new Color3(0.45, 0.44, 0.42);
    rockMat.roughness = 0.95;
    rockProto.material = rockMat;
    rockProto.isVisible = false;

    // Place instanced trees and rocks along the mountain slopes
    const step = Math.max(3, Math.floor(6 / density));
    let treeId = 0;
    let rockId = 0;

    for (let i = 0; i < n; i += step) {
      const pt = splinePoints[i];
      const next = splinePoints[(i + 1) % n];
      const tangent = next.subtract(pt).normalize();
      const right = Vector3.Cross(Vector3.Up(), tangent).normalize();

      // Left mountain side props
      const offsetL = 12 + ((i * 17) % 25);
      const treePos = pt.add(right.scale(-offsetL));
      treePos.y = pt.y - 0.2;

      const treeInstance = treeProto.createInstance(`tree_${treeId++}`);
      treeInstance.position.copyFrom(treePos);
      const treeScale = 0.8 + ((i * 7) % 50) / 70;
      treeInstance.scaling.set(treeScale, treeScale, treeScale);
      treeInstance.rotation.y = (i * 13) % (Math.PI * 2);
      treeInstance.receiveShadows = true;
      if (this.shadowGenerator) {
        this.shadowGenerator.addShadowCaster(treeInstance, false);
      }
      this.propMeshes.push(treeInstance);

      // Rocks
      if (i % (step * 2) === 0) {
        const offsetR = 10 + ((i * 11) % 18);
        const rockPos = pt.add(right.scale(-offsetR));
        rockPos.y = pt.y - 0.3;

        const rockInstance = rockProto.createInstance(`rock_${rockId++}`);
        rockInstance.position.copyFrom(rockPos);
        const rockScale = 0.9 + ((i * 5) % 40) / 40;
        rockInstance.scaling.set(rockScale * 1.4, rockScale * 0.8, rockScale * 1.2);
        rockInstance.rotation.set((i * 3) % 3, (i * 5) % 6, (i * 7) % 3);
        rockInstance.receiveShadows = true;
        this.propMeshes.push(rockInstance);
      }
    }
  }
}
