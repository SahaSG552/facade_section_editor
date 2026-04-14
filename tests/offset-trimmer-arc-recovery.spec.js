import { describe, it, expect } from "vitest";
import ExportModule from "../src/export/ExportModule.js";
import { pathStringToSegments } from "../src/operations/OffsetTrimmer.js";

describe("OffsetTrimmer cubic recovery", () => {
  const exportModule = new ExportModule();

  it("recovers an arc from a Paper-style cubic quarter circle when export support is available", () => {
    const path = "M 1 0 C 1 0.5522847498 0.5522847498 1 0 1";
    const segments = pathStringToSegments(path, { exportModule });

    const arc = segments.find((seg) => seg.type === "arc");
    expect(arc).toBeTruthy();
    expect(arc.arc.largeArcFlag).toBe(0);
    expect(arc.arc.radius).toBeCloseTo(1, 1);
    expect(arc.start.x).toBeCloseTo(1, 3);
    expect(arc.start.y).toBeCloseTo(0, 3);
    expect(arc.end.x).toBeCloseTo(0, 3);
    expect(arc.end.y).toBeCloseTo(1, 3);
  });

  it("still falls back to polyline parsing when export support is not supplied", () => {
    const path = "M 1 0 C 1 0.5522847498 0.5522847498 1 0 1";
    const segments = pathStringToSegments(path);

    expect(segments.length).toBeGreaterThan(1);
    expect(segments.every((seg) => seg.type === "line")).toBe(true);
  });
});
