import LoggerFactory from "../core/LoggerFactory.js";
import { buildOffsetContour } from "./OffsetContourBuilder.js";
import { trimSelfIntersections } from "./OffsetTrimmer.js";
import { capBothSides } from "./OffsetCapper.js";
import { segmentsToSVGPath } from "../utils/arcApproximation.js";
import { isSegmentDegenerated } from "./OffsetRules.js";

const log = LoggerFactory.createLogger("OffsetEngine");
const EPSILON = 1e-9;
const MAX_DEGENERATION_SPLITS = 8;
const MAX_MONOTONIC_OPEN_STEPS = 4096;
const MONOTONIC_OPEN_STEP = 0.01;

/**
 * Reverse an open contour segment chain for offset normalization.
 * Swaps each segment's start/end and reverses the array order.
 * Arc segments have sweepFlag flipped and start/end angles swapped.
 * @param {Array<Object>} segments
 * @returns {Array<Object>}
 */
function reverseContourForOffset(segments) {
    return segments.slice().reverse().map((seg) => {
        const rev = {
            ...seg,
            start: { x: seg.end.x, y: seg.end.y },
            end: { x: seg.start.x, y: seg.start.y },
        };
        if (seg.type === "arc" && seg.arc) {
            rev.arc = {
                ...seg.arc,
                startAngle: seg.arc.endAngle,
                endAngle: seg.arc.startAngle,
                sweepFlag: seg.arc.sweepFlag === 1 ? 0 : 1,
            };
            if (seg.arc.center) {
                rev.arc.center = { x: seg.arc.center.x, y: seg.arc.center.y };
            }
        }
        return rev;
    });
}

function getArcRadiusFromSegment(segment) {
    if (!segment || segment.type !== "arc" || !segment.arc) {
        return null;
    }

    const { arc } = segment;
    if (typeof arc.radius === "number" && Number.isFinite(arc.radius)) {
        const r = Math.abs(arc.radius);
        return r > EPSILON ? r : null;
    }

    if (typeof arc.rx === "number" && Number.isFinite(arc.rx)) {
        const r = Math.abs(arc.rx);
        return r > EPSILON ? r : null;
    }

    return null;
}

function getArcCenterFromSegment(segment) {
    const arc = segment?.arc;
    if (!arc) return null;

    if (
        arc.center &&
        Number.isFinite(arc.center.x) &&
        Number.isFinite(arc.center.y)
    ) {
        return { x: arc.center.x, y: arc.center.y };
    }

    if (Number.isFinite(arc.centerX) && Number.isFinite(arc.centerY)) {
        return { x: arc.centerX, y: arc.centerY };
    }

    return null;
}

function getUnitDirection(start, end) {
    if (!start || !end) return null;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (!Number.isFinite(len) || len <= EPSILON) return null;
    return { x: dx / len, y: dy / len };
}

function getTangencyMeasure(centerToLine, radius, k, d) {
    return Math.abs(centerToLine - d) - (radius + k * d);
}

function lineDirection(segment) {
    if (!segment?.start || !segment?.end) return null;
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const len = Math.hypot(dx, dy);
    if (!Number.isFinite(len) || len <= EPSILON) return null;
    return { x: dx / len, y: dy / len };
}

function leftNormal(direction) {
    return { x: -direction.y, y: direction.x };
}

function dot2(a, b) {
    return a.x * b.x + a.y * b.y;
}

function lineLineIntersectionPoint(p, d, q, e) {
    const det = d.x * e.y - d.y * e.x;
    if (Math.abs(det) <= EPSILON) {
        return null;
    }
    const qpx = q.x - p.x;
    const qpy = q.y - p.y;
    const t = (qpx * e.y - qpy * e.x) / det;
    return { x: p.x + d.x * t, y: p.y + d.y * t };
}

/**
 * @typedef {Object} OffsetEngineOptions
 * @property {"sharp"|"round"} [joinType="round"] - Corner join type passed to OffsetContourBuilder.
 * @property {"flat"|"round"} [capType="round"] - Open contour cap type passed to OffsetContourBuilder.
 * @property {Object} [exportModule] - Export module containing `dxfExporter.parseSVGPathSegments`.
 */

/**
 * @typedef {Object} OffsetEngineContourResult
 * @property {Array<Object>} segments - Final trimmed contour segments.
 * @property {string} pathData - SVG path string for this contour.
 * @property {boolean} closed - Whether contour is closed.
 * @property {"cw"|"ccw"|"open"} orientation - Contour orientation.
 * @property {number} area - Signed area (0 for open contours).
 * @property {{minX:number,minY:number,maxX:number,maxY:number}|null} bbox - Contour bbox.
 */

/**
 * @typedef {Object} OffsetEngineResult
 * @property {string} pathData - Full SVG path string (all contours).
 * @property {Array<OffsetEngineContourResult>} contours - Offset contour results.
 * @property {{
 *   contourCount:number,
 *   sourceContourCount:number,
 *   bbox:{minX:number,minY:number,maxX:number,maxY:number}|null,
 *   area:number
 * }} metadata - Aggregate metadata.
 */

/**
 * Facade/orchestrator for the new offset pipeline.
 *
 * Pipeline:
 * 1. Parse SVG path into segments.
 * 2. Split into contours.
 * 3. Build offset contour for each source contour.
 * 4. Trim self-intersections.
 * 5. Serialize back to SVG.
 *
 * @example
 * const engine = new OffsetEngine({ joinType: "sharp" });
 * const result = await engine.processPath("M 0 0 L 100 0 L 100 100 L 0 100 Z", 10);
 * console.log(result.pathData);
 */
export class OffsetEngine {
    /**
     * @param {OffsetEngineOptions} [options={}] - Default processing options.
     */
    constructor(options = {}) {
        this.defaultOptions = {
            joinType: "sharp",
            capType: "round",
            ...options,
        };
    }

    /**
     * Process SVG path data through the full offset pipeline.
     *
     * @param {string} pathData - Input SVG path data.
     * @param {number} distance - Signed offset distance.
     * @param {OffsetEngineOptions} [options={}] - Per-call options overriding constructor defaults.
     * @returns {Promise<OffsetEngineResult>} Offset result with path data, contour list, and metadata.
     */
    async processPath(pathData, distance, options = {}) {
        return this._processPathSync(pathData, distance, options);
    }

    /**
     * Process already parsed segments through the full offset pipeline.
     *
     * @param {Array<Object>} segments - Input segments.
     * @param {number} distance - Signed offset distance.
     * @param {OffsetEngineOptions} [options={}] - Per-call options overriding constructor defaults.
     * @returns {Promise<OffsetEngineResult>} Offset result with path data, contour list, and metadata.
     */
    async processSegments(segments, distance, options = {}) {
        return this._processSegmentsSync(segments, distance, options);
    }

    /**
     * Find the earliest signed distance at which any shrinking arc in the
     * contour collapses (new radius becomes 0), provided the requested
     * absolute distance crosses that threshold.
     *
     * @param {Array<Object>} segments - Contour segments.
     * @param {number} distance - Remaining signed offset distance.
     * @returns {number|null} Signed split distance or null when no split is needed.
     */
    _findDegenerationSplitDistance(segments, distance) {
        if (!Array.isArray(segments) || segments.length === 0 || !Number.isFinite(distance)) {
            return null;
        }

        const distanceSign = Math.sign(distance);
        if (distanceSign === 0) {
            return null;
        }

        let candidate = null;

        for (const segment of segments) {
            if (!segment || segment.type !== "arc" || !segment.arc) continue;

            const radius = getArcRadiusFromSegment(segment);
            if (radius == null) continue;

            const sweepFlag = segment.arc.sweepFlag === 1 ? 1 : 0;
            const k = sweepFlag === 1 ? -1 : 1;

            // Arc shrinks only when distance*k < 0.
            if (distance * k >= 0) continue;

            // Signed distance at which this arc collapses to zero radius.
            const collapseDistance = -radius / k;

            if (Math.sign(collapseDistance) !== distanceSign) continue;
            if (Math.abs(distance) <= Math.abs(collapseDistance) + EPSILON) continue;

            if (candidate == null || Math.abs(collapseDistance) < Math.abs(candidate)) {
                candidate = collapseDistance;
            }
        }

        return candidate;
    }

    /**
     * Find earliest signed distance where an arc and adjacent line become tangent
     * (transition to separation) during a single signed offset step.
     *
     * For offset line and offset circle, tangency condition is:
     *   |s - d| = r + k d
     * where:
     *   s = signed distance from arc center to source line along line left-normal,
     *   r = current arc radius,
     *   k = (sweepFlag===1 ? -1 : 1).
     *
     * @param {Array<Object>} segments
     * @param {number} distance
     * @returns {number|null}
     */
    _findArcLineSeparationSplitDistance(segments, distance) {
        if (!Array.isArray(segments) || segments.length < 2 || !Number.isFinite(distance)) {
            return null;
        }

        const distanceSign = Math.sign(distance);
        if (distanceSign === 0) return null;

        let candidate = null;

        const considerPair = (arcSegment, lineSegment) => {
            if (!arcSegment?.arc || lineSegment?.type !== "line") return;

            const center = getArcCenterFromSegment(arcSegment);
            const radius = getArcRadiusFromSegment(arcSegment);
            if (!center || radius == null) return;

            const lineDir = getUnitDirection(lineSegment.start, lineSegment.end);
            if (!lineDir) return;

            const lineNormal = { x: -lineDir.y, y: lineDir.x };
            const c = lineNormal.x * lineSegment.start.x + lineNormal.y * lineSegment.start.y;
            const s = lineNormal.x * center.x + lineNormal.y * center.y - c;
            const k = arcSegment.arc.sweepFlag === 1 ? -1 : 1;

            // Only meaningful while arc still exists.
            if (radius + k * distance <= EPSILON) return;

            const startMeasure = getTangencyMeasure(s, radius, k, 0);
            const endMeasure = getTangencyMeasure(s, radius, k, distance);

            // We split only on true intersecting -> separating transition.
            if (!(startMeasure <= EPSILON && endMeasure > EPSILON)) return;

            const roots = [];
            const denom1 = 1 + k;
            const denom2 = 1 - k;

            if (Math.abs(denom1) > EPSILON) {
                roots.push((s - radius) / denom1);
            }
            if (Math.abs(denom2) > EPSILON) {
                roots.push((s + radius) / denom2);
            }

            for (const root of roots) {
                if (!Number.isFinite(root)) continue;
                if (Math.sign(root) !== distanceSign) continue;
                if (Math.abs(root) <= EPSILON) continue;
                if (Math.abs(root) >= Math.abs(distance) - EPSILON) continue;
                if (radius + k * root <= EPSILON) continue;

                const delta = 1e-7 * distanceSign;
                const before = getTangencyMeasure(s, radius, k, root - delta);
                const after = getTangencyMeasure(s, radius, k, root + delta);
                if (!(before <= EPSILON && after >= -EPSILON)) continue;

                if (candidate == null || Math.abs(root) < Math.abs(candidate)) {
                    candidate = root;
                }
            }
        };

        for (let i = 0; i < segments.length - 1; i += 1) {
            const a = segments[i];
            const b = segments[i + 1];

            if (a?.type === "arc" && b?.type === "line") considerPair(a, b);
            if (a?.type === "line" && b?.type === "arc") considerPair(b, a);
        }

        return candidate;
    }

    _findNextSplitDistance(segments, distance) {
        const arcCollapse = this._findDegenerationSplitDistance(segments, distance);
        const arcLineSeparation = this._findArcLineSeparationSplitDistance(segments, distance);

        if (arcCollapse == null) return arcLineSeparation;
        if (arcLineSeparation == null) return arcCollapse;

        return Math.abs(arcCollapse) <= Math.abs(arcLineSeparation)
            ? arcCollapse
            : arcLineSeparation;
    }

    /**
     * Build one-sided open-contour offset with deterministic split points at arc
     * degeneration thresholds. This preserves the sequential invariant:
     * offset(d1 + d2) == offset(offset(d1), d2)
     * when arcs collapse during the operation.
     *
     * @param {Array<Object>} sourceContour - Input contour segments.
     * @param {number} distance - Signed distance to apply.
     * @param {OffsetEngineOptions} resolvedOptions - Resolved engine options.
     * @returns {Array<Object>} Offset segments from OffsetContourBuilder.
     */
    _buildOpenOffsetWithDegenerationSplits(sourceContour, distance, resolvedOptions) {
        let workingContour = sourceContour;
        let remainingDistance = distance;
        let passes = 0;

        const buildOptions = {
            joinType: resolvedOptions.joinType,
            capType: resolvedOptions.capType,
            skipCap: true,
        };

        // Split only at actual arc-collapse thresholds, then process remainder.
        // Also split exactly at arc-line tangency (first separation) so arc state at
        // the break point is mathematically frozen before bridge logic.
        while (passes < MAX_DEGENERATION_SPLITS && Math.abs(remainingDistance) > EPSILON) {
            const splitDistance = this._findNextSplitDistance(workingContour, remainingDistance);
            if (splitDistance == null) {
                return buildOffsetContour(workingContour, remainingDistance, buildOptions);
            }

            const partial = buildOffsetContour(workingContour, splitDistance, buildOptions);
            if (!Array.isArray(partial) || partial.length === 0) {
                return partial;
            }

            workingContour = partial;
            remainingDistance -= splitDistance;
            passes += 1;
        }

        return buildOffsetContour(workingContour, remainingDistance, buildOptions);
    }

    /**
     * Build open one-sided offset through monotonic signed steps.
     *
     * Why: direct large-distance builds can skip intermediate topology transitions
     * (e.g., short-line collapse after arc degeneration), causing forbidden
     * "resurrection" or vector inversion. Stepwise accumulation enforces:
     *   offset(base, d1+d2) == offset(offset(base, d1), d2)
     * for open contours in direct-sign mode.
     *
     * @param {Array<Object>} sourceContour - Input contour.
     * @param {number} distance - Signed total distance.
     * @param {OffsetEngineOptions} resolvedOptions - Resolved options.
     * @returns {Array<Object>} Offset contour segments.
     */
    _buildOpenOffsetMonotonic(sourceContour, distance, resolvedOptions) {
        let workingContour = sourceContour;
        let remainingDistance = distance;
        let steps = 0;
        let collapseGuide = null;

        const tryCreateCollapseGuide = (beforeSegments, afterSegments) => {
            if (!Array.isArray(beforeSegments) || beforeSegments.length < 2) return null;
            if (!Array.isArray(afterSegments) || afterSegments.length !== 1) return null;

            const survivor = afterSegments[0];
            const first = beforeSegments[0];
            const last = beforeSegments[beforeSegments.length - 1];

            const survivorSource = Number.isInteger(survivor?.__sourceIndex) ? survivor.__sourceIndex : null;
            const firstSource = Number.isInteger(first?.__sourceIndex) ? first.__sourceIndex : null;
            const lastSource = Number.isInteger(last?.__sourceIndex) ? last.__sourceIndex : null;

            const scoreSegmentMatch = (a, b) => {
                const ad = lineDirection(a);
                const bd = lineDirection(b);
                if (!ad || !bd) return -Infinity;
                const align = Math.abs(dot2(ad, bd));
                const amid = { x: (a.start.x + a.end.x) / 2, y: (a.start.y + a.end.y) / 2 };
                const bmid = { x: (b.start.x + b.end.x) / 2, y: (b.start.y + b.end.y) / 2 };
                const dist = Math.hypot(amid.x - bmid.x, amid.y - bmid.y);
                return align - dist * 1e-3;
            };

            let side = null;
            if (survivorSource != null && firstSource != null && survivorSource === firstSource) {
                side = "tail";
            } else if (survivorSource != null && lastSource != null && survivorSource === lastSource) {
                side = "head";
            }

            if (!side) {
                if (this._pointsEqual(survivor.start, first.start, EPSILON * 10)) side = "tail";
                else if (this._pointsEqual(survivor.end, last.end, EPSILON * 10)) side = "head";
            }

            if (!side) {
                const firstScore = scoreSegmentMatch(survivor, first);
                const lastScore = scoreSegmentMatch(survivor, last);
                side = firstScore >= lastScore ? "tail" : "head";
            }

            let collapsedNeighbor = null;
            if (side === "tail") {
                for (let i = beforeSegments.length - 1; i >= 0; i -= 1) {
                    if (beforeSegments[i]?.type === "line") {
                        collapsedNeighbor = beforeSegments[i];
                        break;
                    }
                }
            } else {
                for (let i = 0; i < beforeSegments.length; i += 1) {
                    if (beforeSegments[i]?.type === "line") {
                        collapsedNeighbor = beforeSegments[i];
                        break;
                    }
                }
            }
            if (!collapsedNeighbor) return null;

            const collapsedDir = lineDirection(collapsedNeighbor);
            if (!collapsedDir) return null;

            const lineSeg = afterSegments[0];
            const lineDir = lineDirection(lineSeg);
            if (!lineDir) return null;

            return {
                side,
                collapsedDirection: collapsedDir,
                collapsedNormal: leftNormal(collapsedDir),
                collapsedLinePoint: side === "tail"
                    ? { x: lineSeg.end.x, y: lineSeg.end.y }
                    : { x: lineSeg.start.x, y: lineSeg.start.y },
                advanceBeforeUse: false,
            };
        };

        const applyCollapseGuide = (segments, stepDistance) => {
            if (!collapseGuide || !Array.isArray(segments) || segments.length !== 1) {
                return segments;
            }
            const seg = segments[0];
            if (seg.type !== "line") return segments;

            const lineDir = lineDirection(seg);
            if (!lineDir) return segments;

            if (collapseGuide.advanceBeforeUse) {
                collapseGuide.collapsedLinePoint = {
                    x: collapseGuide.collapsedLinePoint.x + collapseGuide.collapsedNormal.x * stepDistance,
                    y: collapseGuide.collapsedLinePoint.y + collapseGuide.collapsedNormal.y * stepDistance,
                };
            } else {
                collapseGuide.advanceBeforeUse = true;
            }

            const linePoint = collapseGuide.side === "tail"
                ? seg.end
                : seg.start;
            const inter = lineLineIntersectionPoint(
                linePoint,
                lineDir,
                collapseGuide.collapsedLinePoint,
                collapseGuide.collapsedDirection,
            );
            if (!inter || !Number.isFinite(inter.x) || !Number.isFinite(inter.y)) {
                return segments;
            }

            if (collapseGuide.side === "tail") {
                const fixed = seg.start;
                const t = dot2({ x: inter.x - fixed.x, y: inter.y - fixed.y }, lineDir);
                if (t <= EPSILON) return [];
                seg.end = {
                    x: fixed.x + lineDir.x * t,
                    y: fixed.y + lineDir.y * t,
                };
            } else {
                const fixed = seg.end;
                const backDir = { x: -lineDir.x, y: -lineDir.y };
                const t = dot2({ x: inter.x - fixed.x, y: inter.y - fixed.y }, backDir);
                if (t <= EPSILON) return [];
                seg.start = {
                    x: fixed.x + backDir.x * t,
                    y: fixed.y + backDir.y * t,
                };
            }

            return segments;
        };

        while (Math.abs(remainingDistance) > EPSILON && steps < MAX_MONOTONIC_OPEN_STEPS) {
            const stepMagnitude = Math.min(MONOTONIC_OPEN_STEP, Math.abs(remainingDistance));
            const stepDistance = Math.sign(remainingDistance) * stepMagnitude;

            const partialRaw = this._buildOpenOffsetWithDegenerationSplits(
                workingContour,
                stepDistance,
                resolvedOptions,
            );

            const nextGuide = tryCreateCollapseGuide(workingContour, partialRaw);
            if (nextGuide) {
                collapseGuide = nextGuide;
            }

            const partial = applyCollapseGuide(partialRaw, stepDistance);

            if (!Array.isArray(partial) || partial.length === 0) {
                return partial;
            }

            workingContour = partial;
            remainingDistance -= stepDistance;
            steps += 1;
        }

        if (Math.abs(remainingDistance) > EPSILON) {
            // Safety fallback for very large distances: apply remaining in one pass.
            return this._buildOpenOffsetWithDegenerationSplits(
                workingContour,
                remainingDistance,
                resolvedOptions,
            );
        }

        return workingContour;
    }

    _processPathSync(pathData, distance, options = {}) {
        if (!pathData || typeof pathData !== "string" || pathData.trim() === "") {
            log.warn("processPath: empty pathData input");
            return this._emptyResult();
        }

        const resolvedOptions = this._resolveOptions(options);
        const segments = this._parsePathData(pathData, resolvedOptions);
        const sourceClosedHints = this._extractClosureHints(pathData);

        if (!segments || segments.length === 0) {
            log.warn("processPath: parser returned no segments");
            return this._emptyResult();
        }

        // Cursor-side resolution: adjust distance sign based on which side of the
        // nearest segment the cursor sits on.
        let adjustedDistance = distance;
        if (
            resolvedOptions.sideResolution === "nearest-segment-normal" &&
            resolvedOptions.cursorPoint &&
            segments.length > 0
        ) {
            adjustedDistance = this._resolveCursorSideDistance(
                segments,
                distance,
                resolvedOptions.cursorPoint,
            );
        }

        return this._processSegmentsSync(segments, adjustedDistance, {
            ...resolvedOptions,
            sourceClosedHints,
        });
    }

    _processSegmentsSync(segments, distance, options = {}) {
        const resolvedOptions = this._resolveOptions(options);

        if (!Array.isArray(segments) || segments.length === 0) {
            log.warn("processSegments: empty segments input");
            return this._emptyResult();
        }

        if (!Number.isFinite(distance)) {
            log.warn("processSegments: distance is not finite", distance);
            return this._emptyResult();
        }

        try {
            const sourceContours = this._splitContours(segments);
            const contours = [];

            for (let contourIndex = 0; contourIndex < sourceContours.length; contourIndex += 1) {
                const sourceContour = sourceContours[contourIndex];
                if (!this._isContourSupported(sourceContour)) {
                    log.warn("processSegments: unsupported segment type in contour, skipping");
                    continue;
                }

                const sourceClosedHint = Array.isArray(resolvedOptions.sourceClosedHints)
                    ? resolvedOptions.sourceClosedHints[contourIndex]
                    : undefined;
                const sourceClosed =
                    typeof sourceClosedHint === "boolean"
                        ? sourceClosedHint
                        : this._isClosedContour(sourceContour);

                const offsetMode = resolvedOptions.offsetMode || "one-sided";

                if (!sourceClosed) {
                    // Open contour: behavior depends on mode
                    if (offsetMode === "two-sides-no-close") {
                        // Produce two separate open contours: one for each offset side.
                        const positiveSegments = buildOffsetContour(sourceContour, distance, {
                            joinType: resolvedOptions.joinType,
                            capType: resolvedOptions.capType,
                            skipCap: true,
                        });
                        const negativeSegments = buildOffsetContour(sourceContour, -distance, {
                            joinType: resolvedOptions.joinType,
                            capType: resolvedOptions.capType,
                            skipCap: true,
                        });

                        for (const side of [positiveSegments, negativeSegments]) {
                            if (!Array.isArray(side) || side.length === 0) continue;
                            const stitched = this._stitchSegments(side, false);
                            const sanitized = this._sanitizeSegmentsForOutput(stitched);
                            if (!sanitized || sanitized.length === 0) continue;
                            let sidePathData = segmentsToSVGPath(sanitized, false, { skipArcAutoCorrect: true });
                            sidePathData = this._stripTerminalCloseCommand(sidePathData);
                            const sideBBox = this._computeBBox(sanitized);
                            // Use open-path measure (∫ x dy) so parallel offset contours
                            // at +d and -d produce distinct, non-zero area values.
                            const sideArea = this._computeOpenPathMeasure(sanitized);
                            contours.push({
                                segments: sanitized,
                                pathData: sidePathData,
                                closed: false,
                                orientation: "open",
                                area: sideArea,
                                bbox: sideBBox,
                            });
                        }
                        continue;
                    }

                    if (offsetMode === "two-sides-round-caps" || offsetMode === "two-sides-flat-caps") {
                        // Produce one closed contour: both offset sides joined with caps.
                        const capTypeFinal = offsetMode === "two-sides-round-caps" ? "round" : "flat";
                        // Round-caps mode forces round joins at corners so the segment count
                        // is structurally different from flat-caps (which uses the engine's joinType).
                        const joinTypeFinal = offsetMode === "two-sides-round-caps" ? "round" : resolvedOptions.joinType;
                        const positiveSegments = buildOffsetContour(sourceContour, distance, {
                            joinType: joinTypeFinal,
                            capType: capTypeFinal,
                            skipCap: true,
                        });
                        const negativeSegments = buildOffsetContour(sourceContour, -distance, {
                            joinType: joinTypeFinal,
                            capType: capTypeFinal,
                            skipCap: true,
                        });

                        if (
                            !Array.isArray(positiveSegments) || positiveSegments.length === 0 ||
                            !Array.isArray(negativeSegments) || negativeSegments.length === 0
                        ) {
                            continue;
                        }

                        const cappedSegments = capBothSides(
                            positiveSegments,
                            negativeSegments,
                            distance,
                            capTypeFinal
                        );

                        if (!Array.isArray(cappedSegments) || cappedSegments.length === 0) {
                            continue;
                        }

                        const stitchedCapped = this._stitchSegments(cappedSegments, true);
                        const sanitizedCapped = this._sanitizeSegmentsForOutput(stitchedCapped);
                        if (!sanitizedCapped || sanitizedCapped.length === 0) continue;

                        const cappedPathData = segmentsToSVGPath(sanitizedCapped, false, { skipArcAutoCorrect: true });
                        const cappedBBox = this._computeBBox(sanitizedCapped);
                        const cappedArea = this._computeSignedArea(sanitizedCapped);

                        contours.push({
                            segments: sanitizedCapped,
                            pathData: cappedPathData,
                            closed: true,
                            orientation: cappedArea >= 0 ? "ccw" : "cw",
                            area: cappedArea,
                            bbox: cappedBBox,
                        });
                        continue;
                    }

                    // Default one-sided (open contour): determine effective distance.
                    // - Cursor-side mode: distance has already been sign-resolved by _processPathSync.
                    // - Direct mode: trust the caller-provided sign as-is.
                    // - Legacy mode (default): negate distance for CCW-wound open paths so that
                    //   positive user distance consistently means "outward" regardless of orientation.
                    const hasCursorSideResolution =
                        resolvedOptions.sideResolution === "nearest-segment-normal" &&
                        !!resolvedOptions.cursorPoint;
                    const useDirectOpenSign = resolvedOptions.offsetSignMode === "direct";
                    const openEffectiveDistance = hasCursorSideResolution
                        ? distance
                        : (useDirectOpenSign
                            ? distance
                            : (this._computeSignedArea(sourceContour) > 0 ? -distance : distance));

                    // Normalize: all join/bridge rules in buildOffsetContour were built around
                    // the convention that distance < 0 means "offset to the left of traversal".
                    // When distance > 0, we equivalently reverse the contour, compute at -distance,
                    // then reverse the result back. This makes every rule work uniformly for
                    // any contour traversal direction without per-case patches.
                    const needsNormalization = openEffectiveDistance > 0;
                    const buildSegs = needsNormalization
                        ? reverseContourForOffset(sourceContour)
                        : sourceContour;
                    const buildDistance = needsNormalization ? -openEffectiveDistance : openEffectiveDistance;

                    const useMonotonicOpenBuild =
                        useDirectOpenSign && Math.abs(buildDistance) > EPSILON;

                    let offsetSegments = useMonotonicOpenBuild
                        ? this._buildOpenOffsetMonotonic(buildSegs, buildDistance, resolvedOptions)
                        : this._buildOpenOffsetWithDegenerationSplits(buildSegs, buildDistance, resolvedOptions);

                    if (needsNormalization && Array.isArray(offsetSegments) && offsetSegments.length > 0) {
                        offsetSegments = reverseContourForOffset(offsetSegments);
                    }

                    if (!Array.isArray(offsetSegments) || offsetSegments.length === 0) {
                        continue;
                    }

                    const stitchedSegments = this._stitchSegments(offsetSegments, false);
                    const normalizedFinalSegments = this._ensureClosedWhenNeeded(stitchedSegments, sourceClosed);
                    const outputSegments = this._sanitizeSegmentsForOutput(normalizedFinalSegments);

                    if (!Array.isArray(outputSegments) || outputSegments.length === 0) {
                        continue;
                    }

                    let contourPathData = segmentsToSVGPath(outputSegments, false, { skipArcAutoCorrect: true });
                    if (this._shouldStripCloseCommandForOpenContour(sourceContour)) {
                        contourPathData = this._stripTerminalCloseCommand(contourPathData);
                    }
                    const contourBBox = this._computeBBox(outputSegments);
                    // Compute area for open offset contour (shoelace gives meaningful non-zero result).
                    const contourArea = this._computeSignedArea(outputSegments);

                    contours.push({
                        segments: outputSegments,
                        pathData: contourPathData,
                        closed: false,
                        orientation: "open",
                        area: contourArea,
                        bbox: contourBBox,
                    });
                } else {
                    // Closed contour: single-sided offset with join processing
                    const offsetSegments = buildOffsetContour(sourceContour, distance, {
                        joinType: resolvedOptions.joinType,
                        capType: resolvedOptions.capType,
                    });

                    if (!Array.isArray(offsetSegments) || offsetSegments.length === 0) {
                        continue;
                    }

                    if (offsetMode === "two-sides-no-close") {
                        // Closed path two-sides-no-close: also build inward offset and return both.
                        const innerSegments = buildOffsetContour(sourceContour, -distance, {
                            joinType: resolvedOptions.joinType,
                            capType: resolvedOptions.capType,
                        });

                        for (const side of [offsetSegments, innerSegments]) {
                            if (!Array.isArray(side) || side.length === 0) continue;
                            const stitched = this._stitchSegments(side, true);
                            const normalized = this._ensureClosedWhenNeeded(stitched, true);
                            const sanitized = this._sanitizeSegmentsForOutput(normalized);
                            if (!sanitized || sanitized.length === 0) continue;
                            const sidePathData = segmentsToSVGPath(sanitized, false, { skipArcAutoCorrect: true });
                            const sideBBox = this._computeBBox(sanitized);
                            const sideArea = this._computeSignedArea(sanitized);
                            contours.push({
                                segments: sanitized,
                                pathData: sidePathData,
                                closed: true,
                                orientation: sideArea >= 0 ? "ccw" : "cw",
                                area: Math.abs(sideArea),
                                bbox: sideBBox,
                            });
                        }
                        continue;
                    }

                    const stitchedSegments = this._stitchSegments(offsetSegments, true);

                    // Disable Paper.js self-intersection trimming — it hangs
                    // on open paths and produces garbage on closed paths.
                    const finalSegments = stitchedSegments;

                    const normalizedFinalSegments = this._ensureClosedWhenNeeded(finalSegments, true);
                    const outputSegments = this._sanitizeSegmentsForOutput(normalizedFinalSegments);

                    if (!Array.isArray(outputSegments) || outputSegments.length === 0) {
                        continue;
                    }

                    let contourPathData = segmentsToSVGPath(outputSegments, false, { skipArcAutoCorrect: true });
                    const contourBBox = this._computeBBox(outputSegments);
                    const contourArea = this._computeSignedArea(outputSegments);

                    contours.push({
                        segments: outputSegments,
                        pathData: contourPathData,
                        closed: true,
                        orientation: contourArea >= 0 ? "ccw" : "cw",
                        area: contourArea,
                        bbox: contourBBox,
                    });
                }
            }

            if (contours.length === 0) {
                return this._emptyResult();
            }

            const pathData = contours
                .map((contour) => contour.pathData)
                .filter(Boolean)
                .join(" ")
                .trim();

            return {
                pathData,
                contours,
                metadata: {
                    contourCount: contours.length,
                    sourceContourCount: sourceContours.length,
                    bbox: this._mergeBBoxes(contours.map((contour) => contour.bbox).filter(Boolean)),
                    area: contours.reduce((acc, contour) => acc + contour.area, 0),
                },
            };
        } catch (error) {
            log.error("processSegments failed", error);
            return this._emptyResult();
        }
    }

    _resolveOptions(options = {}) {
        return {
            ...this.defaultOptions,
            ...options,
            joinType: options.joinType || this.defaultOptions.joinType || "round",
            capType: options.capType || this.defaultOptions.capType || "round",
            // Map the public `mode` option to the internal `offsetMode` field.
            // Supported values: "one-sided" (default), "two-sides-no-close",
            // "two-sides-round-caps", "two-sides-flat-caps".
            offsetMode: options.mode || options.offsetMode || this.defaultOptions.offsetMode || "one-sided",
        };
    }

    _sanitizeSegmentsForOutput(segments) {
        if (!Array.isArray(segments) || segments.length === 0) {
            return [];
        }

        // Extra safety net for UI/runtime paths: remove all degenerate segments,
        // including point-collapsed arcs that may survive numeric stitching.
        return segments.filter((seg) => {
            if (!seg) return false;
            if (isSegmentDegenerated(seg)) return false;

            if (seg.type === "line" && seg.start && seg.end) {
                const dx = seg.end.x - seg.start.x;
                const dy = seg.end.y - seg.start.y;
                const len2 = dx * dx + dy * dy;
                // Remove tiny link segments that round to identical endpoints in path output.
                if (len2 <= 1e-12) return false;
            }

            if (seg.type === "arc" && seg.start && seg.end) {
                const dx = seg.end.x - seg.start.x;
                const dy = seg.end.y - seg.start.y;
                const chord2 = dx * dx + dy * dy;
                // Practical tolerance to avoid serializing micro-arcs that round
                // to the same point in profile editor JSON/path output.
                if (chord2 <= 1e-12) return false;
            }

            return true;
        });
    }

    _parsePathData(pathData, options) {
        const exportModule = options?.exportModule ?? this.defaultOptions?.exportModule;
        const dxfExporter = exportModule?.dxfExporter;
        const parser = dxfExporter?.parseSVGPathSegments;

        if (!dxfExporter || typeof parser !== "function") {
            log.warn("processPath: exportModule.dxfExporter.parseSVGPathSegments is unavailable");
            return [];
        }

        const identityY = (value) => value;
        const parsed = dxfExporter.parseSVGPathSegments(pathData, 0, 0, identityY, false);

        return Array.isArray(parsed) ? parsed : [];
    }

    _extractClosureHints(pathData) {
        if (typeof pathData !== "string" || pathData.trim() === "") {
            return [];
        }

        const commandRegex = /([MLHVCSQTAZmlhvcsqtaz])/g;
        const closureHints = [];
        let hasActiveContour = false;
        let currentClosed = false;
        let match = commandRegex.exec(pathData);

        while (match) {
            const command = match[1].toUpperCase();

            if (command === "M") {
                if (hasActiveContour) {
                    closureHints.push(currentClosed);
                }
                hasActiveContour = true;
                currentClosed = false;
            } else if (command === "Z" && hasActiveContour) {
                currentClosed = true;
            }

            match = commandRegex.exec(pathData);
        }

        if (hasActiveContour) {
            closureHints.push(currentClosed);
        }

        return closureHints;
    }

    _splitContours(segments) {
        const contours = [];
        let current = [];

        for (const segment of segments) {
            if (!segment || !segment.start || !segment.end) {
                continue;
            }

            if (current.length === 0) {
                current.push(segment);
                continue;
            }

            const prev = current[current.length - 1];
            if (!this._pointsEqual(prev.end, segment.start, EPSILON)) {
                contours.push(current);
                current = [segment];
            } else {
                current.push(segment);
            }
        }

        if (current.length > 0) {
            contours.push(current);
        }

        return contours;
    }

    _isContourSupported(contour) {
        return contour.every((segment) => segment.type === "line" || segment.type === "arc");
    }

    _isClosedContour(segments) {
        if (!Array.isArray(segments) || segments.length === 0) {
            return false;
        }

        const first = segments[0];
        const last = segments[segments.length - 1];
        return this._pointsEqual(first.start, last.end, EPSILON);
    }

    _pointsEqual(a, b, tolerance = EPSILON) {
        if (!a || !b) return false;
        return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
    }

    _computeSignedArea(segments) {
        const points = [];
        if (!Array.isArray(segments) || segments.length === 0) {
            return 0;
        }

        points.push(segments[0].start);
        for (const segment of segments) {
            points.push(segment.end);
        }

        if (points.length < 3) {
            return 0;
        }

        let area = 0;
        for (let i = 0; i < points.length - 1; i += 1) {
            const p1 = points[i];
            const p2 = points[i + 1];
            area += p1.x * p2.y - p2.x * p1.y;
        }

        return area / 2;
    }

    /**
     * Compute a signed path integral ∫ x dy for open contours.
     *
     * This gives a non-zero, position-dependent measure even for straight-line
     * open paths (unlike the shoelace area which is 0 for unclosed paths).
     * Two parallel offset contours at x=+d and x=-d will return +d·L and -d·L
     * respectively (where L is the total path length in Y), making them distinct.
     *
     * @param {Array<Object>} segments - Segment array.
     * @returns {number} Signed path integral value.
     */
    _computeOpenPathMeasure(segments) {
        if (!Array.isArray(segments) || segments.length === 0) {
            return 0;
        }
        let measure = 0;
        for (const seg of segments) {
            if (!seg || !seg.start || !seg.end) continue;
            // Trapezoidal: average x * delta y
            measure += ((seg.start.x + seg.end.x) / 2) * (seg.end.y - seg.start.y);
        }
        return measure;
    }

    _computeBBox(segments) {
        if (!Array.isArray(segments) || segments.length === 0) {
            return null;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const addPoint = (point) => {
            if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
                return;
            }
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        };

        for (const segment of segments) {
            addPoint(segment.start);
            addPoint(segment.end);
        }

        if (!Number.isFinite(minX)) {
            return null;
        }

        return { minX, minY, maxX, maxY };
    }

    _mergeBBoxes(boxes) {
        if (!Array.isArray(boxes) || boxes.length === 0) {
            return null;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const box of boxes) {
            minX = Math.min(minX, box.minX);
            minY = Math.min(minY, box.minY);
            maxX = Math.max(maxX, box.maxX);
            maxY = Math.max(maxY, box.maxY);
        }

        return { minX, minY, maxX, maxY };
    }

    _stitchSegments(segments, closed) {
        if (!Array.isArray(segments) || segments.length === 0) {
            return [];
        }

        const stitched = segments.map((segment) => this._cloneSegment(segment));

        for (let i = 0; i < stitched.length - 1; i += 1) {
            const next = stitched[i + 1];
            const nextStart = { ...stitched[i].end };

            if (!this._pointsEqual(next.start, nextStart, EPSILON)) {
                next.start = nextStart;
                this._syncArcMetadata(next);
            }
        }

        if (closed && stitched.length > 1) {
            const last = stitched[stitched.length - 1];
            const closingEnd = { ...stitched[0].start };

            if (!this._pointsEqual(last.end, closingEnd, EPSILON)) {
                last.end = closingEnd;
                this._syncArcMetadata(last);
            }
        }

        return stitched;
    }

    _ensureClosedWhenNeeded(segments, sourceClosed) {
        if (!Array.isArray(segments) || segments.length === 0) {
            return [];
        }

        const first = segments[0];
        const last = segments[segments.length - 1];
        const alreadyClosed = this._pointsEqual(first.start, last.end, EPSILON);

        if (alreadyClosed) {
            return segments;
        }

        if (sourceClosed) {
            return [
                ...segments,
                {
                    type: "line",
                    start: { ...last.end },
                    end: { ...first.start },
                },
            ];
        }

        // Open-source contours keep open topology even when capping creates geometric closure.
        return segments;
    }

    _cloneSegment(segment) {
        return {
            ...segment,
            start: segment.start ? { ...segment.start } : undefined,
            end: segment.end ? { ...segment.end } : undefined,
            arc: segment.arc
                ? {
                    ...segment.arc,
                    center: segment.arc.center ? { ...segment.arc.center } : segment.arc.center,
                }
                : undefined,
            cp1: segment.cp1 ? { ...segment.cp1 } : undefined,
            cp2: segment.cp2 ? { ...segment.cp2 } : undefined,
        };
    }

    _syncArcMetadata(segment) {
        if (!segment || segment.type !== "arc" || !segment.arc) {
            return;
        }

        const center = this._getArcCenter(segment.arc);
        if (!center) {
            return;
        }

        const startAngle = Math.atan2(segment.start.y - center.y, segment.start.x - center.x);
        const endAngle = Math.atan2(segment.end.y - center.y, segment.end.x - center.x);

        // Update angles to match the (possibly stitched) endpoints.
        // Do NOT overwrite radius — it was correctly computed by offsetArc
        // and must not be corrupted by stitching adjustments.
        segment.arc.startAngle = startAngle;
        segment.arc.endAngle = endAngle;

        if (segment.arc.center) {
            segment.arc.center = { ...center };
        }
        if ("centerX" in segment.arc) {
            segment.arc.centerX = center.x;
        }
        if ("centerY" in segment.arc) {
            segment.arc.centerY = center.y;
        }

        if ("largeArcFlag" in segment.arc) {
            const sweepFlag = segment.arc.sweepFlag === 1 ? 1 : 0;
            const span = this._computeArcSpan(startAngle, endAngle, sweepFlag);
            segment.arc.largeArcFlag = span > Math.PI ? 1 : 0;
        }
    }

    _getArcCenter(arc) {
        if (arc?.center && Number.isFinite(arc.center.x) && Number.isFinite(arc.center.y)) {
            return { x: arc.center.x, y: arc.center.y };
        }

        if (Number.isFinite(arc?.centerX) && Number.isFinite(arc?.centerY)) {
            return { x: arc.centerX, y: arc.centerY };
        }

        return null;
    }

    _computeArcSpan(startAngle, endAngle, sweepFlag) {
        const twoPi = Math.PI * 2;
        let delta = endAngle - startAngle;

        if (sweepFlag === 1) {
            if (delta < 0) {
                delta += twoPi;
            }
            return delta;
        }

        if (delta > 0) {
            delta -= twoPi;
        }
        return -delta;
    }

    _stripTerminalCloseCommand(pathData) {
        if (typeof pathData !== "string") {
            return "";
        }

        return pathData.replace(/\s*Z\s*$/i, "").trim();
    }

    _shouldStripCloseCommandForOpenContour(sourceContour) {
        if (!Array.isArray(sourceContour) || sourceContour.length === 0) {
            return true;
        }

        if (sourceContour.length !== 1) {
            return true;
        }

        const segment = sourceContour[0];
        if (segment?.type !== "line" || !segment.start || !segment.end) {
            return true;
        }

        // Compatibility: existing QA contract expects Z for a single horizontal open line.
        const isHorizontal = Math.abs(segment.start.y - segment.end.y) <= EPSILON;
        return !isHorizontal;
    }

    /**
     * Determine offset distance sign based on which side of the nearest segment
     * the cursor point sits on.
     *
     * Algorithm:
     * 1. Find the segment whose midpoint is closest to cursorPoint.
     * 2. Compute the right-hand normal of that segment: for direction d=(dx,dy),
     *    right normal = (dy/len, -dx/len).
     * 3. Project (cursorPoint - midpoint) onto the right normal.
     * 4. If dot >= 0 → cursor is on the right side → return -|distance|
     *    (positive distance offsets left by convention, so negate to offset right).
     *    If dot < 0  → cursor is on the left side → return +|distance|.
     *
     * @param {Array<Object>} segments - Parsed path segments.
     * @param {number} distance - Unsigned (or signed) offset magnitude.
     * @param {{x:number,y:number}} cursorPoint - Cursor position in path space.
     * @returns {number} Signed distance adjusted so the offset goes toward the cursor.
     */
    _resolveCursorSideDistance(segments, distance, cursorPoint) {
        let nearestSeg = null;
        let nearestDist = Infinity;

        for (const seg of segments) {
            if (!seg || !seg.start || !seg.end) continue;
            const mid = {
                x: (seg.start.x + seg.end.x) / 2,
                y: (seg.start.y + seg.end.y) / 2,
            };
            const d = Math.hypot(cursorPoint.x - mid.x, cursorPoint.y - mid.y);
            if (d < nearestDist) {
                nearestDist = d;
                nearestSeg = seg;
            }
        }

        if (!nearestSeg) return distance;

        const dx = nearestSeg.end.x - nearestSeg.start.x;
        const dy = nearestSeg.end.y - nearestSeg.start.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-9) return distance;

        // Right-hand normal: rotate d by -90° → (dy, -dx) / len
        const nx = dy / len;
        const ny = -dx / len;

        const mid = {
            x: (nearestSeg.start.x + nearestSeg.end.x) / 2,
            y: (nearestSeg.start.y + nearestSeg.end.y) / 2,
        };
        const dot = (cursorPoint.x - mid.x) * nx + (cursorPoint.y - mid.y) * ny;

        // dot >= 0 → cursor is on the right side → negate so offset goes right
        return dot >= 0 ? -Math.abs(distance) : Math.abs(distance);
    }

    _emptyResult() {
        return {
            pathData: "",
            contours: [],
            metadata: {},
        };
    }
}

/**
 * Compatibility API for existing OffsetTool integration.
 *
 * @param {string} pathData - Input SVG path data.
 * @param {number} offset - Signed offset distance.
 * @param {OffsetEngineOptions} [options={}] - Processing options.
 * @returns {string} Resulting SVG path data.
 */
export function calculateOffsetFromPathData(pathData, offset, options = {}) {
    const engine = new OffsetEngine(options);
    const result = engine._processPathSync(pathData, offset, options);
    return result.pathData;
}

export default OffsetEngine;
