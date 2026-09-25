import { InputState } from './KeyboardInput';

export class TouchInput {
  public state: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    cameraToggle: false,
    recover: false,
    pause: false,
    debugToggle: false,
  };

  public isTouchDevice: boolean = false;

  constructor() {
    this.isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
  }

  public setThrottle(val: number): void {
    this.state.throttle = Math.max(0, Math.min(1, val));
  }

  public setBrake(val: number): void {
    this.state.brake = Math.max(0, Math.min(1, val));
  }

  public setSteer(val: number): void {
    this.state.steer = Math.max(-1, Math.min(1, val));
  }

  public triggerCamera(): void {
    this.state.cameraToggle = true;
  }

  public triggerRecover(): void {
    this.state.recover = true;
  }

  public triggerPause(): void {
    this.state.pause = true;
  }

  public consumeTriggers(): { cameraToggle: boolean; recover: boolean; pause: boolean } {
    const triggers = {
      cameraToggle: this.state.cameraToggle,
      recover: this.state.recover,
      pause: this.state.pause,
    };
    this.state.cameraToggle = false;
    this.state.recover = false;
    this.state.pause = false;
    return triggers;
  }
}
