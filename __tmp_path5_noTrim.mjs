import { OffsetEngine } from "./src/operations/OffsetEngine.js";
import ExportModule from "./src/export/ExportModule.js";
const path5 = "M 2.0703 4.1008 L 1.129 7.8662 A 0.2942 0.2942 0 0 1 1.12 7.8483 L 1.12 1.12 L 8.88 1.12 L 8.88 2.1552 L 2.0703 4.1008";
const engine = new OffsetEngine({ exportModule: new ExportModule() });
for (const d of [0.2,0.25,0.3,0.35,0.38,0.4,0.42,0.5]) {
  const r = await engine.processPath(path5, d, { trimSelfIntersections: false });
  console.log(`d=${d} contours=${r.contours.length} path=${r.pathData}`);
  for (let i=0;i<r.contours.length;i++) {
    const c=r.contours[i];
    const arcs=c.segments.filter(s=>s.type==="arc").length;
    console.log(`  c${i}: segs=${c.segments.length} arcs=${arcs} area=${c.area}`);
  }
}
