import {
    angleToRad,
    distancePtToPt,
    evaluateMathExpression,
} from "./utils/utils.js";
import { getBits, addBit, deleteBit, updateBit } from "./data/bitsStore.js";
import CanvasManager from "./canvas/CanvasManager.js";
import BitsManager from "./panel/BitsManager.js";
// SVG namespace
const svgNS = "http://www.w3.org/2000/svg";

// Get DOM elements
const canvas = document.getElementById("canvas");
const materialWidthInput = document.getElementById("material-width");
const materialThicknessInput = document.getElementById("material-thickness");

// Global variables for material shape
let materialRect;
let materialWidth = 400;
let materialThickness = 19;
let materialAnchor = "top-left"; // "top-left" or "bottom-left"

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

// Pan variables for manual pan handling
let isDraggingCanvas = false;
let lastMouseX = 0;
let lastMouseY = 0;

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
    // Create material rectangle first (before CanvasManager to avoid callback issues)
    materialRect = document.createElementNS(svgNS, "rect");

    // Calculate material anchor position for grid alignment
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;
    const anchorOffset = getMaterialAnchorOffset();
    const gridAnchorX = materialX + anchorOffset.x + gridSize / 2;
    const gridAnchorY = materialY + anchorOffset.y + gridSize / 2;

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
        layers: ["grid", "material", "bits", "overlay"],
        onZoom: (zoomLevel, panX, panY) => {
            // Update stroke widths when zoom changes
            updateStrokeWidths(zoomLevel);
        },
    });

    // Get layer references
    const materialLayer = mainCanvasManager.getLayer("material");
    bitsLayer = mainCanvasManager.getLayer("bits");

    // Add material rectangle to layer
    materialLayer.appendChild(materialRect);

    // Create part path
    partPath = document.createElementNS(svgNS, "path");
    partPath.id = "part-path";
    partPath.setAttribute("fill", "rgba(71, 64, 64, 0.16)");
    partPath.setAttribute("stroke", "black");
    partPath.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    partPath.style.display = "none";
    materialLayer.appendChild(partPath);

    // Create material anchor indicator (always visible)
    const materialAnchorIndicator = document.createElementNS(svgNS, "g");
    materialAnchorIndicator.id = "material-anchor-indicator";
    materialLayer.appendChild(materialAnchorIndicator);

    // Initial draw of material shape
    updateMaterialShape();

    // Initial fit to scale
    fitToScale();

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

    // Setup material anchor button
    const materialAnchorBtn = document.getElementById("material-anchor-btn");
    materialAnchorBtn.appendChild(createMaterialAnchorButton(materialAnchor));
    materialAnchorBtn.addEventListener("click", cycleMaterialAnchor);

    // Setup part button
    document
        .getElementById("part-btn")
        .addEventListener("click", togglePartView);

    // Setup bits visibility button
    const bitsBtn = document.getElementById("bits-btn");
    bitsBtn.addEventListener("click", toggleBitsVisibility);
    bitsBtn.classList.add("bits-visible"); // Initial state - bits are visible

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

// Cycle material anchor
function cycleMaterialAnchor() {
    // Cycle between "top-left" and "bottom-left"
    materialAnchor = materialAnchor === "top-left" ? "bottom-left" : "top-left";

    // Update button icon
    const materialAnchorBtn = document.getElementById("material-anchor-btn");
    materialAnchorBtn.innerHTML = "";
    materialAnchorBtn.appendChild(createMaterialAnchorButton(materialAnchor));

    // Recalculate bit positions relative to new anchor
    updateBitsForNewAnchor();

    // Update grid anchor position
    updateGridAnchor();

    // Update indicator
    updateMaterialAnchorIndicator();
}

// Update bit positions when material anchor changes
function updateBitsForNewAnchor() {
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;
    const oldAnchor =
        materialAnchor === "top-left" ? "bottom-left" : "top-left";
    const currentAnchorX = materialX;
    const currentAnchorY =
        oldAnchor === "top-left" ? materialY : materialY + materialThickness;
    const newAnchorX = materialX;
    const newAnchorY =
        materialAnchor === "top-left"
            ? materialY
            : materialY + materialThickness;

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
    if (showPart) updatePartShape();
}

// Update material shape
function updateMaterialShape() {
    materialRect.setAttribute(
        "x",
        (canvasParameters.width - materialWidth) / 2
    );
    materialRect.setAttribute(
        "y",
        (canvasParameters.height - materialThickness) / 2
    );
    materialRect.setAttribute("width", materialWidth);
    materialRect.setAttribute("height", materialThickness);
    materialRect.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
    materialRect.setAttribute("stroke", "black");

    updateMaterialAnchorIndicator();
}

// Update material anchor indicator (always visible)
function updateMaterialAnchorIndicator() {
    const indicator = document.getElementById("material-anchor-indicator");
    indicator.innerHTML = ""; // Clear

    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;

    let anchorX, anchorY;
    if (materialAnchor === "top-left") {
        anchorX = materialX;
        anchorY = materialY;
    } else if (materialAnchor === "bottom-left") {
        anchorX = materialX;
        anchorY = materialY + materialThickness;
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
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;
    const anchorOffset = getMaterialAnchorOffset();
    const gridAnchorX = materialX + anchorOffset.x + gridSize / 2;
    const gridAnchorY = materialY + anchorOffset.y + gridSize / 2;

    if (mainCanvasManager) {
        mainCanvasManager.config.gridAnchorX = gridAnchorX;
        mainCanvasManager.config.gridAnchorY = gridAnchorY;
        if (mainCanvasManager.gridEnabled) {
            mainCanvasManager.drawGrid();
        }
    }
}

// Update material parameters
function updateMaterialParams() {
    // Update material dimensions
    materialWidth = parseInt(materialWidthInput.value) || materialWidth;
    materialThickness =
        parseInt(materialThicknessInput.value) || materialThickness;

    updateMaterialShape();
    updateBitsPositions();
    updateGridAnchor(); // Update grid anchor when material changes
    if (showPart) updatePartShape();
}

// New: reposition all bits according to current material anchor and their stored logical coords
function updateBitsPositions() {
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;
    const anchorOffset = getMaterialAnchorOffset();
    const anchorX = materialX + anchorOffset.x;
    const anchorY = materialY + anchorOffset.y;

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

// Create material anchor button SVG
function createMaterialAnchorButton(anchor) {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.style.cursor = "pointer";

    // Background rectangle (material)
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

    bitsOnCanvas.forEach((bit) => {
        if (bit.bitData.id === bitId) {
            // Update reference to the new bit data
            bit.bitData = updatedBitData;
            // Update name
            bit.name = updatedBitData.name;

            // Redraw shape
            const oldShape = bit.group.querySelector(".bit-shape");
            if (oldShape) {
                bit.group.removeChild(oldShape);
            }
            const newShape = bitsManager.createBitShapeElement(
                updatedBitData,
                bit.groupName,
                bit.baseAbsX,
                bit.baseAbsY
            );
            bit.group.insertBefore(newShape, bit.group.firstChild); // insert before anchor point if exists

            // Update stroke width
            const thickness = Math.max(
                0.1,
                0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
            );
            newShape.setAttribute("stroke-width", thickness);
        }
    });

    // Update the table
    updateBitsSheet();
    if (showPart) updatePartShape();
}

// Draw bit shape
function drawBitShape(bit, groupName, createBitShapeElementFn) {
    const bitsLayer = document.getElementById("bits-layer");

    updateMaterialParams();
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;
    const centerX = materialX + materialWidth / 2;
    const centerY = materialY;

    // create shape at absolute coords, wrap in group so we can translate later
    const shape = createBitShapeElementFn(bit, groupName, centerX, centerY);
    const g = document.createElementNS(svgNS, "g");
    g.appendChild(shape);
    // store transform relative to creation point
    g.setAttribute("transform", `translate(0, 0)`);
    bitsLayer.appendChild(g);

    bitCounter++;

    const x = centerX - materialX;
    const y = centerY - materialY;

    const newBit = {
        number: bitCounter,
        name: bit.name,
        x: x,
        y: y,
        alignment: "center", // default alignment
        group: g, // group that contains the shape
        baseAbsX: centerX, // absolute coords where shape was created
        baseAbsY: centerY,
        bitData: bit,
        groupName: groupName, // store the group name for updates
    };
    bitsOnCanvas.push(newBit);
    updateBitsSheet();
    updateStrokeWidths();
    if (showPart) updatePartShape();
}

// Update bits sheet
function updateBitsSheet() {
    const sheetBody = document.getElementById("bits-sheet-body");
    sheetBody.innerHTML = "";

    bitsOnCanvas.forEach((bit, index) => {
        const row = document.createElement("tr");
        row.setAttribute("data-index", index);

        // Add click handler for row selection (but NOT on inputs or buttons)
        row.addEventListener("click", (e) => {
            // Don't select if clicking on input or button
            if (
                e.target.tagName === "INPUT" ||
                e.target.closest("button") ||
                e.target.closest("svg")
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

                // Apply highlight
                const currentFill = shape.getAttribute("fill");
                const newFill = currentFill.replace(/0\.\d+\)/, "0.6)"); // Change transparency
                shape.setAttribute("fill", newFill);
                shape.setAttribute("stroke", "#00BFFF"); // Deep sky blue
                const thickness = Math.max(
                    0.1,
                    0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
                );
                shape.setAttribute("stroke-width", thickness);
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
        if (shape && shape.dataset.originalFill) {
            shape.setAttribute("fill", shape.dataset.originalFill);
            shape.setAttribute(
                "stroke",
                shape.dataset.originalStroke || "black"
            );
            // Set to scaled thickness instead of default "1"
            const thickness = Math.max(
                0.1,
                0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
            );
            shape.setAttribute("stroke-width", thickness);
            delete shape.dataset.originalFill;
            delete shape.dataset.originalStroke;
        }
    }
}

function updateBitPosition(index, newX, newY) {
    // update material params to get correct material origin
    updateMaterialParams();
    const materialAnchorOffset = getMaterialAnchorOffset();
    const materialAnchorX =
        (canvasParameters.width - materialWidth) / 2 + materialAnchorOffset.x;
    const materialAnchorY =
        (canvasParameters.height - materialThickness) / 2 +
        materialAnchorOffset.y;

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
                const selectedNewAbsX = materialAnchorX + selectedNewX;
                const selectedNewAbsY = materialAnchorY + selectedNewY;
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
    // compute absolute positions the user expects (relative to material anchor)
    const newAbsX = materialAnchorX + newX;
    const newAbsY = materialAnchorY + newY;

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
    if (materialRect) {
        materialRect.setAttribute("stroke-width", thickness);
    }
    bitsOnCanvas.forEach((bit) => {
        const shape = bit.group?.querySelector(".bit-shape");
        if (shape) {
            shape.setAttribute("stroke-width", thickness);
        }
    });
}

function fitToScale() {
    // Calculate bounding box including material and all bits
    let minX = (canvasParameters.width - materialWidth) / 2;
    let maxX = minX + materialWidth;
    let minY = (canvasParameters.height - materialThickness) / 2;
    let maxY = minY + materialThickness;

    if (bitsOnCanvas.length > 0) {
        bitsOnCanvas.forEach((bit) => {
            // Get the actual bounding box of the bit shape
            const shape = bit.group.querySelector(".bit-shape");
            if (shape) {
                const bbox = shape.getBBox();
                const transform = bit.group.getAttribute("transform");
                let offsetX = 0;
                let offsetY = 0;

                if (transform) {
                    const match = transform.match(
                        /translate\(([^,]+),\s*([^)]+)\)/
                    );
                    if (match) {
                        offsetX = parseFloat(match[1]);
                        offsetY = parseFloat(match[2]);
                    }
                }

                const shapeMinX = bbox.x + offsetX;
                const shapeMaxX = bbox.x + bbox.width + offsetX;
                const shapeMinY = bbox.y + offsetY;
                const shapeMaxY = bbox.y + bbox.height + offsetY;

                minX = Math.min(minX, shapeMinX);
                maxX = Math.max(maxX, shapeMaxX);
                minY = Math.min(minY, shapeMinY);
                maxY = Math.max(maxY, shapeMaxY);
            }
        });
    }

    // Add padding
    const padding = 20;
    const contentWidth = maxX - minX + 2 * padding;
    const contentHeight = maxY - minY + 2 * padding;

    // Use CanvasManager's fitToScale method
    mainCanvasManager.fitToScale({
        minX,
        maxX,
        minY,
        maxY,
        padding,
    });
}

function zoomToSelected() {
    if (selectedBitIndices.length === 0) return;

    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;
    const anchorOffset = getMaterialAnchorOffset();
    const anchorX = materialX + anchorOffset.x;
    const anchorY = materialY + anchorOffset.y;

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

// Helper function to get material anchor offset
function getMaterialAnchorOffset() {
    return materialAnchor === "top-left"
        ? { x: 0, y: 0 }
        : { x: 0, y: materialThickness };
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
                    const materialX =
                        (canvasParameters.width - materialWidth) / 2;
                    const materialY =
                        (canvasParameters.height - materialThickness) / 2;
                    const bitAbsX = materialX + bit.x;
                    const bitAbsY = materialY + bit.y;

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

        // Calculate new position relative to material anchor
        const materialAnchorOffset = getMaterialAnchorOffset();
        const materialAnchorX =
            (canvasParameters.width - materialWidth) / 2 +
            materialAnchorOffset.x;
        const materialAnchorY =
            (canvasParameters.height - materialThickness) / 2 +
            materialAnchorOffset.y;

        // Calculate desired anchor position
        let anchorX = svgCoords.x - materialAnchorX;
        let anchorY = svgCoords.y - materialAnchorY;

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
function getMaterialPolygon() {
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;
    return [
        {
            X: Math.round(materialX * CLIPPER_SCALE),
            Y: Math.round(materialY * CLIPPER_SCALE),
        },
        {
            X: Math.round((materialX + materialWidth) * CLIPPER_SCALE),
            Y: Math.round(materialY * CLIPPER_SCALE),
        },
        {
            X: Math.round((materialX + materialWidth) * CLIPPER_SCALE),
            Y: Math.round((materialY + materialThickness) * CLIPPER_SCALE),
        },
        {
            X: Math.round(materialX * CLIPPER_SCALE),
            Y: Math.round((materialY + materialThickness) * CLIPPER_SCALE),
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
    subj.push(getMaterialPolygon());
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

    if (bitsVisible) {
        // Show bits
        bitsLayer.style.display = "block";
        bitsBtn.classList.remove("bits-hidden");
        bitsBtn.classList.add("bits-visible");
        bitsBtn.title = "Hide Bits";
    } else {
        // Hide bits
        bitsLayer.style.display = "none";
        bitsBtn.classList.remove("bits-visible");
        bitsBtn.classList.add("bits-hidden");
        bitsBtn.title = "Show Bits";
    }
}

function togglePartView() {
    if (!bitsLayer || !materialRect || !partPath) {
        console.error("SVG elements not initialized");
        return;
    }

    showPart = !showPart;
    const partBtn = document.getElementById("part-btn");

    if (showPart) {
        updatePartShape();
        materialRect.style.display = "none";
        partPath.style.display = "block";
        bitsLayer.style.display = "block";
        partBtn.classList.remove("part-hidden");
        partBtn.classList.add("part-visible");
        partBtn.title = "Show Material";
    } else {
        materialRect.style.display = "block";
        partPath.style.display = "none";
        bitsLayer.style.display = "block";
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

    // Add event listeners for material parameter inputs
    materialWidthInput.addEventListener("input", updateMaterialParams);
    materialThicknessInput.addEventListener("input", updateMaterialParams);

    // Add math evaluation on blur
    materialWidthInput.addEventListener("blur", () => {
        materialWidthInput.value = evaluateMathExpression(
            materialWidthInput.value
        );
        updateMaterialParams();
    });
    materialThicknessInput.addEventListener("blur", () => {
        materialThicknessInput.value = evaluateMathExpression(
            materialThicknessInput.value
        );
        updateMaterialParams();
    });
}

// Call initialize function when the page loads
window.addEventListener("load", initialize);
