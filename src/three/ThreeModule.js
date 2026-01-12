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
import ExtrusionBuilder from "./ExtrusionBuilder.js";
import STLExporter from "../export/STLExporter.js";

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

        // Panel side for bit operations: 'top' (front face) or 'bottom' (back face)
        this.panelSide = "top";

        // Extrude mode is selected automatically per bit operation (VC → mitered, others → round)
    }

    async init() {
        this.log.info("Initializing...");
        this.container = document.getElementById("three-canvas-container");

        if (!this.container) {
            this.log.error("Container not found");
            return;
        }

        // Initialize scene manager (camera, renderer, controls, lighting, etc.)
        this.sceneManager.initialize(this.container);

        // Keep reference to scene from scene manager
        this.scene = this.sceneManager.scene;

        // Initialize extrusion builder
        this.extrusionBuilder.initialize({
            materialManager: this.materialManager,
            csgEngine: this.csgEngine,
        });

        // Add minimal on-canvas controls (material + wireframe + edges)
        this.initMaterialControls();

        // Add wireframe toggle button
        this.addWireframeToggle();

        // Add CSG mode toggle
        this.addCSGModeToggle();

        // Add panel side toggle
        this.addPanelSideToggle();

        // Removed test UI: extrude version selector and compare toggle

        // Add Stats widget
        this.sceneManager.addStatsWidget(
            typeof window !== "undefined" && window.Stats ? window.Stats : null
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
                    window.panelAnchor || "top-left"
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
                    window.panelAnchor || "top-left"
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

            // Material selector
            const select = document.createElement("select");
            select.title = "Material";
            this.materialManager.getAvailableMaterials().forEach((key) => {
                const opt = document.createElement("option");
                opt.value = key;
                opt.textContent = key;
                select.appendChild(opt);
            });
            select.value = this.materialManager.getCurrentMaterialKey();
            select.addEventListener("change", () => {
                this.materialManager.setMaterialMode(select.value);
            });

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

            // Edges overlay toggle
            const edLabel = document.createElement("label");
            edLabel.style.display = "flex";
            edLabel.style.alignItems = "center";
            edLabel.style.gap = "4px";
            const ed = document.createElement("input");
            ed.type = "checkbox";
            ed.checked = this.materialManager.isEdgesEnabled();
            ed.title = "Edges Overlay";
            ed.addEventListener("change", () => {
                this.materialManager.setEdgesEnabled(ed.checked);
            });
            const edText = document.createElement("span");
            edText.textContent = "Edges";
            edLabel.appendChild(ed);
            edLabel.appendChild(edText);

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

            wrap.appendChild(select);
            wrap.appendChild(wfLabel);
            wrap.appendChild(edLabel);
            wrap.appendChild(exportBtn);

            // Position wrap inside container (over renderer)
            this.container.style.position = "relative";
            this.container.appendChild(wrap);
            this.materialControls = { wrap, select, wf, ed, exportBtn };
        } catch (e) {
            this.log.warn("Failed to init material controls:", e);
        }
    }

    addWireframeToggle() {
        // Create toggle button in three-canvas-container
        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = "Wireframe";
        toggleBtn.style.position = "absolute";
        toggleBtn.style.top = "10px";
        toggleBtn.style.right = "10px";
        toggleBtn.style.padding = "8px 16px";
        toggleBtn.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        toggleBtn.style.border = "1px solid #ccc";
        toggleBtn.style.borderRadius = "4px";
        toggleBtn.style.cursor = "pointer";
        toggleBtn.style.zIndex = "100";
        toggleBtn.style.fontSize = "12px";
        toggleBtn.style.fontWeight = "500";

        toggleBtn.addEventListener("click", () => {
            this.toggleWireframe();
        });

        this.container.appendChild(toggleBtn);
        this.wireframeToggleBtn = toggleBtn;
    }

    addCSGModeToggle() {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.top = "50px";
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
                this.csgEngine.applyCSGOperation(true);
            }
        });

        container.appendChild(checkbox);
        container.appendChild(label);
        this.container.appendChild(container);
        this.csgModeToggle = container;
    }

    addPanelSideToggle() {
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.top = "90px";
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

        const label = document.createElement("label");
        label.textContent = "Panel Side:";
        label.style.userSelect = "none";

        const select = document.createElement("select");
        select.id = "panel-side-select";
        select.style.cursor = "pointer";
        select.style.padding = "2px 4px";
        select.style.fontSize = "12px";

        const optionTop = document.createElement("option");
        optionTop.value = "top";
        optionTop.textContent = "Top (Front)";

        const optionBottom = document.createElement("option");
        optionBottom.value = "bottom";
        optionBottom.textContent = "Bottom (Back)";

        select.appendChild(optionTop);
        select.appendChild(optionBottom);
        select.value = this.panelSide;

        select.addEventListener("change", () => {
            this.panelSide = select.value;
            this.log.info(`Panel side changed to: ${this.panelSide}`);

            // Trigger panel rebuild with new side
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
                    window.panelAnchor || "top-left"
                );
            }
        });

        container.appendChild(label);
        container.appendChild(select);
        this.container.appendChild(container);
        this.panelSideToggle = container;
    }

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
        panelAnchor = "top-left"
    ) {
        if (!this.enabled) {
            this.log.debug("Skip updatePanel: 3D disabled");
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
                panelAnchor
            );

            if (this.lastPanelUpdateSignature === nextSignature) {
                this.log.debug(
                    "Panel signature unchanged, skipping 3D rebuild"
                );
                return;
            }

            // Only log when actually updating (signature changed)
            this.log.info("Updating 3D panel", {
                width,
                height,
                thickness,
                bits: bits.length,
            });

            // Clear all edge visualizations before removing meshes
            if (this.materialManager) {
                this.materialManager.clearAllEdges();
            }

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
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            this.bitPathMeshes = [];
            this.bitExtrudeMeshes.forEach((mesh) => {
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
            });
            this.bitExtrudeMeshes = [];
            this.lastCSGSignature = null;
            this.csgActive = false;
            this.csgVisible = false;
            this.panelBBox = null;

            // Create panel geometry from partFront shape using SVGLoader
            const partFront = document.getElementById("part-front");
            const partFrontBBox = this.getSafePartFrontBBox(
                partFront,
                width,
                height,
                thickness
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
                        partFront
                    );
                    this.log.debug(
                        "SVG data (first 200 chars):",
                        svgData.substring(0, 200)
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
                                                          .arcDivisionCoefficient
                                              )
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
                                    extrudeSettings
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
                                    realHeight
                                );
                            } else {
                                this.log.warn(
                                    "No shapes from SVGLoader, using box geometry"
                                );
                                geometry = new THREE.BoxGeometry(
                                    width,
                                    height,
                                    thickness
                                );
                            }
                        } else {
                            this.log.warn(
                                "Path has no toShapes method, using box geometry"
                            );
                            geometry = new THREE.BoxGeometry(
                                width,
                                height,
                                thickness
                            );
                        }
                    } else {
                        this.log.warn(
                            "No paths from SVGLoader, using box geometry"
                        );
                        geometry = new THREE.BoxGeometry(
                            width,
                            height,
                            thickness
                        );
                    }
                } catch (error) {
                    this.log.error("Error using SVGLoader:", error);
                    geometry = new THREE.BoxGeometry(width, height, thickness);
                }
            } else {
                if (!partFront) {
                    this.log.warn(
                        "partFront element not found, using box geometry"
                    );
                } else {
                    this.log.warn(
                        "SVGLoader not available, using box geometry"
                    );
                }
                geometry = new THREE.BoxGeometry(width, height, thickness);
            }

            const material = this.materialManager.createMaterial(
                this.materialManager.getCurrentMaterialKey()
            );
            this.panelMesh = new THREE.Mesh(geometry, material);
            this.panelMesh.castShadow = true;
            this.panelMesh.receiveShadow = true;
            this.panelMesh.position.set(0, 0, thickness / 2);
            this.basePanelMesh = this.panelMesh;

            // Initialize material manager with mesh references
            this.materialManager.initialize(
                this.panelMesh,
                this.partMesh,
                this.scene,
                this.bitExtrudeMeshes
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
                this.originalPanelScale
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

            // Create bit path extrusions
            if (bits && bits.length > 0) {
                await this.createBitPathExtrusions(
                    bits,
                    width,
                    height,
                    thickness,
                    panelAnchor
                );
            }

            // Adjust camera to fit panel
            this.sceneManager.fitCameraToPanel(width, height, thickness);

            // Add meshes to scene (will apply CSG later if needed)
            this.log.info("Adding panel mesh and bit meshes to scene", {
                bitPathLinesCount: this.bitPathMeshes.length,
                bitExtrudeMeshesCount: this.bitExtrudeMeshes.length,
                bitsVisible: window.bitsVisible,
                showPart: window.showPart,
            });

            this.scene.add(this.panelMesh);

            // Only add bit meshes if they should be visible
            // In Part view, they will be hidden by applyCSGOperation()
            if (window.bitsVisible !== false) {
                this.log.info("Adding bit meshes to scene", {
                    bitPathLines: this.bitPathMeshes.length,
                    bitExtrudes: this.bitExtrudeMeshes.length,
                });
                this.bitPathMeshes.forEach((mesh) => {
                    this.scene.add(mesh);
                    mesh.visible = !window.showPart;
                });
                this.bitExtrudeMeshes.forEach((mesh) => {
                    this.scene.add(mesh);
                    mesh.visible = !window.showPart;
                });
            } else {
                this.log.debug("Bits not visible, hiding bit meshes");
                this.bitPathMeshes.forEach((mesh) => {
                    mesh.visible = false;
                });
                this.bitExtrudeMeshes.forEach((mesh) => {
                    mesh.visible = false;
                });
            }

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
                    queued.panelAnchor
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
        panelAnchor
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

        this.log.info("Creating bit path extrusions", {
            bitsCount: bits.length,
            uniqueBitsCount: uniqueBits.length,
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
            panelThickness
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
            this.log.info(`Processing bit ${bitIndex}:`, {
                x: bit.x,
                y: bit.y,
                operation: bit.operation,
                name: bit.name,
                bitData: bit.bitData,
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
                    }
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
                    contourOffsets
                );

                // Get partFront points for offset calculation
                const partFront = document.getElementById("part-front");
                if (!partFront) {
                    this.log.error(
                        "partFront element not found for offset calculation!"
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
                        exportModule
                    );
                if (!partFrontPoints || partFrontPoints.length === 0) {
                    this.log.error("Failed to get partFront points");
                    continue;
                }

                // Find all contours for this bit
                const bitContours = offsetContours.filter(
                    (c) => c.bitIndex === bitIndex
                );

                this.log.info(
                    `VC bit ${bitIndex}: found ${bitContours.length} contours`,
                    {
                        bitContours: bitContours.map((c) => ({
                            passIndex: c.passIndex,
                            hasPathData: !!c.pathData,
                        })),
                    }
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
                    `VC bit ${bitIndex}: Starting pass loop for ${passes} passes`
                );

                for (let passIndex = 0; passIndex < passes; passIndex++) {
                    const isMainBit = passIndex === 0;
                    const depth = depths[passIndex];
                    const contourOffset = contourOffsets[passIndex];

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: Starting (depth=${depth}, offset=${contourOffset})`
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
                                        passExtensionInfo
                                    );
                                }
                            }
                        }

                        if (!passExtensionInfo) {
                            this.log.debug(
                                `No phantom extension found for bit ${bitIndex} pass ${passIndex}`
                            );
                        }
                    }

                    this.log.debug(
                        `Pass ${passIndex} extension info:`,
                        passExtensionInfo ? "found" : "not found",
                        passExtensionInfo
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
                        `VC bit ${bitIndex} pass ${passIndex}: passContour found=${!!passContour}, hasPathData=${!!contourPathData}`
                    );

                    if (!passContour || !contourPathData) {
                        this.log.warn(
                            `No contour data for VC bit ${bitIndex} pass ${passIndex}`
                        );
                        continue;
                    }

                    // Get path data from pre-computed contour
                    const pathData = contourPathData;

                    // Parse path to get curves
                    const pathCurves =
                        this.extrusionBuilder.parsePathToCurves(pathData);

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: parsed ${pathCurves.length} curves`
                    );

                    if (pathCurves.length === 0) {
                        this.log.warn(
                            `No curves found for VC bit ${bitIndex} pass ${passIndex}`
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
                        panelAnchor
                    );

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: created 3D curve with ${
                            curve3D.curves?.length || 0
                        } segments`
                    );

                    // Create bit profile shape
                    const bitProfile =
                        await this.extrusionBuilder.createBitProfile(
                            bit.bitData
                        );

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex}: profile created=${!!bitProfile}, curves=${
                            bitProfile?.curves?.length || 0
                        }`
                    );

                    if (!bitProfile) {
                        this.log.warn(
                            `No bit profile created for VC bit ${bitIndex} pass ${passIndex}`
                        );
                        continue;
                    }

                    // VC uses MITERED extrusion (sharp corners), not round
                    this.log.info(
                        `Extruding VC bit ${bitIndex} pass ${passIndex} with MITERED mode`,
                        {
                            profileType: typeof bitProfile,
                            profileIsShape: bitProfile instanceof THREE.Shape,
                            curveType: typeof curve3D,
                            curveLength: curve3D?.getLength?.() || 0,
                            curvesCount: curve3D?.curves?.length || 0,
                        }
                    );

                    // Create bit using unified constructor
                    // extrudeAlongPath returns: [pathLine (if enabled), ...meshes]
                    const pathColor = isMainBit ? bit.color : "gray";
                    const bitResult = this.extrusionBuilder.extrudeAlongPath(
                        bitProfile,
                        curve3D,
                        pathColor,
                        0, // zOffset = 0 for main bit
                        "mitered", // Sharp corners
                        this.panelSide, // Panel side: 'top' or 'bottom'
                        { pathVisual: true } // Enable path visualization
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
                            pathLine.userData.pass = passIndex;
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
                                passExtensionInfo.height
                            );

                        // Use depth variable from outer scope (already defined for this pass)
                        const bitDepth = depth || 0;

                        const extensionResult =
                            this.extrusionBuilder.extrudeAlongPath(
                                extensionProfile,
                                curve3D,
                                "#FF0000", // Red color for extensions
                                bitDepth + 1, // zOffset = bit depth (shifts extension above bit)
                                "mitered",
                                this.panelSide, // Panel side: 'top' or 'bottom'
                                { pathVisual: false } // Disable path visualization for extensions
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
                                    : "#FF0000"
                            );
                        });
                    }

                    this.log.info(
                        `VC bit ${bitIndex} pass ${passIndex} extrusion result:`,
                        {
                            bitMeshes: bitMeshes.length,
                            extensionMeshes: extensionMeshes.length,
                        }
                    );

                    // Add bit meshes
                    if (bitMeshes && bitMeshes.length > 0) {
                        bitMeshes.forEach((mesh) => {
                            mesh.userData.operation =
                                bit.operation || "subtract";
                            mesh.userData.bitIndex = bitIndex;
                            mesh.userData.pass = passIndex;
                            mesh.userData.isPhantom = !isMainBit;

                            // Make phantom bits semi-transparent
                            if (!isMainBit) {
                                mesh.material.transparent = true;
                                mesh.material.opacity = 0.3;
                            }

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
                            `Added VC pass ${passIndex}: ${bitMeshes.length} mesh parts for bit ${bitIndex}`
                        );
                    }

                    // Add extension meshes
                    if (extensionMeshes && extensionMeshes.length > 0) {
                        extensionMeshes.forEach((mesh) => {
                            mesh.userData.operation = "extension";
                            mesh.userData.bitIndex = bitIndex;
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
                            `Added VC pass ${passIndex} extension: ${extensionMeshes.length} meshes for bit ${bitIndex}`
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
                        (c) => c.bitIndex === bitIndex && c.isPOMain === true
                    );
                    const phantomContour = offsetContours.find(
                        (c) => c.bitIndex === bitIndex && c.isPOPhantom === true
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
                                    bit.bitData
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
                                            offset: 5, // Apply -5mm offset to SVG path
                                            cornerStyle: "miter",
                                        }
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
                                    mainPathLine.userData.isPOMain = true;
                                    this.bitPathMeshes.push(mainPathLine);
                                }

                                // Add main bit meshes
                                if (mainMeshes?.length > 0) {
                                    mainMeshes.forEach((mesh) => {
                                        mesh.userData.operation =
                                            bit.operation || "subtract";
                                        mesh.userData.bitIndex = bitIndex;
                                        mesh.userData.isPOMain = true;
                                        this.bitExtrudeMeshes.push(mesh);

                                        if (
                                            this.materialManager?.isEdgesEnabled()
                                        ) {
                                            this.materialManager.addEdgeVisualization(
                                                mesh
                                            );
                                        }
                                    });
                                    this.log.debug(
                                        `Added PO main bit: ${mainMeshes.length} meshes`
                                    );
                                }

                                // Get phantom path data for later use (filler creation)
                                let phantomPathData = null;

                                // Extrude phantom bit only if pocketOffset > 0
                                if (pocketOffset > 0 && phantomContour) {
                                    phantomPathData =
                                        phantomContour.pathData ||
                                        phantomContour.element?.getAttribute(
                                            "d"
                                        );

                                    if (phantomPathData) {
                                        const phantomResult =
                                            this.extrusionBuilder.extrudeAlongPath(
                                                bitProfile,
                                                phantomPathData, // SVG path string
                                                "rgba(255, 165, 0, 0.3)",
                                                0,
                                                "mitered",
                                                this.panelSide,
                                                transformOptions,
                                                {
                                                    offset: -5, // Apply -5mm offset to SVG path
                                                    cornerStyle: "miter",
                                                }
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
                                            phantomPathLine.userData.isPOPhantom = true;
                                            phantomPathLine.material.transparent = true;
                                            phantomPathLine.material.opacity = 0.5;
                                            this.bitPathMeshes.push(
                                                phantomPathLine
                                            );
                                        }

                                        // Add phantom bit meshes (semi-transparent)
                                        if (phantomMeshes?.length > 0) {
                                            phantomMeshes.forEach((mesh) => {
                                                mesh.userData.operation =
                                                    bit.operation || "subtract";
                                                mesh.userData.bitIndex =
                                                    bitIndex;
                                                mesh.userData.isPOPhantom = true;
                                                mesh.material.transparent = true;
                                                mesh.material.opacity = 0.3;
                                                this.bitExtrudeMeshes.push(
                                                    mesh
                                                );

                                                if (
                                                    this.materialManager?.isEdgesEnabled()
                                                ) {
                                                    this.materialManager.addEdgeVisualization(
                                                        mesh
                                                    );
                                                }
                                            });
                                            this.log.debug(
                                                `Added PO phantom bit: ${phantomMeshes.length} meshes`
                                            );
                                        }
                                    }
                                } else if (pocketOffset === 0) {
                                    this.log.debug(
                                        `PO bit ${bitIndex}: Skipped phantom (pocketOffset = 0)`
                                    );
                                }

                                this.log.info(
                                    `PO bit ${bitIndex}: Successfully rendered ${
                                        pocketOffset > 0
                                            ? "main and phantom bits"
                                            : "main bit only"
                                    }`
                                );

                                // Create pocket filler if pocketWidth > diameter * 2
                                const bitLength =
                                    bit.bitData?.length ||
                                    bit.bitData?.totalLength ||
                                    20;

                                // Check if full removal mode (pocketOffset = 0 or isFullRemoval flag)
                                const isFullRemoval =
                                    bit.isFullRemoval || pocketOffset === 0;

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
                                            bitLength,
                                            transformOptions
                                        );

                                    if (fillerMeshes?.length > 0) {
                                        fillerMeshes.forEach((mesh) => {
                                            mesh.userData.operation =
                                                "subtract"; // Force subtract for CSG
                                            mesh.userData.bitIndex = bitIndex;
                                            mesh.userData.isPOFiller = true;
                                            mesh.userData.isFullRemoval =
                                                isFullRemoval;
                                            this.bitExtrudeMeshes.push(mesh);

                                            if (
                                                this.materialManager?.isEdgesEnabled()
                                            ) {
                                                this.materialManager.addEdgeVisualization(
                                                    mesh
                                                );
                                            }
                                        });
                                    } else {
                                        this.log.warn(
                                            `PO bit ${bitIndex}: Filler creation returned empty array`
                                        );
                                    }
                                } else if (pocketWidth > diameter * 2) {
                                    this.log.warn(
                                        `PO bit ${bitIndex}: Cannot create filler - phantomPathData is missing (pocketOffset=${pocketOffset})`
                                    );
                                }
                            }
                        }
                    } else {
                        this.log.warn(
                            `PO bit ${bitIndex}: Missing main contour`
                        );
                    }
                }

                continue; // Skip normal processing for PO bits
            }

            // Standard operations: AL, OU, IN
            // Find offset contour for this bit
            const bitContours = offsetContours.filter(
                (c) => c.bitIndex === bitIndex
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
                pathData.substring(0, 100) + "..."
            );

            // Get bit depth for z offset (needed for path visualization)
            const bitDepth = bit.y || 0;

            // Parse path to curves for visualization
            const pathCurves =
                this.extrusionBuilder.parsePathToCurves(pathData);
            // Path visualization is now handled by extrudeAlongPath with pathVisual=true by default

            // Create bit profile shape
            const bitProfile = await this.extrusionBuilder.createBitProfile(
                bit.bitData
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
                "round", // Lathe-filled corners
                this.panelSide, // Panel side: 'top' or 'bottom'
                transformOptions
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
                        passExtensionInfo.height
                    );

                const extensionResult = this.extrusionBuilder.extrudeAlongPath(
                    extensionProfile,
                    pathData,
                    "#FF0000", // Red color for extensions
                    bitDepth + 1, // zOffset = bit depth (shifts extension above bit)
                    "round",
                    this.panelSide, // Panel side: 'top' or 'bottom'
                    { ...transformOptions, pathVisual: false } // Disable path visualization for extensions
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
                            : "#FF0000"
                    );
                });
            }

            // Process bit meshes
            if (bitMeshes && bitMeshes.length > 0) {
                bitMeshes.forEach((mesh) => {
                    mesh.userData.operation = bit.operation || "subtract";
                    mesh.userData.bitIndex = bitIndex;
                    this.bitExtrudeMeshes.push(mesh);
                    this.log.debug(
                        `[SCENE] Added mesh for bit ${bitIndex}: ${mesh.geometry.attributes.position.count} vertices`
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
                    `Created ${bitMeshes.length} extrude mesh(es) for bit ${bitIndex}`
                );

                // Process extension meshes (if any)
                if (extensionMeshes && extensionMeshes.length > 0) {
                    extensionMeshes.forEach((mesh) => {
                        mesh.userData.operation = "extension";
                        mesh.userData.bitIndex = bitIndex;
                        this.bitExtrudeMeshes.push(mesh);
                        this.log.debug(
                            `[SCENE] Added extension mesh for bit ${bitIndex}: ${mesh.geometry.attributes.position.count} vertices`
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
                        `Created ${extensionMeshes.length} extension mesh(es) for bit ${bitIndex}`
                    );
                }
            } else {
                this.log.debug(
                    `Failed to create extrude mesh for bit ${bitIndex}`
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
        transformOptions
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
                    }
                );
                phantomOffset = Array.isArray(phantomOffsetResult)
                    ? phantomOffsetResult[0]
                    : phantomOffsetResult;

                if (!phantomOffset) {
                    this.log.warn(
                        "Failed to create phantom offset path for filler"
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
                    const { approximatePath } = await import(
                        "../utils/arcApproximation.js"
                    );
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
                            panelAnchor
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
                            panelAnchor
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
                                panelAnchor
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
                                panelAnchor
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
                    "Failed to build outer filler loop: empty points"
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
                        "Failed to build inner filler loop: empty points"
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
                    "PO filler created without hole (full removal mode)"
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
        panelThickness
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
            visible
        );
        this.bitPathMeshes.forEach((mesh) => {
            mesh.visible = visible;
        });
        this.bitExtrudeMeshes.forEach((mesh) => {
            mesh.visible = visible;
            // Sync edge visibility with mesh visibility
            if (mesh.userData.edgeLines) {
                mesh.userData.edgeLines.visible = visible;
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

        this.animationFrameId = requestAnimationFrame(this.animateBound);

        // Delegate rendering to scene manager
        this.sceneManager.render();
    }

    /**
     * Handle window resize - delegate to scene manager
     */
    onWindowResize() {
        this.sceneManager.onWindowResize();
    }

    /**
     * Apply CSG operation - delegate to CSG engine
     */
    applyCSGOperation(apply) {
        this.csgEngine.applyCSGOperation(apply);
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
            meshesToExport.push(this.csgEngine.partMesh);
            this.log.info(
                "Part mode active: Exporting ONLY Part view (CSG result mesh)"
            );
        } else {
            // Otherwise export panel + raw extrude pieces
            if (this.panelMesh) {
                meshesToExport.push(this.panelMesh);
            }

            // Export raw extrude pieces (segments + lathes), excluding debug cutting planes
            if (this.bitExtrudeMeshes && this.bitExtrudeMeshes.length) {
                const filtered = this.bitExtrudeMeshes.filter(
                    (m) => !m.userData?.isCuttingPlane
                );
                meshesToExport.push(...filtered);
                this.log.info(
                    `Exporting raw extrudes (segments + lathes): ${filtered.length} meshes`
                );
            }
        }

        if (meshesToExport.length === 0) {
            this.log.warn("No meshes to export");
            return;
        }

        this.stlExporter.exportToSTL(meshesToExport, filename);
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
                            material.dispose()
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
