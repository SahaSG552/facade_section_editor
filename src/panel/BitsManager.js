import {
    getBits,
    addBit,
    deleteBit,
    updateBit,
    exportToJSON,
    importFromJSON,
} from "../data/bitsStore.js";
import CanvasManager from "../canvas/CanvasManager.js";
import { evaluateMathExpression } from "../utils/utils.js";
import { getSVGBounds } from "../canvas/zoomUtils.js";

const svgNS = "http://www.w3.org/2000/svg";

export default class BitsManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.bitGroups = document.getElementById("bit-groups");
    }

    // Create SVG icon
    createSVGIcon(shape, params, size = 50) {
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
        innerGroup.setAttribute(
            "transform",
            `translate(${size / 2}, ${size / 2})`,
        );

        let innerShape;

        if (shape !== "newBit" && params && params.diameter !== undefined) {
            // Use actual bit shape if parameters are provided
            innerShape = this.createBitShapeElement(
                params,
                shape,
                0,
                params.length / 2,
                false, // isSelected = false for icon
                false, // includeShank = false for icon
            );
            // Adjust transform for proper scaling in icon
            innerShape.setAttribute("transform", `scale(${size / 80})`);
        } else {
            // Use placeholder shapes for new bit button
            const s = size / 4;
            switch (shape) {
                case "cylindrical":
                    innerShape = document.createElementNS(svgNS, "rect");
                    innerShape.setAttribute("x", -size / 4);
                    innerShape.setAttribute("y", -size / 4);
                    innerShape.setAttribute("width", size / 2);
                    innerShape.setAttribute("height", size / 2);
                    break;
                case "conical":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} 0
                    L ${-s} ${-s}
                    L ${s} ${-s}
                    L ${s} 0
                    L 0 ${s}
                    Z`,
                    );
                    break;
                case "ball":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} 0
                    L ${-s} ${-s}
                    L ${s} ${-s}
                    L ${s} 0
                    A ${s} ${s} 0 0 1 0 ${s}
                    A ${s} ${s} 0 0 1 ${-s} 0
                    Z`,
                    );
                    break;
                case "fillet":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} ${s / 4}
                    L ${-s} ${-s}
                    L ${s} ${-s}
                    L ${s} ${s / 4}
                    A ${s} ${s} 0 0 0 ${s / 4} ${s}
                    L ${-s / 4} ${s}
                    A ${s} ${s} 0 0 0 ${-s} ${s / 4}
                    Z`,
                    );
                    break;
                case "bull":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M ${-s} ${s / 2}
                    L ${-s} ${-s}
                    L ${s} ${-s}
                    L ${s} ${s / 2}
                    A ${s / 2} ${s / 2} 0 0 1 ${s / 2} ${s}
                    L ${-s / 2} ${s}
                    A ${s / 2} ${s / 2} 0 0 1 ${-s} ${s / 2}
                    Z`,
                    );
                    break;
                case "newBit":
                    innerShape = document.createElementNS(svgNS, "path");
                    innerShape.setAttribute(
                        "d",
                        `M0 ${-size / 6}V${size / 6}M${-size / 6} 0H${size / 6}`,
                    );
                    break;
            }
            if (innerShape) {
                // Use the bit's color if available, otherwise white
                const fillColor = params?.fillColor
                    ? this.getBitFillColor(params, false)
                    : "white";
                innerShape.setAttribute("fill", fillColor);
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
    createActionIcon(action) {
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
                    "M16.293 2.293l3.414 3.414-13 13-3.414-3.414 13-13zM18 10v8h-8v-8h8z",
                );
                break;
            case "copy":
                circle.setAttribute("stroke", "orange");
                path.setAttribute(
                    "d",
                    "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
                );
                break;
            case "remove":
                circle.setAttribute("stroke", "red");
                path.setAttribute(
                    "d",
                    "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
                );
                break;
        }

        svg.appendChild(circle);
        svg.appendChild(path);
        return svg;
    }

    // Create bit shape element based on parameters
    createBitShapeElement(
        bit,
        groupName,
        x = 0,
        y = 0,
        isSelected = false,
        includeShank = true,
        strokeWidth = 1,
    ) {
        // Create a group to contain bit and shank shapes
        const group = document.createElementNS(svgNS, "g");

        let bitShape;
        // Радиус дуги (формула через хорду и стрелу подъёма)
        let A = { x: x + bit.diameter / 2, y: y - bit.height };
        let B = { x: x - bit.diameter / 2, y: y - bit.height };
        let arcRad =
            bit.height / 2 +
            (this.distancePtToPt(A, B) * this.distancePtToPt(A, B)) /
                (8 * bit.height);

        // Get the fill color with proper opacity
        const fillColor = this.getBitFillColor(bit, isSelected);

        switch (groupName) {
            case "cylindrical":
                bitShape = document.createElementNS(svgNS, "rect");
                bitShape.setAttribute("x", x - bit.diameter / 2);
                bitShape.setAttribute("y", y - bit.length);
                bitShape.setAttribute("width", bit.diameter);
                bitShape.setAttribute("height", bit.length);
                bitShape.setAttribute("fill", fillColor);
                break;
            case "conical":
                const oppositeAngle = bit.angle;
                const hypotenuse = bit.diameter;
                const height =
                    (hypotenuse / 2) *
                    (1 / Math.tan(this.angleToRad(oppositeAngle / 2)));
                const points = [
                    `${x},${y}`,
                    `${x - hypotenuse / 2},${y - height}`,
                    `${x - hypotenuse / 2},${y - bit.length}`,
                    `${x + hypotenuse / 2},${y - bit.length}`,
                    `${x + hypotenuse / 2},${y - height}`,
                ].join(" ");
                bitShape = document.createElementNS(svgNS, "polygon");
                bitShape.setAttribute("points", points);
                bitShape.setAttribute("fill", fillColor);
                break;
            case "ball":
                bitShape = document.createElementNS(svgNS, "path");
                bitShape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 1 ${x - bit.diameter / 2} ${
                        y - bit.height
                    }
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`,
                );
                bitShape.setAttribute("fill", fillColor);
                break;
            case "fillet":
                // Fillet cutter: cylindrical part + fillet profile
                // For R-type cutters: ensure minimum flat value of 0.2 to avoid sharp point issues
                // User-entered value is preserved for UI display, but minimum 0.2 is used for geometry
                const effectiveFlat = Math.max(bit.flat || 0, 0);
                arcRad = bit.cornerRadius;
                bitShape = document.createElementNS(svgNS, "path");
                bitShape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 0 ${x + effectiveFlat / 2} ${y}
        L ${x - effectiveFlat / 2} ${y}
        A ${arcRad} ${arcRad} 0 0 0 ${x - bit.diameter / 2} ${y - bit.height}
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`,
                );
                bitShape.setAttribute("fill", fillColor);
                break;
            case "bull":
                // Bull-nose cutter: cylindrical part + bullnose profile
                arcRad = bit.cornerRadius;
                bitShape = document.createElementNS(svgNS, "path");
                bitShape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 1 ${x + bit.flat / 2} ${y}
        L ${x - bit.flat / 2} ${y}
        A ${arcRad} ${arcRad} 0 0 1 ${x - bit.diameter / 2} ${y - bit.height}
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`,
                );
                bitShape.setAttribute("fill", fillColor);
                break;
        }

        if (bitShape) {
            bitShape.setAttribute("stroke", "black");
            bitShape.setAttribute("stroke-width", strokeWidth);
            bitShape.classList.add("bit-shape");
            group.appendChild(bitShape);
        }

        // Add shank if parameters are present and includeShank is true
        if (
            includeShank &&
            bit.shankDiameter &&
            bit.totalLength &&
            bit.totalLength > bit.length
        ) {
            const shankLength = bit.totalLength - bit.length;
            const shankShape = document.createElementNS(svgNS, "rect");
            shankShape.setAttribute("x", x - bit.shankDiameter / 2);
            shankShape.setAttribute("y", y - bit.totalLength);
            shankShape.setAttribute("width", bit.shankDiameter);
            shankShape.setAttribute("height", shankLength);
            shankShape.setAttribute("fill", "rgba(64, 64, 64, 0.1)");
            shankShape.setAttribute("stroke", "black");
            shankShape.setAttribute("stroke-width", strokeWidth);
            shankShape.classList.add("shank-shape");
            group.appendChild(shankShape);
        }

        return group;
    }

    // Get the fill color for a bit with proper opacity
    getBitFillColor(bit, isSelected = false) {
        const baseColor = bit.fillColor;
        if (!baseColor) return "rgba(204, 204, 204, 0.3)"; // Default gray

        // Parse the base color to extract RGB values
        let r, g, b;
        if (baseColor.startsWith("rgba")) {
            // Extract RGB from rgba(r, g, b, a)
            const match = baseColor.match(
                /rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/,
            );
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            }
        } else if (baseColor.startsWith("rgb")) {
            // Extract RGB from rgb(r, g, b)
            const match = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            }
        } else if (baseColor.startsWith("#")) {
            // Convert hex to RGB
            const hex = baseColor.slice(1);
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }

        // Apply opacity: 0.6 for selected/modal, 0.3 for normal
        const opacity = isSelected ? 0.6 : 0.3;
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // Helper functions needed for bit shapes
    distancePtToPt(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    angleToRad(angle) {
        return (angle * Math.PI) / 180;
    }

    // Create bit groups
    async createBitGroups() {
        const allBits = await getBits();
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

            const groupIcon = this.createSVGIcon(groupName);
            groupDiv.appendChild(groupIcon);

            const bitList = document.createElement("div");
            bitList.className = "bit-list";

            bits.forEach((bit, index) => {
                const bitDiv = document.createElement("div");
                bitDiv.className = "bit";

                const bitName = document.createElement("span");
                bitName.textContent = bit.name;
                bitDiv.appendChild(bitName);

                const bitIcon = this.createSVGIcon(groupName, bit, 40);
                bitDiv.appendChild(bitIcon);

                const actionIcons = document.createElement("div");
                actionIcons.className = "action-icons";
                ["edit", "copy", "remove"].forEach((action) => {
                    const actionIcon = this.createActionIcon(action);
                    actionIcon.addEventListener("click", async (e) => {
                        e.stopPropagation();

                        switch (action) {
                            case "edit":
                                // open edit modal for this bit
                                this.openBitModal(groupName, bit);
                                break;
                            case "copy":
                                await this.handleCopyClick(e, bit);
                                this.refreshBitGroups();
                                break;
                            case "remove":
                                await this.handleDeleteClick(e, bit);
                                this.refreshBitGroups();
                                break;
                        }
                    });
                    actionIcons.appendChild(actionIcon);
                });
                bitDiv.appendChild(actionIcons);

                bitDiv.addEventListener("click", () =>
                    this.drawBitShape(bit, groupName),
                );
                bitList.appendChild(bitDiv);
            });

            // Add '+' button
            const addButton = document.createElement("div");
            addButton.className = "bit add-bit";

            const addBitName = document.createElement("span");
            addBitName.textContent = "New";
            addButton.appendChild(addBitName);
            const addBitIcon = this.createSVGIcon("newBit", "newBit", 40);
            addButton.appendChild(addBitIcon);

            addButton.addEventListener("click", () =>
                this.openNewBitMenu(groupName),
            );

            bitList.appendChild(addButton);

            groupDiv.appendChild(bitList);

            groupDiv.addEventListener("mouseenter", (e) => {
                const rect = groupDiv.getBoundingClientRect();
                bitList.style.display = "flex";
                bitList.style.left = rect.right + 5 + "px";
                bitList.style.top = rect.top + rect.height / 2 + "px";
                bitList.style.transform = "translateY(-50%)";

                // Позиционировать невидимую зону для hover bridge
                const afterElement =
                    groupDiv.getAttribute("data-after-element");
                // Установить ::after динамически через JS (для невидимой зоны)
            });

            groupDiv.addEventListener("mouseleave", (e) => {
                // Не скрывать меню сразу - дать пользователю время дотянуться до него
                setTimeout(() => {
                    if (!bitList.matches(":hover")) {
                        bitList.style.display = "none";
                    }
                }, 100);
            });

            bitList.addEventListener("mouseenter", () => {
                bitList.style.display = "flex";
            });

            bitList.addEventListener("mouseleave", () => {
                bitList.style.display = "none";
            });

            this.bitGroups.appendChild(groupDiv);
        });
    }

    async refreshBitGroups() {
        this.bitGroups.innerHTML = "";
        await this.createBitGroups();
    }

    async handleCopyClick(e, bit) {
        const baseName = bit.name;
        const all = await getBits();
        // count existing copies with same baseName
        const existingCopies = Object.values(all)
            .flat()
            .filter((b) => b.name.startsWith(`${baseName} (`));
        const maxCopyNumber = existingCopies.reduce((max, b) => {
            const m = b.name.match(/\((\d+)\)$/);
            return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        const name = `${baseName} (${maxCopyNumber + 1})`;
        const newBit = { ...bit, name };
        delete newBit.id; // ensure new id created

        // Find the group name for this bit
        const groupName = await this.findBitGroupName(bit);

        if (groupName) {
            addBit(groupName, newBit);
        }
    }

    async handleDeleteClick(e, bit) {
        if (confirm(`Are you sure you want to delete ${bit.name}?`)) {
            // Find the group name for this bit
            const groupName = await this.findBitGroupName(bit);

            if (groupName) {
                deleteBit(groupName, bit.id);
            }
        }
    }

    async isBitNameDuplicate(name, excludeId = null) {
        const all = await getBits();
        return Object.values(all || {})
            .flat()
            .some((bit) => bit.name === name && bit.id !== excludeId);
    }

    // Helper method to find group name for a bit
    async findBitGroupName(bit) {
        const allBits = await getBits();
        for (const group in allBits) {
            if (allBits[group].some((b) => b.id === bit.id)) {
                return group;
            }
        }
        return null;
    }

    // Helper method to collect bit parameters from form
    collectBitParameters(form, groupName) {
        const name = form.querySelector("#bit-name").value.trim();
        const diameter = parseFloat(
            evaluateMathExpression(form.querySelector("#bit-diameter").value),
        );
        const length = parseFloat(
            evaluateMathExpression(form.querySelector("#bit-length").value),
        );
        const toolNumber = parseInt(
            evaluateMathExpression(form.querySelector("#bit-toolnumber").value),
            10,
        );

        // Color picker is now in the toolbar, not in the form
        const colorInput = document.querySelector("#bit-color");
        const color = colorInput ? colorInput.value : "#cccccc";
        let bitParams = {
            name,
            diameter,
            length,
            toolNumber,
            fillColor: color,
        };

        // Add shank parameters if present
        const shankDiameterStr =
            form.querySelector("#bit-shankDiameter")?.value;
        if (shankDiameterStr) {
            const shankDiameter = parseFloat(
                evaluateMathExpression(shankDiameterStr),
            );
            if (!isNaN(shankDiameter)) bitParams.shankDiameter = shankDiameter;
        }

        const totalLengthStr = form.querySelector("#bit-totalLength")?.value;
        if (totalLengthStr) {
            const totalLength = parseFloat(
                evaluateMathExpression(totalLengthStr),
            );
            if (!isNaN(totalLength)) bitParams.totalLength = totalLength;
        }

        // Add group-specific parameters
        if (groupName === "conical") {
            bitParams.angle = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-angle").value),
            );
        }
        if (groupName === "ball") {
            bitParams.height = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-height").value),
            );
        }
        if (groupName === "fillet" || groupName === "bull") {
            bitParams.height = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-height").value),
            );
            bitParams.cornerRadius = parseFloat(
                evaluateMathExpression(
                    form.querySelector("#bit-cornerRadius").value,
                ),
            );
            bitParams.flat = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-flat").value),
            );
        }

        return bitParams;
    }

    // Helper method to validate bit parameters
    validateBitParameters(form, groupName) {
        const name = form.querySelector("#bit-name").value.trim();
        if (!name) return false;

        const diameter = form.querySelector("#bit-diameter")?.value;
        if (!diameter) return false;

        const length = form.querySelector("#bit-length")?.value;
        if (!length) return false;

        const toolNumber = form.querySelector("#bit-toolnumber")?.value;
        if (!toolNumber) return false;

        if (groupName === "conical") {
            const angle = form.querySelector("#bit-angle")?.value;
            if (!angle) return false;
        }

        if (groupName === "ball") {
            const height = form.querySelector("#bit-height")?.value;
            if (!height) return false;
        }

        if (groupName === "fillet" || groupName === "bull") {
            const height = form.querySelector("#bit-height")?.value;
            const cornerRadius = form.querySelector("#bit-cornerRadius")?.value;
            const flat = form.querySelector("#bit-flat")?.value;
            if (!height || !cornerRadius || !flat) return false;
        }

        return true;
    }

    // Helper method to build bit payload for saving
    buildBitPayload(form, groupName) {
        const diameter = parseFloat(
            evaluateMathExpression(form.querySelector("#bit-diameter").value),
        );
        const length = parseFloat(
            evaluateMathExpression(form.querySelector("#bit-length").value),
        );
        const toolNumber =
            parseInt(
                evaluateMathExpression(
                    form.querySelector("#bit-toolnumber").value,
                ),
                10,
            ) || 1;

        // Color picker is now in the toolbar, not in the form
        const colorInput = document.querySelector("#bit-color");
        const color = colorInput ? colorInput.value : "#cccccc";
        const payload = {
            name: form.querySelector("#bit-name").value.trim(),
            diameter,
            length,
            toolNumber,
            fillColor: color,
        };

        // Add optional shank parameters
        const shankDiameterStr =
            form.querySelector("#bit-shankDiameter")?.value;
        if (shankDiameterStr) {
            const shankDiameter = parseFloat(
                evaluateMathExpression(shankDiameterStr),
            );
            if (!isNaN(shankDiameter)) payload.shankDiameter = shankDiameter;
        }

        const totalLengthStr = form.querySelector("#bit-totalLength")?.value;
        if (totalLengthStr) {
            const totalLength = parseFloat(
                evaluateMathExpression(totalLengthStr),
            );
            if (!isNaN(totalLength)) payload.totalLength = totalLength;
        }

        // Add group-specific parameters
        if (groupName === "conical") {
            const angle = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-angle").value),
            );
            payload.angle = angle;
        }
        if (groupName === "ball") {
            const height = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-height").value),
            );
            payload.height = height;
        }
        if (groupName === "fillet" || groupName === "bull") {
            const height = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-height").value),
            );
            payload.height = height;
            const cornerRadius = parseFloat(
                evaluateMathExpression(
                    form.querySelector("#bit-cornerRadius").value,
                ),
            );
            payload.cornerRadius = cornerRadius;
            const flat = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-flat").value),
            );
            payload.flat = flat;
        }

        return payload;
    }

    openNewBitMenu(groupName) {
        // reuse unified modal for create/edit - open as "new"
        this.openBitModal(groupName, null);
    }

    // Unified create/edit modal
    openBitModal(groupName, bit = null) {
        const isEdit = !!bit;
        const defaultToolNumber =
            bit && bit.toolNumber !== undefined ? bit.toolNumber : 1;
        const defaultDiameter = bit ? bit.diameter : "";
        const defaultLength = bit ? bit.length : "";
        const defaultAngle = bit ? bit.angle : "";
        const defaultHeight = bit ? bit.height : "";
        const defaultCornerRadius = bit ? bit.cornerRadius : "";
        const defaultFlat = bit ? bit.flat : "";
        const defaultShankDiameter = bit ? bit.shankDiameter : "";
        const defaultTotalLength = bit ? bit.totalLength : "";
        const defaultColor = bit && bit.fillColor ? bit.fillColor : "#cccccc";
        const defaultName = bit ? bit.name : "";

        const modal = document.createElement("div");
        modal.className = "modal";
        modal.innerHTML = `
    <div class="modal-content">
      <h2>${isEdit ? "Edit Bit" : "New Bit Parameters"}</h2>
      <div class="modal-body">
        <form id="bit-form" class="bit-form">
          <label for="bit-name">Name:</label>
          <input type="text" id="bit-name" required value="${defaultName}">
          ${this.getGroupSpecificInputs(groupName, {
              diameter: defaultDiameter,
              length: defaultLength,
              shankDiameter: defaultShankDiameter,
              totalLength: defaultTotalLength,
              angle: defaultAngle,
              height: defaultHeight,
              cornerRadius: defaultCornerRadius,
              flat: defaultFlat,
          })}
          
          <label for="bit-toolnumber">Tool Number:</label>
          <input type="number" id="bit-toolnumber" min="1" step="1" value="${defaultToolNumber}" required>
        </form>
        <div id="bit-preview" class="bit-preview">
          <svg id="bit-preview-canvas" width="200" height="200"></svg>
          <div id="preview-toolbar">
          <button id="preview-zoom-in" title="Zoom In">+</button>
          <button id="preview-zoom-out" title="Zoom Out">-</button>
          <button id="preview-fit" title="Fit to Scale">Fit</button>
          <button id="preview-toggle-grid" title="Toggle Grid">Grid</button>
          <input type="color" id="bit-color" value="${defaultColor}" title="Bit Color">
          </div>
        </div>

        </div>
    <div class="button-group">
        <button type="button" id="cancel-btn">Cancel</button>
        <button type="submit" form="bit-form">OK</button>
    </div>
    </div>
  `;

        document.body.appendChild(modal);

        const form = modal.querySelector("#bit-form");

        // Function to check if all required parameters are filled
        function checkBitParametersFilled() {
            const name = form.querySelector("#bit-name").value.trim();
            if (!name) return false;

            const diameter = form.querySelector("#bit-diameter")?.value;
            if (!diameter) return false;

            const length = form.querySelector("#bit-length")?.value;
            if (!length) return false;

            const toolNumber = form.querySelector("#bit-toolnumber")?.value;
            if (!toolNumber) return false;

            if (groupName === "conical") {
                const angle = form.querySelector("#bit-angle")?.value;
                if (!angle) return false;
            }

            if (groupName === "ball") {
                const height = form.querySelector("#bit-height")?.value;
                if (!height) return false;
            }

            if (groupName === "fillet" || groupName === "bull") {
                const height = form.querySelector("#bit-height")?.value;
                const cornerRadius =
                    form.querySelector("#bit-cornerRadius")?.value;
                const flat = form.querySelector("#bit-flat")?.value;
                if (!height || !cornerRadius || !flat) return false;
            }

            return true;
        }

        // Preview canvas manager
        let previewCanvasManager;
        let previewZoomInitialized = false; // Track if initial zoom has been set

        // Initialize preview canvas with CanvasManager
        const initializePreviewCanvas = () => {
            previewCanvasManager = new CanvasManager({
                canvas: modal.querySelector("#bit-preview-canvas"),
                width: 200,
                height: 200,
                enableZoom: true,
                enablePan: true,
                enableGrid: true,
                enableMouseEvents: true,
                gridSize: 10, // 1mm = 10px in preview
                initialZoom: 1,
                initialPanX: 100,
                initialPanY: 100,
                layers: ["grid", "bits"],
                onZoom: (zoomLevel) => {
                    updatePreviewStrokeWidths(zoomLevel);
                },
            });
        };

        // Preview zoom functions
        const previewZoomIn = () => {
            previewCanvasManager.zoomIn();
            updateBitPreview();
        };

        const previewZoomOut = () => {
            previewCanvasManager.zoomOut();
            updateBitPreview();
        };

        const previewFitToScale = () => {
            if (this.validateBitParameters(form, groupName)) {
                const tempBitParams = this.collectBitParameters(
                    form,
                    groupName,
                );

                // Create temp group to get bounds
                const tempGroup = this.createBitShapeElement(
                    tempBitParams,
                    groupName,
                    0,
                    0,
                    true,
                );
                const bounds = getSVGBounds(tempGroup);

                // Use CanvasManager's fitToSVGElement method
                previewCanvasManager.fitToSVGElement(tempGroup, 5);
            } else {
                // Reset to default
                previewCanvasManager.zoomLevel = 1;
                previewCanvasManager.panX = 100;
                previewCanvasManager.panY = 100;
                previewCanvasManager.updateViewBox();
            }

            updatePreviewStrokeWidths();
            updateBitPreview(); // Need to update position after fit
        };

        const togglePreviewGrid = () => {
            previewCanvasManager.toggleGrid();
        };

        // Initialize preview canvas
        initializePreviewCanvas();

        // Event listeners are handled by CanvasManager

        // Function to update stroke widths in preview based on zoom level
        function updatePreviewStrokeWidths(
            zoomLevel = previewCanvasManager?.zoomLevel,
        ) {
            if (!zoomLevel || !previewCanvasManager) return;
            const thickness = Math.max(0.1, 0.5 / Math.sqrt(zoomLevel));

            // Update stroke width for the bit and shank shapes
            const previewBitsLayer = previewCanvasManager.getLayer("bits");
            const bitShape = previewBitsLayer?.querySelector(".bit-shape");
            const shankShape = previewBitsLayer?.querySelector(".shank-shape");
            if (bitShape) {
                bitShape.setAttribute("stroke-width", thickness);
            }
            if (shankShape) {
                shankShape.setAttribute("stroke-width", thickness);
            }
        }

        // Function to update bit preview using canvas functions
        const updateBitPreview = () => {
            // Clear bits layer
            const previewBitsLayer = previewCanvasManager.getLayer("bits");
            previewBitsLayer.innerHTML = ""; // Always clear first

            if (!this.validateBitParameters(form, groupName)) {
                // Show placeholder text if parameters are not complete
                const text = document.createElementNS(svgNS, "text");
                text.setAttribute("x", previewCanvasManager.panX);
                text.setAttribute("y", previewCanvasManager.panY + 10);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("font-size", "14");
                text.setAttribute("fill", "#999");
                text.textContent = "Заполните все параметры";
                previewBitsLayer.appendChild(text);
                return;
            }

            const bitParams = this.collectBitParameters(form, groupName);

            // Calculate bounds for positioning
            const tempGroup = this.createBitShapeElement(
                bitParams,
                groupName,
                0,
                0,
                true,
            );
            const bounds = getSVGBounds(tempGroup);

            // Calculate initial zoom level to fit bit within preview area (only once)
            if (!previewZoomInitialized) {
                const availableWidth = 200 - 40; // 20px padding on each side
                const availableHeight = 200 - 40; // 20px padding on each side

                // Calculate zoom level to fit bit (maximize zoom to fill the canvas)
                const zoomX = availableWidth / bounds.width;
                const zoomY = availableHeight / bounds.height;
                const zoomLevel = Math.min(zoomX, zoomY);

                // Set initial zoom for preview (pan stays at center)
                previewCanvasManager.zoomLevel = zoomLevel;
                previewCanvasManager.updateViewBox();
                previewZoomInitialized = true;
            }

            // Calculate stroke width based on zoom level
            const strokeWidth = Math.max(
                0.1,
                0.5 / Math.sqrt(previewCanvasManager.zoomLevel),
            );

            // Create bit shape centered at pan position
            const shape = this.createBitShapeElement(
                bitParams,
                groupName,
                previewCanvasManager.panX - bounds.centerX,
                previewCanvasManager.panY - bounds.centerY,
                true, // isSelected = true for modal preview
                true, // includeShank = true
                strokeWidth, // pass calculated stroke width
            );

            previewBitsLayer.appendChild(shape);
        };

        // Preview zoom event handlers
        modal
            .querySelector("#preview-zoom-in")
            .addEventListener("click", () => {
                previewZoomIn();
                updateBitPreview();
            });

        modal
            .querySelector("#preview-zoom-out")
            .addEventListener("click", () => {
                previewZoomOut();
                updateBitPreview();
            });

        modal.querySelector("#preview-fit").addEventListener("click", () => {
            previewFitToScale();
        });

        modal
            .querySelector("#preview-toggle-grid")
            .addEventListener("click", () => {
                togglePreviewGrid();
                //updateBitPreview();
            });

        // Add math evaluation on blur for all text inputs
        const inputs = form.querySelectorAll('input[type="text"]');
        inputs.forEach((input) => {
            input.addEventListener("blur", () => {
                input.value = evaluateMathExpression(input.value);
            });
            // Update preview on input change
            input.addEventListener("input", updateBitPreview);
        });

        // Update preview on number input change
        const numberInputs = form.querySelectorAll('input[type="number"]');
        numberInputs.forEach((input) => {
            input.addEventListener("input", updateBitPreview);
            previewFitToScale();
        });

        // Update preview on color input change
        const colorInput = modal.querySelector("#bit-color");
        colorInput.addEventListener("input", updateBitPreview);

        // Update canvas bit in real-time for edit operations
        if (isEdit && bit) {
            const updateCanvasBit = () => {
                // Collect current parameters from form and update canvas bit
                const currentParams = this.collectBitParameters(
                    form,
                    groupName,
                );
                if (this.onUpdateCanvasBitWithParams) {
                    this.onUpdateCanvasBitWithParams(
                        bit.id,
                        currentParams,
                        groupName,
                    );
                }
            };

            // Update canvas when ANY parameter changes (not just shank)
            const allInputs = form.querySelectorAll(
                'input[type="text"], input[type="number"]',
            );
            const colorInput = modal.querySelector("#bit-color");

            allInputs.forEach((input) => {
                input.addEventListener("input", updateCanvasBit);
            });

            if (colorInput) {
                colorInput.addEventListener("input", updateCanvasBit);
            }
        }

        // Initial preview update
        updateBitPreview();
        previewFitToScale();
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = form.querySelector("#bit-name").value.trim();

            if (await this.isBitNameDuplicate(name, isEdit ? bit?.id : null)) {
                alert(
                    "A bit with this name already exists. Please choose a different name.",
                );
                return;
            }

            const payload = this.buildBitPayload(form, groupName);

            let updatedBit;
            if (isEdit) {
                updatedBit = updateBit(groupName, bit.id, payload);
            } else {
                updatedBit = addBit(groupName, payload);
            }

            if (isEdit) {
                this.updateCanvasBitsForBitId(updatedBit.id);
            }

            document.body.removeChild(modal);
            this.refreshBitGroups();
        });

        const cancelBtn = modal.querySelector("#cancel-btn");
        cancelBtn.addEventListener("click", () => {
            document.body.removeChild(modal);
        });
    }

    getGroupSpecificInputs(groupName, defaults = {}) {
        const d = defaults.diameter !== undefined ? defaults.diameter : "";
        const l = defaults.length !== undefined ? defaults.length : "";
        const a = defaults.angle !== undefined ? defaults.angle : "";
        const h = defaults.height !== undefined ? defaults.height : "";
        const cr =
            defaults.cornerRadius !== undefined ? defaults.cornerRadius : "";
        const f = defaults.flat !== undefined ? defaults.flat : "";
        const sd =
            defaults.shankDiameter !== undefined ? defaults.shankDiameter : "";
        const tl =
            defaults.totalLength !== undefined ? defaults.totalLength : "";

        let inputs = `
        <label for="bit-diameter">Diameter:</label>
        <input type="text" id="bit-diameter" required value="${d}">
        <label for="bit-length">Length:</label>
        <input type="text" id="bit-length" required value="${l}">
        <label for="bit-shankDiameter">Shank Diameter:</label>
        <input type="text" id="bit-shankDiameter" value="${sd}">
        <label for="bit-totalLength">Total Length:</label>
        <input type="text" id="bit-totalLength" value="${tl}">
    `;
        if (groupName === "conical") {
            inputs += `
        <label for="bit-angle">Angle:</label>
        <input type="text" id="bit-angle" required value="${a}">
        `;
        }
        if (groupName === "ball") {
            inputs += `
        <label for="bit-height">Height:</label>
        <input type="text" id="bit-height" required value="${h}">
        `;
        }
        if (groupName === "fillet" || groupName === "bull") {
            inputs += `
        <label for="bit-height">Height:</label>
        <input type="text" id="bit-height" required value="${h}">
        <label for="bit-cornerRadius">Corner Radius:</label>
        <input type="text" id="bit-cornerRadius" required value="${cr}">
        <label for="bit-flat">Flat:</label>
        <input type="text" id="bit-flat" required value="${f}">
        `;
        }
        return inputs;
    }

    // Method that will be called from main script to draw bit shape on canvas
    drawBitShape(bit, groupName) {
        // This method will need to be implemented by delegating to the main canvas manager
        // For now, we'll need to pass a callback or reference to the main drawing function
        if (this.onDrawBitShape) {
            this.onDrawBitShape(bit, groupName);
        }
    }

    // Method to update canvas bits when a bit is edited
    updateCanvasBitsForBitId(bitId) {
        // This will be implemented when we connect to the main canvas functionality
        if (this.onUpdateCanvasBits) {
            this.onUpdateCanvasBits(bitId);
        }
    }

    // Assign profilePath to bits based on their SVG shapes
    assignProfilePathsToBits(bits) {
        bits.forEach((bit) => {
            // Use bit.bitData as the bit parameters
            const bitParams = bit.bitData;
            // Create temporary bit shape at origin (0,0) without shank
            const group = this.createBitShapeElement(
                bitParams,
                bit.groupName,
                0,
                0,
                false,
                false,
            );
            const bitShape = group.querySelector(".bit-shape");

            let pathData = "";

            if (bitShape) {
                if (bitShape.tagName === "rect") {
                    // Convert rect to path
                    const x = parseFloat(bitShape.getAttribute("x"));
                    const y = parseFloat(bitShape.getAttribute("y"));
                    const w = parseFloat(bitShape.getAttribute("width"));
                    const h = parseFloat(bitShape.getAttribute("height"));
                    if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
                        pathData = `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${
                            y + h
                        } L ${x} ${y + h} Z`;
                    }
                } else if (bitShape.tagName === "polygon") {
                    // Convert polygon points to path
                    const pointsStr = bitShape.getAttribute("points");
                    if (pointsStr) {
                        const points = pointsStr
                            .trim()
                            .split(/\s+/)
                            .filter((p) => p.includes(","));
                        if (points.length > 0) {
                            pathData = "M " + points.join(" L ") + " Z";
                        }
                    }
                } else if (bitShape.tagName === "path") {
                    // Use path d attribute directly
                    pathData = bitShape.getAttribute("d") || "";
                }
            }

            // Invert Y coordinates to match Three.js coordinate system (SVG Y is down, Three.js Y is up)
            if (pathData) {
                pathData = this.invertYInPath(pathData);
                // Ensure the path is closed
                if (!pathData.trim().endsWith("Z")) {
                    pathData += " Z";
                }
            }

            // Assign to bitData
            if (!bit.bitData) bit.bitData = {};
            bit.bitData.profilePath = pathData;
        });
    }

    // Invert Y coordinates in SVG path data
    invertYInPath(pathData) {
        const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
        const result = [];
        commands.forEach((cmd) => {
            const type = cmd[0].toUpperCase();
            const params = cmd
                .slice(1)
                .trim()
                .split(/[\s,]+/)
                .map(Number)
                .filter((n) => !isNaN(n));
            result.push(type);
            let i = 0;
            while (i < params.length) {
                if (type === "M" || type === "L" || type === "T") {
                    // x y
                    result.push(params[i], -params[i + 1]);
                    i += 2;
                } else if (type === "H") {
                    // x
                    result.push(params[i]);
                    i += 1;
                } else if (type === "V") {
                    // y
                    result.push(-params[i]);
                    i += 1;
                } else if (type === "C") {
                    // x1 y1 x2 y2 x y
                    result.push(
                        params[i],
                        -params[i + 1],
                        params[i + 2],
                        -params[i + 3],
                        params[i + 4],
                        -params[i + 5],
                    );
                    i += 6;
                } else if (type === "S" || type === "Q") {
                    // x1 y1 x y
                    result.push(
                        params[i],
                        -params[i + 1],
                        params[i + 2],
                        -params[i + 3],
                    );
                    i += 4;
                } else if (type === "A") {
                    // rx ry angle large sweep x y
                    // Invert sweep flag when Y is inverted to maintain correct arc direction
                    const sweep = 1 - params[i + 4];
                    result.push(
                        params[i],
                        params[i + 1],
                        params[i + 2],
                        params[i + 3],
                        sweep,
                        params[i + 5],
                        -params[i + 6],
                    );
                    i += 7;
                } else if (type === "Z") {
                    // nothing
                    break;
                } else {
                    // unknown, add as is
                    result.push(...params.slice(i));
                    break;
                }
            }
        });
        return result.join(" ");
    }
}
