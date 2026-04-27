/**
 * EditorPanelLayout — unified draggable / collapsible panel layout system.
 *
 * Provides a two-column responsive layout with draggable, collapsible, and resizable panels.
 * Automatically switches between two-column (wide) and single-column (narrow) layouts based
 * on container width. Supports localStorage persistence for order and collapsed state.
 *
 * Features:
 *  - Two columns on wide screens (≥620px), single column on narrow (responsive via ResizeObserver)
 *  - Drag panels by handle to reorder within / between columns
 *  - Click header (title/chevron) to collapse / expand
 *  - Optional bottom resize handle with minimum height enforcement
 *  - Persistent state: panel order, position, and collapsed state (height is session-only)
 *  - Touch and mouse event support
 *
 * Architecture:
 *  - Uses composition: delegates drag/resize to separate manager classes
 *  - DOM building delegated to PanelDOMBuilder
 *  - Event handling via helper utilities
 *  - State management: localStorage + in-memory panel registry
 *
 * Usage Example:
 *   const layout = new EditorPanelLayout(containerEl, { storageKey: 'editor-layout-v1' });
 *   layout.addPanel({
 *     id: 'variables',
 *     title: 'Variables',
 *     el: varsPanelEl,
 *     resizable: true,
 *   });
 *   layout.loadState();  // Restore from localStorage
 *
 * @module EditorPanelLayout
 * @class
 */

import { PanelDragManager } from './PanelDragManager.js';
import { PanelResizeManager } from './PanelResizeManager.js';
import { PanelDOMBuilder } from './PanelDOMBuilder.js';

const CSS_PREFIX = 'epl';  // CSS class namespace

export class EditorPanelLayout {
    /**
     * Creates a new EditorPanelLayout.
     *
     * @param {HTMLElement} container - DOM container to populate with layout
     * @param {Object} opts - Configuration options
     *   @param {string} [opts.storageKey] - localStorage key for persisting state. If not provided, state is not persisted.
     *   @param {number} [opts.breakpoint=620] - Pixel width at which layout switches between wide and narrow
     */
    constructor(container, opts = {}) {
        this._container = container;
        this._storageKey = opts.storageKey ?? null;
        this._breakpoint = opts.breakpoint ?? 620;
        this._panels = [];
        this._colEls = [null, null];
        this._ro = null;

        this._dragManager = new PanelDragManager(CSS_PREFIX);
        this._resizeManager = new PanelResizeManager(CSS_PREFIX);
        this._domBuilder = new PanelDOMBuilder(CSS_PREFIX);

        this._initDOM();
    }

    /**
     * Initializes the layout DOM structure.
     * Creates two-column grid and attaches ResizeObserver for responsive behavior.
     * @private
     */
    _initDOM() {
        const c = this._container;
        c.classList.add(`${CSS_PREFIX}-layout`);
        for (let i = 0; i < 2; i++) {
            const col = document.createElement('div');
            col.className = `${CSS_PREFIX}-col`;
            col.dataset.col = String(i);
            c.appendChild(col);
            this._colEls[i] = col;
        }
        if (typeof ResizeObserver !== 'undefined') {
            this._ro = new ResizeObserver(() => this._updateWidthClass());
            this._ro.observe(c);
        }
        this._updateWidthClass();
    }

    /**
     * Updates width-based layout class (wide vs narrow) based on container width.
     * Called on initialization and on container resize.
     * @private
     */
    _updateWidthClass() {
        const wide = this._container.offsetWidth >= this._breakpoint;
        this._container.classList.toggle(`${CSS_PREFIX}-wide`, wide);
        this._container.classList.toggle(`${CSS_PREFIX}-narrow`, !wide);
    }

    /**
     * Adds a new panel to the layout.
     *
     * @param {Object} config - Panel configuration
     *   @param {string} config.id - Unique panel identifier
     *   @param {string} config.title - Display title shown in header
     *   @param {HTMLElement} config.el - Content element to wrap in panel
     *   @param {number} [config.col=0] - Initial column (0 or 1); clamped to valid range
     *   @param {boolean} [config.collapsed=false] - Initial collapsed state
     *   @param {boolean} [config.resizable=false] - Show bottom resize handle
     *
     * @throws Does nothing if panel with same id already exists
     */
    addPanel({ id, title, el, col = 0, collapsed = false, resizable = false }) {
        if (this._panels.find(p => p.id === id)) return;

        const panelEl = this._domBuilder.buildPanel({
            id,
            title,
            contentEl: el,
            collapsed,
            resizable,
            onDragStart: (e, isTouch) => this._dragManager.startDrag({
                event: e,
                panelEl,
                panelId: id,
                columns: this._colEls,
                panels: this._panels,
                onReorder: this._handlePanelReorder.bind(this),
                isTouch,
            }),
            onResizeStart: (e, isTouch) => this._resizeManager.startResize({
                event: e,
                panelEl,
                onResizeEnd: () => this._saveState(),
                isTouch,
            }),
            onHeaderClick: () => {
                this._toggleCollapse(panelEl);
                this._saveState();
            },
        });

        const targetCol = Math.min(1, Math.max(0, col ?? 0));
        this._colEls[targetCol].appendChild(panelEl);

        const entry = { id, title, el, col: targetCol, resizable, _panelEl: panelEl };
        this._panels.push(entry);
    }

    /**
     * Shows or hides a panel by ID.
     *
     * @param {string} id - Panel ID
     * @param {boolean} visible - Show (true) or hide (false)
     */
    setPanelVisible(id, visible) {
        const entry = this._panels.find(p => p.id === id);
        if (!entry) return;
        entry._panelEl.style.display = visible ? '' : 'none';
    }

    /**
     * Sets the collapsed state of a panel.
     *
     * @param {string} id - Panel ID
     * @param {boolean} collapsed - Collapse (true) or expand (false)
     */
    setCollapsed(id, collapsed) {
        const entry = this._panels.find(p => p.id === id);
        if (!entry) return;
        const panelEl = entry._panelEl;
        const isAlreadyCollapsed = panelEl.classList.contains(`${CSS_PREFIX}-collapsed`);
        if (collapsed === isAlreadyCollapsed) return;
        this._toggleCollapse(panelEl);
    }

    /**
     * Restores layout state from localStorage.
     * Reconstructs panel order, positions, and collapsed state.
     * Must be called AFTER all panels are added via addPanel().
     * Height is NOT restored (panels auto-size to content).
     *
     * @returns {void}
     */
    loadState() {
        if (!this._storageKey) return;
        let state;
        try {
            const raw = localStorage.getItem(this._storageKey);
            if (!raw) return;
            state = JSON.parse(raw);
        } catch (_) {
            return;
        }

        if (!Array.isArray(state?.panels)) return;

        const byCol = [[], []];
        for (const sp of state.panels) {
            const entry = this._panels.find(p => p.id === sp.id);
            if (!entry) continue;
            entry.col = Math.min(1, Math.max(0, sp.col ?? 0));
            entry._panelEl.classList.toggle(`${CSS_PREFIX}-collapsed`, !!sp.collapsed);
            byCol[entry.col].push({ entry, order: sp.order ?? 0 });
        }

        // Reorder panels in their target columns
        for (let c = 0; c < 2; c++) {
            byCol[c].sort((a, b) => a.order - b.order);
            for (const { entry } of byCol[c]) {
                this._colEls[c].appendChild(entry._panelEl);
            }
        }
    }

    /**
     * Cleans up layout resources (ResizeObserver).
     * Call when layout is destroyed to prevent memory leaks.
     */
    destroy() {
        this._ro?.disconnect();
    }

    /**
     * Toggles panel collapsed state.
     *
     * @private
     * @param {HTMLElement} panelEl - Panel element
     */
    _toggleCollapse(panelEl) {
        const isCollapsed = panelEl.classList.contains(`${CSS_PREFIX}-collapsed`);
        if (!isCollapsed) {
            // Expanding: clear any resize height
            if (panelEl.style.height) {
                panelEl.style.height = '';
                panelEl.classList.remove(`${CSS_PREFIX}-resized`);
            }
            panelEl.classList.add(`${CSS_PREFIX}-collapsed`);
        } else {
            // Expanding
            panelEl.classList.remove(`${CSS_PREFIX}-collapsed`);
        }
    }

    /**
     * Handles panel reorder after successful drop.
     *
     * @private
     * @param {Object} reorderInfo - Info from drag operation
     *   @param {string} reorderInfo.panelId - ID of dragged panel
     *   @param {HTMLElement} reorderInfo.panelEl - Panel DOM element
     *   @param {HTMLElement | null} reorderInfo.targetPanel - Target panel (or null for column)
     *   @param {number} reorderInfo.targetCol - Target column index
     *   @param {boolean} reorderInfo.insertBefore - Insert before target panel
     */
    _handlePanelReorder(reorderInfo) {
        const { panelId, panelEl, targetPanel, targetCol, insertBefore } = reorderInfo;
        const entry = this._panels.find(p => p.id === panelId);
        if (!entry) return;

        const colEl = this._colEls[targetCol] ?? this._colEls[0];

        if (targetPanel) {
            const targetEntry = this._panels.find(p => p._panelEl === targetPanel);
            if (!targetEntry || targetEntry.id === panelId) return;
            if (insertBefore) {
                colEl.insertBefore(panelEl, targetPanel);
            } else {
                targetPanel.after(panelEl);
            }
        } else {
            colEl.appendChild(panelEl);
        }

        entry.col = targetCol;
        this._saveState();
    }

    /**
     * Persists layout state to localStorage.
     * Saves: panel order, column position, and collapsed state.
     *
     * @private
     */
    _saveState() {
        if (!this._storageKey) return;
        const state = {
            panels: this._panels.map(entry => {
                const colEl = this._colEls[entry.col];
                const order = colEl ? Array.from(colEl.children).indexOf(entry._panelEl) : 0;
                const isCollapsed = entry._panelEl.classList.contains(`${CSS_PREFIX}-collapsed`);
                return { id: entry.id, col: entry.col, collapsed: isCollapsed, order };
            }),
        };
        try {
            localStorage.setItem(this._storageKey, JSON.stringify(state));
        } catch (_) {
            // Silently ignore localStorage errors (quota exceeded, etc.)
        }
    }
}
