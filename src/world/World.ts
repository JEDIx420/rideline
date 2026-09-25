import { Scene } from '@babylonjs/core/scene';
import { GraphicsSettings } from '../config/graphics';
import { Road } from './Road';
import { Terrain } from './Terrain';
import { Environment } from './Environment';

export class World {
  public road: Road;
  public terrain: Terrain;
  public environment: Environment;

  constructor(private scene: Scene, graphics: GraphicsSettings) {
    this.road = new Road(this.scene);
    this.terrain = new Terrain(this.scene);
    this.environment = new Environment(this.scene, this.road, graphics);
  }
}
