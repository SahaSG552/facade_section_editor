/**
 * Fillet utilities for polyline corners.
 * Produces line/arc segments suitable for SVG path export.
 */

const EPSILON = 1e-6;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function length(vec) {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

function normalize(vec) {
    const len = length(vec);
    if (len < EPSILON) return { x: 0, y: 0 };
    return { x: vec.x / len, y: vec.y / len };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function cross(a, b) {
    return a.x * b.y - a.y * b.x;
}

function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isNear(a, b, tolerance = EPSILON) {
    return distance(a, b) <= tolerance;
}

/**
 * Compute polygon orientation in screen coordinates (Y down).
 * Returns "clockwise" or "counterclockwise".
 * @param {Array} points - Array of {x, y}
 * @returns {string}
 */
export function getPathOrientation(points) {
    if (!points || points.length < 3) return "clockwise";
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return area >= 0 ? "clockwise" : "counterclockwise";
}

function isOuterCorner(turnCross, orientation) {
    if (orientation === "clockwise") {
        return turnCross > 0;
    }
    return turnCross < 0;
}

/**
 * Build a fillet arc for a single corner.
 * @param {Object} prev - Previous point {x, y}
 * @param {Object} curr - Corner point {x, y}
 * @param {Object} next - Next point {x, y}
 * @param {number} radius - Fillet radius
 * @returns {Object|null} {start, end, arc}
 */
export function buildFilletArc(prev, curr, next, radius) {
    if (radius <= 0) return null;

    const v1 = normalize({ x: prev.x - curr.x, y: prev.y - curr.y });
    const v2 = normalize({ x: next.x - curr.x, y: next.y - curr.y });

    const turn = cross(v1, v2);
    const dotValue = clamp(dot(v1, v2), -1, 1);
    const angle = Math.acos(dotValue);

    if (Math.abs(turn) < EPSILON || angle < EPSILON) {
        return null;
    }

    const tangentDistance = radius / Math.tan(angle / 2);
    const distPrev = distance(curr, prev);
    const distNext = distance(curr, next);

    if (tangentDistance > distPrev - EPSILON || tangentDistance > distNext - EPSILON) {
        return null;
    }

    const start = {
        x: curr.x + v1.x * tangentDistance,
        y: curr.y + v1.y * tangentDistance,
    };
    const end = {
        x: curr.x + v2.x * tangentDistance,
        y: curr.y + v2.y * tangentDistance,
    };

    const bisector = normalize({ x: v1.x + v2.x, y: v1.y + v2.y });
    if (length(bisector) < EPSILON) {
        return null;
    }

    const centerDistance = radius / Math.sin(angle / 2);
    const center = {
        x: curr.x + bisector.x * centerDistance,
        y: curr.y + bisector.y * centerDistance,
    };

    const radialStart = { x: start.x - center.x, y: start.y - center.y };
    const radialEnd = { x: end.x - center.x, y: end.y - center.y };
    const sweepFlag = cross(radialStart, radialEnd) > 0 ? 1 : 0;

    return {
        start,
        end,
        arc: {
            radius,
            xAxisRotation: 0,
            largeArcFlag: 0,
            sweepFlag,
        },
    };
}

/**
 * Apply fillets to a polyline and return SVG-style segments.
 * @param {Array} points - Array of {x, y}
 * @param {Object} options - { radius, cornerStyle, cornerSelection, closed }
 * @returns {Array} Array of segments (line or arc)
 */
export function filletPolyline(points, options = {}) {
    const radius = options.radius || 0;
    const cornerStyle = options.cornerStyle || "round";
    const cornerSelection = options.cornerSelection || "all";
    const closed = options.closed !== false;

    if (!points || points.length < 2) return [];

    if (radius <= 0 || cornerStyle === "bevel") {
        const segments = [];
        const count = closed ? points.length : points.length - 1;
        for (let i = 0; i < count; i++) {
            const start = points[i];
            const end = points[(i + 1) % points.length];
            if (!isNear(start, end)) {
                segments.push({ type: "line", start, end });
            }
        }
        return segments;
    }

    const orientation = getPathOrientation(points);
    const cornerInfo = new Map();
    const lastIndex = points.length - 1;

    const cornerIndices = closed
        ? points.map((_, idx) => idx)
        : points.slice(1, -1).map((_, idx) => idx + 1);

    for (const index of cornerIndices) {
        const prev = points[(index - 1 + points.length) % points.length];
        const curr = points[index];
        const next = points[(index + 1) % points.length];

        const v1 = normalize({ x: prev.x - curr.x, y: prev.y - curr.y });
        const v2 = normalize({ x: next.x - curr.x, y: next.y - curr.y });
        const turn = cross(v1, v2);

        const isOuter = isOuterCorner(turn, orientation);
        if (cornerSelection === "inner" && isOuter) continue;
        if (cornerSelection === "outer" && !isOuter) continue;

        const fillet = buildFilletArc(prev, curr, next, radius);
        if (fillet) {
            cornerInfo.set(index, fillet);
        }
    }

    const segments = [];
    const segmentCount = closed ? points.length : points.length - 1;

    for (let i = 0; i < segmentCount; i++) {
        const startCorner = cornerInfo.get(i);
        const endCorner = cornerInfo.get((i + 1) % points.length);
        const startPoint = startCorner ? startCorner.end : points[i];
        const endPoint = endCorner ? endCorner.start : points[(i + 1) % points.length];

        if (!isNear(startPoint, endPoint)) {
            segments.push({ type: "line", start: startPoint, end: endPoint });
        }

        if (endCorner) {
            segments.push({ type: "arc", start: endCorner.start, end: endCorner.end, arc: endCorner.arc });
        }
    }

    if (!closed && cornerInfo.has(lastIndex)) {
        const finalCorner = cornerInfo.get(lastIndex);
        segments.push({ type: "arc", start: finalCorner.start, end: finalCorner.end, arc: finalCorner.arc });
    }

    return segments;
}

export default filletPolyline;
