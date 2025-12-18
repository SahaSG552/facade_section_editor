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

    const pathModel = makerjs.importer.fromSVGPathData(shape.getAttribute("d"));
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

    const result = makerjs.model.combineSubtraction(panelModel, unionBits);

    const svg = makerjs.exporter.toSVG(result);
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const path = doc.querySelector("path");
    return path ? path.getAttribute("d") : "";
}

export { makerCalculateResultPolygon };
