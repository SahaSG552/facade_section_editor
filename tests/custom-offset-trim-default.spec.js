import { describe, it, expect, vi, beforeEach } from "vitest";

const { engineCalculateOffsetMock } = vi.hoisted(() => ({
  engineCalculateOffsetMock: vi.fn(() => "M 0 0 L 1 0"),
}));

vi.mock("../src/operations/OffsetEngine.js", () => ({
  OffsetEngine: class OffsetEngine {},
  calculateOffsetFromPathData: engineCalculateOffsetMock,
}));

import { calculateOffsetFromPathData } from "../src/operations/CustomOffsetProcessor.js";

describe("CustomOffsetProcessor trimSelfIntersections default", () => {
  beforeEach(() => {
    engineCalculateOffsetMock.mockClear();
    engineCalculateOffsetMock.mockImplementation(() => "M 0 0 L 1 0");
  });

  it("passes trimSelfIntersections=true when option is unspecified", () => {
    calculateOffsetFromPathData("M 0 0 L 10 0", 1, { join: "sharp", cap: "flat" });

    expect(engineCalculateOffsetMock).toHaveBeenCalledTimes(1);
    const [, , options] = engineCalculateOffsetMock.mock.calls[0];
    expect(options.trimSelfIntersections).toBe(true);
  });

  it("preserves explicit trimSelfIntersections=false", () => {
    calculateOffsetFromPathData("M 0 0 L 10 0", 1, {
      join: "sharp",
      cap: "flat",
      trimSelfIntersections: false,
    });

    expect(engineCalculateOffsetMock).toHaveBeenCalledTimes(1);
    const [, , options] = engineCalculateOffsetMock.mock.calls[0];
    expect(options.trimSelfIntersections).toBe(false);
  });

  it("passes sideResolution and cursorPoint to engine for open contours", () => {
    calculateOffsetFromPathData("M 0 0 L 10 0", 1, {
      join: "sharp",
      cap: "flat",
      sideResolution: "nearest-segment-normal",
      cursorPoint: { x: 5, y: 3 },
    });

    expect(engineCalculateOffsetMock).toHaveBeenCalledTimes(1);
    const [, , options] = engineCalculateOffsetMock.mock.calls[0];
    expect(options.sideResolution).toBe("nearest-segment-normal");
    expect(options.cursorPoint).toEqual({ x: 5, y: 3 });
  });

  it("does not reverse open-path output by signed-area winding heuristics", () => {
    // Open contour: winding by signedArea is unstable and must not trigger reversal.
    // We intentionally return a path with opposite pseudo-area sign.
    engineCalculateOffsetMock.mockReturnValueOnce("M 10 0 L 0 0 L 0 10");

    const result = calculateOffsetFromPathData("M 0 10 L 0 0 L 10 0", 1, {
      join: "sharp",
      cap: "flat",
    });

    expect(result).toBe("M 10 0 L 0 0 L 0 10");
  });

  it("preserves winding for closed paths", () => {
    // Closed contour should still keep original winding parity.
    // Input is closed; engine returns opposite winding, so wrapper reverses it back.
    engineCalculateOffsetMock.mockReturnValueOnce("M 0 0 L 0 10 L 10 10 L 10 0 Z");

    const result = calculateOffsetFromPathData("M 0 0 L 10 0 L 10 10 L 0 10 Z", 1, {
      join: "sharp",
      cap: "flat",
    });

    expect(result).toBe("M 10 0 L 10 10 L 0 10 L 0 0 Z");
  });
});
