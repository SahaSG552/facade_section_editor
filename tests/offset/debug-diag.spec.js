import { describe, it } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(
        pathData, 0, 0, (y) => y, false
    );
}

function fmt(s) {
    return `${s.type}(${s.start?.x?.toFixed(3)},${s.start?.y?.toFixed(3)})→(${s.end?.x?.toFixed(3)},${s.end?.y?.toFixed(3)}) degen=${s.degenerate} bridge=${s.isBridge}`;
}

describe("DIAGNOSTIC", () => {
    it("contour-13 segments debug", () => {
        const output = calculateOffsetFromPathData("M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10", 7, { exportModule });
        const segs = parseSegments(output);
        console.log("=== Contour-13 output SVG:", output);
        console.log("Count:", segs.length);
        segs.forEach((s, i) => console.log(`  [${i}] ${fmt(s)}`));
    });

    it("reconnect offset=-4 segments debug", () => {
        const output = calculateOffsetFromPathData("M 10 0 H 0 A 3 3 0 0 1 3 4 L 0 10", -4, { exportModule });
        const segs = parseSegments(output);
        console.log("=== Reconnect (offset=-4) SVG:", output);
        console.log("Count:", segs.length);
        segs.forEach((s, i) => console.log(`  [${i}] ${fmt(s)}`));
    });
});
