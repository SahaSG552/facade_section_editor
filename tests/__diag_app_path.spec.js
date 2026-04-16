import { describe, it } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const CLOSED_PATH = "M -10 0 L 10 0 L 10 30 A 13 13 0 0 0 -10 30 L -10 0";
const OPEN_PATH   = "M 60 0 L 60 30 A 13 13 0 0 0 40 30 L 40 0";
const APP_OPTS = { joinType: "sharp", capType: "flat", offsetSignMode: "direct" };

function fmt(n) { return n.toFixed(4); }
function fmtPt(p) { return "(" + fmt(p.x) + "," + fmt(p.y) + ")"; }
function dumpResult(label, segs) {
  console.log("  " + label + ": " + segs.length + " segs");
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.type === "line") console.log("    " + i + " " + fmtPt(s.start) + "->" + fmtPt(s.end));
    else if (s.type === "arc") console.log("    " + i + " arc r=" + fmt(s.arc?.radius||0));
  }
}

describe("app code path: closed vs open U-contour", () => {
  it("traces d=12..16 via direct mode", async () => {
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({ exportModule, joinType: "sharp", capType: "flat" });
    for (const appD of [12, 13, 14, 15, 16]) {
      const effD = -appD;
      console.log("\n=== d=" + appD + " ===");
      const cr = await engine.processPath(CLOSED_PATH, effD, APP_OPTS);
      dumpResult("CLOSED", cr?.contours?.[0]?.segments ?? []);
      const or = await engine.processPath(OPEN_PATH, effD, APP_OPTS);
      dumpResult("OPEN  ", or?.contours?.[0]?.segments ?? []);
    }
  });
});
