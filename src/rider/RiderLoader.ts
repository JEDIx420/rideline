import { Scene } from '@babylonjs/core/scene';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/loaders/glTF';

import { RiderDefinition } from './RiderDefinition';
import { RiderRig } from './RiderRig';

export interface LoadedRider {
  definition: RiderDefinition;
  rootNode: TransformNode;
  rig: RiderRig;
  meshes: AbstractMesh[];
}

export class RiderLoader {
  public static async loadRider(
    definition: RiderDefinition,
    scene: Scene,
    shadowGenerator?: ShadowGenerator | null,
    onProgress?: (pct: number) => void
  ): Promise<LoadedRider> {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '') + '/';
    const cleanPath = definition.modelPath.replace(/^\//, '');
    const fullModelUrl = baseUrl + cleanPath;

    const rootNode = new TransformNode(`rider_root_${definition.id}`, scene);
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

    const meshes: AbstractMesh[] = [];

    // Parent loaded top-level nodes/meshes under rootNode
    for (const mesh of result.meshes) {
      meshes.push(mesh);
      if (!mesh.parent) {
        mesh.parent = rootNode;
      }

      if (shadowGenerator && mesh.getTotalVertices() > 0) {
        shadowGenerator.addShadowCaster(mesh, true);
        mesh.receiveShadows = true;
      }
    }

    for (const tn of result.transformNodes) {
      if (!tn.parent) {
        tn.parent = rootNode;
      }
    }

    const skeleton = result.skeletons[0];
    if (!skeleton) {
      throw new Error(`Loaded rider asset from ${fullModelUrl} has no skeleton!`);
    }

    const rig = new RiderRig(rootNode, skeleton, meshes);

    return {
      definition,
      rootNode,
      rig,
      meshes,
    };
  }
}
