class BitsTableManager {
    constructor(config) {
        this.sheetBody = document.getElementById("bits-sheet-body");
        this.rightMenu = document.getElementById("right-menu");

        this.getAnchorOffset = config.getAnchorOffset;
        this.transformYForDisplay = config.transformYForDisplay;
        this.transformYFromDisplay = config.transformYFromDisplay;
        this.evaluateMathExpression = config.evaluateMathExpression;
        this.createAlignmentButton = config.createAlignmentButton;
        this.getOperationsForGroup = config.getOperationsForGroup;

        this.callbacks = {
            onSelectBit: () => {},
            onChangePosition: () => {},
            onCycleAlignment: () => {},
            onChangeOperation: () => {},
            onChangeColor: () => {},
            onDeleteBit: () => {},
            onReorderBits: () => {},
            onClearSelection: () => {},
        };

        this.dragSrcRow = null;
        this.rightMenuAttached = false;
        this.boundRightMenuHandler = this.handleRightMenuClick.bind(this);

        if (config.callbacks) {
            this.setCallbacks(config.callbacks);
        }
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    render(bits = [], selectedIndices = []) {
        if (!this.sheetBody) return;

        this.sheetBody.innerHTML = "";
        bits.forEach((bit, index) => {
            const row = this.createRow(bit, index, selectedIndices);
            this.sheetBody.appendChild(row);
        });

        this.attachRightMenuHandler();
    }

    attachRightMenuHandler() {
        if (this.rightMenu && !this.rightMenuAttached) {
            this.rightMenu.addEventListener(
                "click",
                this.boundRightMenuHandler
            );
            this.rightMenuAttached = true;
        }
    }

    handleRightMenuClick(e) {
        const isInteractiveElement = e.target.closest(
            "input, button, svg, tr, td, th"
        );
        if (!isInteractiveElement) {
            this.callbacks.onClearSelection();
        }
    }

    createRow(bit, index, selectedIndices) {
        const row = document.createElement("tr");
        row.setAttribute("data-index", index);

        row.addEventListener("click", (e) => {
            if (this.shouldIgnoreRowClick(e)) return;
            e.stopPropagation();
            this.callbacks.onSelectBit(index);
        });

        const dragCell = document.createElement("td");
        dragCell.className = "drag-handle";
        dragCell.draggable = true;
        dragCell.textContent = "☰";
        dragCell.addEventListener("dragstart", (e) =>
            this.handleDragStart(e, row)
        );
        dragCell.addEventListener("dragend", (e) => this.handleDragEnd(e));
        row.appendChild(dragCell);

        const numCell = document.createElement("td");
        numCell.textContent = index + 1;
        row.appendChild(numCell);

        const nameCell = document.createElement("td");
        nameCell.textContent = bit.name;
        row.appendChild(nameCell);

        const anchorOffset = this.getAnchorOffset(bit);

        const xCell = document.createElement("td");
        const xInput = document.createElement("input");
        xInput.type = "text";
        xInput.value = (bit.x || 0) + anchorOffset.x;
        xInput.addEventListener("change", async () => {
            const val = this.evaluateMathExpression(xInput.value);
            xInput.value = val;
            const newAnchorX = parseFloat(val) || 0;
            const newX = newAnchorX - anchorOffset.x;
            await this.callbacks.onChangePosition(index, newX, bit.y);
        });
        xCell.appendChild(xInput);
        row.appendChild(xCell);

        const yCell = document.createElement("td");
        const yInput = document.createElement("input");
        yInput.type = "text";
        yInput.value = this.transformYForDisplay(bit.y, anchorOffset);
        yInput.addEventListener("change", async () => {
            const val = this.evaluateMathExpression(yInput.value);
            yInput.value = val;
            const newY = this.transformYFromDisplay(val, anchorOffset);
            await this.callbacks.onChangePosition(index, bit.x, newY);
        });
        yCell.appendChild(yInput);
        row.appendChild(yCell);

        const alignCell = document.createElement("td");
        const alignBtn = document.createElement("button");
        alignBtn.type = "button";
        alignBtn.style.background = "none";
        alignBtn.style.border = "none";
        alignBtn.style.padding = "0";
        alignBtn.style.cursor = "pointer";
        alignBtn.appendChild(
            this.createAlignmentButton(bit.alignment || "center")
        );
        alignBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await this.callbacks.onCycleAlignment(index);
        });
        alignCell.appendChild(alignBtn);
        row.appendChild(alignCell);

        const opCell = document.createElement("td");
        const opSelect = document.createElement("select");
        opSelect.style.width = "100%";
        opSelect.style.padding = "2px";
        opSelect.style.border = "1px solid #ccc";
        opSelect.style.borderRadius = "3px";

        const groupOperations = this.getOperationsForGroup(bit.groupName);
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
            this.callbacks.onChangeOperation(index, opSelect.value);
        });

        opCell.appendChild(opSelect);
        row.appendChild(opCell);

        const colorCell = document.createElement("td");
        const colorInput = document.createElement("input");
        colorInput.id = `bit-color-input`;
        colorInput.type = "color";
        colorInput.value = bit.color || "#cccccc";
        colorInput.style.border = "1px solid #ccc";
        colorInput.style.borderRadius = "3px";
        colorInput.style.cursor = "pointer";

        colorInput.addEventListener("input", () => {
            this.callbacks.onChangeColor(index, colorInput.value);
        });

        colorCell.appendChild(colorInput);
        row.appendChild(colorCell);

        const delCell = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "del-btn";
        delBtn.textContent = "✕";
        delBtn.title = "Delete bit from canvas";
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.callbacks.onDeleteBit(index);
        });
        delCell.appendChild(delBtn);
        row.appendChild(delCell);

        row.addEventListener("dragover", (e) => this.handleDragOver(e));
        row.addEventListener("drop", (e) => this.handleDrop(e, row));

        if (selectedIndices.includes(index)) {
            row.classList.add("selected-bit-row");
        }

        return row;
    }

    shouldIgnoreRowClick(e) {
        return (
            e.target.tagName === "INPUT" ||
            e.target.tagName === "SELECT" ||
            e.target.closest("button") ||
            e.target.closest("svg") ||
            e.target.closest("option")
        );
    }

    handleDragStart(e, row) {
        this.dragSrcRow = row;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", row.getAttribute("data-index"));
        row.style.opacity = "0.4";
    }

    handleDragOver(e) {
        if (e.preventDefault) e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        return false;
    }

    handleDrop(e, row) {
        if (e.stopPropagation) e.stopPropagation();
        if (!this.dragSrcRow) return false;

        const srcIndex = parseInt(this.dragSrcRow.getAttribute("data-index"));
        const destIndex = parseInt(row.getAttribute("data-index"));

        if (srcIndex !== destIndex) {
            this.callbacks.onReorderBits(srcIndex, destIndex);
        }

        return false;
    }

    handleDragEnd() {
        if (this.dragSrcRow) this.dragSrcRow.style.opacity = "1";
        this.dragSrcRow = null;
    }
}

export default BitsTableManager;
