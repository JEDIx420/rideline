import { AudioManager } from '../audio/AudioManager';

export class SoundUnlockPrompt {
  private elem: HTMLElement;

  constructor(private audioManager: AudioManager) {
    this.elem = document.createElement('div');
    this.elem.id = 'sound-unlock-prompt';
    this.elem.className = 'sound-unlock-badge hidden';
    this.elem.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      </svg>
      <span>TAP FOR SOUND</span>
    `;

    document.body.appendChild(this.elem);

    this.elem.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.audioManager.unlock();
      this.hide();
    });

    this.audioManager.onStateChange((state) => {
      if (state === 'running') {
        this.hide();
      } else if (state === 'suspended' && this.audioManager.isUnlocked) {
        this.show();
      }
    });
  }

  public show(): void {
    this.elem.classList.remove('hidden');
  }

  public hide(): void {
    this.elem.classList.add('hidden');
  }

  public dispose(): void {
    this.elem.remove();
  }
}
