import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Converts an angle from degrees to radians.
 *
 * @param {number} angle - The angle in degrees.
 * @returns {number} The angle in radians.
 */
export function angleToRad(angle) {
    return (angle * Math.PI) / 180;
}

export function distancePtToPt(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Evaluates mathematical expressions in strings.
 * Supports: +, -, *, /, parentheses, and basic math functions.
 *
 * @param {string|number} value - The value to evaluate. If it's a string, evaluates it as a math expression. If not a string, returns as-is.
 * @returns {number} The evaluated result or NaN if evaluation fails.
 */
export function evaluateMathExpression(value) {
    if (value === null || value === undefined) return NaN;
    
    // If already a number, return it
    if (typeof value === "number") return value;
    
    // If not a string, try to convert
    if (typeof value !== "string") return NaN;
    
    const expr = value.trim();
    if (!expr) return NaN;
    
    // Try simple number first
    const num = parseFloat(expr);
    if (!isNaN(num) && isFinite(num) && expr === num.toString()) {
        return num;
    }
    
    try {
        // Sanitize expression - only allow safe characters
        // Allow: digits, decimal point, operators, parentheses, spaces, common math
        if (!/^[\d\s+\-*/().^%]+$/.test(expr)) {
            // Has invalid characters, try to extract numbers and operators
            return NaN;
        }
        
        // Replace ^ with ** for exponentiation
        let sanitized = expr.replace(/\^/g, '**');
        
        // Use Function constructor for safe evaluation
        // This is safer than eval but still evaluates the expression
        const result = new Function('return ' + sanitized)();
        
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return result;
        }
        
        return NaN;
    } catch (e) {
        return NaN;
    }
}

// Weld vertices within a tolerance to reduce tiny gaps between meshes
export function weldGeometry(geometry, tolerance = 1e-3) {
    if (!geometry?.isBufferGeometry || !geometry.attributes?.position) {
        return geometry;
    }

    const cloned = geometry.clone();

    // Drop extra attributes that can block merging
    Object.keys(cloned.attributes).forEach((key) => {
        if (key !== "position" && key !== "normal") {
            cloned.deleteAttribute(key);
        }
    });

    const merged = mergeVertices(cloned, tolerance) || cloned;

    if (merged !== cloned) {
        cloned.dispose();
    }

    merged.computeVertexNormals();

    return merged;
}
