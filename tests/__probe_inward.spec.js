import { describe, it } from "vitest";
import OffsetEngine from "../src/operations/OffsetEngine.js";

const engine = new OffsetEngine();
const source = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";
const opts = { joinType:"sharp", capType:"flat", offsetSignMode:"direct", trimSelfIntersections: false };

describe("probe inward/outward", () => {
  it("inward offsets (negative d going into U bowl)", () => {
    for (const d of [-13, -14, -15, -16]) {
      const r = engine.calculateOffsetFromPathData(source, d, opts);
      const segs = r?.contours?.[0]?.segments?.length ?? "?";
      console.log(`d=${d} (${segs} segs): ${r?.pathData ?? "null"}`);
    }
  });
  it("outward offsets (positive d going away from U bowl)", () => {
    for (const d of [1, 2, 3, 4, 5, 6]) {
      const r = engine.calculateOffsetFromPathData(source, d, opts);
      const segs = r?.contours?.[0]?.segments?.length ?? "?";
      console.log(`d=+${d} (${segs} segs): ${r?.pathData ?? "null"}`);
    }
  });
});
