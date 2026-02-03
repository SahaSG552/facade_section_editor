import { fitToBounds, zoomToSVGElement } from "./zoomUtils.js";
// GridRenderer - класс для создания SVG сетки с использованием паттернов
class GridRenderer {
    constructor(svgNS, defs, gridLayer, config) {
        this.svgNS = svgNS;
        this.defs = defs;
        this.gridLayer = gridLayer;
        this.config = config; // { id, size, color, thickness, anchorX, anchorY, panX, panY, width, height }
    }

    render() {
        // Remove existing pattern
        const existingPattern = this.defs.querySelector(
            `#${this.config.id}-pattern`
        );
        if (existingPattern) {
            this.defs.removeChild(existingPattern);
        }

        // Calculate offset - grid starts from anchor point to ensure consistency
        // If anchor is null, default to 0
        let xOffset =
            this.config.gridAnchorX !== null ? this.config.gridAnchorX : 0;
        let yOffset =
            this.config.gridAnchorY !== null ? this.config.gridAnchorY : 0;

        // Create pattern
        const pattern = document.createElementNS(this.svgNS, "pattern");
        pattern.id = `${this.config.id}-pattern`;
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        pattern.setAttribute("x", xOffset);
        pattern.setAttribute("y", yOffset);
        pattern.setAttribute("width", this.config.size);
        pattern.setAttribute("height", this.config.size);

        // Horizontal line
        const hLine = document.createElementNS(this.svgNS, "line");
        hLine.setAttribute("x1", 0);
        hLine.setAttribute("y1", 0);
        hLine.setAttribute("x2", this.config.size);
        hLine.setAttribute("y2", 0);
        hLine.setAttribute("stroke", this.config.color);
        hLine.setAttribute("stroke-width", this.config.thickness);
        pattern.appendChild(hLine);

        // Vertical line
        const vLine = document.createElementNS(this.svgNS, "line");
        vLine.setAttribute("x1", 0);
        vLine.setAttribute("y1", 0);
        vLine.setAttribute("x2", 0);
        vLine.setAttribute("y2", this.config.size);
        vLine.setAttribute("stroke", this.config.color);
        vLine.setAttribute("stroke-width", this.config.thickness);
        pattern.appendChild(vLine);

        this.defs.appendChild(pattern);

        // Create rectangle to cover the entire viewBox area
        const rect = document.createElementNS(this.svgNS, "rect");
        rect.setAttribute("x", this.config.x);
        rect.setAttribute("y", this.config.y);
        rect.setAttribute("width", this.config.width);
        rect.setAttribute("height", this.config.height);
        rect.setAttribute("fill", `url(#${this.config.id}-pattern)`);
        rect.setAttribute("pointer-events", "none"); // Allow touch events to pass through to container
        this.gridLayer.appendChild(rect);
    }
}

// CanvasManager - унифицированный класс для работы с SVG канвасами

class CanvasManager {
    constructor(config) {
        this.config = {
            canvas: null,
            width: 800,
            height: 600,
            enableZoom: true,
            enablePan: true,
            enableGrid: true,
            enableMouseEvents: true,
            enableSelection: false,
            enableDrag: false,
            gridSize: 1,
            gridAnchorX: null, // Anchor point for grid alignment (if null, uses center)
            gridAnchorY: null, // Anchor point for grid alignment (if null, uses center)
            initialZoom: 1,
            initialPanX: 400,
            initialPanY: 300,
            layers: ["grid", "content", "overlay"],
            onZoom: null,
            onPan: null,
            onMouseDown: null,
            onMouseMove: null,
            onMouseUp: null,
            onWheel: null,
            ...config,
        };

        this.svgNS = "http://www.w3.org/2000/svg";

        // Инициализация переменных состояния
        this.zoomLevel = this.config.initialZoom;
        this.panX = this.config.initialPanX;
        this.panY = this.config.initialPanY;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.gridEnabled = this.config.enableGrid;

        // Создание слоев
        this.layers = {};
        this.gridLayer = null;

        this.initialize();
    }

    initialize() {
        if (!this.config.canvas) {
            throw new Error("Canvas element is required");
        }

        this.canvas = this.config.canvas;
        this.updateCanvasSize();

        // Set SVG width and height to 100% for responsive sizing
        this.canvas.setAttribute("width", "100%");
        this.canvas.setAttribute("height", "100%");

        // Set pan center to anchor point if defined, otherwise use center
        if (
            this.config.gridAnchorX !== null &&
            this.config.gridAnchorY !== null
        ) {
            this.panX = this.config.gridAnchorX;
            this.panY = this.config.gridAnchorY;
        } else {
            // Fallback to center if anchor not defined
            this.panX = this.canvasParameters.width / 2;
            this.panY = this.canvasParameters.height / 2;
        }

        // Установка viewBox
        this.canvas.setAttribute(
            "viewBox",
            `0 0 ${this.canvasParameters.width} ${this.canvasParameters.height}`
        );

        // Создание слоев в указанном порядке
        this.config.layers.forEach((layerName) => {
            const layer = document.createElementNS(this.svgNS, "g");
            layer.id = `${layerName}-layer`;
            this.layers[layerName] = layer;
            this.canvas.appendChild(layer);

            if (layerName === "grid") {
                this.gridLayer = layer;
            }
        });

        // Инициализация сетки если включена
        if (this.config.enableGrid) {
            this.drawGrid();
        }

        // Инициализация событий мыши если включены
        if (this.config.enableMouseEvents) {
            this.setupMouseEvents();
        }

        // Add ResizeObserver to monitor container size changes
        const container = this.canvas.parentElement;
        if (container) {
            this.resizeObserver = new ResizeObserver(() => {
                this.resize();
            });
            this.resizeObserver.observe(container);
        }

        // Начальная настройка viewBox
        this.updateViewBox();
    }

    setupMouseEvents() {
        if (this.config.enableZoom) {
            this.canvas.addEventListener("wheel", this.handleZoom.bind(this), {
                passive: false,
            });
        }

        // Mouse events for desktop
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

        // Touch events for mobile devices
        this.setupTouchEvents();
    }

    setupTouchEvents() {
        // Use basic touch events for standard panning and zooming
        this.setupBasicTouchEvents();
    }

    setupBasicTouchEvents() {
        // Fallback touch event handlers for mobile devices
        const container = this.canvas.parentElement;
        if (container) {
            container.addEventListener(
                "touchstart",
                this.handleTouchStart.bind(this),
                {
                    passive: false,
                }
            );
            container.addEventListener(
                "touchmove",
                this.handleTouchMove.bind(this),
                {
                    passive: false,
                }
            );
            container.addEventListener(
                "touchend",
                this.handleTouchEnd.bind(this),
                {
                    passive: false,
                }
            );
        }

        // Also keep canvas events for compatibility
        this.canvas.addEventListener(
            "touchstart",
            this.handleTouchStart.bind(this),
            {
                passive: false,
            }
        );
        this.canvas.addEventListener(
            "touchmove",
            this.handleTouchMove.bind(this),
            {
                passive: false,
            }
        );
        this.canvas.addEventListener(
            "touchend",
            this.handleTouchEnd.bind(this),
            {
                passive: false,
            }
        );
    }

    // === GRID FUNCTIONS ===
    drawGrid() {
        if (!this.gridEnabled || !this.gridLayer) return;

        this.gridLayer.innerHTML = ""; // Clear existing grid

        // Ensure defs element exists
        let defs = this.canvas.querySelector("defs");
        if (!defs) {
            defs = document.createElementNS(this.svgNS, "defs");
            this.canvas.insertBefore(defs, this.canvas.firstChild);
        }

        // Calculate current viewBox bounds
        const rect = this.canvas.getBoundingClientRect();
        const viewBoxWidth = rect.width / this.zoomLevel;
        const viewBoxHeight = rect.height / this.zoomLevel;
        const viewBoxX = this.panX - viewBoxWidth / 2;
        const viewBoxY = this.panY - viewBoxHeight / 2;

        // Calculate grid line spacing (increase spacing for very small grid sizes to improve performance)
        let effectiveGridSize = this.config.gridSize;
        const minGridSpacing = 1; // Minimum 5 pixels between grid lines for performance
        if (effectiveGridSize * this.zoomLevel < minGridSpacing) {
            effectiveGridSize = minGridSpacing / this.zoomLevel;
        }

        // Calculate stroke width that scales with zoom level
        const thickness = Math.max(0.01, 0.1 / Math.sqrt(this.zoomLevel));
        // Auxiliary grid renderer (10x spacing, thicker and darker lines)
        const auxGridSize = 10;
        // Main grid renderer
        const mainGridConfig = {
            id: "grid",
            size: this.config.gridSize,
            color: "#e0e0e0",
            thickness: thickness,
            gridAnchorX: this.config.gridAnchorX - this.config.gridSize / 2,
            gridAnchorY: this.config.gridAnchorY - this.config.gridSize / 2,
            panX: this.panX,
            panY: this.panY,
            x: viewBoxX,
            y: viewBoxY,
            width: viewBoxWidth,
            height: viewBoxHeight,
        };
        const mainGrid = new GridRenderer(
            this.svgNS,
            defs,
            this.gridLayer,
            mainGridConfig
        );
        mainGrid.render();

        const auxGridConfig = {
            id: "aux-grid",
            size: auxGridSize,
            color: "#5f5959ff",
            thickness: thickness * 2,
            gridAnchorX: this.config.gridAnchorX - this.config.gridSize / 2,
            gridAnchorY: this.config.gridAnchorY - this.config.gridSize / 2,
            panX: this.panX,
            panY: this.panY,
            x: viewBoxX,
            y: viewBoxY,
            width: viewBoxWidth,
            height: viewBoxHeight,
        };
        const auxGrid = new GridRenderer(
            this.svgNS,
            defs,
            this.gridLayer,
            auxGridConfig
        );
        auxGrid.render();
    }

    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        if (this.gridEnabled) {
            this.drawGrid();
        } else {
            if (this.gridLayer) {
                this.gridLayer.innerHTML = "";
            }
        }
    }

    // === ZOOM AND PAN FUNCTIONS ===
    zoomIn() {
        this.zoomLevel *= 1.2;
        this.updateViewBox();
    }

    zoomOut() {
        this.zoomLevel /= 1.2;
        this.updateViewBox();
    }

    fitToScale(bounds = null) {
        fitToBounds(this, bounds);
    }

    fitToSVGElement(svgElement, padding = 20) {
        zoomToSVGElement(this, svgElement, padding);
    }

    updateViewBox() {
        const rect = this.canvas.getBoundingClientRect();
        const viewBoxWidth = rect.width / this.zoomLevel;
        const viewBoxHeight = rect.height / this.zoomLevel;
        const viewBoxX = this.panX - viewBoxWidth / 2;
        const viewBoxY = this.panY - viewBoxHeight / 2;

        this.canvas.setAttribute(
            "viewBox",
            `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`
        );

        if (this.gridEnabled) {
            this.drawGrid();
        }

        // Вызов callback если задан
        if (this.config.onZoom) {
            this.config.onZoom(this.zoomLevel, this.panX, this.panY);
        }
    }

    // === MOUSE EVENT HANDLERS ===
    handleZoom(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const oldZoom = this.zoomLevel;
        this.zoomLevel *= zoomFactor;

        const oldViewBoxWidth = rect.width / oldZoom;
        const oldViewBoxHeight = rect.height / oldZoom;
        const oldViewBoxX = this.panX - oldViewBoxWidth / 2;
        const oldViewBoxY = this.panY - oldViewBoxHeight / 2;

        const svgX = oldViewBoxX + (mouseX / rect.width) * oldViewBoxWidth;
        const svgY = oldViewBoxY + (mouseY / rect.height) * oldViewBoxHeight;

        const newViewBoxWidth = rect.width / this.zoomLevel;
        const newViewBoxHeight = rect.height / this.zoomLevel;

        const newViewBoxX = svgX - (mouseX / rect.width) * newViewBoxWidth;
        const newViewBoxY = svgY - (mouseY / rect.height) * newViewBoxHeight;

        this.panX = newViewBoxX + newViewBoxWidth / 2;
        this.panY = newViewBoxY + newViewBoxHeight / 2;

        this.updateViewBox();

        // Вызов пользовательского обработчика
        if (this.config.onWheel) {
            this.config.onWheel(e, this.zoomLevel, this.panX, this.panY);
        }
    }

    handleMouseDown(e) {
        if (e.button === 0) {
            // Левая кнопка мыши
            if (this.config.enablePan) {
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = "grabbing";
            }
        }

        // Вызов пользовательского обработчика
        if (this.config.onMouseDown) {
            this.config.onMouseDown(e);
        }
    }

    handleMouseMove(e) {
        if (this.isDragging && this.config.enablePan) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;

            const svgDeltaX = deltaX / this.zoomLevel;
            const svgDeltaY = deltaY / this.zoomLevel;

            this.panX -= svgDeltaX;
            this.panY -= svgDeltaY;

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            this.updateViewBox();
        }

        // Вызов пользовательского обработчика
        if (this.config.onMouseMove) {
            this.config.onMouseMove(e);
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = this.config.enablePan
                ? "grab"
                : "default";
        }

        // Вызов пользовательского обработчика
        if (this.config.onMouseUp) {
            this.config.onMouseUp(e);
        }
    }

    // === TOUCH EVENT HANDLERS ===
    handleTouchStart(e) {
        if (e.touches.length === 1 && this.config.enablePan) {
            // Single touch for panning
            e.preventDefault();
            this.isDragging = true;
            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2 && this.config.enableZoom) {
            // Two finger pinch for zooming
            e.preventDefault();
            this.handlePinchStart(e);
        }
    }

    handleTouchMove(e) {
        if (
            this.isDragging &&
            e.touches.length === 1 &&
            this.config.enablePan
        ) {
            // Single touch panning
            e.preventDefault();
            const deltaX = e.touches[0].clientX - this.lastMouseX;
            const deltaY = e.touches[0].clientY - this.lastMouseY;

            const svgDeltaX = deltaX / this.zoomLevel;
            const svgDeltaY = deltaY / this.zoomLevel;

            this.panX -= svgDeltaX;
            this.panY -= svgDeltaY;

            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;

            this.updateViewBox();
        } else if (e.touches.length === 2 && this.config.enableZoom) {
            // Two finger pinch zooming
            e.preventDefault();
            this.handlePinchMove(e);
        }
    }

    handleTouchEnd(e) {
        if (this.isDragging) {
            this.isDragging = false;
        }
        if (this.pinchStartDistance) {
            this.pinchStartDistance = null;
            this.pinchStartZoom = null;
            this.pinchStartCenterX = null;
            this.pinchStartCenterY = null;
        }
    }

    handlePinchStart(e) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        this.pinchStartDistance = this.getTouchDistance(touch1, touch2);
        this.pinchStartZoom = this.zoomLevel;
        this.pinchStartCenterX = (touch1.clientX + touch2.clientX) / 2;
        this.pinchStartCenterY = (touch1.clientY + touch2.clientY) / 2;
    }

    handlePinchMove(e) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = this.getTouchDistance(touch1, touch2);

        if (this.pinchStartDistance && this.pinchStartZoom) {
            const zoomFactor = currentDistance / this.pinchStartDistance;
            let newZoom = this.pinchStartZoom * zoomFactor;

            // Limit zoom levels
            const minZoom = 0.1;
            const maxZoom = 10;
            newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

            // Only update if zoom changed significantly
            if (Math.abs(newZoom - this.zoomLevel) > 0.01) {
                this.zoomLevel = newZoom;
                this.updateViewBox();
            }
        }
    }

    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // === UTILITY METHODS ===
    screenToSvg(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = x - rect.left;
        const mouseY = y - rect.top;

        const viewBoxWidth = rect.width / this.zoomLevel;
        const viewBoxHeight = rect.height / this.zoomLevel;
        const viewBoxX = this.panX - viewBoxWidth / 2;
        const viewBoxY = this.panY - viewBoxHeight / 2;

        const svgX = viewBoxX + (mouseX / rect.width) * viewBoxWidth;
        const svgY = viewBoxY + (mouseY / rect.height) * viewBoxHeight;

        return { x: svgX, y: svgY };
    }

    /**
     * Snaps a value to the nearest grid line.
     * @param {Number} value - The value to snap.
     * @returns {Number} The snapped value.
     */
    snapToGrid(value) {
        return Math.round(value / this.config.gridSize) * this.config.gridSize;
    }

    // Получение слоя по имени
    getLayer(name) {
        return this.layers[name];
    }

    // Очистка слоя
    clearLayer(name) {
        if (this.layers[name]) {
            this.layers[name].innerHTML = "";
        }
    }

    // Добавление элемента в слой
    addToLayer(name, element) {
        if (this.layers[name]) {
            this.layers[name].appendChild(element);
        }
    }

    // Удаление элемента из слоя
    removeFromLayer(name, element) {
        if (this.layers[name] && element.parentNode === this.layers[name]) {
            this.layers[name].removeChild(element);
        }
    }

    // Обновление размеров канваса на основе контейнера
    updateCanvasSize() {
        const container = this.canvas.parentElement;
        if (container) {
            // Use clientWidth/Height to get content area dimensions (excluding padding)
            const width = container.clientWidth;
            const height = container.clientHeight;

            // If container is hidden (display: none), dimensions will be 0
            // Use previous values or defaults to avoid NaN
            this.canvasParameters = {
                width:
                    width > 0
                        ? width
                        : this.canvasParameters?.width ||
                          this.config.width ||
                          800,
                height:
                    height > 0
                        ? height
                        : this.canvasParameters?.height ||
                          this.config.height ||
                          600,
            };
        } else {
            // Fallback to default if no container
            this.canvasParameters = {
                width: this.config.width || 800,
                height: this.config.height || 600,
            };
        }
    }

    // Изменение размера канваса (вызывается при resize окна)
    resize() {
        this.updateCanvasSize();

        this.updateViewBox();
    }
}

export default CanvasManager;
