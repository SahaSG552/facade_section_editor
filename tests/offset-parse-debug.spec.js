import { describe, it, expect } from "vitest";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();

describe("Debug: parse line-arc-line path", () => {
    it("should parse arc correctly", () => {
        const pathData = "M 10 10 L 2 10 A 2 2 0 0 1 0 8 L 0 0";
        const parsed = exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (v) => v, false);

        console.log("=== PARSE DEBUG ===");
        console.log("Input:", pathData);
        console.log("Parsed segments:", JSON.stringify(parsed, null, 2));

        expect(parsed).toHaveLength(3);

        const arcSeg = parsed[1];
        expect(arcSeg.type).toBe("arc");
        console.log("Arc segment:");
        console.log("  start:", arcSeg.start);
        console.log("  end:", arcSeg.end);
        console.log("  arc:", arcSeg.arc);
        console.log("  arc.startAngle:", arcSeg.arc.startAngle, "=", arcSeg.arc.startAngle * 180 / Math.PI, "deg");
        console.log("  arc.endAngle:", arcSeg.arc.endAngle, "=", arcSeg.arc.endAngle * 180 / Math.PI, "deg");
        console.log("  arc.sweepFlag:", arcSeg.arc.sweepFlag);
        console.log("  arc.radius:", arcSeg.arc.radius);
    });
});
