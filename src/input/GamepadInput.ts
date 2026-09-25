import { InputState } from './KeyboardInput';

export class GamepadInput {
  public state: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    cameraToggle: false,
    recover: false,
    pause: false,
    debugToggle: false,
  };

  private prevButtons: boolean[] = [];

  public update(): void {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp || !gp.connected) {
      this.state.throttle = 0;
      this.state.brake = 0;
      this.state.steer = 0;
      return;
    }

    // Left analog stick X (axis 0) for steering
    const rawSteer = gp.axes[0] || 0;
    const deadzone = 0.12;
    if (Math.abs(rawSteer) > deadzone) {
      this.state.steer = (rawSteer - Math.sign(rawSteer) * deadzone) / (1.0 - deadzone);
    } else {
      this.state.steer = 0;
    }

    // Right Trigger (Button 7) for Throttle
    const rt = gp.buttons[7] ? gp.buttons[7].value : 0;
    // Left Trigger (Button 6) for Brake
    const lt = gp.buttons[6] ? gp.buttons[6].value : 0;

    // Face buttons: A / Cross (Button 0) alternative throttle, X / Square (Button 2) alternative brake
    const btnThrottle = gp.buttons[0]?.pressed ? 1.0 : 0.0;
    const btnBrake = gp.buttons[2]?.pressed ? 1.0 : 0.0;

    this.state.throttle = Math.max(rt, btnThrottle);
    this.state.brake = Math.max(lt, btnBrake);

    // Camera: Y / Triangle (Button 3)
    if (gp.buttons[3]?.pressed && !this.prevButtons[3]) {
      this.state.cameraToggle = true;
    }
    // Recover: B / Circle (Button 1) or Select (Button 8)
    if ((gp.buttons[1]?.pressed && !this.prevButtons[1]) || (gp.buttons[8]?.pressed && !this.prevButtons[8])) {
      this.state.recover = true;
    }
    // Pause: Start (Button 9)
    if (gp.buttons[9]?.pressed && !this.prevButtons[9]) {
      this.state.pause = true;
    }

    // Cache button states
    this.prevButtons = gp.buttons.map((b) => b?.pressed || false);
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
