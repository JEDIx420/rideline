import { CameraAudioMix } from './AudioProfile';

export class FallbackEngineAudio {
  private oscFundamental: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private oscValvetrain: OscillatorNode | null = null;

  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private distortionNode: WaveShaperNode | null = null;

  private isRunning: boolean = false;
  private lastShiftState: boolean = false;

  constructor(private ctx: AudioContext, private destination: AudioNode) {}

  public start(): void {
    if (this.isRunning) return;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(900, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(2.8, this.ctx.currentTime);

    // WaveShaper for inline-four combustion cylinder rasp
    this.distortionNode = this.ctx.createWaveShaper();
    (this.distortionNode as unknown as { curve: Float32Array | null }).curve = this.makeDistortionCurve(24);
    this.distortionNode.oversample = '2x';

    // 1. Fundamental firing frequency (4-stroke 4-cylinder: 2 sparks per revolution => freq = RPM / 30)
    this.oscFundamental = this.ctx.createOscillator();
    this.oscFundamental.type = 'sawtooth';
    this.oscFundamental.frequency.setValueAtTime(41.6, this.ctx.currentTime); // ~1,250 RPM fundamental

    // 2. Harmonic (intake runner resonance & camshaft order)
    this.oscHarmonic = this.ctx.createOscillator();
    this.oscHarmonic.type = 'triangle';
    this.oscHarmonic.frequency.setValueAtTime(83.3, this.ctx.currentTime);

    // 3. Sub-bass exhaust firing rumble
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'sine';
    this.oscSub.frequency.setValueAtTime(20.8, this.ctx.currentTime);

    // 4. Mechanical valvetrain chatter / cam gear whine
    this.oscValvetrain = this.ctx.createOscillator();
    this.oscValvetrain.type = 'triangle';
    this.oscValvetrain.frequency.setValueAtTime(250, this.ctx.currentTime);
    const valvetrainGain = this.ctx.createGain();
    valvetrainGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.oscValvetrain.connect(valvetrainGain);
    valvetrainGain.connect(this.distortionNode);

    // 5. Procedural Combustion Noise Pulse (exhaust puff & cylinder pressure)
    this.setupNoiseLayer();

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
    this.oscValvetrain.start();

    this.isRunning = true;
  }

  private setupNoiseLayer(): void {
    // 2-second looped pink/brown combustion texture
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.noiseFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    if (this.distortionNode) {
      this.noiseGain.connect(this.distortionNode);
    }

    this.noiseSource.start();
  }

  public update(
    rpm: number,
    throttle: number,
    maxRpm: number,
    isCockpit: boolean,
    mix?: CameraAudioMix,
    isTorqueCut: boolean = false
  ): void {
    if (!this.isRunning || !this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;

    // 4-cylinder firing frequency: 2 power strokes per revolution
    // Idle 1,250 RPM => ~41.67 Hz fundamental
    const fundamentalFreq = Math.max(25, rpm / 30);
    const harmonicFreq = fundamentalFreq * 2.0;
    const subFreq = fundamentalFreq * 0.5;
    const valvetrainFreq = fundamentalFreq * 5.0;

    this.oscFundamental?.frequency.setTargetAtTime(fundamentalFreq, t, 0.025);
    this.oscHarmonic?.frequency.setTargetAtTime(harmonicFreq, t, 0.025);
    this.oscSub?.frequency.setTargetAtTime(subFreq, t, 0.025);
    this.oscValvetrain?.frequency.setTargetAtTime(valvetrainFreq, t, 0.03);

    // Update noise pulse resonance with engine speed
    if (this.noiseFilter) {
      this.noiseFilter.frequency.setTargetAtTime(fundamentalFreq * 2.5, t, 0.03);
    }

    // Filter opening on throttle and high RPM
    const rpmRatio = Math.max(0, Math.min(1, rpm / maxRpm));
    const baseCutoff = isCockpit ? 1700 : 1300;
    const targetCutoff = baseCutoff + throttle * 5200 + rpmRatio * 3400;
    const finalCutoff = mix ? Math.min(mix.lowpassCutoffHz, targetCutoff) : targetCutoff;
    this.filterNode?.frequency.setTargetAtTime(finalCutoff, t, 0.035);

    // Volume calculation with shift cut ignition suppression
    let baseVolume = 0.22 + throttle * 0.26 + rpmRatio * 0.18;
    if (isTorqueCut) {
      // Quickshifter ignition cut: instant drop in combustion volume
      baseVolume *= 0.15;
    }

    const cameraVolumeMod = isCockpit ? (mix ? mix.intakeVolume : 0.88) : (mix ? mix.exhaustVolume : 1.0);
    this.gainNode?.gain.setTargetAtTime(baseVolume * cameraVolumeMod, t, isTorqueCut ? 0.008 : 0.035);

    // Play quickshifter ignition blip on torque cut re-engage
    if (this.lastShiftState && !isTorqueCut) {
      this.triggerShiftIgnitionPop();
    }
    this.lastShiftState = isTorqueCut;
  }

  private triggerShiftIgnitionPop(): void {
    if (!this.filterNode || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.filterNode.frequency.setValueAtTime(2600, t);
    this.filterNode.frequency.exponentialRampToValueAtTime(1400, t + 0.06);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.oscFundamental?.stop();
    this.oscHarmonic?.stop();
    this.oscSub?.stop();
    this.oscValvetrain?.stop();
    this.noiseSource?.stop();

    this.oscFundamental?.disconnect();
    this.oscHarmonic?.disconnect();
    this.oscSub?.disconnect();
    this.oscValvetrain?.disconnect();
    this.noiseSource?.disconnect();
    this.noiseGain?.disconnect();
    this.noiseFilter?.disconnect();

    this.gainNode?.disconnect();
    this.filterNode?.disconnect();
    this.distortionNode?.disconnect();

    this.isRunning = false;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}
