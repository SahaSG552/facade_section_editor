// Diagnostic for user's exact failing case
// offset by 2 inward breaks parallelism

import { calculateOffsetFromPathData } from "./src/operations/OffsetEngine.js";

/**
 * User's failing case:
 * "вот оффсет 2 внутрь, нарушается параллелизм как раз из за того,
 *  что одна линия не выродилась и стала непараллельна оригинальному контуру"
 *
 * Translation: "offset by 2 inward breaks parallelism exactly because one line 
 *  didn't degenerate and became non-parallel to the original contour"
 */

const source = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const offset = -2;

console.log("=== User Parallelism Case ===");
console.log("Source:", source);
console.log("Offset:", offset);
console.log("");

try {
  const pathResult = calculateOffsetFromPathData(source, offset, { 
    join: "round",
    cap: "round",
    trim: true 
  });
  
  console.log("Result path:", pathResult);
} catch (err) {
  console.error("Error:", err.message);
  console.error(err.stack);
}

function parseSegments(path) {
  const segments = [];
  const regex = /([MLACQZmlacqz])([^MLACQZmlacqz]*)/g;
  let match;
  
  while ((match = regex.exec(path)) !== null) {
    const cmd = match[1];
    const args = match[2].trim().split(/[\s,]+/).filter(x => x);
    segments.push({
      type: cmd,
      data: args.map(x => parseFloat(x))
    });
  }
  
  return segments;
}
