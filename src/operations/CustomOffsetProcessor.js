/**
 * CustomOffsetProcessor - delegates to OffsetEngine for SVG offset operations.
 * Provides a compatible API with the old PaperOffsetProcessor.
 */

import LoggerFactory from "../core/LoggerFactory.js";
import { ARC_APPROX_TOLERANCE } from "../config/constants.js";
import { approximatePath, segmentsToSVGPath } from "../utils/arcApproximation.js";
import { OffsetEngine, calculateOffsetFromPathData as engineCalculateOffset } from "./OffsetEngine.js";

const log = LoggerFactory.createLogger("CustomOffsetProcessor");

/**
 * Calculate offset for SVG path data using OffsetEngine.
 * @param {string} pathData - SVG path data
 * @param {number} offset - Offset distance
 * @param {Object} options - Offset options
 * @returns {string} SVG path data
 */
export function calculateOffsetFromPathData(pathData, offset, options = {}) {
    if (!pathData) return "";

    if (Math.abs(offset) < 1e-9 && !options.forceReverseOutput) {
        return pathData;
    }

    try {
        // Legacy convention: positive offset = inward, negative = outward.
        // OffsetEngine uses "direct" mode where positive = outward.
        // So we negate: effectiveOffset = -offset makes positive→inward.
        let effectiveOffset = -offset;

        return engineCalculateOffset(pathData, effectiveOffset, {
            joinType: options.join || "sharp",
            capType: options.cap || "flat",
            exportModule: options.exportModule,
            trimSelfIntersections: options.trimSelfIntersections || false,
            offsetSignMode: "direct",
            useArcApproximation: options.useArcApproximation || false,
            arcTolerance: options.arcTolerance || ARC_APPROX_TOLERANCE,
        });
    } catch (err) {
        log.error("calculateOffsetFromPathData failed:", err);
        return "";
    }
}

/**
 * Calculate offset for SVG element.
 * @param {SVGElement} svgElement - SVG rect or path element
 * @param {number} offset - Offset distance
 * @param {Object} options - Offset options
 * @returns {string} SVG path data
 */
export function calculateOffsetFromSVG(svgElement, offset, options = {}) {
    if (!svgElement) {
        log.warn("calculateOffsetFromSVG: no SVG element provided");
        return "";
    }

    let pathData = "";
    const tag = svgElement.tagName.toLowerCase();

    if (tag === "path") {
        pathData = svgElement.getAttribute("d") || "";
    } else if (tag === "rect") {
        const x = parseFloat(svgElement.getAttribute("x")) || 0;
        const y = parseFloat(svgElement.getAttribute("y")) || 0;
        const width = parseFloat(svgElement.getAttribute("width")) || 0;
        const height = parseFloat(svgElement.getAttribute("height")) || 0;
        pathData = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
    } else if (tag === "polygon") {
        const points = (svgElement.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number);
        if (points.length < 4) return "";
        const pairs = [];
        for (let i = 0; i < points.length; i += 2) {
            pairs.push(`${points[i]} ${points[i + 1]}`);
        }
        pathData = `M ${pairs.join(" L ")} Z`;
    }

    if (!pathData) {
        log.warn("calculateOffsetFromSVG: failed to extract path data");
        return "";
    }

    return calculateOffsetFromPathData(pathData, offset, options);
}

/**
 * Custom offset calculator with a PaperOffset-compatible API.
 */
export class CustomOffsetCalculator {
    constructor(options = {}) {
        this.options = options;
    }

    calculateOffsetFromSVG(svgElement, offset) {
        return calculateOffsetFromSVG(svgElement, offset, this.options);
    }

    calculateOffsetContoursFromPathData(pathData, offset) {
        return []; // Deprecated
    }
}

export default CustomOffsetCalculator;
