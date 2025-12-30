import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getManifoldModule, setWasmUrl } from "manifold-3d/lib/wasm.js";
import wasmUrl from "manifold-3d/manifold.wasm?url";

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
     * @param {object} config
     * @param {THREE.BufferGeometry} config.panelGeometry
     * @param {THREE.Matrix4} config.panelMatrix - world transform for panel
     * @param {Array<THREE.Mesh>} config.cutters - meshes to subtract
     * @param {number} [config.tolerance] - optional mesh tolerance
     * @param {number} [config.simplifyTolerance] - optional simplification tol
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

        // Reserve unique IDs for provenance tracking
        const idStart = Manifold.reserveIDs(1 + cutters.length);

        const panelManifold = this.toManifold(
            panelGeometry,
            panelMatrix,
            idStart,
            tolerance
        );
        if (!panelManifold) return null;

        const cutterManifolds = cutters
            .map((mesh, idx) => {
                mesh.updateMatrixWorld?.(true);
                // Clean up cutter geometry to fix naked edges, use higher tolerance for cutters
                const cleanTol = cutterTolerance || tolerance || 1e-3;
                const cleanedGeom = this.cleanupGeometry(
                    mesh.geometry,
                    cleanTol
                );
                return this.toManifold(
                    cleanedGeom,
                    mesh.matrixWorld,
                    idStart + idx + 1,
                    tolerance
                );
            })
            .filter(Boolean);

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
            // Clean up all WASM objects
            cutterManifolds.forEach((m) => m?.delete());
            if (union && union !== cutterManifolds[0]) {
                union.delete();
            }
            panelManifold.delete();
            result?.delete();
        }
    }

    /**
     * Clean up geometry: weld vertices, compute normals, remove extra attributes
     */
    cleanupGeometry(geometry, weldTolerance = 1e-3) {
        let geom = geometry.clone();

        // Remove unnecessary attributes that might cause issues
        const attrsToKeep = ["position", "normal"];
        const keysToRemove = [];
        for (const key in geom.attributes) {
            if (!attrsToKeep.includes(key)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => geom.deleteAttribute(key));

        // Merge duplicate vertices using tolerance
        geom = mergeVertices(geom, weldTolerance) || geom;

        // Recompute normals to ensure correct face orientation
        geom.computeVertexNormals();

        // Ensure geometry is valid
        if (!geom.attributes.position || geom.attributes.position.count < 3) {
            geom.dispose();
            return geometry; // Return original if cleanup failed
        }

        return geom;
    }

    /**
     * Convert a Three BufferGeometry + transform into a Manifold.
     */
    toManifold(geometry, matrixWorld, originalId, tolerance) {
        if (!geometry || !geometry.attributes?.position) return null;

        if (!this.Mesh || !this.Manifold) return null;

        // Clone and weld vertices to improve manifoldness
        let geom = geometry.clone();
        const weldTol =
            typeof tolerance === "number" && tolerance > 0 ? tolerance : 1e-3;
        geom = mergeVertices(geom, weldTol) || geom;
        geom.computeVertexNormals();

        // If still unindexed, keep as-is without forcing toNonIndexed

        const position = geom.attributes.position;
        const vertCount = position.count;
        const vertProperties = new Float32Array(vertCount * 3);
        const v = new THREE.Vector3();

        for (let i = 0; i < vertCount; i++) {
            v.fromBufferAttribute(position, i).applyMatrix4(matrixWorld);
            const base = i * 3;
            vertProperties[base] = v.x;
            vertProperties[base + 1] = v.y;
            vertProperties[base + 2] = v.z;
        }

        let triVerts;
        if (geom.index) {
            const indexArray = geom.index.array;
            triVerts = new Uint32Array(indexArray.length);
            for (let i = 0; i < indexArray.length; i++) {
                triVerts[i] = indexArray[i];
            }
        } else {
            if (vertCount % 3 !== 0) {
                geom.dispose();
                return null;
            }
            triVerts = new Uint32Array(vertCount);
            for (let i = 0; i < vertCount; i++) triVerts[i] = i;
        }

        const meshOptions = {
            numProp: 3,
            vertProperties,
            triVerts,
        };

        // Use tolerance if provided, otherwise let Manifold use default
        if (typeof tolerance === "number" && tolerance > 0) {
            meshOptions.tolerance = tolerance;
        }

        if (typeof originalId === "number") {
            meshOptions.runOriginalID = new Uint32Array([originalId]);
            meshOptions.runIndex = new Uint32Array([0, triVerts.length]);
        }

        try {
            const mesh = new this.Mesh(meshOptions);

            // Try to merge duplicate vertices which might fix manifold issues
            const changed = mesh.merge();
            if (changed) {
                this.log?.info?.("Manifold: merged duplicate vertices");
            }

            const manifold = this.Manifold.ofMesh(mesh);
            // Mesh is a plain JS class here; no delete() needed
            geom.dispose();
            return manifold;
        } catch (err) {
            geom.dispose();
            this.log?.warn?.(
                `toManifold failed for geometry with ${vertCount} verts, ${
                    triVerts.length / 3
                } tris:`,
                err.code || err.message
            );
            return null;
        }
    }

    /**
     * Convert a Manifold back into Three BufferGeometry plus metadata.
     */
    fromManifold(manifold) {
        const mesh = manifold.getMesh();
        const numProp = mesh.numProp;
        const vertCount = mesh.numVert;

        const positions = new Float32Array(vertCount * 3);
        for (let i = 0; i < vertCount; i++) {
            const baseIn = i * numProp;
            const baseOut = i * 3;
            positions[baseOut] = mesh.vertProperties[baseIn];
            positions[baseOut + 1] = mesh.vertProperties[baseIn + 1];
            positions[baseOut + 2] = mesh.vertProperties[baseIn + 2];
        }

        const indices = new Uint32Array(mesh.triVerts);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();

        const meta = {
            runOriginalID: mesh.runOriginalID
                ? new Uint32Array(mesh.runOriginalID)
                : undefined,
            runIndex: mesh.runIndex
                ? new Uint32Array(mesh.runIndex)
                : undefined,
            faceID: mesh.faceID ? new Uint32Array(mesh.faceID) : undefined,
            tolerance: mesh.tolerance,
        };

        // Mesh from getMesh is a JS wrapper without delete(); the manifold owning it is deleted elsewhere.
        return { geometry, meta };
    }

    /**
     * Build transform matrix from position/rotation/scale triples.
     */
    static buildMatrix(position, rotation, scale) {
        const pos = position?.clone?.() || new THREE.Vector3();
        const rot = rotation?.clone?.() || new THREE.Euler();
        const scl = scale?.clone?.() || new THREE.Vector3(1, 1, 1);
        return new THREE.Matrix4().compose(
            pos,
            new THREE.Quaternion().setFromEuler(rot),
            scl
        );
    }
}
