import { describe, expect, it } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";
import { pathStringToSegments } from "../src/operations/OffsetTrimmer.js";

const SRC_PATH = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const CHAIN_PATH_NO_Z = "M 2.0703 4.1008 L 1.129 7.8662 A 0.2942 0.2942 0 0 1 1.12 7.8483 L 1.12 1.12 L 8.88 1.12 L 8.88 2.1552 L 2.0703 4.1008";
const CHAIN_PATH_WITH_Z = `${CHAIN_PATH_NO_Z} Z`;
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

  it("direct inward d=1.2 with trim keeps non-empty closed contour", async () => {
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(SRC_PATH, 1.2);

    expect(result.contours.length).toBeGreaterThan(0);
    const main = largestContour(result.contours);
    expect(main).toBeTruthy();
    expect(main.segments.length).toBeGreaterThanOrEqual(5);
    expect(hasVerticalAtX(main.segments, 1.2)).toBe(true);
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

  it("geometrically closed path without Z matches explicit Z behavior", async () => {
    const engine = new OffsetEngine({ exportModule });

    // This is the user's second-step contour shape: it is closed by geometry
    // (last L returns to first M) but may not include explicit `Z`.
    const d = -0.38;
    const noZ = await engine.processPath(CHAIN_PATH_NO_Z, d, { trimSelfIntersections: false });
    const withZ = await engine.processPath(CHAIN_PATH_WITH_Z, d, { trimSelfIntersections: false });

    expect(noZ.contours.length).toBeGreaterThan(0);
    expect(withZ.contours.length).toBeGreaterThan(0);

    const noZMain = largestContour(noZ.contours);
    const withZMain = largestContour(withZ.contours);

    expect(noZMain).toBeTruthy();
    expect(withZMain).toBeTruthy();
    expect(noZMain.segments.length).toBe(withZMain.segments.length);

    const noZArcs = noZMain.segments.filter((s) => s.type === "arc").length;
    const withZArcs = withZMain.segments.filter((s) => s.type === "arc").length;
    expect(noZArcs).toBe(withZArcs);
  });
});
