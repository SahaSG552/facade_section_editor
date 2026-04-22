import { OffsetEngine } from "./src/operations/OffsetEngine.js";
import ExportModule from "./src/export/ExportModule.js";
const path4 =
  "M 1.6719 3.7154 L 1.6 4.003 L 1.6 1.6 L 8.4 1.6 L 8.4 1.7931 L 1.6719 3.7154";
const engine = new OffsetEngine({ exportModule: new ExportModule() });
for (const d of [0.08, 0.09, 0.1, 0.11, 0.12]) {
  const t = await engine.processPath(path4, d); // trim on
  const n = await engine.processPath(path4, d, {
    trimSelfIntersections: false,
  });
  console.log(`d=${d} trim contours=${t.contours.length} path=${t.pathData}`);
  console.log(`d=${d} noTrim contours=${n.contours.length} path=${n.pathData}`);
}
