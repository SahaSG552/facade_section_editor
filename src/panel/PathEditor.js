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
    * @param {Function}           [options.onElementOrderChange] — (order) top-level reorder callback
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
        /** @type {((order:Array<object>)=>void)|null} */
        this.onElementOrderChange  = options.onElementOrderChange  || null;
        /** @type {((e:MouseEvent)=>void)|null} Called when user clicks on the empty elements container background */
        this.onDeactivate          = options.onDeactivate          || null;

        /**
         * Coordinate space of shape data currently stored in `_elements`.
         * - 'bit': profile path space (Y-up)
         * - 'canvas': editor canvas space (Y-down)
         * @type {'bit'|'canvas'}
         */
        this._shapeDataSpace = 'bit';

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
        elements = [...elements];

        // Snapshot expanded state and existing line texts (to survive re-render).
        // Also record the positional order of path elements (by index among path/polyline
        // elements) so that when _importPath regenerates fresh contourIds we can still
        // restore expanded state by position — the N-th path stays expanded if the
        // N-th path was expanded before.
        const prevExpanded  = new Set(this._expandedContours);
        const prevExpandedBySig = new Map();
        const prevPathOrder = []; // [{contourId, expanded, lines}] ordered by position
        const prevLineTexts = new Map(); // contourId -> [{text, segId, formulaText}]
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
                }));
                prevPathOrder.push({ contourId: elem.contourId, expanded: prevExpanded.has(elem.contourId), lines: lineSnap });
                prevPathOrder[prevPathOrder.length - 1].transforms = Array.isArray(elem.transforms) ? [...elem.transforms] : [];
                prevLineTexts.set(elem.contourId, lineSnap);
                prevTransformsByPathCid.set(elem.contourId, Array.isArray(elem.transforms) ? [...elem.transforms] : []);
                const sig = this._contourSignatureFromLines(lineSnap);
                if (sig) prevExpandedBySig.set(sig, prevExpanded.has(elem.contourId));
            } else if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                const attrs = PathEditor.SHAPE_DEFS[elem.type]?.attrs ?? [];
                const snap = {
                    type: elem.type,
                    segId: elem.segId,
                    attrs: Object.fromEntries(attrs.map(a => [a, this._shapeAttrValueForSpace(elem.type, elem.data ?? {}, a, prevShapeSpace)])),
                    transforms: Array.isArray(elem.transforms) ? [...elem.transforms] : [],
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
            if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') {
                const nextData = { ...(elem.data ?? {}) };
                const prevShape = prevShapeBySegId.get(elem.segId) ?? prevShapeOrder[shapeElemIndex++] ?? null;
                const incomingTransforms = Array.isArray(elem.transforms) ? [...elem.transforms] : null;
                const prevTransforms = prevTransformsByShapeSid.get(elem.segId) ?? (prevShape?.transforms ?? []);
                const transforms = incomingTransforms
                    ? this._mergeTransformsWithFormulaPriority(prevTransforms, incomingTransforms)
                    : prevTransforms;
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
                return { type: elem.type, segId: elem.segId, data: nextData, transforms, _elem: null };
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
                        const chosenText = this._chooseLineTextWithFormulaPriority(prevText, prevFormula, line.text);
                        if (chosenText !== line.text) {
                            return { ...line, text: chosenText, _formulaText: prevFormula ?? (this._hasFormulaToken(chosenText) ? chosenText : null) };
                        }
                        return { ...line, _formulaText: prevFormula ?? (this._hasFormulaToken(chosenText) ? chosenText : null) };
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
                        _elem: null,
                    }));
                } else if (Array.isArray(elem.lines) && elem.lines.length > 0) {
                    // Direct structure restore (profileElements source-of-truth)
                    // should use incoming line texts as-is.
                    lines = elem.lines.map((l, i) => ({
                        text: String(l?.text ?? '').trim(),
                        segId: l?.segId ?? (elem.lineSegIds?.[i] ?? null),
                        _formulaText: this._hasFormulaToken(String(l?.text ?? '')) ? String(l?.text ?? '').trim() : null,
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
            return { type: elem.type, contourId: cid, segIds: elem.segIds ?? [], expanded, lines, transforms, _elem: null };
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
        return /[*/()]/.test(t)
            || (/[+\-]/.test(t) && !/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t));
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
            const rowRef = this._getTopLevelRef(elem);
            this._applyTopLevelSelection(row, rowRef, e);
            this._setActiveElem(`shape:${elem.segId}`);
            if (this.onShapeElementClick) {
                const selectedSegIds = this._collectSelectedTopLevelSegIds();
                this.onShapeElementClick(elem.segId, e, selectedSegIds);
            }
        });

        // Drag to reorder top-level elements
        this._attachElemDrag(row, elem);

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
     * Build a stable top-level row reference for shape/path element.
     * @param {object} elem
     * @returns {string|null}
     * @private
     */
    _getTopLevelRef(elem) {
        if (!elem) return null;
        if (elem.type === 'path' || elem.type === 'polyline') return `path:${elem.contourId}`;
        if (elem.type === 'circle' || elem.type === 'rect' || elem.type === 'ellipse') return `shape:${elem.segId}`;
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
            const rowEl = (elem.type === 'path' || elem.type === 'polyline')
                ? elem._elem?.querySelector?.('.pe-path-header') ?? null
                : elem._elem ?? null;
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
            }
        }
        return [...new Set(segIds.filter(Boolean))];
    }

    /**
     * Apply click selection semantics for top-level rows.
     * @param {HTMLElement} rowEl
     * @param {string} clickedRef
     * @param {MouseEvent} e
     * @private
     */
    _applyTopLevelSelection(rowEl, clickedRef, e) {
        const isAlreadySelected = rowEl.classList.contains('path-line-selected');
        if (e?.ctrlKey || e?.metaKey) {
            if (isAlreadySelected) rowEl.classList.remove('path-line-selected');
            else                   rowEl.classList.add('path-line-selected');
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
                rowEl.classList.remove('path-line-selected');
            } else {
                this.clearAllSelection();
                rowEl.classList.add('path-line-selected');
            }
        }
        this._lastSelectedElemRef = clickedRef;
    }

    /**
     * Return selected sub-lines as segIds where available, otherwise flat line indexes.
     * @returns {Array<string|number>}
     * @private
     */
    _collectSelectedLineRefs() {
        const refs = [];
        const allLines = this._elements.flatMap(e =>
            (e.type === 'path' || e.type === 'polyline') ? e.lines : []);
        allLines.forEach((line, index) => {
            if (line._elem?.classList.contains('path-line-selected')) {
                refs.push(line?.segId ?? index);
            }
        });
        return refs;
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
     * @param {number} rowNum
     * @returns {HTMLElement}
     * @private
     */
    _buildPathGroup(elem, rowNum) {
        const type  = elem.type;
        const label = this._classifyContourLabel(elem.lines);

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
        // Store label for live updates
        expandBtn.dataset.baseLabel = label;
        header.appendChild(expandBtn);

        this._appendElemModCells(elem, header);

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
            const currentLabel = this._classifyContourLabel(elem.lines);
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
            const order = this._elements.map(elem =>
                (elem.type === 'path' || elem.type === 'polyline')
                    ? { kind: 'contour', contourId: elem.contourId }
                    : { kind: 'shape', segId: elem.segId }
            );
            if (this.onElementOrderChange) {
                this.onElementOrderChange(order);
            } else {
                // Preview mode: persist reordered structure into hidden/raw path.
                this._fireOnChange();
            }
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
                // Prefer segId; fall back to flat numeric index for BitsManager legacy preview.
                const allLines = this._elements.flatMap(el =>
                    (el.type === 'path' || el.type === 'polyline') ? el.lines : []);
                const flatIdx = allLines.indexOf(lineData);
                const selectedRefs = this._collectSelectedLineRefs();
                this.onLineClick(lineData.segId ?? flatIdx, e, selectedRefs);
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

            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'path-cell path-cell-param';
            cell.dataset.argIndex = i;
            cell.dataset.argLabel = argLabel;
            this._setParamCellTitle(cell, argLabel, paramVal);
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
                    const cx = center.x;
                    const cy = center.y;
                    const radNum = Number(radius);
                    const cxRaw = elem.data?._expr?.cx ?? r6(cx);
                    const cyRaw = elem.data?._expr?.cy ?? r6(cy);
                    const radRaw = elem.data?.radiusExpr ?? elem.data?._expr?.r ?? r6(radNum);
                    const radEval = Number(this.evaluateToken(String(radRaw)));
                    const mLeftX = r6(cx - radNum);
                    const mRightX = r6(cx + radNum);
                    const cySvg = r6(-cy);

                    const evaluatedCmd =
                        `M ${mLeftX} ${cySvg}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 1 0 ${mRightX} ${cySvg}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 1 0 ${mLeftX} ${cySvg}` +
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
                const xVal = Number(data.x ?? 0);
                const yVal = Number(data.y ?? 0);
                const wVal = Number(data.w ?? 0);
                const hVal = Number(data.h ?? 0);
                const rxVal = Number(data.rx ?? 0);

                // Hidden path is always stored in bit-space (Y-up).
                const xEval = xVal;
                const yBit = this._shapeDataSpace === 'canvas' ? -yVal : yVal;
                const wEval = Math.abs(wVal);
                const hEval = Math.abs(hVal);
                const rxEval = Number.isFinite(rxVal) ? Math.abs(rxVal) : 0;

                if (![xEval, yBit, wEval, hEval].every(Number.isFinite)) continue;

                const x2Eval = xEval + wEval;
                const y2Eval = yBit - hEval;
                const radEval = Math.max(0, Math.min(Number.isFinite(rxEval) ? rxEval : 0, Math.abs(wEval) / 2, Math.abs(hEval) / 2));

                const rawToken = (key, fallback) => {
                    const expr = elem.data?._expr?.[key];
                    return (expr != null && String(expr).trim() !== '') ? String(expr).trim() : String(fallback);
                };
                const toBitYToken = (token) => this._shapeDataSpace === 'canvas'
                    ? this._negateShapeToken(token)
                    : String(token);
                const xRaw = rawToken('x', r6(xEval));
                const yExpr = elem.data?._expr?.y;
                const yRaw = (yExpr != null && String(yExpr).trim() !== '')
                    ? String(yExpr).trim()
                    : toBitYToken(r6(yVal));
                const wRaw = rawToken('w', r6(wEval));
                const hRaw = rawToken('h', r6(hEval));
                const rxRaw = rawToken('rx', r6(radEval));

                if (radEval > 1e-9) {
                    const evaluatedCmd =
                        `M ${r6(xEval + radEval)} ${r6(yBit)}` +
                        ` L ${r6(x2Eval - radEval)} ${r6(yBit)}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 0 0 ${r6(x2Eval)} ${r6(yBit - radEval)}` +
                        ` L ${r6(x2Eval)} ${r6(y2Eval + radEval)}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 0 0 ${r6(x2Eval - radEval)} ${r6(y2Eval)}` +
                        ` L ${r6(xEval + radEval)} ${r6(y2Eval)}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 0 0 ${r6(xEval)} ${r6(y2Eval + radEval)}` +
                        ` L ${r6(xEval)} ${r6(yBit - radEval)}` +
                        ` A ${r6(radEval)} ${r6(radEval)} 0 0 0 ${r6(xEval + radEval)} ${r6(yBit)}` +
                        ` Z`;
                    const rawCmd =
                        `M (${xRaw})+(${rxRaw}) (${yRaw})` +
                        ` L (${xRaw})+(${wRaw})-(${rxRaw}) (${yRaw})` +
                        ` A ${rxRaw} ${rxRaw} 0 0 0 (${xRaw})+(${wRaw}) (${yRaw})-(${rxRaw})` +
                        ` L (${xRaw})+(${wRaw}) (${yRaw})-(${hRaw})+(${rxRaw})` +
                        ` A ${rxRaw} ${rxRaw} 0 0 0 (${xRaw})+(${wRaw})-(${rxRaw}) (${yRaw})-(${hRaw})` +
                        ` L (${xRaw})+(${rxRaw}) (${yRaw})-(${hRaw})` +
                        ` A ${rxRaw} ${rxRaw} 0 0 0 (${xRaw}) (${yRaw})-(${hRaw})+(${rxRaw})` +
                        ` L (${xRaw}) (${yRaw})-(${rxRaw})` +
                        ` A ${rxRaw} ${rxRaw} 0 0 0 (${xRaw})+(${rxRaw}) (${yRaw})` +
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
                        ` L (${xRaw})+(${wRaw}) ${yRaw}` +
                        ` L (${xRaw})+(${wRaw}) (${yRaw})-(${hRaw})` +
                        ` L ${xRaw} (${yRaw})-(${hRaw})` +
                        ` Z`;
                    parts.push(evaluatedCmd);
                    rawParts.push(rawCmd);
                }
            } else if (elem.type === 'ellipse') {
                const r6 = v => +Number(v).toFixed(6);
                const data = elem.data ?? {};
                const cxEval = Number(data.cx ?? 0);
                const cyEvalCanvas = Number(data.cy ?? 0);
                const rxEval = Math.abs(Number(data.rx ?? 0));
                const ryEval = Math.abs(Number(data.ry ?? 0));
                const cyBit = this._shapeDataSpace === 'canvas' ? -cyEvalCanvas : cyEvalCanvas;

                if (![cxEval, cyEval, rxEval, ryEval].every(Number.isFinite)) continue;

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
            if (elem.type === 'path' || elem.type === 'polyline') {
                return {
                    type: elem.type,
                    contourId: elem.contourId,
                    segIds: Array.isArray(elem.segIds) ? [...elem.segIds] : [],
                    lines: (elem.lines ?? []).map((line) => ({ text: line.text, segId: line.segId ?? null })),
                    transforms,
                };
            }
            return {
                type: elem.type,
                segId: elem.segId ?? null,
                data: { ...(elem.data ?? {}) },
                transforms,
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
            return { kind: 'shape', segId: String(elem.segId ?? ''), transforms };
        });
    }

    /**
     * Apply top-level element transforms snapshot to current rows.
     * Matching is positional within path rows and shape rows.
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
        const pathElems = this._elements.filter(e => e.type === 'path' || e.type === 'polyline');
        const shapeElems = this._elements.filter(e => e.type === 'circle' || e.type === 'rect' || e.type === 'ellipse');

        for (let i = 0; i < pathElems.length; i++) {
            pathElems[i].transforms = this._mergeTransformsWithFormulaPriority(
                pathElems[i].transforms,
                norm(pathSnap[i]?.transforms)
            );
        }
        for (let i = 0; i < shapeElems.length; i++) {
            const byId = shapeSnap.find(s => String(s?.segId ?? '') === String(shapeElems[i].segId ?? ''));
            shapeElems[i].transforms = this._mergeTransformsWithFormulaPriority(
                shapeElems[i].transforms,
                norm(byId?.transforms ?? shapeSnap[i]?.transforms)
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
            const lineData = { text: text.trim(), segId: null, _elem: null };
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
            const lineData = { text: text.trim(), segId: null, _elem: null };
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
        if (!ids || !ids.size) {
            this._renderSuggestions();
            return;
        }
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
        this._renderSuggestions();
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
        return cmd + ' ' + params.map(p => this.evaluateToken(p)).join(' ');
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
        const ySign = shapeSpace === 'canvas' ? -1 : 1;
        if (type === 'circle') {
            if (attrKey === 'cx') return String(parseFloat((data.center?.x ?? 0).toFixed(4)));
            if (attrKey === 'cy') return String(parseFloat(((data.center?.y ?? 0) * ySign).toFixed(4)));
            if (attrKey === 'r')  return data.radiusExpr ?? String(parseFloat((data.radius ?? 0).toFixed(4)));
        }
        if (type === 'rect') {
            // data uses w/h directly (not width/height)
            const key = attrKey === 'w' ? 'w' : attrKey === 'h' ? 'h' : attrKey;
            const raw = data[key];
            const v = (attrKey === 'y') ? Number(raw ?? 0) * ySign : raw;
            return v !== undefined ? String(parseFloat(Number(v).toFixed(4))) : '';
        }
        if (type === 'ellipse') {
            const map = { cx: 'cx', cy: 'cy', rx: 'rx', ry: 'ry' };
            const raw = data[map[attrKey]];
            const v = (attrKey === 'cy') ? Number(raw ?? 0) * ySign : raw;
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
        const ySign = shapeSpace === 'canvas' ? -1 : 1;
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
                center: { ...data.center, y: toNum(val) * ySign },
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
            const nextVal = attrKey === 'y' ? toNum(val) * ySign : toNum(val);
            return { [attrKey]: nextVal, _expr: withExprMap(attrKey, val) };
        }
        if (type === 'ellipse') {
            const nextVal = attrKey === 'cy' ? toNum(val) * ySign : toNum(val);
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
        return attrKey === 'cy' || attrKey === 'y';
    }

    /**
     * Negate a numeric/formula token for UI display/edit round-trip.
     * Applying twice returns the original token (for common token forms).
     * @param {string} token
     * @returns {string}
     * @private
     */
    _negateShapeToken(token) {
        const t = String(token ?? '').trim();
        if (!t) return '';
        const numeric = Number(t);
        if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
            return String(parseFloat(String(-numeric)));
        }
        const wrappedNeg = t.match(/^-\((.*)\)$/);
        if (wrappedNeg) return wrappedNeg[1].trim();
        if (t.startsWith('-')) return t.slice(1).trim();
        return `-(${t})`;
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
            if (incoming.type !== current.type) return true;

            if (incoming.type === 'path' || incoming.type === 'polyline') {
                if (incoming.contourId !== current.contourId) return true;
                const incomingLineCount = incoming.path != null
                    ? this._splitPathIntoCommands(incoming.path).length
                    : (Array.isArray(incoming.lines) ? incoming.lines.length : current.lines.length);
                if ((current.lines?.length ?? 0) !== incomingLineCount) return true;
                continue;
            }

            if (incoming.type === 'circle' || incoming.type === 'rect' || incoming.type === 'ellipse') {
                if (incoming.segId !== current.segId) return true;
                const attrs = PathEditor.SHAPE_DEFS[incoming.type]?.attrs ?? [];
                for (const attr of attrs) {
                    const a = this._shapeAttrValue(incoming.type, current.data ?? {}, attr);
                    const b = this._shapeAttrValue(incoming.type, incoming.data ?? {}, attr);
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
                const line = allLines.find(l => l.segId === idx);
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
