import type { Scene } from "@babylonjs/core/scene";
import { VmdLoader } from "babylon-mmd/esm/Loader/vmdLoader";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";
import type { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";

export class VmdAnimationController {
    private readonly _modelMesh: MmdMesh;
    private readonly _scene: Scene;
    private readonly _mmdRuntime: MmdRuntime;
    private _mmdAnimation: any = null;
    private _isPlaying: boolean = false;
    private _playbackSpeed: number = 1.0;

    public constructor(modelMesh: MmdMesh, scene: Scene, mmdRuntime: MmdRuntime) {
        this._modelMesh = modelMesh;
        this._scene = scene;
        this._mmdRuntime = mmdRuntime;
    }

    public async loadVmdFile(file: File): Promise<void> {
        try {
            const loader = new VmdLoader(this._scene);
            loader.loggingEnabled = true;

            // Load animation using babylon-mmd's native loader
            const mmdAnimation = await loader.loadAsync(
                file.name.replace(/\.[^.]+$/, ""), // Remove file extension for name
                file
            );

            // Get or create MMD model
            let mmdModel = (this._mmdRuntime as any).models?.[0];
            if (!mmdModel) {
                mmdModel = this._mmdRuntime.createMmdModel(this._modelMesh);
            }

            // Create runtime animation for the model
            const animationHandle = mmdModel.createRuntimeAnimation(mmdAnimation);
            mmdModel.setRuntimeAnimation(animationHandle);

            this._mmdAnimation = mmdAnimation;

            console.log("VMD animation loaded successfully");
        } catch (error) {
            console.error("Failed to load VMD file:", error);
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
        (this._mmdRuntime as any).pauseAnimation(false);
        // Reset to frame 0 using timeline
        (this._mmdRuntime as any).animationTimelineCurrentFrameIndex = 0;
        console.log("VMD animation playback stopped");
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
