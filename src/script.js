import {
    angleToRad,
    distancePtToPt,
    evaluateMathExpression,
} from "./utils/utils.js";
import { zoomToBBox, calculateElementsBBox } from "./canvas/zoomUtils.js";
import { getBits, addBit, deleteBit, updateBit } from "./data/bitsStore.js";
import CanvasManager from "./canvas/CanvasManager.js";
import BitsManager from "./panel/BitsManager.js";
import BitsTableManager from "./panel/BitsTableManager.js";
import SelectionManager from "./selection/SelectionManager.js";
import ExportModule from "./export/ExportModule.js";
import { OffsetCalculator } from "./utils/offsetCalculator.js";
import { PaperOffsetCalculator } from "./operations/PaperOffsetProcessor.js";
import { getOperationsForGroup } from "./data/bitsStore.js";
import { makerCalculateResultPolygon } from "./utils/makerProcessor.js";
import { paperCalculateResultPolygon } from "./operations/PaperBooleanProcessor.js";
import LoggerFactory from "./core/LoggerFactory.js";
import eventBus from "./core/eventBus.js";
import appState from "./state/AppState.js";
import csgScheduler from "./scheduling/CSGScheduler.js";
import InteractionManager from "./interaction/InteractionManager.js";
import PanelManager from "./panel/PanelManager.js";
import { PaperCanvasManager } from "./canvas/PaperCanvasManager.js";

// Import new modular system
import { app } from "./app/main.js";
import CanvasModule from "./canvas/CanvasModule.js";
import BitsModule from "./bits/BitsModule.js";
// SVG namespace
const svgNS = "http://www.w3.org/2000/svg";
const log = LoggerFactory.createLogger("Script");

/**
 * BitData structure helper
 * Manages structured bit data with nested objects for extensions, shank, phantoms
 */
const BitDataHelper = {
    /**
     * Initialize or get bitData structure
     * @param {object} bitData - Existing bitData or base properties
     * @returns {object} Structured bitData
     */
    init(bitData) {
        return {
            ...bitData,
            // Extension info - added when bit goes below material
            extension: bitData.extension || null,
            // Shank info - added when shank exists
            shank: bitData.shank || null,
            // Phantom bits info - added for VC operations
            phantoms: bitData.phantoms || null,
        };
    },

    /**
     * Set extension info for a bit
     * @param {object} bitData - BitData object
     * @param {object} extensionInfo - Extension information
     */
    setExtension(bitData, extensionInfo) {
        if (!bitData) return;
        bitData.extension = extensionInfo
            ? {
                  // Dimensions
                  height: extensionInfo.height,
                  width: extensionInfo.width,
                  // Position RELATIVE to bit (in bit's local coordinate system)
                  // These coordinates are relative to the bit's position, not canvas
                  relativeX: extensionInfo.relativeX || extensionInfo.localX,
                  relativeY: extensionInfo.relativeY || extensionInfo.localY,
                  materialTopY: extensionInfo.materialTopY,
                  distanceBelowMaterial: extensionInfo.distanceBelowMaterial,
                  // Visual
                  color: extensionInfo.color,
                  fillColor: extensionInfo.fillColor,
                  strokeColor: extensionInfo.strokeColor,
                  // Metadata
                  createdAt: extensionInfo.createdAt || Date.now(),
                  source: extensionInfo.source || "2D",
              }
            : null;
    },

    /**
     * Set shank info for a bit
     * @param {object} bitData - BitData object
     * @param {object} shankInfo - Shank information
     */
    setShank(bitData, shankInfo) {
        if (!bitData) return;
        bitData.shank = shankInfo
            ? {
                  diameter: shankInfo.shankDiameter,
                  bitDiameter: shankInfo.bitDiameter,
                  hasCollision: shankInfo.hasCollision || false,
                  widthDifference: shankInfo.widthDifference,
                  scale: shankInfo.scale,
              }
            : null;
    },

    /**
     * Get extension info
     * @param {object} bitData - BitData object
     * @returns {object|null} Extension info
     */
    getExtension(bitData) {
        return bitData?.extension || null;
    },

    /**
     * Check if bit has extension
     * @param {object} bitData - BitData object
     * @returns {boolean}
     */
    hasExtension(bitData) {
        return !!bitData?.extension;
    },

    /**
     * Check if bit has shank collision
     * @param {object} bitData - BitData object
     * @returns {boolean}
     */
    hasShankCollision(bitData) {
        return bitData?.shank?.hasCollision || false;
    },

    /**
     * Initialize phantoms array for VC multi-pass bits
     * @param {object} bitData - BitData object
     * @param {number} passCount - Number of passes (including main bit)
     */
    initPhantoms(bitData, passCount) {
        if (!bitData) return;
        // Initialize array with passCount-1 phantom slots (main bit is pass 0)
        bitData.phantoms = new Array(passCount - 1).fill(null).map((_, i) => ({
            passIndex: i + 1,
            depth: null,
            extension: null,
        }));
    },

    /**
     * Set phantom pass data (depth and optional extension)
     * @param {object} bitData - BitData object
     * @param {number} passIndex - Pass index (1, 2, 3...)
     * @param {number} depth - Depth for this pass
     * @param {object} extensionInfo - Optional extension info
     */
    setPhantomPass(bitData, passIndex, depth, extensionInfo = null) {
        if (!bitData || !bitData.phantoms) return;
        const phantomIndex = passIndex - 1; // Convert passIndex to array index
        if (phantomIndex >= 0 && phantomIndex < bitData.phantoms.length) {
            bitData.phantoms[phantomIndex] = {
                passIndex: passIndex,
                depth: depth,
                extension: extensionInfo
                    ? {
                          height: extensionInfo.height,
                          width: extensionInfo.width,
                          relativeX:
                              extensionInfo.relativeX || extensionInfo.localX,
                          relativeY:
                              extensionInfo.relativeY || extensionInfo.localY,
                          materialTopY: extensionInfo.materialTopY,
                          distanceBelowMaterial:
                              extensionInfo.distanceBelowMaterial,
                          color: extensionInfo.color,
                          fillColor: extensionInfo.fillColor,
                          strokeColor: extensionInfo.strokeColor,
                          createdAt: extensionInfo.createdAt || Date.now(),
                          source: extensionInfo.source || "2D",
                      }
                    : null,
            };
        }
    },

    /**
     * Get phantom pass data by index
     * @param {object} bitData - BitData object
     * @param {number} passIndex - Pass index (1, 2, 3...)
     * @returns {object|null} Phantom pass data
     */
    getPhantomPass(bitData, passIndex) {
        if (!bitData?.phantoms) return null;
        const phantomIndex = passIndex - 1;
        return bitData.phantoms[phantomIndex] || null;
    },

    /**
     * Check if bit has phantoms
     * @param {object} bitData - BitData object
     * @returns {boolean}
     */
    hasPhantoms(bitData) {
        return !!(bitData?.phantoms && bitData.phantoms.length > 0);
    },

    /**
     * Get phantom extension by pass index
     * @param {object} bitData - BitData object
     * @param {number} passIndex - Pass index (1, 2, 3...)
     * @returns {object|null} Extension info
     */
    getPhantomExtension(bitData, passIndex) {
        const phantom = this.getPhantomPass(bitData, passIndex);
        return phantom?.extension || null;
    },
};

// Get DOM elements
const canvas = document.getElementById("canvas");
const panelWidthInput = document.getElementById("panel-width");
const panelHeightInput = document.getElementById("panel-height");
const panelThicknessInput = document.getElementById("panel-thickness");

// Global variables for panel shape
let partSection;
let partFront;
let panelWidth = 400;
let panelHeight = 600;
let panelThickness = 19;
let panelAnchor = "top-left"; // "top-left" or "bottom-left"
let showPart = false;
let partPath;
let bitsVisible = true; // Track bits visibility state
let shankVisible = true; // Track shank visibility state
let usePaperJsBoolean = true; // Toggle between maker.js (false) and Paper.js (true)
let usePaperJsOffset = true; // Toggle between OffsetCalculator (false) and Paper.js (true)

// Make these available to other modules via window
window.showPart = showPart;
window.bitsVisible = bitsVisible;
window.isDraggingBit = false;
window.LoggerFactory = LoggerFactory; // Make LoggerFactory available globally

// Canvas manager instance
let mainCanvasManager;
let paperCanvasManager; // Paper.js canvas manager
let bitsManager; // Bits manager instance
let bitsTableManager; // Bits table manager instance
let interactionManager; // Interaction manager instance
let panelManager; // Panel manager instance
let selectionManager; // Selection manager instance
let gridSize = 1; // Default grid size in pixels (1mm = 10px)

// Sync initial state into AppState
appState.setPanelSize(panelWidth, panelHeight);
appState.setPanelThickness(panelThickness);
appState.setPanelAnchor(panelAnchor);
appState.setShowPart(showPart);
appState.setBitsVisible(bitsVisible);
appState.setShankVisible(shankVisible);
appState.setGridSize(gridSize);

// Panel click-outside handlers (global scope for resize listener access)
let leftPanelClickOutsideHandler = null;
let rightPanelClickOutsideHandler = null;

// Bit selection is managed by SelectionManager

// BitsManager will be created in initializeSVG after CanvasManager is set up

// Initialize SVG elements using CanvasManager
function initializeSVG() {
    // Note: partSection and partFront will be created by PanelManager via initializeSVGElements()

    // Check if CanvasManager already exists (from modular system)
    if (!mainCanvasManager) {
        // Calculate panel anchor position for grid alignment
        const canvasSize = { width: 800, height: 600 };
        const panelX = (canvasSize.width - panelWidth) / 2;
        const panelY = (canvasSize.height - panelThickness) / 2;
        const anchorOffset = getpanelAnchorOffset();
        const gridAnchorX = panelX + anchorOffset.x + gridSize / 2;
        const gridAnchorY = panelY + anchorOffset.y + gridSize / 2;

        // Create main canvas manager instance only if it doesn't exist
        mainCanvasManager = new CanvasManager({
            canvas: canvas,
            enableZoom: true,
            enablePan: false, // Disable pan - we'll handle it manually to avoid conflicts with bit dragging
            enableGrid: true,
            enableMouseEvents: true,
            gridSize: gridSize,
            gridAnchorX: gridAnchorX,
            gridAnchorY: gridAnchorY,
            initialZoom: 1,
            layers: ["grid", "panel", "offsets", "bits", "phantoms", "overlay"],
            onZoom: (zoomLevel, panX, panY) => {
                // Update stroke widths when zoom changes
                updateStrokeWidths(zoomLevel);
            },
        });

        // Make it available globally for modules
        window.mainCanvasManager = mainCanvasManager;

        // Watch for canvas container size changes (e.g., when switching 2D/3D/Both views)
        // and refresh phantom bits and offset contours to prevent misalignment
        let lastCanvasWidth = mainCanvasManager.canvasParameters.width;
        let lastCanvasHeight = mainCanvasManager.canvasParameters.height;

        const resizeObserver = new ResizeObserver(() => {
            const currentWidth = mainCanvasManager.canvasParameters.width;
            const currentHeight = mainCanvasManager.canvasParameters.height;

            // Trigger refresh only if dimensions actually changed
            if (
                currentWidth !== lastCanvasWidth ||
                currentHeight !== lastCanvasHeight
            ) {
                lastCanvasWidth = currentWidth;
                lastCanvasHeight = currentHeight;
                log.debug("Canvas size changed, refreshing phantom bits", {
                    currentWidth,
                    currentHeight,
                });
                updateOffsetContours();
                updatePhantomBits();
            }
        });

        resizeObserver.observe(canvas);
    }

    // Initialize Paper.js canvas manager
    if (!paperCanvasManager) {
        try {
            paperCanvasManager = new PaperCanvasManager("paper-canvas");
            window.paperCanvasManager = paperCanvasManager;
            console.log("Paper.js canvas initialized");

            // Run demo to show capabilities
            // paperCanvasManager.demo(); // Uncomment to run demo
        } catch (error) {
            console.error("Failed to initialize Paper.js canvas:", error);
        }
    }

    // Get layer references
    const panelLayer = mainCanvasManager.getLayer("panel");
    bitsLayer = mainCanvasManager.getLayer("bits");
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");

    // Create part path
    partPath = document.createElementNS(svgNS, "path");
    partPath.id = "part-path";
    partPath.setAttribute("fill", "rgba(71, 64, 64, 0.16)");
    partPath.setAttribute("stroke", "black");
    partPath.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    partPath.style.display = "none";
    panelLayer.appendChild(partPath);

    // Create panel anchor indicator (always visible)
    const panelAnchorIndicator = document.createElementNS(svgNS, "g");
    panelAnchorIndicator.id = "panel-anchor-indicator";
    panelLayer.appendChild(panelAnchorIndicator);

    // Add zoom button event listeners
    document
        .getElementById("zoom-in-btn")
        .addEventListener("click", () => mainCanvasManager.zoomIn());
    document
        .getElementById("zoom-out-btn")
        .addEventListener("click", () => mainCanvasManager.zoomOut());
    document
        .getElementById("fit-scale-btn")
        .addEventListener("click", fitToScale);
    document
        .getElementById("zoom-selected-btn")
        .addEventListener("click", zoomToSelected);
    document
        .getElementById("toggle-grid-btn")
        .addEventListener("click", () => mainCanvasManager.toggleGrid());

    // Add grid scale input listener
    document.getElementById("grid-scale").addEventListener("blur", (e) => {
        const val = evaluateMathExpression(e.target.value);
        e.target.value = val;
        gridSize = parseFloat(val) || 1;
        appState.setGridSize(gridSize);
        // Update grid size in canvas manager
        mainCanvasManager.config.gridSize = gridSize;
        // Update grid anchor position with new grid size
        updateGridAnchor();
        if (mainCanvasManager.gridEnabled) {
            mainCanvasManager.drawGrid();
        }
    });

    // Setup panel anchor button
    const panelAnchorBtn = document.getElementById("panel-anchor-btn");
    panelAnchorBtn.appendChild(createpanelAnchorButton(panelAnchor));
    panelAnchorBtn.addEventListener("click", cyclepanelAnchor);

    // Setup part button
    document
        .getElementById("part-btn")
        .addEventListener("click", togglePartView);

    // Setup bits visibility button
    const bitsBtn = document.getElementById("bits-btn");
    bitsBtn.addEventListener("click", toggleBitsVisibility);
    bitsBtn.classList.add("bits-visible"); // Initial state - bits are visible

    // Setup shank visibility button
    const shankBtn = document.getElementById("shank-btn");
    shankBtn.addEventListener("click", toggleShankVisibility);
    shankBtn.classList.add("shank-visible"); // Initial state - shank is visible

    // Setup DXF export button
    document
        .getElementById("export-dxf-btn")
        .addEventListener("click", exportToDXF);

    // Setup boolean engine toggle button
    const booleanEngineBtn = document.getElementById("boolean-engine-btn");
    booleanEngineBtn.addEventListener("click", toggleBooleanEngine);

    function toggleBooleanEngine() {
        usePaperJsBoolean = !usePaperJsBoolean;
        usePaperJsOffset = !usePaperJsOffset; // Переключаем оба engine одновременно

        if (usePaperJsBoolean) {
            booleanEngineBtn.textContent = "ppr";
            booleanEngineBtn.style.background = "#2196F3"; // Blue for Paper.js
            booleanEngineBtn.title =
                "Using Paper.js Boolean & Offset (click to switch to legacy)";
            console.log("Switched to Paper.js engines (Boolean + Offset)");
        } else {
            booleanEngineBtn.textContent = "mkr";
            booleanEngineBtn.style.background = "#4CAF50"; // Green for maker.js
            booleanEngineBtn.title =
                "Using legacy engines: maker.js + OffsetCalculator (click to switch to Paper.js)";
            console.log(
                "Switched to legacy engines (maker.js + OffsetCalculator)"
            );
        }

        // Re-calculate part shape and offset contours with new engines
        if (showPart) {
            updatePartShape();
        }
        updateOffsetContours();
    }

    // Setup operations toolbar buttons
    document
        .getElementById("save-btn")
        .addEventListener("click", saveBitPositions);
    document
        .getElementById("save-as-btn")
        .addEventListener("click", saveBitPositionsAs);
    document
        .getElementById("load-btn")
        .addEventListener("click", loadBitPositions);
    document
        .getElementById("clear-btn")
        .addEventListener("click", clearAllBits);

    // Create BitsManager instance now that CanvasManager is available
    bitsManager = new BitsManager(mainCanvasManager);

    // Create SelectionManager to manage bit selection and highlighting
    selectionManager = new SelectionManager({
        getBits: () => bitsOnCanvas,
        bitsManager: bitsManager,
        mainCanvasManager: mainCanvasManager,
        isShankVisible: () => shankVisible,
        onSelectionChange: handleSelectionChange,
    });

    // Create BitsTableManager for bits table interactions
    bitsTableManager = new BitsTableManager({
        getAnchorOffset: getAnchorOffset,
        transformYForDisplay: transformYForDisplay,
        transformYFromDisplay: transformYFromDisplay,
        evaluateMathExpression: evaluateMathExpression,
        createAlignmentButton: createAlignmentButton,
        getOperationsForGroup: getOperationsForGroup,
    });

    bitsTableManager.setCallbacks({
        onSelectBit: selectBit,
        onChangePosition: updateBitPosition,
        onCycleAlignment: cycleAlignment,
        onChangeOperation: handleOperationChange,
        onChangeColor: handleColorChange,
        onDeleteBit: deleteBitFromCanvas,
        onReorderBits: reorderBits,
        onClearSelection: clearBitSelection,
    });

    // Set up callbacks for BitsManager to communicate with main canvas
    bitsManager.onDrawBitShape = (bit, groupName) =>
        drawBitShape(
            bit,
            groupName,
            bitsManager.createBitShapeElement.bind(bitsManager)
        );
    bitsManager.onUpdateCanvasBits = (bitId) => updateCanvasBitsForBitId(bitId);
    bitsManager.onUpdateCanvasBitWithParams = (bitId, newParams, groupName) =>
        updateCanvasBitWithParams(bitId, newParams, groupName);

    // Initialize InteractionManager for mouse/touch events
    interactionManager = new InteractionManager(canvas, mainCanvasManager, {
        autoScrollSpeed: 50,
        autoScrollThreshold: 50,
        bitTolerance: 20,
        touchTolerance: 30,
    });

    // Set callbacks for InteractionManager
    interactionManager.setCallbacks({
        getBitsOnCanvas: () => bitsOnCanvas,
        getSelectedBitIndices: () => selectionManager.getSelectedIndices(),
        selectBit: selectBit,
        resetBitHighlight: resetBitHighlight,
        clearBitSelection: clearBitSelection,
        updateBitPosition: updateBitPosition,
        updateTableCoordinates: updateTableCoordinates,
        updatePartShape: updatePartShape,
        getAnchorOffset: getAnchorOffset,
        getPanelAnchorCoords: getPanelAnchorCoords,
        updateBitsSheet: updateBitsSheet,
        redrawBitsOnCanvas: redrawBitsOnCanvas,
        getBitsVisible: () => bitsVisible,
        getShowPart: () => showPart,
        getThreeModule: () => window.threeModule,
        getCsgScheduler: () => csgScheduler,
    });

    // Initialize PanelManager for panel shape and anchor operations
    panelManager = new PanelManager({
        canvas: canvas,
        canvasManager: mainCanvasManager,
        bitsManager: bitsManager,
        panelWidth: panelWidth,
        panelHeight: panelHeight,
        panelThickness: panelThickness,
        panelAnchor: panelAnchor,
        gridSize: gridSize,
        onPanelUpdate: () => {
            // Update panel dimensions in script scope
            panelWidth = panelManager.getWidth();
            panelHeight = panelManager.getHeight();
            panelThickness = panelManager.getThickness();
        },
        onAnchorChange: (newAnchor) => {
            panelAnchor = newAnchor;
            updateBitsForNewAnchor();
            updateOffsetContours();
            updatePhantomBits();
            updatepanelAnchorIndicator();
            updateGridAnchor();
            if (showPart) updatePartShape();
        },
        getAdaptiveStrokeWidth: getAdaptiveStrokeWidth,
        updatePartShape: updatePartShape,
        updateOffsetContours: updateOffsetContours,
        updatePhantomBits: updatePhantomBits,
        updateBitsSheet: updateBitsSheet,
    });

    // Initialize SVG elements for panel manager
    panelManager.initializeSVGElements();
    // Sync panel element references for legacy helpers
    partSection = panelManager.partSection;
    partFront = panelManager.partFront;

    // Update grid anchor position on initialization
    updateGridAnchor();

    // Update canvas bit with new parameters (for real-time editing)
    function updateCanvasBitWithParams(bitId, newParams, groupName) {
        bitsOnCanvas.forEach((bit, index) => {
            if (bit.bitData.id === bitId) {
                // Update the bit data with new parameters
                bit.bitData = { ...bit.bitData, ...newParams };

                // Update bit name if it changed
                if (newParams.name && newParams.name !== bit.name) {
                    bit.name = newParams.name;
                }

                // Redraw shape group with updated parameters and correct selection state
                const oldShapeGroup = bit.group.querySelector("g");
                if (oldShapeGroup) {
                    const isSelected = selectionManager.isSelected(index);
                    const newShapeGroup = bitsManager.createBitShapeElement(
                        bit.bitData,
                        groupName,
                        bit.baseAbsX,
                        bit.baseAbsY,
                        isSelected
                    );

                    // Apply highlight stroke if selected
                    if (isSelected) {
                        const newBitShape =
                            newShapeGroup.querySelector(".bit-shape");
                        const newShankShape =
                            newShapeGroup.querySelector(".shank-shape");
                        const thickness = Math.max(
                            0.1,
                            0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
                        );

                        if (newBitShape) {
                            newBitShape.setAttribute("stroke", "#00BFFF"); // Deep sky blue
                            newBitShape.setAttribute("stroke-width", thickness);
                        }
                        if (newShankShape) {
                            newShankShape.setAttribute("stroke", "#00BFFF");
                            newShankShape.setAttribute(
                                "stroke-width",
                                thickness
                            );

                            newShankShape.style.display = shankVisible
                                ? "block"
                                : "none";
                        }
                    }

                    bit.group.replaceChild(newShapeGroup, oldShapeGroup);
                }
            }
        });

        // Update the table to reflect name changes
        updateBitsSheet();

        // Update offset contours and phantom bits if parameters affect them
        updateOffsetContours();
        updatePhantomBits();

        if (showPart) updatePartShape();

        // Update 3D view
        if (window.threeModule) {
            updateThreeView();
        }
    }

    // Setup export/import buttons
    document.getElementById("export-bits-btn").addEventListener("click", () => {
        import("./data/bitsStore.js").then((module) => {
            module.exportToJSON();
        });
    });

    document.getElementById("import-bits-btn").addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const jsonData = event.target.result;
                    import("./data/bitsStore.js").then((module) => {
                        const success = module.importFromJSON(jsonData);
                        if (success) {
                            // Refresh the bits manager and canvas
                            bitsManager.refreshBitGroups();
                            // Clear canvas and reload bits
                            bitsOnCanvas = [];
                            updateBitsSheet();
                            redrawBitsOnCanvas();
                        } else {
                            alert(
                                "Failed to import bits data. Please check the JSON format."
                            );
                        }
                    });
                };
                reader.readAsText(file);
            }
        };
        input.click();
    });

    // Setup panel toggle buttons - now handled by UI Module
    const uiModule = app.getModule("ui");
    document
        .getElementById("toggle-left-panel")
        .addEventListener("click", () => uiModule.toggleLeftPanel());

    document
        .getElementById("toggle-right-menu")
        .addEventListener("click", () => uiModule.toggleRightMenu());

    // Setup theme toggle button
    const themeToggle = document.getElementById("theme-toggle");
    themeToggle.addEventListener("click", () => {
        const uiModule = app.getModule("ui");
        uiModule.toggleTheme();
    });
}

// Helper function to update canvas after panel toggle
function updateCanvasAfterPanelToggle() {
    const oldWidth = mainCanvasManager.canvasParameters.width;
    const oldHeight = mainCanvasManager.canvasParameters.height;
    mainCanvasManager.canvasParameters.width =
        canvas.getBoundingClientRect().width;
    mainCanvasManager.canvasParameters.height =
        canvas.getBoundingClientRect().height;
    // Adjust pan to maintain relative position
    mainCanvasManager.panX =
        (mainCanvasManager.panX / oldWidth) *
        mainCanvasManager.canvasParameters.width;
    mainCanvasManager.panY =
        (mainCanvasManager.panY / oldHeight) *
        mainCanvasManager.canvasParameters.height;
    mainCanvasManager.updateViewBox();
}

// Cycle panel anchor
function cyclepanelAnchor() {
    if (panelManager) {
        panelManager.cyclePanelAnchor();
        panelAnchor = panelManager.getAnchor();

        // Update button icon
        const panelAnchorBtn = document.getElementById("panel-anchor-btn");
        if (panelAnchorBtn) {
            panelAnchorBtn.innerHTML = "";
            panelAnchorBtn.appendChild(createpanelAnchorButton(panelAnchor));
        }
    }
}

// Update bit positions when panel anchor changes
function updateBitsForNewAnchor() {
    if (panelManager) {
        panelManager.updateBitsForNewAnchor(bitsOnCanvas);
    } else {
        const panelX =
            (mainCanvasManager.canvasParameters.width - panelWidth) / 2;
        const panelY =
            (mainCanvasManager.canvasParameters.height - panelThickness) / 2;
        const oldAnchor =
            panelAnchor === "top-left" ? "bottom-left" : "top-left";
        const currentAnchorX = panelX;
        const currentAnchorY =
            oldAnchor === "top-left" ? panelY : panelY + panelThickness;
        const newAnchorX = panelX;
        const newAnchorY =
            panelAnchor === "top-left" ? panelY : panelY + panelThickness;

        bitsOnCanvas.forEach((bit) => {
            const physicalX = currentAnchorX + bit.x;
            const physicalY = currentAnchorY + bit.y;

            const newX = physicalX - newAnchorX;
            const newY = physicalY - newAnchorY;

            bit.x = newX;
            bit.y = newY;

            updateBitsSheet();

            const newAbsX = newAnchorX + newX;
            const newAbsY = newAnchorY + newY;
            const dx = newAbsX - bit.baseAbsX;
            const dy = newAbsY - bit.baseAbsY;
            bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);
        });
    }
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();
}

// Update part front view
function updatepartFront() {
    if (panelManager) {
        panelManager.updatePartFront();

        // Update global variables from panelManager
        // If shape was manually edited, getWidth/getHeight return bbox
        // Otherwise they return parameters
        panelWidth = panelManager.getWidth();
        panelHeight = panelManager.getHeight();
    }
}

// Update panel shape
function updatepanelShape() {
    if (panelManager) {
        panelManager.updatePanelShape();
    } else {
        // Fallback if panelManager not initialized yet
        partSection.setAttribute(
            "x",
            (mainCanvasManager.canvasParameters.width - panelWidth) / 2
        );
        partSection.setAttribute(
            "y",
            (mainCanvasManager.canvasParameters.height - panelThickness) / 2
        );
        partSection.setAttribute("width", panelWidth);
        partSection.setAttribute("height", panelThickness);
        partSection.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
    }
}

// Update panel anchor indicator (always visible)
function updatepanelAnchorIndicator() {
    if (panelManager) {
        panelManager.updatePanelAnchorIndicator();
    }
}

// Update grid anchor position
function updateGridAnchor() {
    if (panelManager) {
        panelManager.updateGridAnchor();
    }
}

// Update panel parameters
function updatepanelParams() {
    if (panelManager) {
        // Update panel manager with new dimensions
        panelManager.updatePanelParams();

        // Sync local variables
        panelWidth = panelManager.getWidth();
        panelHeight = panelManager.getHeight();
        panelThickness = panelManager.getThickness();

        // Update bits and other elements
        updateBitsPositions();
        bitsManager.assignProfilePathsToBits(bitsOnCanvas);
        updateOffsetContours();
        updatePhantomBits();
        if (showPart) updatePartShape();

        // Update 3D view if it's visible
        if (window.threeModule) {
            updateThreeView();
        }
    }
}

// New: reposition all bits according to current panel anchor and their stored logical coords
function updateBitsPositions() {
    if (panelManager) {
        panelManager.updateBitsPositions(bitsOnCanvas);
    } else {
        const panelX =
            (mainCanvasManager.canvasParameters.width - panelWidth) / 2;
        const panelY =
            (mainCanvasManager.canvasParameters.height - panelThickness) / 2;
        const anchorOffset = getpanelAnchorOffset();
        const anchorX = panelX + anchorOffset.x;
        const anchorY = panelY + anchorOffset.y;

        bitsOnCanvas.forEach((bit) => {
            const desiredAbsX = anchorX + (bit.x || 0);
            const desiredAbsY = anchorY + (bit.y || 0);

            const dx = desiredAbsX - bit.baseAbsX;
            const dy = desiredAbsY - bit.baseAbsY;

            if (bit.group) {
                bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);
            }
        });
    }

    redrawBitsOnCanvas();
    if (showPart) updatePartShape();
}

// Global variables for bit management
let bitsOnCanvas = [];
let bitCounter = 0;
let bitsLayer;

// Offset contours for each bit
let offsetContours = [];

// Make offsetContours globally accessible for ThreeModule
window.offsetContours = offsetContours;

// Helper function to convert bit coordinates to top anchor coordinates
function convertToTopAnchorCoordinates(bit) {
    const currentAnchorOffset = getpanelAnchorOffset();
    // Convert from current anchor to top anchor coordinates
    return {
        x: bit.x + currentAnchorOffset.x,
        y: bit.y + currentAnchorOffset.y,
    };
}

// Update bit extensions (rectangles above bits that go below material surface)
function updateBitExtensions() {
    // Get material top Y position (from panel-section element)
    const panelSection = document.getElementById("panel-section");
    if (!panelSection) return;

    const materialTopY = parseFloat(panelSection.getAttribute("y")) || 0;

    // Get bit logger for tracking extension updates
    const bitLogger = window.LoggerFactory?.getBitLogger();

    // Clear shank collision flags before checking
    bitsOnCanvas.forEach((bit) => {
        bit.hasShankCollision = false;
    });

    // Process all bits (regular and phantom)
    const allBits = [...bitsOnCanvas];

    // Also collect phantom bits
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");
    const phantomGroups = phantomsLayer.querySelectorAll(".phantom-bit");
    phantomGroups.forEach((group) => {
        allBits.push({ group });
    });

    allBits.forEach((bit, index) => {
        if (!bit.group) return;

        const isPhantom = !bit.bitData;
        const bitIdentifier = isPhantom
            ? `phantom (bitIndex=${bit.group.__bitIndex}, pass=${bit.group.__passIndex})`
            : `bit ${index}`;

        // Remove existing extensions from this bit group
        const existingExtensions = bit.group.querySelectorAll(".bit-extension");
        existingExtensions.forEach((ext) => ext.remove());

        const element = bit.group.querySelector(".bit-shape");
        if (!element) return;

        // Get bit position from transform
        const transform = bit.group.getAttribute("transform");
        let bitX = 0,
            bitY = 0;
        if (transform) {
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
                bitX = parseFloat(match[1]);
                bitY = parseFloat(match[2]);
            }
        }

        // Get bit bounding box in local coordinates
        const bbox = element.getBBox();
        const bitWidth = bbox.width;
        const bitTopY = bitY + bbox.y; // Top of the bit in canvas coordinates (for comparison with materialTopY)

        // Get bit data for shank collision detection
        // For regular bits from bitsOnCanvas, use bit.bitData
        // For phantom bits, bitData is stored in group.__bitData
        const bitData = bit.bitData || (bit.group && bit.group.__bitData);
        let extensionWidth = bitWidth;
        let extensionColor = "red";
        let hasShankCollision = false;

        // Check if bit top is below material surface (bit went deeper)
        if (bitTopY > materialTopY) {
            // Check for shank collision - if shank is wider than bit, it's a collision
            if (bitData && bitData.shankDiameter && bitData.diameter) {
                const shankDiameter = parseFloat(bitData.shankDiameter);
                const bitDiameter = parseFloat(bitData.diameter);

                if (shankDiameter > bitDiameter) {
                    // Scale shank diameter to pixels
                    const scale = bitWidth / bitDiameter;
                    extensionWidth = shankDiameter * scale;
                    extensionColor = "darkred";
                    hasShankCollision = true;

                    // Mark bit as having shank collision for warnings table
                    bit.hasShankCollision = true;

                    // Log shank collision
                    if (bitLogger) {
                        bitLogger.shankCollision(index, {
                            shankDiameter,
                            bitDiameter,
                            scale,
                            extensionWidth,
                        });
                    }
                }
            }

            // Calculate extension rectangle in LOCAL coordinates (relative to bit group)
            // materialTopY is in absolute canvas coordinates, we need to convert to local
            // Add 0.1 to height for better boolean operations
            const rectHeight = bitTopY - materialTopY + 1.1;

            // Center the extension on the bit in local coordinates
            const rectX = bbox.x + (bitWidth - extensionWidth) / 2;
            const rectY = materialTopY - bitY - 1 + 0.001; // Convert to local coordinates, extend 0.1 up

            // Colors based on collision detection
            const fillColor =
                extensionColor === "darkred"
                    ? "rgba(139, 0, 0, 0.4)"
                    : "rgba(255, 0, 0, 0.3)";
            const strokeColor = extensionColor;

            // Create SVG rectangle for visualization
            const rect = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect"
            );
            rect.setAttribute("x", rectX);
            rect.setAttribute("y", rectY);
            rect.setAttribute("width", extensionWidth);
            rect.setAttribute("height", rectHeight);
            rect.setAttribute("fill", fillColor);
            rect.setAttribute("stroke", strokeColor);
            rect.setAttribute(
                "stroke-width",
                getAdaptiveStrokeWidth(mainCanvasManager.zoomLevel)
            );
            rect.classList.add("bit-extension");

            // Add extension to bit group instead of global layer
            bit.group.appendChild(rect);

            // Create comprehensive extension info structure
            const extensionInfo = {
                height: rectHeight,
                width: extensionWidth,
                // Relative position from bit (in bit's local coordinate system)
                // rectX, rectY are already relative to bit's group transform
                relativeX: rectX,
                relativeY: rectY,
                materialTopY: materialTopY,
                distanceBelowMaterial: bitTopY - materialTopY,
                color: extensionColor,
                fillColor: fillColor,
                strokeColor: strokeColor,
                createdAt: Date.now(),
                source: "2D",
            };

            // Create shank info if collision detected
            const shankInfo = hasShankCollision
                ? {
                      shankDiameter: bitData.shankDiameter,
                      bitDiameter: bitData.diameter,
                      hasCollision: true,
                      widthDifference: extensionWidth - bitWidth,
                      scale: extensionWidth / bitWidth,
                  }
                : null;

            // Store extension and shank data using structured approach
            if (bit.bitData) {
                // Regular bit - use BitDataHelper
                BitDataHelper.setExtension(bit.bitData, extensionInfo);
                if (shankInfo) {
                    BitDataHelper.setShank(bit.bitData, shankInfo);
                }
                // Keep old format for backward compatibility
                bit.extension = extensionInfo;
                // Log full bitData structure
                console.log(
                    `[BIT DATA] Bit #${index} updated:`,
                    JSON.parse(JSON.stringify(bit.bitData))
                );
            } else if (bit.group) {
                // Phantom bit - store extension in main bit's phantoms array
                const __bitIndex = bit.group.__bitIndex;
                const __passIndex = bit.group.__passIndex;

                if (__bitIndex !== undefined && __passIndex !== undefined) {
                    const mainBit = bitsOnCanvas[__bitIndex];
                    if (mainBit && mainBit.bitData) {
                        // Get current depth for this phantom pass
                        const depth = BitDataHelper.getPhantomPass(
                            mainBit.bitData,
                            __passIndex
                        )?.depth;
                        // Set phantom pass with extension info
                        BitDataHelper.setPhantomPass(
                            mainBit.bitData,
                            __passIndex,
                            depth,
                            extensionInfo
                        );
                        // Log full bitData structure of main bit after phantom update
                        console.log(
                            `[BIT DATA] Bit #${__bitIndex} updated (phantom pass ${__passIndex}):`,
                            JSON.parse(JSON.stringify(mainBit.bitData))
                        );
                    }
                }

                // Also keep on group for backward compatibility
                bit.group.__extension = extensionInfo;
                if (bitData) {
                    bit.group.__bitData = bitData;
                }
            }

            // Log extension update (only for changed bit)
            if (bitLogger) {
                const isPhantom = !bit.bitData;
                const passIndex =
                    isPhantom && bit.group ? bit.group.__passIndex : null;
                bitLogger.extensionUpdated(
                    index,
                    extensionInfo,
                    isPhantom,
                    passIndex
                );
            }
        } else {
            // Clear extension if bit top is not below material surface
            if (bit.bitData) {
                BitDataHelper.setExtension(bit.bitData, null);
                bit.extension = null;
            } else if (bit.group) {
                bit.group.__extension = null;
                if (bitData) {
                    BitDataHelper.setExtension(bitData, null);
                }
            }
        }
    });
}

// Update phantom bits for all bits
function updatePhantomBits() {
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");
    phantomsLayer.innerHTML = ""; // Clear all phantom bits

    // Get current panel anchor coordinates (recalculated to account for canvas size changes)
    const anchorCoords = getPanelAnchorCoords();

    bitsOnCanvas.forEach((bit, index) => {
        if (bit.operation === "VC") {
            // Convert bit coordinates to top anchor coordinates for offset calculations
            const topAnchorCoords = convertToTopAnchorCoordinates(bit);
            const angle = bit.bitData.angle || 90;
            const bitY = topAnchorCoords.y; // Use top anchor Y coordinate
            // Calculate conical bit height: height = (diameter / 2) / tan(angle / 2)
            const hypotenuse = bit.bitData.diameter || 10;
            const bitHeight =
                (hypotenuse / 2) * (1 / Math.tan(angleToRad(angle) / 2));

            // Calculate number of passes
            const passes = bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

            // Calculate partial results (depth values for each pass)
            const partialResults = [];
            for (let i = 0; i < passes; i++) {
                partialResults.push((bitY * (i + 1)) / passes);
            }

            // Create arrays for depths and contour offsets
            // Depths array: stores depth for each pass (last is the main bit depth)
            const depths = [...partialResults].reverse(); // [19, 8] for 2 passes example

            // Contour offsets array: stores x-offset from main bit contour
            // Main bit has 0 offset, phantom bits have negative offset (outward)
            const contourOffsets = [];
            for (let i = 0; i < passes; i++) {
                if (i === 0) {
                    // Main bit: no offset from its contour
                    contourOffsets.push(0);
                } else {
                    // Phantom bits: calculate offset outward (negative value)
                    const depthDiff = depths[0] - depths[i];
                    const offset = depthDiff * Math.tan(angleToRad(angle / 2));
                    contourOffsets.push(-offset); // Negative for outward offset
                }
            }

            // Draw all bits: main bit first (index 0), then phantom bits
            if (passes > 1) {
                // Initialize phantoms array in main bit's bitData
                BitDataHelper.initPhantoms(bit.bitData, passes);

                // Store depths for each phantom pass
                for (let passIndex = 1; passIndex < passes; passIndex++) {
                    BitDataHelper.setPhantomPass(
                        bit.bitData,
                        passIndex,
                        depths[passIndex]
                    );
                }

                // Draw phantom bits (skip index 0 which is the main bit)
                for (let passIndex = 1; passIndex < passes; passIndex++) {
                    // Create phantom bit at offset position with depth from depths array
                    const phantomBitData = {
                        ...bit.bitData,
                        fillColor: "rgba(128, 128, 128, 0.1)", // Gray with 0.1 opacity
                    };

                    // Position phantom bit using bit's logical coordinates and current anchor
                    // Convert offset back to logical coordinates relative to current anchor
                    const currentAnchorOffset = getpanelAnchorOffset();
                    const logicalX = bit.x + contourOffsets[passIndex];
                    const logicalY = depths[passIndex] - currentAnchorOffset.y;

                    // Calculate absolute position from current anchor
                    const phantomAbsX = anchorCoords.x + logicalX;
                    const phantomAbsY = anchorCoords.y + logicalY;

                    const phantomShape = bitsManager.createBitShapeElement(
                        phantomBitData,
                        bit.groupName,
                        phantomAbsX,
                        phantomAbsY,
                        false, // not selected
                        false // includeShank = false for phantom bits
                    );

                    // Set gray stroke for phantom (same thickness as regular bits)
                    phantomShape.setAttribute("stroke", "gray");
                    phantomShape.setAttribute(
                        "stroke-width",
                        getAdaptiveStrokeWidth(mainCanvasManager.zoomLevel)
                    );
                    phantomShape.setAttribute(
                        "fill",
                        "rgba(128, 128, 128, 0.1)"
                    );
                    phantomShape.classList.add("phantom-bit");

                    // Store bitData and passIndex in the phantom shape group for later access
                    phantomShape.__bitData = bit.bitData;
                    phantomShape.__bitIndex = index; // Store bit index to link phantom to main bit
                    phantomShape.__passIndex = passIndex; // Store pass index for logging
                    phantomShape.__depth = depths[passIndex]; // Store depth for extension calculation

                    phantomsLayer.appendChild(phantomShape);
                }
            }
        }
    });

    // Update bit extensions after phantom bits are created
    updateBitExtensions();
}

// Update offset contours for all bits
function updateOffsetContours() {
    const offsetsLayer = mainCanvasManager.getLayer("offsets");
    offsetsLayer.innerHTML = ""; // Clear all offset contours

    // Clear the offset contours array
    offsetContours = [];

    // Update global reference
    window.offsetContours = offsetContours;

    // Always calculate relative to top anchor for consistent offset calculations
    const panelX = (mainCanvasManager.canvasParameters.width - panelWidth) / 2;
    const panelY =
        (mainCanvasManager.canvasParameters.height - panelThickness) / 2;
    const anchorOffset = { x: 0, y: 0 }; // Always use top anchor for calculations
    const anchorX = panelX + anchorOffset.x;
    const anchorY = panelY + anchorOffset.y;

    // Get ExportModule for arc approximation
    const exportModule = app.getModule("export");

    // Create offset calculator instance (Paper.js or legacy)
    // With arc approximation enabled for consistency with DXF export
    const offsetCalculator = usePaperJsOffset
        ? new PaperOffsetCalculator({
              useArcApproximation: true, // Enable Bezier → Arc approximation
              arcTolerance: 0.15, // RMS tolerance 0.15mm (same as DXF export)
              exportModule: exportModule, // For parseSVGPathSegments and optimizeSegmentsToArcs
          })
        : new OffsetCalculator();

    // Make offsetCalculator and helper functions available globally for ThreeModule
    window.offsetCalculator = offsetCalculator;
    window.convertToTopAnchorCoordinates = convertToTopAnchorCoordinates;

    // Get the original partFront element (может быть rect или path с кривыми!)
    // Используем новый метод для сохранения кривых Безье
    const useDirectSVGImport = usePaperJsOffset && partFront.tagName === "path";

    bitsOnCanvas.forEach((bit, index) => {
        if (bit.operation === "VC") {
            // Convert bit coordinates to top anchor coordinates for calculations
            const topAnchorCoords = convertToTopAnchorCoordinates(bit);
            // V-Carve operation: multiple passes
            const angle = bit.bitData.angle || 90;
            const bitY = topAnchorCoords.y; // Use top anchor Y coordinate
            // Calculate conical bit height: height = (diameter / 2) / tan(angle / 2)
            const hypotenuse = bit.bitData.diameter || 10;
            const bitHeight =
                (hypotenuse / 2) * (1 / Math.tan(angleToRad(angle) / 2));

            // Calculate number of passes
            const passes = bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

            // Calculate partial results (depth values)
            const partialResults = [];
            for (let i = 0; i < passes; i++) {
                partialResults.push((bitY * (i + 1)) / passes);
            }
            // Calculate offsets for each pass
            const offsets = partialResults.map((value) => {
                const offsetValue = value * Math.tan(angleToRad(angle / 2));
                return topAnchorCoords.x - offsetValue; // Use top anchor X coordinate
            });
            offsets.reverse(); // Reverse to start from outermost pass

            // Create contours for ALL passes (not just 0 and 1!)
            // This ensures phantom bits (pass 2+) have contours for 3D rendering
            for (let passIndex = 0; passIndex < passes; passIndex++) {
                // Calculate offset distance for this pass
                // Use reverse indexing to go from innermost to outermost (right to left)
                const offsetDistance =
                    passIndex === 0
                        ? topAnchorCoords.x // Pass 0: base offset
                        : offsets[offsets.length - passIndex]; // Pass 1+: reverse order

                // Calculate offset contour
                let offsetData;
                if (useDirectSVGImport) {
                    // Paper.js: возвращает SVG path data с кривыми!
                    offsetData = offsetCalculator.calculateOffsetFromSVG(
                        partFront,
                        offsetDistance
                    );
                } else {
                    // Legacy: конвертируем в точки, потом в path data
                    const partFrontPoints =
                        offsetCalculator.svgToPoints(partFront);
                    const offsetPoints = offsetCalculator.calculateOffset(
                        partFrontPoints,
                        offsetDistance
                    );
                    if (offsetPoints && offsetPoints.length > 0) {
                        offsetData =
                            offsetPoints
                                .map((point, i) =>
                                    i === 0
                                        ? `M ${point.x} ${point.y}`
                                        : `L ${point.x} ${point.y}`
                                )
                                .join(" ") + " Z";
                    }
                }

                if (offsetData) {
                    const pathData =
                        typeof offsetData === "string" ? offsetData : "";

                    const offsetContour = document.createElementNS(
                        svgNS,
                        "path"
                    );
                    offsetContour.setAttribute("d", pathData);
                    offsetContour.setAttribute("fill", "none");

                    // Only display pass 0 (black) and pass 1 (colored) in 2D
                    // Pass 2+ exist for 3D but are hidden
                    if (passIndex === 0) {
                        offsetContour.setAttribute("stroke", "black");
                        offsetContour.setAttribute(
                            "stroke-width",
                            getAdaptiveStrokeWidth()
                        );
                        offsetContour.setAttribute("stroke-dasharray", "5,5");
                        offsetContour.classList.add("offset-contour");
                        offsetsLayer.appendChild(offsetContour);
                    } else if (passIndex === 1) {
                        offsetContour.setAttribute(
                            "stroke",
                            bit.color || "#cccccc"
                        );
                        offsetContour.setAttribute(
                            "stroke-width",
                            getAdaptiveStrokeWidth()
                        );
                        offsetContour.setAttribute("stroke-dasharray", "5,5");
                        offsetContour.classList.add("offset-contour");
                        offsetsLayer.appendChild(offsetContour);
                    }
                    // Pass 2+ not added to DOM (not displayed in 2D)

                    // Store in offsetContours for 3D (all passes!)
                    offsetContours.push({
                        element: offsetContour,
                        bitIndex: index,
                        offsetDistance: offsetDistance,
                        operation: "VC",
                        pass: passIndex,
                        passIndex: passIndex, // Add passIndex for compatibility
                        pathData: pathData, // Store pathData for 3D
                        depth:
                            passIndex === passes - 1 ? topAnchorCoords.y : null,
                    });
                }
            }

            // Log contour creation summary
            console.log(
                `[VC] Created ${passes} contours for bit ${index} (displayed: pass 0 & 1, hidden: pass 2+)`
            );
        } else {
            // Standard operations: AL, OU, IN
            let offsetDistance = bit.x;
            if (bit.operation === "OU") {
                offsetDistance = bit.x + (bit.bitData.diameter || 0) / 2;
            } else if (bit.operation === "IN") {
                offsetDistance = bit.x - (bit.bitData.diameter || 0) / 2;
            }
            // AL uses bit.x as is

            let offsetData;
            if (useDirectSVGImport) {
                // Paper.js: возвращает SVG path data с кривыми!
                offsetData = offsetCalculator.calculateOffsetFromSVG(
                    partFront,
                    offsetDistance
                );
            } else {
                // Legacy: конвертируем в точки, потом в path data
                const partFrontPoints = offsetCalculator.svgToPoints(partFront);
                const offsetPoints = offsetCalculator.calculateOffset(
                    partFrontPoints,
                    offsetDistance
                );
                if (offsetPoints && offsetPoints.length > 0) {
                    offsetData =
                        offsetPoints
                            .map((point, i) =>
                                i === 0
                                    ? `M ${point.x} ${point.y}`
                                    : `L ${point.x} ${point.y}`
                            )
                            .join(" ") + " Z";
                }
            }

            if (offsetData) {
                const pathData =
                    typeof offsetData === "string" ? offsetData : "";

                const offsetContour = document.createElementNS(svgNS, "path");
                offsetContour.setAttribute("d", pathData);
                offsetContour.setAttribute("fill", "none");
                offsetContour.setAttribute("stroke", bit.color || "#cccccc");
                offsetContour.setAttribute(
                    "stroke-width",
                    getAdaptiveStrokeWidth()
                );
                offsetContour.setAttribute("stroke-dasharray", "5,5");
                offsetContour.classList.add("offset-contour");
                offsetsLayer.appendChild(offsetContour);

                offsetContours.push({
                    element: offsetContour,
                    bitIndex: index,
                    offsetDistance: offsetDistance,
                });
            }
        }
    });
}

// Alignment states: 'center', 'left', 'right'
const alignmentStates = ["center", "left", "right"];

// Create alignment button SVG
function createAlignmentButton(alignment) {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.style.cursor = "pointer";

    // Background rectangle
    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("width", "20");
    bg.setAttribute("height", "20");
    bg.setAttribute("fill", "white");
    bg.setAttribute("stroke", "black");
    bg.setAttribute("stroke-width", "1");
    svg.appendChild(bg);

    // Draw alignment indicator
    if (alignment === "center") {
        // Center line (vertical dashed)
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "10");
        line.setAttribute("y1", "3");
        line.setAttribute("x2", "10");
        line.setAttribute("y2", "17");
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "2,2");
        svg.appendChild(line);

        // Center square
        const square = document.createElementNS(svgNS, "rect");
        square.setAttribute("x", "7");
        square.setAttribute("y", "8");
        square.setAttribute("width", "6");
        square.setAttribute("height", "4");
        square.setAttribute("fill", "black");
        svg.appendChild(square);
    } else if (alignment === "left") {
        // Left line (vertical dashed)
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "5");
        line.setAttribute("y1", "3");
        line.setAttribute("x2", "5");
        line.setAttribute("y2", "17");
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "2,2");
        svg.appendChild(line);

        // Left square
        const square = document.createElementNS(svgNS, "rect");
        square.setAttribute("x", "2");
        square.setAttribute("y", "8");
        square.setAttribute("width", "6");
        square.setAttribute("height", "4");
        square.setAttribute("fill", "black");
        svg.appendChild(square);
    } else if (alignment === "right") {
        // Right line (vertical dashed)
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", "15");
        line.setAttribute("y1", "3");
        line.setAttribute("x2", "15");
        line.setAttribute("y2", "17");
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-dasharray", "2,2");
        svg.appendChild(line);

        // Right square
        const square = document.createElementNS(svgNS, "rect");
        square.setAttribute("x", "12");
        square.setAttribute("y", "8");
        square.setAttribute("width", "6");
        square.setAttribute("height", "4");
        square.setAttribute("fill", "black");
        svg.appendChild(square);
    }

    return svg;
}

// Create panel anchor button SVG
function createpanelAnchorButton(anchor) {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.style.cursor = "pointer";

    // Background rectangle (panel)
    const bg = document.createElementNS(svgNS, "rect");
    bg.setAttribute("width", "20");
    bg.setAttribute("height", "20");
    bg.setAttribute("fill", "rgba(155, 155, 155, 0.5)");
    bg.setAttribute("stroke", "black");
    bg.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    svg.appendChild(bg);

    // Red cross at the anchor position
    const crossSize = 2;
    let crossX, crossY;
    if (anchor === "top-left") {
        crossX = 3;
        crossY = 3;
    } else if (anchor === "bottom-left") {
        crossX = 3;
        crossY = 17;
    }

    const horizontal = document.createElementNS(svgNS, "line");
    horizontal.setAttribute("x1", crossX - crossSize);
    horizontal.setAttribute("y1", crossY);
    horizontal.setAttribute("x2", crossX + crossSize);
    horizontal.setAttribute("y2", crossY);
    horizontal.setAttribute("stroke", "red");
    horizontal.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    svg.appendChild(horizontal);

    const vertical = document.createElementNS(svgNS, "line");
    vertical.setAttribute("x1", crossX);
    vertical.setAttribute("y1", crossY - crossSize);
    vertical.setAttribute("x2", crossX);
    vertical.setAttribute("y2", crossY + crossSize);
    vertical.setAttribute("stroke", "red");
    vertical.setAttribute("stroke-width", getAdaptiveStrokeWidth());
    svg.appendChild(vertical);

    return svg;
}

// Update canvas bits when a bit in the library is changed
async function updateCanvasBitsForBitId(bitId) {
    // Get the updated bit from the library
    const allBits = getBits();
    let updatedBitData = null;
    for (const group in allBits) {
        const found = allBits[group].find((b) => b.id === bitId);
        if (found) {
            updatedBitData = found;
            break;
        }
    }
    if (!updatedBitData) return;

    bitsOnCanvas.forEach((bit, index) => {
        if (bit.bitData.id === bitId) {
            // Update reference to the new bit data
            bit.bitData = updatedBitData;
            // Update name
            bit.name = updatedBitData.name;

            // Reassign profile path in case it changed
            bitsManager.assignProfilePathsToBits([bit]);

            // Redraw shape group with correct selection state
            const oldShapeGroup = bit.group.querySelector("g");
            if (oldShapeGroup) {
                const isSelected = selectionManager.isSelected(index);
                const newShapeGroup = bitsManager.createBitShapeElement(
                    updatedBitData,
                    bit.groupName,
                    bit.baseAbsX,
                    bit.baseAbsY,
                    isSelected
                );

                // Apply highlight stroke if selected
                if (isSelected) {
                    const newBitShape =
                        newShapeGroup.querySelector(".bit-shape");
                    const newShankShape =
                        newShapeGroup.querySelector(".shank-shape");
                    const thickness = Math.max(
                        0.1,
                        0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
                    );

                    if (newBitShape) {
                        newBitShape.setAttribute("stroke", "#00BFFF"); // Deep sky blue
                        newBitShape.setAttribute("stroke-width", thickness);
                    }
                    if (newShankShape) {
                        newShankShape.setAttribute("stroke", "#00BFFF");
                        newShankShape.setAttribute("stroke-width", thickness);

                        newShankShape.style.display = shankVisible
                            ? "block"
                            : "none";
                    }
                }

                bit.group.replaceChild(newShapeGroup, oldShapeGroup);
            }
        }
    });

    // Update 3D view immediately after profile paths are updated
    if (window.threeModule) {
        await updateThreeView();
        // If in Part view, show base panel and debounce CSG recalculation
        if (showPart) {
            window.threeModule.showBasePanel();
            csgScheduler.schedule(true);
        }
    }

    // Update the table
    updateBitsSheet();
    // Update offset contours and phantom bits since bit shape may have changed
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();

    // Update 3D view
    if (window.threeModule) {
        await updateThreeView();
        // If in Part view, show base panel and debounce CSG recalculation
        if (showPart) {
            window.threeModule.showBasePanel();
            csgScheduler.schedule(true);
        }
    }
}

// Draw bit shape
function drawBitShape(bit, groupName, createBitShapeElementFn) {
    updatepanelParams();
    const panelX = (mainCanvasManager.canvasParameters.width - panelWidth) / 2;
    const panelY =
        (mainCanvasManager.canvasParameters.height - panelThickness) / 2;
    const centerX = panelX + panelWidth / 2;
    const centerY = panelY;

    // create shape at absolute coords, wrap in group so we can translate later
    const shape = createBitShapeElementFn(bit, groupName, centerX, centerY);
    const g = document.createElementNS(svgNS, "g");
    g.appendChild(shape);
    // store transform relative to creation point
    g.setAttribute("transform", `translate(0, 0)`);
    bitsLayer.appendChild(g);

    bitCounter++;

    const x = centerX - panelX;
    const y = centerY - panelY;

    const newBit = {
        number: bitCounter,
        name: bit.name,
        x: x,
        y: y,
        alignment: "center", // default alignment
        operation: "AL", // default operation
        color: bit.fillColor || "#cccccc", // default color from bit data
        group: g, // group that contains the shape
        baseAbsX: centerX, // absolute coords where shape was created
        baseAbsY: centerY,
        bitData: bit,
        groupName: groupName, // store the group name for updates
    };
    bitsOnCanvas.push(newBit);
    // Assign profile path to the new bit
    bitsManager.assignProfilePathsToBits([newBit]);
    updateBitsSheet();
    updateStrokeWidths();
    updateOffsetContours();
    if (showPart) updatePartShape();
}

// Update bits sheet
function updateBitsSheet() {
    if (bitsTableManager) {
        // Enrich bits with warnings before rendering
        const bitsWithWarnings = bitsOnCanvas.map((bit) => {
            const warnings = [];

            // Check if bit has VC operation
            if (bit.operation === "VC" && bit.bitData) {
                // Convert to top anchor coordinates to get depth
                const topAnchorCoords = convertToTopAnchorCoordinates(bit);
                const bitY = topAnchorCoords.y; // Depth from top anchor

                const angle = parseFloat(bit.bitData.angle) || 0;
                const diameter = parseFloat(bit.bitData.diameter) || 0;

                if (angle > 0 && diameter > 0 && bitY > 0) {
                    // Calculate number of passes
                    const hypotenuse = diameter;
                    const bitHeight =
                        (hypotenuse / 2) *
                        (1 / Math.tan(angleToRad(angle) / 2));
                    const passes =
                        bitHeight < bitY ? Math.ceil(bitY / bitHeight) : 1;

                    if (passes > 1) {
                        warnings.push(`${passes} passes`);
                    }
                }
            }

            // Check for shank collision (set in updateBitExtensions)
            if (bit.hasShankCollision) {
                warnings.push("⚠ Shank collision");
            }

            // Check if bit cuts through material
            const topAnchorCoords = convertToTopAnchorCoordinates(bit);
            const bitDepth = topAnchorCoords.y; // Depth from top anchor
            if (bitDepth >= panelThickness) {
                warnings.push("⚠ Cut through");
            }

            return { ...bit, warnings };
        });

        bitsTableManager.render(
            bitsWithWarnings,
            selectionManager.getSelectedIndices()
        );
    }
}

function handleOperationChange(index, newOperation) {
    const bit = bitsOnCanvas[index];
    if (!bit) return;

    bit.operation = newOperation;
    updateOffsetContours();
    updatePhantomBits();

    if (window.threeModule) {
        updateThreeView();
        if (showPart) {
            window.threeModule.showBasePanel();
            csgScheduler.schedule(true);
        }
    }
}

function handleColorChange(index, newColor) {
    const bit = bitsOnCanvas[index];
    if (!bit) return;

    bit.color = newColor;
    const oldShapeGroup = bit.group?.querySelector("g");
    if (oldShapeGroup) {
        const bitDataWithDisplayColor = {
            ...bit.bitData,
            fillColor: bit.color,
        };
        const newShapeGroup = bitsManager.createBitShapeElement(
            bitDataWithDisplayColor,
            bit.groupName,
            bit.baseAbsX,
            bit.baseAbsY,
            selectionManager.isSelected(index)
        );
        bit.group.replaceChild(newShapeGroup, oldShapeGroup);
    }

    updateOffsetContours();
    updatePhantomBits();

    if (window.threeModule) {
        updateThreeView();
    }
}

function handleSelectionChange() {
    updateBitsSheet();
    redrawBitsOnCanvas();
}

function clearBitSelection() {
    selectionManager.clearSelection();
}

function reorderBits(srcIndex, destIndex) {
    if (srcIndex === destIndex) return;

    const [removed] = bitsOnCanvas.splice(srcIndex, 1);
    bitsOnCanvas.splice(destIndex, 0, removed);

    selectionManager.handleReorder(srcIndex, destIndex);
}

// Delete bit from canvas
function deleteBitFromCanvas(index) {
    if (index < 0 || index >= bitsOnCanvas.length) return;

    const bit = bitsOnCanvas[index];

    // Remove from canvas
    if (bit.group && bit.group.parentNode) {
        bit.group.parentNode.removeChild(bit.group);
    }

    // Remove from array
    bitsOnCanvas.splice(index, 1);

    // Update selection indices via selection manager
    selectionManager.handleDelete(index);

    // Update table
    updateBitsSheet();
    redrawBitsOnCanvas();
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();

    // Update 3D view
    if (window.threeModule) {
        updateThreeView();
    }
}

// Cycle alignment state
async function cycleAlignment(index) {
    const bit = bitsOnCanvas[index];
    if (!bit) return;

    // Cycle to next alignment state
    const currentIdx = alignmentStates.indexOf(bit.alignment || "center");
    const nextIdx = (currentIdx + 1) % alignmentStates.length;
    const newAlignment = alignmentStates[nextIdx];

    // Calculate offset adjustment to keep anchor position the same
    const oldOffset = getAnchorOffset(bit);
    bit.alignment = newAlignment;
    const newOffset = getAnchorOffset(bit);
    const deltaX = oldOffset.x - newOffset.x;
    const deltaY = oldOffset.y - newOffset.y;

    if (deltaX !== 0 || deltaY !== 0) {
        const newX = bit.x + deltaX;
        const newY = bit.y + deltaY;
        await updateBitPosition(index, newX, newY);
    }

    // Update the table to show new alignment button
    updateBitsSheet();

    // Recalculate part shape if part view is enabled
    if (showPart) updatePartShape();

    // Update 3D view
    if (window.threeModule) {
        updateThreeView();
    }
}

// Select a bit and highlight it on canvas (multi-selection support)
function selectBit(index) {
    selectionManager.toggleSelection(index);
}

// Reset bit highlight to original state
function resetBitHighlight(index) {
    selectionManager.resetBitHighlight(index);
}

async function updateBitPosition(index, newX, newY) {
    // update panel params to get correct panel origin
    updatepanelParams();
    const anchorCoords = getPanelAnchorCoords();
    const panelAnchorX = anchorCoords.x;
    const panelAnchorY = anchorCoords.y;

    const selectedBitIndices = selectionManager.getSelectedIndices();

    // Log bit position update
    const bit = bitsOnCanvas[index];
    log.debug(
        `Moving bit #${index} (${
            bit.bitData?.name || "Unknown"
        }) from (${bit.x.toFixed(1)}, ${bit.y.toFixed(1)}) to (${newX.toFixed(
            1
        )}, ${newY.toFixed(1)})`
    );
    if (selectedBitIndices.length > 1) {
        log.debug(
            `Multi-selection: moving ${selectedBitIndices.length} bits together`
        );
    }

    // If this bit is selected and there are multiple selections, move all selected bits by the same delta
    if (selectedBitIndices.includes(index) && selectedBitIndices.length > 1) {
        const oldX = bit.x;
        const oldY = bit.y;
        const deltaX = newX - oldX;
        const deltaY = newY - oldY;

        // Move all selected bits by the same delta
        selectedBitIndices.forEach((selectedIndex) => {
            if (selectedIndex !== index) {
                // Skip the current bit as it's handled below
                const selectedBit = bitsOnCanvas[selectedIndex];
                const selectedNewX = selectedBit.x + deltaX;
                const selectedNewY = selectedBit.y + deltaY;

                // Update selected bit position
                const selectedNewAbsX = panelAnchorX + selectedNewX;
                const selectedNewAbsY = panelAnchorY + selectedNewY;
                const selectedDx = selectedNewAbsX - selectedBit.baseAbsX;
                const selectedDy = selectedNewAbsY - selectedBit.baseAbsY;

                selectedBit.group.setAttribute(
                    "transform",
                    `translate(${selectedDx}, ${selectedDy})`
                );
                selectedBit.x = selectedNewX;
                selectedBit.y = selectedNewY;
            }
        });

        // Update table coordinates for all moved bits
        selectedBitIndices.forEach((selectedIndex) => {
            updateTableCoordinates(
                selectedIndex,
                bitsOnCanvas[selectedIndex].x,
                bitsOnCanvas[selectedIndex].y
            );
        });
    }

    // compute absolute positions the user expects (relative to panel anchor)
    const newAbsX = panelAnchorX + newX;
    const newAbsY = panelAnchorY + newY;

    // compute translation relative to base creation coordinates
    const dx = newAbsX - bit.baseAbsX;
    const dy = newAbsY - bit.baseAbsY;

    // apply transform to group's transform
    bit.group.setAttribute("transform", `translate(${dx}, ${dy})`);

    // save new logical positions
    bit.x = newX;
    bit.y = newY;

    // DO NOT call updateBitsSheet() here - it recreates inputs and breaks focus
    // redraw layer order if needed
    redrawBitsOnCanvas();
    updateOffsetContours();
    updatePhantomBits();
    // Update stroke widths after phantom bits are recreated
    updateStrokeWidths();
    // Update part shape if part view is enabled and bits were moved via table coordinates
    if (showPart) updatePartShape();

    // Update 3D view
    if (window.threeModule) {
        await updateThreeView();
        // If in Part view, show base panel and schedule CSG recalculation
        if (showPart) {
            //window.threeModule.showBasePanel();
            log.debug("CSG recalculation after table input");
            csgScheduler.schedule(true);
        }
    }
}

// Redraw bits on canvas preserving their group transforms
function redrawBitsOnCanvas() {
    const bitsLayer = document.getElementById("bits-layer");
    bitsLayer.innerHTML = ""; // Clear all bits

    bitsOnCanvas.forEach((bit, index) => {
        bit.number = index + 1; // Update bit number
        // append group (contains shape and transform)
        bitsLayer.appendChild(bit.group);

        // Remove existing anchor points
        bit.group
            .querySelectorAll(".anchor-point")
            .forEach((ap) => ap.remove());

        // Add anchor point visualization
        const anchorPoint = document.createElementNS(svgNS, "g");
        anchorPoint.classList.add("anchor-point");

        // Create a small cross or circle at the anchor point
        const anchorOffset = getAnchorOffset(bit);
        const anchorX = anchorOffset.x + bit.baseAbsX;
        const anchorY = anchorOffset.y + bit.baseAbsY;

        // Draw a small cross
        const crossSize = 3;
        const thickness = Math.max(
            0.1,
            0.5 / Math.sqrt(mainCanvasManager.zoomLevel)
        );
        const horizontal = document.createElementNS(svgNS, "line");
        horizontal.setAttribute("x1", anchorX - crossSize);
        horizontal.setAttribute("y1", anchorY);
        horizontal.setAttribute("x2", anchorX + crossSize);
        horizontal.setAttribute("y2", anchorY);
        horizontal.setAttribute("stroke", "red");
        horizontal.setAttribute("stroke-width", thickness);
        anchorPoint.appendChild(horizontal);

        const vertical = document.createElementNS(svgNS, "line");
        vertical.setAttribute("x1", anchorX);
        vertical.setAttribute("y1", anchorY - crossSize);
        vertical.setAttribute("x2", anchorX);
        vertical.setAttribute("y2", anchorY + crossSize);
        vertical.setAttribute("stroke", "red");
        vertical.setAttribute("stroke-width", thickness);
        anchorPoint.appendChild(vertical);

        // Only show anchor point for selected bits
        if (selectionManager.isSelected(index)) {
            anchorPoint.setAttribute("visibility", "visible");
        } else {
            anchorPoint.setAttribute("visibility", "hidden");
        }

        bit.group.appendChild(anchorPoint);
    });
}

// ===== ZOOM AND PAN FUNCTIONS =====

// Get adaptive stroke width based on zoom level
function getAdaptiveStrokeWidth(zoomLevel = mainCanvasManager?.zoomLevel) {
    if (!zoomLevel) return 1; // Default fallback
    return Math.max(0.1, 0.5 / Math.sqrt(zoomLevel));
}

// Update stroke widths based on zoom level
function updateStrokeWidths(zoomLevel = mainCanvasManager?.zoomLevel) {
    if (!zoomLevel) return;
    const thickness = getAdaptiveStrokeWidth(zoomLevel);
    if (partSection) {
        partSection.setAttribute("stroke-width", thickness);
    }
    if (partFront) {
        partFront.setAttribute("stroke-width", thickness);
    }
    bitsOnCanvas.forEach((bit) => {
        const shape = bit.group?.querySelector(".bit-shape");
        const shankShape = bit.group?.querySelector(".shank-shape");
        const extensionShapes = bit.group?.querySelectorAll(".bit-extension");
        if (shape) {
            shape.setAttribute("stroke-width", thickness);
        }
        if (shankShape) {
            shankShape.setAttribute("stroke-width", thickness);
        }
        if (extensionShapes) {
            extensionShapes.forEach((ext) => {
                ext.setAttribute("stroke-width", thickness);
            });
        }
    });
    // Update offset contour stroke widths
    offsetContours.forEach((contour) => {
        if (contour.element) {
            contour.element.setAttribute("stroke-width", thickness);
        }
    });
    // Update phantom bit stroke widths
    const phantomsLayer = mainCanvasManager?.getLayer("phantoms");
    if (phantomsLayer) {
        const phantomShapes = phantomsLayer.querySelectorAll(
            ".phantom-bit .bit-shape"
        );
        phantomShapes.forEach((shape) => {
            shape.setAttribute("stroke-width", thickness);
        });

        // Update extension shapes in phantom bits
        const phantomExtensions = phantomsLayer.querySelectorAll(
            ".phantom-bit .bit-extension"
        );
        phantomExtensions.forEach((ext) => {
            ext.setAttribute("stroke-width", thickness);
        });
    }
}

function fitToScale() {
    // Collect all visible elements from all layers except "grid"
    const allElements = [];

    // Get all layers except grid
    const layerNames = ["panel", "offsets", "bits", "phantoms", "overlay"];

    layerNames.forEach((layerName) => {
        const layer = mainCanvasManager.getLayer(layerName);
        if (layer) {
            // Get all child elements, filtering out hidden ones
            const childElements = Array.from(layer.children).filter(
                (child) =>
                    child.style.display !== "none" &&
                    window.getComputedStyle(child).display !== "none"
            );
            allElements.push(...childElements);
        }
    });

    // If no elements found, fall back to default fit
    if (allElements.length === 0) {
        mainCanvasManager.fitToScale({
            minX: 0,
            maxX: mainCanvasManager.canvasParameters.width,
            minY: 0,
            maxY: mainCanvasManager.canvasParameters.height,
            padding: 20,
        });
        return;
    }

    // Use the unified zoom function to zoom to all canvas elements
    zoomToElements(allElements, 100); // 100 units padding for fit to scale
}

/**
 * Zooms to specified elements or bit indices
 * @param {Array} targets - Array of SVG elements or bit indices to zoom to (default: current selection)
 * @param {number} padding - Padding around the zoomed area
 */
function zoomToElements(
    targets = selectionManager?.getSelectedIndices() || [],
    padding = 50
) {
    if (!targets || targets.length === 0) return;

    // Check if targets are bit indices (numbers) or SVG elements
    const areBitIndices = targets.every((target) => typeof target === "number");

    let combinedBBox;

    if (areBitIndices) {
        // Calculate combined bounding box from bit positions
        const anchorCoords = getPanelAnchorCoords();
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        targets.forEach((index) => {
            const bit = bitsOnCanvas[index];
            if (bit) {
                const centerX = anchorCoords.x + bit.x;
                const centerY = anchorCoords.y + bit.y;
                const radius = (bit.bitData.diameter || 10) / 2;

                let extraBelow = 0;
                if (
                    shankVisible &&
                    bit.bitData.shankDiameter &&
                    bit.bitData.totalLength &&
                    bit.bitData.length
                ) {
                    extraBelow = bit.bitData.totalLength - bit.bitData.length;
                }

                minX = Math.min(minX, centerX - radius);
                minY = Math.min(minY, centerY - radius - extraBelow);
                maxX = Math.max(maxX, centerX + radius);
                maxY = Math.max(maxY, centerY + radius);
            }
        });

        if (minX === Infinity) return; // No valid bits

        const width = maxX - minX;
        const height = maxY - minY;
        const center = { x: minX + width / 2, y: minY + height / 2 };
        combinedBBox = { width, height, center };
    } else {
        // Targets are SVG elements - use the zoom utility
        const bbox = calculateElementsBBox(targets);
        combinedBBox = bbox;
    }

    // Zoom to the combined bounding box
    zoomToBBox(mainCanvasManager, combinedBBox, padding);
}

function zoomToSelected() {
    zoomToElements(selectionManager.getSelectedIndices(), 50);
}

// Helper function to snap value to grid
function snapToGrid(value) {
    return Math.round(value / gridSize) * gridSize;
}

// Helper function to get panel anchor offset
function getpanelAnchorOffset() {
    return panelManager
        ? panelManager.getPanelAnchorOffset()
        : panelAnchor === "top-left"
        ? { x: 0, y: 0 }
        : { x: 0, y: panelThickness };
}

// Helper function to transform Y coordinate for display based on anchor
function transformYForDisplay(rawY, anchorOffset) {
    if (panelManager)
        return panelManager.transformYForDisplay(rawY, anchorOffset);
    const displayY = rawY + anchorOffset.y;
    return panelAnchor === "bottom-left" ? -displayY : displayY;
}

// Helper function to transform Y coordinate from display to internal
function transformYFromDisplay(displayY, anchorOffset) {
    if (panelManager)
        return panelManager.transformYFromDisplay(displayY, anchorOffset);
    const adjustedY = panelAnchor === "bottom-left" ? -displayY : displayY;
    return adjustedY - anchorOffset.y;
}

// Helper function to get panel anchor coordinates
function getPanelAnchorCoords() {
    if (panelManager) return panelManager.getPanelAnchorCoords();
    const panelX = (mainCanvasManager.canvasParameters.width - panelWidth) / 2;
    const panelY =
        (mainCanvasManager.canvasParameters.height - panelThickness) / 2;
    const offset = getpanelAnchorOffset();
    return {
        x: panelX + offset.x,
        y: panelY + offset.y,
    };
}

// Helper function to get anchor offset based on alignment
function getAnchorOffset(bit) {
    const bitData = bit.bitData;
    const halfDiameter = (bitData.diameter || 0) / 2;

    switch (bit.alignment) {
        case "left":
            return { x: -halfDiameter, y: 0 };
        case "right":
            return { x: halfDiameter, y: 0 };
        case "center":
        default:
            return { x: 0, y: 0 };
    }
}
// Interaction handlers now managed by InteractionManager

// Helper function to calculate distance between two points
function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Update table coordinates without recreating the entire table
function updateTableCoordinates(bitIndex, newX, newY) {
    // Show base panel when coordinates change
    if (window.threeModule && window.showPart) {
        window.threeModule.showBasePanel();
        // Schedule CSG recalculation
        log.debug("CSG recalculation after table input");
        csgScheduler.schedule(true);
    }

    const sheetBody = document.getElementById("bits-sheet-body");
    const rows = sheetBody.querySelectorAll("tr");

    if (rows[bitIndex]) {
        const cells = rows[bitIndex].querySelectorAll("td");
        const anchorOffset = getAnchorOffset(bitsOnCanvas[bitIndex]);
        if (cells[3]) {
            // X column
            const xInput = cells[3].querySelector("input");
            if (xInput) xInput.value = newX + anchorOffset.x;
        }
        if (cells[4]) {
            // Y column
            const yInput = cells[4].querySelector("input");
            if (yInput) yInput.value = transformYForDisplay(newY, anchorOffset);
        }
    }
}

function updatePartShape() {
    // Don't perform calculations if Part view is not enabled
    if (!showPart) {
        return partPath;
    }
    const panelX = (mainCanvasManager.canvasParameters.width - panelWidth) / 2;
    const panelY =
        (mainCanvasManager.canvasParameters.height - panelThickness) / 2;

    // Collect phantom bits for boolean operations
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");
    const phantomBits = [];
    if (phantomsLayer) {
        const phantomGroups = phantomsLayer.querySelectorAll(".phantom-bit");
        phantomGroups.forEach((group) => {
            phantomBits.push({ group });
        });
    }

    // Get panel section element
    const panelSection = document.getElementById("panel-section");

    let d;
    if (usePaperJsBoolean) {
        // Use Paper.js boolean processor
        console.log("[Boolean] Using Paper.js");
        d = paperCalculateResultPolygon(
            panelSection,
            bitsOnCanvas,
            phantomBits
        );
    } else {
        // Use maker.js boolean processor (legacy)
        console.log("[Boolean] Using maker.js");
        d = makerCalculateResultPolygon(
            panelWidth,
            panelThickness,
            panelX,
            panelY,
            bitsOnCanvas,
            phantomBits
        );
    }

    partPath.setAttribute("d", d);

    // maker.js возвращает path в origin (0,0) и нужен translate
    // Paper.js возвращает path в правильных координатах
    if (!usePaperJsBoolean) {
        partPath.setAttribute("transform", `translate(${panelX}, ${panelY})`);
    } else {
        partPath.removeAttribute("transform");
    }

    return partPath;
}

// Toggle bits visibility
function toggleBitsVisibility() {
    bitsVisible = !bitsVisible;
    window.bitsVisible = bitsVisible; // Update window reference
    appState.setBitsVisible(bitsVisible);
    const bitsBtn = document.getElementById("bits-btn");
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");

    if (bitsVisible) {
        // Show bits and phantom bits
        bitsLayer.style.display = "block";
        phantomsLayer.style.display = "block";
        bitsBtn.classList.remove("bits-hidden");
        bitsBtn.classList.add("bits-visible");
        bitsBtn.title = "Hide Bits";

        // Also respect shank visibility
        if (!shankVisible) {
            bitsOnCanvas.forEach((bit) => {
                const shankShape = bit.group?.querySelector(".shank-shape");
                if (shankShape) {
                    shankShape.style.display = "none";
                }
            });
        }
    } else {
        // Hide bits and phantom bits
        bitsLayer.style.display = "none";
        phantomsLayer.style.display = "none";
        bitsBtn.classList.remove("bits-visible");
        bitsBtn.classList.add("bits-hidden");
        bitsBtn.title = "Show Bits";
    }

    // Update 3D view to show/hide bit meshes
    if (window.threeModule) {
        window.threeModule.toggleBitMeshesVisibility(bitsVisible);
    }
}

// Toggle shank visibility
function toggleShankVisibility() {
    shankVisible = !shankVisible;
    appState.setShankVisible(shankVisible);
    const shankBtn = document.getElementById("shank-btn");

    bitsOnCanvas.forEach((bit) => {
        const shankShape = bit.group?.querySelector(".shank-shape");
        if (shankShape) {
            shankShape.style.display = shankVisible ? "block" : "none";
        }
    });

    if (shankVisible) {
        shankBtn.classList.remove("shank-hidden");
        shankBtn.classList.add("shank-visible");
        shankBtn.title = "Hide Shanks";
    } else {
        shankBtn.classList.remove("shank-visible");
        shankBtn.classList.add("shank-hidden");
        shankBtn.title = "Show Shanks";
    }
}

async function togglePartView() {
    if (!bitsLayer || !partSection || !partPath) {
        log.error("SVG elements not initialized");
        return;
    }

    showPart = !showPart;
    window.showPart = showPart; // Update window reference
    appState.setShowPart(showPart);
    log.info("togglePartView: showPart changed", { showPart });

    const partBtn = document.getElementById("part-btn");

    if (showPart) {
        updatePartShape();
        partSection.style.display = "none";
        partPath.style.display = "block";
        // Respect the bits visibility state
        bitsLayer.style.display = bitsVisible ? "block" : "none";
        partBtn.classList.remove("part-hidden");
        partBtn.classList.add("part-visible");
        partBtn.title = "Show Material";
    } else {
        partSection.style.display = "block";
        partPath.style.display = "none";
        // Respect the bits visibility state
        bitsLayer.style.display = bitsVisible ? "block" : "none";
        partBtn.classList.remove("part-visible");
        partBtn.classList.add("part-hidden");
        partBtn.title = "Show Part";
    }

    // Refresh phantom bits and offsets after display change (canvas dimensions may have changed)
    updateOffsetContours();
    updatePhantomBits();

    // Update 3D view and apply CSG logic
    if (window.threeModule) {
        // Always update 3D view with current panel/bits data first
        await updateThreeView();

        // Then apply or remove CSG based on showPart flag
        if (showPart) {
            csgScheduler.schedule(true);
        } else {
            window.threeModule.showBasePanel();
        }
    }
}

// Initialize
function initialize() {
    initializeSVG();

    // Now that bitsManager is created, initialize the bit groups
    bitsManager.createBitGroups();

    // Initial update of offset contours and phantom bits (even if no bits are loaded yet)
    updateOffsetContours();
    updatePhantomBits();

    // Add event listeners for panel parameter inputs
    panelWidthInput.addEventListener("input", updatepanelParams);
    panelHeightInput.addEventListener("input", updatepanelParams);
    panelThicknessInput.addEventListener("input", updatepanelParams);

    // Add math evaluation on blur
    panelWidthInput.addEventListener("blur", () => {
        panelWidthInput.value = evaluateMathExpression(panelWidthInput.value);
        updatepanelParams();
    });
    panelHeightInput.addEventListener("blur", () => {
        panelHeightInput.value = evaluateMathExpression(panelHeightInput.value);
        updatepanelParams();
    });
    panelThicknessInput.addEventListener("blur", () => {
        panelThicknessInput.value = evaluateMathExpression(
            panelThicknessInput.value
        );
        updatepanelParams();
    });

    // Initial fit to scale after all initialization is complete
    requestAnimationFrame(() => {
        fitToScale();

        // Initialize 3D panel view
        updateThreeView();

        // Auto-load saved bit positions after everything is initialized
        setTimeout(async () => {
            const savedPositions = localStorage.getItem("bits_positions");
            if (savedPositions) {
                try {
                    const positionsData = JSON.parse(savedPositions);
                    if (positionsData.length > 0) {
                        const restoredCount = await restoreBitPositions(
                            positionsData
                        );
                        const uiModule = app.getModule("ui");
                        uiModule.logOperation(
                            `Auto-loaded ${restoredCount} saved bit positions`
                        );
                        updateOffsetContours(); // Update offset contours after loading saved positions
                        updatePhantomBits(); // Update phantom bits after loading saved positions
                    }
                } catch (error) {
                    console.warn("Failed to load saved positions:", error);
                    logOperation("Failed to auto-load saved positions");
                }
            }
        }, 100); // Small delay to ensure everything is ready
    });
}

// Export to DXF function
async function exportToDXF() {
    if (bitsOnCanvas.length === 0) {
        alert("No bits on canvas to export. Please add some bits first.");
        return;
    }

    // Get updated partPath object with current bit positions
    const isPartVisible = showPart;
    if (!isPartVisible) {
        showPart = true;
    }

    const partPath = updatePartShape();

    console.log(partPath);

    try {
        // Get the export module from the app
        const exportModule = app.getModule("export");
        if (!exportModule) {
            throw new Error("Export module not found");
        }

        // Export to DXF with partPath, partFront, offset contours, and panel thickness
        const dxfContent = exportModule.exportToDXF(
            bitsOnCanvas,
            partPath,
            partFront,
            offsetContours,
            panelThickness
        );

        if (!isPartVisible) {
            showPart = false;
        }

        // Download the file
        exportModule.downloadDXF(dxfContent);

        console.log("DXF export completed. File downloaded.");
        logOperation("DXF export completed successfully");
    } catch (error) {
        console.error("Failed to export DXF:", error);
        logOperation("Failed to export DXF: " + error.message);
        alert("Failed to export DXF. Please check console for details.");
    }
}

// Logging function for operations
function logOperation(message) {
    const logElement = document.getElementById("operations-log");
    const timestamp = new Date().toLocaleTimeString();
    logElement.textContent = `[${timestamp}] ${message}`;

    // Remove fade-out class if it exists
    logElement.classList.remove("fade-out");

    // Add fade-out class after 5 seconds
    setTimeout(() => {
        logElement.classList.add("fade-out");
    }, 5000);
}

// Save current bit positions to localStorage
function saveBitPositions() {
    const savedPositions = bitsOnCanvas.map((bit) => ({
        id: bit.bitData.id,
        x: bit.x,
        y: bit.y,
        alignment: bit.alignment,
        operation: bit.operation,
        color: bit.color,
    }));

    localStorage.setItem("bits_positions", JSON.stringify(savedPositions));
    logOperation(`Saved ${savedPositions.length} bit positions`);
}

// Save bit positions to JSON file
function saveBitPositionsAs() {
    const savedPositions = bitsOnCanvas.map((bit) => ({
        id: bit.bitData.id,
        x: bit.x,
        y: bit.y,
        alignment: bit.alignment,
        operation: bit.operation,
        color: bit.color,
    }));

    const dataStr = JSON.stringify(savedPositions, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = "bits_positions.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logOperation(
        `Exported ${savedPositions.length} bit positions to JSON file`
    );
}

// Load bit positions from JSON file
async function loadBitPositions() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const positionsData = JSON.parse(event.target.result);
                    const restoredCount = await restoreBitPositions(
                        positionsData
                    );
                    logOperation(
                        `Loaded ${restoredCount} bit positions from JSON file`
                    );
                    updateOffsetContours(); // Update offset contours after loading positions
                } catch (error) {
                    alert(
                        "Failed to parse JSON file. Please check the format."
                    );
                    logOperation(
                        "Failed to load positions: invalid JSON format"
                    );
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// Restore bit positions from data
async function restoreBitPositions(positionsData) {
    // Clear current canvas
    bitsOnCanvas.forEach((bit) => {
        if (bit.group && bit.group.parentNode) {
            bit.group.parentNode.removeChild(bit.group);
        }
    });
    bitsOnCanvas = [];

    // Get all available bits
    const allBits = await getBits();

    let restoredCount = 0;

    // Restore positions
    positionsData.forEach((pos, index) => {
        // Find the bit data by ID
        let bitData = null;
        let groupName = null;

        for (const [group, bits] of Object.entries(allBits)) {
            const found = bits.find((b) => b.id === pos.id);
            if (found) {
                bitData = found;
                groupName = group;
                break;
            }
        }

        if (bitData) {
            try {
                // Create bit on canvas at the saved position
                const panelX =
                    (mainCanvasManager.canvasParameters.width - panelWidth) / 2;
                const panelY =
                    (mainCanvasManager.canvasParameters.height -
                        panelThickness) /
                    2;
                const centerX = panelX + panelWidth / 2;
                const centerY = panelY + panelThickness / 2;

                const shape = bitsManager.createBitShapeElement(
                    bitData,
                    groupName,
                    centerX,
                    centerY
                );

                const g = document.createElementNS(svgNS, "g");
                g.appendChild(shape);

                bitsLayer.appendChild(g);

                bitCounter++;

                // Ensure operation is valid for the group
                const validOperations = getOperationsForGroup(groupName);
                let operation = pos.operation || "AL";
                if (!validOperations.includes(operation)) {
                    operation = "AL"; // Fallback to default
                }

                const newBit = {
                    number: bitCounter,
                    name: bitData.name,
                    x: pos.x,
                    y: pos.y,
                    alignment: pos.alignment || "center",
                    operation: operation,
                    color: pos.color || bitData.fillColor || "#cccccc",
                    group: g,
                    baseAbsX: centerX,
                    baseAbsY: centerY,
                    bitData: bitData,
                    groupName: groupName,
                };

                bitsOnCanvas.push(newBit);
                // Assign profile path to the restored bit
                bitsManager.assignProfilePathsToBits([newBit]);
                restoredCount++;

                // Apply the saved position
                const panelAnchorCoords = getPanelAnchorCoords();
                const absX = panelAnchorCoords.x + pos.x;
                const absY = panelAnchorCoords.y + pos.y;
                const dx = absX - centerX;
                const dy = absY - centerY;
                g.setAttribute("transform", `translate(${dx}, ${dy})`);
            } catch (error) {
                console.error(`Error restoring bit ${pos.id}:`, error);
            }
        } else {
            console.warn(`Bit with ID ${pos.id} not found in available bits`);
        }
    });

    // Update table and canvas
    updateBitsSheet();
    updateStrokeWidths();
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();

    return restoredCount;
}

// Clear all bits from canvas
function clearAllBits() {
    const bitCount = bitsOnCanvas.length;

    bitsOnCanvas.forEach((bit) => {
        if (bit.group && bit.group.parentNode) {
            bit.group.parentNode.removeChild(bit.group);
        }
    });

    bitsOnCanvas = [];
    bitCounter = 0;

    // Clear localStorage
    localStorage.removeItem("bits_positions");

    // Update table and canvas
    updateBitsSheet();
    updateOffsetContours();
    updatePhantomBits();
    if (showPart) updatePartShape();

    logOperation(`Cleared ${bitCount} bits from canvas`);
}

// Add window resize listener for responsive canvas and panel visibility
window.addEventListener("resize", () => {
    if (mainCanvasManager) {
        mainCanvasManager.resize();
        // Update all canvas elements after resize
        updatepanelShape();
        updateBitsPositions();
        updateOffsetContours();
        updatePhantomBits();
        if (showPart) updatePartShape();
    }

    // Auto-show panels when screen becomes wide enough
    const leftPanel = document.getElementById("left-panel");
    const rightMenu = document.getElementById("right-menu");

    // Show left panel when screen is wider than 768px
    if (window.innerWidth > 768 && leftPanel) {
        leftPanel.classList.remove("collapsed", "overlay-visible");
        leftPanel.style.display = ""; // Reset to default display
        if (leftPanelClickOutsideHandler) {
            document.removeEventListener("click", leftPanelClickOutsideHandler);
            leftPanelClickOutsideHandler = null;
        }
    }

    // Show right menu when screen is wider than 1000px
    if (window.innerWidth > 1000 && rightMenu) {
        rightMenu.classList.remove("collapsed", "overlay-visible");
        rightMenu.style.display = ""; // Reset to default display
        if (rightPanelClickOutsideHandler) {
            document.removeEventListener(
                "click",
                rightPanelClickOutsideHandler
            );
            rightPanelClickOutsideHandler = null;
        }
    }

    // Update canvas after panel changes
    if (mainCanvasManager) {
        updateCanvasAfterPanelToggle();
    }
});

// Initialize modular system and then start the application
async function initializeModularSystem() {
    try {
        // Initialize the modular application
        await app.start();

        // Get module instances
        const canvasModule = app.getModule("canvas");
        const bitsModule = app.getModule("bits");
        const threeModule = app.getModule("three");

        log.info("Modular system initialized successfully");
        log.debug("Canvas module:", canvasModule);
        log.debug("Bits module:", bitsModule);
        log.debug("Three module:", threeModule);

        // Initialize Three.js module
        if (threeModule) {
            await threeModule.init();
            // Make it globally accessible
            window.threeModule = threeModule;
            // Make ExtrusionBuilder publicly accessible for console adjustments
            window.extrusionBuilder = threeModule.extrusionBuilder;
            log.info("ExtrusionBuilder available as window.extrusionBuilder");
            log.info("Adjust curve segments from console:");
            log.info("  window.extrusionBuilder.curveSegmentCoefficient = 3");
            log.info("  window.extrusionBuilder.curveSegmentMin = 20");
            log.info("  window.extrusionBuilder.curveSegmentMax = 80");
            log.info("");
            log.info("Arc approximation quality (same as panel):");
            log.info("  window.extrusionBuilder.arcDivisionCoefficient = 5");
            log.info(
                "  (Lower value = smoother, more samples. 100mm arc with coef=5 → 20 points)"
            );
            log.info("  window.extrusionBuilder.getArcQualityInfo()");
            log.info("  window.extrusionBuilder.setArcQuality(3) // to change");
            // Configure centralized CSG scheduler
            csgScheduler.configure((apply) =>
                threeModule.applyCSGOperation(apply)
            );
        }

        // Start the original initialization
        initialize();

        // Populate material selector once Three.js module is ready
        setupMaterialSelector();

        // Setup view toggle buttons
        setupViewToggle(threeModule);
    } catch (error) {
        log.error("Failed to initialize modular system:", error);
        // Fallback to original initialization if modular system fails
        initialize();
        setupMaterialSelector();
    }
}

// Setup view toggle buttons (2D/2Dp/3D/2D-2Dp/Both)
function setupViewToggle(threeModule) {
    const view2DBtn = document.getElementById("view-2d");
    const view2DpBtn = document.getElementById("view-2dp");
    const view3DBtn = document.getElementById("view-3d");
    const view2D2DpBtn = document.getElementById("view-2d-2dp");
    const viewBothBtn = document.getElementById("view-both");
    const appContainer = document.getElementById("app");

    let currentView = "2d"; // Default view

    // Function to update active button state
    function updateActiveButton(activeBtn) {
        [view2DBtn, view2DpBtn, view3DBtn, view2D2DpBtn, viewBothBtn].forEach(
            (btn) => {
                btn.classList.remove("active");
            }
        );
        activeBtn.classList.add("active");
    }

    // Function to switch view
    function switchView(view) {
        currentView = view;

        // Remove all view classes
        appContainer.classList.remove(
            "view-2d",
            "view-2dp",
            "view-3d",
            "view-2d-2dp",
            "view-both"
        );

        // Add current view class
        appContainer.classList.add(`view-${view}`);

        // Update 3D view with current data if switching to 3D or both
        if (threeModule && (view === "3d" || view === "both")) {
            updateThreeView();
        }

        // Update Paper.js view if switching to 2dp or 2d-2dp
        if (paperCanvasManager && (view === "2dp" || view === "2d-2dp")) {
            // Синхронизируем данные из SVG в Paper.js
            syncSVGtoPaper();
        }

        // Handle resize for canvas managers
        if (mainCanvasManager) {
            setTimeout(() => {
                mainCanvasManager.resize();
                updatepanelShape();
                updateOffsetContours(); // Update offset contours after panel shape changes
                updateBitsPositions();
            }, 100);
        }

        // Handle Three.js resize
        if (threeModule && (view === "3d" || view === "both")) {
            setTimeout(() => {
                threeModule.onWindowResize();
            }, 100);
        }

        // Handle Paper.js resize
        if (paperCanvasManager && (view === "2dp" || view === "2d-2dp")) {
            setTimeout(() => {
                if (paperCanvasManager.view) {
                    paperCanvasManager.view.update();
                }
            }, 100);
        }
    }

    // 2D view button (SVG)
    view2DBtn.addEventListener("click", () => {
        switchView("2d");
        updateActiveButton(view2DBtn);
    });

    // 2Dp view button (Paper.js)
    view2DpBtn.addEventListener("click", () => {
        switchView("2dp");
        updateActiveButton(view2DpBtn);
    });

    // 3D view button
    view3DBtn.addEventListener("click", () => {
        switchView("3d");
        updateActiveButton(view3DBtn);
    });

    // 2D + 2Dp views button
    view2D2DpBtn.addEventListener("click", () => {
        switchView("2d-2dp");
        updateActiveButton(view2D2DpBtn);
    });

    // Both views button (2D + 3D)
    viewBothBtn.addEventListener("click", () => {
        switchView("both");
        updateActiveButton(viewBothBtn);
    });

    // Set initial view (just update classes without resize)
    appContainer.classList.add("view-2d");
    updateActiveButton(view2DBtn);
}

// Function to update Three.js view with current panel and bits data
async function updateThreeView() {
    const threeModule = window.threeModule;
    if (!threeModule) return;

    // Get real dimensions from partFront bbox (source of truth)
    const realWidth = panelManager.getWidth();
    const realHeight = panelManager.getHeight();

    await threeModule.updatePanel(
        realWidth,
        realHeight,
        panelThickness,
        bitsOnCanvas,
        panelAnchor
    );
}

// Function to sync SVG data to Paper.js canvas
function syncSVGtoPaper() {
    if (!paperCanvasManager) return;

    console.log("Syncing SVG → Paper.js...");

    try {
        // Clear existing Paper.js content
        paperCanvasManager.clear();

        // 1. Create panel in Paper.js
        if (panelWidth && panelThickness) {
            paperCanvasManager.createPanel(panelWidth, 0, panelThickness);
        }

        // 2. Add bits to Paper.js
        if (bitsOnCanvas && bitsOnCanvas.length > 0) {
            bitsOnCanvas.forEach((bit) => {
                paperCanvasManager.addBit({
                    id: bit.id,
                    x: bit.x,
                    y: bit.y,
                    diameter: bit.diameter || bit.width || 10,
                });
            });
        }

        // 3. Create offset contours (если они есть в SVG)
        if (paperCanvasManager.panelPath) {
            // Примеры offset для демонстрации
            paperCanvasManager.createOffset(paperCanvasManager.panelPath, -2);
            paperCanvasManager.createOffset(paperCanvasManager.panelPath, 2);
        }

        // 4. Fit to view
        setTimeout(() => {
            paperCanvasManager.fitToView();
        }, 100);

        console.log("SVG → Paper.js sync complete");
    } catch (error) {
        console.error("Failed to sync SVG to Paper.js:", error);
    }
}

function setupMaterialSelector() {
    const select = document.getElementById("material-select");
    if (!select || !window.threeModule) return;

    const registry = window.threeModule.materialRegistry || {};
    select.innerHTML = "";

    Object.entries(registry).forEach(([key, entry]) => {
        if (entry && entry.enabled !== false) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = key;
            select.appendChild(option);
        }
    });

    select.value = window.threeModule.currentMaterialKey;

    select.addEventListener("change", (e) => {
        const mode = e.target.value;
        window.threeModule.setMaterialMode(mode);
        if (window.showPart) {
            csgScheduler.schedule(true);
        } else {
            window.threeModule.showBasePanel();
        }
    });
}

// Expose BitLogger helper functions to console for debugging
window.getBitLogs = () => {
    const bitLogger = LoggerFactory.getBitLogger();
    return {
        all: () => bitLogger.logs,
        bitEvents: () => bitLogger.bitEvents,
        forBit: (bitIndex) => bitLogger.getBitEvents(bitIndex),
        byType: (eventType) => bitLogger.getEventsByType(eventType),
        extensions: () => bitLogger.getEventsByType("EXTENSION_UPDATED"),
        collisions: () => bitLogger.getEventsByType("SHANK_COLLISION"),
        extrusions: () => bitLogger.getEventsByType("EXTRUSION_CREATED"),
        export: () => bitLogger.exportBitEvents(),
        clear: () => bitLogger.clearBitEvents(),
    };
};

console.log(
    "%c[Bit Logger] Helper functions available:",
    "color: #4CAF50; font-weight: bold;"
);
console.log("  window.getBitLogs().all() - Get all logs");
console.log("  window.getBitLogs().bitEvents() - Get all bit events");
console.log(
    "  window.getBitLogs().forBit(index) - Get events for specific bit"
);
console.log("  window.getBitLogs().extensions() - Get all extension events");
console.log("  window.getBitLogs().collisions() - Get all collision events");
console.log("  window.getBitLogs().extrusions() - Get all 3D extrusion events");
console.log("  window.getBitLogs().export() - Export events as JSON");
console.log("  window.getBitLogs().clear() - Clear all bit events");

// Call initialize function when the page loads
window.addEventListener("load", initializeModularSystem);
