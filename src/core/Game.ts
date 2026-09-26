import { SceneManager } from './SceneManager';
import { GameLoop } from './GameLoop';
import { World } from '../world/World';
import { BikeDefinition } from '../bikes/BikeDefinition';
import { BikeLoader, LoadedBike } from '../bikes/BikeLoader';
import { BikeController } from '../bikes/BikeController';
import { CameraManager, CameraMode } from '../cameras/CameraManager';
import { InputManager } from '../input/InputManager';
import { AudioManager } from '../audio/AudioManager';
import { HUD } from '../ui/HUD';
import { MobileControls } from '../ui/MobileControls';
import { RotateDeviceOverlay } from '../ui/RotateDeviceOverlay';
import { DebugOverlay } from '../debug/DebugOverlay';
import { GarageController } from '../garage/GarageController';
import { SettingsModal, SettingsState } from '../ui/SettingsModal';
import { SoundUnlockPrompt } from '../ui/SoundUnlockPrompt';
import { RiderController } from '../rider/RiderController';
import { GraphicsQuality } from '../config/graphics';

export type GameState = 'garage' | 'ride';

export class Game {
  public sceneManager: SceneManager;
  public gameLoop: GameLoop | null = null;
  public world: World;
  public cameraManager: CameraManager;
  public inputManager: InputManager;
  public audioManager: AudioManager;

  public garageController: GarageController;
  public settingsModal: SettingsModal;
  public soundUnlockPrompt: SoundUnlockPrompt;
  public hud: HUD;
  public mobileControls: MobileControls;
  public rotateOverlay: RotateDeviceOverlay;
  public debugOverlay: DebugOverlay;

  public currentState: GameState = 'garage';
  public activeBike: BikeController | null = null;
  public loadedBikeData: LoadedBike | null = null;
  public currentGraphicsQuality: GraphicsQuality = 'balanced';
  public defaultCameraMode: CameraMode = 'chase';

  private loadingOverlay!: HTMLElement;

  constructor(canvasId: string) {
    this.createLoadingOverlay();
    this.sceneManager = new SceneManager(canvasId, this.currentGraphicsQuality);
    this.world = new World(this.sceneManager.scene, this.sceneManager.graphics);
    this.world.setVisible(false); // World hidden while in 3D Garage Showroom

    this.cameraManager = new CameraManager(this.sceneManager.scene);
    this.inputManager = new InputManager();
    this.audioManager = new AudioManager();

    this.hud = new HUD();
    this.mobileControls = new MobileControls(this.inputManager.touch);
    this.rotateOverlay = new RotateDeviceOverlay();
    this.debugOverlay = new DebugOverlay();
    this.settingsModal = new SettingsModal();
    this.soundUnlockPrompt = new SoundUnlockPrompt(this.audioManager);

    // Initialize 3D Garage Showroom
    this.garageController = new GarageController(
      this.sceneManager.scene,
      this.sceneManager.canvas,
      (bike) => {
        // SYNCHRONOUS AudioContext unlock directly in user click stack
        this.audioManager.unlock();
        this.startRide(bike);
      },
      () => {
        this.settingsModal.toggle();
      }
    );

    this.setupUIHandlers();
    this.garageController.init();

    // Start render loop
    this.gameLoop = new GameLoop(
      this.sceneManager.engine,
      this.update.bind(this),
      this.render.bind(this)
    );
    this.gameLoop.start();
  }

  private setupUIHandlers(): void {
    // Settings changes
    this.settingsModal.onSettingsChange((state: SettingsState) => {
      if (state.graphicsQuality !== this.currentGraphicsQuality) {
        this.currentGraphicsQuality = state.graphicsQuality;
        this.sceneManager.applyGraphicsPreset(state.graphicsQuality);
      }
      this.audioManager.setMasterVolume(state.isMuted ? 0 : state.masterVolume);
      this.defaultCameraMode = state.defaultCamera;
      if (this.currentState === 'ride' && this.activeBike) {
        this.cameraManager.setActiveMode(this.defaultCameraMode, this.activeBike);
      }
    });

    // HUD Actions
    this.hud.onCameraToggle(() => {
      if (this.activeBike) {
        this.cameraManager.toggleCamera(this.activeBike);
      }
    });

    this.hud.onRecover(() => {
      this.recoverBike();
    });

    this.hud.onOpenSettings(() => {
      this.settingsModal.toggle();
    });
  }

  private createLoadingOverlay(): void {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.id = 'rideline-loading-overlay';
    this.loadingOverlay.className = 'loading-overlay-container hidden';
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

  public async startRide(bikeDef: BikeDefinition): Promise<void> {
    this.showLoading(`Preparing ${bikeDef.displayName}...`);

    // Clean up previous active bike if any
    if (this.activeBike?.rider) {
      this.activeBike.rider.dispose();
      this.activeBike.setRider(null);
    }
    if (this.loadedBikeData) {
      this.loadedBikeData.rootNode.dispose();
      this.loadedBikeData = null;
      this.activeBike = null;
    }

    try {
      // Exit Garage showroom
      this.garageController.exitGarageMode();

      // Show World proving ground
      this.world.setVisible(true);

      // Load motorcycle model into world
      this.loadedBikeData = await BikeLoader.loadBike(
        bikeDef,
        this.sceneManager.scene,
        this.world.environment.shadowGenerator,
        (pct) => this.updateLoadingProgress(pct)
      );

      this.activeBike = new BikeController(
        bikeDef,
        this.loadedBikeData.visualController,
        this.loadedBikeData
      );

      // Create & Attach Rider
      this.showLoading(`Mounting Rider...`);
      const rider = await RiderController.create(
        this.sceneManager.scene,
        bikeDef.id,
        this.world.environment.shadowGenerator
      );
      rider.attachToBike(this.loadedBikeData.physicsRoot, this.loadedBikeData.riderTargets);
      this.activeBike.setRider(rider);

      // Configure Audio Profile
      if (bikeDef.audioProfile) {
        this.audioManager.setAudioProfile(bikeDef.audioProfile);
      }

      // Spawn bike at starting line
      const spawn = this.world.road.getSpawnTransform();
      this.activeBike.reset(spawn.position, spawn.headingRad);

      // Set active camera
      this.cameraManager.setActiveMode(this.defaultCameraMode, this.activeBike);

      // Transition game state
      this.currentState = 'ride';

      // Show HUD and Controls
      this.hideLoading();
      this.hud.show();
      this.mobileControls.show();
    } catch (err) {
      console.error('Failed to load ride bike model:', err);
      this.showLoading(`Error loading model. Check console.`);
    }
  }

  public returnToGarage(): void {
    if (this.currentState === 'garage') return;

    // Dispose ride bike and rider
    if (this.activeBike?.rider) {
      this.activeBike.rider.dispose();
      this.activeBike.setRider(null);
    }
    if (this.loadedBikeData) {
      this.loadedBikeData.rootNode.dispose();
      this.loadedBikeData = null;
      this.activeBike = null;
    }

    this.hud.hide();
    this.mobileControls.hide();
    this.world.setVisible(false);

    this.currentState = 'garage';
    this.garageController.enterGarageMode();
  }

  private update(dt: number): void {
    if (this.currentState === 'garage') {
      this.garageController.update(dt);
      return;
    }

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

    // Step Motorcycle Physics & Visuals & Rider
    this.activeBike.update(
      dt,
      input.throttle,
      input.brake,
      input.steer,
      this.world.road,
      this.world.terrain
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
