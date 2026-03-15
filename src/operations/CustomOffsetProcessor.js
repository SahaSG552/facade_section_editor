/**
 * CustomOffsetProcessor - custom SVG offset with line/arc/bezier output.
 * Provides a compatible API with PaperOffsetProcessor while allowing extensions.
 */

import LoggerFactory from "../core/LoggerFactory.js";
import { ARC_APPROX_TOLERANCE } from "../config/constants.js";
import { approximatePath, segmentsToSVGPath } from "../utils/arcApproximation.js";
import { getPathOrientation } from "../utils/fillet.js";
import { resolveSelfIntersections } from "./PaperBooleanProcessor.js";

const log = LoggerFactory.createLogger("CustomOffsetProcessor");
const EPSILON = 1e-6;

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
 */

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
            if (!isNear(prev.end, segment.start, 0.001)) {
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

function samplePathPoints(pathData, sampleCount = 128) {
    if (!pathData || typeof document === "undefined") return [];

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);

    let totalLength = 0;
    try {
        totalLength = path.getTotalLength();
    } catch {
        return [];
    }
    if (!(totalLength > EPSILON)) return [];

    const count = Math.max(32, Math.floor(sampleCount));
    const points = [];
    for (let i = 0; i < count; i++) {
        const point = path.getPointAtLength((totalLength * i) / count);
        points.push({ x: point.x, y: point.y });
    }

    const endPoint = path.getPointAtLength(totalLength);
    points.push({ x: endPoint.x, y: endPoint.y });
    return points;
}

function signedArea(points) {
    if (!Array.isArray(points) || points.length < 3) return 0;
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const a = points[i];
        const b = points[(i + 1) % n];
        area += a.x * b.y - b.x * a.y;
    }
    return area * 0.5;
}

function bboxArea(points) {
    if (!Array.isArray(points) || points.length === 0) return 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
        if (!p) continue;
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    if (!Number.isFinite(minX)) return 0;
    return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function shouldAcceptTrimmedPath(originalPath, trimmedPath) {
    if (!trimmedPath || !String(trimmedPath).trim()) return false;

    const originalStr = String(originalPath || "");
    const trimmedStr = String(trimmedPath || "");
    const originalHasBezier = /[CcSsQqTt]/.test(originalStr);
    const trimmedHasBezier = /[CcSsQqTt]/.test(trimmedStr);
    if (!originalHasBezier && trimmedHasBezier) {
        return false;
    }

    const originalMoveCount = (originalStr.match(/[Mm]/g) || []).length;
    const trimmedMoveCount = (trimmedStr.match(/[Mm]/g) || []).length;
    if (trimmedMoveCount > Math.max(1, originalMoveCount + 1)) {
        return false;
    }

    const originalPoints = samplePathPoints(originalPath, 256);
    const trimmedPoints = samplePathPoints(trimmedPath, 256);
    if (trimmedPoints.length < 4) return false;

    const originalAbsArea = Math.abs(signedArea(originalPoints));
    const trimmedAbsArea = Math.abs(signedArea(trimmedPoints));
    const originalBBoxArea = bboxArea(originalPoints);
    const trimmedBBoxArea = bboxArea(trimmedPoints);

    if (originalAbsArea > EPSILON) {
        const areaRatio = trimmedAbsArea / originalAbsArea;
        if (areaRatio < 0.35) return false;
    }

    if (originalBBoxArea > EPSILON) {
        const bboxRatio = trimmedBBoxArea / originalBBoxArea;
        if (bboxRatio < 0.35) return false;
    }

    return true;
}

function orientation2d(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a, b, p) {
    return p.x <= Math.max(a.x, b.x) + EPSILON
        && p.x + EPSILON >= Math.min(a.x, b.x)
        && p.y <= Math.max(a.y, b.y) + EPSILON
        && p.y + EPSILON >= Math.min(a.y, b.y);
}

function lineSegmentsIntersect(a1, a2, b1, b2) {
    const o1 = orientation2d(a1, a2, b1);
    const o2 = orientation2d(a1, a2, b2);
    const o3 = orientation2d(b1, b2, a1);
    const o4 = orientation2d(b1, b2, a2);

    if ((o1 > EPSILON && o2 < -EPSILON || o1 < -EPSILON && o2 > EPSILON)
        && (o3 > EPSILON && o4 < -EPSILON || o3 < -EPSILON && o4 > EPSILON)) {
        return true;
    }

    if (Math.abs(o1) <= EPSILON && onSegment(a1, a2, b1)) return true;
    if (Math.abs(o2) <= EPSILON && onSegment(a1, a2, b2)) return true;
    if (Math.abs(o3) <= EPSILON && onSegment(b1, b2, a1)) return true;
    if (Math.abs(o4) <= EPSILON && onSegment(b1, b2, a2)) return true;

    return false;
}

function pathHasSelfIntersections(pathData) {
    const points = samplePathPoints(pathData);
    if (points.length < 5) return false;

    const isClosed = isNear(points[0], points[points.length - 1], 0.01);
    const segmentCount = points.length - 1;

    for (let i = 0; i < segmentCount; i++) {
        const a1 = points[i];
        const a2 = points[i + 1];
        for (let j = i + 1; j < segmentCount; j++) {
            const shareEndpoint = Math.abs(i - j) <= 1 || (isClosed && i === 0 && j === segmentCount - 1);
            if (shareEndpoint) continue;
            const b1 = points[j];
            const b2 = points[j + 1];
            if (lineSegmentsIntersect(a1, a2, b1, b2)) {
                return true;
            }
        }
    }

    return false;
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

function offsetArcSegment(segment, offset) {
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
    if (newRadius < EPSILON) {
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
    const θI = Math.atan2(I.y - arc.centerY, I.x - arc.centerX);
    const origSweep = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const sweepToI  = computeAngleDelta(arc.startAngle, θI,           arc.sweepFlag ?? 1);
    // Same direction as original sweep AND no longer than it.
    return sweepToI * origSweep > 0 && Math.abs(sweepToI) <= Math.abs(origSweep) + EPSILON;
}

/**
 * Returns true if trimming the arc's START to point I would only shorten
 * (or leave unchanged) the arc. Extending is not allowed.
 */
function isValidStartTrim(arc, I) {
    const θI = Math.atan2(I.y - arc.centerY, I.x - arc.centerX);
    const origSweep  = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const sweepFromI = computeAngleDelta(θI,              arc.endAngle, arc.sweepFlag ?? 1);
    return sweepFromI * origSweep > 0 && Math.abs(sweepFromI) <= Math.abs(origSweep) + EPSILON;
}

/**
 * Trim the end of a segment to a new point:
 * - LINE: relocates the endpoint; marks degenerate if direction flips.
 * - ARC:  projects the point onto the arc circle, adjusts endAngle;
 *         marks degenerate if the sweep collapses to zero or inverts.
 */
function trimSegmentEnd(segment, point) {
    if (segment.type === "line") {
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
        const angle = Math.atan2(point.y - centerY, point.x - centerX);
        segment.arc.endAngle = angle;
        segment.end = { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
        const newSweep = computeAngleDelta(segment.arc.startAngle, angle, segment.arc.sweepFlag ?? 1);
        segment.arc.largeArcFlag = Math.abs(newSweep) > Math.PI ? 1 : 0;
        if (Math.abs(newSweep) < EPSILON || newSweep * origSweep <= 0) {
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
    if (segment.type === "line") {
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
        const angle = Math.atan2(point.y - centerY, point.x - centerX);
        segment.arc.startAngle = angle;
        segment.start = { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
        const newSweep = computeAngleDelta(angle, segment.arc.endAngle, segment.arc.sweepFlag ?? 1);
        segment.arc.largeArcFlag = Math.abs(newSweep) > Math.PI ? 1 : 0;
        if (Math.abs(newSweep) < EPSILON || newSweep * origSweep <= 0) {
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
 * Phase 2 — Miter fallback (tangent lines only):
 *   If no valid geometric intersection is found, intersect the tangent rays.
 *   Only LINE endpoints move; arc endpoints stay fixed.
 *   A bridge line is emitted for any remaining gap.
 *
 * @param {Object} curr        - Current segment (modified in-place).
 * @param {Object} next        - Next segment    (modified in-place).
 * @param {number} maxMiterLen - Max distance each endpoint may move.
 * @returns {Array<Object>|null} Bridge lines to insert, or null for a clean join.
 */
function applyMiterJoin(curr, next, maxMiterLen) {
    const p1 = curr.end,   t1 = tangentAtEnd(curr);
    const p2 = next.start, t2 = tangentAtStart(next);

    if (isNear(p1, p2, 0.001)) return null;

    // Treat degenerate arcs as if they were lines for join purposes —
    // they have zero radius so circle-intersection math is meaningless.
    const currIsArc  = curr.type === "arc" && curr.arc && !curr.degenerate
                       && (curr.arc.radius || curr.arc.rx || 0) > EPSILON;
    const nextIsArc  = next.type === "arc" && next.arc && !next.degenerate
                       && (next.arc.radius || next.arc.rx || 0) > EPSILON;

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

    let best = null, bestScore = Infinity;
    for (const I of candidates) {
        const d1 = distance(p1, I), d2 = distance(p2, I);
        if (d1 > maxMiterLen || d2 > maxMiterLen) continue;
        // Accept arc candidate only if it trims (shortens) the arc, never extends it.
        if (currIsArc && !isValidEndTrim(curr.arc, I))   continue;
        if (nextIsArc && !isValidStartTrim(next.arc, I)) continue;
        const score = d1 + d2;
        if (score < bestScore) { best = I; bestScore = score; }
    }

    if (best) {
        trimSegmentEnd(curr, best);
        trimSegmentStart(next, best);
        if (!isNear(curr.end, next.start, 0.001)) {
            return [{ type: "line", start: clonePoint(curr.end), end: clonePoint(next.start) }];
        }
        return null;
    }

    // ── Phase 2: tangent-line miter (arc endpoints are fixed) ───────────────
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
            if (isNear(curr.end, next.start, 0.001)) return null;
            return [{ type: "line", start: clonePoint(curr.end), end: clonePoint(next.start) }];
        }
    }

    // Fallback: direct bridge.
    return [{ type: "line", start: clonePoint(p1), end: clonePoint(p2) }];
}

function sanitizeSegments(segments) {
    return segments.filter((segment) => {
        if (!segment.start || !segment.end) return false;
        // Explicitly degenerated by trimSegmentEnd/Start or applyMiterJoin.
        if (segment.degenerate) return false;
        if (distance(segment.start, segment.end) < EPSILON) return false;
        // Remove any residual degenerate arc markers (radius 0)
        if (segment.type === "arc" && segment.arc) {
            const r = segment.arc.radius || segment.arc.rx || 0;
            if (r <= EPSILON) return false;
        }
        return true;
    });
}


function stitchSegments(segments, tolerance = 0.5) {
    if (!segments || segments.length === 0) return segments;

    const stitched = [cloneSegment(segments[0])];
    for (let i = 1; i < segments.length; i++) {
        const prev = stitched[stitched.length - 1];
        const current = cloneSegment(segments[i]);

        if (distance(prev.end, current.start) <= tolerance) {
            // Snap current.start to prev.end to close stitching gaps.
            current.start = clonePoint(prev.end);
            if (current.type === "arc" && current.arc) {
                current.arc.startAngle = Math.atan2(
                    current.start.y - current.arc.centerY,
                    current.start.x - current.arc.centerX
                );
            }
        }

        stitched.push(current);
    }

    return stitched;
}

function roundPoint(point, precision = 6) {
    const factor = 10 ** precision;
    return {
        x: Math.round(point.x * factor) / factor,
        y: Math.round(point.y * factor) / factor,
    };
}

function quantizeSegments(segments, precision = 6) {
    return segments.map((segment) => {
        const quantized = {
            ...segment,
            start: roundPoint(segment.start, precision),
            end: roundPoint(segment.end, precision),
        };

        if (segment.cp1) quantized.cp1 = roundPoint(segment.cp1, precision);
        if (segment.cp2) quantized.cp2 = roundPoint(segment.cp2, precision);
        if (segment.arc) quantized.arc = { ...segment.arc };

        return quantized;
    });
}

function joinOffsetSegments(offsetSegments, options, offset, closed) {
    const segs = offsetSegments.map(cloneSegment);
    const count = segs.length;
    if (count === 0) return [];

    const maxMiter = Math.abs(offset) * (options?.limit ?? 10);

    // ── First pass: join all consecutive pairs (including degenerate arcs). ──
    // Degenerate arcs have their start/end set to the offset tangent-line
    // reference points (computed in offsetArcSegment), so applyMiterJoin
    // builds correct miter corners to/from their neighbours.
    const result = [];
    const pairCount = closed ? count : count - 1;

    for (let i = 0; i < pairCount; i++) {
        const curr = segs[i];
        const next = segs[(i + 1) % count];
        const bridge = applyMiterJoin(curr, next, maxMiter);
        result.push(curr);
        if (bridge) result.push(...bridge);
    }

    if (!closed && count > 0) {
        result.push(segs[count - 1]);
    }

    // sanitizeSegments removes degenerate arcs (radius 0).  When a degenerate
    // arc sits between two bridge segments their endpoints no longer touch.
    const clean = sanitizeSegments(result);

    // ── Second pass: close gaps left by degenerate arc removal. ─────────────
    // The two bridge segments that flanked the degenerate arc now point to the
    // correct offset tangent-line positions, so intersecting their tangent rays
    // gives the true miter corner (e.g. the (3,−3) corner in the example).
    const sealed = [];
    for (let i = 0; i < clean.length; i++) {
        sealed.push(clean[i]);
        if (i < clean.length - 1) {
            const curr = clean[i];
            const next = clean[i + 1];
            if (!isNear(curr.end, next.start, 0.001)) {
                const gap = applyMiterJoin(curr, next, maxMiter);
                if (gap) sealed.push(...gap);
            }
        }
    }
    return sealed;
}

function offsetContour(segments, offset, options) {
    const offsetSegments = [];
    for (const segment of segments) {
        let offsetSegment = null;
        if (segment.type === "line") {
            offsetSegment = offsetLineSegment(segment, offset);
        } else if (segment.type === "bezier") {
            offsetSegment = offsetBezierSegment(segment, offset);
        } else if (segment.type === "arc") {
            offsetSegment = offsetArcSegment(segment, offset);
        }

        if (offsetSegment) {
            offsetSegments.push(offsetSegment);
        }
    }

    if (offsetSegments.length === 0) return [];

    const points = contourToPoints(segments);
    const orientation = getPathOrientation(points);
    const closed = isNear(points[0], points[points.length - 1], 0.001);

    const joinedSegments = joinOffsetSegments(
        offsetSegments,
        options,
        offset,
        closed
    );

    const forceReverse = options.forceReverseOutput === true;

    if (!closed || joinedSegments.length === 0) {
        return forceReverse ? reverseSegments(joinedSegments) : joinedSegments;
    }

    const offsetPoints = contourToPoints(joinedSegments);
    const offsetOrientation = getPathOrientation(offsetPoints);
    let finalSegments = joinedSegments;
    if (offsetOrientation !== orientation) {
        finalSegments = reverseSegments(joinedSegments);
    }

    if (forceReverse) {
        return reverseSegments(finalSegments);
    }

    return finalSegments;
}

function reverseSegments(segments) {
    const reversed = [];
    for (let i = segments.length - 1; i >= 0; i--) {
        const segment = segments[i];
        if (segment.type === "line") {
            reversed.push({
                type: "line",
                start: clonePoint(segment.end),
                end: clonePoint(segment.start),
            });
        } else if (segment.type === "bezier") {
            reversed.push({
                type: "bezier",
                start: clonePoint(segment.end),
                cp1: clonePoint(segment.cp2),
                cp2: clonePoint(segment.cp1),
                end: clonePoint(segment.start),
            });
        } else if (segment.type === "arc") {
            const arc = { ...segment.arc };
            const sweep = arc.sweepFlag ?? 1;
            arc.sweepFlag = sweep === 1 ? 0 : 1;
            const startAngle = arc.startAngle;
            arc.startAngle = arc.endAngle;
            arc.endAngle = startAngle;
            const delta = computeAngleDelta(
                arc.startAngle,
                arc.endAngle,
                arc.sweepFlag
            );
            arc.largeArcFlag = Math.abs(delta) > Math.PI ? 1 : 0;

            reversed.push({
                type: "arc",
                start: clonePoint(segment.end),
                end: clonePoint(segment.start),
                arc,
            });
        }
    }

    return reversed;
}

function normalizeArcAngles(segment) {
    if (segment.type !== "arc" || !segment.arc) {
        return segment;
    }

    const arc = { ...segment.arc };
    const start = arc.startAngle;
    const end = arc.endAngle;

    if (start !== undefined && end !== undefined) {
        const threshold = Math.PI * 2 + 0.001;
        if (Math.abs(start) > threshold || Math.abs(end) > threshold) {
            const degToRad = Math.PI / 180;
            arc.startAngle = start * degToRad;
            arc.endAngle = end * degToRad;
        }
    }

    return { ...segment, arc };
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

    const exportModule = options.exportModule;
    if (Math.abs(offset) < EPSILON) {
        if (options.forceReverseOutput && exportModule?.dxfExporter?.parseSVGPathSegments) {
            const zeroSegments = exportModule.dxfExporter.parseSVGPathSegments(
                pathData,
                0,
                0,
                (y) => y,
                false
            );
            if (!zeroSegments || zeroSegments.length === 0) {
                return pathData;
            }
            const normalizedZero = zeroSegments.map(normalizeArcAngles);
            const contours = splitSegmentsIntoContours(normalizedZero);
            const reversedContours = contours
                .map((contour) => reverseSegments(contour))
                .flat();
            const stitchedSegments = stitchSegments(
                reversedContours,
                options.stitchTolerance || 0.5
            );
            const quantizedSegments = quantizeSegments(
                stitchedSegments,
                options.outputPrecision || 6
            );
            return segmentsToSVGPath(quantizedSegments);
        }

        return pathData;
    }
    if (!exportModule?.dxfExporter?.parseSVGPathSegments) {
        log.warn("Custom offset requires exportModule with parseSVGPathSegments");
        return "";
    }

    const parseSegments = exportModule.dxfExporter.parseSVGPathSegments(
        pathData,
        0,
        0,
        (y) => y,
        false
    );

    if (!parseSegments || parseSegments.length === 0) {
        return "";
    }

    const normalizedSegments = parseSegments.map(normalizeArcAngles);
    const contours = splitSegmentsIntoContours(normalizedSegments);
    const offsetDistance = -offset;

    const offsetSegments = [];
    for (const contour of contours) {
        const contourOffset = offsetContour(contour, offsetDistance, options);
        offsetSegments.push(...contourOffset);
    }

    if (offsetSegments.length === 0) return "";

    const stitchedSegments = stitchSegments(
        offsetSegments,
        options.stitchTolerance || 0.5
    );

    const quantizedSegments = quantizeSegments(
        stitchedSegments,
        options.outputPrecision || 6
    );

    let path = segmentsToSVGPath(quantizedSegments);

    if (options.trimSelfIntersections && pathHasSelfIntersections(path)) {
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
}

export default CustomOffsetCalculator;
