const makerjs = require("makerjs");

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
    } else {
        // For other shapes, try to get d if present, otherwise skip
        return element.getAttribute("d") || null;
    }
}

function createPathData(obj, options = {}) {
    let element,
        moveX = 0,
        moveY = 0;

    if (obj.group) {
        // bit object
        element = obj.group.querySelector(".bit-shape");
        const transform = obj.group.getAttribute("transform");
        if (transform) {
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
                moveX = parseFloat(match[1]);
                moveY = -parseFloat(match[2]);
            }
        }
    } else {
        // panel element
        element = obj;
        moveX = options.x || 0;
        moveY = options.y || 0;
    }

    const d = extractPathData(element);
    if (!d) return null;

    const model = makerjs.importer.fromSVGPathData(d);
    if (moveX !== 0 || moveY !== 0) {
        makerjs.model.move(model, [moveX, moveY]);
    }
    return model;
}

function makerCalculateResultPolygon(
    panelWidth,
    panelThickness,
    panelX,
    panelY,
    bitsOnCanvas
) {
    const panelSection = document.getElementById("panel-section");
    const panelModel = createPathData(panelSection, {
        x: 0,
        y: 0,
    });

    if (!panelModel) {
        console.error("Failed to create panel model");
        return "";
    }
    const bitModels = bitsOnCanvas
        .map((bit) => createPathData(bit))
        .filter((m) => m);

    if (bitModels.length === 0) {
        // No bits, return panel as is
        const svg = makerjs.exporter.toSVG(panelModel);
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, "image/svg+xml");
        const path = doc.querySelector("path");
        return path ? path.getAttribute("d") : "";
    }

    let unionBits = bitModels[0];
    for (let i = 1; i < bitModels.length; i++) {
        unionBits = makerjs.model.combineUnion(unionBits, bitModels[i]);
    }

    // Создаём контейнер-модель с origin в [0, 0]
    const container = {
        origin: [0, 0], // Глобальный origin
        models: {
            main: panelModel,
            subtract: unionBits,
        },
    };
    const result = makerjs.model.combineSubtraction(
        container.models.main,
        container.models.subtract
    );
    // Устанавливаем origin результата (если нужно дополнительное смещение)
    //result.origin = [panelX, panelY]; // Или любое, чтобы подвинуть весь результат
    const svg = makerjs.exporter.toSVG(result);
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const path = doc.querySelector("path");
    return path ? path.getAttribute("d") : "";
}

export { makerCalculateResultPolygon };
