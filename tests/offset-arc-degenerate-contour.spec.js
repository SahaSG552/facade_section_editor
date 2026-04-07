import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";

/**
 * Test for bug: arc degenerates during offset but instead of being removed,
 * it causes the contour to split into two disconnected segments (M...M break).
 *
 * Input path: M 10 11 L 2 11 A 3 3 0 0 1 1 10.8284 L 1 16
 * Arc: center ≈ (2, 8), radius=3, startAngle≈90°, endAngle≈109.47°, sweepFlag=1.
 * The arc degenerates at distance=3 (r - d → 0).
 * Expected: arc disappears, two adjacent lines connect cleanly without M-break.
 */
describe("buildOffsetContour - arc degeneration produces connected output", () => {
  // Exact arc center derived from SVG arc parameters A 3 3 0 0 1 1 10.8284
  const arcCenterX = 2.000076719831662;
  const arcCenterY = 8.00000000098099;
  const arcStartAngle = 90.00146524085324 * (Math.PI / 180); // radians
  const arcEndAngle = 109.47277476455787 * (Math.PI / 180); // radians

  function makeSegments() {
    return [
      {
        type: "line",
        start: { x: 10, y: 11 },
        end: { x: 2, y: 11 },
      },
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
      {
        type: "line",
        start: { x: 1, y: 10.8284 },
        end: { x: 1, y: 16 },
      },
    ];
  }

  function isConnected(result, eps = 1e-3) {
    for (let i = 1; i < result.length; i++) {
      const dx = Math.abs(result[i].start.x - result[i - 1].end.x);
      const dy = Math.abs(result[i].start.y - result[i - 1].end.y);
      if (dx > eps || dy > eps) return false;
    }
    return true;
  }

  function hasZeroLength(result, eps = 1e-6) {
    return result.some((seg) => {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      return Math.sqrt(dx * dx + dy * dy) < eps;
    });
  }

  it("distance=3: arc degenerates, result is connected (no M-break), sharp mode", () => {
    const result = buildOffsetContour(makeSegments(), 3, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    expect(result.length).toBeGreaterThan(0);
    // Arc must be gone — only lines remain
    expect(result.every((s) => s.type === "line")).toBe(true);
    expect(isConnected(result)).toBe(true);
    expect(hasZeroLength(result)).toBe(false);
  });

  it("distance=3: result is connected in round mode too (no M-break)", () => {
    const result = buildOffsetContour(makeSegments(), 3, {
      joinType: "round",
      capType: "flat",
      skipCap: true,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(isConnected(result)).toBe(true);
    expect(hasZeroLength(result)).toBe(false);
  });

  it("distance=4: arc stays absent after full degeneration, result connected, sharp mode", () => {
    const result = buildOffsetContour(makeSegments(), 4, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    expect(result.length).toBeGreaterThan(0);
    // Arc must not resurrect or flip
    expect(result.every((s) => s.type === "line")).toBe(true);
    expect(isConnected(result)).toBe(true);
    expect(hasZeroLength(result)).toBe(false);
  });

  it("distance=4: arc does not resurrect or flip in round mode", () => {
    const result = buildOffsetContour(makeSegments(), 4, {
      joinType: "round",
      capType: "flat",
      skipCap: true,
    });

    expect(result.length).toBeGreaterThan(0);
    expect(isConnected(result)).toBe(true);
    expect(hasZeroLength(result)).toBe(false);
  });
});
