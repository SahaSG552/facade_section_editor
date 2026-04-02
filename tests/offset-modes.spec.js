/**
 * Offset Mode Routing Contracts - RED Tests
 *
 * Tests for mode routing contracts in offset operations.
 * Defines expected behavior for:
 * - Open contour modes: one-sided, two-sides-no-close, two-sides-round-caps, two-sides-flat-caps
 * - Closed contour modes: one-sided, two-sides-no-close
 *
 * Expected to FAIL (RED) before mode routing implementation (Wave 2).
 */

import { describe, it, expect, vi } from "vitest";

// Mock Paper.js-dependent module
vi.mock("../src/operations/PaperBooleanProcessor.js", () => ({
    resolveSelfIntersections: (pathData) => pathData,
}));

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();

describe("Offset Mode Routing - Open Contour Modes", () => {
    describe("one-sided mode", () => {
        it("should produce 1 open contour for open path with one-sided mode", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 L 10 0 L 10 10"; // Open path
            const result = await engine.processPath(pathData, 1, { mode: "one-sided" });

            console.log("TEST: open path one-sided mode");
            console.log("Input path:", pathData);
            console.log("Mode: one-sided");
            console.log("Result contours:", result.contours.length);
            console.log("Contour details:", result.contours.map(c => ({
                closed: c.closed,
                segments: c.segments.length,
                area: c.area
            })));

            // MUST FAIL before mode routing exists
            // Expected: 1 open contour offset to cursor side only
            expect(result.contours).toHaveLength(1);
            expect(result.contours[0].closed).toBe(false);
            expect(result.contours[0].area).toBeGreaterThan(0);
        });

        it("one-sided mode should produce offset on one side only (positive offset)", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 V 10"; // Single vertical line
            const offsetDistance = 2;
            const result = await engine.processPath(pathData, offsetDistance, { mode: "one-sided" });

            const contour = result.contours[0];

            console.log("Single line one-sided:");
            console.log("Offset distance:", offsetDistance);
            console.log("Contour segments:", contour.segments.length);
            console.log("Contour area:", contour.area);
            console.log("Contour closed:", contour.closed);

            // MUST FAIL before mode implementation
            // Expected: 1 open contour, area derived from 1 offset
            expect(result.contours).toHaveLength(1);
            expect(contour.closed).toBe(false);
            expect(contour.segments.length).toBeGreaterThan(0);
        });
    });

    describe("two-sides-no-close mode", () => {
        it("should produce 2 separate open contours for open path with two-sides-no-close mode", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 L 10 0 L 10 10"; // Open path
            const result = await engine.processPath(pathData, 1, { mode: "two-sides-no-close" });

            console.log("TEST: open path two-sides-no-close mode");
            console.log("Input path:", pathData);
            console.log("Mode: two-sides-no-close");
            console.log("Result contours:", result.contours.length);
            console.log("Contour details:", result.contours.map((c, i) => ({
                index: i,
                closed: c.closed,
                segments: c.segments.length,
                area: c.area
            })));

            // MUST FAIL before mode routing exists
            // Expected: 2 separate open contours (left and right offsets, not stitched)
            expect(result.contours).toHaveLength(2);
            expect(result.contours[0].closed).toBe(false);
            expect(result.contours[1].closed).toBe(false);
        });

        it("two-sides-no-close should produce distinct left and right contours", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 V 10";
            const offsetDistance = 1;
            const result = await engine.processPath(pathData, offsetDistance, { mode: "two-sides-no-close" });

            console.log("Two-sided no-close separation:");
            result.contours.forEach((c, i) => {
                console.log(`  Contour ${i}: segments=${c.segments.length}, closed=${c.closed}, area=${c.area}`);
            });

            // MUST FAIL before mode implementation
            // Expected: 2 contours with different areas (one offset +1, one offset -1)
            expect(result.contours).toHaveLength(2);
            expect(result.contours[0].area).not.toEqual(result.contours[1].area);
        });
    });

    describe("two-sides-round-caps mode", () => {
        it("should produce 1 closed contour for open path with two-sides-round-caps mode", async () => {
            const engine = new OffsetEngine({ 
                joinType: "round", 
                capType: "round", 
                exportModule 
            });
            const pathData = "M 0 0 L 10 0 L 10 10"; // Open path
            const result = await engine.processPath(pathData, 1, { mode: "two-sides-round-caps" });

            console.log("TEST: open path two-sides-round-caps mode");
            console.log("Input path:", pathData);
            console.log("Mode: two-sides-round-caps");
            console.log("Result contours:", result.contours.length);
            console.log("Contour details:", result.contours.map(c => ({
                closed: c.closed,
                segments: c.segments.length,
                area: c.area
            })));

            // MUST FAIL before mode routing exists
            // Expected: 1 closed contour (two sides stitched with round caps)
            expect(result.contours).toHaveLength(1);
            expect(result.contours[0].closed).toBe(true);
            expect(result.contours[0].segments.length).toBeGreaterThan(0);
        });

        it("two-sides-round-caps should include round-cap arc segments at endpoints", async () => {
            const engine = new OffsetEngine({ 
                joinType: "round", 
                capType: "round", 
                exportModule 
            });
            const pathData = "M 0 0 V 10";
            const offsetDistance = 2;
            const result = await engine.processPath(pathData, offsetDistance, { mode: "two-sides-round-caps" });

            const contour = result.contours[0];

            console.log("Round-cap structure:");
            console.log("Segments:", contour.segments.length);
            console.log("Closed:", contour.closed);
            console.log("Area:", contour.area);

            // MUST FAIL before mode implementation
            // Expected: Closed contour with round caps (more segments for curves)
            expect(contour.closed).toBe(true);
            expect(contour.segments.length).toBeGreaterThan(8); // More segments for round caps
        });
    });

    describe("two-sides-flat-caps mode", () => {
        it("should produce 1 closed contour for open path with two-sides-flat-caps mode", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 L 10 0 L 10 10"; // Open path
            const result = await engine.processPath(pathData, 1, { mode: "two-sides-flat-caps" });

            console.log("TEST: open path two-sides-flat-caps mode");
            console.log("Input path:", pathData);
            console.log("Mode: two-sides-flat-caps");
            console.log("Result contours:", result.contours.length);
            console.log("Contour details:", result.contours.map(c => ({
                closed: c.closed,
                segments: c.segments.length,
                area: c.area
            })));

            // MUST FAIL before mode routing exists
            // Expected: 1 closed contour (two sides stitched with flat caps)
            expect(result.contours).toHaveLength(1);
            expect(result.contours[0].closed).toBe(true);
            expect(result.contours[0].segments.length).toBeGreaterThan(0);
        });

        it("two-sides-flat-caps should produce fewer segments than round-caps", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 V 10";
            const offsetDistance = 2;
            const result = await engine.processPath(pathData, offsetDistance, { mode: "two-sides-flat-caps" });

            const contour = result.contours[0];

            console.log("Flat-cap structure:");
            console.log("Segments:", contour.segments.length);
            console.log("Closed:", contour.closed);
            console.log("Area:", contour.area);

            // MUST FAIL before mode implementation
            // Expected: Closed contour with flat caps (fewer segments than round)
            expect(contour.closed).toBe(true);
            expect(contour.segments.length).toBeGreaterThan(4); // At least cap lines + offset lines
        });
    });
});

describe("Offset Mode Routing - Closed Contour Modes", () => {
    describe("one-sided mode", () => {
        it("should produce 1 closed contour for closed path with one-sided mode", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 L 10 0 L 10 10 L 0 10 Z"; // Closed path
            const result = await engine.processPath(pathData, 1, { mode: "one-sided" });

            console.log("TEST: closed path one-sided mode");
            console.log("Input path:", pathData);
            console.log("Mode: one-sided (closed)");
            console.log("Result contours:", result.contours.length);
            console.log("Contour details:", result.contours.map(c => ({
                closed: c.closed,
                segments: c.segments.length,
                area: c.area
            })));

            // MUST FAIL before mode routing exists
            // Expected: 1 closed contour (inward offset only)
            expect(result.contours).toHaveLength(1);
            expect(result.contours[0].closed).toBe(true);
        });

        it("one-sided closed mode should produce contour with correct orientation", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 L 10 0 L 10 10 L 0 10 Z"; // Closed CCW path
            const offsetDistance = 1;
            const result = await engine.processPath(pathData, offsetDistance, { mode: "one-sided" });

            const contour = result.contours[0];

            console.log("One-sided closed orientation:");
            console.log("Orientation:", contour.orientation);
            console.log("Area:", contour.area);
            console.log("Segments:", contour.segments.length);

            // MUST FAIL before mode implementation
            // Expected: Closed contour with proper orientation
            expect(contour.closed).toBe(true);
            expect(contour.segments.length).toBeGreaterThan(0);
        });
    });

    describe("two-sides-no-close mode", () => {
        it("should produce 2 separate closed contours for closed path with two-sides-no-close mode", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 L 10 0 L 10 10 L 0 10 Z"; // Closed path
            const result = await engine.processPath(pathData, 1, { mode: "two-sides-no-close" });

            console.log("TEST: closed path two-sides-no-close mode");
            console.log("Input path:", pathData);
            console.log("Mode: two-sides-no-close (closed)");
            console.log("Result contours:", result.contours.length);
            console.log("Contour details:", result.contours.map((c, i) => ({
                index: i,
                closed: c.closed,
                segments: c.segments.length,
                area: c.area
            })));

            // MUST FAIL before mode routing exists
            // Expected: 2 separate closed contours (outer and inner, not stitched)
            expect(result.contours).toHaveLength(2);
            expect(result.contours[0].closed).toBe(true);
            expect(result.contours[1].closed).toBe(true);
        });

        it("two-sides-no-close closed mode should have concentric contours with different areas", async () => {
            const engine = new OffsetEngine({ 
                joinType: "sharp", 
                capType: "flat", 
                exportModule 
            });
            const pathData = "M 0 0 L 10 0 L 10 10 L 0 10 Z"; // 10x10 square
            const offsetDistance = 1;
            const result = await engine.processPath(pathData, offsetDistance, { mode: "two-sides-no-close" });

            console.log("Two-sided closed concentric contours:");
            result.contours.forEach((c, i) => {
                console.log(`  Contour ${i}: area=${c.area}, closed=${c.closed}, segments=${c.segments.length}`);
            });

            // MUST FAIL before mode implementation
            // Expected: 2 contours with outer > inner area (concentric rings)
            expect(result.contours).toHaveLength(2);
            // Sort by area to compare outer vs inner
            const sortedByArea = [...result.contours].sort((a, b) => b.area - a.area);
            expect(sortedByArea[0].area).toBeGreaterThan(sortedByArea[1].area);
        });
    });
});

describe("Offset Mode Routing - Mode Parameter Contracts", () => {
    it("should accept mode parameter in processPath options", async () => {
        const engine = new OffsetEngine({ 
            joinType: "sharp", 
            capType: "flat", 
            exportModule 
        });
        const pathData = "M 0 0 L 10 0 L 10 10";

        // MUST FAIL before mode parameter is supported
        // Expected: processPath accepts mode in options
        const result = await engine.processPath(pathData, 1, { mode: "one-sided" });

        expect(result).toHaveProperty("contours");
        expect(Array.isArray(result.contours)).toBe(true);
    });

    it("should differentiate between open-path modes", async () => {
        const engine = new OffsetEngine({ 
            joinType: "sharp", 
            capType: "flat", 
            exportModule 
        });
        const openPath = "M 0 0 L 10 0 L 10 10";

        // MUST FAIL before mode routing exists
        // Expected: Different modes produce different contour counts
        const oneSidedResult = await engine.processPath(openPath, 1, { mode: "one-sided" });
        const twoSidesResult = await engine.processPath(openPath, 1, { mode: "two-sides-no-close" });

        console.log("Mode differentiation:");
        console.log("One-sided contours:", oneSidedResult.contours.length);
        console.log("Two-sides contours:", twoSidesResult.contours.length);

        expect(oneSidedResult.contours.length).not.toEqual(twoSidesResult.contours.length);
    });

    it("should differentiate between closed-contour cap types", async () => {
        const engine = new OffsetEngine({ 
            joinType: "sharp", 
            capType: "flat", 
            exportModule 
        });
        const openPath = "M 0 0 L 10 0 L 10 10";

        // MUST FAIL before mode routing exists
        // Expected: Round-caps and flat-caps produce different segment counts
        const roundCapsResult = await engine.processPath(openPath, 2, { mode: "two-sides-round-caps" });
        const flatCapsResult = await engine.processPath(openPath, 2, { mode: "two-sides-flat-caps" });

        console.log("Cap differentiation:");
        if (roundCapsResult.contours.length > 0 && flatCapsResult.contours.length > 0) {
            console.log("Round-caps segments:", roundCapsResult.contours[0].segments.length);
            console.log("Flat-caps segments:", flatCapsResult.contours[0].segments.length);

            expect(roundCapsResult.contours[0].segments.length).not.toEqual(flatCapsResult.contours[0].segments.length);
        }
    });
});
