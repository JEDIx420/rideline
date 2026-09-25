import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BikeDefinition } from './BikeDefinition';
import { BikePhysics } from './BikePhysics';

export class BikeVisualController {
  private frontWheelNodes: TransformNode[] = [];
  private rearWheelNodes: TransformNode[] = [];
  private steeringNodes: TransformNode[] = [];
  private rootTransformNode: TransformNode | null = null;

  private wheelRotationRad: number = 0;

  constructor(private definition: BikeDefinition) {}

  public bindNodes(
    rootNode: TransformNode,
    allNodes: Map<string, TransformNode>
  ): void {
    this.rootTransformNode = rootNode;
    this.frontWheelNodes = [];
    this.rearWheelNodes = [];
    this.steeringNodes = [];

    const { nodeMapping } = this.definition;

    // Find Front Wheel nodes
    const fw = allNodes.get(nodeMapping.frontWheelNodeName);
    if (fw) this.frontWheelNodes.push(fw);
    if (nodeMapping.frontWheelSubNodeNames) {
      for (const name of nodeMapping.frontWheelSubNodeNames) {
        const sub = allNodes.get(name);
        if (sub && !this.frontWheelNodes.includes(sub)) this.frontWheelNodes.push(sub);
      }
    }

    // Find Rear Wheel nodes
    const rw = allNodes.get(nodeMapping.rearWheelNodeName);
    if (rw) this.rearWheelNodes.push(rw);
    if (nodeMapping.rearWheelSubNodeNames) {
      for (const name of nodeMapping.rearWheelSubNodeNames) {
        const sub = allNodes.get(name);
        if (sub && !this.rearWheelNodes.includes(sub)) this.rearWheelNodes.push(sub);
      }
    }

    // Find Steering / Fork / Handlebar nodes
    if (nodeMapping.frontForkNodeName) {
      const fork = allNodes.get(nodeMapping.frontForkNodeName);
      if (fork) this.steeringNodes.push(fork);
    }
    if (nodeMapping.handlebarsNodeName) {
      const bars = allNodes.get(nodeMapping.handlebarsNodeName);
      if (bars && !this.steeringNodes.includes(bars)) this.steeringNodes.push(bars);
    }
  }

  public update(dt: number, physics: BikePhysics): void {
    if (!this.rootTransformNode) return;

    // 1. Root Position & Orientation
    this.rootTransformNode.position.copyFrom(physics.position);
    this.rootTransformNode.rotationQuaternion = physics.getRotationQuaternion();

    // 2. Continuous Wheel Rotation based on physical road speed (v = omega * r)
    const wheelRadius = this.definition.physics.wheelRadiusMeters;
    const deltaWheelAngle = (physics.speedMps / wheelRadius) * dt;
    this.wheelRotationRad += deltaWheelAngle;

    // Rotate front and rear wheels around their local pitch/axle axis (X axis in model local space)
    for (const node of this.frontWheelNodes) {
      node.rotation = new Vector3(this.wheelRotationRad, 0, 0);
    }
    for (const node of this.rearWheelNodes) {
      node.rotation = new Vector3(this.wheelRotationRad, 0, 0);
    }

    // 3. Front Fork / Handlebar Steering Rotation around steering head axis
    for (const node of this.steeringNodes) {
      node.rotation = new Vector3(0, physics.steerAngleRad, 0);
    }
  }

  public getRootNode(): TransformNode | null {
    return this.rootTransformNode;
  }
}
