import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { evaluateMathExpression } from "../../utils/utils.js";
import { VARIABLE_TOKEN_RE_GLOBAL } from "../../utils/variableTokens.js";
import {
    computeFilletForSegments,
    computeMaxFilletRadius,
    findFilletableCorners,
    filterCornersByMode,
    radiusFromCursor,
    toWorldSeg,
    toLocal,
} from "./shared/filletGeometry.js";
import { computeBoxSelection, buildSelectionBoxGhost, resolveClickSelectionIds } from "./shared/selectionUtils.js";

const log = LoggerFactory.createLogger("FilletTool");
const SVG_NS = "http://www.w3.org/2000/svg";

const CORNER_MODES = ["all", "convex", "concave"];
const CORNER_MODE_LABELS = { all: "All corners", convex: "Convex only", concave: "Concave only" };

// ─── Ghost builders ────────────────────────────────────────────────────────

/**
 * Build ghost SVG for a single fillet preview: arc + trimmed segment stubs.
 */
function _buildSingleFilletGhost(result, seg1FarEnd, seg2FarEnd) {
    const g = document.createElementNS(SVG_NS, "g");

    // Trimmed portion of seg1 (far end → arcStart)
    if (seg1FarEnd) {
        const l = document.createElementNS(SVG_NS, "line");
        l.setAttribute("x1", seg1FarEnd.x); l.setAttribute("y1", seg1FarEnd.y);
        l.setAttribute("x2", result.arcStart.x); l.setAttribute("y2", result.arcStart.y);
        l.classList.add("editor-fillet-preview-seg");
        l.setAttribute("vector-effect", "non-scaling-stroke");
        l.setAttribute("pointer-events", "none");
        g.appendChild(l);
    }
    // Trimmed portion of seg2 (arcEnd → far end)
    if (seg2FarEnd) {
        const l = document.createElementNS(SVG_NS, "line");
        l.setAttribute("x1", result.arcEnd.x); l.setAttribute("y1", result.arcEnd.y);
        l.setAttribute("x2", seg2FarEnd.x); l.setAttribute("y2", seg2FarEnd.y);
        l.classList.add("editor-fillet-preview-seg");
        l.setAttribute("vector-effect", "non-scaling-stroke");
        l.setAttribute("pointer-events", "none");
        g.appendChild(l);
    }

    // Fillet arc
    const arc = document.createElementNS(SVG_NS, "path");
    arc.setAttribute("d",
        `M ${result.arcStart.x} ${result.arcStart.y} A ${result.radius} ${result.radius} 0 ${result.largeArc} ${result.sweep} ${result.arcEnd.x} ${result.arcEnd.y}`
    );
    arc.setAttribute("fill", "none");
    arc.classList.add("editor-fillet-preview-arc");
    arc.setAttribute("vector-effect", "non-scaling-stroke");
    arc.setAttribute("pointer-events", "none");
    g.appendChild(arc);

    return g;
}

/**
 * Build ghost SVG for multiple fillet arcs (filletCorners mode).
 */
function _buildMultiFilletGhost(fillets) {
    const g = document.createElementNS(SVG_NS, "g");
    for (const { result } of fillets) {
        if (!result?.valid) continue;
        const arc = document.createElementNS(SVG_NS, "path");
        arc.setAttribute("d",
            `M ${result.arcStart.x} ${result.arcStart.y} A ${result.radius} ${result.radius} 0 ${result.largeArc} ${result.sweep} ${result.arcEnd.x} ${result.arcEnd.y}`
        );
        arc.setAttribute("fill", "none");
        arc.classList.add("editor-fillet-preview-arc");
        arc.setAttribute("vector-effect", "non-scaling-stroke");
        arc.setAttribute("pointer-events", "none");
        g.appendChild(arc);
    }
    return g;
}

/**
 * Convert world pt to segment-local coords (inverse RT).
 */
function _worldToLocal(worldPt, seg, vars) {
    return toLocal(worldPt, seg.transforms ?? [], vars);
}

// ─────────────────────────────────────────────────────────────────────────────

export default class FilletTool extends BaseTool {
    /** @param {'fillet'|'filletCorners'} [mode='fillet'] */
    constructor(mode = "fillet") {
        super();
        this.id = mode;
        this._mode = mode;

        /** @type {string} */
        this._phase = mode === "filletCorners" ? "selection" : "idle";

        /** @type {{x:number,y:number}|null} */
        this._cursorPos = null;
        /** @type {boolean} */
        this._inputFocused = false;
        /** @type {HTMLElement|null} */
        this._popup = null;
        /** @type {number} */
        this._radius = 5;

        // Single corner state
        /** @type {string|null} */ this._seg1Id = null;
        /** @type {string|null} */ this._seg2Id = null;
        /** @type {object|null} */ this._filletResult = null;
        /** @type {boolean} */     this._radiusLocked = false;

        // All corners state
        /** @type {string[]} */    this._selectedSegIds = [];
        /** @type {string} */      this._cornerMode = "all";
        /** @type {Array} */       this._activeFillets = [];
        /** @type {object|null} */ this._refCorner = null;

        // Box-select drag state
        /** @type {object|null} */ this._downClient = null;
        /** @type {object|null} */ this._downSvgPos = null;
        /** @type {boolean} */     this._dragging = false;
        /** @type {string|null} */ this._hoverSegId = null;
    }

    // ─── Lifecycle ─────────────────────────────────────────────────────────

    activate(ctx) { super.activate(ctx); this._reset(); log.debug("FilletTool activated, mode=", this._mode); }
    deactivate() { this._removePopup(); this._clearHover(); super.deactivate(); }
    hasActiveCommand() { return true; }

    // ─── Events ────────────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        if (e.button !== 0) return;
        if (this._mode === "fillet") this._filletDown(pos, e);
        else this._cornersDown(pos, e);
    }

    onPointerMove(pos, e) {
        this._cursorPos = pos;
        if (this._popup && e) this._positionPopup(e);
        if (this._mode === "fillet") this._filletMove(pos, e);
        else this._cornersMove(pos, e);
    }

    onPointerUp(pos, e) {
        if (this._mode === "filletCorners" && this._phase === "selection") this._selectionUp(pos, e);
    }

    onConfirm(_pos, _e) {
        if (this._mode === "fillet") return this._filletConfirm();
        else return this._cornersConfirm();
    }

    onKeyDown(e) {
        if (e.key === "Tab" && this._mode === "filletCorners") {
            e.preventDefault();
            if (this._phase === "pick-radius" || this._phase === "confirm") {
                this._cycleCornerMode();
                return true;
            }
        }
        if (e.key === "Escape") {
            // In initial phase, don't consume ESC so ProfileEditor can switch to cursor
            if (this._mode === "fillet" && this._phase === "idle") return false;
            if (this._mode === "filletCorners" && this._phase === "selection") return false;
            this._reset();
            return true;
        }
        // Quick-type into popup
        if (!this._inputFocused && e.key.length === 1 && /[\d.\-+{}a-zA-Z_/*()]/.test(e.key)) {
            const inp = this._popup?.querySelector("input");
            if (inp) { inp.value = e.key; inp.focus(); inp.setSelectionRange(1, 1); e.preventDefault(); return true; }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── Fillet (single corner) ────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    _filletDown(pos, e) {
        const hitId = this.ctx.canvas.hitTest(pos);

        if (this._phase === "idle") {
            if (!hitId) return;
            const seg = this._findSeg(hitId);
            if (!seg || seg.type !== "line") return;
            this._seg1Id = hitId;
            this._phase = "pick-seg2";
            this._updateHover(pos, hitId);
            return;
        }

        if (this._phase === "pick-seg2") {
            if (!hitId || hitId === this._seg1Id) return;
            const seg1 = this._findSeg(this._seg1Id);
            const seg2 = this._findSeg(hitId);
            if (!seg2 || seg2.type !== "line" || !seg1) return;

            // Verify fillet is possible
            const testResult = computeFilletForSegments(seg1, seg2, this._radius || 1, this._vars());
            if (!testResult || !testResult.valid) {
                log.debug("FilletTool: cannot fillet these segments:", testResult?.failReason);
                return;
            }
            this._seg2Id = hitId;
            this._phase = "pick-radius";
            this._radiusLocked = false;
            this._showPopup(e);
            this._updateFilletGhost(pos);
            return;
        }

        if (this._phase === "pick-radius" && !this._radiusLocked) {
            this._radiusLocked = true;
            this._phase = "pick-quadrant";
            return;
        }

        if (this._phase === "pick-quadrant") {
            this._commitSingleFillet();
            this._reset();
        }
    }

    _filletMove(pos, _e) {
        if (this._phase === "pick-radius" || this._phase === "pick-quadrant") {
            this._updateFilletGhost(pos);
        } else {
            this._updateHover(pos);
        }
    }

    _filletConfirm() {
        switch (this._phase) {
            case "pick-quadrant":
                this._radiusLocked = false; this._phase = "pick-radius";
                if (this._cursorPos) this._updateFilletGhost(this._cursorPos);
                return true;
            case "pick-radius":
                this._phase = "pick-seg2"; this._seg2Id = null; this._filletResult = null;
                this.ctx.canvas.clearGhost(); this._removePopup();
                return true;
            case "pick-seg2":
                this._phase = "idle"; this._seg1Id = null;
                this.ctx.canvas.clearGhost();
                return true;
            default:
                this._reset(); return true;
        }
    }

    _updateFilletGhost(cursorPos) {
        const seg1 = this._findSeg(this._seg1Id);
        const seg2 = this._findSeg(this._seg2Id);
        if (!seg1 || !seg2) return;
        const vars = this._vars();

        if (!this._radiusLocked) {
            // radius = distance from cursor to intersection point
            const testR = computeFilletForSegments(seg1, seg2, 1e6, vars);
            if (!testR?.valid) { this.ctx.canvas.clearGhost(); return; }
            const dist = Math.hypot(cursorPos.x - testR.intersection.x, cursorPos.y - testR.intersection.y);
            this._radius = Math.max(0.01, Math.min(testR.maxRadius, dist || this._radius));
            this._setPopupValue(this._radius);
        }

        const result = computeFilletForSegments(seg1, seg2, this._radius, vars);
        if (!result?.valid) { this.ctx.canvas.clearGhost(); return; }
        this._filletResult = result;

        // Far endpoints of each segment (the parts that remain after trim)
        const w1 = toWorldSeg(seg1, vars);
        const w2 = toWorldSeg(seg2, vars);
        const seg1FarEnd = result.seg1TrimKey === 'start' ? w1.data.end : w1.data.start;
        const seg2FarEnd = result.seg2TrimKey === 'start' ? w2.data.end : w2.data.start;

        this.ctx.canvas.setGhost(_buildSingleFilletGhost(result, seg1FarEnd, seg2FarEnd));
    }

    _commitSingleFillet() {
        const result = this._filletResult;
        const seg1 = this._findSeg(this._seg1Id);
        const seg2 = this._findSeg(this._seg2Id);
        if (!result?.valid || !seg1 || !seg2) return;

        const vars = this._vars();
        const state = this.ctx.state;
        const DEGEN_EPS = 0.01; // segments shorter than this are removed

        // Trim seg1: move its near-end to arcStart (in local coords)
        const newS1Data = { ...seg1.data };
        newS1Data[result.seg1TrimKey] = _worldToLocal(result.arcStart, seg1, vars);

        // Trim seg2: move its near-end to arcEnd
        const newS2Data = { ...seg2.data };
        newS2Data[result.seg2TrimKey] = _worldToLocal(result.arcEnd, seg2, vars);

        // Check for degenerate segments after trim
        const s1Len = Math.hypot(newS1Data.end.x - newS1Data.start.x, newS1Data.end.y - newS1Data.start.y);
        const s2Len = Math.hypot(newS2Data.end.x - newS2Data.start.x, newS2Data.end.y - newS2Data.start.y);
        const s1Degenerate = s1Len < DEGEN_EPS;
        const s2Degenerate = s2Len < DEGEN_EPS;

        // Update non-degenerate segments
        const updates = [];
        if (!s1Degenerate) updates.push({ id: seg1.id, changes: { data: newS1Data } });
        if (!s2Degenerate) updates.push({ id: seg2.id, changes: { data: newS2Data } });
        if (updates.length > 0) state.updateSegments(updates);

        // Use seg1's contourId; if cross-path, merge seg2 into same contour
        const contourId = seg1.contourId ?? 0;
        const s2ContourId = seg2.contourId;

        let s2DegenerateId = seg2.id;

        if (s2ContourId !== undefined && s2ContourId !== contourId) {
            const reverseS2 = result.seg1TrimKey === result.seg2TrimKey;
            const contourSegs = state.segments.filter(s => (s.contourId ?? 0) === s2ContourId);
            const updatesS2 = [];

            if (reverseS2) {
                const reversed = [...contourSegs].reverse();
                for (let i = 0; i < contourSegs.length; i++) {
                    const target = contourSegs[i];
                    const source = reversed[i];

                    if (source.id === seg2.id) {
                        s2DegenerateId = target.id;
                    }

                    let sourceData = { ...source.data };

                    if (source.type === "line") {
                        const tStart = { ...sourceData.start };
                        sourceData.start = { ...sourceData.end };
                        sourceData.end = tStart;
                    } else if (source.type === "arc") {
                        const tStart = { ...sourceData.start };
                        sourceData.start = { ...sourceData.end };
                        sourceData.end = tStart;
                        sourceData.sweep = Number(sourceData.sweep ?? 0) ? 0 : 1;
                    }

                    updatesS2.push({
                        id: target.id,
                        changes: {
                            type: source.type,
                            data: sourceData,
                            contourId,
                            transforms: Array.isArray(source.transforms) ? [...source.transforms] : [],
                            cmdHint: source.cmdHint,
                        }
                    });
                }
            } else {
                for (const target of contourSegs) {
                    updatesS2.push({ id: target.id, changes: { contourId } });
                }
            }
            if (updatesS2.length > 0) state.updateSegments(updatesS2);
        }

        // Determine arc direction for chain continuity
        let arcStartWorld, arcEndWorld, insertAfter;
        if (result.seg1TrimKey === 'end') {
            arcStartWorld = result.arcStart;
            arcEndWorld = result.arcEnd;
            insertAfter = s1Degenerate ? null : seg1.id;
        } else {
            arcStartWorld = result.arcEnd;
            arcEndWorld = result.arcStart;
            insertAfter = s2Degenerate ? null : seg2.id;
        }

        const arcStartLocal = _worldToLocal(arcStartWorld, seg1, vars);
        const arcEndLocal = _worldToLocal(arcEndWorld, seg1, vars);

        let arcSweep = result.sweep;
        if (result.seg1TrimKey !== 'end') arcSweep = 1 - result.sweep;

        // Insert arc
        const prevInsertAfter = state.insertAfterSegId;
        if (insertAfter) state.insertAfterSegId = insertAfter;

        state.addSegment({
            type: "arc",
            contourId,
            groupId: seg1.groupId,
            parentGroupId: seg1.parentGroupId,
            transforms: [...(seg1.transforms ?? [])],
            data: {
                start: arcStartLocal,
                end: arcEndLocal,
                center: _worldToLocal(result.center, seg1, vars),
                radius: result.radius,
                largeArc: result.largeArc,
                sweep: arcSweep,
                arcMode: "arc2pt",
            },
        });

        state.insertAfterSegId = prevInsertAfter;

        // Delete degenerate segments
        const toDelete = [];
        if (s1Degenerate) toDelete.push(seg1.id);
        if (s2Degenerate) toDelete.push(s2DegenerateId);
        if (toDelete.length > 0) state.deleteSegments(toDelete);

        state._pushHistory("Fillet");

        // Re-select all segments of the contour so the new arc is included
        const contourSegIds = state.segments
            .filter(s => (s.contourId ?? 0) === contourId)
            .map(s => s.id);
        state.setSelection(contourSegIds);

        log.debug("FilletTool: committed single fillet r=", result.radius,
            s1Degenerate ? "(seg1 removed)" : "", s2Degenerate ? "(seg2 removed)" : "");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── Fillet Corners (all corners) ─────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    _cornersDown(pos, e) {
        if (this._phase === "selection") {
            this._downClient = { x: e.clientX, y: e.clientY };
            this._downSvgPos = this.ctx.canvas.screenToSVG(e);
            this._dragging = false;
            return;
        }
        if (this._phase === "pick-radius") {
            this._phase = "confirm";
            return;
        }
        if (this._phase === "confirm") {
            this._commitAllFillets();
            this._reset();
        }
    }

    _cornersMove(pos, e) {
        if (this._phase === "selection") {
            if (this._downClient) {
                const dist = Math.hypot((e?.clientX ?? 0) - this._downClient.x, (e?.clientY ?? 0) - this._downClient.y);
                if (dist > 5) {
                    this._dragging = true;
                    this.ctx.canvas.setGhost(buildSelectionBoxGhost(this._downSvgPos, pos, SVG_NS));
                }
            } else {
                this._updateHover(pos);
            }
            return;
        }
        if (this._phase === "pick-radius") {
            this._updateAllFilletRadius(pos);
        }
    }

    _selectionUp(pos, e) {
        if (!this._downSvgPos) return;
        const wasDrag = this._dragging;
        const downSvg = this._downSvgPos;
        this._downClient = null; this._downSvgPos = null; this._dragging = false;
        this.ctx.canvas.clearGhost();

        if (wasDrag) {
            // Box selection → select whole elements/shapes
            const result = computeBoxSelection(this.ctx.state.segments, downSvg, pos, {
                variableValues: this._vars(),
                groupSelectionMode: true,
                elementGroups: this.ctx.state.elementGroups ?? [],
            });
            if (e.shiftKey) {
                const next = new Set(this.ctx.state.selectedIds);
                result.ids.forEach(id => next.add(id));
                this.ctx.state.setSelection([...next]);
            } else {
                this.ctx.state.setSelection(result.ids);
            }
        } else {
            const hitId = this.ctx.canvas.hitTest(pos);
            if (hitId) {
                // Resolve to full element (group-aware)
                const selectionIds = resolveClickSelectionIds(
                    hitId,
                    this.ctx.state.segments,
                    this.ctx.state.elementGroups ?? [],
                    {},
                );
                if (e.shiftKey) {
                    const next = new Set(this.ctx.state.selectedIds);
                    const allSelected = selectionIds.every(id => next.has(id));
                    if (allSelected) selectionIds.forEach(id => next.delete(id));
                    else selectionIds.forEach(id => next.add(id));
                    this.ctx.state.setSelection([...next]);
                } else {
                    this.ctx.state.setSelection(selectionIds);
                }
            } else if (!e.shiftKey) {
                this.ctx.state.clearSelection();
            }
        }
    }

    _cornersConfirm() {
        if (this._phase === "selection") {
            const selected = [...this.ctx.state.selectedIds].filter(id => {
                const s = this._findSeg(id);
                return s && String(s?.linkType ?? "") !== "symmetry";
            });
            if (selected.length === 0) { this._reset(); return true; }
            this._selectedSegIds = selected;
            this._phase = "pick-radius";
            this._cornerMode = "all";
            this._buildActiveFillets();
            this._showPopup(null);
            if (this._cursorPos) this._updateAllFilletRadius(this._cursorPos);
            else this.ctx.canvas.setGhost(_buildMultiFilletGhost(this._activeFillets));
            return true;
        }
        if (this._phase === "pick-radius") {
            this._selectedSegIds = []; this._activeFillets = [];
            this._phase = "selection";
            this._removePopup(); this.ctx.canvas.clearGhost();
            return true;
        }
        if (this._phase === "confirm") {
            this._phase = "pick-radius";
            return true;
        }
        this._reset(); return true;
    }

    _buildActiveFillets() {
        const vars = this._vars();
        const selSet = new Set(this._selectedSegIds);
        const segs = this.ctx.state.segments.filter(s => selSet.has(s.id));
        const corners = findFilletableCorners(segs, vars);
        const filtered = filterCornersByMode(corners, this._cornerMode, Math.max(this._radius, 0.01), vars);
        this._activeFillets = filtered.map(c => ({
            seg1: c.seg1, seg2: c.seg2, commonPt: c.commonPt,
            result: computeFilletForSegments(c.seg1, c.seg2, this._radius, vars),
        }));
        this._refCorner = null;
        if (filtered.length > 0) {
            this._refCorner = filtered[0].commonPt;
            if (this._cursorPos && filtered.length > 1) {
                let best = Infinity;
                for (const c of filtered) {
                    const d = Math.hypot(this._cursorPos.x - c.commonPt.x, this._cursorPos.y - c.commonPt.y);
                    if (d < best) { best = d; this._refCorner = c.commonPt; }
                }
            }
        }
    }

    _updateAllFilletRadius(cursorPos) {
        if (!this._refCorner) this._buildActiveFillets();
        if (this._refCorner) {
            const vars = this._vars();
            const selSet = new Set(this._selectedSegIds);
            const segs = this.ctx.state.segments.filter(s => selSet.has(s.id));
            const corners = findFilletableCorners(segs, vars);

            // To properly constrain R, for each segment involved, the sum of tangentDist
            // from all active fillets on it must not exceed its length.
            // tangentDist = R / Math.tan(halfAngle) -> R = length / sum(1/tanHalfAngle).

            // First, compute 1/tan(halfAngle) for each corner.
            // We can do this efficiently by calling computeFilletForSegments with R=1.
            const cornerFactors = [];
            for (const c of corners) {
                const res = computeFilletForSegments(c.seg1, c.seg2, 1, vars);
                if (res?.valid) {
                    if (this._cornerMode !== "all" && res.cornerType !== this._cornerMode) continue;
                    // if R=1 is valid, then tangentDist for R=1 is 1/tanHalf.
                    // We can back it out from maxRadius.
                    // Actually, if we pass R=1, it computes maxRadius = tangent_space * tanHalf.
                    // Alternatively, we can just use the distance from intersection to arcStart.
                    const dist = Math.hypot(res.arcStart.x - res.intersection.x, res.arcStart.y - res.intersection.y);
                    cornerFactors.push({ corner: c, factor: dist }); // dist = 1 / tanHalf
                }
            }

            // Group factors by segment ID
            const segFactors = new Map();
            for (const { corner, factor } of cornerFactors) {
                const id1 = corner.seg1.id;
                segFactors.set(id1, (segFactors.get(id1) || 0) + factor);
                const id2 = corner.seg2.id;
                segFactors.set(id2, (segFactors.get(id2) || 0) + factor);
            }

            // Find the minimum R for all involved segments
            let maxR = Infinity;
            for (const [segId, sumFactors] of segFactors.entries()) {
                if (sumFactors <= 1e-9) continue;
                const seg = segs.find(s => s.id === segId);
                if (!seg) continue;
                const w = toWorldSeg(seg, vars);
                const len = Math.hypot(w.data.end.x - w.data.start.x, w.data.end.y - w.data.start.y);
                const limitR = len / sumFactors;
                if (limitR < maxR) maxR = limitR;
            }

            if (!Number.isFinite(maxR) || maxR <= 0) maxR = 1e4;
            this._radius = radiusFromCursor(cursorPos, this._refCorner, 0.01, maxR);
            this._setPopupValue(this._radius);
        }
        this._buildActiveFillets();
        this.ctx.canvas.setGhost(_buildMultiFilletGhost(this._activeFillets));
    }

    _cycleCornerMode() {
        const idx = CORNER_MODES.indexOf(this._cornerMode);
        this._cornerMode = CORNER_MODES[(idx + 1) % CORNER_MODES.length];
        this._buildActiveFillets();
        if (this._cursorPos) this._updateAllFilletRadius(this._cursorPos);
        this.ctx.canvas.setGhost(_buildMultiFilletGhost(this._activeFillets));
        this._setPopupValue(this._radius);
        log.debug("FilletTool: corner mode →", this._cornerMode);
    }

    _commitAllFillets() {
        const state = this.ctx.state;
        const vars = this._vars();
        if (this._activeFillets.length === 0) return;

        const workData = new Map();
        const getSeg = (id) => {
            const s = state.segments.find(seg => seg.id === id);
            if (!s) return null;
            return { ...s, data: workData.has(id) ? workData.get(id) : { ...s.data } };
        };

        const newArcs = [];
        for (const { seg1, seg2, result } of this._activeFillets) {
            if (!result?.valid) continue;
            const s1 = getSeg(seg1.id), s2 = getSeg(seg2.id);
            if (!s1 || !s2) continue;

            const newS1 = { ...s1.data };
            newS1[result.seg1TrimKey] = _worldToLocal(result.arcStart, s1, vars);
            const newS2 = { ...s2.data };
            newS2[result.seg2TrimKey] = _worldToLocal(result.arcEnd, s2, vars);

            workData.set(s1.id, newS1);
            workData.set(s2.id, newS2);

            // Determine arc direction for chain continuity
            let arcStartWorld, arcEndWorld, insertAfter, arcSweep;
            if (result.seg1TrimKey === 'end') {
                arcStartWorld = result.arcStart;
                arcEndWorld = result.arcEnd;
                insertAfter = s1.id;
                arcSweep = result.sweep;
            } else {
                arcStartWorld = result.arcEnd;
                arcEndWorld = result.arcStart;
                insertAfter = s2.id;
                arcSweep = 1 - result.sweep;
            }

            newArcs.push({
                insertAfter,
                segment: {
                    type: "arc",
                    contourId: s1.contourId,
                    groupId: s1.groupId,
                    parentGroupId: s1.parentGroupId,
                    transforms: [...(s1.transforms ?? [])],
                    data: {
                        start: _worldToLocal(arcStartWorld, s1, vars),
                        end: _worldToLocal(arcEndWorld, s1, vars),
                        center: _worldToLocal(result.center, s1, vars),
                        radius: result.radius,
                        largeArc: result.largeArc,
                        sweep: arcSweep,
                        arcMode: "arc2pt",
                    },
                },
            });
        }

        if (workData.size > 0) {
            const updates = [...workData.entries()].map(([id, data]) => ({ id, changes: { data } }));
            state.updateSegments(updates);
        }

        const prevInsertAfter = state.insertAfterSegId;
        for (const { insertAfter, segment } of newArcs) {
            if (insertAfter) state.insertAfterSegId = insertAfter;
            state.addSegment(segment);
        }
        state.insertAfterSegId = prevInsertAfter;

        // Delete degenerate segments (trimmed to near-zero length)
        const DEGEN_EPS = 0.01;
        const toDelete = [];
        for (const [id, data] of workData.entries()) {
            if (data.start && data.end) {
                const len = Math.hypot(data.end.x - data.start.x, data.end.y - data.start.y);
                if (len < DEGEN_EPS) toDelete.push(id);
            }
        }
        if (toDelete.length > 0) state.deleteSegments(toDelete);

        if (workData.size > 0 || newArcs.length > 0) {
            state._pushHistory(`Fillet Corners (${newArcs.length})`);
        }

        // Re-select all segments of all modified contours
        if (newArcs.length > 0) {
            const modifiedContourIds = new Set();
            for (const { seg1, seg2 } of this._activeFillets) {
                if (seg1.contourId !== undefined) modifiedContourIds.add(seg1.contourId);
                if (seg2.contourId !== undefined) modifiedContourIds.add(seg2.contourId);
            }
            if (modifiedContourIds.size === 0) modifiedContourIds.add(0);

            const contourSegIds = state.segments
                .filter(s => modifiedContourIds.has(s.contourId ?? 0))
                .map(s => s.id);
            state.setSelection(contourSegIds);
        }

        log.debug("FilletTool: committed", newArcs.length, "fillets",
            toDelete.length > 0 ? `(${toDelete.length} degenerate removed)` : "");
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ─── Common helpers ────────────────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════

    _vars() { return this.ctx?.state?.variableValues ?? {}; }
    _findSeg(id) { return this.ctx?.state?.segments?.find(s => s.id === id) ?? null; }

    // ─── Popup ─────────────────────────────────────────────────────────────

    _showPopup(e) {
        this._removePopup();
        this._inputFocused = false;
        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";
        const label = document.createElement("span");
        label.textContent = "R =";
        popup.appendChild(label);
        const inp = document.createElement("input");
        inp.type = "text"; inp.inputMode = "decimal"; inp.className = "arc-radius-input";
        popup.appendChild(inp);
        const hint = document.createElement("small");
        hint.className = "arc-radius-hint";
        popup.appendChild(hint);
        if (this._mode === "filletCorners") {
            const ml = document.createElement("div");
            ml.className = "arc-radius-mode-label"; ml.id = "fillet-mode-label";
            ml.textContent = CORNER_MODE_LABELS[this._cornerMode];
            popup.appendChild(ml);
        }
        document.body.appendChild(popup);
        this._popup = popup;
        if (e) this._positionPopup(e);
        inp.addEventListener("focus", () => { this._inputFocused = true; inp.select(); });
        inp.addEventListener("blur", () => { this._inputFocused = false; });
        inp.addEventListener("keydown", (ev) => {
            ev.stopPropagation();
            if (ev.key === "Tab") { ev.preventDefault(); inp.blur(); return; }
            if (ev.key === "Enter") this._commitRadiusFromInput(inp, hint);
            if (ev.key === "Escape") this._reset();
        });
    }

    _commitRadiusFromInput(inp, hint) {
        const val = this._parseInput(inp.value ?? "");
        if (!Number.isFinite(val) || val <= 0) {
            inp.classList.add("arc-radius-error");
            if (hint) hint.textContent = "Enter a number > 0";
            setTimeout(() => inp.classList.remove("arc-radius-error"), 2000);
            return;
        }
        this._radius = val;
        if (this._mode === "fillet") {
            this._radiusLocked = true;
            this._phase = "pick-quadrant";
            if (this._cursorPos) this._updateFilletGhost(this._cursorPos);
        } else {
            this._phase = "confirm";
            this._buildActiveFillets();
            this.ctx.canvas.setGhost(_buildMultiFilletGhost(this._activeFillets));
        }
    }

    _parseInput(raw) {
        const t = raw.trim();
        if (!t) return NaN;
        const d = Number(t);
        if (Number.isFinite(d)) return d;
        const vars = this._vars();
        try {
            const expr = t.replace(VARIABLE_TOKEN_RE_GLOBAL, (_, n) => {
                const v = vars[n];
                return v !== undefined && !Number.isNaN(Number(v)) ? String(v) : "0";
            });
            const v = Number(evaluateMathExpression(expr));
            return Number.isFinite(v) ? v : NaN;
        } catch (_) { return NaN; }
    }

    _setPopupValue(value) {
        if (!this._popup || this._inputFocused) return;
        const inp = this._popup.querySelector("input");
        if (inp) inp.value = Number(value).toFixed(3);
        const ml = this._popup.querySelector("#fillet-mode-label");
        if (ml) ml.textContent = CORNER_MODE_LABELS[this._cornerMode];
    }

    _positionPopup(e) {
        if (!this._popup || !e) return;
        this._popup.style.left = (e.clientX + 14) + "px";
        this._popup.style.top = (e.clientY + 14) + "px";
    }

    _removePopup() { if (this._popup) { this._popup.remove(); this._popup = null; } }

    // ─── Hover ─────────────────────────────────────────────────────────────

    _updateHover(pos, forceId = null) {
        const hitId = forceId ?? this.ctx.canvas.hitTest(pos);
        if (hitId !== this._hoverSegId) {
            if (this._hoverSegId) this.ctx.canvas.setHoverSegment?.(this._hoverSegId, false);
            if (hitId) this.ctx.canvas.setHoverSegment?.(hitId, true);
            this._hoverSegId = hitId;
        }
    }

    _clearHover() {
        if (this._hoverSegId) this.ctx.canvas.setHoverSegment?.(this._hoverSegId, false);
        this._hoverSegId = null;
    }

    // ─── Reset ─────────────────────────────────────────────────────────────

    _reset() {
        this._phase = this._mode === "filletCorners" ? "selection" : "idle";
        this._seg1Id = null; this._seg2Id = null;
        this._filletResult = null; this._radiusLocked = false;
        this._selectedSegIds = []; this._activeFillets = [];
        this._refCorner = null; this._cornerMode = "all";
        this._downClient = null; this._downSvgPos = null; this._dragging = false;
        this._removePopup(); this._clearHover();
        this.ctx?.canvas?.clearGhost?.();
    }
}
