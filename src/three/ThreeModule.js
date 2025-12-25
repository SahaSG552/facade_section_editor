import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
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

        // Bit path meshes
        this.bitPathMeshes = [];

        // Lighting
        this.lights = {};

        // Wireframe mode
        this.wireframeMode = false;
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

        // Remove old panel if exists
        if (this.panelMesh) {
            this.scene.remove(this.panelMesh);
            this.panelMesh.geometry.dispose();
            this.panelMesh.material.dispose();
            this.panelMesh = null;
        }

        // Remove old bit paths
        this.bitPathMeshes.forEach((mesh) => {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        this.bitPathMeshes = [];

        // Create panel geometry (rotate to vertical)
        // In Three.js: Y is up, X is right, Z is forward
        // We want the panel vertical, so we use X for width, Y for height, Z for thickness
        const geometry = new THREE.BoxGeometry(width, height, thickness);

        // Create material with wood-like appearance
        const material = new THREE.MeshStandardMaterial({
            color: 0xdeb887, // BurlyWood color
            roughness: 0.8,
            metalness: 0.1,
            wireframe: this.wireframeMode,
        });

        // Create mesh
        this.panelMesh = new THREE.Mesh(geometry, material);
        this.panelMesh.castShadow = true;
        this.panelMesh.receiveShadow = true;

        // Position panel (center at origin, vertical)
        this.panelMesh.position.set(0, height / 2, 0);

        this.scene.add(this.panelMesh);

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
                this.scene.add(pathLine);
                this.bitPathMeshes.push(pathLine);
                console.log(`Added path visualization for bit ${bitIndex}`);
            }

            // Create bit profile shape
            const bitProfile = await this.createBitProfile(bit.bitData);

            // Extrude profile along curve
            const extrudeMesh = this.extrudeAlongPath(
                bitProfile,
                curve3D,
                bit.color
            );

            if (extrudeMesh) {
                this.scene.add(extrudeMesh);
                this.bitPathMeshes.push(extrudeMesh);
                console.log(`Added extrude mesh for bit ${bitIndex}`);
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

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.DoubleSide,
                wireframe: this.wireframeMode,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            return mesh;
        } catch (error) {
            console.error("Error extruding along path:", error);
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

                    index.push(a, b, d);
                    index.push(b, c, d);
                }
            }

            fullProfileGeometry.setIndex(index);
            fullProfileGeometry.computeVertexNormals();

            return fullProfileGeometry;
        } catch (error) {
            console.error("Error in ProfiledContourGeometry:", error);
            // Fallback to simple box geometry
            return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    /**
     * Fit camera to view the entire panel
     */
    fitCameraToPanel(width, height, thickness) {
        const maxDim = Math.max(width, height, thickness);
        const distance = maxDim * 2;

        this.camera.position.set(distance * 0.8, distance * 0.6, distance);
        this.camera.lookAt(0, height / 2, 0);
        this.controls.target.set(0, height / 2, 0);
        this.controls.update();
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
