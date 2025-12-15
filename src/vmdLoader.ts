import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface VmdBoneKeyFrame {
  boneName: string;
  frameNumber: number;
  position: Vector3;
  rotation: Quaternion;
  interpolation: number[];
}

export interface VmdMotionData {
  bones: VmdBoneKeyFrame[];
  morphs: unknown[];
  fps: number;
  totalFrames: number;
}

export class VmdLoader {
    public static async LoadVmdFile(filePath: string): Promise<VmdMotionData> {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load VMD file: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            return this.ParseVmd(new Uint8Array(buffer));
        } catch (error) {
            console.error("Error loading VMD file:", error);
            throw error;
        }
    }

    public static async LoadFromFile(file: File): Promise<VmdMotionData> {
        try {
            const buffer = await file.arrayBuffer();
            return this.ParseVmd(new Uint8Array(buffer));
        } catch (error) {
            console.error("Error loading VMD file from input:", error);
            throw error;
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _readString(
        data: Uint8Array,
        offset: number,
        length: number
    ): { value: string; nextOffset: number } {
        const buffer = data.slice(offset, offset + length);
        // Try Shift-JIS first, then UTF-8
        try {
            const decoder = new TextDecoder("shift-jis");
            const value = decoder.decode(buffer).split("\0")[0]; // Remove null terminator
            return { value, nextOffset: offset + length };
        } catch {
            const decoder = new TextDecoder("utf-8");
            const value = decoder.decode(buffer).split("\0")[0];
            return { value, nextOffset: offset + length };
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _readFloat(
        data: Uint8Array,
        offset: number
    ): { value: number; nextOffset: number } {
        const view = new DataView(data.buffer);
        return {
            value: view.getFloat32(offset, true),
            nextOffset: offset + 4
        };
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _readUInt32(
        data: Uint8Array,
        offset: number
    ): { value: number; nextOffset: number } {
        const view = new DataView(data.buffer);
        return {
            value: view.getUint32(offset, true),
            nextOffset: offset + 4
        };
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _readByte(
        data: Uint8Array,
        offset: number
    ): { value: number; nextOffset: number } {
        return {
            value: data[offset],
            nextOffset: offset + 1
        };
    }

    public static ParseVmd(data: Uint8Array): VmdMotionData {
        const bones: VmdBoneKeyFrame[] = [];
        let offset = 0;

        // Header
        const header = this._readString(data, offset, 30);
        offset = header.nextOffset;
        console.log("VMD Header:", header.value);

        if (!header.value.includes("Vocaloid Motion Data")) {
            throw new Error("Invalid VMD file format");
        }

        // Model name
        const modelName = this._readString(data, offset, 20);
        offset = modelName.nextOffset;
        console.log("VMD Model Name:", modelName.value);

        // Number of bone keyframes
        const boneFrameCount = this._readUInt32(data, offset).value;
        offset += 4;
        console.log("VMD bone frames:", boneFrameCount);

        // Parse bone keyframes
        let maxFrame = 0;
        for (let i = 0; i < boneFrameCount; i += 1) {
            // Bone name (15 bytes)
            const boneName = this._readString(data, offset, 15);
            offset = boneName.nextOffset;

            // Frame number (4 bytes)
            const frameNumber = this._readUInt32(data, offset).value;
            offset += 4;
            maxFrame = Math.max(maxFrame, frameNumber);

            // Position (3 floats = 12 bytes)
            const posX = this._readFloat(data, offset);
            offset = posX.nextOffset;
            const posY = this._readFloat(data, offset);
            offset = posY.nextOffset;
            const posZ = this._readFloat(data, offset);
            offset = posZ.nextOffset;
            const position = new Vector3(posX.value, posY.value, posZ.value);

            // Rotation (4 floats = 16 bytes) - stored as quaternion X, Y, Z, W
            const rotX = this._readFloat(data, offset);
            offset = rotX.nextOffset;
            const rotY = this._readFloat(data, offset);
            offset = rotY.nextOffset;
            const rotZ = this._readFloat(data, offset);
            offset = rotZ.nextOffset;
            const rotW = this._readFloat(data, offset);
            offset = rotW.nextOffset;
            const rotation = new Quaternion(
                rotX.value,
                rotY.value,
                rotZ.value,
                rotW.value
            );

            // Interpolation data (64 bytes) - store as array for future use
            const interpolation: number[] = [];
            for (let j = 0; j < 64; j++) {
                const byte = this._readByte(data, offset);
                interpolation.push(byte.value);
                offset = byte.nextOffset;
            }

            bones.push({
                boneName: boneName.value.trim(),
                frameNumber,
                position,
                rotation,
                interpolation
            });

            if ((i + 1) % 100 === 0) {
                console.log(`Loaded ${i + 1}/${boneFrameCount} bone keyframes`);
            }
        }

        console.log(`Loaded ${bones.length} bone keyframes`);

        // Parse morph keyframes (skip for now)
        let morphFrameCount = 0;
        if (offset < data.length) {
            morphFrameCount = this._readUInt32(data, offset).value;
            offset += 4;
            console.log("VMD morph frames:", morphFrameCount);
            // Skip morph data for now
            offset += morphFrameCount * (15 + 4 + 4); // name + frame + weight
        }

        return {
            bones,
            morphs: [],
            fps: 30, // Standard MMD FPS
            totalFrames: maxFrame + 1
        };
    }
}
