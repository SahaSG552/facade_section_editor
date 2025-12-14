import { configureStore } from "@reduxjs/toolkit";
import canvasReducer from "./slices/canvasSlice";
import bitsReducer from "./slices/bitsSlice";
import operationsReducer from "./slices/operationsSlice";
import settingsReducer from "./slices/settingsSlice";
import historyReducer from "./slices/historySlice";

export const store = configureStore({
    reducer: {
        canvas: canvasReducer,
        bits: bitsReducer,
        operations: operationsReducer,
        settings: settingsReducer,
        history: historyReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
            },
        }),
    devTools: process.env.NODE_ENV !== "production",
});
