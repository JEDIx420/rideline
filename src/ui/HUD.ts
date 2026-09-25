import { BikeController } from '../bikes/BikeController';
import { CameraMode } from '../cameras/CameraManager';

export class HUD {
  private container: HTMLElement;
  private speedElem: HTMLElement;
  private gearElem: HTMLElement;
  private rpmElem: HTMLElement;
  private rpmFillElem: HTMLElement;
  private throttleFillElem: HTMLElement;
  private brakeFillElem: HTMLElement;
  private cameraBadgeElem: HTMLElement;
  private shiftLightsElem: HTMLElement;
  private telemetryClusterElem: HTMLElement;

  private onCamClickCallbacks: (() => void)[] = [];
  private onRecoverClickCallbacks: (() => void)[] = [];
  private onSettingsClickCallbacks: (() => void)[] = [];

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'rideline-hud';
    this.container.className = 'hud-container hidden';

    this.container.innerHTML = `
      <!-- Top Action Bar -->
      <div class="hud-top-bar">
        <div class="hud-brand">
          <span class="brand-title">RIDELINE</span>
          <span class="brand-sub">PROVING GROUND</span>
        </div>
        <div class="hud-top-actions">
          <button id="hud-cam-badge" class="hud-btn-pill badge" aria-label="Toggle Camera">
            <span class="cam-icon">📷</span>
            <span id="hud-cam-label">CHASE POV</span>
          </button>
          <button id="hud-btn-recover" class="hud-btn-pill" aria-label="Recover Bike">
            <span>⟲ RECOVER</span>
          </button>
          <button id="hud-btn-settings" class="hud-btn-pill" aria-label="Settings">
            <span>⚙</span>
          </button>
        </div>
      </div>

      <!-- Bottom Right Corner Sleek Telemetry Cluster -->
      <div class="hud-telemetry" id="hud-telemetry-cluster">
        <!-- Tachometer & Shift Lights -->
        <div class="tachometer-wrapper">
          <div class="shift-lights" id="hud-shift-lights">
            <span class="shift-led green"></span>
            <span class="shift-led green"></span>
            <span class="shift-led yellow"></span>
            <span class="shift-led yellow"></span>
            <span class="shift-led red"></span>
            <span class="shift-led red"></span>
          </div>
          <div class="rpm-bar-container">
            <div class="rpm-bar-fill" id="hud-rpm-fill"></div>
          </div>
          <div class="rpm-readout"><span id="hud-rpm-val">1250</span> <span class="unit">RPM</span></div>
        </div>

        <div class="speed-gear-cluster">
          <div class="speed-box">
            <span class="speed-num" id="hud-speed-val">0</span>
            <span class="speed-unit">KM/H</span>
          </div>
          <div class="gear-box">
            <span class="gear-label">GEAR</span>
            <span class="gear-num" id="hud-gear-val">1</span>
          </div>
        </div>

        <!-- Pedals / Inputs Feedback -->
        <div class="input-meters">
          <div class="input-meter brake">
            <div class="meter-fill" id="hud-brake-fill"></div>
            <span class="meter-label">BRK</span>
          </div>
          <div class="input-meter throttle">
            <div class="meter-fill" id="hud-throttle-fill"></div>
            <span class="meter-label">THR</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.speedElem = document.getElementById('hud-speed-val')!;
    this.gearElem = document.getElementById('hud-gear-val')!;
    this.rpmElem = document.getElementById('hud-rpm-val')!;
    this.rpmFillElem = document.getElementById('hud-rpm-fill')!;
    this.throttleFillElem = document.getElementById('hud-throttle-fill')!;
    this.brakeFillElem = document.getElementById('hud-brake-fill')!;
    this.cameraBadgeElem = document.getElementById('hud-cam-badge')!;
    this.shiftLightsElem = document.getElementById('hud-shift-lights')!;
    this.telemetryClusterElem = document.getElementById('hud-telemetry-cluster')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    const camBtn = document.getElementById('hud-cam-badge');
    const recoverBtn = document.getElementById('hud-btn-recover');
    const settingsBtn = document.getElementById('hud-btn-settings');

    camBtn?.addEventListener('click', () => {
      for (const cb of this.onCamClickCallbacks) cb();
    });

    recoverBtn?.addEventListener('click', () => {
      for (const cb of this.onRecoverClickCallbacks) cb();
    });

    settingsBtn?.addEventListener('click', () => {
      for (const cb of this.onSettingsClickCallbacks) cb();
    });
  }

  public onCameraToggle(callback: () => void): void {
    this.onCamClickCallbacks.push(callback);
  }

  public onRecover(callback: () => void): void {
    this.onRecoverClickCallbacks.push(callback);
  }

  public onOpenSettings(callback: () => void): void {
    this.onSettingsClickCallbacks.push(callback);
  }

  public show(): void {
    this.container.classList.remove('hidden');
  }

  public hide(): void {
    this.container.classList.add('hidden');
  }

  public update(bike: BikeController, cameraMode: CameraMode, throttle: number, brake: number): void {
    const speed = Math.round(bike.speedKmh);
    const rpm = Math.round(bike.currentRpm);
    const gear = bike.currentGear === 0 ? 'N' : bike.currentGear.toString();
    const rpmRatio = Math.min(1.0, bike.normalizedRpm);

    this.speedElem.textContent = speed.toString();
    this.gearElem.textContent = gear;
    this.rpmElem.textContent = rpm.toString();

    // Fill bars
    this.rpmFillElem.style.width = `${(rpmRatio * 100).toFixed(1)}%`;
    this.throttleFillElem.style.height = `${(throttle * 100).toFixed(1)}%`;
    this.brakeFillElem.style.height = `${(brake * 100).toFixed(1)}%`;

    // Camera badge & Cockpit HUD tuning
    const camLabel = document.getElementById('hud-cam-label');
    if (cameraMode === 'cockpit') {
      if (camLabel) camLabel.textContent = 'COCKPIT POV';
      this.cameraBadgeElem.classList.add('cockpit');
      // In cockpit mode, make the corner HUD super subtle and compact
      this.telemetryClusterElem.classList.add('cockpit-mode');
    } else {
      if (camLabel) camLabel.textContent = 'CHASE POV';
      this.cameraBadgeElem.classList.remove('cockpit');
      this.telemetryClusterElem.classList.remove('cockpit-mode');
    }

    // Shift lights animation
    const leds = this.shiftLightsElem.children;
    for (let i = 0; i < leds.length; i++) {
      const threshold = 0.72 + (i / leds.length) * 0.26;
      if (rpmRatio >= threshold) {
        leds[i].classList.add('active');
      } else {
        leds[i].classList.remove('active');
      }
    }
  }

  public dispose(): void {
    this.container.remove();
  }
}
