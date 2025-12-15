import type { Scene } from "@babylonjs/core/scene";
import { VmdLoader } from "babylon-mmd/esm/Loader/vmdLoader";
import { StreamAudioPlayer } from "babylon-mmd/esm/Runtime/Audio/streamAudioPlayer";
import type { MmdCamera } from "babylon-mmd/esm/Runtime/mmdCamera";
import type { MmdRuntime } from "babylon-mmd/esm/Runtime/mmdRuntime";

export class VmdAnimationController {
    private readonly _scene: Scene;
    private readonly _mmdRuntime: MmdRuntime;
    private _mmdCamera: MmdCamera | null = null;
    private _mmdAnimation: any = null;
    private _isPlaying: boolean = false;
    private _playbackSpeed: number = 1.0;

    public constructor(scene: Scene, mmdRuntime: MmdRuntime) {
        this._scene = scene;
        this._mmdRuntime = mmdRuntime;
    }

    public setMmdCamera(mmdCamera: MmdCamera): void {
        this._mmdCamera = mmdCamera;
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

            // Get the MMD model from runtime (first model)
            const mmdModel = (this._mmdRuntime as any).models?.[0];
            if (mmdModel) {
                // Create runtime animation for the model
                const modelAnimationHandle =
          mmdModel.createRuntimeAnimation(mmdAnimation);
                mmdModel.setRuntimeAnimation(modelAnimationHandle);
                console.log("Model animation applied");
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
            console.error("Failed to load VMD file:", error);
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
