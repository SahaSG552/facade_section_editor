/**
 * Export Module
 * Handles export functionality for the application
 */
import BaseModule from "../core/BaseModule.js";
import LoggerFactory from "../core/LoggerFactory.js";
import {
    ARC_APPROX_TOLERANCE,
    ARC_RADIUS_TOLERANCE,
} from "../config/constants.js";

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
        this.log = LoggerFactory.createLogger("ExportModule");
        this.log.info("ExportModule initialized");
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

    /**
     * Parse SVG element to segments (delegates to DXFExporter)
     * @param {SVGElement} svgElement - SVG element to parse
     * @param {number} offsetX - X offset
     * @param {number} offsetY - Y offset
     * @param {function} convertY - Y coordinate converter (or null)
     * @returns {Array} Array of segments
     */
    parseSVGElement(svgElement, offsetX, offsetY, convertY) {
        return this.dxfExporter.parseSVGElement(
            svgElement,
            offsetX,
            offsetY,
            convertY
        );
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
        this.log = LoggerFactory.createLogger("DXFExporter");
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

        // Use CRLF line endings (Windows-style) for DXF compatibility
        return this.dxfContent.join("\r\n");
    }

    /**
     * Write DXF header section (AC1018 format)
     */
    writeHeader() {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("HEADER");

        // Version
        this.dxfContent.push("9");
        this.dxfContent.push("$ACADVER");
        this.dxfContent.push("1");
        this.dxfContent.push("AC1018");

        // Codepage
        this.dxfContent.push("9");
        this.dxfContent.push("$DWGCODEPAGE");
        this.dxfContent.push("3");
        this.dxfContent.push("ANSI_1251");

        // Current layer
        this.dxfContent.push("9");
        this.dxfContent.push("$CLAYER");
        this.dxfContent.push("8");
        this.dxfContent.push("0");

        // Current linetype
        this.dxfContent.push("9");
        this.dxfContent.push("$CELTYPE");
        this.dxfContent.push("6");
        this.dxfContent.push("BYLAYER");

        // Current linetype scale
        this.dxfContent.push("9");
        this.dxfContent.push("$CELTSCALE");
        this.dxfContent.push("40");
        this.dxfContent.push("1");

        // Current lineweight
        this.dxfContent.push("9");
        this.dxfContent.push("$CELWEIGHT");
        this.dxfContent.push("370");
        this.dxfContent.push("-1");

        // Dimension variables
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMALT");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMALTF");
        this.dxfContent.push("40");
        this.dxfContent.push("1");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMPOST");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMAPOST");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMSCALE");
        this.dxfContent.push("40");
        this.dxfContent.push("1");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMASZ");
        this.dxfContent.push("40");
        this.dxfContent.push("0.18");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMCLRD");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMCLRE");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMCLRT");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMEXE");
        this.dxfContent.push("40");
        this.dxfContent.push("0.18");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMEXO");
        this.dxfContent.push("40");
        this.dxfContent.push("0.0625");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMGAP");
        this.dxfContent.push("40");
        this.dxfContent.push("0.0625");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMLFAC");
        this.dxfContent.push("40");
        this.dxfContent.push("1");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMDEC");
        this.dxfContent.push("70");
        this.dxfContent.push("4");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMFRAC");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMTAD");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMCEN");
        this.dxfContent.push("40");
        this.dxfContent.push("0.09");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMTIH");
        this.dxfContent.push("70");
        this.dxfContent.push("1");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMTIX");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMTOH");
        this.dxfContent.push("70");
        this.dxfContent.push("1");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMSE1");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMSE2");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMSD1");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMSD2");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMLWD");
        this.dxfContent.push("70");
        this.dxfContent.push("-1");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMLWE");
        this.dxfContent.push("70");
        this.dxfContent.push("-1");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMSAH");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMBLK");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMBLK1");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMBLK2");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMLDRBLK");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMSTYLE");
        this.dxfContent.push("2");
        this.dxfContent.push("Standard");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMTP");
        this.dxfContent.push("40");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMTM");
        this.dxfContent.push("40");
        this.dxfContent.push("0");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMTXT");
        this.dxfContent.push("40");
        this.dxfContent.push("0.18");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMLUNIT");
        this.dxfContent.push("70");
        this.dxfContent.push("2");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMDSEP");
        this.dxfContent.push("70");
        this.dxfContent.push("46");
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMTXSTY");
        this.dxfContent.push("7");
        this.dxfContent.push("STANDARD");

        // Text size
        this.dxfContent.push("9");
        this.dxfContent.push("$TEXTSIZE");
        this.dxfContent.push("40");
        this.dxfContent.push("0.18");

        // Text style
        this.dxfContent.push("9");
        this.dxfContent.push("$TEXTSTYLE");
        this.dxfContent.push("7");
        this.dxfContent.push("Standard");

        // Handle seed
        this.dxfContent.push("9");
        this.dxfContent.push("$HANDSEED");
        this.dxfContent.push("5");
        this.dxfContent.push("0000000000010085");

        // Fillet radius
        this.dxfContent.push("9");
        this.dxfContent.push("$FILLETRAD");
        this.dxfContent.push("40");
        this.dxfContent.push("0.5");

        // Insert units
        this.dxfContent.push("9");
        this.dxfContent.push("$INSUNITS");
        this.dxfContent.push("70");
        this.dxfContent.push("4");

        // Extents min
        this.dxfContent.push("9");
        this.dxfContent.push("$EXTMIN");
        this.dxfContent.push("10");
        this.dxfContent.push("273.5");
        this.dxfContent.push("20");
        this.dxfContent.push("-346");

        // Extents max
        this.dxfContent.push("9");
        this.dxfContent.push("$EXTMAX");
        this.dxfContent.push("10");
        this.dxfContent.push("673.5");
        this.dxfContent.push("20");
        this.dxfContent.push("373");

        // Limits min
        this.dxfContent.push("9");
        this.dxfContent.push("$LIMMIN");
        this.dxfContent.push("10");
        this.dxfContent.push("0");
        this.dxfContent.push("20");
        this.dxfContent.push("0");

        // Limits max
        this.dxfContent.push("9");
        this.dxfContent.push("$LIMMAX");
        this.dxfContent.push("10");
        this.dxfContent.push("420");
        this.dxfContent.push("20");
        this.dxfContent.push("297");

        // Fill mode
        this.dxfContent.push("9");
        this.dxfContent.push("$FILLMODE");
        this.dxfContent.push("70");
        this.dxfContent.push("1");

        // Linetype scale
        this.dxfContent.push("9");
        this.dxfContent.push("$LTSCALE");
        this.dxfContent.push("40");
        this.dxfContent.push("1");

        // Measurement
        this.dxfContent.push("9");
        this.dxfContent.push("$MEASUREMENT");
        this.dxfContent.push("70");
        this.dxfContent.push("0");

        // Attribute mode
        this.dxfContent.push("9");
        this.dxfContent.push("$ATTMODE");
        this.dxfContent.push("70");
        this.dxfContent.push("1");

        // Point display mode
        this.dxfContent.push("9");
        this.dxfContent.push("$PDMODE");
        this.dxfContent.push("70");
        this.dxfContent.push("0");

        // Point display size
        this.dxfContent.push("9");
        this.dxfContent.push("$PDSIZE");
        this.dxfContent.push("40");
        this.dxfContent.push("0");

        // Tile mode
        this.dxfContent.push("9");
        this.dxfContent.push("$TILEMODE");
        this.dxfContent.push("70");
        this.dxfContent.push("1");

        // UCS origin
        this.dxfContent.push("9");
        this.dxfContent.push("$UCSORG");
        this.dxfContent.push("10");
        this.dxfContent.push("0");
        this.dxfContent.push("20");
        this.dxfContent.push("0");
        this.dxfContent.push("30");
        this.dxfContent.push("0");

        // UCS X direction
        this.dxfContent.push("9");
        this.dxfContent.push("$UCSXDIR");
        this.dxfContent.push("10");
        this.dxfContent.push("1");
        this.dxfContent.push("20");
        this.dxfContent.push("0");
        this.dxfContent.push("30");
        this.dxfContent.push("0");

        // UCS Y direction
        this.dxfContent.push("9");
        this.dxfContent.push("$UCSYDIR");
        this.dxfContent.push("10");
        this.dxfContent.push("0");
        this.dxfContent.push("20");
        this.dxfContent.push("1");
        this.dxfContent.push("30");
        this.dxfContent.push("0");

        // Insert base
        this.dxfContent.push("9");
        this.dxfContent.push("$INSBASE");
        this.dxfContent.push("10");
        this.dxfContent.push("0");
        this.dxfContent.push("20");
        this.dxfContent.push("0");
        this.dxfContent.push("30");
        this.dxfContent.push("0");

        // Xclip frame
        this.dxfContent.push("9");
        this.dxfContent.push("$XCLIPFRAME");
        this.dxfContent.push("290");
        this.dxfContent.push("1");

        // Dimension associativity
        this.dxfContent.push("9");
        this.dxfContent.push("$DIMASSOC");
        this.dxfContent.push("280");
        this.dxfContent.push("2");

        // Lineweight display
        this.dxfContent.push("9");
        this.dxfContent.push("$LWDISPLAY");
        this.dxfContent.push("290");
        this.dxfContent.push("1");

        // Time stamps
        const now = new Date();
        const julianDay = 2440587.5 + now.getTime() / 86400000;
        this.dxfContent.push("9");
        this.dxfContent.push("$TDCREATE");
        this.dxfContent.push("40");
        this.dxfContent.push(julianDay.toString());
        this.dxfContent.push("9");
        this.dxfContent.push("$TDINDWG");
        this.dxfContent.push("40");
        this.dxfContent.push("0.000222210648148148");
        this.dxfContent.push("9");
        this.dxfContent.push("$TDUPDATE");
        this.dxfContent.push("40");
        this.dxfContent.push(julianDay.toString());

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

        // IMAGE class
        this.dxfContent.push("0");
        this.dxfContent.push("CLASS");
        this.dxfContent.push("1");
        this.dxfContent.push("IMAGE");
        this.dxfContent.push("2");
        this.dxfContent.push("AcDbRasterImage");
        this.dxfContent.push("3");
        this.dxfContent.push("ISM");
        this.dxfContent.push("90");
        this.dxfContent.push("2175");
        this.dxfContent.push("91");
        this.dxfContent.push("1");
        this.dxfContent.push("280");
        this.dxfContent.push("0");
        this.dxfContent.push("281");
        this.dxfContent.push("1");

        // IMAGEDEF class
        this.dxfContent.push("0");
        this.dxfContent.push("CLASS");
        this.dxfContent.push("1");
        this.dxfContent.push("IMAGEDEF");
        this.dxfContent.push("2");
        this.dxfContent.push("AcDbRasterImageDef");
        this.dxfContent.push("3");
        this.dxfContent.push("ISM");
        this.dxfContent.push("90");
        this.dxfContent.push("0");
        this.dxfContent.push("91");
        this.dxfContent.push("1");
        this.dxfContent.push("280");
        this.dxfContent.push("0");
        this.dxfContent.push("281");
        this.dxfContent.push("0");

        // WIPEOUT class
        this.dxfContent.push("0");
        this.dxfContent.push("CLASS");
        this.dxfContent.push("1");
        this.dxfContent.push("WIPEOUT");
        this.dxfContent.push("2");
        this.dxfContent.push("AcDbWipeout");
        this.dxfContent.push("3");
        this.dxfContent.push('"WipeOut"');
        this.dxfContent.push("90");
        this.dxfContent.push("2175");
        this.dxfContent.push("91");
        this.dxfContent.push("1");
        this.dxfContent.push("280");
        this.dxfContent.push("0");
        this.dxfContent.push("281");
        this.dxfContent.push("1");

        // WIPEOUTVARIABLES class
        this.dxfContent.push("0");
        this.dxfContent.push("CLASS");
        this.dxfContent.push("1");
        this.dxfContent.push("WIPEOUTVARIABLES");
        this.dxfContent.push("2");
        this.dxfContent.push("AcDbWipeoutVariables");
        this.dxfContent.push("3");
        this.dxfContent.push('"WipeOut"');
        this.dxfContent.push("90");
        this.dxfContent.push("0");
        this.dxfContent.push("91");
        this.dxfContent.push("1");
        this.dxfContent.push("280");
        this.dxfContent.push("0");
        this.dxfContent.push("281");
        this.dxfContent.push("0");

        // MPOLYGON class
        this.dxfContent.push("0");
        this.dxfContent.push("CLASS");
        this.dxfContent.push("1");
        this.dxfContent.push("MPOLYGON");
        this.dxfContent.push("2");
        this.dxfContent.push("AcDbMPolygon");
        this.dxfContent.push("3");
        this.dxfContent.push('"AcMPolygonObj15"');
        this.dxfContent.push("90");
        this.dxfContent.push("3071");
        this.dxfContent.push("91");
        this.dxfContent.push("1");
        this.dxfContent.push("280");
        this.dxfContent.push("0");
        this.dxfContent.push("281");
        this.dxfContent.push("1");

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
        this.dxfContent.push("5");
        this.dxfContent.push("2"); // Table handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");
        this.dxfContent.push("70");
        this.dxfContent.push(totalLayers.toString());

        // Layer 0 (default)
        // this.writeLayer("0", 7, 0, 0, 0); // White color

        // Result layer for combined contour
        this.writeLayer("Default", 0, 0, 0, 0); // Base layer for merged result

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
                        offset.depth !== undefined && offset.depth !== null
                            ? offset.depth
                            : bit.y;

                    // Format depth value: if fractional, add extra _ before value, replace decimal with _
                    let yValue = depthValue?.toString() || "0";
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
        this.addVIEWTable();
        this.addUCSTable();
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

        // Use RGB color (group code 420) AND ACI color index (62)
        if (
            colorIndex &&
            typeof colorIndex === "object" &&
            colorIndex.r !== undefined
        ) {
            // Add ACI color index first (from RGB approximation)
            const aciColor = this.rgbToACI(
                colorIndex.r,
                colorIndex.g,
                colorIndex.b
            );
            this.dxfContent.push("62");
            this.dxfContent.push(aciColor.toString());

            // Then add RGB true color
            const rgbValue =
                colorIndex.r * 256 * 256 + colorIndex.g * 256 + colorIndex.b;
            this.dxfContent.push("420");
            this.dxfContent.push(rgbValue.toString());
        } else {
            // Fallback to ACI color index only
            this.dxfContent.push("62");
            this.dxfContent.push((colorIndex || 7).toString());
        }

        this.dxfContent.push("6");
        this.dxfContent.push("CONTINUOUS");
        this.dxfContent.push("290");
        this.dxfContent.push("1"); // Layer is on
        this.dxfContent.push("370");
        this.dxfContent.push("-3"); // Lineweight (default)
        this.dxfContent.push("390");
        this.dxfContent.push("0"); // Plot style handle
    }

    /**
     * Add LTYPE table with all linetypes including ISO
     */
    addLTYPETable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("5");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");

        // CONTINUOUS
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("106");
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
        this.dxfContent.push("0");

        // BYLAYER
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("107");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("0");
        this.dxfContent.push("40");
        this.dxfContent.push("0");

        // BYBLOCK
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("108");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("BYBLOCK");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("0");
        this.dxfContent.push("40");
        this.dxfContent.push("0");

        // CENTER
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("10063");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("CENTER");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("_ _ ");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("4");
        this.dxfContent.push("40");
        this.dxfContent.push("2");
        this.dxfContent.push("49");
        this.dxfContent.push("1.25");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.25");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("0.25");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.25");
        this.dxfContent.push("74");
        this.dxfContent.push("0");

        // ISO dash
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("10064");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ISO dash");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("_ ");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("2");
        this.dxfContent.push("40");
        this.dxfContent.push("1.5");
        this.dxfContent.push("49");
        this.dxfContent.push("1.2");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");

        // ISO dot
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("10065");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ISO dot");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push(". ");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("2");
        this.dxfContent.push("40");
        this.dxfContent.push("0.3");
        this.dxfContent.push("49");
        this.dxfContent.push("0");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");

        // ISO dash dot
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("10066");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ISO dash dot");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("_ . ");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("4");
        this.dxfContent.push("40");
        this.dxfContent.push("1.8");
        this.dxfContent.push("49");
        this.dxfContent.push("1.2");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("0");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");

        // ISO dash double-dot
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("10067");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ISO dash double-dot");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("_ . . ");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("6");
        this.dxfContent.push("40");
        this.dxfContent.push("2.1");
        this.dxfContent.push("49");
        this.dxfContent.push("1.2");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("0");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("0");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");

        // ISO dash triple-dot
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("10068");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ISO dash triple-dot");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("_ . . . ");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("8");
        this.dxfContent.push("40");
        this.dxfContent.push("2.4");
        this.dxfContent.push("49");
        this.dxfContent.push("1.2");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("0");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("0");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("0");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.3");
        this.dxfContent.push("74");
        this.dxfContent.push("0");

        // ISO dash long gaps
        this.dxfContent.push("0");
        this.dxfContent.push("LTYPE");
        this.dxfContent.push("5");
        this.dxfContent.push("10069");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLinetypeTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ISO dash long gaps");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("_ ");
        this.dxfContent.push("72");
        this.dxfContent.push("65");
        this.dxfContent.push("73");
        this.dxfContent.push("2");
        this.dxfContent.push("40");
        this.dxfContent.push("3");
        this.dxfContent.push("49");
        this.dxfContent.push("1.2");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("-1.8");
        this.dxfContent.push("74");
        this.dxfContent.push("0");

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
        this.dxfContent.push("5");
        this.dxfContent.push("3"); // Table handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");
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
        this.dxfContent.push("Standard");
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
        this.dxfContent.push("5");
        this.dxfContent.push("1002E"); // Exact handle from ABViewer
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");

        // ACAD application
        this.dxfContent.push("0");
        this.dxfContent.push("APPID");
        this.dxfContent.push("5");
        this.dxfContent.push("10A");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbRegAppTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ACAD");
        this.dxfContent.push("70");
        this.dxfContent.push("0");

        // Rhino application
        this.dxfContent.push("0");
        this.dxfContent.push("APPID");
        this.dxfContent.push("5");
        this.dxfContent.push("10B");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbRegAppTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("Rhino");
        this.dxfContent.push("70");
        this.dxfContent.push("0");

        // CSTINVENTORY application
        this.dxfContent.push("0");
        this.dxfContent.push("APPID");
        this.dxfContent.push("5");
        this.dxfContent.push("1001D");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbRegAppTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("CSTINVENTORY");
        this.dxfContent.push("70");
        this.dxfContent.push("0");

        // PE_URL application
        this.dxfContent.push("0");
        this.dxfContent.push("APPID");
        this.dxfContent.push("5");
        this.dxfContent.push("1002F");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbRegAppTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("PE_URL");
        this.dxfContent.push("70");
        this.dxfContent.push("0");

        // AcDbAttr application
        this.dxfContent.push("0");
        this.dxfContent.push("APPID");
        this.dxfContent.push("5");
        this.dxfContent.push("1006C");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbRegAppTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("AcDbAttr");
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
        this.dxfContent.push("5");
        this.dxfContent.push("10030"); // Exact handle from ABViewer
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");

        // *MODEL_SPACE block record
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK_RECORD");
        this.dxfContent.push("5");
        this.dxfContent.push("1F");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("*MODEL_SPACE");

        // *PAPER_SPACE block record
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK_RECORD");
        this.dxfContent.push("5");
        this.dxfContent.push("1B");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("*PAPER_SPACE");

        // _CLOSEDFILLED block record
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK_RECORD");
        this.dxfContent.push("5");
        this.dxfContent.push("10004");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("_CLOSEDFILLED");

        // ABViewer_RedLine block record
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK_RECORD");
        this.dxfContent.push("5");
        this.dxfContent.push("10025");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("ABViewer_RedLine");

        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
    }

    /**
     * Add VIEW table
     */
    addVIEWTable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("VIEW");
        this.dxfContent.push("5");
        this.dxfContent.push("6"); // Table handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");
        this.dxfContent.push("70");
        this.dxfContent.push("0"); // Number of views
        this.dxfContent.push("0");
        this.dxfContent.push("ENDTAB");
    }

    /**
     * Add UCS table
     */
    addUCSTable() {
        this.dxfContent.push("0");
        this.dxfContent.push("TABLE");
        this.dxfContent.push("2");
        this.dxfContent.push("UCS");
        this.dxfContent.push("5");
        this.dxfContent.push("7"); // Table handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");
        this.dxfContent.push("70");
        this.dxfContent.push("0"); // Number of UCS
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
        this.dxfContent.push("5");
        this.dxfContent.push("8"); // Table handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Number of viewports

        // *ACTIVE viewport
        this.dxfContent.push("0");
        this.dxfContent.push("VPORT");
        this.dxfContent.push("5");
        this.dxfContent.push("2A"); // Handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbViewportTableRecord");
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
        this.dxfContent.push("5");
        this.dxfContent.push("A"); // Table handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTable");
        this.dxfContent.push("70");
        this.dxfContent.push("1"); // Number of dimension styles

        // STANDARD dimension style
        this.dxfContent.push("0");
        this.dxfContent.push("DIMSTYLE");
        this.dxfContent.push("5");
        this.dxfContent.push("27"); // Handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSymbolTableRecord");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbDimStyleTableRecord");
        this.dxfContent.push("2");
        this.dxfContent.push("Standard");
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

        // *MODEL_SPACE block
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK");
        this.dxfContent.push("5");
        this.dxfContent.push("10073"); // Handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push("0"); // Layer
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockBegin");
        this.dxfContent.push("2");
        this.dxfContent.push("*MODEL_SPACE");
        this.dxfContent.push("70");
        this.dxfContent.push("0"); // Flags
        this.dxfContent.push("10");
        this.dxfContent.push("0");
        this.dxfContent.push("20");
        this.dxfContent.push("0");
        this.dxfContent.push("30");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("*MODEL_SPACE");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDBLK");
        this.dxfContent.push("5");
        this.dxfContent.push("10074"); // Handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push("0"); // Layer
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockEnd");

        // *PAPER_SPACE block
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK");
        this.dxfContent.push("5");
        this.dxfContent.push("10075"); // Handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("67");
        this.dxfContent.push("1"); // Paper space flag
        this.dxfContent.push("8");
        this.dxfContent.push("0"); // Layer
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockBegin");
        this.dxfContent.push("2");
        this.dxfContent.push("*PAPER_SPACE");
        this.dxfContent.push("70");
        this.dxfContent.push("0"); // Flags
        this.dxfContent.push("10");
        this.dxfContent.push("0");
        this.dxfContent.push("20");
        this.dxfContent.push("0");
        this.dxfContent.push("30");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("*PAPER_SPACE");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDBLK");
        this.dxfContent.push("5");
        this.dxfContent.push("10076"); // Handle
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("67");
        this.dxfContent.push("1"); // Paper space flag
        this.dxfContent.push("8");
        this.dxfContent.push("0"); // Layer
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockEnd");

        // _CLOSEDFILLED block (from ABViewer)
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK");
        this.dxfContent.push("5");
        this.dxfContent.push("10003");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push("0");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockBegin");
        this.dxfContent.push("2");
        this.dxfContent.push("_CLOSEDFILLED");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("10");
        this.dxfContent.push("0");
        this.dxfContent.push("20");
        this.dxfContent.push("0");
        this.dxfContent.push("30");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("_CLOSEDFILLED");
        this.dxfContent.push("1");
        this.dxfContent.push("");

        // SOLID entity inside _CLOSEDFILLED block
        this.dxfContent.push("0");
        this.dxfContent.push("SOLID");
        this.dxfContent.push("5");
        this.dxfContent.push("10001");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push("0");
        this.dxfContent.push("370");
        this.dxfContent.push("-2");
        this.dxfContent.push("62");
        this.dxfContent.push("0");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbTrace");
        this.dxfContent.push("10");
        this.dxfContent.push("-1");
        this.dxfContent.push("20");
        this.dxfContent.push("0.166666666666667");
        this.dxfContent.push("30");
        this.dxfContent.push("0");
        this.dxfContent.push("11");
        this.dxfContent.push("0");
        this.dxfContent.push("21");
        this.dxfContent.push("0");
        this.dxfContent.push("31");
        this.dxfContent.push("0");
        this.dxfContent.push("12");
        this.dxfContent.push("-1");
        this.dxfContent.push("22");
        this.dxfContent.push("0.166666666666667");
        this.dxfContent.push("32");
        this.dxfContent.push("0");
        this.dxfContent.push("13");
        this.dxfContent.push("-1");
        this.dxfContent.push("23");
        this.dxfContent.push("-0.166666666666667");
        this.dxfContent.push("33");
        this.dxfContent.push("0");

        // LINE entity inside _CLOSEDFILLED block
        this.dxfContent.push("0");
        this.dxfContent.push("LINE");
        this.dxfContent.push("5");
        this.dxfContent.push("10002");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push("0");
        this.dxfContent.push("370");
        this.dxfContent.push("-2");
        this.dxfContent.push("62");
        this.dxfContent.push("0");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLine");
        this.dxfContent.push("10");
        this.dxfContent.push("-1");
        this.dxfContent.push("20");
        this.dxfContent.push("0");
        this.dxfContent.push("30");
        this.dxfContent.push("0");
        this.dxfContent.push("11");
        this.dxfContent.push("-2");
        this.dxfContent.push("21");
        this.dxfContent.push("0");
        this.dxfContent.push("31");
        this.dxfContent.push("0");

        this.dxfContent.push("0");
        this.dxfContent.push("ENDBLK");
        this.dxfContent.push("5");
        this.dxfContent.push("10077");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push("0");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockEnd");

        // ABViewer_RedLine block (empty)
        this.dxfContent.push("0");
        this.dxfContent.push("BLOCK");
        this.dxfContent.push("5");
        this.dxfContent.push("10024");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push("0");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockBegin");
        this.dxfContent.push("2");
        this.dxfContent.push("ABViewer_RedLine");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("10");
        this.dxfContent.push("0");
        this.dxfContent.push("20");
        this.dxfContent.push("0");
        this.dxfContent.push("30");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("ABViewer_RedLine");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("0");
        this.dxfContent.push("ENDBLK");
        this.dxfContent.push("5");
        this.dxfContent.push("10078");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push("0");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbBlockEnd");

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
     * @param {SVGElement} partFront - The part front SVG element (rect или path)
     * @param {number} panelThickness - Panel thickness for layer naming
     */
    writePartFront(partFront, panelThickness) {
        const layerName = `CUT_${panelThickness}MM_OU`;

        // Convert SVG coordinates to DXF coordinates (flip Y axis)
        const convertY = (y) => -y;

        // Поддерживаем rect и path
        if (partFront.tagName === "rect") {
            this.writeSVGRect(partFront, 0, 0, layerName, convertY);
        } else if (partFront.tagName === "path") {
            this.writeSVGPath(partFront, 0, 0, layerName, convertY);
        } else {
            this.log.warn(
                "writePartFront: unsupported element type:",
                partFront.tagName
            );
        }
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
        let depthValue =
            offset.depth !== undefined && offset.depth !== null
                ? offset.depth
                : bit.y;

        // Format depth value: if fractional, add extra _ before value, replace decimal with _
        let yValue = depthValue?.toString() || "0";
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
     * Universal SVG element parser
     * Parses any SVG element (rect, circle, polygon, path) to segments
     * @param {SVGElement} svgElement - SVG element to parse
     * @param {number} offsetX - X offset
     * @param {number} offsetY - Y offset
     * @param {function} convertY - Y coordinate converter (or null)
     * @returns {Array} Array of segments [{type: 'line'|'arc'|'bezier', start, end, ...}]
     */
    parseSVGElement(svgElement, offsetX, offsetY, convertY) {
        if (!svgElement) {
            this.log.warn("parseSVGElement: no element provided");
            return [];
        }

        const tagName = svgElement.tagName.toLowerCase();

        switch (tagName) {
            case "rect":
                return this.parseRect(svgElement, offsetX, offsetY, convertY);
            case "circle":
                return this.parseCircle(svgElement, offsetX, offsetY, convertY);
            case "polygon":
                return this.parsePolygon(
                    svgElement,
                    offsetX,
                    offsetY,
                    convertY
                );
            case "path":
                return this.parsePath(svgElement, offsetX, offsetY, convertY);
            default:
                this.log.warn(
                    "parseSVGElement: unsupported element type:",
                    tagName
                );
                return [];
        }
    }

    /**
     * Parse rect element to segments
     */
    parseRect(rectElement, offsetX, offsetY, convertY) {
        const x = parseFloat(rectElement.getAttribute("x")) || 0;
        const y = parseFloat(rectElement.getAttribute("y")) || 0;
        const width = parseFloat(rectElement.getAttribute("width")) || 0;
        const height = parseFloat(rectElement.getAttribute("height")) || 0;

        const x1 = x + offsetX;
        const y1 = convertY ? convertY(y + offsetY) : y + offsetY;
        const x2 = x + width + offsetX;
        const y2 = convertY
            ? convertY(y + height + offsetY)
            : y + height + offsetY;

        return [
            { type: "line", start: [x1, y1], end: [x2, y1] },
            { type: "line", start: [x2, y1], end: [x2, y2] },
            { type: "line", start: [x2, y2], end: [x1, y2] },
            { type: "line", start: [x1, y2], end: [x1, y1] },
        ];
    }

    /**
     * Parse circle element to segments (approximated as arcs)
     */
    parseCircle(circleElement, offsetX, offsetY, convertY) {
        const cx = parseFloat(circleElement.getAttribute("cx")) || 0;
        const cy = parseFloat(circleElement.getAttribute("cy")) || 0;
        const r = parseFloat(circleElement.getAttribute("r")) || 0;

        const centerX = cx + offsetX;
        const centerY = convertY ? convertY(cy + offsetY) : cy + offsetY;

        // Create circle as 4 arc segments
        return [
            {
                type: "arc",
                start: [centerX + r, centerY],
                end: [centerX, centerY + r],
                arc: {
                    cx: centerX,
                    cy: centerY,
                    radius: r,
                    startAngle: 0,
                    endAngle: 90,
                },
            },
            {
                type: "arc",
                start: [centerX, centerY + r],
                end: [centerX - r, centerY],
                arc: {
                    cx: centerX,
                    cy: centerY,
                    radius: r,
                    startAngle: 90,
                    endAngle: 180,
                },
            },
            {
                type: "arc",
                start: [centerX - r, centerY],
                end: [centerX, centerY - r],
                arc: {
                    cx: centerX,
                    cy: centerY,
                    radius: r,
                    startAngle: 180,
                    endAngle: 270,
                },
            },
            {
                type: "arc",
                start: [centerX, centerY - r],
                end: [centerX + r, centerY],
                arc: {
                    cx: centerX,
                    cy: centerY,
                    radius: r,
                    startAngle: 270,
                    endAngle: 360,
                },
            },
        ];
    }

    /**
     * Parse polygon element to segments
     */
    parsePolygon(polygonElement, offsetX, offsetY, convertY) {
        const pointsAttr = polygonElement.getAttribute("points");
        if (!pointsAttr) return [];

        const coords = pointsAttr
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        const segments = [];

        for (let i = 0; i < coords.length - 2; i += 2) {
            const x1 = coords[i] + offsetX;
            const y1 = convertY
                ? convertY(coords[i + 1] + offsetY)
                : coords[i + 1] + offsetY;
            const x2 = coords[i + 2] + offsetX;
            const y2 = convertY
                ? convertY(coords[i + 3] + offsetY)
                : coords[i + 3] + offsetY;

            segments.push({
                type: "line",
                start: [x1, y1],
                end: [x2, y2],
            });
        }

        // Close polygon
        if (coords.length >= 4) {
            const x1 = coords[coords.length - 2] + offsetX;
            const y1 = convertY
                ? convertY(coords[coords.length - 1] + offsetY)
                : coords[coords.length - 1] + offsetY;
            const x2 = coords[0] + offsetX;
            const y2 = convertY
                ? convertY(coords[1] + offsetY)
                : coords[1] + offsetY;

            segments.push({
                type: "line",
                start: [x1, y1],
                end: [x2, y2],
            });
        }

        return segments;
    }

    /**
     * Parse path element to segments
     */
    parsePath(pathElement, offsetX, offsetY, convertY) {
        const d = pathElement.getAttribute("d");
        if (!d) return [];

        return this.parseSVGPathSegments(d, offsetX, offsetY, convertY);
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
                this.log.warn(`Unsupported SVG element type: ${tagName}`);
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
     * Write SVG path as DXF entities (LINE, ARC, SPLINE)
     * Automatically splits compound paths into separate closed contours
     */
    writeSVGPath(svgElement, offsetX, offsetY, layerName, convertY) {
        const d = svgElement.getAttribute("d") || "";

        this.log.debug(
            "SVG Path data:",
            d.substring(0, 200) + (d.length > 200 ? "..." : "")
        );

        // Split path into separate closed contours (handles compound paths from boolean operations)
        const contourPaths = this.splitPathIntoContours(d);

        this.log.debug(
            `Found ${contourPaths.length} closed contour(s) in path`
        );

        // Process each contour separately
        contourPaths.forEach((contourPath, index) => {
            // Parse SVG path and extract all segments
            let segments = this.parseSVGPathSegments(
                contourPath,
                offsetX,
                offsetY,
                convertY
            );
            if (segments.length > 0) {
                // Optimize: convert Bezier curves to arcs where possible
                // Groups consecutive beziers for consistent radius, uses RMS error metric for higher accuracy
                const originalBezierCount = segments.filter(
                    (s) => s.type === "bezier"
                ).length;
                segments = this.optimizeSegmentsToArcs(
                    segments,
                    ARC_APPROX_TOLERANCE
                ); // RMS tolerance for ultra-high precision
                const optimizedBezierCount = segments.filter(
                    (s) => s.type === "bezier"
                ).length;
                const convertedCount =
                    originalBezierCount - optimizedBezierCount;

                if (originalBezierCount > 0) {
                    this.log.debug(
                        `Contour ${index + 1
                        }: Bezier → Arc: converted ${convertedCount}/${originalBezierCount} (${(
                            (convertedCount / originalBezierCount) *
                            100
                        ).toFixed(0)}%)`
                    );
                }

                // Экспортируем каждый контур как отдельную entity
                this.writePathAsPolyline(segments, layerName);
            }
        });
    }

    /**
     * Split SVG path into separate closed contours
     * Handles compound paths created by boolean operations (e.g., "M...Z M...Z M...Z")
     * @param {string} d - SVG path data
     * @returns {Array<string>} Array of path strings, each representing a closed contour
     */
    splitPathIntoContours(d) {
        if (!d) return [];

        // Simple regex-based approach: split on pattern "Z M" or "z M" (end of one contour, start of next)
        // This handles the most common case from Paper.js boolean operations

        // First, normalize spacing around commands
        const normalized = d
            .replace(/([MmLlHhVvCcSsQqTtAaZz])/g, " $1 ")
            .replace(/\s+/g, " ")
            .trim();

        // Split by Z followed by M (case insensitive)
        const parts = normalized.split(/\s*[Zz]\s+(?=[Mm])/);

        const contours = parts
            .map((part, index) => {
                // Add back the Z command that was removed during split (except for last part)
                let contour = part.trim();
                if (index < parts.length - 1 || normalized.match(/[Zz]\s*$/)) {
                    // Add Z if this isn't the last part, or if original path ended with Z
                    contour += " Z";
                }
                return contour;
            })
            .filter((c) => c.length > 0);

        // Fallback: if no splitting occurred, return original
        if (contours.length === 0) {
            return [d];
        }

        return contours;
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
     * Write DXF objects section (AC1018 format)
     */
    writeObjects() {
        this.dxfContent.push("0");
        this.dxfContent.push("SECTION");
        this.dxfContent.push("2");
        this.dxfContent.push("OBJECTS");

        // Main dictionary
        this.dxfContent.push("0");
        this.dxfContent.push("DICTIONARY");
        this.dxfContent.push("5");
        this.dxfContent.push("10079");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbDictionary");
        this.dxfContent.push("3");
        this.dxfContent.push("ACAD_GROUP");
        this.dxfContent.push("350");
        this.dxfContent.push("1007A");
        this.dxfContent.push("3");
        this.dxfContent.push("ACAD_MATERIAL");
        this.dxfContent.push("350");
        this.dxfContent.push("1007B");
        this.dxfContent.push("3");
        this.dxfContent.push("ACAD_WIPEOUT_VARS");
        this.dxfContent.push("350");
        this.dxfContent.push("1007C");
        this.dxfContent.push("3");
        this.dxfContent.push("ACAD_MLINESTYLE");
        this.dxfContent.push("350");
        this.dxfContent.push("1007D");
        this.dxfContent.push("3");
        this.dxfContent.push("ACAD_IMAGE_VARS");
        this.dxfContent.push("350");
        this.dxfContent.push("1007E");
        this.dxfContent.push("3");
        this.dxfContent.push("AcDbVariableDictionary");
        this.dxfContent.push("350");
        this.dxfContent.push("1007F");
        this.dxfContent.push("3");
        this.dxfContent.push("ACAD_LAYOUT");
        this.dxfContent.push("350");
        this.dxfContent.push("10080");
        this.dxfContent.push("3");
        this.dxfContent.push("Model");
        this.dxfContent.push("350");
        this.dxfContent.push("22");

        // ACAD_GROUP dictionary
        this.dxfContent.push("0");
        this.dxfContent.push("DICTIONARY");
        this.dxfContent.push("5");
        this.dxfContent.push("1007A");
        this.dxfContent.push("330");
        this.dxfContent.push("10079");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbDictionary");

        // ACAD_MATERIAL dictionary
        this.dxfContent.push("0");
        this.dxfContent.push("DICTIONARY");
        this.dxfContent.push("5");
        this.dxfContent.push("1007B");
        this.dxfContent.push("330");
        this.dxfContent.push("10079");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbDictionary");

        // WIPEOUTVARIABLES
        this.dxfContent.push("0");
        this.dxfContent.push("WIPEOUTVARIABLES");
        this.dxfContent.push("5");
        this.dxfContent.push("1007C");
        this.dxfContent.push("330");
        this.dxfContent.push("10079");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbWipeoutVariables");
        this.dxfContent.push("70");
        this.dxfContent.push("1");

        // ACAD_MLINESTYLE dictionary
        this.dxfContent.push("0");
        this.dxfContent.push("DICTIONARY");
        this.dxfContent.push("5");
        this.dxfContent.push("1007D");
        this.dxfContent.push("330");
        this.dxfContent.push("10079");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbDictionary");
        this.dxfContent.push("3");
        this.dxfContent.push("STANDARD");
        this.dxfContent.push("350");
        this.dxfContent.push("10081");

        // MLINESTYLE Standard
        this.dxfContent.push("0");
        this.dxfContent.push("MLINESTYLE");
        this.dxfContent.push("5");
        this.dxfContent.push("10081");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbMlineStyle");
        this.dxfContent.push("2");
        this.dxfContent.push("STANDARD");
        this.dxfContent.push("70");
        this.dxfContent.push("0");
        this.dxfContent.push("3");
        this.dxfContent.push("");
        this.dxfContent.push("62");
        this.dxfContent.push("256");
        this.dxfContent.push("51");
        this.dxfContent.push("90");
        this.dxfContent.push("52");
        this.dxfContent.push("90");
        this.dxfContent.push("71");
        this.dxfContent.push("2");
        this.dxfContent.push("49");
        this.dxfContent.push("0.5");
        this.dxfContent.push("62");
        this.dxfContent.push("256");
        this.dxfContent.push("6");
        this.dxfContent.push("ByLayer");
        this.dxfContent.push("49");
        this.dxfContent.push("-0.5");
        this.dxfContent.push("62");
        this.dxfContent.push("256");
        this.dxfContent.push("6");
        this.dxfContent.push("ByLayer");

        // ACAD_LAYOUT dictionary
        this.dxfContent.push("0");
        this.dxfContent.push("DICTIONARY");
        this.dxfContent.push("5");
        this.dxfContent.push("10080");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbDictionary");
        this.dxfContent.push("281");
        this.dxfContent.push("1");

        // Model Layout
        this.dxfContent.push("0");
        this.dxfContent.push("LAYOUT");
        this.dxfContent.push("5");
        this.dxfContent.push("22");
        this.dxfContent.push("102");
        this.dxfContent.push("{ACAD_REACTORS");
        this.dxfContent.push("330");
        this.dxfContent.push("10080");
        this.dxfContent.push("102");
        this.dxfContent.push("}");
        this.dxfContent.push("330");
        this.dxfContent.push("10080");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbPlotSettings");
        this.dxfContent.push("1");
        this.dxfContent.push("");
        this.dxfContent.push("2");
        this.dxfContent.push("none_device");
        this.dxfContent.push("4");
        this.dxfContent.push("");
        this.dxfContent.push("6");
        this.dxfContent.push("");
        this.dxfContent.push("40");
        this.dxfContent.push("0");
        this.dxfContent.push("41");
        this.dxfContent.push("0");
        this.dxfContent.push("42");
        this.dxfContent.push("0");
        this.dxfContent.push("43");
        this.dxfContent.push("0");
        this.dxfContent.push("44");
        this.dxfContent.push("0");
        this.dxfContent.push("45");
        this.dxfContent.push("0");
        this.dxfContent.push("46");
        this.dxfContent.push("0");
        this.dxfContent.push("47");
        this.dxfContent.push("0");
        this.dxfContent.push("48");
        this.dxfContent.push("0");
        this.dxfContent.push("49");
        this.dxfContent.push("0");
        this.dxfContent.push("70");
        this.dxfContent.push("1712");
        this.dxfContent.push("72");
        this.dxfContent.push("0");
        this.dxfContent.push("73");
        this.dxfContent.push("0");
        this.dxfContent.push("74");
        this.dxfContent.push("0");
        this.dxfContent.push("75");
        this.dxfContent.push("0");
        this.dxfContent.push("76");
        this.dxfContent.push("0");
        this.dxfContent.push("77");
        this.dxfContent.push("2");
        this.dxfContent.push("78");
        this.dxfContent.push("300");
        this.dxfContent.push("140");
        this.dxfContent.push("0");
        this.dxfContent.push("141");
        this.dxfContent.push("0");
        this.dxfContent.push("142");
        this.dxfContent.push("1");
        this.dxfContent.push("143");
        this.dxfContent.push("1");
        this.dxfContent.push("147");
        this.dxfContent.push("1");
        this.dxfContent.push("148");
        this.dxfContent.push("0");
        this.dxfContent.push("149");
        this.dxfContent.push("0");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLayout");
        this.dxfContent.push("1");
        this.dxfContent.push("Model");
        this.dxfContent.push("70");
        this.dxfContent.push("1");
        this.dxfContent.push("71");
        this.dxfContent.push("1");
        this.dxfContent.push("10");
        this.dxfContent.push("273.5");
        this.dxfContent.push("20");
        this.dxfContent.push("-346");
        this.dxfContent.push("11");
        this.dxfContent.push("673.5");
        this.dxfContent.push("21");
        this.dxfContent.push("373");
        this.dxfContent.push("12");
        this.dxfContent.push("0");
        this.dxfContent.push("22");
        this.dxfContent.push("0");
        this.dxfContent.push("32");
        this.dxfContent.push("0");
        this.dxfContent.push("14");
        this.dxfContent.push("273.5");
        this.dxfContent.push("24");
        this.dxfContent.push("-346");
        this.dxfContent.push("34");
        this.dxfContent.push("0");
        this.dxfContent.push("15");
        this.dxfContent.push("673.5");
        this.dxfContent.push("25");
        this.dxfContent.push("373");
        this.dxfContent.push("35");
        this.dxfContent.push("0");
        this.dxfContent.push("146");
        this.dxfContent.push("0");
        this.dxfContent.push("13");
        this.dxfContent.push("0");
        this.dxfContent.push("23");
        this.dxfContent.push("0");
        this.dxfContent.push("33");
        this.dxfContent.push("0");
        this.dxfContent.push("16");
        this.dxfContent.push("1");
        this.dxfContent.push("26");
        this.dxfContent.push("0");
        this.dxfContent.push("36");
        this.dxfContent.push("0");
        this.dxfContent.push("17");
        this.dxfContent.push("0");
        this.dxfContent.push("27");
        this.dxfContent.push("1");
        this.dxfContent.push("37");
        this.dxfContent.push("0");
        this.dxfContent.push("76");
        this.dxfContent.push("0");
        this.dxfContent.push("330");
        this.dxfContent.push("1F");

        // RASTERVARIABLES
        this.dxfContent.push("0");
        this.dxfContent.push("RASTERVARIABLES");
        this.dxfContent.push("5");
        this.dxfContent.push("1007E");
        this.dxfContent.push("330");
        this.dxfContent.push("10079");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbRasterVariables");
        this.dxfContent.push("90");
        this.dxfContent.push("0");
        this.dxfContent.push("70");
        this.dxfContent.push("1");
        this.dxfContent.push("71");
        this.dxfContent.push("0");
        this.dxfContent.push("72");
        this.dxfContent.push("0");

        // AcDbVariableDictionary
        this.dxfContent.push("0");
        this.dxfContent.push("DICTIONARY");
        this.dxfContent.push("5");
        this.dxfContent.push("1007F");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbDictionary");
        this.dxfContent.push("281");
        this.dxfContent.push("1");
        this.dxfContent.push("3");
        this.dxfContent.push("XCLIPFRAME");
        this.dxfContent.push("350");
        this.dxfContent.push("10082");

        // DICTIONARYVAR
        this.dxfContent.push("0");
        this.dxfContent.push("DICTIONARYVAR");
        this.dxfContent.push("5");
        this.dxfContent.push("10082");
        this.dxfContent.push("330");
        this.dxfContent.push("1007F");
        this.dxfContent.push("100");
        this.dxfContent.push("DictionaryVariables");
        this.dxfContent.push("280");
        this.dxfContent.push("0");
        this.dxfContent.push("1");
        this.dxfContent.push("1");

        // DICTIONARY with XINFO
        this.dxfContent.push("0");
        this.dxfContent.push("DICTIONARY");
        this.dxfContent.push("5");
        this.dxfContent.push("10083");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbDictionary");
        this.dxfContent.push("280");
        this.dxfContent.push("1");
        this.dxfContent.push("3");
        this.dxfContent.push("XINFO");
        this.dxfContent.push("360");
        this.dxfContent.push("10084");

        // XRECORD
        this.dxfContent.push("0");
        this.dxfContent.push("XRECORD");
        this.dxfContent.push("5");
        this.dxfContent.push("10084");
        this.dxfContent.push("102");
        this.dxfContent.push("{ACAD_REACTORS");
        this.dxfContent.push("330");
        this.dxfContent.push("10083");
        this.dxfContent.push("102");
        this.dxfContent.push("}");
        this.dxfContent.push("330");
        this.dxfContent.push("10083");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbXrecord");
        this.dxfContent.push("280");
        this.dxfContent.push("0");
        this.dxfContent.push("310");
        this.dxfContent.push("0700000001000F00");
        this.dxfContent.push("311");
        this.dxfContent.push("49CE427F88329852");

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
     * Parse SVG path and extract all segments (lines, arcs, and Bezier curves)
     * Bezier curves are preserved exactly as SPLINE, not approximated
     * @param {string} d - SVG path data
     * @param {number} offsetX - X offset
     * @param {number} offsetY - Y offset
     * @param {function} convertY - Y coordinate converter
     * @param {boolean} invertRelativeY - If true, invert Y for relative commands (for DXF export). Default true.
     * @returns {Array} Array of segments (lines, arcs, bezier)
     */
    parseSVGPathSegments(
        d,
        offsetX,
        offsetY,
        convertY,
        invertRelativeY = true
    ) {
        // Default convertY to identity function if not provided
        if (!convertY) {
            convertY = (y) => y;
        }

        const segments = [];
        const commands = this.parseSVGPathCommands(d);

        let currentX = 0;
        let currentY = 0;
        let startX = 0;
        let startY = 0;
        let lastControlX = 0; // Для команд S и T
        let lastControlY = 0;
        let lastCommand = null;

        for (const command of commands) {
            switch (command.type) {
                case "M": // Move to
                    if (command.isRelative) {
                        currentX += command.x;
                        if (invertRelativeY) {
                            currentY +=
                                convertY(command.y) - currentY + currentY;
                            currentY = convertY(
                                command.y + (currentY - convertY(0))
                            );
                        } else {
                            currentY += command.y;
                        }
                    } else {
                        currentX = command.x + offsetX;
                        currentY = convertY(command.y + offsetY);
                    }
                    startX = currentX;
                    startY = currentY;
                    break;
                case "L": // Line to
                    let lineEndX, lineEndY;
                    if (command.isRelative) {
                        lineEndX = currentX + command.x;
                        lineEndY = invertRelativeY
                            ? currentY - command.y
                            : currentY + command.y;
                    } else {
                        lineEndX = command.x + offsetX;
                        lineEndY = convertY(command.y + offsetY);
                    }

                    segments.push({
                        type: "line",
                        start: { x: currentX, y: currentY },
                        end: { x: lineEndX, y: lineEndY },
                    });

                    currentX = lineEndX;
                    currentY = lineEndY;
                    break;
                case "H": // Horizontal line
                    let hEndX;
                    if (command.isRelative) {
                        hEndX = currentX + command.x;
                    } else {
                        hEndX = command.x + offsetX;
                    }

                    segments.push({
                        type: "line",
                        start: { x: currentX, y: currentY },
                        end: { x: hEndX, y: currentY },
                    });

                    currentX = hEndX;
                    break;
                case "V": // Vertical line
                    let vEndY;
                    if (command.isRelative) {
                        vEndY = invertRelativeY
                            ? currentY - command.y
                            : currentY + command.y;
                    } else {
                        vEndY = convertY(command.y + offsetY);
                    }

                    segments.push({
                        type: "line",
                        start: { x: currentX, y: currentY },
                        end: { x: currentX, y: vEndY },
                    });

                    currentY = vEndY;
                    break;
                case "C": // Cubic Bezier curve - сохраняем как кривую!
                    let cEndX, cEndY, cX1, cY1, cX2, cY2;

                    if (command.isRelative) {
                        cX1 = currentX + command.x1;
                        cY1 = invertRelativeY
                            ? currentY - command.y1
                            : currentY + command.y1;
                        cX2 = currentX + command.x2;
                        cY2 = invertRelativeY
                            ? currentY - command.y2
                            : currentY + command.y2;
                        cEndX = currentX + command.x;
                        cEndY = invertRelativeY
                            ? currentY - command.y
                            : currentY + command.y;
                    } else {
                        cX1 = command.x1 + offsetX;
                        cY1 = convertY(command.y1 + offsetY);
                        cX2 = command.x2 + offsetX;
                        cY2 = convertY(command.y2 + offsetY);
                        cEndX = command.x + offsetX;
                        cEndY = convertY(command.y + offsetY);
                    }

                    // Сохраняем кривую Bezier как сегмент
                    segments.push({
                        type: "bezier",
                        start: { x: currentX, y: currentY },
                        cp1: { x: cX1, y: cY1 },
                        cp2: { x: cX2, y: cY2 },
                        end: { x: cEndX, y: cEndY },
                    });

                    // Запоминаем вторую контрольную точку для команды S
                    lastControlX = cX2;
                    lastControlY = cY2;
                    currentX = cEndX;
                    currentY = cEndY;
                    break;
                case "S": // Smooth cubic Bezier curve
                    let sEndX, sEndY, sX1, sX2, sY1, sY2;

                    // Первая контрольная точка отражается от предыдущей
                    if (lastCommand === "C" || lastCommand === "S") {
                        sX1 = 2 * currentX - lastControlX;
                        sY1 = 2 * currentY - lastControlY;
                    } else {
                        sX1 = currentX;
                        sY1 = currentY;
                    }

                    if (command.isRelative) {
                        sX2 = currentX + command.x2;
                        sY2 = invertRelativeY
                            ? currentY - command.y2
                            : currentY + command.y2;
                        sEndX = currentX + command.x;
                        sEndY = invertRelativeY
                            ? currentY - command.y
                            : currentY + command.y;
                    } else {
                        sX2 = command.x2 + offsetX;
                        sY2 = convertY(command.y2 + offsetY);
                        sEndX = command.x + offsetX;
                        sEndY = convertY(command.y + offsetY);
                    }

                    segments.push({
                        type: "bezier",
                        start: { x: currentX, y: currentY },
                        cp1: { x: sX1, y: sY1 },
                        cp2: { x: sX2, y: sY2 },
                        end: { x: sEndX, y: sEndY },
                    });

                    lastControlX = sX2;
                    lastControlY = sY2;
                    currentX = sEndX;
                    currentY = sEndY;
                    break;
                case "Q": // Quadratic Bezier curve - конвертируем в кубическую
                    let qEndX, qEndY, qX1, qY1;

                    if (command.isRelative) {
                        qX1 = currentX + command.x1;
                        qY1 = invertRelativeY
                            ? currentY - command.y1
                            : currentY + command.y1;
                        qEndX = currentX + command.x;
                        qEndY = invertRelativeY
                            ? currentY - command.y
                            : currentY + command.y;
                    } else {
                        qX1 = command.x1 + offsetX;
                        qY1 = convertY(command.y1 + offsetY);
                        qEndX = command.x + offsetX;
                        qEndY = convertY(command.y + offsetY);
                    }

                    // Конвертируем квадратичную кривую в кубическую
                    // CP1 = P0 + 2/3 * (Q1 - P0)
                    // CP2 = P2 + 2/3 * (Q1 - P2)
                    const qcp1x = currentX + (2 / 3) * (qX1 - currentX);
                    const qcp1y = currentY + (2 / 3) * (qY1 - currentY);
                    const qcp2x = qEndX + (2 / 3) * (qX1 - qEndX);
                    const qcp2y = qEndY + (2 / 3) * (qY1 - qEndY);

                    segments.push({
                        type: "bezier",
                        start: { x: currentX, y: currentY },
                        cp1: { x: qcp1x, y: qcp1y },
                        cp2: { x: qcp2x, y: qcp2y },
                        end: { x: qEndX, y: qEndY },
                    });

                    // Запоминаем контрольную точку для команды T
                    lastControlX = qX1;
                    lastControlY = qY1;
                    currentX = qEndX;
                    currentY = qEndY;
                    break;
                case "T": // Smooth quadratic Bezier curve
                    let tEndX, tEndY, tX1, tY1;

                    // Контрольная точка отражается от предыдущей
                    if (lastCommand === "Q" || lastCommand === "T") {
                        tX1 = 2 * currentX - lastControlX;
                        tY1 = 2 * currentY - lastControlY;
                    } else {
                        tX1 = currentX;
                        tY1 = currentY;
                    }

                    if (command.isRelative) {
                        tEndX = currentX + command.x;
                        tEndY = invertRelativeY
                            ? currentY - command.y
                            : currentY + command.y;
                    } else {
                        tEndX = command.x + offsetX;
                        tEndY = convertY(command.y + offsetY);
                    }

                    // Конвертируем в кубическую
                    const tcp1x = currentX + (2 / 3) * (tX1 - currentX);
                    const tcp1y = currentY + (2 / 3) * (tY1 - currentY);
                    const tcp2x = tEndX + (2 / 3) * (tX1 - tEndX);
                    const tcp2y = tEndY + (2 / 3) * (tY1 - tEndY);

                    segments.push({
                        type: "bezier",
                        start: { x: currentX, y: currentY },
                        cp1: { x: tcp1x, y: tcp1y },
                        cp2: { x: tcp2x, y: tcp2y },
                        end: { x: tEndX, y: tEndY },
                    });

                    lastControlX = tX1;
                    lastControlY = tY1;
                    currentX = tEndX;
                    currentY = tEndY;
                    break;
                case "A": // Arc to
                    const arcStartX = currentX;
                    const arcStartY = currentY;
                    let arcEndX, arcEndY;

                    this.log.debug(`[Arc Parse] Processing A command:`);
                    this.log.debug(
                        `  Current position: (${currentX.toFixed(
                            2
                        )}, ${currentY.toFixed(2)})`
                    );
                    this.log.debug(
                        `  Command params: rx=${command.rx} ry=${command.ry} rot=${command.xAxisRotation} large=${command.largeArcFlag} sweep=${command.sweepFlag} x=${command.x} y=${command.y}`
                    );
                    this.log.debug(`  isRelative: ${command.isRelative}`);

                    if (command.isRelative) {
                        arcEndX = currentX + command.x;
                        arcEndY = invertRelativeY
                            ? currentY - command.y
                            : currentY + command.y;
                        this.log.debug(
                            `  Relative: adding (${command.x}, ${command.y
                            }) → end (${arcEndX.toFixed(2)}, ${arcEndY.toFixed(
                                2
                            )})`
                        );
                    } else {
                        arcEndX = command.x + offsetX;
                        arcEndY = convertY(command.y + offsetY);
                        this.log.debug(
                            `  Absolute: x=${command.x}+${offsetX}, y=${command.y
                            }+${offsetY} → convertY → end (${arcEndX.toFixed(
                                2
                            )}, ${arcEndY.toFixed(2)})`
                        );
                    }

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
                        this.log.debug(
                            `  Arc converted: center=(${arc.centerX.toFixed(
                                2
                            )}, ${arc.centerY.toFixed(
                                2
                            )}) radius=${arc.radius.toFixed(2)}`
                        );
                        segments.push({
                            type: "arc",
                            start: { x: arcStartX, y: arcStartY },
                            end: { x: arcEndX, y: arcEndY },
                            arc: arc,
                        });
                    } else {
                        this.log.warn(
                            `  Arc conversion FAILED - using LINE instead to preserve contour`
                        );
                        // Fallback: use line to preserve contour continuity
                        segments.push({
                            type: "line",
                            start: { x: arcStartX, y: arcStartY },
                            end: { x: arcEndX, y: arcEndY },
                        });
                    }

                    currentX = arcEndX;
                    currentY = arcEndY;
                    break;
                case "Z": // Close path
                    // If we're not at the start point, draw a line to close
                    // Use tolerance to avoid adding zero-length lines
                    const tolerance = ARC_RADIUS_TOLERANCE;
                    const distX = Math.abs(currentX - startX);
                    const distY = Math.abs(currentY - startY);

                    if (distX > tolerance || distY > tolerance) {
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

            lastCommand = command.type;
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
        const regex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
        let match;

        while ((match = regex.exec(d)) !== null) {
            const commandChar = match[1]; // Сохраняем оригинальный регистр!
            const type = commandChar.toUpperCase();
            const isRelative = commandChar !== type; // lowercase = относительные координаты

            const params = match[2]
                .trim()
                .split(/[\s,]+/)
                .filter((p) => p.length > 0) // Фильтруем пустые строки
                .map(Number);

            switch (type) {
                case "M":
                case "L":
                    // M и L могут иметь множественные пары координат
                    for (let i = 0; i < params.length; i += 2) {
                        commands.push({
                            type: i === 0 ? type : "L", // После первой M остальные точки - это L
                            isRelative:
                                i === 0
                                    ? isRelative
                                    : type === "M"
                                        ? false
                                        : isRelative,
                            x: params[i] || 0,
                            y: params[i + 1] || 0,
                        });
                    }
                    break;
                case "H": // Horizontal line
                    for (let i = 0; i < params.length; i++) {
                        commands.push({
                            type,
                            isRelative,
                            x: params[i] || 0,
                        });
                    }
                    break;
                case "V": // Vertical line
                    for (let i = 0; i < params.length; i++) {
                        commands.push({
                            type,
                            isRelative,
                            y: params[i] || 0,
                        });
                    }
                    break;
                case "C": // Cubic Bezier curve - может быть несколько кривых
                    for (let i = 0; i < params.length; i += 6) {
                        commands.push({
                            type,
                            isRelative,
                            x1: params[i] || 0, // Control point 1 X
                            y1: params[i + 1] || 0, // Control point 1 Y
                            x2: params[i + 2] || 0, // Control point 2 X
                            y2: params[i + 3] || 0, // Control point 2 Y
                            x: params[i + 4] || 0, // End point X
                            y: params[i + 5] || 0, // End point Y
                        });
                    }
                    break;
                case "S": // Smooth cubic Bezier - может быть несколько кривых
                    for (let i = 0; i < params.length; i += 4) {
                        commands.push({
                            type,
                            isRelative,
                            x2: params[i] || 0, // Control point 2 X
                            y2: params[i + 1] || 0, // Control point 2 Y
                            x: params[i + 2] || 0, // End point X
                            y: params[i + 3] || 0, // End point Y
                        });
                    }
                    break;
                case "Q": // Quadratic Bezier curve - может быть несколько кривых
                    for (let i = 0; i < params.length; i += 4) {
                        commands.push({
                            type,
                            isRelative,
                            x1: params[i] || 0, // Control point X
                            y1: params[i + 1] || 0, // Control point Y
                            x: params[i + 2] || 0, // End point X
                            y: params[i + 3] || 0, // End point Y
                        });
                    }
                    break;
                case "T": // Smooth quadratic Bezier - может быть несколько кривых
                    for (let i = 0; i < params.length; i += 2) {
                        commands.push({
                            type,
                            isRelative,
                            x: params[i] || 0, // End point X
                            y: params[i + 1] || 0, // End point Y
                        });
                    }
                    break;
                case "A": // Arc - может быть несколько дуг
                    for (let i = 0; i < params.length; i += 7) {
                        commands.push({
                            type,
                            isRelative,
                            rx: params[i] || 0,
                            ry: params[i + 1] || 0,
                            xAxisRotation: params[i + 2] || 0,
                            largeArcFlag: params[i + 3] || 0,
                            sweepFlag: params[i + 4] || 0,
                            x: params[i + 5] || 0,
                            y: params[i + 6] || 0,
                        });
                    }
                    break;
                case "Z":
                    commands.push({
                        type,
                        isRelative: false, // Z всегда абсолютная
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
        this.log.debug(`[Arc Conversion] svgArcToDXFArc called:`);
        this.log.debug(`  Start: (${x1.toFixed(2)}, ${y1.toFixed(2)})`);
        this.log.debug(`  End: (${x2.toFixed(2)}, ${y2.toFixed(2)})`);
        this.log.debug(
            `  rx=${rx} ry=${ry} rotation=${xAxisRotation}° large=${largeArcFlag} sweep=${sweepFlag}`
        );

        // Only support circular arcs without rotation
        if (Math.abs(rx - ry) > 0.001 || Math.abs(xAxisRotation) > 0.001) {
            this.log.warn(`  REJECTED: elliptical (rx≠ry) or rotated arc`);
            return null;
        }

        let radius = rx; // Use 'let' to allow auto-correction
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.log.debug(
            `  Chord: dx=${dx.toFixed(2)} dy=${dy.toFixed(
                2
            )} distance=${distance.toFixed(2)}`
        );

        if (distance === 0 || radius === 0) {
            this.log.warn(`  REJECTED: zero distance or radius`);
            return null;
        }

        const halfDistance = distance / 2;
        let radiusSquared = radius * radius;
        const halfDistanceSquared = halfDistance * halfDistance;

        // Add tolerance for semicircle case (radius ≈ chord/2) to handle floating point precision
        const tolerance = ARC_RADIUS_TOLERANCE; // mm tolerance for rounding errors
        if (radiusSquared < halfDistanceSquared - tolerance) {
            // Auto-correct radius like SVG does (scale to minimum required)
            const correctedRadius = halfDistance;
            this.log.warn(
                `  AUTO-CORRECTING radius: ${radius.toFixed(
                    2
                )}mm → ${correctedRadius.toFixed(
                    2
                )}mm (chord requires min ${halfDistance.toFixed(2)}mm)`
            );
            radius = correctedRadius;
            radiusSquared = radius * radius;
        }

        const height = Math.sqrt(
            Math.max(0, radiusSquared - halfDistanceSquared)
        );

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const perpX = -dy / distance;
        const perpY = dx / distance;

        const centerOffset = height * (sweepFlag ? -1 : 1);
        const centerX = midX + perpX * centerOffset;
        const centerY = midY + perpY * centerOffset;

        this.log.debug(`  Mid: (${midX.toFixed(2)}, ${midY.toFixed(2)})`);
        this.log.debug(`  Perp: (${perpX.toFixed(3)}, ${perpY.toFixed(3)})`);
        this.log.debug(
            `  Height: ${height.toFixed(
                2
            )} centerOffset: ${centerOffset.toFixed(2)}`
        );
        this.log.debug(
            `  Center: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`
        );

        let startAngle =
            Math.atan2(y1 - centerY, x1 - centerX) * (180 / Math.PI);
        let endAngle = Math.atan2(y2 - centerY, x2 - centerX) * (180 / Math.PI);

        // Normalize angles to 0-360
        const normalizeAngle = (angle) => ((angle % 360) + 360) % 360;
        startAngle = normalizeAngle(startAngle);
        endAngle = normalizeAngle(endAngle);

        this.log.debug(
            `  Angles: start=${startAngle.toFixed(2)}° end=${endAngle.toFixed(
                2
            )}°`
        );
        this.log.debug(`  ✓ SUCCESS`);

        return { centerX, centerY, radius, startAngle, endAngle, sweepFlag };
    }

    /**
     * Convert cubic Bezier curve to arc using least-squares circle fitting
     * @param {number} x0 - Start X
     * @param {number} y0 - Start Y
     * @param {number} x1 - Control point 1 X
     * @param {number} y1 - Control point 1 Y
     * @param {number} x2 - Control point 2 X
     * @param {number} y2 - Control point 2 Y
     * @param {number} x3 - End X
     * @param {number} y3 - End Y
     * @param {number} tolerance - Maximum distance error (default: 0.01)
     * @returns {Object|null} Arc parameters {cx, cy, radius, startAngle, endAngle, sweepFlag} or null if not circular enough
     */
    bezierToArc(
        x0,
        y0,
        x1,
        y1,
        x2,
        y2,
        x3,
        y3,
        tolerance = ARC_RADIUS_TOLERANCE
    ) {
        // Key approach: keep start and end points FIXED, find circle through them + midpoint
        // This ensures arc endpoints match Bezier endpoints exactly

        // Get Bezier curve points: start, end, and middle
        const startPoint = { x: x0, y: y0 };
        const endPoint = { x: x3, y: y3 };

        // Calculate middle point of Bezier at t=0.5
        const midT = 0.5;
        const midX = this.evalBezier(midT, x0, x1, x2, x3);
        const midY = this.evalBezier(midT, y0, y1, y2, y3);
        const midPoint = { x: midX, y: midY };

        // Fit circle through 3 key points: start, mid, end
        // This ensures the arc will pass through these exact points
        const circle = this.fitCircleToPoints([startPoint, midPoint, endPoint]);
        if (!circle) {
            this.log.debug(
                `  Bezier→Arc FAILED: circle fit through key points failed`
            );
            return null;
        }

        // Validate circle fit against all sampled points
        const samples = this.sampleBezierCurve(
            x0,
            y0,
            x1,
            y1,
            x2,
            y2,
            x3,
            y3,
            32 // Sample for validation
        );

        let maxError = 0;
        for (const point of samples) {
            const dist = Math.sqrt(
                (point.x - circle.cx) ** 2 + (point.y - circle.cy) ** 2
            );
            const error = Math.abs(dist - circle.radius);
            maxError = Math.max(maxError, error);
        }

        if (maxError > tolerance) {
            this.log.debug(
                `  Bezier→Arc FAILED: maxError=${maxError.toFixed(
                    3
                )}mm > tolerance=${tolerance}mm`
            );
            return null; // Not circular enough
        }

        // Calculate angles to start and end points
        // These will be EXACT because start/end points are on the circle
        const startAngleRad = Math.atan2(y0 - circle.cy, x0 - circle.cx);
        const endAngleRad = Math.atan2(y3 - circle.cy, x3 - circle.cx);

        // Angle to midpoint (for sweep direction detection)
        const midAngleRad = Math.atan2(midY - circle.cy, midX - circle.cx);

        // Normalize angles to [0, 2π)
        const normalize = (angle) => {
            let a = angle;
            while (a < 0) a += 2 * Math.PI;
            while (a >= 2 * Math.PI) a -= 2 * Math.PI;
            return a;
        };

        const startNorm = normalize(startAngleRad);
        const midNorm = normalize(midAngleRad);
        const endNorm = normalize(endAngleRad);

        // Determine sweep direction: check if midpoint is between start and end
        let isCCW = false;
        if (startNorm < endNorm) {
            isCCW = midNorm > startNorm && midNorm < endNorm;
        } else {
            isCCW = midNorm > startNorm || midNorm < endNorm;
        }

        // Convert to degrees for DXF
        const startAngle = startAngleRad * (180 / Math.PI);
        const endAngle = endAngleRad * (180 / Math.PI);

        // Verify endpoints match (they should be exact now)
        const startDist = Math.sqrt(
            (x0 - circle.cx) ** 2 + (y0 - circle.cy) ** 2
        );
        const endDist = Math.sqrt(
            (x3 - circle.cx) ** 2 + (y3 - circle.cy) ** 2
        );
        const radiusError = Math.max(
            Math.abs(startDist - circle.radius),
            Math.abs(endDist - circle.radius)
        );

        this.log.debug(
            `  ✓ Bezier→Arc: center=(${circle.cx.toFixed(
                1
            )}, ${circle.cy.toFixed(1)}) r=${circle.radius.toFixed(
                1
            )} start=${startAngle.toFixed(1)}° end=${endAngle.toFixed(1)}° ${isCCW ? "CCW" : "CW"
            } fitError=${maxError.toFixed(
                3
            )}mm endpointError=${radiusError.toFixed(4)}mm`
        );

        return {
            cx: circle.cx,
            cy: circle.cy,
            radius: circle.radius,
            startAngle: startAngle,
            endAngle: endAngle,
            sweepFlag: isCCW ? 0 : 1,
            isCCW: isCCW,
        };
    }

    /**
     * Convert group of consecutive Bezier segments to single arc
     * Ensures consistent radius across all segments in the group
     * Guarantees start and end points are preserved exactly
     * Uses adaptive tolerance for better success rate
     * @param {Array} bezierSegments - Array of consecutive bezier segments
     * @param {number} tolerance - Initial maximum RMS error for arc fitting
     * @returns {Object|null} Arc parameters or null if fit fails
     */
    bezierGroupToArc(bezierSegments, tolerance = 0.5) {
        if (!bezierSegments || bezierSegments.length === 0) return null;

        // Adaptive tolerance levels: try from strictest to most lenient
        const toleranceLevels = [
            tolerance,
            tolerance * 1.5,
            tolerance * 2.5,
            tolerance * 4,
        ];

        for (let level = 0; level < toleranceLevels.length; level++) {
            const currentTolerance = toleranceLevels[level];
            const result = this.tryBezierGroupToArc(
                bezierSegments,
                currentTolerance
            );

            if (result) {
                // Success - log the result
                const levelText =
                    level > 0
                        ? ` (tolerance level ${level + 1
                        }: ${currentTolerance.toFixed(2)}mm)`
                        : "";
                this.log.debug(
                    `  ✓ Bezier→Arc GROUP: ${result.segmentCount
                    } segments → center=(${result.cx.toFixed(
                        1
                    )}, ${result.cy.toFixed(1)}) r=${result.radius.toFixed(
                        1
                    )} rmsError=${result.rmsError.toFixed(3)}mm${levelText}`
                );
                return result;
            }
        }

        // All tolerance levels failed
        this.log.debug(
            `  Bezier→Arc GROUP FAILED: all tolerance levels exhausted (tried up to ${toleranceLevels[
                toleranceLevels.length - 1
            ].toFixed(2)}mm)`
        );
        return null;
    }

    /**
     * Internal function to try arc fitting with specific tolerance
     * @param {Array} bezierSegments - Array of consecutive bezier segments
     * @param {number} tolerance - Maximum RMS error for arc fitting
     * @returns {Object|null} Arc parameters or null if fit fails
     */
    tryBezierGroupToArc(bezierSegments, tolerance) {
        if (!bezierSegments || bezierSegments.length === 0) return null;

        // Get start and end points from the group (FIXED - must be preserved)
        const firstSegment = bezierSegments[0];
        const lastSegment = bezierSegments[bezierSegments.length - 1];

        const startPoint = firstSegment.start;
        const endPoint = lastSegment.end;

        // Collect all sampled points for validation
        const allPoints = [];

        for (const segment of bezierSegments) {
            const samples = this.sampleBezierCurve(
                segment.start.x,
                segment.start.y,
                segment.cp1.x,
                segment.cp1.y,
                segment.cp2.x,
                segment.cp2.y,
                segment.end.x,
                segment.end.y,
                256 // Ultra-high density sampling for precision
            );

            // Add all samples except the last point (which is the start of next segment)
            if (allPoints.length === 0) {
                allPoints.push(...samples);
            } else {
                allPoints.push(...samples.slice(1)); // Skip first point (duplicate)
            }
        }

        // Find middle point of the group for sweep direction detection
        const middleIdx = Math.floor(allPoints.length / 2);
        const midPoint = allPoints[middleIdx];

        // Fit circle through 3 key points: start, middle, end
        // This ensures the arc will pass through start and end points EXACTLY
        const circle = this.fitCircleToPoints([startPoint, midPoint, endPoint]);
        if (!circle) {
            return null;
        }

        // Validate circle fit against all sampled points
        let sumSquaredError = 0;
        for (const point of allPoints) {
            const dist = Math.sqrt(
                (point.x - circle.cx) ** 2 + (point.y - circle.cy) ** 2
            );
            const error = dist - circle.radius;
            sumSquaredError += error * error;
        }
        const rmsError = Math.sqrt(sumSquaredError / allPoints.length);

        if (rmsError > tolerance) {
            // Failed at this tolerance level - return null to try next level
            return null;
        }

        // Verify endpoints are on the circle (they should be exact now)
        const startDist = Math.sqrt(
            (startPoint.x - circle.cx) ** 2 + (startPoint.y - circle.cy) ** 2
        );
        const endDist = Math.sqrt(
            (endPoint.x - circle.cx) ** 2 + (endPoint.y - circle.cy) ** 2
        );
        const endpointError = Math.max(
            Math.abs(startDist - circle.radius),
            Math.abs(endDist - circle.radius)
        );

        if (endpointError > 0.0001) {
            this.log.debug(
                `  Bezier→Arc GROUP WARNING: endpoint error ${endpointError.toFixed(
                    4
                )}mm (should be nearly 0)`
            );
        }

        // Calculate angles to start and end points
        const startAngleRad = Math.atan2(
            startPoint.y - circle.cy,
            startPoint.x - circle.cx
        );
        const endAngleRad = Math.atan2(
            endPoint.y - circle.cy,
            endPoint.x - circle.cx
        );

        // Get midpoint of first segment for sweep direction detection
        const midSeg = bezierSegments[Math.floor(bezierSegments.length / 2)];
        const midT = 0.5;
        const midX = this.evalBezier(
            midT,
            midSeg.start.x,
            midSeg.cp1.x,
            midSeg.cp2.x,
            midSeg.end.x
        );
        const midY = this.evalBezier(
            midT,
            midSeg.start.y,
            midSeg.cp1.y,
            midSeg.cp2.y,
            midSeg.end.y
        );
        const midAngleRad = Math.atan2(midY - circle.cy, midX - circle.cx);

        // Normalize angles
        const normalize = (angle) => {
            let a = angle;
            while (a < 0) a += 2 * Math.PI;
            while (a >= 2 * Math.PI) a -= 2 * Math.PI;
            return a;
        };

        const startNorm = normalize(startAngleRad);
        const midNorm = normalize(midAngleRad);
        const endNorm = normalize(endAngleRad);

        // Determine sweep direction
        let isCCW = false;
        if (startNorm < endNorm) {
            isCCW = midNorm > startNorm && midNorm < endNorm;
        } else {
            isCCW = midNorm > startNorm || midNorm < endNorm;
        }

        const startAngle = startAngleRad * (180 / Math.PI);
        const endAngle = endAngleRad * (180 / Math.PI);

        // Return arc parameters (logging is done in parent function)
        return {
            cx: circle.cx,
            cy: circle.cy,
            radius: circle.radius,
            startAngle: startAngle,
            endAngle: endAngle,
            sweepFlag: isCCW ? 0 : 1,
            isCCW: isCCW,
            rmsError: rmsError, // Include for logging
            segmentCount: bezierSegments.length,
        };
    }

    /**
     * Evaluate cubic Bezier at parameter t
     */
    evalBezier(t, p0, p1, p2, p3) {
        const t1 = 1 - t;
        return (
            t1 * t1 * t1 * p0 +
            3 * t1 * t1 * t * p1 +
            3 * t1 * t * t * p2 +
            t * t * t * p3
        );
    }

    /**
     * Sample points along a Bezier curve
     */
    sampleBezierCurve(x0, y0, x1, y1, x2, y2, x3, y3, numSamples = 16) {
        const points = [];
        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            points.push({
                x: this.evalBezier(t, x0, x1, x2, x3),
                y: this.evalBezier(t, y0, y1, y2, y3),
            });
        }
        return points;
    }

    /**
     * Fit a circle to a set of points using least-squares method
     * Improved algorithm with better center estimation
     * @param {Array} points - Array of {x, y} points
     * @returns {Object|null} Circle parameters {cx, cy, radius} or null on failure
     */
    fitCircleToPoints(points) {
        if (points.length < 3) return null;

        // Use algebraic circle fitting (Pratt method)
        // More accurate than simple centroid+average
        const n = points.length;

        // Calculate means
        let meanX = 0,
            meanY = 0;
        for (const p of points) {
            meanX += p.x;
            meanY += p.y;
        }
        meanX /= n;
        meanY /= n;

        // Center coordinates relative to mean
        const u = points.map((p) => p.x - meanX);
        const v = points.map((p) => p.y - meanY);

        // Calculate sums for linear system
        let Suu = 0,
            Suv = 0,
            Svv = 0;
        let Suuu = 0,
            Suvv = 0,
            Svvv = 0,
            Svuu = 0;

        for (let i = 0; i < n; i++) {
            const ui = u[i];
            const vi = v[i];
            const ui2 = ui * ui;
            const vi2 = vi * vi;

            Suu += ui2;
            Suv += ui * vi;
            Svv += vi2;
            Suuu += ui2 * ui;
            Suvv += ui * vi2;
            Svvv += vi2 * vi;
            Svuu += vi * ui2;
        }

        // Solve 2x2 linear system for center offset
        const A = [
            [Suu, Suv],
            [Suv, Svv],
        ];
        const B = [0.5 * (Suuu + Suvv), 0.5 * (Svvv + Svuu)];

        // Determinant
        const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        if (Math.abs(det) < 1e-10) {
            // Fallback to centroid method
            return this.fitCircleToPointsSimple(points);
        }

        // Solve for center offset
        const uc = (B[0] * A[1][1] - B[1] * A[0][1]) / det;
        const vc = (A[0][0] * B[1] - A[1][0] * B[0]) / det;

        // Absolute center
        let cx = uc + meanX;
        let cy = vc + meanY;

        // Calculate radius as average distance
        let sumR = 0;
        for (const p of points) {
            sumR += Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        }
        let radius = sumR / n;

        // Iterative refinement: adjust center using weighted least squares
        // Points are weighted by their distance error to stabilize convergence
        for (let iteration = 0; iteration < 2; iteration++) {
            // Compute gradients to minimize total squared error
            let dcx = 0,
                dcy = 0;
            let errorSum = 0;

            for (const p of points) {
                const dx = p.x - cx;
                const dy = p.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const error = dist - radius;
                errorSum += error * error;

                if (dist > 1e-6) {
                    // Gradient direction (Newton method)
                    dcx += error * (dx / dist);
                    dcy += error * (dy / dist);
                }
            }

            // Small adaptive step (decrease with each iteration)
            const stepSize = 0.05 / (iteration + 1);
            const newCx = cx - (dcx * stepSize) / n;
            const newCy = cy - (dcy * stepSize) / n;

            // Recalculate radius with adjusted center
            let newSumR = 0;
            for (const p of points) {
                newSumR += Math.sqrt((p.x - newCx) ** 2 + (p.y - newCy) ** 2);
            }
            const newRadius = newSumR / n;

            // Update if improvement is significant
            const oldError = errorSum / n;
            let newErrorSum = 0;
            for (const p of points) {
                const dist = Math.sqrt((p.x - newCx) ** 2 + (p.y - newCy) ** 2);
                const error = dist - newRadius;
                newErrorSum += error * error;
            }
            const newError = newErrorSum / n;

            if (newError < oldError) {
                // Accept refinement
                cx = newCx;
                cy = newCy;
                radius = newRadius;
            } else {
                // Stop if error increased
                break;
            }
        }

        return { cx, cy, radius };
    }

    /**
     * Simple fallback circle fitting using centroid and average radius
     */
    fitCircleToPointsSimple(points) {
        if (points.length < 3) return null;

        // Calculate centroid
        let sumX = 0,
            sumY = 0;
        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
        }
        const cx = sumX / points.length;
        const cy = sumY / points.length;

        // Calculate average radius
        let sumR = 0;
        for (const p of points) {
            sumR += Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        }
        const radius = sumR / points.length;

        return { cx, cy, radius };
    }

    /**
     * Check if angle is between start and end angles
     */
    angleIsBetween(angle, start, end) {
        // Normalize angles to [0, 2π)
        const normalize = (a) => {
            while (a < 0) a += 2 * Math.PI;
            while (a >= 2 * Math.PI) a -= 2 * Math.PI;
            return a;
        };

        angle = normalize(angle);
        start = normalize(start);
        end = normalize(end);

        if (start <= end) {
            return angle >= start && angle <= end;
        } else {
            return angle >= start || angle <= end;
        }
    }

    /**
     * Optimize segments by converting Bezier curves to arcs where possible
     * Groups consecutive Bezier segments to ensure consistent arc radius
     * @param {Array} segments - Array of segments (lines, arcs, bezier)
     * @param {number} tolerance - Maximum RMS error for arc fitting (default: 0.5)
     * @returns {Array} Optimized segments with some beziers converted to arcs
     */
    optimizeSegmentsToArcs(segments, tolerance = 0.5) {
        // Step 1: Group consecutive Bezier segments
        const groups = [];
        let i = 0;
        while (i < segments.length) {
            const segment = segments[i];
            if (segment.type === "bezier") {
                // Start a bezier group
                const group = [segment];
                i++;
                // Add consecutive beziers to the group
                while (i < segments.length && segments[i].type === "bezier") {
                    group.push(segments[i]);
                    i++;
                }
                groups.push({ type: "bezier-group", segments: group });
            } else {
                // Keep non-bezier segments individually
                groups.push({ type: segment.type, segment: segment });
                i++;
            }
        }

        // Step 2: Process groups
        const optimized = [];
        let convertedCount = 0;
        let failedCount = 0;

        for (const group of groups) {
            if (group.type === "bezier-group") {
                // Try to fit ONE arc through all beziers in this group
                const arc = this.bezierGroupToArc(group.segments, tolerance);

                if (arc) {
                    // Successfully converted group to single arc
                    convertedCount += group.segments.length;
                    const normalizedArc = {
                        centerX: arc.cx,
                        centerY: arc.cy,
                        radius: arc.radius,
                        startAngle: arc.startAngle,
                        endAngle: arc.endAngle,
                        sweepFlag: arc.sweepFlag,
                    };
                    // Add single arc segment covering the entire group
                    optimized.push({
                        type: "arc",
                        start: group.segments[0].start,
                        end: group.segments[group.segments.length - 1].end,
                        arc: normalizedArc,
                    });
                } else {
                    // Keep all beziers from this group as-is
                    failedCount += group.segments.length;
                    for (const seg of group.segments) {
                        optimized.push(seg);
                    }
                }
            } else {
                // Keep non-bezier segments
                optimized.push(group.segment);
            }
        }

        if (convertedCount > 0) {
            this.log.debug(
                `  ✓ Bezier→Arc: converted ${convertedCount} bezier segments in ${groups.filter((g) => g.type === "bezier-group").length
                } group(s)`
            );
        }
        if (failedCount > 0 && failedCount <= 5) {
            this.log.debug(
                `  Note: ${failedCount} beziers could not be converted (RMS error > ${tolerance}mm tolerance)`
            );
        }

        return optimized;
    }

    /**
     * Approximate cubic Bezier curve with line segments
     * @param {number} x0 - Start X
     * @param {number} y0 - Start Y
     * @param {number} x1 - Control point 1 X
     * @param {number} y1 - Control point 1 Y
     * @param {number} x2 - Control point 2 X
     * @param {number} y2 - Control point 2 Y
     * @param {number} x3 - End X
     * @param {number} y3 - End Y
     * @param {number} segments - Number of line segments
     * @returns {Array} Array of line segments
     */
    approximateCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, segments = 10) {
        const result = [];
        let prevX = x0;
        let prevY = y0;

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const t1 = 1 - t;

            // Cubic Bezier formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
            const x =
                t1 * t1 * t1 * x0 +
                3 * t1 * t1 * t * x1 +
                3 * t1 * t * t * x2 +
                t * t * t * x3;

            const y =
                t1 * t1 * t1 * y0 +
                3 * t1 * t1 * t * y1 +
                3 * t1 * t * t * y2 +
                t * t * t * y3;

            result.push({
                type: "line",
                start: { x: prevX, y: prevY },
                end: { x: x, y: y },
            });

            prevX = x;
            prevY = y;
        }

        return result;
    }

    /**
     * Approximate quadratic Bezier curve with line segments
     * @param {number} x0 - Start X
     * @param {number} y0 - Start Y
     * @param {number} x1 - Control point X
     * @param {number} y1 - Control point Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} segments - Number of line segments
     * @returns {Array} Array of line segments
     */
    approximateQuadraticBezier(x0, y0, x1, y1, x2, y2, segments = 10) {
        const result = [];
        let prevX = x0;
        let prevY = y0;

        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const t1 = 1 - t;

            // Quadratic Bezier formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
            const x = t1 * t1 * x0 + 2 * t1 * t * x1 + t * t * x2;
            const y = t1 * t1 * y0 + 2 * t1 * t * y1 + t * t * y2;

            result.push({
                type: "line",
                start: { x: prevX, y: prevY },
                end: { x: x, y: y },
            });

            prevX = x;
            prevY = y;
        }

        return result;
    }

    /**
     * Write path segments as DXF entities
     * Strategy: lines+arcs only → LWPOLYLINE with bulge
     * If has Bezier → separate LINE/ARC/SPLINE entities (preserve curves exactly)
     * @param {Array} segments - Array of path segments
     * @param {string} layerName - Layer name
     */
    writePathAsPolyline(segments, layerName) {
        if (segments.length === 0) return;

        this.log.debug("Exporting", segments.length, "segments to", layerName);

        // Детальное логирование сегментов
        this.log.debug("Segments details:");
        segments.forEach((seg, idx) => {
            if (seg.type === "bezier") {
                this.log.debug(
                    `  ${idx}: BEZIER start:(${seg.start.x.toFixed(
                        2
                    )}, ${seg.start.y.toFixed(2)}) end:(${seg.end.x.toFixed(
                        2
                    )}, ${seg.end.y.toFixed(2)})`
                );
            } else if (seg.type === "line") {
                this.log.debug(
                    `  ${idx}: LINE start:(${seg.start.x.toFixed(
                        2
                    )}, ${seg.start.y.toFixed(2)}) end:(${seg.end.x.toFixed(
                        2
                    )}, ${seg.end.y.toFixed(2)})`
                );
            } else if (seg.type === "arc") {
                this.log.debug(
                    `  ${idx}: ARC start:(${seg.start.x.toFixed(
                        2
                    )}, ${seg.start.y.toFixed(2)}) end:(${seg.end.x.toFixed(
                        2
                    )}, ${seg.end.y.toFixed(2)})`
                );
            }
        });

        // Check if path has Bezier curves
        const hasBezier = segments.some((s) => s.type === "bezier");

        if (!hasBezier) {
            // Only lines and arcs - use LWPOLYLINE with bulge (closed contour)
            this.log.debug(
                "Path has no bezier curves - using LWPOLYLINE with bulge"
            );
            this.writePolylineWithBulge(segments, layerName);
        } else {
            // Has Bezier - group consecutive beziers and export
            this.log.debug(
                "Path has bezier curves - grouping consecutive beziers"
            );
            this.writeGroupedBeziers(segments, layerName);
        }
    }

    /**
     * Export path with grouped consecutive Bezier segments
     */
    writeGroupedBeziers(segments, layerName) {
        let i = 0;
        while (i < segments.length) {
            const segment = segments[i];

            if (segment.type === "bezier") {
                // Collect consecutive Bezier segments
                const bezierGroup = [segment];
                let j = i + 1;

                while (j < segments.length && segments[j].type === "bezier") {
                    bezierGroup.push(segments[j]);
                    j++;
                }

                // Export as multi-segment SPLINE
                this.writeMultiSegmentSpline(bezierGroup, layerName);
                i = j;
            } else if (segment.type === "line") {
                this.writeLine(segment.start, segment.end, layerName);
                i++;
            } else if (segment.type === "arc") {
                this.writeArc(segment.arc, layerName);
                i++;
            } else {
                i++;
            }
        }
    }

    /**
     * Write multiple consecutive Bezier segments as single SPLINE
     */
    writeMultiSegmentSpline(bezierSegments, layerName) {
        if (bezierSegments.length === 0) return;

        // Build control points array
        // First segment: all 4 control points [P0, P1, P2, P3]
        // Each next segment: add 3 control points [P1, P2, P3]
        const controlPoints = [];

        // First segment
        const first = bezierSegments[0];
        controlPoints.push(
            { x: first.start.x, y: first.start.y },
            { x: first.cp1.x, y: first.cp1.y },
            { x: first.cp2.x, y: first.cp2.y },
            { x: first.end.x, y: first.end.y }
        );

        // Subsequent segments
        for (let i = 1; i < bezierSegments.length; i++) {
            const seg = bezierSegments[i];
            controlPoints.push(
                { x: seg.cp1.x, y: seg.cp1.y },
                { x: seg.cp2.x, y: seg.cp2.y },
                { x: seg.end.x, y: seg.end.y }
            );
        }

        // Build knot vector
        // For n segments: knots = [0,0,0,0, 1,1,1, 2,2,2, ..., n,n,n,n]
        const n = bezierSegments.length;
        const knots = [0, 0, 0, 0];
        for (let i = 1; i < n; i++) {
            knots.push(i, i, i);
        }
        knots.push(n, n, n, n);

        this.log.debug(
            `Writing multi-segment SPLINE with ${bezierSegments.length} beziers, ${controlPoints.length} control points, ${knots.length} knots`
        );

        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("SPLINE");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("370"); // Lineweight
        this.dxfContent.push("-1"); // BYLAYER
        this.dxfContent.push("6"); // Linetype name
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSpline");
        this.dxfContent.push("70"); // Flags (not closed, not periodic)
        this.dxfContent.push("0");
        this.dxfContent.push("71"); // Degree
        this.dxfContent.push("3");
        this.dxfContent.push("72"); // Number of knots
        this.dxfContent.push(knots.length.toString());
        this.dxfContent.push("73"); // Number of control points
        this.dxfContent.push(controlPoints.length.toString());
        this.dxfContent.push("42"); // Knot tolerance
        this.dxfContent.push("1E-7");
        this.dxfContent.push("43"); // Control point tolerance
        this.dxfContent.push("1E-7");
        this.dxfContent.push("44"); // Fit tolerance
        this.dxfContent.push("1E-10");

        // Knot values
        for (const knot of knots) {
            this.dxfContent.push("40");
            this.dxfContent.push(knot.toString());
        }

        // Control points
        for (const point of controlPoints) {
            this.dxfContent.push("10"); // X
            this.dxfContent.push(point.x.toString());
            this.dxfContent.push("20"); // Y
            this.dxfContent.push(point.y.toString());
            this.dxfContent.push("30"); // Z
            this.dxfContent.push("0.0");
        }
    }

    /**
     * Write path with only lines and arcs as LWPOLYLINE with bulge values
     */
    writePolylineWithBulge(segments, layerName) {
        if (segments.length === 0) return;

        this.log.debug(
            `[Polyline] Writing LWPOLYLINE with ${segments.length} segments to layer ${layerName}`
        );

        // Filter out degenerate segments (zero-length lines)
        const tolerance = 0.001;
        const validSegments = segments.filter((seg, idx) => {
            if (seg.type === "line") {
                const dx = seg.end.x - seg.start.x;
                const dy = seg.end.y - seg.start.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                if (length < tolerance) {
                    this.log.warn(
                        `[Polyline] Skipping degenerate line segment ${idx}: length=${length.toFixed(
                            4
                        )} < ${tolerance}`
                    );
                    return false;
                }
            }
            return true;
        });

        if (validSegments.length !== segments.length) {
            this.log.debug(
                `[Polyline] Filtered ${segments.length - validSegments.length
                } degenerate segments, now ${validSegments.length} segments`
            );
        }

        const vertices = [];
        const bulges = [];

        // Начинаем с первой точки
        let firstPoint = validSegments[0].start;
        this.log.debug(
            `[Polyline] First vertex: (${firstPoint.x.toFixed(
                2
            )}, ${firstPoint.y.toFixed(2)})`
        );
        vertices.push(firstPoint);
        bulges.push(0);

        for (let i = 0; i < validSegments.length; i++) {
            const segment = validSegments[i];
            this.log.debug(
                `[Polyline] Processing segment ${i}: ${segment.type}`
            );

            if (segment.type === "line") {
                this.log.debug(
                    `  LINE end: (${segment.end.x.toFixed(
                        2
                    )}, ${segment.end.y.toFixed(2)})`
                );
                vertices.push(segment.end);
                bulges.push(0);
            } else if (segment.type === "arc") {
                // Вычисляем bulge для дуги
                const arc = segment.arc;
                const bulge = this.calculateBulge(arc);
                bulges[bulges.length - 1] = bulge;

                this.log.debug(`  ARC bulge: ${bulge.toFixed(4)}`);
                this.log.debug(
                    `  ARC center: (${arc.centerX.toFixed(
                        2
                    )}, ${arc.centerY.toFixed(2)}) radius: ${arc.radius.toFixed(
                        2
                    )}`
                );
                this.log.debug(
                    `  ARC angles: ${arc.startAngle.toFixed(
                        2
                    )}° → ${arc.endAngle.toFixed(2)}°`
                );

                // Добавляем конечную точку дуги
                const endPoint = {
                    x:
                        arc.centerX +
                        arc.radius * Math.cos((arc.endAngle * Math.PI) / 180),
                    y:
                        arc.centerY +
                        arc.radius * Math.sin((arc.endAngle * Math.PI) / 180),
                };
                this.log.debug(
                    `  ARC calculated end: (${endPoint.x.toFixed(
                        2
                    )}, ${endPoint.y.toFixed(2)})`
                );
                this.log.debug(
                    `  ARC segment end:    (${segment.end.x.toFixed(
                        2
                    )}, ${segment.end.y.toFixed(2)})`
                );

                vertices.push(endPoint);
                bulges.push(0);
            }
        }

        // Проверяем замкнутость
        const closeTolerance = ARC_RADIUS_TOLERANCE;
        const isClosed =
            vertices.length > 2 &&
            Math.abs(vertices[vertices.length - 1].x - vertices[0].x) <
            closeTolerance &&
            Math.abs(vertices[vertices.length - 1].y - vertices[0].y) <
            closeTolerance;

        this.log.debug(
            `[Polyline] Closed: ${isClosed} (${vertices.length} vertices before cleanup)`
        );
        this.log.debug(
            `[Polyline] First: (${vertices[0].x.toFixed(
                2
            )}, ${vertices[0].y.toFixed(2)})`
        );
        this.log.debug(
            `[Polyline] Last:  (${vertices[vertices.length - 1].x.toFixed(
                2
            )}, ${vertices[vertices.length - 1].y.toFixed(2)})`
        );

        if (isClosed && vertices.length > 1) {
            vertices.pop();
            bulges.pop();
            this.log.debug(
                `[Polyline] Removed closing vertex, now ${vertices.length} vertices`
            );
        }

        // Экспортируем LWPOLYLINE
        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("LWPOLYLINE");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("370"); // Lineweight
        this.dxfContent.push("-1"); // BYLAYER
        this.dxfContent.push("6"); // Linetype name
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbPolyline");
        this.dxfContent.push("38"); // Elevation
        this.dxfContent.push("0");
        this.dxfContent.push("90");
        this.dxfContent.push(vertices.length.toString());
        this.dxfContent.push("70");
        this.dxfContent.push(isClosed ? "1" : "0");

        for (let i = 0; i < vertices.length; i++) {
            this.dxfContent.push("10");
            this.dxfContent.push(vertices[i].x.toString());
            this.dxfContent.push("20");
            this.dxfContent.push(vertices[i].y.toString());
            if (bulges[i] !== 0) {
                this.dxfContent.push("42");
                this.dxfContent.push(bulges[i].toString());
                this.log.debug(
                    `[Polyline] Vertex ${i}: (${vertices[i].x.toFixed(
                        2
                    )}, ${vertices[i].y.toFixed(2)}) bulge=${bulges[i].toFixed(
                        4
                    )}`
                );
            } else {
                this.log.debug(
                    `[Polyline] Vertex ${i}: (${vertices[i].x.toFixed(
                        2
                    )}, ${vertices[i].y.toFixed(2)})`
                );
            }
        }

        this.log.debug(`[Polyline] ✓ LWPOLYLINE written`);
    }

    /**
     * Write single line as DXF LINE entity
     */
    writeLine(start, end, layerName) {
        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("LINE");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("370"); // Lineweight
        this.dxfContent.push("-1"); // BYLAYER
        this.dxfContent.push("6"); // Linetype name
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbLine");
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
     * Write arc as DXF ARC entity
     */
    writeArc(arc, layerName) {
        const handle = this.getNextHandle();

        this.dxfContent.push("0");
        this.dxfContent.push("ARC");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("370"); // Lineweight
        this.dxfContent.push("-1"); // BYLAYER
        this.dxfContent.push("6"); // Linetype name
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbCircle");
        this.dxfContent.push("10"); // Center X
        this.dxfContent.push(arc.centerX.toString());
        this.dxfContent.push("20"); // Center Y
        this.dxfContent.push(arc.centerY.toString());
        this.dxfContent.push("30"); // Center Z
        this.dxfContent.push("0.0");
        this.dxfContent.push("40"); // Radius
        this.dxfContent.push(arc.radius.toString());
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbArc");
        this.dxfContent.push("50"); // Start angle
        this.dxfContent.push(arc.startAngle.toString());
        this.dxfContent.push("51"); // End angle
        this.dxfContent.push(arc.endAngle.toString());
    }

    /**
     * Write group of line/arc segments as LWPOLYLINE with bulge
     */
    writePolylineGroup(segments, layerName) {
        if (segments.length === 0) return;

        this.log.debug("writePolylineGroup: segments:", segments.length);

        // Collect all vertices and calculate bulge values
        const vertices = [];
        const bulges = [];

        // Начинаем с первой точки первого сегмента
        let firstPoint = segments[0].start || segments[0].end;
        vertices.push(firstPoint);
        bulges.push(0);

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];

            if (segment.type === "line") {
                // Добавляем конечную точку линии
                vertices.push(segment.end);
                bulges.push(0); // Прямая линия, bulge = 0
            } else if (segment.type === "arc") {
                // Calculate bulge for the arc
                const arc = segment.arc;
                const bulge = this.calculateBulge(arc);
                bulges[bulges.length - 1] = bulge; // Устанавливаем bulge для предыдущей вершины

                // Добавляем конечную точку арки
                const endPoint = {
                    x:
                        arc.centerX +
                        arc.radius * Math.cos((arc.endAngle * Math.PI) / 180),
                    y:
                        arc.centerY +
                        arc.radius * Math.sin((arc.endAngle * Math.PI) / 180),
                };
                vertices.push(endPoint);
                bulges.push(0); // Следующий bulge установит следующий сегмент
            }
        }

        this.log.debug("writePolylineGroup: vertices:", vertices.length);

        // Проверяем замкнутость пути
        const tolerance = ARC_RADIUS_TOLERANCE;
        const isClosed =
            vertices.length > 2 &&
            Math.abs(vertices[vertices.length - 1].x - vertices[0].x) <
            tolerance &&
            Math.abs(vertices[vertices.length - 1].y - vertices[0].y) <
            tolerance;

        this.log.debug("writePolylineGroup: isClosed:", isClosed);

        // Для замкнутых путей удаляем дубликат последней вершины
        if (isClosed && vertices.length > 1) {
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
        this.dxfContent.push("370"); // Lineweight
        this.dxfContent.push("-1"); // BYLAYER
        this.dxfContent.push("6"); // Linetype name
        this.dxfContent.push("BYLAYER");
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbPolyline");
        this.dxfContent.push("38"); // Elevation
        this.dxfContent.push("0");
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
     * Write cubic Bezier curve as DXF SPLINE
     * @param {Object} bezierSegment - Bezier segment with start, cp1, cp2, end
     * @param {string} layerName - Layer name
     */
    writeSplineSegment(bezierSegment, layerName) {
        const handle = this.getNextHandle();

        // Cubic Bezier = degree 3, 4 control points
        const controlPoints = [
            bezierSegment.start,
            bezierSegment.cp1,
            bezierSegment.cp2,
            bezierSegment.end,
        ];

        // Knot vector for cubic Bezier: [0,0,0,0,1,1,1,1]
        const knots = [0, 0, 0, 0, 1, 1, 1, 1];

        this.dxfContent.push("0");
        this.dxfContent.push("SPLINE");
        this.dxfContent.push("5");
        this.dxfContent.push(handle);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbEntity");
        this.dxfContent.push("8");
        this.dxfContent.push(layerName);
        this.dxfContent.push("100");
        this.dxfContent.push("AcDbSpline");
        this.dxfContent.push("70"); // Flags (not closed, not periodic)
        this.dxfContent.push("0");
        this.dxfContent.push("71"); // Degree
        this.dxfContent.push("3");
        this.dxfContent.push("72"); // Number of knots
        this.dxfContent.push(knots.length.toString());
        this.dxfContent.push("73"); // Number of control points
        this.dxfContent.push(controlPoints.length.toString());
        this.dxfContent.push("42"); // Knot tolerance
        this.dxfContent.push("1E-7");
        this.dxfContent.push("43"); // Control point tolerance
        this.dxfContent.push("1E-7");
        this.dxfContent.push("44"); // Fit tolerance
        this.dxfContent.push("1E-10");

        // Knot values
        for (const knot of knots) {
            this.dxfContent.push("40");
            this.dxfContent.push(knot.toString());
        }

        // Control points
        for (const point of controlPoints) {
            this.dxfContent.push("10"); // X
            this.dxfContent.push(point.x.toString());
            this.dxfContent.push("20"); // Y
            this.dxfContent.push(point.y.toString());
            this.dxfContent.push("30"); // Z
            this.dxfContent.push("0.0");
        }
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
    /**
     * Convert RGB color to AutoCAD Color Index (ACI)
     * Uses simple approximation to 256-color palette
     */
    rgbToACI(r, g, b) {
        // DXF colors 1-9 are standard colors
        const standardColors = [
            { r: 255, g: 0, b: 0 }, // 1 Red
            { r: 255, g: 255, b: 0 }, // 2 Yellow
            { r: 0, g: 255, b: 0 }, // 3 Green
            { r: 0, g: 255, b: 255 }, // 4 Cyan
            { r: 0, g: 0, b: 255 }, // 5 Blue
            { r: 255, g: 0, b: 255 }, // 6 Magenta
            { r: 255, g: 255, b: 255 }, // 7 White
            { r: 128, g: 128, b: 128 }, // 8 Gray
            { r: 192, g: 192, b: 192 }, // 9 Light gray
        ];

        // Find closest standard color
        let minDistance = Infinity;
        let closestIndex = 7; // Default to white

        for (let i = 0; i < standardColors.length; i++) {
            const color = standardColors[i];
            const distance = Math.sqrt(
                Math.pow(r - color.r, 2) +
                Math.pow(g - color.g, 2) +
                Math.pow(b - color.b, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i + 1;
            }
        }

        return closestIndex;
    }

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
