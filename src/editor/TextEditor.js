import PathEditor from "../panel/PathEditor.js";
import LoggerFactory from "../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("TextEditor");

/**
 * TextEditor — integrates the PathEditor (command-table text editor) into
 * the profile editor's side panel.
 *
 * Acts as a two-way bridge between:
 * - **Visual editor** (EditorCanvas / EditorStateManager) — geometric segment objects
 * - **Text editor** (PathEditor) — SVG path string with optional formula variables
 *
 * ### Sync directions
 * - **Visual → Text**: when segments change in EditorStateManager, the path is
 *   re-serialized and pushed to PathEditor via `setPath()`.
 * - **Text → Visual**: when the user edits in PathEditor, the new path string
 *   is parsed back to segments via EditorStateManager `_importPath()`.
 *
 * ### Usage
 * ```js
 * const textEditor = new TextEditor(panelContainer, state, variableValues);
 * textEditor.mount();
 * // ...sync is automatic after mount
 * textEditor.unmount();
 * ```
 */
export default class TextEditor {
    /**
     * @param {HTMLElement} container        - Element to inject the PathEditor panel into
     * @param {import("./EditorStateManager.js").default} stateManager
     * @param {Record<string, number>} [variableValues] - Current variable values for formula evaluation
     */
    constructor(container, stateManager, variableValues = {}) {
        /** @type {HTMLElement} */
        this.container = container;

        /** @type {import("./EditorStateManager.js").default} */
        this.state = stateManager;

        /** @type {Record<string, number>} */
        this.variableValues = variableValues;

        /** @type {PathEditor|null} */
        this._pathEditor = null;

        /** @type {HTMLElement|null} */
        this._wrapper = null;

        /** @type {boolean} — prevents feedback loops during sync */
        this._syncing = false;

        /** @type {Array<string|null>} — lineIndex → segId */
        this._lineSegIds = [];
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    /**
     * Create the PathEditor UI inside the container and wire up bidirectional sync.
     */
    mount() {
        if (this._wrapper) return;

        // Create wrapper + hidden inputs that PathEditor needs
        this._wrapper = document.createElement("div");
        this._wrapper.className = "text-editor-wrapper";
        this._wrapper.innerHTML = `
            <input type="hidden" id="te-path-evaluated">
            <input type="hidden" id="te-path-raw">
            <div id="te-path-editor-container"></div>
        `;
        this.container.appendChild(this._wrapper);

        const evaluatedInput  = this._wrapper.querySelector("#te-path-evaluated");
        const rawInput        = this._wrapper.querySelector("#te-path-raw");
        const editorContainer = this._wrapper.querySelector("#te-path-editor-container");

        this._pathEditor = new PathEditor({
            container: editorContainer,
            hiddenInput: evaluatedInput,
            rawHiddenInput: rawInput,
            variableValues: this.variableValues,
            onChange: (evaluatedPath) => {
                this._onTextChange(evaluatedPath);
            },
            onLineClick: (lineIndex) => {
                this._onEditorLineClick(lineIndex);
            },
        });

        // Push current state into the text editor
        this._syncFromState();

        // Listen for state changes and push to text editor
        const prevSegCallback = this.state.onSegmentsChange;
        this.state.onSegmentsChange = () => {
            prevSegCallback?.();
            if (!this._syncing) this._syncFromState();
        };

        // Listen for selection changes and highlight corresponding row
        const prevSelCallback = this.state.onSelectionChange;
        this.state.onSelectionChange = () => {
            prevSelCallback?.();
            if (!this._syncing) this._syncSelectionToTextEditor();
        };

        log.debug("TextEditor mounted");
    }

    /**
     * Remove the PathEditor UI and detach sync listeners.
     */
    unmount() {
        if (!this._wrapper) return;
        this._wrapper.remove();
        this._wrapper = null;
        this._pathEditor = null;
        log.debug("TextEditor unmounted");
    }

    // ─── Sync ───────────────────────────────────────────────────────────────

    /**
     * Update variable values used for formula evaluation in PathEditor.
     * @param {Record<string, number>} values
     */
    setVariableValues(values) {
        this.variableValues = values;
        this._pathEditor?.setVariableValues(values);
    }

    /**
     * Return the last raw path typed in the text editor (with formula variables).
     * Returns null so ProfileEditor always falls back to state.exportPath().
     * Formula preservation can be added later when needed.
     * @returns {null}
     */
    getRawPath() {
        return null;
    }

    /**
     * Visual → Text: pull current path from state and push to PathEditor.
     * Shows right half AND mirrored left half; marks mirror rows as dimmed.
     * @private
     */
    _syncFromState() {
        if (!this._pathEditor) return;
        this._syncing = true;

        const { path, lineSegIds } = this.state.exportPathWithMap();
        this._lineSegIds = lineSegIds;

        this._pathEditor.setPath(path);
        // Re-apply canvas selection to the text editor
        this._syncSelectionToTextEditor();

        this._syncing = false;
    }

    /**
     * Canvas selection → Text: highlight the row(s) that correspond to selected seg(s).
     * @private
     */
    _syncSelectionToTextEditor() {
        if (!this._pathEditor) return;
        const selectedIds = this.state.selectedIds;
        if (selectedIds.size === 0) {
            this._pathEditor.clearLineSelection();
            return;
        }
        for (let i = 0; i < this._lineSegIds.length; i++) {
            const ref = this._lineSegIds[i];
            if (!ref) continue;
            if (selectedIds.has(ref)) {
                this._pathEditor.setSelectedLine(i);
                return;
            }
        }
        this._pathEditor.clearLineSelection();
    }

    /**
     * Text row click → Canvas: select the corresponding segment in state.
     * @param {number} lineIndex
     * @private
     */
    _onEditorLineClick(lineIndex) {
        const ref = this._lineSegIds[lineIndex];
        if (!ref) return;
        const seg = this.state.segments.find(s => s.id === ref);
        if (seg) {
            this.state.setSelection(ref);
        }
    }

    /**
     * Text → Visual: parse the new path string and push to state.
     * @param {string} evaluatedPath - Evaluated path string (numbers only, no formulas)
     * @private
     */
    _onTextChange(evaluatedPath) {
        if (this._syncing) return;
        this._syncing = true;
        this.state._importPath(evaluatedPath);
        this._syncing = false;
    }}