import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // UI preferences
    theme: "light", // 'light' or 'dark'
    language: "en",

    // Canvas settings
    snapToGrid: true,
    showGrid: true,
    gridSize: 1,

    // Keyboard shortcuts
    keyboardShortcuts: {
        undo: "Ctrl+Z",
        redo: "Ctrl+Y",
        save: "Ctrl+S",
        zoomIn: "Ctrl+=",
        zoomOut: "Ctrl+-",
        fitToScale: "Ctrl+0",
        toggleGrid: "Ctrl+G",
        delete: "Delete",
    },

    // Export settings
    exportFormat: "dxf", // 'dxf', 'svg', 'png'
    exportQuality: "high", // 'low', 'medium', 'high'

    // Collaboration settings
    collaborationEnabled: false,
    realTimeSync: false,

    // Performance settings
    maxUndoSteps: 50,
    autoSaveInterval: 30000, // 30 seconds
};

const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        // Theme settings
        setTheme: (state, action) => {
            state.theme = action.payload;
        },

        // Language settings
        setLanguage: (state, action) => {
            state.language = action.payload;
        },

        // Canvas settings
        setSnapToGrid: (state, action) => {
            state.snapToGrid = action.payload;
        },

        setShowGrid: (state, action) => {
            state.showGrid = action.payload;
        },

        setGridSize: (state, action) => {
            state.gridSize = action.payload;
        },

        // Keyboard shortcuts
        updateKeyboardShortcut: (state, action) => {
            const { action: shortcutAction, key } = action.payload;
            state.keyboardShortcuts[shortcutAction] = key;
        },

        resetKeyboardShortcuts: (state) => {
            state.keyboardShortcuts = initialState.keyboardShortcuts;
        },

        // Export settings
        setExportFormat: (state, action) => {
            state.exportFormat = action.payload;
        },

        setExportQuality: (state, action) => {
            state.exportQuality = action.payload;
        },

        // Collaboration settings
        setCollaborationEnabled: (state, action) => {
            state.collaborationEnabled = action.payload;
        },

        setRealTimeSync: (state, action) => {
            state.realTimeSync = action.payload;
        },

        // Performance settings
        setMaxUndoSteps: (state, action) => {
            state.maxUndoSteps = action.payload;
        },

        setAutoSaveInterval: (state, action) => {
            state.autoSaveInterval = action.payload;
        },

        // Reset all settings
        resetSettings: () => initialState,

        // Load settings from storage
        loadSettings: (state, action) => {
            return { ...state, ...action.payload };
        },
    },
});

export const {
    setTheme,
    setLanguage,
    setSnapToGrid,
    setShowGrid,
    setGridSize,
    updateKeyboardShortcut,
    resetKeyboardShortcuts,
    setExportFormat,
    setExportQuality,
    setCollaborationEnabled,
    setRealTimeSync,
    setMaxUndoSteps,
    setAutoSaveInterval,
    resetSettings,
    loadSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
