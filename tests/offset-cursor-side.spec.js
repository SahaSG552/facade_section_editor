/**
 * Cursor-side one-sided behavior contract.
 *
 * These tests define the expected sign resolution contract for one-sided offsets:
 * 1) Find nearest segment to cursor
 * 2) Compute segment normal
 * 3) Use dot((cursor - segmentMidpoint), normal) to choose +distance / -distance
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../src/operations/PaperBooleanProcessor.js", () => ({
    resolveSelfIntersections: (pathData) => pathData,
    resolveSelfIntersectionsDetailed: (pathData) => ({ pathData, components: [] }),
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

describe("Offset cursor-side arc with direct mode", () => {
    // Regression: `M 1 -1 A 10.4108 10.4108 0 1 1 13 16` is a large CCW arc
    // (largeArcFlag=1, sweepFlag=1) with center ≈ (7.3, 7.29), radius ≈ 10.41.
    // When offsetSignMode="direct", the caller already carries the correct signed
    // distance — the engine must NOT override it with chord-based cursor side
    // detection (which is wrong for large arcs).

    const arcPath = "M 1 -1 A 10.4108 10.4108 0 1 1 13 16";
    // center ≈ (7.3, 7.29), radius ≈ 10.4108
    const cursorInside = { x: 7, y: 7 };   // inside circle (dist ≈ 0.4 < 10.41)
    const cursorOutside = { x: -5, y: -10 }; // outside circle (dist ≈ 18 > 10.41)

    it("direct+sideResolution: positive d (inward for CCW arc) preserved regardless of cursor inside", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        // d=+4 with CCW arc → inward (r ≈ 6.41); sign must not be overridden
        const result = await engine.processPath(arcPath, 4, {
            offsetMode: "one-sided",
            offsetSignMode: "direct",
            sideResolution: "nearest-segment-normal",
            cursorPoint: cursorInside,
        });
        expect(result.contours).toHaveLength(1);
        const seg = result.contours[0]?.segments?.[0];
        const radius = seg?.arc?.radius ?? seg?.arc?.rx;
        expect(radius).toBeCloseTo(10.4108 - 4, 1); // inward → smaller radius ≈ 6.41
    });

    it("direct+sideResolution: negative d (outward for CCW arc) preserved regardless of cursor inside", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        // d=-4 with CCW arc → outward (r ≈ 14.41); sign must not be overridden
        const result = await engine.processPath(arcPath, -4, {
            offsetMode: "one-sided",
            offsetSignMode: "direct",
            sideResolution: "nearest-segment-normal",
            cursorPoint: cursorInside,
        });
        expect(result.contours).toHaveLength(1);
        const seg = result.contours[0]?.segments?.[0];
        const radius = seg?.arc?.radius ?? seg?.arc?.rx;
        expect(radius).toBeCloseTo(10.4108 + 4, 1); // outward → larger radius ≈ 14.41
    });

    it("direct+sideResolution: negative d (outward) preserved when cursor is outside too", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const result = await engine.processPath(arcPath, -4, {
            offsetMode: "one-sided",
            offsetSignMode: "direct",
            sideResolution: "nearest-segment-normal",
            cursorPoint: cursorOutside,
        });
        expect(result.contours).toHaveLength(1);
        const seg = result.contours[0]?.segments?.[0];
        const radius = seg?.arc?.radius ?? seg?.arc?.rx;
        expect(radius).toBeCloseTo(10.4108 + 4, 1); // outward → larger radius ≈ 14.41
    });
});
