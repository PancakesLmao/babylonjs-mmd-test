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

    // Keyboard interaction state
    private readonly _keysPressed: Map<string, boolean> = new Map();
    private _cameraRotationX = 0;
    private _cameraRotationY = 0;
    private _cameraDistance = 10;
    private readonly _cameraTarget: { x: number; y: number; z: number } = {
        x: 0,
        y: 10,
        z: 0
    };
    private _animationFrameId: number | null = null;
    private readonly _moveSpeed = 0.2;
    private _isLeftMouseDown = false;

    public constructor(camera: MmdCamera) {
        this._camera = camera;
        this._defaultState = this._captureState();

        // Capture babylon-mmd's initial camera state to avoid jumping
        const mmdCamera = camera as any;
        if (mmdCamera.rotation) {
            this._cameraRotationX = mmdCamera.rotation.x ?? 0;
            this._cameraRotationY = mmdCamera.rotation.y ?? 0;
        }
        if (mmdCamera.distance !== undefined) {
            this._cameraDistance = mmdCamera.distance;
        }
        console.log(
            `Captured initial babylon-mmd camera state: rotX=${this._cameraRotationX.toFixed(
                2
            )}, rotY=${this._cameraRotationY.toFixed(
                2
            )}, distance=${this._cameraDistance.toFixed(2)}`
        );

        this._initializeMouseControls();
    }

    private _initializeMouseControls(): void {
        const canvas = this._camera.getScene().getEngine().getRenderingCanvas();
        if (!canvas) {
            console.warn("Canvas not found for camera controls");
            return;
        }

        // Disable babylon's default camera controls
        (this._camera as any).inputs?.removeByType("FreeCameraMouseInput");

        console.log(
            "Camera controls initialized - Hold Left Mouse to rotate, WASD to move, Mouse wheel to zoom"
        );
        console.log("Canvas element:", canvas);
        console.log("Canvas size:", canvas.width, "x", canvas.height);

        // Mouse wheel zoom
        canvas.addEventListener(
            "wheel",
            (e) => {
                this._onMouseWheel(e);
            },
            false
        );

        // Pointer events (better compatibility with Babylon.js)
        canvas.addEventListener(
            "pointerdown",
            (e) => {
                console.log(
                    `[POINTERDOWN] Button ${(e as PointerEvent).button}, PointerId: ${
                        (e as PointerEvent).pointerId
                    }`
                );
                this._onMouseDown(e as PointerEvent);
            },
            false
        );

        canvas.addEventListener(
            "pointerup",
            (e) => {
                console.log(
                    `[POINTERUP] Button ${(e as PointerEvent).button}, PointerId: ${
                        (e as PointerEvent).pointerId
                    }`
                );
                this._onMouseUp(e as PointerEvent);
            },
            false
        );

        canvas.addEventListener(
            "pointerleave",
            () => {
                console.log("[POINTERLEAVE] Resetting mouse state");
                this._isLeftMouseDown = false;
            },
            false
        );

        // Pointer movement for rotation
        canvas.addEventListener(
            "pointermove",
            (e) => {
                this._onMouseMove(e as PointerEvent);
            },
            false
        );

        // Keyboard controls
        document.addEventListener(
            "keydown",
            (e) => {
                this._onKeyDown(e);
            },
            false
        );

        document.addEventListener(
            "keyup",
            (e) => {
                this._onKeyUp(e);
            },
            false
        );

        // Prevent context menu on right-click
        canvas.addEventListener(
            "contextmenu",
            (e) => {
                e.preventDefault();
            },
            false
        );

        // Start animation loop for continuous movement
        this._startAnimationLoop();
    }

    private _onMouseMove(event: PointerEvent): void {
        if (!this._isLeftMouseDown) return;

        const deltaX = event.movementX || 0;
        const deltaY = event.movementY || 0;

        const rotationSpeed = 0.0008;
        this._cameraRotationY -= deltaX * rotationSpeed;
        this._cameraRotationX -= deltaY * rotationSpeed;

        // Clamp X rotation to prevent flipping
        this._cameraRotationX = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, this._cameraRotationX)
        );

        console.log(
            `Rotating camera - deltaX: ${deltaX}, deltaY: ${deltaY}, rotX: ${this._cameraRotationX.toFixed(
                3
            )}, rotY: ${this._cameraRotationY.toFixed(3)}`
        );

        this._updateCameraPosition();
    }

    private _onMouseDown(event: PointerEvent): void {
        console.log(`Mouse down detected - button: ${event.button}`);
        if (event.button === 2) {
            // Right mouse button
            this._isLeftMouseDown = true;
            console.log("Right mouse button pressed - rotation enabled");
        }
        // Prevent any default behavior for right-click (button 2) or middle-click (button 1)
        if (event.button === 1 || event.button === 2) {
            event.preventDefault();
        }
    }

    private _onMouseUp(event: PointerEvent): void {
        console.log(`Mouse up detected - button: ${event.button}`);
        if (event.button === 2) {
            // Right mouse button
            this._isLeftMouseDown = false;
            console.log("Right mouse button released - rotation disabled");
        }
        // Prevent any default behavior for right-click (button 2) or middle-click (button 1)
        if (event.button === 1 || event.button === 2) {
            event.preventDefault();
        }
    }

    private _startAnimationLoop(): void {
        const updateCamera = (): void => {
            this._updateCameraFromKeyboard();
            this._animationFrameId = requestAnimationFrame(updateCamera);
        };
        this._animationFrameId = requestAnimationFrame(updateCamera);
    }

    public destroy(): void {
        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
    }

    private _onMouseWheel(event: WheelEvent): void {
        event.preventDefault();

        // Scroll up = zoom in (decrease distance), scroll down = zoom out (increase distance)
        const zoomSpeed = 1.5;
        this._cameraDistance += event.deltaY > 0 ? zoomSpeed : -zoomSpeed;
        // Clamp distance between min and max
        this._cameraDistance = Math.max(0.5, Math.min(150, this._cameraDistance));

        // Only update distance on the camera, don't update position/rotation
        (this._camera as any).distance = this._cameraDistance;

        console.log(`Camera zoom distance: ${this._cameraDistance.toFixed(2)}`);
    }

    private _onKeyDown(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        if ([" "].includes(key)) {
            this._keysPressed.set("space", true);
            event.preventDefault();
        } else if (["w", "a", "s", "d"].includes(key)) {
            this._keysPressed.set(key, true);
            event.preventDefault();
        } else if (event.shiftKey) {
            this._keysPressed.set("shift", true);
        }
    }

    private _onKeyUp(event: KeyboardEvent): void {
        const key = event.key.toLowerCase();
        if ([" "].includes(key)) {
            this._keysPressed.set("space", false);
            event.preventDefault();
        } else if (["w", "a", "s", "d"].includes(key)) {
            this._keysPressed.set(key, false);
            event.preventDefault();
        } else if (!event.shiftKey) {
            this._keysPressed.set("shift", false);
        }
    }

    private _updateCameraFromKeyboard(): void {
        let moved = false;
        let moveX = 0;
        let moveZ = 0;

        // W - Move forward
        if (this._keysPressed.get("w")) {
            moveZ += this._moveSpeed;
            moved = true;
        }
        // S - Move backward
        if (this._keysPressed.get("s")) {
            moveZ -= this._moveSpeed;
            moved = true;
        }
        // A - Move left
        if (this._keysPressed.get("a")) {
            moveX -= this._moveSpeed;
            moved = true;
        }
        // D - Move right
        if (this._keysPressed.get("d")) {
            moveX += this._moveSpeed;
            moved = true;
        }

        // Apply camera rotation to movement (so WASD is always relative to world, not camera orientation)
        if (moveX !== 0 || moveZ !== 0) {
            const yaw = this._cameraRotationY;
            const cos = Math.cos(yaw);
            const sin = Math.sin(yaw);

            this._cameraTarget.x += moveX * cos - moveZ * sin;
            this._cameraTarget.z += moveX * sin + moveZ * cos;
        }

        // Space - Move up
        if (this._keysPressed.get("space")) {
            this._cameraTarget.y += this._moveSpeed;
            moved = true;
        }
        // Control - Move down
        if (this._keysPressed.get("shift")) {
            this._cameraTarget.y -= this._moveSpeed;
            moved = true;
        }

        if (moved) {
            this._updateCameraPosition();
        }
    }

    private _updateCameraPosition(): void {
    // MmdCamera uses: position (orbit center), rotation (yaw/pitch/roll), distance
    // Set the orbit center position
        (this._camera as any).position.set(
            this._cameraTarget.x,
            this._cameraTarget.y,
            this._cameraTarget.z
        );

        // Set the rotation (yaw, pitch, roll)
        (this._camera as any).rotation.set(
            this._cameraRotationX, // Pitch (up/down)
            this._cameraRotationY, // Yaw (left/right)
            0 // Roll (not needed)
        );

        // Set the distance from orbit center
        (this._camera as any).distance = this._cameraDistance;

        console.log(
            `Camera updated - Target: (${this._cameraTarget.x.toFixed(
                2
            )}, ${this._cameraTarget.y.toFixed(2)}, ${this._cameraTarget.z.toFixed(
                2
            )}), Rotation: Pitch=${this._cameraRotationX.toFixed(
                2
            )}, Yaw=${this._cameraRotationY.toFixed(
                2
            )}, Distance: ${this._cameraDistance.toFixed(2)}`
        );
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

    public getInputStates(): {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    space: boolean;
    shift: boolean;
    isRotating: boolean;
    } {
        return {
            w: this._keysPressed.get("w") ?? false,
            a: this._keysPressed.get("a") ?? false,
            s: this._keysPressed.get("s") ?? false,
            d: this._keysPressed.get("d") ?? false,
            space: this._keysPressed.get("space") ?? false,
            shift: this._keysPressed.get("shift") ?? false,
            isRotating: this._isLeftMouseDown
        };
    }

    public getCameraTarget(): { x: number; y: number; z: number } {
        return { ...this._cameraTarget };
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
