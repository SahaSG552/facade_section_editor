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
    { id: "cursor",   label: "Select",    icon: "↖",   group: "draw", key: "Escape" },    { id: "move",     label: "Move",      icon: "✥",   group: "draw", key: "g" },    { id: "line",     label: "Line",      icon: "╱",   group: "draw", key: "l" },
    { id: "arc2pt",   label: "Arc 2pt",   icon: "⌒",   group: "draw", key: "a" },
    { id: "arc3pt",   label: "Arc 3pt",   icon: "⌓",   group: "draw" },
    { id: "circle2pt",label: "Circle 2pt",icon: "○",   group: "draw", key: "c" },
    { id: "circle3pt",label: "Circle 3pt",icon: "◎",   group: "draw" },
    { id: "rect2pt",  label: "Rect 2pt",  icon: "▭",   group: "draw", key: "r" },
    { id: "rect3pt",  label: "Rect 3pt",  icon: "▬",   group: "draw" },
    // Edit tools
    { id: "fillet",   label: "Fillet",    icon: "⌔",   group: "edit", key: "f" },
    { id: "chamfer",  label: "Chamfer",   icon: "⌐",   group: "edit" },
    { id: "trim",     label: "Trim",      icon: "✂",   group: "edit", key: "t" },
    { id: "extend",   label: "Extend",    icon: "↔",   group: "edit" },
    { id: "offset",   label: "Offset",    icon: "⊙",   group: "edit", key: "o" },
    { id: "mirror",   label: "Mirror",    icon: "⊳",   group: "edit", key: "m" },
    { id: "join",     label: "Join",      icon: "⊕",   group: "edit", key: "j" },
    { id: "explode",  label: "Explode",   icon: "⊗",   group: "edit" },
    { id: "close",    label: "Close",     icon: "⬡",   group: "edit" },
    { id: "bool",     label: "Boolean",   icon: "⊔",   group: "edit" },
    { id: "aux",      label: "Aux Line",  icon: "⋯",   group: "edit" },
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
     */
    constructor(container, { onToolChange, onDone, onCancel, onSnapChange } = {}) {
        /** @type {HTMLElement} */
        this.container = container;

        this.onToolChange = onToolChange;
        this.onDone       = onDone;
        this.onCancel     = onCancel;
        this.onSnapChange = onSnapChange;

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
        this._buttons.forEach((btn, id) => {
            btn.classList.toggle("active", id === toolId);
            btn.setAttribute("aria-pressed", id === toolId ? "true" : "false");
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
                <button class="editor-snap-btn${_saved.snaps.grid  ? " active" : ""}" data-snap="grid"  title="Snap to grid (S)">Grid</button>
                <button class="editor-snap-btn${_saved.snaps.ortho ? " active" : ""}" data-snap="ortho" title="Ortho snap (O)">Ortho</button>
                <button class="editor-snap-btn${_saved.snaps.obj   ? " active" : ""}" data-snap="obj"   title="Object snap">Obj</button>
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
            this._buttons.set(toolId, btn);
            btn.addEventListener("click", () => {
                if (this.onToolChange) this.onToolChange(toolId);
            });
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

        const doneBtn = this._toolbar.querySelector("#editor-done-btn");
        const cancelBtn = this._toolbar.querySelector("#editor-cancel-btn");
        if (doneBtn)   doneBtn.addEventListener("click", () => this.onDone?.());
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
            if (def && this.onToolChange) this.onToolChange(def.id);
        };
        window.addEventListener("keydown", this._keyHandler);
    }
}
