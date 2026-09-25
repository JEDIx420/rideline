import { TouchInput } from '../input/TouchInput';

export class MobileControls {
  private container: HTMLElement;
  private btnGas: HTMLElement | null = null;
  private btnBrake: HTMLElement | null = null;
  private btnLeft: HTMLElement | null = null;
  private btnRight: HTMLElement | null = null;
  private btnCam: HTMLElement | null = null;
  private btnRecover: HTMLElement | null = null;

  constructor(private touchInput: TouchInput) {
    this.container = document.createElement('div');
    this.container.id = 'rideline-mobile-controls';
    this.container.className = 'mobile-controls-container hidden';

    this.container.innerHTML = `
      <!-- Left Steering Area -->
      <div class="mobile-steer-cluster">
        <button id="btn-touch-left" class="touch-btn steer-btn" aria-label="Steer Left">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <button id="btn-touch-right" class="touch-btn steer-btn" aria-label="Steer Right">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>

      <!-- Center Utility Actions -->
      <div class="mobile-center-actions">
        <button id="btn-touch-cam" class="touch-btn action-btn">
          <span>CAM</span>
        </button>
        <button id="btn-touch-recover" class="touch-btn action-btn">
          <span>RESET</span>
        </button>
      </div>

      <!-- Right Throttle & Brake Area -->
      <div class="mobile-pedal-cluster">
        <button id="btn-touch-brake" class="touch-btn pedal-btn brake-btn" aria-label="Brake">
          <span>BRAKE</span>
        </button>
        <button id="btn-touch-gas" class="touch-btn pedal-btn gas-btn" aria-label="Throttle">
          <span>GAS</span>
        </button>
      </div>
    `;

    document.body.appendChild(this.container);
    this.bindTouchEvents();
  }

  private bindTouchEvents(): void {
    this.btnGas = document.getElementById('btn-touch-gas');
    this.btnBrake = document.getElementById('btn-touch-brake');
    this.btnLeft = document.getElementById('btn-touch-left');
    this.btnRight = document.getElementById('btn-touch-right');
    this.btnCam = document.getElementById('btn-touch-cam');
    this.btnRecover = document.getElementById('btn-touch-recover');

    // Throttle
    this.attachButtonHold(this.btnGas, (active) => {
      this.touchInput.setThrottle(active ? 1.0 : 0.0);
    });

    // Brake
    this.attachButtonHold(this.btnBrake, (active) => {
      this.touchInput.setBrake(active ? 1.0 : 0.0);
    });

    // Steering
    let isLeftDown = false;
    let isRightDown = false;

    const updateSteer = () => {
      if (isLeftDown && !isRightDown) {
        this.touchInput.setSteer(-1.0);
      } else if (isRightDown && !isLeftDown) {
        this.touchInput.setSteer(1.0);
      } else {
        this.touchInput.setSteer(0.0);
      }
    };

    this.attachButtonHold(this.btnLeft, (active) => {
      isLeftDown = active;
      updateSteer();
    });

    this.attachButtonHold(this.btnRight, (active) => {
      isRightDown = active;
      updateSteer();
    });

    // Instant Action Buttons
    this.btnCam?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchInput.triggerCamera();
    });

    this.btnRecover?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchInput.triggerRecover();
    });
  }

  private attachButtonHold(elem: HTMLElement | null, onStateChange: (active: boolean) => void): void {
    if (!elem) return;

    elem.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      elem.classList.add('active');
      onStateChange(true);
    });

    elem.addEventListener('pointerup', (e) => {
      e.preventDefault();
      elem.classList.remove('active');
      onStateChange(false);
    });

    elem.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      elem.classList.remove('active');
      onStateChange(false);
    });

    elem.addEventListener('pointerleave', (e) => {
      e.preventDefault();
      elem.classList.remove('active');
      onStateChange(false);
    });
  }

  public show(): void {
    if (this.touchInput.isTouchDevice || window.innerWidth <= 900) {
      this.container.classList.remove('hidden');
    }
  }

  public hide(): void {
    this.container.classList.add('hidden');
  }

  public dispose(): void {
    this.container.remove();
  }
}
