import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RiderMeshBuilder, RiderRigNodes } from './RiderMeshBuilder';
import { RiderPoseController } from './RiderPoseController';
import { RiderAttachmentAnchors, S1000RR_RIDER_ANCHORS, DEFAULT_RIDER_SUIT, RiderSuitConfig } from './RiderDefinition';
import { BikeController } from '../bikes/BikeController';

export class RiderController {
  public rootNode: TransformNode;
  public rig: RiderRigNodes;
  private poseController: RiderPoseController;
  private anchors: RiderAttachmentAnchors = S1000RR_RIDER_ANCHORS;

  constructor(
    private scene: Scene,
    suitConfig: RiderSuitConfig = DEFAULT_RIDER_SUIT,
    shadowGenerator?: ShadowGenerator | null
  ) {
    const { root, rig } = RiderMeshBuilder.createRider(this.scene, suitConfig, shadowGenerator);
    this.rootNode = root;
    this.rig = rig;
    this.poseController = new RiderPoseController();
  }

  public attachToBike(_bike: BikeController, bikeRootNode: TransformNode): void {
    this.rootNode.parent = bikeRootNode;
    // Set base saddle position
    this.rootNode.position.copyFrom(this.anchors.seatPosition);
    this.rootNode.rotation.set(0, 0, 0);
  }

  public setAttachmentAnchors(anchors: RiderAttachmentAnchors): void {
    this.anchors = anchors;
    this.rootNode.position.copyFrom(this.anchors.seatPosition);
  }

  public update(dt: number, bike: BikeController): void {
    this.poseController.update(dt, bike, this.rig);
  }

  public getHelmetEyeWorldPosition(): Vector3 {
    const headPos = this.rig.head.getAbsolutePosition();
    const headRot = this.rig.head.absoluteRotationQuaternion || Quaternion.Identity();

    // Eye offset forward & slightly up from head center
    const eyeLocal = this.anchors.helmetEyeOffset;
    const eyeRotated = eyeLocal.applyRotationQuaternion(headRot);
    return headPos.add(eyeRotated);
  }

  public setFirstPerson(isFirstPerson: boolean): void {
    if (this.rig.headMeshes) {
      for (const m of this.rig.headMeshes) {
        m.setEnabled(!isFirstPerson);
      }
    }
    if (this.rig.torsoMeshes) {
      for (const m of this.rig.torsoMeshes) {
        m.setEnabled(!isFirstPerson);
      }
    }
  }

  public setVisible(visible: boolean): void {
    this.rootNode.setEnabled(visible);
  }

  public dispose(): void {
    this.rootNode.dispose(false, true);
  }
}
