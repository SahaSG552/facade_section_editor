import { describe, it, expect } from "vitest";

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const CLOSED_PATH = "M -10 0 L 30 -1 L 10 30 A 13 13 0 0 0 -10 30 L -10 0";
const OPEN_PATH = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";
const DISTANCE = -11.71;

const OPTIONS = {
  joinType: "sharp",
  capType: "flat",
  offsetSignMode: "direct",
  trimSelfIntersections: true,
};

describe("closed/open self-intersection loop preservation", () => {
  it("closed contour keeps detached loop as separate contour when open counterpart still has visible loop", async () => {
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const open = await engine.processPath(OPEN_PATH, DISTANCE, OPTIONS);
    const closed = await engine.processPath(CLOSED_PATH, DISTANCE, OPTIONS);

    const openSegs = open.contours?.[0]?.segments ?? [];
    const openArc = openSegs.find((seg) => seg.type === "arc");

    expect(open.contours.length, "open control contour should be produced").toBe(1);
    expect(openArc, "open control contour should still contain the loop arc").toBeTruthy();
    expect(openArc?.arc?.radius ?? 0).toBeCloseTo(1.29, 2);

    expect(
      closed.contours.length,
      "closed contour should split self-intersection into separate contours, not drop the loop immediately"
    ).toBeGreaterThanOrEqual(2);

    const closedArcContours = closed.contours.filter((contour) =>
      (contour.segments ?? []).some((seg) => seg.type === "arc")
    );
    expect(closedArcContours.length, "one of closed split contours should preserve the loop arc").toBeGreaterThanOrEqual(1);

    const hasSmallLoop = closed.contours.some((contour) => {
      const box = contour.bbox;
      if (!box) return false;
      return box.maxX - box.minX < 15 && box.maxY - box.minY < 20;
    });
    expect(hasSmallLoop, "closed result should keep a compact detached loop contour").toBe(true);
  });
});
