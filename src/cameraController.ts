import type { MmdCamera } from "babylon-mmd/esm/Runtime/mmdCamera";

export interface CameraState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export class CameraController {
    private readonly _camera: MmdCamera;
    private readonly _defaultState: CameraState;

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
}
