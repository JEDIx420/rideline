import { GraphicsQuality } from '../config/graphics';
import { CameraMode } from '../cameras/CameraManager';

export interface SettingsState {
  graphicsQuality: GraphicsQuality;
  masterVolume: number; // 0 to 1
  sfxVolume: number;    // 0 to 1
  musicVolume: number;  // 0 to 1
  isMuted: boolean;
  defaultCamera: CameraMode;
}

export class SettingsModal {
  private container: HTMLElement;
  private isOpen: boolean = false;
  private state: SettingsState = {
    graphicsQuality: 'balanced',
    masterVolume: 0.85,
    sfxVolume: 0.85,
    musicVolume: 0.75,
    isMuted: false,
    defaultCamera: 'chase',
  };

  private onSettingsChangeCallbacks: ((state: SettingsState) => void)[] = [];

  constructor() {
    this.loadPersistedSettings();
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
            <div class="settings-label">AUDIO CHANNELS & VOLUME</div>
            
            <!-- Master & Mute -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 11px; color: #8899a6; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>MASTER OUTPUT</span>
                <span id="settings-volume-val">${Math.round(this.state.masterVolume * 100)}%</span>
              </div>
              <div class="audio-control-row">
                <button id="btn-mute-toggle" class="audio-mute-btn" title="Toggle Mute">
                  <span id="mute-icon">${this.state.isMuted ? '🔇' : '🔊'}</span>
                </button>
                <div class="slider-wrapper">
                  <input type="range" id="settings-volume-slider" min="0" max="100" value="${Math.round(this.state.masterVolume * 100)}" class="range-slider" />
                </div>
              </div>
            </div>

            <!-- Engine & SFX Volume -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 11px; color: #8899a6; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>ENGINE & SFX SOUND</span>
                <span id="settings-sfx-val">${Math.round(this.state.sfxVolume * 100)}%</span>
              </div>
              <div class="slider-wrapper">
                <input type="range" id="settings-sfx-slider" min="0" max="100" value="${Math.round(this.state.sfxVolume * 100)}" class="range-slider" />
              </div>
            </div>

            <!-- Music & Loading Track Volume -->
            <div>
              <div style="font-size: 11px; color: #8899a6; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span>MUSIC & SOUNDTRACK</span>
                <span id="settings-music-val">${Math.round(this.state.musicVolume * 100)}%</span>
              </div>
              <div class="slider-wrapper">
                <input type="range" id="settings-music-slider" min="0" max="100" value="${Math.round(this.state.musicVolume * 100)}" class="range-slider" />
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
      this.savePersistedSettings();
      this.emitChange();
    });

    // SFX Slider
    const sfxSlider = document.getElementById('settings-sfx-slider') as HTMLInputElement;
    const sfxVal = document.getElementById('settings-sfx-val');
    sfxSlider?.addEventListener('input', () => {
      const val = parseInt(sfxSlider.value, 10);
      if (sfxVal) sfxVal.textContent = `${val}%`;
      this.state.sfxVolume = val / 100;
      this.savePersistedSettings();
      this.emitChange();
    });

    // Music Slider
    const musicSlider = document.getElementById('settings-music-slider') as HTMLInputElement;
    const musicVal = document.getElementById('settings-music-val');
    musicSlider?.addEventListener('input', () => {
      const val = parseInt(musicSlider.value, 10);
      if (musicVal) musicVal.textContent = `${val}%`;
      this.state.musicVolume = val / 100;
      this.savePersistedSettings();
      this.emitChange();
    });

    // Mute Toggle
    muteBtn?.addEventListener('click', () => {
      this.state.isMuted = !this.state.isMuted;
      if (muteIcon) muteIcon.textContent = this.state.isMuted ? '🔇' : '🔊';
      this.savePersistedSettings();
      this.emitChange();
    });
  }

  private loadPersistedSettings(): void {
    try {
      const saved = localStorage.getItem('rideline_user_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.masterVolume === 'number') this.state.masterVolume = parsed.masterVolume;
        if (typeof parsed.sfxVolume === 'number') this.state.sfxVolume = parsed.sfxVolume;
        if (typeof parsed.musicVolume === 'number') this.state.musicVolume = parsed.musicVolume;
        if (typeof parsed.isMuted === 'boolean') this.state.isMuted = parsed.isMuted;
        if (parsed.graphicsQuality) this.state.graphicsQuality = parsed.graphicsQuality;
        if (parsed.defaultCamera) this.state.defaultCamera = parsed.defaultCamera;
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  private savePersistedSettings(): void {
    try {
      localStorage.setItem('rideline_user_settings', JSON.stringify(this.state));
    } catch {
      // Ignore localStorage write errors
    }
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
