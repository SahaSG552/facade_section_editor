import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("CursorTool");

const SVG_NS = "http://www.w3.org/2000/svg";

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
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    activate(ctx) {
        super.activate(ctx);
        log.debug("CursorTool active");
    }

    deactivate() {
        this._clearHover();
        this._endDrag();
        super.deactivate();
    }

    hasActiveCommand() { return false; }

    // ─── Pointer events ─────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        if (e.button !== 0) return;
        this._downClient = { x: e.clientX, y: e.clientY };
        // Use raw (un-snapped) SVG position so the box-selection start is not
        // pulled to a nearby endpoint by the snap manager.
        this._downSvgPos = this.ctx.canvas.screenToSVG(e);
        this._dragging   = false;
    }

    onPointerMove(pos, e) {
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
        this._updateHover(pos);
    }

    onPointerUp(pos, e) {
        if (!this._downSvgPos) return;
        const downSvg = this._downSvgPos;
        const wasDrag = this._dragging;
        this._endDrag();

        if (wasDrag) {
            // Use raw SVG coords (not snapped) to avoid snap freezing the box corners.
            const rawEnd = this.ctx.canvas.screenToSVG(e);
            this._applyBoxSelection(downSvg, rawEnd, e.shiftKey);
        } else {
            const hitId = this.ctx.canvas.hitTest(pos);
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

    onKeyDown(e) {
        if (e.key === "Delete" || e.key === "Backspace") {
            const ids = [...this.ctx.state.selectedIds];
            if (ids.length > 0) {
                this.ctx.state.deleteSegments(ids);
                return true;
            }
        }
        return false;
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
            if (seg.type !== "line") continue;
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
