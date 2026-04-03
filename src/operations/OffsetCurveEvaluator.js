/**
 * OffsetCurveEvaluator
 *
 * Pure mathematical kernel for per-segment offset computation based on the
 * OCCT Geom2d_OffsetCurve formula:
 * Value(u) = BasisCurve.Value(U) + Offset * N
 * where N is the unit normal (tangent rotated 90° CCW).
 */

const EPSILON = 1e-9;

/**
 * @typedef {Object} Point2D
 * @property {number} x - X coordinate.
 * @property {number} y - Y coordinate.
 */

/**
 * @typedef {Object} Vector2D
 * @property {number} x - X component.
 * @property {number} y - Y component.
 */

/**
 * @typedef {Object} ArcData
 * @property {Point2D} [center] - Arc center point.
 * @property {number} [centerX] - Arc center X (legacy-compatible shape).
 * @property {number} [centerY] - Arc center Y (legacy-compatible shape).
 * @property {number} radius - Arc radius.
 * @property {number} startAngle - Start angle in radians.
 * @property {number} endAngle - End angle in radians.
 * @property {0|1} sweepFlag - Sweep direction (0 = CW, 1 = CCW).
 */

/**
 * @typedef {Object} LineSegment
 * @property {"line"} type - Segment type.
 * @property {Point2D} start - Segment start point.
 * @property {Point2D} end - Segment end point.
 */

/**
 * @typedef {Object} ArcSegment
 * @property {"arc"} type - Segment type.
 * @property {Point2D} start - Segment start point.
 * @property {Point2D} end - Segment end point.
 * @property {ArcData} arc - Arc geometry data.
 */

/**
 * Rotate a 2D vector by 90° counter-clockwise.
 *
 * @param {Vector2D} vec - Input vector.
 * @returns {Vector2D} Rotated vector (-y, x).
 */
export function rotate90CCW(vec) {
    return {
        x: -vec.y,
        y: vec.x,
    };
}

/**
 * Rotate a 2D vector by 90° clockwise.
 *
 * @param {Vector2D} vec - Input vector.
 * @returns {Vector2D} Rotated vector (y, -x).
 */
export function rotate90CW(vec) {
    return {
        x: vec.y,
        y: -vec.x,
    };
}

/**
 * Normalize a 2D vector.
 *
 * @param {Vector2D} vec - Input vector.
 * @returns {Vector2D} Unit vector. Returns {x:0, y:0} for near-zero input.
 */
export function normalize(vec) {
    const length = Math.hypot(vec.x, vec.y);
    if (length <= EPSILON) {
        return { x: 0, y: 0 };
    }

    return {
        x: vec.x / length,
        y: vec.y / length,
    };
}

/**
 * Compute unit tangent at an arc angle.
 *
 * @param {number} angle - Arc angle in radians.
 * @param {Point2D} center - Arc center (kept for API compatibility and clarity).
 * @param {0|1} sweepFlag - Sweep direction (0 = CW, 1 = CCW).
 * @returns {Vector2D} Unit tangent vector at the requested angle.
 */
export function tangentAtArc(angle, center, sweepFlag) {
    void center;

    const direction = sweepFlag === 1 ? 1 : -1;

    return normalize({
        x: -Math.sin(angle) * direction,
        y: Math.cos(angle) * direction,
    });
}

/**
 * Offset a line segment by translating it along the segment normal.
 *
 * Formula:
 * - T = normalize(end - start)
 * - N = rotate90CCW(T) = (-T.y, T.x)
 * - P' = P + distance * N
 *
 * @param {LineSegment} segment - Source line segment.
 * @param {number} distance - Signed offset distance.
 * @returns {LineSegment|null} New offset line segment, or null for degenerate input.
 */
export function offsetLine(segment, distance) {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const tangent = normalize({ x: dx, y: dy });

    if (Math.hypot(tangent.x, tangent.y) <= EPSILON) {
        return null;
    }

    const normal = rotate90CW(tangent);

    return {
        ...segment,
        type: "line",
        start: {
            x: segment.start.x + distance * normal.x,
            y: segment.start.y + distance * normal.y,
        },
        end: {
            x: segment.end.x + distance * normal.x,
            y: segment.end.y + distance * normal.y,
        },
    };
}

/**
 * Offset an arc segment as a concentric arc with adjusted radius.
 *
 * Formula:
 * newRadius = radius + distance * (sweepFlag === 1 ? 1 : -1)
 *
 * - sweepFlag = 1 (CCW), positive distance grows radius (outside)
 * - sweepFlag = 0 (CW), positive distance shrinks radius (inside)
 *
 * Center and angles are preserved. Start/end are recalculated from
 * center + newRadius * [cos(angle), sin(angle)].
 *
 * @param {ArcSegment} segment - Source arc segment.
 * @param {number} distance - Signed offset distance.
 * @returns {ArcSegment|null} New offset arc segment, or null when the offset arc degenerates.
 */
export function offsetArc(segment, distance) {
    const arc = segment.arc;
    if (!arc) {
        return null;
    }

    const center = getArcCenter(arc);
    if (!center) {
        return null;
    }

    const radius = Number(arc.radius);
    // DXF exporter returns angles in degrees — convert to radians if needed.
    // Heuristic: if |angle| > 2*PI, it's in degrees.
    const toRad = (deg) => deg * Math.PI / 180;
    const isDegrees = (v) => Number.isFinite(v) && Math.abs(v) > 2 * Math.PI + 0.01;
    const startAngle = isDegrees(arc.startAngle) ? toRad(arc.startAngle) : Number(arc.startAngle);
    const endAngle = isDegrees(arc.endAngle) ? toRad(arc.endAngle) : Number(arc.endAngle);
    const sweepFlag = arc.sweepFlag === 1 ? 1 : 0;

    if (!Number.isFinite(radius) || !Number.isFinite(startAngle) || !Number.isFinite(endAngle)) {
        return null;
    }

    const newRadius = radius + distance;
    if (newRadius <= EPSILON) {
        return null;
    }

    const start = {
        x: center.x + newRadius * Math.cos(startAngle),
        y: center.y + newRadius * Math.sin(startAngle),
    };

    const end = {
        x: center.x + newRadius * Math.cos(endAngle),
        y: center.y + newRadius * Math.sin(endAngle),
    };

    const nextArc = {
        ...arc,
        radius: newRadius,
        startAngle,
        endAngle,
        sweepFlag,
    };

    if ("center" in arc) {
        nextArc.center = { x: center.x, y: center.y };
    }

    if ("centerX" in arc) {
        nextArc.centerX = center.x;
    }

    if ("centerY" in arc) {
        nextArc.centerY = center.y;
    }

    if ("rx" in arc) {
        nextArc.rx = newRadius;
    }

    if ("ry" in arc) {
        nextArc.ry = newRadius;
    }

    return {
        ...segment,
        type: "arc",
        start,
        end,
        arc: nextArc,
    };
}

/**
 * Offset a supported segment type.
 *
 * Supported types:
 * - line
 * - arc
 *
 * @param {LineSegment|ArcSegment} segment - Source segment.
 * @param {number} distance - Signed offset distance.
 * @returns {LineSegment|ArcSegment|null} Offset segment, or null for degenerate geometry.
 * @throws {Error} Thrown when segment type is unsupported.
 */
export function offsetSegment(segment, distance) {
    if (segment.type === "line") {
        return offsetLine(segment, distance);
    }

    if (segment.type === "arc") {
        return offsetArc(segment, distance);
    }

    throw new Error(
        `Unsupported segment type "${segment.type}". OffsetCurveEvaluator supports only "line" and "arc" segments.`
    );
}

/**
 * Resolve arc center from either modern ({center}) or legacy ({centerX, centerY}) shape.
 *
 * @param {ArcData} arc - Arc object.
 * @returns {Point2D|null} Center point, or null when unavailable.
 */
function getArcCenter(arc) {
    if (arc.center && Number.isFinite(arc.center.x) && Number.isFinite(arc.center.y)) {
        return { x: arc.center.x, y: arc.center.y };
    }

    if (Number.isFinite(arc.centerX) && Number.isFinite(arc.centerY)) {
        return { x: arc.centerX, y: arc.centerY };
    }

    return null;
}

export default {
    normalize,
    rotate90CCW,
    tangentAtArc,
    offsetLine,
    offsetArc,
    offsetSegment,
};
