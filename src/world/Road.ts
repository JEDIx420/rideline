import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';

export interface RoadPointInfo {
  position: Vector3;
  tangent: Vector3;
  normal: Vector3;
  pitch: number;
  distanceToCenter: number;
  progressRatio: number;
}

export class Road {
  public readonly width: number = 9.0; // 9m total roadway (two 4m lanes + shoulders)
  public roadMesh: Mesh | null = null;
  public totalLength: number = 0;

  private controlPoints: Vector3[] = [];
  private splinePoints: Vector3[] = [];
  private segmentDistances: number[] = [];

  constructor(private scene: Scene) {
    this.generateControlPoints();
    this.buildSpline(800);
    this.createRoadMesh();
  }

  private generateControlPoints(): void {
    // 3.5 km scenic coastal / mountain ribbon circuit
    const pts: [number, number, number][] = [
      // Start / Finish straight
      [0, 0, 0],
      [0, 1, -200],
      [20, 3, -400],
      // Sweeping coastal right turn
      [90, 8, -600],
      [220, 14, -780],
      [400, 20, -900],
      // Mountain climb into hills
      [600, 32, -920],
      [780, 48, -850],
      [900, 62, -700],
      // Ridge pass S-curves
      [960, 70, -500],
      [920, 75, -300],
      [980, 72, -100],
      [1100, 65, 100],
      // Tight hairpin turn around scenic overlook
      [1180, 58, 300],
      [1160, 52, 450],
      [1050, 45, 520],
      [900, 38, 540],
      [750, 30, 480],
      // High-speed ocean-view downhill straight
      [550, 22, 380],
      [350, 15, 260],
      [180, 8, 140],
      // Sweeping coastal approach back to grid
      [70, 3, 50],
      [0, 0, 0], // Seamless loop
    ];

    this.controlPoints = pts.map((p) => new Vector3(p[0], p[1], p[2]));
  }

  private buildSpline(sampleCount: number): void {
    this.splinePoints = [];
    this.segmentDistances = [0];
    this.totalLength = 0;

    const n = this.controlPoints.length;

    for (let i = 0; i < sampleCount; i++) {
      const tTotal = (i / sampleCount) * (n - 1);
      const segmentIndex = Math.floor(tTotal);
      const t = tTotal - segmentIndex;

      const p0 = this.controlPoints[(segmentIndex - 1 + n) % n];
      const p1 = this.controlPoints[segmentIndex % n];
      const p2 = this.controlPoints[(segmentIndex + 1) % n];
      const p3 = this.controlPoints[(segmentIndex + 2) % n];

      // Catmull-Rom spline interpolation
      const pt = Vector3.CatmullRom(p0, p1, p2, p3, t);
      this.splinePoints.push(pt);

      if (i > 0) {
        const dist = Vector3.Distance(this.splinePoints[i - 1], pt);
        this.totalLength += dist;
        this.segmentDistances.push(this.totalLength);
      }
    }
  }

  private createRoadMesh(): void {
    const halfWidth = this.width * 0.5;
    const paths: Vector3[][] = [];
    const leftPath: Vector3[] = [];
    const centerPath: Vector3[] = [];
    const rightPath: Vector3[] = [];

    const n = this.splinePoints.length;

    for (let i = 0; i < n; i++) {
      const curr = this.splinePoints[i];
      const next = this.splinePoints[(i + 1) % n];
      const tangent = next.subtract(curr).normalize();

      // Right vector perpendicular to tangent on XZ plane
      const right = Vector3.Cross(Vector3.Up(), tangent).normalize();

      leftPath.push(curr.add(right.scale(-halfWidth)));
      centerPath.push(curr);
      rightPath.push(curr.add(right.scale(halfWidth)));
    }

    // Add first point to close loop cleanly
    leftPath.push(leftPath[0]);
    centerPath.push(centerPath[0]);
    rightPath.push(rightPath[0]);

    paths.push(leftPath, rightPath);

    this.roadMesh = MeshBuilder.CreateRibbon(
      'road_surface',
      {
        pathArray: paths,
        closeArray: true,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );

    // Procedural PBR asphalt material with road markings
    const roadMat = new PBRMaterial('road_pbr_mat', this.scene);
    roadMat.metallic = 0.05;
    roadMat.roughness = 0.85;

    // Create high-res dynamic texture for asphalt + markings
    const texWidth = 1024;
    const texHeight = 1024;
    const roadTexture = new DynamicTexture(
      'road_markings_tex',
      { width: texWidth, height: texHeight },
      this.scene,
      true
    );
    const ctx = roadTexture.getContext();

    // Dark asphalt base
    ctx.fillStyle = '#1c1e22';
    ctx.fillRect(0, 0, texWidth, texHeight);

    // Subtle asphalt grain texture
    for (let x = 0; x < texWidth; x += 4) {
      for (let y = 0; y < texHeight; y += 4) {
        if (Math.random() > 0.6) {
          ctx.fillStyle = Math.random() > 0.5 ? '#26292f' : '#141619';
          ctx.fillRect(x, y, 3, 3);
        }
      }
    }

    // White outer edge lines (solid)
    ctx.fillStyle = '#f0f2f5';
    ctx.fillRect(35, 0, 18, texHeight);
    ctx.fillRect(texWidth - 53, 0, 18, texHeight);

    // Yellow double / dashed center markings
    ctx.fillStyle = '#f5b027';
    const dashLength = 80;
    const dashGap = 60;
    for (let y = 0; y < texHeight; y += dashLength + dashGap) {
      ctx.fillRect(texWidth / 2 - 8, y, 16, dashLength);
    }

    roadTexture.update();
    roadTexture.uScale = 1.0;
    roadTexture.vScale = 85.0; // Repeat along road ribbon
    roadMat.albedoTexture = roadTexture;

    this.roadMesh.material = roadMat;
    this.roadMesh.receiveShadows = true;
  }

  public getClosestPoint(pos: Vector3): RoadPointInfo {
    let bestDistSq = Infinity;
    let bestIndex = 0;
    const n = this.splinePoints.length;

    // Fast search across spline points
    for (let i = 0; i < n; i++) {
      const pt = this.splinePoints[i];
      const dx = pt.x - pos.x;
      const dz = pt.z - pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIndex = i;
      }
    }

    const curr = this.splinePoints[bestIndex];
    const next = this.splinePoints[(bestIndex + 1) % n];
    const prev = this.splinePoints[(bestIndex - 1 + n) % n];

    const tangent = next.subtract(prev).normalize();
    const toPos = pos.subtract(curr);
    const right = Vector3.Cross(Vector3.Up(), tangent).normalize();
    const distToCenter = Vector3.Dot(toPos, right);

    // Pitch along tangent (elevation gradient)
    const pitch = Math.atan2(tangent.y, Math.sqrt(tangent.x * tangent.x + tangent.z * tangent.z));

    return {
      position: curr,
      tangent,
      normal: Vector3.Up(),
      pitch,
      distanceToCenter: Math.abs(distToCenter),
      progressRatio: bestIndex / n,
    };
  }

  public getSpawnTransform(): { position: Vector3; headingRad: number } {
    const startPt = this.splinePoints[0];
    const nextPt = this.splinePoints[1];
    const dir = nextPt.subtract(startPt).normalize();
    const heading = Math.atan2(-dir.x, -dir.z);

    return {
      position: new Vector3(startPt.x, startPt.y + 0.35, startPt.z),
      headingRad: heading,
    };
  }

  public getSplinePoints(): Vector3[] {
    return this.splinePoints;
  }
}
