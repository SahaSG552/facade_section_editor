#!/usr/bin/env node
/**
 * Verify d=10,11,12 segment progression for dropped-gap bridge overshoot fix
 */

import { buildOffsetContour } from "./src/operations/OffsetContourBuilder.js";

function toPathTuples(segments) {
  return segments.map((seg) => [
    seg.type,
    Number(seg.start.x.toFixed(6)),
    Number(seg.start.y.toFixed(6)),
    Number(seg.end.x.toFixed(6)),
    Number(seg.end.y.toFixed(6)),
  ]);
}

const segments = [
  {
    type: "line",
    start: { x: 10, y: 10 },
    end: { x: 2, y: 10 },
  },
  {
    type: "arc",
    start: { x: 2, y: 10 },
    end: { x: 0, y: 8 },
    arc: {
      centerX: 2,
      centerY: 8,
      center: { x: 2, y: 8 },
      radius: 2,
      startAngle: 90,
      endAngle: 180,
      sweepFlag: 1,
    },
  },
  {
    type: "line",
    start: { x: 0, y: 8 },
    end: { x: 0, y: 16 },
  },
];

console.log("Verifying gap-bridge overshoot propagation fix\n");

for (const d of [10, 11, 12]) {
  const result = buildOffsetContour(segments, d, {
    joinType: "sharp",
    capType: "flat",
    skipCap: true,
  });

  console.log(`d=${d}:`);
  console.log("Segments:", toPathTuples(result));

  // Find first vertical segment
  const firstVertical = result.find((seg) => {
    const dx = Math.abs(seg.end.x - seg.start.x);
    const dy = Math.abs(seg.end.y - seg.start.y);
    return dx < 0.5 && dy > 1;
  });

  if (firstVertical) {
    console.log(
      `  First vertical segment x-start: ${firstVertical.start.x.toFixed(2)}`
    );
    console.log(
      `  Expected x-start for d=${d}: ${d}`
    );
  } else {
    console.log("  No vertical segment found");
  }
  console.log();
}
