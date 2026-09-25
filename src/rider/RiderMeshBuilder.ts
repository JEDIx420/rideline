import { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RiderSuitConfig, DEFAULT_RIDER_SUIT } from './RiderDefinition';

export interface RiderRigNodes {
  root: TransformNode;
  pelvis: TransformNode;
  spineLower: TransformNode;
  spineUpper: TransformNode;
  chest: TransformNode;
  neck: TransformNode;
  head: TransformNode;
  helmetMesh: Mesh;
  visorMesh: Mesh;
  headMeshes: Mesh[];
  torsoMeshes: Mesh[];

  // Left Arm
  shoulderL: TransformNode;
  upperArmL: TransformNode;
  forearmL: TransformNode;
  handL: TransformNode;

  // Right Arm
  shoulderR: TransformNode;
  upperArmR: TransformNode;
  forearmR: TransformNode;
  handR: TransformNode;

  // Left Leg
  hipL: TransformNode;
  thighL: TransformNode;
  shinL: TransformNode;
  footL: TransformNode;

  // Right Leg
  hipR: TransformNode;
  thighR: TransformNode;
  shinR: TransformNode;
  footR: TransformNode;
}

export class RiderMeshBuilder {
  public static createRider(
    scene: Scene,
    suitConfig: RiderSuitConfig = DEFAULT_RIDER_SUIT,
    shadowGenerator?: ShadowGenerator | null
  ): { root: TransformNode; rig: RiderRigNodes; meshes: Mesh[] } {
    const root = new TransformNode('rider_root', scene);
    const meshes: Mesh[] = [];

    // 1. Materials
    // Leather Suit Base
    const leatherMat = new PBRMaterial('rider_leather_mat', scene);
    leatherMat.albedoColor = Color3.FromHexString(suitConfig.primaryColor);
    leatherMat.metallic = 0.1;
    leatherMat.roughness = suitConfig.leatherRoughness;

    // Accent Stripe / Race Livery
    const accentMat = new PBRMaterial('rider_accent_mat', scene);
    accentMat.albedoColor = Color3.FromHexString(suitConfig.accentColor);
    accentMat.metallic = 0.3;
    accentMat.roughness = 0.45;

    // White / Silver Panels
    const trimMat = new PBRMaterial('rider_trim_mat', scene);
    trimMat.albedoColor = Color3.FromHexString(suitConfig.trimColor);
    trimMat.metallic = 0.2;
    trimMat.roughness = 0.5;

    // Titanium / Carbon Armor Sliders
    const armorMat = new PBRMaterial('rider_armor_mat', scene);
    armorMat.albedoColor = new Color3(0.12, 0.14, 0.16);
    armorMat.metallic = suitConfig.armorMetallic;
    armorMat.roughness = 0.25;

    // Dark Mirror Visor
    const visorMat = new PBRMaterial('rider_visor_mat', scene);
    visorMat.albedoColor = new Color3(0.04, 0.05, 0.08);
    visorMat.metallic = suitConfig.visorMetallic;
    visorMat.roughness = suitConfig.visorRoughness;
    visorMat.alpha = suitConfig.visorAlpha;

    // 2. Bone Transform Hierarchy
    const pelvis = new TransformNode('rider_pelvis', scene);
    pelvis.parent = root;
    pelvis.position.set(0, 0, 0);

    const spineLower = new TransformNode('rider_spine_lower', scene);
    spineLower.parent = pelvis;
    spineLower.position.set(0, 0.12, -0.04);

    const spineUpper = new TransformNode('rider_spine_upper', scene);
    spineUpper.parent = spineLower;
    spineUpper.position.set(0, 0.14, -0.06);

    const chest = new TransformNode('rider_chest', scene);
    chest.parent = spineUpper;
    chest.position.set(0, 0.14, -0.08);

    const neck = new TransformNode('rider_neck', scene);
    neck.parent = chest;
    neck.position.set(0, 0.12, -0.05);

    const head = new TransformNode('rider_head', scene);
    head.parent = neck;
    head.position.set(0, 0.10, -0.03);

    // Left Arm Hierarchy
    const shoulderL = new TransformNode('rider_shoulder_l', scene);
    shoulderL.parent = chest;
    shoulderL.position.set(-0.19, 0.06, 0.02);

    const upperArmL = new TransformNode('rider_upperarm_l', scene);
    upperArmL.parent = shoulderL;
    upperArmL.position.set(0, 0, 0);

    const forearmL = new TransformNode('rider_forearm_l', scene);
    forearmL.parent = upperArmL;
    forearmL.position.set(-0.06, -0.25, -0.04);

    const handL = new TransformNode('rider_hand_l', scene);
    handL.parent = forearmL;
    handL.position.set(-0.03, -0.22, -0.12);

    // Right Arm Hierarchy
    const shoulderR = new TransformNode('rider_shoulder_r', scene);
    shoulderR.parent = chest;
    shoulderR.position.set(0.19, 0.06, 0.02);

    const upperArmR = new TransformNode('rider_upperarm_r', scene);
    upperArmR.parent = shoulderR;
    upperArmR.position.set(0, 0, 0);

    const forearmR = new TransformNode('rider_forearm_r', scene);
    forearmR.parent = upperArmR;
    forearmR.position.set(0.06, -0.25, -0.04);

    const handR = new TransformNode('rider_hand_r', scene);
    handR.parent = forearmR;
    handR.position.set(0.03, -0.22, -0.12);

    // Left Leg Hierarchy
    const hipL = new TransformNode('rider_hip_l', scene);
    hipL.parent = pelvis;
    hipL.position.set(-0.12, -0.02, 0.02);

    const thighL = new TransformNode('rider_thigh_l', scene);
    thighL.parent = hipL;

    const shinL = new TransformNode('rider_shin_l', scene);
    shinL.parent = thighL;
    shinL.position.set(-0.04, -0.28, -0.22);

    const footL = new TransformNode('rider_foot_l', scene);
    footL.parent = shinL;
    footL.position.set(0, -0.32, 0.16);

    // Right Leg Hierarchy
    const hipR = new TransformNode('rider_hip_r', scene);
    hipR.parent = pelvis;
    hipR.position.set(0.12, -0.02, 0.02);

    const thighR = new TransformNode('rider_thigh_r', scene);
    thighR.parent = hipR;

    const shinR = new TransformNode('rider_shin_r', scene);
    shinR.parent = thighR;
    shinR.position.set(0.04, -0.28, -0.22);

    const footR = new TransformNode('rider_foot_r', scene);
    footR.parent = shinR;
    footR.position.set(0, -0.32, 0.16);

    // 3. Detailed Geometry Meshes
    const torsoMeshes: Mesh[] = [];

    // Pelvis / Hips
    const pelvisMesh = MeshBuilder.CreateBox('rider_mesh_pelvis', { width: 0.28, height: 0.16, depth: 0.24 }, scene);
    pelvisMesh.parent = pelvis;
    pelvisMesh.position.set(0, 0.04, 0);
    pelvisMesh.material = leatherMat;
    meshes.push(pelvisMesh);
    torsoMeshes.push(pelvisMesh);

    // Lower Torso
    const spineLowerMesh = MeshBuilder.CreateCylinder('rider_mesh_lower_torso', { height: 0.16, diameterTop: 0.26, diameterBottom: 0.25, tessellation: 16 }, scene);
    spineLowerMesh.parent = spineLower;
    spineLowerMesh.position.set(0, 0.04, 0);
    spineLowerMesh.material = leatherMat;
    meshes.push(spineLowerMesh);
    torsoMeshes.push(spineLowerMesh);

    // Upper Torso / Chest with aerodynamic shape
    const chestMesh = MeshBuilder.CreateBox('rider_mesh_chest', { width: 0.36, height: 0.24, depth: 0.26 }, scene);
    chestMesh.parent = chest;
    chestMesh.position.set(0, 0.02, 0);
    chestMesh.material = leatherMat;
    meshes.push(chestMesh);
    torsoMeshes.push(chestMesh);

    // Chest race livery stripe
    const chestStripe = MeshBuilder.CreatePlane('rider_chest_stripe', { width: 0.28, height: 0.18 }, scene);
    chestStripe.parent = chest;
    chestStripe.position.set(0, 0.02, -0.135);
    chestStripe.material = accentMat;
    meshes.push(chestStripe);
    torsoMeshes.push(chestStripe);

    // Aerodynamic Dorsal Speed Hump (Back of race suit)
    const aeroHump = MeshBuilder.CreateCylinder('rider_aero_hump', { height: 0.28, diameterTop: 0.08, diameterBottom: 0.16, tessellation: 12 }, scene);
    aeroHump.parent = chest;
    aeroHump.position.set(0, 0.04, 0.14);
    aeroHump.rotation.x = Math.PI * 0.18;
    aeroHump.material = armorMat;
    meshes.push(aeroHump);
    torsoMeshes.push(aeroHump);

    // Shoulder Armor Plates
    const shoulderPlateL = MeshBuilder.CreateSphere('rider_shoulder_plate_l', { diameterX: 0.13, diameterY: 0.08, diameterZ: 0.14, segments: 12 }, scene);
    shoulderPlateL.parent = shoulderL;
    shoulderPlateL.material = armorMat;
    meshes.push(shoulderPlateL);
    torsoMeshes.push(shoulderPlateL);

    const shoulderPlateR = MeshBuilder.CreateSphere('rider_shoulder_plate_r', { diameterX: 0.13, diameterY: 0.08, diameterZ: 0.14, segments: 12 }, scene);
    shoulderPlateR.parent = shoulderR;
    shoulderPlateR.material = armorMat;
    meshes.push(shoulderPlateR);
    torsoMeshes.push(shoulderPlateR);

    // Arms
    const upperArmLMesh = MeshBuilder.CreateCylinder('rider_upperarm_l_mesh', { height: 0.26, diameter: 0.11, tessellation: 14 }, scene);
    upperArmLMesh.parent = upperArmL;
    upperArmLMesh.position.set(-0.03, -0.12, -0.02);
    upperArmLMesh.rotation.z = -0.15;
    upperArmLMesh.rotation.x = 0.35;
    upperArmLMesh.material = leatherMat;
    meshes.push(upperArmLMesh);
    torsoMeshes.push(upperArmLMesh);

    const upperArmRMesh = MeshBuilder.CreateCylinder('rider_upperarm_r_mesh', { height: 0.26, diameter: 0.11, tessellation: 14 }, scene);
    upperArmRMesh.parent = upperArmR;
    upperArmRMesh.position.set(0.03, -0.12, -0.02);
    upperArmRMesh.rotation.z = 0.15;
    upperArmRMesh.rotation.x = 0.35;
    upperArmRMesh.material = leatherMat;
    meshes.push(upperArmRMesh);
    torsoMeshes.push(upperArmRMesh);

    // Forearms
    const forearmLMesh = MeshBuilder.CreateCylinder('rider_forearm_l_mesh', { height: 0.24, diameterTop: 0.10, diameterBottom: 0.08, tessellation: 14 }, scene);
    forearmLMesh.parent = forearmL;
    forearmLMesh.position.set(-0.015, -0.10, -0.06);
    forearmLMesh.rotation.x = 0.65;
    forearmLMesh.material = trimMat;
    meshes.push(forearmLMesh);

    const forearmRMesh = MeshBuilder.CreateCylinder('rider_forearm_r_mesh', { height: 0.24, diameterTop: 0.10, diameterBottom: 0.08, tessellation: 14 }, scene);
    forearmRMesh.parent = forearmR;
    forearmRMesh.position.set(0.015, -0.10, -0.06);
    forearmRMesh.rotation.x = 0.65;
    forearmRMesh.material = trimMat;
    meshes.push(forearmRMesh);

    // Elbow Sliders
    const elbowSliderL = MeshBuilder.CreateBox('rider_elbow_slider_l', { width: 0.05, height: 0.08, depth: 0.05 }, scene);
    elbowSliderL.parent = forearmL;
    elbowSliderL.position.set(-0.04, 0.02, 0.05);
    elbowSliderL.material = armorMat;
    meshes.push(elbowSliderL);

    const elbowSliderR = MeshBuilder.CreateBox('rider_elbow_slider_r', { width: 0.05, height: 0.08, depth: 0.05 }, scene);
    elbowSliderR.parent = forearmR;
    elbowSliderR.position.set(0.04, 0.02, 0.05);
    elbowSliderR.material = armorMat;
    meshes.push(elbowSliderR);

    // Gauntlet Gloves
    const gloveL = MeshBuilder.CreateBox('rider_glove_l', { width: 0.09, height: 0.07, depth: 0.13 }, scene);
    gloveL.parent = handL;
    gloveL.rotation.y = 0.25;
    gloveL.material = leatherMat;
    meshes.push(gloveL);

    const gloveR = MeshBuilder.CreateBox('rider_glove_r', { width: 0.09, height: 0.07, depth: 0.13 }, scene);
    gloveR.parent = handR;
    gloveR.rotation.y = -0.25;
    gloveR.material = leatherMat;
    meshes.push(gloveR);

    // Thighs (Bended forward around tank)
    const thighLMesh = MeshBuilder.CreateCylinder('rider_thigh_l_mesh', { height: 0.32, diameter: 0.15, tessellation: 14 }, scene);
    thighLMesh.parent = thighL;
    thighLMesh.position.set(-0.04, -0.12, -0.12);
    thighLMesh.rotation.x = 1.15;
    thighLMesh.rotation.y = 0.18;
    thighLMesh.material = leatherMat;
    meshes.push(thighLMesh);

    const thighRMesh = MeshBuilder.CreateCylinder('rider_thigh_r_mesh', { height: 0.32, diameter: 0.15, tessellation: 14 }, scene);
    thighRMesh.parent = thighR;
    thighRMesh.position.set(0.04, -0.12, -0.12);
    thighRMesh.rotation.x = 1.15;
    thighRMesh.rotation.y = -0.18;
    thighRMesh.material = leatherMat;
    meshes.push(thighRMesh);

    // Knee Pucks / Sliders
    const kneePuckL = MeshBuilder.CreateCylinder('rider_knee_puck_l', { height: 0.04, diameter: 0.09, tessellation: 14 }, scene);
    kneePuckL.parent = shinL;
    kneePuckL.position.set(-0.06, 0.08, -0.06);
    kneePuckL.rotation.z = Math.PI * 0.5;
    kneePuckL.material = armorMat;
    meshes.push(kneePuckL);

    const kneePuckR = MeshBuilder.CreateCylinder('rider_knee_puck_r', { height: 0.04, diameter: 0.09, tessellation: 14 }, scene);
    kneePuckR.parent = shinR;
    kneePuckR.position.set(0.06, 0.08, -0.06);
    kneePuckR.rotation.z = Math.PI * 0.5;
    kneePuckR.material = armorMat;
    meshes.push(kneePuckR);

    // Shins
    const shinLMesh = MeshBuilder.CreateCylinder('rider_shin_l_mesh', { height: 0.32, diameter: 0.12, tessellation: 14 }, scene);
    shinLMesh.parent = shinL;
    shinLMesh.position.set(0, -0.14, 0.08);
    shinLMesh.rotation.x = -0.85;
    shinLMesh.material = leatherMat;
    meshes.push(shinLMesh);

    const shinRMesh = MeshBuilder.CreateCylinder('rider_shin_r_mesh', { height: 0.32, diameter: 0.12, tessellation: 14 }, scene);
    shinRMesh.parent = shinR;
    shinRMesh.position.set(0, -0.14, 0.08);
    shinRMesh.rotation.x = -0.85;
    shinRMesh.material = leatherMat;
    meshes.push(shinRMesh);

    // Racing Boots on Footpegs
    const bootL = MeshBuilder.CreateBox('rider_boot_l', { width: 0.09, height: 0.11, depth: 0.22 }, scene);
    bootL.parent = footL;
    bootL.position.set(0, 0, 0.04);
    bootL.material = armorMat;
    meshes.push(bootL);

    const bootR = MeshBuilder.CreateBox('rider_boot_r', { width: 0.09, height: 0.11, depth: 0.22 }, scene);
    bootR.parent = footR;
    bootR.position.set(0, 0, 0.04);
    bootR.material = armorMat;
    meshes.push(bootR);

    // Superbike Aerodynamic Helmet (Shell, Chin Bar, Visor)
    const headMeshes: Mesh[] = [];

    const helmetShell = MeshBuilder.CreateSphere('rider_helmet_shell', { diameterX: 0.23, diameterY: 0.25, diameterZ: 0.27, segments: 18 }, scene);
    helmetShell.parent = head;
    helmetShell.position.set(0, 0.04, -0.02);
    helmetShell.material = trimMat;
    meshes.push(helmetShell);
    headMeshes.push(helmetShell);

    // Helmet Chin Bar
    const chinBar = MeshBuilder.CreateBox('rider_helmet_chin', { width: 0.18, height: 0.09, depth: 0.16 }, scene);
    chinBar.parent = head;
    chinBar.position.set(0, -0.04, -0.10);
    chinBar.material = trimMat;
    meshes.push(chinBar);
    headMeshes.push(chinBar);

    // Dark Iridium Mirror Visor
    const visor = MeshBuilder.CreateCylinder('rider_helmet_visor', { height: 0.10, diameter: 0.235, tessellation: 18, arc: 0.5 }, scene);
    visor.parent = head;
    visor.position.set(0, 0.03, -0.015);
    visor.rotation.y = Math.PI * 1.25;
    visor.material = visorMat;
    meshes.push(visor);
    headMeshes.push(visor);

    // Rear Aero Spoiler on Helmet
    const helmetSpoiler = MeshBuilder.CreateBox('rider_helmet_spoiler', { width: 0.14, height: 0.04, depth: 0.08 }, scene);
    helmetSpoiler.parent = head;
    helmetSpoiler.position.set(0, 0.08, 0.12);
    helmetSpoiler.rotation.x = -0.3;
    helmetSpoiler.material = accentMat;
    meshes.push(helmetSpoiler);
    headMeshes.push(helmetSpoiler);

    // Shadows
    if (shadowGenerator) {
      for (const m of meshes) {
        shadowGenerator.addShadowCaster(m, false);
        m.receiveShadows = true;
      }
    }

    const rig: RiderRigNodes = {
      root,
      pelvis,
      spineLower,
      spineUpper,
      chest,
      neck,
      head,
      helmetMesh: helmetShell,
      visorMesh: visor,
      headMeshes,
      torsoMeshes,
      shoulderL,
      upperArmL,
      forearmL,
      handL,
      shoulderR,
      upperArmR,
      forearmR,
      handR,
      hipL,
      thighL,
      shinL,
      footL,
      hipR,
      thighR,
      shinR,
      footR,
    };

    return { root, rig, meshes };
  }
}
