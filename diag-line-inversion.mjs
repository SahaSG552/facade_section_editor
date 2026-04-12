import { OffsetEngine } from "./src/operations/OffsetEngine.js";
import ExportModule from "./src/export/ExportModule.js";
import { isSegmentDegenerated } from "./src/operations/OffsetRules.js";

const SRC_PATH = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const exportModule = new ExportModule();

async function diagnose() {
  const engine = new OffsetEngine({ exportModule });
  
  console.log("=== OFFSETTING BY 0.33 (INWARD) ===\n");
  const result = await engine.processPath(SRC_PATH, 0.33);
  
  console.log(`Generated ${result.contours.length} contour(s)\n`);
  
  result.contours.forEach((contour, contourIdx) => {
    console.log(`\n=== Contour ${contourIdx} ===`);
    console.log(`Segments: ${contour.segments.length}`);
    
    contour.segments.forEach((seg, segIdx) => {
      const start = seg.start ?? seg.data?.start;
      const end = seg.end ?? seg.data?.end;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      
      const isDegenerate = isSegmentDegenerated(seg);
      const degLabel = isDegenerate ? ' [DEGENERATE]' : '';
      
      console.log(`  [${segIdx}] ${seg.type.toUpperCase()} from (${start.x.toFixed(4)}, ${start.y.toFixed(4)}) to (${end.x.toFixed(4)}, ${end.y.toFixed(4)}) | len=${length.toFixed(6)}${degLabel}`);
      
      if (length < 0.05 && length > 1e-9) {
        console.log(`      ⚠️  NEAR-DEGENERATE (length ${length.toFixed(6)} < 0.05)`);
      }
    });
  });
  
  // Convert to path and check if it contains inverted segments
  console.log(`\n=== path output ===`);
  console.log(result.pathData);
}

diagnose().catch(console.error);
