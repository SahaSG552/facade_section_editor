import { describe, it, expect } from "vitest";
import { OffsetEngine, calculateOffsetFromPathData } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";
import { vi } from "vitest";

vi.mock("../src/export/PaperBooleanProcessor.js", () => ({
    PaperBooleanProcessor: {
        resolveSelfIntersections: vi.fn((segments) => segments),
    },
}));

const exportModule = new ExportModule();

describe("CCW contour offset consistency", () => {
    it("CCW contour: line-arc-arc-V should offset outward consistently", async () => {
        // CCW contour: M 30 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 -10 0 V -19
        // Arc 1: CW (sweep=0), r=10, center (20,0)
        // Arc 2: CCW (sweep=1), r=10, center (0,0)
        // Line V: (−10,0) → (−10,−19)
        const pathData = "M 30 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 -10 0 V -19";
        const engine = new OffsetEngine({ exportModule });
        const result = await engine.processPath(pathData, 1);

        console.log("=== CCW CONTOUR ===");
        console.log("Input:", pathData);
        console.log("Output:", result.pathData);

        expect(result.contours).toHaveLength(1);
        const contour = result.contours[0];
        // V command may merge with previous segment, so 3 or 4 segments
        expect(contour.segments.length).toBeGreaterThanOrEqual(3);

        // Arc 1 (CW): r=10 → 9 (shrinks for outward CCW contour)
        expect(contour.segments[0].type).toBe("arc");
        expect(contour.segments[0].arc.radius).toBeCloseTo(9, 4);

        // Arc 2 (CCW): r=10 → 11 (grows for outward CCW contour)
        expect(contour.segments[1].type).toBe("arc");
        expect(contour.segments[1].arc.radius).toBeCloseTo(11, 4);

        // Last segment (line): x should go from -10 to -11 (outward)
        const lastSeg = contour.segments[contour.segments.length - 1];
        expect(lastSeg.type).toBe("line");
        expect(lastSeg.start.x).toBeCloseTo(-11, 4);
        expect(lastSeg.end.x).toBeCloseTo(-11, 4);
    });
});

describe("CW contour offset consistency", () => {
    it("CW contour: V-arc-arc should offset outward consistently", async () => {
        // CW contour: M -10 -19 V 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 30 0
        // Line V: (−10,−19) → (−10,0)
        // Arc 1: CW (sweep=0), r=10, center (0,0)
        // Arc 2: CCW (sweep=1), r=10, center (20,0)
        const pathData = "M -10 -19 V 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 30 0";
        const engine = new OffsetEngine({ exportModule });
        const result = await engine.processPath(pathData, 1);

        console.log("=== CW CONTOUR ===");
        console.log("Input:", pathData);
        console.log("Output:", result.pathData);

        expect(result.contours).toHaveLength(1);
        const contour = result.contours[0];
        // Line-arc connection uses U-bridge (3 segments) instead of sharp join
        // So: V-line + U-bridge(3) + arc1 + arc2 = 5 segments
        expect(contour.segments.length).toBeGreaterThanOrEqual(3);

        // Line V: x should go from -10 to -11 (outward)
        expect(contour.segments[0].type).toBe("line");
        expect(contour.segments[0].start.x).toBeCloseTo(-11, 4);
        expect(contour.segments[0].end.x).toBeCloseTo(-11, 4);

        // Find arcs by type (U-bridge segments may be inserted)
        const arcs = contour.segments.filter(s => s.type === "arc");
        expect(arcs.length).toBeGreaterThanOrEqual(2);

        // Arc 1 (CW): r=10 → 11 (grows outward)
        expect(arcs[0].arc.radius).toBeCloseTo(11, 4);

        // Arc 2 (CCW): r=10 → 9 (shrinks outward)
        expect(arcs[1].arc.radius).toBeCloseTo(9, 4);
    });
});

describe("Continuity checks for mixed contours", () => {
    it("CCW contour: all consecutive segment endpoints must be stitched", async () => {
        const pathData = "M 30 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 -10 0 V -19";
        const engine = new OffsetEngine({ exportModule });
        const result = await engine.processPath(pathData, 1);

        const segments = result.contours[0].segments;
        for (let i = 0; i < segments.length - 1; i++) {
            const currEnd = segments[i].end;
            const nextStart = segments[i + 1].start;
            const dx = currEnd.x - nextStart.x;
            const dy = currEnd.y - nextStart.y;
            const dist = Math.hypot(dx, dy);
            expect(dist).toBeLessThan(1e-4);
        }
    });

    it("CW contour: all consecutive segment endpoints must be stitched", async () => {
        const pathData = "M -10 -19 V 0 A 10 10 0 0 0 10 0 A 10 10 0 0 1 30 0";
        const engine = new OffsetEngine({ exportModule });
        const result = await engine.processPath(pathData, 1);

        const segments = result.contours[0].segments;
        for (let i = 0; i < segments.length - 1; i++) {
            const currEnd = segments[i].end;
            const nextStart = segments[i + 1].start;
            const dx = currEnd.x - nextStart.x;
            const dy = currEnd.y - nextStart.y;
            const dist = Math.hypot(dx, dy);
            expect(dist).toBeLessThan(1e-4);
        }
    });
});
