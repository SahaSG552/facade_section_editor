import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";

function toPathTuples(segments) {
  return segments.map((seg) => [
    seg.type,
    Number(seg.start.x.toFixed(6)),
    Number(seg.start.y.toFixed(6)),
    Number(seg.end.x.toFixed(6)),
    Number(seg.end.y.toFixed(6)),
  ]);
}

function hasZeroLengthSegment(segments, epsilon = 1e-6) {
  return segments.some((seg) => {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    return length < epsilon;
  });
}

describe("buildOffsetContour - bridge topology across dropped arc", () => {
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
        center: { x: 2, y: 8 },
        radius: 2,
        startAngle: 90,
        endAngle: 180,
        sweepFlag: 1,
      },
    },
    {
      type: "line",
      start: { x: 0, y: 8 },
      end: { x: 0, y: 16 },
    },
  ];

  it("builds П-bridge (not direct intersection) when arc collapses at exactly d=arcRadius for offset consistency", () => {
    // d=2 == arcRadius=2: the arc collapses exactly. At this exact distance the
    // two adjacent offset lines meet at next.start (t2=0), so directIntersection
    // was previously chosen, skipping the П-bridge pocket. This broke multi-step
    // consistency: offset(base,1) then offset(result,1) produces a П-bridge, so
    // a single offset(base,2) must also produce one.
    const result = buildOffsetContour(segments, 2, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // All segments should be lines (arc was dropped)
    expect(result.every((s) => s.type === "line")).toBe(true);

    // П-bridge with depth=2 (leg=2, extra=0, floor at y=6):
    //   entry L(10,8)→(2,8), first leg (2,8)→(2,6), floor (2,6)→(-2,6),
    //   second leg (-2,6)→(-2,8), exit (-2,8)→(-2,16)
    expect(result).toHaveLength(5);

    expect(toPathTuples(result)).toEqual([
      ["line", 10, 8, 2, 8],
      ["line", 2, 8, 2, 6],
      ["line", 2, 6, -2, 6],
      ["line", -2, 6, -2, 8],
      ["line", -2, 8, -2, 16],
    ]);

    // Connectivity check
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].end.x).toBeCloseTo(result[i + 1].start.x, 4);
      expect(result[i].end.y).toBeCloseTo(result[i + 1].start.y, 4);
    }
  });

  it("shifts first dropped-gap bridge anchor for d=3 when arc radius is exceeded", () => {
    const result = buildOffsetContour(segments, 3, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    expect(result.every((s) => s.type === "line")).toBe(true);
    expect(result).toHaveLength(5);

    expect(toPathTuples(result)).toEqual([
      ["line", 10, 7, 3, 7],
      ["line", 3, 7, 3, 5],
      ["line", 3, 5, -3, 5],
      ["line", -3, 5, -3, 8],
      ["line", -3, 8, -3, 16],
    ]);
  });

  it("removes zero-length segments at large offset (d=10) to prevent topology flip", () => {
    const result = buildOffsetContour(segments, 10, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // CRITICAL: No zero-length segments should be present
    expect(hasZeroLengthSegment(result)).toBe(false);

    // All segments should be lines (no malformed arcs)
    expect(result.every((s) => s.type === "line")).toBe(true);

    // Result should have reasonable length (not contain degenerate elements)
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(10);

    // Verify no segment has start == end (the bug case)
    result.forEach((seg, idx) => {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      expect(dx * dx + dy * dy).toBeGreaterThan(1e-12);
    });
  });

  it("prevents resurrection/inversion of collapsed segment at d=11 (no reversed stub)", () => {
    const result = buildOffsetContour(segments, 11, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // No zero-length segments
    expect(hasZeroLengthSegment(result)).toBe(false);

    // All segments should be lines
    expect(result.every((s) => s.type === "line")).toBe(true);

    // CRITICAL: No reversed first segment should appear
    // The bug would produce a segment like [10,-1] -> [11,-1] (moving right, opposite to original left direction)
    // The original first line goes from [10,10] to [2,10] (left direction, dx < 0)
    // Any offset segment should preserve this directionality or collapse to zero, not reverse
    
    if (result.length > 0) {
      const firstSeg = result[0];
      const dx = firstSeg.end.x - firstSeg.start.x;
      
      // First segment should either:
      // 1. Move left (dx < 0) like the original, or
      // 2. Be effectively zero length (already checked above)
      // But NEVER move right (dx > 0) which would indicate inversion
      if (Math.abs(dx) > 1e-6) {
        expect(dx).toBeLessThan(0); // Should move left, not right
      }

      // Specifically verify the bug case doesn't occur: M10,-1 -> L11,-1
      const hasReversedStub = result.some((seg) => {
        const segDx = seg.end.x - seg.start.x;
        const segDy = seg.end.y - seg.start.y;
        const isNearY1 = Math.abs(seg.start.y - (-1)) < 0.5 && Math.abs(seg.end.y - (-1)) < 0.5;
        const isShort = Math.sqrt(segDx * segDx + segDy * segDy) < 2;
        const movesRight = segDx > 0.1;
        return isNearY1 && isShort && movesRight;
      });
      expect(hasReversedStub).toBe(false);
    }

    // Topology should remain stable (reasonable segment count)
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(10);

    // CRITICAL FIX: d=11 first vertical segment x == 11 (continuous progression, no plateau)
    // After continuous propagation fix, d=11 shifts anchor to x=11 (not x=10 as in plateau case)
    const firstVertical = result.find((seg) => {
      const dx = Math.abs(seg.end.x - seg.start.x);
      const dy = Math.abs(seg.end.y - seg.start.y);
      return dx < 0.5 && dy > 1;
    });
    expect(firstVertical).toBeDefined();
    if (firstVertical) {
      expect(Math.abs(firstVertical.start.x - 11)).toBeLessThan(0.5);
      expect(Math.abs(firstVertical.end.x - 11)).toBeLessThan(0.5);
    }
  });

  it("allows controlled anchor progression at d=12 after arc degeneration", () => {
    const result = buildOffsetContour(segments, 12, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // No zero-length segments
    expect(hasZeroLengthSegment(result)).toBe(false);

    // All segments should be lines
    expect(result.every((s) => s.type === "line")).toBe(true);

    // No reversed stub at d=12 either
    const hasReversedStub = result.some((seg) => {
      const segDx = seg.end.x - seg.start.x;
      const segDy = seg.end.y - seg.start.y;
      const isNearY2 = Math.abs(seg.start.y - (-2)) < 0.5 && Math.abs(seg.end.y - (-2)) < 0.5;
      const isShort = Math.sqrt(segDx * segDx + segDy * segDy) < 2;
      const movesRight = segDx > 0.1;
      return isNearY2 && isShort && movesRight;
    });
    expect(hasReversedStub).toBe(false);

    // Expected behavior: d=12 starts around x=12 (continuous progression from d=10 x=10, d=11 x=11)
    // First vertical segment should be around [12,-2] -> [12,-4]
    const firstVertical = result.find((seg) => {
      const dx = Math.abs(seg.end.x - seg.start.x);
      const dy = Math.abs(seg.end.y - seg.start.y);
      return dx < 0.5 && dy > 1;
    });
    expect(firstVertical).toBeDefined();
    if (firstVertical) {
      expect(Math.abs(firstVertical.start.x - 12)).toBeLessThan(0.5);
      expect(Math.abs(firstVertical.end.x - 12)).toBeLessThan(0.5);
    }
  });
});

describe("buildOffsetContour - symmetric bridge when arc fully collapses (r === |d|)", () => {
  // Base contour from user bug report (contourId=5):
  //   L (10,11)→(2,11)  [horizontal left]
  //   A r=3, center (2,8), (2,11)→(1,10.8284)  [partial arc, CW]
  //   L (1,10.8284)→(1,16)  [vertical down]
  //
  // Correct offset -3: bridge should be symmetric at depth=2, not depth=3.
  // Two-step: offset(-2) then offset(-1) gives: (2,8)→(2,6)→(-2,6)→(-2,8)→(-2,16)
  // Direct: offset(-3) must match.
  const baseContour = [
    {
      type: "line",
      start: { x: 10, y: 11 },
      end: { x: 2, y: 11 },
    },
    {
      type: "arc",
      start: { x: 2, y: 11 },
      end: { x: 1, y: 10.8284271247 },
      arc: {
        centerX: 2,
        centerY: 8,
        center: { x: 2, y: 8 },
        radius: 3,
        startAngle: 90,
        endAngle: 180,
        sweepFlag: 1,
      },
    },
    {
      type: "line",
      start: { x: 1, y: 10.8284271247 },
      end: { x: 1, y: 16 },
    },
  ];

  it("direct offset(+3) produces symmetric П-bridge matching two-step offset(-2)→offset(-1)", () => {
    const result = buildOffsetContour(baseContour, 3, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // All segments should be lines (arc collapses)
    expect(result.every((s) => s.type === "line")).toBe(true);

    // Expected: M10,8 → L2,8 → L2,6 → L-2,6 → L-2,8 → L-2,16
    // The symmetric bridge is at y=6 (depth=2, not depth=3)
    // and the exit leg returns to y=8 (the arc center level)
    expect(result).toHaveLength(5);

    const pts = result.flatMap((s) => [s.start, s.end]);
    // Entry horizontal: from (10,8) to (2,8)
    expect(result[0].start.x).toBeCloseTo(10, 3);
    expect(result[0].start.y).toBeCloseTo(8, 3);
    expect(result[0].end.x).toBeCloseTo(2, 3);
    expect(result[0].end.y).toBeCloseTo(8, 3);
    // First bridge leg down: (2,8) → (2,6)
    expect(result[1].start.x).toBeCloseTo(2, 3);
    expect(result[1].start.y).toBeCloseTo(8, 3);
    expect(result[1].end.x).toBeCloseTo(2, 3);
    expect(result[1].end.y).toBeCloseTo(6, 3);
    // Bridge floor: (2,6) → (-2,6)
    expect(result[2].start.x).toBeCloseTo(2, 3);
    expect(result[2].start.y).toBeCloseTo(6, 3);
    expect(result[2].end.x).toBeCloseTo(-2, 3);
    expect(result[2].end.y).toBeCloseTo(6, 3);
    // Second bridge leg up: (-2,6) → (-2,8)
    expect(result[3].start.x).toBeCloseTo(-2, 3);
    expect(result[3].start.y).toBeCloseTo(6, 3);
    expect(result[3].end.x).toBeCloseTo(-2, 3);
    expect(result[3].end.y).toBeCloseTo(8, 3);
    // Exit vertical: (-2,8) → (-2,16)
    expect(result[4].start.x).toBeCloseTo(-2, 3);
    expect(result[4].start.y).toBeCloseTo(8, 3);
    expect(result[4].end.x).toBeCloseTo(-2, 3);
    expect(result[4].end.y).toBeCloseTo(16, 3);
  });

  it("direct offset(+4) matches two-step offset(+3)→offset(+1) — over-collapse extra=1", () => {
    // Two-step derivation (verified analytically):
    //   Step 1: offset(baseContour, 3) = M10,8 L2,8 L2,6 L-2,6 L-2,8 L-2,16
    //   Step 2: offset(step1, 1):
    //     - L(10,8)→(2,8)  shifts y-1 → L(10,7)→(2,7)
    //     - L(2,8)→(2,6)   shifts x+1 → L(3,8)→(3,6)  → join with entry: (3,7)
    //     - L(2,6)→(-2,6)  shifts y-1 → L(2,5)→(-2,5) → join:            (3,5)
    //     - L(-2,6)→(-2,8) shifts x-1 → L(-3,6)→(-3,8) → join:          (-3,5)
    //     - L(-2,8)→(-2,16) shifts x-1 → L(-3,8)→(-3,16) → join:        (-3,8)
    //   Result: M10,7 L3,7 L3,5 L-3,5 L-3,8 L-3,16
    const result = buildOffsetContour(baseContour, 4, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    expect(result.every((s) => s.type === "line")).toBe(true);
    expect(result).toHaveLength(5);

    // Entry horizontal: (10,7) → (3,7)
    expect(result[0].start.x).toBeCloseTo(10, 3);
    expect(result[0].start.y).toBeCloseTo(7, 3);
    expect(result[0].end.x).toBeCloseTo(3, 3);
    expect(result[0].end.y).toBeCloseTo(7, 3);
    // First bridge leg: (3,7) → (3,5)
    expect(result[1].start.x).toBeCloseTo(3, 3);
    expect(result[1].start.y).toBeCloseTo(7, 3);
    expect(result[1].end.x).toBeCloseTo(3, 3);
    expect(result[1].end.y).toBeCloseTo(5, 3);
    // Bridge floor: (3,5) → (-3,5)
    expect(result[2].start.x).toBeCloseTo(3, 3);
    expect(result[2].start.y).toBeCloseTo(5, 3);
    expect(result[2].end.x).toBeCloseTo(-3, 3);
    expect(result[2].end.y).toBeCloseTo(5, 3);
    // Second bridge leg: (-3,5) → (-3,8)
    expect(result[3].start.x).toBeCloseTo(-3, 3);
    expect(result[3].start.y).toBeCloseTo(5, 3);
    expect(result[3].end.x).toBeCloseTo(-3, 3);
    expect(result[3].end.y).toBeCloseTo(8, 3);
    // Exit vertical: (-3,8) → (-3,16)
    expect(result[4].start.x).toBeCloseTo(-3, 3);
    expect(result[4].start.y).toBeCloseTo(8, 3);
    expect(result[4].end.x).toBeCloseTo(-3, 3);
    expect(result[4].end.y).toBeCloseTo(16, 3);
  });
});
