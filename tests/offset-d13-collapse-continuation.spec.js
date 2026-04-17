import { describe, it, expect } from "vitest";

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const CLOSED_PATH = "M -10 0 L 30 -1 L 10 30 A 13 13 0 0 0 -10 30 L -10 0";
const OPEN_PATH = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";

const OPTS = {
  joinType: "sharp",
  capType: "flat",
  offsetSignMode: "direct",
  trimSelfIntersections: true,
};

describe("exact-collapse continuity at d=13", () => {
  it("open and closed direct d=-13 match sequential d=-12.99 then d=-0.01", async () => {
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const closedDirect = await engine.processPath(CLOSED_PATH, -13, OPTS);
    const closedStep1 = await engine.processPath(CLOSED_PATH, -12.99, OPTS);
    const closedSeq = await engine.processPath(closedStep1.pathData, -0.01, OPTS);

    const openDirect = await engine.processPath(OPEN_PATH, -13, OPTS);
    const openStep1 = await engine.processPath(OPEN_PATH, -12.99, OPTS);
    const openSeq = await engine.processPath(openStep1.pathData, -0.01, OPTS);

    expect(closedDirect.pathData, "closed contour should remain continuous through exact arc collapse").toBe(closedSeq.pathData);
    expect(openDirect.pathData, "open contour should remain continuous through exact arc collapse").toBe(openSeq.pathData);

    const openDirectArcs = (openDirect.contours?.[0]?.segments ?? []).filter((s) => s.type === "arc");
    expect(openDirectArcs.length, "open d=-13 should collapse arc and stitch neighbors").toBe(0);

    const closedAfter = await engine.processPath(CLOSED_PATH, -13.5, OPTS);
    expect(closedAfter.contours.length, "closed contour should remain valid after exact collapse").toBe(1);
    expect(closedAfter.contours[0].closed, "post-collapse contour must remain closed").toBe(true);
    expect(closedAfter.pathData.includes("NaN"), "post-collapse path must not contain NaN").toBe(false);
  });
});
