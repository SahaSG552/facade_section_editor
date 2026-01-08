/**
 * PaperCanvasManager - управляет Paper.js canvas
 * Параллельная реализация для постепенной миграции с SVG на Paper.js
 */

import paper from "paper";

export class PaperCanvasManager {
    constructor(canvasId = "paper-canvas") {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element #${canvasId} not found`);
            return;
        }

        // Инициализация Paper.js
        paper.setup(this.canvas);
        this.project = paper.project;
        this.view = paper.view;

        // Создаем слои (аналогично SVG слоям)
        this.layers = {
            grid: new paper.Layer({ name: "grid" }),
            shapes: new paper.Layer({ name: "shapes" }),
            offsets: new paper.Layer({ name: "offsets" }),
            bits: new paper.Layer({ name: "bits" }),
            phantom: new paper.Layer({ name: "phantom" }),
            overlay: new paper.Layer({ name: "overlay" }),
        };

        // Активируем слой shapes по умолчанию
        this.layers.shapes.activate();

        // Настройка view
        this.setupView();

        // Данные
        this.panelPath = null;
        this.bitPaths = [];
        this.offsetPaths = [];

        console.log("PaperCanvasManager initialized");
    }

    setupView() {
        // Центрируем view
        this.view.center = new paper.Point(0, 0);

        // Устанавливаем начальный масштаб
        this.view.zoom = 1;

        // Настройка событий
        this.setupEvents();
    }

    setupEvents() {
        // Обработка изменения размера
        this.view.onResize = () => {
            this.handleResize();
        };

        // Можно добавить обработку мыши для zoom/pan
        // Пока оставляем пустым, добавим позже
    }

    handleResize() {
        // Перерисовываем при изменении размера
        this.view.update();
    }

    /**
     * Создать панель (прямоугольник)
     */
    createPanel(width, height, thickness) {
        this.layers.shapes.activate();

        // Удаляем старую панель если есть
        if (this.panelPath) {
            this.panelPath.remove();
        }

        // Создаем новый прямоугольник
        this.panelPath = new paper.Path.Rectangle({
            point: [0, 0],
            size: [width, thickness],
            strokeColor: "black",
            strokeWidth: 1,
            fillColor: null,
        });

        this.view.update();
        console.log(`Panel created: ${width}x${thickness}`);
    }

    /**
     * Добавить bit (инструмент)
     */
    addBit(bitData) {
        this.layers.bits.activate();

        // Создаем простой круг для демонстрации
        // В будущем здесь будет полная реализация всех типов bit shapes
        const bitPath = new paper.Path.Circle({
            center: [bitData.x || 0, bitData.y || 0],
            radius: bitData.diameter ? bitData.diameter / 2 : 5,
            strokeColor: "red",
            strokeWidth: 1,
            fillColor: null,
        });

        bitPath.data.bitId = bitData.id;
        this.bitPaths.push(bitPath);

        this.view.update();
        console.log(`Bit added: ${bitData.id}`);
    }

    /**
     * Создать offset контур
     */
    createOffset(path, distance) {
        if (!path) return null;

        this.layers.offsets.activate();

        // Paper.js magic! Один метод вместо 225 строк кода
        const offsetPath = path.offset(distance);

        if (offsetPath) {
            offsetPath.strokeColor = "blue";
            offsetPath.strokeWidth = 1;
            offsetPath.dashArray = [4, 2];
            offsetPath.fillColor = null;

            this.offsetPaths.push(offsetPath);
            this.view.update();

            console.log(`Offset created: distance=${distance}`);
            return offsetPath;
        }

        return null;
    }

    /**
     * Булева операция: вычитание
     */
    subtractPaths(path1, path2) {
        if (!path1 || !path2) return null;

        // Paper.js boolean operations
        const result = path1.subtract(path2);

        if (result) {
            result.strokeColor = "green";
            result.strokeWidth = 2;
            result.fillColor = null;
        }

        this.view.update();
        return result;
    }

    /**
     * Булева операция: объединение
     */
    unitePaths(paths) {
        if (!paths || paths.length === 0) return null;

        let result = paths[0].clone();

        for (let i = 1; i < paths.length; i++) {
            const united = result.unite(paths[i]);
            result.remove();
            result = united;
        }

        this.view.update();
        return result;
    }

    /**
     * Очистить всё
     */
    clear() {
        Object.values(this.layers).forEach((layer) => {
            layer.removeChildren();
        });

        this.panelPath = null;
        this.bitPaths = [];
        this.offsetPaths = [];

        this.view.update();
        console.log("Paper canvas cleared");
    }

    /**
     * Очистить только bits
     */
    clearBits() {
        this.layers.bits.removeChildren();
        this.bitPaths = [];
        this.view.update();
    }

    /**
     * Очистить только offsets
     */
    clearOffsets() {
        this.layers.offsets.removeChildren();
        this.offsetPaths = [];
        this.view.update();
    }

    /**
     * Zoom и Pan методы
     */
    zoomIn(factor = 1.2) {
        this.view.zoom *= factor;
        this.view.update();
    }

    zoomOut(factor = 1.2) {
        this.view.zoom /= factor;
        this.view.update();
    }

    fitToView() {
        // Получаем bounds всех видимых элементов
        const bounds = this.project.activeLayer.bounds;

        if (bounds.width > 0 && bounds.height > 0) {
            const viewSize = this.view.size;
            const scale =
                Math.min(
                    viewSize.width / bounds.width,
                    viewSize.height / bounds.height
                ) * 0.9; // 90% от view для отступов

            this.view.zoom = scale;
            this.view.center = bounds.center;
            this.view.update();
        }
    }

    pan(dx, dy) {
        this.view.center = this.view.center.add(new paper.Point(-dx, -dy));
        this.view.update();
    }

    /**
     * Export в SVG
     */
    exportSVG() {
        return this.project.exportSVG({ asString: true });
    }

    /**
     * Export path data (для Three.js)
     */
    exportPathData() {
        if (this.panelPath) {
            return this.panelPath.pathData;
        }
        return null;
    }

    /**
     * Отрисовать сетку
     */
    drawGrid(spacing = 10, color = "#e0e0e0") {
        this.layers.grid.activate();
        this.layers.grid.removeChildren();

        const bounds = this.view.bounds;
        const gridGroup = new paper.Group();

        // Вертикальные линии
        for (
            let x = Math.floor(bounds.left / spacing) * spacing;
            x < bounds.right;
            x += spacing
        ) {
            const line = new paper.Path.Line({
                from: [x, bounds.top],
                to: [x, bounds.bottom],
                strokeColor: color,
                strokeWidth: 0.5,
            });
            gridGroup.addChild(line);
        }

        // Горизонтальные линии
        for (
            let y = Math.floor(bounds.top / spacing) * spacing;
            y < bounds.bottom;
            y += spacing
        ) {
            const line = new paper.Path.Line({
                from: [bounds.left, y],
                to: [bounds.right, y],
                strokeColor: color,
                strokeWidth: 0.5,
            });
            gridGroup.addChild(line);
        }

        this.view.update();
    }

    /**
     * Демо: показать возможности Paper.js
     */
    demo() {
        console.log("Paper.js Demo");

        // Создаем панель
        this.createPanel(200, 18, 0);

        // Добавляем несколько bits
        this.addBit({ id: "bit1", x: 50, y: 9, diameter: 10 });
        this.addBit({ id: "bit2", x: 100, y: 9, diameter: 15 });
        this.addBit({ id: "bit3", x: 150, y: 9, diameter: 12 });

        // Создаем offset от панели
        if (this.panelPath) {
            this.createOffset(this.panelPath, -2); // inward offset
            this.createOffset(this.panelPath, 2); // outward offset
        }

        // Fit to view
        setTimeout(() => {
            this.fitToView();
        }, 100);
    }
}

export default PaperCanvasManager;
