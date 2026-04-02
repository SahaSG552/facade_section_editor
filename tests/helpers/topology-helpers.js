/**
 * Topology Test Helpers
 *
 * Provides utilities for verifying geometric topology correctness in offset operations.
 * Used for validating contour continuity, segment validity, and contour counts.
 */

/**
 * Floating-point epsilon for tolerance comparisons
 * @type {number}
 */
export const EPS = 1e-6;

/**
 * Calculate Euclidean distance between two points
 * @param {Object} p1 - Point with x, y properties
 * @param {Object} p2 - Point with x, y properties
 * @returns {number} Distance between points
 * @private
 */
function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Assert that segments form a continuous path (end of segment N connects to start of segment N+1)
 *
 * @param {Array} segments - Array of segment objects with {start, end} properties
 * @throws {Error} If segments are not continuous within tolerance
 *
 * @example
 * assertContinuity(contour.segments); // Throws if gaps exist
 */
export function assertContinuity(segments) {
    if (!segments || segments.length === 0) {
        return; // Empty segments pass
    }

    for (let i = 0; i < segments.length - 1; i++) {
        const currentEnd = segments[i].end;
        const nextStart = segments[i + 1].start;

        const gap = distance(currentEnd, nextStart);

        if (gap >= EPS) {
            throw new Error(
                `Segment discontinuity at index ${i}: gap=${gap.toFixed(8)} ` +
                `(end=${JSON.stringify(currentEnd)} vs next start=${JSON.stringify(nextStart)})`,
            );
        }
    }
}

/**
 * Assert that no segment has zero or near-zero length
 *
 * @param {Array} segments - Array of segment objects with {start, end} properties
 * @throws {Error} If any segment has length < EPS
 *
 * @example
 * assertNoZeroLength(contour.segments); // Throws if degenerate segments found
 */
export function assertNoZeroLength(segments) {
    if (!segments || segments.length === 0) {
        return; // Empty segments pass
    }

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const len = distance(seg.start, seg.end);

        if (len < EPS) {
            throw new Error(
                `Zero-length segment at index ${i}: length=${len.toFixed(8)} ` +
                `(start=${JSON.stringify(seg.start)}, end=${JSON.stringify(seg.end)})`,
            );
        }
    }
}

/**
 * Assert that result has expected number of contours
 *
 * @param {Object} result - Result object with contours array
 * @param {number} expected - Expected contour count
 * @throws {Error} If contour count doesn't match
 *
 * @example
 * assertContourCount(result, 1); // Throws if result.contours.length !== 1
 */
export function assertContourCount(result, expected) {
    const actual = result.contours ? result.contours.length : 0;

    if (actual !== expected) {
        throw new Error(
            `Contour count mismatch: expected ${expected}, got ${actual}`,
        );
    }
}
