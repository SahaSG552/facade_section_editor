import * as THREE from "three";
import { ADDITION, Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import ManifoldCSG from "./ManifoldCSG.js";
import { LoggerFactory } from "../core/LoggerFactory.js";
import { weldGeometry } from "../utils/utils.js";
import { FaceIDGenerator } from "./FaceIDGenerator.js";
import BREPVisualizer from "./BREPVisualizer.js";

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
        // Default to sequential; union mode is currently disabled for stability
        this.useUnionBeforeSubtract = false;

        // References to other managers
        this.materialManager = null;
        this.computeWorldBBox = null; // Function reference from ThreeModule

        // Manifold backend
        this.manifoldCSG = new ManifoldCSG(this.log);
        this.useManifoldBackend = true;
        this.manifoldTolerance = 1e-3; // Panel tolerance
        this.manifoldCutterTolerance = 0.001; // Higher tolerance for cutter cleanup (round extrusions)
        this.manifoldSimplifyTolerance = 0.01;
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
    async applyCSGOperation(apply) {
        this.log.info(
            "applyCSGOperation called with apply:",
            apply,
            "bitExtrudeMeshes count:",
            this.bitExtrudeMeshes.length,
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

        this.csgBusy = true;

        // Update panel bbox if missing
        if (!this.panelBBox && this.computeWorldBBox) {
            this.panelBBox = this.computeWorldBBox(
                this.originalPanelGeometry,
                this.originalPanelPosition,
                this.originalPanelRotation,
                this.originalPanelScale,
            );
        }

        try {
            if (!apply) {
                this.log.info("Restoring base panel (Material view)");
                this.csgActive = false; // ensure exports go back to panel+bits
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            // ===== PART VIEW: Apply CSG subtraction from original panel =====
            this.log.info(
                "Applying CSG with optimized filtering/caching from original panel",
            );
            this.log.info("CSG Operation Start:", {
                timestamp: Date.now(),
                mode: this.useUnionBeforeSubtract ? "Union" : "Sequential",
                totalBits: this.bitExtrudeMeshes.length,
            });

            if (!this.bitExtrudeMeshes.length) {
                this.log.warn(
                    "No extrude meshes available, showing base panel",
                );
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            // Cull non-intersecting bits first
            const intersectingMeshes = this.filterIntersectingExtrudes(
                this.panelBBox,
            );

            // Deduplicate by mesh identity (geometry uuid) to keep all separate bit parts
            // For multi-part bits (segments + lathes), each part is kept as separate mesh
            const uniqueIntersectingMeshes = [];
            const seenByMesh = new Set();

            for (let i = intersectingMeshes.length - 1; i >= 0; i--) {
                const m = intersectingMeshes[i];
                // Use geometry uuid to ensure each mesh is unique
                // This allows multiple parts per bit (segments, lathes, etc.)
                const key = m.geometry?.uuid ?? m.uuid;
                if (!seenByMesh.has(key)) {
                    seenByMesh.add(key);
                    uniqueIntersectingMeshes.unshift(m);
                }
            }

            // Sort meshes: segments first, then lathes
            // This ensures proper order of CSG subtraction
            uniqueIntersectingMeshes.sort((a, b) => {
                const aIsLathe =
                    a.userData?.isPartialLathe || a.userData?.isLatheJunction;
                const bIsLathe =
                    b.userData?.isPartialLathe || b.userData?.isLatheJunction;
                // Segments (not lathe) come first, lathes come last
                if (aIsLathe && !bIsLathe) return -1; // a is lathe, b is segment: b comes first
                if (!aIsLathe && bIsLathe) return 1; // a is segment, b is lathe: a comes first
                // Both same type, keep original order
                return 0;
            });

            this.log.info("CSG subtraction order:", {
                totalMeshes: uniqueIntersectingMeshes.length,
                segmentsFirst: uniqueIntersectingMeshes.filter(
                    (m) =>
                        !m.userData?.isPartialLathe &&
                        !m.userData?.isLatheJunction,
                ).length,
                lathesSecond: uniqueIntersectingMeshes.filter(
                    (m) =>
                        m.userData?.isPartialLathe ||
                        m.userData?.isLatheJunction,
                ).length,
            });

            const csgSignature = this.buildCSGSignature(
                uniqueIntersectingMeshes,
            );

            // Check cache
            if (
                this.csgActive &&
                this.partMesh &&
                this.lastCSGSignature === csgSignature
            ) {
                this.log.info(
                    "CSG signature unchanged - reusing cached result",
                );
                this.showCSGResult();
                return;
            }

            if (uniqueIntersectingMeshes.length === 0) {
                this.log.warn(
                    "No intersecting bits with panel, skipping CSG subtraction",
                );
                this.lastCSGSignature = csgSignature;
                this.csgActive = false;
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            const resultMaterial = this.createResultMaterial();

            if (this.useManifoldBackend) {
                // Group meshes by bitIndex to ensure they share the same FaceID offset (Namespace)
                // This merges components of the same operation (Main, Expansion, Phantom) into one selectable feature.
                const featuredGroups = new Map();
                for (const mesh of uniqueIntersectingMeshes) {
                    const fid = mesh.userData?.bitIndex !== undefined ? `bit_${mesh.userData.bitIndex}` : mesh.uuid;
                    if (!featuredGroups.has(fid)) featuredGroups.set(fid, []);
                    featuredGroups.get(fid).push(mesh);
                }
                const groupedCutters = Array.from(featuredGroups.values());

                const manifoldOutput = await this.runManifoldCSG(groupedCutters);

                if (manifoldOutput?.geometry) {
                    const resultMesh = new THREE.Mesh(
                        manifoldOutput.geometry,
                        resultMaterial,
                    );
                    resultMesh.castShadow = true;
                    resultMesh.receiveShadow = true;

                    // BREP BEHAVIOR: Use Manifold's faceID directly without modification
                    // Manifold handles face grouping internally during boolean operations
                    resultMesh.userData.manifoldMeta = manifoldOutput.meta;

                    this.replacePartMesh(resultMesh);

                    this.lastCSGSignature = csgSignature;
                    this.csgActive = true;

                    // BREP Visualization (Optional but recommended for CAD-like experience)
                    // We can generate the BREP group here and attach it to the result mesh or replace it
                    if (true) { // Always enable for now as per user request
                        // Use Manifold's preserved FaceIDs (Provenance) if available.
                        // This ensures that boolean operations preserve the logical grouping of the input parts.
                        let faceIDs = manifoldOutput.meta?.faceID;

                        if (faceIDs && faceIDs.length > 0) {
                            // Provenance IDs exist. 
                            // Refine them: Split disjoint fragments sharing the same ID (topological fix)
                            faceIDs = FaceIDGenerator.splitDisjointFaceGroups(manifoldOutput.geometry, faceIDs);
                        } else {
                            // Fallback: Regenerate IDs geometrically if provenance is lost
                            faceIDs = FaceIDGenerator.generateFaceIDs(
                                manifoldOutput.geometry,
                                15,    // faceDeflectionAngle
                                1e-5   // weldTolerance
                            );
                        }

                        // Generate BREP visualization group
                        const brepGroup = BREPVisualizer.visualize(
                            manifoldOutput.geometry,
                            faceIDs,
                            {
                                showEdges: true,
                                showVertices: true,
                                deterministicColors: true,
                                name: 'CSG_Result_BREP'
                            }
                        );

                        // Position correctly
                        brepGroup.position.copy(resultMesh.position);
                        brepGroup.rotation.copy(resultMesh.rotation);
                        brepGroup.scale.copy(resultMesh.scale);
                        brepGroup.castShadow = true;
                        brepGroup.receiveShadow = true;

                        // Store unified mesh for STL export (prevents fragmentation)
                        brepGroup.userData.mergedMesh = resultMesh;

                        // Replace the simple mesh with the BREP group
                        this.replacePartMesh(brepGroup);
                        this.showCSGResult();
                    } else {
                        this.showCSGResult();
                    }

                    this.log.info(
                        `CSG applied via Manifold, processed ${uniqueIntersectingMeshes.length} intersecting bits`,
                    );
                    this.log.info("CSG Operation End:", {
                        timestamp: Date.now(),
                        success: true,
                        bitsProcessed: uniqueIntersectingMeshes.length,
                        backend: "manifold",
                    });
                    return;
                }

                this.log.warn(
                    "Manifold backend failed or returned empty, falling back to BVH CSG",
                );
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

            // MODE 2: Sequential subtraction (default/stable path)
            this.log.info("Using SEQUENTIAL mode: subtracting bits one by one");
            resultBrush = panelBrush;

            for (const bitMesh of uniqueIntersectingMeshes) {
                try {
                    const weldedGeometry = weldGeometry(
                        bitMesh.geometry,
                        this.manifoldCutterTolerance,
                    );
                    const bitBrush = new Brush(weldedGeometry);
                    bitBrush.position.copy(bitMesh.position);
                    bitBrush.rotation.copy(bitMesh.rotation);
                    bitBrush.scale.copy(bitMesh.scale);
                    bitBrush.updateMatrixWorld(true);

                    resultBrush = evaluator.evaluate(
                        resultBrush,
                        bitBrush,
                        SUBTRACTION,
                    );

                    if (!resultBrush) {
                        this.log.warn(
                            `Sequential subtraction failed at bit ${processed}`,
                        );
                        break;
                    }
                    processed++;
                } catch (error) {
                    this.log.warn(
                        `Error in sequential subtraction for bit ${processed}:`,
                        error.message,
                    );
                    break;
                }
            }

            if (!resultBrush) {
                this.log.error(
                    "CSG subtraction failed, reverting to base panel",
                );
                this.lastCSGSignature = null;
                this.csgActive = false;
                this.showBasePanel();
                this.csgBusy = false;
                return;
            }

            this.replacePartMesh(resultBrush, resultMaterial);

            this.lastCSGSignature = csgSignature;
            this.csgActive = true;

            this.showCSGResult();

            this.log.info(
                `CSG applied successfully, processed ${processed} intersecting bits`,
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

    async runManifoldCSG(bitMeshes) {
        try {
            const panelMatrix = ManifoldCSG.buildMatrix(
                this.originalPanelPosition,
                this.originalPanelRotation,
                this.originalPanelScale,
            );

            return await this.manifoldCSG.subtract({
                panelGeometry: this.originalPanelGeometry,
                panelMatrix,
                cutters: bitMeshes,
                tolerance: this.manifoldTolerance,
                cutterTolerance: this.manifoldCutterTolerance, // Pass cutter tolerance
                simplifyTolerance: this.manifoldSimplifyTolerance,
            });
        } catch (err) {
            this.log.warn("runManifoldCSG error", err);
            return null;
        }
    }

    replacePartMesh(object, material) {
        // Remove existing part mesh/group
        if (this.partMesh) {
            this.scene?.remove(this.partMesh);

            // Recursive disposal for Groups (BREP structure)
            const disposeObject = (obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
                if (obj.children) {
                    obj.children.forEach(child => disposeObject(child));
                }
            };
            disposeObject(this.partMesh);
        }

        // Add new object
        if (object) {
            // Apply material if provided and object is a Mesh (not Group)
            if (material && object.isMesh) {
                object.material = material;
            }

            // Shadows for the whole group/mesh
            object.castShadow = true;
            object.receiveShadow = true;
            object.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }

        this.partMesh = object;
        this.materialManager.partMesh = object;

        // Note: Edge visualization via MaterialManager is disabled for BREP groups
        // as they have their own edge handling.
        if (object && object.isMesh && this.materialManager.isEdgesEnabled()) {
            this.materialManager.addEdgeVisualization(object);
        }
    }

    createResultMaterial() {
        const materialFactory = this.materialManager.getMaterialFactory(
            this.materialManager.getCurrentMaterialKey(),
        );
        const material =
            materialFactory?.() ||
            this.originalPanelMaterial?.clone?.() ||
            new THREE.MeshStandardMaterial({ color: 0xdeb887 });
        material.wireframe = this.materialManager.isWireframeEnabled();
        return material;
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
                mesh.scale,
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
            const shouldBeVisible = window.bitsVisible !== false;
            mesh.visible = shouldBeVisible;
            // Sync edge visibility with mesh visibility (always visible with mesh if bits are visible)
            if (mesh.userData && mesh.userData.edgeLines) {
                mesh.userData.edgeLines.visible =
                    shouldBeVisible && this.materialManager?.isEdgesEnabled?.();
            }
        });

        this.csgVisible = false;
        this.csgActive = false; // keep export logic aligned with visible state
    }

    /**
     * Show CSG result (part view - panel with bits subtracted)
     */
    /**
     * Show CSG result (part view - panel with bits subtracted)
     */
    showCSGResult() {
        if (this.panelMesh) {
            this.panelMesh.visible = false;
            // Legacy edge lines check - probably not needed if migrating fully
            if (this.panelMesh.userData.edgeLines) {
                this.panelMesh.userData.edgeLines.visible = false;
            }
        }

        if (this.partMesh) {
            if (!this.scene.children.includes(this.partMesh)) {
                this.scene.add(this.partMesh);
            }
            this.partMesh.visible = true;

            // Logic for BREP Group vs Simple Mesh
            if (this.partMesh.isGroup) {
                // BREP Visualizer handles its own edges
            } else if (this.materialManager.isEdgesEnabled()) {
                // Legacy path for simple meshes
                if (!this.partMesh.userData.edgeLines) {
                    this.materialManager.addEdgeVisualization(this.partMesh);
                } else {
                    this.partMesh.userData.edgeLines.visible = true;
                }
            }
        }

        // Hide bits
        this.bitPathMeshes.forEach(mesh => mesh.visible = false);
        this.bitExtrudeMeshes.forEach(mesh => {
            mesh.visible = false;
            if (mesh.userData?.edgeLines) mesh.userData.edgeLines.visible = false;
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

    setManifoldEnabled(enabled) {
        this.useManifoldBackend = enabled;
        this.lastCSGSignature = null;
        this.log.info("Manifold backend:", enabled ? "enabled" : "disabled");
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

    /**
     * Perform CSG union (addition) of two meshes
     * @param {THREE.Mesh} meshA - First mesh
     * @param {THREE.Mesh} meshB - Second mesh
     * @returns {THREE.Mesh|null} - Resulting union mesh
     */
    union(meshA, meshB) {
        try {
            if (!meshA || !meshB) {
                this.log.error("Union failed: one or both meshes are null");
                return null;
            }

            // Use three-bvh-csg for union operation
            const evaluator = new Evaluator();
            const brushA = new Brush(meshA.geometry, meshA.material);
            const brushB = new Brush(meshB.geometry, meshB.material);

            brushA.updateMatrixWorld();
            brushB.updateMatrixWorld();

            const result = evaluator.evaluate(brushA, brushB, ADDITION);

            if (!result) {
                this.log.error("Union operation returned null");
                return null;
            }

            const unionMesh = new THREE.Mesh(result, meshA.material);
            unionMesh.castShadow = true;
            unionMesh.receiveShadow = true;

            return unionMesh;
        } catch (error) {
            this.log.error("Error in union operation:", error.message);
            return null;
        }
    }
}

export default CSGEngine;
