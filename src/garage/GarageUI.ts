import { BikeDefinition } from '../bikes/BikeDefinition';
import { BikeRegistry } from '../bikes/BikeRegistry';

export class GarageUI {
  private container: HTMLElement;
  private currentBikeIndex: number = 0;
  private bikes: BikeDefinition[] = [];

  private onSelectBikeCallbacks: ((bike: BikeDefinition) => void)[] = [];
  private onRideCallbacks: ((bike: BikeDefinition) => void)[] = [];
  private onSettingsClickCallbacks: (() => void)[] = [];

  // DOM Elements
  private bikeNameElem!: HTMLElement;
  private bikeYearElem!: HTMLElement;
  private bikeClassElem!: HTMLElement;
  private bikeHpElem!: HTMLElement;
  private bikeTorqueElem!: HTMLElement;
  private bikeWeightElem!: HTMLElement;
  private bikeRedlineElem!: HTMLElement;
  private bikeDotsContainer!: HTMLElement;

  constructor() {
    this.bikes = BikeRegistry.getAllBikes();

    this.container = document.createElement('div');
    this.container.id = 'rideline-garage-ui';
    this.container.className = 'garage-ui-container';

    this.container.innerHTML = `
      <!-- Top Bar -->
      <div class="garage-top-bar">
        <div class="garage-brand">
          <div class="garage-logo">RIDELINE</div>
        </div>
        <div class="garage-top-actions">
          <button id="btn-garage-settings" class="garage-action-btn" aria-label="Settings">
            <span class="icon">⚙</span>
            <span class="label">SETTINGS</span>
          </button>
        </div>
      </div>

      <!-- Main Stage Bike Specs Card -->
      <div class="garage-main-layout">
        <div class="garage-spec-card" id="garage-spec-card">
          <div class="spec-header">
            <span class="spec-year" id="spec-bike-year">2019</span>
            <span class="spec-class" id="spec-bike-class">BMW MOTORRAD</span>
          </div>
          <h1 class="spec-title" id="spec-bike-name">BMW S1000RR</h1>

          <div class="spec-metrics-grid">
            <div class="metric-box">
              <span class="metric-val" id="spec-bike-hp">207</span>
              <span class="metric-unit">HORSEPOWER</span>
              <div class="metric-bar"><div class="metric-bar-fill" id="bar-hp" style="width: 86%;"></div></div>
            </div>
            <div class="metric-box">
              <span class="metric-val" id="spec-bike-torque">113</span>
              <span class="metric-unit">TORQUE (Nm)</span>
              <div class="metric-bar"><div class="metric-bar-fill" id="bar-torque" style="width: 78%;"></div></div>
            </div>
            <div class="metric-box">
              <span class="metric-val" id="spec-bike-weight">197</span>
              <span class="metric-unit">WEIGHT (KG)</span>
              <div class="metric-bar"><div class="metric-bar-fill invert" id="bar-weight" style="width: 65%;"></div></div>
            </div>
            <div class="metric-box">
              <span class="metric-val" id="spec-bike-redline">14,500</span>
              <span class="metric-unit">MAX RPM</span>
              <div class="metric-bar"><div class="metric-bar-fill" id="bar-rpm" style="width: 90%;"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Selector and Action Strip -->
      <div class="garage-bottom-bar">
        <div class="garage-interaction-hint">
          <span>DRAG TO ORBIT 360°</span>
          <span class="dot">•</span>
          <span>PINCH / SCROLL TO ZOOM</span>
        </div>

        <div class="garage-controls-dock">
          <!-- Bike Carousel Navigation -->
          <div class="bike-carousel-nav">
            <button id="btn-bike-prev" class="carousel-nav-btn" aria-label="Previous Bike">‹</button>
            <div class="carousel-dots" id="garage-bike-dots"></div>
            <button id="btn-bike-next" class="carousel-nav-btn" aria-label="Next Bike">›</button>
          </div>

          <!-- Enter Ride CTA Button -->
          <button id="btn-garage-ride" class="btn-garage-ride">
            <span class="ride-icon">⚡</span>
            <span class="ride-text">ENTER RIDE</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.cacheElements();
    this.setupDots();
    this.bindEvents();
    this.updateBikeDisplay();
  }

  private cacheElements(): void {
    this.bikeNameElem = document.getElementById('spec-bike-name')!;
    this.bikeYearElem = document.getElementById('spec-bike-year')!;
    this.bikeClassElem = document.getElementById('spec-bike-class')!;
    this.bikeHpElem = document.getElementById('spec-bike-hp')!;
    this.bikeTorqueElem = document.getElementById('spec-bike-torque')!;
    this.bikeWeightElem = document.getElementById('spec-bike-weight')!;
    this.bikeRedlineElem = document.getElementById('spec-bike-redline')!;
    this.bikeDotsContainer = document.getElementById('garage-bike-dots')!;
  }

  private setupDots(): void {
    this.bikeDotsContainer.innerHTML = '';
    this.bikes.forEach((bike, idx) => {
      const dot = document.createElement('button');
      dot.className = `carousel-dot ${idx === this.currentBikeIndex ? 'active' : ''}`;
      dot.setAttribute('aria-label', bike.displayName);
      dot.addEventListener('click', () => {
        this.selectBikeIndex(idx);
      });
      this.bikeDotsContainer.appendChild(dot);
    });
  }

  private bindEvents(): void {
    const prevBtn = document.getElementById('btn-bike-prev');
    const nextBtn = document.getElementById('btn-bike-next');
    const rideBtn = document.getElementById('btn-garage-ride');
    const settingsBtn = document.getElementById('btn-garage-settings');

    prevBtn?.addEventListener('click', () => {
      const newIdx = (this.currentBikeIndex - 1 + this.bikes.length) % this.bikes.length;
      this.selectBikeIndex(newIdx);
    });

    nextBtn?.addEventListener('click', () => {
      const newIdx = (this.currentBikeIndex + 1) % this.bikes.length;
      this.selectBikeIndex(newIdx);
    });

    settingsBtn?.addEventListener('click', () => {
      for (const cb of this.onSettingsClickCallbacks) {
        cb();
      }
    });

    rideBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const currentBike = this.bikes[this.currentBikeIndex];
      for (const cb of this.onRideCallbacks) {
        cb(currentBike);
      }
    });
  }

  public selectBikeIndex(idx: number): void {
    this.currentBikeIndex = idx;
    this.updateBikeDisplay();
    const bike = this.bikes[this.currentBikeIndex];
    for (const cb of this.onSelectBikeCallbacks) {
      cb(bike);
    }
  }

  private updateBikeDisplay(): void {
    const bike = this.bikes[this.currentBikeIndex];
    if (!bike) return;

    this.bikeNameElem.textContent = bike.displayName.toUpperCase();
    this.bikeYearElem.textContent = bike.modelYear ? bike.modelYear.toString() : '2021';
    this.bikeClassElem.textContent = bike.manufacturer.toUpperCase();
    this.bikeHpElem.textContent = bike.engine.peakPowerHp.toString();
    this.bikeTorqueElem.textContent = bike.engine.peakTorqueNm.toString();
    this.bikeWeightElem.textContent = bike.physics.massKg.toString();
    this.bikeRedlineElem.textContent = bike.engine.redlineRpm.toLocaleString();

    // Update Dots
    const dots = this.bikeDotsContainer.querySelectorAll('.carousel-dot');
    dots.forEach((dot, idx) => {
      if (idx === this.currentBikeIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  public onSelectBike(callback: (bike: BikeDefinition) => void): void {
    this.onSelectBikeCallbacks.push(callback);
  }

  public onRide(callback: (bike: BikeDefinition) => void): void {
    this.onRideCallbacks.push(callback);
  }

  public onSettingsClick(callback: () => void): void {
    this.onSettingsClickCallbacks.push(callback);
  }

  public show(): void {
    this.container.classList.remove('hidden');
  }

  public hide(): void {
    this.container.classList.add('hidden');
  }

  public getSelectedBike(): BikeDefinition {
    return this.bikes[this.currentBikeIndex];
  }

  public dispose(): void {
    this.container.remove();
  }
}
