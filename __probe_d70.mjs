import { buildOffsetContour } from "./src/operations/OffsetContourBuilder.js";
import { parseSVGPath } from "./src/utils/pathParser.js";

const path =
  "M -4.7823 -84.5036 L -11.5511 -90.3054 L -69.8641 -36.478 A 71.0111 71.0111 0 0 0 8.181 76.4487 A 71.0111 71.0111 0 0 0 56.0275 -52.2145 L -4.3265 -84.9288 L -4.7823 -84.5036";
const segs = parseSVGPath(path);
console.log("source segs:", segs.length);
segs.forEach((s, i) => {
  const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
  console.log(
    `  seg[${i}] ${s.type} start=(${s.start.x.toFixed(3)},${s.start.y.toFixed(3)}) end=(${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}) chord=${len.toFixed(4)}`,
  );
});

for (const d of [-63, -68, -70, -72]) {
  const result = buildOffsetContour(segs, d, {
    joinType: "sharp",
    capType: "flat",
  });
  console.log(`\nd=${d}: ${result.length} segs`);
  result.forEach((s, i) => {
    const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
    console.log(
      `  [${i}] ${s.type} start=(${s.start.x.toFixed(3)},${s.start.y.toFixed(3)}) end=(${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}) chord=${len.toFixed(4)}`,
    );
  });
}
