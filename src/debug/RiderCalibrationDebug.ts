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
  private overlayElem: HTMLDivElement | null = null;

  constructor(private scene: Scene) {
    this.rootMesh = new Mesh('rider_debug_root', this.scene);
    this.rootMesh.setEnabled(false);
    this.setupOverlay();
  }

  private setupOverlay(): void {
    let elem = document.getElementById('rider-calibration-overlay') as HTMLDivElement;
    if (!elem) {
      elem = document.createElement('div');
      elem.id = 'rider-calibration-overlay';
      elem.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: rgba(12, 14, 20, 0.88);
        border: 1px solid rgba(0, 240, 255, 0.4);
        border-radius: 8px;
        padding: 12px 16px;
        color: #e0e8f0;
        font-family: monospace;
        font-size: 13px;
        line-height: 1.5;
        z-index: 9999;
        pointer-events: none;
        backdrop-filter: blur(8px);
        display: none;
      `;
      document.body.appendChild(elem);
    }
    this.overlayElem = elem;
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.rootMesh.setEnabled(this.isVisible);
    if (this.overlayElem) {
      this.overlayElem.style.display = this.isVisible ? 'block' : 'none';
    }
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

    // 3. Live Numerical Error Calculation & HUD Overlay
    if (this.overlayElem && targets) {
      const dist = (a: Vector3, b: Vector3) => Vector3.Distance(a, b) * 100;
      const lhErr = rig.leftHand ? dist(rig.getBoneWorldPosition(rig.leftHand), targets.leftGripAnchor.getAbsolutePosition()) : 0;
      const rhErr = rig.rightHand ? dist(rig.getBoneWorldPosition(rig.rightHand), targets.rightGripAnchor.getAbsolutePosition()) : 0;
      const lfErr = rig.leftFoot ? dist(rig.getBoneWorldPosition(rig.leftFoot), targets.leftRearsetAnchor.getAbsolutePosition()) : 0;
      const rfErr = rig.rightFoot ? dist(rig.getBoneWorldPosition(rig.rightFoot), targets.rightRearsetAnchor.getAbsolutePosition()) : 0;
      const hipsErr = rig.hips ? dist(rig.getBoneWorldPosition(rig.hips), targets.seatAnchor.getAbsolutePosition()) : 0;
      const maxErr = Math.max(lhErr, rhErr, lfErr, rfErr, hipsErr);

      this.overlayElem.innerHTML = `
        <div style="font-weight: bold; color: #00f0ff; margin-bottom: 6px; letter-spacing: 1px;">RIDER IK PRECISION</div>
        <div>LH Grip Err: <span style="color: ${lhErr < 2.0 ? '#00ff88' : '#ff4444'}">${lhErr.toFixed(2)} cm</span></div>
        <div>RH Grip Err: <span style="color: ${rhErr < 2.0 ? '#00ff88' : '#ff4444'}">${rhErr.toFixed(2)} cm</span></div>
        <div>LF Peg Err:  <span style="color: ${lfErr < 2.0 ? '#00ff88' : '#ff4444'}">${lfErr.toFixed(2)} cm</span></div>
        <div>RF Peg Err:  <span style="color: ${rfErr < 2.0 ? '#00ff88' : '#ff4444'}">${rfErr.toFixed(2)} cm</span></div>
        <div>Hips-Seat:   <span style="color: ${hipsErr < 2.0 ? '#00ff88' : '#ff4444'}">${hipsErr.toFixed(2)} cm</span></div>
        <div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 4px;">
          Max Contact Err: <span style="color: #00f0ff; font-weight: bold;">${maxErr.toFixed(2)} cm</span>
        </div>
      `;
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
