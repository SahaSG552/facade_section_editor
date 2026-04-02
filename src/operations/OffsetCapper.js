/**
 * OffsetCapper
 *
 * Adds caps to open curve offsets. For closed contours, returns unchanged.
 *
 * Cap Types:
 * - Flat: Straight line connecting offset curve endpoints
 * - Round: Arc with radius = |offset distance| connecting endpoints
 */

const EPSILON = 1e-9;

/**
 * @typedef {Object} Point2D
 * @property {number} x - X coordinate.
 * @property {number} y - Y coordinate.
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
 * @property {Object} arc - Arc geometry data.
 * @property {Point2D} arc.center - Arc center point.
 * @property {number} arc.radius - Arc radius.
 * @property {number} arc.startAngle - Start angle in radians.
 * @property {number} arc.endAngle - End angle in radians.
 * @property {0|1} arc.sweepFlag - Sweep direction (0 = CW, 1 = CCW).
 */

/**
 * Check if two points are approximately equal.
 *
 * @param {Point2D} p1 - First point.
 * @param {Point2D} p2 - Second point.
 * @returns {boolean} True if points are within EPSILON distance.
 */
function pointsEqual(p1, p2) {
    return Math.abs(p1.x - p2.x) < EPSILON && Math.abs(p1.y - p2.y) < EPSILON;
}

/**
 * Create a flat cap: straight line connecting two points.
 *
 * @param {Point2D} point1 - First endpoint.
 * @param {Point2D} point2 - Second endpoint.
 * @returns {LineSegment} Flat cap segment.
 *
 * @example
 * const cap = capFlat({x: 0, y: 5}, {x: 10, y: 5});
 * // Returns: {type: "line", start: {x: 0, y: 5}, end: {x: 10, y: 5}}
 */
export function capFlat(point1, point2) {
    return {
        type: "line",
        start: { x: point1.x, y: point1.y },
        end: { x: point2.x, y: point2.y },
    };
}

/**
 * Create a round cap: arc connecting two points with specified radius and sweep direction.
 *
 * The arc center is at the origin point, with radius equal to |offset distance|.
 * Start/end angles are computed from the offset curve endpoints relative to the center.
 *
 * @param {Point2D} centerPoint - Arc center (original curve endpoint).
 * @param {number} offsetDistance - Signed offset distance (determines sweep direction and radius).
 * @param {Point2D} startPoint - Arc start endpoint (first offset curve endpoint).
 * @param {Point2D} endPoint - Arc end endpoint (second offset curve endpoint).
 * @param {0|1} [sweepFlag] - Override sweep direction (0 = CW, 1 = CCW). Computed from offsetDistance if omitted.
 * @returns {ArcSegment} Round cap segment.
 *
 * @example
 * // Arc cap with center at (0,0), radius 5, from (5,0) to (0,5)
 * const cap = capRound(
 *   {x: 0, y: 0},  // center
 *   5,              // offset distance
 *   {x: 5, y: 0},   // start point on arc
 *   {x: 0, y: 5}    // end point on arc
 * );
 * // Returns arc segment with radius 5, startAngle=0, endAngle=π/2
 */
export function capRound(centerPoint, offsetDistance, startPoint, endPoint, sweepFlag) {
    const radius = Math.abs(offsetDistance);

    // Calculate angles from center to start/end points
    const startAngle = Math.atan2(startPoint.y - centerPoint.y, startPoint.x - centerPoint.x);
    const endAngle = Math.atan2(endPoint.y - centerPoint.y, endPoint.x - centerPoint.x);

    // Determine sweep direction if not provided
    // For Y-down (SVG) coordinates: positive offset = outside (CCW), negative = inside (CW)
    // For CCW arc (sweepFlag=1): radius grows with positive offset
    // For CW arc (sweepFlag=0): radius shrinks with positive offset
    let sweep = sweepFlag;
    if (sweep === undefined) {
        sweep = offsetDistance >= 0 ? 1 : 0;
    }

    return {
        type: "arc",
        start: { x: startPoint.x, y: startPoint.y },
        end: { x: endPoint.x, y: endPoint.y },
        arc: {
            center: { x: centerPoint.x, y: centerPoint.y },
            radius,
            startAngle,
            endAngle,
            sweepFlag: sweep,
        },
    };
}

/**
 * Add caps to an open contour given BOTH offset sides (+d and -d).
 *
 * The start cap connects the start of the positive-side to the start of the negative-side
 * (both offset from the same original curve start point).
 * The end cap connects the end of the positive-side to the end of the negative-side
 * (both offset from the same original curve end point).
 *
 * The negative-side segments are reversed so that the combined contour traces:
 *   startCap → positiveSegs → endCap → negativeSegsReversed → (back to start)
 *
 * @param {Array<LineSegment|ArcSegment>} positiveSegments - Segments offset by +d.
 * @param {Array<LineSegment|ArcSegment>} negativeSegments - Segments offset by -d.
 * @param {number} offsetDistance - Signed offset distance (for round cap radius).
 * @param {string} [capType="flat"] - Cap type: "flat" or "round".
 * @returns {Array<LineSegment|ArcSegment>} Full closed contour with caps.
 *
 * @throws {Error} Thrown when positiveSegments or negativeSegments is empty.
 */
export function capBothSides(positiveSegments, negativeSegments, offsetDistance, capType = "flat") {
    if (!positiveSegments || positiveSegments.length === 0) {
        throw new Error("positiveSegments cannot be empty");
    }
    if (!negativeSegments || negativeSegments.length === 0) {
        throw new Error("negativeSegments cannot be empty");
    }

    const posFirst = positiveSegments[0];
    const posLast = positiveSegments[positiveSegments.length - 1];
    const negFirst = negativeSegments[0];
    const negLast = negativeSegments[negativeSegments.length - 1];

    // Start cap: connects posFirst.start → negFirst.start (both at original curve start)
    // End cap: connects posLast.end → negLast.end (both at original curve end)
    let startCap;
    let endCap;

    if (capType === "round") {
        // Round cap: arc centered at the original endpoint (midpoint of the two offset endpoints)
        const startCenter = {
            x: (posFirst.start.x + negFirst.start.x) / 2,
            y: (posFirst.start.y + negFirst.start.y) / 2,
        };
        const endCenter = {
            x: (posLast.end.x + negLast.end.x) / 2,
            y: (posLast.end.y + negLast.end.y) / 2,
        };
        // Start cap: arc from negFirst.start → posFirst.start (going around the start)
        startCap = capRound(startCenter, offsetDistance, negFirst.start, posFirst.start);
        // End cap: arc from posLast.end → negLast.end (going around the end)
        endCap = capRound(endCenter, offsetDistance, posLast.end, negLast.end);
    } else {
        // Flat caps: straight line connecting the two offset curve endpoints
        // Start cap: from negFirst.start back to posFirst.start
        startCap = capFlat(negFirst.start, posFirst.start);
        // End cap: from posLast.end to negLast.end
        endCap = capFlat(posLast.end, negLast.end);
    }

    // Reverse the negative segments so they flow from negLast.end → negFirst.start
    const negReversed = negativeSegments
        .slice()
        .reverse()
        .map((seg) => ({
            ...seg,
            start: { x: seg.end.x, y: seg.end.y },
            end: { x: seg.start.x, y: seg.start.y },
            arc: seg.arc
                ? {
                      ...seg.arc,
                      // Swap start/end angles for reversed arc
                      startAngle: seg.arc.endAngle,
                      endAngle: seg.arc.startAngle,
                      sweepFlag: seg.arc.sweepFlag === 1 ? 0 : 1,
                  }
                : undefined,
        }));

    // Full closed contour: posSegs → endCap → negSegsReversed → startCap → (back to posFirst.start)
    return [...positiveSegments, endCap, ...negReversed, startCap];
}

/**
 * Add caps to an open contour of offset segments.
 *
 * If the contour is already closed (last segment endpoint ≈ first segment start point),
 * returns the contour unchanged without adding caps.
 *
 * NOTE: This legacy function only receives one side of the offset.
 * For proper two-sided capping of open curves, use capBothSides() instead.
 * This function is kept for backward compatibility with closed-contour code paths
 * that may call it even though the contour is already closed.
 *
 * @param {Array<LineSegment|ArcSegment>} offsetSegments - Array of offset segments (single side).
 * @param {number} offsetDistance - Signed offset distance used for round caps.
 * @param {string} [capType="flat"] - Cap type: "flat" or "round".
 * @returns {Array<LineSegment|ArcSegment>} New array with caps added (or original if closed).
 *
 * @throws {Error} Thrown when offsetSegments is empty.
 */
export function capOpenContour(offsetSegments, offsetDistance, capType = "flat") {
    if (!offsetSegments || offsetSegments.length === 0) {
        throw new Error("offsetSegments cannot be empty");
    }

    const firstSeg = offsetSegments[0];
    const lastSeg = offsetSegments[offsetSegments.length - 1];

    // Check if contour is closed (last end ≈ first start) — return as-is
    if (pointsEqual(lastSeg.end, firstSeg.start)) {
        return offsetSegments;
    }

    // Single-side fallback: this should not normally be called for open contours.
    // OffsetEngine now uses capBothSides() for open curves. This path is a safety
    // fallback that creates minimal (non-degenerate) flat caps.
    const startCap = capFlat(lastSeg.end, firstSeg.start);
    return [...offsetSegments, startCap];
}

export default {
    capFlat,
    capRound,
    capOpenContour,
    capBothSides,
};
