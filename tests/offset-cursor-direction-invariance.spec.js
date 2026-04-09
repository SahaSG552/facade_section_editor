import { describe, it, expect } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();

describe("Offset cursor-side direction invariance", () => {
    it("open one-sided offset follows cursor for both forward and reversed contour direction", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });

        const forwardPath = "M 0 0 L 10 0 L 10 10";
        const reversedPath = "M 10 10 L 10 0 L 0 0";
        const cursorPoint = { x: 5, y: 3 };

        const forwardResult = await engine.processPath(forwardPath, 2, {
            offsetMode: "one-sided",
            sideResolution: "nearest-segment-normal",
            cursorPoint,
        });

        const reversedResult = await engine.processPath(reversedPath, 2, {
            offsetMode: "one-sided",
            sideResolution: "nearest-segment-normal",
            cursorPoint,
        });

        expect(forwardResult.contours).toHaveLength(1);
        expect(reversedResult.contours).toHaveLength(1);

        const forwardBBox = forwardResult.contours[0]?.bbox;
        const reversedBBox = reversedResult.contours[0]?.bbox;

        expect(forwardBBox).not.toBeNull();
        expect(reversedBBox).not.toBeNull();

        // Cursor is below the horizontal leg, so both offsets must move downward.
        expect(forwardBBox.minY).toBeGreaterThan(0);
        expect(reversedBBox.minY).toBeGreaterThan(0);
        expect(Math.abs(forwardBBox.minY - reversedBBox.minY)).toBeLessThan(1e-6);
    });
});
