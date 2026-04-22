// Probe: trace the outward offset of contour9 at d=63 and d=70
// Source contour9 is small (r=8.0111 arcs); at d=63 outward -> large contour with tiny closing line
// At d=70 outward -> that tiny closing line should degenerate into a tangential join
import ExportModule from "./src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "./src/operations/CustomOffsetProcessor.js";

const em = new ExportModule();
// Contour 9: small shape with r=8.0111 arcs, closing line from (5.5077,-7.9385) to (-3,0)
const src9 =
  "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0";

// Parse source to show segment info
const srcSegs = em.dxfExporter.parseSVGPathSegments(
  src9,
  0,
  0,
  (y) => y,
  false,
);
console.log("Source segments:", srcSegs.length);
srcSegs.forEach((s, i) => {
  const sx = s.start?.x ?? s.x1,
    sy = s.start?.y ?? s.y1;
  const ex = s.end?.x ?? s.x2,
    ey = s.end?.y ?? s.y2;
  if (sx != null && ex != null) {
    const len = Math.hypot(ex - sx, ey - sy);
    console.log(
      `  seg[${i}] ${s.type || "seg"}: (${(+sx).toFixed(4)},${(+sy).toFixed(4)}) -> (${(+ex).toFixed(4)},${(+ey).toFixed(4)}) len=${len.toFixed(4)}`,
    );
  } else {
    console.log(`  seg[${i}] arc`);
  }
});

// Test at d=63 and d=70 (outward = positive in CustomOffsetProcessor for CW contours...)
// CustomOffsetProcessor uses positive d for outward on CW contours
for (const d of [-63, -70]) {
  console.log(`\n--- offset d=${d} ---`);
  const out = calculateOffsetFromPathData(src9, d, {
    exportModule: em,
    trimSelfIntersections: false,
    useArcApproximation: false,
    join: "sharp",
  });
  const contours = out.split("M ").filter((c) => c.trim());
  console.log(`Output contours: ${contours.length}`);
  for (const [ci, c] of contours.entries()) {
    const path = "M " + c;
    const segs = em.dxfExporter.parseSVGPathSegments(
      path,
      0,
      0,
      (y) => y,
      false,
    );
    console.log(`  Contour ${ci}: ${segs.length} segments`);
    segs.forEach((s, i) => {
      const sx = s.start?.x ?? s.x1,
        sy = s.start?.y ?? s.y1;
      const ex = s.end?.x ?? s.x2,
        ey = s.end?.y ?? s.y2;
      if (sx != null && ex != null) {
        const len = Math.hypot(ex - sx, ey - sy);
        console.log(
          `    [${i}] ${s.type || "seg"}: (${(+sx).toFixed(3)},${(+sy).toFixed(3)}) -> (${(+ex).toFixed(3)},${(+ey).toFixed(3)}) len=${len.toFixed(4)}`,
        );
      } else {
        console.log(`    [${i}] arc`);
      }
    });
  }
}
