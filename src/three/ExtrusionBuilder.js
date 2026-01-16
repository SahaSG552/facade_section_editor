import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import {
    mergeGeometries,
    mergeVertices,
} from "three/examples/jsm/utils/BufferGeometryUtils.js";
import Earcut from "earcut";
import { Brush, Evaluator, ADDITION, SUBTRACTION } from "three-bvh-csg";
import {
    MeshBVH,
    acceleratedRaycast,
    computeBoundsTree,
    disposeBoundsTree,
} from "three-mesh-bvh";
import paper from "paper";
import { PaperOffset } from "paperjs-offset";

import LoggerFactory from "../core/LoggerFactory.js";
import { approximatePath } from "../utils/arcApproximation.js";

// Add three-mesh-bvh extensions to BufferGeometry
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

// Aligns coincident edges across meshes to avoid tiny gaps before merge
class MeshEdgeMatcher {
    constructor(tolerance = 0.001) {
        this.tolerance = tolerance;
    }

    matchEdges(sourceMesh, targetMesh) {
        sourceMesh.updateMatrixWorld(true);
        targetMesh.updateMatrixWorld(true);

        const sourceVertices = this.getWorldVertices(sourceMesh);
        const targetVertices = this.getWorldVertices(targetMesh);

        const sourceBoundary = this.getBoundaryVertexIndices(
            sourceMesh.geometry
        );
        const targetBoundary = this.getBoundaryVertexIndices(
            targetMesh.geometry
        );

        // Quick reject by bounding boxes
        const sourceBox = new THREE.Box3().setFromArray(
            sourceVertices.flatMap((v) => [v.x, v.y, v.z])
        );
        const targetBox = new THREE.Box3().setFromArray(
            targetVertices.flatMap((v) => [v.x, v.y, v.z])
        );
        if (
            !sourceBox.expandByScalar(this.tolerance).intersectsBox(targetBox)
        ) {
            return 0;
        }

        let matches = this.findMatchingPairs(
            sourceVertices,
            targetVertices,
            this.tolerance,
            sourceBoundary,
            targetBoundary
        );

        // Optional coarse pass if nothing snapped
        if (matches.length === 0) {
            const coarseTol = this.tolerance * 2;
            matches = this.findMatchingPairs(
                sourceVertices,
                targetVertices,
                coarseTol,
                sourceBoundary,
                targetBoundary
            );
        }
        if (matches.length === 0) {
            return 0;
        }

        this.applyVertexCorrections(sourceMesh, matches, true);
        this.applyVertexCorrections(targetMesh, matches, false);

        return matches.length;
    }

    matchMultipleMeshes(meshes) {
        const results = [];

        for (let i = 0; i < meshes.length; i++) {
            for (let j = i + 1; j < meshes.length; j++) {
                const matchedVertices = this.matchEdges(meshes[i], meshes[j]);
                if (matchedVertices > 0) {
                    results.push({ source: i, target: j, matchedVertices });
                }
            }
        }

        return results;
    }

    getWorldVertices(mesh) {
        const worldVertices = [];
        const position = mesh.geometry.attributes.position;

        for (let i = 0; i < position.count; i++) {
            const vertex = new THREE.Vector3(
                position.getX(i),
                position.getY(i),
                position.getZ(i)
            );
            vertex.applyMatrix4(mesh.matrixWorld);
            worldVertices.push(vertex);
        }

        return worldVertices;
    }

    findMatchingPairs(
        sourceVertices,
        targetVertices,
        tol,
        boundarySource,
        boundaryTarget
    ) {
        const matches = [];

        // Spatial hash for faster lookup
        const index = this.buildSpatialIndex(targetVertices, tol);

        for (let i = 0; i < sourceVertices.length; i++) {
            if (boundarySource && !boundarySource.has(i)) continue;
            const sourceVertex = sourceVertices[i];

            const neighbors = this.querySpatialIndex(index, sourceVertex);
            let best = null;
            let bestDist = tol;

            for (const neighbor of neighbors) {
                if (boundaryTarget && !boundaryTarget.has(neighbor.index))
                    continue;
                const d = sourceVertex.distanceTo(neighbor.pos);
                if (d < bestDist) {
                    bestDist = d;
                    best = neighbor;
                }
            }

            if (best) {
                const averaged = new THREE.Vector3()
                    .addVectors(sourceVertex, best.pos)
                    .multiplyScalar(0.5);

                matches.push({
                    sourceIndex: i,
                    targetIndex: best.index,
                    averagedPos: averaged,
                });
            }
        }

        return matches;
    }

    getBoundaryVertexIndices(geometry) {
        try {
            const geom = geometry.index ? geometry : geometry.toNonIndexed();
            const index = geom.index.array;
            const edgeCount = new Map();
            const addEdge = (a, b) => {
                const key = a < b ? `${a}_${b}` : `${b}_${a}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
            };
            for (let i = 0; i < index.length; i += 3) {
                const a = index[i];
                const b = index[i + 1];
                const c = index[i + 2];
                addEdge(a, b);
                addEdge(b, c);
                addEdge(c, a);
            }
            const boundary = new Set();
            edgeCount.forEach((count, key) => {
                if (count === 1) {
                    const [a, b] = key.split("_").map((v) => parseInt(v, 10));
                    boundary.add(a);
                    boundary.add(b);
                }
            });
            return boundary.size ? boundary : null;
        } catch (e) {
            return null;
        }
    }

    buildSpatialIndex(vertices, tol) {
        const grid = new Map();
        const inv = 1 / tol;
        const keyOf = (v) =>
            `${Math.floor(v.x * inv)}|${Math.floor(v.y * inv)}|${Math.floor(
                v.z * inv
            )}`;

        vertices.forEach((v, idx) => {
            const key = keyOf(v);
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push({ pos: v, index: idx });
        });

        return { grid, tol };
    }

    querySpatialIndex(index, point) {
        const { grid, tol } = index;
        const inv = 1 / tol;
        const cx = Math.floor(point.x * inv);
        const cy = Math.floor(point.y * inv);
        const cz = Math.floor(point.z * inv);

        const results = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const key = `${cx + dx}|${cy + dy}|${cz + dz}`;
                    const bucket = grid.get(key);
                    if (bucket) results.push(...bucket);
                }
            }
        }
        return results;
    }

    applyVertexCorrections(mesh, matches, useSourceIndex) {
        const geometry = mesh.geometry;
        const position = geometry.attributes.position;
        const inverseMatrix = new THREE.Matrix4()
            .copy(mesh.matrixWorld)
            .invert();

        for (const correction of matches) {
            const vertexIndex = useSourceIndex
                ? correction.sourceIndex
                : correction.targetIndex;

            if (vertexIndex === undefined || vertexIndex < 0) continue;

            const localPos = correction.averagedPos
                .clone()
                .applyMatrix4(inverseMatrix);

            position.setXYZ(vertexIndex, localPos.x, localPos.y, localPos.z);
        }

        position.needsUpdate = true;
        geometry.computeBoundingBox();
        geometry.computeVertexNormals();
        geometry.normalizeNormals();
    }
}

/**
 * ExtrusionBuilder
 * Handles all extrusion-related geometry creation:
 * - SVG path parsing to Three.js curves
 * - Bit profile creation from SVG or fallback shapes
 * - Profiled contour geometry with mitered corners
 * - Path visualization for debugging
 */
export default class ExtrusionBuilder {
    constructor() {
        this.log = LoggerFactory.createLogger("ExtrusionBuilder");
        this.materialManager = null;
        this.csgEngine = null;
        this.edgeMatcher = new MeshEdgeMatcher(0.001);

        // Public configuration for adaptive curve segmentation
        // Can be changed from console: extrusionBuilder.curveSegmentCoefficient = 3
        this.curveSegmentCoefficient = 0.5; // segments per mm
        this.curveSegmentMin = 16;
        this.curveSegmentMax = 64;

        // Arc approximation coefficient: samples = arcLength / coefficient
        // Same as ThreeModule.arcDivisionCoefficient for consistency
        // Can be changed from console: extrusionBuilder.arcDivisionCoefficient = 5
        this.arcDivisionCoefficient = 5; // 1 sample point per 5mm of arc length

        // Precision improvements for createProfiledContourGeometry
        // Miter limit: maximum allowed miter length to prevent extreme spikes
        this.miterLimit = 10.0;
        // Epsilon: minimum gap for numerical stability
        this.epsilon = 1e-10;
        // Angle epsilon: threshold in radians (about 0.0001 degrees)
        this.angleEpsilon = 1.745e-6;

        this.log.info("Created");
    }

    /**
     * Log detailed diagnostics for grouped curves: segment types, lengths, sample points, degenerate detection.
     * Shared between mitered and round extrusions.
     * @param {Array} curveGroups - Array of {type, groupName, curves}
     * @param {Array} originalCurves - Original ungrouped curves (for before/after comparison)
     * @param {string} extrusionType - "MITERED" or "ROUND" for context
     */
    logCurveGroupDiagnostics(
        curveGroups,
        originalCurves,
        extrusionType = "UNKNOWN"
    ) {
        this.log.info(`=== ${extrusionType} EXTRUSION DIAGNOSTICS ===`);
        this.log.info(
            `Original curves: ${originalCurves.length}, After grouping: ${curveGroups.length} groups`
        );

        // Summary of segment types before grouping
        const typeCountsBefore = {};
        originalCurves.forEach((curve) => {
            const type = curve.segmentType || "UNKNOWN";
            typeCountsBefore[type] = (typeCountsBefore[type] || 0) + 1;
        });
        this.log.info("Segment types (before grouping):", typeCountsBefore);

        // Detailed log for each group
        curveGroups.forEach((group, idx) => {
            let estimatedPoints = 0;
            let totalLength = 0;
            group.curves.forEach((curve) => {
                const len = curve.getLength();
                totalLength += len;
                if (group.type === "LINE") {
                    estimatedPoints += 1; // LINE: just 2 points (1 segment)
                } else {
                    // ARC or BEZIER: use arcDivisionCoefficient
                    estimatedPoints += Math.max(
                        2,
                        Math.ceil(len / this.arcDivisionCoefficient)
                    );
                }
            });

            this.log.info(
                `Group #${idx + 1} [${group.groupName}] - ${
                    group.curves.length
                } curves, ~${estimatedPoints} sample points (length=${totalLength.toFixed(
                    1
                )}mm)`
            );

            // Log each curve in the group
            group.curves.forEach((curve, cidx) => {
                const start = curve.getPoint(0);
                const end = curve.getPoint(1);
                const len = curve.getLength();
                const degenerate = len < 1e-6;
                this.log.info(
                    `  Curve ${cidx + 1}: start=(${start.x.toFixed(
                        4
                    )},${start.y.toFixed(4)}) end=(${end.x.toFixed(
                        4
                    )},${end.y.toFixed(4)}) length=${len.toFixed(6)}${
                        degenerate ? " [DEGENERATE]" : ""
                    }`
                );
                if (degenerate) {
                    this.log.warn(
                        `    [DEGENERATE SEGMENT] Group ${idx + 1} Curve ${
                            cidx + 1
                        } is zero-length and may cause artifacts.`
                    );
                }
            });
        });

        // Check path closure and winding
        if (originalCurves.length > 0) {
            const firstCurve = originalCurves[0];
            const lastCurve = originalCurves[originalCurves.length - 1];
            const firstPoint = firstCurve.getPoint(0);
            const lastPoint = lastCurve.getPoint(1);
            const closureGap = firstPoint.distanceTo(lastPoint);
            const isClosedPath = closureGap < 0.01;

            this.log.info("Path closure:", {
                isClosedPath,
                closureGap: closureGap.toFixed(6),
                firstPoint: {
                    x: firstPoint.x.toFixed(4),
                    y: firstPoint.y.toFixed(4),
                    z: firstPoint.z.toFixed(4),
                },
                lastPoint: {
                    x: lastPoint.x.toFixed(4),
                    y: lastPoint.y.toFixed(4),
                    z: lastPoint.z.toFixed(4),
                },
            });

            if (isClosedPath) {
                let signedArea = 0;
                for (const curve of originalCurves) {
                    const p1 = curve.getPoint(0);
                    const p2 = curve.getPoint(1);
                    signedArea += (p2.x - p1.x) * (p2.y + p1.y);
                }
                const contourIsClockwise = signedArea > 0;
                this.log.info(
                    "Winding direction:",
                    contourIsClockwise ? "CLOCKWISE" : "COUNTER-CLOCKWISE"
                );
            }
        }

        this.log.info(`=== END ${extrusionType} DIAGNOSTICS ===`);
    }

    /**
     * Group consecutive curves by segment type and filter degenerate ones.
     * Lines are isolated into their own groups; consecutive arcs/beziers are grouped.
     * Closed paths with matching first/last curve types are merged.
     * Returns an array of groups: { type, groupName, curves }.
     */
    groupCurves(pathCurves) {
        // Helper: group name by segment type
        const getGroupName = (segmentType) => {
            const typeMap = {
                ARC: "ARC_GROUP",
                CUBIC_BEZIER: "CUBIC_BEZIER_GROUP",
                QUADRATIC_BEZIER: "QUADRATIC_BEZIER_GROUP",
                LINE: "LINE_GROUP",
            };
            return typeMap[segmentType] || "UNKNOWN_GROUP";
        };

        // Remove degenerate (zero-length) segments
        const DEGENERATE_THRESHOLD = 0.001; // 1 micron
        const filtered = (pathCurves || []).filter((curve) => {
            try {
                const length = curve.getLength();
                if (length < DEGENERATE_THRESHOLD) {
                    this.log &&
                        this.log.debug &&
                        this.log.debug(
                            `Filtered out degenerate curve: length=${length.toFixed(
                                6
                            )}mm`
                        );
                    return false;
                }
                return true;
            } catch (e) {
                this.log &&
                    this.log.warn &&
                    this.log.warn("Curve without getLength skipped", curve);
                return false;
            }
        });

        const groups = [];
        let currentGroup = [];
        let currentSegmentType = null;

        for (let i = 0; i < filtered.length; i++) {
            const curve = filtered[i];
            const segmentType = curve.segmentType || "LINE";

            if (segmentType === "LINE") {
                if (currentGroup.length > 0) {
                    groups.push({
                        type: currentSegmentType,
                        groupName: getGroupName(currentSegmentType),
                        curves: currentGroup,
                    });
                    currentGroup = [];
                }
                groups.push({
                    type: "LINE",
                    groupName: "LINE_GROUP",
                    curves: [curve],
                });
                currentSegmentType = null;
            } else {
                if (currentSegmentType === segmentType) {
                    currentGroup.push(curve);
                } else {
                    if (currentGroup.length > 0) {
                        groups.push({
                            type: currentSegmentType,
                            groupName: getGroupName(currentSegmentType),
                            curves: currentGroup,
                        });
                    }
                    currentGroup = [curve];
                    currentSegmentType = segmentType;
                }
            }
        }

        if (currentGroup.length > 0) {
            groups.push({
                type: currentSegmentType,
                groupName: getGroupName(currentSegmentType),
                curves: currentGroup,
            });
        }

        // Remove degenerate groups (total length < threshold)
        const MIN_GROUP_LENGTH = 0.01; // 10 microns
        const validGroups = groups.filter((group) => {
            const totalLength = group.curves.reduce(
                (sum, curve) => sum + curve.getLength(),
                0
            );
            if (totalLength < MIN_GROUP_LENGTH) {
                this.log &&
                    this.log.debug &&
                    this.log.debug(
                        `Filtered out degenerate group [${group.groupName}]: ${
                            group.curves.length
                        } curves, length=${totalLength.toFixed(6)}mm`
                    );
                return false;
            }
            return true;
        });

        // Merge first/last groups if closed path and both non-LINE and same type
        if (
            validGroups.length > 1 &&
            validGroups[0].type !== "LINE" &&
            validGroups[validGroups.length - 1].type !== "LINE" &&
            validGroups[0].type === validGroups[validGroups.length - 1].type
        ) {
            validGroups[0].curves = validGroups[
                validGroups.length - 1
            ].curves.concat(validGroups[0].curves);
            validGroups.pop();
        }

        return validGroups;
    }

    /**
     * Initialize with dependencies
     * @param {object} config - Configuration object
     * @param {MaterialManager} config.materialManager - Material manager for wireframe state
     * @param {CSGEngine} config.csgEngine - CSG engine for boolean operations
     */
    initialize(config) {
        this.materialManager = config.materialManager;
        this.csgEngine = config.csgEngine;
        this.log.info("Initialized");
        this.log.info("Arc approximation settings:", {
            arcDivisionCoefficient: this.arcDivisionCoefficient,
            description: "samples = arcLength / coefficient",
            example: `100mm arc → ${Math.ceil(
                100 / this.arcDivisionCoefficient
            )} sample points`,
            console:
                "To change: window.extrusionBuilder.arcDivisionCoefficient = 5",
        });
    }

    /**
     * Get current arc approximation quality info (useful for console debugging)
     * Usage: window.extrusionBuilder.getArcQualityInfo()
     */
    getArcQualityInfo() {
        const coefficient = this.arcDivisionCoefficient;
        return {
            arcDivisionCoefficient: coefficient,
            description: "Samples = arcLength / coefficient",
            examples: {
                "50mm arc": Math.ceil(50 / coefficient),
                "100mm arc": Math.ceil(100 / coefficient),
                "200mm arc": Math.ceil(200 / coefficient),
                "500mm arc": Math.ceil(500 / coefficient),
            },
            command: `window.extrusionBuilder.arcDivisionCoefficient = ${coefficient}`,
        };
    }

    /**
     * Set arc approximation quality by coefficient
     * Lower value = more samples = smoother curves but slower
     * Usage: window.extrusionBuilder.setArcQuality(5)
     */
    setArcQuality(coefficient) {
        if (coefficient <= 0) {
            this.log.warn("arcDivisionCoefficient must be positive");
            return;
        }
        this.arcDivisionCoefficient = coefficient;
        this.log.info(
            `Arc quality changed to ${coefficient} (${Math.ceil(
                100 / coefficient
            )} samples per 100mm)`
        );
    }

    /**
     * Convert segments from ExportModule parser to THREE.js curves
     * DEPRECATED: Not used in current implementation
     * @private
     */
    _segmentsToCurves_UNUSED(
        segments,
        offsetX = 0,
        offsetY = 0,
        transformY = null
    ) {
        const curves = [];

        // Helper to get point coordinates
        const getPoint = (pt) => {
            if (!pt) return new THREE.Vector3(0, 0, 0);
            const x = (pt.x || pt.X || 0) + offsetX;
            const y = transformY
                ? transformY((pt.y || pt.Y || 0) + offsetY)
                : (pt.y || pt.Y || 0) + offsetY;
            return new THREE.Vector3(x, y, 0);
        };

        for (const segment of segments) {
            if (segment.type === "arc") {
                // Всегда аппроксимируем дугу через точки (polyline), чтобы не было линий вместо дуг
                const start = getPoint(segment.start);
                const end = getPoint(segment.end);
                let arcPoints = [];
                // Если есть параметры центра и радиуса — строим дугу по окружности
                if (segment.arc && (segment.arc.radius || segment.arc.rx)) {
                    const arc = segment.arc;
                    const centerX = (arc.cx || arc.centerX || 0) + offsetX;
                    const centerY = transformY
                        ? transformY((arc.cy || arc.centerY || 0) + offsetY)
                        : (arc.cy || arc.centerY || 0) + offsetY;
                    const radius = arc.radius || arc.rx;
                    // Определяем углы
                    const startAngle = Math.atan2(
                        start.y - centerY,
                        start.x - centerX
                    );
                    const endAngle = Math.atan2(
                        end.y - centerY,
                        end.x - centerX
                    );
                    // sweepFlag: 1 = по часовой, 0 = против
                    let sweep = arc.sweepFlag !== undefined ? arc.sweepFlag : 1;
                    // largeArcFlag: 1 = >180°, 0 = <180°
                    let largeArc =
                        arc.largeArcFlag !== undefined ? arc.largeArcFlag : 0;
                    // Вычисляем угол дуги
                    let delta = endAngle - startAngle;
                    if (sweep === 1 && delta < 0) delta += Math.PI * 2;
                    if (sweep === 0 && delta > 0) delta -= Math.PI * 2;
                    if (!largeArc && Math.abs(delta) > Math.PI) {
                        delta += delta > 0 ? -Math.PI * 2 : Math.PI * 2;
                    }
                    if (largeArc && Math.abs(delta) < Math.PI) {
                        delta += delta > 0 ? Math.PI * 2 : -Math.PI * 2;
                    }
                    // Сэмплируем дугу через точки
                    const numPoints = Math.max(
                        16,
                        Math.ceil((Math.abs(delta) * radius) / 2)
                    );
                    for (let i = 0; i <= numPoints; i++) {
                        const t = i / numPoints;
                        const angle = startAngle + delta * t;
                        arcPoints.push(
                            new THREE.Vector3(
                                centerX + radius * Math.cos(angle),
                                centerY + radius * Math.sin(angle),
                                0
                            )
                        );
                    }
                } else {
                    // Если нет центра/радиуса — просто линейная аппроксимация
                    arcPoints = [start, end];
                }
                // Добавляем polyline как набор LineCurve3
                for (let i = 1; i < arcPoints.length; i++) {
                    curves.push(
                        new THREE.LineCurve3(arcPoints[i - 1], arcPoints[i])
                    );
                }
            } else if (segment.type === "bezier") {
                const start = getPoint(segment.start);
                const cp1 = getPoint(segment.cp1);
                const cp2 = getPoint(segment.cp2);
                const end = getPoint(segment.end);

                if (
                    !isNaN(start.x) &&
                    !isNaN(start.y) &&
                    !isNaN(cp1.x) &&
                    !isNaN(cp1.y) &&
                    !isNaN(cp2.x) &&
                    !isNaN(cp2.y) &&
                    !isNaN(end.x) &&
                    !isNaN(end.y)
                ) {
                    curves.push(
                        new THREE.CubicBezierCurve3(start, cp1, cp2, end)
                    );
                } else {
                    this.log.warn("Skipping bezier with NaN coordinates:", {
                        start,
                        cp1,
                        cp2,
                        end,
                    });
                }
            } else {
                // Default: treat as line
                const start = getPoint(segment.start);
                const end = getPoint(segment.end);
                if (
                    !isNaN(start.x) &&
                    !isNaN(start.y) &&
                    !isNaN(end.x) &&
                    !isNaN(end.y)
                ) {
                    curves.push(new THREE.LineCurve3(start, end));
                } else {
                    this.log.warn("Skipping line with NaN coordinates:", {
                        start,
                        end,
                    });
                }
            }
        }

        this.log.debug(
            `Converted ${segments.length} segments to ${curves.length} THREE.js curves`
        );
        return curves;
    }

    /**
     * Parse SVG element to polygon points using ExportModule's universal parser
     * @param {SVGElement} svgElement - SVG element (rect, circle, polygon, path)
     * @param {Object} exportModule - ExportModule instance for parsing
     * @returns {Array} Array of {x, y} points
     */
    parseSVGElementToPoints(svgElement, exportModule) {
        const logger = this.log || console;

        if (!svgElement || !exportModule) {
            logger?.error?.(
                "parseSVGElementToPoints: missing svgElement or exportModule"
            );
            return [];
        }

        // Use ExportModule's universal parser to get segments
        const segments = exportModule.parseSVGElement(svgElement, 0, 0, null);
        if (!segments || segments.length === 0) {
            logger?.error?.("parseSVGElementToPoints: no segments parsed");
            return [];
        }

        logger?.debug?.(
            `parseSVGElementToPoints: Got ${segments.length} segments from ${svgElement.tagName}`
        );

        // Convert segments to polygon points
        // For curves (arcs, beziers), sample multiple points
        const points = [];

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            // Add start point
            if (segment.start) {
                const x = Array.isArray(segment.start)
                    ? segment.start[0]
                    : segment.start.x;
                const y = Array.isArray(segment.start)
                    ? segment.start[1]
                    : segment.start.y;

                if (
                    x !== undefined &&
                    y !== undefined &&
                    !isNaN(x) &&
                    !isNaN(y)
                ) {
                    points.push({ x, y });
                } else {
                    logger?.warn?.(
                        "parseSVGElementToPoints: invalid start point",
                        segment.start
                    );
                }
            }

            // For ARC segments, add intermediate points to approximate curve
            if (segment.type === "ARC" && segment.center && segment.radius) {
                const numSamples = 16; // Points per arc
                const startAngle = segment.startAngle || 0;
                const endAngle = segment.endAngle || Math.PI * 2;
                const cx = segment.center[0];
                const cy = segment.center[1];
                const r = segment.radius;

                for (let j = 1; j <= numSamples; j++) {
                    const t = j / numSamples;
                    const angle = startAngle + (endAngle - startAngle) * t;
                    const px = cx + r * Math.cos(angle);
                    const py = cy + r * Math.sin(angle);
                    points.push({ x: px, y: py });
                }
            }
        }

        // Close polygon if needed
        if (points.length > 0) {
            const first = points[0];
            const last = points[points.length - 1];
            const tolerance = 0.001;
            if (
                Math.abs(first.x - last.x) > tolerance ||
                Math.abs(first.y - last.y) > tolerance
            ) {
                points.push({ x: first.x, y: first.y });
            }
        }

        logger?.debug?.(
            `Parsed ${svgElement.tagName} to ${points.length} points`
        );
        return points;
    }

    /**
     * Parse SVG path data into Three.js curves
     * @param {string} pathData - SVG path data string
     * @returns {Array<THREE.Curve>} Array of Three.js curves
     */
    parsePathToCurves(pathData) {
        const curves = [];
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);

        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;

        // Log initial pathData for debugging
        if (!pathData || typeof pathData !== "string") {
            this.log.error("Invalid pathData type:", typeof pathData, pathData);
            return new THREE.CurvePath();
        }

        if (pathData.includes("NaN") || pathData.includes("undefined")) {
            this.log.error(
                "PathData contains NaN or undefined:",
                pathData.substring(0, 100)
            );
            return new THREE.CurvePath();
        }

        let commandIndex = 0;
        let gapsDetected = [];

        commands?.forEach((cmd) => {
            const type = cmd[0].toUpperCase();
            const isRelative =
                cmd[0] === cmd[0].toLowerCase() &&
                cmd[0] !== cmd[0].toUpperCase(); // lowercase = relative
            const params = cmd
                .slice(1)
                .trim()
                .split(/[\s,]+/)
                .map(Number)
                .filter((n) => !isNaN(n));

            switch (type) {
                case "M": // Move to
                    if (params.length >= 2) {
                        currentX = isRelative
                            ? currentX + params[0]
                            : params[0];
                        currentY = isRelative
                            ? currentY + params[1]
                            : params[1];
                        startX = currentX;
                        startY = currentY;
                    }
                    break;
                case "L": // Line to
                    if (params.length >= 2) {
                        const x = isRelative ? currentX + params[0] : params[0];
                        const y = isRelative ? currentY + params[1] : params[1];
                        // Validate coordinates
                        if (
                            !isNaN(x) &&
                            !isNaN(y) &&
                            !isNaN(currentX) &&
                            !isNaN(currentY)
                        ) {
                            const lineCurve = new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(x, y, 0)
                            );
                            lineCurve.segmentType = "LINE";
                            curves.push(lineCurve);
                            currentX = x;
                            currentY = y;
                        }
                    }
                    break;
                case "H": // Horizontal line
                    if (params.length >= 1) {
                        const x = isRelative ? currentX + params[0] : params[0];
                        if (!isNaN(x) && !isNaN(currentX) && !isNaN(currentY)) {
                            const lineCurve = new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(x, currentY, 0)
                            );
                            lineCurve.segmentType = "LINE";
                            curves.push(lineCurve);
                            currentX = x;
                        }
                    }
                    break;
                case "V": // Vertical line
                    if (params.length >= 1) {
                        const y = isRelative ? currentY + params[0] : params[0];
                        if (!isNaN(y) && !isNaN(currentX) && !isNaN(currentY)) {
                            const lineCurve = new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(currentX, y, 0)
                            );
                            lineCurve.segmentType = "LINE";
                            curves.push(lineCurve);
                            currentY = y;
                        }
                    }
                    break;
                case "C": // Cubic Bézier curve
                    if (params.length >= 6) {
                        const cp1x = isRelative
                            ? currentX + params[0]
                            : params[0];
                        const cp1y = isRelative
                            ? currentY + params[1]
                            : params[1];
                        const cp2x = isRelative
                            ? currentX + params[2]
                            : params[2];
                        const cp2y = isRelative
                            ? currentY + params[3]
                            : params[3];
                        const x = isRelative ? currentX + params[4] : params[4];
                        const y = isRelative ? currentY + params[5] : params[5];
                        if (
                            !isNaN(cp1x) &&
                            !isNaN(cp1y) &&
                            !isNaN(cp2x) &&
                            !isNaN(cp2y) &&
                            !isNaN(x) &&
                            !isNaN(y) &&
                            !isNaN(currentX) &&
                            !isNaN(currentY)
                        ) {
                            const curve = new THREE.CubicBezierCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(cp1x, cp1y, 0),
                                new THREE.Vector3(cp2x, cp2y, 0),
                                new THREE.Vector3(x, y, 0)
                            );
                            curve.segmentType = "CUBIC_BEZIER";

                            // Check continuity with previous curve
                            if (curves.length > 0) {
                                const prevCurve = curves[curves.length - 1];
                                const prevEnd = prevCurve.getPoint(1);
                                const curStart = curve.getPoint(0);
                                const gap = prevEnd.distanceTo(curStart);
                                if (gap > 0.0001) {
                                    this.log.warn(
                                        `Gap detected at command ${commandIndex}: ${gap.toFixed(
                                            6
                                        )}mm`,
                                        {
                                            prevEnd: {
                                                x: prevEnd.x,
                                                y: prevEnd.y,
                                            },
                                            curStart: {
                                                x: curStart.x,
                                                y: curStart.y,
                                            },
                                            currentPos: {
                                                x: currentX,
                                                y: currentY,
                                            },
                                        }
                                    );
                                }
                            }

                            curves.push(curve);
                            currentX = x;
                            currentY = y;
                        }
                    }
                    commandIndex++;
                    break;
                case "Q": // Quadratic Bézier curve
                    if (params.length >= 4) {
                        const cpx = isRelative
                            ? currentX + params[0]
                            : params[0];
                        const cpy = isRelative
                            ? currentY + params[1]
                            : params[1];
                        const x = isRelative ? currentX + params[2] : params[2];
                        const y = isRelative ? currentY + params[3] : params[3];
                        if (
                            !isNaN(cpx) &&
                            !isNaN(cpy) &&
                            !isNaN(x) &&
                            !isNaN(y) &&
                            !isNaN(currentX) &&
                            !isNaN(currentY)
                        ) {
                            const curve = new THREE.QuadraticBezierCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(cpx, cpy, 0),
                                new THREE.Vector3(x, y, 0)
                            );
                            curve.segmentType = "QUADRATIC_BEZIER";
                            curves.push(curve);
                            currentX = x;
                            currentY = y;
                        }
                    }
                    break;
                case "A": // Arc (approximate as polyline)
                    if (params.length >= 7) {
                        const rx = params[0];
                        const ry = params[1];
                        const xAxisRotation = params[2] * (Math.PI / 180);
                        const largeArcFlag = params[3];
                        const sweepFlag = params[4];
                        const x = isRelative ? currentX + params[5] : params[5];
                        const y = isRelative ? currentY + params[6] : params[6];
                        if (
                            !isNaN(rx) &&
                            !isNaN(ry) &&
                            !isNaN(x) &&
                            !isNaN(y) &&
                            !isNaN(currentX) &&
                            !isNaN(currentY)
                        ) {
                            // Arc center/angles calculation (SVG spec)
                            // Adapted from https://github.com/fontello/svgpath/blob/master/lib/a2c.js
                            let px = currentX,
                                py = currentY;
                            let cx = x,
                                cy = y;
                            let dx2 = (px - cx) / 2.0;
                            let dy2 = (py - cy) / 2.0;
                            let cosPhi = Math.cos(xAxisRotation);
                            let sinPhi = Math.sin(xAxisRotation);
                            // Step 1: Compute (x1', y1')
                            let x1p = cosPhi * dx2 + sinPhi * dy2;
                            let y1p = -sinPhi * dx2 + cosPhi * dy2;
                            // Ensure radii are large enough
                            let rxAbs = Math.abs(rx);
                            let ryAbs = Math.abs(ry);
                            let rSquareFix =
                                (x1p * x1p) / (rxAbs * rxAbs) +
                                (y1p * y1p) / (ryAbs * ryAbs);
                            if (rSquareFix > 1) {
                                rxAbs *= Math.sqrt(rSquareFix);
                                ryAbs *= Math.sqrt(rSquareFix);
                            }
                            // Step 2: Compute (cx', cy')
                            let sign = largeArcFlag !== sweepFlag ? 1 : -1;
                            let sq =
                                (rxAbs * rxAbs * (ryAbs * ryAbs) -
                                    rxAbs * rxAbs * (y1p * y1p) -
                                    ryAbs * ryAbs * (x1p * x1p)) /
                                (rxAbs * rxAbs * (y1p * y1p) +
                                    ryAbs * ryAbs * (x1p * x1p));
                            sq = sq < 0 ? 0 : sq;
                            let coef = sign * Math.sqrt(sq);
                            let cxp = coef * ((rxAbs * y1p) / ryAbs);
                            let cyp = coef * (-(ryAbs * x1p) / rxAbs);
                            // Step 3: Compute (cx, cy) from (cx', cy')
                            let centerX =
                                cosPhi * cxp - sinPhi * cyp + (px + cx) / 2;
                            let centerY =
                                sinPhi * cxp + cosPhi * cyp + (py + cy) / 2;
                            // Step 4: Compute angles
                            function vectorAngle(ux, uy, vx, vy) {
                                let dot = ux * vx + uy * vy;
                                let len =
                                    Math.sqrt(ux * ux + uy * uy) *
                                    Math.sqrt(vx * vx + vy * vy);
                                let ang = Math.acos(
                                    Math.max(-1, Math.min(1, dot / len))
                                );
                                if (ux * vy - uy * vx < 0) ang = -ang;
                                return ang;
                            }
                            let v1x = (x1p - cxp) / rxAbs;
                            let v1y = (y1p - cyp) / ryAbs;
                            let v2x = (-x1p - cxp) / rxAbs;
                            let v2y = (-y1p - cyp) / ryAbs;
                            let startAngle = vectorAngle(1, 0, v1x, v1y);
                            let deltaAngle = vectorAngle(v1x, v1y, v2x, v2y);
                            if (!sweepFlag && deltaAngle > 0)
                                deltaAngle -= 2 * Math.PI;
                            if (sweepFlag && deltaAngle < 0)
                                deltaAngle += 2 * Math.PI;
                            deltaAngle = deltaAngle % (2 * Math.PI);
                            // Step 5: Sample arc as polyline
                            const arcLen = Math.abs(
                                deltaAngle * ((rxAbs + ryAbs) / 2)
                            );
                            const numPoints = Math.max(
                                16,
                                Math.ceil(arcLen / this.arcDivisionCoefficient)
                            );
                            let prevPoint = new THREE.Vector3(px, py, 0);
                            for (let i = 1; i <= numPoints; i++) {
                                const t = i / numPoints;
                                const angle = startAngle + deltaAngle * t;
                                const cosA = Math.cos(angle),
                                    sinA = Math.sin(angle);
                                let xVal =
                                    cosPhi * rxAbs * cosA -
                                    sinPhi * ryAbs * sinA +
                                    centerX;
                                let yVal =
                                    sinPhi * rxAbs * cosA +
                                    cosPhi * ryAbs * sinA +
                                    centerY;
                                let nextPoint = new THREE.Vector3(
                                    xVal,
                                    yVal,
                                    0
                                );
                                const arcLine = new THREE.LineCurve3(
                                    prevPoint,
                                    nextPoint
                                );
                                arcLine.segmentType = "ARC";
                                curves.push(arcLine);
                                prevPoint = nextPoint;
                            }
                            currentX = x;
                            currentY = y;
                        }
                    }
                    break;
                case "Z": // Close path
                    if (curves.length > 0) {
                        if (
                            !isNaN(currentX) &&
                            !isNaN(currentY) &&
                            !isNaN(startX) &&
                            !isNaN(startY)
                        ) {
                            const closeLine = new THREE.LineCurve3(
                                new THREE.Vector3(currentX, currentY, 0),
                                new THREE.Vector3(startX, startY, 0)
                            );
                            closeLine.segmentType = "LINE";
                            curves.push(closeLine);
                        }
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
            }
            commandIndex++;
        });

        this.log.debug(
            `parsePathToCurves: Created ${curves.length} curves from ${
                commands?.length || 0
            } commands`
        );

        return curves;
    }

    /**
     * Create 3D curve from 2D path curves
     * Curves are in 2D canvas coordinates (from SVG offsetContour)
     * partFront defines the position and size of the front view in canvas space
     * Panel in 3D is positioned at (0, 0, 0) with front face at z=thickness/2
     */
    createCurveFromCurves(
        pathCurves,
        partFrontX,
        partFrontY,
        partFrontWidth,
        partFrontHeight,
        depth,
        panelThickness,
        panelAnchor,
        contourOffset = 0
    ) {
        this.log.debug("Creating curve from curves:", {
            curvesCount: pathCurves.length,
            firstCurve: pathCurves[0],
            partFront: {
                x: partFrontX,
                y: partFrontY,
                width: partFrontWidth,
                height: partFrontHeight,
            },
            depth,
            panelThickness,
            panelAnchor,
            contourOffset,
        });

        // Create 3D versions of curves
        const curves3D = pathCurves
            .map((curve) => {
                let curve3D = null;

                if (curve instanceof THREE.LineCurve3) {
                    const v1 = this.convertPoint2DTo3D(
                        curve.v1.x,
                        curve.v1.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    const v2 = this.convertPoint2DTo3D(
                        curve.v2.x,
                        curve.v2.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    curve3D = new THREE.LineCurve3(v1, v2);
                } else if (curve instanceof THREE.CubicBezierCurve3) {
                    const v0 = this.convertPoint2DTo3D(
                        curve.v0.x,
                        curve.v0.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    const v1 = this.convertPoint2DTo3D(
                        curve.v1.x,
                        curve.v1.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    const v2 = this.convertPoint2DTo3D(
                        curve.v2.x,
                        curve.v2.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    const v3 = this.convertPoint2DTo3D(
                        curve.v3.x,
                        curve.v3.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    curve3D = new THREE.CubicBezierCurve3(v0, v1, v2, v3);
                } else if (curve instanceof THREE.QuadraticBezierCurve3) {
                    const v0 = this.convertPoint2DTo3D(
                        curve.v0.x,
                        curve.v0.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    const v1 = this.convertPoint2DTo3D(
                        curve.v1.x,
                        curve.v1.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    const v2 = this.convertPoint2DTo3D(
                        curve.v2.x,
                        curve.v2.y,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor,
                        contourOffset
                    );
                    curve3D = new THREE.QuadraticBezierCurve3(v0, v1, v2);
                }

                // Transfer segmentType from 2D to 3D curve
                if (curve3D && curve.segmentType) {
                    curve3D.segmentType = curve.segmentType;
                }

                return curve3D;
            })
            .filter((c) => c !== null);

        this.log.debug("Sample 3D curves:", {
            first: curves3D[0],
            middle: curves3D[Math.floor(curves3D.length / 2)],
            last: curves3D[curves3D.length - 1],
        });

        // Verify continuity of input 2D curves before 3D conversion
        for (let i = 1; i < pathCurves.length; i++) {
            const prevCurve = pathCurves[i - 1];
            const curCurve = pathCurves[i];

            let prevEnd, curStart;
            if (prevCurve instanceof THREE.LineCurve3) {
                prevEnd = prevCurve.v2;
            } else if (prevCurve instanceof THREE.CubicBezierCurve3) {
                prevEnd = prevCurve.v3;
            } else if (prevCurve instanceof THREE.QuadraticBezierCurve3) {
                prevEnd = prevCurve.v2;
            }

            if (curCurve instanceof THREE.LineCurve3) {
                curStart = curCurve.v1;
            } else if (curCurve instanceof THREE.CubicBezierCurve3) {
                curStart = curCurve.v0;
            } else if (curCurve instanceof THREE.QuadraticBezierCurve3) {
                curStart = curCurve.v0;
            }

            if (prevEnd && curStart) {
                const gap2D = prevEnd.distanceTo(curStart);
                if (gap2D > 0.01) {
                    this.log.warn(
                        `2D curve gap detected between curves ${
                            i - 1
                        } and ${i}: ${gap2D.toFixed(6)}`,
                        {
                            prevEnd: { x: prevEnd.x, y: prevEnd.y },
                            curStart: { x: curStart.x, y: curStart.y },
                        }
                    );
                }
            }
        }

        // Create exact path using the curves
        // Connect endpoints to avoid gaps - critical for mitered extrusions
        const path = new THREE.CurvePath();
        const gapTolerance = 0.001; // 0.001mm = 1 micron tolerance
        let totalGapsFixed = 0;

        for (let i = 0; i < curves3D.length; i++) {
            const curve = curves3D[i];

            // If not first curve, check if we need to connect to previous curve's end
            if (i > 0) {
                const prevCurve = curves3D[i - 1];
                const prevEnd = prevCurve.getPoint(1);
                const curStart = curve.getPoint(0);
                const gap = prevEnd.distanceTo(curStart);

                // Add connecting line for ANY gap, even tiny ones
                // This ensures continuous path for mitered extrusions
                if (gap > gapTolerance) {
                    this.log.debug(
                        `Adding connector between curves ${
                            i - 1
                        } and ${i}, gap: ${gap.toFixed(6)}mm`
                    );
                    path.add(new THREE.LineCurve3(prevEnd, curStart));
                    totalGapsFixed++;
                } else if (gap > 0) {
                    // Tiny gap: snap points together by adjusting curve start point
                    if (curve instanceof THREE.LineCurve3) {
                        curve.v1.copy(prevEnd);
                    } else if (curve instanceof THREE.CubicBezierCurve3) {
                        curve.v0.copy(prevEnd);
                    } else if (curve instanceof THREE.QuadraticBezierCurve3) {
                        curve.v0.copy(prevEnd);
                    }
                }
            }

            path.add(curve);
        }

        // Check if path is closed and close it if needed
        if (curves3D.length > 0) {
            const firstPoint = curves3D[0].getPoint(0);
            const lastPoint = curves3D[curves3D.length - 1].getPoint(1);
            const closureGap = firstPoint.distanceTo(lastPoint);

            if (closureGap > gapTolerance) {
                this.log.debug(
                    `Closing path with connector, gap: ${closureGap.toFixed(
                        6
                    )}mm`
                );
                path.add(new THREE.LineCurve3(lastPoint, firstPoint));
                totalGapsFixed++;
            }
        }

        if (totalGapsFixed > 0) {
            this.log.info(`Fixed ${totalGapsFixed} gaps in curve path`);
        }

        return path;
    }

    /**
     * Convert 2D point to 3D coordinates
     * For CSG operations, extrudes need to pass completely through the panel
     */
    convertPoint2DTo3D(
        x2d,
        y2d,
        partFrontX,
        partFrontY,
        partFrontWidth,
        partFrontHeight,
        depth,
        panelThickness,
        panelAnchor,
        contourOffset = 0
    ) {
        // Panel in 3D space:
        // - X=0 is horizontal center
        // - Y=0 is bottom of panel
        // - Z depends on anchor

        // Apply contour offset to x2d (for multiple VC passes)
        const adjustedX2d = x2d + contourOffset;

        // Convert X: subtract partFront left edge, then center
        const x3d = adjustedX2d - partFrontX - partFrontWidth / 2;

        // Convert Y: Make coordinates RELATIVE to partFront
        // y2d is absolute canvas coordinate, partFrontY can be negative
        // We need Y relative to partFront top edge (0 = top of partFront)
        const relativeY = y2d - partFrontY; // Y relative to partFront top

        // Now invert to 3D space (Y up)
        // In 3D: Y=0 is panel bottom, Y increases upward
        // partFrontHeight is the full height we need to map to 3D panel height
        let y3d = partFrontHeight - relativeY;

        // For bottom-left anchor, adjust origin
        if (panelAnchor === "bottom-left") {
            y3d = relativeY;
        }

        // Z: depth into material from the anchor surface
        let z3d;
        if (panelAnchor === "top-left") {
            // From front surface inward (toward positive Z)
            z3d = -depth + panelThickness / 2;
        } else if (panelAnchor === "bottom-left") {
            // From back surface inward (toward positive Z)
            z3d = -depth - panelThickness / 2;
        } else {
            // Default to front (toward positive Z)
            z3d = depth;
        }

        return new THREE.Vector3(x3d, y3d, z3d);
    }

    /**
     * Create path visualization for debugging
     * Shows the exact path as a colored line
     * @param {THREE.Curve} curve - Curve to visualize
     * @param {string} color - Line color
     * @param {string} side - Panel side: 'top' or 'bottom' (default: 'top')
     */
    createPathVisualization(curve, color, side = "top") {
        try {
            // Get points from the curve
            let points = curve.getPoints(200); // Get 200 points along the path

            // For bottom side, invert Z coordinates
            if (side === "bottom") {
                points = points.map((p) => new THREE.Vector3(p.x, p.y, -p.z));
            }

            // Create line geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(points);

            // Create line material (thick colored line)
            const material = new THREE.LineBasicMaterial({
                color: new THREE.Color(color || "#ff0000"),
                linewidth: 3, // Note: linewidth > 1 may not work on all platforms
                opacity: 0.8,
                transparent: true,
            });

            // Create line object
            const line = new THREE.Line(geometry, material);

            this.log.debug(
                "Created path visualization with",
                points.length,
                "points",
                `(side=${side})`
            );

            return line;
        } catch (error) {
            this.log.error("Error creating path visualization:", error);
            return null;
        }
    }

    /**
     * Create bit profile shape based on bit type
     */
    async createBitProfile(bitData) {
        // If bitData has a profilePath (SVG path), use SVGLoader
        if (bitData.profilePath) {
            try {
                const svgString = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${bitData.profilePath}"/></svg>`;
                const dataUrl = "data:image/svg+xml;base64," + btoa(svgString);
                const loader = new SVGLoader();

                return new Promise((resolve, reject) => {
                    loader.load(
                        dataUrl,
                        (data) => {
                            const shapes = SVGLoader.createShapes(
                                data.paths[0]
                            );
                            if (shapes.length > 0) {
                                let shape = shapes[0];
                                // No rotation needed here, rotation is done in ProfiledContourGeometry
                                resolve(shape);
                            } else {
                                resolve(this.createFallbackShape(bitData));
                            }
                        },
                        undefined,
                        (error) => {
                            this.log.error("Error loading SVG:", error);
                            resolve(this.createFallbackShape(bitData));
                        }
                    );
                });
            } catch (error) {
                this.log.error("Error parsing SVG profile:", error);
                return this.createFallbackShape(bitData);
            }
        }

        // Fallback to circular profile
        return this.createFallbackShape(bitData);
    }

    /**
     * Create fallback circular shape
     */
    createFallbackShape(bitData) {
        const diameter = bitData.diameter || 10;
        const radius = diameter / 2;

        const shape = new THREE.Shape();
        const segments = 32;

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }

        return shape;
    }

    /**
     * Create rectangular profile for bit extension (material above bit)
     * @param {number} width - Width of the rectangle (in pixels/mm)
     * @param {number} height - Height of the rectangle (in pixels/mm)
     * @returns {THREE.Shape} Rectangular shape centered at origin (bottom-center reference)
     */
    createExtensionProfile(width, height = -1) {
        const halfWidth = width / 2;

        // Create shape with bottom-center at origin (like bit profiles)
        // Extend slightly below (0.1) for better boolean operations
        const shape = new THREE.Shape();
        shape.moveTo(halfWidth, -0.001);
        shape.lineTo(halfWidth, -0.001);
        shape.lineTo(halfWidth, -height);
        shape.lineTo(-halfWidth, -height);
        shape.lineTo(-halfWidth, -0.001);

        return shape;
    }

    /**
     * Calculate adaptive curveSegments based on profile shape complexity
     * Uses proportional coefficient for smooth scaling
     * Public properties can be modified from console
     * @param {THREE.Shape} shape - Profile shape
     * @returns {number} Number of segments per curve
     */
    calculateAdaptiveCurveSegments(shape) {
        // Calculate total length of all curves in the shape
        let totalLength = 0;
        let curveCount = 0;
        if (shape.curves && shape.curves.length > 0) {
            shape.curves.forEach((curve) => {
                if (curve.getLength) {
                    totalLength += curve.getLength();
                    curveCount++;
                }
            });
        }

        // Use public properties for adaptive segmentation
        const calculated = Math.ceil(
            totalLength * this.curveSegmentCoefficient
        );
        const result = calculated; // Math.max(this.curveSegmentMin, Math.min(this.curveSegmentMax, calculated));

        return result;
    }

    /**
     * UNIFIED CONSTRUCTOR: Extrude profile along path with optional lathe corners
     * Single method for all extrusion types: bits, extensions, phantom bits
     * @param {THREE.Shape} profile - Profile shape to extrude
     * @param {THREE.CurvePath|string} path - 3D CurvePath (for 'mitered') or SVG path string (for 'round')
     * @param {string|number} color - Mesh color
     * @param {number} zOffset - Z offset to apply to all meshes after creation (default: 0)
     * @param {string} type - Extrusion type: 'mitered' (sharp corners) or 'round' (lathe-filled corners)
     * @param {string} side - Panel side: 'top' (front face) or 'bottom' (back face) - default: 'top'
     * @param {object} options - Additional options: {partFrontX, partFrontY, depth, panelThickness, panelAnchor, pathVisual=true}
     * @param {object} pathModifier - Path modification parameters: {offset: number, cornerStyle: 'round'|'bevel'} (default: disabled)
     * @returns {Array<THREE.Mesh>} Array of meshes (extrusions + lathes for 'round') + optional path visualization line
     */
    extrudeAlongPath(
        profile,
        path,
        color,
        zOffset = 0,
        type = "mitered",
        side = "top",
        options = {},
        pathModifier = null
    ) {
        try {
            let modifiedPath = path;

            // Apply path modification if specified
            if (
                pathModifier &&
                (pathModifier.offset !== undefined || pathModifier.cornerStyle)
            ) {
                modifiedPath = this._modifyPathWithOffset(
                    path,
                    pathModifier.offset || 0,
                    pathModifier.cornerStyle || "miter"
                );

                if (!modifiedPath) {
                    modifiedPath = path;
                }
            }

            let meshes = [];

            if (type === "mitered") {
                // MITERED: Sharp corners, merged path
                meshes = this._extrudeMitered(
                    profile,
                    modifiedPath,
                    color,
                    side,
                    options
                );
            } else if (type === "round") {
                // ROUND: Lathe-filled corners
                // Pass zOffset to options so lathe knows if it's an extension
                meshes = this._extrudeRound(
                    profile,
                    modifiedPath,
                    color,
                    side,
                    {
                        ...options,
                        zOffset,
                    }
                );
            } else if (type === "mixed") {
                // MIXED: Split profile, dual offsets, cap
                meshes = this._extrudeMixed(
                    profile,
                    modifiedPath, // passed as is (string usually)
                    color,
                    side,
                    options
                );
            } else {
                this.log.error(`Unknown extrusion type: ${type}`);
                return [];
            }

            // Apply Z offset to ALL meshes
            // For bottom side, invert the offset direction
            if (zOffset !== 0 && meshes && meshes.length > 0) {
                const appliedOffset = side === "bottom" ? -zOffset : zOffset;
                meshes.forEach((mesh) => {
                    mesh.position.z += appliedOffset;
                });
            }

            // Create path visualization if enabled (default: true)
            const pathVisual = options.pathVisual !== false; // true by default
            if (pathVisual) {
                let visualCurve = null;

                // If path is already a CurvePath, use it directly
                if (modifiedPath instanceof THREE.CurvePath) {
                    visualCurve = modifiedPath;
                }
                // If path is an SVG string, convert to 3D curve
                else if (typeof modifiedPath === "string") {
                    const pathCurves = this.parsePathToCurves(modifiedPath);
                    if (pathCurves.length > 0) {
                        const {
                            partFrontX = 0,
                            partFrontY = 0,
                            partFrontWidth = 100,
                            partFrontHeight = 100,
                            depth = 0,
                            panelThickness = 19,
                            panelAnchor = "top-left",
                        } = options;

                        visualCurve = this.createCurveFromCurves(
                            pathCurves,
                            partFrontX,
                            partFrontY,
                            partFrontWidth,
                            partFrontHeight,
                            depth,
                            panelThickness,
                            panelAnchor
                        );
                    }
                }

                // Create and add path visualization
                if (visualCurve) {
                    const pathLine = this.createPathVisualization(
                        visualCurve,
                        color,
                        side
                    );
                    if (pathLine) {
                        meshes.unshift(pathLine); // Add line at the beginning
                    }
                }
            }

            return meshes;
        } catch (error) {
            this.log.error(
                `Error in extrudeAlongPath (${type}):`,
                error.message
            );
            return [];
        }
    }

    /**
     * Modify path using offset
     * For SVG paths: uses paper.js offset
     * For THREE.js CurvePath: not supported (return original)
     * @private
     * @param {THREE.CurvePath|string} path - Original path
     * @param {number} offset - Offset distance (positive = outward, negative = inward)
     * @param {string} cornerStyle - Corner style: 'round' or 'bevel' (default: 'round')
     * @returns {THREE.CurvePath|string|null} Modified path or null if conversion fails
     */
    _modifyPathWithOffset(path, offset, cornerStyle = "round") {
        try {
            this.log.info("_modifyPathWithOffset called:", {
                pathType:
                    typeof path === "string"
                        ? "string"
                        : path?.constructor?.name,
                offset,
                cornerStyle,
            });

            // If offset is 0, return original path
            if (offset === 0) {
                this.log.debug("Offset is 0, returning original path");
                return path;
            }

            // Handle SVG path string with paper.js
            if (typeof path === "string") {
                this.log.debug("Handling SVG path string with paper.js");
                return this._modifySVGPathWithOffset(path, offset, cornerStyle);
            }

            // Handle THREE.js CurvePath - not supported, return original
            if (path instanceof THREE.CurvePath) {
                this.log.warn(
                    "THREE.js CurvePath offset not supported, use SVG path string instead"
                );
                return path;
            }

            this.log.warn(
                "Path modification: unsupported path type",
                typeof path
            );
            return null;
        } catch (error) {
            this.log.error("Error in _modifyPathWithOffset:", error);
            return null;
        }
    }

    /**
     * Modify SVG path string using paper.js offset
     * @private
     */
    _modifySVGPathWithOffset(svgPathString, offset, cornerStyle) {
        try {
            // Check if paper.js is available
            if (typeof paper === "undefined" || !paper.Path) {
                this.log.warn("paper.js not available for path modification");
                return svgPathString;
            }

            this.log.info("Starting SVG path modification:", {
                offset,
                cornerStyle,
                pathLength: svgPathString.length,
            });

            // Create temporary canvas for paper.js if needed
            let tempCanvas = null;
            let tempScope = null;

            if (!paper.project || !paper.project.activeLayer) {
                tempCanvas = document.createElement("canvas");
                tempScope = new paper.PaperScope();
                tempScope.setup(tempCanvas);
                this.log.debug("Created temporary paper.js scope");
            }

            // Use existing or temporary scope
            const workingScope = tempScope || paper;

            // Parse SVG path to paper.js path
            let paperPath = new workingScope.Path(svgPathString);
            if (
                !paperPath ||
                !paperPath.segments ||
                paperPath.segments.length === 0
            ) {
                this.log.warn("Failed to parse SVG path");
                if (tempCanvas) tempCanvas.remove();
                return svgPathString;
            }

            this.log.debug("Parsed SVG to paper.js path:", {
                segments: paperPath.segments.length,
                closed: paperPath.closed,
            });

            // Close path if needed
            const firstPoint = paperPath.firstSegment.point;
            const lastPoint = paperPath.lastSegment.point;
            if (firstPoint.getDistance(lastPoint) > 0.01) {
                paperPath.closed = true;
                this.log.debug("Path closed");
            }

            // Apply offset using PaperOffset library
            let offsetPath;
            if (offset !== 0) {
                this.log.debug("Applying offset:", { offset, cornerStyle });

                // PaperOffset expects outward positive; our negative means inward
                const offsetResult = PaperOffset.offset(paperPath, -offset, {
                    join:
                        cornerStyle === "round"
                            ? "round"
                            : cornerStyle === "miter" ||
                              cornerStyle === "mitered"
                            ? "miter"
                            : "bevel",
                    cap: "butt",
                    limit: 20, // Increased for more precise rounded corners
                    insert: false,
                    tolerance: 1e-6, // Higher precision for corner calculations
                    resolution: cornerStyle === "round" ? 128 : 64, // Higher resolution for round corners
                });

                // PaperOffset may return Path or array
                if (Array.isArray(offsetResult)) {
                    offsetPath = offsetResult[0] || null;
                    this.log.debug(
                        "PaperOffset returned",
                        offsetResult.length,
                        "paths"
                    );
                } else {
                    offsetPath = offsetResult || null;
                }

                if (!offsetPath) {
                    this.log.warn("PaperOffset returned no paths");
                }
            } else {
                offsetPath = paperPath;
            }

            if (!offsetPath) {
                this.log.warn("paper.js offset failed");
                paperPath.remove();
                if (tempCanvas) tempCanvas.remove();
                return svgPathString;
            }

            this.log.debug("Offset applied successfully:", {
                resultSegments: offsetPath.segments?.length,
            });

            // Get modified SVG path data
            let modifiedSVG = offsetPath.pathData;

            // Optional: convert Beziers → arcs using existing export pipeline
            try {
                const exportModule =
                    window?.dependencyContainer?.get?.("export") ||
                    window?.app?.container?.get?.("export");
                if (exportModule) {
                    const approximated = approximatePath(
                        modifiedSVG,
                        exportModule
                    );
                    if (approximated) {
                        modifiedSVG = approximated;
                        this.log.debug(
                            "Applied arc approximation to offset path"
                        );
                    }
                }
            } catch (e) {
                this.log.warn("Arc approximation after offset failed", e);
            }

            this.log.info("SVG path modified with offset:", {
                offset,
                cornerStyle,
                originalLength: svgPathString.length,
                modifiedLength: modifiedSVG.length,
                original: svgPathString.substring(0, 50) + "...",
                modified: modifiedSVG.substring(0, 50) + "...",
            });

            // Clean up paper objects
            offsetPath.remove();
            paperPath.remove();
            if (tempCanvas) {
                tempScope?.remove();
                tempCanvas.remove();
                this.log.debug("Cleaned up temporary paper.js scope");
            }

            return modifiedSVG;
        } catch (error) {
            this.log.error("Error in _modifySVGPathWithOffset:", error.message);
            return svgPathString;
        }
    }

    /**
     * Internal: Create mixed extrusion (split profile on two offset paths)
     * @private
     */
    _extrudeMixed(profile, path, color, side = "top", options = {}) {
        try {
            const bitDiameter = options.bitData?.diameter || 10;
            const outerOffset = -bitDiameter / 2;
            const innerOffset = bitDiameter / 2;

            const cornerStyle = options.cornerStyle || "miter";

            // 1. Prepare Paths
            // Outer Path (Left/Outward offset)
            let outerPath = this._modifyPathWithOffset(
                path,
                outerOffset,
                cornerStyle
            );
            if (!outerPath) outerPath = path;

            // Inner Path (Right/Inward offset)
            let innerPath = this._modifyPathWithOffset(
                path,
                innerOffset,
                cornerStyle
            );
            if (!innerPath) innerPath = path;

            // 2. Prepare Profiles
            // Split profile into Left (X<=0) and Right (X>=0) halves
            // Profile is centered at X=0
            const { left, right } = this._splitProfile(profile);

            // User specification:
            // - Left part of profile → outerOffset (outer path) with anchor at top-left
            // - Right part of profile → innerOffset (inner path) with anchor at top-right

            const leftProfileAligned = this._alignProfile(left, "top-left");
            const rightProfileAligned = this._alignProfile(right, "top-right");

            // User request: lift both profiles by bit length
            const bitLength = options.bitData?.length || 0;
            if (bitLength > 0) {
                leftProfileAligned.forEach((p) => (p.y += bitLength));
                rightProfileAligned.forEach((p) => (p.y += bitLength));
            }

            // 3. Extrude
            // Reuse _extrudeMitered logic but pass explicit points array instead of shape
            // We need to temporarily force _extrudeMitered to accept points...
            // But _extrudeMitered calls createProfiledContourGeometry which we just updated!
            // So we just need to pass the points array as 'profile'.

            // Note: _extrudeMitered expects a "profile" argument.
            // If we pass an array, we must ensure _extrudeMitered handles it.
            // _extrudeMitered logic:
            // const curveSegments = this.calculateAdaptiveCurveSegments(profile);
            // const profileGeometry = new THREE.ShapeGeometry(profile, ...);
            // This part in _extrudeMitered needs update or we bypass it.

            // Better: Call createProfiledContourGeometry directly here.

            const meshes = [];

            // Helper to extrude points along path
            // Helper to extrude points along path
            const extrudePoints = (
                points,
                pathInput,
                name,
                overrideColor = null
            ) => {
                let contourPath;
                let path3D;

                // 1. Resolve Path (String vs CurvePath)
                if (typeof pathInput === "string") {
                    const pathCurves = this.parsePathToCurves(pathInput);
                    if (pathCurves.length === 0) return null;

                    const {
                        partFrontX = 0,
                        partFrontY = 0,
                        partFrontWidth = 100,
                        partFrontHeight = 100,
                        depth = 0,
                        panelThickness = 19,
                        panelAnchor = { x: 0, y: 0 },
                    } = options;

                    path3D = this.createCurveFromCurves(
                        pathCurves,
                        partFrontX,
                        partFrontY,
                        partFrontWidth,
                        partFrontHeight,
                        depth,
                        panelThickness,
                        panelAnchor
                    );
                } else {
                    // Assume already a 3D CurvePath
                    path3D = pathInput;
                }

                if (!path3D || !path3D.curves) return null;

                // Group curves (reuse logic)
                const curveGroups = this.groupCurves(path3D.curves);
                if (curveGroups.length === 0) return null;

                // Merge to single contour for mitered
                const mergedPath = new THREE.CurvePath();
                curveGroups.forEach((g) =>
                    g.curves.forEach((c) => mergedPath.add(c))
                );

                // Explicit segment count for consistent geometry structure
                const segments = Math.max(
                    64,
                    Math.ceil(mergedPath.getLength() * 2)
                );
                const contourPoints = mergedPath.getPoints(segments);
                const contour = contourPoints.map(
                    (p) => new THREE.Vector3(p.x, p.y, p.z)
                );

                // Check closed
                const isClosed =
                    contour[0].distanceTo(contour[contour.length - 1]) < 0.01;
                if (isClosed) contour.pop();

                const geo = this.createProfiledContourGeometry(
                    points,
                    contour,
                    isClosed,
                    false,
                    12,
                    false, // invertCaps
                    side
                );

                if (geo) {
                    const m = new THREE.Mesh(
                        geo,
                        new THREE.MeshStandardMaterial({
                            color: new THREE.Color(overrideColor || color),
                            side: THREE.FrontSide,
                        })
                    );
                    m.userData.isBitPart = true;
                    m.userData.subPart = name;

                    // Extract Edge Paths (naked edges of the open profile)
                    // Geometry assumes grid structure: (pathSegments + 1) * profilePoints
                    const edgePaths = [];
                    const pos = geo.attributes.position;
                    const numProfilePoints = points.length;
                    const numPathPoints = contour.length; // contourPoints

                    // There might be mismatch if createProfiledContourGeometry modifies counts, but usually it matches contour input size for 'mitered' style
                    // However, getPoints(segments) returns segments+1 points.
                    // contour array size is effectively the number of "rings".

                    if (pos.count === numPathPoints * numProfilePoints) {
                        const edge1Points = [];
                        const edge2Points = [];

                        for (let i = 0; i < numPathPoints; i++) {
                            const idx1 = i * numProfilePoints; // First point of profile
                            const idx2 =
                                i * numProfilePoints + (numProfilePoints - 1); // Last point of profile

                            edge1Points.push(
                                new THREE.Vector3(
                                    pos.getX(idx1),
                                    pos.getY(idx1),
                                    pos.getZ(idx1)
                                )
                            );
                            edge2Points.push(
                                new THREE.Vector3(
                                    pos.getX(idx2),
                                    pos.getY(idx2),
                                    pos.getZ(idx2)
                                )
                            );
                        }

                        const ptsToPath = (pts) => {
                            const p = new THREE.CurvePath();
                            if (pts.length < 2) return p;

                            // Filter duplicates/close points
                            const cleanPts = [pts[0]];
                            const threshold = 0.001;
                            for (let k = 1; k < pts.length; k++) {
                                if (
                                    pts[k].distanceTo(
                                        cleanPts[cleanPts.length - 1]
                                    ) > threshold
                                ) {
                                    cleanPts.push(pts[k]);
                                }
                            }

                            for (let k = 0; k < cleanPts.length - 1; k++) {
                                p.add(
                                    new THREE.LineCurve3(
                                        cleanPts[k],
                                        cleanPts[k + 1]
                                    )
                                );
                            }
                            return p;
                        };

                        edgePaths.push(ptsToPath(edge1Points));
                        edgePaths.push(ptsToPath(edge2Points));
                    }

                    return { mesh: m, edgePaths, isPathClosed: isClosed };
                }
                return null;
            };

            // Extrude Right Profile (Outer)
            const outerResult = extrudePoints(
                rightProfileAligned,
                outerPath,
                "outer"
            );
            if (outerResult) {
                meshes.push(outerResult.mesh);

                // User Request: Visualize naked edges to verify correctness
                if (
                    outerResult.edgePaths &&
                    outerResult.edgePaths.length === 2
                ) {
                    this.log.info("Visualizing outer edges...");

                    // Visualize Start Edge (Point 0 of profile) - Red
                    const line1 = this.createPathVisualization(
                        outerResult.edgePaths[0],
                        "#ff0000",
                        side
                    );
                    if (line1) {
                        line1.userData.isHelper = true;
                        meshes.push(line1);
                    }

                    // Visualize End Edge (Last Point of profile) - Blue
                    const line2 = this.createPathVisualization(
                        outerResult.edgePaths[1],
                        "#eeff00ff",
                        side
                    );
                    if (line2) {
                        line2.userData.isHelper = true;
                        meshes.push(line2);
                    }
                }

                // User Request: Extrude LEFT profile along the YELLOW edge (edgePaths[1])
                // Also check for closure
                if (
                    outerResult.edgePaths &&
                    outerResult.edgePaths.length === 2
                ) {
                    const yellowPath = outerResult.edgePaths[1]; // Second edge

                    // Check closure
                    // Use flag from outerResult or check distance
                    if (outerResult.isPathClosed) {
                        // For a closed path, the start and end points of the path itself should be close
                        const start = yellowPath.getPointAt(0); // First point
                        const end = yellowPath.getPointAt(1); // Last point (normalized parameter 1)
                        if (start.distanceTo(end) > 0.01) {
                            this.log.info("Closing yellow edge path loop");
                            // If the path is meant to be closed but isn't, add a closing segment
                            yellowPath.add(new THREE.LineCurve3(end, start));
                        }
                    }

                    // DEBUG: Analyze yellow path points
                    const debugPoints = yellowPath.getPoints(); // Note: getPoints uses default divisions (5) per curve usually, or we can pass count
                    this.log.warn(
                        `Yellow Path Analysis: Total Points from getPoints(): ${debugPoints.length}, Curves: ${yellowPath.curves.length}`
                    );
                    let anomalyCount = 0;
                    for (let i = 0; i < debugPoints.length - 1; i++) {
                        const d = debugPoints[i].distanceTo(debugPoints[i + 1]);
                        if (d < 0.1) {
                            // Check for somewhat close points
                            anomalyCount++;
                            if (anomalyCount <= 10) {
                                this.log.warn(
                                    `  Close points at idx ${i}: dist=${d.toFixed(
                                        6
                                    )}, p=${JSON.stringify(debugPoints[i])}`
                                );
                            }
                        }
                    }
                    this.log.warn(
                        `  Total close segments (< 0.1mm): ${anomalyCount}`
                    );

                    // Prepare Left Profile for Edge Extrusion
                    // User Request: "change to opposite angle" - switching from bottom-left to top-right
                    const leftProfileForEdge = this._alignProfile(
                        left,
                        "top-right"
                    );

                    // Apply bit length lift (same as before)
                    if (bitLength > 0) {
                        leftProfileForEdge.forEach((p) => (p.y += bitLength));
                    }

                    this.log.info(
                        "Extruding left profile along yellow edge..."
                    );
                    const edgeMesh = extrudePoints(
                        leftProfileForEdge,
                        yellowPath,
                        "edge_Left",
                        color
                    );
                    if (edgeMesh) meshes.push(edgeMesh.mesh);
                }
            }

            // Extrude Left Profile (Inner) - Original logic
            // HIDDEN per user request: "let's make the left extrude invisible"
            // const innerResult = extrudePoints(leftProfileAligned, innerPath, "inner");
            // if (innerResult) meshes.push(innerResult.mesh);

            // 4. Cap Geometry (Gap between top edges)
            const capMesh = this._createCapMesh(
                outerPath,
                innerPath,
                color,
                side,
                options
            );
            if (capMesh) meshes.push(capMesh);

            return meshes;

            return meshes;
        } catch (e) {
            this.log.error("Error in _extrudeMixed:", e);
            return [];
        }
    }

    /**
     * Split profile into left (X<=0) and right (X>=0) halves
     * Finds intersections with X=0 axis and splits profile correctly
     */
    _splitProfile(profileShape) {
        // Get points from shape
        let points;
        if (Array.isArray(profileShape)) {
            points = profileShape;
        } else {
            points = profileShape.getPoints(32);
        }

        const center = 0;
        const tolerance = 1e-5;

        // Find or calculate intersection points with X=0 axis
        const intersections = [];

        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            // Check if point is on axis
            if (Math.abs(p1.x - center) <= tolerance) {
                intersections.push({
                    index: i,
                    point: new THREE.Vector2(p1.x, p1.y),
                    isExact: true,
                });
            }
            // Check if segment crosses axis
            else if (
                (p1.x < center && p2.x > center) ||
                (p1.x > center && p2.x < center)
            ) {
                // Calculate intersection point
                const t = (center - p1.x) / (p2.x - p1.x);
                const y = p1.y + t * (p2.y - p1.y);
                intersections.push({
                    index: i,
                    point: new THREE.Vector2(center, y),
                    isExact: false,
                    afterIndex: i, // intersection is between i and i+1
                });
            }
        }

        this.log.info(
            `Found ${intersections.length} intersections with X=0 axis`
        );

        // Need exactly 2 intersections for proper split
        if (intersections.length !== 2) {
            this.log.warn(
                `Expected 2 intersections, found ${intersections.length}, using simple split`
            );
            // Fallback
            const left = points
                .filter((p) => p.x <= center + tolerance)
                .map((p) => new THREE.Vector2(p.x, p.y));
            const right = points
                .filter((p) => p.x >= center - tolerance)
                .map((p) => new THREE.Vector2(p.x, p.y));
            return { left, right };
        }

        const int1 = intersections[0];
        const int2 = intersections[1];

        this.log.info(
            `Intersection 1: index=${int1.index}, point=(${int1.point.x.toFixed(
                3
            )}, ${int1.point.y.toFixed(3)})`
        );
        this.log.info(
            `Intersection 2: index=${int2.index}, point=(${int2.point.x.toFixed(
                3
            )}, ${int2.point.y.toFixed(3)})`
        );

        // Helper to collect points between two indices (inclusive of boundary logic)
        const collectArc = (startInt, endInt) => {
            const arcIsExactStart = startInt.isExact;
            const arcIsExactEnd = endInt.isExact;

            const startIdx = arcIsExactStart
                ? startInt.index + 1
                : startInt.afterIndex + 1;
            const endIdx = arcIsExactEnd ? endInt.index : endInt.afterIndex + 1;

            const arcPoints = [];

            // Add start intersection
            arcPoints.push(startInt.point);

            // Traverse
            let idx = startIdx;
            let loopCount = 0;
            const maxPoints = points.length + 5;

            // Handle wrap-around traversal
            while (loopCount < maxPoints) {
                // Check if we reached the end index
                // Note: handling wrap-around index matching is tricky because endIdx might be 0
                // Use strict index comparison with modulo
                const currentIdx = idx % points.length;

                // If we hit the end index, stop
                if (currentIdx === endIdx % points.length) break;

                arcPoints.push(
                    new THREE.Vector2(
                        points[currentIdx].x,
                        points[currentIdx].y
                    )
                );

                idx++;
                loopCount++;
            }

            // Add end intersection
            arcPoints.push(endInt.point);

            return arcPoints;
        };

        // Collect both arcs
        // Arc 1: int1 -> int2
        const arc1 = collectArc(int1, int2);

        // Arc 2: int2 -> int1
        const arc2 = collectArc(int2, int1);

        // Determine which is Left and which is Right
        // Calculate average X for each arc
        const getAvgX = (arc) => {
            if (arc.length === 0) return 0;
            return arc.reduce((sum, p) => sum + p.x, 0) / arc.length;
        };

        const avgX1 = getAvgX(arc1);
        const avgX2 = getAvgX(arc2);

        let left, right;

        if (avgX1 < avgX2) {
            left = arc1;
            right = arc2;
        } else {
            left = arc2;
            right = arc1;
        }

        // User request: remove start point of left profile and end point of right profile
        if (right.length > 0) right.shift();
        if (left.length > 0) left.pop();

        return { left, right };
    }

    /**
     * Align profile points so the anchor is at (0,0)
     * @param {Array<THREE.Vector2>} points
     * @param {string} anchor "top-left", "top-right", "bottom-left", "bottom-right"
     */
    _alignProfile(points, anchor) {
        if (!points || points.length === 0) return points;

        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        points.forEach((p) => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        let anchorX = 0,
            anchorY = 0;

        if (anchor.includes("left")) anchorX = minX;
        if (anchor.includes("right")) anchorX = maxX;
        if (anchor.includes("top")) anchorY = maxY;
        if (anchor.includes("bottom")) anchorY = minY;

        return points.map(
            (p) => new THREE.Vector2(p.x - anchorX, p.y - anchorY)
        );
    }

    _createCapMesh(outerPathStr, innerPathStr, color, side, options) {
        try {
            // Parse paths to 2D points
            const outerCurve = this.parsePathToCurves(outerPathStr);
            const innerCurve = this.parsePathToCurves(innerPathStr);

            // Get sampled points
            // Use 2D logic first

            const getPoints2D = (curves) => {
                if (!curves || curves.length === 0) return [];
                // Flatten curves to points
                // This is a bit duplicating parseSVG, but we have curves now
                const pts = [];
                curves.forEach((c) => {
                    const p = c.getPoints(10); // coarse sample
                    p.forEach((v) => pts.push(new THREE.Vector2(v.x, v.y)));
                });
                return pts;
            };

            // ... actually parsePathToCurves produces 3D curves with Z=0
            // We can just use them.

            // Triangulate between two loops is tricky if they don't match point counts.
            // But we can use ShapeGeometry with hole!

            const outerPoints = this._getContourPoints(outerCurve);
            const innerPoints = this._getContourPoints(innerCurve);

            if (outerPoints.length < 3 || innerPoints.length < 3) return null;

            const shape = new THREE.Shape(outerPoints);
            const hole = new THREE.Path(innerPoints);
            shape.holes.push(hole);

            const geometry = new THREE.ShapeGeometry(shape);

            // Now we need to transform this 2D geometry to 3D space on the panel
            // shape is in SVG coordinates.
            // We need convertPoint2DTo3D for every vertex.

            const pos = geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);

                const v3 = this.convertPoint2DTo3D(
                    x,
                    y,
                    options.partFrontX,
                    options.partFrontY,
                    options.partFrontWidth,
                    options.partFrontHeight,
                    options.depth, // depth? or 0?
                    options.panelThickness,
                    options.panelAnchor
                );

                // Recalculate v3 with depth=0 for the Cap.
                const v3Surf = this.convertPoint2DTo3D(
                    x,
                    y,
                    options.partFrontX,
                    options.partFrontY,
                    options.partFrontWidth,
                    options.partFrontHeight,
                    0, // Depth 0 = Surface
                    options.panelThickness,
                    options.panelAnchor
                );

                pos.setXYZ(i, v3Surf.x, v3Surf.y, v3Surf.z);
            }

            // Invert Z if side is bottom
            if (side === "bottom") {
                // The convertPoint2DTo3D handles basic Z.
                // But we might need to flip normals?
                // ShapeGeometry is XY plane.
                // convert maps it to 3D.
                // We should check winding.
            }

            geometry.computeVertexNormals();

            const mesh = new THREE.Mesh(
                geometry,
                new THREE.MeshStandardMaterial({
                    color: color,
                    side: THREE.FrontSide,
                })
            );
            mesh.userData.isCap = true;
            return mesh;
        } catch (e) {
            return null;
        }
    }

    _getContourPoints(curvePath) {
        if (!curvePath) return [];
        // Approximate
        // We need a smooth loop.
        const len = curvePath.getLength();
        const segments = Math.max(20, Math.ceil(len / 2));
        const points = curvePath.getPoints(segments);
        return points.map((p) => new THREE.Vector2(p.x, p.y));
    }

    /**
     * Internal: Create mitered extrusion (sharp corners, merged path)
     * @private
     */
    _extrudeMitered(profile, curveOrString, color, side = "top", options = {}) {
        try {
            let curve;

            // Check if curveOrString is a string (SVG path data)
            if (typeof curveOrString === "string") {
                // Parse SVG path to curves
                const pathCurves = this.parsePathToCurves(curveOrString);
                if (pathCurves.length === 0) {
                    this.log.warn("No curves parsed from SVG path");
                    return [];
                }

                // Create 3D curve from 2D curves using coordinate transformation
                const {
                    partFrontX = 0,
                    partFrontY = 0,
                    partFrontWidth = 100,
                    partFrontHeight = 100,
                    depth = 0,
                    panelThickness = 19,
                    panelAnchor = { x: 0, y: 0 },
                } = options;

                curve = this.createCurveFromCurves(
                    pathCurves,
                    partFrontX,
                    partFrontY,
                    partFrontWidth,
                    partFrontHeight,
                    depth,
                    panelThickness,
                    panelAnchor
                );
            } else {
                // curveOrString is already a CurvePath
                curve = curveOrString;
            }

            // Calculate adaptive curve segments based on profile complexity
            const curveSegments = this.calculateAdaptiveCurveSegments(profile);
            const profileGeometry = new THREE.ShapeGeometry(
                profile,
                curveSegments
            );

            // Extract points from geometry
            const posAttr = profileGeometry.attributes.position;
            const profilePoints = [];
            for (let i = 0; i < posAttr.count; i++) {
                profilePoints.push(
                    new THREE.Vector2(posAttr.getX(i), posAttr.getY(i))
                );
            }

            // Build grouped path, then merge all groups into one continuous path
            let samplingPath = curve;
            let curveGroups = [];
            if (curve && curve.curves && Array.isArray(curve.curves)) {
                curveGroups = this.groupCurves(curve.curves);
                if (curveGroups.length > 0) {
                    const mergedCurvePath = new THREE.CurvePath();
                    curveGroups.forEach((group) => {
                        group.curves.forEach((c) => mergedCurvePath.add(c));
                    });
                    samplingPath = mergedCurvePath;
                }
            }

            // Get contour points from the merged path
            let segments;
            if (samplingPath instanceof THREE.LineCurve3) {
                segments = 1;
            } else {
                const pathLength = samplingPath.getLength
                    ? samplingPath.getLength()
                    : 100;
                segments = Math.max(64, Math.ceil(pathLength * 2));
            }
            const contourPoints = samplingPath.getPoints(segments);

            // Convert to contour array
            let contour = contourPoints.map(
                (p) => new THREE.Vector3(p.x, p.y, p.z)
            );

            // Determine if the path is closed
            const firstPoint = contour[0];
            const lastPoint = contour[contour.length - 1];
            const contourClosed = firstPoint.distanceTo(lastPoint) < 0.01;

            // For closed contours, remove the duplicate last point
            if (contourClosed && contour.length > 1) {
                contour = contour.slice(0, -1);
            }

            // Use ProfiledContourGeometry for mitered corners
            const flags = this._getGeometryTransformFlags(side, false);
            const geometry = this.createProfiledContourGeometry(
                profile,
                contour,
                contourClosed,
                false, // openEnded - false means create closed ends
                curveSegments,
                flags.invertExtrusionCaps,
                side
            );

            if (!geometry) {
                throw new Error("Failed to create ProfiledContourGeometry");
            }

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.FrontSide,
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.profilePoints = profilePoints;
            mesh.userData.isBitPart = true;

            return [mesh];
        } catch (error) {
            this.log.error("Error in _extrudeMitered:", error.message);
            return [];
        }
    }

    /**
     * Internal: Create round extrusion (lathe-filled corners)
     * @private
     */
    _extrudeRound(profile, pathOrString, color, side = "top", options = {}) {
        try {
            let path;

            // Check if pathOrString is a string (SVG path data)
            if (typeof pathOrString === "string") {
                // Parse SVG path to curves
                const pathCurves = this.parsePathToCurves(pathOrString);
                if (pathCurves.length === 0) {
                    this.log.warn("No curves parsed from SVG path");
                    return [];
                }

                // Create 3D curve from 2D curves using coordinate transformation
                const {
                    partFrontX = 0,
                    partFrontY = 0,
                    partFrontWidth = 100,
                    partFrontHeight = 100,
                    depth = 0,
                    panelThickness = 19,
                    panelAnchor = { x: 0, y: 0 },
                } = options;

                path = this.createCurveFromCurves(
                    pathCurves,
                    partFrontX,
                    partFrontY,
                    partFrontWidth,
                    partFrontHeight,
                    depth,
                    panelThickness,
                    panelAnchor
                );
            } else {
                // pathOrString is already a CurvePath
                path = pathOrString;
            }

            // Calculate adaptive curve segments
            const curveSegments = this.calculateAdaptiveCurveSegments(profile);
            const profileGeometry = new THREE.ShapeGeometry(
                profile,
                curveSegments
            );

            // Extract points from geometry for lathe synchronization
            const posAttr = profileGeometry.attributes.position;
            const profilePoints = [];
            for (let i = 0; i < posAttr.count; i++) {
                profilePoints.push(
                    new THREE.Vector2(posAttr.getX(i), posAttr.getY(i))
                );
            }

            // Get path segments
            if (!path.curves || path.curves.length === 0) {
                this.log.warn("Round extrusion: No curves in path");
                return [];
            }

            // Group curves using shared logic
            const curveGroups = this.groupCurves(path.curves);

            // Check if path is closed
            let isClosedPath = false;
            let contourIsClockwise = false;

            if (path.curves.length > 0) {
                const firstCurve = path.curves[0];
                const lastCurve = path.curves[path.curves.length - 1];
                const firstPoint = firstCurve.getPoint(0);
                const lastPoint = lastCurve.getPoint(1);
                const closureGap = firstPoint.distanceTo(lastPoint);
                isClosedPath = closureGap < 0.01;

                // Determine winding direction
                if (isClosedPath) {
                    let signedArea = 0;
                    for (const curve of path.curves) {
                        const p0 = curve.getPoint(0);
                        const p1 = curve.getPoint(1);
                        signedArea += (p1.x - p0.x) * (p1.y + p0.y);
                    }
                    contourIsClockwise = signedArea > 0;
                }
            }

            // Create meshes for each group
            const allMeshes = [];
            const junctionPoints = [];

            for (
                let groupIndex = 0;
                groupIndex < curveGroups.length;
                groupIndex++
            ) {
                const group = curveGroups[groupIndex];
                const contourPoints = [];

                for (const curve of group.curves) {
                    const samples = 1;
                    const points = curve.getPoints(samples);
                    if (contourPoints.length === 0) {
                        contourPoints.push(...points);
                    } else {
                        contourPoints.push(points[points.length - 1]);
                    }
                }

                // Add junction after each group (except last), and between last and first if closed
                if (groupIndex < curveGroups.length - 1) {
                    junctionPoints.push({
                        point: contourPoints[contourPoints.length - 1].clone(),
                        groupIndex: groupIndex,
                    });
                } else if (isClosedPath && curveGroups.length > 1) {
                    junctionPoints.push({
                        point: contourPoints[contourPoints.length - 1].clone(),
                        groupIndex: groupIndex,
                        closesContour: true,
                    });
                }

                // Check if this group forms a closed path
                const firstPoint = contourPoints[0];
                const lastPoint = contourPoints[contourPoints.length - 1];
                const groupClosed = firstPoint.distanceTo(lastPoint) < 0.01;

                // Create geometry for this group
                const flags = this._getGeometryTransformFlags(side, false);
                const geometry = this.createProfiledContourGeometry(
                    profile,
                    contourPoints,
                    groupClosed,
                    false,
                    curveSegments,
                    flags.invertExtrusionCaps,
                    side
                );

                if (!geometry) {
                    this.log.warn(
                        `Failed to create geometry for group ${groupIndex}`
                    );
                    continue;
                }

                geometry.computeVertexNormals();
                geometry.normalizeNormals();

                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(color || "#cccccc"),
                    roughness: 0.5,
                    metalness: 0.2,
                    side: THREE.FrontSide,
                    wireframe: this.materialManager
                        ? this.materialManager.isWireframeEnabled()
                        : false,
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.userData.isBitPart = true;
                mesh.userData.groupIndex = groupIndex;
                mesh.userData.groupType = group.type;

                allMeshes.push(mesh);
            }

            // Partial lathe at every junction
            if (junctionPoints.length > 0) {
                // Calculate extension profile height from profilePoints (for BOTTOM positioning)
                let extensionHeight = 0;
                if (options.zOffset && options.zOffset !== 0) {
                    // For extensions, calculate height from profile points
                    const yCoords = profilePoints.map((p) => p.y);
                    const minY = Math.min(...yCoords);
                    const maxY = Math.max(...yCoords);
                    extensionHeight = Math.abs(maxY - minY);
                }

                for (let i = 0; i < junctionPoints.length; i++) {
                    const junction = junctionPoints[i];
                    const groupIndex = junction.groupIndex;
                    let currentGroup, nextGroup;

                    if (junction.closesContour) {
                        currentGroup = curveGroups[curveGroups.length - 1];
                        nextGroup = curveGroups[0];
                    } else {
                        currentGroup = curveGroups[groupIndex];
                        nextGroup = curveGroups[groupIndex + 1];
                    }

                    if (!currentGroup || !nextGroup) continue;

                    const lastCurve =
                        currentGroup.curves[currentGroup.curves.length - 1];
                    const firstCurve = nextGroup.curves[0];

                    const t1 = 0.9;
                    const t2 = 0.1;
                    const prevPoint = lastCurve.getPoint(t1);
                    const nextPoint = firstCurve.getPoint(t2);
                    const prevDir = new THREE.Vector3()
                        .subVectors(junction.point, prevPoint)
                        .normalize();
                    const nextDir = new THREE.Vector3()
                        .subVectors(nextPoint, junction.point)
                        .normalize();

                    const latheResult = this.createPartialLatheAtJunction(
                        profile,
                        junction.point,
                        prevDir,
                        nextDir,
                        color,
                        i,
                        true,
                        profilePoints,
                        contourIsClockwise,
                        side, // side parameter
                        options.zOffset && options.zOffset !== 0, // isExtension
                        extensionHeight // height of extension profile
                    );

                    if (latheResult && latheResult.mesh) {
                        const latheMesh = latheResult.mesh;
                        latheMesh.userData.isBitPart = true;
                        latheMesh.userData.isLatheCorner = true;
                        latheMesh.userData.isPartialLathe = true;
                        latheMesh.userData.junctionAfterGroup =
                            junction.groupIndex;
                        allMeshes.push(latheMesh);
                    }
                }
            }

            return allMeshes;
        } catch (error) {
            this.log.error("Error in _extrudeRound:", error.message);
            return [];
        }
    }

    /**
     * Calculate geometry transformation flags based on side and extension type
     * @private
     */
    _getGeometryTransformFlags(side, isExtension = false) {
        const isBottom = side === "bottom";

        return {
            // Contour and profile transformations
            invertZ: isBottom, // Invert Z coordinates
            rotateProfile: isBottom, // Rotate profile 180° around Y

            // Lathe transformations
            invertLatheProfile: isBottom || isExtension, // Invert Y in lathe profile
            invertLatheNormals: isBottom || isExtension, // Invert lathe body winding

            // Cap winding (simplified - caps always use base winding for lathe)
            invertExtrusionCaps: !isBottom, // TOP needs inverted caps

            // Z positioning
            invertPositionZ: isBottom, // Invert position Z
            addExtensionOffset: isBottom && isExtension, // Add height for bottom extensions
        };
    }

    /**
     * Create profiled contour geometry with mitered corners
     * Based on https://jsfiddle.net/prisoner849/bygy1xkt/
     * @param {THREE.Shape} profileShape - Profile shape
     * @param {Array<THREE.Vector3>} contour - Contour points
     * @param {boolean} contourClosed - Whether contour is closed
     * @param {boolean} openEnded - Whether to leave ends open (default: false = add caps)
     * @param {number} curveSegments - Number of segments per curve (default: 32)
     * @param {boolean} invertCaps - Whether to invert cap winding
     * @param {string} side - Panel side: 'top' or 'bottom' (default: 'top')
     */
    createProfiledContourGeometry(
        profileShape,
        contour,
        contourClosed,
        openEnded,
        curveSegments = 32,
        invertCaps = false,
        side = "top"
    ) {
        try {
            contourClosed = contourClosed !== undefined ? contourClosed : true;
            openEnded = openEnded !== undefined ? openEnded : false;
            openEnded = contourClosed === true ? false : openEnded;

            this.log.debug("createProfiledContourGeometry starting:", {
                contourPoints: contour.length,
                contourClosed,
                openEnded,
                curveSegments,
                side,
                isProfileArray: Array.isArray(profileShape),
            });

            const flags = this._getGeometryTransformFlags(side, false);

            // Apply Z inversion if needed (for bottom side)
            if (flags.invertZ) {
                contour = contour.map((p) => new THREE.Vector3(p.x, p.y, -p.z));
            }

            let profileGeometry;
            if (Array.isArray(profileShape)) {
                // Handle array of Vector2 points directly
                const points = profileShape;
                const vertices = [];
                points.forEach((p) => vertices.push(p.x, p.y, 0));
                profileGeometry = new THREE.BufferGeometry();
                profileGeometry.setAttribute(
                    "position",
                    new THREE.Float32BufferAttribute(vertices, 3)
                );
                // Mark as open profile if first/last points don't match
                const first = points[0];
                const last = points[points.length - 1];
                if (first.distanceTo(last) > 0.001) {
                    profileGeometry.userData.isOpenProfile = true;
                }
            } else {
                // Original logic for THREE.Shape
                profileGeometry = new THREE.ShapeGeometry(
                    profileShape,
                    curveSegments
                );
            }

            profileGeometry.rotateX(Math.PI * 0.5);

            // Apply profile rotation if needed (for bottom side)
            if (flags.rotateProfile) {
                profileGeometry.rotateY(Math.PI);
            }

            let profile = profileGeometry.attributes.position;

            this.log.debug("Profile geometry created:", {
                profilePoints: profile.count,
            });

            // Calculate total vertices needed: profile points for each contour
            // (Earcut uses existing vertices, no need for center points)
            const posCount = profile.count * contour.length;
            let positions = new Float32Array(posCount * 3);

            for (let i = 0; i < contour.length; i++) {
                let v1 = new THREE.Vector2().subVectors(
                    contour[i - 1 < 0 ? contour.length - 1 : i - 1],
                    contour[i]
                );
                let v2 = new THREE.Vector2().subVectors(
                    contour[i + 1 == contour.length ? 0 : i + 1],
                    contour[i]
                );

                // PRECISION IMPROVEMENT: Normalize vectors for numerical stability
                // This ensures consistent angle calculations regardless of segment lengths
                const v1Len = v1.length();
                const v2Len = v2.length();
                if (v1Len > this.epsilon) v1.normalize();
                if (v2Len > this.epsilon) v2.normalize();

                // PRECISION IMPROVEMENT: Clamp angle to handle near-straight lines
                // Prevents numerical instability when angle is very close to 0 or 2*PI
                let angle = v2.angle() - v1.angle();
                if (Math.abs(angle) < this.angleEpsilon) {
                    angle = 0;
                }
                // Normalize angle to [-PI, PI] range for consistent behavior
                if (angle > Math.PI) angle -= Math.PI * 2;
                if (angle < -Math.PI) angle += Math.PI * 2;

                let halfAngle = angle * 0.5;

                let hA = halfAngle;
                let tA = v2.angle() + Math.PI * 0.5;
                if (!contourClosed) {
                    if (i == 0 || i == contour.length - 1) {
                        hA = Math.PI * 0.5;
                    }
                    if (i == contour.length - 1) {
                        tA = v1.angle() - Math.PI * 0.5;
                    }
                }

                // PRECISION IMPROVEMENT: Clamp miter shift to prevent extreme values
                // When miter angle approaches 90 degrees (PI/2), tan() becomes very large
                // This can cause vertices to shoot off to infinity
                let shift = Math.tan(hA - Math.PI * 0.5);
                shift = Math.max(-this.miterLimit, Math.min(this.miterLimit, shift));
                let shiftMatrix = new THREE.Matrix4().set(
                    1,
                    0,
                    0,
                    0,
                    -shift,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1
                );

                let tempAngle = tA;
                let rotationMatrix = new THREE.Matrix4().set(
                    Math.cos(tempAngle),
                    -Math.sin(tempAngle),
                    0,
                    0,
                    Math.sin(tempAngle),
                    Math.cos(tempAngle),
                    0,
                    0,
                    0,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                    1
                );

                let translationMatrix = new THREE.Matrix4().set(
                    1,
                    0,
                    0,
                    contour[i].x,
                    0,
                    1,
                    0,
                    contour[i].y,
                    0,
                    0,
                    1,
                    contour[i].z,
                    0,
                    0,
                    0,
                    1
                );

                let cloneProfile = profile.clone();
                cloneProfile.applyMatrix4(shiftMatrix);
                cloneProfile.applyMatrix4(rotationMatrix);
                cloneProfile.applyMatrix4(translationMatrix);

                positions.set(cloneProfile.array, cloneProfile.count * i * 3);
            }

            let fullProfileGeometry = new THREE.BufferGeometry();
            fullProfileGeometry.setAttribute(
                "position",
                new THREE.BufferAttribute(positions, 3)
            );
            let index = [];

            // Check if profile is open (from userData or check points)
            // Existing logic uses profile array from geometry
            const profilePos = profileGeometry.attributes.position;
            const pFirst = new THREE.Vector3(
                profilePos.getX(0),
                profilePos.getY(0),
                profilePos.getZ(0)
            );
            const pLast = new THREE.Vector3(
                profilePos.getX(profilePos.count - 1),
                profilePos.getY(profilePos.count - 1),
                profilePos.getZ(profilePos.count - 1)
            );
            const profileClosed = pFirst.distanceTo(pLast) < 0.001;

            let lastCorner =
                contourClosed == false ? contour.length - 1 : contour.length;
            for (let i = 0; i < lastCorner; i++) {
                // If profile is open, don't wrap last segment
                const lastProfileSegment = profileClosed
                    ? profile.count
                    : profile.count - 1;

                for (let j = 0; j < lastProfileSegment; j++) {
                    let currCorner = i;
                    let nextCorner = i + 1 == contour.length ? 0 : i + 1;
                    let currPoint = j;
                    let nextPoint = j + 1 == profile.count ? 0 : j + 1;

                    let a = nextPoint + profile.count * currCorner;
                    let b = currPoint + profile.count * currCorner;
                    let c = currPoint + profile.count * nextCorner;
                    let d = nextPoint + profile.count * nextCorner;

                    // Ensure consistent winding order for normals pointing outward
                    index.push(a, b, d);
                    index.push(b, c, d);
                }
            }

            // Add end caps if not openEnded
            if (!openEnded && !contourClosed) {
                // Use Earcut for proper triangulation (handles concave profiles)
                // Extract 2D profile coordinates
                const flatCoords = [];
                for (let j = 0; j < profile.count; j++) {
                    flatCoords.push(
                        profile.array[j * 3],
                        profile.array[j * 3 + 1]
                    );
                }

                // Triangulate using Earcut
                const triangles = Earcut(flatCoords, null, 2);

                // Add start cap triangles (at first contour point)
                for (let i = 0; i < triangles.length; i += 3) {
                    const a = triangles[i];
                    const b = triangles[i + 1];
                    const c = triangles[i + 2];
                    // Apply invertCaps to start cap
                    if (invertCaps) {
                        index.push(a, c, b);
                    } else {
                        index.push(a, b, c);
                    }
                }

                // Add end cap triangles (at last contour point)
                const lastContourOffset = (contour.length - 1) * profile.count;
                for (let i = 0; i < triangles.length; i += 3) {
                    const a = lastContourOffset + triangles[i];
                    const b = lastContourOffset + triangles[i + 1];
                    const c = lastContourOffset + triangles[i + 2];
                    // Apply invertCaps to end cap (opposite of start)
                    if (invertCaps) {
                        index.push(a, b, c);
                    } else {
                        index.push(a, c, b);
                    }
                }
            }

            fullProfileGeometry.setIndex(index);
            fullProfileGeometry.computeVertexNormals();
            fullProfileGeometry.normalizeNormals();

            return fullProfileGeometry;
        } catch (error) {
            this.log.error("Error in createProfiledContourGeometry:", error);
            // Fallback to simple box geometry
            return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    /**
     * Create a partial lathe (revolve) at a junction point based on angle between segments
     * Uses custom geometry generation with integrated end caps for watertight result
     * @param {THREE.Shape} profile - Profile to revolve
     * @param {THREE.Vector3} point - Junction point in 3D space
     * @param {THREE.Vector3} prevDir - Direction vector of previous segment (normalized)
     * @param {THREE.Vector3} nextDir - Direction vector of next segment (normalized)
     * @param {string|number} color - Color for the mesh
     * @param {number} cornerNumber - Corner number for logging (optional)
     * @param {boolean} isPartial - Create partial lathe (true) or full 360° lathe (false). Default: true
     * @param {Array<THREE.Vector2>} profilePoints - Pre-generated profile points (optional, for synchronization with extrusions)
     * @param {boolean} contourIsClockwise - Contour winding direction (true = clockwise, false = counter-clockwise)
     * @param {string} side - Panel side: 'top' or 'bottom' (default: 'top')
     * @param {boolean} isExtension - Whether this is an extension (for profile inversion)
     * @param {number} extensionHeight - Height of extension (zOffset) for positioning adjustments
     * @returns {Object|null} Object with mesh and metadata
     */
    createPartialLatheAtJunction(
        profile,
        point,
        prevDir,
        nextDir,
        color,
        cornerNumber = 0,
        isPartial = true,
        profilePoints = null,
        contourIsClockwise = false,
        side = "top",
        isExtension = false,
        extensionHeight = 0
    ) {
        try {
            // Get transformation flags based on side and extension type
            const flags = this._getGeometryTransformFlags(side, isExtension);

            // Create lathe profile with inversion if needed
            const lathePoints = this.createLatheHalfProfilePoints(
                profile,
                null,
                profilePoints,
                flags.invertLatheProfile
            );

            if (!lathePoints || lathePoints.length < 2) {
                this.log.warn(
                    "Not enough points for partial lathe at junction"
                );
                return null;
            }

            // 2D cross/dot to get signed angle between segments (robust for any polyline)
            const cross2d = prevDir.x * nextDir.y - prevDir.y * nextDir.x; // z-component
            const dot2d = prevDir.x * nextDir.x + prevDir.y * nextDir.y;
            const angleDiffRaw = Math.atan2(cross2d, dot2d); // signed in [-π, π]
            const angle = Math.abs(angleDiffRaw);

            // Map directions from XY plane into rotation angle
            // For a direction vector (dx, dy), the angle is atan2(dy, dx)
            // (positive Y for forward-facing lathe geometry)
            const prevAngleXZ = Math.atan2(prevDir.y, prevDir.x);
            const nextAngleXZ = Math.atan2(nextDir.y, nextDir.x);

            // Signed angle from previous direction to next direction
            let angleDiff = nextAngleXZ - prevAngleXZ;

            // Normalize to [-π, π] range to get shortest arc
            if (angleDiff > Math.PI) {
                angleDiff -= 2 * Math.PI;
            } else if (angleDiff < -Math.PI) {
                angleDiff += 2 * Math.PI;
            }

            // Determine geometry parameters
            let phiStart, phiLength;

            // Add small angular overlap to prevent gaps (about 0.5 degrees on each side)
            const angularOverlap = THREE.MathUtils.degToRad(0.5);

            // Always use the shortest arc (no long-path logic)
            if (angleDiff < 0) {
                // Negative angle: sweep backward on the short path, but rotate 180° to opposite quadrant
                phiStart = nextAngleXZ + Math.PI - angularOverlap;
                phiLength = -angleDiff + 2 * angularOverlap;
            } else {
                // Positive angle: sweep forward on the short path
                phiStart = prevAngleXZ - angularOverlap;
                phiLength = angleDiff + 2 * angularOverlap;
            }

            if (isPartial) {
                // PARTIAL LATHE: Corner rounding using signed angle
                this.log.info(
                    `Corner ${cornerNumber} (${color}) | ` +
                        `prevDir: (${prevDir.x.toFixed(2)}, ${prevDir.y.toFixed(
                            2
                        )}) → ${THREE.MathUtils.radToDeg(prevAngleXZ).toFixed(
                            1
                        )}° | ` +
                        `nextDir: (${nextDir.x.toFixed(2)}, ${nextDir.y.toFixed(
                            2
                        )}) → ${THREE.MathUtils.radToDeg(nextAngleXZ).toFixed(
                            1
                        )}° | ` +
                        `angleDiff: ${THREE.MathUtils.radToDeg(
                            angleDiff
                        ).toFixed(1)}° | ` +
                        `phiStart: ${THREE.MathUtils.radToDeg(phiStart).toFixed(
                            1
                        )}° | ` +
                        `phiLength: ${THREE.MathUtils.radToDeg(
                            phiLength
                        ).toFixed(1)}°`
                );
            } else {
                // FULL 360° LATHE
                phiStart = 0;
                phiLength = Math.PI * 2;

                this.log.info(
                    `Corner ${cornerNumber} (${color}) | Junction angle: ${THREE.MathUtils.radToDeg(
                        angle
                    ).toFixed(1)}° | FULL 360°`
                );
            }

            // Calculate segments based on the angle
            const segments = Math.max(
                8,
                Math.ceil(32 * (Math.abs(phiLength) / (Math.PI * 2)))
            );

            // Create complete lathe geometry with integrated end caps
            const finalGeometry = this.createLatheWithEndCaps(
                lathePoints,
                segments,
                phiStart,
                phiLength,
                isPartial,
                flags.invertLatheNormals,
                side,
                false // Lathe caps always use base winding (simplified)
            );

            if (!finalGeometry) {
                this.log.error("Failed to create lathe geometry with end caps");
                return null;
            }

            // Calculate Z translation with all transformations
            let translationZ = point.z;

            if (flags.invertPositionZ) {
                translationZ = -translationZ;
            }

            if (flags.addExtensionOffset) {
                translationZ += extensionHeight;
            }

            finalGeometry.translate(point.x, point.y, translationZ);

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#ffaa00"),
                roughness: 0.6,
                metalness: 0.1,
                side: THREE.FrontSide,
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mesh = new THREE.Mesh(finalGeometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.isPartialLathe = true;
            mesh.userData.angle = angle;
            mesh.userData.cornerNumber = cornerNumber;

            // Return mesh + angle metadata
            return {
                mesh,
                phiStart,
                phiLength,
                junctionPoint: point.clone(),
                angle,
                cornerNumber,
            };
        } catch (error) {
            this.log.error("Error creating partial lathe:", error.message);
            return null;
        }
    }

    /**
     * Create lathe geometry with end caps all in one geometry (watertight)
     * Vertices and triangles are generated with matching coordinates for perfect vertex sharing
     * @param {Array<THREE.Vector2>} profilePoints - Profile points (radius, height)
     * @param {number} segments - Number of angular segments
     * @param {number} phiStart - Start angle in radians
     * @param {number} phiLength - Angular extent in radians
     * @param {boolean} includeCaps - Whether to add end caps for partial lathes
     * @param {boolean} invertNormals - Whether to invert triangle winding (for extensions or bottom side)
     * @param {string} side - Panel side: 'top' or 'bottom' (default: 'top')
     * @param {boolean} invertCaps - Whether to invert caps separately (for TOP extensions)
     * @returns {THREE.BufferGeometry} Complete lathe geometry with caps
     */
    createLatheWithEndCaps(
        profilePoints,
        segments,
        phiStart,
        phiLength,
        includeCaps = true,
        invertNormals = false,
        side = "top",
        invertCaps = false
    ) {
        try {
            const vertices = [];
            const indices = [];
            const profileCount = profilePoints.length;

            // Step 1: Create shared axis vertices (one per axis point, shared across all segments)
            const axisVertexIndices = {}; // Maps profile index -> vertex index
            for (let j = 0; j < profileCount; j++) {
                if (Math.abs(profilePoints[j].x) < 0.0001) {
                    const vIdx = vertices.length / 3;
                    axisVertexIndices[j] = vIdx;
                    vertices.push(0, profilePoints[j].y, 0);
                }
            }

            // Step 2: Create non-axis vertices for each segment
            const segmentVertexBase = vertices.length / 3;
            const axisCount = Object.keys(axisVertexIndices).length;
            const nonAxisCount = profileCount - axisCount;

            for (let i = 0; i <= segments; i++) {
                const phi = phiStart + (i / segments) * phiLength;
                const cosPhi = Math.cos(phi);
                const sinPhi = Math.sin(phi);

                for (let j = 0; j < profileCount; j++) {
                    if (axisVertexIndices[j] !== undefined) continue; // Skip axis points

                    const p = profilePoints[j];
                    const x = p.x * sinPhi;
                    const y = p.y;
                    const z = p.x * cosPhi;
                    vertices.push(x, y, z);
                }
            }

            // Step 3: Helper to get vertex index for (segment, profile point)
            const getVertexIndex = (segmentIdx, profileIdx) => {
                if (axisVertexIndices[profileIdx] !== undefined) {
                    return axisVertexIndices[profileIdx];
                }
                // Count non-axis profile points before this one
                let nonAxisIdx = 0;
                for (let j = 0; j < profileIdx; j++) {
                    if (axisVertexIndices[j] === undefined) nonAxisIdx++;
                }
                return (
                    segmentVertexBase + segmentIdx * nonAxisCount + nonAxisIdx
                );
            };

            // Step 4: Create quads connecting consecutive angular rings
            for (let i = 0; i < segments; i++) {
                for (let j = 0; j < profileCount - 1; j++) {
                    const a = getVertexIndex(i, j);
                    const b = getVertexIndex(i + 1, j);
                    const c = getVertexIndex(i, j + 1);
                    const d = getVertexIndex(i + 1, j + 1);

                    // Two triangles per quad
                    // Invert winding order if normals need to be flipped (for inverted profile)
                    if (invertNormals) {
                        indices.push(a, c, b);
                        indices.push(b, c, d);
                    } else {
                        indices.push(a, b, c);
                        indices.push(b, d, c);
                    }
                }
            }

            // Step 5: Add end caps if partial lathe
            if (includeCaps && phiLength < 2 * Math.PI - 0.01) {
                // Use Earcut for proper triangulation (handles concave profiles)
                this.addEarcutCapsToLathe(
                    indices,
                    profilePoints,
                    segments,
                    getVertexIndex,
                    invertNormals,
                    invertCaps
                );
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(new Float32Array(vertices), 3)
            );
            geometry.setIndex(indices);

            // Rotate to match lathe orientation (Z becomes height axis)
            geometry.rotateX(Math.PI / 2);

            // Compute normals for proper lighting
            geometry.computeVertexNormals();
            geometry.normalizeNormals();

            return geometry;
        } catch (error) {
            this.log.error(
                "Error creating lathe with end caps:",
                error.message
            );
            return null;
        }
    }

    /**
     * Add properly triangulated caps using Earcut
     * Handles both convex and concave profiles correctly
     * Lathe caps always use consistent base winding (simplified from previous complex logic)
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Total number of angular segments
     * @param {Function} getVertexIndex - Function to get vertex index (segment, profileIdx)
     * @param {boolean} invertNormals - Whether to invert main geometry normals (unused for caps now)
     * @param {boolean} invertCaps - Whether to invert caps independently (unused - always false)
     */
    addEarcutCapsToLathe(
        indices,
        profilePoints,
        segments,
        getVertexIndex,
        invertNormals = false,
        invertCaps = false
    ) {
        const profileCount = profilePoints.length;

        // Prepare 2D coordinates for Earcut
        const flatCoords = [];
        for (let j = 0; j < profileCount; j++) {
            flatCoords.push(profilePoints[j].x, profilePoints[j].y);
        }

        // Triangulate the profile shape
        const triangles = Earcut(flatCoords, null, 2);

        // Add start cap triangles - base Earcut winding needs inversion
        for (let i = 0; i < triangles.length; i += 3) {
            const a = getVertexIndex(0, triangles[i]);
            const b = getVertexIndex(0, triangles[i + 1]);
            const c = getVertexIndex(0, triangles[i + 2]);
            indices.push(a, b, c);
        }

        // Add end cap triangles - opposite winding from start
        for (let i = 0; i < triangles.length; i += 3) {
            const a = getVertexIndex(segments, triangles[i]);
            const b = getVertexIndex(segments, triangles[i + 1]);
            const c = getVertexIndex(segments, triangles[i + 2]);
            indices.push(a, c, b);
        }
    }

    /**
     * Build lathe-ready half profile points from the bit profile shape.
     * Extracts the right half (x >= 0) of the profile and sorts by Y for proper revolve.
     * Returns points as Vector2 for LatheGeometry (x = distance from axis, y = height along axis)
     * @param {THREE.Shape} profile - The bit profile shape
     * @param {number} toolRadius - Tool radius hint (unused, kept for compatibility)
     * @returns {Array<THREE.Vector2>}
     */
    /**
     * Create half profile points for lathe from existing profile points
     * This ensures lathe and extrusion use the same points at junctions
     * @param {THREE.Shape} profile - Profile shape (for fallback)
     * @param {number} toolRadius - Tool radius (for fallback)
     * @param {Array<THREE.Vector2>} existingPoints - Optional: use these points instead of generating new ones
     * @returns {Array<THREE.Vector2>} Half profile points for lathe
     */
    createLatheHalfProfilePoints(
        profile,
        toolRadius,
        existingPoints = null,
        invertProfile = false
    ) {
        try {
            // If existing points provided, use them directly
            let fullProfile;
            if (existingPoints && existingPoints.length > 0) {
                fullProfile = existingPoints;
            } else {
                // Get all points from the profile shape
                fullProfile = profile.getPoints(64);
            }

            // Find center X and bottom Y (reference point is bottom-center)
            let sumX = 0,
                minY = Infinity,
                maxY = -Infinity;
            fullProfile.forEach((p) => {
                sumX += p.x;
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });
            const centerX = sumX / fullProfile.length;
            const baseY = minY; // Use bottom as reference, not center

            // Filter points on the right side (x >= centerX) and translate to bottom-center origin
            const rightHalf = fullProfile
                .map((p) => ({
                    x: p.x - centerX,
                    y: p.y - baseY, // Shift so bottom is at y=0
                    distFromCenter: Math.sqrt(
                        (p.x - centerX) ** 2 + (p.y - baseY) ** 2
                    ),
                }))
                .filter((p) => p.x >= -0.01) // Small tolerance for center line
                .sort((a, b) => a.y - b.y); // Sort by Y (bottom to top)

            if (rightHalf.length < 2) {
                this.log.warn(
                    "Not enough points for lathe profile, using fallback circle"
                );
                const r = toolRadius || 5;
                const pts = [];
                for (let i = 0; i <= 16; i++) {
                    const a = (i / 16) * Math.PI;
                    pts.push(
                        new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)
                    );
                }
                return pts;
            }

            // Convert to Vector2 with (x = distance from axis, y = height)
            // For extensions, invert Y so lathe grows in same direction as extrusions
            const lathePoints = rightHalf.map(
                (p) =>
                    new THREE.Vector2(Math.abs(p.x), invertProfile ? -p.y : p.y)
            );

            // Ensure profile touches the axis at start/end to avoid open lathe caps
            if (lathePoints.length >= 1) {
                if (lathePoints[0].x > 1e-4) {
                    lathePoints.unshift(new THREE.Vector2(0, lathePoints[0].y));
                }
                const last = lathePoints[lathePoints.length - 1];
                if (last.x > 1e-4) {
                    lathePoints.push(new THREE.Vector2(0, last.y));
                }
            }

            this.log.debug("Lathe profile points:", lathePoints.length);
            return lathePoints;
        } catch (e) {
            this.log.error("Error creating lathe profile:", e);
            // Fallback: simple circle
            const r = toolRadius || 5;
            const pts = [];
            for (let i = 0; i <= 16; i++) {
                const a = (i / 16) * Math.PI;
                pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
            }
            return pts;
        }
    }

    /**
     * Merge multiple extrude meshes into a single solid using CSG ADDITION
     * Combines all segment and lathe meshes into one unified geometry
     * @param {Array<THREE.Mesh>} meshes - Array of extrude meshes to merge
     * @returns {THREE.Mesh|null} Single merged mesh or null if merge fails
     */
    mergeExtrudeMeshes(meshes) {
        try {
            const meshesToMerge = (meshes || []).filter(Boolean);

            if (meshesToMerge.length === 0) {
                this.log.warn("No meshes to merge");
                return null;
            }

            if (meshesToMerge.length === 1) {
                // Only one mesh, return as-is
                this.log.debug("Only one mesh, returning directly");
                return meshesToMerge[0];
            }

            // Keep transforms in sync before matching/merging
            meshesToMerge.forEach((mesh) => mesh.updateMatrixWorld(true));

            // Nudge coincident vertices together to avoid naked edges
            const matchResults =
                this.edgeMatcher.matchMultipleMeshes(meshesToMerge);
            const matchedVerticesTotal = matchResults.reduce(
                (sum, r) => sum + r.matchedVertices,
                0
            );
            this.log.info("Edge alignment before merge:", {
                pairs: matchResults.length,
                matchedVertices: matchedVerticesTotal,
            });

            // Log detailed info about each mesh before merging
            this.log.info("Merging", meshesToMerge.length, "meshes:");
            meshesToMerge.forEach((mesh, idx) => {
                const geom = mesh.geometry;
                const bbox = new THREE.Box3().setFromObject(mesh);
                this.log.debug(`  Mesh ${idx}:`, {
                    vertices: geom.attributes.position.count,
                    isLathe: mesh.userData.isLatheJunction || false,
                    bboxSize: {
                        x: bbox.max.x - bbox.min.x,
                        y: bbox.max.y - bbox.min.y,
                        z: bbox.max.z - bbox.min.z,
                    },
                });
            });

            // Collect all geometries and ensure compatible attributes
            const geometries = meshesToMerge.map((mesh) => mesh.geometry);

            // Normalize all geometries to have consistent attributes
            // Remove UV attributes that may be incompatible
            const normalizedGeometries = geometries.map((geom, index) => {
                const normalized = geom.clone();
                normalized.applyMatrix4(meshesToMerge[index].matrixWorld);

                // Remove UV attribute if it exists (they may be incompatible across geometries)
                if (normalized.hasAttribute("uv")) {
                    normalized.deleteAttribute("uv");
                }

                // Remove UV2 attribute if it exists
                if (normalized.hasAttribute("uv2")) {
                    normalized.deleteAttribute("uv2");
                }

                return normalized;
            });

            this.log.debug(
                "Normalized",
                normalizedGeometries.length,
                "geometries for merging"
            );

            // Use BufferGeometryUtils to merge
            const mergedGeometry = mergeGeometries(normalizedGeometries);

            if (!mergedGeometry) {
                this.log.error("Failed to merge geometries");
                return null;
            }

            // Weld vertices after alignment to remove duplicate verts on shared edges
            const weldTolerance = this.edgeMatcher?.tolerance || 0.001;
            const weldedGeometry = mergeVertices(mergedGeometry, weldTolerance);
            const weldedCountDiff =
                mergedGeometry.attributes.position.count -
                weldedGeometry.attributes.position.count;
            if (weldedCountDiff > 0) {
                this.log.info("Welded vertices after merge", {
                    removed: weldedCountDiff,
                    tolerance: weldTolerance,
                });
            }

            // Ensure normals are computed correctly
            weldedGeometry.computeVertexNormals();
            weldedGeometry.normalizeNormals();

            // Create material for merged mesh
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.FrontSide,
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mergedMesh = new THREE.Mesh(weldedGeometry, material);
            mergedMesh.castShadow = true;
            mergedMesh.receiveShadow = true;
            mergedMesh.userData.isMergedExtrude = true;

            this.log.info(
                "Successfully merged",
                meshesToMerge.length,
                "meshes",
                {
                    matchedVertices: matchedVerticesTotal,
                }
            );
            return mergedMesh;
        } catch (error) {
            this.log.error("Error merging extrude meshes:", error.message);
            return null;
        }
    }

    /**
     * Check if a mesh is watertight (closed, no holes)
     * A mesh is watertight if every edge is shared by exactly 2 triangles
     * @param {THREE.Mesh} mesh - Mesh to check
     * @returns {boolean} True if mesh is watertight
     */
    isMeshWatertight(mesh) {
        try {
            const geometry = mesh.geometry;
            if (!geometry || !geometry.index) {
                this.log.warn("Geometry has no index buffer");
                return false;
            }

            const indices = geometry.index.array;
            const edgeMap = new Map();

            // Process each triangle
            for (let i = 0; i < indices.length; i += 3) {
                const v0 = indices[i];
                const v1 = indices[i + 1];
                const v2 = indices[i + 2];

                // Check all three edges
                this._addEdge(edgeMap, v0, v1);
                this._addEdge(edgeMap, v1, v2);
                this._addEdge(edgeMap, v2, v0);
            }

            // Check if all edges are shared by exactly 2 triangles
            let openEdges = 0;
            let totalEdges = 0;
            for (const [edge, count] of edgeMap) {
                totalEdges++;
                if (count !== 2) {
                    openEdges++;
                }
            }

            const watertight = openEdges === 0;
            if (!watertight) {
                this.log.debug(
                    `Mesh has ${openEdges} open edges out of ${totalEdges} total edges`
                );
            }

            return watertight;
        } catch (error) {
            this.log.error("Error checking mesh watertight:", error.message);
            return false;
        }
    }

    /**
     * Clamp miter value to prevent extreme values
     * @private
     */
    _clampMiter(value) {
        return Math.max(-this.miterLimit, Math.min(this.miterLimit, value));
    }

    /**
     * Normalize angle to range [-PI, PI]
     * @private
     */
    _normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    /**
     * Calculate safe angle between two vectors with epsilon check
     * @private
     */
    _safeAngleBetween(v1, v2) {
        const v1Len = v1.length();
        const v2Len = v2.length();

        if (v1Len < this.epsilon || v2Len < this.epsilon) {
            return 0;
        }

        v1 = v1.clone().normalize();
        v2 = v2.clone().normalize();

        let angle = Math.atan2(v2.y, v2.x) - Math.atan2(v1.y, v1.x);

        if (Math.abs(angle) < this.angleEpsilon) {
            return 0;
        }

        return this._normalizeAngle(angle);
    }

    /**
     * Analyze geometry for gaps and discontinuities
     * @public
     */
    analyzeGeometryGaps(geometry, profileCount, contourCount) {
        if (!geometry || !geometry.attributes.position) {
            return { error: "Invalid geometry" };
        }

        const positions = geometry.attributes.position.array;
        const tolerance = 0.01;
        let maxGap = 0;
        let gapCount = 0;
        let totalGapDistance = 0;
        const gaps = [];

        for (let i = 0; i < contourCount; i++) {
            const nextIdx = (i + 1) % contourCount;

            const currX = positions[i * profileCount * 3];
            const currY = positions[i * profileCount * 3 + 1];
            const currZ = positions[i * profileCount * 3 + 2];

            const nextX = positions[nextIdx * profileCount * 3];
            const nextY = positions[nextIdx * profileCount * 3 + 1];
            const nextZ = positions[nextIdx * profileCount * 3 + 2];

            const gap = Math.sqrt(
                Math.pow(nextX - currX, 2) +
                Math.pow(nextY - currY, 2) +
                Math.pow(nextZ - currZ, 2)
            );

            if (gap > tolerance) {
                gapCount++;
                totalGapDistance += gap;
                gaps.push({
                    fromIndex: i,
                    toIndex: nextIdx,
                    gap: gap,
                    position: { x: currX, y: currY, z: currZ }
                });

                if (gap > maxGap) {
                    maxGap = gap;
                }
            }
        }

        const firstX = positions[0];
        const firstY = positions[1];
        const firstZ = positions[2];
        const lastStartIdx = (contourCount - 1) * profileCount * 3;
        const lastX = positions[lastStartIdx];
        const lastY = positions[lastStartIdx + 1];
        const lastZ = positions[lastStartIdx + 2];
        const closureGap = Math.sqrt(
            Math.pow(firstX - lastX, 2) +
            Math.pow(firstY - lastY, 2) +
            Math.pow(firstZ - lastZ, 2)
        );

        const analysis = {
            maxGap,
            gapCount,
            avgGap: gapCount > 0 ? totalGapDistance / gapCount : 0,
            totalGapDistance,
            closureGap,
            tolerance,
            hasGaps: gapCount > 0,
            isClosed: closureGap < tolerance * 2,
            gaps: gaps.slice(0, 10)
        };

        return analysis;
    }

    /**
     * Test extrusion precision with problematic scenario
     * @public
     */
    testPrecision(profileWidth = 20, profileHeight = 10, arcRadius = null) {
        this.log.info(`Testing extrusion precision with:`, {
            profileWidth,
            profileHeight,
            arcRadius: arcRadius || profileWidth
        });

        const profileShape = new THREE.Shape();
        profileShape.moveTo(0, 0);
        profileShape.lineTo(profileWidth, 0);
        profileShape.lineTo(profileWidth, profileHeight);
        profileShape.lineTo(0, profileHeight);
        profileShape.lineTo(0, 0);

        const radius = arcRadius !== null ? arcRadius : profileWidth;
        const arcLength = Math.PI * radius * 0.5;

        const contour = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(50, 0, 0),
            new THREE.Vector3(50 + radius, radius, 0),
            new THREE.Vector3(50, 2 * radius, 0),
            new THREE.Vector3(0, 2 * radius, 0)
        ];

        const arcSegments = 32;
        const detailedContour = [];
        detailedContour.push(contour[0]);
        detailedContour.push(contour[1]);

        for (let i = 0; i <= arcSegments; i++) {
            const t = i / arcSegments;
            const angle = 0 + (Math.PI / 2) * t;
            const x = 50 + radius * Math.cos(angle);
            const y = radius + radius * Math.sin(angle);
            detailedContour.push(new THREE.Vector3(x, y, 0));
        }

        detailedContour.push(contour[3]);
        detailedContour.push(contour[4]);

        const geometry = this.createProfiledContourGeometry(
            profileShape,
            detailedContour,
            false,
            true,
            32,
            false,
            "top"
        );

        const analysis = this.analyzeGeometryGaps(
            geometry,
            4,
            detailedContour.length
        );

        this.log.info(`Precision test results:`, analysis);

        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true
        });
        const mesh = new THREE.Mesh(geometry, material);

        return {
            geometry,
            analysis,
            mesh,
            profileShape,
            contour: detailedContour
        };
    }

    /**
     * Get current precision settings for console debugging
     * @public
     */
    getPrecisionInfo() {
        return {
            miterLimit: this.miterLimit,
            description: "Maximum allowed miter shift (prevents extreme spikes)",
            epsilon: this.epsilon,
            angleEpsilon: this.angleEpsilon,
            descriptionEpsilon: "Minimum angle in radians to treat as straight line",
            examples: {
                "Angle 0.01°": (0.01 * Math.PI / 180).toFixed(10),
                "Angle 0.001°": (0.001 * Math.PI / 180).toFixed(10),
                "Current threshold": this.angleEpsilon.toFixed(10)
            },
            commands: [
                `window.extrusionBuilder.miterLimit = ${this.miterLimit}`,
                `window.extrusionBuilder.angleEpsilon = ${this.angleEpsilon}`,
                `window.extrusionBuilder.testPrecision()`
            ]
        };
    }

    /**
     * Compute curvature information for each point in a contour
     * @private
     */
    _computeContourCurvature(contour, contourClosed, curvatureThreshold = 1000) {
        const curvatureData = [];

        for (let i = 0; i < contour.length; i++) {
            const idxPrev = (i - 1 + contour.length) % contour.length;
            const idxNext = (i + 1) % contour.length;
            const idxNextNext = (i + 2) % contour.length;

            const pPrev = contour[idxPrev];
            const pCurr = contour[i];
            const pNext = contour[idxNext];
            const pNextNext = contour[idxNextNext];

            const x0 = pPrev.x, y0 = pPrev.y;
            const x1 = pCurr.x, y1 = pCurr.y;
            const x2 = pNext.x, y2 = pNext.y;

            const result = this._circleThroughThreePoints(x0, y0, x1, y1, x2, y2);

            if (!result || result.radius === Infinity || result.radius > curvatureThreshold) {
                curvatureData.push({
                    isArc: false,
                    curvature: 0,
                    radius: Infinity,
                    center: new THREE.Vector2(x1, y1),
                    tangent: new THREE.Vector2(x2 - x0, y2 - y0).normalize(),
                    normal: new THREE.Vector2(-(y2 - y0), x2 - x0).normalize()
                });
            } else {
                curvatureData.push({
                    isArc: true,
                    curvature: 1.0 / result.radius,
                    radius: result.radius,
                    center: result.center,
                    tangent: this._arcTangentAtPoint(result.center, result.radius, new THREE.Vector2(x1, y1), new THREE.Vector2(x2, y2)),
                    normal: this._arcNormalAtPoint(result.center, result.radius, new THREE.Vector2(x1, y1))
                });
            }
        }

        return curvatureData;
    }

    /**
     * Compute circle that passes through three points
     * @private
     */
    _circleThroughThreePoints(x0, y0, x1, y1, x2, y2) {
        const x01 = x1 - x0;
        const y01 = y1 - y0;
        const x12 = x2 - x1;
        const y12 = y2 - y1;

        const mx01 = (x0 + x1) / 2;
        const my01 = (y0 + y1) / 2;
        const mx12 = (x1 + x2) / 2;
        const my12 = (y1 + y2) / 2;

        let a01, b01, a12, b12;

        if (Math.abs(y01) < this.epsilon) {
            a01 = 0; b01 = 1;
        } else if (Math.abs(x01) < this.epsilon) {
            a01 = 1; b01 = 0;
        } else {
            a01 = x01 / y01;
            b01 = my01 - a01 * mx01;
        }

        if (Math.abs(y12) < this.epsilon) {
            a12 = 0; b12 = 1;
        } else if (Math.abs(x12) < this.epsilon) {
            a12 = 1; b12 = 0;
        } else {
            a12 = x12 / y12;
            b12 = my12 - a12 * mx12;
        }

        if (Math.abs(a01 - a12) < this.epsilon && Math.abs(b01 - b12) < this.epsilon) {
            return null;
        }

        const denom = a12 - a01;
        if (Math.abs(denom) < this.epsilon) {
            return null;
        }

        const cx = (b12 - b01) / denom;
        const cy = (a01 * b12 - a12 * b01) / denom;

        const radius = Math.sqrt(Math.pow(x1 - cx, 2) + Math.pow(y1 - cy, 2));

        if (radius < this.epsilon || !isFinite(radius)) {
            return null;
        }

        return {
            center: new THREE.Vector2(cx, cy),
            radius: radius
        };
    }

    /**
     * Compute tangent vector at a point on an arc
     * @private
     */
    _arcTangentAtPoint(center, radius, p1, p2) {
        const radiusVec = new THREE.Vector2().subVectors(p1, center);
        const radiusLen = radiusVec.length();

        if (radiusLen < this.epsilon) {
            return new THREE.Vector2().subVectors(p2, p1).normalize();
        }

        const toNext = new THREE.Vector2().subVectors(p2, p1).normalize();
        const cross = radiusVec.x * toNext.y - radiusVec.y * toNext.x;

        let tangent = new THREE.Vector2(-radiusVec.y, radiusVec.x).normalize();

        if (cross < 0) {
            tangent = new THREE.Vector2(radiusVec.y, -radiusVec.x).normalize();
        }

        return tangent;
    }

    /**
     * Compute normal vector pointing toward curvature center at a point
     * @private
     */
    _arcNormalAtPoint(center, radius, point) {
        const normal = new THREE.Vector2().subVectors(center, point);
        return normal.normalize();
    }

    /**
     * Helper to add edge to edge map
     * @private
     */
    _addEdge(edgeMap, v1, v2) {
        // Normalize edge direction (smaller index first)
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.log.info("Disposed");
    }
}
