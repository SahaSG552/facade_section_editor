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
            viewMode: "both", // "2d" | "3d" | "both"

            // Mesh repair telemetry
            meshRepairStats: {
                totalRepairs: 0,
                postExtrusionRepairs: 0,
                preCSGRepairs: 0,
                exportValidations: 0,
                lastRepair: null, // { timestamp, stage, stats }
                cumulativeStats: {
                    verticesMerged: 0,
                    trianglesRemoved: 0,
                    shortEdgesRemoved: 0,
                    nonManifoldEdgesFixed: 0,
                },
            },

            ...initial,
        };
        if (LoggerFactory.setModeLevels) {
            LoggerFactory.setModeLevels(this.state.viewMode);
        }
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

    setViewMode(mode) {
        const allowed = ["2d", "3d", "both"];
        if (!allowed.includes(mode)) {
            this.log.warn("Invalid viewMode", mode);
            return;
        }
        if (this.state.viewMode === mode) return;
        this.state.viewMode = mode;
        eventBus.emit("mode:changed", mode);
        this.log.info(`viewMode changed: ${mode}`);
        if (LoggerFactory.setModeLevels) {
            LoggerFactory.setModeLevels(mode);
        }
    }

    // Mesh repair telemetry methods
    recordMeshRepair(stage, stats) {
        const repairStats = this.state.meshRepairStats;

        repairStats.totalRepairs++;

        if (stage === "post-extrusion") {
            repairStats.postExtrusionRepairs++;
        } else if (stage === "pre-csg") {
            repairStats.preCSGRepairs++;
        } else if (stage === "export") {
            repairStats.exportValidations++;
        }

        repairStats.lastRepair = {
            timestamp: Date.now(),
            stage,
            stats: { ...stats },
        };

        // Accumulate stats
        if (stats.verticesMerged)
            repairStats.cumulativeStats.verticesMerged += stats.verticesMerged;
        if (stats.trianglesRemoved)
            repairStats.cumulativeStats.trianglesRemoved +=
                stats.trianglesRemoved;
        if (stats.shortEdgesRemoved)
            repairStats.cumulativeStats.shortEdgesRemoved +=
                stats.shortEdgesRemoved;
        if (stats.nonManifoldEdgesFixed)
            repairStats.cumulativeStats.nonManifoldEdgesFixed +=
                stats.nonManifoldEdgesFixed;

        eventBus.emit("meshRepair:statsUpdated", repairStats);
        this.log.debug("Mesh repair stats updated:", repairStats);
    }

    getMeshRepairStats() {
        return this.state.meshRepairStats;
    }

    resetMeshRepairStats() {
        this.state.meshRepairStats = {
            totalRepairs: 0,
            postExtrusionRepairs: 0,
            preCSGRepairs: 0,
            exportValidations: 0,
            lastRepair: null,
            cumulativeStats: {
                verticesMerged: 0,
                trianglesRemoved: 0,
                shortEdgesRemoved: 0,
                nonManifoldEdgesFixed: 0,
            },
        };
        eventBus.emit("meshRepair:statsReset");
        this.log.info("Mesh repair stats reset");
    }

    is2DActive() {
        return this.state.viewMode === "2d" || this.state.viewMode === "both";
    }

    is3DActive() {
        return this.state.viewMode === "3d" || this.state.viewMode === "both";
    }
}

const appState = new AppState();
export default appState;
