import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { ADDITION, Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import paper from "paper";
import { PaperOffset } from "paperjs-offset";
import BaseModule from "../core/BaseModule.js";
import { LoggerFactory } from "../core/LoggerFactory.js";
import eventBus from "../core/eventBus.js";
import appState from "../state/AppState.js";
import MaterialManager from "./MaterialManager.js";
import CSGEngine from "./CSGEngine.js";
import SceneManager from "./SceneManager.js";
import SelectionManager from "./SelectionManager.js";
import ExtrusionBuilder from "./ExtrusionBuilder.js";
import STLExporter from "../export/STLExporter.js";
import ColorUtils from "../utils/ColorUtils.js";
import { getRepairInstance } from "../utils/meshRepair.js";
import { appConfig } from "../config/AppConfig.js";

export default class ThreeModule extends BaseModule {
    constructor() {
        super();
        this.log = LoggerFactory.createLogger("ThreeModule");
        this.scene = null;
        this.container = null;
        this.animationFrameId = null;
        this.enabled = true;
        this.animateBound = this.animate.bind(this);

        // Managers
        this.sceneManager = new SceneManager();
        this.materialManager = new MaterialManager();
        this.csgEngine = new CSGEngine();
        this.extrusionBuilder = new ExtrusionBuilder();
        this.stlExporter = new STLExporter(this.log);
        this.lastValidPartFrontBBox = null;
        this.selectionEnabledWanted = false;
        this.selectionToggle = null;

        // Arc approximation control for panel shape
        // arcDivisionCoefficient: segments = arcLength / coefficient
        // Lower value = more segments = smoother curves
        this.arcDivisionCoefficient = 5; // Default: 1 segment per 2mm

        // Panel mesh
        this.panelMesh = null;

        // Original panel data (before CSG operation) - for toggle
        this.originalPanelGeometry = null;
        this.originalPanelMaterial = null;
        this.originalPanelPosition = null;
        this.originalPanelRotation = null;
        this.originalPanelScale = null;

        // Bit path visualization meshes (thick polylines)
        this.bitPathMeshes = [];

        // Extrude meshes for CSG operations
        this.bitExtrudeMeshes = [];

        // Last unique bits processed (for naming exported meshes)
        this.lastUniqueBits = [];

        // CSG related (kept for compatibility, but managed by CSGEngine now)
        this.partMesh = null;
        this.basePanelMesh = null;
        this.panelBBox = null;
        this.csgVisible = false;

        // Serialize updatePanel calls to avoid overlapping builds
        this.updatePanelRunning = false;
        this.updatePanelQueuedArgs = null;

        // Track last panel/bits signature to skip redundant rebuilds
        this.lastPanelUpdateSignature = null;

        // Panel side for bit operations: always 'top' (front face) - bottom removed
        this.panelSide = "top";

        // Extrude mode is selected automatically per bit operation (VC → miter, others → round)
    }

    async init() {
        this.log.info("Initializing...");
        this.container = document.getElementById("three-canvas-container");

        if (!this.container) {
            this.log.error("Container not found");
            return;
        }

        // Initialize scene manager (camera, renderer, controls, lighting, etc.)
        await this.sceneManager.initialize(this.container);

        // Keep reference to scene from scene manager
        this.scene = this.sceneManager.scene;

        // Initialize extrusion builder
        this.extrusionBuilder.initialize({
            materialManager: this.materialManager,
            csgEngine: this.csgEngine,
        });

        // Initialize SelectionManager
        this.selectionManager = new SelectionManager({
            scene: this.sceneManager.scene,
            camera: this.sceneManager.camera,
            renderer: this.sceneManager.renderer,
            container: this.container,
            materialManager: this.materialManager
        });
        this.sceneManager.initializeSelectionManager(this.selectionManager);

        // Add minimal on-canvas controls (material + wireframe + edges)
        this.initMaterialControls();

        // Add Grid Toggle
        this.addGridToggle();

        // Add CSG mode toggle

        this.addCSGModeToggle();

        // Panel side toggle removed - always use top position
        // this.addPanelSideToggle();

        // Removed test UI: extrude version selector and compare toggle

        // Add Stats widget
        this.sceneManager.addStatsWidget(
            typeof window !== "undefined" && window.Stats ? window.Stats : null,
        );

        // Setup observer for partFront changes to trigger 3D updates
        this.setupPartFrontObserver();

        // Subscribe to mode changes to enable/disable 3D workload
        eventBus.on("mode:changed", (mode) => {
            const shouldEnable = mode === "3d" || mode === "both";
            this.setEnabled(shouldEnable);
        });

        // Honor initial mode
        this.setEnabled(appState.is3DActive());

        // Start animation loop if enabled
        if (this.enabled) {
            this.resumeAnimation();
        }

        this.log.info("Initialized successfully");
    }

    setEnabled(enabled) {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        if (enabled) {
            this.log.info("3D enabled (mode)");
            this.resumeAnimation();
            this.connectPartFrontObserver();
            // Trigger update when enabling 3D to sync current state
            if (
                window.panelWidth &&
                window.panelHeight &&
                window.panelThickness
            ) {
                this.log.debug("3D enabled, triggering initial update");
                this.updatePanel(
                    window.panelWidth,
                    window.panelHeight,
                    window.panelThickness,
                    window.bitsOnCanvas || [],
                    window.panelAnchor || "top-left",
                );
                // Apply CSG if Part view is active
                if (window.showPart) {
                    this.log.debug("Part view active, applying CSG");
                    setTimeout(() => {
                        this.applyCSGOperation(true);
                    }, 300);
                }
            }
        } else {
            this.log.info("3D disabled (mode)");
            this.pauseAnimation();
            this.disconnectPartFrontObserver();
        }
    }

    resumeAnimation() {
        if (this.animationFrameId) return;
        this.animationFrameId = requestAnimationFrame(this.animateBound);
    }

    pauseAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    setupPartFrontObserver() {
        if (this.partFrontObserver) {
            try {
                this.partFrontObserver.disconnect();
            } catch (e) {
                this.log.warn("Failed to disconnect previous observer", e);
            }
        }
        const partFront = document.getElementById("part-front");
        if (!partFront) {
            this.log.warn("partFront element not found for observer");
            return;
        }

        // Create MutationObserver to watch for partFront changes
        this.partFrontObserver = new MutationObserver(() => {
            if (!this.enabled) return;
            this.log.debug("partFront changed, triggering 3D update");
            // Trigger updatePanel with current panel parameters
            if (
                window.panelWidth &&
                window.panelHeight &&
                window.panelThickness
            ) {
                this.updatePanel(
                    window.panelWidth,
                    window.panelHeight,
                    window.panelThickness,
                    window.bitsOnCanvas || [],
                    window.panelAnchor || "top-left",
                );
            }
        });

        // Observe attributes (d for path) and child nodes
        this.partFrontObserver.observe(partFront, {
            attributes: true,
            attributeFilter: ["d", "width", "height", "x", "y"],
            childList: false,
            subtree: false,
        });

        this.log.info("partFront observer setup complete");
    }

    connectPartFrontObserver() {
        this.setupPartFrontObserver();
    }

    disconnectPartFrontObserver() {
        if (this.partFrontObserver && this.partFrontObserver.disconnect) {
            this.partFrontObserver.disconnect();
        }
    }

    initMaterialControls() {
        try {
            const wrap = document.createElement("div");
            wrap.style.position = "absolute";
            wrap.style.top = "8px";
            wrap.style.right = "8px";
            wrap.style.display = "flex";
            wrap.style.gap = "8px";
            wrap.style.padding = "6px 8px";
            wrap.style.background = "rgba(255,255,255,0.9)";
            wrap.style.borderRadius = "6px";
            wrap.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
            wrap.style.zIndex = "101";
            wrap.style.display = "flex";
            wrap.style.flexDirection = "column";
            wrap.style.gap = "8px";

            // Row 1: Material & wireframe
            const row1 = document.createElement("div");
            row1.style.display = "flex";
            row1.style.gap = "8px";
            row1.style.alignItems = "center";

            // Material selector
            const select = document.createElement("select");
            select.title = "Display Mode";
            const materials = this.materialManager.getAvailableMaterials();
            materials.forEach((key) => {
                const opt = document.createElement("option");
                opt.value = key;
                // Get pretty label from registry if available, else standard logic
                // Since we rewrote MaterialManager, we know registry structure can have labels
                const reg = this.materialManager.materialRegistry[key];
                opt.textContent = reg && reg.label ? reg.label : key;
                select.appendChild(opt);
            });
            select.value = this.materialManager.getCurrentMaterialKey();
            select.addEventListener("change", () => {
                this.materialManager.setMaterialMode(select.value);
                this.applySelectionState();
            });

            // Toggle wireframe logic delegated to MaterialManager, but button here if needed.
            // Keeping wireframe separate for debug is useful, but User emphasized cleanup.
            // "Shaded", "ShadedEdges", "ShadedBEdges" are mutually exclusive modes.
            // Wireframe is orthogonal usually.
            // I'll keep the wireframe toggle invisible or just simple, 
            // but remove the "Edges" toggle.

            /*
            // Wireframe toggle (mesh wireframe)
            const wfLabel = document.createElement("label");
            wfLabel.style.display = "flex";
            wfLabel.style.alignItems = "center";
            wfLabel.style.gap = "4px";
            const wf = document.createElement("input");
            wf.type = "checkbox";
            wf.checked = this.materialManager.isWireframeEnabled();
            wf.title = "Wireframe Mesh";
            wf.addEventListener("change", () => {
                this.materialManager.toggleWireframe();
            });
            const wfText = document.createElement("span");
            wfText.textContent = "Wireframe";
            wfLabel.appendChild(wf);
            wfLabel.appendChild(wfText);
            */

            // Select toggle
            const selectLabel = document.createElement("label");
            selectLabel.style.display = "flex";
            selectLabel.style.alignItems = "center";
            selectLabel.style.gap = "4px";
            const selectToggle = document.createElement("input");
            selectToggle.type = "checkbox";
            selectToggle.checked = this.selectionEnabledWanted;
            selectToggle.title = "Toggle Selection";
            selectToggle.addEventListener("change", () => {
                this.selectionEnabledWanted = selectToggle.checked;
                this.applySelectionState();
            });
            const selectText = document.createElement("span");
            selectText.textContent = "Select";
            selectLabel.appendChild(selectToggle);
            selectLabel.appendChild(selectText);
            this.selectionToggle = selectToggle;

            // Export to STL button
            const exportBtn = document.createElement("button");
            exportBtn.textContent = "📥 STL";
            exportBtn.title = "Export 3D geometry to STL";
            exportBtn.style.padding = "4px 10px";
            exportBtn.style.backgroundColor = "#4CAF50";
            exportBtn.style.color = "white";
            exportBtn.style.border = "none";
            exportBtn.style.borderRadius = "4px";
            exportBtn.style.cursor = "pointer";
            exportBtn.style.fontSize = "12px";
            exportBtn.style.fontWeight = "bold";
            exportBtn.addEventListener("click", () => {
                this.exportToSTL("facade");
            });

            row1.appendChild(select);
            row1.appendChild(selectLabel);
            // row1.appendChild(wfLabel); // Hiding wireframe for cleaner UI as per request
            row1.appendChild(exportBtn);

            // Row 2: Colors
            const row2 = document.createElement("div");
            row2.style.display = "flex";
            row2.style.gap = "8px";
            row2.style.alignItems = "center";
            row2.style.fontSize = "12px";

            // Panel Color Input
            const pColorDiv = document.createElement("div");
            pColorDiv.style.display = "flex";
            pColorDiv.style.alignItems = "center";
            pColorDiv.style.gap = "4px";
            const pColorLabel = document.createElement("span");
            pColorLabel.textContent = "Panel:";
            const pColorInput = document.createElement("input");
            pColorInput.type = "color";
            pColorInput.value = "#deb887"; // Default
            pColorInput.style.border = "none";
            pColorInput.style.padding = "0";
            pColorInput.style.width = "24px";
            pColorInput.style.height = "24px";
            pColorInput.style.cursor = "pointer";
            pColorInput.title = "Panel Color";
            pColorInput.addEventListener("input", (e) => {
                this.materialManager.setTargetPanelColor(e.target.value);
            });
            pColorDiv.appendChild(pColorLabel);
            pColorDiv.appendChild(pColorInput);

            // Magic Button (Generator)
            const magicBtn = document.createElement("button");
            magicBtn.textContent = "✨";
            magicBtn.title = "Generate Harmony";
            magicBtn.style.border = "none";
            magicBtn.style.background = "transparent";
            magicBtn.style.cursor = "pointer";
            magicBtn.style.fontSize = "16px";
            magicBtn.addEventListener("click", () => {
                // Generate BG based on current panel color
                const currentPanelColor = new THREE.Color(pColorInput.value);
                const newBg = ColorUtils.generateCompatibleBackgroundColor(currentPanelColor);

                // Update BG input and scene
                const hex = "#" + newBg.getHexString();
                bgColorInput.value = hex;
                this.sceneManager.setBackgroundColor(newBg);
            });

            // BG Color Input
            const bColorDiv = document.createElement("div");
            bColorDiv.style.display = "flex";
            bColorDiv.style.alignItems = "center";
            bColorDiv.style.gap = "4px";
            const bColorLabel = document.createElement("span");
            bColorLabel.textContent = "BG:";
            const bgColorInput = document.createElement("input");
            bgColorInput.type = "color";
            bgColorInput.value = "#f5f5f5"; // Default
            bgColorInput.style.border = "none";
            bgColorInput.style.padding = "0";
            bgColorInput.style.width = "24px";
            bgColorInput.style.height = "24px";
            bgColorInput.style.cursor = "pointer";
            bgColorInput.title = "Background Color";
            bgColorInput.addEventListener("input", (e) => {
                this.sceneManager.setBackgroundColor(e.target.value);
            });
            bColorDiv.appendChild(bColorLabel);
            bColorDiv.appendChild(bgColorInput);

            // Edges Color
            const eColorDiv = document.createElement("div");
            eColorDiv.style.display = "flex";
            eColorDiv.style.alignItems = "center";
            eColorDiv.style.gap = "4px";
            eColorDiv.title = "Edges Color";
            const eColorLabel = document.createElement("span");
            eColorLabel.textContent = "Edge:";
            const eColorInput = document.createElement("input");
            eColorInput.type = "color";
            eColorInput.value = "#333333"; // Default
            eColorInput.style.border = "none";
            eColorInput.style.padding = "0";
            eColorInput.style.width = "24px";
            eColorInput.style.height = "24px";
            eColorInput.style.cursor = "pointer";
            eColorInput.addEventListener("input", (e) => {
                this.materialManager.setEdgesColor(e.target.value);
            });
            eColorDiv.appendChild(eColorLabel);
            eColorDiv.appendChild(eColorInput);

            row2.appendChild(pColorDiv);
            row2.appendChild(magicBtn);
            row2.appendChild(bColorDiv);

            // Separator
            const sep = document.createElement("div");
            sep.style.width = "1px";
            sep.style.height = "16px";
            sep.style.background = "#ddd";
            sep.style.margin = "0 4px";
            row2.appendChild(sep);

            row2.appendChild(eColorDiv);

            wrap.appendChild(row1);
            wrap.appendChild(row2);

            // Position wrap inside container (over renderer)
            this.container.style.position = "relative";
            this.container.appendChild(wrap);
            this.materialControls = { wrap, select, exportBtn };
            this.applySelectionState();
        } catch (e) {
            this.log.warn("Failed to init material controls:", e);
        }
    }

    applySelectionState() {
        const isWireframe =
            this.materialManager?.getCurrentMaterialKey?.() === "wireframe";

        if (this.selectionToggle) {
            this.selectionToggle.disabled = isWireframe;
            this.selectionToggle.checked = !isWireframe && this.selectionEnabledWanted;
        }

        if (isWireframe) {
            this.setSelectionEnabled(false);
            return;
        }

        this.setSelectionEnabled(this.selectionEnabledWanted);
    }

    setSelectionEnabled(enabled) {
        if (!this.selectionManager) return;
        if (enabled) {
            this.selectionManager.enable();
        } else {
            this.selectionManager.disable();
        }
        this.refreshSelectionTargets();
    }

    refreshSelectionTargets() {
        if (!this.selectionManager) return;
        const isWireframe =
            this.materialManager?.getCurrentMaterialKey?.() === "wireframe";
        if (isWireframe) {
            this.selectionManager.setTargetMesh(null);
            this.selectionManager.setTargetMeshes([]);
            return;
        }

        if (this.csgEngine?.csgVisible && this.csgEngine.partMesh) {
            this.selectionManager.setTargetMesh(this.csgEngine.partMesh);
            return;
        }

        const targets = [];
        if (this.panelMesh) targets.push(this.panelMesh);
        if (this.bitExtrudeMeshes && this.bitExtrudeMeshes.length) {
            targets.push(...this.bitExtrudeMeshes);
        }

        this.selectionManager.setTargetMeshes(targets);
    }

    addGridToggle() {
        const btn = document.createElement("button");
        btn.textContent = "#";
        btn.title = "Toggle Grid";
        btn.style.position = "absolute";
        btn.style.bottom = "10px";
        btn.style.left = "10px";
        btn.style.width = "30px";
        btn.style.height = "30px";
        btn.style.background = "rgba(200, 255, 200, 0.9)"; // Default active (grid is added by default)
        btn.style.border = "1px solid #ccc";
        btn.style.borderRadius = "4px";
        btn.style.cursor = "pointer";
        btn.style.zIndex = "100";
        btn.style.fontWeight = "bold";
        btn.style.fontSize = "16px";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        
        btn.addEventListener("click", () => {
            const isVisible = this.sceneManager.toggleGrid();
            btn.style.background = isVisible ? "rgba(200, 255, 200, 0.9)" : "rgba(255, 255, 255, 0.9)";
        });
        
        this.container.appendChild(btn);
    }

    addCSGModeToggle() {

        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.top = "80px";
        container.style.right = "10px";
        container.style.padding = "8px";
        container.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        container.style.border = "1px solid #ccc";
        container.style.borderRadius = "4px";
        container.style.zIndex = "100";
        container.style.fontSize = "12px";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.gap = "6px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "csg-union-mode";
        checkbox.checked = this.useUnionBeforeSubtract;
        checkbox.style.cursor = "pointer";

        const label = document.createElement("label");
        label.htmlFor = "csg-union-mode";
        label.textContent = "Union bits before subtract";
        label.style.cursor = "pointer";
        label.style.userSelect = "none";

        checkbox.addEventListener("change", () => {
            this.csgEngine.setUnionMode(checkbox.checked);
            // Invalidate cache to force recalculation
            // Reapply CSG if currently in Part view
            if (window.showPart && this.bitExtrudeMeshes.length > 0) {
                this.applyCSGOperation(true);
            }
        });

        container.appendChild(checkbox);
        container.appendChild(label);
        this.container.appendChild(container);
        this.csgModeToggle = container;
    }

    // Panel side toggle removed - always use top (front) position only
    // addPanelSideToggle() method removed as requested

    // addExtrudeVersionToggle removed: mode is selected automatically per operation

    addStatsWidget() {
        // Check if Stats is available
        if (typeof Stats === "undefined") {
            this.log.warn("Stats.js not loaded, skipping stats widget");
            return;
        }

        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
        this.stats.dom.style.position = "absolute";
        this.stats.dom.style.left = "10px";
        this.stats.dom.style.top = "10px";
        this.stats.dom.style.zIndex = "100";
        this.container.appendChild(this.stats.dom);
    }

    buildPanelBitsSignature(width, height, thickness, bits = [], panelAnchor) {
        const bitSig = bits.map((b) => ({
            name: b.name || b.id || "bit",
            x: b.x,
            y: b.y,
            op: b.operation,
            profile:
                b.bitData?.profilePath ||
                b.bitData?.name ||
                b.bitData?.id ||
                b.bitData?.type ||
                "profile",
            pocketOffset: b.pocketOffset || 0, // Include pocketOffset for PO operations
        }));

        return JSON.stringify({
            w: width,
            h: height,
            t: thickness,
            anchor: panelAnchor,
            bits: bitSig,
        });
    }

    /**
     * Create or update the panel visualization
     * @param {number} width - Panel width in mm
     * @param {number} height - Panel height in mm
     * @param {number} thickness - Panel thickness in mm
     * @param {Array} bits - Array of bit objects with positions and data
     * @param {string} panelAnchor - Panel anchor ("top-left" or "bottom-left")
     */
    async updatePanel(
        width,
        height,
        thickness,
        bits = [],
        panelAnchor = "top-left",
        changedBitIds = null
    ) {
        if (!this.enabled) {
            this.log.debug("Skip updatePanel: 3D disabled");
            return;
        }
        if (!this.scene) {
            this.log.debug("Skip updatePanel: Scene not initialized");
            return;
        }
        // Prevent overlapping runs: if already running, queue the latest request
        if (this.updatePanelRunning) {
            this.updatePanelQueuedArgs = {
                width,
                height,
                thickness,
                bits,
                panelAnchor,
                changedBitIds
            };
            return;
        }
        this.updatePanelRunning = true;

        try {
            const nextSignature = this.buildPanelBitsSignature(
                width,
                height,
                thickness,
                bits,
                panelAnchor,
            );

            // If partial update requested but signature matches, we might skip.
            // But if changedBitIds is set, something surely changed.
            // Unless signature logic is flawed. Assuming it's good.
            if (this.lastPanelUpdateSignature === nextSignature && !changedBitIds) {
                this.log.debug(
                    "Panel signature unchanged, skipping 3D rebuild",
                );
                return;
            }

            // Only log when actually updating (signature changed)
            this.log.info("Updating 3D panel", {
                width,
                height,
                thickness,
                bits: bits.length,
                partial: !!changedBitIds,
                changedBits: changedBitIds
            });

            // Clear all edge visualizations before removing meshes
            if (this.materialManager) {
                this.materialManager.clearAllEdges();
            }

            // If full update (no changedBitIds), remove everything
            if (!changedBitIds) {
                // Remove all meshes
                if (this.panelMesh) {
                    this.scene.remove(this.panelMesh);
                    // Only dispose if we haven't saved this as original (for toggle support)
                    if (this.panelMesh.geometry !== this.originalPanelGeometry) {
                        this.panelMesh.geometry?.dispose();
                    }
                    if (this.panelMesh.material !== this.originalPanelMaterial) {
                        this.panelMesh.material?.dispose();
                    }
                    this.panelMesh = null;
                }
                if (this.partMesh) {
                    this.partMesh.visible = false;
                }
                this.bitPathMeshes.forEach((mesh) => {
                    if (this.materialManager) this.materialManager.removeEdgeVisualization(mesh);
                    this.scene.remove(mesh);
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                });
                this.bitPathMeshes.length = 0;
                this.bitExtrudeMeshes.forEach((mesh) => {
                    if (this.materialManager) this.materialManager.removeEdgeVisualization(mesh);
                    this.scene.remove(mesh);
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                });
                this.bitExtrudeMeshes.length = 0;
                // Don't reset CSG state during drag to prevent unwanted recalculations
                if (!window.isDraggingBit) {
                    this.lastCSGSignature = null;
                    this.csgActive = false;
                    this.csgVisible = false;
                }
                this.panelBBox = null;

                // Recreate panel geometry (Full update logic)
                // ... (Existing logic for creating panelMesh)
                // Since I cannot easily split the huge function in one go without context, 
                // I will duplicate the panel creation logic or structure it to only run if !changedBitIds
            } else {
                // PARTIAL UPDATE
                // 1. Remove meshes for changed bits
                const idsToRemove = Array.isArray(changedBitIds) ? changedBitIds : [changedBitIds];
                
                // Helper to check if mesh belongs to changed bit
                const shouldRemove = (mesh) => {
                    return idsToRemove.includes(mesh.userData.bitId);
                };

                // Filter and remove bitPathMeshes
                for (let i = this.bitPathMeshes.length - 1; i >= 0; i--) {
                    const mesh = this.bitPathMeshes[i];
                    if (shouldRemove(mesh)) {
                         if (this.materialManager) this.materialManager.removeEdgeVisualization(mesh);
                        this.scene.remove(mesh);
                        mesh.geometry.dispose();
                        mesh.material.dispose();
                        this.bitPathMeshes.splice(i, 1);
                    }
                }

                // Filter and remove bitExtrudeMeshes
                for (let i = this.bitExtrudeMeshes.length - 1; i >= 0; i--) {
                    const mesh = this.bitExtrudeMeshes[i];
                    if (shouldRemove(mesh)) {
                         if (this.materialManager) this.materialManager.removeEdgeVisualization(mesh);
                        this.scene.remove(mesh);
                        mesh.geometry.dispose();
                        mesh.material.dispose();
                        this.bitExtrudeMeshes.splice(i, 1);
                    }
                }
                
                // Ensure panelMesh exists (it should)
                if (!this.panelMesh) {
                    // Fallback to full update if panel missing
                    this.log.warn("Panel mesh missing during partial update, forcing full update");
                    return this.updatePanel(width, height, thickness, bits, panelAnchor, null);
                }
            }

            // Create panel geometry ONLY if full update
            if (!changedBitIds) {
                const partFront = document.getElementById("part-front");
                const partFrontBBox = this.getSafePartFrontBBox(
                    partFront,
                    width,
                    height,
                    thickness,
                );
                let geometry;

                // Check if shape was manually edited (has data attribute or flag)
                // For now, always try to get bbox to ensure 3D matches actual shape
                width = partFrontBBox.width || width;
                height = partFrontBBox.height || height;
                this.log.debug("Effective panel dimensions for 3D:", {
                    width,
                    height,
                    partFrontBBox,
                });

                this.log.info("Creating panel geometry:", {
                    partFrontFound: !!partFront,
                    svgLoaderAvailable: typeof SVGLoader !== "undefined",
                    partFrontTagName: partFront?.tagName,
                    width,
                    height,
                    usingFallbackBBox: !this.isBBoxValid(partFrontBBox),
                });

                if (partFront && typeof SVGLoader !== "undefined") {
                    try {
                        // Get SVG data
                        const svgData = new XMLSerializer().serializeToString(
                            partFront,
                        );
                        this.log.debug(
                            "SVG data (first 200 chars):",
                            svgData.substring(0, 200),
                        );

                        const loader = new SVGLoader();
                        const svgDoc = loader.parse(svgData);

                        this.log.debug("SVGLoader result:", {
                            hasDoc: !!svgDoc,
                            hasPaths: !!svgDoc?.paths,
                            pathsCount: svgDoc?.paths?.length,
                            arcDivisionCoefficient: this.arcDivisionCoefficient,
                        });

                        if (svgDoc && svgDoc.paths && svgDoc.paths.length > 0) {
                            // Get first path (partFront shape)
                            const path = svgDoc.paths[0];

                            if (path.toShapes) {
                                const shapes = path.toShapes(true);

                                if (shapes && shapes.length > 0) {
                                    // Get partFront bbox to center and scale
                                    const centerX =
                                        partFrontBBox.x + partFrontBBox.width / 2;
                                    const centerY =
                                        partFrontBBox.y + partFrontBBox.height / 2;

                                    // Use real dimensions from bbox (source of truth)
                                    const realWidth = partFrontBBox.width;
                                    const realHeight = partFrontBBox.height;

                                    // Use first shape
                                    const shape = shapes[0];

                                    // Calculate curveSegments based on total arc length
                                    let totalArcLength = 0;
                                    if (shape.curves) {
                                        shape.curves.forEach((curve) => {
                                            if (
                                                curve.type === "EllipseCurve" ||
                                                curve.isEllipseCurve
                                            ) {
                                                totalArcLength += curve.getLength();
                                            }
                                        });
                                    }

                                    // curveSegments controls divisions for all curves in ExtrudeGeometry
                                    const curveSegments =
                                        totalArcLength > 0
                                            ? Math.max(
                                                12,
                                                Math.ceil(
                                                    totalArcLength /
                                                    this
                                                        .arcDivisionCoefficient,
                                                ),
                                            )
                                            : 12;

                                    this.log.info("Panel arc approximation:", {
                                        totalArcLength,
                                        coefficient: this.arcDivisionCoefficient,
                                        curveSegments,
                                    });

                                    // Extrude shape to create 3D panel
                                    const extrudeSettings = {
                                        depth: thickness,
                                        bevelEnabled: false,
                                        curveSegments: curveSegments, // This controls arc smoothness
                                    };
                                    geometry = new THREE.ExtrudeGeometry(
                                        shape,
                                        extrudeSettings,
                                    );

                                    // Transform to correct position and orientation
                                    // SVGLoader creates shape in XY plane with Y down
                                    // We need: X=width (left-right), Y=height (up-down), Z=thickness (depth)

                                    // 1. Translate to origin (center)
                                    geometry.translate(-centerX, -centerY, 0);

                                    // 2. Rotate 180° around X to flip Y (SVG Y down -> Three.js Y up)
                                    geometry.rotateX(Math.PI);

                                    // 3. Center vertically at Y = realHeight/2 (using bbox height, not parameter)
                                    geometry.translate(0, realHeight / 2, 0);

                                    this.log.info(
                                        "Created panel from SVGLoader with",
                                        shapes.length,
                                        "shape(s), real dimensions:",
                                        realWidth,
                                        "x",
                                        realHeight,
                                    );
                                } else {
                                    this.log.warn(
                                        "No shapes from SVGLoader, using box geometry",
                                    );
                                    geometry = new THREE.BoxGeometry(
                                        width,
                                        height,
                                        thickness,
                                    );
                                }
                            } else {
                                this.log.warn(
                                    "Path has no toShapes method, using box geometry",
                                );
                                geometry = new THREE.BoxGeometry(
                                    width,
                                    height,
                                    thickness,
                                );
                            }
                        } else {
                            this.log.warn(
                                "No paths from SVGLoader, using box geometry",
                            );
                            geometry = new THREE.BoxGeometry(
                                width,
                                height,
                                thickness,
                            );
                        }
                    } catch (error) {
                        this.log.error("Error using SVGLoader:", error);
                        geometry = new THREE.BoxGeometry(width, height, thickness);
                    }
                } else {
                    if (!partFront) {
                        this.log.warn(
                            "partFront element not found, using box geometry",
                        );
                    } else {
                        this.log.warn(
                            "SVGLoader not available, using box geometry",
                        );
                    }
                    geometry = new THREE.BoxGeometry(width, height, thickness);
                }

                const material = this.materialManager.createMaterial(
                    this.materialManager.getCurrentMaterialKey(),
                );
                this.panelMesh = new THREE.Mesh(geometry, material);
                this.panelMesh.castShadow = true;
                this.panelMesh.receiveShadow = true;
                this.panelMesh.position.set(0, 0, thickness / 2);
                this.panelMesh.name = "Panel";
                this.panelMesh.userData.selectionType = "panel";
                this.basePanelMesh = this.panelMesh;

                // Initialize material manager with mesh references
                this.materialManager.initialize(
                    this.panelMesh,
                    this.partMesh,
                    this.scene,
                    this.bitExtrudeMeshes,
                    this.sceneManager.renderer,
                );

                // Save original panel data on first creation (before any CSG)
                this.originalPanelGeometry = this.panelMesh.geometry.clone();
                this.originalPanelMaterial = this.panelMesh.material.clone();
                this.originalPanelPosition = this.panelMesh.position.clone();
                this.originalPanelRotation = this.panelMesh.rotation.clone();
                this.originalPanelScale = this.panelMesh.scale.clone();
                this.panelBBox = this.computeWorldBBox(
                    this.originalPanelGeometry,
                    this.originalPanelPosition,
                    this.originalPanelRotation,
                    this.originalPanelScale,
                );

                // Initialize CSG engine with panel data and utilities
                this.csgEngine.initialize({
                    scene: this.scene,
                    panelMesh: this.panelMesh,
                    bitExtrudeMeshes: this.bitExtrudeMeshes,
                    bitPathMeshes: this.bitPathMeshes,
                    originalPanelGeometry: this.originalPanelGeometry,
                    originalPanelPosition: this.originalPanelPosition,
                    originalPanelRotation: this.originalPanelRotation,
                    originalPanelScale: this.originalPanelScale,
                    materialManager: this.materialManager,
                    computeWorldBBox: this.computeWorldBBox.bind(this),
                });

                this.log.debug("Original panel data saved at creation");
                
                this.scene.add(this.panelMesh);
            }

            // Create bit path extrusions (Full or Partial)
            if (bits && bits.length > 0) {
                await this.createBitPathExtrusions(
                    bits,
                    width,
                    height,
                    thickness,
                    panelAnchor,
                    changedBitIds // PASS FILTER
                );
            }

            // Adjust camera to fit panel (Only on full update or if needed)
            if (!changedBitIds) {
                this.sceneManager.fitCameraToPanel(width, height, thickness);
            }

            // Add meshes to scene (will apply CSG later if needed)
            // If partial, only add new meshes (createBitPathExtrusions adds them to arrays and scene if visual=true?)
            // createBitPathExtrusions pushes to bitExtrudeMeshes/bitPathMeshes. 
            // BUT it does NOT add to scene inside the function? 
            // Wait, looking at original code...
            // createBitPathExtrusions does NOT add to scene. It just pushes to arrays.
            // Original code:
            // this.scene.add(this.panelMesh);
            // this.bitPathMeshes.forEach(mesh => this.scene.add(mesh));
            
            // So I need to ensure new meshes are added to scene.
            // Since I removed OLD meshes from scene for partial update, I need to add NEW ones.
            // Or simpler: iterate all meshes and ensure they are in scene?
            
            this.log.info("Adding panel mesh and bit meshes to scene", {
                bitPathLinesCount: this.bitPathMeshes.length,
                bitExtrudeMeshesCount: this.bitExtrudeMeshes.length,
                bitsVisible: window.bitsVisible,
                showPart: window.showPart,
            });

            // Only add bit meshes if they should be visible
            if (window.bitsVisible !== false) {
                this.bitPathMeshes.forEach((mesh) => {
                    if (!mesh.parent) { // Check if already added
                        this.scene.add(mesh);
                    }
                    mesh.visible = !window.showPart;
                });
                this.bitExtrudeMeshes.forEach((mesh) => {
                    if (!mesh.parent) {
                        this.scene.add(mesh);
                    }
                    mesh.visible = !window.showPart;
                });
            } else {
                this.bitPathMeshes.forEach((mesh) => {
                    mesh.visible = false;
                });
                this.bitExtrudeMeshes.forEach((mesh) => {
                    mesh.visible = false;
                });
            }

            if (this.materialManager) {
                this.materialManager.rebuildEdgesForAll();
            }

            this.refreshSelectionTargets();

            // Mark existing CSG mesh as stale (will be recomputed on demand)
            this.lastPanelUpdateSignature = nextSignature;

            // Note: Do NOT call applyCSGOperation here - let the caller handle CSG logic
            // This allows proper control over when CSG is applied vs when panel is just updated
        } catch (error) {
            this.log.error("updatePanel failed", error);
        } finally {
            this.updatePanelRunning = false;
            if (this.updatePanelQueuedArgs) {
                const queued = this.updatePanelQueuedArgs;
                this.updatePanelQueuedArgs = null;
                await this.updatePanel(
                    queued.width,
                    queued.height,
                    queued.thickness,
                    queued.bits,
                    queued.panelAnchor,
                    queued.changedBitIds
                );
            }
        }
    }

    /**
     * Create bit path extrusions along offset contours
     * @param {Array} bits - Array of bit objects
     * @param {number} panelWidth - Panel width
     * @param {number} panelHeight - Panel height
     * @param {number} panelThickness - Panel thickness
     */
    async createBitPathExtrusions(
        bits,
        panelWidth,
        panelHeight,
        panelThickness,
        panelAnchor,
        changedBitIds = null
    ) {
        // Deduplicate incoming bits by their SVG group reference to avoid duplicates
        const seenGroups = new Set();
        const uniqueBits = [];
        for (const b of bits) {
            const key = b && b.group ? b.group : b;
            if (!seenGroups.has(key)) {
                seenGroups.add(key);
                uniqueBits.push(b);
            }
        }

        // Keep for naming during export
        this.lastUniqueBits = uniqueBits;

        // Determine which bits to process
        const bitsToProcess = changedBitIds 
            ? (Array.isArray(changedBitIds) ? changedBitIds : [changedBitIds])
            : null;

        this.log.info("Creating bit path extrusions", {
            bitsCount: bits.length,
            uniqueBitsCount: uniqueBits.length,
            partial: !!bitsToProcess,
            changedBits: bitsToProcess
        });

        // Get offset contours from the main canvas
        const offsetContours = window.offsetContours || [];

        // Get partFront element to understand its position
        const partFront = document.getElementById("part-front");
        if (!partFront) {
            this.log.warn("partFront element not found, using fallback bbox");
        }

        // Get partFront bounding box (works for any SVG shape, including path)
        const partFrontBBox = this.getSafePartFrontBBox(
            partFront,
            panelWidth,
            panelHeight,
            panelThickness,
        );
        const partFrontX = partFrontBBox.x;
        const partFrontY = partFrontBBox.y;
        const partFrontWidth = partFrontBBox.width;
        const partFrontHeight = partFrontBBox.height;

        this.log.debug("partFront info:", {
            x: partFrontX,
            y: partFrontY,
            width: partFrontWidth,
            height: partFrontHeight,
            usingFallbackBBox: !this.isBBoxValid(partFrontBBox),
        });

        for (const [bitIndex, bit] of uniqueBits.entries()) {
            // Skip if partial update and this bit is not in the changed list
            if (bitsToProcess && !bitsToProcess.includes(bit.bitData?.id)) {
                this.log.debug(`Skipping bit ${bitIndex} (ID: ${bit.bitData?.id}) - not in changed list`);
                continue;
            }

            this.log.info(`Processing bit ${bitIndex}:`, {
                x: bit.x,
                y: bit.y,
                operation: bit.operation,
                name: bit.name,
                bitData: bit.bitData,
                bitId: bit.bitData?.id
            });

            const isVC = (bit.operation || "").toUpperCase() === "VC";

            this.log.info(`Bit ${bitIndex} operation check:`, {
                operation: bit.operation,
                upperCase: (bit.operation || "").toUpperCase(),
                isVC: isVC,
            });

            // For VC operation with multiple passes, process each pass
            if (isVC) {
                this.log.info(`VC bit ${bitIndex}: Starting VC processing`);

                // Calculate depths and contour offsets arrays (same as in 2D)
                const angle = bit.bitData.angle || 90;
                const bitY = bit.y; // Use bit's Y coordinate
                const hypotenuse = bit.bitData.diameter || 10;
                const bitHeight =
                    (hypotenuse / 2) *
                    (1 / Math.tan((angle * Math.PI) / 180 / 2));
                const passes =
                    bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

                this.log.info(
                    `VC bit ${bitIndex}: calculated ${passes} passes`,
                    {
                        angle,
                        bitY,
                        hypotenuse,
                        bitHeight,
                    },
                );

                // Calculate partial results (depth values for each pass)
                const partialResults = [];
                for (let i = 0; i < passes; i++) {
                    partialResults.push((bitY * (i + 1)) / passes);
                }

                // Create depths array (reversed)
                const depths = [...partialResults].reverse();

                // Create contour offsets array
                const contourOffsets = [];
                for (let i = 0; i < passes; i++) {
                    if (i === 0) {
                        contourOffsets.push(0); // Main bit: no offset
                    } else {
                        const depthDiff = depths[0] - depths[i];
                        const offset =
                            depthDiff * Math.tan((angle * Math.PI) / 180 / 2);
                        contourOffsets.push(offset); // Negative for outward offset (offsetCalculator logic)
                    }
                }

                this.log.debug(
                    `VC bit ${bitIndex}: ${passes} passes, depths:`,
                    depths,
                    "offsets:",
                    contourOffsets,
                );

                // Get partFront points for offset calculation
                const partFront = document.getElementById("part-front");
                if (!partFront) {
                    this.log.error(
                        "partFront element not found for offset calculation!",
                    );
                    continue;
                }

                // Get exportModule from dependencyContainer for SVG parsing
                const dependencyContainer =
                    window.dependencyContainer || window.app?.container;

                if (!dependencyContainer) {
                    this.log.error("DependencyContainer not found in window!");
                    continue;
                }

                const exportModule = dependencyContainer.get("export");

                if (!exportModule) {
                    this.log.error("ExportModule not found in container!");
                    continue;
                }

                // Use universal SVG parser to get partFront points
                const partFrontPoints =
                    this.extrusionBuilder.parseSVGElementToPoints(
                        partFront,
                        exportModule,
                    );
                if (!partFrontPoints || partFrontPoints.length === 0) {
                    this.log.error("Failed to get partFront points");
                    continue;
                }

                // Find all contours for this bit
                const bitContours = offsetContours.filter(
                    (c) => c.bitIndex === bitIndex,
                );

                this.log.info(
                    `VC bit ${bitIndex}: found ${bitContours.length} contours`,
                    {
                        bitContours: bitContours.map((c) => ({
                            passIndex: c.passIndex,
                            hasPathData: !!c.pathData,
                        })),
                    },
                );

                if (bitContours.length === 0) {
                    this.log.warn(`No contours found for VC bit ${bitIndex}`);
                    continue;
                }

                // Get the topAnchorCoords for calculating offset distances
                const convertToTopAnchorCoordinates =
                    window.convertToTopAnchorCoordinates;
                if (!convertToTopAnchorCoordinates) {
                    this.log.error("convertToTopAnchorCoordinates not found!");
                    continue;
                }
                const topAnchorCoords = convertToTopAnchorCoordinates(bit);

                // Process each pass
                this.log.info(
                    `VC bit ${bitIndex}: Starting pass loop for ${passes} passes`,
                );

                for (let passIndex = 0; passIndex < passes; passIndex++) {
                    const isMainBit = passIndex === 0;
                    const depth = depths[passIndex];
                    const contourOffset = contourOffsets[passIndex];

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: Starting (depth=${depth}, offset=${contourOffset})`,
                    );

                    // Get extension info for this specific pass
                    // For main bit (passIndex=0): use bit.bitData.extension
                    // For phantom bits (passIndex>0): find phantom from 2D by bitIndex + passIndex
                    let passExtensionInfo = null;
                    if (isMainBit) {
                        // Use structured bitData.extension
                        passExtensionInfo = bit.bitData?.extension;
                        if (!passExtensionInfo) {
                            // Fallback to old format
                            passExtensionInfo = bit.extension;
                        }
                        // Main bit extension found
                    } else {
                        // Phantom bit (passIndex > 0): read extension from main bit's phantoms array
                        if (bit.bitData && bit.bitData.phantoms) {
                            const phantom = bit.bitData.phantoms[passIndex - 1]; // passIndex 1 -> array index 0
                            if (phantom && phantom.passIndex === passIndex) {
                                passExtensionInfo = phantom.extension;
                                if (passExtensionInfo) {
                                    this.log.debug(
                                        `Found phantom extension for bit ${bitIndex} pass ${passIndex}:`,
                                        passExtensionInfo,
                                    );
                                }
                            }
                        }

                        if (!passExtensionInfo) {
                            this.log.debug(
                                `No phantom extension found for bit ${bitIndex} pass ${passIndex}`,
                            );
                        }
                    }

                    this.log.debug(
                        `Pass ${passIndex} extension info:`,
                        passExtensionInfo ? "found" : "not found",
                        passExtensionInfo,
                    );

                    // Find pre-computed contour for this pass
                    const passContour = bitContours.find((c) => {
                        if (typeof c.passIndex === "number") {
                            return c.passIndex === passIndex;
                        }
                        if (typeof c.pass === "number") {
                            return c.pass === passIndex;
                        }
                        return passIndex === 0;
                    });

                    const contourPathData =
                        passContour?.pathData ||
                        (typeof passContour?.element?.getAttribute ===
                            "function"
                            ? passContour.element.getAttribute("d")
                            : null);

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: passContour found=${!!passContour}, hasPathData=${!!contourPathData}`,
                    );

                    if (!passContour || !contourPathData) {
                        this.log.warn(
                            `No contour data for VC bit ${bitIndex} pass ${passIndex}`,
                        );
                        continue;
                    }

                    // Get path data from pre-computed contour
                    const pathData = contourPathData;

                    // Parse path to get curves
                    const pathCurves =
                        this.extrusionBuilder.parsePathToCurves(pathData);

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: parsed ${pathCurves.length} curves`,
                    );

                    if (pathCurves.length === 0) {
                        this.log.warn(
                            `No curves found for VC bit ${bitIndex} pass ${passIndex}`,
                        );
                        continue;
                    }

                    // Create 3D curve from path curves with depth
                    const curve3D = this.extrusionBuilder.createCurveFromCurves(
                        pathCurves,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                    );

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: created 3D curve with ${curve3D.curves?.length || 0
                        } segments`,
                    );

                    // Create bit profile shape
                    const bitProfile =
                        await this.extrusionBuilder.createBitProfile(
                            bit.bitData,
                        );

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: profile created=${!!bitProfile}, curves=${bitProfile?.curves?.length || 0
                        }`,
                    );

                    if (!bitProfile) {
                        this.log.warn(
                            `No bit profile created for VC bit ${bitIndex} pass ${passIndex}`,
                        );
                        continue;
                    }

                    // VC uses MITER extrusion (sharp corners), not round
                    this.log.info(
                        `Extruding VC bit ${bitIndex} pass ${passIndex} with MITER mode`,
                        {
                            profileType: typeof bitProfile,
                            profileIsShape: bitProfile instanceof THREE.Shape,
                            curveType: typeof curve3D,
                            curveLength: curve3D?.getLength?.() || 0,
                            curvesCount: curve3D?.curves?.length || 0,
                        },
                    );

                    // Create bit using unified constructor
                    // extrudeAlongPath returns: [pathLine (if enabled), ...meshes]
                    const pathColor = isMainBit ? bit.color : "gray";
                    const bitResult = this.extrusionBuilder.extrudeAlongPath(
                        bitProfile,
                        curve3D,
                        pathColor,
                        0, // zOffset = 0 for main bit
                        "miter", // Sharp corners
                                "top", // Always use top panel side - bottom removed
                        { pathVisual: true }, // Enable path visualization
                    );

                    // Separate path line from meshes
                    let bitMeshes = [];
                    if (bitResult?.length > 0) {
                        const firstItem = bitResult[0];
                        if (
                            firstItem instanceof THREE.Line ||
                            firstItem.type === "Line"
                        ) {
                            const pathLine = firstItem;
                            bitMeshes = bitResult.slice(1);
                            pathLine.userData.bitIndex = bitIndex;
                            pathLine.userData.bitId = bit.bitData?.id;
                            pathLine.userData.pass = passIndex;
                            this.bitPathMeshes.push(pathLine);
                        } else {
                            bitMeshes = bitResult;
                        }
                    }

                    // Store base color so MaterialManager preserves it
                    bitMeshes.forEach(mesh => {
                        if (mesh.isMesh) {
                            mesh.userData.baseColor = pathColor;
                        }
                    });

                    // Create extension if needed
                    let extensionMeshes = [];
                    if (
                        passExtensionInfo &&
                        passExtensionInfo.width &&
                        passExtensionInfo.height
                    ) {
                        const extensionProfile =
                            this.extrusionBuilder.createExtensionProfile(
                                passExtensionInfo.width,
                                passExtensionInfo.height,
                            );

                        // Use depth variable from outer scope (already defined for this pass)
                        const bitDepth = depth || 0;

                        const extensionResult =
                            this.extrusionBuilder.extrudeAlongPath(
                                extensionProfile,
                                curve3D,
                                "#FF0000", // Red color for extensions
                                bitDepth + 1, // zOffset = bit depth (shifts extension above bit)
                                "miter",
                                "top", // Always use top panel side - bottom removed
                                { pathVisual: false, isExtension: true }, // Disable path visualization for extensions
                            );

                        // Separate path line from meshes (though pathVisual is false)
                        if (extensionResult?.length > 0) {
                            const firstItem = extensionResult[0];
                            if (
                                firstItem instanceof THREE.Line ||
                                firstItem.type === "Line"
                            ) {
                                extensionMeshes = extensionResult.slice(1);
                            } else {
                                extensionMeshes = extensionResult;
                            }
                        }

                        // Style extension meshes
                        extensionMeshes.forEach((mesh) => {
                            mesh.userData.isExtension = true;
                            mesh.material = mesh.material.clone();
                            mesh.material.transparent = true;
                            mesh.material.opacity = 0.4;
                            const color = passExtensionInfo.hasShankCollision
                                ? "#8B0000"
                                : "#FF0000";
                            mesh.material.color.set(color);

                            // Store appearance data for MaterialManager
                            mesh.userData.baseColor = color;
                            mesh.userData.opacity = 0.4;
                            mesh.userData.transparent = true;
                        });
                    }

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex} extrusion result:`,
                        {
                            bitMeshes: bitMeshes.length,
                            extensionMeshes: extensionMeshes.length,
                        },
                    );

                    // Add bit meshes
                    if (bitMeshes && bitMeshes.length > 0) {
                        bitMeshes.forEach((mesh) => {
                            mesh.userData.operation =
                                bit.operation || "subtract";
                            mesh.userData.bitIndex = bitIndex;
                            mesh.userData.bitId = bit.bitData?.id;
                            mesh.userData.pass = passIndex;
                            mesh.userData.isPhantom = !isMainBit;

                            // Make phantom bits semi-transparent
                            if (!isMainBit) {
                                mesh.material.transparent = true;
                                mesh.material.opacity = 0.3;

                                // Store appearance data for MaterialManager
                                mesh.userData.opacity = 0.3;
                                mesh.userData.transparent = true;
                            }

                            // baseColor was already linked to loop above, but let's be sure
                            // bitMeshes created from extrudeAlongPath use pathColor (line 1349 which is bit.color or gray)
                            // We set mesh.userData.baseColor in previous edit!

                            this.bitExtrudeMeshes.push(mesh);

                            // Add edge visualization
                            if (
                                this.materialManager &&
                                this.materialManager.isEdgesEnabled()
                            ) {
                                this.materialManager.addEdgeVisualization(mesh);
                            }
                        });

                        this.log.debug(
                            `Added VC pass ${passIndex}: ${bitMeshes.length} mesh parts for bit ${bitIndex}`,
                        );
                    }

                    // Add extension meshes
                    if (extensionMeshes && extensionMeshes.length > 0) {
                        extensionMeshes.forEach((mesh) => {
                            mesh.userData.operation = "extension";
                            mesh.userData.bitIndex = bitIndex;
                            mesh.userData.bitId = bit.bitData?.id;
                            mesh.userData.pass = passIndex;
                            this.bitExtrudeMeshes.push(mesh);

                            // Add edge visualization
                            if (
                                this.materialManager &&
                                this.materialManager.isEdgesEnabled()
                            ) {
                                this.materialManager.addEdgeVisualization(mesh);
                            }
                        });

                        this.log.debug(
                            `Added VC pass ${passIndex} extension: ${extensionMeshes.length} meshes for bit ${bitIndex}`,
                        );
                    }
                }
                continue; // Skip normal processing for VC bits
            }

            // PO (Pocketing) operation: render main bit and phantom bit
            const isPO = (bit.operation || "").toUpperCase() === "PO";
            if (isPO) {
                this.log.info(`PO bit ${bitIndex}: Starting PO processing`);

                const diameter = bit.bitData?.diameter || 10;
                const pocketOffset = bit.pocketOffset || 0;
                const pocketWidth = diameter + pocketOffset;

                // Render PO operation in 3D
                {
                    // Find both contours (main bit left edge, phantom bit right edge)
                    const mainContour = offsetContours.find(
                        (c) => c.bitIndex === bitIndex && c.isPOMain === true,
                    );
                    const phantomContour = offsetContours.find(
                        (c) =>
                            c.bitIndex === bitIndex && c.isPOPhantom === true,
                    );

                    // Main contour is required, phantom is optional (only if pocketOffset > 0)
                    if (mainContour) {
                        const mainPathData =
                            mainContour.pathData ||
                            mainContour.element?.getAttribute("d");

                        if (mainPathData) {
                            // Create bit profile
                            const bitProfile =
                                await this.extrusionBuilder.createBitProfile(
                                    bit.bitData,
                                );

                            if (bitProfile) {
                                // Transformation options for coordinate conversion
                                const transformOptions = {
                                    partFrontX,
                                    partFrontY,
                                    partFrontWidth,
                                    partFrontHeight,
                                    depth: bit.y,
                                    panelThickness,
                                    panelAnchor,
                                };

                                // Extrude main bit using SVG path with modifier
                                // extrudeAlongPath returns: [pathLine (if enabled), ...meshes]
                                const mainResult =
                                    this.extrusionBuilder.extrudeAlongPath(
                                        bitProfile,
                                        mainPathData, // SVG path string
                                        bit.color || "#cccccc",
                                        0,
                                        "round",
                                        this.panelSide,
                                        transformOptions,
                                        {
                                            offset: diameter / 2,
                                            cornerStyle: "miter",
                                        },
                                    );

                                // Separate path line from meshes
                                let mainPathLine = null;
                                let mainMeshes = [];
                                if (mainResult?.length > 0) {
                                    const firstItem = mainResult[0];
                                    if (
                                        firstItem instanceof THREE.Line ||
                                        firstItem.type === "Line"
                                    ) {
                                        mainPathLine = firstItem;
                                        mainMeshes = mainResult.slice(1);
                                    } else {
                                        mainMeshes = mainResult;
                                    }
                                }

                                // Add path visualization if available
                                if (mainPathLine) {
                                    mainPathLine.userData.bitIndex = bitIndex;
                                    mainPathLine.userData.bitId = bit.bitData?.id;
                                    mainPathLine.userData.isPOMain = true;
                                    this.bitPathMeshes.push(mainPathLine);
                                }

                                // Add main bit meshes
                                if (mainMeshes?.length > 0) {
                                    mainMeshes.forEach((mesh) => {
                                        mesh.userData.operation =
                                            bit.operation || "subtract";
                                        mesh.userData.bitIndex = bitIndex;
                                        mesh.userData.bitId = bit.bitData?.id;
                                        mesh.userData.isPOMain = true;
                                        this.bitExtrudeMeshes.push(mesh);

                                        if (
                                            this.materialManager?.isEdgesEnabled()
                                        ) {
                                            this.materialManager.addEdgeVisualization(
                                                mesh,
                                            );
                                        }
                                    });
                                    this.log.debug(
                                        `Added PO main bit: ${mainMeshes.length} meshes`,
                                    );
                                }

                                // Get phantom path data for later use (filler creation)
                                let phantomPathData = null;

                                // Extrude phantom bit only if pocketOffset > 0
                                if (pocketOffset > 0 && phantomContour) {
                                    phantomPathData =
                                        phantomContour.pathData ||
                                        phantomContour.element?.getAttribute(
                                            "d",
                                        );

                                    if (phantomPathData) {
                                        const phantomResult =
                                            this.extrusionBuilder.extrudeAlongPath(
                                                bitProfile,
                                                phantomPathData, // SVG path string
                                                "rgba(255, 165, 0, 0.3)",
                                                0,
                                                "miter",
                                                this.panelSide,
                                                transformOptions,
                                                {
                                                    offset: -diameter / 2,
                                                    cornerStyle: "miter",
                                                },
                                            );

                                        // Separate path line from meshes
                                        let phantomPathLine = null;
                                        let phantomMeshes = [];
                                        if (phantomResult?.length > 0) {
                                            const firstItem = phantomResult[0];
                                            if (
                                                firstItem instanceof
                                                THREE.Line ||
                                                firstItem.type === "Line"
                                            ) {
                                                phantomPathLine = firstItem;
                                                phantomMeshes =
                                                    phantomResult.slice(1);
                                            } else {
                                                phantomMeshes = phantomResult;
                                            }
                                        }

                                        // Add path visualization if available
                                        if (phantomPathLine) {
                                            phantomPathLine.userData.bitIndex =
                                                bitIndex;
                                            phantomPathLine.userData.bitId = bit.bitData?.id;
                                            phantomPathLine.userData.isPOPhantom = true;
                                            phantomPathLine.material.transparent = true;
                                            phantomPathLine.material.opacity = 0.5;
                                            this.bitPathMeshes.push(
                                                phantomPathLine,
                                            );
                                        }

                                        // Add phantom bit meshes (semi-transparent)
                                        if (phantomMeshes?.length > 0) {
                                            phantomMeshes.forEach((mesh) => {
                                                mesh.userData.operation =
                                                    bit.operation || "subtract";
                                                mesh.userData.bitIndex =
                                                    bitIndex;
                                                mesh.userData.bitId = bit.bitData?.id;
                                                mesh.userData.isPOPhantom = true;
                                                mesh.material.transparent = true;
                                                mesh.material.opacity = 0.3;
                                                this.bitExtrudeMeshes.push(
                                                    mesh,
                                                );

                                                if (
                                                    this.materialManager?.isEdgesEnabled()
                                                ) {
                                                    this.materialManager.addEdgeVisualization(
                                                        mesh,
                                                    );
                                                }
                                            });
                                            this.log.debug(
                                                `Added PO phantom bit: ${phantomMeshes.length} meshes`,
                                            );
                                        }
                                    }
                                } else if (pocketOffset === 0) {
                                    this.log.debug(
                                        `PO bit ${bitIndex}: Skipped phantom (pocketOffset = 0)`,
                                    );
                                }

                                this.log.info(
                                    `PO bit ${bitIndex}: Successfully rendered ${pocketOffset > 0
                                        ? "main and phantom bits"
                                        : "main bit only"
                                    }`,
                                );

                                // Create pocket filler if pocketWidth > diameter * 2
                                const bitLength =
                                    bit.bitData?.length ||
                                    bit.bitData?.totalLength ||
                                    20;

                                // Check if full removal mode (pocketOffset = 0 or isFullRemoval flag)
                                const isFullRemoval =
                                    bit.isFullRemoval || pocketOffset === 0;

                                // Get extension info for filler calculation and extensions
                                const bitDepth = bit.y || 0;
                                const bitWidth = bit.bitData?.diameter || 10;
                                const extensionInfo = 
                                    bit.bitData?.extension ||
                                    bit.extension ||
                                    (bit.group && bit.group.__extension);
                                const extensionHeight = (extensionInfo && extensionInfo.height > 0) ? extensionInfo.height : 0;
                                const totalHeight = bitLength + extensionHeight;

                                if (
                                    pocketWidth > diameter * 2 - 1 &&
                                    (phantomPathData || isFullRemoval)
                                ) {
                                    const fillerMeshes =
                                        await this.createPOPocketFiller(
                                            bit,
                                            bitIndex,
                                            mainPathData,
                                            isFullRemoval
                                                ? null
                                                : phantomPathData, // No hole for full removal
                                            diameter,
                                            totalHeight, // Use total height (bit + extension)
                                            transformOptions,
                                        );

                                    if (fillerMeshes?.length > 0) {
                                        fillerMeshes.forEach((mesh) => {
                                            mesh.userData.operation =
                                                "subtract"; // Force subtract for CSG
                                            mesh.userData.bitIndex = bitIndex;
                                            mesh.userData.bitId = bit.bitData?.id;
                                            mesh.userData.isPOFiller = true;
                                            mesh.userData.isFullRemoval =
                                                isFullRemoval;
                                            this.bitExtrudeMeshes.push(mesh);

                                            if (
                                                this.materialManager?.isEdgesEnabled()
                                            ) {
                                                this.materialManager.addEdgeVisualization(
                                                    mesh,
                                                );
                                            }
                                        });
                                    } else {
                                        this.log.warn(
                                            `PO bit ${bitIndex}: Filler creation returned empty array`,
                                        );
                                    }
                                } else if (pocketWidth > diameter * 2) {
                                    this.log.warn(
                                        `PO bit ${bitIndex}: Cannot create filler - phantomPathData is missing (pocketOffset=${pocketOffset})`,
                                    );
                                }

                                // Create extensions for PO operations

                                // Create extension for main PO bit (if bitDepth > 0 and mainPathData exists)
                                if (bitDepth > 0 && mainPathData) {
                                    // Get extension info for main PO bit
                                    const extensionInfo = 
                                        bit.bitData?.extension ||
                                        bit.extension ||
                                        (bit.group && bit.group.__extension);

                                    if (extensionInfo && extensionInfo.height > 0) {
                                        const extensionWidth = extensionInfo.width || bitWidth || 10;
                                        const extensionHeight = extensionInfo.height;

                                        this.log.info(`PO bit ${bitIndex}: Creating main bit extension`, {
                                            bitDepth,
                                            extensionWidth,
                                            extensionHeight
                                        });

                                        const mainExtensionResult = this.extrusionBuilder.extrudeAlongPath(
                                            this.extrusionBuilder.createExtensionProfile(extensionWidth, extensionHeight),
                                            mainPathData, // Same path as main bit
                                            "#FF0000", // Red color for main bit extension
                                            bitDepth + 1, // zOffset = bit depth (shifts extension above bit)
                                            "round",
                                            this.panelSide,
                                            { ...transformOptions, pathVisual: false, isExtension: true },
                                            { offset: diameter/2, cornerStyle: "miter" }, // No offset for extensions
                                        );

                                        let mainExtensionMeshes = [];
                                        if (mainExtensionResult?.length > 0) {
                                            const firstItem = mainExtensionResult[0];
                                            if (firstItem instanceof THREE.Line || firstItem.type === "Line") {
                                                mainExtensionMeshes = mainExtensionResult.slice(1);
                                            } else {
                                                mainExtensionMeshes = mainExtensionResult;
                                            }
                                        }

                                        // Add main PO bit extension meshes
                                        if (mainExtensionMeshes?.length > 0) {
                                            mainExtensionMeshes.forEach((mesh) => {
                                                mesh.userData.operation = "extension";
                                                mesh.userData.bitIndex = bitIndex;
                                                mesh.userData.bitId = bit.bitData?.id;
                                                mesh.userData.isPOExtension = true;
                                                mesh.userData.isPOMain = true;
                                                this.bitExtrudeMeshes.push(mesh);

                                                if (this.materialManager?.isEdgesEnabled()) {
                                                    this.materialManager.addEdgeVisualization(mesh);
                                                }
                                            });
                                            this.log.info(`PO bit ${bitIndex}: Added main bit extension: ${mainExtensionMeshes.length} meshes`);
                                        }
                                    }
                                }

                                // Create extension for phantom PO bit (if pocketOffset > 0, bitDepth > 0, and phantomPathData exists)
                                if (pocketOffset > 0 && bitDepth > 0 && phantomPathData) {
                                    // Get extension info from main bit (same extension applies to phantom)
                                    const extensionInfo = 
                                        bit.bitData?.extension ||
                                        bit.extension ||
                                        (bit.group && bit.group.__extension);

                                    if (extensionInfo && extensionInfo.height > 0) {
                                        const extensionWidth = extensionInfo.width || bitWidth || 10;
                                        const extensionHeight = extensionInfo.height;

                                        this.log.info(`PO bit ${bitIndex}: Creating phantom bit extension`, {
                                            pocketOffset,
                                            bitDepth,
                                            extensionWidth,
                                            extensionHeight
                                        });

                                        const phantomExtensionResult = this.extrusionBuilder.extrudeAlongPath(
                                            this.extrusionBuilder.createExtensionProfile(extensionWidth, extensionHeight),
                                            phantomPathData, // Same path as phantom bit
                                            "#FFA500", // Orange color for phantom bit extension
                                            bitDepth + 1, // zOffset = bit depth (shifts extension above bit)
                                            "miter",
                                            this.panelSide,
                                            { ...transformOptions, pathVisual: false, isExtension: true },
                                            { offset: -diameter/2, cornerStyle: "miter" }, // No offset for extensions
                                        );

                                        let phantomExtensionMeshes = [];
                                        if (phantomExtensionResult?.length > 0) {
                                            const firstItem = phantomExtensionResult[0];
                                            if (firstItem instanceof THREE.Line || firstItem.type === "Line") {
                                                phantomExtensionMeshes = phantomExtensionResult.slice(1);
                                            } else {
                                                phantomExtensionMeshes = phantomExtensionResult;
                                            }
                                        }

                                        // Add phantom PO bit extension meshes (semi-transparent)
                                        if (phantomExtensionMeshes?.length > 0) {
                                            phantomExtensionMeshes.forEach((mesh) => {
                                                mesh.userData.operation = "extension";
                                                mesh.userData.bitIndex = bitIndex;
                                                mesh.userData.bitId = bit.bitData?.id;
                                                mesh.userData.isPOExtension = true;
                                                mesh.userData.isPOPhantom = true;
                                                mesh.material.transparent = true;
                                                mesh.material.opacity = 0.7;
                                                this.bitExtrudeMeshes.push(mesh);

                                                if (this.materialManager?.isEdgesEnabled()) {
                                                    this.materialManager.addEdgeVisualization(mesh);
                                                }
                                            });
                                            this.log.info(`PO bit ${bitIndex}: Added phantom bit extension: ${phantomExtensionMeshes.length} meshes`);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        this.log.warn(
                            `PO bit ${bitIndex}: Missing main contour`,
                        );
                    }
                }

                continue; // Skip normal processing for PO bits
            }

            // Standard operations: AL, OU, IN
            // Find offset contour for this bit
            const bitContours = offsetContours.filter(
                (c) => c.bitIndex === bitIndex,
            );

            if (bitContours.length === 0) {
                this.log.debug(`No contours found for bit ${bitIndex}`);
                continue;
            }

            // For 3D: prefer centered contour (for3D flag) if available (OU/IN operations)
            // Otherwise use the main contour (AL operation)
            let contour = bitContours.find((c) => c.for3D === true);
            if (!contour) {
                // Fallback: use main contour (not base offset)
                contour = bitContours.find((c) => c.pass !== 0);
            }
            if (!contour) {
                // Final fallback: any contour
                contour = bitContours[0];
            }
            if (!contour || !contour.element) {
                this.log.debug(`No valid contour element for bit ${bitIndex}`);
                continue;
            }

            // Get path data from SVG path element
            const pathElement = contour.element;
            const pathData = pathElement.getAttribute("d");

            if (!pathData) {
                this.log.debug(`No path data for bit ${bitIndex}`);
                continue;
            }

            this.log.debug(
                `Path data for bit ${bitIndex}:`,
                pathData.substring(0, 100) + "...",
            );

            // Get bit depth for z offset (needed for path visualization)
            const bitDepth = bit.y || 0;

            // Parse path to curves for visualization
            const pathCurves =
                this.extrusionBuilder.parsePathToCurves(pathData);
            // Path visualization is now handled by extrudeAlongPath with pathVisual=true by default

            // Create bit profile shape
            const bitProfile = await this.extrusionBuilder.createBitProfile(
                bit.bitData,
            );

            if (!bitProfile) {
                this.log.debug(`No bit profile created for bit ${bitIndex}`);
                continue;
            }

            // Use structured bitData.extension or fallback to old format
            const passExtensionInfo =
                bit.bitData?.extension ||
                bit.extension ||
                (bit.group && bit.group.__extension);

            // Transformation options for coordinate conversion
            const transformOptions = {
                partFrontX,
                partFrontY,
                partFrontWidth,
                partFrontHeight,
                depth: bitDepth,
                panelThickness,
                panelAnchor,
            };

            // Create bit using unified constructor
            // extrudeAlongPath returns: [pathLine (if enabled), ...meshes]
            const bitResult = this.extrusionBuilder.extrudeAlongPath(
                bitProfile,
                pathData, // SVG path string (already with approximated arcs)
                bit.color,
                0, // zOffset = 0 for main bit
                "round", // Half-profile with lathe corners
                                "top", // Always use top panel side - bottom removed
                transformOptions,
            );

            // Separate path line from meshes
            let bitMeshes = [];
            if (bitResult?.length > 0) {
                const firstItem = bitResult[0];
                if (
                    firstItem instanceof THREE.Line ||
                    firstItem.type === "Line"
                ) {
                    const pathLine = firstItem;
                    bitMeshes = bitResult.slice(1);
                    pathLine.userData.bitIndex = bitIndex;
                    pathLine.userData.bitId = bit.bitData?.id;
                    this.bitPathMeshes.push(pathLine);
                } else {
                    bitMeshes = bitResult;
                }
            }

            // Create extension if needed
            let extensionMeshes = [];
            if (
                passExtensionInfo &&
                passExtensionInfo.width &&
                passExtensionInfo.height
            ) {
                const extensionProfile =
                    this.extrusionBuilder.createExtensionProfile(
                        passExtensionInfo.width,
                        passExtensionInfo.height,
                    );

                const extensionResult = this.extrusionBuilder.extrudeAlongPath(
                    extensionProfile,
                    pathData,
                    "#FF0000", // Red color for extensions
                    bitDepth + 1, // zOffset = bit depth (shifts extension above bit)
                    "round",
                                    "top", // Always use top panel side - bottom removed
                    { ...transformOptions, pathVisual: false, isExtension: true }, // Disable path visualization for extensions
                );

                // Separate path line from meshes (though pathVisual is false)
                if (extensionResult?.length > 0) {
                    const firstItem = extensionResult[0];
                    if (
                        firstItem instanceof THREE.Line ||
                        firstItem.type === "Line"
                    ) {
                        extensionMeshes = extensionResult.slice(1);
                    } else {
                        extensionMeshes = extensionResult;
                    }
                }

                // Style extension meshes
                extensionMeshes.forEach((mesh) => {
                    mesh.userData.isExtension = true;
                    mesh.material = mesh.material.clone();
                    mesh.material.transparent = true;
                    mesh.material.opacity = 0.4;
                    mesh.material.color.set(
                        passExtensionInfo.hasShankCollision
                            ? "#8B0000"
                            : "#FF0000",
                    );
                });
            }

            // Process bit meshes
            if (bitMeshes && bitMeshes.length > 0) {
                bitMeshes.forEach((mesh) => {
                    mesh.userData.operation = bit.operation || "subtract";
                    mesh.userData.bitIndex = bitIndex;
                    mesh.userData.bitId = bit.bitData?.id;
                    this.bitExtrudeMeshes.push(mesh);
                    this.log.debug(
                        `[SCENE] Added mesh for bit ${bitIndex}: ${mesh.geometry.attributes.position.count} vertices`,
                    );

                    // Add edge visualization to bit extrusions
                    if (
                        this.materialManager &&
                        this.materialManager.isEdgesEnabled()
                    ) {
                        this.materialManager.addEdgeVisualization(mesh);
                    }
                });
                this.log.debug(
                    `Created ${bitMeshes.length} extrude mesh(es) for bit ${bitIndex}`,
                );

                // Process extension meshes (if any)
                if (extensionMeshes && extensionMeshes.length > 0) {
                    extensionMeshes.forEach((mesh) => {
                        mesh.userData.operation = "extension";
                        mesh.userData.bitIndex = bitIndex;
                        mesh.userData.bitId = bit.bitData?.id;
                        this.bitExtrudeMeshes.push(mesh);
                        this.log.debug(
                            `[SCENE] Added extension mesh for bit ${bitIndex}: ${mesh.geometry.attributes.position.count} vertices`,
                        );

                        // Add edge visualization to extensions
                        if (
                            this.materialManager &&
                            this.materialManager.isEdgesEnabled()
                        ) {
                            this.materialManager.addEdgeVisualization(mesh);
                        }
                    });
                    this.log.debug(
                        `Created ${extensionMeshes.length} extension mesh(es) for bit ${bitIndex}`,
                    );
                }
            } else {
                this.log.debug(
                    `Failed to create extrude mesh for bit ${bitIndex}`,
                );
            }
        }
    }

    /**
     * Create pocket filler mesh for PO operations (fills space between main and phantom)
     * @param {object} bit - Bit object
     * @param {number} bitIndex - Bit index
     * @param {string} mainPathData - Main contour SVG path
     * @param {string} phantomPathData - Phantom contour SVG path
     * @param {number} diameter - Bit diameter
     * @param {number} bitLength - Bit length/height
     * @param {object} transformOptions - Coordinate transformation options
     * @returns {Array<THREE.Mesh>} Array of filler meshes
     */
    async createPOPocketFiller(
        bit,
        bitIndex,
        mainPathData,
        phantomPathData,
        diameter,
        bitLength,
        transformOptions,
    ) {
        try {
            // Create temporary paper.js scope
            const tempCanvas = document.createElement("canvas");
            const tempScope = new paper.PaperScope();
            tempScope.setup(tempCanvas);

            // Offset distances: inward for main, outward for phantom
            const offsetDist = diameter / 2;

            // Parse and offset main path (inward)
            const mainPath = new tempScope.Path(mainPathData);
            mainPath.closed = true;
            const mainOffsetResult = PaperOffset.offset(mainPath, -offsetDist, {
                join: "miter",
                cap: "butt",
                limit: 10,
                insert: false,
            });
            const mainOffset = Array.isArray(mainOffsetResult)
                ? mainOffsetResult[0]
                : mainOffsetResult;

            if (!mainOffset) {
                this.log.warn("Failed to create main offset path for filler");
                mainPath.remove();
                tempScope.remove();
                tempCanvas.remove();
                return [];
            }

            // Get SVG path data
            let outerSVG = mainOffset.pathData;
            let innerSVG = null;

            // Parse and offset phantom path only if provided (not in full removal mode)
            let phantomPath = null;
            let phantomOffset = null;

            if (phantomPathData) {
                phantomPath = new tempScope.Path(phantomPathData);
                phantomPath.closed = true;
                const phantomOffsetResult = PaperOffset.offset(
                    phantomPath,
                    offsetDist,
                    {
                        join: "miter",
                        cap: "butt",
                        limit: 10,
                        insert: false,
                    },
                );
                phantomOffset = Array.isArray(phantomOffsetResult)
                    ? phantomOffsetResult[0]
                    : phantomOffsetResult;

                if (!phantomOffset) {
                    this.log.warn(
                        "Failed to create phantom offset path for filler",
                    );
                    mainPath.remove();
                    if (phantomPath) phantomPath.remove();
                    mainOffset.remove();
                    tempScope.remove();
                    tempCanvas.remove();
                    return [];
                }

                innerSVG = phantomOffset.pathData;
            }

            // Apply arc approximation if available
            try {
                const exportModule =
                    window?.dependencyContainer?.get?.("export") ||
                    window?.app?.container?.get?.("export");
                if (exportModule) {
                    const { approximatePath } =
                        await import("../utils/arcApproximation.js");
                    outerSVG =
                        approximatePath(outerSVG, exportModule) || outerSVG;
                    innerSVG =
                        approximatePath(innerSVG, exportModule) || innerSVG;
                }
            } catch (e) {
                this.log.debug("Arc approximation skipped for filler", e);
            }

            // Clean up paper.js objects
            mainPath.remove();
            if (phantomPath) phantomPath.remove();
            mainOffset.remove();
            if (phantomOffset) phantomOffset.remove();
            tempScope.remove();
            tempCanvas.remove();

            // Parse SVG paths to THREE.js curves and transform to 3D
            const {
                partFrontX,
                partFrontY,
                partFrontWidth,
                partFrontHeight,
                depth,
                panelThickness,
                panelAnchor,
            } = transformOptions;

            // Parse outer path to curves
            const outerCurves =
                this.extrusionBuilder.parsePathToCurves(outerSVG);

            // Parse inner path only if provided (not in full removal mode)
            const innerCurves = innerSVG
                ? this.extrusionBuilder.parsePathToCurves(innerSVG)
                : null;

            if (!outerCurves?.length) {
                this.log.warn("Failed to parse outer SVG path for filler");
                return [];
            }

            // Inner curves are optional (null for full removal mode)
            if (innerSVG && !innerCurves?.length) {
                this.log.warn("Failed to parse inner SVG path for filler");
                return [];
            }

            // Convert 2D curves to 3D using proper coordinate transformation
            const outerCurves3D = outerCurves
                .map((curve) => {
                    if (curve instanceof THREE.LineCurve3) {
                        const v1 = this.extrusionBuilder.convertPoint2DTo3D(
                            curve.v1.x,
                            curve.v1.y,
                            partFrontX,
                            partFrontY,
                            partFrontWidth,
                            partFrontHeight,
                            depth,
                            panelThickness,
                            panelAnchor,
                        );
                        const v2 = this.extrusionBuilder.convertPoint2DTo3D(
                            curve.v2.x,
                            curve.v2.y,
                            partFrontX,
                            partFrontY,
                            partFrontWidth,
                            partFrontHeight,
                            depth,
                            panelThickness,
                            panelAnchor,
                        );
                        return new THREE.LineCurve3(v1, v2);
                    }
                    return null;
                })
                .filter((c) => c !== null);

            // Convert inner curves to 3D only if provided (not in full removal mode)
            let innerCurves3D = null;
            if (innerCurves) {
                innerCurves3D = innerCurves
                    .map((curve) => {
                        if (curve instanceof THREE.LineCurve3) {
                            const v1 = this.extrusionBuilder.convertPoint2DTo3D(
                                curve.v1.x,
                                curve.v1.y,
                                partFrontX,
                                partFrontY,
                                partFrontWidth,
                                partFrontHeight,
                                depth,
                                panelThickness,
                                panelAnchor,
                            );
                            const v2 = this.extrusionBuilder.convertPoint2DTo3D(
                                curve.v2.x,
                                curve.v2.y,
                                partFrontX,
                                partFrontY,
                                partFrontWidth,
                                partFrontHeight,
                                depth,
                                panelThickness,
                                panelAnchor,
                            );
                            return new THREE.LineCurve3(v1, v2);
                        }
                        return null;
                    })
                    .filter((c) => c !== null);
            }

            // Build ordered 2D loops from 3D curves and enforce closure/orientation
            const buildLoopPoints = (curves3D) => {
                const pts = [];
                if (!curves3D || curves3D.length === 0) return pts;
                // seed with first point
                let prev = curves3D[0].getPoint(0);
                pts.push(new THREE.Vector2(prev.x, prev.y));
                for (const c of curves3D) {
                    const p = c.getPoint(1);
                    // skip duplicate consecutive points
                    if (p.x !== prev.x || p.y !== prev.y) {
                        pts.push(new THREE.Vector2(p.x, p.y));
                    }
                    prev = p;
                }
                // explicitly close if not closed
                const first = pts[0];
                const last = pts[pts.length - 1];
                if (first && (first.x !== last.x || first.y !== last.y)) {
                    pts.push(new THREE.Vector2(first.x, first.y));
                }
                return pts;
            };

            const outerPts = buildLoopPoints(outerCurves3D);

            if (!outerPts.length) {
                this.log.warn(
                    "Failed to build outer filler loop: empty points",
                );
                return [];
            }

            // Ensure correct winding: outer CCW
            if (THREE.ShapeUtils.isClockWise(outerPts)) outerPts.reverse();

            // Construct shape (with or without hole)
            const outerShape = new THREE.Shape(outerPts);

            // Add hole only if inner path exists (not in full removal mode)
            if (innerCurves3D) {
                const innerPts = buildLoopPoints(innerCurves3D);

                if (!innerPts.length) {
                    this.log.warn(
                        "Failed to build inner filler loop: empty points",
                    );
                    return [];
                }

                // Ensure correct winding: inner CW
                if (!THREE.ShapeUtils.isClockWise(innerPts)) innerPts.reverse();

                const innerPath = new THREE.Path(innerPts);
                outerShape.holes = [innerPath];
                this.log.debug("PO filler created with hole (normal mode)");
            } else {
                this.log.debug(
                    "PO filler created without hole (full removal mode)",
                );
            }

            // Create extrude geometry along Z axis (depth direction)
            const extrudeDepth = bitLength;
            const geometry = new THREE.ExtrudeGeometry(outerShape, {
                depth: extrudeDepth,
                bevelEnabled: false,
                steps: 1,
                curveSegments: 32,
            });

            // Compute vertex normals for proper face orientation
            geometry.computeVertexNormals();

            // Position geometry: start at bit depth (bit.y), extrude downward
            // Z position calculation same as in convertPoint2DTo3D
            let startZ;
            if (panelAnchor === "top-left") {
                startZ = -depth + panelThickness / 2;
            } else if (panelAnchor === "bottom-left") {
                startZ = -depth - panelThickness / 2;
            } else {
                startZ = depth;
            }

            // Translate geometry to start at bit depth
            geometry.translate(0, 0, startZ);

            // Create mesh
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#FF6600"),
                roughness: 0.5,
                metalness: 0.2,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            return [mesh];
        } catch (error) {
            this.log.error("Error creating PO filler:", error);
            return [];
        }
    }

    /**
     * Parse SVG path data to THREE.Shape
     * @param {string} pathData - SVG path data
     * @returns {THREE.Shape|null} THREE.Shape or null
     */
    parseSVGPathToShape(pathData) {
        try {
            // Create temporary SVG element
            const svgNS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(svgNS, "svg");
            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d", pathData);
            svg.appendChild(path);

            // Use SVGLoader to parse
            const loader = new SVGLoader();
            const svgData = loader.parse(svg.outerHTML);

            if (svgData && svgData.paths && svgData.paths.length > 0) {
                const shapes = svgData.paths[0].toShapes(true);
                if (shapes && shapes.length > 0) {
                    return shapes[0];
                }
            }

            return null;
        } catch (error) {
            this.log.error("Error parsing SVG to shape:", error);
            return null;
        }
    }

    isBBoxValid(bbox) {
        return (
            !!bbox &&
            Number.isFinite(bbox.x) &&
            Number.isFinite(bbox.y) &&
            Number.isFinite(bbox.width) &&
            Number.isFinite(bbox.height) &&
            bbox.width > 0 &&
            bbox.height > 0
        );
    }

    getSafePartFrontBBox(
        partFront,
        fallbackWidth,
        fallbackHeight,
        panelThickness,
    ) {
        try {
            if (partFront) {
                const rawBBox = partFront.getBBox();
                if (this.isBBoxValid(rawBBox)) {
                    this.lastValidPartFrontBBox = rawBBox;
                    return rawBBox;
                }
                this.log.warn("partFront bbox invalid, using fallback", {
                    rawBBox,
                });
            }
        } catch (error) {
            this.log.warn("Failed to read partFront bbox, using fallback", {
                error,
            });
        }

        if (this.lastValidPartFrontBBox) {
            this.log.debug("Using cached partFront bbox", {
                bbox: this.lastValidPartFrontBBox,
            });
            return this.lastValidPartFrontBBox;
        }

        const canvasParams = window.mainCanvasManager?.canvasParameters;
        if (canvasParams?.width && canvasParams?.height) {
            const panelX = (canvasParams.width - fallbackWidth) / 2;
            const panelY = (canvasParams.height - panelThickness) / 2;
            const fallbackBBox = {
                x: panelX,
                y: panelY - fallbackHeight - 100,
                width: fallbackWidth,
                height: fallbackHeight,
            };
            this.lastValidPartFrontBBox = fallbackBBox;
            this.log.warn("Using computed fallback partFront bbox", {
                fallbackBBox,
            });
            return fallbackBBox;
        }

        const fallbackBBox = {
            x: -fallbackWidth / 2,
            y: -fallbackHeight / 2,
            width: fallbackWidth,
            height: fallbackHeight,
        };
        this.lastValidPartFrontBBox = fallbackBBox;
        this.log.warn("Using default fallback partFront bbox", {
            fallbackBBox,
        });
        return fallbackBBox;
    }

    /**
     * Create extrusion for bit extension (material above bit)
     * @param {object} bit - Bit object with extension data
     * @param {number} bitIndex - Index of the bit
     * @param {string|THREE.Curve} pathDataOrCurve - SVG path data string (for non-VC) or 3D curve (for VC)
     * @param {number} depth - Depth of the bit
     * @param {number} extensionWidth - Width of the extension (pixels/mm)
     * @param {number} extensionHeight - Height of the extension (pixels/mm)
     * @param {string} operation - Operation type (VC, AL, OU, IN) to determine extrude method
     * @param {number} panelThickness - Panel thickness
     * @param {string} panelAnchor - Panel anchor position
     * @param {number} passIndex - Optional pass index for VC operations
     * @param {object} transformParams - Transformation parameters for round extrusion (partFrontX, etc.)
     */
    /**
     * Toggle visibility of bit meshes
     */
    toggleBitMeshesVisibility(visible) {
        this.log.debug(
            "toggleBitMeshesVisibility called with visible:",
            visible,
        );
        this.bitPathMeshes.forEach((mesh) => {
            mesh.visible = visible;
        });
        this.bitExtrudeMeshes.forEach((mesh) => {
            mesh.visible = visible;
            // Note: edgeLines are now children, so they inherit visibility automatically.
            // But we might want to override if edges are disabled globally.
            if (mesh.userData.edgeLines) {
                mesh.userData.edgeLines.visible = visible && this.materialManager.isEdgesEnabled();
            }
        });
    }

    /**
     * Compute world-space bounding box for a mesh (or geometry with transform)
     * Used by CSGEngine for panel bounds calculation
     */
    computeWorldBBox(geometry, position, rotation, scale) {
        const bbox = new THREE.Box3();
        geometry.computeBoundingBox();
        bbox.copy(geometry.boundingBox);
        const matrix = new THREE.Matrix4();
        const pos = position || new THREE.Vector3();
        const rot = rotation || new THREE.Euler();
        const scl = scale || new THREE.Vector3(1, 1, 1);
        matrix.compose(pos, new THREE.Quaternion().setFromEuler(rot), scl);
        bbox.applyMatrix4(matrix);
        return bbox;
    }

    animate() {
        if (!this.enabled) {
            this.animationFrameId = null;
            return;
        }
        // Standard loop
        this.animationFrameId = requestAnimationFrame(this.animateBound);

        if (this.stats) {
            this.stats.update();
        }

        // Update material transitions
        if (this.materialManager) {
            this.materialManager.update();
        }

        if (this.sceneManager) {
            this.sceneManager.render();
        }
    }
    /**
     * Handle window resize - delegate to scene manager
     */
    onWindowResize() {
        this.sceneManager.onWindowResize();
    }

    setMaterialMode(modeKey) {
        if (!this.materialManager) return;
        this.materialManager.setMaterialMode(modeKey);
        this.applySelectionState();
    }

    /**
     * Apply CSG operation - delegate to CSG engine
     */
    async applyCSGOperation(apply) {
        await this.csgEngine.applyCSGOperation(apply);

        this.refreshSelectionTargets();
    }

    /**
     * Show base panel - delegate to CSG engine
     */
    showBasePanel() {
        this.csgEngine.showBasePanel();
    }

    /**
     * Show CSG result - delegate to CSG engine
     */
    showCSGResult() {
        this.csgEngine.showCSGResult();
    }

    /**
     * Export 3D geometry to STL
     * If Part view (CSG active): export partMesh with subtracted bits
     * If Material view: export panelMesh + all bitExtrudeMeshes
     * @param {string} filename - Optional filename prefix
     */
    exportToSTL(filename = "facade") {
        const meshesToExport = [];

        // If Part mode is active, export ONLY the CSG result mesh
        if (this.csgEngine.isActive() && this.csgEngine.partMesh) {
            // Use unified mesh if available (prevents STL fragmentation)
            const exportMesh = this.csgEngine.partMesh.userData?.mergedMesh || this.csgEngine.partMesh;
            meshesToExport.push(exportMesh);
            this.log.info(
                "Part mode active: Exporting ONLY Part view (CSG result mesh)",
            );
        } else {
            // Otherwise export panel + raw extrude pieces
            if (this.panelMesh) {
                meshesToExport.push(this.panelMesh);
            }

            // Export raw extrude pieces (segments + lathes), excluding debug cutting planes
            if (this.bitExtrudeMeshes && this.bitExtrudeMeshes.length) {
                const filtered = this.bitExtrudeMeshes.filter(
                    (m) => !m.userData?.isCuttingPlane,
                );
                meshesToExport.push(...filtered);
                this.log.info(
                    `Exporting raw extrudes (segments + lathes): ${filtered.length} meshes`,
                );
            }
        }

        if (meshesToExport.length === 0) {
            this.log.warn("No meshes to export");
            return;
        }

        // Assign readable names for STL (panel, bit names, or fallback)
        meshesToExport.forEach((mesh, idx) => {
            if (mesh.name && mesh.name !== "unnamed") return;
            if (mesh === this.panelMesh) {
                mesh.name = "panel";
                return;
            }
            const bitIndex = mesh.userData?.bitIndex;
            if (
                bitIndex !== undefined &&
                bitIndex !== null &&
                this.lastUniqueBits?.[bitIndex]?.name
            ) {
                const base = this.lastUniqueBits[bitIndex].name;
                const pass = mesh.userData?.pass;
                mesh.name =
                    pass !== undefined && pass !== null
                        ? `${base}_pass${pass}`
                        : base;
                return;
            }
            mesh.name = `mesh_${idx}`;
        });

        // Export-time repair/validation - check exportRepairMode independently
        const exportRepairMode =
            appConfig.meshRepair.exportRepairMode || "none";

        // Apply Manifold repair ONLY to raw meshes, NOT to CSG result (partMesh already healed by CSG)
        const shouldRepairWithManifold =
            (exportRepairMode === "manifold" ||
                exportRepairMode === "manifold-fallback") &&
            !(this.csgEngine.isActive() && this.csgEngine.partMesh);

        if (shouldRepairWithManifold) {
            const repairedMeshes = this.repairMeshesWithManifold(
                meshesToExport,
                exportRepairMode === "manifold-fallback",
            );
            this.stlExporter.exportToSTL(repairedMeshes, filename);
            return;
        }

        // Legacy validation path (only if enabled AND exportValidation flag set)
        if (
            appConfig.meshRepair.enabled &&
            appConfig.meshRepair.exportValidation
        ) {
            this.validateAndRepairForExport(meshesToExport, filename);
            return;
        }

        this.stlExporter.exportToSTL(meshesToExport, filename);
    }

    /**
     * Repair meshes using a Manifold round-trip (non-destructive healing)
     * @param {Array<THREE.Mesh>} meshes
     * @param {boolean} useFallback - If true, use direct repair when Manifold fails
     * @returns {Array<THREE.Mesh>} repaired mesh clones
     */
    repairMeshesWithManifold(meshes, useFallback = false) {
        const manifoldCSG = this.csgEngine?.manifoldCSG;
        if (!manifoldCSG) {
            this.log.warn("ManifoldCSG not available for export repair");
            return meshes;
        }

        const repaired = [];

        for (const mesh of meshes) {
            // Skip panelMesh from repair pipeline - panel is usually not broken and repairing it causes transform issues
            if (mesh === this.panelMesh) {
                repaired.push(mesh);
                continue;
            }

            try {
                mesh.updateMatrixWorld?.(true);

                // Clone geometry (do NOT bake world matrix to avoid double transforms in exporter)
                const cloned = mesh.geometry.clone();

                // Apply same basic cleanup as CSG operations (from ManifoldCSG.cleanupGeometry)
                // This is lighter than full repair and matches what CSG does
                const cleaned = manifoldCSG.cleanupGeometry(
                    cloned,
                    this.csgEngine.manifoldTolerance || 1e-3,
                );

                // Round-trip through Manifold (heals manifold issues without heuristic deletions)
                const manifold = manifoldCSG.toManifold(
                    cleaned,
                    mesh.matrixWorld || new THREE.Matrix4(),
                    undefined,
                    this.csgEngine.manifoldTolerance,
                );
                if (!manifold) {
                    this.log.warn(
                        `Manifold conversion failed for mesh "${mesh.name || "unnamed"}" - geometry is NotManifold`,
                        `Verts: ${cleaned.attributes.position.count}, Tris: ${cleaned.index ? cleaned.index.count / 3 : cleaned.attributes.position.count / 3}`,
                    );

                    // Fallback to direct repair if enabled
                    if (useFallback && appConfig.meshRepair.enabled) {
                        this.log.info(
                            "Applying direct mesh repair as fallback...",
                        );
                        const repairInstance = getRepairInstance(
                            appConfig.meshRepair,
                        );
                        const repairedGeom = repairInstance.repairAndValidate(
                            cleaned,
                            {
                                repairLevel: appConfig.meshRepair.repairLevel,
                                logRepairs: appConfig.meshRepair.logRepairs,
                                stage: "export-fallback",
                            },
                        );

                        const repairedMesh = mesh.clone();
                        repairedMesh.geometry = repairedGeom;
                        repairedMesh.position.set(0, 0, 0);
                        repairedMesh.rotation.set(0, 0, 0);
                        repairedMesh.scale.set(1, 1, 1);
                        repairedMesh.updateMatrix();
                        repairedMesh.matrixWorld.copy(mesh.matrixWorld);
                        repaired.push(repairedMesh);
                    } else {
                        repaired.push(mesh);
                    }
                    continue;
                }

                const healedResult = manifoldCSG.fromManifold(manifold);
                const healedGeom = healedResult?.geometry || healedResult; // adapt to {geometry, meta}
                const healedMesh = mesh.clone();
                healedMesh.geometry = healedGeom;
                healedMesh.position.set(0, 0, 0);
                healedMesh.rotation.set(0, 0, 0);
                healedMesh.scale.set(1, 1, 1);
                healedMesh.updateMatrix();
                healedMesh.matrixWorld.copy(mesh.matrixWorld);

                repaired.push(healedMesh);
            } catch (err) {
                this.log.warn(
                    "Manifold export repair failed, exporting original mesh",
                    err?.message || err,
                );
                repaired.push(mesh);
            }
        }

        return repaired;
    }

    /**
     * Validate meshes before export and show warnings if issues detected
     * @param {Array<THREE.Mesh>} meshes - Meshes to validate
     * @param {string} filename - Filename for export
     */
    validateAndRepairForExport(meshes, filename) {
        const repairInstance = getRepairInstance(appConfig.meshRepair);
        let hasErrors = false;
        let totalIssues = {
            nonManifoldEdges: 0,
            degenerateTriangles: 0,
            shortEdges: 0,
        };

        // Validate each mesh
        const validatedMeshes = meshes.map((mesh) => {
            const validation = repairInstance.validateForExport(mesh.geometry);

            if (!validation.valid) {
                hasErrors = true;
                const report = validation.report;

                // Accumulate issues
                if (report.original) {
                    report.original.errors.forEach((error) => {
                        if (error.includes("non-manifold")) {
                            const match = error.match(/(\d+)/);
                            totalIssues.nonManifoldEdges += match
                                ? parseInt(match[1])
                                : 0;
                        }
                        if (error.includes("degenerate")) {
                            const match = error.match(/(\d+)/);
                            totalIssues.degenerateTriangles += match
                                ? parseInt(match[1])
                                : 0;
                        }
                    });
                    report.original.warnings.forEach((warning) => {
                        if (warning.includes("short edges")) {
                            const match = warning.match(/(\d+)/);
                            totalIssues.shortEdges += match
                                ? parseInt(match[1])
                                : 0;
                        }
                    });
                }
            }

            // Return mesh with validated/repaired geometry
            const repairedMesh = mesh.clone();
            repairedMesh.geometry = validation.geometry;
            return repairedMesh;
        });

        // Show warning if issues were detected
        if (hasErrors) {
            const message = this._buildExportWarningMessage(totalIssues);
            this.log.warn(
                "Mesh validation detected issues before export:",
                totalIssues,
            );

            // Show user-visible warning (you can customize this UI)
            if (
                confirm(
                    message +
                    "\n\nExport anyway? (Recommended: Yes - meshes have been automatically repaired)",
                )
            ) {
                this.stlExporter.exportToSTL(validatedMeshes, filename);

                // Track repair stats
                eventBus.emit("meshRepair:exportValidation", {
                    hadIssues: true,
                    issues: totalIssues,
                    wasRepaired: true,
                    exported: true,
                });
            } else {
                this.log.info("Export cancelled by user");
                eventBus.emit("meshRepair:exportValidation", {
                    hadIssues: true,
                    issues: totalIssues,
                    wasRepaired: true,
                    exported: false,
                });
            }
        } else {
            // No issues, proceed with export
            this.stlExporter.exportToSTL(validatedMeshes, filename);
            this.log.info("Mesh validation passed - no issues detected");

            eventBus.emit("meshRepair:exportValidation", {
                hadIssues: false,
                exported: true,
            });
        }
    }

    /**
     * Build user-friendly warning message for export validation
     * @param {Object} issues - Issue counts
     * @returns {string} - Formatted message
     */
    _buildExportWarningMessage(issues) {
        const parts = [
            "⚠️ Mesh Quality Warning\n\nThe following issues were detected and automatically repaired:\n",
        ];

        if (issues.nonManifoldEdges > 0) {
            parts.push(
                `• ${issues.nonManifoldEdges} non-manifold edges (fixed)`,
            );
        }
        if (issues.degenerateTriangles > 0) {
            parts.push(
                `• ${issues.degenerateTriangles} degenerate triangles (removed)`,
            );
        }
        if (issues.shortEdges > 0) {
            parts.push(
                `• ${issues.shortEdges} extremely short edges (warning)`,
            );
        }

        parts.push("\nRepaired mesh is ready for export.");

        return parts.join("\n");
    }

    /**
     * Show or hide the 3D canvas
     */
    setVisible(visible) {
        if (this.container) {
            this.container.style.display = visible ? "flex" : "none";
        }
    }

    /**
     * Clean up resources
     */

    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Clean up managers
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
        if (this.materialManager) {
            this.materialManager.dispose();
        }
        if (this.csgEngine) {
            this.csgEngine.dispose();
        }
        if (this.extrusionBuilder) {
            this.extrusionBuilder.dispose();
        }

        // Clean up geometries and materials
        if (this.panelMesh) {
            this.panelMesh.geometry.dispose();
            this.panelMesh.material.dispose();
        }

        this.bitPathMeshes.forEach((mesh) => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });

        this.bitExtrudeMeshes.forEach((mesh) => {
            mesh.geometry.dispose();
            mesh.material.dispose();
        });

        // Clean up scene
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) =>
                            material.dispose(),
                        );
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }

        this.log.info("Cleaned up");
    }

    // ===== PROPERTY GETTERS FOR COMPATIBILITY =====
    // These provide access to CSGEngine state

    get csgActive() {
        return this.csgEngine.csgActive;
    }

    set csgActive(value) {
        this.csgEngine.csgActive = value;
    }

    get partMesh() {
        return this.csgEngine.partMesh;
    }

    set partMesh(value) {
        this.csgEngine.partMesh = value;
    }

    get lastCSGSignature() {
        return this.csgEngine.lastCSGSignature;
    }

    set lastCSGSignature(value) {
        this.csgEngine.lastCSGSignature = value;
    }

    get panelBBox() {
        return this.csgEngine.panelBBox;
    }

    set panelBBox(value) {
        this.csgEngine.panelBBox = value;
    }

    get csgVisible() {
        return this.csgEngine.csgVisible;
    }

    set csgVisible(value) {
        this.csgEngine.csgVisible = value;
    }

    get useUnionBeforeSubtract() {
        return this.csgEngine.useUnionBeforeSubtract;
    }

    set useUnionBeforeSubtract(value) {
        this.csgEngine.useUnionBeforeSubtract = value;
    }

    // Scene Manager property forwarding (backward compatibility)
    get camera() {
        return this.sceneManager.camera;
    }

    get renderer() {
        return this.sceneManager.renderer;
    }

    get controls() {
        return this.sceneManager.controls;
    }

    get lights() {
        return this.sceneManager.lights;
    }

    get cameraFitted() {
        return this.sceneManager.cameraFitted;
    }

    set cameraFitted(value) {
        this.sceneManager.cameraFitted = value;
    }

    get stats() {
        return this.sceneManager.stats;
    }

    set stats(value) {
        this.sceneManager.stats = value;
    }
}
