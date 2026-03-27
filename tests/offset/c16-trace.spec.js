import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const exportModule = new ExportModule();
const EPSILON = 1e-6;

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

function countTypes(segments) {
    let line = 0;
    let arc = 0;
    for (const seg of segments) {
        if (seg.type === "line") line += 1;
        if (seg.type === "arc") arc += 1;
    }
    return { line, arc };
}

function nonDegenerate(seg) {
    return Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y) > EPSILON;
}

describe("C16 trace regression", () => {
    it("stronger offset does not resurrect arc after near-degenerate state", () => {
        const contour13 = "M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10";

        const out7 = calculateOffsetFromPathData(contour13, 7, {
            exportModule,
            forceReverseOutput: false,
        });
        const out8 = calculateOffsetFromPathData(contour13, 8, {
            exportModule,
            forceReverseOutput: false,
        });

        const seg7 = parseSegments(out7);
        const seg8 = parseSegments(out8);
        const c7 = countTypes(seg7);
        const c8 = countTypes(seg8);

        // At stronger offset the contour should not become more arc-rich.
        expect(c8.arc).toBeLessThanOrEqual(c7.arc);

        // Once the corner collapses, we keep linear joins only.
        if (c8.arc === 0) {
            expect(c8.line).toBeGreaterThanOrEqual(2);
            expect(seg8.every(nonDegenerate)).toBe(true);
        }
    });
});
