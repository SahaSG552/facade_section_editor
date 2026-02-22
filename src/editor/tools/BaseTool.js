/**
 * BaseTool — abstract base class for all drawing and editing tools.
 *
 * Each tool handles mouse/pointer events on the editor canvas and updates
 * the EditorStateManager in response. Tools are stateless between activations —
 * all persistent data lives in EditorStateManager.
 *
 * ### Lifecycle
 * 1. `activate(context)` — tool becomes active (set up internal state, show hints)
 * 2. Mouse events flow: `onPointerDown` → `onPointerMove` → `onPointerUp`
 * 3. `deactivate()` — tool loses focus (clear ghost, clean up)
 *
 * ### Context object
 * Each tool receives a shared context on `activate()`:
 * ```js
 * {
 *   state:  EditorStateManager,   // mutable path state
 *   canvas: EditorCanvas,         // rendering + coordinate helpers
 * }
 * ```
 *
 * ### Implementing a tool
 * ```js
 * class LineTool extends BaseTool {
 *   activate(ctx) {
 *     super.activate(ctx);
 *     this._startPoint = null;
 *   }
 *   onPointerDown(pos) {
 *     if (!this._startPoint) {
 *       this._startPoint = pos;
 *     } else {
 *       this.ctx.state.addSegment({ type: "line", data: { start: this._startPoint, end: pos } });
 *       this._startPoint = pos; // continue polyline
 *     }
 *   }
 *   onPointerMove(pos) {
 *     if (this._startPoint) {
 *       this.ctx.canvas.setGhost(buildLineElement(this._startPoint, pos));
 *     }
 *   }
 * }
 * ```
 */
export default class BaseTool {
    constructor() {
        /**
         * Shared editor context — set on activate()
         * @type {{ state: import("../EditorStateManager.js").default, canvas: import("../EditorCanvas.js").default }|null}
         */
        this.ctx = null;

        /** @type {string} — tool ID, set by subclass or constructor */
        this.id = "base";
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    /**
     * Called when this tool becomes the active tool.
     * Subclasses MUST call `super.activate(ctx)` first.
     * @param {{ state: import("../EditorStateManager.js").default, canvas: import("../EditorCanvas.js").default }} ctx
     */
    activate(ctx) {
        this.ctx = ctx;
    }

    /**
     * Called when another tool is selected or edit mode exits.
     * Subclasses should clear any in-progress ghost and internal state.
     * Subclasses MUST call `super.deactivate()`.
     */
    deactivate() {
        if (this.ctx) this.ctx.canvas.clearGhost();
        this.ctx = null;
    }

    // ─── Event handlers ─────────────────────────────────────────────────────
    // All positions are already snapped SVG user-space coordinates.

    /**
     * Pointer pressed on the canvas.
     * @param {{ x: number, y: number }} pos - Snapped SVG user-space position
     * @param {MouseEvent} _e - Original event (available if needed)
     */
    // eslint-disable-next-line no-unused-vars
    onPointerDown(pos, _e) {}

    /**
     * Pointer moved on the canvas.
     * @param {{ x: number, y: number }} pos - Snapped SVG user-space position
     * @param {MouseEvent} _e
     */
    // eslint-disable-next-line no-unused-vars
    onPointerMove(pos, _e) {}

    /**
     * Pointer released on the canvas.
     * @param {{ x: number, y: number }} pos - Snapped SVG user-space position
     * @param {MouseEvent} _e
     */
    // eslint-disable-next-line no-unused-vars
    onPointerUp(pos, _e) {}

    /**
     * Key pressed while this tool is active.
     * Return `true` to indicate the event was consumed (prevents further handling).
     * @param {KeyboardEvent} _e
     * @returns {boolean}
     */
    // eslint-disable-next-line no-unused-vars
    onKeyDown(_e) { return false; }

    /**
     * Called when the user double-clicks (e.g., to finish a polyline).
     * @param {{ x: number, y: number }} pos
     * @param {MouseEvent} _e
     */
    // eslint-disable-next-line no-unused-vars
    onDblClick(pos, _e) {}

    /**
     * Called when the user right-clicks to confirm/finish the current command.
     * Return `true` if the event was consumed so the caller can prevent default.
     * @param {{ x: number, y: number }} pos - Snapped SVG-space position at right-click
     * @param {MouseEvent} _e
     * @returns {boolean}
     */
    // eslint-disable-next-line no-unused-vars
    onConfirm(pos, _e) { return false; }

    /**
     * Returns true if this tool has an in-progress command that should
     * intercept right-click (to confirm/finish). False by default (for cursor).
     * @returns {boolean}
     */
    hasActiveCommand() { return false; }
}
