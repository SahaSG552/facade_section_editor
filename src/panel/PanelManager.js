import LoggerFactory from "../core/LoggerFactory.js";

const svgNS = "http://www.w3.org/2000/svg";
const log = LoggerFactory.createLogger("PanelManager");

/**
 * PanelManager - handles all panel-related operations
 * Manages panel shape, anchor, dimensions, and visual updates
 */
class PanelManager {
    constructor(config) {
        this.canvas = config.canvas;
        this.canvasManager = config.canvasManager;
        this.bitsManager = config.bitsManager;

        // Panel state
        this.panelWidth = config.panelWidth || 400;
        this.panelHeight = config.panelHeight || 600;
        this.panelThickness = config.panelThickness || 19;
        this.panelAnchor = config.panelAnchor || "top-left"; // "top-left" or "bottom-left"
        this.gridSize = config.gridSize || 1;

        // SVG elements
        this.partSection = null;
        this.partFront = null;

        // Flag to track if partFront shape was manually edited
        this.partFrontManuallyEdited = false;

        // DOM inputs
        this.panelWidthInput = document.getElementById("panel-width");
        this.panelHeightInput = document.getElementById("panel-height");
        this.panelThicknessInput = document.getElementById("panel-thickness");

        // Callbacks
        this.onPanelUpdate = config.onPanelUpdate || (() => {});
        this.onAnchorChange = config.onAnchorChange || (() => {});
        this.getAdaptiveStrokeWidth =
            config.getAdaptiveStrokeWidth || (() => 1);
        this.updatePartShape = config.updatePartShape || (() => {});
        this.updateOffsetContours = config.updateOffsetContours || (() => {});
        this.updatePhantomBits = config.updatePhantomBits || (() => {});
        this.updateBitsSheet = config.updateBitsSheet || (() => {});

        log.info("PanelManager initialized");
    }

    /**
     * Initialize SVG elements for panel
     */
    initializeSVGElements() {
        this.partSection = document.createElementNS(svgNS, "rect");
        // Изменяем partFront с rect на path для арки
        this.partFront = document.createElementNS(svgNS, "path");

        // Add to panel layer if available
        const panelLayer = this.canvasManager.getLayer("panel");
        if (panelLayer) {
            this.partSection.id = "panel-section";
            this.partFront.id = "part-front";
            panelLayer.appendChild(this.partSection);
            panelLayer.appendChild(this.partFront);
        } else {
            // Fallback: add to SVG directly
            const svgElement = this.canvas.querySelector("svg");
            if (svgElement) {
                svgElement.appendChild(this.partSection);
                svgElement.appendChild(this.partFront);
            }
        }

        this.updatePanelShape();
    }

    /**
     * Get panel anchor offset based on current anchor setting
     */
    getPanelAnchorOffset() {
        if (this.panelAnchor === "top-left") {
            return { x: 0, y: 0 };
        } else if (this.panelAnchor === "bottom-left") {
            return { x: 0, y: this.panelThickness };
        }
        return { x: 0, y: 0 };
    }

    /**
     * Transform Y coordinate for display (considering anchor)
     */
    transformYForDisplay(rawY, anchorOffset = { x: 0, y: 0 }) {
        const displayY = rawY + (anchorOffset.y || 0);
        return this.panelAnchor === "bottom-left" ? -displayY : displayY;
    }

    /**
     * Transform Y coordinate from display (considering anchor)
     */
    transformYFromDisplay(displayY, anchorOffset = { x: 0, y: 0 }) {
        const adjustedY =
            this.panelAnchor === "bottom-left" ? -displayY : displayY;
        return adjustedY - (anchorOffset.y || 0);
    }

    /**
     * Get panel anchor coordinates in canvas space
     */
    getPanelAnchorCoords() {
        const panelX =
            (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
        const panelY =
            (this.canvasManager.canvasParameters.height - this.panelThickness) /
            2;
        const anchorOffset = this.getPanelAnchorOffset();

        return {
            x: panelX + anchorOffset.x,
            y: panelY + anchorOffset.y,
        };
    }

    /**
     * Update bit logical positions after anchor change
     */
    updateBitsForNewAnchor(bits = []) {
        const panelX =
            (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
        const panelY =
            (this.canvasManager.canvasParameters.height - this.panelThickness) /
            2;
        const previousAnchor =
            this.panelAnchor === "top-left" ? "bottom-left" : "top-left";

        const currentAnchorX = panelX;
        const currentAnchorY =
            previousAnchor === "top-left"
                ? panelY
                : panelY + this.panelThickness;
        const newAnchorX = panelX;
        const newAnchorY =
            this.panelAnchor === "top-left"
                ? panelY
                : panelY + this.panelThickness;

        bits.forEach((bit) => {
            const physicalX = currentAnchorX + bit.x;
            const physicalY = currentAnchorY + bit.y;

            const newX = physicalX - newAnchorX;
            const newY = physicalY - newAnchorY;

            bit.x = newX;
            bit.y = newY;

            if (this.updateBitsSheet) {
                this.updateBitsSheet();
            }

            const newAbsX = newAnchorX + newX;
            const newAbsY = newAnchorY + newY;
            const dx = newAbsX - bit.baseAbsX;
            const dy = newAbsY - bit.baseAbsY;
            if (bit.group) {
                bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);
            }
        });
    }

    /**
     * Reposition bits to match current anchor and logical coordinates
     */
    updateBitsPositions(bits = []) {
        const panelX =
            (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
        const panelY =
            (this.canvasManager.canvasParameters.height - this.panelThickness) /
            2;
        const anchorOffset = this.getPanelAnchorOffset();
        const anchorX = panelX + anchorOffset.x;
        const anchorY = panelY + anchorOffset.y;

        bits.forEach((bit) => {
            const desiredAbsX = anchorX + (bit.x || 0);
            const desiredAbsY = anchorY + (bit.y || 0);

            const dx = desiredAbsX - bit.baseAbsX;
            const dy = desiredAbsY - bit.baseAbsY;

            if (bit.group) {
                bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);
            }
        });
    }

    /**
     * Cycle panel anchor between top-left and bottom-left
     */
    cyclePanelAnchor() {
        this.panelAnchor =
            this.panelAnchor === "top-left" ? "bottom-left" : "top-left";

        // Update button icon
        const panelAnchorBtn = document.getElementById("panel-anchor-btn");
        if (panelAnchorBtn) {
            panelAnchorBtn.innerHTML = "";
            // Note: createpanelAnchorButton should be passed in or imported
        }

        this.onAnchorChange(this.panelAnchor);
        this.updatePanelAnchorIndicator();
        this.updateGridAnchor();
        log.debug(`Panel anchor changed to: ${this.panelAnchor}`);
    }

    /**
     * Update panel shape (position and dimensions)
     */
    updatePanelShape() {
        const panelX =
            (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
        const panelY =
            (this.canvasManager.canvasParameters.height - this.panelThickness) /
            2;

        this.partSection.setAttribute("x", panelX);
        this.partSection.setAttribute("y", panelY);
        this.partSection.setAttribute("width", this.panelWidth);
        this.partSection.setAttribute("height", this.panelThickness);
        this.partSection.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
        this.partSection.setAttribute("stroke", "black");

        this.updatePartFront();
        this.updatePanelAnchorIndicator();

        this.onPanelUpdate();
    }

    /**
     * Update part front view
     * Прямоугольник с полукруглой аркой сверху для теста paperjs-offset с кривыми Безье
     */
    updatePartFront() {
        const panelX =
            (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
        const panelY =
            (this.canvasManager.canvasParameters.height - this.panelThickness) /
            2;

        const frontX = panelX;
        const frontY = panelY - this.panelHeight - 100;
        const frontWidth = this.panelWidth;
        const frontHeight = this.panelHeight;

        // Создаём path: прямоугольник с полукруглой аркой сверху
        // M = move to, L = line to, A = arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y), Z = close
        const archRadius = frontWidth / 2; // Радиус арки = половина ширины
        const archHeight = archRadius; // Высота арки = радиус (полукруг)

        const pathData = [
            `M ${frontX + frontWidth} ${frontY + frontHeight}`, // Старт: правый нижний угол
            `L ${frontX + frontWidth} ${frontY + archHeight}`, // Вверх справа до начала арки
            `L ${frontX + frontWidth} ${frontY + archHeight}`, // Вверх справа до начала арки
            `A ${archRadius} ${archRadius} 0 0 0 ${frontX} ${
                frontY + archHeight
            }`, // Арка (полукруг влево)
            `L ${frontX} ${frontY + frontHeight}`, // Вниз к низу слева
            `Z`, // Замыкаем путь
        ].join(" ");

        this.partFront.setAttribute("d", pathData);
        this.partFront.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
        this.partFront.setAttribute("stroke", "black");
        this.partFront.setAttribute(
            "stroke-width",
            this.getAdaptiveStrokeWidth()
        );

        // Note: Do NOT sync params here during initialization
        // Parameters are the source for creating the shape
        // Only sync when shape is manually edited (partFrontManuallyEdited = true)
    }

    /**
     * Update panel anchor indicator (visual cross at anchor point)
     */
    updatePanelAnchorIndicator() {
        const indicator = document.getElementById("panel-anchor-indicator");
        if (!indicator) return;

        indicator.innerHTML = "";

        const panelX =
            (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
        const panelY =
            (this.canvasManager.canvasParameters.height - this.panelThickness) /
            2;

        let anchorX, anchorY;
        if (this.panelAnchor === "top-left") {
            anchorX = panelX;
            anchorY = panelY;
        } else if (this.panelAnchor === "bottom-left") {
            anchorX = panelX;
            anchorY = panelY + this.panelThickness;
        }

        // Draw a small cross
        const crossSize = 5;
        const thickness = Math.max(
            0.1,
            0.5 / Math.sqrt(this.canvasManager.zoomLevel)
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

    /**
     * Update grid anchor position
     */
    updateGridAnchor() {
        const panelX =
            (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
        const panelY =
            (this.canvasManager.canvasParameters.height - this.panelThickness) /
            2;
        const anchorOffset = this.getPanelAnchorOffset();
        const gridAnchorX = panelX + anchorOffset.x + this.gridSize / 2;
        const gridAnchorY = panelY + anchorOffset.y + this.gridSize / 2;

        if (this.canvasManager && this.canvasManager.config) {
            this.canvasManager.config.gridAnchorX = gridAnchorX;
            this.canvasManager.config.gridAnchorY = gridAnchorY;
            if (this.canvasManager.gridEnabled) {
                this.canvasManager.drawGrid();
            }
        }
    }

    /**
     * Update panel parameters from UI inputs
     * Parameters are source for creating the shape during initialization
     */
    updatePanelParams() {
        // Read values from UI inputs
        this.panelWidth =
            parseInt(this.panelWidthInput.value) || this.panelWidth;
        this.panelHeight =
            parseInt(this.panelHeightInput.value) || this.panelHeight;
        this.panelThickness =
            parseInt(this.panelThicknessInput.value) || this.panelThickness;

        // Reset manual edit flag when parameters are changed
        this.partFrontManuallyEdited = false;

        this.updatePanelShape();
        this.updateGridAnchor();
        this.updateOffsetContours();
        this.updatePhantomBits();
        this.updatePartShape();

        log.debug(
            `Panel params updated: ${this.panelWidth}x${this.panelHeight}x${this.panelThickness}`
        );
    }

    /**
     * Mark partFront as manually edited
     * Call this when shape is modified by external editor
     */
    markPartFrontAsEdited() {
        this.partFrontManuallyEdited = true;
        this.syncParamsFromPartFront();
        log.info("partFront marked as manually edited");
    }

    /**
     * Get real dimensions from partFront SVG bbox
     * This is the source of truth for panel dimensions
     */
    getPartFrontDimensions() {
        if (!this.partFront) {
            log.warn("partFront not initialized");
            return { width: this.panelWidth, height: this.panelHeight };
        }

        try {
            const bbox = this.partFront.getBBox();
            return {
                width: bbox.width,
                height: bbox.height,
                x: bbox.x,
                y: bbox.y,
            };
        } catch (error) {
            log.error("Error getting partFront bbox:", error);
            return { width: this.panelWidth, height: this.panelHeight };
        }
    }

    /**
     * Sync panel parameters from partFront bbox
     * This ensures parameters reflect the actual SVG shape
     */
    syncParamsFromPartFront() {
        const dimensions = this.getPartFrontDimensions();

        // Update internal values
        this.panelWidth = Math.round(dimensions.width);
        this.panelHeight = Math.round(dimensions.height);

        // Update UI inputs without triggering events
        if (this.panelWidthInput) {
            this.panelWidthInput.value = this.panelWidth;
        }
        if (this.panelHeightInput) {
            this.panelHeightInput.value = this.panelHeight;
        }

        log.debug(
            `Synced params from partFront: ${this.panelWidth}x${this.panelHeight}`
        );
    }

    /**
     * Getters for panel dimensions
     * If shape was manually edited, returns bbox dimensions (source of truth)
     * Otherwise returns parameters (for initialization and programmatic updates)
     */
    getWidth() {
        if (this.partFrontManuallyEdited) {
            const dimensions = this.getPartFrontDimensions();
            return Math.round(dimensions.width);
        }
        return this.panelWidth;
    }

    getHeight() {
        if (this.partFrontManuallyEdited) {
            const dimensions = this.getPartFrontDimensions();
            return Math.round(dimensions.height);
        }
        return this.panelHeight;
    }

    getThickness() {
        return this.panelThickness;
    }

    getAnchor() {
        return this.panelAnchor;
    }

    /**
     * Setters for panel dimensions
     */
    setWidth(width) {
        this.panelWidth = width;
        if (this.panelWidthInput) this.panelWidthInput.value = width;
        this.updatePanelShape();
    }

    setHeight(height) {
        this.panelHeight = height;
        if (this.panelHeightInput) this.panelHeightInput.value = height;
        this.updatePanelShape();
    }

    setThickness(thickness) {
        this.panelThickness = thickness;
        if (this.panelThicknessInput)
            this.panelThicknessInput.value = thickness;
        this.updatePanelShape();
    }

    setAnchor(anchor) {
        this.panelAnchor = anchor;
        this.updatePanelAnchorIndicator();
        this.updateGridAnchor();
    }

    /**
     * Set callbacks for external updates
     */
    setCallbacks(callbacks) {
        if (callbacks.onPanelUpdate)
            this.onPanelUpdate = callbacks.onPanelUpdate;
        if (callbacks.onAnchorChange)
            this.onAnchorChange = callbacks.onAnchorChange;
        if (callbacks.getAdaptiveStrokeWidth)
            this.getAdaptiveStrokeWidth = callbacks.getAdaptiveStrokeWidth;
        if (callbacks.updatePartShape)
            this.updatePartShape = callbacks.updatePartShape;
        if (callbacks.updateOffsetContours)
            this.updateOffsetContours = callbacks.updateOffsetContours;
        if (callbacks.updatePhantomBits)
            this.updatePhantomBits = callbacks.updatePhantomBits;
        if (callbacks.updateBitsSheet)
            this.updateBitsSheet = callbacks.updateBitsSheet;
    }
}

export default PanelManager;
