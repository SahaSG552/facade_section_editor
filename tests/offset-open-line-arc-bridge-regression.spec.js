import { describe, it, expect } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const CLOSED_PATH = "M -10 0 L 22 -1 L 10 30 A 13 13 0 0 0 -10 30 L -10 0";
const OPEN_PATH = "M 82 -1 L 70 30 A 13 13 0 0 0 50 30 L 50 0";

const OPTIONS = {
  joinType: "sharp",
  capType: "flat",
  offsetSignMode: "direct",
};

describe("open line-arc dropped-gap regression", () => {
  it("direct d=-4 keeps surviving arc for open contour", async () => {
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const closed = await engine.processPath(CLOSED_PATH, -4, OPTIONS);
    const open = await engine.processPath(OPEN_PATH, -4, OPTIONS);

    const closedSegs = closed.contours?.[0]?.segments ?? [];
    const openSegs = open.contours?.[0]?.segments ?? [];

    const closedArc = closedSegs.find((s) => s.type === "arc");
    const openArc = openSegs.find((s) => s.type === "arc");

    expect(closedArc, "closed control contour should still contain an arc at d=-4").toBeTruthy();
    expect(openArc, "open contour should not lose arc when projected radius is still positive").toBeTruthy();

    expect(closedArc?.arc?.radius ?? 0).toBeCloseTo(9, 6);
    expect(openArc?.arc?.radius ?? 0).toBeCloseTo(9, 6);
  });
});
