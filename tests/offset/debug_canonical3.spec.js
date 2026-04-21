import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";

const CANONICAL_PATH = "M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8";
const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

describe("Debug arc angles", () => {
    it("checks if angles are radians or degrees", () => {
        const segments = parseSegments(CANONICAL_PATH);
        for (const s of segments.filter(s => s.type === "arc")) {
            const arc = s.arc;
            const sa = arc.startAngle;
            const ea = arc.endAngle;
            // If radians: sin/cos give correct x,y for center + r * cos/sin
            const cx = arc.centerX, cy = arc.centerY;
            const r = arc.radius || arc.rx;
            const startXrad = cx + Math.cos(sa) * r;
            const startYrad = cy + Math.sin(sa) * r;
            const startXdeg = cx + Math.cos(sa * Math.PI / 180) * r;
            const startYdeg = cy + Math.sin(sa * Math.PI / 180) * r;
            
            console.log(`Arc ${r}: startAngle=${sa.toFixed(4)}`);
            console.log(`  Actual start: (${s.start.x.toFixed(4)}, ${s.start.y.toFixed(4)})`);
            console.log(`  If radians: (${startXrad.toFixed(4)}, ${startYrad.toFixed(4)})`);
            console.log(`  If degrees: (${startXdeg.toFixed(4)}, ${startYdeg.toFixed(4)})`);
        }
        expect(true).toBe(true);
    });
});
