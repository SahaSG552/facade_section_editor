import * as THREE from "three";
import { LoggerFactory } from "../core/LoggerFactory.js";
import { SemanticEdgesGeometry } from "./SemanticEdgesGeometry.js";

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
        this.bitExtrudeMeshes = [];
        this.scene = null;

        // Original panel material for restoration
        this.originalPanelMaterial = null;

        // UI elements
        this.wireframeToggleBtn = null;

        // Color Transition State
        this.targetPanelColor = new THREE.Color(0xdeb887); // Default shaded color
        this.currentPanelColor = new THREE.Color(0xdeb887);
        this.colorLerpFactor = 0.05;
    }

    /**
     * Initialize with references to meshes and scene
     */
    initialize(panelMesh, partMesh, scene, bitExtrudeMeshes = []) {
        this.panelMesh = panelMesh;
        this.partMesh = partMesh;
        this.scene = scene;
        this.bitExtrudeMeshes = bitExtrudeMeshes;
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

        if (enabled) {
            // Create fresh edge visualizations when enabled
            if (this.panelMesh && this.panelMesh.visible) {
                this.addEdgeVisualization(this.panelMesh);
            }
            if (this.partMesh && this.partMesh.visible) {
                this.addEdgeVisualization(this.partMesh);
            }
            // Create edge visualization ONLY for visible bit extrusions
            // In Part mode, bit extrusions are hidden, so don't create edges for them
            if (this.bitExtrudeMeshes && Array.isArray(this.bitExtrudeMeshes)) {
                this.bitExtrudeMeshes.forEach((mesh) => {
                    if (mesh && mesh.visible) {
                        this.addEdgeVisualization(mesh);
                    }
                });
            }
        } else {
            // Remove all edge visualizations when disabled
            if (this.panelMesh) {
                this.removeEdgeVisualization(this.panelMesh);
            }
            if (this.partMesh) {
                this.removeEdgeVisualization(this.partMesh);
            }
            // Remove edge visualization for all bit extrusions
            if (this.bitExtrudeMeshes && Array.isArray(this.bitExtrudeMeshes)) {
                this.bitExtrudeMeshes.forEach((mesh) => {
                    if (mesh) {
                        this.removeEdgeVisualization(mesh);
                    }
                });
            }
        }

        this.log.info("Edges enabled:", enabled);
    }

    /**
     * Clean up all edge visualizations from all meshes
     */
    clearAllEdges() {
        try {
            if (this.panelMesh) {
                this.removeEdgeVisualization(this.panelMesh);
            }
            if (this.partMesh) {
                this.removeEdgeVisualization(this.partMesh);
            }
            if (this.bitExtrudeMeshes && Array.isArray(this.bitExtrudeMeshes)) {
                this.bitExtrudeMeshes.forEach((mesh) => {
                    if (mesh) {
                        this.removeEdgeVisualization(mesh);
                    }
                });
            }
            this.log.debug("Cleared all edge visualizations");
        } catch (error) {
            this.log.warn("Error clearing edges:", error);
        }
    }

    /**
     * Remove edge visualization from a mesh
     */
    removeEdgeVisualization(mesh) {
        try {
            if (mesh && mesh.userData && mesh.userData.edgeLines) {
                if (this.scene) {
                    this.scene.remove(mesh.userData.edgeLines);
                }
                if (mesh.userData.edgeLines.geometry) {
                    mesh.userData.edgeLines.geometry.dispose();
                }
                if (mesh.userData.edgeLines.material) {
                    mesh.userData.edgeLines.material.dispose();
                }
                mesh.userData.edgeLines = null;
            }
        } catch (error) {
            this.log.warn("Error removing edge visualization:", error);
        }
    }

    /**
     * Add edge visualization to a mesh (shows wireframe edges with solid color)
     * Always removes old edges first to avoid duplicates
     */
    addEdgeVisualization(mesh) {
        try {
            if (!mesh) return;

            // Always remove old edges first to avoid duplicates
            this.removeEdgeVisualization(mesh);

            // Don't create if edges are disabled
            if (!this.edgesEnabled) return;

            // Create edges
            let edges;

            // Try enabling Semantic Edges if metadata exists (faceID check)
            if (mesh.userData && mesh.userData.manifoldMeta && mesh.userData.manifoldMeta.faceID) {
                this.log.debug("Found Manifold metadata, using SemanticEdgesGeometry for clean edges");
                edges = new SemanticEdgesGeometry(mesh.geometry, mesh.userData.manifoldMeta.faceID);
            } else {
                // Fallback to standard geometric edges
                edges = new THREE.EdgesGeometry(mesh.geometry);
            }

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
    /**
     * Set the target color for the panel material
     * @param {THREE.Color|number|string} color 
     */
    setTargetPanelColor(color) {
        this.targetPanelColor.set(color);
        // Also update the factory definition for future creations (optional)
        if (this.materialRegistry.shaded) {
            // We don't easily update the factory function closure, but we rely on update() specific logic 
            // to override the color on the active instance.
        }
    }

    /**
     * Update loop for smooth transitions
     * @param {number} deltaTime - Time since last frame (optional)
     */
    update(deltaTime) {
        // Smoothly interpolate current color to target
        this.currentPanelColor.lerp(this.targetPanelColor, this.colorLerpFactor);

        // Apply to panel mesh if it exists and has a color property
        if (this.panelMesh && this.panelMesh.material && this.panelMesh.material.color) {
            // Apply color to panel mesh
            if (Array.isArray(this.panelMesh.material)) {
                this.panelMesh.material.forEach(mat => {
                    if (mat.color) mat.color.copy(this.currentPanelColor);
                });
            } else {
                if (this.panelMesh.material.color) {
                    this.panelMesh.material.color.copy(this.currentPanelColor);
                }
            }
        }

        // Apply to part mesh (CSG result) if it exists
        if (this.partMesh && this.partMesh.material) {
            if (Array.isArray(this.partMesh.material)) {
                this.partMesh.material.forEach(mat => {
                    if (mat.color) mat.color.copy(this.currentPanelColor);
                });
            } else {
                if (this.partMesh.material.color) {
                    this.partMesh.material.color.copy(this.currentPanelColor);
                }
            }
        }
    }
}

export default MaterialManager;
