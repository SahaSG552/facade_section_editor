/**
 * Unified press listener for mouse/touch/pen.
 *
 * Goals:
 * - Keep desktop click behavior unchanged.
 * - Make touch/pen activation deterministic on Android WebView/Chrome.
 * - Prevent duplicate handler calls from synthetic "click" after touch pointerup.
 *
 * @param {HTMLElement|SVGElement} element
 * @param {(event: Event) => void} handler
 * @param {{ preventDefaultTouch?: boolean, dedupeWindowMs?: number }} [options]
 * @returns {() => void} cleanup function
 */
export function addUnifiedPressListener(element, handler, options = {}) {
    if (!element || typeof handler !== "function") return () => { };

    const {
        preventDefaultTouch = true,
        dedupeWindowMs = 450,
    } = options;
    let lastTouchLikeActivationTs = 0;

    const onPointerUp = (event) => {
        if (event.isPrimary === false) return;
        if (event.pointerType === "mouse") return;

        if (preventDefaultTouch && typeof event.preventDefault === "function") {
            event.preventDefault();
        }

        lastTouchLikeActivationTs = performance.now();
        handler(event);
    };

    const onClick = (event) => {
        if (performance.now() - lastTouchLikeActivationTs < dedupeWindowMs) {
            if (typeof event.preventDefault === "function") {
                event.preventDefault();
            }
            return;
        }
        handler(event);
    };

    element.addEventListener("pointerup", onPointerUp, { passive: false });
    element.addEventListener("click", onClick);

    return () => {
        element.removeEventListener("pointerup", onPointerUp);
        element.removeEventListener("click", onClick);
    };
}
