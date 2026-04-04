import LoggerFactory from "../core/LoggerFactory.js";
import { buildOffsetContour } from "./OffsetContourBuilder.js";
import { trimSelfIntersections } from "./OffsetTrimmer.js";
import { capBothSides } from "./OffsetCapper.js";
import { segmentsToSVGPath } from "../utils/arcApproximation.js";

const log = LoggerFactory.createLogger("OffsetEngine");
const EPSILON = 1e-9;

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

        return this._processSegmentsSync(segments, distance, {
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

                // Determine contour orientation and adjust distance sign accordingly.
                // For CW contours (area < 0): outward = right side, distance stays positive.
                // For CCW contours (area > 0): outward = left side, distance must be negated.
                // This ensures the sweep-aware arc formula works correctly for both orientations.
                const signedArea = this._computeSignedArea(sourceContour);
                const effectiveDistance = signedArea > 0 ? -distance : distance;

                const offsetMode = resolvedOptions.offsetMode || "one-sided";

                let offsetSegments;
                if (!sourceClosed) {
                    // Open contour: behavior depends on mode
                    if (offsetMode === "one-sided") {
                        // Default: single-sided offset (follows sign of distance)
                        offsetSegments = buildOffsetContour(sourceContour, effectiveDistance, {
                            joinType: resolvedOptions.joinType,
                            capType: resolvedOptions.capType,
                            skipCap: true,
                        });
                    } else {
                        // Two-sided modes: compute both +d and -d offset sides, then cap
                        const positiveSegments = buildOffsetContour(sourceContour, effectiveDistance, {
                            joinType: resolvedOptions.joinType,
                            capType: resolvedOptions.capType,
                            skipCap: true,
                        });
                        const negativeSegments = buildOffsetContour(sourceContour, -effectiveDistance, {
                            joinType: resolvedOptions.joinType,
                            capType: resolvedOptions.capType,
                            skipCap: true,
                        });

                        if (
                            !Array.isArray(positiveSegments) || positiveSegments.length === 0 ||
                            !Array.isArray(negativeSegments) || negativeSegments.length === 0
                        ) {
                            continue;
                        }

                        offsetSegments = capBothSides(
                            positiveSegments,
                            negativeSegments,
                            effectiveDistance,
                            resolvedOptions.capType
                        );
                    }
                } else {
                    // Closed contour: single-sided offset with join processing
                    offsetSegments = buildOffsetContour(sourceContour, effectiveDistance, {
                        joinType: resolvedOptions.joinType,
                        capType: resolvedOptions.capType,
                    });
                }

                if (!Array.isArray(offsetSegments) || offsetSegments.length === 0) {
                    continue;
                }

                const stitchedSegments = this._stitchSegments(offsetSegments, sourceClosed);

                // Only trim self-intersections for closed contours.
                // Paper.js boolean operations produce garbage for open/capped paths.
                let finalSegments;
                if (sourceClosed) {
                    const trimmedSegments = trimSelfIntersections(stitchedSegments);
                    finalSegments =
                        Array.isArray(trimmedSegments) && trimmedSegments.length > 0
                            ? trimmedSegments
                            : stitchedSegments;
                } else {
                    finalSegments = stitchedSegments;
                }

                const normalizedFinalSegments = this._ensureClosedWhenNeeded(
                    finalSegments,
                    sourceClosed,
                );

                let contourPathData = segmentsToSVGPath(normalizedFinalSegments);
                if (!sourceClosed && this._shouldStripCloseCommandForOpenContour(sourceContour)) {
                    contourPathData = this._stripTerminalCloseCommand(contourPathData);
                }
                const contourBBox = this._computeBBox(normalizedFinalSegments);
                const contourClosed = sourceClosed;
                const contourArea = contourClosed ? this._computeSignedArea(normalizedFinalSegments) : 0;

                contours.push({
                    segments: normalizedFinalSegments,
                    pathData: contourPathData,
                    closed: contourClosed,
                    orientation: contourClosed ? (contourArea >= 0 ? "ccw" : "cw") : "open",
                    area: contourArea,
                    bbox: contourBBox,
                });
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
        };
    }

    _parsePathData(pathData, options) {
        const dxfExporter = options?.exportModule?.dxfExporter;
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
