import { BikeAudioProfile, DEFAULT_SUPERBIKE_AUDIO_PROFILE } from './AudioProfile';
import { RPMEngineAudio } from './RPMEngineAudio';
import { FallbackEngineAudio } from './FallbackEngineAudio';
import { WindAudio } from './WindAudio';
import { BikeController } from '../bikes/BikeController';
import { CameraMode } from '../cameras/CameraManager';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public rpmEngineAudio: RPMEngineAudio | null = null;
  public fallbackEngineAudio: FallbackEngineAudio | null = null;
  public windAudio: WindAudio | null = null;

  public isUnlocked: boolean = false;
  private currentProfile: BikeAudioProfile = DEFAULT_SUPERBIKE_AUDIO_PROFILE;
  private onStateChangeCallback: ((state: AudioContextState) => void) | null = null;

  constructor() {}

  /**
   * MUST be invoked directly in the user gesture event stack (e.g. "RIDE" button click)
   */
  public unlock(): void {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    if (!this.ctx) {
      this.ctx = new AudioContextClass();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => {
        console.warn('AudioContext resume deferred:', err);
      });
    }

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    if (!this.fallbackEngineAudio) {
      this.fallbackEngineAudio = new FallbackEngineAudio(this.ctx, this.masterGain);
      this.fallbackEngineAudio.start();
    }

    if (!this.windAudio) {
      this.windAudio = new WindAudio(this.ctx, this.masterGain);
      this.windAudio.start();
    }

    this.ctx.onstatechange = () => {
      if (this.ctx && this.onStateChangeCallback) {
        this.onStateChangeCallback(this.ctx.state);
      }
    };

    this.isUnlocked = this.ctx.state === 'running';
  }

  public setAudioProfile(profile: BikeAudioProfile): void {
    this.currentProfile = profile;
    if (!this.ctx || !this.masterGain) return;

    if (profile.hasRecordedSamples && profile.rpmBands) {
      this.rpmEngineAudio = new RPMEngineAudio(this.ctx, this.masterGain, profile);
      this.rpmEngineAudio.loadSamples().then((success) => {
        if (success && this.rpmEngineAudio) {
          this.fallbackEngineAudio?.stop();
          this.rpmEngineAudio.start();
        }
      });
    }
  }

  public update(bike: BikeController, cameraMode: CameraMode): void {
    if (!this.ctx || this.ctx.state !== 'running') return;

    const isCockpit = cameraMode === 'cockpit';
    const mix = isCockpit ? this.currentProfile.cockpitMix : this.currentProfile.chaseMix;

    if (this.rpmEngineAudio && this.rpmEngineAudio.ready) {
      this.rpmEngineAudio.update(
        bike.currentRpm,
        bike.engine.throttle,
        bike.redlineRpm,
        isCockpit
      );
    } else if (this.fallbackEngineAudio) {
      this.fallbackEngineAudio.update(
        bike.currentRpm,
        bike.engine.throttle,
        bike.redlineRpm,
        isCockpit,
        mix
      );
    }

    this.windAudio?.update(bike.speedKmh, isCockpit);
  }

  public onStateChange(cb: (state: AudioContextState) => void): void {
    this.onStateChangeCallback = cb;
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

  public isSuspended(): boolean {
    return !this.ctx || this.ctx.state === 'suspended';
  }

  public dispose(): void {
    this.fallbackEngineAudio?.stop();
    this.rpmEngineAudio?.stop();
    this.windAudio?.stop();
    this.ctx?.close();
  }
}
