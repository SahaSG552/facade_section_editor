import LoggerFactory from "../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("EditorToolbar");

/**
 * Module-level persistence: snap states + last active tool survive across
 * editor open/close cycles for the lifetime of the page.
 * @type {{ activeTool: string, snaps: Record<string, boolean> }}
 */
const _saved = {
    activeTool: "cursor",
    snaps: { grid: true, ortho: true, obj: false },
    gridSize: 1,
};

/**
 * @typedef {object} ToolDefinition
 * @property {string}   id       - Tool identifier matching EditorStateManager tool names
 * @property {string}   label    - Display label / tooltip text
 * @property {string}   icon     - SVG icon markup or Unicode glyph
 * @property {string}   group    - "draw" | "edit"
 * @property {string}   [key]    - Optional keyboard shortcut (single key)
 */

/** @type {ToolDefinition[]} */
const TOOL_DEFINITIONS = [
    // Draw tools
    { id: "cursor", label: "Select", icon: "↖", group: "draw", key: "s" },
    { id: "move", label: "Move", icon: "✥", group: "draw", key: "m" },
    { id: "line", label: "Line", icon: "╱", group: "draw", key: "l" },
    { id: "arc", label: "Arc (3pt + R)", icon: "⌒", group: "draw", key: "a", lmbTool: "arc3pt" },
    { id: "circle", label: "Circle (LMB: 2pt · RMB: 3pt)", icon: "○", group: "draw", key: "c", lmbTool: "circle2pt", rmbTool: "circle3pt" },
    { id: "rect", label: "Rect (LMB: 2pt · RMB: 3pt)", icon: "▭", group: "draw", key: "r", lmbTool: "rect2pt", rmbTool: "rect3pt" },
    { id: "ellipse", label: "Ellipse (LMB: 2pt · RMB: 3pt)", icon: "⬭", group: "draw", key: "e", lmbTool: "ellipse2pt", rmbTool: "ellipse3pt" },
    // Edit tools
    { id: "fillet", label: "Fillet", icon: "⌔", group: "edit", key: "f" },
    { id: "chamfer", label: "Chamfer", icon: "⌐", group: "edit" },
    { id: "trim", label: "Trim", icon: "✂", group: "edit", key: "t" },
    { id: "extend", label: "Extend", icon: "↔", group: "edit" },
    { id: "offset", label: "Offset", icon: "⊙", group: "edit", key: "o" },
    { id: "mirror", label: "Mirror", icon: "⊳", group: "edit" },
    { id: "join", label: "Join", icon: "⊕", group: "edit", key: "j" },
    { id: "explode", label: "Explode", icon: "⊗", group: "edit" },
    { id: "close", label: "Close", icon: "⬡", group: "edit" },
    { id: "bool", label: "Boolean", icon: "⊔", group: "edit" },
    { id: "aux", label: "Aux Line", icon: "⋯", group: "edit" },
];

/**
 * EditorToolbar — builds and manages the editor tool palette.
 *
 * Injects a `#editor-toolbar` element into a given container and provides:
 * - Tool buttons grouped into draw/edit sections
 * - Keyboard shortcut registration
 * - Visual active-state on the current tool
 * - Optional snap toggle controls
 *
 * ### Usage
 * ```js
 * const toolbar = new EditorToolbar(container, {
 *   onToolChange: (toolId) => stateManager.setTool(toolId),
 *   onDone:   () => profileEditor.exit(true),
 *   onCancel: () => profileEditor.exit(false),
 * });
 * toolbar.mount();
 * toolbar.setActiveTool("cursor");
 * ```
 */
export default class EditorToolbar {
    /**
     * @param {HTMLElement} container - The element to inject the toolbar into
     * @param {object} callbacks
     * @param {(toolId: string) => void} callbacks.onToolChange
     * @param {() => void} callbacks.onDone
     * @param {() => void} callbacks.onCancel
     * @param {(type: string, active: boolean) => void} [callbacks.onSnapChange]
     * @param {(size: number) => void} [callbacks.onGridSizeChange]
     */
    constructor(container, { onToolChange, onDone, onCancel, onSnapChange, onGridSizeChange } = {}) {
        /** @type {HTMLElement} */
        this.container = container;

        this.onToolChange = onToolChange;
        this.onDone = onDone;
        this.onCancel = onCancel;
        this.onSnapChange = onSnapChange;
        this.onGridSizeChange = onGridSizeChange;

        /** @type {HTMLElement|null} */
        this._toolbar = null;

        /** @type {string} */
        this._activeTool = "cursor";

        /** @type {Map<string, HTMLButtonElement>} tool-id → button element */
        this._buttons = new Map();

        /** @type {((e: KeyboardEvent) => void)|null} */
        this._keyHandler = null;
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    /**
     * Build the toolbar DOM and mount it into the container.
     * Registers keyboard shortcuts on `window`.
     */
    mount() {
        if (this._toolbar) return;

        this._toolbar = document.createElement("div");
        this._toolbar.id = "editor-toolbar";
        this._toolbar.innerHTML = this._buildHTML();
        // Suppress the browser's native context menu over the whole toolbar so
        // right-click on tool buttons activates the secondary tool cleanly.
        this._toolbar.addEventListener("contextmenu", (e) => e.preventDefault());
        // Insert directly after the SVG canvas so toolbar sits BELOW it;
        // fall back to append if no SVG found.
        const svgEl = this.container.querySelector("svg");
        if (svgEl) {
            svgEl.after(this._toolbar);
        } else {
            this.container.append(this._toolbar);
        }

        this._bindButtons();
        this._registerKeyboard();

        // Restore last active tool
        if (_saved.activeTool && _saved.activeTool !== "cursor") {
            // Delay one tick so ProfileEditor can wire events first
            Promise.resolve().then(() => {
                this.setActiveTool(_saved.activeTool);
                this.onToolChange?.(_saved.activeTool);
            });
        }

        log.debug("EditorToolbar mounted");
    }

    /**
     * Remove the toolbar from the DOM and unregister keyboard shortcuts.
     */
    unmount() {
        if (!this._toolbar) return;
        this._toolbar.remove();
        this._toolbar = null;
        this._buttons.clear();
        if (this._keyHandler) {
            window.removeEventListener("keydown", this._keyHandler);
            this._keyHandler = null;
        }
        log.debug("EditorToolbar unmounted");
    }

    // ─── Active state ────────────────────────────────────────────────────────

    /**
     * Update the visual active state of tool buttons.
     * @param {string} toolId
     */
    setActiveTool(toolId) {
        // A dual-mode button is registered under TWO ids (lmbTool + rmbTool) but
        // is a single DOM element.  Collect the target button first, then update
        // each UNIQUE button element exactly once to avoid toggle conflicts.
        const activeBtn = this._buttons.get(toolId);

        // Determine if the active tool is the secondary (RMB) variant of a dual-mode button.
        const isSecondary = TOOL_DEFINITIONS.some(d => d.rmbTool === toolId);

        const seen = new Set();
        this._buttons.forEach((btn) => {
            if (seen.has(btn)) return;
            seen.add(btn);
            const isActive = btn === activeBtn;
            btn.classList.toggle("active", isActive);
            btn.classList.toggle("active-rmb", isActive && isSecondary);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        this._activeTool = toolId;
        _saved.activeTool = toolId; // persist
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    /** @returns {string} */
    _buildHTML() {
        const drawButtons = TOOL_DEFINITIONS
            .filter(t => t.group === "draw")
            .map(t => this._buttonHTML(t))
            .join("");
        const editButtons = TOOL_DEFINITIONS
            .filter(t => t.group === "edit")
            .map(t => this._buttonHTML(t))
            .join("");

        return `
            <div class="editor-toolbar-section editor-tools-draw">
                ${drawButtons}
            </div>
            <div class="editor-toolbar-separator"></div>
            <div class="editor-toolbar-section editor-tools-edit">
                ${editButtons}
            </div>
            <div class="editor-toolbar-separator"></div>
            <div class="editor-toolbar-section editor-snap-controls">
                <button class="editor-snap-btn${_saved.snaps.grid ? " active" : ""}" data-snap="grid"  title="Snap to grid">Grid</button>
                <select class="editor-grid-select" title="Grid scale">
                    <option value="10"${_saved.gridSize === 10 ? " selected" : ""}>10</option>
                    <option value="5"${_saved.gridSize === 5 ? " selected" : ""}>5</option>
                    <option value="1"${_saved.gridSize === 1 ? " selected" : ""}> 1</option>
                    <option value="0.5"${_saved.gridSize === 0.5 ? " selected" : ""}>0.5</option>
                    <option value="0.1"${_saved.gridSize === 0.1 ? " selected" : ""}>0.1</option>
                    <option value="0.01"${_saved.gridSize === 0.01 ? " selected" : ""}>0.01</option>
                </select>
                <button class="editor-snap-btn${_saved.snaps.ortho ? " active" : ""}" data-snap="ortho" title="Ortho snap (O)">Ortho</button>
                <button class="editor-snap-btn${_saved.snaps.obj ? " active" : ""}" data-snap="obj"   title="Object snap">Obj</button>
            </div>
            <div class="editor-toolbar-spacer"></div>
            <div class="editor-toolbar-section editor-actions">
                <button class="editor-action-btn" id="editor-cancel-btn" title="Discard changes (Esc)">Cancel</button>
                <button class="editor-action-btn editor-action-primary" id="editor-done-btn" title="Accept changes (Enter)">Done</button>
            </div>
        `;
    }

    /**
     * @param {ToolDefinition} t
     * @returns {string}
     */
    _buttonHTML(t) {
        const shortcut = t.key ? ` [${t.key}]` : "";
        return `<button
            class="editor-tool-btn"
            data-tool="${t.id}"
            title="${t.label}${shortcut}"
            aria-pressed="false"
        >${t.icon}</button>`;
    }

    _bindButtons() {
        if (!this._toolbar) return;

        this._toolbar.querySelectorAll("[data-tool]").forEach(btn => {
            const toolId = btn.dataset.tool;
            const def = TOOL_DEFINITIONS.find(t => t.id === toolId);

            if (def?.lmbTool) {
                // Button has an explicit lmbTool (and optionally rmbTool).
                // Register under lmbTool (and rmbTool if present) so setActiveTool()
                // highlights this button for either active tool.
                this._buttons.set(def.lmbTool, btn);
                btn.addEventListener("click", () => this.onToolChange?.(def.lmbTool));
                if (def.rmbTool) {
                    this._buttons.set(def.rmbTool, btn);
                    btn.addEventListener("contextmenu", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.onToolChange?.(def.rmbTool);
                    });
                }
            } else {
                this._buttons.set(toolId, btn);
                btn.addEventListener("click", () => {
                    if (this.onToolChange) this.onToolChange(toolId);
                });
            }
        });

        this._toolbar.querySelectorAll("[data-snap]").forEach(btn => {
            // Apply saved initial state to SnapManager via callback
            const snapType = btn.dataset.snap;
            if (this.onSnapChange) this.onSnapChange(snapType, _saved.snaps[snapType] ?? false);

            btn.addEventListener("click", () => {
                btn.classList.toggle("active");
                const isActive = btn.classList.contains("active");
                _saved.snaps[snapType] = isActive; // persist
                if (this.onSnapChange) this.onSnapChange(snapType, isActive);
            });
        });

        // Grid scale select
        const gridSelect = this._toolbar.querySelector(".editor-grid-select");
        if (gridSelect) {
            // Fire the initial gridSize to SnapManager so it matches the persisted value.
            this.onGridSizeChange?.(_saved.gridSize);
            gridSelect.addEventListener("change", () => {
                const size = parseFloat(gridSelect.value);
                _saved.gridSize = size;
                this.onGridSizeChange?.(size);
            });
        }

        const doneBtn = this._toolbar.querySelector("#editor-done-btn");
        const cancelBtn = this._toolbar.querySelector("#editor-cancel-btn");
        if (doneBtn) doneBtn.addEventListener("click", () => this.onDone?.());
        if (cancelBtn) cancelBtn.addEventListener("click", () => this.onCancel?.());
    }

    _registerKeyboard() {
        this._keyHandler = (e) => {
            // Don't intercept events in input fields
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

            if (e.key === "Enter") { this.onDone?.(); return; }
            if (e.key === "Escape" && this._activeTool !== "cursor") {
                if (this.onToolChange) this.onToolChange("cursor");
                return;
            }
            if (e.key === "z" && (e.ctrlKey || e.metaKey)) { /* handled by ProfileEditor */ return; }

            const def = TOOL_DEFINITIONS.find(t => t.key === e.key && !e.ctrlKey && !e.metaKey);
            if (def && this.onToolChange) {
                // For dual-mode buttons the keyboard shortcut fires the LMB (primary) tool.
                this.onToolChange(def.lmbTool ?? def.id);
            }
        };
        window.addEventListener("keydown", this._keyHandler);
    }
}
