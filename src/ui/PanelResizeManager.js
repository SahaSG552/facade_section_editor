/**
 * PanelResizeManager — handles panel height resizing.
 *
 * Responsibilities:
 * - Track resize drag start/movement
 * - Calculate new height with minimum bounds
 * - Apply height to panel with proper CSS class
 * - State synchronization on resize end
 *
 * @module PanelResizeManager
 */

import { createClientPosGetter, attachDocumentListeners, isValidTouchEvent } from './panel-event-helpers.js';

export class PanelResizeManager {
    constructor(cssPrefix = 'epl') {
        this._cssPrefix = cssPrefix;
    }

    /**
     * Initiates a panel resize operation.
     *
     * @param {Object} context - Resize context
     *   - event: MouseEvent|TouchEvent
     *   - panelEl: HTMLElement to resize
     *   - onResizeEnd: Function() called when resize completes
     *   - isTouch: boolean
     * @returns {void}
     */
    startResize(context) {
        const { event: e, panelEl, onResizeEnd, isTouch } = context;

        if (!isValidTouchEvent(e)) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        const P = this._cssPrefix;
        const clientPos = createClientPosGetter(isTouch);
        const startPos = clientPos(e);
        const startHeight = panelEl.getBoundingClientRect().height;
        const headerEl = panelEl.querySelector(`.${P}-panel-header`);
        const minHeight = Math.max(56, Number(headerEl?.offsetHeight ?? 28) + 36);

        const onMove = (ev) => {
            const pos = clientPos(ev);
            const delta = pos.y - startPos.y;
            const nextHeight = Math.max(minHeight, startHeight + delta);
            panelEl.style.height = `${nextHeight}px`;
            panelEl.classList.add(`${P}-resized`);
        };

        const onUp = () => {
            cleanup();
            onResizeEnd?.();
        };

        const cleanup = attachDocumentListeners({ onMove, onUp }, isTouch);
    }
}
