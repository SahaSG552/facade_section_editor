import LoggerFactory from "../../core/LoggerFactory.js";
import BaseTool from "./BaseTool.js";

const log = LoggerFactory.createLogger("MirrorTool");

/**
 * MirrorTool — mirror selected segments across a user-defined axis.
 *
 * ### Interaction flow
 * ```
 * 1. activate(state, canvas)
 *      - Reads selected segment IDs from `state.getSelection()`.
 *      - If nothing is selected the tool does nothing (logs a warning, deactivates).
 *
 * 2. First pointer click → _axisStart = snapped canvas point.
 *      - Visual: draw a short cross-hair at _axisStart.
 *
 * 3. Pointer move → update _axisEnd = current snapped canvas point.
 *      - Visual: show ghost axis line from _axisStart to _axisEnd.
 *      - Show ghost (dashed/semi-transparent) copies of the mirrored segments.
 *
 * 4. Second pointer click → _axisEnd confirmed.
 *      - Ghost remains visible.
 *      - Tool now waits for right-click confirm or Escape cancel.
 *
 * 5. Right-click / onConfirm()
 *      - For each selected segment, compute the mirrored start/end.
 *      - Call state.addSegment() for each mirrored copy.
 *      - Clear ghost overlay.
 *      - Deactivate tool (returns to CursorTool).
 *
 * 6. Escape / onCancel()
 *      - Clear ghost overlay.
 *      - Deactivate tool without modifying state.
 * ```
 *
 * ### Mirror math
 * Reflect point **P** over line through **A** and **B**:
 * ```
 * d  = normalize(B - A)
 * t  = dot(P - A, d)
 * P' = 2*(A + d*t) - P
 * ```
 * Apply to each endpoint of each selected segment to get the mirrored segment.
 *
 * ### Ghost rendering
 * - Use `canvas.getGhostLayer()` (an SVG `<g class="ghost-layer">`).
 * - Render mirrored segments as `<line class="editor-segment-mirror">` elements.
 * - Render axis as `<line class="editor-axis-ghost">` while defining the second point.
 * - Clear ghost layer on confirm or cancel.
 *
 * ### History
 * - Push a single undo entry after committing all mirrored segments.
 * - Use `state.pushHistory()` after all `state.addSegment()` calls.
 *
 * @extends BaseTool
 *
 * @todo Implement full interaction logic described above.
 */
class MirrorTool extends BaseTool {
    constructor() {
        super("mirror");

        /** @type {{x:number,y:number}|null} First axis point (canvas-space). */
        this._axisStart = null;

        /** @type {{x:number,y:number}|null} Second axis point (canvas-space). */
        this._axisEnd = null;

        /**
         * Phase of the tool:
         * - `"idle"`      : activated, waiting for first click
         * - `"axis"`      : first point set, tracking pointer for second
         * - `"confirm"`   : both axis points set, waiting for right-click confirm
         * @type {"idle"|"axis"|"confirm"}
         */
        this._phase = "idle";

        /** IDs of segments to mirror (captured at activate time). */
        this._selectionIds = [];

        // TODO: reference to ghost layer SVG group
        this._ghostGroup = null;
    }

    // ─── BaseTool overrides ───────────────────────────────────────────────────

    /**
     * Called when the toolbar activates this tool.
     * @param {import("../EditorStateManager.js").default} state
     * @param {import("../EditorCanvas.js").default} canvas
     */
    activate(state, canvas) {
        super.activate(state, canvas);
        this._selectionIds = [...state.getSelection()];
        if (this._selectionIds.length === 0) {
            log.warn("MirrorTool: no segments selected — deactivating");
            this.deactivate();
            return;
        }
        this._phase = "idle";
        this._axisStart = null;
        this._axisEnd = null;
        log.info("MirrorTool activated with", this._selectionIds.length, "segment(s)");
        // TODO: attach ghost layer to canvas SVG
    }

    /** @param {import("../EditorStateManager.js").default} state */
    deactivate(state, canvas) {
        this._clearGhost();
        this._phase = "idle";
        this._axisStart = null;
        this._axisEnd = null;
        this._selectionIds = [];
        super.deactivate(state, canvas);
    }

    /**
     * Returns true while the tool is defining the axis or waiting for confirm,
     * so that right-click is not passed to the canvas pan handler.
     * @returns {boolean}
     */
    hasActiveCommand() {
        return this._phase !== "idle";
    }

    // ─── Pointer event handlers ───────────────────────────────────────────────

    /** @param {{x:number,y:number}} point  Canvas (SVG) coordinates, already snapped. */
    onPointerDown(point) {
        // TODO: implement
        //
        // if phase === "idle":
        //   _axisStart = point; _phase = "axis"
        //
        // else if phase === "axis":
        //   _axisEnd = point; _phase = "confirm"
        //   (ghost stays visible; wait for onConfirm/onCancel)
        log.debug("onPointerDown (TODO)", { phase: this._phase, point });
    }

    /** @param {{x:number,y:number}} point  Current snapped pointer position. */
    onPointerMove(point) {
        // TODO: implement
        //
        // if phase === "axis":
        //   _axisEnd = point (preview only)
        //   _renderGhost()
        log.debug("onPointerMove (TODO)", { phase: this._phase, point });
    }

    /**
     * Right-click confirmed — commit mirrored segments to state.
     */
    onConfirm() {
        // TODO: implement
        //
        // if phase !== "confirm": return
        //
        // const segs = _selectionIds.map(id => state.getSegment(id))
        // for (const seg of segs) {
        //   const mStart = _reflectPoint(seg.data.start, _axisStart, _axisEnd)
        //   const mEnd   = _reflectPoint(seg.data.end,   _axisStart, _axisEnd)
        //   state.addSegment({ start: mStart, end: mEnd })
        // }
        // state.pushHistory()
        // _clearGhost()
        // deactivate()
        log.debug("onConfirm (TODO)", { phase: this._phase });
    }

    /**
     * Escape pressed — cancel without modifying state.
     */
    onCancel() {
        // TODO: implement
        // _clearGhost(); deactivate()
        log.debug("onCancel (TODO)", { phase: this._phase });
        this.deactivate();
    }

    // ─── Ghost rendering ──────────────────────────────────────────────────────

    /**
     * Re-render the ghost overlay: axis line + mirrored segment previews.
     * @private
     */
    _renderGhost() {
        // TODO: implement
        // 1. Clear previous ghost elements from _ghostGroup.
        // 2. Draw axis line from _axisStart to _axisEnd (class "editor-axis-ghost").
        // 3. For each selected seg dot compute mirrored seg via _reflectPoint and
        //    draw a <line class="editor-segment-mirror"> in _ghostGroup.
        log.debug("_renderGhost (TODO)");
    }

    /**
     * Remove all ghost elements from the canvas overlay.
     * @private
     */
    _clearGhost() {
        // TODO: remove all children of _ghostGroup (if attached)
        log.debug("_clearGhost (TODO)");
    }

    // ─── Math helpers ─────────────────────────────────────────────────────────

    /**
     * Reflect point P over the infinite line through A and B.
     *
     * Formula:
     * ```
     *   d  = normalize(B - A)
     *   t  = dot(P - A, d)
     *   P' = 2*(A + d*t) - P
     * ```
     *
     * @param {{x:number,y:number}} P  Point to reflect.
     * @param {{x:number,y:number}} A  First point on the axis line.
     * @param {{x:number,y:number}} B  Second point on the axis line.
     * @returns {{x:number,y:number}}
     * @private
     */
    _reflectPoint(P, A, B) {
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq < 1e-12) return { x: P.x, y: P.y }; // degenerate axis — return original
        const t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / lenSq;
        const footX = A.x + t * dx;
        const footY = A.y + t * dy;
        return {
            x: 2 * footX - P.x,
            y: 2 * footY - P.y,
        };
    }
}

export default MirrorTool;
