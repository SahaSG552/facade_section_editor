import LoggerFactory from "../core/LoggerFactory.js";
import SVGThemeHelper from "../shared/theme/SVGThemeHelper.js";

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
        this.frontGap = config.frontGap ?? 100; // Vertical gap between part section top and part front bottom
        this.gridSize = config.gridSize || 1;

        // Anchor position in scene coordinates (fixed, not recalculated on resize)
        this.sceneAnchorX = null;
        this.sceneAnchorY = null;

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

        // Listen for theme changes to update SVG colors
        if (typeof window !== 'undefined') {
            window.addEventListener('themechange', () => {
                this.updatePanelColors();
            });
        }

        log.info("PanelManager initialized");
    }

    /**
     * Update SVG element colors when theme changes
     */
    updatePanelColors() {
        if (this.partSection) {
            SVGThemeHelper.setFillFromVariable(this.partSection, "--color-bg-surface");
            SVGThemeHelper.setStrokeFromVariable(this.partSection, "--color-text-primary");
            this.partSection.setAttribute("fill-opacity", "0.35");
        }
        if (this.partFront) {
            SVGThemeHelper.setFillFromVariable(this.partFront, "--color-bg-surface");
            SVGThemeHelper.setStrokeFromVariable(this.partFront, "--color-text-primary");
            this.partFront.setAttribute("fill-opacity", "0.28");
        }
        // Update anchor indicator if it exists
        const indicator = document.getElementById("panel-anchor-indicator");
        if (indicator) {
            this.updatePanelAnchorIndicator();
        }
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

    setSceneAnchor(x, y) {
        this.sceneAnchorX = x;
        this.sceneAnchorY = y;
    }

    getPanelOrigin() {
        if (this.sceneAnchorX !== null && this.sceneAnchorY !== null) {
            // sceneAnchorX/Y IS the anchor point; panel origin = anchor minus anchor offset
            const anchorOffset = this.getPanelAnchorOffset();
            return {
                x: this.sceneAnchorX - anchorOffset.x,
                y: this.sceneAnchorY - anchorOffset.y,
            };
        }

        return {
            x: (this.canvasManager.canvasParameters.width - this.panelWidth) / 2,
            y: (this.canvasManager.canvasParameters.height - this.panelThickness) / 2,
        };
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
        const panelOrigin = this.getPanelOrigin();
        const anchorOffset = this.getPanelAnchorOffset();
        return {
            x: panelOrigin.x + anchorOffset.x,
            y: panelOrigin.y + anchorOffset.y,
        };
    }

    /**
     * Get part front top-left origin in canvas space.
     * Single source of truth for where the front path is drawn —
     * keeps updatePartFront() and editor frame in sync.
     */
    getPartFrontOrigin() {
        const panelOrigin = this.getPanelOrigin();
        return {
            x: panelOrigin.x,
            y: panelOrigin.y - this.panelHeight - this.frontGap,
        };
    }

    /**
     * Get part front bottom-left point in canvas space.
     * Used as editor frame origin so the editor coordinate system
     * has its origin at the front bottom-left corner.
     */
    getPartFrontEditorOrigin() {
        const panelOrigin = this.getPanelOrigin();
        return {
            x: panelOrigin.x,
            y: panelOrigin.y - this.frontGap,
        };
    }

    /**
     * Update bit logical positions after anchor change
     */
    updateBitsForNewAnchor(bits = []) {
        const previousAnchor =
            this.panelAnchor === "top-left" ? "bottom-left" : "top-left";
        const panelOrigin = this.getPanelOrigin();

        const currentAnchorOffset = previousAnchor === "top-left"
            ? { x: 0, y: 0 }
            : { x: 0, y: this.panelThickness };
        const newAnchorOffset = this.getPanelAnchorOffset();

        const currentAnchorX = panelOrigin.x + currentAnchorOffset.x;
        const currentAnchorY = panelOrigin.y + currentAnchorOffset.y;
        const newAnchorX = panelOrigin.x + newAnchorOffset.x;
        const newAnchorY = panelOrigin.y + newAnchorOffset.y;

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
        const panelOrigin = this.getPanelOrigin();
        const anchorOffset = this.getPanelAnchorOffset();
        const anchorX = panelOrigin.x + anchorOffset.x;
        const anchorY = panelOrigin.y + anchorOffset.y;

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
        const oldAnchor = this.panelAnchor;
        this.panelAnchor =
            this.panelAnchor === "top-left" ? "bottom-left" : "top-left";

        // Update scene anchor position when anchor changes
        if (oldAnchor === "top-left" && this.panelAnchor === "bottom-left") {
            // Moving from top-left to bottom-left: anchor shifts down by panelThickness
            this.sceneAnchorY += this.panelThickness;
        } else if (oldAnchor === "bottom-left" && this.panelAnchor === "top-left") {
            // Moving from bottom-left to top-left: anchor shifts up by panelThickness
            this.sceneAnchorY -= this.panelThickness;
        }

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
        const panelOrigin = this.getPanelOrigin();

        this.partSection.setAttribute("x", panelOrigin.x);
        this.partSection.setAttribute("y", panelOrigin.y);
        this.partSection.setAttribute("width", this.panelWidth);
        this.partSection.setAttribute("height", this.panelThickness);
        SVGThemeHelper.setFillFromVariable(this.partSection, "--color-bg-surface");
        SVGThemeHelper.setStrokeFromVariable(this.partSection, "--color-text-primary");
        this.partSection.setAttribute("fill-opacity", "0.35");

        this.updatePartFront();
        this.updatePanelAnchorIndicator();

        this.onPanelUpdate();
    }

    /**
     * Update part front view
    * Прямоугольник с полукруглой аркой сверху для теста оффсета с кривыми Безье
     */
    updatePartFront() {
        const panelOrigin = this.getPanelOrigin();

        // Preserve user-edited contour and only keep style/stroke in sync.
        const existingPath = String(this.partFront?.getAttribute("d") ?? "").trim();
        if (this.partFrontManuallyEdited && existingPath) {
            this.alignManualPartFront(existingPath, panelOrigin);
            SVGThemeHelper.setFillFromVariable(this.partFront, "--color-bg-surface");
            SVGThemeHelper.setStrokeFromVariable(this.partFront, "--color-text-primary");
            this.partFront.setAttribute("fill-opacity", "0.28");
            this.partFront.setAttribute(
                "stroke-width",
                this.getAdaptiveStrokeWidth(),
            );
            return;
        }

        const frontOrigin = this.getPartFrontOrigin();
        const frontX = frontOrigin.x;
        const frontY = frontOrigin.y;
        const frontWidth = this.panelWidth;
        const frontHeight = this.panelHeight;

        // Создаём path: прямоугольник с полукруглой аркой сверху
        // M = move to, L = line to, A = arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y), Z = close
        const archRadius = frontWidth / 2; // Радиус арки = половина ширины
        const archHeight = archRadius; // Высота арки = радиус (полукруг)

        const pathData = [
            `M ${frontX + frontWidth} ${frontY + frontHeight}`, // Старт: правый нижний угол
            `L ${frontX + frontWidth} ${frontY + archHeight}`, // Вверх справа до начала арки
            //`L ${frontX} ${frontY + archHeight}`, // Вверх влево до начала арки
            `A ${archRadius} ${archRadius} 0 0 0 ${frontX} ${frontY + archHeight}`, // Арка (полукруг влево)
            `L ${frontX} ${frontY + frontHeight}`, // Вниз к низу слева
            `Z`, // Замыкаем путь
        ].join(" ");

        this.partFront.setAttribute("d", pathData);
        SVGThemeHelper.setFillFromVariable(this.partFront, "--color-bg-surface");
        SVGThemeHelper.setStrokeFromVariable(this.partFront, "--color-text-primary");
        this.partFront.setAttribute("fill-opacity", "0.28");
        this.partFront.setAttribute(
            "stroke-width",
            this.getAdaptiveStrokeWidth(),
        );

        // Note: Do NOT sync params here during initialization
        // Parameters are the source for creating the shape
        // Only sync when shape is manually edited (partFrontManuallyEdited = true)
    }

    /**
     * Keep manually edited part-front anchored to the panel:
     * centered horizontally and placed above panel-section with frontGap.
     */
    alignManualPartFront(pathData, panelOrigin) {
        if (!pathData || !this.partFront || !panelOrigin) return;

        let bbox;
        try {
            bbox = this.partFront.getBBox();
        } catch (_) {
            return;
        }

        if (!bbox || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
            return;
        }

        const targetLeftX = panelOrigin.x + (this.panelWidth - bbox.width) / 2;
        const targetBottomY = panelOrigin.y - this.frontGap;
        const targetTopY = targetBottomY - bbox.height;
        const dx = targetLeftX - bbox.x;
        const dy = targetTopY - bbox.y;

        if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
            return;
        }

        const translated = this.translatePathData(pathData, dx, dy);
        if (translated) {
            this.partFront.setAttribute("d", translated);
        }
    }

    /**
     * Translate SVG path data by dx/dy.
     * Relative commands stay unchanged because they are already local deltas.
     */
    translatePathData(pathData, dx, dy) {
        const normalized = String(pathData ?? "").trim();
        if (!normalized) return "";
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return normalized;

        const commandRe = /([MmLlHhVvZzCcSsQqTtAa])([^MmLlHhVvZzCcSsQqTtAa]*)/g;
        const parts = [];
        let match;

        while ((match = commandRe.exec(normalized)) !== null) {
            const cmd = match[1];
            const upper = cmd.toUpperCase();
            const isRelative = cmd !== upper;
            const args = match[2].trim();

            if (!args) {
                parts.push(cmd);
                continue;
            }

            const nums = args
                .split(/[\s,]+/)
                .filter(Boolean)
                .map(Number);

            if (nums.length === 0 || nums.some((n) => !Number.isFinite(n))) {
                parts.push(`${cmd}${args ? ` ${args}` : ""}`);
                continue;
            }

            let transformed = [...nums];
            if (!isRelative) {
                if (upper === "M" || upper === "L" || upper === "T") {
                    transformed = nums.map((value, index) =>
                        index % 2 === 0 ? value + dx : value + dy
                    );
                } else if (upper === "H") {
                    transformed = nums.map((value) => value + dx);
                } else if (upper === "V") {
                    transformed = nums.map((value) => value + dy);
                } else if (upper === "C") {
                    transformed = nums.map((value, index) =>
                        index % 2 === 0 ? value + dx : value + dy
                    );
                } else if (upper === "S" || upper === "Q") {
                    transformed = nums.map((value, index) =>
                        index % 2 === 0 ? value + dx : value + dy
                    );
                } else if (upper === "A") {
                    transformed = [...nums];
                    for (let i = 0; i + 6 < transformed.length; i += 7) {
                        transformed[i + 5] += dx;
                        transformed[i + 6] += dy;
                    }
                }
            }

            const argsText = transformed
                .map((value) => Number(value.toFixed(6)))
                .join(" ");
            parts.push(argsText ? `${cmd} ${argsText}` : cmd);
        }

        return parts.join(" ").replace(/\s+/g, " ").trim();
    }

    /**
     * Update panel anchor indicator (visual cross at anchor point)
     */
    updatePanelAnchorIndicator() {
        const indicator = document.getElementById("panel-anchor-indicator");
        if (!indicator) return;

        indicator.innerHTML = "";

        const anchorCoords = this.getPanelAnchorCoords();
        const anchorX = anchorCoords.x;
        const anchorY = anchorCoords.y;

        // Draw a small cross
        const crossSize = 5;
        const thickness = Math.max(
            0.1,
            0.5 / Math.sqrt(this.canvasManager.zoomLevel),
        );

        const horizontal = document.createElementNS(svgNS, "line");
        horizontal.setAttribute("x1", anchorX - crossSize);
        horizontal.setAttribute("y1", anchorY);
        horizontal.setAttribute("x2", anchorX + crossSize);
        horizontal.setAttribute("y2", anchorY);
        SVGThemeHelper.setStrokeFromVariable(horizontal, "--color-action-accent");
        horizontal.setAttribute("stroke-width", thickness);
        indicator.appendChild(horizontal);

        const vertical = document.createElementNS(svgNS, "line");
        vertical.setAttribute("x1", anchorX);
        vertical.setAttribute("y1", anchorY - crossSize);
        vertical.setAttribute("x2", anchorX);
        vertical.setAttribute("y2", anchorY + crossSize);
        SVGThemeHelper.setStrokeFromVariable(vertical, "--color-action-accent");
        vertical.setAttribute("stroke-width", thickness);
        indicator.appendChild(vertical);
    }

    /**
     * Update grid anchor position
     */
    updateGridAnchor() {
        let gridAnchorX, gridAnchorY;

        if (this.sceneAnchorX !== null && this.sceneAnchorY !== null) {
            gridAnchorX = this.sceneAnchorX;
            gridAnchorY = this.sceneAnchorY;
        } else {
            const panelX =
                (this.canvasManager.canvasParameters.width - this.panelWidth) / 2;
            const panelY =
                (this.canvasManager.canvasParameters.height - this.panelThickness) /
                2;
            const anchorOffset = this.getPanelAnchorOffset();
            gridAnchorX = panelX + anchorOffset.x;
            gridAnchorY = panelY + anchorOffset.y;
        }

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

        // Keep manual edit mode active so parameter updates don't regenerate the default contour.
        this.updatePanelShape();
        this.updateGridAnchor();
        this.updateOffsetContours();
        this.updatePhantomBits();
        this.updatePartShape();

        log.debug(
            `Panel params updated: ${this.panelWidth}x${this.panelHeight}x${this.panelThickness}`,
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
            `Synced params from partFront: ${this.panelWidth}x${this.panelHeight}`,
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
