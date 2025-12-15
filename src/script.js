import {
    angleToRad,
    distancePtToPt,
    evaluateMathExpression,
} from "./utils/utils.js";
import { getBits, addBit, deleteBit, updateBit } from "./data/bitsStore.js";
import CanvasManager from "./canvas/CanvasManager.js";
import BitsManager from "./panel/BitsManager.js";
import dxfExporter from "./utils/dxfExporter.js";
import { OffsetCalculator } from "./utils/offsetCalculator.js";
import { getOperationsForGroup } from "./data/bitsStore.js";
// SVG namespace
const svgNS = "http://www.w3.org/2000/svg";

// Get DOM elements
const canvas = document.getElementById("canvas");
const panelWidthInput = document.getElementById("panel-width");
const panelHeightInput = document.getElementById("panel-height");
const panelThicknessInput = document.getElementById("panel-thickness");

// Global variables for panel shape
let partSection;
let partFront;
let panelWidth = 400;
let panelHeight = 600;
let panelThickness = 19;
let panelAnchor = "top-left"; // "top-left" or "bottom-left"

const CLIPPER_SCALE = 1000;
let showPart = false;
let partPath;
let bitsVisible = true; // Track bits visibility state

const canvasParameters = {
    width: canvas.getAttribute("width"),
    height: canvas.getAttribute("height"),
};

// Canvas manager instance
let mainCanvasManager;
let bitsManager; // Bits manager instance
let gridSize = 1; // Default grid size in pixels (1mm = 10px)

// Pan variables for canvas panning

// Pan variables for canvas panning
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartPanX = 0;
let panStartPanY = 0;

// Drag variables for selected bits (now supports multi-selection)
let isDraggingBit = false;
let draggedBitIndex = null; // Index of the bit being dragged (for multi-selection)
let selectedBitIndices = []; // Array of selected bit indices
let dragStartX = 0;
let dragStartY = 0;
let dragStarted = false; // Flag to track if drag actually started (mouse moved)

// BitsManager will be created in initializeSVG after CanvasManager is set up

// Initialize SVG elements using CanvasManager
function initializeSVG() {
    // Create panel rectangle first (before CanvasManager to avoid callback issues)
    partSection = document.createElementNS(svgNS, "rect");

    // Create part front rectangle
    partFront = document.createElementNS(svgNS, "rect");

    // Calculate panel anchor position for grid alignment
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const anchorOffset = getpanelAnchorOffset();
    const gridAnchorX = panelX + anchorOffset.x + gridSize / 2;
    const gridAnchorY = panelY + anchorOffset.y + gridSize / 2;

    // Create main canvas manager instance
    mainCanvasManager = new CanvasManager({
        canvas: canvas,
        width: canvasParameters.width,
        height: canvasParameters.height,
        enableZoom: true,
        enablePan: false, // Disable pan - we'll handle it manually to avoid conflicts with bit dragging
        enableGrid: true,
        enableMouseEvents: true,
        gridSize: gridSize,
        gridAnchorX: gridAnchorX,
        gridAnchorY: gridAnchorY,
        initialZoom: 1,
        initialPanX: canvasParameters.width / 2,
        initialPanY: canvasParameters.height / 2,
        layers: ["grid", "panel", "offsets", "bits", "phantoms", "overlay"],
        onZoom: (zoomLevel, panX, panY) => {
            // Update stroke widths when zoom changes
            updateStrokeWidths(zoomLevel);
        },
    });

    // Get layer references
    const panelLayer = mainCanvasManager.getLayer("panel");
    bitsLayer = mainCanvasManager.getLayer("bits");
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");

    // Add panel rectangle to layer
    panelLayer.appendChild(partSection);

    // Add part front rectangle to layer
    panelLayer.appendChild(partFront);

    // Create part path
    partPath = document.createElementNS(svgNS, "path");
    partPath.id = "part-path";
    partPath.setAttribute("fill", "rgba(71, 64, 64, 0.16)");
    partPath.setAttribute("stroke", "black");
    partPath.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    partPath.style.display = "none";
    panelLayer.appendChild(partPath);

    // Create panel anchor indicator (always visible)
    const panelAnchorIndicator = document.createElementNS(svgNS, "g");
    panelAnchorIndicator.id = "panel-anchor-indicator";
    panelLayer.appendChild(panelAnchorIndicator);

    // Initial draw of panel shape
    updatepanelShape();

    // Add zoom button event listeners
    document
        .getElementById("zoom-in-btn")
        .addEventListener("click", () => mainCanvasManager.zoomIn());
    document
        .getElementById("zoom-out-btn")
        .addEventListener("click", () => mainCanvasManager.zoomOut());
    document
        .getElementById("fit-scale-btn")
        .addEventListener("click", fitToScale);
    document
        .getElementById("zoom-selected-btn")
        .addEventListener("click", zoomToSelected);
    document
        .getElementById("toggle-grid-btn")
        .addEventListener("click", () => mainCanvasManager.toggleGrid());

    // Add grid scale input listener
    document.getElementById("grid-scale").addEventListener("blur", (e) => {
        const val = evaluateMathExpression(e.target.value);
        e.target.value = val;
        gridSize = parseFloat(val) || 1;
        // Update grid size in canvas manager
        mainCanvasManager.config.gridSize = gridSize;
        // Update grid anchor position with new grid size
        updateGridAnchor();
        if (mainCanvasManager.gridEnabled) {
            mainCanvasManager.drawGrid();
        }
    });

    // Setup panel anchor button
    const panelAnchorBtn = document.getElementById("panel-anchor-btn");
    panelAnchorBtn.appendChild(createpanelAnchorButton(panelAnchor));
    panelAnchorBtn.addEventListener("click", cyclepanelAnchor);

    // Setup part button
    document
        .getElementById("part-btn")
        .addEventListener("click", togglePartView);

    // Setup bits visibility button
    const bitsBtn = document.getElementById("bits-btn");
    bitsBtn.addEventListener("click", toggleBitsVisibility);
    bitsBtn.classList.add("bits-visible"); // Initial state - bits are visible

    // Setup DXF export button
    document
        .getElementById("export-dxf-btn")
        .addEventListener("click", exportToDXF);

    // Setup operations toolbar buttons
    document
        .getElementById("save-btn")
        .addEventListener("click", saveBitPositions);
    document
        .getElementById("save-as-btn")
        .addEventListener("click", saveBitPositionsAs);
    document
        .getElementById("load-btn")
        .addEventListener("click", loadBitPositions);
    document
        .getElementById("clear-btn")
        .addEventListener("click", clearAllBits);

    // Add mouse event listeners for bit dragging
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    // Create BitsManager instance now that CanvasManager is available
    bitsManager = new BitsManager(mainCanvasManager);

    // Set up callbacks for BitsManager to communicate with main canvas
    bitsManager.onDrawBitShape = (bit, groupName) =>
        drawBitShape(
            bit,
            groupName,
            bitsManager.createBitShapeElement.bind(bitsManager)
        );
    bitsManager.onUpdateCanvasBits = (bitId) => updateCanvasBitsForBitId(bitId);

    // Setup export/import buttons
    document.getElementById("export-bits-btn").addEventListener("click", () => {
        import("./data/bitsStore.js").then((module) => {
            module.exportToJSON();
        });
    });

    document.getElementById("import-bits-btn").addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const jsonData = event.target.result;
                    import("./data/bitsStore.js").then((module) => {
                        const success = module.importFromJSON(jsonData);
                        if (success) {
                            // Refresh the bits manager and canvas
                            bitsManager.refreshBitGroups();
                            // Clear canvas and reload bits
                            bitsOnCanvas = [];
                            updateBitsSheet();
                            redrawBitsOnCanvas();
                        } else {
                            alert(
                                "Failed to import bits data. Please check the JSON format."
                            );
                        }
                    });
                };
                reader.readAsText(file);
            }
        };
        input.click();
    });
}

// Cycle panel anchor
function cyclepanelAnchor() {
    // Cycle between "top-left" and "bottom-left"
    panelAnchor = panelAnchor === "top-left" ? "bottom-left" : "top-left";

    // Update button icon
    const panelAnchorBtn = document.getElementById("panel-anchor-btn");
    panelAnchorBtn.innerHTML = "";
    panelAnchorBtn.appendChild(createpanelAnchorButton(panelAnchor));

    // Recalculate bit positions relative to new anchor
    updateBitsForNewAnchor();

    // Update grid anchor position
    updateGridAnchor();

    // Update indicator
    updatepanelAnchorIndicator();
}

// Update bit positions when panel anchor changes
function updateBitsForNewAnchor() {
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const oldAnchor = panelAnchor === "top-left" ? "bottom-left" : "top-left";
    const currentAnchorX = panelX;
    const currentAnchorY =
        oldAnchor === "top-left" ? panelY : panelY + panelThickness;
    const newAnchorX = panelX;
    const newAnchorY =
        panelAnchor === "top-left" ? panelY : panelY + panelThickness;

    bitsOnCanvas.forEach((bit) => {
        // Current physical position
        const physicalX = currentAnchorX + bit.x;
        const physicalY = currentAnchorY + bit.y;

        // New relative position based on new anchor
        const newX = physicalX - newAnchorX;
        const newY = physicalY - newAnchorY;

        // Update bit logical position
        bit.x = newX;
        bit.y = newY;

        // Update table
        updateBitsSheet();

        // Update canvas position
        const newAbsX = newAnchorX + newX;
        const newAbsY = newAnchorY + newY;
        const dx = newAbsX - bit.baseAbsX;
        const dy = newAbsY - bit.baseAbsY;
        bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);
    });
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();
}

// Update part front view
function updatepartFront() {
    // Position part front with 100mm gap from the panel rectangle using same anchor system
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const anchorOffset = getpanelAnchorOffset();

    // Position part front relative to panel anchor
    const anchorX = panelX + anchorOffset.x;
    const anchorY = panelY;

    partFront.setAttribute("x", anchorX);
    partFront.setAttribute("y", anchorY - panelHeight - 100); // 100mm gap above panel anchor
    partFront.setAttribute("width", panelWidth);
    partFront.setAttribute("height", panelHeight);
    partFront.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
    partFront.setAttribute("stroke", "black");
    partFront.setAttribute("stroke-width", getAdaptiveStrokeWidth());
}

// Update panel shape
function updatepanelShape() {
    partSection.setAttribute("x", (canvasParameters.width - panelWidth) / 2);
    partSection.setAttribute(
        "y",
        (canvasParameters.height - panelThickness) / 2
    );
    partSection.setAttribute("width", panelWidth);
    partSection.setAttribute("height", panelThickness);
    partSection.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
    partSection.setAttribute("stroke", "black");

    updatepartFront();
    updatepanelAnchorIndicator();
}

// Update panel anchor indicator (always visible)
function updatepanelAnchorIndicator() {
    const indicator = document.getElementById("panel-anchor-indicator");
    indicator.innerHTML = ""; // Clear

    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;

    let anchorX, anchorY;
    if (panelAnchor === "top-left") {
        anchorX = panelX;
        anchorY = panelY;
    } else if (panelAnchor === "bottom-left") {
        anchorX = panelX;
        anchorY = panelY + panelThickness;
    }

    // Draw a small cross
    const crossSize = 5;
    const thickness = Math.max(
        0.1,
        0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
    );
    const horizontal = document.createElementNS(svgNS, "line");
    horizontal.setAttribute("x1", anchorX - crossSize);
    horizontal.setAttribute("y1", anchorY);
    horizontal.setAttribute("x2", anchorX + crossSize);
    horizontal.setAttribute("y2", anchorY);
    horizontal.setAttribute("stroke", "red");
    horizontal.setAttribute("stroke-width", thickness);
    indicator.appendChild(horizontal);

    const vertical = document.createElementNS(svgNS, "line");
    vertical.setAttribute("x1", anchorX);
    vertical.setAttribute("y1", anchorY - crossSize);
    vertical.setAttribute("x2", anchorX);
    vertical.setAttribute("y2", anchorY + crossSize);
    vertical.setAttribute("stroke", "red");
    vertical.setAttribute("stroke-width", thickness);
    indicator.appendChild(vertical);
}

// Update grid anchor position
function updateGridAnchor() {
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const anchorOffset = getpanelAnchorOffset();
    const gridAnchorX = panelX + anchorOffset.x + gridSize / 2;
    const gridAnchorY = panelY + anchorOffset.y + gridSize / 2;

    if (mainCanvasManager) {
        mainCanvasManager.config.gridAnchorX = gridAnchorX;
        mainCanvasManager.config.gridAnchorY = gridAnchorY;
        if (mainCanvasManager.gridEnabled) {
            mainCanvasManager.drawGrid();
        }
    }
}

// Update panel parameters
function updatepanelParams() {
    // Update panel dimensions
    panelWidth = parseInt(panelWidthInput.value) || panelWidth;
    panelHeight = parseInt(panelHeightInput.value) || panelHeight;
    panelThickness = parseInt(panelThicknessInput.value) || panelThickness;

    updatepanelShape();
    updateBitsPositions();
    updateGridAnchor(); // Update grid anchor when panel changes
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();
}

// New: reposition all bits according to current panel anchor and their stored logical coords
function updateBitsPositions() {
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const anchorOffset = getpanelAnchorOffset();
    const anchorX = panelX + anchorOffset.x;
    const anchorY = panelY + anchorOffset.y;

    bitsOnCanvas.forEach((bit) => {
        // desired absolute position = anchor + logical coords
        const desiredAbsX = anchorX + (bit.x || 0);
        const desiredAbsY = anchorY + (bit.y || 0);

        // compute translation relative to the element's original absolute coords
        const dx = desiredAbsX - bit.baseAbsX;
        const dy = desiredAbsY - bit.baseAbsY;

        // apply transform to group's transform
        if (bit.group) {
            bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);
        }
    });

    // ensure canvas shows updated order/positions
    redrawBitsOnCanvas();
    if (showPart) updatePartShape();
}

// Global variables for bit management
let bitsOnCanvas = [];
let bitCounter = 0;
let dragSrcRow = null;
let bitsLayer;

// Offset contours for each bit
let offsetContours = [];

// Update phantom bits for all bits
function updatePhantomBits() {
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");
    phantomsLayer.innerHTML = ""; // Clear all phantom bits

    // Calculate panel anchor position for positioning phantom bits
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const anchorOffset = getpanelAnchorOffset();
    const anchorX = panelX + anchorOffset.x;
    const anchorY = panelY + anchorOffset.y;

    bitsOnCanvas.forEach((bit, index) => {
        if (bit.operation === "VC") {
            // V-Carve operation: multiple passes
            const angle = bit.bitData.angle || 90;
            const bitY = bit.y;
            // Calculate conical bit height: height = (diameter / 2) / tan(angle / 2)
            const hypotenuse = bit.bitData.diameter || 10;
            const bitHeight =
                (hypotenuse / 2) * (1 / Math.tan(angleToRad(angle) / 2));

            // Calculate number of passes
            const passes = bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

            // Calculate partial results (depth values)
            const partialResults = [];
            for (let i = 0; i < passes; i++) {
                partialResults.push((bitY * (i + 1)) / passes);
            }

            // Draw phantom bits if passes > 1
            if (passes > 1) {
                // Calculate offsets for each pass (same logic as in updateOffsetContours)
                const offsets = partialResults.map((value) => {
                    const offsetValue = value * Math.tan(angleToRad(angle / 2));
                    return bit.x - offsetValue; // Offset from center
                });
                offsets.reverse(); // Reverse to start from outermost pass

                offsets.forEach((offsetDistance, passIndex) => {
                    if (passIndex === passes - 1) return; // skip the last one (real bit)

                    // Create phantom bit at offset position with depth from partial results
                    const phantomBitData = {
                        ...bit.bitData,
                        fillColor: "rgba(128, 128, 128, 0.1)", // Gray with 0.1 opacity
                    };

                    // Position phantom bit at offset x, depth y relative to panel anchor
                    const phantomAbsX = anchorX + offsets[passIndex + 1];
                    const phantomAbsY = anchorY + partialResults[passIndex];

                    const phantomShape = bitsManager.createBitShapeElement(
                        phantomBitData,
                        bit.groupName,
                        phantomAbsX,
                        phantomAbsY,
                        false // not selected
                    );

                    // Set gray stroke for phantom
                    phantomShape.setAttribute("stroke", "gray");
                    phantomShape.setAttribute(
                        "stroke-width",
                        getAdaptiveStrokeWidth()
                    );
                    phantomShape.setAttribute(
                        "fill",
                        "rgba(128, 128, 128, 0.1)"
                    );
                    phantomShape.classList.add("phantom-bit");

                    phantomsLayer.appendChild(phantomShape);
                });
            }
        }
    });
}

// Update offset contours for all bits
function updateOffsetContours() {
    const offsetsLayer = mainCanvasManager.getLayer("offsets");
    offsetsLayer.innerHTML = ""; // Clear all offset contours

    // Clear the offset contours array
    offsetContours = [];

    // Calculate panel anchor position for positioning phantom bits
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const anchorOffset = getpanelAnchorOffset();
    const anchorX = panelX + anchorOffset.x;
    const anchorY = panelY + anchorOffset.y;

    // Create offset calculator instance
    const offsetCalculator = new OffsetCalculator();

    // Get the original partFront rectangle points
    const partFrontPoints = offsetCalculator.rectToPoints(partFront);

    bitsOnCanvas.forEach((bit, index) => {
        if (bit.operation === "VC") {
            // V-Carve operation: multiple passes
            const angle = bit.bitData.angle || 90;
            const bitY = bit.y;
            // Calculate conical bit height: height = (diameter / 2) / tan(angle / 2)
            const hypotenuse = bit.bitData.diameter || 10;
            const bitHeight =
                (hypotenuse / 2) * (1 / Math.tan(angleToRad(angle) / 2));

            // Calculate number of passes
            const passes = bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

            // Calculate partial results (depth values)
            const partialResults = [];
            for (let i = 0; i < passes; i++) {
                partialResults.push((bitY * (i + 1)) / passes);
            }
            // Calculate offsets for each pass
            const offsets = partialResults.map((value) => {
                const offsetValue = value * Math.tan(angleToRad(angle / 2));
                return bit.x - offsetValue; // Offset from center
            });
            offsets.reverse(); // Reverse to start from outermost pass

            // Add base offset at bit.x (black, default layer)
            if (partFrontPoints && partFrontPoints.length > 0) {
                const baseOffsetPoints = offsetCalculator.calculateOffset(
                    partFrontPoints,
                    bit.x
                );
                if (baseOffsetPoints && baseOffsetPoints.length > 0) {
                    const pathData =
                        baseOffsetPoints
                            .map((point, i) =>
                                i === 0
                                    ? `M ${point.x} ${point.y}`
                                    : `L ${point.x} ${point.y}`
                            )
                            .join(" ") + " Z";

                    const baseContour = document.createElementNS(svgNS, "path");
                    baseContour.setAttribute("d", pathData);
                    baseContour.setAttribute("fill", "none");
                    baseContour.setAttribute("stroke", "black"); // Black for base
                    baseContour.setAttribute(
                        "stroke-width",
                        getAdaptiveStrokeWidth()
                    );
                    baseContour.setAttribute("stroke-dasharray", "5,5");
                    baseContour.classList.add("offset-contour");
                    offsetsLayer.appendChild(baseContour);

                    offsetContours.push({
                        element: baseContour,
                        bitIndex: index,
                        offsetDistance: bit.x,
                        operation: "VC",
                        pass: 0,
                    });
                }
            }

            // V-Carve offset
            const offsetPoints = offsetCalculator.calculateOffset(
                partFrontPoints,
                offsets[0]
            );

            if (offsetPoints && offsetPoints.length > 0) {
                const pathData =
                    offsetPoints
                        .map((point, i) =>
                            i === 0
                                ? `M ${point.x} ${point.y}`
                                : `L ${point.x} ${point.y}`
                        )
                        .join(" ") + " Z";

                const offsetContour = document.createElementNS(svgNS, "path");
                offsetContour.setAttribute("d", pathData);
                offsetContour.setAttribute("fill", "none");
                offsetContour.setAttribute("stroke", bit.color || "#cccccc");
                offsetContour.setAttribute(
                    "stroke-width",
                    getAdaptiveStrokeWidth()
                );
                offsetContour.setAttribute("stroke-dasharray", "5,5");
                offsetContour.classList.add("offset-contour");
                offsetsLayer.appendChild(offsetContour);

                offsetContours.push({
                    element: offsetContour,
                    bitIndex: index,
                    offsetDistance: offsets[0],
                    operation: "VC",
                    pass: 1,
                    depth: bit.y, // Save depth for DXF export
                });
            }
        } else {
            // Standard operations: AL, OU, IN
            let offsetDistance = bit.x;
            if (bit.operation === "OU") {
                offsetDistance = bit.x + (bit.bitData.diameter || 0) / 2;
            } else if (bit.operation === "IN") {
                offsetDistance = bit.x - (bit.bitData.diameter || 0) / 2;
            }
            // AL uses bit.x as is

            const offsetPoints = offsetCalculator.calculateOffset(
                partFrontPoints,
                offsetDistance
            );

            if (offsetPoints && offsetPoints.length > 0) {
                const pathData =
                    offsetPoints
                        .map((point, i) =>
                            i === 0
                                ? `M ${point.x} ${point.y}`
                                : `L ${point.x} ${point.y}`
                        )
                        .join(" ") + " Z";

                const offsetContour = document.createElementNS(svgNS, "path");
                offsetContour.setAttribute("d", pathData);
                offsetContour.setAttribute("fill", "none");
                offsetContour.setAttribute("stroke", bit.color || "#cccccc");
                offsetContour.setAttribute(
                    "stroke-width",
                    getAdaptiveStrokeWidth()
                );
                offsetContour.setAttribute("stroke-dasharray", "5,5");
                offsetContour.classList.add("offset-contour");
                offsetsLayer.appendChild(offsetContour);

                offsetContours.push({
                    element: offsetContour,
                    bitIndex: index,
                    offsetDistance: offsetDistance,
                });
            }
        }
    });
}

// Alignment states: 'center', 'left', 'right'
const alignmentStates = ["center", "left", "right"];

// Create alignment button SVG
function createAlignmentButton(alignment) {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.style.cursor = "pointer";

    // Background rectangle
    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("width", "20");
    bg.setAttribute("height", "20");
    bg.setAttribute("fill", "white");
    bg.setAttribute("stroke", "black");
    bg.setAttribute("stroke-width", "1");
    svg.appendChild(bg);

    // Draw alignment indicator
    if (alignment === "center") {
        // Center line (vertical dashed)
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "10");
        line.setAttribute("y1", "3");
        line.setAttribute("x2", "10");
        line.setAttribute("y2", "17");
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "2,2");
        svg.appendChild(line);

        // Center square
        const square = document.createElementNS(svgNS, "rect");
        square.setAttribute("x", "7");
        square.setAttribute("y", "8");
        square.setAttribute("width", "6");
        square.setAttribute("height", "4");
        square.setAttribute("fill", "black");
        svg.appendChild(square);
    } else if (alignment === "left") {
        // Left line (vertical dashed)
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "5");
        line.setAttribute("y1", "3");
        line.setAttribute("x2", "5");
        line.setAttribute("y2", "17");
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "2,2");
        svg.appendChild(line);

        // Left square
        const square = document.createElementNS(svgNS, "rect");
        square.setAttribute("x", "2");
        square.setAttribute("y", "8");
        square.setAttribute("width", "6");
        square.setAttribute("height", "4");
        square.setAttribute("fill", "black");
        svg.appendChild(square);
    } else if (alignment === "right") {
        // Right line (vertical dashed)
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "15");
        line.setAttribute("y1", "3");
        line.setAttribute("x2", "15");
        line.setAttribute("y2", "17");
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "2,2");
        svg.appendChild(line);

        // Right square
        const square = document.createElementNS(svgNS, "rect");
        square.setAttribute("x", "12");
        square.setAttribute("y", "8");
        square.setAttribute("width", "6");
        square.setAttribute("height", "4");
        square.setAttribute("fill", "black");
        svg.appendChild(square);
    }

    return svg;
}

// Create panel anchor button SVG
function createpanelAnchorButton(anchor) {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.style.cursor = "pointer";

    // Background rectangle (panel)
    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("width", "20");
    bg.setAttribute("height", "20");
    bg.setAttribute("fill", "rgba(155, 155, 155, 0.5)");
    bg.setAttribute("stroke", "black");
    bg.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    svg.appendChild(bg);

    // Red cross at the anchor position
    const crossSize = 2;
    let crossX, crossY;
    if (anchor === "top-left") {
        crossX = 3;
        crossY = 3;
    } else if (anchor === "bottom-left") {
        crossX = 3;
        crossY = 17;
    }

    const horizontal = document.createElementNS(svgNS, "line");
    horizontal.setAttribute("x1", crossX - crossSize);
    horizontal.setAttribute("y1", crossY);
    horizontal.setAttribute("x2", crossX + crossSize);
    horizontal.setAttribute("y2", crossY);
    horizontal.setAttribute("stroke", "red");
    horizontal.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    svg.appendChild(horizontal);

    const vertical = document.createElementNS(svgNS, "line");
    vertical.setAttribute("x1", crossX);
    vertical.setAttribute("y1", crossY - crossSize);
    vertical.setAttribute("x2", crossX);
    vertical.setAttribute("y2", crossY + crossSize);
    vertical.setAttribute("stroke", "red");
    vertical.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    svg.appendChild(vertical);

    return svg;
}

// Update canvas bits when a bit in the library is changed
function updateCanvasBitsForBitId(bitId) {
    // Get the updated bit from the library
    const allBits = getBits();
    let updatedBitData = null;
    for (const group in allBits) {
        const found = allBits[group].find((b) => b.id === bitId);
        if (found) {
            updatedBitData = found;
            break;
        }
    }
    if (!updatedBitData) return;

    bitsOnCanvas.forEach((bit, index) => {
        if (bit.bitData.id === bitId) {
            // Update reference to the new bit data
            bit.bitData = updatedBitData;
            // Update name
            bit.name = updatedBitData.name;

            // Redraw shape with correct selection state
            const oldShape = bit.group.querySelector(".bit-shape");
            if (oldShape) {
                bit.group.removeChild(oldShape);
            }
            const isSelected = selectedBitIndices.includes(index);
            const newShape = bitsManager.createBitShapeElement(
                updatedBitData,
                bit.groupName,
                bit.baseAbsX,
                bit.baseAbsY,
                isSelected
            );

            // Apply highlight stroke if selected
            if (isSelected) {
                newShape.setAttribute("stroke", "#00BFFF"); // Deep sky blue
                const thickness = Math.max(
                    0.1,
                    0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
                );
                newShape.setAttribute("stroke-width", thickness);
            }

            bit.group.insertBefore(newShape, bit.group.firstChild); // insert before anchor point if exists
        }
    });

    // Update the table
    updateBitsSheet();
    if (showPart) updatePartShape();
}

// Draw bit shape
function drawBitShape(bit, groupName, createBitShapeElementFn) {
    const bitsLayer = document.getElementById("bits-layer");

    updatepanelParams();
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const centerX = panelX + panelWidth / 2;
    const centerY = panelY;

    // create shape at absolute coords, wrap in group so we can translate later
    const shape = createBitShapeElementFn(bit, groupName, centerX, centerY);
    const g = document.createElementNS(svgNS, "g");
    g.appendChild(shape);
    // store transform relative to creation point
    g.setAttribute("transform", `translate(0, 0)`);
    bitsLayer.appendChild(g);

    bitCounter++;

    const x = centerX - panelX;
    const y = centerY - panelY;

    const newBit = {
        number: bitCounter,
        name: bit.name,
        x: x,
        y: y,
        alignment: "center", // default alignment
        operation: "AL", // default operation
        color: bit.fillColor || "#cccccc", // default color from bit data
        group: g, // group that contains the shape
        baseAbsX: centerX, // absolute coords where shape was created
        baseAbsY: centerY,
        bitData: bit,
        groupName: groupName, // store the group name for updates
    };
    bitsOnCanvas.push(newBit);
    updateBitsSheet();
    updateStrokeWidths();
    updateOffsetContours();
    if (showPart) updatePartShape();
}

// Update bits sheet
function updateBitsSheet() {
    const sheetBody = document.getElementById("bits-sheet-body");
    sheetBody.innerHTML = "";

    bitsOnCanvas.forEach((bit, index) => {
        const row = document.createElement("tr");
        row.setAttribute("data-index", index);

        // Add click handler for row selection (but NOT on inputs, buttons, selects or interactive elements)
        row.addEventListener("click", (e) => {
            // Don't select if clicking on input, button, select, svg or other interactive elements
            if (
                e.target.tagName === "INPUT" ||
                e.target.tagName === "SELECT" ||
                e.target.closest("button") ||
                e.target.closest("svg") ||
                e.target.closest("option")
            ) {
                return;
            }
            e.stopPropagation();
            selectBit(index);
        });

        // Drag handle cell (only this cell is draggable)
        const dragCell = document.createElement("td");
        dragCell.className = "drag-handle";
        dragCell.draggable = true;
        dragCell.textContent = "☰";
        dragCell.addEventListener("dragstart", handleDragStart);
        dragCell.addEventListener("dragend", handleDragEnd);
        row.appendChild(dragCell);

        // Number
        const numCell = document.createElement("td");
        numCell.textContent = index + 1;
        row.appendChild(numCell);

        // Name
        const nameCell = document.createElement("td");
        nameCell.textContent = bit.name;
        row.appendChild(nameCell);

        // X editable
        const xCell = document.createElement("td");
        const xInput = document.createElement("input");
        xInput.type = "text";
        const anchorOffset = getAnchorOffset(bit);
        xInput.value = bit.x + anchorOffset.x;
        xInput.addEventListener("change", () => {
            const val = evaluateMathExpression(xInput.value);
            xInput.value = val;
            const newAnchorX = parseFloat(val) || 0;
            const newX = newAnchorX - anchorOffset.x;
            updateBitPosition(index, newX, bit.y);
        });
        xCell.appendChild(xInput);
        row.appendChild(xCell);

        // Y editable
        const yCell = document.createElement("td");
        const yInput = document.createElement("input");
        yInput.type = "text";
        yInput.value = bit.y + anchorOffset.y;
        yInput.addEventListener("change", () => {
            const val = evaluateMathExpression(yInput.value);
            yInput.value = val;
            const newAnchorY = parseFloat(val) || 0;
            const newY = newAnchorY - anchorOffset.y;
            updateBitPosition(index, bit.x, newY);
        });
        yCell.appendChild(yInput);
        row.appendChild(yCell);

        // Alignment button
        const alignCell = document.createElement("td");
        const alignBtn = document.createElement("button");
        alignBtn.type = "button";
        alignBtn.style.background = "none";
        alignBtn.style.border = "none";
        alignBtn.style.padding = "0";
        alignBtn.style.cursor = "pointer";
        alignBtn.appendChild(createAlignmentButton(bit.alignment || "center"));
        alignBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            cycleAlignment(index);
        });
        alignCell.appendChild(alignBtn);
        row.appendChild(alignCell);

        // Operations dropdown
        const opCell = document.createElement("td");
        const opSelect = document.createElement("select");
        opSelect.style.width = "100%";
        opSelect.style.padding = "2px";
        opSelect.style.border = "1px solid #ccc";
        opSelect.style.borderRadius = "3px";

        // Get operations for this bit's group
        const groupOperations = getOperationsForGroup(bit.groupName);
        const operationLabels = {
            AL: "Profile Along",
            OU: "Profile Outside",
            IN: "Profile Inside",
            VC: "V-Carve",
            PO: "Pocketing",
            RE: "Re-Machining",
            TS: "T-Slotting",
            DR: "Drill",
        };

        groupOperations.forEach((opValue) => {
            const option = document.createElement("option");
            option.value = opValue;
            option.textContent = operationLabels[opValue] || opValue;
            if (bit.operation === opValue) {
                option.selected = true;
            }
            opSelect.appendChild(option);
        });

        opSelect.addEventListener("change", () => {
            bit.operation = opSelect.value;
            updateOffsetContours(); // Update offsets when operation changes
            updatePhantomBits(); // Update phantom bits when operation changes
        });

        opCell.appendChild(opSelect);
        row.appendChild(opCell);

        // Color picker
        const colorCell = document.createElement("td");
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = bit.color || "#cccccc";
        colorInput.style.width = "40px";
        colorInput.style.height = "25px";
        colorInput.style.border = "1px solid #ccc";
        colorInput.style.borderRadius = "3px";
        colorInput.style.cursor = "pointer";

        colorInput.addEventListener("input", () => {
            bit.color = colorInput.value;
            // Note: bit.bitData.fillColor remains unchanged (database default color)

            // Redraw bit shape with new display color
            const oldShape = bit.group?.querySelector(".bit-shape");
            if (oldShape) {
                // Create shape with display color instead of default color
                const bitDataWithDisplayColor = {
                    ...bit.bitData,
                    fillColor: bit.color,
                };
                const newShape = bitsManager.createBitShapeElement(
                    bitDataWithDisplayColor,
                    bit.groupName,
                    bit.baseAbsX,
                    bit.baseAbsY,
                    selectedBitIndices.includes(index) // Keep selected state
                );
                bit.group.replaceChild(newShape, oldShape);
            }

            // Update offset contour color
            updateOffsetContours();
            updatePhantomBits();
        });

        colorCell.appendChild(colorInput);
        row.appendChild(colorCell);

        // Delete button
        const delCell = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "del-btn";
        delBtn.textContent = "✕";
        delBtn.title = "Delete bit from canvas";
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteBitFromCanvas(index);
        });
        delCell.appendChild(delBtn);
        row.appendChild(delCell);

        // Row drop/dragover handlers (drop allowed anywhere on row)
        row.addEventListener("dragover", handleDragOver);
        row.addEventListener("drop", handleDrop);

        // Apply selection style if this bit is selected
        if (selectedBitIndices.includes(index)) {
            row.classList.add("selected-bit-row");
        }

        sheetBody.appendChild(row);
    });

    // Add click handler to clear selection when clicking on empty area in right-menu
    const rightMenu = document.getElementById("right-menu");
    if (rightMenu) {
        rightMenu.addEventListener("click", (e) => {
            // Only clear selection if clicking on the right-menu itself or its padding,
            // not on interactive elements within it
            const isInteractiveElement = e.target.closest(
                "input, button, svg, tr, td, th"
            );
            if (!isInteractiveElement) {
                // Clear all selections
                selectedBitIndices.forEach((index) => {
                    resetBitHighlight(index);
                });
                selectedBitIndices = [];

                // Update table row highlighting
                updateBitsSheet();
                // Update anchor point visibility
                redrawBitsOnCanvas();
            }
        });
    }
}

// Delete bit from canvas
function deleteBitFromCanvas(index) {
    if (index < 0 || index >= bitsOnCanvas.length) return;

    const bit = bitsOnCanvas[index];

    // Remove from canvas
    if (bit.group && bit.group.parentNode) {
        bit.group.parentNode.removeChild(bit.group);
    }

    // Remove from array
    bitsOnCanvas.splice(index, 1);

    // Update selection indices - remove deleted bit and adjust indices
    selectedBitIndices = selectedBitIndices
        .filter((selectedIndex) => selectedIndex !== index) // Remove the deleted bit
        .map((selectedIndex) =>
            selectedIndex > index ? selectedIndex - 1 : selectedIndex
        ); // Adjust indices

    // Update table
    updateBitsSheet();
    redrawBitsOnCanvas();
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();
}

// Cycle alignment state
function cycleAlignment(index) {
    const bit = bitsOnCanvas[index];
    if (!bit) return;

    // Cycle to next alignment state
    const currentIdx = alignmentStates.indexOf(bit.alignment || "center");
    const nextIdx = (currentIdx + 1) % alignmentStates.length;
    const newAlignment = alignmentStates[nextIdx];

    // Calculate offset adjustment to keep anchor position the same
    const oldOffset = getAnchorOffset(bit);
    bit.alignment = newAlignment;
    const newOffset = getAnchorOffset(bit);
    const deltaX = oldOffset.x - newOffset.x;
    const deltaY = oldOffset.y - newOffset.y;

    if (deltaX !== 0 || deltaY !== 0) {
        const newX = bit.x + deltaX;
        const newY = bit.y + deltaY;
        updateBitPosition(index, newX, newY);
    }

    // Update the table to show new alignment button
    updateBitsSheet();

    // Recalculate part shape if part view is enabled
    if (showPart) updatePartShape();
}

// Select a bit and highlight it on canvas (multi-selection support)
function selectBit(index) {
    const indexInSelection = selectedBitIndices.indexOf(index);

    if (indexInSelection !== -1) {
        // Bit is already selected, deselect it
        selectedBitIndices.splice(indexInSelection, 1);
        resetBitHighlight(index);
    } else {
        // Bit is not selected, add it to selection
        selectedBitIndices.push(index);
        const bit = bitsOnCanvas[index];

        if (bit && bit.group) {
            // Find the shape element in the group
            const shape = bit.group.querySelector(".bit-shape");
            if (shape) {
                // Store original attributes
                shape.dataset.originalFill = shape.getAttribute("fill");
                shape.dataset.originalStroke = shape.getAttribute("stroke");

                // Redraw shape with selected state (0.6 opacity) using display color
                const oldShape = shape;
                const bitDataWithDisplayColor = {
                    ...bit.bitData,
                    fillColor: bit.color,
                };
                const newShape = bitsManager.createBitShapeElement(
                    bitDataWithDisplayColor,
                    bit.groupName,
                    bit.baseAbsX,
                    bit.baseAbsY,
                    true // isSelected = true for highlighting
                );

                // Replace old shape with new one
                bit.group.replaceChild(newShape, oldShape);

                // Apply highlight stroke
                newShape.setAttribute("stroke", "#00BFFF"); // Deep sky blue
                const thickness = Math.max(
                    0.1,
                    0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
                );
                newShape.setAttribute("stroke-width", thickness);
            }
        }
    }

    // Update table row highlighting
    updateBitsSheet();
    // Update anchor point visibility
    redrawBitsOnCanvas();
}

// Reset bit highlight to original state
function resetBitHighlight(index) {
    const bit = bitsOnCanvas[index];
    if (bit && bit.group) {
        const shape = bit.group.querySelector(".bit-shape");
        if (shape) {
            // Redraw shape with normal state (0.3 opacity) using display color
            const oldShape = shape;
            const bitDataWithDisplayColor = {
                ...bit.bitData,
                fillColor: bit.color,
            };
            const newShape = bitsManager.createBitShapeElement(
                bitDataWithDisplayColor,
                bit.groupName,
                bit.baseAbsX,
                bit.baseAbsY,
                false // isSelected = false for normal state
            );

            // Replace old shape with new one
            bit.group.replaceChild(newShape, oldShape);

            // Set to scaled thickness
            const thickness = Math.max(
                0.1,
                0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
            );
            newShape.setAttribute("stroke-width", thickness);
        }
    }
}

function updateBitPosition(index, newX, newY) {
    // update panel params to get correct panel origin
    updatepanelParams();
    const panelAnchorOffset = getpanelAnchorOffset();
    const panelAnchorX =
        (canvasParameters.width - panelWidth) / 2 + panelAnchorOffset.x;
    const panelAnchorY =
        (canvasParameters.height - panelThickness) / 2 + panelAnchorOffset.y;

    // If this bit is selected and there are multiple selections, move all selected bits by the same delta
    if (selectedBitIndices.includes(index) && selectedBitIndices.length > 1) {
        const bit = bitsOnCanvas[index];
        const oldX = bit.x;
        const oldY = bit.y;
        const deltaX = newX - oldX;
        const deltaY = newY - oldY;

        // Move all selected bits by the same delta
        selectedBitIndices.forEach((selectedIndex) => {
            if (selectedIndex !== index) {
                // Skip the current bit as it's handled below
                const selectedBit = bitsOnCanvas[selectedIndex];
                const selectedNewX = selectedBit.x + deltaX;
                const selectedNewY = selectedBit.y + deltaY;

                // Update selected bit position
                const selectedNewAbsX = panelAnchorX + selectedNewX;
                const selectedNewAbsY = panelAnchorY + selectedNewY;
                const selectedDx = selectedNewAbsX - selectedBit.baseAbsX;
                const selectedDy = selectedNewAbsY - selectedBit.baseAbsY;

                selectedBit.group.setAttribute(
                    "transform",
                    `translate(${selectedDx}, ${selectedDy})`
                );
                selectedBit.x = selectedNewX;
                selectedBit.y = selectedNewY;
            }
        });

        // Update table coordinates for all moved bits
        selectedBitIndices.forEach((selectedIndex) => {
            updateTableCoordinates(
                selectedIndex,
                bitsOnCanvas[selectedIndex].x,
                bitsOnCanvas[selectedIndex].y
            );
        });
    }

    const bit = bitsOnCanvas[index];
    // compute absolute positions the user expects (relative to panel anchor)
    const newAbsX = panelAnchorX + newX;
    const newAbsY = panelAnchorY + newY;

    // compute translation relative to base creation coordinates
    const dx = newAbsX - bit.baseAbsX;
    const dy = newAbsY - bit.baseAbsY;

    // apply transform to group's transform
    bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);

    // save new logical positions
    bit.x = newX;
    bit.y = newY;

    // DO NOT call updateBitsSheet() here - it recreates inputs and breaks focus
    // redraw layer order if needed
    redrawBitsOnCanvas();
    updateOffsetContours();
    updatePhantomBits();
    // Update part shape if part view is enabled and bits were moved via table coordinates
    if (showPart) updatePartShape();
}

function handleDragStart(e) {
    // this is the drag-handle cell; find its row
    dragSrcRow = this.closest("tr");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragSrcRow.getAttribute("data-index"));
    dragSrcRow.style.opacity = "0.4";
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    // this is the row where drop occurs
    if (!dragSrcRow) return false;
    const srcIndex = parseInt(dragSrcRow.getAttribute("data-index"), 10);
    const destIndex = parseInt(this.getAttribute("data-index"), 10);

    if (srcIndex !== destIndex) {
        const [removed] = bitsOnCanvas.splice(srcIndex, 1);
        bitsOnCanvas.splice(destIndex, 0, removed);

        // Update selectedBitIndices if selected bits were moved
        selectedBitIndices = selectedBitIndices.map((selectedIndex) => {
            if (selectedIndex === srcIndex) {
                return destIndex; // The moved bit stays selected at new position
            } else if (selectedIndex > srcIndex && selectedIndex <= destIndex) {
                return selectedIndex - 1; // Adjust indices when bit moves down
            } else if (selectedIndex >= destIndex && selectedIndex < srcIndex) {
                return selectedIndex + 1; // Adjust indices when bit moves up
            }
            return selectedIndex;
        });

        // update sheet and canvas
        updateBitsSheet();
        redrawBitsOnCanvas();
    }

    return false;
}

function handleDragEnd(e) {
    if (dragSrcRow) dragSrcRow.style.opacity = "1";
    dragSrcRow = null;
}

// Redraw bits on canvas preserving their group transforms
function redrawBitsOnCanvas() {
    const bitsLayer = document.getElementById("bits-layer");
    bitsLayer.innerHTML = ""; // Clear all bits

    bitsOnCanvas.forEach((bit, index) => {
        bit.number = index + 1; // Update bit number
        // append group (contains shape and transform)
        bitsLayer.appendChild(bit.group);

        // Remove existing anchor points
        bit.group
            .querySelectorAll(".anchor-point")
            .forEach((ap) => ap.remove());

        // Add anchor point visualization
        const anchorPoint = document.createElementNS(svgNS, "g");
        anchorPoint.classList.add("anchor-point");

        // Create a small cross or circle at the anchor point
        const anchorOffset = getAnchorOffset(bit);
        const anchorX = anchorOffset.x + bit.baseAbsX;
        const anchorY = anchorOffset.y + bit.baseAbsY;

        // Draw a small cross
        const crossSize = 3;
        const thickness = Math.max(
            0.1,
            0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
        );
        const horizontal = document.createElementNS(svgNS, "line");
        horizontal.setAttribute("x1", anchorX - crossSize);
        horizontal.setAttribute("y1", anchorY);
        horizontal.setAttribute("x2", anchorX + crossSize);
        horizontal.setAttribute("y2", anchorY);
        horizontal.setAttribute("stroke", "red");
        horizontal.setAttribute("stroke-width", thickness);
        anchorPoint.appendChild(horizontal);

        const vertical = document.createElementNS(svgNS, "line");
        vertical.setAttribute("x1", anchorX);
        vertical.setAttribute("y1", anchorY - crossSize);
        vertical.setAttribute("x2", anchorX);
        vertical.setAttribute("y2", anchorY + crossSize);
        vertical.setAttribute("stroke", "red");
        vertical.setAttribute("stroke-width", thickness);
        anchorPoint.appendChild(vertical);

        // Only show anchor point for selected bits
        if (selectedBitIndices.includes(index)) {
            anchorPoint.setAttribute("visibility", "visible");
        } else {
            anchorPoint.setAttribute("visibility", "hidden");
        }

        bit.group.appendChild(anchorPoint);
    });
}

// ===== ZOOM AND PAN FUNCTIONS =====

// Get adaptive stroke width based on zoom level
function getAdaptiveStrokeWidth(zoomLevel = mainCanvasManager?.zoomLevel) {
    if (!zoomLevel) return 1; // Default fallback
    return Math.max(0.1, 0.5 / Math.sqrt(zoomLevel));
}

// Update stroke widths based on zoom level
function updateStrokeWidths(zoomLevel = mainCanvasManager?.zoomLevel) {
    if (!zoomLevel) return;
    const thickness = getAdaptiveStrokeWidth(zoomLevel);
    if (partSection) {
        partSection.setAttribute("stroke-width", thickness);
    }
    if (partFront) {
        partFront.setAttribute("stroke-width", thickness);
    }
    bitsOnCanvas.forEach((bit) => {
        const shape = bit.group?.querySelector(".bit-shape");
        if (shape) {
            shape.setAttribute("stroke-width", thickness);
        }
    });
    // Update offset contour stroke widths
    offsetContours.forEach((contour) => {
        if (contour.element) {
            contour.element.setAttribute("stroke-width", thickness);
        }
    });
}

function fitToScale() {
    // Initialize bounding box with panel rectangle
    let minX = (canvasParameters.width - panelWidth) / 2;
    let maxX = minX + panelWidth;
    let minY = (canvasParameters.height - panelThickness) / 2;
    let maxY = minY + panelThickness;

    // Include part front rectangle in bounds if it exists
    if (partFront) {
        const partFrontX = parseFloat(partFront.getAttribute("x"));
        const partFrontY = parseFloat(partFront.getAttribute("y"));
        const partFrontWidth = parseFloat(partFront.getAttribute("width"));
        const partFrontHeight = parseFloat(partFront.getAttribute("height"));

        minX = Math.min(minX, partFrontX);
        maxX = Math.max(maxX, partFrontX + partFrontWidth);
        minY = Math.min(minY, partFrontY);
        maxY = Math.max(maxY, partFrontY + partFrontHeight);
    }

    // Include all bits on canvas
    if (bitsOnCanvas.length > 0) {
        bitsOnCanvas.forEach((bit) => {
            if (bit.group) {
                // Get the actual bounding box of the bit group
                const bbox = bit.group.getBBox();

                minX = Math.min(minX, bbox.x);
                maxX = Math.max(maxX, bbox.x + bbox.width);
                minY = Math.min(minY, bbox.y);
                maxY = Math.max(maxY, bbox.y + bbox.height);
            }
        });
    }

    // Include panel anchor indicator
    if (document.getElementById("panel-anchor-indicator")) {
        const anchorIndicator = document.getElementById(
            "panel-anchor-indicator"
        );
        const anchorBbox = anchorIndicator.getBBox();
        minX = Math.min(minX, anchorBbox.x);
        maxX = Math.max(maxX, anchorBbox.x + anchorBbox.width);
        minY = Math.min(minY, anchorBbox.y);
        maxY = Math.max(maxY, anchorBbox.y + anchorBbox.height);
    }

    // Add padding - extra 50mm for top/bottom menus
    const sidePadding = 20;
    const topBottomPadding = 100; // 50mm for top/bottom menus

    // Adjust min/max coordinates with different padding for top/bottom vs sides
    const adjustedMinX = minX - sidePadding;
    const adjustedMaxX = maxX + sidePadding;
    const adjustedMinY = minY - topBottomPadding;
    const adjustedMaxY = maxY + topBottomPadding;

    // Use CanvasManager's fitToScale method with adjusted bounds
    mainCanvasManager.fitToScale({
        minX: adjustedMinX,
        maxX: adjustedMaxX,
        minY: adjustedMinY,
        maxY: adjustedMaxY,
        padding: 0, // CanvasManager will handle padding internally if needed
    });
}

function zoomToSelected() {
    if (selectedBitIndices.length === 0) return;

    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    const anchorOffset = getpanelAnchorOffset();
    const anchorX = panelX + anchorOffset.x;
    const anchorY = panelY + anchorOffset.y;

    // Calculate bounding box for all selected bits
    let minX = Infinity,
        maxX = -Infinity;
    let minY = Infinity,
        maxY = -Infinity;

    selectedBitIndices.forEach((index) => {
        const bit = bitsOnCanvas[index];
        if (bit) {
            const bitData = bit.bitData;
            const bitAbsX = anchorX + bit.x;
            const bitAbsY = anchorY + bit.y;
            const bitWidth = bitData.diameter || 0;
            const bitHeight = bitData.length || 0;

            minX = Math.min(minX, bitAbsX - bitWidth / 2);
            maxX = Math.max(maxX, bitAbsX + bitWidth / 2);
            minY = Math.min(minY, bitAbsY - bitHeight);
            maxY = Math.max(maxY, bitAbsY);
        }
    });

    if (minX === Infinity) return; // No valid bits found

    // Add padding
    const padding = 20;
    const contentWidth = maxX - minX + 2 * padding;
    const contentHeight = maxY - minY + 2 * padding;

    // Calculate zoom level to fit all selected bits
    const availableWidth = canvasParameters.width - 100;
    const availableHeight = canvasParameters.height - 100;
    const zoomX = availableWidth / contentWidth;
    const zoomY = availableHeight / contentHeight;
    const zoomLevel = Math.min(zoomX, zoomY);

    // Center on the center of all selected bits
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Set zoom and pan using CanvasManager
    mainCanvasManager.zoomLevel = zoomLevel;
    mainCanvasManager.panX = centerX;
    mainCanvasManager.panY = centerY;
    mainCanvasManager.updateViewBox();
}

// toggleGrid is handled by CanvasManager

// Helper function to snap value to grid
function snapToGrid(value) {
    return Math.round(value / gridSize) * gridSize;
}

// Helper function to get panel anchor offset
function getpanelAnchorOffset() {
    return panelAnchor === "top-left"
        ? { x: 0, y: 0 }
        : { x: 0, y: panelThickness };
}

// Helper function to get anchor offset based on alignment
function getAnchorOffset(bit) {
    const bitData = bit.bitData;
    const halfDiameter = (bitData.diameter || 0) / 2;

    switch (bit.alignment) {
        case "left":
            return { x: -halfDiameter, y: 0 };
        case "right":
            return { x: halfDiameter, y: 0 };
        case "center":
        default:
            return { x: 0, y: 0 };
    }
}

// Mouse event handlers for bit dragging and panning
function handleMouseDown(e) {
    if (e.button === 0) {
        // Left mouse button
        const svgCoords = mainCanvasManager.screenToSvg(e.clientX, e.clientY);

        // Check if clicking on any bit (selected or not) - but only if bits are visible
        let clickedOnBit = false;
        if (bitsVisible) {
            for (let i = 0; i < bitsOnCanvas.length; i++) {
                const bit = bitsOnCanvas[i];
                if (bit) {
                    const panelX = (canvasParameters.width - panelWidth) / 2;
                    const panelY =
                        (canvasParameters.height - panelThickness) / 2;
                    const bitAbsX = panelX + bit.x;
                    const bitAbsY = panelY + bit.y;

                    // Check if click is near the bit (within 20px)
                    const distance = Math.sqrt(
                        (svgCoords.x - bitAbsX) ** 2 +
                            (svgCoords.y - bitAbsY) ** 2
                    );
                    if (distance <= 20) {
                        clickedOnBit = true;

                        // If clicking on a selected bit, prepare for potential deselection or dragging
                        if (selectedBitIndices.includes(i)) {
                            // Start dragging the selected bit
                            isDraggingBit = true;
                            draggedBitIndex = i;
                            dragStartX = svgCoords.x;
                            dragStartY = svgCoords.y;
                            dragStarted = false; // Reset flag
                            canvas.style.cursor = "grabbing";
                            return;
                        }
                        // If clicking on an unselected bit, select it (but don't start dragging)
                        else {
                            selectBit(i);
                            return;
                        }
                    }
                }
            }
        }

        // If clicked on empty canvas area, clear all selections
        if (!clickedOnBit && selectedBitIndices.length > 0) {
            selectedBitIndices.forEach((index) => {
                resetBitHighlight(index);
            });
            selectedBitIndices = [];
            updateBitsSheet();
            redrawBitsOnCanvas();
        }

        // Otherwise, start panning
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartPanX = mainCanvasManager.panX;
        panStartPanY = mainCanvasManager.panY;
        canvas.style.cursor = "grabbing";
    }
}

function handleMouseMove(e) {
    if (isDraggingBit && draggedBitIndex !== null) {
        // Set flag that drag has started
        dragStarted = true;

        const svgCoords = mainCanvasManager.screenToSvg(e.clientX, e.clientY);

        const bit = bitsOnCanvas[draggedBitIndex];
        const anchorOffset = getAnchorOffset(bit);

        // Calculate new position relative to panel anchor
        const panelAnchorOffset = getpanelAnchorOffset();
        const panelAnchorX =
            (canvasParameters.width - panelWidth) / 2 + panelAnchorOffset.x;
        const panelAnchorY =
            (canvasParameters.height - panelThickness) / 2 +
            panelAnchorOffset.y;

        // Calculate desired anchor position
        let anchorX = svgCoords.x - panelAnchorX;
        let anchorY = svgCoords.y - panelAnchorY;

        // Snap anchor to grid
        anchorX = mainCanvasManager.snapToGrid(anchorX);
        anchorY = mainCanvasManager.snapToGrid(anchorY);

        // Then center position = anchorX - anchorOffset.x
        let newX = anchorX - anchorOffset.x;
        let newY = anchorY - anchorOffset.y;

        // Update bit position
        updateBitPosition(draggedBitIndex, newX, newY);

        // Update table inputs
        updateTableCoordinates(draggedBitIndex, newX, newY);
    } else if (isPanning) {
        // Handle panning
        const deltaX = e.clientX - panStartX;
        const deltaY = e.clientY - panStartY;

        // Convert screen delta to SVG delta based on zoom level
        const svgDeltaX = deltaX / mainCanvasManager.zoomLevel;
        const svgDeltaY = deltaY / mainCanvasManager.zoomLevel;

        mainCanvasManager.panX = panStartPanX - svgDeltaX;
        mainCanvasManager.panY = panStartPanY - svgDeltaY;
        mainCanvasManager.updateViewBox();
    }
}

function handleMouseUp(e) {
    if (isDraggingBit) {
        isDraggingBit = false;

        // If drag didn't actually start (just a click), deselect the bit
        if (!dragStarted && draggedBitIndex !== null) {
            selectBit(draggedBitIndex);
        }

        draggedBitIndex = null;
        dragStarted = false; // Reset flag
        canvas.style.cursor = "grab";

        // Update part shape after dragging is complete only if Part view is enabled
        if (showPart) updatePartShape();
    } else if (isPanning) {
        isPanning = false;
        canvas.style.cursor = "grab";
    }
}

// Update table coordinates without recreating the entire table
function updateTableCoordinates(bitIndex, newX, newY) {
    const sheetBody = document.getElementById("bits-sheet-body");
    const rows = sheetBody.querySelectorAll("tr");

    if (rows[bitIndex]) {
        const cells = rows[bitIndex].querySelectorAll("td");
        const anchorOffset = getAnchorOffset(bitsOnCanvas[bitIndex]);
        if (cells[3]) {
            // X column
            const xInput = cells[3].querySelector("input");
            if (xInput) xInput.value = newX + anchorOffset.x;
        }
        if (cells[4]) {
            // Y column
            const yInput = cells[4].querySelector("input");
            if (yInput) yInput.value = newY + anchorOffset.y;
        }
    }
}

// Clipper functions for part subtraction
function getpanelPolygon() {
    const panelX = (canvasParameters.width - panelWidth) / 2;
    const panelY = (canvasParameters.height - panelThickness) / 2;
    return [
        {
            X: Math.round(panelX * CLIPPER_SCALE),
            Y: Math.round(panelY * CLIPPER_SCALE),
        },
        {
            X: Math.round((panelX + panelWidth) * CLIPPER_SCALE),
            Y: Math.round(panelY * CLIPPER_SCALE),
        },
        {
            X: Math.round((panelX + panelWidth) * CLIPPER_SCALE),
            Y: Math.round((panelY + panelThickness) * CLIPPER_SCALE),
        },
        {
            X: Math.round(panelX * CLIPPER_SCALE),
            Y: Math.round((panelY + panelThickness) * CLIPPER_SCALE),
        },
    ];
}

function getBitPolygon(bit) {
    const group = bit.group;
    const transform = group.getAttribute("transform");
    if (!transform) return [];
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (!match) return [];
    const dx = parseFloat(match[1]);
    const dy = parseFloat(match[2]);
    const shape = group.querySelector(".bit-shape");
    if (!shape) return [];
    return getShapePoints(shape, dx, dy);
}

function getShapePoints(shape, baseX, baseY) {
    let points = [];
    if (shape.tagName === "rect") {
        const x = parseFloat(shape.getAttribute("x")) + baseX;
        const y = parseFloat(shape.getAttribute("y")) + baseY;
        const w = parseFloat(shape.getAttribute("width"));
        const h = parseFloat(shape.getAttribute("height"));
        points = [
            { x: x, y: y },
            { x: x + w, y: y },
            { x: x + w, y: y + h },
            { x: x, y: y + h },
        ];
    } else if (shape.tagName === "polygon") {
        const pts = shape.getAttribute("points").trim().split(/\s+/);
        points = pts.map((p) => {
            const [px, py] = p.split(",").map(Number);
            return { x: px + baseX, y: py + baseY };
        });
    } else if (shape.tagName === "path") {
        const path = shape;
        const totalLength = path.getTotalLength();
        const numPoints = 200; // Increase sampling points
        for (let i = 0; i < numPoints; i++) {
            const length = (i / (numPoints - 1)) * totalLength;
            const point = path.getPointAtLength(length);
            points.push({ x: point.x + baseX, y: point.y + baseY });
        }
    }
    // Ensure counter-clockwise orientation
    points = ensureCounterClockwise(points);
    return points.map((p) => ({
        X: Math.round(p.x * CLIPPER_SCALE),
        Y: Math.round(p.y * CLIPPER_SCALE),
    }));
}

// Ensure polygon is oriented counter-clockwise
function ensureCounterClockwise(points) {
    if (points.length < 3) return points;

    // Calculate signed area
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y - points[j].x * points[i].y;
    }

    // If area is negative, polygon is clockwise, so reverse
    if (area < 0) {
        points.reverse();
    }

    return points;
}

function updatePartShape() {
    if (!window.ClipperLib) {
        console.error("ClipperLib not loaded");
        return;
    }

    // Don't perform calculations if Part view is not enabled
    if (!showPart) {
        return;
    }

    const ClipperLib = window.ClipperLib;
    const clipper = new ClipperLib.Clipper();
    const subj = new ClipperLib.Paths();
    subj.push(getpanelPolygon());
    const clip = new ClipperLib.Paths();
    bitsOnCanvas.forEach((bit) => {
        const poly = getBitPolygon(bit);
        if (poly.length > 0) clip.push(poly);
    });
    const unionBits = new ClipperLib.Paths();
    clipper.AddPaths(clip, ClipperLib.PolyType.ptSubject, true);
    clipper.Execute(
        ClipperLib.ClipType.ctUnion,
        unionBits,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
    );
    const result = new ClipperLib.Paths();
    clipper.Clear();
    clipper.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
    clipper.AddPaths(unionBits, ClipperLib.PolyType.ptClip, true);
    clipper.Execute(
        ClipperLib.ClipType.ctDifference,
        result,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
    );
    const d = pathsToSvgD(result, CLIPPER_SCALE);
    partPath.setAttribute("d", d);
}

function pathsToSvgD(paths, scale) {
    let d = "";
    paths.forEach((path) => {
        if (path.length > 0) {
            const start = path[0];
            d += `M ${start.X / scale} ${start.Y / scale}`;
            for (let i = 1; i < path.length; i++) {
                d += ` L ${path[i].X / scale} ${path[i].Y / scale}`;
            }
            d += " Z";
        }
    });
    return d;
}

// Toggle bits visibility
function toggleBitsVisibility() {
    bitsVisible = !bitsVisible;
    const bitsBtn = document.getElementById("bits-btn");
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");

    if (bitsVisible) {
        // Show bits and phantom bits
        bitsLayer.style.display = "block";
        phantomsLayer.style.display = "block";
        bitsBtn.classList.remove("bits-hidden");
        bitsBtn.classList.add("bits-visible");
        bitsBtn.title = "Hide Bits";
    } else {
        // Hide bits and phantom bits
        bitsLayer.style.display = "none";
        phantomsLayer.style.display = "none";
        bitsBtn.classList.remove("bits-visible");
        bitsBtn.classList.add("bits-hidden");
        bitsBtn.title = "Show Bits";
    }
}

function togglePartView() {
    if (!bitsLayer || !partSection || !partPath) {
        console.error("SVG elements not initialized");
        return;
    }

    showPart = !showPart;
    const partBtn = document.getElementById("part-btn");

    if (showPart) {
        updatePartShape();
        partSection.style.display = "none";
        partPath.style.display = "block";
        // Respect the bits visibility state
        bitsLayer.style.display = bitsVisible ? "block" : "none";
        partBtn.classList.remove("part-hidden");
        partBtn.classList.add("part-visible");
        partBtn.title = "Show Material";
    } else {
        partSection.style.display = "block";
        partPath.style.display = "none";
        // Respect the bits visibility state
        bitsLayer.style.display = bitsVisible ? "block" : "none";
        partBtn.classList.remove("part-visible");
        partBtn.classList.add("part-hidden");
        partBtn.title = "Show Part";
    }
}

// Initialize
function initialize() {
    initializeSVG();

    // Now that bitsManager is created, initialize the bit groups
    bitsManager.createBitGroups();

    // Initial update of offset contours and phantom bits (even if no bits are loaded yet)
    updateOffsetContours();
    updatePhantomBits();

    // Add event listeners for panel parameter inputs
    panelWidthInput.addEventListener("input", updatepanelParams);
    panelHeightInput.addEventListener("input", updatepanelParams);
    panelThicknessInput.addEventListener("input", updatepanelParams);

    // Add math evaluation on blur
    panelWidthInput.addEventListener("blur", () => {
        panelWidthInput.value = evaluateMathExpression(panelWidthInput.value);
        updatepanelParams();
    });
    panelHeightInput.addEventListener("blur", () => {
        panelHeightInput.value = evaluateMathExpression(panelHeightInput.value);
        updatepanelParams();
    });
    panelThicknessInput.addEventListener("blur", () => {
        panelThicknessInput.value = evaluateMathExpression(
            panelThicknessInput.value
        );
        updatepanelParams();
    });

    // Initial fit to scale after all initialization is complete
    requestAnimationFrame(() => {
        fitToScale();

        // Auto-load saved bit positions after everything is initialized
        setTimeout(async () => {
            const savedPositions = localStorage.getItem("bits_positions");
            if (savedPositions) {
                try {
                    const positionsData = JSON.parse(savedPositions);
                    if (positionsData.length > 0) {
                        const restoredCount = await restoreBitPositions(
                            positionsData
                        );
                        logOperation(
                            `Auto-loaded ${restoredCount} saved bit positions`
                        );
                        updateOffsetContours(); // Update offset contours after loading saved positions
                        updatePhantomBits(); // Update phantom bits after loading saved positions
                    }
                } catch (error) {
                    console.warn("Failed to load saved positions:", error);
                    logOperation("Failed to auto-load saved positions");
                }
            }
        }, 100); // Small delay to ensure everything is ready
    });
}

// Calculate result polygon using Clipper (same logic as updatePartShape but returns result)
function calculateResultPolygon() {
    if (!window.ClipperLib) {
        console.error("ClipperLib not loaded");
        return [];
    }

    const ClipperLib = window.ClipperLib;
    const clipper = new ClipperLib.Clipper();
    const subj = new ClipperLib.Paths();
    subj.push(getpanelPolygon());
    const clip = new ClipperLib.Paths();
    bitsOnCanvas.forEach((bit) => {
        const poly = getBitPolygon(bit);
        if (poly.length > 0) clip.push(poly);
    });
    const unionBits = new ClipperLib.Paths();
    clipper.AddPaths(clip, ClipperLib.PolyType.ptSubject, true);
    clipper.Execute(
        ClipperLib.ClipType.ctUnion,
        unionBits,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
    );
    const result = new ClipperLib.Paths();
    clipper.Clear();
    clipper.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
    clipper.AddPaths(unionBits, ClipperLib.PolyType.ptClip, true);
    clipper.Execute(
        ClipperLib.ClipType.ctDifference,
        result,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero
    );

    return result;
}

// Export to DXF function
function exportToDXF() {
    if (bitsOnCanvas.length === 0) {
        alert("No bits on canvas to export. Please add some bits first.");
        return;
    }

    // Get result polygon from Clipper
    const clipperResult = calculateResultPolygon();

    // Export to DXF with partFront, offset contours, and panel thickness
    const dxfContent = dxfExporter.exportToDXF(
        bitsOnCanvas,
        clipperResult,
        partFront,
        offsetContours,
        panelThickness
    );

    // Download the file
    dxfExporter.downloadDXF(dxfContent);

    console.log("DXF export completed. File downloaded.");
}

// Logging function for operations
function logOperation(message) {
    const logElement = document.getElementById("operations-log");
    const timestamp = new Date().toLocaleTimeString();
    logElement.textContent = `[${timestamp}] ${message}`;

    // Remove fade-out class if it exists
    logElement.classList.remove("fade-out");

    // Add fade-out class after 5 seconds
    setTimeout(() => {
        logElement.classList.add("fade-out");
    }, 5000);
}

// Save current bit positions to localStorage
function saveBitPositions() {
    const savedPositions = bitsOnCanvas.map((bit) => ({
        id: bit.bitData.id,
        x: bit.x,
        y: bit.y,
        alignment: bit.alignment,
        operation: bit.operation,
        color: bit.color,
    }));

    localStorage.setItem("bits_positions", JSON.stringify(savedPositions));
    logOperation(`Saved ${savedPositions.length} bit positions`);
}

// Save bit positions to JSON file
function saveBitPositionsAs() {
    const savedPositions = bitsOnCanvas.map((bit) => ({
        id: bit.bitData.id,
        x: bit.x,
        y: bit.y,
        alignment: bit.alignment,
        operation: bit.operation,
        color: bit.color,
    }));

    const dataStr = JSON.stringify(savedPositions, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = "bits_positions.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logOperation(
        `Exported ${savedPositions.length} bit positions to JSON file`
    );
}

// Load bit positions from JSON file
async function loadBitPositions() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const positionsData = JSON.parse(event.target.result);
                    const restoredCount = await restoreBitPositions(
                        positionsData
                    );
                    logOperation(
                        `Loaded ${restoredCount} bit positions from JSON file`
                    );
                    updateOffsetContours(); // Update offset contours after loading positions
                } catch (error) {
                    alert(
                        "Failed to parse JSON file. Please check the format."
                    );
                    logOperation(
                        "Failed to load positions: invalid JSON format"
                    );
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Restore bit positions from data
async function restoreBitPositions(positionsData) {
    // Clear current canvas
    bitsOnCanvas.forEach((bit) => {
        if (bit.group && bit.group.parentNode) {
            bit.group.parentNode.removeChild(bit.group);
        }
    });
    bitsOnCanvas = [];

    // Get all available bits
    const allBits = await getBits();

    let restoredCount = 0;

    // Restore positions
    positionsData.forEach((pos, index) => {
        // Find the bit data by ID
        let bitData = null;
        let groupName = null;

        for (const [group, bits] of Object.entries(allBits)) {
            const found = bits.find((b) => b.id === pos.id);
            if (found) {
                bitData = found;
                groupName = group;
                break;
            }
        }

        if (bitData) {
            try {
                // Create bit on canvas at the saved position
                const panelX = (canvasParameters.width - panelWidth) / 2;
                const panelY = (canvasParameters.height - panelThickness) / 2;
                const centerX = panelX + panelWidth / 2;
                const centerY = panelY + panelThickness / 2;

                const shape = bitsManager.createBitShapeElement(
                    bitData,
                    groupName,
                    centerX,
                    centerY
                );

                const g = document.createElementNS(svgNS, "g");
                g.appendChild(shape);

                bitsLayer.appendChild(g);

                bitCounter++;

                // Ensure operation is valid for the group
                const validOperations = getOperationsForGroup(groupName);
                let operation = pos.operation || "AL";
                if (!validOperations.includes(operation)) {
                    operation = "AL"; // Fallback to default
                }

                const newBit = {
                    number: bitCounter,
                    name: bitData.name,
                    x: pos.x,
                    y: pos.y,
                    alignment: pos.alignment || "center",
                    operation: operation,
                    color: pos.color || bitData.fillColor || "#cccccc",
                    group: g,
                    baseAbsX: centerX,
                    baseAbsY: centerY,
                    bitData: bitData,
                    groupName: groupName,
                };

                bitsOnCanvas.push(newBit);
                restoredCount++;

                // Apply the saved position
                const panelAnchorOffset = getpanelAnchorOffset();
                const panelAnchorX =
                    (canvasParameters.width - panelWidth) / 2 +
                    panelAnchorOffset.x;
                const panelAnchorY =
                    (canvasParameters.height - panelThickness) / 2 +
                    panelAnchorOffset.y;

                const absX = panelAnchorX + pos.x;
                const absY = panelAnchorY + pos.y;
                const dx = absX - centerX;
                const dy = absY - centerY;
                g.setAttribute("transform", `translate(${dx}, ${dy})`);
            } catch (error) {
                console.error(`Error restoring bit ${pos.id}:`, error);
            }
        } else {
            console.warn(`Bit with ID ${pos.id} not found in available bits`);
        }
    });

    // Update table and canvas
    updateBitsSheet();
    updateStrokeWidths();
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();

    return restoredCount;
}

// Clear all bits from canvas
function clearAllBits() {
    const bitCount = bitsOnCanvas.length;

    bitsOnCanvas.forEach((bit) => {
        if (bit.group && bit.group.parentNode) {
            bit.group.parentNode.removeChild(bit.group);
        }
    });

    bitsOnCanvas = [];
    bitCounter = 0;

    // Clear localStorage
    localStorage.removeItem("bits_positions");

    // Update table and canvas
    updateBitsSheet();
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();

    logOperation(`Cleared ${bitCount} bits from canvas`);
}

// Call initialize function when the page loads
window.addEventListener("load", initialize);
