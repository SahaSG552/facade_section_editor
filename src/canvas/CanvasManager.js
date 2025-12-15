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

        // Calculate offset - grid start point aligned to anchor or pan
        let startX =
            this.config.anchorX !== null
                ? this.config.anchorX
                : this.config.panX;
        let startY =
            this.config.anchorY !== null
                ? this.config.anchorY
                : this.config.panY;
        let xOffset = startX - 0.5;
        let yOffset = startY - 0.5;

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
        this.gridLayer.appendChild(rect);
    }
}

// CanvasManager - унифицированный класс для работы с SVG канвасами
import { getSVGBounds } from "../utils/utils.js";

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
        this.canvasParameters = {
            width: this.config.width,
            height: this.config.height,
        };

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

        // Начальная настройка viewBox
        this.updateViewBox();
    }

    setupMouseEvents() {
        if (this.config.enableZoom) {
            this.canvas.addEventListener("wheel", this.handleZoom.bind(this), {
                passive: false,
            });
        }

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
        const viewBoxWidth = this.canvasParameters.width / this.zoomLevel;
        const viewBoxHeight = this.canvasParameters.height / this.zoomLevel;
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

        // Main grid renderer
        const mainGridConfig = {
            id: "grid",
            size: effectiveGridSize,
            color: "#e0e0e0",
            thickness: thickness,
            anchorX: this.config.gridAnchorX,
            anchorY: this.config.gridAnchorY,
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

        // Auxiliary grid renderer (10x spacing, thicker and darker lines)
        const auxGridSize = effectiveGridSize * 10;
        const auxGridConfig = {
            id: "aux-grid",
            size: auxGridSize,
            color: "#5f5959ff",
            thickness: thickness * 2,
            anchorX: this.config.gridAnchorX,
            anchorY: this.config.gridAnchorY,
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
        if (!bounds) {
            // По умолчанию вписываем весь канвас
            this.zoomLevel = 1;
            this.panX = this.canvasParameters.width / 2;
            this.panY = this.canvasParameters.height / 2;
        } else {
            // Вписываем заданные границы
            const { minX, maxX, minY, maxY, padding = 20 } = bounds;
            const contentWidth = maxX - minX + 2 * padding;
            const contentHeight = maxY - minY + 2 * padding;

            const zoomX = this.canvasParameters.width / contentWidth;
            const zoomY = this.canvasParameters.height / contentHeight;
            this.zoomLevel = Math.min(zoomX, zoomY);

            this.panX = (minX + maxX) / 2;
            this.panY = (minY + maxY) / 2;
        }

        this.updateViewBox();
    }

    fitToSVGElement(svgElement, padding = 20) {
        const bounds = getSVGBounds(svgElement);
        this.fitToScale({
            minX: bounds.centerX - bounds.width / 2,
            maxX: bounds.centerX + bounds.width / 2,
            minY: bounds.centerY - bounds.height / 2,
            maxY: bounds.centerY + bounds.height / 2,
            padding: padding,
        });
    }

    updateViewBox() {
        const viewBoxWidth = this.canvasParameters.width / this.zoomLevel;
        const viewBoxHeight = this.canvasParameters.height / this.zoomLevel;
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

        const oldViewBoxWidth = this.canvasParameters.width / oldZoom;
        const oldViewBoxHeight = this.canvasParameters.height / oldZoom;
        const oldViewBoxX = this.panX - oldViewBoxWidth / 2;
        const oldViewBoxY = this.panY - oldViewBoxHeight / 2;

        const svgX = oldViewBoxX + (mouseX / rect.width) * oldViewBoxWidth;
        const svgY = oldViewBoxY + (mouseY / rect.height) * oldViewBoxHeight;

        const newViewBoxWidth = this.canvasParameters.width / this.zoomLevel;
        const newViewBoxHeight = this.canvasParameters.height / this.zoomLevel;

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

    // === UTILITY METHODS ===
    screenToSvg(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = x - rect.left;
        const mouseY = y - rect.top;

        const viewBoxWidth = this.canvasParameters.width / this.zoomLevel;
        const viewBoxHeight = this.canvasParameters.height / this.zoomLevel;
        const viewBoxX = this.panX - viewBoxWidth / 2;
        const viewBoxY = this.panY - viewBoxHeight / 2;

        const svgX = viewBoxX + (mouseX / rect.width) * viewBoxWidth;
        const svgY = viewBoxY + (mouseY / rect.height) * viewBoxHeight;

        return { x: svgX, y: svgY };
    }

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
}

export default CanvasManager;
