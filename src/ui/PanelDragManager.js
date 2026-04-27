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
    constructor(cssPrefix = 'epl') {
        this._cssPrefix = cssPrefix;
    }

    /**
     * Initiates a panel drag operation.
     *
     * @param {Object} context - Drag context
     *   - event: MouseEvent|TouchEvent
     *   - panelEl: HTMLElement to drag
     *   - panelId: string, unique panel identifier
     *   - columns: [HTMLElement, HTMLElement], column containers
     *   - panels: Array, panel entries { id, _panelEl, col }
     *   - onReorder: Function(panelId, targetPanel, targetCol, insertBefore)
     *   - isTouch: boolean
     * @returns {void}
     */
    startDrag(context) {
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
        const P = this._cssPrefix;

        const startGhostDrag = (pos) => {
            dragging = true;
            const rect = panelEl.getBoundingClientRect();
            ghost = panelEl.cloneNode(true);
            ghost.className = `${P}-ghost`;
            if (panelEl.classList.contains(`${P}-collapsed`)) {
                ghost.classList.add(`${P}-collapsed`);
            }
            ghost.style.cssText = `width:${rect.width}px;height:${rect.height}px;position:fixed;left:${rect.left}px;top:${rect.top}px;z-index:9999;pointer-events:none;`;
            document.body.appendChild(ghost);
            panelEl.classList.add(`${P}-dragging`);
        };

        const onMove = (ev) => {
            const pos = clientPos(ev);
            const moved = Math.abs(pos.x - startPos.x) + Math.abs(pos.y - startPos.y) > 5;
            if (!dragging && moved) startGhostDrag(pos);
            if (!dragging || !ghost) return;

            ghost.style.left = `${pos.x - (pos.x - startPos.x)}px`;
            ghost.style.top = `${pos.y - (pos.y - startPos.y)}px`;
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

        const onUp = () => {
            panelEl.classList.remove(`${P}-dragging`);
            ghost?.remove();
            clearDropIndicators(P, ['drop-before', 'drop-after', 'col-target']);
            cleanup();

            if (!dragging || !dropInfo) return;

            const entry = panels.find(p => p.id === panelId);
            if (!entry) return;

            onReorder?.({
                panelId,
                panelEl,
                targetPanel: dropInfo.panel,
                targetCol: dropInfo.col,
                insertBefore: dropInfo.before ?? false,
            });
        };

        const cleanup = attachDocumentListeners({ onMove, onUp }, isTouch);
    }
}
