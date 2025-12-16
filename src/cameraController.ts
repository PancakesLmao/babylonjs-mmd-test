import type { MmdCamera } from "babylon-mmd/esm/Runtime/mmdCamera";

export interface CameraState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export interface CameraAnimationHandle {
  handle: any;
  name: string;
  weight: number;
  isActive: boolean;
}

export class CameraController {
    private readonly _camera: MmdCamera;
    private readonly _defaultState: CameraState;
    private readonly _cameraAnimations: Map<string, CameraAnimationHandle> =
        new Map();
    private _activeCameraAnimation: string | null = null;
    private _blendMode: "override" | "additive" = "override";

    public constructor(camera: MmdCamera) {
        this._camera = camera;
        this._defaultState = this._captureState();
    }

    private _captureState(): CameraState {
        const pos = this._camera.position;
        // Get rotation from camera direction
        return {
            position: { x: pos.x, y: pos.y, z: pos.z },
            rotation: { x: 0, y: 0, z: 0 }
        };
    }

    public getPosition(): { x: number; y: number; z: number } {
        const pos = this._camera.position;
        return { x: pos.x, y: pos.y, z: pos.z };
    }

    public setPosition(x: number, y: number, z: number): void {
        this._camera.position.set(x, y, z);
        console.log(`Camera position set to: (${x}, ${y}, ${z})`);
    }

    public moveCamera(axis: "x" | "y" | "z", value: number): void {
        const pos = this._camera.position;
        switch (axis) {
        case "x":
            this._camera.position.x = value;
            break;
        case "y":
            this._camera.position.y = value;
            break;
        case "z":
            this._camera.position.z = value;
            break;
        }
        console.log(
            `Camera ${axis} adjusted to: ${value} (pos: ${pos.x}, ${pos.y}, ${pos.z})`
        );
    }

    public reset(): void {
        this.setPosition(
            this._defaultState.position.x,
            this._defaultState.position.y,
            this._defaultState.position.z
        );
        console.log("Camera reset to default position");
    }

    public getDefaultState(): CameraState {
        return this._defaultState;
    }

    /**
   * Add a camera animation with metadata
   */
    public addCameraAnimation(
        animationHandle: any,
        name: string,
        weight: number = 1.0
    ): void {
        if (!animationHandle) {
            console.warn("Invalid animation handle provided");
            return;
        }

        const clampedWeight = Math.max(0, Math.min(1, weight));
        this._cameraAnimations.set(name, {
            handle: animationHandle,
            name,
            weight: clampedWeight,
            isActive: true
        });

        if (!this._activeCameraAnimation) {
            this._activeCameraAnimation = name;
            this._applyCameraAnimation(name);
        }
    }

    /**
   * Remove a camera animation by name
   */
    public removeCameraAnimation(name: string): void {
        if (this._activeCameraAnimation === name) {
            // Find next available animation
            const remaining = Array.from(this._cameraAnimations.keys()).filter(
                (key) => key !== name
            );
            this._activeCameraAnimation = remaining.length > 0 ? remaining[0] : null;

            if (this._activeCameraAnimation) {
                this._applyCameraAnimation(this._activeCameraAnimation);
            }
        }

        this._cameraAnimations.delete(name);
    }

    /**
   * Switch to a specific camera animation
   */
    public switchToCamera(name: string): boolean {
        if (!this._cameraAnimations.has(name)) {
            console.warn(`Camera animation "${name}" not found`);
            return false;
        }

        this._activeCameraAnimation = name;
        this._applyCameraAnimation(name);
        return true;
    }

    /**
   * Set the weight of a camera animation layer
   */
    public setCameraWeight(name: string, weight: number): void {
        const animation = this._cameraAnimations.get(name);
        if (animation) {
            animation.weight = Math.max(0, Math.min(1, weight));
        }
    }

    /**
   * Set active state of a camera animation
   */
    public setCameraActive(name: string, isActive: boolean): void {
        const animation = this._cameraAnimations.get(name);
        if (animation) {
            animation.isActive = isActive;
        }
    }

    /**
   * Get all camera animations
   */
    public getCameraAnimations(): readonly Readonly<CameraAnimationHandle>[] {
        return Array.from(this._cameraAnimations.values());
    }

    /**
   * Get the currently active camera animation
   */
    public getActiveCameraAnimation(): string | null {
        return this._activeCameraAnimation;
    }

    /**
   * Set camera blending mode
   */
    public setBlendMode(mode: "override" | "additive"): void {
        this._blendMode = mode;
        if (this._activeCameraAnimation) {
            this._applyCameraAnimation(this._activeCameraAnimation);
        }
    }

    /**
   * Validate camera animation data structure
   */
    public validateCameraAnimation(animationHandle: any): {
    isValid: boolean;
    errors: string[];
  } {
        const errors: string[] = [];

        if (!animationHandle) {
            errors.push("Animation handle is null or undefined");
            return { isValid: false, errors };
        }

        if (!animationHandle.animations) {
            errors.push("Animation handle missing 'animations' property");
        }

        if (Array.isArray(animationHandle.animations)) {
            if (animationHandle.animations.length === 0) {
                errors.push("Animations array is empty");
            } else {
                const animation = animationHandle.animations[0];
                if (!animation.cameraAnimation) {
                    errors.push("First animation does not contain camera animation data");
                }
            }
        } else {
            errors.push("Animations property is not an array");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
   * Get camera animation info
   */
    public getCameraAnimationInfo(name: string): {
    name: string;
    duration: number;
    frameCount: number;
  } | null {
        const animation = this._cameraAnimations.get(name);
        if (!animation) {
            return null;
        }

        let duration = 0;
        let frameCount = 0;

        if (animation.handle?.animations?.[0]?.cameraAnimation) {
            const camAnim = animation.handle.animations[0].cameraAnimation;
            if (camAnim.cameraKeyFrameAnimations) {
                const keyFrames = camAnim.cameraKeyFrameAnimations;
                if (keyFrames.length > 0) {
                    const lastFrame = keyFrames[keyFrames.length - 1].frameTime;
                    frameCount = lastFrame + 1;
                    duration = frameCount / 30; // Assume 30 FPS
                }
            }
        }

        return { name, duration, frameCount };
    }

    /**
   * Apply camera animation based on blend mode
   */
    private _applyCameraAnimation(name: string): void {
        const animation = this._cameraAnimations.get(name);
        if (!animation) {
            return;
        }

        if (this._blendMode === "override") {
            // Use the selected animation directly
            const handle = this._camera.createRuntimeAnimation(animation.handle);
            this._camera.setRuntimeAnimation(handle);
        }
    }
}
