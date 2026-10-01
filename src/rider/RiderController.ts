import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RiderLoader } from './RiderLoader';
import { RiderRig } from './RiderRig';
import { RiderPoseController } from './RiderPoseController';
import { RiderPoseGraph } from './RiderPoseGraph';
import { CANONICAL_RIDER_DEFINITION } from './RiderDefinition';
import { RiderBikeProfile, getRiderBikeProfile } from './RiderBikeProfile';
import { BikeController } from '../bikes/BikeController';
import { WorldSurfaceQueryProvider } from '../world/WorldSurfaceQuery';

export class RiderController {
  public rootNode: TransformNode;
  public rig: RiderRig;
  public profile: RiderBikeProfile;
  public poseController: RiderPoseController;
  public poseGraph: RiderPoseGraph;

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
    this.poseGraph = new RiderPoseGraph();
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

  public update(dt: number, bike: BikeController, surfaceProvider?: WorldSurfaceQueryProvider): void {
    // 1. Procedural posture & spine kinematics with road look-ahead
    let lookAheadTangent: Vector3 | undefined = undefined;
    if (surfaceProvider?.getLookAheadTangent && bike.physics.surfaceContact) {
      lookAheadTangent = surfaceProvider.getLookAheadTangent(
        bike.physics.surfaceContact.roadDistance,
        30.0
      );
    }

    const targets = this.bikeTargets || (bike.loadedBike ? bike.loadedBike.riderTargets : null);

    // 2. Evaluate modular 5-layer RiderPoseGraph
    this.poseGraph.evaluate(dt, bike, this.profile, this.rig, targets, lookAheadTangent);

    // Sync poseController for backward compatibility
    this.poseController.currentSpinePitch = this.poseGraph.state.spinePitch;
    this.poseController.currentSpineRoll = this.poseGraph.state.spineRoll;
    this.poseController.currentSpineYaw = this.poseGraph.state.spineYaw;
    this.poseController.currentHeadPitch = this.poseGraph.state.headPitch;
    this.poseController.currentHeadYaw = this.poseGraph.state.headYaw;
    this.poseController.currentHeadRoll = this.poseGraph.state.headRoll;
    this.poseController.currentPelvisOffset.copyFrom(this.poseGraph.state.pelvisOffset);
    this.poseController.currentTuckFactor = this.poseGraph.state.tuckFactor;

    // 3. Dynamic Pelvis offset on seat (tuck shift + lean shift)
    this.rootNode.position.set(
      this.baseMountPosition.x + this.poseGraph.state.pelvisOffset.x,
      this.baseMountPosition.y + this.poseGraph.state.pelvisOffset.y,
      this.baseMountPosition.z + this.poseGraph.state.pelvisOffset.z
    );
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
