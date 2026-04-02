/**
 * Cursor-side one-sided behavior contract - RED tests.
 *
 * These tests define the expected sign resolution contract for one-sided offsets:
 * 1) Find nearest segment to cursor
 * 2) Compute segment normal
 * 3) Use dot((cursor - segmentMidpoint), normal) to choose +distance / -distance
 *
 * Current implementation does not honor cursor-driven side selection,
 * so these tests are intentionally RED.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../src/operations/PaperBooleanProcessor.js", () => ({
    resolveSelfIntersections: (pathData) => pathData,
}));

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();

describe("Offset cursor-side contract (RED)", () => {
    it("open vertical line: cursor on left should choose negative side", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const result = await engine.processPath("M 0 0 V 10", 1, {
            offsetMode: "one-sided",
            sideResolution: "nearest-segment-normal",
            cursorPoint: { x: -1, y: 5 },
        });

        const contour = result.contours[0];
        const bbox = contour?.bbox;

        // For segment (0,0)->(0,10), normal is (+1,0).
        // Cursor (-1,5) gives negative dot => choose negative offset (left of line).
        expect(result.contours).toHaveLength(1);
        expect(bbox).not.toBeNull();
        expect(bbox.maxX).toBeLessThanOrEqual(0);
    });

    it("open vertical line: cursor on right should choose positive side", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const result = await engine.processPath("M 0 0 V 10", 1, {
            offsetMode: "one-sided",
            sideResolution: "nearest-segment-normal",
            cursorPoint: { x: 1, y: 5 },
        });

        const contour = result.contours[0];
        const bbox = contour?.bbox;

        // Cursor (1,5) gives positive dot => choose positive offset (right of line).
        expect(result.contours).toHaveLength(1);
        expect(bbox).not.toBeNull();
        expect(bbox.minX).toBeGreaterThanOrEqual(0);
    });

    it("closed rectangle: inside cursor should choose inward one-sided offset", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const result = await engine.processPath("M 0 0 L 10 0 L 10 10 L 0 10 Z", 1, {
            offsetMode: "one-sided",
            sideResolution: "nearest-segment-normal",
            cursorPoint: { x: 5, y: 5 },
        });

        const contour = result.contours[0];
        const bbox = contour?.bbox;

        // Inside cursor must resolve to inward side; inset bbox must be strictly inside source [0..10].
        expect(result.contours).toHaveLength(1);
        expect(bbox).not.toBeNull();
        expect(bbox.minX).toBeGreaterThan(0);
        expect(bbox.minY).toBeGreaterThan(0);
        expect(bbox.maxX).toBeLessThan(10);
        expect(bbox.maxY).toBeLessThan(10);
    });
});
