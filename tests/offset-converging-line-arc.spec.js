import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";

const EPSILON = 1e-6;

describe("OffsetContourBuilder converging sharp fallback", () => {
  it("uses direct/tangent connection (no U-bridge chain) for converging line-arc corner", () => {
    // Crafted line-arc-line topology where the arc->line sharp convex fallback is
    // converging by normal-facing criterion and miter application fails.
    const segments = [
      {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
      },
      {
        type: "arc",
        start: { x: 10, y: 0 },
        end: { x: 8.843730177499369, y: 0.8790014056504958 },
        arc: {
          center: { x: 10, y: 1.2 },
          centerX: 10,
          centerY: 1.2,
          radius: 1.2,
          startAngle: -1.5707963267948966,
          endAngle: -2.8707963267948973,
          sweepFlag: 0,
        },
      },
      {
        type: "line",
        start: { x: 8.843730177499369, y: 0.8790014056504958 },
        end: { x: 8.487238066200382, y: -1.0889704880973776 },
      },
    ];

    const result = buildOffsetContour(segments, -1, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    const arcIndex = result.findIndex((s) => s.type === "arc");
    expect(arcIndex).toBeGreaterThan(0);

    // No 3-line U-bridge chain immediately after the arc.
    const tailTypes = result.slice(arcIndex + 1).map((s) => s.type);
    expect(tailTypes.every((t) => t === "line")).toBe(true);
    expect(tailTypes.length).toBeLessThanOrEqual(2);

    // Arc->next segment should be stitched directly (no gap).
    const arc = result[arcIndex];
    const next = result[arcIndex + 1];
    expect(next?.type).toBe("line");
    const joinGap = Math.hypot(next.start.x - arc.end.x, next.start.y - arc.end.y);
    expect(joinGap).toBeLessThan(1e-6);
  });

  it("uses intersection trim first for non-diverging sharp line-arc join when intersection exists", () => {
    // Exact user case:
    // M10 10 L2 10 A2 2 0 0 1 0 8 L0 16
    // Inward sharp offset should trim arc->line at real geometric intersection,
    // without inserting a horizontal detour bridge from (-1,8) to (1,8).
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

    // No intermediate detour bridge should be injected between arc and final line.
    expect(result.map((s) => s.type)).toEqual(["line", "arc", "line"]);

    const hasForbiddenHorizontalBridge = result.some((seg) => {
      if (seg.type !== "line") return false;

      const yAligned =
        Math.abs(seg.start.y - 8) < 1e-6 && Math.abs(seg.end.y - 8) < 1e-6;
      if (!yAligned) return false;

      const spansMinusOneToPlusOne =
        (Math.abs(seg.start.x - (-1)) < 1e-6 && Math.abs(seg.end.x - 1) < 1e-6) ||
        (Math.abs(seg.start.x - 1) < 1e-6 && Math.abs(seg.end.x - (-1)) < 1e-6);

      return spansMinusOneToPlusOne;
    });

    expect(hasForbiddenHorizontalBridge).toBe(false);

    // Arc and following segment must be stitched directly by intersection trim.
    const arcIndex = result.findIndex((s) => s.type === "arc");
    expect(arcIndex).toBeGreaterThanOrEqual(0);
    expect(arcIndex).toBeLessThan(result.length - 1);

    const arc = result[arcIndex];
    const next = result[arcIndex + 1];
    expect(next.type).toBe("line");

    const joinGap = Math.hypot(next.start.x - arc.end.x, next.start.y - arc.end.y);
    expect(joinGap).toBeLessThan(1e-6);

    // Direct arc->line stitch around that corner: no extra join segment in-between.
    expect(arcIndex + 1).toBe(result.length - 1);
  });

  it("prevents arc resurrection after collapse for stronger inward offsets (d=-2 and d=-3)", () => {
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

    for (const d of [-2, -3]) {
      const result = buildOffsetContour(segments, d, {
        joinType: "sharp",
        capType: "flat",
        skipCap: true,
      });

      // Once collapsed, arc must not reappear.
      expect(result.some((s) => s.type === "arc")).toBe(false);

      // Must not create horizontal detour bridge across y=8 from x<0 to x>0.
      const hasForbiddenHorizontalBridge = result.some((seg) => {
        if (seg.type !== "line") return false;
        if (Math.abs(seg.start.y - 8) > 1e-6 || Math.abs(seg.end.y - 8) > 1e-6) {
          return false;
        }
        const minX = Math.min(seg.start.x, seg.end.x);
        const maxX = Math.max(seg.start.x, seg.end.x);
        return minX < -1e-6 && maxX > 1e-6;
      });

      expect(hasForbiddenHorizontalBridge).toBe(false);
      expect(result.every((s) => s.type === "line")).toBe(true);

      // For d=-3, verify second segment is collinear (vertical, not diagonal)
      // by checking that dx is near-zero while dy is non-zero
      if (d === -3 && result.length >= 2) {
        const secondSeg = result[1];
        const dx = Math.abs(secondSeg.end.x - secondSeg.start.x);
        const dy = Math.abs(secondSeg.end.y - secondSeg.start.y);
        expect(dx).toBeLessThan(1e-6);
        expect(dy).toBeGreaterThan(EPSILON);
      }
    }
  });
});
