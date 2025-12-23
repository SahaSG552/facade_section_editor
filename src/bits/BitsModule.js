/**
 * Bits Module
 * Manages router bit functionality
 */
import BaseModule from "../core/BaseModule.js";
import BitsManager from "../panel/BitsManager.js";
import { app } from "../app/main.js";

class BitsModule extends BaseModule {
    constructor() {
        super("bits");
        this.bitsManager = null;
        this.canvasManager = null;
    }

    async initialize() {
        await super.initialize();

        // Wait for canvas to be ready before initializing BitsManager
        this.waitForCanvasReady();

        this.setupEventListeners();
    }

    waitForCanvasReady() {
        const checkCanvasReady = () => {
            const canvasManager =
                app.getModule("canvas")?.getCanvasManager() ||
                window.mainCanvasManager;

            if (canvasManager) {
                this.canvasManager = canvasManager;
                // Initialize BitsManager with the canvas manager
                this.bitsManager = new BitsManager(this.canvasManager);
                console.log(
                    "BitsModule initialized with BitsManager and CanvasManager"
                );
            } else {
                // Wait a bit and check again
                setTimeout(checkCanvasReady, 10);
            }
        };

        checkCanvasReady();
    }

    /**
     * Get the BitsManager instance
     * @returns {BitsManager} BitsManager instance
     */
    getBitsManager() {
        return this.bitsManager;
    }

    /**
     * Set the canvas manager (called when canvas is ready)
     * @param {CanvasManager} canvasManager
     */
    setCanvasManager(canvasManager) {
        this.canvasManager = canvasManager;
        if (this.bitsManager) {
            this.bitsManager.canvasManager = canvasManager;
        } else {
            this.bitsManager = new BitsManager(canvasManager);
        }
    }

    setupEventListeners() {
        // Setup event listeners for bits module
        this.eventBus.on("canvas:ready", ({ canvasManager }) => {
            console.log("Canvas is ready, initializing bits manager");
            this.setCanvasManager(canvasManager);
        });

        this.eventBus.on("bits:add", (bitData) => {
            console.log("Adding new bit:", bitData);
            // Handle adding new bits
        });
    }

    cleanupEventListeners() {
        this.eventBus.off("canvas:ready");
        this.eventBus.off("bits:add");
    }
}

export default BitsModule;
