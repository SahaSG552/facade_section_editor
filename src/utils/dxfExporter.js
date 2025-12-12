/**
 * DXF Exporter for Facade Section Editor
 * Exports SVG elements to DXF format for CAD systems
 */

class DXFExporter {
    constructor() {
        this.dxfContent = [];
        this.layerCounter = 0;
    }

    /**
     * Export bits on canvas to DXF format
     * @param {Array} bitsOnCanvas - Array of bit objects from the canvas
     * @param {Object} materialParams - Material parameters (width, height)
     * @param {string} materialAnchor - Material anchor position
     * @returns {string} DXF content as string
     */
    exportToDXF(bitsOnCanvas, materialParams, materialAnchor = "top-left") {
        this.dxfContent = [];
        this.layerCounter = 0;

        // DXF Header
        this.writeHeader();

        // DXF Tables (Layers)
        this.writeTables(bitsOnCanvas);

        // DXF Blocks (empty for now)
        this.writeBlocks();

        // DXF Entities (the actual geometry)
        this.writeEntities(bitsOnCanvas, materialParams, materialAnchor);

        // DXF Objects
        this.writeObjects();

        // End of file
        this.writeEOF();

        return this.dxfContent.join("\n");
    }

    /**
     * Write DXF header section
     */
    writeHeader() {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("HEADER");
        this.dxfContent.push("9");
        this.dxfContent.push("$ACADVER");
        this.dxfContent.push("1");
        this.dxfContent.push("AC1021"); // AutoCAD 2018
        this.dxfContent.push("9");
        this.dxfContent.push("$INSBASE");
        this.dxfContent.push("10");
        this.dxfContent.push("0.0");
        this.dxfContent.push("20");
        this.dxfContent.push("0.0");
        this.dxfContent.push("30");
        this.dxfContent.push("0.0");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write DXF tables section with layers
     */
    writeTables(bitsOnCanvas) {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("TABLES");

        // Layer table
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("LAYER");
        this.dxfContent.push("70");
        this.dxfContent.push((bitsOnCanvas.length + 2).toString()); // +2 for Material and 0 layers

        // Layer 0 (default)
        this.writeLayer("0", 7, 0, 0, 0); // White color

        // Material layer
        this.writeLayer("Material", 1, 0, 0, 0); // Red color

        // Bit layers
        bitsOnCanvas.forEach((bit, index) => {
            const layerName = `Bit_${bit.name.replace(/[^a-zA-Z0-9_]/g, "_")}_${
                index + 1
            }`;
            const colorIndex = (index % 7) + 1; // Cycle through colors 1-7
            this.writeLayer(layerName, colorIndex, 0, 0, 0);
        });

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write a single layer definition
     */
    writeLayer(name, colorIndex, lineType = 0, lineWeight = 0, plotFlag = 0) {
        this.dxfContent.push("0");
        this.dxfContent.push("LAYER");
        this.dxfContent.push("2");
        this.dxfContent.push(name);
        this.dxfContent.push("70");
        this.dxfContent.push(plotFlag.toString());
        this.dxfContent.push("62");
        this.dxfContent.push(colorIndex.toString());
        this.dxfContent.push("6");
        this.dxfContent.push("Continuous");
        this.dxfContent.push("290");
        this.dxfContent.push("1"); // Layer is on
        this.dxfContent.push("370");
        this.dxfContent.push(lineWeight.toString());
    }

    /**
     * Write DXF blocks section (empty)
     */
    writeBlocks() {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("BLOCKS");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write DXF entities section
     */
    writeEntities(bitsOnCanvas, materialParams, materialAnchor) {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("ENTITIES");

        // Write material rectangle
        this.writeMaterialRectangle(materialParams, materialAnchor);

        // Write bit shapes
        bitsOnCanvas.forEach((bit, index) => {
            this.writeBitShape(bit, index);
        });

        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write material rectangle as DXF LWPOLYLINE
     */
    writeMaterialRectangle(materialParams, materialAnchor) {
        const { width: materialWidth, height: materialThickness } =
            materialParams;

        // Calculate rectangle coordinates based on anchor
        let x1, y1, x2, y2;
        if (materialAnchor === "top-left") {
            x1 = 0;
            y1 = 0;
            x2 = materialWidth;
            y2 = -materialThickness; // Negative Y for CAD coordinate system
        } else {
            // bottom-left
            x1 = 0;
            y1 = materialThickness;
            x2 = materialWidth;
            y2 = 0;
        }

        // Write as LWPOLYLINE
        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("8"); // Layer
        this.dxfContent.push("Material");
        this.dxfContent.push("90"); // Number of vertices
        this.dxfContent.push("4");
        this.dxfContent.push("70"); // Flags (1 = closed)
        this.dxfContent.push("1");

        // Vertex 1
        this.dxfContent.push("10"); // X
        this.dxfContent.push(x1.toString());
        this.dxfContent.push("20"); // Y
        this.dxfContent.push(y1.toString());

        // Vertex 2
        this.dxfContent.push("10");
        this.dxfContent.push(x2.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y1.toString());

        // Vertex 3
        this.dxfContent.push("10");
        this.dxfContent.push(x2.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y2.toString());

        // Vertex 4
        this.dxfContent.push("10");
        this.dxfContent.push(x1.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y2.toString());
    }

    /**
     * Write bit shape to DXF
     */
    writeBitShape(bit, index) {
        const layerName = `Bit_${bit.name.replace(/[^a-zA-Z0-9_]/g, "_")}_${
            index + 1
        }`;

        // Get bit position and transformation
        const transform = bit.group.getAttribute("transform");
        let offsetX = 0,
            offsetY = 0;
        if (transform) {
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
                offsetX = parseFloat(match[1]);
                offsetY = parseFloat(match[2]);
            }
        }

        const shape = bit.group.querySelector(".bit-shape");
        if (!shape) return;

        // Convert SVG coordinates to DXF coordinates (flip Y axis)
        const convertY = (y) => -y;

        // Export based on actual SVG element type, not bit type
        this.writeSVGShape(shape, offsetX, offsetY, layerName, convertY);
    }

    /**
     * Write cylindrical bit (circle)
     */
    writeCylinder(bitData, offsetX, offsetY, layerName, convertY) {
        const radius = bitData.diameter / 2;
        const centerX = offsetX;
        const centerY = convertY(offsetY);

        this.dxfContent.push("0");
        this.dxfContent.push("CIRCLE");
        this.dxfContent.push("8"); // Layer
        this.dxfContent.push(layerName);
        this.dxfContent.push("10"); // Center X
        this.dxfContent.push(centerX.toString());
        this.dxfContent.push("20"); // Center Y
        this.dxfContent.push(centerY.toString());
        this.dxfContent.push("30"); // Center Z
        this.dxfContent.push("0.0");
        this.dxfContent.push("40"); // Radius
        this.dxfContent.push(radius.toString());
    }

    /**
     * Write conical bit (circle with annotation)
     */
    writeCone(bitData, offsetX, offsetY, layerName, convertY) {
        // For cone, draw the base circle
        const radius = bitData.diameter / 2;
        const centerX = offsetX;
        const centerY = convertY(offsetY);

        this.dxfContent.push("0");
        this.dxfContent.push("CIRCLE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("10");
        this.dxfContent.push(centerX.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(centerY.toString());
        this.dxfContent.push("30");
        this.dxfContent.push("0.0");
        this.dxfContent.push("40");
        this.dxfContent.push(radius.toString());

        // Add angle annotation as text
        this.addTextAnnotation(
            `${bitData.angle}°`,
            centerX + radius + 5,
            centerY,
            layerName
        );
    }

    /**
     * Write ball end mill (circle)
     */
    writeBall(bitData, offsetX, offsetY, layerName, convertY) {
        const radius = bitData.diameter / 2;
        const centerX = offsetX;
        const centerY = convertY(offsetY);

        this.dxfContent.push("0");
        this.dxfContent.push("CIRCLE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("10");
        this.dxfContent.push(centerX.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(centerY.toString());
        this.dxfContent.push("30");
        this.dxfContent.push("0.0");
        this.dxfContent.push("40");
        this.dxfContent.push(radius.toString());
    }

    /**
     * Write fillet bit (complex shape)
     */
    writeFillet(bitData, offsetX, offsetY, layerName, convertY) {
        const centerX = offsetX;
        const centerY = convertY(offsetY);

        // Draw as a rectangle with rounded corners approximation
        const width = bitData.diameter;
        const height = bitData.length;
        const radius = bitData.cornerRadius;

        // For simplicity, draw as a rectangle first
        const x1 = centerX - width / 2;
        const y1 = centerY - height / 2;
        const x2 = centerX + width / 2;
        const y2 = centerY + height / 2;

        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("90");
        this.dxfContent.push("4");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Closed

        // Vertices
        this.dxfContent.push("10");
        this.dxfContent.push(x1.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y1.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x2.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y1.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x2.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y2.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x1.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y2.toString());
    }

    /**
     * Write bull nose bit
     */
    writeBull(bitData, offsetX, offsetY, layerName, convertY) {
        const centerX = offsetX;
        const centerY = convertY(offsetY);

        // Similar to fillet, draw as rectangle approximation
        const width = bitData.diameter;
        const height = bitData.length;
        const radius = bitData.cornerRadius;

        const x1 = centerX - width / 2;
        const y1 = centerY - height / 2;
        const x2 = centerX + width / 2;
        const y2 = centerY + height / 2;

        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("90");
        this.dxfContent.push("4");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Closed

        // Vertices
        this.dxfContent.push("10");
        this.dxfContent.push(x1.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y1.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x2.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y1.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x2.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y2.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x1.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y2.toString());
    }

    /**
     * Add text annotation
     */
    addTextAnnotation(text, x, y, layerName) {
        this.dxfContent.push("0");
        this.dxfContent.push("TEXT");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("10");
        this.dxfContent.push(x.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y.toString());
        this.dxfContent.push("30");
        this.dxfContent.push("0.0");
        this.dxfContent.push("40");
        this.dxfContent.push("3.0"); // Text height
        this.dxfContent.push("1");
        this.dxfContent.push(text);
        this.dxfContent.push("72");
        this.dxfContent.push("0"); // Horizontal justification
        this.dxfContent.push("73");
        this.dxfContent.push("1"); // Vertical justification
    }

    /**
     * Write SVG shape as DXF entity
     */
    writeSVGShape(svgElement, offsetX, offsetY, layerName, convertY) {
        const tagName = svgElement.tagName.toLowerCase();

        switch (tagName) {
            case "rect":
                this.writeSVGRect(
                    svgElement,
                    offsetX,
                    offsetY,
                    layerName,
                    convertY
                );
                break;
            case "polygon":
                this.writeSVGPolygon(
                    svgElement,
                    offsetX,
                    offsetY,
                    layerName,
                    convertY
                );
                break;
            case "path":
                this.writeSVGPath(
                    svgElement,
                    offsetX,
                    offsetY,
                    layerName,
                    convertY
                );
                break;
            case "circle":
                this.writeSVGCircle(
                    svgElement,
                    offsetX,
                    offsetY,
                    layerName,
                    convertY
                );
                break;
            default:
                console.warn(`Unsupported SVG element type: ${tagName}`);
        }
    }

    /**
     * Write SVG rect as DXF LWPOLYLINE
     */
    writeSVGRect(svgElement, offsetX, offsetY, layerName, convertY) {
        const x = parseFloat(svgElement.getAttribute("x") || 0) + offsetX;
        const y = parseFloat(svgElement.getAttribute("y") || 0) + offsetY;
        const width = parseFloat(svgElement.getAttribute("width") || 0);
        const height = parseFloat(svgElement.getAttribute("height") || 0);

        // Convert to DXF coordinates
        const x1 = x;
        const y1 = convertY(y);
        const x2 = x + width;
        const y2 = convertY(y + height);

        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("90");
        this.dxfContent.push("4");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Closed

        // Vertices (counter-clockwise for DXF)
        this.dxfContent.push("10");
        this.dxfContent.push(x1.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y1.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x2.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y1.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x2.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y2.toString());

        this.dxfContent.push("10");
        this.dxfContent.push(x1.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(y2.toString());
    }

    /**
     * Write SVG polygon as DXF LWPOLYLINE
     */
    writeSVGPolygon(svgElement, offsetX, offsetY, layerName, convertY) {
        const pointsStr = svgElement.getAttribute("points") || "";
        const points = pointsStr
            .trim()
            .split(/\s+/)
            .map((p) => {
                const [x, y] = p.split(",").map(Number);
                return { x: x + offsetX, y: convertY(y + offsetY) };
            });

        if (points.length < 3) return;

        // Ensure counter-clockwise order for DXF (right-hand rule)
        const orderedPoints = this.ensureCounterClockwise(points);

        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("90");
        this.dxfContent.push(orderedPoints.length.toString());
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Closed

        // Vertices
        orderedPoints.forEach((point) => {
            this.dxfContent.push("10");
            this.dxfContent.push(point.x.toString());
            this.dxfContent.push("20");
            this.dxfContent.push(point.y.toString());
        });
    }

    /**
     * Write SVG path as DXF entities
     */
    writeSVGPath(svgElement, offsetX, offsetY, layerName, convertY) {
        const d = svgElement.getAttribute("d") || "";

        // Parse SVG path and extract all segments
        const segments = this.parseSVGPathSegments(
            d,
            offsetX,
            offsetY,
            convertY
        );

        if (segments.length > 0) {
            // Write each segment as appropriate DXF entity
            segments.forEach((segment) => {
                if (segment.type === "line") {
                    this.writeDXFLine(segment.start, segment.end, layerName);
                } else if (segment.type === "arc") {
                    this.writeDXFArc(segment.arc, layerName);
                }
            });
            return;
        }

        // Fallback: sample the path at multiple points
        const pathElement = svgElement;
        const pathLength = pathElement.getTotalLength();

        if (pathLength === 0) return;

        // Sample the path at regular intervals
        const numPoints = Math.max(10, Math.floor(pathLength / 5)); // Sample every 5 units
        const points = [];

        for (let i = 0; i <= numPoints; i++) {
            const length = (i / numPoints) * pathLength;
            const point = pathElement.getPointAtLength(length);
            points.push({
                x: point.x + offsetX,
                y: convertY(point.y + offsetY),
            });
        }

        // Write as LWPOLYLINE
        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("90");
        this.dxfContent.push(points.length.toString());
        this.dxfContent.push("70");
        this.dxfContent.push("0"); // Not closed

        // Vertices
        points.forEach((point) => {
            this.dxfContent.push("10");
            this.dxfContent.push(point.x.toString());
            this.dxfContent.push("20");
            this.dxfContent.push(point.y.toString());
        });
    }

    /**
     * Write SVG circle as DXF CIRCLE
     */
    writeSVGCircle(svgElement, offsetX, offsetY, layerName, convertY) {
        const cx = parseFloat(svgElement.getAttribute("cx") || 0) + offsetX;
        const cy = parseFloat(svgElement.getAttribute("cy") || 0) + offsetY;
        const r = parseFloat(svgElement.getAttribute("r") || 0);

        this.dxfContent.push("0");
        this.dxfContent.push("CIRCLE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("10");
        this.dxfContent.push(cx.toString());
        this.dxfContent.push("20");
        this.dxfContent.push(convertY(cy).toString());
        this.dxfContent.push("30");
        this.dxfContent.push("0.0");
        this.dxfContent.push("40");
        this.dxfContent.push(r.toString());
    }

    /**
     * Write DXF objects section
     */
    writeObjects() {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("OBJECTS");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write DXF end of file
     */
    writeEOF() {
        this.dxfContent.push("0");
        this.dxfContent.push("EOF");
    }

    /**
     * Parse SVG path data and extract arc parameters
     * @param {string} d - SVG path data
     * @param {number} offsetX - X offset
     * @param {number} offsetY - Y offset
     * @param {function} convertY - Y coordinate converter
     * @returns {Array} Array of arc objects with DXF parameters
     */
    parseSVGPathForArcs(d, offsetX, offsetY, convertY) {
        const arcs = [];
        const commands = this.parseSVGPathCommands(d);

        let currentX = 0;
        let currentY = 0;

        for (const command of commands) {
            if (command.type === "M" || command.type === "L") {
                currentX = command.x + offsetX;
                currentY = convertY(command.y + offsetY);
            } else if (command.type === "A") {
                const startX = currentX;
                const startY = currentY;
                const endX = command.x + offsetX;
                const endY = convertY(command.y + offsetY);

                // Calculate arc center and angles
                const arc = this.svgArcToDXFArc(
                    startX,
                    startY,
                    endX,
                    endY,
                    command.rx,
                    command.ry,
                    command.xAxisRotation,
                    command.largeArcFlag,
                    command.sweepFlag
                );

                if (arc) {
                    arcs.push(arc);
                }

                currentX = endX;
                currentY = endY;
            }
        }

        return arcs;
    }

    /**
     * Parse SVG path and extract all segments (lines and arcs)
     * @param {string} d - SVG path data
     * @param {number} offsetX - X offset
     * @param {number} offsetY - Y offset
     * @param {function} convertY - Y coordinate converter
     * @returns {Array} Array of segments (lines and arcs)
     */
    parseSVGPathSegments(d, offsetX, offsetY, convertY) {
        const segments = [];
        const commands = this.parseSVGPathCommands(d);

        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;

        for (const command of commands) {
            switch (command.type) {
                case "M": // Move to
                    currentX = command.x + offsetX;
                    currentY = convertY(command.y + offsetY);
                    startX = currentX;
                    startY = currentY;
                    break;
                case "L": // Line to
                    const lineEndX = command.x + offsetX;
                    const lineEndY = convertY(command.y + offsetY);

                    segments.push({
                        type: "line",
                        start: { x: currentX, y: currentY },
                        end: { x: lineEndX, y: lineEndY },
                    });

                    currentX = lineEndX;
                    currentY = lineEndY;
                    break;
                case "H": // Horizontal line
                    const hEndX = command.x + offsetX;

                    segments.push({
                        type: "line",
                        start: { x: currentX, y: currentY },
                        end: { x: hEndX, y: currentY },
                    });

                    currentX = hEndX;
                    break;
                case "V": // Vertical line
                    const vEndY = convertY(command.y + offsetY);

                    segments.push({
                        type: "line",
                        start: { x: currentX, y: currentY },
                        end: { x: currentX, y: vEndY },
                    });

                    currentY = vEndY;
                    break;
                case "A": // Arc to
                    const arcStartX = currentX;
                    const arcStartY = currentY;
                    const arcEndX = command.x + offsetX;
                    const arcEndY = convertY(command.y + offsetY);

                    // Calculate arc center and angles
                    const arc = this.svgArcToDXFArc(
                        arcStartX,
                        arcStartY,
                        arcEndX,
                        arcEndY,
                        command.rx,
                        command.ry,
                        command.xAxisRotation,
                        command.largeArcFlag,
                        command.sweepFlag
                    );

                    if (arc) {
                        segments.push({
                            type: "arc",
                            arc: arc,
                        });
                    }

                    currentX = arcEndX;
                    currentY = arcEndY;
                    break;
                case "Z": // Close path
                    // If we're not at the start point, draw a line to close
                    if (currentX !== startX || currentY !== startY) {
                        segments.push({
                            type: "line",
                            start: { x: currentX, y: currentY },
                            end: { x: startX, y: startY },
                        });
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
            }
        }

        return segments;
    }

    /**
     * Parse SVG path commands from path data string
     * @param {string} d - SVG path data
     * @returns {Array} Array of parsed commands
     */
    parseSVGPathCommands(d) {
        const commands = [];
        const regex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
        let match;

        while ((match = regex.exec(d)) !== null) {
            const type = match[1].toUpperCase();
            const params = match[2]
                .trim()
                .split(/[\s,]+/)
                .map(Number);

            switch (type) {
                case "M":
                case "L":
                    commands.push({
                        type,
                        x: params[0] || 0,
                        y: params[1] || 0,
                    });
                    break;
                case "H": // Horizontal line
                    commands.push({
                        type,
                        x: params[0] || 0,
                    });
                    break;
                case "V": // Vertical line
                    commands.push({
                        type,
                        y: params[0] || 0,
                    });
                    break;
                case "A":
                    commands.push({
                        type,
                        rx: params[0] || 0,
                        ry: params[1] || 0,
                        xAxisRotation: params[2] || 0,
                        largeArcFlag: params[3] || 0,
                        sweepFlag: params[4] || 0,
                        x: params[5] || 0,
                        y: params[6] || 0,
                    });
                    break;
                case "Z":
                    commands.push({
                        type,
                    });
                    break;
            }
        }

        return commands;
    }

    /**
     * Write DXF LINE entity
     * @param {Object} start - Start point {x, y}
     * @param {Object} end - End point {x, y}
     * @param {string} layerName - Layer name
     */
    writeDXFLine(start, end, layerName) {
        this.dxfContent.push("0");
        this.dxfContent.push("LINE");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("10"); // Start X
        this.dxfContent.push(start.x.toString());
        this.dxfContent.push("20"); // Start Y
        this.dxfContent.push(start.y.toString());
        this.dxfContent.push("30"); // Start Z
        this.dxfContent.push("0.0");
        this.dxfContent.push("11"); // End X
        this.dxfContent.push(end.x.toString());
        this.dxfContent.push("21"); // End Y
        this.dxfContent.push(end.y.toString());
        this.dxfContent.push("31"); // End Z
        this.dxfContent.push("0.0");
    }

    /**
     * Convert SVG arc parameters to DXF arc parameters
     * @param {number} x1 - Start point X
     * @param {number} y1 - Start point Y
     * @param {number} x2 - End point X
     * @param {number} y2 - End point Y
     * @param {number} rx - Arc radius X
     * @param {number} ry - Arc radius Y
     * @param {number} xAxisRotation - Rotation angle
     * @param {number} largeArcFlag - Large arc flag
     * @param {number} sweepFlag - Sweep flag
     * @returns {Object|null} DXF arc parameters or null if conversion fails
     */
    svgArcToDXFArc(
        x1,
        y1,
        x2,
        y2,
        rx,
        ry,
        xAxisRotation,
        largeArcFlag,
        sweepFlag
    ) {
        // For simplicity, assume circular arcs (rx === ry)
        // and no rotation (xAxisRotation === 0)
        if (Math.abs(rx - ry) > 0.001 || Math.abs(xAxisRotation) > 0.001) {
            return null; // Fallback to polyline for complex cases
        }

        const radius = rx;

        // Calculate arc center
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0 || radius === 0) return null;

        // Calculate the distance from midpoint to center
        const halfDistance = distance / 2;
        const height = Math.sqrt(radius * radius - halfDistance * halfDistance);

        // Determine center position based on sweep flag
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Perpendicular vector
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Center offset - SVG sweepFlag=1 means clockwise, sweepFlag=0 means counter-clockwise
        // For DXF we need to ensure proper arc direction
        const centerOffset = height * (sweepFlag ? -1 : 1);
        const centerX = midX + perpX * centerOffset;
        const centerY = midY + perpY * centerOffset;

        // Calculate start and end angles
        let startAngle =
            Math.atan2(y1 - centerY, x1 - centerX) * (180 / Math.PI);
        let endAngle = Math.atan2(y2 - centerY, x2 - centerX) * (180 / Math.PI);

        // Normalize angles to 0-360 range
        const normalizeAngle = (angle) => {
            while (angle < 0) angle += 360;
            while (angle >= 360) angle -= 360;
            return angle;
        };

        startAngle = normalizeAngle(startAngle);
        endAngle = normalizeAngle(endAngle);

        // DXF ARC always draws counter-clockwise
        // If SVG sweepFlag = 1 (clockwise), we need to swap start and end angles
        let finalStartAngle, finalEndAngle;
        if (sweepFlag) {
            // SVG clockwise - swap angles for DXF counter-clockwise equivalent
            finalStartAngle = endAngle;
            finalEndAngle = startAngle;
            if (finalEndAngle <= finalStartAngle) {
                finalEndAngle += 360;
            }
        } else {
            // SVG counter-clockwise - use as is
            finalStartAngle = startAngle;
            finalEndAngle = endAngle;
            if (finalEndAngle <= finalStartAngle) {
                finalEndAngle += 360;
            }
        }

        return {
            centerX,
            centerY,
            radius,
            startAngle: finalStartAngle,
            endAngle: finalEndAngle,
        };
    }

    /**
     * Write DXF ARC entity
     * @param {Object} arc - Arc parameters
     * @param {string} layerName - Layer name
     */
    writeDXFArc(arc, layerName) {
        this.dxfContent.push("0");
        this.dxfContent.push("ARC");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("10"); // Center X
        this.dxfContent.push(arc.centerX.toString());
        this.dxfContent.push("20"); // Center Y
        this.dxfContent.push(arc.centerY.toString());
        this.dxfContent.push("30"); // Center Z
        this.dxfContent.push("0.0");
        this.dxfContent.push("40"); // Radius
        this.dxfContent.push(arc.radius.toString());
        this.dxfContent.push("50"); // Start angle
        this.dxfContent.push(arc.startAngle.toString());
        this.dxfContent.push("51"); // End angle
        this.dxfContent.push(arc.endAngle.toString());
    }

    /**
     * Ensure polygon points are in counter-clockwise order (right-hand rule for DXF)
     * @param {Array} points - Array of {x, y} points
     * @returns {Array} Points in counter-clockwise order
     */
    ensureCounterClockwise(points) {
        if (points.length < 3) return points;

        // Calculate signed area to determine winding order
        let signedArea = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            signedArea += points[i].x * points[j].y - points[j].x * points[i].y;
        }

        // If signed area is negative, points are clockwise - reverse them
        if (signedArea < 0) {
            return points.slice().reverse();
        }

        return points;
    }

    /**
     * Download DXF file
     */
    downloadDXF(dxfContent, filename = "facade_design.dxf") {
        const blob = new Blob([dxfContent], { type: "application/dxf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export singleton instance
export default new DXFExporter();
