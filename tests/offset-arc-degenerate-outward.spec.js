/**
 * Regression: outward offset of a closed contour with a convex line→arc join
 * must NOT degenerate / remove the arc.
 *
 * Root cause: for an outward-growing offset arc the offset line passes through
 * the arc circle at two points — the one within segment bounds is the WRONG
 * (entering) intersection far from the arc start.  The fix uses whichever of
 * the segment-bounds or infinite-line intersection is closer to next.start.
 *
 * Source contour: M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z
 */
import { describe, it, expect } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const SRC_PATH = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const exportModule = new ExportModule();

describe("offset-arc-degenerate-outward: arc must survive outward offset", () => {
  it("outward offset d=-0.5 preserves arc in result", async () => {
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(SRC_PATH, -0.5, { trimSelfIntersections: false });
    expect(result.contours.length).toBeGreaterThan(0);
    const arcs = result.contours.flatMap((c) => c.segments.filter((s) => s.type === "arc"));
    expect(arcs.length).toBeGreaterThan(0);
    // Arc radius must have grown (outward = CW contour, sweepFlag=1, d<0 ⇒ r grows)
    const arc = arcs[0];
    expect(arc.arc.radius).toBeGreaterThan(1.4142);
  });

  it("inward offset d=0.5 preserves arc in result", async () => {
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(SRC_PATH, 0.5, { trimSelfIntersections: false });
    expect(result.contours.length).toBeGreaterThan(0);
    const arcs = result.contours.flatMap((c) => c.segments.filter((s) => s.type === "arc"));
    expect(arcs.length).toBeGreaterThan(0);
    // Arc radius must have shrunk (inward = d>0 ⇒ r shrinks for sweepFlag=1)
    const arc = arcs[0];
    expect(arc.arc.radius).toBeLessThan(1.4142);
  });

  it("outward offset d=-0.5 has correct segment count (6)", async () => {
    const engine = new OffsetEngine({ exportModule });
    const result = await engine.processPath(SRC_PATH, -0.5, { trimSelfIntersections: false });
    expect(result.contours.length).toBe(1);
    expect(result.contours[0].segments.length).toBe(6);
  });
});
