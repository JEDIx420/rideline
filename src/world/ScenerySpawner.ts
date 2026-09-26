import { Scene } from '@babylonjs/core/scene';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/loaders/glTF';
import { RoadDirector } from './RoadDirector';
import { TerrainChunkManager } from './TerrainChunkManager';
import { SeededRandom } from './SeededRandom';

export class ScenerySpawner {
  private treePrototype: Mesh | null = null;
  private rockPrototype: Mesh | null = null;
  private chunkScenery: Map<number, InstancedMesh[]> = new Map();
  private isLoaded: boolean = false;
  private currentRoadDist: number = 0;

  constructor(
    private scene: Scene,
    private roadDirector: RoadDirector,
    private terrainManager: TerrainChunkManager
  ) {
    this.loadPrototypes();
  }

  private async loadPrototypes(): Promise<void> {
    try {
      // 1. Load Real Tree Asset
      const treeRes = await SceneLoader.ImportMeshAsync('', 'assets/veg/tree/', 'tree.glb', this.scene);
      for (const m of treeRes.meshes) {
        if (m instanceof Mesh && m.geometry) {
          this.treePrototype = m;
          break;
        }
      }
      if (this.treePrototype) {
        this.treePrototype.setEnabled(false);
      }

      // 2. Load Real Rock Asset
      const rockRes = await SceneLoader.ImportMeshAsync('', 'assets/veg/rock_07/', 'rock_07_1k.gltf', this.scene);
      for (const m of rockRes.meshes) {
        if (m instanceof Mesh && m.geometry) {
          this.rockPrototype = m;
          break;
        }
      }
      if (this.rockPrototype) {
        this.rockPrototype.setEnabled(false);
      }

      this.isLoaded = true;
      this.update(this.currentRoadDist);
    } catch (err) {
      console.warn('ScenerySpawner prototype loading error:', err);
    }
  }

  /**
   * Streams scenery instances deterministically by chunk.
   */
  public update(playerRoadDist: number): void {
    this.currentRoadDist = playerRoadDist;
    if (!this.isLoaded || !this.treePrototype || !this.rockPrototype) return;

    const chunkLength = 250.0;
    const currentChunkIdx = Math.floor(playerRoadDist / chunkLength);

    // Keep scenery from (current - 3) [~750m behind] to (current + 12) [~3.0km ahead]
    const minChunk = Math.max(0, currentChunkIdx - 3);
    const maxChunk = currentChunkIdx + 12;

    for (let c = minChunk; c <= maxChunk; c++) {
      if (!this.chunkScenery.has(c)) {
        this.spawnChunkScenery(c, chunkLength);
      }
    }

    // Cleanup out-of-range chunks
    for (const [idx, instances] of this.chunkScenery.entries()) {
      if (idx < minChunk || idx > maxChunk) {
        for (const inst of instances) {
          inst.dispose();
        }
        this.chunkScenery.delete(idx);
      }
    }
  }

  private spawnChunkScenery(chunkIndex: number, chunkLength: number): void {
    if (!this.treePrototype || !this.rockPrototype) return;

    const startDist = chunkIndex * chunkLength;
    const endDist = (chunkIndex + 1) * chunkLength;

    // Filter spline samples within this chunk
    const samples = this.roadDirector.splineSamples.filter(
      (s) => s.distanceAlongRoad >= startDist && s.distanceAlongRoad < endDist
    );

    if (samples.length === 0) return;

    const rng = new SeededRandom(20271 + chunkIndex * 37);
    const instances: InstancedMesh[] = [];

    // Stride along road samples (~every 15 to 20m)
    const step = 6;
    for (let i = 0; i < samples.length; i += step) {
      const s = samples[i];

      for (const side of [-1, 1]) {
        // Density roll: ~45% probability per side per sample
        if (rng.next() > 0.45) continue;

        // Safe lateral setback: 7.5m to 26m off road centerline (outside shoulder)
        const lateralDist = rng.range(7.5, 26.0) * side;
        const spawnX = s.position.x + s.binormal.x * lateralDist;
        const spawnZ = s.position.z + s.binormal.z * lateralDist;

        // Elevation from terrain
        const elevation = this.terrainManager.getElevationAt(spawnX, spawnZ);
        if (elevation <= this.terrainManager.oceanElevation + 0.6) continue;

        // 70% Trees, 30% Rocks
        if (rng.next() < 0.70) {
          const inst = this.treePrototype.createInstance(`tree_c${chunkIndex}_${i}_${side}`);
          inst.position.set(spawnX, elevation, spawnZ);
          const scale = rng.range(0.85, 1.45);
          inst.scaling.set(scale, scale, scale);
          inst.rotation.y = rng.range(0, Math.PI * 2);
          instances.push(inst);
        } else {
          const inst = this.rockPrototype.createInstance(`rock_c${chunkIndex}_${i}_${side}`);
          inst.position.set(spawnX, elevation + 0.2, spawnZ);
          const scale = rng.range(0.8, 1.9);
          inst.scaling.set(scale, scale * 0.85, scale);
          inst.rotation.y = rng.range(0, Math.PI * 2);
          instances.push(inst);
        }
      }
    }

    this.chunkScenery.set(chunkIndex, instances);
  }

  public setVisible(visible: boolean): void {
    for (const instances of this.chunkScenery.values()) {
      for (const inst of instances) {
        inst.setEnabled(visible);
      }
    }
  }

  public dispose(): void {
    for (const instances of this.chunkScenery.values()) {
      for (const inst of instances) {
        inst.dispose();
      }
    }
    this.chunkScenery.clear();
    this.treePrototype?.dispose();
    this.rockPrototype?.dispose();
  }
}

