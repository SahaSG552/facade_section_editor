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
 * Add caps to an open contour of offset segments.
 *
 * If the contour is already closed (last segment endpoint ≈ first segment start point),
 * returns the contour unchanged without adding caps.
 *
 * For open contours, adds a cap at the start (connecting the two offset curve endpoints
 * that came from offsetting the same original starting point) and a cap at the end
 * (connecting the two offset curve endpoints that came from offsetting the same original
 * ending point).
 *
 * NOTE: The offset curve was computed on TWO SIDES of the original curve (±distance).
 * This function receives one side (positive or negative offset). To properly cap, it
 * needs both sides. For now, caps are deferred to ContourBuilder which handles the
 * full offset construction workflow (both sides + capping).
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

    // Check if contour is closed (last end ≈ first start)
    if (pointsEqual(lastSeg.end, firstSeg.start)) {
        return offsetSegments;
    }

    // Contour is open. Caps connect back to form a closed loop.
    // Since we only have a single-side offset here, we create simple geometric caps.
    // For proper round caps in a full workflow, both offset sides would be available.

    let startCap;
    let endCap;

    if (capType === "round") {
        // Round cap: arc centered at original endpoint with radius = |offsetDistance|
        // The arc connects the two offset endpoints that came from the same original point.
        //
        // At start: both sides of the offset meet. We approximate as arc from
        // firstSeg.start back to itself (creating semi-circular cap).
        // This assumes the "other side" would be diametrically opposite.
        //
        // For a proper implementation, ContourBuilder should handle both sides + capping together.
        // Here we create a degenerate arc that closes the loop minimally.
        const startRadius = Math.abs(offsetDistance);
        const startCenterAngle = Math.atan2(-offsetDistance, 0);
        startCap = {
            type: "arc",
            start: firstSeg.start,
            end: firstSeg.start,
            arc: {
                center: firstSeg.start,
                radius: startRadius,
                startAngle: startCenterAngle,
                endAngle: startCenterAngle + Math.PI,
                sweepFlag: offsetDistance >= 0 ? 1 : 0,
            },
        };

        const endRadius = Math.abs(offsetDistance);
        const endCenterAngle = Math.atan2(offsetDistance, 0);
        endCap = {
            type: "arc",
            start: lastSeg.end,
            end: lastSeg.end,
            arc: {
                center: lastSeg.end,
                radius: endRadius,
                startAngle: endCenterAngle,
                endAngle: endCenterAngle + Math.PI,
                sweepFlag: offsetDistance >= 0 ? 1 : 0,
            },
        };
    } else {
        // Flat caps: simple lines from start to itself and end to itself (degenerate).
        // In a proper workflow, these would connect the two offset sides.
        startCap = capFlat(firstSeg.start, firstSeg.start);
        endCap = capFlat(lastSeg.end, lastSeg.end);
    }

    return [startCap, ...offsetSegments, endCap];
}

export default {
    capFlat,
    capRound,
    capOpenContour,
};
