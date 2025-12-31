import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { ADDITION, Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import BaseModule from "../core/BaseModule.js";
import { LoggerFactory } from "../core/LoggerFactory.js";
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

        // Managers
        this.sceneManager = new SceneManager();
        this.materialManager = new MaterialManager();
        this.csgEngine = new CSGEngine();
        this.extrusionBuilder = new ExtrusionBuilder();
        this.stlExporter = new STLExporter(this.log);

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
        });

        // Add minimal on-canvas controls (material + wireframe + edges)
        this.initMaterialControls();

        // Add wireframe toggle button
        this.addWireframeToggle();

        // Add CSG mode toggle
        this.addCSGModeToggle();

        // Removed test UI: extrude version selector and compare toggle

        // Add Stats widget
        this.sceneManager.addStatsWidget(
            typeof window !== "undefined" && window.Stats ? window.Stats : null
        );

        // Start animation loop
        this.animate();

        this.log.info("Initialized successfully");
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

            // Create panel geometry
            const geometry = new THREE.BoxGeometry(width, height, thickness);
            const material = this.materialManager.createMaterial(
                this.materialManager.getCurrentMaterialKey()
            );
            this.panelMesh = new THREE.Mesh(geometry, material);
            this.panelMesh.castShadow = true;
            this.panelMesh.receiveShadow = true;
            this.panelMesh.position.set(0, height / 2, 0);
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
            this.log.error("partFront element not found!");
            return;
        }

        // Get partFront position and size
        const partFrontX = parseFloat(partFront.getAttribute("x"));
        const partFrontY = parseFloat(partFront.getAttribute("y"));
        const partFrontWidth = parseFloat(partFront.getAttribute("width"));
        const partFrontHeight = parseFloat(partFront.getAttribute("height"));

        this.log.debug("partFront info:", {
            x: partFrontX,
            y: partFrontY,
            width: partFrontWidth,
            height: partFrontHeight,
        });

        for (const [bitIndex, bit] of uniqueBits.entries()) {
            this.log.debug(`Processing bit ${bitIndex}:`, {
                x: bit.x,
                y: bit.y,
                operation: bit.operation,
                name: bit.name,
            });

            // Find offset contour for this bit
            const bitContours = offsetContours.filter(
                (c) => c.bitIndex === bitIndex
            );

            if (bitContours.length === 0) {
                this.log.debug(`No contours found for bit ${bitIndex}`);
                continue;
            }

            // Get the main contour (not base offset)
            const contour = bitContours.find((c) => c.pass !== 0);
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

            // Parse path to get curves instead of points
            const pathCurves =
                this.extrusionBuilder.parsePathToCurves(pathData);
            if (pathCurves.length === 0) {
                this.log.debug(
                    `No curves found for bit ${bitIndex}:`,
                    pathData
                );
                continue;
            }

            this.log.debug(
                `Parsed ${pathCurves.length} curves for bit ${bitIndex}`
            );

            // Create 3D curve from path curves
            const curve3D = this.extrusionBuilder.createCurveFromCurves(
                pathCurves,
                partFrontX,
                partFrontY,
                partFrontWidth,
                partFrontHeight,
                bit.y,
                panelThickness,
                panelAnchor
            );

            // Add path visualization for debugging (thick colored line)
            const pathLine = this.extrusionBuilder.createPathVisualization(
                curve3D,
                bit.color
            );
            if (pathLine) {
                pathLine.userData.bitIndex = bitIndex;
                this.bitPathMeshes.push(pathLine);
                this.log.debug(`Added path visualization for bit ${bitIndex}`);
            }

            // Create bit profile shape
            const bitProfile = await this.extrusionBuilder.createBitProfile(
                bit.bitData
            );

            if (!bitProfile) {
                this.log.debug(`No bit profile created for bit ${bitIndex}`);
                continue;
            }

            // Extrude profile along curve - VC uses mitered, others use round
            let extrudeMeshes = [];
            const isVC = (bit.operation || "").toUpperCase() === "VC";
            const mode = isVC ? "mitered" : "round";
            this.log.info(
                `Bit ${bitIndex} op=${bit.operation || "unknown"} → ${mode}`
            );
            if (isVC) {
                const mesh = this.extrusionBuilder.extrudeAlongPath(
                    bitProfile,
                    curve3D,
                    bit.color
                );
                if (mesh) extrudeMeshes = [mesh];
            } else {
                const result = this.extrusionBuilder.extrudeAlongPathRound(
                    bitProfile,
                    curve3D,
                    bit.color
                );

                if (result) {
                    // New return shape: { mergedMesh, parts, cuttingPlanes }
                    if (result.mergedMesh) {
                        extrudeMeshes = [result.mergedMesh];
                    } else if (Array.isArray(result)) {
                        extrudeMeshes = result;
                    } else if (result.parts && Array.isArray(result.parts)) {
                        extrudeMeshes = result.parts;
                    }
                }
            }

            if (extrudeMeshes.length > 0) {
                extrudeMeshes.forEach((mesh) => {
                    mesh.userData.operation = bit.operation || "subtract";
                    mesh.userData.bitIndex = bitIndex;
                    this.bitExtrudeMeshes.push(mesh);
                    console.log(
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
                    `Created ${extrudeMeshes.length} extrude mesh(es) for bit ${bitIndex}`
                );
            } else {
                this.log.debug(
                    `Failed to create extrude mesh for bit ${bitIndex}`
                );
            }
        }
    }

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

    // Compute world-space bounding box for a mesh (or geometry with transform)
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
        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;

        commands?.forEach((cmd) => {
            const type = cmd[0].toUpperCase();
            const params = cmd
                .slice(1)
                .trim()
                .split(/[\s,]+/)
                .map(Number)
                .filter((n) => !isNaN(n));

            switch (type) {
                case "M": // Move to
                    if (params.length >= 2) {
                        currentX = params[0];
                        currentY = params[1];
                        startX = currentX;
                        startY = currentY;
                    }
                    break;
                case "L": // Line to
                    if (params.length >= 2) {
                        const x = params[0];
                        const y = params[1];
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(x, y, 0)
                            )
                        );
                        currentX = x;
                        currentY = y;
                    }
                    break;
                case "H": // Horizontal line
                    if (params.length >= 1) {
                        const x = params[0];
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(x, currentY, 0)
                            )
                        );
                        currentX = x;
                    }
                    break;
                case "V": // Vertical line
                    if (params.length >= 1) {
                        const y = params[0];
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(currentX, y, 0)
                            )
                        );
                        currentY = y;
                    }
                    break;
                case "C": // Cubic Bézier curve
                    if (params.length >= 6) {
                        const cp1x = params[0];
                        const cp1y = params[1];
                        const cp2x = params[2];
                        const cp2y = params[3];
                        const x = params[4];
                        const y = params[5];
                        curves.push(
                            new THREE.CubicBezierCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(cp1x, cp1y, 0),
                                new THREE.Vector3(cp2x, cp2y, 0),
                                new THREE.Vector3(x, y, 0)
                            )
                        );
                        currentX = x;
                        currentY = y;
                    }
                    break;
                case "Q": // Quadratic Bézier curve
                    if (params.length >= 4) {
                        const cpx = params[0];
                        const cpy = params[1];
                        const x = params[2];
                        const y = params[3];
                        curves.push(
                            new THREE.QuadraticBezierCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(cpx, cpy, 0),
                                new THREE.Vector3(x, y, 0)
                            )
                        );
                        currentX = x;
                        currentY = y;
                    }
                    break;
                case "A": // Arc (approximated as line for simplicity)
                    if (params.length >= 7) {
                        const x = params[5];
                        const y = params[6];
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(x, y, 0)
                            )
                        );
                        currentX = x;
                        currentY = y;
                    }
                    break;
                case "Z": // Close path
                    if (curves.length > 0) {
                        curves.push(
                            new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(startX, startY, 0)
                            )
                        );
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
            }
        });

        return curves;
    }

    /**
     * Create 3D curve from 2D path curves
     * Curves are in 2D canvas coordinates (from SVG offsetContour)
     * partFront defines the position and size of the front view in canvas space
     * Panel in 3D is positioned at (0, 0, 0) with front face at z=thickness/2
     */
    createCurveFromCurves(
        pathCurves,
        partFrontX,
        partFrontY,
        partFrontWidth,
        partFrontHeight,
        depth,
        panelThickness,
        panelAnchor
    ) {
        this.log.debug("Creating curve from curves:", {
            curvesCount: pathCurves.length,
            firstCurve: pathCurves[0],
            depth,
            panelThickness,
            panelAnchor,
        });

        // Create 3D versions of curves
        const curves3D = pathCurves
            .map((curve) => {
                if (curve instanceof THREE.LineCurve3) {
                    const v1 = this.convertPoint2DTo3D(
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
                    const v2 = this.convertPoint2DTo3D(
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
                } else if (curve instanceof THREE.CubicBezierCurve3) {
                    const v0 = this.convertPoint2DTo3D(
                        curve.v0.x,
                        curve.v0.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    const v1 = this.convertPoint2DTo3D(
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
                    const v2 = this.convertPoint2DTo3D(
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
                    const v3 = this.convertPoint2DTo3D(
                        curve.v3.x,
                        curve.v3.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    return new THREE.CubicBezierCurve3(v0, v1, v2, v3);
                } else if (curve instanceof THREE.QuadraticBezierCurve3) {
                    const v0 = this.convertPoint2DTo3D(
                        curve.v0.x,
                        curve.v0.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                    const v1 = this.convertPoint2DTo3D(
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
                    const v2 = this.convertPoint2DTo3D(
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
                    return new THREE.QuadraticBezierCurve3(v0, v1, v2);
                }
                // For unsupported curves, approximate with line
                return null;
            })
            .filter((c) => c !== null);

        this.log.debug("Sample 3D curves:", {
            first: curves3D[0],
            middle: curves3D[Math.floor(curves3D.length / 2)],
            last: curves3D[curves3D.length - 1],
        });

        // Create exact path using the curves
        const path = new THREE.CurvePath();
        curves3D.forEach((curve) => {
            path.add(curve);
        });

        return path;
    }

    /**
     * Convert 2D point to 3D coordinates
     * For CSG operations, extrudes need to pass completely through the panel
     */
    convertPoint2DTo3D(
        x2d,
        y2d,
        partFrontX,
        partFrontY,
        partFrontWidth,
        partFrontHeight,
        depth,
        panelThickness,
        panelAnchor
    ) {
        // Panel in 3D space:
        // - X=0 is horizontal center
        // - Y=0 is bottom of panel
        // - Z depends on anchor

        // Convert X: subtract partFront left edge, then center
        const x3d = x2d - partFrontX - partFrontWidth / 2;

        // Convert Y: path Y is in canvas space where Y increases downward
        // partFrontY is the top of the front view rectangle
        // In 3D, Y=0 is bottom and increases upward
        // Adjust based on panel anchor
        const partFrontBottom = partFrontY + partFrontHeight;
        let y3d = partFrontBottom - y2d;

        // For bottom-left anchor, invert Y (material bottom becomes Y=0)
        if (panelAnchor === "bottom-left") {
            y3d = y2d - partFrontY;
        }

        // Z: For CSG operations, extrudes should pass completely through the panel
        // Panel Z ranges from -panelThickness/2 to +panelThickness/2
        // So we make extrude go from -panelThickness to +panelThickness to ensure it crosses the whole panel
        //let z3d = 0; // center at panel center by default
        // Z: depth into material from the anchor surface
        let z3d;
        if (panelAnchor === "top-left") {
            // From front surface inward
            z3d = depth - panelThickness / 2;
        } else if (panelAnchor === "bottom-left") {
            // From back surface inward
            z3d = depth + panelThickness / 2;
        } else {
            // Default to front
            z3d = -depth;
        }

        // For proper CSG subtraction, the extrude needs to extend well beyond the panel
        // This will be handled by the ProfiledContourGeometry which creates the 3D shape
        // The actual depth positioning will depend on the bit profile height

        return new THREE.Vector3(x3d, y3d, z3d);
    }

    /**
     * Create path visualization for debugging
     * Shows the exact path as a colored line
     */
    createPathVisualization(curve, color) {
        try {
            // Get points from the curve
            const points = curve.getPoints(200); // Get 200 points along the path

            // Create line geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            // Create line material (thick colored line)
            const material = new THREE.LineBasicMaterial({
                color: new THREE.Color(color || "#ff0000"),
                linewidth: 3, // Note: linewidth > 1 may not work on all platforms
                opacity: 0.8,
                transparent: true,
            });

            // Create line object
            const line = new THREE.Line(geometry, material);

            this.log.debug(
                "Created path visualization with",
                points.length,
                "points"
            );

            return line;
        } catch (error) {
            this.log.error("Error creating path visualization:", error);
            return null;
        }
    }

    /**
     * Create bit profile shape based on bit type
     */
    async createBitProfile(bitData) {
        // If bitData has a profilePath (SVG path), use SVGLoader
        if (bitData.profilePath) {
            try {
                const svgString = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${bitData.profilePath}"/></svg>`;
                const dataUrl = "data:image/svg+xml;base64," + btoa(svgString);
                const loader = new SVGLoader();

                return new Promise((resolve, reject) => {
                    loader.load(
                        dataUrl,
                        (data) => {
                            const shapes = SVGLoader.createShapes(
                                data.paths[0]
                            );
                            if (shapes.length > 0) {
                                let shape = shapes[0];
                                // No rotation needed here, rotation is done in ProfiledContourGeometry
                                resolve(shape);
                            } else {
                                resolve(this.createFallbackShape(bitData));
                            }
                        },
                        undefined,
                        (error) => {
                            this.log.error("Error loading SVG:", error);
                            resolve(this.createFallbackShape(bitData));
                        }
                    );
                });
            } catch (error) {
                this.log.error("Error parsing SVG profile:", error);
                return this.createFallbackShape(bitData);
            }
        }

        // Fallback to circular profile
        return this.createFallbackShape(bitData);
    }

    /**
     * Create fallback circular shape
     */
    createFallbackShape(bitData) {
        const diameter = bitData.diameter || 10;
        const radius = diameter / 2;

        const shape = new THREE.Shape();
        const segments = 32;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }

        return shape;
    }

    /**
     * Rotate a Shape by the given angle
     */
    rotateShape(shape, angle) {
        const points = shape.getPoints(200); // Get points along the shape
        const rotatedPoints = points.map((point) => {
            const x = point.x;
            const y = point.y;
            // Rotate 90 degrees: x' = y, y' = -x
            const newX = y;
            const newY = -x;
            return new THREE.Vector2(newX, newY);
        });

        const newShape = new THREE.Shape();
        newShape.setFromPoints(rotatedPoints);
        return newShape;
    }

    /**
     * Extrude profile along path using TubeGeometry
     */
    extrudeAlongPath(profile, curve, color) {
        try {
            // Get contour points from the curve
            const segments = Math.max(50, Math.floor(curve.getLength() / 5));
            const contourPoints = curve.getPoints(segments);

            // Convert Vector3 to Vector2 for ProfiledContourGeometry
            let contour = contourPoints.map(
                (p) => new THREE.Vector3(p.x, p.y, p.z)
            );

            // Determine if the path is closed
            // Check if first and last points are close enough
            const firstPoint = contour[0];
            const lastPoint = contour[contour.length - 1];
            const contourClosed = firstPoint.distanceTo(lastPoint) < 0.01;

            // For closed contours, remove the duplicate last point
            if (contourClosed && contour.length > 1) {
                contour = contour.slice(0, -1);
            }

            this.log.debug("Extruding with mitered corners:", {
                profilePoints: profile.getPoints().length,
                contourPoints: contour.length,
                contourClosed,
                curveLength: curve.getLength(),
            });

            // Use ProfiledContourGeometry for mitered corners
            const geometry = this.ProfiledContourGeometry(
                profile,
                contour,
                contourClosed
            );

            // Check if geometry was created successfully
            if (!geometry) {
                throw new Error("Failed to create ProfiledContourGeometry");
            }

            // Log geometry info before modifications
            this.log.debug("ProfiledContourGeometry created:", {
                vertices: geometry.attributes.position.count,
                hasNormals: !!geometry.attributes.normal,
                hasUV: !!geometry.attributes.uv,
                indexCount: geometry.index ? geometry.index.count : 0,
            });

            // For CSG operations: ensure geometry extends through the entire panel thickness
            const panelThickness = 19; // Approximate panel thickness - should match panel
            const zExtension = panelThickness * 2; // Extend Z to ensure it passes through panel

            // Expand Z bounds of the geometry for better CSG intersection
            const positions = geometry.attributes.position;
            if (positions) {
                const posArray = positions.array;
                for (let i = 2; i < posArray.length; i += 3) {
                    // Ensure Z coordinates are extended
                    if (posArray[i] < -zExtension / 2) {
                        posArray[i] = -zExtension / 2;
                    }
                    if (posArray[i] > zExtension / 2) {
                        posArray[i] = zExtension / 2;
                    }
                }
                positions.needsUpdate = true;
            }
            geometry.computeBoundingBox();

            // Recalculate normals after modifying positions
            // This ensures faces are properly oriented
            geometry.computeVertexNormals();
            geometry.normalizeNormals();

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.FrontSide, // Only render front faces for proper shading
                wireframe: this.materialManager.isWireframeEnabled(),
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            return mesh;
        } catch (error) {
            this.log.error("Error extruding along path:", error.message);
            this.log.error("Error stack:", error.stack);
            this.log.error(
                "ProfiledContourGeometry function:",
                this.ProfiledContourGeometry.toString().substring(0, 200)
            );
            return null;
        }
    }

    /**
     * Create profiled contour geometry with mitered corners
     * Based on https://jsfiddle.net/prisoner849/bygy1xkt/
     */
    ProfiledContourGeometry(profileShape, contour, contourClosed) {
        try {
            contourClosed = contourClosed !== undefined ? contourClosed : true;

            let profileGeometry = new THREE.ShapeGeometry(profileShape);
            profileGeometry.rotateX(-Math.PI * 0.5);
            let profile = profileGeometry.attributes.position;

            let profilePoints = new Float32Array(
                profile.count * contour.length * 3
            );

            for (let i = 0; i < contour.length; i++) {
                let v1 = new THREE.Vector2().subVectors(
                    contour[i - 1 < 0 ? contour.length - 1 : i - 1],
                    contour[i]
                );
                let v2 = new THREE.Vector2().subVectors(
                    contour[i + 1 == contour.length ? 0 : i + 1],
                    contour[i]
                );
                let angle = v2.angle() - v1.angle();
                let halfAngle = angle * 0.5;

                let hA = halfAngle;
                let tA = v2.angle() + Math.PI * 0.5;
                if (!contourClosed) {
                    if (i == 0 || i == contour.length - 1) {
                        hA = Math.PI * 0.5;
                    }
                    if (i == contour.length - 1) {
                        tA = v1.angle() - Math.PI * 0.5;
                    }
                }

                let shift = Math.tan(hA - Math.PI * 0.5);
                let shiftMatrix = new THREE.Matrix4().set(
                    1,
                    0,
                    0,
                    0,
                    -shift,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1
                );

                let tempAngle = tA;
                let rotationMatrix = new THREE.Matrix4().set(
                    Math.cos(tempAngle),
                    -Math.sin(tempAngle),
                    0,
                    0,
                    Math.sin(tempAngle),
                    Math.cos(tempAngle),
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1
                );

                let translationMatrix = new THREE.Matrix4().set(
                    1,
                    0,
                    0,
                    contour[i].x,
                    0,
                    1,
                    0,
                    contour[i].y,
                    0,
                    0,
                    1,
                    contour[i].z,
                    0,
                    0,
                    0,
                    1
                );

                let cloneProfile = profile.clone();
                cloneProfile.applyMatrix4(shiftMatrix);
                cloneProfile.applyMatrix4(rotationMatrix);
                cloneProfile.applyMatrix4(translationMatrix);

                profilePoints.set(
                    cloneProfile.array,
                    cloneProfile.count * i * 3
                );
            }

            let fullProfileGeometry = new THREE.BufferGeometry();
            fullProfileGeometry.setAttribute(
                "position",
                new THREE.BufferAttribute(profilePoints, 3)
            );
            let index = [];

            let lastCorner =
                contourClosed == false ? contour.length - 1 : contour.length;
            for (let i = 0; i < lastCorner; i++) {
                for (let j = 0; j < profile.count; j++) {
                    let currCorner = i;
                    let nextCorner = i + 1 == contour.length ? 0 : i + 1;
                    let currPoint = j;
                    let nextPoint = j + 1 == profile.count ? 0 : j + 1;

                    let a = nextPoint + profile.count * currCorner;
                    let b = currPoint + profile.count * currCorner;
                    let c = currPoint + profile.count * nextCorner;
                    let d = nextPoint + profile.count * nextCorner;

                    // Ensure consistent winding order for normals pointing outward
                    // Counter-clockwise when viewed from outside
                    index.push(a, d, b);
                    index.push(b, d, c);
                }
            }

            fullProfileGeometry.setIndex(index);
            fullProfileGeometry.computeVertexNormals();

            // Ensure normals point outward for proper shading
            // This is crucial for CSG operations and visibility
            fullProfileGeometry.normalizeNormals();

            return fullProfileGeometry;
        } catch (error) {
            this.log.error("Error in ProfiledContourGeometry:", error);
            // Fallback to simple box geometry
            return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    // Compute world-space bounding box for a mesh (or geometry with transform)
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
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

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

        // Always export panel mesh when present
        if (this.panelMesh) {
            meshesToExport.push(this.panelMesh);
        }

        // Always export raw extrude pieces (segments + lathes), excluding debug cutting planes
        if (this.bitExtrudeMeshes && this.bitExtrudeMeshes.length) {
            const filtered = this.bitExtrudeMeshes.filter(
                (m) => !m.userData?.isCuttingPlane
            );
            meshesToExport.push(...filtered);
            this.log.info(
                `Exporting raw extrudes (segments + lathes): ${filtered.length} meshes`
            );
        }

        // If CSG is active, also export the final part mesh as a separate body
        if (this.csgEngine.isActive() && this.csgEngine.partMesh) {
            meshesToExport.push(this.csgEngine.partMesh);
            this.log.info(
                "Exporting Part view (CSG result mesh) as separate body"
            );
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
