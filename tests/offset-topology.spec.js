/**
 * Offset Topology Invariants - RED Tests
 *
 * Tests for topology correctness when offsetting single-line contours.
 * Expected to FAIL (RED) on current broken behavior where unconditional
 * closing line and improper stitching create parasitic 12-segment loops.
 */

import { describe, it, expect, vi } from "vitest";

// Mock Paper.js-dependent module
vi.mock("../src/operations/PaperBooleanProcessor.js", () => ({
    resolveSelfIntersections: (pathData) => pathData,
}));

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";
import {
    assertContinuity,
    assertNoZeroLength,
    assertContourCount,
} from "./helpers/topology-helpers.js";

const exportModule = new ExportModule();

describe("Offset Topology - Single Line Invariants", () => {
    it("should produce 1 open contour for single-line one-sided mode", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const pathData = "M 0 0 V 10";
        const result = await engine.processPath(pathData, 1);

        console.log("TEST: single-line one-sided");
        console.log("Input path:", pathData);
        console.log("Result contours:", result.contours.length);
        console.log("Result:", JSON.stringify(result, null, 2));

        // MUST FAIL on current broken behavior
        expect(result.contours).toHaveLength(1);
    });

    it("single-line offset should produce open contour, not closed", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const pathData = "M 0 0 V 10";
        const result = await engine.processPath(pathData, 1);

        const contour = result.contours[0];

        console.log("Contour closed status:", contour.closed);
        console.log("Contour segments count:", contour.segments.length);

        // MUST FAIL if contour is incorrectly marked as closed
        expect(contour.closed).toBe(false);
    });

    it("single-line offset should NOT produce 12-segment parasitic loop", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const pathData = "M 0 0 V 10";
        const result = await engine.processPath(pathData, 1);

        const contour = result.contours[0];
        const segmentCount = contour.segments.length;

        console.log("Segment count:", segmentCount);
        console.log("Segments:", contour.segments);

        // MUST FAIL if parasitic 12-segment loop exists
        // Expected segment count for a capped line: ~8-10 segments (two horizontal caps + offset line)
        // 12 segments indicates unconditional closing + improper stitching
        expect(segmentCount).toBeLessThan(12);
    });

    it("single-line offset pathData should not have unnecessary Z (close path)", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const pathData = "M 0 0 V 10";
        const result = await engine.processPath(pathData, 1);

        const pathStr = result.pathData;
        const contour = result.contours[0];

        console.log("Path data:", pathStr);
        console.log("Contour closed:", contour.closed);

        // MUST FAIL if path is closed when contour is open
        if (!contour.closed) {
            expect(pathStr.endsWith("Z")).toBe(false);
        }
    });

    it("single-line round-cap offset should produce proper topology", async () => {
        const engine = new OffsetEngine({ joinType: "round", capType: "round", exportModule });
        const pathData = "M 0 0 V 10";
        const result = await engine.processPath(pathData, 2);

        console.log("Round cap test:");
        console.log("Contours:", result.contours.length);
        result.contours.forEach((c, i) => {
            console.log(`  Contour ${i}: segments=${c.segments.length}, closed=${c.closed}`);
        });

        // Even with round caps, should be 1 contour
        expect(result.contours).toHaveLength(1);

        // Should be open
        expect(result.contours[0].closed).toBe(false);

        // Should not have parasitic loop
        expect(result.contours[0].segments.length).toBeLessThan(12);
    });

    it("multi-segment open path should maintain proper topology", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const pathData = "M 0 0 L 10 0 L 10 10";
        const result = await engine.processPath(pathData, 1);

        console.log("Multi-segment open path test:");
        console.log("Contours:", result.contours.length);
        result.contours.forEach((c, i) => {
            console.log(`  Contour ${i}: segments=${c.segments.length}, closed=${c.closed}`);
        });

        // Should produce 1 contour
        expect(result.contours).toHaveLength(1);

        // Should be open
        expect(result.contours[0].closed).toBe(false);
    });

    it("single-line offset should have continuous segments", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const pathData = "M 0 0 V 10";
        const result = await engine.processPath(pathData, 1);

        assertContourCount(result, 1);
        const contour = result.contours[0];

        // Verify continuity
        assertContinuity(contour.segments);

        // Verify no zero-length segments
        assertNoZeroLength(contour.segments);

        console.log("Continuity and zero-length checks passed");
    });
});
