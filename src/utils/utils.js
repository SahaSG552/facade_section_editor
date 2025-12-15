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

/**
 * Gets the bounding box dimensions and center point of an SVG element or group.
 *
 * @param {SVGElement} svgElement - The SVG element to measure.
 * @returns {Object} An object with width, height, centerX, and centerY properties.
 */
export function getSVGBounds(svgElement) {
    // Create a temporary SVG container to attach the element for getBBox to work
    const tempSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );
    tempSvg.style.position = "absolute";
    tempSvg.style.left = "-9999px";
    tempSvg.style.top = "-9999px";
    tempSvg.style.width = "1px";
    tempSvg.style.height = "1px";
    tempSvg.appendChild(svgElement);
    document.body.appendChild(tempSvg);

    const bbox = svgElement.getBBox();

    // Clean up
    document.body.removeChild(tempSvg);

    return {
        width: bbox.width,
        height: bbox.height,
        centerX: bbox.x + bbox.width / 2,
        centerY: bbox.y + bbox.height / 2,
    };
}
