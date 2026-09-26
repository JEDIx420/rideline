import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { CascadedShadowGenerator } from '@babylonjs/core/Lights/Shadows/cascadedShadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { GraphicsSettings } from '../config/graphics';
import { Road } from './Road';

export class Environment {
  public sunLight: DirectionalLight | null = null;
  public ambientLight: HemisphericLight | null = null;
  public shadowGenerator: ShadowGenerator | null = null;
  public oceanMesh: Mesh | null = null;
  public coastalEnvTexture: HDRCubeTexture | null = null;

  private guardrailMeshes: Mesh[] = [];
  private propMeshes: (Mesh | InstancedMesh)[] = [];
  private rootMesh: Mesh;

  constructor(
    private scene: Scene,
    private road: Road,
    private graphics: GraphicsSettings
  ) {
    this.rootMesh = new Mesh('world_env_root', this.scene);
    this.setupAtmosphere();
    this.setupEnvironmentTexture();
    this.setupLighting();
    this.setupOcean();
    this.setupGuardrails();
    this.setupProps();
  }

  private setupEnvironmentTexture(): void {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    const hdrUrl = baseUrl + 'assets/env/coastal_sky.hdr';

    try {
      this.coastalEnvTexture = new HDRCubeTexture(hdrUrl, this.scene, 512, false, true, false, true);
      this.scene.environmentTexture = this.coastalEnvTexture;
      this.scene.environmentIntensity = 0.95;
    } catch (e) {
      console.warn('Could not load coastal HDR map, falling back to standard sky:', e);
    }
  }

  private setupAtmosphere(): void {
    // Subtle coastal maritime haze / fog
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.00038;
    this.scene.fogColor = new Color3(0.72, 0.80, 0.90);
    this.scene.clearColor = new Color4(0.72, 0.80, 0.90, 1.0);

    // Sky Dome
    const skybox = MeshBuilder.CreateSphere('sky_dome', { diameter: 4500, segments: 16 }, this.scene);
    skybox.parent = this.rootMesh;
    const skyMat = new StandardMaterial('sky_mat', this.scene);
    skyMat.backFaceCulling = false;
    skyMat.diffuseColor = new Color3(0, 0, 0);
    skyMat.specularColor = new Color3(0, 0, 0);
    skyMat.emissiveColor = new Color3(0.38, 0.62, 0.86);
    skybox.material = skyMat;
    skybox.infiniteDistance = true;
  }

  private setupLighting(): void {
    // Hemispheric ambient light
    this.ambientLight = new HemisphericLight(
      'hemi_ambient',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.ambientLight.intensity = 0.8;
    this.ambientLight.groundColor = new Color3(0.24, 0.22, 0.18);
    this.ambientLight.diffuse = new Color3(0.92, 0.95, 1.0);

    // Directional Sun Light
    this.sunLight = new DirectionalLight(
      'sun_dir',
      new Vector3(-0.6, -0.75, -0.4).normalize(),
      this.scene
    );
    this.sunLight.position = new Vector3(300, 500, 300);
    this.sunLight.intensity = 2.4;
    this.sunLight.diffuse = new Color3(1.0, 0.97, 0.90);
    this.sunLight.specular = new Color3(1.0, 1.0, 0.95);

    // Shadows based on graphics quality preset
    if (this.graphics.shadowsEnabled) {
      this.shadowGenerator = new CascadedShadowGenerator(
        this.graphics.shadowMapSize,
        this.sunLight
      );
      const csg = this.shadowGenerator as CascadedShadowGenerator;
      csg.numCascades = this.graphics.shadowCascades;
      csg.shadowMaxZ = 250;
      csg.lambda = 0.9;
      csg.cascadeBlendPercentage = 0.15;
      csg.usePercentageCloserFiltering = true;
      csg.filteringQuality = ShadowGenerator.QUALITY_HIGH;
      csg.bias = 0.0005;
      csg.normalBias = 0.02;
    }
  }

  private setupOcean(): void {
    this.oceanMesh = MeshBuilder.CreateGround(
      'ocean_plane',
      { width: 4500, height: 4500, subdivisions: 4 },
      this.scene
    );
    this.oceanMesh.parent = this.rootMesh;
    this.oceanMesh.position.set(-800, -3.5, -200);

    const oceanMat = new PBRMaterial('ocean_pbr_mat', this.scene);
    oceanMat.albedoColor = new Color3(0.03, 0.14, 0.28);
    oceanMat.metallic = 0.85;
    oceanMat.roughness = 0.14;
    oceanMat.alpha = 0.94;
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
    guardMat.metallic = 0.92;
    guardMat.roughness = 0.30;
    guardMat.albedoColor = new Color3(0.85, 0.87, 0.90);

    const outerRailPath: Vector3[] = [];
    for (let i = 0; i < n; i += 2) {
      const curr = splinePoints[i];
      const next = splinePoints[(i + 1) % n];
      const tangent = next.subtract(curr).normalize();
      const right = Vector3.Cross(Vector3.Up(), tangent).normalize();

      const railPos = curr.add(right.scale(halfWidth));
      railPos.y += 0.55;
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
    railMesh.parent = this.rootMesh;
    railMesh.material = guardMat;
    railMesh.receiveShadows = true;
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(railMesh, false);
    }
    this.guardrailMeshes.push(railMesh);
  }

  private async setupProps(): Promise<void> {
    const density = this.graphics.environmentDensity;
    const splinePoints = this.road.getSplinePoints();
    const n = splinePoints.length;
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';

    let treeProto: Mesh | null = null;
    let rockProto: Mesh | null = null;

    // Load authentic CC0 Fir Tree model from Poly Haven
    try {
      const treeRes = await SceneLoader.ImportMeshAsync(
        '',
        '',
        baseUrl + 'assets/veg/fir_tree/fir_tree_01_1k.gltf',
        this.scene
      );
      for (const m of treeRes.meshes) {
        if (m.name.includes('fir_tree_01_a') || (!treeProto && m.getTotalVertices() > 0)) {
          treeProto = m as Mesh;
        }
      }
      if (treeProto) {
        treeProto.parent = this.rootMesh;
        treeProto.scaling.set(1.4, 1.4, 1.4);
        treeProto.isVisible = false;
      }
    } catch (e) {
      console.warn('Could not load fir_tree gltf, using clean fallback:', e);
    }

    // Load authentic CC0 Coastal Rock boulder model
    try {
      const rockRes = await SceneLoader.ImportMeshAsync(
        '',
        '',
        baseUrl + 'assets/veg/coast_rocks/coast_rocks_01_1k.gltf',
        this.scene
      );
      for (const m of rockRes.meshes) {
        if (m.name.includes('coast_rocks') || (!rockProto && m.getTotalVertices() > 0)) {
          rockProto = m as Mesh;
        }
      }
      if (rockProto) {
        rockProto.parent = this.rootMesh;
        rockProto.scaling.set(1.5, 1.5, 1.5);
        rockProto.isVisible = false;
      }
    } catch (e) {
      console.warn('Could not load coast_rocks gltf, using clean fallback:', e);
    }

    // Fallbacks if gltf assets could not be parsed
    if (!treeProto) {
      const trunk = MeshBuilder.CreateCylinder('proto_trunk', { height: 3.0, diameter: 0.45 }, this.scene);
      const foliage = MeshBuilder.CreateCylinder('proto_foliage', { height: 6.0, diameterTop: 0.1, diameterBottom: 3.2 }, this.scene);
      foliage.position.y = 4.5;
      treeProto = Mesh.MergeMeshes([trunk, foliage], true, true, undefined, false, true) as Mesh;
      if (treeProto) {
        treeProto.parent = this.rootMesh;
        treeProto.isVisible = false;
      }
    }

    if (!rockProto) {
      rockProto = MeshBuilder.CreatePolyhedron('proto_rock', { type: 1, size: 2.0 }, this.scene);
      rockProto.parent = this.rootMesh;
      rockProto.isVisible = false;
    }

    const step = Math.max(3, Math.floor(6 / density));
    let treeId = 0;
    let rockId = 0;

    for (let i = 0; i < n; i += step) {
      const pt = splinePoints[i];
      const next = splinePoints[(i + 1) % n];
      const tangent = next.subtract(pt).normalize();
      const right = Vector3.Cross(Vector3.Up(), tangent).normalize();

      // Forest side (inland / left of road)
      const offsetL = 12 + ((i * 17) % 28);
      const treePos = pt.add(right.scale(-offsetL));
      treePos.y = pt.y - 0.2;

      if (treeProto) {
        const treeInstance = treeProto.createInstance(`fir_tree_${treeId++}`);
        treeInstance.parent = this.rootMesh;
        treeInstance.position.copyFrom(treePos);
        const scale = 0.9 + ((i * 7) % 40) / 50;
        treeInstance.scaling.set(scale, scale, scale);
        treeInstance.rotation.y = (i * 13) % (Math.PI * 2);
        if (this.shadowGenerator) {
          this.shadowGenerator.addShadowCaster(treeInstance, false);
        }
        this.propMeshes.push(treeInstance);
      }

      // Coastal boulder side (right of road)
      if (i % (step * 2) === 0 && rockProto) {
        const offsetR = 9 + ((i * 11) % 16);
        const rockPos = pt.add(right.scale(offsetR));
        rockPos.y = pt.y - 0.3;

        const rockInstance = rockProto.createInstance(`boulder_${rockId++}`);
        rockInstance.parent = this.rootMesh;
        rockInstance.position.copyFrom(rockPos);
        const rockScale = 0.8 + ((i * 5) % 35) / 35;
        rockInstance.scaling.set(rockScale * 1.3, rockScale * 0.9, rockScale * 1.2);
        rockInstance.rotation.set((i * 3) % 3, (i * 5) % 6, (i * 7) % 3);
        this.propMeshes.push(rockInstance);
      }
    }
  }

  public setVisible(visible: boolean): void {
    this.rootMesh.setEnabled(visible);
    if (this.sunLight) this.sunLight.setEnabled(visible);
    if (this.ambientLight) this.ambientLight.setEnabled(visible);
    if (visible && this.coastalEnvTexture) {
      this.scene.environmentTexture = this.coastalEnvTexture;
      this.scene.environmentIntensity = 0.95;
    }
  }

  public dispose(): void {
    this.rootMesh.dispose(false, true);
    this.sunLight?.dispose();
    this.ambientLight?.dispose();
    this.coastalEnvTexture?.dispose();
  }
}
