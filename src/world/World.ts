import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { GraphicsSettings } from '../config/graphics';
import { Road } from './Road';
import { Terrain } from './Terrain';
import { Environment } from './Environment';
import { WorldDirector } from './WorldDirector';

export class World {
  public road: Road;
  public terrain: Terrain;
  public environment: Environment;
  public director: WorldDirector;

  constructor(private scene: Scene, graphics: GraphicsSettings) {
    this.road = new Road(this.scene);
    this.director = new WorldDirector(this.scene);
    this.terrain = new Terrain(this.scene, this.director);
    this.environment = new Environment(this.scene, this.road, graphics);
  }

  public update(playerPos: Vector3, dt: number): void {
    this.director.update(playerPos, dt);
  }

  public setVisible(visible: boolean): void {
    if (this.road.roadMesh) this.road.roadMesh.setEnabled(visible);
    if (this.terrain.terrainMesh) this.terrain.terrainMesh.setEnabled(visible);
    this.environment.setVisible(visible);
    this.director.setVisible(visible);
  }

  public dispose(): void {
    this.director.dispose();
  }
}
