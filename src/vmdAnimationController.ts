import "babylon-mmd/esm/Loader/pmxLoader";
import "babylon-mmd/esm/Runtime/Animation/mmdCompositeRuntimeModelAnimation";

import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { Scene } from "@babylonjs/core/scene";
import { MmdStandardMaterialBuilder } from "babylon-mmd/esm/Loader/mmdStandardMaterialBuilder";
import { VmdLoader } from "babylon-mmd/esm/Loader/vmdLoader";
import {
    MmdAnimationSpan,
    MmdCompositeAnimation
} from "babylon-mmd/esm/Runtime/Animation/mmdCompositeAnimation";
import { StreamAudioPlayer } from "babylon-mmd/esm/Runtime/Audio/streamAudioPlayer";
import type { MmdCamera } from "babylon-mmd/esm/Runtime/mmdCamera";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import type { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";

import { AnimationBlender } from "./animationBlender";
import type { CameraController } from "./cameraController";
import { HumanoidRetargeter } from "./humanoidRetargeter";

export class VmdAnimationController {
    private readonly _scene: Scene;
    private readonly _mmdRuntime: MmdRuntime;
    private _mmdCamera: MmdCamera | null = null;
    private _mmdAnimation: any = null;
    private _isPlaying: boolean = false;
    private _playbackSpeed: number = 1.0;
    private _shadowGenerator: ShadowGenerator | null = null;
    private readonly _loadedModels: MmdModel[] = []; // Track all loaded models
    private readonly _modelAnimations: Map<MmdModel, any> = new Map(); // Store animations per model
    private readonly _modelBlenders: Map<MmdModel, AnimationBlender> = new Map(); // Animation blenders per model
    private readonly _modelRetargeters: Map<MmdModel, HumanoidRetargeter> =
        new Map(); // Humanoid retargeters per model
    private _cameraController: CameraController | null = null;

    public constructor(scene: Scene, mmdRuntime: MmdRuntime) {
        this._scene = scene;
        this._mmdRuntime = mmdRuntime;
    }

    public setCameraController(cameraController: CameraController): void {
        this._cameraController = cameraController;
    }

    public setMmdCamera(mmdCamera: MmdCamera): void {
        this._mmdCamera = mmdCamera;
    }

    public getLoadedModels(): MmdModel[] {
        return this._loadedModels;
    }

    public getAnimationBlender(modelIndex: number): AnimationBlender | null {
        if (modelIndex < 0 || modelIndex >= this._loadedModels.length) {
            console.warn(`Invalid model index: ${modelIndex}`);
            return null;
        }
        const model = this._loadedModels[modelIndex];
        return this._modelBlenders.get(model) || null;
    }

    public getHumanoidRetargeter(modelIndex: number): HumanoidRetargeter | null {
        if (modelIndex < 0 || modelIndex >= this._loadedModels.length) {
            console.warn(`Invalid model index: ${modelIndex}`);
            return null;
        }
        const model = this._loadedModels[modelIndex];
        return this._modelRetargeters.get(model) || null;
    }

    /**
   * Create or get a Mixamo to MMD retargeter for the specified model.
   * Useful for applying Mixamo animations to MMD models.
   */
    public getOrCreateMixamoToMMDRetargeter(
        modelIndex: number
    ): HumanoidRetargeter | null {
        if (modelIndex < 0 || modelIndex >= this._loadedModels.length) {
            console.warn(`Invalid model index: ${modelIndex}`);
            return null;
        }
        const model = this._loadedModels[modelIndex];

        if (!this._modelRetargeters.has(model)) {
            const retargeter = HumanoidRetargeter.CreateMixamoToMMD(model);
            this._modelRetargeters.set(model, retargeter);
        }

        return this._modelRetargeters.get(model) || null;
    }

    /**
   * Create or get a MMD to Mixamo retargeter for the specified model.
   * Useful for applying MMD animations to humanoid models.
   */
    public getOrCreateMMDToMixamoRetargeter(
        modelIndex: number
    ): HumanoidRetargeter | null {
        if (modelIndex < 0 || modelIndex >= this._loadedModels.length) {
            console.warn(`Invalid model index: ${modelIndex}`);
            return null;
        }
        const model = this._loadedModels[modelIndex];

        if (!this._modelRetargeters.has(model)) {
            const retargeter = HumanoidRetargeter.CreateMMDToMixamo(model);
            this._modelRetargeters.set(model, retargeter);
        }

        return this._modelRetargeters.get(model) || null;
    }

    public onModelLoaded(
        callback: (model: MmdModel, modelIndex: number) => void
    ): void {
    // Store callback to be called when models are loaded
        (this._mmdRuntime as any)._onModelLoadedCallback = callback;
    }
    public setShadowGenerator(shadowGenerator: ShadowGenerator): void {
        this._shadowGenerator = shadowGenerator;
    }

    public registerInitialModel(modelMesh: MmdMesh): void {
    // Register the initial model loaded at startup
        const mmdModel = this._mmdRuntime.createMmdModel(modelMesh);
        this._loadedModels.push(mmdModel);

        // Create animation blender for this model
        const blender = new AnimationBlender(this._mmdRuntime, mmdModel);
        this._modelBlenders.set(mmdModel, blender);

        console.log("Initial model registered with index 0");
    }

    public async loadModel(modelPath: string): Promise<MmdMesh> {
        try {
            console.log("Loading model:", modelPath);
            const materialBuilder = new MmdStandardMaterialBuilder();

            const modelMesh = await LoadAssetContainerAsync(modelPath, this._scene, {
                pluginOptions: {
                    mmdmodel: {
                        loggingEnabled: true,
                        materialBuilder: materialBuilder
                    }
                }
            }).then((result) => {
                result.addAllToScene();
                return result.rootNodes[0] as MmdMesh;
            });

            // Add shadow casting
            if (this._shadowGenerator) {
                for (const mesh of modelMesh.metadata.meshes) {
                    mesh.receiveShadows = true;
                }
                this._shadowGenerator.addShadowCaster(modelMesh);
            }

            // Register with MmdRuntime and track the created MmdModel
            const mmdModel = this._mmdRuntime.createMmdModel(modelMesh);
            this._loadedModels.push(mmdModel);

            // Create animation blender for this model
            const blender = new AnimationBlender(this._mmdRuntime, mmdModel);
            this._modelBlenders.set(mmdModel, blender);

            console.log("Model loaded successfully:", modelPath);
            return modelMesh;
        } catch (error) {
            console.error("Failed to load model:", error);
            throw error;
        }
    }

    public async loadModelFromFile(file: File): Promise<MmdMesh> {
        try {
            console.log("Loading model from file:", file.name);
            const materialBuilder = new MmdStandardMaterialBuilder();

            // Create a blob URL and append the filename to help babylon-mmd detect the file type
            const blobUrl = URL.createObjectURL(file);
            // Append filename as a hint for the loader
            const urlWithHint = blobUrl + "#" + file.name;

            try {
                const container = await LoadAssetContainerAsync(
                    urlWithHint,
                    this._scene,
                    {
                        pluginOptions: {
                            mmdmodel: {
                                loggingEnabled: true,
                                materialBuilder: materialBuilder
                            }
                        }
                    }
                );

                container.addAllToScene();
                const modelMesh = container.rootNodes[0] as MmdMesh;

                // Add shadow casting
                if (this._shadowGenerator) {
                    for (const mesh of modelMesh.metadata.meshes) {
                        mesh.receiveShadows = true;
                    }
                    this._shadowGenerator.addShadowCaster(modelMesh);
                }

                // Register with MmdRuntime and track the created MmdModel
                const mmdModel = this._mmdRuntime.createMmdModel(modelMesh);
                this._loadedModels.push(mmdModel);
                console.log("Model loaded successfully from file:", file.name);
                return modelMesh;
            } finally {
                // Clean up blob URL
                URL.revokeObjectURL(blobUrl);
            }
        } catch (error) {
            console.error("Failed to load model from file:", error);
            throw error;
        }
    }

    public async loadVmdFile(file: File): Promise<void> {
        try {
            // Validate file is a VMD file
            if (!file.name.toLowerCase().endsWith(".vmd")) {
                throw new Error(
                    `Invalid file type. Expected .vmd file, got ${file.name}`
                );
            }

            console.log(
                "Loading VMD animation from:",
                file.name,
                "Size:",
                file.size,
                "bytes"
            );
            const loader = new VmdLoader(this._scene);
            loader.loggingEnabled = true;

            // Load animation using babylon-mmd's native loader
            const mmdAnimation = await loader.loadAsync(
                file.name.replace(/\.[^.]+$/, ""), // Remove file extension for name
                file
            );

            console.log(
                "VMD loaded successfully. Has camera animation:",
                !!(mmdAnimation as any).cameraAnimation
            );

            // Get the MMD model from runtime (first model)
            const mmdModel = (this._mmdRuntime as any).models?.[0];
            if (mmdModel) {
                // Add animation to the blender instead of replacing it
                const blender = this._modelBlenders.get(mmdModel);
                if (blender) {
                    const animationName = file.name.replace(/\.[^.]+$/, "");
                    // Pass raw animation data - AnimationBlender handles createRuntimeAnimation
                    blender.addAnimationLayer(animationName, mmdAnimation, 1.0);
                    console.log(`Model animation "${animationName}" added to blender`);
                } else {
                    // Fallback if blender doesn't exist
                    const modelAnimationHandle =
            mmdModel.createRuntimeAnimation(mmdAnimation);
                    mmdModel.setRuntimeAnimation(modelAnimationHandle);
                }
            } else {
                console.warn("No MMD model found in runtime");
            }

            // Load camera animation if camera is set and available
            if (this._mmdCamera && (mmdAnimation as any).cameraAnimation) {
                const cameraAnimationHandle = this._mmdCamera.createRuntimeAnimation(
                    (mmdAnimation as any).cameraAnimation
                );
                this._mmdCamera.setRuntimeAnimation(cameraAnimationHandle);
                this._mmdRuntime.addAnimatable(this._mmdCamera);
                console.log("Camera animation applied");
            }

            this._mmdAnimation = mmdAnimation;

            console.log("VMD animation loaded successfully");
        } catch (error) {
            // Extract the actual error message from babylon-mmd's error object
            let errorMsg = "Unknown error";

            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === "object" && error !== null) {
                // babylon-mmd returns error objects with exception property
                const errorObj = error as any;
                if (errorObj.exception instanceof Error) {
                    errorMsg = errorObj.exception.message;
                } else if (errorObj.exception) {
                    errorMsg = String(errorObj.exception);
                } else {
                    errorMsg = JSON.stringify(error);
                }
            } else {
                errorMsg = String(error);
            }

            console.error("Failed to load VMD file. Error:", errorMsg);
            if (error instanceof Error && error.stack) {
                console.error("Stack trace:", error.stack);
            }
            throw error;
        }
    }

    public async loadVmdForModel(file: File, modelIndex: number): Promise<void> {
        try {
            if (modelIndex < 0 || modelIndex >= this._loadedModels.length) {
                throw new Error(`Invalid model index: ${modelIndex}`);
            }

            const targetModel = this._loadedModels[modelIndex];

            // Validate file is a VMD file
            if (!file.name.toLowerCase().endsWith(".vmd")) {
                throw new Error(
                    `Invalid file type. Expected .vmd file, got ${file.name}`
                );
            }

            console.log(
                "Loading VMD animation for model",
                modelIndex,
                "from:",
                file.name
            );
            const loader = new VmdLoader(this._scene);
            loader.loggingEnabled = true;

            // Load animation using babylon-mmd's native loader
            const mmdAnimation = await loader.loadAsync(
                file.name.replace(/\.[^.]+$/, ""), // Remove file extension for name
                file
            );

            console.log(
                "VMD loaded successfully for model",
                modelIndex,
                "Has camera animation:",
                !!(mmdAnimation as any).cameraAnimation
            );

            // Add animation to the blender instead of replacing it
            const blender = this._modelBlenders.get(targetModel);
            if (blender) {
                const animationName = file.name.replace(/\.[^.]+$/, "");
                // Pass raw animation data - AnimationBlender handles createRuntimeAnimation
                blender.addAnimationLayer(animationName, mmdAnimation, 1.0);
                console.log(`Animation "${animationName}" added to blender for model`);
            } else {
                // Fallback if blender doesn't exist
                const modelAnimationHandle =
          targetModel.createRuntimeAnimation(mmdAnimation);
                targetModel.setRuntimeAnimation(modelAnimationHandle);
            }

            // Store animation for this model
            this._modelAnimations.set(targetModel, mmdAnimation);

            console.log("VMD animation loaded successfully for model", modelIndex);
        } catch (error) {
            // Extract the actual error message from babylon-mmd's error object
            let errorMsg = "Unknown error";

            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === "object" && error !== null) {
                // babylon-mmd returns error objects with exception property
                const errorObj = error as any;
                if (errorObj.exception instanceof Error) {
                    errorMsg = errorObj.exception.message;
                } else if (errorObj.exception) {
                    errorMsg = String(errorObj.exception);
                } else {
                    errorMsg = JSON.stringify(error);
                }
            } else {
                errorMsg = String(error);
            }

            console.error("Failed to load VMD file for model. Error:", errorMsg);
            if (error instanceof Error && error.stack) {
                console.error("Stack trace:", error.stack);
            }
            throw error;
        }
    }

    public async loadVmdForModelWithMorphs(
        motionFile: File,
        morphFile: File | null,
        modelIndex: number
    ): Promise<void> {
        try {
            if (modelIndex < 0 || modelIndex >= this._loadedModels.length) {
                throw new Error(`Invalid model index: ${modelIndex}`);
            }

            const targetModel = this._loadedModels[modelIndex];

            // Validate motion file is a VMD file
            if (!motionFile.name.toLowerCase().endsWith(".vmd")) {
                throw new Error(
                    `Invalid motion file type. Expected .vmd file, got ${motionFile.name}`
                );
            }

            const loader = new VmdLoader(this._scene);
            loader.loggingEnabled = true;

            console.log(
                "Loading motion VMD for model",
                modelIndex,
                "from:",
                motionFile.name
            );

            // Load motion animation
            const motionAnimation = await loader.loadAsync(
                motionFile.name.replace(/\.[^.]+$/, ""),
                motionFile
            );

            console.log("Motion VMD loaded successfully for model", modelIndex);

            // Create composite animation to hold both motion and facial expression
            const compositeName = `${motionFile.name.replace(
                /\.[^.]+$/,
                ""
            )}_composite`;
            const compositeAnimation = new MmdCompositeAnimation(compositeName);

            // Add motion animation as first span
            const motionSpan = new MmdAnimationSpan(
                motionAnimation,
                undefined, // startFrame - use animation's default
                undefined, // endFrame - use animation's default
                0, // offset - start at frame 0
                1.0 // weight - full weight for motion
            );
            compositeAnimation.addSpan(motionSpan);
            console.log("Motion animation span added to composite");

            // Load and add facial expression animation if provided
            if (morphFile && morphFile.name.toLowerCase().endsWith(".vmd")) {
                console.log(
                    "Loading facial expression VMD for model",
                    modelIndex,
                    "from:",
                    morphFile.name
                );

                const morphAnimation = await loader.loadAsync(
                    morphFile.name.replace(/\.[^.]+$/, ""),
                    morphFile
                );

                console.log(
                    "Facial expression VMD loaded successfully for model",
                    modelIndex
                );

                // Add facial expression animation as second span
                const morphSpan = new MmdAnimationSpan(
                    morphAnimation,
                    undefined, // startFrame - use animation's default
                    undefined, // endFrame - use animation's default
                    0, // offset - start at frame 0
                    1.0 // weight - full weight for facial expression
                );
                compositeAnimation.addSpan(morphSpan);
                console.log("Facial expression animation span added to composite");
            }

            // Create runtime animation from composite
            const compositeAnimationHandle =
        targetModel.createRuntimeAnimation(compositeAnimation);

            // Set the composite animation on the model
            targetModel.setRuntimeAnimation(compositeAnimationHandle);
            console.log("Composite animation applied to model", modelIndex);

            // Store composite animation for this model
            this._modelAnimations.set(targetModel, compositeAnimation);

            console.log("Animation loaded successfully for model", modelIndex);
        } catch (error) {
            // Extract the actual error message from babylon-mmd's error object
            let errorMsg = "Unknown error";

            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === "object" && error !== null) {
                const errorObj = error as any;
                if (errorObj.exception instanceof Error) {
                    errorMsg = errorObj.exception.message;
                } else if (errorObj.exception) {
                    errorMsg = String(errorObj.exception);
                } else {
                    errorMsg = JSON.stringify(error);
                }
            } else {
                errorMsg = String(error);
            }

            console.error(
                "Failed to load VMD animation with morphs for model. Error:",
                errorMsg
            );
            if (error instanceof Error && error.stack) {
                console.error("Stack trace:", error.stack);
            }
            throw error;
        }
    }

    public async loadVmdForModelWithMorphsAndMouth(
        motionFile: File,
        morphFile: File | null,
        mouthFile: File | null,
        modelIndex: number
    ): Promise<void> {
        try {
            if (modelIndex < 0 || modelIndex >= this._loadedModels.length) {
                throw new Error(`Invalid model index: ${modelIndex}`);
            }

            const targetModel = this._loadedModels[modelIndex];

            // Validate motion file is a VMD file
            if (!motionFile.name.toLowerCase().endsWith(".vmd")) {
                throw new Error(
                    `Invalid motion file type. Expected .vmd file, got ${motionFile.name}`
                );
            }

            const loader = new VmdLoader(this._scene);
            loader.loggingEnabled = true;

            console.log(
                "Loading motion VMD for model",
                modelIndex,
                "from:",
                motionFile.name
            );

            // Load motion animation
            const motionAnimation = await loader.loadAsync(
                motionFile.name.replace(/\.[^.]+$/, ""),
                motionFile
            );

            console.log("Motion VMD loaded successfully for model", modelIndex);

            // Create composite animation to hold multiple animations
            const compositeName = `${motionFile.name.replace(
                /\.[^.]+$/,
                ""
            )}_composite`;
            const compositeAnimation = new MmdCompositeAnimation(compositeName);

            // Add motion animation as first span
            const motionSpan = new MmdAnimationSpan(
                motionAnimation,
                undefined, // startFrame - use animation's default
                undefined, // endFrame - use animation's default
                0, // offset - start at frame 0
                1.0 // weight - full weight for motion
            );
            compositeAnimation.addSpan(motionSpan);
            console.log("Motion animation span added to composite");

            // Load and add facial expression animation if provided
            if (morphFile && morphFile.name.toLowerCase().endsWith(".vmd")) {
                console.log(
                    "Loading facial expression VMD for model",
                    modelIndex,
                    "from:",
                    morphFile.name
                );

                const morphAnimation = await loader.loadAsync(
                    morphFile.name.replace(/\.[^.]+$/, ""),
                    morphFile
                );

                console.log(
                    "Facial expression VMD loaded successfully for model",
                    modelIndex
                );

                // Add facial expression animation as second span
                const morphSpan = new MmdAnimationSpan(
                    morphAnimation,
                    undefined, // startFrame - use animation's default
                    undefined, // endFrame - use animation's default
                    0, // offset - start at frame 0
                    1.0 // weight - full weight for facial expression
                );
                compositeAnimation.addSpan(morphSpan);
                console.log("Facial expression animation span added to composite");
            }

            // Load and add mouth animation if provided
            if (mouthFile && mouthFile.name.toLowerCase().endsWith(".vmd")) {
                console.log(
                    "Loading mouth motion VMD for model",
                    modelIndex,
                    "from:",
                    mouthFile.name
                );

                const mouthAnimation = await loader.loadAsync(
                    mouthFile.name.replace(/\.[^.]+$/, ""),
                    mouthFile
                );

                console.log(
                    "Mouth motion VMD loaded successfully for model",
                    modelIndex
                );

                // Add mouth animation as third span
                const mouthSpan = new MmdAnimationSpan(
                    mouthAnimation,
                    undefined, // startFrame - use animation's default
                    undefined, // endFrame - use animation's default
                    0, // offset - start at frame 0
                    1.0 // weight - full weight for mouth animation
                );
                compositeAnimation.addSpan(mouthSpan);
                console.log("Mouth motion animation span added to composite");
            }

            // Create runtime animation from composite
            const compositeAnimationHandle =
        targetModel.createRuntimeAnimation(compositeAnimation);

            // Set the composite animation on the model
            targetModel.setRuntimeAnimation(compositeAnimationHandle);
            console.log("Composite animation applied to model", modelIndex);

            // Store composite animation for this model
            this._modelAnimations.set(targetModel, compositeAnimation);

            console.log("Animation loaded successfully for model", modelIndex);
        } catch (error) {
            // Extract the actual error message from babylon-mmd's error object
            let errorMsg = "Unknown error";

            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === "object" && error !== null) {
                const errorObj = error as any;
                if (errorObj.exception instanceof Error) {
                    errorMsg = errorObj.exception.message;
                } else if (errorObj.exception) {
                    errorMsg = String(errorObj.exception);
                } else {
                    errorMsg = JSON.stringify(error);
                }
            } else {
                errorMsg = String(error);
            }

            console.error(
                "Failed to load VMD animation with morphs and mouth for model. Error:",
                errorMsg
            );
            if (error instanceof Error && error.stack) {
                console.error("Stack trace:", error.stack);
            }
            throw error;
        }
    }

    public async loadVmdForModelWithMorphsMouthAndEye(
        motionFile: File,
        morphFile: File | null,
        mouthFile: File | null,
        eyeFile: File | null,
        modelIndex: number
    ): Promise<void> {
        try {
            if (modelIndex < 0 || modelIndex >= this._loadedModels.length) {
                throw new Error(`Invalid model index: ${modelIndex}`);
            }

            const targetModel = this._loadedModels[modelIndex];

            // Validate motion file is a VMD file
            if (!motionFile.name.toLowerCase().endsWith(".vmd")) {
                throw new Error(
                    `Invalid motion file type. Expected .vmd file, got ${motionFile.name}`
                );
            }

            const loader = new VmdLoader(this._scene);
            loader.loggingEnabled = true;

            console.log(
                "Loading motion VMD for model",
                modelIndex,
                "from:",
                motionFile.name
            );

            // Load motion animation
            const motionAnimation = await loader.loadAsync(
                motionFile.name.replace(/\.[^.]+$/, ""),
                motionFile
            );

            console.log("Motion VMD loaded successfully for model", modelIndex);

            // Create composite animation to hold multiple animations
            const compositeName = `${motionFile.name.replace(
                /\.[^.]+$/,
                ""
            )}_composite`;
            const compositeAnimation = new MmdCompositeAnimation(compositeName);

            // Add motion animation as first span
            const motionSpan = new MmdAnimationSpan(
                motionAnimation,
                undefined,
                undefined,
                0,
                1.0
            );
            compositeAnimation.addSpan(motionSpan);
            console.log("Motion animation span added to composite");

            // Load and add facial expression animation if provided
            if (morphFile && morphFile.name.toLowerCase().endsWith(".vmd")) {
                console.log(
                    "Loading facial expression VMD for model",
                    modelIndex,
                    "from:",
                    morphFile.name
                );

                const morphAnimation = await loader.loadAsync(
                    morphFile.name.replace(/\.[^.]+$/, ""),
                    morphFile
                );

                console.log(
                    "Facial expression VMD loaded successfully for model",
                    modelIndex
                );

                const morphSpan = new MmdAnimationSpan(
                    morphAnimation,
                    undefined,
                    undefined,
                    0,
                    1.0
                );
                compositeAnimation.addSpan(morphSpan);
                console.log("Facial expression animation span added to composite");
            }

            // Load and add mouth animation if provided
            if (mouthFile && mouthFile.name.toLowerCase().endsWith(".vmd")) {
                console.log(
                    "Loading mouth motion VMD for model",
                    modelIndex,
                    "from:",
                    mouthFile.name
                );

                const mouthAnimation = await loader.loadAsync(
                    mouthFile.name.replace(/\.[^.]+$/, ""),
                    mouthFile
                );

                console.log(
                    "Mouth motion VMD loaded successfully for model",
                    modelIndex
                );

                const mouthSpan = new MmdAnimationSpan(
                    mouthAnimation,
                    undefined,
                    undefined,
                    0,
                    1.0
                );
                compositeAnimation.addSpan(mouthSpan);
                console.log("Mouth motion animation span added to composite");
            }

            // Load and add eye animation if provided
            if (eyeFile && eyeFile.name.toLowerCase().endsWith(".vmd")) {
                console.log(
                    "Loading eye motion VMD for model",
                    modelIndex,
                    "from:",
                    eyeFile.name
                );

                const eyeAnimation = await loader.loadAsync(
                    eyeFile.name.replace(/\.[^.]+$/, ""),
                    eyeFile
                );

                console.log("Eye motion VMD loaded successfully for model", modelIndex);

                const eyeSpan = new MmdAnimationSpan(
                    eyeAnimation,
                    undefined,
                    undefined,
                    0,
                    1.0
                );
                compositeAnimation.addSpan(eyeSpan);
                console.log("Eye motion animation span added to composite");
            }

            // Create runtime animation from composite
            const compositeAnimationHandle =
        targetModel.createRuntimeAnimation(compositeAnimation);

            // Set the composite animation on the model
            targetModel.setRuntimeAnimation(compositeAnimationHandle);
            console.log("Composite animation applied to model", modelIndex);

            // Store composite animation for this model
            this._modelAnimations.set(targetModel, compositeAnimation);

            console.log("Animation loaded successfully for model", modelIndex);
        } catch (error) {
            // Extract the actual error message from babylon-mmd's error object
            let errorMsg = "Unknown error";

            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === "object" && error !== null) {
                const errorObj = error as any;
                if (errorObj.exception instanceof Error) {
                    errorMsg = errorObj.exception.message;
                } else if (errorObj.exception) {
                    errorMsg = String(errorObj.exception);
                } else {
                    errorMsg = JSON.stringify(error);
                }
            } else {
                errorMsg = String(error);
            }

            console.error(
                "Failed to load VMD animation with morphs, mouth and eye for model. Error:",
                errorMsg
            );
            if (error instanceof Error && error.stack) {
                console.error("Stack trace:", error.stack);
            }
            throw error;
        }
    }

    public async loadCameraMotion(file: File): Promise<void> {
        try {
            // Validate file is a VMD file
            if (!file.name.toLowerCase().endsWith(".vmd")) {
                throw new Error(
                    `Invalid file type. Expected .vmd file, got ${file.name}`
                );
            }

            console.log(
                "Loading camera motion:",
                file.name,
                "Size:",
                file.size,
                "bytes"
            );
            const loader = new VmdLoader(this._scene);
            loader.loggingEnabled = true;

            // Load camera motion from VMD file
            const cameraAnimation = await loader.loadAsync(
                file.name.replace(/\.[^.]+$/, ""),
                file
            );

            console.log(
                "Loaded animation has camera data:",
                !!(cameraAnimation as any).cameraAnimation
            );

            if (this._mmdCamera && this._cameraController) {
                // Validate camera animation before adding
                const validation =
          this._cameraController.validateCameraAnimation(cameraAnimation);

                if (!validation.isValid) {
                    console.warn(
                        "Camera animation validation warnings:",
                        validation.errors
                    );
                }

                // Add camera animation with metadata
                const animationName = file.name.replace(/\.[^.]+$/, "");
                this._cameraController.addCameraAnimation(
                    cameraAnimation,
                    animationName,
                    1.0
                );

                // Get animation info
                const animInfo =
          this._cameraController.getCameraAnimationInfo(animationName);
                if (animInfo) {
                    console.log(
                        `Camera animation: ${
                            animInfo.frameCount
                        } frames, ${animInfo.duration.toFixed(2)}s`
                    );
                }

                this._mmdRuntime.addAnimatable(this._mmdCamera);
                console.log("Camera motion loaded successfully");
            } else {
                console.warn(
                    "Camera not available or camera controller not initialized"
                );
            }
        } catch (error) {
            // Extract the actual error message from babylon-mmd's error object
            let errorMsg = "Unknown error";

            if (error instanceof Error) {
                errorMsg = error.message;
            } else if (typeof error === "object" && error !== null) {
                // babylon-mmd returns error objects with exception property
                const errorObj = error as any;
                if (errorObj.exception instanceof Error) {
                    errorMsg = errorObj.exception.message;
                } else if (errorObj.exception) {
                    errorMsg = String(errorObj.exception);
                } else {
                    errorMsg = JSON.stringify(error);
                }
            } else {
                errorMsg = String(error);
            }

            console.error("Failed to load camera motion file. Error:", errorMsg);
            throw error;
        }
    }

    public async loadAudioFile(file: File): Promise<void> {
        try {
            // Create blob URL for audio file
            const blobUrl = URL.createObjectURL(file);

            // Create StreamAudioPlayer
            const audioPlayer = new StreamAudioPlayer(this._scene);
            audioPlayer.source = blobUrl;

            // Set audio player on MmdRuntime for synchronization
            this._mmdRuntime.setAudioPlayer(audioPlayer);

            console.log("Audio file loaded and synchronized with animation");
        } catch (error) {
            console.error("Failed to load audio file:", error);
            throw error;
        }
    }

    public play(): void {
        this._isPlaying = true;
        this._mmdRuntime.playAnimation();
        console.log("VMD animation playback started");
    }

    public pause(): void {
        this._isPlaying = false;
        (this._mmdRuntime as any).pauseAnimation(true);
        console.log("VMD animation playback paused");
    }

    public stop(): void {
        this._isPlaying = false;
        (this._mmdRuntime as any).pauseAnimation(true);
        // Reset to frame 0 using timeline
        (this._mmdRuntime as any).animationTimelineCurrentFrameIndex = 0;
        console.log("VMD animation playback stopped");
    }

    public reset(): void {
    // First, pause animation completely to stop the internal timeline
        this._isPlaying = false;
        (this._mmdRuntime as any).pauseAnimation(true);

        // Get the MMD model from runtime
        const mmdModel = (this._mmdRuntime as any).models?.[0];

        // Reset frame to 0
        (this._mmdRuntime as any).animationTimelineCurrentFrameIndex = 0;

        if (mmdModel && this._mmdAnimation) {
            // Re-create and re-apply the animation to force babylon-mmd to update
            // This resets babylon-mmd's internal animation state cache
            const modelAnimationHandle = mmdModel.createRuntimeAnimation(
                this._mmdAnimation
            );
            mmdModel.setRuntimeAnimation(modelAnimationHandle);

            // Re-apply camera animation if available
            if (this._mmdCamera && (this._mmdAnimation as any).cameraAnimation) {
                const cameraAnimationHandle = this._mmdCamera.createRuntimeAnimation(
                    (this._mmdAnimation as any).cameraAnimation
                );
                this._mmdCamera.setRuntimeAnimation(cameraAnimationHandle);
            }
        }

        console.log("VMD animation reset to frame 0");
    }

    public setFrame(frame: number): void {
        (this._mmdRuntime as any).animationTimelineCurrentFrameIndex = frame;
    }

    public getCurrentFrame(): number {
        return (this._mmdRuntime as any).animationTimelineCurrentFrameIndex || 0;
    }

    public getTotalFrames(): number {
        if (!this._mmdAnimation) return 0;
        // Get the maximum frame count from animations
        let maxFrame = 0;
        const animations = (this._mmdAnimation as any).animations as any[];
        if (animations) {
            for (const animation of animations) {
                if (animation.frameLength && animation.frameLength > maxFrame) {
                    maxFrame = animation.frameLength;
                }
            }
        }
        return maxFrame;
    }

    public isPlaying(): boolean {
        return this._isPlaying;
    }

    public setPlaybackSpeed(speed: number): void {
        this._playbackSpeed = Math.max(0.1, Math.min(4.0, speed));
        (this._mmdRuntime as any).animationTimelinePlaybackSpeed =
      this._playbackSpeed;
    }

    public getPlaybackSpeed(): number {
        return this._playbackSpeed;
    }
}
