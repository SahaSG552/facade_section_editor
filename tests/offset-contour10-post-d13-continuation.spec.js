import { describe, it, expect } from "vitest";

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const CONTOUR10 = "M -10 0 L 30 -1 L 10 30 A 13 13 0 0 0 -10 30 L -10 0";

const OPTS = {
  joinType: "sharp",
  capType: "flat",
  offsetSignMode: "direct",
  trimSelfIntersections: true,
};

describe("contour10 post-collapse continuity", () => {
  it("closed direct d=-14 remains a valid closed contour after arc collapse", async () => {
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const direct = await engine.processPath(CONTOUR10, -14, OPTS);
    const directSegments = direct.contours?.[0]?.segments ?? [];
    const directArcs = directSegments.filter((segment) => segment.type === "arc");

    expect(direct.contours.length, "direct post-collapse offset should keep one closed contour").toBe(1);
    expect(direct.contours[0].closed, "post-collapse contour must remain closed").toBe(true);
    expect(directArcs.length, "arc should be degenerated and removed by d=-14").toBe(0);
    expect(direct.pathData.includes("NaN"), "post-collapse path must not contain NaN").toBe(false);
  });
});
