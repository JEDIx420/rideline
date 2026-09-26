import './style.css';
import { Game } from './core/Game';
import { ModelMaterialLab } from './debug/ModelMaterialLab';

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'material-lab') {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    const garageUI = document.getElementById('garage-ui');
    if (garageUI) garageUI.style.display = 'none';
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) mobileControls.style.display = 'none';
    const loader = document.getElementById('rideline-initial-loader');
    if (loader) loader.style.display = 'none';

    const bikeUrl = urlParams.get('bike') === 'bike-02'
      ? 'assets/bikes/bike-02/model.glb'
      : 'assets/bikes/s1000rr-2019/model.glb';

    const lab = new ModelMaterialLab(canvas);
    (window as unknown as { __MATERIAL_LAB__: ModelMaterialLab }).__MATERIAL_LAB__ = lab;
    lab.loadModel(bikeUrl).then(() => {
      console.log(`ModelMaterialLab initialized successfully with ${bikeUrl}`);
    });
    return;
  }

  if (urlParams.get('mode') === 'rider-fit-lab') {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    const garageUI = document.getElementById('garage-ui');
    if (garageUI) garageUI.style.display = 'none';
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) mobileControls.style.display = 'none';
    const loader = document.getElementById('rideline-initial-loader');
    if (loader) loader.style.display = 'none';

    const bikeId = urlParams.get('bike') === 'bike-02' ? 'bike-02' : 's1000rr-2019';

    import('./debug/RiderFitLab').then(({ RiderFitLab }) => {
      const fitLab = new RiderFitLab(canvas);
      (window as unknown as { __RIDER_FIT_LAB__: InstanceType<typeof RiderFitLab> }).__RIDER_FIT_LAB__ = fitLab;
      fitLab.loadBikeAndRider(bikeId).then(() => {
        console.log(`RiderFitLab initialized successfully with ${bikeId}`);
      });
    });
    return;
  }

  const game = new Game('renderCanvas');
  (window as unknown as { __RIDELINE_GAME__: Game }).__RIDELINE_GAME__ = game;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
