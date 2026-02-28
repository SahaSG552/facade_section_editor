/**
 * Return true for shape attributes that represent Y coordinate in UI formulas/inputs.
 * @param {string} attrKey
 * @returns {boolean}
 */
export function isShapeYAttr(attrKey) {
    return attrKey === "cy" || attrKey === "y";
}

/**
 * Conversion sign for shape UI-space <-> stored data-space values.
 * Current contract:
 * - `shapeSpace='canvas'`: UI Y token is mirrored into stored data using `-1`
 * - `shapeSpace='bit'`: no mirroring (`+1`)
 * @param {'bit'|'canvas'} [shapeSpace='canvas']
 * @returns {number}
 */
export function shapeYSign(shapeSpace = "canvas") {
    return shapeSpace === "canvas" ? -1 : 1;
}

/**
 * Convert stored numeric value to UI-space numeric value for a shape attribute.
 * @param {string} attrKey
 * @param {number} storedValue
 * @param {'bit'|'canvas'} [shapeSpace='canvas']
 * @returns {number}
 */
export function shapeStoredToUiNumber(attrKey, storedValue, shapeSpace = "canvas") {
    const n = Number(storedValue ?? 0);
    if (!Number.isFinite(n)) return n;
    return isShapeYAttr(attrKey) ? n * shapeYSign(shapeSpace) : n;
}

/**
 * Convert UI-space numeric value to stored numeric value for a shape attribute.
 * @param {string} attrKey
 * @param {number} uiValue
 * @param {'bit'|'canvas'} [shapeSpace='canvas']
 * @returns {number}
 */
export function shapeUiToStoredNumber(attrKey, uiValue, shapeSpace = "canvas") {
    const n = Number(uiValue ?? 0);
    if (!Number.isFinite(n)) return n;
    return isShapeYAttr(attrKey) ? n * shapeYSign(shapeSpace) : n;
}

function negateToken(token) {
    const t = String(token ?? "").trim();
    if (!t) return "";
    const numeric = Number(t);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
        return String(parseFloat(String(-numeric)));
    }
    const wrappedNeg = t.match(/^-\((.*)\)$/);
    if (wrappedNeg) return wrappedNeg[1].trim();
    if (t.startsWith("-")) return t.slice(1).trim();
    return `-(${t})`;
}

/**
 * Convert UI token to stored token for shape attributes.
 * @param {string} attrKey
 * @param {string} uiToken
 * @param {'bit'|'canvas'} [shapeSpace='canvas']
 * @returns {string}
 */
export function shapeUiToStoredToken(attrKey, uiToken, shapeSpace = "canvas") {
    const t = String(uiToken ?? "").trim();
    if (!t) return "";
    if (!isShapeYAttr(attrKey)) return t;
    return shapeYSign(shapeSpace) < 0 ? negateToken(t) : t;
}

/**
 * Return true when a path command argument at index represents Y coordinate.
 * @param {string} cmd
 * @param {number} argIndex
 * @returns {boolean}
 */
export function isPathYArg(cmd, argIndex) {
    const c = String(cmd ?? "").toUpperCase();
    const i = Number(argIndex);
    if (!Number.isInteger(i) || i < 0) return false;

    if (c === "V") return i === 0;
    if (c === "M" || c === "L" || c === "T") return i % 2 === 1;
    if (c === "C") return i === 1 || i === 3 || i === 5;
    if (c === "S" || c === "Q") return i === 1 || i === 3;
    if (c === "A") return i === 6;
    return false;
}

/**
 * Conversion sign for path UI-space <-> stored data-space values.
 * Stored path space is bit-space (Y-up).
 * @param {'bit'|'canvas'} [pathSpace='bit']
 * @returns {number}
 */
export function pathYSign(pathSpace = "bit") {
    return pathSpace === "canvas" ? -1 : 1;
}

/**
 * Convert UI token to stored token for a path command argument.
 * @param {string} cmd
 * @param {number} argIndex
 * @param {string} uiToken
 * @param {'bit'|'canvas'} [pathSpace='bit']
 * @returns {string}
 */
export function pathUiToStoredToken(cmd, argIndex, uiToken, pathSpace = "bit") {
    const t = String(uiToken ?? "").trim();
    if (!t) return "";
    if (!isPathYArg(cmd, argIndex)) return t;
    return pathYSign(pathSpace) < 0 ? negateToken(t) : t;
}
