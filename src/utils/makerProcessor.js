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

// Create extension rectangle above bit if needed
function createBitExtension(bitObj, materialTopY, materialBottomY) {
    if (!bitObj.group) return null;

    const element = bitObj.group.querySelector(".bit-shape");
    if (!element) return null;

    // Get bit position
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

    // Get bit bounding box to determine width and top position
    const bbox = element.getBBox();
    const bitWidth = bbox.width;
    const bitTopY = bitY + bbox.y; // Top of the bit in canvas coordinates
    const bitBottomY = bitY; // Bottom of the bit (tip)

    // Get bit data for shank collision detection
    // For regular bits from bitsOnCanvas, use bitObj.bitData
    // For phantom bits, bitData is stored in group.__bitData
    const bitData = bitObj.bitData || (bitObj.group && bitObj.group.__bitData);
    let extensionWidth = bitWidth;
    let hasShankCollision = false;

    // Check if bit top is below material surface
    if (bitTopY > materialTopY) {
        // Check for shank collision (if extension is needed and shank is wider than bit)
        if (bitData && bitData.shankDiameter && bitData.diameter) {
            const shankDiameter = parseFloat(bitData.shankDiameter);
            const bitDiameter = parseFloat(bitData.diameter);

            // If shank is wider than bit diameter, it collides with material
            if (shankDiameter > bitDiameter) {
                // Scale shank diameter to pixels
                const scale = bitWidth / bitDiameter;
                extensionWidth = shankDiameter * scale;
                hasShankCollision = true;
            }
        }
        // Create rectangle from material top to bit top + 1px extra for safety
        const rectHeight = bitTopY - materialTopY + 1;
        // For shank collision, offset by half the width difference to center wider extension
        const widthOffset = hasShankCollision
            ? (bitWidth - extensionWidth) / 2
            : 0;
        const rectX = bitX + bbox.x + widthOffset;
        const rectY = materialTopY - 1;

        // Create rectangle as SVG path and convert to maker.js model
        const rectPath = `M ${rectX} ${rectY} L ${
            rectX + extensionWidth
        } ${rectY} L ${rectX + extensionWidth} ${
            rectY + rectHeight
        } L ${rectX} ${rectY + rectHeight} Z`;
        const rectModel = makerjs.importer.fromSVGPathData(rectPath);

        console.log("Created bit extension:", {
            rectX,
            rectY,
            extensionWidth,
            hasShankCollision,
            rectHeight,
            bitTopY,
            materialTopY,
        });

        // Return model with collision info
        rectModel.__hasShankCollision = hasShankCollision;
        return rectModel;
    }

    return null;
}

function makerCalculateResultPolygon(
    panelWidth,
    panelThickness,
    panelX,
    panelY,
    bitsOnCanvas,
    phantomBits = []
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

    // Get material top Y position (from panel-section element)
    const materialTopY = parseFloat(panelSection.getAttribute("y")) || 0;

    // Calculate material bottom Y using section height (in relative coordinates)
    const sectionHeight = parseFloat(panelSection.getAttribute("height")) || 0;
    const materialBottomY = materialTopY + sectionHeight;

    // Collect models from both regular bits and phantom bits
    const bitModels = bitsOnCanvas
        .map((bit) => createPathData(bit))
        .filter((m) => m);

    const phantomModels = phantomBits
        .map((phantom) => createPathData(phantom))
        .filter((m) => m);

    // Create extension rectangles for bits that go below material surface
    const bitExtensions = bitsOnCanvas
        .map((bit) => createBitExtension(bit, materialTopY, materialBottomY))
        .filter((m) => m);

    const phantomExtensions = phantomBits
        .map((phantom) =>
            createBitExtension(phantom, materialTopY, materialBottomY)
        )
        .filter((m) => m);

    // Combine all bit models and extensions
    const allBitModels = [
        ...bitModels,
        ...phantomModels,
        ...bitExtensions,
        ...phantomExtensions,
    ];

    if (allBitModels.length === 0) {
        // No bits, return panel as is
        const svg = makerjs.exporter.toSVG(panelModel);
        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, "image/svg+xml");
        const path = doc.querySelector("path");
        return path ? path.getAttribute("d") : "";
    }

    let unionBits = allBitModels[0];
    for (let i = 1; i < allBitModels.length; i++) {
        unionBits = makerjs.model.combineUnion(unionBits, allBitModels[i]);
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
