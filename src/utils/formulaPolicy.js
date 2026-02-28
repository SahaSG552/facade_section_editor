import { evaluateMathExpression } from "./utils.js";
import { VARIABLE_TOKEN_RE_GLOBAL } from "./variableTokens.js";

/**
 * Return true when token is non-trivial expression/variable token, not plain number.
 * @param {string|number|null|undefined} value
 * @returns {boolean}
 */
export function isFormulaToken(value) {
    const t = String(value ?? "").trim();
    if (!t) return false;
    const direct = Number(t);
    if (!Number.isNaN(direct) && Number.isFinite(direct)) return false;
    return /\{[^}]+\}/.test(t)
        || /[*/()]/.test(t)
        || (/[+\-]/.test(t) && !/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t));
}

/**
 * Evaluate numeric or formula token using variable map.
 * Unknown variables are resolved as 0.
 * @param {string|number|null|undefined} token
 * @param {Record<string,number>} [vars]
 * @param {number} [fallback=NaN]
 * @returns {number}
 */
export function evaluateTokenWithVars(token, vars = {}, fallback = Number.NaN) {
    const t = String(token ?? "").trim();
    if (!t) return fallback;
    const direct = Number(t);
    if (!Number.isNaN(direct) && Number.isFinite(direct)) return direct;
    try {
        const expr = t.replace(VARIABLE_TOKEN_RE_GLOBAL, (_, name) => {
            const v = vars?.[name];
            return v !== undefined && !Number.isNaN(Number(v)) ? String(v) : "0";
        });
        const n = Number(evaluateMathExpression(expr));
        return Number.isNaN(n) ? fallback : n;
    } catch (_) {
        return fallback;
    }
}
