import type { BoneController } from "./boneController";
import type { CameraController } from "./cameraController";
import type { VmdAnimationController } from "./vmdAnimationController";
import { VpdLoader } from "./vpdLoader";

export class BonePoseUI {
    private readonly _container: HTMLElement;
    private readonly _boneController: BoneController;
    private readonly _cameraController: CameraController | null;
    private _vmdAnimationController: VmdAnimationController | null;
    private _animationUpdateHandle: number | null = null;

    public constructor(
        boneController: BoneController,
        cameraController?: CameraController,
        vmdAnimationController?: VmdAnimationController
    ) {
        this._boneController = boneController;
        this._cameraController = cameraController || null;
        this._vmdAnimationController = vmdAnimationController || null;
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

        // Create separate panels for camera controls at top-left (position) and bottom-left (controls)
        if (this._cameraController) {
            // Camera Position Display - Top Left
            const cameraPositionPanel = document.createElement("div");
            cameraPositionPanel.id = "camera-position-panel";
            cameraPositionPanel.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 12px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 11px;
                z-index: 1001;
                border-left: 3px solid #4080b0;
            `;
            cameraPositionPanel.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 8px;">Camera Position</div>
                <div id="camera-pos-display" style="background: rgba(50, 50, 80, 0.4); padding: 8px; border-radius: 4px; font-family: monospace; color: #90ee90;">
                    Position: X: 0.0 | Y: 10.0 | Z: 0.0
                </div>
            `;
            document.body.appendChild(cameraPositionPanel);

            // Camera Control UI - Bottom Left
            const cameraControlPanel = document.createElement("div");
            cameraControlPanel.id = "camera-control-panel";
            cameraControlPanel.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 12px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 11px;
                z-index: 1001;
                border-left: 3px solid #4080b0;
                min-width: 180px;
            `;
            cameraControlPanel.innerHTML =
        "<div style=\"font-weight: bold; margin-bottom: 8px;\">Camera Controls</div>";
            document.body.appendChild(cameraControlPanel);

            // Visual controller UI inside the panel
            const controlUI = document.createElement("div");
            controlUI.style.cssText = `
                background: rgba(30, 30, 30, 0.8);
                padding: 12px;
                border-radius: 6px;
            `;

            // Keyboard visualization
            const keyboardSection = document.createElement("div");
            keyboardSection.style.cssText = `
                margin-bottom: 12px;
            `;
            keyboardSection.innerHTML =
        "<strong style=\"font-size: 10px;\">Movement:</strong>";

            const keyboardViz = document.createElement("div");
            keyboardViz.style.cssText = `
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 4px;
                margin-top: 6px;
            `;

            const keys = [
                { id: "w", label: "W", pos: "grid-column: 2;" },
                { id: "a", label: "A", pos: "grid-column: 1;" },
                { id: "s", label: "S", pos: "grid-column: 2;" },
                { id: "d", label: "D", pos: "grid-column: 3;" }
            ];

            const keyElements: { [key: string]: HTMLElement } = {};

            keys.forEach((key) => {
                const keyBtn = document.createElement("div");
                keyBtn.id = `key-${key.id}`;
                keyBtn.style.cssText = `
                    ${key.pos}
                    background: #444;
                    border: 1px solid #666;
                    padding: 8px;
                    border-radius: 4px;
                    text-align: center;
                    font-weight: bold;
                    color: #aaa;
                    font-size: 10px;
                    transition: all 0.1s;
                    cursor: default;
                `;
                keyBtn.textContent = key.label;
                keyboardViz.appendChild(keyBtn);
                keyElements[key.id] = keyBtn;
            });

            keyboardSection.appendChild(keyboardViz);
            controlUI.appendChild(keyboardSection);

            // Space and Shift keys
            const verticalSection = document.createElement("div");
            verticalSection.style.cssText = `
                margin-bottom: 12px;
            `;
            verticalSection.innerHTML =
        "<strong style=\"font-size: 10px;\">Vertical:</strong>";

            const verticalViz = document.createElement("div");
            verticalViz.style.cssText = `
                display: flex;
                gap: 4px;
                margin-top: 6px;
            `;

            const spaceBtn = document.createElement("div");
            spaceBtn.id = "key-space";
            spaceBtn.style.cssText = `
                flex: 1;
                background: #444;
                border: 1px solid #666;
                padding: 8px;
                border-radius: 4px;
                text-align: center;
                font-weight: bold;
                color: #aaa;
                font-size: 10px;
                transition: all 0.1s;
                cursor: default;
            `;
            spaceBtn.textContent = "SPACE ↑";
            keyElements["space"] = spaceBtn;
            verticalViz.appendChild(spaceBtn);

            const shiftBtn = document.createElement("div");
            shiftBtn.id = "key-shift";
            shiftBtn.style.cssText = `
                flex: 1;
                background: #444;
                border: 1px solid #666;
                padding: 8px;
                border-radius: 4px;
                text-align: center;
                font-weight: bold;
                color: #aaa;
                font-size: 10px;
                transition: all 0.1s;
                cursor: default;
            `;
            shiftBtn.textContent = "SHIFT ↓";
            keyElements["shift"] = shiftBtn;
            verticalViz.appendChild(shiftBtn);

            verticalSection.appendChild(verticalViz);
            controlUI.appendChild(verticalSection);

            // Mouse visualization
            const mouseSection = document.createElement("div");
            mouseSection.style.cssText = `
                margin-bottom: 0;
            `;
            mouseSection.innerHTML =
        "<strong style=\"font-size: 10px;\">Rotation:</strong>";

            const mouseViz = document.createElement("div");
            mouseViz.id = "mouse-rmb";
            mouseViz.style.cssText = `
                background: #444;
                border: 1px solid #666;
                padding: 12px;
                border-radius: 4px;
                text-align: center;
                font-weight: bold;
                color: #aaa;
                font-size: 11px;
                margin-top: 6px;
                transition: all 0.1s;
                cursor: default;
            `;
            mouseViz.textContent = "RMB Drag";
            keyElements["isRotating"] = mouseViz;
            mouseSection.appendChild(mouseViz);
            controlUI.appendChild(mouseSection);

            cameraControlPanel.appendChild(controlUI);

            // Update UI in animation loop
            const updateControlUI = (): void => {
                const inputs = this._cameraController!.getInputStates();
                const pos = this._cameraController!.getCameraTarget();

                // Update key colors
                Object.entries(inputs).forEach(([key, isActive]) => {
                    if (key === "isRotating") return;
                    if (keyElements[key]) {
                        if (isActive) {
                            keyElements[key].style.background = "#00aa00";
                            keyElements[key].style.borderColor = "#00ff00";
                            keyElements[key].style.color = "#ffffff";
                            keyElements[key].style.boxShadow = "0 0 8px rgba(0, 255, 0, 0.5)";
                        } else {
                            keyElements[key].style.background = "#444";
                            keyElements[key].style.borderColor = "#666";
                            keyElements[key].style.color = "#aaa";
                            keyElements[key].style.boxShadow = "none";
                        }
                    }
                });

                // Update mouse button
                if (keyElements["isRotating"]) {
                    if (inputs.isRotating) {
                        keyElements["isRotating"].style.background = "#aa0000";
                        keyElements["isRotating"].style.borderColor = "#ff0000";
                        keyElements["isRotating"].style.color = "#ffffff";
                        keyElements["isRotating"].style.boxShadow =
              "0 0 8px rgba(255, 0, 0, 0.5)";
                    } else {
                        keyElements["isRotating"].style.background = "#444";
                        keyElements["isRotating"].style.borderColor = "#666";
                        keyElements["isRotating"].style.color = "#aaa";
                        keyElements["isRotating"].style.boxShadow = "none";
                    }
                }

                // Update position display
                const posDisplay = document.getElementById("camera-pos-display");
                if (posDisplay) {
                    posDisplay.innerHTML = `Position: X: ${pos.x.toFixed(
                        1
                    )} | Y: ${pos.y.toFixed(1)} | Z: ${pos.z.toFixed(1)}`;
                }

                requestAnimationFrame(updateControlUI);
            };
            requestAnimationFrame(updateControlUI);
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

        // Add model loading section
        const modelContainer = document.createElement("div");
        modelContainer.style.marginBottom = "15px";
        modelContainer.style.paddingBottom = "15px";
        modelContainer.style.borderBottom = "1px solid #555";

        const modelLabel = document.createElement("label");
        modelLabel.textContent = "Load Second Model:";
        modelLabel.style.display = "block";
        modelLabel.style.marginBottom = "8px";
        modelLabel.style.fontWeight = "bold";

        const modelSelect = document.createElement("select");
        modelSelect.style.cssText =
      "width: 100%; margin-bottom: 8px; padding: 6px;";

        // Add default option
        const modelDefaultOption = document.createElement("option");
        modelDefaultOption.value = "";
        modelDefaultOption.textContent = "Select a model...";
        modelSelect.appendChild(modelDefaultOption);

        // Add available models
        const availableModels = [
            { path: "res/models/Kitasan/Kitasan.pmx", name: "Kitasan" },
            {
                path: "res/models/Manhattan_Casual/Manhattan.pmx",
                name: "Manhattan Casual"
            },
            {
                path: "res/models/Manhattan_Default/Manhattan.pmx",
                name: "Manhattan Default"
            }
        ];

        for (const model of availableModels) {
            const option = document.createElement("option");
            option.value = model.path;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        }

        modelSelect.addEventListener("change", async() => {
            const selectedPath = modelSelect.value;
            if (selectedPath) {
                try {
                    if (this._vmdAnimationController) {
                        const modelMesh = await this._vmdAnimationController.loadModel(
                            selectedPath
                        );
                        console.log("Second model loaded:", modelMesh);
                        alert(
                            "Second model loaded successfully! The new model will play the same animation."
                        );
                        // Reset dropdown after successful load
                        modelSelect.value = "";

                        // Show animation controls for second model
                        this._showSecondModelAnimationControls();
                    } else {
                        alert(
                            "Animation controller not initialized. Please reload the page."
                        );
                    }
                } catch (error) {
                    console.error("Failed to load model:", error);
                    alert("Failed to load model. Check console for details.");
                }
            }
        });

        modelContainer.appendChild(modelLabel);
        modelContainer.appendChild(modelSelect);
        this._container.appendChild(modelContainer);

        // Add VMD loading and animation section
        const vmdContainer = document.createElement("div");
        vmdContainer.style.marginBottom = "15px";
        vmdContainer.style.paddingBottom = "15px";
        vmdContainer.style.borderBottom = "1px solid #555";

        const vmdLabel = document.createElement("label");
        vmdLabel.textContent = "Load VMD Animation (Model Motion):";
        vmdLabel.style.display = "block";
        vmdLabel.style.marginBottom = "8px";
        vmdLabel.style.fontWeight = "bold";

        const vmdFileInput = document.createElement("input");
        vmdFileInput.type = "file";
        vmdFileInput.id = "first-model-motion-vmd";
        vmdFileInput.style.cssText = "width: 100%; margin-bottom: 12px;";

        vmdFileInput.addEventListener("change", async(e) => {
            const motionFile = (e.target as HTMLInputElement).files?.[0];
            if (motionFile) {
                try {
                    if (this._vmdAnimationController) {
                        const morphFile = (
              vmdContainer.querySelector(
                  "#first-model-morph-vmd"
              ) as HTMLInputElement
                        )?.files?.[0];
                        const mouthFile = (
              vmdContainer.querySelector(
                  "#first-model-mouth-vmd"
              ) as HTMLInputElement
                        )?.files?.[0];
                        const eyeFile = (
              vmdContainer.querySelector(
                  "#first-model-eye-vmd"
              ) as HTMLInputElement
                        )?.files?.[0];
                        await this._vmdAnimationController.loadVmdForModelWithMorphsMouthAndEye(
                            motionFile,
                            morphFile || null,
                            mouthFile || null,
                            eyeFile || null,
                            0
                        );
                        // Update animation UI
                        this._updateAnimationControls();
                    } else {
                        alert(
                            "Animation controller not initialized. Please reload the page."
                        );
                    }
                } catch (error) {
                    console.error("Failed to load VMD file:", error);
                    alert("Failed to load VMD file. Check console for details.");
                }
            }
        });

        vmdContainer.appendChild(vmdLabel);
        vmdContainer.appendChild(vmdFileInput);

        // Add facial expression import for first model
        const morphLabel = document.createElement("label");
        morphLabel.textContent = "Load Facial Expression VMD (Optional):";
        morphLabel.style.display = "block";
        morphLabel.style.marginBottom = "8px";
        morphLabel.style.fontWeight = "bold";

        const morphFileInput = document.createElement("input");
        morphFileInput.type = "file";
        morphFileInput.accept = ".vmd";
        morphFileInput.id = "first-model-morph-vmd";
        morphFileInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        morphFileInput.addEventListener("change", async(e) => {
            const morphFile = (e.target as HTMLInputElement).files?.[0];
            const motionFile = (
        vmdContainer.querySelector(
            "#first-model-motion-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const mouthFile = (
        vmdContainer.querySelector("#first-model-mouth-vmd") as HTMLInputElement
            )?.files?.[0];
            const eyeFile = (
        vmdContainer.querySelector("#first-model-eye-vmd") as HTMLInputElement
            )?.files?.[0];

            if (morphFile) {
                try {
                    if (this._vmdAnimationController) {
                        if (motionFile) {
                            // Both motion and morphs loaded
                            await this._vmdAnimationController.loadVmdForModelWithMorphsMouthAndEye(
                                motionFile,
                                morphFile,
                                mouthFile || null,
                                eyeFile || null,
                                0
                            );
                            this._updateAnimationControls();
                        } else {
                            // Only facial/morphs - load as regular VMD
                            await this._vmdAnimationController.loadVmdFile(morphFile);
                            this._updateAnimationControls();
                        }
                    } else {
                        alert(
                            "Animation controller not initialized. Please reload the page."
                        );
                    }
                } catch (error) {
                    console.error("Failed to load animation with morphs:", error);
                    alert("Failed to load animation. Check console for details.");
                }
            }
        });

        vmdContainer.appendChild(morphLabel);
        vmdContainer.appendChild(morphFileInput);

        // Add mouth motion import for first model
        const mouthLabel = document.createElement("label");
        mouthLabel.textContent = "Load Mouth Motion VMD (Optional):";
        mouthLabel.style.display = "block";
        mouthLabel.style.marginBottom = "8px";
        mouthLabel.style.fontWeight = "bold";

        const mouthFileInput = document.createElement("input");
        mouthFileInput.type = "file";
        mouthFileInput.accept = ".vmd";
        mouthFileInput.id = "first-model-mouth-vmd";
        mouthFileInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        mouthFileInput.addEventListener("change", async(e) => {
            const mouthFile = (e.target as HTMLInputElement).files?.[0];
            const motionFile = (
        vmdContainer.querySelector(
            "#first-model-motion-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const morphFile = (
        vmdContainer.querySelector("#first-model-morph-vmd") as HTMLInputElement
            )?.files?.[0];
            const eyeFile = (
        vmdContainer.querySelector("#first-model-eye-vmd") as HTMLInputElement
            )?.files?.[0];

            if (mouthFile && motionFile) {
                try {
                    if (this._vmdAnimationController) {
                        await this._vmdAnimationController.loadVmdForModelWithMorphsMouthAndEye(
                            motionFile,
                            morphFile || null,
                            mouthFile,
                            eyeFile || null,
                            0
                        );
                        this._updateAnimationControls();
                    } else {
                        alert(
                            "Animation controller not initialized. Please reload the page."
                        );
                    }
                } catch (error) {
                    console.error("Failed to load mouth motion:", error);
                    alert("Failed to load mouth motion. Check console for details.");
                }
            }
        });

        vmdContainer.appendChild(mouthLabel);
        vmdContainer.appendChild(mouthFileInput);

        // Add eye motion import for first model
        const eyeLabel = document.createElement("label");
        eyeLabel.textContent = "Load Eye Motion VMD (Optional):";
        eyeLabel.style.display = "block";
        eyeLabel.style.marginBottom = "8px";
        eyeLabel.style.fontWeight = "bold";

        const eyeFileInput = document.createElement("input");
        eyeFileInput.type = "file";
        eyeFileInput.accept = ".vmd";
        eyeFileInput.id = "first-model-eye-vmd";
        eyeFileInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        eyeFileInput.addEventListener("change", async(e) => {
            const eyeFile = (e.target as HTMLInputElement).files?.[0];
            const motionFile = (
        vmdContainer.querySelector(
            "#first-model-motion-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const morphFile = (
        vmdContainer.querySelector("#first-model-morph-vmd") as HTMLInputElement
            )?.files?.[0];
            const mouthFile = (
        vmdContainer.querySelector("#first-model-mouth-vmd") as HTMLInputElement
            )?.files?.[0];

            if (eyeFile && motionFile) {
                try {
                    if (this._vmdAnimationController) {
                        await this._vmdAnimationController.loadVmdForModelWithMorphsMouthAndEye(
                            motionFile,
                            morphFile || null,
                            mouthFile || null,
                            eyeFile,
                            0
                        );
                        this._updateAnimationControls();
                    } else {
                        alert(
                            "Animation controller not initialized. Please reload the page."
                        );
                    }
                } catch (error) {
                    console.error("Failed to load eye motion:", error);
                    alert("Failed to load eye motion. Check console for details.");
                }
            }
        });

        vmdContainer.appendChild(eyeLabel);
        vmdContainer.appendChild(eyeFileInput);

        // Add camera motion loading section
        const cameraMotionLabel = document.createElement("label");
        cameraMotionLabel.textContent = "Load Camera Motion (VMD):";
        cameraMotionLabel.style.display = "block";
        cameraMotionLabel.style.marginBottom = "8px";
        cameraMotionLabel.style.fontWeight = "bold";
        cameraMotionLabel.style.marginTop = "10px";

        const cameraMotionInput = document.createElement("input");
        cameraMotionInput.type = "file";
        cameraMotionInput.accept = ".vmd";
        cameraMotionInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        cameraMotionInput.addEventListener("change", async(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    if (this._vmdAnimationController) {
                        await this._vmdAnimationController.loadCameraMotion(file);
                        alert("Camera motion loaded successfully.");
                    } else {
                        alert(
                            "Animation controller not initialized. Please reload the page."
                        );
                    }
                } catch (error) {
                    console.error("Failed to load camera motion:", error);
                    alert("Failed to load camera motion. Check console for details.");
                }
            }
        });

        vmdContainer.appendChild(cameraMotionLabel);
        vmdContainer.appendChild(cameraMotionInput);

        // Add audio loading section
        const audioLabel = document.createElement("label");
        audioLabel.textContent = "Load Audio (MP3/WAV):";
        audioLabel.style.display = "block";
        audioLabel.style.marginBottom = "8px";
        audioLabel.style.fontWeight = "bold";
        audioLabel.style.marginTop = "10px";

        const audioFileInput = document.createElement("input");
        audioFileInput.type = "file";
        audioFileInput.accept = ".mp3,.wav,audio/mpeg,audio/wav";
        audioFileInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        audioFileInput.addEventListener("change", async(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    if (this._vmdAnimationController) {
                        await this._vmdAnimationController.loadAudioFile(file);
                        alert("Audio file loaded and synchronized with animation.");
                    } else {
                        alert(
                            "Animation controller not initialized. Please reload the page."
                        );
                    }
                } catch (error) {
                    console.error("Failed to load audio file:", error);
                    alert("Failed to load audio file. Check console for details.");
                }
            }
        });

        vmdContainer.appendChild(audioLabel);
        vmdContainer.appendChild(audioFileInput);

        // Animation controls
        const animControlsDiv = document.createElement("div");
        animControlsDiv.id = "vmd-controls";
        animControlsDiv.style.cssText = `
            background: rgba(100, 100, 100, 0.3);
            padding: 10px;
            border-radius: 4px;
        `;

        const buttonRow = document.createElement("div");
        buttonRow.style.marginBottom = "10px";
        buttonRow.style.display = "grid";
        buttonRow.style.gridTemplateColumns = "1fr 1fr 1fr 1fr";
        buttonRow.style.gap = "5px";

        const playBtn = document.createElement("button");
        playBtn.textContent = "Play";
        playBtn.id = "vmd-play-btn";
        playBtn.style.cssText = `
            padding: 6px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        playBtn.disabled = true;
        playBtn.addEventListener("click", () => {
            if (this._vmdAnimationController) {
                this._vmdAnimationController.play();
                this._startAnimationLoop();
                this._updatePlayButtonState();
            }
        });

        const pauseBtn = document.createElement("button");
        pauseBtn.textContent = "Pause";
        pauseBtn.id = "vmd-pause-btn";
        pauseBtn.style.cssText = `
            padding: 6px;
            background: #FF9800;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        pauseBtn.disabled = true;
        pauseBtn.addEventListener("click", () => {
            if (this._vmdAnimationController) {
                this._vmdAnimationController.pause();
                this._updatePlayButtonState();
            }
        });

        const stopBtn = document.createElement("button");
        stopBtn.textContent = "Stop";
        stopBtn.id = "vmd-stop-btn";
        stopBtn.style.cssText = `
            padding: 6px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        stopBtn.disabled = true;
        stopBtn.addEventListener("click", () => {
            if (this._vmdAnimationController) {
                this._vmdAnimationController.stop();
                this._updatePlayButtonState();
            }
        });

        const resetBtn = document.createElement("button");
        resetBtn.textContent = "Reset";
        resetBtn.id = "vmd-reset-btn";
        resetBtn.style.cssText = `
            padding: 6px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        resetBtn.disabled = true;
        resetBtn.addEventListener("click", () => {
            if (this._vmdAnimationController) {
                this._vmdAnimationController.reset();
            }
        });

        buttonRow.appendChild(playBtn);
        buttonRow.appendChild(pauseBtn);
        buttonRow.appendChild(stopBtn);
        buttonRow.appendChild(resetBtn);
        animControlsDiv.appendChild(buttonRow);

        // Frame display and slider
        const frameDiv = document.createElement("div");
        frameDiv.style.marginBottom = "8px";

        const frameLabel = document.createElement("label");
        frameLabel.textContent = "Frame:";
        frameLabel.style.display = "block";
        frameLabel.style.marginBottom = "4px";
        frameLabel.style.fontSize = "11px";

        const frameSlider = document.createElement("input");
        frameSlider.type = "range";
        frameSlider.id = "vmd-frame-slider";
        frameSlider.min = "0";
        frameSlider.max = "0";
        frameSlider.value = "0";
        frameSlider.style.cssText = "width: 100%; vertical-align: middle;";

        const frameDisplay = document.createElement("span");
        frameDisplay.id = "vmd-frame-display";
        frameDisplay.textContent = "0 / 0";
        frameDisplay.style.marginLeft = "10px";
        frameDisplay.style.fontSize = "11px";

        frameSlider.addEventListener("input", () => {
            if (this._vmdAnimationController) {
                const frame = parseInt(frameSlider.value);
                this._vmdAnimationController.setFrame(frame);
                frameDisplay.textContent = `${frame} / ${this._vmdAnimationController.getTotalFrames()}`;
            }
        });

        frameDiv.appendChild(frameLabel);
        frameDiv.appendChild(frameSlider);
        frameDiv.appendChild(frameDisplay);
        animControlsDiv.appendChild(frameDiv);

        // Playback speed
        const speedDiv = document.createElement("div");
        const speedLabel = document.createElement("label");
        speedLabel.textContent = "Speed:";
        speedLabel.style.display = "inline-block";
        speedLabel.style.width = "35px";
        speedLabel.style.fontSize = "11px";

        const speedInput = document.createElement("input");
        speedInput.type = "range";
        speedInput.min = "0.5";
        speedInput.max = "2";
        speedInput.step = "0.1";
        speedInput.value = "1";
        speedInput.style.cssText = "width: 120px; vertical-align: middle;";

        const speedDisplay = document.createElement("span");
        speedDisplay.textContent = "1.0x";
        speedDisplay.style.marginLeft = "10px";
        speedDisplay.style.fontSize = "11px";

        speedInput.addEventListener("input", () => {
            const speed = parseFloat(speedInput.value);
            speedDisplay.textContent = `${speed.toFixed(1)}x`;
            if (this._vmdAnimationController) {
                this._vmdAnimationController.setPlaybackSpeed(speed);
            }
        });

        speedDiv.appendChild(speedLabel);
        speedDiv.appendChild(speedInput);
        speedDiv.appendChild(speedDisplay);
        animControlsDiv.appendChild(speedDiv);

        animControlsDiv.style.display = "none"; // Hidden until VMD is loaded
        vmdContainer.appendChild(animControlsDiv);
        this._container.appendChild(vmdContainer);

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
        if (this._animationUpdateHandle !== null) {
            cancelAnimationFrame(this._animationUpdateHandle);
        }
    }

    public setVmdAnimationController(controller: VmdAnimationController): void {
        this._vmdAnimationController = controller;
    }

    private _updateAnimationControls(): void {
        const controlsDiv = this._container.querySelector(
            "#vmd-controls"
        ) as HTMLElement;
        if (!controlsDiv) return;

        controlsDiv.style.display = "block";

        const playBtn = this._container.querySelector(
            "#vmd-play-btn"
        ) as HTMLButtonElement;
        const pauseBtn = this._container.querySelector(
            "#vmd-pause-btn"
        ) as HTMLButtonElement;
        const stopBtn = this._container.querySelector(
            "#vmd-stop-btn"
        ) as HTMLButtonElement;
        const resetBtn = this._container.querySelector(
            "#vmd-reset-btn"
        ) as HTMLButtonElement;

        if (playBtn && pauseBtn && stopBtn && resetBtn) {
            playBtn.disabled = false;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            resetBtn.disabled = false;
        }

        if (this._vmdAnimationController) {
            const frameSlider = this._container.querySelector(
                "#vmd-frame-slider"
            ) as HTMLInputElement;
            const frameDisplay = this._container.querySelector(
                "#vmd-frame-display"
            ) as HTMLElement;

            if (frameSlider && frameDisplay) {
                const totalFrames = this._vmdAnimationController.getTotalFrames();
                frameSlider.max = totalFrames.toString();
                frameDisplay.textContent = `0 / ${totalFrames}`;
            }
        }

        this._updatePlayButtonState();
    }

    private _updatePlayButtonState(): void {
        const playBtn = this._container.querySelector(
            "#vmd-play-btn"
        ) as HTMLButtonElement;
        const pauseBtn = this._container.querySelector(
            "#vmd-pause-btn"
        ) as HTMLButtonElement;

        if (playBtn && pauseBtn && this._vmdAnimationController) {
            if (this._vmdAnimationController.isPlaying()) {
                playBtn.disabled = true;
                pauseBtn.disabled = false;
            } else {
                playBtn.disabled = false;
                pauseBtn.disabled = true;
            }
        }
    }

    private _startAnimationLoop(): void {
        if (this._animationUpdateHandle !== null) {
            return; // Already running
        }

        const frameSlider = this._container.querySelector(
            "#vmd-frame-slider"
        ) as HTMLInputElement;
        const frameDisplay = this._container.querySelector(
            "#vmd-frame-display"
        ) as HTMLElement;

        const updateFrame = (): void => {
            if (
                this._vmdAnimationController &&
        this._vmdAnimationController.isPlaying()
            ) {
                const currentFrame = this._vmdAnimationController.getCurrentFrame();
                if (frameSlider) {
                    frameSlider.value = currentFrame.toString();
                }
                if (frameDisplay) {
                    frameDisplay.textContent = `${currentFrame} / ${this._vmdAnimationController.getTotalFrames()}`;
                }
                this._animationUpdateHandle = requestAnimationFrame(updateFrame);
            } else {
                this._animationUpdateHandle = null;
                this._updatePlayButtonState();
            }
        };

        this._animationUpdateHandle = requestAnimationFrame(updateFrame);
    }

    private _showSecondModelAnimationControls(): void {
        const secondModelIndex = 1; // Index of the second model

        // Check if controls already exist
        const existingControls = this._container.querySelector(
            "#second-model-animation-controls"
        );
        if (existingControls) {
            return; // Already shown, don't create duplicate
        }

        // Create container for second model controls
        const secondModelContainer = document.createElement("div");
        secondModelContainer.id = "second-model-animation-controls";
        secondModelContainer.style.marginTop = "15px";
        secondModelContainer.style.paddingTop = "15px";
        secondModelContainer.style.borderTop = "2px solid #6496c8";

        const secondModelTitle = document.createElement("h4");
        secondModelTitle.textContent = "Second Model Animation";
        secondModelTitle.style.margin = "0 0 10px 0";
        secondModelTitle.style.color = "#6496c8";
        secondModelContainer.appendChild(secondModelTitle);

        // Motion VMD file input
        const secondModelVmdLabel = document.createElement("label");
        secondModelVmdLabel.textContent = "Load Motion VMD (Body/Bones):";
        secondModelVmdLabel.style.display = "block";
        secondModelVmdLabel.style.marginBottom = "8px";
        secondModelVmdLabel.style.fontWeight = "bold";

        const secondModelVmdInput = document.createElement("input");
        secondModelVmdInput.type = "file";
        secondModelVmdInput.accept = ".vmd";
        secondModelVmdInput.id = "second-model-motion-vmd";
        secondModelVmdInput.style.cssText = "width: 100%; margin-bottom: 12px;";

        secondModelVmdInput.addEventListener("change", async(e) => {
            const motionFile = (e.target as HTMLInputElement).files?.[0];
            const morphFile = (
        secondModelContainer.querySelector(
            "#second-model-morph-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const mouthFile = (
        secondModelContainer.querySelector(
            "#second-model-mouth-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const eyeFile = (
        secondModelContainer.querySelector(
            "#second-model-eye-vmd"
        ) as HTMLInputElement
            )?.files?.[0];

            if (motionFile) {
                try {
                    if (this._vmdAnimationController) {
                        await this._vmdAnimationController.loadVmdForModelWithMorphsMouthAndEye(
                            motionFile,
                            morphFile || null,
                            mouthFile || null,
                            eyeFile || null,
                            secondModelIndex
                        );
                        alert("Animation loaded for second model successfully!");
                    } else {
                        alert("Animation controller not initialized.");
                    }
                } catch (error) {
                    console.error("Failed to load animation for second model:", error);
                    alert("Failed to load animation. Check console for details.");
                }
            }
        });

        secondModelContainer.appendChild(secondModelVmdLabel);
        secondModelContainer.appendChild(secondModelVmdInput);

        // Morph/Facial Expression VMD file input
        const secondModelMorphLabel = document.createElement("label");
        secondModelMorphLabel.textContent =
      "Load Facial Expression VMD (Optional):";
        secondModelMorphLabel.style.display = "block";
        secondModelMorphLabel.style.marginBottom = "8px";
        secondModelMorphLabel.style.fontWeight = "bold";

        const secondModelMorphInput = document.createElement("input");
        secondModelMorphInput.type = "file";
        secondModelMorphInput.accept = ".vmd";
        secondModelMorphInput.id = "second-model-morph-vmd";
        secondModelMorphInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        secondModelMorphInput.addEventListener("change", async(e) => {
            const morphFile = (e.target as HTMLInputElement).files?.[0];
            const motionFile = (
        secondModelContainer.querySelector(
            "#second-model-motion-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const mouthFile = (
        secondModelContainer.querySelector(
            "#second-model-mouth-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const eyeFile = (
        secondModelContainer.querySelector(
            "#second-model-eye-vmd"
        ) as HTMLInputElement
            )?.files?.[0];

            if (morphFile) {
                try {
                    if (this._vmdAnimationController) {
                        if (motionFile) {
                            // Both motion and morphs loaded
                            await this._vmdAnimationController.loadVmdForModelWithMorphsMouthAndEye(
                                motionFile,
                                morphFile,
                                mouthFile || null,
                                eyeFile || null,
                                secondModelIndex
                            );
                        } else {
                            // Only facial/morphs - load as regular VMD for this model
                            await this._vmdAnimationController.loadVmdForModel(
                                morphFile,
                                secondModelIndex
                            );
                        }
                        alert("Animation loaded for second model successfully!");
                    } else {
                        alert("Animation controller not initialized.");
                    }
                } catch (error) {
                    console.error("Failed to load animation for second model:", error);
                    alert("Failed to load animation. Check console for details.");
                }
            }
        });

        secondModelContainer.appendChild(secondModelMorphLabel);
        secondModelContainer.appendChild(secondModelMorphInput);

        // Add mouth motion import for second model
        const secondModelMouthLabel = document.createElement("label");
        secondModelMouthLabel.textContent = "Load Mouth Motion VMD (Optional):";
        secondModelMouthLabel.style.display = "block";
        secondModelMouthLabel.style.marginBottom = "8px";
        secondModelMouthLabel.style.fontWeight = "bold";

        const secondModelMouthInput = document.createElement("input");
        secondModelMouthInput.type = "file";
        secondModelMouthInput.accept = ".vmd";
        secondModelMouthInput.id = "second-model-mouth-vmd";
        secondModelMouthInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        secondModelMouthInput.addEventListener("change", async(e) => {
            const mouthFile = (e.target as HTMLInputElement).files?.[0];
            const motionFile = (
        secondModelContainer.querySelector(
            "#second-model-motion-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const morphFile = (
        secondModelContainer.querySelector(
            "#second-model-morph-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const eyeFile = (
        secondModelContainer.querySelector(
            "#second-model-eye-vmd"
        ) as HTMLInputElement
            )?.files?.[0];

            if (mouthFile && motionFile) {
                try {
                    if (this._vmdAnimationController) {
                        await this._vmdAnimationController.loadVmdForModelWithMorphsMouthAndEye(
                            motionFile,
                            morphFile || null,
                            mouthFile,
                            eyeFile || null,
                            secondModelIndex
                        );
                        alert("Animation loaded for second model successfully!");
                    } else {
                        alert("Animation controller not initialized.");
                    }
                } catch (error) {
                    console.error("Failed to load mouth motion for second model:", error);
                    alert("Failed to load mouth motion. Check console for details.");
                }
            }
        });

        secondModelContainer.appendChild(secondModelMouthLabel);
        secondModelContainer.appendChild(secondModelMouthInput);

        // Add eye motion import for second model
        const secondModelEyeLabel = document.createElement("label");
        secondModelEyeLabel.textContent = "Load Eye Motion VMD (Optional):";
        secondModelEyeLabel.style.display = "block";
        secondModelEyeLabel.style.marginBottom = "8px";
        secondModelEyeLabel.style.fontWeight = "bold";

        const secondModelEyeInput = document.createElement("input");
        secondModelEyeInput.type = "file";
        secondModelEyeInput.accept = ".vmd";
        secondModelEyeInput.id = "second-model-eye-vmd";
        secondModelEyeInput.style.cssText = "width: 100%; margin-bottom: 8px;";

        secondModelEyeInput.addEventListener("change", async(e) => {
            const eyeFile = (e.target as HTMLInputElement).files?.[0];
            const motionFile = (
        secondModelContainer.querySelector(
            "#second-model-motion-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const morphFile = (
        secondModelContainer.querySelector(
            "#second-model-morph-vmd"
        ) as HTMLInputElement
            )?.files?.[0];
            const mouthFile = (
        secondModelContainer.querySelector(
            "#second-model-mouth-vmd"
        ) as HTMLInputElement
            )?.files?.[0];

            if (eyeFile && motionFile) {
                try {
                    if (this._vmdAnimationController) {
                        await this._vmdAnimationController.loadVmdForModelWithMorphsMouthAndEye(
                            motionFile,
                            morphFile || null,
                            mouthFile || null,
                            eyeFile,
                            secondModelIndex
                        );
                        alert("Animation loaded for second model successfully!");
                    } else {
                        alert("Animation controller not initialized.");
                    }
                } catch (error) {
                    console.error("Failed to load eye motion for second model:", error);
                    alert("Failed to load eye motion. Check console for details.");
                }
            }
        });

        secondModelContainer.appendChild(secondModelEyeLabel);
        secondModelContainer.appendChild(secondModelEyeInput);

        this._container.appendChild(secondModelContainer);
    }
}
