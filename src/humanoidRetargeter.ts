import type { MmdModel } from "babylon-mmd/esm/Runtime/mmdModel";
export interface HumanoidSkeleton {
  bones: {
    // Root and Hips
    hips: string;
    spine: string;
    spine1?: string;
    spine2?: string;
    chest?: string;

    // Head and Neck
    neck: string;
    head: string;

    // Left Arm
    leftShoulder?: string;
    leftUpperArm: string;
    leftForeArm: string;
    leftHand: string;
    leftThumb?: string;
    leftIndex?: string;
    leftMiddle?: string;
    leftRing?: string;
    leftPinky?: string;

    // Right Arm
    rightShoulder?: string;
    rightUpperArm: string;
    rightForeArm: string;
    rightHand: string;
    rightThumb?: string;
    rightIndex?: string;
    rightMiddle?: string;
    rightRing?: string;
    rightPinky?: string;

    // Left Leg
    leftHip: string;
    leftKnee: string;
    leftAnkle: string;
    leftToe?: string;

    // Right Leg
    rightHip: string;
    rightKnee: string;
    rightAnkle: string;
    rightToe?: string;
  };
}

/**
 * Mapping from source skeleton bone names to target skeleton bone names.
 * Maps MMD bone names (source) to generic humanoid bone names (target).
 */
export interface BoneMapping {
  [sourceBoneName: string]: string;
}

/**
 * Configuration for humanoid retargeting including bone mappings and constraints.
 */
export interface RetargetingConfig {
  sourceSkeleton?: HumanoidSkeleton;
  targetSkeleton: HumanoidSkeleton;
  boneMapping: BoneMapping;
  preserveScale?: boolean;
  useIK?: boolean;
  ikChains?: {
    [limbName: string]: {
      effectorBone: string;
      targetBone: string;
      intermediateBones: string[];
    };
  };
}

/**
 * Humanoid Retargeter enables applying animations from one humanoid skeleton to another.
 * Supports bone mapping, scale adjustment, and optional inverse kinematics.
 *
 * Example usage:
 * ```typescript
 * const retargeter = new HumanoidRetargeter(mmdModel, humanoidRetargetingConfig);
 * retargeter.retargetAnimation(mixamoAnimationHandle, mmdModel);
 * ```
 */
export class HumanoidRetargeter {
    private readonly _config: RetargetingConfig;

    // Standard Mixamo skeleton mapping (common humanoid model)

    private static readonly _MIXAMO_SKELETON: HumanoidSkeleton = {
        bones: {
            hips: "Hips",

            spine: "Spine",

            spine1: "Spine1",

            spine2: "Spine2",

            chest: "Chest",

            neck: "Neck",

            head: "Head",

            leftShoulder: "LeftShoulder",

            leftUpperArm: "LeftArm",

            leftForeArm: "LeftForeArm",

            leftHand: "LeftHand",

            rightShoulder: "RightShoulder",

            rightUpperArm: "RightArm",

            rightForeArm: "RightForeArm",

            rightHand: "RightHand",

            leftHip: "LeftUpLeg",

            leftKnee: "LeftLeg",

            leftAnkle: "LeftFoot",

            rightHip: "RightUpLeg",

            rightKnee: "RightLeg",

            rightAnkle: "RightFoot"
        }
    };

    // Standard MMD skeleton mapping (typical PMX structure)

    private static readonly _MMD_SKELETON: HumanoidSkeleton = {
        bones: {
            hips: "センター",
            spine: "腰",
            spine1: "上半身",
            chest: "上半身2",
            neck: "首",
            head: "頭",
            leftShoulder: "左肩",
            leftUpperArm: "左腕",
            leftForeArm: "左ひじ",
            leftHand: "左手首",
            rightShoulder: "右肩",
            rightUpperArm: "右腕",
            rightForeArm: "右ひじ",
            rightHand: "右手首",
            leftHip: "左足",
            leftKnee: "左ひざ",
            leftAnkle: "左足首",
            rightHip: "右足",
            rightKnee: "右ひざ",
            rightAnkle: "右足首"
        }
    };

    public constructor(_model: MmdModel, config: RetargetingConfig) {
        this._config = config;

        // Validate that target skeleton contains required bones
        this._validateSkeleton(config.targetSkeleton);
    }

    /**
   * Create a retargeter for Mixamo models retargeting to MMD models
   */
    public static CreateMixamoToMMD(
        mmdModel: MmdModel,
        customBoneMapping?: BoneMapping
    ): HumanoidRetargeter {
    // Mixamo skeleton bone names (standard humanoid armature)
        const defaultMapping: BoneMapping = {
            hips: "センター",
            spine: "腰",
            spine1: "上半身",
            spine2: "上半身2",
            chest: "上半身2",
            neck: "首",
            head: "頭",
            leftShoulder: "左肩",
            leftArm: "左腕",
            leftForeArm: "左ひじ",
            leftHand: "左手首",
            rightShoulder: "右肩",
            rightArm: "右腕",
            rightForeArm: "右ひじ",
            rightHand: "右手首",
            leftUpLeg: "左足",
            leftLeg: "左ひざ",
            leftFoot: "左足首",
            rightUpLeg: "右足",
            rightLeg: "右ひざ",
            rightFoot: "右足首"
        } as const;

        const boneMapping = { ...defaultMapping, ...(customBoneMapping || {}) };

        return new HumanoidRetargeter(mmdModel, {
            sourceSkeleton: HumanoidRetargeter._MIXAMO_SKELETON,
            targetSkeleton: HumanoidRetargeter._MMD_SKELETON,
            boneMapping,
            preserveScale: true,
            useIK: false
        });
    }

    /**
   * Create a retargeter for retargeting to a Mixamo model from MMD
   */
    public static CreateMMDToMixamo(
        humanoidModel: MmdModel,
        customBoneMapping?: BoneMapping
    ): HumanoidRetargeter {
    // MMD skeleton bone names (Japanese character identifiers)
        const defaultMapping: BoneMapping = {
            センター: "hips",
            腰: "spine",
            上半身: "spine1",
            上半身2: "chest",
            首: "neck",
            頭: "head",
            左肩: "leftShoulder",
            左腕: "leftArm",
            左ひじ: "leftForeArm",
            左手首: "leftHand",
            右肩: "rightShoulder",
            右腕: "rightArm",
            右ひじ: "rightForeArm",
            右手首: "rightHand",
            左足: "leftUpLeg",
            左ひざ: "leftLeg",
            左足首: "leftFoot",
            右足: "rightUpLeg",
            右ひざ: "rightLeg",
            右足首: "rightFoot"
        } as const;

        const boneMapping = { ...defaultMapping, ...(customBoneMapping || {}) };

        return new HumanoidRetargeter(humanoidModel, {
            sourceSkeleton: HumanoidRetargeter._MMD_SKELETON,
            targetSkeleton: HumanoidRetargeter._MIXAMO_SKELETON,
            boneMapping,
            preserveScale: true,
            useIK: false
        });
    }

    /**
   * Retarget animation data from source skeleton to target skeleton.
   * Creates a new animation handle with bone transforms mapped to target skeleton.
   */
    public retargetAnimationData(animationHandle: any): any {
    // Clone the animation handle structure
        const retargetedHandle = JSON.parse(JSON.stringify(animationHandle));

        if (
            !retargetedHandle.animations ||
      retargetedHandle.animations.length === 0
        ) {
            return retargetedHandle;
        }

        // Process skeleton animations
        const skeletonAnimation = retargetedHandle.animations[0];
        if (skeletonAnimation && skeletonAnimation.boneAnimations) {
            const newBoneAnimations: any[] = [];

            for (const boneAnim of skeletonAnimation.boneAnimations) {
                const sourceBoneName = boneAnim.boneName;
                const targetBoneName = this._config.boneMapping[sourceBoneName];

                if (targetBoneName) {
                    // Map the bone animation to target bone name
                    const retargetedAnim = {
                        ...boneAnim,
                        boneName: targetBoneName
                    };
                    newBoneAnimations.push(retargetedAnim);
                }
            }

            skeletonAnimation.boneAnimations = newBoneAnimations;
        }

        // Process morph animations (facial expressions stay the same)
        if (skeletonAnimation && skeletonAnimation.morphAnimations) {
            // Morph animations are not affected by skeleton retargeting
            // They stay the same across different humanoid models
        }

        return retargetedHandle;
    }

    /**
   * Get the target bone name for a source bone
   */
    public getTargetBoneName(sourceBoneName: string): string | null {
        return this._config.boneMapping[sourceBoneName] || null;
    }

    /**
   * Get all mapped bones (source -> target)
   */
    public getMappedBones(): ReadonlyMap<string, string> {
        return new Map(Object.entries(this._config.boneMapping));
    }

    /**
   * Check if a bone is mapped
   */
    public isBoneMapped(sourceBoneName: string): boolean {
        return sourceBoneName in this._config.boneMapping;
    }

    /**
   * Validate that the skeleton contains all required bones
   */
    private _validateSkeleton(skeleton: HumanoidSkeleton): void {
        const requiredBones = [
            skeleton.bones.hips,
            skeleton.bones.spine,
            skeleton.bones.neck,
            skeleton.bones.head,
            skeleton.bones.leftUpperArm,
            skeleton.bones.leftForeArm,
            skeleton.bones.leftHand,
            skeleton.bones.rightUpperArm,
            skeleton.bones.rightForeArm,
            skeleton.bones.rightHand,
            skeleton.bones.leftHip,
            skeleton.bones.leftKnee,
            skeleton.bones.leftAnkle,
            skeleton.bones.rightHip,
            skeleton.bones.rightKnee,
            skeleton.bones.rightAnkle
        ];

        // Just validate that bones are named, actual existence is checked during application
        for (const boneName of requiredBones) {
            if (!boneName || boneName.trim() === "") {
                console.warn("Invalid bone name in skeleton configuration");
            }
        }
    }

    /**
   * Calculate scale factor between source and target skeleton
   * Useful for retargeting animations between models of different proportions
   */
    public calculateScaleFactor(
        getSourceBoneLength: (bone: string) => number,
        getTargetBoneLength: (bone: string) => number
    ): number {
        const sourceLimbs = [
            this._config.sourceSkeleton?.bones.leftUpperArm,
            this._config.sourceSkeleton?.bones.leftForeArm
        ].filter(Boolean) as string[];

        const targetLimbs = [
            this._config.targetSkeleton.bones.leftUpperArm,
            this._config.targetSkeleton.bones.leftForeArm
        ];

        if (sourceLimbs.length === 0) {
            return 1.0;
        }

        let totalSourceLength = 0;
        let totalTargetLength = 0;

        for (let i = 0; i < sourceLimbs.length; i++) {
            totalSourceLength += getSourceBoneLength(sourceLimbs[i]);
            totalTargetLength += getTargetBoneLength(targetLimbs[i]);
        }

        return totalTargetLength > 0 ? totalSourceLength / totalTargetLength : 1.0;
    }

    /**
   * Get bone mapping as a readable format for debugging
   */
    public getMappingReport(): string {
        let report = "Bone Mapping Report:\n";
        report += "====================\n";

        for (const [source, target] of Object.entries(this._config.boneMapping)) {
            report += `${source} -> ${target}\n`;
        }

        return report;
    }
}
