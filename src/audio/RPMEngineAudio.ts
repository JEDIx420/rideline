import { BikeAudioProfile, RpmBandConfig } from './AudioProfile';

export interface LoadedBand {
  config: RpmBandConfig;
  buffer: AudioBuffer;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
}

export class RPMEngineAudio {
  private bands: LoadedBand[] = [];
  private intakeGainNode: GainNode | null = null;
  private exhaustGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isPlaying: boolean = false;
  private isLoaded: boolean = false;

  constructor(
    private ctx: AudioContext,
    private destination: AudioNode,
    private profile: BikeAudioProfile
  ) {
    this.setupNodes();
  }

  private setupNodes(): void {
    this.masterGainNode = this.ctx.createGain();
    this.masterGainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.intakeGainNode = this.ctx.createGain();
    this.exhaustGainNode = this.ctx.createGain();

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(10000, this.ctx.currentTime);

    this.intakeGainNode.connect(this.filterNode);
    this.exhaustGainNode.connect(this.filterNode);
    this.filterNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.destination);
  }

  public async loadSamples(): Promise<boolean> {
    if (!this.profile.rpmBands || this.profile.rpmBands.length === 0) {
      return false;
    }

    try {
      this.bands = [];
      for (const band of this.profile.rpmBands) {
        const resp = await fetch(band.sampleUrl);
        if (!resp.ok) continue;
        const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await this.ctx.decodeAudioData(arrayBuf);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
        gain.connect(this.exhaustGainNode!);

        this.bands.push({
          config: band,
          buffer: audioBuf,
          sourceNode: null,
          gainNode: gain,
        });
      }

      this.isLoaded = this.bands.length > 0;
      return this.isLoaded;
    } catch (e) {
      console.warn('Could not load recorded RPM audio bands, using procedural fallback:', e);
      this.isLoaded = false;
      return false;
    }
  }

  public start(): void {
    if (this.isPlaying || !this.isLoaded) return;

    const t = this.ctx.currentTime;
    for (const b of this.bands) {
      const src = this.ctx.createBufferSource();
      src.buffer = b.buffer;
      src.loop = true;
      src.connect(b.gainNode);
      src.start(t);
      b.sourceNode = src;
    }

    this.masterGainNode?.gain.setValueAtTime(0.8, t);
    this.isPlaying = true;
  }

  public update(rpm: number, throttle: number, _maxRpm: number, isCockpit: boolean): void {
    if (!this.isPlaying || !this.isLoaded || this.bands.length === 0) return;

    const t = this.ctx.currentTime;
    const mix = isCockpit ? this.profile.cockpitMix : this.profile.chaseMix;

    // Apply camera mix
    this.intakeGainNode?.gain.setTargetAtTime(mix.intakeVolume * (0.4 + throttle * 0.6), t, 0.04);
    this.exhaustGainNode?.gain.setTargetAtTime(mix.exhaustVolume, t, 0.04);
    this.filterNode?.frequency.setTargetAtTime(mix.lowpassCutoffHz, t, 0.05);

    // Multi-band crossfading & pitch shifting
    for (const b of this.bands) {
      const { nominalRpm, minRpm, maxRpm: bandMax, volume } = b.config;

      // Band weight / envelope calculation
      let weight = 0.0;
      if (rpm >= minRpm && rpm <= bandMax) {
        if (rpm < nominalRpm) {
          weight = (rpm - minRpm) / Math.max(1, nominalRpm - minRpm);
        } else {
          weight = 1.0 - (rpm - nominalRpm) / Math.max(1, bandMax - nominalRpm);
        }
      }

      // Smooth gain crossfade
      b.gainNode.gain.setTargetAtTime(Math.max(0, weight) * volume, t, 0.03);

      // Fine pitch playback rate correction (ratio of current RPM to nominal recorded RPM)
      if (b.sourceNode) {
        const pitchRate = Math.max(0.5, Math.min(2.0, rpm / nominalRpm));
        b.sourceNode.playbackRate.setTargetAtTime(pitchRate, t, 0.03);
      }
    }
  }

  public stop(): void {
    if (!this.isPlaying) return;
    for (const b of this.bands) {
      b.sourceNode?.stop();
      b.sourceNode?.disconnect();
      b.sourceNode = null;
    }
    this.isPlaying = false;
  }

  public get ready(): boolean {
    return this.isLoaded;
  }
}
