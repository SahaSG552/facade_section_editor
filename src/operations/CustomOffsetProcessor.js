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
import { resolveSelfIntersectionsDetailed } from "./PaperBooleanProcessor.js";

const log = LoggerFactory.createLogger("CustomOffsetProcessor");
const COMMAND_RE = /([MmLlHhVvAaZz])([^MmLlHhVvAaZz]*)/g;
const SUBPATH_RE = /([MmLlHhVvZzAa])([^MmLlHhVvZzAa]*)/g;
const HAS_CLOSE_COMMAND_RE = /[Zz]/;

function getPathEndpoints(pathData) {
    let cx = 0, cy = 0, sx = null, sy = null, ex = null, ey = null;
    const re = new RegExp(COMMAND_RE);
    for (;;) {
        const match = re.exec(pathData);
        if (match === null) break;

        const rawCmd = match[1];
        const cmd = rawCmd.toUpperCase();
        const isRelative = rawCmd !== cmd;
        const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);

        if (cmd === "M") {
            if (args.length >= 2) {
                let mx = args[0] || 0;
                let my = args[1] || 0;
                if (isRelative) {
                    mx += cx;
                    my += cy;
                }
                cx = mx;
                cy = my;
                if (sx === null || sy === null) {
                    sx = cx;
                    sy = cy;
                }
                ex = cx;
                ey = cy;
                for (let i = 2; i + 1 < args.length; i += 2) {
                    let nx = args[i];
                    let ny = args[i + 1];
                    if (isRelative) {
                        nx += cx;
                        ny += cy;
                    }
                    cx = nx;
                    cy = ny;
                    ex = cx;
                    ey = cy;
                }
            }
        } else if (cmd === "L") {
            for (let i = 0; i + 1 < args.length; i += 2) {
                let nx = args[i];
                let ny = args[i + 1];
                if (isRelative) {
                    nx += cx;
                    ny += cy;
                }
                cx = nx;
                cy = ny;
                ex = cx;
                ey = cy;
            }
        } else if (cmd === "H") {
            for (let i = 0; i < args.length; i += 1) {
                let nx = args[i];
                if (isRelative) {
                    nx += cx;
                }
                cx = nx;
                ex = cx;
                ey = cy;
            }
        } else if (cmd === "V") {
            for (let i = 0; i < args.length; i += 1) {
                let ny = args[i];
                if (isRelative) {
                    ny += cy;
                }
                cy = ny;
                ex = cx;
                ey = cy;
            }
        } else if (cmd === "A") {
            for (let i = 0; i + 6 < args.length; i += 7) {
                let ex1 = args[i + 5];
                let ey1 = args[i + 6];
                if (isRelative) {
                    ex1 += cx;
                    ey1 += cy;
                }
                cx = ex1;
                cy = ey1;
                ex = cx;
                ey = cy;
            }
        } else if (cmd === "Z") {
            ex = sx;
            ey = sy;
            cx = sx;
            cy = sy;
        }
    }
    return { sx, sy, ex, ey };
}

function isPathGeometricallyClosed(pathData, tolerance = 1e-6) {
    const { sx, sy, ex, ey } = getPathEndpoints(pathData);
    if (![sx, sy, ex, ey].every(Number.isFinite)) return false;
    return Math.hypot(ex - sx, ey - sy) <= tolerance;
}

/**
 * Compute signed area of an SVG path in mathematical coordinates
 * (positive = CCW, negative = CW).
 *
 * We only need the winding sign, so line contributions and arc endpoint chord
 * contributions are sufficient and robust for mixed line/arc facade contours.
 */
function signedArea(pathData) {
    let area = 0;
    let cx = 0, cy = 0, sx = 0, sy = 0;
    const re = new RegExp(COMMAND_RE);
    for (;;) {
        const match = re.exec(pathData);
        if (match === null) break;

        const rawCmd = match[1];
        const cmd = rawCmd.toUpperCase();
        const isRelative = rawCmd !== cmd;
        const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (cmd === "M") {
            if (args.length >= 2) {
                let mx = args[0] || 0;
                let my = args[1] || 0;
                if (isRelative) {
                    mx += cx;
                    my += cy;
                }
                cx = mx;
                cy = my;
                sx = cx;
                sy = cy;

                // Additional moveto pairs are treated as implicit lineto commands.
                for (let i = 2; i + 1 < args.length; i += 2) {
                    let nx = args[i];
                    let ny = args[i + 1];
                    if (isRelative) {
                        nx += cx;
                        ny += cy;
                    }
                    area += (cx * ny - nx * cy);
                    cx = nx;
                    cy = ny;
                }
            }
        } else if (cmd === "L") {
            for (let i = 0; i + 1 < args.length; i += 2) {
                let nx = args[i];
                let ny = args[i + 1];
                if (isRelative) {
                    nx += cx;
                    ny += cy;
                }
                area += (cx * ny - nx * cy);
                cx = nx;
                cy = ny;
            }
        } else if (cmd === "H") {
            for (let i = 0; i < args.length; i += 1) {
                let nx = args[i];
                if (isRelative) {
                    nx += cx;
                }
                area += (cx * cy - nx * cy);
                cx = nx;
            }
        } else if (cmd === "V") {
            for (let i = 0; i < args.length; i += 1) {
                let ny = args[i];
                if (isRelative) {
                    ny += cy;
                }
                area += (cx * ny - cx * cy);
                cy = ny;
            }
        } else if (cmd === "A") {
            for (let i = 0; i + 6 < args.length; i += 7) {
                let ex = args[i + 5];
                let ey = args[i + 6];
                if (isRelative) {
                    ex += cx;
                    ey += cy;
                }
                area += (cx * ey - ex * cy);
                cx = ex;
                cy = ey;
            }
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
    const re = new RegExp(SUBPATH_RE);
    for (;;) {
        const match = re.exec(pathData);
        if (match === null) break;

        const cmd = match[1];
        const args = match[2].trim();
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
 * Calculate offset for SVG path data using OffsetEngine.
 * @param {string} pathData - SVG path data
 * @param {number} offset - Offset distance
 * @param {Object} options - Offset options
 * @param {"sharp"|"round"} [options.join] - Join type.
 * @param {"flat"|"round"} [options.cap] - Cap type.
 * @param {Object} [options.exportModule] - Export module with parser dependencies.
 * @param {boolean} [options.trimSelfIntersections] - Override trim policy.
 * @param {"nearest-segment-normal"} [options.sideResolution] - Open-path cursor side resolver.
 * @param {{x:number,y:number}} [options.cursorPoint] - Cursor in path-space coords.
 * @param {boolean} [options.useArcApproximation] - Enable cubic arc approximation path.
 * @param {number} [options.arcTolerance] - Approximation tolerance.
 * @param {boolean} [options.forceReverseOutput] - Preserve legacy passthrough at near-zero offset.
 * @returns {string} SVG path data
 */
export function calculateOffsetFromPathData(pathData, offset, options = {}) {
    if (!pathData) return "";

    if (Math.abs(offset) < 1e-9 && !options.forceReverseOutput) {
        return pathData;
    }

    try {
        // Preserve winding only for closed paths. For open contours, signed-area
        // is not a stable orientation signal and can cause spurious reversals
        // across sequential offsets (breaking bridge direction consistency).
        const inputHasClose =
            HAS_CLOSE_COMMAND_RE.test(pathData) ||
            isPathGeometricallyClosed(pathData);
        const originalMathArea = inputHasClose ? signedArea(pathData) : 0;
        const originalCCW = inputHasClose ? originalMathArea > 0 : null;

        let effectiveOffset = -offset;

        if (
            inputHasClose &&
            Number.isFinite(originalMathArea) &&
            Math.abs(originalMathArea) > 1e-9
        ) {
            // For closed/closed-like contours the engine's direct-mode sign still
            // depends on traversal winding. Normalize by the mathematical winding
            // sign so main-canvas table semantics stay stable:
            //   +offset => inward
            //   -offset => outward
            // regardless of whether the contour is stored in either direction.
            effectiveOffset = originalMathArea > 0 ? offset : -offset;
        }

        let result = engineCalculateOffset(pathData, effectiveOffset, {
            joinType: options.join || "sharp",
            capType: options.cap || "flat",
            exportModule: options.exportModule,
            trimSelfIntersections:
                typeof options.trimSelfIntersections === "boolean"
                    ? options.trimSelfIntersections
                    : true,
            sideResolution: options.sideResolution,
            cursorPoint: options.cursorPoint,
            offsetSignMode: "direct",
            useArcApproximation: options.useArcApproximation || false,
            arcTolerance: options.arcTolerance || ARC_APPROX_TOLERANCE,
        });

        // Match PathEditor behavior for closed contours with self-intersections:
        // split detailed Paper components and keep the components matching the
        // source winding. This is what turns a single self-intersecting contour
        // into the same multi-contour result the editor preview shows.
        if (
            result &&
            inputHasClose &&
            options.editorLikeClosedSplit === true &&
            (typeof options.trimSelfIntersections === "boolean"
                ? options.trimSelfIntersections
                : true)
        ) {
            try {
                const detailed = resolveSelfIntersectionsDetailed(result, {
                    preserveAllComponents: true,
                });
                if (
                    detailed?.hadSelfIntersections &&
                    Array.isArray(detailed.components) &&
                    detailed.components.length > 1
                ) {
                    const sourceWindingSign = Math.sign(originalMathArea);
                    const picked = detailed.components.filter((component) => {
                        const area = Number(component?.area) || 0;
                        if (Math.abs(area) <= 1e-9) return false;
                        if (sourceWindingSign === 0) return true;
                        return Math.sign(area) === sourceWindingSign;
                    });
                    const useComponents =
                        picked.length > 0 ? picked : detailed.components;
                    const splitPath = useComponents
                        .map((component) => component.pathData)
                        .filter(Boolean)
                        .join(" ")
                        .trim();
                    if (splitPath) {
                        result = splitPath;
                    }
                }
            } catch (_err) {
                // Non-fatal: keep engine output when Paper split is unavailable.
            }
        }

        if (result && inputHasClose && originalCCW !== null) {
            const resultCCW = signedArea(result) > 0;
            if (resultCCW !== originalCCW) {
                result = reversePath(result);
            }
        }

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
