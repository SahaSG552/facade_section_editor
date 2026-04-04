import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";
import { offsetSegment } from "../src/operations/OffsetCurveEvaluator.js";

describe("Debug: buildOffsetContour with arc", () => {
    it("should offset arc segment correctly through buildOffsetContour", () => {
        // Simulate what _parsePathData returns for the user's arc
        const segments = [
            {
                type: "line",
                start: { x: 10, y: 10 },
                end: { x: 2, y: 10 },
            },
            {
                type: "arc",
                start: { x: 2, y: 10 },
                end: { x: 0, y: 8 },
                arc: {
                    centerX: 2,
                    centerY: 8,
                    radius: 2,
                    startAngle: 90,   // degrees from DXF exporter
                    endAngle: 180,    // degrees from DXF exporter
                    sweepFlag: 1,
                },
            },
            {
                type: "line",
                start: { x: 0, y: 8 },
                end: { x: 0, y: 0 },
            },
        ];

        console.log("=== INPUT SEGMENTS ===");
        console.log(JSON.stringify(segments, null, 2));

        // Test offsetSegment directly on the arc
        const directArcResult = offsetSegment(segments[1], 1);
        console.log("=== DIRECT offsetSegment on arc ===");
        console.log(JSON.stringify(directArcResult, null, 2));

        // Test buildOffsetContour
        const result = buildOffsetContour(segments, 1, { joinType: "sharp", capType: "flat", skipCap: true });

        console.log("=== buildOffsetContour result ===");
        console.log(JSON.stringify(result, null, 2));

        expect(result).toHaveLength(3);
        const arcSeg = result[1];
        expect(arcSeg.type).toBe("arc");
        console.log("Arc radius from buildOffsetContour:", arcSeg.arc.radius);

        // Radius should grow: 2 + 1 = 3
        expect(arcSeg.arc.radius).toBeCloseTo(3, 4);
    });
});
