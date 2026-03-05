import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { computeBoxSelection, buildSelectionBoxGhost, resolveClickSelectionIds } from "./shared/selectionUtils.js";
import { rotatePoint, sumRtAngle, worldFromRaw } from "./shared/transformGeometry.js";

const log = LoggerFactory.createLogger("FlipTool");
const SVG_NS = "http://www.w3.org/2000/svg";

function _clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function _reverseSegmentData(seg) {
    const data = _clone(seg?.data ?? {});
    if (seg?.type === "line") {
        return {
            ...data,
            start: _clone(seg.data.end),
            end: _clone(seg.data.start),
        };
    }
    if (seg?.type === "arc") {
        return {
            ...data,
            start: _clone(seg.data.end),
            end: _clone(seg.data.start),
            sweep: Number(seg?.data?.sweep ?? 0) ? 0 : 1,
        };
    }
    return data;
}

export default class FlipTool extends BaseTool {
    constructor() {
        super();
        this.id = "flip";
        this._phase = "selecting"; // selecting | preview

        this._downClient = null;
        this._downSvgPos = null;
        this._dragging = false;
        this._hoverSegId = null;

        this._selectedSegIds = [];
    }

    activate(ctx) {
        super.activate(ctx);
        this._phase = "selecting";
        this._selectedSegIds = [];
        log.debug("FlipTool active");
    }

    deactivate() {
        this._clearHover();
        this._endDrag();
        this._selectedSegIds = [];
        this._phase = "selecting";
        super.deactivate();
    }

    hasActiveCommand() {
        return true;
    }

    onPointerDown(_pos, e) {
        if (this._phase !== "selecting" || e.button !== 0) return;
        const rawPos = this.ctx.canvas.screenToSVG(e);
        this._downClient = { x: e.clientX, y: e.clientY };
        this._downSvgPos = rawPos;
        this._dragging = false;
    }

    onPointerMove(_pos, e) {
        if (this._phase !== "selecting") return;
        const rawPos = this.ctx.canvas.screenToSVG(e);

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
            const selectParts = !!e.shiftKey && !!(e.ctrlKey || e.metaKey);
            const ignoreGroups = !!e.shiftKey && !(e.ctrlKey || e.metaKey);
            this._applyBoxSelection(downSvg, rawEnd, { selectParts, ignoreGroups });
            return;
        }

        const hitId = this.ctx.canvas.hitTest(rawEnd);
        if (hitId) {
            const selectParts = !!e.shiftKey && !!(e.ctrlKey || e.metaKey);
            const ignoreGroups = !!e.shiftKey && !(e.ctrlKey || e.metaKey);
            const selectionIds = selectParts
                ? [hitId]
                : resolveClickSelectionIds(
                    hitId,
                    this.ctx.state.segments,
                    this.ctx.state.elementGroups ?? [],
                    { ignoreGroups },
                );
            if (e.shiftKey) {
                this._toggleSelectionIds(selectionIds);
            } else {
                this.ctx.state.setSelection(selectionIds);
            }
        } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            this.ctx.state.clearSelection();
        }
    }

    onConfirm(_pos, _e) {
        if (this._phase === "selecting") {
            const selected = [...this.ctx.state.selectedIds].filter((id) => {
                const seg = this._findSeg(id);
                return !!seg && String(seg?.linkType ?? "") !== "symmetry";
            });
            if (selected.length === 0) {
                this.ctx.canvas.clearGhost();
                return true;
            }
            this._selectedSegIds = selected;
            this._phase = "preview";
            this._renderDirectionGhost();
            return true;
        }

        if (this._phase === "preview") {
            this._commitFlip();
            this._rollbackToSelecting();
            return true;
        }

        return false;
    }

    onKeyDown(e) {
        if (e.key === "Escape" && this._phase === "preview") {
            this._rollbackToSelecting();
            return true;
        }
        return false;
    }

    onViewportChanged() {
        if (this._phase === "preview" && this._selectedSegIds.length > 0) {
            this._renderDirectionGhost();
        }
    }

    _commitFlip() {
        const state = this.ctx.state;
        const selected = new Set(this._selectedSegIds);

        const contourIds = new Set(
            state.segments
                .filter((seg) => selected.has(seg.id) && (seg.type === "line" || seg.type === "arc"))
                .map((seg) => Number(seg?.contourId))
                .filter(Number.isFinite),
        );

        const updates = [];
        for (const contourId of contourIds) {
            const contourSegs = state.segments.filter((seg) =>
                (seg.type === "line" || seg.type === "arc") && Number(seg?.contourId) === contourId,
            );
            if (contourSegs.length === 0) continue;
            const reversed = [...contourSegs].reverse();
            for (let i = 0; i < contourSegs.length; i++) {
                const target = contourSegs[i];
                const source = reversed[i];
                updates.push({
                    id: target.id,
                    changes: {
                        type: source.type,
                        data: _reverseSegmentData(source),
                        transforms: _clone(Array.isArray(source.transforms) ? source.transforms : []),
                        cmdHint: source.cmdHint,
                    },
                });
            }
        }

        if (updates.length === 0) return;
        state.updateSegments(updates);
        state._pushHistory("Flip");
    }

    _renderDirectionGhost() {
        const vars = this.ctx.state.variableValues ?? {};
        const selected = new Set(this._selectedSegIds);
        const zoom = this.ctx.canvas?.cm?.zoomLevel || 1;
        // Scale arrow size with zoom (larger on zoom-in, smaller on zoom-out)
        // while keeping bounds so arrows stay readable.
        const arrowSize = Math.max(0.24, Math.min(1.1, 0.24 * Math.pow(zoom, 0.55)));
        const tangentDelta = Math.max(0.01, arrowSize * 0.45);

        const g = document.createElementNS(SVG_NS, "g");
        g.classList.add("editor-flip-preview");

        const addArrow = (at, vec) => {
            const len = Math.hypot(vec.x, vec.y);
            if (len < 1e-6) return;
            const ux = vec.x / len;
            const uy = vec.y / len;
            const half = arrowSize * 0.5;
            const head = arrowSize * 0.35;
            const side = arrowSize * 0.22;

            const tailPt = { x: at.x - ux * half, y: at.y - uy * half };
            const tipPt = { x: at.x + ux * half, y: at.y + uy * half };
            const left = {
                x: tipPt.x - ux * head + -uy * side,
                y: tipPt.y - uy * head + ux * side,
            };
            const right = {
                x: tipPt.x - ux * head - -uy * side,
                y: tipPt.y - uy * head - ux * side,
            };

            const shaft = document.createElementNS(SVG_NS, "line");
            shaft.setAttribute("x1", String(tailPt.x));
            shaft.setAttribute("y1", String(tailPt.y));
            shaft.setAttribute("x2", String(tipPt.x));
            shaft.setAttribute("y2", String(tipPt.y));
            shaft.setAttribute("stroke", "#1f6feb");
            shaft.setAttribute("stroke-width", "1.8");
            shaft.setAttribute("vector-effect", "non-scaling-stroke");
            shaft.setAttribute("pointer-events", "none");
            g.appendChild(shaft);

            const headPath = document.createElementNS(SVG_NS, "path");
            headPath.setAttribute("d", `M ${left.x} ${left.y} L ${tipPt.x} ${tipPt.y} L ${right.x} ${right.y}`);
            headPath.setAttribute("stroke", "#1f6feb");
            headPath.setAttribute("stroke-width", "1.8");
            headPath.setAttribute("fill", "none");
            headPath.setAttribute("vector-effect", "non-scaling-stroke");
            headPath.setAttribute("pointer-events", "none");
            g.appendChild(headPath);
        };

        for (const seg of this.ctx.state.segments) {
            if (!selected.has(seg.id)) continue;
            if (seg.type !== "line" && seg.type !== "arc") continue;
            const rt = sumRtAngle(seg.transforms, vars);

            if (seg.type === "line") {
                const start = worldFromRaw(seg.data.start, rt);
                const end = worldFromRaw(seg.data.end, rt);
                const vec = { x: end.x - start.x, y: end.y - start.y };
                const mid = { x: (start.x + end.x) * 0.5, y: (start.y + end.y) * 0.5 };
                addArrow(start, vec);
                addArrow(mid, vec);
                addArrow(end, vec);
                continue;
            }

            const pathEl = document.createElementNS(SVG_NS, "path");
            pathEl.setAttribute(
                "d",
                `M ${seg.data.start.x} ${seg.data.start.y} A ${seg.data.radius} ${seg.data.radius} 0 ${seg.data.largeArc} ${seg.data.sweep} ${seg.data.end.x} ${seg.data.end.y}`,
            );
            const totalLen = pathEl.getTotalLength();
            if (!Number.isFinite(totalLen) || totalLen <= 1e-6) continue;
            const positions = [0, totalLen * 0.5, totalLen];
            for (const pos of positions) {
                const pA = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos - tangentDelta)));
                const pB = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos + tangentDelta)));
                const p = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos)));
                const pointW = worldFromRaw({ x: p.x, y: p.y }, rt);
                const vecW = rotatePoint({ x: pB.x - pA.x, y: pB.y - pA.y }, rt);
                addArrow(pointW, vecW);
            }
        }

        this.ctx.canvas.setGhost(g);
    }

    _rollbackToSelecting() {
        this._phase = "selecting";
        this._selectedSegIds = [];
        this.ctx.canvas.clearGhost();
    }

    _applyBoxSelection(start, end, { selectParts = false, ignoreGroups = false } = {}) {
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
        this.ctx.state.setSelection(result.ids);
        this.ctx.canvas.clearGhost();
    }

    _toggleSelectionIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return;
        const next = new Set(this.ctx.state.selectedIds);
        const allSelected = ids.every((id) => next.has(id));
        if (allSelected) ids.forEach((id) => next.delete(id));
        else ids.forEach((id) => next.add(id));
        this.ctx.state.setSelection([...next]);
    }

    _updateBoxGhost(start, end) {
        if (!start || !end) return;
        this.ctx.canvas.setGhost(buildSelectionBoxGhost(start, end, SVG_NS));
    }

    _findSeg(id) {
        return this.ctx.state.segments.find((s) => s.id === id) ?? null;
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

    _endDrag() {
        this._downClient = null;
        this._downSvgPos = null;
        this._dragging = false;
        if (this.ctx && this._phase === "selecting") this.ctx.canvas.clearGhost();
    }
}
