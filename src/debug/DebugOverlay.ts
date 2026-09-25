import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { BikeController } from '../bikes/BikeController';
import { CameraMode } from '../cameras/CameraManager';
import { GraphicsQuality } from '../config/graphics';

export class DebugOverlay {
  private container: HTMLElement;
  public isVisible: boolean = false;
  private fpsCounter: number = 0;
  private lastTime: number = performance.now();
  private frames: number = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'rideline-debug-overlay';
    this.container.className = 'debug-overlay hidden';
    document.body.appendChild(this.container);
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
  }

  public update(
    _engine: Engine,
    scene: Scene,
    bike: BikeController,
    cameraMode: CameraMode,
    preset: GraphicsQuality
  ): void {
    if (!this.isVisible) return;

    this.frames++;
    const now = performance.now();
    if (now - this.lastTime >= 500) {
      this.fpsCounter = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.frames = 0;
      this.lastTime = now;
    }

    const drawCalls = scene.getEngine()._drawCalls?.current || 0;
    const meshCount = scene.meshes.length;
    const pos = bike.position;

    this.container.innerHTML = `
      <div class="debug-title">RIDELINE DEBUG &bull; F3</div>
      <div class="debug-grid">
        <span class="lbl">FPS:</span> <span class="val ${this.fpsCounter < 30 ? 'warn' : 'good'}">${this.fpsCounter} (${(1000 / Math.max(1, this.fpsCounter)).toFixed(1)}ms)</span>
        <span class="lbl">Preset:</span> <span class="val">${preset.toUpperCase()}</span>
        <span class="lbl">Draw Calls:</span> <span class="val">${drawCalls}</span>
        <span class="lbl">Active Meshes:</span> <span class="val">${meshCount}</span>
        <span class="lbl">Motorcycle:</span> <span class="val">${bike.definition.displayName}</span>
        <span class="lbl">Speed:</span> <span class="val">${bike.speedKmh.toFixed(1)} km/h (${bike.physics.speedMps.toFixed(1)} m/s)</span>
        <span class="lbl">RPM:</span> <span class="val">${Math.round(bike.currentRpm)} / ${bike.redlineRpm}</span>
        <span class="lbl">Gear:</span> <span class="val">${bike.currentGear}</span>
        <span class="lbl">Lean Angle:</span> <span class="val">${((bike.leanAngleRad * 180) / Math.PI).toFixed(1)}&deg;</span>
        <span class="lbl">Steer Angle:</span> <span class="val">${((bike.physics.steerAngleRad * 180) / Math.PI).toFixed(1)}&deg;</span>
        <span class="lbl">Position:</span> <span class="val">[${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}]</span>
        <span class="lbl">Camera:</span> <span class="val">${cameraMode.toUpperCase()}</span>
      </div>
    `;
  }

  public dispose(): void {
    this.container.remove();
  }
}
