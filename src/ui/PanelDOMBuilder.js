/**
 * PanelDOMBuilder — constructs panel DOM structure.
 *
 * Handles creation of:
 * - Panel container
 * - Header with drag handle, title, chevron
 * - Body content wrapper
 * - Resize handle
 *
 * @module PanelDOMBuilder
 */

import { bindTouchAndMouseEvent } from './panel-event-helpers.js';

export class PanelDOMBuilder {
    constructor(cssPrefix = 'epl') {
        this._cssPrefix = cssPrefix;
    }

    /**
     * Builds complete panel DOM structure.
     *
     * @param {Object} config - Panel configuration
     *   - id: string, unique panel ID
     *   - title: string, display title
     *   - contentEl: HTMLElement, content to wrap
     *   - collapsed: boolean, initial collapsed state
     *   - resizable: boolean, show resize handle
     *   - onDragStart: Function(e, isTouch), drag handler
     *   - onResizeStart: Function(e, isTouch), resize handler
     *   - onHeaderClick: Function(e), header click handler
     * @returns {HTMLElement} Complete panel element
     */
    buildPanel(config) {
        const {
            id,
            title,
            contentEl,
            collapsed,
            resizable,
            onDragStart,
            onResizeStart,
            onHeaderClick,
        } = config;

        const P = this._cssPrefix;
        const panel = document.createElement('div');
        panel.className = `${P}-panel`;
        panel.dataset.panelId = id;
        if (collapsed) panel.classList.add(`${P}-collapsed`);

        // Header section
        const header = this._buildHeader(P, title, onDragStart, onHeaderClick);
        panel.appendChild(header);

        // Body section
        const body = this._buildBody(P, contentEl);
        panel.appendChild(body);

        // Optional resize handle
        if (resizable) {
            const resizeHandle = this._buildResizeHandle(P, onResizeStart);
            panel.appendChild(resizeHandle);
        }

        return panel;
    }

    /**
     * Builds panel header with drag handle, title, chevron.
     *
     * @private
     * @param {string} P - CSS prefix
     * @param {string} title - Panel title text
     * @param {Function} onDragStart - Drag handler
     * @param {Function} onHeaderClick - Header click handler
     * @returns {HTMLElement}
     */
    _buildHeader(P, title, onDragStart, onHeaderClick) {
        const header = document.createElement('div');
        header.className = `${P}-panel-header`;

        // Drag handle
        const dragHandle = document.createElement('span');
        dragHandle.className = `${P}-panel-drag-handle`;
        dragHandle.setAttribute('aria-hidden', 'true');
        dragHandle.title = 'Drag to reorder';
        dragHandle.textContent = '\u283f';  // ⁇ (handle symbol)

        if (onDragStart) {
            bindTouchAndMouseEvent(dragHandle, 'mousedown', 'touchstart', onDragStart);
        }

        // Title
        const titleSpan = document.createElement('span');
        titleSpan.className = `${P}-panel-title`;
        titleSpan.textContent = title;

        // Chevron
        const chevron = document.createElement('span');
        chevron.className = `${P}-panel-chevron`;
        chevron.setAttribute('aria-hidden', 'true');
        chevron.textContent = '\u25be';  // ▾ (down chevron)

        header.appendChild(dragHandle);
        header.appendChild(titleSpan);
        header.appendChild(chevron);

        // Header click listener for collapse/expand
        if (onHeaderClick) {
            header.addEventListener('click', (e) => {
                if (e.target === dragHandle) return;
                onHeaderClick(e);
            });
        }

        return header;
    }

    /**
     * Builds panel body content wrapper.
     *
     * @private
     * @param {string} P - CSS prefix
     * @param {HTMLElement} contentEl - Content element
     * @returns {HTMLElement}
     */
    _buildBody(P, contentEl) {
        const body = document.createElement('div');
        body.className = `${P}-panel-body`;
        body.appendChild(contentEl);
        return body;
    }

    /**
     * Builds bottom resize handle.
     *
     * @private
     * @param {string} P - CSS prefix
     * @param {Function} onResizeStart - Resize handler
     * @returns {HTMLElement}
     */
    _buildResizeHandle(P, onResizeStart) {
        const handle = document.createElement('div');
        handle.className = `${P}-resize-handle`;
        handle.title = 'Drag to resize';

        if (onResizeStart) {
            bindTouchAndMouseEvent(handle, 'mousedown', 'touchstart', onResizeStart);
        }

        return handle;
    }
}
