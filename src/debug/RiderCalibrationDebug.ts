import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { BikeController } from '../bikes/BikeController';

export class RiderCalibrationDebug {
  private markers: Map<string, Mesh> = new Map();
  private isVisible: boolean = false;
  private rootMesh: Mesh;

  constructor(private scene: Scene) {
    this.rootMesh = new Mesh('rider_debug_root', this.scene);
    this.rootMesh.setEnabled(false);
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.rootMesh.setEnabled(this.isVisible);
  }

  public update(bike: BikeController): void {
    if (!this.isVisible || !bike.rider) return;

    const rider = bike.rider;
    const rig = rider.rig;
    const targets = rider.bikeTargets;

    // 1. Anchors
    if (targets) {
      this.updateMarker('seat_anchor', targets.seatAnchor.getAbsolutePosition(), Color3.Magenta(), 0.06);
      this.updateMarker('left_grip_anchor', targets.leftGripAnchor.getAbsolutePosition(), Color3.Teal(), 0.05);
      this.updateMarker('right_grip_anchor', targets.rightGripAnchor.getAbsolutePosition(), Color3.Teal(), 0.05);
      this.updateMarker('left_rearset_anchor', targets.leftRearsetAnchor.getAbsolutePosition(), new Color3(1, 0.5, 0), 0.05);
      this.updateMarker('right_rearset_anchor', targets.rightRearsetAnchor.getAbsolutePosition(), new Color3(1, 0.5, 0), 0.05);
    }

    // 2. Rider Bones
    if (rig.hips) {
      this.updateMarker('rider_hips', rig.getBoneWorldPosition(rig.hips), Color3.Red(), 0.07);
    }
    if (rig.leftHand) {
      this.updateMarker('rider_lhand', rig.getBoneWorldPosition(rig.leftHand), Color3.Yellow(), 0.04);
    }
    if (rig.rightHand) {
      this.updateMarker('rider_rhand', rig.getBoneWorldPosition(rig.rightHand), Color3.Yellow(), 0.04);
    }
    if (rig.leftFoot) {
      this.updateMarker('rider_lfoot', rig.getBoneWorldPosition(rig.leftFoot), Color3.Green(), 0.04);
    }
    if (rig.rightFoot) {
      this.updateMarker('rider_rfoot', rig.getBoneWorldPosition(rig.rightFoot), Color3.Green(), 0.04);
    }
    if (rig.head) {
      this.updateMarker('rider_head', rig.getBoneWorldPosition(rig.head), Color3.White(), 0.08);
    }
  }

  private updateMarker(id: string, pos: Vector3, color: Color3, size: number): void {
    let mesh = this.markers.get(id);
    if (!mesh) {
      mesh = MeshBuilder.CreateSphere(id, { diameter: size }, this.scene);
      mesh.parent = this.rootMesh;
      const mat = new StandardMaterial(`mat_${id}`, this.scene);
      mat.diffuseColor = color;
      mat.emissiveColor = color.scale(0.8);
      mesh.material = mat;
      this.markers.set(id, mesh);
    }
    mesh.position.copyFrom(pos);
  }

  public dispose(): void {
    this.rootMesh.dispose();
  }
}
