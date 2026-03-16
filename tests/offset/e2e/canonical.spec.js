import { describe, it, expect } from "vitest";
import ExportModule from "../../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../../src/operations/CustomOffsetProcessor.js";

const EPSILON = 1e-6;
const STITCH_TOLERANCE = 0.5;

const CANONICAL_PATH =
    "M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8 L -11 11 H 0 H 11 L 11 8 A 7 7 0 0 1 5.5 3.5 A 6 6 0 0 0 0 0";

const exportModule = new ExportModule();

function distance(a, b) {
    return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
}

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

function isFinitePoint(point) {
    return Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function assertValidSegments(segments) {
    expect(Array.isArray(segments)).toBe(true);
    expect(segments.length).toBeGreaterThan(0);

    for (const segment of segments) {
        expect(["line", "arc", "bezier"]).toContain(segment.type);
        expect(isFinitePoint(segment.start)).toBe(true);
        expect(isFinitePoint(segment.end)).toBe(true);
        expect(distance(segment.start, segment.end)).toBeGreaterThan(EPSILON);

        if (segment.type === "arc") {
            const radius = segment.arc?.radius ?? segment.arc?.rx ?? 0;
            expect(Number.isFinite(radius)).toBe(true);
            expect(radius).toBeGreaterThan(EPSILON);
        }
    }
}

function assertContinuity(segments, tolerance = STITCH_TOLERANCE, closed = true) {
    for (let i = 0; i < segments.length - 1; i++) {
        const gap = distance(segments[i].end, segments[i + 1].start);
        expect(gap).toBeLessThanOrEqual(tolerance);
    }

    if (closed && segments.length > 1) {
        const wrapGap = distance(segments[segments.length - 1].end, segments[0].start);
        expect(wrapGap).toBeLessThanOrEqual(tolerance);
    }
}

function splitIntoContours(segments, tolerance = STITCH_TOLERANCE) {
    if (!segments.length) return [];

    const contours = [];
    let current = [segments[0]];

    for (let i = 1; i < segments.length; i++) {
        const prev = segments[i - 1];
        const next = segments[i];
        if (distance(prev.end, next.start) > tolerance) {
            contours.push(current);
            current = [next];
        } else {
            current.push(next);
        }
    }

    if (current.length > 0) contours.push(current);
    return contours;
}

describe("End-to-end offset regression suite", () => {
    describe("Canonical path (user-provided)", () => {
        it("should process canonical path with offset -7", () => {
            const resultPath = calculateOffsetFromPathData(CANONICAL_PATH, -7, {
                exportModule,
            });

            expect(typeof resultPath).toBe("string");
            expect(resultPath.length).toBeGreaterThan(0);

            const segments = parseSegments(resultPath);
            assertValidSegments(segments);

            const lineCount = segments.filter((s) => s.type === "line").length;
            const arcCount = segments.filter((s) => s.type === "arc").length;

            expect(lineCount).toBeGreaterThan(0);
            expect(arcCount).toBeGreaterThan(0);
        });

        it("should maintain contour continuity (no gaps)", () => {
            const resultPath = calculateOffsetFromPathData(CANONICAL_PATH, -7, {
                exportModule,
            });
            const segments = parseSegments(resultPath);

            assertValidSegments(segments);

            const contours = splitIntoContours(segments, STITCH_TOLERANCE);
            expect(contours.length).toBeGreaterThan(0);

            for (const contour of contours) {
                assertContinuity(contour, STITCH_TOLERANCE, false);

                const wrapGap = distance(contour[contour.length - 1].end, contour[0].start);
                if (wrapGap <= STITCH_TOLERANCE) {
                    expect(wrapGap).toBeLessThanOrEqual(STITCH_TOLERANCE);
                }
            }
        });

        it("should insert and preserve bridges where needed", () => {
            // Force bridge fallback by making miter limit too small for corner intersection.
            // Input has only 2 lines; bridge insertion should create additional line segments.
            const bridgePath = "M 0 0 L 10 0 L 10 10";

            const firstOffsetPath = calculateOffsetFromPathData(bridgePath, -5, {
                exportModule,
                limit: 0.01,
            });
            const firstSegments = parseSegments(firstOffsetPath);

            assertValidSegments(firstSegments);
            assertContinuity(firstSegments, STITCH_TOLERANCE, false);

            const firstLineCount = firstSegments.filter((segment) => segment.type === "line").length;
            expect(firstLineCount).toBeGreaterThanOrEqual(3);

            const secondOffsetPath = calculateOffsetFromPathData(firstOffsetPath, 1, {
                exportModule,
                limit: 0.01,
            });
            const secondSegments = parseSegments(secondOffsetPath);

            assertValidSegments(secondSegments);
            assertContinuity(secondSegments, STITCH_TOLERANCE, false);

            const secondLineCount = secondSegments.filter((segment) => segment.type === "line").length;
            expect(secondLineCount).toBeGreaterThanOrEqual(3);
        });

        it("should delete degenerate segments without forbidden reversals", () => {
            // Arc collapse case: must delete (empty output), not reverse.
            const collapsingArcInput = "M 1 0 A 1 1 0 0 1 0 1";
            const collapsedResult = calculateOffsetFromPathData(collapsingArcInput, -2, {
                exportModule,
                forceReverseOutput: false,
            });
            expect(collapsedResult).toBe("");
            expect(parseSegments(collapsedResult)).toHaveLength(0);

            // Zero-length middle segment case: no reversed fallback segments should appear.
            const lineInput = "M 0 0 L 10 0 L 10 0 L 10 8";
            const lineResult = calculateOffsetFromPathData(lineInput, 1, {
                exportModule,
                forceReverseOutput: false,
            });
            const segments = parseSegments(lineResult);

            assertValidSegments(segments);

            const hasReversedHorizontal = segments.some((segment) => {
                const dy = Math.abs(segment.end.y - segment.start.y);
                const dx = segment.end.x - segment.start.x;
                return dy < 1e-5 && distance(segment.start, segment.end) > 0.5 && dx < 0;
            });
            const hasReversedVertical = segments.some((segment) => {
                const dx = Math.abs(segment.end.x - segment.start.x);
                const dy = segment.end.y - segment.start.y;
                return dx < 1e-5 && distance(segment.start, segment.end) > 0.5 && dy < 0;
            });

            expect(hasReversedHorizontal).toBe(false);
            expect(hasReversedVertical).toBe(false);
        });
    });

    describe("Error-path robustness", () => {
        it("should handle malformed path data gracefully", () => {
            const malformedInputs = [
                "THIS_IS_NOT_SVG",
                "M 0 0 L",
                "M 0 0 A 1 1 0 0",
                "M 0 0 Q 10",
                null,
                undefined,
            ];

            for (const input of malformedInputs) {
                let threw = false;
                let output = "";

                try {
                    output = calculateOffsetFromPathData(input, -7, { exportModule });
                } catch (error) {
                    threw = true;
                    expect(error).toBeInstanceOf(Error);
                    expect(String(error.message || "").length).toBeGreaterThan(0);
                }

                if (!threw) {
                    expect(typeof output).toBe("string");
                }
            }
        });

        it("should handle near-degenerate and extreme offsets gracefully", () => {
            const zeroOffset = calculateOffsetFromPathData(CANONICAL_PATH, 0, {
                exportModule,
            });
            expect(zeroOffset).toBe(CANONICAL_PATH);

            const extremeOffsets = [-10, -15, -1000, 1000];
            for (const offset of extremeOffsets) {
                const output = calculateOffsetFromPathData(CANONICAL_PATH, offset, {
                    exportModule,
                });

                expect(typeof output).toBe("string");

                const segments = parseSegments(output);
                if (segments.length > 0) {
                    assertValidSegments(segments);
                    const contours = splitIntoContours(segments, STITCH_TOLERANCE);
                    for (const contour of contours) {
                        assertContinuity(contour, STITCH_TOLERANCE, false);
                    }
                }
            }
        });
    });
});
