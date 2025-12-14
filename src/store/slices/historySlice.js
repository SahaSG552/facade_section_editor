import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // History stack for undo/redo
    past: [],
    present: null,
    future: [],

    // History settings
    maxHistorySize: 50,
    enabled: true,
};

const historySlice = createSlice({
    name: "history",
    initialState,
    reducers: {
        // Initialize history with initial state
        initHistory: (state, action) => {
            state.present = action.payload;
        },

        // Save current state to history
        saveState: (state, action) => {
            if (!state.enabled) return;

            const newState = action.payload;

            // Move current present to past
            if (state.present !== null) {
                state.past.push(state.present);
            }

            // Set new present
            state.present = newState;

            // Clear future (when doing new action after undo)
            state.future = [];

            // Limit history size
            if (state.past.length > state.maxHistorySize) {
                state.past = state.past.slice(-state.maxHistorySize);
            }
        },

        // Undo action
        undo: (state) => {
            if (state.past.length > 0) {
                const previous = state.past[state.past.length - 1];
                const newPast = state.past.slice(0, -1);

                state.future.unshift(state.present);
                state.present = previous;
                state.past = newPast;
            }
        },

        // Redo action
        redo: (state) => {
            if (state.future.length > 0) {
                const next = state.future[0];
                const newFuture = state.future.slice(1);

                state.past.push(state.present);
                state.present = next;
                state.future = newFuture;
            }
        },

        // Check if can undo
        canUndo: (state) => state.past.length > 0,

        // Check if can redo
        canRedo: (state) => state.future.length > 0,

        // Clear history
        clearHistory: (state) => {
            state.past = [];
            state.present = null;
            state.future = [];
        },

        // Set history enabled/disabled
        setHistoryEnabled: (state, action) => {
            state.enabled = action.payload;
        },

        // Set max history size
        setMaxHistorySize: (state, action) => {
            state.maxHistorySize = action.payload;

            // Trim history if needed
            if (state.past.length > state.maxHistorySize) {
                state.past = state.past.slice(-state.maxHistorySize);
            }
        },

        // Reset history state
        resetHistoryState: () => initialState,
    },
});

export const {
    initHistory,
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    setHistoryEnabled,
    setMaxHistorySize,
    resetHistoryState,
} = historySlice.actions;

export default historySlice.reducer;
