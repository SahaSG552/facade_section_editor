
import * as THREE from "three";

/**
 * MeshAnalysisUtils
 * logic adapted from `brep_reference/src/BREP/MeshRepairer.js` and `meshToBrep.js`
 * to provide robust geometric analysis, specifically for handling mesh seams (split vertices)
 * and finding connected components.
 */
export class MeshAnalysisUtils {

    /**
     * Builds a triangle adjacency graph where triangles are considered neighbors
     * if they share an edge. Crucially, this uses POSITION-BASED welding
     * to identify shared vertices, ignoring vertex indices (which may be split at UVs/normals).
     * 
     * @param {THREE.BufferGeometry} geometry 
     * @param {number} tolerance Position tolerance for welding (default 1e-5)
     * @returns {Array<number[]>} Array of length `triCount`, where index `i` contains list of neighbor triangle indices.
     */
    static buildAdjacencyGraph(geometry, tolerance = 1e-5) {
        const posAttr = geometry.attributes.position;
        const indexAttr = geometry.index;

        if (!posAttr || !indexAttr) {
            console.warn("MeshAnalysisUtils: Geometry missing position or index attribute.");
            return [];
        }

        const triCount = indexAttr.count / 3;
        const weldTolerance = Math.max(0, tolerance);

        // 1. Compute Canonical Vertex Map (Position -> ID)
        // We use a spatial quantization key to identify coincident vertices.
        const posToCanonical = new Map();
        const canonicalIndices = new Int32Array(indexAttr.count); // For each vertex in index buffer, what is its canonical ID?

        const invTol = 1.0 / weldTolerance;
        const getKey = (x, y, z) => {
            const ix = Math.round(x * invTol);
            const iy = Math.round(y * invTol);
            const iz = Math.round(z * invTol);
            return `${ix},${iy},${iz}`;
        };

        let nextCanonicalId = 0;
        const vTmp = new THREE.Vector3();

        for (let i = 0; i < indexAttr.count; i++) {
            const idx = indexAttr.getX(i);
            vTmp.fromBufferAttribute(posAttr, idx);

            const key = getKey(vTmp.x, vTmp.y, vTmp.z);
            let cId = posToCanonical.get(key);
            if (cId === undefined) {
                cId = nextCanonicalId++;
                posToCanonical.set(key, cId);
            }
            canonicalIndices[i] = cId;
        }

        // 2. Build Edge Map (Canonical Edge -> Triangle List)
        // Edge key is "smaller_bigger" canonical ID.
        const edgeToTris = new Map();

        const getEdgeKey = (c1, c2) => c1 < c2 ? `${c1}_${c2}` : `${c2}_${c1}`;

        for (let t = 0; t < triCount; t++) {
            const i0 = t * 3;
            // Get canonical IDs for this triangle's corners
            const c0 = canonicalIndices[i0];
            const c1 = canonicalIndices[i0 + 1];
            const c2 = canonicalIndices[i0 + 2];

            // Edges: 0-1, 1-2, 2-0
            // Insert 't' into the list for each edge
            const keys = [
                getEdgeKey(c0, c1),
                getEdgeKey(c1, c2),
                getEdgeKey(c2, c0)
            ];

            // Use Set to avoid self-loops if degenerate
            const uniqueKeys = new Set(keys);
            uniqueKeys.forEach(key => {
                let list = edgeToTris.get(key);
                if (!list) {
                    list = [];
                    edgeToTris.set(key, list);
                }
                list.push(t);
            });
        }

        // 3. Convert to Adjacency List (Triangle -> Neighbors)
        const adjacency = new Array(triCount).fill(null).map(() => []);

        edgeToTris.forEach((tris) => {
            // A manifold edge typically has 2 triangles. 
            // A non-manifold edge might have >2.
            // A boundary edge has 1.
            for (let i = 0; i < tris.length; i++) {
                for (let j = i + 1; j < tris.length; j++) {
                    const tA = tris[i];
                    const tB = tris[j];
                    // Link tA <-> tB
                    if (!adjacency[tA].includes(tB)) adjacency[tA].push(tB);
                    if (!adjacency[tB].includes(tA)) adjacency[tB].push(tA);
                }
            }
        });

        return adjacency;
    }
}
