/**
 * Zoom utilities for SVG canvases
 */

/**
 * Calculates bounding box for elements, accounting for transforms
 * @param {Array} elements - Array of SVG elements
 * @returns {Object} {minX, minY, maxX, maxY, width, height, center}
 */
export function calculateElementsBBox(elements) {
    if (!elements || elements.length === 0) {
        return {
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
            width: 0,
            height: 0,
            center: { x: 0, y: 0 },
        };
    }

    // Find the SVG element
    const svg = elements[0]?.ownerSVGElement;
    if (!svg) {
        return {
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
            width: 0,
            height: 0,
            center: { x: 0, y: 0 },
        };
    }

    // Save current viewBox
    const originalViewBox = svg.getAttribute("viewBox");

    // Temporarily set viewBox to identity to get stable CTM calculations
    const rect = svg.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);

    try {
        // Helper function to get bbox in absolute coordinates
        function getAbsoluteBBox(element) {
            const bbox = element.getBBox();
            const ctm = element.getCTM();
            const pt = svg.createSVGPoint();

            // Transform the bbox corners
            const corners = [
                { x: bbox.x, y: bbox.y },
                { x: bbox.x + bbox.width, y: bbox.y },
                { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
                { x: bbox.x, y: bbox.y + bbox.height },
            ];

            let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
            corners.forEach((corner) => {
                pt.x = corner.x;
                pt.y = corner.y;
                const transformed = pt.matrixTransform(ctm);
                minX = Math.min(minX, transformed.x);
                minY = Math.min(minY, transformed.y);
                maxX = Math.max(maxX, transformed.x);
                maxY = Math.max(maxY, transformed.y);
            });

            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY,
            };
        }

        // Calculate combined bbox
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        elements.forEach((element) => {
            if (element && typeof element.getBBox === "function") {
                const bbox = getAbsoluteBBox(element);
                minX = Math.min(minX, bbox.x);
                minY = Math.min(minY, bbox.y);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            }
        });

        if (minX === Infinity) {
            return {
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0,
                width: 0,
                height: 0,
                center: { x: 0, y: 0 },
            };
        }

        const width = maxX - minX;
        const height = maxY - minY;
        const center = { x: minX + width / 2, y: minY + height / 2 };

        return { minX, minY, maxX, maxY, width, height, center };
    } finally {
        // Always restore the original viewBox
        if (originalViewBox) {
            svg.setAttribute("viewBox", originalViewBox);
        } else {
            svg.removeAttribute("viewBox");
        }
    }
}

/**
 * Zooms canvas to fit the given bounding box
 * @param {CanvasManager} canvasManager - The canvas manager instance
 * @param {Object} bbox - Bounding box with {center: {x, y}, width, height}
 * @param {number} padding - Additional padding in SVG units
 */
export function zoomToBBox(canvasManager, bbox, padding = 0) {
    const { width, height } = bbox;

    // Calculate content dimensions with padding
    const contentWidth = width + 2 * padding;
    const contentHeight = height + 2 * padding;

    // Get current pixel dimensions
    const rect = canvasManager.canvas.getBoundingClientRect();
    const pixelWidth = rect.width;
    const pixelHeight = rect.height;

    // Calculate zoom level to fit the content
    const zoomX = pixelWidth / contentWidth;
    const zoomY = pixelHeight / contentHeight;
    canvasManager.zoomLevel = Math.min(zoomX, zoomY);

    // Center on the bbox center
    canvasManager.panX = bbox.center.x;
    canvasManager.panY = bbox.center.y;

    // Update viewBox using the standard method
    canvasManager.updateViewBox();

    // Optional: Animation for zoom
    canvasManager.canvas.style.transition = "viewBox 1s ease";
}

/**
 * Zooms canvas to fit the given elements
 * @param {CanvasManager} canvasManager - The canvas manager instance
 * @param {Array} elements - Array of SVG elements to fit
 * @param {number} padding - Additional padding in SVG units
 */
export function zoomToElements(canvasManager, elements, padding = 0) {
    const bbox = calculateElementsBBox(elements);
    zoomToBBox(canvasManager, bbox, padding);
}

/**
 * Fits canvas to show all content with padding
 * @param {CanvasManager} canvasManager - The canvas manager instance
 * @param {Object} bounds - {minX, maxX, minY, maxY, padding}
 */
export function fitToBounds(canvasManager, bounds) {
    if (!bounds) {
        // Default fit
        const rect = canvasManager.canvas.getBoundingClientRect();
        canvasManager.zoomLevel = 1;
        canvasManager.panX = rect.width / 2;
        canvasManager.panY = rect.height / 2;
    } else {
        const { minX, maxX, minY, maxY, padding = 20 } = bounds;
        const contentWidth = maxX - minX + 2 * padding;
        const contentHeight = maxY - minY + 2 * padding;

        const rect = canvasManager.canvas.getBoundingClientRect();
        const pixelWidth = rect.width;
        const pixelHeight = rect.height;

        const zoomX = pixelWidth / contentWidth;
        const zoomY = pixelHeight / contentHeight;
        canvasManager.zoomLevel = Math.min(zoomX, zoomY);

        canvasManager.panX = (minX + maxX) / 2;
        canvasManager.panY = (minY + maxY) / 2;
    }

    canvasManager.updateViewBox();
}

/**
 * Zooms canvas to fit an SVG element
 * @param {CanvasManager} canvasManager - The canvas manager instance
 * @param {SVGElement} svgElement - The SVG element to fit
 * @param {number} padding - Additional padding in SVG units
 */
export function zoomToSVGElement(canvasManager, svgElement, padding = 20) {
    const bounds = getSVGBounds(svgElement);
    fitToBounds(canvasManager, {
        minX: bounds.centerX - bounds.width / 2,
        maxX: bounds.centerX + bounds.width / 2,
        minY: bounds.centerY - bounds.height / 2,
        maxY: bounds.centerY + bounds.height / 2,
        padding: padding,
    });
}

/**
 * Gets the bounding box dimensions and center point of an SVG element or group.
 *
 * @param {SVGElement} svgElement - The SVG element to measure.
 * @returns {Object} An object with width, height, centerX, centerY, minX, minY, maxX, maxY properties.
 */
export function getSVGBounds(svgElement) {
    // If element is already attached to an SVG, use it directly
    const ownerSvg = svgElement.ownerSVGElement;
    
    if (ownerSvg) {
        // Element is already in DOM, use getBBox directly
        try {
            const bbox = svgElement.getBBox();
            return {
                width: bbox.width || 0,
                height: bbox.height || 0,
                centerX: (bbox.x || 0) + (bbox.width || 0) / 2,
                centerY: (bbox.y || 0) + (bbox.height || 0) / 2,
                minX: bbox.x || 0,
                minY: bbox.y || 0,
                maxX: (bbox.x || 0) + (bbox.width || 0),
                maxY: (bbox.y || 0) + (bbox.height || 0),
            };
        } catch (e) {
            console.warn("getSVGBounds: getBBox failed on attached element:", e);
        }
    }
    
    // Element is not attached, create a temporary SVG container
    const tempSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );
    tempSvg.style.position = "absolute";
    tempSvg.style.left = "-9999px";
    tempSvg.style.top = "-9999px";
    tempSvg.style.width = "1px";
    tempSvg.style.height = "1px";
    tempSvg.setAttribute("viewBox", "0 0 1000 1000");
    
    // Clone the element instead of moving it
    const clonedElement = svgElement.cloneNode(true);
    tempSvg.appendChild(clonedElement);
    document.body.appendChild(tempSvg);

    let bbox;
    try {
        bbox = clonedElement.getBBox();
    } catch (e) {
        console.warn("getSVGBounds: getBBox failed on cloned element:", e);
        // If getBBox fails, return default values
        document.body.removeChild(tempSvg);
        return {
            width: 0,
            height: 0,
            centerX: 0,
            centerY: 0,
            minX: 0,
            minY: 0,
            maxX: 0,
            maxY: 0,
        };
    }

    // Clean up
    document.body.removeChild(tempSvg);

    return {
        width: bbox.width || 0,
        height: bbox.height || 0,
        centerX: (bbox.x || 0) + (bbox.width || 0) / 2,
        centerY: (bbox.y || 0) + (bbox.height || 0) / 2,
        minX: bbox.x || 0,
        minY: bbox.y || 0,
        maxX: (bbox.x || 0) + (bbox.width || 0),
        maxY: (bbox.y || 0) + (bbox.height || 0),
    };
}
