import { Scene } from '@babylonjs/core/scene';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { BiomeProfile } from './BiomeDirector';

export class AtmosphereDirector {
  public sunLight: DirectionalLight;
  public fillLight: HemisphericLight;
  public shadowGenerator: ShadowGenerator;

  constructor(private scene: Scene) {
    // 1. Directional Sun Key Light
    this.sunLight = new DirectionalLight(
      'atmosphere_sun',
      new Vector3(-0.6, -1.0, 0.5).normalize(),
      this.scene
    );
    this.sunLight.intensity = 1.6;
    this.sunLight.diffuse = new Color3(1.0, 0.96, 0.90);

    this.shadowGenerator = new ShadowGenerator(2048, this.sunLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 24;

    // 2. Hemispheric Sky/Ground Fill
    this.fillLight = new HemisphericLight(
      'atmosphere_fill',
      new Vector3(0, 1, 0),
      this.scene
    );
    this.fillLight.intensity = 0.55;
    this.fillLight.groundColor = new Color3(0.22, 0.22, 0.24);
    this.fillLight.diffuse = new Color3(0.70, 0.82, 0.95);

    // 3. Fog
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0006;
    this.scene.fogColor = new Color3(0.68, 0.78, 0.90);
  }

  /**
   * Smoothly updates atmospheric lighting and fog towards the target biome profile.
   */
  public applyBiome(biome: BiomeProfile, dt: number): void {
    const lerpRate = Math.min(1.0, dt * 2.0);

    // Fog
    this.scene.fogColor = Color3.Lerp(this.scene.fogColor, biome.fogColor, lerpRate);
    this.scene.fogDensity += (biome.fogDensity - this.scene.fogDensity) * lerpRate;

    // Sun
    this.sunLight.diffuse = Color3.Lerp(this.sunLight.diffuse, biome.sunColor, lerpRate);
    this.sunLight.intensity += (biome.sunIntensity - this.sunLight.intensity) * lerpRate;

    // Sky Fill
    this.fillLight.diffuse = Color3.Lerp(this.fillLight.diffuse, biome.skyColor, lerpRate);
  }

  public setVisible(visible: boolean): void {
    this.sunLight.setEnabled(visible);
    this.fillLight.setEnabled(visible);
  }
}
