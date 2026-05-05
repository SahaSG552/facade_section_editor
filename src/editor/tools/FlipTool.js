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

/**
 * FlipTool provides a staged workflow to reverse the direction of path contours.
 * 
 * Flow:
 * 1. Selecting: Choose segments/contours/groups.
 * 2. Confirm (RMB): Enter preview mode to see direction arrows.
 * 3. Confirm (RMB): Execute reverse and exit.
 */
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

    /** @override */
    activate(ctx) {
        super.activate(ctx);
        this._phase = "selecting";
        this._selectedSegIds = [];
        log.debug("FlipTool active");
    }

    /** @override */
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

    /**
     * Handles staged confirmation logic (Selecting -> Preview -> Commit).
     */
    onConfirm(_pos, _e) {
        if (this._phase === "selecting") {
            const selected = [...this.ctx.state.selectedIds].filter((id) => {
                const seg = this._findSeg(id);
                if (!seg || String(seg?.linkType ?? "") === "symmetry") return false;
                // Allow lines, arcs, and shapes (circle, rect, ellipse)
                return seg.type === "line" || seg.type === "arc" || 
                       seg.type === "circle" || seg.type === "rect" || seg.type === "ellipse";
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

    /**
     * Executes the actual reversal of all segments in the contours
     * associated with the current selection, and flips shape directions.
     * @private
     */
    _commitFlip() {
        const state = this.ctx.state;
        const selected = new Set(this._selectedSegIds);
        const updates = [];

        // Flip contours (lines and arcs)
        this._flipContours(state, selected, updates);

        // Flip shapes (circle, rect, ellipse)
        this._flipShapes(state, selected, updates);

        if (updates.length === 0) return;
        state.updateSegments(updates);
        state._pushHistory("Flip");
    }

    /**
     * Flip direction of contours by reversing segment order.
     * @param {object} state - EditorStateManager instance
     * @param {Set<string>} selected - Set of selected segment IDs
     * @param {Array<object>} updates - Array to append segment updates
     * @private
     */
    _flipContours(state, selected, updates) {
        const contourIds = new Set(
            state.segments
                .filter((seg) => selected.has(seg.id) && (seg.type === "line" || seg.type === "arc"))
                .map((seg) => Number(seg?.contourId))
                .filter(Number.isFinite),
        );

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
    }

    /**
     * Flip direction of shapes (circle, rect, ellipse).
     * @param {object} state - EditorStateManager instance
     * @param {Set<string>} selected - Set of selected segment IDs
     * @param {Array<object>} updates - Array to append segment updates
     * @private
     */
    _flipShapes(state, selected, updates) {
        for (const seg of state.segments) {
            if (!selected.has(seg.id)) continue;
            
            if (seg.type === "circle" || seg.type === "ellipse") {
                // Toggle flip direction flag for circular shapes
                updates.push({
                    id: seg.id,
                    changes: {
                        data: {
                            ...seg.data,
                            _flipDirection: !(seg.data?._flipDirection ?? false),
                        },
                    },
                });
            } else if (seg.type === "rect") {
                // Flip rect by inverting direction flags and adjusting origin
                const data = { ...seg.data };
                const oldDirW = data.dirW ?? 1;
                const oldDirH = data.dirH ?? -1;
                const w = data.w ?? 0;
                const h = data.h ?? 0;
                
                // Calculate opposite corner (new origin after flip)
                const x2 = data.x + oldDirW * w;
                const y2 = data.y + oldDirH * h;
                
                // Invert directions and update origin
                data.dirW = -oldDirW;
                data.dirH = -oldDirH;
                data.x = x2;
                data.y = y2;
                
                updates.push({
                    id: seg.id,
                    changes: { data },
                });
            }
        }
    }

    /**
     * Renders zoom-aware direction arrows for the selected segments.
     * Arrows scale with zoom and are distributed evenly along segments.
     * @private
     */
    _renderDirectionGhost() {
        const vars = this.ctx.state.variableValues ?? {};
        const selected = new Set(this._selectedSegIds);
        const zoom = this.ctx.canvas?.cm?.zoomLevel || 1;
        
        // Arrow sizing and spacing (screen-space constants)
        const arrowSize = Math.max(0.2, Math.min(8.0, 15 / zoom));
        const tangentDelta = Math.max(0.001, arrowSize * 0.2);
        const arrowSpacing = 50 / zoom; // 50px on screen

        const g = document.createElementNS(SVG_NS, "g");
        g.classList.add("editor-flip-preview");

        /**
         * Add a direction arrow at the given position.
         * @param {{x:number, y:number}} at - Arrow position
         * @param {{x:number, y:number}} vec - Direction vector
         */
        const addArrow = (at, vec) => {
            const len = Math.hypot(vec.x, vec.y);
            if (len < 1e-6) return;
            
            const ux = vec.x / len;
            const uy = vec.y / len;
            const half = arrowSize * 0.5;
            const head = arrowSize * 0.4;
            const side = arrowSize * 0.25;

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

            // Arrow shaft
            const shaft = document.createElementNS(SVG_NS, "line");
            shaft.setAttribute("x1", String(tailPt.x));
            shaft.setAttribute("y1", String(tailPt.y));
            shaft.setAttribute("x2", String(tipPt.x));
            shaft.setAttribute("y2", String(tipPt.y));
            shaft.setAttribute("stroke", "#eb1f3e");
            shaft.setAttribute("stroke-width", "2.2");
            shaft.setAttribute("vector-effect", "non-scaling-stroke");
            shaft.setAttribute("pointer-events", "none");
            g.appendChild(shaft);

            // Arrow head
            const headPath = document.createElementNS(SVG_NS, "path");
            headPath.setAttribute("d", `M ${left.x} ${left.y} L ${tipPt.x} ${tipPt.y} L ${right.x} ${right.y}`);
            headPath.setAttribute("stroke", "#eb1f3e");
            headPath.setAttribute("stroke-width", "2.2");
            headPath.setAttribute("fill", "none");
            headPath.setAttribute("vector-effect", "non-scaling-stroke");
            headPath.setAttribute("pointer-events", "none");
            g.appendChild(headPath);
        };

        for (const seg of this.ctx.state.segments) {
            if (!selected.has(seg.id)) continue;
            const rt = sumRtAngle(seg.transforms, vars);

            if (seg.type === "line") {
                this._renderLineArrows(seg, rt, arrowSpacing, addArrow);
            } else if (seg.type === "arc") {
                this._renderArcArrows(seg, rt, arrowSpacing, tangentDelta, addArrow);
            } else if (seg.type === "circle") {
                this._renderCircleArrows(seg, rt, arrowSpacing, addArrow);
            } else if (seg.type === "rect") {
                this._renderRectArrows(seg, rt, arrowSpacing, tangentDelta, addArrow);
            } else if (seg.type === "ellipse") {
                this._renderEllipseArrows(seg, rt, arrowSpacing, addArrow);
            }
        }

        this.ctx.canvas.setGhost(g);
    }

    /**
     * Render direction arrows for a line segment.
     * @param {object} seg - Line segment
     * @param {object} rt - Rotation/translation transform
     * @param {number} arrowSpacing - Spacing between arrows in SVG units
     * @param {Function} addArrow - Arrow rendering callback
     * @private
     */
    _renderLineArrows(seg, rt, arrowSpacing, addArrow) {
        const start = worldFromRaw(seg.data.start, rt);
        const end = worldFromRaw(seg.data.end, rt);
        const vec = { x: end.x - start.x, y: end.y - start.y };
        const segLength = Math.hypot(vec.x, vec.y);
        
        const numArrows = Math.max(1, Math.floor(segLength / arrowSpacing));
        
        for (let i = 0; i <= numArrows; i++) {
            const t = numArrows > 0 ? i / numArrows : 0.5;
            const pos = {
                x: start.x + vec.x * t,
                y: start.y + vec.y * t
            };
            addArrow(pos, vec);
        }
    }

    /**
     * Render direction arrows for an arc segment.
     * @param {object} seg - Arc segment
     * @param {object} rt - Rotation/translation transform
     * @param {number} arrowSpacing - Spacing between arrows in SVG units
     * @param {number} tangentDelta - Delta for tangent calculation
     * @param {Function} addArrow - Arrow rendering callback
     * @private
     */
    _renderArcArrows(seg, rt, arrowSpacing, tangentDelta, addArrow) {
        const pathEl = document.createElementNS(SVG_NS, "path");
        pathEl.setAttribute(
            "d",
            `M ${seg.data.start.x} ${seg.data.start.y} A ${seg.data.radius} ${seg.data.radius} 0 ${seg.data.largeArc} ${seg.data.sweep} ${seg.data.end.x} ${seg.data.end.y}`,
        );
        const totalLen = pathEl.getTotalLength();
        if (!Number.isFinite(totalLen) || totalLen <= 1e-6) return;
        
        const numArrows = Math.max(1, Math.floor(totalLen / arrowSpacing));
        
        for (let i = 0; i <= numArrows; i++) {
            const t = numArrows > 0 ? i / numArrows : 0.5;
            const pos = t * totalLen;
            
            const pA = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos - tangentDelta)));
            const pB = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos + tangentDelta)));
            const p = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos)));
            const pointW = worldFromRaw({ x: p.x, y: p.y }, rt);
            const vecW = rotatePoint({ x: pB.x - pA.x, y: pB.y - pA.y }, rt);
            addArrow(pointW, vecW);
        }
    }

    /**
     * Render direction arrows for a circle shape.
     * @param {object} seg - Circle segment
     * @param {object} rt - Rotation/translation transform
     * @param {number} arrowSpacing - Spacing between arrows in SVG units
     * @param {Function} addArrow - Arrow rendering callback
     * @private
     */
    _renderCircleArrows(seg, rt, arrowSpacing, addArrow) {
        const center = seg.data?.center;
        const radius = Number(seg.data?.radius ?? 0);
        if (!center || !Number.isFinite(radius) || radius <= 0) return;
        
        const circumference = 2 * Math.PI * radius;
        const numArrows = Math.max(3, Math.floor(circumference / arrowSpacing));
        const isFlipped = seg.data?._flipDirection ?? false;
        const angleStep = (2 * Math.PI) / numArrows;
        
        for (let i = 0; i < numArrows; i++) {
            const angle = i * angleStep;
            const pos = {
                x: center.x + radius * Math.cos(angle),
                y: center.y + radius * Math.sin(angle)
            };
            // Tangent vector (perpendicular to radius)
            const vec = isFlipped 
                ? { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) }
                : { x: -radius * Math.sin(angle), y: radius * Math.cos(angle) };
            const posW = worldFromRaw(pos, rt);
            const vecW = rotatePoint(vec, rt);
            addArrow(posW, vecW);
        }
    }

    /**
     * Render direction arrows for a rectangle shape.
     * @param {object} seg - Rectangle segment
     * @param {object} rt - Rotation/translation transform
     * @param {number} arrowSpacing - Spacing between arrows in SVG units
     * @param {number} tangentDelta - Delta for tangent calculation
     * @param {Function} addArrow - Arrow rendering callback
     * @private
     */
    _renderRectArrows(seg, rt, arrowSpacing, tangentDelta, addArrow) {
        const { x, y, w, h, rx: rx0 = 0 } = seg.data ?? {};
        if (![x, y, w, h].every(Number.isFinite)) return;
        
        const dirW = Number(seg.data?.dirW) < 0 ? -1 : 1;
        const hasDirH = Object.prototype.hasOwnProperty.call(seg.data ?? {}, 'dirH');
        const dirH = hasDirH ? (Number(seg.data?.dirH) < 0 ? -1 : 1) : -1;
        const x1 = Number(x);
        const y1 = Number(y);
        const x2 = x1 + dirW * Number(w);
        const y2 = y1 + dirH * Number(h);
        const rx = Math.max(0, Math.min(Number(rx0), Math.abs(Number(w)) / 2, Math.abs(Number(h)) / 2));

        // Calculate perimeter
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        const perimeter = rx > 1e-9 
            ? 2 * (width + height) - 8 * rx + 2 * Math.PI * rx
            : 2 * (width + height);
        
        const numArrows = Math.max(4, Math.floor(perimeter / arrowSpacing));
        
        // Create rect path
        const pathEl = document.createElementNS(SVG_NS, "path");
        if (rx <= 1e-9) {
            pathEl.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`);
        } else {
            const sW = x2 >= x1 ? 1 : -1;
            const sH = y2 >= y1 ? 1 : -1;
            pathEl.setAttribute("d", 
                `M ${x1 + sW * rx} ${y1} ` +
                `L ${x2 - sW * rx} ${y1} ` +
                `A ${rx} ${rx} 0 0 ${sW * sH > 0 ? 1 : 0} ${x2} ${y1 + sH * rx} ` +
                `L ${x2} ${y2 - sH * rx} ` +
                `A ${rx} ${rx} 0 0 ${sW * sH > 0 ? 1 : 0} ${x2 - sW * rx} ${y2} ` +
                `L ${x1 + sW * rx} ${y2} ` +
                `A ${rx} ${rx} 0 0 ${sW * sH > 0 ? 1 : 0} ${x1} ${y2 - sH * rx} ` +
                `L ${x1} ${y1 + sH * rx} ` +
                `A ${rx} ${rx} 0 0 ${sW * sH > 0 ? 1 : 0} ${x1 + sW * rx} ${y1} Z`
            );
        }
        
        const totalLen = pathEl.getTotalLength();
        if (!Number.isFinite(totalLen) || totalLen <= 1e-6) return;
        
        for (let i = 0; i < numArrows; i++) {
            const t = i / numArrows;
            const pos = t * totalLen;
            
            const pA = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos - tangentDelta)));
            const pB = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos + tangentDelta)));
            const p = pathEl.getPointAtLength(Math.max(0, Math.min(totalLen, pos)));
            const pointW = worldFromRaw({ x: p.x, y: p.y }, rt);
            const vecW = rotatePoint({ x: pB.x - pA.x, y: pB.y - pA.y }, rt);
            addArrow(pointW, vecW);
        }
    }

    /**
     * Render direction arrows for an ellipse shape.
     * @param {object} seg - Ellipse segment
     * @param {object} rt - Rotation/translation transform
     * @param {number} arrowSpacing - Spacing between arrows in SVG units
     * @param {Function} addArrow - Arrow rendering callback
     * @private
     */
    _renderEllipseArrows(seg, rt, arrowSpacing, addArrow) {
        const { cx, cy, rx, ry } = seg.data ?? {};
        if (![cx, cy, rx, ry].every(Number.isFinite) || rx <= 0 || ry <= 0) return;
        
        // Approximate ellipse perimeter using Ramanujan's formula
        const h = Math.pow((rx - ry) / (rx + ry), 2);
        const perimeter = Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
        const numArrows = Math.max(3, Math.floor(perimeter / arrowSpacing));
        
        const isFlipped = seg.data?._flipDirection ?? false;
        const angleStep = (2 * Math.PI) / numArrows;
        
        for (let i = 0; i < numArrows; i++) {
            const angle = i * angleStep;
            const pos = {
                x: cx + rx * Math.cos(angle),
                y: cy + ry * Math.sin(angle)
            };
            // Tangent vector for ellipse
            const vec = isFlipped
                ? { x: rx * Math.sin(angle), y: -ry * Math.cos(angle) }
                : { x: -rx * Math.sin(angle), y: ry * Math.cos(angle) };
            const posW = worldFromRaw(pos, rt);
            const vecW = rotatePoint(vec, rt);
            addArrow(posW, vecW);
        }
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
