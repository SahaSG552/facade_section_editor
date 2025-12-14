import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
import "./styles/main.css";

// Make mathjs globally available (for backward compatibility)
import { create, all } from "mathjs";
const mathjs = create(all);
window.math = mathjs;

// Load ClipperLib
import "./utils/clipper-polyfill";

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode>
);
