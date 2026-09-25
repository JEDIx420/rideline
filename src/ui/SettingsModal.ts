import { GraphicsQuality } from '../config/graphics';
import { CameraMode } from '../cameras/CameraManager';

export interface SettingsState {
  graphicsQuality: GraphicsQuality;
  masterVolume: number; // 0 to 1
  isMuted: boolean;
  defaultCamera: CameraMode;
}

export class SettingsModal {
  private container: HTMLElement;
  private isOpen: boolean = false;
  private state: SettingsState = {
    graphicsQuality: 'balanced',
    masterVolume: 0.85,
    isMuted: false,
    defaultCamera: 'chase',
  };

  private onSettingsChangeCallbacks: ((state: SettingsState) => void)[] = [];

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'rideline-settings-modal';
    this.container.className = 'settings-modal-overlay hidden';

    this.container.innerHTML = `
      <div class="settings-dialog">
        <div class="settings-header">
          <div class="settings-title-wrap">
            <span class="settings-icon">⚙</span>
            <span class="settings-title">SETTINGS & CONFIGURATION</span>
          </div>
          <button id="btn-settings-close" class="settings-close-btn" aria-label="Close">✕</button>
        </div>

        <div class="settings-body">
          <!-- Graphics Presets -->
          <div class="settings-section">
            <div class="settings-label">GRAPHICS PRESET</div>
            <div class="settings-pills" id="settings-graphics-pills">
              <button class="settings-pill" data-quality="performance">
                <span class="pill-title">PERFORMANCE</span>
                <span class="pill-desc">Max FPS / Low FX</span>
              </button>
              <button class="settings-pill active" data-quality="balanced">
                <span class="pill-title">BALANCED</span>
                <span class="pill-desc">Crisp / PC & Mobile</span>
              </button>
              <button class="settings-pill" data-quality="quality">
                <span class="pill-title">ULTRA QUALITY</span>
                <span class="pill-desc">4K Shadows / 16x IBL</span>
              </button>
            </div>
          </div>

          <!-- Audio Configuration -->
          <div class="settings-section">
            <div class="settings-label">AUDIO & ENGINE SOUND</div>
            <div class="audio-control-row">
              <button id="btn-mute-toggle" class="audio-mute-btn">
                <span id="mute-icon">🔊</span>
              </button>
              <div class="slider-wrapper">
                <input type="range" id="settings-volume-slider" min="0" max="100" value="85" class="range-slider" />
                <span id="settings-volume-val" class="slider-value">85%</span>
              </div>
            </div>
          </div>

          <!-- Camera Default Preference -->
          <div class="settings-section">
            <div class="settings-label">DEFAULT CAMERA PERSPECTIVE</div>
            <div class="settings-pills" id="settings-camera-pills">
              <button class="settings-pill active" data-camera="chase">
                <span class="pill-title">CHASE 3RD-PERSON</span>
                <span class="pill-desc">Dynamic speed camera</span>
              </button>
              <button class="settings-pill" data-camera="cockpit">
                <span class="pill-title">COCKPIT POV</span>
                <span class="pill-desc">Windscreens & clip-ons</span>
              </button>
            </div>
          </div>

          <!-- Controls Quick Reference -->
          <div class="settings-section">
            <div class="settings-label">CONTROLS REFERENCE</div>
            <div class="controls-table">
              <div class="ctrl-row"><span class="ctrl-key">W / UP / TOUCH GAS</span><span class="ctrl-desc">Throttle</span></div>
              <div class="ctrl-row"><span class="ctrl-key">S / DOWN / TOUCH BRK</span><span class="ctrl-desc">Front & Rear Brakes</span></div>
              <div class="ctrl-row"><span class="ctrl-key">A / D / TOUCH SLIDER</span><span class="ctrl-desc">Countersteer & Lean</span></div>
              <div class="ctrl-row"><span class="ctrl-key">SPACE</span><span class="ctrl-desc">Rear Handbrake</span></div>
              <div class="ctrl-row"><span class="ctrl-key">C / CAM BUTTON</span><span class="ctrl-desc">Toggle Chase / Cockpit POV</span></div>
              <div class="ctrl-row"><span class="ctrl-key">R / RESET BUTTON</span><span class="ctrl-desc">Recover Bike to Centerline</span></div>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button id="btn-settings-save" class="btn-settings-confirm">APPLY & CLOSE</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.bindEvents();
  }

  private bindEvents(): void {
    const closeBtn = document.getElementById('btn-settings-close');
    const saveBtn = document.getElementById('btn-settings-save');
    const volSlider = document.getElementById('settings-volume-slider') as HTMLInputElement;
    const volVal = document.getElementById('settings-volume-val');
    const muteBtn = document.getElementById('btn-mute-toggle');
    const muteIcon = document.getElementById('mute-icon');

    closeBtn?.addEventListener('click', () => this.hide());
    saveBtn?.addEventListener('click', () => this.hide());

    // Graphics pills
    const gPills = document.querySelectorAll('#settings-graphics-pills .settings-pill');
    gPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        gPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const q = pill.getAttribute('data-quality') as GraphicsQuality;
        this.state.graphicsQuality = q;
        this.emitChange();
      });
    });

    // Camera pills
    const cPills = document.querySelectorAll('#settings-camera-pills .settings-pill');
    cPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        cPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const c = pill.getAttribute('data-camera') as CameraMode;
        this.state.defaultCamera = c;
        this.emitChange();
      });
    });

    // Volume Slider
    volSlider?.addEventListener('input', () => {
      const val = parseInt(volSlider.value, 10);
      if (volVal) volVal.textContent = `${val}%`;
      this.state.masterVolume = val / 100;
      this.state.isMuted = val === 0;
      if (muteIcon) muteIcon.textContent = this.state.isMuted ? '🔇' : '🔊';
      this.emitChange();
    });

    // Mute Toggle
    muteBtn?.addEventListener('click', () => {
      this.state.isMuted = !this.state.isMuted;
      if (muteIcon) muteIcon.textContent = this.state.isMuted ? '🔇' : '🔊';
      this.emitChange();
    });
  }

  public show(): void {
    this.isOpen = true;
    this.container.classList.remove('hidden');
  }

  public hide(): void {
    this.isOpen = false;
    this.container.classList.add('hidden');
  }

  public toggle(): void {
    if (this.isOpen) this.hide();
    else this.show();
  }

  public onSettingsChange(callback: (state: SettingsState) => void): void {
    this.onSettingsChangeCallbacks.push(callback);
  }

  private emitChange(): void {
    for (const cb of this.onSettingsChangeCallbacks) {
      cb({ ...this.state });
    }
  }

  public getState(): SettingsState {
    return { ...this.state };
  }
}
