import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

describe("Contour13 collapse regression (L-L-A-L)", () => {
    it("at stronger offset, near-degenerate arc path collapses to line-line join", () => {
        const input = "M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10";

        const evaluate = (d6, d7) => {
            const out6 = calculateOffsetFromPathData(input, d6, {
                exportModule,
                forceReverseOutput: false,
            });
            const out7 = calculateOffsetFromPathData(input, d7, {
                exportModule,
                forceReverseOutput: false,
            });

            const seg6 = parseSegments(out6);
            const seg7 = parseSegments(out7);

            return {
                arc6: seg6.filter((s) => s.type === "arc").length,
                arc7: seg7.filter((s) => s.type === "arc").length,
                line7: seg7.filter((s) => s.type === "line").length,
            };
        };

        const negBranch = evaluate(-6, -7);
        const posBranch = evaluate(6, 7);

        // Stronger offset must not preserve/resurrect more arc geometry.
        expect(negBranch.arc7).toBeLessThanOrEqual(negBranch.arc6);
        expect(posBranch.arc7).toBeLessThanOrEqual(posBranch.arc6);

        // At least one sign branch must collapse to the expected 2-line result.
        const hasExpectedCollapse =
            (negBranch.arc7 === 0 && negBranch.line7 === 2)
            || (posBranch.arc7 === 0 && posBranch.line7 === 2);

        expect(hasExpectedCollapse).toBe(true);
    });
});
