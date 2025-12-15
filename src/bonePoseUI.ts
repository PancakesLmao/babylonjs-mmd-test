import type { BoneController } from "./boneController";

export class BonePoseUI {
    private readonly _container: HTMLElement;
    private readonly _boneController: BoneController;

    public constructor(boneController: BoneController) {
        this._boneController = boneController;
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
