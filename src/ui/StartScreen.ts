import { BikeRegistry } from '../bikes/BikeRegistry';
import { BikeDefinition } from '../bikes/BikeDefinition';
import { GraphicsQuality, GRAPHICS_PRESETS } from '../config/graphics';

export interface StartScreenResult {
  selectedBike: BikeDefinition;
  selectedQuality: GraphicsQuality;
}

export class StartScreen {
  private container: HTMLElement;
  private selectedBike: BikeDefinition;
  private selectedQuality: GraphicsQuality = 'balanced';
  private onRideCallback: ((result: StartScreenResult) => void) | null = null;

  constructor() {
    this.selectedBike = BikeRegistry.getDefaultBike();
    this.container = document.createElement('div');
    this.container.id = 'rideline-start-screen';
    this.container.className = 'start-screen-container';

    this.render();
    document.body.appendChild(this.container);
  }

  private render(): void {
    const bikes = BikeRegistry.getAllBikes();

    this.container.innerHTML = `
      <div class="start-modal">
        <div class="logo-section">
          <h1 class="game-logo">RIDELINE</h1>
          <p class="game-tagline">INFINITE ROADS AHEAD</p>
          <div class="milestone-pill">MILESTONE 1 &bull; PROVING GROUND</div>
        </div>

        <div class="menu-section">
          <div class="section-label">SELECT MOTORCYCLE</div>
          <div class="bike-selector-cards" id="bike-selector-container">
            ${bikes
              .map(
                (b) => `
              <div class="bike-card ${b.id === this.selectedBike.id ? 'selected' : ''}" data-bike-id="${b.id}">
                <div class="bike-card-header">
                  <span class="bike-mfr">${b.manufacturer}</span>
                  <span class="bike-year">${b.modelYear}</span>
                </div>
                <div class="bike-name">${b.displayName}</div>
                <div class="bike-specs">
                  <span>${b.engine.peakPowerHp} HP</span> &bull; 
                  <span>${b.engine.peakTorqueNm} NM</span> &bull; 
                  <span>${b.physics.massKg} KG</span>
                </div>
                <p class="bike-desc">${b.description}</p>
              </div>
            `
              )
              .join('')}
          </div>

          <div class="section-label" style="margin-top: 1.25rem;">GRAPHICS PRESET</div>
          <div class="quality-selector-pills">
            ${(Object.keys(GRAPHICS_PRESETS) as GraphicsQuality[])
              .map(
                (q) => `
              <button class="quality-pill ${q === this.selectedQuality ? 'selected' : ''}" data-quality="${q}">
                ${GRAPHICS_PRESETS[q].label}
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="controls-guide">
          <div class="guide-col">
            <span class="guide-key">W / &uarr;</span> <span>Throttle</span>
          </div>
          <div class="guide-col">
            <span class="guide-key">S / &darr;</span> <span>Brake</span>
          </div>
          <div class="guide-col">
            <span class="guide-key">A / D</span> <span>Steer</span>
          </div>
          <div class="guide-col">
            <span class="guide-key">C</span> <span>Camera View</span>
          </div>
          <div class="guide-col">
            <span class="guide-key">R</span> <span>Recover Bike</span>
          </div>
        </div>

        <div class="action-section">
          <button id="btn-start-ride" class="btn-ride">
            <span>ENTER RIDE</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private attachEvents(): void {
    const bikeCards = this.container.querySelectorAll('.bike-card');
    bikeCards.forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-bike-id');
        const bike = BikeRegistry.getBike(id || '');
        if (bike) {
          this.selectedBike = bike;
          bikeCards.forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
        }
      });
    });

    const qualityPills = this.container.querySelectorAll('.quality-pill');
    qualityPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const q = pill.getAttribute('data-quality') as GraphicsQuality;
        if (q) {
          this.selectedQuality = q;
          qualityPills.forEach((p) => p.classList.remove('selected'));
          pill.classList.add('selected');
        }
      });
    });

    const btnRide = this.container.querySelector('#btn-start-ride');
    btnRide?.addEventListener('click', () => {
      this.hide();
      if (this.onRideCallback) {
        this.onRideCallback({
          selectedBike: this.selectedBike,
          selectedQuality: this.selectedQuality,
        });
      }
    });
  }

  public onRide(callback: (result: StartScreenResult) => void): void {
    this.onRideCallback = callback;
  }

  public show(): void {
    this.container.classList.remove('hidden');
  }

  public hide(): void {
    this.container.classList.add('hidden');
  }

  public dispose(): void {
    this.container.remove();
  }
}
