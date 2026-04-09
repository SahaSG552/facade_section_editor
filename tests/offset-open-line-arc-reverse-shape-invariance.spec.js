import { describe, it, expect } from "vitest";
import { offsetSegment } from "../src/operations/OffsetCurveEvaluator.js";

/**
 * Shape invariance for arc offset: the SAME physical arc, traversed in both directions,
 * must produce the SAME offset radius when the signed distance is chosen to represent
 * the same physical offset direction.
 *
 * Forward arc:  sweepFlag=1, distance=-d  → newRadius = r + (-d)*(−1) = r + d
 * Reversed arc: sweepFlag=0, distance=+d  → newRadius = r + (+d)*(+1) = r + d
 *
 * Both yield the same newRadius, confirming consistency of the low-level arc formula
 * with the rotate90CCW normal convention used for line offsets.
 *
 * Note: this test intentionally targets `offsetSegment` (curve evaluator level),
 * not `OffsetEngine`, because engine-level sign remapping depends on mode/options
 * (legacy open one-sided vs cursor-side resolution).
 */
describe("Arc offset radius shape invariance", () => {
    const center = { x: 2, y: 8 };
    const R = 2;

    // Forward arc: from (2,10) to (0,8), sweepFlag=1 (CW in screen)
    const forwardArcSeg = {
        type: "arc",
        start: { x: 2, y: 10 },
        end: { x: 0, y: 8 },
        arc: {
            centerX: center.x,
            centerY: center.y,
            radius: R,
            startAngle: 90,   // degrees, converted to radians by isDegrees check
            endAngle: 180,
            sweepFlag: 1,
        },
    };

    // Reversed arc: from (0,8) to (2,10), sweepFlag=0 (CCW in screen)
    const reversedArcSeg = {
        type: "arc",
        start: { x: 0, y: 8 },
        end: { x: 2, y: 10 },
        arc: {
            centerX: center.x,
            centerY: center.y,
            radius: R,
            startAngle: 180,  // degrees
            endAngle: 90,     // degrees
            sweepFlag: 0,
        },
    };

    it("forward arc (sweep=1) with distance=-1 should not collapse", () => {
        const result = offsetSegment(forwardArcSeg, -1);
        expect(result).not.toBeNull();
        expect(result.type).toBe("arc");
        expect(result.arc.radius).toBeCloseTo(R + 1, 4);
    });

    it("reversed arc (sweep=0) with distance=+1 should not collapse", () => {
        const result = offsetSegment(reversedArcSeg, 1);
        expect(result).not.toBeNull();
        expect(result.type).toBe("arc");
        expect(result.arc.radius).toBeCloseTo(R + 1, 4);
    });

    it("forward(-1) and reversed(+1) produce the same offset radius", () => {
        const fResult = offsetSegment(forwardArcSeg, -1);
        const rResult = offsetSegment(reversedArcSeg, 1);

        expect(fResult).not.toBeNull();
        expect(rResult).not.toBeNull();
        expect(fResult.arc.radius).toBeCloseTo(rResult.arc.radius, 6);
    });

    it("forward(+1) and reversed(-1) also match (opposite physical direction)", () => {
        const fResult = offsetSegment(forwardArcSeg, 1);
        const rResult = offsetSegment(reversedArcSeg, -1);

        expect(fResult).not.toBeNull();
        expect(rResult).not.toBeNull();
        expect(fResult.arc.radius).toBeCloseTo(rResult.arc.radius, 6);
    });

    it("forward arc: positive distance shrinks radius (inward for sweep=1)", () => {
        const result = offsetSegment(forwardArcSeg, 1);
        expect(result).not.toBeNull();
        expect(result.arc.radius).toBeCloseTo(R - 1, 4); // shrinks: 2-1=1
    });

    it("reversed arc: negative distance shrinks radius (inward for sweep=0)", () => {
        const result = offsetSegment(reversedArcSeg, -1);
        expect(result).not.toBeNull();
        expect(result.arc.radius).toBeCloseTo(R - 1, 4); // shrinks: 2-1=1
    });
});
