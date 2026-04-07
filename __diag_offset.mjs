import { buildOffsetContour } from "./src/operations/OffsetContourBuilder.js";

const arcCenterX = 2.000076719831662;
const arcCenterY = 8.00000000098099;
const arcStartAngle = 90.00146524085324 * (Math.PI / 180);
const arcEndAngle = 109.47277476455787 * (Math.PI / 180);

function makeSegments() {
  return [
    { type: "line", start: { x: 10, y: 11 }, end: { x: 2, y: 11 } },
    {
      type: "arc",
      start: { x: 2, y: 11 },
      end: { x: 1, y: 10.8284 },
      arc: {
        centerX: arcCenterX, centerY: arcCenterY,
        center: { x: arcCenterX, y: arcCenterY },
        radius: 3, startAngle: arcStartAngle, endAngle: arcEndAngle, sweepFlag: 1,
      },
    },
    { type: "line", start: { x: 1, y: 10.8284 }, end: { x: 1, y: 16 } },
  ];
}

// What should the geometry be?
// Horizontal line L 2 11 offset by d in +y -> y becomes 11+d, x stays
// Vertical line L 1 16 offset by d in +x -> x becomes 1+d
// Arc center (2,8), radius 3:
//   At d, new radius = ? and endpoints = ?
const cx = arcCenterX, cy = arcCenterY;
console.log("=== Geometric analysis ===");
for (const d of [1, 2, 3, 4]) {
  // Expected offset horizontal line end: (2, 11+d)
  // Expected offset vertical line: x = 1+d
  // Arc must connect these two. Center stays at (cx, cy):
  const startX = 2, startY = 11 + d;
  const r = Math.sqrt((startX - cx) ** 2 + (startY - cy) ** 2);
  // End must be on arc AND on vertical line x = 1+d
  const endX = 1 + d;
  const endDist2 = (endX - cx) ** 2;
  const endY2sq = r * r - endDist2;
  const endY = endY2sq >= 0 ? cy + Math.sqrt(endY2sq) : null;
  console.log(`d=${d}: arc r=${r.toFixed(4)}, start=(${startX},${startY}), end=(${endX?.toFixed(4)},${endY?.toFixed(4)})`);
  if (endY !== null && Math.abs(startX - endX) < 1e-9 && Math.abs(startY - endY) < 1e-9) {
    console.log(`  -> ARC DEGENERATES (start==end)`);
  }
}

console.log("\n=== Actual code output ===");
for (const d of [1, 2, 3]) {
  console.log(`\n--- d=${d} ---`);
  const res = buildOffsetContour(makeSegments(), d, { joinType: "sharp", capType: "flat", skipCap: true });
  res.forEach((s, i) => {
    const r = s.arc ? ` r=${s.arc.radius?.toFixed(4)} center=(${(s.arc.centerX ?? s.arc.center?.x)?.toFixed(4)},${(s.arc.centerY ?? s.arc.center?.y)?.toFixed(4)})` : '';
    console.log(`  seg[${i}] ${s.type} (${s.start.x.toFixed(4)},${s.start.y.toFixed(4)}) -> (${s.end.x.toFixed(4)},${s.end.y.toFixed(4)})${r}`);
  });
}
