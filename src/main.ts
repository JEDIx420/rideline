import './style.css';
import { Game } from './core/Game';

function init() {
  const game = new Game('renderCanvas');
  (window as unknown as { __RIDELINE_GAME__: Game }).__RIDELINE_GAME__ = game;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
