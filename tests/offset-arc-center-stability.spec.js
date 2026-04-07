import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";
import { isArcDegenerated } from "../src/operations/OffsetRules.js";

describe("OffsetContourBuilder arc center stability", () => {
  it("preserves arc center and keeps endpoint on circle when arc is trimmed", () => {
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
          center: { x: 2, y: 8 },
          centerX: 2,
          centerY: 8,
          radius: 2,
          startAngle: Math.PI / 2,
          endAngle: Math.PI,
          sweepFlag: 1,
        },
      },
      {
        type: "line",
        start: { x: 0, y: 8 },
        end: { x: 0, y: 16 },
      },
    ];

    const result = buildOffsetContour(segments, -1, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    const arc = result.find((s) => s.type === "arc");
    expect(arc).toBeDefined();

    const center = arc.arc?.center || { x: arc.arc?.centerX, y: arc.arc?.centerY };
    expect(center.x).toBeCloseTo(2, 6);
    expect(center.y).toBeCloseTo(8, 6);

    const radius = Math.abs(arc.arc.radius);
    const endRadius = Math.hypot(arc.end.x - center.x, arc.end.y - center.y);
    expect(endRadius).toBeCloseTo(radius, 6);
  });

  it("detects collapsed arc (point-like, start≈end) as degenerate", () => {
    // Arc with radius>0, non-zero angle values, but start=end (chord length ≈ 0)
    const collapsedArc = {
      type: "arc",
      start: { x: 2, y: 12 },
      end: { x: 2, y: 12 }, // start ≈ end: chord length → 0
      arc: {
        center: { x: 5, y: 15 },
        centerX: 5,
        centerY: 15,
        radius: 4,
        startAngle: 0,
        endAngle: Math.PI / 2, // Non-zero angles, but start=end
        sweepFlag: 1,
      },
    };

    // Should detect as degenerate (chord-based early check)
    expect(isArcDegenerated(collapsedArc)).toBe(true);
  });

  it("removes collapsed arcs from offset contour output", () => {
    // Crafted contour designed to produce a collapsed arc during offset.
    // Start with an arc that will collapse when offset inward enough.
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
          center: { x: 2, y: 8 },
          centerX: 2,
          centerY: 8,
          radius: 2,
          startAngle: Math.PI / 2,
          endAngle: Math.PI,
          sweepFlag: 1,
        },
      },
      {
        type: "line",
        start: { x: 0, y: 8 },
        end: { x: 0, y: 16 },
      },
    ];

    // At d=-3, the arc should be completely degenerated and removed from output.
    const result = buildOffsetContour(segments, -3, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // Verify no degenerated arcs in output
    const hasCollapsedArc = result.some((seg) => {
      return seg.type === "arc" && isArcDegenerated(seg);
    });

    expect(hasCollapsedArc).toBe(false);

    // All remaining segments should be lines
    expect(result.every((s) => s.type === "line")).toBe(true);
  });
});

