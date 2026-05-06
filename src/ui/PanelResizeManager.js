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
    /**
     * Creates a new PanelResizeManager.
     *
     * @param {string} [cssPrefix='epl'] - CSS class prefix for styling
     */
    constructor(cssPrefix = 'epl') {
        this._cssPrefix = cssPrefix;
        this._activeResize = null;
    }

    /**
     * Initiates a panel resize operation.
     *
     * Prevents multiple simultaneous resizes and sets up event handlers for
     * resize movement and completion. Panel height is updated in real-time
     * during drag with minimum height enforcement.
     *
     * @param {Object} context - Resize context
     * @param {MouseEvent|TouchEvent} context.event - Initial mouse/touch event
     * @param {HTMLElement} context.panelEl - Panel element to resize
     * @param {Function} context.onResizeEnd - Callback when resize completes
     * @param {boolean} context.isTouch - Whether this is a touch event
     * @returns {void}
     */
    startResize(context) {
        // Prevent multiple simultaneous resizes
        if (this._activeResize) {
            return;
        }

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
        let cleanupFn = null;

        this._activeResize = { panelEl, cleanupFn: null };

        /**
         * Handles mouse/touch move events during resize.
         * Updates panel height based on vertical cursor movement.
         *
         * @private
         * @param {MouseEvent|TouchEvent} ev - Move event
         */
        const onMove = (ev) => {
            const pos = clientPos(ev);
            const delta = pos.y - startPos.y;
            const nextHeight = Math.max(minHeight, startHeight + delta);
            panelEl.style.height = `${nextHeight}px`;
            panelEl.classList.add(`${P}-resized`);
        };

        /**
         * Handles mouse/touch up events to complete resize.
         * Cleans up event listeners and triggers callback.
         *
         * @private
         */
        const onUp = () => {
            // Remove listeners
            if (cleanupFn) {
                cleanupFn();
                cleanupFn = null;
            }

            // Clear active resize
            this._activeResize = null;

            // Notify completion
            onResizeEnd?.();
        };

        cleanupFn = attachDocumentListeners({ onMove, onEnd: onUp }, isTouch);
        this._activeResize.cleanupFn = cleanupFn;
    }
}
