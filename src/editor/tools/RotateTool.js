import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { evaluateTokenWithVars } from "../../utils/formulaPolicy.js";
import { evalAngle } from "../transforms/TransformCommands.js";
import { circumcenter, arc2ptData, arcFlagsViaPoint } from "./ArcTool.js";
import { computeBoxSelection, buildSelectionBoxGhost } from "./shared/selectionUtils.js";
import {
    collectSegmentSnapshots,
    commitCopiedSnapshots,
    commitStagedTransformTarget,
    transitionCopyMode,
} from "./shared/copyPreviewUtils.js";

const log = LoggerFactory.createLogger("RotateTool");
const SVG_NS = "http://www.w3.org/2000/svg";

function _deg(v) {
    return v * 180 / Math.PI;
}

function _rotatePoint(p, angleDeg) {
    const r = angleDeg * Math.PI / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function _rotateAround(p, center, angleDeg) {
    const q = { x: p.x - center.x, y: p.y - center.y };
    const qr = _rotatePoint(q, angleDeg);
    return { x: qr.x + center.x, y: qr.y + center.y };
}

function _sumRtAngle(transforms, vars = {}) {
    const list = Array.isArray(transforms) ? transforms : [];
    let angle = 0;
    for (const t of list) {
        if (String(t?.type ?? "").toUpperCase() !== "RT") continue;
        const v = evalAngle(t?.params?.[0] ?? "", vars);
        if (Number.isFinite(v)) angle += v;
    }
    return angle;
}

function _withRtAngle(transforms, nextAngle) {
    const list = Array.isArray(transforms) ? transforms.map(t => ({ ...t, params: Array.isArray(t.params) ? [...t.params] : [] })) : [];
    const token = String(parseFloat(nextAngle.toFixed(6)));
    const idx = list.findIndex(t => String(t?.type ?? "").toUpperCase() === "RT");
    if (idx >= 0) {
        list[idx] = { ...list[idx], raw: `MOD RT ${token}`, params: [token] };
        return list;
    }
    list.push({ type: "RT", raw: `MOD RT ${token}`, params: [token] });
    return list;
}

function _clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function _cloneTransforms(transforms) {
    return Array.isArray(transforms) ? _clone(transforms) : [];
}

function _segmentSnapshot(seg) {
    return {
        data: _clone(seg?.data ?? {}),
        transforms: _cloneTransforms(seg?.transforms),
    };
}


export default class RotateTool extends BaseTool {
    constructor() {
        super();
        this.id = "rotate";
        this._mode = "selecting"; // selecting | pick-center | pick-ref | pick-to

        this._downClient = null;
        this._downSvgPos = null;
        this._dragging = false;
        this._hoverSegId = null;

        this._selectedRectSides = new Map();

        this._center = null;
        this._refPoint = null;
        this._cursorPos = null;

        this._rotatingSegIds = [];
        this._origins = new Map();
        this._rotatingEndpointRefs = [];
        this._rotatingEndpointOrigins = new Map();

        this._copyMode = false;
        this._copyPreviewSnapshots = [];

        this._pointPopup = null;
        this._pointInputFocused = false;
    }

    /**
     * Activate rotate tool.
     * @param {{ state: import("../EditorStateManager.js").default, canvas: import("../EditorCanvas.js").default }} ctx
     */
    activate(ctx) {
        super.activate(ctx);
        this._mode = "selecting";
        log.debug("RotateTool active");
    }

    /**
     * Deactivate tool and rollback transient preview state.
     */
    deactivate() {
        this._restoreOrigins();
        this._clearHover();
        this._endDrag();
        this._clearRectSideSelection();
        this._clearSession();
        this._removePointPopup();
        super.deactivate();
    }

    hasActiveCommand() {
        return true;
    }

    /**
     * Handle pointer down according to rotate stage.
     * @param {{x:number,y:number}} pos
     * @param {MouseEvent} e
     */
    onPointerDown(pos, e) {
        if (e.button !== 0) return;

        if (this._mode === "pick-center") {
            this._setCenter(pos, e);
            return;
        }
        if (this._mode === "pick-ref") {
            this._setRefPoint(pos, e);
            return;
        }
        if (this._mode === "pick-to") {
            this._copyMode = !!e.ctrlKey;
            commitStagedTransformTarget({
                copyMode: this._copyMode,
                targetPoint: pos,
                applyPreview: (point) => this._applyPreviewTo(point),
                commit: (args) => this._commitRotate(args),
                refreshPreview: () => {
                    if (this._cursorPos) this._applyPreviewTo(this._cursorPos);
                    this._updateRotateGhost();
                },
                finishCommand: () => this._rollbackToSelection(),
            });
            return;
        }

        const rawPos = this.ctx.canvas.screenToSVG(e);
        this._downClient = { x: e.clientX, y: e.clientY };
        this._downSvgPos = rawPos;
        this._dragging = false;
    }

    /**
     * Handle pointer move for selection box and rotate preview.
     * @param {{x:number,y:number}} pos
     * @param {MouseEvent} e
     */
    onPointerMove(pos, e) {
        const rawPos = this.ctx.canvas.screenToSVG(e);

        if (this._mode === "pick-center") {
            this._cursorPos = pos;
            this._updateRotateGhost();
            this._updatePointPopupValues(pos);
            this._positionPointPopup(e);
            this._updateHover(rawPos);
            return;
        }
        if (this._mode === "pick-ref") {
            this._cursorPos = pos;
            this._updateRotateGhost();
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
            this._updateRotateGhost();
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
     * Handle pointer up for click or box selection stage.
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
     * Handle RMB confirm/cancel semantics by stage.
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
            this._beginPickCenter(pos, e);
            return true;
        }

        if (this._mode === "pick-center" || this._mode === "pick-ref") {
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
     * Handle keyboard shortcuts and popup input focus.
     * @param {KeyboardEvent} e
     * @returns {boolean}
     */
    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._mode === "pick-to") this._restoreOrigins();
            if (this._mode !== "selecting") {
                this._rollbackToSelection();
                return true;
            }
        }

        if (this._mode === "pick-to" && e.key === "Control") {
            this._copyMode = transitionCopyMode({
                current: this._copyMode,
                next: true,
                onEnterCopy: () => this._restoreOrigins(),
            });
            if (this._cursorPos) this._applyPreviewTo(this._cursorPos);
            this._updateRotateGhost();
            return true;
        }

        if ((this._mode === "pick-center" || this._mode === "pick-ref" || this._mode === "pick-to") && !this._pointInputFocused) {
            if (e.key === "Tab") {
                e.preventDefault();
                const inp = this._getPopupInput();
                if (inp) {
                    inp.focus();
                    inp.select();
                }
                return true;
            }
            if (e.key.length === 1 && /[\d.\-+{}a-zA-Z_/*()]/.test(e.key)) {
                const inp = this._getPopupInput();
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
            this._updateRotateGhost();
            return true;
        }
        return false;
    }

    _beginPickCenter(pos, e) {
        this._mode = "pick-center";
        this._cursorPos = pos ?? null;
        this._showPointPopup(e, "center", pos ?? null);
    }

    _setCenter(point, e) {
        if (!point) return;
        this._center = { x: point.x, y: point.y };
        this._mode = "pick-ref";
        this._cursorPos = point;
        this._showPointPopup(e, "ref1", point);
        this._updateRotateGhost();
    }

    _setRefPoint(point, e) {
        if (!point || !this._center) return;
        const dx = point.x - this._center.x;
        const dy = point.y - this._center.y;
        if (Math.hypot(dx, dy) < 1e-6) return;

        this._refPoint = { x: point.x, y: point.y };
        this._captureOrigins();
        this._copyMode = false;
        this._copyPreviewSnapshots = [];
        this._mode = "pick-to";
        this._cursorPos = point;
        this._showPointPopup(e, "ref2", point);
        this._applyPreviewTo(point);
        this._updateRotateGhost();
    }

    _captureOrigins() {
        const segmentById = new Map(this.ctx.state.segments.map(seg => [seg.id, seg]));
        this._rotatingSegIds = [...this.ctx.state.selectedIds];
        this._origins.clear();
        this._rotatingEndpointRefs = [];
        this._rotatingEndpointOrigins = new Map();

        for (const id of this._rotatingSegIds) {
            const seg = segmentById.get(id);
            if (!seg) continue;
            this._origins.set(id, _segmentSnapshot(seg));
        }

        const selectedSet = new Set(this._rotatingSegIds);
        const selectedContourIds = new Set(
            this._rotatingSegIds
                .map(id => segmentById.get(id)?.contourId)
                .filter(v => v !== undefined && v !== null),
        );
        const refsSeen = new Set();
        for (const id of this._rotatingSegIds) {
            const origin = this._origins.get(id)?.data;
            if (!origin || !origin.start || !origin.end) continue;
            for (const pt of [origin.start, origin.end]) {
                const refs = this.ctx.state.getSegmentsAtVertex(pt);
                for (const ref of refs) {
                    if (selectedSet.has(ref.segId)) continue;
                    const refSeg = segmentById.get(ref.segId);
                    if (!refSeg) continue;
                    if (!selectedContourIds.has(refSeg.contourId)) continue;
                    const key = `${ref.segId}:${ref.pointKey}`;
                    if (refsSeen.has(key)) continue;
                    refsSeen.add(key);
                    this._rotatingEndpointRefs.push(ref);
                    if (!this._rotatingEndpointOrigins.has(ref.segId)) {
                        this._rotatingEndpointOrigins.set(ref.segId, _segmentSnapshot(refSeg));
                    }
                }
            }
        }
    }

    _currentAngle(toPoint) {
        if (!this._center || !this._refPoint || !toPoint) return 0;
        const ax = this._refPoint.x - this._center.x;
        const ay = this._refPoint.y - this._center.y;
        const bx = toPoint.x - this._center.x;
        const by = toPoint.y - this._center.y;
        const la = Math.hypot(ax, ay);
        const lb = Math.hypot(bx, by);
        if (la < 1e-9 || lb < 1e-9) return 0;
        const cross = ax * by - ay * bx;
        const dot = ax * bx + ay * by;
        return _deg(Math.atan2(cross, dot));
    }

    _pointByAngle(angleDeg) {
        if (!this._center || !this._refPoint) return null;
        const v = {
            x: this._refPoint.x - this._center.x,
            y: this._refPoint.y - this._center.y,
        };
        const vr = _rotatePoint(v, angleDeg);
        return {
            x: this._center.x + vr.x,
            y: this._center.y + vr.y,
        };
    }

    _rotateRawPoint(rawPoint, center, angleDeg, rawRtAngle, nextRtAngle = rawRtAngle) {
        const world = _rotatePoint(rawPoint, rawRtAngle);
        const worldRot = _rotateAround(world, center, angleDeg);
        return _rotatePoint(worldRot, -nextRtAngle);
    }

    _rotateSegment(origin, center, angleDeg) {
        const next = {
            data: _clone(origin.data),
            transforms: _cloneTransforms(origin.transforms),
        };
        const d = next.data;
        const rt0 = _sumRtAngle(origin.transforms, this.ctx.state.variableValues ?? {});

        if (typeof d.x === "number" && typeof d.y === "number" && (typeof d.w === "number" || typeof d.h === "number")) {
            const rtNext = rt0 + angleDeg;
            const p = this._rotateRawPoint({ x: d.x, y: d.y }, center, angleDeg, rt0, rtNext);
            d.x = p.x;
            d.y = p.y;
            next.transforms = _withRtAngle(origin.transforms, rtNext);
            return next;
        }

        if (typeof d.cx === "number" && typeof d.cy === "number" && typeof d.rx === "number" && typeof d.ry === "number") {
            const rtNext = rt0 + angleDeg;
            const p = this._rotateRawPoint({ x: d.cx, y: d.cy }, center, angleDeg, rt0, rtNext);
            d.cx = p.x;
            d.cy = p.y;
            next.transforms = _withRtAngle(origin.transforms, rtNext);
            return next;
        }

        const rotateKey = (k) => {
            if (!d[k] || typeof d[k].x !== "number" || typeof d[k].y !== "number") return;
            const p = this._rotateRawPoint(d[k], center, angleDeg, rt0, rt0);
            d[k].x = p.x;
            d[k].y = p.y;
        };

        rotateKey("start");
        rotateKey("end");
        rotateKey("center");
        rotateKey("pt3");

        if (typeof d.cx === "number" && typeof d.cy === "number") {
            const p = this._rotateRawPoint({ x: d.cx, y: d.cy }, center, angleDeg, rt0, rt0);
            d.cx = p.x;
            d.cy = p.y;
        }
        if (typeof d.x === "number" && typeof d.y === "number") {
            const p = this._rotateRawPoint({ x: d.x, y: d.y }, center, angleDeg, rt0, rt0);
            d.x = p.x;
            d.y = p.y;
        }

        return next;
    }

    _applyPreviewTo(toPoint) {
        if (!this._center || !this._refPoint || !toPoint || this._origins.size === 0) return;
        const angle = this._currentAngle(toPoint);
        const updates = [];

        for (const [id, origin] of this._origins.entries()) {
            const rotated = this._rotateSegment(origin, this._center, angle);
            updates.push({ id, changes: { data: rotated.data, transforms: rotated.transforms } });
        }

        const endpointBySeg = new Map();
        for (const ref of this._rotatingEndpointRefs) {
            const originEntry = this._rotatingEndpointOrigins.get(ref.segId);
            if (!originEntry) continue;
            if (!endpointBySeg.has(ref.segId)) {
                endpointBySeg.set(ref.segId, {
                    origin: originEntry,
                    next: {
                        data: _clone(originEntry.data),
                        transforms: _cloneTransforms(originEntry.transforms),
                    },
                });
            }
            const entry = endpointBySeg.get(ref.segId);
            const p0 = originEntry.data?.[ref.pointKey];
            if (!p0) continue;
            const rt0 = _sumRtAngle(originEntry.transforms, this.ctx.state.variableValues ?? {});
            const world0 = _rotatePoint(p0, rt0);
            const worldRot = _rotateAround(world0, this._center, angle);
            const localRot = _rotatePoint(worldRot, -rt0);
            entry.next.data[ref.pointKey] = { x: localRot.x, y: localRot.y };
        }

        for (const [segId, entry] of endpointBySeg) {
            let nextData = entry.next.data;
            const originData = entry.origin.data;
            const isArc = typeof originData?.radius === "number" && !!originData?.center;
            if (isArc) nextData = this._recomputeArcAfterEndpointMove(originData, nextData);
            updates.push({ id: segId, changes: { data: nextData, transforms: entry.next.transforms } });
        }

        if (updates.length > 0) {
            if (this._copyMode) {
                this.ctx.state.updateSegments(updates);
                this._copyPreviewSnapshots = this._collectCopyPreviewSnapshots();
                this._restoreOrigins();
                return;
            }
            this.ctx.state.updateSegments(updates);
            this._copyPreviewSnapshots = [];
        }
    }

    _collectCopyPreviewSnapshots() {
        return collectSegmentSnapshots(this.ctx.state, this._rotatingSegIds);
    }

    _commitRotate({ keepSourceSelection = false } = {}) {
        if (this._origins.size === 0) return false;

        const state = this.ctx.state;
        let hasChanged = [...this._origins.entries()].some(([id, origin]) => {
            const seg = state.segments.find(s => s.id === id);
            if (!seg) return false;
            return JSON.stringify(origin.data) !== JSON.stringify(seg.data)
                || JSON.stringify(origin.transforms ?? []) !== JSON.stringify(seg.transforms ?? []);
        });
        if (this._copyMode && this._copyPreviewSnapshots.length > 0) hasChanged = true;

        if (!hasChanged) {
            this._restoreOrigins();
            return false;
        }

        if (this._copyMode) {
            let snapshots = this._copyPreviewSnapshots;
            if ((!snapshots || snapshots.length === 0) && this._cursorPos) {
                this._applyPreviewTo(this._cursorPos);
                snapshots = this._copyPreviewSnapshots;
            }

            this._restoreOrigins();
            return commitCopiedSnapshots({
                state,
                snapshots,
                historyLabel: "Rotate Copy",
                keepSourceSelection,
                sourceIds: this._rotatingSegIds,
            });
        }

        state._pushHistory("Rotate");
        return true;
    }

    _restoreOrigins() {
        if (this._origins.size === 0) return;
        const updates = [];
        for (const [id, origin] of this._origins.entries()) {
            updates.push({ id, changes: { data: origin.data, transforms: origin.transforms } });
        }
        for (const [id, origin] of this._rotatingEndpointOrigins.entries()) {
            updates.push({ id, changes: { data: origin.data, transforms: origin.transforms } });
        }
        this.ctx.state.updateSegments(updates);
    }

    _rollbackToSelection() {
        this._mode = "selecting";
        this._clearSession();
        this._removePointPopup();
        this.ctx.canvas.clearGhost();
    }

    _clearSession() {
        this._center = null;
        this._refPoint = null;
        this._cursorPos = null;
        this._rotatingSegIds = [];
        this._origins.clear();
        this._rotatingEndpointRefs = [];
        this._rotatingEndpointOrigins = new Map();
        this._copyMode = false;
        this._copyPreviewSnapshots = [];
        this._pointInputFocused = false;
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
        if (!start || !end) return;
        this.ctx.canvas.setGhost(buildSelectionBoxGhost(start, end, SVG_NS));
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

    _getPopupInput() {
        return this._pointPopup?.querySelector('input[data-role="point"], input[data-role="angle"]') ?? null;
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
        if (this._hoverSegId) this.ctx.canvas.setHoverSegment(this._hoverSegId, false);
        this._hoverSegId = null;
    }

    _updateRotateGhost() {
        if (!this._center) {
            this.ctx.canvas.clearGhost();
            return;
        }

        const g = document.createElementNS(SVG_NS, "g");

        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", this._center.x);
        c.setAttribute("cy", this._center.y);
        c.setAttribute("r", "0.05");
        c.classList.add("editor-ghost-endpoint");
        g.appendChild(c);

        const drawRay = (to) => {
            const l = document.createElementNS(SVG_NS, "line");
            l.setAttribute("x1", this._center.x);
            l.setAttribute("y1", this._center.y);
            l.setAttribute("x2", to.x);
            l.setAttribute("y2", to.y);
            g.appendChild(l);

            const p = document.createElementNS(SVG_NS, "circle");
            p.setAttribute("cx", to.x);
            p.setAttribute("cy", to.y);
            p.setAttribute("r", "0.05");
            p.classList.add("editor-ghost-endpoint");
            g.appendChild(p);
        };

        if (this._refPoint) drawRay(this._refPoint);
        if (this._cursorPos) drawRay(this._cursorPos);

        if (this._copyMode && this._cursorPos) {
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

    _showPointPopup(e, stage, point) {
        this._removePointPopup();
        this._pointInputFocused = false;

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = stage === "center" ? "C:" : (stage === "ref1" ? "R1:" : "A°:");
        popup.appendChild(label);

        const isAngleStage = stage === "ref2";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.inputMode = "text";
        inp.className = "arc-radius-input";
        inp.style.width = "132px";
        if (isAngleStage) {
            inp.dataset.role = "angle";
            inp.placeholder = "deg";
            inp.value = point ? this._fmtPoint(this._currentAngle(point)) : "0";
        } else {
            inp.dataset.role = "point";
            inp.placeholder = "x y";
            inp.value = point ? `${this._fmtPoint(point.x)} ${this._fmtPoint(-point.y)}` : "";
        }
        popup.appendChild(inp);

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

        inp.addEventListener("focus", () => onFocus(inp));
        inp.addEventListener("blur", onBlur);

        inp.addEventListener("keydown", (ev) => {
            ev.stopPropagation();
            if (ev.key === "Tab") {
                ev.preventDefault();
                ev.target.blur();
                return;
            }
            if (ev.key === "Enter") {
                this._commitPopupInput();
                return;
            }
            if (ev.key === "Escape") {
                if (this._mode === "pick-to") this._restoreOrigins();
                this._rollbackToSelection();
            }
        });
    }

    _commitPopupInput() {
        const inpPoint = this._pointPopup?.querySelector('input[data-role="point"]');
        const inpAngle = this._pointPopup?.querySelector('input[data-role="angle"]');
        const hint = this._pointPopup?.querySelector(".arc-radius-hint");
        if (!inpPoint && !inpAngle) return;

        const inp = inpPoint ?? inpAngle;
        const rawValue = String(inp?.value ?? "").trim();

        const showError = (msg) => {
            inp.classList.add("arc-radius-error");
            setTimeout(() => {
                inp.classList.remove("arc-radius-error");
            }, 2000);
            if (hint) hint.textContent = msg;
        };

        if (this._mode === "pick-to") {
            if (!rawValue) {
                showError("Enter angle in degrees");
                return;
            }
            const angle = evaluateTokenWithVars(rawValue, this.ctx.state.variableValues ?? {}, Number.NaN);
            if (!Number.isFinite(angle)) {
                showError("Invalid angle expression");
                return;
            }
            const toPoint = this._pointByAngle(angle);
            if (!toPoint) {
                showError("Rotation reference is not set");
                return;
            }
            this._cursorPos = toPoint;
            commitStagedTransformTarget({
                copyMode: this._copyMode,
                targetPoint: toPoint,
                applyPreview: (point) => this._applyPreviewTo(point),
                commit: (args) => this._commitRotate(args),
                refreshPreview: () => {
                    if (this._cursorPos) this._applyPreviewTo(this._cursorPos);
                    this._updateRotateGhost();
                },
                finishCommand: () => this._rollbackToSelection(),
            });
            return;
        }

        const tokens = rawValue.split(/[\s,]+/).filter(Boolean);
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
        if (this._mode === "pick-center") {
            this._setCenter(pt, null);
            this._updatePointPopupValues(pt);
            return;
        }
        if (this._mode === "pick-ref") {
            this._setRefPoint(pt, null);
            this._updatePointPopupValues(pt);
        }
    }

    _updatePointPopupValues(point) {
        if (!this._pointPopup || this._pointInputFocused || !point) return;
        const inpPoint = this._pointPopup.querySelector('input[data-role="point"]');
        if (inpPoint) inpPoint.value = `${this._fmtPoint(point.x)} ${this._fmtPoint(-point.y)}`;
        const inpAngle = this._pointPopup.querySelector('input[data-role="angle"]');
        if (inpAngle) inpAngle.value = this._fmtPoint(this._currentAngle(point));
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
}
