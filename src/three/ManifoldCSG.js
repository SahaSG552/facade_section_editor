import { ADDITION, Brush, Evaluator } from "three-bvh-csg";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getManifoldModule, setWasmUrl } from "manifold-3d/lib/wasm.js";
import wasmUrl from "manifold-3d/manifold.wasm?url";
import { getRepairInstance } from "../utils/meshRepair.js";
import { appConfig } from "../config/AppConfig.js";

// Dev: serve directly from node_modules; Prod: use Vite-resolved asset URL
const resolvedWasmUrl = import.meta.env.DEV
    ? "/node_modules/manifold-3d/manifold.wasm"
    : wasmUrl;
setWasmUrl(resolvedWasmUrl);

/**
 * ManifoldCSG encapsulates Manifold-based boolean operations and
 * conversion helpers between Three.js BufferGeometry and Manifold Mesh.
 */
export default class ManifoldCSG {
    constructor(logger) {
        this.log = logger;
        this.modulePromise = null;
        this.Manifold = null;
        this.Mesh = null;
    }

    async ensureModule() {
        try {
            if (this.Manifold && this.Mesh) return true;
            if (!this.modulePromise) {
                this.modulePromise = getManifoldModule();
            }
            const module = await this.modulePromise;
            this.Manifold = module.Manifold;
            this.Mesh = module.Mesh;
            return true;
        } catch (err) {
            this.log?.warn?.("Manifold module load failed", err);
            return false;
        }
    }

    /**
     * Perform panel minus cutters using Manifold. Returns null on failure.
     * Supports 'cutters' as Array<Mesh> (legacy) or Array<Array<Mesh>> (grouped by feature).
     */
    async subtract({
        panelGeometry,
        panelMatrix,
        cutters = [],
        tolerance,
        cutterTolerance,
        simplifyTolerance,
    }) {
        if (!panelGeometry || !panelMatrix || !cutters.length) return null;

        const ready = await this.ensureModule();
        if (!ready) return null;

        const { Manifold } = this;

        // Check if input is grouped (Array of Arrays)
        const isGrouped = cutters.length > 0 && Array.isArray(cutters[0]);
        const groupCount = cutters.length;

        // Reserve unique IDs: 1 for panel + N for groups/cutters
        const idStart = Manifold.reserveIDs(1 + groupCount);

        // Offset strategy: Each GROUP/FEATURE gets a large ID range
        const ID_RANGE = 1000000;
        let currentFaceOffset = 0;

        // 1. Process Panel
        const panelManifold = await this.toManifold(
            panelGeometry,
            panelMatrix,
            idStart,
            tolerance,
            currentFaceOffset // Panel starts at 0
        );
        if (!panelManifold) return null;

        const cutterManifolds = [];

        if (isGrouped) {
            for (let gIdx = 0; gIdx < cutters.length; gIdx++) {
                const group = cutters[gIdx];
                currentFaceOffset += ID_RANGE;
                const groupManifolds = [];

                for (const mesh of group) {
                    // Convert to raw manifold without IDs first
                    let m = await this.toManifold(
                        mesh.geometry,
                        mesh.matrixWorld,
                        undefined,
                        cutterTolerance || tolerance || 1e-3,
                        0,
                        false // Skip ID generation for parts
                    );
                    
                    if (m) {
                        // REPAIR: Ensure the cutter itself is valid (fixes self-intersecting fillets)
                        // This corresponds to Rhino's "Mesh Repair" before boolean
                        this.log?.info?.("Auto-repairing cutter (grouped) before CSG...");
                        const repairedM = Manifold.union([m]);
                        m.delete();
                        m = repairedM;
                        groupManifolds.push(m);
                    } else {
                        this.log?.warn?.("Failed to convert cutter to manifold (skipped)");
                    }
                }

                if (groupManifolds.length) {
                    let grouped;
                    if (groupManifolds.length === 1) {
                        grouped = groupManifolds[0];
                    } else {
                        grouped = Manifold.union(groupManifolds);
                        groupManifolds.forEach(m => { if (m !== grouped) m.delete(); });
                    }

                    // Now run FaceIDGenerator on the UNION result to establish topological connectivity
                    const finalized = await this.attachFaceIDsToManifold(
                        grouped,
                        idStart + gIdx + 1, // originalID
                        currentFaceOffset,  // namespace offset
                        tolerance
                    );
                    grouped.delete();
                    if (finalized) cutterManifolds.push(finalized);
                }
            }
        } else {
            // Flat list (Legacy)
            for (let idx = 0; idx < cutters.length; idx++) {
                currentFaceOffset += ID_RANGE;
                const mesh = cutters[idx];
                let manifold = await this.toManifold(
                    mesh.geometry,
                    mesh.matrixWorld,
                    idStart + idx + 1,
                    tolerance,
                    currentFaceOffset
                );
                
                if (manifold) {
                    // REPAIR: Ensure cutter is valid
                    this.log?.info?.(`Auto-repairing cutter #${idx} before CSG...`);
                    const repaired = Manifold.union([manifold]);
                    manifold.delete();
                    manifold = repaired;
                    cutterManifolds.push(manifold);
                } else {
                     this.log?.warn?.(`Failed to convert cutter #${idx} to manifold (skipped)`);
                }
            }
        }

        if (!cutterManifolds.length) {
            panelManifold.delete();
            return null;
        }

        let union =
            cutterManifolds.length === 1
                ? cutterManifolds[0]
                : Manifold.union(cutterManifolds);

        let result = null;
        try {
            result = panelManifold.subtract(union);
            if (simplifyTolerance && simplifyTolerance > 0) {
                const simplified = result.setTolerance(simplifyTolerance);
                result.delete();
                result = simplified;
            }
            const output = this.fromManifold(result);
            return output;
        } catch (err) {
            this.log?.warn?.("Manifold subtract failed", err);
            return null;
        } finally {
            cutterManifolds.forEach((m) => m?.delete());
            if (union && union !== cutterManifolds[0]) {
                union.delete();
            }
            panelManifold.delete();
            result?.delete();
        }
    }

    /**
     * Helper to run FaceIDGenerator on a Manifold and return a new Manifold with IDs attached.
     */
    async attachFaceIDsToManifold(manifold, originalId, faceIDOffset, tolerance) {
        const mesh = manifold.getMesh();
        const { FaceIDGenerator } = await import('./FaceIDGenerator.js');

        // Prepare geometry for generator
        const tempGeom = new THREE.BufferGeometry();
        const numProp = mesh.numProp;
        const positions = new Float32Array(mesh.numVert * 3);
        for (let i = 0; i < mesh.numVert; i++) {
            positions[i * 3] = mesh.vertProperties[i * numProp];
            positions[i * 3 + 1] = mesh.vertProperties[i * numProp + 1];
            positions[i * 3 + 2] = mesh.vertProperties[i * numProp + 2];
        }
        tempGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        tempGeom.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));

        // Generate IDs (now considering the union topology!)
        const weldTol = typeof tolerance === "number" && tolerance > 0 ? tolerance : 1e-4;
        const groupedFaceIDs = FaceIDGenerator.generateFaceIDs(tempGeom, 15, weldTol);

        const faceID = new Uint32Array(groupedFaceIDs.length);
        for (let i = 0; i < groupedFaceIDs.length; i++) {
            faceID[i] = groupedFaceIDs[i] + faceIDOffset;
        }

        const meshOptions = {
            numProp: mesh.numProp,
            vertProperties: mesh.vertProperties,
            triVerts: mesh.triVerts,
            faceID,
            runIndex: new Uint32Array([0, mesh.triVerts.length]),
            runOriginalID: new Uint32Array([originalId]),
            tolerance: mesh.tolerance
        };

        tempGeom.dispose();

        try {
            const newMesh = new this.Mesh(meshOptions);
            return this.Manifold.ofMesh(newMesh);
        } catch (e) {
            this.log?.warn?.("attachFaceIDsToManifold failed:", e);
            return null;
        }
    }

    async weldUnion({ meshes = [], tolerance, simplifyTolerance } = {}) {
        if (!meshes.length) return null;
        const ready = await this.ensureModule();
        if (!ready) return null;
        const { Manifold } = this;
        const manifolds = [];
        let union = null;
        let finalManifold = null;
        try {
            for (const mesh of meshes) {
                mesh.updateMatrixWorld?.(true);
                const cleanTol = tolerance || 1e-3;
                const cleaned = this.cleanupGeometry(mesh.geometry, cleanTol);
                const manifold = await this.toManifold(cleaned, mesh.matrixWorld, undefined, cleanTol);
                cleaned?.dispose?.();
                if (manifold) manifolds.push(manifold);
            }
            if (!manifolds.length) return null;
            union = manifolds.length === 1 ? manifolds[0] : Manifold.union(manifolds);
            if (!union) return null;
            finalManifold = union;
            if (simplifyTolerance && simplifyTolerance > 0) {
                const simplified = union.setTolerance(simplifyTolerance);
                if (simplified) finalManifold = simplified;
            }
            return this.fromManifold(finalManifold);
        } catch (err) {
            this.log?.warn?.("weldUnion failed", err);
            return null;
        } finally {
            manifolds.forEach((m) => m?.delete?.());
            if (finalManifold && !manifolds.includes(finalManifold)) finalManifold.delete();
            if (union && union !== finalManifold && !manifolds.includes(union)) union.delete();
        }
    }

    /**
     * Repair geometry using Manifold's robust boolean engine (Self-Union).
     * Fixes non-manifold edges, self-intersections, and internal geometry.
     * @param {THREE.BufferGeometry} geometry 
     * @param {number} tolerance 
     * @returns {Promise<THREE.BufferGeometry>} Repaired geometry
     */
    async repair(geometry, tolerance = 1e-3) {
        if (!geometry) return null;
        const ready = await this.ensureModule();
        if (!ready) return geometry;

        const { Manifold } = this;
        let manifold = null;
        let repairedManifold = null;
        let tempGeom = null;

        try {
            // 1. Pre-process: strict welding to fix "7 non manifold edges" usually caused by duplicate verts
            tempGeom = mergeVertices(geometry.clone(), tolerance);
            tempGeom.computeVertexNormals();

            // 2. Convert to Manifold
            // We use identity matrix as we just want to repair the geometry in local space
            const matrix = new THREE.Matrix4();
            manifold = await this.toManifold(tempGeom, matrix, undefined, tolerance);

            if (!manifold) {
                this.log?.warn?.("Repair failed: could not convert to Manifold");
                return geometry;
            }

            // 3. The Magic: Self-Union (Vector Union)
            // Passing a single manifold to Manifold.union([m]) forces the engine to 
            // resolve all self-intersections and produce a valid watertight volume.
            repairedManifold = Manifold.union([manifold]);

            // 4. Convert back
            const result = this.fromManifold(repairedManifold);
            return result.geometry;

        } catch (err) {
            this.log?.error?.("Manifold repair failed:", err);
            return geometry;
        } finally {
            if (tempGeom) tempGeom.dispose();
            if (manifold) manifold.delete();
            if (repairedManifold && repairedManifold !== manifold) repairedManifold.delete();
        }
    }

    prepareGeometryForCSG(geometry, worldMatrix = null, weldTolerance = 1e-3) {
        if (!appConfig.meshRepair.enabled) return this.cleanupGeometry(geometry, weldTolerance);
        const repairInstance = getRepairInstance(appConfig.meshRepair);
        return repairInstance.prepareForCSG(geometry, worldMatrix);
    }

    cleanupGeometry(geometry, weldTolerance = 1e-3) {
        let geom = geometry.clone();
        const attrsToKeep = ["position", "normal"];
        const keysToRemove = [];
        for (const key in geom.attributes) {
            if (!attrsToKeep.includes(key)) keysToRemove.push(key);
        }
        keysToRemove.forEach((key) => geom.deleteAttribute(key));
        geom = mergeVertices(geom, weldTolerance) || geom;
        geom.computeVertexNormals();
        if (!geom.attributes.position || geom.attributes.position.count < 3) {
            geom.dispose();
            return geometry;
        }
        return geom;
    }

    async toManifold(geometry, matrixWorld, originalId, tolerance, faceIDOffset = 0, generateIDs = true) {
        if (!geometry || !geometry.attributes?.position) return null;
        if (!this.Mesh || !this.Manifold) return null;

        let geom = geometry.clone();

        // Sanitize: Fix NaNs in positions which crash Manifold/MergeVertices
        const posAttr = geom.attributes.position;
        if (posAttr && posAttr.array) {
            const arr = posAttr.array;
            let fixedNaN = 0;
            for (let i = 0; i < arr.length; i++) {
                if (isNaN(arr[i])) {
                    arr[i] = 0;
                    fixedNaN++;
                }
            }
            if (fixedNaN > 0) {
                this.log?.warn?.(`Fixed ${fixedNaN} NaN values in geometry positions`);
                posAttr.needsUpdate = true;
            }
        }

        const weldTol = typeof tolerance === "number" && tolerance > 0 ? tolerance : 1e-3;
        
        // Step 1: Basic Weld
        let welded = mergeVertices(geom, weldTol);
        if (welded) {
            geom.dispose();
            geom = welded;
        }
        geom.computeVertexNormals();

        // Attempt conversion
        let manifold = await this._attemptToManifold(geom, matrixWorld, originalId, tolerance, faceIDOffset, generateIDs);

        // Retry with aggressive repair if failed
        if (!manifold) {
             this.log?.warn?.("Initial Manifold conversion failed. Attempting aggressive pre-repair...");
             
             // Use MeshRepair to clean up degenerate triangles
             const repairInstance = getRepairInstance({
                 minTriangleArea: 1e-8,
                 shortEdgeThreshold: weldTol,
                 weldTolerance: weldTol
             });
             
             // Run synchronous repair (degenerate removal)
             const repairedGeom = repairInstance.repairAndValidate(geom, { 
                 repairLevel: "aggressive", 
                 logRepairs: true 
             });
             
             // Try again
             manifold = await this._attemptToManifold(repairedGeom, matrixWorld, originalId, tolerance, faceIDOffset, generateIDs);
             
             if (manifold) {
                 this.log?.info?.("Manifold conversion succeeded after pre-repair");
             } else {
                 this.log?.error?.("Manifold conversion failed even after pre-repair. Attempting BVH-CSG sanitization...");
                 
                 // Fallback 2: BVH-CSG Sanitization
                 try {
                     const evaluator = new Evaluator();
                     
                     // Helper to validate/fix geometry for Brush
                     const ensureValidForBrush = (geo) => {
                         if (!geo.attributes.position) return null;
                         
                         // Reconstruct as fresh geometry to strip potential garbage data
                         const clean = new THREE.BufferGeometry();
                         
                         // 1. Extract raw positions
                         const srcPos = geo.attributes.position;
                         const count = srcPos.count;
                         
                         // 2. Handle index if present, or explode to soup
                         // three-bvh-csg is often more robust with explicit triangle soup for bad inputs
                         let positions;
                         
                         if (geo.index) {
                             // De-index to ensure no invalid indices
                             const idx = geo.index.array;
                             const arr = new Float32Array(idx.length * 3);
                             for (let i = 0; i < idx.length; i++) {
                                 const vi = idx[i];
                                 arr[i*3] = srcPos.getX(vi);
                                 arr[i*3+1] = srcPos.getY(vi);
                                 arr[i*3+2] = srcPos.getZ(vi);
                             }
                             positions = new THREE.BufferAttribute(arr, 3);
                         } else {
                             // Already soup, just clone
                             positions = srcPos.clone();
                         }
                         
                         clean.setAttribute('position', positions);
                         
                         // 3. Ensure normals
                         clean.computeVertexNormals();
                         
                         return clean;
                     };

                     const validRepaired = ensureValidForBrush(repairedGeom);
                     if (!validRepaired) throw new Error("Invalid geometry for Brush");

                     const brush = new Brush(validRepaired);
                     brush.updateMatrixWorld();
                     
                     // Self-Union (A + A) forces BVH-CSG to rebuild the mesh topology
                     // We use a small epsilon box union to force a recalculation if A+A is optimized away
                     const dummyGeom = new THREE.BoxGeometry(0.0001, 0.0001, 0.0001);
                     const dummyBrush = new Brush(dummyGeom);
                     
                     // Center dummy inside the mesh to ensure processing
                     validRepaired.computeBoundingBox();
                     validRepaired.boundingBox.getCenter(dummyBrush.position);
                     dummyBrush.updateMatrixWorld();

                     const sanitizedBrush = evaluator.evaluate(brush, dummyBrush, ADDITION);
                     
                     if (sanitizedBrush && sanitizedBrush.geometry) {
                         const sanitizedGeom = sanitizedBrush.geometry;
                         // Try Manifold conversion on this sanitized geometry
                         manifold = await this._attemptToManifold(sanitizedGeom, matrixWorld, originalId, tolerance, faceIDOffset, generateIDs);
                         
                         if (manifold) {
                             this.log?.info?.("Manifold conversion succeeded after BVH-CSG sanitization");
                         }
                     }
                 } catch (e) {
                     this.log?.error?.("BVH-CSG sanitization failed", e);
                 }
             }             
             if (repairedGeom !== geom) repairedGeom.dispose();
        }

        geom.dispose();
        return manifold;
    }

    async _attemptToManifold(geom, matrixWorld, originalId, tolerance, faceIDOffset, generateIDs) {
        const position = geom.attributes.position;
        // Check for empty geometry
        if (!position || position.count === 0) return null;

        const vertProperties = new Float32Array(position.count * 3);
        const v = new THREE.Vector3();

        for (let i = 0; i < position.count; i++) {
            v.fromBufferAttribute(position, i).applyMatrix4(matrixWorld);
            const base = i * 3;
            vertProperties[base] = v.x;
            vertProperties[base + 1] = v.y;
            vertProperties[base + 2] = v.z;
        }

        let triVerts;
        if (geom.index) {
            triVerts = new Uint32Array(geom.index.array);
        } else {
            triVerts = new Uint32Array(position.count);
            for (let i = 0; i < position.count; i++) triVerts[i] = i;
        }

        // Validate index range
        const maxIndex = position.count - 1;
        for(let i=0; i<triVerts.length; i++) {
            if (triVerts[i] > maxIndex) {
                 this.log?.error?.(`Index out of bounds: ${triVerts[i]} > ${maxIndex}`);
                 return null;
            }
        }

        let faceID = null;
        if (generateIDs) {
            const { FaceIDGenerator } = await import('./FaceIDGenerator.js');

            const tempGeom = new THREE.BufferGeometry();
            tempGeom.setAttribute('position', new THREE.BufferAttribute(vertProperties, 3));
            tempGeom.setIndex(new THREE.BufferAttribute(triVerts, 1));

            const groupedFaceIDs = FaceIDGenerator.generateFaceIDs(tempGeom, 15, Math.max(tolerance || 1e-3, 1e-4));
            faceID = new Uint32Array(groupedFaceIDs.length);
            for (let i = 0; i < groupedFaceIDs.length; i++) {
                faceID[i] = groupedFaceIDs[i] + faceIDOffset;
            }
            tempGeom.dispose();
        }

        const meshOptions = { numProp: 3, vertProperties, triVerts };
        if (faceID) meshOptions.faceID = faceID;
        if (typeof tolerance === "number" && tolerance > 0) meshOptions.tolerance = tolerance;
        if (typeof originalId === "number") {
            meshOptions.runOriginalID = new Uint32Array([originalId]);
            meshOptions.runIndex = new Uint32Array([0, triVerts.length]);
        }

        try {
            const mesh = new this.Mesh(meshOptions);
            // mesh.merge(); // merge() is deprecated/removed in newer Manifold versions or might be redundant if we provided triVerts correctly? 
            // Actually, in the bindings, we just pass the mesh.
            
            // Note: The previous code called mesh.merge() which might throw if mesh is invalid.
            // Let's try skipping explicit merge() if we trust the input, or keep it if it's essential for the bindings.
            // Based on earlier file content, it was used. Let's keep it but wrap it.
            if (mesh.merge) mesh.merge(); 

            const manifold = this.Manifold.ofMesh(mesh);
            return manifold;
        } catch (err) {
            this.log?.warn?.("toManifold internal error:", err);
            return null;
        }
    }

    fromManifold(manifold) {
        const mesh = manifold.getMesh();
        const positions = new Float32Array(mesh.numVert * 3);
        for (let i = 0; i < mesh.numVert; i++) {
            positions[i * 3] = mesh.vertProperties[i * mesh.numProp];
            positions[i * 3 + 1] = mesh.vertProperties[i * mesh.numProp + 1];
            positions[i * 3 + 2] = mesh.vertProperties[i * mesh.numProp + 2];
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
        geometry.computeVertexNormals();

        return {
            geometry,
            meta: {
                faceID: mesh.faceID ? new Uint32Array(mesh.faceID) : undefined,
                runOriginalID: mesh.runOriginalID ? new Uint32Array(mesh.runOriginalID) : undefined,
                runIndex: mesh.runIndex ? new Uint32Array(mesh.runIndex) : undefined,
                tolerance: mesh.tolerance
            }
        };
    }

    static buildMatrix(position, rotation, scale) {
        const pos = position?.clone?.() || new THREE.Vector3();
        const rot = rotation?.clone?.() || new THREE.Euler();
        const scl = scale?.clone?.() || new THREE.Vector3(1, 1, 1);
        return new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot), scl);
    }
}
