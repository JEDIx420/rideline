import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { WorldSurfaceQuery } from './WorldSurfaceQuery';
import { RoadDirector } from './RoadDirector';
import { RoadChunkManager } from './RoadChunkManager';
import { TerrainChunkManager } from './TerrainChunkManager';
import { BiomeDirector } from './BiomeDirector';
import { ScenerySpawner } from './ScenerySpawner';
import { AtmosphereDirector } from './AtmosphereDirector';

export class WorldDirector {
  public roadDirector: RoadDirector;
  public roadChunkManager: RoadChunkManager;
  public terrainChunkManager: TerrainChunkManager;
  public biomeDirector: BiomeDirector;
  public scenerySpawner: ScenerySpawner;
  public atmosphereDirector: AtmosphereDirector;

  public static readonly MAX_ALLOWED_ROAD_DISTANCE: number = 65.0; // 65m boundary before safe recovery

  constructor(private scene: Scene) {
    this.roadDirector = new RoadDirector(1337);
    this.roadChunkManager = new RoadChunkManager(this.scene, this.roadDirector);
    this.terrainChunkManager = new TerrainChunkManager(this.scene, this.roadDirector);
    this.biomeDirector = new BiomeDirector();
    this.scenerySpawner = new ScenerySpawner(this.scene, this.roadDirector, this.terrainChunkManager);
    this.atmosphereDirector = new AtmosphereDirector(this.scene);

    // Initial streaming around origin
    this.update(new Vector3(0, 0, 0), 1 / 60);
  }

  /**
   * Main frame update: streams road chunks ahead, streams terrain, updates biomes & lighting.
   */
  public update(playerPos: Vector3, dt: number): void {
    const roadPt = this.roadDirector.getClosestPoint(playerPos);

    // 1. Extend road planning and stream road ribbon chunks
    this.roadDirector.updatePlayerProgress(roadPt.distanceAlongRoad);
    this.roadChunkManager.update(roadPt.distanceAlongRoad);

    // 2. Stream terrain chunks around player
    this.terrainChunkManager.update(playerPos);

    // 3. Biome transitions and dynamic lighting/fog
    this.biomeDirector.update(roadPt.distanceAlongRoad);
    this.atmosphereDirector.applyBiome(this.biomeDirector.currentBiome, dt);
  }

  /**
   * Evaluates the WorldSurfaceQuery contract at any arbitrary world coordinate.
   * Eliminates floating roads and nether limbo unconditionally.
   */
  public querySurface(pos: Vector3): WorldSurfaceQuery {
    const roadPt = this.roadDirector.getClosestPoint(pos);
    const distToCenter = roadPt.distanceToCenter;

    const halfRoadWidth = this.roadChunkManager.roadWidth * 0.5; // ~4.6m
    const shoulderWidth = this.roadChunkManager.shoulderWidth;   // ~2.2m

    // Safe recovery point: placed in the center of the nearest asphalt road lane
    const safeRecoveryPoint = roadPt.position.clone();

    // 1. Out-of-Bounds Boundary Guard (Eliminates Nether Limbo)
    if (distToCenter > WorldDirector.MAX_ALLOWED_ROAD_DISTANCE) {
      return {
        elevation: roadPt.position.y,
        normal: roadPt.normal,
        surfaceType: 'out_of_bounds',
        frictionMultiplier: 0.1,
        dragMultiplier: 10.0,
        pitch: roadPt.pitch,
        roadTangent: roadPt.tangent,
        roadDistance: roadPt.distanceAlongRoad,
        camberAngleRad: roadPt.camberAngleRad,
        recoveryPoint: safeRecoveryPoint,
      };
    }

    const terrainHeight = this.terrainChunkManager.getElevationAt(pos.x, pos.z);
    const terrainNormal = this.terrainChunkManager.getNormalAt(pos.x, pos.z);

    // 2. Water Submersion Check
    if (pos.y <= this.terrainChunkManager.oceanElevation + 0.3 || terrainHeight <= this.terrainChunkManager.oceanElevation) {
      return {
        elevation: this.terrainChunkManager.oceanElevation,
        normal: Vector3.Up(),
        surfaceType: 'water',
        frictionMultiplier: 0.1,
        dragMultiplier: 6.0,
        pitch: 0,
        roadTangent: roadPt.tangent,
        roadDistance: roadPt.distanceAlongRoad,
        camberAngleRad: 0,
        recoveryPoint: safeRecoveryPoint,
      };
    }

    // 3. Asphalt Road Surface
    if (distToCenter <= halfRoadWidth) {
      return {
        elevation: roadPt.position.y,
        normal: roadPt.normal,
        surfaceType: 'asphalt',
        frictionMultiplier: 1.0,
        dragMultiplier: 1.0,
        pitch: roadPt.pitch,
        roadTangent: roadPt.tangent,
        roadDistance: roadPt.distanceAlongRoad,
        camberAngleRad: roadPt.camberAngleRad,
        recoveryPoint: safeRecoveryPoint,
      };
    }

    // 4. Road Shoulder Transition Zone
    if (distToCenter <= halfRoadWidth + shoulderWidth) {
      const t = (distToCenter - halfRoadWidth) / shoulderWidth; // 0 to 1
      const blendedElevation = roadPt.position.y * (1.0 - t) + terrainHeight * t;
      const blendedNormal = Vector3.Lerp(roadPt.normal, terrainNormal, t).normalize();

      return {
        elevation: blendedElevation,
        normal: blendedNormal,
        surfaceType: 'shoulder',
        frictionMultiplier: 0.75 - t * 0.25,
        dragMultiplier: 1.0 + t * 0.8,
        pitch: roadPt.pitch * (1.0 - t),
        roadTangent: roadPt.tangent,
        roadDistance: roadPt.distanceAlongRoad,
        camberAngleRad: roadPt.camberAngleRad * (1.0 - t),
        recoveryPoint: safeRecoveryPoint,
      };
    }

    // 5. Offroad Terrain
    const tangent = roadPt.tangent;
    const offroadPitch = Math.atan2(tangent.y, Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z));

    return {
      elevation: terrainHeight,
      normal: terrainNormal,
      surfaceType: 'offroad',
      frictionMultiplier: 0.45,
      dragMultiplier: 2.2,
      pitch: offroadPitch,
      roadTangent: roadPt.tangent,
      roadDistance: roadPt.distanceAlongRoad,
      camberAngleRad: 0,
      recoveryPoint: safeRecoveryPoint,
    };
  }

  public setVisible(visible: boolean): void {
    this.roadChunkManager.setVisible(visible);
    this.terrainChunkManager.setVisible(visible);
    this.scenerySpawner.setVisible(visible);
    this.atmosphereDirector.setVisible(visible);
  }

  public dispose(): void {
    this.roadChunkManager.dispose();
    this.terrainChunkManager.dispose();
    this.scenerySpawner.dispose();
  }
}
