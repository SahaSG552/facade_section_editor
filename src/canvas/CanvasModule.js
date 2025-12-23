/**
 * Canvas Module
 * Manages SVG canvas functionality
 */
import BaseModule from "../core/BaseModule.js";
import CanvasManager from "./CanvasManager.js";

class CanvasModule extends BaseModule {
    constructor() {
        super("canvas");
        this.canvasManager = null;
        this.canvasElement = null;
    }

    async initialize() {
        await super.initialize();

        // Get canvas element from DOM
        this.canvasElement = document.getElementById("canvas");
        if (!this.canvasElement) {
            throw new Error("Canvas element not found");
        }

        // Wait for the original CanvasManager to be created by the main script
        // We'll set up a watcher to detect when it's available
        this.waitForCanvasManager();
    }

    waitForCanvasManager() {
        const checkCanvasManager = () => {
            if (window.mainCanvasManager) {
                console.log(
                    "CanvasModule: Using existing CanvasManager from global scope"
                );
                this.canvasManager = window.mainCanvasManager;
                this.eventBus.emit("canvas:ready", {
                    canvasManager: this.canvasManager,
                });
            } else {
                // Wait a bit and check again
                setTimeout(checkCanvasManager, 10);
            }
        };

        checkCanvasManager();
    }

    /**
     * Get the CanvasManager instance
     * @returns {CanvasManager} CanvasManager instance
     */
    getCanvasManager() {
        return this.canvasManager;
    }

    /**
     * Get the canvas element
     * @returns {SVGElement} Canvas SVG element
     */
    getCanvasElement() {
        return this.canvasElement;
    }

    setupEventListeners() {
        // Setup event listeners for canvas module
        this.eventBus.on("app:initialized", () => {
            console.log("App initialized, setting up canvas");
        });
    }

    cleanupEventListeners() {
        this.eventBus.off("app:initialized");
    }
}

export default CanvasModule;
