import LoggerFactory from "../../core/LoggerFactory.js";
import BaseTool from "./BaseTool.js";
import { evalAngle } from "../transforms/TransformCommands.js";
import { evaluateTokenWithVars } from "../../utils/formulaPolicy.js";
import { getRectGeomLocal } from "../geometry/rectGeometry.js";
import { computeBoxSelection, buildSelectionBoxGhost, resolveClickSelectionIds } from "./shared/selectionUtils.js";
import { collectSegmentSnapshots, commitCopiedSnapshots, materializeCopiedSegments } from "./shared/copyPreviewUtils.js";

const log = LoggerFactory.createLogger("MirrorTool");
const SVG_NS = "http://www.w3.org/2000/svg";

function _clone(value) {
    return JSON.parse(JSON.stringify(value));
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
    const list = Array.isArray(transforms)
        ? transforms.map(t => ({ ...t, params: Array.isArray(t.params) ? [...t.params] : [] }))
        : [];
    const token = String(parseFloat(nextAngle.toFixed(6)));
    const idx = list.findIndex(t => String(t?.type ?? "").toUpperCase() === "RT");
    if (idx >= 0) {
        list[idx] = { ...list[idx], raw: `MOD RT ${token}`, params: [token] };
        return list;
    }
    list.push({ type: "RT", raw: `MOD RT ${token}`, params: [token] });
    return list;
}

function _rotatePoint(p, angleDeg) {
    const r = angleDeg * Math.PI / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function _mirrorPoint(p, A, B) {
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-12) return { x: p.x, y: p.y };
    const t = ((p.x - A.x) * dx + (p.y - A.y) * dy) / lenSq;
    const footX = A.x + t * dx;
    const footY = A.y + t * dy;
    return { x: 2 * footX - p.x, y: 2 * footY - p.y };
}

function _axisAngleDeg(A, B) {
    return Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI;
}

function _dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function _worldFromRaw(rawPoint, rtAngle) {
    if (Math.abs(rtAngle) < 1e-9) return { x: rawPoint.x, y: rawPoint.y };
    return _rotatePoint(rawPoint, rtAngle);
}

function _rawFromWorld(worldPoint, rtAngle) {
    if (Math.abs(rtAngle) < 1e-9) return { x: worldPoint.x, y: worldPoint.y };
    return _rotatePoint(worldPoint, -rtAngle);
}

class MirrorTool extends BaseTool {
    /**
     * @param {"mirror"|"symmetry"} [mode="mirror"]
     */
    constructor(mode = "mirror") {
        super();
        this.id = mode;
        this._modeType = mode;

        this._phase = "selecting"; // selecting | pick-axis-start | pick-axis-end

        this._downClient = null;
        this._downSvgPos = null;
        this._dragging = false;
        this._hoverSegId = null;
        this._selectedRectSides = new Map();

        this._axisStart = null;
        this._axisEnd = null;

        this._sourceSegIds = [];
        this._sourceSnapshots = [];

        this._copyMode = mode === "symmetry";

        this._pointPopup = null;
        this._pointInputFocused = false;
    }

    activate(ctx) {
        super.activate(ctx);
        this._phase = "selecting";
        this._axisStart = null;
        this._axisEnd = null;
        this._sourceSegIds = [];
        this._sourceSnapshots = [];
        this._copyMode = this._modeType === "symmetry";
        log.debug(`MirrorTool(${this._modeType}) active`);
    }

    deactivate() {
        this._restoreSourceSegments();
        this._clearHover();
        this._endDrag();
        this._clearRectSideSelection();
        this._removePointPopup();
        this._axisStart = null;
        this._axisEnd = null;
        this._sourceSegIds = [];
        this._sourceSnapshots = [];
        super.deactivate();
    }

    hasActiveCommand() {
        return true;
    }

    onPointerDown(pos, e) {
        if (e.button !== 0) return;

        if (this._phase === "pick-axis-start") {
            this._setAxisStart(pos, e);
            return;
        }

        if (this._phase === "pick-axis-end") {
            if (this._modeType === "mirror") this._copyMode = !!e.ctrlKey;
            this._setAxisEndAndCommit(pos, {
                keepCommandOpen: this._modeType === "mirror" && this._copyMode,
            });
            return;
        }

        const rawPos = this.ctx.canvas.screenToSVG(e);
        this._downClient = { x: e.clientX, y: e.clientY };
        this._downSvgPos = rawPos;
        this._dragging = false;
    }

    onPointerMove(pos, e) {
        const rawPos = this.ctx.canvas.screenToSVG(e);

        if (this._phase === "pick-axis-end") {
            if (this._modeType === "mirror") {
                const nextCopy = !!e.ctrlKey;
                if (nextCopy !== this._copyMode) {
                    this._copyMode = nextCopy;
                    if (this._copyMode) this._restoreSourceSegments();
                }
            }
            this._axisEnd = { x: pos.x, y: pos.y };
            if (!this._copyMode && this._modeType === "mirror") {
                this._applyNonCopyPreview();
            }
            this._renderGhost();
            this._updatePointPopupValues(pos);
            this._positionPointPopup(e);
            return;
        }

        if (this._phase === "pick-axis-start") {
            this._updatePointPopupValues(pos);
            this._positionPointPopup(e);
            this._updateHover(rawPos);
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

    onPointerUp(_pos, e) {
        if (this._phase !== "selecting" || !this._downSvgPos) return;

        const rawEnd = this.ctx.canvas.screenToSVG(e);
        const downSvg = this._downSvgPos;
        const wasDrag = this._dragging;
        this._endDrag();

        if (wasDrag) {
            const selectParts = this._modeType === "symmetry"
                ? false
                : (!!e.shiftKey && !!(e.ctrlKey || e.metaKey));
            const ignoreGroups = !!e.shiftKey && !(e.ctrlKey || e.metaKey);
            this.ctx.state._selectionInsideGroupMode = false;
            this._applyBoxSelection(downSvg, rawEnd, { selectParts, ignoreGroups });
            return;
        }

        if (e.shiftKey && (e.ctrlKey || e.metaKey) && this._modeType !== "symmetry") {
            const sideHit = this.ctx.canvas.hitTestRectSide(rawEnd);
            if (sideHit?.axis && sideHit.axis !== "rx") {
                this._toggleRectSideSelection(sideHit);
                return;
            }
        }

        const hitId = this.ctx.canvas.hitTest(rawEnd);
        if (hitId) {
            const selectParts = this._modeType === "symmetry"
                ? false
                : (!!e.shiftKey && !!(e.ctrlKey || e.metaKey));
            const ignoreGroups = !!e.shiftKey && !(e.ctrlKey || e.metaKey);
            const selectionIds = selectParts
                ? [hitId]
                : resolveClickSelectionIds(
                    hitId,
                    this.ctx.state.segments,
                    this.ctx.state.elementGroups ?? [],
                    { ignoreGroups },
                );
            if (this._modeType === "symmetry") {
                this.ctx.state._selectionInsideGroupMode = false;
                this._setSingleChainSelection(selectionIds[0] ?? hitId);
            } else if (e.shiftKey) {
                this.ctx.state._selectionInsideGroupMode = false;
                this._toggleSelectionIds(selectionIds);
            } else {
                this.ctx.state._selectionInsideGroupMode = false;
                this._clearRectSideSelection();
                this.ctx.state.setSelection(selectionIds);
            }
        } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            this.ctx.state._selectionInsideGroupMode = false;
            this._clearRectSideSelection();
            this.ctx.state.clearSelection();
        }
    }

    onConfirm(pos, e) {
        if (this._phase === "selecting") {
            if (this.ctx.state.selectedIds.size === 0) {
                this.ctx.canvas.clearGhost();
                return true;
            }
            this._captureSourceSelection();
            this._phase = "pick-axis-start";
            this._axisStart = null;
            this._axisEnd = pos ? { x: pos.x, y: pos.y } : null;
            this._showPointPopup(e, "p1", pos ?? null);
            return true;
        }

        if (this._phase === "pick-axis-start") {
            this._rollbackToSelection();
            return true;
        }

        if (this._phase === "pick-axis-end") {
            this._rollbackToSelection();
            return true;
        }

        return false;
    }

    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._phase !== "selecting") {
                this._rollbackToSelection();
                return true;
            }
        }

        if (this._phase === "pick-axis-end" && e.key === "Control" && this._modeType === "mirror") {
            if (!this._copyMode) {
                this._copyMode = true;
                this._restoreSourceSegments();
                this._renderGhost();
            }
            return true;
        }

        if ((this._phase === "pick-axis-start" || this._phase === "pick-axis-end") && !this._pointInputFocused) {
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
        if (this._phase === "pick-axis-end" && e.key === "Control" && this._modeType === "mirror") {
            if (this._copyMode) {
                this._copyMode = false;
                this._applyNonCopyPreview();
                this._renderGhost();
            }
            return true;
        }
        return false;
    }

    _setAxisStart(point, e) {
        if (!point) return;
        this._axisStart = { x: point.x, y: point.y };
        this._axisEnd = { x: point.x, y: point.y };
        this._phase = "pick-axis-end";
        this._showPointPopup(e, "p2", point);
        this._renderGhost();
    }

    _setAxisEndAndCommit(point, { keepCommandOpen = false } = {}) {
        if (!point) return;
        this._axisEnd = { x: point.x, y: point.y };
        if (!this._copyMode && this._modeType === "mirror") {
            this._applyNonCopyPreview();
        }
        this._renderGhost();
        const committed = this._commitMirror();
        if (committed && keepCommandOpen) {
            this._phase = "pick-axis-end";
            this._restoreSourceSegments();
            this._renderGhost();
            return;
        }
        this._rollbackToSelection({ restoreSources: !committed });
    }

    _captureSourceSelection() {
        const selected = [...this.ctx.state.selectedIds];
        if (this._modeType === "symmetry" && selected.length > 0) {
            // Expand to include shapes embedded in selected contours.
            const selectedContourIds = new Set(
                selected
                    .map((id) => this.ctx.state.segments.find((s) => s.id === id)?.contourId)
                    .filter((cid) => Number.isFinite(Number(cid)))
                    .map((cid) => Number(cid))
            );
            for (const seg of this.ctx.state.segments) {
                const cid = Number(seg?.contourId);
                if (!selectedContourIds.has(cid)) continue;
                if (selected.includes(seg.id)) continue;
                if (seg.type === "circle" || seg.type === "rect" || seg.type === "ellipse") {
                    selected.push(seg.id);
                }
            }
        }
        this._sourceSegIds = selected;
        this._sourceSnapshots = collectSegmentSnapshots(this.ctx.state, this._sourceSegIds);
    }

    _getSourceBaseSegments() {
        return this._sourceSnapshots.map(seg => ({
            ...seg,
            selected: false,
            data: _clone(seg.data),
            transforms: _clone(Array.isArray(seg.transforms) ? seg.transforms : []),
        }));
    }

    _restoreSourceSegments() {
        if (this._sourceSnapshots.length === 0) return;
        const updates = this._sourceSnapshots.map(seg => ({
            id: seg.id,
            changes: {
                data: _clone(seg.data),
                transforms: _clone(Array.isArray(seg.transforms) ? seg.transforms : []),
            },
        }));
        if (updates.length > 0) this.ctx.state.updateSegments(updates);
    }

    _applyNonCopyPreview() {
        if (!this._axisStart || !this._axisEnd || this._sourceSnapshots.length === 0) return;
        const updates = [];
        for (const seg of this._getSourceBaseSegments()) {
            const mirrored = this._mirrorSegment(seg, this._axisStart, this._axisEnd);
            if (!mirrored) continue;
            updates.push({
                id: seg.id,
                changes: {
                    data: mirrored.data,
                    transforms: mirrored.transforms,
                },
            });
        }
        if (updates.length > 0) this.ctx.state.updateSegments(updates);
    }

    _commitMirror() {
        if (!this._axisStart || !this._axisEnd) return;
        const axisLen = Math.hypot(this._axisEnd.x - this._axisStart.x, this._axisEnd.y - this._axisStart.y);
        if (axisLen < 1e-8) return false;

        const sourceSegments = this._getSourceBaseSegments();
        if (sourceSegments.length === 0) return false;
        const sourceIds = sourceSegments.map(s => s.id);

        const keepOriginals = this._modeType === "symmetry" || this._copyMode;
        const state = this.ctx.state;

        const newSegments = [];

        for (const seg of sourceSegments) {
            const mirrored = this._mirrorSegment(seg, this._axisStart, this._axisEnd);
            if (!mirrored) continue;

            const newSeg = {
                ...seg,
                selected: false,
                data: mirrored.data,
                transforms: mirrored.transforms,
            };
            newSegments.push(newSeg);
        }

        if (keepOriginals) {
            const isSymmetryMode = this._modeType === "symmetry";

            let snapshots;
            if (isSymmetryMode) {
                if (!Array.isArray(state.elementGroups)) state.elementGroups = [];

                const axisObj = {
                    p1: { x: this._axisStart.x, y: this._axisStart.y },
                    p2: { x: this._axisEnd.x, y: this._axisEnd.y },
                };
                const srcGroupName = "Symmetry";

                // 1. Always create a new source group "Symmetry" for all selected segments.
                const srcGroupId = typeof state._allocateGroupId === 'function'
                    ? state._allocateGroupId()
                    : ((state.elementGroups.reduce((m, g) => Math.max(m, Number(g?.groupId) || 0), 0)) + 1);
                const srcGroupGuid = `grp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
                state.elementGroups = [...state.elementGroups, {
                    groupId: srcGroupId,
                    parentGroupId: null,
                    guid: srcGroupGuid,
                    name: srcGroupName,
                    linkType: null,
                    sourceGroupId: null,
                    sourceGroupGuid: null,
                    axis: null,
                }];

                // Move all source segments into the new source group.
                const sourceIdSet = new Set(this._sourceSegIds);
                state.segments = state.segments.map(s =>
                    sourceIdSet.has(s.id)
                        ? { ...s, groupId: srcGroupId, parentGroupId: srcGroupId }
                        : s
                );

                // 2. Create sym group linked to source group (name tracks source group name).
                const symGroupId = typeof state._allocateGroupId === 'function'
                    ? state._allocateGroupId()
                    : ((state.elementGroups.reduce((m, g) => Math.max(m, Number(g?.groupId) || 0), 0)) + 1);
                state.elementGroups = [...state.elementGroups, {
                    groupId: symGroupId,
                    parentGroupId: null,
                    guid: `sym-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                    name: srcGroupName,
                    linkType: 'symmetry',
                    sourceGroupId: srcGroupId,
                    sourceGroupGuid: srcGroupGuid,
                    axis: axisObj,
                }];

                // 3. Mirrored snapshots go into sym group, linked to their source contour.
                snapshots = newSegments.map((seg) => ({
                    ...seg,
                    linkType: "symmetry",
                    parentContourId: Number.isFinite(Number(seg?.contourId)) ? Number(seg.contourId) : null,
                    axis: axisObj,
                    groupId: symGroupId,
                    parentGroupId: symGroupId,
                }));
            } else {
                snapshots = newSegments;
            }

            return commitCopiedSnapshots({
                state,
                snapshots,
                historyLabel: keepOriginals
                    ? (this._modeType === "symmetry" ? "Symmetry" : "Mirror Copy")
                    : "Mirror",
                keepSourceSelection: this._modeType === "mirror" && keepOriginals,
                sourceIds: this._sourceSegIds,
            });
        } else {
            const createdSegments = materializeCopiedSegments(state, newSegments);
            if (createdSegments.length === 0) return false;
            const drop = new Set(sourceIds);
            state.segments = [...state.segments.filter(s => !drop.has(s.id)), ...createdSegments];
            state.insertAfterSegId = createdSegments[createdSegments.length - 1].id;
            state._pushHistory("Mirror");
            state._notifySegments();
            state.setSelection(createdSegments.map(s => s.id));
            return true;
        }
    }

    _mirrorSegment(seg, axisStart, axisEnd) {
        const vars = this.ctx.state.variableValues ?? {};
        const data = _clone(seg.data ?? {});
        const transforms = _clone(Array.isArray(seg.transforms) ? seg.transforms : []);

        const rt0 = _sumRtAngle(transforms, vars);

        const mirrorRawPointKeepRt = (rawPoint) => {
            const world = _worldFromRaw(rawPoint, rt0);
            const mirroredWorld = _mirrorPoint(world, axisStart, axisEnd);
            return _rawFromWorld(mirroredWorld, rt0);
        };

        const mirrorRawPointWithRt = (rawPoint, nextRt) => {
            const world = _worldFromRaw(rawPoint, rt0);
            const mirroredWorld = _mirrorPoint(world, axisStart, axisEnd);
            return _rawFromWorld(mirroredWorld, nextRt);
        };

        if (seg.type === "line") {
            data.start = mirrorRawPointKeepRt(data.start);
            data.end = mirrorRawPointKeepRt(data.end);
            delete data._expr;
            return { data, transforms };
        }

        if (seg.type === "arc") {
            data.start = mirrorRawPointKeepRt(data.start);
            data.end = mirrorRawPointKeepRt(data.end);
            if (data.center) data.center = mirrorRawPointKeepRt(data.center);
            if (data.pt3) data.pt3 = mirrorRawPointKeepRt(data.pt3);
            if (typeof data.sweep === "number") data.sweep = 1 - data.sweep;
            delete data._expr;
            return { data, transforms };
        }

        if (seg.type === "circle") {
            data.center = mirrorRawPointKeepRt(data.center);
            delete data._expr;
            return { data, transforms };
        }

        if (seg.type === "rect") {
            const g = getRectGeomLocal(data);
            const p00 = _mirrorPoint(_worldFromRaw({ x: g.xStart, y: g.yStart }, rt0), axisStart, axisEnd);
            const p10 = _mirrorPoint(_worldFromRaw({ x: g.xOpp, y: g.yStart }, rt0), axisStart, axisEnd);
            const p01 = _mirrorPoint(_worldFromRaw({ x: g.xStart, y: g.yOpp }, rt0), axisStart, axisEnd);

            const widthVec = { x: p10.x - p00.x, y: p10.y - p00.y };
            const widthLen = Math.hypot(widthVec.x, widthVec.y);
            if (widthLen < 1e-9) return { data, transforms };

            const ux = { x: widthVec.x / widthLen, y: widthVec.y / widthLen };
            const uy = { x: -ux.y, y: ux.x };
            const heightVec = { x: p01.x - p00.x, y: p01.y - p00.y };

            const wSigned = _dot(widthVec, ux);
            const hSigned = _dot(heightVec, uy);

            const nextRt = Math.atan2(ux.y, ux.x) * 180 / Math.PI;
            const pRaw = _rawFromWorld(p00, nextRt);

            data.x = pRaw.x;
            data.y = pRaw.y;
            data.w = Math.abs(wSigned);
            data.h = Math.abs(hSigned);
            data.dirW = wSigned >= 0 ? 1 : -1;
            data.dirH = hSigned >= 0 ? 1 : -1;
            delete data._expr;
            return { data, transforms: _withRtAngle(transforms, nextRt) };
        }

        if (seg.type === "ellipse") {
            const axisAngle = _axisAngleDeg(axisStart, axisEnd);
            const nextRt = 2 * axisAngle - rt0;
            const p = mirrorRawPointWithRt({ x: data.cx, y: data.cy }, nextRt);
            data.cx = p.x;
            data.cy = p.y;
            delete data._expr;
            return { data, transforms: _withRtAngle(transforms, nextRt) };
        }

        return null;
    }

    _renderGhost() {
        if (!this._axisStart || !this._axisEnd) {
            this.ctx.canvas.clearGhost();
            return;
        }

        const g = document.createElementNS(SVG_NS, "g");

        const axis = document.createElementNS(SVG_NS, "line");
        axis.setAttribute("x1", this._axisStart.x);
        axis.setAttribute("y1", this._axisStart.y);
        axis.setAttribute("x2", this._axisEnd.x);
        axis.setAttribute("y2", this._axisEnd.y);
        axis.classList.add("editor-selection-box");
        g.appendChild(axis);

        if ((this._modeType === "symmetry" || this._copyMode) && this._phase === "pick-axis-end") {
            const plus = document.createElementNS(SVG_NS, "text");
            plus.setAttribute("x", this._axisEnd.x + 0.12);
            plus.setAttribute("y", this._axisEnd.y - 0.12);
            plus.setAttribute("font-size", "0.28");
            plus.textContent = "+";
            plus.classList.add("editor-selection-box");
            g.appendChild(plus);
        }

        if (this._modeType === "symmetry" || this._copyMode) {
            for (const seg of this._getSourceBaseSegments()) {
                if (!seg) continue;
                const path = this._buildGhostForSegment(seg, this._axisStart, this._axisEnd);
                if (!path) continue;
                g.appendChild(path);
            }
        }

        this.ctx.canvas.setGhost(g);
    }

    _buildGhostForSegment(seg, axisStart, axisEnd) {
        const mirrored = this._mirrorSegment(seg, axisStart, axisEnd);
        if (!mirrored) return null;
        const el = this.ctx.canvas._buildSegmentElement?.({
            ...seg,
            selected: false,
            data: mirrored.data,
            transforms: mirrored.transforms,
        });
        if (!el) return null;
        el.classList.add("editor-copy-preview");
        return el;
    }

    _rollbackToSelection({ restoreSources = true } = {}) {
        if (restoreSources) this._restoreSourceSegments();
        this._phase = "selecting";
        this._axisStart = null;
        this._axisEnd = null;
        this._sourceSegIds = [];
        this._sourceSnapshots = [];
        this._copyMode = this._modeType === "symmetry";
        this._removePointPopup();
        this.ctx.canvas.clearGhost();
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
        if (this._modeType === "symmetry") {
            this._setSingleChainSelection(ids[0]);
            return;
        }
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

    _applyBoxSelection(start, end, { selectParts = false, ignoreGroups = false } = {}) {
        this._clearRectSideSelection();
        const result = computeBoxSelection(this.ctx.state.segments, start, end, {
            selectParts,
            variableValues: this.ctx.state.variableValues ?? {},
            ...(selectParts || ignoreGroups
                ? {}
                : {
                    groupSelectionMode: true,
                    elementGroups: this.ctx.state.elementGroups ?? [],
                }),
        });

        if (this._modeType === "symmetry") {
            this._setSingleChainSelection(result.ids[0] ?? null);
            this.ctx.canvas.clearGhost();
            return;
        }

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

    _setSingleChainSelection(id) {
        if (!id) {
            this.ctx.state.clearSelection();
            this._clearRectSideSelection();
            return;
        }
        this._clearRectSideSelection();
        // Skip symmetry segments — they're read-only mirrors
        const seg = this._findSeg(id);
        if (String(seg?.linkType ?? '') === 'symmetry') return;
        const chainIds = this.ctx.state.getChain(id).map(s => s.id);
        this.ctx.state.setSelection(chainIds);
    }

    _updateBoxGhost(start, end) {
        if (!start || !end) return;
        this.ctx.canvas.setGhost(buildSelectionBoxGhost(start, end, SVG_NS));
    }

    _endDrag() {
        this._downClient = null;
        this._downSvgPos = null;
        this._dragging = false;
        if (this.ctx && this._phase === "selecting") this.ctx.canvas.clearGhost();
    }

    _findSeg(id) {
        return this.ctx.state.segments.find(s => s.id === id) ?? null;
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

    _showPointPopup(e, stage, point) {
        this._removePointPopup();
        this._pointInputFocused = false;

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = stage === "p1" ? "P1:" : "P2:";
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

        inpPoint.addEventListener("keydown", (ev) => {
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
                this._rollbackToSelection();
            }
        });
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
        if (this._phase === "pick-axis-start") {
            this._setAxisStart(pt, null);
            this._updatePointPopupValues(pt);
            return;
        }

        if (this._phase === "pick-axis-end") {
            this._setAxisEndAndCommit(pt, {
                keepCommandOpen: this._modeType === "mirror" && this._copyMode,
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
}

export default MirrorTool;
