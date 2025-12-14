import React, { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import CanvasManager from "../canvas/CanvasManager";
import { createBitShape } from "../utils/bitShapes";
import {
  setZoom,
  setPan,
  toggleGrid,
  setSelectedBits,
  clearSelection,
  setDragging,
  setPanning,
} from "../store/slices/canvasSlice";
import { addBitToCanvas } from "../store/slices/bitsSlice";
import { saveState } from "../store/slices/historySlice";

const Canvas = () => {
  const dispatch = useDispatch();
  const canvasRef = useRef(null);
  const canvasManagerRef = useRef(null);

  // Redux state
  const {
    canvas: canvasState,
    panel,
    view,
    ui: uiState,
  } = useSelector((state) => state.canvas);

  const { bitsOnCanvas } = useSelector((state) => state.bits);

  // Initialize canvas manager
  useEffect(() => {
    if (canvasRef.current && !canvasManagerRef.current) {
      canvasManagerRef.current = new CanvasManager({
        canvas: canvasRef.current,
        width: canvasState.width,
        height: canvasState.height,
        enableZoom: true,
        enablePan: true,
        enableGrid: canvasState.gridEnabled,
        enableMouseEvents: true,
        gridSize: canvasState.gridSize,
        gridAnchorX: canvasState.gridAnchorX,
        gridAnchorY: canvasState.gridAnchorY,
        initialZoom: canvasState.zoom,
        initialPanX: canvasState.panX,
        initialPanY: canvasState.panY,
        layers: ["grid", "panel", "offsets", "bits", "overlay"],
        onZoom: (zoomLevel, panX, panY) => {
          dispatch(setZoom(zoomLevel));
          dispatch(setPan({ panX, panY }));
        },
      });

      // Initialize panel elements
      initializePanelElements();
    }

    return () => {
      if (canvasManagerRef.current) {
        // Cleanup if needed
      }
    };
  }, []);

  // Initialize panel SVG elements
  const initializePanelElements = useCallback(() => {
    if (!canvasManagerRef.current) return;

    const panelLayer = canvasManagerRef.current.getLayer("panel");

    // Create panel rectangle
    const partSection = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    partSection.id = "part-section";
    partSection.setAttribute("x", (canvasState.width - panel.width) / 2);
    partSection.setAttribute("y", (canvasState.height - panel.thickness) / 2);
    partSection.setAttribute("width", panel.width);
    partSection.setAttribute("height", panel.thickness);
    partSection.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
    partSection.setAttribute("stroke", "black");
    partSection.setAttribute("stroke-width", "1");
    panelLayer.appendChild(partSection);

    // Create part front rectangle
    const partFront = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    partFront.id = "part-front";
    const panelX = (canvasState.width - panel.width) / 2;
    const panelY = (canvasState.height - panel.thickness) / 2;
    const anchorOffset = getPanelAnchorOffset();
    const anchorX = panelX + anchorOffset.x;
    const anchorY = panelY + anchorOffset.y;

    partFront.setAttribute("x", anchorX);
    partFront.setAttribute("y", anchorY - panel.height - 100); // 100mm gap above panel anchor
    partFront.setAttribute("width", panel.width);
    partFront.setAttribute("height", panel.height);
    partFront.setAttribute("fill", "rgba(155, 155, 155, 0.16)");
    partFront.setAttribute("stroke", "black");
    partFront.setAttribute("stroke-width", "1");
    panelLayer.appendChild(partFront);

    // Create panel anchor indicator
    const panelAnchorIndicator = document.createElementNS("http://www.w3.org/2000/svg", "g");
    panelAnchorIndicator.id = "panel-anchor-indicator";
    updatePanelAnchorIndicator(panelAnchorIndicator);
    panelLayer.appendChild(panelAnchorIndicator);

    // Create part path (initially hidden)
    const partPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    partPath.id = "part-path";
    partPath.setAttribute("fill", "rgba(71, 64, 64, 0.16)");
    partPath.setAttribute("stroke", "black");
    partPath.setAttribute("stroke-width", "1");
    partPath.style.display = view.showPart ? "block" : "none";
    panelLayer.appendChild(partPath);
  }, [canvasState, panel, view]);

  // Helper function to get panel anchor offset
  const getPanelAnchorOffset = useCallback(() => {
    return panel.anchor === "top-left"
      ? { x: 0, y: 0 }
      : { x: 0, y: panel.thickness };
  }, [panel]);

  // Update panel anchor indicator
  const updatePanelAnchorIndicator = useCallback((indicator) => {
    if (!indicator) return;

    indicator.innerHTML = ""; // Clear

    const panelX = (canvasState.width - panel.width) / 2;
    const panelY = (canvasState.height - panel.thickness) / 2;

    let anchorX, anchorY;
    if (panel.anchor === "top-left") {
      anchorX = panelX;
      anchorY = panelY;
    } else if (panel.anchor === "bottom-left") {
      anchorX = panelX;
      anchorY = panelY + panel.thickness;
    }

    // Draw a small cross
    const crossSize = 5;
    const thickness = Math.max(0.1, 0.5 / Math.sqrt(canvasState.zoom));

    const horizontal = document.createElementNS("http://www.w3.org/2000/svg", "line");
    horizontal.setAttribute("x1", anchorX - crossSize);
    horizontal.setAttribute("y1", anchorY);
    horizontal.setAttribute("x2", anchorX + crossSize);
    horizontal.setAttribute("y2", anchorY);
    horizontal.setAttribute("stroke", "red");
    horizontal.setAttribute("stroke-width", thickness);
    indicator.appendChild(horizontal);

    const vertical = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vertical.setAttribute("x1", anchorX);
    vertical.setAttribute("y1", anchorY - crossSize);
    vertical.setAttribute("x2", anchorX);
    vertical.setAttribute("y2", anchorY + crossSize);
    vertical.setAttribute("stroke", "red");
    vertical.setAttribute("stroke-width", thickness);
    indicator.appendChild(vertical);
  }, [canvasState, panel]);

  // Handle mouse events for bit interaction
  const handleMouseDown = useCallback((e) => {
    // Clear selection if clicking on empty area
    if (e.target === canvasRef.current) {
      dispatch(clearSelection());
    }
  }, [dispatch]);

  // Handle drag over for drop functionality
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // Handle drop for adding bits to canvas
  const handleDrop = useCallback((e) => {
    e.preventDefault();

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));

      if (data.type === "bit") {
        const { bit, groupName } = data;

        // Get drop position in SVG coordinates
        const rect = canvasRef.current.getBoundingClientRect();
        const svgCoords = canvasManagerRef.current.screenToSvg(e.clientX, e.clientY);

        // Calculate position relative to panel anchor
        const panelX = (canvasState.width - panel.width) / 2;
        const panelY = (canvasState.height - panel.thickness) / 2;
        const anchorOffset = getPanelAnchorOffset();
        const anchorX = panelX + anchorOffset.x;
        const anchorY = panelY + anchorOffset.y;

        const x = svgCoords.x - anchorX;
        const y = svgCoords.y - anchorY;

        // Add bit to canvas
        dispatch(addBitToCanvas({
          bitData: bit,
          groupName,
          x,
          y,
        }));

        // Save state to history
        dispatch(saveState({
          bits: { bitsOnCanvas: [...bitsOnCanvas, { bitData: bit, groupName, x, y }] },
          timestamp: Date.now(),
        }));

        console.log(`Added bit "${bit.name}" to canvas at (${x.toFixed(2)}, ${y.toFixed(2)})`);
      }
    } catch (error) {
      console.error("Failed to handle drop:", error);
    }
  }, [dispatch, canvasState, panel, getPanelAnchorOffset]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.zoomOut();
    }
  }, []);

  const handleFitToScale = useCallback(() => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current.fitToScale();
    }
  }, []);

  const handleZoomToSelected = useCallback(() => {
    // TODO: Implement zoom to selected bits
    console.log("Zoom to selected - TODO");
  }, []);

  const handleToggleGrid = useCallback(() => {
    dispatch(toggleGrid());
    if (canvasManagerRef.current) {
      canvasManagerRef.current.toggleGrid();
    }
  }, [dispatch]);

  // Update grid when grid state changes
  useEffect(() => {
    if (canvasManagerRef.current) {
      if (canvasState.gridEnabled) {
        canvasManagerRef.current.drawGrid();
      }
    }
  }, [canvasState.gridEnabled]);

  // Update bits rendering when bits change
  useEffect(() => {
    if (!canvasManagerRef.current) return;

    const bitsLayer = canvasManagerRef.current.getLayer("bits");
    if (!bitsLayer) return;

    // Clear existing bits
    bitsLayer.innerHTML = "";

    // Render each bit
    bitsOnCanvas.forEach((bit) => {
      renderBitOnCanvas(bit, bitsLayer);
    });
  }, [bitsOnCanvas, canvasState.zoom]);

  // Function to render a bit on canvas
  const renderBitOnCanvas = useCallback((bit, bitsLayer) => {
    const panelX = (canvasState.width - panel.width) / 2;
    const panelY = (canvasState.height - panel.thickness) / 2;
    const anchorOffset = getPanelAnchorOffset();
    const anchorX = panelX + anchorOffset.x;
    const anchorY = panelY + anchorOffset.y;

    // Calculate absolute position
    const absX = anchorX + bit.x;
    const absY = anchorY + bit.y;

    // Create bit group element
    const bitGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    bitGroup.setAttribute("class", "bit-group");
    bitGroup.setAttribute("data-bit-id", bit.id);

    // Create bit shape based on group
    const bitShape = createBitShape(bit.bitData, bit.groupName, absX, absY, bit.color);
    bitGroup.appendChild(bitShape);

    // Add anchor point indicator (only for selected bits)
    if (uiState.selectedBitIndices.includes(bit.number - 1)) {
      const anchorPoint = createAnchorPoint(absX, absY);
      bitGroup.appendChild(anchorPoint);
    }

    bitsLayer.appendChild(bitGroup);
  }, [canvasState, panel, uiState.selectedBitIndices, getPanelAnchorOffset]);

  // Create bit shape wrapper with zoom-dependent stroke width
  const createBitShapeWithZoom = useCallback((bitData, groupName, x, y, color) => {
    const strokeWidth = Math.max(0.1, 0.5 / Math.sqrt(canvasState.zoom));
    return createBitShape(bitData, groupName, x, y, color, strokeWidth);
  }, [canvasState.zoom]);

  // Function to create anchor point indicator
  const createAnchorPoint = useCallback((x, y) => {
    const anchorGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    anchorGroup.setAttribute("class", "anchor-point");

    const crossSize = 3;
    const thickness = Math.max(0.1, 0.5 / Math.sqrt(canvasState.zoom));

    const horizontal = document.createElementNS("http://www.w3.org/2000/svg", "line");
    horizontal.setAttribute("x1", x - crossSize);
    horizontal.setAttribute("y1", y);
    horizontal.setAttribute("x2", x + crossSize);
    horizontal.setAttribute("y2", y);
    horizontal.setAttribute("stroke", "red");
    horizontal.setAttribute("stroke-width", thickness);
    anchorGroup.appendChild(horizontal);

    const vertical = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vertical.setAttribute("x1", x);
    vertical.setAttribute("y1", y - crossSize);
    vertical.setAttribute("x2", x);
    vertical.setAttribute("y2", y + crossSize);
    vertical.setAttribute("stroke", "red");
    vertical.setAttribute("stroke-width", thickness);
    anchorGroup.appendChild(vertical);

    return anchorGroup;
  }, [canvasState.zoom]);

  return (
    <div className="canvas-container">
      <svg
        ref={canvasRef}
        id="canvas"
        width={canvasState.width}
        height={canvasState.height}
        onMouseDown={handleMouseDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Canvas layers will be populated by CanvasManager */}
      </svg>

      {/* Zoom Toolbar */}
      <div className="zoom-toolbar">
        <button onClick={handleZoomIn} title="Zoom In">+</button>
        <button onClick={handleZoomOut} title="Zoom Out">-</button>
        <button onClick={handleFitToScale} title="Fit to Scale">Fit</button>
        <button onClick={handleZoomToSelected} title="Zoom to Selected">Sel</button>
        <button onClick={() => {}} title="Show Part">Part</button>
        <button onClick={() => {}} title="Toggle Bits Visibility">Bits</button>
        <button onClick={() => {}} title="Export to DXF">DXF</button>
        <label htmlFor="grid-scale">
          Grid:
        </label>
        <input
          type="number"
          id="grid-scale"
          value={canvasState.gridSize}
          min="0.1"
          max="100"
          step="0.1"
          readOnly
        />
        <button onClick={handleToggleGrid} title="Toggle Grid">
          Grid
        </button>
      </div>
    </div>
  );
};

export default Canvas;
