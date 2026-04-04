import { describe, it, expect } from "vitest";
import { calculateOffsetFromPathData } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();

describe("User example: line-arc-line offset", () => {
    it("M 10 10 L 2 10 A 2 2 0 0 1 0 8 L 0 0 offset 1 outward", async () => {
        const pathData = "M 10 10 L 2 10 A 2 2 0 0 1 0 8 L 0 0";
        const result = await new (await import("../src/operations/OffsetEngine.js")).OffsetEngine({ exportModule }).processPath(pathData, 1);

        console.log("=== USER EXAMPLE: line-arc-line ===");
        console.log("Input:", pathData);
        console.log("Output pathData:", result.pathData);
        console.log("Contours:", JSON.stringify(result.contours.map(c => ({
            segments: c.segments.map(s => ({
                type: s.type,
                start: s.start,
                end: s.end,
                arc: s.arc,
            })),
        })), null, 2));

        expect(result.pathData).toBeTruthy();
        expect(result.contours).toHaveLength(1);
        const contour = result.contours[0];
        expect(contour.segments).toHaveLength(3);

        // Check arc segment
        const arcSeg = contour.segments[1];
        expect(arcSeg.type).toBe("arc");
        console.log("Arc radius:", arcSeg.arc.radius);
        console.log("Arc start:", arcSeg.start);
        console.log("Arc end:", arcSeg.end);

        // Outward offset: arc radius should grow from 2 to 3
        expect(arcSeg.arc.radius).toBeCloseTo(3, 4);
    });
});
