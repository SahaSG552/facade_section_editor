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

const log = LoggerFactory.createLogger("ProfileEditor");

/**
 * Merge formula tokens from a formula-containing path into a freshly exported
 * numeric path.  At each token position: if the formula path has a `{varname}`
 * token AND the variable's resolved value equals the numeric token (within 1e-4),
 * the formula token is kept; otherwise the numeric token is used.
 *
 * If the two paths have different token counts (the segment structure changed),
 * numericPath is returned as-is.
 *
 * @param {string} numericPath        - Path with all numeric values
 * @param {string} formulaPath        - Original path that may contain {varname} tokens
 * @param {Record<string,number>} vars - Variable name → resolved value map
 * @returns {string}
 */
function _mergeFormulaPath(numericPath, formulaPath, vars) {
    if (!formulaPath) return numericPath;
    // Tokenise: SVG command letters and numeric/formula values treated as separate tokens.
    const re = /[MmLlHhVvAaZzCcSsQqTt]|\{[a-zA-Z_][a-zA-Z0-9_]*\}|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g;
    const numTok = numericPath.match(re) ?? [];
    const fmtTok = formulaPath.match(re) ?? [];
    if (numTok.length !== fmtTok.length) return numericPath; // structure changed
    const VAR_RE = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/;
    return numTok.map((n, i) => {
        const f = fmtTok[i];
        const vm = VAR_RE.exec(f);
        if (vm) {
            const resolved = Number(vars[vm[1]]);
            if (!isNaN(resolved) && Math.abs(resolved - Number(n)) < 1e-4) return f;
        }
        return n;
    }).join(' ');
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

        /** Saved PathEditor.onChange before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnChange = null;

        /** Saved PathEditor.onLineClick before edit mode — restored on exit. @type {Function|null} */
        this._origPathEditorOnLineClick = null;

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
        this._formulaPath = profilePath; // initial formula path (may have {tokens} from saved data)

        log.info("Entering profile edit mode");

        // 1. Initialize state
        this.state = new EditorStateManager({ profilePath, variableValues });

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
            this._syncToPathEditor();
        };

        // 6. Initial render — sync element structure WITHOUT replacing PathEditor text.
        // PathEditor already holds the raw formula path loaded by BitsManager.
        this.editorCanvas.renderAllSegments(this.state.segments);
        this._rebuildPathEditorElements();

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

        // PathEditor → canvas: user edited the text — re-import into state.
        pathEditor.onChange = (newPath) => {
            // Suppress re-entry caused by setPath() calls from _syncToPathEditor.
            if (this._syncingToPathEditor) return;
            // Keep the formula path in sync with what the user typed.
            this._formulaPath = newPath;
            // Mark that this change originated in the text editor so that
            // _syncToPathEditor does NOT overwrite PathEditor content.
            this._pathEditorIsSource = true;
            this.state._importPath(newPath, { resetHistory: false });
            this._pathEditorIsSource = false;
        };

        // PathEditor row click → canvas selection (unified API: segId is always passed).
        pathEditor.onLineClick = (segId, e) => {
            if (typeof segId === 'string' && segId.startsWith('m:')) {
                // M row: synthetic segId encodes contourId as "m:<contourId>".
                // Routed through setSelection identically to L/A rows so that
                // state.clearSelection() fires correctly on Escape / empty-canvas click.
                const contourId = Number(segId.slice(2));
                this.state.activeContourId  = contourId;
                this.state.insertAfterSegId = null;
                this._pathEditorIsSource = true;
                this.state.setSelection(segId);
                this._pathEditorIsSource = false;
                return;
            }
            // Normal segment row (line/arc).
            const seg = this.state.segments.find(s => s.id === segId);
            this.state.activeContourId  = seg?.contourId ?? null;
            this.state.insertAfterSegId = segId;
            this._clearMDot();
            this._pathEditorIsSource = true;
            if (e?.shiftKey) this.state.toggleSelection(segId);
            else              this.state.setSelection(segId);
            this._pathEditorIsSource = false;
        };

        // Shape element attribute edit: merge changes into the matching canvas segment.
        pathEditor.onShapeElementChange = (segId, changes) => {
            if (changes === null) {
                this.state.deleteSegments([segId]);
                return;
            }
            // Merge changes into existing data (updateSegments replaces `data` at top level).
            const seg = this.state.segments.find(s => s.id === segId);
            if (!seg) return;
            const mergedData = { ...seg.data, ...changes };
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
        pathEditor.onShapeElementClick = (segId, e) => {
            this.state.activeContourId  = null;
            this.state.insertAfterSegId = null;
            this._clearMDot();
            this._pathEditorIsSource = true;
            if (e?.shiftKey) this.state.toggleSelection(segId);
            else             this.state.setSelection(segId);
            this._pathEditorIsSource = false;
        };

        // Path element header click: select all segments in the path and set
        // activeContourId so that drawing can continue into this path.
        pathEditor.onPathElemClick = (segIds, e) => {
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
            if (e?.shiftKey) this.state.setSelection([...this.state.selectedIds, ...segIds]);
            else             this.state.setSelection(segIds);
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
     * Push the current canvas state to PathEditor and sync row highlighting.
     *
     * Two modes depending on which side originated the last change:
     * - **Canvas-originated** (`_pathEditorIsSource === false`): export a numeric path,
     *   merge formula tokens back via `_mergeFormulaPath`, and call `pathEditor.setElements()`
     *   so the text editor displays current geometry without losing `{varname}` tokens.
     * - **Text-originated** (`_pathEditorIsSource === true`): pass the fresh `lineSegIds`
     *   map to `setElements()` but strip per-element `path` strings so the user’s typed
     *   text is preserved verbatim.
     *
     * Also redraws the M-dot for any selected M-row segId (`"m:<cid>"`).
     * @private
     */
    _syncToPathEditor() {
        if (!this._pathEditor) return;
        this._clearMDot();
        const { path, lineSegIds } = this.state.exportPathWithMap({ skipShapes: true });
        this._lineSegIds = lineSegIds;

        const elements = this.state.getElements();

        if (!this._pathEditorIsSource) {
            // Canvas-originated: rebuild sub-line content, merging formula tokens back.
            const mergedPath = _mergeFormulaPath(path, this._formulaPath, this.state.variableValues);
            const elemsWithPaths = _buildElemsWithPaths(elements, mergedPath, lineSegIds);
            this._syncingToPathEditor = true;
            this._pathEditor.setElements(elemsWithPaths);
            this._syncingToPathEditor = false;
        } else {
            // Text-originated: update lineSegIds map without overwriting formula text.
            // Strip per-element path strings so PathEditor keeps the user-typed content.
            const elemsWithLineIds = _buildElemsWithPaths(elements, path, lineSegIds).map(e =>
                (e.type === 'path' || e.type === 'polyline') ? { ...e, path: null } : e
            );
            this._pathEditor.setElements(elemsWithLineIds);
        }
        // Unified selection highlighting.
        this._pathEditor.setSelectedElements(this.state.selectedIds);

        // Show canvas anchor dot for any selected M row ("m:<contourId>" segId).
        // _clearMDot() was already called at the top of this method.
        for (const id of this.state.selectedIds) {
            if (typeof id === 'string' && id.startsWith('m:')) {
                this._showMDotForContour(Number(id.slice(2)));
                break;
            }
        }
    }

    /**
     * Sync element structure to PathEditor on initial entry WITHOUT clobbering
     * any formula text already loaded there by BitsManager.
     *
     * Passes elements with their per-element `lineSegIds` maps (so M rows receive
     * their synthetic `"m:<cid>"` segId) but strips per-element `path` strings so
     * PathEditor preserves the raw formula text it already holds.
     * @private
     */
    _rebuildPathEditorElements() {
        if (!this._pathEditor) return;
        const { path, lineSegIds } = this.state.exportPathWithMap({ skipShapes: true });
        this._lineSegIds = lineSegIds;
        const elements = this.state.getElements();
        const elemsWithLineIds = _buildElemsWithPaths(elements, path, lineSegIds).map(e =>
            (e.type === 'path' || e.type === 'polyline') ? { ...e, path: null } : e
        );
        this._pathEditor.setElements(elemsWithLineIds);
        this._pathEditor.clearAllSelection?.();
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
