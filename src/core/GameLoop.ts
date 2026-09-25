import { Engine } from '@babylonjs/core/Engines/engine';

export class GameLoop {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly FIXED_TIMESTEP: number = 1 / 60; // 60Hz fixed simulation step

  constructor(
    private engine: Engine,
    private updateFn: (fixedDt: number) => void,
    private renderFn: () => void
  ) {}

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();

    this.engine.runRenderLoop(this.tick.bind(this));
  }

  private tick(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    let frameDeltaSec = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp delta to prevent spiral of death on tab freeze
    frameDeltaSec = Math.min(0.1, frameDeltaSec);

    if (!this.isPaused) {
      this.accumulator += frameDeltaSec;
      while (this.accumulator >= this.FIXED_TIMESTEP) {
        this.updateFn(this.FIXED_TIMESTEP);
        this.accumulator -= this.FIXED_TIMESTEP;
      }
    }

    this.renderFn();
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public stop(): void {
    this.isRunning = false;
    this.engine.stopRenderLoop();
  }
}
