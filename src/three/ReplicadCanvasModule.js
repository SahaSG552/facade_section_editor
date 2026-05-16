/**
 * ReplicadCanvasModule
 *
 * BREP-based 3D visualization using Replicad + opencascade.js
 * Runs in parallel with ThreeModule; toggle via setEnabled().
 *
 * Key design:
 * - Lazy WASM init (opencascade is ~50 MB – loads on first activation)
 * - Reads window.offsetContours and window.bitsOnCanvas (same sources as ThreeModule)
 * - Correct coord transform: Paper.js Y-down → Replicad XZ plane (Y-up)
 * - genericSweep replaces _extrudeRound / _extrudeMiter
 * - blobSTEP() provides native STEP export
 *
 * Bug-fixes vs previous skeleton:
 * 1. initialize() instead of init() (BaseModule contract)
 * 2. Direct Replicad API – no replicad.default(main) wrapper
 * 3. Coordinate transform paperSVGToReplicadXZ() applied before importSVG
 * 4. Per-bit contour filtering by exact bitIndex
 * 5. All renderer state stored on `this`, not module-level globals
 * 6. replicad-opencascadejs excluded from esbuild (WASM needs special treatment)
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import BaseModule from "../core/BaseModule.js";
import LoggerFactory from "../core/LoggerFactory.js";
import eventBus from "../core/eventBus.js";
import { appConfig } from "../config/AppConfig.js";
import ViewCubeGizmo from "./ViewCubeGizmo.js";

// ---------------------------------------------------------------------------
// Module-level WASM singletons (shared across all instances)
// ---------------------------------------------------------------------------
let _replicad = null;
let _oc = null;
let _replicadReady = false;
let _initPromise = null; // prevent double-init races

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

/**
 * Transform a single Paper.js SVG path string from Paper.js canvas space
 * (Y-down, origin top-left) to Replicad XZ-plane space (Y-up, origin center).
 *
 * Replicad Sketcher("XZ") works in the XZ plane of the OCCT coordinate system:
 *   - horizontal axis  → X
 *   - vertical axis    → Z (positive upward)
 *
 * Paper.js:
 *   origin = top-left corner of panel bounding box
 *   Y grows downward
 *
 * Mapping:
 *   replicad_x = paperX - panelWidth / 2
 *   replicad_z = panelHeight / 2 - paperY   (flip Y)
 *
 * We do this by injecting a transform into the SVG path via a lightweight
 * regex-free tokeniser that walks the command characters.
 *
 * @param {string} pathData  - SVG path d-string in Paper.js coordinates
 * @param {number} panelW    - panel width  (Paper.js units = mm)
 * @param {number} panelH    - panel height (Paper.js units = mm)
 * @returns {string} transformed SVG path string in Replicad XZ space
 */
function paperSVGToReplicadXZ(pathData, panelW, panelH) {
    const halfW = panelW / 2;
    const halfH = panelH / 2;

    // Walk command tokens and transform absolute coordinates.
    // We only need to handle absolute commands (M, L, C, Q, A, Z, H, V)
    // because Paper.js/CustomOffsetProcessor always outputs absolute paths.
    const tokens = pathData.trim().split(/([MmLlCcQqAaZzHhVv])/);
    const out = [];

    let cmd = "";
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i].trim();
        if (!t) continue;

        if (/^[MmLlCcQqAaZzHhVv]$/.test(t)) {
            cmd = t;
            out.push(cmd);
            continue;
        }

        // Parse numbers for this argument group
        const nums = t.match(/-?[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?/g);
        if (!nums) continue;
        const n = nums.map(Number);

        const tx = (x) => x - halfW;
        const tz = (y) => halfH - y; // flip Y → Z

        switch (cmd.toUpperCase()) {
            case "M":
            case "L": {
                // pairs of (x y)
                const transformed = [];
                for (let k = 0; k + 1 < n.length; k += 2) {
                    transformed.push(`${tx(n[k]).toFixed(4)},${tz(n[k + 1]).toFixed(4)}`);
                }
                out.push(transformed.join(" "));
                break;
            }
            case "C": {
                // 3 pairs: cx1 cy1 cx2 cy2 x y
                const transformed = [];
                for (let k = 0; k + 5 < n.length; k += 6) {
                    transformed.push(
                        `${tx(n[k]).toFixed(4)},${tz(n[k+1]).toFixed(4)}` +
                        ` ${tx(n[k+2]).toFixed(4)},${tz(n[k+3]).toFixed(4)}` +
                        ` ${tx(n[k+4]).toFixed(4)},${tz(n[k+5]).toFixed(4)}`
                    );
                }
                out.push(transformed.join(" "));
                break;
            }
            case "Q": {
                // 2 pairs: cx cy x y
                const transformed = [];
                for (let k = 0; k + 3 < n.length; k += 4) {
                    transformed.push(
                        `${tx(n[k]).toFixed(4)},${tz(n[k+1]).toFixed(4)}` +
                        ` ${tx(n[k+2]).toFixed(4)},${tz(n[k+3]).toFixed(4)}`
                    );
                }
                out.push(transformed.join(" "));
                break;
            }
            case "A": {
                // rx ry x-rotation large-arc sweep x y
                const transformed = [];
                for (let k = 0; k + 6 < n.length; k += 7) {
                    transformed.push(
                        `${n[k].toFixed(4)},${n[k+1].toFixed(4)}` +      // rx ry
                        ` ${n[k+2].toFixed(4)}` +                          // x-rotation
                        ` ${n[k+3]},${n[k+4]}` +                           // flags
                        ` ${tx(n[k+5]).toFixed(4)},${tz(n[k+6]).toFixed(4)}`
                    );
                }
                out.push(transformed.join(" "));
                break;
            }
            case "H": {
                out.push(n.map((x) => tx(x).toFixed(4)).join(" "));
                break;
            }
            case "V": {
                out.push(n.map((y) => tz(y).toFixed(4)).join(" "));
                break;
            }
            case "Z":
                // already pushed above
                break;
            default:
                out.push(t);
        }
    }
    return out.join(" ");
}

function pickPrimarySubpath(pathData) {
    const source = String(pathData || "").trim();
    if (!source) return "";

    const parts = source.match(/[Mm][^Mm]*/g);
    if (!parts || parts.length <= 1) return source;

    const isClosedSubpath = (part) => {
        const commands = parseSvgCommands(part);
        if (!commands.length) return false;

        if (commands.some((cmd) => String(cmd?.cmd || "").toUpperCase() === "Z")) {
            return true;
        }

        let curX = 0;
        let curY = 0;
        let startX = null;
        let startY = null;

        for (const entry of commands) {
            const up = String(entry?.cmd || "").toUpperCase();
            const rel = entry?.cmd !== up;
            const v = entry?.values || [];
            if (up === "M" && v.length >= 2) {
                curX = rel ? curX + v[0] : v[0];
                curY = rel ? curY + v[1] : v[1];
                if (startX === null || startY === null) {
                    startX = curX;
                    startY = curY;
                }
            } else if (up === "L" && v.length >= 2) {
                curX = rel ? curX + v[0] : v[0];
                curY = rel ? curY + v[1] : v[1];
            } else if (up === "H" && v.length >= 1) {
                curX = rel ? curX + v[0] : v[0];
            } else if (up === "V" && v.length >= 1) {
                curY = rel ? curY + v[0] : v[0];
            } else if (up === "C" && v.length >= 6) {
                curX = rel ? curX + v[4] : v[4];
                curY = rel ? curY + v[5] : v[5];
            } else if (up === "S" && v.length >= 4) {
                curX = rel ? curX + v[2] : v[2];
                curY = rel ? curY + v[3] : v[3];
            } else if (up === "Q" && v.length >= 4) {
                curX = rel ? curX + v[2] : v[2];
                curY = rel ? curY + v[3] : v[3];
            } else if (up === "T" && v.length >= 2) {
                curX = rel ? curX + v[0] : v[0];
                curY = rel ? curY + v[1] : v[1];
            } else if (up === "A" && v.length >= 7) {
                curX = rel ? curX + v[5] : v[5];
                curY = rel ? curY + v[6] : v[6];
            }
        }

        if (startX === null || startY === null) return false;
        return Math.hypot(curX - startX, curY - startY) <= 1e-3;
    };

    const estimateSubpathLength = (part) => {
        const commands = parseSvgCommands(part);
        if (!commands.length) return 0;

        let curX = 0;
        let curY = 0;
        let startX = null;
        let startY = null;
        let len = 0;

        for (const entry of commands) {
            const up = String(entry?.cmd || "").toUpperCase();
            const rel = entry?.cmd !== up;
            const v = entry?.values || [];

            if (up === "M" && v.length >= 2) {
                curX = rel ? curX + v[0] : v[0];
                curY = rel ? curY + v[1] : v[1];
                if (startX === null || startY === null) {
                    startX = curX;
                    startY = curY;
                }
                continue;
            }

            let nextX = curX;
            let nextY = curY;

            if (up === "L" && v.length >= 2) {
                nextX = rel ? curX + v[0] : v[0];
                nextY = rel ? curY + v[1] : v[1];
            } else if (up === "H" && v.length >= 1) {
                nextX = rel ? curX + v[0] : v[0];
            } else if (up === "V" && v.length >= 1) {
                nextY = rel ? curY + v[0] : v[0];
            } else if (up === "C" && v.length >= 6) {
                nextX = rel ? curX + v[4] : v[4];
                nextY = rel ? curY + v[5] : v[5];
            } else if (up === "S" && v.length >= 4) {
                nextX = rel ? curX + v[2] : v[2];
                nextY = rel ? curY + v[3] : v[3];
            } else if (up === "Q" && v.length >= 4) {
                nextX = rel ? curX + v[2] : v[2];
                nextY = rel ? curY + v[3] : v[3];
            } else if (up === "T" && v.length >= 2) {
                nextX = rel ? curX + v[0] : v[0];
                nextY = rel ? curY + v[1] : v[1];
            } else if (up === "A" && v.length >= 7) {
                nextX = rel ? curX + v[5] : v[5];
                nextY = rel ? curY + v[6] : v[6];
            } else if (up === "Z") {
                if (startX !== null && startY !== null) {
                    nextX = startX;
                    nextY = startY;
                }
            }

            len += Math.hypot(nextX - curX, nextY - curY);
            curX = nextX;
            curY = nextY;
        }

        return len;
    };

    const estimateSubpathBBoxArea = (part) => {
        const commands = parseSvgCommands(part);
        if (!commands.length) return 0;

        let curX = 0;
        let curY = 0;
        let startX = null;
        let startY = null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const pushPoint = (x, y) => {
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        };

        for (const entry of commands) {
            const up = String(entry?.cmd || "").toUpperCase();
            const rel = entry?.cmd !== up;
            const v = entry?.values || [];

            if (up === "M" && v.length >= 2) {
                curX = rel ? curX + v[0] : v[0];
                curY = rel ? curY + v[1] : v[1];
                if (startX === null || startY === null) {
                    startX = curX;
                    startY = curY;
                }
                pushPoint(curX, curY);
                continue;
            }

            if (up === "L" && v.length >= 2) {
                curX = rel ? curX + v[0] : v[0];
                curY = rel ? curY + v[1] : v[1];
                pushPoint(curX, curY);
            } else if (up === "H" && v.length >= 1) {
                curX = rel ? curX + v[0] : v[0];
                pushPoint(curX, curY);
            } else if (up === "V" && v.length >= 1) {
                curY = rel ? curY + v[0] : v[0];
                pushPoint(curX, curY);
            } else if (up === "C" && v.length >= 6) {
                const c1x = rel ? curX + v[0] : v[0];
                const c1y = rel ? curY + v[1] : v[1];
                const c2x = rel ? curX + v[2] : v[2];
                const c2y = rel ? curY + v[3] : v[3];
                curX = rel ? curX + v[4] : v[4];
                curY = rel ? curY + v[5] : v[5];
                pushPoint(c1x, c1y);
                pushPoint(c2x, c2y);
                pushPoint(curX, curY);
            } else if (up === "S" && v.length >= 4) {
                const c2x = rel ? curX + v[0] : v[0];
                const c2y = rel ? curY + v[1] : v[1];
                curX = rel ? curX + v[2] : v[2];
                curY = rel ? curY + v[3] : v[3];
                pushPoint(c2x, c2y);
                pushPoint(curX, curY);
            } else if (up === "Q" && v.length >= 4) {
                const qx = rel ? curX + v[0] : v[0];
                const qy = rel ? curY + v[1] : v[1];
                curX = rel ? curX + v[2] : v[2];
                curY = rel ? curY + v[3] : v[3];
                pushPoint(qx, qy);
                pushPoint(curX, curY);
            } else if (up === "T" && v.length >= 2) {
                curX = rel ? curX + v[0] : v[0];
                curY = rel ? curY + v[1] : v[1];
                pushPoint(curX, curY);
            } else if (up === "A" && v.length >= 7) {
                curX = rel ? curX + v[5] : v[5];
                curY = rel ? curY + v[6] : v[6];
                pushPoint(curX, curY);
            } else if (up === "Z") {
                if (startX !== null && startY !== null) {
                    curX = startX;
                    curY = startY;
                    pushPoint(curX, curY);
                }
            }
        }

        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            return 0;
        }

        return Math.max(0, (maxX - minX) * (maxY - minY));
    };

    let best = "";
    let bestLen = -1;
    let bestClosed = false;
    let bestArea = -1;
    for (const rawPart of parts) {
        const part = String(rawPart || "").trim();
        if (!part) continue;
        let len = 0;
        try {
            const p = new SVGPathProperties(part);
            len = Number(p.getTotalLength()) || 0;
        } catch {
            len = 0;
        }

        if (!Number.isFinite(len) || len <= 0) {
            len = estimateSubpathLength(part);
        }

        const closed = isClosedSubpath(part);
        const area = estimateSubpathBBoxArea(part);
        const isBetter = (closed && !bestClosed)
            || (closed === bestClosed && area > bestArea)
            || (closed === bestClosed && area === bestArea && len > bestLen);
        if (isBetter) {
            bestLen = len;
            best = part;
            bestClosed = closed;
            bestArea = area;
        }
    }

    return best || source;
}

function sampleSvgPathPoints(pathData, sampleStep = 2) {
    if (!pathData || typeof document === "undefined") return [];

    try {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);

        const totalLength = path.getTotalLength();
        if (!Number.isFinite(totalLength) || totalLength <= 0) return [];

        const clampedStep = Math.max(0.5, sampleStep);
        const sampleCount = Math.max(8, Math.ceil(totalLength / clampedStep));
        const points = [];

        for (let i = 0; i <= sampleCount; i++) {
            const t = (i / sampleCount) * totalLength;
            const p = path.getPointAtLength(t);
            const prev = points[points.length - 1];
            if (!prev || Math.hypot(prev.x - p.x, prev.y - p.y) > 1e-4) {
                points.push({ x: p.x, y: p.y });
            }
        }

        if (points.length > 2) {
            const first = points[0];
            const last = points[points.length - 1];
            if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-3) {
                points.pop();
            }
        }

        return points;
    } catch {
        return [];
    }
}

/**
 * Compute the bounding box of an SVG path string by temporarily injecting it
 * into the live DOM and using getBBox(). Returns null if not available.
 */
function computePathBBox(pathData) {
    if (!pathData || typeof document === "undefined") return null;
    try {
        const svgEl = document.querySelector("svg");
        if (!svgEl) return null;
        const tmp = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tmp.setAttribute("d", pathData);
        // hidden so it doesn't flash
        tmp.setAttribute("visibility", "hidden");
        svgEl.appendChild(tmp);
        const b = tmp.getBBox();
        svgEl.removeChild(tmp);
        if (b.width > 0 && b.height > 0) {
            return { x: b.x, y: b.y, width: b.width, height: b.height };
        }
    } catch { /* ignore */ }
    return null;
}

/**
 * Build a Replicad XZ-plane sketch by sampling an SVG path and transforming
 * coordinates according to the panel bounding-box reference.
 *
 * Transform matches ThreeModule/ExtrusionBuilder.convertPoint2DTo3D:
 *   replicad_x = x - (bboxRef.x + bboxRef.width  / 2)   // centre horizontally
 *   replicad_z = (bboxRef.y + bboxRef.height) - y        // flip Y → Z-up
 */
function buildSketchFromSvgPath(pathData, bboxRef, Sketcher, {
    close = true,
    sampleStep = 2,
    plane = "XZ",
    panelAnchor = "top-left",
    depth = 0,
    panelThickness = appConfig.panel.thickness,
} = {}) {
    const points = sampleSvgPathPoints(pathData, sampleStep);
    if (points.length < 2) return null;

    const centerX = bboxRef.x + bboxRef.width  / 2;
    const bottomY = bboxRef.y + bboxRef.height;
    const toX = (x) => x - centerX;
    const toZ = (y) => bottomY - y;

    const relativeToTop = (y) => y - bboxRef.y;
    const toY = (y) => {
        if (panelAnchor === "bottom-left") {
            return relativeToTop(y);
        }
        return bboxRef.height - relativeToTop(y);
    };

    const halfThickness = panelThickness / 2;
    const surfaceZ = panelAnchor === "top-left"
        ? halfThickness - depth
        : panelAnchor === "bottom-left"
            ? -halfThickness - depth
            : 0;

    let sketch;
    if (plane === "XY") {
        sketch = new Sketcher("XY", [0, 0, surfaceZ]).movePointerTo([toX(points[0].x), toY(points[0].y)]);
    } else {
        sketch = new Sketcher("XZ").movePointerTo([toX(points[0].x), toZ(points[0].y)]);
    }

    for (let i = 1; i < points.length; i++) {
        if (plane === "XY") {
            sketch = sketch.lineTo([toX(points[i].x), toY(points[i].y)]);
        } else {
            sketch = sketch.lineTo([toX(points[i].x), toZ(points[i].y)]);
        }
    }

    if (close) {
        sketch = sketch.close();
    }

    return sketch;
}

function parseSvgCommands(pathData) {
    const tokens = String(pathData || "")
        .trim()
        .match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);

    if (!tokens) return [];

    const paramCounts = {
        M: 2,
        L: 2,
        H: 1,
        V: 1,
        C: 6,
        S: 4,
        Q: 4,
        T: 2,
        A: 7,
        Z: 0,
    };

    const commands = [];
    let i = 0;
    let cmd = null;

    while (i < tokens.length) {
        const tk = tokens[i];
        if (/^[a-zA-Z]$/.test(tk)) {
            cmd = tk;
            i += 1;
            if (cmd === "Z" || cmd === "z") {
                commands.push({ cmd, values: [] });
            }
            continue;
        }

        if (!cmd) {
            i += 1;
            continue;
        }

        const up = cmd.toUpperCase();
        const count = paramCounts[up];
        if (count === undefined || count === 0) {
            continue;
        }

        const values = [];
        while (values.length < count && i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
            values.push(Number(tokens[i]));
            i += 1;
        }

        if (values.length === count) {
            commands.push({ cmd, values });
            if ((cmd === "M" || cmd === "m") && i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
                cmd = cmd === "M" ? "L" : "l";
            }
        }
    }

    return commands;
}

function summarizeSvgPath(pathData) {
    const commands = parseSvgCommands(pathData);
    const counts = {
        M: 0,
        L: 0,
        H: 0,
        V: 0,
        C: 0,
        S: 0,
        Q: 0,
        T: 0,
        A: 0,
        Z: 0,
    };

    let curX = 0;
    let curY = 0;
    let startX = null;
    let startY = null;

    for (const entry of commands) {
        const up = String(entry?.cmd || "").toUpperCase();
        const rel = entry?.cmd !== up;
        const v = entry?.values || [];
        if (counts[up] !== undefined) counts[up] += 1;

        if (up === "M" && v.length >= 2) {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
            if (startX === null || startY === null) {
                startX = curX;
                startY = curY;
            }
        } else if (up === "L" && v.length >= 2) {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
        } else if (up === "H" && v.length >= 1) {
            curX = rel ? curX + v[0] : v[0];
        } else if (up === "V" && v.length >= 1) {
            curY = rel ? curY + v[0] : v[0];
        } else if (up === "C" && v.length >= 6) {
            curX = rel ? curX + v[4] : v[4];
            curY = rel ? curY + v[5] : v[5];
        } else if (up === "S" && v.length >= 4) {
            curX = rel ? curX + v[2] : v[2];
            curY = rel ? curY + v[3] : v[3];
        } else if (up === "Q" && v.length >= 4) {
            curX = rel ? curX + v[2] : v[2];
            curY = rel ? curY + v[3] : v[3];
        } else if (up === "T" && v.length >= 2) {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
        } else if (up === "A" && v.length >= 7) {
            curX = rel ? curX + v[5] : v[5];
            curY = rel ? curY + v[6] : v[6];
        } else if (up === "Z" && startX !== null && startY !== null) {
            curX = startX;
            curY = startY;
        }
    }

    const closedGeom = startX !== null && startY !== null && Math.hypot(curX - startX, curY - startY) <= 1e-3;
    return {
        total: commands.length,
        counts,
        hasArc: counts.A > 0,
        hasCloseCmd: counts.Z > 0,
        closedGeom,
    };
}

function buildSketchFromSvgPathCommands(pathData, bboxRef, Sketcher, {
    close = true,
    plane = "XZ",
    panelAnchor = "top-left",
    depth = 0,
    panelThickness = appConfig.panel.thickness,
    applyDepthForXY = false,
} = {}) {
    const commands = parseSvgCommands(pathData);
    if (!commands.length) return null;

    const centerX = bboxRef.x + bboxRef.width  / 2;
    const bottomY = bboxRef.y + bboxRef.height;
    const tx = (x) => x - centerX;
    const tz = (y) => bottomY - y;  // Y-flip: SVG Y-down → Replicad Z-up
    const relativeToTop = (y) => y - bboxRef.y;
    const ty = (y) => {
        if (panelAnchor === "bottom-left") {
            return relativeToTop(y);
        }
        return bboxRef.height - relativeToTop(y);
    };

    const halfThickness = panelThickness / 2;
    const surfaceZ = panelAnchor === "top-left"
        ? halfThickness - depth
        : panelAnchor === "bottom-left"
            ? -halfThickness - depth
            : 0;

    const useXY = plane === "XY";
    const flipY = useXY ? panelAnchor !== "bottom-left" : true;
    const mapPoint = (x, y) => (useXY ? [tx(x), ty(y)] : [tx(x), tz(y)]);

    let sketch = null;
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;
    let prevC2X = null;
    let prevC2Y = null;
    let prevQX = null;
    let prevQY = null;
    let sawZ = false;
    let closedByGeometry = false;

    const isNear2D = (ax, ay, bx, by, eps = 1e-9) =>
        Math.abs(ax - bx) <= eps && Math.abs(ay - by) <= eps;
    const segmentEps = 1e-5;
    const closeEps = 1e-3;

    for (let idx = 0; idx < commands.length; idx += 1) {
        const entry = commands[idx];
        const nextEntry = commands[idx + 1] || null;
        const beforeExplicitClose = nextEntry?.cmd?.toUpperCase() === "Z";
        const snapEndpointToStartIfClosing = (x, y) => {
            if (beforeExplicitClose && isNear2D(x, y, startX, startY, closeEps)) {
                return [startX, startY];
            }
            return [x, y];
        };

        const raw = entry.cmd;
        const up = raw.toUpperCase();
        const rel = raw !== up;
        const v = entry.values;

        if (up === "M") {
            const x = rel ? curX + v[0] : v[0];
            const y = rel ? curY + v[1] : v[1];
            sketch = useXY
                ? new Sketcher("XY", [0, 0, applyDepthForXY ? surfaceZ : 0]).movePointerTo(mapPoint(x, y))
                : new Sketcher(plane).movePointerTo(mapPoint(x, y));
            curX = x;
            curY = y;
            startX = x;
            startY = y;
            prevC2X = prevC2Y = prevQX = prevQY = null;
            continue;
        }

        if (!sketch) continue;

        if (up === "L") {
            let x = rel ? curX + v[0] : v[0];
            let y = rel ? curY + v[1] : v[1];
            [x, y] = snapEndpointToStartIfClosing(x, y);
            if (!isNear2D(x, y, curX, curY, segmentEps)) {
                sketch = sketch.lineTo(mapPoint(x, y));
            }
            curX = x;
            curY = y;
            closedByGeometry = isNear2D(curX, curY, startX, startY);
        } else if (up === "H") {
            let x = rel ? curX + v[0] : v[0];
            let y = curY;
            [x, y] = snapEndpointToStartIfClosing(x, y);
            if (!isNear2D(x, curY, curX, curY, segmentEps)) {
                sketch = sketch.lineTo(mapPoint(x, y));
            }
            curX = x;
            curY = y;
            closedByGeometry = isNear2D(curX, curY, startX, startY);
        } else if (up === "V") {
            let x = curX;
            let y = rel ? curY + v[0] : v[0];
            [x, y] = snapEndpointToStartIfClosing(x, y);
            if (!isNear2D(x, y, curX, curY, segmentEps)) {
                sketch = sketch.lineTo(mapPoint(x, y));
            }
            curX = x;
            curY = y;
            closedByGeometry = isNear2D(curX, curY, startX, startY);
        } else if (up === "C") {
            const c1x = rel ? curX + v[0] : v[0];
            const c1y = rel ? curY + v[1] : v[1];
            const c2x = rel ? curX + v[2] : v[2];
            const c2y = rel ? curY + v[3] : v[3];
            let x = rel ? curX + v[4] : v[4];
            let y = rel ? curY + v[5] : v[5];
            [x, y] = snapEndpointToStartIfClosing(x, y);
            if (!isNear2D(x, y, curX, curY, segmentEps)) {
                sketch = sketch.cubicBezierCurveTo(mapPoint(x, y), mapPoint(c1x, c1y), mapPoint(c2x, c2y));
            }
            prevC2X = c2x;
            prevC2Y = c2y;
            prevQX = prevQY = null;
            curX = x;
            curY = y;
            closedByGeometry = isNear2D(curX, curY, startX, startY);
        } else if (up === "S") {
            const c1x = prevC2X !== null ? 2 * curX - prevC2X : curX;
            const c1y = prevC2Y !== null ? 2 * curY - prevC2Y : curY;
            const c2x = rel ? curX + v[0] : v[0];
            const c2y = rel ? curY + v[1] : v[1];
            let x = rel ? curX + v[2] : v[2];
            let y = rel ? curY + v[3] : v[3];
            [x, y] = snapEndpointToStartIfClosing(x, y);
            if (!isNear2D(x, y, curX, curY, segmentEps)) {
                sketch = sketch.cubicBezierCurveTo(mapPoint(x, y), mapPoint(c1x, c1y), mapPoint(c2x, c2y));
            }
            prevC2X = c2x;
            prevC2Y = c2y;
            prevQX = prevQY = null;
            curX = x;
            curY = y;
            closedByGeometry = isNear2D(curX, curY, startX, startY);
        } else if (up === "Q") {
            const qx = rel ? curX + v[0] : v[0];
            const qy = rel ? curY + v[1] : v[1];
            let x = rel ? curX + v[2] : v[2];
            let y = rel ? curY + v[3] : v[3];
            [x, y] = snapEndpointToStartIfClosing(x, y);
            if (!isNear2D(x, y, curX, curY, segmentEps)) {
                sketch = sketch.quadraticBezierCurveTo(mapPoint(x, y), mapPoint(qx, qy));
            }
            prevQX = qx;
            prevQY = qy;
            prevC2X = prevC2Y = null;
            curX = x;
            curY = y;
            closedByGeometry = isNear2D(curX, curY, startX, startY);
        } else if (up === "T") {
            const qx = prevQX !== null ? 2 * curX - prevQX : curX;
            const qy = prevQY !== null ? 2 * curY - prevQY : curY;
            let x = rel ? curX + v[0] : v[0];
            let y = rel ? curY + v[1] : v[1];
            [x, y] = snapEndpointToStartIfClosing(x, y);
            if (!isNear2D(x, y, curX, curY, segmentEps)) {
                sketch = sketch.quadraticBezierCurveTo(mapPoint(x, y), mapPoint(qx, qy));
            }
            prevQX = qx;
            prevQY = qy;
            prevC2X = prevC2Y = null;
            curX = x;
            curY = y;
            closedByGeometry = isNear2D(curX, curY, startX, startY);
        } else if (up === "A") {
            const rx = v[0];
            const ry = v[1];
            const rot = flipY ? -v[2] : v[2];
            const largeArc = !!v[3];
            const sweep = flipY ? !v[4] : !!v[4];
            let x = rel ? curX + v[5] : v[5];
            let y = rel ? curY + v[6] : v[6];
            [x, y] = snapEndpointToStartIfClosing(x, y);
            if (!isNear2D(x, y, curX, curY, segmentEps)) {
                sketch = sketch.ellipseTo(mapPoint(x, y), rx, ry, rot, largeArc, sweep);
            }
            curX = x;
            curY = y;
            closedByGeometry = isNear2D(curX, curY, startX, startY);
            prevC2X = prevC2Y = prevQX = prevQY = null;
        } else if (up === "Z") {
            sawZ = true;
            // Z doesn't draw explicitly - just marks closure.
            // The snapEndpointToStartIfClosing logic snaps the last segment endpoint
            // if it's within closeEps of start. Then sketch.close() will ensure
            // topological closure via OCC BRepBuilderAPI_MakeWire.
            prevC2X = prevC2Y = prevQX = prevQY = null;
        }
    }

    if (!sketch) return null;
    // When path has Z and close is requested, close only if needed.
    // If geometry is already closed, avoid adding a redundant zero-length closing edge.
    if (sawZ && close) return closedByGeometry ? sketch.done() : sketch.close();
    // For non-Z paths, close only if close=true and path isn't already closed
    const shouldClose = close && !closedByGeometry;
    return shouldClose ? sketch.close() : sketch.done();
}

function buildSketchFromOffsetSegments(segments, bboxRef, Sketcher, {
    close = true,
    plane = "XY",
    panelAnchor = "top-left",
    depth = 0,
    panelThickness = appConfig.panel.thickness,
    applyDepthForXY = false,
} = {}) {
    if (!Array.isArray(segments) || segments.length === 0) return null;

    const centerX = bboxRef.x + bboxRef.width / 2;
    const bottomY = bboxRef.y + bboxRef.height;
    const tx = (x) => x - centerX;
    const tz = (y) => bottomY - y;
    const relativeToTop = (y) => y - bboxRef.y;
    const ty = (y) => {
        if (panelAnchor === "bottom-left") {
            return relativeToTop(y);
        }
        return bboxRef.height - relativeToTop(y);
    };

    const halfThickness = panelThickness / 2;
    const surfaceZ = panelAnchor === "top-left"
        ? halfThickness - depth
        : panelAnchor === "bottom-left"
            ? -halfThickness - depth
            : 0;

    const useXY = plane === "XY";
    const flipY = useXY ? panelAnchor !== "bottom-left" : true;
    const mapPoint = (x, y) => (useXY ? [tx(x), ty(y)] : [tx(x), tz(y)]);

    const isNear2D = (ax, ay, bx, by, eps = 1e-6) =>
        Math.abs(ax - bx) <= eps && Math.abs(ay - by) <= eps;

    const readArcParams = (seg) => {
        const data = seg?.arc || {};
        const sx = Number(seg?.start?.x);
        const sy = Number(seg?.start?.y);
        let rx = Number(data.rx);
        let ry = Number(data.ry);

        const hasRadii = Number.isFinite(rx) && rx > 0 && Number.isFinite(ry) && ry > 0;
        if (!hasRadii) {
            const radius = Number(data.radius);
            if (Number.isFinite(radius) && radius > 0) {
                rx = radius;
                ry = radius;
            }
        }

        if ((!Number.isFinite(rx) || rx <= 0 || !Number.isFinite(ry) || ry <= 0)
            && Number.isFinite(sx)
            && Number.isFinite(sy)) {
            const cx = Number(data.center?.x ?? data.centerX);
            const cy = Number(data.center?.y ?? data.centerY);
            if (Number.isFinite(cx) && Number.isFinite(cy)) {
                const r = Math.hypot(sx - cx, sy - cy);
                if (Number.isFinite(r) && r > 0) {
                    rx = r;
                    ry = r;
                }
            }
        }

        if (!Number.isFinite(rx) || rx <= 0 || !Number.isFinite(ry) || ry <= 0) {
            return null;
        }

        const rotationRaw = Number(data.xRotation ?? data.rotation);
        const rotation = Number.isFinite(rotationRaw) ? rotationRaw : 0;

        let sweep = data.sweepFlag;
        if (sweep === undefined) sweep = data.sweep;
        sweep = !!sweep;

        let largeArc = data.largeArcFlag;
        if (largeArc === undefined) largeArc = data.largeArc;
        if (largeArc === undefined) {
            const startAngle = Number(data.startAngle);
            const endAngle = Number(data.endAngle);
            if (Number.isFinite(startAngle) && Number.isFinite(endAngle)) {
                let delta;
                if (sweep) {
                    delta = endAngle - startAngle;
                    while (delta < 0) delta += Math.PI * 2;
                } else {
                    delta = startAngle - endAngle;
                    while (delta < 0) delta += Math.PI * 2;
                }
                largeArc = delta > Math.PI;
            } else {
                largeArc = false;
            }
        }

        return { rx, ry, rotation, sweep, largeArc: !!largeArc };
    };

    let sketch = null;
    let startX = null;
    let startY = null;
    let curX = null;
    let curY = null;

    for (const seg of segments) {
        const sx = Number(seg?.start?.x);
        const sy = Number(seg?.start?.y);
        const ex = Number(seg?.end?.x);
        const ey = Number(seg?.end?.y);

        if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(ex) || !Number.isFinite(ey)) {
            continue;
        }

        if (!sketch) {
            sketch = useXY
                ? new Sketcher("XY", [0, 0, applyDepthForXY ? surfaceZ : 0]).movePointerTo(mapPoint(sx, sy))
                : new Sketcher(plane).movePointerTo(mapPoint(sx, sy));
            startX = sx;
            startY = sy;
            curX = sx;
            curY = sy;
        }

        if (!isNear2D(curX, curY, sx, sy)) {
            sketch = sketch.lineTo(mapPoint(sx, sy));
            curX = sx;
            curY = sy;
        }

        if (seg?.type === "arc") {
            const arc = readArcParams(seg);
            if (arc && !isNear2D(curX, curY, ex, ey)) {
                const rot = flipY ? -arc.rotation : arc.rotation;
                const sweep = flipY ? !arc.sweep : arc.sweep;
                sketch = sketch.ellipseTo(mapPoint(ex, ey), arc.rx, arc.ry, rot, arc.largeArc, sweep);
            } else if (!isNear2D(curX, curY, ex, ey)) {
                sketch = sketch.lineTo(mapPoint(ex, ey));
            }
        } else if (!isNear2D(curX, curY, ex, ey)) {
            sketch = sketch.lineTo(mapPoint(ex, ey));
        }

        curX = ex;
        curY = ey;
    }

    if (!sketch) return null;

    const closedByGeometry =
        startX !== null &&
        startY !== null &&
        curX !== null &&
        curY !== null &&
        isNear2D(curX, curY, startX, startY, 1e-3);

    const shouldClose = close && !closedByGeometry;
    return shouldClose ? sketch.close() : sketch.done();
}

function parseProfilePointsFromBitData(bitData) {
    const profileSource = String(bitData?.profileSvg || bitData?.profilePath || "").trim();
    if (!profileSource) return [];

    try {
        const profileContent = profileSource.trimStart().startsWith("<")
            ? profileSource
            : `<path d="${profileSource}"/>`;
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg">${profileContent}</svg>`;

        const loader = new SVGLoader();
        const data = loader.parse(svgString);
        const points = [];

        for (const path of data.paths || []) {
            const shapes = SVGLoader.createShapes(path);
            for (const shape of shapes) {
                const pts = shape.extractPoints(96).shape || [];
                if (pts.length > 2) {
                    points.push(...pts.map((p) => ({ x: p.x, y: p.y })));
                    return points;
                }
            }
        }
    } catch {
        return [];
    }

    return [];
}

function parseProfilePointsFromPathData(pathData) {
    const profileSource = String(pathData || "").trim();
    if (!profileSource) return [];

    try {
        const profileContent = profileSource.trimStart().startsWith("<")
            ? profileSource
            : `<path d="${profileSource}"/>`;
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg">${profileContent}</svg>`;

        const loader = new SVGLoader();
        const data = loader.parse(svgString);
        const points = [];

        for (const path of data.paths || []) {
            const shapes = SVGLoader.createShapes(path);
            for (const shape of shapes) {
                const pts = shape.extractPoints(128).shape || [];
                if (pts.length > 2) {
                    points.push(...pts.map((p) => ({ x: p.x, y: p.y })));
                }
            }
        }

        return points;
    } catch {
        return [];
    }
}

function buildProfileSketchFromPathData(pathData, Sketcher, pathZ = 0, profileOrigin = null) {
    const commands = parseSvgCommands(pathData);
    if (!commands.length) return null;

    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;
    let prevC2X = null;
    let prevC2Y = null;
    let prevQX = null;
    let prevQY = null;
    const cloud = [];

    for (const entry of commands) {
        const up = entry.cmd.toUpperCase();
        const rel = entry.cmd !== up;
        const v = entry.values;

        if (up === "M") {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
            startX = curX;
            startY = curY;
            cloud.push({ x: curX, y: curY });
            prevC2X = prevC2Y = prevQX = prevQY = null;
            continue;
        }

        if (up === "L") {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
            cloud.push({ x: curX, y: curY });
        } else if (up === "H") {
            curX = rel ? curX + v[0] : v[0];
            cloud.push({ x: curX, y: curY });
        } else if (up === "V") {
            curY = rel ? curY + v[0] : v[0];
            cloud.push({ x: curX, y: curY });
        } else if (up === "C") {
            const c1x = rel ? curX + v[0] : v[0];
            const c1y = rel ? curY + v[1] : v[1];
            const c2x = rel ? curX + v[2] : v[2];
            const c2y = rel ? curY + v[3] : v[3];
            curX = rel ? curX + v[4] : v[4];
            curY = rel ? curY + v[5] : v[5];
            cloud.push({ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: curX, y: curY });
            prevC2X = c2x;
            prevC2Y = c2y;
            prevQX = prevQY = null;
        } else if (up === "S") {
            const c1x = prevC2X !== null ? 2 * curX - prevC2X : curX;
            const c1y = prevC2Y !== null ? 2 * curY - prevC2Y : curY;
            const c2x = rel ? curX + v[0] : v[0];
            const c2y = rel ? curY + v[1] : v[1];
            curX = rel ? curX + v[2] : v[2];
            curY = rel ? curY + v[3] : v[3];
            cloud.push({ x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: curX, y: curY });
            prevC2X = c2x;
            prevC2Y = c2y;
            prevQX = prevQY = null;
        } else if (up === "Q") {
            const qx = rel ? curX + v[0] : v[0];
            const qy = rel ? curY + v[1] : v[1];
            curX = rel ? curX + v[2] : v[2];
            curY = rel ? curY + v[3] : v[3];
            cloud.push({ x: qx, y: qy }, { x: curX, y: curY });
            prevQX = qx;
            prevQY = qy;
            prevC2X = prevC2Y = null;
        } else if (up === "T") {
            const qx = prevQX !== null ? 2 * curX - prevQX : curX;
            const qy = prevQY !== null ? 2 * curY - prevQY : curY;
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
            cloud.push({ x: qx, y: qy }, { x: curX, y: curY });
            prevQX = qx;
            prevQY = qy;
            prevC2X = prevC2Y = null;
        } else if (up === "A") {
            curX = rel ? curX + v[5] : v[5];
            curY = rel ? curY + v[6] : v[6];
            cloud.push({ x: curX, y: curY });
            prevC2X = prevC2Y = prevQX = prevQY = null;
        } else if (up === "Z") {
            curX = startX;
            curY = startY;
            cloud.push({ x: curX, y: curY });
            prevC2X = prevC2Y = prevQX = prevQY = null;
        }
    }

    if (!cloud.length) return null;

    const sampledCloud = parseProfilePointsFromPathData(pathData);
    const boundsCloud = sampledCloud.length ? sampledCloud : cloud;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of boundsCloud) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }
    const cx = (minX + maxX) / 2;
    const anchorY = minY;
    // Map SVG profile into XZ plane for XY sweep path:
    // - Mirror only across vertical centerline (X axis in profile space)
    //   so asymmetric profiles are left/right reflected around center.
    // - Preserve profile depth direction from SVG y into local Z.
    // Top-center of profile is fixed at local [0,0] (spine anchor).
    const toXZ = (x, y) => [cx - x, y - anchorY];

    let sketch = null;
    curX = 0;
    curY = 0;
    startX = 0;
    startY = 0;
    prevC2X = prevC2Y = prevQX = prevQY = null;

    for (const entry of commands) {
        const raw = entry.cmd;
        const up = raw.toUpperCase();
        const rel = raw !== up;
        const v = entry.values;

        if (up === "M") {
            const x = rel ? curX + v[0] : v[0];
            const y = rel ? curY + v[1] : v[1];
            const origin = Array.isArray(profileOrigin) && profileOrigin.length === 3
                ? profileOrigin
                : [0, 0, pathZ];
            sketch = new Sketcher("XZ", origin).movePointerTo(toXZ(x, y));
            curX = x;
            curY = y;
            startX = x;
            startY = y;
            prevC2X = prevC2Y = prevQX = prevQY = null;
            continue;
        }

        if (!sketch) continue;

        if (up === "L") {
            const x = rel ? curX + v[0] : v[0];
            const y = rel ? curY + v[1] : v[1];
            sketch = sketch.lineTo(toXZ(x, y));
            curX = x;
            curY = y;
        } else if (up === "H") {
            const x = rel ? curX + v[0] : v[0];
            sketch = sketch.lineTo(toXZ(x, curY));
            curX = x;
        } else if (up === "V") {
            const y = rel ? curY + v[0] : v[0];
            sketch = sketch.lineTo(toXZ(curX, y));
            curY = y;
        } else if (up === "C") {
            const c1x = rel ? curX + v[0] : v[0];
            const c1y = rel ? curY + v[1] : v[1];
            const c2x = rel ? curX + v[2] : v[2];
            const c2y = rel ? curY + v[3] : v[3];
            const x = rel ? curX + v[4] : v[4];
            const y = rel ? curY + v[5] : v[5];
            sketch = sketch.cubicBezierCurveTo(toXZ(x, y), toXZ(c1x, c1y), toXZ(c2x, c2y));
            prevC2X = c2x;
            prevC2Y = c2y;
            prevQX = prevQY = null;
            curX = x;
            curY = y;
        } else if (up === "S") {
            const c1x = prevC2X !== null ? 2 * curX - prevC2X : curX;
            const c1y = prevC2Y !== null ? 2 * curY - prevC2Y : curY;
            const c2x = rel ? curX + v[0] : v[0];
            const c2y = rel ? curY + v[1] : v[1];
            const x = rel ? curX + v[2] : v[2];
            const y = rel ? curY + v[3] : v[3];
            sketch = sketch.cubicBezierCurveTo(toXZ(x, y), toXZ(c1x, c1y), toXZ(c2x, c2y));
            prevC2X = c2x;
            prevC2Y = c2y;
            prevQX = prevQY = null;
            curX = x;
            curY = y;
        } else if (up === "Q") {
            const qx = rel ? curX + v[0] : v[0];
            const qy = rel ? curY + v[1] : v[1];
            const x = rel ? curX + v[2] : v[2];
            const y = rel ? curY + v[3] : v[3];
            sketch = sketch.quadraticBezierCurveTo(toXZ(x, y), toXZ(qx, qy));
            prevQX = qx;
            prevQY = qy;
            prevC2X = prevC2Y = null;
            curX = x;
            curY = y;
        } else if (up === "T") {
            const qx = prevQX !== null ? 2 * curX - prevQX : curX;
            const qy = prevQY !== null ? 2 * curY - prevQY : curY;
            const x = rel ? curX + v[0] : v[0];
            const y = rel ? curY + v[1] : v[1];
            sketch = sketch.quadraticBezierCurveTo(toXZ(x, y), toXZ(qx, qy));
            prevQX = qx;
            prevQY = qy;
            prevC2X = prevC2Y = null;
            curX = x;
            curY = y;
        } else if (up === "A") {
            const rx = v[0];
            const ry = v[1];
            // Profile mapping mirrors X (x -> cx - x), so arc handedness flips.
            const rot = -v[2];
            const largeArc = !!v[3];
            const sweep = !v[4];
            const x = rel ? curX + v[5] : v[5];
            const y = rel ? curY + v[6] : v[6];
            sketch = sketch.ellipseTo(toXZ(x, y), rx, ry, rot, largeArc, sweep);
            curX = x;
            curY = y;
            prevC2X = prevC2Y = prevQX = prevQY = null;
        } else if (up === "Z") {
            curX = startX;
            curY = startY;
            prevC2X = prevC2Y = prevQX = prevQY = null;
        }
    }

    return sketch ? sketch.close() : null;
}

function getFirstPathPointInWorldXY(pathData, bboxRef, panelAnchor = "top-left", depth = 0, panelThickness = appConfig.panel.thickness) {
    const commands = parseSvgCommands(pathData);
    if (!commands.length || !bboxRef) return null;

    let curX = 0;
    let curY = 0;
    let start = null;

    for (const entry of commands) {
        const up = entry.cmd.toUpperCase();
        const rel = entry.cmd !== up;
        const v = entry.values;

        if (up === "M" && v.length >= 2) {
            const x = rel ? curX + v[0] : v[0];
            const y = rel ? curY + v[1] : v[1];
            start = { x, y };
            break;
        }
    }

    if (!start) return null;

    const centerX = bboxRef.x + bboxRef.width / 2;
    const topY = bboxRef.y;
    const bottomY = bboxRef.y + bboxRef.height;
    const flipY = panelAnchor !== "bottom-left";

    const worldX = start.x - centerX;
    const worldY = flipY ? (bottomY - start.y) : (start.y - topY);

    const halfThickness = panelThickness / 2;
    const worldZ = panelAnchor === "top-left"
        ? halfThickness - depth
        : panelAnchor === "bottom-left"
            ? -halfThickness - depth
            : 0;

    return [worldX, worldY, worldZ];
}

function getFirstSegmentPointInWorldXY(segments, bboxRef, panelAnchor = "top-left", depth = 0, panelThickness = appConfig.panel.thickness) {
    if (!Array.isArray(segments) || segments.length === 0 || !bboxRef) return null;

    let first = null;
    for (const seg of segments) {
        const x = Number(seg?.start?.x);
        const y = Number(seg?.start?.y);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            first = { x, y };
            break;
        }
    }
    if (!first) return null;

    const centerX = bboxRef.x + bboxRef.width / 2;
    const topY = bboxRef.y;
    const bottomY = bboxRef.y + bboxRef.height;
    const flipY = panelAnchor !== "bottom-left";

    const worldX = first.x - centerX;
    const worldY = flipY ? (bottomY - first.y) : (first.y - topY);

    const halfThickness = panelThickness / 2;
    const worldZ = panelAnchor === "top-left"
        ? halfThickness - depth
        : panelAnchor === "bottom-left"
            ? -halfThickness - depth
            : 0;

    return [worldX, worldY, worldZ];
}

// ---------------------------------------------------------------------------
// ReplicadCanvasModule
// ---------------------------------------------------------------------------

export default class ReplicadCanvasModule extends BaseModule {
    constructor() {
        super("replicad");
        this.log = LoggerFactory.createLogger("ReplicadCanvasModule");

        // Three.js rendering state (per-instance, not globals)
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container = null;
        this.animFrameId = null;
        this.resizeObserver = null;
        this.viewCube = null;
        this.modelGroup = null;

        // Replicad shape cache
        this.panelShape = null;
        this.bitShapes = [];   // [{bit, shape, operation}]
        this.currentShape = null;

        // UI state
        this._enabled = false;
        this._showPart = false;
        this.cameraFittedOnce = false;
        this.displayMode = "shaded";
        this._displayModeListener = null;
        this._updateInFlight = false;
        this._pendingUpdate = false;

        this.log.info("ReplicadCanvasModule created");
    }

    // -----------------------------------------------------------------------
    // BaseModule lifecycle
    // -----------------------------------------------------------------------

    /**
     * Called by app.initialize() – must be named initialize() per BaseModule contract.
     */
    async initialize() {
        this.log.info("Initializing ReplicadCanvasModule...");

        // Find or create the DOM container
        this.container = document.getElementById("replicad-canvas-container");
        if (!this.container) {
            this.container = document.createElement("div");
            this.container.id = "replicad-canvas-container";
            this.container.style.cssText =
                "position:absolute;top:0;left:0;width:100%;height:100%;display:none;pointer-events:none;";
            const threeContainer = document.getElementById("three-canvas-container");
            if (threeContainer?.parentNode) {
                threeContainer.parentNode.insertBefore(this.container, threeContainer);
            } else {
                document.body.appendChild(this.container);
            }
        }

        this._setupEventListeners();
        this.log.info("ReplicadCanvasModule initialized (lazy WASM)");
    }

    // -----------------------------------------------------------------------
    // WASM lazy init
    // -----------------------------------------------------------------------

    /**
     * Loads replicad + opencascade WASM on first activation.
     * Safe to call multiple times – returns the same Promise.
     * @returns {Promise<void>}
     */
    async _lazyInit() {
        if (_replicadReady) return;
        if (_initPromise) return _initPromise;

        _initPromise = this._doInit();
        return _initPromise;
    }

    async _doInit() {
        this.log.info("Loading Replicad WASM (first use)…");
        try {
            // Import replicad first (this is the logic wrapper)
            _replicad = await import("replicad");
            this.log.debug("Replicad module loaded");

            // Import opencascade WASM factory
            const ocMod = await import("replicad-opencascadejs");
            const ocFactory = ocMod.default;
            this.log.debug("opencascadejs module loaded");

            // Initialize OpenCASCADE
            this.log.info("Initializing OpenCASCADE…");
            _oc = await ocFactory();
            _replicad.setOC(_oc);

            _replicadReady = true;
            this.log.info("Replicad ready. OCC version:", _oc?.OCCTVersion ?? "unknown");
        } catch (err) {
            _initPromise = null; // allow retry
            this.log.error("Failed to load Replicad WASM:", err);
            
            // Provide helpful error message
            if (err.message.includes("WebAssembly")) {
                this.log.error(
                    "WASM Error: This usually means the WASM file couldn't be found or is corrupted. " +
                    "Try: (1) Hard refresh (Ctrl+Shift+R), (2) Restart dev server, (3) Run 'npm run build'"
                );
            }
            throw err;
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /** Enable / disable this canvas (called from UI toggle). */
    setEnabled(enabled) {
        this.log.debug(`setEnabled(${enabled}) called`);
        if (this._enabled === enabled) return;
        this._enabled = enabled;

        if (enabled) {
            window._replicadModule = this; // expose for STEP export from ThreeModule
            this.container.style.display = "block";
            this.container.style.pointerEvents = "auto";
            this.cameraFittedOnce = false;
            this._ensureRenderer();
            this._resumeAnimation();
            this.updateView();
        } else {
            this.container.style.display = "none";
            this.container.style.pointerEvents = "none";
            this._pauseAnimation();
        }
        this.log.info("ReplicadCanvasModule enabled:", enabled);
    }

    isActive() {
        return this._enabled;
    }

    /** Toggle Part view (CSG boolean cut) – mirrors ThreeModule showPart behaviour. */
    setShowPart(show) {
        if (this._showPart === show) return;
        this._showPart = show;
        if (this._enabled) this.updateView();
    }

    /**
     * Main update – called whenever 2D state changes.
     * @param {string[]|null} changedBitIds - optional filter (ignored, full rebuild for now)
     */
    async updateView(changedBitIds = null) {
        if (!this._enabled) return;
        if (this._updateInFlight) {
            this._pendingUpdate = true;
            return;
        }

        this._updateInFlight = true;

        try {
            await this._lazyInit();
            this._ensureRenderer();

            const panelW = appConfig.panel.width;
            const panelH = appConfig.panel.height;
            const panelT = appConfig.panel.thickness;
            const panelAnchor = appConfig.panel.anchor;
            const bits = window.bitsOnCanvas || [];
            const offsetContours = window.offsetContours || [];

            // Compute the true panel bounding-box from the live SVG element so
            // that path coordinate transforms (SVG canvas space → Replicad XZ)
            // match exactly what ThreeModule does.
            const partFrontPath = window.partFront?.getAttribute("d") || "";
            const sampledBBox = computePathBBox(partFrontPath);
            // Fallback: assume panel is drawn with (0,0) at top-left in Paper.js
            this._bboxRef = sampledBBox || {
                x: 0, y: -panelH, width: panelW, height: panelH
            };

            this.log.debug("ReplicadCanvasModule.updateView", {
                panel: `${panelW}×${panelH}×${panelT}`,
                bits: bits.length,
                contours: offsetContours.length,
                bboxRef: this._bboxRef,
            });

            this.panelShape = this._buildPanel(panelW, panelH, panelT, this._bboxRef);
            if (!this.panelShape) return;

            this.bitShapes = this._buildAllBits(
                bits,
                offsetContours,
                this._bboxRef,
                panelW,
                panelH,
                panelT,
                panelAnchor,
            );

            if (this._showPart && this.bitShapes.length > 0) {
                this._applyCSG();
            } else {
                this.currentShape = this.panelShape;
                this._renderPanelAndPaths(bits, offsetContours, this._bboxRef, panelAnchor);
            }
        } catch (err) {
            this.log.error("updateView failed:", err);
        } finally {
            this._updateInFlight = false;
            if (this._pendingUpdate && this._enabled) {
                this._pendingUpdate = false;
                this.updateView();
            }
        }
    }

    // -----------------------------------------------------------------------
    // Panel shape
    // -----------------------------------------------------------------------

    _buildPanel(w, h, thickness, bboxRef) {
        if (!_replicadReady) {
            this.log.warn("ReplicadCanvasModule: WASM not ready");
            return null;
        }
        try {
            // Get the Sketcher constructor
            const { Sketcher } = _replicad;
            if (!Sketcher) {
                throw new Error("Sketcher class not found in replicad module");
            }
            
            // Try to use the current part front contour from window.partFront
            // This is the SVG panel shape with any custom edits/cuts
            let sketch = null;
            
            if (window.partFront) {
                try {
                    const partFrontPath = String(window.partFront?.getAttribute("d") ?? "").trim();
                    if (partFrontPath && bboxRef) {
                        this.log.debug("Using custom partFront SVG for panel shape");
                        sketch = buildSketchFromSvgPathCommands(
                            partFrontPath,
                            bboxRef,
                            Sketcher,
                            { close: true, plane: "XY" }
                        );
                    }
                } catch (err) {
                    this.log.warn("Failed to import custom partFront, falling back to rectangle:", err.message);
                    sketch = null;
                }
            }
            
            // Fallback to simple rectangle if custom shape not available.
            // Use XY plane so the panel front face matches the ThreeModule reference.
            if (!sketch) {
                this.log.debug("Using simple rectangle for panel shape");
                sketch = new Sketcher("XY")
                    .movePointerTo([-w / 2, 0])
                    .hLine(w)
                    .vLine(h)
                    .hLine(-w)
                    .close();
            }
            
            this.log.debug("Panel sketch created, extruding by:", thickness);
            const shape = sketch.extrude(thickness).translate(0, 0, -thickness / 2);
            this.log.debug("Panel shape extruded successfully");
            return shape;
        } catch (err) {
            this.log.error("_buildPanel failed:", err.message);
            if (err.stack) {
                this.log.debug("Stack trace:", err.stack.split("\n").slice(0, 5).join("\n"));
            }
            return null;
        }
    }

    // -----------------------------------------------------------------------
    // Bit shapes
    // -----------------------------------------------------------------------

    _buildAllBits(bits, offsetContours, bboxRef, panelW, panelH, panelT, panelAnchor) {
        const results = [];
        for (let i = 0; i < bits.length; i++) {
            const bit = bits[i];
            try {
                // Contours for this specific bit only
                const contours = offsetContours.filter((c) => c.bitIndex === i);
                if (!contours.length) continue;

                const op = (bit.operation || "AL").toUpperCase();
                let shape;
                if (op === "VC") {
                    shape = this._buildVC(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor);
                } else if (op === "PO") {
                    shape = this._buildPO(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor);
                } else {
                    shape = this._buildAL(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor);
                }
                if (shape) results.push({ bit, shape, operation: op });
            } catch (err) {
                this.log.error(`_buildAllBits[${i}] (${bit.name}) failed:`, err);
            }
        }
        return results;
    }

    _selectStandardContour(contours) {
        let contour = contours.find((c) => c.for3D === true);
        if (!contour) contour = contours.find((c) => c.pass !== 0);
        if (!contour) contour = contours[0];
        return contour || null;
    }

    _getContourPathData(contour) {
        if (!contour) return "";
        if (contour.pathData) return pickPrimarySubpath(String(contour.pathData));
        if (contour.element?.getAttribute) {
            return pickPrimarySubpath(String(contour.element.getAttribute("d") || ""));
        }
        return "";
    }

    _getContourSegments(contour) {
        const contours = Array.isArray(contour?.offsetEngineContours)
            ? contour.offsetEngineContours
            : [];
        if (!contours.length) return null;

        const candidates = contours.filter((entry) =>
            Array.isArray(entry?.segments) && entry.segments.length > 0
        );
        if (!candidates.length) return null;

        let best = candidates[0];
        let bestClosed = !!best?.closed;
        let bestArea = Math.abs(Number(best?.area) || 0);
        const bboxArea = (entry) => {
            const w = Number(entry?.bbox?.width);
            const h = Number(entry?.bbox?.height);
            if (!Number.isFinite(w) || !Number.isFinite(h)) return 0;
            return Math.max(0, w * h);
        };
        let bestBBoxArea = bboxArea(best);

        for (const entry of candidates.slice(1)) {
            const closed = !!entry?.closed;
            const area = Math.abs(Number(entry?.area) || 0);
            const box = bboxArea(entry);

            const better = (closed && !bestClosed)
                || (closed === bestClosed && area > bestArea)
                || (closed === bestClosed && area === bestArea && box > bestBBoxArea);

            if (better) {
                best = entry;
                bestClosed = closed;
                bestArea = area;
                bestBBoxArea = box;
            }
        }

        return best?.segments || null;
    }

    _getSurfaceDepthZ(depth, panelAnchor = "top-left", panelThickness = appConfig.panel.thickness) {
        const halfThickness = panelThickness / 2;
        if (panelAnchor === "top-left") return halfThickness - depth;
        if (panelAnchor === "bottom-left") return -halfThickness - depth;
        return 0;
    }

    _buildProfileWire(bitData, pathZ, profileOrigin = null) {
        const { Sketcher } = _replicad;
        const profilePath = String(bitData?.profilePath || "").trim();
        const origin = Array.isArray(profileOrigin) && profileOrigin.length === 3
            ? profileOrigin
            : [0, 0, pathZ];

        if (profilePath) {
            const profileSketch = buildProfileSketchFromPathData(profilePath, Sketcher, pathZ, origin);
            if (profileSketch) {
                return profileSketch.wire;
            }
        }

        const points = parseProfilePointsFromBitData(bitData);
        if (!points.length) {
            const radius = (bitData?.diameter ?? 10) / 2;
            // Two-arc circle: tip at [0,0], center at [0, radius].
            // Profile origin is pinned to the spine start, so tip stays on the toolpath.
            const prof = new Sketcher("XZ", origin)
                .movePointerTo([0, 0])
                .threePointsArcTo([0, 2 * radius], [-radius, radius])
                .threePointsArcTo([0, 0], [radius, radius]);
            return prof.done().wire;
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const p of points) {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }

        const cx = (minX + maxX) / 2;
        const anchorY = minY;
        // Mirror around X so profile points into panel, bottom-center at [0,0].
        const toXZ = (p) => [cx - p.x, p.y - anchorY];

        let profile = new Sketcher("XZ", origin).movePointerTo(toXZ(points[0]));
        for (let i = 1; i < points.length; i++) {
            profile = profile.lineTo(toXZ(points[i]));
        }

        return profile.close().wire;
    }

    /**
     * Build a single round-profile sweep cutter from a contour path.
     * Handles AL and PO operations.
     * @param {number} profileRadius - radius of the circular cross-section
     * @param {number} depth         - depth of cut (Y position in Paper.js = Z in OCCT)
     * @param {string} pathData      - SVG path in Paper.js coordinates
     * @param {number} panelW
     * @param {number} panelH
     * @param {'round'|'miter'} transitionMode
     * @returns {object|null} Replicad solid
     */
    _sweepRoundProfile(bit, depth, pathData, bboxRef, panelAnchor, panelT, transitionMode = "round", contour = null) {
        if (!_replicadReady || !pathData) return null;
        const { Sketcher, genericSweep } = _replicad;
        try {
            const normalizedPathData = pickPrimarySubpath(pathData);
            const normalizedSummary = summarizeSvgPath(normalizedPathData);
            const contourSegments = this._getContourSegments(contour);
            const traceSweep = Boolean(window?.__replicadSweepTrace);
            if (traceSweep) {
                const tracePayload = {
                    bit: bit?.name || bit?.bitData?.name || "unknown",
                    depth,
                    transitionMode,
                    sourceSummary: summarizeSvgPath(pathData),
                    normalizedSummary,
                    normalizedChanged: String(pathData || "") !== String(normalizedPathData || ""),
                    hasSegmentSpine: Array.isArray(contourSegments) && contourSegments.length > 0,
                };
                this.log.info("sweep:spine", tracePayload);
                console.info("[ReplicadSweepTrace] sweep:spine", tracePayload);
            }

            const pathSketch = Array.isArray(contourSegments) && contourSegments.length > 0
                ? buildSketchFromOffsetSegments(
                    contourSegments,
                    bboxRef,
                    Sketcher,
                    {
                        close: true,
                        plane: "XY",
                        panelAnchor,
                        depth,
                        panelThickness: panelT,
                        applyDepthForXY: true,
                    }
                )
                : buildSketchFromSvgPathCommands(
                    normalizedPathData,
                    bboxRef,
                    Sketcher,
                    {
                        close: true,
                        plane: "XY",
                        panelAnchor,
                        depth,
                        panelThickness: panelT,
                        applyDepthForXY: true,
                    }
                );
            if (!pathSketch) return null;

            if (traceSweep) {
                console.info("[ReplicadSweepTrace] sweep:spine-mode", {
                    bit: bit?.name || bit?.bitData?.name || "unknown",
                    mode: Array.isArray(contourSegments) && contourSegments.length > 0
                        ? "offset-segments"
                        : "commands-analytic",
                    sampleStep: null,
                });
            }

            const pathZ = this._getSurfaceDepthZ(depth, panelAnchor, panelT);
            const profileOrigin = getFirstSegmentPointInWorldXY(contourSegments, bboxRef, panelAnchor, depth, panelT)
                ?? getFirstPathPointInWorldXY(normalizedPathData, bboxRef, panelAnchor, depth, panelT)
                ?? [0, 0, pathZ];
            const profileWire = this._buildProfileWire(bit?.bitData, pathZ, profileOrigin);
            const replicadTransition = transitionMode;
            const sweepOpts = {
                forceProfileSpineOthogonality: true,
                transitionMode: replicadTransition,
            };

            const result = genericSweep(profileWire, pathSketch.wire, sweepOpts, false);
            return result;
        } catch (err) {
            this.log.error(`_sweepRoundProfile failed (bit=${bit?.name || bit?.bitData?.name || "unknown"}, d=${depth}):`, err);
            return null;
        }
    }

    /**
     * AL (Along/Profile) – simple round sweep.
     */
    _buildAL(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor) {
        const depth = bit.y ?? 0;
        const contour = this._selectStandardContour(contours);
        const pathData = this._getContourPathData(contour);
        return this._sweepRoundProfile(bit, depth, pathData, bboxRef, panelAnchor, panelT, "round", contour);
    }

    /**
     * PO (Pocketing) – main contour sweep.
     * Phantom contour handling can be added in a follow-up phase.
     */
    _buildPO(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor) {
        const depth = bit.y ?? 0;
        // Prefer the explicitly-marked main contour, fall back to first
        const mainContour = contours.find((c) => c.isPOMain) ?? contours[0];
        const pathData = this._getContourPathData(mainContour);
        return this._sweepRoundProfile(bit, depth, pathData, bboxRef, panelAnchor, panelT, "round", mainContour);
    }

    /**
     * VC (V-Carve) – V-shaped profile sweep, miter transitions.
     * Each pass builds one cutter; they are fused into a single solid.
     */
    _buildVC(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor) {
        const angle = bit.bitData?.angle ?? 90;
        const diameter = bit.bitData?.diameter ?? 10;
        const halfAngle = (angle * Math.PI) / 180 / 2;
        const halfBase = diameter / 2;
        const vcHeight = halfBase / Math.tan(halfAngle);

        if (!_replicadReady) return null;
        const { Sketcher, genericSweep } = _replicad;

        let combined = null;

        for (const contour of contours) {
            const contourPathData = this._getContourPathData(contour);
            if (!contourPathData) continue;
            const depth = contour.depth ?? (bit.y ?? 0);
            // Scale the V-tip to the actual cut depth
            const scaledHalfBase = depth * Math.tan(halfAngle);

            try {
                const pathSketch = buildSketchFromSvgPathCommands(
                    contourPathData,
                    bboxRef,
                    Sketcher,
                    {
                        close: true,
                        plane: "XY",
                        panelAnchor,
                        depth,
                        panelThickness: panelT,
                        applyDepthForXY: true,
                    }
                );
                if (!pathSketch) continue;

                const pathZ = this._getSurfaceDepthZ(depth, panelAnchor, panelT);
                const profileOrigin = getFirstPathPointInWorldXY(contourPathData, bboxRef, panelAnchor, depth, panelT)
                    ?? [0, 0, pathZ];
                // Tip is pinned to spine start; shoulders are mirrored around X toward panel.
                const profile = new Sketcher("XZ", profileOrigin)
                    .movePointerTo([0, 0])
                    .lineTo([-scaledHalfBase, -depth])
                    .lineTo([scaledHalfBase, -depth])
                    .close();

                const cutter = genericSweep(profile.wire, pathSketch.wire, { transitionMode: "right" });

                combined = combined ? combined.fuse(cutter) : cutter;
            } catch (err) {
                this.log.warn(`VC pass contour failed:`, err);
            }
        }

        return combined;
    }

    // -----------------------------------------------------------------------
    // CSG
    // -----------------------------------------------------------------------

    _applyCSG() {
        if (!this.panelShape) return;
        try {
            let result = this.panelShape;
            for (const { shape } of this.bitShapes) {
                if (!shape) continue;
                result = result.cut(shape);
            }
            this.currentShape = result;
            this._renderShape(result);
            this.log.info("CSG complete", { cutters: this.bitShapes.length });
        } catch (err) {
            this.log.error("CSG failed:", err);
            this._renderShape(this.panelShape);
        }
    }

    // -----------------------------------------------------------------------
    // Three.js rendering
    // -----------------------------------------------------------------------

    _ensureRenderer() {
        if (this.renderer) return;

        const rect = this.container.getBoundingClientRect();
        const w = rect.width || 800;
        const h = rect.height || 600;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0ede8);

        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50000);
        this.camera.position.set(0, 300, 600);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.viewCube = new ViewCubeGizmo(this.camera, this.renderer);
        this._bindDisplayModeSync();

        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        const dir = new THREE.DirectionalLight(0xffffff, 0.9);
        dir.position.set(200, 400, 300);
        this.scene.add(ambient, dir);
        this.modelGroup = new THREE.Group();
        this.scene.add(this.modelGroup);

        // Respond to container resize
        this.resizeObserver = new ResizeObserver(() => {
            const r = this.container.getBoundingClientRect();
            this.renderer.setSize(r.width, r.height);
            this.camera.aspect = r.width / r.height;
            this.camera.updateProjectionMatrix();
        });
        this.resizeObserver.observe(this.container);
    }

    /**
     * Tessellate a Replicad solid and add it to the Three.js scene.
     * @param {object} shape - Replicad solid
     */
    _renderShape(shape) {
        if (!shape || !this.renderer) return;
        this._clearModelGroup();

        try {
            this._addShapeMesh(shape, 0xc8a97a, this.modelGroup);
            this._applyRenderStyle(this.displayMode);
            this._maybeFitCameraToSceneMeshes();

            this.log.debug("Shape rendered");
        } catch (err) {
            this.log.error("_renderShape failed:", err);
        }
    }

    _renderPanelAndPaths(bits, offsetContours, bboxRef, panelAnchor) {
        if (!this.renderer || !this.panelShape) return;

        this._clearModelGroup();

        try {
            this._addShapeMesh(this.panelShape, 0xc8a97a, this.modelGroup);

            // Keep cutter sweeps visible when Part/CSG is disabled so sweep geometry
            // can be visually validated before boolean subtraction.
            for (const entry of this.bitShapes || []) {
                if (!entry?.shape) continue;
                const previewColor = entry?.bit?.color || "#acbe50";
                this._addShapeMesh(entry.shape, previewColor, this.modelGroup, {
                    transparent: true,
                    opacity: 0.42,
                    depthWrite: false,
                    roughness: 0.45,
                    metalness: 0.12,
                    isSolidFace: true,
                    isCutterPreview: true,
                });
            }

            for (const contour of offsetContours || []) {
                if (!contour?.pathData) continue;
                const bit = bits?.[contour.bitIndex];
                const pathColor = bit?.color || "#808080";
                this._addWirePath(contour.pathData, bboxRef, pathColor, panelAnchor, bit?.y ?? 0, true);
            }

            this._applyRenderStyle(this.displayMode);

            this._maybeFitCameraToSceneMeshes();
            this.log.debug("Panel+paths rendered", { contours: (offsetContours || []).length });
        } catch (err) {
            this.log.error("_renderPanelAndPaths failed:", err);
            this._renderShape(this.panelShape);
        }
    }

    _clearModelGroup() {
        if (!this.modelGroup) return;
        for (const child of [...this.modelGroup.children]) {
            child.traverse?.((node) => {
                if (node.geometry) node.geometry.dispose();
                if (node.material) node.material.dispose();
            });
            this.modelGroup.remove(child);
        }
    }

    _addShapeMesh(shape, color, parentGroup = this.scene, options = {}) {
        const {
            transparent = false,
            opacity = 1,
            depthWrite = true,
            roughness = 0.6,
            metalness = 0.05,
            colorWrite = true,
            isSolidFace = true,
            isCutterPreview = false,
        } = options;

        const meshData = shape.mesh({ tolerance: 0.1, angularTolerance: 10 });
        if (!meshData?.vertices) {
            this.log.warn("No mesh data from Replicad shape");
            return null;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(meshData.vertices), 3));
        if (meshData.normals) {
            geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(meshData.normals), 3));
        }
        if (meshData.triangles) {
            geo.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.triangles), 1));
        }
        if (!meshData.normals) geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness,
            side: THREE.DoubleSide,
            transparent,
            opacity,
            depthWrite,
            colorWrite,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.isBrepSolidFace = isSolidFace;
        mesh.userData.isCutterPreview = isCutterPreview;
        mesh.userData.previewOpacity = opacity;
        parentGroup.add(mesh);
        return mesh;
    }

    _addWirePath(pathData, bboxRef, color = 0x2b4c7e, panelAnchor = "top-left", depth = 0, closed = true) {
        const points2D = sampleSvgPathPoints(pathData, 2);
        if (points2D.length < 2) return null;

        const centerX = bboxRef.x + bboxRef.width / 2;
        const relativeToTop = (y) => y - bboxRef.y;
        const yToWorld = (y) => {
            if (panelAnchor === "bottom-left") {
                return relativeToTop(y);
            }
            return bboxRef.height - relativeToTop(y);
        };
        const halfThickness = appConfig.panel.thickness / 2;
        const surfaceZ = panelAnchor === "top-left"
            ? halfThickness - depth
            : panelAnchor === "bottom-left"
                ? -halfThickness - depth
                : 0;
        const positions = [];
        for (const p of points2D) {
            positions.push(p.x - centerX, yToWorld(p.y), surfaceZ);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color,
            linewidth: 1,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
        });
        const line = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
        line.renderOrder = 10;
        line.userData.isWirePath = true;
        this.modelGroup.add(line);
        return line;
    }

    _bindDisplayModeSync() {
        if (this._displayModeListener) return;

        const readMode = () => {
            const select = document.querySelector('select[title="Display Mode"]');
            const mode = select?.value || "shaded";
            if (mode !== this.displayMode) {
                this.displayMode = mode;
                this._applyRenderStyle(this.displayMode);
            }
        };

        this._displayModeListener = (event) => {
            const target = event?.target;
            if (!target?.matches?.('select[title="Display Mode"]')) return;
            this.displayMode = target.value || "shaded";
            this._applyRenderStyle(this.displayMode);
        };

        document.addEventListener("change", this._displayModeListener, true);
        readMode();
    }

    _clearEdgeOverlays() {
        if (!this.modelGroup) return;

        const overlays = [];
        this.modelGroup.traverse((node) => {
            if (node.userData?.isBrepEdgeOverlay) overlays.push(node);
        });

        for (const node of overlays) {
            if (node.geometry) node.geometry.dispose();
            if (Array.isArray(node.material)) {
                for (const m of node.material) m?.dispose?.();
            } else {
                node.material?.dispose?.();
            }
            if (node.parent) node.parent.remove(node);
        }
    }

    _addEdgeOverlay(mesh, mode) {
        if (!mesh?.isMesh || !mesh.geometry) return;

        const thresholdAngle = mode === "shadedEdges" ? 1 : 15;
        const edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);

        if (mode === "edges") {
            const dashed = new THREE.LineSegments(
                edgeGeometry.clone(),
                new THREE.LineDashedMaterial({
                    color: 0x333333,
                    dashSize: 3,
                    gapSize: 2,
                    transparent: true,
                    opacity: 0.4,
                    depthTest: false,
                    depthWrite: false,
                })
            );
            dashed.computeLineDistances();
            dashed.renderOrder = 2;
            dashed.userData.isBrepEdgeOverlay = true;

            const visible = new THREE.LineSegments(
                edgeGeometry,
                new THREE.LineBasicMaterial({
                    color: 0x333333,
                    transparent: true,
                    opacity: 0.85,
                    depthTest: true,
                    depthWrite: false,
                })
            );
            visible.renderOrder = 3;
            visible.userData.isBrepEdgeOverlay = true;

            mesh.add(dashed);
            mesh.add(visible);
            return;
        }

        const lines = new THREE.LineSegments(
            edgeGeometry,
            new THREE.LineBasicMaterial({
                color: 0x333333,
                transparent: false,
                opacity: 1,
                depthTest: true,
                depthWrite: false,
            })
        );
        lines.renderOrder = 3;
        lines.userData.isBrepEdgeOverlay = true;
        mesh.add(lines);
    }

    _applyRenderStyle(mode = "shaded") {
        if (!this.modelGroup) return;

        this._clearEdgeOverlays();

        const showFaces = mode !== "wireframe";
        const showEdges = mode === "shadedEdges" || mode === "shadedBEdges" || mode === "wireframe" || mode === "edges";

        this.modelGroup.traverse((node) => {
            if (node.userData?.isWirePath) {
                node.visible = true;
                return;
            }

            if (!node.isMesh || node.userData?.isBrepEdgeOverlay) return;

            if (node.material) {
                if (showFaces) {
                    if (node.userData?.isCutterPreview) {
                        node.material.transparent = true;
                        node.material.opacity = node.userData.previewOpacity ?? 0.42;
                        node.material.depthWrite = false;
                        node.material.colorWrite = true;
                    } else {
                        node.material.transparent = false;
                        node.material.opacity = 1;
                        node.material.depthWrite = true;
                        node.material.colorWrite = true;
                    }
                } else {
                    node.material.transparent = true;
                    node.material.opacity = 0;
                    node.material.depthWrite = false;
                    node.material.colorWrite = false;
                }
                node.material.needsUpdate = true;
            }

            if (showEdges) {
                this._addEdgeOverlay(node, mode);
            }
        });
    }

    _maybeFitCameraToSceneMeshes() {
        if (this.cameraFittedOnce || !this.modelGroup) return;

        const worldBox = new THREE.Box3();
        worldBox.expandByObject(this.modelGroup);
        if (worldBox.isEmpty()) return;

        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        worldBox.getCenter(center);
        worldBox.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z, 1);
        const dist = maxDim * 1.8;

        this.camera.position.set(center.x + dist * 0.5, center.y + dist * 0.5, center.z + dist);
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
        this.cameraFittedOnce = true;
    }

    _animate() {
        if (!this._enabled) return;
        this.animFrameId = requestAnimationFrame(() => this._animate());
        this.controls?.update();
        this.renderer?.render(this.scene, this.camera);
        this.viewCube?.update();
    }

    _resumeAnimation() {
        if (this.animFrameId) return;
        this._animate();
    }

    _pauseAnimation() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    // -----------------------------------------------------------------------
    // Event listeners
    // -----------------------------------------------------------------------

    _setupEventListeners() {
        // setEnabled() is called directly from script.js switchView().
        // Only listen for dedicated events and data-change events.
        eventBus.on("replicad:toggle", (enabled) => {
            this.setEnabled(enabled);
        });

        eventBus.on("part:toggle", (show) => {
            this.setShowPart(show);
        });

        eventBus.on("bits:updated", () => {
            if (this._enabled) this.updateView();
        });

        eventBus.on("canvas:updated", () => {
            if (this._enabled) this.updateView();
        });
    }

    // -----------------------------------------------------------------------
    // Export
    // -----------------------------------------------------------------------

    /**
     * Export current shape to STEP blob.
     * @returns {Blob|null}
     */
    exportSTEP() {
        if (!this.currentShape) {
            this.log.warn("exportSTEP: no current shape");
            return null;
        }
        try {
            return this.currentShape.blobSTEP();
        } catch (err) {
            this.log.error("exportSTEP failed:", err);
            return null;
        }
    }

    /**
     * Export current shape to binary STL blob.
     * @returns {Blob|null}
     */
    exportSTL() {
        if (!this.currentShape) {
            this.log.warn("exportSTL: no current shape");
            return null;
        }
        try {
            return this.currentShape.blobSTL({ binary: true });
        } catch (err) {
            this.log.error("exportSTL failed:", err);
            return null;
        }
    }

    // -----------------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------------

    dispose() {
        this._pauseAnimation();
        this.resizeObserver?.disconnect();
        if (this.renderer) {
            this.renderer.dispose();
            this.container?.removeChild(this.renderer.domElement);
            this.renderer = null;
        }
        this.controls?.dispose();
        this.viewCube?.dispose();
        if (this._displayModeListener) {
            document.removeEventListener("change", this._displayModeListener, true);
            this._displayModeListener = null;
        }
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.viewCube = null;
        this.modelGroup = null;
        this.log.info("ReplicadCanvasModule disposed");
    }
}
