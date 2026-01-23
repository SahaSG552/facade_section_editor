import * as THREE from "three";

/**
 * FaceIDGenerator
 * EXACT port of BREP's meshToBrep._buildFromGeometry face grouping algorithm
 * 
 * Enhanced with Topological Split to handle disjoint islands of the same FaceID.
 * Feature unity is handled by Post-Union ID generation in the CSG engine.
 */
export class FaceIDGenerator {

    /**
     * Generate Face IDs for the given geometry.
     * @param {THREE.BufferGeometry} geometry 
     * @param {number} faceDeflectionAngle - Angle in degrees (default 15 for CAD-like precision)
     * @param {number} weldTolerance - Vertex welding tolerance (default 1e-5)
     * @returns {Uint32Array} - Array of Face IDs matching the triangle count.
     */
    static generateFaceIDs(geometry, faceDeflectionAngle = 15, weldTolerance = 1e-5) {
        const posAttr = geometry.getAttribute('position');
        if (!posAttr) return new Uint32Array(0);

        const idxAttr = geometry.getIndex();
        const norAttr = geometry.getAttribute('normal');

        const getPos = (i, out) => {
            out.x = posAttr.getX(i);
            out.y = posAttr.getY(i);
            out.z = posAttr.getZ(i);
            return out;
        };

        const getTri = (t) => {
            if (idxAttr) {
                return [idxAttr.getX(3 * t) >>> 0, idxAttr.getX(3 * t + 1) >>> 0, idxAttr.getX(3 * t + 2) >>> 0];
            }
            return [3 * t, 3 * t + 1, 3 * t + 2];
        };

        const triCount = idxAttr ? ((idxAttr.count / 3) | 0) : ((posAttr.count / 3) | 0);
        if (triCount <= 0) return new Uint32Array(0);

        const q = Math.max(0, weldTolerance) || 0;
        const gridKey = (x, y, z) => {
            if (q <= 0) return `${x},${y},${z}`;
            return `${Math.round(x / q)},${Math.round(y / q)},${Math.round(z / q)}`;
        };

        const keyToIndex = new Map();
        const indexToPos = [];
        const triVerts = new Array(triCount);
        const triNormals = new Array(triCount);
        const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();

        const getTriNormal = (t) => {
            if (norAttr && norAttr.count === posAttr.count) {
                const [i0] = getTri(t);
                const n = new THREE.Vector3(norAttr.getX(i0), norAttr.getY(i0), norAttr.getZ(i0));
                if (n.lengthSq() > 0) return n.normalize();
            }
            const [a, b, c] = getTri(t);
            getPos(a, tmpA); getPos(b, tmpB); getPos(c, tmpC);
            tmpB.sub(tmpA); tmpC.sub(tmpA);
            const n = tmpB.clone().cross(tmpC);
            if (n.lengthSq() > 0) return n.normalize();
            return new THREE.Vector3(0, 0, 1);
        };

        for (let t = 0; t < triCount; t++) {
            const [ia, ib, ic] = getTri(t);
            const verts = [ia, ib, ic].map(idx => {
                getPos(idx, tmpA);
                const k = gridKey(tmpA.x, tmpA.y, tmpA.z);
                let ci = keyToIndex.get(k);
                if (ci === undefined) { ci = indexToPos.length; keyToIndex.set(k, ci); indexToPos.push(k); }
                return ci;
            });
            triVerts[t] = verts;
            triNormals[t] = getTriNormal(t);
        }

        const edgeToTris = new Map();
        for (let t = 0; t < triCount; t++) {
            const [a, b, c] = triVerts[t];
            [[a, b], [b, c], [c, a]].forEach(([u, v]) => {
                const k = u < v ? `${u},${v}` : `${v},${u}`;
                let l = edgeToTris.get(k); if (!l) edgeToTris.set(k, l = []); l.push(t);
            });
        }

        const neighbors = new Array(triCount).fill(0).map(() => []);
        edgeToTris.forEach(list => {
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    neighbors[list[i]].push(list[j]); neighbors[list[j]].push(list[i]);
                }
            }
        });

        const cosThresh = Math.cos(faceDeflectionAngle * Math.PI / 180.0);
        const triFaceID = new Uint32Array(triCount);
        const visited = new Uint8Array(triCount);
        let faceCounter = 0;

        for (let seed = 0; seed < triCount; seed++) {
            if (visited[seed]) continue;
            const fid = ++faceCounter;
            const queue = [seed]; visited[seed] = 1; triFaceID[seed] = fid;
            while (queue.length) {
                const t = queue.shift();
                const nT = triNormals[t];
                neighbors[t].forEach(nb => {
                    if (!visited[nb] && nT.dot(triNormals[nb]) >= cosThresh) {
                        visited[nb] = 1; triFaceID[nb] = fid; queue.push(nb);
                    }
                });
            }
        }

        return FaceIDGenerator.splitDisjointFaceGroups(geometry, triFaceID, faceCounter);
    }

    /**
     * Split disjoint components that share the same FaceID.
     * Guarantees that spatially separated parts get unique IDs.
     */
    static splitDisjointFaceGroups(geometry, faceIDs, minNewID = null) {
        const triCount = faceIDs.length;
        const triFaceID = new Uint32Array(faceIDs);
        const posAttr = geometry.getAttribute('position');
        const idxAttr = geometry.getIndex();

        let maxID = minNewID || 0;
        if (!minNewID) for (let i = 0; i < triCount; i++) if (triFaceID[i] > maxID) maxID = triFaceID[i];

        const PRECISION = 10000;
        const posMap = new Map();
        const canonIndices = new Int32Array(triCount * 3);
        let uniqueVerts = 0;

        for (let t = 0; t < triCount; t++) {
            const base = (idxAttr ? [idxAttr.getX(t * 3), idxAttr.getX(t * 3 + 1), idxAttr.getX(t * 3 + 2)] : [t * 3, t * 3 + 1, t * 3 + 2]);
            base.forEach((idx, offset) => {
                const k = `${Math.round(posAttr.getX(idx) * PRECISION)},${Math.round(posAttr.getY(idx) * PRECISION)},${Math.round(posAttr.getZ(idx) * PRECISION)}`;
                let ci = posMap.get(k);
                if (ci === undefined) { ci = uniqueVerts++; posMap.set(k, ci); }
                canonIndices[t * 3 + offset] = ci;
            });
        }

        const edgeToTris = new Map();
        for (let t = 0; t < triCount; t++) {
            const v = [canonIndices[t * 3], canonIndices[t * 3 + 1], canonIndices[t * 3 + 2]];
            [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]].forEach(([u, v]) => {
                const k = u < v ? `${u},${v}` : `${v},${u}`;
                let l = edgeToTris.get(k); if (!l) edgeToTris.set(k, l = []); l.push(t);
            });
        }

        const neighbors = new Array(triCount).fill(0).map(() => []);
        edgeToTris.forEach(l => {
            for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
                neighbors[l[i]].push(l[j]); neighbors[l[j]].push(l[i]);
            }
        });

        const visited = new Uint8Array(triCount);
        const seenIDs = new Set();

        for (let seed = 0; seed < triCount; seed++) {
            if (visited[seed]) continue;
            const originalID = triFaceID[seed];
            let activeID = originalID;

            if (seenIDs.has(originalID)) {
                activeID = ++maxID;
            } else {
                seenIDs.add(originalID);
            }

            const queue = [seed]; visited[seed] = 1; triFaceID[seed] = activeID;
            while (queue.length) {
                const t = queue.shift();
                neighbors[t].forEach(nb => {
                    if (!visited[nb] && triFaceID[nb] === originalID) {
                        visited[nb] = 1; triFaceID[nb] = activeID; queue.push(nb);
                    }
                });
            }
        }
        return triFaceID;
    }
}
