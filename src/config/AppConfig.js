/**
 * AppConfig - Centralized Application Configuration
 * Manages all application state: panel parameters, engines, UI settings, canvas config
 * Replaces 30+ global variables with a single configuration object
 */

export class AppConfig {
    constructor() {
        // Panel parameters (replaces panelWidth, panelHeight, panelThickness, panelAnchor globals)
        this.panel = {
            width: 400,
            height: 600,
            thickness: 19,
            anchor: "top-left", // "top-left" | "bottom-left"
        };

        // UI visibility flags (replaces bitsVisible, shankVisible, showPart globals)
        this.ui = {
            bitsVisible: true,
            shankVisible: true,
            showPart: false,
            gridSize: 1, // 1mm = 10px
        };

        // Canvas configuration
        this.canvas = {
            enableGrid: true,
            enableZoom: true,
            enablePan: false,
        };

        // Interaction settings
        this.interaction = {
            autoScrollSpeed: 50,
            autoScrollThreshold: 50,
            bitTolerance: 20,
            touchTolerance: 30,
        };

        // Z-extension settings (for CSG operations)
        this.csg = {
            panelThickness: 19,
            zExtension: 38, // panelThickness * 2
        };

        // Mesh repair settings
        this.meshRepair = {
            enabled: true, // Enable for export-time repair testing
            repairLevel: "minimal", // 'minimal' | 'standard' | 'aggressive'
            shortEdgeThreshold: 1e-6, // 0.001mm
            weldTolerance: 1e-5, // 0.01mm
            minTriangleArea: 1e-15,
            enableIntersectionRepair: true,
            logRepairs: true,
            exportValidation: false, // Export-time validation (legacy path)
            exportRepairMode: "manifold-fallback", // Try Manifold first, fallback to direct repair if fails
        };
    }

    /**
     * Get panel origin coordinates on canvas
     * @param {number} canvasWidth - Canvas width in pixels
     * @param {number} canvasHeight - Canvas height in pixels
     * @returns {Object} {x, y} panel origin coordinates
     */
    getPanelOrigin(canvasWidth, canvasHeight) {
        return {
            x: (canvasWidth - this.panel.width) / 2,
            y: (canvasHeight - this.panel.thickness) / 2,
        };
    }

    /**
     * Get anchor offset based on current anchor setting
     * @returns {Object} {x, y} offset from panel origin to anchor point
     */
    getAnchorOffset() {
        return this.panel.anchor === "top-left"
            ? { x: 0, y: 0 }
            : { x: 0, y: this.panel.thickness };
    }

    /**
     * Get panel anchor coordinates on canvas
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @returns {Object} {x, y} absolute anchor position
     */
    getPanelAnchorCoords(canvasWidth, canvasHeight) {
        const origin = this.getPanelOrigin(canvasWidth, canvasHeight);
        const offset = this.getAnchorOffset();
        return {
            x: origin.x + offset.x,
            y: origin.y + offset.y,
        };
    }

    /**
     * Set panel dimensions
     * @param {number} width
     * @param {number} height
     * @param {number} thickness
     */
    setPanelSize(width, height, thickness) {
        this.panel.width = width;
        this.panel.height = height;
        this.panel.thickness = thickness;
        // Update CSG thickness as well
        this.csg.panelThickness = thickness;
        this.csg.zExtension = thickness * 2;
    }

    /**
     * Set panel anchor position
     * @param {string} anchor - "top-left" | "bottom-left"
     */
    setPanelAnchor(anchor) {
        if (["top-left", "bottom-left"].includes(anchor)) {
            this.panel.anchor = anchor;
        }
    }

    /**
     * Get all current configuration as plain object
     * Useful for serialization, debugging, logging
     */
    toJSON() {
        return {
            panel: { ...this.panel },
            engines: { ...this.engines },
            ui: { ...this.ui },
            canvas: { ...this.canvas },
            interaction: { ...this.interaction },
            csg: { ...this.csg },
            meshRepair: { ...this.meshRepair },
        };
    }

    /**
     * Restore configuration from serialized state
     * @param {Object} data - Previously exported configuration
     */
    fromJSON(data) {
        if (data.panel) Object.assign(this.panel, data.panel);
        if (data.engines) Object.assign(this.engines, data.engines);
        if (data.ui) Object.assign(this.ui, data.ui);
        if (data.canvas) Object.assign(this.canvas, data.canvas);
        if (data.interaction) Object.assign(this.interaction, data.interaction);
        if (data.csg) Object.assign(this.csg, data.csg);
        if (data.meshRepair) Object.assign(this.meshRepair, data.meshRepair);
    }
}

// Export singleton instance
export const appConfig = new AppConfig();
