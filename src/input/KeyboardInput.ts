export interface InputState {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to +1 (right)
  cameraToggle: boolean;
  recover: boolean;
  pause: boolean;
  debugToggle: boolean;
}

export class KeyboardInput {
  public state: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    cameraToggle: false,
    recover: false,
    pause: false,
    debugToggle: false,
  };

  private keysDown: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const code = e.code;

    // Prevent default browser scrolling for game keys
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 's', 'a', 'd', 'c', 'r', 'escape'].includes(key) || code === 'Space') {
      e.preventDefault();
    }

    this.keysDown.add(key);
    this.keysDown.add(code.toLowerCase());

    if (key === 'c') this.state.cameraToggle = true;
    if (key === 'r') this.state.recover = true;
    if (key === 'escape') this.state.pause = true;
    if (key === 'f3' || key === 'p') this.state.debugToggle = true;

    this.updateContinuousAxes();
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const code = e.code;

    this.keysDown.delete(key);
    this.keysDown.delete(code.toLowerCase());

    this.updateContinuousAxes();
  }

  private updateContinuousAxes(): void {
    // Throttle: W, ArrowUp
    const isUp = this.keysDown.has('w') || this.keysDown.has('arrowup');
    this.state.throttle = isUp ? 1.0 : 0.0;

    // Brake: S, ArrowDown, Space
    const isDown = this.keysDown.has('s') || this.keysDown.has('arrowdown') || this.keysDown.has('space');
    this.state.brake = isDown ? 1.0 : 0.0;

    // Steer: A / Left (-1), D / Right (+1)
    const isLeft = this.keysDown.has('a') || this.keysDown.has('arrowleft');
    const isRight = this.keysDown.has('d') || this.keysDown.has('arrowright');

    if (isLeft && !isRight) {
      this.state.steer = -1.0;
    } else if (isRight && !isLeft) {
      this.state.steer = 1.0;
    } else {
      this.state.steer = 0.0;
    }
  }

  public consumeTriggers(): { cameraToggle: boolean; recover: boolean; pause: boolean; debugToggle: boolean } {
    const triggers = {
      cameraToggle: this.state.cameraToggle,
      recover: this.state.recover,
      pause: this.state.pause,
      debugToggle: this.state.debugToggle,
    };
    this.state.cameraToggle = false;
    this.state.recover = false;
    this.state.pause = false;
    this.state.debugToggle = false;
    return triggers;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
