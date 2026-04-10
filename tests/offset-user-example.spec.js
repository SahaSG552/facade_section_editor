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

        // Path has positive signed area → effectiveDistance = -1 (legacy negation).
        // With sweepFlag=1 arc and d=-1: r + (-1)*(-1) = 2+1 = 3 (arc grows outward).
        expect(arcSeg.arc.radius).toBeCloseTo(3, 4);
    });

    it("reversed contour: direct d=-3 equals sequential d=-2 then d=-1 after arc degeneration", async () => {
        const pathData = "M 0 16 L 0 8 A 2 2 0 0 0 2 10 L 10 10";
        const engine = new (await import("../src/operations/OffsetEngine.js")).OffsetEngine({ exportModule });

        const direct = await engine.processPath(pathData, -3);
        const step2 = await engine.processPath(pathData, -2);
        const seq = await engine.processPath(step2.pathData, -1);

        expect(direct.pathData).toBe(seq.pathData);
        expect(direct.contours).toHaveLength(1);
        expect(seq.contours).toHaveLength(1);

        const directSegments = direct.contours[0].segments;
        const seqSegments = seq.contours[0].segments;
        expect(directSegments).toHaveLength(seqSegments.length);

        // Expected stable geometry at d=-3:
        // M -3 16 L -3 8 L -3 5 L 3 5 L 3 7 L 10 7
        expect(direct.pathData).toContain("M -3.000000 16.000000");
        expect(direct.pathData).toContain("L -3.000000 8.000000");
        expect(direct.pathData).toContain("L -3.000000 5.000000");
        expect(direct.pathData).toContain("L 3.000000 5.000000");
        expect(direct.pathData).toContain("L 3.000000 7.000000");
        expect(direct.pathData).toContain("L 10.000000 7.000000");
    });
});
