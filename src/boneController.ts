import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { MmdMesh } from "babylon-mmd/esm/Runtime/mmdMesh";

export interface BoneTransform {
  position: Vector3;
  rotation: Quaternion;
}

export class BoneController {
    private readonly _modelMesh: MmdMesh;
    private readonly _originalTransforms: Map<string, BoneTransform> = new Map();
    private _selectedBoneName: string | null = null;
    private _bonesInitialized = false;
    private _skeletonReadyCallbacks: (() => void)[] = [];

    public constructor(modelMesh: MmdMesh) {
        this._modelMesh = modelMesh;
        // Check for skeleton periodically since babylon-mmd loads it asynchronously
        this._waitForSkeleton();
    }

    private _waitForSkeleton(): void {
        const checkSkeleton = setInterval(() => {
            // babylon-mmd stores the skeleton in metadata.skeleton
            const skeleton =
        this._modelMesh.skeleton ||
        (this._modelMesh.metadata as unknown as { skeleton?: unknown })
            ?.skeleton;
            if (skeleton && !this._bonesInitialized) {
                clearInterval(checkSkeleton);
                this._storeBoneTransforms();
                this._bonesInitialized = true;
                // Notify any waiting callbacks
                for (const callback of this._skeletonReadyCallbacks) {
                    callback();
                }
                this._skeletonReadyCallbacks = [];
            }
        }, 50); // Check every 50ms

        // Stop checking after 5 seconds
        setTimeout(() => clearInterval(checkSkeleton), 5000);
    }

    public onSkeletonReady(callback: () => void): void {
        if (this._bonesInitialized) {
            callback();
        } else {
            this._skeletonReadyCallbacks.push(callback);
        }
    }

    private _ensureBonesInitialized(): void {
        if (this._bonesInitialized) return;
        this._storeBoneTransforms();
        this._bonesInitialized = true;
    }

    private _storeBoneTransforms(): void {
    // babylon-mmd stores the skeleton in metadata.skeleton
        const skeleton =
      this._modelMesh.skeleton ||
      (this._modelMesh.metadata as unknown as { skeleton?: unknown })?.skeleton;
        if (!skeleton) {
            console.warn("No skeleton found on model mesh");
            return;
        }

        const bones = (skeleton as unknown as { bones?: unknown[] }).bones;
        if (!bones || bones.length === 0) {
            console.warn("Skeleton has no bones");
            return;
        }

        for (const bone of bones) {
            const boneObj = bone as unknown as {
        name: string;
        getAbsolutePosition(): { clone(): Vector3 };
        getRotationQuaternion(): Quaternion | null;
      };
            this._originalTransforms.set(boneObj.name, {
                position: boneObj.getAbsolutePosition().clone(),
                rotation:
          boneObj.getRotationQuaternion()?.clone() || Quaternion.Identity()
            });
        }
        console.log(`Stored ${this._originalTransforms.size} bones`);
    }

    public getBones(): { name: string; englishName?: string }[] {
    // Use the metadata bones for the list of available bones
        const metadata = this._modelMesh.metadata as unknown as {
      bones?: readonly { name: string; englishName?: string }[];
    } | null;
        if (metadata && Array.isArray(metadata.bones)) {
            // Don't try to initialize bones here - let the skeleton ready callback do it
            return metadata.bones.map((b) => ({
                name: b.name,
                englishName: b.englishName
            }));
        }
        return [];
    }

    public selectBone(boneName: string): boolean {
        this._ensureBonesInitialized();
        const skeleton =
      this._modelMesh.skeleton ||
      (this._modelMesh.metadata as unknown as { skeleton?: unknown })?.skeleton;
        if (!skeleton) return false;

        // Try to find the bone by name in the skeleton
        const bones = (skeleton as unknown as { bones?: unknown[] }).bones || [];
        const bone = bones.find((b) => {
            const boneObj = b as unknown as { name: string };
            return boneObj.name === boneName;
        });
        if (bone) {
            this._selectedBoneName = boneName;
            return true;
        }
        return false;
    }

    public getSelectedBoneName(): string | null {
        return this._selectedBoneName;
    }

    public rotateBone(
        rotationX: number,
        rotationY: number,
        rotationZ: number
    ): void {
        if (!this._selectedBoneName) return;

        const skeleton =
      this._modelMesh.skeleton ||
      (this._modelMesh.metadata as unknown as { skeleton?: unknown })?.skeleton;
        if (!skeleton) return;

        const bones = (skeleton as unknown as { bones?: unknown[] }).bones || [];
        const bone = bones.find((b) => {
            const boneObj = b as unknown as { name: string };
            return boneObj.name === this._selectedBoneName;
        });
        if (!bone) return;

        const boneObj = bone as unknown as {
      setRotationQuaternion(q: Quaternion): void;
    };
        const qx = Quaternion.RotationAxis(Vector3.Right(), rotationX);
        const qy = Quaternion.RotationAxis(Vector3.Up(), rotationY);
        const qz = Quaternion.RotationAxis(Vector3.Forward(), rotationZ);

        const combined = qx.multiply(qy).multiply(qz);
        boneObj.setRotationQuaternion(combined);
    }

    public moveBone(x: number, y: number, z: number): void {
        if (!this._selectedBoneName) return;

        const skeleton =
      this._modelMesh.skeleton ||
      (this._modelMesh.metadata as unknown as { skeleton?: unknown })?.skeleton;
        if (!skeleton) return;

        const bones = (skeleton as unknown as { bones?: unknown[] }).bones || [];
        const bone = bones.find((b) => {
            const boneObj = b as unknown as { name: string };
            return boneObj.name === this._selectedBoneName;
        });
        if (!bone) return;

        const boneObj = bone as unknown as { position: Vector3 };
        boneObj.position = new Vector3(x, y, z);
    }

    public resetBone(boneName?: string): void {
        const targetBoneName = boneName || this._selectedBoneName;
        if (!targetBoneName) return;

        const skeleton =
      this._modelMesh.skeleton ||
      (this._modelMesh.metadata as unknown as { skeleton?: unknown })?.skeleton;
        if (!skeleton) return;

        const bones = (skeleton as unknown as { bones?: unknown[] }).bones || [];
        const bone = bones.find((b) => {
            const boneObj = b as unknown as { name: string };
            return boneObj.name === targetBoneName;
        });
        if (bone && this._originalTransforms.has(targetBoneName)) {
            const boneObj = bone as unknown as {
        position: Vector3;
        setRotationQuaternion(q: Quaternion): void;
      };
            const original = this._originalTransforms.get(targetBoneName)!;
            boneObj.position = original.position.clone();
            boneObj.setRotationQuaternion(original.rotation.clone());
        }
    }

    public resetAllBones(): void {
        const skeleton =
      this._modelMesh.skeleton ||
      (this._modelMesh.metadata as unknown as { skeleton?: unknown })?.skeleton;
        if (!skeleton) return;

        const bones = (skeleton as unknown as { bones?: unknown[] }).bones || [];
        for (const bone of bones) {
            const boneObj = bone as unknown as { name: string };
            if (this._originalTransforms.has(boneObj.name)) {
                const original = this._originalTransforms.get(boneObj.name)!;
                const boneMod = bone as unknown as {
          position: Vector3;
          setRotationQuaternion(q: Quaternion): void;
        };
                boneMod.position = original.position.clone();
                boneMod.setRotationQuaternion(original.rotation.clone());
            }
        }
    }
}
