import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("MoveTool");

/**
 * MoveTool — move selected segments or individual endpoints.
 *
 * ### Interaction model (CAD-style click-to-pick, click-to-place)
 *
 * **IDLE**
 * - Hover: highlight segments and endpoints
 * - Click on **endpoint**:
 *   - Multi-selected → enter MOVING_SEG mode (all selected move together)
 *   - Single selected → enter MOVING_POINT mode for all weld-connected endpoints
 *     (adjacent segments that share the vertex move together)
 * - Click on **segment** (any):
 *   - Select the **whole connected chain** + enter MOVING_SEG mode
 * - **Shift+click** on segment: toggle whole chain in/out of selection (no move)
 * - Click on **empty space**: deselect all
 * - **Delete / Backspace**: delete selected segments
 *
 * **MOVING_SEG** (all selected segments follow the cursor)
 * - Move → all selected segments translate by the same delta
 * - Click (any) → commit to history; return to IDLE
 * - Escape → restore all origins; return to IDLE
 *
 * **MOVING_POINT** (welded vertex: all endpoints at the same position follow cursor)
 * - Move → all vertex refs track cursor (keeps adjacent segments connected)
 * - Click (any) → commit; return to IDLE
 * - Escape → restore origin; return to IDLE
 */
export default class MoveTool extends BaseTool {
    constructor() {
        super();
        this.id = "move";

        /** @private @type {"idle"|"moving-seg"|"moving-point"} */
        this._mode = "idle";

        // ── MOVING_SEG ───────────────────────────────────────────────────────
        /** IDs of all segments being moved. @private @type {string[]} */
        this._movingSegIds = [];
        /**
         * Origins for each moving segment: id → deep-copy of data at pick time.
         * @private @type {Map<string, object>}
         */
        this._movingOrigins = new Map();
        /**
         * Cursor-to-anchor-start offset at pick time (used to compute delta).
         * @private @type {{dx:number,dy:number}}
         */
        this._moveOffset = { dx: 0, dy: 0 };
        /** ID of the segment the user clicked (anchor for offset). @private @type {string|null} */
        this._anchorSegId = null;

        // ── MOVING_POINT ─────────────────────────────────────────────────────
        /**
         * All vertex refs being moved together (includes welded adjacent endpoints).
         * @private @type {Array<{segId:string,pointKey:'start'|'end'}>}
         */
        this._movingPoints = [];
        /**
         * Per-segment origin data keyed by segId — used to restore on Escape.
         * @private @type {Map<string,object>}
         */
        this._movingPointsOrigins = new Map();

        // ── Hover ────────────────────────────────────────────────────────────
        /** @private @type {string|null} */
        this._hoverSegId = null;
        /** @private @type {{segId:string,pointKey:string}|null} */
        this._hoverPoint = null;
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    activate(ctx) {
        super.activate(ctx);
        log.debug("MoveTool active");
    }

    deactivate() {
        this._clearHover();
        this._reset();
        super.deactivate();
    }

    hasActiveCommand() {
        return this._mode !== "idle";
    }

    // ─── Pointer events ─────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        // ── Commit placement ─────────────────────────────────────────────
        if (this._mode === "moving-seg" || this._mode === "moving-point") {
            this._commitMove();
            return;
        }

        // ── IDLE: endpoint hit has highest priority ───────────────────────
        const pointHit = this.ctx.canvas.hitTestPoint(pos);
        if (pointHit) {
            const seg = this._findSeg(pointHit.segId);
            if (seg) {
                const multiSelected = this.ctx.state.selectedIds.size > 1;
                if (multiSelected) {
                    // When several segments are already selected, a click on any endpoint
                    // moves ALL selected segments together (the endpoint acts as anchor).
                    const selectedIds = [...this.ctx.state.selectedIds];
                    this._movingOrigins.clear();
                    for (const id of selectedIds) {
                        const s = this._findSeg(id);
                        if (s) this._movingOrigins.set(id, JSON.parse(JSON.stringify(s.data)));
                    }
                    this._movingSegIds = selectedIds;
                    this._anchorSegId  = pointHit.segId;
                    const anchorPoint  = seg.data[pointHit.pointKey];
                    this._moveOffset   = { dx: pos.x - anchorPoint.x, dy: pos.y - anchorPoint.y };
                    this._mode         = "moving-seg";
                    log.debug("MoveTool: moving", selectedIds.length, "segs via endpoint anchor");
                } else {
                    // Single: move the clicked vertex AND all segments that share
                    // the same position (welded-vertex — adjacent endpoints move together).
                    const vertexPt = seg.data[pointHit.pointKey];
                    const allRefs  = this.ctx.state.getSegmentsAtVertex(vertexPt);
                    this._movingPoints = allRefs;
                    this._movingPointsOrigins.clear();
                    for (const ref of allRefs) {
                        const s = this._findSeg(ref.segId);
                        if (s) this._movingPointsOrigins.set(ref.segId, JSON.parse(JSON.stringify(s.data)));
                    }
                    this._mode = "moving-point";
                    this.ctx.state.setSelection(pointHit.segId);
                    log.debug("MoveTool: moving welded vertex", allRefs.length, "refs");
                }
            }
            return;
        }

        // ── IDLE: segment hit ────────────────────────────────────────────
        const hitId = this.ctx.canvas.hitTest(pos);
        if (hitId) {
            if (e.shiftKey) {
                // Toggle the entire chain as a single unit.
                const chainIds = this.ctx.state.getChain(hitId).map(s => s.id);
                const allSel   = chainIds.every(id => this.ctx.state.selectedIds.has(id));
                if (allSel) {
                    const keep = [...this.ctx.state.selectedIds].filter(id => !chainIds.includes(id));
                    this.ctx.state.setSelection(keep);
                } else {
                    this.ctx.state.setSelection([...this.ctx.state.selectedIds, ...chainIds]);
                }
                return;
            }

            // Select the whole connected chain and move it as one unit.
            const chainIds = this.ctx.state.getChain(hitId).map(s => s.id);
            this.ctx.state.setSelection(chainIds);

            // Capture origins for all selected segments (= the whole chain).
            const selectedIds = [...this.ctx.state.selectedIds];
            this._movingOrigins.clear();
            for (const id of selectedIds) {
                const s = this._findSeg(id);
                if (s) this._movingOrigins.set(id, JSON.parse(JSON.stringify(s.data)));
            }
            this._movingSegIds = selectedIds;
            this._anchorSegId  = hitId;

            // Offset = cursor relative to anchor segment's start point
            const anchorSeg = this._findSeg(hitId);
            if (anchorSeg) {
                this._moveOffset = {
                    dx: pos.x - anchorSeg.data.start.x,
                    dy: pos.y - anchorSeg.data.start.y,
                };
            }

            this._mode = "moving-seg";
            log.debug("MoveTool: moving chain of", selectedIds.length, "segment(s)");
            return;
        }

        // ── IDLE: empty click ────────────────────────────────────────────
        if (!e.shiftKey) this.ctx.state.clearSelection();
    }

    onPointerMove(pos) {
        // ── Translate all selected segments ──────────────────────────────
        if (this._mode === "moving-seg" && this._anchorSegId) {
            const anchorOrigin = this._movingOrigins.get(this._anchorSegId);
            if (!anchorOrigin) return;

            // Compute delta from anchor origin
            const newStartX = pos.x - this._moveOffset.dx;
            const newStartY = pos.y - this._moveOffset.dy;
            const dx = newStartX - anchorOrigin.start.x;
            const dy = newStartY - anchorOrigin.start.y;

            // Batch-update all moving segments
            const updates = [];
            for (const id of this._movingSegIds) {
                const origin = this._movingOrigins.get(id);
                if (!origin) continue;
                updates.push({
                    id,
                    changes: {
                        data: {
                            start: { x: origin.start.x + dx, y: origin.start.y + dy },
                            end:   { x: origin.end.x   + dx, y: origin.end.y   + dy },
                        },
                    },
                });
            }
            this.ctx.state.updateSegments(updates);
            return;
        }

        // ── Move welded vertex (one or more endpoint refs) ───────────────
        if (this._mode === "moving-point" && this._movingPoints.length > 0) {
            const updates = [];
            for (const ref of this._movingPoints) {
                const seg = this._findSeg(ref.segId);
                if (seg) updates.push({
                    id: ref.segId,
                    changes: { data: { ...seg.data, [ref.pointKey]: { x: pos.x, y: pos.y } } },
                });
            }
            this.ctx.state.updateSegments(updates);
            return;
        }

        // ── IDLE: hover ──────────────────────────────────────────────────
        this._updateHover(pos);
    }

    onPointerUp(_pos, _e) {
        // All placement happens in onPointerDown (click-click model)
    }

    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._mode === "moving-seg") {
                // Restore all origins
                const updates = [];
                for (const id of this._movingSegIds) {
                    const origin = this._movingOrigins.get(id);
                    if (origin) updates.push({ id, changes: { data: origin } });
                }
                this.ctx.state.updateSegments(updates);
                this._reset();
                return true;
            }
            if (this._mode === "moving-point" && this._movingPoints.length > 0) {
                const updates = [];
                for (const ref of this._movingPoints) {
                    const origin = this._movingPointsOrigins.get(ref.segId);
                    if (origin) updates.push({ id: ref.segId, changes: { data: origin } });
                }
                this.ctx.state.updateSegments(updates);
                this._reset();
                return true;
            }
        }
        if (e.key === "Delete" || e.key === "Backspace") {
            if (this._mode === "idle") {
                const ids = [...this.ctx.state.selectedIds];
                if (ids.length > 0) {
                    this.ctx.state.deleteSegments(ids);
                    return true;
                }
            }
        }
        return false;
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    /** @private */
    _findSeg(id) {
        return this.ctx.state.segments.find(s => s.id === id) ?? null;
    }

    /** @private — commit the current move and push one history entry */
    _commitMove() {
        this.ctx.state._pushHistory("Move");
        this._reset();
    }

    /** @private — reset state to idle (used after commit or Escape) */
    _reset() {
        this._mode              = "idle";
        this._movingSegIds      = [];
        this._movingOrigins     = new Map();
        this._moveOffset        = { dx: 0, dy: 0 };
        this._anchorSegId         = null;
        this._movingPoints        = [];
        this._movingPointsOrigins = new Map();
    }

    // ─── Hover ──────────────────────────────────────────────────────────────

    /** @private */
    _updateHover(pos) {
        const canvas = this.ctx.canvas;

        const pointHit = canvas.hitTestPoint(pos);
        if (pointHit) {
            if (this._hoverSegId) {
                canvas.setHoverSegment(this._hoverSegId, false);
                this._hoverSegId = null;
            }
            if (!this._hoverPoint ||
                this._hoverPoint.segId    !== pointHit.segId ||
                this._hoverPoint.pointKey !== pointHit.pointKey) {
                if (this._hoverPoint) canvas.setHoverPoint(this._hoverPoint, false);
                canvas.setHoverPoint(pointHit, true);
                this._hoverPoint = pointHit;
            }
            return;
        }

        if (this._hoverPoint) {
            canvas.setHoverPoint(this._hoverPoint, false);
            this._hoverPoint = null;
        }

        const hitId = canvas.hitTest(pos);
        if (hitId !== this._hoverSegId) {
            if (this._hoverSegId) canvas.setHoverSegment(this._hoverSegId, false);
            if (hitId)            canvas.setHoverSegment(hitId, true);
            this._hoverSegId = hitId;
        }
    }

    /** @private */
    _clearHover() {
        if (!this.ctx) return;
        if (this._hoverSegId) {
            this.ctx.canvas.setHoverSegment(this._hoverSegId, false);
            this._hoverSegId = null;
        }
        if (this._hoverPoint) {
            this.ctx.canvas.setHoverPoint(this._hoverPoint, false);
            this._hoverPoint = null;
        }
    }
}
