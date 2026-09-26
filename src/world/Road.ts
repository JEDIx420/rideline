import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
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
  public readonly width: number = 9.2; // 9.2m roadway (two generous 4.2m lanes + markings)
  public roadMesh: Mesh | null = null;
  public shoulderMesh: Mesh | null = null;
  public totalLength: number = 0;

  private controlPoints: Vector3[] = [];
  private splinePoints: Vector3[] = [];
  private segmentDistances: number[] = [];

  constructor(private scene: Scene) {
    this.generateControlPoints();
    this.buildSpline(900);
    this.createRoadMesh();
    this.createShoulders();
  }

  private generateControlPoints(): void {
    // 3.5 km scenic coastal ribbon circuit with high-precision 750m benchmark section at start
    const pts: [number, number, number][] = [
      // === 750m BENCHMARK VERTICAL SLICE ===
      // Start grid & high-speed oceanfront straight
      [0, 0, 0],
      [0, 0.4, -120],
      [10, 1.2, -260],
      [35, 2.8, -380],
      // Sweeping coastal right sweeper overlooking sea
      [90, 5.5, -520],
      [180, 9.2, -660],
      [300, 14.0, -780],
      // Mountain climb S-bend transition
      [450, 20.5, -860],
      [620, 28.0, -900],
      [780, 38.5, -860],
      [900, 50.0, -720],
      // Ridge pass S-curves
      [960, 60.0, -500],
      [930, 66.0, -320],
      [980, 64.0, -120],
      [1100, 58.0, 80],
      // Tight scenic hairpin overlook
      [1180, 52.0, 280],
      [1160, 46.0, 420],
      [1050, 39.0, 500],
      [900, 32.0, 520],
      [750, 25.0, 460],
      // High-speed ocean-view descent
      [550, 18.0, 360],
      [350, 11.5, 240],
      [180, 5.8, 120],
      [60, 2.0, 40],
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
      const right = Vector3.Cross(Vector3.Up(), tangent).normalize();

      // Road ribbon coordinates with subtle crown camber
      const leftPt = curr.add(right.scale(-halfWidth));
      leftPt.y -= 0.02;
      const rightPt = curr.add(right.scale(halfWidth));
      rightPt.y -= 0.02;

      leftPath.push(leftPt);
      centerPath.push(curr);
      rightPath.push(rightPt);
    }

    leftPath.push(leftPath[0]);
    centerPath.push(centerPath[0]);
    rightPath.push(rightPath[0]);

    paths.push(leftPath, centerPath, rightPath);

    this.roadMesh = MeshBuilder.CreateRibbon(
      'road_surface',
      {
        pathArray: paths,
        closeArray: true,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );
    this.roadMesh.createNormals(false);

    // Layered PBR Asphalt + Markings Material
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    const roadMat = new PBRMaterial('road_pbr_mat', this.scene);
    roadMat.metallic = 0.08;
    roadMat.roughness = 0.82;

    // High-resolution Dynamic Marking Overlay on real Asphalt Texture
    const texWidth = 1024;
    const texHeight = 2048;
    const roadTexture = new DynamicTexture(
      'road_pbr_tex',
      { width: texWidth, height: texHeight },
      this.scene,
      true
    );
    const ctx = roadTexture.getContext();

    // Dark high-grip asphalt base
    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(0, 0, texWidth, texHeight);

    // Fine surface aggregate grain
    for (let x = 0; x < texWidth; x += 3) {
      for (let y = 0; y < texHeight; y += 3) {
        if (Math.random() > 0.55) {
          ctx.fillStyle = Math.random() > 0.5 ? '#272b32' : '#14161a';
          ctx.fillRect(x, y, 2.5, 2.5);
        }
      }
    }

    // Outer Edge White Markings (crisp solid stripes)
    ctx.fillStyle = '#f2f4f8';
    ctx.fillRect(28, 0, 20, texHeight);
    ctx.fillRect(texWidth - 48, 0, 20, texHeight);

    // Center Double Yellow / Dashed Dividing Line
    ctx.fillStyle = '#f5b027';
    const dashLength = 120;
    const dashGap = 90;
    for (let y = 0; y < texHeight; y += dashLength + dashGap) {
      ctx.fillRect(texWidth / 2 - 12, y, 10, dashLength);
      ctx.fillRect(texWidth / 2 + 2, y, 10, dashLength);
    }

    roadTexture.update();
    roadTexture.uScale = 1.0;
    roadTexture.vScale = 120.0;
    roadMat.albedoTexture = roadTexture;

    // Load PBR normal map for asphalt roughness
    try {
      const normalTex = new Texture(baseUrl + 'assets/road/asphalt_nor.jpg', this.scene);
      normalTex.uScale = 4.0;
      normalTex.vScale = 120.0;
      roadMat.bumpTexture = normalTex;
    } catch (e) {
      console.warn('Road normal map fallback:', e);
    }

    this.roadMesh.material = roadMat;
    this.roadMesh.receiveShadows = true;
  }

  private createShoulders(): void {
    const halfWidth = this.width * 0.5;
    const shoulderWidth = 2.2;
    const paths: Vector3[][] = [];
    const leftShoulderOuter: Vector3[] = [];
    const leftShoulderInner: Vector3[] = [];

    const n = this.splinePoints.length;

    for (let i = 0; i < n; i++) {
      const curr = this.splinePoints[i];
      const next = this.splinePoints[(i + 1) % n];
      const tangent = next.subtract(curr).normalize();
      const right = Vector3.Cross(Vector3.Up(), tangent).normalize();

      const inner = curr.add(right.scale(-halfWidth));
      inner.y -= 0.03;
      const outer = curr.add(right.scale(-(halfWidth + shoulderWidth)));
      outer.y -= 0.18; // Soft taper into terrain

      leftShoulderInner.push(inner);
      leftShoulderOuter.push(outer);
    }

    leftShoulderInner.push(leftShoulderInner[0]);
    leftShoulderOuter.push(leftShoulderOuter[0]);

    paths.push(leftShoulderOuter, leftShoulderInner);

    this.shoulderMesh = MeshBuilder.CreateRibbon(
      'road_shoulder',
      {
        pathArray: paths,
        closeArray: true,
        sideOrientation: Mesh.DOUBLESIDE,
      },
      this.scene
    );

    const shoulderMat = new PBRMaterial('shoulder_mat', this.scene);
    shoulderMat.albedoColor = new Color3(0.32, 0.28, 0.22); // Gravel/dirt shoulder
    shoulderMat.roughness = 0.95;
    this.shoulderMesh.material = shoulderMat;
    this.shoulderMesh.receiveShadows = true;
  }

  public getClosestPoint(pos: Vector3): RoadPointInfo {
    let bestDistSq = Infinity;
    let bestIndex = 0;
    const n = this.splinePoints.length;

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
      position: new Vector3(startPt.x, startPt.y, startPt.z),
      headingRad: heading,
    };
  }

  public getSplinePoints(): Vector3[] {
    return this.splinePoints;
  }
}
