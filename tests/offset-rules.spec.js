/**
 * tests/offset-rules.spec.js
 *
 * Vitest tests for src/operations/OffsetRules.js
 * Tests degeneration checks, arc helpers, and constants.
 */

import { describe, it, expect } from "vitest";
import {
  ARC_ANGLE_EXTENSION,
  BRIDGE_TOLERANCE,
  DEGENERATION_EPSILON,
  isLineDegenerated,
  isArcDegenerated,
  isSegmentDegenerated,
  getArcCenter,
  preserveArcCenter,
  computeArcDelta,
  computeArcLength,
  extendArcAngles,
} from "../src/operations/OffsetRules.js";

describe("OffsetRules - Constants", () => {
  it("should export ARC_ANGLE_EXTENSION as 3 degrees in radians", () => {
    const expected = 3 * Math.PI / 180;
    expect(ARC_ANGLE_EXTENSION).toBeCloseTo(expected, 10);
  });

  it("should export BRIDGE_TOLERANCE as 1e-6", () => {
    expect(BRIDGE_TOLERANCE).toBe(1e-6);
  });

  it("should export DEGENERATION_EPSILON as 1e-9", () => {
    expect(DEGENERATION_EPSILON).toBe(1e-9);
  });
});

describe("OffsetRules - isLineDegenerated", () => {
  it("should return true for null/undefined", () => {
    expect(isLineDegenerated(null)).toBe(true);
    expect(isLineDegenerated(undefined)).toBe(true);
  });

  it("should return true for non-line segments", () => {
    expect(isLineDegenerated({ type: "arc" })).toBe(true);
    expect(isLineDegenerated({})).toBe(true);
  });

  it("should return true for missing start/end", () => {
    expect(isLineDegenerated({ type: "line", start: null })).toBe(true);
    expect(isLineDegenerated({ type: "line", end: null })).toBe(true);
  });

  it("should return true when start and end coincide", () => {
    const segment = {
      type: "line",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    };
    expect(isLineDegenerated(segment)).toBe(true);
  });

  it("should return true when distance is within DEGENERATION_EPSILON", () => {
    const segment = {
      type: "line",
      start: { x: 0, y: 0 },
      end: { x: 1e-10, y: 1e-10 },
    };
    expect(isLineDegenerated(segment)).toBe(true);
  });

  it("should return false for non-degenerate line", () => {
    const segment = {
      type: "line",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    };
    expect(isLineDegenerated(segment)).toBe(false);
  });

  it("should handle diagonal lines", () => {
    const segment = {
      type: "line",
      start: { x: 0, y: 0 },
      end: { x: 3, y: 4 },
    };
    expect(isLineDegenerated(segment)).toBe(false);
  });
});

describe("OffsetRules - isArcDegenerated", () => {
  it("should return true for null/undefined", () => {
    expect(isArcDegenerated(null)).toBe(true);
    expect(isArcDegenerated(undefined)).toBe(true);
  });

  it("should return true for non-arc segments", () => {
    expect(isArcDegenerated({ type: "line" })).toBe(true);
  });

  it("should return true for missing arc data", () => {
    expect(isArcDegenerated({ type: "arc", arc: null })).toBe(true);
    expect(isArcDegenerated({ type: "arc" })).toBe(true);
  });

  it("should return true when radius <= DEGENERATION_EPSILON", () => {
    const segment = {
      type: "arc",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      arc: {
        center: { x: 0.5, y: 0 },
        radius: 1e-10,
        startAngle: 0,
        endAngle: Math.PI,
        sweepFlag: 1,
      },
    };
    expect(isArcDegenerated(segment)).toBe(true);
  });

  it("should return true when angle delta is zero (start === end)", () => {
    const segment = {
      type: "arc",
      start: { x: 1, y: 0 },
      end: { x: 1, y: 0 },
      arc: {
        center: { x: 0, y: 0 },
        radius: 1,
        startAngle: 0,
        endAngle: 0,
        sweepFlag: 1,
      },
    };
    expect(isArcDegenerated(segment)).toBe(true);
  });

  it("should return false for non-degenerate CCW arc", () => {
    const segment = {
      type: "arc",
      start: { x: 1, y: 0 },
      end: { x: 0, y: 1 },
      arc: {
        center: { x: 0, y: 0 },
        radius: 1,
        startAngle: 0,
        endAngle: Math.PI / 2,
        sweepFlag: 1,
      },
    };
    expect(isArcDegenerated(segment)).toBe(false);
  });

  it("should return false for non-degenerate CW arc", () => {
    const segment = {
      type: "arc",
      start: { x: 1, y: 0 },
      end: { x: 0, y: -1 },
      arc: {
        center: { x: 0, y: 0 },
        radius: 1,
        startAngle: 0,
        endAngle: -Math.PI / 2,
        sweepFlag: 0,
      },
    };
    expect(isArcDegenerated(segment)).toBe(false);
  });

  it("should handle sweep wrapping for CCW (sweepFlag=1)", () => {
    // endAngle < startAngle, but sweepFlag=1 means we wrap around
    const segment = {
      type: "arc",
      start: { x: 1, y: 0 },
      end: { x: 0, y: 1 },
      arc: {
        center: { x: 0, y: 0 },
        radius: 1,
        startAngle: 2.5 * Math.PI,
        endAngle: 0.1 * Math.PI,
        sweepFlag: 1,
      },
    };
    expect(isArcDegenerated(segment)).toBe(false);
  });
});

describe("OffsetRules - isSegmentDegenerated", () => {
  it("should dispatch to isLineDegenerated for line type", () => {
    const degeneratedLine = {
      type: "line",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    };
    expect(isSegmentDegenerated(degeneratedLine)).toBe(true);

    const normalLine = {
      type: "line",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
    };
    expect(isSegmentDegenerated(normalLine)).toBe(false);
  });

  it("should dispatch to isArcDegenerated for arc type", () => {
    const degeneratedArc = {
      type: "arc",
      arc: { radius: 0 },
    };
    expect(isSegmentDegenerated(degeneratedArc)).toBe(true);

    const normalArc = {
      type: "arc",
      start: { x: 1, y: 0 },
      end: { x: 0, y: 1 },
      arc: {
        center: { x: 0, y: 0 },
        radius: 1,
        startAngle: 0,
        endAngle: Math.PI / 2,
        sweepFlag: 1,
      },
    };
    expect(isSegmentDegenerated(normalArc)).toBe(false);
  });

  it("should return true for unknown type", () => {
    expect(isSegmentDegenerated({ type: "unknown" })).toBe(true);
  });
});

describe("OffsetRules - getArcCenter", () => {
  it("should return null for null/undefined", () => {
    expect(getArcCenter(null)).toBe(null);
    expect(getArcCenter(undefined)).toBe(null);
  });

  it("should return null for missing arc", () => {
    expect(getArcCenter({ type: "arc" })).toBe(null);
    expect(getArcCenter({ type: "line" })).toBe(null);
  });

  it("should extract center from normalized format {center: {x, y}}", () => {
    const segment = {
      type: "arc",
      arc: {
        center: { x: 10, y: 20 },
        radius: 5,
      },
    };
    const center = getArcCenter(segment);
    expect(center).toEqual({ x: 10, y: 20 });
  });

  it("should extract center from legacy format {centerX, centerY}", () => {
    const segment = {
      type: "arc",
      arc: {
        centerX: 10,
        centerY: 20,
        radius: 5,
      },
    };
    const center = getArcCenter(segment);
    expect(center).toEqual({ x: 10, y: 20 });
  });

  it("should prefer normalized format over legacy", () => {
    const segment = {
      type: "arc",
      arc: {
        center: { x: 10, y: 20 },
        centerX: 30,
        centerY: 40,
        radius: 5,
      },
    };
    const center = getArcCenter(segment);
    expect(center).toEqual({ x: 10, y: 20 });
  });

  it("should return null for invalid center formats", () => {
    expect(
      getArcCenter({
        type: "arc",
        arc: { center: null, radius: 5 },
      })
    ).toBe(null);

    expect(
      getArcCenter({
        type: "arc",
        arc: { centerX: null, centerY: null, radius: 5 },
      })
    ).toBe(null);
  });
});

describe("OffsetRules - preserveArcCenter", () => {
  it("should handle null inputs gracefully", () => {
    expect(preserveArcCenter(null, { x: 0, y: 0 })).toBe(null);
    expect(preserveArcCenter({ type: "arc" }, null)).toEqual({ type: "arc" });
  });

  it("should update normalized format {center: {x, y}}", () => {
    const segment = {
      type: "arc",
      arc: {
        center: { x: 0, y: 0 },
        radius: 5,
      },
    };
    const original = { x: 10, y: 20 };
    preserveArcCenter(segment, original);
    expect(segment.arc.center).toEqual({ x: 10, y: 20 });
  });

  it("should update legacy format {centerX, centerY}", () => {
    const segment = {
      type: "arc",
      arc: {
        centerX: 0,
        centerY: 0,
        radius: 5,
      },
    };
    const original = { x: 10, y: 20 };
    preserveArcCenter(segment, original);
    expect(segment.arc.centerX).toBe(10);
    expect(segment.arc.centerY).toBe(20);
  });

  it("should update both formats if present", () => {
    const segment = {
      type: "arc",
      arc: {
        center: { x: 0, y: 0 },
        centerX: 0,
        centerY: 0,
        radius: 5,
      },
    };
    const original = { x: 10, y: 20 };
    preserveArcCenter(segment, original);
    expect(segment.arc.center).toEqual({ x: 10, y: 20 });
    expect(segment.arc.centerX).toBe(10);
    expect(segment.arc.centerY).toBe(20);
  });

  it("should preserve other arc properties", () => {
    const segment = {
      type: "arc",
      arc: {
        center: { x: 0, y: 0 },
        radius: 5,
        startAngle: 0,
        endAngle: Math.PI,
        sweepFlag: 1,
      },
    };
    const original = { x: 10, y: 20 };
    preserveArcCenter(segment, original);
    expect(segment.arc.radius).toBe(5);
    expect(segment.arc.startAngle).toBe(0);
    expect(segment.arc.endAngle).toBe(Math.PI);
    expect(segment.arc.sweepFlag).toBe(1);
  });

  it("should return the modified segment", () => {
    const segment = {
      type: "arc",
      arc: { center: { x: 0, y: 0 }, radius: 5 },
    };
    const result = preserveArcCenter(segment, { x: 10, y: 20 });
    expect(result).toBe(segment);
  });
});

describe("OffsetRules - computeArcDelta", () => {
  it("should return 0 for null/undefined", () => {
    expect(computeArcDelta(null)).toBe(0);
    expect(computeArcDelta(undefined)).toBe(0);
  });

  it("should compute positive delta for CCW arc (sweepFlag=1)", () => {
    const arc = {
      startAngle: 0,
      endAngle: Math.PI / 2,
      sweepFlag: 1,
    };
    const delta = computeArcDelta(arc);
    expect(delta).toBeCloseTo(Math.PI / 2, 10);
  });

  it("should compute negative delta for CW arc (sweepFlag=0)", () => {
    const arc = {
      startAngle: 0,
      endAngle: -Math.PI / 2,
      sweepFlag: 0,
    };
    const delta = computeArcDelta(arc);
    expect(delta).toBeCloseTo(-Math.PI / 2, 10);
  });

  it("should wrap CCW when endAngle < startAngle", () => {
    const arc = {
      startAngle: 2.5 * Math.PI,
      endAngle: 0.1 * Math.PI,
      sweepFlag: 1,
    };
    const delta = computeArcDelta(arc);
    // 0.1π - 2.5π = -2.4π, add 2π => -0.4π + 2π = 1.6π
    expect(delta).toBeCloseTo(0.1 * Math.PI - 2.5 * Math.PI + 2 * Math.PI, 10);
  });

  it("should wrap CW when endAngle > startAngle", () => {
    const arc = {
      startAngle: 0.1 * Math.PI,
      endAngle: 2.5 * Math.PI,
      sweepFlag: 0,
    };
    const delta = computeArcDelta(arc);
    // 2.5π - 0.1π = 2.4π (positive), subtract 2π => 0.4π but negative for CW
    expect(delta).toBeCloseTo(0.4 * Math.PI, 10);
  });
});

describe("OffsetRules - computeArcLength", () => {
  it("should return 0 for null/undefined", () => {
    expect(computeArcLength(null)).toBe(0);
    expect(computeArcLength(undefined)).toBe(0);
  });

  it("should compute arc length for quarter circle", () => {
    const arc = {
      radius: 1,
      startAngle: 0,
      endAngle: Math.PI / 2,
      sweepFlag: 1,
    };
    const length = computeArcLength(arc);
    expect(length).toBeCloseTo(Math.PI / 2, 10);
  });

  it("should compute arc length for semicircle", () => {
    const arc = {
      radius: 1,
      startAngle: 0,
      endAngle: Math.PI,
      sweepFlag: 1,
    };
    const length = computeArcLength(arc);
    expect(length).toBeCloseTo(Math.PI, 10);
  });

  it("should compute arc length using absolute delta", () => {
    const arc = {
      radius: 2,
      startAngle: 2.5 * Math.PI,
      endAngle: 0.1 * Math.PI,
      sweepFlag: 1,
    };
    const length = computeArcLength(arc);
    // delta: 0.1π - 2.5π = -2.4π, add 2π => -0.4π
    // length = 2 * |-0.4π| = 0.8π
    expect(length).toBeCloseTo(0.8 * Math.PI, 10);
  });

  it("should handle negative radius (use absolute value)", () => {
    const arc = {
      radius: -2,
      startAngle: 0,
      endAngle: Math.PI / 2,
      sweepFlag: 1,
    };
    const length = computeArcLength(arc);
    expect(length).toBeCloseTo(Math.PI, 10);
  });
});

describe("OffsetRules - extendArcAngles", () => {
  it("should extend CCW arc angles", () => {
    const arc = { startAngle: 0, endAngle: Math.PI / 2, sweepFlag: 1 };
    const ext = 3 * Math.PI / 180; // 3 degrees
    const result = extendArcAngles(arc, ext);
    expect(result.startAngle).toBeCloseTo(-ext, 10);
    expect(result.endAngle).toBeCloseTo(Math.PI / 2 + ext, 10);
  });

  it("should extend CW arc angles", () => {
    const arc = { startAngle: 0, endAngle: -Math.PI / 2, sweepFlag: 0 };
    const ext = 3 * Math.PI / 180;
    const result = extendArcAngles(arc, ext);
    expect(result.startAngle).toBeCloseTo(ext, 10);
    expect(result.endAngle).toBeCloseTo(-Math.PI / 2 - ext, 10);
  });

  it("should not modify original arc", () => {
    const arc = { startAngle: 0, endAngle: Math.PI, sweepFlag: 1 };
    const ext = 0.1;
    extendArcAngles(arc, ext);
    expect(arc.startAngle).toBe(0);
    expect(arc.endAngle).toBe(Math.PI);
  });

  it("should handle null arc", () => {
    const result = extendArcAngles(null, 0.1);
    expect(result.startAngle).toBe(0);
    expect(result.endAngle).toBe(0);
  });

  it("should use default sweepFlag=1 when undefined", () => {
    const arc = { startAngle: 0, endAngle: Math.PI / 2 };
    const ext = 0.1;
    const result = extendArcAngles(arc, ext);
    expect(result.startAngle).toBeCloseTo(-0.1, 10);
    expect(result.endAngle).toBeCloseTo(Math.PI / 2 + 0.1, 10);
  });
});
