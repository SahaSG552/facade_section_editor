/**
 * PaperBooleanProcessor - замена makerProcessor.js
 * Использует Paper.js для булевых операций вместо maker.js
 *
 * Преимущества:
 * - Намного меньше кода (~50 строк вместо 234)
 * - Быстрее выполнение
 * - Лучшая обработка edge cases
 * - Нет необходимости в промежуточном SVG парсинге
 */

import paper from "paper";

/**
 * Извлечь path data из SVG элемента
 */
function extractPathData(element) {
    if (!element) return null;

    const tagName = element.tagName.toLowerCase();

    if (tagName === "path") {
        return element.getAttribute("d");
    } else if (tagName === "rect") {
        const x = parseFloat(element.getAttribute("x")) || 0;
        const y = parseFloat(element.getAttribute("y")) || 0;
        const width = parseFloat(element.getAttribute("width")) || 0;
        const height = parseFloat(element.getAttribute("height")) || 0;
        return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${
            y + height
        } L ${x} ${y + height} Z`;
    } else if (tagName === "polygon") {
        const points = element.getAttribute("points").trim().split(/\s+/);
        const coords = [];
        for (let i = 0; i < points.length; i += 2) {
            coords.push(`${points[i]},${points[i + 1]}`);
        }
        return `M ${coords.join(" L ")} Z`;
    } else if (tagName === "circle") {
        const cx = parseFloat(element.getAttribute("cx")) || 0;
        const cy = parseFloat(element.getAttribute("cy")) || 0;
        const r = parseFloat(element.getAttribute("r")) || 0;
        // Создаём path для круга
        return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${
            cx + r
        } ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
    } else {
        return element.getAttribute("d") || null;
    }
}

/**
 * Создать Paper.js path из SVG элемента с учётом transform
 */
function createPaperPath(obj, options = {}) {
    let element,
        moveX = 0,
        moveY = 0;

    // Определяем элемент и его трансформацию
    if (obj.group) {
        // bit object
        element = obj.group.querySelector(".bit-shape");
        const transform = obj.group.getAttribute("transform");
        if (transform) {
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
                moveX = parseFloat(match[1]);
                moveY = parseFloat(match[2]); // Не инвертируем Y для Paper.js
            }
        }
    } else {
        // panel element
        element = obj;
        moveX = options.x || 0;
        moveY = options.y || 0;
    }

    const pathData = extractPathData(element);
    if (!pathData) return null;

    try {
        // Создаём Paper.js path из SVG path data
        const path = new paper.Path(pathData);

        // Применяем трансформацию
        if (moveX !== 0 || moveY !== 0) {
            path.translate(new paper.Point(moveX, moveY));
        }

        return path;
    } catch (error) {
        console.error("Failed to create Paper.js path:", error);
        return null;
    }
}

/**
 * Создать extension прямоугольник для бита, если он выходит за границы материала
 */
function createBitExtension(bitObj, materialTopY, materialBottomY) {
    if (!bitObj.group) return null;

    const element = bitObj.group.querySelector(".bit-shape");
    if (!element) return null;

    // Получаем позицию бита
    const transform = bitObj.group.getAttribute("transform");
    let bitX = 0,
        bitY = 0;
    if (transform) {
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
            bitX = parseFloat(match[1]);
            bitY = parseFloat(match[2]);
        }
    }

    // Получаем bounding box бита
    let bbox;
    try {
        bbox = element.getBBox();
    } catch (e) {
        console.error("Failed to get bbox for extension:", e);
        return null;
    }

    const bitWidth = bbox.width;
    const bitTopY = bitY + bbox.y; // Верх бита в canvas координатах
    const bitBottomY = bitY; // Низ бита (кончик)

    // Получаем данные бита для проверки shank collision
    const bitData = bitObj.bitData || (bitObj.group && bitObj.group.__bitData);
    let extensionWidth = bitWidth;
    let hasShankCollision = false;

    // Проверяем выходит ли верх бита за поверхность материала (ниже materialTopY в SVG координатах)
    if (bitTopY > materialTopY) {
        // Проверяем shank collision (если shank шире чем бит)
        if (bitData && bitData.shankDiameter && bitData.diameter) {
            const shankDiameter = parseFloat(bitData.shankDiameter);
            const bitDiameter = parseFloat(bitData.diameter);

            if (shankDiameter > bitDiameter) {
                const scale = bitWidth / bitDiameter;
                extensionWidth = shankDiameter * scale;
                hasShankCollision = true;
            }
        }

        // Создаём прямоугольник от materialTopY до bitTopY
        // Добавляем небольшой overlap только если нет shank collision
        // При shank collision точность важнее (не должно съедать лишнее)
        const overlap = 0.001;
        const rectHeight = bitTopY - materialTopY + overlap;
        const widthOffset = hasShankCollision
            ? (bitWidth - extensionWidth) / 2
            : 0;
        const rectX = bitX + bbox.x + widthOffset;
        const rectY = materialTopY;

        // Создаём прямоугольник extension в Paper.js
        const extensionRect = new paper.Path.Rectangle({
            point: [rectX, rectY],
            size: [extensionWidth, rectHeight],
        });

        console.log("Created Paper.js bit extension:", {
            bitId: bitData?.id,
            rectX,
            rectY,
            extensionWidth,
            rectHeight,
            hasShankCollision,
            bitTopY,
            bitBottomY,
            materialTopY,
            bboxY: bbox.y,
            bitY: bitY,
            overlap: overlap,
            "extension overlaps bit by": rectY + rectHeight - bitTopY,
        });

        return extensionRect;
    }

    return null;
}

/**
 * Создать прямоугольник заполнения кармана между основной и фантомной фрезой
 * Это узкое расширение по ширине пocketOffset между двумя фрезами
 */
function createPocketFill(bitObj, materialTopY, materialBottomY) {
    if (!bitObj.group) return null;

    const element = bitObj.group.querySelector(".bit-shape");
    if (!element) return null;

    // Позиция бита
    const transform = bitObj.group.getAttribute("transform");
    let bitX = 0,
        bitY = 0;
    if (transform) {
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
            bitX = parseFloat(match[1]);
            bitY = parseFloat(match[2]);
        }
    }

    // Bounding box
    let bbox;
    try {
        bbox = element.getBBox();
    } catch (e) {
        console.error("Failed to get bbox for pocket fill:", e);
        return null;
    }

    const bitWidth = bbox.width;
    const pocketOffset = bitObj.pocketOffset || 0;

    // Не показывать если нет кармана
    if (pocketOffset <= 0) return null;

    // Геометрия прямоугольника между основной и фантомной фрезой
    // От центра основной фрезы (bitX + bitWidth/2) на ширину pocketOffset
    // По высоте весь бит (от bbox.y до bbox.y + bbox.height)
    const pocketFillX = bitX + bbox.x + bitWidth / 2; // От центра основной
    const pocketFillY = bitY + bbox.y; // От верха бита
    const pocketFillWidth = pocketOffset; // Ширина = смещению фантома
    const pocketFillHeight = Math.abs(bbox.height); // Высота бита

    const pocketFill = new paper.Path.Rectangle({
        point: [pocketFillX, pocketFillY],
        size: [pocketFillWidth, pocketFillHeight],
    });

    return pocketFill;
}

/**
 * Создать прямоугольник расширения кармана (оранжевый) для операции PO
 * Прямоугольник тянется от левого края основной фрезы до левого края + ширина + пocketOffset
 * по высоте от поверхности материала до вершины фрезы.
 */
function createPocketExpansion(bitObj, materialTopY, materialBottomY) {
    if (!bitObj.group) return null;

    const element = bitObj.group.querySelector(".bit-shape");
    if (!element) return null;

    // Позиция бита
    const transform = bitObj.group.getAttribute("transform");
    let bitX = 0,
        bitY = 0;
    if (transform) {
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
            bitX = parseFloat(match[1]);
            bitY = parseFloat(match[2]);
        }
    }

    // Bounding box
    let bbox;
    try {
        bbox = element.getBBox();
    } catch (e) {
        console.error("Failed to get bbox for pocket expansion:", e);
        return null;
    }

    const bitWidth = bbox.width;
    const bitTopY = bitY + bbox.y; // верх фрезы в canvas координатах

    // Показывать расширение только если вершина фрезы ниже поверхности материала
    if (bitTopY <= materialTopY) return null;

    const pocketOffset = bitObj.pocketOffset || 0;
    if (pocketOffset <= 0) return null; // Не показывать если нет кармана

    // Геометрия оранжевого расширения (как в ExtensionCalculator)
    // От левого края основной фрезы до левого края + ширина + пocketOffset
    const mainBitLeft = bitX + bbox.x;
    const expansionWidth = bitWidth + pocketOffset; // ширина фрезы + смещение фантома
    const overlap = 0.001;
    const rectHeight = bitTopY - materialTopY + overlap;
    const rectX = mainBitLeft;
    const rectY = materialTopY;

    const expansionRect = new paper.Path.Rectangle({
        point: [rectX, rectY],
        size: [expansionWidth, rectHeight],
    });

    return expansionRect;
}

/**
 * Главная функция: вычислить результирующий полигон панели после вычитания битов
 *
 * @param {HTMLElement} panelSection - Элемент панели
 * @param {Array} bitsOnCanvas - Массив битов на canvas
 * @param {Array} phantomBits - Массив phantom битов (для V-Carve)
 * @returns {string} SVG path data результата
 */
export function paperCalculateResultPolygon(
    panelSection,
    bitsOnCanvas,
    phantomBits = []
) {
    // Создаём временный Paper.js project для вычислений
    // (не путать с основным canvas)
    const tempCanvas = document.createElement("canvas");
    paper.setup(tempCanvas);

    try {
        // 1. Создаём панель
        const panelPath = createPaperPath(panelSection, { x: 0, y: 0 });
        if (!panelPath) {
            console.error("Failed to create panel path");
            return "";
        }

        // Получаем границы материала для extensions
        const materialTopY = parseFloat(panelSection.getAttribute("y")) || 0;
        const sectionHeight =
            parseFloat(panelSection.getAttribute("height")) || 0;
        const materialBottomY = materialTopY + sectionHeight;

        // 2. Собираем все bit paths
        const bitPaths = [];

        // Regular bits
        for (const bit of bitsOnCanvas) {
            const bitPath = createPaperPath(bit);
            if (!bitPath) continue;

            // Extension если нужен
            const extension = createBitExtension(
                bit,
                materialTopY,
                materialBottomY
            );

            // Расширение кармана (оранжевое) для PO
            let pocketExpansion = null;
            let pocketFill = null;
            if (bit.operation === "PO") {
                pocketExpansion = createPocketExpansion(
                    bit,
                    materialTopY,
                    materialBottomY
                );
                pocketFill = createPocketFill(
                    bit,
                    materialTopY,
                    materialBottomY
                );
            }

            if (extension) {
                console.log("Uniting bit with extension:", {
                    bitId: bit.bitData?.id,
                    bitBounds: bitPath.bounds,
                    extensionBounds: extension.bounds,
                    overlap: extension.bounds.intersects(bitPath.bounds),
                });

                // Объединяем бит с его extension сразу, чтобы не было линии между ними
                let united = bitPath.unite(extension);
                bitPath.remove();
                extension.remove();

                // Если есть расширение кармана, добавим его
                if (pocketExpansion) {
                    united = united.unite(pocketExpansion);
                    pocketExpansion.remove();
                }

                // Добавляем заполнение кармана
                if (pocketFill) {
                    united = united.unite(pocketFill);
                    pocketFill.remove();
                }

                console.log("United result bounds:", united.bounds);

                bitPaths.push(united);
            } else {
                // Если нет вертикального extension, но есть карман, объединяем с ним
                let united = bitPath;
                if (pocketExpansion) {
                    united = united.unite(pocketExpansion);
                    pocketExpansion.remove();
                }
                if (pocketFill) {
                    united = united.unite(pocketFill);
                    pocketFill.remove();
                }
                if (pocketExpansion || pocketFill) {
                    bitPath.remove();
                }
                bitPaths.push(united);
            }
        }

        // Phantom bits
        for (const phantom of phantomBits) {
            const phantomPath = createPaperPath(phantom);
            if (!phantomPath) continue;

            // Extension если нужен
            const extension = createBitExtension(
                phantom,
                materialTopY,
                materialBottomY
            );

            if (extension) {
                // Объединяем phantom с его extension
                const phantomWithExtension = phantomPath.unite(extension);
                phantomPath.remove();
                extension.remove();
                bitPaths.push(phantomWithExtension);
            } else {
                bitPaths.push(phantomPath);
            }
        }

        // Если нет битов, возвращаем панель как есть
        if (bitPaths.length === 0) {
            const pathData = panelPath.pathData;
            panelPath.remove();
            return pathData;
        }

        // 3. Объединяем все биты в один path (union)
        let bitsUnion = bitPaths[0];
        for (let i = 1; i < bitPaths.length; i++) {
            const united = bitsUnion.unite(bitPaths[i]);
            // Удаляем старые paths чтобы не засорять memory
            if (i > 1) bitsUnion.remove();
            bitPaths[i].remove();
            bitsUnion = united;
        }

        // 4. Вычитаем объединённые биты из панели (subtract)
        const result = panelPath.subtract(bitsUnion);

        // 5. Получаем SVG path data
        const pathData = result.pathData;

        // Cleanup
        panelPath.remove();
        bitsUnion.remove();
        result.remove();

        return pathData;
    } catch (error) {
        console.error("Paper.js boolean operation failed:", error);
        return "";
    } finally {
        // Cleanup temporary project
        paper.project.clear();
        paper.project.remove();
    }
}

/**
 * Вспомогательная функция для отладки: визуализировать промежуточные шаги
 */
export function paperCalculateResultPolygonDebug(
    panelSection,
    bitsOnCanvas,
    phantomBits = []
) {
    const result = {
        panelPath: null,
        bitPaths: [],
        bitsUnion: null,
        result: null,
        pathData: "",
    };

    const tempCanvas = document.createElement("canvas");
    paper.setup(tempCanvas);

    try {
        result.panelPath = createPaperPath(panelSection, { x: 0, y: 0 });

        const materialTopY = parseFloat(panelSection.getAttribute("y")) || 0;
        const sectionHeight =
            parseFloat(panelSection.getAttribute("height")) || 0;
        const materialBottomY = materialTopY + sectionHeight;

        for (const bit of bitsOnCanvas) {
            const bitPath = createPaperPath(bit);
            if (bitPath) result.bitPaths.push(bitPath);

            const extension = createBitExtension(
                bit,
                materialTopY,
                materialBottomY
            );
            if (extension) result.bitPaths.push(extension);

            // Добавляем расширение кармана для PO в отладочную визуализацию
            if (bit.operation === "PO") {
                const pocketExpansion = createPocketExpansion(
                    bit,
                    materialTopY,
                    materialBottomY
                );
                if (pocketExpansion) result.bitPaths.push(pocketExpansion);

                const pocketFill = createPocketFill(
                    bit,
                    materialTopY,
                    materialBottomY
                );
                if (pocketFill) result.bitPaths.push(pocketFill);
            }
        }

        if (result.bitPaths.length > 0) {
            result.bitsUnion = result.bitPaths[0];
            for (let i = 1; i < result.bitPaths.length; i++) {
                result.bitsUnion = result.bitsUnion.unite(result.bitPaths[i]);
            }

            result.result = result.panelPath.subtract(result.bitsUnion);
            result.pathData = result.result.pathData;
        } else {
            result.pathData = result.panelPath.pathData;
        }

        return result;
    } catch (error) {
        console.error("Paper.js boolean operation (debug) failed:", error);
        return result;
    }
}

export default paperCalculateResultPolygon;
