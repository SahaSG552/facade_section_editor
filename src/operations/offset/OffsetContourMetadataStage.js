/**
 * Metadata and ordering stage for structured contour outputs.
 */

function bboxFromPoints(points) {
    if (!Array.isArray(points) || points.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

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

    if (!Number.isFinite(minX)) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    return { minX, minY, maxX, maxY };
}

function pointInPolygon(point, polygonPoints, epsilon) {
    if (!point || !Array.isArray(polygonPoints) || polygonPoints.length < 3) {
        return false;
    }

    let inside = false;
    const count = polygonPoints.length;

    for (let i = 0, j = count - 1; i < count; j = i++) {
        const pi = polygonPoints[i];
        const pj = polygonPoints[j];
        if (!pi || !pj) continue;

        const intersects = ((pi.y > point.y) !== (pj.y > point.y))
            && (point.x < ((pj.x - pi.x) * (point.y - pi.y)) / ((pj.y - pi.y) || epsilon) + pi.x);

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}

function getRepresentativePoint(samplePoints, bbox, epsilon) {
    if (!Array.isArray(samplePoints) || samplePoints.length < 3) {
        return {
            x: (bbox.minX + bbox.maxX) * 0.5,
            y: (bbox.minY + bbox.maxY) * 0.5,
        };
    }

    let twiceArea = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < samplePoints.length - 1; i++) {
        const a = samplePoints[i];
        const b = samplePoints[i + 1];
        if (!a || !b) continue;
        const crossValue = a.x * b.y - b.x * a.y;
        twiceArea += crossValue;
        cx += (a.x + b.x) * crossValue;
        cy += (a.y + b.y) * crossValue;
    }

    if (Math.abs(twiceArea) > epsilon) {
        const factor = 1 / (3 * twiceArea);
        return { x: cx * factor, y: cy * factor };
    }

    return {
        x: (bbox.minX + bbox.maxX) * 0.5,
        y: (bbox.minY + bbox.maxY) * 0.5,
    };
}

function compareContourOrder(left, right) {
    if (left.containmentDepth !== right.containmentDepth) {
        return left.containmentDepth - right.containmentDepth;
    }
    if (left.absoluteArea !== right.absoluteArea) {
        return right.absoluteArea - left.absoluteArea;
    }
    if (left.bbox.minX !== right.bbox.minX) {
        return left.bbox.minX - right.bbox.minX;
    }
    if (left.bbox.minY !== right.bbox.minY) {
        return left.bbox.minY - right.bbox.minY;
    }
    if (left.pathData !== right.pathData) {
        return left.pathData.localeCompare(right.pathData);
    }
    return left.sourceIndex - right.sourceIndex;
}

function annotateContainmentDepth(orderedContours, epsilon) {
    for (let index = 0; index < orderedContours.length; index++) {
        const contour = orderedContours[index];
        if (!contour.closed || contour.samplePoints.length < 3) {
            contour.containmentDepth = 0;
            continue;
        }

        const testPoint = getRepresentativePoint(contour.samplePoints, contour.bbox, epsilon);
        let depth = 0;

        for (let parentIndex = 0; parentIndex < orderedContours.length; parentIndex++) {
            if (parentIndex === index) continue;
            const parent = orderedContours[parentIndex];
            if (!parent.closed || parent.samplePoints.length < 3) continue;
            if (parent.absoluteArea <= contour.absoluteArea + epsilon) continue;

            if (pointInPolygon(testPoint, parent.samplePoints, epsilon)) {
                depth += 1;
            }
        }

        contour.containmentDepth = depth;
    }

    return orderedContours;
}

function buildContourMetadata(pathData, segments, closed, deps) {
    const { contourToPoints, clonePoint, isNear, joinTolerance, signedArea } = deps;
    const contourPoints = contourToPoints(segments);
    const normalizedPoints = [...contourPoints];

    if (
        closed
        && normalizedPoints.length > 1
        && !isNear(normalizedPoints[0], normalizedPoints[normalizedPoints.length - 1], joinTolerance)
    ) {
        normalizedPoints.push(clonePoint(normalizedPoints[0]));
    }

    const area = closed ? signedArea(normalizedPoints) : 0;
    const bbox = bboxFromPoints(normalizedPoints);

    return {
        pathData,
        segments,
        closed,
        orientation: !closed ? "open" : area >= 0 ? "ccw" : "cw",
        signedArea: area,
        absoluteArea: Math.abs(area),
        bbox,
        samplePoints: normalizedPoints,
        containmentDepth: 0,
        fallbackApplied: false,
        fallbackReason: null,
    };
}

/**
 * @param {Array} segments
 * @param {Object} options
 * @param {{
 *   stitchAndQuantizeContourSegments: Function,
 *   segmentsToSVGPath: Function,
 *   isNear: Function,
 *   joinTolerance: number,
 *   contourToPoints: Function,
 *   clonePoint: Function,
 *   signedArea: Function,
 * }} deps
 * @returns {Object|null}
 */
export function buildContourResultFromSegments(segments, options = {}, deps) {
    const { stitchAndQuantizeContourSegments, segmentsToSVGPath, isNear, joinTolerance } = deps;
    const stitched = stitchAndQuantizeContourSegments(segments, options);
    if (stitched.length === 0) return null;

    const contourPath = segmentsToSVGPath(stitched);
    const closed = isNear(stitched[0].start, stitched[stitched.length - 1].end, joinTolerance);
    return buildContourMetadata(contourPath, stitched, closed, deps);
}

/**
 * @param {Array<Object>} contours
 * @param {{ epsilon: number }} deps
 * @returns {Array<Object>}
 */
export function finalizeContourCollection(contours, deps) {
    const { epsilon } = deps;

    const indexed = contours.map((contour, sourceIndex) => ({
        ...contour,
        sourceIndex,
    }));

    const preSorted = [...indexed].sort((left, right) => {
        if (left.absoluteArea !== right.absoluteArea) {
            return right.absoluteArea - left.absoluteArea;
        }
        if (left.bbox.minX !== right.bbox.minX) {
            return left.bbox.minX - right.bbox.minX;
        }
        if (left.bbox.minY !== right.bbox.minY) {
            return left.bbox.minY - right.bbox.minY;
        }
        if (left.pathData !== right.pathData) {
            return left.pathData.localeCompare(right.pathData);
        }
        return left.sourceIndex - right.sourceIndex;
    });

    const withContainment = annotateContainmentDepth(preSorted, epsilon);

    return withContainment
        .sort(compareContourOrder)
        .map(({ samplePoints, sourceIndex, ...contour }) => contour);
}
