import eventBus from "../core/eventBus.js";
import LoggerFactory from "../core/LoggerFactory.js";

/**
 * AppState centralizes shared UI/application state for the 2D canvas.
 * Emits events on changes via eventBus to decouple modules (Event Bus pattern).
 */
class AppState {
    constructor(initial = {}) {
        this.log = LoggerFactory.createLogger("AppState");
        this.state = {
            panelWidth: 400,
            panelHeight: 600,
            panelThickness: 19,
            panelAnchor: "top-left", // or "bottom-left"
            showPart: false,
            bitsVisible: true,
            shankVisible: true,
            gridSize: 1,
            isDraggingBit: false,
            ...initial,
        };
        this.log.info("Initialized", this.state);
    }

    /** Generic getter */
    get(key) {
        return this.state[key];
    }

    /** Generic setter with event emission */
    set(key, value) {
        if (this.state[key] === value) return;
        this.state[key] = value;
        eventBus.emit(`state:${key}Changed`, value, this.state);
        this.log.debug(`state changed: ${key} ->`, value);
    }

    // Convenience helpers
    setPanelSize(width, height) {
        this.set("panelWidth", width);
        this.set("panelHeight", height);
    }

    setPanelThickness(thickness) {
        this.set("panelThickness", thickness);
    }

    setPanelAnchor(anchor) {
        this.set("panelAnchor", anchor);
    }

    setShowPart(show) {
        this.set("showPart", show);
    }

    setBitsVisible(visible) {
        this.set("bitsVisible", visible);
    }

    setShankVisible(visible) {
        this.set("shankVisible", visible);
    }

    setGridSize(size) {
        this.set("gridSize", size);
    }

    setDraggingBit(isDragging) {
        this.set("isDraggingBit", isDragging);
    }
}

const appState = new AppState();
export default appState;
