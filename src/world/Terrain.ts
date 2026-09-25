import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';

export class Terrain {
  public terrainMesh: Mesh | null = null;

  constructor(private scene: Scene) {
    this.createTerrainMesh();
  }

  private createTerrainMesh(): void {
    const size = 3000;
    const subdivisions = 120;

    this.terrainMesh = MeshBuilder.CreateGround(
      'coastal_terrain',
      {
        width: size,
        height: size,
        subdivisions,
        updatable: true,
      },
      this.scene
    );

    // Center terrain around road circuit
    this.terrainMesh.position.set(500, -2, -200);

    const positions = this.terrainMesh.getVerticesData('position');
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i] + this.terrainMesh.position.x;
        const z = positions[i + 2] + this.terrainMesh.position.z;

        // Multi-frequency hill and mountain height function
        let y = 0;
        // Mountain backdrop in northeast
        if (x > 400 && z < 200) {
          y += Math.sin(x * 0.003) * Math.cos(z * 0.003) * 120;
          y += Math.sin(x * 0.008 + 1.2) * Math.cos(z * 0.007) * 45;
        }

        // Coastal hills
        y += Math.sin(x * 0.004) * Math.cos(z * 0.004) * 25;
        y += Math.sin(x * 0.012) * Math.cos(z * 0.011) * 8;

        // Keep ocean side flat/low
        if (x < -200) {
          y = Math.min(-1.5, y * 0.2 - 2.0);
        }

        positions[i + 1] = y;
      }

      this.terrainMesh.setVerticesData('position', positions);
      this.terrainMesh.createNormals(false);
    }

    // PBR Terrain Material (Earthy grass + rocky slopes)
    const terrainMat = new PBRMaterial('terrain_pbr_mat', this.scene);
    terrainMat.metallic = 0.0;
    terrainMat.roughness = 0.95;

    const texSize = 512;
    const groundTex = new DynamicTexture(
      'ground_palette_tex',
      { width: texSize, height: texSize },
      this.scene,
      false
    );
    const ctx = groundTex.getContext();

    // Grass & rock gradient palette
    ctx.fillStyle = '#3a4d28'; // Coastal pine/grass green
    ctx.fillRect(0, 0, texSize, texSize);

    for (let x = 0; x < texSize; x += 8) {
      for (let y = 0; y < texSize; y += 8) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = Math.random() > 0.6 ? '#4e6336' : '#2f3d20';
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }

    groundTex.update();
    groundTex.uScale = 40.0;
    groundTex.vScale = 40.0;
    terrainMat.albedoTexture = groundTex;

    this.terrainMesh.material = terrainMat;
    this.terrainMesh.receiveShadows = true;
  }
}
