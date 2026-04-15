import OffsetEngine from "./src/operations/OffsetEngine.js";
import ExportModule from "./src/export/ExportModule.js";
const exportModule = new ExportModule();
const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
const path = "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0";
for (const d of [70, 71, 72, 72.5, 73, 73.5, 74, 75, 80, 90]) {
  const result = await engine.processPath(path, d, {});
  for (let ci = 0; ci < result.contours.length; ci++) {
    const c = result.contours[ci];
    const segs = c.segments;
    console.log(`d=${d} contour[${ci}] segs=${segs.length}`);
    segs.forEach((s, i) => {
      const chord = Math.hypot(s.end.x-s.start.x, s.end.y-s.start.y);
      console.log(`  [${i}] ${s.type} chord=${chord.toFixed(3)} start=(${s.start.x.toFixed(3)},${s.start.y.toFixed(3)}) end=(${s.end.x.toFixed(3)},${s.end.y.toFixed(3)})`);
    });
  }
}
