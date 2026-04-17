import { describe, it } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

describe("tmp contour46 -> -1", () => {
  it("prints output", async () => {
    const path46 = "M -23 -12.6791 L 54.2516 -14.6104 L 14.2008 47.4684 L 9.6199 54.5688 L 0 48.3624 L 0 49.8066 L -23 49.8066 L -23 38.3066 L -23 -12.6791";
    const opts = { joinType: "sharp", capType: "flat", offsetSignMode: "direct", trimSelfIntersections: true };
    const engine = new OffsetEngine({ exportModule: new ExportModule(), joinType: "sharp", capType: "flat" });
    const r = await engine.processPath(path46, -1, opts);
    console.log("path=", r.pathData);
    console.log("contours:", r.contours?.length ?? 0);
    (r.contours || []).forEach((c, idx) => {
      console.log(` contour ${idx}: closed=${c.closed} segs=${c.segments?.length || 0} area=${(c.area || 0).toFixed(4)}`);
      (c.segments || []).forEach((s, i) => {
        console.log(`  ${i} ${s.type} (${s.start.x.toFixed(4)},${s.start.y.toFixed(4)})=>(${s.end.x.toFixed(4)},${s.end.y.toFixed(4)})`);
      });
    });
  });
});
