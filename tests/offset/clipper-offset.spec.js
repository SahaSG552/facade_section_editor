import { describe, expect, it } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateClipperOffsetFromPathData } from "../../src/operations/ClipperOffsetProcessor.js";

const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

function bboxFromSegments(segments) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const segment of segments) {
        for (const point of [segment?.start, segment?.end, segment?.data?.start, segment?.data?.end]) {
            if (!point) continue;
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        }
    }

    if (!Number.isFinite(minX)) return null;
    return { minX, minY, maxX, maxY, area: Math.max(0, maxX - minX) * Math.max(0, maxY - minY) };
}

describe("ClipperOffsetProcessor", () => {
    it("produces non-empty offset path for closed rectangle", () => {
        const input = "M 0 0 L 40 0 L 40 20 L 0 20 Z";
        const output = calculateClipperOffsetFromPathData(input, 4, {
            exportModule,
            join: "miter",
            cap: "butt",
            offsetSignMode: "direct",
        });

        expect(typeof output).toBe("string");
        expect(output.length).toBeGreaterThan(0);
    });

    it("respects direct sign semantics with SVG Y inversion handling", () => {
        const input = "M 0 0 L 40 0 L 40 20 L 0 20 Z";

        const expanded = calculateClipperOffsetFromPathData(input, 3, {
            exportModule,
            join: "miter",
            cap: "butt",
            offsetSignMode: "direct",
        });
        const shrunk = calculateClipperOffsetFromPathData(input, -3, {
            exportModule,
            join: "miter",
            cap: "butt",
            offsetSignMode: "direct",
        });

        const inputBox = bboxFromSegments(parseSegments(input));
        const expandedBox = bboxFromSegments(parseSegments(expanded));
        const shrunkBox = bboxFromSegments(parseSegments(shrunk));

        expect(inputBox).toBeTruthy();
        expect(expandedBox).toBeTruthy();
        expect(shrunkBox).toBeTruthy();

        expect(expandedBox.area).toBeGreaterThan(inputBox.area);
        expect(shrunkBox.area).toBeLessThan(inputBox.area);
    });

    it("offsets open contours to one side by default and keeps stroke mode available", () => {
        const input = "M 0 0 L 40 0";

        const single = calculateClipperOffsetFromPathData(input, 5, {
            exportModule,
            join: "miter",
            cap: "butt",
            offsetSignMode: "direct",
        });
        const stroke = calculateClipperOffsetFromPathData(input, 5, {
            exportModule,
            join: "miter",
            cap: "butt",
            offsetSignMode: "direct",
            openPathMode: "stroke",
        });

        const singleSegments = parseSegments(single);
        const strokeSegments = parseSegments(stroke);
        const singleBox = bboxFromSegments(singleSegments);
        const strokeBox = bboxFromSegments(strokeSegments);

        expect(single).not.toMatch(/[Zz]/);
        expect(stroke).toMatch(/[Zz]/);
        expect(singleSegments).toHaveLength(1);
        expect(singleSegments[0].type).toBe("line");
        expect(singleBox.minY).toBeCloseTo(-5, 3);
        expect(singleBox.maxY).toBeCloseTo(-5, 3);
        expect(strokeBox.area).toBeGreaterThan(0);
    });

    it("builds a stable arc refit for arc input with increased approximation quality", () => {
        const input = "M -10 0 A 10 10 0 0 0 10 0";
        const output = calculateClipperOffsetFromPathData(input, 1, {
            exportModule,
            join: "round",
            cap: "butt",
            offsetSignMode: "direct",
        });

        const segments = parseSegments(output);
        const [arcSegment] = segments;

        expect(segments.length).toBeGreaterThan(0);
        expect(segments.some((segment) => segment.type === "arc")).toBe(true);
        expect(output).toMatch(/[Aa]/);
        expect(segments).toHaveLength(1);
        expect(Math.abs((arcSegment.arc?.radius ?? 0) - 10)).toBeGreaterThan(0.5);
        expect(Math.abs(arcSegment.start.y - arcSegment.end.y)).toBeLessThan(0.2);
    });

    it("keeps mixed line+arc contour topology stable after refit", () => {
        const input = "M -5 -33 L -21 -33 A 4 4 0 0 1 -21 -41";
        const output = calculateClipperOffsetFromPathData(input, 1, {
            exportModule,
            join: "round",
            cap: "butt",
            offsetSignMode: "direct",
            refitToArcs: true,
        });

        const segments = parseSegments(output);
        const lineCount = segments.filter((s) => s.type === "line").length;
        const arcCount = segments.filter((s) => s.type === "arc").length;
        const maxArcRadius = Math.max(0, ...segments
            .filter((s) => s.type === "arc")
            .map((s) => Math.abs(Number(s.arc?.radius ?? s.radius ?? 0))));

        expect(lineCount).toBeGreaterThanOrEqual(1);
        expect(arcCount).toBeGreaterThanOrEqual(1);
        expect(maxArcRadius).toBeLessThan(12);
    });

    it("keeps closed mixed contour stable when start segment changes", () => {
        const pathA = "M -5 -33 L -21 -33 A 4 4 0 0 1 -21 -41 L -5 -41 Z";
        const pathB = "M -21 -33 A 4 4 0 0 1 -21 -41 L -5 -41 L -5 -33 Z";

        const outputA = calculateClipperOffsetFromPathData(pathA, 1, {
            exportModule,
            join: "round",
            cap: "butt",
            refitToArcs: true,
        });
        const outputB = calculateClipperOffsetFromPathData(pathB, 1, {
            exportModule,
            join: "round",
            cap: "butt",
            refitToArcs: true,
        });

        const segmentsA = parseSegments(outputA);
        const segmentsB = parseSegments(outputB);
        const linesA = segmentsA.filter((s) => s.type === "line").length;
        const linesB = segmentsB.filter((s) => s.type === "line").length;
        const arcsA = segmentsA.filter((s) => s.type === "arc").length;
        const arcsB = segmentsB.filter((s) => s.type === "arc").length;

        expect(linesA).toBe(linesB);
        expect(arcsA).toBe(arcsB);
        expect(arcsA).toBeGreaterThanOrEqual(1);
        expect(linesA).toBeGreaterThanOrEqual(2);
    });
});
