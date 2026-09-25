export type GraphicsQuality = 'performance' | 'balanced' | 'quality';

export interface GraphicsSettings {
  name: GraphicsQuality;
  label: string;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowCascades: number;
  antiAliasingSamples: number;
  renderScale: number;
  drawDistance: number;
  environmentDensity: number; // 0.5 to 1.0 (density of roadside props)
  postProcessing: boolean;
  bloomEnabled: boolean;
}

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsSettings> = {
  performance: {
    name: 'performance',
    label: 'Performance (Fast)',
    shadowsEnabled: false,
    shadowMapSize: 1024,
    shadowCascades: 1,
    antiAliasingSamples: 1,
    renderScale: 0.85,
    drawDistance: 1200,
    environmentDensity: 0.5,
    postProcessing: false,
    bloomEnabled: false,
  },
  balanced: {
    name: 'balanced',
    label: 'Balanced (Recommended)',
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowCascades: 2,
    antiAliasingSamples: 2,
    renderScale: 1.0,
    drawDistance: 2000,
    environmentDensity: 0.8,
    postProcessing: true,
    bloomEnabled: false,
  },
  quality: {
    name: 'quality',
    label: 'Quality (High Detail)',
    shadowsEnabled: true,
    shadowMapSize: 4096,
    shadowCascades: 3,
    antiAliasingSamples: 4,
    renderScale: 1.0,
    drawDistance: 3000,
    environmentDensity: 1.0,
    postProcessing: true,
    bloomEnabled: true,
  },
};
