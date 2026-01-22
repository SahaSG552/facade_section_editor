
import * as THREE from "three";

/**
 * FaceIDGenerator
 * Analyzes a geometry and assigns Face IDs to triangles based on coplanarity and adjacency.
 * This is essential for "Planar Face Merging" (Clean Edges) where we want to treat
 * multiple triangles as a single logical face.
 * 
 * Logic adapted from `meshToBrep.js`:
 * 1. Build adjacency graph (which triangles share edges).
 *    - CRITICAL: Use position-based welding to handle mesh seams/split vertices.
 * 2. Region grow (BFS) based on normal similarity (coplanarity).
 *    - CRITICAL: Use neighbor-to-neighbor comparison (Surface Crawling) for curved surfaces.
 * 3. Assign unique ID to each region.
 */
export class FaceIDGenerator {

    /**
     * Generate Face IDs for the given geometry.
     * @param {THREE.BufferGeometry} geometry 
     * @param {number} thresholdAngleDeg - Angle in degrees to consider faces coplanar.
     * @returns {Uint32Array} - Array of Face IDs matching the triangle count.
     */
    static generateFaceIDs(geometry, thresholdAngleDeg = 45.0) { // Default 45 deg for coarse fillets
        // Auto-index if missing (Manifold usually returns indexed, but safety first)
        if (!geometry.index) {
            const indices = [];
            const posCount = geometry.attributes.position.count;
            for (let i = 0; i < posCount; i++) indices.push(i);
            geometry.setIndex(indices);
        }

        const indexAttr = geometry.index;
        const posAttr = geometry.attributes.position;
        const count = indexAttr.count / 3;

        // 1. Compute per-triangle normals
        const triNormals = new Float32Array(count * 3);
        const cb = new THREE.Vector3();
        const ab = new THREE.Vector3();
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const a = indexAttr.getX(i3);
            const b = indexAttr.getX(i3 + 1);
            const c = indexAttr.getX(i3 + 2);

            vA.fromBufferAttribute(posAttr, a);
            vB.fromBufferAttribute(posAttr, b);
            vC.fromBufferAttribute(posAttr, c);

            cb.subVectors(vC, vB);
            ab.subVectors(vA, vB);
            cb.cross(ab).normalize(); // Normal

            triNormals[i * 3] = cb.x;
            triNormals[i * 3 + 1] = cb.y;
            triNormals[i * 3 + 2] = cb.z;
        }

        // 2. Build Adjacency Graph with Vertex Welding
        // We must weld vertices by position to ensure that coincident vertices are treated as the same node.
        // Manifold/CSG results often split vertices at UVs or sharp edges (seams).

        const edges = new Map();
        const weldTolerance = 1e-5;

        // Canonical Vertex Map: "ix,iy,iz" -> Canonical ID
        const posToCanonical = new Map();
        const canonicalIndices = new Int32Array(count * 3); // Map every corner of every triangle to a canonical index

        // Helper to generate key
        const getKey = (x, y, z) => {
            const ix = Math.round(x / weldTolerance);
            const iy = Math.round(y / weldTolerance);
            const iz = Math.round(z / weldTolerance);
            return `${ix},${iy},${iz}`;
        };

        const vTmp = new THREE.Vector3();

        // Pass 2.1: Identify canonical indices for all vertices
        let nextCanonicalId = 0;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            for (let k = 0; k < 3; k++) {
                const idx = indexAttr.getX(i3 + k);
                vTmp.fromBufferAttribute(posAttr, idx);
                const key = getKey(vTmp.x, vTmp.y, vTmp.z); // Round for tolerance

                let cId = posToCanonical.get(key);
                if (cId === undefined) {
                    cId = nextCanonicalId++;
                    posToCanonical.set(key, cId);
                }
                canonicalIndices[i3 + k] = cId;
            }
        }

        // Helper to get sortable edge key using CANONICAL indices
        const getEdgeKey = (c1, c2) => c1 < c2 ? `${c1}_${c2}` : `${c2}_${c1}`;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            // Use canonical indices instead of raw mesh indices
            const cA = canonicalIndices[i3];
            const cB = canonicalIndices[i3 + 1];
            const cC = canonicalIndices[i3 + 2];

            const e1 = getEdgeKey(cA, cB);
            const e2 = getEdgeKey(cB, cC);
            const e3 = getEdgeKey(cC, cA);

            [e1, e2, e3].forEach(key => {
                if (!edges.has(key)) edges.set(key, []);
                edges.get(key).push(i);
            });
        }

        const neighbors = new Array(count).fill(null).map(() => []);

        edges.forEach((tris) => {
            // If edge shared by 2 or more triangles, link them
            for (let i = 0; i < tris.length; i++) {
                for (let j = i + 1; j < tris.length; j++) {
                    const t1 = tris[i];
                    const t2 = tris[j];
                    if (!neighbors[t1].includes(t2)) neighbors[t1].push(t2);
                    if (!neighbors[t2].includes(t1)) neighbors[t2].push(t1);
                }
            }
        });

        // 3. Region Grow
        const faceIDs = new Uint32Array(count); // 0 = unassigned
        let nextID = 1;
        const thresholdDot = Math.cos(THREE.MathUtils.degToRad(thresholdAngleDeg));

        for (let i = 0; i < count; i++) {
            if (faceIDs[i] !== 0) continue;

            // Start new face
            const currentID = nextID++;
            faceIDs[i] = currentID;

            const queue = [i];

            // SURFACE CRAWLING LOGIC: 
            // We compare normals neighbor-to-neighbor (local continuity).
            // This allows selecting an entire "strip" that curves (like the side of an arch).

            let ptr = 0;
            while (ptr < queue.length) {
                const currentTri = queue[ptr++];
                const currentNeighbors = neighbors[currentTri];

                // Get normal of current triangle to compare with neighbors
                const cx = triNormals[currentTri * 3];
                const cy = triNormals[currentTri * 3 + 1];
                const cz = triNormals[currentTri * 3 + 2];

                for (const nb of currentNeighbors) {
                    if (faceIDs[nb] !== 0) continue;

                    const nx = triNormals[nb * 3];
                    const ny = triNormals[nb * 3 + 1];
                    const nz = triNormals[nb * 3 + 2];

                    // Compare with CURRENT triangle (local continuity), not START triangle
                    const dot = cx * nx + cy * ny + cz * nz;

                    if (dot >= thresholdDot) {
                        faceIDs[nb] = currentID;
                        queue.push(nb);
                    }
                }
            }
        }

        return faceIDs;
    }
}
