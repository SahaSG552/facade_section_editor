import { describe, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const JOIN_TOLERANCE = 0.001;
const STITCH_TOLERANCE = 0.5;

const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(
        pathData,
        0,
        0,
        (y) => y,
        false,
    );
}

function distance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

describe("F2 gap audit", () => {
    it("measures all cyclic gaps for closed-contour cases", () => {
        const closedContourCases = [
            {
                name: "PLACEHOLDER: iterative sanitize→reconnect loop implementation",
                path: "M 0 0 L 10 0 L 10 10 L 0 10 Z",
                offset: -1,
            },
            {
                name: "RED: tiny arc degeneration breaks last↔first connection",
                path: "M 0 0 L 10 0 A 0.5 0.5 0 0 1 10 1 L 10 10 L 0 10 Z",
                offset: -0.6,
            },
            {
                name: "RED: arc at end position degenerates leaving wrap-around gap",
                path: "M 0 0 L 10 0 L 10 10 A 0.4 0.4 0 0 1 0 10 Z",
                offset: -0.5,
            },
            {
                name: "RED: tiny arc degeneration leaves all gaps including wrap-around unsealed",
                path: "M 0 0 L 10 0 A 0.3 0.3 0 0 1 10 1 L 0 1 Z",
                offset: -0.4,
            },
            {
                name: "RED: multiple tiny degenerate arcs break closure",
                path: "M 0 0 L 10 0 A 0.3 0.3 0 0 1 10 1 L 10 10 A 0.3 0.3 0 0 1 0 10 Z",
                offset: -0.4,
            },
            {
                name: "RED: arc near end position degenerates creating wrap-around gap",
                path: "M 0 0 L 6 0 A 0.5 0.5 0 0 1 6 1 L 6 6 L 0 6 Z",
                offset: -0.6,
            },
            {
                name: "RED: minimal closed contour with degenerate has unsealed wrap-around",
                path: "M 0 0 L 5 0 A 0.2 0.2 0 0 1 5 1 Z",
                offset: -0.3,
            },
            {
                name: "should mark all bridge segments with isBridge: true",
                path: "M 0 0 L 10 0 A 0.5 0.5 0 0 1 10 1 L 10 10 L 0 10 Z",
                offset: -0.3,
            },
            {
                name: "Edge Case 1: All segments degenerate → empty output, no crash",
                path: "M 0 0 L 0.5 0 L 0.5 0.5 L 0 0.5 Z",
                offset: -1,
            },
            {
                name: "Edge Case 2: Single survivor → cyclic check skipped gracefully",
                path: "M 0 0 L 0.1 0 L 10 0 L 10 0.1 L 10 10 Z",
                offset: -1.5,
            },
            {
                name: "Edge Case 3: Two adjacent degenerates → predecessor/successor reconnected",
                path: "M 0 0 L 0.3 0 L 0.3 0.3 L 10 0.3 L 10 10 L 0 10 Z",
                offset: -0.5,
            },
            {
                name: "Edge Case 4: Degenerate at index 0 → cyclic handling correct",
                path: "M 0 0 L 0.1 0 L 5 0 L 5 5 L 0 5 Z",
                offset: -0.5,
            },
        ];

        let maxGap = 0;
        let violationCount = 0;
        let potentialStitchMaskCount = 0;
        const lines = [];

        lines.push("F2 Gap Assertion Audit");
        lines.push(`JOIN_TOLERANCE=${JOIN_TOLERANCE}`);
        lines.push(`STITCH_TOLERANCE=${STITCH_TOLERANCE}`);
        lines.push("");

        for (const testCase of closedContourCases) {
            const outputPathData = calculateOffsetFromPathData(testCase.path, testCase.offset, {
                exportModule,
                forceReverseOutput: false,
            });
            const segments = parseSegments(outputPathData);

            lines.push(`CASE: ${testCase.name}`);
            lines.push(`offset=${testCase.offset}`);
            lines.push(`segmentCount=${segments.length}`);

            if (segments.length >= 2) {
                for (let i = 0; i < segments.length; i++) {
                    const nextIndex = (i + 1) % segments.length;
                    const gap = distance(segments[i].end, segments[nextIndex].start);
                    maxGap = Math.max(maxGap, gap);

                    if (gap >= JOIN_TOLERANCE) {
                        violationCount += 1;
                    }
                    if (gap >= JOIN_TOLERANCE && gap < STITCH_TOLERANCE) {
                        potentialStitchMaskCount += 1;
                    }

                    lines.push(
                        `  gap[${i}->${nextIndex}]=${gap.toFixed(12)} ` +
                            `(join_ok=${gap < JOIN_TOLERANCE})`,
                    );
                }
            } else {
                lines.push("  no cyclic pair checks (segmentCount < 2)");
            }

            lines.push("");
        }

        lines.push("SUMMARY");
        lines.push(`closedContoursTested=${closedContourCases.length}`);
        lines.push(`maxGap=${maxGap.toFixed(12)}`);
        lines.push(`gapViolations=${violationCount}`);
        lines.push(`potentialStitchMaskGaps=${potentialStitchMaskCount}`);

        const evidencePath = path.resolve(process.cwd(), ".sisyphus/evidence/f2-gap-audit.txt");
        fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
        fs.writeFileSync(evidencePath, `${lines.join("\n")}\n`, "utf8");

        console.log(JSON.stringify({
            closedContoursTested: closedContourCases.length,
            maxGap,
            gapViolations: violationCount,
            potentialStitchMaskGaps: potentialStitchMaskCount,
            evidencePath,
        }));
    });
});
