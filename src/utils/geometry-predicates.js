/**
 * Geometry Predicates - Geometric calculations for point/line operations
 * 
 * Provides basic geometric predicates for orientation tests, segment containment,
 * and line segment intersection detection.
 */

import { orient2d as robustOrient2d } from 'robust-predicates';

/**
 * EPSILON (1e-6): Geometric validity checks
 * - Guards against floating-point precision limits
 * - Used in: vector normalization, length tests, intersection math
 */
export const EPSILON = 1e-6;

/**
 * Calculate orientation of point c relative to directed line from a to b.
 * 
 * @param {Object} a - First point {x, y}
 * @param {Object} b - Second point {x, y}
 * @param {Object} c - Test point {x, y}
 * @returns {number} - Positive: CCW turn, Negative: CW turn, ~0: Collinear
 */
export function orientation2d(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/**
 * Robust orientation test using robust-predicates library.
 * Determines if point c is to the left (CCW), right (CW), or collinear with line ab.
 * 
 * Uses exact arithmetic to avoid floating-point precision errors that can cause
 * incorrect orientation determination in degenerate cases.
 * 
 * Note: robust-predicates uses opposite sign convention, so we negate the result
 * to match our orientation2d convention (positive = CCW, negative = CW).
 * 
 * @param {Object} a - First point of line segment {x, y}
 * @param {Object} b - Second point of line segment {x, y}
 * @param {Object} c - Test point {x, y}
 * @returns {number} - Positive (CCW), negative (CW), or zero (collinear)
 */
export function orient2d(a, b, c) {
    return -robustOrient2d(a.x, a.y, b.x, b.y, c.x, c.y);
}

/**
 * Test if point p lies on line segment from a to b (inclusive of endpoints).
 * 
 * @param {Object} a - Segment start {x, y}
 * @param {Object} b - Segment end {x, y}
 * @param {Object} p - Test point {x, y}
 * @returns {boolean} - True if p is on segment [a, b]
 */
export function onSegment(a, b, p) {
    return p.x <= Math.max(a.x, b.x) + EPSILON
        && p.x + EPSILON >= Math.min(a.x, b.x)
        && p.y <= Math.max(a.y, b.y) + EPSILON
        && p.y + EPSILON >= Math.min(a.y, b.y);
}

/**
 * Test if line segment [a1, a2] intersects with line segment [b1, b2].
 * Handles proper intersections, endpoint touching, and overlapping segments.
 * 
 * @param {Object} a1 - First segment start {x, y}
 * @param {Object} a2 - First segment end {x, y}
 * @param {Object} b1 - Second segment start {x, y}
 * @param {Object} b2 - Second segment end {x, y}
 * @returns {boolean} - True if segments intersect
 */
export function lineSegmentsIntersect(a1, a2, b1, b2) {
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
