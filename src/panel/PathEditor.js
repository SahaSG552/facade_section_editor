/**
 * PathEditor - SVG Path Editor with table-based row editing
 * 
 * Key design principles:
 * - Each line is displayed as a flex row with individual cells per argument
 * - First cell = SVG command (clickable to change)
 * - Remaining cells = individual parameters (clickable to edit)
 * - Formulas/variables preserved in storage, evaluated for output
 * - Autocomplete suggestions for commands and variables
 * 
 * @module PathEditor
 */

import { evaluateMathExpression } from "../utils/utils.js";
import { VARIABLE_TOKEN_RE_GLOBAL } from "../utils/variableTokens.js";
import {
    isShapeYAttr,
    pathUiToStoredToken,
    shapeStoredToUiNumber,
    shapeUiToStoredNumber,
    shapeUiToStoredToken,
} from "../utils/yPolicy.js";

/**
 * Valid SVG path commands with their argument counts and labels
 * @constant {Object.<string, {args: string[], label: string}>}
 */
const SVG_COMMAND_DEFS = {
    'M': { args: ['x', 'y'], label: 'Move to' },
    'L': { args: ['x', 'y'], label: 'Line to' },
    'H': { args: ['x'], label: 'Horizontal line' },
    'V': { args: ['y'], label: 'Vertical line' },
    'C': { args: ['x1', 'y1', 'x2', 'y2', 'x', 'y'], label: 'Cubic bezier' },
    'S': { args: ['x2', 'y2', 'x', 'y'], label: 'Smooth cubic bezier' },
    'Q': { args: ['x1', 'y1', 'x', 'y'], label: 'Quadratic bezier' },
    'T': { args: ['x', 'y'], label: 'Smooth quadratic bezier' },
    'A': { args: ['rx', 'ry', 'angle', 'large', 'sweep', 'x', 'y'], label: 'Arc' },
    'Z': { args: [], label: 'Close path' },
};

/** Set of valid SVG path commands (both uppercase and lowercase) */
const SVG_COMMANDS = new Set([...Object.keys(SVG_COMMAND_DEFS), ...Object.keys(SVG_COMMAND_DEFS).map(c => c.toLowerCase())]);

/**
 * PathEditor — unified element-based SVG path / shape editor.
 *
 * All shapes (Circle, Rect, Ellipse) and path/polyline contours
 * appear as numbered top-level rows in one list.  Path/polyline
 * rows are collapsible to show individual M/L/A/Z sub-command rows.
 *
 * Public API
 * ----------
 * setElements(elements)          — main entry point (replaces setPath + setShapeElements)
 * setSelectedElements(ids)       — highlight rows matching a Set<segId>
 * clearAllSelection()            — remove all highlights
 * setVariableValues(values)      — update variable map and re-render
 * onChange(evaluatedPath)        — fired on every content change
 * onLineClick(segId, e)          — fired when a sub-line row is clicked
 * onShapeElementChange(segId, changes|null) — fired on shape attr edit / delete
 * onShapeElementClick(segId, e)  — fired when a shape row is clicked
 * onToPathRequest(segIds, e)      — fired on top-level RMB action (To Path)
 *
 * Backward-compat stubs (no-op): setPath, setShapeElements,
 *   setSelectedLines, clearLineSelection, clearShapeSelection, setMirrorStartIndex
 */
export default class PathEditor {
    static MOD_COMMANDS = [
        { code: 'TR', label: 'translate()' },
        { code: 'SC', label: 'scale()' },
        { code: 'RT', label: 'rotate()' },
        { code: 'SX', label: 'skewX()' },
        { code: 'SY', label: 'skewY()' },
        { code: 'MT', label: 'matrix()' },
    ];
    /**
     * Icons and attribute definitions for each shape type.
     * @type {Object.<string, {icon:string, label:string, attrs:string[]}>}
     */
    static SHAPE_DEFS = {
        circle:  { icon: '○', label: 'Circle',  attrs: ['cx', 'cy', 'r']           },
        rect:    { icon: '□', label: 'Rect',    attrs: ['x', 'y', 'w', 'h', 'rx'] },
        ellipse: { icon: '⬬', label: 'Ellipse', attrs: ['cx', 'cy', 'rx', 'ry']    },
    };

    static isShapeType(type) {
        return type === 'circle' || type === 'rect' || type === 'ellipse';
    }

    /**
     * @param {Object}  options
     * @param {HTMLElement}         options.container
     * @param {HTMLInputElement}   [options.hiddenInput]
     * @param {HTMLInputElement}   [options.rawHiddenInput]
      * @param {HTMLInputElement}   [options.transformsHiddenInput]
      * @param {HTMLInputElement}   [options.elementsHiddenInput]
     * @param {Function}           [options.onChange]            — receives evaluated path string
     * @param {Object}             [options.variableValues]
     * @param {Function}           [options.getVariableList]
     * @param {Function}           [options.onLineClick]         — (segId, MouseEvent)
     * @param {Function}           [options.onShapeElementChange]— (segId, changes|null)
     * @param {Function}           [options.onShapeElementClick] — (segId, MouseEvent)
    * @param {Function}           [options.onToPathRequest]     — (segIds:string[], MouseEvent)
    * @param {Function}           [options.onElementOrderChange] — (order) top-level reorder callback
    * @param {Function}           [options.onConvertSymmetryGroup] — (groupId:number)
     */
    constructor(options = {}) {
        this.container             = options.container;
        this.hiddenInput           = options.hiddenInput    ?? null;
        this.rawHiddenInput        = options.rawHiddenInput ?? null;
        this.transformsHiddenInput = options.transformsHiddenInput ?? null;
        this.elementsHiddenInput   = options.elementsHiddenInput ?? null;
        this.onChange              = options.onChange              || (() => {});
        this.variableValues        = options.variableValues        || {};
        this.getVariableList       = options.getVariableList       || (() => []);
        /** @type {((segId:string, e:MouseEvent)=>void)|null} */
        this.onLineClick           = options.onLineClick           || null;
        /** @type {((segId:string, changes:object|null)=>void)|null} */
        this.onShapeElementChange  = options.onShapeElementChange  || null;
        /** @type {((segId:string, e:MouseEvent)=>void)|null} */
        this.onShapeElementClick   = options.onShapeElementClick   || null;
        /** @type {((segIds:string[], e:MouseEvent)=>void)|null} */
        this.onPathElemClick       = options.onPathElemClick       || null;
        /** @type {((segIds:string[], e:MouseEvent)=>void)|null} */
        this.onGroupElemClick      = options.onGroupElemClick      || null;
        /** @type {((segIds:string[], e:MouseEvent)=>void)|null} */
        this.onToPathRequest       = options.onToPathRequest       || null;
        /** @type {((order:Array<object>)=>void)|null} */
        this.onElementOrderChange  = options.onElementOrderChange  || null;
        /** @type {((groupId:number)=>void)|null} */
        this.onConvertSymmetryGroup = options.onConvertSymmetryGroup || null;
        /** @type {((e:MouseEvent)=>void)|null} Called when user clicks on the empty elements container background */
        this.onDeactivate          = options.onDeactivate          || null;

        /**
         * Coordinate space of shape data currently stored in `_elements`.
         * - 'bit': profile path space (Y-up)
         * - 'canvas': editor canvas space (Y-down)
         * @type {'bit'|'canvas'}
         */
        this._shapeDataSpace = 'bit';
        /**
         * Coordinate space of path line params currently shown in row cells.
         * Stored hidden path is always bit-space.
         * @type {'bit'|'canvas'}
         */
        this._pathParamSpace = 'bit';

        // ── DOM refs ──────────────────────────────────────────────────────
        /** @type {HTMLElement|null} */
        this.element = null;
        /** @type {HTMLElement|null} */
        this.elementsContainer = null;
        /** @type {HTMLInputElement|null} */
        this.input = null;
        /** @type {HTMLButtonElement|null} */
        this.addBtn = null;
        /** @type {HTMLElement|null} */
        this.suggestionsEl = null;

        // ── View model ────────────────────────────────────────────────────
        /**
         * Flat list of element descriptors:
         *   Shape:    { type, segId, data, _elem }
         *   Path:     { type, contourId, segIds, expanded, lines:[{text,segId,_elem}], _elem }
         * @type {Array}
         */
        this._elements = [];
        /** @type {Set<number>} contourIds currently expanded */
        this._expandedContours = new Set();
        /** @type {string|null} 'shape:<segId>' | 'path:<contourId>' */
        this._activeElemId = null;
        /** @type {object|null} lineData descriptor of the currently selected sub-line */
        this._activeSubLine = null;
        /** @type {object|null} lineData of last-clicked sub-line (anchor for SHIFT range-select) */
        this._lastSelectedLine = null;
        /** @type {string|number|null} stable anchor for SHIFT range-select across DOM rebuilds */
        this._lastSelectedLineRef = null;
        /** @type {string|null} stable anchor for SHIFT range-select on top-level rows */
        this._lastSelectedElemRef = null;
        /** @type {{parentElem:object, fromIndex:number}|null} active drag-sort state */
        this._dragState = null;
        /** @type {number} monotonic group id allocator for UI structure nodes */
        this._nextGroupId = 1;

        // ── Inline edit state ─────────────────────────────────────────────
        this.activeEditLineData  = null;
        this.activeEditType      = null;
        this.activeEditArgIndex  = null;
        /** @type {HTMLInputElement|null} */
        this.activeEditInput     = null;
        /** @type {{elem:object, fromIndex:number}|null} */
        this._modDragState       = null;

        this.init();
    }
    
    // ─── Init ─────────────────────────────────────────────────────────────────

    /** @private */
    init() {
        this.element = document.createElement('div');
        this.element.className = 'path-editor-container';
        this.element.innerHTML = `
            <div class="path-editor-elements"></div>
            <div class="path-editor-input-area">
                <div class="path-editor-input-row">
                    <input type="text" class="path-editor-input" placeholder="Add element or command...">
                    <button type="button" class="path-editor-add-btn" title="Add">+</button>
                </div>
                <div class="path-editor-suggestions"></div>
            </div>
        `;
        this.container.appendChild(this.element);
        this.elementsContainer = this.element.querySelector('.path-editor-elements');
        this.input             = this.element.querySelector('.path-editor-input');
        this.addBtn            = this.element.querySelector('.path-editor-add-btn');
        this.suggestionsEl     = this.element.querySelector('.path-editor-suggestions');
        this._bindEvents();
        // Click on the empty elements area (not on a row) → deactivate + fire onDeactivate
        this.elementsContainer.addEventListener('mousedown', (e) => {
            if (e.target === this.elementsContainer) {
                this.clearAllSelection();
                this._setActiveElem(null);
                if (this.onDeactivate) this.onDeactivate(e);
            }
        });
        this.elementsContainer.addEventListener('dragover', (e) => {
            if (!this._dragState?.isElem) return;
            if (e.target?.closest?.('.pe-elem')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.elementsContainer.classList.add('pe-elem-drag-over');
        });
        this.elementsContainer.addEventListener('dragleave', () => {
            this.elementsContainer.classList.remove('pe-elem-drag-over');
        });
        this.elementsContainer.addEventListener('drop', (e) => {
            this.elementsContainer.classList.remove('pe-elem-drag-over');
            if (!this._dragState?.isElem) return;
            if (e.target?.closest?.('.pe-elem')) return;
            e.preventDefault();
            const baseIndices = Array.isArray(this._dragState?.fromIndices)
                ? [...new Set(this._dragState.fromIndices)].sort((a, b) => a - b)
                : [this._dragState.fromIndex];
            const valid = this._expandMoveIndicesWithGroupDescendants(baseIndices)
                .filter(i => i >= 0 && i < this._elements.length);
            if (valid.length === 0) return;

            const rootGroupIds = new Set(
                (Array.isArray(this._dragState?.dragRefs) ? this._dragState.dragRefs : [])
                    .map((ref) => {
                        if (!String(ref).startsWith('group:')) return null;
                        const gid = Number(String(ref).slice(6));
                        return Number.isFinite(gid) ? gid : null;
                    })
                    .filter(Number.isFinite)
            );

            const moved = valid.map(i => this._elements[i]).map((elem) => {
                const isShape = PathEditor.isShapeType(elem?.type);
                const isNestedUnderMovedRoot = this._isDescendantOfGroupRoots(elem, rootGroupIds);
                if (isNestedUnderMovedRoot) return { ...elem };
                return {
                    ...elem,
                    parentGroupId: null,
                    parentGroupGuid: null,
                    ...(isShape ? { parentContourId: null } : {}),
                };
            });
            for (let i = valid.length - 1; i >= 0; i--) {
                this._elements.splice(valid[i], 1);
            }
            this._elements.push(...moved);
            this._pruneEmptyGroups();
            this._renderElements();
            this._emitTopLevelOrder();
        });
        this._renderSuggestions();
    }

    /** @private */
    _bindEvents() {
        this.input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); this._tryAddFromInput(); }
        });
        this.input.addEventListener('input', () => this._renderSuggestions());
        this.addBtn.addEventListener('click', () => this._tryAddFromInput());
        this.input.addEventListener('paste', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.clipboardData.getData('text/plain').split(/[\n\r]+/).filter(l => l.trim())
                .forEach(line => this._tryAddLine(line.trim()));
        });
    }

    /**
     * Emit current top-level order payload for external state synchronization.
     * @private
     */
    _emitTopLevelOrder() {
        const order = this._elements.map(elem =>
            (elem.type === 'path' || elem.type === 'polyline')
                ? {
                    kind: 'contour',
                    contourId: elem.contourId,
                    parentGroupId: this._optId(elem?.parentGroupId),
                }
                : (elem.type === 'group')
                    ? {
                        kind: 'group',
                        groupId: Number(elem.groupId),
                        guid: String(elem?.guid ?? ''),
                        name: String(elem.name ?? ''),
                        parentGroupId: this._optId(elem?.parentGroupId),
                        // Symmetry-group link metadata
                        linkType: elem?.linkType ?? null,
                        sourceGroupId: (elem?.sourceGroupId != null && Number.isFinite(Number(elem.sourceGroupId)))
                            ? Number(elem.sourceGroupId) : null,
                        sourceGroupGuid: String(elem?.sourceGroupGuid ?? ''),
                        axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
                    }
                    : {
                    kind: 'shape',
                    segId: elem.segId,
                    groupId: this._optId(elem?.groupId ?? elem?.parentGroupId),
                    parentContourId: this._optId(elem?.parentContourId),
                    parentGroupId: this._optId(elem?.parentGroupId),
                    linkType: elem?.linkType ?? null,
                    axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
                }
        );
        if (this.onElementOrderChange) this.onElementOrderChange(order);
        else this._fireOnChange();
    }

    /**
     * Allocate smallest available positive group ID.
     * @returns {number}
     * @private
     */
    _allocateGroupId() {
        const used = new Set(
            this._elements
                .filter(e => e?.type === 'group')
                .map(e => Number(e?.groupId))
                .filter(Number.isFinite)
        );
        let id = 1;
        while (used.has(id)) id++;
        this._nextGroupId = Math.max(this._nextGroupId, id + 1);
        return id;
    }

    /** @returns {string} @private */
    _newGuid() {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `guid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    /**
     * Parse optional numeric id. Returns null for null/undefined/empty/non-finite.
     * @param {*} value
     * @returns {number|null}
     * @private
     */
    _optId(value) {
        if (value === null || value === undefined || value === '') return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    /**
     * Return clickable/selectable row element for a top-level element.
     * @param {object} elem
     * @returns {HTMLElement|null}
     * @private
     */
    _getTopLevelRowElement(elem) {
        if (!elem?._elem) return null;
        if (elem.type === 'path' || elem.type === 'polyline' || elem.type === 'group') {
            return elem._elem?.querySelector?.('.pe-path-header') ?? null;
        }
        return elem._elem ?? null;
    }

    /**
     * Remove groups that have no direct children (iteratively).
     * @returns {boolean} true when structure changed
     * @private
     */
    _pruneEmptyGroups() {
        if (!Array.isArray(this._elements) || this._elements.length === 0) return false;

        let changed = false;
        while (true) {
            const existingGroupIds = new Set(
                this._elements
                    .filter(e => e?.type === 'group')
                    .map(e => this._optId(e?.groupId))
                    .filter(id => Number.isFinite(id) && id > 0)
            );
            if (existingGroupIds.size === 0) break;

            const nonEmptyGroupIds = new Set();
            for (const elem of this._elements) {
                const parentId = this._optId(elem?.parentGroupId);
                if (!Number.isFinite(parentId) || !existingGroupIds.has(parentId)) continue;
                nonEmptyGroupIds.add(parentId);
            }

            const next = this._elements.filter((elem) => {
                if (elem?.type !== 'group') return true;
                const gid = this._optId(elem?.groupId);
                return Number.isFinite(gid) && gid > 0 && nonEmptyGroupIds.has(gid);
            });

            if (next.length === this._elements.length) break;
            this._elements = next;
            changed = true;
        }

        if (changed && this._activeElemId?.startsWith('group:')) {
            const gid = Number(this._activeElemId.slice(6));
            const exists = this._elements.some(e => e?.type === 'group' && Number(e?.groupId) === gid);
            if (!exists) this._activeElemId = null;
        }

        return changed;
    }

    /**
     * Resolve valid parent group for element using id+guid check.
     * @param {object} elem
     * @returns {object|null}
     * @private
     */
    _resolveParentGroup(elem) {
        const gid = this._optId(elem?.parentGroupId);
        if (!Number.isFinite(gid)) return null;
        const parent = this._elements.find(e => e?.type === 'group' && Number(e.groupId) === gid) ?? null;
        if (!parent) return null;
        const childGuid = String(elem?.parentGroupGuid ?? '').trim();
        const parentGuid = String(parent?.guid ?? '').trim();
        if (childGuid && parentGuid && childGuid !== parentGuid) return null;
        return parent;
    }

    /**
     * Resolve parent group by id only (ignores guid mismatch).
     * Used for hierarchy/selection operations where stale guid must not break nesting.
     * @param {object} elem
     * @returns {object|null}
     * @private
     */
    /**
     * Resolve the direct parent group element of `elem`, or null if ungrouped.
     * @param {object} elem
     * @returns {object|null}
     * @private
     */
    _resolveParentGroupById(elem) {
        const gid = this._optId(elem?.parentGroupId);
        if (!Number.isFinite(gid)) return null;
        return this._elements.find(e => e?.type === 'group' && Number(e.groupId) === gid) ?? null;
    }

    /**
     * Build a Map of groupId → parentGroupId for every group currently in `_elements`.
     * Top-level groups map to `null`. Useful as a lightweight snapshot before structural
     * mutations (e.g. ungroup) that would otherwise break live `_resolveParentGroupById` chains.
     * @returns {Map<number, number|null>}
     * @private
     */
    _buildGroupParentMap() {
        const map = new Map();
        for (const elem of this._elements) {
            if (elem?.type !== 'group') continue;
            const gid = this._optId(elem?.groupId);
            if (!Number.isFinite(gid)) continue;
            map.set(gid, this._optId(elem?.parentGroupId));
        }
        return map;
    }

    /**
     * @param {object} elem
     * @param {Set<number>} rootGroupIds
     * @returns {boolean}
     * @private
     */
    _isDescendantOfGroupRoots(elem, rootGroupIds) {
        if (!elem || !rootGroupIds?.size) return false;
        let cur = this._optId(elem?.parentGroupId);
        const seen = new Set();
        while (Number.isFinite(cur) && !seen.has(cur)) {
            if (rootGroupIds.has(cur)) return true;
            seen.add(cur);
            const parent = this._elements.find(e => e?.type === 'group' && Number(e.groupId) === cur) ?? null;
            cur = this._optId(parent?.parentGroupId);
        }
        return false;
    }

    /**
     * Expand dragged index set: selected group rows always carry their full descendant subtree.
     * @param {number[]} baseIndices
     * @returns {number[]}
     * @private
     */
    _expandMoveIndicesWithGroupDescendants(baseIndices) {
        const validBase = [...new Set(baseIndices)]
            .filter(i => Number.isInteger(i) && i >= 0 && i < this._elements.length)
            .sort((a, b) => a - b);
        if (validBase.length === 0) return [];

        const moved = new Set(validBase);
        const rootGroupIds = new Set(
            validBase
                .map(i => this._elements[i])
                .filter(e => e?.type === 'group')
                .map(e => Number(e.groupId))
                .filter(Number.isFinite)
        );
        // Keep source-group and its symmetry pair together when moving group rows.
        if (rootGroupIds.size > 0) {
            const guidById = new Map(
                this._elements
                    .filter(e => e?.type === 'group')
                    .map(g => [Number(g?.groupId), String(g?.guid ?? '')])
                    .filter(([gid]) => Number.isFinite(gid))
            );
            const linkedSymRoots = this._elements
                .filter((e) => e?.type === 'group' && String(e?.linkType ?? '') === 'symmetry')
                .filter((sym) => {
                    const srcId = Number(sym?.sourceGroupId);
                    if (Number.isFinite(srcId) && rootGroupIds.has(srcId)) return true;
                    const srcGuid = String(sym?.sourceGroupGuid ?? '').trim();
                    if (!srcGuid) return false;
                    for (const rgid of rootGroupIds) {
                        if (String(guidById.get(Number(rgid)) ?? '') === srcGuid) return true;
                    }
                    return false;
                })
                .map((g) => Number(g?.groupId))
                .filter(Number.isFinite);
            for (const gid of linkedSymRoots) rootGroupIds.add(gid);
        }
        if (rootGroupIds.size === 0) return validBase;

        const queue = [...rootGroupIds];
        const seenGroups = new Set(queue);
        while (queue.length > 0) {
            const gid = queue.shift();
            for (let idx = 0; idx < this._elements.length; idx++) {
                const item = this._elements[idx];
                const parent = this._resolveParentGroupById(item);
                if (Number(parent?.groupId) !== gid) continue;
                moved.add(idx);
                if (item?.type === 'group') {
                    const childGid = Number(item.groupId);
                    if (Number.isFinite(childGid) && !seenGroups.has(childGid)) {
                        seenGroups.add(childGid);
                        queue.push(childGid);
                    }
                }
            }
        }

        return [...moved].sort((a, b) => a - b);
    }

    // ─── Elements API ─────────────────────────────────────────────────────────

    /**
     * Main entry point — replaces the old setPath() + setShapeElements() combo.
     *
     * `elements` array items:
     *  - Shape:  `{ type:'circle'|'rect'|'ellipse', segId, data }`
     *  - Path:   `{ type:'path'|'polyline', contourId, segIds, path?, lineSegIds? }`
     *    - `path` = evaluated path string (canvas-originated) → rebuild sub-lines
     *    - `path` omitted / null → preserve existing sub-line texts (text-originated)
     *
     * @param {Array} elements
     */
    setElements(elements) {
        if (!elements) return;
        const prevShapeSpace = this._shapeDataSpace;
        // Elements pushed from ProfileEditor/EditorStateManager carry shape coordinates
        // in canvas SVG space (Y-down).
        const incomingShapeSpace = 'canvas';
        const prevActiveElemId = this._activeElemId;
        let prevActivePathPos = -1;
        if (prevActiveElemId?.startsWith('path:')) {
            const prevActiveCid = Number(prevActiveElemId.slice(5));
            const prevPathElems = this._elements.filter(e => e.type === 'path' || e.type === 'polyline');
            prevActivePathPos = prevPathElems.findIndex(e => e.contourId === prevActiveCid);
        }
        // Keep incoming order as the single source of truth.
        // IDs (especially contourId) are not stable across all mode transitions,
        // so re-sorting by previous IDs can swap rows incorrectly.
        elements = [...elements].map((elem) => {
            if (elem?.type === 'symmetry') {
                return {
                    ...elem,
                    type: 'path',
                    isSymmetry: true,
                };
            }
            if (elem?.type === 'group') {
                return {
                    ...elem,
                    type: 'group',
                    name: String(elem?.name ?? ''),
                };
            }
            return { ...elem, isSymmetry: !!elem?.isSymmetry };
        });

        // Snapshot expanded state and existing line texts (to survive re-render).
        // Also record the positional order of path elements (by index among path/polyline
        // elements) so that when _importPath regenerates fresh contourIds we can still
        // restore expanded state by position — the N-th path stays expanded if the
        // N-th path was expanded before.
        const prevExpanded  = new Set(this._expandedContours);
        const prevExpandedBySig = new Map();
        const prevPathOrder = []; // [{contourId, expanded, lines}] ordered by position
        const prevLineTexts = new Map(); // contourId -> [{text, segId, formulaText, lineGuid}]
        const prevTransformsByPathCid = new Map();
        const prevTransformsByShapeSid = new Map();
        const prevShapeOrder = [];       // [{type, segId, attrs}]
        const prevShapeBySegId = new Map();
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                const lineSnap = elem.lines.map(l => ({
                    text: l.text,
                    segId: l.segId,
                    formulaText: l._formulaText ?? (this._hasFormulaToken(l.text) ? l.text : null),
                    lineGuid: String(l?.lineGuid ?? this._newGuid()),
                }));
                prevPathOrder.push({ contourId: elem.contourId, expanded: prevExpanded.has(elem.contourId), lines: lineSnap });
                prevPathOrder[prevPathOrder.length - 1].transforms = Array.isArray(elem.transforms) ? [...elem.transforms] : [];
                prevLineTexts.set(elem.contourId, lineSnap);
                prevTransformsByPathCid.set(elem.contourId, Array.isArray(elem.transforms) ? [...elem.transforms] : []);
                const sig = this._contourSignatureFromLines(lineSnap);
                if (sig) prevExpandedBySig.set(sig, prevExpanded.has(elem.contourId));
            } else if (elem.type === 'group') {
                const gid = Number(elem.groupId);
                if (Number.isFinite(gid)) this._nextGroupId = Math.max(this._nextGroupId, gid + 1);
            } else if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                const attrs = PathEditor.SHAPE_DEFS[elem.type]?.attrs ?? [];
                const snap = {
                    type: elem.type,
                    segId: elem.segId,
                    attrs: Object.fromEntries(attrs.map(a => [a, this._shapeAttrValueForSpace(elem.type, elem.data ?? {}, a, prevShapeSpace)])),
                    transforms: Array.isArray(elem.transforms) ? [...elem.transforms] : [],
                    parentContourId: this._optId(elem?.parentContourId),
                };
                prevShapeOrder.push(snap);
                if (elem.segId) prevShapeBySegId.set(elem.segId, snap);
                if (elem.segId) prevTransformsByShapeSid.set(elem.segId, Array.isArray(elem.transforms) ? [...elem.transforms] : []);
            }
        }
        let pathElemIndex = 0; // incremented for each path/polyline in the incoming list
        let shapeElemIndex = 0;

        // Reset active sub-line ref (stale after rebuild)
        this._activeSubLine = null;
        this._lastSelectedLine = null;
        this._elements = elements.map(elem => {
            if (elem.type === 'group') {
                const groupId = Number(elem?.groupId);
                const safeGroupId = Number.isFinite(groupId) ? groupId : this._nextGroupId++;
                this._nextGroupId = Math.max(this._nextGroupId, safeGroupId + 1);
                return {
                    type: 'group',
                    groupId: safeGroupId,
                    guid: String(elem?.guid ?? this._newGuid()),
                    name: String(elem?.name ?? `Group ${safeGroupId}`),
                    expanded: elem?.expanded !== false,
                    parentGroupId: this._optId(elem?.parentGroupId),
                    transforms: Array.isArray(elem.transforms) ? [...elem.transforms] : [],
                    // Symmetry-group link metadata
                    linkType: elem?.linkType ?? null,
                    sourceGroupId: (elem?.sourceGroupId != null && Number.isFinite(Number(elem.sourceGroupId)))
                        ? Number(elem.sourceGroupId) : null,
                    sourceGroupGuid: String(elem?.sourceGroupGuid ?? ''),
                    axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
                    _elem: null,
                };
            }

            if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                const nextData = { ...(elem.data ?? {}) };
                const prevShape = prevShapeBySegId.get(elem.segId) ?? prevShapeOrder[shapeElemIndex++] ?? null;
                const incomingTransforms = Array.isArray(elem.transforms) ? [...elem.transforms] : null;
                const prevTransforms = prevTransformsByShapeSid.get(elem.segId) ?? (prevShape?.transforms ?? []);
                const transforms = incomingTransforms
                    ? this._mergeTransformsWithFormulaPriority(prevTransforms, incomingTransforms)
                    : prevTransforms;
                const parentContourId = this._optId(elem?.parentContourId);
                const attrs = PathEditor.SHAPE_DEFS[elem.type]?.attrs ?? [];
                if (prevShape?.type === elem.type) {
                    for (const attr of attrs) {
                        const prevVal = prevShape.attrs?.[attr] ?? '';
                        const incomingVal = this._shapeAttrValueForSpace(elem.type, nextData, attr, incomingShapeSpace);
                        const chosenVal = this._chooseShapeAttrWithFormulaPriority(prevVal, incomingVal);
                        if (chosenVal !== incomingVal) {
                            Object.assign(nextData, this._shapeAttrToChangesForSpace(elem.type, nextData, attr, chosenVal, incomingShapeSpace));
                        }
                    }
                }
                return {
                    type: elem.type,
                    segId: elem.segId,
                    data: nextData,
                    transforms,
                    groupId: this._optId(elem?.groupId ?? elem?.parentGroupId),
                    parentContourId,
                    parentGroupId: this._optId(elem?.parentGroupId),
                    linkType: elem?.linkType ?? null,
                    axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
                    _isEmbeddedVisual: false,
                    _elem: null,
                };
            }
            // path / polyline
            const cid = elem.contourId;
            // Positional slot — used when contourId changed (e.g. after _importPath).
            const slot = prevPathOrder[pathElemIndex];
            pathElemIndex++;
            let lines;
            if (elem.path != null) {
                // Canvas-originated: rebuild from numeric path string
                lines = this._buildLinesFromPath(elem.path, elem.lineSegIds ?? [], elem.segIds ?? []);
                const prevTexts = prevLineTexts.has(cid) ? prevLineTexts.get(cid) : (slot?.lines ?? null);
                if (prevTexts && prevTexts.length === lines.length) {
                    lines = lines.map((line, i) => {
                        const prevText = prevTexts[i]?.text ?? null;
                        const prevFormula = prevTexts[i]?.formulaText ?? null;
                        const prevGuid = String(prevTexts[i]?.lineGuid ?? this._newGuid());
                        const chosenText = this._chooseLineTextWithFormulaPriority(prevText, prevFormula, line.text);
                        if (chosenText !== line.text) {
                            return {
                                ...line,
                                text: chosenText,
                                _formulaText: prevFormula ?? (this._hasFormulaToken(chosenText) ? chosenText : null),
                                lineGuid: prevGuid,
                            };
                        }
                        return {
                            ...line,
                            _formulaText: prevFormula ?? (this._hasFormulaToken(chosenText) ? chosenText : null),
                            lineGuid: prevGuid,
                        };
                    });
                }
            } else {
                // Text-originated: preserve text.  Try exact cid match first, then
                // positional slot (handles regenerated contourIds after _importPath).
                const prevTexts = prevLineTexts.has(cid) ? prevLineTexts.get(cid) : (slot?.lines ?? null);
                if (prevTexts) {
                    // Use elem.lineSegIds (index-aligned, includes nulls for M/Z) when available;
                    // fall back to elem.segIds[i] only as last resort.
                    const lsids = elem.lineSegIds ?? null;
                    lines = prevTexts.map((l, i) => ({
                        text:  l.text,
                        segId: lsids ? (lsids[i] ?? null) : (elem.segIds[i] ?? l.segId ?? null),
                        _formulaText: l.formulaText ?? (this._hasFormulaToken(l.text) ? l.text : null),
                        lineGuid: String(l?.lineGuid ?? this._newGuid()),
                        _elem: null,
                    }));
                } else if (Array.isArray(elem.lines) && elem.lines.length > 0) {
                    // Direct structure restore (profileElements source-of-truth)
                    // should use incoming line texts as-is.
                    lines = elem.lines.map((l, i) => ({
                        text: String(l?.text ?? '').trim(),
                        segId: l?.segId ?? (elem.lineSegIds?.[i] ?? null),
                        _formulaText: this._hasFormulaToken(String(l?.text ?? '')) ? String(l?.text ?? '').trim() : null,
                        lineGuid: String(l?.lineGuid ?? this._newGuid()),
                        _elem: null,
                    }));
                } else {
                    lines = [];
                }
            }
            // Expanded-state restore priority:
            // 1) exact contourId match
            // 2) signature match (stable when contourId is regenerated)
            // 3) positional fallback
            const sig = this._contourSignatureFromLines(lines);
            const expanded = prevExpanded.has(cid)
                || (sig ? (prevExpandedBySig.get(sig) ?? false) : false)
                || (slot?.expanded ?? false);
            const incomingTransforms = Array.isArray(elem.transforms) ? [...elem.transforms] : null;
            const prevTransforms = prevTransformsByPathCid.get(cid) ?? (slot?.transforms ?? []);
            const transforms = incomingTransforms
                ? this._mergeTransformsWithFormulaPriority(prevTransforms, incomingTransforms)
                : prevTransforms;
            return {
                type: elem.type,
                contourId: cid,
                segIds: elem.segIds ?? [],
                groupId: this._optId(elem?.groupId ?? elem?.parentGroupId),
                expanded,
                lines,
                transforms,
                isSymmetry: !!elem.isSymmetry,
                parentContourId: this._optId(elem?.parentContourId),
                parentGroupId: this._optId(elem?.parentGroupId),
                axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
                _elem: null,
            };
        });

        // Rebuild _expandedContours from the resolved expanded flags.
        // This is critical when _importPath regenerated contourIds — without this,
        // the new cids would never appear in _expandedContours so the body stays hidden.
        this._expandedContours = new Set(
            this._elements
                .filter(e => (e.type === 'path' || e.type === 'polyline') && e.expanded)
                .map(e => e.contourId)
        );

        // Preserve active element across contourId regeneration (e.g. after _importPath).
        if (prevActiveElemId?.startsWith('shape:')) {
            const segId = prevActiveElemId.slice(6);
            const exists = this._elements.some(e =>
                (e.type === 'circle' || e.type === 'rect' || e.type === 'ellipse') && e.segId === segId);
            this._activeElemId = exists ? prevActiveElemId : null;
        } else if (prevActiveElemId?.startsWith('group:')) {
            const gid = Number(prevActiveElemId.slice(6));
            const exists = this._elements.some(e => e.type === 'group' && Number(e.groupId) === gid);
            this._activeElemId = exists ? prevActiveElemId : null;
        } else if (prevActiveElemId?.startsWith('path:')) {
            const prevActiveCid = Number(prevActiveElemId.slice(5));
            const hasExact = this._elements.some(e =>
                (e.type === 'path' || e.type === 'polyline') && e.contourId === prevActiveCid);
            if (hasExact) {
                this._activeElemId = prevActiveElemId;
            } else {
                const nextPathElems = this._elements.filter(e => e.type === 'path' || e.type === 'polyline');
                const fallback = prevActivePathPos >= 0 ? nextPathElems[prevActivePathPos] : null;
                this._activeElemId = fallback ? `path:${fallback.contourId}` : null;
            }
        }

        this._shapeDataSpace = incomingShapeSpace;
        this._renderElements();
        this._renderSuggestions();
    }

    /**
     * Build a `lines` array for a path element from a flat path string.
     * @param {string}   pathStr
     * @param {Array}    lineSegIds — segId per command (index-aligned, null for M/Z rows)
     * @param {string[]} segIds
     * @returns {Array<{text:string, segId:string|null, _elem:null}>}
     * @private
     */
    _buildLinesFromPath(pathStr, lineSegIds, segIds) {
        if (!pathStr) return [];
        return this._splitPathIntoCommands(pathStr).map((text, i) => ({
            text:  text.trim(),
            segId: lineSegIds[i] ?? null,
            _formulaText: null,
            lineGuid: this._newGuid(),
            _elem: null,
        }));
    }

    /** @private */
    _hasFormulaToken(text) {
        return typeof text === 'string' && /\{[^}]+\}/.test(text);
    }

    /**
     * True when a single parameter token should be treated as formula/expression.
     * Supports both `{var}` and plain math expressions like `(a+b)/2`.
     * @param {string} token
     * @returns {boolean}
     * @private
     */
    _isFormulaParamToken(token) {
        const t = String(token ?? '').trim();
        if (!t) return false;
        if (/\{[^}]+\}/.test(t)) return true;
        const numeric = Number(t);
        if (!Number.isNaN(numeric) && Number.isFinite(numeric)) return false;
        // Any non-numeric token is expression-like for parameter editing,
        // including plain variable names (e.g. width, H, var_1).
        return true;
    }

    /**
     * True when existing line text (possibly with formulas) evaluates to the same
     * command/params as the incoming line text.
     * @param {string} existingText
     * @param {string} incomingText
     * @returns {boolean}
     * @private
     */
    _shouldPreserveLineText(existingText, incomingText) {
        const oldParsed = this.parseLine(existingText || '');
        const newParsed = this.parseLine(incomingText || '');
        if (!oldParsed || !newParsed) return false;
        if (oldParsed.cmdUpper !== newParsed.cmdUpper) return false;
        if ((oldParsed.params?.length ?? 0) !== (newParsed.params?.length ?? 0)) return false;
        for (let i = 0; i < oldParsed.params.length; i++) {
            const oldTok = oldParsed.params[i];
            const newTok = newParsed.params[i];
            const oldVal = Number(this.evaluateToken(oldTok));
            const newVal = Number(this.evaluateToken(newTok));
            if (!isNaN(oldVal) && !isNaN(newVal)) {
                if (Math.abs(oldVal - newVal) > 1e-4) return false;
            } else if (String(oldTok).trim() !== String(newTok).trim()) {
                return false;
            }
        }
        return true;
    }

    /**
     * Compare two param tokens by evaluated numeric value when possible.
     * Falls back to strict text equality for non-numeric tokens.
     * @param {string} oldTok
     * @param {string} incomingTok
     * @returns {boolean}
     * @private
     */
    _paramTokenEquivalent(oldTok, incomingTok) {
        const oldVal = Number(this.evaluateToken(oldTok));
        const newVal = Number(this.evaluateToken(incomingTok));
        if (!isNaN(oldVal) && !isNaN(newVal)) return Math.abs(oldVal - newVal) <= 1e-4;
        return String(oldTok).trim() === String(incomingTok).trim();
    }

    /**
     * Compare two shape attribute tokens by evaluated numeric value when possible.
     * Falls back to strict text equality.
     * @param {string} oldTok
     * @param {string} incomingTok
     * @returns {boolean}
     * @private
     */
    _shapeTokenEquivalent(oldTok, incomingTok) {
        const oldVal = Number(this.evaluateToken(String(oldTok ?? '')));
        const newVal = Number(this.evaluateToken(String(incomingTok ?? '')));
        if (!isNaN(oldVal) && !isNaN(newVal)) return Math.abs(oldVal - newVal) <= 1e-4;
        return String(oldTok ?? '').trim() === String(incomingTok ?? '').trim();
    }

    /**
     * Preserve previous formula token for a shape attribute when value is equivalent.
     * @param {string} prevValue
     * @param {string} incomingValue
     * @returns {string}
     * @private
     */
    _chooseShapeAttrWithFormulaPriority(prevValue, incomingValue) {
        if (this._isFormulaParamToken(prevValue) && this._shapeTokenEquivalent(prevValue, incomingValue)) {
            return prevValue;
        }
        return incomingValue;
    }

    /**
     * Universal wrapper: keep previous formula token when evaluated value is unchanged.
     * @param {string} prevToken
     * @param {string} incomingToken
     * @returns {string}
     * @private
     */
    _chooseParamTokenWithFormulaPriority(prevToken, incomingToken) {
        if (this._isFormulaParamToken(prevToken) && this._paramTokenEquivalent(prevToken, incomingToken)) {
            return String(prevToken ?? '').trim();
        }
        return String(incomingToken ?? '').trim();
    }

    /**
     * Merge transform lists with parameter-level formula priority.
     * If structure differs, incoming list is used as-is.
     * @param {Array<object>} prevTransforms
     * @param {Array<object>} incomingTransforms
     * @returns {Array<object>}
     * @private
     */
    _mergeTransformsWithFormulaPriority(prevTransforms, incomingTransforms) {
        const prev = Array.isArray(prevTransforms) ? prevTransforms : [];
        const next = Array.isArray(incomingTransforms) ? incomingTransforms : [];

        if (prev.length !== next.length) {
            return next.map(t => ({
                ...(t ?? {}),
                type: String(t?.type ?? '').toUpperCase(),
                params: Array.isArray(t?.params) ? [...t.params] : [],
                raw: String(t?.raw ?? ''),
            }));
        }

        const out = [];
        for (let i = 0; i < next.length; i++) {
            const p = prev[i] ?? null;
            const n = next[i] ?? null;
            const pType = String(p?.type ?? '').toUpperCase();
            const nType = String(n?.type ?? '').toUpperCase();
            const pParams = Array.isArray(p?.params) ? p.params : [];
            const nParams = Array.isArray(n?.params) ? n.params : [];

            if (!n || pType !== nType || pParams.length !== nParams.length) {
                out.push({
                    ...(n ?? {}),
                    type: nType,
                    params: [...nParams],
                    raw: String(n?.raw ?? ''),
                });
                continue;
            }

            const mergedParams = nParams.map((tok, idx) =>
                this._chooseParamTokenWithFormulaPriority(pParams[idx], tok)
            );
            const raw = mergedParams.length > 0
                ? `MOD ${nType} ${mergedParams.join(' ')}`
                : `MOD ${nType}`;
            out.push({ ...n, type: nType, params: mergedParams, raw });
        }
        return out;
    }

    /**
     * Merge line text with parameter-level formula priority.
     * Preserves formula tokens for unchanged parameters even if other parameters
     * on the same command changed (e.g. moving arc keeps radius formula while x/y change).
     *
     * @param {string|null} currentText
     * @param {string|null} formulaText
     * @param {string} incomingText
     * @returns {string}
     * @private
     */
    _mergeLineTextPreferFormula(currentText, formulaText, incomingText) {
        const inParsed = this.parseLine(incomingText || '');
        if (!inParsed) return incomingText;

        const curParsed = currentText ? this.parseLine(currentText) : null;
        const frmParsed = formulaText ? this.parseLine(formulaText) : null;

        const compatible = (p) => p && p.cmdUpper === inParsed.cmdUpper
            && (p.params?.length ?? 0) === (inParsed.params?.length ?? 0);

        if (!compatible(curParsed) && !compatible(frmParsed)) return incomingText;

        const mergedParams = inParsed.params.map((inTok, i) => {
            const curTok = compatible(curParsed) ? curParsed.params[i] : null;
            const frmTok = compatible(frmParsed) ? frmParsed.params[i] : null;
            if (curTok != null && this._paramTokenEquivalent(curTok, inTok)) return curTok;
            if (frmTok != null && this._paramTokenEquivalent(frmTok, inTok)) return frmTok;
            return inTok;
        });

        return mergedParams.length > 0 ? `${inParsed.cmd} ${mergedParams.join(' ')}` : inParsed.cmd;
    }

    /**
     * Choose text with formula priority: current text, then formula backup, then incoming.
     * @param {string|null} currentText
     * @param {string|null} formulaText
     * @param {string} incomingText
     * @returns {string}
     * @private
     */
    _chooseLineTextWithFormulaPriority(currentText, formulaText, incomingText) {
        return this._mergeLineTextPreferFormula(currentText, formulaText, incomingText);
    }

    /**
     * Build a stable contour signature from command texts.
     * Numeric values are ignored; only command flow matters.
     * @param {string[]} cmds
     * @returns {string}
     * @private
     */
    _contourSignatureFromCommands(cmds) {
        if (!Array.isArray(cmds) || cmds.length === 0) return '';
        return cmds.map(cmdText => {
            const parsed = this.parseLine(cmdText || '');
            if (!parsed) return '?';
            return `${parsed.cmdUpper}:${parsed.params?.length ?? 0}`;
        }).join('|');
    }

    /**
     * Build contour signature from line descriptors.
     * @param {Array<{text:string}>} lines
     * @returns {string}
     * @private
     */
    _contourSignatureFromLines(lines) {
        return this._contourSignatureFromCommands((lines ?? []).map(l => l?.text ?? ''));
    }

    /**
     * Update variable values; re-renders all sub-line cells.
     * @param {Object} values
     */
    setVariableValues(values) {
        this.variableValues = values || {};
        this._recomputeShapeDataFromTokens();
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                for (const line of elem.lines) {
                    if (line._elem) this._buildLineCellsInElem(line._elem, line, elem);
                }
            }
        }
        this._fireOnChange();
        this._renderSuggestions();
    }

    /**
     * Re-evaluate shape numeric data from currently stored raw tokens/formulas.
     * Keeps formulas in `_expr` / `radiusExpr` while updating concrete geometry
     * for the active variable set.
     * @private
     */
    _recomputeShapeDataFromTokens() {
        for (const elem of this._elements) {
            if (!(elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse')) continue;
            const def = PathEditor.SHAPE_DEFS[elem.type];
            if (!def) continue;

            const nextData = { ...(elem.data ?? {}) };
            for (const attrKey of def.attrs) {
                const token = this._shapeAttrValue(elem.type, nextData, attrKey);
                if (token == null || String(token).trim() === '') continue;
                const changes = this._shapeAttrToChanges(elem.type, nextData, attrKey, String(token));
                Object.assign(nextData, changes);
            }

            if (elem.type === 'circle') {
                const center = nextData.center ?? elem.data?.center ?? { x: 0, y: 0 };
                const radius = Number(nextData.radius ?? elem.data?.radius ?? 0);
                const prevPt3 = nextData.pt3 ?? elem.data?.pt3 ?? { x: center.x + radius, y: center.y };
                const dx = Number(prevPt3?.x) - center.x;
                const dy = Number(prevPt3?.y) - center.y;
                const ang = Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > 1e-9
                    ? Math.atan2(dy, dx)
                    : 0;
                nextData.pt3 = {
                    x: center.x + Math.cos(ang) * radius,
                    y: center.y + Math.sin(ang) * radius,
                };
            }

            elem.data = nextData;
        }
    }

    /** @returns {Array<{varName:string, name:string, value:*}>} */
    getAvailableVariables() {
        return Object.keys(this.variableValues).map(varName => ({
            varName, name: varName, value: this.variableValues[varName],
        }));
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    /** @private */
    _renderElements() {
        this.elementsContainer.innerHTML = '';
        let topIndex = 0;
        const rowNoByContour = new Map();
        const rowNoByGroup = new Map();
        const embeddedCountByContour = new Map();
        const childCountByGroup = new Map();

        for (const elem of this._elements) {
            if (!this._isElementVisibleUnderGroupCollapse(elem)) continue;

            const parentGroup = this._resolveParentGroupById(elem);
            const parentGroupId = Number(parentGroup?.groupId) || null;
            const parentCid = this._optId(elem?.parentContourId);
            const isEmbeddedShape = PathEditor.isShapeType(elem?.type)
                && Number.isFinite(parentCid)
                && rowNoByContour.has(parentCid);

            let rowLabel = '';
            if (isEmbeddedShape) {
                const base = rowNoByContour.get(parentCid);
                const nextSub = (embeddedCountByContour.get(parentCid) ?? 0) + 1;
                embeddedCountByContour.set(parentCid, nextSub);
                rowLabel = `${base}.${nextSub}`;
                elem._isEmbeddedVisual = true;
            } else {
                elem._isEmbeddedVisual = false;
                if (Number.isFinite(parentGroupId) && rowNoByGroup.has(parentGroupId)) {
                    const nextChild = (childCountByGroup.get(parentGroupId) ?? 0) + 1;
                    childCountByGroup.set(parentGroupId, nextChild);
                    rowLabel = `${rowNoByGroup.get(parentGroupId)}.${nextChild}`;
                } else {
                    topIndex += 1;
                    rowLabel = String(topIndex);
                }
            }

            if (elem.type === 'group') rowNoByGroup.set(Number(elem.groupId), rowLabel);
            if (elem.type === 'path' || elem.type === 'polyline') rowNoByContour.set(Number(elem.contourId), rowLabel);

            if (elem.type === 'group') elem._elem = this._buildGroupRow(elem, rowLabel);
            else if (PathEditor.isShapeType(elem.type)) {
                elem._inSymmetryGroup = this._isInSymmetryGroup(elem);
                elem._elem = this._buildShapeRow(elem, rowLabel);
            } else {
                elem._inSymmetryGroup = this._isInSymmetryGroup(elem);
                elem._elem = this._buildPathGroup(elem, rowLabel);
            }

            const depth = this._getGroupDepth(elem);
            if (elem._elem) elem._elem.style.marginLeft = depth > 0 ? `${depth * 14}px` : '';
            this.elementsContainer.appendChild(elem._elem);
        }
    }

    /** @private */
    _isElementVisibleUnderGroupCollapse(elem) {
        let parent = this._resolveParentGroupById(elem);
        const seen = new Set();
        while (parent && !seen.has(Number(parent.groupId))) {
            seen.add(Number(parent.groupId));
            if (parent.expanded === false) return false;
            parent = this._resolveParentGroupById(parent);
        }
        return true;
    }

    /**
     * Compute nesting depth by following parentGroupId chain.
     * @param {object} elem
     * @returns {number}
     * @private
     */
    _getGroupDepth(elem) {
        let depth = 0;
        let parent = this._resolveParentGroupById(elem);
        const seen = new Set();
        while (parent && !seen.has(Number(parent.groupId))) {
            seen.add(Number(parent.groupId));
            depth += 1;
            parent = this._resolveParentGroupById(parent);
        }
        return depth;
    }

    /**
     * Return true when any ancestor group of `elem` has `linkType='symmetry'`.
     * Used to render children of a symmetry group as read-only.
     * @param {object} elem
     * @returns {boolean}
     * @private
     */
    _isInSymmetryGroup(elem) {
        let parent = this._resolveParentGroupById(elem);
        const seen = new Set();
        while (parent && !seen.has(Number(parent.groupId))) {
            seen.add(Number(parent.groupId));
            if (String(parent?.linkType ?? '') === 'symmetry') return true;
            parent = this._resolveParentGroupById(parent);
        }
        return false;
    }

    /**
     * Build a group row element.
     * @param {{type:'group', groupId:number, name:string, linkType?:string}} elem
     * @param {string|number} rowNum
     * @returns {HTMLElement}
     * @private
     */
    _buildGroupRow(elem, rowNum) {
        const isSymmetryGroup = String(elem?.linkType ?? '') === 'symmetry';
        const wrap = document.createElement('div');
        wrap.className = 'pe-path-wrap';

        const row = document.createElement('div');
        row.className = isSymmetryGroup
            ? 'path-line pe-elem pe-elem-symmetry pe-path-header pe-elem-group-symmetry'
            : 'path-line pe-elem pe-elem-group pe-path-header';
        row.draggable = !isSymmetryGroup;
        row.dataset.groupId = String(elem.groupId);

        const numEl = document.createElement('span');
        numEl.className = 'path-line-number';
        numEl.textContent = String(rowNum ?? '');
        row.appendChild(numEl);

        const expanded = elem.expanded !== false;
        elem.expanded = expanded;
        const expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.className = isSymmetryGroup
            ? 'path-cell path-cell-cmd pe-type-symmetry'
            : 'path-cell path-cell-cmd pe-type-group';
        expandBtn.textContent = isSymmetryGroup
            ? `Symmetry ${expanded ? '▼' : '►'}`
            : `Group ${expanded ? '▼' : '►'}`;
        expandBtn.title = isSymmetryGroup ? 'Symmetry group (read-only)' : 'Group';
        row.appendChild(expandBtn);

        this._appendElemModCells(elem, row);

        if (isSymmetryGroup) {
            // Symmetry groups: show a read-only name param cell (source group name)
            const nameCell = document.createElement('span');
            nameCell.className = 'path-cell path-cell-param pe-symmetry-label';
            nameCell.textContent = String(elem.name ?? '');
            nameCell.title = `Symmetry of: ${String(elem.name ?? '')}` + ' (read-only)';
            row.appendChild(nameCell);
        } else {
            const nameCell = document.createElement('button');
            nameCell.type = 'button';
            const nameVal = String(elem.name ?? '').trim();
            nameCell.className = 'path-cell path-cell-param' + (nameVal ? '' : ' cell-empty');
            nameCell.dataset.groupName = '1';
            nameCell.textContent = nameVal || `Group ${elem.groupId}`;
            nameCell.title = nameCell.textContent;
            nameCell.addEventListener('click', (e) => {
                e.stopPropagation();
                this._activateGroupNameEdit(elem, nameCell);
            });
            row.appendChild(nameCell);
        }

        const body = document.createElement('div');
        body.className = 'pe-path-body';
        body.style.display = expanded ? '' : 'none';

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'path-line-delete';
        delBtn.title = isSymmetryGroup ? 'Delete symmetry group' : 'Delete group';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const gid = Number(elem.groupId);
            if (isSymmetryGroup) {
                // Delete the entire symmetry group and all its children
                this._deleteSymmetryGroup(gid);
                return;
            }
            const parentGroup = this._resolveParentGroupById(elem);
            const parentGid = Number(parentGroup?.groupId) || null;
            const parentGuid = String(parentGroup?.guid ?? '') || null;
            this._elements = this._elements
                .filter(item => Number(item?.groupId) !== gid)
                .map((item) => {
                    if (Number(item?.parentGroupId) !== gid) return item;
                    return { ...item, parentGroupId: parentGid, parentGroupGuid: parentGuid };
                });
            this._pruneEmptyGroups();
            this._renderElements();
            this._emitTopLevelOrder();
        });
        row.appendChild(delBtn);

        row.addEventListener('click', (e) => {
            if (e.target.closest('.path-cell') || e.target.closest('.path-line-delete')) return;
            if (isSymmetryGroup) return; // symmetry group header is not selectable
            const rowRef = this._getTopLevelRef(elem);
            this._applyTopLevelSelection(row, rowRef, e);
            this._setActiveElem(`group:${elem.groupId}`);
            if (this.onGroupElemClick) {
                const selectedSegIds = this._collectSelectedTopLevelSegIds();
                this.onGroupElemClick(selectedSegIds, e);
            }
        });

        row.addEventListener('contextmenu', (e) => {
            if (!isSymmetryGroup) return;
            e.preventDefault();
            e.stopPropagation();
            this._convertSymmetryGroupToGroup(Number(elem.groupId));
        });

        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elem.expanded = !elem.expanded;
            expandBtn.textContent = isSymmetryGroup
                ? `Symmetry ${elem.expanded ? '▼' : '►'}`
                : `Group ${elem.expanded ? '▼' : '►'}`;
            this._renderElements();
        });

        if (!isSymmetryGroup) this._attachElemDrag(row, elem);
        wrap.appendChild(row);
        wrap.appendChild(body);
        return wrap;
    }

    /**
     * Delete a symmetry group and all its direct children from `_elements`.
     * Fires `onDeleteSymmetryGroup(groupId)` so the host can also remove the
     * associated segments from the editor state.
     *
     * @param {number} groupId
     * @private
     */
    _deleteSymmetryGroup(groupId) {
        const gid = Number(groupId);
        if (!Number.isFinite(gid)) return;
        const dropGroupIds = new Set([gid]);
        let grown = true;
        while (grown) {
            grown = false;
            for (const item of this._elements) {
                if (item?.type !== 'group') continue;
                const itemGid = Number(item?.groupId);
                const parentGid = Number(item?.parentGroupId);
                if (!Number.isFinite(itemGid) || !Number.isFinite(parentGid)) continue;
                if (!dropGroupIds.has(parentGid) || dropGroupIds.has(itemGid)) continue;
                dropGroupIds.add(itemGid);
                grown = true;
            }
        }
        this._elements = this._elements.filter(item => {
            if (item?.type === 'group' && dropGroupIds.has(Number(item?.groupId))) return false;
            if (dropGroupIds.has(Number(item?.parentGroupId))) return false;
            return true;
        });
        this._renderElements();
        if (this.onDeleteSymmetryGroup) {
            this.onDeleteSymmetryGroup(gid);
        } else {
            this._emitTopLevelOrder();
        }
    }

    /**
     * Convert a symmetry group into a regular editable group (break source link).
     * @param {number} groupId
     * @private
     */
    _convertSymmetryGroupToGroup(groupId) {
        const gid = Number(groupId);
        if (!Number.isFinite(gid)) return;

        const target = this._elements.find(e => e?.type === 'group' && Number(e?.groupId) === gid) ?? null;
        if (!target || String(target?.linkType ?? '') !== 'symmetry') return;

        const groupIds = new Set([gid]);
        let grown = true;
        while (grown) {
            grown = false;
            for (const item of this._elements) {
                if (item?.type !== 'group') continue;
                const itemGid = Number(item?.groupId);
                const parentGid = Number(item?.parentGroupId);
                if (!Number.isFinite(itemGid) || !Number.isFinite(parentGid)) continue;
                if (!groupIds.has(parentGid) || groupIds.has(itemGid)) continue;
                groupIds.add(itemGid);
                grown = true;
            }
        }

        this._elements = this._elements.map((item) => {
            if (item?.type === 'group' && groupIds.has(Number(item?.groupId))) {
                return {
                    ...item,
                    linkType: null,
                    sourceGroupId: null,
                    sourceGroupGuid: null,
                    axis: null,
                };
            }
            if (!groupIds.has(Number(item?.parentGroupId))) return item;

            if (item?.type === 'path' || item?.type === 'polyline') {
                return {
                    ...item,
                    isSymmetry: false,
                    parentContourId: null,
                    linkType: null,
                    axis: null,
                };
            }
            if (item?.type === 'circle' || item?.type === 'rect' || item?.type === 'ellipse') {
                return {
                    ...item,
                    linkType: null,
                    axis: null,
                };
            }
            return item;
        });

        this._renderElements();
        if (this.onConvertSymmetryGroup) {
            this.onConvertSymmetryGroup(gid);
        } else {
            this._emitTopLevelOrder();
        }
    }

    /**
     * Build a shape element row (circle / rect / ellipse).
     * @param {{type:string, segId:string, data:object, _elem:null}} elem
    * @param {string|number} rowNum
     * @returns {HTMLElement}
     * @private
     */
    _buildShapeRow(elem, rowNum) {
        const def = PathEditor.SHAPE_DEFS[elem.type];
        if (!def) return document.createElement('div');
        const isReadOnly = !!elem?._inSymmetryGroup || String(elem?.linkType ?? '') === 'symmetry';

        const row = document.createElement('div');
        row.className = `path-line pe-elem pe-elem-${elem.type}`;
        if (isReadOnly) row.classList.add('pe-sub-line-readonly');
        if (elem?._isEmbeddedVisual) row.classList.add('pe-shape-embedded');
        row.draggable = !isReadOnly;
        row.dataset.segId = elem.segId;
        if (elem?._isEmbeddedVisual && Number.isFinite(this._optId(elem?.parentContourId))) {
            row.dataset.parentContourId = String(this._optId(elem.parentContourId));
        }

        // Line number
        const numEl = document.createElement('span');
        numEl.className = 'path-line-number';
        numEl.textContent = String(rowNum ?? '');
        row.appendChild(numEl);

        // Type command button
        const typeBtn = document.createElement('button');
        typeBtn.type = 'button';
        typeBtn.className = `path-cell path-cell-cmd pe-type-${elem.type}`;
        typeBtn.textContent = def.label;
        typeBtn.title = isReadOnly ? `${def.label} (read-only symmetry)` : def.label;
        row.appendChild(typeBtn);

        this._appendElemModCells(elem, row);

        // Attribute param cells
        for (const attrKey of def.attrs) {
            const val = this._shapeAttrDisplayValue(elem.type, elem.data, attrKey);
            if (val === '' && (attrKey === 'rx' || attrKey === 'ry')) continue;

            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'path-cell path-cell-param' + (val ? '' : ' cell-empty');
            cell.dataset.attr = attrKey;
            this._setParamCellTitle(cell, attrKey, val);
            cell.textContent = val || attrKey;
            if (isReadOnly) {
                cell.disabled = true;
                cell.title = `${attrKey}: ${val || ''} (read-only symmetry)`;
            } else {
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._activateShapeParamEdit(elem, attrKey, cell);
                });
            }
            row.appendChild(cell);
        }

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'path-line-delete';
        delBtn.title = isReadOnly ? 'Read-only symmetry' : 'Delete';
        delBtn.textContent = '×';
        if (isReadOnly) {
            delBtn.disabled = true;
        } else {
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Remove from elements list unconditionally (covers preview mode).
                const idx = this._elements.indexOf(elem);
                if (idx !== -1) this._elements.splice(idx, 1);
                // Notify external handler (editor mode: will delete canvas segment).
                if (this.onShapeElementChange) this.onShapeElementChange(elem.segId, null);
                // Re-render and propagate the change.
                this._renderElements();
                this._fireOnChange();
            });
        }
        row.appendChild(delBtn);

        // Row click → select + activate
        row.addEventListener('click', (e) => {
            if (e.target.closest('.path-cell') || e.target.closest('.path-line-delete')) return;
            const rowRef = this._getTopLevelRef(elem);
            this._applyTopLevelSelection(row, rowRef, e);
            this._setActiveElem(`shape:${elem.segId}`);
            if (this.onShapeElementClick) {
                const selectedSegIds = this._collectSelectedTopLevelSegIds();
                this.onShapeElementClick(elem.segId, e, selectedSegIds);
            }
        });

        row.addEventListener('contextmenu', (e) => {
            if (isReadOnly) return;
            if (!this.onToPathRequest) return;
            e.preventDefault();
            e.stopPropagation();
            if (!row.classList.contains('path-line-selected')) {
                this.clearAllSelection();
                row.classList.add('path-line-selected');
            }
            this._setActiveElem(`shape:${elem.segId}`);
            const selectedSegIds = this._collectSelectedTopLevelSegIds();
            this.onToPathRequest(selectedSegIds, e);
        });

        // Drag to reorder top-level elements
        if (!isReadOnly) this._attachElemDrag(row, elem);

        return row;
    }

    /**
     * Return a flat ordered list of all visible sub-line entries across all
     * path/polyline elements.  Used by SHIFT+click range-select logic.
     * @returns {Array<{data:object, el:HTMLElement, parentElem:object}>}
     * @private
     */
    _getAllSubLines() {
        const result = [];
        for (const elem of this._elements) {
            if ((elem.type === 'path' || elem.type === 'polyline') && elem.expanded) {
                for (const line of elem.lines) {
                    if (line._elem) {
                        result.push({
                            data: line,
                            el: line._elem,
                            parentElem: elem,
                            ref: this._getLineRef(line, elem),
                        });
                    }
                }
            }
        }
        return result;
    }

    /**
     * Build a stable reference for a sub-line that survives setElements rebuilds.
     * Prefers segId; falls back to contour+line index for M/Z rows.
     * @param {{segId:string|null}} lineData
     * @param {object} parentElem
     * @returns {string|number|null}
     * @private
     */
    _getLineRef(lineData, parentElem) {
        if (lineData?.segId != null) return lineData.segId;
        const idx = parentElem?.lines?.indexOf(lineData) ?? -1;
        if (idx < 0) return null;
        return `cid:${parentElem.contourId}:idx:${idx}`;
    }

    /**
     * Stable selectable id for a line: real segId when available,
     * otherwise synthetic `m:<contourId>` for move rows.
     * @param {{text:string, segId:string|null}} lineData
     * @param {object} parentElem
     * @returns {string|null}
     * @private
     */
    _getSelectableLineId(lineData, parentElem) {
        if (lineData?.segId != null && String(lineData.segId).trim() !== '') {
            return String(lineData.segId);
        }
        const parsed = this.parseLine(String(lineData?.text ?? ''));
        if (parsed?.cmdUpper === 'M' && Number.isFinite(Number(parentElem?.contourId))) {
            return `m:${Number(parentElem.contourId)}`;
        }
        return null;
    }

    /**
     * Build a stable top-level row reference for shape/path element.
     * @param {object} elem
     * @returns {string|null}
     * @private
     */
    _getTopLevelRef(elem) {
        if (!elem) return null;
        if (elem.type === 'path' || elem.type === 'polyline') return `path:${elem.contourId}`;
        if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') return `shape:${elem.segId}`;
        if (elem.type === 'group') return `group:${elem.groupId}`;
        return null;
    }

    /**
     * Return top-level row descriptors in visual order.
     * @returns {Array<{ref:string, elem:object, rowEl:HTMLElement|null}>}
     * @private
     */
    _getAllTopLevelRows() {
        const rows = [];
        for (const elem of this._elements) {
            const ref = this._getTopLevelRef(elem);
            if (!ref) continue;
            const rowEl = this._getTopLevelRowElement(elem);
            rows.push({ ref, elem, rowEl });
        }
        return rows;
    }

    /**
     * Collect selected segIds represented by selected top-level rows.
     * @returns {string[]}
     * @private
     */
    _collectSelectedTopLevelSegIds() {
        const segIds = [];
        for (const { elem, rowEl } of this._getAllTopLevelRows()) {
            if (!rowEl?.classList.contains('path-line-selected')) continue;
            if (elem.type === 'path' || elem.type === 'polyline') {
                if (Array.isArray(elem.segIds)) segIds.push(...elem.segIds);
            } else if (elem.segId) {
                segIds.push(elem.segId);
            } else if (elem.type === 'group') {
                const gid = Number(elem.groupId);
                const collect = (groupId) => {
                    const groupItems = this._elements.filter((item) => Number(this._resolveParentGroupById(item)?.groupId) === groupId);
                    for (const item of groupItems) {
                        if (item.type === 'path' || item.type === 'polyline') {
                            if (Array.isArray(item.segIds)) segIds.push(...item.segIds);
                        } else if (item.segId) {
                            segIds.push(item.segId);
                        } else if (item.type === 'group') {
                            collect(Number(item.groupId));
                        }
                    }
                };
                collect(gid);
            }
        }
        return [...new Set(segIds.filter(Boolean))];
    }

    /**
     * Apply click-selection semantics for a top-level PathEditor row.
     *
     * Modifier behaviour:
     *   - **Ctrl/Meta** — toggle the clicked row. When *deselecting*, also clears any
     *     ancestor group rows so `_expandSelectionToGroups` cannot re-highlight the
     *     intentionally-removed item on the next expand pass.
     *   - **Shift** — range-select from the last anchor row.
     *   - **No modifier** — exclusive single selection (toggle off if already selected).
     *
     * Always finishes by calling `_expandSelectionToGroups` to highlight subtree members
     * of any newly-selected group rows.
     *
     * @param {HTMLElement} rowEl
     * @param {string} clickedRef
     * @param {MouseEvent} e
     * @private
     */
    _applyTopLevelSelection(rowEl, clickedRef, e) {
        const isAlreadySelected = rowEl.classList.contains('path-line-selected');
        if (e?.ctrlKey || e?.metaKey) {
            if (isAlreadySelected) {
                rowEl.classList.remove('path-line-selected');
                // If this row was a descendant of a selected group, also deselect
                // that ancestor group — otherwise _expandSelectionToGroups would
                // immediately re-highlight this row on the next expand pass.
                const elem = this._elements.find(el => this._getTopLevelRef(el) === clickedRef);
                if (elem) {
                    let parent = this._resolveParentGroupById(elem);
                    const seen = new Set();
                    while (parent && !seen.has(Number(parent.groupId))) {
                        const parentRow = this._getTopLevelRowElement(parent);
                        if (parentRow?.classList.contains('path-line-selected')) {
                            parentRow.classList.remove('path-line-selected');
                        }
                        seen.add(Number(parent.groupId));
                        parent = this._resolveParentGroupById(parent);
                    }
                }
            } else {
                rowEl.classList.add('path-line-selected');
            }
        } else if (e?.shiftKey && this._lastSelectedElemRef) {
            const rows = this._getAllTopLevelRows();
            const from = rows.findIndex(r => r.ref === this._lastSelectedElemRef);
            const to   = rows.findIndex(r => r.ref === clickedRef);
            if (from !== -1 && to !== -1) {
                const lo = Math.min(from, to), hi = Math.max(from, to);
                for (let i = lo; i <= hi; i++) rows[i].rowEl?.classList.add('path-line-selected');
            }
        } else {
            if (isAlreadySelected) {
                this.clearAllSelection();
            } else {
                this.clearAllSelection();
                rowEl.classList.add('path-line-selected');
            }
        }
        this._lastSelectedElemRef = clickedRef;
        this._expandSelectionToGroups();
    }

    /**
     * Expand current selected top-level rows to whole group subtree(s).
     * @private
     */
    _expandSelectionToGroups() {
        const selectedRows = this._getAllTopLevelRows()
            .filter(r => r.rowEl?.classList.contains('path-line-selected'));
        if (selectedRows.length === 0) return;

        const manuallySelectedRefs = new Set(selectedRows.map(r => r.ref));

        // Collect IDs of selected group rows — these are the roots to expand from.
        const selectedGroupIds = new Set();
        for (const { elem } of selectedRows) {
            if (elem?.type !== 'group') continue;
            const gid = Number(elem.groupId);
            if (Number.isFinite(gid)) selectedGroupIds.add(gid);
        }
        if (selectedGroupIds.size === 0) return;

        const isDescendantOfRoot = (elem, rootGid) => {
            if (!elem) return false;
            if (elem.type === 'group' && Number(elem.groupId) === rootGid) return true;
            let parent = this._resolveParentGroupById(elem);
            const seen = new Set();
            while (parent && !seen.has(Number(parent.groupId))) {
                const gid = Number(parent.groupId);
                if (gid === rootGid) return true;
                seen.add(gid);
                parent = this._resolveParentGroupById(parent);
            }
            return false;
        };

        const rows = this._getAllTopLevelRows();
        for (const row of rows) {
            const shouldSelect = [...selectedGroupIds].some(root => isDescendantOfRoot(row.elem, root));
            if (shouldSelect) {
                row.rowEl?.classList.add('path-line-selected');
                if (row.elem?.type === 'path' || row.elem?.type === 'polyline') {
                    for (const line of (row.elem.lines ?? [])) {
                        line?._elem?.classList.add('path-line-selected');
                    }
                }
            } else if (!manuallySelectedRefs.has(row.ref)) {
                row.rowEl?.classList.remove('path-line-selected');
                if (row.elem?.type === 'path' || row.elem?.type === 'polyline') {
                    for (const line of (row.elem.lines ?? [])) {
                        line?._elem?.classList.remove('path-line-selected');
                    }
                }
            }
        }
    }

    /**
     * Return selected sub-lines as stable refs (segment ids or synthetic m:<contourId>).
     * @returns {Array<string>}
     * @private
     */
    _collectSelectedLineRefs() {
        const refs = [];
        for (const elem of this._elements) {
            if (elem.type !== 'path' && elem.type !== 'polyline') continue;
            for (const line of (elem.lines ?? [])) {
                if (!line?._elem?.classList.contains('path-line-selected')) continue;
                const ref = this._getSelectableLineId(line, elem);
                if (ref) refs.push(ref);
            }
        }
        return [...new Set(refs)];
    }

    /**
     * Collect selected sub-line indices for a specific path element.
     * @param {object} parentElem
     * @returns {number[]}
     * @private
     */
    _collectSelectedLineIndices(parentElem) {
        const out = [];
        if (!parentElem || (parentElem.type !== 'path' && parentElem.type !== 'polyline')) return out;
        for (let i = 0; i < (parentElem.lines?.length ?? 0); i++) {
            if (parentElem.lines[i]?._elem?.classList.contains('path-line-selected')) out.push(i);
        }
        return out.sort((a, b) => a - b);
    }

    /**
     * Detect path/polyline elements that are intentionally kept in editor text form
     * and are not yet representable as drawable segments in canvas state.
     * Examples: empty contour, `M ...`, `M ... Z`.
     * @returns {boolean}
     */
    hasPlaceholderContours() {
        return this._elements.some(elem => {
            if (elem.type !== 'path' && elem.type !== 'polyline') return false;
            if (!elem.lines?.length) return true;
            return elem.lines.every(line => {
                const parsed = this.parseLine(line.text || '');
                if (!parsed) return true;
                const cmd = parsed.cmdUpper;
                return cmd === 'M' || cmd === 'Z';
            });
        });
    }

    /**
     * Classify a contour's display label based on command content.
     * Returns 'Path' if any arcs/curves are present, otherwise 'Polyline'.
     * @param {Array<{text:string}>} lines
     * @returns {string}
     * @private
     */
    _classifyContourLabel(lines) {
        if (!Array.isArray(lines) || lines.length === 0) return 'Polyline';
        for (const line of lines) {
            const parsed = this.parseLine(line.text || '');
            if (!parsed) continue;
            const cmd = parsed.cmdUpper;
            if (cmd === 'A' || cmd === 'C' || cmd === 'S' || cmd === 'Q' || cmd === 'T') {
                return 'Path';
            }
        }
        return 'Polyline';
    }

    /**
     * Build a path / polyline group row (collapsible header + sub-lines).
     * @param {{type:string, contourId:number, segIds:string[], expanded:boolean, lines:Array, _elem:null}} elem
    * @param {string|number} rowNum
     * @returns {HTMLElement}
     * @private
     */
    _buildPathGroup(elem, rowNum) {
        const type  = elem.type;
        const isSymmetry = !!elem.isSymmetry;
        const inSymGroup = !!elem._inSymmetryGroup;
        const isReadOnlyElem = isSymmetry || inSymGroup;
        const label = isReadOnlyElem && !inSymGroup ? 'Symmetry' : this._classifyContourLabel(elem.lines);

        // Outer container (grouping wrapper, not pe-elem itself)
        const wrap = document.createElement('div');
        wrap.className = 'pe-path-wrap';

        // ── Collapsible header row (looks like a command row) ────────────────────────────────
        const header = document.createElement('div');
        header.className = `path-line pe-elem pe-elem-${isSymmetry ? 'symmetry' : type} pe-path-header`;
        header.draggable = true;
        header.dataset.contourId = String(elem.contourId);

        const numEl = document.createElement('span');
        numEl.className = 'path-line-number';
        numEl.textContent = String(rowNum ?? '');
        header.appendChild(numEl);

        const expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.className = `path-cell path-cell-cmd pe-type-${(isSymmetry && !inSymGroup) ? 'symmetry' : type}`;
        expandBtn.textContent = label + (elem.expanded ? ' ▼' : ' ►');
        // Store label for live updates
        expandBtn.dataset.baseLabel = label;
        header.appendChild(expandBtn);

        this._appendElemModCells(elem, header);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'path-line-delete';
        delBtn.title = isReadOnlyElem ? 'Delete path (part of symmetry)' : (isSymmetry ? 'Delete symmetry' : 'Delete path');
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isReadOnlyElem) return; // read-only: delete disallowed
            const idx = this._elements.indexOf(elem);
            if (idx !== -1) this._elements.splice(idx, 1);
            for (const segId of elem.segIds) {
                if (this.onShapeElementChange) this.onShapeElementChange(segId, null);
            }
            this._renderElements();
            this._fireOnChange();
        });
        header.appendChild(delBtn);

        // ── Sub-line body ────────────────────────────────────────────────────────────────────
        const body = document.createElement('div');
        body.className = 'pe-path-body';
        body.style.display = elem.expanded ? '' : 'none';

        for (const lineData of elem.lines) {
            const subEl = this._buildSubLine(lineData, elem);
            lineData._elem = subEl;
            body.appendChild(subEl);
        }

        if (!isReadOnlyElem) {
            const endDrop = document.createElement('div');
            endDrop.className = 'path-line pe-sub-line pe-sub-line-drop-end';
            endDrop.title = 'Drop here to append at end';

            endDrop.addEventListener('dragover', (e) => {
                if (!this._dragState) return;
                if (!this._dragState.isElem) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    endDrop.classList.add('pe-sub-line-drag-over');
                    return;
                }
                const fromIndices = Array.isArray(this._dragState?.fromIndices)
                    ? this._dragState.fromIndices
                    : [this._dragState?.fromIndex];
                const movedElems = fromIndices.map(i => this._elements[i]).filter(Boolean);
                const singlePath = movedElems.length === 1
                    && (movedElems[0]?.type === 'path' || movedElems[0]?.type === 'polyline');
                if (!singlePath) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                endDrop.classList.add('pe-sub-line-drag-over');
            });

            endDrop.addEventListener('dragleave', () => {
                endDrop.classList.remove('pe-sub-line-drag-over');
            });

            endDrop.addEventListener('drop', (e) => {
                e.preventDefault();
                endDrop.classList.remove('pe-sub-line-drag-over');
                if (!this._dragState) return;

                if (!this._dragState.isElem) {
                    const sourceElem = this._dragState.parentElem;
                    const fromIndices = Array.isArray(this._dragState?.fromIndices)
                        ? this._dragState.fromIndices
                        : [this._dragState?.fromIndex];
                    this._moveSubLineAcrossPaths(sourceElem, fromIndices, elem, elem.lines.length);
                    return;
                }

                const fromIndices = Array.isArray(this._dragState?.fromIndices)
                    ? this._dragState.fromIndices
                    : [this._dragState?.fromIndex];
                const movedElems = fromIndices.map(i => this._elements[i]).filter(Boolean);
                const sourcePath = movedElems.length === 1
                    && (movedElems[0]?.type === 'path' || movedElems[0]?.type === 'polyline')
                    ? movedElems[0]
                    : null;
                if (!sourcePath || sourcePath === elem) return;
                this._insertWholePathIntoPath(sourcePath, elem, elem.lines.length);
            });

            body.appendChild(endDrop);
        }

        // Expand button click → toggle collapsed/expanded ONLY.
        // Must happen BEFORE any callback that may trigger setElements() → DOM rebuild,
        // because after a rebuild the local expandBtn/body vars point to detached nodes.
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // don't bubble to header click handler
            elem.expanded = !elem.expanded;
            const currentLabel = isSymmetry ? 'Symmetry' : this._classifyContourLabel(elem.lines);
            expandBtn.textContent = currentLabel + (elem.expanded ? ' ▼' : ' ►');
            body.style.display = elem.expanded ? '' : 'none';
            if (elem.expanded) this._expandedContours.add(elem.contourId);
            else               this._expandedContours.delete(elem.contourId);
        });

        // Header click (anywhere except delete / expand button) → select row.
        header.addEventListener('click', (e) => {
            if (e.target.closest('.path-line-delete')) return;
            if (e.target === expandBtn || e.target.closest('button') === expandBtn) return;

            // ── Update selection + activate path elem ─────────────────────
            const rowRef = this._getTopLevelRef(elem);
            this._applyTopLevelSelection(header, rowRef, e);
            this._activeSubLine = null;
            this._setActiveElem(`path:${elem.contourId}`);

            // ── Canvas callback (may trigger DOM rebuild) ─────────────────────
            if (this.onPathElemClick && elem.segIds?.length) {
                const selectedSegIds = this._collectSelectedTopLevelSegIds();
                this.onPathElemClick(elem.segIds, e, selectedSegIds);
            }
        });

        header.addEventListener('contextmenu', (e) => {
            if (!this.onToPathRequest) return;
            if (isReadOnlyElem) return; // read-only: no context menu
            e.preventDefault();
            e.stopPropagation();
            const rowRef = this._getTopLevelRef(elem);
            if (!header.classList.contains('path-line-selected')) {
                this.clearAllSelection();
                header.classList.add('path-line-selected');
                this._lastSelectedElemRef = rowRef;
            }
            this._setActiveElem(`path:${elem.contourId}`);
            const selectedSegIds = this._collectSelectedTopLevelSegIds();
            this.onToPathRequest(selectedSegIds, e);
        });

        // Drag to reorder top-level elements (by header)
        if (!isReadOnlyElem) this._attachElemDrag(header, elem);

        wrap.appendChild(header);
        wrap.appendChild(body);
        return wrap;
    }

    /**
     * Attach top-level element drag-to-reorder handlers to a drag handle element.
     * @param {HTMLElement} handle    - the element to attach drag events to
     * @param {object}      elemDesc  - the element descriptor in this._elements
     * @private
     */
    _attachElemDrag(handle, elemDesc) {
        handle.addEventListener('dragstart', (e) => {
            const draggedRef = this._getTopLevelRef(elemDesc);
            const selectedRefs = this._getAllTopLevelRows()
                .filter(r => r.rowEl?.classList.contains('path-line-selected'))
                .map(r => r.ref);
            const dragRefs = (draggedRef && selectedRefs.includes(draggedRef) && selectedRefs.length > 1)
                ? selectedRefs
                : (draggedRef ? [draggedRef] : []);
            const baseIndices = dragRefs
                .map((ref) => this._elements.findIndex(el => this._getTopLevelRef(el) === ref))
                .filter(i => i >= 0)
                .sort((a, b) => a - b);
            const fromIndices = this._expandMoveIndicesWithGroupDescendants(baseIndices);
            this._dragState = {
                isElem: true,
                fromIndex: fromIndices[0] ?? this._elements.indexOf(elemDesc),
                fromIndices,
                dragRefs,
            };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
            requestAnimationFrame(() => handle.classList.add('pe-elem-dragging'));
        });
        handle.addEventListener('dragend', () => {
            this._dragState = null;
            handle.classList.remove('pe-elem-dragging');
            this.elementsContainer?.querySelectorAll('.pe-elem-drag-over')
                .forEach(el => el.classList.remove('pe-elem-drag-over'));
            this.elementsContainer?.querySelectorAll('.pe-elem-drag-over-top')
                .forEach(el => el.classList.remove('pe-elem-drag-over-top'));
        });
        handle.addEventListener('dragover', (e) => {
            if (!this._dragState?.isElem) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const rect = handle.getBoundingClientRect();
            const nearTop = (e.clientY - rect.top) <= 6;
            this._dragState.dropMode = nearTop ? 'before' : 'on';
            handle.classList.toggle('pe-elem-drag-over-top', nearTop);
            handle.classList.toggle('pe-elem-drag-over', !nearTop);
        });
        handle.addEventListener('dragleave', () => {
            handle.classList.remove('pe-elem-drag-over');
            handle.classList.remove('pe-elem-drag-over-top');
        });
        handle.addEventListener('drop', (e) => {
            e.preventDefault();
            handle.classList.remove('pe-elem-drag-over');
            handle.classList.remove('pe-elem-drag-over-top');
            if (!this._dragState?.isElem) return;
            const indices = Array.isArray(this._dragState?.fromIndices)
                ? [...new Set(this._dragState.fromIndices)].sort((a, b) => a - b)
                : [this._dragState.fromIndex];
            const valid = indices.filter(i => i >= 0 && i < this._elements.length);
            const toIndex = this._elements.indexOf(elemDesc);
            if (valid.length === 0 || toIndex === -1) return;
            if (valid.includes(toIndex)) return;

            const movedItems = valid.map(i => this._elements[i]);
            const targetElem = elemDesc;
            const targetIsGroup = targetElem?.type === 'group';
            const dropMode = this._dragState?.dropMode === 'before' ? 'before' : 'on';
            const canGroupToTarget = targetIsGroup && dropMode === 'on';
            const rootGroupIds = new Set(
                (Array.isArray(this._dragState?.dragRefs) ? this._dragState.dragRefs : [])
                    .map((ref) => {
                        if (!String(ref).startsWith('group:')) return null;
                        const gid = Number(String(ref).slice(6));
                        return Number.isFinite(gid) ? gid : null;
                    })
                    .filter(Number.isFinite)
            );

            const moved = movedItems.map((item) => {
                const isShape = PathEditor.isShapeType(item?.type);
                const isNestedUnderMovedRoot = this._isDescendantOfGroupRoots(item, rootGroupIds);
                if (isNestedUnderMovedRoot) {
                    return { ...item };
                }
                const targetParent = this._resolveParentGroupById(targetElem);
                const targetParentGroupId = Number(targetParent?.groupId);
                const targetParentGroupGuid = String(targetParent?.guid ?? '');
                const nextParentGroupId = canGroupToTarget
                    ? Number(targetElem.groupId)
                    : (Number.isFinite(targetParentGroupId) ? targetParentGroupId : null);
                const nextParentGroupGuid = canGroupToTarget
                    ? String(targetElem?.guid ?? '')
                    : (targetParentGroupGuid || null);
                if (!isShape) {
                    return {
                        ...item,
                        parentGroupId: nextParentGroupId,
                        parentGroupGuid: nextParentGroupGuid,
                    };
                }
                return {
                    ...item,
                    parentContourId: null,
                    parentGroupId: nextParentGroupId,
                    parentGroupGuid: nextParentGroupGuid,
                };
            });

            for (let i = valid.length - 1; i >= 0; i--) {
                this._elements.splice(valid[i], 1);
            }

            const adjustedTarget = this._elements.indexOf(targetElem);
            if (adjustedTarget < 0) return;
            const insertAt = canGroupToTarget ? adjustedTarget + 1 : adjustedTarget;
            this._elements.splice(insertAt, 0, ...moved);

            this._pruneEmptyGroups();
            this._renderElements();
            this._emitTopLevelOrder();
        });
    }

    /**
     * Build a sub-line row inside a path/polyline body.
     * @param {{text:string, segId:string|null, _elem:null}} lineData
     * @param {object} parentElem — the path/polyline parent element descriptor
     * @returns {HTMLElement}
     * @private
     */
    _buildSubLine(lineData, parentElem) {
        const isReadOnly = !!parentElem?.isSymmetry || !!parentElem?._inSymmetryGroup;
        const lineEl = document.createElement('div');
        lineEl.className = 'path-line pe-sub-line';
        if (isReadOnly) lineEl.classList.add('pe-sub-line-readonly');
        lineEl.draggable = !isReadOnly;
        if (lineData.segId) lineEl.dataset.segId = lineData.segId;
        this._buildLineCellsInElem(lineEl, lineData, parentElem, { readOnly: isReadOnly });

        if (isReadOnly) return lineEl;

        // ── Drag-to-reorder ──────────────────────────────────────────────
        lineEl.addEventListener('dragstart', (e) => {
            const fromIndex = parentElem.lines.indexOf(lineData);
            const selectedIndices = this._collectSelectedLineIndices(parentElem);
            const fromIndices = (lineEl.classList.contains('path-line-selected') && selectedIndices.length > 1)
                ? selectedIndices
                : [fromIndex];
            this._dragState = { parentElem, fromIndex, fromIndices };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
            requestAnimationFrame(() => lineEl.classList.add('pe-sub-line-dragging'));
        });
        lineEl.addEventListener('dragend', () => {
            this._dragState = null;
            lineEl.classList.remove('pe-sub-line-dragging');
            this.elementsContainer?.querySelectorAll('.pe-sub-line-drag-over')
                .forEach(el => el.classList.remove('pe-sub-line-drag-over'));
        });
        lineEl.addEventListener('dragover', (e) => {
            if (!this._dragState) return;

            // Sub-line drag: allow same-path reorder and cross-path move.
            if (!this._dragState.isElem) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                lineEl.classList.add('pe-sub-line-drag-over');
                return;
            }

            // Top-level drag: allow dropping a single path into target path at this command position.
            const fromIndices = Array.isArray(this._dragState?.fromIndices)
                ? this._dragState.fromIndices
                : [this._dragState?.fromIndex];
            const movedElems = fromIndices.map(i => this._elements[i]).filter(Boolean);
            const singlePath = movedElems.length === 1
                && (movedElems[0]?.type === 'path' || movedElems[0]?.type === 'polyline');
            if (!singlePath) return;

            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            lineEl.classList.add('pe-sub-line-drag-over');
        });
        lineEl.addEventListener('dragleave', () => lineEl.classList.remove('pe-sub-line-drag-over'));
        lineEl.addEventListener('drop', (e) => {
            e.preventDefault();
            lineEl.classList.remove('pe-sub-line-drag-over');
            if (!this._dragState) return;

            // Move command row between same/different paths.
            if (!this._dragState.isElem) {
                const sourceElem = this._dragState.parentElem;
                const fromIndices = Array.isArray(this._dragState?.fromIndices)
                    ? this._dragState.fromIndices
                    : [this._dragState?.fromIndex];
                const toIndex = parentElem.lines.indexOf(lineData);
                if (toIndex === -1 || fromIndices.some(i => i === -1)) return;

                if (sourceElem === parentElem) {
                    const block = [...new Set(fromIndices)].sort((a, b) => a - b);
                    if (block.length === 0) return;
                    if (block.length === 1 && block[0] === toIndex) return;

                    const moving = block.map(i => parentElem.lines[i]);
                    for (let i = block.length - 1; i >= 0; i--) {
                        parentElem.lines.splice(block[i], 1);
                    }
                    const removedBefore = block.filter(i => i < toIndex).length;
                    const insertAt = Math.max(0, Math.min(toIndex - removedBefore, parentElem.lines.length));
                    parentElem.lines.splice(insertAt, 0, ...moving);
                    this._refreshPathSegIdsFromLines(parentElem);
                    this._rebuildPathBody(parentElem);
                    this._fireOnChange();
                    return;
                }

                this._moveSubLineAcrossPaths(sourceElem, fromIndices, parentElem, toIndex);
                return;
            }

            // Move whole path into this path at concrete insertion point.
            const fromIndices = Array.isArray(this._dragState?.fromIndices)
                ? this._dragState.fromIndices
                : [this._dragState?.fromIndex];
            const movedElems = fromIndices.map(i => this._elements[i]).filter(Boolean);
            const sourcePath = movedElems.length === 1
                && (movedElems[0]?.type === 'path' || movedElems[0]?.type === 'polyline')
                ? movedElems[0]
                : null;
            if (!sourcePath || sourcePath === parentElem) return;
            const insertIndex = parentElem.lines.indexOf(lineData);
            if (insertIndex === -1) return;
            this._insertWholePathIntoPath(sourcePath, parentElem, insertIndex);
        });

        // ── Click → visual select + canvas callback + track active sub-line ──
        lineEl.addEventListener('click', (e) => {
            if (e.target.closest('.path-cell') || e.target.closest('.path-line-delete')) return;
            const isAlreadySelected = lineEl.classList.contains('path-line-selected');

            if (e.ctrlKey || e.metaKey) {
                // CTRL+click: toggle this row without clearing others (multi-select).
                if (isAlreadySelected) lineEl.classList.remove('path-line-selected');
                else                   lineEl.classList.add('path-line-selected');
            } else if (e.shiftKey && this._lastSelectedLineRef != null) {
                // SHIFT+click: range-select from last-clicked to this line.
                const all  = this._getAllSubLines();
                const clickedRef = this._getLineRef(lineData, parentElem);
                const from = all.findIndex(l => l.ref === this._lastSelectedLineRef);
                const to   = all.findIndex(l => l.ref === clickedRef);
                if (from !== -1 && to !== -1) {
                    const lo = Math.min(from, to), hi = Math.max(from, to);
                    for (let i = lo; i <= hi; i++) all[i].el.classList.add('path-line-selected');
                }
            } else {
                // Plain click: exclusive select; second click on same row → deselect.
                if (isAlreadySelected) {
                    lineEl.classList.remove('path-line-selected');
                } else {
                    this.elementsContainer?.querySelectorAll('.path-line-selected')
                        .forEach(el => el.classList.remove('path-line-selected'));
                    lineEl.classList.add('path-line-selected');
                }
            }

            this._lastSelectedLine = lineData;
            this._lastSelectedLineRef = this._getLineRef(lineData, parentElem);
            this._activeSubLine = lineData;
            // Set parent path as active element (shows command suggestions)
            this._setActiveElem(`path:${parentElem.contourId}`);
            if (this.onLineClick) {
                const lineRef = this._getSelectableLineId(lineData, parentElem);
                const selectedRefs = this._collectSelectedLineRefs();
                this.onLineClick(lineRef, e, selectedRefs);
            }
        });
        return lineEl;
    }

    /**
     * Build / rebuild command + param cells inside a sub-line element.
     * @param {HTMLElement} lineEl
     * @param {{text:string, segId:string|null}} lineData
     * @param {object} parentElem
     * @private
     */
    _buildLineCellsInElem(lineEl, lineData, parentElem, { readOnly = false } = {}) {
        lineEl.innerHTML = '';

        // Line number (reflects live position in parent's lines array)
        const _lineIdx = parentElem.lines.indexOf(lineData);
        const _numEl = document.createElement('span');
        _numEl.className = 'path-line-number';
        _numEl.textContent = _lineIdx >= 0 ? _lineIdx + 1 : '';
        lineEl.appendChild(_numEl);

        const parsed = this.parseLine(lineData.text);
        if (!parsed) {
            const placeholder = document.createElement('span');
            placeholder.className = 'path-line-empty';
            placeholder.textContent = lineData.text || '—';
            lineEl.appendChild(placeholder);
            return;
        }
        const { cmd, params, def } = parsed;

        // Command cell
        const cmdCell = document.createElement('button');
        cmdCell.type = 'button';
        cmdCell.className = 'path-cell path-cell-cmd';
        cmdCell.title = def.label || cmd;
        cmdCell.textContent = cmd;
        if (!readOnly) {
            cmdCell.addEventListener('click', () => this._activateCmdEdit(lineData, lineEl, parentElem));
        } else {
            cmdCell.disabled = true;
        }
        lineEl.appendChild(cmdCell);

        // Param cells
        const expectedArgs = def.args;
        const maxCells = Math.max(params.length, expectedArgs.length);
        for (let i = 0; i < maxCells; i++) {
            const paramVal  = params[i] || '';
            const argLabel  = expectedArgs[i] || `arg${i + 1}`;

            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'path-cell path-cell-param';
            cell.dataset.argIndex = i;
            cell.dataset.argLabel = argLabel;
            this._setParamCellTitle(cell, argLabel, paramVal);
            if (paramVal) { cell.textContent = paramVal; }
            else          { cell.textContent = argLabel; cell.classList.add('cell-empty'); }
            if (!readOnly) {
                cell.addEventListener('click', (e) =>
                    this._activateParamEditInElem(lineData, lineEl, parentElem, i, argLabel, e));
            } else {
                cell.disabled = true;
            }
            lineEl.appendChild(cell);
        }

        // Delete button
        if (!readOnly) {
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'path-line-delete';
            delBtn.title = 'Delete line';
            delBtn.textContent = '×';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._removeSubLine(lineData, parentElem);
            });
            lineEl.appendChild(delBtn);
        }
    }

    // ─── Edit operations ──────────────────────────────────────────────────────

    /**
     * Show command-picker suggestions for a sub-line command cell.
     * @private
     */
    _activateCmdEdit(lineData, lineEl, parentElem) {
        this._clearActiveEdit();
        this.activeEditLineData = lineData;
        this.activeEditType = 'cmd';

        const cmdCell = lineEl.querySelector('.path-cell-cmd');
        if (cmdCell) { cmdCell.classList.add('active-edit'); cmdCell.textContent = '?'; }

        let html = '<div class="path-suggestions-group"><span class="path-suggestions-label">Select command:</span>';
        Object.entries(SVG_COMMAND_DEFS).forEach(([c, def]) => {
            html += `<button type="button" class="path-suggestion-btn cmd-btn" data-cmd="${c}" title="${def.label}">${c}</button>`;
        });
        html += '</div>';
        this.suggestionsEl.innerHTML = html;

        this.suggestionsEl.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newCmd = btn.dataset.cmd;
                const newDef = SVG_COMMAND_DEFS[newCmd];
                const parsed = this.parseLine(lineData.text);
                const newParams = this.transformParamsForCommand(
                    parsed ? parsed.params   : [],
                    parsed ? parsed.def.args : [],
                    newDef ? newDef.args     : [],
                );
                lineData.text = newCmd + (newParams.length ? ' ' + newParams.join(' ') : '');
                this._clearActiveEdit();
                this._buildLineCellsInElem(lineEl, lineData, parentElem);
                this._fireOnChange();
                this._renderSuggestions();
            });
        });
    }

    /**
     * Show an inline input for editing a parameter cell.
     * @private
     */
    _activateParamEditInElem(lineData, lineEl, parentElem, argIndex, argLabel, clickEvent = null) {
        if (this.activeEditLineData === lineData && this.activeEditType === 'param'
                && this.activeEditArgIndex === argIndex) {
            if (this.activeEditInput && clickEvent)
                this.positionCursorAtClick(this.activeEditInput, clickEvent);
            return;
        }
        this._clearActiveEdit();
        this.activeEditLineData  = lineData;
        this.activeEditType      = 'param';
        this.activeEditArgIndex  = argIndex;

        const parsed = this.parseLine(lineData.text);
        const currentVal = parsed ? (parsed.params[argIndex] || '') : '';
        const paramCells = lineEl.querySelectorAll('.path-cell-param');
        const cell = paramCells?.[argIndex];
        if (!cell) return;

        cell.classList.add('active-edit');
        cell.innerHTML = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'path-cell-inline-input';
        input.value = currentVal;
        input.placeholder = argLabel;
        cell.appendChild(input);

        const resize = () => {
            input.style.width = Math.max(25, Math.ceil(this.measureTextWidth(input.value || input.placeholder)) + 6) + 'px';
        };
        resize();
        input.addEventListener('input', resize);

        requestAnimationFrame(() => {
            input.focus();
            clickEvent ? this.positionCursorAtClick(input, clickEvent) : input.select();
        });

        const finish = (save = true) => {
            if (save) this._finishParamEditInElem(lineData, lineEl, parentElem, argIndex, input.value);
            else      this._buildLineCellsInElem(lineEl, lineData, parentElem);
            this._clearActiveEdit();
            this._renderSuggestions();
        };

        input.addEventListener('blur',    () => finish(true));
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter')  { e.preventDefault(); finish(true);  }
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
            if (e.key === 'Tab')    { e.preventDefault(); finish(true); paramCells?.[argIndex + 1]?.click(); }
        });
        input.addEventListener('input',   e => e.stopPropagation());
        input.addEventListener('dblclick',e => { e.stopPropagation(); input.select(); });

        this.activeEditInput = input;
        this._renderVariableSuggestions(argLabel);
    }

    /** @private */
    _finishParamEditInElem(lineData, lineEl, parentElem, argIndex, newVal) {
        const parsed = this.parseLine(lineData.text);
        if (!parsed) { this._buildLineCellsInElem(lineEl, lineData, parentElem); return; }
        const params = [...parsed.params];
        while (params.length <= argIndex) params.push('0');
        params[argIndex] = newVal.trim() || '0';

        lineData.text = parsed.cmd + ' ' + params.join(' ');
        this._buildLineCellsInElem(lineEl, lineData, parentElem);
        this._fireOnChange();
    }

    /** @private */
    _clearActiveEdit() {
        this.elementsContainer?.querySelectorAll('.path-cell.active-edit')
            .forEach(c => c.classList.remove('active-edit'));
        this.activeEditLineData = null;
        this.activeEditType     = null;
        this.activeEditArgIndex = null;
        this.activeEditInput    = null;
    }

    /**
     * Remove a sub-line from its parent element.
     * @private
     */
    _removeSubLine(lineData, parentElem) {
        const idx = parentElem.lines.indexOf(lineData);
        if (idx === -1) return;
        parentElem.lines.splice(idx, 1);
        this._refreshPathSegIdsFromLines(parentElem);
        this._rebuildPathBody(parentElem);
        this._fireOnChange();
    }

    /**
     * Keep `segIds` in sync after editing/reordering/moving sub-lines.
     * @param {object} pathElem
     * @private
     */
    _refreshPathSegIdsFromLines(pathElem) {
        if (!pathElem || (pathElem.type !== 'path' && pathElem.type !== 'polyline')) return;
        pathElem.segIds = (pathElem.lines ?? [])
            .map(l => l?.segId ?? null)
            .filter(id => id != null && String(id).trim() !== '');
    }

    /**
     * Move one command from source path to target path.
     * @param {object} sourceElem
     * @param {number} fromIndex
     * @param {object} targetElem
     * @param {number} toIndex
     * @private
     */
    _moveSubLineAcrossPaths(sourceElem, fromIndices, targetElem, toIndex) {
        if (!sourceElem || !targetElem) return false;
        if ((sourceElem.type !== 'path' && sourceElem.type !== 'polyline')
            || (targetElem.type !== 'path' && targetElem.type !== 'polyline')) return false;

        const block = [...new Set((Array.isArray(fromIndices) ? fromIndices : [fromIndices]).map(Number))]
            .filter(i => Number.isInteger(i))
            .sort((a, b) => a - b);
        if (block.length === 0) return false;
        if (block.some(i => i < 0 || i >= (sourceElem.lines?.length ?? 0))) return false;
        if (toIndex < 0 || toIndex > (targetElem.lines?.length ?? 0)) return false;

        const moving = block.map(i => sourceElem.lines[i]).filter(Boolean);
        if (moving.length === 0) return false;
        for (let i = block.length - 1; i >= 0; i--) {
            sourceElem.lines.splice(block[i], 1);
        }
        const insertAt = Math.max(0, Math.min(toIndex, targetElem.lines.length));
        targetElem.lines.splice(insertAt, 0, ...moving);

        this._refreshPathSegIdsFromLines(sourceElem);
        this._refreshPathSegIdsFromLines(targetElem);

        if ((sourceElem.lines?.length ?? 0) === 0) {
            const idx = this._elements.indexOf(sourceElem);
            if (idx !== -1) this._elements.splice(idx, 1);
            this._expandedContours.delete(sourceElem.contourId);
            if (this._activeElemId === `path:${sourceElem.contourId}`) this._activeElemId = null;
        }

        this._pruneEmptyGroups();
        this._renderElements();
        this._fireOnChange();
        return true;
    }

    /**
     * Insert all commands of source path into target path and remove source path row.
     * @param {object} sourcePathElem
     * @param {object} targetPathElem
     * @param {number} insertIndex
     * @private
     */
    _insertWholePathIntoPath(sourcePathElem, targetPathElem, insertIndex) {
        if (!sourcePathElem || !targetPathElem) return false;
        if ((sourcePathElem.type !== 'path' && sourcePathElem.type !== 'polyline')
            || (targetPathElem.type !== 'path' && targetPathElem.type !== 'polyline')) return false;
        if (sourcePathElem === targetPathElem) return false;

        const movedLines = Array.isArray(sourcePathElem.lines) ? sourcePathElem.lines : [];
        if (movedLines.length === 0) return false;

        const idx = Math.max(0, Math.min(Number(insertIndex), targetPathElem.lines.length));
        targetPathElem.lines.splice(idx, 0, ...movedLines);
        sourcePathElem.lines = [];

        this._refreshPathSegIdsFromLines(targetPathElem);

        const srcIdx = this._elements.indexOf(sourcePathElem);
        if (srcIdx !== -1) this._elements.splice(srcIdx, 1);
        this._expandedContours.delete(sourcePathElem.contourId);
        this._expandedContours.add(targetPathElem.contourId);
        if (this._activeElemId === `path:${sourcePathElem.contourId}`) {
            this._activeElemId = `path:${targetPathElem.contourId}`;
        }

        this._pruneEmptyGroups();
        this._renderElements();
        this._fireOnChange();
        return true;
    }

    /**
     * Rebuild all sub-line DOM inside a path/polyline group.
     * Called after drag-sort or delete so line numbers stay correct.
     * Also updates header label (path vs polyline) based on content.
     * @param {object} parentElem
     * @private
     */
    _rebuildPathBody(parentElem) {
        if (!parentElem._elem) return;
        const body = parentElem._elem.querySelector('.pe-path-body');
        if (!body) return;
        body.innerHTML = '';
        for (const lineData of parentElem.lines) {
            lineData._elem = null;
            const subEl = this._buildSubLine(lineData, parentElem);
            lineData._elem = subEl;
            body.appendChild(subEl);
        }
        // Update header label live based on new command composition
        const expandBtn = parentElem._elem.querySelector('.path-cell-cmd');
        if (expandBtn) {
            const newLabel = this._classifyContourLabel(parentElem.lines);
            const isExpanded = parentElem.expanded ?? false;
            expandBtn.textContent = newLabel + (isExpanded ? ' ▼' : ' ►');
        }
    }

    // ─── onChange ─────────────────────────────────────────────────────────────

    /**
     * Concatenate evaluated path strings from all path/polyline elements and fire onChange.
     * @private
     */
    _fireOnChange() {
        const parts    = [];
        const rawParts = [];
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                const text = elem.lines.map(l => this.evaluateLine(l.text)).filter(Boolean).join(' ');
                if (text) parts.push(text);
                const rawText = elem.lines.map(l => l.text).filter(Boolean).join(' ');
                if (rawText) rawParts.push(rawText);
            } else if (elem.type === 'circle') {
                // Serialize circle as two half-arc sub-path so canvas can render it.
                const { center, radius } = elem.data ?? {};
                if (center != null && radius != null) {
                    const r6 = v => +Number(v).toFixed(6);
                    const cx = Number(center.x ?? 0);
                    const cyCanvas = Number(center.y ?? 0);
                    const radNum = Math.abs(Number(radius ?? 0));
                    if (![cx, cyCanvas, radNum].every(Number.isFinite)) continue;

                    const cxRaw = elem.data?._expr?.cx ?? r6(center.x);
                    const cyRaw = elem.data?._expr?.cy ?? r6(center.y);
                    const radRaw = elem.data?.radiusExpr ?? elem.data?._expr?.r ?? r6(radNum);

                    const mLeftX = r6(cx - radNum);
                    const mRightX = r6(cx + radNum);
                    const cySvg = r6(-cyCanvas);

                    const evaluatedCmd =
                        `M ${mLeftX} ${cySvg}` +
                        ` A ${r6(radNum)} ${r6(radNum)} 0 1 0 ${mRightX} ${cySvg}` +
                        ` A ${r6(radNum)} ${r6(radNum)} 0 1 0 ${mLeftX} ${cySvg}` +
                        ` Z`;
                    const rawCmd =
                        `M (${cxRaw})-(${radRaw}) -(${cyRaw})` +
                        ` A ${radRaw} ${radRaw} 0 1 0 (${cxRaw})+(${radRaw}) -(${cyRaw})` +
                        ` A ${radRaw} ${radRaw} 0 1 0 (${cxRaw})-(${radRaw}) -(${cyRaw})` +
                        ` Z`;
                    parts.push(evaluatedCmd);
                    rawParts.push(rawCmd);
                }
            } else if (elem.type === 'rect') {
                const r6 = v => +Number(v).toFixed(6);
                const data = elem.data ?? {};
                const dirW = Number(data?.dirW) < 0 ? -1 : 1;
                const hasDirH = Object.prototype.hasOwnProperty.call(data ?? {}, 'dirH');
                const dirH = hasDirH ? (Number(data?.dirH) < 0 ? -1 : 1) : -1;
                const rawToken = (key, fallback) => {
                    const expr = elem.data?._expr?.[key];
                    return (expr != null && String(expr).trim() !== '') ? String(expr).trim() : String(fallback);
                };
                const toBitYToken = (token) => this._shapeDataSpace === 'canvas'
                    ? shapeUiToStoredToken('y', token, this._shapeDataSpace)
                    : String(token);

                const xRaw = rawToken('x', r6(Number(data.x ?? 0)));
                const yExpr = elem.data?._expr?.y;
                const yRaw = (yExpr != null && String(yExpr).trim() !== '')
                    ? String(yExpr).trim()
                    : toBitYToken(r6(Number(data.y ?? 0)));
                const wRaw = rawToken('w', r6(Number(data.w ?? 0)));
                const hRaw = rawToken('h', r6(Number(data.h ?? 0)));
                const rxRaw = rawToken('rx', r6(Number(data.rx ?? 0)));

                const xEval = Number(this.evaluateToken(xRaw));
                const yBit = Number(this.evaluateToken(yRaw));
                const wEval = Number(this.evaluateToken(wRaw));
                const hEval = Number(this.evaluateToken(hRaw));
                const rxEvalRaw = Math.abs(Number(this.evaluateToken(rxRaw)));

                // Hidden path is always stored in bit-space (Y-up).
                const rxEval = Number.isFinite(rxEvalRaw) ? rxEvalRaw : 0;

                if (![xEval, yBit, wEval, hEval].every(Number.isFinite)) continue;

                const x2Eval = xEval + dirW * wEval;
                const y2Eval = yBit - dirH * hEval;
                const dxEval = x2Eval - xEval;
                const dyEval = y2Eval - yBit;
                const radEval = Math.max(0, Math.min(Number.isFinite(rxEval) ? rxEval : 0, Math.abs(wEval) / 2, Math.abs(hEval) / 2));
                const sx = dxEval >= 0 ? 1 : -1;
                const sy = dyEval >= 0 ? 1 : -1;

                const xRawTo = dirW > 0
                    ? `(${xRaw})+(${wRaw})`
                    : `(${xRaw})-(${wRaw})`;
                const yRawTo = dirH > 0
                    ? `(${yRaw})-(${hRaw})`
                    : `(${yRaw})+(${hRaw})`;

                const rxRawOut = (elem.data?._expr?.rx != null && String(elem.data._expr.rx).trim() !== '')
                    ? String(elem.data._expr.rx).trim()
                    : r6(radEval);

                if (radEval > 1e-9) {
                    const sweep = (dxEval * dyEval) >= 0 ? 1 : 0;
                    const evaluatedCmd =
                        `M ${r6(xEval + sx * radEval)} ${r6(yBit)}` +
                        ` L ${r6(x2Eval - sx * radEval)} ${r6(yBit)}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 0 ${sweep} ${r6(x2Eval)} ${r6(yBit + sy * radEval)}` +
                        ` L ${r6(x2Eval)} ${r6(y2Eval - sy * radEval)}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 0 ${sweep} ${r6(x2Eval - sx * radEval)} ${r6(y2Eval)}` +
                        ` L ${r6(xEval + sx * radEval)} ${r6(y2Eval)}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 0 ${sweep} ${r6(xEval)} ${r6(y2Eval - sy * radEval)}` +
                        ` L ${r6(xEval)} ${r6(yBit + sy * radEval)}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 0 ${sweep} ${r6(xEval + sx * radEval)} ${r6(yBit)}` +
                        ` Z`;

                    const xRawFromIn = sx > 0
                        ? `(${xRaw})+(${rxRawOut})`
                        : `(${xRaw})-(${rxRawOut})`;
                    const xRawToIn = sx > 0
                        ? `(${xRawTo})-(${rxRawOut})`
                        : `(${xRawTo})+(${rxRawOut})`;
                    const yRawFromIn = sy > 0
                        ? `(${yRaw})+(${rxRawOut})`
                        : `(${yRaw})-(${rxRawOut})`;
                    const yRawToIn = sy > 0
                        ? `(${yRawTo})-(${rxRawOut})`
                        : `(${yRawTo})+(${rxRawOut})`;

                    const rawCmd =
                        `M ${xRawFromIn} (${yRaw})` +
                        ` L ${xRawToIn} (${yRaw})` +
                        ` A ${rxRawOut} ${rxRawOut} 0 0 ${sweep} (${xRawTo}) ${yRawFromIn}` +
                        ` L (${xRawTo}) ${yRawToIn}` +
                        ` A ${rxRawOut} ${rxRawOut} 0 0 ${sweep} ${xRawToIn} (${yRawTo})` +
                        ` L ${xRawFromIn} (${yRawTo})` +
                        ` A ${rxRawOut} ${rxRawOut} 0 0 ${sweep} (${xRaw}) ${yRawToIn}` +
                        ` L (${xRaw}) ${yRawFromIn}` +
                        ` A ${rxRawOut} ${rxRawOut} 0 0 ${sweep} ${xRawFromIn} (${yRaw})` +
                        ` Z`;
                    parts.push(evaluatedCmd);
                    rawParts.push(rawCmd);
                } else {
                    const evaluatedCmd =
                        `M ${r6(xEval)} ${r6(yBit)}` +
                        ` L ${r6(x2Eval)} ${r6(yBit)}` +
                        ` L ${r6(x2Eval)} ${r6(y2Eval)}` +
                        ` L ${r6(xEval)} ${r6(y2Eval)}` +
                        ` Z`;
                    const rawCmd =
                        `M ${xRaw} ${yRaw}` +
                        ` L ${xRawTo} ${yRaw}` +
                        ` L ${xRawTo} ${yRawTo}` +
                        ` L ${xRaw} ${yRawTo}` +
                        ` Z`;
                    parts.push(evaluatedCmd);
                    rawParts.push(rawCmd);
                }
            } else if (elem.type === 'ellipse') {
                const r6 = v => +Number(v).toFixed(6);
                const data = elem.data ?? {};
                const cxRaw = elem.data?._expr?.cx ?? r6(Number(data.cx ?? 0));
                const cyRawCanvas = elem.data?._expr?.cy ?? r6(Number(data.cy ?? 0));
                const rxRaw = elem.data?._expr?.rx ?? r6(Number(data.rx ?? 0));
                const ryRaw = elem.data?._expr?.ry ?? r6(Number(data.ry ?? 0));

                const cxEval = Number(this.evaluateToken(String(cxRaw)));
                const cyEvalCanvas = Number(this.evaluateToken(String(cyRawCanvas)));
                const rxEval = Math.abs(Number(this.evaluateToken(String(rxRaw))));
                const ryEval = Math.abs(Number(this.evaluateToken(String(ryRaw))));
                const cyBit = shapeUiToStoredNumber('cy', cyEvalCanvas, this._shapeDataSpace);

                if (![cxEval, cyEvalCanvas, rxEval, ryEval].every(Number.isFinite)) continue;

                const evaluatedCmd =
                    `M ${r6(cxEval - rxEval)} ${r6(cyBit)}` +
                    ` A ${r6(rxEval)} ${r6(ryEval)} 0 1 0 ${r6(cxEval + rxEval)} ${r6(cyBit)}` +
                    ` A ${r6(rxEval)} ${r6(ryEval)} 0 1 0 ${r6(cxEval - rxEval)} ${r6(cyBit)}` +
                    ` Z`;
                parts.push(evaluatedCmd);
                rawParts.push(evaluatedCmd);
            }
        }
        const fullPath = parts.join(' ');
        if (this.hiddenInput)    this.hiddenInput.value = fullPath;
        if (this.rawHiddenInput) this.rawHiddenInput.value = rawParts.join(' ');
        if (this.transformsHiddenInput) {
            this.transformsHiddenInput.value = JSON.stringify(this.getElementTransformsSnapshot());
        }
        if (this.elementsHiddenInput) {
            this.elementsHiddenInput.value = JSON.stringify(this.getElementsDebugSnapshot());
        }
        this.onChange(fullPath, {
            selectedLineRefs: this._collectSelectedLineRefs(),
            activeElemId: this._activeElemId,
            elementTransforms: this.getElementTransformsSnapshot(),
        });
    }

    /**
     * Recompute hidden inputs from current in-memory elements without firing onChange callback.
     * Used by ProfileEditor during canvas-originated in-place updates.
     */
    syncHiddenInputsFromElements() {
        const savedOnChange = this.onChange;
        this.onChange = () => {};
        this._fireOnChange();
        this.onChange = savedOnChange;
    }

    /**
     * Debug snapshot of current PathEditor structure.
     * @returns {Array<object>}
     */
    getElementsDebugSnapshot() {
        return this._elements.map((elem) => {
            const transforms = Array.isArray(elem.transforms) ? elem.transforms.map(t => ({
                type: String(t?.type ?? '').toUpperCase(),
                raw: String(t?.raw ?? ''),
                params: Array.isArray(t?.params) ? [...t.params] : [],
            })) : [];
            if (elem.type === 'group') {
                return {
                    type: 'group',
                    groupId: Number(elem.groupId),
                    guid: String(elem?.guid ?? ''),
                    name: String(elem.name ?? ''),
                    expanded: elem?.expanded !== false,
                    parentGroupId: this._optId(elem?.parentGroupId),
                    transforms,
                    linkType: elem?.linkType ?? null,
                    sourceGroupId: (elem?.sourceGroupId != null && Number.isFinite(Number(elem.sourceGroupId)))
                        ? Number(elem.sourceGroupId) : null,
                    sourceGroupGuid: String(elem?.sourceGroupGuid ?? ''),
                    axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
                };
            }
            if (elem.type === 'path' || elem.type === 'polyline') {
                const out = {
                    type: elem.isSymmetry ? 'symmetry' : elem.type,
                    contourId: elem.contourId,
                    segIds: Array.isArray(elem.segIds) ? [...elem.segIds] : [],
                    lines: (elem.lines ?? []).map((line) => ({
                        text: line.text,
                        segId: line.segId ?? null,
                        lineGuid: String(line?.lineGuid ?? this._newGuid()),
                    })),
                    transforms,
                    groupId: this._optId(elem?.groupId ?? elem?.parentGroupId),
                    parentGroupId: this._optId(elem?.parentGroupId),
                };
                if (elem.isSymmetry) {
                    out.parentContourId = this._optId(elem?.parentContourId);
                    out.axis = elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null;
                }
                return out;
            }
            return {
                type: elem.type,
                segId: elem.segId ?? null,
                data: { ...(elem.data ?? {}) },
                transforms,
                groupId: this._optId(elem?.groupId ?? elem?.parentGroupId),
                parentContourId: this._optId(elem?.parentContourId),
                parentGroupId: this._optId(elem?.parentGroupId),
                linkType: elem?.linkType ?? null,
                axis: elem?.axis ? JSON.parse(JSON.stringify(elem.axis)) : null,
            };
        });
    }

    /**
     * Snapshot modifier lists for all top-level elements in current order.
     * @returns {Array<{kind:'path'|'shape', contourId?:number, segId?:string, transforms:Array<object>}>
     * }
     */
    getElementTransformsSnapshot() {
        return this._elements.map((elem) => {
            const transforms = Array.isArray(elem.transforms)
                ? elem.transforms.map(t => ({
                    type: String(t?.type ?? '').toUpperCase(),
                    raw: String(t?.raw ?? ''),
                    params: Array.isArray(t?.params) ? [...t.params] : [],
                }))
                : [];
            if (elem.type === 'path' || elem.type === 'polyline') {
                return { kind: 'path', contourId: Number(elem.contourId), transforms };
            }
            if (elem.type === 'group') {
                return {
                    kind: 'group',
                    groupId: Number(elem.groupId),
                    parentGroupId: this._optId(elem?.parentGroupId),
                    name: String(elem.name ?? ''),
                    transforms,
                };
            }
            return { kind: 'shape', segId: String(elem.segId ?? ''), transforms };
        });
    }

    /**
     * Apply top-level element transforms snapshot to current rows.
     * Path rows are matched by `contourId` first (fallback: positional for legacy snapshots).
     * Shape rows are matched by `segId` first (fallback: positional for legacy snapshots).
     * @param {Array<{kind:'path'|'shape', contourId?:number, segId?:string, transforms:Array<object>}>} snapshot
     */
    setElementTransformsSnapshot(snapshot) {
        if (!Array.isArray(snapshot) || snapshot.length === 0) {
            for (const elem of this._elements) elem.transforms = [];
            this._renderElements();
            this._fireOnChange();
            return;
        }

        // Backward compatibility: legacy flat MOD list (e.g. [{type:'RT',...}])
        // produced before snapshot structure `{ kind, transforms }` was introduced.
        const looksLikeLegacyFlat = snapshot.some(s => typeof s?.type === 'string')
            && !snapshot.some(s => s?.kind === 'path' || s?.kind === 'shape');
        if (looksLikeLegacyFlat) {
            const legacyTransforms = snapshot.map(t => ({
                type: String(t?.type ?? '').toUpperCase(),
                raw: String(t?.raw ?? ''),
                params: Array.isArray(t?.params) ? [...t.params] : [],
            }));
            const firstPathElem = this._elements.find(e => e.type === 'path' || e.type === 'polyline') ?? null;
            const prevFirstPathTransforms = firstPathElem && Array.isArray(firstPathElem.transforms)
                ? [...firstPathElem.transforms]
                : [];
            for (const elem of this._elements) elem.transforms = [];
            if (firstPathElem) firstPathElem.transforms = this._mergeTransformsWithFormulaPriority(prevFirstPathTransforms, legacyTransforms);
            this._renderElements();
            this._fireOnChange();
            return;
        }

        const norm = (arr) => (Array.isArray(arr) ? arr : []).map(t => ({
            type: String(t?.type ?? '').toUpperCase(),
            raw: String(t?.raw ?? ''),
            params: Array.isArray(t?.params) ? [...t.params] : [],
        }));

        const pathSnap = snapshot.filter(s => s?.kind === 'path');
        const shapeSnap = snapshot.filter(s => s?.kind === 'shape');
        const groupSnap = snapshot.filter(s => s?.kind === 'group');
        const pathElems = this._elements.filter(e => e.type === 'path' || e.type === 'polyline');
        const shapeElems = this._elements.filter(e => e.type === 'circle' || e.type === 'rect' || e.type === 'ellipse');
        const groupElems = this._elements.filter(e => e.type === 'group');

        for (let i = 0; i < pathElems.length; i++) {
            const byContour = pathSnap.find(s => Number(s?.contourId) === Number(pathElems[i]?.contourId));
            pathElems[i].transforms = this._mergeTransformsWithFormulaPriority(
                pathElems[i].transforms,
                norm(byContour?.transforms ?? pathSnap[i]?.transforms)
            );
        }
        for (let i = 0; i < shapeElems.length; i++) {
            const byId = shapeSnap.find(s => String(s?.segId ?? '') === String(shapeElems[i].segId ?? ''));
            shapeElems[i].transforms = this._mergeTransformsWithFormulaPriority(
                shapeElems[i].transforms,
                norm(byId?.transforms ?? shapeSnap[i]?.transforms)
            );
        }
        for (let i = 0; i < groupElems.length; i++) {
            const byId = groupSnap.find(s => Number(s?.groupId) === Number(groupElems[i].groupId));
            groupElems[i].transforms = this._mergeTransformsWithFormulaPriority(
                groupElems[i].transforms,
                norm(byId?.transforms ?? groupSnap[i]?.transforms)
            );
        }

        this._renderElements();
        this._fireOnChange();
    }

    // ─── Input bar ────────────────────────────────────────────────────────────

    /** @private */
    _tryAddFromInput() {
        const text = this.input.value.trim();
        if (!text) return;
        if (this._tryAddLine(text)) {
            this.input.value = '';
            this._renderSuggestions();
        }
    }

    /**
     * Add text as a sub-line to the active path element, or create a new path element.
     * @param {string} text
     * @returns {boolean}
     * @private
     */
    _tryAddLine(text) {
        const activeTopElem = this._getActiveTopLevelElem();
        if (activeTopElem && this._isTopLevelElemSelected(activeTopElem)) {
            const modInput = this._parseModifierInput(text);
            if (modInput) {
                if (modInput.type !== 'RT') {
                    this.input.style.borderColor = 'red';
                    setTimeout(() => { this.input.style.borderColor = ''; }, 1000);
                    return false;
                }
                const angle = String(modInput.params?.[0] ?? '').trim();
                const next = Array.isArray(activeTopElem.transforms) ? [...activeTopElem.transforms] : [];
                next.push({
                    type: 'RT',
                    raw: angle ? `MOD RT ${angle}` : 'MOD RT',
                    params: [angle],
                });
                activeTopElem.transforms = next;
                this._renderElements();
                const ref = this._getTopLevelRef(activeTopElem);
                if (ref) this._setActiveElem(ref);
                this._fireOnChange();
                return true;
            }
        }

        const activeElem = this._getActivePathElem();
        if (activeElem) {
            const parsed = this.parseLine(text);
            if (!parsed) {
                this.input.style.borderColor = 'red';
                setTimeout(() => { this.input.style.borderColor = ''; }, 1000);
                return false;
            }
            const lineData = { text: text.trim(), segId: null, lineGuid: this._newGuid(), _elem: null };
            // Insert after the currently selected sub-line, or append at end
            const activeIdx = this._activeSubLine
                ? activeElem.lines.indexOf(this._activeSubLine)
                : -1;
            if (activeIdx !== -1) {
                activeElem.lines.splice(activeIdx + 1, 0, lineData);
            } else {
                activeElem.lines.push(lineData);
            }
            this._activeSubLine = lineData;
            // Rebuild body so new sub-line gets correct line number
            this._rebuildPathBody(activeElem);
            // Auto-select the newly added sub-line
            if (lineData._elem) {
                this.clearAllSelection();
                lineData._elem.classList.add('path-line-selected');
                this._lastSelectedLine = lineData;
                this._lastSelectedLineRef = this._getLineRef(lineData, activeElem);
            }
            // Ensure expanded state is tracked BEFORE fireOnChange triggers setElements rebuild.
            activeElem.expanded = true;
            this._expandedContours.add(activeElem.contourId);
            const body = activeElem._elem?.querySelector('.pe-path-body');
            if (body) body.style.display = '';
            this._fireOnChange();
            return true;
        }
        // No active path: create a new polyline element if the text is a valid command
        const parsed = this.parseLine(text);
        if (parsed) {
            const cid      = Date.now();
            const lineData = { text: text.trim(), segId: null, lineGuid: this._newGuid(), _elem: null };
            const newElem  = { type: 'polyline', contourId: cid, segIds: [], expanded: true, lines: [lineData], _elem: null };
            this._elements.push(newElem);
            this._expandedContours.add(cid);
            newElem._elem = this._buildPathGroup(newElem, this._elements.length);
            this.elementsContainer.appendChild(newElem._elem);
            this.clearAllSelection();
            lineData._elem?.classList.add('path-line-selected');
            this._lastSelectedLine = lineData;
            this._lastSelectedLineRef = this._getLineRef(lineData, newElem);
            this._setActiveElem(`path:${cid}`);
            this._renderSuggestions();
            return true;
        }
        return false;
    }

    /** @returns {object|null} the path/polyline element descriptor that is currently active */
    _getActivePathElem() {
        if (!this._activeElemId || !this._activeElemId.startsWith('path:')) return null;
        const cid = Number(this._activeElemId.slice(5));
        return this._elements.find(e =>
            (e.type === 'path' || e.type === 'polyline') && e.contourId === cid) ?? null;
    }

    /** @returns {object|null} active top-level element (path or shape) */
    _getActiveTopLevelElem() {
        if (!this._activeElemId) return null;
        if (this._activeElemId.startsWith('path:')) {
            const cid = Number(this._activeElemId.slice(5));
            return this._elements.find(e => (e.type === 'path' || e.type === 'polyline') && e.contourId === cid) ?? null;
        }
        if (this._activeElemId.startsWith('shape:')) {
            const sid = this._activeElemId.slice(6);
            return this._elements.find(e => (e.type === 'circle' || e.type === 'rect' || e.type === 'ellipse') && e.segId === sid) ?? null;
        }
        if (this._activeElemId.startsWith('group:')) {
            const gid = Number(this._activeElemId.slice(6));
            return this._elements.find(e => e.type === 'group' && Number(e.groupId) === gid) ?? null;
        }
        return null;
    }

    /**
     * Return true if the given top-level element row is selected.
     * @param {object|null} elem
     * @returns {boolean}
     * @private
     */
    _isTopLevelElemSelected(elem) {
        if (!elem) return false;
        if (elem.type === 'path' || elem.type === 'polyline') {
            const headerEl = elem._elem?.querySelector?.('.pe-path-header');
            return !!headerEl?.classList.contains('path-line-selected');
        }
        return !!elem._elem?.classList?.contains('path-line-selected');
    }

    /**
     * Parse MOD input entered via the main input.
     * Supports: `RT 45` and `MOD RT 45`.
     * @param {string} text
     * @returns {{type:string, params:string[]} | null}
     * @private
     */
    _parseModifierInput(text) {
        const parts = this.splitBySpaces(String(text ?? '').trim());
        if (!parts.length) return null;

        let type = '';
        let params = [];

        if (parts[0].toUpperCase() === 'MOD') {
            if (parts.length < 2) return null;
            type = parts[1].toUpperCase();
            params = parts.slice(2);
        } else {
            type = parts[0].toUpperCase();
            params = parts.slice(1);
        }

        if (!PathEditor.MOD_COMMANDS.some(m => m.code === type)) return null;
        return { type, params };
    }

    /**
     * Build lightweight modifier draft from current input for suggestions.
     * @param {string[]} parts
     * @returns {{type:string, params:string[]} | null}
     * @private
     */
    _parseModifierDraft(parts) {
        if (!Array.isArray(parts) || parts.length === 0) return null;
        const p0 = String(parts[0] ?? '').toUpperCase();
        if (p0 === 'MOD') {
            if (parts.length < 2) return null;
            const type = String(parts[1] ?? '').toUpperCase();
            if (!PathEditor.MOD_COMMANDS.some(m => m.code === type)) return null;
            return { type, params: parts.slice(2) };
        }
        if (!PathEditor.MOD_COMMANDS.some(m => m.code === p0)) return null;
        return { type: p0, params: parts.slice(1) };
    }

    /**
     * Append transform modifier controls (e.g. RT angle) to a top-level row.
     * @param {object} elem
     * @param {HTMLElement} row
     * @private
     */
    _appendElemModCells(elem, row) {
        const transforms = Array.isArray(elem?.transforms) ? elem.transforms : [];
        for (let i = 0; i < transforms.length; i++) {
            const tr = transforms[i];
            const type = String(tr?.type ?? '').toUpperCase();
            if (!type) continue;

            const modWrap = document.createElement('span');
            modWrap.className = 'path-mod-item';
            modWrap.draggable = true;
            modWrap.dataset.modIndex = String(i);
            modWrap.title = 'Drag to reorder modifier';

            modWrap.addEventListener('dragstart', (e) => {
                this._modDragState = { elem, fromIndex: i };
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
                requestAnimationFrame(() => modWrap.classList.add('path-mod-dragging'));
            });
            modWrap.addEventListener('dragend', () => {
                this._modDragState = null;
                modWrap.classList.remove('path-mod-dragging');
                row.querySelectorAll('.path-mod-drop-over').forEach(el => el.classList.remove('path-mod-drop-over'));
            });
            modWrap.addEventListener('dragover', (e) => {
                if (!this._modDragState || this._modDragState.elem !== elem) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                modWrap.classList.add('path-mod-drop-over');
            });
            modWrap.addEventListener('dragleave', () => {
                modWrap.classList.remove('path-mod-drop-over');
            });
            modWrap.addEventListener('drop', (e) => {
                e.preventDefault();
                modWrap.classList.remove('path-mod-drop-over');
                if (!this._modDragState || this._modDragState.elem !== elem) return;
                const fromIndex = this._modDragState.fromIndex;
                const toIndex = i;
                if (fromIndex === toIndex) return;
                const current = Array.isArray(elem.transforms) ? [...elem.transforms] : [];
                if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) return;
                const [moved] = current.splice(fromIndex, 1);
                current.splice(toIndex, 0, moved);
                elem.transforms = current;
                this._renderElements();
                const ref = this._getTopLevelRef(elem);
                if (ref) this._setActiveElem(ref);
                this._fireOnChange();
            });

            const cmdBtn = document.createElement('button');
            cmdBtn.type = 'button';
            cmdBtn.className = 'path-cell path-cell-cmd path-cell-mod-cmd';
            cmdBtn.title = `Modifier ${type}`;
            cmdBtn.textContent = type;
            modWrap.appendChild(cmdBtn);

            if (type === 'RT') {
                const angle = String(tr?.params?.[0] ?? '').trim();
                const cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'path-cell path-cell-param path-cell-mod-param' + (angle ? '' : ' cell-empty');
                cell.dataset.modType = 'RT';
                cell.dataset.modIndex = String(i);
                cell.dataset.modParam = '0';
                this._setParamCellTitle(cell, 'angle', angle);
                cell.textContent = angle || 'angle';
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._activateModParamEdit(elem, i, 0, 'angle', cell);
                });
                modWrap.appendChild(cell);
            }

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'path-cell path-cell-mod-del';
            delBtn.title = `Delete modifier ${type}`;
            delBtn.textContent = '×';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const current = Array.isArray(elem.transforms) ? [...elem.transforms] : [];
                if (i < 0 || i >= current.length) return;
                current.splice(i, 1);
                elem.transforms = current;
                this._renderElements();
                const ref = this._getTopLevelRef(elem);
                if (ref) this._setActiveElem(ref);
                this._fireOnChange();
            });
            modWrap.appendChild(delBtn);
            row.appendChild(modWrap);
        }
    }

    /** @param {object} elem @returns {string} */
    _getElemModDisplay(elem) {
        const tr = Array.isArray(elem?.transforms) ? elem.transforms : [];
        if (tr.length === 0) return 'MOD';
        const first = tr[0];
        if (!first) return 'MOD';
        const p0 = first.params?.[0] ?? '';
        return p0 ? `MOD ${first.type} ${p0}` : `MOD ${first.type}`;
    }

    // ─── Suggestions ──────────────────────────────────────────────────────────

    /** @private */
    _renderSuggestions() {
        if (this.activeEditType === 'param' || this.activeEditType === 'shape-param' || this.activeEditType === 'mod-param') return;

        const inputVal       = this.input?.value?.trim() ?? '';
        const parts          = this.splitBySpaces(inputVal);
        const hasCmd         = parts.length > 0 && parts[0].length === 1 && SVG_COMMANDS.has(parts[0]);
        const modDraft       = this._parseModifierDraft(parts);
        const activePathElem = this._getActivePathElem();
        const hasActivePathSelection = !!activePathElem && (() => {
            const headerEl = activePathElem._elem?.querySelector?.('.pe-path-header');
            if (headerEl?.classList.contains('path-line-selected')) return true;
            return activePathElem.lines?.some(line => line._elem?.classList.contains('path-line-selected')) ?? false;
        })();

        let html = '';

        const activeElem = this._getActiveTopLevelElem();
        const hasActiveElemSelection = !!activeElem;
        const hasSelectedTopLevelElem = this._isTopLevelElemSelected(activeElem);

        if (activePathElem && hasActivePathSelection) {
            // ── Path is active: show command palette + variable hints ─────
            html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Commands:</span>';
            Object.entries(SVG_COMMAND_DEFS).forEach(([cmd, def]) => {
                html += `<button type="button" class="path-suggestion-btn cmd-btn" data-cmd="${cmd}" title="${def.label}">${cmd}`;
                // html += `<span class="path-cmd-label">${def.label}</span>`;
                html += `</button>`;

            });
            html += '</div>';

            if (hasCmd) {
                const cmd = parts[0].toUpperCase();
                const def = SVG_COMMAND_DEFS[cmd];
                if (def && def.args.length > 0) {
                    const remainingArgs = def.args.slice(parts.length - 1);
                    if (remainingArgs.length > 0) {
                        html += `<div class="path-suggestions-group"><span class="path-suggestions-label">Next: <em>${remainingArgs[0]}</em></span></div>`;
                    }
                    const vars = this.getAvailableVariables();
                    if (vars.length > 0) {
                        html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Variables:</span>';
                        vars.forEach(v => {
                            const val = this.variableValues[v.varName];
                            const vs  = val !== undefined ? `=${val}` : '';
                            html += `<button type="button" class="path-suggestion-btn var-btn" data-var="${v.varName}">{${v.varName}}${vs}</button>`;
                        });
                        html += '</div>';
                    }
                }
            }

            if (hasSelectedTopLevelElem && modDraft?.type === 'RT') {
                if ((modDraft.params?.length ?? 0) < 1) {
                    html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Next: <em>angle</em></span></div>';
                }
                const vars = this.getAvailableVariables();
                if (vars.length > 0) {
                    html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Variables:</span>';
                    vars.forEach(v => {
                        const val = this.variableValues[v.varName];
                        const vs  = val !== undefined ? `=${val}` : '';
                        html += `<button type="button" class="path-suggestion-btn var-btn" data-var="${v.varName}">{${v.varName}}${vs}</button>`;
                    });
                    html += '</div>';
                }
            }

            if (hasSelectedTopLevelElem) {
                html += '<div class="path-suggestions-group"><span class="path-suggestions-label">MOD:</span>';
                for (const mod of PathEditor.MOD_COMMANDS) {
                    const enabled = mod.code === 'RT';
                    html += `<button type="button" class="path-suggestion-btn mod-btn${enabled ? '' : ' cell-empty'}" data-mod="${mod.code}" title="${mod.label}${enabled ? '' : ' (soon)'}">${mod.code}</button>`;
                }
                html += '</div>';
            }
        } else if (hasActiveElemSelection && hasSelectedTopLevelElem) {
            if (modDraft?.type === 'RT') {
                if ((modDraft.params?.length ?? 0) < 1) {
                    html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Next: <em>angle</em></span></div>';
                }
                const vars = this.getAvailableVariables();
                if (vars.length > 0) {
                    html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Variables:</span>';
                    vars.forEach(v => {
                        const val = this.variableValues[v.varName];
                        const vs  = val !== undefined ? `=${val}` : '';
                        html += `<button type="button" class="path-suggestion-btn var-btn" data-var="${v.varName}">{${v.varName}}${vs}</button>`;
                    });
                    html += '</div>';
                }
            }
            html += '<div class="path-suggestions-group"><span class="path-suggestions-label">MOD:</span>';
            for (const mod of PathEditor.MOD_COMMANDS) {
                const enabled = mod.code === 'RT';
                html += `<button type="button" class="path-suggestion-btn mod-btn${enabled ? '' : ' cell-empty'}" data-mod="${mod.code}" title="${mod.label}${enabled ? '' : ' (soon)'}">${mod.code}</button>`;
            }
            html += '</div>';
        } else {
            // ── Nothing active: show element creation buttons ─────────────
            html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Add element:</span>';
            html += `<button type="button" class="path-suggestion-btn elem-btn elem-btn-path"    data-elem="path"    title="New path contour">Path</button>`;
            html += `<button type="button" class="path-suggestion-btn elem-btn elem-btn-circle"  data-elem="circle"  title="Circle">Circle</button>`;
            html += `<button type="button" class="path-suggestion-btn elem-btn elem-btn-rect"    data-elem="rect"    title="Rectangle">Rect</button>`;
            html += `<button type="button" class="path-suggestion-btn elem-btn elem-btn-ellipse" data-elem="ellipse" title="Ellipse">Ellipse</button>`;
            html += '</div>';
        }

        this.suggestionsEl.innerHTML = html;
        this._bindSuggestionEvents();
    }

    /** @private */
    _bindSuggestionEvents() {
        this.suggestionsEl.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.input.value = btn.dataset.cmd + ' ';
                this.input.focus();
                this._renderSuggestions();
            });
        });
        this.suggestionsEl.querySelectorAll('.var-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cur = this.input.value;
                this.input.value = (cur.endsWith(' ') || !cur) ? cur + `{${btn.dataset.var}}` : cur + ` {${btn.dataset.var}}`;
                this.input.focus();
                this._renderSuggestions();
            });
        });
        this.suggestionsEl.querySelectorAll('.elem-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.elem;
                if (type === 'path') {
                    const cid     = Date.now();
                    const newElem = { type: 'polyline', contourId: cid, segIds: [], expanded: true, lines: [], _elem: null };
                    this._elements.push(newElem);
                    this._expandedContours.add(cid);
                    newElem._elem = this._buildPathGroup(newElem, this._elements.length);
                    this.elementsContainer.appendChild(newElem._elem);
                    this.clearAllSelection();
                    const header = newElem._elem?.querySelector?.('.pe-path-header');
                    header?.classList.add('path-line-selected');
                    this._lastSelectedElemRef = this._getTopLevelRef(newElem);
                    this._setActiveElem(`path:${cid}`);
                    this._renderSuggestions();
                } else {
                    // Delegate shape creation to the caller via a special change event
                    if (this.onShapeElementChange) this.onShapeElementChange(null, { _create: type });
                }
            });
        });

        this.suggestionsEl.querySelectorAll('.mod-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const modCode = String(btn.dataset.mod || '').toUpperCase();
                const elem = this._getActiveTopLevelElem();
                if (!elem) return;
                if (modCode !== 'RT') {
                    this.input.placeholder = `MOD ${modCode} ... (soon)`;
                    return;
                }

                const existing = Array.isArray(elem.transforms) ? [...elem.transforms] : [];
                const rt = { type: 'RT', raw: 'MOD RT', params: [''] };
                elem.transforms = [...existing, rt];
                this._renderElements();
                const ref = this._getTopLevelRef(elem);
                if (ref) this._setActiveElem(ref);
                this._fireOnChange();

                const refreshedElem = this._getActiveTopLevelElem();
                const modIndex = (refreshedElem?.transforms?.length ?? 1) - 1;
                const cell = refreshedElem?._elem?.querySelector?.(`.path-cell-mod-param[data-mod-index="${modIndex}"][data-mod-param="0"]`);
                if (refreshedElem && cell) {
                    this._activateModParamEdit(refreshedElem, modIndex, 0, 'angle', cell);
                }
            });
        });
    }

    /**
     * Show inline editor for a MOD parameter cell (currently RT angle).
     * @param {object} elem
     * @param {number} modIndex
     * @param {number} paramIndex
     * @param {string} label
     * @param {HTMLElement} cell
     * @private
     */
    _activateModParamEdit(elem, modIndex, paramIndex, label, cell) {
        if (this.activeEditType === 'mod-param'
                && this.activeEditLineData === elem
                && this.activeEditArgIndex === (modIndex * 100 + paramIndex)) {
            return;
        }
        this._clearActiveEdit();
        this.activeEditLineData = elem;
        this.activeEditType = 'mod-param';
        this.activeEditArgIndex = modIndex * 100 + paramIndex;

        const tr = Array.isArray(elem.transforms) ? elem.transforms[modIndex] : null;
        const cur = String(tr?.params?.[paramIndex] ?? '');

        cell.classList.add('active-edit');
        cell.innerHTML = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'path-cell-inline-input';
        input.value = cur;
        input.placeholder = label;
        cell.appendChild(input);

        const resize = () => {
            input.style.width = Math.max(25, Math.ceil(this.measureTextWidth(input.value || input.placeholder)) + 6) + 'px';
        };
        resize();
        input.addEventListener('input', resize);

        requestAnimationFrame(() => { input.focus(); input.select(); });

        const finish = (save = true) => {
            if (save) {
                const val = input.value.trim();
                const arr = Array.isArray(elem.transforms) ? elem.transforms : [];
                if (!arr[modIndex]) arr[modIndex] = { type: 'RT', raw: 'MOD RT', params: [] };
                const next = { ...arr[modIndex] };
                const params = Array.isArray(next.params) ? [...next.params] : [];
                params[paramIndex] = val;
                next.params = params;
                next.raw = `MOD ${next.type} ${params.join(' ').trim()}`.trim();
                arr[modIndex] = next;
                elem.transforms = arr;
                cell.textContent = val || label;
                cell.classList.toggle('cell-empty', !val);
                this._setParamCellTitle(cell, label, val);
                this._fireOnChange();
            } else {
                const oldVal = String(elem.transforms?.[modIndex]?.params?.[paramIndex] ?? '');
                cell.textContent = oldVal || label;
                cell.classList.toggle('cell-empty', !oldVal);
                this._setParamCellTitle(cell, label, oldVal);
            }
            this._clearActiveEdit();
            this._renderSuggestions();
        };

        input.addEventListener('blur', () => finish(true));
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter')  { e.preventDefault(); finish(true); }
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        });
        input.addEventListener('input', e => e.stopPropagation());

        this.activeEditInput = input;
        this._renderVariableSuggestions(label);
    }

    /** @private */
    _renderVariableSuggestions(argLabel) {
        const vars = this.getAvailableVariables();
        let html;
        if (vars.length > 0) {
            html = `<div class="path-suggestions-group"><span class="path-suggestions-label">Variables for <em>${argLabel}</em>:</span>`;
            vars.forEach(v => {
                const val = this.variableValues[v.varName];
                const vs  = val !== undefined ? `=${val}` : '';
                html += `<button type="button" class="path-suggestion-btn var-btn" data-var="${v.varName}">{${v.varName}}${vs}</button>`;
            });
            html += '</div>';
        } else {
            html = '<div class="path-suggestions-group"><span class="path-suggestions-label">No variables defined</span></div>';
        }
        this.suggestionsEl.innerHTML = html;
        this.suggestionsEl.querySelectorAll('.var-btn').forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (this.activeEditInput) this.insertVariableAtCursor(this.activeEditInput, btn.dataset.var);
            });
            btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
        });
    }

    // ─── Active element tracking ──────────────────────────────────────────────

    /** @private */
    _setActiveElem(elemId) {
        this._activeElemId = elemId;
        this.elementsContainer?.querySelectorAll('.pe-elem').forEach(el => el.classList.remove('pe-elem-active'));
        if (elemId?.startsWith('path:')) {
            const cid = elemId.slice(5);
            this.elementsContainer?.querySelectorAll(`.pe-elem[data-contour-id="${cid}"]`)
                .forEach(el => el.classList.add('pe-elem-active'));
        } else if (elemId?.startsWith('shape:')) {
            const sid = elemId.slice(6);
            this.elementsContainer?.querySelectorAll(`.pe-elem[data-seg-id="${sid}"]`)
                .forEach(el => el.classList.add('pe-elem-active'));
        } else if (elemId?.startsWith('group:')) {
            const gid = elemId.slice(6);
            this.elementsContainer?.querySelectorAll(`.pe-elem[data-group-id="${gid}"]`)
                .forEach(el => el.classList.add('pe-elem-active'));
        } else {
            // Clearing active state
            this._activeSubLine = null;
        }
        this._renderSuggestions();
    }

    /**
     * Inline-edit group name cell.
     * @param {object} elem
     * @param {HTMLElement} cell
     * @private
     */
    _activateGroupNameEdit(elem, cell) {
        if (!elem || !cell) return;
        this._clearActiveEdit();
        this.activeEditLineData = elem;
        this.activeEditType = 'group-name';
        this.activeEditArgIndex = 0;

        const current = String(elem.name ?? `Group ${elem.groupId}`);
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'path-cell-inline-input';
        input.value = current;
        input.placeholder = `Group ${elem.groupId}`;
        cell.classList.add('active-edit');
        input.select();
        cell.innerHTML = '';
        cell.appendChild(input);
        this.activeEditInput = input;

        const resize = () => {
            input.style.width = Math.max(25, Math.ceil(this.measureTextWidth(input.value || input.placeholder)) + 6) + 'px';
        };
        resize();
        input.addEventListener('input', (e) => {
            e.stopPropagation();
            resize();
        });

        const commit = () => {
            const raw = String(input.value ?? '').trim();
            const baseName = raw || `Group ${elem.groupId}`;
            const used = new Set(
                this._elements
                    .filter(e => e?.type === 'group' && Number(e.groupId) !== Number(elem.groupId))
                    .map(e => String(e?.name ?? '').trim())
                    .filter(Boolean)
            );
            let nextName = baseName;
            if (used.has(nextName)) {
                let idx = 2;
                while (used.has(`${baseName} ${idx}`)) idx++;
                nextName = `${baseName} ${idx}`;
            }
            elem.name = nextName;
            this._renderElements();
            this._emitTopLevelOrder();
            this._clearActiveEdit();
        };
        const cancel = () => {
            this._renderElements();
            this._clearActiveEdit();
        };

        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                commit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });
        input.addEventListener('blur', commit, { once: true });
        input.focus();
    }

    // ─── Selection API ────────────────────────────────────────────────────────

    /**
     * Highlight rows whose segId is in the provided set.
     * @param {Set<string>} ids
     * @param {{expandGroups?: boolean}} [options]
     */
    setSelectedElements(ids, { expandGroups = true } = {}) {
        this.clearAllSelection();
        if (!ids || !ids.size) {
            this._renderSuggestions();
            return;
        }

        const childrenByGroup = new Map();
        for (const elem of this._elements) {
            const parentId = this._optId(elem?.parentGroupId);
            if (!Number.isFinite(parentId)) continue;
            if (!childrenByGroup.has(parentId)) childrenByGroup.set(parentId, []);
            childrenByGroup.get(parentId).push(elem);
        }

        const collectGroupSegIds = (groupId) => {
            const out = [];
            const stack = [...(childrenByGroup.get(groupId) ?? [])];
            const seenGroups = new Set();
            while (stack.length > 0) {
                const item = stack.pop();
                if (!item) continue;
                if (item.type === 'group') {
                    const childGid = this._optId(item?.groupId);
                    if (!Number.isFinite(childGid) || seenGroups.has(childGid)) continue;
                    seenGroups.add(childGid);
                    stack.push(...(childrenByGroup.get(childGid) ?? []));
                    continue;
                }
                if (item.type === 'path' || item.type === 'polyline') {
                    if (Array.isArray(item.segIds)) out.push(...item.segIds.filter(Boolean));
                    continue;
                }
                if (item.segId) out.push(item.segId);
            }
            return [...new Set(out)];
        };

        // groupParentById: for the hasFullySelectedAncestorGroup walk.
        // groupFullySelected: whether every seg in the group subtree is in `ids`.
        const groupParentById = this._buildGroupParentMap();
        const groupFullySelected = new Map();
        for (const elem of this._elements) {
            if (elem?.type !== 'group') continue;
            const gid = this._optId(elem?.groupId);
            if (!Number.isFinite(gid)) continue;
            const groupSegIds = collectGroupSegIds(gid);
            groupFullySelected.set(gid, groupSegIds.length > 0 && groupSegIds.every(sid => ids.has(sid)));
        }

        const hasFullySelectedAncestorGroup = (groupId) => {
            let cur = groupParentById.get(groupId);
            const seen = new Set();
            while (Number.isFinite(cur) && !seen.has(cur)) {
                if (groupFullySelected.get(cur) === true) return true;
                seen.add(cur);
                cur = groupParentById.get(cur);
            }
            return false;
        };

        let lastSelectedLine = null;
        let lastSelectedParent = null;
        for (const elem of this._elements) {
            if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                if (ids.has(elem.segId)) elem._elem?.classList.add('path-line-selected');
            } else if (elem.type === 'group') {
                const gid = this._optId(elem?.groupId);
                if (!Number.isFinite(gid)) continue;
                if (groupFullySelected.get(gid) === true && !hasFullySelectedAncestorGroup(gid)) {
                    const rowEl = this._getTopLevelRowElement(elem);
                    rowEl?.classList.add('path-line-selected');
                }
            } else if (elem.type === 'path' || elem.type === 'polyline') {
                // Highlight the path group header if any of its segments are selected,
                // or if the M-row synthetic segId "m:<contourId>" is selected.
                const headerEl = elem._elem?.querySelector?.('.pe-path-header');
                const anySelected = elem.segIds?.some(sid => ids.has(sid))
                    || ids.has(`m:${elem.contourId}`);
                if (anySelected && headerEl) headerEl.classList.add('path-line-selected');
                // Highlight individual sub-lines
                for (const lineData of elem.lines) {
                    const lineRef = this._getSelectableLineId(lineData, elem);
                    if (lineRef && ids.has(lineRef)) {
                        lineData._elem?.classList.add('path-line-selected');
                        lastSelectedLine = lineData;
                        lastSelectedParent = elem;
                    }
                }
            }
        }
        if (expandGroups) this._expandSelectionToGroups();
        if (lastSelectedLine && lastSelectedParent) {
            this._activeSubLine = lastSelectedLine;
            this._lastSelectedLine = lastSelectedLine;
            this._lastSelectedLineRef = this._getLineRef(lastSelectedLine, lastSelectedParent);
            this._setActiveElem(`path:${lastSelectedParent.contourId}`);
        }
        this._renderSuggestions();
    }

    /** Remove all selection highlights. */
    clearAllSelection() {
        this._activeSubLine = null;
        this.elementsContainer?.querySelectorAll('.path-line-selected')
            .forEach(el => el.classList.remove('path-line-selected'));
    }

    /** @returns {Array<{ref:string, elem:object, rowEl:HTMLElement|null}>} */
    _getSelectedTopLevelRows() {
        return this._getAllTopLevelRows().filter(r => r.rowEl?.classList.contains('path-line-selected'));
    }

    /** @returns {boolean} */
    hasTopLevelSelection() {
        return this._getSelectedTopLevelRows().length > 0;
    }

    /** @returns {boolean} */
    canGroupSelection() {
        return this._getSelectedTopLevelRows().length > 0;
    }

    /** @returns {boolean} */
    canUngroupSelection() {
        const selected = this._getSelectedTopLevelRows();
        if (selected.length === 0) return false;
        return selected.some(({ elem }) =>
            elem?.type === 'group' || Number.isFinite(this._optId(elem?.parentGroupId))
        );
    }

    /**
     * Group currently selected top-level elements into a new Group node.
     * @returns {boolean}
     */
    groupSelection() {
        const selected = this._getSelectedTopLevelRows();
        if (selected.length < 1) return false;

        // Pre-build a Set<number> of selected group IDs for O(1) ancestor lookup.
        const selectedGroupIdSet = new Set(
            selected
                .filter(r => r.elem?.type === 'group')
                .map(r => Number(r.elem.groupId))
                .filter(Number.isFinite)
        );
        /** @param {object} elem @returns {boolean} */
        const hasSelectedAncestorGroup = (elem) => {
            let parent = this._resolveParentGroupById(elem);
            const seen = new Set();
            while (parent && !seen.has(Number(parent.groupId))) {
                const gid = Number(parent.groupId);
                if (selectedGroupIdSet.has(gid)) return true;
                seen.add(gid);
                parent = this._resolveParentGroupById(parent);
            }
            return false;
        };

        const effectiveSelected = selected.filter(({ elem }) => !hasSelectedAncestorGroup(elem));
        if (effectiveSelected.length < 1) return false;

        const refs = effectiveSelected.map(r => r.ref);
        const seedIndices = refs
            .map(ref => this._elements.findIndex(el => this._getTopLevelRef(el) === ref))
            .filter(i => i >= 0)
            .sort((a, b) => a - b);
        if (seedIndices.length === 0) return false;

        const indices = this._expandMoveIndicesWithGroupDescendants(seedIndices)
            .filter(i => i >= 0 && i < this._elements.length)
            .sort((a, b) => a - b);
        if (indices.length === 0) return false;

        const selectedIndexSet = new Set(seedIndices);

        const firstParent = this._resolveParentGroupById(this._elements[seedIndices[0]]);
        const parentGroupId = Number(firstParent?.groupId) || null;
        const parentGroupGuid = String(firstParent?.guid ?? '') || null;
        const gid = this._allocateGroupId();
        const groupGuid = this._newGuid();
        const groupNode = {
            type: 'group',
            groupId: gid,
            guid: groupGuid,
            name: `Group ${gid}`,
            expanded: true,
            parentGroupId,
            parentGroupGuid,
            transforms: [],
            _elem: null,
        };

        const moved = indices.map(i => {
            const item = this._elements[i];
            // Seed elements (directly selected) join the new group;
            // descendant elements (pulled in via expandMoveIndices) keep existing parentGroupId.
            return selectedIndexSet.has(i)
                ? { ...item, parentGroupId: gid, parentGroupGuid: groupGuid }
                : { ...item };
        });
        for (let i = indices.length - 1; i >= 0; i--) this._elements.splice(indices[i], 1);
        const insertAt = Math.min(indices[0], this._elements.length);
        this._elements.splice(insertAt, 0, groupNode, ...moved);
        this._renderElements();
        this.clearAllSelection();
        const groupElem = this._elements.find(e => e.type === 'group' && Number(e.groupId) === gid) ?? null;
        const groupRow = this._getTopLevelRowElement(groupElem);
        groupRow?.classList.add('path-line-selected');
        this._lastSelectedElemRef = `group:${gid}`;
        this._setActiveElem(`group:${gid}`);
        this._emitTopLevelOrder();
        return true;
    }

    /**
     * Ungroup selected groups or selected members from their groups.
     * @returns {boolean}
     */
    ungroupSelection() {
        const selectedRows = this._getSelectedTopLevelRows();
        if (selectedRows.length === 0) return false;

        let changed = false;
        const selectedGroupIds = new Set(
            selectedRows
                .map(r => r.elem)
                .filter(e => e?.type === 'group')
                .map(e => Number(e.groupId))
                .filter(Number.isFinite)
        );

        // Snapshot the parent map BEFORE structural mutations — the first loop removes
        // group nodes from _elements, which would break live ancestry queries.
        const originalParentByGroupId = this._buildGroupParentMap();

        const hasAncestorInSet = (groupId, set) => {
            let cur = originalParentByGroupId.get(groupId);
            const seen = new Set();
            while (Number.isFinite(cur) && !seen.has(cur)) {
                if (set.has(cur)) return true;
                seen.add(cur);
                cur = originalParentByGroupId.get(cur);
            }
            return false;
        };

        const rootSelectedGroupIds = new Set(
            [...selectedGroupIds].filter(gid =>
                !hasAncestorInSet(gid, selectedGroupIds)
            )
        );

        if (rootSelectedGroupIds.size > 0) {
            // Remove the group wrapper; promote its direct children one level up.
            // Nested sub-groups keep their own children intact — only their
            // parentGroupId is re-pointed to the removed group's parent.
            for (const gid of rootSelectedGroupIds) {
                const nextParentGid = originalParentByGroupId.get(gid) ?? null;
                const nextParentGroup = Number.isFinite(nextParentGid)
                    ? this._elements.find(e => e.type === 'group' && Number(e.groupId) === nextParentGid)
                    : null;
                const nextParent = Number(nextParentGroup?.groupId) || null;
                const nextParentGuid = String(nextParentGroup?.guid ?? '') || null;
                const before = this._elements.length;
                this._elements = this._elements
                    .filter(e => !(e.type === 'group' && Number(e.groupId) === gid))
                    .map((item) => {
                        if (Number(item?.parentGroupId) !== gid) return item;
                        changed = true;
                        return { ...item, parentGroupId: nextParent, parentGroupGuid: nextParentGuid };
                    });
                changed = changed || this._elements.length !== before;
            }
        } else {
            // No groups selected — extract individually-selected non-group elements
            // from their parent groups.
            for (const row of selectedRows) {
                const elem = row.elem;
                if (!elem || elem.type === 'group') continue;
                if (!Number.isFinite(this._optId(elem?.parentGroupId))) continue;
                const idx = this._elements.indexOf(elem);
                if (idx < 0) continue;
                this._elements[idx] = { ...elem, parentGroupId: null, parentGroupGuid: null };
                changed = true;
            }
        }

        if (!changed) return false;
        this._pruneEmptyGroups();
        this._renderElements();
        this._emitTopLevelOrder();
        return true;
    }

    // ─── Parsing infrastructure ─────────────────────────────────────────────

    /**
     * Parse a line into command + parameter tokens
     * @param {string} text - Line text to parse
     * @returns {Object|null} Parsed line object or null if invalid
     * @private
     */
    parseLine(text) {
        if (!text || !text.trim()) return null;
        
        const trimmed = text.trim();
        const parts = this.splitBySpaces(trimmed);
        
        if (parts.length === 0) return null;
        
        const firstPart = parts[0];
        if (firstPart.length === 1 && SVG_COMMANDS.has(firstPart)) {
            const cmd = firstPart.toUpperCase();
            return {
                cmd: firstPart,
                cmdUpper: cmd,
                params: parts.slice(1),
                def: SVG_COMMAND_DEFS[cmd] || { args: [], label: '' }
            };
        }
        
        return null;
    }
    
    /**
     * Split string by spaces, keeping {varName} blocks together
     * @param {string} text - Text to split
     * @returns {string[]} Array of parts
     * @private
     */
    splitBySpaces(text) {
        const parts = [];
        let current = '';
        let braceDepth = 0;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '{') { braceDepth++; current += char; }
            else if (char === '}') { braceDepth--; current += char; }
            else if (char === ' ' && braceDepth === 0) {
                if (current.trim()) parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        if (current.trim()) parts.push(current.trim());
        return parts;
    }
    
    /**
     * Evaluate a single parameter token (replace variables, compute math)
     * @param {string} token - Token to evaluate
     * @returns {string} Evaluated value as string
     * @private
     */
    evaluateToken(token) {
        if (!token || !token.trim()) return '0';
        
        let expr = token.trim();
        
        // Replace variable references {varName}
        expr = expr.replace(VARIABLE_TOKEN_RE_GLOBAL, (match, varName) => {
            const value = this.variableValues[varName];
            return value !== undefined && !isNaN(Number(value)) ? String(value) : '0';
        });
        
        // Simple number check
        const num = parseFloat(expr);
        if (!isNaN(num) && isFinite(num)) {
            if (expr.trim().replace(/\s/g, '') === String(num)) return String(num);
        }
        
        // Math expression
        try {
            const result = evaluateMathExpression(expr);
            if (result !== null && result !== undefined && !isNaN(Number(result)) && isFinite(Number(result))) {
                return String(Math.round(Number(result) * 1000000) / 1000000);
            }
        } catch (e) { /* ignore */ }
        
        return '0';
    }
    
    /**
     * Evaluate a full line (replace variables, compute expressions)
     * @param {string} text - Line text
     * @returns {string} Evaluated line
     * @private
     */
    evaluateLine(text) {
        if (!text || !text.trim()) return '';
        const parsed = this.parseLine(text);
        if (!parsed) return '';
        const { cmd, params } = parsed;
        if (cmd.toUpperCase() === 'Z') return cmd;
        return cmd + ' ' + params
            .map((p, i) => pathUiToStoredToken(cmd, i, this.evaluateToken(p), this._pathParamSpace))
            .join(' ');
    }

    /**
     * Update param cell title with formula preview: label or "label=evaluated".
     * @param {HTMLElement} cell
     * @param {string} label
     * @param {string} rawValue
     * @private
     */
    _setParamCellTitle(cell, label, rawValue) {
        const val = String(rawValue ?? '').trim();
        const evaluated = val ? this.evaluateToken(val) : '';
        const hasFormula = val && val !== evaluated;
        cell.title = hasFormula ? `${label}=${evaluated}` : label;
    }

    /**
     * Shape data in PathEditor is stored in SVG/canvas space (Y-down)
     * in both preview and edit flows.
     * @returns {boolean}
     * @private
     */
    _isCanvasShapeSpace() {
        return true;
    }

    /**
     * Transform parameters when changing command type
     * Preserves values by argument name (x, y) rather than position
     * 
     * Examples:
     * - L 10 20 → H: keeps x=10, drops y → H 10
     * - L 10 20 → V: keeps y=20, drops x → V 20
     * - V 20 → L: keeps y=20, adds default x=0 → L 0 20
     * - H 10 → L: keeps x=10, adds default y=0 → L 10 0
     * 
     * @param {string[]} oldParams - Original parameter values
     * @param {string[]} oldArgs - Original argument names
     * @param {string[]} newArgs - New argument names
     * @returns {string[]} Transformed parameters for new command
     * @private
     */
    transformParamsForCommand(oldParams, oldArgs, newArgs) {
        // Build map of argName -> value from old params
        const argValues = {};
        oldArgs.forEach((argName, index) => {
            if (index < oldParams.length && oldParams[index]) {
                argValues[argName] = oldParams[index];
            }
        });
        
        // Build new params by looking up values by arg name
        const newParams = [];
        newArgs.forEach(argName => {
            if (argValues[argName] !== undefined) {
                newParams.push(argValues[argName]);
            } else {
                // Default value for missing args
                newParams.push('0');
            }
        });
        
        return newParams;
    }
    
    /**
     * Measure text width using canvas
     * @param {string} text - Text to measure
     * @returns {number} Width in pixels
     * @private
     */
    measureTextWidth(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '11px "JetBrains Mono", monospace';
        return ctx.measureText(text).width;
    }
    
    /**
     * Position cursor in input based on click coordinates
     * @param {HTMLInputElement} input - Input element
     * @param {MouseEvent} clickEvent - Click event
     * @private
     */
    positionCursorAtClick(input, clickEvent) {
        const rect = input.getBoundingClientRect();
        const clickX = clickEvent.clientX - rect.left;
        const text = input.value;
        let pos = 0;
        let currentWidth = 0;
        
        while (pos < text.length) {
            const charWidth = this.measureTextWidth(text[pos]);
            if (currentWidth + charWidth / 2 > clickX) break;
            currentWidth += charWidth;
            pos++;
        }
        
        input.focus();
        input.setSelectionRange(pos, pos);
    }
    
    /**
     * Insert variable reference at cursor position
     * @param {HTMLInputElement} input - Input element
     * @param {string} varName - Variable name to insert
     * @private
     */
    insertVariableAtCursor(input, varName) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const before = input.value.substring(0, start);
        const after = input.value.substring(end);
        input.value = before + `{${varName}}` + after;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
        input.setSelectionRange(start + varName.length + 2, start + varName.length + 2);
    }
    
    /**
     * Split a path string into individual command strings.
     * Used internally by _buildLinesFromPath().
     * @param {string} pathString
     * @returns {string[]}
     * @private
     */
    _splitPathIntoCommands(pathString) {
        const commands = [];
        let current = '';
        let i = 0;
        while (i < pathString.length) {
            const char = pathString[i];
            if (SVG_COMMANDS.has(char)) {
                const prevChar = i > 0 ? pathString[i - 1] : '';
                const isAfterSpace = !prevChar || prevChar === ' ' || prevChar === '\n' || prevChar === '\r';
                if (i === 0 || isAfterSpace) {
                    if (current.trim()) commands.push(current.trim());
                    current = char;
                    i++;
                    continue;
                }
            }
            current += char;
            i++;
        }
        if (current.trim()) commands.push(current.trim());
        return commands;
    }

    /**
     * Get an attribute value from shape element data as a display string.
     * @param {string} type - Shape type
     * @param {object} data - Shape data
     * @param {string} attrKey - Attribute key
     * @returns {string}
     * @private
     */
    _shapeAttrValue(type, data, attrKey) {
        return this._shapeAttrValueForSpace(type, data, attrKey, this._shapeDataSpace);
    }

    /**
     * Get an attribute value from shape element data as a display string
     * for an explicit coordinate space.
     * @param {string} type
     * @param {object} data
     * @param {string} attrKey
     * @param {'bit'|'canvas'} shapeSpace
     * @returns {string}
     * @private
     */
    _shapeAttrValueForSpace(type, data, attrKey, shapeSpace = this._shapeDataSpace) {
        const exprVal = data?._expr?.[attrKey];
        if (exprVal != null && exprVal !== '') return String(exprVal);
        if (type === 'circle') {
            if (attrKey === 'cx') return String(parseFloat((data.center?.x ?? 0).toFixed(4)));
            if (attrKey === 'cy') {
                const ui = shapeStoredToUiNumber('cy', data.center?.y ?? 0, shapeSpace);
                return String(parseFloat(Number(ui).toFixed(4)));
            }
            if (attrKey === 'r')  return data.radiusExpr ?? String(parseFloat((data.radius ?? 0).toFixed(4)));
        }
        if (type === 'rect') {
            // data uses w/h directly (not width/height)
            const key = attrKey === 'w' ? 'w' : attrKey === 'h' ? 'h' : attrKey;
            const raw = data[key];
            const v = isShapeYAttr(attrKey)
                ? shapeStoredToUiNumber(attrKey, Number(raw ?? 0), shapeSpace)
                : raw;
            return v !== undefined ? String(parseFloat(Number(v).toFixed(4))) : '';
        }
        if (type === 'ellipse') {
            const map = { cx: 'cx', cy: 'cy', rx: 'rx', ry: 'ry' };
            const raw = data[map[attrKey]];
            const v = isShapeYAttr(attrKey)
                ? shapeStoredToUiNumber(attrKey, Number(raw ?? 0), shapeSpace)
                : raw;
            return v !== undefined ? String(parseFloat(Number(v).toFixed(4))) : '';
        }
        return '';
    }

    /**
     * Build a change-object from a modified attribute value string.
     * @param {string} type - Shape type
     * @param {object} data - Current shape data (for reference)
     * @param {string} attrKey - Attribute key
     * @param {string} val - New value (number or {expr})
     * @returns {object} changes to merge into segment data
     * @private
     */
    _shapeAttrToChanges(type, data, attrKey, val) {
        return this._shapeAttrToChangesForSpace(type, data, attrKey, val, this._shapeDataSpace);
    }

    /**
     * Build a change-object from a modified attribute value string for
     * an explicit coordinate space.
     * @param {string} type
     * @param {object} data
     * @param {string} attrKey
     * @param {string} val
     * @param {'bit'|'canvas'} shapeSpace
     * @returns {object}
     * @private
     */
    _shapeAttrToChangesForSpace(type, data, attrKey, val, shapeSpace = this._shapeDataSpace) {
        const toNum  = s => parseFloat(this.evaluateToken(s));
        const isFormula = s => this._isFormulaParamToken(s);
        const withExprMap = (key, rawVal) => {
            const map = { ...(data?._expr ?? {}) };
            if (isFormula(rawVal)) map[key] = rawVal.trim();
            else delete map[key];
            return map;
        };

        if (type === 'circle') {
            if (attrKey === 'cx') return {
                center: { ...data.center, x: toNum(val) },
                _expr: withExprMap('cx', val),
            };
            if (attrKey === 'cy') return {
                center: { ...data.center, y: shapeUiToStoredNumber('cy', toNum(val), shapeSpace) },
                _expr: withExprMap('cy', val),
            };
            if (attrKey === 'r') {
                const exprMap = withExprMap('r', val);
                const rExpr = exprMap.r;
                if (rExpr) return { radiusExpr: rExpr, radius: toNum(val), _expr: exprMap };
                return { radius: toNum(val), radiusExpr: undefined, _expr: exprMap };
            }
        }
        if (type === 'rect') {
            // data uses w/h directly
            const nextVal = isShapeYAttr(attrKey)
                ? shapeUiToStoredNumber(attrKey, toNum(val), shapeSpace)
                : toNum(val);
            return { [attrKey]: nextVal, _expr: withExprMap(attrKey, val) };
        }
        if (type === 'ellipse') {
            const nextVal = isShapeYAttr(attrKey)
                ? shapeUiToStoredNumber(attrKey, toNum(val), shapeSpace)
                : toNum(val);
            return { [attrKey]: nextVal, _expr: withExprMap(attrKey, val) };
        }
        return {};
    }

    /**
     * Return true for shape attributes that represent Y coordinate in UI.
     * @param {string} attrKey
     * @returns {boolean}
     * @private
     */
    _isShapeYAttr(attrKey) {
        return isShapeYAttr(attrKey);
    }

    /**
     * Preview-only UI conversion for shape param value presentation.
     * Geometry/storage remains unchanged.
     * @param {string} type
     * @param {object} data
     * @param {string} attrKey
     * @returns {string}
     * @private
     */
    _shapeAttrDisplayValue(type, data, attrKey) {
        return this._shapeAttrValue(type, data, attrKey);
    }

    /**
     * Convert user-entered UI token back to storage token for preview-only Y inversion.
     * @param {string} attrKey
     * @param {string} uiValue
     * @returns {string}
     * @private
     */
    _shapeInputTokenToStorage(attrKey, uiValue) {
        return String(uiValue ?? '');
    }

    // ─── Backward-compat stubs ────────────────────────────────────────────────

    /**
     * Load a flat SVG path string into the editor.
     * If a path/polyline element already exists it is updated in-place;
     * otherwise a new one is prepended (shape elements are preserved).
     * Used by BitsManager and ProfileEditor cancel/save flows.
     * @param {string} pathStr
     */
    setPath(pathStr) {
        if (!pathStr) return;

        // Path text is stored in profile bit-space (Y-up).
        this._shapeDataSpace = 'bit';

        // Preserve expand/collapse state by path position across preview refreshes.
        const prevPathExpandedByPos = this._elements
            .filter(e => e.type === 'path' || e.type === 'polyline')
            .map(e => !!e.expanded);
        const prevPathExpandedBySig = new Map(
            this._elements
                .filter(e => e.type === 'path' || e.type === 'polyline')
                .map(e => [this._contourSignatureFromLines(e.lines), !!e.expanded])
                .filter(([sig]) => !!sig)
        );

        // ── Split the flat path string into M-separated sub-paths ────────────
        const allCmds  = this._splitPathIntoCommands(pathStr);
        const subPaths = [];
        let cur        = [];
        for (const cmd of allCmds) {
            if (/^[Mm]/.test(cmd) && cur.length) { subPaths.push(cur); cur = []; }
            cur.push(cmd);
        }
        if (cur.length) subPaths.push(cur);

        // Completely replace all elements (path, polyline AND shape rows) and re-parse
        // from scratch. This prevents stale editor-mode elements (e.g. seg-1 circles)
        // from surviving alongside freshly-parsed preview elements (preview-circle-1).
        this._elements = [];
        this._expandedContours = new Set();

        let cid = 1;
        for (const cmds of subPaths) {
            const pathPos = cid - 1;
            const sig = this._contourSignatureFromCommands(cmds);
            const expanded = prevPathExpandedBySig.has(sig)
                ? !!prevPathExpandedBySig.get(sig)
                : (prevPathExpandedByPos[pathPos] ?? true);
            const pathElem = {
                type: 'polyline', contourId: cid, segIds: [], expanded,
                lines: cmds.map(text => ({ text: text.trim(), segId: null, _elem: null })),
                _elem: null,
            };
            this._elements.push(pathElem);
            if (expanded) this._expandedContours.add(cid);
            cid++;
        }

        this._renderElements();
        this._fireOnChange();
    }

    /**
     * Return the raw formula path text (all path/polyline sub-lines joined, not evaluated).
     * Used by BitsManager to snapshot the formula path before entering profile edit mode.
     * @returns {string}
     */
    getPath() {
        const fromRawInput = this.rawHiddenInput?.value?.trim();
        if (fromRawInput) return fromRawInput;

        const parts = [];
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                const text = elem.lines.map(l => l.text).filter(Boolean).join(' ');
                if (text) parts.push(text);
            } else if (elem.type === 'circle') {
                const { center, radius } = elem.data ?? {};
                if (center != null && radius != null) {
                    const r6 = v => +Number(v).toFixed(6);
                    const cx = center.x;
                    const radNum = Number(radius);
                    const cxRaw = this._shapeAttrValue('circle', elem.data ?? {}, 'cx') || r6(cx);
                    const cyRaw = this._shapeAttrValue('circle', elem.data ?? {}, 'cy') || r6(0);
                    const radRaw = this._shapeAttrValue('circle', elem.data ?? {}, 'r') || r6(radNum);
                    const circleCmd =
                        `M (${cxRaw})-(${radRaw}) -(${cyRaw})` +
                        ` A ${radRaw} ${radRaw} 0 1 0 (${cxRaw})+(${radRaw}) -(${cyRaw})` +
                        ` A ${radRaw} ${radRaw} 0 1 0 (${cxRaw})-(${radRaw}) -(${cyRaw})` +
                        ` Z`;
                    parts.push(circleCmd);
                }
            }
        }
        return parts.join(' ');
    }

    /**
     * Return raw path text for contour rows only (path/polyline), excluding standalone
     * shape rows. Used by ProfileEditor formula cache to align with
     * EditorStateManager.exportPathWithMap({skipShapes:true}).
     * @returns {string}
     */
    getContoursRawPath() {
        const parts = [];
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                const text = elem.lines.map(l => l.text).filter(Boolean).join(' ');
                if (text) parts.push(text);
            }
        }
        return parts.join(' ');
    }

    /**
     * Snapshot current shape parameter tokens as displayed in PathEditor.
     * Used by ProfileEditor to preserve formula tokens in edit mode state.
     *
     * @returns {Array<{type:string, segId:string|null, attrs:Record<string,string>}>}
     */
    getShapeParamSnapshot() {
        const snapshot = [];
        for (const elem of this._elements) {
            if (!(elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse')) continue;
            const attrs = PathEditor.SHAPE_DEFS[elem.type]?.attrs ?? [];
            const values = {};
            for (const attr of attrs) {
                values[attr] = this._shapeAttrValue(elem.type, elem.data ?? {}, attr);
            }
            snapshot.push({ type: elem.type, segId: elem.segId ?? null, attrs: values });
        }
        return snapshot;
    }

    /**
     * Non-destructively bind editor rows to external segment IDs.
     *
     * This method updates `line.segId`, `elem.segIds` and shape `elem.segId`
     * without rebuilding DOM or touching order/expanded state.
     *
     * Used by ProfileEditor in edit mode to keep one PathEditor structure
     * across preview/edit transitions while still enabling canvas selection mapping.
     *
     * @param {{lineSegIds?: Array<string|null>, shapeSegIds?: string[]}} [bindings]
     */
    bindSegmentIds(bindings = {}) {
        const lineSegIds = Array.isArray(bindings.lineSegIds) ? bindings.lineSegIds : [];
        const shapeSegIds = Array.isArray(bindings.shapeSegIds) ? bindings.shapeSegIds : [];

        let lineIndex = 0;
        let shapeIndex = 0;
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                const segIds = [];
                for (const line of elem.lines) {
                    const sid = lineSegIds[lineIndex] ?? null;
                    line.segId = sid;
                    if (sid && typeof sid === 'string' && !sid.startsWith('m:') && !segIds.includes(sid)) {
                        segIds.push(sid);
                    }
                    lineIndex++;
                }
                elem.segIds = segIds;
            } else if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                const sid = shapeSegIds[shapeIndex] ?? null;
                if (sid) elem.segId = sid;
                shapeIndex++;
            }
        }
    }

    /**
     * Return true when incoming elements require full structural rebuild.
     *
     * Structural rebuild is required when top-level rows differ (count/order/type),
     * path command counts differ, contour IDs differ, or shape display attributes
     * changed (including newly created/deleted shapes).
     *
     * @param {Array} elements
     * @returns {boolean}
     */
    needsElementsRebuild(elements) {
        if (!Array.isArray(elements)) return true;
        if (elements.length !== this._elements.length) return true;

        for (let i = 0; i < elements.length; i++) {
            const incoming = elements[i];
            const current = this._elements[i];
            if (!incoming || !current) return true;
            const incomingType = incoming.type === 'symmetry' ? 'path' : incoming.type;
            const currentType = current.type === 'symmetry' ? 'path' : current.type;
            if (incomingType !== currentType) return true;
            if ((incoming.type === 'symmetry') !== !!current.isSymmetry) return true;

            if (incomingType === 'path' || incomingType === 'polyline') {
                if (incoming.contourId !== current.contourId) return true;
                const incomingLineCount = incoming.path != null
                    ? this._splitPathIntoCommands(incoming.path).length
                    : (Array.isArray(incoming.lines) ? incoming.lines.length : current.lines.length);
                if ((current.lines?.length ?? 0) !== incomingLineCount) return true;
                continue;
            }

            if (incomingType === 'circle' || incomingType === 'rect' || incomingType === 'ellipse') {
                if (incoming.segId !== current.segId) return true;
                const inParent = this._optId(incoming?.parentContourId);
                const curParent = this._optId(current?.parentContourId);
                if (inParent !== curParent) return true;
                const attrs = PathEditor.SHAPE_DEFS[incomingType]?.attrs ?? [];
                for (const attr of attrs) {
                    const a = this._shapeAttrValue(incomingType, current.data ?? {}, attr);
                    const b = this._shapeAttrValue(incomingType, incoming.data ?? {}, attr);
                    if (a !== b && !this._shapeTokenEquivalent(a, b)) return true;
                }
                continue;
            }

            return true;
        }

        return false;
    }

    /**
     * Update existing path/polyline sub-lines in place from a flat path string.
     *
     * Returns `true` only when the command structure is compatible (same command
     * count and same command letters in order). In that case DOM is preserved and
     * only cell values are refreshed. Otherwise returns `false` so caller can
     * fallback to full `setElements()` rebuild.
     *
     * @param {string} pathStr
     * @param {Array<string|null>} [lineSegIds=[]]
     * @returns {boolean}
     */
    updatePathLinesInPlace(pathStr, lineSegIds = []) {
        const cmds = this._splitPathIntoCommands(pathStr || '');
        const allLines = [];
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                for (const line of elem.lines) allLines.push(line);
            }
        }
        if (cmds.length !== allLines.length) return false;

        for (let i = 0; i < cmds.length; i++) {
            const oldParsed = this.parseLine(allLines[i]?.text ?? '');
            const newParsed = this.parseLine(cmds[i] ?? '');
            if (!oldParsed || !newParsed || oldParsed.cmdUpper !== newParsed.cmdUpper) {
                return false;
            }
        }

        for (let i = 0; i < allLines.length; i++) {
            const lineData = allLines[i];
            const incomingText = (cmds[i] ?? '').trim();
            const formulaBackup = lineData._formulaText ?? (this._hasFormulaToken(lineData.text) ? lineData.text : null);
            const chosenText = this._chooseLineTextWithFormulaPriority(lineData.text, formulaBackup, incomingText);
            if (chosenText !== incomingText) {
                lineData._formulaText = formulaBackup ?? (this._hasFormulaToken(chosenText) ? chosenText : null);
            } else if (this._hasFormulaToken(lineData.text)) {
                lineData._formulaText = lineData.text;
            }
            lineData.text = chosenText;
            lineData.segId = lineSegIds[i] ?? null;
            if (lineData._elem) {
                const parentElem = this._elements.find(e =>
                    (e.type === 'path' || e.type === 'polyline') && e.lines.includes(lineData));
                if (parentElem) this._buildLineCellsInElem(lineData._elem, lineData, parentElem);
            }
        }

        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                const segIds = [];
                for (const line of elem.lines) {
                    const sid = line.segId;
                    if (sid && typeof sid === 'string' && !sid.startsWith('m:') && !segIds.includes(sid)) {
                        segIds.push(sid);
                    }
                }
                elem.segIds = segIds;
                const expandBtn = elem._elem?.querySelector?.('.path-cell-cmd');
                if (expandBtn) {
                    const label = this._classifyContourLabel(elem.lines);
                    const isExpanded = elem.expanded ?? false;
                    expandBtn.textContent = label + (isExpanded ? ' ▼' : ' ►');
                }
            }
        }
        return this._shapeDataSpace === 'canvas';
    }

    /**
     * Update existing shape rows in place from incoming elements.
     *
     * Returns `true` when all shape rows were updated without structural changes
     * (same row count/order/cell layout). Returns `false` when caller must fallback
     * to full `setElements()` rebuild.
     *
     * @param {Array} elements
     * @returns {boolean}
     */
    updateShapeRowsInPlace(elements) {
        if (!Array.isArray(elements) || elements.length !== this._elements.length) return false;
        for (let i = 0; i < elements.length; i++) {
            const incoming = elements[i];
            const current = this._elements[i];
            if (!incoming || !current) return false;
            if (incoming.type !== current.type) return false;
            if (!(incoming.type === 'circle' || incoming.type === 'rect' || incoming.type === 'ellipse')) continue;

            const rowEl = current._elem;
            if (!rowEl) return false;

            current.segId = incoming.segId;
            const nextData = { ...(incoming.data ?? {}) };
            const attrs = PathEditor.SHAPE_DEFS[incoming.type]?.attrs ?? [];
            for (const attrKey of attrs) {
                const prevVal = this._shapeAttrValue(incoming.type, current.data ?? {}, attrKey);
                const incomingVal = this._shapeAttrValue(incoming.type, nextData, attrKey);
                const chosenVal = this._chooseShapeAttrWithFormulaPriority(prevVal, incomingVal);
                if (chosenVal !== incomingVal) {
                    Object.assign(nextData, this._shapeAttrToChanges(incoming.type, nextData, attrKey, chosenVal));
                }
            }
            current.data = nextData;
            rowEl.dataset.segId = current.segId;

            const def = PathEditor.SHAPE_DEFS[incoming.type];
            const paramCells = [...rowEl.querySelectorAll('.path-cell-param[data-attr]')];
            let cellIndex = 0;
            for (const attrKey of def.attrs) {
                const val = this._shapeAttrDisplayValue(incoming.type, current.data, attrKey);
                if (val === '' && (attrKey === 'rx' || attrKey === 'ry')) continue;
                const cell = paramCells[cellIndex];
                if (!cell) return false;
                cell.dataset.attr = attrKey;
                this._setParamCellTitle(cell, attrKey, val);
                cell.textContent = val || attrKey;
                cell.classList.toggle('cell-empty', !val);
                cellIndex++;
            }
            if (cellIndex !== paramCells.length) return false;
        }
        return true;
    }

    /** @deprecated Use setElements() instead */
    setShapeElements(_arr) { /* no-op */ }

    /**
     * Highlight sub-lines by flat index (legacy BitsManager preview) or by segId.
     * @param {Array<number|string>} indices
     */
    setSelectedLines(indices) {
        this.clearAllSelection();
        if (!indices?.length) {
            this._lastSelectedLine = null;
            this._lastSelectedLineRef = null;
            this._renderSuggestions();
            return;
        }
        const allLines = this._elements.flatMap(e =>
            (e.type === 'path' || e.type === 'polyline') ? e.lines : []);
        let lastSelected = null;
        for (const idx of indices) {
            if (typeof idx === 'number') {
                const line = allLines[idx];
                line?._elem?.classList.add('path-line-selected');
                if (line) lastSelected = line;
            } else if (idx != null) {
                const line = allLines.find((l) => {
                    if (l.segId === idx) return true;
                    const parent = this._elements.find(e =>
                        (e.type === 'path' || e.type === 'polyline') && e.lines.includes(l));
                    return this._getSelectableLineId(l, parent) === idx;
                });
                line?._elem?.classList.add('path-line-selected');
                if (line) lastSelected = line;
            }
        }
        if (lastSelected) {
            this._activeSubLine = lastSelected;
            this._lastSelectedLine = lastSelected;
            const parentElem = this._elements.find(e =>
                (e.type === 'path' || e.type === 'polyline') && e.lines.includes(lastSelected));
            if (parentElem) {
                this._lastSelectedLineRef = this._getLineRef(lastSelected, parentElem);
                this._setActiveElem(`path:${parentElem.contourId}`);
            }
        }
        this._renderSuggestions();
    }

    /** Alias for clearAllSelection */
    clearLineSelection()   { this.clearAllSelection(); }
    /** Alias for clearAllSelection */
    clearShapeSelection()  { this.clearAllSelection(); }
    /** @deprecated No equivalent in new design */
    setMirrorStartIndex(_n) { /* no-op */ }

    // ─── Shape param inline editing ──────────────────────────────────────────────────────────

    /**
     * Show an inline param input for editing a shape attribute cell (same UX as path param cells).
     * Called from _buildShapeRow attr cell click handlers.
     * @param {object}      elem    - element descriptor from `_elements`
     * @param {string}      attrKey - attribute key (e.g. 'cx', 'r')
     * @param {HTMLElement} cell    - the `.path-cell-param` button
     * @private
     */
    _activateShapeParamEdit(elem, attrKey, cell) {
        if (this.activeEditType === 'shape-param'
                && this.activeEditLineData?.shapeSegId === elem.segId
                && this.activeEditLineData?.attrKey === attrKey) return;
        this._clearActiveEdit();
        this.activeEditLineData = { shapeSegId: elem.segId, attrKey };
        this.activeEditType = 'shape-param';

        const currentVal = this._shapeAttrDisplayValue(elem.type, elem.data, attrKey);
        cell.classList.add('active-edit');
        cell.innerHTML = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'path-cell-inline-input';
        input.value = currentVal;
        input.placeholder = attrKey;
        cell.appendChild(input);

        const resize = () => {
            input.style.width = Math.max(25, Math.ceil(this.measureTextWidth(input.value || input.placeholder)) + 6) + 'px';
        };
        resize();
        input.addEventListener('input', resize);

        requestAnimationFrame(() => { input.focus(); input.select(); });

        const finish = (save = true) => {
            if (save) {
                const val = input.value.trim();
                if (val) {
                    const prevVal = this._shapeAttrDisplayValue(elem.type, elem.data, attrKey);
                    const storageVal = this._shapeInputTokenToStorage(attrKey, val);
                    const changes = this._shapeAttrToChanges(elem.type, elem.data, attrKey, storageVal);
                    if (this.onShapeElementChange) this.onShapeElementChange(elem.segId, changes);
                    Object.assign(elem.data, changes);
                    cell.textContent = val;
                    cell.classList.remove('cell-empty');
                    this._setParamCellTitle(cell, attrKey, val);
                    if (!this.onShapeElementChange && prevVal !== val) this._fireOnChange();
                } else {
                    cell.textContent = attrKey;
                    cell.classList.add('cell-empty');
                    this._setParamCellTitle(cell, attrKey, '');
                }
            } else {
                const prev = this._shapeAttrDisplayValue(elem.type, elem.data, attrKey);
                cell.textContent = prev || attrKey;
                if (!prev) cell.classList.add('cell-empty');
                this._setParamCellTitle(cell, attrKey, prev);
            }
            this._clearActiveEdit();
            this._renderSuggestions();
        };

        input.addEventListener('blur', () => finish(true));
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter')  { e.preventDefault(); finish(true);  }
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        });
        input.addEventListener('input',   e => e.stopPropagation());
        input.addEventListener('dblclick', e => { e.stopPropagation(); input.select(); });

        this.activeEditInput = input;
        this._renderVariableSuggestions(attrKey);
    }

    // ─── Destroy ──────────────────────────────────────────────────────────────

    /** Destroy the editor and remove from DOM. */
    destroy() {
        if (this.element?.parentNode) this.element.remove();
        this._elements = [];
    }
}
