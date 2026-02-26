import { evaluateMathExpression } from "../../utils/utils.js";

const MOD_CMD_RE = /^MOD\s+([A-Za-z]{2})\s*(.*)$/i;

/**
 * Parse one MOD line (currently RT only).
 *
 * Examples:
 * - MOD RT 45
 * - MOD RT {a}
 * - MOD RT ({a}/2)
 *
 * @param {string} line
 * @returns {{type:'RT', raw:string, params:string[]} | null}
 */
export function parseModLine(line) {
    const src = String(line ?? "").trim();
    if (!src) return null;

    const m = src.match(MOD_CMD_RE);
    if (!m) return null;

    const kind = String(m[1] ?? "").toUpperCase();
    const payload = String(m[2] ?? "").trim();

    if (kind !== "RT") return null;
    if (!payload) return null;

    return {
        type: "RT",
        raw: src,
        params: [payload],
    };
}

/**
 * Evaluate RT angle token with variable support.
 *
 * @param {string} token
 * @param {Record<string, number>} [vars]
 * @returns {number}
 */
export function evalAngle(token, vars = {}) {
    const raw = String(token ?? "").trim();
    if (!raw) return NaN;

    const direct = Number(raw);
    if (!Number.isNaN(direct) && Number.isFinite(direct)) return direct;

    try {
        const expr = raw.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_all, name) => {
            const v = vars?.[name];
            return v !== undefined && !Number.isNaN(Number(v)) ? String(v) : "0";
        });
        const out = Number(evaluateMathExpression(expr));
        return Number.isFinite(out) ? out : NaN;
    } catch (_) {
        return NaN;
    }
}

/**
 * Serialize one parsed MOD transform to SVG transform token.
 * RT only for now.
 *
 * @param {{type:'RT', params:string[]}} t
 * @param {Record<string, number>} [vars]
 * @returns {string}
 */
export function modToSvgTransform(t, vars = {}) {
    if (!t || t.type !== "RT") return "";
    const angleToken = String(t.params?.[0] ?? "").trim();
    const angle = evalAngle(angleToken, vars);
    if (!Number.isFinite(angle)) return "";
    return `rotate(${angle})`;
}

/**
 * Join many parsed transforms into SVG transform attribute value.
 *
 * @param {Array<{type:'RT', params:string[]}>} transforms
 * @param {Record<string, number>} [vars]
 * @returns {string}
 */
export function modListToSvgTransform(transforms, vars = {}) {
    if (!Array.isArray(transforms) || transforms.length === 0) return "";
    return transforms
        .map(t => modToSvgTransform(t, vars))
        .filter(Boolean)
        .join(" ");
}
