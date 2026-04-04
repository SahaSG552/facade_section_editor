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

/**
 * Helper: assert contour has correct segment count and continuity.
 */
function assertContour(contour, expectedSegments) {
    expect(contour.segments).toHaveLength(expectedSegments);
    // Check continuity
    for (let i = 1; i < contour.segments.length; i++) {
        const prev = contour.segments[i - 1].end;
        const curr = contour.segments[i].start;
        expect(Math.abs(prev.x - curr.x)).toBeLessThan(0.01);
        expect(Math.abs(prev.y - curr.y)).toBeLessThan(0.01);
    }
}

describe("CCW contour offset (arc-arc-line)", () => {
    /**
     * Input: M 30 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 -10 0 V -19
     *
     * Contour direction: CCW (overall)
     * - Arc 1: CW (sweep=0), r=10, (30,0)→(10,0), center (20,0)
     * - Arc 2: CCW (sweep=1), r=10, (10,0)→(-10,0), center (0,0)
     * - Line: (-10,0)→(-10,-19)
     *
     * Outward offset (+1):
     * - Arc 1 (CW): r 10→9 (shrinks outward for CW arc in CCW contour)
     * - Arc 2 (CCW): r 10→11 (grows outward for CCW arc)
     * - Line: x -10→-11
     */
    it("should offset CCW contour outward correctly", async () => {
        const pathData = "M 30 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 -10 0 V -19";
        const engine = new OffsetEngine({ exportModule });
        const result = await engine.processPath(pathData, 1);

        console.log("=== CCW CONTOUR ===");
        console.log("Input:", pathData);
        console.log("Output:", result.pathData);
        console.log("Segments:", JSON.stringify(result.contours[0].segments.map(s => ({
            type: s.type,
            start: s.start,
            end: s.end,
            arc: s.arc ? { radius: s.arc.radius, sweepFlag: s.arc.sweepFlag } : null,
        })), null, 2));

        expect(result.contours).toHaveLength(1);
        const contour = result.contours[0];
        assertContour(contour, 3);

        // Arc 1: CW, r=10→9
        const arc1 = contour.segments[0];
        expect(arc1.type).toBe("arc");
        expect(arc1.arc.radius).toBeCloseTo(9, 4);
        expect(arc1.arc.sweepFlag).toBe(0);

        // Arc 2: CCW, r=10→11
        const arc2 = contour.segments[1];
        expect(arc2.type).toBe("arc");
        expect(arc2.arc.radius).toBeCloseTo(11, 4);
        expect(arc2.arc.sweepFlag).toBe(1);

        // Line: x=-10 → x=-11
        const line = contour.segments[2];
        expect(line.type).toBe("line");
        expect(line.start.x).toBeCloseTo(-11, 4);
        expect(line.end.x).toBeCloseTo(-11, 4);
        expect(line.end.y).toBeCloseTo(-19, 4);
    });
});

describe("CW contour offset (line-arc-arc)", () => {
    /**
     * Input: M -10 -19 V 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 30 0
     *
     * Contour direction: CW (overall)
     * - Line: (-10,-19)→(-10,0)
     * - Arc 1: CW (sweep=0), r=10, (-10,0)→(10,0), center (0,0)
     * - Arc 2: CCW (sweep=1), r=10, (10,0)→(30,0), center (20,0)
     *
     * Outward offset (+1):
     * - Line: x -10→-11
     * - Arc 1 (CW): r 10→11
     * - Arc 2 (CCW): r 10→9
     */
    it("should offset CW contour outward correctly", async () => {
        const pathData = "M -10 -19 V 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 30 0";
        const engine = new OffsetEngine({ exportModule });
        const result = await engine.processPath(pathData, 1);

        console.log("=== CW CONTOUR ===");
        console.log("Input:", pathData);
        console.log("Output:", result.pathData);
        console.log("Segments:", JSON.stringify(result.contours[0].segments.map(s => ({
            type: s.type,
            start: s.start,
            end: s.end,
            arc: s.arc ? { radius: s.arc.radius, sweepFlag: s.arc.sweepFlag } : null,
        })), null, 2));

        expect(result.contours).toHaveLength(1);
        const contour = result.contours[0];
        assertContour(contour, 3);

        // Line: x=-10 → x=-11
        const line = contour.segments[0];
        expect(line.type).toBe("line");
        expect(line.start.x).toBeCloseTo(-11, 4);
        expect(line.start.y).toBeCloseTo(-19, 4);
        expect(line.end.x).toBeCloseTo(-11, 4);
        expect(line.end.y).toBeCloseTo(0, 4);

        // Arc 1: CW, r=10→11
        const arc1 = contour.segments[1];
        expect(arc1.type).toBe("arc");
        expect(arc1.arc.radius).toBeCloseTo(11, 4);
        expect(arc1.arc.sweepFlag).toBe(0);

        // Arc 2: CCW, r=10→9
        const arc2 = contour.segments[2];
        expect(arc2.type).toBe("arc");
        expect(arc2.arc.radius).toBeCloseTo(9, 4);
        expect(arc2.arc.sweepFlag).toBe(1);
    });
});
