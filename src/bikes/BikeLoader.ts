import { Scene } from '@babylonjs/core/scene';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/loaders/glTF'; // Register glTF / GLB loader

import { BikeDefinition } from './BikeDefinition';
import { BikeVisualController } from './BikeVisualController';

export interface LoadedBike {
  definition: BikeDefinition;
  rootNode: TransformNode;
  meshes: AbstractMesh[];
  visualController: BikeVisualController;
  allNodes: Map<string, TransformNode>;
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

    // Create a container root node for the bike
    const rootNode = new TransformNode(`bike_root_${definition.id}`, scene);
    rootNode.scaling.copyFrom(definition.modelScale);

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

    // Reparent loaded root/top meshes to our rootNode
    for (const mesh of result.meshes) {
      meshes.push(mesh);
      nodeMap.set(mesh.name, mesh);

      if (!mesh.parent) {
        mesh.parent = rootNode;
      }

      // Add to shadow caster if shadowGenerator is active
      if (shadowGenerator && mesh.getTotalVertices() > 0) {
        shadowGenerator.addShadowCaster(mesh, true);
        mesh.receiveShadows = true;
      }
    }

    // Collect all transform nodes in hierarchy
    for (const tn of result.transformNodes) {
      nodeMap.set(tn.name, tn);
    }

    const visualController = new BikeVisualController(definition);
    visualController.bindNodes(rootNode, nodeMap);

    return {
      definition,
      rootNode,
      meshes,
      visualController,
      allNodes: nodeMap,
    };
  }
}
