import { describe, expect, it, vi } from "vitest";
import { computePrimitiveOffsets } from "../../src/operations/offset/OffsetPrimitiveKernel.js";

describe("OffsetPrimitiveKernel", () => {
    it("dispatches by segment type and keeps only non-null results", () => {
        const lineOffset = vi.fn((segment) => ({ type: "line", source: segment.id }));
        const bezierOffset = vi.fn((segment) => ({ type: "bezier", source: segment.id }));
        const arcOffset = vi.fn((segment) => (segment.id === "a2" ? null : { type: "arc", source: segment.id }));

        const segments = [
            { id: "l1", type: "line" },
            { id: "b1", type: "bezier" },
            { id: "a1", type: "arc" },
            { id: "a2", type: "arc" },
            { id: "u1", type: "unknown" },
        ];

        const out = computePrimitiveOffsets(segments, 5, {
            offsetLineSegment: lineOffset,
            offsetBezierSegment: bezierOffset,
            offsetArcSegment: arcOffset,
        });

        expect(lineOffset).toHaveBeenCalledTimes(1);
        expect(bezierOffset).toHaveBeenCalledTimes(1);
        expect(arcOffset).toHaveBeenCalledTimes(2);

        expect(out).toEqual([
            { type: "line", source: "l1" },
            { type: "bezier", source: "b1" },
            { type: "arc", source: "a1" },
        ]);
    });
});
