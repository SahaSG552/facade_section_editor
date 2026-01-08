/**
 * PaperOffsetProcessor - замена offsetCalculator.js
 * Использует paperjs-offset библиотеку вместо 225 строк кастомного кода
 *
 * Важно: paperjs-offset сохраняет кривые Безье (не преобразует в полилинии)
 * Это критично для работы с геометрией содержащей арки и кривые
 *
 * GitHub: https://github.com/glenzli/paperjs-offset
 *
 * Преимущества:
 * - 1 вызов функции вместо 225 строк кода
 * - Автоматическая обработка self-intersections
 * - Правильная обработка holes
 * - Корректные corner joins (miter, bevel, round)
 * - Сохраняет кривые Безье (не превращает в полилинии)
 */

import paper from "paper";
import { PaperOffset } from "paperjs-offset";
import { approximatePath } from "../utils/arcApproximation.js";
/**
 * Импортировать SVG элемент в Paper.js path
 * Поддерживает path (с кривыми) и rect
 * @param {SVGElement} svgElement - SVG элемент
 * @returns {paper.Path} Paper.js path
 */
function importSVGtoPaper(svgElement) {
    if (!svgElement) return null;

    // Для path с атрибутом 'd' - создаём напрямую из path data
    if (svgElement.tagName === "path" && svgElement.hasAttribute("d")) {
        const pathData = svgElement.getAttribute("d");
        return new paper.Path(pathData);
    }

    // Для rect - создаём прямоугольник
    if (svgElement.tagName === "rect") {
        const x = parseFloat(svgElement.getAttribute("x")) || 0;
        const y = parseFloat(svgElement.getAttribute("y")) || 0;
        const width = parseFloat(svgElement.getAttribute("width")) || 0;
        const height = parseFloat(svgElement.getAttribute("height")) || 0;

        return new paper.Path.Rectangle({
            point: [x, y],
            size: [width, height],
        });
    }

    return null;
}

/**
 * Вычислить offset для SVG элемента используя paperjs-offset
 * КЛЮЧЕВОЙ МЕТОД: SVG → Paper.js → offset → SVG path data
 *
 * @param {SVGElement} svgElement - SVG элемент (rect или path с кривыми)
 * @param {number} offset - Расстояние offset (наш -7 = paper +7, инвертировано)
 * @param {Object} options - Опции:
 *   - join: 'miter', 'bevel', 'round' (default 'miter')
 *   - cap: 'butt', 'round' (default 'butt')
 *   - limit: miter limit (default 10)
 *   - useArcApproximation: если true, применяет аппроксимацию Безье → Арки
 *   - arcTolerance: RMS tolerance для аппроксимации в мм (default 0.15)
 *   - exportModule: экземпляр ExportModule для аппроксимации
 * @returns {string} SVG path data (с кривыми Безье или аппроксимированными дугами)
 */
export function calculateOffsetFromSVG(svgElement, offset, options = {}) {
    if (!svgElement) {
        console.warn("calculateOffsetFromSVG: no SVG element provided");
        return "";
    }

    // Создаём временный Paper.js project
    const tempCanvas = document.createElement("canvas");
    paper.setup(tempCanvas);

    try {
        // Импортируем SVG элемент в Paper.js (сохраняет кривые!)
        const originalPath = importSVGtoPaper(svgElement);
        if (!originalPath) {
            console.error("Failed to import SVG element to Paper.js");
            return "";
        }

        // DEBUG: Показываем контрольные точки оригинального пути
        if (options.debug) {
            originalPath.selected = true;
            console.log(
                "Original path segments:",
                originalPath.segments.length
            );
            originalPath.segments.forEach((seg, i) => {
                console.log(`Segment ${i}:`, {
                    point: seg.point.toString(),
                    handleIn: seg.handleIn.toString(),
                    handleOut: seg.handleOut.toString(),
                });
            });
        }

        // Применяем offset с опциями
        // ВАЖНО: знак инвертирован (наш -7 = paper +7)
        const offsetOptions = {
            join: options.join || "miter", // 'miter', 'bevel', 'round'
            cap: options.cap || "butt", // 'butt', 'round'
            limit: options.limit || 10, // miter limit
            insert: false, // не добавляем в canvas
        };

        const offsetPath = PaperOffset.offset(
            originalPath,
            -offset,
            offsetOptions
        );

        if (!offsetPath) {
            console.warn("PaperOffset.offset returned null");
            originalPath.remove();
            return "";
        }

        // Экспортируем Paper.js path → SVG path data (сохраняет кривые!)
        let pathData = offsetPath.pathData;

        // Применяем аппроксимацию Безье → Арки если включена опция
        if (options.useArcApproximation && options.exportModule) {
            const tolerance = options.arcTolerance || 0.15; // default 0.15mm RMS tolerance
            pathData = approximatePath(
                pathData,
                options.exportModule,
                tolerance
            );
        }

        // Cleanup (если не debug режим)
        if (!options.debug) {
            originalPath.remove();
            offsetPath.remove();
        }

        return pathData;
    } catch (error) {
        console.error("paperjs-offset failed:", error);
        return "";
    } finally {
        // Cleanup
        try {
            if (paper.project) {
                paper.project.clear();
                paper.project.remove();
            }
        } catch (e) {
            // Ignore
        }
    }
}

/**
 * Класс для вычисления offset с использованием paperjs-offset
 * Сохраняет кривые Безье или аппроксимирует их в дуги
 */
export class PaperOffsetCalculator {
    constructor(options = {}) {
        this.options = options; // Опции: {join, cap, limit, useArcApproximation, arcTolerance, exportModule}
    }

    /**
     * Вычислить offset для SVG элемента (сохраняет кривые или аппроксимирует в дуги)
     * @param {SVGElement} svgElement - SVG rect или path элемент
     * @param {number} offset - Расстояние offset
     * @returns {string} SVG path data (с кривыми или дугами)
     */
    calculateOffsetFromSVG(svgElement, offset) {
        return calculateOffsetFromSVG(svgElement, offset, this.options);
    }
}

export default PaperOffsetCalculator;
