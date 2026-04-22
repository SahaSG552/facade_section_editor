import ExportModule from "./src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "./src/operations/CustomOffsetProcessor.js";

const em = new ExportModule();
const p69 =
  "M -8.5958 8.6531 L -15.1491 15.2065 A 1.5478 1.5478 0 0 0 -13.901 17.9432 L -5.3705 10.2658 L -8.5958 8.6531 Z";
const p1 = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const ds = [-2, -1.5, -1, -0.5, -0.25, 0.25, 0.5, 1, 1.5, 2];

function run(name, pathData) {
  console.log(`--- ${name} ---`);
  for (const d of ds) {
    const out = calculateOffsetFromPathData(pathData, d, {
      exportModule: em,
      trimSelfIntersections: false,
      useArcApproximation: true,
      join: "sharp",
      cap: "flat",
    });

    const parsed = em.dxfExporter.parseSVGPathSegments(
      out,
      0,
      0,
      (y) => y,
      false,
    );
    const xs = parsed
      .flatMap((s) => [s.start?.x, s.end?.x])
      .filter(Number.isFinite);
    const ys = parsed
      .flatMap((s) => [s.start?.y, s.end?.y])
      .filter(Number.isFinite);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const arcCount = (String(out).match(/[Aa]/g) || []).length;

    const bad =
      !Number.isFinite(minX) ||
      Math.abs(minX) > 200 ||
      Math.abs(maxX) > 200 ||
      Math.abs(minY) > 200 ||
      Math.abs(maxY) > 200;

    console.log(
      `d=${d} seg=${parsed.length} arc=${arcCount} bbox=[${minX.toFixed(3)},${maxX.toFixed(3)},${minY.toFixed(3)},${maxY.toFixed(3)}] ${bad ? "BAD" : ""}`,
    );

    if (d === 0.5 || d === -1.5 || d === 1 || d === -1) {
      console.log(`  ${out}`);
    }
  }
}

run("p69", p69);
run("p1", p1);
