import { describe, expect, it } from "vitest";
import { shouldAcceptTrimmedPath } from "../../src/operations/offset/OffsetTrimAcceptanceStage.js";

describe("OffsetTrimAcceptanceStage", () => {
    it("rejects trimmed output that introduces bezier commands", () => {
        const accepted = shouldAcceptTrimmedPath(
            "M 0 0 L 10 0 L 10 10 Z",
            "M 0 0 C 1 1 2 2 3 3",
            {
                samplePathPoints: () => [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
                signedArea: () => 1,
                bboxArea: () => 1,
            },
        );

        expect(accepted).toBe(false);
    });

    it("rejects trimmed output with too many move commands", () => {
        const accepted = shouldAcceptTrimmedPath(
            "M 0 0 L 10 0 Z",
            "M 0 0 L 1 1 M 2 2 L 3 3 M 4 4",
            {
                samplePathPoints: () => [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }],
                signedArea: () => 1,
                bboxArea: () => 1,
            },
        );

        expect(accepted).toBe(false);
    });

    it("accepts repaired path when area and bbox ratios are within policy", () => {
        const accepted = shouldAcceptTrimmedPath(
            "M 0 0 L 10 0 L 10 10 L 0 10 Z",
            "M 1 1 L 9 1 L 9 9 L 1 9 Z",
            {
                samplePathPoints: (path) => (path.includes("1 1")
                    ? [{ x: 1, y: 1 }, { x: 9, y: 1 }, { x: 9, y: 9 }, { x: 1, y: 9 }]
                    : [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]),
                signedArea: (points) => points[0].x === 1 ? 64 : 100,
                bboxArea: (points) => points[0].x === 1 ? 64 : 100,
                epsilon: 1e-6,
            },
        );

        expect(accepted).toBe(true);
    });

    it("rejects repaired path when area ratio falls below threshold", () => {
        const accepted = shouldAcceptTrimmedPath(
            "M 0 0 L 10 0 L 10 10 L 0 10 Z",
            "M 4 4 L 6 4 L 6 6 L 4 6 Z",
            {
                samplePathPoints: (path) => (path.includes("4 4")
                    ? [{ x: 4, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 6 }, { x: 4, y: 6 }]
                    : [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]),
                signedArea: (points) => points[0].x === 4 ? 4 : 100,
                bboxArea: (points) => points[0].x === 4 ? 4 : 100,
                epsilon: 1e-6,
            },
        );

        expect(accepted).toBe(false);
    });
});
