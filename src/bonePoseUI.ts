import type { BoneController } from "./boneController";
import type { CameraController } from "./cameraController";
import { VpdLoader } from "./vpdLoader";

export class BonePoseUI {
    private readonly _container: HTMLElement;
    private readonly _boneController: BoneController;
    private readonly _cameraController: CameraController | null;

    public constructor(
        boneController: BoneController,
        cameraController?: CameraController
    ) {
        this._boneController = boneController;
        this._cameraController = cameraController || null;
        this._container = document.createElement("div");
        this._container.id = "bone-pose-ui";
        this._container.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            max-width: 300px;
            max-height: 500px;
            overflow-y: auto;
            z-index: 1000;
        `;
        document.body.appendChild(this._container);

        // Show loading message initially
        this._container.innerHTML =
      "<h3>Bone Pose Control</h3><p>Loading bones...</p>";

        // Wait for skeleton to be ready before rendering
        this._boneController.onSkeletonReady(() => {
            this._render();
        });
    }

    private _render(): void {
        this._container.innerHTML =
      "<h3 style=\"margin: 0 0 15px 0;\">Bone Pose Control</h3>";

        // Add instructions
        const instructions = document.createElement("div");
        instructions.style.cssText = `
            background: rgba(100, 150, 200, 0.3);
            padding: 10px;
            margin-bottom: 15px;
            border-left: 3px solid #6496c8;
            font-size: 11px;
            line-height: 1.4;
        `;
        instructions.innerHTML = `
            <strong>How to use:</strong><br>
            1. Select a bone from the dropdown<br>
            2. Use the sliders to rotate it<br>
            3. Click "Reset Selected" to undo changes<br>
            4. Click "Reset All" to reset everything
        `;
        this._container.appendChild(instructions);

        // Add camera controls section if available
        if (this._cameraController) {
            const cameraContainer = document.createElement("div");
            cameraContainer.style.marginBottom = "15px";
            cameraContainer.style.paddingBottom = "15px";
            cameraContainer.style.borderBottom = "1px solid #555";

            const cameraTitle = document.createElement("h4");
            cameraTitle.textContent = "Camera Position";
            cameraTitle.style.margin = "0 0 10px 0";
            cameraContainer.appendChild(cameraTitle);

            const cameraPos = this._cameraController.getPosition();
            const axes = ["x", "y", "z"] as const;

            for (const axis of axes) {
                const controlDiv = document.createElement("div");
                controlDiv.style.marginBottom = "8px";

                const label = document.createElement("label");
                label.textContent = axis.toUpperCase();
                label.style.display = "inline-block";
                label.style.width = "20px";
                label.style.fontWeight = "bold";

                const input = document.createElement("input");
                input.type = "range";
                input.min = "-50";
                input.max = "50";
                input.step = "0.5";
                input.value = cameraPos[axis].toString();
                input.style.cssText = "width: 160px; vertical-align: middle;";
                input.dataset.axis = axis;

                const valueDisplay = document.createElement("span");
                valueDisplay.textContent = cameraPos[axis].toFixed(1);
                valueDisplay.style.marginLeft = "10px";
                valueDisplay.style.width = "45px";
                valueDisplay.style.display = "inline-block";

                input.addEventListener("input", () => {
                    const value = parseFloat(input.value);
                    valueDisplay.textContent = value.toFixed(1);
          this._cameraController!.moveCamera(axis, value);
                });

                controlDiv.appendChild(label);
                controlDiv.appendChild(input);
                controlDiv.appendChild(valueDisplay);
                cameraContainer.appendChild(controlDiv);
            }

            const resetCameraBtn = document.createElement("button");
            resetCameraBtn.textContent = "Reset Camera";
            resetCameraBtn.style.cssText = `
                width: 100%;
                padding: 8px;
                margin-top: 10px;
                background: #666;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            resetCameraBtn.addEventListener("click", () => {
        this._cameraController!.reset();
        // Update sliders and display
        const defaultState = this._cameraController!.getDefaultState();
        const inputs = cameraContainer.querySelectorAll("input[type='range']");
        inputs.forEach((input, index) => {
            const axis = ["x", "y", "z"][
                index
            ] as keyof typeof defaultState.position;
            const value = defaultState.position[axis];
            (input as HTMLInputElement).value = value.toString();
            (input.nextElementSibling as HTMLElement).textContent =
            value.toFixed(1);
        });
            });
            cameraContainer.appendChild(resetCameraBtn);
            this._container.appendChild(cameraContainer);
        }

        // Add VPD loading section
        const vpdContainer = document.createElement("div");
        vpdContainer.style.marginBottom = "15px";
        vpdContainer.style.paddingBottom = "15px";
        vpdContainer.style.borderBottom = "1px solid #555";

        const vpdLabel = document.createElement("label");
        vpdLabel.textContent = "Load VPD Pose:";
        vpdLabel.style.display = "block";
        vpdLabel.style.marginBottom = "8px";
        vpdLabel.style.fontWeight = "bold";

        const vpdFileInput = document.createElement("input");
        vpdFileInput.type = "file";
        vpdFileInput.accept = ".vpd";
        vpdFileInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        vpdFileInput.addEventListener("change", async(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const vpdBones = await VpdLoader.LoadFromFile(file);
                    this._boneController.applyVpdPose(vpdBones);
                } catch (error) {
                    console.error("Failed to load VPD file:", error);
                    alert("Failed to load VPD file. Check console for details.");
                }
            }
        });

        vpdContainer.appendChild(vpdLabel);
        vpdContainer.appendChild(vpdFileInput);
        this._container.appendChild(vpdContainer);

        const bones = this._boneController.getBones();

        // Create bone selector
        const selectorContainer = document.createElement("div");
        selectorContainer.style.marginBottom = "15px";

        const label = document.createElement("label");
        label.textContent = "Select Bone: ";
        label.style.display = "block";
        label.style.marginBottom = "5px";

        const select = document.createElement("select");
        select.style.cssText = "width: 100%; padding: 5px; margin-bottom: 10px;";

        const defaultOption = document.createElement("option");
        defaultOption.textContent = "-- Select a bone --";
        defaultOption.value = "";
        select.appendChild(defaultOption);

        for (const bone of bones) {
            const option = document.createElement("option");
            option.textContent = bone.name;
            option.value = bone.name;
            select.appendChild(option);
        }

        select.addEventListener("change", () => {
            if (select.value) {
                this._boneController.selectBone(select.value);
                this._renderBoneControls();
            }
        });

        selectorContainer.appendChild(label);
        selectorContainer.appendChild(select);
        this._container.appendChild(selectorContainer);

        // Reset buttons
        const resetContainer = document.createElement("div");
        resetContainer.style.marginBottom = "15px";

        const resetBoneBtn = document.createElement("button");
        resetBoneBtn.textContent = "Reset Selected";
        resetBoneBtn.style.cssText = `
            width: 48%;
            padding: 8px;
            margin-right: 4%;
            background: #666;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        resetBoneBtn.addEventListener("click", () => {
            const boneName = this._boneController.getSelectedBoneName();
            if (boneName) {
                this._boneController.resetBone(boneName);
            }
        });

        const resetAllBtn = document.createElement("button");
        resetAllBtn.textContent = "Reset All";
        resetAllBtn.style.cssText = `
            width: 48%;
            padding: 8px;
            background: #666;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        resetAllBtn.addEventListener("click", () => {
            this._boneController.resetAllBones();
            this._renderBoneControls();
        });

        resetContainer.appendChild(resetBoneBtn);
        resetContainer.appendChild(resetAllBtn);
        this._container.appendChild(resetContainer);

        this._renderBoneControls();
    }

    private _renderBoneControls(): void {
        let controlsContainer = this._container.querySelector("#bone-controls");
        if (controlsContainer) {
            controlsContainer.remove();
        }

        const selectedBoneName = this._boneController.getSelectedBoneName();
        if (!selectedBoneName) return;

        controlsContainer = document.createElement("div");
        controlsContainer.id = "bone-controls";

        // Rotation controls
        const rotationDiv = document.createElement("div");
        rotationDiv.innerHTML = "<strong>Rotation (radians):</strong>";
        rotationDiv.style.marginBottom = "10px";

        const rotations = [
            { axis: "X", value: 0 },
            { axis: "Y", value: 0 },
            { axis: "Z", value: 0 }
        ];

        for (const rot of rotations) {
            const controlDiv = document.createElement("div");
            controlDiv.style.marginBottom = "8px";

            const label = document.createElement("label");
            label.textContent = `${rot.axis}: `;
            label.style.display = "inline-block";
            label.style.width = "30px";

            const input = document.createElement("input");
            input.type = "range";
            input.min = (-Math.PI).toString();
            input.max = Math.PI.toString();
            input.step = "0.1";
            input.value = "0";
            input.style.cssText = "width: 180px; vertical-align: middle;";

            const valueDisplay = document.createElement("span");
            valueDisplay.textContent = "0";
            valueDisplay.style.marginLeft = "10px";
            valueDisplay.style.width = "40px";
            valueDisplay.style.display = "inline-block";

            input.addEventListener("input", () => {
                valueDisplay.textContent = parseFloat(input.value).toFixed(2);

                const inputs = controlsContainer?.querySelectorAll(
                    "input[type='range']"
                );
                if (inputs && inputs.length >= 3) {
                    this._boneController.rotateBone(
                        parseFloat((inputs[0] as HTMLInputElement).value),
                        parseFloat((inputs[1] as HTMLInputElement).value),
                        parseFloat((inputs[2] as HTMLInputElement).value)
                    );
                }
            });

            controlDiv.appendChild(label);
            controlDiv.appendChild(input);
            controlDiv.appendChild(valueDisplay);
            rotationDiv.appendChild(controlDiv);
        }

        controlsContainer.appendChild(rotationDiv);
        this._container.appendChild(controlsContainer);
    }

    public destroy(): void {
        this._container.remove();
    }
}
