import * as THREE from 'three';
import { Face } from './Face.js';
import { Edge } from './Edge.js';
import { Vertex } from './Vertex.js';
import { LoggerFactory } from '../core/LoggerFactory.js';

/**
 * BREPVisualizer - Converts a mesh with faceIDs into BREP-style visualization
 * 
 * Creates a THREE.Group containing:
 * - Face meshes (one per faceID)
 * - Edge polylines (boundaries between different faces)
 * - Vertex markers (endpoints of edges)
 * 
 * Ported from BREP's visualize.js to enable CAD-style geometric visualization
 */
export class BREPVisualizer {
    constructor() {
        this.log = LoggerFactory.getLogger('BREPVisualizer');
    }

    /**
     * Main entry point: Convert geometry + faceIDs into BREP-style visualization
     * @param {THREE.BufferGeometry} geometry - Input geometry (must be indexed)
     * @param {Uint32Array} faceIDs - Array mapping triangle indices to face IDs
     * @param {Object} options - Visualization options
     * @returns {THREE.Group} Group containing Face, Edge, and Vertex objects
     */
    visualize(geometry, faceIDs, options = {}) {
        const {
            showEdges = true,
            showVertices = true,
            deterministicColors = true,
            name = 'BREPSolid',
        } = options;

        this.log.debug('Visualizing geometry with', faceIDs.length, 'triangles');

        // Create root group
        const group = new THREE.Group();
        group.name = name;

        // Extract face meshes
        const faceMap = this.extractFaceMeshes(geometry, faceIDs, deterministicColors);

        // Add faces to group
        for (const [faceID, face] of faceMap.entries()) {
            group.add(face);
        }

        this.log.debug('Created', faceMap.size, 'face meshes');

        // Extract and add edges
        if (showEdges) {
            const edges = this.extractEdgePolylines(geometry, faceIDs, faceMap);
            for (const edge of edges) {
                group.add(edge);
            }
            this.log.debug('Created', edges.length, 'edges');
        }

        // Generate and add vertices
        if (showVertices && showEdges) {
            const vertices = this.generateVertices(group);
            for (const vertex of vertices) {
                group.add(vertex);
            }
            this.log.debug('Created', vertices.length, 'vertices');
        }

        return group;
    }

    /**
     * Extract individual face meshes from geometry by splitting by faceID
     * @param {THREE.BufferGeometry} geometry - Input geometry
     * @param {Uint32Array} faceIDs - Face ID per triangle
     * @param {boolean} deterministicColors - Whether to apply deterministic coloring
     * @returns {Map<number, Face>} Map of faceID -> Face object
     */
    extractFaceMeshes(geometry, faceIDs, deterministicColors) {
        const posAttr = geometry.getAttribute('position');
        const indexAttr = geometry.getIndex();

        if (!posAttr || !indexAttr) {
            this.log.error('Geometry must have position attribute and index');
            return new Map();
        }

        // Group triangles by faceID
        const faceTriangles = new Map();

        for (let triIdx = 0; triIdx < faceIDs.length; triIdx++) {
            const faceID = faceIDs[triIdx];

            if (!faceTriangles.has(faceID)) {
                faceTriangles.set(faceID, []);
            }

            const i3 = triIdx * 3;
            const i0 = indexAttr.getX(i3);
            const i1 = indexAttr.getX(i3 + 1);
            const i2 = indexAttr.getX(i3 + 2);

            faceTriangles.get(faceID).push([i0, i1, i2]);
        }

        // Create Face mesh for each face group
        const faceMap = new Map();

        for (const [faceID, triangles] of faceTriangles.entries()) {
            // Build positions array for this face
            const positions = new Float32Array(triangles.length * 9);
            let writeIdx = 0;

            for (const [i0, i1, i2] of triangles) {
                // Vertex 0
                positions[writeIdx++] = posAttr.getX(i0);
                positions[writeIdx++] = posAttr.getY(i0);
                positions[writeIdx++] = posAttr.getZ(i0);

                // Vertex 1
                positions[writeIdx++] = posAttr.getX(i1);
                positions[writeIdx++] = posAttr.getY(i1);
                positions[writeIdx++] = posAttr.getZ(i1);

                // Vertex 2
                positions[writeIdx++] = posAttr.getX(i2);
                positions[writeIdx++] = posAttr.getY(i2);
                positions[writeIdx++] = posAttr.getZ(i2);
            }

            // Create geometry for this face
            const faceGeom = new THREE.BufferGeometry();
            faceGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            faceGeom.computeVertexNormals();
            faceGeom.computeBoundingBox();
            faceGeom.computeBoundingSphere();

            // Compute BVH if available (fixes acceleratedRaycast crash)
            if (faceGeom.computeBoundsTree) {
                faceGeom.computeBoundsTree();
            }

            // Create material with deterministic color
            let material;
            if (deterministicColors) {
                const color = this.getDeterministicColor(faceID);
                material = new THREE.MeshStandardMaterial({
                    color,
                    metalness: 0.1,
                    roughness: 0.6,
                    side: THREE.DoubleSide,
                });
            }

            // Create Face object
            const face = new Face(faceGeom, material);
            face.faceID = faceID;
            face.faceName = `Face_${faceID}`;
            face.name = face.faceName;

            faceMap.set(faceID, face);
        }

        return faceMap;
    }

    /**
     * Extract edge polylines from geometry boundaries
     * @param {THREE.BufferGeometry} geometry - Input geometry
     * @param {Uint32Array} faceIDs - Face ID per triangle
     * @param {Map<number, Face>} faceMap - Map of Face objects
     * @returns {Edge[]} Array of Edge objects
     */
    extractEdgePolylines(geometry, faceIDs, faceMap) {
        const posAttr = geometry.getAttribute('position');
        const indexAttr = geometry.getIndex();

        if (!posAttr || !indexAttr) return [];

        // Build edge adjacency map: edge key -> [faceID1, faceID2, ...]
        const edgeToFaces = new Map();

        const getEdgeKey = (v1, v2) => {
            const min = Math.min(v1, v2);
            const max = Math.max(v1, v2);
            return `${min}_${max}`;
        };

        // Collect all edges with their face IDs
        for (let triIdx = 0; triIdx < faceIDs.length; triIdx++) {
            const faceID = faceIDs[triIdx];
            const i3 = triIdx * 3;
            const i0 = indexAttr.getX(i3);
            const i1 = indexAttr.getX(i3 + 1);
            const i2 = indexAttr.getX(i3 + 2);

            // Three edges per triangle
            const edges = [
                [i0, i1],
                [i1, i2],
                [i2, i0],
            ];

            for (const [v1, v2] of edges) {
                const key = getEdgeKey(v1, v2);

                if (!edgeToFaces.has(key)) {
                    edgeToFaces.set(key, {
                        v1: Math.min(v1, v2),
                        v2: Math.max(v1, v2),
                        faces: [],
                    });
                }

                const data = edgeToFaces.get(key);
                if (!data.faces.includes(faceID)) {
                    data.faces.push(faceID);
                }
            }
        }

        // Filter edges that are boundaries (different faceIDs or mesh boundary)
        const boundaryEdges = [];

        for (const [key, data] of edgeToFaces.entries()) {
            const isBoundary = data.faces.length === 1 || // Mesh boundary
                (data.faces.length === 2 && data.faces[0] !== data.faces[1]); // Face boundary

            if (isBoundary) {
                boundaryEdges.push(data);
            }
        }

        // Build polylines from boundary edges
        const edges = this.buildPolylines(boundaryEdges, posAttr, faceMap);

        return edges;
    }

    /**
     * Build polylines from a set of boundary edges
     * @param {Array} boundaryEdges - Array of edge data
     * @param {THREE.BufferAttribute} posAttr - Position attribute
     * @param {Map<number, Face>} faceMap - Map of Face objects
     * @returns {Edge[]} Array of Edge objects
     */
    buildPolylines(boundaryEdges, posAttr, faceMap) {
        // Build adjacency map: vertex -> [connected vertices]
        const adjacency = new Map();

        for (const edge of boundaryEdges) {
            const { v1, v2 } = edge;

            if (!adjacency.has(v1)) adjacency.set(v1, []);
            if (!adjacency.has(v2)) adjacency.set(v2, []);

            adjacency.get(v1).push({ vertex: v2, edge });
            adjacency.get(v2).push({ vertex: v1, edge });
        }

        const visited = new Set();
        const edges = [];

        // Extract polylines by traversing adjacency graph
        for (const startVertex of adjacency.keys()) {
            const neighbors = adjacency.get(startVertex);

            // Start from endpoints (degree 1) or any unvisited vertex
            if (neighbors.length !== 1) continue;

            const polyline = [];
            let currentVertex = startVertex;
            let prevVertex = -1;
            let edgeFaces = null;

            while (true) {
                const currentNeighbors = adjacency.get(currentVertex);
                if (!currentNeighbors) break;

                // Add current vertex position
                const x = posAttr.getX(currentVertex);
                const y = posAttr.getY(currentVertex);
                const z = posAttr.getZ(currentVertex);
                polyline.push([x, y, z]);

                // Find next unvisited neighbor
                let nextVertex = -1;
                let nextEdge = null;

                for (const { vertex, edge } of currentNeighbors) {
                    if (vertex === prevVertex) continue;

                    const edgeKey = `${Math.min(currentVertex, vertex)}_${Math.max(currentVertex, vertex)}`;
                    if (visited.has(edgeKey)) continue;

                    nextVertex = vertex;
                    nextEdge = edge;
                    visited.add(edgeKey);

                    // Store face info from first edge
                    if (!edgeFaces && edge.faces) {
                        edgeFaces = edge.faces;
                    }

                    break;
                }

                if (nextVertex === -1) break;

                prevVertex = currentVertex;
                currentVertex = nextVertex;
            }

            // Add final vertex
            if (polyline.length > 0) {
                const x = posAttr.getX(currentVertex);
                const y = posAttr.getY(currentVertex);
                const z = posAttr.getZ(currentVertex);
                polyline.push([x, y, z]);
            }

            // Create Edge object if polyline is valid
            if (polyline.length >= 2) {
                const edge = new Edge();
                edge.setPolyline(polyline);

                // Set edge name and connect to faces
                if (edgeFaces && edgeFaces.length > 0) {
                    const faceNames = edgeFaces.map(id => `Face_${id}`).sort();
                    edge.edgeName = faceNames.join('|');
                    edge.name = edge.edgeName;

                    // Connect edge to face objects
                    for (const faceID of edgeFaces) {
                        const face = faceMap.get(faceID);
                        if (face) {
                            edge.faces.push(face);
                            face.edges.push(edge);
                        }
                    }
                }

                edges.push(edge);
            }
        }

        return edges;
    }

    /**
     * Generate vertex markers at edge endpoints
     * @param {THREE.Group} group - Group containing Edge objects
     * @returns {Vertex[]} Array of Vertex objects
     */
    generateVertices(group) {
        const vertexPositions = new Map(); // position key -> [x, y, z]
        const vertexToEdges = new Map(); // position key -> Set of edge names

        // Collect unique endpoint positions from all edges
        group.traverse((obj) => {
            if (obj.type !== 'EDGE') return;

            const polyline = obj.getPolyline();
            if (polyline.length < 2) return;

            const addEndpoint = (pos) => {
                const key = `${pos[0].toFixed(6)},${pos[1].toFixed(6)},${pos[2].toFixed(6)}`;

                if (!vertexPositions.has(key)) {
                    vertexPositions.set(key, pos);
                    vertexToEdges.set(key, new Set());
                }

                vertexToEdges.get(key).add(obj.name || 'UNNAMED_EDGE');
            };

            addEndpoint(polyline[0]); // Start
            addEndpoint(polyline[polyline.length - 1]); // End
        });

        // Create Vertex objects
        const vertices = [];

        for (const [posKey, position] of vertexPositions.entries()) {
            const meetingEdges = Array.from(vertexToEdges.get(posKey) || []);
            const vertexName = this.generateVertexName(position, meetingEdges);

            const vertex = new Vertex(position, { name: vertexName });
            vertices.push(vertex);
        }

        return vertices;
    }

    /**
     * Generate deterministic vertex name based on meeting edges
     * @param {Array<number>} position - [x, y, z] position
     * @param {Array<string>} meetingEdges - Names of edges meeting at this vertex
     * @returns {string} Vertex name
     */
    generateVertexName(position, meetingEdges) {
        if (!meetingEdges || meetingEdges.length === 0) {
            return `VERTEX(${position[0].toFixed(3)},${position[1].toFixed(3)},${position[2].toFixed(3)})`;
        }

        const sortedEdges = [...meetingEdges].sort();
        return `VERTEX[${sortedEdges.join('+')}]`;
    }

    /**
     * Get deterministic color for a face ID
     * @param {number} faceID - Face ID
     * @returns {number} Color as hex number
     */
    getDeterministicColor(faceID) {
        // Simple hash-based color generation
        const hue = (faceID * 137.508) % 360; // Golden angle approximation
        const saturation = 0.6;
        const lightness = 0.7;

        return new THREE.Color().setHSL(hue / 360, saturation, lightness).getHex();
    }
}

// Export singleton instance
export default new BREPVisualizer();
