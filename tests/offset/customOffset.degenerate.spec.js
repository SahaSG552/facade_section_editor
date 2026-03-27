import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

describe("CustomOffsetProcessor degenerate arc handling", () => {
    it("collapses two touching arcs to bridge lines at degeneracy boundary", () => {
        const exportModule = new ExportModule();
        const input = "M 0 0 A 7.0711 7.0711 0 0 0 10 0 A 7.0711 7.0711 0 0 0 20 0";

        const out = calculateOffsetFromPathData(input, 8, {
            exportModule,
            forceReverseOutput: false,
        });

        expect(out).toBeTruthy();

        const segs = exportModule.dxfExporter.parseSVGPathSegments(
            out,
            0,
            0,
            (y) => y,
            false
        );

        const lineCount = segs.filter((s) => s.type === "line").length;
        const arcCount = segs.filter((s) => s.type === "arc").length;

        expect(lineCount).toBeGreaterThanOrEqual(2);
        expect(arcCount).toBe(0);
    });
});
