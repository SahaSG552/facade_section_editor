import * as THREE from "three";
import { LoggerFactory } from "../core/LoggerFactory.js";

/**
 * MaterialManager - Manages material registry, switching, and wireframe/edges modes
 * Responsibilities:
 * - Maintain material registry (shaded, wireframe, clay, metal, glass, etc.)
 * - Switch materials between panel and CSG result meshes
 * - Control wireframe toggle mode (applies to all meshes)
 * - Control edges overlay visibility (independent from material)
 * - Create edge visualizations
 */
class MaterialManager {
    constructor(options = {}) {
        this.log = LoggerFactory.createLogger("MaterialManager");

        // Material registry
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

        // Current material and display modes
        this.currentMaterialKey = "shaded";
        this.wireframeMode = false;
        this.edgesEnabled = false;

        // References to meshes to update
        this.panelMesh = null;
        this.partMesh = null;
        this.scene = null;

        // Original panel material for restoration
        this.originalPanelMaterial = null;

        // UI elements
        this.wireframeToggleBtn = null;
    }

    /**
     * Initialize with references to meshes and scene
     */
    initialize(panelMesh, partMesh, scene) {
        this.panelMesh = panelMesh;
        this.partMesh = partMesh;
        this.scene = scene;
        this.log.info("MaterialManager initialized");
    }

    /**
     * Set current material mode and apply to all meshes
     */
    setMaterialMode(modeKey) {
        const entry = this.materialRegistry[modeKey];
        if (!entry || entry.enabled === false) {
            this.log.warn("Material mode not available:", modeKey);
            return;
        }

        this.currentMaterialKey = modeKey;
        const mat = entry.factory();
        mat.wireframe = this.wireframeMode;

        // Update original material reference
        this.originalPanelMaterial = mat.clone();

        // Apply to panel mesh
        if (this.panelMesh) {
            if (this.panelMesh.material) {
                this.panelMesh.material.dispose();
            }
            this.panelMesh.material = mat.clone();
        }

        // Apply to CSG result mesh (part mesh)
        if (this.partMesh) {
            if (this.partMesh.material) {
                this.partMesh.material.dispose();
            }
            const pm = entry.factory();
            pm.wireframe = this.wireframeMode;
            this.partMesh.material = pm;
        }

        this.log.info("Material mode changed to:", modeKey);
    }

    /**
     * Toggle wireframe mode - applies to all meshes in scene
     */
    toggleWireframe() {
        this.wireframeMode = !this.wireframeMode;

        // Update all materials in the scene
        if (this.scene) {
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
        }

        // Update toggle button style if it exists
        if (this.wireframeToggleBtn) {
            this.wireframeToggleBtn.style.backgroundColor = this.wireframeMode
                ? "rgba(0, 191, 255, 0.9)"
                : "rgba(255, 255, 255, 0.9)";
        }

        this.log.info("Wireframe mode toggled:", this.wireframeMode);
    }

    /**
     * Enable/disable edges overlay visualization
     */
    setEdgesEnabled(enabled) {
        this.edgesEnabled = enabled;

        // Toggle existing edge overlays
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

        this.log.info("Edges enabled:", enabled);
    }

    /**
     * Add edge visualization to a mesh (shows wireframe edges with solid color)
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

            // Copy transform from the mesh
            lineSegments.position.copy(mesh.position);
            lineSegments.rotation.copy(mesh.rotation);
            lineSegments.scale.copy(mesh.scale);

            // Add to scene and to mesh for later cleanup
            if (this.scene) {
                this.scene.add(lineSegments);
            }
            mesh.userData.edgeLines = lineSegments;

            // Keep material properties as-is; edges overlay is independent
            this.log.debug("Added edge visualization to mesh");
        } catch (error) {
            this.log.error("Error adding edge visualization:", error);
        }
    }

    /**
     * Register or enable/disable a custom material
     */
    registerMaterial(modeKey, factory, enabled = true) {
        this.materialRegistry[modeKey] = { factory, enabled };
        this.log.info("Material registered:", modeKey);
    }

    /**
     * Get current material key
     */
    getCurrentMaterialKey() {
        return this.currentMaterialKey;
    }

    /**
     * Check if wireframe is enabled
     */
    isWireframeEnabled() {
        return this.wireframeMode;
    }

    /**
     * Check if edges are enabled
     */
    isEdgesEnabled() {
        return this.edgesEnabled;
    }

    /**
     * Get material factory for a given key
     */
    getMaterialFactory(modeKey) {
        const entry = this.materialRegistry[modeKey];
        return entry ? entry.factory : null;
    }

    /**
     * Get list of available materials
     */
    getAvailableMaterials() {
        return Object.entries(this.materialRegistry)
            .filter(([, entry]) => entry.enabled)
            .map(([key]) => key);
    }

    /**
     * Create fresh material instance for a given mode
     */
    createMaterial(modeKey) {
        const entry = this.materialRegistry[modeKey];
        if (!entry) {
            this.log.warn("Material not found:", modeKey);
            return null;
        }
        const material = entry.factory();
        material.wireframe = this.wireframeMode;
        return material;
    }

    /**
     * Clean up material resources
     */
    dispose() {
        // Dispose original material if stored
        if (this.originalPanelMaterial) {
            this.originalPanelMaterial.dispose();
            this.originalPanelMaterial = null;
        }
        this.log.info("MaterialManager disposed");
    }
}

export default MaterialManager;
