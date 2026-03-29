/**
 * Primitive offset stage for contour segments.
 *
 * This stage applies per-segment geometric offsetting only.
 * It intentionally does not perform joining, stitching, or topology repair.
 */

/**
 * @param {Array} segments
 * @param {number} offset
 * @param {{ offsetLineSegment: Function, offsetBezierSegment: Function, offsetArcSegment: Function }} deps
 * @returns {Array}
 */
export function computePrimitiveOffsets(segments, offset, deps) {
    const { offsetLineSegment, offsetBezierSegment, offsetArcSegment } = deps;
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

    return offsetSegments;
}
