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
  it("closed direct d=-14 matches sequential d=-13 then -1", async () => {
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const direct = await engine.processPath(CONTOUR10, -14, OPTS);

    const atCollapse = await engine.processPath(CONTOUR10, -13, OPTS);
    const sequential = await engine.processPath(atCollapse.pathData, -1, OPTS);

    expect(
      direct.pathData,
      "direct post-collapse offset should follow the same topology branch as sequential continuation"
    ).toBe(sequential.pathData);
  });
});
