/**
 * CustomOffsetProcessor - custom SVG offset with line/arc/bezier output.
 * Provides a compatible API with PaperOffsetProcessor while allowing extensions.
 */

import LoggerFactory from "../core/LoggerFactory.js";
import { ARC_APPROX_TOLERANCE } from "../config/constants.js";
import { approximatePath, segmentsToSVGPath } from "../utils/arcApproximation.js";
import { getPathOrientation } from "../utils/fillet.js";
import { resolveSelfIntersections } from "./PaperBooleanProcessor.js";
// OLD offset imports removed - module being replaced
import {
    createContourMetadataStageDeps,
    createContourResultBuilder,
    createSelfIntersectionStageDeps,
    createFallbackStageDeps,
} from "./offset/OffsetStageDepsFactory.js";

const log = LoggerFactory.createLogger("CustomOffsetProcessor");

/**
 * GEOM_EPSILON (1e-6): Geometric validity checks
 * - Guards against floating-point precision limits
 * - Used in: vector normalization, length tests, intersection math
 */
const EPSILON = 1e-6;

/**
 * JOIN_TOLERANCE (0.001): Gap detection for miter joins
 * - Determines bridge line insertion in applyMiterJoin()
 * - Used in: offset segment joining, bridge insertion
 */
const JOIN_TOLERANCE = 0.001;

/**
 * STITCH_TOLERANCE (0.5): Final segment stitching cleanup
 * - Snaps distant endpoints in stitchSegments()
 * - Used in: final path assembly, gap closure
 */
const STITCH_TOLERANCE = 0.5;

/**
 * @typedef {Object} CustomOffsetOptions
 * @property {"miter"|"bevel"|"round"} [join]
 * @property {"butt"|"round"} [cap]
 * @property {number} [limit]
 * @property {"all"|"inner"|"outer"} [cornerSelection]
 * @property {boolean} [useArcApproximation]
 * @property {number} [arcTolerance]
 * @property {Object} [exportModule]
 * @property {boolean} [forceReverseOutput]
 * @property {number} [stitchTolerance]
 * @property {number} [outputPrecision]
 * @property {boolean} [trimSelfIntersections]
 * @property {boolean} [debugTrace]
 * @property {"legacy-inverted"|"direct"} [offsetSignMode]
 * @property {boolean} [enableHybridFallback]
 * @property {boolean} [fallbackDiagnostics]
 */

/**
 * @typedef {Object} OffsetContourResult
 * @property {string} pathData
 * @property {Array} segments
 * @property {boolean} closed
 * @property {"cw"|"ccw"|"open"} orientation
 * @property {number} signedArea
 * @property {number} absoluteArea
 * @property {{ minX: number, minY: number, maxX: number, maxY: number }} bbox
 * @property {number} containmentDepth
 * @property {boolean} fallbackApplied
 * @property {string|null} fallbackReason
 */

function resolveOffsetDistance(offset, options = {}) {
    return options.offsetSignMode === "direct" ? offset : -offset;
}

function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isNear(a, b, tolerance = EPSILON) {
    return distance(a, b) <= tolerance;
}

function normalize(vec) {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    if (len < EPSILON) return { x: 0, y: 0 };
    return { x: vec.x / len, y: vec.y / len };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function cross(a, b) {
    return a.x * b.y - a.y * b.x;
}

function leftNormal(vec) {
    return { x: -vec.y, y: vec.x };
}

function clonePoint(point) {
    return { x: point.x, y: point.y };
}

function cloneSegment(segment) {
    const cloned = {
        ...segment,
        start: clonePoint(segment.start),
        end: clonePoint(segment.end),
    };

    if (segment.cp1) cloned.cp1 = clonePoint(segment.cp1);
    if (segment.cp2) cloned.cp2 = clonePoint(segment.cp2);
    if (segment.arc) cloned.arc = { ...segment.arc };

    return cloned;
}

function importSVGToPathData(svgElement) {
    if (!svgElement) return "";

    const tag = svgElement.tagName.toLowerCase();
    if (tag === "path") {
        return svgElement.getAttribute("d") || "";
    }

    if (tag === "rect") {
        const x = parseFloat(svgElement.getAttribute("x")) || 0;
        const y = parseFloat(svgElement.getAttribute("y")) || 0;
        const width = parseFloat(svgElement.getAttribute("width")) || 0;
        const height = parseFloat(svgElement.getAttribute("height")) || 0;

        return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${
            y + height
        } L ${x} ${y + height} Z`;
    }

    if (tag === "polygon") {
        const points = (svgElement.getAttribute("points") || "")
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        if (points.length < 4) return "";
        const pairs = [];
        for (let i = 0; i < points.length; i += 2) {
            pairs.push(`${points[i]} ${points[i + 1]}`);
        }
        return `M ${pairs.join(" L ")} Z`;
    }

    return svgElement.getAttribute("d") || "";
}

function splitSegmentsIntoContours(segments) {
    const contours = [];
    let current = [];

    for (const segment of segments) {
        if (current.length > 0) {
            const prev = current[current.length - 1];
            if (!isNear(prev.end, segment.start, JOIN_TOLERANCE)) {
                contours.push(current);
                current = [];
            }
        }
        current.push(segment);
    }

    if (current.length > 0) {
        contours.push(current);
    }

    return contours;
}

function contourToPoints(segments) {
    const points = [];
    if (!segments || segments.length === 0) return points;

    points.push(clonePoint(segments[0].start));
    for (const segment of segments) {
        points.push(clonePoint(segment.end));
    }
    return points;
}

function computeAngleDelta(startAngle, endAngle, sweepFlag) {
    let delta = endAngle - startAngle;
    if (sweepFlag === 1 && delta < 0) delta += Math.PI * 2;
    if (sweepFlag === 0 && delta > 0) delta -= Math.PI * 2;
    return delta;
}

function offsetLineSegment(segment, offset) {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < EPSILON) return null;

    const normal = { x: -dy / len, y: dx / len };

    return {
        type: "line",
        start: {
            x: segment.start.x + normal.x * offset,
            y: segment.start.y + normal.y * offset,
        },
        end: {
            x: segment.end.x + normal.x * offset,
            y: segment.end.y + normal.y * offset,
        },
    };
}

function offsetBezierSegment(segment, offset) {
    const p0 = segment.start;
    const p1 = segment.cp1;
    const p2 = segment.cp2;
    const p3 = segment.end;

    let t0 = normalize({ x: p1.x - p0.x, y: p1.y - p0.y });
    if (Math.sqrt(t0.x * t0.x + t0.y * t0.y) < EPSILON) {
        t0 = normalize({ x: p2.x - p0.x, y: p2.y - p0.y });
    }
    let t1 = normalize({ x: p3.x - p2.x, y: p3.y - p2.y });
    if (Math.sqrt(t1.x * t1.x + t1.y * t1.y) < EPSILON) {
        t1 = normalize({ x: p3.x - p1.x, y: p3.y - p1.y });
    }

    const n0 = leftNormal(t0);
    const n1 = leftNormal(t1);

    return {
        type: "bezier",
        start: { x: p0.x + n0.x * offset, y: p0.y + n0.y * offset },
        cp1: { x: p1.x + n0.x * offset, y: p1.y + n0.y * offset },
        cp2: { x: p2.x + n1.x * offset, y: p2.y + n1.y * offset },
        end: { x: p3.x + n1.x * offset, y: p3.y + n1.y * offset },
    };
}

function offsetArcSegment(segment, offset, options = {}) {
    const arc = segment.arc;
    if (!arc || arc.centerX === undefined || arc.centerY === undefined) return null;

    const radius = arc.radius || arc.rx || 0;
    if (radius < EPSILON) return null;

    // Determine radial sign: +1 means increasing the radius offsets in the `offset` direction.
    const delta     = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const midAngle  = arc.startAngle + delta / 2;
    const radial    = { x: Math.cos(midAngle), y: Math.sin(midAngle) };
    const tangSign  = (arc.sweepFlag ?? 1) === 1 ? 1 : -1;
    const tangent   = { x: -Math.sin(midAngle) * tangSign, y: Math.cos(midAngle) * tangSign };
    const radialSign = dot(leftNormal(tangent), radial) >= 0 ? 1 : -1;

    const newRadius = radius + offset * radialSign;
    const sweepAbs = Math.abs(delta);
    const newArcLength = newRadius * sweepAbs;
    const branchCollapsedByDiameter = offset * radialSign > 0 && Math.abs(offset) > radius * 2 + EPSILON;
    if (newRadius <= EPSILON || sweepAbs <= EPSILON || newArcLength <= EPSILON || branchCollapsedByDiameter) {
        // Arc degenerates.  Instead of collapsing to the center, compute the
        // "offset tangent-line" reference point for each endpoint.  This is
        // the position obtained by shifting the original arc endpoint along its
        // own outward normal by `offset`.  These positions are later used in
        // applyMiterJoin to find the correct miter corners with the neighbouring
        // segments, even when the arc itself has vanished.
        const origStart = {
            x: arc.centerX + Math.cos(arc.startAngle) * radius,
            y: arc.centerY + Math.sin(arc.startAngle) * radius,
        };
        const origEnd = {
            x: arc.centerX + Math.cos(arc.endAngle) * radius,
            y: arc.centerY + Math.sin(arc.endAngle) * radius,
        };
        const startTang = { x: -Math.sin(arc.startAngle) * tangSign, y: Math.cos(arc.startAngle) * tangSign };
        const endTang   = { x: -Math.sin(arc.endAngle)   * tangSign, y: Math.cos(arc.endAngle)   * tangSign };
        const startNorm = leftNormal(startTang);
        const endNorm   = leftNormal(endTang);
        return {
            type: "arc",
            degenerate: true,
            start: { x: origStart.x + startNorm.x * offset, y: origStart.y + startNorm.y * offset },
            end:   { x: origEnd.x   + endNorm.x   * offset, y: origEnd.y   + endNorm.y   * offset },
            arc: {
                centerX: arc.centerX, centerY: arc.centerY,
                startAngle: arc.startAngle, endAngle: arc.endAngle,
                sweepFlag: arc.sweepFlag ?? 1,
                radius: 0, rx: 0, ry: 0, largeArcFlag: 0,
                xAxisRotation: arc.xAxisRotation || 0,
            },
        };
    }

    // Center and sweep angles are unchanged — only the radius grows or shrinks.
    return {
        type: "arc",
        start: {
            x: arc.centerX + Math.cos(arc.startAngle) * newRadius,
            y: arc.centerY + Math.sin(arc.startAngle) * newRadius,
        },
        end: {
            x: arc.centerX + Math.cos(arc.endAngle) * newRadius,
            y: arc.centerY + Math.sin(arc.endAngle) * newRadius,
        },
        arc: {
            radius: newRadius, rx: newRadius, ry: newRadius,
            xAxisRotation: arc.xAxisRotation || 0,
            largeArcFlag: Math.abs(delta) > Math.PI ? 1 : 0,
            sweepFlag: arc.sweepFlag ?? 1,
            centerX: arc.centerX, centerY: arc.centerY,
            startAngle: arc.startAngle, endAngle: arc.endAngle,
        },
    };
}

function tangentAtEnd(segment) {
    if (segment.type === "line") {
        return normalize({
            x: segment.end.x - segment.start.x,
            y: segment.end.y - segment.start.y,
        });
    }

    if (segment.type === "bezier") {
        return normalize({
            x: segment.end.x - segment.cp2.x,
            y: segment.end.y - segment.cp2.y,
        });
    }

    if (segment.type === "arc" && segment.arc) {
        const arc = segment.arc;
        const sweepFlag = arc.sweepFlag ?? 1;
        const angle = arc.endAngle;
        const sign = sweepFlag === 1 ? 1 : -1;
        return normalize({
            x: -Math.sin(angle) * sign,
            y: Math.cos(angle) * sign,
        });
    }

    return { x: 0, y: 0 };
}

function tangentAtStart(segment) {
    if (segment.type === "line") {
        return normalize({
            x: segment.end.x - segment.start.x,
            y: segment.end.y - segment.start.y,
        });
    }

    if (segment.type === "bezier") {
        return normalize({
            x: segment.cp1.x - segment.start.x,
            y: segment.cp1.y - segment.start.y,
        });
    }

    if (segment.type === "arc" && segment.arc) {
        const arc = segment.arc;
        const sweepFlag = arc.sweepFlag ?? 1;
        const angle = arc.startAngle;
        const sign = sweepFlag === 1 ? 1 : -1;
        return normalize({
            x: -Math.sin(angle) * sign,
            y: Math.cos(angle) * sign,
        });
    }

    return { x: 0, y: 0 };
}

function lineIntersection(p1, dir1, p2, dir2) {
    const rxs = cross(dir1, dir2);
    if (Math.abs(rxs) < EPSILON) return null;

    const qmp = { x: p2.x - p1.x, y: p2.y - p1.y };
    const t = cross(qmp, dir2) / rxs;
    return { x: p1.x + dir1.x * t, y: p1.y + dir1.y * t };
}

/** Intersections of infinite line (through linePoint, direction lineDir) with a circle. */
function lineCircleIntersections(linePoint, lineDir, center, radius) {
    const dx = lineDir.x, dy = lineDir.y;
    const fx = linePoint.x - center.x, fy = linePoint.y - center.y;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || Math.abs(a) < EPSILON) return [];
    const sq = Math.sqrt(Math.max(0, disc));
    return [
        { x: linePoint.x + dx * (-b - sq) / (2 * a), y: linePoint.y + dy * (-b - sq) / (2 * a) },
        { x: linePoint.x + dx * (-b + sq) / (2 * a), y: linePoint.y + dy * (-b + sq) / (2 * a) },
    ];
}

/** Intersections of two circles. Returns 0–2 points. */
function circleCircleIntersections(cA, rA, cB, rB) {
    const dx = cB.x - cA.x, dy = cB.y - cA.y;
    const d = Math.hypot(dx, dy);
    if (d < EPSILON || d > rA + rB + EPSILON || d < Math.abs(rA - rB) - EPSILON) return [];
    const a = (rA * rA - rB * rB + d * d) / (2 * d);
    const h2 = rA * rA - a * a;
    if (h2 < -EPSILON) return [];
    const h = Math.sqrt(Math.max(0, h2));
    const mx = cA.x + a * dx / d, my = cA.y + a * dy / d;
    if (h <= EPSILON) return [{ x: mx, y: my }];
    const rx = -dy * h / d, ry = dx * h / d;
    return [{ x: mx + rx, y: my + ry }, { x: mx - rx, y: my - ry }];
}

/**
 * Returns true if trimming the arc's END to point I would only shorten
 * (or leave unchanged) the arc. Extending is not allowed.
 */
function isValidEndTrim(arc, I) {
    const r = arc.radius || arc.rx || 0;
    const startPoint = {
        x: arc.centerX + Math.cos(arc.startAngle) * r,
        y: arc.centerY + Math.sin(arc.startAngle) * r,
    };
    const endpointTolerance = Math.max(1e-4, r * 8e-4);
    if (distance(I, startPoint) <= endpointTolerance) return true;

    const θI = Math.atan2(I.y - arc.centerY, I.x - arc.centerX);

    const origSweep = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const sweepToI  = computeAngleDelta(arc.startAngle, θI, arc.sweepFlag ?? 1);
    // Same direction as original sweep AND no longer than it.
    return sweepToI * origSweep > 0 && Math.abs(sweepToI) <= Math.abs(origSweep) + EPSILON;
}

/**
 * Returns true if trimming the arc's START to point I would only shorten
 * (or leave unchanged) the arc. Extending is not allowed.
 */
function isValidStartTrim(arc, I) {
    const r = arc.radius || arc.rx || 0;
    const endPoint = {
        x: arc.centerX + Math.cos(arc.endAngle) * r,
        y: arc.centerY + Math.sin(arc.endAngle) * r,
    };
    const endpointTolerance = Math.max(1e-4, r * 8e-4);
    if (distance(I, endPoint) <= endpointTolerance) return true;

    const θI = Math.atan2(I.y - arc.centerY, I.x - arc.centerX);

    const origSweep = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const sweepToI = computeAngleDelta(arc.startAngle, θI, arc.sweepFlag ?? 1);
    // Point must lie on original directed arc span. New sweep is orig - sweepToI.
    return sweepToI * origSweep > 0 && Math.abs(sweepToI) <= Math.abs(origSweep) + EPSILON;
}

function trimmedEndSweepAbs(arc, point) {
    const r = arc.radius || arc.rx || 0;
    const startPoint = {
        x: arc.centerX + Math.cos(arc.startAngle) * r,
        y: arc.centerY + Math.sin(arc.startAngle) * r,
    };
    const endpointTolerance = Math.max(1e-4, r * 8e-4);
    if (distance(point, startPoint) <= endpointTolerance) return 0;

    const theta = Math.atan2(point.y - arc.centerY, point.x - arc.centerX);

    return Math.abs(computeAngleDelta(arc.startAngle, theta, arc.sweepFlag ?? 1));
}

function trimmedStartSweepAbs(arc, point) {
    const r = arc.radius || arc.rx || 0;
    const endPoint = {
        x: arc.centerX + Math.cos(arc.endAngle) * r,
        y: arc.centerY + Math.sin(arc.endAngle) * r,
    };
    const endpointTolerance = Math.max(1e-4, r * 8e-4);
    if (distance(point, endPoint) <= endpointTolerance) return 0;

    const theta = Math.atan2(point.y - arc.centerY, point.x - arc.centerX);

    const origSweep = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const sweepToI = computeAngleDelta(arc.startAngle, theta, arc.sweepFlag ?? 1);
    return Math.abs(origSweep - sweepToI);
}

/**
 * Trim the end of a segment to a new point:
 * - LINE: relocates the endpoint; marks degenerate if direction flips.
 * - ARC:  projects the point onto the arc circle, adjusts endAngle;
 *         marks degenerate if the sweep collapses to zero or inverts.
 */
function trimSegmentEnd(segment, point) {
    if (segment.type === "line" || (segment.type === "arc" && segment.degenerate)) {
        // Degenerate arcs carry start/end reference points (the offset tangent-line
        // positions) and behave as lines for trimming.  Treat them identically.
        const odx = segment.end.x - segment.start.x;
        const ody = segment.end.y - segment.start.y;
        segment.end = clonePoint(point);
        const ndx = segment.end.x - segment.start.x;
        const ndy = segment.end.y - segment.start.y;
        if (distance(segment.start, segment.end) < EPSILON ||
            odx * ndx + ody * ndy < -EPSILON) {
            segment.degenerate = true;
        }
    } else if (segment.type === "arc" && segment.arc && !segment.degenerate) {
        const { centerX, centerY } = segment.arc;
        const r = segment.arc.radius || segment.arc.rx || 0;
        const origSweep = computeAngleDelta(segment.arc.startAngle, segment.arc.endAngle, segment.arc.sweepFlag ?? 1);
        const origSweepAbs = Math.abs(origSweep);
        const angle = Math.atan2(point.y - centerY, point.x - centerX);
        const startPoint = {
            x: centerX + Math.cos(segment.arc.startAngle) * r,
            y: centerY + Math.sin(segment.arc.startAngle) * r,
        };
        const endpointTolerance = Math.max(1e-4, r * 8e-4);
        const sweepToI = computeAngleDelta(segment.arc.startAngle, angle, segment.arc.sweepFlag ?? 1);
        segment.arc.endAngle = angle;
        segment.end = { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
        const newSweep = distance(point, startPoint) <= endpointTolerance ? 0 : sweepToI;
        segment.arc.largeArcFlag = Math.abs(newSweep) > Math.PI ? 1 : 0;
        // Degenerate not only on zero/flip sweep, but also on sweep extension.
        // When near-zero arcs cross the branch cut, sweep can wrap to ~2PI and "flip".
        if (origSweepAbs <= EPSILON || Math.abs(newSweep) < EPSILON || newSweep * origSweep <= 0 || Math.abs(newSweep) > origSweepAbs + EPSILON) {
            segment.degenerate = true;
        }
    }
    // Degenerate arcs are collapsed to their reference point — cannot be trimmed.
}

/**
 * Trim the start of a segment to a new point.
 * - LINE: relocates the start-point; marks degenerate if direction flips.
 * - ARC:  projects the point onto the arc circle, adjusts startAngle;
 *         marks degenerate if the sweep collapses to zero or inverts.
 */
function trimSegmentStart(segment, point) {
    if (segment.type === "line" || (segment.type === "arc" && segment.degenerate)) {
        const odx = segment.end.x - segment.start.x;
        const ody = segment.end.y - segment.start.y;
        segment.start = clonePoint(point);
        const ndx = segment.end.x - segment.start.x;
        const ndy = segment.end.y - segment.start.y;
        if (distance(segment.start, segment.end) < EPSILON ||
            odx * ndx + ody * ndy < -EPSILON) {
            segment.degenerate = true;
        }
    } else if (segment.type === "arc" && segment.arc && !segment.degenerate) {
        const { centerX, centerY } = segment.arc;
        const r = segment.arc.radius || segment.arc.rx || 0;
        const origSweep = computeAngleDelta(segment.arc.startAngle, segment.arc.endAngle, segment.arc.sweepFlag ?? 1);
        const origSweepAbs = Math.abs(origSweep);
        const oldStartAngle = segment.arc.startAngle;
        const angle = Math.atan2(point.y - centerY, point.x - centerX);
        const endPoint = {
            x: centerX + Math.cos(segment.arc.endAngle) * r,
            y: centerY + Math.sin(segment.arc.endAngle) * r,
        };
        const endpointTolerance = Math.max(1e-4, r * 8e-4);
        const sweepToI = computeAngleDelta(oldStartAngle, angle, segment.arc.sweepFlag ?? 1);
        segment.arc.startAngle = angle;
        segment.start = { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
        const newSweep = distance(point, endPoint) <= endpointTolerance ? 0 : origSweep - sweepToI;
        segment.arc.largeArcFlag = Math.abs(newSweep) > Math.PI ? 1 : 0;
        if (origSweepAbs <= EPSILON || Math.abs(newSweep) < EPSILON || newSweep * origSweep <= 0 || Math.abs(newSweep) > origSweepAbs + EPSILON) {
            segment.degenerate = true;
        }
    }
    // Degenerate arcs are collapsed to their reference point — cannot be trimmed.
}

/**
 * Apply join between curr (end) and next (start).
 *
 * Phase 1 — Geometric intersection (circle–line, circle–circle, line–line):
 *   Find the actual intersection of the two offset curves.
 *   For arcs: the candidate is only accepted if it lies WITHIN the arc's
 *   current angular span (i.e., it shortens the arc, never lengthens it).
 *   Both segments are trimmed to the intersection → clean join, no bridge.
 *
 * Phase 2 — Arc-arc tangential miter fallback:
 *   If both neighbors are arcs and geometric intersection fails, intersect
 *   their end/start tangent rays and bridge through that single corner point.
 *   This avoids rectangular 3-segment bridges and preserves tangential intent.
 *
 * Phase 3 — Miter fallback (tangent lines only):
 *   If no valid geometric intersection is found, intersect the tangent rays.
 *   Only LINE endpoints move; arc endpoints stay fixed.
 *   A bridge line is emitted for any remaining gap.
 *
 * @param {Object} curr        - Current segment (modified in-place).
 * @param {Object} next        - Next segment    (modified in-place).
 * @param {number} maxMiterLen - Max distance each endpoint may move.
 * @param {number} offset       - Offset distance (used for fallback policies).
 * @returns {Array<Object>|null} Bridge lines to insert, or null for a clean join.
 */
function applyMiterJoin(curr, next, maxMiterLen, offset) {
    // When either neighbour is a degenerate arc, skip all join logic here.
    // The degenerate arc is removed by sanitizeSegments, and gapSealPass then
    // directly reconnects the two surviving live neighbours at their correct
    // geometric intersection — without any intermediate П-bridge arms.
    if (curr.degenerate || next.degenerate) {
        return null;
    }

    const p1 = curr.end,   t1 = tangentAtEnd(curr);
    const p2 = next.start, t2 = tangentAtStart(next);

    // Treat degenerate arcs as if they were lines for join purposes —
    // they have zero radius so circle-intersection math is meaningless.
    const currIsArc  = curr.type === "arc" && curr.arc && !curr.degenerate
                       && (curr.arc.radius || curr.arc.rx || 0) > EPSILON;
    const nextIsArc  = next.type === "arc" && next.arc && !next.degenerate
                       && (next.arc.radius || next.arc.rx || 0) > EPSILON;
    const endpointGap = distance(p1, p2);

    // Arc-arc micro-gap handling is deferred until after geometric intersection
    // evaluation so valid non-expanding trims still win.
    if (endpointGap <= JOIN_TOLERANCE && !(currIsArc && nextIsArc)) return null;

    // ── Phase 1: real geometric intersection ────────────────────────────────
    let candidates = [];
    if (currIsArc && nextIsArc) {
        candidates = circleCircleIntersections(
            { x: curr.arc.centerX, y: curr.arc.centerY }, curr.arc.radius || curr.arc.rx || 0,
            { x: next.arc.centerX, y: next.arc.centerY }, next.arc.radius || next.arc.rx || 0,
        );
    } else if (currIsArc) {
        candidates = lineCircleIntersections(p2, t2,
            { x: curr.arc.centerX, y: curr.arc.centerY }, curr.arc.radius || curr.arc.rx || 0);
    } else if (nextIsArc) {
        candidates = lineCircleIntersections(p1, t1,
            { x: next.arc.centerX, y: next.arc.centerY }, next.arc.radius || next.arc.rx || 0);
    } else {
        const I = lineIntersection(p1, t1, p2, t2);
        candidates = I ? [I] : [];
    }

    /**
     * Deterministic candidate ranking for geometric-intersection phase.
     *
     * For all cases: trim-only validation (no arc expansion allowed).
     * Arcs can only be trimmed, never expanded.
     *
     * Ranking is a strict total order:
     *   (d1+d2, max(d1,d2), |d1-d2|, qx, qy, id)
     */
    const bothArcs = currIsArc && nextIsArc;
    const rankScale = 1e9;
    const rankIdScale = 1e12;
    const accepted = [];
    for (const I of candidates) {
        const d1 = distance(p1, I), d2 = distance(p2, I);
        
        // All cases: enforce distance limits
        if (d1 > maxMiterLen || d2 > maxMiterLen) continue;
        
        // All cases: accept arc candidate only if it trims (shortens), never extends
        if (currIsArc && !isValidEndTrim(curr.arc, I))   continue;
        if (nextIsArc && !isValidStartTrim(next.arc, I)) continue;

        // For line-arc (or arc-line) joins, prefer candidate that leaves the
        // smaller residual arc sweep. This prevents branch jumps near collapse.
        let sweepScore = Number.POSITIVE_INFINITY;
        if (currIsArc && !nextIsArc) {
            sweepScore = trimmedEndSweepAbs(curr.arc, I);
        } else if (!currIsArc && nextIsArc) {
            sweepScore = trimmedStartSweepAbs(next.arc, I);
        } else if (currIsArc && nextIsArc) {
            sweepScore = trimmedEndSweepAbs(curr.arc, I) + trimmedStartSweepAbs(next.arc, I);
        }

        const qx = Math.round(I.x * rankScale) / rankScale;
        const qy = Math.round(I.y * rankScale) / rankScale;
        const id = `${Math.round(I.x * rankIdScale)}:${Math.round(I.y * rankIdScale)}`;
        accepted.push({
            point: I,
            sweepScore,
            primary: d1 + d2,
            secondary: Math.max(d1, d2),
            tertiary: Math.abs(d1 - d2),
            qx,
            qy,
            id,
        });
    }

    accepted.sort((a, b) => {
        if (a.sweepScore !== b.sweepScore) return a.sweepScore - b.sweepScore;
        if (a.primary !== b.primary) return a.primary - b.primary;
        if (a.secondary !== b.secondary) return a.secondary - b.secondary;
        if (a.tertiary !== b.tertiary) return a.tertiary - b.tertiary;
        if (a.qx !== b.qx) return a.qx - b.qx;
        if (a.qy !== b.qy) return a.qy - b.qy;
        return a.id.localeCompare(b.id);
    });

    const best = accepted.length > 0 ? accepted[0].point : null;

    if (best) {
        // Always use trim (no arc expansion allowed)
        trimSegmentEnd(curr, best);
        trimSegmentStart(next, best);
        if (!isNear(curr.end, next.start, JOIN_TOLERANCE)) {
            return [{ type: "line", start: clonePoint(curr.end), end: clonePoint(next.start), isBridge: true }];
        }
        return null;
    }

    // ── Phase 2: Arc-arc tangential miter bridge ───────────────────────────────
    // Circles do not intersect (or intersection was outside trim-only range).
    // Join via intersection of arc-end/start tangents to keep a single corner
    // point instead of a 3-segment rectangular bridge.
    if (bothArcs) {
        if (endpointGap <= EPSILON) return null;

        const M = lineIntersection(p1, t1, p2, t2);
        if (M) {
            const d1 = distance(p1, M);
            const d2 = distance(p2, M);
            if (d1 <= maxMiterLen && d2 <= maxMiterLen) {
                const bridges = [];
                if (!isNear(p1, M, EPSILON)) {
                    bridges.push({ type: "line", start: clonePoint(p1), end: clonePoint(M), isBridge: true });
                }
                if (!isNear(M, p2, EPSILON)) {
                    bridges.push({ type: "line", start: clonePoint(M), end: clonePoint(p2), isBridge: true });
                }
                if (bridges.length) return bridges;
            }
        }

        // Tangents are parallel or miter is out of limit: keep deterministic fallback.
        return [{ type: "line", start: clonePoint(p1), end: clonePoint(p2), isBridge: true }];
    }

    // ── Phase 3: tangent-line miter (arc endpoints are fixed) ───────────────
    const M = lineIntersection(p1, t1, p2, t2);
    if (M) {
        const d1 = distance(p1, M), d2 = distance(p2, M);
        if (d1 <= maxMiterLen && d2 <= maxMiterLen) {
            if (!currIsArc) {
                trimSegmentEnd(curr, M);
            } else {
                // Arc endpoint cannot move. If the miter falls BEHIND the arc end
                // (the arc has already swept past the corner), mark it degenerate.
                // The resulting gap is then closed in the second pass.
                if (dot({ x: M.x - p1.x, y: M.y - p1.y }, t1) < -EPSILON) {
                    curr.degenerate = true;
                    if (!nextIsArc) trimSegmentStart(next, M);
                    return null;
                }
            }
            if (!nextIsArc) trimSegmentStart(next, M);
            // next=arc: arc start cannot move; any gap is covered by the bridge below.
            if (isNear(curr.end, next.start, JOIN_TOLERANCE)) return null;
            return [{ type: "line", start: clonePoint(curr.end), end: clonePoint(next.start), isBridge: true }];
        }
    }

    // Fallback: direct bridge, but for outer convex corners (diverging tangents)
    // a direct bridge would cut through the original material at the corner point.
    // Instead, use a rectangular "square-cap" bridge: extend each end by |offset|
    // in its outward tangent direction, then connect the two extended endpoints.
    if (offset !== undefined && Math.abs(offset) > EPSILON && dot(t1, t2) < 0) {
        const ext = Math.abs(offset);
        const ep1 = { x: p1.x + ext * t1.x, y: p1.y + ext * t1.y };
        const ep2 = { x: p2.x - ext * t2.x, y: p2.y - ext * t2.y };
        const bridges = [];
        if (!isNear(p1, ep1, EPSILON))  bridges.push({ type: "line", start: clonePoint(p1), end: clonePoint(ep1), isBridge: true });
        if (!isNear(ep1, ep2, EPSILON)) bridges.push({ type: "line", start: clonePoint(ep1), end: clonePoint(ep2), isBridge: true });
        if (!isNear(ep2, p2, EPSILON))  bridges.push({ type: "line", start: clonePoint(ep2), end: clonePoint(p2), isBridge: true });
        if (bridges.length) return bridges;
    }
    return [{ type: "line", start: clonePoint(p1), end: clonePoint(p2), isBridge: true }];
}

function offsetContour(segments, offset, options) {
    const offsetSegments = computePrimitiveOffsets(segments, offset, {
        offsetLineSegment,
        offsetBezierSegment,
        offsetArcSegment: (segment, dist) => offsetArcSegment(segment, dist, options),
    });

    if (offsetSegments.length === 0) return [];

    const points = contourToPoints(segments);
    const orientation = getPathOrientation(points);
    const closed = isNear(points[0], points[points.length - 1], JOIN_TOLERANCE);

    const joinedSegments = joinOffsetSegments(offsetSegments, options, offset, closed, {
        cloneSegment,
        applyMiterJoin,
        distance,
        EPSILON,
        isNear,
        joinTolerance: JOIN_TOLERANCE,
        log,
    });

    const forceReverse = options.forceReverseOutput === true;

    if (!closed || joinedSegments.length === 0) {
        return forceReverse
            ? reverseSegments(joinedSegments, { clonePoint, computeAngleDelta })
            : joinedSegments;
    }

    const offsetPoints = contourToPoints(joinedSegments);
    const offsetOrientation = getPathOrientation(offsetPoints);
    let finalSegments = joinedSegments;
    if (offsetOrientation !== orientation) {
        finalSegments = reverseSegments(joinedSegments, { clonePoint, computeAngleDelta });
    }

    if (forceReverse) {
        return reverseSegments(finalSegments, { clonePoint, computeAngleDelta });
    }

    return finalSegments;
}

function buildOffsetContourSegments(pathData, offset, options = {}) {
    const inputContours = normalizeInputContours(pathData, options, {
        normalizeArcAngles,
        splitSegmentsIntoContours,
        log,
    });

    if (inputContours.length === 0) {
        return [];
    }

    if (Math.abs(offset) < EPSILON) {
        if (options.forceReverseOutput) {
            return inputContours.map((contour) => reverseSegments(contour, { clonePoint, computeAngleDelta }));
        }
        return inputContours;
    }

    const offsetDistance = resolveOffsetDistance(offset, options);
    const contours = [];
    for (const contour of inputContours) {
        const contourOffset = offsetContour(contour, offsetDistance, options);
        if (contourOffset.length > 0) {
            contours.push(contourOffset);
        }
    }

    return contours;
}

function stitchAndQuantizeContourSegments(segments, options = {}) {
    const stitchedSegments = stitchSegments(
        segments,
        { cloneSegment, distance, clonePoint, defaultTolerance: STITCH_TOLERANCE },
        options.stitchTolerance || STITCH_TOLERANCE,
    );

    return quantizeSegments(
        stitchedSegments,
        options.outputPrecision || 6,
    );
}

/**
 * Calculate offset for SVG path data using custom geometry.
 * @param {string} pathData - SVG path data
 * @param {number} offset - Offset distance (same sign convention as PaperOffsetProcessor)
 * @param {CustomOffsetOptions} options - Offset options
 * @returns {string} SVG path data
 */
export function calculateOffsetFromPathData(pathData, offset, options = {}) {
    if (!pathData) return "";

    if (Math.abs(offset) < EPSILON && !options.forceReverseOutput) {
        return pathData;
    }

    const contourSegments = buildOffsetContourSegments(pathData, offset, options);
    if (contourSegments.length === 0) {
        return Math.abs(offset) < EPSILON ? pathData : "";
    }

    const mergedSegments = contourSegments.flat();
    const quantizedSegments = stitchAndQuantizeContourSegments(mergedSegments, options);
    let path = segmentsToSVGPath(quantizedSegments);

    const selfIntersectionDeps = createSelfIntersectionStageDeps({
        samplePathPoints,
        isNear,
        epsilon: EPSILON,
    });

    if (options.trimSelfIntersections && pathHasSelfIntersections(path, selfIntersectionDeps)) {
        const trimmed = resolveSelfIntersections(path, {
            referencePathData: pathData,
        });
        if (trimmed && shouldAcceptTrimmedPath(path, trimmed)) {
            path = trimmed;
        } else if (trimmed) {
            log.warn("Self-intersection trim rejected due to degenerate result; keeping untrimmed offset");
        }
    }

    if (options.useArcApproximation && options.exportModule) {
        const tolerance = options.arcTolerance || ARC_APPROX_TOLERANCE;
        path = approximatePath(path, options.exportModule, tolerance);
    }

    return path;
}

/**
 * Calculate offset for SVG element.
 * @param {SVGElement} svgElement - SVG element (path, rect, polygon)
 * @param {number} offset - Offset distance
 * @param {CustomOffsetOptions} options - Offset options
 * @returns {string} SVG path data
 */
export function calculateOffsetFromSVG(svgElement, offset, options = {}) {
    if (!svgElement) {
        log.warn("calculateOffsetFromSVG: no SVG element provided");
        return "";
    }

    const pathData = importSVGToPathData(svgElement);
    if (!pathData) {
        log.warn("calculateOffsetFromSVG: failed to extract path data");
        return "";
    }

    return calculateOffsetFromPathData(pathData, offset, options);
}

/**
 * Calculate offset contours and return all valid contour results.
 *
 * This is a structured alternative to `calculateOffsetFromPathData` that
 * preserves all resulting contours instead of exposing only a merged path string.
 *
 * @param {string} pathData - SVG path data
 * @param {number} offset - Offset distance
 * @param {CustomOffsetOptions} options - Offset options
 * @returns {OffsetContourResult[]}
 */
export function calculateOffsetContoursFromPathData(pathData, offset, options = {}) {
    const contourSegments = buildOffsetContourSegments(pathData, offset, options);
    if (contourSegments.length === 0) {
        return [];
    }

    const contourMetadataDeps = createContourMetadataStageDeps({
        stitchAndQuantizeContourSegments,
        segmentsToSVGPath,
        isNear,
        joinTolerance: JOIN_TOLERANCE,
        contourToPoints,
        clonePoint,
        signedArea,
    });

    const buildContourResult = createContourResultBuilder(
        buildContourResultFromSegments,
        contourMetadataDeps,
        options,
    );

    const selfIntersectionDeps = createSelfIntersectionStageDeps({
        samplePathPoints,
        isNear,
        epsilon: EPSILON,
    });

    const fallbackStageDeps = createFallbackStageDeps({
        pathHasSelfIntersections,
        selfIntersectionDeps,
        resolveSelfIntersections,
        shouldAcceptTrimmedPath,
        normalizeInputContours,
        normalizeArcAngles,
        splitSegmentsIntoContours,
        buildContourResult,
        epsilon: EPSILON,
        log,
    });

    const contours = contourSegments
        .map((contour) => buildContourResult(contour, options))
        .filter((contour) => contour && contour.pathData)
        .flatMap((contour) => applyHybridFallbackStage(
            contour,
            { referencePathData: pathData, options },
            fallbackStageDeps,
        ))

    return finalizeContourCollection(contours, { epsilon: EPSILON });
}

/**
 * Custom offset calculator with a PaperOffset-compatible API.
 */
export class CustomOffsetCalculator {
    /**
     * @param {CustomOffsetOptions} options
     */
    constructor(options = {}) {
        this.options = options;
    }

    /**
     * Calculate offset for SVG element.
     * @param {SVGElement} svgElement - SVG rect or path element
     * @param {number} offset - Offset distance
     * @returns {string} SVG path data
     */
    calculateOffsetFromSVG(svgElement, offset) {
        return calculateOffsetFromSVG(svgElement, offset, this.options);
    }

    /**
     * Calculate structured offset contours for SVG path data.
     * @param {string} pathData - SVG path data
     * @param {number} offset - Offset distance
     * @returns {OffsetContourResult[]}
     */
    calculateOffsetContoursFromPathData(pathData, offset) {
        return calculateOffsetContoursFromPathData(pathData, offset, this.options);
    }
}

export default CustomOffsetCalculator;
