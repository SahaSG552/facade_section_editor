import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";

/**
 * Regression test: single open arc with largeArcFlag=1 should not be incorrectly
 * removed by the Step-4b orientation-inversion check.
 *
 * For a large arc (> 180°, largeArcFlag=1) with sweepFlag=1, the cross product
 * (start−center) × (end−center) is naturally negative (sin(angle > 180°) < 0),
 * but the original code treated cross < -EPSILON as "inverted" regardless of
 * largeArcFlag, incorrectly removing the valid arc.
 *
 * Source path equivalent: M 0 0 A 11.4386 11.4386 0 1 1 11 20
 *   largeArcFlag=1, sweepFlag=1, radius=11.4386
 *   center ≈ (6.174, 9.629), startAngle ≈ -2.14 rad, endAngle ≈ 1.135 rad
 *   Angular span ≈ 3.275 rad ≈ 187.6° (large arc)
 */
describe("buildOffsetContour – single open large-arc (largeArcFlag=1)", () => {
  // Arc parameters matching M 0 0 A 11.4386 11.4386 0 1 1 11 20
  const r = 11.4386;
  const cx = 6.173929293762429;
  const cy = 9.629339247590982;
  const startAngle = -2.143706563869658;
  const endAngle = 1.1354836059521345;

  function makeSingleArcSegment() {
    return [
      {
        type: "arc",
        start: { x: 0, y: 0 },
        end: { x: 11, y: 20 },
        arc: {
          center: { x: cx, y: cy },
          centerX: cx,
          centerY: cy,
          radius: r,
          rx: r,
          ry: r,
          largeArcFlag: 1,
          sweepFlag: 1,
          startAngle,
          endAngle,
        },
      },
    ];
  }

  it("d=-2 (outward): offset returns a single arc, not empty", () => {
    const result = buildOffsetContour(makeSingleArcSegment(), -2, {
      skipCap: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("arc");
    // Outward offset increases radius
    expect(result[0].arc.radius).toBeCloseTo(r + 2, 2);
  });

  it("d=+2 (inward): offset returns a single arc, not empty", () => {
    const result = buildOffsetContour(makeSingleArcSegment(), 2, {
      skipCap: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("arc");
    // Inward offset decreases radius
    expect(result[0].arc.radius).toBeCloseTo(r - 2, 2);
  });

  it("d=-5 (outward large): offset returns a single arc", () => {
    const result = buildOffsetContour(makeSingleArcSegment(), -5, {
      skipCap: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("arc");
    expect(result[0].arc.radius).toBeCloseTo(r + 5, 2);
  });

  it("d=+5 (inward): offset returns a single arc", () => {
    const result = buildOffsetContour(makeSingleArcSegment(), 5, {
      skipCap: true,
    });
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("arc");
    expect(result[0].arc.radius).toBeCloseTo(r - 5, 2);
  });

  it("offset arc start/end points are offset from original endpoints", () => {
    const result = buildOffsetContour(makeSingleArcSegment(), -2, {
      skipCap: true,
    });
    expect(result.length).toBe(1);
    const arc = result[0];
    // Start and end of offset arc must differ from the original start/end
    const dxStart = Math.hypot(arc.start.x - 0, arc.start.y - 0);
    const dxEnd = Math.hypot(arc.end.x - 11, arc.end.y - 20);
    expect(dxStart).toBeGreaterThan(0.5); // moved away from original
    expect(dxEnd).toBeGreaterThan(0.5);
  });
});
