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
import { calculateOffsetFromPathData } from "../operations/CustomOffsetProcessor.js";
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

function getAdaptiveSvgPathSampleStep(pathData, targetSegmentLength = 5, minStep = 0.5, maxStep = 4) {
    if (!pathData || typeof document === "undefined") return 2;

    try {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);

        const totalLength = path.getTotalLength();
        if (!Number.isFinite(totalLength) || totalLength <= 0) return 2;

        const segmentLength = Math.max(0.5, Number(targetSegmentLength) || 5);
        const sampleCount = Math.max(8, Math.ceil(totalLength / segmentLength));
        const adaptiveStep = totalLength / sampleCount;
        return Math.max(minStep, Math.min(maxStep, adaptiveStep));
    } catch {
        return 2;
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

function reverseSvgCommands(commands) {
    if (!commands.length) return [];
    
    const absCommands = [];
    let curX = 0, curY = 0;
    let startX = 0, startY = 0;
    
    for (const entry of commands) {
        const raw = entry.cmd;
        const up = raw.toUpperCase();
        const rel = raw !== up;
        const v = entry.values;
        let newCmd = up;
        let newV = [];
        
        if (up === 'M') {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
            startX = curX; startY = curY;
            newV = [curX, curY];
        } else if (up === 'L') {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
            newV = [curX, curY];
        } else if (up === 'A') {
            curX = rel ? curX + v[5] : v[5];
            curY = rel ? curY + v[6] : v[6];
            newV = [v[0], v[1], v[2], v[3], v[4], curX, curY];
        } else if (up === 'Z') {
            curX = startX; curY = startY;
            newCmd = 'L'; // Treat Z as an explicit L for easy reversal
            newV = [curX, curY];
        }
        absCommands.push({ cmd: newCmd, values: newV });
    }
    
    const reversed = [];
    const points = [{ x: absCommands[0].values[0], y: absCommands[0].values[1] }];
    for (let i = 1; i < absCommands.length; i++) {
        const v = absCommands[i].values;
        points.push({ x: v[v.length - 2], y: v[v.length - 1] });
    }
    
    reversed.push({ cmd: 'M', values: [points[points.length - 1].x, points[points.length - 1].y] });
    
    for (let i = absCommands.length - 1; i >= 1; i--) {
        const cmd = absCommands[i];
        const prevPt = points[i - 1];
        
        if (cmd.cmd === 'L') {
            reversed.push({ cmd: 'L', values: [prevPt.x, prevPt.y] });
        } else if (cmd.cmd === 'A') {
            const sweep = cmd.values[4] === 1 ? 0 : 1;
            reversed.push({ cmd: 'A', values: [cmd.values[0], cmd.values[1], cmd.values[2], cmd.values[3], sweep, prevPt.x, prevPt.y] });
        }
    }
    reversed.push({ cmd: 'Z', values: [] });
    
    return reversed;
}

function commandsToPathData(commands) {
    return commands.map(c => c.cmd + ' ' + c.values.map(v => Number(v.toFixed(6))).join(' ')).join(' ');
}

/**
 * Normalizes an SVG profile to ensure its starting point (seam) is located at the top Shank (max Y).
 * Sweeping a profile starting at a singularity (like the sharp tip of a V-bit or center of a ball-nose)
 * often causes pole degeneracy and internal twisting in OpenCASCADE MakePipeShell.
 */
function normalizeSvgStartPoint(commands) {
    if (commands.length < 3) return commands;
    
    const absCommands = [];
    let curX = 0, curY = 0;
    let startX = 0, startY = 0;
    
    for (const entry of commands) {
        const raw = entry.cmd;
        const up = raw.toUpperCase();
        const rel = raw !== up;
        const v = entry.values;
        let newCmd = up;
        let newV = [];
        
        if (up === 'M') {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
            startX = curX; startY = curY;
            newV = [curX, curY];
        } else if (up === 'L') {
            curX = rel ? curX + v[0] : v[0];
            curY = rel ? curY + v[1] : v[1];
            newV = [curX, curY];
        } else if (up === 'H') {
            curX = rel ? curX + v[0] : v[0];
            newCmd = 'L';
            newV = [curX, curY];
        } else if (up === 'V') {
            curY = rel ? curY + v[0] : v[0];
            newCmd = 'L';
            newV = [curX, curY];
        } else if (up === 'A') {
            curX = rel ? curX + v[5] : v[5];
            curY = rel ? curY + v[6] : v[6];
            newV = [v[0], v[1], v[2], v[3], v[4], curX, curY];
        } else if (up === 'Z') {
            curX = startX; curY = startY;
            newCmd = 'L'; 
            newV = [curX, curY];
        }
        absCommands.push({ cmd: newCmd, values: newV, targetX: curX, targetY: curY });
    }

    const lastCmd = absCommands[absCommands.length - 1];
    const firstCmd = absCommands[0];
    const isClosed = Math.abs(lastCmd.targetX - firstCmd.targetX) < 1e-4 && Math.abs(lastCmd.targetY - firstCmd.targetY) < 1e-4;
    
    if (!isClosed) {
        absCommands.push({ cmd: 'L', values: [firstCmd.targetX, firstCmd.targetY], targetX: firstCmd.targetX, targetY: firstCmd.targetY });
    }

    let maxY = -Infinity;
    let maxIdx = 0;
    // We only iterate up to length-1 because the last point is the same as the first point
    for (let i = 0; i < absCommands.length - 1; i++) {
        if (absCommands[i].targetY > maxY) {
            maxY = absCommands[i].targetY;
            maxIdx = i;
        }
    }

    if (maxIdx === 0) {
        return commands; 
    }

    const rolled = [];
    const maxPt = absCommands[maxIdx];
    rolled.push({ cmd: 'M', values: [maxPt.targetX, maxPt.targetY] });

    for (let i = maxIdx + 1; i < absCommands.length; i++) {
        rolled.push({ cmd: absCommands[i].cmd, values: [...absCommands[i].values] });
    }
    
    for (let i = 1; i <= maxIdx; i++) {
        rolled.push({ cmd: absCommands[i].cmd, values: [...absCommands[i].values] });
    }

    rolled.push({ cmd: 'Z', values: [] });
    return rolled;
}

/**
 * Build a true geometric outset path for offset=0 fallback spine.
 * This avoids shape distortion from scaling and keeps corner joins consistent.
 * @param {string} pathData
 * @param {number} [distance=0.01]
 * @param {object|null} [exportModule=null] - Export module with DXF parser dependencies.
 * @returns {string}
 */
function buildOutsetPathData(pathData, distance = 0.01, exportModule = null) {
    const d = Number(distance);
    if (!pathData || !Number.isFinite(d) || d <= 0) return pathData;
    if (!exportModule?.dxfExporter?.parseSVGPathSegments) return pathData;
    const outsetPath = calculateOffsetFromPathData(pathData, -d, {
        join: "sharp",
        cap: "flat",
        exportModule,
        trimSelfIntersections: true,
        editorLikeClosedSplit: true,
    });
    return typeof outsetPath === "string" && outsetPath.trim() ? outsetPath : pathData;
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
    forceTopologicalClose = false,
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
    if (sawZ && close) {
        if (forceTopologicalClose) return sketch.close();
        return closedByGeometry ? sketch.done() : sketch.close();
    }
    // For non-Z paths, close only if close=true and path isn't already closed
    const shouldClose = close && (forceTopologicalClose || !closedByGeometry);
    return shouldClose ? sketch.close() : sketch.done();
}

/**
 * Test whether two finite 2-D line segments [a1,a2] and [b1,b2] intersect.
 * Returns the intersection point {x,y} or null.
 * @param {{x:number,y:number}} a1
 * @param {{x:number,y:number}} a2
 * @param {{x:number,y:number}} b1
 * @param {{x:number,y:number}} b2
 */
function lineSegIntersect2D(a1, a2, b1, b2) {
    const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
    const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-10) return null; // parallel / collinear
    const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
    const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;
    if (t > 1e-8 && t < 1 - 1e-8 && u > 1e-8 && u < 1 - 1e-8) {
        return { x: a1.x + t * dx1, y: a1.y + t * dy1 };
    }
    return null;
}

/**
 * Sample a segment to a 2-point polyline segment for approximate intersection
 * testing. Arcs are approximated as their chord (start→end).
 */
function segToChord(seg) {
    return [
        { x: Number(seg.start.x), y: Number(seg.start.y) },
        { x: Number(seg.end.x),   y: Number(seg.end.y)   },
    ];
}

/**
 * Remove self-intersecting loops from an array of offset-engine segments.
 *
 * When an offset path is computed with a distance larger than the local
 * curvature radius (e.g. offsetting a shape by 30 mm past a 20 mm corner
 * radius), the resulting contour self-intersects at that corner, creating
 * a "loop" that makes the BREP non-manifold. This function iterates through
 * LINE segment pairs only (arc segments are skipped as outer/inner candidates
 * to avoid false-positive detection from chord approximation), finds the first
 * forward self-intersection, clips both line segments at the crossing point
 * and removes the intervening loop segments. Repeats until no more crossings.
 *
 * @param {Array<{type:string,start:{x:number,y:number},end:{x:number,y:number}}>} segments
 * @returns {Array} cleaned segment array (same reference types preserved)
 */
function removeLoopsFromSegments(segments) {
    if (!Array.isArray(segments) || segments.length < 3) return segments;

    let working = segments.slice();
    const MIN_SEG_LENGTH = 1e-3; // mm – drop segments shorter than this

    for (let pass = 0; pass < 20; pass++) {
        let found = false;
        outer: for (let i = 0; i < working.length; i++) {
            const sA = working[i];
            // Only test line segments as the outer candidate to avoid
            // false positives from arc chord approximation.
            if (!sA?.start || !sA?.end) continue;
            if (sA.type !== "line") continue;
            const a1 = { x: Number(sA.start.x), y: Number(sA.start.y) };
            const a2 = { x: Number(sA.end.x),   y: Number(sA.end.y)   };

            for (let j = i + 2; j < working.length; j++) {
                // Skip the wrap-around pair (last → first are adjacent).
                if (i === 0 && j === working.length - 1) continue;

                const sB = working[j];
                // Inner candidate must also be a line segment.
                if (!sB?.start || !sB?.end) continue;
                if (sB.type !== "line") continue;
                const b1 = { x: Number(sB.start.x), y: Number(sB.start.y) };
                const b2 = { x: Number(sB.end.x),   y: Number(sB.end.y)   };

                const pt = lineSegIntersect2D(a1, a2, b1, b2);
                if (!pt) continue;

                // Self-intersection found: line segments i and j cross at pt.
                // Clip sA to end at pt, clip sB to start at pt,
                // discard everything between i+1 and j-1 (the loop interior).
                const ptObj = { x: pt.x, y: pt.y };
                const clippedA = { ...sA, end: ptObj };
                const clippedB = { ...sB, start: ptObj };

                const lenA = Math.hypot(clippedA.end.x - clippedA.start.x, clippedA.end.y - clippedA.start.y);
                const lenB = Math.hypot(clippedB.end.x - clippedB.start.x, clippedB.end.y - clippedB.start.y);

                const before = working.slice(0, i);
                const after  = working.slice(j + 1);
                working = [
                    ...before,
                    ...(lenA >= MIN_SEG_LENGTH ? [clippedA] : []),
                    ...(lenB >= MIN_SEG_LENGTH ? [clippedB] : []),
                    ...after,
                ];
                found = true;
                break outer;
            }
        }
        if (!found) break;
    }
    return working;
}


function buildSketchFromOffsetSegments(segments, bboxRef, Sketcher, {
    close = true,
    plane = "XY",
    panelAnchor = "top-left",
    depth = 0,
    panelThickness = appConfig.panel.thickness,
    applyDepthForXY = false,
    strictContinuity = false,
    strictArcs = false,
    continuityEps = 1e-3,
    diagnostics = null,
    removeLoops = false,
} = {}) {
    if (!Array.isArray(segments) || segments.length === 0) return null;

    // Pre-process: remove self-intersecting loops before attempting BREP construction.
    // This is needed when offset distance exceeds the local corner curvature radius.
    const workingSegments = removeLoops ? removeLoopsFromSegments(segments) : segments;
    if (!Array.isArray(workingSegments) || workingSegments.length === 0) return null;

    const diag = diagnostics && typeof diagnostics === "object" ? diagnostics : null;
    if (diag) {
        diag.segmentCount = workingSegments.length;
        diag.strictContinuity = strictContinuity;
        diag.strictArcs = strictArcs;
        diag.snapCount = 0;
        diag.bridgeCount = 0;
        diag.arcFallbackCount = 0;
        diag.failReason = null;
        diag.failDetail = null;
        diag.success = false;
    }

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
    const segmentEps = 1e-5;
    const stitchSnapEps = Math.max(segmentEps, Number(continuityEps) || 1e-3);

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

    for (const seg of workingSegments) {
        const sx = Number(seg?.start?.x);
        const sy = Number(seg?.start?.y);
        const ex = Number(seg?.end?.x);
        const ey = Number(seg?.end?.y);

        if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(ex) || !Number.isFinite(ey)) {
            if (strictContinuity) {
                if (diag) {
                    diag.failReason = "invalid-segment-endpoints";
                    diag.failDetail = { sx, sy, ex, ey };
                }
                return null;
            }
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

        const gapToStart = Math.hypot((curX ?? sx) - sx, (curY ?? sy) - sy);
        if (!isNear2D(curX, curY, sx, sy, segmentEps)) {
            if (gapToStart <= stitchSnapEps) {
                // Tiny numerical seam between adjacent segments: snap instead of creating
                // a micro bridge edge that can self-overlap during sweep.
                curX = sx;
                curY = sy;
                if (diag) diag.snapCount += 1;
            } else {
                if (strictContinuity) {
                    if (diag) {
                        diag.failReason = "segment-start-gap";
                        diag.failDetail = { gap: gapToStart, eps: stitchSnapEps };
                    }
                    return null;
                }
                sketch = sketch.lineTo(mapPoint(sx, sy));
                curX = sx;
                curY = sy;
                if (diag) diag.bridgeCount += 1;
            }
        }

        if (seg?.type === "arc") {
            const arc = readArcParams(seg);
            if (arc && !isNear2D(curX, curY, ex, ey, segmentEps)) {
                const rot = flipY ? -arc.rotation : arc.rotation;
                const sweep = flipY ? !arc.sweep : arc.sweep;
                sketch = sketch.ellipseTo(mapPoint(ex, ey), arc.rx, arc.ry, rot, arc.largeArc, sweep);
            } else if (!isNear2D(curX, curY, ex, ey, segmentEps)) {
                if (strictArcs) {
                    if (diag) {
                        diag.failReason = "arc-invalid-or-degenerate";
                        diag.failDetail = { sx, sy, ex, ey };
                    }
                    return null;
                }
                sketch = sketch.lineTo(mapPoint(ex, ey));
                if (diag) diag.arcFallbackCount += 1;
            }
        } else if (!isNear2D(curX, curY, ex, ey, segmentEps)) {
            // For line segments, reaching `end` is the segment itself, not a continuity gap.
            // Strict continuity applies to segment-to-segment joins (`cur -> start`), handled above.
            sketch = sketch.lineTo(mapPoint(ex, ey));
        }

        curX = ex;
        curY = ey;
    }

    if (!sketch) return null;

    const closingGap =
        startX !== null && startY !== null && curX !== null && curY !== null
            ? Math.hypot(curX - startX, curY - startY)
            : Infinity;

    // Tight threshold: gap below this means currentPoint == startPoint (same float or
    // sub-nanometre difference) → close() would add a degenerate zero-length edge.
    const closedByGeometry = closingGap <= 1e-4;

    // Tolerance for the strict-continuity closing check: gaps below this are "seam gaps"
    // (either natural float rounding or normalizeSegmentsForSweep's 5µm seam-epsilon split)
    // and should not fail the continuity check.  0.01mm is safely above SEAM_EPSILON (5µm).
    const CLOSURE_GAP_TOLERANCE = 0.01;
    if (strictContinuity && close && closingGap > CLOSURE_GAP_TOLERANCE) {
        if (diag) {
            diag.failReason = "not-closed-after-build";
            diag.failDetail = { continuityEps: 1e-3 };
        }
        return null;
    }

    if (diag) {
        diag.closedByGeometry = closedByGeometry;
    }

    // When the seam was split (normalizeSegmentsForSweep with epsilon split), the last
    // segment ends at seg0.start which differs from sketch._startPoint (= seamPoint) by
    // SEAM_EPSILON. closedByGeometry will be false → shouldClose = true → sketch.close()
    // adds a real ~0.001mm edge → assembleWire succeeds.
    // When closedByGeometry is true, sketch.close() internally skips the lineTo and just
    // calls done() — same behaviour — so we can always use shouldClose logic safely.
    const shouldClose = close && !closedByGeometry;
    let result = null;
    try {
        result = shouldClose ? sketch.close() : sketch.done();
    } catch (err) {
        if (diag) {
            diag.failReason = "wire-assemble-failed";
            diag.failDetail = { message: err?.message || String(err) };
        }
        return null;
    }
    if (diag) {
        diag.success = true;
    }
    return result;
}

function normalizeSegmentsForSweep(segments, snapEps = 1e-2, options = {}) {
    const {
        splitSeam = true,
    } = options || {};
    if (!Array.isArray(segments) || segments.length === 0) return [];

    let out = segments.map((seg) => ({
        ...seg,
        start: seg?.start ? { ...seg.start } : seg?.start,
        end: seg?.end ? { ...seg.end } : seg?.end,
        arc: seg?.arc ? { ...seg.arc } : seg?.arc,
    }));

    const isFinitePoint = (p) =>
        p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y));
    const dist = (a, b) => Math.hypot(Number(a.x) - Number(b.x), Number(a.y) - Number(b.y));

    // Move seam to the longest linear edge to reduce OCC sweep artifacts at closure.
    // Some closed wires are sensitive when seam sits on an arc/concave corner.
    const isClosed = isFinitePoint(out[0]?.start)
        && isFinitePoint(out[out.length - 1]?.end)
        && dist(out[0].start, out[out.length - 1].end) <= Math.max(snapEps, 1e-3);
    let didSeamSplit = false;
    if (isClosed && out.length > 2) {
        let bestIndex = -1;
        let bestLen = -1;
        let bestMidY = Infinity;
        let bestMidX = Infinity;
        const tieLenEps = Math.max(1e-6, snapEps * 1e-3);
        for (let i = 0; i < out.length; i++) {
            const seg = out[i];
            if (seg?.type !== "line") continue;
            if (!isFinitePoint(seg?.start) || !isFinitePoint(seg?.end)) continue;
            const len = dist(seg.start, seg.end);
            const midX = (Number(seg.start.x) + Number(seg.end.x)) / 2;
            const midY = (Number(seg.start.y) + Number(seg.end.y)) / 2;
            const longer = len > bestLen + tieLenEps;
            const sameLen = Math.abs(len - bestLen) <= tieLenEps;
            const betterTie = sameLen && (
                midY < bestMidY - 1e-9
                || (Math.abs(midY - bestMidY) <= 1e-9 && midX < bestMidX - 1e-9)
            );
            if (longer || betterTie) {
                bestLen = len;
                bestIndex = i;
                bestMidY = midY;
                bestMidX = midX;
            }
        }
        if (bestIndex >= 0) {
            if (bestIndex > 0) {
                out = out.slice(bestIndex).concat(out.slice(0, bestIndex));
            }

            if (splitSeam) {
                // Split the seam segment so the seam sits around the segment midpoint, not at
                // the segment start. This avoids placing seam closure at arc/line junctions,
                // which can trigger OCC pipe-shell truncation on specific VC phantom passes.
                const seamSeg = out[0];
                if (seamSeg?.type === "line" && isFinitePoint(seamSeg?.start) && isFinitePoint(seamSeg?.end)) {
                    const seamLen = dist(seamSeg.start, seamSeg.end);
                    const SEAM_EPSILON = 5e-3; // 5 µm — invisible, safely > OCC tolerance & closedByGeometry threshold
                    if (seamLen > SEAM_EPSILON * 4) {
                        const dx = (Number(seamSeg.end.x) - Number(seamSeg.start.x)) / seamLen;
                        const dy = (Number(seamSeg.end.y) - Number(seamSeg.start.y)) / seamLen;
                        const midLen = seamLen / 2;
                        const midPoint = {
                            x: Number(seamSeg.start.x) + dx * midLen,
                            y: Number(seamSeg.start.y) + dy * midLen,
                        };
                        const seamPoint = {
                            x: Number(seamSeg.start.x) + dx * (midLen + SEAM_EPSILON),
                            y: Number(seamSeg.start.y) + dy * (midLen + SEAM_EPSILON),
                        };
                        // First half starts slightly after midpoint; second half is appended to
                        // the end so sketch.close() adds only a tiny epsilon seam bridge.
                        out[0] = { ...seamSeg, start: { ...seamPoint } };
                        out.push({ ...seamSeg, end: { ...midPoint } });
                        didSeamSplit = true;
                    }
                }
            }
        } else if (isClosed && out.length > 0) {
            // All-arc fallback: no linear segments found. Find the longest arc.
            let bestArcIdx = -1;
            let bestArcChord = -1;
            for (let i = 0; i < out.length; i++) {
                const seg = out[i];
                if (seg?.type === "arc" && isFinitePoint(seg?.start) && isFinitePoint(seg?.end)) {
                    const chord = dist(seg.start, seg.end);
                    if (chord > bestArcChord) {
                        bestArcChord = chord;
                        bestArcIdx = i;
                    }
                }
            }
            if (bestArcIdx >= 0) {
                if (bestArcIdx > 0) {
                    out = out.slice(bestArcIdx).concat(out.slice(0, bestArcIdx));
                }
                
                if (splitSeam) {
                    const seamArc = out[0];
                    const chordLen = dist(seamArc.start, seamArc.end);
                    const SEAM_EPSILON = 5e-3;
                    if (chordLen > SEAM_EPSILON * 4) {
                        const dx = (Number(seamArc.end.x) - Number(seamArc.start.x)) / chordLen;
                        const dy = (Number(seamArc.end.y) - Number(seamArc.start.y)) / chordLen;
                        
                        // Shift the start point of the arc slightly along the chord.
                        // Sketch.close() will add a tiny micro-linear seam bridge between the
                        // last segment and this new start point, anchoring the sweep seam
                        // safely away from the arc-arc junction.
                        const newStart = {
                            x: Number(seamArc.start.x) + dx * SEAM_EPSILON,
                            y: Number(seamArc.start.y) + dy * SEAM_EPSILON,
                        };
                        out[0] = { ...seamArc, start: newStart };
                        didSeamSplit = true;
                    }
                }
            }
        }
    }

    for (let i = 1; i < out.length; i++) {
        const prev = out[i - 1];
        const cur = out[i];
        if (!isFinitePoint(prev?.end) || !isFinitePoint(cur?.start)) continue;
        if (dist(prev.end, cur.start) <= snapEps) {
            cur.start = { x: Number(prev.end.x), y: Number(prev.end.y) };
        }
    }

    // Skip closure snap when seam was split: the gap between the last segment's end
    // (original seamSeg.start) and first segment's start (seamPoint) must be preserved
    // so buildSketchFromOffsetSegments sees closedByGeometry=false and calls close().
    if (!didSeamSplit) {
        const first = out[0];
        const last = out[out.length - 1];
        if (isFinitePoint(first?.start) && isFinitePoint(last?.end)) {
            if (dist(last.end, first.start) <= snapEps) {
                last.end = { x: Number(first.start.x), y: Number(first.start.y) };
            }
        }
    }

    return out;
}

function reverseSegmentsForSweep(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return [];

    return [...segments]
        .reverse()
        .map((seg) => {
            const out = {
                ...seg,
                start: seg?.end ? { ...seg.end } : seg?.end,
                end: seg?.start ? { ...seg.start } : seg?.start,
                arc: seg?.arc ? { ...seg.arc } : seg?.arc,
            };

            if (out?.type === "arc" && out.arc) {
                if (out.arc.sweep !== undefined) out.arc.sweep = !Boolean(out.arc.sweep);
                if (out.arc.sweepFlag !== undefined) out.arc.sweepFlag = Boolean(out.arc.sweepFlag) ? 0 : 1;
            }

            return out;
        });
}

/**
 * Heals a segment array to be G1 (tangent) continuous at every sharp line→line corner
 * by inserting an analytically computed tangent micro-arc. This is the canonical OCC
 * fix for BRepOffsetAPI_MakePipeShell instability:
 *   - Removes inverted round-corner caps at 90° junctions (RoundCorner mode builds a
 *     sphere whose orientation can invert on sharp corners).
 *   - Stabilises sweeps when the offset distance causes tight arc radii — OCC is much
 *     more tolerant with a G1 spine than with a spine that has angular discontinuities.
 *
 * Geometry (Paper.js Y-down coordinates):
 *   Given corner point P, incoming direction u (from P toward prev point) and outgoing
 *   direction v (from P toward next point), the micro-arc is computed as:
 *     halfAngle = arccos(u·v) / 2  (angle between the two "away-from-corner" vectors)
 *     trimDist   = microRadius / tan(halfAngle)
 *     T1 = P + u * trimDist  (tangent point on incoming segment)
 *     T2 = P + v * trimDist  (tangent point on outgoing segment)
 *     sweepFlag determined by cross-product u×v (Paper.js Y-down convention)
 *
 * No sampling is performed — all inserted segments are true arcs.
 *
 * @param {Array<Object>} segments      - Input segments [{type,start,end,arc?}]
 * @param {number}        microRadius   - Fillet radius in Paper.js units (mm). Should
 *                                        be tiny (e.g. bitRadius * 0.02, min 0.05 mm).
 * @param {number}        [sharpThresholdDeg=170] - Corners sharper than this angle (°)
 *                                        between the two lines get a micro-arc inserted.
 * @returns {Array<Object>} New segment array (may have more segments than input)
 */
function healSpineSegmentsG1(segments, microRadius, sharpThresholdDeg = 170) {
    if (!Array.isArray(segments) || segments.length < 2) return segments;
    const r = Math.max(Number(microRadius) || 0, 0);
    if (r < 1e-6) return segments;

    const thresholdRad = (sharpThresholdDeg * Math.PI) / 180;
    const isFinitePoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);

    // Collect which junction indices are line→line and sharper than threshold
    // Junction i: between segments[i-1] and segments[i]
    const out = [];

    for (let i = 0; i < segments.length; i++) {
        const prev = segments[(i - 1 + segments.length) % segments.length];
        const cur  = segments[i];

        const isLinePrev = prev?.type === "line";
        const isLineCur  = cur?.type === "line";

        // Only heal line→line corners; arcs already provide G1 continuity
        if (!isLinePrev || !isLineCur) {
            out.push({ ...cur, start: cur?.start ? { ...cur.start } : cur?.start, end: cur?.end ? { ...cur.end } : cur?.end });
            continue;
        }
        if (!isFinitePoint(prev.end) || !isFinitePoint(cur.start)) {
            out.push({ ...cur, start: cur?.start ? { ...cur.start } : cur?.start, end: cur?.end ? { ...cur.end } : cur?.end });
            continue;
        }

        // Corner point P = prev.end ≈ cur.start
        const Px = Number(prev.end.x);
        const Py = Number(prev.end.y);

        // Direction from corner back along incoming segment (toward prev.start)
        const prevLen = Math.hypot(Px - Number(prev.start.x), Py - Number(prev.start.y));
        if (prevLen < 1e-9) {
            out.push({ ...cur, start: { ...cur.start }, end: { ...cur.end } });
            continue;
        }
        const ux = (Number(prev.start.x) - Px) / prevLen;
        const uy = (Number(prev.start.y) - Py) / prevLen;

        // Direction from corner along outgoing segment (toward cur.end)
        const curLen = Math.hypot(Number(cur.end.x) - Px, Number(cur.end.y) - Py);
        if (curLen < 1e-9) {
            out.push({ ...cur, start: { ...cur.start }, end: { ...cur.end } });
            continue;
        }
        const vx = (Number(cur.end.x) - Px) / curLen;
        const vy = (Number(cur.end.y) - Py) / curLen;

        // Interior angle between the two "away-from-corner" vectors u and v
        const dot = Math.max(-1, Math.min(1, ux * vx + uy * vy));
        const interiorAngle = Math.acos(dot); // 0 = same direction (no corner), π = U-turn

        // Skip nearly-straight junctions (angle < threshold)
        if (interiorAngle < (Math.PI - thresholdRad)) {
            out.push({ ...cur, start: { ...cur.start }, end: { ...cur.end } });
            continue;
        }

        // Compute trim distance: how far from corner to place tangent points
        const halfAngle = interiorAngle / 2;
        const tanHalf = Math.tan(halfAngle);
        if (!Number.isFinite(tanHalf) || Math.abs(tanHalf) < 1e-9) {
            out.push({ ...cur, start: { ...cur.start }, end: { ...cur.end } });
            continue;
        }

        const trimDist = r / tanHalf;

        // Ensure trim doesn't exceed segment lengths (use at most 40% of each)
        const maxTrimPrev = prevLen * 0.4;
        const maxTrimCur  = curLen  * 0.4;
        const safeTrim = Math.min(trimDist, maxTrimPrev, maxTrimCur);

        if (safeTrim < 1e-6) {
            out.push({ ...cur, start: { ...cur.start }, end: { ...cur.end } });
            continue;
        }

        // Tangent points
        const T1x = Px + ux * safeTrim;
        const T1y = Py + uy * safeTrim;
        const T2x = Px + vx * safeTrim;
        const T2y = Py + vy * safeTrim;

        // Adjusted micro-radius (may be smaller if we clamped safeTrim)
        const actualRadius = safeTrim * tanHalf;
        if (actualRadius < 1e-6) {
            out.push({ ...cur, start: { ...cur.start }, end: { ...cur.end } });
            continue;
        }

        // Sweep direction: cross product u×v in Paper.js Y-down space
        // cross > 0 → turning left (CCW visually in Y-down) → sweepFlag=1 (SVG CCW)
        // cross < 0 → turning right (CW visually in Y-down) → sweepFlag=0 (SVG CW)
        const cross = ux * vy - uy * vx;
        const sweepFlag = cross > 0 ? 1 : 0;

        // Trim the previous segment (already pushed — modify its end)
        const lastOut = out[out.length - 1];
        if (lastOut) {
            lastOut.end = { x: T1x, y: T1y };
        }

        // Insert micro-arc segment from T1 to T2
        out.push({
            type: "arc",
            start: { x: T1x, y: T1y },
            end:   { x: T2x, y: T2y },
            arc: {
                radius:  actualRadius,
                rx:      actualRadius,
                ry:      actualRadius,
                sweepFlag,
                sweep:   sweepFlag === 1,
                largeArcFlag: false,
                largeArc: false,
                rotation: 0,
                xRotation: 0,
            },
        });

        // Push current segment starting from T2 (trimmed)
        out.push({
            ...cur,
            start: { x: T2x, y: T2y },
            end:   { ...cur.end },
        });
    }

    return out;
}

/**
 * Computes the maximum world-space Y coordinate reachable by a spine segment array,
 * including the topmost/bottommost point of any arc segment's full circle.
 * Used to validate sweep completeness (missing arch detection).
 *
 * @param {Array} segments - normalizedContourSegments (Paper.js coordinates)
 * @param {Object} bboxRef  - panel bounding box {x,y,width,height}
 * @param {string} panelAnchor - "top-left" or "bottom-left"
 * @returns {number} max world Y (Three.js Y-up), or -Infinity if no valid points
 */
function computeSpineMaxWorldY(segments, bboxRef, panelAnchor) {
    const flipY = panelAnchor !== "bottom-left";
    const bottomY = bboxRef.y + bboxRef.height;
    const ty = (y) => flipY ? (bottomY - y) : (y - bboxRef.y);

    let maxY = -Infinity;
    for (const seg of (segments || [])) {
        if (!seg) continue;
        const sy = seg.start?.y != null ? ty(Number(seg.start.y)) : NaN;
        const ey = seg.end?.y != null ? ty(Number(seg.end.y)) : NaN;
        if (Number.isFinite(sy)) maxY = Math.max(maxY, sy);
        if (Number.isFinite(ey)) maxY = Math.max(maxY, ey);
        if (seg.type === "arc") {
            const d = seg.data || seg.arc || {};
            const r = Number(d.rx ?? d.radius ?? 0);
            const cy_paper = Number(d.center?.y ?? d.centerY ?? NaN);
            if (r > 0 && Number.isFinite(cy_paper)) {
                const cy_world = ty(cy_paper);
                // Conservative: arc can reach up to cy_world ± r on its full circle
                maxY = Math.max(maxY, cy_world + r, cy_world - r);
            }
        }
    }
    return maxY;
}

function normalizeThreeColorInput(color, opacity = 1, transparent = false) {
    if (typeof color !== "string") {
        return { color, opacity, transparent };
    }

    const match = color.trim().match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i);
    if (!match) {
        return { color, opacity, transparent };
    }

    const red = Math.max(0, Math.min(255, Number(match[1])));
    const green = Math.max(0, Math.min(255, Number(match[2])));
    const blue = Math.max(0, Math.min(255, Number(match[3])));
    const alphaRaw = match[4] === undefined ? 1 : Number(match[4]);
    const alpha = Number.isFinite(alphaRaw) ? Math.max(0, Math.min(1, alphaRaw)) : 1;

    return {
        color: new THREE.Color(red / 255, green / 255, blue / 255),
        opacity: opacity * alpha,
        transparent: transparent || alpha < 1 || opacity < 1,
    };
}

function fastHashString(input) {
    let hash = 2166136261;
    const str = String(input || "");
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
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

function normalizeClosedProfilePolyline(points, eps = 1e-4) {
    if (!Array.isArray(points) || points.length < 3) return [];
    const normalized = [];
    for (const point of points) {
        const x = Number(point?.x);
        const y = Number(point?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (!normalized.length) {
            normalized.push({ x, y });
            continue;
        }
        const prev = normalized[normalized.length - 1];
        if (Math.hypot(x - prev.x, y - prev.y) <= eps) continue;
        normalized.push({ x, y });
    }

    if (normalized.length > 2) {
        const first = normalized[0];
        const last = normalized[normalized.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) <= eps) {
            normalized.pop();
        }
    }

    return normalized.length >= 3 ? normalized : [];
}

function rotateClosedPoints(points, startIndex) {
    if (!Array.isArray(points) || !points.length) return [];
    const n = points.length;
    const idx = ((startIndex % n) + n) % n;
    if (idx === 0) return points.slice();
    return points.slice(idx).concat(points.slice(0, idx));
}

function estimateVertexSmoothness(points, index) {
    const n = points.length;
    if (n < 3) return 0;
    const prev = points[(index - 1 + n) % n];
    const cur = points[index];
    const next = points[(index + 1) % n];
    const ax = prev.x - cur.x;
    const ay = prev.y - cur.y;
    const bx = next.x - cur.x;
    const by = next.y - cur.y;
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la <= 1e-6 || lb <= 1e-6) return 0;
    const cosTheta = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
    const angle = Math.acos(cosTheta);
    // Closer to PI means smoother (less corner-like).
    return Math.PI - Math.abs(Math.PI - angle);
}

function canonicalizeProfilePolylineStart(points) {
    const normalized = normalizeClosedProfilePolyline(points);
    if (normalized.length < 3) return normalized;

    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of normalized) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
    }
    const centerX = (minX + maxX) / 2;
    const yBand = Math.max(1e-3, (maxY - Math.min(...normalized.map((p) => p.y))) * 0.08);

    let bestIndex = 0;
    let bestScore = [Infinity, Infinity, -Infinity];
    for (let i = 0; i < normalized.length; i++) {
        const point = normalized[i];
        const topDist = Math.abs(maxY - point.y);
        const centerDist = Math.abs(point.x - centerX);
        const smoothness = estimateVertexSmoothness(normalized, i);
        const preferTopBand = topDist <= yBand ? 0 : 1;
        const score = [preferTopBand, centerDist + topDist, -smoothness];
        if (
            score[0] < bestScore[0] ||
            (score[0] === bestScore[0] && score[1] < bestScore[1]) ||
            (score[0] === bestScore[0] && score[1] === bestScore[1] && score[2] < bestScore[2])
        ) {
            bestIndex = i;
            bestScore = score;
        }
    }

    return rotateClosedPoints(normalized, bestIndex);
}

function buildCanonicalProfileSketchFromPathData(pathData, Sketcher, pathZ = 0, profileOrigin = null) {
    const sampled = parseProfilePointsFromPathData(pathData);
    const ordered = canonicalizeProfilePolylineStart(sampled);
    if (ordered.length < 3) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    for (const point of ordered) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
    }

    const cx = (minX + maxX) / 2;
    const anchorY = minY;
    const toXZ = (point) => [cx - point.x, point.y - anchorY];
    const origin = Array.isArray(profileOrigin) && profileOrigin.length === 3
        ? profileOrigin
        : [0, 0, pathZ];

    let sketch = new Sketcher("XZ", origin).movePointerTo(toXZ(ordered[0]));
    for (let i = 1; i < ordered.length; i++) {
        sketch = sketch.lineTo(toXZ(ordered[i]));
    }
    return sketch.close();
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
    const isNear = (ax, ay, bx, by, eps = 1e-7) =>
        Math.abs(ax - bx) <= eps && Math.abs(ay - by) <= eps;

    let sketch = null;
    curX = 0;
    curY = 0;
    startX = 0;
    startY = 0;
    let sawZ = false;
    let closedByGeometry = false;
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
            closedByGeometry = false;
            prevC2X = prevC2Y = prevQX = prevQY = null;
            continue;
        }

        if (!sketch) continue;

        if (up === "L") {
            const x = rel ? curX + v[0] : v[0];
            const y = rel ? curY + v[1] : v[1];
            if (!isNear(curX, curY, x, y)) {
                sketch = sketch.lineTo(toXZ(x, y));
            }
            curX = x;
            curY = y;
            closedByGeometry = isNear(curX, curY, startX, startY);
        } else if (up === "H") {
            const x = rel ? curX + v[0] : v[0];
            if (!isNear(curX, curY, x, curY)) {
                sketch = sketch.lineTo(toXZ(x, curY));
            }
            curX = x;
            closedByGeometry = isNear(curX, curY, startX, startY);
        } else if (up === "V") {
            const y = rel ? curY + v[0] : v[0];
            if (!isNear(curX, curY, curX, y)) {
                sketch = sketch.lineTo(toXZ(curX, y));
            }
            curY = y;
            closedByGeometry = isNear(curX, curY, startX, startY);
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
            closedByGeometry = isNear(curX, curY, startX, startY);
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
            closedByGeometry = isNear(curX, curY, startX, startY);
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
            closedByGeometry = isNear(curX, curY, startX, startY);
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
            closedByGeometry = isNear(curX, curY, startX, startY);
        } else if (up === "A") {
            const rx = v[0];
            const ry = v[1];
            // Profile mapping mirrors X (x -> cx - x), so arc handedness flips.
            const rot = -v[2];
            const largeArc = !!v[3];
            const sweep = !v[4];
            const x = rel ? curX + v[5] : v[5];
            const y = rel ? curY + v[6] : v[6];
            if (!isNear(curX, curY, x, y)) {
                const dx = x - curX;
                const dy = y - curY;
                const dist = Math.hypot(dx, dy);
                // OpenCASCADE MakePipeShell can fail or twist on exactly 180-degree arcs (pole degeneracy).
                // Automatically split exact semi-circles into two 90-degree arcs to ensure robust parameterization.
                if (Math.abs(dist - 2 * rx) < 1e-3 && Math.abs(rx - ry) < 1e-3) {
                    const cx_arc = (curX + x) / 2;
                    const cy_arc = (curY + y) / 2;
                    const v1x = curX - cx_arc;
                    const v1y = curY - cy_arc;
                    const origSweep = v[4];
                    const midX = cx_arc + (origSweep === 1 ? -v1y : v1y);
                    const midY = cy_arc + (origSweep === 1 ? v1x : -v1x);
                    
                    sketch = sketch.ellipseTo(toXZ(midX, midY), rx, ry, rot, false, sweep);
                    sketch = sketch.ellipseTo(toXZ(x, y), rx, ry, rot, false, sweep);
                } else {
                    sketch = sketch.ellipseTo(toXZ(x, y), rx, ry, rot, largeArc, sweep);
                }
            }
            curX = x;
            curY = y;
            closedByGeometry = isNear(curX, curY, startX, startY);
            prevC2X = prevC2Y = prevQX = prevQY = null;
        } else if (up === "Z") {
            sawZ = true;
            // Preserve whether geometry was already closed before Z.
            // If not, close() must add the missing terminal segment.
            closedByGeometry = isNear(curX, curY, startX, startY);
            curX = startX;
            curY = startY;
            prevC2X = prevC2Y = prevQX = prevQY = null;
        }
    }

    if (!sketch) return null;
    const finalSketch = sawZ ? (closedByGeometry ? sketch.done() : sketch.close()) : (closedByGeometry ? sketch.done() : sketch.close());

    let area = 0;
    for (let i = 0; i < boundsCloud.length; i++) {
        const p1 = toXZ(boundsCloud[i].x, boundsCloud[i].y);
        const next = boundsCloud[(i + 1) % boundsCloud.length];
        const p2 = toXZ(next.x, next.y);
        area += p1[0] * p2[1] - p2[0] * p1[1];
    }
    finalSketch.__signedArea = area / 2;

    return finalSketch;
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

function mapSvgPointToWorldXY(point, bboxRef, panelAnchor = "top-left", depth = 0, panelThickness = appConfig.panel.thickness) {
    if (!point || !bboxRef) return null;
    const px = Number(point.x);
    const py = Number(point.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

    const centerX = bboxRef.x + bboxRef.width / 2;
    const topY = bboxRef.y;
    const bottomY = bboxRef.y + bboxRef.height;
    const flipY = panelAnchor !== "bottom-left";

    const worldX = px - centerX;
    const worldY = flipY ? (bottomY - py) : (py - topY);
    const halfThickness = panelThickness / 2;
    const worldZ = panelAnchor === "top-left"
        ? halfThickness - depth
        : panelAnchor === "bottom-left"
            ? -halfThickness - depth
            : 0;

    return [worldX, worldY, worldZ];
}

function normalizeWorldVector3(vec, eps = 1e-8) {
    if (!Array.isArray(vec) || vec.length < 3) return null;
    const x = Number(vec[0]);
    const y = Number(vec[1]);
    const z = Number(vec[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    const len = Math.hypot(x, y, z);
    if (!Number.isFinite(len) || len <= eps) return null;
    return [x / len, y / len, z / len];
}

function getPerpendicularAxisFromTangentXY(tangent, eps = 1e-8) {
    const normTangent = normalizeWorldVector3(tangent, eps);
    if (!normTangent) return null;

    const tx = Number(normTangent[0]);
    const ty = Number(normTangent[1]);
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null;

    const perp = [-ty, tx, 0];
    return normalizeWorldVector3(perp, eps);
}

function dot3(a, b) {
    return Number(a?.[0] ?? 0) * Number(b?.[0] ?? 0)
        + Number(a?.[1] ?? 0) * Number(b?.[1] ?? 0)
        + Number(a?.[2] ?? 0) * Number(b?.[2] ?? 0);
}

function cross3(a, b) {
    return [
        Number(a?.[1] ?? 0) * Number(b?.[2] ?? 0) - Number(a?.[2] ?? 0) * Number(b?.[1] ?? 0),
        Number(a?.[2] ?? 0) * Number(b?.[0] ?? 0) - Number(a?.[0] ?? 0) * Number(b?.[2] ?? 0),
        Number(a?.[0] ?? 0) * Number(b?.[1] ?? 0) - Number(a?.[1] ?? 0) * Number(b?.[0] ?? 0),
    ];
}

function rotateVectorAroundAxis(v, axis, angleRad) {
    const k = normalizeWorldVector3(axis);
    if (!k) return normalizeWorldVector3(v);
    const vec = normalizeWorldVector3(v);
    if (!vec) return null;

    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const kDotV = dot3(k, vec);
    const kCrossV = cross3(k, vec);

    return normalizeWorldVector3([
        vec[0] * cosA + kCrossV[0] * sinA + k[0] * kDotV * (1 - cosA),
        vec[1] * cosA + kCrossV[1] * sinA + k[1] * kDotV * (1 - cosA),
        vec[2] * cosA + kCrossV[2] * sinA + k[2] * kDotV * (1 - cosA),
    ]);
}

function getOpenContourTerminalFramesWorld(segments, pathData, bboxRef, panelAnchor = "top-left", depth = 0, panelThickness = appConfig.panel.thickness) {
    const eps = 1e-8;

    const toFrame = (startPoint, endPoint, reverseTangent = false) => {
        const startWorld = mapSvgPointToWorldXY(startPoint, bboxRef, panelAnchor, depth, panelThickness);
        const endWorld = mapSvgPointToWorldXY(endPoint, bboxRef, panelAnchor, depth, panelThickness);
        if (!startWorld || !endWorld) return null;
        const dir = reverseTangent
            ? [startWorld[0] - endWorld[0], startWorld[1] - endWorld[1], 0]
            : [endWorld[0] - startWorld[0], endWorld[1] - startWorld[1], 0];
        const tangent = normalizeWorldVector3(dir, eps);
        if (!tangent) return null;
        return { point: reverseTangent ? endWorld : startWorld, tangent };
    };

    if (Array.isArray(segments) && segments.length > 0) {
        let firstSeg = null;
        for (const seg of segments) {
            const sx = Number(seg?.start?.x);
            const sy = Number(seg?.start?.y);
            const ex = Number(seg?.end?.x);
            const ey = Number(seg?.end?.y);
            if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(ex) || !Number.isFinite(ey)) continue;
            if (Math.hypot(ex - sx, ey - sy) <= eps) continue;
            firstSeg = seg;
            break;
        }

        let lastSeg = null;
        for (let i = segments.length - 1; i >= 0; i -= 1) {
            const seg = segments[i];
            const sx = Number(seg?.start?.x);
            const sy = Number(seg?.start?.y);
            const ex = Number(seg?.end?.x);
            const ey = Number(seg?.end?.y);
            if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(ex) || !Number.isFinite(ey)) continue;
            if (Math.hypot(ex - sx, ey - sy) <= eps) continue;
            lastSeg = seg;
            break;
        }

        if (firstSeg && lastSeg) {
            const startFrame = toFrame(firstSeg.start, firstSeg.end, false);
            const endFrame = toFrame(lastSeg.start, lastSeg.end, true);
            if (startFrame && endFrame) {
                return {
                    startPoint: startFrame.point,
                    startTangent: startFrame.tangent,
                    endPoint: endFrame.point,
                    endTangent: endFrame.tangent,
                };
            }
        }
    }

    const sampled = sampleSvgPathPoints(pathData, getAdaptiveSvgPathSampleStep(pathData, 5));
    if (!Array.isArray(sampled) || sampled.length < 2) return null;

    const startFrame = toFrame(sampled[0], sampled[1], false);
    const endFrame = toFrame(sampled[sampled.length - 2], sampled[sampled.length - 1], true);
    if (!startFrame || !endFrame) return null;

    return {
        startPoint: startFrame.point,
        startTangent: startFrame.tangent,
        endPoint: endFrame.point,
        endTangent: endFrame.tangent,
    };
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
        this._renderFailureStreak = 0;
        this._lastRenderErrorAt = 0;
        this._lastRenderErrorKey = "";
        this._lastWarnAt = 0;
        this._lastWarnKey = "";
        this._bitSweepCache = new Map();
        this._bitSweepCacheStats = { hits: 0, misses: 0 };
        this._lastBuildBitSignatures = [];
        this._lastBitSignatureById = new Map();
        this._lastCsgSignature = null;
        this._lastCsgShape = null;
        this._shapeMeshCache = new WeakMap();
        this._shapeMeshHQCache = new WeakMap();

        this.log.info("ReplicadCanvasModule created");
    }

    _formatRenderError(err) {
        if (typeof err === "number") {
            return `OCCT numeric error: ${err}`;
        }
        if (typeof err === "string") {
            return err;
        }
        if (err?.message) {
            return err.message;
        }
        try {
            return JSON.stringify(err);
        } catch {
            return String(err);
        }
    }

    _logRenderErrorThrottled(context, err, extra = null) {
        const now = Date.now();
        const summary = this._formatRenderError(err);
        const key = `${context}:${summary}`;
        if (context === "_addShapeMesh.shape.mesh failed" && now - this._lastRenderErrorAt < 1500) {
            return;
        }
        const isRepeat = this._lastRenderErrorKey === key;
        const tooSoon = now - this._lastRenderErrorAt < 1200;
        if (isRepeat && tooSoon) return;

        this._lastRenderErrorAt = now;
        this._lastRenderErrorKey = key;

        if (extra) {
            this.log.error(`${context}: ${summary}`, extra);
        } else {
            this.log.error(`${context}: ${summary}`);
        }
    }

    _isShapeMeshable(shape) {
        return Boolean(shape && typeof shape.mesh === "function");
    }

    _canTessellateShape(shape, {
        silent = true,
        tessOpts = { tolerance: 1.2, angularTolerance: 45 },
        diagnostics = null,
    } = {}) {
        const diag = diagnostics && typeof diagnostics === "object" ? diagnostics : null;
        if (!this._isShapeMeshable(shape)) {
            if (diag) {
                diag.ok = false;
                diag.reason = "no-mesh-fn";
            }
            return false;
        }

        const cached = this._shapeMeshCache.get(shape);
        if (cached?.vertices?.length) {
            if (diag) {
                diag.ok = true;
                diag.reason = "cache";
                diag.vertexCount = Math.floor((cached.vertices?.length || 0) / 3);
            }
            return true;
        }

        try {
            const probe = shape.mesh(tessOpts);
            if (probe?.vertices?.length) {
                this._shapeMeshCache.set(shape, probe);
                if (diag) {
                    diag.ok = true;
                    diag.reason = "mesh-ok";
                    diag.vertexCount = Math.floor((probe.vertices?.length || 0) / 3);
                }
                return true;
            }
            if (diag) {
                diag.ok = false;
                diag.reason = "no-vertices";
            }
            if (!silent) {
                this.log.warn("Shape tessellation probe returned no vertices", { tessOpts });
            }
            return false;
        } catch (err) {
            if (diag) {
                diag.ok = false;
                diag.reason = "mesh-throw";
                diag.error = this._formatRenderError(err);
            }
            if (!silent) {
                this._logRenderErrorThrottled("_canTessellateShape.shape.mesh failed", err, { tessOpts });
            }
            return false;
        }
    }

    _logWarnThrottled(context, payload = null, windowMs = 1600) {
        const now = Date.now();
        const key = `${context}:${JSON.stringify(payload || {})}`;
        if (this._lastWarnKey === key && now - this._lastWarnAt < windowMs) return;
        this._lastWarnAt = now;
        this._lastWarnKey = key;
        if (payload) this.log.warn(context, payload);
        else this.log.warn(context);
    }

    _getBitId(bit, bitIndex) {
        // Use per-canvas-instance identity first to avoid collisions between
        // multiple placements of the same library bit (same bitData.id).
        return String(
            bit?.operationNumber
            ?? bit?.number
            ?? bit?.id
            ?? `${bitIndex}:${bit?.bitData?.id ?? (bit?.name || "unknown")}`
        );
    }

    _signatureFromContour(contour, options = {}) {
        const {
            includeDepth = true,
        } = options;
        if (!contour) return "none";
        const pathData = contour.pathData ? String(contour.pathData) : "";
        const pathHash = pathData ? fastHashString(pathData) : "no-path";
        const segCount = Array.isArray(contour.pathSegments) ? contour.pathSegments.length : 0;
        const meta = [
            contour.bitIndex,
            contour.operation,
            contour.pass,
            contour.passIndex,
            includeDepth ? contour.depth : "depth-agnostic",
            contour.isWorkOffset ? 1 : 0,
            contour.for3D ? 1 : 0,
            contour.isPOMain ? 1 : 0,
            segCount,
            pathHash,
        ];
        return meta.join("|");
    }

    _buildBitSweepCacheKey(bit, bitIndex, op, contours, bboxRef, panelT, panelAnchor, options = {}) {
        const {
            includeBitDepth = true,
            includeContourDepth = true,
        } = options;
        const bitData = bit?.bitData || {};
        const profileHash = fastHashString(bitData?.profileSvg || bitData?.profilePath || "");
        const contourSig = contours
            .map((contour) => this._signatureFromContour(contour, { includeDepth: includeContourDepth }))
            .sort()
            .join(";");
        const bboxSig = bboxRef
            ? [bboxRef.x, bboxRef.y, bboxRef.width, bboxRef.height].map((n) => Number(n || 0).toFixed(3)).join(",")
            : "no-bbox";

        return [
            `i:${bitIndex}`,
            `op:${op}`,
            `csg:${this._showPart ? 1 : 0}`,
            `name:${bit?.name || "unknown"}`,
            `y:${includeBitDepth ? Number(bit?.y ?? 0).toFixed(4) : "depth-agnostic"}`,
            `d:${Number(bitData?.diameter ?? 0).toFixed(4)}`,
            `a:${Number(bitData?.angle ?? 0).toFixed(4)}`,
            `panelT:${Number(panelT ?? 0).toFixed(4)}`,
            `anchor:${panelAnchor}`,
            `bbox:${bboxSig}`,
            `profile:${profileHash}`,
            `contours:${fastHashString(contourSig)}`,
        ].join("#");
    }

    _extractVcPassDepthMap(contours, bitY = 0) {
        const vcContours = (Array.isArray(contours) ? contours : []).filter((contour) => !contour?.isWorkOffset);
        const depthMap = new Map();
        for (let i = 0; i < vcContours.length; i++) {
            const contour = vcContours[i];
            const passIndex = Number.isFinite(contour?.passIndex)
                ? contour.passIndex
                : Number.isFinite(contour?.pass)
                    ? contour.pass
                    : i;
            const depth = Number.isFinite(contour?.depth) ? contour.depth : bitY;
            depthMap.set(passIndex, depth);
        }
        return depthMap;
    }

    _groupBitShapeEntriesById(entries) {
        const grouped = new Map();
        for (const entry of entries || []) {
            const bitId = this._getBitId(entry?.bit, 0);
            if (!grouped.has(bitId)) grouped.set(bitId, []);
            grouped.get(bitId).push(entry);
        }
        return grouped;
    }

    _resolveExportModule() {
        return (
            window?.dependencyContainer?.get?.("export") ||
            window?.app?.container?.get?.("export") ||
            null
        );
    }

    /**
     * Build the preferred spine candidate for CSG + zero-offset contours.
     * Uses path-level outward offset (-0.01 by sign convention) to avoid coincident faces.
     * @param {string} pathData
     * @param {{x:number,y:number,width:number,height:number}} bboxRef
     * @param {*} Sketcher
     * @param {{panelAnchor:string,depth:number,panelThickness:number}} options
     * @returns {{mode:string, sketch:object}|null}
     */
    _buildCsgZeroOffsetOutsetCandidate(pathData, bboxRef, Sketcher, {
        panelAnchor,
        depth,
        panelThickness,
    }) {
        const exportModule = this._resolveExportModule();
        const outsetPathData = buildOutsetPathData(pathData, 0.01, exportModule);
        const hasActualOutset = String(outsetPathData || "").trim() !== String(pathData || "").trim();
        if (!hasActualOutset) return null;

        const outsetSketch = buildSketchFromSvgPathCommands(
            outsetPathData,
            bboxRef,
            Sketcher,
            {
                close: true,
                plane: "XY",
                panelAnchor,
                depth,
                panelThickness,
                applyDepthForXY: true,
            }
        );
        if (!outsetSketch?.wire) return null;

        return {
            mode: "commands-analytic-outset+0.01",
            sketch: outsetSketch,
        };
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
        const perfTrace = Boolean(window?.__replicadPerfTrace);
        const tUpdateStart = perfTrace ? performance.now() : 0;

        try {
            await this._lazyInit();
            this._ensureRenderer();
            const tInitDone = perfTrace ? performance.now() : 0;

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

            const previousPanelShape = this.panelShape;
            const nextPanelShape = this._buildPanel(panelW, panelH, panelT, this._bboxRef);
            if (nextPanelShape) {
                this.panelShape = nextPanelShape;
            } else if (previousPanelShape) {
                this.panelShape = previousPanelShape;
                this._logWarnThrottled("Panel rebuild failed, reusing previous panel shape", {
                    panel: `${panelW}x${panelH}x${panelT}`,
                });
            } else {
                return;
            }
            const tPanelDone = perfTrace ? performance.now() : 0;

            this.bitShapes = this._buildAllBits(
                bits,
                offsetContours,
                this._bboxRef,
                panelW,
                panelH,
                panelT,
                panelAnchor,
                changedBitIds,
            );
            const tBitsDone = perfTrace ? performance.now() : 0;

            if (this._showPart && this.bitShapes.length > 0) {
                this._applyCSG();
            } else {
                this.currentShape = this.panelShape;
                this._renderPanelAndPaths(bits, offsetContours, this._bboxRef, panelAnchor);
            }

            if (perfTrace) {
                const tRenderDone = performance.now();
                this.log.info("Replicad perf", {
                    changedBitIds,
                    lazyInitMs: Math.round(tInitDone - tUpdateStart),
                    panelMs: Math.round(tPanelDone - tInitDone),
                    bitsMs: Math.round(tBitsDone - tPanelDone),
                    renderOrCsgMs: Math.round(tRenderDone - tBitsDone),
                    totalMs: Math.round(tRenderDone - tUpdateStart),
                    cacheHits: this._bitSweepCacheStats.hits,
                    cacheMisses: this._bitSweepCacheStats.misses,
                });
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

    _buildAllBits(bits, offsetContours, bboxRef, panelW, panelH, panelT, panelAnchor, changedBitIds = null) {
        const results = [];
        const usedCacheKeys = new Set();
        const bitSignatures = [];
        const changedSet = changedBitIds
            ? new Set((Array.isArray(changedBitIds) ? changedBitIds : [changedBitIds]).map((id) => String(id)))
            : null;
        const prevEntriesById = this._groupBitShapeEntriesById(this.bitShapes);
        const perfTrace = Boolean(window?.__replicadPerfTrace);
        const tBuildStart = perfTrace ? performance.now() : 0;
        let builtCount = 0;
        let reusedPrevCount = 0;
        let cacheHitCount = 0;
        let cacheMissCount = 0;
        let skippedCount = 0;
        for (let i = 0; i < bits.length; i++) {
            const bit = bits[i];
            const tBitStart = perfTrace ? performance.now() : 0;
            try {
                // Contours for this specific bit only
                const bitId = this._getBitId(bit, i);
                const contours = offsetContours.filter((c) => {
                    if (!c) return false;
                    const contourBitId = c.bitId !== undefined && c.bitId !== null ? String(c.bitId) : null;
                    if (contourBitId && contourBitId === bitId) return true;
                    return c.bitIndex === i;
                });
                if (!contours.length) {
                    skippedCount += 1;
                    continue;
                }

                const op = (bit.operation || "AL").toUpperCase();
                const depthInsensitive = op === "AL" || op === "PO" || op === "VC";
                const cacheKey = this._buildBitSweepCacheKey(
                    bit,
                    i,
                    op,
                    contours,
                    bboxRef,
                    panelT,
                    panelAnchor,
                    {
                        includeBitDepth: !depthInsensitive,
                        includeContourDepth: !depthInsensitive,
                    }
                );
                const csgBitSignature = this._buildBitSweepCacheKey(
                    bit,
                    i,
                    op,
                    contours,
                    bboxRef,
                    panelT,
                    panelAnchor,
                    {
                        includeBitDepth: true,
                        includeContourDepth: true,
                    }
                );
                const libraryBitId = bit?.bitData?.id !== undefined && bit?.bitData?.id !== null
                    ? String(bit.bitData.id)
                    : null;
                const prevEntries = prevEntriesById.get(bitId);
                const prevSignature = this._lastBitSignatureById.get(bitId);
                const unchangedBySignature = prevSignature === csgBitSignature;
                usedCacheKeys.add(cacheKey);
                bitSignatures.push(`${bitId}:${csgBitSignature}`);

                const changedById = changedSet
                    ? (changedSet.has(bitId) || (libraryBitId ? changedSet.has(libraryBitId) : false))
                    : false;

                // Reuse previous shape only when BOTH conditions are met:
                //  a) The bit was not explicitly flagged as changed (changedSet path), AND
                //  b) Its computed signature matches the last-known signature (geometry/position
                //     didn't change since the last build).
                //
                // The second condition prevents a "phantom stale shape" bug: if a concurrent
                // update modifies a bit while a changedBitIds-scoped build is in flight, that
                // bit would be excluded from changedSet (not in the list). Without the
                // signature guard we would push the NEW signature into _lastBitSignatureById
                // for an OLD shape, causing the subsequent full-rebuild (pending update) to
                // also see "unchanged signature" and skip the rebuild permanently.
                const shouldReusePreviousDirectly =
                    (changedSet && !changedById && unchangedBySignature)
                    || (!changedSet && unchangedBySignature);

                if (shouldReusePreviousDirectly && Array.isArray(prevEntries) && prevEntries.length > 0) {
                    reusedPrevCount += 1;
                    for (const entry of prevEntries) {
                        results.push({ bit, shape: entry.shape, operation: op });
                    }
                    if (perfTrace) {
                        this.log.info("Replicad bit build", {
                            bitId,
                            bitName: bit?.name,
                            operation: op,
                            mode: "reuse-previous",
                            contours: contours.length,
                            ms: Math.round(performance.now() - tBitStart),
                        });
                    }
                    continue;
                }

                const cachedShapes = this._bitSweepCache.get(cacheKey);
                const cachedItems = Array.isArray(cachedShapes?.items) ? cachedShapes.items : [];
                if (cachedItems.length > 0) {
                    this._bitSweepCacheStats.hits += 1;
                    cacheHitCount += 1;
                    const translatedItems = [];

                    if (cachedShapes?.kind === "single") {
                        const oldDepth = Number(cachedShapes?.depth ?? 0);
                        const newDepth = Number(bit?.y ?? 0);
                        const oldZ = this._getSurfaceDepthZ(oldDepth, panelAnchor, panelT);
                        const newZ = this._getSurfaceDepthZ(newDepth, panelAnchor, panelT);
                        const deltaZ = newZ - oldZ;
                        for (const item of cachedItems) {
                            const shifted = Math.abs(deltaZ) > 1e-6
                                ? item.shape.translate(0, 0, deltaZ)
                                : item.shape;
                            translatedItems.push({ ...item, shape: shifted });
                        }
                    } else if (cachedShapes?.kind === "vc-passes") {
                        const depthMap = this._extractVcPassDepthMap(contours, Number(bit?.y ?? 0));
                        for (const item of cachedItems) {
                            const oldDepth = Number(item?.depth ?? 0);
                            const nextDepth = depthMap.has(item.passIndex)
                                ? Number(depthMap.get(item.passIndex))
                                : oldDepth;
                            const oldZ = this._getSurfaceDepthZ(oldDepth, panelAnchor, panelT);
                            const newZ = this._getSurfaceDepthZ(nextDepth, panelAnchor, panelT);
                            const deltaZ = newZ - oldZ;
                            const shifted = Math.abs(deltaZ) > 1e-6
                                ? item.shape.translate(0, 0, deltaZ)
                                : item.shape;
                            translatedItems.push({ ...item, shape: shifted, depth: nextDepth });
                        }
                    } else {
                        translatedItems.push(...cachedItems);
                    }

                    for (const item of translatedItems) {
                        results.push({ bit, shape: item.shape, operation: op });
                    }

                    this._bitSweepCache.set(cacheKey, {
                        ...cachedShapes,
                        items: translatedItems,
                        depth: Number(bit?.y ?? 0),
                    });
                    if (perfTrace) {
                        this.log.info("Replicad bit build", {
                            bitId,
                            bitName: bit?.name,
                            operation: op,
                            mode: "cache-hit",
                            contours: contours.length,
                            ms: Math.round(performance.now() - tBitStart),
                        });
                    }
                    continue;
                }

                this._bitSweepCacheStats.misses += 1;
                cacheMissCount += 1;
                let shape;
                if (op === "VC") {
                    shape = this._buildVC(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor);
                } else if (op === "PO") {
                    shape = this._buildPO(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor);
                } else if (op === "AR") {
                    shape = this._buildAR(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor);
                } else {
                    shape = this._buildAL(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor);
                }

                const builtItems = [];
                if (Array.isArray(shape)) {
                    for (const passShape of shape) {
                        const passItem = passShape?.shape ? passShape : { shape: passShape };
                        if (!passItem?.shape) continue;
                        if (!this._isShapeMeshable(passItem.shape)) {
                            this.log.warn("Skipping non-meshable VC pass shape", {
                                bitName: bit?.name,
                                operation: op,
                            });
                            continue;
                        }
                        builtItems.push({
                            shape: passItem.shape,
                            passIndex: Number.isFinite(passItem.passIndex) ? passItem.passIndex : null,
                            depth: Number.isFinite(passItem.depth) ? passItem.depth : Number(bit?.y ?? 0),
                        });
                        results.push({ bit, shape: passItem.shape, operation: op });
                        builtCount += 1;
                    }
                } else if (shape) {
                    if (!this._isShapeMeshable(shape)) {
                        this.log.warn("Skipping non-meshable bit shape", {
                            bitName: bit?.name,
                            operation: op,
                        });
                        continue;
                    }
                    builtItems.push({
                        shape,
                        passIndex: null,
                        depth: Number(bit?.y ?? 0),
                    });
                    results.push({ bit, shape, operation: op });
                    builtCount += 1;
                }

                if (builtItems.length > 0) {
                    this._bitSweepCache.set(cacheKey, {
                        kind: op === "VC" ? "vc-passes" : "single",
                        depth: Number(bit?.y ?? 0),
                        items: builtItems,
                    });
                } else if (Array.isArray(prevEntries) && prevEntries.length > 0) {
                    // Fail-safe: keep previously valid geometry for this bit when rebuild fails.
                    this._logWarnThrottled("Bit rebuild failed, reusing previous geometry", {
                        bitId,
                        bitName: bit?.name,
                        operation: op,
                    });
                    for (const entry of prevEntries) {
                        results.push({ bit, shape: entry.shape, operation: op });
                    }
                }

                if (perfTrace) {
                    this.log.info("Replicad bit build", {
                        bitId,
                        bitName: bit?.name,
                        operation: op,
                        mode: builtItems.length > 0 ? "rebuilt" : "reused-or-skipped",
                        contours: contours.length,
                        ms: Math.round(performance.now() - tBitStart),
                    });
                }
            } catch (err) {
                this.log.error(`_buildAllBits[${i}] (${bit.name}) failed:`, err);
                const bitId = this._getBitId(bit, i);
                const prevEntries = prevEntriesById.get(bitId);
                if (Array.isArray(prevEntries) && prevEntries.length > 0) {
                    this._logWarnThrottled("Bit exception, reusing previous geometry", {
                        bitId,
                        bitName: bit?.name,
                        operation: bit?.operation,
                        message: err?.message,
                    });
                    for (const entry of prevEntries) {
                        results.push({ bit, shape: entry.shape, operation: (bit.operation || "AL").toUpperCase() });
                    }
                }
            }
        }

        if (perfTrace) {
            this.log.info("Replicad bit build summary", {
                bits: bits.length,
                builtCount,
                reusedPrevCount,
                cacheHitCount,
                cacheMissCount,
                skippedCount,
                totalMs: Math.round(performance.now() - tBuildStart),
            });
        }

        for (const key of Array.from(this._bitSweepCache.keys())) {
            if (!usedCacheKeys.has(key)) this._bitSweepCache.delete(key);
        }

        const deduped = [];
        const seenShapes = new Set();
        for (const entry of results) {
            const shape = entry?.shape;
            if (!shape) continue;
            if (seenShapes.has(shape)) continue;
            seenShapes.add(shape);
            deduped.push(entry);
        }

        this._lastBuildBitSignatures = bitSignatures;
        this._lastBitSignatureById = new Map(
            bitSignatures.map((entry) => {
                const sep = entry.indexOf(":");
                return sep >= 0
                    ? [entry.slice(0, sep), entry.slice(sep + 1)]
                    : [entry, entry];
            })
        );

        return deduped;
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

    _isContourClosed(contour, pathData = "") {
        const explicitClosed = contour?.closed;
        if (typeof explicitClosed === "boolean") return explicitClosed;

        const candidates = Array.isArray(contour?.offsetEngineContours)
            ? contour.offsetEngineContours.filter((entry) => Array.isArray(entry?.segments) && entry.segments.length > 0)
            : [];
        if (candidates.length > 0) {
            const closedCandidate = candidates.find((entry) => typeof entry?.closed === "boolean");
            if (closedCandidate && typeof closedCandidate.closed === "boolean") {
                return closedCandidate.closed;
            }
        }

        const normalizedPath = String(pathData || contour?.pathData || "").trim();
        if (!normalizedPath) return false;
        return /[Zz]\s*$/.test(normalizedPath);
    }

    _getSurfaceDepthZ(depth, panelAnchor = "top-left", panelThickness = appConfig.panel.thickness) {
        const halfThickness = panelThickness / 2;
        if (panelAnchor === "top-left") return halfThickness - depth;
        if (panelAnchor === "bottom-left") return -halfThickness - depth;
        return 0;
    }

    _buildProfileSketch(bitData, pathZ, profileOrigin = null) {
        const { Sketcher } = _replicad;
        let profilePath = String(bitData?.profilePath || "").trim();
        const origin = Array.isArray(profileOrigin) && profileOrigin.length === 3
            ? profileOrigin
            : [0, 0, pathZ];

        if (profilePath) {
            try {
                let commands = parseSvgCommands(profilePath);
                commands = normalizeSvgStartPoint(commands);
                profilePath = commandsToPathData(commands);
            } catch (errNorm) {
                console.warn("[ReplicadCanvasModule] Failed to normalize SVG start point", errNorm);
            }

            // Prefer analytic SVG command reconstruction first to preserve true arcs.
            // Canonical sampled polyline is a fallback only when analytic build fails.
            let profileSketch = buildProfileSketchFromPathData(profilePath, Sketcher, pathZ, origin)
                || buildCanonicalProfileSketchFromPathData(profilePath, Sketcher, pathZ, origin);
            
            if (profileSketch) {
                // MakePipeShell requires the profile's outer wire to be CCW (Counter-Clockwise).
                // CW wires act as holes and cause inverted/failed sweeps (especially with RoundCorner).
                if (typeof profileSketch.__signedArea === "number" && profileSketch.__signedArea < 0) {
                    try {
                        const commands = parseSvgCommands(profilePath);
                        const reversedCommands = reverseSvgCommands(commands);
                        const reversedPathData = commandsToPathData(reversedCommands);
                        
                        const reversedSketch = buildProfileSketchFromPathData(reversedPathData, Sketcher, pathZ, origin)
                            || buildCanonicalProfileSketchFromPathData(reversedPathData, Sketcher, pathZ, origin);
                            
                        if (reversedSketch) {
                            profileSketch = reversedSketch;
                        }
                    } catch (errRev) {
                        console.warn("[ReplicadCanvasModule] Failed to reverse CW SVG profile path", errRev);
                    }
                }
                return profileSketch;
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
            return prof.done();
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

        return profile.close();
    }

    _buildProfileWire(bitData, pathZ, profileOrigin = null) {
        const profileSketch = this._buildProfileSketch(bitData, pathZ, profileOrigin);
        return profileSketch?.wire || null;
    }

    _buildHalfProfileSketchForRevolve(bitData, pathZ, profileOrigin = null) {
        const { Sketcher } = _replicad;
        const origin = Array.isArray(profileOrigin) && profileOrigin.length === 3
            ? profileOrigin
            : [0, 0, pathZ];

        const profileSource = String(bitData?.profileSvg || bitData?.profilePath || "").trim();
        const fallbackRadius = Math.max(0.1, Number(bitData?.diameter ?? 10) / 2);

        const _makeFallback = () =>
            new Sketcher("XZ", origin)
                .movePointerTo([0, 0])
                .lineTo([fallbackRadius, 0])
                .lineTo([fallbackRadius, fallbackRadius])
                .lineTo([0, fallbackRadius])
                .close();

        if (!profileSource) return _makeFallback();

        // ── Compute bounding box via sampling ──────────────────────────────
        const sampledCloud = parseProfilePointsFromPathData(profileSource);
        if (sampledCloud.length < 3) return _makeFallback();

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of sampledCloud) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        const cx      = (minX + maxX) / 2;   // profile horizontal centre in SVG space
        const anchorY = minY;                  // bottom reference
        const yMaxLoc = maxY - anchorY;        // top in local coords

        // Transform SVG → local XZ:  x_local = cx − x,  y_local = y − anchorY
        // Points with x_local ≥ 0 (x ≤ cx) form the RIGHT HALF for revolve.
        const toXZ  = (x, y) => [cx - Number(x), Number(y) - anchorY];
        const xLoc  = (x)    => cx - Number(x);   // scalar helper
        const yLoc  = (y)    => Number(y) - anchorY;
        const isNear = (ax, ay, bx, by, eps = 1e-6) =>
            Math.abs(ax - bx) <= eps && Math.abs(ay - by) <= eps;

        // ── Parse SVG commands ─────────────────────────────────────────────
        const commands = parseSvgCommands(profileSource);
        if (!commands.length) return _makeFallback();

        // ──────────────────────────────────────────────────────────────────
        // Build a half-profile sketch from the LEFT HALF of the original SVG
        // profile (x ≤ cx in SVG ↔ x_local ≥ 0 after mirror).
        //
        // The tricky part: the M command often starts on the RIGHT side, and
        // straight segments frequently cross the centrelinex = cx.  We handle
        // this with per-segment clipping:
        //
        //  ① outside→inside crossing: initialise sketch at [0, y_cross],
        //    then lineTo the clipped endpoint.
        //  ② inside→outside crossing: lineTo [0, y_cross], then stop
        //    accumulating until we re-enter.
        //  ③ entirely inside: use the native curve command (arc / bezier).
        //  ④ entirely outside: skip.
        // ──────────────────────────────────────────────────────────────────

        let sketch = null;
        // Local coordinates of the sketch cursor (mirrors curX/curY in local space)
        let sketchXLoc = null;
        let sketchYLoc = null;

        // SVG cursor in original SVG space
        let curX = 0, curY = 0, startX = 0, startY = 0;
        let prevC2X = null, prevC2Y = null, prevQX = null, prevQY = null;

        // Clamp a value to the half-open range [0, ∞)
        const EPS = 1e-5;
        const inside  = (x) => xLoc(x) >= -EPS;   // x ≤ cx  (right half in local)

        // Linear clip: find intersection of line (x0,y0)→(x1,y1) with x_local=0
        // i.e. x_original = cx. Returns {x:cx, y:interp} or null.
        const lineClipAtCentre = (x0, y0, x1, y1) => {
            const dx = x1 - x0;
            if (Math.abs(dx) < 1e-10) return null; // vertical or degenerate
            const t = (cx - x0) / dx;              // t where x = cx
            if (t < -EPS || t > 1 + EPS) return null;
            return { x: cx, y: y0 + t * (y1 - y0) };
        };

        // Ensure sketch is initialised at a given local position.
        // If sketch exists, add a lineTo; otherwise open it with movePointerTo.
        const ensureAt = (xloc, yloc) => {
            if (sketch === null) {
                sketch       = new Sketcher("XZ", origin).movePointerTo([xloc, yloc]);
                sketchXLoc   = xloc;
                sketchYLoc   = yloc;
            } else if (!isNear(sketchXLoc, sketchYLoc, xloc, yloc)) {
                sketch       = sketch.lineTo([xloc, yloc]);
                sketchXLoc   = xloc;
                sketchYLoc   = yloc;
            }
        };

        for (const entry of commands) {
            const raw = entry.cmd;
            const up  = raw.toUpperCase();
            const rel = raw !== up;
            const v   = entry.values;

            if (up === "Z") {
                curX = startX; curY = startY;
                prevC2X = prevC2Y = prevQX = prevQY = null;
                continue;
            }

            if (up === "M") {
                const x = rel ? curX + v[0] : v[0];
                const y = rel ? curY + v[1] : v[1];
                if (inside(x)) {
                    // If inside, also handle the line from previous cursor position
                    // crossing the centre (so we pick up the enter point if needed).
                    if (sketch === null && !isNear(xLoc(x), 0, 0, 0)) {
                        const clip = lineClipAtCentre(curX, curY, x, y);
                        if (clip) ensureAt(0, yLoc(clip.y));
                    }
                    ensureAt(xLoc(x), yLoc(y));
                }
                curX = x; curY = y; startX = x; startY = y;
                prevC2X = prevC2Y = prevQX = prevQY = null;
                continue;
            }

            // ──────── STRAIGHT LINES ────────────────────────────────────
            if (up === "L" || up === "H" || up === "V") {
                let x = curX, y = curY;
                if (up === "L") { x = rel ? curX + v[0] : v[0]; y = rel ? curY + v[1] : v[1]; }
                else if (up === "H") { x = rel ? curX + v[0] : v[0]; }
                else              { y = rel ? curY + v[0] : v[0]; }

                const wasIn = inside(curX);
                const nowIn = inside(x);

                if (!wasIn && nowIn) {
                    // Entering the valid region — clip at centre
                    const clip = lineClipAtCentre(curX, curY, x, y);
                    const enterX = clip ? 0 : xLoc(x);
                    const enterY = clip ? yLoc(clip.y) : yLoc(y);
                    ensureAt(enterX, enterY);
                    if (!isNear(enterX, enterY, xLoc(x), yLoc(y))) {
                        sketch = sketch.lineTo([xLoc(x), yLoc(y)]);
                        sketchXLoc = xLoc(x); sketchYLoc = yLoc(y);
                    }
                } else if (wasIn && nowIn) {
                    // Staying inside
                    if (sketch === null) ensureAt(xLoc(curX), yLoc(curY));
                    if (!isNear(sketchXLoc, sketchYLoc, xLoc(x), yLoc(y))) {
                        sketch = sketch.lineTo([xLoc(x), yLoc(y)]);
                        sketchXLoc = xLoc(x); sketchYLoc = yLoc(y);
                    }
                } else if (wasIn && !nowIn) {
                    // Leaving the valid region — clip at centre
                    if (sketch === null) ensureAt(xLoc(curX), yLoc(curY));
                    const clip = lineClipAtCentre(curX, curY, x, y);
                    if (clip && !isNear(sketchXLoc, sketchYLoc, 0, yLoc(clip.y))) {
                        sketch = sketch.lineTo([0, yLoc(clip.y)]);
                        sketchXLoc = 0; sketchYLoc = yLoc(clip.y);
                    }
                }
                // else: was outside and stays outside → skip

                curX = x; curY = y;
                continue;
            }

            // ──────── CURVES (arcs / beziers) ───────────────────────────
            // For curves we only process them when both the start AND end are
            // inside the valid region (x ≤ cx).  Curves that cross the centre
            // are uncommon in standard bit profiles; when they do occur the
            // missing piece is small and the auto-added centre segments below
            // fill in any visible gap.

            if (up === "C") {
                const c1x = rel ? curX + v[0] : v[0]; const c1y = rel ? curY + v[1] : v[1];
                const c2x = rel ? curX + v[2] : v[2]; const c2y = rel ? curY + v[3] : v[3];
                const x   = rel ? curX + v[4] : v[4]; const y   = rel ? curY + v[5] : v[5];
                if (inside(curX) && inside(x)) {
                    if (sketch === null) ensureAt(xLoc(curX), yLoc(curY));
                    sketch = sketch.cubicBezierCurveTo(toXZ(x, y), toXZ(c1x, c1y), toXZ(c2x, c2y));
                    sketchXLoc = xLoc(x); sketchYLoc = yLoc(y);
                }
                prevC2X = c2x; prevC2Y = c2y; prevQX = prevQY = null;
                curX = x; curY = y;
            } else if (up === "S") {
                const c1x = prevC2X !== null ? 2 * curX - prevC2X : curX;
                const c1y = prevC2Y !== null ? 2 * curY - prevC2Y : curY;
                const c2x = rel ? curX + v[0] : v[0]; const c2y = rel ? curY + v[1] : v[1];
                const x   = rel ? curX + v[2] : v[2]; const y   = rel ? curY + v[3] : v[3];
                if (inside(curX) && inside(x)) {
                    if (sketch === null) ensureAt(xLoc(curX), yLoc(curY));
                    sketch = sketch.cubicBezierCurveTo(toXZ(x, y), toXZ(c1x, c1y), toXZ(c2x, c2y));
                    sketchXLoc = xLoc(x); sketchYLoc = yLoc(y);
                }
                prevC2X = c2x; prevC2Y = c2y; prevQX = prevQY = null;
                curX = x; curY = y;
            } else if (up === "Q") {
                const qx = rel ? curX + v[0] : v[0]; const qy = rel ? curY + v[1] : v[1];
                const x  = rel ? curX + v[2] : v[2]; const y  = rel ? curY + v[3] : v[3];
                if (inside(curX) && inside(x)) {
                    if (sketch === null) ensureAt(xLoc(curX), yLoc(curY));
                    sketch = sketch.quadraticBezierCurveTo(toXZ(x, y), toXZ(qx, qy));
                    sketchXLoc = xLoc(x); sketchYLoc = yLoc(y);
                }
                prevQX = qx; prevQY = qy; prevC2X = prevC2Y = null;
                curX = x; curY = y;
            } else if (up === "T") {
                const qx = prevQX !== null ? 2 * curX - prevQX : curX;
                const qy = prevQY !== null ? 2 * curY - prevQY : curY;
                const x  = rel ? curX + v[0] : v[0]; const y  = rel ? curY + v[1] : v[1];
                if (inside(curX) && inside(x)) {
                    if (sketch === null) ensureAt(xLoc(curX), yLoc(curY));
                    sketch = sketch.quadraticBezierCurveTo(toXZ(x, y), toXZ(qx, qy));
                    sketchXLoc = xLoc(x); sketchYLoc = yLoc(y);
                }
                prevQX = qx; prevQY = qy; prevC2X = prevC2Y = null;
                curX = x; curY = y;
            } else if (up === "A") {
                const rx = v[0], ry = v[1];
                const rot      = -v[2];   // mirror X flips rotation sign
                const largeArc = !!v[3];
                const sweep    = !v[4];   // mirror X flips sweep direction
                const x        = rel ? curX + v[5] : v[5];
                const y        = rel ? curY + v[6] : v[6];
                if (inside(curX) && inside(x) && !isNear(curX, curY, x, y)) {
                    if (sketch === null) ensureAt(xLoc(curX), yLoc(curY));
                    // Split exact 180° arcs to avoid OCC pole degeneracy
                    const dist = Math.hypot(x - curX, y - curY);
                    if (Math.abs(dist - 2 * rx) < 1e-3 && Math.abs(rx - ry) < 1e-3) {
                        const cxArc = (curX + x) / 2, cyArc = (curY + y) / 2;
                        const v1x = curX - cxArc, v1y = curY - cyArc;
                        const origSweep = v[4];
                        const midX = cxArc + (origSweep === 1 ? -v1y : v1y);
                        const midY = cyArc + (origSweep === 1 ? v1x : -v1x);
                        sketch = sketch.ellipseTo(toXZ(midX, midY), rx, ry, rot, false, sweep);
                        sketch = sketch.ellipseTo(toXZ(x, y),        rx, ry, rot, false, sweep);
                    } else {
                        sketch = sketch.ellipseTo(toXZ(x, y), rx, ry, rot, largeArc, sweep);
                    }
                    sketchXLoc = xLoc(x); sketchYLoc = yLoc(y);
                } else if (inside(curX) && !inside(x)) {
                    // Arc starts inside, ends outside — treat as line-segment exit
                    if (sketch === null) ensureAt(xLoc(curX), yLoc(curY));
                    // Approximate by clipping to centre line at current y (conservative)
                    if (sketchXLoc > EPS) {
                        sketch = sketch.lineTo([0, sketchYLoc]);
                        sketchXLoc = 0;
                    }
                } else if (!inside(curX) && inside(x)) {
                    // Arc starts outside, ends inside — initialise at entrance
                    ensureAt(0, yLoc(y));  // approximate: enter at centreline at y of endpoint
                }
                prevC2X = prevC2Y = prevQX = prevQY = null;
                curX = x; curY = y;
            }
        }

        if (!sketch) return _makeFallback();

        // ── Ensure the half-profile is properly closed with centreline segments ──
        // The revolve axis is at x_local = 0.  The sketch must start and end on
        // this axis so that the revolved solid has flat faces at the terminals.
        //
        // If the last traced point is not on the centreline, clip there first.
        if (sketchXLoc !== null && sketchXLoc > EPS) {
            sketch = sketch.lineTo([0, sketchYLoc]);
            sketchXLoc = 0;
        }
        // If not back at y_local = 0, walk down the centreline.
        if (sketchYLoc !== null && Math.abs(sketchYLoc) > EPS) {
            sketch = sketch.lineTo([0, 0]);
            sketchYLoc = 0;
        }

        try {
            return sketch.close();
        } catch {
            return _makeFallback();
        }
    }

    _buildFullRevolveCapAtTerminal(bitData, pathZ, point, tangent, capAngleDeg = 180) {
        const tangentDir = normalizeWorldVector3(tangent);
        if (!tangentDir) return null;

        const tx = Number(tangentDir[0]);
        const ty = Number(tangentDir[1]);

        // Build the half-profile origin 1mm INSIDE the sweep body so that the resulting
        // revolved solid has guaranteed volumetric overlap with the sweep — not just
        // coincident-face touch. OCC fuse is unreliable when shapes merely touch at a plane.
        const overlapMm = 0.01;
        const overlapOrigin = [
            Number(point[0]) + tx * overlapMm,
            Number(point[1]) + ty * overlapMm,
            Number(point[2]),
        ];

        const profileSketch = this._buildHalfProfileSketchForRevolve(bitData, pathZ, overlapOrigin);
        if (!profileSketch) {
            this._logWarnThrottled("Full revolve cap skipped: profile sketch missing", {
                bitName: bitData?.name || null,
            });
            return null;
        }

        let cap = null;
        try {
            const angleNum = Number(capAngleDeg);
            const safeAngle = Number.isFinite(angleNum) && angleNum > 0 && angleNum <= 360
                ? angleNum
                : 180;
            cap = profileSketch.revolve([0, 0, 1], { angle: safeAngle });
        } catch (err) {
            this._logWarnThrottled("Full revolve cap revolve() failed", {
                bitName: bitData?.name || null,
                message: err?.message || String(err),
            });
            cap = null;
        }
        if (!cap) return null;

        // Single-rotation alignment around Z-axis:
        // Maps flat-face normal Y=[0,1,0] → +tangentDir (section plane of terminal).
        // +180° places the dome OUTWARD from the terminal (away from sweep body).
        // The 1mm origin offset guarantees overlap with the sweep for reliable OCC fuse.
        const angleDeg = (Math.atan2(-tx, ty) * 180) / Math.PI + 180;
        return cap.rotate(angleDeg, overlapOrigin, [0, 0, 1]);
    }

    _buildOpenSweepFullRevolveCaps(bit, depth, pathData, segments, bboxRef, panelAnchor, panelT) {
        const terminalFrames = getOpenContourTerminalFramesWorld(
            segments,
            pathData,
            bboxRef,
            panelAnchor,
            depth,
            panelT
        );
        if (!terminalFrames) {
            this._logWarnThrottled("Full revolve caps skipped: no terminal frames", {
                bit: bit?.name || bit?.bitData?.name || null,
                depth,
            });
            return [];
        }

        const pathZ = this._getSurfaceDepthZ(depth, panelAnchor, panelT);
        const configuredAngle = Number(window?.__replicadOpenSweepCapAngleDeg);
        const capAngleDeg = Number.isFinite(configuredAngle) && configuredAngle > 0 && configuredAngle <= 360
            ? configuredAngle
            : 180;
        const caps = [];

        const startCap = this._buildFullRevolveCapAtTerminal(
            bit?.bitData,
            pathZ,
            terminalFrames.startPoint,
            terminalFrames.startTangent,
            capAngleDeg
        );
        if (startCap) caps.push(startCap);

        const endCap = this._buildFullRevolveCapAtTerminal(
            bit?.bitData,
            pathZ,
            terminalFrames.endPoint,
            terminalFrames.endTangent,
            capAngleDeg
        );
        if (endCap) caps.push(endCap);

        if (caps.length === 0) {
            this._logWarnThrottled("Full revolve caps built: none", {
                bit: bit?.name || bit?.bitData?.name || null,
                depth,
            });
        }

        return caps;
    }

    _buildVCProfileWire(bitData, depth, pathZ, profileOrigin = null) {
        const { Sketcher } = _replicad;
        const origin = Array.isArray(profileOrigin) && profileOrigin.length === 3
            ? profileOrigin
            : [0, 0, pathZ];

        const angle = Number(bitData?.angle ?? 90);
        const diameter = Number(bitData?.diameter ?? 10);
        const halfBase = Math.max(0, diameter / 2);
        const halfAngleRad = (angle * Math.PI) / 360;
        const tanHalf = Math.tan(halfAngleRad);
        const depthNum = Math.max(0, Number(depth) || 0);

        if (!Number.isFinite(tanHalf) || tanHalf <= 0 || !Number.isFinite(depthNum) || depthNum <= 0) {
            return this._buildProfileWire(bitData, pathZ, profileOrigin);
        }

        // VC phantom passes must use an effective width derived from pass depth.
        // Full bit profile at shallow depth can create OCC sweep truncation.
        const halfWidth = Math.min(halfBase, depthNum * tanHalf);
        const profileHeight = Math.max(depthNum, 1e-3);

        if (!Number.isFinite(halfWidth) || halfWidth <= 1e-6) {
            return this._buildProfileWire(bitData, pathZ, profileOrigin);
        }

        const profile = new Sketcher("XZ", origin)
            .movePointerTo([0, 0])
            .lineTo([-halfWidth, profileHeight])
            .lineTo([halfWidth, profileHeight])
            .close();

        return profile.wire;
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
            const contourClosed = this._isContourClosed(contour, normalizedPathData);
            const normalizedSummary = summarizeSvgPath(normalizedPathData);
            const contourSegments = this._getContourSegments(contour);
            const contourOffsetDistance = Number(contour?.offsetDistance);
            const isZeroOffsetContour = Number.isFinite(contourOffsetDistance)
                ? Math.abs(contourOffsetDistance) <= 1e-3
                : false;
            const useCsgZeroOffsetOutset = Boolean(this._showPart && isZeroOffsetContour);
            const commandSketchOptions = {
                close: contourClosed,
                plane: "XY",
                panelAnchor,
                depth,
                panelThickness: panelT,
                applyDepthForXY: true,
            };
            const isCornerTool = Number(bit?.bitData?.cornerRadius ?? 0) > 0;
            const normalizedContourSegments = Array.isArray(contourSegments) && contourSegments.length > 0
                ? normalizeSegmentsForSweep(contourSegments, 0.1, {
                    splitSeam: false,
                })
                : contourSegments;

            // G1-healed spine: insert analytical micro-arcs at sharp line→line corners
            // so OCC MakePipeShell never has to build degenerate spheres at discontinuities.
            // micro-radius = max(bitDiameter * 1%, 0.05mm) — invisible, within machining tolerance.
            const bitDiameter = Number(bit?.bitData?.diameter ?? bit?.bitData?.cornerRadius ?? 5);
            const g1MicroRadius = Math.max(bitDiameter * 0.01, 0.05);
            const healedContourSegments = Array.isArray(normalizedContourSegments) && normalizedContourSegments.length > 0
                ? healSpineSegmentsG1(normalizedContourSegments, g1MicroRadius)
                : normalizedContourSegments;
            const traceSweep = Boolean(window?.__replicadSweepTrace);
            const sweepDiag = {
                bit: bit?.name || bit?.bitData?.name || "unknown",
                depth,
                transitionMode,
                candidates: [],
                sweepAttempts: [],
            };
            if (traceSweep) {
                const tracePayload = {
                    bit: sweepDiag.bit,
                    depth: sweepDiag.depth,
                    transitionMode: sweepDiag.transitionMode,
                    sourceSummary: summarizeSvgPath(pathData),
                    normalizedSummary,
                    normalizedChanged: String(pathData || "") !== String(normalizedPathData || ""),
                    hasSegmentSpine: Array.isArray(contourSegments) && contourSegments.length > 0,
                };
                this.log.info("sweep:spine", tracePayload);
                console.info("[ReplicadSweepTrace] sweep:spine", tracePayload);
            }

            const pathSketchCandidates = [];
            let csgZeroOutsetCandidate = null;
            if (useCsgZeroOffsetOutset) {
                try {
                    csgZeroOutsetCandidate = this._buildCsgZeroOffsetOutsetCandidate(
                        normalizedPathData,
                        bboxRef,
                        Sketcher,
                        {
                            panelAnchor,
                            depth,
                            panelThickness: panelT,
                        }
                    );
                    if (csgZeroOutsetCandidate?.sketch?.wire) {
                        sweepDiag.candidates.push({
                            mode: "commands-analytic-outset+0.01",
                            hasWire: true,
                            outset: true,
                            forcedForCsgZeroOffset: true,
                        });
                    }
                } catch {
                    csgZeroOutsetCandidate = null;
                }
            }
            if (Array.isArray(normalizedContourSegments) && normalizedContourSegments.length > 0) {
                if (!isCornerTool) {
                    const originalSegmentDiag = {};
                    let originalSegmentSketch = null;
                    try {
                        originalSegmentSketch = buildSketchFromOffsetSegments(
                            contourSegments,
                            bboxRef,
                            Sketcher,
                            {
                                close: contourClosed,
                                plane: "XY",
                                panelAnchor,
                                depth,
                                panelThickness: panelT,
                                applyDepthForXY: true,
                                strictContinuity: true,
                                strictArcs: true,
                                continuityEps: 1e-3,
                                diagnostics: originalSegmentDiag,
                                removeLoops: true,
                            }
                        );
                    } catch (errSegOriginal) {
                        originalSegmentDiag.failReason = "segments-original-builder-threw";
                        originalSegmentDiag.failDetail = { message: errSegOriginal?.message || String(errSegOriginal) };
                    }
                    sweepDiag.candidates.push({
                        mode: "segments-original",
                        hasWire: Boolean(originalSegmentSketch?.wire),
                        diagnostics: originalSegmentDiag,
                    });
                    pathSketchCandidates.push({ mode: "segments-original", sketch: originalSegmentSketch });
                }

                // G1-healed candidate: spine with micro-arcs at sharp corners.
                // Tried before the raw normalizedContourSegments so OCC gets a G1 spine first.
                if (!isCornerTool && Array.isArray(healedContourSegments) && healedContourSegments.length > 0) {
                    const healedSegmentDiag = {};
                    let healedSegmentSketch = null;
                    try {
                        healedSegmentSketch = buildSketchFromOffsetSegments(
                            healedContourSegments,
                            bboxRef,
                            Sketcher,
                            {
                                close: contourClosed,
                                plane: "XY",
                                panelAnchor,
                                depth,
                                panelThickness: panelT,
                                applyDepthForXY: true,
                                strictContinuity: false,
                                strictArcs: true,
                                continuityEps: 1e-3,
                                diagnostics: healedSegmentDiag,
                                removeLoops: true,
                            }
                        );
                    } catch (errHeal) {
                        healedSegmentDiag.failReason = "segments-g1healed-builder-threw";
                        healedSegmentDiag.failDetail = { message: errHeal?.message || String(errHeal) };
                    }
                    sweepDiag.candidates.push({
                        mode: "segments-g1healed",
                        hasWire: Boolean(healedSegmentSketch?.wire),
                        diagnostics: healedSegmentDiag,
                        g1MicroRadius,
                    });
                    pathSketchCandidates.push({ mode: "segments-g1healed", sketch: healedSegmentSketch });
                }

                const segmentDiag = {};
                let segmentSketch = null;
                try {
                    segmentSketch = buildSketchFromOffsetSegments(
                        normalizedContourSegments,
                        bboxRef,
                        Sketcher,
                        {
                            close: contourClosed,
                            plane: "XY",
                            panelAnchor,
                            depth,
                            panelThickness: panelT,
                            applyDepthForXY: true,
                            strictContinuity: true,
                            strictArcs: true,
                            continuityEps: 1e-3,
                            diagnostics: segmentDiag,
                            removeLoops: true,
                        }
                    );
                } catch (errSegBuild) {
                    segmentDiag.failReason = "segments-builder-threw";
                    segmentDiag.failDetail = { message: errSegBuild?.message || String(errSegBuild) };
                }
                sweepDiag.candidates.push({
                    mode: "segments-closed",
                    hasWire: Boolean(segmentSketch?.wire),
                    diagnostics: segmentDiag,
                });
                pathSketchCandidates.push({ mode: "segments-closed", sketch: segmentSketch });

                const reversedSegmentDiag = {};
                let reversedSegmentSketch = null;
                if (!isCornerTool) {
                    try {
                        const reversedHealedSegments = normalizeSegmentsForSweep(
                            reverseSegmentsForSweep(healedContourSegments ?? normalizedContourSegments),
                            0.1
                        );
                        reversedSegmentSketch = buildSketchFromOffsetSegments(
                            reversedHealedSegments,
                            bboxRef,
                            Sketcher,
                            {
                                close: contourClosed,
                                plane: "XY",
                                panelAnchor,
                                depth,
                                panelThickness: panelT,
                                applyDepthForXY: true,
                                strictContinuity: false,
                                strictArcs: true,
                                continuityEps: 1e-3,
                                diagnostics: reversedSegmentDiag,
                                removeLoops: true,
                            }
                        );
                    } catch (errSegRev) {
                        reversedSegmentDiag.failReason = "segments-reversed-builder-threw";
                        reversedSegmentDiag.failDetail = { message: errSegRev?.message || String(errSegRev) };
                    }
                    sweepDiag.candidates.push({
                        mode: "segments-closed-reversed",
                        hasWire: Boolean(reversedSegmentSketch?.wire),
                        diagnostics: reversedSegmentDiag,
                    });
                    pathSketchCandidates.push({ mode: "segments-closed-reversed", sketch: reversedSegmentSketch });

                    let commandSketch = null;
                    try {
                        commandSketch = buildSketchFromSvgPathCommands(
                            normalizedPathData,
                            bboxRef,
                            Sketcher,
                            commandSketchOptions
                        );
                    } catch {
                        commandSketch = null;
                    }
                    sweepDiag.candidates.push({
                        mode: "commands-closed",
                        hasWire: Boolean(commandSketch?.wire),
                    });
                    pathSketchCandidates.push({ mode: "commands-closed", sketch: commandSketch });
                } else if (normalizedPathData) {
                    // Keep command-based spine only as fallback for corner tools.
                    let commandSketch = null;
                    try {
                        commandSketch = buildSketchFromSvgPathCommands(
                            normalizedPathData,
                            bboxRef,
                            Sketcher,
                            {
                                forceTopologicalClose: contourClosed,
                                ...commandSketchOptions,
                            }
                        );
                    } catch {
                        commandSketch = null;
                    }
                    sweepDiag.candidates.push({
                        mode: "commands-corner-closed",
                        hasWire: Boolean(commandSketch?.wire),
                    });
                    pathSketchCandidates.push({ mode: "commands-corner-closed", sketch: commandSketch });

                    let sampledSketch = null;
                    try {
                        sampledSketch = buildSketchFromSvgPath(
                            normalizedPathData,
                            bboxRef,
                            Sketcher,
                            {
                                close: contourClosed,
                                sampleStep: 1.0,
                                plane: "XY",
                                panelAnchor,
                                depth,
                                panelThickness: panelT,
                                applyDepthForXY: true,
                            }
                        );
                    } catch {
                        sampledSketch = null;
                    }
                    sweepDiag.candidates.push({
                        mode: contourClosed ? "sampled-corner-closed" : "sampled-corner-open",
                        hasWire: Boolean(sampledSketch?.wire),
                    });
                    pathSketchCandidates.push({
                        mode: contourClosed ? "sampled-corner-closed" : "sampled-corner-open",
                        sketch: sampledSketch,
                    });
                }
            } else {
                let sampledSketch = null;
                if (normalizedPathData) {
                    try {
                        sampledSketch = buildSketchFromSvgPath(
                            normalizedPathData,
                            bboxRef,
                            Sketcher,
                            {
                                close: contourClosed,
                                sampleStep: 1.0,
                                plane: "XY",
                                panelAnchor,
                                depth,
                                panelThickness: panelT,
                                applyDepthForXY: true,
                            }
                        );
                    } catch {
                        sampledSketch = null;
                    }
                    sweepDiag.candidates.push({
                        mode: contourClosed ? "sampled-closed" : "sampled-open",
                        hasWire: Boolean(sampledSketch?.wire),
                    });
                    pathSketchCandidates.push({
                        mode: contourClosed ? "sampled-closed" : "sampled-open",
                        sketch: sampledSketch,
                    });
                }

                let commandSketch = null;
                try {
                    commandSketch = buildSketchFromSvgPathCommands(
                        normalizedPathData,
                        bboxRef,
                        Sketcher,
                        commandSketchOptions
                    );
                } catch {
                    commandSketch = null;
                }
                sweepDiag.candidates.push({
                    mode: "commands-analytic",
                    hasWire: Boolean(commandSketch?.wire),
                });
                pathSketchCandidates.push({ mode: "commands-analytic", sketch: commandSketch });
            }

            if (csgZeroOutsetCandidate?.sketch?.wire) {
                // CSG+offset~0: always try modified (-0.01) spine first.
                // Keep other candidates only as fallback when sweep fails.
                pathSketchCandidates.unshift(csgZeroOutsetCandidate);
            }

            let pathSketchCandidatesValid = pathSketchCandidates.filter((c) => !!c?.sketch?.wire);
            if (!pathSketchCandidatesValid.length) {
                this.log.warn("Round-profile sweep has no valid spine candidate", {
                    ...sweepDiag,
                    pathSummary: normalizedSummary,
                    hasSegments: Array.isArray(contourSegments) && contourSegments.length > 0,
                });
                return null;
            }

            const pathZ = this._getSurfaceDepthZ(depth, panelAnchor, panelT);
            // Profile anchor must match the spine candidate start to avoid local frame twist.
            // For corner tools we force segment-based spines, so pin to normalized segment start.
            const profileOrigin = (isCornerTool
                ? getFirstSegmentPointInWorldXY(normalizedContourSegments, bboxRef, panelAnchor, depth, panelT)
                : null)
                ?? getFirstSegmentPointInWorldXY(normalizedContourSegments, bboxRef, panelAnchor, depth, panelT)
                ?? getFirstPathPointInWorldXY(normalizedPathData, bboxRef, panelAnchor, depth, panelT)
                ?? getFirstSegmentPointInWorldXY(contourSegments, bboxRef, panelAnchor, depth, panelT)
                ?? [0, 0, pathZ];
            const profileWire = this._buildProfileWire(bit?.bitData, pathZ, profileOrigin);
            // Sweep options cascade: try the user-requested transition mode first, then
            // progressively more stable fallbacks — all native OCC, no polyline sampling.
            //   1. User mode (round/right) + orthogonality correction  → desired appearance
            //   2. right + correction                                   → no sphere caps, stable
            //   3. transformed + correction                             → most robust OCC mode
            //   4. transformed, no correction                           → last analytical resort
            const replicadTransition = transitionMode;
            const sweepOptsCascade = [
                { transitionMode: replicadTransition, forceProfileSpineOthogonality: true },
                ...(replicadTransition !== "right"
                    ? [{ transitionMode: "right", forceProfileSpineOthogonality: true }]
                    : []),
                { transitionMode: "transformed", forceProfileSpineOthogonality: true },
                { transitionMode: "transformed", forceProfileSpineOthogonality: false },
            ];

            let result = null;
            let selectedSpineMode = null;
            let selectedSweepOpts = null;
            let sweepError = null;
            const spineMaxY = Array.isArray(normalizedContourSegments) && normalizedContourSegments.length > 0
                ? computeSpineMaxWorldY(normalizedContourSegments, bboxRef, panelAnchor)
                : null;

            // Double-loop: outer iterates sweep configurations, inner iterates spine candidates.
            // First successful (non-null, meshable) result wins.
            outerLoop: for (const sweepOpts of sweepOptsCascade) {
                for (const spineCandidate of pathSketchCandidatesValid) {
                    try {
                        const candidateResult = genericSweep(profileWire, spineCandidate.sketch.wire, sweepOpts, false);
                        if (!candidateResult) {
                            sweepDiag.sweepAttempts.push({
                                mode: spineCandidate.mode,
                                sweepOpts,
                                ok: false,
                                resultState: "nullish",
                            });
                            continue;
                        }
                        if (typeof candidateResult.mesh !== "function") {
                            sweepDiag.sweepAttempts.push({
                                mode: spineCandidate.mode,
                                sweepOpts,
                                ok: false,
                                resultState: "non-meshable",
                                resultKeys: Object.keys(candidateResult || {}).slice(0, 8),
                            });
                            continue;
                        }
                        // Remove coincident faces that OCC sometimes leaves on closed-spine sweeps
                        // (ShapeUpgrade_UnifySameDomain — preserves arcs/lines, no sampling).
                        let cleanResult = candidateResult;
                        try { cleanResult = candidateResult.simplify(); } catch { /* non-fatal */ }
                        result = cleanResult;
                        sweepDiag.sweepAttempts.push({
                            mode: spineCandidate.mode,
                            sweepOpts,
                            ok: true,
                            simplified: cleanResult !== candidateResult,
                        });
                        selectedSpineMode = spineCandidate.mode;
                        selectedSweepOpts = sweepOpts;
                        break outerLoop;
                    } catch (errSweep) {
                        sweepDiag.sweepAttempts.push({
                            mode: spineCandidate.mode,
                            sweepOpts,
                            ok: false,
                            error: errSweep?.message,
                        });
                        sweepError = errSweep;
                    }
                }
            }

            if (!result) {
                this.log.warn("Round-profile sweep failed for all spine candidates", {
                    ...sweepDiag,
                    pathSummary: normalizedSummary,
                    hasSegments: Array.isArray(contourSegments) && contourSegments.length > 0,
                    message: sweepError?.message,
                });
                return null;
            }

            if (traceSweep) {
                console.info("[ReplicadSweepTrace] sweep:spine-mode", {
                    bit: sweepDiag.bit,
                    bitId: bit?.bitData?.id ?? null,
                    x: Number(bit?.x ?? 0),
                    y: Number(bit?.y ?? 0),
                    depth,
                    mode: selectedSpineMode,
                    sweepOpts: selectedSweepOpts,
                    g1MicroRadius,
                });
            }

            if (window?.__replicadExhaustiveDiag) {
                this.log.info("Round-profile sweep diagnostics", {
                    bit: sweepDiag.bit,
                    bitId: bit?.bitData?.id ?? null,
                    x: Number(bit?.x ?? 0),
                    y: Number(bit?.y ?? 0),
                    depth,
                    selectedSpineMode,
                    candidates: sweepDiag.candidates,
                    sweepAttempts: sweepDiag.sweepAttempts,
                });
            }

            const segCandidateDiag = sweepDiag.candidates.find((c) => c.mode === "segments-closed")?.diagnostics;
            const hasSegmentStitching =
                Number(segCandidateDiag?.snapCount || 0) > 0 ||
                Number(segCandidateDiag?.bridgeCount || 0) > 0 ||
                Number(segCandidateDiag?.arcFallbackCount || 0) > 0;

            if (useCsgZeroOffsetOutset && selectedSpineMode !== "commands-analytic-outset+0.01") {
                this._logWarnThrottled("CSG zero-offset did not select outset spine", {
                    bit: sweepDiag.bit,
                    bitId: bit?.bitData?.id ?? null,
                    x: Number(bit?.x ?? 0),
                    y: Number(bit?.y ?? 0),
                    depth,
                    contourOffsetDistance,
                    selectedSpineMode,
                    candidates: window?.__replicadExhaustiveDiag ? sweepDiag.candidates : undefined,
                });
            }

                if (
                    selectedSpineMode !== "segments-original" &&
                    selectedSpineMode !== "segments-g1healed" &&
                    selectedSpineMode !== "segments-closed" &&
                    selectedSpineMode !== "segments-closed-reversed" &&
                    selectedSpineMode !== "commands-analytic-outset+0.01"
                ) {
                this._logWarnThrottled("Round-profile sweep used fallback spine candidate", {
                    bit: sweepDiag.bit,
                    bitId: bit?.bitData?.id ?? null,
                    x: Number(bit?.x ?? 0),
                    y: Number(bit?.y ?? 0),
                    depth,
                    selectedSpineMode,
                    selectedSweepOpts,
                    segmentFailReason: segCandidateDiag?.failReason || null,
                    segmentFailDetail: segCandidateDiag?.failDetail || null,
                    candidates: window?.__replicadExhaustiveDiag ? sweepDiag.candidates : undefined,
                    sweepAttempts: window?.__replicadExhaustiveDiag ? sweepDiag.sweepAttempts : undefined,
                });
            } else if (hasSegmentStitching) {
                this._logWarnThrottled("Round-profile sweep built from segments with stitching diagnostics", {
                    bit: sweepDiag.bit,
                    depth,
                    segmentDiagnostics: segCandidateDiag,
                });
            }

            if (!contourClosed) {
                // Use normalizedContourSegments so terminal points match the sweep path endpoints.
                const capSegments = (Array.isArray(normalizedContourSegments) && normalizedContourSegments.length > 0)
                    ? normalizedContourSegments
                    : contourSegments;
                const terminalCaps = this._buildOpenSweepFullRevolveCaps(
                    bit,
                    depth,
                    normalizedPathData,
                    capSegments,
                    bboxRef,
                    panelAnchor,
                    panelT
                );

                if (terminalCaps.length > 0) {
                    this.log.info("Open sweep full revolve terminal caps", {
                        bit: sweepDiag.bit,
                        depth,
                        caps: terminalCaps.length,
                    });
                    // Keep sweep and revolve caps as separate CSG cutters so each is
                    // subtracted independently from the panel.  This avoids OCC fuse
                    // hangs that occur when the new smooth-curve revolve cap is joined
                    // to the sweep before the CSG step.
                    return [result, ...terminalCaps];
                }
            }

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
        const contourCandidates = Array.isArray(contours)
            ? contours.filter((contour) => contour && !contour?.isWorkOffset)
            : [];
        const selectedContours = contourCandidates.length > 0
            ? contourCandidates
            : (Array.isArray(contours) ? contours : []);

        const shapes = [];
        const seenPaths = new Set();
        for (const contour of selectedContours) {
            const pathData = this._getContourPathData(contour);
            if (!pathData) continue;
            if (seenPaths.has(pathData)) continue;
            seenPaths.add(pathData);

            const shape = this._sweepRoundProfile(
                bit,
                depth,
                pathData,
                bboxRef,
                panelAnchor,
                panelT,
                "round",
                contour
            );
            if (Array.isArray(shape)) shapes.push(...shape.filter(Boolean));
            else if (shape) shapes.push(shape);
        }

        if (shapes.length === 0) return null;
        return shapes.length === 1 ? shapes[0] : shapes;
    }

    /**
     * AR (Arrange) – layout-specific sweep path.
     * Keep it separate from AL so arrange routing can evolve without affecting
     * the general offset pipeline.
     */
    _buildAR(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor) {
        const depth = bit.y ?? 0;
        const contourCandidates = Array.isArray(contours)
            ? contours.filter((contour) => contour && !contour?.isWorkOffset)
            : [];
        const selectedContours = contourCandidates.length > 0
            ? contourCandidates.slice().sort((left, right) => {
                const leftLayout = String(left?.arrangeLayout || "vertical");
                const rightLayout = String(right?.arrangeLayout || "vertical");
                if (leftLayout !== rightLayout) return leftLayout.localeCompare(rightLayout);
                const leftIndex = Number.isFinite(left?.bitIndex) ? left.bitIndex : 0;
                const rightIndex = Number.isFinite(right?.bitIndex) ? right.bitIndex : 0;
                return leftIndex - rightIndex;
            })
            : (Array.isArray(contours) ? contours : []);

        const shapes = [];
        const seenPaths = new Set();
        for (const contour of selectedContours) {
            const pathData = this._getContourPathData(contour);
            if (!pathData) continue;
            if (seenPaths.has(pathData)) continue;
            seenPaths.add(pathData);

            const shape = this._sweepRoundProfile(
                bit,
                depth,
                pathData,
                bboxRef,
                panelAnchor,
                panelT,
                "round",
                contour
            );
            if (Array.isArray(shape)) shapes.push(...shape.filter(Boolean));
            else if (shape) shapes.push(shape);
        }

        if (shapes.length === 0) return null;
        return shapes.length === 1 ? shapes[0] : shapes;
    }

    /**
     * PO (Pocketing) – main contour sweep.
     * Phantom contour handling can be added in a follow-up phase.
     */
    _buildPO(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor) {
        const depth = bit.y ?? 0;
        const contourCandidates = Array.isArray(contours)
            ? contours.filter((contour) => contour && !contour?.isWorkOffset)
            : [];
        const selectedContours = contourCandidates.length > 0
            ? contourCandidates
            : (Array.isArray(contours) ? contours : []);

        const sortedContours = selectedContours.slice().sort((left, right) => {
            const leftRank = left?.isPOMain ? 0 : 1;
            const rightRank = right?.isPOMain ? 0 : 1;
            return leftRank - rightRank;
        });

        const shapes = [];
        const seenPaths = new Set();
        for (const contour of sortedContours) {
            const pathData = this._getContourPathData(contour);
            if (!pathData) continue;
            if (seenPaths.has(pathData)) continue;
            seenPaths.add(pathData);

            const shape = this._sweepRoundProfile(
                bit,
                depth,
                pathData,
                bboxRef,
                panelAnchor,
                panelT,
                "round",
                contour
            );
            if (Array.isArray(shape)) shapes.push(...shape.filter(Boolean));
            else if (shape) shapes.push(shape);
        }

        if (shapes.length === 0) return null;
        return shapes.length === 1 ? shapes[0] : shapes;
    }

    /**
     * VC (V-Carve) – V-shaped profile sweep, miter transitions.
     * Each pass builds one cutter; they are fused into a single solid.
     */
    _buildVC(bit, contours, bboxRef, panelW, panelH, panelT, panelAnchor) {
        const angle = bit.bitData?.angle ?? 90;
        const diameter = bit.bitData?.diameter ?? 10;
        const halfAngle = (angle * Math.PI) / 180 / 2;
        const convertToTopAnchorCoordinates =
            typeof window?.convertToTopAnchorCoordinates === "function"
                ? window.convertToTopAnchorCoordinates
                : null;
        const topAnchorCoords = convertToTopAnchorCoordinates
            ? convertToTopAnchorCoordinates(bit)
            : null;
        const bitY = Number(topAnchorCoords?.y ?? bit.y ?? 0);
        const bitHeight = (diameter / 2) * (1 / Math.tan(halfAngle));
        const passes = bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

        const partialResults = [];
        for (let i = 0; i < passes; i++) {
            partialResults.push((bitY * (i + 1)) / passes);
        }
        const depths = [...partialResults].reverse();

        if (!_replicadReady) return null;
        const { Sketcher, genericSweep } = _replicad;

        const cutters = [];

        // VC 3D should use intermediate passes only; work-offset contour is 2D/DXF only.
        const vcContours = contours.filter((contour) => !contour?.isWorkOffset);

        for (let passIndex = 0; passIndex < passes; passIndex++) {
            const contour = vcContours.find((c) => {
                if (typeof c?.passIndex === "number") {
                    return c.passIndex === passIndex;
                }
                if (typeof c?.pass === "number") {
                    return c.pass === passIndex;
                }
                return passIndex === 0;
            });
            if (!contour) continue;

            const contourSegments = this._getContourSegments(contour);
            const normalizedContourSegments = Array.isArray(contourSegments)
                ? normalizeSegmentsForSweep(contourSegments, 0.1)
                : contourSegments;
            const contourPathData = this._getContourPathData(contour);
            if ((!Array.isArray(contourSegments) || contourSegments.length === 0) && !contourPathData) {
                continue;
            }
            const depth = Number.isFinite(depths[passIndex])
                ? depths[passIndex]
                : (contour.depth ?? bitY);
            const passDiag = {
                passIndex,
                depth,
                candidates: [],
                sweepAttempts: [],
            };

            try {
                const normalizedPathData = pickPrimarySubpath(contourPathData);
                const pathSummary = summarizeSvgPath(normalizedPathData);
                const allowVcFallbackSpines = false;

                const pathSketchCandidates = [];
                let segmentDiag = null;
                // For VC we accept only closed spines. Open fallback can "succeed"
                // but produce partial cutters (missing seam segment).
                if (Array.isArray(contourSegments) && contourSegments.length > 0) {
                    const originalSegmentDiag = {};
                    let originalSegmentSketch = null;
                    try {
                        originalSegmentSketch = buildSketchFromOffsetSegments(
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
                                strictContinuity: true,
                                strictArcs: true,
                                continuityEps: 1e-3,
                                diagnostics: originalSegmentDiag,
                                removeLoops: true,
                            }
                        );
                    } catch (errSegOriginal) {
                        originalSegmentDiag.failReason = "segments-original-builder-threw";
                        originalSegmentDiag.failDetail = { message: errSegOriginal?.message || String(errSegOriginal) };
                        originalSegmentSketch = null;
                    }
                    passDiag.candidates.push({
                        mode: "segments-original",
                        hasWire: Boolean(originalSegmentSketch?.wire),
                        diagnostics: originalSegmentDiag,
                    });
                    pathSketchCandidates.push({
                        mode: "segments-original",
                        sketch: originalSegmentSketch,
                    });

                    segmentDiag = {};
                    let segmentSketch = null;
                    try {
                        segmentSketch = buildSketchFromOffsetSegments(
                            normalizedContourSegments,
                            bboxRef,
                            Sketcher,
                            {
                                close: true,
                                plane: "XY",
                                panelAnchor,
                                depth,
                                panelThickness: panelT,
                                applyDepthForXY: true,
                                strictContinuity: true,
                                strictArcs: true,
                                continuityEps: 1e-3,
                                diagnostics: segmentDiag,
                                removeLoops: true,
                            }
                        );
                    } catch (errSegBuild) {
                        segmentDiag.failReason = "segments-builder-threw";
                        segmentDiag.failDetail = { message: errSegBuild?.message || String(errSegBuild) };
                        segmentSketch = null;
                    }
                    passDiag.candidates.push({
                        mode: "segments-closed",
                        hasWire: Boolean(segmentSketch?.wire),
                        diagnostics: segmentDiag,
                    });
                    pathSketchCandidates.push({
                        mode: "segments-closed",
                        sketch: segmentSketch,
                    });

                    let reversedSegmentSketch = null;
                    const reversedSegmentDiag = {};
                    try {
                        const reversedSegments = normalizeSegmentsForSweep(
                            reverseSegmentsForSweep(normalizedContourSegments),
                            0.1
                        );
                        reversedSegmentSketch = buildSketchFromOffsetSegments(
                            reversedSegments,
                            bboxRef,
                            Sketcher,
                            {
                                close: true,
                                plane: "XY",
                                panelAnchor,
                                depth,
                                panelThickness: panelT,
                                applyDepthForXY: true,
                                strictContinuity: true,
                                strictArcs: true,
                                continuityEps: 1e-3,
                                diagnostics: reversedSegmentDiag,
                                removeLoops: true,
                            }
                        );
                    } catch (errSegRev) {
                        reversedSegmentDiag.failReason = "segments-reversed-builder-threw";
                        reversedSegmentDiag.failDetail = { message: errSegRev?.message || String(errSegRev) };
                        reversedSegmentSketch = null;
                    }
                    passDiag.candidates.push({
                        mode: "segments-closed-reversed",
                        hasWire: Boolean(reversedSegmentSketch?.wire),
                        diagnostics: reversedSegmentDiag,
                    });
                    pathSketchCandidates.push({
                        mode: "segments-closed-reversed",
                        sketch: reversedSegmentSketch,
                    });

                    if (allowVcFallbackSpines) {
                        // Optional fallback path retained for diagnostics, but disabled by
                        // default due to heavy geometry and quality regression risk.
                        let segmentLaxSketch = null;
                        const segmentLaxDiag = {};
                        try {
                            segmentLaxSketch = buildSketchFromOffsetSegments(
                                normalizedContourSegments,
                                bboxRef,
                                Sketcher,
                                {
                                    close: true,
                                    plane: "XY",
                                    panelAnchor,
                                    depth,
                                    panelThickness: panelT,
                                    applyDepthForXY: true,
                                    strictContinuity: false,
                                    strictArcs: false,
                                    continuityEps: 1e-3,
                                    diagnostics: segmentLaxDiag,
                                    removeLoops: true,
                                }
                            );
                        } catch (errLax) {
                            segmentLaxDiag.failReason = "lax-builder-threw";
                            segmentLaxDiag.failDetail = { message: errLax?.message || String(errLax) };
                            segmentLaxSketch = null;
                        }
                        passDiag.candidates.push({
                            mode: "segments-lax",
                            hasWire: Boolean(segmentLaxSketch?.wire),
                            diagnostics: segmentLaxDiag,
                        });
                        pathSketchCandidates.push({
                            mode: "segments-lax",
                            sketch: segmentLaxSketch,
                        });
                    }
                }

                if (allowVcFallbackSpines && normalizedPathData) {
                    let cmdSketch = null;
                    try {
                        cmdSketch = buildSketchFromSvgPathCommands(
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
                    } catch {
                        cmdSketch = null;
                    }
                    passDiag.candidates.push({
                        mode: "commands-closed",
                        hasWire: Boolean(cmdSketch?.wire),
                    });
                    pathSketchCandidates.push({
                        mode: "commands-closed",
                        sketch: cmdSketch,
                    });

                    let sampledSketch = null;
                    try {
                        sampledSketch = buildSketchFromSvgPath(
                            normalizedPathData,
                            bboxRef,
                            Sketcher,
                            {
                                close: true,
                                sampleStep: 1.0,
                                plane: "XY",
                                panelAnchor,
                                depth,
                                panelThickness: panelT,
                                applyDepthForXY: true,
                            }
                        );
                    } catch {
                        sampledSketch = null;
                    }
                    passDiag.candidates.push({
                        mode: "sampled-closed",
                        hasWire: Boolean(sampledSketch?.wire),
                    });
                    pathSketchCandidates.push({
                        mode: "sampled-closed",
                        sketch: sampledSketch,
                    });
                }

                let pathSketchCandidatesValid = pathSketchCandidates.filter((c) => !!c?.sketch?.wire);

                // --- Diagnostic dump for wire-assemble failures ---
                if (segmentDiag?.failReason === "wire-assemble-failed" ||
                    passDiag.candidates.some(c => c.diagnostics?.failReason === "wire-assemble-failed")) {
                    const normSegs = normalizedContourSegments ?? [];
                    const junctionGaps = normSegs.map((seg, i) => {
                        const prev = normSegs[i === 0 ? normSegs.length - 1 : i - 1];
                        const gap = prev?.end && seg?.start
                            ? Math.hypot(Number(seg.start.x) - Number(prev.end.x), Number(seg.start.y) - Number(prev.end.y))
                            : null;
                        return { i, type: seg?.type ?? "line", gap: gap?.toFixed(8) ?? "N/A" };
                    });
                    const slotsReport = passDiag.candidates.map(c => ({
                        mode: c.mode,
                        hasWire: c.hasWire,
                        fail: c.diagnostics?.failReason ?? null,
                        detail: c.diagnostics?.failDetail ?? null,
                        closedByGeometry: c.diagnostics?.closedByGeometry ?? null,
                    }));
                    console.group(`[VC-DIAG] passIndex:${passIndex} depth:${depth}`);
                    console.log("segments:", normSegs.map((s, i) => ({
                        i, type: s?.type ?? "line",
                        sx: Number(s?.start?.x).toFixed(6), sy: Number(s?.start?.y).toFixed(6),
                        ex: Number(s?.end?.x).toFixed(6), ey: Number(s?.end?.y).toFixed(6),
                    })));
                    console.log("junctionGaps:", junctionGaps);
                    console.log("candidates:", slotsReport);
                    console.groupEnd();
                }

                // If strict segment builder reached wire assembly but OCCT rejected it,
                // commands-closed often drops a seam segment for this contour family.
                // Prefer sampled fallback and skip commands in this specific failure mode.
                if (allowVcFallbackSpines && segmentDiag?.failReason === "wire-assemble-failed") {
                    const withoutCommands = pathSketchCandidatesValid.filter(
                        (c) => c.mode !== "commands-closed"
                    );
                    if (withoutCommands.length > 0) {
                        pathSketchCandidatesValid = withoutCommands;
                    }
                }

                if (!pathSketchCandidatesValid.length) {
                    this.log.warn("VC pass has no valid spine candidate", {
                        ...passDiag,
                        hasSegments: Array.isArray(contourSegments) && contourSegments.length > 0,
                        pathSummary,
                    });
                    continue;
                }

                const pathZ = this._getSurfaceDepthZ(depth, panelAnchor, panelT);
                const profileOrigin = getFirstSegmentPointInWorldXY(contourSegments, bboxRef, panelAnchor, depth, panelT)
                    ?? getFirstPathPointInWorldXY(normalizedPathData, bboxRef, panelAnchor, depth, panelT)
                    ?? [0, 0, pathZ];
                const profileWire = this._buildProfileWire(bit?.bitData, pathZ, profileOrigin);

                let cutter = null;
                let selectedSpineMode = null;
                let selectedSweepOpts = null;
                // Cascade: user mode first (right for VC), then transformed fallbacks.
                // No polyline sampling — all native OCC analytical modes.
                const sweepOptionsCascade = [
                    { transitionMode: "right", forceProfileSpineOthogonality: true },
                    { transitionMode: "right" },
                    { transitionMode: "transformed", forceProfileSpineOthogonality: true },
                    { transitionMode: "transformed", forceProfileSpineOthogonality: false },
                ];
                const spineMaxY = Array.isArray(normalizedContourSegments) && normalizedContourSegments.length > 0
                    ? computeSpineMaxWorldY(normalizedContourSegments, bboxRef, panelAnchor)
                    : null;

                let sweepError = null;
                outerLoopVC: for (const sweepOpts of sweepOptionsCascade) {
                    for (const spineCandidate of pathSketchCandidatesValid) {
                        try {
                            const candidateCutter = genericSweep(
                                profileWire,
                                spineCandidate.sketch.wire,
                                sweepOpts,
                                false
                            );

                            if (!candidateCutter) {
                                passDiag.sweepAttempts.push({
                                    mode: spineCandidate.mode,
                                    sweepOpts,
                                    ok: false,
                                    resultState: "nullish",
                                });
                                continue;
                            }

                            if (typeof candidateCutter.mesh !== "function") {
                                passDiag.sweepAttempts.push({
                                    mode: spineCandidate.mode,
                                    sweepOpts,
                                    ok: false,
                                    resultState: "non-meshable",
                                    resultKeys: Object.keys(candidateCutter || {}).slice(0, 8),
                                });
                                continue;
                            }

                            // Remove coincident faces (ShapeUpgrade_UnifySameDomain — preserves arcs/lines).
                            let cleanCutter = candidateCutter;
                            try { cleanCutter = candidateCutter.simplify(); } catch { /* non-fatal */ }
                            cutter = cleanCutter;
                            passDiag.sweepAttempts.push({
                                mode: spineCandidate.mode,
                                sweepOpts,
                                ok: true,
                                simplified: cleanCutter !== candidateCutter,
                            });

                            if (window?.__replicadSweepTrace) {
                                console.info("[ReplicadSweepTrace] vc:sweep-success", {
                                    passIndex,
                                    depth,
                                    spineMode: spineCandidate.mode,
                                    sweepOpts,
                                });
                            }
                            selectedSpineMode = spineCandidate.mode;
                            selectedSweepOpts = sweepOpts;
                            break outerLoopVC;
                        } catch (errSweep) {
                            passDiag.sweepAttempts.push({
                                mode: spineCandidate.mode,
                                sweepOpts,
                                ok: false,
                                error: errSweep?.message,
                            });
                            sweepError = errSweep;
                        }
                    }
                }


                if (!cutter) {
                    const incompleteAttempts = passDiag.sweepAttempts
                        .filter((a) => a?.incomplete)
                        .map((a) => ({
                            mode: a.mode,
                            cutterMaxY: a.cutterMaxY,
                            expectedMin: a.expectedMin,
                        }));
                    this.log.warn("VC pass sweep failed for all spine candidates", {
                        passIndex,
                        depth,
                        hasSegments: Array.isArray(contourSegments) && contourSegments.length > 0,
                        pathSummary,
                        message: sweepError?.message,
                        incompleteAttempts,
                        passDiag,
                    });
                    continue;
                }

                const segCandidateDiag = passDiag.candidates.find((c) => c.mode === "segments-closed")?.diagnostics;
                const hasSegmentStitching =
                    Number(segCandidateDiag?.snapCount || 0) > 0 ||
                    Number(segCandidateDiag?.bridgeCount || 0) > 0 ||
                    Number(segCandidateDiag?.arcFallbackCount || 0) > 0;

                if (
                    selectedSpineMode !== "segments-original" &&
                    selectedSpineMode !== "segments-g1healed" &&
                    selectedSpineMode !== "segments-closed" &&
                    selectedSpineMode !== "segments-closed-reversed"
                ) {
                    this._logWarnThrottled("VC pass used fallback spine candidate", {
                        passIndex,
                        depth,
                        selectedSpineMode,
                        selectedSweepOpts,
                        segmentFailReason: segCandidateDiag?.failReason || null,
                        segmentFailDetail: segCandidateDiag?.failDetail || null,
                        fallbackEnabled: allowVcFallbackSpines,
                    });
                } else if (hasSegmentStitching) {
                    this._logWarnThrottled("VC pass built from segments with stitching diagnostics", {
                        passIndex,
                        depth,
                        segmentDiagnostics: segCandidateDiag,
                    });
                }

                if (!this._isShapeMeshable(cutter)) {
                    this.log.warn("VC pass produced non-meshable cutter, skipping pass", {
                        passIndex,
                        depth,
                        passDiag,
                    });
                    continue;
                }

                cutters.push({
                    shape: cutter,
                    passIndex,
                    depth,
                });
            } catch (err) {
                this.log.warn(`VC pass contour failed:`, err);
            }
        }

        if (!cutters.length) return null;

        // Keep VC cutters per-pass. Fusing is unstable for some valid pass solids,
        // while CSG already handles subtracting each cutter independently.
        return cutters;
    }

    // -----------------------------------------------------------------------
    // CSG
    // -----------------------------------------------------------------------

    _applyCSG() {
        if (!this.panelShape) return;
        try {
            const perfTrace = Boolean(window?.__replicadPerfTrace);
            const tStart = perfTrace ? performance.now() : 0;
            const panelSig = this._bboxRef
                ? `${appConfig.panel.width}x${appConfig.panel.height}x${appConfig.panel.thickness}@${appConfig.panel.anchor}:${this._bboxRef.x},${this._bboxRef.y},${this._bboxRef.width},${this._bboxRef.height}`
                : `${appConfig.panel.width}x${appConfig.panel.height}x${appConfig.panel.thickness}@${appConfig.panel.anchor}`;
            const bitsSig = (this._lastBuildBitSignatures || []).join("||");
            const csgSignature = `${panelSig}::${fastHashString(bitsSig)}`;

            if (this._lastCsgSignature === csgSignature && this._lastCsgShape) {
                if (!this._canTessellateShape(this._lastCsgShape, { silent: true })) {
                    this._lastCsgShape = null;
                    this._lastCsgSignature = null;
                } else {
                this.currentShape = this._lastCsgShape;
                this._renderShape(this.currentShape, { highQuality: true });
                this.log.debug("CSG reused from cache", { cutters: this.bitShapes.length });
                return;
                }
            }

            let result = this.panelShape;
            const seenShapes = new Set();
            let cutIndex = 0;
            let failedCuts = 0;
            const retryQueue = [];
            const tryCut = (shape, bit, currentCutIndex, phase = "primary") => {
                const instanceBitId = this._getBitId(bit, currentCutIndex);
                const libraryBitId = bit?.bitData?.id ?? null;
                const tCutStart = perfTrace ? performance.now() : 0;
                if (perfTrace) {
                    this.log.info("Replicad CSG cut start", {
                        cutIndex: currentCutIndex,
                        phase,
                        bitName: bit?.name,
                        bitId: instanceBitId,
                        libraryBitId,
                        operation: bit?.operation,
                    });
                }
                try {
                    const next = result?.cut?.(shape);
                    const tessDiag = {};
                    const tessOk = this._canTessellateShape(next, { silent: true, diagnostics: tessDiag });
                    if (next && this._isShapeMeshable(next) && tessOk) {
                        result = next;
                        if (perfTrace) {
                            this.log.info("Replicad CSG cut done", {
                                cutIndex: currentCutIndex,
                                phase,
                                bitName: bit?.name,
                                bitId: instanceBitId,
                                operation: bit?.operation,
                                cutMs: Math.round(performance.now() - tCutStart),
                            });
                        }
                        return true;
                    }

                    // Coincident/degenerate face recovery.
                    // NOTE: shape.offset() does not exist on 3D shapes in replicad;
                    // available 3D methods are: cut, fuse, intersect, translate, scale, rotate.
                    // Strategy order:
                    //  1. cut with optimisation:"sameFace" – tells OCC to handle exactly-coincident
                    //     faces (e.g. offset=0 cutter shares its outer faces with the panel).
                    //  2. scale the cutter down 0.1% – breaks coincidence by contracting the
                    //     cutter XY footprint (mirrors the user-confirmed "-0.01 path offset" fix).
                    //  3. scale the cutter up 0.1% – alternative for expansion-based separation.
                    const recoveryStrategies = [
                        {
                            label: "sameFace-optimisation",
                            run: () => result?.cut?.(shape, { optimisation: "sameFace" }),
                        },
                        {
                            label: "scale-down-0.9999",
                            run: () => {
                                const s = typeof shape.scale === "function" ? shape.scale(0.9999) : null;
                                return s ? result?.cut?.(s) : null;
                            },
                        },
                        {
                            label: "scale-up-1.0001",
                            run: () => {
                                const s = typeof shape.scale === "function" ? shape.scale(1.0001) : null;
                                return s ? result?.cut?.(s) : null;
                            },
                        },
                    ];
                    for (const strategy of recoveryStrategies) {
                        try {
                            const next2 = strategy.run();
                            const tessOk2 = next2 ? this._canTessellateShape(next2, { silent: true }) : false;
                            if (next2 && this._isShapeMeshable(next2) && tessOk2) {
                                result = next2;
                                if (perfTrace) {
                                    this.log.info(`Replicad CSG cut done (${strategy.label})`, {
                                        cutIndex: currentCutIndex,
                                        phase,
                                        bitName: bit?.name,
                                        bitId: instanceBitId,
                                        operation: bit?.operation,
                                        cutMs: Math.round(performance.now() - tCutStart),
                                    });
                                }
                                this.log.debug(`CSG cut recovery succeeded: ${strategy.label}`, {
                                    bitName: bit?.name,
                                    cutIndex: currentCutIndex,
                                });
                                return true;
                            }
                        } catch (recoveryErr) {
                            this.log.debug(`CSG cut recovery strategy "${strategy.label}" threw: ${recoveryErr?.message}`);
                        }
                    }

                    if (perfTrace) {
                        this.log.info("Replicad CSG cut done", {
                            cutIndex: currentCutIndex,
                            phase,
                            bitName: bit?.name,
                            bitId: instanceBitId,
                            operation: bit?.operation,
                            cutMs: Math.round(performance.now() - tCutStart),
                        });
                    }
                    return {
                        reason: "invalid-shape",
                        tessProbe: tessDiag,
                        bitId: instanceBitId,
                        libraryBitId,
                    };
                } catch (err) {
                    if (perfTrace) {
                        this.log.info("Replicad CSG cut done", {
                            cutIndex: currentCutIndex,
                            phase,
                            bitName: bit?.name,
                            bitId: instanceBitId,
                            operation: bit?.operation,
                            cutMs: Math.round(performance.now() - tCutStart),
                        });
                    }
                    return {
                        reason: "exception",
                        error: err?.message || String(err),
                        bitId: instanceBitId,
                        libraryBitId,
                    };
                }
            };

            const panelBBox = (() => {
                try { return result?.boundingBox; } catch { return null; }
            })();
            // Expand panel bbox by 30mm to avoid false-rejecting terminal revolve caps
            // that extend slightly beyond the panel face (their bbox may only touch the
            // panel bbox at the boundary face — OCC IsOut treats touching as "outside").
            const panelBBoxExpanded = (() => {
                try {
                    if (!panelBBox) return null;
                    const b = panelBBox.bounds;
                    // b = [[xmin,ymin,zmin],[xmax,ymax,zmax]]
                    if (!Array.isArray(b) || b.length < 2) return null;
                    const pad = 35; // generous: max typical profile height ~20mm
                    return {
                        isOut: (otherBBox) => {
                            try {
                                const ob = otherBBox.bounds;
                                if (!Array.isArray(ob) || ob.length < 2) return false;
                                // Manual AABB overlap with padding on panel side
                                const pxmin = b[0][0] - pad, pxmax = b[1][0] + pad;
                                const pymin = b[0][1] - pad, pymax = b[1][1] + pad;
                                const pzmin = b[0][2] - pad, pzmax = b[1][2] + pad;
                                const cxmin = ob[0][0], cxmax = ob[1][0];
                                const cymin = ob[0][1], cymax = ob[1][1];
                                const czmin = ob[0][2], czmax = ob[1][2];
                                // "isOut" = no overlap in any axis
                                return (cxmax < pxmin || cxmin > pxmax ||
                                        cymax < pymin || cymin > pymax ||
                                        czmax < pzmin || czmin > pzmax);
                            } catch { return false; }
                        },
                    };
                } catch { return null; }
            })();

            for (const { shape, bit } of this.bitShapes) {
                if (!shape) continue;
                if (seenShapes.has(shape)) continue;
                seenShapes.add(shape);

                // Cheap bbox pre-filter: skip cutters that don't intersect the
                // current panel solid at all.  The panel bbox is pre-expanded by 35mm
                // so terminal revolve caps that extend beyond the panel face are not
                // incorrectly excluded.
                if (panelBBoxExpanded) {
                    try {
                        const cutterBBox = shape.boundingBox;
                        if (cutterBBox && panelBBoxExpanded.isOut(cutterBBox)) {
                            cutIndex += 1;
                            continue;
                        }
                    } catch { /* non-fatal – fall through to normal cut */ }
                }

                const cutResult = tryCut(shape, bit, cutIndex, "primary");
                if (cutResult !== true) {
                    retryQueue.push({ shape, bit, cutIndex, firstFailure: cutResult });
                }
                cutIndex += 1;
            }

            for (const queued of retryQueue) {
                const retryResult = tryCut(queued.shape, queued.bit, queued.cutIndex, "retry");
                if (retryResult === true) continue;

                failedCuts += 1;
                const failure = retryResult || queued.firstFailure || {};
                this.log.warn("CSG cut returned invalid shape, cutter skipped", {
                    cutIndex: queued.cutIndex,
                    bitName: queued.bit?.name,
                    bitId: failure.bitId ?? this._getBitId(queued.bit, queued.cutIndex),
                    libraryBitId: failure.libraryBitId ?? queued.bit?.bitData?.id ?? null,
                    x: Number(queued.bit?.x ?? 0),
                    y: Number(queued.bit?.y ?? 0),
                    operation: queued.bit?.operation,
                    failureReason: failure.reason || "unknown",
                    error: failure.error || null,
                    tessProbe: failure.tessProbe || null,
                });
            }

            if (!this._canTessellateShape(result, { silent: false })) {
                this.log.warn("CSG result is non-tessellatable, falling back to panel shape", {
                    cutters: this.bitShapes.length,
                    failedCuts,
                    bits: (this.bitShapes || []).map((entry, idx) => ({
                        idx,
                        bitName: entry?.bit?.name,
                        bitId: this._getBitId(entry?.bit, idx),
                        libraryBitId: entry?.bit?.bitData?.id ?? null,
                        x: Number(entry?.bit?.x ?? 0),
                        y: Number(entry?.bit?.y ?? 0),
                        operation: entry?.bit?.operation,
                    })),
                });
                this.currentShape = this.panelShape;
                this._lastCsgShape = null;
                this._lastCsgSignature = null;
                this._renderShape(this.panelShape, { highQuality: true });
                return;
            }

            this.currentShape = result;
            // Only cache a result that had zero failures; if any cut was skipped, leave
            // the cache empty so the next updateView() retries CSG from scratch instead of
            // permanently serving the partial result.
            if (failedCuts === 0) {
                this._lastCsgShape = result;
                this._lastCsgSignature = csgSignature;
            } else {
                this._lastCsgShape = null;
                this._lastCsgSignature = null;
            }
            this._renderShape(result, { highQuality: true });
            this.log.info("CSG complete", { cutters: this.bitShapes.length, failedCuts });
            if (perfTrace) {
                this.log.info("Replicad CSG perf", {
                    cutters: this.bitShapes.length,
                    failedCuts,
                    csgMs: Math.round(performance.now() - tStart),
                });
            }
        } catch (err) {
            this.log.error("CSG failed:", err);
            this._renderShape(this.panelShape, { highQuality: true });
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
    _renderShape(shape, options = {}) {
        if (!shape || !this.renderer) return;
        const stagedGroup = new THREE.Group();
        const { highQuality = false } = options;

        try {
            const stagedMesh = this._addShapeMesh(shape, 0xc8a97a, stagedGroup, {
                highQuality,
            });
            if (!stagedMesh) {
                this.log.warn("_renderShape skipped: tessellation returned no mesh", {
                    hasShape: Boolean(shape),
                    highQuality,
                });
                return;
            }

            this._clearModelGroup();
            for (const child of [...stagedGroup.children]) {
                stagedGroup.remove(child);
                this.modelGroup.add(child);
            }
            this._applyRenderStyle(this.displayMode);
            this._maybeFitCameraToSceneMeshes();

            this.log.debug("Shape rendered");
        } catch (err) {
            this.log.error("_renderShape failed:", err);
            for (const child of [...stagedGroup.children]) {
                child.traverse?.((node) => {
                    if (node.geometry) node.geometry.dispose();
                    if (node.material) node.material.dispose();
                });
                stagedGroup.remove(child);
            }
        }
    }

    _renderPanelAndPaths(bits, offsetContours, bboxRef, panelAnchor) {
        if (!this.renderer || !this.panelShape) return;

        this._clearModelGroup();

        try {
            this._addShapeMesh(this.panelShape, 0xc8a97a, this.modelGroup);
            const partFrontPath = String(window.partFront?.getAttribute("d") || "").trim();
            if (partFrontPath) {
                this._addWirePath(partFrontPath, bboxRef, 0x2f2f2f, panelAnchor, 0, true);
            }
            let skippedSweepMeshes = 0;

            // Keep cutter sweeps visible when Part/CSG is disabled so sweep geometry
            // can be visually validated before boolean subtraction.
            const seenPreviewShapes = new Set();
            for (const entry of this.bitShapes || []) {
                if (!entry?.shape) continue;
                if (seenPreviewShapes.has(entry.shape)) continue;
                seenPreviewShapes.add(entry.shape);
                const previewColor = entry?.bit?.color || "#acbe50";
                try {
                    const mesh = this._addShapeMesh(entry.shape, previewColor, this.modelGroup, {
                        transparent: true,
                        opacity: 0.42,
                        depthWrite: false,
                        roughness: 0.45,
                        metalness: 0.12,
                        isSolidFace: true,
                        isCutterPreview: true,
                    });
                    if (!mesh) skippedSweepMeshes += 1;
                } catch (err) {
                    skippedSweepMeshes += 1;
                    this._logRenderErrorThrottled("_renderPanelAndPaths.sweepMesh", err, {
                        bitName: entry?.bit?.name,
                        operation: entry?.operation,
                    });
                }
            }

            for (const contour of offsetContours || []) {
                if (!contour?.pathData) continue;
                if (contour.operation === "VC" && contour.isWorkOffset) continue;
                const bit = bits?.[contour.bitIndex];
                const pathColor = bit?.color || "#808080";
                const contourDepth = Number.isFinite(contour?.depth) ? contour.depth : (bit?.y ?? 0);
                const contourClosed = this._isContourClosed(contour, contour.pathData);
                this._addWirePath(contour.pathData, bboxRef, pathColor, panelAnchor, contourDepth, contourClosed);
            }

            this._applyRenderStyle(this.displayMode);

            this._maybeFitCameraToSceneMeshes();
            this._renderFailureStreak = 0;
            if (skippedSweepMeshes > 0) {
                this.log.warn("Panel rendered with skipped sweep meshes", { skippedSweepMeshes });
            }
            this.log.debug("Panel+paths rendered", { contours: (offsetContours || []).length });
        } catch (err) {
            this._renderFailureStreak += 1;
            this._logRenderErrorThrottled("_renderPanelAndPaths failed", err, {
                streak: this._renderFailureStreak,
                bitShapes: this.bitShapes?.length || 0,
                contourCount: offsetContours?.length || 0,
            });
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
            highQuality = false,
        } = options;

        if (!shape || typeof shape.mesh !== "function") {
            this._logRenderErrorThrottled("_addShapeMesh.invalid shape", "Shape has no mesh() function");
            return null;
        }

        const perfTrace = Boolean(window?.__replicadPerfTrace);
        const tMeshStart = perfTrace ? performance.now() : 0;
        const meshCache = highQuality ? this._shapeMeshHQCache : this._shapeMeshCache;
        let meshData = meshCache.get(shape) || null;
        const tessellationCandidates = highQuality
            ? [
                { tolerance: 0.03, angularTolerance: 5 },
                { tolerance: 0.07, angularTolerance: 10 },
                { tolerance: 0.18, angularTolerance: 15 },
                { tolerance: 0.35, angularTolerance: 20 },
            ]
            : [
                { tolerance: 0.1, angularTolerance: 10 },
                { tolerance: 0.35, angularTolerance: 20 },
                { tolerance: 0.7, angularTolerance: 30 },
            ];
        const tessellationAttempts = [];

        if (!meshData?.vertices) {
            for (const tessOpts of tessellationCandidates) {
                const tAttemptStart = perfTrace ? performance.now() : 0;
                try {
                    meshData = shape.mesh(tessOpts);
                    tessellationAttempts.push({
                        ...tessOpts,
                        ok: Boolean(meshData?.vertices?.length),
                        ms: perfTrace ? Math.round(performance.now() - tAttemptStart) : undefined,
                    });
                    if (meshData?.vertices?.length) {
                        meshCache.set(shape, meshData);
                        break;
                    }
                } catch (err) {
                    tessellationAttempts.push({
                        ...tessOpts,
                        ok: false,
                        ms: perfTrace ? Math.round(performance.now() - tAttemptStart) : undefined,
                    });
                    meshData = null;
                    this._logRenderErrorThrottled("_addShapeMesh.shape.mesh failed", err, {
                        tessOpts,
                    });
                }
            }
        }

        if (!meshData?.vertices) {
            this.log.warn("No mesh data from Replicad shape after tessellation retries");
            return null;
        }

        const vertexCount = Math.floor((meshData.vertices?.length || 0) / 3);
        const triangleCount = Math.floor((meshData.triangles?.length || 0) / 3);
        const MAX_VERTICES = 1_200_000;
        const MAX_TRIANGLES = 2_000_000;
        if (vertexCount > MAX_VERTICES || triangleCount > MAX_TRIANGLES) {
            this._logRenderErrorThrottled("_addShapeMesh.mesh too large", "Skipping oversized tessellation", {
                vertexCount,
                triangleCount,
            });
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

        const normalizedColor = normalizeThreeColorInput(color, opacity, transparent);

        const mat = new THREE.MeshStandardMaterial({
            color: normalizedColor.color,
            roughness,
            metalness,
            side: THREE.DoubleSide,
            transparent: normalizedColor.transparent,
            opacity: normalizedColor.opacity,
            depthWrite,
            colorWrite,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData.isBrepSolidFace = isSolidFace;
        mesh.userData.isCutterPreview = isCutterPreview;
        mesh.userData.previewOpacity = normalizedColor.opacity;
        parentGroup.add(mesh);
        if (perfTrace) {
            this.log.info("Replicad mesh", {
                isCutterPreview,
                vertexCount,
                triangleCount,
                meshMs: Math.round(performance.now() - tMeshStart),
                tessellationAttempts,
            });
        }
        return mesh;
    }

    _addWirePath(pathData, bboxRef, color = 0x2b4c7e, panelAnchor = "top-left", depth = 0, closed = true) {
        const points2D = sampleSvgPathPoints(pathData, getAdaptiveSvgPathSampleStep(pathData, 5));
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

        const normalizedColor = normalizeThreeColorInput(color, 0.95, true);

        const material = new THREE.LineBasicMaterial({
            color: normalizedColor.color,
            linewidth: 1,
            transparent: normalizedColor.transparent,
            opacity: normalizedColor.opacity,
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

    /**
     * Read current theme-aware edge color from CSS variable
     * @returns {string} CSS color string
     */
    _getThemeEdgeColor() {
        return getComputedStyle(document.documentElement)
            .getPropertyValue('--edge-color').trim() || '#333333';
    }

    _addEdgeOverlay(mesh, mode) {
        if (!mesh?.isMesh || !mesh.geometry) return;

        const edgeColor = this._getThemeEdgeColor();
        const thresholdAngle = mode === "shadedEdges" ? 1 : 15;
        const edgeGeometry = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);

        if (mode === "edges") {
            const dashed = new THREE.LineSegments(
                edgeGeometry.clone(),
                new THREE.LineDashedMaterial({
                    color: edgeColor,
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
                    color: edgeColor,
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
                color: edgeColor,
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

        // Listen for theme changes — update 3D scene background and edge overlays
        window.addEventListener('themechange', () => {
            if (!this.scene) return;

            // Update scene background
            const bg = getComputedStyle(document.documentElement)
                .getPropertyValue('--scene-background').trim() || '#f0ede8';
            this.scene.background = new THREE.Color(bg);

            // Update edge overlay colors
            const edgeColor = this._getThemeEdgeColor();
            if (this.modelGroup) {
                this.modelGroup.traverse((node) => {
                    if (node.userData?.isBrepEdgeOverlay && node.material) {
                        node.material.color.set(edgeColor);
                    }
                });
            }
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
        try {
            if (!this.panelShape) {
                this.log.warn("exportSTEP: no panel shape");
                return null;
            }

            const exportStepFn = _replicad?.exportSTEP;
            const normalizeHexColor = (value, fallback) => {
                if (typeof value !== "string") return fallback;
                const c = value.trim();
                return /^#([0-9a-fA-F]{6})$/.test(c) ? c : fallback;
            };
            const normalizeShapeForStep = (shape, operation) => {
                let out = shape;
                try {
                    if (out && typeof out.simplify === "function") {
                        out = out.simplify();
                    }
                } catch {
                    // Keep original if simplify fails.
                }

                // Keep AL welding opt-in only: in some OCCT builds this can introduce
                // export-only artifacts near corner transitions.
                const weldAL = Boolean(window?.__replicadStepWeldAL);
                if (weldAL && String(operation || "").toUpperCase() === "AL" && typeof _replicad?.makeSolid === "function") {
                    try {
                        const faces = Array.isArray(out?.faces)
                            ? out.faces
                            : Array.isArray(out?.faces?.all)
                                ? out.faces.all
                                : null;
                        if (faces?.length) {
                            out = _replicad.makeSolid(faces);
                        }
                    } catch {
                        // Keep simplified/original shape if makeSolid fails.
                    }
                }

                return out;
            };
            const panelExportColor = "#c8a97a";

            // Part mode (CSG enabled): export panel with boolean subtraction of all sweeps.
            if (this._showPart) {
                if (this.currentShape && this.currentShape !== this.panelShape) {
                    if (this._canTessellateShape(this.currentShape, { silent: true })) {
                        try {
                            return this.currentShape?.blobSTEP?.() || null;
                        } catch {
                            // Fall through to recompute robustly.
                        }
                    }
                }

                let result = this.panelShape;
                let failedCuts = 0;
                for (const { shape, bit } of this.bitShapes || []) {
                    if (!shape) continue;
                    try {
                        const next = result?.cut?.(shape);
                        const tessDiag = {};
                        const tessOk = this._canTessellateShape(next, { silent: true, diagnostics: tessDiag });
                        if (next && this._isShapeMeshable(next) && tessOk) {
                            result = next;
                        } else {
                            failedCuts += 1;
                            this.log.warn("exportSTEP part mode: cut returned empty shape", {
                                bitName: bit?.name,
                                bitId: bit?.bitData?.id ?? null,
                                x: Number(bit?.x ?? 0),
                                y: Number(bit?.y ?? 0),
                                operation: bit?.operation,
                                nextExists: Boolean(next),
                                nextHasMeshFn: Boolean(next && typeof next.mesh === "function"),
                                tessProbe: tessDiag,
                            });
                        }
                    } catch (err) {
                        failedCuts += 1;
                        this.log.warn("exportSTEP part mode: cut failed, skipped", {
                            bitName: bit?.name,
                            bitId: bit?.bitData?.id ?? null,
                            x: Number(bit?.x ?? 0),
                            y: Number(bit?.y ?? 0),
                            operation: bit?.operation,
                            error: err?.message || String(err),
                        });
                    }
                }
                if (failedCuts > 0) {
                    this.log.warn("exportSTEP part mode completed with skipped cutters", { failedCuts });
                }
                try {
                    return result?.blobSTEP?.() || null;
                } catch {
                    this.log.warn("exportSTEP part mode: result STEP export failed, fallback to panel");
                    return this.panelShape?.blobSTEP?.() || null;
                }
            }

            // Material mode (CSG disabled): export all visible BREP solids as one STEP:
            // panel + all bit sweeps (per-pass for VC).
            const shapesForStep = [
                { shape: this.panelShape, name: "panel", color: panelExportColor },
                ...(this.bitShapes || [])
                    .filter((entry) => entry?.shape)
                    .map((entry, idx) => ({
                        shape: normalizeShapeForStep(entry.shape, entry?.operation),
                        name: `${entry?.bit?.name || "bit"}-${idx + 1}`,
                        color: normalizeHexColor(entry?.bit?.color, "#acbe50"),
                    })),
            ];

            if (!shapesForStep.length) {
                this.log.warn("exportSTEP: no shapes to export");
                return null;
            }

            if (typeof exportStepFn === "function") {
                return exportStepFn(shapesForStep);
            }

            // Fallback for older replicad builds without exportSTEP(shapes)
            // support: export a compound of all solids.
            if (typeof _replicad?.makeCompound === "function") {
                const compound = _replicad.makeCompound(shapesForStep.map((s) => s.shape));
                return compound?.blobSTEP?.() || null;
            }

            // Last fallback: export panel only.
            return this.panelShape.blobSTEP();
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
