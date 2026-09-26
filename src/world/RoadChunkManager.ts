import { Scene } from '@babylonjs/core/scene';
import { Vector3, Vector2, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RoadDirector } from './RoadDirector';

export interface RoadChunk {
  chunkIndex: number;
  startDistance: number;
  endDistance: number;
  roadMesh: Mesh;
  shoulderMesh: Mesh;
  markingsMesh: Mesh;
}

export class RoadChunkManager {
  public readonly roadWidth: number = 8.8; // Two 4.4m lanes
  public readonly shoulderWidth: number = 2.2;
  public readonly chunkLength: number = 250.0; // 250m per chunk

  private chunks: Map<number, RoadChunk> = new Map();
  private roadMaterial: PBRMaterial;
  private shoulderMaterial: PBRMaterial;
  private markingsMaterial: PBRMaterial;

  constructor(private scene: Scene, private director: RoadDirector) {
    this.roadMaterial = this.createRoadMaterial();
    this.shoulderMaterial = this.createShoulderMaterial();
    this.markingsMaterial = this.createMarkingsMaterial();
  }

  private createRoadMaterial(): PBRMaterial {
    const mat = new PBRMaterial('road_chunk_pbr_asphalt', this.scene);
    mat.albedoColor = new Color3(0.75, 0.75, 0.75);

    // Authored CC0 PBR Asphalt Textures
    const diffTex = new Texture('assets/road/asphalt_diff.jpg', this.scene);
    diffTex.wrapU = Texture.WRAP_ADDRESSMODE;
    diffTex.wrapV = Texture.WRAP_ADDRESSMODE;
    diffTex.uScale = 2.0;
    diffTex.vScale = 0.25; // 1 repeat every 4 meters
    mat.albedoTexture = diffTex;

    const norTex = new Texture('assets/road/asphalt_nor.jpg', this.scene);
    norTex.wrapU = Texture.WRAP_ADDRESSMODE;
    norTex.wrapV = Texture.WRAP_ADDRESSMODE;
    norTex.uScale = 2.0;
    norTex.vScale = 0.25;
    mat.bumpTexture = norTex;

    const armTex = new Texture('assets/road/asphalt_arm.jpg', this.scene);
    armTex.wrapU = Texture.WRAP_ADDRESSMODE;
    armTex.wrapV = Texture.WRAP_ADDRESSMODE;
    armTex.uScale = 2.0;
    armTex.vScale = 0.25;
    mat.metallicTexture = armTex;
    mat.useRoughnessFromMetallicTextureAlpha = false;
    mat.useRoughnessFromMetallicTextureGreen = true;
    mat.useMetallnessFromMetallicTextureBlue = true;
    mat.useAmbientOcclusionFromMetallicTextureRed = true;

    mat.roughness = 0.88;
    mat.metallic = 0.04;
    return mat;
  }

  private createShoulderMaterial(): PBRMaterial {
    const mat = new PBRMaterial('shoulder_chunk_pbr', this.scene);
    mat.albedoColor = new Color3(0.42, 0.38, 0.30);
    mat.metallic = 0.0;
    mat.roughness = 0.96;

    // Use terrain/gravel texture if available, or high-roughness natural tone
    const grassTex = new Texture('assets/terrain/grass_diff.jpg', this.scene);
    grassTex.wrapU = Texture.WRAP_ADDRESSMODE;
    grassTex.wrapV = Texture.WRAP_ADDRESSMODE;
    grassTex.uScale = 1.0;
    grassTex.vScale = 0.2;
    mat.albedoTexture = grassTex;
    return mat;
  }

  private createMarkingsMaterial(): PBRMaterial {
    const mat = new PBRMaterial('road_markings_pbr', this.scene);
    mat.albedoColor = new Color3(0.95, 0.95, 0.92);
    mat.metallic = 0.0;
    mat.roughness = 0.55;
    mat.backFaceCulling = false;
    return mat;
  }

  /**
   * Updates streamed road chunks based on player road distance.
   */
  public update(playerRoadDist: number): void {
    const currentChunkIdx = Math.floor(playerRoadDist / this.chunkLength);

    // Keep chunks from (current - 4) [~1.0 km behind] to (current + 16) [~4.0 km ahead]
    const minChunk = Math.max(0, currentChunkIdx - 4);
    const maxChunk = currentChunkIdx + 16;

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
        chunk.markingsMesh.dispose();
        this.chunks.delete(idx);
      }
    }
  }

  private buildChunk(chunkIndex: number): void {
    const startDist = chunkIndex * this.chunkLength;
    const endDist = (chunkIndex + 1) * this.chunkLength;

    // Filter spline samples within this distance window (slight overlap for seamless continuity)
    const samples = this.director.splineSamples.filter(
      (s) => s.distanceAlongRoad >= startDist - 2.5 && s.distanceAlongRoad <= endDist + 2.5
    );

    if (samples.length < 2) return;

    const halfWidth = this.roadWidth * 0.5;

    // 1. Build Asphalt Road Mesh with side skirts
    // 4 paths: [leftSkirt, leftEdge, rightEdge, rightSkirt]
    const roadPaths: Vector3[][] = [[], [], [], []];
    const roadUvs: Vector2[][] = [[], [], [], []];

    for (const s of samples) {
      const lateral = s.binormal.scale(halfWidth);
      const bankedNormal = s.normal.scale(Math.sin(s.camberAngleRad) * 0.2);
      const leftEdge = s.position.subtract(lateral).add(bankedNormal);
      const rightEdge = s.position.add(lateral).subtract(bankedNormal);
      const leftSkirt = leftEdge.subtract(new Vector3(0, 0.18, 0));
      const rightSkirt = rightEdge.subtract(new Vector3(0, 0.18, 0));

      const v = s.distanceAlongRoad;

      roadPaths[0].push(leftSkirt);
      roadUvs[0].push(new Vector2(0, v));

      roadPaths[1].push(leftEdge);
      roadUvs[1].push(new Vector2(0.05, v));

      roadPaths[2].push(rightEdge);
      roadUvs[2].push(new Vector2(0.95, v));

      roadPaths[3].push(rightSkirt);
      roadUvs[3].push(new Vector2(1.0, v));
    }

    const roadMesh = MeshBuilder.CreateRibbon(
      `road_chunk_${chunkIndex}`,
      {
        pathArray: roadPaths,
        closeArray: false,
        sideOrientation: Mesh.DOUBLESIDE,
        uvs: roadUvs.flat(),
      },
      this.scene
    );
    roadMesh.material = this.roadMaterial;
    roadMesh.receiveShadows = true;

    // 2. Build Road Markings Ribbon (Center Dashes + Outer Edge Lines)
    // Raised by +3mm to eliminate z-fighting
    const markPaths: Vector3[][] = [[], [], [], []];
    for (const s of samples) {
      const dist = s.distanceAlongRoad;
      const isDash = (dist % 6.0) < 3.2; // 3.2m dash, 2.8m gap

      const markLift = s.normal.scale(0.004);
      const centerMark = s.position.add(markLift);
      const centerHalfWidth = s.binormal.scale(isDash ? 0.08 : 0.001); // Collapses to 0 width during gaps

      markPaths[0].push(centerMark.subtract(centerHalfWidth));
      markPaths[1].push(centerMark.add(centerHalfWidth));

      // Outer fog lines (continuous 12cm line 25cm inside road edge)
      const outerLeft = s.position.subtract(s.binormal.scale(halfWidth - 0.25)).add(markLift);
      const outerRight = s.position.add(s.binormal.scale(halfWidth - 0.25)).add(markLift);
      markPaths[2].push(outerLeft);
      markPaths[3].push(outerRight);
    }

    const markingsMesh = MeshBuilder.CreateRibbon(
      `markings_chunk_${chunkIndex}`,
      {
        pathArray: [markPaths[0], markPaths[1]],
        closeArray: false,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );
    markingsMesh.material = this.markingsMaterial;

    // 3. Build Graded Gravel Shoulder Mesh
    const shPaths: Vector3[][] = [[], [], [], []];
    const totalHalfWidth = halfWidth + this.shoulderWidth;

    for (const s of samples) {
      const innerLeft = s.position.subtract(s.binormal.scale(halfWidth)).subtract(new Vector3(0, 0.02, 0));
      const innerRight = s.position.add(s.binormal.scale(halfWidth)).subtract(new Vector3(0, 0.02, 0));
      const outerLeft = s.position.subtract(s.binormal.scale(totalHalfWidth)).subtract(new Vector3(0, 0.12, 0));
      const outerRight = s.position.add(s.binormal.scale(totalHalfWidth)).subtract(new Vector3(0, 0.12, 0));

      shPaths[0].push(outerLeft);
      shPaths[1].push(innerLeft);
      shPaths[2].push(innerRight);
      shPaths[3].push(outerRight);
    }

    const shoulderMesh = MeshBuilder.CreateRibbon(
      `shoulder_chunk_${chunkIndex}`,
      {
        pathArray: [shPaths[0], shPaths[1]],
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
      markingsMesh,
    });
  }

  public setVisible(visible: boolean): void {
    for (const chunk of this.chunks.values()) {
      chunk.roadMesh.setEnabled(visible);
      chunk.shoulderMesh.setEnabled(visible);
      chunk.markingsMesh.setEnabled(visible);
    }
  }

  public dispose(): void {
    for (const chunk of this.chunks.values()) {
      chunk.roadMesh.dispose();
      chunk.shoulderMesh.dispose();
      chunk.markingsMesh.dispose();
    }
    this.chunks.clear();
  }
}

