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
import { PaperOffsetCalculator } from "./operations/PaperOffsetProcessor.js";
import { getOperationsForGroup } from "./data/bitsStore.js";
import { paperCalculateResultPolygon } from "./operations/PaperBooleanProcessor.js";
import LoggerFactory from "./core/LoggerFactory.js";
import eventBus from "./core/eventBus.js";
import appState from "./state/AppState.js";
import csgScheduler from "./scheduling/CSGScheduler.js";
import InteractionManager from "./interaction/InteractionManager.js";
import PanelManager from "./panel/PanelManager.js";
import { PaperCanvasManager } from "./canvas/PaperCanvasManager.js";
import SVGElementFactory from "./canvas/SVGElementFactory.js";
import ExtensionCalculator from "./bits/ExtensionCalculator.js";
import PhantomBitCalculator from "./bits/PhantomBitCalculator.js";
import {
    ARC_APPROX_TOLERANCE,
    ARC_RADIUS_TOLERANCE,
    DEFAULT_STROKE_BASE,
    DEFAULT_STROKE_MIN,
} from "./config/constants.js";

// Import new modular system
import { app } from "./app/main.js";
import CanvasModule from "./canvas/CanvasModule.js";
import BitsModule from "./bits/BitsModule.js";

// **PHASE 1 REFACTORING IMPORTS** - Centralized Configuration and State
import { AppConfig, appConfig } from "./config/AppConfig.js";
import { BitRegistry, bitRegistry } from "./bits/BitRegistry.js";
import { PanelCoordinateHelper } from "./canvas/PanelCoordinateHelper.js";
import { ManagerFactory } from "./core/ManagerFactory.js";

// **PHASE 2 REFACTORING IMPORTS** - Business Logic Extraction
import { BooleanOperationStrategy } from "./operations/BooleanOperationStrategy.js";
import { UpdatePipeline } from "./operations/UpdatePipeline.js";
import BDHelper from "./operations/BitDataHelper.js";

// SVG namespace
const svgNS = "http://www.w3.org/2000/svg";
const log = LoggerFactory.createLogger("Script");

// Get DOM elements
const canvas = document.getElementById("canvas");
const panelWidthInput = document.getElementById("panel-width");
const panelHeightInput = document.getElementById("panel-height");
const panelThicknessInput = document.getElementById("panel-thickness");

// **PHASE 1 REFACTORING** - Replace global variables with appConfig instance
// Global variables for panel shape (DEPRECATED - use appConfig instead)
let partSection;
let partFront;
let partPath;
let panelWidth = appConfig.panel.width;
let panelHeight = appConfig.panel.height;
let panelThickness = appConfig.panel.thickness;
let panelAnchor = appConfig.panel.anchor;
let showPart = appConfig.ui.showPart;
let gridSize = appConfig.ui.gridSize;
let bitsVisible = appConfig.ui.bitsVisible;
let shankVisible = appConfig.ui.shankVisible;

// **PHASE 1 REFACTORING** - Use bitRegistry instead of direct array
// bitsOnCanvas is now accessed via bitRegistry.bits
let bitsOnCanvas = bitRegistry.bits; // Reference to registry bits array

// Canvas manager instance
let mainCanvasManager;
let paperCanvasManager;
let bitsManager;
let bitsTableManager;
let interactionManager;
let panelManager;
let selectionManager;

// **PHASE 1 REFACTORING** - Create PanelCoordinateHelper
let panelCoordinateHelper;

// **PHASE 1 REFACTORING** - Create ManagerFactory
let managerFactory;

// **PHASE 2 REFACTORING** - Business Logic Extraction Classes
let booleanOperationStrategy;
let updatePipeline;
let bitDataHelper;

// **PHASE 3 REFACTORING** - Calculators and factories
let svgElementFactory;
let extensionCalculator;
let phantomBitCalculator;

// Offset contours for each bit
let offsetContours = [];

// Make offsetContours globally accessible for ThreeModule
window.offsetContours = offsetContours;

// Event handlers
let leftPanelClickOutsideHandler = null;
let rightPanelClickOutsideHandler = null;

/**
 * Initialize SVG canvas and managers
 * **PHASE 1 REFACTORING** - Simplified from 440 to ~300 lines with ManagerFactory
 */
function initializeSVG() {
    // **PHASE 1 REFACTORING** - Initialize new managers and helpers
    // Create ManagerFactory for dependency injection
    managerFactory = new ManagerFactory(appConfig);

    // Note: partSection and partFront will be created by PanelManager via initializeSVGElements()

    // Check if CanvasManager already exists (from modular system)
    if (!mainCanvasManager) {
        // Calculate panel anchor position for grid alignment
        const canvasSize = { width: 800, height: 600 };
        const panelX = (canvasSize.width - panelWidth) / 2;
        const panelY = (canvasSize.height - panelThickness) / 2;
        const anchorOffset = getPanelAnchorOffset();
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
            log.info("Paper.js canvas initialized");

            // Run demo to show capabilities
            // paperCanvasManager.demo(); // Uncomment to run demo
        } catch (error) {
            log.error("Failed to initialize Paper.js canvas:", error);
        }
    }

    // **PHASE 1 REFACTORING** - Initialize coordinate helper after mainCanvasManager is ready
    if (!panelCoordinateHelper) {
        panelCoordinateHelper = new PanelCoordinateHelper(
            mainCanvasManager,
            appConfig
        );
        window.panelCoordinateHelper = panelCoordinateHelper;
    }

    // **PHASE 2 REFACTORING** - Initialize business logic extraction classes
    if (!booleanOperationStrategy) {
        booleanOperationStrategy = new BooleanOperationStrategy(
            appConfig,
            mainCanvasManager,
            paperCalculateResultPolygon
        );
        window.booleanOperationStrategy = booleanOperationStrategy;
    }

    if (!bitDataHelper) {
        bitDataHelper = new BDHelper(appConfig, panelCoordinateHelper);
        window.bitDataHelper = bitDataHelper;
    }

    if (!updatePipeline) {
        updatePipeline = new UpdatePipeline(
            mainCanvasManager,
            appConfig,
            panelCoordinateHelper,
            booleanOperationStrategy,
            {
                onOffsetContoursUpdate: () => updateOffsetContours(),
                onPhantomBitsUpdate: () => updatePhantomBits(),
                onSheetUpdate: () => updateSheet(),
                on3DUpdate: () => update3DModel(),
            }
        );
        window.updatePipeline = updatePipeline;
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
    panelAnchorBtn.addEventListener("click", cyclePanelAnchor);

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

    // Initialize factories and calculators (Phase 3)
    if (!svgElementFactory) {
        svgElementFactory = new SVGElementFactory(svgNS);
    }

    // Create simple metadata helper for ExtensionCalculator and PhantomBitCalculator
    // This object provides methods to store extension/shank/phantom data on bitData objects
    const bitMetadataHelper = {
        setExtension(bitData, extensionInfo) {
            if (!bitData) return;
            bitData.extension = extensionInfo
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
                : null;
        },
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
        setPhantomPass(bitData, passIndex, depth, extensionInfo = null) {
            if (!bitData || !bitData.phantoms) return;
            const phantomIndex = passIndex - 1;
            if (phantomIndex >= 0 && phantomIndex < bitData.phantoms.length) {
                bitData.phantoms[phantomIndex] = {
                    passIndex: passIndex,
                    depth: depth,
                    extension: extensionInfo
                        ? {
                              height: extensionInfo.height,
                              width: extensionInfo.width,
                              relativeX:
                                  extensionInfo.relativeX ||
                                  extensionInfo.localX,
                              relativeY:
                                  extensionInfo.relativeY ||
                                  extensionInfo.localY,
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
        getPhantomPass(bitData, passIndex) {
            if (!bitData?.phantoms) return null;
            const phantomIndex = passIndex - 1;
            return bitData.phantoms[phantomIndex] || null;
        },
        initPhantoms(bitData, passCount) {
            if (!bitData) return;
            bitData.phantoms = new Array(passCount - 1)
                .fill(null)
                .map((_, i) => ({
                    passIndex: i + 1,
                    depth: null,
                    extension: null,
                }));
        },
    };

    extensionCalculator = new ExtensionCalculator({
        svgFactory: svgElementFactory,
        bitDataHelper: bitMetadataHelper,
        getAdaptiveStrokeWidth: (zoom) => getAdaptiveStrokeWidth(zoom),
        getBitLogger: () => window.LoggerFactory?.getBitLogger?.(),
        getMaterialTopY: () => {
            const panelSectionEl = document.getElementById("panel-section");
            if (!panelSectionEl) return null;
            return parseFloat(panelSectionEl.getAttribute("y")) || 0;
        },
        getZoomLevel: () => mainCanvasManager?.zoomLevel || 1,
    });

    phantomBitCalculator = new PhantomBitCalculator({
        bitsManager,
        bitDataHelper: bitMetadataHelper,
        getAnchorOffset: () => getPanelAnchorOffset(),
        convertToTopAnchorCoordinates: (bit) =>
            convertToTopAnchorCoordinates(bit),
        getAdaptiveStrokeWidth: (zoom) => getAdaptiveStrokeWidth(zoom),
        getZoomLevel: () => mainCanvasManager?.zoomLevel || 1,
    });

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
        convertToTopAnchorCoordinates: convertToTopAnchorCoordinates,
        getPanelThickness: () => panelThickness,
        angleToRad: angleToRad,
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
        updateOffsetContours: updateOffsetContours,
        updatePhantomBits: updatePhantomBits,
        updatePocketWidthInputs: updatePocketWidthInputs,
        updateBitExtensions: updateBitExtensions,
        updateThreeView: updateThreeView,
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
            updatePanelAnchorIndicator();
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
                            newBitShape.setAttribute(
                                "stroke-width",
                                getAdaptiveStrokeWidth()
                            );
                        }
                        if (newShankShape) {
                            newShankShape.setAttribute("stroke", "#00BFFF");
                            newShankShape.setAttribute(
                                "stroke-width",
                                getAdaptiveStrokeWidth()
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
function cyclePanelAnchor() {
    if (panelManager) {
        panelManager.cyclePanelAnchor();
        panelAnchor = panelManager.getAnchor();

        // **PHASE 1 REFACTORING** - Sync with appConfig
        appConfig.panel.anchor = panelAnchor;

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
function updatePartFront() {
    if (panelManager) {
        panelManager.updatePartFront();

        // Update global variables from panelManager
        // If shape was manually edited, getWidth/getHeight return bbox
        // Otherwise they return parameters
        panelWidth = panelManager.getWidth();
        panelHeight = panelManager.getHeight();

        // **PHASE 1 REFACTORING** - Sync with appConfig
        appConfig.panel.width = panelWidth;
        appConfig.panel.height = panelHeight;
    }
}

// Update panel shape
function updatePanelShape() {
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
function updatePanelAnchorIndicator() {
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
function updatePanelParams() {
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

        // Recalculate pocket offsets for PO bits in full removal mode
        bitsOnCanvas.forEach((bit, index) => {
            if (bit.operation === "PO" && bit.isFullRemoval) {
                const calculatedOffset = panelWidth - bit.x * 2;
                bit.pocketOffset = Math.max(0, calculatedOffset);
                log.debug(
                    `[PO] Auto-recalculated pocketOffset for bit ${index}: ${bit.pocketOffset.toFixed(
                        2
                    )}mm (panel width changed)`
                );
            }
        });

        updateOffsetContours();
        updatePhantomBits();
        if (showPart) updatePartShape();

        // Update 3D view if it's visible
        if (window.threeModule) {
            updateThreeView();
            // If in Part view, trigger CSG recalculation
            if (showPart) {
                window.threeModule.showBasePanel();
                csgScheduler.schedule(true);
            }
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
        const anchorOffset = getPanelAnchorOffset();
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

// **PHASE 1 REFACTORING** - bitsOnCanvas and offsetContours are now defined above
// These were moved to Phase 1 configuration section
let bitsLayer;

// Make offsetContours globally accessible for ThreeModule
window.offsetContours = offsetContours;

// Helper function to convert bit coordinates to top anchor coordinates
/**
 * Converts bit coordinates from current anchor to top anchor reference frame.
 *
 * This is critical for offset calculations in V-Carve operations, which always use
 * the top anchor as the reference point. The conversion adds the current anchor offset
 * to the bit's coordinates to get its position relative to the top (default) anchor.
 *
 * @param {Object} bit - Bit object with x, y position in current anchor frame
 * @param {number} bit.x - Bit X position (relative to current anchor)
 * @param {number} bit.y - Bit Y position (relative to current anchor)
 * @returns {Object} Converted coordinates {x, y} relative to top anchor
 *
 * @example
 * // Bit at current anchor (center): {x: 10, y: 5}
 * // Current anchor offset: {x: 25, y: 20} (center is 25mm right of top)
 * // Result: {x: 35, y: 25} (top anchor coordinates)
 * const topAnchorCoords = convertToTopAnchorCoordinates(bit);
 */
function convertToTopAnchorCoordinates(bit) {
    const currentAnchorOffset = getPanelAnchorOffset();
    // Convert from current anchor to top anchor coordinates
    return {
        x: bit.x + currentAnchorOffset.x,
        y: bit.y + currentAnchorOffset.y,
    };
}

/**
 * Updates bit extension rectangles showing material below the bit.
 *
 * Delegates to ExtensionCalculator, which handles:
 * - Detection of bits extending below material surface (bitTopY > materialTopY)
 * - Shank collision detection (shank diameter > bit diameter)
 * - Adaptive stroke width based on zoom level
 * - Storage of extension metadata for DXF export
 *
 * Extensions appear as red rectangles in the 2D canvas when a bit extends below
 * the material surface. Dark red indicates a shank collision (wider extension).
 *
 * @returns {void} - Updates DOM by adding/removing extension rectangles
 * @see ExtensionCalculator for detailed algorithm
 *
 * @example
 * // Called whenever bit positions or material top changes
 * updateBitExtensions();
 * // Result: Red extension rectangles appear below bits that extend past materialTopY
 */
function updateBitExtensions() {
    if (!extensionCalculator || !mainCanvasManager) return;
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");
    extensionCalculator.updateExtensions({
        bitsOnCanvas,
        phantomsLayer,
    });
}

/**
 * Updates phantom bits for V-Carve operations showing intermediate cutting depths.
 *
 * Delegates to PhantomBitCalculator, which handles:
 * - Calculation of number of passes based on bit angle and bit Y position
 * - Creation of phantom bit shapes at each intermediate depth (1/N, 2/N, ..., (N-1)/N)
 * - Rendering of phantom bits on the phantoms layer
 * - Storage of phantom pass metadata via BitDataHelper
 *
 * Phantom bits are visually dimmed versions of the main bit showing where the
 * conical V-Carve bit will be positioned at each cutting pass. They only appear
 * for V-Carve operations; standard operations (AL, OU, IN) don't have phantoms.
 *
 * @returns {void} - Updates DOM by adding phantom bit groups to phantoms layer
 * @see PhantomBitCalculator for detailed algorithm and multi-pass calculation
 *
 * @example
 * // Called whenever V-Carve operation bits are added/modified
 * updatePhantomBits();
 * // Result: Dimmed phantom bits appear showing each cutting pass depth
 */
function updatePhantomBits() {
    if (!phantomBitCalculator || !mainCanvasManager) return;
    const phantomsLayer = mainCanvasManager.getLayer("phantoms");
    const anchorCoords = getPanelAnchorCoords();

    phantomBitCalculator.updatePhantoms({
        bitsOnCanvas,
        phantomsLayer,
        anchorCoords,
    });

    updateBitExtensions();
    updatePocketWidthInputs(); // Update PO pocket width inputs
}

/**
 * Update pocket width input fields for PO operations
 * Shows interactive inputs between main and phantom bits when selected
 */
function updatePocketWidthInputs() {
    if (!extensionCalculator || !mainCanvasManager) return;
    const overlayLayer = mainCanvasManager.getLayer("overlay");
    if (!overlayLayer) return;

    // Показать инпуты не только для выбранных, но и для перетаскиваемого фантома
    let selected = selectionManager.getSelectedIndices();
    if (
        typeof window !== "undefined" &&
        window.draggedPhantomIndex !== null &&
        window.draggedPhantomIndex !== undefined
    ) {
        selected = Array.from(
            new Set([...selected, window.draggedPhantomIndex])
        );
    }

    extensionCalculator.updatePocketInputs({
        bitsOnCanvas,
        selectedIndices: selected,
        overlayLayer,
        onPocketOffsetChange: handlePocketOffsetChange,
    });
}

/**
 * Handle pocket offset change from input
 * @param {number} index - Bit index
 * @param {number} newPocketOffset - New pocket offset value
 * @param {boolean} isZeroWidth - Whether pocket width was set to 0 (full material removal)
 */
function handlePocketOffsetChange(index, newPocketOffset, isZeroWidth = false) {
    const bit = bitsOnCanvas[index];
    if (!bit || bit.operation !== "PO") return;

    // If zero width requested, calculate pocketOffset to fill entire panel width
    if (isZeroWidth) {
        // pocketOffset = panelWidth - bit.x * 2
        // This makes the phantom bit reach the opposite edge of the panel
        const calculatedOffset = panelWidth - bit.x * 2;
        bit.pocketOffset = Math.max(0, calculatedOffset); // Ensure non-negative
        bit.isFullRemoval = true; // Mark for special handling
        log.info(
            `[PO] Bit ${index}: Auto-calculated pocketOffset = ${bit.pocketOffset.toFixed(
                2
            )}mm (full removal mode)`
        );
    } else {
        bit.pocketOffset = newPocketOffset;
        bit.isFullRemoval = false;
    }

    // Update visuals
    updateOffsetContours();
    updatePhantomBits();
    updateBitsSheet();

    // Update 2D boolean operations if part is shown
    if (showPart) {
        updatePartShape();
    }

    if (window.threeModule) {
        updateThreeView();
        if (showPart) {
            window.threeModule.showBasePanel();
            csgScheduler.schedule(true);
        }
    }
}

// Update offset contours for all bits
/**
 * Calculates and renders offset contours for all bits using Paper.js offset algorithm.
 *
 * This is the core function for displaying tool paths. It:
 * - Calculates offset paths for each bit based on operation type (AL, OU, IN, VC)
 * - Renders offset contours as dashed SVG paths on the offsets layer
 * - Stores offset data globally for 3D rendering (ThreeModule)
 * - Handles V-Carve multi-pass offset calculation
 *
 * **Offset Calculation:**
 * - AL (Align): offset = bit.x (no additional offset)
 * - OU (Outside): offset = bit.x + diameter/2 (outward offset)
 * - IN (Inside): offset = bit.x - diameter/2 (inward offset)
 * - VC (V-Carve): multiple offsets for each cutting pass + work offset
 *
 * **V-Carve Algorithm:**
 * 1. Calculate bit height: height = (diameter/2) / tan(angle/2)
 * 2. Calculate passes: passes = ceil(bit.y / height)
 * 3. For pass 0 to passes-1:
 *    - depth = (passes - pass) × bit.y / passes
 *    - offset = bit.x - depth × tan(angle/2)
 * 4. Work offset (display only): offset from full depth = bit.x - bit.y × tan(angle/2)
 * 5. Guard: if work offset distance ≈ 0, use original partFront path (avoids Paper.js error)
 *
 * **2D Display:**
 * - Base offset (pass 0): black dashed, always displayed
 * - Intermediate passes (1+): stored but not displayed
 * - Work offset: colored dashed, always displayed (if exists)
 * - Standard operations: single offset displayed
 *
 * **3D Rendering (ThreeModule):**
 * - Uses intermediate passes ONLY (all offset contours with pass 0 to passes-1)
 * - Excludes work offset (prevents duplicate geometry in 3D)
 * - Creates 3D geometry at each intermediate depth
 *
 * **DXF Export:**
 * - Includes base offset + work offset only (filters by isWorkOffset flag)
 * - Ignores intermediate passes (VC specific)
 * - Combines standard operations + VC offsets
 *
 * @returns {void} - Modifies DOM and global offsetContours array
 * @see window.offsetContours - Global array used by ThreeModule for 3D rendering
 * @see ExportModule.exportDXF() - Uses offsetContours with isWorkOffset filter
 *
 * @example
 * // Before: offsetContours = []
 * // After calling updateOffsetContours():
 * // - offsetsLayer updated with colored dashed paths
 * // - offsetContours filled with 10+ entries (3 bits, VC has 3 passes each)
 * // - Window.offsetContours accessible for 3D rendering
 * updateOffsetContours();
 */
function updateOffsetContours() {
    if (!appState.is2DActive()) {
        log.debug("Skip updateOffsetContours: 2D inactive");
        return;
    }
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

    // Create Paper.js offset calculator with arc approximation enabled for consistency with DXF export
    const offsetCalculator = new PaperOffsetCalculator({
        useArcApproximation: true, // Enable Bezier → Arc approximation
        arcTolerance: ARC_APPROX_TOLERANCE, // RMS tolerance (same as DXF export)
        exportModule: exportModule, // For parseSVGPathSegments and optimizeSegmentsToArcs
    });

    // Make offsetCalculator and helper functions available globally for ThreeModule
    window.offsetCalculator = offsetCalculator;
    window.convertToTopAnchorCoordinates = convertToTopAnchorCoordinates;

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

            // Create contours for ALL passes (for 3D rendering)
            // Plus base offset and work offset (for 2D display and DXF export)
            for (let passIndex = 0; passIndex < passes; passIndex++) {
                // Calculate offset distance for this pass
                // Use reverse indexing to go from innermost to outermost (right to left)
                const offsetDistance =
                    passIndex === 0
                        ? topAnchorCoords.x // Pass 0: base offset
                        : offsets[offsets.length - passIndex]; // Pass 1+: reverse order

                // Calculate offset contour using Paper.js (preserves Bezier curves)
                const offsetData = offsetCalculator.calculateOffsetFromSVG(
                    partFront,
                    offsetDistance
                );

                if (offsetData) {
                    const pathData =
                        typeof offsetData === "string" ? offsetData : "";

                    const offsetContour = document.createElementNS(
                        svgNS,
                        "path"
                    );
                    offsetContour.setAttribute("d", pathData);
                    offsetContour.setAttribute("fill", "none");

                    // Only display pass 0 (base offset - black) in 2D
                    // Other passes stored for 3D but not displayed
                    if (passIndex === 0) {
                        offsetContour.setAttribute("stroke", "black");
                        offsetContour.setAttribute(
                            "stroke-width",
                            getAdaptiveStrokeWidth()
                        );
                        offsetContour.setAttribute("stroke-dasharray", "5,5");
                        offsetContour.classList.add("offset-contour");
                        offsetsLayer.appendChild(offsetContour);
                    }
                    // Pass 1+ not displayed in 2D (only for 3D)

                    // Store in offsetContours for 3D (all intermediate passes)
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
                        isWorkOffset: false, // Not a work offset
                    });
                }
            }

            // Calculate WORK OFFSET - innermost contour from full bit depth
            // For 2D display and DXF export only (not used in 3D)
            const workOffsetValue = bitY * Math.tan(angleToRad(angle / 2));
            const workOffsetDistance = topAnchorCoords.x - workOffsetValue;
            log.debug(
                `[VC] Bit ${index} work offset distance: ${workOffsetDistance.toFixed(
                    3
                )} mm`,
                workOffsetValue
            );
            // Check if work offset equals original contour (offset ≈ 0)
            // In this case, return original partFront path instead of calculating offset
            const isZeroOffset =
                Math.abs(workOffsetDistance) < ARC_RADIUS_TOLERANCE; // tolerance

            let workOffsetData;
            if (isZeroOffset) {
                // Work offset coincides with original contour - use partFront path directly
                workOffsetData = partFront.getAttribute("d");
                log.debug(
                    `[VC] Work offset = 0, using original partFront contour`
                );
            } else {
                // Use Paper.js direct SVG import to preserve Bezier curves
                workOffsetData = offsetCalculator.calculateOffsetFromSVG(
                    partFront,
                    workOffsetDistance
                );
            }

            if (workOffsetData) {
                const workPathData =
                    typeof workOffsetData === "string" ? workOffsetData : "";

                const workOffsetContour = document.createElementNS(
                    svgNS,
                    "path"
                );
                workOffsetContour.setAttribute("d", workPathData);
                workOffsetContour.setAttribute("fill", "none");
                workOffsetContour.setAttribute(
                    "stroke",
                    bit.color || "#cccccc"
                );
                workOffsetContour.setAttribute(
                    "stroke-width",
                    getAdaptiveStrokeWidth()
                );
                workOffsetContour.setAttribute("stroke-dasharray", "5,5");
                workOffsetContour.classList.add("offset-contour");
                offsetsLayer.appendChild(workOffsetContour);

                // Store work offset at the END of offsetContours array
                // Mark as work offset for DXF export and 3D filtering
                offsetContours.push({
                    element: workOffsetContour,
                    bitIndex: index,
                    offsetDistance: workOffsetDistance,
                    operation: "VC",
                    pass: passes, // Work offset is after all passes
                    passIndex: passes,
                    pathData: workPathData,
                    depth: bitY, // Full depth
                    isWorkOffset: true, // Flag for DXF export and 3D filtering
                });
            }

            // Log contour creation summary
            const workOffsetMsg = isZeroOffset
                ? " + 1 work offset (equals original contour)"
                : " + 1 work offset";
            log.info(
                `[VC] Created ${passes} intermediate contours${workOffsetMsg} for bit ${index} (displayed: base + work, 3D uses: intermediate only)`
            );
        } else if (bit.operation === "PO") {
            // PO (Pocketing) operation: two offsets (main bit left edge, phantom bit right edge)
            const diameter = bit.bitData.diameter || 10;
            const pocketOffset = bit.pocketOffset || 0;
            const pocketWidth = diameter + pocketOffset;

            // Main bit offset: from center at -diameter/2 (left edge)
            const mainOffsetDistance = bit.x - diameter / 2;

            // Create offsets for PO operation
            {
                const mainOffsetData = offsetCalculator.calculateOffsetFromSVG(
                    partFront,
                    mainOffsetDistance
                );

                if (mainOffsetData) {
                    const mainPathData =
                        typeof mainOffsetData === "string"
                            ? mainOffsetData
                            : "";

                    const mainOffsetContour = document.createElementNS(
                        svgNS,
                        "path"
                    );
                    mainOffsetContour.setAttribute("d", mainPathData);
                    mainOffsetContour.setAttribute("fill", "none");
                    mainOffsetContour.setAttribute(
                        "stroke",
                        bit.color || "#cccccc"
                    );
                    mainOffsetContour.setAttribute(
                        "stroke-width",
                        getAdaptiveStrokeWidth()
                    );
                    mainOffsetContour.setAttribute("stroke-dasharray", "5,5");
                    mainOffsetContour.classList.add("offset-contour");
                    mainOffsetContour.classList.add("offset-contour-po-main");
                    offsetsLayer.appendChild(mainOffsetContour);

                    offsetContours.push({
                        element: mainOffsetContour,
                        bitIndex: index,
                        offsetDistance: mainOffsetDistance,
                        operation: "PO",
                        isPOMain: true,
                        pathData: mainPathData,
                    });
                }
            }

            // Phantom bit offset: only create if pocketOffset > 0 and not in full removal mode
            const isFullRemoval = bit.isFullRemoval || pocketOffset === 0;

            if (pocketOffset > 0 && !isFullRemoval) {
                // Phantom center is at: bit.x + pocketOffset
                const phantomCenterX = bit.x + pocketOffset;
                const phantomOffsetDistance = phantomCenterX + diameter / 2;
                const phantomOffsetData =
                    offsetCalculator.calculateOffsetFromSVG(
                        partFront,
                        phantomOffsetDistance
                    );

                if (phantomOffsetData) {
                    const phantomPathData =
                        typeof phantomOffsetData === "string"
                            ? phantomOffsetData
                            : "";

                    const phantomOffsetContour = document.createElementNS(
                        svgNS,
                        "path"
                    );
                    phantomOffsetContour.setAttribute("d", phantomPathData);
                    phantomOffsetContour.setAttribute("fill", "none");
                    phantomOffsetContour.setAttribute(
                        "stroke",
                        bit.color || "#cccccc"
                    );
                    phantomOffsetContour.setAttribute(
                        "stroke-width",
                        getAdaptiveStrokeWidth()
                    );
                    phantomOffsetContour.setAttribute(
                        "stroke-dasharray",
                        "5,5"
                    );
                    phantomOffsetContour.classList.add("offset-contour");
                    phantomOffsetContour.classList.add(
                        "offset-contour-po-phantom"
                    );
                    offsetsLayer.appendChild(phantomOffsetContour);

                    offsetContours.push({
                        element: phantomOffsetContour,
                        bitIndex: index,
                        offsetDistance: phantomOffsetDistance,
                        operation: "PO",
                        isPOPhantom: true,
                        pathData: phantomPathData,
                    });
                }

                // Log message for phantom created
                log.info(
                    `[PO] Created 2 offset contours for bit ${index}: main at ${mainOffsetDistance.toFixed(
                        2
                    )}mm, phantom at ${phantomOffsetDistance.toFixed(2)}mm`
                );
            } else {
                // Log message for no phantom (pocketOffset = 0 or full removal mode)
                const reason = isFullRemoval
                    ? "full removal mode"
                    : "pocketOffset = 0";
                log.info(
                    `[PO] Created 1 offset contour for bit ${index}: main at ${mainOffsetDistance.toFixed(
                        2
                    )}mm (phantom skipped: ${reason})`
                );
            }
        } else {
            // Standard operations: AL, OU, IN
            let offsetDistance = bit.x;
            if (bit.operation === "OU") {
                offsetDistance = bit.x + (bit.bitData.diameter || 0) / 2;
            } else if (bit.operation === "IN") {
                offsetDistance = bit.x - (bit.bitData.diameter || 0) / 2;
            }
            // AL uses bit.x as is

            // Use Paper.js offset calculator (preserves Bezier curves)
            const offsetData = offsetCalculator.calculateOffsetFromSVG(
                partFront,
                offsetDistance
            );

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
                    operation: bit.operation,
                });

                // For OU/IN operations: create additional centered contour for 3D rendering
                // (3D should use center path like AL, not offset path)
                if (bit.operation === "OU" || bit.operation === "IN") {
                    const centerOffsetDistance = bit.x; // Always use center for 3D
                    const centerOffsetData =
                        offsetCalculator.calculateOffsetFromSVG(
                            partFront,
                            centerOffsetDistance
                        );

                    if (centerOffsetData) {
                        const centerPathData =
                            typeof centerOffsetData === "string"
                                ? centerOffsetData
                                : "";

                        // Create invisible element (not added to DOM)
                        const centerContour = document.createElementNS(
                            svgNS,
                            "path"
                        );
                        centerContour.setAttribute("d", centerPathData);
                        centerContour.setAttribute("fill", "none");

                        // Add to offsetContours with flag for 3D use
                        offsetContours.push({
                            element: centerContour,
                            bitIndex: index,
                            offsetDistance: centerOffsetDistance,
                            operation: bit.operation,
                            for3D: true, // Flag: use this contour for 3D rendering
                            pathData: centerPathData,
                        });
                    }
                }
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
                        newBitShape.setAttribute(
                            "stroke-width",
                            getAdaptiveStrokeWidth()
                        );
                    }
                    if (newShankShape) {
                        newShankShape.setAttribute("stroke", "#00BFFF");
                        newShankShape.setAttribute(
                            "stroke-width",
                            getAdaptiveStrokeWidth()
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
    updatePanelParams();
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

    bitRegistry.counter++;

    const x = centerX - panelX;
    const y = centerY - panelY;

    const newBit = {
        number: bitRegistry.counter,
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
        pocketOffset: 0, // Initialize pocketOffset for PO operations
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
        bitsTableManager.render(
            bitsOnCanvas,
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

    // Update 2D boolean operations if part is shown
    if (showPart) {
        updatePartShape();
    }

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
    updatePocketWidthInputs(); // Update PO pocket width inputs when selection changes
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
        // If in Part view, trigger CSG recalculation
        if (showPart) {
            window.threeModule.showBasePanel();
            csgScheduler.schedule(true);
        }
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
    updatePanelParams();
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

    // Recalculate pocket offset for PO bits in full removal mode when position changes
    if (bit.operation === "PO" && bit.isFullRemoval) {
        const calculatedOffset = panelWidth - bit.x * 2;
        bit.pocketOffset = Math.max(0, calculatedOffset);
        log.debug(
            `[PO] Auto-recalculated pocketOffset for bit ${index}: ${bit.pocketOffset.toFixed(
                2
            )}mm (bit moved via table)`
        );
    }

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
        horizontal.setAttribute("stroke-width", getAdaptiveStrokeWidth());
        anchorPoint.appendChild(horizontal);

        const vertical = document.createElementNS(svgNS, "line");
        vertical.setAttribute("x1", anchorX);
        vertical.setAttribute("y1", anchorY - crossSize);
        vertical.setAttribute("x2", anchorX);
        vertical.setAttribute("y2", anchorY + crossSize);
        vertical.setAttribute("stroke", "red");
        vertical.setAttribute("stroke-width", getAdaptiveStrokeWidth());
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
    return Math.max(
        DEFAULT_STROKE_MIN,
        DEFAULT_STROKE_BASE / Math.sqrt(zoomLevel)
    );
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
function getPanelAnchorOffset() {
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
    const offset = getPanelAnchorOffset();
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

    // **PHASE 2 REFACTORING** - Use BooleanOperationStrategy for boolean operations
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

    // Use BooleanOperationStrategy to calculate result polygon
    // Pass panel dimensions in options for maker.js engine
    const result = booleanOperationStrategy.calculateResultPolygon(
        panelSection,
        bitsOnCanvas,
        phantomBits,
        {
            panelWidth: panelWidth,
            panelThickness: panelThickness,
            panelX: panelX,
            panelY: panelY,
        }
    );

    partPath.setAttribute("d", result.d);

    // Apply engine-specific transforms
    booleanOperationStrategy.applyPathTransform(
        partPath,
        result.engineType,
        panelX,
        panelY
    );

    return partPath;
}

// Toggle bits visibility
function toggleBitsVisibility() {
    bitsVisible = !bitsVisible;
    window.bitsVisible = bitsVisible; // Update window reference

    // **PHASE 1 REFACTORING** - Sync with appConfig
    appConfig.ui.bitsVisible = bitsVisible;

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

    // **PHASE 1 REFACTORING** - Sync with appConfig
    appConfig.ui.shankVisible = shankVisible;

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

    // **PHASE 1 REFACTORING** - Sync with appConfig
    appConfig.ui.showPart = showPart;

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
    panelWidthInput.addEventListener("input", updatePanelParams);
    panelHeightInput.addEventListener("input", updatePanelParams);
    panelThicknessInput.addEventListener("input", updatePanelParams);

    // Add math evaluation on blur
    panelWidthInput.addEventListener("blur", () => {
        panelWidthInput.value = evaluateMathExpression(panelWidthInput.value);
        updatePanelParams();
    });
    panelHeightInput.addEventListener("blur", () => {
        panelHeightInput.value = evaluateMathExpression(panelHeightInput.value);
        updatePanelParams();
    });
    panelThicknessInput.addEventListener("blur", () => {
        panelThicknessInput.value = evaluateMathExpression(
            panelThicknessInput.value
        );
        updatePanelParams();
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

    log.debug("DXF export partPath", partPath);

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

        log.info("DXF export completed. File downloaded.");
        logOperation("DXF export completed successfully");
    } catch (error) {
        log.error("Failed to export DXF:", error);
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
        pocketOffset: bit.pocketOffset || 0, // Save pocketOffset for PO operations
        isFullRemoval: bit.isFullRemoval || false, // Save isFullRemoval flag for PO operations
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
        pocketOffset: bit.pocketOffset || 0, // Save pocketOffset for PO operations
        isFullRemoval: bit.isFullRemoval || false, // Save isFullRemoval flag for PO operations
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

                bitRegistry.counter++;

                // Ensure operation is valid for the group
                const validOperations = getOperationsForGroup(groupName);
                let operation = pos.operation || "AL";
                if (!validOperations.includes(operation)) {
                    operation = "AL"; // Fallback to default
                }

                const newBit = {
                    number: bitRegistry.counter,
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
                    pocketOffset: pos.pocketOffset || 0, // Restore pocketOffset for PO operations
                    isFullRemoval: pos.isFullRemoval || false, // Restore isFullRemoval flag for PO operations
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
    bitRegistry.counter = 0;

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
        updatePanelShape();
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

        // Map UI view to appState viewMode (2dp and 2d-2dp map to 2d for gating)
        const mode = view === "3d" ? "3d" : view === "both" ? "both" : "2d";
        appState.setViewMode(mode);

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
            updateThreeView().then(() => {
                // If Part view was active in 2D, apply CSG in 3D
                if (showPart) {
                    log.debug("Part view active, scheduling CSG");
                    csgScheduler.schedule(true);
                }
            });
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
                updatePanelShape();
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
    appState.setViewMode("2d");
    updateActiveButton(view2DBtn);
}

// Function to update Three.js view with current panel and bits data
async function updateThreeView() {
    const threeModule = window.threeModule;
    if (!threeModule) return;
    if (!appState.is3DActive()) {
        log.debug("Skip updateThreeView: 3D inactive");
        return;
    }

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

    log.info("Syncing SVG → Paper.js...");

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

        log.info("SVG → Paper.js sync complete");
    } catch (error) {
        log.error("Failed to sync SVG to Paper.js:", error);
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

log.info(
    "%c[Bit Logger] Helper functions available:",
    "color: #4CAF50; font-weight: bold;"
);
log.info("  window.getBitLogs().all() - Get all logs");
log.info("  window.getBitLogs().bitEvents() - Get all bit events");
log.info("  window.getBitLogs().forBit(index) - Get events for specific bit");
log.info("  window.getBitLogs().extensions() - Get all extension events");
log.info("  window.getBitLogs().collisions() - Get all collision events");
log.info("  window.getBitLogs().extrusions() - Get all 3D extrusion events");
log.info("  window.getBitLogs().export() - Export events as JSON");
log.info("  window.getBitLogs().clear() - Clear all bit events");

// Call initialize function when the page loads
window.addEventListener("load", initializeModularSystem);
