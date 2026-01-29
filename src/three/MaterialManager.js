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
                label: "Shaded",
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 0.8,
                        metalness: 0.1,
                        wireframe: false,
                    }),
                edgesType: 'none'
            },
            shadedEdges: {
                label: "Shaded Edges",
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 0.75,
                        metalness: 0.25,
                        wireframe: false,
                    }),
                edgesType: 'standard'
            },
            shadedBEdges: {
                label: "Shaded BREP Edges",
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 0.75,
                        metalness: 0.25,
                        wireframe: false,
                    }),
                edgesType: 'brep'
            },
            wireframe: {
                label: "Wireframe",
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 0.5,
                        metalness: 0.2,
                        wireframe: false, // WebGPU doesn't support wireframe property
                    }),
                edgesType: 'wireframe' // Use WireframeGeometry overlay instead
            },
            edges: {
                label: "Hidden",
                enabled: true,
                factory: () =>
                    new THREE.MeshStandardMaterial({
                        color: 0xdeb887,
                        roughness: 0.75,
                        metalness: 0.25,
                        wireframe: false,
                    }),
                edgesType: 'dashedHidden' // Special mode for dashed hidden edges
            }
        };
        // Shaded is default
        this.currentMaterialKey = "shaded";
        this.wireframeMode = false;

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
        this.targetPanelColor = new THREE.Color(0xdeb887);
        this.currentPanelColor = new THREE.Color(0xdeb887);
        this.colorLerpFactor = 0.05;

        // Edges Appearance
        this.edgesColor = new THREE.Color(0x333333); // Default dark grey
        this.edgesWidth = 1;
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

        // Helper to apply material and edges
        const applyToMesh = (mesh) => {
            if (!mesh) return;

            // Apply Material
            if (mesh.isMesh) {
                // Check if this specific mesh is currently highlighted (has defaultMaterial stored)
                const isHighlighted = !!mesh.userData.defaultMaterial;

                // Determine target color:
                // 1. userData.baseColor (set by ThreeModule for bits)
                // 2. Current material color (if we want to preserve what's there on an un-tagged mesh)
                // 3. currentPanelColor (fallback)

                let targetColor;
                if (mesh.userData.baseColor) {
                    targetColor = new THREE.Color(mesh.userData.baseColor);
                } else if (mesh.material && mesh.material.color && mesh !== this.panelMesh) {
                    // If it's not the panel, and has a color, try to preserve it as the "base"
                    // This fixes the "lost color" issue for existing bits that didn't get userData.baseColor yet
                    targetColor = mesh.material.color.clone();
                    // And save it for next time!
                    mesh.userData.baseColor = '#' + targetColor.getHexString();
                } else {
                    targetColor = this.currentPanelColor;
                }

                // Create new material instance
                const newMat = mat.clone();
                if (newMat.color) newMat.color.copy(targetColor);

                // Persistence of transparency/opacity (e.g. for Phantom bits)
                if (mesh.userData.transparent !== undefined) newMat.transparent = mesh.userData.transparent;
                if (mesh.userData.opacity !== undefined) newMat.opacity = mesh.userData.opacity;

                // If highlighted, we update the BACKUP material, not the active one
                if (isHighlighted) {
                    if (mesh.userData.defaultMaterial) mesh.userData.defaultMaterial.dispose();
                    mesh.userData.defaultMaterial = newMat;
                    // Do not touch mesh.material (it is the highlight)
                } else {
                    if (mesh.material) mesh.material.dispose();
                    mesh.material = newMat;
                }

            } else if (mesh.isGroup) {
                mesh.traverse(child => {
                    if (child.isMesh && child.type === 'FACE') { // Handle BREP structures
                        const isHighlighted = !!child.userData.defaultMaterial;

                        let targetColor;
                        if (child.userData.baseColor) {
                            targetColor = new THREE.Color(child.userData.baseColor);
                        } else if (child.material && child.material.color) { // BREP faces aren't the panelMesh itself
                            targetColor = child.material.color.clone();
                            child.userData.baseColor = '#' + targetColor.getHexString();
                        } else {
                            targetColor = this.currentPanelColor;
                        }

                        const newMat = mat.clone();
                        if (newMat.color) newMat.color.copy(targetColor);

                        // Persistence of transparency/opacity
                        if (child.userData.transparent !== undefined) newMat.transparent = child.userData.transparent;
                        if (child.userData.opacity !== undefined) newMat.opacity = child.userData.opacity;

                        if (isHighlighted) {
                            if (child.userData.defaultMaterial) child.userData.defaultMaterial.dispose();
                            child.userData.defaultMaterial = newMat;
                        } else {
                            if (child.material) child.material.dispose();
                            child.material = newMat;
                        }
                    }
                });
            }

            // Apply Edges
            this.updateEdgesForMesh(mesh, entry.edgesType);
        };

        // Apply to known meshes
        applyToMesh(this.panelMesh);
        applyToMesh(this.partMesh);

        if (this.bitExtrudeMeshes && Array.isArray(this.bitExtrudeMeshes)) {
            this.bitExtrudeMeshes.forEach(mesh => applyToMesh(mesh));
        }

        this.log.info("Material mode changed to:", modeKey, "Edges type:", entry.edgesType);
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
     * Update edges for a specific mesh based on requested type
     * @param {THREE.Object3D} object 
     * @param {string} type 'none', 'standard', 'brep'
     */
    updateEdgesForMesh(object, type) {
        if (!object) return;

        // Recursive for groups
        if (object.isGroup) {
            object.children.forEach(child => this.updateEdgesForMesh(child, type));
            return;
        }

        // Clean up existing edges first if they exist
        this.removeEdgeVisualization(object);

        if (type === 'none') return;
        if (!object.isMesh) return;
        if (object.type === 'EDGE' || object.type === 'Wireframe') return; // Don't put edges on edges

        // Add requested edges
        try {
            let edgesGeometry;

            // Determine geometry type
            if (type === 'wireframe') {
                // Use WireframeGeometry for full triangle wireframe
                edgesGeometry = new THREE.WireframeGeometry(object.geometry);
            } else if (type === 'brep' || type === 'dashedHidden') {
                // Try enabling Semantic Edges if metadata exists (faceID check)
                if (object.userData && object.userData.manifoldMeta && object.userData.manifoldMeta.faceID) {
                    // BREP Edges
                    edgesGeometry = new SemanticEdgesGeometry(object.geometry, object.userData.manifoldMeta.faceID);
                } else {
                    // Fallback to standard if no metadata
                    edgesGeometry = new THREE.EdgesGeometry(object.geometry, 15);
                }
            } else {
                // Standard 'ShadedEdges'
                edgesGeometry = new THREE.EdgesGeometry(object.geometry);
            }

            if (type === 'dashedHidden') {
                // Multi-pass dashed hidden edges technique
                // 1. Dashed lines (hidden edges) - rendered with depthTest: false
                const dashedLines = new THREE.LineSegments(
                    edgesGeometry.clone(),
                    new THREE.LineDashedMaterial({
                        color: this.edgesColor,
                        dashSize: 3,
                        gapSize: 2,
                        transparent: true,
                        opacity: 0.4,
                        depthTest: false, // Render even when hidden
                        depthWrite: false,
                        // Note: polygonOffset is not supported for lines in WebGPU
                    })
                );
                dashedLines.computeLineDistances(); // Required for dashed material
                dashedLines.userData.isEdge = true;
                dashedLines.userData.isHiddenEdge = true;
                dashedLines.renderOrder = 1;

                // 2. Solid lines (visible edges) - rendered with depthTest: true
                const solidLines = new THREE.LineSegments(
                    edgesGeometry,
                    new THREE.LineBasicMaterial({
                        color: this.edgesColor,
                        transparent: true,
                        opacity: 0.8,
                        depthTest: true, // Only render when visible
                        // Note: polygonOffset is not supported for lines in WebGPU
                    })
                );
                solidLines.userData.isEdge = true;
                solidLines.userData.isVisibleEdge = true;
                solidLines.renderOrder = 2;

                // Create a group to hold both
                const edgeGroup = new THREE.Group();
                edgeGroup.add(dashedLines);
                edgeGroup.add(solidLines);
                edgeGroup.userData.isEdge = true;

                object.add(edgeGroup);
                object.userData.edgeLines = edgeGroup;
                edgeGroup.visible = true;

            } else {
                // Standard single-layer edges (standard or brep)
                const lineSegments = new THREE.LineSegments(
                    edgesGeometry,
                    new THREE.LineBasicMaterial({
                        color: this.edgesColor,
                        linewidth: this.edgesWidth,
                        transparent: true,
                        opacity: 0.6,
                    })
                );

                // Tag it so we can find it later for style updates
                lineSegments.userData.isEdge = true;

                object.add(lineSegments);
                object.userData.edgeLines = lineSegments;
                lineSegments.visible = true; // Always visible if created, since we remove them for 'none'
            }

        } catch (error) {
            this.log.warn("Failed to create edges for mesh:", error);
        }
    }

    /**
     * Enable/disable edges overlay visualization
     * DEPRECATED: Delegate to setMaterialMode logic or use updateEdgesForMesh internally
     */
    setEdgesEnabled(enabled) {
        this.log.warn("setEdgesEnabled is deprecated. Use setMaterialMode instead.");
    }

    /**
     * Helper for legacy code calling toggleEdges directly
     */
    toggleEdges(object, visible) {
        // Map visible=true to current mode's edge type, or 'none' if false
        const currentMode = this.materialRegistry[this.currentMaterialKey];
        const targetType = visible ? (currentMode?.edgesType || 'standard') : 'none';
        this.updateEdgesForMesh(object, targetType);
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
     * Set edges color and update scene
     * @param {string|number|THREE.Color} color 
     */
    setEdgesColor(color) {
        this.edgesColor.set(color);
        this.updateAllEdgesStyle();
    }

    /**
     * Set edges width and update scene
     * @param {number} width 
     */
    setEdgesWidth(width) {
        this.edgesWidth = width;
        this.updateAllEdgesStyle();
    }

    /**
     * Update style of all existing edges in the scene
     */
    updateAllEdgesStyle() {
        const updateObject = (obj) => {
            if (obj.isLineSegments && obj.userData && obj.userData.isEdge) {
                if (obj.material) {
                    obj.material.color.copy(this.edgesColor);
                    obj.material.linewidth = this.edgesWidth;
                }
            }
            if (obj.children) {
                obj.children.forEach(updateObject);
            }
        };

        if (this.scene) this.scene.traverse(updateObject);
    }

    /**
     * Remove edge visualization from a mesh
     */
    removeEdgeVisualization(mesh) {
        try {
            if (mesh && mesh.userData && mesh.userData.edgeLines) {
                // If added as child, remove from mesh. If added to scene (legacy), remove from scene.
                if (mesh.userData.edgeLines.parent) {
                    mesh.userData.edgeLines.parent.remove(mesh.userData.edgeLines);
                } else if (this.scene) {
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
     * Add edge visualization to a mesh
     * Always removes old edges first to avoid duplicates
     * @param {THREE.Mesh} mesh 
     * @param {boolean} forceVisible - force visibility state (default: use global setting)
     */
    addEdgeVisualization(mesh, forceVisible = null) {
        // Deprecated, redirect to updatedEdgesForMesh with standard assumption if not specified
        const currentMode = this.materialRegistry[this.currentMaterialKey];
        const type = currentMode ? (currentMode.edgesType || 'standard') : 'standard';

        // However, this function is supposed to force creation.
        // If forceVisible is false, we should remove.
        if (forceVisible === false) {
            this.removeEdgeVisualization(mesh);
            return;
        }

        this.updateEdgesForMesh(mesh, type);
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
        // Just return true if current mode has edges, so external checks pass
        const mode = this.materialRegistry[this.currentMaterialKey];
        return mode && mode.edgesType !== 'none';
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
        // Apply to part mesh (CSG result) if it exists
        if (this.partMesh) {
            if (this.partMesh.isGroup) {
                // Traverse children for Faces (BREP)
                this.partMesh.traverse(child => {
                    if (child.isMesh && child.type === 'FACE' && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => { if (mat.color) mat.color.copy(this.currentPanelColor); });
                        } else if (child.material.color) {
                            child.material.color.copy(this.currentPanelColor);
                        }
                    }
                });
            } else if (this.partMesh.material) {
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
}

export default MaterialManager;
