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
            const text = VpdLoader._decodeShiftJIS(new Uint8Array(buffer));
            return this.ParseVpd(text);
        } catch (error) {
            console.error("Error loading VPD file:", error);
            throw error;
        }
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private static _decodeShiftJIS(buffer: Uint8Array): string {
    // Try to decode as Shift-JIS first
        try {
            const decoder = new TextDecoder("shift-jis");
            return decoder.decode(buffer);
        } catch {
            // Fallback to UTF-8
            console.warn("Shift-JIS decoding not supported, falling back to UTF-8");
            const decoder = new TextDecoder("utf-8");
            return decoder.decode(buffer);
        }
    }

    public static ParseVpd(content: string): VpdBoneData[] {
        const bones: VpdBoneData[] = [];
        const lines = content.split("\n").map((line) => line.trim());

        console.log("VPD file lines:", lines.length);
        console.log("First 10 lines:", lines.slice(0, 10));

        let i = 0;

        // Skip header lines starting with "Vocaloid" or empty
        if (i < lines.length && lines[i].startsWith("Vocaloid")) {
            console.log(`Skipping header: "${lines[i]}"`);
            i += 1;
        }

        // Skip empty lines
        while (i < lines.length && lines[i] === "") {
            i += 1;
        }

        // Skip model filename line (e.g., "MEIKO.osm; // comment")
        if (i < lines.length && lines[i].includes(".osm")) {
            console.log(`Skipping model line: "${lines[i]}"`);
            i += 1;
        }

        // Skip empty lines again
        while (i < lines.length && lines[i] === "") {
            i += 1;
        }

        // Read bone count (e.g., "64; // comment")
        let boneCount = 0;
        if (i < lines.length) {
            const countMatch = lines[i].match(/^(\d+)/);
            if (countMatch) {
                boneCount = parseInt(countMatch[1], 10);
                console.log(`Bone count: ${boneCount}`);
                i += 1;
            } else {
                console.warn(`Expected bone count at line ${i}, got: "${lines[i]}"`);
            }
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
                console.warn(`Reached end of file at bone ${j}/${boneCount}`);
                break;
            }

            const boneName = lines[i];
            console.log(`Reading bone ${j}: "${boneName}"`);
            i += 1;

            let position = new Vector3(0, 0, 0);
            let rotation = new Quaternion(0, 0, 0, 1);

            // Parse bone name and index from "BoneN{boneName" format
            const boneMatch = boneName.match(/Bone(\d+)\{(.+)$/);
            const boneIndex = boneMatch ? parseInt(boneMatch[1], 10) : j;
            const actualBoneName = boneMatch ? boneMatch[2] : boneName;
            console.log(`Actual bone name: "${actualBoneName}", index: ${boneIndex}`);

            // Read position line (e.g., "0.000000,-0.200000,-1.100000; // comment")
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
                    console.log(
                        `  Position: ${position.x}, ${position.y}, ${position.z}`
                    );
                }
                i += 1;
            }

            // Read rotation line (quaternion: x y z w)
            if (i < lines.length) {
                const rotLine = lines[i];
                const rotMatch = rotLine.match(
                    /([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)/
                );
                if (rotMatch) {
                    rotation = new Quaternion(
                        parseFloat(rotMatch[1]),
                        parseFloat(rotMatch[2]),
                        parseFloat(rotMatch[3]),
                        parseFloat(rotMatch[4])
                    );
                    console.log(
                        `  Rotation: ${rotation.x}, ${rotation.y}, ${rotation.z}, ${rotation.w}`
                    );
                }
                i += 1;
            }

            // Skip closing brace
            if (i < lines.length && lines[i] === "}") {
                i += 1;
            }

            bones.push({
                name: actualBoneName,
                position,
                rotation
            });
        }

        console.log(`Loaded ${bones.length} bones from VPD file`);
        return bones;
    }

    public static async LoadFromFile(file: File): Promise<VpdBoneData[]> {
        return new Promise((resolve, reject): void => {
            const reader = new FileReader();
            reader.onload = (event): void => {
                try {
                    const buffer = event.target?.result as ArrayBuffer;
                    const content = VpdLoader._decodeShiftJIS(new Uint8Array(buffer));
                    const bones = this.ParseVpd(content);
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
