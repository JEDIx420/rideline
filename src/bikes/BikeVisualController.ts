import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { BikeDefinition } from './BikeDefinition';
import { BikePhysics } from './BikePhysics';

interface BoundNodeInfo {
  node: TransformNode;
  initialRotation: Quaternion;
}

export class BikeVisualController {
  private frontWheelNodes: BoundNodeInfo[] = [];
  private rearWheelNodes: BoundNodeInfo[] = [];
  private steeringNodes: BoundNodeInfo[] = [];
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

    const captureNode = (name: string, list: BoundNodeInfo[]) => {
      const node = allNodes.get(name);
      if (!node) return;
      if (list.some((item) => item.node === node)) return;

      let initRot = node.rotationQuaternion
        ? node.rotationQuaternion.clone()
        : Quaternion.RotationYawPitchRoll(node.rotation.y, node.rotation.x, node.rotation.z);

      if (!node.rotationQuaternion) {
        node.rotationQuaternion = initRot.clone();
      }

      list.push({ node, initialRotation: initRot });
    };

    // Front Wheel nodes
    captureNode(nodeMapping.frontWheelNodeName, this.frontWheelNodes);
    if (nodeMapping.frontWheelSubNodeNames) {
      for (const name of nodeMapping.frontWheelSubNodeNames) {
        captureNode(name, this.frontWheelNodes);
      }
    }

    // Rear Wheel nodes
    captureNode(nodeMapping.rearWheelNodeName, this.rearWheelNodes);
    if (nodeMapping.rearWheelSubNodeNames) {
      for (const name of nodeMapping.rearWheelSubNodeNames) {
        captureNode(name, this.rearWheelNodes);
      }
    }

    // Steering / Fork / Handlebar nodes
    if (nodeMapping.frontForkNodeName) {
      captureNode(nodeMapping.frontForkNodeName, this.steeringNodes);
    }
    if (nodeMapping.frontForkSubNodeNames) {
      for (const name of nodeMapping.frontForkSubNodeNames) {
        captureNode(name, this.steeringNodes);
      }
    }
    if (nodeMapping.handlebarsNodeName) {
      captureNode(nodeMapping.handlebarsNodeName, this.steeringNodes);
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

    const wheelRotDelta = Quaternion.RotationAxis(Vector3.Right(), this.wheelRotationRad);

    // Apply transform-safe rotation relative to initial authored transforms
    for (const info of this.frontWheelNodes) {
      info.initialRotation.multiplyToRef(wheelRotDelta, info.node.rotationQuaternion!);
    }
    for (const info of this.rearWheelNodes) {
      info.initialRotation.multiplyToRef(wheelRotDelta, info.node.rotationQuaternion!);
    }

    // 3. Front Fork / Handlebar Steering Rotation around steering head axis
    const steerRotDelta = Quaternion.RotationAxis(Vector3.Up(), physics.steerAngleRad);
    for (const info of this.steeringNodes) {
      info.initialRotation.multiplyToRef(steerRotDelta, info.node.rotationQuaternion!);
    }
  }

  public getRootNode(): TransformNode | null {
    return this.rootTransformNode;
  }
}
