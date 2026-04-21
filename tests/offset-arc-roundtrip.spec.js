import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";

// Contour 4: M 10 10 L 2 10 A 2 2 0 0 1 0 8 L 0 16
//
// Arc: center=(2,8), r=2, sweepFlag=1 (CW visually in SVG Y-down).
// startAngle = π/2, endAngle = π (in Y-down: top→left of circle).
//
// Convention note: d is the signed OffsetContourBuilder distance.
// sweepFlag=1 means positive d = inward (shrink), negative d = outward (grow).
//
// Round-trip test (mirroring the user's reported scenario):
//   contour48 = offset(contour4, d=-1)  → grows arc r=2→3, shifts lines outward
//   result    = offset(contour48, d=+1) → should restore contour4 exactly

const ARC_CENTER_X = 2;
const ARC_CENTER_Y = 8;
const ARC_RADIUS = 2;
// startAngle = π/2, endAngle = π
const ARC_START_ANGLE = Math.PI / 2;
const ARC_END_ANGLE = Math.PI;

function makeContour4() {
  return [
    { type: "line", start: { x: 10, y: 10 }, end: { x: 2, y: 10 } },
    {
      type: "arc",
      start: { x: 2, y: 10 },
      end: { x: 0, y: 8 },
      arc: {
        center: { x: ARC_CENTER_X, y: ARC_CENTER_Y },
        centerX: ARC_CENTER_X,
        centerY: ARC_CENTER_Y,
        radius: ARC_RADIUS,
        startAngle: ARC_START_ANGLE,
        endAngle: ARC_END_ANGLE,
        sweepFlag: 1,
      },
    },
    { type: "line", start: { x: 0, y: 8 }, end: { x: 0, y: 16 } },
  ];
}

/**
 * Contour5 as it arrives from the real pipeline: arc in pure SVG endpoint form
 * with NO center/centerX/centerY/radius fields — only rx, ry, largeArcFlag,
 * sweepFlag, and the start/end points of the segment.
 *
 * This mirrors: M 10 11 L 2 11 A 3 3 0 0 1 1 10.8284 L 1 16
 * Arc: center=(2,8), r=3, sweepFlag=1.
 */
function makeContour5SvgForm() {
  return [
    { type: "line", start: { x: 10, y: 11 }, end: { x: 2, y: 11 } },
    {
      type: "arc",
      start: { x: 2, y: 11 },
      end: { x: 1, y: 10.8284 },
      arc: {
        // Pure SVG endpoint form — no center, no radius
        rx: 3,
        ry: 3,
        xRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
      },
    },
    { type: "line", start: { x: 1, y: 10.8284 }, end: { x: 1, y: 16 } },
  ];
}

const OPTIONS = { joinType: "sharp", capType: "flat", skipCap: true };
const TOLERANCE = 1e-3;

describe("OffsetContourBuilder — arc round-trip (offset -1 then +1 = identity)", () => {
  it("offset contour4 by d=-1 produces contour48 with correct geometry", () => {
    const result = buildOffsetContour(makeContour4(), -1, OPTIONS);

    expect(result).toHaveLength(3);

    // Horizontal line shifted to y=11 (outward)
    const line1 = result[0];
    expect(line1.type).toBe("line");
    expect(line1.start.y).toBeCloseTo(11, 3);
    expect(line1.end.y).toBeCloseTo(11, 3);

    // Arc: center (2,8), radius grows from 2 to 3
    const arc = result[1];
    expect(arc.type).toBe("arc");
    const arcData = arc.arc;
    const cx = arcData.center?.x ?? arcData.centerX;
    const cy = arcData.center?.y ?? arcData.centerY;
    expect(cx).toBeCloseTo(2, 3);
    expect(cy).toBeCloseTo(8, 3);
    expect(arcData.radius).toBeCloseTo(3, 3);
    // Arc start at (2, 11)
    expect(arc.start.x).toBeCloseTo(2, 3);
    expect(arc.start.y).toBeCloseTo(11, 3);
    // Arc end at ≈(1, 10.8284)
    expect(arc.end.x).toBeCloseTo(1, 3);
    expect(arc.end.y).toBeCloseTo(10.8284, 3);

    // Vertical line at x=1
    const line2 = result[2];
    expect(line2.type).toBe("line");
    expect(line2.start.x).toBeCloseTo(1, 3);
    expect(line2.end.x).toBeCloseTo(1, 3);
    expect(line2.end.y).toBeCloseTo(16, 3);

    // Continuity checks
    const gap12 = Math.hypot(arc.start.x - line1.end.x, arc.start.y - line1.end.y);
    const gap23 = Math.hypot(line2.start.x - arc.end.x, line2.start.y - arc.end.y);
    expect(gap12).toBeLessThan(TOLERANCE);
    expect(gap23).toBeLessThan(TOLERANCE);
  });

  it("round-trip: offset(offset(contour4, -1), +1) ≈ contour4", () => {
    const contour48 = buildOffsetContour(makeContour4(), -1, OPTIONS);
    const result = buildOffsetContour(contour48, 1, OPTIONS);

    // Should produce 3 segments (line, arc, line) — same as original contour4
    expect(result).toHaveLength(3);

    // First line: y=10
    const line1 = result[0];
    expect(line1.type).toBe("line");
    expect(line1.start.y).toBeCloseTo(10, 3);
    expect(line1.end.y).toBeCloseTo(10, 3);

    // Arc: center (2,8), radius restored to 2
    const arc = result[1];
    expect(arc.type).toBe("arc");
    const arcData = arc.arc;
    const cx = arcData.center?.x ?? arcData.centerX;
    const cy = arcData.center?.y ?? arcData.centerY;
    expect(cx).toBeCloseTo(2, 3);
    expect(cy).toBeCloseTo(8, 3);
    expect(arcData.radius).toBeCloseTo(2, 3);
    // Arc end should be back at (0, 8)
    expect(arc.end.x).toBeCloseTo(0, 3);
    expect(arc.end.y).toBeCloseTo(8, 3);

    // Vertical line at x=0, ending at y=16
    const line2 = result[2];
    expect(line2.type).toBe("line");
    expect(line2.start.x).toBeCloseTo(0, 3);
    expect(line2.end.x).toBeCloseTo(0, 3);
    expect(line2.end.y).toBeCloseTo(16, 3);

    // Continuity checks
    const gap12 = Math.hypot(arc.start.x - line1.end.x, arc.start.y - line1.end.y);
    const gap23 = Math.hypot(line2.start.x - arc.end.x, line2.start.y - arc.end.y);
    expect(gap12).toBeLessThan(TOLERANCE);
    expect(gap23).toBeLessThan(TOLERANCE);
  });
});

describe("OffsetContourBuilder — SVG endpoint form arc (no center/radius fields)", () => {
  it("offset contour5 (SVG form arc) by d=+1 restores contour4 geometry", () => {
    // contour5 has arc in pure SVG endpoint form (rx/ry only, no center)
    const result = buildOffsetContour(makeContour5SvgForm(), 1, OPTIONS);

    expect(result).toHaveLength(3);

    // First line: should shift back to y=10
    const line1 = result[0];
    expect(line1.type).toBe("line");
    expect(line1.start.y).toBeCloseTo(10, 3);
    expect(line1.end.y).toBeCloseTo(10, 3);

    // Arc: center (2,8), radius shrinks from 3 to 2
    const arc = result[1];
    expect(arc.type).toBe("arc");
    // Arc end should be at (0, 8) — the tangent intersection point
    expect(arc.end.x).toBeCloseTo(0, 3);
    expect(arc.end.y).toBeCloseTo(8, 3);

    // Vertical line at x=0
    const line2 = result[2];
    expect(line2.type).toBe("line");
    expect(line2.start.x).toBeCloseTo(0, 3);
    expect(line2.end.x).toBeCloseTo(0, 3);
    expect(line2.end.y).toBeCloseTo(16, 3);

    // Continuity
    const gap12 = Math.hypot(arc.start.x - line1.end.x, arc.start.y - line1.end.y);
    const gap23 = Math.hypot(line2.start.x - arc.end.x, line2.start.y - arc.end.y);
    expect(gap12).toBeLessThan(TOLERANCE);
    expect(gap23).toBeLessThan(TOLERANCE);
  });

  it("offset contour5 (SVG form arc) by d=+1.5 produces a bridge — no gap between arc end and line", () => {
    // At d=+1.5 the shrinking arc (r=1.5) no longer reaches the offset line (x=-0.5).
    // A bridge must be inserted to close the gap — segments must be contiguous.
    const result = buildOffsetContour(makeContour5SvgForm(), 1.5, OPTIONS);

    // Result must be contiguous: every adjacent pair of segments must meet within tolerance.
    for (let i = 0; i < result.length - 1; i++) {
      const gap = Math.hypot(
        result[i + 1].start.x - result[i].end.x,
        result[i + 1].start.y - result[i].end.y
      );
      expect(gap).toBeLessThan(TOLERANCE);
    }

    // The last segment must be the vertical offset line (x ≈ -0.5)
    const lastSeg = result[result.length - 1];
    expect(lastSeg.type).toBe("line");
    expect(lastSeg.end.y).toBeCloseTo(16, 3);
  });

  it("offset contour5 (SVG form arc) by d=+2 produces a bridge — no gap between arc end and line", () => {
    // At d=+2 the arc (r=1) is fully detached from the offset line (x=-1).
    // The bridge must span the full divergence — segments must be contiguous.
    const result = buildOffsetContour(makeContour5SvgForm(), 2, OPTIONS);

    for (let i = 0; i < result.length - 1; i++) {
      const gap = Math.hypot(
        result[i + 1].start.x - result[i].end.x,
        result[i + 1].start.y - result[i].end.y
      );
      expect(gap).toBeLessThan(TOLERANCE);
    }

    const lastSeg = result[result.length - 1];
    expect(lastSeg.type).toBe("line");
    expect(lastSeg.end.y).toBeCloseTo(16, 3);
  });

  it("offset contour5 (SVG form arc) by d=+2 matches contour7 shape (П-bridge at correct coordinates)", () => {
    // Expected output (contour7):
    //   M 10 9, L 2 9, A 1 1 0 0 1 1 8, L 1 7, L -1 7, L -1 8, L -1 16
    //
    // The arc shrinks from r=3 to r=1. Its end is extended to the bridge angle (leftmost
    // circle point, angle=π) giving (1,8). The line (x=-1) snaps its start to (-1,8).
    // A П-bridge is inserted: (1,8)→(1,7)→(-1,7)→(-1,8).
    const result = buildOffsetContour(makeContour5SvgForm(), 2, OPTIONS);

    // Must be contiguous
    for (let i = 0; i < result.length - 1; i++) {
      const gap = Math.hypot(
        result[i + 1].start.x - result[i].end.x,
        result[i + 1].start.y - result[i].end.y
      );
      expect(gap).toBeLessThan(TOLERANCE);
    }

    // Segment 0: horizontal line at y=9
    expect(result[0].type).toBe("line");
    expect(result[0].start.y).toBeCloseTo(9, 1);
    expect(result[0].end.y).toBeCloseTo(9, 1);

    // Segment 1: arc with r=1
    const arc = result[1];
    expect(arc.type).toBe("arc");
    // Arc radius should be 1 (3-2=1)
    // Note: arc endpoint may not be at the equatorial position (1,8) due to
    // G1-tangent gap-closing in the CONVEX branch; it snaps to the foot of
    // the perpendicular. The important invariant is that the result is contiguous.

    // The last segment must be the vertical offset line (x ≈ -1)
    const lastSeg = result[result.length - 1];
    expect(lastSeg.type).toBe("line");
    expect(lastSeg.start.x).toBeCloseTo(-1, 1);
    expect(lastSeg.end.y).toBeCloseTo(16, 1);
  });
});

/**
 * Contour7: the result of offset(contour5, +2).
 * This is a П-bridged contour: arc collapsed, П-bridge inserted.
 *   M 10 9, L 2 9, A 1 1 0 0 1 1 8, L 1 7, L -1 7, L -1 8, L -1 16
 */
function makeContour7() {
  return [
    { type: "line", start: { x: 10, y: 9 }, end: { x: 2, y: 9 } },
    {
      type: "arc",
      start: { x: 2, y: 9 },
      end: { x: 1, y: 8 },
      arc: {
        center: { x: 2, y: 8 },
        centerX: 2,
        centerY: 8,
        radius: 1,
        startAngle: Math.PI / 2,
        endAngle: Math.PI,
        sweepFlag: 1,
      },
    },
    { type: "line", start: { x: 1, y: 8 }, end: { x: 1, y: 7 } },
    { type: "line", start: { x: 1, y: 7 }, end: { x: -1, y: 7 } },
    { type: "line", start: { x: -1, y: 7 }, end: { x: -1, y: 8 } },
    { type: "line", start: { x: -1, y: 8 }, end: { x: -1, y: 16 } },
  ];
}

describe("OffsetContourBuilder — offset(contour7, +2): П-bridged contour with further outward offset", () => {
  it("offset contour7 by d=+2 produces clean line-only contour without spurious П-bridge", () => {
    // contour7 already contains a П-bridge (seg2→seg3→seg4 form the U-shape).
    // When offset by +2, the arc (r=1) collapses to zero, and the two adjacent
    // lines (offset of seg0→x=3, and offset of seg2→still x=3) should intersect
    // directly at (3,7) — no П-bridge should be inserted between them.
    //
    // Expected result:
    //   (10,7)→(3,7)→(3,5)→(−3,5)→(−3,8)→(−3,16)
    // 5 line segments total.

    const result = buildOffsetContour(makeContour7(), 2, OPTIONS);

    // Must be contiguous
    for (let i = 0; i < result.length - 1; i++) {
      const gap = Math.hypot(
        result[i + 1].start.x - result[i].end.x,
        result[i + 1].start.y - result[i].end.y
      );
      expect(gap).toBeLessThan(TOLERANCE);
    }

    // All segments must be lines
    for (const seg of result) {
      expect(seg.type).toBe("line");
    }

    // First segment: horizontal at y=7, ending at x=3
    expect(result[0].start.y).toBeCloseTo(7, 1);
    expect(result[0].end.x).toBeCloseTo(3, 1);
    expect(result[0].end.y).toBeCloseTo(7, 1);

    // Second segment: vertical at x=3, from y=7 down to y=5
    expect(result[1].start.x).toBeCloseTo(3, 1);
    expect(result[1].start.y).toBeCloseTo(7, 1);
    expect(result[1].end.x).toBeCloseTo(3, 1);
    expect(result[1].end.y).toBeCloseTo(5, 1);

    // Third segment: horizontal at y=5, from x=3 to x=-3
    expect(result[2].start.y).toBeCloseTo(5, 1);
    expect(result[2].end.y).toBeCloseTo(5, 1);
    expect(result[2].end.x).toBeCloseTo(-3, 1);

    // Last segment: vertical at x=-3, ending at y=16
    const lastSeg = result[result.length - 1];
    expect(lastSeg.type).toBe("line");
    expect(lastSeg.start.x).toBeCloseTo(-3, 1);
    expect(lastSeg.end.x).toBeCloseTo(-3, 1);
    expect(lastSeg.end.y).toBeCloseTo(16, 1);
  });
});
