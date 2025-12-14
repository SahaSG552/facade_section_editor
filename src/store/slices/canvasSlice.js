import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // Panel dimensions and properties
    panel: {
        width: 400,
        height: 600,
        thickness: 19,
        anchor: "top-left", // 'top-left' or 'bottom-left'
    },

    // Canvas settings
    canvas: {
        width: 800,
        height: 600,
        zoom: 1,
        panX: 400,
        panY: 300,
        gridSize: 1,
        gridEnabled: true,
        gridAnchorX: null,
        gridAnchorY: null,
    },

    // View settings
    view: {
        showPart: false,
        showBits: true,
        showOffsets: true,
        showAnchors: true,
    },

    // UI state
    ui: {
        selectedBitIndices: [],
        dragging: false,
        panning: false,
    },
};

const canvasSlice = createSlice({
    name: "canvas",
    initialState,
    reducers: {
        // Panel actions
        setPanelDimensions: (state, action) => {
            const { width, height, thickness } = action.payload;
            state.panel.width = width;
            state.panel.height = height;
            state.panel.thickness = thickness;
        },

        setPanelAnchor: (state, action) => {
            state.panel.anchor = action.payload;
        },

        // Canvas actions
        setCanvasSize: (state, action) => {
            const { width, height } = action.payload;
            state.canvas.width = width;
            state.canvas.height = height;
        },

        setZoom: (state, action) => {
            state.canvas.zoom = action.payload;
        },

        setPan: (state, action) => {
            const { panX, panY } = action.payload;
            state.canvas.panX = panX;
            state.canvas.panY = panY;
        },

        setGridSize: (state, action) => {
            state.canvas.gridSize = action.payload;
        },

        toggleGrid: (state) => {
            state.canvas.gridEnabled = !state.canvas.gridEnabled;
        },

        setGridAnchor: (state, action) => {
            const { gridAnchorX, gridAnchorY } = action.payload;
            state.canvas.gridAnchorX = gridAnchorX;
            state.canvas.gridAnchorY = gridAnchorY;
        },

        // View actions
        togglePartView: (state) => {
            state.view.showPart = !state.view.showPart;
        },

        toggleBitsVisibility: (state) => {
            state.view.showBits = !state.view.showBits;
        },

        toggleOffsetsVisibility: (state) => {
            state.view.showOffsets = !state.view.showOffsets;
        },

        toggleAnchorsVisibility: (state) => {
            state.view.showAnchors = !state.view.showAnchors;
        },

        // UI actions
        setSelectedBits: (state, action) => {
            state.ui.selectedBitIndices = action.payload;
        },

        addSelectedBit: (state, action) => {
            const index = action.payload;
            if (!state.ui.selectedBitIndices.includes(index)) {
                state.ui.selectedBitIndices.push(index);
            }
        },

        removeSelectedBit: (state, action) => {
            const index = action.payload;
            state.ui.selectedBitIndices = state.ui.selectedBitIndices.filter(
                (i) => i !== index
            );
        },

        clearSelection: (state) => {
            state.ui.selectedBitIndices = [];
        },

        setDragging: (state, action) => {
            state.ui.dragging = action.payload;
        },

        setPanning: (state, action) => {
            state.ui.panning = action.payload;
        },

        // Reset to defaults
        resetCanvasState: () => initialState,
    },
});

export const {
    setPanelDimensions,
    setPanelAnchor,
    setCanvasSize,
    setZoom,
    setPan,
    setGridSize,
    toggleGrid,
    setGridAnchor,
    togglePartView,
    toggleBitsVisibility,
    toggleOffsetsVisibility,
    toggleAnchorsVisibility,
    setSelectedBits,
    addSelectedBit,
    removeSelectedBit,
    clearSelection,
    setDragging,
    setPanning,
    resetCanvasState,
} = canvasSlice.actions;

export default canvasSlice.reducer;
