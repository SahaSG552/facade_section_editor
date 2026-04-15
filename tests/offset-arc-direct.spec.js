import { describe, it, expect } from "vitest";
import { offsetSegment } from "../src/operations/OffsetCurveEvaluator.js";

describe("Debug: offset arc directly", () => {
    it("should offset CCW arc r=2 by distance 1", () => {
        const segment = {
            type: "arc",
            start: { x: 2, y: 10 },
            end: { x: 0, y: 8 },
            arc: {
                centerX: 2,
                centerY: 8,
                radius: 2,
                startAngle: 90,  // degrees!
                endAngle: 180,   // degrees!
                sweepFlag: 1,
            },
        };

        const result = offsetSegment(segment, 1);

        console.log("=== DIRECT OFFSET DEBUG ===");
        console.log("Input segment:", JSON.stringify(segment, null, 2));
        console.log("Offset distance: 1");
        console.log("Result:", JSON.stringify(result, null, 2));

        expect(result).not.toBeNull();
        expect(result.type).toBe("arc");
        console.log("Result radius:", result.arc.radius);
        console.log("Result startAngle:", result.arc.startAngle, "rad =", result.arc.startAngle * 180 / Math.PI, "deg");
        console.log("Result endAngle:", result.arc.endAngle, "rad =", result.arc.endAngle * 180 / Math.PI, "deg");
        console.log("Result start:", result.start);
        console.log("Result end:", result.end);

        // Arc is at a concave inner corner: sweepFlag=1 (CCW) with positive distance shrinks radius
        // newRadius = r + d * (sweepFlag===1 ? -1 : 1) = 2 + 1*(-1) = 1
        expect(result.arc.radius).toBeCloseTo(1, 4);
    });
});

// ---------------------------------------------------------------------------
// Regression: isDegrees() heuristic fails for DXF-format angles in [0°, ~6.3°)
// ---------------------------------------------------------------------------
describe("offsetArc - DXF small-angle regression (largeArcFlag=0)", () => {
    // Arc with centerX/Y (DXF exporter format) and startAngle = 3° which falls
    // below the 2π+0.01 ≈ 6.29 threshold of the old isDegrees() check.
    // Without the hasDXFAngles fix, 3° was treated as 3 radians (≈172°) and
    // produced wildly wrong start/end points, causing downstream degeneration.
    const arc3deg = {
        centerX: 0,
        centerY: 0,
        radius: 10,
        startAngle: 3,   // degrees (small — below old isDegrees threshold)
        endAngle: 90,    // degrees
        sweepFlag: 1,    // CCW
    };
    const segment3deg = {
        type: "arc",
        start: { x: 10 * Math.cos(3 * Math.PI / 180), y: 10 * Math.sin(3 * Math.PI / 180) },
        end: { x: 0, y: 10 },
        arc: arc3deg,
    };

    it("correctly offsets DXF arc with startAngle=3° (small angle, CCW inward)", () => {
        const result = offsetSegment(segment3deg, 2); // inward (sweepFlag=1): r → 8

        expect(result).not.toBeNull();
        expect(result.arc.radius).toBeCloseTo(8, 4);
        // Start point must sit on the offset circle at the correct 3° angle
        expect(result.start.x).toBeCloseTo(8 * Math.cos(3 * Math.PI / 180), 3);
        expect(result.start.y).toBeCloseTo(8 * Math.sin(3 * Math.PI / 180), 3);
        // End point at 90°
        expect(result.end.x).toBeCloseTo(0, 3);
        expect(result.end.y).toBeCloseTo(8, 3);
    });

    it("anglesInDegrees=false prevents double-conversion on second pass", () => {
        const first = offsetSegment(segment3deg, 1); // r → 9
        expect(first).not.toBeNull();
        // anglesInDegrees was set false on first pass output
        expect(first.arc.anglesInDegrees).toBe(false);

        // Second offset on the output arc — angles are now in radians already
        const second = offsetSegment(first, 1); // r → 8
        expect(second).not.toBeNull();
        expect(second.arc.radius).toBeCloseTo(8, 4);
        // If double-conversion occurred, start.x would be wildly wrong
        expect(second.start.x).toBeCloseTo(8 * Math.cos(3 * Math.PI / 180), 3);
        expect(second.start.y).toBeCloseTo(8 * Math.sin(3 * Math.PI / 180), 3);
    });
});
