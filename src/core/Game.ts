import { SceneManager } from './SceneManager';
import { GameLoop } from './GameLoop';
import { World } from '../world/World';
import { BikeDefinition } from '../bikes/BikeDefinition';
import { BikeLoader, LoadedBike } from '../bikes/BikeLoader';
import { BikeController } from '../bikes/BikeController';
import { CameraManager } from '../cameras/CameraManager';
import { InputManager } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { HUD } from '../ui/HUD';
import { MobileControls } from '../ui/MobileControls';
import { RotateDeviceOverlay } from '../ui/RotateDeviceOverlay';
import { DebugOverlay } from '../debug/DebugOverlay';
import { StartScreen, StartScreenResult } from '../ui/StartScreen';
import { GraphicsQuality } from '../config/graphics';

export class Game {
  public sceneManager: SceneManager;
  public gameLoop: GameLoop | null = null;
  public world: World;
  public cameraManager: CameraManager;
  public inputManager: InputManager;
  public audioManager: AudioManager;

  public hud: HUD;
  public mobileControls: MobileControls;
  public rotateOverlay: RotateDeviceOverlay;
  public debugOverlay: DebugOverlay;
  public startScreen: StartScreen;

  public activeBike: BikeController | null = null;
  public loadedBikeData: LoadedBike | null = null;
  public currentGraphicsQuality: GraphicsQuality = 'balanced';

  private loadingOverlay!: HTMLElement;

  constructor(canvasId: string) {
    this.createLoadingOverlay();
    this.sceneManager = new SceneManager(canvasId, this.currentGraphicsQuality);
    this.world = new World(this.sceneManager.scene, this.sceneManager.graphics);
    this.cameraManager = new CameraManager(this.sceneManager.scene);
    this.inputManager = new InputManager();
    this.audioManager = new AudioManager();

    this.hud = new HUD();
    this.mobileControls = new MobileControls(this.inputManager.touch);
    this.rotateOverlay = new RotateDeviceOverlay();
    this.debugOverlay = new DebugOverlay();
    this.startScreen = new StartScreen();

    this.startScreen.onRide((result: StartScreenResult) => {
      this.startRide(result.selectedBike, result.selectedQuality);
    });

    this.hideLoading();
  }

  private createLoadingOverlay(): void {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.id = 'rideline-loading-overlay';
    this.loadingOverlay.className = 'loading-overlay-container';
    this.loadingOverlay.innerHTML = `
      <div class="loading-box">
        <div class="loading-spinner"></div>
        <div class="loading-title">PREPARING MOTORCYCLE</div>
        <div class="loading-sub" id="loading-status-text">Loading 3D mesh assets...</div>
        <div class="loading-bar-wrap">
          <div class="loading-bar-fill" id="loading-bar-progress"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.loadingOverlay);
  }

  private showLoading(msg: string): void {
    this.loadingOverlay.classList.remove('hidden');
    const txt = document.getElementById('loading-status-text');
    if (txt) txt.textContent = msg;
  }

  private updateLoadingProgress(pct: number): void {
    const bar = document.getElementById('loading-bar-progress');
    if (bar) bar.style.width = `${pct}%`;
  }

  private hideLoading(): void {
    this.loadingOverlay.classList.add('hidden');
  }

  public async startRide(bikeDef: BikeDefinition, quality: GraphicsQuality): Promise<void> {
    this.currentGraphicsQuality = quality;
    this.sceneManager.applyGraphicsPreset(quality);

    this.showLoading(`Loading ${bikeDef.displayName}...`);

    // Clean up previous bike if switching
    if (this.loadedBikeData) {
      this.loadedBikeData.rootNode.dispose();
      this.loadedBikeData = null;
      this.activeBike = null;
    }

    // Load selected motorcycle model
    try {
      this.loadedBikeData = await BikeLoader.loadBike(
        bikeDef,
        this.sceneManager.scene,
        this.world.environment.shadowGenerator,
        (pct) => this.updateLoadingProgress(pct)
      );

      this.activeBike = new BikeController(
        bikeDef,
        this.loadedBikeData.visualController
      );

      // Spawn bike at starting grid
      const spawn = this.world.road.getSpawnTransform();
      this.activeBike.reset(spawn.position, spawn.headingRad);

      // Connect camera to bike
      this.cameraManager.setActiveMode('chase', this.activeBike);

      // Start Audio
      this.audioManager.unlock();

      // Show gameplay UI
      this.hideLoading();
      this.hud.show();
      this.mobileControls.show();

      // Start Game Loop if not already running
      if (!this.gameLoop) {
        this.gameLoop = new GameLoop(
          this.sceneManager.engine,
          this.update.bind(this),
          this.render.bind(this)
        );
        this.gameLoop.start();
      }
    } catch (err) {
      console.error('Failed to load bike model:', err);
      this.showLoading(`Error loading model. Check console.`);
    }
  }

  private update(dt: number): void {
    if (!this.activeBike) return;

    this.inputManager.update();
    const input = this.inputManager.current;

    // Camera Switch
    if (input.cameraToggle) {
      this.cameraManager.toggleCamera(this.activeBike);
    }

    // Bike Recovery
    if (input.recover) {
      this.recoverBike();
    }

    // Pause Toggle
    if (input.pause && this.gameLoop) {
      this.gameLoop.togglePause();
    }

    // Debug Overlay Toggle
    if (input.debugToggle) {
      this.debugOverlay.toggle();
    }

    // Step Motorcycle Physics & Visuals
    this.activeBike.update(
      dt,
      input.throttle,
      input.brake,
      input.steer,
      this.world.road
    );

    // Update Camera
    this.cameraManager.update(dt, this.activeBike);

    // Update Audio
    this.audioManager.update(this.activeBike, this.cameraManager.currentMode);

    // Update HUD
    this.hud.update(
      this.activeBike,
      this.cameraManager.currentMode,
      input.throttle,
      input.brake
    );

    // Update Debug Overlay
    this.debugOverlay.update(
      this.sceneManager.engine,
      this.sceneManager.scene,
      this.activeBike,
      this.cameraManager.currentMode,
      this.currentGraphicsQuality
    );
  }

  private render(): void {
    this.sceneManager.render();
  }

  public recoverBike(): void {
    if (!this.activeBike) return;
    const roadPt = this.world.road.getClosestPoint(this.activeBike.position);
    const tangent = roadPt.tangent;
    const forwardHeading = Math.atan2(-tangent.x, -tangent.z);

    const safeSpawnPos = roadPt.position.clone();
    safeSpawnPos.y += 0.35;

    this.activeBike.reset(safeSpawnPos, forwardHeading);
    this.cameraManager.setActiveMode(this.cameraManager.currentMode, this.activeBike);
  }
}
