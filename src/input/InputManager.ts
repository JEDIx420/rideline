import { KeyboardInput, InputState } from './KeyboardInput';
import { TouchInput } from './TouchInput';
import { GamepadInput } from './GamepadInput';

export class InputManager {
  public keyboard: KeyboardInput;
  public touch: TouchInput;
  public gamepad: GamepadInput;

  public current: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    cameraToggle: false,
    recover: false,
    pause: false,
    debugToggle: false,
  };

  constructor() {
    this.keyboard = new KeyboardInput();
    this.touch = new TouchInput();
    this.gamepad = new GamepadInput();
  }

  public update(): void {
    this.gamepad.update();

    const kbTriggers = this.keyboard.consumeTriggers();
    const touchTriggers = this.touch.consumeTriggers();
    const gpTriggers = this.gamepad.consumeTriggers();

    // Aggregate continuous axes
    this.current.throttle = Math.max(
      this.keyboard.state.throttle,
      this.touch.state.throttle,
      this.gamepad.state.throttle
    );

    this.current.brake = Math.max(
      this.keyboard.state.brake,
      this.touch.state.brake,
      this.gamepad.state.brake
    );

    // Steer prioritization: touch/gamepad analog over binary keyboard
    if (Math.abs(this.touch.state.steer) > 0.01) {
      this.current.steer = this.touch.state.steer;
    } else if (Math.abs(this.gamepad.state.steer) > 0.05) {
      this.current.steer = this.gamepad.state.steer;
    } else {
      this.current.steer = this.keyboard.state.steer;
    }

    // Trigger events
    this.current.cameraToggle = kbTriggers.cameraToggle || touchTriggers.cameraToggle || gpTriggers.cameraToggle;
    this.current.recover = kbTriggers.recover || touchTriggers.recover || gpTriggers.recover;
    this.current.pause = kbTriggers.pause || touchTriggers.pause || gpTriggers.pause;
    this.current.debugToggle = kbTriggers.debugToggle;
  }

  public dispose(): void {
    this.keyboard.dispose();
  }
}
