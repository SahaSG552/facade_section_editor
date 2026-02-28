import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { isFormulaToken, evaluateTokenWithVars } from "../../utils/formulaPolicy.js";
import { getRectGeomLocal, getRectCornerPointMap, getRectCornerInwardMap } from "../geometry/rectGeometry.js";

const log = LoggerFactory.createLogger("CursorTool");

const SVG_NS = "http://www.w3.org/2000/svg";

/** Epsilon for floating-point coordinate comparisons. */
const EPS = 1e-6;

/**
 * Rectangle drag state for side/radius edits.
 * @typedef {object} RectDragState
 * @property {'side'|'rx'} kind
 * @property {string} segId
 * @property {string=} role
 * @property {'w'|'h'|'rx'} axisAttr
 * @property {object} origin
 * @property {object=} geom
 * @property {string=} cornerKey
 */

/**
 * Compare two segment data objects geometrically.
 * Returns true when all numeric geometry fields are equal within EPS.
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

/** Point-in-AABB test */
function _ptInRect(p, x1, x2, y1, y2) {
    return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
}
/** CCW helper for segment intersection */
function _ccw(A, B, C) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}
function _segsIntersect(A, B, C, D) {
    return _ccw(A, C, D) !== _ccw(B, C, D) && _ccw(A, B, C) !== _ccw(A, B, D);
}
/**
 * True if segment s→e intersects or is fully inside the rectangle.
 * Used for right-to-left crossing selection.
 */
function _segTouchesRect(s, e, x1, x2, y1, y2) {
    if (_ptInRect(s, x1, x2, y1, y2) || _ptInRect(e, x1, x2, y1, y2)) return true;
    const tl = { x: x1, y: y1 }, tr = { x: x2, y: y1 };
    const br = { x: x2, y: y2 }, bl = { x: x1, y: y2 };
    return (
        _segsIntersect(s, e, tl, tr) ||
        _segsIntersect(s, e, tr, br) ||
        _segsIntersect(s, e, br, bl) ||
        _segsIntersect(s, e, bl, tl)
    );
}

/**
 * CursorTool — selection only (no move, use MoveTool for that).
 *
 * - **Click** on segment         → select it (deselect others)
 * - **Shift+click** on segment   → toggle membership in selection
 * - **Click** on empty space     → deselect all
 * - **Drag left→right**          → window-select: fully-enclosed segments only
 * - **Drag right→left**          → crossing-select: any segment that overlaps the box
 * - **Delete / Backspace**       → delete selected segments
 *
 * Drag detection uses raw screen-pixel distance (e.clientX/Y) so snap stepping
 * does not accidentally trigger a box-select on a simple click.
 */
export default class CursorTool extends BaseTool {
    constructor() {
        super();
        this.id = "cursor";

        /** Screen-coord of mousedown for drag detection. @type {{x:number,y:number}|null} */
        this._downClient = null;
        /** SVG-space pos at mousedown. @type {{x:number,y:number}|null} */
        this._downSvgPos = null;
        /** @type {boolean} */
        this._dragging = false;

        // Hover tracking
        /** @private @type {string|null} */
        this._hoverSegId = null;
        /** @private @type {{segId:string,pointKey:string}|null} */
        this._hoverPoint = null;

        // Arc pt3 handle inline drag
        /** @private @type {{segId:string, arcMode:string, radius:number}|null} */
        this._pt3Drag = null;
        /** @private @type {HTMLElement|null} */
        this._arcPopup = null;
        /** @private @type {boolean} — true while radius popup input has keyboard focus */
        this._inputFocused = false;

        /** @private @type {RectDragState|null} */
        this._rectDrag = null;
        /** @private @type {HTMLElement|null} */
        this._rectPopup = null;
        /** @private @type {boolean} */
        this._rectInputFocused = false;
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    activate(ctx) {
        super.activate(ctx);
        log.debug("CursorTool active");
    }

    deactivate() {
        this._clearHover();
        this._endDrag();
        this._endPt3Drag();
        this._endRectDrag();
        super.deactivate();
    }

    hasActiveCommand() { return this._pt3Drag !== null || this._rectDrag !== null; }

    // ─── Pointer events ─────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        if (e.button !== 0) return;

        const rawPos = this.ctx.canvas.screenToSVG(e);

        // ── Rect side/rx editing: second click commits current placement ─────────
        if (this._rectDrag) {
            this._applyRectFromCursor(rawPos);
            this._commitRectDrag();
            return;
        }

        // ── Rect corner handle (rx): first click enters following mode ───────────
        const prePointHit = this.ctx.canvas.hitTestPoint(rawPos);
        if (prePointHit?.pointKey && String(prePointHit.pointKey).startsWith("rx-")) {
            const seg = this.ctx.state.segments.find(s => s.id === prePointHit.segId);
            if (seg?.type === "rect") {
                if (!this.ctx.state.selectedIds.has(seg.id)) this.ctx.state.setSelection(seg.id);
                this._beginRectRxDrag(seg.id, String(prePointHit.pointKey), e);
                return;
            }
        }

        // ── Rect side hit: first click enters width/height following mode ─────────
        const sideHit = this.ctx.canvas.hitTestRectSide(rawPos);
        if (sideHit) {
            const seg = this.ctx.state.segments.find(s => s.id === sideHit.segId);
            if (seg?.type === "rect") {
                if (!this.ctx.state.selectedIds.has(seg.id)) this.ctx.state.setSelection(seg.id);
                if (sideHit.axis === "rx") {
                    this._beginRectRxDrag(seg.id, String(sideHit.cornerKey ?? "rx-start"), e);
                } else {
                    this._beginRectSideDrag(sideHit, e);
                }
                return;
            }
        }

        // ── Arc/circle pt3: if already following, second click → commit ─────────────
        if (this._pt3Drag) {
            // Apply the final cursor position and commit to history.
            if (this._pt3Drag.isCircle) {
                this.ctx.canvas.updateCircleFromPt3(this._pt3Drag.segId, rawPos);
            } else {
                this.ctx.canvas.updateArcFromPt3(this._pt3Drag.segId, rawPos);
            }
            this._commitPt3();
            return;
        }

        // ── Arc pt3 handle: first click → enter following mode ──────────────────
        const ptHit = this.ctx.canvas.hitTestPoint(rawPos);
        if (ptHit?.pointKey === "pt3") {
            const seg = this.ctx.state.segments.find(s => s.id === ptHit.segId);
            if (seg && seg.data.arcMode) {
                // Make sure the arc is selected so the handle stays visible.
                if (!this.ctx.state.selectedIds.has(ptHit.segId)) {
                    const chainIds = this.ctx.state.getChain(ptHit.segId).map(s => s.id);
                    this.ctx.state.setSelection(chainIds);
                }
                this._pt3Drag = {
                    segId:    ptHit.segId,
                    arcMode:  seg.data.arcMode,
                    radius:   seg.data.radius,
                    isCircle: seg.type === 'circle',
                    // Capture origin for Escape‑restore (no history entry yet).
                    origin:   JSON.parse(JSON.stringify(seg.data)),
                };
                // Show radius popup for all arc modes.
                if (seg.data.arcMode) this._showArcPopup(e, seg);
                return; // do NOT start box-select
            }
        }

        this._downClient = { x: e.clientX, y: e.clientY };
        // Use raw (un-snapped) SVG position so the box-selection start is not
        // pulled to a nearby endpoint by the snap manager.
        this._downSvgPos = rawPos;
        this._dragging   = false;
    }

    onPointerMove(pos, e) {
        // ── Rect side/rx following ─────────────────────────────────────────
        if (this._rectDrag) {
            const rawPos = this.ctx.canvas.screenToSVG(e);
            this._applyRectFromCursor(rawPos);
            if (this._rectPopup && e) this._positionRectPopup(e);
            if (this._rectPopup && !this._rectInputFocused) {
                const seg = this.ctx.state.segments.find(s => s.id === this._rectDrag?.segId);
                const inp = this._rectPopup.querySelector("input");
                if (seg && inp) {
                    const key = this._rectDrag.axisAttr;
                    inp.value = Number(seg.data?.[key] ?? 0).toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
                }
            }
            return;
        }

        // ── Arc/circle pt3 drag ──────────────────────────────────────────
        if (this._pt3Drag) {
            const rawPos = this.ctx.canvas.screenToSVG(e);
            if (this._pt3Drag.isCircle) {
                this.ctx.canvas.updateCircleFromPt3(this._pt3Drag.segId, rawPos);
            } else {
                this.ctx.canvas.updateArcFromPt3(this._pt3Drag.segId, rawPos);
            }
            if (this._arcPopup && e) this._positionArcPopup(e);
            // Update live radius display while the user is not typing.
            if (this._arcPopup && !this._inputFocused) {
                const _seg = this.ctx.state.segments.find(s => s.id === this._pt3Drag.segId);
                if (_seg) {
                    const _inp = this._arcPopup.querySelector("input");
                    if (_inp) _inp.value = _seg.data.radius.toFixed(3);
                }
            }
            return;
        }

        if (this._downClient) {
            const dist = Math.hypot(
                e.clientX - this._downClient.x,
                e.clientY - this._downClient.y,
            );
            if (dist > 5) this._dragging = true;

            if (this._dragging) {
                // Use raw SVG coords so snap doesn't lock the far corner to a nearby endpoint.
                const rawEnd = this.ctx.canvas.screenToSVG(e);
                this._updateBoxGhost(this._downSvgPos, rawEnd);
                return;
            }
        }
        // Always use raw (unsnapped) position for hover hit-testing so that grid
        // snap does not prevent hovering over arcs and segments between grid nodes.
        this._updateHover(this.ctx.canvas.screenToSVG(e));
    }

    onPointerUp(pos, e) {
        // In pt3-following mode the commit happens on the NEXT pointerDown (click-pick-click).
        // Ignore the mouseup that ends the initial picking click.
        if (this._pt3Drag) return;

        if (!this._downSvgPos) return;
        const downSvg = this._downSvgPos;
        const wasDrag = this._dragging;
        this._endDrag();

        if (wasDrag) {
            // Use raw SVG coords (not snapped) to avoid snap freezing the box corners.
            const rawEnd = this.ctx.canvas.screenToSVG(e);
            this._applyBoxSelection(downSvg, rawEnd, e.shiftKey);
        } else {
            // Use raw (unsnapped) position for hit-testing so that grid snap does
            // not prevent clicking on arcs and segments between grid nodes.
            const rawPos = this.ctx.canvas.screenToSVG(e);
            const hitId = this.ctx.canvas.hitTest(rawPos);
            if (hitId) {
                // Treat the whole connected chain as a single selectable unit.
                const chainIds = this.ctx.state.getChain(hitId).map(s => s.id);
                if (e.shiftKey) {
                    // Toggle chain: if every member is already selected → deselect all;
                    // otherwise add the whole chain to the current selection.
                    const allSel = chainIds.every(id => this.ctx.state.selectedIds.has(id));
                    if (allSel) {
                        const keep = [...this.ctx.state.selectedIds].filter(id => !chainIds.includes(id));
                        this.ctx.state.setSelection(keep);
                    } else {
                        this.ctx.state.setSelection([...this.ctx.state.selectedIds, ...chainIds]);
                    }
                } else {
                    this.ctx.state.setSelection(chainIds);
                }
            } else if (!e.shiftKey) {
                this.ctx.state.clearSelection();
            }
        }
    }

    /**
     * RMB while a pt3 drag is active → cancel the operation (same as Escape).
     * @override
     */
    onConfirm(_pos, _e) {
        if (this._rectDrag) {
            this.ctx.state.updateSegments([{ id: this._rectDrag.segId, changes: { data: this._rectDrag.origin } }]);
            this._endRectDrag();
            return true;
        }
        if (this._pt3Drag) {
            this.ctx.state.updateSegments([{
                id:      this._pt3Drag.segId,
                changes: { data: this._pt3Drag.origin },
            }]);
            this._endPt3Drag();
            return true;
        }
        return false;
    }

    onKeyDown(e) {
        if (e.key === "Escape" && this._rectDrag) {
            this.ctx.state.updateSegments([{ id: this._rectDrag.segId, changes: { data: this._rectDrag.origin } }]);
            this._endRectDrag();
            return true;
        }
        if (this._rectDrag && !this._rectInputFocused) {
            if (e.key === "Tab") {
                e.preventDefault();
                const inp = this._rectPopup?.querySelector("input");
                if (inp) { inp.focus(); inp.select(); }
                return true;
            }
            if (e.key === "Enter") {
                this._commitRectDrag();
                return true;
            }
            if (e.key.length === 1 && /[\d.\-+{}a-zA-Z_/*()]/.test(e.key)) {
                const inp = this._rectPopup?.querySelector("input");
                if (inp) {
                    inp.value = e.key;
                    inp.focus();
                    inp.setSelectionRange(1, 1);
                    e.preventDefault();
                    return true;
                }
            }
        }
        if (e.key === "Escape" && this._pt3Drag) {
            // Restore arc to state before the user clicked the handle (origin captured at pick time).
            this.ctx.state.updateSegments([{
                id: this._pt3Drag.segId,
                changes: { data: this._pt3Drag.origin },
            }]);
            this._endPt3Drag();
            return true;
        }
        // Keyboard shortcuts while pt3-following (input NOT focused).
        if (this._pt3Drag && !this._inputFocused) {
            if (e.key === "Tab") {
                e.preventDefault();
                const inp = this._arcPopup?.querySelector("input");
                if (inp) { inp.focus(); inp.select(); }
                return true;
            }
            if (e.key === "Enter") {
                // Commit arc at its current cursor-driven position.
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
            const ids = [...this.ctx.state.selectedIds];
            if (ids.length > 0) {
                this.ctx.state.deleteSegments(ids);
                return true;
            }
        }
        return false;
    }
    // ─── Arc pt3 handle drag ────────────────────────────────────────────────

    /** @private — commit arc pt3 placement to history and exit following mode. */
    _commitPt3() {
        const origin = this._pt3Drag?.origin;
        const cur    = this.ctx.state.segments.find(s => s.id === this._pt3Drag?.segId)?.data;
        const changed = !_segDataEqual(origin, cur);
        if (changed) {
            this.ctx.state._pushHistory("Edit arc");
        }
        this._endPt3Drag();
    }

    /**
     * Show the floating radius popup for an arc handle.
     * Popup starts unfocused (cursor-following mode); Tab focuses it.
     * @private
     */
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
        // Show stored expression if present, otherwise numeric radius.
        inp.value     = seg.data.radiusExpr ?? seg.data.radius.toFixed(3);
        popup.appendChild(inp);

        const hint = document.createElement("small");
        hint.className = "arc-radius-hint";
        popup.appendChild(hint);

        document.body.appendChild(popup);
        this._arcPopup = popup;
        if (e) this._positionArcPopup(e);
        // No auto-focus: popup shows live radius while cursor follows.
        // User presses Tab (or a digit) to enter input mode.

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
                // Restore arc and exit following mode.
                if (this._pt3Drag) {
                    this.ctx.state.updateSegments([{
                        id: this._pt3Drag.segId,
                        changes: { data: this._pt3Drag.origin },
                    }]);
                }
                this._endPt3Drag();
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
        const segId = this._pt3Drag?.segId;
        if (!segId) return;

        const showError = (msg) => {
            if (inp)  { inp.classList.add("arc-radius-error"); setTimeout(() => inp.classList.remove("arc-radius-error"), 2000); }
            if (hint) hint.textContent = msg;
        };

        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) {
            const seg = this.ctx.state.segments.find(s => s.id === segId);
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
                const seg = this.ctx.state.segments.find(s => s.id === segId);
                if (seg) {
                    if (seg.type === 'circle') {
                        // Resolve variable so the circle visually resizes, then re-apply expr.
                        const resolved = this.ctx.state.variableValues?.[varName];
                        if (resolved != null && !isNaN(Number(resolved))) {
                            this.ctx.canvas.updateCircleRadius(segId, Number(resolved));
                            // updateCircleRadius drops radiusExpr — restore it.
                            const updated = this.ctx.state.segments.find(s => s.id === segId);
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

    /** @private */
    _endPt3Drag() {
        this._pt3Drag = null;
        this._inputFocused = false;
        this._removeArcPopup();
    }

    /**
     * Start rectangle side drag mode.
        * @param {{segId:string, role:string, axis:'w'|'h'}} hit
     * @param {MouseEvent} e
     * @private
     */
    _beginRectSideDrag(hit, e) {
        const seg = this.ctx.state.segments.find(s => s.id === hit.segId);
        if (!seg || seg.type !== "rect") return;
        const origin = JSON.parse(JSON.stringify(seg.data));
        const geom = getRectGeomLocal(origin);
        this._rectDrag = {
            kind: "side",
            segId: hit.segId,
            role: hit.role,
            axisAttr: hit.axis,
            origin,
            geom,
        };
        this._showRectPopup(e, hit.axis === "w" ? "W =" : "H =", String(seg.data?._expr?.[hit.axis] ?? seg.data?.[hit.axis] ?? "0"));
    }

    /**
     * Start rectangle corner rx drag mode.
     * @param {string} segId
     * @param {string} cornerKey
     * @param {MouseEvent} e
     * @private
     */
    _beginRectRxDrag(segId, cornerKey, e) {
        const seg = this.ctx.state.segments.find(s => s.id === segId);
        if (!seg || seg.type !== "rect") return;
        const origin = JSON.parse(JSON.stringify(seg.data));
        this._rectDrag = {
            kind: "rx",
            segId,
            cornerKey,
            axisAttr: "rx",
            origin,
            geom: getRectGeomLocal(origin),
        };
        this._showRectPopup(e, "RX =", String(seg.data?._expr?.rx ?? seg.data?.rx ?? "0"));
    }

    /** @private */
    _applyRectFromCursor(rawPos) {
        if (!this._rectDrag) return;
        const seg = this.ctx.state.segments.find(s => s.id === this._rectDrag.segId);
        if (!seg || seg.type !== "rect") return;
        const localPos = this.ctx.canvas.toSegmentLocal(rawPos, seg.id);
        if (!localPos) return;

        if (this._rectDrag.kind === "side") {
            const { role, geom } = this._rectDrag;
            const next = { ...seg.data };
            if (role === "x-opposite") {
                next.x = geom.xStart;
                next.w = (localPos.x - geom.xStart) / geom.dirW;
            } else if (role === "x-start") {
                next.x = localPos.x;
                next.w = (geom.xOpp - localPos.x) / geom.dirW;
            } else if (role === "y-opposite") {
                next.y = geom.yStart;
                next.h = (localPos.y - geom.yStart) / geom.dirH;
            } else if (role === "y-start") {
                next.y = localPos.y;
                next.h = (geom.yOpp - localPos.y) / geom.dirH;
            }
            const expr = { ...(next._expr ?? {}) };
            delete expr[this._rectDrag.axisAttr];
            next._expr = Object.keys(expr).length > 0 ? expr : undefined;
            this.ctx.state.updateSegments([{ id: seg.id, changes: { data: next } }]);
            return;
        }

        if (this._rectDrag.kind === "rx") {
            const rg = getRectGeomLocal(seg.data);
            const corners = getRectCornerPointMap(rg);
            const inward = getRectCornerInwardMap(rg);
            const c = corners[this._rectDrag.cornerKey] ?? corners["rx-start"];
            const i = inward[this._rectDrag.cornerKey] ?? inward["rx-start"];
            const ux = (localPos.x - c.x) * i.ix;
            const uy = (localPos.y - c.y) * i.iy;
            // Bisector-based fillet solve (matches user pseudocode semantics).
            // For a right-angle corner this becomes linear tracking from cursor:
            // r = dot(PM, bisector) * sin(theta/2), theta=90° -> sin(theta/2)=sqrt(2)/2.
            // Outside corner (u<=0 or v<=0) is treated as negative radius -> clamp to 0.
            let rawRx = 0;
            if (ux > 0 && uy > 0) {
                const v1 = { x: i.ix, y: 0 };
                const v2 = { x: 0, y: i.iy };
                const bisLen = Math.hypot(v1.x + v2.x, v1.y + v2.y);
                if (bisLen > 1e-9) {
                    const bisector = { x: (v1.x + v2.x) / bisLen, y: (v1.y + v2.y) / bisLen };
                    const pm = { x: localPos.x - c.x, y: localPos.y - c.y };
                    const t = pm.x * bisector.x + pm.y * bisector.y;
                    const cosTheta = v1.x * v2.x + v1.y * v2.y; // 0 for rectangle corners
                    const sinHalfTheta = Math.sqrt(Math.max(0, (1 - cosTheta) / 2));
                    rawRx = t * sinHalfTheta;
                }
                if (!Number.isFinite(rawRx) || rawRx < 0) rawRx = 0;
            }
            const maxRx = Math.min(Math.abs(Number(seg.data?.w ?? 0)), Math.abs(Number(seg.data?.h ?? 0))) / 2;
            const nextRx = Math.max(0, Math.min(rawRx, maxRx));
            const next = { ...seg.data, rx: nextRx };
            const expr = { ...(next._expr ?? {}) };
            delete expr.rx;
            next._expr = Object.keys(expr).length > 0 ? expr : undefined;
            this.ctx.state.updateSegments([{ id: seg.id, changes: { data: next } }]);
        }
    }

    /** @private */
    _commitRectDrag() {
        if (!this._rectDrag) return;
        const cur = this.ctx.state.segments.find(s => s.id === this._rectDrag.segId)?.data;
        const changed = !_segDataEqual(this._rectDrag.origin, cur);
        if (changed) this.ctx.state._pushHistory("Edit rectangle");
        this._endRectDrag();
    }

    /** @private */
    _showRectPopup(e, labelText, initialValue) {
        this._removeRectPopup();
        this._rectInputFocused = false;

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = labelText;
        popup.appendChild(label);

        const inp = document.createElement("input");
        inp.type = "text";
        inp.inputMode = "decimal";
        inp.className = "arc-radius-input";
        inp.value = String(initialValue ?? "");
        popup.appendChild(inp);

        const hint = document.createElement("small");
        hint.className = "arc-radius-hint";
        popup.appendChild(hint);

        document.body.appendChild(popup);
        this._rectPopup = popup;
        if (e) this._positionRectPopup(e);

        inp.addEventListener("focus", () => { this._rectInputFocused = true; inp.select(); });
        inp.addEventListener("blur", () => { this._rectInputFocused = false; });
        inp.addEventListener("keydown", (ev) => {
            ev.stopPropagation();
            if (ev.key === "Tab") {
                ev.preventDefault();
                inp.blur();
            } else if (ev.key === "Enter") {
                this._commitRectInput();
            } else if (ev.key === "Escape") {
                if (this._rectDrag) {
                    this.ctx.state.updateSegments([{ id: this._rectDrag.segId, changes: { data: this._rectDrag.origin } }]);
                }
                this._endRectDrag();
            }
        });
    }

    /** @private */
    _commitRectInput() {
        const inp = this._rectPopup?.querySelector("input");
        const hint = this._rectPopup?.querySelector(".arc-radius-hint");
        const raw = String(inp?.value ?? "").trim();
        if (!this._rectDrag || !raw) return;

        const showError = (msg) => {
            if (inp) { inp.classList.add("arc-radius-error"); setTimeout(() => inp.classList.remove("arc-radius-error"), 2000); }
            if (hint) hint.textContent = msg;
        };

        const seg = this.ctx.state.segments.find(s => s.id === this._rectDrag?.segId);
        if (!seg || seg.type !== "rect") return;

        const num = evaluateTokenWithVars(raw, this.ctx.state.variableValues ?? {}, Number.NaN);
        if (!Number.isFinite(num)) {
            showError("Invalid expression");
            return;
        }

        const next = { ...seg.data };
        const expr = { ...(next._expr ?? {}) };
        const axis = this._rectDrag.axisAttr;

        if (axis === "rx") {
            const maxRx = Math.min(Math.abs(Number(seg.data?.w ?? 0)), Math.abs(Number(seg.data?.h ?? 0))) / 2;
            next.rx = Math.max(0, Math.min(Math.abs(num), maxRx));
        } else if (axis === "w") {
            const val = num;
            const g = this._rectDrag.geom;
            if (this._rectDrag.role === "x-start") {
                next.x = g.xOpp - g.dirW * val;
            }
            next.w = val;
        } else if (axis === "h") {
            const val = num;
            const g = this._rectDrag.geom;
            if (this._rectDrag.role === "y-start") {
                next.y = g.yOpp - g.dirH * val;
            }
            next.h = val;
        }

        if (isFormulaToken(raw)) expr[axis] = raw;
        else delete expr[axis];
        next._expr = Object.keys(expr).length > 0 ? expr : undefined;

        this.ctx.state.updateSegments([{ id: seg.id, changes: { data: next } }]);
        this._commitRectDrag();
    }

    /** @private */
    _positionRectPopup(e) {
        if (!this._rectPopup) return;
        this._rectPopup.style.left = (e.clientX + 14) + "px";
        this._rectPopup.style.top = (e.clientY + 14) + "px";
    }

    /** @private */
    _removeRectPopup() {
        if (this._rectPopup) {
            this._rectPopup.remove();
            this._rectPopup = null;
        }
    }

    /** @private */
    _endRectDrag() {
        this._rectDrag = null;
        this._rectInputFocused = false;
        this._removeRectPopup();
    }
    // ─── Box selection ──────────────────────────────────────────────────────

    /** @private */
    _applyBoxSelection(start, end, addToExisting) {
        const ltr  = end.x >= start.x;
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);

        const ids = [];
        for (const seg of this.ctx.state.segments) {
            if (seg.type === 'circle') {
                const { center: c, radius } = seg.data;
                const hit = ltr
                    ? (c.x - radius >= minX && c.x + radius <= maxX && c.y - radius >= minY && c.y + radius <= maxY)
                    : (c.x + radius >= minX && c.x - radius <= maxX && c.y + radius >= minY && c.y - radius <= maxY);
                if (hit) ids.push(seg.id);
                continue;
            }
            if (seg.type !== "line" && seg.type !== "arc") continue;
            const { start: s, end: en } = seg.data;
            const hit = ltr
                ? _ptInRect(s, minX, maxX, minY, maxY) && _ptInRect(en, minX, maxX, minY, maxY)
                : _segTouchesRect(s, en, minX, maxX, minY, maxY);
            if (hit) ids.push(seg.id);
        }

        const selected = addToExisting ? [...this.ctx.state.selectedIds, ...ids] : ids;
        this.ctx.state.setSelection(selected);
        this.ctx.canvas.clearGhost();
    }

    /** @private */
    _updateBoxGhost(start, end) {
        const ltr = end.x >= start.x;
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const w = Math.abs(end.x - start.x);
        const h = Math.abs(end.y - start.y);

        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", y);
        rect.setAttribute("width",  w);
        rect.setAttribute("height", h);
        rect.classList.add("editor-selection-box");
        if (!ltr) rect.classList.add("editor-selection-box--crossing");

        const g = document.createElementNS(SVG_NS, "g");
        g.appendChild(rect);
        this.ctx.canvas.setGhost(g);
    }

    /** @private */
    _endDrag() {
        this._downClient = null;
        this._downSvgPos = null;
        this._dragging   = false;
        if (this.ctx) this.ctx.canvas.clearGhost();
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
