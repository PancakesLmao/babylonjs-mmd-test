import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "babylon-mmd/esm/Loader/pmxLoader";
import "babylon-mmd/esm/Loader/mmdOutlineRenderer";

import type { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder";
import { Tools } from "@babylonjs/core/Misc/tools";
import { Scene } from "@babylonjs/core/scene";
import { MmdStandardMaterialBuilder } from "babylon-mmd/esm/Loader/mmdStandardMaterialBuilder";
import { MmdCamera } from "babylon-mmd/esm/Runtime/mmdCamera";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import { MmdWasmInstanceTypeMPR } from "babylon-mmd/esm/Runtime/Optimized/InstanceType/multiPhysicsRelease";
import { GetMmdWasmInstance } from "babylon-mmd/esm/Runtime/Optimized/mmdWasmInstance";
import { MultiPhysicsRuntime } from "babylon-mmd/esm/Runtime/Optimized/Physics/Bind/Impl/multiPhysicsRuntime";

import type { ISceneBuilder } from "./baseRuntime";

export class SceneBuilder implements ISceneBuilder {
    public async build(
        _canvas: HTMLCanvasElement,
        engine: AbstractEngine
    ): Promise<Scene> {
        const wasmInstance = await GetMmdWasmInstance(new MmdWasmInstanceTypeMPR());
        const physicsRuntime = new MultiPhysicsRuntime(wasmInstance);
        physicsRuntime.setGravity(new Vector3(0, -98, 0));

        const materialBuilder = new MmdStandardMaterialBuilder();
        const scene = new Scene(engine);
        scene.clearColor = new Color4(0.95, 0.95, 0.95, 1.0);
        scene.ambientColor = new Color3(0.5, 0.5, 0.5);

        physicsRuntime.register(scene);

        const mmdCamera = new MmdCamera("MmdCamera", new Vector3(0, 10, 0), scene);
        scene.activeCamera = mmdCamera;

        // Override texture loading to handle case sensitivity
        const originalLoadFile = Tools.LoadFile;
        Tools.LoadFile = function(url: string, ...args: any[]): any {
            const correctedUrl = url.replace(/\/textures\//i, "/Textures/");
            return (originalLoadFile as any).apply(Tools, [correctedUrl, ...args]);
        };

        const directionalLight = new DirectionalLight(
            "DirectionalLight",
            new Vector3(0.5, -1, 1),
            scene
        );
        directionalLight.intensity = 1.0;
        directionalLight.autoCalcShadowZBounds = true;

        const shadowGenerator = new ShadowGenerator(1024, directionalLight, true);
        shadowGenerator.transparencyShadow = true;
        shadowGenerator.usePercentageCloserFiltering = true;
        shadowGenerator.forceBackFacesOnly = true;
        shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
        shadowGenerator.frustumEdgeFalloff = 0.1;

        const ground = CreateGround(
            "ground1",
            { width: 100, height: 100, subdivisions: 2, updatable: false },
            scene
        );
        ground.receiveShadows = true;

        const modelMesh = await LoadAssetContainerAsync(
            "res/models/Manhattan_Casual/Manhattan.pmx",
            scene,
            {
                pluginOptions: {
                    mmdmodel: {
                        loggingEnabled: true,
                        materialBuilder: materialBuilder
                    }
                }
            }
        ).then((result) => {
            result.addAllToScene();
            return result.rootNodes[0] as MmdMesh;
        });

        for (const mesh of modelMesh.metadata.meshes) mesh.receiveShadows = true;
        shadowGenerator.addShadowCaster(modelMesh);

        return scene;
    }
}
