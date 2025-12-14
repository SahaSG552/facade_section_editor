import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

const initialState = {
    // All available bits from database
    availableBits: {},

    // Bits currently placed on canvas
    bitsOnCanvas: [],

    // Bit counter for numbering
    bitCounter: 0,

    // Loading states
    loading: false,
    error: null,
};

const bitsSlice = createSlice({
    name: "bits",
    initialState,
    reducers: {
        // Load available bits
        setAvailableBits: (state, action) => {
            state.availableBits = action.payload;
        },

        // Add bit to canvas
        addBitToCanvas: (state, action) => {
            const {
                bitData,
                groupName,
                x = 0,
                y = 0,
                alignment = "center",
                operation = "AL",
            } = action.payload;

            const newBit = {
                id: uuidv4(),
                number: ++state.bitCounter,
                name: bitData.name,
                x,
                y,
                alignment,
                operation,
                color: bitData.fillColor || "#cccccc",
                bitData,
                groupName,
                // Canvas-specific properties
                baseAbsX: 0,
                baseAbsY: 0,
            };

            state.bitsOnCanvas.push(newBit);
        },

        // Remove bit from canvas
        removeBitFromCanvas: (state, action) => {
            const index = action.payload;
            if (index >= 0 && index < state.bitsOnCanvas.length) {
                state.bitsOnCanvas.splice(index, 1);
                // Renumber remaining bits
                state.bitsOnCanvas.forEach((bit, i) => {
                    bit.number = i + 1;
                });
            }
        },

        // Update bit position
        updateBitPosition: (state, action) => {
            const { index, x, y } = action.payload;
            if (index >= 0 && index < state.bitsOnCanvas.length) {
                state.bitsOnCanvas[index].x = x;
                state.bitsOnCanvas[index].y = y;
            }
        },

        // Update bit properties
        updateBitProperties: (state, action) => {
            const { index, properties } = action.payload;
            if (index >= 0 && index < state.bitsOnCanvas.length) {
                Object.assign(state.bitsOnCanvas[index], properties);
            }
        },

        // Update bit alignment
        updateBitAlignment: (state, action) => {
            const { index, alignment } = action.payload;
            if (index >= 0 && index < state.bitsOnCanvas.length) {
                state.bitsOnCanvas[index].alignment = alignment;
            }
        },

        // Update bit operation
        updateBitOperation: (state, action) => {
            const { index, operation } = action.payload;
            if (index >= 0 && index < state.bitsOnCanvas.length) {
                state.bitsOnCanvas[index].operation = operation;
            }
        },

        // Update bit color
        updateBitColor: (state, action) => {
            const { index, color } = action.payload;
            if (index >= 0 && index < state.bitsOnCanvas.length) {
                state.bitsOnCanvas[index].color = color;
            }
        },

        // Move bit in order (drag and drop in table)
        moveBit: (state, action) => {
            const { fromIndex, toIndex } = action.payload;
            if (
                fromIndex >= 0 &&
                fromIndex < state.bitsOnCanvas.length &&
                toIndex >= 0 &&
                toIndex < state.bitsOnCanvas.length
            ) {
                const [movedBit] = state.bitsOnCanvas.splice(fromIndex, 1);
                state.bitsOnCanvas.splice(toIndex, 0, movedBit);

                // Renumber bits
                state.bitsOnCanvas.forEach((bit, i) => {
                    bit.number = i + 1;
                });
            }
        },

        // Clear all bits from canvas
        clearAllBits: (state) => {
            state.bitsOnCanvas = [];
            state.bitCounter = 0;
        },

        // Load bits from saved data
        loadBitsFromData: (state, action) => {
            const savedData = action.payload;
            state.bitsOnCanvas = savedData.map((item, index) => ({
                id: uuidv4(),
                number: index + 1,
                ...item,
                bitData:
                    item.bitData ||
                    state.availableBits[item.groupName]?.find(
                        (b) => b.id === item.id
                    ),
            }));
            state.bitCounter = savedData.length;
        },

        // Update available bit data (when bit is edited)
        updateAvailableBit: (state, action) => {
            const { groupName, bitId, updatedBit } = action.payload;
            if (state.availableBits[groupName]) {
                const index = state.availableBits[groupName].findIndex(
                    (b) => b.id === bitId
                );
                if (index !== -1) {
                    state.availableBits[groupName][index] = updatedBit;

                    // Update canvas bits that use this bit data
                    state.bitsOnCanvas.forEach((canvasBit) => {
                        if (canvasBit.bitData.id === bitId) {
                            canvasBit.bitData = updatedBit;
                            canvasBit.name = updatedBit.name;
                        }
                    });
                }
            }
        },

        // Set loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
        },

        // Set error state
        setError: (state, action) => {
            state.error = action.payload;
        },

        // Reset state
        resetBitsState: () => initialState,
    },
});

export const {
    setAvailableBits,
    addBitToCanvas,
    removeBitFromCanvas,
    updateBitPosition,
    updateBitProperties,
    updateBitAlignment,
    updateBitOperation,
    updateBitColor,
    moveBit,
    clearAllBits,
    loadBitsFromData,
    updateAvailableBit,
    setLoading,
    setError,
    resetBitsState,
} = bitsSlice.actions;

export default bitsSlice.reducer;
