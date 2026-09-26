import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RoadDirector } from './RoadDirector';

export interface TerrainChunk {
  key: string;
  gridX: number;
  gridZ: number;
  mesh: Mesh;
}

export class TerrainChunkManager {
  public readonly chunkSize: number = 300.0;
  public readonly subdivisions: number = 24;
  public readonly oceanElevation: number = -3.2;

  private chunks: Map<string, TerrainChunk> = new Map();
  private terrainMaterial: PBRMaterial;

  constructor(private scene: Scene, private roadDirector: RoadDirector) {
    this.terrainMaterial = this.createTerrainMaterial();
  }

  private createTerrainMaterial(): PBRMaterial {
    const mat = new PBRMaterial('streamed_terrain_pbr', this.scene);
    mat.albedoColor = new Color3(0.32, 0.42, 0.28);
    mat.metallic = 0.0;
    mat.roughness = 0.94;

    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    try {
      const diffTex = new Texture(baseUrl + 'assets/terrain/grass_diff.jpg', this.scene);
      diffTex.uScale = 20.0;
      diffTex.vScale = 20.0;
      mat.albedoTexture = diffTex;

      const normTex = new Texture(baseUrl + 'assets/terrain/grass_nor.jpg', this.scene);
      normTex.uScale = 20.0;
      normTex.vScale = 20.0;
      mat.bumpTexture = normTex;
    } catch {
      // Safe fallback
    }

    return mat;
  }

  /**
   * Computes elevation at any (x, z) world coordinate, conforming seamlessly to the road.
   */
  public getElevationAt(x: number, z: number): number {
    // 1. Natural procedural terrain base height
    let baseHeight = -2.0;

    // Hills & Mountains
    baseHeight += Math.sin(x * 0.0035) * Math.cos(z * 0.0035) * 45.0;
    baseHeight += Math.sin(x * 0.008 + 1.2) * Math.cos(z * 0.007) * 18.0;
    baseHeight += Math.sin(x * 0.02) * Math.cos(z * 0.018) * 4.0;

    // Ocean boundary in western direction
    if (x < -200) {
      baseHeight = Math.min(-2.8, baseHeight * 0.15 - 3.0);
    }

    // 2. Road Conformance: Blend terrain smoothly to road shoulder elevation
    const roadPt = this.roadDirector.getClosestPoint(new Vector3(x, 0, z));
    const distToCenter = roadPt.distanceToCenter;

    const roadHalfWidth = 4.6; // 9.2m / 2
    const shoulderWidth = 2.2;
    const blendZone = 35.0; // 35m embankment blend zone

    if (distToCenter <= roadHalfWidth + shoulderWidth) {
      // Directly on road or shoulder: match road elevation exactly
      return roadPt.position.y - 0.08;
    } else if (distToCenter < roadHalfWidth + shoulderWidth + blendZone) {
      // Smooth Hermite blend from shoulder elevation to natural terrain
      const t = (distToCenter - (roadHalfWidth + shoulderWidth)) / blendZone;
      const smoothT = t * t * (3 - 2 * t);
      const roadElevation = roadPt.position.y - 0.08;
      return roadElevation * (1.0 - smoothT) + baseHeight * smoothT;
    }

    return baseHeight;
  }

  public getNormalAt(x: number, z: number): Vector3 {
    const eps = 1.0;
    const hL = this.getElevationAt(x - eps, z);
    const hR = this.getElevationAt(x + eps, z);
    const hD = this.getElevationAt(x, z - eps);
    const hU = this.getElevationAt(x, z + eps);
    return new Vector3(hL - hR, 2 * eps, hD - hU).normalize();
  }

  /**
   * Updates streamed terrain chunks around player position.
   */
  public update(playerPos: Vector3): void {
    const centerGridX = Math.floor(playerPos.x / this.chunkSize);
    const centerGridZ = Math.floor(playerPos.z / this.chunkSize);

    const radius = 3; // 3x3 grid around player (spanning ~1.8 km x 1.8 km)
    const neededKeys = new Set<string>();

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const gx = centerGridX + dx;
        const gz = centerGridZ + dz;
        const key = `${gx}_${gz}`;
        neededKeys.add(key);

        if (!this.chunks.has(key)) {
          this.buildChunk(key, gx, gz);
        }
      }
    }

    // Dispose out-of-range chunks
    for (const [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        chunk.mesh.dispose();
        this.chunks.delete(key);
      }
    }
  }

  private buildChunk(key: string, gx: number, gz: number): void {
    const mesh = MeshBuilder.CreateGround(
      `terrain_chunk_${key}`,
      {
        width: this.chunkSize,
        height: this.chunkSize,
        subdivisions: this.subdivisions,
        updatable: true,
      },
      this.scene
    );

    const worldCenterX = (gx + 0.5) * this.chunkSize;
    const worldCenterZ = (gz + 0.5) * this.chunkSize;
    mesh.position.set(worldCenterX, 0, worldCenterZ);

    const positions = mesh.getVerticesData('position');
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const vx = positions[i] + worldCenterX;
        const vz = positions[i + 2] + worldCenterZ;
        positions[i + 1] = this.getElevationAt(vx, vz);
      }
      mesh.setVerticesData('position', positions);
      mesh.createNormals(false);
    }

    mesh.material = this.terrainMaterial;
    mesh.receiveShadows = true;

    this.chunks.set(key, { key, gridX: gx, gridZ: gz, mesh });
  }

  public setVisible(visible: boolean): void {
    for (const chunk of this.chunks.values()) {
      chunk.mesh.setEnabled(visible);
    }
  }

  public dispose(): void {
    for (const chunk of this.chunks.values()) {
      chunk.mesh.dispose();
    }
    this.chunks.clear();
  }
}
