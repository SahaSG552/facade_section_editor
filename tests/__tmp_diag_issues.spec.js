import { describe, it } from "vitest";
import { OffsetEngine } from "./src/operations/OffsetEngine.js";
import ExportModule from "./src/export/ExportModule.js";

const PATH = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";
const OPTS = { joinType: "sharp", capType: "flat", offsetSignMode: "direct", trimSelfIntersections: false };

describe("diag", () => {
  it("inward arc grows", async () => {
    const engine = new OffsetEngine({ exportModule: new ExportModule() });
    console.log("=== Issue 1: inward (positive d), arc grows ===");
    for (const d of [12, 13, 14, 15, 16]) {
      const r = await engine.processPath(PATH, d, OPTS);
      const segs = r?.contours?.[0]?.segments ?? [];
      const types = segs.map(s=>s.type[0]).join('');
      const arcSeg = segs.find(s=>s.type==='arc');
      const arcInfo = arcSeg ? ` arc_r=${arcSeg.arc?.radius?.toFixed(2)} end=(${arcSeg.end?.x?.toFixed(2)},${arcSeg.end?.y?.toFixed(2)})` : '';
      console.log(`d=+${d}: n=${segs.length} [${types}]${arcInfo}`);
    }
  });
  it("outward extra bridge", async () => {
    const engine = new OffsetEngine({ exportModule: new ExportModule() });
    console.log("\n=== Issue 2: outward (negative d), extra bridge ===");
    for (const d of [-1, -2, -3, -4, -5]) {
      const r = await engine.processPath(PATH, d, OPTS);
      const segs = r?.contours?.[0]?.segments ?? [];
      const types = segs.map(s=>s.type[0]).join('');
      console.log(`d=${d}: n=${segs.length} [${types}]`);
      segs.forEach((s,i) => {
        const x1 = s.start?.x?.toFixed(3) ?? '?';
        const y1 = s.start?.y?.toFixed(3) ?? '?';
        const x2 = s.end?.x?.toFixed(3) ?? '?';
        const y2 = s.end?.y?.toFixed(3) ?? '?';
        const extra = s.type==='arc' ? ` r=${s.arc?.radius?.toFixed(2)}` : '';
        console.log(`  [${i}] ${s.type}${extra} (${x1},${y1})->(${x2},${y2})`);
      });
    }
  });
});
