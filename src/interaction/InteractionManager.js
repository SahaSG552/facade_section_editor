import LoggerFactory from "../core/LoggerFactory.js";
import eventBus from "../core/eventBus.js";

/**
 * InteractionManager - Centralized handler for all canvas interactions
 * Manages mouse, touch, drag, pan, pinch-to-zoom, and auto-scroll
 */
export default class InteractionManager {
    constructor(canvasElement, canvasManager, config = {}) {
        this.canvas = canvasElement;
        this.canvasManager = canvasManager;
        this.log = LoggerFactory.createLogger("InteractionManager");

        // Configuration
        this.autoScrollSpeed = config.autoScrollSpeed || 50;
        this.autoScrollThreshold = config.autoScrollThreshold || 50;
        this.bitTolerance = config.bitTolerance || 20;
        this.touchTolerance = config.touchTolerance || 30;

        // State flags
        this.isPanning = false;
        this.isDraggingBit = false;
        this.dragStarted = false;
        this.isTouchDragging = false;
        this.isTouchPanning = false;
        this.isPinching = false;
        this.autoScrollActive = false;

        // Drag state
        this.draggedBitIndex = null;
        this.draggedPhantomIndex = null; // For phantom bit dragging
        this.isDraggingPhantom = false; // Flag for phantom dragging
        this.dragStartX = 0;
        this.dragStartY = 0;

        // Pan state
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartPanX = 0;
        this.panStartPanY = 0;

        // Touch state
        this.touchIdentifier = null;
        this.touchDragStartX = 0;
        this.touchDragStartY = 0;
        this.touchPanStartX = 0;
        this.touchPanStartY = 0;
        this.touchPanStartPanX = 0;
        this.touchPanStartPanY = 0;

        // Pinch state
        this.initialPinchDistance = 0;
        this.initialZoomLevel = 1;

        // Double-tap state
        this.lastTapTime = 0;
        this.lastTapX = 0;
        this.lastTapY = 0;

        // Auto-scroll
        this.autoScrollInterval = null;

        // Callbacks (to be set by script.js)
        this.callbacks = {
            getBitsOnCanvas: null,
            getSelectedBitIndices: null,
            selectBit: null,
            resetBitHighlight: null,
            updateBitPosition: null,
            updateTableCoordinates: null,
            updatePartShape: null,
            getAnchorOffset: null,
            getPanelAnchorCoords: null,
            updateBitsSheet: null,
            redrawBitsOnCanvas: null,
            getBitsVisible: null,
            getShowPart: null,
            getThreeModule: null,
            getCsgScheduler: null,
            updateOffsetContours: null,
            updatePhantomBits: null,
            updateThreeView: null,
            clearBitSelection: null,
        };

        this.initializeEventListeners();
        this.log.info("InteractionManager initialized");
    }

    /**
     * Set callback functions
     */
    setCallbacks(callbacks) {
        Object.assign(this.callbacks, callbacks);
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Mouse events
        this.canvas.addEventListener(
            "mousedown",
            this.handleMouseDown.bind(this)
        );
        this.canvas.addEventListener(
            "mousemove",
            this.handleMouseMove.bind(this)
        );
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener(
            "mouseleave",
            this.handleMouseUp.bind(this)
        );

        // Touch events
        this.canvas.addEventListener(
            "touchstart",
            this.handleTouchStart.bind(this),
            { passive: false }
        );
        this.canvas.addEventListener(
            "touchmove",
            this.handleTouchMove.bind(this),
            { passive: false }
        );
        this.canvas.addEventListener(
            "touchend",
            this.handleTouchEnd.bind(this),
            { passive: false }
        );
        this.canvas.addEventListener(
            "touchcancel",
            this.handleTouchEnd.bind(this),
            { passive: false }
        );

        // Gesture events (for pinch-to-zoom)
        this.canvas.addEventListener(
            "gesturestart",
            this.handleGestureStart.bind(this),
            { passive: false }
        );
        this.canvas.addEventListener(
            "gesturechange",
            this.handleGestureChange.bind(this),
            { passive: false }
        );
        this.canvas.addEventListener(
            "gestureend",
            this.handleGestureEnd.bind(this),
            { passive: false }
        );
    }

    // ========== Mouse Event Handlers ==========

    handleMouseDown(e) {
        if (e.button !== 0) return; // Only handle left mouse button

        const svgCoords = this.canvasManager.screenToSvg(e.clientX, e.clientY);
        let clickedOnBit = false;

        const bitsOnCanvas = this.callbacks.getBitsOnCanvas?.() || [];
        const selectedBitIndices =
            this.callbacks.getSelectedBitIndices?.() || [];
        const bitsVisible = this.callbacks.getBitsVisible?.() ?? true;

        if (bitsVisible) {
            for (let i = 0; i < bitsOnCanvas.length; i++) {
                const bit = bitsOnCanvas[i];
                if (bit?.group) {
                    const shape = bit.group.querySelector(".bit-shape");
                    if (shape) {
                        const transform = bit.group.getAttribute("transform");
                        let dx = 0,
                            dy = 0;
                        if (transform) {
                            const match = transform.match(
                                /translate\(([^,]+),\s*([^)]+)\)/
                            );
                            if (match) {
                                dx = parseFloat(match[1]) || 0;
                                dy = parseFloat(match[2]) || 0;
                            }
                        }

                        const localX = svgCoords.x - dx;
                        const localY = svgCoords.y - dy;

                        if (shape.isPointInFill(new DOMPoint(localX, localY))) {
                            const bitCenterX = bit.baseAbsX + dx;
                            const bitCenterY = bit.baseAbsY + dy;
                            const distance = Math.sqrt(
                                (svgCoords.x - bitCenterX) ** 2 +
                                    (svgCoords.y - bitCenterY) ** 2
                            );

                            if (distance <= this.bitTolerance) {
                                clickedOnBit = true;

                                if (selectedBitIndices.includes(i)) {
                                    // Start dragging selected bit
                                    this.isDraggingBit = true;
                                    this.draggedBitIndex = i;
                                    this.callbacks
                                        .getCsgScheduler?.()
                                        ?.cancel();
                                    this.log.debug(
                                        "Cancelled pending CSG due to drag start"
                                    );
                                    this.dragStartX = svgCoords.x;
                                    this.dragStartY = svgCoords.y;
                                    this.dragStarted = false;
                                    this.canvas.style.cursor = "pointer";
                                    return;
                                } else {
                                    // Select unselected bit
                                    this.callbacks.selectBit?.(i);
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Check for phantom bit clicks (PO operation)
        if (bitsVisible) {
            const phantomsLayer =
                this.canvasManager.canvas.querySelector("[id*='phantoms']");
            if (phantomsLayer) {
                const phantomBits =
                    phantomsLayer.querySelectorAll(".phantom-bit-po");
                for (let i = 0; i < phantomBits.length; i++) {
                    const phantomGroup = phantomBits[i];
                    // Get the actual shape element inside the group
                    const phantomShape =
                        phantomGroup.querySelector(".bit-shape");

                    if (phantomShape) {
                        const transform =
                            phantomGroup.getAttribute("transform");
                        let dx = 0,
                            dy = 0;
                        if (transform) {
                            const match = transform.match(
                                /translate\(([^,]+),\s*([^)]+)\)/
                            );
                            if (match) {
                                dx = parseFloat(match[1]) || 0;
                                dy = parseFloat(match[2]) || 0;
                            }
                        }

                        const localX = svgCoords.x - dx;
                        const localY = svgCoords.y - dy;

                        if (
                            phantomShape.isPointInFill(
                                new DOMPoint(localX, localY)
                            )
                        ) {
                            // Find the parent bit index
                            const bitIndex = phantomGroup.__bitIndex;
                            if (bitIndex !== undefined) {
                                clickedOnBit = true;

                                // Start dragging phantom bit (X-axis only)
                                this.isDraggingPhantom = true;
                                this.draggedPhantomIndex = bitIndex;
                                // Экспорт индекса перетаскиваемого фантома в window, чтобы показать инпут
                                try {
                                    window.draggedPhantomIndex = bitIndex;
                                } catch (e) {}
                                this.callbacks.getCsgScheduler?.()?.cancel();
                                this.dragStartX = svgCoords.x;
                                this.dragStartY = svgCoords.y;
                                this.dragStarted = false;
                                this.canvas.style.cursor = "pointer";
                                return;
                            }
                        }
                    }
                }
            }
        }

        // Clear selections if clicked on empty area
        if (!clickedOnBit && selectedBitIndices.length > 0) {
            // Use clearBitSelection callback to properly sync with SelectionManager
            this.callbacks.clearBitSelection?.();
        }

        // Start panning
        this.isPanning = true;
        this.panStartX = e.clientX;
        this.panStartY = e.clientY;
        this.panStartPanX = this.canvasManager.panX;
        this.panStartPanY = this.canvasManager.panY;
        this.canvas.style.cursor = "grabbing";
    }

    handleMouseMove(e) {
        if (this.isDraggingPhantom && this.draggedPhantomIndex !== null) {
            // Handle phantom bit dragging (X-axis only for PO operation)
            this.dragStarted = true;

            this.callbacks.getCsgScheduler?.()?.cancel();

            const svgCoords = this.canvasManager.screenToSvg(
                e.clientX,
                e.clientY
            );
            const bitsOnCanvas = this.callbacks.getBitsOnCanvas?.() || [];
            const bit = bitsOnCanvas[this.draggedPhantomIndex];

            if (bit && bit.operation === "PO") {
                const panelAnchorCoords =
                    this.callbacks.getPanelAnchorCoords?.() || { x: 0, y: 0 };

                // Snap mouse position to grid (X-axis only)
                let snappedX = this.canvasManager.snapToGrid(svgCoords.x);

                // Calculate new pocket offset from phantom X position
                // pocketWidth = pocketOffset (phantom offset from main bit)
                // phantomX = mainBitX + pocketWidth = mainBitX + pocketOffset
                // So: pocketOffset = phantomX - mainBitX
                const diameter = bit.bitData?.diameter || 10;
                const mainBitX = bit.x;
                const phantomAbsX = snappedX - panelAnchorCoords.x;
                const newPocketOffset = phantomAbsX - mainBitX;

                // Apply constraint: pocketOffset >= 0 and snap to grid
                const rawOffset = Math.max(0, newPocketOffset);
                // Snap pocketOffset to grid (so phantom stays on grid)
                const constrainedPocketOffset =
                    this.canvasManager.snapToGrid(rawOffset);
                bit.pocketOffset = constrainedPocketOffset;

                // Calculate actual pocketWidth = diameter + pocketOffset
                const pocketWidth = diameter + constrainedPocketOffset;

                // Update phantom position in real-time
                const phantomsLayer =
                    this.canvasManager.canvas.querySelector("[id*='phantoms']");
                if (phantomsLayer) {
                    const allPhantoms =
                        phantomsLayer.querySelectorAll(".phantom-bit-po");
                    for (const phantom of allPhantoms) {
                        if (phantom.__bitIndex === this.draggedPhantomIndex) {
                            // Phantom was created at: anchorCoords.x + (mainBitX + initial_pocketOffset)
                            // We want it at: anchorCoords.x + (mainBitX + constrainedPocketOffset)
                            // So relative transform = constrainedPocketOffset - initial_pocketOffset
                            // But we don't store initial_pocketOffset, so just recalculate from scratch:
                            // Transform should move it to the target position
                            const initialPhantomX =
                                phantom.__initialX ||
                                panelAnchorCoords.x +
                                    mainBitX +
                                    (phantom.__pocketWidth - diameter);
                            const targetPhantomX =
                                panelAnchorCoords.x +
                                mainBitX +
                                constrainedPocketOffset;
                            const deltaX = targetPhantomX - initialPhantomX;

                            phantom.setAttribute(
                                "transform",
                                `translate(${deltaX}, 0)`
                            );
                            break;
                        }
                    }
                }

                // Update extensions and inputs during drag
                this.callbacks.updateBitExtensions?.();
                this.callbacks.updatePocketWidthInputs?.();

                this.checkAutoScroll(e.clientX, e.clientY);
            }
        } else if (this.isDraggingBit && this.draggedBitIndex !== null) {
            this.dragStarted = true;
            window.isDraggingBit = true;

            this.callbacks.getCsgScheduler?.()?.cancel();

            const threeModule = this.callbacks.getThreeModule?.();
            const showPart = this.callbacks.getShowPart?.();
            if (threeModule && showPart) {
                threeModule.showBasePanel();
            }

            const svgCoords = this.canvasManager.screenToSvg(
                e.clientX,
                e.clientY
            );
            const bitsOnCanvas = this.callbacks.getBitsOnCanvas?.() || [];
            const bit = bitsOnCanvas[this.draggedBitIndex];
            const anchorOffset = this.callbacks.getAnchorOffset?.(bit) || {
                x: 0,
                y: 0,
            };
            const panelAnchorCoords =
                this.callbacks.getPanelAnchorCoords?.() || { x: 0, y: 0 };

            let anchorX = svgCoords.x - panelAnchorCoords.x;
            let anchorY = svgCoords.y - panelAnchorCoords.y;

            anchorX = this.canvasManager.snapToGrid(anchorX);
            anchorY = this.canvasManager.snapToGrid(anchorY);

            let newX = anchorX - anchorOffset.x;
            let newY = anchorY - anchorOffset.y;

            this.checkAutoScroll(e.clientX, e.clientY);

            this.callbacks.updateBitPosition?.(
                this.draggedBitIndex,
                newX,
                newY
            );
            this.callbacks.updateTableCoordinates?.(
                this.draggedBitIndex,
                newX,
                newY
            );
        } else if (this.isPanning) {
            const deltaX = e.clientX - this.panStartX;
            const deltaY = e.clientY - this.panStartY;

            const svgDeltaX = deltaX / this.canvasManager.zoomLevel;
            const svgDeltaY = deltaY / this.canvasManager.zoomLevel;

            this.canvasManager.panX = this.panStartPanX - svgDeltaX;
            this.canvasManager.panY = this.panStartPanY - svgDeltaY;
            this.canvasManager.updateViewBox();
        }
    }

    handleMouseUp(e) {
        if (this.isDraggingPhantom) {
            this.isDraggingPhantom = false;
            this.draggedPhantomIndex = null;
            this.dragStarted = false;
            this.canvas.style.cursor = "grab";
            try {
                window.draggedPhantomIndex = null;
            } catch (e) {}

            // Update everything after drag to show final state
            this.callbacks.updateOffsetContours?.();
            this.callbacks.updatePhantomBits?.();
            this.callbacks.updatePocketWidthInputs?.();

            const showPart = this.callbacks.getShowPart?.();
            if (showPart) {
                this.callbacks.updatePartShape?.();
            }

            const threeModule = this.callbacks.getThreeModule?.();
            if (threeModule) {
                // Update 3D view with new pocket offset
                this.callbacks.updateThreeView?.();
                if (showPart) {
                    threeModule.showBasePanel();
                    this.callbacks.getCsgScheduler?.()?.schedule(true);
                }
            }
        } else if (this.isDraggingBit) {
            this.isDraggingBit = false;
            window.isDraggingBit = false;

            if (!this.dragStarted && this.draggedBitIndex !== null) {
                this.callbacks.selectBit?.(this.draggedBitIndex);
            }

            this.draggedBitIndex = null;
            this.dragStarted = false;
            this.canvas.style.cursor = "grab";

            // Refresh inputs visibility after drag
            this.callbacks.updatePocketWidthInputs?.();

            const showPart = this.callbacks.getShowPart?.();
            if (showPart) {
                this.callbacks.updatePartShape?.();
            }

            const threeModule = this.callbacks.getThreeModule?.();
            if (threeModule && showPart) {
                threeModule.showBasePanel();
                this.log.debug("CSG debounce timer fired after drag end");
                this.callbacks.getCsgScheduler?.()?.schedule(true);
            }
        } else if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = "grab";
        }
    }

    // ========== Touch Event Handlers ==========

    handleTouchStart(e) {
        e.preventDefault();

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const svgCoords = this.canvasManager.screenToSvg(
                touch.clientX,
                touch.clientY
            );

            let touchedBit = false;
            const bitsOnCanvas = this.callbacks.getBitsOnCanvas?.() || [];
            const selectedBitIndices =
                this.callbacks.getSelectedBitIndices?.() || [];
            const bitsVisible = this.callbacks.getBitsVisible?.() ?? true;

            if (bitsVisible) {
                for (let i = 0; i < bitsOnCanvas.length; i++) {
                    const bit = bitsOnCanvas[i];
                    if (bit?.group) {
                        const shape = bit.group.querySelector(".bit-shape");
                        if (shape) {
                            const transform =
                                bit.group.getAttribute("transform");
                            let dx = 0,
                                dy = 0;
                            if (transform) {
                                const match = transform.match(
                                    /translate\(([^,]+),\s*([^)]+)\)/
                                );
                                if (match) {
                                    dx = parseFloat(match[1]) || 0;
                                    dy = parseFloat(match[2]) || 0;
                                }
                            }

                            const localX = svgCoords.x - dx;
                            const localY = svgCoords.y - dy;

                            if (
                                shape.isPointInFill(
                                    new DOMPoint(localX, localY)
                                )
                            ) {
                                const bitCenterX = bit.baseAbsX + dx;
                                const bitCenterY = bit.baseAbsY + dy;
                                const distance = Math.sqrt(
                                    (svgCoords.x - bitCenterX) ** 2 +
                                        (svgCoords.y - bitCenterY) ** 2
                                );

                                if (distance <= this.touchTolerance) {
                                    touchedBit = true;
                                    this.touchIdentifier = touch.identifier;

                                    if (selectedBitIndices.includes(i)) {
                                        this.isTouchDragging = true;
                                        this.draggedBitIndex = i;
                                        this.touchDragStartX = svgCoords.x;
                                        this.touchDragStartY = svgCoords.y;
                                        this.dragStarted = false;
                                        return;
                                    } else {
                                        this.callbacks.selectBit?.(i);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (!touchedBit) {
                if (selectedBitIndices.length > 0) {
                    selectedBitIndices.forEach((index) => {
                        this.callbacks.resetBitHighlight?.(index);
                    });
                    selectedBitIndices.length = 0;
                    this.callbacks.updateBitsSheet?.();
                    this.callbacks.redrawBitsOnCanvas?.();
                }

                this.isTouchPanning = true;
                this.touchPanStartX = touch.clientX;
                this.touchPanStartY = touch.clientY;
                this.touchPanStartPanX = this.canvasManager.panX;
                this.touchPanStartPanY = this.canvasManager.panY;
            }
        }
    }

    handleTouchMove(e) {
        e.preventDefault();

        if (this.isTouchDragging && e.touches.length === 1) {
            const touch = Array.from(e.touches).find(
                (t) => t.identifier === this.touchIdentifier
            );
            if (!touch) return;

            this.dragStarted = true;

            const svgCoords = this.canvasManager.screenToSvg(
                touch.clientX,
                touch.clientY
            );
            const bitsOnCanvas = this.callbacks.getBitsOnCanvas?.() || [];
            const bit = bitsOnCanvas[this.draggedBitIndex];
            const anchorOffset = this.callbacks.getAnchorOffset?.(bit) || {
                x: 0,
                y: 0,
            };
            const panelAnchorCoords =
                this.callbacks.getPanelAnchorCoords?.() || { x: 0, y: 0 };

            let anchorX = svgCoords.x - panelAnchorCoords.x;
            let anchorY = svgCoords.y - panelAnchorCoords.y;

            anchorX = this.canvasManager.snapToGrid(anchorX);
            anchorY = this.canvasManager.snapToGrid(anchorY);

            let newX = anchorX - anchorOffset.x;
            let newY = anchorY - anchorOffset.y;

            this.checkAutoScroll(touch.clientX, touch.clientY);

            this.callbacks.updateBitPosition?.(
                this.draggedBitIndex,
                newX,
                newY
            );
            this.callbacks.updateTableCoordinates?.(
                this.draggedBitIndex,
                newX,
                newY
            );
        } else if (this.isTouchPanning && e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchPanStartX;
            const deltaY = touch.clientY - this.touchPanStartY;

            const svgDeltaX = deltaX / this.canvasManager.zoomLevel;
            const svgDeltaY = deltaY / this.canvasManager.zoomLevel;

            this.canvasManager.panX = this.touchPanStartPanX - svgDeltaX;
            this.canvasManager.panY = this.touchPanStartPanY - svgDeltaY;
            this.canvasManager.updateViewBox();
        }
    }

    handleTouchEnd(e) {
        const endedTouch = Array.from(e.changedTouches).find(
            (t) => t.identifier === this.touchIdentifier
        );
        if (!endedTouch) return;

        if (this.isTouchDragging) {
            this.isTouchDragging = false;

            if (!this.dragStarted && this.draggedBitIndex !== null) {
                this.callbacks.selectBit?.(this.draggedBitIndex);
            }

            this.draggedBitIndex = null;
            this.dragStarted = false;
            this.touchIdentifier = null;

            const showPart = this.callbacks.getShowPart?.();
            if (showPart) {
                this.callbacks.updatePartShape?.();
            }

            const threeModule = this.callbacks.getThreeModule?.();
            if (threeModule && showPart) {
                threeModule.showBasePanel();
                this.callbacks.getCsgScheduler?.()?.schedule(true);
            }
        } else if (this.isTouchPanning) {
            this.isTouchPanning = false;
            this.touchIdentifier = null;
        }
    }

    // ========== Gesture Event Handlers (Pinch-to-Zoom) ==========

    handleGestureStart(e) {
        e.preventDefault();
        this.isPinching = true;
        this.initialZoomLevel = this.canvasManager.zoomLevel;
    }

    handleGestureChange(e) {
        e.preventDefault();

        if (this.isPinching) {
            const newZoomLevel = this.initialZoomLevel * e.scale;
            const clampedZoom = Math.max(0.1, Math.min(10, newZoomLevel));
            this.canvasManager.setZoom(clampedZoom);
        }
    }

    handleGestureEnd(e) {
        e.preventDefault();
        this.isPinching = false;
    }

    // ========== Auto-Scroll ==========

    checkAutoScroll(clientX, clientY) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const threshold = this.autoScrollThreshold;

        let scrollX = 0;
        let scrollY = 0;

        if (clientX < canvasRect.left + threshold) {
            scrollX = -1;
        } else if (clientX > canvasRect.right - threshold) {
            scrollX = 1;
        }

        if (clientY < canvasRect.top + threshold) {
            scrollY = -1;
        } else if (clientY > canvasRect.bottom - threshold) {
            scrollY = 1;
        }

        if (scrollX !== 0 || scrollY !== 0) {
            if (!this.autoScrollActive) {
                this.startAutoScroll(scrollX, scrollY);
            }
        } else {
            if (this.autoScrollActive) {
                this.stopAutoScroll();
            }
        }
    }

    startAutoScroll(directionX, directionY) {
        this.autoScrollActive = true;
        const speed = this.autoScrollSpeed / this.canvasManager.zoomLevel;

        this.autoScrollInterval = setInterval(() => {
            this.canvasManager.panX += directionX * speed;
            this.canvasManager.panY += directionY * speed;
            this.canvasManager.updateViewBox();
        }, 16);
    }

    stopAutoScroll() {
        this.autoScrollActive = false;
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
    }

    // ========== Cleanup ==========

    destroy() {
        this.stopAutoScroll();
        this.canvas.removeEventListener("mousedown", this.handleMouseDown);
        this.canvas.removeEventListener("mousemove", this.handleMouseMove);
        this.canvas.removeEventListener("mouseup", this.handleMouseUp);
        this.canvas.removeEventListener("mouseleave", this.handleMouseUp);
        this.canvas.removeEventListener("touchstart", this.handleTouchStart);
        this.canvas.removeEventListener("touchmove", this.handleTouchMove);
        this.canvas.removeEventListener("touchend", this.handleTouchEnd);
        this.canvas.removeEventListener("touchcancel", this.handleTouchEnd);
        this.canvas.removeEventListener(
            "gesturestart",
            this.handleGestureStart
        );
        this.canvas.removeEventListener(
            "gesturechange",
            this.handleGestureChange
        );
        this.canvas.removeEventListener("gestureend", this.handleGestureEnd);
        this.log.info("InteractionManager destroyed");
    }
}
