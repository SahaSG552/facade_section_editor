import LoggerFactory from "../core/LoggerFactory.js";

const SVG_NS = "http://www.w3.org/2000/svg";

/** @param {SVGGElement} g @param {number} cx @param {number} cy @param {boolean} selected @param {boolean} [mirror] @param {string} [pointKey] */
function _appendEndpoint(g, cx, cy, selected, mirror = false, pointKey = "") {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", "0.05");
    c.classList.add("editor-endpoint");
    if (mirror)   c.classList.add("editor-endpoint-mirror");
    if (selected) c.classList.add("editor-endpoint-selected");
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
import SnapManager from "./snaps/SnapManager.js";

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
            if (seg.type === "line") {
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
        }
        return bestRef;
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
        const groups = layer.querySelectorAll(`[data-seg-id="${segId}"] line`);
        groups.forEach(el => el.classList.toggle("editor-segment-hover", active));
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
        if (circle) circle.classList.toggle("editor-endpoint-hover", active);
    }
}
