/**
 * Hybrid fallback stage for structured contour output.
 *
 * This stage is intentionally opt-in and only activates for unstable
 * self-intersecting contour outputs.
 */

/**
 * @param {Object} contour
 * @param {{ referencePathData: string, options: Object }} context
 * @param {{
 *   pathHasSelfIntersections: Function,
 *   resolveSelfIntersections: Function,
 *   shouldAcceptTrimmedPath: Function,
 *   normalizeInputContours: Function,
 *   normalizeArcAngles: Function,
 *   splitSegmentsIntoContours: Function,
 *   buildContourResultFromSegments: Function,
 *   log: any,
 * }} deps
 * @returns {Array<Object>}
 */
export function applyHybridFallbackStage(contour, context, deps) {
    const { referencePathData, options = {} } = context;
    const {
        pathHasSelfIntersections,
        samplePathPoints,
        isNear,
        resolveSelfIntersections,
        shouldAcceptTrimmedPath,
        normalizeInputContours,
        normalizeArcAngles,
        splitSegmentsIntoContours,
        buildContourResultFromSegments,
        epsilon,
        log,
    } = deps;

    if (!options.enableHybridFallback || !options.trimSelfIntersections) {
        return [contour];
    }

    if (!pathHasSelfIntersections(contour.pathData, {
        samplePathPoints,
        isNear,
        epsilon,
    })) {
        return [contour];
    }

    const repairedPath = resolveSelfIntersections(contour.pathData, {
        referencePathData,
    });

    if (!repairedPath || !shouldAcceptTrimmedPath(contour.pathData, repairedPath)) {
        return [{
            ...contour,
            fallbackApplied: false,
            fallbackReason: options.fallbackDiagnostics ? "hybrid-rejected" : null,
        }];
    }

    const repairedContours = normalizeInputContours(repairedPath, options, {
        normalizeArcAngles,
        splitSegmentsIntoContours,
        log,
    });

    const repaired = repairedContours
        .map((segments) => buildContourResultFromSegments(segments, options))
        .filter((candidate) => candidate && candidate.pathData);

    if (repaired.length === 0) {
        return [{
            ...contour,
            fallbackApplied: false,
            fallbackReason: options.fallbackDiagnostics ? "hybrid-parse-empty" : null,
        }];
    }

    return repaired.map((candidate) => ({
        ...candidate,
        fallbackApplied: true,
        fallbackReason: options.fallbackDiagnostics ? "self-intersection" : null,
    }));
}
