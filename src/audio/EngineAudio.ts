export class EngineAudio {
  private oscFundamental: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private distortionNode: WaveShaperNode | null = null;

  private isRunning: boolean = false;

  constructor(private ctx: AudioContext, private destination: AudioNode) {}

  public start(): void {
    if (this.isRunning) return;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // WaveShaper for raw 4-cylinder exhaust bark / rasp
    this.distortionNode = this.ctx.createWaveShaper();
    (this.distortionNode as unknown as { curve: Float32Array | null }).curve = this.makeDistortionCurve(25);
    this.distortionNode.oversample = '2x';

    // 1. Fundamental firing frequency (4-stroke 4-cylinder: 2 sparks per revolution => freq = RPM * 2 / 60 = RPM / 30)
    this.oscFundamental = this.ctx.createOscillator();
    this.oscFundamental.type = 'sawtooth';
    this.oscFundamental.frequency.setValueAtTime(45, this.ctx.currentTime);

    // 2. Harmonic (intake scream / valve gear whine)
    this.oscHarmonic = this.ctx.createOscillator();
    this.oscHarmonic.type = 'triangle';
    this.oscHarmonic.frequency.setValueAtTime(90, this.ctx.currentTime);

    // 3. Sub-bass pulse
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'sine';
    this.oscSub.frequency.setValueAtTime(22.5, this.ctx.currentTime);

    // Routing
    this.oscFundamental.connect(this.distortionNode);
    this.oscHarmonic.connect(this.distortionNode);
    this.oscSub.connect(this.distortionNode);

    this.distortionNode.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.destination);

    this.oscFundamental.start();
    this.oscHarmonic.start();
    this.oscSub.start();

    this.isRunning = true;
  }

  public update(rpm: number, throttle: number, maxRpm: number, isCockpit: boolean): void {
    if (!this.isRunning || !this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;

    // 4-cylinder 4-stroke firing frequency: (RPM / 60) * 2 = RPM / 30
    const fundamentalFreq = Math.max(30, rpm / 30);
    const harmonicFreq = fundamentalFreq * 2.0;
    const subFreq = fundamentalFreq * 0.5;

    this.oscFundamental?.frequency.setTargetAtTime(fundamentalFreq, t, 0.03);
    this.oscHarmonic?.frequency.setTargetAtTime(harmonicFreq, t, 0.03);
    this.oscSub?.frequency.setTargetAtTime(subFreq, t, 0.03);

    // Dynamic lowpass opening on throttle (intake roar) and high RPM
    const rpmRatio = rpm / maxRpm;
    const baseCutoff = isCockpit ? 1600 : 1200;
    const targetCutoff = baseCutoff + throttle * 4500 + rpmRatio * 3500;
    this.filterNode?.frequency.setTargetAtTime(targetCutoff, t, 0.04);

    // Master engine volume
    const baseVolume = 0.18 + throttle * 0.22 + rpmRatio * 0.15;
    const cockpitAtten = isCockpit ? 0.85 : 1.0;
    this.gainNode?.gain.setTargetAtTime(baseVolume * cockpitAtten, t, 0.05);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.oscFundamental?.stop();
    this.oscHarmonic?.stop();
    this.oscSub?.stop();
    this.oscFundamental?.disconnect();
    this.oscHarmonic?.disconnect();
    this.oscSub?.disconnect();
    this.gainNode?.disconnect();
    this.isRunning = false;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = amount;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
