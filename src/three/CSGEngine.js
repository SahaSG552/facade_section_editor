import * as THREE from "three";
import { ADDITION, Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { LoggerFactory } from "../core/LoggerFactory.js";

/**
 * CSGEngine - Manages CSG (Constructive Solid Geometry) boolean operations
 * Responsibilities:
 * - Apply CSG subtraction operations (panel - bits)
 * - Cache CSG results using signatures
 * - Filter intersecting extrudes with bounding box culling
 * - Manage visibility of base panel vs CSG result (partMesh)
 * - Support both Union+Subtract and Sequential subtraction modes
 */
class CSGEngine {
    constructor(options = {}) {
        this.log = LoggerFactory.createLogger("CSGEngine");

        // References to scene and meshes
        this.scene = null;
        this.panelMesh = null;
        this.partMesh = null;
        this.bitExtrudeMeshes = [];
        this.bitPathMeshes = [];

        // Original panel data (for CSG base)
        this.originalPanelGeometry = null;
        this.originalPanelPosition = null;
        this.originalPanelRotation = null;
        this.originalPanelScale = null;

        // Bounding box for panel (used for intersection culling)
        this.panelBBox = null;

        // CSG state
        this.csgActive = false;
        this.csgBusy = false;
        this.csgQueuedApply = null;
        this.csgVisible = false;

        // Caching
        this.lastCSGSignature = null;

        // CSG mode: union first then subtract, or sequential subtraction
        this.useUnionBeforeSubtract = true;

        // References to other managers
        this.materialManager = null;
        this.computeWorldBBox = null; // Function reference from ThreeModule
    }

    /**
     * Initialize with references to scene, meshes, and utilities
     */
    initialize(config = {}) {
        this.scene = config.scene;
        this.panelMesh = config.panelMesh;
        this.bitExtrudeMeshes = config.bitExtrudeMeshes || [];
        this.bitPathMeshes = config.bitPathMeshes || [];
        this.originalPanelGeometry = config.originalPanelGeometry;
        this.originalPanelPosition = config.originalPanelPosition;
        this.originalPanelRotation = config.originalPanelRotation;
        this.originalPanelScale = config.originalPanelScale;
        this.materialManager = config.materialManager;
        this.computeWorldBBox = config.computeWorldBBox;
        this.log.info("CSGEngine initialized");
    }

    /**
     * Apply or remove CSG boolean operation (subtract bits from panel)
     */
    applyCSGOperation(apply) {
        this.log.info(
            "applyCSGOperation called with apply:",
            apply,
            "bitExtrudeMeshes count:",
            this.bitExtrudeMeshes.length
        );

        // Block CSG during active drag to prevent broken topology
        if (window.isDraggingBit) {
            this.log.info("CSG blocked: drag in progress");
            this.csgQueuedApply = apply;
            return;
        }

        // Prevent overlapping CSG runs (rapid mouse moves / table drags)
        if (this.csgBusy) {
            if (this.partMesh) {
                this.partMesh.visible = false;
                if (this.partMesh.userData.edgeLines) {
                    this.partMesh.userData.edgeLines.visible = false;
                }
            }
            return;
        }

        // Update panel bbox if missing
        if (!this.panelBBox && this.computeWorldBBox) {
            this.panelBBox = this.computeWorldBBox(
                this.originalPanelGeometry,
                this.originalPanelPosition,
                this.originalPanelRotation,
                this.originalPanelScale
            );
        }

        try {
            if (!apply) {
                this.log.info("Restoring base panel (Material view)");
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            // ===== PART VIEW: Apply CSG subtraction from original panel =====
            this.log.info(
                "Applying CSG with optimized filtering/caching from original panel"
            );
            this.log.info("CSG Operation Start:", {
                timestamp: Date.now(),
                mode: this.useUnionBeforeSubtract ? "Union" : "Sequential",
                totalBits: this.bitExtrudeMeshes.length,
            });

            if (!this.bitExtrudeMeshes.length) {
                this.log.warn(
                    "No extrude meshes available, showing base panel"
                );
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

            // Check cache
            if (
                this.csgActive &&
                this.partMesh &&
                this.lastCSGSignature === csgSignature
            ) {
                this.log.info(
                    "CSG signature unchanged - reusing cached result"
                );
                this.showCSGResult();
                return;
            }

            if (uniqueIntersectingMeshes.length === 0) {
                this.log.warn(
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
                this.log.info("Using UNION mode: combining all bits first");
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
                        this.log.warn(
                            `Error building brush for bit ${idx}:`,
                            error.message
                        );
                    }
                });

                if (!unionBrush) {
                    this.log.warn(
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
                this.log.info(
                    "Using SEQUENTIAL mode: subtracting bits one by one"
                );
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
                            this.log.warn(
                                `Sequential subtraction failed at bit ${processed}`
                            );
                            break;
                        }
                        processed++;
                    } catch (error) {
                        this.log.warn(
                            `Error in sequential subtraction for bit ${processed}:`,
                            error.message
                        );
                        break;
                    }
                }
            }

            if (!resultBrush) {
                this.log.error(
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

            // Apply material
            const materialFactory = this.materialManager.getMaterialFactory(
                this.materialManager.getCurrentMaterialKey()
            );
            const resultMaterial = materialFactory
                ? materialFactory()
                : this.originalPanelMaterial?.clone?.() ||
                  new THREE.MeshStandardMaterial({ color: 0xdeb887 });
            resultMaterial.wireframe =
                this.materialManager.isWireframeEnabled();

            resultBrush.material = resultMaterial;
            resultBrush.castShadow = true;
            resultBrush.receiveShadow = true;

            this.partMesh = resultBrush;
            // Update material manager with partMesh reference
            this.materialManager.partMesh = this.partMesh;

            if (this.materialManager.isEdgesEnabled()) {
                this.materialManager.addEdgeVisualization(resultBrush);
            }

            this.lastCSGSignature = csgSignature;
            this.csgActive = true;

            this.showCSGResult();

            this.log.info(
                `CSG applied successfully, processed ${processed} intersecting bits`
            );
            this.log.info("CSG Operation End:", {
                timestamp: Date.now(),
                success: true,
                bitsProcessed: processed,
            });
        } catch (error) {
            this.log.error("Error in applyCSGOperation:", error);
            this.log.info("CSG Operation End:", {
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
     * Build signature of current CSG configuration for caching
     */
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

    /**
     * Filter bit meshes that intersect with panel bounding box
     */
    filterIntersectingExtrudes(panelBBox) {
        if (!panelBBox) return [];

        const intersecting = [];
        this.bitExtrudeMeshes.forEach((mesh, idx) => {
            if (!mesh.geometry) {
                this.log.warn(`Bit mesh ${idx} missing geometry, skipping`);
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
                this.log.debug(`Bit mesh ${idx} culls out of panel bounds`);
            }
        });

        return intersecting;
    }

    /**
     * Show base panel (material view - no CSG)
     */
    showBasePanel() {
        if (this.panelMesh) {
            this.panelMesh.visible = true;
            if (this.materialManager.isEdgesEnabled()) {
                if (!this.panelMesh.userData.edgeLines) {
                    this.materialManager.addEdgeVisualization(this.panelMesh);
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

    /**
     * Show CSG result (part view - panel with bits subtracted)
     */
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
            if (this.materialManager.isEdgesEnabled()) {
                if (!this.partMesh.userData.edgeLines) {
                    this.materialManager.addEdgeVisualization(this.partMesh);
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

    /**
     * Set CSG mode (union before subtract or sequential)
     */
    setUnionMode(enabled) {
        this.useUnionBeforeSubtract = enabled;
        // Invalidate cache to force recalculation
        this.lastCSGSignature = null;
        this.log.info("CSG mode changed to:", enabled ? "Union" : "Sequential");
    }

    /**
     * Check if CSG is currently active (showing part mesh)
     */
    isActive() {
        return this.csgActive;
    }

    /**
     * Update references when meshes change
     */
    updateMeshReferences(panelMesh, bitExtrudeMeshes, bitPathMeshes) {
        this.panelMesh = panelMesh;
        this.bitExtrudeMeshes = bitExtrudeMeshes || [];
        this.bitPathMeshes = bitPathMeshes || [];
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.partMesh) {
            if (this.partMesh.userData.edgeLines) {
                this.scene?.remove(this.partMesh.userData.edgeLines);
                this.partMesh.userData.edgeLines.geometry?.dispose();
                this.partMesh.userData.edgeLines.material?.dispose();
            }
            this.scene?.remove(this.partMesh);
            this.partMesh.geometry?.dispose();
            this.partMesh.material?.dispose();
        }
        this.log.info("CSGEngine disposed");
    }
}

export default CSGEngine;
