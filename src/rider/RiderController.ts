import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RiderLoader } from './RiderLoader';
import { RiderRig } from './RiderRig';
import { RiderPoseController } from './RiderPoseController';
import { CANONICAL_RIDER_DEFINITION } from './RiderDefinition';
import { RiderBikeProfile, getRiderBikeProfile } from './RiderBikeProfile';
import { RiderIK } from './RiderIK';
import { BikeController } from '../bikes/BikeController';

export class RiderController {
  public rootNode: TransformNode;
  public rig: RiderRig;
  public profile: RiderBikeProfile;
  public poseController: RiderPoseController;

  public static async create(
    scene: Scene,
    bikeId: string,
    shadowGenerator?: ShadowGenerator | null,
    onProgress?: (pct: number) => void
  ): Promise<RiderController> {
    const loaded = await RiderLoader.loadRider(
      CANONICAL_RIDER_DEFINITION,
      scene,
      shadowGenerator,
      onProgress
    );
    const profile = getRiderBikeProfile(bikeId);
    return new RiderController(loaded.rootNode, loaded.rig, profile);
  }

  constructor(
    rootNode: TransformNode,
    rig: RiderRig,
    profile: RiderBikeProfile
  ) {
    this.rootNode = rootNode;
    this.rig = rig;
    this.profile = profile;
    this.poseController = new RiderPoseController();
  }

  public bikeTargets: {
    seatAnchor: TransformNode;
    leftGripAnchor: TransformNode;
    rightGripAnchor: TransformNode;
    leftRearsetAnchor: TransformNode;
    rightRearsetAnchor: TransformNode;
  } | null = null;
  public baseMountPosition: Vector3 = new Vector3(0, 0, 0);

  public attachToBike(
    bikePhysicsRoot: TransformNode,
    riderTargets?: {
      seatAnchor: TransformNode;
      leftGripAnchor: TransformNode;
      rightGripAnchor: TransformNode;
      leftRearsetAnchor: TransformNode;
      rightRearsetAnchor: TransformNode;
    } | null
  ): void {
    this.rootNode.parent = bikePhysicsRoot;
    this.bikeTargets = riderTargets || null;
    this.recomputeMountPosition();
  }

  public recomputeMountPosition(): void {
    // Rider Hips bind local position relative to RiderAssetRoot
    // Since RiderAssetRoot has 180° yaw rotation:
    // (x, y, z) in RiderAssetRoot becomes (-x, y, -z) in RiderMountRoot
    const hipsLocalInMount = new Vector3(
      -this.rig.hipsBindLocalPosition.x,
      this.rig.hipsBindLocalPosition.y,
      -this.rig.hipsBindLocalPosition.z
    );

    const seatPos = this.bikeTargets
      ? this.bikeTargets.seatAnchor.position
      : this.profile.seatOffset;

    // riderMountPosition = seatAnchor - transformedAndScaled(hipsBindLocalPosition)
    this.baseMountPosition = seatPos.subtract(hipsLocalInMount);
    this.rootNode.position.copyFrom(this.baseMountPosition);
    this.rootNode.rotation.set(0, 0, 0);
  }

  public setProfile(profile: RiderBikeProfile): void {
    this.profile = profile;
    this.recomputeMountPosition();
  }

  public update(dt: number, bike: BikeController): void {
    // 1. Procedural posture & spine kinematics
    this.poseController.update(dt, bike, this.profile, this.rig);

    // 2. Dynamic Pelvis offset on seat (tuck shift + lean shift)
    this.rootNode.position.set(
      this.baseMountPosition.x + this.poseController.currentPelvisOffset.x,
      this.baseMountPosition.y + this.poseController.currentPelvisOffset.y,
      this.baseMountPosition.z + this.poseController.currentPelvisOffset.z
    );

    // 3. Solve limb IK every frame after motorcycle targets have updated
    const steerAngleRad = bike.physics.steerAngleRad;
    const targets = this.bikeTargets || (bike.loadedBike ? bike.loadedBike.riderTargets : null);
    RiderIK.applyLimbIK(this.rig, this.profile, steerAngleRad, targets);
  }

  public getHelmetEyeWorldPosition(): Vector3 {
    if (this.rig.head) {
      const headPos = this.rig.getBoneWorldPosition(this.rig.head);
      const bikeRoot = this.rootNode.parent as TransformNode;
      if (bikeRoot) {
        // Compute forward and up vector from bike matrix or absolute rotation
        const rot = bikeRoot.absoluteRotationQuaternion || Quaternion.Identity();
        const offset = this.profile.headCameraOffset;
        const worldOffset = offset.applyRotationQuaternion(rot);
        return headPos.add(worldOffset);
      }
      return headPos.add(this.profile.headCameraOffset);
    }
    return this.rootNode.getAbsolutePosition().add(new Vector3(0, 0.6, -0.2));
  }

  public setFirstPerson(isFirstPerson: boolean): void {
    this.rig.setFirstPersonMode(isFirstPerson);
  }

  public setVisible(visible: boolean): void {
    this.rig.setVisible(visible);
  }

  public dispose(): void {
    this.rig.dispose();
  }
}
