const LETTER_KEY_CODE_RE = /^Key[A-Z]$/;
const DIGIT_KEY_CODE_RE = /^Digit[0-9]$/;
const SINGLE_SHORTCUT_RE = /^[a-z0-9]$/i;

/**
 * Normalize a keyboard event to a layout-independent shortcut id.
 *
 * For physical letter/digit keys we prefer `KeyboardEvent.code`, so the same
 * physical key works across Latin and Cyrillic layouts. Named keys like Enter
 * and Escape already have stable `event.key` values and fall back to that.
 *
 * @param {KeyboardEvent|{key?:string,code?:string}|null|undefined} event
 * @returns {string}
 */
export function getShortcutKeyId(event) {
    const code = String(event?.code ?? "");
    if (LETTER_KEY_CODE_RE.test(code)) return code.slice(3).toLowerCase();
    if (DIGIT_KEY_CODE_RE.test(code)) return code.slice(5);
    return String(event?.key ?? "").toLowerCase();
}

/**
 * Match a keyboard event against a shortcut token.
 *
 * Single alphanumeric shortcuts use the layout-independent normalized id.
 * All other named keys compare against `event.key`.
 *
 * @param {KeyboardEvent|{key?:string,code?:string}|null|undefined} event
 * @param {string} shortcut
 * @returns {boolean}
 */
export function matchesShortcut(event, shortcut) {
    const normalized = String(shortcut ?? "").trim();
    if (!normalized) return false;
    if (SINGLE_SHORTCUT_RE.test(normalized)) {
        return getShortcutKeyId(event) === normalized.toLowerCase();
    }
    return String(event?.key ?? "").toLowerCase() === normalized.toLowerCase();
}

/**
 * Check whether Ctrl or Cmd is pressed.
 * @param {KeyboardEvent|{ctrlKey?:boolean,metaKey?:boolean}|null|undefined} event
 * @returns {boolean}
 */
export function hasCommandModifier(event) {
    return !!(event?.ctrlKey || event?.metaKey);
}

/**
 * Match a Cmd/Ctrl shortcut in one step.
 *
 * Useful for clipboard and undo/redo handling where the modifier is mandatory
 * and the actual key should remain layout-independent.
 *
 * @param {KeyboardEvent|{key?:string,code?:string,ctrlKey?:boolean,metaKey?:boolean}|null|undefined} event
 * @param {string} shortcut
 * @returns {boolean}
 */
export function matchesCommandShortcut(event, shortcut) {
    return hasCommandModifier(event) && matchesShortcut(event, shortcut);
}