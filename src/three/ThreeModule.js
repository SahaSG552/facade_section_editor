import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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
     */
    updatePanel(width, height, thickness, bits = []) {
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
            this.createBitPathExtrusions(bits, width, height, thickness);
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
    createBitPathExtrusions(bits, panelWidth, panelHeight, panelThickness) {
        console.log("ThreeModule: Creating bit path extrusions", bits.length);

        // Get offset contours from the main canvas
        const offsetContours = window.offsetContours || [];

        bits.forEach((bit, bitIndex) => {
            // Find offset contour for this bit
            const bitContours = offsetContours.filter(
                (c) => c.bitIndex === bitIndex
            );

            if (bitContours.length === 0) return;

            // Get the main contour (not base offset)
            const contour = bitContours.find((c) => c.pass !== 0);
            if (!contour || !contour.element) return;

            // Get path data from SVG path element
            const pathElement = contour.element;
            const pathData = pathElement.getAttribute("d");

            if (!pathData) return;

            // Parse path to get points
            const pathPoints = this.parsePathToPoints(pathData);
            if (pathPoints.length < 2) return;

            // Create 3D curve from path points
            const curve3D = this.createCurveFromPath(
                pathPoints,
                panelWidth,
                panelHeight,
                bit.y
            );

            // Create bit profile shape
            const bitProfile = this.createBitProfile(bit.bitData);

            // Extrude profile along curve
            const extrudeMesh = this.extrudeAlongPath(
                bitProfile,
                curve3D,
                bit.color
            );

            if (extrudeMesh) {
                this.scene.add(extrudeMesh);
                this.bitPathMeshes.push(extrudeMesh);
            }
        });
    }

    /**
     * Parse SVG path data to array of points
     */
    parsePathToPoints(pathData) {
        const points = [];
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);

        let currentX = 0;
        let currentY = 0;

        commands?.forEach((cmd) => {
            const type = cmd[0];
            const coords = cmd
                .slice(1)
                .trim()
                .split(/[\s,]+/)
                .map(Number);

            switch (type) {
                case "M": // Move to
                    currentX = coords[0];
                    currentY = coords[1];
                    points.push({ x: currentX, y: currentY });
                    break;
                case "L": // Line to
                    currentX = coords[0];
                    currentY = coords[1];
                    points.push({ x: currentX, y: currentY });
                    break;
                case "H": // Horizontal line
                    currentX = coords[0];
                    points.push({ x: currentX, y: currentY });
                    break;
                case "V": // Vertical line
                    currentY = coords[0];
                    points.push({ x: currentX, y: currentY });
                    break;
                case "Z": // Close path
                    if (points.length > 0) {
                        points.push({ x: points[0].x, y: points[0].y });
                    }
                    break;
            }
        });

        return points;
    }

    /**
     * Create 3D curve from 2D path points
     */
    createCurveFromPath(pathPoints, panelWidth, panelHeight, depth) {
        const points3D = pathPoints.map((p) => {
            // Convert 2D canvas coordinates to 3D coordinates
            const x3d = p.x - panelWidth / 2; // Center horizontally
            const y3d = panelHeight - p.y; // Y coordinate along height
            const z3d = -depth; // Depth into panel (negative Z goes into panel from front)

            return new THREE.Vector3(x3d, y3d, z3d);
        });

        // Create curve from points
        return new THREE.CatmullRomCurve3(points3D, false);
    }

    /**
     * Create bit profile shape based on bit type
     */
    createBitProfile(bitData) {
        const diameter = bitData.diameter || 10;
        const radius = diameter / 2;

        // Create circular profile for now
        // TODO: Create different profiles based on bit type
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
     * Extrude profile along path using TubeGeometry
     */
    extrudeAlongPath(profile, curve, color) {
        try {
            // Sample the curve to get path segments
            const segments = Math.max(100, Math.floor(curve.getLength() / 2));

            // Use TubeGeometry for extrusion along path
            // Note: TubeGeometry creates a tube, but we can use ExtrudeGeometry for custom profiles
            const extrudeSettings = {
                steps: segments,
                bevelEnabled: false,
                extrudePath: curve,
            };

            const geometry = new THREE.ExtrudeGeometry(
                profile,
                extrudeSettings
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
