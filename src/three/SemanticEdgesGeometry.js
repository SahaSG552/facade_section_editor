
import * as THREE from 'three';

/**
 * SemanticEdgesGeometry
 * Generates edge geometry by checking for faceID discontinuities between adjacent triangles.
 * This effectively implements "Clean Edges" or "Planar Face Merging" visualization.
 * 
 * Logic:
 * 1. Iterate all triangles.
 * 2. Identify shared edges.
 * 3. An edge is drawn if:
 *    - It belongs to only one triangle (mesh boundary).
 *    - The two triangles sharing it have different `faceID` or `runOriginalID`.
 *    - (Optional) The angle between normals exceeds a threshold (for smooth faces that are logically one part but curved? - For now, strict ID check is safer for "planar" merging).
 */
export class SemanticEdgesGeometry extends THREE.BufferGeometry {

    constructor(geometry, faceIDs, tolerance = 1e-6) {
        super();
        this.type = 'SemanticEdgesGeometry';

        if (!geometry) return;

        this.parameters = { tolerance };

        const thresholdDot = Math.cos((Math.PI / 180) * 1); // 1 degree hardcoded for now if we needed normal check

        // Ensure geometry has necessary data
        const indexAttr = geometry.getIndex();
        const posAttr = geometry.getAttribute('position');

        if (!posAttr || !faceIDs) {
            console.warn("SemanticEdgesGeometry: Missing position attribute or faceIDs provided. Returning empty geometry.");
            this.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
            return;
        }

        // const faceIDs = meta.faceID; // Deprecated, using argument
        // Optionally use runOriginalID if faceID is too granular? 
        // ManifoldCSG assigns new faceIDs to everything. 
        // Actually, coplanar adjacent faces from the same original face usually keep the same faceID in Manifold.

        const edges = new Map(); // hash -> { index1, index2, faceID1, faceID2 }

        const vertex = new THREE.Vector3();

        // Helper to hash vertex coordinates to merge close vertices (topology reconstruction)
        // Since Manifold output is usually indexed/welded, we might trust indices if they exist.
        // If non-indexed, we MUST weld first or use position hash.
        // Manifold results are usually not indexed by default from our wrapper unless we called something specific?
        // Let's check ManifoldCSG.js ... it returns { geometry: { attributes: ..., index: ... } } if it can.
        // The `Mesh` object from Manifold has `vertProperties` and `triVerts`.
        // Our `fromManifold` in `ManifoldCSG.js` does:
        // `if (mesh.triVerts) ... index = new THREE.BufferAttribute(...)`
        // So yes, it is indexed.

        const getVertIndex = (i) => {
            if (indexAttr) return indexAttr.getX(i);
            return i;
        };

        const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

        // 1. Build Edge Map
        for (let i = 0; i < triCount; i++) {
            const i3 = i * 3;
            const a = getVertIndex(i3);
            const b = getVertIndex(i3 + 1);
            const c = getVertIndex(i3 + 2);

            const faceID = faceIDs[i];

            // Edges: ab, bc, ca
            processEdge(a, b, faceID);
            processEdge(b, c, faceID);
            processEdge(c, a, faceID);
        }

        function processEdge(v1, v2, fID) {
            // Sort to ensure consistency (min, max)
            const start = Math.min(v1, v2);
            const end = Math.max(v1, v2);
            const key = `${start}_${end}`;

            if (!edges.has(key)) {
                edges.set(key, {
                    v1: start,
                    v2: end,
                    faceID1: fID,
                    count: 1
                });
            } else {
                const data = edges.get(key);
                data.faceID2 = fID;
                data.count++;
            }
        }

        // 2. Filter Edges
        const vertices = [];

        // Pre-allocate helper vectors
        const vStart = new THREE.Vector3();
        const vEnd = new THREE.Vector3();

        edges.forEach((data) => {
            let isBoundary = false;

            // Case A: Geometric Boundary (only 1 triangle uses this edge)
            // In a closed manifold, this shouldn't happen, but for open shells it does.
            if (data.count === 1) {
                isBoundary = true;
            }
            // Case B: Semantic Boundary (different Face IDs)
            else if (data.faceID1 !== data.faceID2) {
                isBoundary = true;
            }

            if (isBoundary) {
                vStart.fromBufferAttribute(posAttr, data.v1);
                vEnd.fromBufferAttribute(posAttr, data.v2);

                vertices.push(vStart.x, vStart.y, vStart.z);
                vertices.push(vEnd.x, vEnd.y, vEnd.z);
            }
        });

        this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    }
}
