import { OffsetEngine } from "./src/operations/OffsetEngine.js";
import ExportModule from "./src/export/ExportModule.js";

const SRC_PATH = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const exportModule = new ExportModule();

async function testSequentialOffset() {
  const engine = new OffsetEngine({ exportModule });
  
  console.log("=== SEQUENTIAL OFFSET TEST ===\n");
  
  // Apply offset multiple times to see if near-degenerate inversion happens
  let path = SRC_PATH;
  for (let pass = 1; pass <= 3; pass++) {
    console.log(`\nPass ${pass}: Offset by 0.33`);
    const result = await engine.processPath(path, 0.33);
    
    console.log(`  Contours: ${result.contours.length}`);
    result.contours.forEach((c, i) => {
      console.log(`    [${i}]: ${c.segments.length} segments`);
      let totalLen = 0;
      c.segments.forEach(s => {
        const dist = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
        totalLen += dist;
        if (dist < 0.05 && dist > 0.001) {
          console.log(`      ⚠️ NEAR-DEGENERATE: len=${dist.toFixed(6)}`);
        }
      });
      console.log(`      Total length: ${totalLen.toFixed(4)}`);
    });
    
    path = result.pathData;
  }
}

testSequentialOffset().catch(console.error);
