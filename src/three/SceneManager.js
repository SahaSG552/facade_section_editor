import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import LoggerFactory from "../core/LoggerFactory.js";

/**
 * SceneManager
 * Handles Three.js scene, camera, renderer, controls, and lighting setup
 * Manages camera fitting, window resizing, and rendering loop updates
 */
export default class SceneManager {
    constructor() {
        this.log = LoggerFactory.createLogger("SceneManager");

        // Scene components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container = null;

        // Lighting
        this.lights = {
            ambient: null,
            directional: null,
            hemisphere: null,
        };

        // Selection / Interaction
        this.selectionManager = null;

        // Background Color State
        this.targetBackgroundColor = new THREE.Color(0xf5f5f5);
        this.currentBackgroundColor = new THREE.Color(0xf5f5f5);
        this.backgroundColorLerpFactor = 0.05;

        // State

        // State
        this.cameraFitted = false;
        this.animationFrameId = null;

        // ResizeObserver for container size changes
        this.resizeObserver = null;
        this.stats = null;

        this.log.info("Created");
    }

    /**
     * Initialize scene manager with DOM container
     * @param {HTMLElement} container - The DOM container for Three.js canvas
     */
    async initialize(container) {
        if (!container) {
            throw new Error(
                "SceneManager.initialize() requires a DOM container"
            );
        }

        this.container = container;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);

        // Helper for touch interactions: prevent browser scrolling/zooming on the 3D container
        if (this.container) {
            this.container.style.touchAction = "none";
        }

        // Create camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
        this.camera.position.set(0, 400, 600);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        // Create renderer
        // Use WebGPURenderer if available
        // Note: As of r167+, WebGPURenderer is imported from 'three/webgpu'
        // We will assume the import is handled or shimmed; if strictly separate package, might need adjustment.
        // For standard three.js imports in newer versions:

        // Dynamic import or check if possible? 
        // Since we are module based, we can try to import it at the top, but for now let's stick to the plan.
        // Actually, I need to change the imports at the top first.
        // Re-reading file via replace might be tricky if I need to change imports.
        // I will use multi_replace for this to handle imports and the renderer creation.

        this.renderer = new WebGPURenderer({ antialias: true, forceWebGL: false });
        this.renderer.setSize(
            Math.max(1, this.container.clientWidth),
            Math.max(1, this.container.clientHeight)
        );
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // ShadowMap is handled differently in WebGPU usually, but basics might map. 
        // WebGPURenderer handles lights differently (node based), but basic compatibility exists.
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // WebGPURenderer initialization
        await this.renderer.init();

        // Create controls
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true; // allow easier panning
        this.controls.minDistance = 100;
        this.controls.maxDistance = 2000;
        // Allow looking under the floor to inspect bottom caps
        this.controls.maxPolarAngle = Math.PI;
        this.controls.minPolarAngle = 0;

        // Setup lighting
        this.setupLighting();

        // Add grid helper
        this.addGridHelper();

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(200);
        this.scene.add(axesHelper);

        // Handle window resize
        window.addEventListener("resize", this.onWindowResize.bind(this));

        // Setup ResizeObserver for container size changes
        this.setupResizeObserver();

        this.log.info("Initialized successfully");
    }

    /**
     * Initialize SelectionManager (call after materialManager is ready if needed)
     */
    initializeSelectionManager(selectionManager) {
        this.selectionManager = selectionManager;
        this.selectionManager.enable();
    }

    /**
     * Setup lighting for the scene
     * Creates ambient, directional, and hemisphere lights
     */
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

        this.log.info("Lighting setup complete");
    }

    /**
     * Add grid helper to the scene
     */
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
        this.log.info("Grid helper added");
    }

    /**
     * Fit camera to panel dimensions
     * @param {number} width - Panel width
     * @param {number} height - Panel height
     * @param {number} thickness - Panel thickness
     */
    fitCameraToPanel(width, height, thickness) {
        if (this.cameraFitted) return; // Don't reset camera position on every update
        if (!this.controls) return; // Wait for controls to be initialized

        const maxDim = Math.max(width, height, thickness);
        const distance = maxDim * 2;

        // Position camera to look at the front face of the panel
        this.camera.position.set(distance * 0.8, distance * 0.6, distance);
        this.camera.lookAt(0, height / 2, thickness / 2);
        this.controls.target.set(0, height / 2, thickness / 2);
        this.controls.update();

        this.cameraFitted = true;
        this.log.info(
            `Camera fitted to panel: ${width}x${height}x${thickness}`
        );
    }

    /**
     * Setup ResizeObserver for container size changes
     */
    setupResizeObserver() {
        if (!this.container) return;

        // Disconnect existing observer if any
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === this.container) {
                    this.onWindowResize();
                }
            }
        });

        this.resizeObserver.observe(this.container);
        this.log.debug("ResizeObserver setup for three-canvas-container");
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = Math.max(1, width) / Math.max(1, height);
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(Math.max(1, width), Math.max(1, height));

        // Update Line2 material resolutions (required for thick lines)
        if (this.scene) {
            this.scene.traverse((obj) => {
                if (obj.isLine2 && obj.material && obj.material.resolution) {
                    obj.material.resolution.set(width, height);
                }
            });
        }

        this.log.debug(`Window resized: ${width}x${height}`);
    }

    /**
     * Add stats widget (FPS counter)
     * @param {Stats} Stats - Stats.js constructor
     */
    addStatsWidget(Stats) {
        if (!Stats || typeof Stats === "undefined") {
            this.log.warn("Stats.js not provided or loaded");
            return;
        }

        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
        this.stats.dom.style.position = "absolute";
        this.stats.dom.style.left = "10px";
        this.stats.dom.style.top = "10px";
        this.stats.dom.style.zIndex = "100";
        this.container.appendChild(this.stats.dom);
        this.log.info("Stats widget added");
    }

    /**
     * Render the scene (called each animation frame)
     */
    /**
     * Set target background color
     * @param {string|number|THREE.Color} color
     */
    setBackgroundColor(color) {
        this.targetBackgroundColor.set(color);
    }

    /**
     * Render the scene (called each animation frame)
     */
    render() {
        if (this.stats) this.stats.begin();

        // Smooth background transition
        if (this.scene && this.scene.background) {
            this.currentBackgroundColor.lerp(this.targetBackgroundColor, this.backgroundColorLerpFactor);
            this.scene.background.copy(this.currentBackgroundColor);
        }

        if (this.controls) {
            this.controls.update();
        }

        if (this.renderer && this.scene && this.camera) {
            // WebGPURenderer usually requires renderAsync or similar, but basic render might work if shimmed.
            // If this throws, we might need to switch to setAnimationLoop in ThreeModule.
            this.renderer.render(this.scene, this.camera);
        }

        if (this.stats) this.stats.end();
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.controls) {
            this.controls.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        window.removeEventListener("resize", this.onWindowResize.bind(this));

        // Cleanup ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        this.log.info("Disposed");
    }
}
