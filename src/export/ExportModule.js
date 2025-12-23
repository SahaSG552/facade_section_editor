/**
 * Export Module
 * Handles export functionality for the application
 */
import BaseModule from "../core/BaseModule.js";

/**
 * Export Module - Handles all export operations including DXF
 */
class ExportModule extends BaseModule {
    constructor() {
        super("export");
        this.dxfExporter = new DXFExporter();
    }

    initialize() {
        super.initialize();
        console.log("ExportModule initialized");
        return Promise.resolve();
    }

    /**
     * Export to DXF format
     */
    exportToDXF(
        bitsOnCanvas,
        partPathElement,
        partFront,
        offsetContours,
        panelThickness
    ) {
        return this.dxfExporter.exportToDXF(
            bitsOnCanvas,
            partPathElement,
            partFront,
            offsetContours,
            panelThickness
        );
    }

    /**
     * Download DXF file
     */
    downloadDXF(dxfContent, filename = "facade_design.dxf") {
        this.dxfExporter.downloadDXF(dxfContent, filename);
    }
}

/**
 * DXF Exporter for Facade Section Editor
 * Exports SVG elements to DXF format for CAD systems
 */

const makerjs = require("makerjs");

class DXFExporter {
    constructor() {
        this.dxfContent = [];
        this.handleCounter = 0x100; // Start handles from 256
    }

    /**
     * Export bits on canvas to DXF format
     * @param {Array} bitsOnCanvas - Array of bit objects from the canvas
     * @param {SVGElement} partPathElement - SVG path element from updatePartShape with transform
     * @param {SVGElement} partFront - The part front SVG rectangle element
     * @param {Array} offsetContours - Array of offset contour objects
     * @param {number} panelThickness - Panel thickness for layer naming
     * @returns {string} DXF content as string
     */
    exportToDXF(
        bitsOnCanvas,
        partPathElement,
        partFront,
        offsetContours,
        panelThickness
    ) {
        this.dxfContent = [];

        // DXF Header
        this.writeHeader();

        // DXF Classes (required for AutoCAD compatibility)
        this.writeClasses();

        // DXF Tables (Layers)
        this.writeTables(
            bitsOnCanvas,
            partFront,
            offsetContours,
            panelThickness
        );

        // DXF Blocks (empty)
        this.writeBlocks();

        // DXF Entities (the actual geometry)
        this.writeEntities(
            bitsOnCanvas,
            partPathElement,
            partFront,
            offsetContours,
            panelThickness
        );

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
        this.dxfContent.push("$DWGCODEPAGE");
        this.dxfContent.push("3");
        this.dxfContent.push("ANSI_1251");
        this.dxfContent.push("9");
        this.dxfContent.push("$INSBASE");
        this.dxfContent.push("10");
        this.dxfContent.push("0.0");
        this.dxfContent.push("20");
        this.dxfContent.push("0.0");
        this.dxfContent.push("30");
        this.dxfContent.push("0.0");
        this.dxfContent.push("9");
        this.dxfContent.push("$EXTMIN");
        this.dxfContent.push("10");
        this.dxfContent.push("0.0");
        this.dxfContent.push("20");
        this.dxfContent.push("0.0");
        this.dxfContent.push("30");
        this.dxfContent.push("0.0");
        this.dxfContent.push("9");
        this.dxfContent.push("$EXTMAX");
        this.dxfContent.push("10");
        this.dxfContent.push("1000.0");
        this.dxfContent.push("20");
        this.dxfContent.push("1000.0");
        this.dxfContent.push("30");
        this.dxfContent.push("0.0");
        this.dxfContent.push("9");
        this.dxfContent.push("$LIMMIN");
        this.dxfContent.push("10");
        this.dxfContent.push("0.0");
        this.dxfContent.push("20");
        this.dxfContent.push("0.0");
        this.dxfContent.push("9");
        this.dxfContent.push("$LIMMAX");
        this.dxfContent.push("10");
        this.dxfContent.push("420.0");
        this.dxfContent.push("20");
        this.dxfContent.push("297.0");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write DXF classes section (required for AutoCAD compatibility)
     */
    writeClasses() {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("CLASSES");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write DXF tables section with layers
     */
    writeTables(bitsOnCanvas, partFront, offsetContours, panelThickness) {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("TABLES");

        // Calculate total number of layers
        let totalLayers = bitsOnCanvas.length + 2; // +1 for layer 0, +1 for Result layer

        // Add layer for partFront if provided
        if (partFront) totalLayers++;

        // Add layers for offset contours if provided
        if (offsetContours) totalLayers += offsetContours.length;

        // Layer table
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("LAYER");
        this.dxfContent.push("70");
        this.dxfContent.push(totalLayers.toString());

        // Layer 0 (default)
        // this.writeLayer("0", 7, 0, 0, 0); // White color

        // Result layer for Clipper
        this.writeLayer("Default", 0, 0, 0, 0); // Green color for Clipper

        // Part front layer
        if (partFront) {
            const partFrontLayerName = `CUT_${panelThickness}MM_OU`;
            this.writeLayer(partFrontLayerName, 0, 0, 0, 0); // Black color for part front
        }

        // Offset contour layers
        if (offsetContours) {
            offsetContours.forEach((offset, index) => {
                const bit = bitsOnCanvas[offset.bitIndex];
                if (bit) {
                    // Use depth from offset if available (for VC multi-pass), otherwise use bit.y
                    let depthValue =
                        offset.depth !== undefined ? offset.depth : bit.y;

                    // Format depth value: if fractional, add extra _ before value, replace decimal with _
                    let yValue = depthValue.toString();
                    if (depthValue % 1 !== 0) {
                        // It's fractional, add extra _
                        yValue = `_${yValue.replace(".", "_")}`;
                    } else {
                        yValue = `${depthValue}`;
                    }

                    const layerName = `${bit.name}_${yValue}MM_${bit.operation}`;
                    // Use the bit's color from the canvas
                    const colorIndex = this.colorToDXFIndex(bit.color);
                    this.writeLayer(layerName, colorIndex, 0, 0, 0);
                }
            });
        }

        // Bit layers
        bitsOnCanvas.forEach((bit, index) => {
            const layerName = `Default`;
            const colorIndex = this.colorToDXFIndex(bit.color);
            this.writeLayer(layerName, colorIndex, 0, 0, 0);
        });

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");

        // Add other required tables with minimal entries
        this.addBLOCKRECORDTable();
        this.addLTYPETable();
        this.addSTYLETable();
        this.addVPORTTable();
        this.addEmptyTable("VIEW");
        this.addEmptyTable("UCS");
        this.addAPPIDTable();
        this.addDIMSTYLETable();

        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write a single layer definition
     */
    writeLayer(name, colorIndex, lineType = 0, lineWeight = 0, plotFlag = 0) {
        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("LAYER");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLayerTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push(name);
        this.dxfContent.push("70");
        this.dxfContent.push(plotFlag.toString());

        // Use RGB color (group code 420) instead of ACI color index (62)
        if (
            colorIndex &&
            typeof colorIndex === "object" &&
            colorIndex.r !== undefined
        ) {
            const rgbValue =
                colorIndex.r * 256 * 256 + colorIndex.g * 256 + colorIndex.b;
            this.dxfContent.push("420");
            this.dxfContent.push(rgbValue.toString());
        } else {
            // Fallback to ACI color index
            this.dxfContent.push("62");
            this.dxfContent.push((colorIndex || 7).toString());
        }

        this.dxfContent.push("6");
        this.dxfContent.push("CONTINUOUS");
        this.dxfContent.push("290");
        this.dxfContent.push("1"); // Layer is on
        this.dxfContent.push("390");
        this.dxfContent.push("0"); // Plot style handle
    }

    /**
     * Add LTYPE table with CONTINUOUS linetype
     */
    addLTYPETable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Number of linetypes

        // CONTINUOUS linetype
        const ltypeHandle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push(ltypeHandle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("CONTINUOUS");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("0");
        this.dxfContent.push("40");
        this.dxfContent.push("0.0");

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
    }

    /**
     * Add STYLE table with STANDARD text style
     */
    addSTYLETable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("STYLE");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Number of styles

        // STANDARD style
        const styleHandle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("STYLE");
        this.dxfContent.push("5");
        this.dxfContent.push(styleHandle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbTextStyleTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("STANDARD");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("40");
        this.dxfContent.push("0.0");
        this.dxfContent.push("41");
        this.dxfContent.push("1.0");
        this.dxfContent.push("50");
        this.dxfContent.push("0.0");
        this.dxfContent.push("71");
        this.dxfContent.push("0");
        this.dxfContent.push("42");
        this.dxfContent.push("2.5");
        this.dxfContent.push("3");
        this.dxfContent.push("txt");
        this.dxfContent.push("4");
        this.dxfContent.push("");

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
    }

    /**
     * Add APPID table with ACAD and Rhino applications
     */
    addAPPIDTable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("APPID");
        this.dxfContent.push("70");
        this.dxfContent.push("2"); // Number of app IDs

        // ACAD application
        const acadHandle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("APPID");
        this.dxfContent.push("5");
        this.dxfContent.push(acadHandle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbRegAppTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ACAD");
        this.dxfContent.push("70");
        this.dxfContent.push("0");

        // Rhino application (for XDATA)
        const rhinoHandle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("APPID");
        this.dxfContent.push("5");
        this.dxfContent.push(rhinoHandle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbRegAppTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("Rhino");
        this.dxfContent.push("70");
        this.dxfContent.push("0");

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
    }

    /**
     * Add BLOCK_RECORD table with model/paper space
     */
    addBLOCKRECORDTable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("BLOCK_RECORD");
        this.dxfContent.push("70");
        this.dxfContent.push("2"); // Number of block records

        // *MODEL_SPACE block record
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK_RECORD");
        this.dxfContent.push("2");
        this.dxfContent.push("*MODEL_SPACE");

        // *PAPER_SPACE block record
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK_RECORD");
        this.dxfContent.push("2");
        this.dxfContent.push("*PAPER_SPACE");

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
    }

    /**
     * Add VPORT table with active viewport
     */
    addVPORTTable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("VPORT");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Number of viewports

        // *ACTIVE viewport
        this.dxfContent.push("0");
        this.dxfContent.push("VPORT");
        this.dxfContent.push("2");
        this.dxfContent.push("*ACTIVE");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("10");
        this.dxfContent.push("0.0");
        this.dxfContent.push("20");
        this.dxfContent.push("0.0");
        this.dxfContent.push("11");
        this.dxfContent.push("1.0");
        this.dxfContent.push("21");
        this.dxfContent.push("1.0");
        this.dxfContent.push("12");
        this.dxfContent.push("400.0");
        this.dxfContent.push("22");
        this.dxfContent.push("-295.0");
        this.dxfContent.push("32");
        this.dxfContent.push("0.0");
        this.dxfContent.push("13");
        this.dxfContent.push("0.0");
        this.dxfContent.push("23");
        this.dxfContent.push("0.0");
        this.dxfContent.push("14");
        this.dxfContent.push("1.0");
        this.dxfContent.push("24");
        this.dxfContent.push("1.0");
        this.dxfContent.push("15");
        this.dxfContent.push("1.0");
        this.dxfContent.push("25");
        this.dxfContent.push("1.0");
        this.dxfContent.push("16");
        this.dxfContent.push("0.0");
        this.dxfContent.push("26");
        this.dxfContent.push("0.0");
        this.dxfContent.push("36");
        this.dxfContent.push("1.0");
        this.dxfContent.push("17");
        this.dxfContent.push("0.0");
        this.dxfContent.push("27");
        this.dxfContent.push("1.0");
        this.dxfContent.push("37");
        this.dxfContent.push("0.0");
        this.dxfContent.push("40");
        this.dxfContent.push("200.0");
        this.dxfContent.push("41");
        this.dxfContent.push("2.0");
        this.dxfContent.push("42");
        this.dxfContent.push("50.0");
        this.dxfContent.push("43");
        this.dxfContent.push("0.0");
        this.dxfContent.push("44");
        this.dxfContent.push("0.0");
        this.dxfContent.push("50");
        this.dxfContent.push("0.0");
        this.dxfContent.push("51");
        this.dxfContent.push("0.0");
        this.dxfContent.push("71");
        this.dxfContent.push("0");
        this.dxfContent.push("72");
        this.dxfContent.push("100");
        this.dxfContent.push("73");
        this.dxfContent.push("1");
        this.dxfContent.push("74");
        this.dxfContent.push("1");
        this.dxfContent.push("75");
        this.dxfContent.push("0");
        this.dxfContent.push("76");
        this.dxfContent.push("0");
        this.dxfContent.push("77");
        this.dxfContent.push("0");
        this.dxfContent.push("78");
        this.dxfContent.push("0");

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
    }

    /**
     * Add DIMSTYLE table with STANDARD dimension style
     */
    addDIMSTYLETable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("DIMSTYLE");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Number of dimension styles

        // STANDARD dimension style
        this.dxfContent.push("0");
        this.dxfContent.push("DIMSTYLE");
        this.dxfContent.push("2");
        this.dxfContent.push("STANDARD");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("");
        this.dxfContent.push("40");
        this.dxfContent.push("1.0");
        this.dxfContent.push("41");
        this.dxfContent.push("0.18");
        this.dxfContent.push("42");
        this.dxfContent.push("0.0625");
        this.dxfContent.push("44");
        this.dxfContent.push("0.18");
        this.dxfContent.push("47");
        this.dxfContent.push("0.0");
        this.dxfContent.push("48");
        this.dxfContent.push("0.0");
        this.dxfContent.push("73");
        this.dxfContent.push("1");
        this.dxfContent.push("74");
        this.dxfContent.push("1");
        this.dxfContent.push("75");
        this.dxfContent.push("0");
        this.dxfContent.push("76");
        this.dxfContent.push("0");
        this.dxfContent.push("77");
        this.dxfContent.push("0");
        this.dxfContent.push("278");
        this.dxfContent.push("2");
        this.dxfContent.push("279");
        this.dxfContent.push("46");
        this.dxfContent.push("281");
        this.dxfContent.push("0");
        this.dxfContent.push("282");
        this.dxfContent.push("0");
        this.dxfContent.push("271");
        this.dxfContent.push("4");
        this.dxfContent.push("276");
        this.dxfContent.push("0");

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
    }

    /**
     * Add an empty table (required for DXF structure)
     */
    addEmptyTable(tableType) {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push(tableType);
        this.dxfContent.push("70");
        this.dxfContent.push("0"); // No entries in this table
        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
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
    writeEntities(
        bitsOnCanvas,
        partPathElement,
        partFront,
        offsetContours,
        panelThickness
    ) {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("ENTITIES");

        // Write part front contour
        if (partFront) {
            this.writePartFront(partFront, panelThickness);
        }

        // Write offset contours
        if (offsetContours) {
            offsetContours.forEach((offset, index) => {
                this.writeOffsetContour(offset, bitsOnCanvas);
            });
        }

        // Write result polygon from partPath
        this.writeResultPolygon(partPathElement, "Default");

        // Write bit shapes
        bitsOnCanvas.forEach((bit, index) => {
            this.writeBitShape(bit, index);
        });

        this.dxfContent.push("0");
        this.dxfContent.push("ENDSEC");
    }

    /**
     * Write bit shape to DXF
     */
    writeBitShape(bit, index) {
        const layerName = `Default`;

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

        // Add XDATA for bit information
        this.addBitXDATA(bit);
    }

    /**
     * Add XDATA for bit information
     * @param {Object} bit - Bit object with name and other properties
     */
    addBitXDATA(bit) {
        // XDATA format for Rhino application
        this.dxfContent.push("1001"); // Application name
        this.dxfContent.push("Rhino");
        this.dxfContent.push("1002"); // Control string start
        this.dxfContent.push("{");
        this.dxfContent.push("1000"); // String data
        this.dxfContent.push("Name");
        this.dxfContent.push("1000"); // String data
        this.dxfContent.push(bit.name);
        this.dxfContent.push("1002"); // Control string end
        this.dxfContent.push("}");
    }

    /**
     * Write part front contour to DXF
     * @param {SVGElement} partFront - The part front SVG rectangle element
     * @param {number} panelThickness - Panel thickness for layer naming
     */
    writePartFront(partFront, panelThickness) {
        const layerName = `CUT_${panelThickness}MM_OU`;

        // Convert SVG coordinates to DXF coordinates (flip Y axis)
        const convertY = (y) => -y;

        // Write as SVG rectangle (should be a rect element)
        this.writeSVGRect(partFront, 0, 0, layerName, convertY);
    }

    /**
     * Write offset contour to DXF
     * @param {Object} offset - Offset contour object with element and bitIndex
     * @param {Array} bitsOnCanvas - Array of bits on canvas
     */
    writeOffsetContour(offset, bitsOnCanvas) {
        const bit = bitsOnCanvas[offset.bitIndex];
        if (!bit) return;

        // Use depth from offset if available (for VC multi-pass), otherwise use bit.y
        let depthValue = offset.depth !== undefined ? offset.depth : bit.y;

        // Format depth value: if fractional, add extra _ before value, replace decimal with _
        let yValue = depthValue.toString();
        if (depthValue % 1 !== 0) {
            // It's fractional, add extra _
            yValue = `_${yValue.replace(".", "_")}`;
        } else {
            yValue = `${depthValue}`;
        }

        let layerName = `${bit.name}_${yValue}MM_${bit.operation}`;
        if (offset.pass === 0) {
            layerName = `Default`;
        }

        // The offset.element should be an SVG path element with the offset contour
        // Convert SVG coordinates to DXF coordinates (flip Y axis)
        const convertY = (y) => -y;

        // Write as SVG path
        this.writeSVGPath(offset.element, 0, 0, layerName, convertY);
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

        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("6");
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("62");
        this.dxfContent.push("256");
        this.dxfContent.push("370");
        this.dxfContent.push("-1");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbPolyline");
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

        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("6");
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("62");
        this.dxfContent.push("256");
        this.dxfContent.push("370");
        this.dxfContent.push("-1");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbPolyline");
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
     * Write SVG path as DXF POLYLINE with bulge values for arcs
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
            // Write as single POLYLINE with bulge values for arcs
            this.writePathAsPolyline(segments, layerName);
        }
    }

    /**
     * Write SVG circle as DXF CIRCLE
     */
    writeSVGCircle(svgElement, offsetX, offsetY, layerName, convertY) {
        const cx = parseFloat(svgElement.getAttribute("cx") || 0) + offsetX;
        const cy = parseFloat(svgElement.getAttribute("cy") || 0) + offsetY;
        const r = parseFloat(svgElement.getAttribute("r") || 0);

        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("CIRCLE");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("6");
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("62");
        this.dxfContent.push("256");
        this.dxfContent.push("370");
        this.dxfContent.push("-1");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbCircle");
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
     * Write result polygon as DXF LWPOLYLINE from SVG path element
     * @param {SVGElement} pathElement - SVG path element with transform
     * @param {string} layerName - Layer name for the result
     */
    writeResultPolygon(pathElement, layerName = "Default") {
        if (!pathElement) return;

        // Extract transform from the path element
        const transform = pathElement.getAttribute("transform") || "";
        let offsetX = 0,
            offsetY = 0;
        if (transform) {
            const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (match) {
                offsetX = parseFloat(match[1]) || 0;
                offsetY = parseFloat(match[2]) || 0;
            }
        }

        // Convert SVG coordinates to DXF coordinates (flip Y axis)
        const convertY = (y) => -y;

        // Write as SVG path with extracted offset
        this.writeSVGPath(pathElement, offsetX, offsetY, layerName, convertY);
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
     * Convert SVG arc to DXF polyline arc parameters
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} rx - Radius X
     * @param {number} ry - Radius Y
     * @param {number} xAxisRotation - Rotation
     * @param {number} largeArcFlag - Large arc flag
     * @param {number} sweepFlag - Direction flag
     * @returns {Object|null} Arc parameters or null
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
        // Only support circular arcs without rotation
        if (Math.abs(rx - ry) > 0.001 || Math.abs(xAxisRotation) > 0.001) {
            return null;
        }

        const radius = rx;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0 || radius === 0) return null;

        const halfDistance = distance / 2;
        const height = Math.sqrt(radius * radius - halfDistance * halfDistance);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const perpX = -dy / distance;
        const perpY = dx / distance;

        const centerOffset = height * (sweepFlag ? -1 : 1);
        const centerX = midX + perpX * centerOffset;
        const centerY = midY + perpY * centerOffset;

        let startAngle =
            Math.atan2(y1 - centerY, x1 - centerX) * (180 / Math.PI);
        let endAngle = Math.atan2(y2 - centerY, x2 - centerX) * (180 / Math.PI);

        // Normalize angles to 0-360
        const normalizeAngle = (angle) => ((angle % 360) + 360) % 360;
        startAngle = normalizeAngle(startAngle);
        endAngle = normalizeAngle(endAngle);

        return { centerX, centerY, radius, startAngle, endAngle, sweepFlag };
    }

    /**
     * Write path segments as single POLYLINE with bulge values for arcs
     * @param {Array} segments - Array of path segments (lines and arcs)
     * @param {string} layerName - Layer name
     */
    writePathAsPolyline(segments, layerName) {
        if (segments.length === 0) return;

        // Collect all vertices and calculate bulge values
        const vertices = [];
        const bulges = [];

        // Start with the first segment's start point
        let currentPoint;
        if (segments[0].type === "arc") {
            const arc = segments[0].arc;
            currentPoint = {
                x:
                    arc.centerX +
                    arc.radius * Math.cos((arc.startAngle * Math.PI) / 180),
                y:
                    arc.centerY +
                    arc.radius * Math.sin((arc.startAngle * Math.PI) / 180),
            };
        } else {
            currentPoint = segments[0].start;
        }

        vertices.push(currentPoint);
        bulges.push(0); // First vertex has no bulge

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (segment.type === "line") {
                // Add endpoint of line segment
                vertices.push(segment.end);
                bulges.push(0); // Straight line, no bulge
                currentPoint = segment.end;
            } else if (segment.type === "arc") {
                // Calculate bulge for the arc
                const arc = segment.arc;
                const bulge = this.calculateBulge(arc);
                bulges[bulges.length - 1] = bulge; // Set bulge for the previous vertex

                // Add endpoint of arc segment
                const endPoint = {
                    x:
                        arc.centerX +
                        arc.radius * Math.cos((arc.endAngle * Math.PI) / 180),
                    y:
                        arc.centerY +
                        arc.radius * Math.sin((arc.endAngle * Math.PI) / 180),
                };
                vertices.push(endPoint);
                bulges.push(0); // Next vertex bulge will be set by next segment
                currentPoint = endPoint;
            }
        }

        // Check if path should be closed (if last point connects to first point within tolerance)
        const tolerance = 0.01; // Allow for small floating point differences
        const isClosed =
            vertices.length > 2 &&
            Math.abs(vertices[vertices.length - 1].x - vertices[0].x) <
                tolerance &&
            Math.abs(vertices[vertices.length - 1].y - vertices[0].y) <
                tolerance;

        // For closed paths, remove the duplicate closing vertex since DXF handles closure via flag
        if (isClosed) {
            vertices.pop();
            bulges.pop();
        }

        // Write LWPOLYLINE entity
        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("6");
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("62");
        this.dxfContent.push("256");
        this.dxfContent.push("370");
        this.dxfContent.push("-1");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbPolyline");
        this.dxfContent.push("90");
        this.dxfContent.push(vertices.length.toString());
        this.dxfContent.push("70");
        this.dxfContent.push(isClosed ? "1" : "0"); // Closed flag

        // Vertices with bulges
        for (let i = 0; i < vertices.length; i++) {
            this.dxfContent.push("10"); // X
            this.dxfContent.push(vertices[i].x.toString());
            this.dxfContent.push("20"); // Y
            this.dxfContent.push(vertices[i].y.toString());
            if (bulges[i] !== 0) {
                this.dxfContent.push("42"); // Bulge
                this.dxfContent.push(bulges[i].toString());
            }
        }
    }

    /**
     * Calculate bulge value for an arc
     * Bulge = tan(angle/4) where angle is the included angle in radians
     * Positive bulge = counter-clockwise arc, negative = clockwise
     * @param {Object} arc - Arc parameters
     * @returns {number} Bulge value
     */
    calculateBulge(arc) {
        // Calculate the smaller included angle
        let angle = Math.abs(arc.endAngle - arc.startAngle);
        if (angle > 180) angle = 360 - angle;

        // Convert to radians
        const angleRad = (angle * Math.PI) / 180;

        // Bulge = tan(angle/4), always positive for the magnitude
        const absBulge = Math.tan(angleRad / 4);

        // Apply sign based on sweepFlag: positive for counter-clockwise, negative for clockwise
        return arc.sweepFlag ? -absBulge : absBulge;
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
     * Convert color string to RGB object for DXF RGB colors (group code 420)
     * @param {string} color - Color string (hex or rgba)
     * @returns {Object} RGB object with r, g, b properties or number for ACI fallback
     */
    colorToDXFIndex(color) {
        if (!color) return { r: 255, g: 255, b: 255 }; // Default to white

        // If it's already a number, return it (ACI color index fallback)
        if (typeof color === "number") return color;

        // Parse color string
        let r, g, b;

        if (color.startsWith("#")) {
            // Convert hex to RGB
            const hex = color.slice(1);
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else if (color.startsWith("rgba") || color.startsWith("rgb")) {
            // Extract RGB from rgba/rgb
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            }
        }

        if (r !== undefined && g !== undefined && b !== undefined) {
            // Return RGB object for true color support
            return { r, g, b };
        }

        // Fallback to white
        return { r: 255, g: 255, b: 255 };
    }

    /**
     * Get next unique handle for entities
     * @returns {string} Hexadecimal handle
     */
    getNextHandle() {
        const handle = this.handleCounter.toString(16).toUpperCase();
        this.handleCounter++;
        return handle;
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

export default ExportModule;
