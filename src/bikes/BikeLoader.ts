import { Scene } from '@babylonjs/core/scene';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Material } from '@babylonjs/core/Materials/material';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import '@babylonjs/loaders/glTF'; // Register glTF / GLB loader

import { BikeDefinition } from './BikeDefinition';
import { BikeVisualController } from './BikeVisualController';

export interface RiderTargetNodes {
  seatAnchor: TransformNode;
  leftGripAnchor: TransformNode;
  rightGripAnchor: TransformNode;
  leftRearsetAnchor: TransformNode;
  rightRearsetAnchor: TransformNode;
}

export interface LoadedBike {
  definition: BikeDefinition;
  physicsRoot: TransformNode;
  assetRoot: TransformNode;
  rootNode: TransformNode; // Alias to physicsRoot for backward compatibility
  meshes: AbstractMesh[];
  visualController: BikeVisualController;
  allNodes: Map<string, TransformNode>;
  riderTargets: RiderTargetNodes;
}

export class BikeLoader {
  public static async loadBike(
    definition: BikeDefinition,
    scene: Scene,
    shadowGenerator?: ShadowGenerator | null,
    onProgress?: (progressPercent: number) => void
  ): Promise<LoadedBike> {
    // Resolve relative path with base URL
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    const cleanPath = definition.modelPath.replace(/^\//, '');
    const fullModelUrl = baseUrl + cleanPath;

    // 1. BikePhysicsRoot: pure physics and gameplay transform
    const physicsRoot = new TransformNode(`bike_physics_root_${definition.id}`, scene);

    // 2. BikeAssetRoot: receives model scale, model rotation offset, and position offset
    const assetRoot = new TransformNode(`bike_asset_root_${definition.id}`, scene);
    assetRoot.parent = physicsRoot;
    assetRoot.scaling.copyFrom(definition.modelScale);
    assetRoot.rotation.copyFrom(definition.modelRotationOffset);
    assetRoot.position.copyFrom(definition.modelPositionOffset);

    const result = await SceneLoader.ImportMeshAsync(
      '',
      '',
      fullModelUrl,
      scene,
      (evt) => {
        if (evt.lengthComputable && onProgress) {
          const pct = Math.floor((evt.loaded * 100) / evt.total);
          onProgress(pct);
        }
      }
    );

    const nodeMap = new Map<string, TransformNode>();
    const meshes: AbstractMesh[] = [];

    // Reparent loaded top meshes beneath assetRoot
    for (const mesh of result.meshes) {
      meshes.push(mesh);
      nodeMap.set(mesh.name, mesh);

      if (!mesh.parent) {
        mesh.parent = assetRoot;
      }

      // Add to shadow caster if shadowGenerator is active
      if (shadowGenerator && mesh.getTotalVertices() > 0) {
        shadowGenerator.addShadowCaster(mesh, true);
        mesh.receiveShadows = true;
      }

      // Material normalization and tuning
      if (mesh.material) {
        BikeLoader.tuneMeshMaterials(mesh.material);
      }
    }

    // Collect all transform nodes in hierarchy
    for (const tn of result.transformNodes) {
      nodeMap.set(tn.name, tn);
      if (!tn.parent) {
        tn.parent = assetRoot;
      }
    }

    // 3. RiderTargets under BikePhysicsRoot
    const riderTargetsRoot = new TransformNode(`rider_targets_${definition.id}`, scene);
    riderTargetsRoot.parent = physicsRoot;

    const anchors = definition.riderAnchors || {
      seatAnchor: new Vector3(0, 0.77, 0.16),
      leftGripAnchor: new Vector3(-0.27, 0.87, -0.38),
      rightGripAnchor: new Vector3(0.27, 0.87, -0.38),
      leftRearsetAnchor: new Vector3(-0.21, 0.42, 0.28),
      rightRearsetAnchor: new Vector3(0.21, 0.42, 0.28),
    };

    const seatAnchorNode = new TransformNode('seat_anchor', scene);
    seatAnchorNode.parent = riderTargetsRoot;
    seatAnchorNode.position.copyFrom(anchors.seatAnchor);

    const leftRearsetNode = new TransformNode('left_rearset_anchor', scene);
    leftRearsetNode.parent = riderTargetsRoot;
    leftRearsetNode.position.copyFrom(anchors.leftRearsetAnchor);

    const rightRearsetNode = new TransformNode('right_rearset_anchor', scene);
    rightRearsetNode.parent = riderTargetsRoot;
    rightRearsetNode.position.copyFrom(anchors.rightRearsetAnchor);

    // Grip anchors parented to handlebars if available so they steer with forks
    const handlebarsNode = definition.nodeMapping.handlebarsNodeName
      ? nodeMap.get(definition.nodeMapping.handlebarsNodeName)
      : null;

    const leftGripNode = new TransformNode('left_grip_anchor', scene);
    const rightGripNode = new TransformNode('right_grip_anchor', scene);

    if (handlebarsNode) {
      leftGripNode.parent = handlebarsNode;
      // Convert world/bike-local anchor to handlebars local coordinates
      const invMat = handlebarsNode.getWorldMatrix().clone().invert();
      const leftWorld = Vector3.TransformCoordinates(anchors.leftGripAnchor, physicsRoot.getWorldMatrix());
      leftGripNode.position = Vector3.TransformCoordinates(leftWorld, invMat);

      rightGripNode.parent = handlebarsNode;
      const rightWorld = Vector3.TransformCoordinates(anchors.rightGripAnchor, physicsRoot.getWorldMatrix());
      rightGripNode.position = Vector3.TransformCoordinates(rightWorld, invMat);
    } else {
      leftGripNode.parent = riderTargetsRoot;
      leftGripNode.position.copyFrom(anchors.leftGripAnchor);

      rightGripNode.parent = riderTargetsRoot;
      rightGripNode.position.copyFrom(anchors.rightGripAnchor);
    }

    const riderTargets: RiderTargetNodes = {
      seatAnchor: seatAnchorNode,
      leftGripAnchor: leftGripNode,
      rightGripAnchor: rightGripNode,
      leftRearsetAnchor: leftRearsetNode,
      rightRearsetAnchor: rightRearsetNode,
    };

    const visualController = new BikeVisualController(definition);
    visualController.bindNodes(physicsRoot, nodeMap);

    return {
      definition,
      physicsRoot,
      assetRoot,
      rootNode: physicsRoot,
      meshes,
      visualController,
      allNodes: nodeMap,
      riderTargets,
    };
  }

  public static tuneMeshMaterials(material: Material): void {
    if (material instanceof MultiMaterial) {
      material.subMaterials.forEach((sub) => {
        if (sub) BikeLoader.tuneMeshMaterials(sub);
      });
      return;
    }

    if (material instanceof PBRMaterial) {
      const name = material.name.toLowerCase();

      // Ensure glass materials maintain proper alpha blend and transmission
      if (name.includes('glass') || name.includes('windscreen') || name.includes('visor')) {
        material.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
        material.alpha = 0.25;
        material.roughness = 0.05;
        material.metallic = 0.05;
      } else {
        // Enforce opaque mode on all non-glass materials to eliminate depth sorting artifacts & white outlines
        material.transparencyMode = PBRMaterial.PBRMATERIAL_OPAQUE;
        material.alpha = 1.0;
        material.backFaceCulling = true;
      }

      // Ensure proper reflection and environment response
      if (material.environmentIntensity === undefined || material.environmentIntensity === 1.0) {
        material.environmentIntensity = 0.75;
      }
    }
  }
}
