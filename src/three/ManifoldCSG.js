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
                    const m = await this.toManifold(
                        mesh.geometry,
                        mesh.matrixWorld,
                        undefined,
                        cutterTolerance || tolerance || 1e-3,
                        0,
                        false // Skip ID generation for parts
                    );
                    if (m) groupManifolds.push(m);
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
                const manifold = await this.toManifold(
                    mesh.geometry,
                    mesh.matrixWorld,
                    idStart + idx + 1,
                    tolerance,
                    currentFaceOffset
                );
                if (manifold) cutterManifolds.push(manifold);
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
        const weldTol = typeof tolerance === "number" && tolerance > 0 ? tolerance : 1e-3;
        geom = mergeVertices(geom, weldTol) || geom;
        geom.computeVertexNormals();

        const position = geom.attributes.position;
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

        let faceID = null;
        if (generateIDs) {
            const { FaceIDGenerator } = await import('./FaceIDGenerator.js');

            const tempGeom = new THREE.BufferGeometry();
            tempGeom.setAttribute('position', new THREE.BufferAttribute(vertProperties, 3));
            tempGeom.setIndex(new THREE.BufferAttribute(triVerts, 1));

            const groupedFaceIDs = FaceIDGenerator.generateFaceIDs(tempGeom, 15, Math.max(weldTol, 1e-4));
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
            mesh.merge();
            const manifold = this.Manifold.ofMesh(mesh);
            geom.dispose();
            return manifold;
        } catch (err) {
            geom.dispose();
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
