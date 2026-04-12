import { OffsetEngine } from "./src/operations/OffsetEngine.js";
import ExportModule from "./src/export/ExportModule.js";
const path4 = "M 1.6719 3.7154 L 1.6 4.003 L 1.6 1.6 L 8.4 1.6 L 8.4 1.7931 L 1.6719 3.7154";
const target = "M 1.7 3.1907 L 1.7 1.7 L 8.3 1.7 L 8.3 1.7177 L 1.5889 3.6351 L 1.7 3.1907";
const engine = new OffsetEngine({ exportModule: new ExportModule() });
for (const d of [-0.3,-0.2,-0.15,-0.12,-0.1,-0.08,-0.06,-0.05,-0.04,0.04,0.05,0.06,0.08,0.1,0.12]) {
  const r = await engine.processPath(path4, d, { trimSelfIntersections:false });
  const c = r.contours?.[0];
  const segs = c?.segments ?? [];
  const tiny = segs.filter(s=>s.type==='line').map(s=>Math.hypot(s.end.x-s.start.x,s.end.y-s.start.y)).sort((a,b)=>a-b)[0] ?? 0;
  const match = r.pathData?.includes("8.300000 1.717") || r.pathData?.includes("8.300000 1.7177");
  console.log(`d=${d} segs=${segs.length} tiny=${tiny.toFixed(6)} match=${match}`);
  if (match) console.log(`  ${r.pathData}`);
}
