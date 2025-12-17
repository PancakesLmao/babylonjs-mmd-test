import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface VpdBoneData {
  name: string;
  position: Vector3;
  rotation: Quaternion;
}

export class VpdLoader {
    public static async LoadVpdFile(filePath: string): Promise<VpdBoneData[]> {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load VPD file: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            return this.ParseVpd(new Uint8Array(buffer));
        } catch (error) {
            console.error("Error loading VPD file:", error);
            throw error;
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _decodeShiftJIS(buffer: Uint8Array): string {
        try {
            const decoder = new TextDecoder("shift-jis");
            return decoder.decode(buffer);
        } catch {
            console.warn("Shift-JIS decoding not supported, falling back to UTF-8");
            const decoder = new TextDecoder("utf-8");
            return decoder.decode(buffer);
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _readString(
        data: Uint8Array,
        offset: number,
        length: number
    ): { value: string; nextOffset: number } {
        const bytes = data.slice(offset, offset + length);
        const value = this._decodeShiftJIS(bytes);
        return { value, nextOffset: offset + length };
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _readFloat(
        data: Uint8Array,
        offset: number
    ): { value: number; nextOffset: number } {
        const view = new DataView(data.buffer, data.byteOffset + offset, 4);
        const value = view.getFloat32(0, true); // Little-endian
        return { value, nextOffset: offset + 4 };
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _readUInt32(
        data: Uint8Array,
        offset: number
    ): { value: number; nextOffset: number } {
        const view = new DataView(data.buffer, data.byteOffset + offset, 4);
        const value = view.getUint32(0, true); // Little-endian
        return { value, nextOffset: offset + 4 };
    }

    public static ParseVpd(data: Uint8Array): VpdBoneData[] {
    // Try to detect format: if it starts with text-like characters, try text format first
        const firstBytes = data.slice(0, 30);
        const isLikelyText = this._isTextLike(firstBytes);

        if (isLikelyText) {
            try {
                const text = this._decodeShiftJIS(data);
                return this._parseVpdText(text);
            } catch (textError) {
                console.warn(
                    "Text format parsing failed, trying binary format:",
                    textError
                );
                // Fall through to binary parsing
            }
        }

        // Try binary format
        return this._parseVpdBinary(data);
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _isTextLike(data: Uint8Array): boolean {
    // Check if data contains newlines or common text characters
        for (let i = 0; i < Math.min(data.length, 100); i += 1) {
            const byte = data[i];
            if (byte === 0x0a || byte === 0x0d) {
                // Found newline
                return true;
            }
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _parseVpdText(content: string): VpdBoneData[] {
        const bones: VpdBoneData[] = [];
        const lines = content.split("\n").map((line) => line.trim());

        console.log("Parsing VPD as TEXT format");

        let i = 0;

        // Skip header
        if (i < lines.length && lines[i].includes("Vocaloid")) {
            i += 1;
        }

        // Skip empty lines
        while (i < lines.length && lines[i] === "") {
            i += 1;
        }

        // Skip model filename
        if (i < lines.length && lines[i].includes(".")) {
            i += 1;
        }

        // Skip empty lines
        while (i < lines.length && lines[i] === "") {
            i += 1;
        }

        // Read bone count
        let boneCount = 0;
        if (i < lines.length) {
            const countMatch = lines[i].match(/^(\d+)/);
            if (countMatch) {
                boneCount = parseInt(countMatch[1], 10);
            }
            i += 1;
        }

        // Skip empty lines
        while (i < lines.length && lines[i] === "") {
            i += 1;
        }

        // Read bones
        for (let j = 0; j < boneCount && i < lines.length; j += 1) {
            // Skip empty lines
            while (i < lines.length && lines[i] === "") {
                i += 1;
            }

            if (i >= lines.length) {
                break;
            }

            // Parse bone name from "Bone0{name" format or just name
            let boneName = lines[i];
            const boneMatch = boneName.match(/[Bb]one\d+\{(.+?)$/);
            if (boneMatch) {
                boneName = boneMatch[1];
            }
            i += 1;

            let position = new Vector3(0, 0, 0);
            let rotation = new Quaternion(0, 0, 0, 1);

            // Read position line
            if (i < lines.length) {
                const posLine = lines[i];
                const posMatch = posLine.match(
                    /([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)/
                );
                if (posMatch) {
                    position = new Vector3(
                        parseFloat(posMatch[1]),
                        parseFloat(posMatch[2]),
                        parseFloat(posMatch[3])
                    );
                }
                i += 1;
            }

            // Read rotation line
            if (i < lines.length) {
                const rotLine = lines[i];
                const rotMatch = rotLine.match(
                    /([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)/
                );
                if (rotMatch) {
                    const x = parseFloat(rotMatch[1]);
                    const y = parseFloat(rotMatch[2]);
                    const z = parseFloat(rotMatch[3]);
                    const w = parseFloat(rotMatch[4]);

                    // Normalize: ensure positive W component for consistent representation
                    if (w < 0) {
                        rotation = new Quaternion(-x, -y, -z, -w);
                    } else {
                        rotation = new Quaternion(x, y, z, w);
                    }
                }
                i += 1;
            }

            // Skip closing brace
            if (i < lines.length && lines[i] === "}") {
                i += 1;
            }

            bones.push({
                name: boneName,
                position,
                rotation
            });
        }

        console.log(`Loaded ${bones.length} bones from VPD (text format)`);
        return bones;
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _parseVpdBinary(data: Uint8Array): VpdBoneData[] {
        const bones: VpdBoneData[] = [];
        let offset = 0;

        console.log("Parsing VPD as BINARY format");

        // Read header (20 bytes)
        const header = this._readString(data, offset, 20);
        offset = header.nextOffset;
        console.log("VPD Header:", header.value.trim());

        if (!header.value.includes("Vocaloid")) {
            throw new Error("Invalid VPD file: missing Vocaloid header");
        }

        // Skip model name (20 bytes)
        const modelName = this._readString(data, offset, 20);
        offset = modelName.nextOffset;
        console.log("VPD Model name:", modelName.value.trim());

        // Read bone count (4 bytes)
        if (offset + 4 > data.length) {
            throw new Error("VPD file truncated: cannot read bone count");
        }
        const boneCountData = this._readUInt32(data, offset);
        offset = boneCountData.nextOffset;
        const boneCount = boneCountData.value;
        console.log("VPD bone count:", boneCount);

        // Sanity check: reasonable bone count
        if (boneCount > 10000) {
            throw new Error(
                `Invalid bone count: ${boneCount}. File may not be VPD format.`
            );
        }

        // Parse bone data
        for (let i = 0; i < boneCount; i += 1) {
            // Check if we have enough data
            if (offset + 48 > data.length) {
                console.warn(`VPD truncated at bone ${i}/${boneCount}, stopping parse`);
                break;
            }

            // Bone name (20 bytes)
            const boneName = this._readString(data, offset, 20);
            offset = boneName.nextOffset;

            // Position (3 floats = 12 bytes)
            const posX = this._readFloat(data, offset);
            offset = posX.nextOffset;
            const posY = this._readFloat(data, offset);
            offset = posY.nextOffset;
            const posZ = this._readFloat(data, offset);
            offset = posZ.nextOffset;
            const position = new Vector3(posX.value, posY.value, posZ.value);

            // Rotation (4 floats = 16 bytes)
            const rotX = this._readFloat(data, offset);
            offset = rotX.nextOffset;
            const rotY = this._readFloat(data, offset);
            offset = rotY.nextOffset;
            const rotZ = this._readFloat(data, offset);
            offset = rotZ.nextOffset;
            const rotW = this._readFloat(data, offset);
            offset = rotW.nextOffset;

            // Normalize: ensure positive W component for consistent representation
            let rotation: Quaternion;
            if (rotW.value < 0) {
                rotation = new Quaternion(
                    -rotX.value,
                    -rotY.value,
                    -rotZ.value,
                    -rotW.value
                );
            } else {
                rotation = new Quaternion(
                    rotX.value,
                    rotY.value,
                    rotZ.value,
                    rotW.value
                );
            }

            bones.push({
                name: boneName.value.trim(),
                position,
                rotation
            });

            if ((i + 1) % 50 === 0) {
                console.log(`Loaded ${i + 1}/${boneCount} bones from VPD`);
            }
        }

        console.log(`Loaded ${bones.length} bones from VPD (binary format)`);
        return bones;
    }

    public static async LoadFromFile(file: File): Promise<VpdBoneData[]> {
        return new Promise((resolve, reject): void => {
            const reader = new FileReader();
            reader.onload = (event): void => {
                try {
                    const buffer = event.target?.result as ArrayBuffer;
                    const bones = this.ParseVpd(new Uint8Array(buffer));
                    resolve(bones);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (): void => {
                reject(reader.error);
            };
            reader.readAsArrayBuffer(file);
        });
    }
}
