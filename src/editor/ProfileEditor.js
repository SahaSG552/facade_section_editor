import LoggerFactory from "../core/LoggerFactory.js";
import EditorStateManager from "./EditorStateManager.js";
import EditorCanvas from "./EditorCanvas.js";
import EditorToolbar from "./EditorToolbar.js";
import CursorTool from "./tools/CursorTool.js";
import MoveTool from "./tools/MoveTool.js";
import LineTool from "./tools/LineTool.js";
import MirrorTool from "./tools/MirrorTool.js";
import ArcTool from "./tools/ArcTool.js";
import CircleTool from "./tools/CircleTool.js";
import RectTool from "./tools/RectTool.js";
import EllipseTool from "./tools/EllipseTool.js";
import { evaluateMathExpression } from "../utils/utils.js";

const log = LoggerFactory.createLogger("ProfileEditor");

/**
 * Merge formula tokens from a formula-containing path into a freshly exported
 * numeric path.  At each token position: if the formula path has a `{varname}`
 * token AND the variable's resolved value equals the numeric token (within 1e-4),
 * the formula token is kept; otherwise the numeric token is used.
 *
 * If segment structure changed, merge is done best-effort: matching command/parameter
 * regions keep formula tokens when numerically equivalent, while new/mismatched regions
 * stay numeric.
 *
 * @param {string} numericPath        - Path with all numeric values
 * @param {string} formulaPath        - Original path that may contain {varname} tokens
 * @param {Record<string,number>} vars - Variable name → resolved value map
 * @returns {string}
 */
function _mergeFormulaPath(numericPath, formulaPath, vars) {
    if (!formulaPath) return numericPath;
    const tokenize = (str) => {
        const tokens = [];
        let i = 0;
        while (i < str.length) {
            while (i < str.length && /[\s,]/.test(str[i])) i++;
            if (i >= str.length) break;
            if (/[MmLlHhVvZzCcSsQqTtAa]/.test(str[i])) {
                tokens.push({ type: 'cmd', value: str[i++] });
                continue;
            }
            if ((str[i] === '-' || str[i] === '+') && str[i + 1] === '{') {
                const end = str.indexOf('}', i + 1);
                const k = end >= 0 ? end + 1 : str.length;
                tokens.push({ type: 'param', value: str.slice(i, k) });
                i = k;
                continue;
            }
            if (str[i] === '{') {
                const end = str.indexOf('}', i);
                const k = end >= 0 ? end + 1 : str.length;
                tokens.push({ type: 'param', value: str.slice(i, k) });
                i = k;
                continue;
            }
            let j = i;
            if (str[j] === '-' || str[j] === '+') j++;
            while (j < str.length && /[\d.eE]/.test(str[j])) {
                if ((str[j] === 'e' || str[j] === 'E') && j + 1 < str.length &&
                    (str[j + 1] === '-' || str[j + 1] === '+')) j++;
                j++;
            }
            const numStr = str.slice(i, j);
            if (numStr) tokens.push({ type: 'param', value: numStr });
            i = j > i ? j : j + 1;
        }
        return tokens;
    };

    const resolveParam = (token) => {
        const t = String(token ?? '').trim();
        if (!t) return NaN;
        if (/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t)) return Number(t);
        const m = t.match(/^([+-]?)\{([\s\S]+)\}$/);
        if (m) {
            const sign = m[1] === '-' ? -1 : 1;
            const expr = m[2];
            try {
                return sign * Number(evaluateMathExpression(expr, vars));
            } catch (_) {
                return NaN;
            }
        }
        return NaN;
    };

    const numTok = tokenize(numericPath);
    const fmtTok = tokenize(formulaPath);

    const merged = [];
    let fi = 0;
    const sameCmd = (a, b) => String(a || '').toUpperCase() === String(b || '').toUpperCase();

    for (let i = 0; i < numTok.length; i++) {
        const n = numTok[i];
        if (n.type === 'cmd') {
            merged.push(n.value);
            if (fmtTok[fi]?.type === 'cmd') {
                if (sameCmd(fmtTok[fi].value, n.value)) {
                    fi++;
                } else {
                    let k = fi + 1;
                    while (k < fmtTok.length && !(fmtTok[k].type === 'cmd' && sameCmd(fmtTok[k].value, n.value))) k++;
                    if (k < fmtTok.length) fi = k + 1;
                }
            }
            continue;
        }

        const f = fmtTok[fi];
        if (f?.type === 'param') {
            const nVal = Number(n.value);
            const fVal = resolveParam(f.value);
            if (!isNaN(nVal) && !isNaN(fVal) && Math.abs(nVal - fVal) < 1e-4) merged.push(f.value);
            else merged.push(n.value);
            fi++;
        } else {
            merged.push(n.value);
        }
    }
    return merged.join(' ');
}

// ─── Module-level pure helpers ────────────────────────────────────────────────

/**
 * Split a merged SVG path string into individual SVG command strings.
 * Each element starts with a command letter (M/L/A/Z/…) followed by its parameters.
 *
 * @param {string} str - Full concatenated SVG path string
 * @returns {string[]}
 */
function _splitCmds(str) {
    const result = [];
    let cur = '';
    for (const c of str) {
        if (/[A-Za-z]/.test(c) && cur.trim()) { result.push(cur.trim()); cur = c; }
        else cur += c;
    }
    if (cur.trim()) result.push(cur.trim());
    return result;
}

/**
 * Attach per-contour path strings and lineSegIds to path/polyline elements so
 * PathEditor can display each contour's commands independently.
 * Shape elements (circle/rect/ellipse) are passed through unchanged.
 *
 * The extracted slice includes:
 * - The preceding M command when its lineSegId is `"m:<cid>"` (synthetic M-row segId).
 * - The trailing Z command when present (Z rows have `null` segId).
 *
 * @param {Array}              elements   - from state.getElements()
 * @param {string}             mergedPath - Full SVG path (all contours concatenated)
 * @param {Array<string|null>} lineSegIds - segId per command: `"m:<cid>"` for M rows,
 *                                          `null` for Z rows, real segId for L/A rows
 * @returns {Array}
 */
function _buildElemsWithPaths(elements, mergedPath, lineSegIds) {
    const cmds = _splitCmds(mergedPath);
    return elements.map(elem => {
        if (elem.type !== 'path' && elem.type !== 'polyline') return elem;
        const segSet = new Set(elem.segIds);
        const positions = [];
        lineSegIds.forEach((sid, i) => { if (sid !== null && segSet.has(sid)) positions.push(i); });
        if (!positions.length) return { ...elem, path: null, lineSegIds: [] };
        let lo = positions[0];
        let hi = positions[positions.length - 1];
        // Include the preceding M command.  M rows carry a "m:<cid>" synthetic segId;
        // shape-element placeholder M rows carry null (but never appear in L/A positions).
        const prevSid = lineSegIds[lo - 1];
        const isMRow  = prevSid === null || (typeof prevSid === 'string' && prevSid.startsWith('m:'));
        if (lo > 0 && isMRow && /^[Mm]/.test(cmds[lo - 1] ?? '')) lo--;
        // Include the trailing Z command (null segId).
        if (hi + 1 < cmds.length && /^[Zz]/.test(cmds[hi + 1] ?? '')) hi++;
        return {
            ...elem,
            path:       cmds.slice(lo, hi + 1).join(' '),
            lineSegIds: lineSegIds.slice(lo, hi + 1),
        };
    });
}

/**
 * Resolve a token/expression to numeric value using current variables.
 * @param {string|number} token
 * @param {Record<string,number>} vars
 * @returns {number}
 */
function _resolveTokenNumber(token, vars) {
    const t = String(token ?? '').trim();
    if (!t) return NaN;
    const direct = Number(t);
    if (!Number.isNaN(direct) && Number.isFinite(direct)) return direct;
    try {
        const expr = t.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_, name) => {
            const v = vars?.[name];
            return v !== undefined && !Number.isNaN(Number(v)) ? String(v) : '0';
        });
        const n = Number(evaluateMathExpression(expr));
        return Number.isNaN(n) ? NaN : n;
    } catch (_) {
        return NaN;
    }
}

/**
 * Restore shape formula tokens into state segment data when values are equivalent.
 * This keeps formulas visible in edit mode for circle/rect/ellipse parameters.
 *
 * @param {EditorStateManager} state
 * @param {Array<{type:string, segId:string|null, attrs:Record<string,string>}>} snapshot
 * @param {Record<string,number>} vars
 */
function _restoreShapeFormulasIntoState(state, snapshot, vars) {
    if (!state || !Array.isArray(snapshot) || snapshot.length === 0) return;

    const isFormula = (v) => typeof v === 'string' && /\{[^}]+\}/.test(v);
    const isEq = (a, b) => !Number.isNaN(a) && !Number.isNaN(b) && Math.abs(a - b) <= 1e-4;
    const shapeSegs = state.segments.filter(s => s.type === 'circle' || s.type === 'rect' || s.type === 'ellipse');
    if (shapeSegs.length === 0) return;

    const queues = new Map();
    for (const seg of shapeSegs) {
        const q = queues.get(seg.type) ?? [];
        q.push(seg);
        queues.set(seg.type, q);
    }

    const updates = [];
    for (const snap of snapshot) {
        const q = queues.get(snap.type) ?? [];
        const seg = q.shift();
        if (!seg) continue;

        const nextData = { ...(seg.data ?? {}) };
        const exprMap = { ...(nextData._expr ?? {}) };
        let changed = false;

        for (const [attr, token] of Object.entries(snap.attrs ?? {})) {
            if (!isFormula(token)) continue;
            const tokenVal = _resolveTokenNumber(token, vars);

            let currentVal = NaN;
            if (seg.type === 'circle') {
                if (attr === 'cx') currentVal = Number(seg.data?.center?.x);
                else if (attr === 'cy') currentVal = Number(seg.data?.center?.y);
                else if (attr === 'r') currentVal = Number(seg.data?.radius);
            } else {
                currentVal = Number(seg.data?.[attr]);
            }
            if (!isEq(tokenVal, currentVal)) continue;

            exprMap[attr] = token;
            changed = true;
            if (seg.type === 'circle' && attr === 'r') nextData.radiusExpr = token;
        }

        if (!changed) continue;
        nextData._expr = exprMap;
        updates.push({ id: seg.id, changes: { data: nextData } });
    }

    if (updates.length > 0) state.updateSegments(updates);
}

/**
 * Sync top-level element transforms from PathEditor into segment metadata
 * without modifying segment geometry.
 *
 * @param {EditorStateManager} state
 * @param {Array<{kind:'path'|'shape', contourId?:number, segId?:string, transforms:Array<object>}>} transformsMeta
 */
function _syncElementTransformsToState(state, transformsMeta) {
    if (!state || !Array.isArray(transformsMeta)) return;

    const normalize = (arr) => (Array.isArray(arr) ? arr : []).map(t => ({
        type: String(t?.type ?? '').toUpperCase(),
        raw: String(t?.raw ?? ''),
        params: Array.isArray(t?.params) ? [...t.params] : [],
    }));
    const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

    const updates = [];
    const metaPaths = transformsMeta.filter(m => m?.kind === 'path');
    const statePaths = state.getElements().filter(e => e.type === 'path' || e.type === 'polyline');

    for (let i = 0; i < statePaths.length; i++) {
        const elem = statePaths[i];
        const tr = normalize(metaPaths[i]?.transforms);
        for (const seg of state.segments) {
            if ((seg.contourId ?? 0) !== (elem.contourId ?? 0)) continue;
            if (!same(seg.transforms, tr)) updates.push({ id: seg.id, changes: { transforms: tr } });
        }
    }

    const metaShapes = transformsMeta.filter(m => m?.kind === 'shape');
    const stateShapes = state.segments.filter(s => s.type === 'circle' || s.type === 'rect' || s.type === 'ellipse');
    for (let i = 0; i < stateShapes.length; i++) {
        const seg = stateShapes[i];
        const byId = metaShapes.find(m => typeof m.segId === 'string' && m.segId === seg.id);
        const tr = normalize(byId?.transforms ?? metaShapes[i]?.transforms);
        if (!same(seg.transforms, tr)) updates.push({ id: seg.id, changes: { transforms: tr } });
    }

    if (updates.length > 0) state.updateSegments(updates);
}


/**
 * ProfileEditor — top-level orchestrator for the profile cross-section editor.
 *
 * Manages the full lifecycle of edit mode inside the bit modal:
 * 1. **Enter** (`enter()`) — switch UI from preview mode to editor mode:
 *    - Hide the preview zoom toolbar
 *    - Inject the editor toolbar below the canvas SVG
 *    - Initialize sub-components (EditorStateManager, EditorCanvas, EditorToolbar)
 * 2. **Edit** — user draws/edits segments; tools update EditorStateManager;
 *    EditorCanvas re-renders on each state change.
 * 3. **Exit** (`exit(save)`) — return to preview mode:
 *    - If `save=true`, serialize segments to SVG path and call `onSave(path)`
 *    - Restore the preview zoom toolbar
 *    - Tear down all sub-components
 *
 * ### Sub-component relationships
 * ```
 * ProfileEditor
 * ├── EditorStateManager   (mutable state: segments, tool, selection, history)
 * ├── EditorCanvas         (rendering + coordinate helpers, delegates to CanvasManager)
 * │   └── SnapManager      (snap computation)
 * └── EditorToolbar        (tool palette UI + keyboard shortcuts, injected below canvas)
 * ```
 *
 * ### Usage (from BitsManager)
 * ```js
 * const editor = new ProfileEditor();
 * editor.enter({
 *   modal,                          // the bit modal HTMLElement
 *   canvasManager,                  // the shared preview CanvasManager
 *   profilePath: bit.profilePath,   // initial SVG path string
 *   variableValues,                 // current formula variable values
 *   onSave: (newPath) => {          // called when user clicks Done
 *     bit.profilePath = newPath;
 *     updateBitPreview();
 *   },
 * });
 * ```
 */
export default class ProfileEditor {
    constructor() {
        /** @type {import("./EditorStateManager.js").default|null} */
        this.state = null;

        /** @type {import("./EditorCanvas.js").default|null} */
        this.editorCanvas = null;

        /** @type {import("./EditorToolbar.js").default|null} */
        this.toolbar = null;

        /** @type {import("../panel/PathEditor.js").default|null} */
        this._pathEditor = null;

        /** Row-index → segment-ID map (updated on every export). @type {Array<string|null>} */
        this._lineSegIds = [];

        /** Guard flag: true while we are pushing a path to PathEditor to prevent re-entry. @type {boolean} */
        this._syncingToPathEditor = false;

        /** Guard flag: true while a text-editor change is being processed (prevents setPath() round-trip). @type {boolean} */
        this._pathEditorIsSource = false;

        /** Guard flag: true after initial enter() sync is armed.
         *  If sync is invoked before that point, only lightweight ID/selection binding runs. @type {boolean} */
        this._initialSyncDone = false;

        /** Saved PathEditor.onChange before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnChange = null;

        /** Saved PathEditor.onLineClick before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnLineClick = null;
        /** Saved PathEditor.onElementOrderChange before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnElementOrderChange = null;

        /** The SVG <circle> dot drawn on the canvas overlay when an M row is selected in edit mode.
         *  Cleared when a segment is selected or edit mode exits. @type {SVGCircleElement|null} */
        this._mDotElement = null;

        /** Saved CanvasManager.config.onZoom before edit mode — restored on exit. @type {Function|null} */
        this._prevOnZoom = null;

        /** @type {boolean} */
        this._active = false;

        // Stored context for exit()
        /** @type {HTMLElement|null} */
        this._modal = null;
        /** @type {((path: string|null) => void)|null} */
        this._onSave = null;
        /** @type {(() => void)|null} */
        this._onClose = null;

        /** @type {((e: KeyboardEvent) => void)|null} */
        this._keyHandler = null;

        /**
         * The last path text seen from PathEditor (may contain {varname} formula tokens).
         * Updated ONLY when the text editor is the change source, so that formula tokens
         * survive canvas edits unchanged.
         * @type {string}
         */
        this._formulaPath = "";
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    /**
     * Enter edit mode.
     *
     * @param {object} context
     * @param {HTMLElement} context.modal                 - Bit modal root element
     * @param {import("../canvas/CanvasManager.js").default} context.canvasManager
     * @param {string}      [context.profilePath=""]      - Initial SVG path to edit
     * @param {Record<string, number>} [context.variableValues={}]
     * @param {(path: string) => void} context.onSave     - Called with new path on Done
     * @param {() => void}          [context.onClose]    - Called on both Done and Cancel after cleanup
     * @param {import("../panel/PathEditor.js").default|null} [context.pathEditor] - Optional PathEditor for bidirectional text sync
     */
    enter({ modal, canvasManager, profilePath = "", variableValues = {}, onSave, onClose, pathEditor = null }) {
        if (this._active) {
            log.warn("ProfileEditor.enter() called while already active");
            return;
        }
        this._active    = true;
        this._modal     = modal;
        this._onSave    = onSave;
        this._onClose   = onClose ?? null;
        this._pathEditor = pathEditor;
        this._formulaPath = pathEditor?.getContoursRawPath?.() || profilePath;
        const shapeFormulaSnapshot = pathEditor?.getShapeParamSnapshot?.() ?? [];

        log.info("Entering profile edit mode");

        // 1. Initialize state
        this.state = new EditorStateManager({ profilePath, variableValues });
        _restoreShapeFormulasIntoState(this.state, shapeFormulaSnapshot, variableValues);
        _syncElementTransformsToState(this.state, pathEditor?.getElementTransformsSnapshot?.() ?? []);

        // 2. Initialize canvas extension
        this.editorCanvas = new EditorCanvas(canvasManager, this.state);
        this.editorCanvas.initialize();

        // 3. Clear stale preview overlays (anchor cross, segment highlights) that
        // drawAnchorAndAxis() left on the overlay layer before edit mode was entered.
        const overlayLayer = canvasManager.getLayer("overlay");
        if (overlayLayer) overlayLayer.innerHTML = "";

        // 4. Wire PathEditor bidirectional callbacks (preserves formula tokens).
        if (pathEditor) this._setupPathEditorCallbacks(pathEditor);

        // 5. Wire state → canvas re-render + PathEditor sync.
        this.state.onSegmentsChange = () => {
            this.editorCanvas.renderAllSegments(this.state.segments);
            this._syncToPathEditor();
        };

        // Selection change: re-render canvas + sync PathEditor row highlighting.
        this.state.onSelectionChange = () => {
            this.editorCanvas.renderAllSegments(this.state.segments);
            this._syncPathEditorSelectionOnly();
        };

        // 6. Initial render.
        // Use the same sync pipeline as normal edit updates so preview/edit stay unified.
        this.editorCanvas.renderAllSegments(this.state.segments);
        this._initialSyncDone = true;
        this._syncToPathEditor();

        // 7. Re-draw M-dot at updated scale whenever the user zooms/pans.
        // The dot radius is zoom-dependent (3px screen = 3/zoom SVG units),
        // so we must recreate it on every zoom change.
        this._prevOnZoom = canvasManager.config.onZoom;
        canvasManager.config.onZoom = (zoom, panX, panY) => {
            if (this._prevOnZoom) this._prevOnZoom(zoom, panX, panY);
            for (const id of (this.state?.selectedIds ?? new Set())) {
                if (typeof id === 'string' && id.startsWith('m:')) {
                    this._showMDotForContour(Number(id.slice(2)));
                    break;
                }
            }
        };

        // 8. Mount toolbar
        const previewContainer = modal.querySelector("#bit-preview");
        this.toolbar = new EditorToolbar(previewContainer, {
            onToolChange: (toolId) => {
                // If Escape wants to switch to cursor while we’re in the middle of an
                // operation (e.g. moving objects), cancel the operation but stay on the
                // current tool rather than switching to cursor.
                if (toolId === "cursor" && this._currentTool?.hasActiveCommand()) {
                    this._currentTool.onKeyDown({ key: "Escape", preventDefault() {}, stopPropagation() {} });
                    return;
                }
                // Always keep selection when switching tools — clearing only happens
                // on an empty-space click (CursorTool) or Escape in cursor mode.
                this.state.setTool(toolId, { preserveSelection: true });
                this.toolbar.setActiveTool(toolId);
                this._activateTool(toolId);
                if (toolId !== "cursor") this._lastDrawToolId = toolId;
            },
            onDone:   () => this.exit(true),
            onCancel: () => this.exit(false),
            onSnapChange: (type, active) => {
                this.editorCanvas.snapManager.setEnabled(type, active);
            },
            onGridSizeChange: (size) => {
                this.editorCanvas.snapManager.setGridSize(size);
            },
        });
        this.toolbar.mount();
        this.toolbar.setActiveTool("cursor");

        // 9. Switch DOM to editor layout
        this._applyEditLayout(modal, true);

        // 10. Register undo/redo keyboard shortcut
        this._registerKeyboard();

        // 11. Activate canvas mouse events for the current tool
        this._activateTool("cursor");
    }

    /**
     * Exit edit mode.
     * @param {boolean} save - If true, serialize and call onSave(); if false, discard changes.
     */
    exit(save) {
        if (!this._active) return;
        this._active = false;

        log.info(`Exiting profile edit mode (save=${save})`);

        // Tear down sub-components (must happen BEFORE onSave / onClose so
        // that updateBitPreview() triggered inside onSave doesn't fire back
        // through our custom onChange handler and cause an infinite loop).
        this._currentTool?.deactivate();
        this._currentTool = null;

        this._unbindCanvasEvents();

        // Restore PathEditor callbacks BEFORE calling onSave, so that any
        // updateBitPreview() call inside onSave uses the original onChange
        // (not the editor's _importPath handler).
        if (this._pathEditor) {
            this._clearMDot();
            this._pathEditor.onChange               = this._origPathEditorOnChange    ?? (() => {});
            this._pathEditor.onLineClick            = this._origPathEditorOnLineClick ?? null;
            this._pathEditor.onElementOrderChange   = this._origPathEditorOnElementOrderChange ?? null;
            this._pathEditor.onShapeElementChange   = null;
            this._pathEditor.onShapeElementClick    = null;
            this._pathEditor.onPathElemClick        = null;
            this._pathEditor.onDeactivate           = null;
            this.state.activeContourId              = null;
            this.state.insertAfterSegId             = null;
            this._pathEditor.setShapeElements([]);
            this._pathEditor.clearLineSelection();
            this._pathEditor.clearShapeSelection?.();
            this._pathEditor = null;
        }
        this._lineSegIds = [];

        if (save && this._onSave) {
            // If no edits were made (canUndo = false), pass null so the caller can
            // preserve any formula text in the raw path input instead of overwriting.
            const path = this.state.canUndo() ? this.state.exportPath() : null;
            this._onSave(path);
        }

        this.toolbar?.unmount();
        this.toolbar = null;

        // Restore the CanvasManager onZoom callback.
        if (this.editorCanvas?.cm) {
            this.editorCanvas.cm.config.onZoom = this._prevOnZoom ?? null;
        }
        this._prevOnZoom = null;

        this.editorCanvas?.destroy();
        this.editorCanvas = null;

        this.state = null;
        this._initialSyncDone = false;

        // Restore keyboard
        if (this._keyHandler) {
            window.removeEventListener("keydown", this._keyHandler);
            this._keyHandler = null;
        }

        // Restore DOM to preview layout
        if (this._modal) this._applyEditLayout(this._modal, false);

        const onClose = this._onClose;
        this._modal   = null;
        this._onSave  = null;
        this._onClose = null;
        // Always notify the caller so it can restore preview rendering
        onClose?.();
    }

    /** @returns {boolean} */
    get isActive() { return this._active; }
    // ─── PathEditor integration ─────────────────────────────────────────────────────

    /**
     * Install all PathEditor callbacks for the duration of an edit session.
     *
     * Saves the original `onChange` and `onLineClick` handlers so they can be
     * restored by `exit()`.  All six callbacks are wired here to keep `enter()`
     * as a clean orchestrator.
     *
     * Callback responsibilities:
     * - `onChange`           — text-editor change → re-import path into state
     * - `onLineClick`        — row click (L/A/M) → select segment on canvas
     * - `onShapeElementChange` — shape attribute edit → update matching segment
     * - `onShapeElementClick`  — shape row click → select shape segment
     * - `onPathElemClick`    — path header click → select all path segments
     * - `onDeactivate`       — background click → clear canvas selection
     *
     * @param {import("../panel/PathEditor.js").default} pathEditor
     * @private
     */
    _setupPathEditorCallbacks(pathEditor) {
        // Save the original handlers so exit() can restore them.
        // We do NOT invoke them while editing (prevents updateBitPreview from
        // overwriting the editor’s line segments in the bits layer).
        this._origPathEditorOnChange    = pathEditor.onChange;
        this._origPathEditorOnLineClick = pathEditor.onLineClick;
        this._origPathEditorOnElementOrderChange = pathEditor.onElementOrderChange;

        pathEditor.onElementOrderChange = (order) => {
            if (!Array.isArray(order) || !this.state) return;
            const used = new Set();
            const reordered = [];
            for (const item of order) {
                if (item?.kind === 'contour') {
                    const cid = Number(item.contourId);
                    const group = this.state.segments.filter(s => !used.has(s.id) && (s.contourId ?? 0) === cid);
                    for (const seg of group) {
                        reordered.push(seg);
                        used.add(seg.id);
                    }
                } else if (item?.kind === 'shape' && typeof item.segId === 'string') {
                    const seg = this.state.segments.find(s => !used.has(s.id) && s.id === item.segId);
                    if (seg) {
                        reordered.push(seg);
                        used.add(seg.id);
                    }
                }
            }
            const tail = this.state.segments.filter(s => !used.has(s.id));
            const next = [...reordered, ...tail];
            const prevIds = this.state.segments.map(s => s.id);
            const nextIds = next.map(s => s.id);
            const changed = prevIds.length !== nextIds.length || prevIds.some((id, i) => id !== nextIds[i]);
            if (!changed) return;

            this._pathEditorIsSource = true;
            this.state.segments = next;
            this.state._pushHistory("Reorder elements");
            this.state._notifySegments();
            this._pathEditorIsSource = false;
        };

        // PathEditor → canvas: user edited the text — re-import into state.
        pathEditor.onChange = (newPath, meta = null) => {
            // Suppress re-entry caused by setPath() calls from _syncToPathEditor.
            if (this._syncingToPathEditor) return;
            // Keep the formula path in sync with what the user typed.
            this._formulaPath = this._pathEditor?.getContoursRawPath?.() ?? newPath;
            // Mark that this change originated in the text editor so that
            // _syncToPathEditor does NOT overwrite PathEditor content.
            this._pathEditorIsSource = true;
            this.state._importPath(newPath, { resetHistory: false });

            // Preserve row selection from PathEditor after text import.
            // PathEditor emits flat selected line indexes; convert them via fresh lineSegIds.
            const selectedRefs = meta?.selectedLineRefs;
            if (Array.isArray(selectedRefs) && selectedRefs.length > 0) {
                const { lineSegIds } = this.state.exportPathWithMap({ skipShapes: true });
                const selectedIds = [];
                for (const ref of selectedRefs) {
                    if (typeof ref === 'number') {
                        const mapped = lineSegIds?.[ref] ?? null;
                        if (mapped) selectedIds.push(mapped);
                    } else if (typeof ref === 'string' && ref.length > 0) {
                        selectedIds.push(ref);
                    }
                }
                this.state.setSelection([...new Set(selectedIds)]);
            }

            // Keep PathEditor row highlight/source selection exactly as user left it,
            // including rows that do not map to canvas segments yet (e.g. first `M`).
            if (Array.isArray(selectedRefs)) {
                this._pathEditor?.setSelectedLines(selectedRefs);
            }

            _syncElementTransformsToState(this.state, meta?.elementTransforms ?? []);

            this._pathEditorIsSource = false;
        };

        // PathEditor row click → canvas selection (unified API: segId is always passed).
        pathEditor.onLineClick = (segRef, e, selectedRefs = null) => {
            const resolveSegRef = (ref) => {
                if (typeof ref === 'number') return this._lineSegIds?.[ref] ?? null;
                return ref ?? null;
            };

            const clickedSegId = resolveSegRef(segRef);

            // Unified mode: PathEditor is the source of truth for row selection state.
            // Apply the full selected set (toggle/range/plain) exactly as provided.
            if (Array.isArray(selectedRefs)) {
                const resolvedSelected = [...new Set(
                    selectedRefs
                        .map(resolveSegRef)
                        .filter(id => typeof id === 'string' && id.length > 0)
                )];

                if (resolvedSelected.length === 0) {
                    this.state.activeContourId  = null;
                    this.state.insertAfterSegId = null;
                    this._clearMDot();
                    this._pathEditorIsSource = true;
                    this.state.clearSelection();
                    this._pathEditorIsSource = false;
                    return;
                }

                if (typeof clickedSegId === 'string' && clickedSegId.startsWith('m:')) {
                    const contourId = Number(clickedSegId.slice(2));
                    this.state.activeContourId  = contourId;
                    this.state.insertAfterSegId = null;
                } else {
                    const focusSegId = (typeof clickedSegId === 'string' && !clickedSegId.startsWith('m:'))
                        ? clickedSegId
                        : resolvedSelected.find(id => !id.startsWith('m:')) ?? null;
                    const seg = focusSegId ? this.state.segments.find(s => s.id === focusSegId) : null;
                    this.state.activeContourId  = seg?.contourId ?? null;
                    this.state.insertAfterSegId = focusSegId;
                }

                this._clearMDot();
                this._pathEditorIsSource = true;
                this.state.setSelection(resolvedSelected);
                this._pathEditorIsSource = false;
                return;
            }

            if (typeof clickedSegId === 'string' && clickedSegId.startsWith('m:')) {
                // M row: synthetic segId encodes contourId as "m:<contourId>".
                // Routed through setSelection identically to L/A rows so that
                // state.clearSelection() fires correctly on Escape / empty-canvas click.
                const contourId = Number(clickedSegId.slice(2));
                this.state.activeContourId  = contourId;
                this.state.insertAfterSegId = null;
                this._pathEditorIsSource = true;
                this.state.setSelection(clickedSegId);
                this._pathEditorIsSource = false;
                return;
            }
            // Normal segment row (line/arc).
            const seg = this.state.segments.find(s => s.id === clickedSegId);
            this.state.activeContourId  = seg?.contourId ?? null;
            this.state.insertAfterSegId = clickedSegId;
            this._clearMDot();
            this._pathEditorIsSource = true;
            // CTRL/Meta+click or Shift+click → toggle; plain click → exclusive select.
            if (e?.ctrlKey || e?.metaKey || e?.shiftKey) this.state.toggleSelection(clickedSegId);
            else                                          this.state.setSelection(clickedSegId);
            this._pathEditorIsSource = false;
        };

        // Shape element attribute edit: merge changes into the matching canvas segment.
        pathEditor.onShapeElementChange = (segId, changes) => {
            if (changes === null) {
                this.state.deleteSegments([segId]);
                return;
            }
            // Handle shape creation triggered by PathEditor “Add” buttons.
            // segId is null here; changes._create carries the type string.
            if (changes._create) {
                this._createDefaultShape(changes._create);
                return;
            }
            // Merge changes into existing data (updateSegments replaces `data` at top level).
            const seg = this.state.segments.find(s => s.id === segId);
            if (!seg) return;
            const mergedData = { ...seg.data, ...changes };
            if (seg.type === 'circle' && (Object.prototype.hasOwnProperty.call(changes, 'radius')
                    || Object.prototype.hasOwnProperty.call(changes, 'center'))) {
                const center = mergedData.center ?? seg.data.center;
                const radius = mergedData.radius ?? seg.data.radius ?? 0;
                const prevPt3 = seg.data.pt3 ?? { x: center.x + radius, y: center.y };
                const dx = prevPt3.x - center.x;
                const dy = prevPt3.y - center.y;
                const ang = Math.atan2(dy, dx);
                mergedData.pt3 = { x: center.x + Math.cos(ang) * radius, y: center.y + Math.sin(ang) * radius };
            }
            // Explicitly remove radiusExpr when the caller passes `radiusExpr: undefined`.
            if (Object.prototype.hasOwnProperty.call(changes, 'radiusExpr') && changes.radiusExpr === undefined) {
                delete mergedData.radiusExpr;
            }
            this._pathEditorIsSource = true;
            this.state.updateSegments([{ id: segId, changes: { data: mergedData } }]);
            this.state._pushHistory("Edit shape element");
            this._pathEditorIsSource = false;
        };

        // Shape element row click: select on canvas.
        // Clear activeContourId so new segments aren’t incorrectly appended to a path.
        pathEditor.onShapeElementClick = (segId, e, selectedSegIds = null) => {
            this.state.activeContourId  = null;
            this.state.insertAfterSegId = null;
            this._clearMDot();
            this._pathEditorIsSource = true;
            if (Array.isArray(selectedSegIds)) {
                this.state.setSelection(selectedSegIds);
            } else if (e?.ctrlKey || e?.metaKey || e?.shiftKey) {
                this.state.toggleSelection(segId);
            } else {
                this.state.setSelection(segId);
            }
            this._pathEditorIsSource = false;
        };

        // Path element header click: select all segments in the path and set
        // activeContourId so that drawing can continue into this path.
        pathEditor.onPathElemClick = (segIds, e, selectedSegIds = null) => {
            const firstSeg = this.state.segments.find(s => s.id === segIds[0]);
            this.state.activeContourId  = firstSeg?.contourId ?? null;
            // Insert after the last line/arc segment of this path.
            const lastLineSegId = [...segIds].reverse().find(id => {
                const s = this.state.segments.find(seg => seg.id === id);
                return s && (s.type === 'line' || s.type === 'arc');
            });
            this.state.insertAfterSegId = lastLineSegId ?? null;
            this._clearMDot();
            this._pathEditorIsSource = true;
            if (Array.isArray(selectedSegIds)) {
                this.state.setSelection(selectedSegIds);
            } else if (e?.shiftKey) {
                this.state.setSelection([...this.state.selectedIds, ...segIds]);
            } else {
                this.state.setSelection(segIds);
            }
            this._pathEditorIsSource = false;
        };

        // PathEditor background click → clear canvas selection + active contour.
        pathEditor.onDeactivate = () => {
            this.state.activeContourId  = null;
            this.state.insertAfterSegId = null;
            this._clearMDot();
            this._pathEditorIsSource = true;
            this.state.clearSelection();
            this._pathEditorIsSource = false;
        };
    }

    /**
     * Push current canvas/model state to PathEditor and sync row highlighting.
     *
     * Canvas-originated updates:
     * - Merge formula tokens back into exported contour path.
     * - Prefer in-place row updates; fallback to full `setElements()` only when
     *   structure changed.
     *
     * Text-originated updates:
     * - Keep PathEditor structure as source of truth; only hard-clear when state path is empty.
     *
     * Always refreshes ID binding and M-row anchor-dot visualization.
     * @private
     */
    _syncToPathEditor() {
        if (!this._pathEditor) return;
        this._clearMDot();
        const { path, lineSegIds } = this.state.exportPathWithMap({ skipShapes: true });
        this._lineSegIds = lineSegIds;

        const elements = this.state.getElements();

        // If sync is called before initial enter() synchronization is armed,
        // keep it lightweight and avoid structural updates.
        if (!this._initialSyncDone) {
            this._bindPathEditorSegmentIdsOnly();
            return;
        }

        if (!this._pathEditorIsSource) {
            // Canvas-originated: rebuild sub-line content, merging formula tokens back.
            const mergedPath = _mergeFormulaPath(path, this._formulaPath, this.state.variableValues);
            const elemsWithPaths = _buildElemsWithPaths(elements, mergedPath, lineSegIds);
            const needsRebuild = this._pathEditor.needsElementsRebuild?.(elemsWithPaths) ?? true;
            if (needsRebuild) {
                this._syncingToPathEditor = true;
                this._pathEditor.setElements(elemsWithPaths);
                this._syncingToPathEditor = false;
            } else {
                const updatedInPlace = this._pathEditor.updatePathLinesInPlace?.(mergedPath, lineSegIds) ?? false;
                const shapesUpdatedInPlace = this._pathEditor.updateShapeRowsInPlace?.(elemsWithPaths) ?? false;
                if (!updatedInPlace || !shapesUpdatedInPlace) {
                    this._syncingToPathEditor = true;
                    this._pathEditor.setElements(elemsWithPaths);
                    this._syncingToPathEditor = false;
                }
            }
        } else {
            // Text-originated: keep PathEditor structure as the source of truth.
            // We only clear the editor when the exported path is truly empty.
            if (!path) {
                // Truly empty state — sync the clear to PathEditor.
                this._pathEditor.setElements([]);
            }
            // else: non-empty text edits are already reflected in PathEditor DOM.
        }
        this._bindPathEditorSegmentIdsOnly();
    }

    /**
     * Lightweight sync used for selection-only updates.
     * Never rebuilds PathEditor structure.
     * @private
     */
    _syncPathEditorSelectionOnly() {
        if (!this._pathEditor) return;
        this._clearMDot();
        this._pathEditor.setSelectedElements(this.state.selectedIds);
        for (const id of this.state.selectedIds) {
            if (typeof id === 'string' && id.startsWith('m:')) {
                this._showMDotForContour(Number(id.slice(2)));
                break;
            }
        }
    }

    /**
     * Bind current EditorState segment IDs to existing PathEditor rows without
     * rebuilding PathEditor element structure.
     * @private
     */
    _bindPathEditorSegmentIdsOnly() {
        if (!this._pathEditor || !this.state) return;
        const { lineSegIds } = this.state.exportPathWithMap({ skipShapes: true });
        this._lineSegIds = lineSegIds;
        const shapeSegIds = this.state.getElements()
            .filter(e => e.type === 'circle' || e.type === 'rect' || e.type === 'ellipse')
            .map(e => e.segId)
            .filter(Boolean);
        this._pathEditor.bindSegmentIds?.({ lineSegIds, shapeSegIds });
        this._syncPathEditorSelectionOnly();
    }

    // ─── Default shape creation ──────────────────────────────────────────────────────

    /**
     * Create a new shape segment in the canvas state with sensible default dimensions.
     * Called when the user clicks an “Add <shape>” button in PathEditor suggestions
     * while the editor is in edit mode.
     *
     * @param {'circle'|'rect'|'ellipse'} type
     * @private
     */
    _createDefaultShape(type) {
        if (!this.state) return;
        let segData;
        switch (type) {
            case 'circle':
                segData = { type: 'circle',  data: { center: { x: 0, y: 0 }, radius: 10 } };
                break;
            case 'rect':
                segData = { type: 'rect',    data: { x: -15, y: -10, width: 30, height: 20, rx: 0 } };
                break;
            case 'ellipse':
                segData = { type: 'ellipse', data: { cx: 0, cy: 0, rx: 20, ry: 10 } };
                break;
            default: return;
        }
        // addSegment handles contourId assignment and fires onSegmentsChange.
        this.state.addSegment(segData);
        this.state._pushHistory(`Add ${type}`);
    }
    // ─── M-row canvas selection ──────────────────────────────────────────────────

    /**
     * Draw a filled blue circle on the canvas overlay at the M-row anchor point.
     * Used when the user clicks an M-row in the PathEditor during edit mode,
     * giving visual feedback identical to the preview-mode dot.
     * @param {number} contourId - The contour ID encoded in the selected `"m:<cid>"` segId
     * @private
     */
    _showMDotForContour(contourId) {
        this._clearMDot();
        if (!this.editorCanvas) return;
        // Find the first line/arc segment in the given contour; its start is the M anchor.
        const seg = this.state.segments.find(s =>
            s.contourId === contourId && (s.type === 'line' || s.type === 'arc'));
        if (!seg) return;
        const { x, y } = seg.data.start;
        const overlay = this.editorCanvas.cm.getLayer("overlay");
        if (!overlay) return;
        const zoom = this.editorCanvas.cm.zoomLevel || 1;
        const r = Math.max(0.5, 3 / zoom);
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("r", r);
        dot.setAttribute("fill", "#2196F3");
        dot.setAttribute("fill-opacity", "0.85");
        dot.setAttribute("stroke", "#1565C0");
        dot.setAttribute("stroke-width", Math.max(0.05, 0.5 / zoom));
        dot.classList.add("editor-m-selection");
        this._mDotElement = dot;
        overlay.appendChild(dot);
    }

    /**
     * Remove the M-row anchor dot from the canvas overlay (if present).
     */
    _clearMDot() {
        if (this._mDotElement) {
            this._mDotElement.remove();
            this._mDotElement = null;
        }
    }
    // ─── Tool activation ─────────────────────────────────────────────────────

    /** @type {import("./tools/BaseTool.js").default|null} — the currently active tool instance */
    _currentTool = null;

    /** @type {string|null} — last non-cursor draw tool, for right-click repeat */
    _lastDrawToolId = null;

    /** @type {string|null} — ID of the currently active tool (e.g. "cursor", "line", "arc"). */
    _currentToolId = null;

    /**
     * Switch to the tool with the given ID.
     * Lazily instantiates tool classes on first use.
     * @param {string} toolId
     * @private
     */
    _activateTool(toolId) {
        const tool = this._createTool(toolId);
        if (!tool) return; // unknown tool — keep current tool active

        if (this._currentTool) {
            this._currentTool.deactivate();
            this._currentTool = null;
        }

        // Cursor style: crosshair for all drawing/editing tools; default for select.
        const svgCanvas = this.editorCanvas?.cm?.canvas;
        if (svgCanvas) svgCanvas.style.cursor = toolId === "cursor" ? "" : "crosshair";

        tool.activate({ state: this.state, canvas: this.editorCanvas });
        this._currentTool  = tool;
        this._currentToolId = toolId;
        this._bindCanvasEvents(tool);
    }

    /**
     * Instantiate a tool by ID.
     * TODO: import and return concrete tool classes.
     * @param {string} toolId
     * @returns {import("./tools/BaseTool.js").default|null}
     * @private
     */
    _createTool(toolId) {
        switch (toolId) {
            case "cursor": return new CursorTool();
            case "move":   return new MoveTool();
            case "line":   return new LineTool();
            case "mirror": return new MirrorTool();
            case "arc3pt":
            case "arc":      return new ArcTool();
            case "circle2pt":  return new CircleTool("circle2pt");
            case "circle3pt":  return new CircleTool("circle3pt");
            case "rect2pt":    return new RectTool("rect2pt");
            case "rect3pt":    return new RectTool("rect3pt");
            case "ellipse2pt": return new EllipseTool("ellipse2pt");
            case "ellipse3pt": return new EllipseTool("ellipse3pt");
            default:
                log.debug("_createTool: tool not implemented:", toolId);
                return null;
        }
    }

    // ─── Canvas mouse event routing ──────────────────────────────────────────

    /**
     * Bind canvas mouse events to route through snap → active tool.
     * Removes any previously bound handlers first.
     * @param {import("./tools/BaseTool.js").default} tool
     * @private
     */
    _bindCanvasEvents(tool) {
        const cm = this.editorCanvas?.cm;
        if (!cm) return;

        const canvas = cm.canvas;

        // Remove old handlers
        if (cm._editorMouseDown)   canvas.removeEventListener("mousedown",   cm._editorMouseDown);
        if (cm._editorMouseMove)   canvas.removeEventListener("mousemove",   cm._editorMouseMove);
        if (cm._editorMouseUp)     canvas.removeEventListener("mouseup",     cm._editorMouseUp);
        if (cm._editorDblClick)    canvas.removeEventListener("dblclick",    cm._editorDblClick);
        if (cm._editorRightClick)  canvas.removeEventListener("mousedown",   cm._editorRightClick,  { capture: true });
        if (cm._editorContextMenu) canvas.removeEventListener("contextmenu", cm._editorContextMenu);

        const ecvs = this.editorCanvas;

        // Track right-button screen position for click-vs-drag detection.
        let rightDownClient = null;

        cm._editorMouseDown = (e) => {
            if (e.button === 2) {
                // Track right-button position so contextmenu can distinguish click from drag.
                rightDownClient = { x: e.clientX, y: e.clientY };
                return; // let CanvasManager handle panning normally
            }
            if (e.button !== 0) return;
            const raw     = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            this._lastPoint = snapped;
            tool.onPointerDown(snapped, e);
        };
        cm._editorMouseMove = (e) => {
            // While CanvasManager is panning (right-button drag), don't feed SVG
            // coordinates to the active tool — that would move objects during pan.
            if (cm.isDragging) return;
            const raw     = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            tool.onPointerMove(snapped, e);
        };
        cm._editorMouseUp = (e) => {
            if (e.button !== 0) return;
            const raw     = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            tool.onPointerUp(snapped, e);
        };
        cm._editorDblClick = (e) => {
            const raw     = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            tool.onDblClick(snapped, e);
        };

        // Right-click: contextmenu fires after button is released.
        // If the mouse moved more than 6 px between down and up it was a pan drag —
        // in that case do NOT call onConfirm; only a genuine click triggers confirm.
        cm._editorRightClick  = null; // no longer registered as capture-phase mousedown
        cm._editorContextMenu = (e) => {
            e.preventDefault(); // always suppress browser context menu
            const dist = rightDownClient
                ? Math.hypot(e.clientX - rightDownClient.x, e.clientY - rightDownClient.y)
                : 999;
            rightDownClient = null;
            if (dist > 6) return; // was a drag/pan, not a click
            if (!this._currentTool?.hasActiveCommand()) return;
            const raw     = ecvs.screenToSVG(e);
            const snapped = ecvs.snap(raw, this._lastPoint, e);
            this._currentTool.onConfirm(snapped, e);
        };

        canvas.addEventListener("mousedown",   cm._editorMouseDown);
        canvas.addEventListener("mousemove",   cm._editorMouseMove);
        canvas.addEventListener("mouseup",     cm._editorMouseUp);
        canvas.addEventListener("dblclick",    cm._editorDblClick);
        // NOTE: _editorRightClick (capture-phase) is intentionally NOT registered anymore.
        canvas.addEventListener("contextmenu", cm._editorContextMenu);
    }

    /** Remove all editor canvas event listeners. */
    _unbindCanvasEvents() {
        const cm = this.editorCanvas?.cm;
        if (!cm) return;
        const canvas = cm.canvas;
        if (cm._editorMouseDown)   canvas.removeEventListener("mousedown",   cm._editorMouseDown);
        if (cm._editorMouseMove)   canvas.removeEventListener("mousemove",   cm._editorMouseMove);
        if (cm._editorMouseUp)     canvas.removeEventListener("mouseup",     cm._editorMouseUp);
        if (cm._editorDblClick)    canvas.removeEventListener("dblclick",    cm._editorDblClick);
        if (cm._editorRightClick)  canvas.removeEventListener("mousedown",   cm._editorRightClick,  { capture: true });
        if (cm._editorContextMenu) canvas.removeEventListener("contextmenu", cm._editorContextMenu);
        cm._editorMouseDown = cm._editorMouseMove = cm._editorMouseUp =
        cm._editorDblClick  = cm._editorRightClick = cm._editorContextMenu = null;
    }

    /** @type {{ x: number, y: number }|null} */
    _lastPoint = null;

    // ─── Keyboard ────────────────────────────────────────────────────────────

    _registerKeyboard() {
        this._keyHandler = (e) => {
            if (!this._active) return;
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            if ((e.ctrlKey || e.metaKey) && e.key === "z") {
                e.preventDefault();
                if (e.shiftKey) this.state.redo(); else this.state.undo();
                return;
            }
            // Escape while cursor tool is active: clear selection (no operation in progress).
            // For other tools, Escape is handled by the toolbar (switches to cursor) or by
            // their own onKeyDown (e.g. MoveTool restores original positions).
            if (e.key === "Escape" && this._currentToolId === "cursor") {
                // Let the tool cancel any active operation (e.g. pt3 drag) before
                // falling back to the generic "clear selection" behaviour.
                if (this._currentTool?.hasActiveCommand()) {
                    if (this._currentTool.onKeyDown(e)) { e.preventDefault(); return; }
                }
                this.state.clearSelection();
                e.preventDefault();
                return;
            }
            // Delegate remaining keys to the active tool
            if (this._currentTool?.onKeyDown(e)) e.preventDefault();
        };
        window.addEventListener("keydown", this._keyHandler);
    }

    // ─── Layout switching ────────────────────────────────────────────────────

    /**
     * Toggle between preview mode and editor mode CSS classes on the modal.
     *
     * In editor mode we keep the form and OK/Cancel visible — only the
     * preview zoom/color toolbar is swapped for the editor toolbar, which
     * is injected by EditorToolbar.mount() directly below the SVG canvas.
     *
     * @param {HTMLElement} modal
     * @param {boolean}     editMode
     * @private
     */
    _applyEditLayout(modal, editMode) {
        const previewEl      = modal.querySelector("#bit-preview");
        const previewToolbar = modal.querySelector("#preview-toolbar");

        if (editMode) {
            previewToolbar?.classList.add("editor-mode-hidden");
            previewEl?.classList.add("bit-preview--editing");
        } else {
            previewToolbar?.classList.remove("editor-mode-hidden");
            previewEl?.classList.remove("bit-preview--editing");
        }
    }
}
