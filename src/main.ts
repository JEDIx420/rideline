import './style.css';
import { Game } from './core/Game';

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game('renderCanvas');
  // Expose game instance to window for development/debugging inspection
  (window as unknown as { __RIDELINE_GAME__: Game }).__RIDELINE_GAME__ = game;
});
