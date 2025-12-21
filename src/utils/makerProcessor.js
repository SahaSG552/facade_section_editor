const makerjs = require("makerjs");

function createPanelModel(panelWidth, panelThickness, panelX, panelY) {
    const model = new makerjs.models.Rectangle(panelWidth, panelThickness);
    makerjs.model.move(model, [panelX, -panelY - panelThickness]);
    return model;
}

function createBitModel(bit) {
    const shape = bit.group.querySelector(".bit-shape");
    if (!shape) return null;

    const transform = bit.group.getAttribute("transform");
    let dx = 0,
        dy = 0;
    if (transform) {
        const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
        if (match) {
            dx = parseFloat(match[1]);
            dy = parseFloat(match[2]);
        }
    }

    let pathData;
    const tagName = shape.tagName.toLowerCase();
    if (tagName === "path") {
        pathData = shape.getAttribute("d");
    } else if (tagName === "rect") {
        const x = parseFloat(shape.getAttribute("x")) || 0;
        const y = parseFloat(shape.getAttribute("y")) || 0;
        const width = parseFloat(shape.getAttribute("width")) || 0;
        const height = parseFloat(shape.getAttribute("height")) || 0;
        pathData = `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${
            y + height
        } L ${x} ${y + height} Z`;
    } else if (tagName === "polygon") {
        const points = shape.getAttribute("points").trim().split(/\s+/);
        const coords = [];
        for (let i = 0; i < points.length; i += 2) {
            coords.push(`${points[i]},${points[i + 1]}`);
        }
        pathData = `M ${coords.join(" L ")} Z`;
    } else {
        // For other shapes, try to get d if present, otherwise skip
        pathData = shape.getAttribute("d");
        if (!pathData) return null;
    }

    const pathModel = makerjs.importer.fromSVGPathData(pathData);
    if (dx !== 0 || dy !== 0) {
        makerjs.model.move(pathModel, [dx, -dy]);
    }
    return pathModel;
}

function makerCalculateResultPolygon(
    panelWidth,
    panelThickness,
    panelX,
    panelY,
    bitsOnCanvas
) {
    const panelModel = createPanelModel(
        panelWidth,
        panelThickness,
        panelX,
        panelY
    );
    if (!panelModel) {
        console.error("Failed to create panel model");
        return "";
    }
    const bitModels = bitsOnCanvas
        .map((bit) => createBitModel(bit))
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
    result.origin = [panelX, panelY]; // Или любое, чтобы подвинуть весь результат
    const svg = makerjs.exporter.toSVG(result);
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const path = doc.querySelector("path");
    return path ? path.getAttribute("d") : "";
}

export { makerCalculateResultPolygon };
