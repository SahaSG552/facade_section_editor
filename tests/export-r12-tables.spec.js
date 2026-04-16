import { describe, it, expect, beforeEach } from "vitest";
import ExportModule from "../src/export/ExportModule.js";

describe("R12 DXF TABLES Section Export", () => {
    let exportModule;
    let exporter;
    
    const mockBitsOnCanvas = [
        {
            name: "Bit1",
            y: 10,
            operation: "OU",
            color: "rgb(255, 0, 0)"
        },
        {
            name: "Bit2",
            y: 5.5,
            operation: "IN",
            color: "rgb(0, 255, 0)"
        }
    ];
    
    const mockOffsetContours = [
        {
            bitIndex: 0,
            depth: 10,
            operation: "OU"
        },
        {
            bitIndex: 1,
            depth: 5.5,
            operation: "IN"
        }
    ];
    
    const mockPartFront = { tagName: "rect" };
    const mockPanelThickness = 18;

    beforeEach(() => {
        exportModule = new ExportModule();
        exporter = exportModule.dxfExporter;
        exporter.dxfContent = [];
        exporter.writer.dxfContent = exporter.dxfContent;
        exporter.handleCounter = 0x10;
        exporter.writer.handleCounter = 0x10;
    });

    it("should generate TABLES section with proper structure", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        // Verify SECTION/TABLES start
        expect(dxfString).toContain("SECTION");
        expect(dxfString).toContain("TABLES");
        
        // Verify ENDSEC end
        expect(dxfString).toContain("ENDSEC");
    });

    it("should include mandatory Layer 0 with color 7", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        const lines = exporter.dxfContent;
        
        // Find Layer 0
        let foundLayer0 = false;
        let foundColor7 = false;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === "0" && lines[i + 1] === "LAYER" && i + 4 < lines.length) {
                // Look for layer name
                for (let j = i + 2; j < Math.min(i + 20, lines.length); j += 2) {
                    if (lines[j] === "2" && lines[j + 1] === "0") {
                        foundLayer0 = true;
                        // Check for color 7 in the same layer entry
                        for (let k = j; k < Math.min(j + 20, lines.length); k += 2) {
                            if (lines[k] === "62" && lines[k + 1] === "7") {
                                foundColor7 = true;
                                break;
                            }
                            // Stop if we hit another entry
                            if (lines[k] === "0" && k > j + 2) break;
                        }
                        break;
                    }
                }
            }
            if (foundLayer0) break;
        }
        
        expect(foundLayer0).toBe(true);
        expect(foundColor7).toBe(true);
    });

    it("should include Default layer", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        expect(dxfString).toContain("Default");
    });

    it("should include CUT layer with panel thickness", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        expect(dxfString).toContain("CUT_18MM_OU");
    });

    it("should include bit operation layers with correct naming", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        // Integer depth: Bit1_10MM_OU
        expect(dxfString).toContain("Bit1_10MM_OU");
        
        // Fractional depth: Bit2__5_5MM_IN (extra _ before value, . replaced with _)
        expect(dxfString).toContain("Bit2__5_5MM_IN");
    });

    it("should have LTYPE table with CONTINUOUS only", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        const lines = exporter.dxfContent;
        
        // Find LTYPE table
        let ltypeIndex = -1;
        for (let i = 0; i < lines.length - 2; i++) {
            if (lines[i] === "0" && lines[i + 1] === "TABLE" && lines[i + 2] === "2" && lines[i + 3] === "LTYPE") {
                ltypeIndex = i;
                break;
            }
        }
        
        expect(ltypeIndex).toBeGreaterThan(-1);
        expect(dxfString).toContain("CONTINUOUS");
        
        // Find the ENDTAB for the LTYPE table
        let endtabIndex = -1;
        for (let i = ltypeIndex; i < lines.length - 1; i++) {
            if (lines[i] === "0" && lines[i + 1] === "ENDTAB") {
                endtabIndex = i;
                break;
            }
        }
        
        // Count LTYPE entries between ltypeIndex and endtabIndex
        let ltypeEntries = 0;
        for (let i = ltypeIndex; i < endtabIndex - 1; i++) {
            if (lines[i] === "0" && lines[i + 1] === "LTYPE") {
                ltypeEntries++;
            }
        }
        expect(ltypeEntries).toBe(1);
    });

    it("should have STYLE table with Standard text style", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        expect(dxfString).toContain("STYLE");
        expect(dxfString).toContain("Standard");
    });

    it("should have APPID table with ACAD only", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        const lines = exporter.dxfContent;
        
        // Find APPID table
        let appidIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === "TABLE" && lines[i + 2] === "APPID") {
                appidIndex = i;
                break;
            }
        }
        
        expect(appidIndex).toBeGreaterThan(-1);
        expect(dxfString).toContain("ACAD");
        
        // Should NOT have Rhino, CSTINVENTORY, PE_URL, AcDbAttr
        const appidSection = dxfString.substring(
            appidIndex,
            dxfString.indexOf("ENDTAB", appidIndex)
        );
        
        expect(appidSection).not.toContain("Rhino");
        expect(appidSection).not.toContain("CSTINVENTORY");
        expect(appidSection).not.toContain("PE_URL");
        expect(appidSection).not.toContain("AcDbAttr");
    });

    it("should have VPORT table with *ACTIVE viewport", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        expect(dxfString).toContain("VPORT");
        expect(dxfString).toContain("*ACTIVE");
    });

    it("should have VIEW table (empty but present)", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        const lines = exporter.dxfContent;
        
        // Find VIEW table
        let viewIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === "TABLE" && lines[i + 2] === "VIEW") {
                viewIndex = i;
                break;
            }
        }
        
        expect(viewIndex).toBeGreaterThan(-1);
        
        // Should have 70/0 (no views)
        const viewSection = lines.slice(viewIndex, viewIndex + 10);
        const has70 = viewSection.includes("70");
        const has0 = viewSection.includes("0");
        expect(has70 && has0).toBe(true);
    });

    it("should have UCS table (empty but present)", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        const lines = exporter.dxfContent;
        
        // Find UCS table
        let ucsIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === "TABLE" && lines[i + 2] === "UCS") {
                ucsIndex = i;
                break;
            }
        }
        
        expect(ucsIndex).toBeGreaterThan(-1);
        
        // Should have 70/0 (no UCS definitions)
        const ucsSection = lines.slice(ucsIndex, ucsIndex + 10);
        const has70 = ucsSection.includes("70");
        const has0 = ucsSection.includes("0");
        expect(has70 && has0).toBe(true);
    });

    it("should NOT include BLOCK_RECORD table (R13+ only)", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        expect(dxfString).not.toContain("BLOCK_RECORD");
    });

    it("should NOT include DIMSTYLE table", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        expect(dxfString).not.toContain("DIMSTYLE");
    });

    it("should use getNextHandle() for all entries (no hardcoded handles)", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const lines = exporter.dxfContent;
        
        // Collect all handle values (group code 5)
        const handles = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === "5" && i + 1 < lines.length) {
                handles.push(lines[i + 1]);
            }
        }
        
        // Verify all handles are unique
        const uniqueHandles = new Set(handles);
        expect(uniqueHandles.size).toBe(handles.length);
        
        // Verify handles are sequential hex values starting from 0x10
        const handleNumbers = handles.map(h => parseInt(h, 16));
        for (let i = 1; i < handleNumbers.length; i++) {
            expect(handleNumbers[i]).toBeGreaterThan(handleNumbers[i - 1]);
        }
    });

    it("should NOT use 100 group codes (R13+ feature)", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const lines = exporter.dxfContent;
        
        // R12 should NOT have 100 group codes (AcDbSymbolTable, AcDbLayerTableRecord, etc.)
        // Check if any line is exactly "100" as a group code
        let has100GroupCode = false;
        for (let i = 0; i < lines.length - 1; i++) {
            if (lines[i] === "100") {
                // This is a group code 100, check next line isn't a number (should be AcDb class)
                if (lines[i + 1] && (lines[i + 1].startsWith("AcDb") || isNaN(Number(lines[i + 1])))) {
                    has100GroupCode = true;
                    break;
                }
            }
        }
        expect(has100GroupCode).toBe(false);
        
        const dxfString = lines.join("\r\n");
        expect(dxfString).not.toContain("AcDbSymbolTable");
        expect(dxfString).not.toContain("AcDbLayerTableRecord");
    });

    it("should have no duplicate layer names", () => {
        exporter.writeTables_R12(mockBitsOnCanvas, mockPartFront, mockOffsetContours, mockPanelThickness);
        
        const lines = exporter.dxfContent;
        
        // Collect all layer names
        const layerNames = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i] === "0" && lines[i + 1] === "LAYER" && i + 4 < lines.length) {
                // Find layer name (group code 2)
                for (let j = i + 2; j < Math.min(i + 20, lines.length); j += 2) {
                    if (lines[j] === "2") {
                        layerNames.push(lines[j + 1]);
                        break;
                    }
                }
            }
        }
        
        // Verify no duplicates
        const uniqueLayerNames = new Set(layerNames);
        expect(uniqueLayerNames.size).toBe(layerNames.length);
    });
});
