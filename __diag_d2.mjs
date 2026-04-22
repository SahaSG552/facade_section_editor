import { OffsetEngine } from "./src/operations/OffsetEngine.js";

const src = "M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z";
const engine = new OffsetEngine(src);
const result = engine.offset(2, { trimSelfIntersections: false });
console.log("segments count:", result?.contours?.[0]?.segments?.length);
console.log("path:", result?.contours?.[0]?.path);
