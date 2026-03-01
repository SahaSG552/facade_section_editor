import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { evaluateTokenWithVars } from "../../utils/formulaPolicy.js";
import { circumcenter, arc2ptData, arcFlagsViaPoint } from "./ArcTool.js";
import { getRectGeomLocal } from "../geometry/rectGeometry.js";
import { computeBoxSelection, buildSelectionBoxGhost } from "./shared/selectionUtils.js";
import {
    collectSegmentSnapshots,
    commitCopiedSnapshots,
    commitStagedTransformTarget,
    transitionCopyMode,
} from "./shared/copyPreviewUtils.js";

const log = LoggerFactory.createLogger("MoveTool");

const SVG_NS = "http://www.w3.org/2000/svg";
const FORMULA_EQ_EPS = 1e-4;

function _segDataEqual(a, b) {
    if (!a || !b) return false;
    const p = (u, v) => Math.abs(u.x - v.x) <= FORMULA_EQ_EPS && Math.abs(u.y - v.y) <= FORMULA_EQ_EPS;
    const n = (u, v) => Math.abs(Number(u) - Number(v)) <= FORMULA_EQ_EPS;
    const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj ?? {}, key);
    if (a.start && (!b.start || !p(a.start, b.start))) return false;
    if (a.end && (!b.end || !p(a.end, b.end))) return false;
    if (a.center && (!b.center || !p(a.center, b.center))) return false;
    for (const key of ["x", "y", "w", "h", "rx", "ry", "cx", "cy"]) {
        if (has(a, key) || has(b, key)) {
            if (!(has(a, key) && has(b, key) && n(a[key], b[key]))) return false;
        }
    }
    if (typeof a.radius === "number" && Math.abs(a.radius - b.radius) > FORMULA_EQ_EPS) return false;
    if (typeof a.largeArc === "number" && a.largeArc !== b.largeArc) return false;
    if (typeof a.sweep === "number" && a.sweep !== b.sweep) return false;
    return true;
}

function _normalizeExprMap(exprMap) {
    return exprMap && Object.keys(exprMap).length > 0 ? exprMap : undefined;
}

function _dropChangedExprKeys(origin, next, keys) {
    const exprMap = { ...(origin?._expr ?? {}) };
    for (const key of keys) {
        if (!(key in origin) || !(key in next)) continue;
        const oldVal = Number(origin[key]);
        const nextVal = Number(next[key]);
        if (!Number.isFinite(oldVal) || !Number.isFinite(nextVal)) continue;
        if (Math.abs(nextVal - oldVal) > FORMULA_EQ_EPS) {
            delete exprMap[key];
        }
    }
    return _normalizeExprMap(exprMap);
}

/**
 * MoveTool — staged move workflow:
 * 1) Select elements (click toggle / box select).
 * 2) RMB confirm selection.
 * 3) Pick source point (click or X/Y input).
 * 4) Pick destination point (click or X/Y input) with live move preview.
 */
export default class MoveTool extends BaseTool {
    constructor() {
        super();
        this.id = "move";

        /** @private @type {"selecting"|"pick-from"|"pick-to"} */
        this._mode = "selecting";

        /** @private @type {{x:number,y:number}|null} */
        this._downClient = null;
        /** @private @type {{x:number,y:number}|null} */
        this._downSvgPos = null;
        /** @private @type {boolean} */
        this._dragging = false;

        /** @private @type {string|null} */
        this._hoverSegId = null;

        /** @private @type {string[]} */
        this._movingSegIds = [];
        /** @private @type {Map<string, object>} */
        this._movingOrigins = new Map();
        /** @private @type {Array<{segId:string,pointKey:'start'|'end'}>} */
        this._movingEndpointRefs = [];
        /** @private @type {Map<string, object>} */
        this._movingEndpointOrigins = new Map();
        /** @private @type {Map<string, Array<{role:string,axis:'w'|'h'}>>} */
        this._movingRectSides = new Map();
        /** @private @type {Map<string, Array<{role:string,axis:'w'|'h'}>>} */
        this._selectedRectSides = new Map();

        /** @private @type {{x:number,y:number}|null} */
        this._fromPoint = null;
        /** @private @type {{x:number,y:number}|null} */
        this._cursorPos = null;

        /** @private @type {boolean} */
        this._copyMode = false;
        /** @private @type {Array<object>} */
        this._copyPreviewSnapshots = [];

        /** @private @type {HTMLElement|null} */
        this._pointPopup = null;
        /** @private @type {boolean} */
        this._pointInputFocused = false;
    }

    /**
     * Activate tool and reset staged state.
     * @param {{ state: import("../EditorStateManager.js").default, canvas: import("../EditorCanvas.js").default }} ctx
     */
    activate(ctx) {
        super.activate(ctx);
        this._mode = "selecting";
        log.debug("MoveTool active");
    }

    /**
     * Deactivate tool and clear all temporary overlays/session data.
     */
    deactivate() {
        this._clearHover();
        this._endDrag();
        this._resetMoveSession();
        this._clearRectSideSelection();
        this._removePointPopup();
        super.deactivate();
    }

    hasActiveCommand() {
        return true;
    }

    /**
     * Handle left-button press according to staged workflow.
     * @param {{x:number,y:number}} pos
     * @param {MouseEvent} e
     */
    onPointerDown(pos, e) {
        if (e.button !== 0) return;
        const rawPos = this.ctx.canvas.screenToSVG(e);

        if (this._mode === "pick-from") {
            this._setFromPoint(pos, e);
            return;
        }

        if (this._mode === "pick-to") {
            this._copyMode = !!e.ctrlKey;
            commitStagedTransformTarget({
                copyMode: this._copyMode,
                targetPoint: pos,
                applyPreview: (point) => this._applyPreviewTo(point),
                commit: (args) => this._commitMove(args),
                refreshPreview: () => {
                    if (this._cursorPos) this._applyPreviewTo(this._cursorPos);
                    this._updateMoveGhost();
                },
                finishCommand: () => this._rollbackToSelection(),
            });
            return;
        }

        this._downClient = { x: e.clientX, y: e.clientY };
        this._downSvgPos = rawPos;
        this._dragging = false;
    }

    /**
     * Handle pointer move for selection rectangle or move preview.
     * @param {{x:number,y:number}} pos
     * @param {MouseEvent} e
     */
    onPointerMove(pos, e) {
        const rawPos = this.ctx.canvas.screenToSVG(e);

        if (this._mode === "pick-from") {
            this._cursorPos = pos;
            this._updatePointPopupValues(pos);
            this._positionPointPopup(e);
            this._updateHover(rawPos);
            return;
        }

        if (this._mode === "pick-to") {
            this._cursorPos = pos;
            this._copyMode = transitionCopyMode({
                current: this._copyMode,
                next: !!e.ctrlKey,
                onEnterCopy: () => this._restoreOrigins(),
                onExitCopy: () => {
                    this._copyPreviewSnapshots = [];
                },
            });
            this._applyPreviewTo(pos);
            this._updateMoveGhost();
            this._updatePointPopupValues(pos);
            this._positionPointPopup(e);
            return;
        }

        if (this._downClient) {
            const dist = Math.hypot(e.clientX - this._downClient.x, e.clientY - this._downClient.y);
            if (dist > 5) this._dragging = true;

            if (this._dragging) {
                this._updateBoxGhost(this._downSvgPos, rawPos);
                return;
            }
        }

        this._updateHover(rawPos);
    }

    /**
     * Handle pointer release and apply click/box selection in selecting stage.
     * @param {{x:number,y:number}} _pos
     * @param {MouseEvent} e
     */
    onPointerUp(_pos, e) {
        if (this._mode !== "selecting" || !this._downSvgPos) return;

        const rawEnd = this.ctx.canvas.screenToSVG(e);
        const downSvg = this._downSvgPos;
        const wasDrag = this._dragging;
        this._endDrag();

        if (wasDrag) {
            this._applyBoxSelection(downSvg, rawEnd, { selectParts: !!e.shiftKey });
            return;
        }

        if (e.shiftKey) {
            const sideHit = this.ctx.canvas.hitTestRectSide(rawEnd);
            if (sideHit?.axis && sideHit.axis !== "rx") {
                this._toggleRectSideSelection(sideHit);
                return;
            }
        }

        const hitId = this.ctx.canvas.hitTest(rawEnd);
        if (hitId) {
            if (e.shiftKey) {
                this._toggleSelectionIds([hitId]);
            } else {
                this._clearRectSideSelection();
                const chainIds = this.ctx.state.getChain(hitId).map(s => s.id);
                this._toggleSelectionIds(chainIds);
            }
        } else if (!e.shiftKey) {
            this._clearRectSideSelection();
            this.ctx.state.clearSelection();
        }
    }

    /**
     * Handle RMB confirm/cancel semantics per stage.
     * @param {{x:number,y:number}} pos
     * @param {MouseEvent} e
     * @returns {boolean}
     */
    onConfirm(pos, e) {
        if (this._mode === "selecting") {
            if (this.ctx.state.selectedIds.size === 0) {
                this.ctx.canvas.clearGhost();
                return true;
            }
            this._beginPickFrom(pos, e);
            return true;
        }

        if (this._mode === "pick-from") {
            this._rollbackToSelection();
            return true;
        }

        if (this._mode === "pick-to") {
            this._restoreOrigins();
            this._rollbackToSelection();
            return true;
        }

        return false;
    }

    /**
     * Handle keyboard shortcuts for cancel/delete and point-input focus.
     * @param {KeyboardEvent} e
     * @returns {boolean}
     */
    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._mode === "pick-to") {
                this._restoreOrigins();
                this._rollbackToSelection();
                return true;
            }
            if (this._mode === "pick-from") {
                this._rollbackToSelection();
                return true;
            }
        }

        if (e.key === "Delete" || e.key === "Backspace") {
            if (this._mode === "selecting") {
                const ids = [...this.ctx.state.selectedIds];
                if (ids.length > 0) {
                    this.ctx.state.deleteSegments(ids);
                    return true;
                }
            }
        }

        if (this._mode === "pick-to" && e.key === "Control") {
            this._copyMode = transitionCopyMode({
                current: this._copyMode,
                next: true,
                onEnterCopy: () => this._restoreOrigins(),
            });
            if (this._cursorPos) this._applyPreviewTo(this._cursorPos);
            this._updateMoveGhost();
            return true;
        }

        if ((this._mode === "pick-from" || this._mode === "pick-to") && !this._pointInputFocused) {
            if (e.key === "Tab") {
                e.preventDefault();
                const inp = this._pointPopup?.querySelector('input[data-role="point"]');
                if (inp) {
                    inp.focus();
                    inp.select();
                }
                return true;
            }
            if (e.key.length === 1 && /[\d.\-+{}a-zA-Z_/*()]/.test(e.key)) {
                const inp = this._pointPopup?.querySelector('input[data-role="point"]');
                if (inp) {
                    inp.value = e.key;
                    inp.focus();
                    inp.setSelectionRange(1, 1);
                    e.preventDefault();
                    return true;
                }
            }
        }

        return false;
    }

    onKeyUp(e) {
        if (this._mode === "pick-to" && e.key === "Control") {
            this._copyMode = transitionCopyMode({
                current: this._copyMode,
                next: false,
                onExitCopy: () => {
                    this._copyPreviewSnapshots = [];
                },
            });
            if (this._cursorPos) this._applyPreviewTo(this._cursorPos);
            this._updateMoveGhost();
            return true;
        }
        return false;
    }

    _beginPickFrom(pos, e) {
        this._captureMoveOrigins();
        this._copyMode = false;
        this._copyPreviewSnapshots = [];
        this._mode = "pick-from";
        this._cursorPos = pos ?? null;
        this._showPointPopup(e, "from", pos ?? null);
    }

    _setFromPoint(point, e) {
        if (!point) return;
        this._fromPoint = { x: point.x, y: point.y };
        this._mode = "pick-to";
        this._cursorPos = point;
        this._showPointPopup(e, "to", point);
        this._applyPreviewTo(point);
        this._updateMoveGhost();
    }

    _captureMoveOrigins() {
        const selectedIds = [...this.ctx.state.selectedIds];
        this._movingSegIds = selectedIds;
        this._movingOrigins.clear();
        this._movingEndpointRefs = [];
        this._movingEndpointOrigins = new Map();
        this._movingRectSides = new Map();
        for (const id of selectedIds) {
            const seg = this._findSeg(id);
            if (seg) this._movingOrigins.set(id, JSON.parse(JSON.stringify(seg.data)));
        }

        for (const id of selectedIds) {
            const sides = this._selectedRectSides.get(id) ?? [];
            if (sides.length > 0) {
                this._movingRectSides.set(id, sides.map(s => ({ ...s })));
            }
        }

        if (this._movingRectSides.size > 0) {
            this._movingSegIds = selectedIds.filter(id => !this._movingRectSides.has(id));
        }

        const selectedSet = new Set(this._movingSegIds);
        const selectedContourIds = new Set(
            this._movingSegIds
                .map(id => this._findSeg(id)?.contourId)
                .filter(v => v !== undefined && v !== null),
        );
        const refsSeen = new Set();
        for (const id of this._movingSegIds) {
            const origin = this._movingOrigins.get(id);
            if (!origin) continue;
            if (!origin.start || !origin.end) continue;
            for (const pt of [origin.start, origin.end]) {
                const refs = this.ctx.state.getSegmentsAtVertex(pt);
                for (const ref of refs) {
                    if (selectedSet.has(ref.segId)) continue;
                    const refSeg = this._findSeg(ref.segId);
                    if (!refSeg) continue;
                    if (!selectedContourIds.has(refSeg.contourId)) continue;
                    const key = `${ref.segId}:${ref.pointKey}`;
                    if (refsSeen.has(key)) continue;
                    refsSeen.add(key);
                    this._movingEndpointRefs.push(ref);
                    if (!this._movingEndpointOrigins.has(ref.segId)) {
                        this._movingEndpointOrigins.set(ref.segId, JSON.parse(JSON.stringify(refSeg.data)));
                    }
                }
            }
        }
    }

    _applyRectSideMove(origin, sideSpecs, fromPoint, toPoint, segId) {
        if (!origin || !Array.isArray(sideSpecs) || sideSpecs.length === 0) return origin;

        const fromLocal = this.ctx.canvas.toSegmentLocal(fromPoint, segId) ?? fromPoint;
        const toLocal = this.ctx.canvas.toSegmentLocal(toPoint, segId) ?? toPoint;
        const dLocal = { x: toLocal.x - fromLocal.x, y: toLocal.y - fromLocal.y };

        const geom0 = getRectGeomLocal(origin);
        const xStart0 = geom0.xStart;
        const xOpp0 = geom0.xOpp;
        const yStart0 = geom0.yStart;
        const yOpp0 = geom0.yOpp;

        let moveXStart = false;
        let moveXOpp = false;
        let moveYStart = false;
        let moveYOpp = false;
        for (const s of sideSpecs) {
            if (s.axis === "w") {
                if (s.role === "x-start") moveXStart = true;
                if (s.role === "x-opposite") moveXOpp = true;
            }
            if (s.axis === "h") {
                if (s.role === "y-start") moveYStart = true;
                if (s.role === "y-opposite") moveYOpp = true;
            }
        }

        let xStart = xStart0;
        let xOpp = xOpp0;
        let yStart = yStart0;
        let yOpp = yOpp0;

        if (moveXStart && moveXOpp) {
            xStart += dLocal.x;
            xOpp += dLocal.x;
        } else if (moveXStart) {
            xStart += dLocal.x;
        } else if (moveXOpp) {
            xOpp += dLocal.x;
        }

        if (moveYStart && moveYOpp) {
            yStart += dLocal.y;
            yOpp += dLocal.y;
        } else if (moveYStart) {
            yStart += dLocal.y;
        } else if (moveYOpp) {
            yOpp += dLocal.y;
        }

        const dx = xOpp - xStart;
        const dy = yOpp - yStart;
        const nextDirW = Math.abs(dx) > FORMULA_EQ_EPS ? (dx >= 0 ? 1 : -1) : geom0.dirW;
        const nextDirH = Math.abs(dy) > FORMULA_EQ_EPS ? (dy >= 0 ? 1 : -1) : geom0.dirH;

        const next = {
            ...origin,
            x: xStart,
            y: yStart,
            w: Math.abs(dx),
            h: Math.abs(dy),
            dirW: nextDirW,
            dirH: nextDirH,
        };

        next._expr = _dropChangedExprKeys(origin, next, ["x", "y", "w", "h"]);
        return next;
    }

    _recomputeArcAfterEndpointMove(origin, newData) {
        const s = newData.start;
        const en = newData.end;

        let pt3 = origin.pt3 ?? null;
        if (!pt3) {
            const mx = (origin.start.x + origin.end.x) / 2;
            const my = (origin.start.y + origin.end.y) / 2;
            const dmx = mx - origin.center.x;
            const dmy = my - origin.center.y;
            const dmLen = Math.hypot(dmx, dmy);
            if (dmLen > 1e-9) {
                const sign = origin.largeArc ? -1 : 1;
                pt3 = {
                    x: origin.center.x + sign * origin.radius * dmx / dmLen,
                    y: origin.center.y + sign * origin.radius * dmy / dmLen,
                };
            }
        }

        if (!pt3) return newData;

        if (origin.arcMode === "arc2pt") {
            const result = arc2ptData(s, en, origin.radius, pt3);
            if (result) {
                const dcLen = Math.hypot(pt3.x - result.center.x, pt3.y - result.center.y);
                const newPt3 = dcLen > 1e-9
                    ? {
                        x: result.center.x + origin.radius * (pt3.x - result.center.x) / dcLen,
                        y: result.center.y + origin.radius * (pt3.y - result.center.y) / dcLen,
                    }
                    : { x: result.center.x + origin.radius, y: result.center.y };
                return {
                    ...newData,
                    center: result.center,
                    largeArc: result.largeArc,
                    sweep: result.sweep,
                    pt3: newPt3,
                };
            }
        }

        const c = circumcenter(s, en, pt3);
        if (!c) return newData;
        const flags = arcFlagsViaPoint(s, en, pt3, c.cx, c.cy);
        return {
            ...newData,
            center: { x: c.cx, y: c.cy },
            radius: c.r,
            ...flags,
            pt3,
            arcMode: "arc3pt",
            radiusExpr: undefined,
        };
    }

    _translateSegmentData(origin, dx, dy) {
        if (!origin) return origin;

        if (origin.center !== undefined && origin.start === undefined) {
            const nextCx = origin.center.x + dx;
            const nextCy = origin.center.y + dy;
            const nextData = {
                ...origin,
                center: { x: nextCx, y: nextCy },
                ...(origin.pt3 && { pt3: { x: origin.pt3.x + dx, y: origin.pt3.y + dy } }),
            };
            nextData._expr = _dropChangedExprKeys(
                { ...origin, cx: origin.center.x, cy: origin.center.y },
                { ...nextData, cx: nextCx, cy: nextCy },
                ["cx", "cy"],
            );
            return nextData;
        }

        if (origin.cx !== undefined) {
            const nextCx = origin.cx + dx;
            const nextCy = origin.cy + dy;
            const nextData = {
                ...origin,
                cx: nextCx,
                cy: nextCy,
            };
            nextData._expr = _dropChangedExprKeys(origin, nextData, ["cx", "cy"]);
            return nextData;
        }

        if (origin.x !== undefined && origin.start === undefined) {
            const nextX = origin.x + dx;
            const nextY = origin.y + dy;
            const nextData = {
                ...origin,
                x: nextX,
                y: nextY,
            };
            nextData._expr = _dropChangedExprKeys(origin, nextData, ["x", "y"]);
            return nextData;
        }

        const next = {
            ...origin,
            start: { x: origin.start.x + dx, y: origin.start.y + dy },
            end: { x: origin.end.x + dx, y: origin.end.y + dy },
        };
        if (origin.center) next.center = { x: origin.center.x + dx, y: origin.center.y + dy };
        if (origin.pt3) next.pt3 = { x: origin.pt3.x + dx, y: origin.pt3.y + dy };
        return next;
    }

    _segmentLocalDelta(segId, fromPoint, toPoint) {
        if (!fromPoint || !toPoint) return { dx: 0, dy: 0 };
        const fromLocal = this.ctx.canvas.toSegmentLocal(fromPoint, segId) ?? fromPoint;
        const toLocal = this.ctx.canvas.toSegmentLocal(toPoint, segId) ?? toPoint;
        return {
            dx: toLocal.x - fromLocal.x,
            dy: toLocal.y - fromLocal.y,
        };
    }

    /**
     * Apply live preview translation/side-resize from source point to target point.
     * @param {{x:number,y:number}} toPoint
     */
    _applyPreviewTo(toPoint) {
        if (!this._fromPoint || !toPoint) return;
        const updates = [];

        for (const [id, sideSpecs] of this._movingRectSides) {
            const origin = this._movingOrigins.get(id);
            if (!origin) continue;
            const nextData = this._applyRectSideMove(origin, sideSpecs, this._fromPoint, toPoint, id);
            updates.push({ id, changes: { data: nextData } });
        }

        for (const id of this._movingSegIds) {
            const origin = this._movingOrigins.get(id);
            if (!origin) continue;
            const { dx, dy } = this._segmentLocalDelta(id, this._fromPoint, toPoint);
            updates.push({ id, changes: { data: this._translateSegmentData(origin, dx, dy) } });
        }

        const endpointBySeg = new Map();
        for (const ref of this._movingEndpointRefs) {
            const origin = this._movingEndpointOrigins.get(ref.segId);
            if (!origin) continue;
            if (!endpointBySeg.has(ref.segId)) {
                endpointBySeg.set(ref.segId, { origin, next: { ...origin } });
            }
            const entry = endpointBySeg.get(ref.segId);
            const p0 = origin[ref.pointKey];
            const { dx, dy } = this._segmentLocalDelta(ref.segId, this._fromPoint, toPoint);
            entry.next[ref.pointKey] = { x: p0.x + dx, y: p0.y + dy };
        }

        for (const [segId, entry] of endpointBySeg) {
            let nextData = entry.next;
            const isArc = typeof entry.origin.radius === "number" && !!entry.origin.center;
            if (isArc) {
                nextData = this._recomputeArcAfterEndpointMove(entry.origin, nextData);
            }
            updates.push({ id: segId, changes: { data: nextData } });
        }

        if (updates.length > 0) {
            if (this._copyMode) {
                this.ctx.state.updateSegments(updates);
                this._copyPreviewSnapshots = this._collectCopyPreviewSnapshots();
                this._restoreOrigins();
                if (this._selectedRectSides.size > 0) this._syncRectSideHighlights();
                return;
            }
            this.ctx.state.updateSegments(updates);
            this._copyPreviewSnapshots = [];
            if (this._selectedRectSides.size > 0) this._syncRectSideHighlights();
        }
    }

    _collectCopyPreviewSnapshots() {
        const selectedMovedIds = [...new Set([...this._movingSegIds, ...this._movingRectSides.keys()])];
        return collectSegmentSnapshots(this.ctx.state, selectedMovedIds);
    }

    _commitMove({ keepSourceSelection = false } = {}) {
        let anyChanged = [...this._movingOrigins.entries()].some(([id, origin]) => {
            const seg = this._findSeg(id);
            return !_segDataEqual(origin, seg?.data);
        }) || this._movingEndpointRefs.some(ref => {
            const origin = this._movingEndpointOrigins.get(ref.segId);
            const seg = this._findSeg(ref.segId);
            return !_segDataEqual(origin, seg?.data);
        });
        if (this._copyMode && this._copyPreviewSnapshots.length > 0) anyChanged = true;

        if (this._copyMode && anyChanged) {
            const state = this.ctx.state;
            let snapshots = this._copyPreviewSnapshots;
            if ((!snapshots || snapshots.length === 0) && this._cursorPos) {
                this._applyPreviewTo(this._cursorPos);
                snapshots = this._copyPreviewSnapshots;
            }

            this._restoreOrigins();
            const sourceIds = [...new Set([...this._movingSegIds, ...this._movingRectSides.keys()])];
            return commitCopiedSnapshots({
                state,
                snapshots,
                historyLabel: "Move Copy",
                keepSourceSelection,
                sourceIds,
            });
        }

        if (anyChanged) {
            this.ctx.state._pushHistory("Move");
            return true;
        }

        this._restoreOrigins();
        return false;
    }

    _restoreOrigins() {
        const updates = [];
        for (const [id, origin] of this._movingOrigins.entries()) {
            updates.push({ id, changes: { data: origin } });
        }
        for (const [id, origin] of this._movingEndpointOrigins) {
            updates.push({ id, changes: { data: origin } });
        }
        if (updates.length > 0) this.ctx.state.updateSegments(updates);
    }

    _rollbackToSelection() {
        this._mode = "selecting";
        this._resetMoveSession();
        this._removePointPopup();
        this.ctx.canvas.clearGhost();
    }

    _resetMoveSession() {
        this._fromPoint = null;
        this._cursorPos = null;
        this._copyMode = false;
        this._copyPreviewSnapshots = [];
        this._movingSegIds = [];
        this._movingOrigins = new Map();
        this._movingEndpointRefs = [];
        this._movingEndpointOrigins = new Map();
        this._movingRectSides = new Map();
        this._pointInputFocused = false;
    }

    _toggleRectSideSelection(sideHit) {
        const seg = this._findSeg(sideHit.segId);
        if (!seg || seg.type !== "rect") return;
        const side = { role: String(sideHit.role), axis: sideHit.axis };
        const prev = this._selectedRectSides.get(seg.id) ?? [];
        const idx = prev.findIndex(s => s.role === side.role && s.axis === side.axis);
        let nextSides;
        if (idx >= 0) {
            nextSides = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        } else {
            nextSides = [...prev, side];
        }
        if (nextSides.length === 0) {
            this._selectedRectSides.delete(seg.id);
        } else {
            this._selectedRectSides.set(seg.id, nextSides);
            if (!this.ctx.state.selectedIds.has(seg.id)) {
                this.ctx.state.setSelection([...this.ctx.state.selectedIds, seg.id]);
            }
        }
        this._pruneRectSideSelection();
        this._syncRectSideHighlights();
    }

    _clearRectSideSelection() {
        const prev = new Map(this._selectedRectSides);
        this._selectedRectSides.clear();
        for (const [segId, sides] of prev) {
            for (const side of sides) {
                this.ctx.canvas.setRectSideHighlight(segId, side.role, false);
            }
        }
    }

    _pruneRectSideSelection() {
        const selected = this.ctx.state.selectedIds;
        for (const segId of [...this._selectedRectSides.keys()]) {
            if (!selected.has(segId)) this._selectedRectSides.delete(segId);
        }
        this._syncRectSideHighlights();
    }

    _syncRectSideHighlights() {
        const layer = this.ctx?.canvas?.cm?.getLayer("bits");
        if (!layer) return;
        layer
            .querySelectorAll("[data-rect-side-role].editor-rect-side-selected")
            .forEach(el => el.classList.remove("editor-rect-side-selected"));
        layer
            .querySelectorAll("rect.editor-segment.editor-rect-side-only")
            .forEach(el => el.classList.remove("editor-rect-side-only"));

        for (const [segId, sides] of this._selectedRectSides) {
            this.ctx.canvas.setRectSideOnlySelection(segId, true);
            for (const side of sides) {
                this.ctx.canvas.setRectSideHighlight(segId, side.role, true);
            }
        }
    }

    _toggleSelectionIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        const next = new Set(this.ctx.state.selectedIds);
        const allSel = ids.every(id => next.has(id));
        if (allSel) {
            ids.forEach(id => next.delete(id));
        } else {
            ids.forEach(id => next.add(id));
        }
        this.ctx.state.setSelection([...next]);
        this._pruneRectSideSelection();
    }

    _applyBoxSelection(start, end, { selectParts = false } = {}) {
        this._clearRectSideSelection();
        const result = computeBoxSelection(this.ctx.state.segments, start, end, {
            selectParts,
            variableValues: this.ctx.state.variableValues ?? {},
        });
        if (selectParts) {
            this._selectedRectSides = result.rectSides;
            this.ctx.state.setSelection(result.ids);
            this._pruneRectSideSelection();
        } else {
            this.ctx.state.setSelection(result.ids);
        }
        this._syncRectSideHighlights();
        this.ctx.canvas.clearGhost();
    }

    _updateBoxGhost(start, end) {
        this.ctx.canvas.setGhost(buildSelectionBoxGhost(start, end, SVG_NS));
    }

    _updateMoveGhost() {
        if (!this._fromPoint || !this._cursorPos) {
            this.ctx.canvas.clearGhost();
            return;
        }
        const g = document.createElementNS(SVG_NS, "g");

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", this._fromPoint.x);
        line.setAttribute("y1", this._fromPoint.y);
        line.setAttribute("x2", this._cursorPos.x);
        line.setAttribute("y2", this._cursorPos.y);
        g.appendChild(line);

        for (const pt of [this._fromPoint, this._cursorPos]) {
            const c = document.createElementNS(SVG_NS, "circle");
            c.setAttribute("cx", pt.x);
            c.setAttribute("cy", pt.y);
            c.setAttribute("r", "0.05");
            c.classList.add("editor-ghost-endpoint");
            g.appendChild(c);
        }

        if (this._copyMode) {
            const plus = document.createElementNS(SVG_NS, "text");
            plus.setAttribute("x", this._cursorPos.x + 0.12);
            plus.setAttribute("y", this._cursorPos.y - 0.12);
            plus.setAttribute("font-size", "0.28");
            plus.textContent = "+";
            plus.classList.add("editor-selection-box");
            g.appendChild(plus);

            for (const snap of this._copyPreviewSnapshots) {
                const el = this.ctx.canvas._buildSegmentElement?.({
                    ...snap,
                    selected: false,
                });
                if (!el) continue;
                el.classList.add("editor-copy-preview");
                g.appendChild(el);
            }
        }

        this.ctx.canvas.setGhost(g);
    }

    _endDrag() {
        this._downClient = null;
        this._downSvgPos = null;
        this._dragging = false;
        if (this.ctx && this._mode === "selecting") this.ctx.canvas.clearGhost();
    }

    _findSeg(id) {
        return this.ctx.state.segments.find(s => s.id === id) ?? null;
    }

    _showPointPopup(e, stage, point) {
        this._removePointPopup();
        this._pointInputFocused = false;

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = stage === "from" ? "P1:" : "P2:";
        popup.appendChild(label);

        const inpPoint = document.createElement("input");
        inpPoint.type = "text";
        inpPoint.inputMode = "text";
        inpPoint.className = "arc-radius-input";
        inpPoint.dataset.role = "point";
        inpPoint.style.width = "132px";
        inpPoint.placeholder = "x y";
        inpPoint.value = point ? `${this._fmtPoint(point.x)} ${this._fmtPoint(-point.y)}` : "";
        popup.appendChild(inpPoint);

        const hint = document.createElement("small");
        hint.className = "arc-radius-hint";
        popup.appendChild(hint);

        document.body.appendChild(popup);
        this._pointPopup = popup;
        if (e) this._positionPointPopup(e);

        const onFocus = (inp) => {
            this._pointInputFocused = true;
            inp.select();
        };

        const onBlur = () => {
            this._pointInputFocused = false;
        };

        inpPoint.addEventListener("focus", () => onFocus(inpPoint));
        inpPoint.addEventListener("blur", onBlur);

        const handleKeyDown = (ev) => {
            ev.stopPropagation();
            if (ev.key === "Tab") {
                ev.preventDefault();
                ev.target.blur();
                return;
            }
            if (ev.key === "Enter") {
                this._commitPointFromInput();
                return;
            }
            if (ev.key === "Escape") {
                if (this._mode === "pick-to") {
                    this._restoreOrigins();
                }
                this._rollbackToSelection();
            }
        };

        inpPoint.addEventListener("keydown", handleKeyDown);
    }

    _commitPointFromInput() {
        const inpPoint = this._pointPopup?.querySelector('input[data-role="point"]');
        const hint = this._pointPopup?.querySelector(".arc-radius-hint");
        if (!inpPoint) return;

        const rawPoint = String(inpPoint.value ?? "").trim();

        const showError = (msg) => {
            inpPoint.classList.add("arc-radius-error");
            setTimeout(() => {
                inpPoint.classList.remove("arc-radius-error");
            }, 2000);
            if (hint) hint.textContent = msg;
        };

        const tokens = rawPoint.split(/[\s,]+/).filter(Boolean);
        if (tokens.length === 0) {
            showError("Enter: x y or one value");
            return;
        }

        const rawX = tokens[0];
        const rawY = tokens.length >= 2 ? tokens[1] : tokens[0];

        const x = evaluateTokenWithVars(rawX, this.ctx.state.variableValues ?? {}, Number.NaN);
        const yEval = evaluateTokenWithVars(rawY, this.ctx.state.variableValues ?? {}, Number.NaN);
        const y = Number.isFinite(yEval) ? -yEval : yEval;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            showError("Invalid coordinate expression");
            return;
        }

        const pt = { x, y };
        if (this._mode === "pick-from") {
            this._setFromPoint(pt, null);
            this._updatePointPopupValues(pt);
            return;
        }

        if (this._mode === "pick-to") {
            commitStagedTransformTarget({
                copyMode: this._copyMode,
                targetPoint: pt,
                applyPreview: (point) => this._applyPreviewTo(point),
                commit: (args) => this._commitMove(args),
                refreshPreview: () => {
                    if (this._cursorPos) this._applyPreviewTo(this._cursorPos);
                    this._updateMoveGhost();
                },
                finishCommand: () => this._rollbackToSelection(),
            });
        }
    }

    _updatePointPopupValues(point) {
        if (!this._pointPopup || this._pointInputFocused || !point) return;
        const inpPoint = this._pointPopup.querySelector('input[data-role="point"]');
        if (inpPoint) inpPoint.value = `${this._fmtPoint(point.x)} ${this._fmtPoint(-point.y)}`;
    }

    _positionPointPopup(e) {
        if (!this._pointPopup || !e) return;
        const gap = 16;
        const margin = 8;
        const rect = this._pointPopup.getBoundingClientRect();

        let left = e.clientX + gap;
        if (left + rect.width + margin > window.innerWidth) {
            left = e.clientX - rect.width - gap;
        }
        left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin));

        let top = e.clientY - 10;
        if (top < margin) {
            top = e.clientY + gap;
        }
        if (top + rect.height + margin > window.innerHeight) {
            top = e.clientY - rect.height - gap;
        }
        top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));

        this._pointPopup.style.left = `${left}px`;
        this._pointPopup.style.top = `${top}px`;
    }

    _removePointPopup() {
        if (this._pointPopup) {
            this._pointPopup.remove();
            this._pointPopup = null;
        }
        this._pointInputFocused = false;
    }

    _fmtPoint(v) {
        return Number(v).toFixed(4).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    }

    _updateHover(pos) {
        const hitId = this.ctx.canvas.hitTest(pos);
        if (hitId !== this._hoverSegId) {
            if (this._hoverSegId) this.ctx.canvas.setHoverSegment(this._hoverSegId, false);
            if (hitId) this.ctx.canvas.setHoverSegment(hitId, true);
            this._hoverSegId = hitId;
        }
    }

    _clearHover() {
        if (!this.ctx) return;
        if (this._hoverSegId) {
            this.ctx.canvas.setHoverSegment(this._hoverSegId, false);
            this._hoverSegId = null;
        }
    }
}
