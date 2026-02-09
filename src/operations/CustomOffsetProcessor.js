/**
 * CustomOffsetProcessor - custom SVG offset with line/arc/bezier output.
 * Provides a compatible API with PaperOffsetProcessor while allowing extensions.
 */

import LoggerFactory from "../core/LoggerFactory.js";
import { ARC_APPROX_TOLERANCE } from "../config/constants.js";
import { approximatePath, segmentsToSVGPath } from "../utils/arcApproximation.js";
import { buildFilletArc, getPathOrientation } from "../utils/fillet.js";
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
    if (!arc || arc.centerX === undefined || arc.centerY === undefined) {
        return null;
    }

    const radius = arc.radius || arc.rx || 0;
    if (radius < EPSILON) return null;

    const startAngle = arc.startAngle;
    const endAngle = arc.endAngle;
    const sweepFlag = arc.sweepFlag ?? 1;

    const delta = computeAngleDelta(startAngle, endAngle, sweepFlag);
    const midAngle = startAngle + delta / 2;
    const radial = { x: Math.cos(midAngle), y: Math.sin(midAngle) };

    const tangentSign = sweepFlag === 1 ? 1 : -1;
    const tangent = {
        x: -Math.sin(midAngle) * tangentSign,
        y: Math.cos(midAngle) * tangentSign,
    };
    const normal = leftNormal(tangent);
    const radialSign = dot(normal, radial) >= 0 ? 1 : -1;

    const newRadius = radius + offset * radialSign;
    if (newRadius <= EPSILON) return null;

    const center = { x: arc.centerX, y: arc.centerY };
    const start = {
        x: center.x + Math.cos(startAngle) * newRadius,
        y: center.y + Math.sin(startAngle) * newRadius,
    };
    const end = {
        x: center.x + Math.cos(endAngle) * newRadius,
        y: center.y + Math.sin(endAngle) * newRadius,
    };

    const largeArcFlag = Math.abs(delta) > Math.PI ? 1 : 0;

    return {
        type: "arc",
        start,
        end,
        arc: {
            radius: newRadius,
            rx: newRadius,
            ry: newRadius,
            xAxisRotation: arc.xAxisRotation || 0,
            largeArcFlag,
            sweepFlag,
            centerX: center.x,
            centerY: center.y,
            startAngle,
            endAngle,
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

function lineCircleIntersections(linePoint, lineDir, center, radius) {
    const dx = lineDir.x;
    const dy = lineDir.y;
    const fx = linePoint.x - center.x;
    const fy = linePoint.y - center.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0 || Math.abs(a) < EPSILON) {
        return [];
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    return [
        { x: linePoint.x + dx * t1, y: linePoint.y + dy * t1 },
        { x: linePoint.x + dx * t2, y: linePoint.y + dy * t2 },
    ];
}

function updateArcEndpoint(segment, point, isStart) {
    const arc = segment.arc;
    if (!arc || arc.centerX === undefined || arc.centerY === undefined) {
        return false;
    }

    const center = { x: arc.centerX, y: arc.centerY };
    const radius = distance(center, point);
    if (radius < EPSILON) return false;

    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    if (isStart) {
        segment.start = clonePoint(point);
        arc.startAngle = angle;
    } else {
        segment.end = clonePoint(point);
        arc.endAngle = angle;
    }

    arc.radius = radius;
    arc.rx = radius;
    arc.ry = radius;
    arc.largeArcFlag = Math.abs(
        computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1)
    ) > Math.PI
        ? 1
        : 0;

    return true;
}

function updateSegmentEndpoint(segment, point, isStart, tolerance) {
    const currentPoint = isStart ? segment.start : segment.end;
    const moveDistance = distance(currentPoint, point);
    if (moveDistance < EPSILON) return true;

    if (segment.type === "line") {
        if (isStart) {
            segment.start = clonePoint(point);
        } else {
            segment.end = clonePoint(point);
        }
        return true;
    }

    if (segment.type === "bezier") {
        const delta = {
            x: point.x - currentPoint.x,
            y: point.y - currentPoint.y,
        };
        if (isStart) {
            segment.start = clonePoint(point);
            segment.cp1 = {
                x: segment.cp1.x + delta.x,
                y: segment.cp1.y + delta.y,
            };
        } else {
            segment.end = clonePoint(point);
            segment.cp2 = {
                x: segment.cp2.x + delta.x,
                y: segment.cp2.y + delta.y,
            };
        }
        return true;
    }

    if (segment.type === "arc") {
        if (tolerance !== undefined && moveDistance > tolerance) {
            return false;
        }
        return updateArcEndpoint(segment, point, isStart);
    }

    return false;
}

function buildJoinSegment(
    current,
    next,
    joinStyle,
    offset,
    limit,
    cornerSelection,
    orientation
) {
    if (isNear(current.end, next.start, 0.001)) {
        return { current, next, joinSegment: null };
    }

    const currentTangent = tangentAtEnd(current);
    const nextTangent = tangentAtStart(next);
    const turnCross = cross(currentTangent, nextTangent);

    if (cornerSelection && cornerSelection !== "all") {
        const isOuter =
            orientation === "clockwise" ? turnCross > 0 : turnCross < 0;
        if (cornerSelection === "inner" && isOuter) {
            joinStyle = "miter";
        }
        if (cornerSelection === "outer" && !isOuter) {
            joinStyle = "miter";
        }
    }

    const intersection = lineIntersection(
        current.end,
        currentTangent,
        next.start,
        nextTangent
    );
    const radius = Math.abs(offset);
    const arcSnapTolerance = Math.max(0.5, radius * 0.15);

    if (intersection) {
        const miterLength = distance(current.end, intersection);
        if (joinStyle === "miter" && miterLength <= radius * limit) {
            const currentUpdated = updateSegmentEndpoint(
                current,
                intersection,
                false,
                arcSnapTolerance
            );
            const nextUpdated = updateSegmentEndpoint(
                next,
                intersection,
                true,
                arcSnapTolerance
            );
            if (currentUpdated && nextUpdated) {
                return { current, next, joinSegment: null };
            }
        }

        if (joinStyle === "round" && radius > EPSILON) {
            const fillet = buildFilletArc(
                current.end,
                intersection,
                next.start,
                radius
            );
            if (fillet) {
                const currentUpdated = updateSegmentEndpoint(
                    current,
                    fillet.start,
                    false,
                    arcSnapTolerance
                );
                const nextUpdated = updateSegmentEndpoint(
                    next,
                    fillet.end,
                    true,
                    arcSnapTolerance
                );
                if (currentUpdated && nextUpdated) {
                    return {
                        current,
                        next,
                        joinSegment: {
                            type: "arc",
                            start: fillet.start,
                            end: fillet.end,
                            arc: fillet.arc,
                        },
                    };
                }
            }
        }
    }

    if (current.type === "line" && next.type === "arc" && next.arc) {
        const center = { x: next.arc.centerX, y: next.arc.centerY };
        const radiusValue = next.arc.radius || next.arc.rx || 0;
        if (radiusValue > EPSILON) {
            const candidates = lineCircleIntersections(
                current.end,
                currentTangent,
                center,
                radiusValue
            );
            let bestPoint = null;
            let bestDistance = Infinity;
            for (const candidate of candidates) {
                const dist = distance(candidate, next.start);
                if (dist < bestDistance) {
                    bestDistance = dist;
                    bestPoint = candidate;
                }
            }
            if (bestPoint && bestDistance <= arcSnapTolerance) {
                updateSegmentEndpoint(
                    current,
                    bestPoint,
                    false,
                    arcSnapTolerance
                );
                if (updateArcEndpoint(next, bestPoint, true)) {
                    return { current, next, joinSegment: null };
                }
            }
        }
    }

    if (current.type === "arc" && next.type === "line" && current.arc) {
        const center = { x: current.arc.centerX, y: current.arc.centerY };
        const radiusValue = current.arc.radius || current.arc.rx || 0;
        if (radiusValue > EPSILON) {
            const candidates = lineCircleIntersections(
                next.start,
                nextTangent,
                center,
                radiusValue
            );
            let bestPoint = null;
            let bestDistance = Infinity;
            for (const candidate of candidates) {
                const dist = distance(candidate, current.end);
                if (dist < bestDistance) {
                    bestDistance = dist;
                    bestPoint = candidate;
                }
            }
            if (bestPoint && bestDistance <= arcSnapTolerance) {
                updateSegmentEndpoint(
                    next,
                    bestPoint,
                    true,
                    arcSnapTolerance
                );
                if (updateArcEndpoint(current, bestPoint, false)) {
                    return { current, next, joinSegment: null };
                }
            }
        }
    }

    const joinSegment = {
        type: "line",
        start: clonePoint(current.end),
        end: clonePoint(next.start),
    };

    return { current, next, joinSegment };
}

function sanitizeSegments(segments) {
    return segments.filter((segment) => {
        if (!segment.start || !segment.end) return false;
        if (distance(segment.start, segment.end) < 0.001) return false;
        if (segment.type === "arc" && segment.arc) {
            const radius = segment.arc.radius || segment.arc.rx || 0;
            if (radius <= EPSILON) return false;
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
            updateSegmentEndpoint(current, prev.end, true, tolerance);
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

function joinOffsetSegments(offsetSegments, options, offset, closed, orientation) {
    const joinStyle = options.join || "miter";
    const limit = options.limit || 10;
    const cornerSelection = options.cornerSelection || "all";

    const segments = offsetSegments.map(cloneSegment);
    const result = [];

    const count = segments.length;
    const loopCount = closed ? count : count - 1;

    for (let i = 0; i < loopCount; i++) {
        const current = segments[i];
        const nextIndex = (i + 1) % count;
        const next = segments[nextIndex];

        const joinResult = buildJoinSegment(
            current,
            next,
            joinStyle,
            offset,
            limit,
            cornerSelection,
            orientation
        );

        segments[nextIndex] = joinResult.next;
        result.push(joinResult.current);
        if (joinResult.joinSegment) result.push(joinResult.joinSegment);
    }

    if (!closed && segments[count - 1]) {
        result.push(segments[count - 1]);
    }

    return sanitizeSegments(result);
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
        closed,
        orientation
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

    if (options.trimSelfIntersections) {
        const trimmed = resolveSelfIntersections(path, {
            referencePathData: pathData,
        });
        if (trimmed) {
            path = trimmed;
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
