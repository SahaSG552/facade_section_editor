// Diagnostic script for near-degenerate line inversion issue
import ExportModule from "./src/export/ExportModule.js";

async function testNearDegenerateLineInversion() {
  const exportModule = new ExportModule();
  const { OffsetEngine } = await import("./src/operations/OffsetEngine.js");
  const engine = new OffsetEngine({ exportModule });

  // Source path: closed contour with arc (user's contourId:1)
  const sourcePath = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5";

  console.log("=== STEP 1: Inward offset d=-1.4 (user's contourId:5) ===");
  const step1Result = await engine.processPath(sourcePath, -1.4);
  console.log("  pathData:", step1Result.pathData);
  console.log("  contours:", step1Result.contours.length);
  if (step1Result.contours[0]) {
    const segs1 = step1Result.contours[0].segments;
    console.log("  segments:", segs1.length);
    segs1.forEach((seg, i) => {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const len = Math.hypot(dx, dy);
      const typeStr = seg.type === "arc" ? `arc(r=${seg.arc?.radius?.toFixed(4)})` : seg.type;
      console.log(
        `    [${i}] ${typeStr.padEnd(20)} (${seg.start.x.toFixed(4)}, ${seg.start.y.toFixed(4)}) -> (${seg.end.x.toFixed(4)}, ${seg.end.y.toFixed(4)}) len=${len.toFixed(6)}`
      );
    });
  }

  const step1Path = step1Result.pathData;

  console.log("\n=== STEP 2: Further inward offset d=-0.1 (user's contourId:3 / 4) ===");
  const step2Result = await engine.processPath(step1Path, -0.1);
  console.log("  pathData:", step2Result.pathData);
  console.log("  contours:", step2Result.contours.length);
  if (step2Result.contours[0]) {
    const segs2 = step2Result.contours[0].segments;
    console.log("  segments:", segs2.length);
    
    let foundNearDegenerates = false;
    segs2.forEach((seg, i) => {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      const len = Math.hypot(dx, dy);
      const typeStr = seg.type === "arc" ? `arc(r=${seg.arc?.radius?.toFixed(4)})` : seg.type;
      const isNearDegen = seg.type !== "arc" && len < 0.05;
      
      if (isNearDegen) foundNearDegenerates = true;
      
      const marker = isNearDegen ? " <-- NEAR-DEGENERATE!" : "";
      console.log(
        `    [${i}] ${typeStr.padEnd(20)} (${seg.start.x.toFixed(4)}, ${seg.start.y.toFixed(4)}) -> (${seg.end.x.toFixed(4)}, ${seg.end.y.toFixed(4)}) len=${len.toFixed(6)}${marker}`
      );
    });

    if (foundNearDegenerates) {
      console.log("\n  WARNING: Near-degenerate segments found - this indicates inversion/erosion issue!");
    }
  }
}

testNearDegenerateLineInversion()
  .then(() => console.log("\nDone."))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
