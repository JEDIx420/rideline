import { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RoadDirector } from './RoadDirector';
import { TerrainChunkManager } from './TerrainChunkManager';
import { SeededRandom } from './SeededRandom';

export class ScenerySpawner {
  private treePrototypes: Mesh[] = [];
  private rockPrototypes: Mesh[] = [];
  private spawnedInstances: Mesh[] = [];
  private rng: SeededRandom = new SeededRandom(555);

  constructor(
    private scene: Scene,
    private roadDirector: RoadDirector,
    private terrainManager: TerrainChunkManager
  ) {
    this.createPrototypes();
    this.populateInitialCorridor();
  }

  private createPrototypes(): void {
    // 1. Pine Tree Prototype
    const trunk = MeshBuilder.CreateCylinder('trunk_proto', { diameterTop: 0.3, diameterBottom: 0.6, height: 2.2 }, this.scene);
    const trunkMat = new StandardMaterial('trunk_mat', this.scene);
    trunkMat.diffuseColor = new Color3(0.28, 0.20, 0.14);
    trunk.material = trunkMat;

    const foliage1 = MeshBuilder.CreateCylinder('foliage1', { diameterTop: 0.1, diameterBottom: 3.2, height: 3.5 }, this.scene);
    foliage1.position.y = 2.5;
    const folMat = new StandardMaterial('fol_mat', this.scene);
    folMat.diffuseColor = new Color3(0.18, 0.32, 0.16);
    foliage1.material = folMat;

    const foliage2 = MeshBuilder.CreateCylinder('foliage2', { diameterTop: 0.05, diameterBottom: 2.2, height: 2.8 }, this.scene);
    foliage2.position.y = 4.2;
    foliage2.material = folMat;

    const tree = Mesh.MergeMeshes([trunk, foliage1, foliage2], true, true, undefined, false, true);
    if (tree) {
      tree.setEnabled(false);
      this.treePrototypes.push(tree);
    }

    // 2. Rock Boulder Prototype
    const rock = MeshBuilder.CreatePolyhedron('rock_proto', { type: 1, size: 1.2 }, this.scene);
    const rockMat = new StandardMaterial('rock_mat', this.scene);
    rockMat.diffuseColor = new Color3(0.42, 0.42, 0.40);
    rock.material = rockMat;
    rock.setEnabled(false);
    this.rockPrototypes.push(rock);
  }

  private populateInitialCorridor(): void {
    const samples = this.roadDirector.splineSamples;
    const treeProto = this.treePrototypes[0];
    const rockProto = this.rockPrototypes[0];
    if (!treeProto || !rockProto) return;

    // Place trees & rocks along road samples with safe lateral buffer
    const step = 8; // Every ~20 meters
    for (let i = 2; i < samples.length; i += step) {
      const s = samples[i];

      // Spawn on left and right sides
      for (const side of [-1, 1]) {
        if (this.rng.next() > 0.65) continue; // Density roll

        // Safe offset: at least 7.5m to 25m off center (outside shoulder)
        const lateralDist = this.rng.range(7.5, 24.0) * side;
        const spawnX = s.position.x + s.binormal.x * lateralDist;
        const spawnZ = s.position.z + s.binormal.z * lateralDist;

        // Skip if ocean
        const elevation = this.terrainManager.getElevationAt(spawnX, spawnZ);
        if (elevation <= this.terrainManager.oceanElevation + 0.5) continue;

        // Trees
        if (this.rng.next() < 0.75) {
          const inst = treeProto.createInstance(`tree_${i}_${side}`);
          inst.position.set(spawnX, elevation, spawnZ);
          const scale = this.rng.range(0.85, 1.35);
          inst.scaling.set(scale, scale, scale);
          inst.rotation.y = this.rng.range(0, Math.PI * 2);
          this.spawnedInstances.push(inst as unknown as Mesh);
        } else {
          // Boulders
          const inst = rockProto.createInstance(`rock_${i}_${side}`);
          inst.position.set(spawnX, elevation + 0.3, spawnZ);
          const scale = this.rng.range(0.8, 1.8);
          inst.scaling.set(scale, scale * 0.8, scale);
          inst.rotation.y = this.rng.range(0, Math.PI * 2);
          this.spawnedInstances.push(inst as unknown as Mesh);
        }
      }
    }
  }

  public setVisible(visible: boolean): void {
    for (const inst of this.spawnedInstances) {
      inst.setEnabled(visible);
    }
  }

  public dispose(): void {
    for (const inst of this.spawnedInstances) {
      inst.dispose();
    }
    this.spawnedInstances = [];
    for (const proto of this.treePrototypes) {
      proto.dispose();
    }
    for (const proto of this.rockPrototypes) {
      proto.dispose();
    }
  }
}
