import { TouchInput } from '../input/TouchInput';

export class MobileControls {
  private container: HTMLElement;
  private steerTrack: HTMLElement | null = null;
  private steerKnob: HTMLElement | null = null;
  private btnGas: HTMLElement | null = null;
  private btnBrake: HTMLElement | null = null;
  private btnCam: HTMLElement | null = null;
  private btnRecover: HTMLElement | null = null;

  private isSteerActive: boolean = false;
  private steerTouchId: number | null = null;
  private steerStartX: number = 0;
  private steerMaxOffset: number = 60; // px
  private lastActivityTime: number = performance.now();
  private isFaded: boolean = false;

  constructor(private touchInput: TouchInput) {
    this.container = document.createElement('div');
    this.container.id = 'rideline-mobile-controls';
    this.container.className = 'mobile-controls-container hidden';

    this.container.innerHTML = `
      <!-- Left Thumb: Proportional Horizontal Steering Slider -->
      <div class="mobile-steer-zone">
        <div class="steer-slider-track" id="touch-steer-track">
          <div class="steer-arrow left">‹</div>
          <div class="steer-slider-knob" id="touch-steer-knob"></div>
          <div class="steer-arrow right">›</div>
        </div>
        <div class="steer-label">STEER</div>
      </div>

      <!-- Center Top Actions -->
      <div class="mobile-center-actions">
        <button id="btn-touch-cam" class="touch-btn action-btn" aria-label="Camera">
          <span>CAM</span>
        </button>
        <button id="btn-touch-recover" class="touch-btn action-btn" aria-label="Reset">
          <span>RESET</span>
        </button>
      </div>

      <!-- Right Thumb: Throttle & Brake Pedals -->
      <div class="mobile-pedal-cluster">
        <button id="btn-touch-brake" class="touch-btn pedal-btn brake-btn" aria-label="Brake">
          <span class="pedal-label">BRAKE</span>
        </button>
        <button id="btn-touch-gas" class="touch-btn pedal-btn gas-btn" aria-label="Throttle">
          <span class="pedal-label">GAS</span>
        </button>
      </div>
    `;

    document.body.appendChild(this.container);
    this.bindTouchEvents();
    this.startInactivityFader();
  }

  private bindTouchEvents(): void {
    this.steerTrack = document.getElementById('touch-steer-track');
    this.steerKnob = document.getElementById('touch-steer-knob');
    this.btnGas = document.getElementById('btn-touch-gas');
    this.btnBrake = document.getElementById('btn-touch-brake');
    this.btnCam = document.getElementById('btn-touch-cam');
    this.btnRecover = document.getElementById('btn-touch-recover');

    // Steering slider touch handling
    if (this.steerTrack && this.steerKnob) {
      this.steerTrack.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        this.resetInactivity();
        this.isSteerActive = true;
        this.steerTouchId = e.pointerId;
        const rect = this.steerTrack!.getBoundingClientRect();
        this.steerStartX = rect.left + rect.width / 2;
        this.updateSteeringFromPointer(e.clientX);
        this.steerTrack!.setPointerCapture(e.pointerId);
      });

      this.steerTrack.addEventListener('pointermove', (e: PointerEvent) => {
        if (this.isSteerActive && e.pointerId === this.steerTouchId) {
          e.preventDefault();
          this.resetInactivity();
          this.updateSteeringFromPointer(e.clientX);
        }
      });

      const endSteer = (e: PointerEvent) => {
        if (this.isSteerActive && e.pointerId === this.steerTouchId) {
          e.preventDefault();
          this.resetInactivity();
          this.isSteerActive = false;
          this.steerTouchId = null;
          this.touchInput.setSteer(0);
          if (this.steerKnob) {
            this.steerKnob.style.transform = `translateX(0px)`;
          }
        }
      };

      this.steerTrack.addEventListener('pointerup', endSteer);
      this.steerTrack.addEventListener('pointercancel', endSteer);
    }

    // Throttle Hold
    this.attachButtonHold(this.btnGas, (active) => {
      this.resetInactivity();
      this.touchInput.setThrottle(active ? 1.0 : 0.0);
    });

    // Brake Hold
    this.attachButtonHold(this.btnBrake, (active) => {
      this.resetInactivity();
      this.touchInput.setBrake(active ? 1.0 : 0.0);
    });

    // Instant Action Buttons
    this.btnCam?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.resetInactivity();
      this.touchInput.triggerCamera();
    });

    this.btnRecover?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.resetInactivity();
      this.touchInput.triggerRecover();
    });
  }

  private updateSteeringFromPointer(clientX: number): void {
    const delta = clientX - this.steerStartX;
    const clampedDelta = Math.max(-this.steerMaxOffset, Math.min(this.steerMaxOffset, delta));
    const steerRatio = clampedDelta / this.steerMaxOffset; // -1.0 to +1.0

    this.touchInput.setSteer(steerRatio);

    if (this.steerKnob) {
      this.steerKnob.style.transform = `translateX(${clampedDelta}px)`;
    }
  }

  private attachButtonHold(elem: HTMLElement | null, onStateChange: (active: boolean) => void): void {
    if (!elem) return;

    elem.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      elem.classList.add('active');
      onStateChange(true);
    });

    const onRelease = (e: Event) => {
      e.preventDefault();
      elem.classList.remove('active');
      onStateChange(false);
    };

    elem.addEventListener('pointerup', onRelease);
    elem.addEventListener('pointercancel', onRelease);
    elem.addEventListener('pointerleave', onRelease);
  }

  private resetInactivity(): void {
    this.lastActivityTime = performance.now();
    if (this.isFaded) {
      this.container.classList.remove('faded');
      this.isFaded = false;
    }
  }

  private startInactivityFader(): void {
    setInterval(() => {
      const now = performance.now();
      if (!this.isFaded && (now - this.lastActivityTime > 3000)) {
        this.container.classList.add('faded');
        this.isFaded = true;
      }
    }, 500);
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
