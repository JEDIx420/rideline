# RIDELINE: Bike Asset Audit Report

**Date:** 2026-09-25  
**Auditor:** Antigravity Engineering  
**Scope:** Evaluation of supplied 3D motorcycle asset packages for RIDELINE simulation integration.

---

## 1. Executive Summary

Both motorcycle models in the project directory are high-quality, authentic superbike packages authored by **VTX**.
Both models are provided in binary glTF format (`.glb`) with embedded PBR textures.
The models contain separated moving parts (wheels, forks, handlebars, brake discs, swingarm) and authentic cockpit / dashboard geometry, making them directly usable for real-time 3D physics, visual animations, and first-person cockpit POV cameras.

---

## 2. Model #1: BMW S1000RR 2019 (Primary / Default Motorcycle)

- **Source Path:** `assets-source/bmw-s1000rr-2019/source/8788 7  80884.glb`
- **Runtime Path:** `public/assets/bikes/s1000rr-2019/model.glb`
- **Creator:** VTX (Sketchfab: https://sketchfab.com/3d-models/bmw-s1000rr-2019-f842e86791ae4820aa7d45f76ecc94dc)
- **License:** CC Attribution-NonCommercial-ShareAlike (CC BY-NC-SA 4.0)

### Technical Specifications
- **File Size:** 45.40 MB
- **Total Triangles:** 272,262
- **Total Vertices:** 208,341
- **Node Count:** 104
- **Mesh Count:** 50
- **Material Count:** 30
- **Texture Count:** 37 embedded textures (Albedo, Normal, Metallic-Roughness, Specular, Emissive, AO)
- **Scale:** 1:1 real-world metric scale:
  - Width (X): ~0.802 m
  - Height (Y): ~1.095 m
  - Length (Z): ~1.774 m
  - Wheelbase: ~1.515 m
- **Orientation:**
  - Forward: -Z
  - Backward: +Z
  - Up: +Y
  - Right: +X

### Component Breakdown & Hierarchy
- **Front Wheel:** Separated node `wheel_lf.child` (with submesh `wheel_lf.child.001` and disc `bikedisc_f`). Front axle at approx `Z = -0.759 m, Y = 0.35 m`.
- **Rear Wheel:** Separated node `wheel_lr.child` (with submesh `wheel_lr.child.001` and disc `bikedisc_r`). Rear axle at approx `Z = +0.756 m, Y = 0.35 m`.
- **Front Forks & Steering Assembly:** `forks_u`, `forks_l`, `handlebars` with grips `hbgrip_l`, `hbgrip_r`. Can be rotated around the steering axis for dynamic steering visual response.
- **Swingarm:** Separated node `swingarm`.
- **Cockpit / Dashboard:** Separated nodes `cockpit`, `dials`, `dashglow` with tachometer and race dash textures (`script_rt_dials_race`). High detail suitable for first-person POV.
- **Body & Fairings:** `bodyshell`, `chassis`, `petroltank`, `seat_f`, `seat_r`, `bmws19_wings` (aerodynamic winglets).
- **Exhaust & Lighting:** `bmws19_exh_1`, `headlight_l`, `headlight_r`, `taillight_l`, `taillight_r`, `platelight`.

### Babylon.js Suitability & Optimization
- Fully compatible with Babylon.js glTF loader.
- Embedded textures load seamlessly.
- Mesh hierarchy allows direct node parenting and programmatic rotation for wheels, forks, and lean without mesh decimation.

---

## 3. Model #2: BMW M1000RR / S1000RR Race Package (Bike #2)

- **Source Path:** `assets-source/bmw-s1000-rr/source/10211.glb`
- **Runtime Path:** `public/assets/bikes/bike-02/model.glb`
- **Creator:** VTX
- **License:** CC Attribution-NonCommercial-ShareAlike (CC BY-NC-SA 4.0)

### Technical Specifications
- **File Size:** 33.07 MB
- **Total Triangles:** 313,195
- **Total Vertices:** 294,250
- **Node Count:** 82
- **Mesh Count:** 34
- **Material Count:** 74
- **Texture Count:** 65 embedded textures
- **Scale:** 1:1 real-world metric scale:
  - Width (X): ~0.799 m
  - Height (Y): ~1.067 m
  - Length (Z): ~1.736 m
  - Wheelbase: ~1.441 m
- **Orientation:**
  - Forward: -Z
  - Backward: +Z
  - Up: +Y
  - Right: +X

### Component Breakdown & Hierarchy
- **Front Wheel:** `wheel_lf.child` (`wheel_lf.child_very_high`), `bikedisc_f`.
- **Rear Wheel:** `wheel_lr.child` (`wheel_lr.child_very_high`), `bikedisc_r`.
- **Front Forks & Handlebars:** `forks_u`, `forks_l`, `handlebars`, `LBUTTONS`, `ign`.
- **Swingarm:** `swingarm`, chain drive `bmw_m1krr_chain`.
- **Cockpit:** `cockpit`, `dials`, `takometro` with race telemetry textures.
- **Exhaust & Engine:** Multi-stage race exhaust (`exhaust_1` through `exhaust_5`), `engineblock`.

---

## 4. Multi-Bike Node Mapping Schema

Both bikes follow a consistent VTX hierarchy convention, allowing clean mapping in `BikeDefinition.ts`:

| Component | S1000RR 2019 Node Names | Bike #2 Node Names |
|---|---|---|
| **Root** | `bmws19` / `__root__` | `offlrds1000r` / `__root__` |
| **Front Wheel** | `wheel_lf.child` / `wheel_lf` | `wheel_lf.child` / `wheel_lf` |
| **Rear Wheel** | `wheel_lr.child` / `wheel_lr` | `wheel_lr.child` / `wheel_lr` |
| **Steering / Forks** | `forks_u`, `handlebars` | `forks_u`, `handlebars` |
| **Cockpit / Dials** | `cockpit`, `dials` | `cockpit`, `dials`, `takometro` |
| **Front Axle Offset (Z)** | -0.759 m | -0.738 m |
| **Rear Axle Offset (Z)** | +0.756 m | +0.702 m |
| **Wheel Radius** | ~0.31 m (17" rim + tire) | ~0.31 m (17" rim + tire) |

---

## 5. Conclusion & Recommendations

1. No destructive mesh decimation is needed for desktop or mobile WebGL 2.0 / WebGPU contexts.
2. The models are preserved intact in `assets-source/`.
3. The derived runtime assets in `public/assets/bikes/` are mapped dynamically via `BikeRegistry` and `BikeDefinition`.
