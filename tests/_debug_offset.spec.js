import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

test("debug offset forward vs reversed", async () => {
  const exportModule = new ExportModule();
  const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });

  const forwardPath = "M 10 10 L 2 10 A 2 2 0 0 1 0 8 L 0 16";
  const reversedPath = "M 0 16 L 0 8 A 2 2 0 0 0 2 10 L 10 10";

  const f = await engine.processPath(forwardPath, -2);
  const r = await engine.processPath(reversedPath, 2);

  console.log("Forward (-2) segments:", JSON.stringify(f.contours[0]?.segments.map(s=>({type:s.type, start:s.start, end:s.end, r:s.arc?.radius}))));
  console.log("Reversed (+2) segments:", JSON.stringify(r.contours[0]?.segments.map(s=>({type:s.type, start:s.start, end:s.end, r:s.arc?.radius}))));

  expect(true).toBe(true);
});
