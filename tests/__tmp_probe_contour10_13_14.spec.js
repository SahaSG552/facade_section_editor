import { describe, it } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

describe("tmp probe contour10 d13/d14", () => {
  it("prints direct and sequential outputs", async () => {
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

    const summarize = (label, result) => {
      console.log("----", label, "----");
      console.log("path=", result.pathData);
      console.log("contours:", result.contours?.length ?? 0);
      (result.contours || []).forEach((c, idx) => {
        console.log(
          ` contour ${idx}: closed=${c.closed} segs=${c.segments?.length || 0} area=${Number((c.area || 0).toFixed(4))}`
        );
        (c.segments || []).forEach((s, i) => {
          const arcTail = s.type === "arc"
            ? ` r=${s.arc?.radius?.toFixed(4)} sf=${s.arc?.sweepFlag}`
            : "";
          console.log(
            `  ${i} ${s.type} (${s.start.x.toFixed(4)},${s.start.y.toFixed(4)})=>(${s.end.x.toFixed(4)},${s.end.y.toFixed(4)})${arcTail}`
          );
        });
      });
    };

    const r13 = await engine.processPath(path, -13, opts);
    summarize("direct d=-13", r13);

    const r14 = await engine.processPath(path, -14, opts);
    summarize("direct d=-14", r14);

    const seq = await engine.processPath(r13.pathData, -1, opts);
    summarize("sequential d=-13 then -1", seq);
  });
});
