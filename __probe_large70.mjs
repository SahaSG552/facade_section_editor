import { buildOffsetContour } from "./src/operations/OffsetContourBuilder.js";

function parsePath(d) {
  const segs = [];
  const cmds = d.match(/[MmLlAaZz][^MmLlAaZz]*/g) || [];
  let cx = 0,
    cy = 0,
    sx = 0,
    sy = 0;
  for (const cmd of cmds) {
    const type = cmd[0].toUpperCase();
    const nums = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (type === "M") {
      cx = nums[0];
      cy = nums[1];
      sx = cx;
      sy = cy;
    } else if (type === "L") {
      const ex = nums[0],
        ey = nums[1];
      segs.push({
        type: "line",
        start: { x: cx, y: cy },
        end: { x: ex, y: ey },
      });
      cx = ex;
      cy = ey;
    } else if (type === "A") {
      const [rx, ry, rot, laf, sf, ex, ey] = nums;
      segs.push({
        type: "arc",
        start: { x: cx, y: cy },
        end: { x: ex, y: ey },
        arc: { rx, ry, xRotation: rot, largeArcFlag: laf, sweepFlag: sf },
      });
      cx = ex;
      cy = ey;
    } else if (type === "Z") {
      cx = sx;
      cy = sy;
    }
  }
  return segs;
}

// Large contour (r=71.0111) - the actual failing case from summary
const largePath =
  "M -4.7823 -84.5036 L -11.5511 -90.3054 L -69.8641 -36.478 A 71.0111 71.0111 0 0 0 8.181 76.4487 A 71.0111 71.0111 0 0 0 56.0275 -52.2145 L -4.3265 -84.9288 L -4.7823 -84.5036";
const segs = parsePath(largePath);

console.log("Source segments:");
segs.forEach((s, i) => {
  if (s.type === "line") {
    const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
    console.log(
      `  [${i}] line ${s.start.x.toFixed(4)},${s.start.y.toFixed(4)} -> ${s.end.x.toFixed(4)},${s.end.y.toFixed(4)}  len=${len.toFixed(4)}`,
    );
  } else {
    console.log(
      `  [${i}] arc  ${s.start.x.toFixed(4)},${s.start.y.toFixed(4)} -> ${s.end.x.toFixed(4)},${s.end.y.toFixed(4)}  r=${s.arc.rx} sweep=${s.arc.sweepFlag}`,
    );
  }
});
console.log("");

const result = buildOffsetContour(segs, 70, {
  joinType: "sharp",
  closed: true,
});
console.log("Raw buildOffsetContour d=70 ->", result.length, "segments:");
const first = result[0],
  last = result[result.length - 1];
if (first && last) {
  const gap = Math.hypot(
    last.end.x - first.start.x,
    last.end.y - first.start.y,
  );
  console.log("  closed gap:", gap.toFixed(4));
}
for (const s of result) {
  if (s.type === "line") {
    const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
    const flag = len < 1 ? " *** SHORT ***" : "";
    console.log(
      `  L [src${s.__sourceIndex}] ${s.start.x.toFixed(3)},${s.start.y.toFixed(3)} -> ${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}  len=${len.toFixed(4)}${flag}`,
    );
  } else if (s.type === "arc") {
    const rv = s.arc?.radius ?? s.arc?.r ?? s.arc?.rx ?? "?";
    console.log(
      `  A [src${s.__sourceIndex}] r=${typeof rv === "number" ? rv.toFixed(3) : rv}  ${s.start.x.toFixed(3)},${s.start.y.toFixed(3)} -> ${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}`,
    );
  }
}
