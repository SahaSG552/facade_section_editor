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
});
