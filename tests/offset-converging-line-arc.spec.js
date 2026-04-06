import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";

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

    // Expected pattern after fix:
    // line, line (tangent join at first corner), arc, line (single connector), line
    // Critically: no 3-line U-bridge sequence around the arc->line corner.
    expect(result.map((s) => s.type)).toEqual(["line", "line", "arc", "line", "line"]);

    // Arc->line corner should have only one connector line between arc and final offset line.
    expect(result[2].type).toBe("arc");
    expect(result[3].type).toBe("line");
    expect(result[4].type).toBe("line");
  });
});
