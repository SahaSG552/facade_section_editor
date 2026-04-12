import { describe, expect, it } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const PATH4 = "M 1.6719 3.7154 L 1.6 4.003 L 1.6 1.6 L 8.4 1.6 L 8.4 1.7931 L 1.6719 3.7154";
const exportModule = new ExportModule();

function largestContour(contours) {
  if (!Array.isArray(contours) || contours.length === 0) return null;
  return contours.reduce((best, c) => {
    if (!best) return c;
    return Math.abs(c.area ?? 0) > Math.abs(best.area ?? 0) ? c : best;
  }, null);
}

describe("near-degenerate line inversion guard", () => {
  it("collapses the tiny right-side segment at d=0.1 instead of keeping ~0.0177 line", async () => {
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(PATH4, 0.1, { trimSelfIntersections: false });

    expect(result.contours.length).toBeGreaterThan(0);
    const main = largestContour(result.contours);
    expect(main).toBeTruthy();

    const hasTinyRightSideLine = main.segments.some((s) => {
      if (s.type !== "line") return false;
      const dx = s.end.x - s.start.x;
      const dy = s.end.y - s.start.y;
      const len = Math.hypot(dx, dy);
      return s.start.x > 8.0 && s.end.x > 8.0 && len < 0.03;
    });

    expect(hasTinyRightSideLine).toBe(false);
  });

  it("does not keep inverted tiny right-side vertical on contour4->next step", async () => {
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(PATH4, 0.12, { trimSelfIntersections: false });

    expect(result.contours.length).toBeGreaterThan(0);
    const main = largestContour(result.contours);
    expect(main).toBeTruthy();

    // Regression: previously we had an inverted tiny segment
    // (8.280000,1.720000) -> (8.280000,1.702584), dy<0, |dy|~0.017.
    const hasInvertedTinyRightVertical = main.segments.some((s) => {
      if (s.type !== "line") return false;
      const dx = s.end.x - s.start.x;
      const dy = s.end.y - s.start.y;
      return (
        Math.abs(dx) <= 1e-6 &&
        s.start.x > 8.0 &&
        s.end.x > 8.0 &&
        dy < -1e-6 &&
        Math.abs(dy) < 0.05
      );
    });

    expect(hasInvertedTinyRightVertical).toBe(false);
  });
});
