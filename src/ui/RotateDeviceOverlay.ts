export class RotateDeviceOverlay {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'rideline-rotate-overlay';
    this.container.className = 'rotate-overlay-container hidden';

    this.container.innerHTML = `
      <div class="rotate-modal">
        <div class="rotate-icon-wrapper">
          <svg class="rotate-phone-icon" viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <path d="M12 18h.01"/>
            <path class="rotate-arrow" d="M19 8l3-3-3-3"/>
            <path class="rotate-arrow" d="M22 5h-4a5 5 0 0 0-5 5v1"/>
          </svg>
        </div>
        <h2 class="rotate-title">ROTATE YOUR DEVICE</h2>
        <p class="rotate-desc">RIDELINE is optimized for landscape high-speed motorcycle simulation.</p>
      </div>
    `;

    document.body.appendChild(this.container);

    window.addEventListener('resize', this.checkOrientation.bind(this));
    window.addEventListener('orientationchange', this.checkOrientation.bind(this));
    this.checkOrientation();
  }

  public checkOrientation(): void {
    const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 900;
    if (isPortrait) {
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.checkOrientation.bind(this));
    window.removeEventListener('orientationchange', this.checkOrientation.bind(this));
    this.container.remove();
  }
}
