import LoggerFactory from "../core/LoggerFactory.js";
import { makerCalculateResultPolygon } from "../utils/makerProcessor.js";

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
        this.partFront = document.createElementNS(svgNS, "rect");

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
     */
    updatePartFront() {
        const panelX =
            (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
        const panelY =
            (this.canvasManager.canvasParameters.height - this.panelThickness) /
            2;

        this.partFront.setAttribute("x", panelX);
        this.partFront.setAttribute("y", panelY - this.panelHeight - 100);
        this.partFront.setAttribute("width", this.panelWidth);
        this.partFront.setAttribute("height", this.panelHeight);
        this.partFront.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
        this.partFront.setAttribute("stroke", "black");
        this.partFront.setAttribute(
            "stroke-width",
            this.getAdaptiveStrokeWidth()
        );
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
     */
    updatePanelParams() {
        this.panelWidth =
            parseInt(this.panelWidthInput.value) || this.panelWidth;
        this.panelHeight =
            parseInt(this.panelHeightInput.value) || this.panelHeight;
        this.panelThickness =
            parseInt(this.panelThicknessInput.value) || this.panelThickness;

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
     * Getters for panel dimensions
     */
    getWidth() {
        return this.panelWidth;
    }

    getHeight() {
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
