import { Color3 } from '@babylonjs/core/Maths/math';

export interface BiomeProfile {
  name: string;
  skyColor: Color3;
  fogColor: Color3;
  fogDensity: number;
  sunColor: Color3;
  sunIntensity: number;
  sunElevationDeg: number;
  terrainGrassColor: Color3;
  treeDensityMultiplier: number;
}

export const BIOMES: Record<string, BiomeProfile> = {
  coastal: {
    name: 'Coastal Ribbon',
    skyColor: new Color3(0.55, 0.72, 0.95),
    fogColor: new Color3(0.68, 0.78, 0.90),
    fogDensity: 0.0006,
    sunColor: new Color3(1.0, 0.96, 0.90),
    sunIntensity: 1.6,
    sunElevationDeg: 42.0,
    terrainGrassColor: new Color3(0.34, 0.44, 0.28),
    treeDensityMultiplier: 1.0,
  },
  alpine: {
    name: 'Alpine Pass',
    skyColor: new Color3(0.45, 0.65, 0.92),
    fogColor: new Color3(0.60, 0.70, 0.85),
    fogDensity: 0.0008,
    sunColor: new Color3(1.0, 0.98, 0.94),
    sunIntensity: 1.8,
    sunElevationDeg: 55.0,
    terrainGrassColor: new Color3(0.28, 0.38, 0.26),
    treeDensityMultiplier: 1.4,
  },
  highlands: {
    name: 'Autumn Highlands',
    skyColor: new Color3(0.62, 0.68, 0.85),
    fogColor: new Color3(0.72, 0.72, 0.78),
    fogDensity: 0.0007,
    sunColor: new Color3(1.0, 0.90, 0.78),
    sunIntensity: 1.5,
    sunElevationDeg: 35.0,
    terrainGrassColor: new Color3(0.42, 0.38, 0.24),
    treeDensityMultiplier: 0.9,
  },
};

export class BiomeDirector {
  public currentBiome: BiomeProfile = BIOMES.coastal;

  /**
   * Determines active biome and smooth transitions based on distance traveled.
   */
  public getBiomeAtDistance(distanceMeters: number): BiomeProfile {
    // 0 - 2000m: Coastal Ribbon
    // 2000 - 5000m: Alpine Pass
    // 5000m+: Autumn Highlands
    if (distanceMeters < 2200) {
      return BIOMES.coastal;
    } else if (distanceMeters < 5200) {
      return BIOMES.alpine;
    } else {
      return BIOMES.highlands;
    }
  }

  public update(playerRoadDist: number): void {
    this.currentBiome = this.getBiomeAtDistance(playerRoadDist);
  }
}
