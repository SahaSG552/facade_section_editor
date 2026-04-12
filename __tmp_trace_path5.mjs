import { OffsetEngine } from "./src/operations/OffsetEngine.js";
import ExportModule from "./src/export/ExportModule.js";
import { buildOffsetContour } from "./src/operations/OffsetContourBuilder.js";
import { offsetSegment } from "./src/operations/OffsetCurveEvaluator.js";

const path5 = "M 2.0703 4.1008 L 1.129 7.8662 A 0.2942 0.2942 0 0 1 1.12 7.8483 L 1.12 1.12 L 8.88 1.12 L 8.88 2.1552 L 2.0703 4.1008";
const engine = new OffsetEngine({ exportModule: new ExportModule() });
const segs = engine._parsePathData(path5, { exportModule: new ExportModule() });
console.log("source segs", segs.length);
segs.forEach((s,i)=>{
  const r = s.type==='arc' ? ` r=${s.arc?.radius ?? s.arc?.rx}` : '';
  console.log(`${i}: ${s.type}${r} (${s.start.x.toFixed(4)},${s.start.y.toFixed(4)}) -> (${s.end.x.toFixed(4)},${s.end.y.toFixed(4)})`);
});
const d=-0.38;
console.log(`\nOffset each at d=${d}`);
segs.forEach((s,i)=>{
  const o = offsetSegment(s,d);
  if(!o){ console.log(`${i}: NULL from ${s.type}`); return; }
  const r = o.type==='arc' ? ` r=${o.arc?.radius}` : '';
  console.log(`${i}: ${o.type}${r} (${o.start.x.toFixed(4)},${o.start.y.toFixed(4)}) -> (${o.end.x.toFixed(4)},${o.end.y.toFixed(4)})`);
});
const built = buildOffsetContour(segs,d,{joinType:'sharp',capType:'round'});
console.log(`\nbuildOffsetContour segs=${built.length}`);
built.forEach((s,i)=>{
  const r = s.type==='arc' ? ` r=${s.arc?.radius}` : '';
  console.log(`${i}: ${s.type}${r} (${s.start.x.toFixed(4)},${s.start.y.toFixed(4)}) -> (${s.end.x.toFixed(4)},${s.end.y.toFixed(4)})`);
});
