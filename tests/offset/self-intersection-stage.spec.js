import { describe, expect, it } from "vitest";
import { pathHasSelfIntersections } from "../../src/operations/offset/OffsetSelfIntersectionStage.js";

describe("OffsetSelfIntersectionStage", () => {
    it("detects intersection on bow-tie polyline", () => {
        const points = [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
            { x: 10, y: 0 },
            { x: 0, y: 0 },
        ];

        const hasIntersections = pathHasSelfIntersections("mock", {
            samplePathPoints: () => points,
            isNear: (a, b, tolerance = 1e-6) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance,
            epsilon: 1e-6,
        });

        expect(hasIntersections).toBe(true);
    });

    it("returns false for simple closed rectangle", () => {
        const points = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
            { x: 0, y: 0 },
        ];

        const hasIntersections = pathHasSelfIntersections("mock", {
            samplePathPoints: () => points,
            isNear: (a, b, tolerance = 1e-6) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance,
            epsilon: 1e-6,
        });

        expect(hasIntersections).toBe(false);
    });

    it("returns false when sampled path is too short", () => {
        const hasIntersections = pathHasSelfIntersections("mock", {
            samplePathPoints: () => [{ x: 0, y: 0 }, { x: 1, y: 1 }],
            isNear: () => false,
            epsilon: 1e-6,
        });

        expect(hasIntersections).toBe(false);
    });
});
