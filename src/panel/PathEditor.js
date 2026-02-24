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
 *
 * Backward-compat stubs (no-op): setPath, setShapeElements,
 *   setSelectedLines, clearLineSelection, clearShapeSelection, setMirrorStartIndex
 */
export default class PathEditor {
    /**
     * Icons and attribute definitions for each shape type.
     * @type {Object.<string, {icon:string, label:string, attrs:string[]}>}
     */
    static SHAPE_DEFS = {
        circle:  { icon: '○', label: 'Circle',  attrs: ['cx', 'cy', 'r']           },
        rect:    { icon: '□', label: 'Rect',    attrs: ['x', 'y', 'w', 'h', 'rx'] },
        ellipse: { icon: '⬬', label: 'Ellipse', attrs: ['cx', 'cy', 'rx', 'ry']    },
    };

    /**
     * @param {Object}  options
     * @param {HTMLElement}         options.container
     * @param {HTMLInputElement}   [options.hiddenInput]
     * @param {HTMLInputElement}   [options.rawHiddenInput]
     * @param {Function}           [options.onChange]            — receives evaluated path string
     * @param {Object}             [options.variableValues]
     * @param {Function}           [options.getVariableList]
     * @param {Function}           [options.onLineClick]         — (segId, MouseEvent)
     * @param {Function}           [options.onShapeElementChange]— (segId, changes|null)
     * @param {Function}           [options.onShapeElementClick] — (segId, MouseEvent)
     */
    constructor(options = {}) {
        this.container             = options.container;
        this.hiddenInput           = options.hiddenInput    ?? null;
        this.rawHiddenInput        = options.rawHiddenInput ?? null;
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
        /** @type {((e:MouseEvent)=>void)|null} Called when user clicks on the empty elements container background */
        this.onDeactivate          = options.onDeactivate          || null;

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
        /** @type {{parentElem:object, fromIndex:number}|null} active drag-sort state */
        this._dragState = null;

        // ── Inline edit state ─────────────────────────────────────────────
        this.activeEditLineData  = null;
        this.activeEditType      = null;
        this.activeEditArgIndex  = null;
        /** @type {HTMLInputElement|null} */
        this.activeEditInput     = null;

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
        // Preserve user-defined display order: sort incoming elements by current order.
        // New elements (not in current list) fall to the end.
        if (this._elements.length > 0) {
            const orderMap = new Map();
            this._elements.forEach((e, i) => {
                const id = (e.type === 'path' || e.type === 'polyline')
                    ? `cid:${e.contourId}` : `sid:${e.segId}`;
                orderMap.set(id, i);
            });
            elements = [...elements].sort((a, b) => {
                const aId = (a.type === 'path' || a.type === 'polyline') ? `cid:${a.contourId}` : `sid:${a.segId}`;
                const bId = (b.type === 'path' || b.type === 'polyline') ? `cid:${b.contourId}` : `sid:${b.segId}`;
                const aPos = orderMap.has(aId) ? orderMap.get(aId) : Infinity;
                const bPos = orderMap.has(bId) ? orderMap.get(bId) : Infinity;
                return aPos - bPos;
            });
        }

        // Snapshot expanded state and existing line texts (to survive re-render).
        // Also record the positional order of path elements (by index among path/polyline
        // elements) so that when _importPath regenerates fresh contourIds we can still
        // restore expanded state by position — the N-th path stays expanded if the
        // N-th path was expanded before.
        const prevExpanded  = new Set(this._expandedContours);
        const prevPathOrder = []; // [{contourId, expanded, lines}] ordered by position
        const prevLineTexts = new Map(); // contourId -> [{text, segId}]
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                const lineSnap = elem.lines.map(l => ({ text: l.text, segId: l.segId }));
                prevPathOrder.push({ contourId: elem.contourId, expanded: prevExpanded.has(elem.contourId), lines: lineSnap });
                prevLineTexts.set(elem.contourId, lineSnap);
            }
        }
        let pathElemIndex = 0; // incremented for each path/polyline in the incoming list

        // Reset active sub-line ref (stale after rebuild)
        this._activeSubLine = null;
        this._elements = elements.map(elem => {
            if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                return { type: elem.type, segId: elem.segId, data: { ...elem.data }, _elem: null };
            }
            // path / polyline
            const cid = elem.contourId;
            // Positional slot — used when contourId changed (e.g. after _importPath).
            const slot = prevPathOrder[pathElemIndex];
            pathElemIndex++;
            // Expanded state: exact match by contourId first; if the cid is new fall
            // back to the positional slot so the N-th path keeps its expanded state.
            const expanded = prevExpanded.has(cid) || (!prevExpanded.has(cid) && (slot?.expanded ?? false));
            let lines;
            if (elem.path != null) {
                // Canvas-originated: rebuild from numeric path string
                lines = this._buildLinesFromPath(elem.path, elem.lineSegIds ?? [], elem.segIds ?? []);
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
                        _elem: null,
                    }));
                } else {
                    lines = [];
                }
            }
            return { type: elem.type, contourId: cid, segIds: elem.segIds ?? [], expanded, lines, _elem: null };
        });

        // Rebuild _expandedContours from the resolved expanded flags.
        // This is critical when _importPath regenerated contourIds — without this,
        // the new cids would never appear in _expandedContours so the body stays hidden.
        this._expandedContours = new Set(
            this._elements
                .filter(e => (e.type === 'path' || e.type === 'polyline') && e.expanded)
                .map(e => e.contourId)
        );

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
            _elem: null,
        }));
    }

    /**
     * Update variable values; re-renders all sub-line cells.
     * @param {Object} values
     */
    setVariableValues(values) {
        this.variableValues = values || {};
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
        this._elements.forEach((elem, idx) => {
            if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                elem._elem = this._buildShapeRow(elem, idx + 1);
            } else {
                elem._elem = this._buildPathGroup(elem, idx + 1);
            }
            this.elementsContainer.appendChild(elem._elem);
        });
    }

    /**
     * Build a shape element row (circle / rect / ellipse).
     * @param {{type:string, segId:string, data:object, _elem:null}} elem
     * @param {number} rowNum
     * @returns {HTMLElement}
     * @private
     */
    _buildShapeRow(elem, rowNum) {
        const def = PathEditor.SHAPE_DEFS[elem.type];
        if (!def) return document.createElement('div');

        const row = document.createElement('div');
        row.className = `path-line pe-elem pe-elem-${elem.type}`;
        row.draggable = true;
        row.dataset.segId = elem.segId;

        // Line number
        const numEl = document.createElement('span');
        numEl.className = 'path-line-number';
        numEl.textContent = rowNum;
        row.appendChild(numEl);

        // Type command button
        const typeBtn = document.createElement('button');
        typeBtn.type = 'button';
        typeBtn.className = `path-cell path-cell-cmd pe-type-${elem.type}`;
        typeBtn.textContent = def.label;
        typeBtn.title = def.label;
        row.appendChild(typeBtn);

        // Attribute param cells
        for (const attrKey of def.attrs) {
            const val = this._shapeAttrValue(elem.type, elem.data, attrKey);
            if (val === '' && (attrKey === 'rx' || attrKey === 'ry')) continue;

            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'path-cell path-cell-param' + (val ? '' : ' cell-empty');
            cell.dataset.attr = attrKey;
            cell.title = attrKey;
            cell.textContent = val || attrKey;
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this._activateShapeParamEdit(elem, attrKey, cell);
            });
            row.appendChild(cell);
        }

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'path-line-delete';
        delBtn.title = 'Delete';
        delBtn.textContent = '×';
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
        row.appendChild(delBtn);

        // Row click → select + activate
        row.addEventListener('click', (e) => {
            if (e.target.closest('.path-cell') || e.target.closest('.path-line-delete')) return;
            this.clearAllSelection();
            row.classList.add('path-line-selected');
            this._setActiveElem(`shape:${elem.segId}`);
            if (this.onShapeElementClick) this.onShapeElementClick(elem.segId, e);
        });

        // Drag to reorder top-level elements
        this._attachElemDrag(row, elem);

        return row;
    }

    /**
     * Build a path / polyline group row (collapsible header + sub-lines).
     * @param {{type:string, contourId:number, segIds:string[], expanded:boolean, lines:Array, _elem:null}} elem
     * @param {number} rowNum
     * @returns {HTMLElement}
     * @private
     */
    _buildPathGroup(elem, rowNum) {
        const type  = elem.type;
        const label = type === 'path' ? 'Path' : 'Polyline';

        // Outer container (grouping wrapper, not pe-elem itself)
        const wrap = document.createElement('div');
        wrap.className = 'pe-path-wrap';

        // ── Collapsible header row (looks like a command row) ────────────────────────────────
        const header = document.createElement('div');
        header.className = `path-line pe-elem pe-elem-${type} pe-path-header`;
        header.draggable = true;
        header.dataset.contourId = String(elem.contourId);

        const numEl = document.createElement('span');
        numEl.className = 'path-line-number';
        numEl.textContent = rowNum;
        header.appendChild(numEl);

        const expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.className = `path-cell path-cell-cmd pe-type-${type}`;
        expandBtn.textContent = label + (elem.expanded ? ' ▼' : ' ►');
        header.appendChild(expandBtn);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'path-line-delete';
        delBtn.title = 'Delete path';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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

        // Expand button click → toggle collapsed/expanded ONLY.
        // Must happen BEFORE any callback that may trigger setElements() → DOM rebuild,
        // because after a rebuild the local expandBtn/body vars point to detached nodes.
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // don't bubble to header click handler
            elem.expanded = !elem.expanded;
            expandBtn.textContent = label + (elem.expanded ? ' ▼' : ' ►');
            body.style.display = elem.expanded ? '' : 'none';
            if (elem.expanded) this._expandedContours.add(elem.contourId);
            else               this._expandedContours.delete(elem.contourId);
        });

        // Header click (anywhere except delete / expand button) → select row.
        header.addEventListener('click', (e) => {
            if (e.target.closest('.path-line-delete')) return;
            if (e.target === expandBtn || e.target.closest('button') === expandBtn) return;

            // ── Clear old selection + activate path elem ─────────────────────
            this.clearAllSelection();
            this._activeSubLine = null;
            this._setActiveElem(`path:${elem.contourId}`);

            // ── Canvas callback (may trigger DOM rebuild) ─────────────────────
            // If it triggers syncToPathEditor → setElements → setSelectedElements,
            // the header row will get path-line-selected from setSelectedElements.
            if (this.onPathElemClick && elem.segIds?.length) {
                this.onPathElemClick(elem.segIds, e);
            } else {
                // No canvas callback — manually highlight the live header node.
                const liveHeader = this.elementsContainer
                    ?.querySelector(`.pe-path-header[data-contour-id="${elem.contourId}"]`);
                (liveHeader ?? header).classList.add('path-line-selected');
            }
        });

        // Drag to reorder top-level elements (by header)
        this._attachElemDrag(header, elem);

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
            const fromIndex = this._elements.indexOf(elemDesc);
            this._dragState = { isElem: true, fromIndex };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', '');
            requestAnimationFrame(() => handle.classList.add('pe-elem-dragging'));
        });
        handle.addEventListener('dragend', () => {
            this._dragState = null;
            handle.classList.remove('pe-elem-dragging');
            this.elementsContainer?.querySelectorAll('.pe-elem-drag-over')
                .forEach(el => el.classList.remove('pe-elem-drag-over'));
        });
        handle.addEventListener('dragover', (e) => {
            if (!this._dragState?.isElem) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            handle.classList.add('pe-elem-drag-over');
        });
        handle.addEventListener('dragleave', () => {
            handle.classList.remove('pe-elem-drag-over');
        });
        handle.addEventListener('drop', (e) => {
            e.preventDefault();
            handle.classList.remove('pe-elem-drag-over');
            if (!this._dragState?.isElem) return;
            const fromIndex = this._dragState.fromIndex;
            const toIndex   = this._elements.indexOf(elemDesc);
            if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return;
            const [moved] = this._elements.splice(fromIndex, 1);
            this._elements.splice(toIndex, 0, moved);
            this._renderElements();
            // NOTE: do NOT call _fireOnChange() here — element order is display-only;
            // calling onChange would trigger _importPath() in ProfileEditor which
            // drops all shape segments (circles, rects, etc.) from the canvas state.
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
        const lineEl = document.createElement('div');
        lineEl.className = 'path-line pe-sub-line';
        lineEl.draggable = true;
        if (lineData.segId) lineEl.dataset.segId = lineData.segId;
        this._buildLineCellsInElem(lineEl, lineData, parentElem);

        // ── Drag-to-reorder ──────────────────────────────────────────────
        lineEl.addEventListener('dragstart', (e) => {
            this._dragState = { parentElem, fromIndex: parentElem.lines.indexOf(lineData) };
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
            // Reject top-level element drags; only accept same-parent sub-line reorders
            if (this._dragState?.isElem) return;
            if (this._dragState?.parentElem !== parentElem) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            lineEl.classList.add('pe-sub-line-drag-over');
        });
        lineEl.addEventListener('dragleave', () => lineEl.classList.remove('pe-sub-line-drag-over'));
        lineEl.addEventListener('drop', (e) => {
            e.preventDefault();
            lineEl.classList.remove('pe-sub-line-drag-over');
            if (!this._dragState || this._dragState.isElem || this._dragState.parentElem !== parentElem) return;
            const fromIndex = this._dragState.fromIndex;
            const toIndex   = parentElem.lines.indexOf(lineData);
            if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return;
            const [moved] = parentElem.lines.splice(fromIndex, 1);
            parentElem.lines.splice(toIndex, 0, moved);
            this._rebuildPathBody(parentElem);
            this._fireOnChange();
        });

        // ── Click → visual select + canvas callback + track active sub-line ──
        lineEl.addEventListener('click', (e) => {
            if (e.target.closest('.path-cell') || e.target.closest('.path-line-delete')) return;
            if (!e.shiftKey) {
                this.elementsContainer?.querySelectorAll('.path-line-selected')
                    .forEach(el => el.classList.remove('path-line-selected'));
            }
            lineEl.classList.add('path-line-selected');
            // Track active sub-line so new commands insert after it
            this._activeSubLine = lineData;
            // Set parent path as active element (shows command suggestions)
            this._setActiveElem(`path:${parentElem.contourId}`);
            if (this.onLineClick) {
                // Prefer segId; fall back to flat numeric index for BitsManager legacy preview.
                const allLines = this._elements.flatMap(el =>
                    (el.type === 'path' || el.type === 'polyline') ? el.lines : []);
                const flatIdx = allLines.indexOf(lineData);
                this.onLineClick(lineData.segId ?? flatIdx, e);
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
    _buildLineCellsInElem(lineEl, lineData, parentElem) {
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
        cmdCell.addEventListener('click', () => this._activateCmdEdit(lineData, lineEl, parentElem));
        lineEl.appendChild(cmdCell);

        // Param cells
        const expectedArgs = def.args;
        const maxCells = Math.max(params.length, expectedArgs.length);
        for (let i = 0; i < maxCells; i++) {
            const paramVal  = params[i] || '';
            const argLabel  = expectedArgs[i] || `arg${i + 1}`;
            const evaluated = paramVal ? this.evaluateToken(paramVal) : '';
            const hasFormula = paramVal && paramVal !== evaluated;

            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'path-cell path-cell-param';
            cell.dataset.argIndex = i;
            cell.dataset.argLabel = argLabel;
            cell.title = hasFormula ? `${argLabel}=${evaluated}` : argLabel;
            if (paramVal) { cell.textContent = paramVal; }
            else          { cell.textContent = argLabel; cell.classList.add('cell-empty'); }
            cell.addEventListener('click', (e) =>
                this._activateParamEditInElem(lineData, lineEl, parentElem, i, argLabel, e));
            lineEl.appendChild(cell);
        }

        // Delete button
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
        this._rebuildPathBody(parentElem);
        this._fireOnChange();
    }

    /**
     * Rebuild all sub-line DOM inside a path/polyline group.
     * Called after drag-sort or delete so line numbers stay correct.
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
                    const cx = center.x, cy = center.y, rad = radius;
                    const circleCmd =
                        `M ${r6(cx - rad)} ${r6(-cy)}` +
                        ` A ${r6(rad)} ${r6(rad)} 0 1 0 ${r6(cx + rad)} ${r6(-cy)}` +
                        ` A ${r6(rad)} ${r6(rad)} 0 1 0 ${r6(cx - rad)} ${r6(-cy)}` +
                        ` Z`;
                    parts.push(circleCmd);
                    rawParts.push(circleCmd);
                }
            }
        }
        const fullPath = parts.join(' ');
        if (this.hiddenInput)    this.hiddenInput.value = fullPath;
        if (this.rawHiddenInput) this.rawHiddenInput.value = rawParts.join(' ');
        this.onChange(fullPath);
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
        const activeElem = this._getActivePathElem();
        if (activeElem) {
            const parsed = this.parseLine(text);
            if (!parsed) {
                this.input.style.borderColor = 'red';
                setTimeout(() => { this.input.style.borderColor = ''; }, 1000);
                return false;
            }
            const lineData = { text: text.trim(), segId: null, _elem: null };
            // Insert after the currently selected sub-line, or append at end
            const activeIdx = this._activeSubLine
                ? activeElem.lines.indexOf(this._activeSubLine)
                : -1;
            if (activeIdx !== -1) {
                activeElem.lines.splice(activeIdx + 1, 0, lineData);
                this._activeSubLine = lineData; // advance selection to new line
            } else {
                activeElem.lines.push(lineData);
            }
            // Rebuild body so new sub-line gets correct line number
            this._rebuildPathBody(activeElem);
            // Auto-select the newly added sub-line
            if (lineData._elem) {
                this.clearAllSelection();
                lineData._elem.classList.add('path-line-selected');
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
            const lineData = { text: text.trim(), segId: null, _elem: null };
            const newElem  = { type: 'polyline', contourId: cid, segIds: [], expanded: true, lines: [lineData], _elem: null };
            this._elements.push(newElem);
            this._expandedContours.add(cid);
            newElem._elem = this._buildPathGroup(newElem, this._elements.length);
            this.elementsContainer.appendChild(newElem._elem);
            this._setActiveElem(`path:${cid}`);
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

    // ─── Suggestions ──────────────────────────────────────────────────────────

    /** @private */
    _renderSuggestions() {
        if (this.activeEditType === 'param' || this.activeEditType === 'shape-param') return;

        const inputVal       = this.input?.value?.trim() ?? '';
        const parts          = this.splitBySpaces(inputVal);
        const hasCmd         = parts.length > 0 && parts[0].length === 1 && SVG_COMMANDS.has(parts[0]);
        const activePathElem = this._getActivePathElem();

        let html = '';

        if (activePathElem) {
            // ── Path is active: show command palette + variable hints ─────
            html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Path cmds:</span>';
            Object.entries(SVG_COMMAND_DEFS).forEach(([cmd, def]) => {
                html += `<button type="button" class="path-suggestion-btn cmd-btn" data-cmd="${cmd}" title="${def.label}">${cmd}</button>`;
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
        } else {
            // ── Nothing active: show element creation chips ───────────────
            html += '<div class="path-suggestions-group"><span class="path-suggestions-label">Add:</span>';
            html += `<button type="button" class="path-suggestion-btn elem-btn" data-elem="circle"  title="Add circle">○ Circle</button>`;
            html += `<button type="button" class="path-suggestion-btn elem-btn" data-elem="rect"    title="Add rect">□ Rect</button>`;
            html += `<button type="button" class="path-suggestion-btn elem-btn" data-elem="ellipse" title="Add ellipse">⬬ Ellipse</button>`;
            html += `<button type="button" class="path-suggestion-btn elem-btn" data-elem="path"    title="Add path">╲ Path</button>`;
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
                    this._setActiveElem(`path:${cid}`);
                } else {
                    // Delegate shape creation to the caller via a special change event
                    if (this.onShapeElementChange) this.onShapeElementChange(null, { _create: type });
                }
            });
        });
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
        } else {
            // Clearing active state
            this._activeSubLine = null;
        }
        this._renderSuggestions();
    }

    // ─── Selection API ────────────────────────────────────────────────────────

    /**
     * Highlight rows whose segId is in the provided set.
     * @param {Set<string>} ids
     */
    setSelectedElements(ids) {
        this.clearAllSelection();
        if (!ids || !ids.size) return;
        for (const elem of this._elements) {
            if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                if (ids.has(elem.segId)) elem._elem?.classList.add('path-line-selected');
            } else {
                // Highlight the path group header if any of its segments are selected,
                // or if the M-row synthetic segId "m:<contourId>" is selected.
                const headerEl = elem._elem?.querySelector?.('.pe-path-header');
                const anySelected = elem.segIds?.some(sid => ids.has(sid))
                    || ids.has(`m:${elem.contourId}`);
                if (anySelected && headerEl) headerEl.classList.add('path-line-selected');
                // Highlight individual sub-lines
                for (const lineData of elem.lines) {
                    if (lineData.segId && ids.has(lineData.segId))
                        lineData._elem?.classList.add('path-line-selected');
                }
            }
        }
    }

    /** Remove all selection highlights. */
    clearAllSelection() {
        this._activeSubLine = null;
        this.elementsContainer?.querySelectorAll('.path-line-selected')
            .forEach(el => el.classList.remove('path-line-selected'));
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
        expr = expr.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, varName) => {
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
        return cmd + ' ' + params.map(p => this.evaluateToken(p)).join(' ');
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
        if (type === 'circle') {
            if (attrKey === 'cx') return String(parseFloat((data.center?.x ?? 0).toFixed(4)));
            if (attrKey === 'cy') return String(parseFloat((data.center?.y ?? 0).toFixed(4)));
            if (attrKey === 'r')  return data.radiusExpr ?? String(parseFloat((data.radius ?? 0).toFixed(4)));
        }
        if (type === 'rect') {
            // data uses w/h directly (not width/height)
            const key = attrKey === 'w' ? 'w' : attrKey === 'h' ? 'h' : attrKey;
            const v = data[key];
            return v !== undefined ? String(parseFloat(Number(v).toFixed(4))) : '';
        }
        if (type === 'ellipse') {
            const map = { cx: 'cx', cy: 'cy', rx: 'rx', ry: 'ry' };
            const v = data[map[attrKey]];
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
        const VAR_RE = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;
        const toNum  = s => parseFloat(this.evaluateToken(s));

        if (type === 'circle') {
            if (attrKey === 'cx') return { center: { ...data.center, x: toNum(val) } };
            if (attrKey === 'cy') return { center: { ...data.center, y: toNum(val) } };
            if (attrKey === 'r') {
                if (VAR_RE.test(val.trim())) return { radiusExpr: val.trim(), radius: toNum(val) };
                return { radius: toNum(val), radiusExpr: undefined };
            }
        }
        if (type === 'rect') {
            // data uses w/h directly
            return { [attrKey]: toNum(val) };
        }
        if (type === 'ellipse') {
            return { [attrKey]: toNum(val) };
        }
        return {};
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
            // Detect M-A-A-Z circle pattern:
            //   M cx-r -cy  A r r 0 1 0 cx+r -cy  A r r 0 1 0 cx-r -cy  Z
            const isCircle = cmds.length === 4
                && /^[Mm]/.test(cmds[0])
                && /^[Zz]$/.test(cmds[3])
                && /^A\s+[\d.eE+-]+\s+[\d.eE+-]+\s+0\s+1\s+0/i.test(cmds[1])
                && /^A\s+[\d.eE+-]+\s+[\d.eE+-]+\s+0\s+1\s+0/i.test(cmds[2]);

            if (isCircle) {
                // Parse: M (cx-r) (-cy)  →  cx = mX + r,  cy = -mY
                const mNums  = cmds[0].replace(/^[Mm]\s*/, '').trim().split(/[\s,]+/).map(Number);
                const aTokens = cmds[1].replace(/^[Aa]\s*/, '').trim().split(/[\s,]+/).map(Number);
                // A rx ry x-rotation large-arc-flag sweep-flag x y
                const radius = aTokens[0];
                const cx     = mNums[0] + radius;
                const cy     = -mNums[1];
                this._elements.push({
                    type: 'circle', segId: `preview-circle-${cid}`,
                    data: { center: { x: cx, y: cy }, radius }, _elem: null,
                });
            } else {
                const pathElem = {
                    type: 'path', contourId: cid, segIds: [], expanded: true,
                    lines: cmds.map(text => ({ text: text.trim(), segId: null, _elem: null })),
                    _elem: null,
                };
                this._elements.push(pathElem);
                this._expandedContours.add(cid);
            }
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
        const parts = [];
        for (const elem of this._elements) {
            if (elem.type === 'path' || elem.type === 'polyline') {
                const text = elem.lines.map(l => l.text).filter(Boolean).join(' ');
                if (text) parts.push(text);
            }
        }
        return parts.join(' ');
    }

    /** @deprecated Use setElements() instead */
    setShapeElements(_arr) { /* no-op */ }

    /**
     * Highlight sub-lines by flat index (legacy BitsManager preview) or by segId.
     * @param {Array<number|string>} indices
     */
    setSelectedLines(indices) {
        this.clearAllSelection();
        if (!indices?.length) return;
        const allLines = this._elements.flatMap(e =>
            (e.type === 'path' || e.type === 'polyline') ? e.lines : []);
        for (const idx of indices) {
            if (typeof idx === 'number') {
                allLines[idx]?._elem?.classList.add('path-line-selected');
            } else if (idx != null) {
                allLines.find(l => l.segId === idx)?._elem?.classList.add('path-line-selected');
            }
        }
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

        const currentVal = this._shapeAttrValue(elem.type, elem.data, attrKey);
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
                    const changes = this._shapeAttrToChanges(elem.type, elem.data, attrKey, val);
                    if (this.onShapeElementChange) this.onShapeElementChange(elem.segId, changes);
                    Object.assign(elem.data, changes);
                    cell.textContent = val;
                    cell.classList.remove('cell-empty');
                } else {
                    cell.textContent = attrKey;
                    cell.classList.add('cell-empty');
                }
            } else {
                const prev = this._shapeAttrValue(elem.type, elem.data, attrKey);
                cell.textContent = prev || attrKey;
                if (!prev) cell.classList.add('cell-empty');
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
