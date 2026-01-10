/**
 * ManagerFactory - Factory for Creating and Initializing All Managers
 * Replaces 440-line initializeSVG() with focused initialization logic
 * Handles proper dependency injection and initialization order
 */

import CanvasManager from "../canvas/CanvasManager.js";
import { PaperCanvasManager } from "../canvas/PaperCanvasManager.js";
import BitsManager from "../panel/BitsManager.js";
import BitsTableManager from "../panel/BitsTableManager.js";
import SelectionManager from "../selection/SelectionManager.js";
import InteractionManager from "../interaction/InteractionManager.js";
import PanelManager from "../panel/PanelManager.js";

export class ManagerFactory {
    constructor(appConfig, panelCoordinateHelper) {
        this.appConfig = appConfig;
        this.panelCoordinateHelper = panelCoordinateHelper;
    }

    /**
     * Create CanvasManager for SVG rendering
     * @param {HTMLElement} canvas
     * @param {Function} onZoom - Zoom callback
     * @returns {CanvasManager}
     */
    createCanvasManager(canvas, onZoom) {
        // Calculate panel anchor position for grid alignment
        const canvasSize = { width: 800, height: 600 };
        const panelX = (canvasSize.width - this.appConfig.panel.width) / 2;
        const panelY = (canvasSize.height - this.appConfig.panel.thickness) / 2;
        const anchorOffset = this.appConfig.getAnchorOffset();
        const gridAnchorX =
            panelX + anchorOffset.x + this.appConfig.ui.gridSize / 2;
        const gridAnchorY =
            panelY + anchorOffset.y + this.appConfig.ui.gridSize / 2;

        return new CanvasManager({
            canvas: canvas,
            enableZoom: this.appConfig.canvas.enableZoom,
            enablePan: this.appConfig.canvas.enablePan,
            enableGrid: this.appConfig.canvas.enableGrid,
            enableMouseEvents: true,
            gridSize: this.appConfig.ui.gridSize,
            gridAnchorX: gridAnchorX,
            gridAnchorY: gridAnchorY,
            initialZoom: 1,
            layers: ["grid", "panel", "offsets", "bits", "phantoms", "overlay"],
            onZoom: onZoom,
        });
    }

    /**
     * Create PaperCanvasManager for Paper.js rendering
     * @param {HTMLElement} canvas
     * @returns {PaperCanvasManager|null}
     */
    createPaperCanvasManager(canvas) {
        try {
            return new PaperCanvasManager(canvas);
        } catch (error) {
            console.warn("Paper.js not available:", error.message);
            return null;
        }
    }

    /**
     * Create BitsManager for bit visual rendering
     * @param {CanvasManager} canvasManager
     * @returns {BitsManager}
     */
    createBitsManager(canvasManager) {
        return new BitsManager(canvasManager);
    }

    /**
     * Create SelectionManager for bit selection state
     * @param {Array} bits - Reference to bitsOnCanvas array
     * @param {BitsManager} bitsManager
     * @param {CanvasManager} canvasManager
     * @param {Function} onSelectionChange - Change callback
     * @returns {SelectionManager}
     */
    createSelectionManager(
        bits,
        bitsManager,
        canvasManager,
        onSelectionChange
    ) {
        return new SelectionManager({
            getBits: () => bits,
            bitsManager: bitsManager,
            mainCanvasManager: canvasManager,
            isShankVisible: () => this.appConfig.ui.shankVisible,
            onSelectionChange: onSelectionChange,
        });
    }

    /**
     * Create InteractionManager for mouse/touch events
     * @param {HTMLElement} canvas
     * @param {CanvasManager} canvasManager
     * @param {Object} callbacks - Event callbacks
     * @returns {InteractionManager}
     */
    createInteractionManager(canvas, canvasManager, callbacks) {
        const manager = new InteractionManager(canvas, canvasManager, {
            autoScrollSpeed: this.appConfig.interaction.autoScrollSpeed,
            autoScrollThreshold: this.appConfig.interaction.autoScrollThreshold,
            bitTolerance: this.appConfig.interaction.bitTolerance,
            touchTolerance: this.appConfig.interaction.touchTolerance,
        });

        manager.setCallbacks(callbacks);
        return manager;
    }

    /**
     * Create PanelManager for panel shape and anchor operations
     * @param {HTMLElement} canvas
     * @param {CanvasManager} canvasManager
     * @param {BitsManager} bitsManager
     * @param {Object} callbacks - Operation callbacks
     * @returns {PanelManager}
     */
    createPanelManager(canvas, canvasManager, bitsManager, callbacks) {
        return new PanelManager({
            canvas: canvas,
            canvasManager: canvasManager,
            bitsManager: bitsManager,
            panelWidth: this.appConfig.panel.width,
            panelHeight: this.appConfig.panel.height,
            panelThickness: this.appConfig.panel.thickness,
            panelAnchor: this.appConfig.panel.anchor,
            gridSize: this.appConfig.ui.gridSize,
            onPanelUpdate: callbacks.onPanelUpdate,
            onAnchorChange: callbacks.onAnchorChange,
            getAdaptiveStrokeWidth: callbacks.getAdaptiveStrokeWidth,
            updatePartShape: callbacks.updatePartShape,
            updateOffsetContours: callbacks.updateOffsetContours,
            updatePhantomBits: callbacks.updatePhantomBits,
            updateBitsSheet: callbacks.updateBitsSheet,
        });
    }

    /**
     * Create BitsTableManager for bits table UI binding
     * @param {Object} callbacks - UI callbacks
     * @returns {BitsTableManager}
     */
    createBitsTableManager(callbacks) {
        const manager = new BitsTableManager({
            getAnchorOffset: callbacks.getAnchorOffset,
            transformYForDisplay: callbacks.transformYForDisplay,
            transformYFromDisplay: callbacks.transformYFromDisplay,
            evaluateMathExpression: callbacks.evaluateMathExpression,
            createAlignmentButton: callbacks.createAlignmentButton,
            getOperationsForGroup: callbacks.getOperationsForGroup,
        });

        manager.setCallbacks({
            onSelectBit: callbacks.onSelectBit,
            onChangePosition: callbacks.onChangePosition,
            onCycleAlignment: callbacks.onCycleAlignment,
            onChangeOperation: callbacks.onChangeOperation,
            onChangeColor: callbacks.onChangeColor,
            onDeleteBit: callbacks.onDeleteBit,
            onReorderBits: callbacks.onReorderBits,
            onClearSelection: callbacks.onClearSelection,
        });

        return manager;
    }

    /**
     * Create all managers in correct dependency order
     * @param {HTMLElement} canvas
     * @param {Array} bitsOnCanvas - Reference to bits array
     * @param {Object} allCallbacks - All required callbacks
     * @returns {Object} Object with all created managers
     */
    createAllManagers(canvas, bitsOnCanvas, allCallbacks) {
        // 1. Create CanvasManager first (lowest dependency)
        const canvasManager = this.createCanvasManager(
            canvas,
            allCallbacks.onZoom
        );

        // 2. Create Paper canvas manager
        const paperCanvasManager = this.createPaperCanvasManager(canvas);

        // 3. Create BitsManager (depends on canvasManager)
        const bitsManager = this.createBitsManager(canvasManager);

        // 4. Create SelectionManager (depends on bitsManager)
        const selectionManager = this.createSelectionManager(
            bitsOnCanvas,
            bitsManager,
            canvasManager,
            allCallbacks.onSelectionChange
        );

        // 5. Create InteractionManager (depends on canvasManager)
        const interactionManager = this.createInteractionManager(
            canvas,
            canvasManager,
            allCallbacks.interactionCallbacks
        );

        // 6. Create PanelManager (depends on canvasManager, bitsManager)
        const panelManager = this.createPanelManager(
            canvas,
            canvasManager,
            bitsManager,
            allCallbacks.panelCallbacks
        );

        // 7. Create BitsTableManager (depends on nothing critical)
        const bitsTableManager = this.createBitsTableManager(
            allCallbacks.tableCallbacks
        );

        return {
            canvas: canvasManager,
            paper: paperCanvasManager,
            bits: bitsManager,
            selection: selectionManager,
            interaction: interactionManager,
            panel: panelManager,
            table: bitsTableManager,
        };
    }

    /**
     * Setup ResizeObserver for canvas resize detection
     * @param {HTMLElement} canvas
     * @param {CanvasManager} canvasManager
     * @param {Function} onCanvasResize - Resize callback
     * @returns {ResizeObserver}
     */
    setupCanvasResizeObserver(canvas, canvasManager, onCanvasResize) {
        const resizeObserver = new ResizeObserver(() => {
            let lastCanvasWidth = canvasManager.canvasParameters.width;
            let lastCanvasHeight = canvasManager.canvasParameters.height;

            const newWidth = canvas.getBoundingClientRect().width;
            const newHeight = canvas.getBoundingClientRect().height;

            if (
                newWidth !== lastCanvasWidth ||
                newHeight !== lastCanvasHeight
            ) {
                lastCanvasWidth = newWidth;
                lastCanvasHeight = newHeight;
                onCanvasResize();
            }
        });

        resizeObserver.observe(canvas);
        return resizeObserver;
    }

    /**
     * Setup event listeners for zoom and control buttons
     * @param {CanvasManager} canvasManager
     */
    setupZoomControls(canvasManager) {
        const zoomInBtn = document.getElementById("zoom-in-btn");
        const zoomOutBtn = document.getElementById("zoom-out-btn");
        const fitScaleBtn = document.getElementById("fit-scale-btn");
        const zoomSelectedBtn = document.getElementById("zoom-selected-btn");
        const toggleGridBtn = document.getElementById("toggle-grid-btn");

        if (zoomInBtn)
            zoomInBtn.addEventListener("click", () => canvasManager.zoomIn());
        if (zoomOutBtn)
            zoomOutBtn.addEventListener("click", () => canvasManager.zoomOut());
        if (toggleGridBtn)
            toggleGridBtn.addEventListener("click", () =>
                canvasManager.toggleGrid()
            );
    }

    /**
     * Setup grid scale input listener
     * @param {CanvasManager} canvasManager
     * @param {Function} onGridSizeChange - Callback when grid size changes
     */
    setupGridScaleControl(canvasManager, onGridSizeChange) {
        const gridScaleInput = document.getElementById("grid-scale");
        if (!gridScaleInput) return;

        gridScaleInput.addEventListener("blur", (e) => {
            // Evaluate expression in input
            const evaluateMathExpression =
                window.evaluateMathExpression || ((val) => parseFloat(val));

            const val = evaluateMathExpression(e.target.value);
            e.target.value = val;

            const newGridSize = parseFloat(val) || 1;
            this.appConfig.ui.gridSize = newGridSize;
            canvasManager.config.gridSize = newGridSize;

            onGridSizeChange();
        });
    }
}
