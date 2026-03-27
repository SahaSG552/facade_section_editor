import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

describe("CustomOffsetProcessor arc-arc tangential join", () => {
    it("joins arc/arc gap via tangent intersection without extra middle bridge", () => {
        const exportModule = new ExportModule();
        const input = "M 0 0 A 7 7 0 0 0 10 0 A 7 7 0 0 0 20 0";

        const out = calculateOffsetFromPathData(input, 5, {
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

        const arcCount = segs.filter((s) => s.type === "arc").length;
        const lineCount = segs.filter((s) => s.type === "line").length;

        // Two offset arcs + exactly two bridge lines to a single miter point.
        expect(arcCount).toBe(2);
        expect(lineCount).toBe(2);
    });
});
