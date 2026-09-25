import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
import { GraphicsSettings, GRAPHICS_PRESETS, GraphicsQuality } from '../config/graphics';

export class SceneManager {
  public canvas: HTMLCanvasElement;
  public engine: Engine;
  public scene: Scene;
  public graphics: GraphicsSettings;

  constructor(canvasId: string, initialPreset: GraphicsQuality = 'balanced') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found.`);
    }

    this.graphics = GRAPHICS_PRESETS[initialPreset];

    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: false,
      stencil: false,
      antialias: this.graphics.antiAliasingSamples > 1,
      powerPreference: 'high-performance',
      adaptToDeviceRatio: true,
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.06, 0.07, 0.09, 1.0);

    this.setupColorGrading();
    this.applyGraphicsPreset(initialPreset);
    this.setupResizeHandler();
  }

  private setupColorGrading(): void {
    const ipc = this.scene.imageProcessingConfiguration;
    ipc.toneMappingEnabled = true;
    ipc.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    ipc.exposure = 1.0;
    ipc.contrast = 1.1;
  }

  public applyGraphicsPreset(preset: GraphicsQuality): void {
    this.graphics = GRAPHICS_PRESETS[preset];
    this.engine.setHardwareScalingLevel(1.0 / this.graphics.renderScale);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  public render(): void {
    this.scene.render();
  }

  public dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}
