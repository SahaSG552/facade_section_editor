/**
 * Dependency factory helpers for staged offset pipeline.
 */

/**
 * @param {Object} deps
 * @returns {Object}
 */
export function createContourMetadataStageDeps(deps) {
    const {
        stitchAndQuantizeContourSegments,
        segmentsToSVGPath,
        isNear,
        joinTolerance,
        contourToPoints,
        clonePoint,
        signedArea,
    } = deps;

    return {
        stitchAndQuantizeContourSegments,
        segmentsToSVGPath,
        isNear,
        joinTolerance,
        contourToPoints,
        clonePoint,
        signedArea,
    };
}

/**
 * @param {Function} buildContourResultFromSegmentsFn
 * @param {Object} contourMetadataDeps
 * @param {Object} defaultOptions
 * @returns {Function}
 */
export function createContourResultBuilder(
    buildContourResultFromSegmentsFn,
    contourMetadataDeps,
    defaultOptions,
) {
    return (segments, options = defaultOptions) => buildContourResultFromSegmentsFn(
        segments,
        options,
        contourMetadataDeps,
    );
}

/**
 * @param {Object} deps
 * @returns {Object}
 */
export function createSelfIntersectionStageDeps(deps) {
    const {
        samplePathPoints,
        isNear,
        epsilon,
    } = deps;

    return {
        samplePathPoints,
        isNear,
        epsilon,
    };
}

/**
 * @param {Object} deps
 * @returns {Object}
 */
export function createFallbackStageDeps(deps) {
    const {
        pathHasSelfIntersections,
        selfIntersectionDeps,
        resolveSelfIntersections,
        shouldAcceptTrimmedPath,
        normalizeInputContours,
        normalizeArcAngles,
        splitSegmentsIntoContours,
        buildContourResult,
        epsilon,
        log,
    } = deps;

    return {
        pathHasSelfIntersections,
        ...selfIntersectionDeps,
        resolveSelfIntersections,
        shouldAcceptTrimmedPath,
        normalizeInputContours,
        normalizeArcAngles,
        splitSegmentsIntoContours,
        buildContourResultFromSegments: buildContourResult,
        epsilon,
        log,
    };
}
