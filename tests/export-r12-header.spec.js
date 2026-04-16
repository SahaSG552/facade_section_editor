import { describe, it, expect } from "vitest";
import ExportModule from "../src/export/ExportModule.js";

describe("R12 DXF Header Export", () => {
    let exportModule;

    beforeEach(() => {
        exportModule = new ExportModule();
    });

    it("should generate R12 header with AC1009 version", () => {
        const exporter = exportModule.dxfExporter;
        exporter.dxfContent = [];
        exporter.writer.dxfContent = exporter.dxfContent;
        
        exporter.writeHeader_R12();
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        // Verify AC1009 is present
        expect(dxfString).toContain("AC1009");
        
        // Verify it's in the HEADER section
        const headerStart = dxfString.indexOf("HEADER");
        const ac1009Pos = dxfString.indexOf("AC1009");
        expect(ac1009Pos).toBeGreaterThan(headerStart);
    });

    it("should have $HANDLING = 1 for handle support", () => {
        const exporter = exportModule.dxfExporter;
        exporter.dxfContent = [];
        exporter.writer.dxfContent = exporter.dxfContent;
        
        exporter.writeHeader_R12();
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        // Find $HANDLING and verify value is 1
        const handlingIndex = dxfString.indexOf("$HANDLING");
        expect(handlingIndex).toBeGreaterThan(-1);
        
        // Extract the value after $HANDLING
        const afterHandling = dxfString.substring(handlingIndex);
        expect(afterHandling).toContain("1");
    });

    it("should have $DWGCODEPAGE = ANSI_1252", () => {
        const exporter = exportModule.dxfExporter;
        exporter.dxfContent = [];
        exporter.writer.dxfContent = exporter.dxfContent;
        
        exporter.writeHeader_R12();
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        // Verify ANSI_1252 is present
        expect(dxfString).toContain("ANSI_1252");
        
        // Verify it's not ANSI_1251 (Cyrillic)
        expect(dxfString).not.toContain("ANSI_1251");
    });

    it("should NOT contain AC1015+ header variables", () => {
        const exporter = exportModule.dxfExporter;
        exporter.dxfContent = [];
        exporter.writer.dxfContent = exporter.dxfContent;
        
        exporter.writeHeader_R12();
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        // Forbidden AC1015+ variables
        const forbiddenVars = [
            "$CELWEIGHT",
            "$LWDISPLAY",
            "$DIMASSOC",
            "$XCLIPFRAME",
            "$FILLMODE",
            "$TILEMODE",
            "$ATTMODE",
            "$PDMODE",
            "$PDSIZE",
            "$UCSORG",
            "$UCSXDIR",
            "$UCSYDIR"
        ];
        
        forbiddenVars.forEach(varName => {
            expect(dxfString).not.toContain(varName);
        });
    });

    it("should have $INSUNITS = 4 (millimeters)", () => {
        const exporter = exportModule.dxfExporter;
        exporter.dxfContent = [];
        exporter.writer.dxfContent = exporter.dxfContent;
        
        exporter.writeHeader_R12();
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        // Find $INSUNITS and verify value is 4
        const insunitsIndex = dxfString.indexOf("$INSUNITS");
        expect(insunitsIndex).toBeGreaterThan(-1);
        
        const afterInsunits = dxfString.substring(insunitsIndex);
        expect(afterInsunits).toContain("4");
    });

    it("should have proper HEADER section structure", () => {
        const exporter = exportModule.dxfExporter;
        exporter.dxfContent = [];
        exporter.writer.dxfContent = exporter.dxfContent;
        
        exporter.writeHeader_R12();
        
        const dxfString = exporter.dxfContent.join("\r\n");
        
        // Verify SECTION/HEADER start
        expect(dxfString).toContain("SECTION");
        expect(dxfString).toContain("HEADER");
        
        // Verify ENDSEC end
        expect(dxfString).toContain("ENDSEC");
    });
});
