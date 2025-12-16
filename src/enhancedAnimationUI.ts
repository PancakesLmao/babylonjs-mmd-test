import type { VmdAnimationController } from "./vmdAnimationController";

/**
 * Enhanced Animation UI provides timeline visualization and layer composition controls.
 * Supports animation blending, timeline scrubbing, and layer weight adjustment.
 */
export class EnhancedAnimationUI {
    private readonly _container: HTMLElement;
    private readonly _vmdAnimationController: VmdAnimationController;
    private _selectedModelIndex: number = 0;
    private _isTimelineVisible: boolean = true;
    private _timelineUpdateHandle: number | null = null;

    public constructor(
        vmdAnimationController: VmdAnimationController,
        containerId: string = "enhanced-animation-ui"
    ) {
        this._vmdAnimationController = vmdAnimationController;

        // Create or get container
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement("div");
            container.id = containerId;
            document.body.appendChild(container);
        }

        this._container = container;
        this._container.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(20, 20, 20, 0.95);
            color: #e0e0e0;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            width: 400px;
            max-height: 300px;
            overflow-y: auto;
            border: 2px solid #444;
            z-index: 900;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
        `;

        this._render();
    }

    private _render(): void {
        this._container.innerHTML = `
            <div style="margin-bottom: 12px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #fff;">Animation Timeline</h3>
            </div>

            <div id="timeline-controls" style="margin-bottom: 15px; border-bottom: 1px solid #555; padding-bottom: 10px;">
                <label style="display: flex; align-items: center; margin-bottom: 8px;">
                    <input type="checkbox" id="toggle-timeline" ${
    this._isTimelineVisible ? "checked" : ""
} style="margin-right: 8px; cursor: pointer;">
                    <span>Show Timeline</span>
                </label>

                <div id="timeline-display" style="display: ${
    this._isTimelineVisible ? "block" : "none"
}; background: #1a1a1a; padding: 8px; border-radius: 4px; margin-top: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                        <span id="current-frame">Frame: 0</span>
                        <span id="total-frames">/ 0</span>
                        <span id="playback-time">0.0s</span>
                    </div>

                    <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; cursor: pointer; margin-bottom: 10px;" id="timeline-bar">
                        <div id="timeline-progress" style="height: 100%; background: linear-gradient(90deg, #4CAF50, #45a049); border-radius: 4px; width: 0%; transition: width 0.1s linear;"></div>
                    </div>

                    <input type="range" id="frame-slider" min="0" max="0" value="0" style="width: 100%; cursor: pointer; margin-bottom: 8px;">
                </div>
            </div>

            <div id="layer-controls" style="border-bottom: 1px solid #555; padding-bottom: 10px; margin-bottom: 10px;">
                <h4 style="margin: 0 0 10px 0; font-size: 12px; color: #aaa;">Animation Layers</h4>

                <div style="margin-bottom: 8px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 11px;">Blend Mode:</label>
                    <select id="blend-mode-select" style="width: 100%; padding: 4px; background: #333; color: #e0e0e0; border: 1px solid #555; border-radius: 3px; cursor: pointer; font-family: inherit;">
                        <option value="override">Override (Highest Weight)</option>
                        <option value="additive">Additive (Combine)</option>
                    </select>
                </div>

                <div id="layers-list" style="max-height: 150px; overflow-y: auto; background: #0a0a0a; border: 1px solid #333; border-radius: 3px; padding: 8px;">
                    <div style="text-align: center; color: #666; padding: 20px;">No animation layers loaded</div>
                </div>

                <button id="add-layer-btn" style="width: 100%; padding: 6px; margin-top: 8px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">
                    + Add Animation Layer
                </button>
            </div>

            <div id="model-selector" style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px; font-size: 11px;">Active Model:</label>
                <select id="model-select" style="width: 100%; padding: 4px; background: #333; color: #e0e0e0; border: 1px solid #555; border-radius: 3px; cursor: pointer; font-family: inherit;">
                    <option value="0">Model 1</option>
                    <option value="1">Model 2</option>
                </select>
            </div>
        `;

        this._attachEventListeners();
    }

    private _attachEventListeners(): void {
    // Toggle timeline visibility
        const toggleBtn = this._container.querySelector(
            "#toggle-timeline"
        ) as HTMLInputElement;
        const timelineDisplay = this._container.querySelector(
            "#timeline-display"
        ) as HTMLElement;

        if (toggleBtn) {
            toggleBtn.addEventListener("change", () => {
                this._isTimelineVisible = toggleBtn.checked;
                if (timelineDisplay) {
                    timelineDisplay.style.display = this._isTimelineVisible
                        ? "block"
                        : "none";
                }
            });
        }

        // Timeline scrubbing
        const timelineBar = this._container.querySelector(
            "#timeline-bar"
        ) as HTMLElement;
        const frameSlider = this._container.querySelector(
            "#frame-slider"
        ) as HTMLInputElement;

        if (timelineBar) {
            timelineBar.addEventListener("click", (event) => {
                const rect = timelineBar.getBoundingClientRect();
                const clickX = event.clientX - rect.left;
                const percentage = clickX / rect.width;

                if (frameSlider) {
                    const maxFrame = parseInt(frameSlider.max, 10);
                    const newFrame = Math.floor(percentage * maxFrame);
                    frameSlider.value = String(newFrame);
                    this._vmdAnimationController.setFrame(newFrame);
                }
            });
        }

        if (frameSlider) {
            frameSlider.addEventListener("input", () => {
                const frame = parseInt(frameSlider.value, 10);
                this._vmdAnimationController.setFrame(frame);
            });
        }

        // Blend mode selection
        const blendModeSelect = this._container.querySelector(
            "#blend-mode-select"
        ) as HTMLSelectElement;
        if (blendModeSelect) {
            blendModeSelect.addEventListener("change", () => {
                const blender = this._vmdAnimationController.getAnimationBlender(
                    this._selectedModelIndex
                );
                if (blender) {
                    blender.setBlendMode(
            blendModeSelect.value as "additive" | "override"
                    );
                }
            });
        }

        // Model selector
        const modelSelect = this._container.querySelector(
            "#model-select"
        ) as HTMLSelectElement;
        if (modelSelect) {
            modelSelect.addEventListener("change", () => {
                this._selectedModelIndex = parseInt(modelSelect.value, 10);
                this._updateLayersList();
            });
        }

        // Add layer button
        const addLayerBtn = this._container.querySelector(
            "#add-layer-btn"
        ) as HTMLButtonElement;
        if (addLayerBtn) {
            addLayerBtn.addEventListener("click", () => {
                this._showAddLayerDialog();
            });
        }

        // Start timeline update loop
        this._startTimelineUpdate();
        this._updateLayersList();
    }

    private _updateLayersList(): void {
        const blender = this._vmdAnimationController.getAnimationBlender(
            this._selectedModelIndex
        );
        const layersList = this._container.querySelector(
            "#layers-list"
        ) as HTMLElement;

        if (!blender || !layersList) {
            return;
        }

        const layers = blender.getAnimationLayers();

        if (layers.length === 0) {
            layersList.innerHTML =
        "<div style=\"text-align: center; color: #666; padding: 20px;\">No animation layers loaded</div>";
            return;
        }

        layersList.innerHTML = layers
            .map(
                (layer, index) => `
                <div style="background: #1a1a1a; padding: 8px; margin-bottom: 8px; border-radius: 3px; border-left: 3px solid #4CAF50;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-weight: bold; color: #4CAF50;">${
    layer.name
}</span>
                        <button data-layer-index="${index}" class="remove-layer-btn" style="background: #d32f2f; color: white; border: none; padding: 2px 8px; border-radius: 2px; cursor: pointer; font-size: 11px;">Remove</button>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <input type="checkbox" ${
    layer.isActive ? "checked" : ""
} class="layer-active-${index}" style="cursor: pointer;" />
                        <span style="color: #aaa; font-size: 11px;">Active</span>
                    </div>

                    <div style="margin-bottom: 6px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span style="color: #aaa; font-size: 11px;">Weight:</span>
                            <span style="color: #4CAF50; font-size: 11px;">${(
        layer.weight * 100
    ).toFixed(0)}%</span>
                        </div>
                        <input type="range" class="layer-weight-${index}" min="0" max="100" value="${
    layer.weight * 100
}" style="width: 100%; cursor: pointer;" />
                    </div>
                </div>
            `
            )
            .join("");

        // Attach layer event listeners
        layersList.querySelectorAll(".remove-layer-btn").forEach((btn) => {
            btn.addEventListener("click", (event) => {
                const target = event.target as HTMLElement;
                const layerName =
          layers[parseInt(target.getAttribute("data-layer-index") || "0", 10)]
              .name;
                if (blender) {
                    blender.removeAnimationLayer(layerName);
                    this._updateLayersList();
                }
            });
        });

        layersList
            .querySelectorAll("[class^='layer-active-']")
            .forEach((checkbox, index) => {
                const htmlCheckbox = checkbox as HTMLInputElement;
                htmlCheckbox.addEventListener("change", () => {
                    const layerName = layers[index].name;
                    if (blender) {
                        blender.setLayerActive(layerName, htmlCheckbox.checked);
                    }
                });
            });

        layersList
            .querySelectorAll("[class^='layer-weight-']")
            .forEach((slider, index) => {
                const htmlSlider = slider as HTMLInputElement;
                htmlSlider.addEventListener("input", () => {
                    const weight = parseInt(htmlSlider.value, 10) / 100;
                    const layerName = layers[index].name;
                    if (blender) {
                        blender.setLayerWeight(layerName, weight);
                        this._updateLayersList();
                    }
                });
            });
    }

    private _startTimelineUpdate(): void {
        const updateTimeline = (): void => {
            const frameSlider = this._container.querySelector(
                "#frame-slider"
            ) as HTMLInputElement;
            const currentFrameDisplay = this._container.querySelector(
                "#current-frame"
            ) as HTMLElement;
            const totalFramesDisplay = this._container.querySelector(
                "#total-frames"
            ) as HTMLElement;
            const playbackTimeDisplay = this._container.querySelector(
                "#playback-time"
            ) as HTMLElement;
            const timelineProgress = this._container.querySelector(
                "#timeline-progress"
            ) as HTMLElement;

            if (frameSlider && currentFrameDisplay) {
                const currentFrame = this._vmdAnimationController.getCurrentFrame();
                const totalFrames = this._vmdAnimationController.getTotalFrames();
                const currentTime = currentFrame / 30; // Assuming 30 FPS

                frameSlider.max = String(totalFrames);
                frameSlider.value = String(currentFrame);

                if (currentFrameDisplay) {
                    currentFrameDisplay.textContent = `Frame: ${currentFrame}`;
                }
                if (totalFramesDisplay) {
                    totalFramesDisplay.textContent = `/ ${totalFrames}`;
                }
                if (playbackTimeDisplay) {
                    playbackTimeDisplay.textContent = `${currentTime.toFixed(1)}s`;
                }
                if (timelineProgress && totalFrames > 0) {
                    const percentage = (currentFrame / totalFrames) * 100;
                    timelineProgress.style.width = `${percentage}%`;
                }
            }

            this._timelineUpdateHandle = requestAnimationFrame(updateTimeline);
        };

        this._timelineUpdateHandle = requestAnimationFrame(updateTimeline);
    }

    private _showAddLayerDialog(): void {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".vmd";

        fileInput.addEventListener("change", async(event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];

            if (file) {
                try {
                    const layerName = file.name.replace(/\.vmd$/i, "");
                    // Prompt for weight
                    const weight = parseFloat(
                        prompt(`Weight for "${layerName}" (0-1):`, "0.5") || "0.5"
                    );

                    if (isNaN(weight) || weight < 0 || weight > 1) {
                        alert("Please enter a valid weight between 0 and 1");
                        return;
                    }

                    // Load VMD file and add as layer
                    void (await file.arrayBuffer());
                    const blender = this._vmdAnimationController.getAnimationBlender(
                        this._selectedModelIndex
                    );

                    if (blender) {
                        // This would need to be integrated with actual VMD loading
                        console.log(`Would load ${layerName} with weight ${weight}`);
                        this._updateLayersList();
                    }
                } catch (error) {
                    console.error("Error loading animation layer:", error);
                    alert("Failed to load animation layer");
                }
            }
        });

        fileInput.click();
    }

    public dispose(): void {
        if (this._timelineUpdateHandle !== null) {
            cancelAnimationFrame(this._timelineUpdateHandle);
        }
    }
}
