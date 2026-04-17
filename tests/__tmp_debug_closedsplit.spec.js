import { describe, it } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

describe("tmp debug closed split", () => {
  it("prints internal split distances", () => {
    const path = "M -10 0 L 30 -1 L 10 30 A 13 13 0 0 0 -10 30 L -10 0";
    const opts = {
      joinType: "sharp",
      capType: "flat",
      offsetSignMode: "direct",
      trimSelfIntersections: true,
    };

    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const resolved = engine._resolveOptions(opts);
    const segs = engine._parsePathData(path, resolved);
    const contour = engine._splitContours(segs)[0];

    const c13 = engine._findDegenerationSplitDistance(contour, -13);
    const c14 = engine._findDegenerationSplitDistance(contour, -14);
    const s13 = engine._findArcLineSeparationSplitDistance(contour, -13);
    const s14 = engine._findArcLineSeparationSplitDistance(contour, -14);

    console.log("collapse d=-13:", c13);
    console.log("collapse d=-14:", c14);
    console.log("separation d=-13:", s13);
    console.log("separation d=-14:", s14);

    const sep13 = engine._buildClosedOffsetWithSeparationSplit(contour, -13, resolved);
    const sep14 = engine._buildClosedOffsetWithSeparationSplit(contour, -14, resolved);
    const cont13 = engine._buildClosedOffsetWithContinuationSplits(contour, -13, resolved);
    const cont14 = engine._buildClosedOffsetWithContinuationSplits(contour, -14, resolved);

    console.log("sep13 segs:", sep13?.length || 0);
    console.log("sep14 segs:", sep14?.length || 0);
    console.log("cont13 segs:", cont13?.length || 0);
    console.log("cont14 segs:", cont14?.length || 0);

    const toPath = (arr) => engine._stitchSegments(arr, true);
    console.log("sep13 stitched segs:", toPath(sep13)?.length || 0);
    console.log("cont13 stitched segs:", toPath(cont13)?.length || 0);
  });
});
