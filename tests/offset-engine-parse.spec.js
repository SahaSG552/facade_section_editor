import { describe, it, expect } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";
import { vi } from "vitest";

vi.mock("../src/export/PaperBooleanProcessor.js", () => ({
    PaperBooleanProcessor: {
        resolveSelfIntersections: vi.fn((segments) => segments),
    },
}));

const exportModule = new ExportModule();

describe("Debug: OffsetEngine parse arc", () => {
    it("should parse arc with correct angles", async () => {
        const engine = new OffsetEngine({ exportModule });
        const pathData = "M 10 10 L 2 10 A 2 2 0 0 1 0 8 L 0 0";

        // Access private method to check parsing
        const segments = engine._parsePathData(pathData);

        console.log("=== ENGINE PARSE DEBUG ===");
        console.log("Input:", pathData);
        console.log("Parsed segments:", JSON.stringify(segments, null, 2));

        expect(segments).toHaveLength(3);
        const arcSeg = segments[1];
        expect(arcSeg.type).toBe("arc");

        console.log("Arc segment from engine:");
        console.log("  start:", arcSeg.start);
        console.log("  end:", arcSeg.end);
        console.log("  arc:", arcSeg.arc);
        console.log("  arc.startAngle:", arcSeg.arc.startAngle);
        console.log("  arc.endAngle:", arcSeg.arc.endAngle);
        console.log("  arc.sweepFlag:", arcSeg.arc.sweepFlag);
        console.log("  arc.radius:", arcSeg.arc.radius);
    });
});
