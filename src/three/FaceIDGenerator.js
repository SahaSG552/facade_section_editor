
import * as THREE from "three";

/**
 * FaceIDGenerator
 * EXACT port of BREP's meshToBrep._buildFromGeometry face grouping algorithm
 * 
 * This is a 1:1 translation of the reference implementation to ensure
 * identical behavior with lathe geometry, fillets, and sloped planes.
 */
export class FaceIDGenerator {

    /**
     * Generate Face IDs for the given geometry.
     * Algorithm ported from brep_reference/src/BREP/meshToBrep.js
     * 
     * @param {THREE.BufferGeometry} geometry 
     * @param {number} faceDeflectionAngle - Angle in degrees (default 30 like BREP)
     * @param {number} weldTolerance - Vertex welding tolerance (default 1e-5 like BREP)
     * @returns {Uint32Array} - Array of Face IDs matching the triangle count.
     */
    static generateFaceIDs(geometry, faceDeflectionAngle = 30, weldTolerance = 1e-5) {
        // Ensure we have positions
        const posAttr = geometry.getAttribute('position');
        if (!posAttr) {
            console.warn("FaceIDGenerator: Geometry has no 'position' attribute");
            return new Uint32Array(0);
        }

        const idxAttr = geometry.getIndex();
        const norAttr = geometry.getAttribute('normal');

        // Accessor helpers (from BREP)
        const getPos = (i, out) => {
            out.x = posAttr.getX(i);
            out.y = posAttr.getY(i);
            out.z = posAttr.getZ(i);
            return out;
        };

        const getTri = (t) => {
            if (idxAttr) {
                const i0 = idxAttr.getX(3 * t + 0) >>> 0;
                const i1 = idxAttr.getX(3 * t + 1) >>> 0;
                const i2 = idxAttr.getX(3 * t + 2) >>> 0;
                return [i0, i1, i2];
            } else {
                const base = 3 * t;
                return [base + 0, base + 1, base + 2];
            }
        };

        const triCount = idxAttr ? ((idxAttr.count / 3) | 0) : ((posAttr.count / 3) | 0);
        if (triCount <= 0) return new Uint32Array(0);

        console.group(`FaceIDGenerator: Processing ${triCount} triangles`);
        console.log("FaceIDGenerator v3 (Topological Split Enabled)");
        console.log(`Config: Angle=${faceDeflectionAngle}, LinearTolerance=${weldTolerance}`);

        // Build canonical vertices using a weld grid (EXACT BREP logic)
        const q = Math.max(0, weldTolerance) || 0;
        const gridKey = (x, y, z) => {
            if (q <= 0) return `${x},${y},${z}`; // exact
            const rx = Math.round(x / q);
            const ry = Math.round(y / q);
            const rz = Math.round(z / q);
            return `${rx},${ry},${rz}`;
        };

        const tmpA = new THREE.Vector3();
        const tmpB = new THREE.Vector3();
        const tmpC = new THREE.Vector3();

        // Vertex dictionary and arrays
        const keyToIndex = new Map();
        const indexToPos = []; // [[x,y,z], ...]

        // Triangle data arrays
        const triVerts = new Array(triCount);
        const triNormals = new Array(triCount);

        // Grab per-vertex normals if available (STL facet normals)
        const getTriNormal = (t) => {
            if (norAttr && norAttr.count === posAttr.count) {
                const [i0] = getTri(t);
                const nx = norAttr.getX(i0);
                const ny = norAttr.getY(i0);
                const nz = norAttr.getZ(i0);
                const n = new THREE.Vector3(nx, ny, nz);
                if (n.lengthSq() > 0) return n.normalize();
            }
            // Fallback: compute from positions
            const [a, b, c] = getTri(t);
            getPos(a, tmpA); getPos(b, tmpB); getPos(c, tmpC);
            tmpB.sub(tmpA); tmpC.sub(tmpA);
            const n = tmpB.clone().cross(tmpC);
            if (n.lengthSq() > 0) return n.normalize();
            return new THREE.Vector3(0, 0, 1); // Reference default (avoids holes)
        };

        // Build canonical vertices and triangle index triplets
        for (let t = 0; t < triCount; t++) {
            const [ia, ib, ic] = getTri(t);
            const a = getPos(ia, tmpA.clone());
            const b = getPos(ib, tmpB.clone());
            const c = getPos(ic, tmpC.clone());

            const keyA = gridKey(a.x, a.y, a.z);
            const keyB = gridKey(b.x, b.y, b.z);
            const keyC = gridKey(c.x, c.y, c.z);

            // Get or create canonical vertex index for A
            let ai = keyToIndex.get(keyA);
            if (ai === undefined) {
                ai = indexToPos.length;
                keyToIndex.set(keyA, ai);
                const [xr, yr, zr] = (q <= 0) ? [a.x, a.y, a.z] :
                    [Math.round(a.x / q) * q, Math.round(a.y / q) * q, Math.round(a.z / q) * q];
                indexToPos.push([xr, yr, zr]);
            }

            // Get or create canonical vertex index for B
            let bi = keyToIndex.get(keyB);
            if (bi === undefined) {
                bi = indexToPos.length;
                keyToIndex.set(keyB, bi);
                const [xr, yr, zr] = (q <= 0) ? [b.x, b.y, b.z] :
                    [Math.round(b.x / q) * q, Math.round(b.y / q) * q, Math.round(b.z / q) * q];
                indexToPos.push([xr, yr, zr]);
            }

            // Get or create canonical vertex index for C
            let ci = keyToIndex.get(keyC);
            if (ci === undefined) {
                ci = indexToPos.length;
                keyToIndex.set(keyC, ci);
                const [xr, yr, zr] = (q <= 0) ? [c.x, c.y, c.z] :
                    [Math.round(c.x / q) * q, Math.round(c.y / q) * q, Math.round(c.z / q) * q];
                indexToPos.push([xr, yr, zr]);
            }

            triVerts[t] = [ai, bi, ci];
            triNormals[t] = getTriNormal(t);
        }

        console.log(`Canonical Vertices: ${indexToPos.length} (Ratio: ${(indexToPos.length / (triCount * 3)).toFixed(2)})`);

        // Build adjacency via undirected edge -> list of triangle indices
        const ek = (u, v) => (u < v ? `${u},${v}` : `${v},${u}`);
        const edgeToTris = new Map();
        for (let t = 0; t < triCount; t++) {
            const [a, b, c] = triVerts[t];
            const edges = [[a, b], [b, c], [c, a]];
            for (const [u, v] of edges) {
                const key = ek(u, v);
                let list = edgeToTris.get(key);
                if (!list) { list = []; edgeToTris.set(key, list); }
                list.push(t);
            }
        }

        // Convert to per-triangle neighbor lists
        const neighbors = new Array(triCount);
        for (let i = 0; i < triCount; i++) neighbors[i] = [];
        for (const list of edgeToTris.values()) {
            if (list.length < 2) continue;
            // Each pair of triangles sharing this edge are neighbors
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    const a = list[i], b = list[j];
                    neighbors[a].push(b);
                    neighbors[b].push(a);
                }
            }
        }

        // Region grow faces by deflection angle between neighboring triangle normals
        const maxAngleRad = Math.max(0, faceDeflectionAngle) * Math.PI / 180.0;
        const cosThresh = Math.cos(maxAngleRad);
        const visited = new Uint8Array(triCount);
        let faceCounter = 0;
        const triFaceID = new Uint32Array(triCount);

        // CRITICAL: Dot product with re-normalization (BREP does this!)
        const dot = (a, b) => {
            const d = a.x * b.x + a.y * b.y + a.z * b.z;
            const la = Math.hypot(a.x, a.y, a.z);
            const lb = Math.hypot(b.x, b.y, b.z);
            if (la === 0 || lb === 0) return 1; // treat degenerate as same
            return d / (la * lb);
        };

        for (let seed = 0; seed < triCount; seed++) {
            if (visited[seed]) continue;
            const faceID = ++faceCounter;
            // BFS using pairwise deflection with the current triangle (EXACT BREP)
            const queue = [seed];
            visited[seed] = 1;
            triFaceID[seed] = faceID;

            while (queue.length) {
                const t = queue.shift(); // FIFO like BREP
                const nrmT = triNormals[t];
                if (!nrmT) continue; // Skip degenerate

                for (const nb of neighbors[t]) {
                    if (visited[nb]) continue;
                    const nrmN = triNormals[nb];
                    if (!nrmN) continue; // Skip degenerate neighbor

                    // If normals are close (angle <= threshold), grow region
                    if (dot(nrmT, nrmN) >= cosThresh) {
                        visited[nb] = 1;
                        triFaceID[nb] = faceID;
                        queue.push(nb);
                    }
                }
            }
        }

        // Post-processing: Split disjoint components
        // Refine the geometrically generated IDs to ensure topological connectivity
        console.log(`FaceIDGenerator: Generated ${faceCounter} faces. Splitting disjoint...`);
        const refinedIDs = FaceIDGenerator.splitDisjointFaceGroups(geometry, triFaceID, faceCounter);

        console.groupEnd();
        return refinedIDs;
    }

    /**
     * Split disjoint components that share the same FaceID.
     * Guarantees that spatially separated parts get unique IDs.
     * Uses position-based welding (0.01mm grid) to robustly bridge indices.
     * 
     * @param {THREE.BufferGeometry} geometry 
     * @param {Uint32Array} faceIDs 
     * @param {number} [minNewID=null] Starting ID for new groups (optional, auto-detected if null)
     * @returns {Uint32Array} New array with refined IDs
     */
    static splitDisjointFaceGroups(geometry, faceIDs, minNewID = null) {
        // Ensure we have positions
        const posAttr = geometry.getAttribute('position');
        const idxAttr = geometry.getIndex();

        // Approximate tri count
        const triCount = idxAttr ? (idxAttr.count / 3) : ((posAttr ? posAttr.count / 3 : 0) | 0);

        if (!faceIDs || faceIDs.length === 0 || triCount === 0 || faceIDs.length !== triCount) {
            console.warn("FaceIDGenerator.splitDisjointFaceGroups: Invalid input", triCount, faceIDs?.length);
            return faceIDs;
        }

        const triFaceID = new Uint32Array(faceIDs);

        let maxID = 0;
        if (minNewID !== null) {
            maxID = minNewID;
        } else {
            for (let i = 0; i < triCount; i++) if (triFaceID[i] > maxID) maxID = triFaceID[i];
        }

        // Build Canonical Vertices Map (Position-based welding)
        // Using a generous tolerance (1e-4 = 0.1mm ?) or 1e-5 (0.01mm)
        // Manifold typical precision is float32. 
        // 1.0 = 1mm. 1e-4 = 0.0001 = 0.1 micron? 
        // No. If unit is meters, 1e-4 = 0.1mm. If unit is mm, 1e-4 = 0.0001mm.
        // Assuming unit is mm (facade editor).
        // Let's use 1000 (0.001) for safety, or 10000 (0.0001).
        const PRECISION = 10000;

        const posMap = new Map();
        const canonIndices = new Int32Array(triCount * 3);
        let uniqueVerts = 0;

        const getKey = (x, y, z) => {
            const rx = Math.round(x * PRECISION);
            const ry = Math.round(y * PRECISION);
            const rz = Math.round(z * PRECISION);
            return `${rx},${ry},${rz}`;
        };

        const getTri = (t) => {
            if (idxAttr) {
                return [idxAttr.getX(t * 3), idxAttr.getX(t * 3 + 1), idxAttr.getX(t * 3 + 2)];
            } else {
                return [t * 3, t * 3 + 1, t * 3 + 2];
            }
        };

        for (let t = 0; t < triCount; t++) {
            const [i0, i1, i2] = getTri(t);

            // Vertex 0
            const k0 = getKey(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0));
            let c0 = posMap.get(k0);
            if (c0 === undefined) { c0 = uniqueVerts++; posMap.set(k0, c0); }
            canonIndices[t * 3] = c0;

            // Vertex 1
            const k1 = getKey(posAttr.getX(i1), posAttr.getY(i1), posAttr.getZ(i1));
            let c1 = posMap.get(k1);
            if (c1 === undefined) { c1 = uniqueVerts++; posMap.set(k1, c1); }
            canonIndices[t * 3 + 1] = c1;

            // Vertex 2
            const k2 = getKey(posAttr.getX(i2), posAttr.getY(i2), posAttr.getZ(i2));
            let c2 = posMap.get(k2);
            if (c2 === undefined) { c2 = uniqueVerts++; posMap.set(k2, c2); }
            canonIndices[t * 3 + 2] = c2;
        }

        // Build Adjacency
        const ek = (u, v) => (u < v ? `${u},${v}` : `${v},${u}`);
        const edgeToTris = new Map();

        for (let t = 0; t < triCount; t++) {
            const a = canonIndices[t * 3];
            const b = canonIndices[t * 3 + 1];
            const c = canonIndices[t * 3 + 2];
            const edges = [[a, b], [b, c], [c, a]];
            for (const [u, v] of edges) {
                const key = ek(u, v);
                let list = edgeToTris.get(key);
                if (!list) { list = []; edgeToTris.set(key, list); }
                list.push(t);
            }
        }

        const neighbors = new Array(triCount);
        for (let t = 0; t < triCount; t++) neighbors[t] = [];
        for (const list of edgeToTris.values()) {
            if (list.length > 1) {
                for (let i = 0; i < list.length; i++) {
                    for (let j = i + 1; j < list.length; j++) {
                        const t1 = list[i], t2 = list[j];
                        neighbors[t1].push(t2);
                        neighbors[t2].push(t1);
                    }
                }
            }
        }

        // Topological Split Logic
        const visited = new Uint8Array(triCount); // 0/1
        const seenIDs = new Set();
        let splitCount = 0;

        for (let seed = 0; seed < triCount; seed++) {
            if (visited[seed]) continue;

            const originalID = triFaceID[seed];
            let activeID = originalID;

            if (seenIDs.has(originalID)) {
                activeID = ++maxID;
                splitCount++;
            } else {
                seenIDs.add(originalID);
            }

            const queue = [seed];
            visited[seed] = 1;
            triFaceID[seed] = activeID;

            while (queue.length) {
                const t = queue.shift();
                for (const nb of neighbors[t]) {
                    // Check original ID to allow traversal within the semantic group
                    if (!visited[nb] && triFaceID[nb] === originalID) {
                        visited[nb] = 1;
                        triFaceID[nb] = activeID;
                        queue.push(nb);
                    }
                }
            }
        }

        if (splitCount > 0) {
            console.log(`FaceIDGenerator: Refined IDs. Split ${splitCount} disjoint fragments.`);
        }
        return triFaceID;
    }
}
