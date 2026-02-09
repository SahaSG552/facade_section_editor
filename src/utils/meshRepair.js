import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
    computeBoundsTree,
    disposeBoundsTree,
    acceleratedRaycast,
} from "three-mesh-bvh";
import LoggerFactory from "../core/LoggerFactory.js";
import eventBus from "../core/eventBus.js";
import appState from "../state/AppState.js";

/**
 * MeshRepair - Comprehensive mesh validation and repair utility
 *
 * Fixes common mesh problems before CSG operations and export:
 * - Non-manifold edges (edges shared by != 2 faces)
 * - Short edges (below tolerance threshold)
 * - Degenerate triangles (near-zero area)
 * - Duplicate vertices
 * - Self-intersections (optional, expensive)
 *
 * Usage:
 *   const repaired = MeshRepair.repairAndValidate(geometry, config);
 *   const stats = MeshRepair.validateTopology(geometry);
 */
export class MeshRepair {
    constructor(config = {}) {
        this.log = LoggerFactory.createLogger("MeshRepair");
        this.config = {
            shortEdgeThreshold: config.shortEdgeThreshold || 1e-4,
            weldTolerance: config.weldTolerance || 1e-3,
            minTriangleArea: config.minTriangleArea || 1e-10,
            repairLevel: config.repairLevel || "standard", // 'minimal' | 'standard' | 'aggressive'
            enableIntersectionRepair: config.enableIntersectionRepair || false,
            logRepairs: config.logRepairs !== false,
        };

        // Extend Three.js prototypes for BVH acceleration
        THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
        THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
        THREE.Mesh.prototype.raycast = acceleratedRaycast;
    }

    /**
     * Main entry point: Validate and repair geometry
     * @param {THREE.BufferGeometry} geometry - Geometry to repair
     * @param {Object} options - Override config options
     * @returns {THREE.BufferGeometry} - Repaired geometry
     */
    repairAndValidate(geometry, options = {}) {
        const config = { ...this.config, ...options };
        const startTime = performance.now();

        let repaired = geometry.clone();
        const stats = {
            verticesMerged: 0,
            trianglesRemoved: 0,
            shortEdgesRemoved: 0,
            nonManifoldEdgesFixed: 0,
            intersectionsDetected: 0,
            stage: "initial",
        };

        try {
            // Stage 1: Weld duplicate vertices (always)
            const preWeldCount = repaired.attributes.position.count;
            repaired = mergeVertices(repaired, config.weldTolerance);
            stats.verticesMerged =
                preWeldCount - repaired.attributes.position.count;
            stats.stage = "welded";

            // Stage 2: Remove degenerate triangles (always)
            const preTriangleCount = this._getTriangleCount(repaired);
            repaired = this._removeDegenerateTriangles(
                repaired,
                config.minTriangleArea,
            );
            stats.trianglesRemoved =
                preTriangleCount - this._getTriangleCount(repaired);
            stats.stage = "degenerate_removed";

            // Stage 3: Remove short edges (standard/aggressive)
            if (config.repairLevel !== "minimal") {
                const preEdgeCount = this._getEdgeCount(repaired);
                repaired = this._removeShortEdges(
                    repaired,
                    config.shortEdgeThreshold,
                );
                stats.shortEdgesRemoved =
                    preEdgeCount - this._getEdgeCount(repaired);
                stats.stage = "short_edges_removed";
            }

            // Stage 4: Non-manifold repair (aggressive only)
            if (config.repairLevel === "aggressive") {
                const nonManifoldData = this._detectNonManifoldEdges(repaired);
                if (nonManifoldData.count > 0) {
                    repaired = this._repairNonManifoldEdges(
                        repaired,
                        nonManifoldData,
                    );
                    stats.nonManifoldEdgesFixed = nonManifoldData.count;
                }
                stats.stage = "non_manifold_fixed";
            }

            // Stage 5: Self-intersection detection (aggressive + enabled)
            if (
                config.repairLevel === "aggressive" &&
                config.enableIntersectionRepair
            ) {
                const intersections = this._detectSelfIntersections(repaired);
                stats.intersectionsDetected = intersections.length;
                if (intersections.length > 0) {
                    this.log.warn(
                        `Detected ${intersections.length} self-intersections (repair not implemented)`,
                    );
                }
                stats.stage = "intersections_checked";
            }

            // Stage 6: Recompute normals
            repaired.computeVertexNormals();
            repaired.normalizeNormals();
            stats.stage = "complete";

            const duration = performance.now() - startTime;

            if (config.logRepairs && this._hasRepairs(stats)) {
                this.log.info(
                    `Repaired mesh in ${duration.toFixed(2)}ms:`,
                    stats,
                );
            }

            // Track telemetry if repairs were performed
            if (this._hasRepairs(stats) && appState) {
                const stage = options.stage || "unknown";
                appState.recordMeshRepair(stage, stats);
            }

            return repaired;
        } catch (error) {
            this.log.error("Mesh repair failed:", error);
            return geometry; // Return original on failure
        }
    }

    /**
     * Validate topology and return diagnostic information
     * @param {THREE.BufferGeometry} geometry
     * @returns {Object} - Validation report
     */
    validateTopology(geometry) {
        const report = {
            valid: true,
            vertexCount: geometry.attributes.position.count,
            triangleCount: this._getTriangleCount(geometry),
            warnings: [],
            errors: [],
        };

        // Check for indexed geometry
        if (!geometry.index) {
            report.warnings.push(
                "Geometry is not indexed (may be inefficient)",
            );
        }

        // Check for degenerate triangles
        const degenerateCount = this._countDegenerateTriangles(
            geometry,
            this.config.minTriangleArea,
        );
        if (degenerateCount > 0) {
            report.errors.push(
                `${degenerateCount} degenerate triangles detected`,
            );
            report.valid = false;
        }

        // Check for short edges
        const shortEdgeCount = this._countShortEdges(
            geometry,
            this.config.shortEdgeThreshold,
        );
        if (shortEdgeCount > 0) {
            report.warnings.push(
                `${shortEdgeCount} extremely short edges detected`,
            );
        }

        // Check for non-manifold edges
        const nonManifoldData = this._detectNonManifoldEdges(geometry);
        if (nonManifoldData.count > 0) {
            report.errors.push(
                `${nonManifoldData.count} non-manifold edges detected`,
            );
            report.valid = false;
        }

        // Check for self-intersections (expensive, only in aggressive mode)
        if (
            this.config.repairLevel === "aggressive" &&
            this.config.enableIntersectionRepair
        ) {
            const intersections = this._detectSelfIntersections(geometry);
            if (intersections.length > 0) {
                report.warnings.push(
                    `${intersections.length} self-intersecting face pairs detected`,
                );
            }
        }

        return report;
    }

    /**
     * Detect self-intersections (public helper)
     * @param {THREE.BufferGeometry} geometry
     * @returns {number} count of detected intersections (0 or 1 for early exit)
     */
    detectSelfIntersections(geometry) {
        const intersections = this._detectSelfIntersections(geometry);
        return intersections.length;
    }

    /**
     * Async version of repair that uses Manifold for aggressive repairs
     * @param {THREE.BufferGeometry} geometry 
     * @param {Object} options 
     * @param {ManifoldCSG} manifoldCSGInstance - Required for aggressive repair
     */
    async repairAndValidateAsync(geometry, options = {}, manifoldCSGInstance = null) {
        const config = { ...this.config, ...options };
        
        // If aggressive and we have Manifold, use it!
        if (config.repairLevel === "aggressive" && manifoldCSGInstance) {
             this.log.info("Using Manifold for aggressive mesh repair");
             const repaired = await manifoldCSGInstance.repair(geometry, config.weldTolerance);
             return repaired;
        }

        // Fallback to synchronous standard repair
        return this.repairAndValidate(geometry, options);
    }

    /**
     * Prepare geometry for CSG operations (comprehensive cleanup)
     * @param {THREE.BufferGeometry} geometry
     * @param {THREE.Matrix4} worldMatrix - Optional world transform
     * @returns {THREE.BufferGeometry}
     */
    prepareForCSG(geometry, worldMatrix = null) {
        let prepared = geometry.clone();

        // Apply world transform if provided
        if (worldMatrix) {
            prepared.applyMatrix4(worldMatrix);
        }

        // Remove extra attributes (UV, etc.)
        const attrsToKeep = ["position", "normal"];
        Object.keys(prepared.attributes).forEach((attrName) => {
            if (!attrsToKeep.includes(attrName)) {
                prepared.deleteAttribute(attrName);
            }
        });

        // Apply standard repair with telemetry
        prepared = this.repairAndValidate(prepared, {
            repairLevel: "standard",
            logRepairs: false, // Suppress logs for CSG prep
            stage: "pre-csg", // For telemetry tracking
        });

        return prepared;
    }

    /**
     * Validate geometry before export with user-friendly report
     * @param {THREE.BufferGeometry} geometry
     * @returns {Object} - { valid: boolean, report: Object, repaired: BufferGeometry }
     */
    validateForExport(geometry) {
        const validation = this.validateTopology(geometry);

        // Try to repair if invalid
        if (!validation.valid) {
            const repaired = this.repairAndValidate(geometry, {
                repairLevel: "aggressive",
                stage: "export", // For telemetry tracking
            });

            const revalidation = this.validateTopology(repaired);

            return {
                valid: revalidation.valid,
                report: {
                    original: validation,
                    repaired: revalidation,
                    wasRepaired: true,
                },
                geometry: repaired,
            };
        }

        return {
            valid: true,
            report: validation,
            geometry: geometry,
        };
    }

    /**
     * Ensure geometry is a manifold solid using Manifold round-trip
     * Note: Requires ManifoldCSG instance to be passed in
     * @param {THREE.BufferGeometry} geometry
     * @param {Object} manifoldCSG - ManifoldCSG instance
     * @returns {Promise<THREE.BufferGeometry>}
     */
    async ensureManifoldSolid(geometry, manifoldCSG) {
        if (!manifoldCSG) {
            this.log.warn(
                "ManifoldCSG instance required for manifold solidification",
            );
            return geometry;
        }

        try {
            const matrix = new THREE.Matrix4();
            const manifold = await manifoldCSG.toManifold(geometry, matrix);
            const repaired = await manifoldCSG.fromManifold(manifold);

            this.log.debug("Manifold round-trip completed");
            return repaired;
        } catch (error) {
            this.log.error("Manifold solidification failed:", error);
            return geometry;
        }
    }

    // ========== PRIVATE METHODS ==========

    /**
     * Remove degenerate triangles (near-zero area)
     */
    _removeDegenerateTriangles(geometry, minArea) {
        const positions = geometry.attributes.position;
        const indices = geometry.index ? geometry.index.array : null;
        const newIndices = [];

        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        const v3 = new THREE.Vector3();

        const triCount = indices ? indices.length / 3 : positions.count / 3;

        for (let i = 0; i < triCount; i++) {
            const idx = i * 3;
            const i1 = indices ? indices[idx] : idx;
            const i2 = indices ? indices[idx + 1] : idx + 1;
            const i3 = indices ? indices[idx + 2] : idx + 2;

            v1.fromBufferAttribute(positions, i1);
            v2.fromBufferAttribute(positions, i2);
            v3.fromBufferAttribute(positions, i3);

            const triangle = new THREE.Triangle(v1, v2, v3);
            const area = triangle.getArea();

            if (area > minArea) {
                newIndices.push(i1, i2, i3);
            }
        }

        if (newIndices.length < (indices ? indices.length : positions.count)) {
            geometry.setIndex(newIndices);
        }

        return geometry;
    }

    /**
     * Count degenerate triangles
     */
    _countDegenerateTriangles(geometry, minArea) {
        const positions = geometry.attributes.position;
        const indices = geometry.index ? geometry.index.array : null;
        let count = 0;

        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        const v3 = new THREE.Vector3();

        const triCount = indices ? indices.length / 3 : positions.count / 3;

        for (let i = 0; i < triCount; i++) {
            const idx = i * 3;
            const i1 = indices ? indices[idx] : idx;
            const i2 = indices ? indices[idx + 1] : idx + 1;
            const i3 = indices ? indices[idx + 2] : idx + 2;

            v1.fromBufferAttribute(positions, i1);
            v2.fromBufferAttribute(positions, i2);
            v3.fromBufferAttribute(positions, i3);

            const triangle = new THREE.Triangle(v1, v2, v3);
            const area = triangle.getArea();

            if (area <= minArea) {
                count++;
            }
        }

        return count;
    }

    /**
     * Remove short edges by collapsing vertices
     */
    _removeShortEdges(geometry, threshold) {
        const positions = geometry.attributes.position;
        const indices = geometry.index ? geometry.index.array : null;

        if (!indices) {
            return geometry; // Cannot process non-indexed geometry
        }

        // Build edge map
        const edges = new Map();
        for (let i = 0; i < indices.length; i += 3) {
            const tri = [indices[i], indices[i + 1], indices[i + 2]];
            for (let j = 0; j < 3; j++) {
                const v1 = tri[j];
                const v2 = tri[(j + 1) % 3];
                const key = v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;
                edges.set(key, [v1, v2]);
            }
        }

        // Find short edges
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        const collapseMap = new Map();

        for (const [key, [idx1, idx2]] of edges.entries()) {
            v1.fromBufferAttribute(positions, idx1);
            v2.fromBufferAttribute(positions, idx2);
            const length = v1.distanceTo(v2);

            if (length < threshold) {
                // Collapse idx2 to idx1
                collapseMap.set(idx2, idx1);
            }
        }

        // Apply collapse to indices
        if (collapseMap.size > 0) {
            const newIndices = [];
            for (let i = 0; i < indices.length; i += 3) {
                let i1 = indices[i];
                let i2 = indices[i + 1];
                let i3 = indices[i + 2];

                // Remap collapsed vertices
                i1 = collapseMap.get(i1) || i1;
                i2 = collapseMap.get(i2) || i2;
                i3 = collapseMap.get(i3) || i3;

                // Skip if triangle collapsed to a line/point
                if (i1 !== i2 && i2 !== i3 && i3 !== i1) {
                    newIndices.push(i1, i2, i3);
                }
            }

            geometry.setIndex(newIndices);

            // Clean up unused vertices
            geometry = mergeVertices(geometry, this.config.weldTolerance);
        }

        return geometry;
    }

    /**
     * Count short edges
     */
    _countShortEdges(geometry, threshold) {
        const positions = geometry.attributes.position;
        const indices = geometry.index ? geometry.index.array : null;

        if (!indices) return 0;

        const edges = new Set();
        const v1 = new THREE.Vector3();
        const v2 = new THREE.Vector3();
        let count = 0;

        for (let i = 0; i < indices.length; i += 3) {
            const tri = [indices[i], indices[i + 1], indices[i + 2]];
            for (let j = 0; j < 3; j++) {
                const idx1 = tri[j];
                const idx2 = tri[(j + 1) % 3];
                const key = idx1 < idx2 ? `${idx1}_${idx2}` : `${idx2}_${idx1}`;

                if (!edges.has(key)) {
                    edges.add(key);
                    v1.fromBufferAttribute(positions, idx1);
                    v2.fromBufferAttribute(positions, idx2);
                    const length = v1.distanceTo(v2);

                    if (length < threshold) {
                        count++;
                    }
                }
            }
        }

        return count;
    }

    /**
     * Detect non-manifold edges (edges shared by != 2 faces)
     */
    _detectNonManifoldEdges(geometry) {
        const indices = geometry.index ? geometry.index.array : null;

        if (!indices) {
            return { count: 0, edges: [] };
        }

        // Build edge reference count
        const edgeMap = new Map();

        for (let i = 0; i < indices.length; i += 3) {
            const tri = [indices[i], indices[i + 1], indices[i + 2]];
            for (let j = 0; j < 3; j++) {
                const v1 = tri[j];
                const v2 = tri[(j + 1) % 3];
                const key = v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;

                if (!edgeMap.has(key)) {
                    edgeMap.set(key, { count: 0, vertices: [v1, v2] });
                }
                edgeMap.get(key).count++;
            }
        }

        // Find non-manifold edges (count != 2)
        const nonManifoldEdges = [];
        for (const [key, data] of edgeMap.entries()) {
            if (data.count !== 2) {
                nonManifoldEdges.push(data);
            }
        }

        return {
            count: nonManifoldEdges.length,
            edges: nonManifoldEdges,
        };
    }

    /**
     * Repair non-manifold edges (basic approach: remove triangles with non-manifold edges)
     */
    _repairNonManifoldEdges(geometry, nonManifoldData) {
        if (nonManifoldData.count === 0) {
            return geometry;
        }

        const indices = geometry.index.array;
        const nonManifoldSet = new Set();

        // Build set of non-manifold edge keys
        for (const edge of nonManifoldData.edges) {
            const [v1, v2] = edge.vertices;
            const key = v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;
            nonManifoldSet.add(key);
        }

        // Filter out triangles that contain non-manifold edges
        const newIndices = [];
        for (let i = 0; i < indices.length; i += 3) {
            const tri = [indices[i], indices[i + 1], indices[i + 2]];
            let hasNonManifold = false;

            for (let j = 0; j < 3; j++) {
                const v1 = tri[j];
                const v2 = tri[(j + 1) % 3];
                const key = v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;

                if (nonManifoldSet.has(key)) {
                    hasNonManifold = true;
                    break;
                }
            }

            if (!hasNonManifold) {
                newIndices.push(tri[0], tri[1], tri[2]);
            }
        }

        geometry.setIndex(newIndices);
        this.log.warn(
            `Removed ${(indices.length - newIndices.length) / 3} triangles with non-manifold edges`,
        );

        return geometry;
    }

    /**
     * Detect self-intersections using BVH
     */
    _detectSelfIntersections(geometry) {
        if (!geometry) return [];
        if (!geometry.boundsTree) {
            geometry.computeBoundsTree();
        }

        const bvh = geometry.boundsTree;
        if (!bvh?.bvhcast) {
            this.log.warn("Self-intersection detection skipped: BVH not available");
            return [];
        }

        const indexArray = geometry.index ? geometry.index.array : null;
        const maxChecks = this.config.selfIntersectionMaxChecks || 50000;
        let checks = 0;
        let hit = null;

        const getTriIndices = (triIndex) => {
            if (!indexArray) return null;
            const base = triIndex * 3;
            return [
                indexArray[base],
                indexArray[base + 1],
                indexArray[base + 2],
            ];
        };

        const sharesVertex = (triA, triB) => {
            const a = getTriIndices(triA);
            const b = getTriIndices(triB);
            if (!a || !b) return false;
            return (
                a[0] === b[0] ||
                a[0] === b[1] ||
                a[0] === b[2] ||
                a[1] === b[0] ||
                a[1] === b[1] ||
                a[1] === b[2] ||
                a[2] === b[0] ||
                a[2] === b[1] ||
                a[2] === b[2]
            );
        };

        try {
            bvh.bvhcast(bvh, new THREE.Matrix4(), {
                intersectsTriangles: (tri1, tri2, i1, i2) => {
                    if (i1 === i2) return false;
                    if (i1 > i2) return false; // avoid duplicate checks

                    checks += 1;
                    if (checks > maxChecks) {
                        return true;
                    }

                    const triIndex1 = bvh.resolveTriangleIndex
                        ? bvh.resolveTriangleIndex(i1)
                        : i1;
                    const triIndex2 = bvh.resolveTriangleIndex
                        ? bvh.resolveTriangleIndex(i2)
                        : i2;

                    if (sharesVertex(triIndex1, triIndex2)) {
                        return false;
                    }

                    if (tri1.intersectsTriangle(tri2, null, true)) {
                        hit = { triIndex1, triIndex2 };
                        return true;
                    }

                    return false;
                },
            });
        } catch (error) {
            this.log.warn("Self-intersection detection failed:", error);
        }

        if (checks > maxChecks) {
            this.log.debug("Self-intersection scan hit max checks", {
                maxChecks,
            });
        }

        return hit ? [hit] : [];
    }

    /**
     * Helper: Get triangle count
     */
    _getTriangleCount(geometry) {
        return geometry.index
            ? geometry.index.count / 3
            : geometry.attributes.position.count / 3;
    }

    /**
     * Helper: Get edge count estimate
     */
    _getEdgeCount(geometry) {
        return this._getTriangleCount(geometry) * 3; // Approximate, with duplicates
    }

    /**
     * Helper: Check if any repairs were performed
     */
    _hasRepairs(stats) {
        return (
            stats.verticesMerged > 0 ||
            stats.trianglesRemoved > 0 ||
            stats.shortEdgesRemoved > 0 ||
            stats.nonManifoldEdgesFixed > 0
        );
    }
}

// Singleton instance with default config
let defaultRepair = null;

export function getRepairInstance(config = null) {
    if (!defaultRepair || config) {
        defaultRepair = new MeshRepair(config || {});
    }
    return defaultRepair;
}

export default MeshRepair;
