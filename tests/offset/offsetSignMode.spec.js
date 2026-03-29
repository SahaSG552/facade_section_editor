import { describe, expect, it } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

function summarize(pathData) {
    const segments = parseSegments(pathData);
    return segments.map((segment) => {
        if (segment.type === "arc") {
            return {
                type: segment.type,
                start: segment.start,
                end: segment.end,
                radius: segment.radius,
                sweepFlag: segment.sweepFlag,
                largeArcFlag: segment.largeArcFlag,
            };
        }

        return {
            type: segment.type,
            start: segment.start,
            end: segment.end,
        };
    });
}

describe("CustomOffsetProcessor offsetSignMode", () => {
    it("direct mode matches legacy mode with inverted input sign on mixed line/arc contours", () => {
        const input = "M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10";

        const direct = calculateOffsetFromPathData(input, -4, {
            exportModule,
            forceReverseOutput: false,
            offsetSignMode: "direct",
        });
        const legacy = calculateOffsetFromPathData(input, 4, {
            exportModule,
            forceReverseOutput: false,
        });

        expect(summarize(direct)).toEqual(summarize(legacy));
    });

    it("direct mode matches legacy mode with inverted input sign on closed contours", () => {
        const input = "M 0 0 L 40 0 L 40 20 A 10 10 0 0 1 30 30 L 0 30 Z";

        const direct = calculateOffsetFromPathData(input, 5, {
            exportModule,
            trimSelfIntersections: true,
            offsetSignMode: "direct",
        });
        const legacy = calculateOffsetFromPathData(input, -5, {
            exportModule,
            trimSelfIntersections: true,
        });

        expect(summarize(direct)).toEqual(summarize(legacy));
    });
});