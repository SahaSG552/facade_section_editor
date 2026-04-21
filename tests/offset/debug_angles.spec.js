import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";

const exportModule = new ExportModule();
function parseSegments(pathData) {
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

describe("Angle units check", () => {
    it("simple arc", () => {
        // M 0 0 A 1 1 0 0 1 0 1 — unit circle arc from (1,0) to (0,1)
        // Wait, start should be (1,0) based on center (0,0)
        // A 1 1 0 0 1 1 0 — from (0,0)... not right. Let's try:
        // M 1 0 A 1 1 0 0 1 0 1 — arc of unit circle from (1,0) to (0,1), CCW
        const segs = parseSegments("M 1 0 A 1 1 0 0 1 0 1");
        const arc = segs.find(s => s.type === "arc");
        if (!arc) { console.log("No arc found"); return; }
        const a = arc.arc;
        console.log("startAngle:", a.startAngle, "endAngle:", a.endAngle);
        console.log("sweepFlag:", a.sweepFlag);
        // If radians: startAngle=0 (cos=1,sin=0 → (1,0)), endAngle=π/2 (cos=0,sin=1 → (0,1))
        // If degrees: startAngle=0, endAngle=90
        const startXrad = a.centerX + Math.cos(a.startAngle) * a.radius;
        const startYrad = a.centerY + Math.sin(a.startAngle) * a.radius;
        console.log("actual start:", arc.start.x, arc.start.y);
        console.log("if radians:", startXrad, startYrad);
        console.log("if degrees:", a.centerX + Math.cos(a.startAngle * Math.PI / 180) * a.radius, a.centerY + Math.sin(a.startAngle * Math.PI / 180) * a.radius);
        expect(true).toBe(true);
    });
    it("simple A 3 3 0 0 0 0 0", () => {
        // from arc-degenerate tests: M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10
        const segs = parseSegments("M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10");
        for (const s of segs) {
            if (s.type === "arc") {
                console.log("r3 arc startAngle:", s.arc.startAngle, "endAngle:", s.arc.endAngle, "sweepFlag:", s.arc.sweepFlag);
            }
        }
        expect(true).toBe(true);
    });
});
