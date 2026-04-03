import { describe, it, expect, vi } from "vitest";
import ExportModule from "../src/export/ExportModule.js";
import { assertContourCount, assertContinuity, assertNoZeroLength } from "./helpers/topology-helpers.js";

vi.mock("../src/operations/PaperBooleanProcessor.js", () => {
    return {
        resolveSelfIntersections: (pathData) => pathData,
    };
});

import { OffsetEngine } from "../src/operations/OffsetEngine.js";

const exportModule = new ExportModule();

describe("Task 6 OffsetEngine QA scenarios", () => {
    it("Scenario 1: closed rectangle sharp joins", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", exportModule });
        const result = await engine.processPath("M 0 0 L 100 0 L 100 100 L 0 100 Z", 10);

        expect(typeof result.pathData).toBe("string");
        expect(result.pathData.length).toBeGreaterThan(0);
        expect(result.contours.length).toBeGreaterThan(0);

        console.log("SCENARIO1", JSON.stringify(result));
    });

    it("Scenario 2: closed rectangle round joins", async () => {
        const engine = new OffsetEngine({ joinType: "round", exportModule });
        const result = await engine.processPath("M 0 0 L 100 0 L 100 100 L 0 100 Z", 10);

        expect(typeof result.pathData).toBe("string");
        expect(result.pathData.length).toBeGreaterThan(0);
        expect(result.contours.length).toBeGreaterThan(0);
        expect(result.pathData.includes("A")).toBe(true);

        console.log("SCENARIO2", JSON.stringify(result));
    });

    it("Scenario 3: L-shape self-intersection trimming flow", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", exportModule });
        const result = await engine.processPath(
            "M 0 0 L 100 0 L 100 40 L 40 40 L 40 100 L 0 100 Z",
            20,
        );

        expect(typeof result.pathData).toBe("string");
        expect(result.pathData.length).toBeGreaterThan(0);
        expect(result.contours.length).toBeGreaterThan(0);

        console.log("SCENARIO3", JSON.stringify(result));
    });

    it("Scenario 4: open curve one-sided (default)", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const result = await engine.processPath("M 0 0 L 100 0", 5);

        expect(typeof result.pathData).toBe("string");
        expect(result.pathData.length).toBeGreaterThan(0);
        expect(result.contours.length).toBeGreaterThan(0);
        // Default mode is one-sided: single offset line, no caps, no Z
        expect(result.pathData.endsWith("Z")).toBe(false);
        expect(result.contours[0].closed).toBe(false);
        expect(result.contours[0].segments.length).toBe(1);

        console.log("SCENARIO4", JSON.stringify(result));
    });

    it("Scenario 4b: open curve topology validation", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const result = await engine.processPath("M 0 0 L 100 0", 5);

        // Validate contour count and topology
        assertContourCount(result, 1);
        const contour = result.contours[0];

        // Verify segment continuity
        assertContinuity(contour.segments);

        // Verify no zero-length segments
        assertNoZeroLength(contour.segments);

        console.log("Scenario 4b topology checks passed");
    });
});
