const DEFAULT_NS = "http://www.w3.org/2000/svg";

/**
 * Factory for creating SVG elements with consistent namespace and attributes
 * Simplifies DRY principle for SVG DOM creation across the application
 *
 * @class SVGElementFactory
 * @example
 * const factory = new SVGElementFactory();
 * const rect = factory.createRect({
 *   x: 0, y: 0, width: 100, height: 50,
 *   fill: "red", stroke: "black"
 * }, ["my-rect"]);
 */
export class SVGElementFactory {
    /**
     * Create SVGElementFactory with optional custom namespace
     * @param {string} [namespace="http://www.w3.org/2000/svg"] - SVG namespace URI
     */
    constructor(namespace = DEFAULT_NS) {
        this.namespace = namespace;
    }

    /**
     * Create an SVG element with attributes and classes
     * @param {string} tag - SVG element tag name (rect, path, circle, etc.)
     * @param {Object} [attributes={}] - Element attributes as key-value pairs
     * @param {string[]} [classNames=[]] - CSS class names to add to element
     * @returns {SVGElement} Created SVG element
     */
    createElement(tag, attributes = {}, classNames = []) {
        const el = document.createElementNS(this.namespace, tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                el.setAttribute(key, value);
            }
        });
        if (Array.isArray(classNames) && classNames.length > 0) {
            el.classList.add(...classNames);
        }
        return el;
    }

    /**
     * Create an SVG rect element
     * @param {Object} [attributes={}] - Rect attributes (x, y, width, height, fill, stroke, etc.)
     * @param {string[]} [classNames=[]] - CSS class names
     * @returns {SVGRectElement} Created rect element
     */
    createRect(attributes = {}, classNames = []) {
        return this.createElement("rect", attributes, classNames);
    }

    /**
     * Create an SVG path element
     * @param {Object} [attributes={}] - Path attributes (d, fill, stroke, etc.)
     * @param {string[]} [classNames=[]] - CSS class names
     * @returns {SVGPathElement} Created path element
     */
    createPath(attributes = {}, classNames = []) {
        return this.createElement("path", attributes, classNames);
    }
}

export default SVGElementFactory;
