export class MusicManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private timerId: number | null = null;
  private step: number = 0;
  private bpm: number = 132;
  private volume: number = 0.70;
  private isMuted: boolean = false;

  // Harmonic chord progression: F#m -> A -> E -> B (High-energy Euro motorsport / synthwave)
  private bassNotes: number[] = [
    92.50, 92.50, 92.50, 92.50, 92.50, 92.50, 92.50, 92.50, // F#2
    110.0, 110.0, 110.0, 110.0, 110.0, 110.0, 110.0, 110.0, // A2
    82.41, 82.41, 82.41, 82.41, 82.41, 82.41, 82.41, 82.41, // E2
    123.47, 123.47, 123.47, 123.47, 123.47, 123.47, 123.47, 123.47 // B2
  ];

  // Lead arpeggio notes (F#3, A3, C#4, E4, F#4)
  private arpNotes: number[] = [
    185.00, 220.00, 277.18, 329.63, 369.99, 329.63, 277.18, 220.00,
    220.00, 277.18, 329.63, 440.00, 493.88, 440.00, 329.63, 277.18,
    164.81, 207.65, 246.94, 329.63, 369.99, 329.63, 246.94, 207.65,
    246.94, 293.66, 369.99, 440.00, 493.88, 440.00, 369.99, 293.66
  ];

  constructor(audioContext?: AudioContext | null) {
    if (audioContext) {
      this.init(audioContext);
    }
  }

  public init(ctx: AudioContext): void {
    if (this.ctx === ctx && this.musicGain) return;
    this.ctx = ctx;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    this.musicGain.connect(this.ctx.destination);
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx && !this.isMuted) {
      this.musicGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Starts high-octane procedural loading / garage music track immediately.
   */
  public playLoadingTrack(): void {
    if (this.isPlaying || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
    }

    this.isPlaying = true;
    this.step = 0;
    // Set initial volume immediately
    const targetGain = this.isMuted ? 0 : this.volume;
    this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.musicGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);

    // Schedule 16th-note ticks
    const stepIntervalMs = (60 / this.bpm / 4) * 1000; // ~113.6ms per 16th note
    this.timerId = window.setInterval(() => {
      this.tick();
    }, stepIntervalMs);
  }

  private tick(): void {
    if (!this.ctx || !this.isPlaying || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const stepInPattern = this.step % 32;

    // 1. Driving Kick Drum on every beat (steps 0, 4, 8, 12, 16, 20, 24, 28)
    if (stepInPattern % 4 === 0) {
      this.playKick(now);
    }

    // 2. Snare / Clap on beats 2 and 4 (steps 4, 12, 20, 28)
    if (stepInPattern % 8 === 4) {
      this.playSnare(now);
    }

    // 3. Hi-hat on every 16th note (open hat on offbeats)
    const isOpenHat = stepInPattern % 4 === 2;
    this.playHiHat(now, isOpenHat);

    // 4. Rolling 16th-Note Resonant Bassline
    const bassFreq = this.bassNotes[stepInPattern];
    this.playBassNote(now, bassFreq);

    // 5. Arpeggiated Synth Lead
    const arpFreq = this.arpNotes[stepInPattern];
    this.playArpNote(now, arpFreq);

    this.step++;
  }

  private playKick(t: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.09);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  private playSnare(t: number): void {
    if (!this.ctx || !this.musicGain) return;
    // White noise burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.55;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.48, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(t);
    noise.stop(t + 0.12);
  }

  private playHiHat(t: number, isOpen: boolean): void {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * (isOpen ? 0.08 : 0.03));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, t);

    const gain = this.ctx.createGain();
    const peakVol = isOpen ? 0.22 : 0.12;
    gain.gain.setValueAtTime(peakVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isOpen ? 0.075 : 0.028));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(t);
    noise.stop(t + (isOpen ? 0.08 : 0.03));
  }

  private playBassNote(t: number, freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350 + Math.sin(this.step * 0.1) * 150, t);
    filter.Q.setValueAtTime(4.0, t);

    gain.gain.setValueAtTime(0.40, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.10);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  private playArpNote(t: number, freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + Math.sin(this.step * 0.2) * 600, t);
    filter.Q.setValueAtTime(2.5, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + 0.10);
  }

  /**
   * Smoothly crossfades loading music down into engine start over fadeTimeSec (e.g. 0.8s)
   */
  public fadeOut(fadeTimeSec: number = 0.8): void {
    if (!this.isPlaying || !this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(0.0001, now + fadeTimeSec);

    window.setTimeout(() => {
      this.stop();
    }, fadeTimeSec * 1000);
  }

  public stop(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isPlaying = false;
    this.step = 0;
  }

  public dispose(): void {
    this.stop();
    this.musicGain?.disconnect();
  }
}
