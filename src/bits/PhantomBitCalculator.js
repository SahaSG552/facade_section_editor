import { angleToRad } from "../utils/utils.js";

/**
 * Calculator for V-Carve phantom bits (multi-pass depth simulation)
 * Handles computation and rendering of phantom bits for conical/V-Carve operations
 *
 * For a V-Carve bit with angle θ and depth d:
 * - Number of passes = ceil(d / bitHeight)
 * - Each phantom bit shows intermediate depth stages
 * - Phantom bits are offset outward (negative offset for expanding cone)
 *
 * @class PhantomBitCalculator
 * @example
 * const phantomCalc = new PhantomBitCalculator({
 *   bitsManager,
 *   bitDataHelper,
 *   getAnchorOffset: () => ({x: 0, y: 0}),
 *   convertToTopAnchorCoordinates: (bit) => ({x: bit.x, y: bit.y}),
 *   getAdaptiveStrokeWidth: (zoom) => 0.5 / Math.sqrt(zoom),
 *   getZoomLevel: () => mainCanvasManager.zoomLevel,
 * });
 *
 * phantomCalc.updatePhantoms({
 *   bitsOnCanvas: bits,
 *   phantomsLayer: mainCanvasManager.getLayer("phantoms"),
 *   anchorCoords: getPanelAnchorCoords(),
 * });
 */
export class PhantomBitCalculator {
    /**
     * Initialize phantom bit calculator with dependencies
     * @param {Object} config - Configuration object
     * @param {BitsManager} config.bitsManager - BitsManager for shape creation
     * @param {Object} config.bitDataHelper - BitDataHelper for phantom data storage
     * @param {Function} config.getAnchorOffset - Returns current panel anchor offset
     * @param {Function} config.convertToTopAnchorCoordinates - Coordinate conversion function
     * @param {Function} config.getAdaptiveStrokeWidth - Returns adaptive stroke width
     * @param {Function} config.getZoomLevel - Returns current zoom level
     */
    constructor({
        bitsManager,
        bitDataHelper,
        getAnchorOffset,
        convertToTopAnchorCoordinates,
        getAdaptiveStrokeWidth,
        getZoomLevel,
    }) {
        this.bitsManager = bitsManager;
        this.bitDataHelper = bitDataHelper;
        this.getAnchorOffset = getAnchorOffset;
        this.convertToTopAnchorCoordinates = convertToTopAnchorCoordinates;
        this.getAdaptiveStrokeWidth = getAdaptiveStrokeWidth;
        this.getZoomLevel = getZoomLevel;
    }

    /**
     * Update phantom bits for all VC operations
     * @param {Object} params - Parameters object
     * @param {Array} params.bitsOnCanvas - Array of bits on canvas
     * @param {SVGGElement} params.phantomsLayer - SVG group element for phantom bits
     * @param {Object} params.anchorCoords - Panel anchor coordinates {x, y}
     * @returns {void}
     */
    updatePhantoms({ bitsOnCanvas, phantomsLayer, anchorCoords }) {
        if (!phantomsLayer) {
            console.warn("PhantomBitCalculator: phantomsLayer not found");
            return;
        }
        phantomsLayer.innerHTML = "";

        console.log("PhantomBitCalculator: Updating phantoms", {
            bitsCount: bitsOnCanvas.length,
            poBits: bitsOnCanvas.filter((b) => b.operation === "PO").length,
        });

        const zoomLevel = this.getZoomLevel ? this.getZoomLevel() : 1;

        bitsOnCanvas.forEach((bit, index) => {
            // Handle PO (Pocketing) phantom bits
            if (bit.operation === "PO") {
                console.log(
                    `PhantomBitCalculator: Creating PO phantom for bit ${index}`,
                    {
                        x: bit.x,
                        y: bit.y,
                        diameter: bit.bitData?.diameter,
                        pocketOffset: bit.pocketOffset,
                    }
                );
                this.createPOPhantom(
                    bit,
                    index,
                    phantomsLayer,
                    anchorCoords,
                    zoomLevel
                );
                return;
            }

            if (bit.operation !== "VC") return;

            const topAnchorCoords = this.convertToTopAnchorCoordinates(bit);
            const angle = bit.bitData.angle || 90;
            const bitY = topAnchorCoords.y;
            const hypotenuse = bit.bitData.diameter || 10;
            const bitHeight =
                (hypotenuse / 2) * (1 / Math.tan(angleToRad(angle) / 2));

            const passes = bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

            const partialResults = [];
            for (let i = 0; i < passes; i++) {
                partialResults.push((bitY * (i + 1)) / passes);
            }

            const depths = [...partialResults].reverse();
            const contourOffsets = [];
            for (let i = 0; i < passes; i++) {
                if (i === 0) {
                    contourOffsets.push(0);
                } else {
                    const depthDiff = depths[0] - depths[i];
                    const offset = depthDiff * Math.tan(angleToRad(angle / 2));
                    contourOffsets.push(-offset);
                }
            }

            if (passes > 1) {
                this.bitDataHelper.initPhantoms(bit.bitData, passes);
                for (let passIndex = 1; passIndex < passes; passIndex++) {
                    this.bitDataHelper.setPhantomPass(
                        bit.bitData,
                        passIndex,
                        depths[passIndex]
                    );
                }

                for (let passIndex = 1; passIndex < passes; passIndex++) {
                    const phantomBitData = {
                        ...bit.bitData,
                        fillColor: "rgba(128, 128, 128, 0.1)",
                    };

                    const currentAnchorOffset = this.getAnchorOffset();
                    const logicalX = bit.x + contourOffsets[passIndex];
                    const logicalY = depths[passIndex] - currentAnchorOffset.y;

                    const phantomAbsX = anchorCoords.x + logicalX;
                    const phantomAbsY = anchorCoords.y + logicalY;

                    const phantomShape = this.bitsManager.createBitShapeElement(
                        phantomBitData,
                        bit.groupName,
                        phantomAbsX,
                        phantomAbsY,
                        false,
                        false,
                        this.getAdaptiveStrokeWidth(zoomLevel)
                    );

                    phantomShape.setAttribute("stroke", "gray");
                    phantomShape.setAttribute(
                        "fill",
                        "rgba(128, 128, 128, 0.1)"
                    );
                    phantomShape.classList.add("phantom-bit");

                    phantomShape.__bitData = bit.bitData;
                    phantomShape.__bitIndex = index;
                    phantomShape.__passIndex = passIndex;
                    phantomShape.__depth = depths[passIndex];

                    phantomsLayer.appendChild(phantomShape);
                }
            }
        });
    }

    /**
     * Create PO (Pocketing) phantom bit at offset position
     * @param {Object} bit - Main bit data
     * @param {number} index - Bit index
     * @param {SVGGElement} phantomsLayer - SVG group for phantoms
     * @param {Object} anchorCoords - Panel anchor coordinates
     * @param {number} zoomLevel - Current zoom level
     */
    createPOPhantom(bit, index, phantomsLayer, anchorCoords, zoomLevel) {
        const diameter = bit.bitData.diameter || 10;
        const pocketOffset = bit.pocketOffset || 0;

        // Calculate pocket width: diameter + pocketOffset
        // At pocketOffset = 0, pocketWidth = diameter (minimum pocket width)
        const pocketWidth = diameter + pocketOffset;

        const phantomBitData = {
            ...bit.bitData,
            fillColor: "rgba(255, 165, 0, 0.15)", // Orange semi-transparent
        };

        const currentAnchorOffset = this.getAnchorOffset();

        // Phantom is positioned relative to main bit at pocketOffset distance
        // pocketWidth is used only for UI display (diameter + pocketOffset)
        const logicalX = bit.x + pocketOffset;
        const logicalY = bit.y;

        const phantomAbsX = anchorCoords.x + logicalX;
        const phantomAbsY = anchorCoords.y + logicalY;

        const phantomShape = this.bitsManager.createBitShapeElement(
            phantomBitData,
            bit.groupName,
            phantomAbsX,
            phantomAbsY,
            false,
            false,
            this.getAdaptiveStrokeWidth(zoomLevel)
        );

        phantomShape.setAttribute("stroke", "darkorange");
        phantomShape.setAttribute("fill", "rgba(255, 165, 0, 0.15)");
        phantomShape.classList.add("phantom-bit");
        phantomShape.classList.add("phantom-bit-po");

        // Store metadata for interaction
        phantomShape.__bitData = bit.bitData;
        phantomShape.__bitIndex = index;
        phantomShape.__mainBitIndex = index;
        phantomShape.__pocketWidth = pocketWidth;
        phantomShape.setAttribute("data-phantom-index", index);
        phantomShape.setAttribute("data-main-bit-index", index);

        phantomsLayer.appendChild(phantomShape);
        console.log(
            `PhantomBitCalculator: PO phantom created and appended for bit ${index}`,
            {
                phantomX: phantomAbsX,
                phantomY: phantomAbsY,
                pocketWidth,
            }
        );
    }
}

export default PhantomBitCalculator;
