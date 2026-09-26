import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GraphicsSettings } from '../config/graphics';
import { Road } from './Road';
import { Terrain } from './Terrain';
import { Environment } from './Environment';
import { WorldDirector } from './WorldDirector';
import { WorldSurfaceQuery, WorldSurfaceQueryProvider, RoadProgressHint } from './WorldSurfaceQuery';

export type WorldMode = 'legacy' | 'streamed';

export class World implements WorldSurfaceQueryProvider {
  public road: Road;
  public terrain: Terrain;
  public environment: Environment;
  public director: WorldDirector;
  public worldMode: WorldMode = 'streamed';

  constructor(private scene: Scene, graphics: GraphicsSettings) {
    this.director = new WorldDirector(this.scene);
    this.road = new Road(this.scene);
    this.terrain = new Terrain(this.scene, this.director);
    this.environment = new Environment(this.scene, this.road, graphics);

    // In streamed mode, permanently hide legacy meshes
    if (this.worldMode === 'streamed') {
      if (this.road.roadMesh) this.road.roadMesh.setEnabled(false);
      if (this.road.shoulderMesh) this.road.shoulderMesh.setEnabled(false);
      if (this.terrain.terrainMesh) this.terrain.terrainMesh.setEnabled(false);
      this.environment.setVisible(false);
    }
  }

  public update(playerPos: Vector3, dt: number): void {
    if (this.worldMode === 'streamed') {
      this.director.update(playerPos, dt);
    }
  }

  public sampleSurface(pos: Vector3, hint?: RoadProgressHint): WorldSurfaceQuery {
    if (this.worldMode === 'streamed') {
      return this.director.sampleSurface(pos, hint);
    }
    const surfaceContact = this.terrain.getSurfaceContact(pos, this.road);
    const roadPt = this.road.getClosestPoint(pos);
    return {
      elevation: surfaceContact.elevation,
      normal: surfaceContact.normal,
      surfaceType: surfaceContact.surfaceType,
      frictionMultiplier: surfaceContact.frictionMultiplier,
      dragMultiplier: surfaceContact.dragMultiplier,
      pitch: surfaceContact.pitch,
      roadTangent: roadPt.tangent,
      roadDistance: 0,
      camberAngleRad: 0,
      recoveryPoint: roadPt.position.clone(),
      roadSampleIndex: 0,
      distanceToCenter: roadPt.distanceToCenter,
      lateralOffset: 0,
    };
  }

  public getSpawnTransform(): { position: Vector3; headingRad: number; normal: Vector3 } {
    if (this.worldMode === 'streamed') {
      return this.director.getSpawnTransform();
    }
    const legacySpawn = this.road.getSpawnTransform();
    return { position: legacySpawn.position, headingRad: legacySpawn.headingRad, normal: Vector3.Up() };
  }

  public getLookAheadTangent(distanceAlongRoad: number, lookAheadMeters: number): Vector3 {
    if (this.worldMode === 'streamed') {
      return this.director.getLookAheadTangent(distanceAlongRoad, lookAheadMeters);
    }
    return new Vector3(0, 0, -1);
  }

  public setVisible(visible: boolean): void {
    if (this.worldMode === 'legacy') {
      if (this.road.roadMesh) this.road.roadMesh.setEnabled(visible);
      if (this.road.shoulderMesh) this.road.shoulderMesh.setEnabled(visible);
      if (this.terrain.terrainMesh) this.terrain.terrainMesh.setEnabled(visible);
      this.environment.setVisible(visible);
      this.director.setVisible(false);
    } else {
      // In streamed mode, legacy meshes are strictly disabled
      if (this.road.roadMesh) this.road.roadMesh.setEnabled(false);
      if (this.road.shoulderMesh) this.road.shoulderMesh.setEnabled(false);
      if (this.terrain.terrainMesh) this.terrain.terrainMesh.setEnabled(false);
      this.environment.setVisible(false);
      this.director.setVisible(visible);
    }
  }

  public dispose(): void {
    this.director.dispose();
  }
}

