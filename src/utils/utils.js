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
 *
 * @param {string|number} value - The value to evaluate. If it's a string, evaluates it as a math expression. If not a string, returns as-is.
 * @returns {string|number} The evaluated result or original value if evaluation fails.
 */
export function evaluateMathExpression(value) {
    if (!value || typeof value !== "string") return value;
    try {
        return math.evaluate(value);
    } catch (e) {
        return value; // if not a valid expression, return as is
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
