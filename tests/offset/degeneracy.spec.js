import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const EPSILON = 1e-6;

const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(
        pathData,
        0,
        0,
        (y) => y,
        false
    );
}

function lengthOf(segment) {
    return Math.hypot(
        segment.end.x - segment.start.x,
        segment.end.y - segment.start.y
    );
}

function assertNoDegenerateSegments(segments) {
    for (const segment of segments) {
        expect(segment.start).toBeTruthy();
        expect(segment.end).toBeTruthy();
        expect(lengthOf(segment)).toBeGreaterThan(EPSILON);

        if (segment.type === "arc") {
            const radius = segment.arc?.radius ?? segment.arc?.rx ?? 0;
            expect(radius).toBeGreaterThan(EPSILON);
        }
    }
}

describe("CustomOffsetProcessor degeneracy deletion semantics", () => {
    it("removes zero-length line segments from offset output", () => {
        const input = "M 0 0 L 10 0 L 10 0 L 10 8";

        const output = calculateOffsetFromPathData(input, 1, {
            exportModule,
            forceReverseOutput: false,
        });

        const segments = parseSegments(output);
        expect(segments.length).toBeGreaterThan(0);
        assertNoDegenerateSegments(segments);

        // Removed means no collapsed segment survives in output.
        expect(segments.some((segment) => lengthOf(segment) <= EPSILON)).toBe(false);
    });

    it("removes zero-radius arcs when inward offset collapses radius", () => {
        const input = "M 1 0 A 1 1 0 0 1 0 1";

        // For this arc parameterization, offset=-2 yields newRadius <= 0.
        const output = calculateOffsetFromPathData(input, -2, {
            exportModule,
            forceReverseOutput: false,
        });

        // Degenerate arc must be deleted, not kept as radius=0.
        expect(output).toBe("");
        const segments = parseSegments(output);
        expect(segments).toHaveLength(0);
    });

    it("preserves neighboring direction vectors when middle segment degenerates", () => {
        const input = "M 0 0 L 10 0 L 10 0 L 10 8";

        const output = calculateOffsetFromPathData(input, 1, {
            exportModule,
            forceReverseOutput: false,
        });

        const segments = parseSegments(output);
        assertNoDegenerateSegments(segments);

        const horizontal = segments
            .filter((segment) => Math.abs(segment.end.y - segment.start.y) < 1e-5)
            .sort((a, b) => lengthOf(b) - lengthOf(a))[0];
        const vertical = segments
            .filter((segment) => Math.abs(segment.end.x - segment.start.x) < 1e-5)
            .sort((a, b) => lengthOf(b) - lengthOf(a))[0];

        expect(horizontal).toBeTruthy();
        expect(vertical).toBeTruthy();

        // Original non-degenerate neighbors are +X and +Y.
        expect(horizontal.end.x - horizontal.start.x).toBeGreaterThan(0);
        expect(vertical.end.y - vertical.start.y).toBeGreaterThan(0);
    });

    it("deletes degenerate segment instead of using 180° reversal fallback", () => {
        const input = "M 0 0 L 10 0 L 10 0 L 10 8";

        const output = calculateOffsetFromPathData(input, 1, {
            exportModule,
            forceReverseOutput: false,
        });

        const segments = parseSegments(output);
        assertNoDegenerateSegments(segments);

        // No long reversed replacement for the original +X/+Y neighbors.
        const hasReversedHorizontal = segments.some((segment) => {
            const dy = Math.abs(segment.end.y - segment.start.y);
            const dx = segment.end.x - segment.start.x;
            return dy < 1e-5 && lengthOf(segment) > 0.5 && dx < 0;
        });
        const hasReversedVertical = segments.some((segment) => {
            const dx = Math.abs(segment.end.x - segment.start.x);
            const dy = segment.end.y - segment.start.y;
            return dx < 1e-5 && lengthOf(segment) > 0.5 && dy < 0;
        });

        expect(hasReversedHorizontal).toBe(false);
        expect(hasReversedVertical).toBe(false);
    });

    it("sanitizes collapsed join outputs so no degenerate residues remain", () => {
        const input = "M 0 0 L 10 0 L 10 0.15 L 10 10 L 0 10 Z";

        const output = calculateOffsetFromPathData(input, 0.4, {
            exportModule,
            forceReverseOutput: false,
        });

        const segments = parseSegments(output);

        if (segments.length > 0) {
            assertNoDegenerateSegments(segments);
        }

        // Even if contour collapses fully, sanitize must not emit degenerate leftovers.
        expect(
            segments.some((segment) => {
                if (lengthOf(segment) <= EPSILON) return true;
                if (segment.type !== "arc") return false;
                const radius = segment.arc?.radius ?? segment.arc?.rx ?? 0;
                return radius <= EPSILON;
            })
        ).toBe(false);
    });
});
