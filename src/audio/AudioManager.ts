import { EngineAudio } from './EngineAudio';
import { WindAudio } from './WindAudio';
import { BikeController } from '../bikes/BikeController';
import { CameraMode } from '../cameras/CameraManager';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public engineAudio: EngineAudio | null = null;
  public windAudio: WindAudio | null = null;
  public isUnlocked: boolean = false;

  constructor() {}

  public unlock(): void {
    if (this.isUnlocked && this.ctx && this.ctx.state === 'running') return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!this.ctx) {
      this.ctx = new AudioContextClass();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.engineAudio = new EngineAudio(this.ctx, this.masterGain);
    this.engineAudio.start();

    this.windAudio = new WindAudio(this.ctx, this.masterGain);
    this.windAudio.start();

    this.isUnlocked = true;
  }

  public update(bike: BikeController, cameraMode: CameraMode): void {
    if (!this.isUnlocked) return;

    const isCockpit = cameraMode === 'cockpit';
    this.engineAudio?.update(
      bike.currentRpm,
      bike.engine.throttle,
      bike.redlineRpm,
      isCockpit
    );
    this.windAudio?.update(bike.speedKmh, isCockpit);
  }

  public setMasterVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, vol)),
        this.ctx.currentTime,
        0.05
      );
    }
  }

  public dispose(): void {
    this.engineAudio?.stop();
    this.windAudio?.stop();
    this.ctx?.close();
  }
}
