/**
 * Regression: arc degeneration at d=13 (arc radius = 13).
 *
 * At d=13 (effectiveD=-13 in direct mode):
 *   - Open contour: arc r=13 exactly degenerates → arc removed, neighboring
 *     lines connected via miter join (П-bridge where the arc pocket was).
 *   - Closed contour: self-intersection loop (formed around d≈11.71) fully
 *     degenerates at d=13 → single clean closed contour with П-bridge, no arcs.
 *
 * Expected output values taken from the application at d=13.
 */
import { describe, it, expect } from "vitest";
import OffsetEngine from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();
const engine = new OffsetEngine({ exportModule });

const OPTS = { offsetSignMode: "direct", joinType: "sharp" };

// Closed contour with arc radius=13
const CLOSED = "M -10 0 L 30 -1 L 10 30 A 13 13 0 0 0 -10 30 L -10 0 Z";
// Open contour with arc radius=13
const OPEN = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";

const TOL = 0.01; // coordinate tolerance

function parsePoints(pathData) {
    const re = /[ML]\s*([-\d.]+)\s+([-\d.]+)/g;
    const pts = [];
    let m;
    while ((m = re.exec(pathData)) !== null) {
        pts.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
    }
    return pts;
}

function expectPathNoArcs(pathData, label) {
    expect(pathData, `${label}: must not contain arcs`).not.toMatch(/\bA\b/i);
}

function expectPoint(actual, ex, ey, label) {
    expect(Math.abs(actual.x - ex), `${label}: x`).toBeLessThan(TOL);
    expect(Math.abs(actual.y - ey), `${label}: y`).toBeLessThan(TOL);
}

describe("arc degeneration regression (d=13)", () => {
    describe("open contour (arc r=13)", () => {
        it("d=-13: arc fully degenerates — no arcs in output", () => {
            const r = engine._processPathSync(OPEN, -13, OPTS);
            expect(r.contours.length).toBe(1);
            const c = r.contours[0];
            expect(c.closed).toBe(false);
            expectPathNoArcs(c.pathData, "C11 d=-13");
        });

        it("d=-13: output path matches expected П-bridge shape", () => {
            const r = engine._processPathSync(OPEN, -13, OPTS);
            const c = r.contours[0];
            // Expected: M 90.9239 6.0476 L 62.6923 49.8066 L 27 49.8066 L 27 38.3066 L 27 0
            const pts = parsePoints(c.pathData);
            expect(pts.length).toBeGreaterThanOrEqual(4);
            expectPoint(pts[0], 90.9239, 6.0476, "open start");
            // The contour must end at x≈27, y≈0
            const last = pts[pts.length - 1];
            expectPoint(last, 27, 0, "open end");
            // Bridge top at y≈49.8066 must appear
            const bridgeTop = pts.find(p => Math.abs(p.y - 49.806624) < TOL);
            expect(bridgeTop, "open: bridge top at y≈49.806624").toBeTruthy();
        });

        it("d=-12: arc still present, tiny center arc visible", () => {
            const r = engine._processPathSync(OPEN, -12, OPTS);
            const c = r.contours[0];
            expect(c.closed).toBe(false);
            // Arc still survives at d<13
            // (may be a tiny residual arc — the contour is still valid)
            expect(c.segments.length).toBeGreaterThan(2);
        });

        it("d=-14: arc gone, П-bridge continues cleanly past degeneration", () => {
            const r = engine._processPathSync(OPEN, -14, OPTS);
            expect(r.contours.length).toBe(1);
            const c = r.contours[0];
            expectPathNoArcs(c.pathData, "C11 d=-14");
        });
    });

    describe("closed contour (arc r=13, loop self-intersection)", () => {
        it("d=-12: produces 2 contours (main + self-intersection loop)", () => {
            const r = engine._processPathSync(CLOSED, -12, OPTS);
            expect(r.contours.length).toBe(2);
            const areas = r.contours.map(c => c.area);
            // main contour has positive area, loop has negative (opposite winding)
            expect(areas.some(a => a > 100)).toBe(true);
            expect(areas.some(a => a < 0)).toBe(true);
        });

        it("d=-13: loop fully degenerates — single output contour", () => {
            const r = engine._processPathSync(CLOSED, -13, OPTS);
            expect(r.contours.length).toBe(1);
            const c = r.contours[0];
            expect(c.closed).toBe(true);
        });

        it("d=-13: output is all line segments (no arcs)", () => {
            const r = engine._processPathSync(CLOSED, -13, OPTS);
            const c = r.contours[0];
            expectPathNoArcs(c.pathData, "C10 d=-13");
        });

        it("d=-13: output path matches expected shape", () => {
            const r = engine._processPathSync(CLOSED, -13, OPTS);
            const c = r.contours[0];
            // Expected: M -23 -12.6791 L 54.2516 -14.6104 L 20.9239 37.0476
            //            L 20.9239 15.0857 L -23 15.0857 L -23 37.0476 L -23 -12.6791
            const pts = parsePoints(c.pathData);
            expect(pts.length).toBeGreaterThanOrEqual(6);

            // П-bridge internal points must appear at x≈20.92 y≈15.08
            const bridgeCorner = pts.find(
                p => Math.abs(p.x - 20.923856) < TOL && Math.abs(p.y - 15.085721) < TOL
            );
            expect(bridgeCorner, "closed: П-bridge inner corner at (20.92, 15.09)").toBeTruthy();

            // Contour must include the far-right miter point x≈54.25
            const miterRight = pts.find(p => Math.abs(p.x - 54.251599) < TOL);
            expect(miterRight, "closed: right miter point at x≈54.25").toBeTruthy();
        });

        it("d=-14: loop gone, main contour continues cleanly", () => {
            const r = engine._processPathSync(CLOSED, -14, OPTS);
            expect(r.contours.length).toBe(1);
            const c = r.contours[0];
            expect(c.closed).toBe(true);
            expectPathNoArcs(c.pathData, "C10 d=-14");
        });
    });
});
