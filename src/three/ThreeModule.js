import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { ADDITION, Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import BaseModule from "../core/BaseModule.js";

export default class ThreeModule extends BaseModule {
    constructor() {
        super();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container = null;
        this.animationFrameId = null;

        // Panel mesh
        this.panelMesh = null;

        // Track if CSG (part view) is active
        this.csgActive = false;

        // Materials registry and current mode
        this.materialRegistry = {
            shaded: {
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 0.8,
                        metalness: 0.1,
                        wireframe: false,
                    }),
            },
            shadedEdges: {
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 0.75,
                        metalness: 0.25,
                        wireframe: false,
                    }),
            },
            wireframe: {
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 1,
                        metalness: 0,
                        wireframe: true,
                    }),
            },
            clay: {
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xbfb6aa,
                        roughness: 0.95,
                        metalness: 0.05,
                        wireframe: false,
                    }),
            },
            metal: {
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xcccccc,
                        roughness: 0.25,
                        metalness: 0.9,
                        wireframe: false,
                    }),
            },
            glass: {
                enabled: true,
                factory: () =>
                    new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        roughness: 0,
                        metalness: 0,
                        transmission: 0.6,
                        transparent: true,
                        opacity: 0.4,
                        ior: 1.4,
                        thickness: 10,
                        wireframe: false,
                    }),
            },
        };
        this.currentMaterialKey = "shaded";

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

        // Lighting
        this.lights = {};

        // Wireframe mode
        this.wireframeMode = false;

        // Camera fitted flag
        this.cameraFitted = false;

        // CSG related
        this.partMesh = null;
        this.basePanelMesh = null;
        this.lastCSGSignature = null;
        this.panelBBox = null;
        this.csgVisible = false;
        this.csgBusy = false;
        this.csgQueuedApply = null;
        this.useUnionBeforeSubtract = true;
        this.stats = null;

        // Serialize updatePanel calls to avoid overlapping builds
        this.updatePanelRunning = false;
        this.updatePanelQueuedArgs = null;

        // Track last panel/bits signature to skip redundant rebuilds
        this.lastPanelUpdateSignature = null;

        // Independent toggles
        this.edgesEnabled = false; // overlay edge lines off by default
    }

    async init() {
        console.log("ThreeModule: Initializing...");
        this.container = document.getElementById("three-canvas-container");

        if (!this.container) {
            console.error("ThreeModule: Container not found");
            return;
        }

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);

        // Create camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
        this.camera.position.set(0, 400, 600);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Add minimal on-canvas controls (material + wireframe + edges)
        this.initMaterialControls();

        // Create controls
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 2000;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Setup lighting
        this.setupLighting();

        // Add grid helper
        this.addGridHelper();

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(200);
        this.scene.add(axesHelper);

        // Handle window resize
        window.addEventListener("resize", this.onWindowResize.bind(this));

        // Add wireframe toggle button
        this.addWireframeToggle();

        // Add CSG mode toggle
        this.addCSGModeToggle();

        // Add Stats widget
        this.addStatsWidget();

        // Start animation loop
        this.animate();

        console.log("ThreeModule: Initialized successfully");
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
            Object.entries(this.materialRegistry)
                .filter(([, entry]) => entry.enabled !== false)
                .forEach(([key]) => {
                    const opt = document.createElement("option");
                    opt.value = key;
                    opt.textContent = key;
                    select.appendChild(opt);
                });
            select.value = this.currentMaterialKey;
            select.addEventListener("change", () => {
                this.setMaterialMode(select.value);
            });

            // Wireframe toggle (mesh wireframe)
            const wfLabel = document.createElement("label");
            wfLabel.style.display = "flex";
            wfLabel.style.alignItems = "center";
            wfLabel.style.gap = "4px";
            const wf = document.createElement("input");
            wf.type = "checkbox";
            wf.checked = this.wireframeMode;
            wf.title = "Wireframe Mesh";
            wf.addEventListener("change", () => {
                this.toggleWireframe();
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
            ed.checked = this.edgesEnabled;
            ed.title = "Edges Overlay";
            ed.addEventListener("change", () => {
                this.setEdgesEnabled(ed.checked);
            });
            const edText = document.createElement("span");
            edText.textContent = "Edges";
            edLabel.appendChild(ed);
            edLabel.appendChild(edText);

            wrap.appendChild(select);
            wrap.appendChild(wfLabel);
            wrap.appendChild(edLabel);

            // Position wrap inside container (over renderer)
            this.container.style.position = "relative";
            this.container.appendChild(wrap);
            this.materialControls = { wrap, select, wf, ed };
        } catch (e) {
            console.warn("Failed to init material controls:", e);
        }
    }

    setEdgesEnabled(enabled) {
        this.edgesEnabled = enabled;
        // Toggle existing edge overlays if present
        if (this.panelMesh && this.panelMesh.userData.edgeLines) {
            this.panelMesh.userData.edgeLines.visible =
                enabled && this.panelMesh.visible;
        }
        if (this.partMesh && this.partMesh.userData.edgeLines) {
            this.partMesh.userData.edgeLines.visible =
                enabled && this.partMesh.visible;
        }
        // Create overlays on demand if enabled
        if (enabled) {
            if (this.panelMesh && !this.panelMesh.userData.edgeLines) {
                this.addEdgeVisualization(this.panelMesh);
            }
            if (this.partMesh && !this.partMesh.userData.edgeLines) {
                this.addEdgeVisualization(this.partMesh);
            }
        }
    }

    setupLighting() {
        // Ambient light
        this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.lights.ambient);

        // Directional light (sun)
        this.lights.directional = new THREE.DirectionalLight(0xffffff, 0.8);
        this.lights.directional.position.set(200, 400, 300);
        this.lights.directional.castShadow = true;
        this.lights.directional.shadow.camera.near = 0.1;
        this.lights.directional.shadow.camera.far = 1500;
        this.lights.directional.shadow.camera.left = -500;
        this.lights.directional.shadow.camera.right = 500;
        this.lights.directional.shadow.camera.top = 500;
        this.lights.directional.shadow.camera.bottom = -500;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.scene.add(this.lights.directional);

        // Hemisphere light for better ambient
        this.lights.hemisphere = new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            0.4
        );
        this.lights.hemisphere.position.set(0, 200, 0);
        this.scene.add(this.lights.hemisphere);
    }

    addGridHelper() {
        const gridSize = 1000;
        const gridDivisions = 50;
        const gridHelper = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            0x888888,
            0xcccccc
        );
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);
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
            this.useUnionBeforeSubtract = checkbox.checked;
            console.log(
                "CSG mode changed to:",
                this.useUnionBeforeSubtract ? "Union" : "Sequential"
            );
            // Invalidate cache to force recalculation
            this.lastCSGSignature = null;
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

    addStatsWidget() {
        // Check if Stats is available
        if (typeof Stats === "undefined") {
            console.warn("Stats.js not loaded, skipping stats widget");
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

    toggleWireframe() {
        this.wireframeMode = !this.wireframeMode;

        // Update all materials
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((mat) => {
                        mat.wireframe = this.wireframeMode;
                    });
                } else {
                    object.material.wireframe = this.wireframeMode;
                }
            }
        });

        // Update button style
        if (this.wireframeToggleBtn) {
            this.wireframeToggleBtn.style.backgroundColor = this.wireframeMode
                ? "rgba(0, 191, 255, 0.9)"
                : "rgba(255, 255, 255, 0.9)";
        }
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
        console.log("ThreeModule: Updating panel", {
            width,
            height,
            thickness,
            bits: bits.length,
        });

        try {
            const nextSignature = this.buildPanelBitsSignature(
                width,
                height,
                thickness,
                bits,
                panelAnchor
            );

            if (this.lastPanelUpdateSignature === nextSignature) {
                console.log(
                    "updatePanel: signature unchanged, skipping rebuild"
                );
                return;
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
                // Always remove edge visualization
                if (this.panelMesh.userData.edgeLines) {
                    this.scene.remove(this.panelMesh.userData.edgeLines);
                    this.panelMesh.userData.edgeLines.geometry?.dispose();
                    this.panelMesh.userData.edgeLines.material?.dispose();
                }
                this.panelMesh = null;
            }
            if (this.partMesh) {
                this.partMesh.visible = false;
                if (this.partMesh.userData.edgeLines) {
                    this.partMesh.userData.edgeLines.visible = false;
                }
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
            const materialEntry =
                this.materialRegistry[this.currentMaterialKey];
            const material = materialEntry
                ? materialEntry.factory()
                : new THREE.MeshStandardMaterial({
                      color: 0xdeb887, // BurlyWood color
                      roughness: 0.8,
                      metalness: 0.1,
                  });
            material.wireframe = this.wireframeMode;
            this.panelMesh = new THREE.Mesh(geometry, material);
            this.panelMesh.castShadow = true;
            this.panelMesh.receiveShadow = true;
            this.panelMesh.position.set(0, height / 2, 0);
            this.basePanelMesh = this.panelMesh;

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
            console.log("Original panel data saved at creation");

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
            this.fitCameraToPanel(width, height, thickness);

            // Add meshes to scene (will apply CSG later if needed)
            console.log(
                "updatePanel: Adding panel mesh and bit meshes to scene",
                {
                    bitPathLinesCount: this.bitPathMeshes.length,
                    bitExtrudeMeshesCount: this.bitExtrudeMeshes.length,
                    bitsVisible: window.bitsVisible,
                    showPart: window.showPart,
                }
            );

            this.scene.add(this.panelMesh);

            // Only add bit meshes if they should be visible
            // In Part view, they will be hidden by applyCSGOperation()
            if (window.bitsVisible !== false) {
                console.log("updatePanel: Adding bit meshes to scene", {
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
                console.log("updatePanel: Bits not visible, hiding bit meshes");
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
            console.error("ThreeModule: updatePanel failed", error);
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

        console.log("ThreeModule: Creating bit path extrusions", {
            bitsCount: bits.length,
            uniqueBitsCount: uniqueBits.length,
        });

        // Get offset contours from the main canvas
        const offsetContours = window.offsetContours || [];

        // Get partFront element to understand its position
        const partFront = document.getElementById("part-front");
        if (!partFront) {
            console.error("partFront element not found!");
            return;
        }

        // Get partFront position and size
        const partFrontX = parseFloat(partFront.getAttribute("x"));
        const partFrontY = parseFloat(partFront.getAttribute("y"));
        const partFrontWidth = parseFloat(partFront.getAttribute("width"));
        const partFrontHeight = parseFloat(partFront.getAttribute("height"));

        console.log("partFront info:", {
            x: partFrontX,
            y: partFrontY,
            width: partFrontWidth,
            height: partFrontHeight,
        });

        for (const [bitIndex, bit] of uniqueBits.entries()) {
            console.log(`Processing bit ${bitIndex}:`, {
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
                console.log(`No contours found for bit ${bitIndex}`);
                continue;
            }

            // Get the main contour (not base offset)
            const contour = bitContours.find((c) => c.pass !== 0);
            if (!contour || !contour.element) {
                console.log(`No valid contour element for bit ${bitIndex}`);
                continue;
            }

            // Get path data from SVG path element
            const pathElement = contour.element;
            const pathData = pathElement.getAttribute("d");

            if (!pathData) {
                console.log(`No path data for bit ${bitIndex}`);
                continue;
            }

            console.log(
                `Path data for bit ${bitIndex}:`,
                pathData.substring(0, 100) + "..."
            );

            // Parse path to get curves instead of points
            const pathCurves = this.parsePathToCurves(pathData);
            if (pathCurves.length === 0) {
                console.log(`No curves found for bit ${bitIndex}:`, pathData);
                continue;
            }

            console.log(
                `Parsed ${pathCurves.length} curves for bit ${bitIndex}`
            );

            // Create 3D curve from path curves
            const curve3D = this.createCurveFromCurves(
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
            const pathLine = this.createPathVisualization(curve3D, bit.color);
            if (pathLine) {
                pathLine.userData.bitIndex = bitIndex;
                this.bitPathMeshes.push(pathLine);
                console.log(`Added path visualization for bit ${bitIndex}`);
            }

            // Create bit profile shape
            const bitProfile = await this.createBitProfile(bit.bitData);

            if (!bitProfile) {
                console.log(`No bit profile created for bit ${bitIndex}`);
                continue;
            }

            // Extrude profile along curve
            const extrudeMesh = this.extrudeAlongPath(
                bitProfile,
                curve3D,
                bit.color
            );

            if (extrudeMesh) {
                extrudeMesh.userData.operation = bit.operation || "subtract";
                extrudeMesh.userData.bitIndex = bitIndex;
                this.bitExtrudeMeshes.push(extrudeMesh);
                console.log(`Created extrude mesh for bit ${bitIndex}`);
            } else {
                console.log(
                    `Failed to create extrude mesh for bit ${bitIndex}`
                );
            }
        }
    }

    /**
     * Parse SVG path data to array of THREE.Curve objects
     */
    parsePathToCurves(pathData) {
        const curves = [];
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);

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
        console.log("Creating curve from curves:", {
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

        console.log("Sample 3D curves:", {
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

            console.log(
                "Created path visualization with",
                points.length,
                "points"
            );

            return line;
        } catch (error) {
            console.error("Error creating path visualization:", error);
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
                            console.error("Error loading SVG:", error);
                            resolve(this.createFallbackShape(bitData));
                        }
                    );
                });
            } catch (error) {
                console.error("Error parsing SVG profile:", error);
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

            console.log("Extruding with mitered corners:", {
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
            console.log("ProfiledContourGeometry created:", {
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
                wireframe: this.wireframeMode,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            return mesh;
        } catch (error) {
            console.error("Error extruding along path:", error.message);
            console.error("Error stack:", error.stack);
            console.error(
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
            console.error("Error in ProfiledContourGeometry:", error);
            // Fallback to simple box geometry
            return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    /**
     * Toggle visibility of bit meshes
     */
    toggleBitMeshesVisibility(visible) {
        console.log("toggleBitMeshesVisibility called with visible:", visible);
        this.bitPathMeshes.forEach((mesh) => {
            mesh.visible = visible;
        });
        this.bitExtrudeMeshes.forEach((mesh) => {
            mesh.visible = visible;
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

    buildCSGSignature(bitMeshes = []) {
        const panelSignature = {
            geometry: this.originalPanelGeometry?.uuid,
            position: this.originalPanelPosition
                ? this.originalPanelPosition.toArray()
                : null,
            rotation: this.originalPanelRotation
                ? [
                      this.originalPanelRotation.x,
                      this.originalPanelRotation.y,
                      this.originalPanelRotation.z,
                  ]
                : null,
            scale: this.originalPanelScale
                ? this.originalPanelScale.toArray()
                : null,
        };

        const bits = bitMeshes.map((mesh) => ({
            geometry: mesh.geometry?.uuid,
            position: mesh.position.toArray(),
            rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
            scale: mesh.scale.toArray(),
            operation: mesh.userData?.operation,
        }));

        return JSON.stringify({ panel: panelSignature, bits });
    }

    filterIntersectingExtrudes(panelBBox) {
        if (!panelBBox) return [];

        const intersecting = [];
        this.bitExtrudeMeshes.forEach((mesh, idx) => {
            if (!mesh.geometry) {
                console.warn(`Bit mesh ${idx} missing geometry, skipping`);
                return;
            }

            const bbox = this.computeWorldBBox(
                mesh.geometry,
                mesh.position,
                mesh.rotation,
                mesh.scale
            );

            if (bbox.intersectsBox(panelBBox)) {
                intersecting.push(mesh);
            } else {
                console.log(`Bit mesh ${idx} culls out of panel bounds`);
            }
        });

        return intersecting;
    }

    showBasePanel() {
        if (this.panelMesh) {
            this.panelMesh.visible = true;
            if (this.edgesEnabled) {
                if (!this.panelMesh.userData.edgeLines) {
                    this.addEdgeVisualization(this.panelMesh);
                } else {
                    this.panelMesh.userData.edgeLines.visible = true;
                }
            } else if (this.panelMesh.userData.edgeLines) {
                this.panelMesh.userData.edgeLines.visible = false;
            }
        }

        if (this.partMesh) {
            this.partMesh.visible = false;
            if (this.partMesh.userData.edgeLines) {
                this.partMesh.userData.edgeLines.visible = false;
            }
        }

        this.bitPathMeshes.forEach((mesh) => {
            mesh.visible = window.bitsVisible !== false;
        });
        this.bitExtrudeMeshes.forEach((mesh) => {
            mesh.visible = window.bitsVisible !== false;
        });

        this.csgVisible = false;
    }

    showCSGResult() {
        if (this.panelMesh) {
            this.panelMesh.visible = false;
            if (this.panelMesh.userData.edgeLines) {
                this.panelMesh.userData.edgeLines.visible = false;
            }
        }

        if (this.partMesh) {
            if (!this.scene.children.includes(this.partMesh)) {
                this.scene.add(this.partMesh);
            }
            this.partMesh.visible = true;
            if (this.edgesEnabled) {
                if (!this.partMesh.userData.edgeLines) {
                    this.addEdgeVisualization(this.partMesh);
                } else {
                    this.partMesh.userData.edgeLines.visible = true;
                }
            } else if (this.partMesh.userData.edgeLines) {
                this.partMesh.userData.edgeLines.visible = false;
            }
        }

        this.bitPathMeshes.forEach((mesh) => {
            mesh.visible = false;
        });
        this.bitExtrudeMeshes.forEach((mesh) => {
            mesh.visible = false;
        });

        this.csgVisible = true;
    }

    // Update current material mode and apply to panel (and CSG result)
    setMaterialMode(modeKey) {
        const entry = this.materialRegistry[modeKey];
        if (!entry || entry.enabled === false) {
            console.warn("Material mode not available:", modeKey);
            return;
        }
        this.currentMaterialKey = modeKey;
        const mat = entry.factory();
        mat.wireframe = this.wireframeMode;

        // Update original material reference for restoration
        this.originalPanelMaterial = mat.clone();

        if (this.panelMesh) {
            if (this.panelMesh.material) this.panelMesh.material.dispose();
            this.panelMesh.material = mat.clone();
        }

        if (this.partMesh) {
            if (this.partMesh.material) this.partMesh.material.dispose();
            const pm = entry.factory();
            pm.wireframe = this.wireframeMode;
            this.partMesh.material = pm;
        }
    }

    // Allow external registration or enable/disable materials
    registerMaterial(modeKey, factory, enabled = true) {
        this.materialRegistry[modeKey] = { factory, enabled };
    }

    /**
     * Add edge visualization to a mesh (shows wireframe edges with solid color)
     * Creates both visible edges and enhances material for better depth perception
     */
    addEdgeVisualization(mesh) {
        try {
            if (!this.edgesEnabled) return;
            // Create edges from the geometry
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const lineSegments = new THREE.LineSegments(
                edges,
                new THREE.LineBasicMaterial({
                    color: 0x333333, // Dark gray edges
                    linewidth: 1,
                    transparent: true,
                    opacity: 0.6,
                })
            );

            // Copy position/rotation/scale from the mesh
            lineSegments.position.copy(mesh.position);
            lineSegments.rotation.copy(mesh.rotation);
            lineSegments.scale.copy(mesh.scale);

            // Add to scene and to mesh for later cleanup
            this.scene.add(lineSegments);
            mesh.userData.edgeLines = lineSegments;

            // Keep material properties as-is; edges overlay is independent

            console.log("Added edge visualization to mesh");
        } catch (error) {
            console.error("Error adding edge visualization:", error);
        }
    }

    /**
     * Apply or remove CSG boolean operation (subtract bits from panel)
     * Logic: Toggle between original panel (apply=false) and panel with subtracted bits (apply=true)
     * - When apply=true: Create fresh CSG from original panel + current bits
     * - When apply=false: Restore original panel (no accumulation of subtractions)
     */
    applyCSGOperation(apply) {
        console.log(
            "applyCSGOperation called with apply:",
            apply,
            "bitExtrudeMeshes count:",
            this.bitExtrudeMeshes.length
        );

        // Block CSG during active drag to prevent broken topology
        if (window.isDraggingBit) {
            console.log("CSG blocked: drag in progress");
            this.csgQueuedApply = apply;
            return;
        }

        // Prevent overlapping CSG runs (rapid mouse moves / table drags)
        if (this.csgBusy) {
            this.partMesh.visible = false;
            if (this.partMesh.userData.edgeLines) {
                this.partMesh.userData.edgeLines.visible = false;
            }
            return;
        }

        // Update panel bbox if missing
        if (!this.panelBBox) {
            this.panelBBox = this.computeWorldBBox(
                this.originalPanelGeometry,
                this.originalPanelPosition,
                this.originalPanelRotation,
                this.originalPanelScale
            );
        }

        try {
            if (!apply) {
                console.log("Restoring base panel (Material view)");
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            // ===== PART VIEW: Apply CSG subtraction from original panel =====
            console.log(
                "Applying CSG with optimized filtering/caching from original panel"
            );
            console.log("CSG Operation Start:", {
                timestamp: Date.now(),
                mode: this.useUnionBeforeSubtract ? "Union" : "Sequential",
                totalBits: this.bitExtrudeMeshes.length,
            });

            if (!this.bitExtrudeMeshes.length) {
                console.warn("No extrude meshes available, showing base panel");
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            // Cull non-intersecting bits first
            const intersectingMeshes = this.filterIntersectingExtrudes(
                this.panelBBox
            );
            // Deduplicate by logical bit identity (bitIndex) to avoid double subtraction
            const uniqueIntersectingMeshes = [];
            const seenByBit = new Set();
            // Iterate from end to prefer latest-created mesh per bit
            for (let i = intersectingMeshes.length - 1; i >= 0; i--) {
                const m = intersectingMeshes[i];
                const key = m.userData?.bitIndex ?? m.geometry?.uuid ?? m.uuid;
                if (!seenByBit.has(key)) {
                    seenByBit.add(key);
                    uniqueIntersectingMeshes.unshift(m);
                }
            }
            const csgSignature = this.buildCSGSignature(
                uniqueIntersectingMeshes
            );

            if (
                this.csgActive &&
                this.partMesh &&
                this.lastCSGSignature === csgSignature
            ) {
                console.log("CSG signature unchanged - reusing cached result");
                this.showCSGResult();
                return;
            }

            if (uniqueIntersectingMeshes.length === 0) {
                console.warn(
                    "No intersecting bits with panel, skipping CSG subtraction"
                );
                this.lastCSGSignature = csgSignature;
                this.csgActive = false;
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            // Prepare base brush
            const panelBrush = new Brush(this.originalPanelGeometry.clone());
            const panelPosition =
                this.originalPanelPosition || new THREE.Vector3();
            const panelRotation =
                this.originalPanelRotation || new THREE.Euler();
            const panelScale =
                this.originalPanelScale || new THREE.Vector3(1, 1, 1);
            panelBrush.position.copy(panelPosition);
            panelBrush.rotation.copy(panelRotation);
            panelBrush.scale.copy(panelScale);
            panelBrush.updateMatrixWorld(true);

            const evaluator = new Evaluator();
            evaluator.attributes = ["position", "normal"];

            let resultBrush;
            let processed = 0;

            if (this.useUnionBeforeSubtract) {
                // MODE 1: Union all intersecting bits, then subtract once
                console.log("Using UNION mode: combining all bits first");
                console.time("CSG Union+Subtract");
                let unionBrush = null;

                uniqueIntersectingMeshes.forEach((bitMesh, idx) => {
                    try {
                        const bitBrush = new Brush(bitMesh.geometry);
                        bitBrush.position.copy(bitMesh.position);
                        bitBrush.rotation.copy(bitMesh.rotation);
                        bitBrush.scale.copy(bitMesh.scale);
                        bitBrush.updateMatrixWorld(true);

                        if (!unionBrush) {
                            unionBrush = bitBrush;
                        } else {
                            unionBrush = evaluator.evaluate(
                                unionBrush,
                                bitBrush,
                                ADDITION
                            );
                        }
                        processed++;
                    } catch (error) {
                        console.warn(
                            `Error building brush for bit ${idx}:`,
                            error.message
                        );
                    }
                });

                if (!unionBrush) {
                    console.warn(
                        "Failed to build union brush, showing base panel"
                    );
                    this.lastCSGSignature = csgSignature;
                    this.csgActive = false;
                    this.showBasePanel();
                    this.csgBusy = false;
                    return;
                }

                // Subtract the union from the panel in a single operation
                resultBrush = evaluator.evaluate(
                    panelBrush,
                    unionBrush,
                    SUBTRACTION
                );
            } else {
                // MODE 2: Sequential subtraction (no union)
                console.log(
                    "Using SEQUENTIAL mode: subtracting bits one by one"
                );
                console.time("CSG Sequential");
                resultBrush = panelBrush;

                for (const bitMesh of uniqueIntersectingMeshes) {
                    try {
                        const bitBrush = new Brush(bitMesh.geometry);
                        bitBrush.position.copy(bitMesh.position);
                        bitBrush.rotation.copy(bitMesh.rotation);
                        bitBrush.scale.copy(bitMesh.scale);
                        bitBrush.updateMatrixWorld(true);

                        resultBrush = evaluator.evaluate(
                            resultBrush,
                            bitBrush,
                            SUBTRACTION
                        );

                        if (!resultBrush) {
                            console.warn(
                                `Sequential subtraction failed at bit ${processed}`
                            );
                            break;
                        }
                        processed++;
                    } catch (error) {
                        console.warn(
                            `Error in sequential subtraction for bit ${processed}:`,
                            error.message
                        );
                        break;
                    }
                }
                console.timeEnd("CSG Sequential");
            }

            if (!resultBrush) {
                console.error(
                    "CSG subtraction failed, reverting to base panel"
                );
                this.lastCSGSignature = null;
                this.csgActive = false;
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            // Dispose previous CSG mesh if present
            if (this.partMesh) {
                if (this.partMesh.userData.edgeLines) {
                    this.scene.remove(this.partMesh.userData.edgeLines);
                    this.partMesh.userData.edgeLines.geometry?.dispose();
                    this.partMesh.userData.edgeLines.material?.dispose();
                }
                this.scene.remove(this.partMesh);
                this.partMesh.geometry?.dispose();
                this.partMesh.material?.dispose();
            }

            const materialEntry =
                this.materialRegistry[this.currentMaterialKey];
            const resultMaterial = materialEntry
                ? materialEntry.factory()
                : this.originalPanelMaterial.clone();
            resultMaterial.wireframe = this.wireframeMode;

            resultBrush.material = resultMaterial;
            resultBrush.castShadow = true;
            resultBrush.receiveShadow = true;

            this.partMesh = resultBrush;
            if (this.edgesEnabled) {
                this.addEdgeVisualization(resultBrush);
            }
            this.lastCSGSignature = csgSignature;
            this.csgActive = true;

            this.showCSGResult();

            console.log(
                `CSG applied successfully, processed ${processed} intersecting bits`
            );
            console.log("CSG Operation End:", {
                timestamp: Date.now(),
                success: true,
                bitsProcessed: processed,
            });
        } catch (error) {
            console.error("Error in applyCSGOperation:", error);
            console.log("CSG Operation End:", {
                timestamp: Date.now(),
                success: false,
                error: error.message,
            });
        } finally {
            this.csgBusy = false;
            if (this.csgQueuedApply !== null) {
                const queued = this.csgQueuedApply;
                this.csgQueuedApply = null;
                this.applyCSGOperation(queued);
            }
        }
    }

    /**
     * Fit camera to view the entire panel
     */
    fitCameraToPanel(width, height, thickness) {
        if (this.cameraFitted) return; // Don't reset camera position on every update

        const maxDim = Math.max(width, height, thickness);
        const distance = maxDim * 2;

        // Position camera to look at the front face of the panel
        this.camera.position.set(distance * 0.8, distance * 0.6, -distance);
        this.camera.lookAt(0, height / 2, thickness / 2);
        this.controls.target.set(0, height / 2, thickness / 2);
        this.controls.update();

        this.cameraFitted = true;
    }

    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        if (this.stats) this.stats.begin();

        if (this.controls) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        if (this.stats) this.stats.end();
    }

    /**
     * Add test shapes for CSG debugging
     * Creates simple geometric shapes on the scene
     */
    addTestShapes() {
        console.log("Adding test shapes for CSG debugging");

        // Create a simple cube as main object
        const cubeGeometry = new THREE.BoxGeometry(200, 200, 200);
        const cubeMaterial = new THREE.MeshStandardMaterial({
            color: 0xdeb887, // BurlyWood
            roughness: 0.8,
            metalness: 0.1,
        });
        const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cubeMesh.position.set(-300, 100, 0);
        cubeMesh.castShadow = true;
        cubeMesh.receiveShadow = true;
        this.scene.add(cubeMesh);
        this.testCubeMesh = cubeMesh;
        console.log("Added test cube at position (-300, 100, 0)");

        // Create a sphere to subtract from the cube
        const sphereGeometry = new THREE.SphereGeometry(60, 32, 32);
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6b6b, // Red
            roughness: 0.5,
            metalness: 0.2,
        });
        const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphereMesh.position.set(-300, 100, 0);
        sphereMesh.castShadow = true;
        sphereMesh.receiveShadow = true;
        this.scene.add(sphereMesh);
        this.testSphereMesh = sphereMesh;
        console.log("Added test sphere at position (-300, 100, 0)");

        // Create a cylinder to subtract
        const cylinderGeometry = new THREE.CylinderGeometry(40, 40, 150, 32);
        const cylinderMaterial = new THREE.MeshStandardMaterial({
            color: 0x4ecdc4, // Teal
            roughness: 0.5,
            metalness: 0.2,
        });
        const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinderMesh.position.set(-300, 100, 80);
        cylinderMesh.castShadow = true;
        cylinderMesh.receiveShadow = true;
        this.scene.add(cylinderMesh);
        this.testCylinderMesh = cylinderMesh;
        console.log("Added test cylinder at position (-300, 100, 80)");
    }

    /**
     * Toggle visualization of extrude meshes (for debugging CSG)
     */
    toggleExtrudeVisualization() {
        console.log("Toggling extrude visualization");
        this.bitExtrudeMeshes.forEach((mesh, idx) => {
            // Make meshes slightly transparent and visible if hidden
            mesh.visible = !mesh.visible;
            if (mesh.material) {
                mesh.material.opacity = mesh.visible ? 0.5 : 1.0;
                mesh.material.transparent = mesh.visible ? true : false;
            }
            console.log(`Extrude ${idx} visibility:`, mesh.visible);
        });
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

        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.controls) {
            this.controls.dispose();
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

        console.log("ThreeModule: Cleaned up");
    }
}
