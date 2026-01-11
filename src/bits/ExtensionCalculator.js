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

            // Remove existing PO pocket expansions
            const existingPocketExpansions = bit.group.querySelectorAll(
                ".bit-pocket-expansion"
            );
            existingPocketExpansions.forEach((ext) => ext.remove());

            // Remove existing PO pocket fill rectangles
            const existingPocketFills =
                bit.group.querySelectorAll(".bit-pocket-fill");
            existingPocketFills.forEach((ext) => ext.remove());

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

            // Handle PO (Pocketing) - draw rectangle between main and phantom bit
            if (!isPhantom && bit.operation === "PO") {
                const diameter = bitData?.diameter || 10;
                const pocketOffset = bit.pocketOffset || 0;
                const pocketWidth = diameter + pocketOffset;

                // Draw pocket fill rectangle from main bit center to phantom bit center
                const pocketFillWidth = pocketOffset; // Actual offset distance
                const pocketFillHeight = Math.abs(bbox.height); // Height of the bit
                const pocketFillX = bbox.x + bitWidth / 2; // Start from main bit center
                const pocketFillY = bbox.y; // Start from bit top

                const pocketFill = this.svgFactory.createRect(
                    {
                        x: pocketFillX,
                        y: pocketFillY,
                        width: pocketFillWidth,
                        height: pocketFillHeight,
                        fill: "rgba(255, 200, 0, 0.2)", // Yellow-orange for pocket area
                        stroke: "orange",
                        "stroke-width": this.getAdaptiveStrokeWidth(zoomLevel),
                        "stroke-dasharray": "2,2",
                    },
                    ["bit-pocket-fill"]
                );

                bit.group.appendChild(pocketFill);
            }

            // Handle PO (Pocketing) pocket expansion visualization
            if (
                !isPhantom &&
                bit.operation === "PO" &&
                bitTopY > materialTopY
            ) {
                const diameter = bitData?.diameter || 10;
                const pocketOffset = bit.pocketOffset || 0;
                const pocketWidth = diameter + pocketOffset;

                // Draw pocket expansion
                {
                    // Pocket expansion: from main bit to phantom bit
                    const mainBitLeft = bitX + bbox.x;
                    const phantomBitRight =
                        bitX + bbox.x + bitWidth + pocketOffset; // Use pocketOffset
                    const expansionWidth = phantomBitRight - mainBitLeft;
                    const expansionHeight = bitTopY - materialTopY + 1.1;
                    const expansionX = mainBitLeft - bitX;
                    const expansionY = materialTopY - bitY - 1 + 0.001;

                    const pocketExpansion = this.svgFactory.createRect(
                        {
                            x: expansionX,
                            y: expansionY,
                            width: expansionWidth,
                            height: expansionHeight,
                            fill: "rgba(255, 165, 0, 0.25)", // Orange for pocket
                            stroke: "darkorange",
                            "stroke-width":
                                this.getAdaptiveStrokeWidth(zoomLevel),
                        },
                        ["bit-pocket-expansion"]
                    );

                    bit.group.appendChild(pocketExpansion);
                }
            }

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

    /**
     * Update pocket width input fields for PO operations
     * Creates interactive input between main and phantom bits when selected
     *
     * @param {Object} config - Update configuration
     * @param {Array} config.bitsOnCanvas - Active bits with bitData
     * @param {Array} config.selectedIndices - Currently selected bit indices
     * @param {SVGElement} config.overlayLayer - Layer for UI overlays
     * @param {Function} config.onPocketOffsetChange - Callback when pocket offset changes
     * @returns {void}
     */
    updatePocketInputs({
        bitsOnCanvas,
        selectedIndices,
        overlayLayer,
        onPocketOffsetChange,
    }) {
        if (!overlayLayer) {
            console.warn("ExtensionCalculator: overlayLayer not found");
            return;
        }

        console.log("ExtensionCalculator: Updating pocket inputs", {
            bitsCount: bitsOnCanvas.length,
            selectedCount: selectedIndices.length,
            poBits: bitsOnCanvas.filter(
                (b, i) => b.operation === "PO" && selectedIndices.includes(i)
            ).length,
        });

        // Remove existing pocket inputs
        const existingInputs = overlayLayer.querySelectorAll(
            ".pocket-input-container"
        );
        existingInputs.forEach((input) => input.remove());

        const zoomLevel = this.getZoomLevel ? this.getZoomLevel() : 1;

        bitsOnCanvas.forEach((bit, index) => {
            if (bit.operation !== "PO") return;
            if (!selectedIndices.includes(index)) return;
            if (!bit.group) return;

            console.log(
                `ExtensionCalculator: Creating pocket input for PO bit ${index}`,
                {
                    x: bit.x,
                    y: bit.y,
                    diameter: bit.bitData?.diameter,
                    pocketOffset: bit.pocketOffset,
                }
            );

            const diameter = bit.bitData?.diameter || 10;
            const pocketOffset = bit.pocketOffset || 0;
            const pocketWidth = diameter + pocketOffset;

            // Show input for PO operation when bit is selected
            // Input displays pocketWidth = diameter + pocketOffset
            // Min value = diameter (when pocketOffset = 0)

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

            const element = bit.group.querySelector(".bit-shape");
            if (!element) return;

            const bbox = element.getBBox();
            const bitWidth = bbox.width;

            // Position input at center between main bit and phantom bit
            // Main bit center (in absolute coords): bitX + bbox.x + bitWidth/2
            // Phantom bit center (in absolute coords): bitX + bbox.x + bitWidth/2 + pocketOffset
            // Center between them: bitX + bbox.x + bitWidth/2 + pocketOffset/2
            const mainBitCenterX = bitX + bbox.x + bitWidth / 2;
            const inputX = mainBitCenterX + pocketOffset / 2;
            const inputY = bitY + bbox.y - 2; // Slightly above bit top

            // Create foreignObject for HTML input
            const svgNS = "http://www.w3.org/2000/svg";
            const foreignObject = document.createElementNS(
                svgNS,
                "foreignObject"
            );
            foreignObject.setAttribute("x", inputX - 7.5); // Center the input (15px width / 2)
            foreignObject.setAttribute("y", inputY - 5); // Position above bit
            foreignObject.setAttribute("width", "15");
            foreignObject.setAttribute("height", "10");
            foreignObject.setAttribute("overflow", "visible");
            foreignObject.classList.add("pocket-input-container");
            foreignObject.style.pointerEvents = "none"; // Allow clicks to pass through to phantom

            const input = document.createElement("input");
            input.type = "number";
            input.classList.add("pocket-input", "no-spin");
            input.value = parseFloat(pocketWidth.toFixed(1));
            input.step = "1"; // Grid step
            input.min = diameter.toString(); // Minimum = diameter (pocketOffset = 0)
            input.style.pointerEvents = "auto"; // Enable input interaction
            input.title = `Pocket Width (min: ${diameter}mm)`;
            input.style.width = "100%";
            input.style.fontSize = "5px";
            input.style.textAlign = "center";
            input.style.border = "none";
            input.style.padding = "0";
            input.style.margin = "0";
            input.style.backgroundColor = "transparent";
            input.style.fontWeight = "bold";
            input.style.cursor = "pointer";
            input.style.pointerEvents = "all";
            input.style.boxSizing = "border-box";
            input.style.outline = "none";

            // Prevent event propagation and enable input on click
            input.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                e.preventDefault();
                input.removeAttribute("disabled");
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 0);
            });

            input.addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();
            });

            // Handle value change
            input.addEventListener("change", (e) => {
                const newPocketWidth = parseFloat(input.value) || diameter;
                // pocketWidth must be >= diameter (pocketOffset >= 0)
                const constrainedWidth = Math.max(diameter, newPocketWidth);
                input.value = parseFloat(constrainedWidth.toFixed(1));

                // Convert pocketWidth to pocketOffset: offset = width - diameter
                const newPocketOffset = constrainedWidth - diameter;

                if (onPocketOffsetChange) {
                    onPocketOffsetChange(index, newPocketOffset);
                }
            });

            // Keep focus on Enter key
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    input.blur();
                }
                e.stopPropagation();
            });
            input.addEventListener("mousemove", (e) => e.stopPropagation());
            input.addEventListener("mouseup", (e) => e.stopPropagation());

            foreignObject.appendChild(input);
            overlayLayer.appendChild(foreignObject);
            console.log(
                `ExtensionCalculator: Pocket input appended for bit ${index}`,
                {
                    inputX,
                    inputY,
                    overlayChildrenCount: overlayLayer.children.length,
                }
            );
        });
    }
}

export default ExtensionCalculator;
