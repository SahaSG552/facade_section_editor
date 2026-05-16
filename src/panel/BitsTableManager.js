import { addUnifiedPressListener } from "../ui/pressEvents.js";
import SVGThemeHelper from "../shared/theme/SVGThemeHelper.js";

/**
 * BitWarningsBuilder - Строит массив предупреждений для бита
 */
class BitWarningsBuilder {
    constructor() {
        this.warnings = [];
    }

    /**
     * Добавить предупреждение
     * @param {string} message - Текст предупреждения
     * @returns {BitWarningsBuilder} Для цепочки вызовов
     */
    add(message) {
        this.warnings.push(message);
        return this;
    }

    /**
     * Добавить предупреждение только если условие истинно
     * @param {boolean} condition - Условие
     * @param {string} message - Текст предупреждения
     * @returns {BitWarningsBuilder} Для цепочки вызовов
     */
    addIf(condition, message) {
        if (condition) {
            this.warnings.push(message);
        }
        return this;
    }

    /**
     * Получить массив предупреждений
     * @returns {Array<string>}
     */
    build() {
        return this.warnings;
    }
}

class BitsTableManager {
    constructor(config) {
        this.sheetBody = document.getElementById("bits-sheet-body");
        this.rightMenu = document.getElementById("right-menu");
        this.copyAllBtn = document.getElementById("bits-copy-all");
        this.hideAllBtn = document.getElementById("bits-hide-all");
        this.deleteAllBtn = document.getElementById("bits-delete-all");
        this.nameHeader = document.getElementById("bits-name-header");

        this.getAnchorOffset = config.getAnchorOffset;
        this.transformYForDisplay = config.transformYForDisplay;
        this.transformYFromDisplay = config.transformYFromDisplay;
        this.evaluateMathExpression = config.evaluateMathExpression;
        this.createAlignmentButton = config.createAlignmentButton;
        this.getOperationsForGroup = config.getOperationsForGroup;
        this.convertToTopAnchorCoordinates =
            config.convertToTopAnchorCoordinates;
        this.getPanelThickness = config.getPanelThickness;
        this.angleToRad = config.angleToRad || ((deg) => (deg * Math.PI) / 180);

        this.callbacks = {
            onSelectBit: () => {},
            onChangePosition: () => {},
            onCycleAlignment: () => {},
            onChangeOperation: () => {},
            onChangeColor: () => {},
            onDeleteBit: () => {},
            onCopyBit: () => {},
            onCopyAllBits: () => {},
            onToggleVisibility: () => {},
            onHideAllBits: () => {},
            onDeleteAllBits: () => {},
            onChangeLcs: () => {},
            onCopyLcs: () => {},
            onDeleteLcs: () => {},
            onReorderRows: () => {},
            onReorderBits: () => {},
            onClearSelection: () => {},
            onSelectAllBits: () => {},
        };

        this.dragSrcRow = null;
        this.rightMenuAttached = false;
        this.boundRightMenuHandler = this.handleRightMenuClick.bind(this);
        this.headerHandlersAttached = false;
        this.boundCopyAllHandler = this.handleCopyAllClick.bind(this);
        this.boundHideAllHandler = this.handleHideAllClick.bind(this);
        this.boundDeleteAllHandler = this.handleDeleteAllClick.bind(this);

        if (config.callbacks) {
            this.setCallbacks(config.callbacks);
        }

        // Listen for theme changes to refresh SVG colors in table
        if (typeof window !== 'undefined') {
            window.addEventListener('themechange', () => {
                this.refreshTableSVGColors();
            });
        }
    }

    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    bindPress(element, handler) {
        if (!element || typeof handler !== "function") return;
        addUnifiedPressListener(element, (e) => {
            e.stopPropagation();
            handler(e);
        });
    }

    /**
     * Refresh SVG colors in bits table when theme changes
     */
    refreshTableSVGColors() {
        if (!this.sheetBody) return;

        // Update colors for all SVG elements in alignment buttons
        const alignmentSVGs = this.sheetBody.querySelectorAll('svg');
        alignmentSVGs.forEach(svg => {
            // Find rect (background) and update its colors
            const rect = svg.querySelector('rect');
            if (rect) {
                SVGThemeHelper.setThemeColors(
                    rect,
                    "--color-bg-surface",
                    "--color-text-muted"
                );
            }

            // Find lines and update their colors  
            const lines = svg.querySelectorAll('line');
            lines.forEach(line => {
                // Lines can be either primary color or action accent
                const stroke = line.getAttribute('stroke-dasharray');
                if (stroke) {
                    // Dashed lines are text-primary
                    SVGThemeHelper.setStrokeFromVariable(line, "--color-text-primary");
                } else {
                    // Solid lines are action-accent (anchor cross)
                    SVGThemeHelper.setStrokeFromVariable(line, "--color-action-accent");
                }
            });

            // Find shapes (squares in alignment) and update their colors
            const shapes = svg.querySelectorAll('rect:not([width="20"])');
            shapes.forEach(shape => {
                SVGThemeHelper.setFillFromVariable(shape, "--color-text-primary");
            });
        });
    }

    /**
     * Generate warnings for bit operation
     * @param {Object} bit - Bit data
     * @returns {Array<string>} Array of warning messages
     */
    generateWarnings(bit) {
        const builder = new BitWarningsBuilder();

        // Check if bit has VC operation
        if (bit.operation === "VC" && bit.bitData) {
            // Convert to top anchor coordinates to get depth
            const topAnchorCoords = this.convertToTopAnchorCoordinates(bit);
            const bitY = topAnchorCoords.y; // Depth from top anchor

            const angle = parseFloat(bit.bitData.angle) || 0;
            const diameter = parseFloat(bit.bitData.diameter) || 0;

            if (angle > 0 && diameter > 0 && bitY > 0) {
                // Calculate number of passes
                const hypotenuse = diameter;
                const bitHeight =
                    (hypotenuse / 2) *
                    (1 / Math.tan(this.angleToRad(angle) / 2));
                const passes =
                    bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

                builder.addIf(passes > 1, `${passes} passes`);

                // Calculate and display work offset distance
                const workOffsetValue =
                    bitY * Math.tan(this.angleToRad(angle / 2));
                const workOffsetDistance = topAnchorCoords.x - workOffsetValue;
                const workOffsetRounded = parseFloat(
                    workOffsetDistance.toFixed(2)
                );
                builder.add(`Work offset: ${workOffsetRounded}mm`);
            }
        }

        // Check for shank collision (set in updateBitExtensions)
        builder.addIf(bit.hasShankCollision, "⚠ Shank collision");

        // Check for PO (Pocketing) operation parameters
        if (bit.operation === "PO") {
            const diameter = bit.bitData?.diameter || 10;
            const pocketOffset = bit.pocketOffset || 0;
            const pocketWidth = diameter + pocketOffset;

            builder.add(
                `Pocket width: ${parseFloat(pocketWidth.toFixed(1))}mm`
            );
            builder.addIf(bit.isFullRemoval, "▧ Full pocket");
        }

        // Check if bit cuts through material
        if (this.convertToTopAnchorCoordinates && this.getPanelThickness) {
            const topAnchorCoords = this.convertToTopAnchorCoordinates(bit);
            const bitDepth = topAnchorCoords.y; // Depth from top anchor
            const panelThickness = this.getPanelThickness();
            builder.addIf(bitDepth >= panelThickness, "⚠ Cut through");
        }

        return builder.build();
    }

    render(rows = [], selectedIndices = []) {
        if (!this.sheetBody) return;

        this.sheetBody.innerHTML = "";
        rows.forEach((rowData, index) => {
            const row = this.createRow(rowData, index, selectedIndices);
            this.sheetBody.appendChild(row);
        });

        this.attachRightMenuHandler();
        this.attachHeaderHandlers();
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

    attachHeaderHandlers() {
        if (this.headerHandlersAttached) return;

        if (this.copyAllBtn) {
            this.bindPress(this.copyAllBtn, this.boundCopyAllHandler);
        }
        if (this.hideAllBtn) {
            this.bindPress(this.hideAllBtn, this.boundHideAllHandler);
        }
        if (this.deleteAllBtn) {
            this.bindPress(this.deleteAllBtn, this.boundDeleteAllHandler);
        }
        if (this.nameHeader) {
            this.bindPress(this.nameHeader, (e) => {
                e.stopPropagation();
                this.callbacks.onSelectAllBits();
            });
        }

        this.headerHandlersAttached = true;
    }

    handleCopyAllClick(e) {
        e.stopPropagation();
        this.callbacks.onCopyAllBits();
    }

    handleHideAllClick(e) {
        e.stopPropagation();
        this.callbacks.onHideAllBits();
    }

    handleDeleteAllClick(e) {
        e.stopPropagation();
        this.callbacks.onDeleteAllBits();
    }

    createRow(rowData, index, selectedIndices) {
        if (rowData?.rowType === "lcs") {
            return this.createLcsRow(rowData, index);
        }

        const bit = rowData?.bit || rowData;
        const lcsOffset = rowData?.lcsOffset || { x: 0, y: 0 };
        const bitIndex = rowData?.bitIndex ?? index;
        const row = document.createElement("tr");
        row.setAttribute("data-index", index);

        row.addEventListener("click", (e) => {
            if (this.shouldIgnoreRowClick(e)) return;
            e.stopPropagation();
            this.callbacks.onSelectBit(bitIndex);
        });

        const dragCell = document.createElement("td");
        dragCell.className = "drag-handle";
        dragCell.draggable = true;
        dragCell.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>';
        dragCell.addEventListener("dragstart", (e) =>
            this.handleDragStart(e, row)
        );
        dragCell.addEventListener("dragend", (e) => this.handleDragEnd(e));
        row.appendChild(dragCell);

        const numCell = document.createElement("td");
        numCell.textContent = rowData?.displayOrder ?? bitIndex + 1;
        row.appendChild(numCell);

        const nameCell = document.createElement("td");

        const bitNameDiv = document.createElement("div");
        bitNameDiv.textContent = bit.name;
        nameCell.appendChild(bitNameDiv);

        // Generate and display warnings
        const warnings = this.generateWarnings(bit);
        if (warnings.length > 0) {
            const warningDiv = document.createElement("div");
            warningDiv.className = "bit-warning-text";
            warningDiv.textContent = warnings.join(", ");
            nameCell.appendChild(warningDiv);
        }

        row.appendChild(nameCell);

        const anchorOffset = this.getAnchorOffset(bit);

        const xCell = document.createElement("td");
        const xInput = document.createElement("input");
        xInput.type = "text";
        xInput.value = (bit.x || 0) - lcsOffset.x + anchorOffset.x;
        xInput.addEventListener("change", async () => {
            const val = this.evaluateMathExpression(xInput.value);
            xInput.value = val;
            const newAnchorX = parseFloat(val) || 0;
            const newX = newAnchorX - anchorOffset.x + lcsOffset.x;
            await this.callbacks.onChangePosition(bitIndex, newX, bit.y);
        });
        xCell.appendChild(xInput);
        row.appendChild(xCell);

        const yCell = document.createElement("td");
        const yInput = document.createElement("input");
        yInput.type = "text";
        const relativeY = (bit.y || 0) - lcsOffset.y;
        yInput.value = this.transformYForDisplay(relativeY, anchorOffset);
        yInput.addEventListener("change", async () => {
            const val = this.evaluateMathExpression(yInput.value);
            yInput.value = val;
            const newY =
                this.transformYFromDisplay(val, anchorOffset) + lcsOffset.y;
            await this.callbacks.onChangePosition(bitIndex, bit.x, newY);
        });
        yCell.appendChild(yInput);
        row.appendChild(yCell);

        const alignCell = document.createElement("td");
        const alignBtn = document.createElement("button");
        alignBtn.type = "button";
        alignBtn.className = "bit-action-btn";
        alignBtn.appendChild(
            this.createAlignmentButton(bit.alignment || "center")
        );
        this.bindPress(alignBtn, async (e) => {
            e.stopPropagation();
            await this.callbacks.onCycleAlignment(bitIndex);
        });
        alignCell.appendChild(alignBtn);
        row.appendChild(alignCell);

        const opCell = document.createElement("td");
        const opSelect = document.createElement("select");
        opSelect.className = "bits-table-select";

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
            this.callbacks.onChangeOperation(bitIndex, opSelect.value);
        });

        opCell.appendChild(opSelect);
        row.appendChild(opCell);

        const colorCell = document.createElement("td");
        const colorInput = document.createElement("input");
        colorInput.id = `bit-color-input`;
        colorInput.type = "color";
        colorInput.value = bit.color || "#cccccc";
        colorInput.className = "bits-table-color";

        colorInput.addEventListener("input", () => {
            this.callbacks.onChangeColor(bitIndex, colorInput.value);
        });

        colorCell.appendChild(colorInput);
        row.appendChild(colorCell);

        const copyCell = document.createElement("td");
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "bit-action-btn";
        copyBtn.title = "Copy bit";
        copyBtn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        this.bindPress(copyBtn, (e) => {
            e.stopPropagation();
            this.callbacks.onCopyBit(bitIndex);
        });
        copyCell.appendChild(copyBtn);
        row.appendChild(copyCell);

        const visibilityCell = document.createElement("td");
        const visibilityBtn = document.createElement("button");
        const isVisible = bit.isVisible !== false;
        visibilityBtn.type = "button";
        visibilityBtn.className = `bit-action-btn bit-visibility-btn${
            isVisible ? "" : " is-hidden"
        }`;
        visibilityBtn.title = isVisible ? "Hide bit" : "Show bit";
        visibilityBtn.innerHTML = isVisible
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';
        this.bindPress(visibilityBtn, (e) => {
            e.stopPropagation();
            this.callbacks.onToggleVisibility(bitIndex);
        });
        visibilityCell.appendChild(visibilityBtn);
        row.appendChild(visibilityCell);

        const delCell = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "bit-action-btn del-btn";
        delBtn.title = "Delete bit from canvas";
        delBtn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
        this.bindPress(delBtn, (e) => {
            e.stopPropagation();
            this.callbacks.onDeleteBit(bitIndex);
        });
        delCell.appendChild(delBtn);
        row.appendChild(delCell);

        row.addEventListener("dragover", (e) => this.handleDragOver(e));
        row.addEventListener("drop", (e) => this.handleDrop(e, row));

        if (selectedIndices.includes(bitIndex)) {
            row.classList.add("selected-bit-row");
        }

        if (bit.isVisible === false) {
            row.classList.add("bit-row-hidden");
        }

        return row;
    }

    createLcsRow(rowData, index) {
        const lcs = rowData.lcs;
        const row = document.createElement("tr");
        row.classList.add("lcs-row");
        row.setAttribute("data-index", index);

        const dragCell = document.createElement("td");
        dragCell.className = "drag-handle";
        dragCell.draggable = true;
        dragCell.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>';
        dragCell.addEventListener("dragstart", (e) =>
            this.handleDragStart(e, row)
        );
        dragCell.addEventListener("dragend", (e) => this.handleDragEnd(e));
        row.appendChild(dragCell);

        const numCell = document.createElement("td");
        numCell.textContent = "";
        row.appendChild(numCell);

        const nameCell = document.createElement("td");
        const nameDiv = document.createElement("div");
        nameDiv.textContent = `LCS ${lcs.number}`;
        nameCell.appendChild(nameDiv);
        row.appendChild(nameCell);

        const xCell = document.createElement("td");
        const xInput = document.createElement("input");
        xInput.type = "text";
        xInput.value = lcs.x || 0;
        xInput.addEventListener("change", () => {
            const val = this.evaluateMathExpression(xInput.value);
            xInput.value = val;
            const newX = parseFloat(val) || 0;
            this.callbacks.onChangeLcs(lcs.id, { x: newX });
        });
        xCell.appendChild(xInput);
        row.appendChild(xCell);

        const yCell = document.createElement("td");
        const yInput = document.createElement("input");
        yInput.type = "text";
        yInput.value = lcs.y || 0;
        yInput.addEventListener("change", () => {
            const val = this.evaluateMathExpression(yInput.value);
            yInput.value = val;
            const newY = parseFloat(val) || 0;
            this.callbacks.onChangeLcs(lcs.id, { y: newY });
        });
        yCell.appendChild(yInput);
        row.appendChild(yCell);

        const alignCell = document.createElement("td");
        alignCell.textContent = "";
        row.appendChild(alignCell);

        const opCell = document.createElement("td");
        const opSelect = document.createElement("select");
        opSelect.className = "bits-table-select";
        ["top", "bottom"].forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            if ((lcs.side || "top") === value) {
                option.selected = true;
            }
            opSelect.appendChild(option);
        });
        opSelect.addEventListener("change", () => {
            this.callbacks.onChangeLcs(lcs.id, { side: opSelect.value });
        });
        opCell.appendChild(opSelect);
        row.appendChild(opCell);

        const colorCell = document.createElement("td");
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = lcs.color || "#ff3b3b";
        colorInput.className = "bits-table-color";
        colorInput.addEventListener("change", () => {
            this.callbacks.onChangeLcs(lcs.id, { color: colorInput.value });
        });
        colorCell.appendChild(colorInput);
        row.appendChild(colorCell);

        const copyCell = document.createElement("td");
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "bit-action-btn";
        copyBtn.title = "Copy LCS";
        copyBtn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        this.bindPress(copyBtn, (e) => {
            e.stopPropagation();
            this.callbacks.onCopyLcs(lcs.id);
        });
        copyCell.appendChild(copyBtn);
        row.appendChild(copyCell);

        const visibilityCell = document.createElement("td");
        visibilityCell.textContent = "";
        row.appendChild(visibilityCell);

        const delCell = document.createElement("td");
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "del-btn";
        delBtn.title = "Delete LCS";
        delBtn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
        this.bindPress(delBtn, (e) => {
            e.stopPropagation();
            this.callbacks.onDeleteLcs(lcs.id);
        });
        delCell.appendChild(delBtn);
        row.appendChild(delCell);

        row.addEventListener("dragover", (e) => this.handleDragOver(e));
        row.addEventListener("drop", (e) => this.handleDrop(e, row));

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
            this.callbacks.onReorderRows(srcIndex, destIndex);
        }

        return false;
    }

    handleDragEnd() {
        if (this.dragSrcRow) this.dragSrcRow.style.opacity = "1";
        this.dragSrcRow = null;
    }
}

export default BitsTableManager;
