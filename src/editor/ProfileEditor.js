import LoggerFactory from "../core/LoggerFactory.js";
import EditorStateManager from "./EditorStateManager.js";
import EditorCanvas from "./EditorCanvas.js";
import EditorToolbar from "./EditorToolbar.js";
import CursorTool from "./tools/CursorTool.js";
import MoveTool from "./tools/MoveTool.js";
import LineTool from "./tools/LineTool.js";
import MirrorTool from "./tools/MirrorTool.js";

const log = LoggerFactory.createLogger("ProfileEditor");

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

        log.info("Entering profile edit mode");

        // 1. Initialize state
        this.state = new EditorStateManager({ profilePath });

        // 2. Initialize canvas extension
        this.editorCanvas = new EditorCanvas(canvasManager, this.state);
        this.editorCanvas.initialize();

        // ── PathEditor bidirectional sync ────────────────────────────────
        //
        // Rule: the PathEditor is the single source of truth for the raw path
        // text (including M, Z, and formula tokens).  The canvas is a *view*
        // of that text.  Therefore:
        //
        //  • Text change  → parse → update canvas.  Do NOT write back to
        //    PathEditor — preserve exactly what the user typed.
        //
        //  • Canvas change (draw / move / delete) → export numeric path →
        //    update PathEditor content (only in this direction).
        //
        // _pathEditorIsSource is true while we are processing a text-originated
        // change, so syncToPathEditor can skip the setPath() call.
        if (pathEditor) {
            // Save the original onChange so we can restore it on exit.
            // We do NOT call it while editing (prevents updateBitPreview overwriting
            // the editor's line segments in the bits layer).
            this._origPathEditorOnChange = pathEditor.onChange;

            // PathEditor → canvas: user edited the text — re-import into state.
            pathEditor.onChange = (newPath) => {
                // Suppress re-entry caused by setPath() calls from syncToPathEditor.
                if (this._syncingToPathEditor) return;
                // Mark that this change originated in the text editor so that
                // syncToPathEditor does NOT overwrite PathEditor content.
                this._pathEditorIsSource = true;
                this.state._importPath(newPath, { resetHistory: false });
                this._pathEditorIsSource = false;
            };

            // PathEditor row click → canvas selection.
            // Shift+click toggles; plain click replaces selection.
            pathEditor.onLineClick = (idx, e) => {
                const segId = this._lineSegIds[idx];
                if (!segId) return;
                if (e?.shiftKey) {
                    this.state.toggleSelection(segId);
                } else {
                    this.state.setSelection(segId);
                }
            };
        }

        /** Push current state to PathEditor and highlight selected rows (multi-select).
         *  When _pathEditorIsSource is true (the change came from the text editor itself),
         *  we rebuild the lineSegIds row->segment map for selection sync but do NOT call
         *  setPath() -- that would overwrite M / Z / formula tokens the user just typed.
         */
        const syncToPathEditor = () => {
            if (!this._pathEditor) return;
            const { path, lineSegIds } = this.state.exportPathWithMap();
            this._lineSegIds = lineSegIds;

            if (!this._pathEditorIsSource) {
                // Canvas-originated change: update text content.
                this._syncingToPathEditor = true;
                this._pathEditor.setPath(path);
                this._syncingToPathEditor = false;
            }
            // Always sync selection highlighting regardless of source.
            const selectedIndices = [];
            for (const id of this.state.selectedIds) {
                const idx = lineSegIds.indexOf(id);
                if (idx >= 0) selectedIndices.push(idx);
            }
            if (selectedIndices.length > 0) {
                this._pathEditor.setSelectedLines(selectedIndices);
            } else {
                this._pathEditor.clearLineSelection();
            }
        };

        // Wire state → canvas re-render + PathEditor sync
        this.state.onSegmentsChange = () => {
            this.editorCanvas.renderAllSegments(this.state.segments);
            syncToPathEditor();
        };

        // Selection change: re-render canvas + sync PathEditor row highlighting.
        // Delegates to syncToPathEditor so highlight logic lives in one place.
        this.state.onSelectionChange = () => {
            this.editorCanvas.renderAllSegments(this.state.segments);
            syncToPathEditor();
        };

        /**
         * Build the row→segment-ID mapping without replacing PathEditor content.
         * Used on initial enter so that formula tokens already loaded by BitsManager
         * are preserved. Does NOT call setPath() — that would overwrite {formula}
         * tokens. Once the user makes a canvas edit, syncToPathEditor() takes over.
         */
        const _rebuildLineSegIds = () => {
            if (!this._pathEditor) return;
            const { lineSegIds } = this.state.exportPathWithMap();
            this._lineSegIds = lineSegIds;
            this._pathEditor.clearLineSelection();
        };

        // Initial render – build the row→seg mapping WITHOUT replacing PathEditor
        // content. PathEditor already holds the raw formula path loaded by
        // BitsManager; calling setPath() here would overwrite all {formula} tokens
        // with plain numeric values before the user has done anything.
        this.editorCanvas.renderAllSegments(this.state.segments);
        _rebuildLineSegIds();

        // 4. Mount toolbar
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
        });
        this.toolbar.mount();
        this.toolbar.setActiveTool("cursor");

        // 5. Switch DOM to editor layout
        this._applyEditLayout(modal, true);

        // 6. Register undo/redo keyboard shortcut
        this._registerKeyboard();

        // 7. Activate canvas mouse events for the current tool
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
            this._pathEditor.onChange   = this._origPathEditorOnChange ?? (() => {});
            this._pathEditor.onLineClick = null;
            this._pathEditor.clearLineSelection();
            this._pathEditor    = null;
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

        this.editorCanvas?.destroy();
        this.editorCanvas = null;

        this.state = null;

        // Restore keyboard
        if (this._keyHandler) {
            window.removeEventListener("keydown", this._keyHandler);
            this._keyHandler = null;
        }

        // 6. Restore DOM to preview layout
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

    // ─── Tool activation ─────────────────────────────────────────────────────

    /** @type {import("./tools/BaseTool.js").default|null} — the currently active tool instance */
    _currentTool = null;

    /** @type {string|null} — last non-cursor draw tool, for right-click repeat */
    _lastDrawToolId = null;

    /**
     * Switch to the tool with the given ID.
     * Lazily instantiates tool classes on first use.
     * @param {string} toolId
     * @private
     */
    _activateTool(toolId) {
        if (this._currentTool) {
            this._currentTool.deactivate();
            this._currentTool = null;
        }
        const tool = this._createTool(toolId);
        if (!tool) return;
        tool.activate({ state: this.state, canvas: this.editorCanvas });
        this._currentTool = tool;
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
