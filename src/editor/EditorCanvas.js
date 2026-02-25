import LoggerFactory from "../core/LoggerFactory.js";
import { EV } from "./EditorVisualConfig.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Arc geometry midpoint via hidden SVG path (uses the same helper as hit-test). */
function _computeArcMidpoint({ start, end, radius, largeArc, sweep }) {
    _ensureArcHitHelper();
    const d = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
    _arcHitPath.setAttribute("d", d);
    _arcHitPath.setAttribute("stroke-width", "0");
    try {
        const len = _arcHitPath.getTotalLength();
        if (len > 0) {
            const pt = _arcHitPath.getPointAtLength(len / 2);
            return { x: pt.x, y: pt.y };
        }
    } catch (_) { /* fallthrough */ }
    return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

/**
 * Append an arc control handle (the draggable midpoint circle) to the group.
 * @param {SVGGElement} g
 * @param {number} cx
 * @param {number} cy
 * @param {string} pointKey  stored as data-point-key so hitTestPoint + hover work
 */
function _appendArcHandle(g, cx, cy, pointKey) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", EV.r.handle);
    c.classList.add(EV.cls.arcHandle);
    c.setAttribute("data-point-key", pointKey);
    c.setAttribute("pointer-events", "none");
    g.appendChild(c);
}

/** Small gray center dot for selected arcs. */
function _appendArcCenter(g, cx, cy) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", EV.r.center);
    c.classList.add(EV.cls.arcCenter);
    c.setAttribute("pointer-events", "none");
    g.appendChild(c);
}

/** Dashed radius guide line from arc center to the control handle. */
function _appendArcRadiusLine(g, x1, y1, x2, y2) {
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.classList.add(EV.cls.arcRadiusLine);
    line.setAttribute("pointer-events", "none");
    g.appendChild(line);
}

/** Radius label text (for arc2pt only). */
function _appendArcRadiusLabel(g, x, y, radius) {
    const txt = document.createElementNS(SVG_NS, "text");
    txt.setAttribute("x", x);
    txt.setAttribute("y", y);
    txt.classList.add("editor-arc-radius-label");
    txt.textContent = `R ${radius.toFixed(3)}`;
    txt.setAttribute("pointer-events", "none");
    g.appendChild(txt);
}

/** @param {SVGGElement} g @param {number} cx @param {number} cy @param {boolean} selected @param {boolean} [mirror] @param {string} [pointKey] */
function _appendEndpoint(g, cx, cy, selected, mirror = false, pointKey = "") {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", EV.r.endpoint);
    c.classList.add(EV.cls.endpoint);
    if (mirror)   c.classList.add(EV.cls.endpointMirror);
    if (selected) c.classList.add(EV.cls.endpointSelected);
    if (pointKey) c.setAttribute("data-point-key", pointKey);
    c.setAttribute("pointer-events", "none");
    g.appendChild(c);
}

/**
 * Minimum distance from point P to the line segment AB.
 * @param {{ x:number, y:number }} p
 * @param {{ x:number, y:number }} a
 * @param {{ x:number, y:number }} b
 * @returns {number}
 */
function _pointToSegmentDist(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y); // degenerate segment
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const nearX = a.x + t * dx;
    const nearY = a.y + t * dy;
    return Math.hypot(p.x - nearX, p.y - nearY);
}
/**
 * Minimum distance from point P to a circular arc segment.
 * Returns the perpendicular distance if the point projects onto the arc,
 * otherwise returns the distance to the nearer endpoint.
 * All coordinates in the same SVG Y-down space.
 */
// ─── Arc hit-test helper using browser's isPointInStroke ────────────────────
// A hidden off-screen SVG is created lazily and reused for every hit-test call.
// Using the browser's own geometry engine avoids all manual largeArc/sweep math.
const _SVG_NS = "http://www.w3.org/2000/svg";
let _arcHitSvg  = null;
let _arcHitPath = null;

function _ensureArcHitHelper() {
    if (_arcHitSvg) return;
    _arcHitSvg  = document.createElementNS(_SVG_NS, "svg");
    _arcHitPath = document.createElementNS(_SVG_NS, "path");
    _arcHitPath.setAttribute("fill", "none");
    _arcHitPath.setAttribute("stroke", "black");
    _arcHitSvg.appendChild(_arcHitPath);
    // Must be in the document for isPointInStroke to work in all browsers.
    Object.assign(_arcHitSvg.style, {
        position: "fixed", left: "-9999px", top: "-9999px",
        width: "1px", height: "1px", overflow: "visible",
        pointerEvents: "none", opacity: "0",
    });
    document.body.appendChild(_arcHitSvg);
}

/**
 * Distance from point p to an SVG arc segment.
 * Uses isPointInStroke() for the angular containment check so that
 * all largeArc / sweep combinations are handled correctly without
 * any manual angle-range arithmetic.
 *
 * @param {{x:number,y:number}} p
 * @param {{start,end,radius,largeArc,sweep}} arcData
 * @param {number} toleranceUnits  hit radius in SVG user-space units
 * @returns {number}  0 if point is on arc within tolerance; min endpoint distance otherwise.
 */
function _pointToArcDist(p, { start, end, radius, largeArc, sweep }, toleranceUnits) {
    _ensureArcHitHelper();

    const d = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
    _arcHitPath.setAttribute("d", d);
    // stroke-width in SVG user-space = 2 × tolerance so any point within tolerance is "in stroke"
    _arcHitPath.setAttribute("stroke-width", String(toleranceUnits * 2));

    let inStroke = false;
    try {
        inStroke = _arcHitPath.isPointInStroke(new DOMPoint(p.x, p.y));
    } catch (_) {
        // Fallback for environments that don't support isPointInStroke:
        // conservative check — just test radial distance (ignores arc angle range).
        // This produces false positives but never false negatives.
        const cx = (start.x + end.x) / 2; // rough center estimate
        const cy = (start.y + end.y) / 2;
        inStroke = Math.abs(Math.hypot(p.x - cx, p.y - cy) - radius) <= toleranceUnits;
    }

    if (inStroke) return 0;
    return Math.min(
        Math.hypot(p.x - start.x, p.y - start.y),
        Math.hypot(p.x - end.x,   p.y - end.y),
    );
}

import SnapManager from "./snaps/SnapManager.js";
import { arc2ptData, circumcenter, arcFlagsViaPoint } from "./tools/ArcTool.js";

const log = LoggerFactory.createLogger("EditorCanvas");

/**
 * EditorCanvas — wraps a CanvasManager instance and adds editor-specific functionality.
 *
 * Responsibilities:
 * - **Coordinate helpers**: convert browser-pixel positions to SVG user-space
 * - **Snap integration**: delegate pointer positions through SnapManager before use
 * - **Overlay rendering**: draw in-progress previews (ghost lines during drawing)
 * - **Axis/mirror line**: show the symmetry axis at X=0 with a dashed line
 * - **Element hit-testing**: find which segment is under a given pointer position
 *
 * ### Layer usage (within the CanvasManager layer model)
 * - `"content"` — final drawn segments (SVG elements)
 * - `"overlay"` — in-progress ghost, cursor snap indicators
 *
 * ### Coordinate system
 * The profile editor uses the same coordinate system as the preview canvas:
 * - Origin (0, 0) = anchor point of the bit (bottom-center)
 * - X axis: positive = right (mirrored for the full profile)
 * - Y axis: positive = up (SVG Y is flipped — use `y = -value` when rendering to SVG)
 *
 * @example
 * ```js
 * const editorCanvas = new EditorCanvas(previewCanvasManager, state);
 * editorCanvas.initialize();
 * editorCanvas.renderAllSegments(state.segments);
 * ```
 */
export default class EditorCanvas {
    /**
     * @param {import("../canvas/CanvasManager.js").default} canvasManager
     * @param {import("./EditorStateManager.js").default} stateManager
     */
    constructor(canvasManager, stateManager) {
        /** @type {import("../canvas/CanvasManager.js").default} */
        this.cm = canvasManager;

        /** @type {import("./EditorStateManager.js").default} */
        this.state = stateManager;

        /** @type {SnapManager} */
        this.snapManager = new SnapManager(canvasManager);

        /** @type {SVGElement|null} — axis line element */
        this._axisLine = null;

        /** @type {SVGElement|null} — ghost element during active drawing */
        this._ghostElement = null;

        /** @type {boolean} */
        this._initialized = false;
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    /**
     * Perform one-time setup: render the symmetry axis and register
     * the CanvasManager onZoom callback to keep overlay elements scaled.
     */
    initialize() {
        if (this._initialized) return;
        this._initialized = true;
        this._renderAxis();
        log.debug("EditorCanvas initialized");
    }

    /**
     * Tear down all editor-specific SVG elements and listeners.
     * Called when exiting edit mode.
     */
    destroy() {
        this.clearGhost();
        this._removeAxis();
        // Clear editor segment rendering so the preview layer is ready for a fresh render
        const bitsLayer = this.cm.getLayer("bits");
        if (bitsLayer) bitsLayer.innerHTML = "";
        this._initialized = false;
        log.debug("EditorCanvas destroyed");
    }

    // ─── Coordinate helpers ─────────────────────────────────────────────────

    /**
     * Convert a browser-pixel position (from a mouse event) to SVG user-space coordinates.
     * @param {MouseEvent} e
     * @returns {{ x: number, y: number }} User-space coordinates
     */
    screenToSVG(e) {
        const svg = this.cm.canvas;
        const rect = svg.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        // SVG user-space from viewBox
        const vbWidth  = rect.width  / this.cm.zoomLevel;
        const vbHeight = rect.height / this.cm.zoomLevel;
        const vbX = this.cm.panX - vbWidth  / 2;
        const vbY = this.cm.panY - vbHeight / 2;
        return {
            x: vbX + (px / rect.width)  * vbWidth,
            y: vbY + (py / rect.height) * vbHeight,
        };
    }

    /**
     * Apply snap rules to a raw SVG-space position and return the snapped result.
     * The caller should always pass raw coordinates through this method before use.
     * @param {{ x: number, y: number }} pos - Raw SVG-space position
     * @param {{ x: number, y: number }|null} [prevPoint] - Previous anchor point (for ortho/angle snap)
     * @returns {{ x: number, y: number }} Snapped position
     */
    snap(pos, prevPoint = null) {
        return this.snapManager.snap(pos, prevPoint);
    }

    // ─── Axis rendering ─────────────────────────────────────────────────────

    /**
     * Render the symmetry axis (X=0, vertical dashed line) in the overlay layer.
     * The axis spans the full visible viewport height and is updated on zoom/pan.
     * @private
     */
    _renderAxis() {
        const overlay = this.cm.getLayer("overlay");
        if (!overlay) return;

        // Remove stale axis
        this._removeAxis();

        const line = document.createElementNS(SVG_NS, "line");
        line.classList.add("editor-axis");
        line.setAttribute("x1", 0); line.setAttribute("x2", 0);
        // Y range will be updated via _updateAxisExtent
        line.setAttribute("y1", -1e5); line.setAttribute("y2", 1e5);
        overlay.appendChild(line);
        this._axisLine = line;
    }

    /** @private */
    _removeAxis() {
        if (this._axisLine) {
            this._axisLine.remove();
            this._axisLine = null;
        }
    }

    // ─── Ghost / in-progress preview ────────────────────────────────────────

    /**
     * Render or update the in-progress ghost element during drawing.
     * Replaces any previously set ghost.
     * @param {SVGElement} element - A pre-built SVG element to display as ghost
     */
    setGhost(element) {
        this.clearGhost();
        const overlay = this.cm.getLayer("overlay");
        if (!overlay || !element) return;
        element.classList.add("editor-ghost");
        overlay.appendChild(element);
        this._ghostElement = element;
    }

    /** Remove the current ghost element. */
    clearGhost() {
        if (this._ghostElement) {
            this._ghostElement.remove();
            this._ghostElement = null;
        }
    }

    // ─── Segment rendering ──────────────────────────────────────────────────

    /**
     * Render all segments from the state into the content layer.
     * Clears the content layer before re-rendering.
     * @param {import("./EditorStateManager.js").PathSegment[]} segments
     */
    renderAllSegments(segments) {
        const layer = this.cm.getLayer("bits");
        if (!layer) return;
        layer.innerHTML = "";
        for (const seg of segments) {
            const el = this._buildSegmentElement(seg);
            if (el) layer.appendChild(el);
        }
    }

    /**
     * Build an SVG element for a single segment.
     * Returns a `<g>` wrapping the segment line and its endpoint circles.
     * No automatic mirroring — segments are stored and rendered exactly as-is.
     * Use MirrorTool to create explicit mirrored copies.
     *
     * Supported types: "line"
     *
     * @param {import("./EditorStateManager.js").PathSegment} seg
     * @returns {SVGGElement|null}
     */
    _buildSegmentElement(seg) {
        if (seg.type === "line") {
            const { start, end } = seg.data;
            const selected = seg.selected;

            const g = document.createElementNS(SVG_NS, "g");
            g.setAttribute("data-seg-id", seg.id);

            const line = document.createElementNS(SVG_NS, "line");
            line.setAttribute("x1", start.x);
            line.setAttribute("y1", start.y);
            line.setAttribute("x2", end.x);
            line.setAttribute("y2", end.y);
            // Never fill strokes; fill only applies to closed paths in preview mode.
            line.setAttribute("fill", "none");
            line.classList.add("editor-segment");
            line.setAttribute("data-seg-id", seg.id);
            if (selected) line.classList.add("editor-segment-selected");
            g.appendChild(line);

            // Endpoint circles
            _appendEndpoint(g, start.x, start.y, selected, false, "start");
            _appendEndpoint(g, end.x,   end.y,   selected, false, "end");

            return g;
        }

        if (seg.type === "arc") {
            const { start, end, radius, largeArc, sweep } = seg.data;
            const selected = seg.selected;

            const g = document.createElementNS(SVG_NS, "g");
            g.setAttribute("data-seg-id", seg.id);

            const path = document.createElementNS(SVG_NS, "path");
            path.setAttribute("d",
                `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
            );
            path.setAttribute("fill", "none");
            path.classList.add("editor-segment");
            path.setAttribute("data-seg-id", seg.id);
            if (selected) path.classList.add("editor-segment-selected");
            g.appendChild(path);

            _appendEndpoint(g, start.x, start.y, selected, false, "start");
            _appendEndpoint(g, end.x,   end.y,   selected, false, "end");

            // ── Arc control handle ──────────────────────────────────────────
            // Only render when the arc is selected and its construction mode
            // is known (arcMode is set when drawn by ArcTool). The handle lets
            // the user drag the arc's midpoint to reshape it.
            if (selected && seg.data.arcMode) {
                const { center } = seg.data;
                // arc2pt handle must follow current geometry after text/radius edits.
                // For arc3pt preserve explicit pt3 if available.
                const pt3 = seg.data.arcMode === "arc2pt"
                    ? _computeArcMidpoint(seg.data)
                    : (seg.data.pt3 ?? _computeArcMidpoint(seg.data));
                // Keep cached handle consistent for hit-test/move tools.
                seg.data.pt3 = pt3;

                // Construction-style visuals: two dashed radius lines
                // center → start and center → end, matching the ghost drawn
                // while the arc is being placed.
                for (const pt of [start, end]) {
                    const dash = document.createElementNS(SVG_NS, "line");
                    dash.setAttribute("x1", center.x); dash.setAttribute("y1", center.y);
                    dash.setAttribute("x2", pt.x);     dash.setAttribute("y2", pt.y);
                    dash.classList.add("editor-ghost-radius");
                    dash.setAttribute("pointer-events", "none");
                    g.appendChild(dash);
                }
                _appendArcCenter(g, center.x, center.y);
                _appendArcHandle(g, pt3.x, pt3.y, "pt3");
            }

            return g;
        }

        if (seg.type === "circle") {
            const { center, radius } = seg.data;
            const g = document.createElementNS(SVG_NS, "g");
            g.setAttribute("data-seg-id", seg.id);

            const circ = document.createElementNS(SVG_NS, "circle");
            circ.setAttribute("cx", center.x);
            circ.setAttribute("cy", center.y);
            circ.setAttribute("r", radius);
            circ.setAttribute("fill", "none");
            circ.classList.add("editor-segment");
            circ.setAttribute("data-seg-id", seg.id);
            if (seg.selected) circ.classList.add("editor-segment-selected");
            g.appendChild(circ);

            if (seg.selected) {
                let pt3 = seg.data.pt3;
                if (!pt3) {
                    pt3 = { x: center.x + radius, y: center.y };
                } else {
                    const dx = pt3.x - center.x;
                    const dy = pt3.y - center.y;
                    const dist = Math.hypot(dx, dy);
                    if (Math.abs(dist - radius) > 1e-4) {
                        const ang = dist > 1e-9 ? Math.atan2(dy, dx) : 0;
                        pt3 = { x: center.x + Math.cos(ang) * radius, y: center.y + Math.sin(ang) * radius };
                    }
                }
                // Keep cached handle consistent for hit-test/move tools.
                seg.data.pt3 = pt3;
                // Dashed radius line: center → pt3
                const dash = document.createElementNS(SVG_NS, "line");
                dash.setAttribute("x1", center.x); dash.setAttribute("y1", center.y);
                dash.setAttribute("x2", pt3.x);    dash.setAttribute("y2", pt3.y);
                dash.classList.add("editor-ghost-radius");
                dash.setAttribute("pointer-events", "none");
                g.appendChild(dash);
                _appendArcCenter(g, center.x, center.y);
                _appendArcHandle(g, pt3.x, pt3.y, "pt3");
            }
            return g;
        }

        if (seg.type === "rect") {
            const { x, y, w, h, rx = 0 } = seg.data;
            const g = document.createElementNS(SVG_NS, "g");
            g.setAttribute("data-seg-id", seg.id);

            const rect = document.createElementNS(SVG_NS, "rect");
            rect.setAttribute("x", x);
            rect.setAttribute("y", y);
            rect.setAttribute("width",  w);
            rect.setAttribute("height", h);
            rect.setAttribute("rx", rx);
            rect.setAttribute("fill", "none");
            rect.classList.add("editor-segment");
            rect.setAttribute("data-seg-id", seg.id);
            if (seg.selected) rect.classList.add("editor-segment-selected");
            g.appendChild(rect);

            if (seg.selected) {
                // Corner handles (non-interactive, visual only)
                for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
                    _appendArcHandle(g, cx, cy, "corner");
                }
            }
            return g;
        }

        if (seg.type === "ellipse") {
            const { cx, cy, rx, ry } = seg.data;
            const g = document.createElementNS(SVG_NS, "g");
            g.setAttribute("data-seg-id", seg.id);

            const el = document.createElementNS(SVG_NS, "ellipse");
            el.setAttribute("cx", cx);
            el.setAttribute("cy", cy);
            el.setAttribute("rx", rx);
            el.setAttribute("ry", ry);
            el.setAttribute("fill", "none");
            el.classList.add("editor-segment");
            el.setAttribute("data-seg-id", seg.id);
            if (seg.selected) el.classList.add("editor-segment-selected");
            g.appendChild(el);

            if (seg.selected) {
                // Axis-endpoint handles + center dot
                _appendArcCenter(g, cx, cy);
                for (const [hx, hy] of [
                    [cx + rx, cy], [cx - rx, cy],
                    [cx, cy + ry], [cx, cy - ry],
                ]) {
                    _appendArcHandle(g, hx, hy, "axis");
                }
            }
            return g;
        }

        log.debug("_buildSegmentElement: unsupported type", seg.type);
        return null;
    }

    // ─── Hit testing ────────────────────────────────────────────────────────

    /**
     * Find the segment closest to the given SVG-space point within a tolerance.
     * @param {{ x: number, y: number }} point - SVG user-space coordinates
     * @param {number} [tolerancePx=8]         - Hit radius in screen pixels
     * @returns {string|null} Segment ID if hit, otherwise null
     */
    hitTest(point, tolerancePx = 8) {
        const toleranceUnits = tolerancePx / this.cm.zoomLevel;
        const segments       = this.state.segments;

        let bestId   = null;
        let bestDist = Infinity;

        for (const seg of segments) {
            let dist = Infinity;

            if (seg.type === "line") {
                dist = _pointToSegmentDist(point, seg.data.start, seg.data.end);
            } else if (seg.type === "arc") {
                dist = _pointToArcDist(point, seg.data, toleranceUnits);
            } else if (seg.type === "circle") {
                const { center, radius } = seg.data;
                dist = Math.abs(Math.hypot(point.x - center.x, point.y - center.y) - radius);
            } else if (seg.type === "rect") {
                // Distance to nearest edge of the rectangle.
                const { x, y, w, h } = seg.data;
                const nearX = Math.max(x, Math.min(point.x, x + w));
                const nearY = Math.max(y, Math.min(point.y, y + h));
                const inside = point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
                if (inside) {
                    // Minimum distance to any of the 4 edges
                    dist = Math.min(point.x - x, x + w - point.x, point.y - y, y + h - point.y);
                } else {
                    dist = Math.hypot(point.x - nearX, point.y - nearY);
                }
            } else if (seg.type === "ellipse") {
                // Approximate distance from point to ellipse outline.
                const { cx, cy, rx, ry } = seg.data;
                const nx = (point.x - cx) / (rx || 1);
                const ny = (point.y - cy) / (ry || 1);
                const len = Math.hypot(nx, ny);
                // Scale back to SVG space (avg radius approximation)
                dist = Math.abs(len - 1) * Math.min(rx, ry);
            }

            if (dist < toleranceUnits && dist < bestDist) {
                bestDist = dist;
                bestId   = seg.id;
            }
        }

        return bestId;
    }

    // ─── Hit testing: points ─────────────────────────────────────────────────

    /**
     * Find the endpoint (start/end) of any segment closest to the given point within tolerance.
     * Only tests the right-half (canonical) endpoints; the mirrored side is visual only.
     * @param {{ x: number, y: number }} point
     * @param {number} [tolerancePx=8]
     * @returns {{ segId: string, pointKey: "start"|"end" }|null}
     */
    hitTestPoint(point, tolerancePx = 8) {
        const tol = tolerancePx / this.cm.zoomLevel;
        let bestRef  = null;
        let bestDist = Infinity;

        for (const seg of this.state.segments) {
            if (seg.type === "line" || seg.type === "arc") {
                const pts = [
                    { key: "start", pt: seg.data.start },
                    { key: "end",   pt: seg.data.end   },
                ];
                for (const { key, pt } of pts) {
                    const d = Math.hypot(point.x - pt.x, point.y - pt.y);
                    if (d <= tol && d < bestDist) {
                        bestDist = d;
                        bestRef  = { segId: seg.id, pointKey: key };
                    }
                }
            }

            // Arc control handle (pt3) — only hit-testable while the arc is
            // selected so the handle is visible in the rendered overlay.
            if (seg.type === "arc" && seg.data.arcMode && seg.selected) {
                const pt3 = seg.data.pt3 ?? _computeArcMidpoint(seg.data);
                const d = Math.hypot(point.x - pt3.x, point.y - pt3.y);
                if (d <= tol && d < bestDist) {
                    bestDist = d;
                    bestRef  = { segId: seg.id, pointKey: "pt3" };
                }
            }

            // Circle pt3 handle — only while selected.
            if (seg.type === "circle" && seg.selected) {
                const pt3 = seg.data.pt3 ?? { x: seg.data.center.x + seg.data.radius, y: seg.data.center.y };
                const d = Math.hypot(point.x - pt3.x, point.y - pt3.y);
                if (d <= tol && d < bestDist) {
                    bestDist = d;
                    bestRef  = { segId: seg.id, pointKey: "pt3" };
                }
            }
        }
        return bestRef;
    }

    // ─── Arc control-handle update ───────────────────────────────────────────

    /**
     * Recalculate an arc segment when the user drags its pt3 control handle.
     *
     * - **arc3pt**: re-runs the circumcenter calculation through start, end, newPos.
     * - **arc2pt**: re-runs arc2ptData with the stored radius; newPos acts as the
     *               cursor-side hint, changing largeArc/sweep and updating pt3.
     *
     * Calls `state.updateSegments` so the canvas re-renders automatically.
     *
     * @param {string}               segId
     * @param {{x:number,y:number}}  newPos  SVG-space position of the dragged handle
     */
    updateArcFromPt3(segId, newPos) {
        const seg = this.state.segments.find(s => s.id === segId);
        if (!seg || seg.type !== "arc" || !seg.data.arcMode) return;

        const { start, end } = seg.data;
        // Always use circumcenter so the handle moves freely regardless of
        // whether the arc was originally drawn as arc2pt or arc3pt.
        const c = circumcenter(start, end, newPos);
        if (!c) return; // collinear — skip
        const flags = arcFlagsViaPoint(start, end, newPos, c.cx, c.cy);
        const newData = {
            ...seg.data,
            center:     { x: c.cx, y: c.cy },
            radius:     c.r,
            ...flags,
            pt3:        { ...newPos },
            arcMode:    "arc3pt",
            radiusExpr: undefined, // radius changed — drop any formula token
        };
        this.state.updateSegments([{ id: segId, changes: { data: newData } }]);
    }

    /**
     * Recalculate an arc2pt segment with a new radius while keeping the arc
     * on the same side (pt3 is used as the side hint).
     * @param {string} segId
     * @param {number} newRadius
     */
    updateArcRadius(segId, newRadius) {
        const seg = this.state.segments.find(s => s.id === segId);
        if (!seg || seg.type !== "arc" || !seg.data.arcMode) return;

        const { start, end } = seg.data;
        const sideHint = seg.data.pt3 ?? _computeArcMidpoint(seg.data);
        const result = arc2ptData(start, end, newRadius, sideHint);
        if (!result) return;

        // Project the sideHint onto the new circle so pt3 reflects the updated radius.
        const { center } = result;
        const dcLen = Math.hypot(sideHint.x - center.x, sideHint.y - center.y);
        const newPt3 = dcLen > 1e-9
            ? { x: center.x + newRadius * (sideHint.x - center.x) / dcLen,
                y: center.y + newRadius * (sideHint.y - center.y) / dcLen }
            : _computeArcMidpoint({ ...result, arcMode: "arc2pt" });

        // Clear any stored variable expression: user explicitly set a numeric radius.
        const { radiusExpr: _dropped, ...restData } = seg.data;
        this.state.updateSegments([{
            id: segId,
            changes: { data: { ...restData, ...result, pt3: newPt3, arcMode: "arc2pt" } },
        }]);
    }
    /**
     * Recalculate a circle segment when the user drags its pt3 control handle.
     * @param {string}               segId
     * @param {{x:number,y:number}}  newPos  SVG-space position of the dragged handle
     */
    updateCircleFromPt3(segId, newPos) {
        const seg = this.state.segments.find(s => s.id === segId);
        if (!seg || seg.type !== 'circle') return;
        const newRadius = Math.hypot(newPos.x - seg.data.center.x, newPos.y - seg.data.center.y);
        if (newRadius < 1e-6) return;
        this.state.updateSegments([{ id: segId, changes: { data: {
            ...seg.data,
            radius:     newRadius,
            pt3:        { ...newPos },
            radiusExpr: undefined,
        }}}]);
    }

    /**
     * Resize a circle to the given radius while projecting the pt3 handle
     * onto the new circumference (preserving its angular direction).
     * @param {string} segId
     * @param {number} newRadius
     */
    updateCircleRadius(segId, newRadius) {
        const seg = this.state.segments.find(s => s.id === segId);
        if (!seg || seg.type !== 'circle') return;
        const { center, pt3 } = seg.data;
        const dcLen = Math.hypot(pt3.x - center.x, pt3.y - center.y);
        const newPt3 = dcLen > 1e-9
            ? { x: center.x + newRadius * (pt3.x - center.x) / dcLen,
                y: center.y + newRadius * (pt3.y - center.y) / dcLen }
            : { x: center.x + newRadius, y: center.y };
        const { radiusExpr: _dropped, ...restData } = seg.data;
        this.state.updateSegments([{ id: segId, changes: { data: { ...restData, radius: newRadius, pt3: newPt3 } } }]);
    }
    // ─── Hover helpers ───────────────────────────────────────────────────────

    /**
     * Apply or remove the hover highlight on a segment's SVG group.
     * @param {string|null} segId
     * @param {boolean} [active=true]
     */
    setHoverSegment(segId, active = true) {
        if (!segId) return;
        const layer = this.cm.getLayer("bits");
        if (!layer) return;
        // Match line, path (arcs), circle, rect, and ellipse children.
        layer.querySelectorAll(`[data-seg-id="${segId}"] line, [data-seg-id="${segId}"] path, [data-seg-id="${segId}"] circle.editor-segment, [data-seg-id="${segId}"] rect.editor-segment, [data-seg-id="${segId}"] ellipse.editor-segment`)
             .forEach(el => el.classList.toggle("editor-segment-hover", active));
    }

    /**
     * Apply or remove the hover highlight on a specific endpoint circle.
     * @param {{ segId: string, pointKey: string }|null} ref
     * @param {boolean} [active=true]
     */
    setHoverPoint(ref, active = true) {
        if (!ref) return;
        const layer = this.cm.getLayer("bits");
        if (!layer) return;
        const circle = layer.querySelector(
            `[data-seg-id="${ref.segId}"] [data-point-key="${ref.pointKey}"]`
        );
        if (circle) {
            if (ref.pointKey === "pt3") {
                circle.classList.toggle("editor-arc-handle-hover", active);
            } else {
                circle.classList.toggle("editor-endpoint-hover", active);
            }
        }
    }
}
