# RIDELINE &bull; Infinite Roads Ahead

> **Browser-Based 3D Motorcycle Riding Simulator**  
> *Milestone 1: First Playable Build (Proving Ground)*

🎮 **Live GitHub Pages URL:** [https://jedix420.github.io/rideline/](https://jedix420.github.io/rideline/)

---

## 1. Overview & Concept

**RIDELINE** is a browser-native 3D motorcycle simulation that captures the high-performance physics, tactile cockpit perception, and immersive dynamics of modern liter-class superbikes. Built entirely on open web standards with **TypeScript**, **Babylon.js**, and **Web Audio API**, RIDELINE requires no plugins, backend servers, or app installations.

---

## 2. Milestone 1 Features

- **Authentic 3D Superbikes:**
  - **BMW S1000RR 2019 (Default):** 207 hp, 113 Nm torque, 999cc inline-four with ShiftCam, 272k triangles with separated wheels, steerable front forks, handlebars, and authentic cockpit/dashboard.
  - **BMW M1000RR Race (Bike #2):** 212 hp track homologation edition with carbon aero winglets, race exhaust, and lightweight forged components.
- **Multi-Bike Registry Architecture:** `BikeDefinition`, `BikeRegistry`, `BikeLoader`, and `BikeController` allow registering new motorcycles with custom node hierarchies, physics curves, and camera anchors without modifying gameplay systems.
- **Physical Motorcycle Simulation:**
  - Dynamic 6-speed sequential transmission with automatic shifting.
  - Engine RPM and torque curves with soft rev-limiter bounces (~14,500 RPM).
  - Speed-dependent steering and counter-steering lean physics (up to 54° lean angle).
  - Ground-speed-synchronized wheel rotation ($\omega = v / r$) and fork steering visual animation.
  - Suspension squat on hard acceleration and dive under braking.
- **Dual Camera Perspectives:**
  - **Chase POV:** Smooth damped third-person follow camera with acceleration lag, cornering yaw lag, and dynamic speed FOV scaling.
  - **Rider Cockpit POV:** Immersive first-person view positioned right behind the windscreen looking over the real clip-on handlebars, dashboard telemetry, and mirrors, with horizon/head stabilization.
- **Web Audio Sound Engine:**
  - Real-time procedural inline-four exhaust pulse synthesis, intake roar, rev whine, and deceleration engine braking.
  - Speed-reactive aerodynamic wind noise generator.
- **Proving Ground Environment:**
  - 3.5 km scenic coastal/mountain highway circuit with elevation changes (+70m climb), sweeping curves, tight hairpins, and high-speed ocean straightaways.
  - PBR asphalt road with center/edge markings, metallic cliff guardrails, ocean water plane, and roadside vegetation.
- **Responsive Controls & UI:**
  - Desktop keyboard & gamepad support.
  - Landscape mobile touch controls with steering buttons and gas/brake pedals.
  - Fullscreen "Rotate Your Device" orientation lock overlay for portrait viewports.
  - Minimalist digital HUD with speed (km/h), gear indicator, tachometer bar with shift lights, and throttle/brake gauges.
  - Graphics quality presets: **Performance**, **Balanced (Default)**, and **Quality**.
  - Developer debug overlay (`F3` or `P`).

---

## 3. Controls

### Desktop Keyboard
| Key | Action |
|---|---|
| `W` / `Up Arrow` | Throttle (Gas) |
| `S` / `Down Arrow` / `Space` | Front & Rear Brakes |
| `A` / `Left Arrow` | Steer Left / Lean Left |
| `D` / `Right Arrow` | Steer Right / Lean Right |
| `C` | Toggle Camera (Chase POV / Cockpit POV) |
| `R` | Recover Motorcycle (Respawn upright on road) |
| `Esc` | Pause / Resume Simulation |
| `F3` / `P` | Toggle Performance & Physics Debug Overlay |

### Gamepad (Xbox / PlayStation / Standard)
| Control | Action |
|---|---|
| `Right Trigger (RT / R2)` | Analog Throttle |
| `Left Trigger (LT / L2)` | Analog Brakes |
| `Left Stick (X-Axis)` | Analog Steering & Lean |
| `Y` / `Triangle` | Toggle Camera |
| `B` / `Circle` / `Select` | Recover Motorcycle |
| `Start` | Pause |

### Mobile & Tablet (Landscape)
- **Left Thumb Area:** Steer Left & Steer Right touch buttons.
- **Right Thumb Area:** `GAS` (Throttle) and `BRAKE` touch pedals.
- **Top Actions:** `CAM` (Switch POV) & `RESET` (Recover Bike).

---

## 4. Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) v20+ or v22+
- npm v10+

### Installation
```bash
# Clone the repository
git clone https://github.com/JEDIx420/rideline.git
cd rideline

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open `http://localhost:3000` in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 5. Technology Stack

- **Rendering Engine:** [Babylon.js 7.x](https://www.babylonjs.com/) (PBR materials, Cascaded Shadow Maps, WebGL 2.0 / WebGPU)
- **Language:** TypeScript 5.7+
- **Bundler & Tooling:** Vite 6.x
- **Audio:** Web Audio API (Multi-oscillator synthesis & dynamic Biquad filters)
- **CI/CD:** GitHub Actions
- **Hosting:** GitHub Pages

---

## 6. Project Architecture

```
rideline/
├── .github/workflows/deploy.yml   # GitHub Actions automated deployment
├── docs/BIKE_ASSET_AUDIT.md       # Comprehensive 3D model asset audit
├── public/assets/bikes/           # Optimized runtime GLB assets
│   ├── s1000rr-2019/model.glb
│   └── bike-02/model.glb
├── src/
│   ├── audio/                     # Web Audio synthesizers (EngineAudio, WindAudio, AudioManager)
│   ├── bikes/                     # BikeDefinition, Registry, Loader, Controller, Physics, Visuals
│   ├── cameras/                   # ChaseCamera, RiderPOVCamera, CameraManager
│   ├── config/                    # Graphics presets & physics configuration constants
│   ├── core/                      # Game, GameLoop, SceneManager
│   ├── debug/                     # DebugOverlay (FPS, draw calls, telemetry)
│   ├── input/                     # KeyboardInput, TouchInput, GamepadInput, InputManager
│   ├── ui/                        # HUD, StartScreen, MobileControls, RotateDeviceOverlay
│   ├── world/                     # Road spline, Terrain, Environment (Sky, ocean, lighting, props)
│   ├── main.ts                    # Application entrypoint
│   └── style.css                  # UI, HUD & mobile landscape styles
├── ATTRIBUTIONS.md                # 3D model author credits & CC licenses
├── README.md                      # Project documentation
└── vite.config.ts                 # Vite base-path configuration
```

---

## 7. Known Limitations (Milestone 1)

- Rider character model is omitted in Milestone 1 (planned for Milestone 2 with full IK, riding leathers, and lean posture animations).
- Automatic shifting is active by default (manual sequential foot-shifter mode will be added in future updates).
- Single 3.5km scenic proving ground loop (infinite procedural highways are slated for later milestones).

---

## 8. Next Milestone Roadmap (Milestone 2)

1. **High-Quality Superbike Rider:**
   - Detailed sport rider model with aerodynamic helmet, race leathers, boots, and gloves.
   - Inverse Kinematics (IK) for hands on clip-ons and feet on rearsets.
   - Dynamic body-off-bike tuck and knee-down cornering animations.
2. **Enhanced Inline-Four Soundscape:**
   - Multi-layer engine audio blending with RPM crossfading, exhaust backfire pops, and quickshifter ignition cuts.
3. **Interactive S1000RR TFT Cockpit:**
   - Real-time digital TFT dashboard displaying live speed, gear, RPM tach bar, lean angle telemetry, and lap timer.
4. **Advanced Motorcycle Physics:**
   - Traction control (DTC), wheelie mitigation, ABS braking modulation, and tire slip friction modeling.

---

## 9. Attributions & License

- 3D Motorcycle Models by **VTX** ([Sketchfab](https://sketchfab.com/3d-models/bmw-s1000rr-2019-f842e86791ae4820aa7d45f76ecc94dc)), licensed under **CC BY-NC-SA 4.0**.
- See [ATTRIBUTIONS.md](file:///Users/vincyvincent/rideline/ATTRIBUTIONS.md) for full license details.
- RIDELINE code is open-source under the MIT License.
