/**
 * CustomOffsetProcessor - delegates to OffsetEngine for SVG offset operations.
 * Provides a compatible API with the old PaperOffsetProcessor.
 *
 * Sign convention for main canvas:
 *   positive offset = inward
 *   negative offset = outward
 *
 * Output paths are always forced to CW orientation so that
 * ExtrusionBuilder in ThreeModule produces correct 3D extrusions.
 */

import LoggerFactory from "../core/LoggerFactory.js";
import { ARC_APPROX_TOLERANCE } from "../config/constants.js";
import { OffsetEngine, calculateOffsetFromPathData as engineCalculateOffset } from "./OffsetEngine.js";

const log = LoggerFactory.createLogger("CustomOffsetProcessor");

/**
 * Compute signed area of an SVG path (positive = CCW, negative = CW).
 * Only looks at the polygonal approximation (ignores arcs for speed).
 */
function signedArea(pathData) {
    let area = 0;
    let cx = 0, cy = 0, sx = 0, sy = 0;
    const re = /([MmLlHhVvZz])([^MmLlHhVvZz]*)/g;
    let m;
    while ((m = re.exec(pathData)) !== null) {
        const cmd = m[1].toUpperCase();
        const args = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (cmd === "M") {
            if (sx !== 0 || sy !== 0) { /* new subpath, close previous */ }
            cx = args[0] || 0; cy = args[1] || 0;
            sx = cx; sy = cy;
        } else if (cmd === "L" || cmd === "H" || cmd === "V") {
            const nx = cmd === "H" ? args[0] : (args[0] !== undefined ? args[0] : cx);
            const ny = cmd === "V" ? args[0] : (args[1] !== undefined ? args[1] : cy);
            area += (cx * ny - nx * cy);
            cx = nx; cy = ny;
        } else if (cmd === "Z") {
            area += (cx * sy - sx * cy);
            cx = sx; cy = sy;
        }
    }
    return area / 2;
}

/**
 * Reverse an SVG path string (flip CW ↔ CCW).
 */
function reversePath(pathData) {
    // Parse into subpaths, reverse each, then reverse subpath order
    const subpaths = [];
    let current = [];
    const re = /([MmLlHhVvZzAa])([^MmLlHhVvZzAa]*)/g;
    let m;
    while ((m = re.exec(pathData)) !== null) {
        const cmd = m[1];
        const args = m[2].trim();
        if (cmd.toUpperCase() === "M" && current.length > 0) {
            subpaths.push(current);
            current = [];
        }
        current.push({ cmd, args });
        if (cmd.toUpperCase() === "Z") {
            subpaths.push(current);
            current = [];
        }
    }
    if (current.length > 0) subpaths.push(current);

    // Reverse each subpath
    const reversed = subpaths.map(sp => {
        if (sp.length === 0) return sp;
        // Find the closing Z
        let hasZ = sp[sp.length - 1].cmd.toUpperCase() === "Z";
        const body = hasZ ? sp.slice(0, -1) : [...sp];
        if (body.length < 1) return sp;

        // Collect all points
        const points = [];
        let cx = 0, cy = 0;
        for (const seg of body) {
            const args = seg.args.split(/[\s,]+/).filter(Boolean).map(Number);
            const upper = seg.cmd.toUpperCase();
            const rel = seg.cmd === seg.cmd.toLowerCase() && upper !== "Z";
            if (upper === "M") {
                for (let i = 0; i + 1 < args.length; i += 2) {
                    let x = args[i], y = args[i + 1];
                    if (rel) { x += cx; y += cy; }
                    points.push({ x, y });
                    cx = x; cy = y;
                }
            } else if (upper === "L") {
                for (let i = 0; i + 1 < args.length; i += 2) {
                    let x = args[i], y = args[i + 1];
                    if (rel) { x += cx; y += cy; }
                    points.push({ x, y });
                    cx = x; cy = y;
                }
            } else if (upper === "H") {
                for (const x of args) {
                    const fx = rel ? x + cx : x;
                    points.push({ x: fx, y: cy });
                    cx = fx;
                }
            } else if (upper === "V") {
                for (const y of args) {
                    const fy = rel ? y + cy : y;
                    points.push({ x: cx, y: fy });
                    cy = fy;
                }
            } else if (upper === "A") {
                // Approximate arc as endpoint only for reversal
                const tokens = seg.args.match(/[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) || [];
                if (tokens.length >= 7) {
                    let ex = Number(tokens[5]), ey = Number(tokens[6]);
                    if (rel) { ex += cx; ey += cy; }
                    points.push({ x: ex, y: ey });
                    cx = ex; cy = ey;
                }
            }
        }

        if (points.length < 2) return sp;

        // Reverse points
        const revPoints = [...points].reverse();
        const parts = [`M ${revPoints[0].x} ${revPoints[0].y}`];
        for (let i = 1; i < revPoints.length; i++) {
            parts.push(`L ${revPoints[i].x} ${revPoints[i].y}`);
        }
        if (hasZ) parts.push("Z");
        return parts.join(" ");
    });

    return reversed.join(" ");
}

/**
 * Ensure path is CW orientation. If CCW, reverse it.
 */
function ensureCW(pathData) {
    const area = signedArea(pathData);
    if (area > 0) {
        // CCW → reverse to CW
        return reversePath(pathData);
    }
    return pathData;
}

/**
 * Calculate offset for SVG path data using OffsetEngine.
 * @param {string} pathData - SVG path data
 * @param {number} offset - Offset distance
 * @param {Object} options - Offset options
 * @returns {string} SVG path data (always CW)
 */
export function calculateOffsetFromPathData(pathData, offset, options = {}) {
    if (!pathData) return "";

    if (Math.abs(offset) < 1e-9 && !options.forceReverseOutput) {
        return pathData;
    }

    try {
        // Main canvas expects: positive offset = inward.
        // OffsetEngine uses CCW normal (rotate90CCW): positive = left of path.
        // Canvas paths are typically CW, so "left" = outward.
        // Negate to flip: positive offset → inward.
        const effectiveOffset = -offset;

        let result = engineCalculateOffset(pathData, effectiveOffset, {
            joinType: options.join || "sharp",
            capType: options.cap || "flat",
            exportModule: options.exportModule,
            trimSelfIntersections: options.trimSelfIntersections || false,
            offsetSignMode: "direct",
            useArcApproximation: options.useArcApproximation || false,
            arcTolerance: options.arcTolerance || ARC_APPROX_TOLERANCE,
        });

        return result || "";
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
