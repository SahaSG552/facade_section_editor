import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { circumcenter, arc2ptData, arcFlagsViaPoint } from "./ArcTool.js";

const log = LoggerFactory.createLogger("MoveTool");

/** Epsilon for floating-point coordinate comparisons. */
const EPS = 1e-6;

/**
 * Compare two segment data objects geometrically.
 * Returns true when all meaningful numeric fields are equal within EPS.
 * Fields like pt3, arcMode, radiusExpr are intentionally ignored so that
 * restoring the same geometry (but potentially different aux metadata) still
 * counts as a no-op.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function _segDataEqual(a, b) {
    if (!a || !b) return false;
    const p = (u, v) => Math.abs(u.x - v.x) < EPS && Math.abs(u.y - v.y) < EPS;
    if (a.start  && (!b.start  || !p(a.start,  b.start)))  return false;
    if (a.end    && (!b.end    || !p(a.end,    b.end)))    return false;
    if (a.center && (!b.center || !p(a.center, b.center))) return false;
    if (typeof a.radius   === 'number' && Math.abs(a.radius - b.radius)     > EPS) return false;
    if (typeof a.largeArc === 'number' && a.largeArc !== b.largeArc)               return false;
    if (typeof a.sweep    === 'number' && a.sweep    !== b.sweep)                   return false;
    return true;
}

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

        // ── Arc pt3 handle drag ───────────────────────────────────────────────
        /** @private @type {{segId:string, origin:object}|null} */
        this._movingPt3 = null;
        /** @private @type {HTMLElement|null} */
        this._arcPopup = null;
        /** @private whether the radius input currently has keyboard focus */
        this._inputFocused = false;
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
        // ── Commit placement (click-to-place model) ──────────────────────────────
        if (this._mode === "moving-seg" || this._mode === "moving-point") {
            this._commitMove();
            return;
        }
        // Arc pt3: second click → commit placement
        if (this._mode === "moving-pt3" && this._movingPt3) {
            // Apply the current cursor position one last time, then commit.
            const rawPos = e ? this.ctx.canvas.screenToSVG(e) : pos;
            this.ctx.canvas.updateArcFromPt3(this._movingPt3.segId, rawPos);
            this._commitPt3();
            return;
        }

        // Use raw (unsnapped) position for hit-testing so that grid snap does not
        // prevent clicking on arcs and segments between grid nodes.
        const rawPos = e ? this.ctx.canvas.screenToSVG(e) : pos;

        // ── IDLE: arc control handle (pt3) has highest priority ──────────────
        const pointHit = this.ctx.canvas.hitTestPoint(rawPos);
        if (pointHit?.pointKey === "pt3") {
            const seg = this._findSeg(pointHit.segId);
            if (seg && seg.data.arcMode) {
                // Capture origin data for Escape-restore.
                this._movingPt3 = {
                    segId:  seg.id,
                    origin: JSON.parse(JSON.stringify(seg.data)),
                };
                this._mode = "moving-pt3";
                // Make sure the arc is selected so the handle stays visible.
                if (!this.ctx.state.selectedIds.has(seg.id)) {
                    const chainIds = this.ctx.state.getChain(seg.id).map(s => s.id);
                    this.ctx.state.setSelection(chainIds);
                }
                // Show radius popup for all arc modes.
                if (seg.data.arcMode) this._showArcPopup(e, seg);
                return; // first click — do NOT start move-seg etc.
            }
        }

        // ── IDLE: endpoint hit has highest priority ──────────────────────────
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
        const hitId = this.ctx.canvas.hitTest(rawPos);
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

            // Offset = cursor relative to anchor segment's start point (or center for circles)
            const anchorSeg = this._findSeg(hitId);
            if (anchorSeg) {
                const anchorRef =
                    anchorSeg.data.center && !anchorSeg.data.start
                        ? anchorSeg.data.center                              // circle
                    : anchorSeg.data.cx !== undefined
                        ? { x: anchorSeg.data.cx, y: anchorSeg.data.cy }    // ellipse
                    : anchorSeg.data.x !== undefined && !anchorSeg.data.start
                        ? { x: anchorSeg.data.x, y: anchorSeg.data.y }      // rect
                        : anchorSeg.data.start;                              // line / arc
                this._moveOffset = {
                    dx: pos.x - anchorRef.x,
                    dy: pos.y - anchorRef.y,
                };
            }

            this._mode = "moving-seg";
            log.debug("MoveTool: moving chain of", selectedIds.length, "segment(s)");
            return;
        }

        // ── IDLE: empty click ────────────────────────────────────────────
        if (!e.shiftKey) this.ctx.state.clearSelection();
    }

    onPointerMove(pos, e) {
        // ── Arc/circle pt3 following ───────────────────────────────────────────────
        if (this._mode === "moving-pt3" && this._movingPt3) {
            const rawPos = e ? this.ctx.canvas.screenToSVG(e) : pos;
            const _pt3Seg = this._findSeg(this._movingPt3.segId);
            if (_pt3Seg?.type === 'circle') {
                this.ctx.canvas.updateCircleFromPt3(this._movingPt3.segId, rawPos);
            } else {
                this.ctx.canvas.updateArcFromPt3(this._movingPt3.segId, rawPos);
            }
            if (e) this._positionArcPopup(e);
            // Update the radius input live, but only if the user is not typing in it.
            if (this._arcPopup && !this._inputFocused) {
                const seg = this._findSeg(this._movingPt3.segId);
                if (seg) {
                    const inp = this._arcPopup.querySelector("input");
                    if (inp) inp.value = seg.data.radius.toFixed(3);
                }
            }
            return;
        }

        // ── Translate all selected segments ──────────────────────────────
        if (this._mode === "moving-seg" && this._anchorSegId) {
            const anchorOrigin = this._movingOrigins.get(this._anchorSegId);
            if (!anchorOrigin) return;

            // Compute delta from anchor origin (circles use center; lines/arcs use start).
            const anchorRef = anchorOrigin.center && !anchorOrigin.start
                ? anchorOrigin.center
                : anchorOrigin.start;
            const newRefX = pos.x - this._moveOffset.dx;
            const newRefY = pos.y - this._moveOffset.dy;
            const dx = newRefX - anchorRef.x;
            const dy = newRefY - anchorRef.y;

            // Batch-update all moving segments
            const updates = [];
            for (const id of this._movingSegIds) {
                const origin = this._movingOrigins.get(id);
                if (!origin) continue;
                let newData;
                if (origin.center !== undefined && origin.start === undefined) {
                    // Circle: translate center (and pt3)
                    newData = {
                        ...origin,
                        center: { x: origin.center.x + dx, y: origin.center.y + dy },
                        ...(origin.pt3 && { pt3: { x: origin.pt3.x + dx, y: origin.pt3.y + dy } }),
                    };
                } else if (origin.cx !== undefined) {
                    // Ellipse: translate cx/cy
                    newData = { ...origin, cx: origin.cx + dx, cy: origin.cy + dy };
                } else if (origin.x !== undefined && origin.start === undefined) {
                    // Rect: translate x/y
                    newData = { ...origin, x: origin.x + dx, y: origin.y + dy };
                } else {
                    newData = {
                        ...origin,
                        start: { x: origin.start.x + dx, y: origin.start.y + dy },
                        end:   { x: origin.end.x   + dx, y: origin.end.y   + dy },
                    };
                    // Translate arc center and pt3 control handle.
                    if (origin.center) {
                        newData.center = { x: origin.center.x + dx, y: origin.center.y + dy };
                    }
                    if (origin.pt3) {
                        newData.pt3 = { x: origin.pt3.x + dx, y: origin.pt3.y + dy };
                    }
                }
                updates.push({ id, changes: { data: newData } });
            }
            this.ctx.state.updateSegments(updates);
            return;
        }

        // ── Move welded vertex (one or more endpoint refs) ───────────────
        if (this._mode === "moving-point" && this._movingPoints.length > 0) {
            const updates = [];
            for (const ref of this._movingPoints) {
                const origin = this._movingPointsOrigins.get(ref.segId);
                if (!origin) continue;

                const newPt   = { x: pos.x, y: pos.y };
                const newData = { ...origin, [ref.pointKey]: newPt };

                // Recompute arc geometry whenever an endpoint of an arc is moved.
                // Detect arcs by the presence of a numeric radius + center.
                const isArc = typeof origin.radius === "number" && origin.center;
                if (isArc) {
                    const s  = newData.start;
                    const en = newData.end;

                    // Use stored pt3 if available; otherwise synthesise one from the
                    // original arc's midpoint so we always have a third reference point.
                    let pt3 = origin.pt3 ?? null;
                    if (!pt3) {
                        const mx  = (origin.start.x + origin.end.x) / 2;
                        const my  = (origin.start.y + origin.end.y) / 2;
                        const dmx = mx - origin.center.x;
                        const dmy = my - origin.center.y;
                        const dmLen = Math.hypot(dmx, dmy);
                        if (dmLen > 1e-9) {
                            // Minor-arc side unless largeArc flag demands the other side.
                            const sign = origin.largeArc ? -1 : 1;
                            pt3 = {
                                x: origin.center.x + sign * origin.radius * dmx / dmLen,
                                y: origin.center.y + sign * origin.radius * dmy / dmLen,
                            };
                        }
                    }

                    if (pt3) {
                        // arc2pt: first try to keep the original radius.
                        if (origin.arcMode === "arc2pt") {
                            const result = arc2ptData(s, en, origin.radius, pt3);
                            if (result) {
                                // Project the old pt3 onto the NEW circle so the
                                // side-hint stays valid for subsequent operations.
                                const dcLen = Math.hypot(pt3.x - result.center.x, pt3.y - result.center.y);
                                const newPt3 = dcLen > 1e-9
                                    ? { x: result.center.x + origin.radius * (pt3.x - result.center.x) / dcLen,
                                        y: result.center.y + origin.radius * (pt3.y - result.center.y) / dcLen }
                                    : { x: result.center.x + origin.radius, y: result.center.y };
                                updates.push({ id: ref.segId, changes: { data: {
                                    ...newData,
                                    center:   result.center,
                                    largeArc: result.largeArc,
                                    sweep:    result.sweep,
                                    pt3:      newPt3,
                                }}});
                                continue;
                            }
                            // radius too small for new chord — fall through to circumcenter
                        }

                        // arc3pt (or arc2pt fallback): circumcenter keeps the arc shape.
                        const c = circumcenter(s, en, pt3);
                        if (c) {
                            const flags = arcFlagsViaPoint(s, en, pt3, c.cx, c.cy);
                            updates.push({ id: ref.segId, changes: { data: {
                                ...newData,
                                center:     { x: c.cx, y: c.cy },
                                radius:     c.r,
                                ...flags,
                                pt3,
                                arcMode:    "arc3pt",
                                radiusExpr: undefined, // radius changed — drop formula token
                            }}});
                            continue;
                        }
                    }
                }

                // Fallback: lines or degenerate arcs — just move the point.
                updates.push({ id: ref.segId, changes: { data: newData } });
            }
            this.ctx.state.updateSegments(updates);
            return;
        }

        // ── IDLE: hover (use raw unsnapped pos so arcs can be highlighted) ─────
        this._updateHover(e ? this.ctx.canvas.screenToSVG(e) : pos);
    }

    onPointerUp(_pos, _e) {
        // All placement happens via the click-to-place model in onPointerDown.
        // (pt3 following and seg/point moves are all committed by a second click.)
    }

    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._mode === "moving-pt3" && this._movingPt3) {
                // Restore the arc to the origin data captured at drag start
                this.ctx.state.updateSegments([{
                    id: this._movingPt3.segId,
                    changes: { data: this._movingPt3.origin },
                }]);
                this._movingPt3 = null;
                this._inputFocused = false;
                this._removeArcPopup();
                this._mode = "idle";
                return true;
            }
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
        // Keyboard shortcuts while pt3-following (input NOT focused).
        if (this._mode === "moving-pt3" && !this._inputFocused) {
            if (e.key === "Tab") {
                e.preventDefault();
                const inp = this._arcPopup?.querySelector("input");
                if (inp) { inp.focus(); inp.select(); }
                return true;
            }
            if (e.key === "Enter") {
                this._commitPt3();
                return true;
            }
            if (e.key.length === 1 && /[\d.]/.test(e.key)) {
                const inp = this._arcPopup?.querySelector("input");
                if (inp) {
                    inp.value = e.key;
                    inp.focus();
                    inp.setSelectionRange(1, 1);
                    e.preventDefault();
                    return true;
                }
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
        // Check whether any segment actually changed from its origin.
        // If the user moved and returned to the exact original position,
        // skip pushing a history entry so the PathEditor formula tokens are
        // never touched (syncToPathEditor is only called from _pushHistory /
        // updateSegments when something genuinely changes).
        const anyChanged =
            this._movingSegIds.some(id => {
                const origin = this._movingOrigins.get(id);
                return !_segDataEqual(origin, this._findSeg(id)?.data);
            }) ||
            this._movingPoints.some(ref => {
                const origin = this._movingPointsOrigins.get(ref.segId);
                return !_segDataEqual(origin, this._findSeg(ref.segId)?.data);
            });
        if (anyChanged) {
            this.ctx.state._pushHistory("Move");
        }
        this._reset();
    }

    /** @private — commit arc pt3 placement */
    _commitPt3() {
        const segId = this._movingPt3?.segId;
        const origin = this._movingPt3?.origin;
        const changed = !_segDataEqual(origin, this._findSeg(segId)?.data);
        if (changed) {
            this.ctx.state._pushHistory("Edit arc");
        }
        this._movingPt3 = null;
        this._removeArcPopup();
        this._mode = "idle";
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
        this._movingPt3           = null;
        this._inputFocused        = false;
        this._removeArcPopup();
    }

    // ─── Arc radius popup (handle editing) ───────────────────────────────────────

    /** @private */
    _showArcPopup(e, seg) {
        this._removeArcPopup();
        this._inputFocused = false;
        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = "R =";
        popup.appendChild(label);

        const inp = document.createElement("input");
        inp.type      = "text";
        inp.inputMode = "decimal";
        inp.className = "arc-radius-input";
        // Show stored expression if present, otherwise current numeric radius.
        inp.value     = seg.data.radiusExpr ?? seg.data.radius.toFixed(3);
        popup.appendChild(inp);

        const hint = document.createElement("small");
        hint.className = "arc-radius-hint";
        popup.appendChild(hint);

        document.body.appendChild(popup);
        this._arcPopup = popup;
        if (e) this._positionArcPopup(e);
        // No auto-focus: popup shows live radius while cursor follows.

        inp.addEventListener("focus", () => { this._inputFocused = true; inp.select(); });
        inp.addEventListener("blur",  () => { this._inputFocused = false; });

        inp.addEventListener("keydown", (ev) => {
            ev.stopPropagation();
            if (ev.key === "Tab") {
                ev.preventDefault();
                inp.blur(); // return to cursor-following mode
            } else if (ev.key === "Enter") {
                this._commitFromInput();
            } else if (ev.key === "Escape") {
                // Restore arc to its origin state, then close.
                if (this._movingPt3) {
                    this.ctx.state.updateSegments([{
                        id: this._movingPt3.segId,
                        changes: { data: this._movingPt3.origin },
                    }]);
                }
                this._movingPt3 = null;
                this._inputFocused = false;
                this._removeArcPopup();
                this._mode = "idle";
            }
        });
    }

    /**
     * Commit the value typed in the radius popup.
     * Accepts a positive number (fixed radius) or a variable-name identifier.
     * @private
     */
    _commitFromInput() {
        const inp   = this._arcPopup?.querySelector("input");
        const hint  = this._arcPopup?.querySelector(".arc-radius-hint");
        const raw   = inp?.value?.trim() ?? "";
        const segId = this._movingPt3?.segId;
        if (!segId) return;

        const showError = (msg) => {
            if (inp)  { inp.classList.add("arc-radius-error"); setTimeout(() => inp.classList.remove("arc-radius-error"), 2000); }
            if (hint) hint.textContent = msg;
        };

        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) {
            const seg = this._findSeg(segId);
            if (seg?.type === 'circle') {
                this.ctx.canvas.updateCircleRadius(segId, num);
            } else {
                if (seg) {
                    const chord = Math.hypot(seg.data.end.x - seg.data.start.x, seg.data.end.y - seg.data.start.y);
                    if (num * 2 < chord - 1e-6) { showError(`Min: ${(chord / 2).toFixed(3)}`); return; }
                }
                this.ctx.canvas.updateArcRadius(segId, num); // also clears radiusExpr
            }
        } else {
            // Accept both bare "d" and "{d}" format; normalise to "{d}" for export.
            const varMatch = raw.match(/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/) ??
                             (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw) ? [null, raw] : null);
            if (varMatch) {
                const varName    = varMatch[1];
                const radiusExpr = `{${varName}}`;
                const seg = this._findSeg(segId);
                if (seg) {
                    if (seg.type === 'circle') {
                        // Resolve variable so the circle visually resizes, then re-apply expr.
                        const resolved = this.ctx.state.variableValues?.[varName];
                        if (resolved != null && !isNaN(Number(resolved))) {
                            this.ctx.canvas.updateCircleRadius(segId, Number(resolved));
                            // updateCircleRadius drops radiusExpr — restore it.
                            const updated = this._findSeg(segId);
                            if (updated) {
                                this.ctx.state.updateSegments([{ id: segId, changes: { data: { ...updated.data, radiusExpr } } }]);
                            }
                        } else {
                            // Variable not yet defined — store expression only.
                            this.ctx.state.updateSegments([{ id: segId, changes: { data: { ...seg.data, radiusExpr } } }]);
                        }
                    } else {
                        this.ctx.state.updateSegments([{
                            id: segId,
                            changes: { data: { ...seg.data, radiusExpr } },
                        }]);
                    }
                }
            } else {
                showError(raw.length === 0 ? "Enter a number or {variable}" : "Invalid value — use a number or {variable}");
                return;
            }
        }

        // Apply the value and commit the session.
        this._removeArcPopup();
        this._inputFocused = false;
        this._commitPt3();
    }

    /** @private */
    _positionArcPopup(e) {
        if (!this._arcPopup) return;
        this._arcPopup.style.left = (e.clientX + 14) + "px";
        this._arcPopup.style.top  = (e.clientY + 14) + "px";
    }

    /** @private */
    _removeArcPopup() {
        if (this._arcPopup) { this._arcPopup.remove(); this._arcPopup = null; }
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
