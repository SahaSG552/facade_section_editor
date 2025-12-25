import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
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

        // Original panel data (before CSG operation) - for toggle
        this.originalPanelGeometry = null;
        this.originalPanelMaterial = null;
        this.originalPanelPosition = null;
        this.originalPanelRotation = null;
        this.originalPanelScale = null;

        // Bit path meshes (includes visualization and extrudes)
        this.bitPathMeshes = [];

        // Only extrude meshes for CSG operations
        this.bitExtrudeMeshes = [];

        // Lighting
        this.lights = {};

        // Wireframe mode
        this.wireframeMode = false;

        // Camera fitted flag
        this.cameraFitted = false;

        // CSG related
        this.partMesh = null;
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

        // Start animation loop
        this.animate();

        console.log("ThreeModule: Initialized successfully");
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
        console.log("ThreeModule: Updating panel", {
            width,
            height,
            thickness,
            bits: bits.length,
        });

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
            this.scene.remove(this.partMesh);
            this.partMesh.geometry.dispose();
            this.partMesh.material.dispose();
            this.partMesh = null;
        }
        this.bitPathMeshes.forEach((mesh) => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.bitPathMeshes = [];
        this.bitExtrudeMeshes = [];

        // Create panel geometry
        const geometry = new THREE.BoxGeometry(width, height, thickness);
        const material = new THREE.MeshStandardMaterial({
            color: 0xdeb887, // BurlyWood color
            roughness: 0.8,
            metalness: 0.1,
            wireframe: this.wireframeMode,
        });
        this.panelMesh = new THREE.Mesh(geometry, material);
        this.panelMesh.castShadow = true;
        this.panelMesh.receiveShadow = true;
        this.panelMesh.position.set(0, height / 2, 0);

        // Save original panel data on first creation (before any CSG)
        if (!this.originalPanelGeometry) {
            this.originalPanelGeometry = this.panelMesh.geometry.clone();
            this.originalPanelMaterial = this.panelMesh.material.clone();
            this.originalPanelPosition = this.panelMesh.position.clone();
            this.originalPanelRotation = this.panelMesh.rotation.clone();
            this.originalPanelScale = this.panelMesh.scale.clone();
            console.log("Original panel data saved at creation");
        }

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
        console.log("updatePanel: Adding panel mesh and bit meshes to scene", {
            bitPathMeshesCount: this.bitPathMeshes.length,
            bitsVisible: window.bitsVisible,
            showPart: window.showPart,
        });

        this.scene.add(this.panelMesh);

        // Only add bit meshes if they should be visible
        // In Part view, they will be hidden by applyCSGOperation()
        if (window.bitsVisible !== false) {
            console.log(
                "updatePanel: Adding",
                this.bitPathMeshes.length,
                "bit meshes to scene"
            );
            this.bitPathMeshes.forEach((mesh) => {
                this.scene.add(mesh);
                // Don't auto-show in Part view - applyCSGOperation will control visibility
                mesh.visible = !window.showPart;
            });
        } else {
            console.log("updatePanel: Bits not visible, hiding bit meshes");
            this.bitPathMeshes.forEach((mesh) => {
                mesh.visible = false;
            });
        }

        // Note: Do NOT call applyCSGOperation here - let the caller handle CSG logic
        // This allows proper control over when CSG is applied vs when panel is just updated
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
        console.log("ThreeModule: Creating bit path extrusions", bits.length);

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

        for (const [bitIndex, bit] of bits.entries()) {
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
                this.bitPathMeshes.push(extrudeMesh);
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
    }

    /**
     * Add edge visualization to a mesh (shows wireframe edges with solid color)
     * Creates both visible edges and enhances material for better depth perception
     */
    addEdgeVisualization(mesh) {
        try {
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

            // Enhance material for better visibility - increase metalness for subtle highlights
            if (mesh.material && mesh.material.isMeshStandardMaterial) {
                mesh.material.metalness = 0.3;
                mesh.material.roughness = 0.7;
            }

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

        if (!this.originalPanelGeometry || !this.originalPanelMaterial) {
            console.error("Original panel data not available!");
            return;
        }

        try {
            if (apply) {
                // ===== PART VIEW: Apply CSG subtraction from original panel =====
                console.log(
                    "Applying CSG: subtracting current bits from original panel"
                );

                // Immediately hide bit meshes in Part view
                this.bitPathMeshes.forEach((mesh) => {
                    mesh.visible = false;
                });

                // Start with fresh clone of original panel
                const panelGeometry = this.originalPanelGeometry.clone();
                const panelBrush = new Brush(panelGeometry);
                panelBrush.position.copy(this.originalPanelPosition);
                panelBrush.rotation.copy(this.originalPanelRotation);
                panelBrush.scale.copy(this.originalPanelScale);
                panelBrush.updateMatrixWorld(true);

                let resultBrush = panelBrush;
                let successCount = 0;

                // Subtract each current extrude from the panel
                for (let i = 0; i < this.bitExtrudeMeshes.length; i++) {
                    const bitMesh = this.bitExtrudeMeshes[i];

                    if (!bitMesh.geometry) {
                        console.warn(`Bit mesh ${i} has no geometry, skipping`);
                        continue;
                    }

                    try {
                        // Create brush from current bit mesh (with current position)
                        const bitBrush = new Brush(bitMesh.geometry);
                        bitBrush.position.copy(bitMesh.position);
                        bitBrush.rotation.copy(bitMesh.rotation);
                        bitBrush.scale.copy(bitMesh.scale);
                        bitBrush.updateMatrixWorld(true);

                        // Subtract this bit from result
                        const evaluator = new Evaluator();
                        evaluator.attributes = ["position", "normal"];

                        resultBrush = evaluator.evaluate(
                            resultBrush,
                            bitBrush,
                            SUBTRACTION
                        );

                        if (resultBrush) {
                            successCount++;
                            console.log(`Successfully subtracted bit ${i}`);
                        } else {
                            console.warn(`Subtraction failed for bit ${i}`);
                        }
                    } catch (error) {
                        console.warn(
                            `Error subtracting bit mesh ${i}:`,
                            error.message
                        );
                    }
                }

                // Replace panel with CSG result
                if (successCount > 0 && resultBrush) {
                    // Remove current panel from scene
                    if (this.panelMesh) {
                        this.scene.remove(this.panelMesh);
                        // Only dispose if it's a CSG result (not the original)
                        if (
                            this.panelMesh.geometry !==
                            this.originalPanelGeometry
                        ) {
                            this.panelMesh.geometry?.dispose();
                        }
                        if (
                            this.panelMesh.material !==
                            this.originalPanelMaterial
                        ) {
                            this.panelMesh.material?.dispose();
                        }
                        // Remove edge visualization
                        if (this.panelMesh.userData.edgeLines) {
                            this.scene.remove(
                                this.panelMesh.userData.edgeLines
                            );
                            this.panelMesh.userData.edgeLines.geometry?.dispose();
                            this.panelMesh.userData.edgeLines.material?.dispose();
                        }
                    }

                    // Create new mesh with CSG result
                    const resultMaterial = new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 0.8,
                        metalness: 0.1,
                        wireframe: this.wireframeMode,
                    });
                    resultBrush.material = resultMaterial;
                    resultBrush.castShadow = true;
                    resultBrush.receiveShadow = true;

                    // Add to scene
                    this.scene.add(resultBrush);
                    this.panelMesh = resultBrush;

                    // Add edge visualization
                    this.addEdgeVisualization(resultBrush);

                    console.log(
                        `CSG applied successfully, subtracted ${successCount} bits`
                    );
                } else {
                    console.error("CSG failed, keeping original panel visible");
                }
            } else {
                // ===== MATERIAL VIEW: Restore original panel =====
                console.log("Restoring original panel (Material view)");

                // Remove CSG panel if it exists
                if (this.panelMesh) {
                    this.scene.remove(this.panelMesh);
                    // Only dispose CSG results, not original geometry
                    if (
                        this.panelMesh.geometry &&
                        this.panelMesh.geometry !== this.originalPanelGeometry
                    ) {
                        this.panelMesh.geometry.dispose();
                    }
                    if (
                        this.panelMesh.material &&
                        this.panelMesh.material !== this.originalPanelMaterial
                    ) {
                        this.panelMesh.material.dispose();
                    }
                    // Remove edge visualization
                    if (this.panelMesh.userData.edgeLines) {
                        this.scene.remove(this.panelMesh.userData.edgeLines);
                        this.panelMesh.userData.edgeLines.geometry?.dispose();
                        this.panelMesh.userData.edgeLines.material?.dispose();
                    }
                }

                // Create fresh mesh from original panel (clone, not reuse)
                const originalPanel = new THREE.Mesh(
                    this.originalPanelGeometry.clone(),
                    this.originalPanelMaterial.clone()
                );
                originalPanel.position.copy(this.originalPanelPosition);
                originalPanel.rotation.copy(this.originalPanelRotation);
                originalPanel.scale.copy(this.originalPanelScale);
                originalPanel.castShadow = true;
                originalPanel.receiveShadow = true;

                this.scene.add(originalPanel);
                this.panelMesh = originalPanel;

                // Add edge visualization
                this.addEdgeVisualization(originalPanel);

                console.log("Original panel restored");

                // Show bit meshes in Material view
                this.bitPathMeshes.forEach((mesh) => {
                    mesh.visible = window.bitsVisible !== false;
                });
            }
        } catch (error) {
            console.error("Error in applyCSGOperation:", error);
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

        if (this.controls) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
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
     * Add debug button for extrude visualization
     */
    addDebugExstrudeButton() {
        const debugBtn = document.createElement("button");
        debugBtn.textContent = "Debug Extrudes";
        debugBtn.style.position = "absolute";
        debugBtn.style.top = "110px";
        debugBtn.style.right = "10px";
        debugBtn.style.padding = "8px 16px";
        debugBtn.style.backgroundColor = "rgba(100, 200, 255, 0.9)";
        debugBtn.style.border = "1px solid #ccc";
        debugBtn.style.borderRadius = "4px";
        debugBtn.style.cursor = "pointer";
        debugBtn.style.zIndex = "100";
        debugBtn.style.fontSize = "12px";
        debugBtn.style.fontWeight = "500";

        debugBtn.addEventListener("click", () => {
            this.toggleExtrudeVisualization();
        });

        this.container.appendChild(debugBtn);
        this.debugExstrudeBtn = debugBtn;
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
