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
        this.curveSegmentCoefficient = 0.2; // segments per mm
        this.curveSegmentMin = 16;
        this.curveSegmentMax = 64;

        // Arc approximation coefficient: samples = arcLength / coefficient
        // Same as ThreeModule.arcDivisionCoefficient for consistency
        // Can be changed from console: extrusionBuilder.arcDivisionCoefficient = 5
        this.arcDivisionCoefficient = 5; // 1 sample point per 5mm of arc length

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
     * @param {Array} segments - Array of segments from parseSVGElement
     * @param {number} offsetX - X offset for positioning
     * @param {number} offsetY - Y offset for positioning
     * @param {function} transformY - Optional Y coordinate transform function
     * @returns {Array<THREE.Curve>} Array of THREE.js curve objects
     */
    segmentsToCurves(segments, offsetX = 0, offsetY = 0, transformY = null) {
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
            // From front surface inward
            z3d = depth - panelThickness / 2;
        } else if (panelAnchor === "bottom-left") {
            // From back surface inward
            z3d = depth + panelThickness / 2;
        } else {
            // Default to front
            z3d = -depth;
        }

        return new THREE.Vector3(x3d, y3d, z3d);
    }

    /**
     * Create path visualization for debugging
     * Shows the exact path as a colored line
     */
    createPathVisualization(curve, color) {
        try {
            // Get points from the curve
            const points = curve.getPoints(200); // Get 200 points along the path

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
                "points"
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
    createExtensionProfile(width, height = 1) {
        const halfWidth = width / 2;

        // Create shape with bottom-center at origin (like bit profiles)
        // Extend slightly below (0.1) for better boolean operations
        const shape = new THREE.Shape();
        shape.moveTo(0, -0.001);
        shape.lineTo(halfWidth, -0.001);
        shape.lineTo(halfWidth, height);
        shape.lineTo(-halfWidth, height);
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
     * Extrude profile along path
     * @param {THREE.Shape} profile - The profile shape to extrude
     * @param {THREE.Curve} curve - The path curve to extrude along
     * @param {string|number} color - Color for the mesh material
     * @returns {THREE.Mesh} The extruded mesh with profilePoints in userData
     */
    extrudeAlongPath(profile, curve, color) {
        try {
            // Calculate adaptive curve segments based on profile complexity
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

            // Log adaptive segmentation
            this.log.debug("Adaptive curve segments:", {
                curveSegments,
                profilePointsCount: profilePoints.length,
            });

            // Build grouped path like round extrusion, then merge all groups into one continuous path
            let samplingPath = curve;
            let curveGroups = [];
            if (curve && curve.curves && Array.isArray(curve.curves)) {
                curveGroups = this.groupCurves(curve.curves);
                // Log detailed diagnostics for mitered extrusion
                this.logCurveGroupDiagnostics(
                    curveGroups,
                    curve.curves,
                    "MITERED"
                );

                const mergedPath = new THREE.CurvePath();
                for (const g of curveGroups) {
                    for (const c of g.curves) {
                        mergedPath.add(c);
                    }
                }
                samplingPath = mergedPath;
            }

            // Get contour points from the merged path
            // For LineCurve3: minimal points; otherwise dense sampling
            let segments;
            if (samplingPath instanceof THREE.LineCurve3) {
                segments = 1;
            } else {
                const curveLength = samplingPath.getLength();
                segments = Math.max(200, Math.ceil(curveLength / 0.5));
            }
            const contourPoints = samplingPath.getPoints(segments);

            this.log.debug("Contour sampling:", {
                curveLength: samplingPath.getLength
                    ? samplingPath.getLength()
                    : "N/A",
                segments,
                contourPointsCount: contourPoints.length,
            });

            // Convert Vector3 to Vector2 for ProfiledContourGeometry
            let contour = contourPoints.map(
                (p) => new THREE.Vector3(p.x, p.y, p.z)
            );

            // Check for any corrupted points in contour
            let corruptedCount = 0;
            for (let i = 0; i < contour.length; i++) {
                const p = contour[i];
                if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
                    corruptedCount++;
                    if (corruptedCount <= 3) {
                        this.log.warn(
                            `  Corrupted contour point at index ${i}: (${p.x}, ${p.y}, ${p.z})`
                        );
                    }
                }
            }
            if (corruptedCount > 0) {
                this.log.warn(
                    `  Total corrupted points: ${corruptedCount} / ${contour.length}`
                );
            }

            // Check continuity of contour points (detect breaks in mitered extrusion)
            let contourGaps = [];
            let maxGap = 0;
            let avgGap = 0;
            let gapSum = 0;
            for (let i = 1; i < contour.length; i++) {
                const prevPoint = contour[i - 1];
                const curPoint = contour[i];
                const gap = prevPoint.distanceTo(curPoint);
                gapSum += gap;
                if (gap > maxGap) maxGap = gap;
                // Large jumps indicate a break in the path
                if (gap > 0.1) {
                    // > 0.1mm is suspicious
                    contourGaps.push({
                        index: i,
                        gap: gap,
                        from: {
                            x: prevPoint.x,
                            y: prevPoint.y,
                            z: prevPoint.z,
                        },
                        to: { x: curPoint.x, y: curPoint.y, z: curPoint.z },
                    });
                }
            }
            avgGap = gapSum / Math.max(1, contour.length - 1);

            if (contourGaps.length > 0) {
                this.log.warn(
                    `Mitered extrusion: Detected ${
                        contourGaps.length
                    } gaps in contour path (max=${maxGap.toFixed(
                        6
                    )}mm, avg=${avgGap.toFixed(6)}mm)`
                );
                contourGaps.slice(0, 3).forEach((gap) => {
                    this.log.warn(
                        `  At point ${gap.index}: gap=${gap.gap.toFixed(
                            6
                        )}mm from (${gap.from.x.toFixed(
                            2
                        )}, ${gap.from.y.toFixed(2)}, ${gap.from.z.toFixed(
                            2
                        )}) to (${gap.to.x.toFixed(2)}, ${gap.to.y.toFixed(
                            2
                        )}, ${gap.to.z.toFixed(2)})`
                    );
                    // Check for NaN or Infinity
                    const hasNaN =
                        isNaN(gap.to.x) || isNaN(gap.to.y) || isNaN(gap.to.z);
                    const hasInfinity =
                        !isFinite(gap.to.x) ||
                        !isFinite(gap.to.y) ||
                        !isFinite(gap.to.z);
                    if (hasNaN || hasInfinity) {
                        this.log.warn(`    ^ Contains NaN or Infinity!`);
                    }
                });
                this.log.warn(
                    `  Total contour length: ${contour.length} points`
                );
            }

            // Determine if the path is closed
            // Check if first and last points are close enough
            const firstPoint = contour[0];
            const lastPoint = contour[contour.length - 1];
            const contourClosed = firstPoint.distanceTo(lastPoint) < 0.01;

            // For closed contours, remove the duplicate last point
            if (contourClosed && contour.length > 1) {
                contour = contour.slice(0, -1);
            }

            this.log.debug("Extruding with mitered corners:", {
                profilePoints: profilePoints.length,
                contourPoints: contour.length,
                contourClosed,
                curveLength: samplingPath.getLength(),
            });

            // Use ProfiledContourGeometry for mitered corners
            // openEnded = false means add end caps for open paths
            const geometry = this.createProfiledContourGeometry(
                profile,
                contour,
                contourClosed,
                false, // openEnded - false means create closed ends
                curveSegments // Use same curve segments as profile generation
            );

            // Check if geometry was created successfully
            if (!geometry) {
                throw new Error("Failed to create ProfiledContourGeometry");
            }

            // Log geometry info before modifications
            this.log.debug("ProfiledContourGeometry created:", {
                vertices: geometry.attributes.position.count,
                hasNormals: !!geometry.attributes.normal,
                hasUV: !!geometry.attributes.uv,
                indexCount: geometry.index ? geometry.index.count : 0,
            });

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.FrontSide, // Only render front faces for proper shading
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Store profile points in userData for lathe synchronization
            mesh.userData.profilePoints = profilePoints;

            this.log.debug("Mitered extrusion mesh created:", {
                vertices: mesh.geometry.attributes.position.count,
                triangles: mesh.geometry.index
                    ? mesh.geometry.index.count / 3
                    : 0,
                boundingBox: mesh.geometry.boundingBox,
                profilePoints: profilePoints.length,
            });

            return [mesh]; // Return array for consistency with extrudeAlongPathRound
        } catch (error) {
            this.log.error("Error extruding along path:", error.message);
            this.log.error("Error stack:", error.stack);
            return [];
        }
    }

    /**
     * Create profiled contour geometry with mitered corners
     * Based on https://jsfiddle.net/prisoner849/bygy1xkt/
     * @param {THREE.Shape} profileShape - Profile shape
     * @param {Array<THREE.Vector3>} contour - Contour points
     * @param {boolean} contourClosed - Whether contour is closed
     * @param {boolean} openEnded - Whether to leave ends open (default: false = add caps)
     * @param {number} curveSegments - Number of segments per curve (default: 32)
     */
    createProfiledContourGeometry(
        profileShape,
        contour,
        contourClosed,
        openEnded,
        curveSegments = 32
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
            });

            let profileGeometry = new THREE.ShapeGeometry(
                profileShape,
                curveSegments
            );
            profileGeometry.rotateX(-Math.PI * 0.5);
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
                let angle = v2.angle() - v1.angle();
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

                let shift = Math.tan(hA - Math.PI * 0.5);
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

            let lastCorner =
                contourClosed == false ? contour.length - 1 : contour.length;
            for (let i = 0; i < lastCorner; i++) {
                for (let j = 0; j < profile.count; j++) {
                    let currCorner = i;
                    let nextCorner = i + 1 == contour.length ? 0 : i + 1;
                    let currPoint = j;
                    let nextPoint = j + 1 == profile.count ? 0 : j + 1;

                    let a = nextPoint + profile.count * currCorner;
                    let b = currPoint + profile.count * currCorner;
                    let c = currPoint + profile.count * nextCorner;
                    let d = nextPoint + profile.count * nextCorner;

                    // Ensure consistent winding order for normals pointing outward
                    index.push(a, d, b);
                    index.push(b, d, c);
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
                    // Normal winding for start cap
                    index.push(a, b, c);
                }

                // Add end cap triangles (at last contour point)
                const lastContourOffset = (contour.length - 1) * profile.count;
                for (let i = 0; i < triangles.length; i += 3) {
                    const a = lastContourOffset + triangles[i];
                    const b = lastContourOffset + triangles[i + 1];
                    const c = lastContourOffset + triangles[i + 2];
                    // Reversed winding for end cap
                    index.push(a, c, b);
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
     * Extrude with round (revolved) corners: mitered base extrusion minus lathe bounding boxes, then union with lathes
     * Returns a single merged mesh suitable for downstream CSG operations
     * @param {THREE.Shape} profile
     * @param {THREE.CurvePath} path
     * @param {string|number} color
     * @returns {THREE.Mesh|null}
     */
    /**
     * Extrude with round (revolved) corners: mitered base extrusion minus lathe bounding boxes, then union with lathes
     * Returns a single merged mesh suitable for downstream CSG operations
     * @param {THREE.Shape} profile
     * @param {string|THREE.CurvePath} pathOrString - SVG path string (after arc approximation) OR Three.js CurvePath
     * @param {string|number} color
     * @param {object} [options] - Optional params: { partFrontX, partFrontY, partFrontWidth, partFrontHeight, depth, panelThickness, panelAnchor }
     * @returns {THREE.Mesh|null}
     */
    extrudeAlongPathRound(profile, pathOrString, color, options = {}) {
        try {
            let path;

            // Check if pathOrString is a string (SVG path data)
            if (typeof pathOrString === "string") {
                this.log.info("=== SVG PATH PARSING FOR ROUND EXTRUSION ===");
                this.log.info(`Path data length: ${pathOrString.length} chars`);

                // Parse SVG path to curves (with segmentType flags: LINE, ARC, CUBIC_BEZIER, etc.)
                const pathCurves = this.parsePathToCurves(pathOrString);

                if (pathCurves.length === 0) {
                    this.log.warn("No curves parsed from SVG path");
                    return null;
                }

                this.log.info(`Parsed ${pathCurves.length} curves from SVG`);

                // DIAGNOSTIC: Check segmentType flags
                const segmentTypeCounts = {};
                pathCurves.forEach((curve) => {
                    const type = curve.segmentType || "UNKNOWN";
                    segmentTypeCounts[type] =
                        (segmentTypeCounts[type] || 0) + 1;
                });
                this.log.info("Segment types:", segmentTypeCounts);

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

                this.log.info(
                    `Created 3D curve with ${path.curves.length} curves`
                );
            } else {
                // pathOrString is already a CurvePath
                path = pathOrString;
                this.log.info(
                    `Using provided CurvePath with ${path.curves.length} curves`
                );
            }

            // Calculate adaptive curve segments based on profile complexity
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

            // Log adaptive segmentation
            this.log.debug("Adaptive curve segments:", {
                curveSegments,
                profilePointsCount: profilePoints.length,
            });

            // Get path segments (curves) directly
            if (!path.curves || path.curves.length === 0) {
                this.log.warn("Round extrusion: No curves in path");
                return null;
            }

            // DIAGNOSTIC LOG: Check segmentType flags on curves
            this.log.info("=== SVG SEGMENTS DIAGNOSTIC ===");
            this.log.info(`Total curves: ${path.curves.length}`);
            const segmentTypeCounts = {};
            path.curves.forEach((curve, idx) => {
                const type = curve.segmentType || "UNKNOWN";
                segmentTypeCounts[type] = (segmentTypeCounts[type] || 0) + 1;
                if (idx < 5 || idx > path.curves.length - 3) {
                    // Log first 5 and last 3 curves
                    this.log.info(
                        `  Curve ${idx}: type=${
                            curve.constructor.name
                        }, segmentType=${
                            curve.segmentType || "NOT_SET"
                        }, length=${curve.getLength().toFixed(2)}`
                    );
                }
            });
            this.log.info(`Segment type distribution:`, segmentTypeCounts);
            this.log.info("=== END DIAGNOSTIC ===");

            // Group curves using shared logic
            const curveGroups = this.groupCurves(path.curves);

            // Log detailed diagnostics for round extrusion
            this.logCurveGroupDiagnostics(curveGroups, path.curves, "ROUND");

            // Check if path is closed (first and last points are close)
            let isClosedPath = false;
            let contourIsClockwise = false; // Determine contour winding direction

            if (path.curves.length > 0) {
                const firstCurve = path.curves[0];
                const lastCurve = path.curves[path.curves.length - 1];
                const firstPoint = firstCurve.getPoint(0);
                const lastPoint = lastCurve.getPoint(1);
                const closureGap = firstPoint.distanceTo(lastPoint);
                isClosedPath = closureGap < 0.01; // Consider closed if gap < 0.01mm

                // Determine winding direction using signed area (shoelace formula)
                if (isClosedPath) {
                    let signedArea = 0;
                    for (const curve of path.curves) {
                        const p1 = curve.getPoint(0);
                        const p2 = curve.getPoint(1);
                        signedArea += (p2.x - p1.x) * (p2.y + p1.y);
                    }
                    contourIsClockwise = signedArea > 0;
                }
            }

            // Create meshes for each group
            const allMeshes = [];
            const junctionPoints = [];

            // Для junctions: lathe всегда на стыке между группами (после каждой группы, кроме последней, и между последней и первой если контур замкнут)
            for (
                let groupIndex = 0;
                groupIndex < curveGroups.length;
                groupIndex++
            ) {
                const group = curveGroups[groupIndex];
                // Sample curves in this group
                const contourPoints = [];
                for (const curve of group.curves) {
                    const curveLength = curve.getLength();
                    let samples = 1;

                    const points = curve.getPoints(samples);
                    if (contourPoints.length === 0) {
                        contourPoints.push(...points);
                    } else {
                        const lastPoint =
                            contourPoints[contourPoints.length - 1];
                        if (lastPoint.distanceTo(points[0]) < 0.01) {
                            contourPoints.push(...points.slice(1));
                        } else {
                            contourPoints.push(...points);
                        }
                    }
                }

                // Добавить junction после каждой группы (кроме последней), и между последней и первой если контур замкнут
                if (groupIndex < curveGroups.length - 1) {
                    junctionPoints.push({
                        point: contourPoints[contourPoints.length - 1].clone(),
                        groupIndex: groupIndex,
                    });
                } else if (isClosedPath && curveGroups.length > 1) {
                    // Последний стык — между последней и первой группой
                    junctionPoints.push({
                        point: contourPoints[contourPoints.length - 1].clone(),
                        groupIndex: groupIndex,
                        closesContour: true,
                    });
                }

                // Detect gaps between groups
                if (groupIndex > 0 && contourPoints.length > 0) {
                    const prevGroup = curveGroups[groupIndex - 1];
                    const allPrevGroupPoints = [];
                    for (const curve of prevGroup.curves) {
                        const curveLength = curve.getLength();
                        let samples;
                        if (prevGroup.type === "LINE") {
                            samples = 1;
                        } else if (prevGroup.type === "ARC") {
                            samples = Math.max(
                                2,
                                Math.ceil(
                                    curveLength / this.arcDivisionCoefficient
                                )
                            );
                        } else {
                            samples = Math.max(
                                2,
                                Math.ceil(
                                    curveLength / this.arcDivisionCoefficient
                                )
                            );
                        }
                        const points = curve.getPoints(samples);
                        if (allPrevGroupPoints.length === 0) {
                            allPrevGroupPoints.push(...points);
                        } else {
                            const lastPoint =
                                allPrevGroupPoints[
                                    allPrevGroupPoints.length - 1
                                ];
                            if (lastPoint.distanceTo(points[0]) < 0.01) {
                                allPrevGroupPoints.push(...points.slice(1));
                            } else {
                                allPrevGroupPoints.push(...points);
                            }
                        }
                    }

                    if (allPrevGroupPoints.length > 0) {
                        const prevLastPoint =
                            allPrevGroupPoints[allPrevGroupPoints.length - 1];
                        const curFirstPoint = contourPoints[0];
                        const groupGap =
                            prevLastPoint.distanceTo(curFirstPoint);
                        if (groupGap > 0.01) {
                            this.log.warn(
                                `Round extrusion: Gap between group ${
                                    groupIndex - 1
                                } and ${groupIndex}: ${groupGap.toFixed(6)}mm`,
                                {
                                    prevPoint: {
                                        x: prevLastPoint.x,
                                        y: prevLastPoint.y,
                                        z: prevLastPoint.z,
                                    },
                                    curPoint: {
                                        x: curFirstPoint.x,
                                        y: curFirstPoint.y,
                                        z: curFirstPoint.z,
                                    },
                                }
                            );
                        }
                    }
                }

                // Check if this group forms a closed path
                const firstPoint = contourPoints[0];
                const lastPoint = contourPoints[contourPoints.length - 1];
                const groupClosed = firstPoint.distanceTo(lastPoint) < 0.01;

                // Create geometry for this group
                const geometry = this.createProfiledContourGeometry(
                    profile,
                    contourPoints,
                    groupClosed,
                    false, // openEnded = false (WITH caps)
                    curveSegments
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
                this.log.debug(
                    "Creating partial lathe corners at junctions:",
                    junctionPoints.length
                );
                for (let i = 0; i < junctionPoints.length; i++) {
                    const junction = junctionPoints[i];
                    const groupIndex = junction.groupIndex;
                    let currentGroup, nextGroup;
                    if (junction.closesContour) {
                        currentGroup = curveGroups[groupIndex];
                        nextGroup = curveGroups[0];
                    } else {
                        currentGroup = curveGroups[groupIndex];
                        nextGroup = curveGroups[groupIndex + 1];
                    }
                    if (!currentGroup || !nextGroup) continue;
                    // last curve of current group
                    const lastCurve =
                        currentGroup.curves[currentGroup.curves.length - 1];
                    // first curve of next group
                    const firstCurve = nextGroup.curves[0];
                    // directions
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
                    // Partial lathe
                    const latheResult = this.createPartialLatheAtJunction(
                        profile,
                        junction.point,
                        prevDir,
                        nextDir,
                        color,
                        i,
                        true,
                        null,
                        contourIsClockwise
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

            if (allMeshes.length === 0) {
                this.log.warn("No meshes created from curve groups");
                return null;
            }

            this.log.info("Grouped extrusion built:", {
                groups: curveGroups.length,
                meshes: allMeshes.length,
                totalVertices: allMeshes.reduce(
                    (sum, m) => sum + m.geometry.attributes.position.count,
                    0
                ),
            });

            // Return array of meshes
            return allMeshes;
        } catch (error) {
            this.log.error("Error in extrudeAlongPathRound:", error.message);
            return null;
        }
    }

    /**
     * Create a lathe (revolve) at a junction point
     * @param {THREE.Shape} profile - Profile to revolve
     * @param {THREE.Vector3} point - Junction point in 3D space
     * @returns {THREE.Mesh|null}
     */
    createLatheAtPoint(profile, point) {
        try {
            const lathePoints = this.createLatheHalfProfilePoints(
                profile,
                null
            );

            if (!lathePoints || lathePoints.length < 2) {
                this.log.warn("Not enough points for lathe at junction");
                return null;
            }

            // Create lathe geometry - simple revolve without caps for now
            const latheGeometry = new THREE.LatheGeometry(
                lathePoints,
                32,
                0,
                Math.PI * 2
            );

            // Rotate 90 degrees to align properly with path
            latheGeometry.rotateX(-Math.PI / 2);

            // Position at junction point
            latheGeometry.translate(point.x, point.y, point.z);

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color("#ffaa00"),
                roughness: 0.6,
                metalness: 0.1,
                side: THREE.FrontSide,
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mesh = new THREE.Mesh(latheGeometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.isLatheJunction = true;

            return mesh;
        } catch (error) {
            this.log.error("Error creating lathe at point:", error.message);
            return null;
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
        contourIsClockwise = false
    ) {
        try {
            const lathePoints = this.createLatheHalfProfilePoints(
                profile,
                null,
                profilePoints // Pass pre-generated points
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

            // Map directions from XY plane into XZ plane used by lathe (y->z)
            const prevAngleXZ = Math.atan2(prevDir.x, prevDir.y); // atan2(x, y) => angle in XZ
            // Determine geometry parameters
            let phiStart, phiLength;

            // Normalize sweep to positive to keep normals consistent; shift start if needed
            let angleDiff = angleDiffRaw;
            if (angleDiff < 0) {
                phiLength = -angleDiff;
                phiStart = prevAngleXZ + angleDiff; // shift to preserve arc placement
            } else {
                phiLength = angleDiff;
                phiStart = prevAngleXZ;
            }

            if (isPartial) {
                // PARTIAL LATHE: Corner rounding using signed angle
                this.log.info(
                    `Corner ${cornerNumber} (${color}) | ` +
                        `prevAngleXZ: ${THREE.MathUtils.radToDeg(
                            prevAngleXZ
                        ).toFixed(1)}° | ` +
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
                isPartial
            );

            if (!finalGeometry) {
                this.log.error("Failed to create lathe geometry with end caps");
                return null;
            }

            // Position at junction point
            finalGeometry.translate(point.x, point.y, point.z);

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
     * @returns {THREE.BufferGeometry} Complete lathe geometry with caps
     */
    createLatheWithEndCaps(
        profilePoints,
        segments,
        phiStart,
        phiLength,
        includeCaps = true
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
                    indices.push(a, b, c);
                    indices.push(b, d, c);
                }
            }

            // Step 5: Add end caps if partial lathe
            if (includeCaps && phiLength < 2 * Math.PI - 0.01) {
                // Use Earcut for proper triangulation (handles concave profiles)
                this.addEarcutCapsToLathe(
                    indices,
                    profilePoints,
                    segments,
                    getVertexIndex
                );
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(new Float32Array(vertices), 3)
            );
            geometry.setIndex(indices);

            // Rotate to match lathe orientation (Z becomes height axis)
            geometry.rotateX(-Math.PI / 2);

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
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Total number of angular segments
     * @param {Function} getVertexIndex - Function to get vertex index (segment, profileIdx)
     */
    addEarcutCapsToLathe(indices, profilePoints, segments, getVertexIndex) {
        const profileCount = profilePoints.length;

        // Prepare 2D coordinates for Earcut
        const flatCoords = [];
        for (let j = 0; j < profileCount; j++) {
            flatCoords.push(profilePoints[j].x, profilePoints[j].y);
        }

        // Triangulate the profile shape
        const triangles = Earcut(flatCoords, null, 2);

        // Add start cap triangles
        // Normal should point in -phi direction (backward along rotation)
        for (let i = 0; i < triangles.length; i += 3) {
            const a = getVertexIndex(0, triangles[i]);
            const b = getVertexIndex(0, triangles[i + 1]);
            const c = getVertexIndex(0, triangles[i + 2]);
            // Same winding as Earcut output
            indices.push(a, b, c);
        }

        // Add end cap triangles
        // Normal should point in +phi direction (forward along rotation)
        for (let i = 0; i < triangles.length; i += 3) {
            const a = getVertexIndex(segments, triangles[i]);
            const b = getVertexIndex(segments, triangles[i + 1]);
            const c = getVertexIndex(segments, triangles[i + 2]);
            // Reversed winding from Earcut output
            indices.push(a, c, b);
        }
    }

    /**
     * Add end caps using THREE.ShapeGeometry for proper triangulation
     * @param {Array<number>} vertices - Vertex array
     * @param {Array<number>} indices - Index array
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Number of segments
     * @param {number} phiStart - Start angle
     * @param {number} phiLength - Angular extent
     */
    addShapeGeometryCaps(
        vertices,
        indices,
        profilePoints,
        segments,
        phiStart,
        phiLength
    ) {
        const profileCount = profilePoints.length;
        const startBaseIdx = 0;
        const endBaseIdx = segments * profileCount;

        // Create shape from profile points
        const shape = new THREE.Shape();
        shape.moveTo(profilePoints[0].x, profilePoints[0].y);
        for (let i = 1; i < profileCount; i++) {
            shape.lineTo(profilePoints[i].x, profilePoints[i].y);
        }
        // Close the shape back to start
        shape.lineTo(profilePoints[0].x, profilePoints[0].y);

        // Generate triangulation using ShapeGeometry
        const shapeGeo = new THREE.ShapeGeometry(shape);
        const shapeIndices = shapeGeo.index.array;

        // Add triangles for start cap (using existing vertices)
        for (let i = 0; i < shapeIndices.length; i += 3) {
            const a = startBaseIdx + shapeIndices[i];
            const b = startBaseIdx + shapeIndices[i + 1];
            const c = startBaseIdx + shapeIndices[i + 2];
            indices.push(a, c, b); // Reversed winding
        }

        // Add triangles for end cap (using existing vertices)
        for (let i = 0; i < shapeIndices.length; i += 3) {
            const a = endBaseIdx + shapeIndices[i];
            const b = endBaseIdx + shapeIndices[i + 1];
            const c = endBaseIdx + shapeIndices[i + 2];
            indices.push(a, b, c); // Normal winding
        }

        shapeGeo.dispose();
    }

    /**
     * Add connections along axis between all segments
     * For each axis point, create triangles connecting it across segments
     * This closes the "seam" along the axis for partial lathes
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Total number of angular segments
     */

    addAxisConnections(indices, profilePoints, segments) {
        const profileCount = profilePoints.length;

        // Find all axis points (points where radius ≈ 0)
        const axisPointIndices = [];
        for (let j = 0; j < profileCount; j++) {
            if (Math.abs(profilePoints[j].x) < 0.0001) {
                axisPointIndices.push(j);
            }
        }

        // For each axis point, connect it across all segments
        for (const axisIdx of axisPointIndices) {
            // Find the adjacent non-axis point
            let adjacentIdx = -1;
            if (axisIdx === 0) {
                // First point is on axis, next point should be off-axis
                adjacentIdx = axisIdx + 1;
            } else if (axisIdx === profileCount - 1) {
                // Last point is on axis, previous point should be off-axis
                adjacentIdx = axisIdx - 1;
            }

            if (adjacentIdx === -1) continue;

            // Create triangles from axis to adjacent point across all segments
            for (let i = 0; i < segments; i++) {
                const axisA = i * profileCount + axisIdx;
                const axisB = (i + 1) * profileCount + axisIdx;
                const adjA = i * profileCount + adjacentIdx;
                const adjB = (i + 1) * profileCount + adjacentIdx;

                // Create two triangles to close the quad
                // Winding depends on whether axis is at start or end
                if (axisIdx === 0) {
                    // Bottom axis - normal winding
                    indices.push(axisA, adjA, axisB);
                    indices.push(axisB, adjA, adjB);
                } else {
                    // Top axis - reversed winding
                    indices.push(axisA, axisB, adjA);
                    indices.push(axisB, adjB, adjA);
                }
            }
        }
    }

    /**
     * Adds triangulated end caps using Earcut library
     * Creates proper triangulated faces for the start and end of partial lathe
     * @param {Array<number>} vertices - Vertex array (already contains all lathe vertices)
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points
     * @param {number} segments - Total number of angular segments
     * @param {number} phiStart - Start angle in radians
     * @param {number} phiLength - Angular extent in radians
     */
    addLatheEndCapsWithEarcut(
        vertices,
        indices,
        profilePoints,
        segments,
        phiStart,
        phiLength
    ) {
        const profileCount = profilePoints.length;

        // CAP 1: At phiStart (first segment, indices 0 to profileCount-1)
        this.addEarcutCap(
            vertices,
            indices,
            profilePoints,
            0, // baseIndex for first segment
            phiStart,
            true // isStart
        );

        // CAP 2: At phiStart + phiLength (last segment, indices segments*profileCount to (segments+1)*profileCount-1)
        this.addEarcutCap(
            vertices,
            indices,
            profilePoints,
            segments * profileCount, // baseIndex for last segment
            phiStart + phiLength,
            false // isEnd
        );
    }

    /**
     * Add a single triangulated end cap using Earcut
     * @param {Array<number>} vertices - Vertex array (contains 3D coordinates)
     * @param {Array<number>} indices - Index array to append to
     * @param {Array<THREE.Vector2>} profilePoints - Profile points in 2D
     * @param {number} baseIndex - Starting index for this segment's vertices
     * @param {number} phi - Angle for this cap
     * @param {boolean} isStart - Whether this is the start cap (affects winding)
     */
    addEarcutCap(vertices, indices, profilePoints, baseIndex, phi, isStart) {
        const profileCount = profilePoints.length;

        // Create simple triangle fan from first point (axis) to all others
        // This closes the cap by creating triangles between consecutive profile points
        for (let i = 1; i < profileCount - 1; i++) {
            const a = baseIndex; // First point (on axis)
            const b = baseIndex + i;
            const c = baseIndex + i + 1;

            // Wind triangles consistently - opposite for start vs end
            if (isStart) {
                indices.push(a, c, b); // Reversed winding for start cap
            } else {
                indices.push(a, b, c); // Normal winding for end cap
            }
        }

        // Add one more triangle to close the last edge (from first axis point to last axis point)
        // This triangle uses the first non-axis point
        const firstAxis = baseIndex; // Point 0
        const lastAxis = baseIndex + profileCount - 1; // Point 17
        const firstNonAxis = baseIndex + 1; // Point 1

        if (isStart) {
            indices.push(firstAxis, firstNonAxis, lastAxis);
        } else {
            indices.push(firstAxis, lastAxis, firstNonAxis);
        }
    }

    /**
     * Analyze and debug boundary edges of a geometry
     * Shows which vertices form the boundary
     * @param {THREE.BufferGeometry} geometry - Geometry to analyze
     * @param {string} label - Label for logging
     */
    debugBoundaryEdges(geometry, label = "Geometry") {
        try {
            const geom = geometry.index ? geometry : geometry.toNonIndexed();
            const index = geom.index.array;
            const positions = geom.attributes.position.array;
            const edgeCount = new Map();
            const edges = [];

            const addEdge = (a, b) => {
                const key = a < b ? `${a}_${b}` : `${b}_${a}`;
                edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
                if (
                    !edges.find(
                        (e) =>
                            (e.a === a && e.b === b) || (e.a === b && e.b === a)
                    )
                ) {
                    edges.push({ a, b });
                }
            };

            for (let i = 0; i < index.length; i += 3) {
                const a = index[i],
                    b = index[i + 1],
                    c = index[i + 2];
                addEdge(a, b);
                addEdge(b, c);
                addEdge(c, a);
            }

            const boundaryVertices = new Set();
            for (const [edge, count] of edgeCount) {
                if (count === 1) {
                    const [a, b] = edge.split("_").map(Number);
                    boundaryVertices.add(a);
                    boundaryVertices.add(b);
                }
            }

            this.log.info(`${label} boundary analysis:`, {
                totalVertices: positions.length / 3,
                boundaryVertices: boundaryVertices.size,
                boundaryEdges: edgeCount.size,
            });

            if (boundaryVertices.size > 0) {
                const samples = Array.from(boundaryVertices).slice(0, 3);
                this.log.info(`Sample boundary vertices:`, {
                    count: boundaryVertices.size,
                    samples: samples.map((i) => ({
                        idx: i,
                        x: positions[i * 3],
                        y: positions[i * 3 + 1],
                        z: positions[i * 3 + 2],
                    })),
                });
            }

            return {
                boundaryVertices: Array.from(boundaryVertices),
                totalEdges: edgeCount.size,
                boundaryEdgeCount: Array.from(edgeCount.values()).filter(
                    (c) => c === 1
                ).length,
            };
        } catch (e) {
            this.log.error("debugBoundaryEdges failed:", e);
            return null;
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
    createLatheHalfProfilePoints(profile, toolRadius, existingPoints = null) {
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

            this.log.debug("Profile reference:", {
                centerX,
                baseY,
                minY,
                maxY,
                points: fullProfile.length,
                usingExistingPoints: !!existingPoints,
            });

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
            const lathePoints = rightHalf.map(
                (p) => new THREE.Vector2(Math.abs(p.x), p.y)
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
