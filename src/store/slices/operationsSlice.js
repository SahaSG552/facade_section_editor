import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // Current operations log
    operations: [],

    // Operation history for undo/redo
    history: [],
    historyIndex: -1,

    // Operation settings
    autoSave: true,
    lastSaveTime: null,
};

const operationsSlice = createSlice({
    name: "operations",
    initialState,
    reducers: {
        // Add operation to log
        addOperation: (state, action) => {
            const operation = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                ...action.payload,
            };
            state.operations.push(operation);

            // Keep only last 100 operations
            if (state.operations.length > 100) {
                state.operations = state.operations.slice(-100);
            }
        },

        // Clear operations log
        clearOperations: (state) => {
            state.operations = [];
        },

        // Save state to history (for undo/redo)
        saveToHistory: (state, action) => {
            const historyEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                state: action.payload,
            };

            // Remove any history after current index (when doing new action after undo)
            state.history = state.history.slice(0, state.historyIndex + 1);

            state.history.push(historyEntry);
            state.historyIndex = state.history.length - 1;

            // Keep only last 50 history entries
            if (state.history.length > 50) {
                state.history = state.history.slice(-50);
                state.historyIndex = state.history.length - 1;
            }
        },

        // Undo operation
        undo: (state) => {
            if (state.historyIndex > 0) {
                state.historyIndex--;
            }
        },

        // Redo operation
        redo: (state) => {
            if (state.historyIndex < state.history.length - 1) {
                state.historyIndex++;
            }
        },

        // Can undo
        canUndo: (state) => state.historyIndex > 0,

        // Can redo
        canRedo: (state) => state.historyIndex < state.history.length - 1,

        // Clear history
        clearHistory: (state) => {
            state.history = [];
            state.historyIndex = -1;
        },

        // Set auto save
        setAutoSave: (state, action) => {
            state.autoSave = action.payload;
        },

        // Update last save time
        updateLastSaveTime: (state) => {
            state.lastSaveTime = new Date().toISOString();
        },

        // Reset operations state
        resetOperationsState: () => initialState,
    },
});

export const {
    addOperation,
    clearOperations,
    saveToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    setAutoSave,
    updateLastSaveTime,
    resetOperationsState,
} = operationsSlice.actions;

export default operationsSlice.reducer;
