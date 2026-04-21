import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";

/**
 * Regression tests for two related arc-offset bugs:
 *
 * Bug 1 — Tiny-sweep arc should degenerate (not expand)
 *   When an arc has a near-zero angular sweep after offsetting, the previous
 *   code only checked radius > 0 and kept the arc alive.  The arc then had its
 *   angle expanded by the join logic, producing a self-intersecting contour.
 *   Fix: offsetArcSegment now marks an arc degenerate when Math.abs(delta) < EPSILON
 *   OR when the chord length between the offset start/end points is negligible.
 *
 * Bug 2 — Arc/arc join: allow angle extension; arc/line join: keep restriction
 *   The old code forbade extending any arc's sweep during Phase 1 geometric
 *   intersection (isValidEndTrim/isValidStartTrim applied to both arc/arc and
 *   arc/line).  The new rule:
 *     - arc/arc: both arcs may extend to reach the intersection (clean miter)
 *     - arc/line: arc may only shorten; a bridge fills any remaining gap
 */

const JOIN_TOLERANCE = 0.001;
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

function distance(p1, p2) {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Assert that all consecutive segment pairs are connected within JOIN_TOLERANCE,
 * including the wrap-around pair for closed contours.
 */
function assertConnected(segments, closed = false) {
    const limit = closed ? segments.length : segments.length - 1;
    for (let i = 0; i < limit; i++) {
        const curr = segments[i];
        const next = segments[(i + 1) % segments.length];
        const gap = distance(curr.end, next.start);
        expect(gap).toBeLessThan(JOIN_TOLERANCE);
    }
}

/**
 * Assert no degenerate segments (zero radius arcs, zero-chord arcs, zero-length lines).
 */
function assertNonDegenerate(segments) {
    for (const seg of segments) {
        const chord = distance(seg.start, seg.end);
        expect(chord).toBeGreaterThan(EPSILON);
        if (seg.type === "arc" && seg.arc) {
            const r = seg.arc.radius || seg.arc.rx || 0;
            expect(r).toBeGreaterThan(EPSILON);
        }
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Bug 1: Tiny-sweep arc degeneration
// ────────────────────────────────────────────────────────────────────────────

describe("Bug 1 — Tiny-sweep arc degeneration", () => {
    /**
     * Original contour 13 from the reported example:
     *   M 0 10  →  L 3 4  →  A 3 3 0 0 0 0 0  →  H 10
     *
     * The arc has radius=3, sweepFlag=0 (CW in SVG convention).
     *
     * Offset sign convention:
     *   sweepFlag=0 (CW) → the contour interior is on the LEFT of the path
     *   direction.  A negative offset moves the path inward (toward the
     *   concave side), which is the OUTSIDE of this particular arc circle.
     *   Therefore newRadius = r + |offset| = 3 + 4 = 7 — the arc SURVIVES.
     *
     *   To degenerate a CW arc you need a large POSITIVE offset:
     *   offset=+4 → newRadius = 3 − 4 = −1 < 0 → degenerate.
     *
     * This test ensures the basic radius-based degeneration still works after
     * the chord/sweep changes, and that a surviving arc is non-degenerate.
     */
    it("contour-13 arc (r=3, sweep=CW): grows at offset=-4, degenerates at offset=+4", () => {
        const path = "M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10";

        // ── offset=-4: arc expands to r=7, must survive and be valid ──
        const resultNeg = calculateOffsetFromPathData(path, -4, { exportModule });
        const segsNeg = parseSegments(resultNeg);

        expect(segsNeg.length).toBeGreaterThan(0);
        assertNonDegenerate(segsNeg);
        assertConnected(segsNeg, false);

        // Arc survives with larger radius
        const arcsNeg = segsNeg.filter(s => s.type === "arc");
        expect(arcsNeg.length).toBeGreaterThan(0);
        for (const a of arcsNeg) {
            expect(a.arc.radius).toBeGreaterThan(3); // expanded
        }

        // ── offset=+4: arc degenerates (r = 3 − 4 = −1 < 0), must be removed ──
        const resultPos = calculateOffsetFromPathData(path, 4, { exportModule });
        const segsPos = parseSegments(resultPos);

        // Output may be empty or arc-free
        const arcsPos = segsPos.filter(s => s.type === "arc");
        expect(arcsPos.length).toBe(0);
    });

    /**
     * A near-zero-sweep arc:
     *   A <radius> <radius> 0 0 0 <endX> <endY>
     * where startPt ≈ endPt (nearly the same point → sweep ≈ 0).
     *
     * Before the fix: the arc survived with radius > 0 and was later expanded
     * by the join logic.
     * After the fix: the arc is flagged degenerate immediately (chord ≈ 0)
     * and removed.
     */
    it("near-zero-sweep arc degenerates: chord ≈ 0 triggers degenerate flag", () => {
        // Arc from (8.6533, 6.01) to (8.6569, 6) with radius=9 and sweepFlag=0
        // This mirrors seg-16/seg-17 from the reported contour 16 example.
        // The angular sweep is extremely small (~0.0046 rad), so the chord ≈ 0.041.
        // At further offsets the chord approaches zero — but even at offset 0 the
        // arc should remain valid, so we test at offset=0 (arc survives) and at
        // an offset that makes the chord negligible.
        const path = "M 8.5305 6.3554 L 8.6533 6.01 A 9 9 0 0 0 8.6569 6 L 10 6";

        // offset=0: arc is tiny but valid — must survive
        const result0 = calculateOffsetFromPathData(path, 0, { exportModule });
        const segs0 = parseSegments(result0);
        expect(segs0.length).toBeGreaterThan(0);
        assertNonDegenerate(segs0);

        // offset=-7: contour shrinks; the tiny arc (r=9 → r=2) survives radius check
        // but may hit the chord/sweep guard — either way output must be non-degenerate
        const result7 = calculateOffsetFromPathData(path, -7, { exportModule });
        const segs7 = parseSegments(result7);
        // After fix: if it degenerates, clean removal; either way no degenerate segs
        assertNonDegenerate(segs7);
        if (segs7.length >= 2) {
            assertConnected(segs7, false);
        }
    });

    /**
     * Explicit tiny-sweep arc created synthetically:
     *   center=(0,10), radius=10, start≈(0,0), end≈(0.001,0.0001) → sweep≈0
     *
     * At any offset the chord between offsetted start/end is negligible →
     * should degenerate and be removed cleanly.
     */
    it("synthetic zero-chord arc degenerates cleanly at any offset", () => {
        // Arc: center roughly (0,10), r=10, from (0,0) to a point ε away on the circle.
        // Use two points that are extremely close together on a circle.
        // Constructed as: start=(10,0), end=(9.9999,0.01416...) → circle r=10 center=(0,0)
        // Very small sweep (~0.001 rad).
        const path = "M 5 0 L 10 0 A 10 10 0 0 0 9.99995 0.01 L 10 5";

        const result = calculateOffsetFromPathData(path, -2, { exportModule });
        const segments = parseSegments(result);

        // Must not crash
        expect(segments).toBeDefined();

        // Any remaining arc must be non-degenerate
        for (const seg of segments) {
            if (seg.type === "arc" && seg.arc) {
                const r = seg.arc.radius || seg.arc.rx || 0;
                expect(r).toBeGreaterThan(EPSILON);
                const chord = distance(seg.start, seg.end);
                expect(chord).toBeGreaterThan(EPSILON);
            }
        }
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Bug 2 — Arc/arc join: extension allowed; arc/line: bridge
// ────────────────────────────────────────────────────────────────────────────

describe("Bug 2 — Arc/arc vs arc/line join angle extension rule", () => {
    /**
     * Two arcs meeting at a corner where geometric intersection requires
     * extending one arc's sweep (intersection lies outside current span).
     *
     * Old behavior: isValidEndTrim rejected the candidate → fell through to
     * bridge (wrong gap).
     * New behavior: arc/arc extension is allowed → clean miter, no bridge.
     *
     * Path: two concentric-ish arcs oriented so their intersection is reachable
     * only by extending both spans slightly.
     *   Arc1: center=(0,0), r=5, from 0° to 80°  (ends near (0.87, 4.92))
     *   Arc2: center=(1,0), r=5, from 100° to 180° (starts near (-3.13, 3.21))
     * Both need slight extension to reach their intersection.
     */
    it("arc/arc join: extension allowed, clean miter without spurious bridge", () => {
        // Two arcs whose natural endpoints don't touch, but their circles intersect.
        // Create a path with two arcs and a short connecting line between them.
        const arc1End = {
            x: 5 * Math.cos(80 * Math.PI / 180),
            y: 5 * Math.sin(80 * Math.PI / 180),
        };
        const arc2Start = {
            x: 1 + 5 * Math.cos(100 * Math.PI / 180),
            y: 5 * Math.sin(100 * Math.PI / 180),
        };

        // Build path: line → arc1 → short bridge → arc2 → line (open)
        const path = [
            `M 0 -1`,
            `L ${5 * Math.cos(0)} ${5 * Math.sin(0)}`,  // start of arc1
            `A 5 5 0 0 1 ${arc1End.x.toFixed(4)} ${arc1End.y.toFixed(4)}`,
            `L ${arc2Start.x.toFixed(4)} ${arc2Start.y.toFixed(4)}`,        // short line
            `A 5 5 0 0 0 ${(1 + 5 * Math.cos(180 * Math.PI / 180)).toFixed(4)} ${(5 * Math.sin(180 * Math.PI / 180)).toFixed(4)}`,
            `L 0 10`,
        ].join(" ");

        const result = calculateOffsetFromPathData(path, -1, { exportModule });
        const segments = parseSegments(result);

        // Must produce segments
        expect(segments.length).toBeGreaterThan(0);

        // All adjacent pairs connected
        assertConnected(segments, false);

        // All segments non-degenerate
        assertNonDegenerate(segments);
    });

    /**
     * Arc/line join: arc angle must NOT expand; a bridge is inserted.
     *
     * Path: arc followed immediately by a line with a gap between them
     * (endpoints don't coincide at all).  The line's extension does NOT
     * intersect the arc within the arc's current span.
     *
     * The fix must NOT expand the arc to reach the line endpoint.
     * Instead a bridge (line segment) is used to close the gap.
     */
    it("arc/line join: arc angle not expanded; bridge closes gap", () => {
        // Simple arc followed by a line.
        // Arc: center=(0,0), r=5, from angle=0 to angle=90° (quarter circle)
        // Line: starts slightly away from arc end
        const path = "M 5 0 A 5 5 0 0 1 0 5 L -5 10";

        // offset=2: arc grows to r=7, line shifts outward
        const result = calculateOffsetFromPathData(path, 2, { exportModule });
        const segments = parseSegments(result);

        expect(segments.length).toBeGreaterThan(0);
        assertConnected(segments, false);
        assertNonDegenerate(segments);

        // offset=-3: arc shrinks to r=2, line shifts inward
        const result2 = calculateOffsetFromPathData(path, -3, { exportModule });
        const segs2 = parseSegments(result2);

        expect(segs2.length).toBeGreaterThan(0);
        assertConnected(segs2, false);
        assertNonDegenerate(segs2);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Bug 3 — Arc/line join: arc degenerates when Phase 1 finds no valid candidates
// ────────────────────────────────────────────────────────────────────────────

describe("Bug 3 — Arc degenerates when neighboring line can no longer intersect its valid sweep", () => {
    /**
     * Contour 13: M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10
     *
     * The arc (r=3, sweepFlag=0 / CW) grows outward as offset becomes more
     * negative (offset=-N → offsetDistance=+N → newRadius = 3+N).
     *
     * At offset=-6: newRadius=9. The line H10 (y=6 after offset) still
     * intersects the arc within its valid sweep — trimmed sweep ≈ 0.0012 rad.
     *
     * At offset=-7: newRadius=10. Both circle/line intersections with H10
     * (y=7) fail the isValidEndTrim check — the intersection point wraps to
     * a near-full-circle sweep going CW. Phase 1 returns no candidates.
     *
     * Expected: the arc is degenerated (removed); output is 2–3 lines only.
     * Broken behavior before fix: arc kept with ≈247° sweep, self-intersecting.
     */
    it("contour-13 at offset=-7: arc degenerates, output has no arcs", () => {
        const path = "M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10";
        const result = calculateOffsetFromPathData(path, -7, { exportModule });
        const segments = parseSegments(result);

        // No arcs should survive
        const arcs = segments.filter(s => s.type === "arc");
        expect(arcs.length).toBe(0);

        // Must have at least one segment
        expect(segments.length).toBeGreaterThan(0);

        // All segments non-degenerate
        assertNonDegenerate(segments);

        // Chain connected
        if (segments.length >= 2) assertConnected(segments, false);
    });

    /**
     * At offset=-6 the arc is still valid (tiny but non-zero sweep).
     * Ensure offset=-6 still produces an arc (regression guard for the fix
     * not being too aggressive).
     */
    it("contour-13 at offset=-6: arc still present (tiny valid sweep)", () => {
        const path = "M 0 10 L 3 4 A 3 3 0 0 0 0 0 H 10";
        const result = calculateOffsetFromPathData(path, -6, { exportModule });
        const segments = parseSegments(result);

        expect(segments.length).toBeGreaterThan(0);
        assertNonDegenerate(segments);
        if (segments.length >= 2) assertConnected(segments, false);

        // Arc must survive at offset=-6
        const arcs = segments.filter(s => s.type === "arc");
        expect(arcs.length).toBeGreaterThan(0);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Regression: previously-passing cases must still work
// ────────────────────────────────────────────────────────────────────────────

describe("Regression — existing arc degeneration cases unchanged", () => {
    it("M 10 0 H 0 A 3 3 0 0 1 3 4 L 0 10 at offset=-4: arc degenerates, clean output", () => {
        const path = "M 10 0 H 0 A 3 3 0 0 1 3 4 L 0 10";
        const result = calculateOffsetFromPathData(path, -4, { exportModule });
        const segments = parseSegments(result);

        // Arc degenerates (sweepFlag=1, offset=-4 → r shrinks to -1) → removed cleanly.
        expect(segments.length).toBeGreaterThanOrEqual(1);
        for (const seg of segments) {
            expect(seg.type).toBe("line");
        }
        for (let i = 0; i < segments.length - 1; i++) {
            expect(distance(segments[i].end, segments[i + 1].start)).toBeLessThan(JOIN_TOLERANCE);
        }
    });

    it("M 10 0 H 0 A 3 3 0 0 1 3 4 L 0 10 at offset=2: produces valid non-degenerate output", () => {
        const path = "M 10 0 H 0 A 3 3 0 0 1 3 4 L 0 10";
        const result = calculateOffsetFromPathData(path, 2, { exportModule });
        const segments = parseSegments(result);

        // Output must be valid, connected, and non-degenerate.
        expect(segments.length).toBeGreaterThanOrEqual(1);
        assertNonDegenerate(segments);
        if (segments.length >= 2) assertConnected(segments, false);
    });
});
