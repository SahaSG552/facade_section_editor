import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const CANONICAL_PATH = "M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8 L -11 11 H 0 H 11 L 11 8 A 7 7 0 0 1 5.5 3.5 A 6 6 0 0 0 0 0";
const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

describe("Debug canonical path", () => {
    it("traces canonical offset -7 arcs", () => {
        globalThis.__debugArcJoin = true;
        const resultPath = calculateOffsetFromPathData(CANONICAL_PATH, -7, { exportModule });
        globalThis.__debugArcJoin = false;
        console.log("Result path:", resultPath);
        const segments = parseSegments(resultPath);
        console.log("Segments:", segments.map(s => ({
            type: s.type,
            start: s.start,
            end: s.end,
            r: s.arc?.radius
        })));
        const arcCount = segments.filter(s => s.type === "arc").length;
        console.log("arcCount:", arcCount);
        expect(true).toBe(true); // just for output
    });
});
