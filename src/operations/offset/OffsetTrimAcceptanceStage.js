/**
 * Path sampling and trim-acceptance policy for repaired/self-intersection output.
 */

/**
 * @param {string} pathData
 * @param {number} [sampleCount]
 * @param {{ epsilon?: number }} [deps]
 * @returns {Array<{x:number,y:number}>}
 */
export function samplePathPoints(pathData, sampleCount = 128, deps = {}) {
    const epsilon = deps.epsilon ?? 1e-6;

    if (!pathData || typeof document === "undefined") return [];

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);

    let totalLength = 0;
    try {
        totalLength = path.getTotalLength();
    } catch {
        return [];
    }
    if (!(totalLength > epsilon)) return [];

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

/**
 * @param {Array<{x:number,y:number}>} points
 * @returns {number}
 */
export function signedArea(points) {
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

/**
 * @param {Array<{x:number,y:number}>} points
 * @returns {number}
 */
export function bboxArea(points) {
    if (!Array.isArray(points) || points.length === 0) return 0;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of points) {
        if (!point) continue;
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    if (!Number.isFinite(minX)) return 0;
    return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

/**
 * @param {string} originalPath
 * @param {string} trimmedPath
 * @param {{
 *   samplePathPoints?: Function,
 *   signedArea?: Function,
 *   bboxArea?: Function,
 *   epsilon?: number,
 * }} [deps]
 * @returns {boolean}
 */
export function shouldAcceptTrimmedPath(originalPath, trimmedPath, deps = {}) {
    const policy = {
        samplePathPoints: deps.samplePathPoints ?? samplePathPoints,
        signedArea: deps.signedArea ?? signedArea,
        bboxArea: deps.bboxArea ?? bboxArea,
        epsilon: deps.epsilon ?? 1e-6,
    };

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

    const originalPoints = policy.samplePathPoints(originalPath, 256);
    const trimmedPoints = policy.samplePathPoints(trimmedPath, 256);
    if (trimmedPoints.length < 4) return false;

    const originalAbsArea = Math.abs(policy.signedArea(originalPoints));
    const trimmedAbsArea = Math.abs(policy.signedArea(trimmedPoints));
    const originalBBoxArea = policy.bboxArea(originalPoints);
    const trimmedBBoxArea = policy.bboxArea(trimmedPoints);

    if (originalAbsArea > policy.epsilon) {
        const areaRatio = trimmedAbsArea / originalAbsArea;
        if (areaRatio < 0.35) return false;
    }

    if (originalBBoxArea > policy.epsilon) {
        const bboxRatio = trimmedBBoxArea / originalBBoxArea;
        if (bboxRatio < 0.35) return false;
    }

    return true;
}
