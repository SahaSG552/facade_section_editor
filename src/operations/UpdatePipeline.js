/**
 * UpdatePipeline - Orchestrates cascading updates across the application
 * Manages the complex update flow: bit position → offsets → phantoms → sheet → 3D
 * **PHASE 2 REFACTORING** - Extracted from scattered update calls throughout script.js
 */

export class UpdatePipeline {
    constructor(config = {}) {
        this.config = {
            autoSync: true, // Auto-sync updates without manual triggering
            deferPhantomUpdates: true, // Defer phantom updates for performance
            deferSheetUpdates: true, // Defer sheet updates for batching
            updateThreeView: true, // Update 3D view when active
            ...config,
        };

        this.updateQueue = [];
        this.isProcessing = false;
        this.dependenciesInitialized = false;
    }

    /**
     * Initialize pipeline dependencies from global scope
     * This is called once after all managers are initialized
     */
    initializeDependencies(deps) {
        this.mainCanvasManager = deps.mainCanvasManager;
        this.appConfig = deps.appConfig;
        this.panelCoordinateHelper = deps.panelCoordinateHelper;
        this.booleanOperationStrategy = deps.booleanOperationStrategy;

        // Reference to functions that will be called
        this.updateOffsetContours = deps.updateOffsetContours;
        this.updatePhantomBits = deps.updatePhantomBits;
        this.updateBitsSheet = deps.updateBitsSheet;
        this.updateThreeView = deps.updateThreeView;
        this.redrawBitsOnCanvas = deps.redrawBitsOnCanvas;

        this.dependenciesInitialized = true;
    }

    /**
     * Main entry point: trigger a full update cascade
     * bit position changed → update everything that depends on it
     */
    onBitPositionChanged(bitId, newPosition) {
        if (!this.dependenciesInitialized) {
            console.warn("UpdatePipeline: Dependencies not initialized");
            return;
        }

        // Queue the update
        this.updateQueue.push({
            type: "bit-position-change",
            bitId,
            newPosition,
            timestamp: Date.now(),
        });

        // Process queue
        this.processQueue();
    }

    /**
     * Trigger update when panel anchor changes
     */
    onPanelAnchorChanged(newAnchor) {
        this.updateQueue.push({
            type: "panel-anchor-change",
            newAnchor,
            timestamp: Date.now(),
        });

        this.processQueue();
    }

    /**
     * Trigger update when panel size changes
     */
    onPanelSizeChanged(newWidth, newHeight, newThickness) {
        this.updateQueue.push({
            type: "panel-size-change",
            newWidth,
            newHeight,
            newThickness,
            timestamp: Date.now(),
        });

        this.processQueue();
    }

    /**
     * Process the update queue and execute cascading updates
     */
    processQueue() {
        if (this.isProcessing) {
            return; // Prevent recursive processing
        }

        this.isProcessing = true;

        while (this.updateQueue.length > 0) {
            const update = this.updateQueue.shift();
            this.executeUpdate(update);
        }

        this.isProcessing = false;
    }

    /**
     * Execute a single update from the queue
     */
    executeUpdate(update) {
        console.log(`[UpdatePipeline] Processing: ${update.type}`);

        switch (update.type) {
            case "bit-position-change":
                this.cascadeFromBitPosition(update.bitId, update.newPosition);
                break;

            case "panel-anchor-change":
                this.cascadeFromPanelAnchor(update.newAnchor);
                break;

            case "panel-size-change":
                this.cascadeFromPanelSize(
                    update.newWidth,
                    update.newHeight,
                    update.newThickness
                );
                break;

            default:
                console.warn(
                    `[UpdatePipeline] Unknown update type: ${update.type}`
                );
        }
    }

    /**
     * Cascade updates when bit position changes
     * Order: offset contours → phantom bits → sheet → 3D view
     */
    cascadeFromBitPosition(bitId, newPosition) {
        console.log(
            `[UpdatePipeline] Bit position changed: ${bitId}`,
            newPosition
        );

        // Step 1: Update offset contours (most important for accuracy)
        if (this.updateOffsetContours) {
            this.updateOffsetContours();
        }

        // Step 2: Update phantom bits based on new offsets
        if (this.config.deferPhantomUpdates) {
            this.deferCall(() => {
                if (this.updatePhantomBits) {
                    this.updatePhantomBits();
                }
            }, 16); // ~1 frame at 60fps
        } else {
            if (this.updatePhantomBits) {
                this.updatePhantomBits();
            }
        }

        // Step 3: Update UI sheet to reflect changes
        if (this.config.deferSheetUpdates) {
            this.deferCall(() => {
                if (this.updateBitsSheet) {
                    this.updateBitsSheet();
                }
            }, 32); // ~2 frames
        } else {
            if (this.updateBitsSheet) {
                this.updateBitsSheet();
            }
        }

        // Step 4: Update 3D view if active
        if (this.config.updateThreeView && window.threeModule) {
            this.deferCall(() => {
                if (this.updateThreeView) {
                    this.updateThreeView();
                }
            }, 48); // ~3 frames
        }
    }

    /**
     * Cascade updates when panel anchor changes
     * Order: bits → offsets → phantoms → sheet → 3D
     */
    cascadeFromPanelAnchor(newAnchor) {
        console.log(`[UpdatePipeline] Panel anchor changed to: ${newAnchor}`);

        // Step 1: Redraw bits on canvas with new coordinates
        if (this.redrawBitsOnCanvas) {
            this.redrawBitsOnCanvas();
        }

        // Step 2: Recalculate offsets for new anchor
        if (this.updateOffsetContours) {
            this.updateOffsetContours();
        }

        // Step 3: Update phantom bits
        if (this.updatePhantomBits) {
            this.updatePhantomBits();
        }

        // Step 4: Update sheet
        if (this.updateBitsSheet) {
            this.updateBitsSheet();
        }

        // Step 5: Update 3D view
        if (
            this.config.updateThreeView &&
            window.threeModule &&
            this.updateThreeView
        ) {
            this.updateThreeView();
        }
    }

    /**
     * Cascade updates when panel size changes
     */
    cascadeFromPanelSize(newWidth, newHeight, newThickness) {
        console.log(`[UpdatePipeline] Panel size changed to:`, {
            width: newWidth,
            height: newHeight,
            thickness: newThickness,
        });

        // Panel size changes affect offset calculations and phantom positions
        if (this.updateOffsetContours) {
            this.updateOffsetContours();
        }

        if (this.updatePhantomBits) {
            this.updatePhantomBits();
        }

        if (this.updateBitsSheet) {
            this.updateBitsSheet();
        }

        if (
            this.config.updateThreeView &&
            window.threeModule &&
            this.updateThreeView
        ) {
            this.updateThreeView();
        }
    }

    /**
     * Defer a callback execution using requestAnimationFrame or setTimeout
     * Helps with performance by batching visual updates
     */
    deferCall(callback, delayMs = 0) {
        if (delayMs === 0) {
            if (typeof requestAnimationFrame !== "undefined") {
                requestAnimationFrame(callback);
            } else {
                setTimeout(callback, 16); // ~60fps fallback
            }
        } else {
            setTimeout(callback, delayMs);
        }
    }

    /**
     * Manually trigger a full update (for testing or manual refresh)
     */
    triggerFullUpdate() {
        console.log("[UpdatePipeline] Triggering full update");

        if (this.updateOffsetContours) this.updateOffsetContours();
        if (this.updatePhantomBits) this.updatePhantomBits();
        if (this.updateBitsSheet) this.updateBitsSheet();
        if (
            this.config.updateThreeView &&
            window.threeModule &&
            this.updateThreeView
        ) {
            this.updateThreeView();
        }
    }

    /**
     * Clear the update queue (useful for cleanup)
     */
    clearQueue() {
        this.updateQueue = [];
    }

    /**
     * Get current queue size for debugging
     */
    getQueueSize() {
        return this.updateQueue.length;
    }

    /**
     * Get pipeline statistics
     */
    getStats() {
        return {
            queueSize: this.updateQueue.length,
            isProcessing: this.isProcessing,
            dependenciesInitialized: this.dependenciesInitialized,
            config: this.config,
        };
    }
}

export default UpdatePipeline;
