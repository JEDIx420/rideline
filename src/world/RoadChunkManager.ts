import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { RoadDirector } from './RoadDirector';

export interface RoadChunk {
  chunkIndex: number;
  startDistance: number;
  endDistance: number;
  roadMesh: Mesh;
  shoulderMesh: Mesh;
}

export class RoadChunkManager {
  public readonly roadWidth: number = 9.2; // Two 4.2m lanes + markings
  public readonly shoulderWidth: number = 2.2;
  public readonly chunkLength: number = 250.0; // 250m per chunk

  private chunks: Map<number, RoadChunk> = new Map();
  private roadMaterial: PBRMaterial;
  private shoulderMaterial: PBRMaterial;

  constructor(private scene: Scene, private director: RoadDirector) {
    this.roadMaterial = this.createRoadMaterial();
    this.shoulderMaterial = this.createShoulderMaterial();
  }

  private createRoadMaterial(): PBRMaterial {
    const mat = new PBRMaterial('road_chunk_pbr', this.scene);
    mat.albedoColor = new Color3(0.20, 0.20, 0.22);
    mat.metallic = 0.05;
    mat.roughness = 0.85;

    // Procedural asphalt texture with dual lane markings
    const texSize = 512;
    const dynTex = new DynamicTexture('road_lane_tex', texSize, this.scene, false);
    const ctx = dynTex.getContext() as CanvasRenderingContext2D;

    // Asphalt dark grey base
    ctx.fillStyle = '#2b2c2e';
    ctx.fillRect(0, 0, texSize, texSize);

    // Subtle asphalt grain
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 4000; i++) {
      const rx = Math.random() * texSize;
      const ry = Math.random() * texSize;
      ctx.fillRect(rx, ry, 1, 1);
    }

    // Outer solid white fog lines
    ctx.fillStyle = '#e8eaed';
    ctx.fillRect(18, 0, 10, texSize);
    ctx.fillRect(texSize - 28, 0, 10, texSize);

    // Center broken yellow dividing line
    ctx.fillStyle = '#e8b835';
    const dashLength = 36;
    const gapLength = 28;
    for (let y = 0; y < texSize; y += dashLength + gapLength) {
      ctx.fillRect(texSize * 0.5 - 4, y, 8, dashLength);
    }

    dynTex.update();
    dynTex.uScale = 1.0;
    dynTex.vScale = 8.0;
    mat.albedoTexture = dynTex;
    return mat;
  }

  private createShoulderMaterial(): PBRMaterial {
    const mat = new PBRMaterial('shoulder_chunk_pbr', this.scene);
    mat.albedoColor = new Color3(0.35, 0.33, 0.28);
    mat.metallic = 0.0;
    mat.roughness = 0.95;
    return mat;
  }

  /**
   * Updates streamed road chunks based on player road distance.
   */
  public update(playerRoadDist: number): void {
    const currentChunkIdx = Math.floor(playerRoadDist / this.chunkLength);

    // Keep chunks from (current - 5) [~1.25 km behind] to (current + 14) [~3.5 km ahead]
    const minChunk = Math.max(0, currentChunkIdx - 5);
    const maxChunk = currentChunkIdx + 14;

    // Create needed chunks
    for (let c = minChunk; c <= maxChunk; c++) {
      if (!this.chunks.has(c)) {
        this.buildChunk(c);
      }
    }

    // Dispose out-of-range chunks
    for (const [idx, chunk] of this.chunks.entries()) {
      if (idx < minChunk || idx > maxChunk) {
        chunk.roadMesh.dispose();
        chunk.shoulderMesh.dispose();
        this.chunks.delete(idx);
      }
    }
  }

  private buildChunk(chunkIndex: number): void {
    const startDist = chunkIndex * this.chunkLength;
    const endDist = (chunkIndex + 1) * this.chunkLength;

    // Filter spline samples within this distance window
    const samples = this.director.splineSamples.filter(
      (s) => s.distanceAlongRoad >= startDist - 2.5 && s.distanceAlongRoad <= endDist + 2.5
    );

    if (samples.length < 2) return;

    // Build Road Ribbon Mesh
    const halfWidth = this.roadWidth * 0.5;
    const paths: Vector3[][] = [[], []];

    for (const s of samples) {
      const lateral = s.binormal.scale(halfWidth);
      const bankedNormal = s.normal.scale(Math.sin(s.camberAngleRad) * 0.2);
      paths[0].push(s.position.subtract(lateral).add(bankedNormal));
      paths[1].push(s.position.add(lateral).subtract(bankedNormal));
    }

    const roadMesh = MeshBuilder.CreateRibbon(
      `road_chunk_${chunkIndex}`,
      {
        pathArray: paths,
        closeArray: false,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );
    roadMesh.material = this.roadMaterial;
    roadMesh.receiveShadows = true;

    // Build Shoulder Mesh
    const shPaths: Vector3[][] = [[], []];
    const totalHalfWidth = halfWidth + this.shoulderWidth;
    for (const s of samples) {
      const lateral = s.binormal.scale(totalHalfWidth);
      shPaths[0].push(s.position.subtract(lateral).subtract(new Vector3(0, 0.08, 0)));
      shPaths[1].push(s.position.add(lateral).subtract(new Vector3(0, 0.08, 0)));
    }

    const shoulderMesh = MeshBuilder.CreateRibbon(
      `shoulder_chunk_${chunkIndex}`,
      {
        pathArray: shPaths,
        closeArray: false,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );
    shoulderMesh.material = this.shoulderMaterial;
    shoulderMesh.receiveShadows = true;

    this.chunks.set(chunkIndex, {
      chunkIndex,
      startDistance: startDist,
      endDistance: endDist,
      roadMesh,
      shoulderMesh,
    });
  }

  public setVisible(visible: boolean): void {
    for (const chunk of this.chunks.values()) {
      chunk.roadMesh.setEnabled(visible);
      chunk.shoulderMesh.setEnabled(visible);
    }
  }

  public dispose(): void {
    for (const chunk of this.chunks.values()) {
      chunk.roadMesh.dispose();
      chunk.shoulderMesh.dispose();
    }
    this.chunks.clear();
  }
}
