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

  it("inward d=2 produces correct 3-segment triangle with parallel diagonal (no spurious bridge)", async () => {
    // Source diagonal: L(10,3)→(3,5), direction (-7,2)/sqrt(53)
    const srcDx = 3 - 10, srcDy = 5 - 3;
    const srcLen = Math.hypot(srcDx, srcDy);
    const srcDir = { x: srcDx / srcLen, y: srcDy / srcLen };

    for (const d of [2.0, 2.2]) {
      const engine = new OffsetEngine({ exportModule });
      const result = await engine.processPath(SRC_PATH, d, { trimSelfIntersections: false });
      const c = result.contours[0];

      // Must produce exactly 3 segments — no right-vertical bridge stub
      expect(c.segments.length).toBe(3);

      // All segments must be lines
      expect(c.segments.every((s) => s.type === "line")).toBe(true);

      // Find the longest segment — that is the main diagonal
      const diagSeg = c.segments.reduce((best, s) => {
        const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
        const bestLen = Math.hypot(best.end.x - best.start.x, best.end.y - best.start.y);
        return len > bestLen ? s : best;
      });
      const dx = diagSeg.end.x - diagSeg.start.x;
      const dy = diagSeg.end.y - diagSeg.start.y;
      const diagLen = Math.hypot(dx, dy);
      const parallelScore = Math.abs(dx / diagLen * srcDir.x + dy / diagLen * srcDir.y);
      expect(parallelScore).toBeGreaterThan(0.999);

      // Closure gap must be negligible
      const first = c.segments[0];
      const last = c.segments[c.segments.length - 1];
      const closureGap = Math.hypot(last.end.x - first.start.x, last.end.y - first.start.y);
      expect(closureGap).toBeLessThan(1e-4);
    }
  });

  it("inward d=1.7 produces correct 3-segment closed contour (tiny D-stub collapse + E-B miter)", async () => {
    // At d=1.7: arc degenerates, diagonal A (offset of L2_9) is reversed and
    // filtered, leaving B(V0), C(H10), D(V3_tiny≈0.018), E(L3_5). Step 4e
    // prunes D, then the second reconnect pass must miter C and E at their
    // correct intersection, and miter E and B.
    // Expected: exactly 3 segments, all lines, zero internal gaps.
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(SRC_PATH, 1.7, { trimSelfIntersections: false });
    const c = result.contours[0];

    expect(c.segments.length).toBe(3);
    expect(c.segments.every((s) => s.type === "line")).toBe(true);

    // All consecutive joints must snap closed (no internal crack)
    for (let i = 0; i < c.segments.length; i++) {
      const a = c.segments[i];
      const b = c.segments[(i + 1) % c.segments.length];
      const gap = Math.hypot(a.end.x - b.start.x, a.end.y - b.start.y);
      expect(gap).toBeLessThan(1e-4);
    }

    // Verify the horizontal segment ends near x=8.36 (intersection of H10 and
    // L3_5 offset lines), not at the raw V3 corner x=8.3.
    const horizSeg = c.segments.find(
      (s) => Math.abs(s.start.y - s.end.y) < 0.01 && Math.abs(s.start.y - 1.7) < 0.01
    );
    expect(horizSeg).toBeTruthy();
    const horizRightX = Math.max(horizSeg.start.x, horizSeg.end.x);
    expect(horizRightX).toBeGreaterThan(8.35); // must extend past x=8.3
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
