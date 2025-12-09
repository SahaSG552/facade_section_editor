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
