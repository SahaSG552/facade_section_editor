/**
 * Calculates and renders bit extensions showing material below the bit.
 *
 * Bit extensions are visual indicators displayed below the material surface (Y > materialTopY).
 * They show how far below the material a bit extends, helping visualize tool engagement depth.
 *
 * Key Features:
 * - **Material Boundary Detection**: Identifies when bit position exceeds material top (materialTopY)
 * - **Shank Collision Detection**: Detects when shank diameter > bit diameter
 * - **Adaptive Scaling**: Adjusts extension width based on shank collision (scale = shankDiameter / bitDiameter)
 * - **Color Coding**: Red for regular extensions, dark red for shank collisions
 * - **Phantom Bit Support**: Tracks extensions for both main bits and phantom (VC) bits
 * - **Metadata Storage**: Stores extension geometry via BitDataHelper for export and logging
 *
 * @class ExtensionCalculator
 *
 * @example
 * const calculator = new ExtensionCalculator({
 *     svgFactory: new SVGElementFactory(),
 *     bitDataHelper: new BitDataHelper(),
 *     getAdaptiveStrokeWidth: (zoom) => Math.max(0.1, 0.5 / Math.sqrt(zoom)),
 *     getBitLogger: () => logger,
 *     getMaterialTopY: () => panel.materialTopY,
 *     getZoomLevel: () => canvas.zoomLevel
 * });
 *
 * // Update all extensions on the canvas
 * calculator.updateExtensions({
 *     bitsOnCanvas: canvas.bitsOnCanvas,
 *     phantomsLayer: canvas.phantomsLayer
 * });
 *
 * // Extensions automatically render as rectangles below material surface
 * // Colors: rgba(255, 0, 0, 0.3) for normal, rgba(139, 0, 0, 0.4) for shank collision
 */
export class ExtensionCalculator {
    /**
     * Creates an ExtensionCalculator instance with dependency injection.
     *
     * @param {Object} config - Configuration object with dependencies
     * @param {SVGElementFactory} config.svgFactory - Factory for SVG element creation
     * @param {BitDataHelper} config.bitDataHelper - Helper for storing bit metadata
     * @param {Function} config.getAdaptiveStrokeWidth - Function returning stroke width based on zoom
     * @param {Function} config.getBitLogger - Function returning logger instance (optional)
     * @param {Function} config.getMaterialTopY - Function returning material surface Y coordinate
     * @param {Function} config.getZoomLevel - Function returning current zoom level
     */
    constructor({
        svgFactory,
        bitDataHelper,
        getAdaptiveStrokeWidth,
        getBitLogger,
        getMaterialTopY,
        getZoomLevel,
    }) {
        this.svgFactory = svgFactory;
        this.bitDataHelper = bitDataHelper;
        this.getAdaptiveStrokeWidth = getAdaptiveStrokeWidth;
        this.getBitLogger = getBitLogger;
        this.getMaterialTopY = getMaterialTopY;
        this.getZoomLevel = getZoomLevel;
    }

    /**
     * Updates and renders extensions for all bits on canvas and phantom bits in layers.
     *
     * Algorithm:
     * 1. Get material surface position (materialTopY)
     * 2. For each bit (main and phantom):
     *    a. If bitTopY > materialTopY:
     *       - Calculate extension height = bitTopY - materialTopY
     *       - Check shank diameter vs bit diameter for collision
     *       - Render extension rectangle with appropriate color
     *       - Store metadata via BitDataHelper for export
     *    b. Else: clear any existing extension
     * 3. Log shank collisions if logger available
     *
     * Shank Collision Logic:
     * - If shankDiameter > bitDiameter, extension widens
     * - Scale factor = shankDiameter / bitDiameter
     * - Extension width = bitWidth * scale, centered on bit
     * - Visual: dark red fill (rgba(139,0,0,0.4)) with darkred stroke
     *
     * @param {Object} config - Update configuration
     * @param {Array} config.bitsOnCanvas - Active bits with bitData and group elements
     * @param {SVGElement} config.phantomsLayer - Layer containing phantom bit groups
     *
     * @returns {void} - Modifies DOM and internal BitDataHelper state
     */
    updateExtensions({ bitsOnCanvas, phantomsLayer }) {
        const materialTopY = this.getMaterialTopY();
        if (materialTopY === null) return;

        const bitLogger = this.getBitLogger ? this.getBitLogger() : null;
        const zoomLevel = this.getZoomLevel ? this.getZoomLevel() : 1;

        // Clear shank collision flags before checking
        bitsOnCanvas.forEach((bit) => {
            bit.hasShankCollision = false;
        });

        // Collect all bits (regular + phantoms)
        const allBits = [...bitsOnCanvas];
        const phantomGroups = phantomsLayer?.querySelectorAll?.(".phantom-bit");
        if (phantomGroups) {
            phantomGroups.forEach((group) => allBits.push({ group }));
        }

        allBits.forEach((bit, index) => {
            if (!bit.group) return;

            const isPhantom = !bit.bitData;

            // Remove existing extensions from this bit group
            const existingExtensions =
                bit.group.querySelectorAll(".bit-extension");
            existingExtensions.forEach((ext) => ext.remove());

            const element = bit.group.querySelector(".bit-shape");
            if (!element) return;

            // Get bit position from transform
            const transform = bit.group.getAttribute("transform");
            let bitX = 0;
            let bitY = 0;
            if (transform) {
                const match = transform.match(
                    /translate\(([^,]+),\s*([^)]+)\)/
                );
                if (match) {
                    bitX = parseFloat(match[1]);
                    bitY = parseFloat(match[2]);
                }
            }

            // Get bit bounding box in local coordinates
            const bbox = element.getBBox();
            const bitWidth = bbox.width;
            const bitTopY = bitY + bbox.y; // Top of the bit in canvas coordinates

            const bitData = bit.bitData || (bit.group && bit.group.__bitData);
            let extensionWidth = bitWidth;
            let extensionColor = "red";
            let hasShankCollision = false;

            if (bitTopY > materialTopY) {
                // Shank collision check
                if (bitData && bitData.shankDiameter && bitData.diameter) {
                    const shankDiameter = parseFloat(bitData.shankDiameter);
                    const bitDiameter = parseFloat(bitData.diameter);

                    if (shankDiameter > bitDiameter) {
                        const scale = bitWidth / bitDiameter;
                        extensionWidth = shankDiameter * scale;
                        extensionColor = "darkred";
                        hasShankCollision = true;
                        bit.hasShankCollision = true;

                        if (bitLogger) {
                            bitLogger.shankCollision(index, {
                                shankDiameter,
                                bitDiameter,
                                scale,
                                extensionWidth,
                            });
                        }
                    }
                }

                const rectHeight = bitTopY - materialTopY + 1.1;
                const rectX = bbox.x + (bitWidth - extensionWidth) / 2;
                const rectY = materialTopY - bitY - 1 + 0.001;

                const fillColor =
                    extensionColor === "darkred"
                        ? "rgba(139, 0, 0, 0.4)"
                        : "rgba(255, 0, 0, 0.3)";
                const strokeColor = extensionColor;

                const rect = this.svgFactory.createRect(
                    {
                        x: rectX,
                        y: rectY,
                        width: extensionWidth,
                        height: rectHeight,
                        fill: fillColor,
                        stroke: strokeColor,
                        "stroke-width": this.getAdaptiveStrokeWidth(zoomLevel),
                    },
                    ["bit-extension"]
                );

                bit.group.appendChild(rect);

                const extensionInfo = {
                    height: rectHeight,
                    width: extensionWidth,
                    relativeX: rectX,
                    relativeY: rectY,
                    materialTopY,
                    distanceBelowMaterial: bitTopY - materialTopY,
                    color: extensionColor,
                    fillColor,
                    strokeColor,
                    createdAt: Date.now(),
                    source: "2D",
                };

                const shankInfo = hasShankCollision
                    ? {
                          shankDiameter: bitData?.shankDiameter,
                          bitDiameter: bitData?.diameter,
                          hasCollision: true,
                          widthDifference: extensionWidth - bitWidth,
                          scale: extensionWidth / bitWidth,
                      }
                    : null;

                if (bit.bitData) {
                    this.bitDataHelper.setExtension(bit.bitData, extensionInfo);
                    if (shankInfo) {
                        this.bitDataHelper.setShank(bit.bitData, shankInfo);
                    }
                    bit.extension = extensionInfo;
                } else if (bit.group) {
                    const __bitIndex = bit.group.__bitIndex;
                    const __passIndex = bit.group.__passIndex;

                    if (__bitIndex !== undefined && __passIndex !== undefined) {
                        const mainBit = bitsOnCanvas[__bitIndex];
                        if (mainBit && mainBit.bitData) {
                            const depth = this.bitDataHelper.getPhantomPass(
                                mainBit.bitData,
                                __passIndex
                            )?.depth;
                            this.bitDataHelper.setPhantomPass(
                                mainBit.bitData,
                                __passIndex,
                                depth,
                                extensionInfo
                            );
                        }
                    }

                    bit.group.__extension = extensionInfo;
                    if (bitData) {
                        bit.group.__bitData = bitData;
                    }
                }

                if (bitLogger) {
                    const passIndex =
                        isPhantom && bit.group ? bit.group.__passIndex : null;
                    bitLogger.extensionUpdated(
                        index,
                        extensionInfo,
                        isPhantom,
                        passIndex
                    );
                }
            } else {
                if (bit.bitData) {
                    this.bitDataHelper.setExtension(bit.bitData, null);
                    bit.extension = null;
                } else if (bit.group) {
                    bit.group.__extension = null;
                    if (bitData) {
                        this.bitDataHelper.setExtension(bitData, null);
                    }
                }
            }
        });
    }
}

export default ExtensionCalculator;
