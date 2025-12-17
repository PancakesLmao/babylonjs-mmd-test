import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
import type { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";

interface AnimationLayer {
  name: string;
  animationData: any;
  weight: number;
  isActive: boolean;
  runtimeHandle: any;
}

/**
 * AnimationBlender manages blending of multiple animations on a single model.
 * Allows smooth transitions between animations and weighted blending of multiple animation tracks.
 */
export class AnimationBlender {
    private readonly _model: MmdModel;
    private _animationLayers: AnimationLayer[] = [];
    private _blendMode: "additive" | "override" = "override";

    public constructor(_mmdRuntime: MmdRuntime, model: MmdModel) {
        this._model = model;
    }

    /**
   * Add an animation layer with a specific weight
   */
    public addAnimationLayer(
        name: string,
        animationData: any,
        weight: number = 1.0
    ): void {
    // Check if layer already exists
        const existingLayer = this._animationLayers.find((l) => l.name === name);
        if (existingLayer) {
            console.warn(
                `Animation layer "${name}" already exists. Updating weight.`
            );
            existingLayer.weight = Math.max(0, Math.min(1, weight));
            return;
        }

        // Create runtime animation handle
        const runtimeHandle = this._model.createRuntimeAnimation(animationData);

        const layer: AnimationLayer = {
            name,
            animationData,
            weight: Math.max(0, Math.min(1, weight)),
            isActive: true,
            runtimeHandle
        };

        this._animationLayers.push(layer);
        console.log(`Animation layer "${name}" added with weight ${layer.weight}`);

        // Apply the animation immediately since babylon-mmd only supports one at a time
        // When a new layer is added, it replaces the previous one (standard MMD behavior)
        this._model.setRuntimeAnimation(runtimeHandle);
        console.log(`Animation layer "${name}" applied to model`);
    }

    /**
   * Remove an animation layer
   */
    public removeAnimationLayer(name: string): void {
        const index = this._animationLayers.findIndex((l) => l.name === name);
        if (index >= 0) {
            this._animationLayers.splice(index, 1);
            console.log(`Animation layer "${name}" removed`);
            this._applyBlendedAnimation();
        }
    }

    /**
   * Set the weight of an animation layer
   */
    public setLayerWeight(name: string, weight: number): void {
        const layer = this._animationLayers.find((l) => l.name === name);
        if (layer) {
            layer.weight = Math.max(0, Math.min(1, weight));
            this._applyBlendedAnimation();
        }
    }

    /**
   * Get the weight of an animation layer
   */
    public getLayerWeight(name: string): number {
        const layer = this._animationLayers.find((l) => l.name === name);
        return layer ? layer.weight : 0;
    }

    /**
   * Set active/inactive state for a layer
   */
    public setLayerActive(name: string, isActive: boolean): void {
        const layer = this._animationLayers.find((l) => l.name === name);
        if (layer) {
            layer.isActive = isActive;
            this._applyBlendedAnimation();
        }
    }

    /**
   * Get list of all animation layers
   */
    public getAnimationLayers(): readonly AnimationLayer[] {
        return Object.freeze([...this._animationLayers]);
    }

    /**
   * Set blend mode (override or additive)
   */
    public setBlendMode(mode: "additive" | "override"): void {
        this._blendMode = mode;
        this._applyBlendedAnimation();
    }

    /**
   * Get current blend mode
   */
    public getBlendMode(): string {
        return this._blendMode;
    }

    /**
   * Clear all animation layers
   */
    public clearLayers(): void {
        this._animationLayers = [];
        console.log("All animation layers cleared");
    }

    /**
   * Apply blended animation to the model
   * This merges the animations based on their weights and blend mode
   */
    private _applyBlendedAnimation(): void {
        if (this._animationLayers.length === 0) {
            console.warn("No animation layers to blend");
            return;
        }

        if (this._animationLayers.length === 1) {
            // Single layer - just apply it directly
            const layer = this._animationLayers[0];
            if (layer.isActive) {
                const handle = this._model.createRuntimeAnimation(layer.animationData);
                this._model.setRuntimeAnimation(handle);
                console.log(`Applied single animation layer: "${layer.name}"`);
            }
            return;
        }

        // Multiple layers - blend them
        const activeLayers = this._animationLayers.filter((l) => l.isActive);
        if (activeLayers.length === 0) {
            console.warn("No active animation layers");
            return;
        }

        // Normalize weights
        const totalWeight = activeLayers.reduce((sum, l) => sum + l.weight, 0);
        const normalizedLayers = activeLayers.map((l) => ({
            ...l,
            normalizedWeight: l.weight / totalWeight
        }));

        if (this._blendMode === "additive") {
            this._applyAdditiveBlending(normalizedLayers);
        } else {
            this._applyOverrideBlending(normalizedLayers);
        }
    }

    /**
   * Apply additive blending - combines animations additively
   */
    private _applyAdditiveBlending(
        normalizedLayers: (AnimationLayer & { normalizedWeight: number })[]
    ): void {
    // For additive blending, use the first layer as base and add others on top
        const baseLayer = normalizedLayers[0];
        const baseAnimation = baseLayer.animationData as any;

        // Create blended animation by copying base and adding weighted contributions
        const blendedAnimation = JSON.parse(JSON.stringify(baseAnimation));

        for (let i = 1; i < normalizedLayers.length; i++) {
            const layer = normalizedLayers[i];
            const layerAnimation = layer.animationData as any;
            const weight = layer.normalizedWeight;

            // Blend bone animations
            if (layerAnimation.skeleton) {
                for (const boneName in layerAnimation.skeleton) {
                    if (!blendedAnimation.skeleton[boneName]) {
                        blendedAnimation.skeleton[boneName] =
              layerAnimation.skeleton[boneName];
                    } else {
                        // Blend bone data
                        const baseData = blendedAnimation.skeleton[boneName];
                        const layerData = layerAnimation.skeleton[boneName];

                        if (baseData.positions && layerData.positions) {
                            baseData.positions = baseData.positions.map(
                                (v: number, idx: number) =>
                                    v + (layerData.positions[idx] || 0) * weight
                            );
                        }

                        if (baseData.rotations && layerData.rotations) {
                            baseData.rotations = baseData.rotations.map(
                                (v: number, idx: number) =>
                                    v + (layerData.rotations[idx] || 0) * weight
                            );
                        }
                    }
                }
            }

            // Blend morph animations
            if (layerAnimation.morphAnimation) {
                if (!blendedAnimation.morphAnimation) {
                    blendedAnimation.morphAnimation = {};
                }

                for (const morphName in layerAnimation.morphAnimation) {
                    if (!blendedAnimation.morphAnimation[morphName]) {
                        blendedAnimation.morphAnimation[morphName] = [];
                    }

                    const baseMorph = blendedAnimation.morphAnimation[morphName];
                    const layerMorph = layerAnimation.morphAnimation[morphName];

                    baseMorph.push(
                        ...layerMorph.map((frame: any) => ({
                            ...frame,
                            weight: (frame.weight || 1) * weight
                        }))
                    );
                }
            }
        }

        const handle = this._model.createRuntimeAnimation(blendedAnimation);
        this._model.setRuntimeAnimation(handle);
        console.log(
            `Applied additive blend of ${normalizedLayers.length} animation layers`
        );
    }

    /**
   * Apply override blending - uses highest weight layer
   */
    private _applyOverrideBlending(
        normalizedLayers: (AnimationLayer & { normalizedWeight: number })[]
    ): void {
    // For override blending, use the layer with highest weight
        const dominantLayer = normalizedLayers.reduce((prev, current) =>
            current.normalizedWeight > prev.normalizedWeight ? current : prev
        );

        const handle = this._model.createRuntimeAnimation(
            dominantLayer.animationData
        );
        this._model.setRuntimeAnimation(handle);
        console.log(
            `Applied override blend with dominant layer: "${
                dominantLayer.name
            }" (weight: ${dominantLayer.normalizedWeight.toFixed(2)})`
        );
    }
}
