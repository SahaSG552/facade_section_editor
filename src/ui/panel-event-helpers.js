/**
 * Panel Event Helpers — utilities for managing panel interactions.
 * Provides factories and helpers for drag, resize, and event binding.
 *
 * @module panel-event-helpers
 */

/**
 * Creates a normalized client position getter for mouse/touch events.
 * Handles both mouse and touch input consistently.
 *
 * @param {boolean} isTouch - Whether this is a touch event
 * @returns {(ev: Event) => {x: number, y: number}} Position getter function
 */
export function createClientPosGetter(isTouch) {
    return (ev) => isTouch
        ? {
            x: ev.touches?.[0]?.clientX ?? ev.changedTouches?.[0]?.clientX ?? 0,
            y: ev.touches?.[0]?.clientY ?? ev.changedTouches?.[0]?.clientY ?? 0,
        }
        : { x: ev.clientX, y: ev.clientY };
}

/**
 * Binds an event handler to both mouse and touch events.
 * Handles passive listener hints automatically.
 *
 * @param {HTMLElement} element - DOM element to bind to
 * @param {string} mouseEvent - Mouse event name (e.g., 'mousedown')
 * @param {string} touchEvent - Touch event name (e.g., 'touchstart')
 * @param {Function} handler - Event handler function
 * @param {Object} options - Options { isPassive?: boolean }
 */
export function bindTouchAndMouseEvent(element, mouseEvent, touchEvent, handler, options = {}) {
    const { isPassive = false } = options;
    element.addEventListener(mouseEvent, (e) => handler(e, false));
    element.addEventListener(touchEvent, (e) => handler(e, true), { passive: isPassive });
}

/**
 * Attaches document-level event listeners for drag/resize operations.
 * Returns a cleanup function.
 *
 * @param {Object} handlers - { onMove: Function, onEnd: Function }
 * @param {boolean} isTouch - Whether this is a touch operation
 * @returns {() => void} Cleanup function to remove listeners
 */
export function attachDocumentListeners(handlers, isTouch) {
    const { onMove, onEnd } = handlers;
    const moveEvent = isTouch ? 'touchmove' : 'mousemove';
    const endEvent = isTouch ? 'touchend' : 'mouseup';
    const moveOpts = isTouch ? { passive: false } : undefined;

    document.addEventListener(moveEvent, onMove, moveOpts);
    document.addEventListener(endEvent, onEnd);

    return () => {
        document.removeEventListener(moveEvent, onMove, moveOpts);
        document.removeEventListener(endEvent, onEnd);
    };
}

/**
 * Clears CSS classes indicating drop targets.
 *
 * @param {string} cssPrefix - CSS class prefix (e.g., 'epl')
 * @param {string[]} classNames - Class names to clear (e.g., ['drop-before', 'drop-after'])
 */
export function clearDropIndicators(cssPrefix, classNames = []) {
    const selectors = classNames.map(cn => `.${cssPrefix}-${cn}`).join(', ');
    if (!selectors) return;
    document.querySelectorAll(selectors).forEach(el => {
        classNames.forEach(cn => el.classList.remove(`${cssPrefix}-${cn}`));
    });
}

/**
 * Validates touch event for single-touch operations.
 * Returns true if valid (1 touch) or not a touch event.
 *
 * @param {Event} e - Event to validate
 * @returns {boolean}
 */
export function isValidTouchEvent(e) {
    if (!e.touches) return true;  // Not a touch event
    return e.touches.length === 1;
}
