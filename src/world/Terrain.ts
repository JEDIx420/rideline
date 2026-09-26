import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Road } from './Road';

import { WorldDirector } from './WorldDirector';

export interface SurfaceContactInfo {
  elevation: number;
  normal: Vector3;
  surfaceType: 'asphalt' | 'shoulder' | 'offroad' | 'water' | 'out_of_bounds';
  frictionMultiplier: number;
  dragMultiplier: number;
  pitch: number;
}

export const WORLD_BOUNDS = {
  minX: -1050,
  maxX: 2050,
  minZ: -1750,
  maxZ: 1350,
  maxAllowedRoadDistance: 50.0,
};

export class Terrain {
  public terrainMesh: Mesh | null = null;
  public readonly oceanElevation: number = -3.2;

  constructor(private scene: Scene, public director?: WorldDirector) {
    this.createTerrainMesh();
  }

  public getElevationAt(x: number, z: number): number {
    let y = -2.0;

    // Mountain backdrop in northeast
    if (x > 350 && z < 250) {
      y += Math.sin(x * 0.003) * Math.cos(z * 0.003) * 115;
      y += Math.sin(x * 0.008 + 1.2) * Math.cos(z * 0.007) * 42;
    }

    // Coastal hills
    y += Math.sin(x * 0.004) * Math.cos(z * 0.004) * 24;
    y += Math.sin(x * 0.012) * Math.cos(z * 0.011) * 7.5;

    // Keep ocean side low
    if (x < -220) {
      y = Math.min(-2.5, y * 0.15 - 2.8);
    }

    return y;
  }

  public getNormalAt(x: number, z: number): Vector3 {
    const eps = 0.5;
    const hL = this.getElevationAt(x - eps, z);
    const hR = this.getElevationAt(x + eps, z);
    const hD = this.getElevationAt(x, z - eps);
    const hU = this.getElevationAt(x, z + eps);

    const normal = new Vector3(hL - hR, 2 * eps, hD - hU);
    return normal.normalize();
  }

  public getSurfaceContact(pos: Vector3, road: Road): SurfaceContactInfo {
    if (this.director) {
      return this.director.querySurface(pos);
    }

    const roadPoint = road.getClosestPoint(pos);
    const distToCenter = roadPoint.distanceToCenter;
    const halfWidth = road.width * 0.5; // ~4.5m
    const shoulderWidth = 2.0;

    // Out-of-bounds nether limbo elimination check
    const isOutOfBounds =
      pos.x < WORLD_BOUNDS.minX ||
      pos.x > WORLD_BOUNDS.maxX ||
      pos.z < WORLD_BOUNDS.minZ ||
      pos.z > WORLD_BOUNDS.maxZ ||
      distToCenter > WORLD_BOUNDS.maxAllowedRoadDistance;

    if (isOutOfBounds) {
      return {
        elevation: roadPoint.position.y,
        normal: roadPoint.normal,
        surfaceType: 'out_of_bounds',
        frictionMultiplier: 0.1,
        dragMultiplier: 10.0,
        pitch: roadPoint.pitch,
      };
    }

    const terrainHeight = this.getElevationAt(pos.x, pos.z);
    const terrainNormal = this.getNormalAt(pos.x, pos.z);

    // Water Check
    if (pos.y <= this.oceanElevation + 0.3 || terrainHeight <= this.oceanElevation) {
      return {
        elevation: this.oceanElevation,
        normal: Vector3.Up(),
        surfaceType: 'water',
        frictionMultiplier: 0.1,
        dragMultiplier: 6.0, // Severe water resistance
        pitch: 0,
      };
    }

    // On Asphalt Road
    if (distToCenter <= halfWidth) {
      return {
        elevation: roadPoint.position.y,
        normal: roadPoint.normal,
        surfaceType: 'asphalt',
        frictionMultiplier: 1.0,
        dragMultiplier: 1.0,
        pitch: roadPoint.pitch,
      };
    }

    // On Shoulder Transition
    if (distToCenter <= halfWidth + shoulderWidth) {
      const t = (distToCenter - halfWidth) / shoulderWidth; // 0 to 1
      const blendedElevation = roadPoint.position.y * (1.0 - t) + terrainHeight * t;
      const blendedNormal = Vector3.Lerp(roadPoint.normal, terrainNormal, t).normalize();

      return {
        elevation: blendedElevation,
        normal: blendedNormal,
        surfaceType: 'shoulder',
        frictionMultiplier: 0.75 - t * 0.25,
        dragMultiplier: 1.0 + t * 0.8,
        pitch: roadPoint.pitch * (1.0 - t),
      };
    }

    // Off-road Terrain
    // Terrain pitch along tangent
    const tangent = roadPoint.tangent;
    const pitch = Math.atan2(tangent.y, Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z));

    return {
      elevation: terrainHeight,
      normal: terrainNormal,
      surfaceType: 'offroad',
      frictionMultiplier: 0.45,
      dragMultiplier: 2.2, // Off-road resistance
      pitch,
    };
  }

  private createTerrainMesh(): void {
    const size = 3200;
    const subdivisions = 128;

    this.terrainMesh = MeshBuilder.CreateGround(
      'coastal_terrain',
      {
        width: size,
        height: size,
        subdivisions,
        updatable: true,
      },
      this.scene
    );

    this.terrainMesh.position.set(500, 0, -200);

    const positions = this.terrainMesh.getVerticesData('position');
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i] + this.terrainMesh.position.x;
        const z = positions[i + 2] + this.terrainMesh.position.z;
        positions[i + 1] = this.getElevationAt(x, z);
      }

      this.terrainMesh.setVerticesData('position', positions);
      this.terrainMesh.createNormals(false);
    }

    // Layered PBR Terrain Material
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    const terrainMat = new PBRMaterial('terrain_pbr_mat', this.scene);
    terrainMat.albedoColor = new Color3(0.38, 0.46, 0.32); // Deep coastal grass/earth
    terrainMat.metallic = 0.0;
    terrainMat.roughness = 0.92;

    try {
      const diffTex = new Texture(baseUrl + 'assets/terrain/grass_diff.jpg', this.scene);
      diffTex.uScale = 45.0;
      diffTex.vScale = 45.0;
      terrainMat.albedoTexture = diffTex;

      const normTex = new Texture(baseUrl + 'assets/terrain/grass_nor.jpg', this.scene);
      normTex.uScale = 45.0;
      normTex.vScale = 45.0;
      terrainMat.bumpTexture = normTex;
    } catch (e) {
      console.warn('Terrain texture fallback:', e);
    }

    this.terrainMesh.material = terrainMat;
    this.terrainMesh.receiveShadows = true;
  }
}
