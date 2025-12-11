import { getBits, addBit, deleteBit, updateBit } from "../storage/bitsStore.js";
import CanvasManager from "../canvas/CanvasManager.js";
import { evaluateMathExpression } from "../utils/utils.js";

const svgNS = "http://www.w3.org/2000/svg";

export default class BitsManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.bitGroups = document.getElementById("bit-groups");
        this.CLIPPER_SCALE = 1000;
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
            `translate(${size / 2}, ${size / 2})`
        );

        let innerShape;

        if (shape !== "newBit" && params && params.diameter !== undefined) {
            // Use actual bit shape if parameters are provided
            innerShape = this.createBitShapeElement(
                params,
                shape,
                0,
                params.length / 2
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
                    Z`
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
                    Z`
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
                    Z`
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
                    Z`
                    );
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

    // Create bit shape element based on parameters
    createBitShapeElement(bit, groupName, x = 0, y = 0) {
        let shape;
        // Радиус дуги (формула через хорду и стрелу подъёма)
        let A = { x: x + bit.diameter / 2, y: y - bit.height };
        let B = { x: x - bit.diameter / 2, y: y - bit.height };
        let arcRad =
            bit.height / 2 +
            (this.distancePtToPt(A, B) * this.distancePtToPt(A, B)) /
                (8 * bit.height);

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
                    (1 / Math.tan(this.angleToRad(oppositeAngle) / 2));
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
            case "ball":
                shape = document.createElementNS(svgNS, "path");
                shape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 1 ${x - bit.diameter / 2} ${
                        y - bit.height
                    }
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`
                );
                shape.setAttribute("fill", "rgba(255, 0, 0, 0.30)");
                break;
            case "fillet":
                // Fillet cutter: cylindrical part + fillet profile
                arcRad = bit.cornerRadius;
                shape = document.createElementNS(svgNS, "path");
                shape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 0 ${x + bit.flat / 2} ${y}
        L ${x - bit.flat / 2} ${y}
        A ${arcRad} ${arcRad} 0 0 0 ${x - bit.diameter / 2} ${y - bit.height}
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`
                );
                shape.setAttribute("fill", "rgba(128, 0, 128, 0.30)"); // Purple color
                break;
            case "bull":
                // Bull-nose cutter: cylindrical part + bullnose profile
                arcRad = bit.cornerRadius;
                shape = document.createElementNS(svgNS, "path");
                shape.setAttribute(
                    "d",
                    `M ${x + bit.diameter / 2} ${
                        y - bit.height
                    } A ${arcRad} ${arcRad} 0 0 1 ${x + bit.flat / 2} ${y}
        L ${x - bit.flat / 2} ${y}
        A ${arcRad} ${arcRad} 0 0 1 ${x - bit.diameter / 2} ${y - bit.height}
        L ${x - bit.diameter / 2} ${y - bit.length}
        L ${x + bit.diameter / 2} ${y - bit.length} Z`
                );
                shape.setAttribute("fill", "rgba(128, 128, 0, 0.3)"); // Olive color
                break;
        }

        if (shape) {
            shape.setAttribute("stroke", "black");
            shape.classList.add("bit-shape");
        }

        return shape;
    }

    // Helper functions needed for bit shapes
    distancePtToPt(p1, p2) {
        return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    }

    angleToRad(angle) {
        return (angle * Math.PI) / 180;
    }

    // Create bit groups
    createBitGroups() {
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
                    actionIcon.addEventListener("click", (e) => {
                        e.stopPropagation();

                        switch (action) {
                            case "edit":
                                // open edit modal for this bit
                                this.openBitModal(groupName, bit);
                                break;
                            case "copy":
                                this.handleCopyClick(e, bit);
                                break;
                            case "remove":
                                this.handleDeleteClick(e, bit);
                                break;
                        }
                        this.refreshBitGroups();
                    });
                    actionIcons.appendChild(actionIcon);
                });
                bitDiv.appendChild(actionIcons);

                bitDiv.addEventListener("click", () =>
                    this.drawBitShape(bit, groupName)
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
                this.openNewBitMenu(groupName)
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

    refreshBitGroups() {
        this.bitGroups.innerHTML = "";
        this.createBitGroups();
    }

    handleCopyClick(e, bit) {
        const baseName = bit.name;
        const all = getBits();
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
        const allBits = getBits();
        let groupName = null;
        for (const group in allBits) {
            if (allBits[group].some((b) => b.id === bit.id)) {
                groupName = group;
                break;
            }
        }

        if (groupName) {
            addBit(groupName, newBit);
        }
    }

    handleDeleteClick(e, bit) {
        if (confirm(`Are you sure you want to delete ${bit.name}?`)) {
            // Find the group name for this bit
            const allBits = getBits();
            let groupName = null;
            for (const group in allBits) {
                if (allBits[group].some((b) => b.id === bit.id)) {
                    groupName = group;
                    break;
                }
            }

            if (groupName) {
                deleteBit(groupName, bit.id);
            }
        }
    }

    isBitNameDuplicate(name, excludeId = null) {
        const all = getBits();
        return Object.values(all || {})
            .flat()
            .some((bit) => bit.name === name && bit.id !== excludeId);
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
            if (checkBitParametersFilled()) {
                const diameter = parseFloat(
                    evaluateMathExpression(
                        form.querySelector("#bit-diameter").value
                    )
                );
                const length = parseFloat(
                    evaluateMathExpression(
                        form.querySelector("#bit-length").value
                    )
                );
                const availableWidth = 200 - 40; // 20px padding on each side
                const availableHeight = 200 - 40; // 20px padding on each side

                // Calculate zoom level to fit bit (maximize zoom to fill the canvas)
                const zoomX = availableWidth / diameter;
                const zoomY = availableHeight / length;
                const zoomLevel = Math.min(zoomX, zoomY); // Maximize zoom level

                // Set zoom and center on the bit (100, 100 is the center where bit is drawn)
                previewCanvasManager.zoomLevel = zoomLevel;
                previewCanvasManager.panX = 100;
                previewCanvasManager.panY = 100;
                previewCanvasManager.updateViewBox();
            } else {
                // Reset to default
                previewCanvasManager.zoomLevel = 1;
                previewCanvasManager.panX = 100;
                previewCanvasManager.panY = 100;
                previewCanvasManager.updateViewBox();
            }

            updatePreviewStrokeWidths();
            // Don't call updateBitPreview() since bit position doesn't change
        };

        const togglePreviewGrid = () => {
            previewCanvasManager.toggleGrid();
        };

        // Initialize preview canvas
        initializePreviewCanvas();

        // Event listeners are handled by CanvasManager

        // Function to update stroke widths in preview based on zoom level
        function updatePreviewStrokeWidths(
            zoomLevel = previewCanvasManager?.zoomLevel
        ) {
            if (!zoomLevel || !previewCanvasManager) return;
            const thickness = Math.max(0.1, 0.5 / Math.sqrt(zoomLevel));

            // Update stroke width for the bit shape
            const previewBitsLayer = previewCanvasManager.getLayer("bits");
            const shape = previewBitsLayer?.querySelector(".bit-shape");
            if (shape) {
                shape.setAttribute("stroke-width", thickness);
            }
        }

        // Function to update bit preview using canvas functions
        const updateBitPreview = () => {
            // Clear bits layer
            const previewBitsLayer = previewCanvasManager.getLayer("bits");
            previewBitsLayer.innerHTML = "";

            if (!checkBitParametersFilled()) {
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

            // Collect parameters
            const name = form.querySelector("#bit-name").value.trim();
            const diameter = parseFloat(
                evaluateMathExpression(
                    form.querySelector("#bit-diameter").value
                )
            );
            const length = parseFloat(
                evaluateMathExpression(form.querySelector("#bit-length").value)
            );
            const toolNumber = parseInt(
                evaluateMathExpression(
                    form.querySelector("#bit-toolnumber").value
                ),
                10
            );

            let bitParams = {
                name,
                diameter,
                length,
                toolNumber,
            };

            if (groupName === "conical") {
                bitParams.angle = parseFloat(
                    evaluateMathExpression(
                        form.querySelector("#bit-angle").value
                    )
                );
            }

            if (groupName === "ball") {
                bitParams.height = parseFloat(
                    evaluateMathExpression(
                        form.querySelector("#bit-height").value
                    )
                );
            }

            if (groupName === "fillet" || groupName === "bull") {
                bitParams.height = parseFloat(
                    evaluateMathExpression(
                        form.querySelector("#bit-height").value
                    )
                );
                bitParams.cornerRadius = parseFloat(
                    evaluateMathExpression(
                        form.querySelector("#bit-cornerRadius").value
                    )
                );
                bitParams.flat = parseFloat(
                    evaluateMathExpression(
                        form.querySelector("#bit-flat").value
                    )
                );
            }

            // Calculate initial zoom level to fit bit within preview area (only once)
            if (!previewZoomInitialized) {
                const bitDiameter = bitParams.diameter;
                const bitLength = bitParams.length;
                const availableWidth = 200 - 40; // 20px padding on each side
                const availableHeight = 200 - 40; // 20px padding on each side

                // Calculate zoom level to fit bit (maximize zoom to fill the canvas)
                const zoomX = availableWidth / bitDiameter;
                const zoomY = availableHeight / bitLength;
                const zoomLevel = Math.min(zoomX, zoomY);

                // Set initial zoom for preview (pan stays at center)
                previewCanvasManager.zoomLevel = zoomLevel;
                previewCanvasManager.updateViewBox();
                previewZoomInitialized = true;
            }

            // Create bit shape always at center of bit
            const shape = this.createBitShapeElement(
                bitParams,
                groupName,
                100,
                100 + bitParams.length / 2
            );

            previewBitsLayer.appendChild(shape);

            // Update stroke width after adding to DOM
            updatePreviewStrokeWidths();
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
                updateBitPreview();
            });

        // Add math evaluation on blur for all text inputs
        const inputs = form.querySelectorAll('input[type="text"]');
        inputs.forEach((input) => {
            input.addEventListener("blur", () => {
                input.value = this.evaluateMathExpression(input.value);
            });
            // Update preview on input change
            input.addEventListener("input", updateBitPreview);
        });

        // Update preview on number input change
        const numberInputs = form.querySelectorAll('input[type="number"]');
        numberInputs.forEach((input) => {
            input.addEventListener("input", updateBitPreview);
        });

        // Initial preview update
        updateBitPreview();
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = form.querySelector("#bit-name").value.trim();

            if (this.isBitNameDuplicate(name, isEdit ? bit?.id : null)) {
                alert(
                    "A bit with this name already exists. Please choose a different name."
                );
                return;
            }

            const diameterStr = this.evaluateMathExpression(
                form.querySelector("#bit-diameter").value
            );
            const diameter = parseFloat(diameterStr);
            const lengthStr = this.evaluateMathExpression(
                form.querySelector("#bit-length").value
            );
            const length = parseFloat(lengthStr);
            const toolNumberStr = this.evaluateMathExpression(
                form.querySelector("#bit-toolnumber").value
            );
            const toolNumber = parseInt(toolNumberStr, 10) || 1;

            const payload = {
                name,
                diameter,
                length,
                toolNumber,
            };

            if (groupName === "conical") {
                const angleStr = this.evaluateMathExpression(
                    form.querySelector("#bit-angle").value
                );
                payload.angle = parseFloat(angleStr);
            }

            if (groupName === "ball") {
                const heightStr = this.evaluateMathExpression(
                    form.querySelector("#bit-height").value
                );
                payload.height = parseFloat(heightStr);
            }

            if (groupName === "fillet" || groupName === "bull") {
                const heightStr = this.evaluateMathExpression(
                    form.querySelector("#bit-height").value
                );
                payload.height = parseFloat(heightStr);
                const cornerRadiusStr = this.evaluateMathExpression(
                    form.querySelector("#bit-cornerRadius").value
                );
                payload.cornerRadius = parseFloat(cornerRadiusStr);
                const flatStr = this.evaluateMathExpression(
                    form.querySelector("#bit-flat").value
                );
                payload.flat = parseFloat(flatStr);
            }

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

        let inputs = `
        <label for="bit-diameter">Diameter:</label>
        <input type="text" id="bit-diameter" required value="${d}">
        <label for="bit-length">Length:</label>
        <input type="text" id="bit-length" required value="${l}">
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
}
