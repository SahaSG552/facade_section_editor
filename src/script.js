import { angleToRad } from "./utils/math.js";
import { getBits, addBit, deleteBit, updateBit } from "./storage/bitsStore.js";

// SVG namespace
const svgNS = "http://www.w3.org/2000/svg";

// Get DOM elements
const bitGroups = document.getElementById("bit-groups");
const canvas = document.getElementById("canvas");
const materialWidthInput = document.getElementById("material-width");
const materialThicknessInput = document.getElementById("material-thickness");

// Global variables for material shape
let materialRect;
let materialWidth = 400;
let materialThickness = 18;

const canvasParameters = {
    width: canvas.getAttribute("width"),
    height: canvas.getAttribute("height"),
};

// Create bit shape element based on parameters
function createBitShapeElement(bit, groupName, x = 0, y = 0) {
    let shape;

    switch (groupName) {
        case "cylindrical":
            shape = document.createElementNS(svgNS, "rect");
            shape.setAttribute("x", x - bit.diameter / 2);
            shape.setAttribute("y", y - bit.length);
            shape.setAttribute("width", bit.diameter);
            shape.setAttribute("height", bit.length);
            shape.setAttribute("fill", "rgba(0, 140, 255, 0.30)");
            break;
        case "conical":
            const oppositeAngle = bit.angle;
            const hypotenuse = bit.diameter;
            const height =
                (hypotenuse / 2) *
                (1 / Math.tan(angleToRad(oppositeAngle) / 2));
            const points = [
                `${x},${y}`,
                `${x - hypotenuse / 2},${y - height}`,
                `${x - hypotenuse / 2},${y - bit.length}`,
                `${x + hypotenuse / 2},${y - bit.length}`,
                `${x + hypotenuse / 2},${y - height}`,
            ].join(" ");
            shape = document.createElementNS(svgNS, "polygon");
            shape.setAttribute("points", points);
            shape.setAttribute("fill", "rgba(26, 255, 0, 0.30)");
            break;
        case "ballNose":
            y = y - bit.diameter / 2;
            shape = document.createElementNS(svgNS, "path");
            shape.setAttribute(
                "d",
                `M ${x + bit.diameter / 2} ${y} A ${bit.diameter / 2} ${
                    bit.diameter / 2
                } 0 0 1 ${x - bit.diameter / 2} ${y} 
        L ${x - bit.diameter / 2} ${y - bit.length + bit.diameter / 2}
        L ${x + bit.diameter / 2} ${y - bit.length + bit.diameter / 2} Z`
            );
            shape.setAttribute("fill", "rgba(255, 0, 0, 0.30)");
            break;
    }

    if (shape) {
        shape.setAttribute("stroke", "black");
        shape.classList.add("bit-shape");
    }

    return shape;
}

// Create SVG icon
function createSVGIcon(shape, params, size = 50) {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", size / 2);
    circle.setAttribute("cy", size / 2);
    circle.setAttribute("r", size / 2 - 1);
    circle.setAttribute("fill", "white");
    circle.setAttribute("stroke", "black");
    circle.setAttribute("stroke-width", "2");
    svg.appendChild(circle);

    const innerGroup = document.createElementNS(svgNS, "g");
    innerGroup.setAttribute("transform", `translate(${size / 2}, ${size / 2})`);

    let innerShape;

    if (shape !== "newBit" && params && params.diameter !== undefined) {
        // Use actual bit shape if parameters are provided
        innerShape = createBitShapeElement(params, shape, 0, params.length / 2);
        // Adjust transform for proper scaling in icon
        innerShape.setAttribute("transform", `scale(${size / 80})`);
    } else {
        // Use placeholder shapes for new bit button
        switch (shape) {
            case "cylindrical":
                innerShape = document.createElementNS(svgNS, "rect");
                innerShape.setAttribute("x", -size / 4);
                innerShape.setAttribute("y", -size / 4);
                innerShape.setAttribute("width", size / 2);
                innerShape.setAttribute("height", size / 2);
                break;
            case "conical":
                innerShape = document.createElementNS(svgNS, "polygon");
                innerShape.setAttribute(
                    "points",
                    `0,${size / 4} ${-size / 4},${-size / 4} ${size / 4},${
                        -size / 4
                    }`
                );
                break;
            case "ballNose":
                innerShape = document.createElementNS(svgNS, "circle");
                innerShape.setAttribute("cx", 0);
                innerShape.setAttribute("cy", 0);
                innerShape.setAttribute("r", size / 4);
                break;
            case "newBit":
                innerShape = document.createElementNS(svgNS, "path");
                innerShape.setAttribute(
                    "d",
                    `M0 ${-size / 6}V${size / 6}M${-size / 6} 0H${size / 6}`
                );
                break;
        }
        if (innerShape) {
            innerShape.setAttribute("fill", "white");
            innerShape.setAttribute("stroke", "black");
            innerShape.setAttribute("stroke-width", "2");
        }
    }

    if (innerShape) {
        innerGroup.appendChild(innerShape);
    }
    svg.appendChild(innerGroup);
    return svg;
}

// Create action icon
function createActionIcon(action) {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "15");
    svg.setAttribute("height", "15");
    svg.setAttribute("viewBox", "0 0 24 24");

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "11");
    circle.setAttribute("fill", "white");
    circle.setAttribute("stroke-width", "2");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("fill", "black");

    switch (action) {
        case "edit":
            circle.setAttribute("stroke", "green");
            path.setAttribute(
                "d",
                "M16.293 2.293l3.414 3.414-13 13-3.414-3.414 13-13zM18 10v8h-8v-8h8z"
            );
            break;
        case "copy":
            circle.setAttribute("stroke", "orange");
            path.setAttribute(
                "d",
                "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
            );
            break;
        case "remove":
            circle.setAttribute("stroke", "red");
            path.setAttribute(
                "d",
                "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            );
            break;
    }

    svg.appendChild(circle);
    svg.appendChild(path);
    return svg;
}

// Create bit groups
function createBitGroups() {
    const allBits = getBits();
    const groupOrder = Object.keys(allBits);

    groupOrder.forEach((groupName) => {
        // sort by diameter asc, then length asc (work on a shallow copy to avoid mutating storage)
        const bits = (allBits[groupName] || []).slice().sort((a, b) => {
            const d = (a.diameter || 0) - (b.diameter || 0);
            if (d !== 0) return d;
            return (a.length || 0) - (b.length || 0);
        });
        const groupDiv = document.createElement("div");
        groupDiv.className = "bit-group";

        const groupIcon = createSVGIcon(groupName);
        groupDiv.appendChild(groupIcon);

        const bitList = document.createElement("div");
        bitList.className = "bit-list";

        bits.forEach((bit, index) => {
            const bitDiv = document.createElement("div");
            bitDiv.className = "bit";

            const bitName = document.createElement("span");
            bitName.textContent = bit.name;
            bitDiv.appendChild(bitName);

            const bitIcon = createSVGIcon(groupName, bit, 40);
            bitDiv.appendChild(bitIcon);

            const actionIcons = document.createElement("div");
            actionIcons.className = "action-icons";
            ["edit", "copy", "remove"].forEach((action) => {
                const actionIcon = createActionIcon(action);
                actionIcon.addEventListener("click", (e) => {
                    e.stopPropagation();

                    switch (action) {
                        case "edit":
                            // open edit modal for this bit
                            openBitModal(groupName, bit);
                            break;
                        case "copy":
                            handleCopyClick(e, bit);
                            break;
                        case "remove":
                            handleDeleteClick(e, bit);
                            break;
                    }
                    refreshBitGroups();
                });
                actionIcons.appendChild(actionIcon);
            });
            bitDiv.appendChild(actionIcons);

            bitDiv.addEventListener("click", () =>
                drawBitShape(bit, groupName)
            );
            bitList.appendChild(bitDiv);
        });

        // Add '+' button
        const addButton = document.createElement("div");
        addButton.className = "bit add-bit";

        const addBitName = document.createElement("span");
        addBitName.textContent = "New";
        addButton.appendChild(addBitName);
        const addBitIcon = createSVGIcon("newBit", "newBit", 40);
        addButton.appendChild(addBitIcon);

        addButton.addEventListener("click", () => openNewBitMenu(groupName));

        bitList.appendChild(addButton);

        groupDiv.appendChild(bitList);

        groupDiv.addEventListener(
            "mouseenter",
            () => (bitList.style.display = "flex")
        );
        groupDiv.addEventListener(
            "mouseleave",
            () => (bitList.style.display = "none")
        );

        bitGroups.appendChild(groupDiv);
    });
}

function openNewBitMenu(groupName) {
    // reuse unified modal for create/edit - open as "new"
    openBitModal(groupName, null);
}

// Unified create/edit modal
function openBitModal(groupName, bit = null) {
    const isEdit = !!bit;
    const defaultToolNumber =
        bit && bit.toolNumber !== undefined ? bit.toolNumber : 1;
    const defaultDiameter = bit ? bit.diameter : "";
    const defaultLength = bit ? bit.length : "";
    const defaultAngle = bit ? bit.angle : "";
    const defaultName = bit ? bit.name : "";

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
    <div class="modal-content">
      <h2>${isEdit ? "Edit Bit" : "New Bit Parameters"}</h2>
      <form id="bit-form">
        <label for="bit-name">Name:</label>
        <input type="text" id="bit-name" required value="${defaultName}">
        ${getGroupSpecificInputs(groupName, {
            diameter: defaultDiameter,
            length: defaultLength,
            angle: defaultAngle,
        })}
        <label for="bit-toolnumber">Tool Number:</label>
        <input type="number" id="bit-toolnumber" min="1" step="1" value="${defaultToolNumber}" required>
        <div class="button-group">
          <button type="button" id="cancel-btn">Cancel</button>
          <button type="submit">OK</button>
        </div>
      </form>
    </div>
  `;

    document.body.appendChild(modal);

    const form = modal.querySelector("#bit-form");
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = form.querySelector("#bit-name").value.trim();

        if (isBitNameDuplicate(name, isEdit ? bit.id : null)) {
            alert(
                "A bit with this name already exists. Please choose a different name."
            );
            return;
        }

        const diameter = parseFloat(form.querySelector("#bit-diameter").value);
        const length = parseFloat(form.querySelector("#bit-length").value);
        const toolNumber =
            parseInt(form.querySelector("#bit-toolnumber").value, 10) || 1;

        const payload = {
            name,
            diameter,
            length,
            toolNumber,
        };

        if (groupName === "conical") {
            payload.angle = parseFloat(form.querySelector("#bit-angle").value);
        }

        if (isEdit) {
            updateBit(groupName, bit.id, payload);
        } else {
            addBit(groupName, payload);
        }

        document.body.removeChild(modal);
        refreshBitGroups();
    });

    const cancelBtn = modal.querySelector("#cancel-btn");
    cancelBtn.addEventListener("click", () => {
        document.body.removeChild(modal);
    });
}

function getGroupSpecificInputs(groupName, defaults = {}) {
    const d = defaults.diameter !== undefined ? defaults.diameter : "";
    const l = defaults.length !== undefined ? defaults.length : "";
    const a = defaults.angle !== undefined ? defaults.angle : "";

    switch (groupName) {
        case "cylindrical":
            return `
        <label for="bit-diameter">Diameter:</label>
        <input type="number" id="bit-diameter" min="0" 
        max="1000" step="0.01" required value="${d}">
        <label for="bit-length">Length:</label>
        <input type="number" id="bit-length" min="0" 
        max="1000" step="0.01" required value="${l}">
      `;
        case "conical":
            return `
        <label for="bit-diameter">Diameter:</label>
        <input type="number" id="bit-diameter" min="0" 
        max="1000" step="0.01" required value="${d}">
        <label for="bit-length">Length:</label>
        <input type="number" id="bit-length" min="0" 
        max="1000" step="0.01" required value="${l}">
        <label for="bit-angle">Angle:</label>
        <input type="number" id="bit-angle" min="0" 
        max="1000" step="0.01" required value="${a}">
      `;
        case "ballNose":
            return `
        <label for="bit-diameter">Diameter:</label>
        <input type="number" id="bit-diameter" min="0" 
        max="1000" step="0.01" required value="${d}">
        <label for="bit-length">Length:</label>
        <input type="number" id="bit-length" min="0" 
        max="1000" step="0.01" required value="${l}">
      `;
        default:
            return "";
    }
}

function handleNewBitSubmit(e, groupName) {
    e.preventDefault();
    const form = e.target;
    const name = form.querySelector("#bit-name").value;

    if (isBitNameDuplicate(name)) {
        alert(
            "A bit with this name already exists. Please choose a different name."
        );
        return;
    }

    const newBit = {
        name: name,
        diameter: parseFloat(form.querySelector("#bit-diameter").value),
        length: parseFloat(form.querySelector("#bit-length").value),
    };

    if (groupName === "conical") {
        newBit.angle = parseFloat(form.querySelector("#bit-angle").value);
    }

    // Используем API хранения
    addBit(groupName, newBit);
    document.body.removeChild(form.closest(".modal"));
    refreshBitGroups();
}

function isBitNameDuplicate(name, excludeId = null) {
    const all = getBits();
    return Object.values(all || {})
        .flat()
        .some((bit) => bit.name === name && bit.id !== excludeId);
}

function refreshBitGroups() {
    bitGroups.innerHTML = "";
    createBitGroups();
    console.log(JSON.stringify(getBits()));
}

// Initialize SVG elements
function initializeSVG() {
    // Create layers
    const materialLayer = document.createElementNS(svgNS, "g");
    materialLayer.id = "material-layer";
    canvas.appendChild(materialLayer);

    const bitsLayer = document.createElementNS(svgNS, "g");
    bitsLayer.id = "bits-layer";
    canvas.appendChild(bitsLayer);

    // Create material rectangle
    materialRect = document.createElementNS(svgNS, "rect");
    materialLayer.appendChild(materialRect);

    // Initial draw of material shape
    updateMaterialShape();
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
}

// Update material parameters
function updateMaterialParams() {
    // guard against empty inputs
    materialWidth = parseInt(materialWidthInput.value) || materialWidth;
    materialThickness =
        parseInt(materialThicknessInput.value) || materialThickness;
    updateMaterialShape();

    // After material changed, recalc positions of all bits so their anchor (center-bottom)
    // stays at coordinates relative to material top-left (bit.x, bit.y).
    updateBitsPositions();
}

// New: reposition all bits according to current material origin and their stored logical coords
function updateBitsPositions() {
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;

    bitsOnCanvas.forEach((bit) => {
        // desired absolute anchor position = material origin + logical coords
        const desiredAbsX = materialX + (bit.x || 0);
        const desiredAbsY = materialY + (bit.y || 0);

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
}

// Global variables for bit management
let bitsOnCanvas = [];
let bitCounter = 0;
let dragSrcRow = null;
let selectedBitIndex = null;

// Draw bit shape
function drawBitShape(bit, groupName) {
    const bitsLayer = document.getElementById("bits-layer");

    updateMaterialParams();
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;
    const centerX = materialX + materialWidth / 2;
    const centerY = materialY;

    // create shape at absolute coords, wrap in group so we can translate later
    const shape = createBitShapeElement(bit, groupName, centerX, centerY);
    const g = document.createElementNS(svgNS, "g");
    g.appendChild(shape);
    // store transform relative to creation point
    g.setAttribute("transform", `translate(0, 0)`);
    bitsLayer.appendChild(g);

    bitCounter++;

    const x = Math.round(centerX - materialX);
    const y = Math.round(centerY - materialY);

    const newBit = {
        number: bitCounter,
        name: bit.name,
        x: x,
        y: y,
        group: g, // group that contains the shape
        baseAbsX: centerX, // absolute coords where shape was created
        baseAbsY: centerY,
        bitData: bit,
    };
    bitsOnCanvas.push(newBit);
    updateBitsSheet();
}

// Update bits sheet
function updateBitsSheet() {
    const sheetBody = document.getElementById("bits-sheet-body");
    sheetBody.innerHTML = "";

    bitsOnCanvas.forEach((bit, index) => {
        const row = document.createElement("tr");
        row.setAttribute("data-index", index);

        // Add click handler for row selection (but NOT on inputs)
        row.addEventListener("click", (e) => {
            // Don't select if clicking on input
            if (e.target.tagName === "INPUT") {
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
        xInput.type = "number";
        xInput.value = bit.x;
        xInput.style.width = "80px";
        xInput.addEventListener("change", () => {
            const newX = parseFloat(xInput.value) || 0;
            updateBitPosition(index, newX, bit.y);
        });
        xCell.appendChild(xInput);
        row.appendChild(xCell);

        // Y editable
        const yCell = document.createElement("td");
        const yInput = document.createElement("input");
        yInput.type = "number";
        yInput.value = bit.y;
        yInput.style.width = "80px";
        yInput.addEventListener("change", () => {
            const newY = parseFloat(yInput.value) || 0;
            updateBitPosition(index, bit.x, newY);
        });
        yCell.appendChild(yInput);
        row.appendChild(yCell);

        // Row drop/dragover handlers (drop allowed anywhere on row)
        row.addEventListener("dragover", handleDragOver);
        row.addEventListener("drop", handleDrop);

        // Apply selection style if this is the selected bit
        if (index === selectedBitIndex) {
            row.classList.add("selected-bit-row");
        }

        sheetBody.appendChild(row);
    });
}

// Select a bit and highlight it on canvas
function selectBit(index) {
    // Deselect previous bit
    if (selectedBitIndex !== null && bitsOnCanvas[selectedBitIndex]) {
        resetBitHighlight(selectedBitIndex);
    }

    // Select new bit
    selectedBitIndex = index;
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
            const newFill = currentFill.replace(/0\.\d+\)/, "1)"); // Remove transparency
            shape.setAttribute("fill", newFill);
            shape.setAttribute("stroke", "#00BFFF"); // Deep sky blue
            shape.setAttribute("stroke-width", "2");
        }
    }

    // Update table row highlighting
    updateBitsSheet();
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
            shape.setAttribute("stroke-width", "1");
            delete shape.dataset.originalFill;
            delete shape.dataset.originalStroke;
        }
    }
}

// Clear selection when clicking outside
document.addEventListener("click", (e) => {
    // Check if click is inside the table
    const bitsSheet = document.getElementById("bits-sheet");
    if (bitsSheet && !bitsSheet.contains(e.target)) {
        // Clicked outside table
        if (selectedBitIndex !== null) {
            resetBitHighlight(selectedBitIndex);
            selectedBitIndex = null;
            updateBitsSheet();
        }
    }
});

function updateBitPosition(index, newX, newY) {
    // update material params to get correct material origin
    updateMaterialParams();
    const materialX = (canvasParameters.width - materialWidth) / 2;
    const materialY = (canvasParameters.height - materialThickness) / 2;

    const bit = bitsOnCanvas[index];
    // compute absolute positions the user expects (relative to material origin)
    const newAbsX = materialX + newX;
    const newAbsY = materialY + newY;

    // compute translation relative to base creation coordinates
    const dx = newAbsX - bit.baseAbsX;
    const dy = newAbsY - bit.baseAbsY;

    // apply transform to group's transform
    bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);

    // save new logical positions
    bit.x = Math.round(newX);
    bit.y = Math.round(newY);

    // DO NOT call updateBitsSheet() here - it recreates inputs and breaks focus
    // redraw layer order if needed
    redrawBitsOnCanvas();
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

        // Update selectedBitIndex if the selected bit was moved
        if (selectedBitIndex === srcIndex) {
            selectedBitIndex = destIndex;
        } else if (selectedBitIndex !== null) {
            // Adjust selectedBitIndex if another bit moved past it
            if (
                srcIndex < destIndex &&
                selectedBitIndex > srcIndex &&
                selectedBitIndex <= destIndex
            ) {
                selectedBitIndex--;
            } else if (
                srcIndex > destIndex &&
                selectedBitIndex >= destIndex &&
                selectedBitIndex < srcIndex
            ) {
                selectedBitIndex++;
            }
        }

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
    });
}

// Initialize
function initialize() {
    createBitGroups();
    initializeSVG();

    // Add event listeners for material parameter inputs
    materialWidthInput.addEventListener("input", updateMaterialParams);
    materialThicknessInput.addEventListener("input", updateMaterialParams);
}

// Call initialize function when the page loads
window.addEventListener("load", initialize);
