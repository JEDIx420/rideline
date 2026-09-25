import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';
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
    this.scene.clearColor = new Color4(0.74, 0.82, 0.92, 1.0);

    this.applyGraphicsPreset(initialPreset);
    this.setupResizeHandler();
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
