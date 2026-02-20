/**
 * PanelCoordinateHelper - Centralized Panel Coordinate Calculations
 * Eliminates 8+ duplicate coordinate blocks throughout the codebase
 * Provides single source of truth for panel positioning and transformations
 */

export class PanelCoordinateHelper {
    constructor(canvasManager, appConfig) {
        this.canvasManager = canvasManager;
        this.appConfig = appConfig;
    }

    /**
     * Get panel origin (top-left corner) on canvas
     * @returns {Object} {x, y} panel origin coordinates
     */
    getPanelOrigin() {
        const { width, height } = this.canvasManager.canvasParameters;
        return this.appConfig.getPanelOrigin(width, height);
    }

    /**
     * Get panel center coordinates
     * @returns {Object} {x, y} panel center
     */
    getPanelCenter() {
        const origin = this.getPanelOrigin();
        return {
            x: origin.x + this.appConfig.panel.width / 2,
            y: origin.y + this.appConfig.panel.thickness / 2,
        };
    }

    /**
     * Get anchor point coordinates (origin + offset)
     * @returns {Object} {x, y} anchor position
     */
    getPanelAnchorCoords() {
        const { width, height } = this.canvasManager.canvasParameters;
        return this.appConfig.getPanelAnchorCoords(width, height);
    }

    /**
     * Get anchor offset based on panel anchor setting
     * @returns {Object} {x, y} offset from origin to anchor
     */
    getAnchorOffset() {
        return this.appConfig.getAnchorOffset();
    }

    /**
     * Convert bit coordinates from current anchor to top-left anchor
     * Useful for consistent offset calculations regardless of panel anchor
     * @param {Object} bitCoords - {x, y} bit coordinates relative to current anchor
     * @returns {Object} {x, y} bit coordinates relative to top-left anchor
     */
    convertToTopAnchorCoordinates(bitCoords) {
        const currentOffset = this.getAnchorOffset();
        return {
            x: bitCoords.x + currentOffset.x,
            y: bitCoords.y + currentOffset.y,
        };
    }

    /**
     * Convert bit coordinates from top-left anchor to current anchor
     * @param {Object} topAnchorCoords - {x, y} bit coordinates relative to top-left anchor
     * @returns {Object} {x, y} bit coordinates relative to current anchor
     */
    convertFromTopAnchorCoordinates(topAnchorCoords) {
        const currentOffset = this.getAnchorOffset();
        return {
            x: topAnchorCoords.x - currentOffset.x,
            y: topAnchorCoords.y - currentOffset.y,
        };
    }

    /**
     * Get panel boundaries
     * @returns {Object} {minX, maxX, minY, maxY} in canvas coordinates
     */
    getPanelBounds() {
        const origin = this.getPanelOrigin();
        return {
            minX: origin.x,
            maxX: origin.x + this.appConfig.panel.width,
            minY: origin.y,
            maxY: origin.y + this.appConfig.panel.thickness,
        };
    }

    /**
     * Check if point is inside panel bounds
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isPointInPanel(x, y) {
        const bounds = this.getPanelBounds();
        return (
            x >= bounds.minX &&
            x <= bounds.maxX &&
            y >= bounds.minY &&
            y <= bounds.maxY
        );
    }

    /**
     * Get material top Y position in canvas coordinates
     * Material is panel section (thickness)
     * @returns {number} Y coordinate of material top surface
     */
    getMaterialTopY() {
        const origin = this.getPanelOrigin();
        return origin.y;
    }

    /**
     * Get panel bottom Y position (for bottom-left anchor)
     * @returns {number} Y coordinate of panel bottom edge
     */
    getPanelBottomY() {
        const origin = this.getPanelOrigin();
        return origin.y + this.appConfig.panel.thickness;
    }

    /**
     * Transform Y coordinate for display based on current anchor
     * Converts from internal representation to user-facing coordinates
     * @param {number} rawY - Internal Y coordinate
     * @param {Object} anchorOffset - Anchor offset {x, y}
     * @returns {number} Display Y coordinate
     */
    transformYForDisplay(rawY, anchorOffset) {
        const displayY = rawY + anchorOffset.y;
        return this.appConfig.panel.anchor === "bottom-left"
            ? -displayY
            : displayY;
    }

    /**
     * Transform Y coordinate from display to internal representation
     * @param {number} displayY - User-facing Y coordinate
     * @param {Object} anchorOffset - Anchor offset {x, y}
     * @returns {number} Internal Y coordinate
     */
    transformYFromDisplay(displayY, anchorOffset) {
        const adjustedY =
            this.appConfig.panel.anchor === "bottom-left"
                ? -displayY
                : displayY;
        return adjustedY - anchorOffset.y;
    }

    /**
     * Calculate snap position to grid
     * @param {number} value - Value to snap
     * @returns {number} Snapped value
     */
    snapToGrid(value) {
        const gridSize = this.appConfig.ui.gridSize;
        return Math.round(value / gridSize) * gridSize;
    }

    /**
     * Get grid anchor position (for visual grid rendering)
     * @returns {Object} {x, y} grid anchor coordinates
     */
    getGridAnchorPosition() {
        const origin = this.getPanelOrigin();
        const gridSize = this.appConfig.ui.gridSize;
        // Grid anchor = panel anchor point (origin + anchor offset), NOT origin + gridSize/2
        const anchorOffset = this.appConfig.getAnchorOffset();
        return {
            x: origin.x + anchorOffset.x,
            y: origin.y + anchorOffset.y,
        };
    }

    /**
     * Calculate visual center X (for bit placement)
     * Used when creating bits at center of panel
     * @returns {number} Center X coordinate
     */
    getPanelCenterX() {
        const origin = this.getPanelOrigin();
        return origin.x + this.appConfig.panel.width / 2;
    }

    /**
     * Get all panel coordinates at once (optimization)
     * @returns {Object} Comprehensive coordinate object
     */
    getAllCoordinates() {
        const origin = this.getPanelOrigin();
        const anchorCoords = this.getPanelAnchorCoords();
        const anchorOffset = this.getAnchorOffset();

        return {
            origin,
            anchorCoords,
            anchorOffset,
            center: this.getPanelCenter(),
            centerX: this.getPanelCenterX(),
            bounds: this.getPanelBounds(),
            materialTopY: this.getMaterialTopY(),
            panelBottomY: this.getPanelBottomY(),
            gridAnchor: this.getGridAnchorPosition(),
        };
    }

    /**
     * Debug helper - log all coordinates
     */
    debugLogCoordinates() {
        const coords = this.getAllCoordinates();
        console.group("Panel Coordinates");
        console.log("Origin:", coords.origin);
        console.log("Anchor:", coords.anchorCoords);
        console.log("Anchor Offset:", coords.anchorOffset);
        console.log("Center:", coords.center);
        console.log("Bounds:", coords.bounds);
        console.log("Material Top Y:", coords.materialTopY);
        console.log("Panel Bottom Y:", coords.panelBottomY);
        console.groupEnd();
    }
}
