import LoggerFactory from "../../core/LoggerFactory.js";
import BaseTool from "./BaseTool.js";
import { app } from "../../app/main.js";
import { ARC_APPROX_TOLERANCE } from "../../config/constants.js";
import { buildOffsetDistanceSeries } from "../../utils/offsetSeries.js";
import { calculateOffsetFromPathData } from "../../operations/CustomOffsetProcessor.js";
import { arcCenterFromEndpoints, arcFlagsViaPoint } from "./ArcTool.js";
import { computeBoxSelection, buildSelectionBoxGhost, resolveClickSelectionIds } from "./shared/selectionUtils.js";
import { getRectGeomLocal, getRectClampedRx } from "../geometry/rectGeometry.js";
import { evalAngle } from "../transforms/TransformCommands.js";

const log = LoggerFactory.createLogger("OffsetTool");
const SVG_NS = "http://www.w3.org/2000/svg";

function num(v, d = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
}

function r4(v) {
    return String(Number(num(v).toFixed(4)));
}

function pointsBBox(points) {
    if (!Array.isArray(points) || points.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
        const x = num(p?.x, NaN);
        const y = num(p?.y, NaN);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
    }
    if (!Number.isFinite(minX)) return null;
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function pointsEqual(a, b, eps = 1e-6) {
    return Math.abs(num(a?.x) - num(b?.x)) <= eps && Math.abs(num(a?.y) - num(b?.y)) <= eps;
}

function normalizeVec(v, fallback = { x: 1, y: 0 }) {
    const x = num(v?.x);
    const y = num(v?.y);
    const len = Math.hypot(x, y);
    if (len <= 1e-9) return { ...fallback };
    return { x: x / len, y: y / len };
}

function leftNormal(a, b) {
    const dx = num(b?.x) - num(a?.x);
    const dy = num(b?.y) - num(a?.y);
    const len = Math.hypot(dx, dy);
    if (len <= 1e-9) return { x: 1, y: 0 };
    return { x: -dy / len, y: dx / len };
}

function buildRectPathData(seg) {
    const d = seg?.data ?? {};
    const g = getRectGeomLocal(d);
    const rx = getRectClampedRx(d);

    const xA = g.xStart;
    const yA = g.yStart;
    const xB = g.xOpp;
    const yB = g.yOpp;
    const dx = g.dirW;
    const dy = g.dirH;

    if (rx <= 1e-9) {
        return `M ${r4(xA)} ${r4(-yA)} L ${r4(xB)} ${r4(-yA)} L ${r4(xB)} ${r4(-yB)} L ${r4(xA)} ${r4(-yB)} Z`;
    }

    const p0 = { x: xA + dx * rx, y: yA };
    const p1 = { x: xB - dx * rx, y: yA };
    const p2 = { x: xB, y: yA + dy * rx };
    const p3 = { x: xB, y: yB - dy * rx };
    const p4 = { x: xB - dx * rx, y: yB };
    const p5 = { x: xA + dx * rx, y: yB };
    const p6 = { x: xA, y: yB - dy * rx };
    const p7 = { x: xA, y: yA + dy * rx };

    const c1 = { x: xB - dx * rx, y: yA + dy * rx };
    const c2 = { x: xB - dx * rx, y: yB - dy * rx };
    const c3 = { x: xA + dx * rx, y: yB - dy * rx };
    const c4 = { x: xA + dx * rx, y: yA + dy * rx };

    const toSvg = (p) => ({ x: p.x, y: -p.y });
    const f1 = arcFlagsViaPoint(toSvg(p1), toSvg(p2), toSvg({ x: xB, y: yA }), c1.x, -c1.y);
    const f2 = arcFlagsViaPoint(toSvg(p3), toSvg(p4), toSvg({ x: xB, y: yB }), c2.x, -c2.y);
    const f3 = arcFlagsViaPoint(toSvg(p5), toSvg(p6), toSvg({ x: xA, y: yB }), c3.x, -c3.y);
    const f4 = arcFlagsViaPoint(toSvg(p7), toSvg(p0), toSvg({ x: xA, y: yA }), c4.x, -c4.y);

    return [
        `M ${r4(p0.x)} ${r4(-p0.y)}`,
        `L ${r4(p1.x)} ${r4(-p1.y)}`,
        `A ${r4(rx)} ${r4(rx)} 0 ${f1.largeArc} ${f1.sweep} ${r4(p2.x)} ${r4(-p2.y)}`,
        `L ${r4(p3.x)} ${r4(-p3.y)}`,
        `A ${r4(rx)} ${r4(rx)} 0 ${f2.largeArc} ${f2.sweep} ${r4(p4.x)} ${r4(-p4.y)}`,
        `L ${r4(p5.x)} ${r4(-p5.y)}`,
        `A ${r4(rx)} ${r4(rx)} 0 ${f3.largeArc} ${f3.sweep} ${r4(p6.x)} ${r4(-p6.y)}`,
        `L ${r4(p7.x)} ${r4(-p7.y)}`,
        `A ${r4(rx)} ${r4(rx)} 0 ${f4.largeArc} ${f4.sweep} ${r4(p0.x)} ${r4(-p0.y)}`,
        "Z",
    ].join(" ");
}

/**
 * Sum all RT (rotate) transform angles on a segment's transforms list.
 *
 * @param {Object} seg       - Segment object with optional `transforms` array.
 * @param {Object} [vars={}] - Variable values for expression evaluation.
 * @returns {number} Total rotation in degrees.
 */
function getRtAngle(seg, vars = {}) {
    const list = Array.isArray(seg?.transforms) ? seg.transforms : [];
    let angle = 0;
    for (const t of list) {
        if (String(t?.type ?? "").toUpperCase() !== "RT") continue;
        const v = evalAngle(t?.params?.[0] ?? "", vars);
        if (Number.isFinite(v)) angle += v;
    }
    return angle;
}

/**
 * Rotate a 2-D point by `angleDeg` degrees around the origin (CCW positive).
 *
 * @param {{ x: number, y: number }} point
 * @param {number} angleDeg
 * @returns {{ x: number, y: number }}
 */
function rotatePoint(point, angleDeg) {
    const x = num(point?.x);
    const y = num(point?.y);
    if (!Number.isFinite(angleDeg) || Math.abs(angleDeg) < 1e-9) return { x, y };
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
    };
}

/**
 * Convert a local-space point on a segment to world space by applying the
 * segment's RT transforms.
 *
 * @param {Object} seg       - Segment with a `transforms` array.
 * @param {{ x: number, y: number }} point - Local-space coordinates.
 * @param {Object} [vars={}] - Variable values for expression evaluation.
 * @returns {{ x: number, y: number }}
 */
function segmentWorldPoint(seg, point, vars = {}) {
    return rotatePoint(point, getRtAngle(seg, vars));
}

/**
 * Serialize a transforms array to an SVG `transform` attribute string.
 * Only RT (rotate) commands are supported; they become `rotate(angle)` tokens.
 *
 * @param {Array}  transforms - Transforms array from a segment.
 * @param {Object} [vars={}]  - Variable values for expression evaluation.
 * @returns {string} SVG transform attribute value, e.g. `"rotate(45)"`.
 */
function transformsToSvg(transforms, vars = {}) {
    if (!Array.isArray(transforms) || transforms.length === 0) return "";
    const parts = [];
    for (const t of transforms) {
        if (String(t?.type ?? "").toUpperCase() !== "RT") continue;
        const angle = evalAngle(t?.params?.[0] ?? "", vars);
        if (Number.isFinite(angle) && Math.abs(angle) > 1e-9) {
            parts.push(`rotate(${angle})`);
        }
    }
    return parts.join(" ");
}

function splitByContour(segments) {
    const groups = [];
    let current = [];
    let currentContourId = null;
    for (const seg of segments ?? []) {
        if (!seg) continue;
        if (current.length === 0 || seg.contourId === currentContourId) {
            current.push(seg);
            currentContourId = seg.contourId;
            continue;
        }
        groups.push(current);
        current = [seg];
        currentContourId = seg.contourId;
    }
    if (current.length > 0) groups.push(current);
    return groups;
}

function normalizeOpenContours(segments, allowClose) {
    if (allowClose) return segments;
    const out = [];
    for (const group of splitByContour(segments)) {
        if (group.length === 0) continue;
        const nextGroup = [...group];
        const first = nextGroup[0];
        const last = nextGroup[nextGroup.length - 1];
        if (first?.data?.start && last?.data?.end && pointsEqual(first.data.start, last.data.end)) {
            nextGroup.pop();
        }
        out.push(...nextGroup);
    }
    return out;
}

function contourToPathData(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return "";
    const first = segments[0];
    const s0 = first?.data?.start;
    if (!s0) return "";

    const parts = [`M ${r4(s0.x)} ${r4(-s0.y)}`];
    for (const seg of segments) {
        if (seg.type === "arc") {
            const d = seg.data ?? {};
            const radius = d.radiusExpr ?? d._expr?.rx ?? d._expr?.ry ?? r4(d.radius ?? 0);
            const large = Math.round(num(d.largeArc, 0));
            // Editor stores arc sweep in bit-space; convert to SVG sweep for path export.
            const sweepSvg = Math.round(1 - num(d.sweep, 0));
            parts.push(`A ${radius} ${radius} 0 ${large} ${sweepSvg} ${r4(d.end?.x)} ${r4(-d.end?.y)}`);
        } else {
            const hint = String(seg.cmdHint ?? "").toUpperCase();
            const ex = dval(seg.data?.end?.x);
            const ey = dval(-num(seg.data?.end?.y));
            if (hint === "H") parts.push(`H ${r4(ex)}`);
            else if (hint === "V") parts.push(`V ${r4(ey)}`);
            else parts.push(`L ${r4(ex)} ${r4(ey)}`);
        }
    }

    return parts.join(" ");
}

/**
 * Build contour path data in editor space (Y-down), without SVG Y inversion.
 * Used by debug overlays that should match canvas coordinates exactly.
 *
 * @param {Array} segments
 * @returns {string}
 */
function contourToEditorPathData(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return "";
    const first = segments[0];
    const s0 = first?.data?.start;
    if (!s0) return "";

    const parts = [`M ${r4(s0.x)} ${r4(s0.y)}`];
    for (const seg of segments) {
        if (seg.type === "arc") {
            const d = seg.data ?? {};
            const radius = d.radiusExpr ?? d._expr?.rx ?? d._expr?.ry ?? r4(d.radius ?? 0);
            const large = Math.round(num(d.largeArc, 0));
            const sweep = Math.round(num(d.sweep, 0));
            parts.push(`A ${radius} ${radius} 0 ${large} ${sweep} ${r4(d.end?.x)} ${r4(d.end?.y)}`);
        } else {
            const hint = String(seg.cmdHint ?? "").toUpperCase();
            const ex = dval(seg.data?.end?.x);
            const ey = dval(seg.data?.end?.y);
            if (hint === "H") parts.push(`H ${r4(ex)}`);
            else if (hint === "V") parts.push(`V ${r4(ey)}`);
            else parts.push(`L ${r4(ex)} ${r4(ey)}`);
        }
    }

    return parts.join(" ");
}

function dval(v) {
    return Number.isFinite(Number(v)) ? Number(v) : 0;
}

function shapeToPathData(seg) {
    const d = seg?.data ?? {};
    if (seg?.type === "circle") {
        const cx = num(d.center?.x);
        const cy = num(d.center?.y);
        const r = Math.abs(num(d.radius));
        const rv = d.radiusExpr ?? d._expr?.r ?? r4(r);
        return `M ${r4(cx - r)} ${r4(-cy)} A ${rv} ${rv} 0 1 0 ${r4(cx + r)} ${r4(-cy)} A ${rv} ${rv} 0 1 0 ${r4(cx - r)} ${r4(-cy)} Z`;
    }
    if (seg?.type === "rect") {
        return buildRectPathData(seg);
    }
    if (seg?.type === "ellipse") {
        const cx = num(d.cx);
        const cy = num(d.cy);
        const rx = Math.abs(num(d.rx));
        const ry = Math.abs(num(d.ry));
        return `M ${r4(cx - rx)} ${r4(-cy)} A ${r4(rx)} ${r4(ry)} 0 1 0 ${r4(cx + rx)} ${r4(-cy)} A ${r4(rx)} ${r4(ry)} 0 1 0 ${r4(cx - rx)} ${r4(-cy)} Z`;
    }
    return "";
}

/**
 * Apply RT (rotate) transforms from a transforms array to a point.
 * Mirrors the logic of {@link segmentWorldPoint}, but accepts a raw
 * transforms array instead of a full segment object.
 *
 * @param {{ x: number, y: number }} point - Input point in local space.
 * @param {Array}  transforms - Transforms array (same format as `seg.transforms`).
 * @param {Object} [vars={}]  - Variable values for expression evaluation.
 * @returns {{ x: number, y: number }}
 */
function pointWithTransforms(point, transforms, vars = {}) {
    const base = { x: num(point?.x), y: num(point?.y) };
    if (!Array.isArray(transforms) || transforms.length === 0) return base;
    let angle = 0;
    for (const t of transforms) {
        if (String(t?.type ?? "").toUpperCase() !== "RT") continue;
        const v = evalAngle(t?.params?.[0] ?? "", vars);
        if (Number.isFinite(v)) angle += v;
    }
    return rotatePoint(base, angle);
}

/**
 * Compute the bounding-box center of all start/end points in a segment array.
 * Used to determine the world-space centroid of an offset candidate contour.
 *
 * @param {Array} segments - Parsed segment objects with `data.start` / `data.end`.
 * @returns {{ x: number, y: number } | null}
 */
function segmentsCenter(segments) {
    const pts = [];
    for (const seg of segments ?? []) {
        if (seg?.data?.start) pts.push(seg.data.start);
        if (seg?.data?.end) pts.push(seg.data.end);
    }
    const bb = pointsBBox(pts);
    return bb ? { x: bb.cx, y: bb.cy } : null;
}

/**
 * Attempt to compute an offset contour for one source entry at a given distance.
 * Returns the SVG path string, parsed segment array, and the world-space centroid
 * of the result — or `null` if the offset produced no valid geometry.
 *
 * The centroid is used by {@link _refreshPreview} to choose between the two sign
 * candidates (`+dist` and `–dist`) so that the result follows the reference normal.
 *
 * @param {Object} entry       - Source entry from `_sourceEntries` (`kind === "contour"`).
 * @param {number} offsetDist  - Signed offset distance in model units.
 * @param {*}      exportModule - Export module reference passed to the offset processor.
 * @param {Object} [vars={}]   - Variable values for transform evaluation.
 * @returns {{ pathData: string, allowClose: boolean, segments: Array, centerWorld: {x,y}|null } | null}
 */
function buildOffsetCandidate(entry, offsetDist, exportModule, vars = {}) {
    const allowClose = !!entry.closed;
    const useArcApproximation = /[CcSsQqTt]/.test(entry.pathData);
    const path = calculateOffsetFromPathData(entry.pathData, offsetDist, {
        useArcApproximation,
        arcTolerance: ARC_APPROX_TOLERANCE,
        exportModule,
        trimSelfIntersections: allowClose,
        forceReverseOutput: false,
    });
    if (!path || !String(path).trim()) return null;

    const previewState = { _nextContourId: 1, _nextSegmentId: 1 };
    const parsedSegments = normalizeOpenContours(
        parsePathToSegments(path, previewState, { allowClose }),
        allowClose,
    );
    if (parsedSegments.length === 0) return null;

    const centerLocal = segmentsCenter(parsedSegments);
    const centerWorld = centerLocal
        ? pointWithTransforms(centerLocal, Array.isArray(entry.transforms) ? entry.transforms : [], vars)
        : null;

    return {
        pathData: path,
        allowClose,
        segments: parsedSegments,
        centerWorld,
    };
}

function parsePathToSegments(pathStr, state, { allowClose = true } = {}) {
    const out = [];
    if (!pathStr || !String(pathStr).trim()) return out;
    const commandRe = /([MmLlHhVvZzAa])([^MmLlHhVvZzAa]*)/g;

    let cx = 0;
    let cy = 0;
    let subX = 0;
    let subY = 0;
    let contourId = state._nextContourId++;
    let m;

    while ((m = commandRe.exec(String(pathStr))) !== null) {
        const cmd = m[1];
        const rel = cmd === cmd.toLowerCase() && cmd.toLowerCase() !== "z";
        const upper = cmd.toUpperCase();
        const args = m[2]
            .trim()
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number)
            .filter((n) => !Number.isNaN(n));

        if (upper === "M") {
            contourId = state._nextContourId++;
            for (let i = 0; i + 1 < args.length; i += 2) {
                let x = args[i];
                let y = args[i + 1];
                if (rel) {
                    x += cx;
                    y += cy;
                }
                if (i === 0) {
                    subX = x;
                    subY = y;
                } else {
                    out.push({
                        id: `seg-${state._nextSegmentId++}`,
                        selected: false,
                        contourId,
                        type: "line",
                        cmdHint: "L",
                        data: {
                            start: { x: cx, y: -cy },
                            end: { x, y: -y },
                        },
                    });
                }
                cx = x;
                cy = y;
            }
            continue;
        }

        if (upper === "L") {
            for (let i = 0; i + 1 < args.length; i += 2) {
                let x = args[i];
                let y = args[i + 1];
                if (rel) {
                    x += cx;
                    y += cy;
                }
                out.push({
                    id: `seg-${state._nextSegmentId++}`,
                    selected: false,
                    contourId,
                    type: "line",
                    cmdHint: "L",
                    data: {
                        start: { x: cx, y: -cy },
                        end: { x, y: -y },
                    },
                });
                cx = x;
                cy = y;
            }
            continue;
        }

        if (upper === "H") {
            for (let i = 0; i < args.length; i++) {
                let x = args[i];
                if (rel) x += cx;
                out.push({
                    id: `seg-${state._nextSegmentId++}`,
                    selected: false,
                    contourId,
                    type: "line",
                    cmdHint: "H",
                    data: {
                        start: { x: cx, y: -cy },
                        end: { x, y: -cy },
                    },
                });
                cx = x;
            }
            continue;
        }

        if (upper === "V") {
            for (let i = 0; i < args.length; i++) {
                let y = args[i];
                if (rel) y += cy;
                out.push({
                    id: `seg-${state._nextSegmentId++}`,
                    selected: false,
                    contourId,
                    type: "line",
                    cmdHint: "V",
                    data: {
                        start: { x: cx, y: -cy },
                        end: { x: cx, y: -y },
                    },
                });
                cy = y;
            }
            continue;
        }

        if (upper === "Z") {
            if (allowClose && (Math.abs(cx - subX) > 1e-6 || Math.abs(cy - subY) > 1e-6)) {
                out.push({
                    id: `seg-${state._nextSegmentId++}`,
                    selected: false,
                    contourId,
                    type: "line",
                    cmdHint: "Z",
                    data: {
                        start: { x: cx, y: -cy },
                        end: { x: subX, y: -subY },
                    },
                });
            }
            cx = subX;
            cy = subY;
            continue;
        }

        if (upper === "A") {
            const rawTokens = m[2].match(/[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) ?? [];
            for (let i = 0; i + 6 < rawTokens.length; i += 7) {
                const rx = Number(rawTokens[i]);
                const ry = Number(rawTokens[i + 1]);
                const largeArc = Math.round(Number(rawTokens[i + 3]));
                const sweepSvg = Math.round(Number(rawTokens[i + 4]));
                let ex = Number(rawTokens[i + 5]);
                let ey = Number(rawTokens[i + 6]);
                if (rel) {
                    ex += cx;
                    ey += cy;
                }

                const r = (rx + ry) / 2;
                const startBit = { x: cx, y: -cy };
                const endBit = { x: ex, y: -ey };
                const sweepBit = 1 - sweepSvg;
                const centerBit = arcCenterFromEndpoints(startBit, endBit, r, largeArc, 1 - sweepBit);
                if (centerBit) {
                    out.push({
                        id: `seg-${state._nextSegmentId++}`,
                        selected: false,
                        contourId,
                        type: "arc",
                        data: {
                            start: startBit,
                            end: endBit,
                            center: centerBit,
                            radius: r,
                            largeArc,
                            sweep: sweepBit,
                            arcMode: "arc2pt",
                        },
                    });
                }
                cx = ex;
                cy = ey;
            }
        }
    }

    return out;
}

/**
 * Serialize parsed editor segments back into editor-space path data.
 *
 * @param {Array} segments
 * @param {boolean} [allowClose=true]
 * @returns {string}
 */
function segmentsToEditorPathData(segments, allowClose = true) {
    if (!Array.isArray(segments) || segments.length === 0) return "";
    const first = segments[0];
    const s0 = first?.data?.start;
    if (!s0) return "";

    const parts = [`M ${r4(s0.x)} ${r4(s0.y)}`];
    for (const seg of segments) {
        if (seg.type === "arc") {
            const d = seg.data ?? {};
            parts.push(
                `A ${r4(num(d.radius))} ${r4(num(d.radius))} 0 ${Math.round(num(d.largeArc, 0))} ${Math.round(num(d.sweep, 0))} ${r4(num(d.end?.x))} ${r4(num(d.end?.y))}`,
            );
        } else {
            parts.push(`L ${r4(num(seg.data?.end?.x))} ${r4(num(seg.data?.end?.y))}`);
        }
    }

    if (allowClose) {
        const end = segments[segments.length - 1]?.data?.end;
        if (pointsEqual(s0, end, 1e-5)) parts.push("Z");
    }
    return parts.join(" ");
}

export default class OffsetTool extends BaseTool {
    constructor(mode = "offset") {
        super();
        this.id = mode;
        this._modeType = mode;
        this._phase = "selecting"; // selecting | pickReference | dynamic | confirming
        this._downClient = null;
        this._downSvgPos = null;
        this._dragging = false;
        this._hoverSegId = null;

        this._sourceEntries = [];
        this._previewPaths = [];
        this._signedDistance = 0;
        this._cursorSignedDistance = 0;
        this._count = 1;
        this._manualValue = "";

        this._refPoint = null;
        this._refNormal = { x: 1, y: 0 };
        this._referenceSegId = null;
        this._referenceRectRole = null;

        this._popup = null;
        this._input = null;
        this._inputFocused = false;
        this._lastNonEmptyDebugPayload = null;

        this._exportModule = null;
    }

    activate(ctx) {
        super.activate(ctx);
        this._phase = "selecting";
        this._sourceEntries = [];
        this._previewPaths = [];
        this._signedDistance = 0;
        this._cursorSignedDistance = 0;
        this._count = 1;
        this._manualValue = "";
        this._referenceSegId = null;
        this._referenceRectRole = null;
        this._lastNonEmptyDebugPayload = null;
        this._exportModule = app.getModule("export");
    }

    deactivate() {
        this._clearHover();
        this._removePopup();
        super.deactivate();
    }

    hasActiveCommand() {
        return true;
    }

    onPointerDown(pos, e) {
        if (e.button !== 0) return;

        if (this._phase === "pickReference") {
            const rawPos = this.ctx.canvas.screenToSVG(e);
            if (this._selectReferenceAt(rawPos)) {
                this._startDynamicPhase(rawPos, e);
            }
            return;
        }

        if (this._phase === "dynamic") {
            this._phase = "confirming";
            return;
        }

        if (this._phase === "confirming") {
            this._commitOffset();
            return;
        }

        const rawPos = this.ctx.canvas.screenToSVG(e);
        this._downClient = { x: e.clientX, y: e.clientY };
        this._downSvgPos = rawPos;
        this._dragging = false;
    }

    onPointerMove(pos, e) {
        if (this._phase === "dynamic") {
            this._positionPopup(e);
            const livePos = e ? this.ctx.canvas.screenToSVG(e) : pos;
            this._cursorSignedDistance = this._distanceFromPointer(livePos);
            if (!this._inputFocused && this._manualValue.trim() === "") {
                this._signedDistance = this._cursorSignedDistance;
                this._syncInputValue();
                this._refreshPreview();
            }
            return;
        }

        if (this._phase === "confirming") {
            this._positionPopup(e);
            const livePos = e ? this.ctx.canvas.screenToSVG(e) : pos;
            this._cursorSignedDistance = this._distanceFromPointer(livePos);
            return;
        }

        if (this._phase === "pickReference") {
            const rawPos = this.ctx.canvas.screenToSVG(e);
            this._updateHover(rawPos);
            return;
        }

        const rawPos = this.ctx.canvas.screenToSVG(e);
        this._updateHover(rawPos);

        if (this._downClient) {
            const dist = Math.hypot(e.clientX - this._downClient.x, e.clientY - this._downClient.y);
            if (dist > 5) this._dragging = true;
            if (this._dragging) {
                this._clearHover();
                this.ctx.canvas.setGhost(buildSelectionBoxGhost(this._downSvgPos, this.ctx.canvas.screenToSVG(e)));
            }
        }
    }

    onPointerUp(_pos, e) {
        if (this._phase === "pickReference") return;
        if (this._phase !== "selecting" || !this._downSvgPos) return;
        const start = this._downSvgPos;
        const end = this.ctx.canvas.screenToSVG(e);
        const wasDrag = this._dragging;
        this._downClient = null;
        this._downSvgPos = null;
        this._dragging = false;
        this.ctx.canvas.clearGhost();

        if (wasDrag) {
            const add = !!e.shiftKey;
            const ids = computeBoxSelection(this.ctx.state.segments, start, end, {
                includeParts: !!e.shiftKey && !!(e.ctrlKey || e.metaKey),
                groupSelectionMode: !(!!e.shiftKey && !(e.ctrlKey || e.metaKey)),
                variableValues: this.ctx.state.variableValues ?? {},
                elementGroups: this.ctx.state.elementGroups ?? [],
            });
            if (add) this._toggleSelection(ids.ids ?? ids);
            else this.ctx.state.setSelection(ids.ids ?? ids);
            return;
        }

        const hitId = this.ctx.canvas.hitTest(end);
        if (hitId) {
            const ignoreGroups = !!e.shiftKey && !(e.ctrlKey || e.metaKey);
            const ids = resolveClickSelectionIds(hitId, this.ctx.state.segments, this.ctx.state.elementGroups ?? [], { ignoreGroups });
            if (e.shiftKey) this._toggleSelection(ids);
            else this.ctx.state.setSelection(ids);
        } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            this.ctx.state.clearSelection();
        }
    }

    onConfirm(pos, e) {
        if (this._phase === "selecting") {
            if (this.ctx.state.selectedIds.size === 0) {
                return true;
            }
            this._captureSources(pos);
            if (this._sourceEntries.length === 0) return true;
            this._phase = "pickReference";
            this._refPoint = null;
            this._referenceSegId = null;
            this._referenceRectRole = null;
            return true;
        }

        if (this._phase === "pickReference") {
            this._rollbackToSelection();
            return true;
        }

        if (this._phase === "dynamic") {
            if (this._inputFocused || this._manualValue.trim() !== "") {
                this._cancelManualInput();
                return true;
            }
            this._rollbackToSelection();
            return true;
        }

        if (this._phase === "confirming") {
            if (this._inputFocused || this._manualValue.trim() !== "") {
                this._cancelManualInput();
                return true;
            }
            this._phase = "dynamic";
            return true;
        }

        return false;
    }

    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._phase !== "selecting") {
                if (this._inputFocused || this._manualValue.trim() !== "") {
                    this._cancelManualInput();
                    return true;
                }
                this._rollbackToSelection();
                return true;
            }
        }

        if ((e.key === "Delete" || e.key === "Backspace") && this._phase === "selecting") {
            const ids = [...this.ctx.state.selectedIds];
            if (ids.length > 0) {
                this.ctx.state.deleteSegments(ids);
                return true;
            }
        }

        if ((this._phase === "dynamic" || this._phase === "confirming") && !this._inputFocused) {
            if (e.key === "Tab") {
                e.preventDefault();
                this._input?.focus();
                this._input?.select();
                return true;
            }
            if (e.key.length === 1 && /[\d.\-+{}a-zA-Z_/*()]/.test(e.key)) {
                if (this._input) {
                    this._manualValue = e.key;
                    this._input.value = e.key;
                    this._input.focus();
                    this._input.setSelectionRange(1, 1);
                    e.preventDefault();
                    const parsed = this._parseInput();
                    this._signedDistance = parsed.distance;
                    this._count = parsed.count;
                    this._refreshPreview();
                    return true;
                }
            }
        }
        return false;
    }

    _toggleSelection(ids) {
        const set = new Set(this.ctx.state.selectedIds);
        for (const id of ids) {
            if (set.has(id)) set.delete(id);
            else set.add(id);
        }
        this.ctx.state.setSelection([...set]);
    }

    _distanceFromPointer(pos) {
        if (!this._refPoint) return 0;
        const dx = num(pos?.x) - this._refPoint.x;
        const dy = num(pos?.y) - this._refPoint.y;
        return dx * this._refNormal.x + dy * this._refNormal.y;
    }

    _startDynamicPhase(pos, e) {
        this._phase = "dynamic";
        this._signedDistance = this._distanceFromPointer(pos ?? { x: 0, y: 0 });
        this._showPopup(e, pos ?? { x: 0, y: 0 });
        this._refreshPreview();
    }

    _selectedSegmentById(segId) {
        if (!segId) return null;
        const selected = this.ctx.state.selectedIds;
        const seg = this.ctx.state.segments.find((s) => s.id === segId);
        if (!seg || !selected.has(seg.id)) return null;
        return seg;
    }

    _selectReferenceAt(pos) {
        const hitId = this.ctx.canvas.hitTest(pos);
        const seg = this._selectedSegmentById(hitId);
        if (!seg) return false;

        const vars = this.ctx.state?.variableValues ?? {};

        this._referenceSegId = seg.id;
        this._referenceRectRole = null;

        if (seg.type === "line") {
            const a = segmentWorldPoint(seg, seg.data?.start, vars);
            const b = segmentWorldPoint(seg, seg.data?.end, vars);
            const ref = {
                x: (num(a?.x) + num(b?.x)) / 2,
                y: (num(a?.y) + num(b?.y)) / 2,
            };
            let n = leftNormal(a, b);
            const sourceContour = this._sourceEntries.find((e) => e.kind === "contour" && e.contourId === Number(seg.contourId));
            if (sourceContour?.closed && sourceContour.center) {
                n = normalizeVec({ x: ref.x - sourceContour.center.x, y: ref.y - sourceContour.center.y }, n);
            }
            this._refNormal = normalizeVec(n);
            this._refPoint = { x: ref.x, y: ref.y };
            return true;
        }

        if (seg.type === "arc") {
            const c = segmentWorldPoint(seg, seg.data?.center, vars);
            const a = segmentWorldPoint(seg, seg.data?.start, vars);
            const b = segmentWorldPoint(seg, seg.data?.end, vars);
            const m = {
                x: (num(a?.x) + num(b?.x)) / 2,
                y: (num(a?.y) + num(b?.y)) / 2,
            };
            const radial = normalizeVec({ x: m.x - num(c?.x), y: m.y - num(c?.y) });
            this._refNormal = radial;
            this._refPoint = {
                x: num(c?.x) + radial.x * Math.abs(num(seg.data?.radius)),
                y: num(c?.y) + radial.y * Math.abs(num(seg.data?.radius)),
            };
            return true;
        }

        if (seg.type === "circle") {
            const c = segmentWorldPoint(seg, seg.data?.center ?? { x: 0, y: 0 }, vars);
            const radial = normalizeVec({ x: num(pos?.x) - num(c?.x), y: num(pos?.y) - num(c?.y) });
            const r = Math.abs(num(seg.data?.radius));
            this._refNormal = radial;
            this._refPoint = { x: num(c?.x) + radial.x * r, y: num(c?.y) + radial.y * r };
            return true;
        }

        if (seg.type === "ellipse") {
            const c = segmentWorldPoint(seg, { x: num(seg.data?.cx), y: num(seg.data?.cy) }, vars);
            const cx = num(c?.x);
            const cy = num(c?.y);
            const rx = Math.max(1e-9, Math.abs(num(seg.data?.rx)));
            const ry = Math.max(1e-9, Math.abs(num(seg.data?.ry)));
            const vx = num(pos?.x) - cx;
            const vy = num(pos?.y) - cy;
            const t = 1 / Math.max(1e-9, Math.hypot(vx / rx, vy / ry));
            const px = cx + vx * t;
            const py = cy + vy * t;
            const outward = normalizeVec({ x: (px - cx) / (rx * rx), y: (py - cy) / (ry * ry) });
            this._refNormal = outward;
            this._refPoint = { x: px, y: py };
            return true;
        }

        if (seg.type === "rect") {
            const side = this.ctx.canvas.hitTestRectSide(pos, 12);
            const g = getRectGeomLocal(seg.data);
            const role = side?.segId === seg.id ? side.role : "x-start";
            this._referenceRectRole = role;
            const angle = getRtAngle(seg, vars);
            if (role === "x-opposite") {
                this._refNormal = { x: g.dirW, y: 0 };
                this._refPoint = { x: g.xOpp, y: (g.yStart + g.yOpp) / 2 };
            } else if (role === "x-start") {
                this._refNormal = { x: -g.dirW, y: 0 };
                this._refPoint = { x: g.xStart, y: (g.yStart + g.yOpp) / 2 };
            } else if (role === "y-opposite") {
                this._refNormal = { x: 0, y: g.dirH };
                this._refPoint = { x: (g.xStart + g.xOpp) / 2, y: g.yOpp };
            } else {
                this._refNormal = { x: 0, y: -g.dirH };
                this._refPoint = { x: (g.xStart + g.xOpp) / 2, y: g.yStart };
            }
            this._refNormal = normalizeVec(rotatePoint(this._refNormal, angle));
            this._refPoint = rotatePoint(this._refPoint, angle);
            return true;
        }

        return false;
    }

    _parseInput() {
        const raw = String(this._manualValue ?? "").trim();
        if (!raw) return { distance: this._signedDistance, count: 1 };
        const parts = raw.split(/\s+/).filter(Boolean);
        const distance = num(parts[0], this._signedDistance);
        const count = this._modeType === "offsetMultiple" ? Math.max(1, Math.floor(num(parts[1], 1))) : 1;
        return { distance, count };
    }

    _showPopup(e, pos) {
        this._removePopup();
        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = this._modeType === "offsetMultiple" ? "D C =" : "D =";
        popup.appendChild(label);

        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "arc-radius-input";
        inp.value = r4(this._signedDistance);
        popup.appendChild(inp);

        document.body.appendChild(popup);
        this._popup = popup;
        this._input = inp;
        this._positionPopup(e, pos);

        inp.addEventListener("focus", () => {
            this._inputFocused = true;
            inp.select();
        });
        inp.addEventListener("blur", () => {
            this._inputFocused = false;
            if (this._manualValue.trim() === "") {
                this._signedDistance = this._cursorSignedDistance;
                this._syncInputValue();
                this._refreshPreview();
            }
        });
        inp.addEventListener("input", () => {
            this._manualValue = inp.value;
            if (this._manualValue.trim() === "") {
                return;
            }
            const parsed = this._parseInput();
            this._signedDistance = parsed.distance;
            this._count = parsed.count;
            this._refreshPreview();
        });
        inp.addEventListener("keydown", (ev) => {
            ev.stopPropagation();
            if (ev.key === "Tab") {
                ev.preventDefault();
                ev.target.blur();
                return;
            }
            if (ev.key === "Enter") {
                ev.preventDefault();
                this._manualValue = inp.value;
                const parsed = this._parseInput();
                this._signedDistance = parsed.distance;
                this._count = parsed.count;
                this._phase = "confirming";
                this._refreshPreview();
            }
            if (ev.key === "Escape") {
                ev.preventDefault();
                this._cancelManualInput();
            }
        });
    }

    _positionPopup(e, fallbackPos = null) {
        if (!this._popup) return;
        const x = e?.clientX ?? this.ctx.canvas.cm.canvas.getBoundingClientRect().left + num(fallbackPos?.x);
        const y = e?.clientY ?? this.ctx.canvas.cm.canvas.getBoundingClientRect().top + num(fallbackPos?.y);
        this._popup.style.left = `${x + 14}px`;
        this._popup.style.top = `${y + 14}px`;
    }

    _removePopup() {
        this._inputFocused = false;
        this._input = null;
        if (this._popup) {
            this._popup.remove();
            this._popup = null;
        }
    }

    _syncInputValue() {
        if (!this._input || this._inputFocused) return;
        this._input.value = r4(this._signedDistance);
    }

    _cancelManualInput() {
        this._manualValue = "";
        this._count = 1;
        this._phase = "dynamic";
        this._input?.blur();
        this._signedDistance = this._cursorSignedDistance;
        this._syncInputValue();
        this._refreshPreview();
    }

    _captureSources(pos) {
        const selected = new Set(this.ctx.state.selectedIds);
        const byContour = new Map();
        const selectedShapes = [];

        for (const seg of this.ctx.state.segments) {
            if (!selected.has(seg.id)) continue;
            if (seg.type === "line" || seg.type === "arc") {
                const cid = Number(seg.contourId);
                if (!Number.isFinite(cid)) continue;
                if (!byContour.has(cid)) byContour.set(cid, []);
                byContour.get(cid).push(seg.id);
            } else if (seg.type === "circle" || seg.type === "rect" || seg.type === "ellipse") {
                selectedShapes.push(seg);
            }
        }

        const contourEntries = [];
        for (const [cid] of byContour.entries()) {
            const chain = this.ctx.state.segments.filter((s) => (s.type === "line" || s.type === "arc") && Number(s.contourId) === cid);
            const pathData = contourToPathData(chain);
            const editorPathData = contourToEditorPathData(chain);
            if (!pathData) continue;
            const first = chain[0]?.data?.start;
            const last = chain[chain.length - 1]?.data?.end;
            const closed = !!first && !!last && Math.hypot(num(first.x) - num(last.x), num(first.y) - num(last.y)) <= 1e-6;
            const vars = this.ctx.state?.variableValues ?? {};
            const pts = [];
            for (const seg of chain) {
                pts.push(segmentWorldPoint(seg, seg.data?.start, vars));
                pts.push(segmentWorldPoint(seg, seg.data?.end, vars));
            }
            const bb = pointsBBox(pts);

            contourEntries.push({
                kind: "contour",
                sourceId: `cid:${cid}`,
                contourId: cid,
                pathData,
                editorPathData,
                chain,
                closed,
                center: bb ? { x: bb.cx, y: bb.cy } : null,
                transforms: Array.isArray(chain[0]?.transforms) ? JSON.parse(JSON.stringify(chain[0].transforms)) : [],
            });
        }

        const shapeEntries = selectedShapes
            .map((seg) => ({
                kind: "shape",
                sourceId: seg.id,
                seg,
                closed: true,
                transforms: Array.isArray(seg.transforms) ? JSON.parse(JSON.stringify(seg.transforms)) : [],
            }))
            .filter((e) => !!e.seg);

        this._sourceEntries = [...contourEntries, ...shapeEntries];

        let ref = { x: num(pos?.x), y: num(pos?.y) };
        let normal = { x: 1, y: 0 };

        if (this._sourceEntries.length > 0) {
            const pts = [];
            for (const entry of this._sourceEntries) {
                if (entry.kind === "contour") {
                    const first = entry.chain?.[0]?.data?.start;
                    if (first) pts.push(first);
                } else if (entry.kind === "shape") {
                    if (entry.seg.type === "circle") pts.push(entry.seg.data?.center);
                    else if (entry.seg.type === "ellipse") pts.push({ x: entry.seg.data?.cx, y: entry.seg.data?.cy });
                    else if (entry.seg.type === "rect") pts.push({ x: entry.seg.data?.x, y: entry.seg.data?.y });
                }
            }
            const bb = pointsBBox(pts);
            if (bb) ref = { x: bb.cx, y: bb.cy };

            const firstLine = this.ctx.state.segments.find((s) => selected.has(s.id) && s.type === "line");
            if (firstLine) {
                const dx = num(firstLine.data?.end?.x) - num(firstLine.data?.start?.x);
                const dy = num(firstLine.data?.end?.y) - num(firstLine.data?.start?.y);
                const len = Math.hypot(dx, dy);
                if (len > 1e-9) normal = { x: -dy / len, y: dx / len };
            }
        }

        this._refPoint = ref;
        this._refNormal = normal;
    }

    _refreshPreview() {
        const parsed = this._parseInput();
        const distances = buildOffsetDistanceSeries(parsed.distance, parsed.count);
        this._previewPaths = [];
        const vars = this.ctx.state?.variableValues ?? {};
        const refN = normalizeVec(this._refNormal ?? { x: 1, y: 0 });

        for (const entry of this._sourceEntries) {
            for (const dist of distances) {
                if (entry.kind === "shape") {
                    const shapeSegment = this._offsetShapeEntry(entry.seg, dist);
                    if (shapeSegment) {
                        this._previewPaths.push({
                            sourceId: entry.sourceId,
                            distance: dist,
                            shapeSegment,
                            entryKind: "shape",
                            transforms: Array.isArray(entry.transforms) ? entry.transforms : [],
                        });
                    }
                    continue;
                }

                const absDist = Math.abs(dist);
                const primary = buildOffsetCandidate(entry, dist, this._exportModule, vars);
                const mirrored = absDist > 1e-9
                    ? buildOffsetCandidate(entry, -dist, this._exportModule, vars)
                    : null;

                let picked = primary;
                if (primary && mirrored && absDist > 1e-9) {
                    const expectedSign = dist >= 0 ? 1 : -1;
                    const refP = this._refPoint;
                    
                    const getSideScore = (candidate) => {
                        if (!candidate?.segments || candidate.segments.length === 0) return -Infinity;
                        // Find the point on the candidate segments that is projectively closest to _refPoint
                        // or just the endpoint closest to it.
                        let bestDot = -Infinity;
                        let minD2 = Infinity;
                        let foundPoint = null;
                        
                        for (const s of candidate.segments) {
                            for (const p of [s.data?.start, s.data?.end]) {
                                if (!p) continue;
                                // Convert to world if needed, but segments in candidate are already transformed?
                                // Actually OffsetTool uses transformed points in centerWorld.
                                // Let's check candidate points relative to refPoint.
                                const dx = num(p.x) - refP.x;
                                const dy = num(p.y) - refP.y;
                                const d2 = dx * dx + dy * dy;
                                if (d2 < minD2) {
                                    minD2 = d2;
                                    foundPoint = p;
                                }
                            }
                        }
                        
                        if (!foundPoint) return -Infinity;
                        const vdx = num(foundPoint.x) - refP.x;
                        const vdy = num(foundPoint.y) - refP.y;
                        return (vdx * refN.x + vdy * refN.y) * expectedSign;
                    };

                    const pScore = getSideScore(primary);
                    const mScore = getSideScore(mirrored);
                    picked = mScore > pScore ? mirrored : primary;
                }

                if (picked) {
                    this._previewPaths.push({
                        sourceId: entry.sourceId,
                        distance: dist,
                        pathData: picked.pathData,
                        editorPathData: segmentsToEditorPathData(picked.segments, picked.allowClose),
                        allowClose: picked.allowClose,
                        segments: picked.segments,
                        entryKind: "contour",
                        transforms: Array.isArray(entry.transforms) ? entry.transforms : [],
                    });
                }
            }
        }

        this._publishOffsetDebugInfo();
        this._renderGhost();
    }

    _publishOffsetDebugInfo() {
        const previewEntries = (this._previewPaths ?? [])
            .filter((p) => p.entryKind === "contour")
            .map((p) => ({
                sourceId: p.sourceId,
                distance: p.distance,
                customPathDataSvg: p.pathData || "",
                customPathDataEditor: p.editorPathData || "",
            }));

        const sourceEntries = (this._sourceEntries ?? [])
            .filter((e) => e.kind === "contour")
            .map((e) => ({
                sourceId: e.sourceId,
                contourId: e.contourId,
                inputPathDataSvg: e.pathData || "",
                inputPathDataEditor: e.editorPathData || "",
            }));

        const payload = {
            phase: this._phase,
            mode: this._modeType,
            referenceSegId: this._referenceSegId,
            refPoint: this._refPoint,
            refNormal: this._refNormal,
            sources: sourceEntries,
            previews: previewEntries,
            timestamp: Date.now(),
        };

        const isNonEmpty = sourceEntries.length > 0 || previewEntries.length > 0;
        if (isNonEmpty) {
            this._lastNonEmptyDebugPayload = JSON.parse(JSON.stringify(payload));
            window.offsetDebugInfo = payload;
        } else if (this._lastNonEmptyDebugPayload) {
            window.offsetDebugInfo = this._lastNonEmptyDebugPayload;
        } else {
            window.offsetDebugInfo = payload;
        }
        const debugTextarea = document.getElementById("bit-offsetDebugLog");
        if (debugTextarea) {
            const textPayload = isNonEmpty
                ? payload
                : (this._lastNonEmptyDebugPayload || payload);
            debugTextarea.value = JSON.stringify(textPayload, null, 2);
        }
    }

    _renderGhost() {
        const g = document.createElementNS(SVG_NS, "g");
        let idx = 0;
        const vars = this.ctx.state?.variableValues ?? {};
        for (const p of this._previewPaths) {
            const pg = document.createElementNS(SVG_NS, "g");
            const transform = transformsToSvg(p.transforms, vars);
            if (transform) pg.setAttribute("transform", transform);

            if (p.shapeSegment) {
                const seg = p.shapeSegment;
                const dash = idx % 2 === 0 ? "4,3" : "2,3";
                let shapeGhost = null;

                if (seg.type === "circle") {
                    shapeGhost = document.createElementNS(SVG_NS, "circle");
                    shapeGhost.setAttribute("cx", num(seg.data?.center?.x));
                    shapeGhost.setAttribute("cy", num(seg.data?.center?.y));
                    shapeGhost.setAttribute("r", Math.abs(num(seg.data?.radius)));
                } else if (seg.type === "rect") {
                    const rg = getRectGeomLocal(seg.data);
                    const rx = Math.max(0, Math.min(Math.abs(Number(seg.data?.rx ?? 0)), rg.widthAbs / 2, rg.heightAbs / 2));
                    shapeGhost = document.createElementNS(SVG_NS, "rect");
                    shapeGhost.setAttribute("x", rg.minX);
                    shapeGhost.setAttribute("y", rg.minY);
                    shapeGhost.setAttribute("width", rg.widthAbs);
                    shapeGhost.setAttribute("height", rg.heightAbs);
                    shapeGhost.setAttribute("rx", rx);
                } else if (seg.type === "ellipse") {
                    shapeGhost = document.createElementNS(SVG_NS, "ellipse");
                    shapeGhost.setAttribute("cx", num(seg.data?.cx));
                    shapeGhost.setAttribute("cy", num(seg.data?.cy));
                    shapeGhost.setAttribute("rx", Math.abs(num(seg.data?.rx)));
                    shapeGhost.setAttribute("ry", Math.abs(num(seg.data?.ry)));
                }

                if (shapeGhost) {
                    shapeGhost.setAttribute("fill", "none");
                    shapeGhost.setAttribute("stroke-dasharray", dash);
                    pg.appendChild(shapeGhost);
                    idx += 1;
                }
                g.appendChild(pg);
                continue;
            }
            for (const seg of p.segments ?? []) {
                let ghostEl = null;
                if (seg.type === "arc") {
                    ghostEl = document.createElementNS(SVG_NS, "path");
                    ghostEl.setAttribute(
                        "d",
                        `M ${seg.data.start.x} ${seg.data.start.y} A ${seg.data.radius} ${seg.data.radius} 0 ${seg.data.largeArc} ${seg.data.sweep} ${seg.data.end.x} ${seg.data.end.y}`,
                    );
                    ghostEl.setAttribute("fill", "none");
                } else {
                    ghostEl = document.createElementNS(SVG_NS, "line");
                    ghostEl.setAttribute("x1", seg.data.start.x);
                    ghostEl.setAttribute("y1", seg.data.start.y);
                    ghostEl.setAttribute("x2", seg.data.end.x);
                    ghostEl.setAttribute("y2", seg.data.end.y);
                    ghostEl.setAttribute("fill", "none");
                }
                ghostEl.setAttribute("stroke-dasharray", idx % 2 === 0 ? "4,3" : "2,3");
                pg.appendChild(ghostEl);
                idx += 1;
            }

            g.appendChild(pg);
        }
        this.ctx.canvas.setGhost(g);
    }

    _commitOffset() {
        if (this._previewPaths.length === 0) {
            this._rollbackToSelection();
            return;
        }

        const state = this.ctx.state;
        const appended = [];
        const appendedShapes = [];
        for (const preview of this._previewPaths) {
            if (preview.shapeSegment) {
                appendedShapes.push({
                    ...preview.shapeSegment,
                    id: `seg-${state._nextSegmentId++}`,
                    selected: false,
                    data: JSON.parse(JSON.stringify(preview.shapeSegment.data)),
                });
                continue;
            }
            const sourceEntry = this._sourceEntries.find((e) => e.sourceId === preview.sourceId);
            const commitSegments = preview.segments ?? [];
            const groups = splitByContour(commitSegments);
            for (const group of groups) {
                if (group.length === 0) continue;
                const contourId = state._nextContourId++;
                for (const seg of group) {
                    appended.push({
                        ...seg,
                        id: `seg-${state._nextSegmentId++}`,
                        selected: false,
                        contourId,
                        transforms: Array.isArray(sourceEntry?.transforms) ? JSON.parse(JSON.stringify(sourceEntry.transforms)) : [],
                        data: JSON.parse(JSON.stringify(seg.data)),
                    });
                }
            }
        }

        if (appended.length > 0 || appendedShapes.length > 0) {
            state.segments = [...state.segments, ...appended, ...appendedShapes];
            state._syncSymmetryContours();
            state._pushHistory(this._modeType === "offsetMultiple" ? "Offset multiple" : "Offset");
            state._notifySegments();
            state.setSelection([...appended.map((s) => s.id), ...appendedShapes.map((s) => s.id)]);
            log.debug(`Offset commit: added ${appended.length} path segments and ${appendedShapes.length} shapes`);
        }

        this._rollbackToSelection();
    }

    _rollbackToSelection() {
        this._phase = "selecting";
        this._sourceEntries = [];
        this._previewPaths = [];
        this._manualValue = "";
        this._count = 1;
        this._cursorSignedDistance = 0;
        this._referenceSegId = null;
        this._referenceRectRole = null;
        this._removePopup();
        this._clearHover();
        this.ctx.canvas.clearGhost();
    }

    _updateHover(pos) {
        if (this._phase !== "selecting" && this._phase !== "pickReference") return;
        const hitId = this.ctx.canvas.hitTest(pos);
        const hoveredId = this._phase === "pickReference" ? (this._selectedSegmentById(hitId)?.id ?? null) : hitId;
        if (hoveredId !== this._hoverSegId) {
            if (this._hoverSegId) this.ctx.canvas.setHoverSegment(this._hoverSegId, false);
            if (hoveredId) this.ctx.canvas.setHoverSegment(hoveredId, true);
            this._hoverSegId = hoveredId ?? null;
        }
    }

    _offsetShapeEntry(seg, dist) {
        if (!seg) return null;
        if (seg.type === "circle") {
            const r = Math.abs(num(seg.data?.radius)) + dist;
            if (r <= 1e-6) return null;
            const center = { ...seg.data.center };
            const dir = normalizeVec({
                x: num(seg.data?.pt3?.x, center.x + 1) - num(center.x),
                y: num(seg.data?.pt3?.y, center.y) - num(center.y),
            });
            return {
                ...seg,
                data: {
                    ...seg.data,
                    center,
                    radius: r,
                    pt3: { x: center.x + dir.x * r, y: center.y + dir.y * r },
                },
            };
        }

        if (seg.type === "ellipse") {
            const rx = Math.abs(num(seg.data?.rx)) + dist;
            const ry = Math.abs(num(seg.data?.ry)) + dist;
            if (rx <= 1e-6 || ry <= 1e-6) return null;
            return {
                ...seg,
                data: {
                    ...seg.data,
                    rx,
                    ry,
                },
            };
        }

        if (seg.type === "rect") {
            const g = getRectGeomLocal(seg.data);
            const xStart = g.xStart - g.dirW * dist;
            const xOpp = g.xOpp + g.dirW * dist;
            const yStart = g.yStart - g.dirH * dist;
            const yOpp = g.yOpp + g.dirH * dist;
            const w = Math.abs(xOpp - xStart);
            const h = Math.abs(yOpp - yStart);
            if (w <= 1e-6 || h <= 1e-6) return null;
            const baseRx = Math.abs(num(seg.data?.rx));
            const rxRaw = baseRx > 1e-9 ? baseRx + dist : 0;
            const rx = Math.max(0, Math.min(rxRaw, w / 2, h / 2));
            return {
                ...seg,
                data: {
                    ...seg.data,
                    x: xStart,
                    y: yStart,
                    w,
                    h,
                    dirW: xOpp >= xStart ? 1 : -1,
                    dirH: yOpp >= yStart ? 1 : -1,
                    rx,
                },
            };
        }

        return null;
    }

    _clearHover() {
        if (this._hoverSegId) this.ctx.canvas.setHoverSegment(this._hoverSegId, false);
        this._hoverSegId = null;
    }
}
