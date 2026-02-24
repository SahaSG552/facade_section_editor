import LoggerFactory from "../core/LoggerFactory.js";
import { arcCenterFromEndpoints } from "./tools/ArcTool.js";

const log = LoggerFactory.createLogger("EditorStateManager");

/**
 * @typedef {"cursor"|"line"|"rect2pt"|"rect3pt"|"arc2pt"|"arc3pt"|"circle2pt"|"circle3pt"} DrawTool
 * @typedef {"trim"|"extend"|"join"|"explode"|"fillet"|"chamfer"|"offset"|"close"|"bool"|"aux"} EditTool
 * @typedef {DrawTool|EditTool} Tool
 */

/**
 * @typedef {object} PathSegment
 * @property {string} id            - Unique segment ID
 * @property {string} type          - "line" | "arc" | "circle" | "rect"
 * @property {object} data          - Tool-specific geometry data (endpoints, radius, etc.)
 * @property {boolean} selected
 * @property {number}  contourId    - Contour group (set by M-command index at import time)
 * @property {'H'|'V'|'L'|'Z'|undefined} [cmdHint]
 *   Original SVG command that created this segment.  Used by exportPathWithMap to
 *   preserve the user's chosen command on canvas↔text round-trips:
 *   - 'H' → emit H (if still horizontal) or L (if moved off-axis)
 *   - 'V' → emit V (if still vertical)   or L (if moved off-axis)
 *   - 'L' → always emit L (user explicitly wrote L)
 *   - undefined (drawn on canvas) → auto-detect H/V when perfectly axis-aligned
 */

/**
 * @typedef {object} HistoryEntry
 * @property {PathSegment[]} segments - Snapshot of segments array at this point
 * @property {string} description     - Human-readable label for the undo step
 */

/**
 * EditorStateManager — single source of truth for all mutable state in the profile editor.
 *
 * Responsibilities:
 * - Track the current drawing/editing tool
 * - Store the list of drawn path segments
 * - Track selection (single or multi)
 * - Manage undo/redo history stack
 * - Emit change notifications via callbacks
 *
 * ### Usage
 * ```js
 * const state = new EditorStateManager({ profilePath: "M 0 0 L 10 0" });
 * state.onToolChange = (tool) => toolbar.highlight(tool);
 * state.onSegmentsChange = () => canvas.redraw(state.segments);
 * state.setTool("line");
 * ```
 */
export default class EditorStateManager {
    /**
     * @param {object}  options
     * @param {string}  [options.profilePath=""] - Initial SVG path string to pre-populate segments
     * @param {number}  [options.maxHistory=50]  - Maximum number of undo steps to keep
     * @param {Record<string,number>} [options.variableValues={}] - Variable values for parametric arc radii
     */
    constructor({ profilePath = "", maxHistory = 50, variableValues = {} } = {}) {
        /** @type {Tool} */
        this.currentTool = "cursor";

        /**
         * Ordered list of geometric segments currently in the editor.
         * @type {PathSegment[]}
         */
        this.segments = [];

        /**
         * IDs of currently selected segments.
         * @type {Set<string>}
         */
        this.selectedIds = new Set();

        /**
         * Undo history stack. Each entry stores a full snapshot.
         * @type {HistoryEntry[]}
         */
        this._history = [];

        /**
         * Current position in history (for redo support).
         * Points to the index of the current state.
         * @type {number}
         */
        this._historyIndex = -1;

        /** @type {number} */
        this._maxHistory = maxHistory;

        /**
         * Variable values for parametric arc radii (e.g. { d: 25.4 }).
         * Set once at construction; update via `state.variableValues = { … }` before
         * calling `_importPath` if you need live formula resolution.
         * @type {Record<string,number>}
         */
        this.variableValues = variableValues;

        /** @type {number} — monotonically increasing segment ID counter */
        this._nextSegmentId = 1;

        /** @type {number} — monotonically increasing contour ID counter */
        this._nextContourId = 1;

        // Callbacks — set externally
        /** @type {((tool: Tool) => void)|null} */
        this.onToolChange = null;
        /** @type {(() => void)|null} */
        this.onSegmentsChange = null;
        /** @type {(() => void)|null} */
        this.onSelectionChange = null;

        if (profilePath) {
            this._importPath(profilePath);
        }
    }

    // ─── Tool management ────────────────────────────────────────────────────

    /**
     * Switch the active tool.
     * @param {Tool} tool
     * @param {{ preserveSelection?: boolean }} [opts]
     */
    setTool(tool, { preserveSelection = false } = {}) {
        if (this.currentTool === tool) return;
        log.debug(`Tool: ${this.currentTool} → ${tool}`);
        this.currentTool = tool;
        if (!preserveSelection) this.clearSelection();
        if (this.onToolChange) this.onToolChange(tool);
    }

    // ─── Segment management ─────────────────────────────────────────────────

    /**
     * Add a new segment, record undo snapshot, and notify listeners.
     * Automatically inherits the contourId of the chain it snaps onto
     * (start ≈ some existing segment's end), or starts a new contour.
     * @param {Omit<PathSegment,"id"|"selected">} segmentData
     * @returns {PathSegment} the added segment
     */
    addSegment(segmentData) {
        // Determine contourId: inherit from any segment whose end ≈ our start.
        let contourId = segmentData.contourId;   // allow explicit override
        if (contourId === undefined) {
            const EPS = 1e-6;
            const connecting = this.segments.find(s =>
                (s.type === 'line' || s.type === 'arc') &&
                Math.abs(s.data.end.x - segmentData.data.start.x) < EPS &&
                Math.abs(s.data.end.y - segmentData.data.start.y) < EPS
            );
            contourId = connecting ? connecting.contourId : this._nextContourId++;
        }
        const segment = {
            id: `seg-${this._nextSegmentId++}`,
            selected: false,
            contourId,
            ...segmentData,
        };
        this.segments = [...this.segments, segment];
        this._pushHistory("Add segment");
        this._notifySegments();
        return segment;
    }

    /**
     * Update data on an existing segment by ID.
     * @param {string} id
     * @param {Partial<PathSegment>} changes
     */
    updateSegment(id, changes) {
        this.segments = this.segments.map(s =>
            s.id === id ? { ...s, ...changes } : s
        );
        this._notifySegments();
    }

    /**
     * Update multiple segments in a single batch — fires ONE change notification.
     * Does NOT push history (call `_pushHistory` after the full move gesture).
     * @param {Array<{id: string, changes: Partial<PathSegment>}>} updates
     */
    updateSegments(updates) {
        const map = new Map(updates.map(u => [u.id, u.changes]));
        this.segments = this.segments.map(s =>
            map.has(s.id) ? { ...s, ...map.get(s.id) } : s
        );
        this._notifySegments();
    }

    /**
     * Delete segment(s) by ID.
     * After deletion, previously-closed chains that became open are re-sorted
     * so the first segment starts at the "break" point (requirement: deleting
     * from a closed contour preserves a sensible M…L ordering).
     * @param {string|string[]} ids
     */
    deleteSegments(ids) {
        const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
        this.segments = this.segments.filter(s => !idSet.has(s.id));
        idSet.forEach(id => this.selectedIds.delete(id));
        this._sortChains();
        this._pushHistory("Delete segment(s)");
        this._notifySegments();
    }

    /**
     * Re-sort `this.segments` per-contour so every connected chain within a
     * contour is in sequential start→end order.  Called after deletion.
     *
     * For each contour:
     *   1. Collect all segment ends → endSet.
     *   2. Segments whose start is NOT in endSet are "heads" (open chain start
     *      or newly-created break point after a deletion from a closed loop).
     *   3. Walk from each head, then wrap up any remaining (still-closed) loops.
     *
     * The relative order of contours is preserved (by numeric contourId order).
     * @private
     */
    _sortChains() {
        const EPS = 1e-6;
        const eq  = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

        // Group segments by contourId.  Includes both lines and arcs.
        const groups = new Map();
        for (const seg of this.segments) {
            if (seg.type !== 'line' && seg.type !== 'arc') continue;
            const cid = seg.contourId ?? 0;
            if (!groups.has(cid)) groups.set(cid, []);
            groups.get(cid).push(seg);
        }

        const result = [];
        // Process contours in insertion order (Map preserves insertion order;
        // contours encountered first in segments array come first).
        const seenCids = new Set();
        const cidOrder = [];
        for (const seg of this.segments) {
            const cid = seg.contourId ?? 0;
            if (!seenCids.has(cid)) {
                seenCids.add(cid);
                cidOrder.push(cid);
            }
        }

        for (const cid of cidOrder) {
            const segs = groups.get(cid) ?? [];
            if (!segs.length) continue;

            // Build endSet for THIS contour only.
            const fmt    = p => `${parseFloat(p.x.toFixed(6))},${parseFloat(p.y.toFixed(6))}`;
            const endSet = new Set(segs.map(s => fmt(s.data.end)));
            const isHead = s => !endSet.has(fmt(s.data.start));

            const visited = new Set();
            const sorted  = [];

            // Pass 1: heads (open chains / break points).
            for (const seg of segs) {
                if (visited.has(seg.id) || !isHead(seg)) continue;
                let cur = seg;
                while (cur && !visited.has(cur.id)) {
                    sorted.push(cur);
                    visited.add(cur.id);
                    cur = segs.find(s => !visited.has(s.id) && eq(cur.data.end, s.data.start)) ?? null;
                }
            }

            // Pass 2: intact closed loops (no head — keep existing first segment).
            for (const seg of segs) {
                if (visited.has(seg.id)) continue;
                let cur = seg;
                while (cur && !visited.has(cur.id)) {
                    sorted.push(cur);
                    visited.add(cur.id);
                    cur = segs.find(s => !visited.has(s.id) && eq(cur.data.end, s.data.start)) ?? null;
                }
            }

            result.push(...sorted);
        }

        this.segments = result;
    }

    /**
     * Return all segments in the same contour as `segId`, in start→end order.
     *
     * A contour is all segments sharing the same `contourId` (set at import
     * time by the M command index, or by connection at draw time).  Within
     * that contour, segments are walked geometrically so both open chains
     * and closed loops are returned in connectivity order.
     *
     * @param {string} segId
     * @returns {PathSegment[]}
     */
    getChain(segId) {
        const EPS  = 1e-6;
        const eq   = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
        const seed = this.segments.find(s => s.id === segId);
        if (!seed) return [];

        // Work only within the same contour (lines and arcs).
        const cid   = seed.contourId ?? 0;
        const lines = this.segments.filter(
            s => (s.type === 'line' || s.type === 'arc') && (s.contourId ?? 0) === cid
        );

        const visited = new Set([seed.id]);
        const chain   = [seed];

        // Walk forward: seg.end → next.start (within contour)
        let cur = seed;
        for (;;) {
            const next = lines.find(s => !visited.has(s.id) && eq(cur.data.end, s.data.start));
            if (!next) break;
            chain.push(next);
            visited.add(next.id);
            cur = next;
        }

        // Walk backward: prev.end → chain-head.start (within contour)
        cur = seed;
        for (;;) {
            const prev = lines.find(s => !visited.has(s.id) && eq(s.data.end, cur.data.start));
            if (!prev) break;
            chain.unshift(prev);
            visited.add(prev.id);
            cur = prev;
        }

        return chain;
    }

    /**
     * Return all `{segId, pointKey}` pairs whose vertex lies within ε of `pt`.
     * Used by MoveTool for welded-vertex editing: moving one vertex of a
     * shared junction also moves the connected segment's adjacent endpoint.
     *
     * @param {{x:number, y:number}} pt
     * @returns {Array<{segId:string, pointKey:'start'|'end'}>}
     */
    getSegmentsAtVertex(pt) {
        const EPS    = 1e-6;
        const result = [];
        for (const seg of this.segments) {
            if (seg.type !== 'line' && seg.type !== 'arc') continue;
            if (Math.abs(seg.data.start.x - pt.x) < EPS && Math.abs(seg.data.start.y - pt.y) < EPS)
                result.push({ segId: seg.id, pointKey: 'start' });
            if (Math.abs(seg.data.end.x   - pt.x) < EPS && Math.abs(seg.data.end.y   - pt.y) < EPS)
                result.push({ segId: seg.id, pointKey: 'end' });
        }
        return result;
    }

    /**
     * Replace all segments at once (e.g. after import or undo).
     * Does NOT push to history — use internally.
     * @param {PathSegment[]} segments
     */
    _setSegments(segments) {
        this.segments = segments;
        this._notifySegments();
    }

    // ─── Selection ──────────────────────────────────────────────────────────

    /**
     * Select segment(s) by ID, replacing current selection.
     * @param {string|string[]} ids
     */
    setSelection(ids) {
        const newIds = new Set(Array.isArray(ids) ? ids : [ids]);
        this.selectedIds = newIds;
        this.segments = this.segments.map(s => ({ ...s, selected: newIds.has(s.id) }));
        if (this.onSelectionChange) this.onSelectionChange();
    }

    /**
     * Toggle membership of a segment ID in the selection.
     * @param {string} id
     */
    toggleSelection(id) {
        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }
        this.segments = this.segments.map(s => ({
            ...s,
            selected: this.selectedIds.has(s.id),
        }));
        if (this.onSelectionChange) this.onSelectionChange();
    }

    /** Clear all selections. */
    clearSelection() {
        if (this.selectedIds.size === 0) return;
        this.selectedIds.clear();
        this.segments = this.segments.map(s => ({ ...s, selected: false }));
        if (this.onSelectionChange) this.onSelectionChange();
    }

    // ─── Undo / Redo ────────────────────────────────────────────────────────

    /**
     * Push a full segment snapshot onto the undo stack.
     * Entries past the current position (redo future) are discarded first.
     * Respects `_maxHistory` by evicting the oldest entry when the limit is exceeded.
     * @param {string} description - Human-readable label shown in undo description
     * @private
     */
    _pushHistory(description) {
        // Discard any redo entries ahead of current position
        this._history = this._history.slice(0, this._historyIndex + 1);
        this._history.push({
            segments: this.segments.map(s => ({ ...s })),
            description,
        });
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        } else {
            this._historyIndex++;
        }
    }

    /** @returns {boolean} */
    canUndo() { return this._historyIndex > 0; }

    /** @returns {boolean} */
    canRedo() { return this._historyIndex < this._history.length - 1; }

    /**
     * Revert to the previous history entry.
     * @returns {void}
     */
    undo() {
        if (!this.canUndo()) return;
        this._historyIndex--;
        this._setSegments(this._history[this._historyIndex].segments.map(s => ({ ...s })));
        log.debug(`Undo → "${this._history[this._historyIndex].description}"`);
    }

    /**
     * Re-apply the next history entry.
     * @returns {void}
     */
    redo() {
        if (!this.canRedo()) return;
        this._historyIndex++;
        this._setSegments(this._history[this._historyIndex].segments.map(s => ({ ...s })));
        log.debug(`Redo → "${this._history[this._historyIndex].description}"`);
    }

    // ─── Import / Export ────────────────────────────────────────────────────

    /**
     * Convert SVG path string to segments and set as current state.
     * Handles M, L, H, V, Z (absolute and relative) commands.
     *
     * @param {string}  pathStr
     * @param {object}  [opts]
     * @param {boolean} [opts.resetHistory=true]  - When false, push an undo entry
     *   instead of resetting the history stack.  Pass false when updating from
     *   the PathEditor text box so undo still works for text edits.
     */
    _importPath(pathStr, { resetHistory = true } = {}) {
        if (!pathStr || !pathStr.trim()) return;
        log.debug("Import path:", pathStr);

        // Tokenize into commands
        const commandRe = /([MmLlHhVvZzCcSsQqTtAa])([^MmLlHhVvZzCcSsQqTtAa]*)/g;
        const segments  = [];
        let cx = 0, cy = 0, subX = 0, subY = 0;
        let contourId = this._nextContourId++;   // each M starts a new contour
        let m;

        while ((m = commandRe.exec(pathStr)) !== null) {
            const cmd  = m[1];
            const rel  = cmd === cmd.toLowerCase() && cmd.toLowerCase() !== "z";
            const upper = cmd.toUpperCase();
            const args = m[2].trim()
                .split(/[\s,]+/)
                .filter(Boolean)
                .map(Number)
                .filter(n => !isNaN(n));

            if (upper === "M") {
                // Each top-level M command begins a new independent contour.
                contourId = this._nextContourId++;
                for (let i = 0; i < args.length; i += 2) {
                    let x = args[i], y = args[i + 1];
                    if (rel) { x += cx; y += cy; }
                    if (i === 0) {
                        subX = x; subY = y;
                    } else {
                        // Implicit L after first M coordinate pair
                        segments.push({ type: "line", contourId, cmdHint: 'L', data: { start: { x: cx, y: cy }, end: { x, y } } });
                    }
                    cx = x; cy = y;
                }
            } else if (upper === "L") {
                for (let i = 0; i < args.length; i += 2) {
                    let x = args[i], y = args[i + 1];
                    if (rel) { x += cx; y += cy; }
                    // Preserve 'L' hint so this segment is never auto-converted to H/V on re-export.
                    segments.push({ type: "line", contourId, cmdHint: 'L', data: { start: { x: cx, y: cy }, end: { x, y } } });
                    cx = x; cy = y;
                }
            } else if (upper === "H") {
                for (let i = 0; i < args.length; i++) {
                    let x = args[i];
                    if (rel) x += cx;
                    segments.push({ type: "line", contourId, cmdHint: 'H', data: { start: { x: cx, y: cy }, end: { x, y: cy } } });
                    cx = x;
                }
            } else if (upper === "V") {
                for (let i = 0; i < args.length; i++) {
                    let y = args[i];
                    if (rel) y += cy;
                    segments.push({ type: "line", contourId, cmdHint: 'V', data: { start: { x: cx, y: cy }, end: { x: cx, y } } });
                    cy = y;
                }
            } else if (upper === "Z") {
                if (Math.abs(cx - subX) > 1e-6 || Math.abs(cy - subY) > 1e-6) {
                    segments.push({ type: "line", contourId, cmdHint: 'Z', data: { start: { x: cx, y: cy }, end: { x: subX, y: subY } } });
                }
                cx = subX; cy = subY;
            } else if (upper === "A") {
                // A rx ry x-rotation large-arc-flag sweep-flag x y
                // rx and ry may be {varname} tokens for parametric (formula) radii.
                // Stored in bit-space (Y-up); the Y-negation + sweep-flip happen
                // in the segments.map() below, consistent with line segment handling.
                const VAR_RE = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;
                // Tokenise preserving {varname} tokens alongside numeric values.
                const rawTokens = m[2].match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) ?? [];
                for (let i = 0; i + 6 < rawTokens.length; i += 7) {
                    const rxTok = rawTokens[i], ryTok = rawTokens[i + 1];
                    const largeArc = Math.round(Number(rawTokens[i + 3]));
                    const sweepBit = Math.round(Number(rawTokens[i + 4]));
                    let ex = Number(rawTokens[i + 5]), ey = Number(rawTokens[i + 6]);
                    if (rel) { ex += cx; ey += cy; }

                    let r, radiusExpr = null;
                    const rxVar = VAR_RE.exec(rxTok);
                    if (rxVar) {
                        radiusExpr = rxTok;                         // "{d}"
                        r = this.variableValues[rxVar[1]] ?? 1;     // resolve or fallback
                    } else {
                        r = (Number(rxTok) + Number(ryTok)) / 2;   // treat ellipse as circle
                    }

                    const startBit = { x: cx, y: cy };
                    const endBit   = { x: ex, y: ey };
                    const centerBit = arcCenterFromEndpoints(startBit, endBit, r, largeArc, sweepBit);
                    if (centerBit) {
                        const segData = { start: startBit, end: endBit, center: centerBit, radius: r, largeArc, sweep: sweepBit };
                        if (radiusExpr) segData.radiusExpr = radiusExpr;
                        segments.push({ type: 'arc', contourId, data: segData });
                    }
                    cx = ex; cy = ey;
                }
            }
            // C, S, Q, T — not yet supported
        }

        if (resetHistory) {
            this._history      = [];
            this._historyIndex = -1;
        }
        // Negate Y: path is stored in bit-space (Y-up), editor works in SVG-space (Y-down).
        this.segments = segments.map(s => {
            const base = {
                id:        `seg-${this._nextSegmentId++}`,
                selected:  false,
                contourId: s.contourId,
                type:      s.type,
            };
            if (s.type === 'arc') {
                return {
                    ...base,
                    data: {
                        start:    { x: s.data.start.x,  y: -s.data.start.y },
                        end:      { x: s.data.end.x,    y: -s.data.end.y   },
                        center:   { x: s.data.center.x, y: -s.data.center.y },
                        radius:   s.data.radius,
                        largeArc: s.data.largeArc,
                        // Y-flip reverses winding direction, so flip sweep flag.
                        sweep:    1 - s.data.sweep,
                        // Tag all imported arcs so the control handle is visible
                        // when selected. pt3 will be computed from arc midpoint
                        // on first render if not present.
                        arcMode: "arc2pt",
                        // Preserve variable expression for parametric radii.
                        ...(s.data.radiusExpr && { radiusExpr: s.data.radiusExpr }),
                    },
                };
            }
            // line
            return {
                ...base,
                cmdHint: s.cmdHint,  // preserve H / V / L / Z so export round-trips faithfully
                data: {
                    start: { x: s.data.start.x, y: -s.data.start.y },
                    end:   { x: s.data.end.x,   y: -s.data.end.y   },
                },
            };
        });
        this._pushHistory("Import");
        this._notifySegments();
    }

    /**
     * Export path for display in the text editor.
     * Returns the path serialised from current segments plus a line segment ID map
     * so the text editor can sync selection back to the canvas.
     *
     * Compact command selection:
     *  - Perfectly horizontal segment (start.y === end.y) -> H x
     *  - Perfectly vertical   segment (start.x === end.x) -> V y
     *  - Diagonal                                         -> L x y
     *
     * This ensures that H/V commands entered in the PathEditor survive a
     * canvas round-trip without being widened to L (which would break the
     * token-count match inside mergePathWithFormulas).
     *
     * Segments are exported exactly as stored -- no automatic mirroring.
     * Use MirrorTool to create explicit mirrored copies.
     *
     * @returns {{ path: string, lineSegIds: Array<string|null> }}
     *   path       -- SVG path string
     *   lineSegIds -- parallel array: for each PathEditor row, the canonical segment ID
     *                 (null for M-only rows that do not belong to a specific segment)
     */
    exportPathWithMap() {
        if (this.segments.length === 0) return { path: "", lineSegIds: [] };

        const r   = n => parseFloat(n.toFixed(4));
        const EPS = 1e-6;
        const eq  = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

        const parts      = [];
        const lineSegIds = [];
        let prevEnd      = null;
        let prevCid      = null;

        for (const seg of this.segments) {
            if (seg.type !== "line" && seg.type !== "arc") continue;
            const { start, end } = seg.data;
            const cid = seg.contourId ?? 0;

            // Start a new sub-path when: first segment, different contour, or geometric gap.
            if (prevEnd === null || cid !== prevCid || !eq(start, prevEnd)) {
                parts.push(`M ${r(start.x)} ${r(-start.y)}`);
                lineSegIds.push(null);  // M row: null — not backed by a segment ID.
                // The following L/H/V/A row pushes the real seg.id, so indexOf(segId)
                // correctly finds the segment row and not the M row.
            }

            if (seg.type === "arc") {
                const { radius, largeArc, sweep, radiusExpr } = seg.data;
                // Use the stored variable expression when present; otherwise emit the
                // numeric radius.  Y is negated (bit-space Y-up), so sweep is flipped.
                const rxStr = radiusExpr ?? r(radius);
                parts.push(`A ${rxStr} ${rxStr} 0 ${largeArc} ${1 - sweep} ${r(end.x)} ${r(-end.y)}`);
            } else {
                // line: choose command based on cmdHint + current geometry
                const hint = seg.cmdHint;
                const isH  = Math.abs(start.y - end.y) < EPS;
                const isV  = Math.abs(start.x - end.x) < EPS;

                if (hint === 'H') {
                    parts.push(isH ? `H ${r(end.x)}` : `L ${r(end.x)} ${r(-end.y)}`);
                } else if (hint === 'V') {
                    parts.push(isV ? `V ${r(-end.y)}` : `L ${r(end.x)} ${r(-end.y)}`);
                } else if (hint === 'L' || hint === 'Z') {
                    parts.push(`L ${r(end.x)} ${r(-end.y)}`);
                } else {
                    if (isH)      parts.push(`H ${r(end.x)}`);
                    else if (isV) parts.push(`V ${r(-end.y)}`);
                    else          parts.push(`L ${r(end.x)} ${r(-end.y)}`);
                }
            }

            lineSegIds.push(seg.id);
            prevEnd = end;
            prevCid = cid;
        }

        return { path: parts.join(" "), lineSegIds };
    }

    /**
     * Serialize the current segments to an SVG path string.
     * Delegates to `exportPathWithMap()` to keep serialization logic in one place.
     * @returns {string}
     */
    exportPath() {
        const { path } = this.exportPathWithMap();
        log.debug(`Export path: ${path.slice(0, 80)}${path.length > 80 ? '…' : ''}`);
        return path;
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    /**
     * Fire the `onSegmentsChange` callback (if set).
     * Should be called whenever `this.segments` is mutated.
     * @private
     */
    _notifySegments() {
        if (this.onSegmentsChange) this.onSegmentsChange();
    }
}
