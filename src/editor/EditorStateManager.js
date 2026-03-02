import LoggerFactory from "../core/LoggerFactory.js";
import { arcCenterFromEndpoints } from "./tools/ArcTool.js";
import { evalAngle } from "./transforms/TransformCommands.js";

const log = LoggerFactory.createLogger("EditorStateManager");

function _cloneDeep(value) {
    return JSON.parse(JSON.stringify(value));
}

function _isSymmetrySegment(seg) {
    return String(seg?.linkType ?? "") === "symmetry";
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

function _worldFromRaw(rawPoint, rtAngle) {
    if (Math.abs(rtAngle) < 1e-9) return { x: rawPoint.x, y: rawPoint.y };
    return _rotatePoint(rawPoint, rtAngle);
}

function _rawFromWorld(worldPoint, rtAngle) {
    if (Math.abs(rtAngle) < 1e-9) return { x: worldPoint.x, y: worldPoint.y };
    return _rotatePoint(worldPoint, -rtAngle);
}

function _optFiniteId(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

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
        /** @type {Array<{groupId:number,name:string,parentGroupId:number|null}>} */
        this.elementGroups = [];

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
        this._syncingSymmetry = false;

        /**
         * When set, newly drawn line/arc segments that don’t snap geometrically
         * are placed into this contour instead of starting a new one.
         * Set by ProfileEditor when the user selects a PathEditor sub-line.
         * @type {number|null}
         */
        this.activeContourId = null;
        /**
         * When set, a newly added segment is inserted AFTER this segment in the
         * segments array (preserving mid-path insertion order).
         * Cleared when the path deactivates or a shape row is selected.
         * Automatically advanced to the just-added segment after each insert.
         * @type {string|null}
         */
        this.insertAfterSegId = null;
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
            if (segmentData.type === 'circle' || segmentData.type === 'rect' || segmentData.type === 'ellipse') {
                // When a path is active in the PathEditor, embed the shape in that path.
                // Otherwise give it its own contour (standalone element).
                contourId = this.activeContourId ?? this._nextContourId++;
            } else {
                const EPS = 1e-6;
                const connecting = this.segments.find(s =>
                    (s.type === 'line' || s.type === 'arc') &&
                    Math.abs(s.data.end.x - segmentData.data.start.x) < EPS &&
                    Math.abs(s.data.end.y - segmentData.data.start.y) < EPS
                );
                // Priority:
                //  1. activeContourId set (sub-line / path header selected in PathEditor)
                //     → always add to that path, ignoring geometric snap.
                //  2. No active contour + geometric snap → join the snapped contour.
                //  3. Nothing → new contour.
                if (this.activeContourId !== null) {
                    contourId = this.activeContourId;
                } else if (connecting) {
                    contourId = connecting.contourId;
                } else {
                    contourId = this._nextContourId++;
                }
            }
        }
        const segment = {
            id: `seg-${this._nextSegmentId++}`,
            selected: false,
            contourId,
            ...segmentData,
        };
        // Insert after the tracked segment when one is set; otherwise append.
        if (this.insertAfterSegId !== null) {
            const afterIdx = this.segments.findIndex(s => s.id === this.insertAfterSegId);
            if (afterIdx !== -1) {
                const arr = [...this.segments];
                arr.splice(afterIdx + 1, 0, segment);
                this.segments = arr;
            } else {
                this.segments = [...this.segments, segment];
            }
        } else {
            this.segments = [...this.segments, segment];
        }
        // Advance so the next drawn segment continues from this one.
        this.insertAfterSegId = segment.id;
        this._syncSymmetryContours();
        this._pushHistory("Add segment");
        this._notifySegments();
        // Auto-select the new segment so the PathEditor highlights its row
        // and the next drawn element will be inserted after it.
        this.setSelection(segment.id);
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
        this._syncSymmetryContours();
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
        this._syncSymmetryContours();
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
        this._syncSymmetryContours();
        this._pushHistory("Delete segment(s)");
        this._notifySegments();
    }

    /**
     * Convert selected standalone shape segments (circle/rect) into path segments.
     *
     * Conversion is atomic: all replacements are applied in one update and produce
     * one history entry. Selection is remapped from replaced shape IDs to all newly
     * created line/arc segment IDs.
     *
     * Ellipse conversion is intentionally skipped for now because editor arc
     * primitives are circular-only in the interactive pipeline.
     *
     * @param {string[]|Set<string>|null} [ids=null] - Optional explicit segment IDs.
     *   When omitted, current selection is used.
     * @returns {{ convertedCount:number, skippedCount:number, createdSegIds:string[] }}
     */
    convertSelectionToPath(ids = null) {
        const targetIds = ids == null
            ? new Set(this.selectedIds)
            : new Set(Array.isArray(ids) ? ids : Array.from(ids));
        if (targetIds.size === 0) {
            return { convertedCount: 0, skippedCount: 0, createdSegIds: [] };
        }

        const replacements = new Map();
        let skippedCount = 0;
        for (const seg of this.segments) {
            if (!targetIds.has(seg.id)) continue;
            if (seg.type !== 'circle' && seg.type !== 'rect' && seg.type !== 'ellipse') continue;
            const converted = this._materializeShapeAsPathSegments(seg);
            if (converted.length === 0) {
                skippedCount++;
                continue;
            }
            replacements.set(seg.id, converted);
        }

        if (replacements.size === 0) {
            return { convertedCount: 0, skippedCount, createdSegIds: [] };
        }

        const nextSegments = [];
        for (const seg of this.segments) {
            const converted = replacements.get(seg.id);
            if (converted) nextSegments.push(...converted);
            else nextSegments.push(seg);
        }

        this.segments = nextSegments;

        const nextSelected = new Set(this.selectedIds);
        const createdSegIds = [];
        for (const [oldId, converted] of replacements.entries()) {
            nextSelected.delete(oldId);
            for (const created of converted) {
                createdSegIds.push(created.id);
                nextSelected.add(created.id);
            }
        }
        this.selectedIds = nextSelected;
        this.segments = this.segments.map(s => ({ ...s, selected: this.selectedIds.has(s.id) }));

        if (this.insertAfterSegId && replacements.has(this.insertAfterSegId)) {
            const tail = replacements.get(this.insertAfterSegId);
            this.insertAfterSegId = tail?.[tail.length - 1]?.id ?? null;
        }

        this._syncSymmetryContours();
        this._pushHistory("To Path");
        this._notifySegments();
        if (this.onSelectionChange) this.onSelectionChange();

        return {
            convertedCount: replacements.size,
            skippedCount,
            createdSegIds,
        };
    }

    /**
     * Convert one shape segment to one or more line/arc path segments.
     *
     * @param {PathSegment} shapeSeg
     * @returns {PathSegment[]}
     * @private
     */
    _materializeShapeAsPathSegments(shapeSeg) {
        const transforms = Array.isArray(shapeSeg.transforms) ? [...shapeSeg.transforms] : [];

        const makeLine = (start, end, cmdHint = 'L') => ({
            id: `seg-${this._nextSegmentId++}`,
            selected: false,
            contourId: shapeSeg.contourId,
            type: 'line',
            cmdHint,
            transforms,
            data: {
                start: { x: Number(start.x), y: Number(start.y) },
                end: { x: Number(end.x), y: Number(end.y) },
            },
        });
        const makeArc = (start, end, center, radius, largeArc, sweep) => ({
            id: `seg-${this._nextSegmentId++}`,
            selected: false,
            contourId: shapeSeg.contourId,
            type: 'arc',
            transforms,
            data: {
                start: { x: Number(start.x), y: Number(start.y) },
                end: { x: Number(end.x), y: Number(end.y) },
                center: { x: Number(center.x), y: Number(center.y) },
                radius: Number(radius),
                largeArc: Number(largeArc),
                sweep: Number(sweep),
                arcMode: 'arc2pt',
            },
        });

        if (shapeSeg.type === 'circle') {
            const center = shapeSeg.data?.center;
            const radius = Number(shapeSeg.data?.radius ?? 0);
            if (!center || !Number.isFinite(radius) || radius <= 0) return [];
            const left = { x: center.x - radius, y: center.y };
            const right = { x: center.x + radius, y: center.y };
            return [
                makeArc(left, right, center, radius, 0, 1),
                makeArc(right, left, center, radius, 0, 1),
            ];
        }

        if (shapeSeg.type === 'rect') {
            const { x, y, w, h, rx: rx0 = 0 } = shapeSeg.data ?? {};
            if (![x, y, w, h].every(Number.isFinite)) return [];
            const dirW = Number(shapeSeg.data?.dirW) < 0 ? -1 : 1;
            const hasDirH = Object.prototype.hasOwnProperty.call(shapeSeg.data ?? {}, 'dirH');
            const dirH = hasDirH ? (Number(shapeSeg.data?.dirH) < 0 ? -1 : 1) : -1;
            const x1 = Number(x);
            const y1 = Number(y);
            const x2 = x1 + dirW * Number(w);
            const y2 = y1 + dirH * Number(h);
            const rx = Math.max(0, Math.min(Number(rx0), Math.abs(Number(w)) / 2, Math.abs(Number(h)) / 2));

            if (rx <= 1e-9) {
                const p1 = { x: x1, y: y1 };
                const p2 = { x: x2, y: y1 };
                const p3 = { x: x2, y: y2 };
                const p4 = { x: x1, y: y2 };
                return [
                    makeLine(p1, p2),
                    makeLine(p2, p3),
                    makeLine(p3, p4),
                    makeLine(p4, p1, 'Z'),
                ];
            }

            const sW = x2 >= x1 ? 1 : -1;
            const sH = y2 >= y1 ? 1 : -1;

            const topStart = { x: x1 + sW * rx, y: y1 };
            const topEnd = { x: x2 - sW * rx, y: y1 };
            const rightTop = { x: x2, y: y1 + sH * rx };
            const rightBottom = { x: x2, y: y2 - sH * rx };
            const bottomRight = { x: x2 - sW * rx, y: y2 };
            const bottomLeft = { x: x1 + sW * rx, y: y2 };
            const leftBottom = { x: x1, y: y2 - sH * rx };
            const leftTop = { x: x1, y: y1 + sH * rx };

            const cTR = { x: x2 - sW * rx, y: y1 + sH * rx };
            const cBR = { x: x2 - sW * rx, y: y2 - sH * rx };
            const cBL = { x: x1 + sW * rx, y: y2 - sH * rx };
            const cTL = { x: x1 + sW * rx, y: y1 + sH * rx };

            // Arc segments are exported with flipped sweep (1 - sweep).
            // Choose stored sweep from rect direction so exported quarter-arcs
            // stay on the rectangle boundary for all dirW/dirH combinations.
            // desiredExportSweep = (sW*sH < 0) ? 1 : 0
            const storedSweep = (sW * sH < 0) ? 0 : 1;

            return [
                makeLine(topStart, topEnd),
                makeArc(topEnd, rightTop, cTR, rx, 0, storedSweep),
                makeLine(rightTop, rightBottom),
                makeArc(rightBottom, bottomRight, cBR, rx, 0, storedSweep),
                makeLine(bottomRight, bottomLeft),
                makeArc(bottomLeft, leftBottom, cBL, rx, 0, storedSweep),
                makeLine(leftBottom, leftTop),
                makeArc(leftTop, topStart, cTL, rx, 0, storedSweep),
            ];
        }

        // Ellipse conversion intentionally deferred.
        return [];
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
        const eq = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

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
            const fmt = p => `${parseFloat(p.x.toFixed(6))},${parseFloat(p.y.toFixed(6))}`;
            const endSet = new Set(segs.map(s => fmt(s.data.end)));
            const isHead = s => !endSet.has(fmt(s.data.start));

            const visited = new Set();
            const sorted = [];

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

        // Re-attach non-chain segments (circles, rects, etc.).
        // Embedded shapes (sharing contourId with a chain) are inserted right after
        // the chain’s last sorted segment so that exportPathWithMap can emit them
        // adjacent to their contour (required for _buildElemsWithPaths range logic).
        const nonChain = this.segments.filter(s => s.type !== 'line' && s.type !== 'arc');
        const chainCids = new Set(result.map(s => s.contourId ?? 0));
        const embedded = nonChain.filter(s => chainCids.has(s.contourId ?? 0));
        const standalone = nonChain.filter(s => !chainCids.has(s.contourId ?? 0));

        // Insert each embedded shape immediately after the last segment of its contour.
        const finalResult = [];
        const emittedCids = new Set();
        for (let i = 0; i < result.length; i++) {
            finalResult.push(result[i]);
            const cid = result[i].contourId ?? 0;
            const isLast = result[i + 1] === undefined || (result[i + 1].contourId ?? 0) !== cid;
            if (isLast && !emittedCids.has(cid)) {
                emittedCids.add(cid);
                finalResult.push(...embedded.filter(s => (s.contourId ?? 0) === cid));
            }
        }
        this.segments = [...finalResult, ...standalone];
    }

    /**
     * Return top-level element descriptors for the PathEditor's unified element list.
     *
     * Each connected chain of line/arc segments becomes a single 'path' element
     * (when the chain contains at least one arc) or a 'polyline' element (lines only).
     * Standalone shapes (circle, rect, ellipse) each become their own element.
     *
     * @returns {Array<
     *   {type:'circle'|'rect'|'ellipse', segId:string, data:object} |
    *   {type:'path'|'polyline'|'symmetry', contourId:number, segIds:string[]}
     * >}
     */
    getElements() {
        const elements = [];
        const lineArcContours = new Set(
            this.segments
                .filter(s => s.type === 'line' || s.type === 'arc')
                .map(s => Number(s.contourId ?? 0))
                .filter(Number.isFinite)
        );

        const chainByContour = new Map();
        for (const seg of this.segments) {
            if (seg.type !== 'line' && seg.type !== 'arc') continue;
            const cid = Number(seg.contourId ?? 0);
            if (!Number.isFinite(cid)) continue;
            if (!chainByContour.has(cid)) chainByContour.set(cid, []);
            chainByContour.get(cid).push(seg);
        }

        const embeddedShapesByContour = new Map();
        const standaloneShapeElementsById = new Map();
        const topLevelTokens = [];
        const emittedContourTokens = new Set();

        for (const seg of this.segments) {
            if (seg.type === 'line' || seg.type === 'arc') {
                const cid = Number(seg.contourId ?? 0);
                if (!Number.isFinite(cid) || emittedContourTokens.has(cid)) continue;
                emittedContourTokens.add(cid);
                topLevelTokens.push({ kind: 'contour', contourId: cid });
                continue;
            }

            if (seg.type === 'circle' || seg.type === 'rect' || seg.type === 'ellipse') {
                const explicitParent = Number(seg?.parentContourId);
                const fallbackParent = Number(seg.contourId ?? 0);
                const resolvedParentContourId = Number.isFinite(explicitParent)
                    ? explicitParent
                    : (lineArcContours.has(fallbackParent) ? fallbackParent : null);
                const shapeElem = {
                    type: seg.type,
                    segId: seg.id,
                    data: { ...seg.data },
                    transforms: Array.isArray(seg.transforms) ? [...seg.transforms] : [],
                    parentContourId: Number.isFinite(resolvedParentContourId)
                        ? Number(resolvedParentContourId)
                        : null,
                    groupId: _optFiniteId(seg?.groupId),
                    parentGroupId: _optFiniteId(seg?.parentGroupId),
                };

                if (Number.isFinite(shapeElem.parentContourId) && lineArcContours.has(shapeElem.parentContourId)) {
                    if (!embeddedShapesByContour.has(shapeElem.parentContourId)) {
                        embeddedShapesByContour.set(shapeElem.parentContourId, []);
                    }
                    embeddedShapesByContour.get(shapeElem.parentContourId).push(shapeElem);
                } else {
                    standaloneShapeElementsById.set(seg.id, shapeElem);
                    topLevelTokens.push({ kind: 'shape', segId: seg.id });
                }
            }
        }

        for (const token of topLevelTokens) {
            if (token.kind === 'shape') {
                const shapeElem = standaloneShapeElementsById.get(token.segId);
                if (shapeElem) elements.push(shapeElem);
                continue;
            }

            const cid = Number(token.contourId);
            const chain = chainByContour.get(cid) ?? [];
            if (chain.length === 0) continue;
            const embedded = embeddedShapesByContour.get(cid) ?? [];
            const isSymmetry = chain.some(s => String(s?.linkType ?? '') === 'symmetry');
            elements.push({
                type: isSymmetry ? 'symmetry' : 'polyline',
                contourId: cid,
                segIds: [...chain.map(s => s.id), ...embedded.map(s => s.segId)],
                transforms: Array.isArray(chain[0]?.transforms) ? [...chain[0].transforms] : [],
                groupId: _optFiniteId(chain[0]?.groupId),
                parentGroupId: _optFiniteId(chain[0]?.parentGroupId),
                ...(isSymmetry
                    ? {
                        parentContourId: _optFiniteId(chain[0]?.parentContourId),
                        axis: chain[0]?.axis ? _cloneDeep(chain[0].axis) : null,
                    }
                    : {}),
            });
            elements.push(...embedded);
        }

        const groups = Array.isArray(this.elementGroups)
            ? this.elementGroups.map((g) => ({
                type: 'group',
                groupId: Number(g?.groupId),
                guid: String(g?.guid ?? ''),
                name: String(g?.name ?? ''),
                parentGroupId: _optFiniteId(g?.parentGroupId),
                transforms: Array.isArray(g?.transforms) ? [...g.transforms] : [],
            })).filter(g => Number.isFinite(g.groupId))
            : [];
        elements.push(...groups);

        return elements;
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
        const EPS = 1e-6;
        const eq = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
        const seed = this.segments.find(s => s.id === segId);
        if (!seed) return [];
        if (_isSymmetrySegment(seed)) {
            const parentCid = Number(seed?.parentContourId);
            if (!Number.isFinite(parentCid)) return [];
            const parentSeed = this.segments.find(s => !_isSymmetrySegment(s) && (s.contourId ?? 0) === parentCid);
            if (!parentSeed) return [];
            return this.getChain(parentSeed.id);
        }
        // Standalone closed shapes — return immediately without chain-walking.
        if (seed.type === 'circle' || seed.type === 'rect' || seed.type === 'ellipse') return [seed];

        // Work only within the same contour (lines and arcs).
        const cid = seed.contourId ?? 0;
        const lines = this.segments.filter(
            s => (s.type === 'line' || s.type === 'arc') && (s.contourId ?? 0) === cid
        );

        const visited = new Set([seed.id]);
        const chain = [seed];

        // Walk forward: seg.end → next.start (within contour)
        let cur = seed;
        for (; ;) {
            const next = lines.find(s => !visited.has(s.id) && eq(cur.data.end, s.data.start));
            if (!next) break;
            chain.push(next);
            visited.add(next.id);
            cur = next;
        }

        // Walk backward: prev.end → chain-head.start (within contour)
        cur = seed;
        for (; ;) {
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
        if (!pt) return [];   // guard: called with undefined when circle pt3 not yet stored
        const EPS = 1e-6;
        const result = [];
        for (const seg of this.segments) {
            if (seg.type !== 'line' && seg.type !== 'arc') continue;
            if (Math.abs(seg.data.start.x - pt.x) < EPS && Math.abs(seg.data.start.y - pt.y) < EPS)
                result.push({ segId: seg.id, pointKey: 'start' });
            if (Math.abs(seg.data.end.x - pt.x) < EPS && Math.abs(seg.data.end.y - pt.y) < EPS)
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
        this._syncSymmetryContours();
        this._notifySegments();
    }

    // ─── Selection ──────────────────────────────────────────────────────────

    /**
     * Select segment(s) by ID, replacing current selection.
     * @param {string|string[]} ids
     */
    setSelection(ids) {
        const nextIds = this._resolveSelectableIds(Array.isArray(ids) ? ids : [ids]);
        const newIds = new Set(nextIds);
        this.selectedIds = newIds;
        this.segments = this.segments.map(s => ({ ...s, selected: newIds.has(s.id) }));
        if (this.onSelectionChange) this.onSelectionChange();
    }

    /**
     * Toggle membership of a segment ID in the selection.
     * @param {string} id
     */
    toggleSelection(id) {
        const seg = this.segments.find(s => s.id === id);
        if (seg && _isSymmetrySegment(seg)) {
            const mapped = this._resolveSelectableIds([id]);
            if (mapped.length === 0) return;
            const next = new Set(this.selectedIds);
            const allSelected = mapped.every(mid => next.has(mid));
            if (allSelected) mapped.forEach(mid => next.delete(mid));
            else mapped.forEach(mid => next.add(mid));
            this.selectedIds = next;
            this.segments = this.segments.map(s => ({ ...s, selected: this.selectedIds.has(s.id) }));
            if (this.onSelectionChange) this.onSelectionChange();
            return;
        }
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

    _resolveSelectableIds(ids) {
        const input = Array.isArray(ids) ? ids : [];
        const byId = new Map(this.segments.map(s => [s.id, s]));
        const out = [];
        for (const id of input) {
            if (typeof id === 'string' && id.startsWith('m:')) {
                out.push(id);
                continue;
            }
            const seg = byId.get(id);
            if (!seg) continue;
            if (_isSymmetrySegment(seg)) {
                const parentCid = Number(seg?.parentContourId);
                if (!Number.isFinite(parentCid)) continue;
                for (const parentSeg of this.segments) {
                    if (_isSymmetrySegment(parentSeg)) continue;
                    if ((parentSeg.contourId ?? 0) !== parentCid) continue;
                    out.push(parentSeg.id);
                }
                continue;
            }
            out.push(seg.id);
        }
        return [...new Set(out)];
    }

    _mirrorSegmentForSymmetry(seg, axis) {
        if (!seg || !axis?.p1 || !axis?.p2) return null;
        const vars = this.variableValues ?? {};
        const data = _cloneDeep(seg.data ?? {});
        const transforms = _cloneDeep(Array.isArray(seg.transforms) ? seg.transforms : []);
        const rt0 = _sumRtAngle(transforms, vars);

        const mirrorRawPointKeepRt = (rawPoint) => {
            const world = _worldFromRaw(rawPoint, rt0);
            const mirroredWorld = _mirrorPoint(world, axis.p1, axis.p2);
            return _rawFromWorld(mirroredWorld, rt0);
        };

        if (seg.type === "line") {
            data.start = mirrorRawPointKeepRt(data.start);
            data.end = mirrorRawPointKeepRt(data.end);
            delete data._expr;
            return { type: "line", data, transforms, cmdHint: seg.cmdHint };
        }

        if (seg.type === "arc") {
            data.start = mirrorRawPointKeepRt(data.start);
            data.end = mirrorRawPointKeepRt(data.end);
            if (data.center) data.center = mirrorRawPointKeepRt(data.center);
            if (data.pt3) data.pt3 = mirrorRawPointKeepRt(data.pt3);
            data.sweep = Number(data.sweep ?? 0) ? 0 : 1;
            delete data._expr;
            return { type: "arc", data, transforms, cmdHint: seg.cmdHint };
        }

        if (seg.type === "circle") {
            data.center = mirrorRawPointKeepRt(data.center);
            if (data.pt3) data.pt3 = mirrorRawPointKeepRt(data.pt3);
            delete data._expr;
            return { type: "circle", data, transforms, cmdHint: seg.cmdHint };
        }

        if (seg.type === "rect") {
            const x = Number(data.x ?? 0);
            const y = Number(data.y ?? 0);
            const w = Number(data.w ?? 0);
            const h = Number(data.h ?? 0);
            const p0 = mirrorRawPointKeepRt({ x, y });
            const pW = mirrorRawPointKeepRt({ x: x + w, y });
            const pH = mirrorRawPointKeepRt({ x, y: y + h });
            data.x = p0.x;
            data.y = p0.y;
            data.w = Math.hypot(pW.x - p0.x, pW.y - p0.y) * (w < 0 ? -1 : 1);
            data.h = Math.hypot(pH.x - p0.x, pH.y - p0.y) * (h < 0 ? -1 : 1);
            delete data._expr;
            return { type: "rect", data, transforms, cmdHint: seg.cmdHint };
        }

        if (seg.type === "ellipse") {
            const p = mirrorRawPointKeepRt({ x: Number(data.cx ?? 0), y: Number(data.cy ?? 0) });
            data.cx = p.x;
            data.cy = p.y;
            delete data._expr;
            return { type: "ellipse", data, transforms, cmdHint: seg.cmdHint };
        }

        return null;
    }

    _syncSymmetryContours() {
        if (this._syncingSymmetry) return;
        this._syncingSymmetry = true;
        try {
            let work = [...this.segments];
            let changed = false;

            const groups = new Map();
            for (const seg of work) {
                if (!_isSymmetrySegment(seg)) continue;
                const childCid = Number(seg?.contourId);
                if (!Number.isFinite(childCid)) continue;
                if (!groups.has(childCid)) {
                    groups.set(childCid, {
                        childCid,
                        parentContourId: Number(seg?.parentContourId),
                        axis: _cloneDeep(seg?.axis ?? null),
                    });
                }
            }

            for (const group of groups.values()) {
                const parentCid = Number(group.parentContourId);
                const axis = group.axis;
                const childCid = Number(group.childCid);
                if (!Number.isFinite(parentCid) || !axis?.p1 || !axis?.p2) continue;

                const parentSegs = work.filter(s => !_isSymmetrySegment(s) && (s.contourId ?? 0) === parentCid);
                const childSegs = work.filter(s => _isSymmetrySegment(s) && (s.contourId ?? 0) === childCid);
                if (childSegs.length === 0) continue;

                if (parentSegs.length === 0) {
                    work = work.filter(s => !( _isSymmetrySegment(s) && (s.contourId ?? 0) === childCid));
                    changed = true;
                    continue;
                }

                const mirrored = parentSegs
                    .map((seg) => this._mirrorSegmentForSymmetry(seg, axis))
                    .filter(Boolean);

                if (mirrored.length === 0) continue;

                const canUpdateInPlace = mirrored.length === childSegs.length
                    && mirrored.every((m, idx) => m.type === childSegs[idx]?.type);

                if (canUpdateInPlace) {
                    const byId = new Map(mirrored.map((m, i) => [childSegs[i].id, m]));
                    let localChanged = false;
                    work = work.map((seg) => {
                        const m = byId.get(seg.id);
                        if (!m) return seg;
                        localChanged = true;
                        return {
                            ...seg,
                            type: m.type,
                            data: m.data,
                            transforms: m.transforms,
                            cmdHint: m.cmdHint,
                            contourId: childCid,
                            linkType: "symmetry",
                            parentContourId: parentCid,
                            axis: _cloneDeep(axis),
                            selected: false,
                        };
                    });
                    changed = changed || localChanged;
                    continue;
                }

                const replacement = mirrored.map((m) => ({
                    id: `seg-${this._nextSegmentId++}`,
                    selected: false,
                    contourId: childCid,
                    type: m.type,
                    data: m.data,
                    transforms: m.transforms,
                    cmdHint: m.cmdHint,
                    linkType: "symmetry",
                    parentContourId: parentCid,
                    axis: _cloneDeep(axis),
                }));

                const firstChildIndex = work.findIndex(s => _isSymmetrySegment(s) && (s.contourId ?? 0) === childCid);
                const withoutChild = work.filter(s => !(_isSymmetrySegment(s) && (s.contourId ?? 0) === childCid));
                const insertAt = firstChildIndex >= 0 ? Math.min(firstChildIndex, withoutChild.length) : withoutChild.length;
                work = [
                    ...withoutChild.slice(0, insertAt),
                    ...replacement,
                    ...withoutChild.slice(insertAt),
                ];
                changed = true;
            }

            if (changed) {
                this.segments = work;
                const mapped = this._resolveSelectableIds([...this.selectedIds]);
                const nextSelection = new Set(mapped);
                this.selectedIds = nextSelection;
                this.segments = this.segments.map(s => ({ ...s, selected: nextSelection.has(s.id) }));
            }
        } finally {
            this._syncingSymmetry = false;
        }
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
            elementGroups: (this.elementGroups ?? []).map(g => ({ ...g })),
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
        const h = this._history[this._historyIndex];
        this.elementGroups = (h.elementGroups ?? []).map(g => ({ ...g }));
        this._setSegments(h.segments.map(s => ({ ...s })));
        log.debug(`Undo → "${this._history[this._historyIndex].description}"`);
    }

    /**
     * Re-apply the next history entry.
     * @returns {void}
     */
    redo() {
        if (!this.canRedo()) return;
        this._historyIndex++;
        const h = this._history[this._historyIndex];
        this.elementGroups = (h.elementGroups ?? []).map(g => ({ ...g }));
        this._setSegments(h.segments.map(s => ({ ...s })));
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
        const segments = [];
        let cx = 0, cy = 0, subX = 0, subY = 0;
        let contourId = this._nextContourId++;   // each M starts a new contour
        let m;

        while ((m = commandRe.exec(pathStr)) !== null) {
            const cmd = m[1];
            const rel = cmd === cmd.toLowerCase() && cmd.toLowerCase() !== "z";
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
                    let rxVal = Number(rxTok);
                    let ryVal = Number(ryTok);
                    const rxVar = VAR_RE.exec(rxTok);
                    if (rxVar) {
                        radiusExpr = rxTok;                         // "{d}"
                        r = this.variableValues[rxVar[1]] ?? 1;     // resolve or fallback
                        rxVal = r;
                        ryVal = r;
                    } else {
                        r = (Number(rxTok) + Number(ryTok)) / 2;   // treat ellipse as circle
                        if (!Number.isFinite(rxVal)) rxVal = r;
                        if (!Number.isFinite(ryVal)) ryVal = r;
                    }

                    const startBit = { x: cx, y: cy };
                    const endBit = { x: ex, y: ey };
                    // arcCenterFromEndpoints assumes Y-down SVG space (sweep=1 → CW).
                    // The path is stored in Y-up bit-space, so the sweep direction is
                    // reversed relative to SVG. Pass the flipped sweep so the center
                    // lands on the correct side of the chord.
                    const centerBit = arcCenterFromEndpoints(startBit, endBit, r, largeArc, 1 - sweepBit);
                    if (centerBit) {
                        const segData = {
                            start: startBit,
                            end: endBit,
                            center: centerBit,
                            radius: r,
                            rx: rxVal,
                            ry: ryVal,
                            largeArc,
                            sweep: sweepBit,
                        };
                        if (radiusExpr) segData.radiusExpr = radiusExpr;
                        segments.push({ type: 'arc', contourId, data: segData });
                    }
                    cx = ex; cy = ey;
                }
            }
            // C, S, Q, T — not yet supported
        }

        if (resetHistory) {
            this._history = [];
            this._historyIndex = -1;
        }
        this.elementGroups = [];
        // Negate Y: path is stored in bit-space (Y-up), editor works in SVG-space (Y-down).
        this.segments = segments.map(s => {
            const base = {
                id: `seg-${this._nextSegmentId++}`,
                selected: false,
                contourId: s.contourId,
                type: s.type,
            };
            if (s.type === 'arc') {
                return {
                    ...base,
                    data: {
                        start: { x: s.data.start.x, y: -s.data.start.y },
                        end: { x: s.data.end.x, y: -s.data.end.y },
                        center: { x: s.data.center.x, y: -s.data.center.y },
                        radius: s.data.radius,
                        rx: s.data.rx,
                        ry: s.data.ry,
                        largeArc: s.data.largeArc,
                        // Y-flip reverses winding direction, so flip sweep flag.
                        sweep: 1 - s.data.sweep,
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
                    end: { x: s.data.end.x, y: -s.data.end.y },
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
     * @param {object} [opts]
     * @param {boolean} [opts.skipShapes=false] - When true, shape elements (circle, rect,
     *   ellipse) are returned in `shapeElements` rather than serialised into the path string.
     *   Use this for PathEditor display; leave false (default) for saving profilePath.
     * @returns {{ path: string, lineSegIds: Array<string|null>, shapeElements?: Array }}
     *   path          -- SVG path string (only line/arc segments when skipShapes=true)
     *   lineSegIds    -- parallel array: for each PathEditor row, the canonical segment ID
     *                    (null for M-only rows that do not belong to a specific segment)
     *   shapeElements -- (only when skipShapes=true) array of { segId, type, data } for
     *                    each circle / rect / ellipse segment
     */
    exportPathWithMap({ skipShapes = false } = {}) {
        if (this.segments.length === 0) {
            return skipShapes
                ? { path: "", lineSegIds: [], shapeElements: [] }
                : { path: "", lineSegIds: [] };
        }

        const r = n => parseFloat(n.toFixed(4));
        const EPS = 1e-6;
        const eq = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

        const parts = [];
        const lineSegIds = [];
        const shapeElements = [];
        let prevEnd = null;
        let prevCid = null;

        // Build a processing order that keeps embedded shapes (shapes sharing a
        // contourId with a line/arc chain) adjacent to that chain's last segment.
        // This is required by _buildElemsWithPaths, which uses a min/max range on
        // lineSegIds to slice commands for each element.
        const _lineArcCids = new Set(
            this.segments.filter(s => s.type === 'line' || s.type === 'arc').map(s => s.contourId ?? 0)
        );
        const _seenCids = new Set();
        const _ordered = [];
        for (const seg of this.segments) {
            if (seg.type === 'line' || seg.type === 'arc') {
                _ordered.push(seg);
                // After the last line/arc of this contour, append embedded shapes.
                const cid = seg.contourId ?? 0;
                const idx = this.segments.indexOf(seg);
                const isLast = !this.segments.slice(idx + 1)
                    .some(s => (s.type === 'line' || s.type === 'arc') && (s.contourId ?? 0) === cid);
                if (isLast && !_seenCids.has(cid)) {
                    _seenCids.add(cid);
                    for (const sh of this.segments) {
                        if ((sh.type === 'circle' || sh.type === 'rect' || sh.type === 'ellipse')
                            && (sh.contourId ?? 0) === cid) {
                            _ordered.push(sh);
                        }
                    }
                }
            } else if (!_lineArcCids.has(seg.contourId ?? 0)) {
                // Standalone shape — append as-is; embedded shapes handled above.
                _ordered.push(seg);
            }
        }

        for (const seg of _ordered) {
            // ── Circle: emit as two half-arcs OR collect as shape element ────────
            if (seg.type === 'circle') {
                const _isEmbedded = _lineArcCids.has(seg.contourId ?? 0);
                if (skipShapes && !_isEmbedded) {
                    shapeElements.push({ segId: seg.id, type: 'circle', data: { ...seg.data } });
                } else {
                    const { center, radius, radiusExpr } = seg.data;
                    const rxStr = radiusExpr ?? r(radius);
                    parts.push(`M ${r(center.x - radius)} ${r(-center.y)}`);
                    lineSegIds.push(null);
                    parts.push(`A ${rxStr} ${rxStr} 0 1 0 ${r(center.x + radius)} ${r(-center.y)}`);
                    lineSegIds.push(seg.id);
                    parts.push(`A ${rxStr} ${rxStr} 0 1 0 ${r(center.x - radius)} ${r(-center.y)}`);
                    lineSegIds.push(seg.id);
                    parts.push(`Z`);
                    lineSegIds.push(null);
                }
                continue;
            }
            // ── Future shape types (rect, ellipse) ───────────────────────────────
            if (seg.type === 'rect' || seg.type === 'ellipse') {
                const _isEmbedded = _lineArcCids.has(seg.contourId ?? 0);
                if (skipShapes && !_isEmbedded) {
                    shapeElements.push({ segId: seg.id, type: seg.type, data: { ...seg.data } });
                } else if (seg.type === 'rect') {
                    // Serialize as a closed path (Y negated editor→profile space).
                    const { x, y, w, h, rx: rx0 = 0 } = seg.data;
                    const dirW = Number(seg.data?.dirW) < 0 ? -1 : 1;
                    const hasDirH = Object.prototype.hasOwnProperty.call(seg.data ?? {}, 'dirH');
                    const dirH = hasDirH ? (Number(seg.data?.dirH) < 0 ? -1 : 1) : -1;
                    const x2 = x + dirW * w;
                    const y2 = y + dirH * h;
                    const rx = Math.max(0, Math.min(rx0, Math.abs(w) / 2, Math.abs(h) / 2));
                    if (rx > EPS) {
                        // Rounded corners: use arc commands at each corner.
                        parts.push(
                            `M ${r(x + rx)} ${r(-y)}`,
                            `L ${r(x2 - rx)} ${r(-y)}`,
                            `A ${r(rx)} ${r(rx)} 0 0 1 ${r(x2)} ${r(-(y + rx))}`,
                            `L ${r(x2)} ${r(-(y2 + rx))}`,
                            `A ${r(rx)} ${r(rx)} 0 0 1 ${r(x2 - rx)} ${r(-y2)}`,
                            `L ${r(x + rx)} ${r(-y2)}`,
                            `A ${r(rx)} ${r(rx)} 0 0 1 ${r(x)} ${r(-(y2 + rx))}`,
                            `L ${r(x)} ${r(-(y + rx))}`,
                            `A ${r(rx)} ${r(rx)} 0 0 1 ${r(x + rx)} ${r(-y)}`,
                            `Z`,
                        );
                        for (let i = 0; i < 10; i++) lineSegIds.push(i === 0 ? seg.id : null);
                    } else {
                        // Sharp corners: four L commands.
                        parts.push(
                            `M ${r(x)} ${r(-y)}`,
                            `L ${r(x2)} ${r(-y)}`,
                            `L ${r(x2)} ${r(-y2)}`,
                            `L ${r(x)} ${r(-y2)}`,
                            `Z`,
                        );
                        for (let i = 0; i < 5; i++) lineSegIds.push(i === 0 ? seg.id : null);
                    }
                    prevEnd = null; prevCid = null; // force M for next segment
                } else {
                    // ellipse → two half-ellipse arcs (like circle but with rx ≠ ry).
                    const { cx, cy, rx: ex, ry } = seg.data;
                    parts.push(`M ${r(cx - ex)} ${r(-cy)}`);
                    lineSegIds.push(null);
                    parts.push(`A ${r(ex)} ${r(ry)} 0 1 0 ${r(cx + ex)} ${r(-cy)}`);
                    lineSegIds.push(seg.id);
                    parts.push(`A ${r(ex)} ${r(ry)} 0 1 0 ${r(cx - ex)} ${r(-cy)}`);
                    lineSegIds.push(seg.id);
                    parts.push(`Z`);
                    lineSegIds.push(null);
                    prevEnd = null; prevCid = null;
                }
                continue;
            }
            if (seg.type !== "line" && seg.type !== "arc") continue;
            const { start, end } = seg.data;
            const cid = seg.contourId ?? 0;

            // Start a new sub-path when: first segment, different contour, or geometric gap.
            if (prevEnd === null || cid !== prevCid || !eq(start, prevEnd)) {
                parts.push(`M ${r(start.x)} ${r(-start.y)}`);
                // Synthetic segId "m:<contourId>" so PathEditor can route M-row clicks
                // through state.setSelection — identical pipeline to L/A rows.
                lineSegIds.push(`m:${cid}`);
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
                const isH = Math.abs(start.y - end.y) < EPS;
                const isV = Math.abs(start.x - end.x) < EPS;

                if (hint === 'H') {
                    parts.push(isH ? `H ${r(end.x)}` : `L ${r(end.x)} ${r(-end.y)}`);
                } else if (hint === 'V') {
                    parts.push(isV ? `V ${r(-end.y)}` : `L ${r(end.x)} ${r(-end.y)}`);
                } else if (hint === 'L' || hint === 'Z') {
                    parts.push(`L ${r(end.x)} ${r(-end.y)}`);
                } else {
                    if (isH) parts.push(`H ${r(end.x)}`);
                    else if (isV) parts.push(`V ${r(-end.y)}`);
                    else parts.push(`L ${r(end.x)} ${r(-end.y)}`);
                }
            }

            lineSegIds.push(seg.id);
            prevEnd = end;
            prevCid = cid;
        }

        return skipShapes
            ? { path: parts.join(" "), lineSegIds, shapeElements }
            : { path: parts.join(" "), lineSegIds };
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
