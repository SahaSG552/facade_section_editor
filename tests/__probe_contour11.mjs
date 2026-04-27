import OffsetEngine from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

// The actual failing contour from the summary (contour 11 with r=71.0111)
const path =
  "M -4.7823 -84.5036 L -11.5511 -90.3054 L -69.8641 -36.478 A 71.0111 71.0111 0 0 0 8.181 76.4487 A 71.0111 71.0111 0 0 0 56.0275 -52.2145 L -4.3265 -84.9288 L -4.7823 -84.5036";
const engine = new OffsetEngine({
  joinType: "sharp",
  capType: "flat",
  exportModule: new ExportModule(),
});

const r = await engine.processPath(path, 70, {});
console.log("Large contour (r=71.0111) at d=70:");
console.log("  contours:", r.contours.length);
for (const c of r.contours) {
  console.log("  area:", c.area?.toFixed(2));
  for (const s of c.segments) {
    if (s.type === "line") {
      const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
      const flag = len < 2 ? " *** SHORT ***" : "";
      console.log(
        `    L ${s.start.x.toFixed(3)},${s.start.y.toFixed(3)} -> ${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}  len=${len.toFixed(4)}${flag}`,
      );
    } else {
      const r = s.arc?.radius ?? s.arc?.r ?? s.arc?.rx ?? "?";
      console.log(
        `    A r=${typeof r === "number" ? r.toFixed(3) : r}  ${s.start.x.toFixed(3)},${s.start.y.toFixed(3)} -> ${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}`,
      );
    }
  }
}

// Also check the small contour at offset=70
const path2 =
  "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0";
const engine2 = new OffsetEngine({
  joinType: "sharp",
  capType: "flat",
  exportModule: new ExportModule(),
});
const r2 = await engine2.processPath(path2, 70, {});
console.log("\nSmall contour (r=8.0111) at d=70:");
console.log("  contours:", r2.contours.length);
for (const c of r2.contours) {
  console.log("  area:", c.area?.toFixed(2));
  for (const s of c.segments) {
    if (s.type === "line") {
      const len = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
      const flag = len < 2 ? " *** SHORT ***" : "";
      console.log(
        `    L ${s.start.x.toFixed(3)},${s.start.y.toFixed(3)} -> ${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}  len=${len.toFixed(4)}${flag}`,
      );
    } else {
      const rv = s.arc?.radius ?? s.arc?.r ?? s.arc?.rx ?? "?";
      console.log(
        `    A r=${typeof rv === "number" ? rv.toFixed(3) : rv}  ${s.start.x.toFixed(3)},${s.start.y.toFixed(3)} -> ${s.end.x.toFixed(3)},${s.end.y.toFixed(3)}`,
      );
    }
  }
}
