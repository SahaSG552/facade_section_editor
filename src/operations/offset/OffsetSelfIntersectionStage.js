/**
 * Self-intersection detection stage for path outputs.
 */

function orientation2d(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a, b, point, epsilon) {
    return point.x <= Math.max(a.x, b.x) + epsilon
        && point.x + epsilon >= Math.min(a.x, b.x)
        && point.y <= Math.max(a.y, b.y) + epsilon
        && point.y + epsilon >= Math.min(a.y, b.y);
}

function lineSegmentsIntersect(a1, a2, b1, b2, epsilon) {
    const o1 = orientation2d(a1, a2, b1);
    const o2 = orientation2d(a1, a2, b2);
    const o3 = orientation2d(b1, b2, a1);
    const o4 = orientation2d(b1, b2, a2);

    if ((o1 > epsilon && o2 < -epsilon || o1 < -epsilon && o2 > epsilon)
        && (o3 > epsilon && o4 < -epsilon || o3 < -epsilon && o4 > epsilon)) {
        return true;
    }

    if (Math.abs(o1) <= epsilon && onSegment(a1, a2, b1, epsilon)) return true;
    if (Math.abs(o2) <= epsilon && onSegment(a1, a2, b2, epsilon)) return true;
    if (Math.abs(o3) <= epsilon && onSegment(b1, b2, a1, epsilon)) return true;
    if (Math.abs(o4) <= epsilon && onSegment(b1, b2, a2, epsilon)) return true;

    return false;
}

/**
 * @param {string} pathData
 * @param {{
 *   samplePathPoints?: Function,
 *   isNear: Function,
 *   epsilon?: number,
 * }} deps
 * @returns {boolean}
 */
export function pathHasSelfIntersections(pathData, deps) {
    const {
        samplePathPoints,
        isNear,
        epsilon = 1e-6,
    } = deps;

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
            if (lineSegmentsIntersect(a1, a2, b1, b2, epsilon)) {
                return true;
            }
        }
    }

    return false;
}
