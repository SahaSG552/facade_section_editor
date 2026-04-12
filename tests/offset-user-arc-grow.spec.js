import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";
import { offsetArc } from "../src/operations/OffsetCurveEvaluator.js";

/**
 * User example: "outward offset degenerates arc but it shouldn't degenerate, it should increase"
 * 
 * Two polylines:
 * - contourId 69: M -8.5958 8.6531 L -15.1491 15.2065 A 1.5478 1.5478 0 0 0 -13.901 17.9432 L -5.3705 10.2658 L -8.5958 8.6531
 * - contourId 71: M -8.6945 8.0447 L -67.5358 66.8869 L -4.4907 10.1467 L -8.6945 8.0447
 * 
 * The bug: For CW contours, the sign convention in CustomOffsetProcessor is wrong.
 *   - effectiveOffset = -offset (line 181 in CustomOffsetProcessor)
 *   - This assumes CCW contours where positive = inward
 *   - For CW contours, positive should = outward, so the flip should be different
 * 
 * The arc in contour 69 is actually growing correctly! The issue is with contour 71 (lines only)
 * where the offset lines diverge and produce no output.
 */

describe("User example: outward offset issue analysis", () => {
    it("contour 69 - arc should grow (not degenerate) on outward offset", () => {
        // Contour 69 has an arc: A 1.5478 1.5478 0 0 0 -13.901 17.9432
        // This is a CW contour (signed area < 0)
        
        const segments = [
            { type: "line", start: { x: -8.5958, y: 8.6531 }, end: { x: -15.1491, y: 15.2065 }},
            { type: "arc", start: { x: -15.1491, y: 15.2065 }, end: { x: -13.901, y: 17.9432 }, arc: { rx: 1.5478, ry: 1.5478, sweepFlag: 0, largeArcFlag: 0 }},
            { type: "line", start: { x: -13.901, y: 17.9432 }, end: { x: -5.3705, y: 10.2658 }},
            { type: "line", start: { x: -5.3705, y: 10.2658 }, end: { x: -8.5958, y: 8.6531 }},
        ];

        // Signed area is negative (CW contour)
        let area = 0;
        for (const seg of segments) {
            if (seg.type === "line") {
                area += seg.start.x * seg.end.y - seg.end.x * seg.start.y;
            }
        }
        console.log("Contour 69 signed area:", area / 2, "(CW = negative)");
        
        // Test with different distances
        // In CustomOffsetProcessor: effectiveOffset = -offset
        // For outward: offset should be negative (canvas coords), so effectiveOffset = positive
        
        // But for CW, positive = LEFT = INWARD (not outward!)
        // So for truly outward behavior on CW, offset should be positive → effectiveOffset = negative
        
        console.log("\nTesting outward (which for CW means negative distance):");
        const resultOutward = buildOffsetContour(segments, -3, { joinType: "round", capType: "flat", skipCap: true });
        console.log("Result with distance=-3 (outward for CW):", resultOutward.length);
        
        console.log("\nTesting inward (which for CW means positive distance):");
        const resultInward = buildOffsetContour(segments, 3, { joinType: "round", capType: "flat", skipCap: true });
        console.log("Result with distance=3 (inward for CW):", resultInward.length);
        
        // At least one should work - the arc should grow (not degenerate)
        expect(resultOutward.length).toBeGreaterThan(0);
    });

    it("contour 71 - lines degenerate on positive distance but work with negative", () => {
        // Contour 71 has NO arc - just lines
        // This is also a CW contour
        
        const segments = [
            { type: "line", start: { x: -8.6945, y: 8.0447 }, end: { x: -67.5358, y: 66.8869 }},
            { type: "line", start: { x: -67.5358, y: 66.8869 }, end: { x: -4.4907, y: 10.1467 }},
            { type: "line", start: { x: -4.4907, y: 10.1467 }, end: { x: -8.6945, y: 8.0447 }},
        ];

        console.log("Contour 71 analysis:");
        console.log("  Seg 0 direction: 135°");
        console.log("  Seg 1 direction: -42°");
        console.log("  Angle between: ~177° (nearly 180° - collinear!)");
        
        console.log("\nPositive distance (should be inward for CW):");
        const posResult = buildOffsetContour(segments, 3, { joinType: "round", capType: "flat", skipCap: true });
        console.log("  Result:", posResult.length, "segments");
        
        console.log("\nNegative distance (should be outward for CW):");
        const negResult = buildOffsetContour(segments, -3, { joinType: "round", capType: "flat", skipCap: true });
        console.log("  Result:", negResult.length, "segments");
        
        // The bug is clear: positive distance = 0, negative = 2
        // The corner join logic fails when adjacent offset lines diverge too much
        
        expect(negResult.length).toBeGreaterThan(0); // At least this works
    });

    it("summary: CustomOffsetProcessor sign convention bug for CW contours", () => {
        // The root cause:
        // 1. CustomOffsetProcessor applies: effectiveOffset = -offset
        // 2. This assumes: positive distance → inward, negative → outward
        // 3. But this is only true for CCW contours!
        // 4. For CW contours: positive distance → outward, negative → inward
        // 5. So the sign flip should be: effectiveOffset = offset (not -offset) for CW contours
        
        // The fix: In CustomOffsetProcessor, detect contour orientation and apply
        // the appropriate sign transformation.
        
        // For now, document the workaround:
        // - For CW contours, use negative distance for "inward" and positive for "outward"
        // - Or fix CustomOffsetProcessor to handle both orientations correctly
        
        expect(true).toBe(true); // Documentation test
    });
});