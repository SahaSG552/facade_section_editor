import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";

// Contour: M 10 11 L 2 11 A 3 3 0 0 1 1 10.8284 L 1 16
// Arc: center ≈ (2, 8), radius = 3, sweepFlag = 1 (CW in SVG / Y-down)
// Offset direction: negative d = inward (toward arc center side)
//
// At d = -1: arc degenerates (new radius = 4 but start ≈ end at y=12)
//   → arc must be removed; two lines must connect without a gap
// At d = -2: arc survives (new radius = 5, start at y=13, end on x=3 line)
//   → arc must be present; vertical segment must be at x = 1 + |d| = 3

const arcCenterX = 2.000076719831662;
const arcCenterY = 8.00000000098099;
const arcStartAngle = 90.00146524085324 * (Math.PI / 180);
const arcEndAngle = 109.47277476455787 * (Math.PI / 180);

function makeSegments() {
  return [
    { type: "line", start: { x: 10, y: 11 }, end: { x: 2, y: 11 } },
    {
      type: "arc",
      start: { x: 2, y: 11 },
      end: { x: 1, y: 10.8284 },
      arc: {
        centerX: arcCenterX,
        centerY: arcCenterY,
        center: { x: arcCenterX, y: arcCenterY },
        radius: 3,
        startAngle: arcStartAngle,
        endAngle: arcEndAngle,
        sweepFlag: 1,
      },
    },
    { type: "line", start: { x: 1, y: 10.8284 }, end: { x: 1, y: 16 } },
  ];
}

describe("OffsetContourBuilder — arc-degenerate contour (r=3, d=-1/-2)", () => {
  it("d=-1: arc degenerates and is removed; two lines connect with no gap", () => {
    const result = buildOffsetContour(makeSegments(), -1, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // No arc should survive after degeneration
    const arcSeg = result.find((s) => s.type === "arc");
    expect(arcSeg).toBeUndefined();

    // Must be exactly two line segments
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.type === "line")).toBe(true);

    // First line: horizontal at y=12 (offset by 1)
    expect(result[0].start.y).toBeCloseTo(12, 4);
    expect(result[0].end.y).toBeCloseTo(12, 4);

    // Join: end of first line must equal start of second line (no gap / no M-break)
    const joinGap = Math.hypot(
      result[1].start.x - result[0].end.x,
      result[1].start.y - result[0].end.y
    );
    expect(joinGap).toBeLessThan(1e-3);

    // Second line: vertical segment at x = 1 + 1 = 2
    expect(result[1].start.x).toBeCloseTo(2, 4);
    expect(result[1].end.x).toBeCloseTo(2, 4);
    expect(result[1].end.y).toBeCloseTo(16, 4);
  });

  it("d=-2: arc stays absent (monotonic rule); two lines connect at sharp miter", () => {
    // The arc degenerates at d=-1. By the monotonic degeneration rule, it must
    // remain absent at d=-2 even though the geometry would allow a valid arc (r=5).
    // The two offset lines connect directly at their miter intersection (3, 13).
    const result = buildOffsetContour(makeSegments(), -2, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // No arc must appear (monotonic rule)
    expect(result.find((s) => s.type === "arc")).toBeUndefined();

    // Exactly two line segments
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.type === "line")).toBe(true);

    // First line: horizontal at y = 13
    expect(result[0].start.y).toBeCloseTo(13, 4);
    expect(result[0].end.y).toBeCloseTo(13, 4);

    // Miter join at (3, 13) — intersection of y=13 and x=3
    expect(result[0].end.x).toBeCloseTo(3, 4);
    expect(result[1].start.x).toBeCloseTo(3, 4);
    expect(result[1].start.y).toBeCloseTo(13, 4);

    // No gap between segments
    const gap = Math.hypot(
      result[1].start.x - result[0].end.x,
      result[1].start.y - result[0].end.y
    );
    expect(gap).toBeLessThan(1e-3);

    // Second line: vertical at x = 3
    expect(result[1].end.x).toBeCloseTo(3, 4);
    expect(result[1].end.y).toBeCloseTo(16, 4);
  });

  it("d=-3: arc stays absent (monotonic rule); two lines connect at sharp miter", () => {
    // Same monotonic rule: arc was gone at d=-1, must not reappear at d=-3.
    // Miter intersection of horizontal y=14 and vertical x=4 is at (4, 14).
    const result = buildOffsetContour(makeSegments(), -3, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // No arc must appear
    expect(result.find((s) => s.type === "arc")).toBeUndefined();

    expect(result).toHaveLength(2);
    expect(result.every((s) => s.type === "line")).toBe(true);

    // First line: horizontal at y = 14
    expect(result[0].start.y).toBeCloseTo(14, 4);
    expect(result[0].end.y).toBeCloseTo(14, 4);

    // Miter join at (4, 14)
    expect(result[0].end.x).toBeCloseTo(4, 4);
    expect(result[1].start.x).toBeCloseTo(4, 4);
    expect(result[1].start.y).toBeCloseTo(14, 4);

    // No gap
    const gap = Math.hypot(
      result[1].start.x - result[0].end.x,
      result[1].start.y - result[0].end.y
    );
    expect(gap).toBeLessThan(1e-3);

    // Second line: vertical at x = 4
    expect(result[1].end.x).toBeCloseTo(4, 4);
    expect(result[1].end.y).toBeCloseTo(16, 4);
  });
});
