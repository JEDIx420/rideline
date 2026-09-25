export class WindAudio {
  private noiseNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private isRunning: boolean = false;

  constructor(private ctx: AudioContext, private destination: AudioNode) {}

  public start(): void {
    if (this.isRunning) return;

    // Generate 2 seconds of white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'bandpass';
    this.filterNode.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.noiseNode.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.destination);

    this.noiseNode.start();
    this.isRunning = true;
  }

  public update(speedKmh: number, isCockpit: boolean): void {
    if (!this.isRunning || !this.ctx || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const speedRatio = Math.min(1.0, speedKmh / 260.0); // 0 at stop, 1 at 260 km/h

    // Wind volume rises with square of speed
    const baseGain = Math.pow(speedRatio, 1.8) * 0.35;
    const cockpitBoost = isCockpit ? 1.25 : 1.0;
    this.gainNode?.gain.setTargetAtTime(baseGain * cockpitBoost, t, 0.08);

    // Wind rush pitch shifts up with speed
    const cutoff = 300 + speedRatio * 1800;
    this.filterNode?.frequency.setTargetAtTime(cutoff, t, 0.08);
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.noiseNode?.stop();
    this.noiseNode?.disconnect();
    this.filterNode?.disconnect();
    this.gainNode?.disconnect();
    this.isRunning = false;
  }
}
