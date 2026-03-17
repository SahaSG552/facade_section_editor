import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(
        pathData, 0, 0, (y) => y, false
    );
}

/**
 * Contour: M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10
 * At offset=7 the arc (sweepFlag=0, r=3) has newRadius = 3 + (-7)*1 = -4  →  degenerates.
 * The bridge between the degenerate arc endpoints also collapses via miter join.
 * Expected: exactly 2 line segments (the two flanking lines, miter-joined).
 *
 * Output (raw SVG y-down space):
 *   M -6.261 6.870 L 0.674 -7 L 10 -7
 *
 * Previously (before fix) tangentAtEnd/Start for degenerate arcs used arc-angle
 * tangent instead of the degenerate arc's start→end direction, producing 4 segments
 * with two tiny ghost lines near the degenerate arc position.
 */
describe("Contour arc degeneration at offset=7", () => {
    it("produces exactly 2 line segments when arc degenerates", () => {
        const input = "M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10";
        const output = calculateOffsetFromPathData(input, 7, { exportModule });

        const segs = parseSegments(output);

        // All segments must be lines (arc+bridge degenerated away)
        for (const seg of segs) {
            expect(seg.type).toBe("line");
        }

        // Exactly 2 line segments
        expect(segs.length).toBe(2);
    });

    it("second line runs to (10, -7) — the offset H10 segment", () => {
        const input = "M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10";
        const output = calculateOffsetFromPathData(input, 7, { exportModule });

        const segs = parseSegments(output);
        if (segs.length < 2) return;

        const close = (a, b, tol = 0.05) => Math.abs(a - b) < tol;

        // Last segment ends at (10, -7): H10 offset by 7 in -y direction
        expect(close(segs[segs.length - 1].end.x, 10,  0.05)).toBe(true);
        expect(close(segs[segs.length - 1].end.y, -7,  0.05)).toBe(true);
    });
});
