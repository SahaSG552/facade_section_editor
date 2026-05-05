/**
 * PanelDragManager — handles drag-and-drop for reordering panels.
 *
 * Responsibilities:
 * - Drag ghost creation and animation
 * - Drop zone detection and indicators
 * - Panel reordering logic
 * - State synchronization on drop
 *
 * @module PanelDragManager
 */

import { createClientPosGetter, attachDocumentListeners, clearDropIndicators, isValidTouchEvent } from './panel-event-helpers.js';

export class PanelDragManager {
    /**
     * Creates a new PanelDragManager.
     *
     * @param {string} [cssPrefix='epl'] - CSS class prefix for styling
     */
    constructor(cssPrefix = 'epl') {
        this._cssPrefix = cssPrefix;
        this._activeDrag = null;
    }

    /**
     * Initiates a panel drag operation.
     *
     * Prevents multiple simultaneous drags and sets up event handlers for
     * drag movement and drop. Ghost element is created only after cursor
     * moves more than 5px to distinguish between click and drag.
     *
     * @param {Object} context - Drag context
     * @param {MouseEvent|TouchEvent} context.event - Initial mouse/touch event
     * @param {HTMLElement} context.panelEl - Panel element to drag
     * @param {string} context.panelId - Unique panel identifier
     * @param {HTMLElement[]} context.columns - Column container elements [col0, col1]
     * @param {Array} context.panels - Panel entries with { id, _panelEl, col }
     * @param {Function} context.onReorder - Callback when panel is dropped
     * @param {boolean} context.isTouch - Whether this is a touch event
     * @returns {void}
     */
    startDrag(context) {
        // Prevent multiple simultaneous drags
        if (this._activeDrag) {
            return;
        }

        const {
            event: e,
            panelEl,
            panelId,
            columns,
            panels,
            onReorder,
            isTouch,
        } = context;

        if (!isValidTouchEvent(e)) return;
        if (e.cancelable) e.preventDefault();

        const clientPos = createClientPosGetter(isTouch);
        const startPos = clientPos(e);
        let dragging = false;
        let ghost = null;
        let dropInfo = null;
        let offsetX = 0;
        let offsetY = 0;
        let cleanupFn = null;
        const P = this._cssPrefix;

        this._activeDrag = { panelId, cleanupFn: null };

        /**
         * Creates and displays the ghost element for visual feedback.
         * Calculates cursor offset relative to panel top-left corner.
         *
         * @private
         */
        const startGhostDrag = () => {
            dragging = true;
            const rect = panelEl.getBoundingClientRect();
            
            // Calculate offset from cursor to panel top-left
            offsetX = startPos.x - rect.left;
            offsetY = startPos.y - rect.top;
            
            ghost = panelEl.cloneNode(true);
            ghost.className = `${P}-ghost`;
            if (panelEl.classList.contains(`${P}-collapsed`)) {
                ghost.classList.add(`${P}-collapsed`);
            }
            ghost.style.cssText = `width:${rect.width}px;height:${rect.height}px;position:fixed;left:${rect.left}px;top:${rect.top}px;z-index:9999;pointer-events:none;`;
            document.body.appendChild(ghost);
            panelEl.classList.add(`${P}-dragging`);
        };

        /**
         * Handles mouse/touch move events during drag.
         * Updates ghost position and detects drop targets.
         *
         * @private
         * @param {MouseEvent|TouchEvent} ev - Move event
         */
        const onMove = (ev) => {
            const pos = clientPos(ev);
            const moved = Math.abs(pos.x - startPos.x) + Math.abs(pos.y - startPos.y) > 5;
            
            // Start dragging only after 5px movement threshold
            if (!dragging && moved) {
                startGhostDrag();
            }
            if (!dragging || !ghost) return;

            // Update ghost position to follow cursor with offset
            ghost.style.left = `${pos.x - offsetX}px`;
            ghost.style.top = `${pos.y - offsetY}px`;
            
            // Temporarily hide ghost to detect element underneath
            ghost.style.display = 'none';
            const hit = document.elementFromPoint(pos.x, pos.y);
            ghost.style.display = '';

            clearDropIndicators(P, ['drop-before', 'drop-after', 'col-target']);
            dropInfo = null;

            const targetPanel = hit?.closest?.(`.${P}-panel`);
            const targetColEl = hit?.closest?.(`.${P}-col`);

            if (targetPanel && targetPanel !== panelEl) {
                const tr = targetPanel.getBoundingClientRect();
                const before = pos.y < tr.top + tr.height / 2;
                targetPanel.classList.add(before ? `${P}-drop-before` : `${P}-drop-after`);
                dropInfo = { panel: targetPanel, col: Number(targetColEl?.dataset?.col ?? 0), before };
            } else if (targetColEl && !targetPanel) {
                targetColEl.classList.add(`${P}-col-target`);
                dropInfo = { panel: null, col: Number(targetColEl.dataset.col ?? 0) };
            }
        };

        /**
         * Handles mouse/touch up events to complete or cancel drag.
         * Cleans up visual state and triggers reorder if valid drop target.
         *
         * @private
         */
        const onUp = () => {
            // Clean up visual state
            panelEl.classList.remove(`${P}-dragging`);
            if (ghost) {
                ghost.remove();
                ghost = null;
            }
            clearDropIndicators(P, ['drop-before', 'drop-after', 'col-target']);

            // Handle drop if dragging occurred
            if (dragging && dropInfo) {
                const entry = panels.find(p => p.id === panelId);
                if (entry) {
                    onReorder?.({
                        panelId,
                        panelEl,
                        targetPanel: dropInfo.panel,
                        targetCol: dropInfo.col,
                        insertBefore: dropInfo.before ?? false,
                    });
                }
            }

            // Reset state and remove listeners
            dragging = false;
            dropInfo = null;
            if (cleanupFn) {
                cleanupFn();
                cleanupFn = null;
            }
            
            // Clear active drag
            this._activeDrag = null;
        };

        cleanupFn = attachDocumentListeners({ onMove, onEnd: onUp }, isTouch);
        this._activeDrag.cleanupFn = cleanupFn;
    }
}
