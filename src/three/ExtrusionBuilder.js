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
import { calculateOffsetFromPathData } from "../operations/CustomOffsetProcessor.js";
import { getRepairInstance } from "../utils/meshRepair.js";
import { appConfig } from "../config/AppConfig.js";
import MeshEdgeMatcher from "./utils/MeshEdgeMatcher.js";
import { ensureOutwardNormals } from "./utils/GeometryNormalOrientation.js";

const EXTRUSION_CONSTANTS = {
    DEGENERATE_CURVE_THRESHOLD: 0.001,
    MIN_GROUP_LENGTH: 0.01,
    PATH_GAP_TOLERANCE: 0.001,
    PATH_CLOSURE_TOLERANCE: 0.01,
    AREA_EPSILON: 1e-10,
    VOLUME_EPSILON: 1e-6,
    PROFILE_CACHE_MAX_SIZE: 50,
    MICRO_ANGLE_DEG: 2,
    MICRO_VERTEX_MERGE_TOLERANCE: 1.0,
};

// Add three-mesh-bvh extensions to BufferGeometry
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

/**
 * ExtrusionBuilder
 * Handles all extrusion-related geometry creation:
 * - SVG path parsing to Three.js curves
 * - Bit profile creation from SVG or fallback shapes
 * - Profiled contour geometry with miter corners
 * - Path visualization for debugging
 */
export default class ExtrusionBuilder {
    constructor() {
        this.log = LoggerFactory.createLogger("ExtrusionBuilder");
        this.materialManager = null;
        this.csgEngine = null;
        this.edgeMatcher = new MeshEdgeMatcher(0.001);

        // Public configuration for adaptive curve segmentation
        this.curveSegmentCoefficient = 0.5; // segments per mm
        this.curveSegmentMin = 16;
        this.curveSegmentMax = 64;

        // Arc and lathe approximation coefficients (adjustable from console)
        this.arcDivisionCoefficient = 5; // Arc/curve sampling: 1 point per 5mm
        this.latheDivisionCoefficient = 0.5; // Lathe sampling: 1 segment per 0.5mm arc length
        this.arcAngleStep = 5; // Degrees per segment for Arc (A) commands
        this.arcSegmentationMode = 'length'; // 'length' or 'angle'
        this.profileOverlap = 0.01; // Overlap added to profile width to prevent gaps (mm)
        this.profilePointsCache = new Map();

        this.log.info("Created");
    }

    _safeExecute(operationName, fn, fallbackValue) {
        try {
            return fn();
        } catch (error) {
            this.log.error(`${operationName} failed`, error);
            return fallbackValue;
        }
    }

    _logOperationResult(operation, payload = {}) {
        this.log.info(`[ExtrusionBuilder] ${operation}`, payload);
    }

    _ensureFiniteNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    _getProfileCacheKey(profile, pointsCount, mode = "full") {
        const id = profile?.uuid || profile?.id || "profile";
        return `${id}:${mode}:${pointsCount}`;
    }

    _getCachedProfilePoints(profile, pointsCount, mode = "full") {
        const key = this._getProfileCacheKey(profile, pointsCount, mode);
        const cached = this.profilePointsCache.get(key);
        if (cached) {
            return cached.map((p) => new THREE.Vector2(p.x, p.y));
        }

        const points = profile.getPoints(pointsCount);
        this._setCachedProfilePoints(key, points);
        return points;
    }

    _setCachedProfilePoints(key, points) {
        const serialized = points.map((p) => ({ x: p.x, y: p.y }));
        this.profilePointsCache.set(key, serialized);

        while (this.profilePointsCache.size > EXTRUSION_CONSTANTS.PROFILE_CACHE_MAX_SIZE) {
            const oldestKey = this.profilePointsCache.keys().next().value;
            this.profilePointsCache.delete(oldestKey);
        }
    }

    _validateProfile(profile) {
        if (!profile || typeof profile.getPoints !== "function") {
            throw new Error("Invalid profile: profile.getPoints() is required");
        }
        const sample = profile.getPoints(16);
        if (!Array.isArray(sample) || sample.length < 3) {
            throw new Error("Invalid profile: less than 3 points");
        }
        const area = this._computeSignedArea2D(sample);
        if (Math.abs(area) < EXTRUSION_CONSTANTS.AREA_EPSILON) {
            this.log.warn("Profile has near-zero area", { area });
        }
    }

    _validatePathInput(pathOrString) {
        if (typeof pathOrString === "string") {
            const p = pathOrString.trim();
            if (!p) throw new Error("Path string is empty");
            return;
        }

        if (!pathOrString || !pathOrString.curves || pathOrString.curves.length === 0) {
            throw new Error("Invalid path: expected non-empty CurvePath or SVG path string");
        }
    }

    _validateExtrudeInputs(profile, path, options = {}) {
        this._validateProfile(profile);
        this._validatePathInput(path);
        if (options && options.side && options.side !== "top" && options.side !== "bottom") {
            this.log.warn(`Unknown side option '${options.side}', expected 'top' or 'bottom'`);
        }
    }

    _isPathClosed(path) {
        if (!path || !path.curves || path.curves.length === 0) return false;
        if (path.closed === true || path.autoClose === true) return true;

        const firstCurve = path.curves[0];
        const lastCurve = path.curves[path.curves.length - 1];
        const firstPoint = firstCurve.getPoint(0);
        const lastPoint = lastCurve.getPoint(1);
        const closureGap = firstPoint.distanceTo(lastPoint);

        return closureGap < EXTRUSION_CONSTANTS.PATH_CLOSURE_TOLERANCE;
    }

    /**
     * Log detailed diagnostics for grouped curves: segment types, lengths, sample points, degenerate detection.
     * Shared between miter and round extrusions.
     * @param {Array} curveGroups - Array of {type, groupName, curves}
     * @param {Array} originalCurves - Original ungrouped curves (for before/after comparison)
     * @param {string} extrusionType - "MITER" or "ROUND" for context
     */
    logCurveGroupDiagnostics(
        curveGroups,
        originalCurves,
        extrusionType = "UNKNOWN",
    ) {
        this.log.info(`=== ${extrusionType} EXTRUSION DIAGNOSTICS ===`);
        this.log.info(
            `Original curves: ${originalCurves.length}, After grouping: ${curveGroups.length} groups`,
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
                        Math.ceil(len / this.arcDivisionCoefficient),
                    );
                }
            });

            this.log.info(
                `Group #${idx + 1} [${group.groupName}] - ${group.curves.length
                } curves, ~${estimatedPoints} sample points (length=${totalLength.toFixed(
                    1,
                )}mm)`,
            );

            // Log each curve in the group
            group.curves.forEach((curve, cidx) => {
                const start = curve.getPoint(0);
                const end = curve.getPoint(1);
                const len = curve.getLength();
                const degenerate = len < 1e-6;
                this.log.info(
                    `  Curve ${cidx + 1}: start=(${start.x.toFixed(
                        4,
                    )},${start.y.toFixed(4)}) end=(${end.x.toFixed(
                        4,
                    )},${end.y.toFixed(4)}) length=${len.toFixed(6)}${degenerate ? " [DEGENERATE]" : ""
                    }`,
                );
                if (degenerate) {
                    this.log.warn(
                        `    [DEGENERATE SEGMENT] Group ${idx + 1} Curve ${cidx + 1
                        } is zero-length and may cause artifacts.`,
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
                    contourIsClockwise ? "CLOCKWISE" : "COUNTER-CLOCKWISE",
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
        const DEGENERATE_THRESHOLD = EXTRUSION_CONSTANTS.DEGENERATE_CURVE_THRESHOLD;
        const filtered = (pathCurves || []).filter((curve) => {
            try {
                const length = curve.getLength();
                if (length < DEGENERATE_THRESHOLD) {
                    this.log &&
                        this.log.debug &&
                        this.log.debug(
                            `Filtered out degenerate curve: length=${length.toFixed(
                                6,
                            )}mm`,
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
        const MIN_GROUP_LENGTH = EXTRUSION_CONSTANTS.MIN_GROUP_LENGTH;
        const validGroups = groups.filter((group) => {
            const totalLength = group.curves.reduce(
                (sum, curve) => sum + curve.getLength(),
                0,
            );
            if (totalLength < MIN_GROUP_LENGTH) {
                this.log &&
                    this.log.debug &&
                    this.log.debug(
                        `Filtered out degenerate group [${group.groupName}]: ${group.curves.length
                        } curves, length=${totalLength.toFixed(6)}mm`,
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
                100 / this.arcDivisionCoefficient,
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
                100 / coefficient,
            )} samples per 100mm)`,
        );
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
                "parseSVGElementToPoints: missing svgElement or exportModule",
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
            `parseSVGElementToPoints: Got ${segments.length} segments from ${svgElement.tagName}`,
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
                        segment.start,
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
            `Parsed ${svgElement.tagName} to ${points.length} points`,
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
                pathData.substring(0, 100),
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
                                new THREE.Vector3(x, y, 0),
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
                                new THREE.Vector3(x, currentY, 0),
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
                                new THREE.Vector3(currentX, y, 0),
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
                                new THREE.Vector3(x, y, 0),
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
                                            6,
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
                                        },
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
                                new THREE.Vector3(x, y, 0),
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
                                    Math.max(-1, Math.min(1, dot / len)),
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
                            let numPoints;
                            if (this.arcSegmentationMode === 'angle') {
                                // Angle-based segmentation (consistent across radii)
                                const angleDeg = THREE.MathUtils.radToDeg(Math.abs(deltaAngle));
                                numPoints = Math.max(
                                    2,
                                    Math.ceil(angleDeg / (this.arcAngleStep || 5))
                                );
                            } else {
                                // Arc-length based segmentation (smoother for large radii) - DEFAULT
                                const arcLen = Math.abs(
                                    deltaAngle * ((rxAbs + ryAbs) / 2),
                                );
                                numPoints = Math.max(
                                    16,
                                    Math.ceil(arcLen / this.arcDivisionCoefficient),
                                );
                            }
                            
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
                                    0,
                                );
                                const arcLine = new THREE.LineCurve3(
                                    prevPoint,
                                    nextPoint,
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
                                new THREE.Vector3(startX, startY, 0),
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
            `parsePathToCurves: Created ${curves.length} curves from ${commands?.length || 0
            } commands`,
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
        contourOffset = 0,
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
                        contourOffset,
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
                        contourOffset,
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
                        contourOffset,
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
                        contourOffset,
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
                        contourOffset,
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
                        contourOffset,
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
                        contourOffset,
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
                        contourOffset,
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
                        contourOffset,
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
                        `2D curve gap detected between curves ${i - 1
                        } and ${i}: ${gap2D.toFixed(6)}`,
                        {
                            prevEnd: { x: prevEnd.x, y: prevEnd.y },
                            curStart: { x: curStart.x, y: curStart.y },
                        },
                    );
                }
            }
        }

        // Create exact path using the curves
        // Connect endpoints to avoid gaps - critical for miter extrusions
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
                // This ensures continuous path for miter extrusions
                if (gap > gapTolerance) {
                    this.log.debug(
                        `Adding connector between curves ${i - 1
                        } and ${i}, gap: ${gap.toFixed(6)}mm`,
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
                        6,
                    )}mm`,
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
        contourOffset = 0,
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
                `(side=${side})`,
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
        const profileSource = bitData.profileSvg || bitData.profilePath;
        if (profileSource) {
            try {
                // Support both a plain SVG path `d` string (current format) and a
                // future SVG fragment that already contains element tags like
                // <circle>, <rect>, etc.  Detect by looking for the first non-
                // whitespace character: if it's '<' we have an SVG fragment.
                const _pc = (profileSource ?? '').trimStart();
                const profileContent = _pc.startsWith('<') ? _pc : `<path d="${_pc}"/>`;
                const svgString = `<svg xmlns="http://www.w3.org/2000/svg">${profileContent}</svg>`;
                const dataUrl = "data:image/svg+xml;base64," + btoa(svgString);
                const loader = new SVGLoader();

                return new Promise((resolve, reject) => {
                    loader.load(
                        dataUrl,
                        (data) => {
                            const shapes = SVGLoader.createShapes(
                                data.paths[0],
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
                        },
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
            totalLength * this.curveSegmentCoefficient,
        );
        const result = calculated; // Math.max(this.curveSegmentMin, Math.min(this.curveSegmentMax, calculated));

        return result;
    }

    /**
     * UNIFIED CONSTRUCTOR: Extrude profile along path with optional lathe corners
     * Single method for all extrusion types: bits, extensions, phantom bits
     * @param {THREE.Shape} profile - Profile shape to extrude
     * @param {THREE.CurvePath|string} path - 3D CurvePath (for 'miter') or SVG path string (for 'round')
     * @param {string|number} color - Mesh color
     * @param {number} zOffset - Z offset to apply to all meshes after creation (default: 0)
     * @param {string} type - Extrusion type: 'miter' (sharp corners) or 'round' (half-profile with lathe corners)
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
        type = "miter",
        side = "top",
        options = {},
        pathModifier = null,
    ) {
        return this._safeExecute("extrudeAlongPath", () => {
            this._validateExtrudeInputs(profile, path, options);
            let modifiedPath = path;

            // Apply path modification if specified
            if (
                pathModifier &&
                (pathModifier.offset !== undefined || pathModifier.cornerStyle)
            ) {
                modifiedPath = this._modifyPathWithOffset(
                    path,
                    Number(pathModifier.offset ?? 0),
                    pathModifier.cornerStyle || "miter",
                    options,
                );

                if (!modifiedPath) {
                    modifiedPath = path;
                }
            }

            let meshes = [];

            if (type === "miter") {
                // MITER: Sharp corners, merged path
                meshes = this._extrudeMiter(
                    profile,
                    modifiedPath,
                    color,
                    side,
                    options,
                );
            } else if (type === "round") {
                // ROUND: Half-profile extrusion with partial lathe at junctions
                meshes = this._extrudeRound(
                    profile,
                    modifiedPath,
                    color,
                    side,
                    {
                        ...options,
                        zOffset,
                    },
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
                            panelAnchor,
                        );
                    }
                }

                // Create and add path visualization
                if (visualCurve) {
                    const pathLine = this.createPathVisualization(
                        visualCurve,
                        color,
                        side,
                    );
                    if (pathLine) {
                        meshes.unshift(pathLine); // Add line at the beginning
                    }
                }
            }

            this._logOperationResult("extrudeAlongPath:success", {
                type,
                side,
                meshCount: meshes.length,
                hasPathVisualization: options.pathVisual !== false,
            });

            return meshes;
        }, []);
    }

    /**
     * Modify path using offset
     * For SVG paths: uses custom offset
     * For THREE.js CurvePath: not supported (return original)
     * @private
     * @param {THREE.CurvePath|string} path - Original path
     * @param {number} offset - Offset distance (positive = outward, negative = inward)
     * @param {string} cornerStyle - Corner style: 'round' or 'bevel' (default: 'round')
     * @returns {THREE.CurvePath|string|null} Modified path or null if conversion fails
     */
    _modifyPathWithOffset(path, offset, cornerStyle = "round", options = {}) {
        try {
            this.log.info("_modifyPathWithOffset called:", {
                pathType:
                    typeof path === "string"
                        ? "string"
                        : path?.constructor?.name,
                offset,
                cornerStyle,
            });

            if (offset === 0) {
                this.log.debug("Offset is 0, returning original path");
                return path;
            }

            if (typeof path === "string") {
                this.log.debug("Handling SVG path string with custom offset");
                return this._modifySVGPathWithOffset(
                    path,
                    offset,
                    cornerStyle,
                    options,
                );
            }

            if (path instanceof THREE.CurvePath) {
                this.log.warn(
                    "THREE.js CurvePath offset not supported, use SVG path string instead",
                );
                return path;
            }

            this.log.warn("Path modification: unsupported path type", typeof path);
            return null;
        } catch (error) {
            this.log.error("Error in _modifyPathWithOffset:", error);
            return null;
        }
    }

    /**
     * Modify SVG path string using custom offset
     * @private
     */
    _modifySVGPathWithOffset(svgPathString, offset, cornerStyle, options = {}) {
        try {
            const exportModule =
                options?.exportModule ||
                window?.dependencyContainer?.get?.("export") ||
                window?.app?.container?.get?.("export");

            const basePath = String(svgPathString ?? "").trim();
            const normalizedJoin =
                cornerStyle === "round" ? "round" : "sharp";
            const offsetOptions = {
                offsetSignMode: "direct",
                // CustomOffsetProcessor accepts only "sharp" | "round" joins.
                // Treat miter/bevel requests as sharp to preserve hard corners.
                join: normalizedJoin,
                cap: "butt",
                limit: 10,
                useArcApproximation: true,
                exportModule,
                forceReverseOutput: window?.forceReverseOffset !== false,
                trimSelfIntersections: true,
            };

            const runOffset = (dist) =>
                calculateOffsetFromPathData(basePath, dist, offsetOptions);

            const isUsable = (candidate, { requireChanged = true } = {}) => {
                if (typeof candidate !== "string") return false;
                const c = candidate.trim();
                if (!c) return false;
                if (requireChanged && c === basePath) return false;
                try {
                    return this.parsePathToCurves(c).length > 0;
                } catch (_) {
                    return false;
                }
            };

            // Winding-independent offset: positive = inward, negative = outward,
            // regardless of whether the path is drawn CW or CCW.
            //
            // CustomOffsetProcessor convention: positive offset = inward for CW paths
            // (standard SVG facade contours drawn clockwise on screen).
            // For CCW paths (area < 0 in standard shoelace), the direction is inverted,
            // so we negate the offset to restore the inward/outward meaning.
            const svgPathArea = (() => {
                try {
                    const rawCurves = this.parsePathToCurves(basePath);
                    if (!rawCurves?.length) return 1; // assume CW
                    const pts = [];
                    for (const c of rawCurves) {
                        const n = Math.max(2, Math.min(8, Math.ceil((c.getLength?.() ?? 0) / 20)));
                        c.getPoints(n).forEach((p) => {
                            if (!pts.length || pts[pts.length - 1].distanceTo(p) > 0.01) {
                                pts.push(p);
                            }
                        });
                    }
                    return this._computeSignedArea2D(pts);
                } catch (_) {
                    return 1; // assume CW on error
                }
            })();
            // CW (area > 0): pass offset as-is → inward for positive
            // CCW (area < 0): negate offset → positive still = inward
            const windingAdjustedOffset = svgPathArea < 0 ? -offset : offset;

            if (!exportModule?.dxfExporter?.parseSVGPathSegments) {
                this.log.warn("Path modifier: exportModule/dxf parser unavailable");
            }

            const direct = runOffset(windingAdjustedOffset);
            if (isUsable(direct, { requireChanged: true })) return direct;

            // Last-resort fallback: try original unadjusted sign (covers edge cases
            // where area computation is unreliable, e.g., self-intersecting paths).
            if (Math.abs(Number(offset) || 0) > 1e-9) {
                const fallback = runOffset(-windingAdjustedOffset);
                if (isUsable(fallback, { requireChanged: true })) {
                    this.log.warn(
                        "Offset winding correction used fallback sign",
                        { offset, windingAdjustedOffset, svgPathArea },
                    );
                    return fallback;
                }
            }

            if (isUsable(direct, { requireChanged: false })) {
                this.log.warn("Custom offset produced no geometric change");
                return direct;
            }

            this.log.warn("Custom offset failed, returning original SVG");
            return svgPathString;
        } catch (error) {
            this.log.error("Error modifying SVG path:", error);
            return svgPathString;
        }
    }

    /**
     * Internal: Create miter extrusion (sharp corners, merged path)
     * @private
     */
    _extrudeMiter(profile, curveOrString, color, side = "top", options = {}) {
        return this._safeExecute("_extrudeMiter", () => {
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
                    panelAnchor,
                );
            } else {
                // curveOrString is already a CurvePath
                curve = curveOrString;
            }

            // Calculate adaptive curve segments based on profile complexity
            const curveSegments = this.calculateAdaptiveCurveSegments(profile);
            const profilePointsRaw = this._normalizeClosedProfilePointsWinding(
                profile.getPoints(curveSegments),
            );

            // Apply overlap scaling to profile points to prevent gaps
            if (this.profileOverlap > 0 && profilePointsRaw.length > 0) {
                let minX = Infinity;
                let maxX = -Infinity;
                for (const p of profilePointsRaw) {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                }

                const width = maxX - minX;
                if (width > 1e-6) {
                    const centerX = (minX + maxX) / 2;
                    const halfWidth = width / 2;
                    const scaleFactor =
                        (halfWidth + this.profileOverlap) / halfWidth;

                    for (const p of profilePointsRaw) {
                        p.x = centerX + (p.x - centerX) * scaleFactor;
                    }
                    this.log.debug(
                        `Applied profile overlap scale: ${scaleFactor.toFixed(4)} (width: ${width.toFixed(2)} -> ${(width + this.profileOverlap * 2).toFixed(2)})`,
                    );
                }
            }

            const profilePoints = [];
            const geometryPoints = []; // Raw points for geometry generation (scaled)
            const isExtension = !!options.isExtension;
            const isTopExtension = isExtension && side === "top";
            for (let i = 0; i < profilePointsRaw.length; i++) {
                const x = Number(profilePointsRaw[i].x ?? 0);
                const rawY = Number(profilePointsRaw[i].y ?? 0);
                
                // Store raw scaled points for geometry generation
                geometryPoints.push(new THREE.Vector2(x, rawY));

                let y = rawY;
                if (isTopExtension) {
                    y = -y; // Invert Y for top side extensions
                }
                profilePoints.push(
                    new THREE.Vector2(x, y),
                );
            }

            // Build per-group contours, apply arc endpoint trimming, then assemble.
            // This is the same pipeline as _extrudeRound, enabling unified arc
            // endpoint chord enforcement for miter corners.
            let curveGroups = [];
            if (curve && curve.curves && Array.isArray(curve.curves)) {
                curveGroups = this.groupCurves(curve.curves);
            }

            const contourClosed = this._isPathClosed(curve);

            let contour;
            if (curveGroups.length > 0) {
                // Sample each group individually
                const groupContours = curveGroups.map((g) =>
                    this._sampleCurvesToContour(g.curves),
                );

                // Apply arc endpoint trimming (same rule as round extrusion)
                const bitRadiusMiter = geometryPoints.length > 0
                    ? Math.max(...geometryPoints.map((p) => Math.abs(p.x)))
                    : 1;
                this._trimArcEndpointChords(curveGroups, groupContours, contourClosed, bitRadiusMiter);

                // Assemble trimmed group contours, deduplicating junction points
                contour = [];
                for (const gc of groupContours) {
                    if (!gc.length) continue;
                    if (!contour.length) {
                        contour.push(...gc.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
                    } else {
                        const last = contour[contour.length - 1];
                        const startIdx = last.distanceTo(gc[0]) < EXTRUSION_CONSTANTS.PATH_GAP_TOLERANCE ? 1 : 0;
                        for (let k = startIdx; k < gc.length; k++) {
                            contour.push(new THREE.Vector3(gc[k].x, gc[k].y, gc[k].z));
                        }
                    }
                }

                // Remove duplicate closing point for closed contours
                if (contourClosed && contour.length > 1) {
                    const fc = contour[0];
                    const lc = contour[contour.length - 1];
                    if (fc.distanceTo(lc) < EXTRUSION_CONSTANTS.PATH_GAP_TOLERANCE) {
                        contour = contour.slice(0, -1);
                    }
                }
            } else {
                // Fallback: no groups (single curve), sample directly
                const pathLen = curve.getLength ? curve.getLength() : 100;
                const segments = Math.max(64, Math.ceil(pathLen * 2));
                const pts = curve.getPoints(segments);
                contour = pts.map((p) => new THREE.Vector3(p.x, p.y, p.z));
                if (contourClosed && contour.length > 1) {
                    contour = contour.slice(0, -1);
                }
            }

            // Use ProfiledContourGeometry for miter corners
            const flags = this._getGeometryTransformFlags(side, false);
            const geometry = this.createProfiledContourGeometry(
                profile,
                contour,
                contourClosed,
                false, // openEnded - false means create closed ends
                curveSegments,
                flags.invertExtrusionCaps,
                side,
                {
                    profilePointsOverride: geometryPoints, // Use scaled points
                    profileClosed: true
                }
            );

            if (!geometry) {
                throw new Error("Failed to create ProfiledContourGeometry");
            }

            // Ensure normals point outward regardless of path/profile winding
            this._ensureOutwardNormals(geometry, "miter");

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

            this._logOperationResult("_extrudeMiter:success", {
                side,
                contourPointCount: contour.length,
                profilePointCount: profilePoints.length,
            });

            return [mesh];
        }, []);
    }

    /**
     * Internal: Create round extrusion with half-profile (outer side) and partial lathe junctions.
     * 
     * For junctions with angles ≥ 2°: creates partial lathe geometry for smooth transitions.
     * For micro-angles < 2°: skips lathe and directly merges vertices to avoid self-intersection.
     * 
     * @private
     */
    _extrudeRound(profile, pathOrString, color, side = "top", options = {}) {
        return this._safeExecute("_extrudeRound", () => {
            let path;

            // Helper: Get precise curve tangent at parameter t for junction angle calculation
            const getCurveTangent = (curve, t) => {
                if (curve && typeof curve.getTangent === "function") {
                    const tangent = curve.getTangent(t);
                    if (tangent && tangent.lengthSq() > 1e-12) {
                        return tangent.clone().normalize();
                    }
                }

                // Fallback: numerical derivative with small epsilon
                if (!curve || typeof curve.getPoint !== "function") {
                    return new THREE.Vector3(1, 0, 0);
                }

                const eps = 1e-4;
                const t0 = Math.max(0, Math.min(1, t - eps));
                const t1 = Math.max(0, Math.min(1, t + eps));
                const p0 = curve.getPoint(t0);
                const p1 = curve.getPoint(t1);
                const delta = new THREE.Vector3().subVectors(p1, p0);

                if (delta.lengthSq() < 1e-12) {
                    return new THREE.Vector3(1, 0, 0);
                }

                return delta.normalize();
            };

            if (typeof pathOrString === "string") {
                const pathCurves = this.parsePathToCurves(pathOrString);
                if (pathCurves.length === 0) {
                    this.log.warn("No curves parsed from SVG path");
                    return [];
                }

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
                    panelAnchor,
                );
            } else {
                path = pathOrString;
            }

            if (!path || !path.curves || path.curves.length === 0) {
                this.log.warn("Round extrusion: No curves in path");
                return [];
            }

            // Force canonical half selection independent from SVG winding direction.
            // This prevents inverted extrusions when imported profile/path orientation is wrong.
            const requestedOuterHalf =
                options.outsideHalf === "right" ? "right" : "left";

            // Swap left/right mapping for outer vs inner extrusion as requested.
            const outsideHalf = requestedOuterHalf === "left" ? "right" : "left";
            const innerHalf = outsideHalf === "left" ? "right" : "left";

            const hasProfileAnchorX = Number.isFinite(Number(options.profileAnchorX));
            const hasProfileAnchorY = Number.isFinite(Number(options.profileAnchorY));
            const useAnchorSplit = hasProfileAnchorX || hasProfileAnchorY;
            const splitOptions = {
                useAnchorSplit,
                anchorX: Number(options.profileAnchorX ?? 0),
                anchorY: Number(options.profileAnchorY ?? 0),
            };

            const halfProfilePoints = this.createOpenHalfProfilePoints(
                profile,
                null,
                outsideHalf,
                splitOptions,
            );

            const innerProfilePoints = this.createOpenHalfProfilePoints(
                profile,
                null,
                innerHalf,
                splitOptions,
            );

            if (!halfProfilePoints || halfProfilePoints.length < 2 || !innerProfilePoints || innerProfilePoints.length < 2) {
                this.log.warn(
                    "Round extrusion: not enough half-profile points",
                );
                return [];
            }

            // Apply overlap scaling to half-profile points
            if (this.profileOverlap > 0) {
                // Find max absolute X (since points are normalized to center=0)
                let maxAbsX = 0;
                for (const p of halfProfilePoints) {
                    if (Math.abs(p.x) > maxAbsX) maxAbsX = Math.abs(p.x);
                }

                if (maxAbsX > 1e-6) {
                    const scaleFactor = (maxAbsX + this.profileOverlap) / maxAbsX;
                    for (const p of halfProfilePoints) {
                        p.x *= scaleFactor;
                    }
                }

                let maxAbsXInner = 0;
                for (const p of innerProfilePoints) {
                    if (Math.abs(p.x) > maxAbsXInner) maxAbsXInner = Math.abs(p.x);
                }
                if (maxAbsXInner > 1e-6) {
                    const innerScaleFactor = (maxAbsXInner + this.profileOverlap) / maxAbsXInner;
                    for (const p of innerProfilePoints) {
                        p.x *= innerScaleFactor;
                    }
                }
            }

            // Check if this is a top side extension
            const isExtension = !!options.isExtension;
            const isTopExtension = isExtension && side === "top";
            const isBottomExtension = isExtension && side === "bottom";

            // Invert Y for top side extensions (both halfProfilePoints and lathePoints)
            if (isTopExtension || isBottomExtension) {
                halfProfilePoints.forEach((p) => {
                    p.y = -p.y;
                });
                innerProfilePoints.forEach((p) => {
                    p.y = -p.y;
                });
            }

            // Lathe points derived from the same half-profile (radius, height)
            const lathePoints = halfProfilePoints.map(
                (p) => new THREE.Vector2(Math.abs(p.x), p.y),
            );

            // Reverse winding only for sweep-extruded half-profiles.
            // Lathe uses original order (lathePoints) and remains unchanged.
            const extrudeHalfProfilePoints = halfProfilePoints.slice().reverse();

            // Group curves using shared logic
            const curveGroups = this.groupCurves(path.curves);

            // Check if path is closed
            const isClosedPath = this._isPathClosed(path);
            const useRoundTerminalCaps =
                !isClosedPath && options.revolveEndCaps !== false;

            const allMeshes = [];
            const junctionPoints = [];

            const sampleCurvesToContour = (curves) => {
                const contourPoints = [];
                for (const curve of curves) {
                    const len = curve.getLength ? curve.getLength() : 0;
                    const isLine =
                        curve.segmentType === "LINE" ||
                        curve instanceof THREE.LineCurve3;
                    const samples = isLine
                        ? 1
                        : Math.max(
                            2,
                            Math.ceil(len / this.arcDivisionCoefficient),
                        );
                    const points = curve.getPoints(samples);
                    if (contourPoints.length === 0) {
                        contourPoints.push(...points.map((p) => p.clone()));
                    } else {
                        const firstNew = points[0];
                        const lastExisting = contourPoints[contourPoints.length - 1];
                        const startIdx =
                            lastExisting.distanceTo(firstNew) <
                            EXTRUSION_CONSTANTS.PATH_GAP_TOLERANCE
                                ? 1
                                : 0;
                        for (let i = startIdx; i < points.length; i++) {
                            contourPoints.push(points[i].clone());
                        }
                    }
                }
                return contourPoints;
            };

            const buildChunksFromSplitBoundaries = (
                groupCount,
                splitBoundarySet,
                closed,
            ) => {
                if (groupCount <= 0) return [];
                if (groupCount === 1) return [[0]];

                if (!closed) {
                    const chunks = [];
                    let current = [0];
                    for (let boundary = 0; boundary < groupCount - 1; boundary++) {
                        if (splitBoundarySet.has(boundary)) {
                            chunks.push(current);
                            current = [];
                        }
                        current.push(boundary + 1);
                    }
                    if (current.length > 0) chunks.push(current);
                    return chunks;
                }

                const sorted = Array.from(splitBoundarySet).sort((a, b) => a - b);
                if (sorted.length === 0) {
                    return [Array.from({ length: groupCount }, (_, i) => i)];
                }

                const chunks = [];
                for (let i = 0; i < sorted.length; i++) {
                    const start = (sorted[i] + 1) % groupCount;
                    const endBoundary = sorted[(i + 1) % sorted.length];

                    const chunk = [];
                    let idx = start;
                    let guard = 0;
                    while (guard <= groupCount) {
                        chunk.push(idx);
                        if (idx === endBoundary) break;
                        idx = (idx + 1) % groupCount;
                        guard++;
                    }
                    if (chunk.length > 0) chunks.push(chunk);
                }

                return chunks;
            };

            const isOuterCornerForHalf = (crossZ, half) => {
                if (Math.abs(crossZ) < 1e-10) return false;
                // left turn (cross>0): right side is outer; right turn (cross<0): left side is outer
                return half === "left" ? crossZ < 0 : crossZ > 0;
            };

            const groupContours = curveGroups.map((group) =>
                sampleCurvesToContour(group.curves),
            );

            // Enforce minimum endpoint chord length on arc/curve groups to prevent
            // inner-offset self-intersection at arc↔segment junctions.
            // See _trimArcEndpointChords for full explanation.
            {
                const bitRadius = halfProfilePoints.length > 0
                    ? Math.max(...halfProfilePoints.map((p) => Math.abs(p.x)))
                    : 1;
                this._trimArcEndpointChords(curveGroups, groupContours, isClosedPath, bitRadius);
            }

            const groupCount = curveGroups.length;
            const boundaryCount = isClosedPath
                ? groupCount
                : Math.max(0, groupCount - 1);

            const splitBoundaries = new Set();
            const splitBoundariesInner = new Set();
            const junctionPointsInner = [];
            const MICRO_ANGLE_THRESHOLD = THREE.MathUtils.degToRad(
                EXTRUSION_CONSTANTS.MICRO_ANGLE_DEG,
            );

            for (let boundary = 0; boundary < boundaryCount; boundary++) {
                const currentGroup = curveGroups[boundary];
                const nextGroup = curveGroups[(boundary + 1) % groupCount];
                if (!currentGroup || !nextGroup) continue;

                const currentContour = groupContours[boundary];
                if (!currentContour || currentContour.length === 0) continue;

                const lastCurve =
                    currentGroup.curves[currentGroup.curves.length - 1];
                const firstCurve = nextGroup.curves[0];

                const prevDirFromCurve = getCurveTangent(lastCurve, 1);
                const nextDirFromCurve = getCurveTangent(firstCurve, 0);

                // Use actual, post-trim contour endpoint chords for boundary angle/lathe
                // so lathes stay synchronized with any arc endpoint trimming.
                const prevDir = (() => {
                    if (currentContour.length >= 2) {
                        const a = currentContour[currentContour.length - 2];
                        const b = currentContour[currentContour.length - 1];
                        const v = new THREE.Vector3().subVectors(b, a);
                        if (v.lengthSq() > 1e-12) return v.normalize();
                    }
                    return prevDirFromCurve;
                })();

                const nextContour = groupContours[(boundary + 1) % groupCount];
                const nextDir = (() => {
                    if (nextContour && nextContour.length >= 2) {
                        const a = nextContour[0];
                        const b = nextContour[1];
                        const v = new THREE.Vector3().subVectors(b, a);
                        if (v.lengthSq() > 1e-12) return v.normalize();
                    }
                    return nextDirFromCurve;
                })();

                const dot = Math.max(-1, Math.min(1, prevDir.dot(nextDir)));
                const angleBetween = Math.acos(dot);
                const crossZ = prevDir.x * nextDir.y - prevDir.y * nextDir.x;

                const isOuterForOutsideHalf = isOuterCornerForHalf(
                    crossZ,
                    outsideHalf,
                );
                const isOuterForInnerHalf = isOuterCornerForHalf(
                    crossZ,
                    innerHalf,
                );

                const shouldCreateLathe =
                    isOuterForOutsideHalf && angleBetween >= MICRO_ANGLE_THRESHOLD;
                const shouldCreateLatheInner =
                    isOuterForInnerHalf && angleBetween >= MICRO_ANGLE_THRESHOLD;

                if (shouldCreateLathe) {
                    splitBoundaries.add(boundary);
                    junctionPoints.push({
                        point: currentContour[currentContour.length - 1].clone(),
                        boundary,
                        prevDir,
                        nextDir,
                        angleBetween,
                    });
                }

                if (shouldCreateLatheInner) {
                    splitBoundariesInner.add(boundary);
                    junctionPointsInner.push({
                        point: currentContour[currentContour.length - 1].clone(),
                        boundary,
                        prevDir,
                        nextDir,
                        angleBetween,
                    });
                }
            }

            const chunkGroupIndices = buildChunksFromSplitBoundaries(
                groupCount,
                splitBoundaries,
                isClosedPath,
            );

            for (let chunkIndex = 0; chunkIndex < chunkGroupIndices.length; chunkIndex++) {
                const groupIndices = chunkGroupIndices[chunkIndex];
                let contourPoints = [];

                for (const gi of groupIndices) {
                    const source = groupContours[gi] || [];
                    if (contourPoints.length === 0) {
                        contourPoints.push(...source.map((p) => p.clone()));
                    } else if (source.length > 0) {
                        const firstNew = source[0];
                        const lastExisting = contourPoints[contourPoints.length - 1];
                        const startIdx =
                            lastExisting.distanceTo(firstNew) <
                            EXTRUSION_CONSTANTS.PATH_GAP_TOLERANCE
                                ? 1
                                : 0;
                        for (let i = startIdx; i < source.length; i++) {
                            contourPoints.push(source[i].clone());
                        }
                    }
                }

                if (contourPoints.length < 2) {
                    this.log.warn(
                        `Round extrusion: chunk ${chunkIndex} has insufficient contour points`,
                    );
                    continue;
                }

                const firstPoint = contourPoints[0];
                const lastPoint = contourPoints[contourPoints.length - 1];
                const chunkClosed =
                    isClosedPath &&
                    splitBoundaries.size === 0 &&
                    firstPoint.distanceTo(lastPoint) <
                        EXTRUSION_CONSTANTS.PATH_CLOSURE_TOLERANCE;

                // For closed chunks, remove duplicate last point (same as _extrudeMiter)
                let extrudeContourOuter = contourPoints;
                if (chunkClosed && extrudeContourOuter.length > 1) {
                    extrudeContourOuter = extrudeContourOuter.slice(0, -1);
                }

                const curveSegments = this.calculateAdaptiveCurveSegments(profile);
                const flags = this._getGeometryTransformFlags(side, false);
                const geometry = this.createProfiledContourGeometry(
                    profile,
                    extrudeContourOuter,
                    chunkClosed,
                    options.openCaps === true || useRoundTerminalCaps,
                    curveSegments,
                    flags.invertExtrusionCaps,
                    side,
                    {
                        profilePointsOverride: extrudeHalfProfilePoints,
                        profileClosed: false,
                        useParallelTransport: false,
                    },
                );

                if (!geometry) {
                    this.log.warn(
                        `Failed to create geometry for chunk ${chunkIndex}`,
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
                mesh.userData.chunkIndex = chunkIndex;
                mesh.userData.groupIndices = groupIndices.slice();
                mesh.userData.halfProfile = outsideHalf;
                mesh.userData.contourPointCount = contourPoints.length;
                mesh.userData.profilePointCount = halfProfilePoints.length;
                mesh.userData.contourReversed = true;

                allMeshes.push(mesh);
            }

            // Partial lathe only at OUTER corners for this half-profile (concave corners stay mitered)
            if (junctionPoints.length > 0) {
                let extensionHeight = 0;
                if (options.zOffset && options.zOffset !== 0) {
                    const yCoords = halfProfilePoints.map((p) => p.y);
                    const minY = Math.min(...yCoords);
                    const maxY = Math.max(...yCoords);
                    extensionHeight = Math.abs(maxY - minY);
                }

                for (let i = 0; i < junctionPoints.length; i++) {
                    const junction = junctionPoints[i];

                    const latheResult = this.createPartialLatheAtJunction(
                        profile,
                        junction.point,
                        junction.prevDir,
                        junction.nextDir,
                        color,
                        i,
                        true,
                        null,
                        false,
                        side,
                        !!options.isExtension,
                        extensionHeight,
                        lathePoints,
                        0,
                        false,
                    );

                    if (latheResult && latheResult.mesh) {
                        const latheMesh = latheResult.mesh;
                        latheMesh.userData.isBitPart = true;
                        latheMesh.userData.isLatheCorner = true;
                        latheMesh.userData.isPartialLathe = true;
                        latheMesh.userData.junctionAfterBoundary =
                            junction.boundary;
                        latheMesh.userData.halfProfile = outsideHalf;
                        allMeshes.push(latheMesh);
                    }
                }
            }

            const addTerminalRoundCaps = (halfProfileName, latheProfilePoints) => {
                if (!useRoundTerminalCaps) return;
                if (!Array.isArray(latheProfilePoints) || latheProfilePoints.length < 2) return;

                const flattenedContour = sampleCurvesToContour(path.curves || []);
                if (!Array.isArray(flattenedContour) || flattenedContour.length < 2) return;

                const firstPoint = flattenedContour[0];
                const secondPoint = flattenedContour[1];
                const beforeLastPoint = flattenedContour[flattenedContour.length - 2];
                const lastPoint = flattenedContour[flattenedContour.length - 1];

                const startDir = new THREE.Vector3().subVectors(secondPoint, firstPoint);
                const endDir = new THREE.Vector3().subVectors(lastPoint, beforeLastPoint);
                if (startDir.lengthSq() < 1e-10 || endDir.lengthSq() < 1e-10) return;

                startDir.normalize();
                endDir.normalize();

                let extensionHeight = 0;
                if (options.zOffset && options.zOffset !== 0) {
                    const yCoords = latheProfilePoints.map((p) => p.y);
                    const minY = Math.min(...yCoords);
                    const maxY = Math.max(...yCoords);
                    extensionHeight = Math.abs(maxY - minY);
                }

                const terminals = [
                    {
                        point: firstPoint,
                        prevDir: startDir.clone().multiplyScalar(-1),
                        nextDir: startDir.clone(),
                        tag: "start",
                    },
                    {
                        point: lastPoint,
                        prevDir: endDir.clone(),
                        nextDir: endDir.clone().multiplyScalar(-1),
                        tag: "end",
                    },
                ];

                for (const terminal of terminals) {
                    const latheResult = this.createPartialLatheAtJunction(
                        profile,
                        terminal.point,
                        terminal.prevDir,
                        terminal.nextDir,
                        color,
                        `terminal-${halfProfileName}-${terminal.tag}`,
                        true,
                        null,
                        false,
                        side,
                        !!options.isExtension,
                        extensionHeight,
                        latheProfilePoints,
                        0,
                        false,
                    );

                    if (latheResult?.mesh) {
                        const terminalMesh = latheResult.mesh;
                        terminalMesh.userData.isBitPart = true;
                        terminalMesh.userData.isLatheCorner = true;
                        terminalMesh.userData.isPartialLathe = true;
                        terminalMesh.userData.isTerminalRoundCap = true;
                        terminalMesh.userData.terminalTag = terminal.tag;
                        terminalMesh.userData.halfProfile = halfProfileName;
                        allMeshes.push(terminalMesh);
                    }
                }
            };

            addTerminalRoundCaps(outsideHalf, lathePoints);

            // Inside half extrusion: same convex/concave split logic as outside,
            // but with corner classification for inner half.
            const chunkGroupIndicesInner = buildChunksFromSplitBoundaries(
                groupCount,
                splitBoundariesInner,
                isClosedPath,
            );

            const extrudeInnerProfilePoints = innerProfilePoints
                .slice()
                .reverse();
            const lathePointsInner = innerProfilePoints.map(
                (p) => new THREE.Vector2(Math.abs(p.x), p.y),
            );

            // Compute a miter limit for the inner sweep based on the profile
            // height.  When an arc is tessellated into many short sub-segments
            // the concave miter at the arc→line transition can reach extremely
            // large shift values, causing the sweep to fold back on itself.
            // Limiting shift to ≤ profileHeight keeps the geometry clean while
            // still producing a good-looking sharp corner.
            const _innerProfileYs = innerProfilePoints.map((p) => p.y);
            const _innerProfileHeight =
                Math.max(..._innerProfileYs) - Math.min(..._innerProfileYs);
            const innerMiterLimit = Math.max(1, _innerProfileHeight);

            // Phase 1: collect contour points for every inner chunk.
            const innerChunkData = [];
            for (let chunkIndex = 0; chunkIndex < chunkGroupIndicesInner.length; chunkIndex++) {
                const groupIndices = chunkGroupIndicesInner[chunkIndex];
                let contourPoints = [];

                for (const gi of groupIndices) {
                    const source = groupContours[gi] || [];
                    if (contourPoints.length === 0) {
                        contourPoints.push(...source.map((p) => p.clone()));
                    } else if (source.length > 0) {
                        const firstNew = source[0];
                        const lastExisting = contourPoints[contourPoints.length - 1];
                        const startIdx =
                            lastExisting.distanceTo(firstNew) <
                            EXTRUSION_CONSTANTS.PATH_GAP_TOLERANCE
                                ? 1
                                : 0;
                        for (let i = startIdx; i < source.length; i++) {
                            contourPoints.push(source[i].clone());
                        }
                    }
                }

                innerChunkData.push({ chunkIndex, groupIndices, contourPoints });
            }

            // Phase 2: clip overlapping inner contours.
            this._clipInnerChunkContours(innerChunkData);

            // Phase 3: create geometries from (possibly clipped) contour points.
            for (const chunkData of innerChunkData) {
                const { chunkIndex, groupIndices, contourPoints } = chunkData;

                if (contourPoints.length < 2) {
                    this.log.warn(
                        `Round extrusion (inner): chunk ${chunkIndex} has insufficient contour points`,
                    );
                    continue;
                }

                const firstPoint = contourPoints[0];
                const lastPoint = contourPoints[contourPoints.length - 1];
                const chunkClosed =
                    isClosedPath &&
                    splitBoundariesInner.size === 0 &&
                    firstPoint.distanceTo(lastPoint) <
                        EXTRUSION_CONSTANTS.PATH_CLOSURE_TOLERANCE;

                // For closed chunks, remove duplicate last point (same as _extrudeMiter)
                let extrudeContourInner = contourPoints;
                if (chunkClosed && extrudeContourInner.length > 1) {
                    extrudeContourInner = extrudeContourInner.slice(0, -1);
                }

                const curveSegments = this.calculateAdaptiveCurveSegments(profile);
                const flags = this._getGeometryTransformFlags(side, false);
                const innerGeometry = this.createProfiledContourGeometry(
                    profile,
                    extrudeContourInner,
                    chunkClosed,
                    options.openCaps === true || useRoundTerminalCaps,
                    curveSegments,
                    flags.invertExtrusionCaps,
                    side,
                    {
                        profilePointsOverride: extrudeInnerProfilePoints,
                        profileClosed: false,
                        useParallelTransport: false,
                        miterLimit: innerMiterLimit,
                    },
                );

                if (!innerGeometry) {
                    this.log.warn(
                        `Failed to create inner geometry for chunk ${chunkIndex}`,
                    );
                    continue;
                }

                innerGeometry.computeVertexNormals();
                innerGeometry.normalizeNormals();
                const innerMaterial = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(color || "#cccccc"),
                    roughness: 0.5,
                    metalness: 0.2,
                    side: THREE.FrontSide,
                    wireframe: this.materialManager
                        ? this.materialManager.isWireframeEnabled()
                        : false,
                });

                const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
                innerMesh.castShadow = true;
                innerMesh.receiveShadow = true;
                innerMesh.userData.isBitPart = true;
                innerMesh.userData.halfProfile = innerHalf;
                innerMesh.userData.chunkIndex = chunkIndex;
                innerMesh.userData.groupIndices = groupIndices.slice();
                innerMesh.userData.contourPointCount = contourPoints.length;
                innerMesh.userData.profilePointCount = innerProfilePoints.length;
                innerMesh.userData.contourReversed = true;
                innerMesh.userData.isInnerHalfPart = true;

                allMeshes.push(innerMesh);
            }

            // Partial lathes for INNER half on its own outer corners.
            if (junctionPointsInner.length > 0) {
                let extensionHeight = 0;
                if (options.zOffset && options.zOffset !== 0) {
                    const yCoords = innerProfilePoints.map((p) => p.y);
                    const minY = Math.min(...yCoords);
                    const maxY = Math.max(...yCoords);
                    extensionHeight = Math.abs(maxY - minY);
                }

                for (let i = 0; i < junctionPointsInner.length; i++) {
                    const junction = junctionPointsInner[i];

                    const latheResult = this.createPartialLatheAtJunction(
                        profile,
                        junction.point,
                        junction.prevDir,
                        junction.nextDir,
                        color,
                        i,
                        true,
                        null,
                        false,
                        side,
                        !!options.isExtension,
                        extensionHeight,
                        lathePointsInner,
                        0,
                        false,
                    );

                    if (latheResult && latheResult.mesh) {
                        const latheMesh = latheResult.mesh;

                        latheMesh.userData.isBitPart = true;
                        latheMesh.userData.isLatheCorner = true;
                        latheMesh.userData.isPartialLathe = true;
                        latheMesh.userData.junctionAfterBoundary =
                            junction.boundary;
                        latheMesh.userData.halfProfile = innerHalf;
                        latheMesh.userData.isInnerHalfLathe = true;
                        allMeshes.push(latheMesh);
                    }
                }
            }

            addTerminalRoundCaps(innerHalf, lathePointsInner);

            // Merge all OUTSIDE half parts, then merge with INSIDE
            const outsideMeshes = allMeshes.filter(
                (m) => m && m.userData.halfProfile === outsideHalf,
            );
            const insideMeshes = allMeshes.filter(
                (m) => m && m.userData.halfProfile === innerHalf,
            );

            const mergedOutside = this.mergeExtrudeMeshes(outsideMeshes, color);
            const mergedInside = this.mergeExtrudeMeshes(insideMeshes, color);

            if (mergedOutside?.geometry) {
                this._ensureOutwardNormals(
                    mergedOutside.geometry,
                    "round-outside",
                );
            }
            if (mergedInside?.geometry) {
                this._ensureOutwardNormals(
                    mergedInside.geometry,
                    "round-inside",
                );
            }

            if (mergedOutside && mergedInside) {
                const mergedFinal = this.mergeExtrudeMeshes(
                    [mergedOutside, mergedInside],
                    color,
                );
                if (mergedFinal) {
                    if (mergedFinal.geometry) {
                        this._ensureOutwardNormals(
                            mergedFinal.geometry,
                            "round-final",
                        );
                    }
                    return [mergedFinal];
                }
            }

            if (mergedOutside && !mergedInside) {
                return [mergedOutside];
            }

            if (mergedInside && !mergedOutside) {
                return [mergedInside];
            }

            this._logOperationResult("_extrudeRound:success", {
                side,
                isClosedPath,
                totalParts: allMeshes.length,
                junctions: junctionPoints.length,
            });

            return allMeshes;
        }, []);
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
            invertLatheProfile: isBottom && !isExtension, // Invert Y in lathe profile for bottom side, but not for extensions (already inverted)
            invertLatheNormals: isBottom, // Invert lathe body winding only for bottom side

            // Cap winding (simplified - caps always use base winding for lathe)
            invertExtrusionCaps: !isBottom, // TOP needs inverted caps

            // Z positioning
            invertPositionZ: isBottom, // Invert position Z
            addExtensionOffset: isExtension, // Add height for all extensions (top and bottom)
            invertExtensionOffset: isExtension && !isBottom, // Invert offset for top extensions
        };
    }

    /**
     * Clip overlapping inner extrusion contours.
     *
     * When an arc is tessellated into many short sub-segments the last few
     * arc-chunks may geometrically overlap the adjacent linear chunk because the
     * inner offset contour of those sub-segments falls inside the linear
     * segment's swept volume.  This method iterates over every consecutive pair
     * of inner chunks and, whenever the tail of chunk[i] penetrates the head of
     * chunk[i+1] (or vice-versa), trims the intruding contour back to the
     * 2-D intersection point so the final sweep produces no self-intersections.
     *
     * The algorithm works entirely in the XZ path-space (Vector3 x/z) because
     * that is the plane in which the inner offset contour is laid out before
     * being swept along the profile.
     *
     * @param {Array<{chunkIndex:number, groupIndices:number[], contourPoints:THREE.Vector3[]}>} innerChunkData
     * @private
     */
    _clipInnerChunkContours(innerChunkData) {
        if (!innerChunkData || innerChunkData.length < 2) return;

        /**
         * 2-D segment intersection in XZ plane.
         * Returns the parameter t ∈ (0,1) along segment AB where it intersects
         * segment CD, or null if there is no intersection in that range.
         * We treat Vector3 (x, z) as the 2-D coordinates.
         */
        const segmentIntersectXZ = (a, b, c, d) => {
            const r = { x: b.x - a.x, z: b.z - a.z };
            const s = { x: d.x - c.x, z: d.z - c.z };
            const denom = r.x * s.z - r.z * s.x;
            if (Math.abs(denom) < 1e-10) return null; // parallel / collinear
            const diff = { x: c.x - a.x, z: c.z - a.z };
            const t = (diff.x * s.z - diff.z * s.x) / denom;
            const u = (diff.x * r.z - diff.z * r.x) / denom;
            if (t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6) {
                return { t, u, x: a.x + t * r.x, z: a.z + t * r.z };
            }
            return null;
        };

        /**
         * Test whether point P lies geometrically "inside" (past the start of)
         * the contour of the next chunk — i.e., the projection of P onto the
         * first edge of nextPoints overshoots the edge.
         * We use a simple signed-area / cross-product test.
         */
        const pointPastEdge = (p, edgeA, edgeB) => {
            // Cross product of edge direction with (p - edgeA) in XZ.
            const ex = edgeB.x - edgeA.x;
            const ez = edgeB.z - edgeA.z;
            const px = p.x - edgeA.x;
            const pz = p.z - edgeA.z;
            const dot = ex * px + ez * pz;
            const lenSq = ex * ex + ez * ez;
            // t > 1 means p is "past" the edge end — it has overshot.
            return lenSq > 1e-12 && dot / lenSq > 1 - 1e-6;
        };

        for (let i = 0; i < innerChunkData.length - 1; i++) {
            const curr = innerChunkData[i];
            const next = innerChunkData[i + 1];

            const currPts = curr.contourPoints;
            const nextPts = next.contourPoints;

            if (currPts.length < 2 || nextPts.length < 2) continue;

            // --- 1. Try to find a 2-D intersection between the TAIL of currPts
            //        and the HEAD of nextPts.
            // We scan the last few segments of currPts against the first few
            // segments of nextPts.  To keep it O(n) we limit the scan window.
            const WINDOW = Math.min(currPts.length - 1, 16);
            const WINDOW_NEXT = Math.min(nextPts.length - 1, 16);

            let foundCurrSeg = -1;
            let foundNextSeg = -1;
            let foundX = 0;
            let foundZ = 0;
            let foundT = 0;
            let foundU = 0;

            outer: for (let ci = currPts.length - 1 - WINDOW; ci < currPts.length - 1; ci++) {
                for (let ni = 0; ni < WINDOW_NEXT; ni++) {
                    const hit = segmentIntersectXZ(
                        currPts[ci], currPts[ci + 1],
                        nextPts[ni], nextPts[ni + 1],
                    );
                    if (hit) {
                        foundCurrSeg = ci;
                        foundNextSeg = ni;
                        foundX = hit.x;
                        foundZ = hit.z;
                        foundT = hit.t;
                        foundU = hit.u;
                        break outer;
                    }
                }
            }

            if (foundCurrSeg !== -1) {
                // Intersection found — trim both contours to the crossing point.
                const splitPoint = new THREE.Vector3(
                    foundX,
                    // Interpolate Y at the crossing for smooth caps.
                    currPts[foundCurrSeg].y +
                        foundT * (currPts[foundCurrSeg + 1].y - currPts[foundCurrSeg].y),
                    foundZ,
                );

                // Trim curr: keep [0 .. foundCurrSeg] + splitPoint
                curr.contourPoints = currPts.slice(0, foundCurrSeg + 1);
                curr.contourPoints.push(splitPoint.clone());

                // Trim next: keep splitPoint + [foundNextSeg+1 .. end]
                next.contourPoints = [splitPoint.clone()];
                for (let k = foundNextSeg + 1; k < nextPts.length; k++) {
                    next.contourPoints.push(nextPts[k].clone());
                }

                this.log.debug(
                    `[_clipInnerChunkContours] Clipped chunk ${curr.chunkIndex}↔${next.chunkIndex}: ` +
                    `curr trimmed to ${curr.contourPoints.length} pts, ` +
                    `next starts at ${next.contourPoints.length} pts`,
                );
                continue; // No need for the overshoot check below.
            }

            // --- 2. No explicit crossing found.  Check whether the last point
            //        of curr is already "past" (inside) the first edge of next.
            //        This happens when tiny arc sub-segments are fully swallowed.
            const lastCurr = currPts[currPts.length - 1];
            if (nextPts.length >= 2 && pointPastEdge(lastCurr, nextPts[0], nextPts[1])) {
                // The tail of curr overshoots into next.  Snap curr's last point
                // to the start of next so the two chunks share exactly one vertex.
                currPts[currPts.length - 1] = nextPts[0].clone();
                this.log.debug(
                    `[_clipInnerChunkContours] Snapped chunk ${curr.chunkIndex} tail to chunk ${next.chunkIndex} head`,
                );
            }
        }
    }

    /**
     * Ensure normals point outward regardless of contour/profile winding.
     * Delegates to shared utility to keep behavior consistent across modules.
     * @private
     * @param {THREE.BufferGeometry} geometry - Geometry to normalize.
     * @param {string} [label=""] - Debug label for logs.
     * @returns {boolean} True when winding was modified.
     */
    _ensureOutwardNormals(geometry, label = "") {
        return ensureOutwardNormals(geometry, {
            label,
            volumeEpsilon: EXTRUSION_CONSTANTS.VOLUME_EPSILON,
            log: this.log,
        });
    }

    /**
     * Create profiled contour geometry with miter corners
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
        side = "top",
        profileOptions = {},
    ) {
        return this._safeExecute("createProfiledContourGeometry", () => {
            contourClosed = contourClosed !== undefined ? contourClosed : true;
            openEnded = openEnded !== undefined ? openEnded : false;
            openEnded = contourClosed === true ? false : openEnded;

            const {
                profilePointsOverride = null,
                profileClosed = true,
                useParallelTransport = false,
                frameAngles = null,
                // Maximum |shift| allowed for miter joints. Values above this
                // are clamped so that acute-angle miters (e.g. the concave join
                // between an arc's last sub-segment and an adjacent line) do not
                // produce self-intersecting geometry.  Pass Infinity to disable.
                miterLimit = Infinity,
            } = profileOptions;

            this.log.debug("createProfiledContourGeometry starting:", {
                contourPoints: contour.length,
                contourClosed,
                openEnded,
                curveSegments,
                side,
            });

            const flags = this._getGeometryTransformFlags(side, false);

            // Apply Z inversion if needed (for bottom side)
            if (flags.invertZ) {
                contour = contour.map((p) => new THREE.Vector3(p.x, p.y, -p.z));
            }

            // Force opposite sweep direction for all extrusions.
            // Keep this unconditional to preserve historical left/right behavior
            // for both open and closed contours.
            if (Array.isArray(contour) && contour.length > 1) {
                contour = contour.slice().reverse();
            }

            let profile;
            if (profilePointsOverride && profilePointsOverride.length > 0) {
                const sourcePoints = profileClosed
                    ? this._normalizeClosedProfilePointsWinding(profilePointsOverride)
                    : profilePointsOverride;

                const pos = new Float32Array(sourcePoints.length * 3);
                for (let i = 0; i < sourcePoints.length; i++) {
                    const p = sourcePoints[i];
                    pos[i * 3] = p.x;
                    pos[i * 3 + 1] = p.y;
                    pos[i * 3 + 2] = 0;
                }
                const tempGeom = new THREE.BufferGeometry();
                tempGeom.setAttribute(
                    "position",
                    new THREE.BufferAttribute(pos, 3),
                );
                tempGeom.rotateX(Math.PI * 0.5);
                if (flags.rotateProfile) {
                    tempGeom.rotateY(Math.PI);
                }
                profile = tempGeom.attributes.position;
            } else {
                let profileGeometry = new THREE.ShapeGeometry(
                    profileShape,
                    curveSegments,
                );
                profileGeometry.rotateX(Math.PI * 0.5);

                // Apply profile rotation if needed (for bottom side)
                if (flags.rotateProfile) {
                    profileGeometry.rotateY(Math.PI);
                }

                profile = profileGeometry.attributes.position;
            }

            this.log.debug("Profile geometry created:", {
                profilePoints: profile.count,
            });

            // Calculate total vertices needed: profile points for each contour
            // (Earcut uses existing vertices, no need for center points)
            const posCount = profile.count * contour.length;
            let positions = new Float32Array(posCount * 3);

            const shiftMatrix = new THREE.Matrix4();
            const rotationMatrix = new THREE.Matrix4();
            const translationMatrix = new THREE.Matrix4();

            for (let i = 0; i < contour.length; i++) {
                let shift = 0;
                let tempAngle;

                if (frameAngles && frameAngles[i] !== undefined) {
                    tempAngle = frameAngles[i];
                } else if (useParallelTransport) {
                    const prevIdx =
                        i - 1 < 0
                            ? contourClosed
                                ? contour.length - 1
                                : 0
                            : i - 1;
                    const nextIdx =
                        i + 1 >= contour.length
                            ? contourClosed
                                ? 0
                                : contour.length - 1
                            : i + 1;
                    const prev = contour[prevIdx];
                    const next = contour[nextIdx];
                    const tangent = new THREE.Vector2(
                        next.x - prev.x,
                        next.y - prev.y,
                    );

                    if (tangent.lengthSq() < 1e-12) {
                        tangent.set(1, 0);
                    }

                    tempAngle =
                        Math.atan2(tangent.y, tangent.x) + Math.PI * 0.5;
                } else {
                    let v1 = new THREE.Vector2().subVectors(
                        contour[i - 1 < 0 ? contour.length - 1 : i - 1],
                        contour[i],
                    );
                    let v2 = new THREE.Vector2().subVectors(
                        contour[i + 1 == contour.length ? 0 : i + 1],
                        contour[i],
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

                    shift = Math.tan(hA - Math.PI * 0.5);
                    // Clamp miter shift to avoid self-intersecting geometry at
                    // acute concave corners (e.g. arc→line transition on the
                    // inner half).
                    if (miterLimit !== Infinity) {
                        if (shift > miterLimit) shift = miterLimit;
                        else if (shift < -miterLimit) shift = -miterLimit;
                    }
                    tempAngle = tA;
                }

                shiftMatrix.set(
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
                    1,
                );

                rotationMatrix.set(
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
                    1,
                );

                translationMatrix.set(
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
                    1,
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
                new THREE.BufferAttribute(positions, 3),
            );
            let index = [];

            let lastCorner =
                contourClosed == false ? contour.length - 1 : contour.length;
            for (let i = 0; i < lastCorner; i++) {
                const lastProfileIdx = profileClosed
                    ? profile.count
                    : profile.count - 1;
                for (let j = 0; j < lastProfileIdx; j++) {
                    let currCorner = i;
                    let nextCorner = i + 1 == contour.length ? 0 : i + 1;
                    let currPoint = j;
                    let nextPoint = j + 1 == profile.count ? 0 : j + 1;

                    if (!profileClosed && nextPoint === 0) {
                        continue;
                    }

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
            if (!openEnded && !contourClosed && profileClosed) {
                // Use Earcut for proper triangulation (handles concave profiles)
                // Extract 2D profile coordinates
                const flatCoords = [];
                for (let j = 0; j < profile.count; j++) {
                    flatCoords.push(
                        profile.array[j * 3],
                        profile.array[j * 3 + 1],
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
        }, new THREE.BoxGeometry(1, 1, 1));
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
        extensionHeight = 0,
        lathePointsOverride = null,
        angularOverlapRad = null,
        includeCaps = true,
    ) {
        try {
            // Get transformation flags based on side and extension type
            const flags = this._getGeometryTransformFlags(side, isExtension);

            // Create lathe profile with inversion if needed
            const lathePoints =
                lathePointsOverride && lathePointsOverride.length > 1
                    ? lathePointsOverride
                    : this.createLatheHalfProfilePoints(
                        profile,
                        null,
                        profilePoints,
                        flags.invertLatheProfile,
                    );

            if (!lathePoints || lathePoints.length < 2) {
                this.log.warn(
                    "Not enough points for partial lathe at junction",
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
            const angularOverlap =
                angularOverlapRad !== null && angularOverlapRad !== undefined
                    ? angularOverlapRad
                    : THREE.MathUtils.degToRad(0.5);

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
                        2,
                    )}) → ${THREE.MathUtils.radToDeg(prevAngleXZ).toFixed(
                        1,
                    )}° | ` +
                    `nextDir: (${nextDir.x.toFixed(2)}, ${nextDir.y.toFixed(
                        2,
                    )}) → ${THREE.MathUtils.radToDeg(nextAngleXZ).toFixed(
                        1,
                    )}° | ` +
                    `angleDiff: ${THREE.MathUtils.radToDeg(
                        angleDiff,
                    ).toFixed(1)}° | ` +
                    `phiStart: ${THREE.MathUtils.radToDeg(phiStart).toFixed(
                        1,
                    )}° | ` +
                    `phiLength: ${THREE.MathUtils.radToDeg(
                        phiLength,
                    ).toFixed(1)}°`,
                );
            } else {
                // FULL 360° LATHE
                phiStart = 0;
                phiLength = Math.PI * 2;

                this.log.info(
                    `Corner ${cornerNumber} (${color}) | Junction angle: ${THREE.MathUtils.radToDeg(
                        angle,
                    ).toFixed(1)}° | FULL 360°`,
                );
            }

            // Calculate max radius from profile to determine arc length for adaptive segmentation
            let maxRadius = 0;
            if (lathePoints && lathePoints.length > 0) {
                for (const p of lathePoints) {
                    if (Math.abs(p.x) > maxRadius) maxRadius = Math.abs(p.x);
                }
            } else {
                maxRadius = 10; // Fallback
            }

            // Calculate arc length at the outer edge
            const arcLength = maxRadius * Math.abs(phiLength);
            
            // Calculate segments adaptively: arcLength / arcDivisionCoefficient
            // Ensure at least 2 segments for any curved surface
            const adaptiveSegments = Math.ceil(arcLength / (this.latheDivisionCoefficient || 1));
            
            // Clamp segments
            const segments = Math.max(1, adaptiveSegments);

            this.log.debug(
                `Lathe segments: ${segments} (angle: ${THREE.MathUtils.radToDeg(
                    Math.abs(phiLength),
                ).toFixed(1)}°, radius: ${maxRadius.toFixed(1)}mm, arc: ${arcLength.toFixed(1)}mm)`,
            );

            // Create simple lathe geometry without caps (caps not needed for new round extrusion)
            const finalGeometry = new THREE.LatheGeometry(
                lathePoints,
                segments,
                phiStart,
                phiLength,
            );

            // Apply transformations for normals if needed
            if (flags.invertLatheNormals) {
                // Invert triangle winding
                const index = finalGeometry.index.array;
                for (let i = 0; i < index.length; i += 3) {
                    const temp = index[i];
                    index[i] = index[i + 2];
                    index[i + 2] = temp;
                }
                finalGeometry.index.needsUpdate = true;
            }

            // Rotate to match orientation (Z becomes height axis)
            finalGeometry.rotateX(Math.PI / 2);

            // Compute normals for proper lighting
            finalGeometry.computeVertexNormals();
            finalGeometry.normalizeNormals();

            if (!finalGeometry) {
                this.log.error("Failed to create lathe geometry");
                return null;
            }

            // Calculate Z translation with all transformations
            let translationZ = point.z;

            if (flags.invertPositionZ) {
                translationZ = -translationZ;
            }

            if (flags.addExtensionOffset) {
                if (flags.invertExtensionOffset) {
                    translationZ = translationZ;
                } else {
                    translationZ -= extensionHeight;
                }
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
        invertProfile = false,
    ) {
        try {
            // If existing points provided, use them directly
            let fullProfile;
            if (existingPoints && existingPoints.length > 0) {
                fullProfile = existingPoints;
            } else {
                // Get all points from the profile shape
                fullProfile = this._getCachedProfilePoints(profile, 64, "lathe");
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
                        (p.x - centerX) ** 2 + (p.y - baseY) ** 2,
                    ),
                }))
                .filter((p) => p.x >= -0.01) // Small tolerance for center line
                .sort((a, b) => a.y - b.y); // Sort by Y (bottom to top)

            if (rightHalf.length < 2) {
                this.log.warn(
                    "Not enough points for lathe profile, using fallback circle",
                );
                const r = toolRadius || 5;
                const pts = [];
                for (let i = 0; i <= 16; i++) {
                    const a = (i / 16) * Math.PI;
                    pts.push(
                        new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r),
                    );
                }
                return pts;
            }

            // Convert to Vector2 with (x = distance from axis, y = height)
            // For extensions, invert Y so lathe grows in same direction as extrusions
            const lathePoints = rightHalf.map(
                (p) =>
                    new THREE.Vector2(
                        Math.abs(p.x),
                        invertProfile ? -p.y : p.y,
                    ),
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
     * Create open half-profile points for sweep extrusion (left/right half)
     * Returns an open polyline (not closed) as Vector2 points
     * @param {THREE.Shape} profile - Profile shape (for fallback)
     * @param {Array<THREE.Vector2>} existingPoints - Optional: use these points instead of generating new ones
     * @param {string} half - "left" or "right"
    * @param {{useAnchorSplit?:boolean,anchorX?:number,anchorY?:number}} [splitOptions]
     * @returns {Array<THREE.Vector2>}
     */
    /**
     * Merge vertices at micro-angle junction between two extrusion meshes.
     * 
     * When the angle between two adjacent segments is very small (< 2°), creating a lathe
     * at the junction can cause self-intersecting geometry and non-manifold edges.
     * Instead, this method directly merges the last profile slice of the previous segment
     * with the first profile slice of the next segment by averaging their positions.
     * 
     * Uses nearest-neighbor matching with 1mm tolerance to handle slight profile misalignments.
     * 
     * @private
     * @param {THREE.Mesh} prevMesh - Previous segment mesh (with userData.contourPointCount and profilePointCount)
     * @param {THREE.Mesh} nextMesh - Next segment mesh (with userData.contourPointCount and profilePointCount)
     * @returns {number} Number of successfully merged vertex pairs
     */
    _mergeMicroAngleVertices(prevMesh, nextMesh) {
        try {
            const profileCount = prevMesh.userData.profilePointCount || 0;
            if (profileCount < 2) {
                this.log.warn("Cannot merge micro-angle vertices: profilePointCount not set");
                return 0;
            }

            const prevGeom = prevMesh.geometry;
            const nextGeom = nextMesh.geometry;
            const prevPos = prevGeom.attributes.position;
            const nextPos = nextGeom.attributes.position;

            const prevContourCount = prevMesh.userData.contourPointCount || 0;
            const nextContourCount = nextMesh.userData.contourPointCount || 0;
            const prevContourReversed = prevMesh.userData.contourReversed === true;
            const nextContourReversed = nextMesh.userData.contourReversed === true;

            if (prevContourCount < 1 || nextContourCount < 1) {
                this.log.warn("Cannot merge: contourPointCount not set");
                return 0;
            }

            // With reversed contour order, geometric "end"/"start" slices are swapped.
            const prevSliceStart = prevContourReversed
                ? 0
                : (prevContourCount - 1) * profileCount;
            const nextSliceStart = nextContourReversed
                ? (nextContourCount - 1) * profileCount
                : 0;

            // Update matrices to get world positions
            prevMesh.updateMatrixWorld(true);
            nextMesh.updateMatrixWorld(true);

            const v1 = new THREE.Vector3();
            const v2 = new THREE.Vector3();
            const avgPos = new THREE.Vector3();
            const invPrev = new THREE.Matrix4().copy(prevMesh.matrixWorld).invert();
            const invNext = new THREE.Matrix4().copy(nextMesh.matrixWorld).invert();

            let mergedCount = 0;
            const tolerance = EXTRUSION_CONSTANTS.MICRO_VERTEX_MERGE_TOLERANCE;

            // Collect world positions for both slices
            const prevSlicePositions = [];
            const nextSlicePositions = [];

            for (let i = 0; i < profileCount; i++) {
                const prevIdx = prevSliceStart + i;
                const nextIdx = nextSliceStart + i;

                if (prevIdx < prevPos.count && nextIdx < nextPos.count) {
                    const p1 = new THREE.Vector3()
                        .fromBufferAttribute(prevPos, prevIdx)
                        .applyMatrix4(prevMesh.matrixWorld);
                    const p2 = new THREE.Vector3()
                        .fromBufferAttribute(nextPos, nextIdx)
                        .applyMatrix4(nextMesh.matrixWorld);
                    
                    prevSlicePositions.push({ index: prevIdx, pos: p1 });
                    nextSlicePositions.push({ index: nextIdx, pos: p2 });
                }
            }

            if (prevSlicePositions.length !== nextSlicePositions.length) {
                this.log.warn(`Profile slice size mismatch: prev=${prevSlicePositions.length}, next=${nextSlicePositions.length}`);
                return 0;
            }

            // Match and merge vertices by finding closest pairs
            const matched = new Set();
            
            for (let i = 0; i < prevSlicePositions.length; i++) {
                const prevItem = prevSlicePositions[i];
                let bestDist = Infinity;
                let bestIdx = -1;

                // Find closest unmatched vertex in next slice
                for (let j = 0; j < nextSlicePositions.length; j++) {
                    if (matched.has(j)) continue;
                    
                    const nextItem = nextSlicePositions[j];
                    const dist = prevItem.pos.distanceTo(nextItem.pos);
                    
                    if (dist < bestDist && dist < tolerance) {
                        bestDist = dist;
                        bestIdx = j;
                    }
                }

                if (bestIdx >= 0) {
                    const nextItem = nextSlicePositions[bestIdx];
                    matched.add(bestIdx);

                    // Average position in world space
                    avgPos.addVectors(prevItem.pos, nextItem.pos).multiplyScalar(0.5);

                    // Convert back to local space and update
                    const localPrev = avgPos.clone().applyMatrix4(invPrev);
                    const localNext = avgPos.clone().applyMatrix4(invNext);

                    prevPos.setXYZ(prevItem.index, localPrev.x, localPrev.y, localPrev.z);
                    nextPos.setXYZ(nextItem.index, localNext.x, localNext.y, localNext.z);

                    mergedCount++;
                }
            }

            if (mergedCount > 0) {
                prevPos.needsUpdate = true;
                nextPos.needsUpdate = true;
                prevGeom.computeVertexNormals();
                nextGeom.computeVertexNormals();
                prevGeom.normalizeNormals();
                nextGeom.normalizeNormals();
            }

            return mergedCount;
        } catch (error) {
            this.log.error("Error merging micro-angle vertices:", error.message);
            return 0;
        }
    }

    /**
     * Calculate centroid of profile points
     * @private
     */
    _getProfileCentroid(points) {
        let sumX = 0,
            sumY = 0;
        points.forEach((p) => {
            sumX += p.x;
            sumY += p.y;
        });
        return {
            x: sumX / points.length,
            y: sumY / points.length,
        };
    }

    /**
     * Find intersection of line segment with vertical line (x = lineX)
     * @private
     */
    _getVerticalLineIntersection(p1, p2, lineX) {
        // Check if segment crosses the vertical line
        if (
            (p1.x <= lineX && p2.x <= lineX) ||
            (p1.x >= lineX && p2.x >= lineX)
        ) {
            return null; // Segment does not cross the line
        }

        // Parametric equation: P = p1 + t * (p2 - p1), t ∈ [0, 1]
        const t = (lineX - p1.x) / (p2.x - p1.x);
        const y = p1.y + t * (p2.y - p1.y);

        return { x: lineX, y, t };
    }

    /**
     * Find where profile intersects with vertical line through centroid
     * Handles profiles that already have points on the axis
     * @private
     */
    _findProfileIntersections(points, centroidX) {
        const intersections = [];
        const tolerance = 0.01; // Tolerance for being on the line
        const minSegmentDist = 0.5; // Minimum distance between intersection segments to avoid duplicates

        // First pass: find true edge crossings (segments crossing the vertical line)
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];

            const intersection = this._getVerticalLineIntersection(
                p1,
                p2,
                centroidX,
            );

            if (intersection) {
                intersections.push({
                    point: intersection,
                    segmentIndex: i,
                    t: intersection.t,
                    type: "crossing",
                });
            }
        }

        // Second pass: find profile points that lie exactly on the vertical line
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (Math.abs(p.x - centroidX) < tolerance) {
                // Check if this point is far enough from existing intersections
                let isDuplicate = false;
                for (const int1 of intersections) {
                    const dist = Math.hypot(
                        p.x - int1.point.x,
                        p.y - int1.point.y,
                    );
                    if (dist < tolerance) {
                        isDuplicate = true;
                        break;
                    }
                }

                if (!isDuplicate) {
                    intersections.push({
                        point: { x: centroidX, y: p.y },
                        segmentIndex: i,
                        t: 0, // Point is exactly on the vertex
                        type: "onAxis",
                    });
                }
            }
        }

        // Sort by segment index and Y coordinate for consistency
        intersections.sort((a, b) => {
            if (a.segmentIndex !== b.segmentIndex) {
                return a.segmentIndex - b.segmentIndex;
            }
            return a.point.y - b.point.y;
        });

        this.log.debug(
            `Found ${intersections.length} intersections with vertical line x=${centroidX.toFixed(
                2,
            )}:`,
            intersections.map(
                (int, idx) =>
                    `  ${idx}: seg${int.segmentIndex}(${int.type}) y=${int.point.y.toFixed(2)}`,
            ),
        );

        return intersections;
    }

    /**
     * Split profile by intersection points into two halves
     * Handles multiple intersections and ensures proper point ordering for both halves
     * @private
     */
    _splitProfileByIntersections(points, intersections) {
        // Filter and deduplicate intersections that are too close
        const filteredIntersections = [];
        const minDist = 0.01; // Minimum distance between distinct intersections

        for (const int1 of intersections) {
            let isDuplicate = false;
            for (const int2 of filteredIntersections) {
                const dist = Math.hypot(
                    int1.point.x - int2.point.x,
                    int1.point.y - int2.point.y,
                );
                if (dist < minDist) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                filteredIntersections.push(int1);
            }
        }

        if (filteredIntersections.length !== 2) {
            this.log.warn(
                `Expected 2 distinct intersections, found ${filteredIntersections.length} (original ${intersections.length}). Using fallback split.`,
            );
            return null;
        }

        // Sort intersections by segment index
        const sorted = [...filteredIntersections].sort(
            (a, b) => a.segmentIndex - b.segmentIndex,
        );
        const int1 = sorted[0];
        const int2 = sorted[1];

        this.log.debug(
            `Split intersections: int1@seg${int1.segmentIndex}(${int1.point.x.toFixed(
                2,
            )},${int1.point.y.toFixed(2)}) → int2@seg${int2.segmentIndex}(${int2.point.x.toFixed(
                2,
            )},${int2.point.y.toFixed(2)})`,
        );

        const leftPart = [];
        const rightPart = [];

        // LEFT PART: from int1 -> int2 following the profile (forward direction)
        // This creates the left half-profile in correct order
        leftPart.push(int1.point);

        for (let i = int1.segmentIndex + 1; i <= int2.segmentIndex; i++) {
            leftPart.push({
                x: points[i].x,
                y: points[i].y,
            });
        }

        leftPart.push(int2.point);

        // RIGHT PART: from int2 -> int1 following the profile (wrapping around, forward direction)
        // Start at int2, go forward (wrapping around), until we reach int1
        rightPart.push(int2.point);

        let i = int2.segmentIndex + 1;
        while (i % points.length !== (int1.segmentIndex + 1) % points.length) {
            rightPart.push({
                x: points[i % points.length].x,
                y: points[i % points.length].y,
            });
            i++;
        }

        rightPart.push(int1.point);

        // RIGHT PART: reverse to go from int1 -> int2 (same winding as left)
        // This ensures both halves follow the same direction convention
        rightPart.reverse();

        // CRITICAL FIX: Verify which part is actually left (x <= 0) and which is right (x >= 0)
        // For rectangular profiles, the split naming can be incorrect
        const centroidX = (int1.point.x + int2.point.x) / 2;

        // Calculate average X for each part
        const leftAvgX =
            leftPart.reduce((sum, p) => sum + p.x, 0) / leftPart.length;
        const rightAvgX =
            rightPart.reduce((sum, p) => sum + p.x, 0) / rightPart.length;

        // If leftPart has higher X than rightPart, they're swapped - fix it
        const needsSwap = leftAvgX > rightAvgX;

        if (needsSwap) {
            this.log.debug(
                `Swapping left/right parts AND reversing for correct winding: leftAvgX=${leftAvgX.toFixed(
                    2,
                )}, rightAvgX=${rightAvgX.toFixed(2)}`,
            );
            // When swapping, also reverse each part to maintain correct point order
            return {
                leftPart: rightPart.slice().reverse(),
                rightPart: leftPart.slice().reverse(),
            };
        }

        this.log.debug(
            `Split result: leftPart=${leftPart.length} points (avgX=${leftAvgX.toFixed(
                2,
            )}), rightPart=${rightPart.length} points (avgX=${rightAvgX.toFixed(2)})`,
        );

        return { leftPart, rightPart };
    }

    /**
     * Compute signed polygon area in XY plane.
     * Positive area = CCW winding, negative = CW winding.
     * @param {Array<{x:number,y:number}>} points
     * @returns {number}
     * @private
     */
    _computeSignedArea2D(points) {
        if (!Array.isArray(points) || points.length < 3) return 0;
        let area2 = 0;
        for (let i = 0; i < points.length; i++) {
            const a = points[i];
            const b = points[(i + 1) % points.length];
            area2 += a.x * b.y - b.x * a.y;
        }
        return area2 * 0.5;
    }

    /**
        * Normalize closed profile loop winding to canonical CW direction.
     * Removes duplicated closing point if present.
     * @param {Array<{x:number,y:number}>} points
     * @returns {Array<{x:number,y:number}>}
     * @private
     */
    _normalizeClosedProfilePointsWinding(points) {
        if (!Array.isArray(points) || points.length < 3) {
            return Array.isArray(points) ? points.slice() : [];
        }

        const cleaned = points.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
        if (cleaned.length > 1) {
            const first = cleaned[0];
            const last = cleaned[cleaned.length - 1];
            if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) {
                cleaned.pop();
            }
        }

        if (cleaned.length < 3) return cleaned;

        const signedArea = this._computeSignedArea2D(cleaned);
        if (signedArea > 0) {
            cleaned.reverse();
        }

        return cleaned;
    }

    createOpenHalfProfilePoints(profile, existingPoints = null, half = "left", splitOptions = {}) {
        try {
            // Calculate adaptive number of points based on profile shape complexity
            let pointsCount = 64; // Default fallback

            if (!existingPoints || existingPoints.length === 0) {
                // If profile has curves, calculate adaptive sampling
                if (profile.curves && profile.curves.length > 0) {
                    let totalLength = 0;
                    profile.curves.forEach((curve) => {
                        if (curve.getLength) {
                            totalLength += curve.getLength();
                        }
                    });

                    // Use arcDivisionCoefficient for adaptive sampling
                    // samples = length / coefficient
                    pointsCount = Math.max(
                        16,
                        Math.ceil(totalLength / this.arcDivisionCoefficient),
                    );

                    this.log.debug(
                        `Adaptive half-profile: totalLength=${totalLength.toFixed(
                            2,
                        )}mm, coefficient=${this.arcDivisionCoefficient
                        }, pointsCount=${pointsCount}`,
                    );
                }
            }

            let fullProfile;
            if (existingPoints && existingPoints.length > 0) {
                fullProfile = existingPoints;
            } else {
                fullProfile = this._getCachedProfilePoints(profile, pointsCount, "half");
            }

            // Canonicalize profile winding so half extraction is orientation-agnostic.
            fullProfile = this._normalizeClosedProfilePointsWinding(fullProfile);

            if (fullProfile.length < 3) {
                this.log.warn(
                    "Profile has less than 3 points, using fallback line",
                );
                return [new THREE.Vector2(0, 0), new THREE.Vector2(0, 1)];
            }

            // Get profile centroid
            const centroid = this._getProfileCentroid(fullProfile);

            const useAnchorSplit = splitOptions?.useAnchorSplit === true;
            const anchorX = Number(splitOptions?.anchorX ?? 0);
            const anchorY = Number(splitOptions?.anchorY ?? 0);
            const splitX = useAnchorSplit ? anchorX : centroid.x;

            // Find where profile intersects with vertical line through split axis
            const intersections = this._findProfileIntersections(
                fullProfile,
                splitX,
            );

            let halfPointsRaw;

            if (intersections.length >= 2) {
                // We have at least 2 intersections - try to split
                // If more than 2, take the top 2 (most separated vertically)
                let intsToUse = intersections;

                if (intersections.length > 2) {
                    // Sort by Y coordinate and take top and bottom
                    const sortedByY = [...intersections].sort(
                        (a, b) => a.point.y - b.point.y,
                    );
                    intsToUse = [sortedByY[0], sortedByY[sortedByY.length - 1]];

                    // But we need to reorder them by segment index for splitting
                    intsToUse.sort((a, b) => a.segmentIndex - b.segmentIndex);

                    this.log.info(
                        `Multiple intersections found (${intersections.length}), using top and bottom for split`,
                    );
                }

                // Temporarily modify intersections for split
                const tempIntersections = intsToUse.slice();
                const split = this._splitProfileByIntersections(
                    fullProfile,
                    tempIntersections,
                );

                if (split) {
                    halfPointsRaw =
                        half === "left" ? split.leftPart : split.rightPart;

                    this.log.debug(
                        `Split profile into ${half} half: ${halfPointsRaw.length} points`,
                    );
                } else {
                    this.log.warn(
                        "Failed to split profile, using fallback filter",
                    );
                    halfPointsRaw = null;
                }
            } else if (intersections.length === 1) {
                this.log.warn(
                    `Only 1 intersection found, profile may be asymmetric. Using fallback filter.`,
                );
                halfPointsRaw = null;
            } else {
                this.log.warn(
                    `No intersections found (0). Profile may be entirely on one side. Using fallback filter.`,
                );
                halfPointsRaw = null;
            }

            // Fallback: simple filter if split failed
            if (!halfPointsRaw) {
                this.log.debug(
                    `Using fallback filter: half="${half}" relative to centroid x=${centroid.x.toFixed(
                        2,
                    )}`,
                );
                halfPointsRaw = fullProfile.filter((p) =>
                    half === "left"
                        ? p.x <= splitX + 0.01
                        : p.x >= splitX - 0.01,
                );
            }

            if (halfPointsRaw.length < 2) {
                this.log.warn(
                    "Not enough points for open half profile after split, using fallback line",
                );
                return [new THREE.Vector2(0, 0), new THREE.Vector2(0, 1)];
            }

            // Find minimum Y (bottom of profile) for baseline
            const minY = Math.min(...fullProfile.map((p) => p.y));

            // Normalize coordinates to requested split/origin policy.
            // Default: center-bottom (legacy). Anchor mode: split from profile anchor.
            const xOrigin = useAnchorSplit ? anchorX : centroid.x;
            const yOrigin = useAnchorSplit ? anchorY : minY;
            const normalizedPoints = halfPointsRaw.map((p) => ({
                x: p.x - xOrigin,
                y: p.y - yOrigin,
            }));

            // Verify the half is correct after normalization
            const avgNormX =
                normalizedPoints.reduce((sum, p) => sum + p.x, 0) /
                normalizedPoints.length;
            this.log.debug(
                `Normalized ${half} half: ${normalizedPoints.length} points, avgX=${avgNormX.toFixed(3)} (expected ${half === "left" ? "negative" : "positive"})`,
            );

            // Ensure center point (x=0) exists in the profile
            const centerPointExists = normalizedPoints.some(
                (p) => Math.abs(p.x) < 0.001,
            );

            if (!centerPointExists && normalizedPoints.length > 0) {
                // Add center points at endpoints for proper closure
                const minY_p = Math.min(...normalizedPoints.map((p) => p.y));
                const maxY_p = Math.max(...normalizedPoints.map((p) => p.y));

                normalizedPoints.push({ x: 0, y: minY_p });
                normalizedPoints.push({ x: 0, y: maxY_p });

                this.log.debug(
                    `Added center points to half-profile: now ${normalizedPoints.length} points`,
                );
            }

            return normalizedPoints.map((p) => new THREE.Vector2(p.x, p.y));
        } catch (e) {
            this.log.error("Error creating open half profile:", e);
            return [new THREE.Vector2(0, 0), new THREE.Vector2(0, 1)];
        }
    }

    /**
     * Merge multiple extrude meshes into a single solid using CSG ADDITION
     * Combines all segment and lathe meshes into one unified geometry
     * @param {Array<THREE.Mesh>} meshes - Array of extrude meshes to merge
     * @returns {THREE.Mesh|null} Single merged mesh or null if merge fails
     */
    mergeExtrudeMeshes(meshes, color = null) {
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
                0,
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
                "geometries for merging",
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

            // Apply mesh repair if enabled (post-extrusion validation)
            let finalGeometry = weldedGeometry;
            if (appConfig.meshRepair.enabled) {
                const repairInstance = getRepairInstance(appConfig.meshRepair);
                finalGeometry = repairInstance.repairAndValidate(
                    weldedGeometry,
                    {
                        repairLevel: appConfig.meshRepair.repairLevel,
                        logRepairs: appConfig.meshRepair.logRepairs,
                        stage: "post-extrusion", // For telemetry tracking
                    },
                );
            }

            // Ensure normals are computed correctly
            finalGeometry.computeVertexNormals();
            finalGeometry.normalizeNormals();

            // Create material for merged mesh
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color || "#cccccc"),
                roughness: 0.5,
                metalness: 0.2,
                side: THREE.FrontSide,
                wireframe: this.materialManager
                    ? this.materialManager.isWireframeEnabled()
                    : false,
            });

            const mergedMesh = new THREE.Mesh(finalGeometry, material);
            mergedMesh.castShadow = true;
            mergedMesh.receiveShadow = true;
            mergedMesh.userData.isMergedExtrude = true;

            this.log.info(
                "Successfully merged",
                meshesToMerge.length,
                "meshes",
                {
                    matchedVertices: matchedVerticesTotal,
                },
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
                    `Mesh has ${openEdges} open edges out of ${totalEdges} total edges`,
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
    /**
     * Get precise tangent direction at parameter t for a Three.js curve.
     * Falls back to numerical finite-difference when getTangent() is unavailable.
     * @private
     */
    _getCurveTangent(curve, t) {
        if (curve && typeof curve.getTangent === "function") {
            const tangent = curve.getTangent(t);
            if (tangent && tangent.lengthSq() > 1e-12) {
                return tangent.clone().normalize();
            }
        }
        if (!curve || typeof curve.getPoint !== "function") {
            return new THREE.Vector3(1, 0, 0);
        }
        const eps = 1e-4;
        const t0 = Math.max(0, Math.min(1, t - eps));
        const t1 = Math.max(0, Math.min(1, t + eps));
        const p0 = curve.getPoint(t0);
        const p1 = curve.getPoint(t1);
        const delta = new THREE.Vector3().subVectors(p1, p0);
        if (delta.lengthSq() < 1e-12) return new THREE.Vector3(1, 0, 0);
        return delta.normalize();
    }

    /**
     * Sample a list of Three.js curves into a 3-D polyline, respecting arc
     * division coefficient and deduplicating shared junction points.
     * @param {THREE.Curve[]} curves
     * @returns {THREE.Vector3[]}
     * @private
     */
    _sampleCurvesToContour(curves) {
        const contourPoints = [];
        for (const curve of curves) {
            const len = curve.getLength ? curve.getLength() : 0;
            const isLine =
                curve.segmentType === "LINE" ||
                curve instanceof THREE.LineCurve3;
            const samples = isLine
                ? 1
                : Math.max(2, Math.ceil(len / this.arcDivisionCoefficient));
            const points = curve.getPoints(samples);
            if (contourPoints.length === 0) {
                contourPoints.push(...points.map((p) => p.clone()));
            } else {
                const firstNew = points[0];
                const lastExisting = contourPoints[contourPoints.length - 1];
                const startIdx =
                    lastExisting.distanceTo(firstNew) <
                    EXTRUSION_CONSTANTS.PATH_GAP_TOLERANCE
                        ? 1
                        : 0;
                for (let i = startIdx; i < points.length; i++) {
                    contourPoints.push(points[i].clone());
                }
            }
        }
        return contourPoints;
    }

    /**
     * Trim arc/curve group endpoints so that the first and last chord of each
     * arc group is long enough to avoid self-intersection at miter joints.
     *
     * Rule: chord ≥ bitRadius · 1.05 · tan(θ/2) where θ is the exterior turn
     * angle at that junction.  The loop is self-consistent — chord direction and
     * θ are re-evaluated after each removed point, yielding minimal deviation
     * from the original arc path.
     *
     * @param {Array<{type:string, curves:THREE.Curve[]}>} curveGroups
     * @param {THREE.Vector3[][]} groupContours - sampled per-group contours (mutated in-place)
     * @param {boolean} isClosedPath
     * @param {number} bitRadius - maximum half-profile width
     * @private
     */
    _trimArcEndpointChords(curveGroups, groupContours, isClosedPath, bitRadius) {
        const SAFETY_FACTOR = 1.05;
        const MIN_TRIM_ANGLE = THREE.MathUtils.degToRad(5);
        const nGroups = curveGroups.length;

        const calcMinChord = (turnAngle) => {
            if (turnAngle < MIN_TRIM_ANGLE) return 0;
            const halfTan = Math.tan(turnAngle * 0.5);
            if (halfTan < 1e-9) return 0;
            return bitRadius * SAFETY_FACTOR * halfTan;
        };

        for (let i = 0; i < nGroups; i++) {
            const group = curveGroups[i];
            if (group.type === "LINE") continue;

            const contour = groupContours[i];
            if (!contour || contour.length < 3) continue;

            // START endpoint: junction with previous group
            const prevIdx = isClosedPath ? (i - 1 + nGroups) % nGroups : i - 1;
            if (prevIdx >= 0 && prevIdx < nGroups) {
                const prevContourRef = groupContours[prevIdx];
                const prevDirRef = (() => {
                    if (prevContourRef && prevContourRef.length >= 2) {
                        const n = prevContourRef.length;
                        const v = new THREE.Vector3().subVectors(
                            prevContourRef[n - 1], prevContourRef[n - 2]);
                        if (v.lengthSq() > 1e-12) return v.normalize();
                    }
                    const pg = curveGroups[prevIdx];
                    return this._getCurveTangent(pg.curves[pg.curves.length - 1], 1);
                })();

                while (contour.length > 2) {
                    const firstVec = new THREE.Vector3().subVectors(contour[1], contour[0]);
                    const firstChordLen = firstVec.length();
                    if (firstChordLen < 1e-12) { contour.splice(1, 1); continue; }
                    const firstChordDir = firstVec.clone().divideScalar(firstChordLen);
                    const dot = Math.max(-1, Math.min(1, prevDirRef.dot(firstChordDir)));
                    const minChord = calcMinChord(Math.acos(dot));
                    if (minChord <= 0 || firstChordLen >= minChord) break;
                    contour.splice(1, 1);
                }
            }

            // END endpoint: junction with next group
            const nextIdx = isClosedPath ? (i + 1) % nGroups : i + 1;
            if (nextIdx < nGroups) {
                const nextContourRef = groupContours[nextIdx];
                const nextDirRef = (() => {
                    if (nextContourRef && nextContourRef.length >= 2) {
                        const v = new THREE.Vector3().subVectors(
                            nextContourRef[1], nextContourRef[0]);
                        if (v.lengthSq() > 1e-12) return v.normalize();
                    }
                    return this._getCurveTangent(curveGroups[nextIdx].curves[0], 0);
                })();

                while (contour.length > 2) {
                    const m = contour.length;
                    const lastVec = new THREE.Vector3().subVectors(
                        contour[m - 1], contour[m - 2]);
                    const lastChordLen = lastVec.length();
                    if (lastChordLen < 1e-12) { contour.splice(m - 2, 1); continue; }
                    const lastChordDir = lastVec.clone().divideScalar(lastChordLen);
                    const dot = Math.max(-1, Math.min(1, lastChordDir.dot(nextDirRef)));
                    const minChord = calcMinChord(Math.acos(dot));
                    if (minChord <= 0 || lastChordLen >= minChord) break;
                    contour.splice(m - 2, 1);
                }
            }
        }
    }

    dispose() {
        this.profilePointsCache.clear();
        this.log.info("Disposed");
    }
}
