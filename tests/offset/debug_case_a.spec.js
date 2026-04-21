import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

describe("Debug", () => {
  it("Canonical offset=-7 segment analysis", () => {
    const path = "M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8 L -11 11 H 0 H 11 L 11 8 A 7 7 0 0 1 5.5 3.5 A 6 6 0 0 0 0 0";
    const result = calculateOffsetFromPathData(path, -7, { exportModule });
    console.log("SVG:", result);
    const segs = parseSegments(result);
    segs.forEach((s, i) => console.log(`[${i}] ${s.type}`, s.type === 'arc' ? `r=${s.radius} sweep=${s.sweep}` : ''));
  });
});
