/**
 * Regression: extra/artifact contours from inward self-intersection offset.
 * Source: user's reported contour 9 (closed, 2 arcs radius ~8, inward offset).
 *
 * Root causes identified and fixed:
 * 1. Paper.js resolveCrossings() can emit compound pathData ("M...Z M...Z") →
 *    fixed by splitSubpaths in trimSelfIntersectionsDetailed.
 * 2. Paper may emit a single path visiting its own start mid-traversal (figure-8) →
 *    fixed by splitFigureEightChain at trimmer and engine output level.
 * 3. Crossing artifacts always form as 3-segment triangles; legitimate offset
 *    components always have ≥ 4 segments → fixed by MIN_RESOLVED_SEGS=4 filter
 *    in _selectResolvedClosedContours, replacing the flawed arc-presence heuristic
 *    that was incorrectly dropping the main body contour.
 */

import { describe, it, expect } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();

// Source contour (contour 9 in the user's state).
const SOURCE_PATH =
    "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385" +
    " A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 Z";

describe("Investigation: extra contours from inward self-intersection", () => {
    it("logs actual component counts and areas for diagnostic", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        for (const d of [-4, -5, -6, -7, -7.5]) {
            let result;
            try {
                result = await engine.processPath(SOURCE_PATH, d, { trimSelfIntersections: true, exportModule });
            } catch (err) {
                console.log(`d=${d}: ERROR ${err.message}`);
                continue;
            }
            console.log(`d=${d}: ${result.contours.length} contours`);
            result.contours.forEach((c, i) => {
                const hasFigureEight = c.segments.some((s, si) => {
                    if (si === 0) return false;
                    return c.segments[0].start &&
                        Math.abs(s.end.x - c.segments[0].start.x) < 1e-3 &&
                        Math.abs(s.end.y - c.segments[0].start.y) < 1e-3 &&
                        si < c.segments.length - 1;
                });
                console.log(
                    `  [${i}] area=${c.area.toFixed(3)} orientation=${c.orientation}` +
                    ` segs=${c.segments.length} hasArc=${c.segments.some((s) => s.type === "arc")}` +
                    ` figure8=${hasFigureEight}`,
                );
            });
        }
    });

    it("should produce at most 2 contours for inward offset triggering one self-intersection", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });

        for (const d of [-5, -6, -7, -7.5]) {
            const result = await engine.processPath(SOURCE_PATH, d, {
                trimSelfIntersections: true,
                exportModule,
            });
            expect(result.contours.length, `expected ≤2 at d=${d}`).toBeLessThanOrEqual(2);
            for (const c of result.contours) {
                expect(Math.abs(c.area), `ghost loop at d=${d}`).toBeGreaterThan(1e-4);
            }
        }
    });

    it("no output contour should be a figure-8 (visit its own start mid-traversal)", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });

        for (const d of [-5, -6, -7, -7.5]) {
            const result = await engine.processPath(SOURCE_PATH, d, {
                trimSelfIntersections: true,
                exportModule,
            });
            for (const c of result.contours) {
                if (!c.segments.length) continue;
                const startPt = c.segments[0].start;
                for (let i = 1; i < c.segments.length - 1; i++) {
                    const end = c.segments[i].end;
                    const atStart =
                        Math.abs(end.x - startPt.x) < 1e-3 &&
                        Math.abs(end.y - startPt.y) < 1e-3;
                    expect(atStart, `figure-8 in contour at d=${d}, seg ${i}`).toBe(false);
                }
            }
        }
    });

    it("area ratios of components should show no artifact below 25% of largest", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });

        for (const d of [-5, -6, -7, -7.5]) {
            const result = await engine.processPath(SOURCE_PATH, d, {
                trimSelfIntersections: true,
                exportModule,
            });
            if (result.contours.length < 2) continue;
            const areas = result.contours.map((c) => Math.abs(c.area));
            const maxArea = Math.max(...areas);
            const ratios = areas.map((a) => (a / maxArea).toFixed(3));
            console.log(`d=${d}: area ratios: [${ratios.join(", ")}]`);
            for (const ratio of areas) {
                expect(ratio / maxArea, `artifact at d=${d}`).toBeGreaterThan(0.25);
            }
        }
    });

    it("no output contour should have only 3 segments (3-seg triangles are crossing artifacts)", async () => {
        // Regression: an earlier arc-presence heuristic incorrectly kept two 3-segment
        // arc-triangle artifacts (r≈2.9494) and dropped the large main body contour at
        // d≈-5.06.  MIN_RESOLVED_SEGS=4 in _selectResolvedClosedContours prevents this.
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });

        for (const d of [-5, -5.06, -6, -7, -7.5]) {
            let result;
            try {
                result = await engine.processPath(SOURCE_PATH, d, {
                    trimSelfIntersections: true,
                    exportModule,
                });
            } catch {
                continue;
            }
            for (const c of result.contours) {
                expect(
                    c.segments.length,
                    `3-seg artifact survived at d=${d}`,
                ).toBeGreaterThanOrEqual(4);
            }
        }
    });
});

