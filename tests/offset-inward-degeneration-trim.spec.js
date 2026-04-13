import { describe, expect, it } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";
import { pathStringToSegments } from "../src/operations/OffsetTrimmer.js";

const SRC_PATH = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const exportModule = new ExportModule();
const EPS = 1e-3;

function largestContour(contours) {
  if (!Array.isArray(contours) || contours.length === 0) return null;
  return contours.reduce((best, c) => {
    if (!best) return c;
    return Math.abs(c.area ?? 0) > Math.abs(best.area ?? 0) ? c : best;
  }, null);
}

function hasVerticalAtX(segments, xTarget, tol = 0.02) {
  return segments.some((s) => {
    if (s.type !== "line") return false;
    return Math.abs(s.start.x - s.end.x) <= EPS && Math.abs(s.start.x - xTarget) <= tol;
  });
}

describe("inward degeneration + trim stability", () => {
  it("pathStringToSegments parses relative h/v commands from Paper output", () => {
    const paperPath = "M2.00393,4.03657l-0.80393,3.2157v-6.05227h7.6v0.89484z";
    const segments = pathStringToSegments(paperPath);

    expect(segments.length).toBe(5);
    expect(segments.every((s) => s.type === "line")).toBe(true);
  });
  const LARGE_ARC_CONTOUR = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5";

  it("direct inward d=1.2 with trim keeps non-empty closed contour", async () => {
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(SRC_PATH, 1.2);

    expect(result.contours.length).toBeGreaterThan(0);
    const main = largestContour(result.contours);
    expect(main).toBeTruthy();
    expect(main.segments.length).toBeGreaterThanOrEqual(5);
    expect(hasVerticalAtX(main.segments, 1.2)).toBe(true);
  });

  it("does not invoke Paper trim on non-self-intersecting large-arc contour", async () => {
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(LARGE_ARC_CONTOUR, -6);

    expect(result.contours.length).toBe(1);
    const main = largestContour(result.contours);
    expect(main).toBeTruthy();
    expect(main.segments.length).toBe(6);
    expect(main.segments.some((s) => s.type === "arc")).toBe(true);
  });

  it("sequential inward +0.4 x3 keeps main contour topology (no 3-segment collapse)", async () => {
    const engine = new OffsetEngine({ exportModule });

    let path = SRC_PATH;
    for (let i = 0; i < 3; i++) {
      const result = await engine.processPath(path, 0.4);
      expect(result.contours.length).toBeGreaterThan(0);
      path = result.pathData;
    }

    const final = await engine.processPath(path, 0.4);
    expect(final.contours.length).toBeGreaterThan(0);

    const main = largestContour(final.contours);
    expect(main).toBeTruthy();
    expect(main.segments.length).toBeGreaterThanOrEqual(5);
    expect(hasVerticalAtX(main.segments, 1.6)).toBe(true);
  });
});
