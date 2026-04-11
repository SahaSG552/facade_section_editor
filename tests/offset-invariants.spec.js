/**
 * Offset Continuity & Degenerate Invariants - RED Tests
 *
 * Tests for segment-level invariants that must hold in offset results:
 * 1. No zero-length segments (start == end within epsilon)
 * 2. Stitched continuity: adjacent segments connected (end of seg[i] == start of seg[i+1])
 * 3. No implicit extra closure segment when path is already closed
 *
 * Expected to FAIL (RED) before stitch/degenerate fix (Wave 2.5).
 */

import { describe, it, expect, vi } from "vitest";

// Mock Paper.js-dependent module
vi.mock("../src/operations/PaperBooleanProcessor.js", () => ({
    resolveSelfIntersections: (pathData) => pathData,
    resolveSelfIntersectionsDetailed: (pathData) => ({ pathData, components: [] }),
}));

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();

// Epsilon for floating-point continuity checks
const EPS = 1e-6;

/**
 * Check if two points are equal within epsilon
 */
function pointsEqual(p1, p2, epsilon = EPS) {
    if (!p1 || !p2) return false;
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return dx < epsilon && dy < epsilon;
}

/**
 * Check if segment has zero length (degenerate)
 */
function isZeroLengthSegment(segment, epsilon = EPS) {
    return pointsEqual(segment.start, segment.end, epsilon);
}

/**
 * Check if two segments are stitched (end of seg1 == start of seg2)
 */
function areSegmentsStitched(seg1, seg2, epsilon = EPS) {
    return pointsEqual(seg1.end, seg2.start, epsilon);
}

describe("Offset Continuity & Degenerate Invariants", () => {
    describe("No Zero-Length Segments", () => {
        it("single-line offset should have no zero-length segments", async () => {
            const engine = new OffsetEngine({
                joinType: "sharp",
                capType: "flat",
                exportModule
            });
            const pathData = "M 0 0 V 10";
            const result = await engine.processPath(pathData, 1);

            console.log("TEST: zero-length segments in single-line offset");
            console.log("Input path:", pathData);
            console.log("Offset distance: 1");

            const contour = result.contours[0];
            console.log("Contour segments count:", contour.segments.length);
            console.log("Contour closed (SHOULD BE FALSE for open path):", contour.closed);

            // Check each segment for zero-length
            const zeroLengthSegments = [];
            contour.segments.forEach((seg, idx) => {
                const isZero = isZeroLengthSegment(seg);
                console.log(`  Segment ${idx}: start=${JSON.stringify(seg.start)}, end=${JSON.stringify(seg.end)}, isZero=${isZero}`);
                if (isZero) {
                    zeroLengthSegments.push(idx);
                }
            });

            // MUST FAIL: expect no zero-length segments
            expect(zeroLengthSegments).toEqual([]);
            
            // ALSO VERIFY: open path should not be marked closed
            // (This is the KNOWN BUG from Task 1)
            expect(contour.closed).toBe(false);
        });

        it("multi-segment open path should have no zero-length segments", async () => {
            const engine = new OffsetEngine({
                joinType: "sharp",
                capType: "flat",
                exportModule
            });
            const pathData = "M 0 0 L 10 0 L 10 10";
            const result = await engine.processPath(pathData, 1);

            console.log("TEST: zero-length segments in multi-segment path");
            console.log("Input path:", pathData);

            const contour = result.contours[0];
            console.log("Contour segments count:", contour.segments.length);

            const zeroLengthSegments = [];
            contour.segments.forEach((seg, idx) => {
                const isZero = isZeroLengthSegment(seg);
                if (isZero) {
                    zeroLengthSegments.push(idx);
                    console.log(`  ZERO-LENGTH at ${idx}: ${JSON.stringify(seg)}`);
                }
            });

            // MUST FAIL: expect no zero-length segments
            expect(zeroLengthSegments).toEqual([]);
        });

        it("closed contour offset should have no zero-length segments", async () => {
            const engine = new OffsetEngine({
                joinType: "round",
                capType: "round",
                exportModule
            });
            const pathData = "M 0 0 L 10 0 L 10 10 L 0 10 Z";
            const result = await engine.processPath(pathData, 1);

            console.log("TEST: zero-length segments in closed contour");
            console.log("Input path:", pathData);

            const contour = result.contours[0];
            console.log("Contour segments count:", contour.segments.length);
            console.log("Contour closed:", contour.closed);

            const zeroLengthSegments = [];
            contour.segments.forEach((seg, idx) => {
                const isZero = isZeroLengthSegment(seg);
                if (isZero) {
                    zeroLengthSegments.push(idx);
                }
            });

            // MUST FAIL: expect no zero-length segments
            expect(zeroLengthSegments).toEqual([]);
        });
    });

    describe("Stitched Continuity", () => {
        it("single-line offset segments should be stitched end-to-start", async () => {
            const engine = new OffsetEngine({
                joinType: "sharp",
                capType: "flat",
                exportModule
            });
            const pathData = "M 0 0 V 10";
            const result = await engine.processPath(pathData, 1);

            console.log("TEST: stitched continuity in single-line offset");
            console.log("Input path:", pathData);

            const contour = result.contours[0];
            console.log("Contour segments count:", contour.segments.length);

            // Check stitching between adjacent segments
            const unstitchedPairs = [];
            for (let i = 0; i < contour.segments.length - 1; i++) {
                const seg1 = contour.segments[i];
                const seg2 = contour.segments[i + 1];
                const stitched = areSegmentsStitched(seg1, seg2);
                console.log(`  Pair ${i}-${i + 1}: seg1.end=${JSON.stringify(seg1.end)}, seg2.start=${JSON.stringify(seg2.start)}, stitched=${stitched}`);
                if (!stitched) {
                    unstitchedPairs.push({ i, gap: { from: seg1.end, to: seg2.start } });
                }
            }

            // MUST FAIL: expect all pairs stitched
            expect(unstitchedPairs).toEqual([]);
        });

        it("multi-segment path segments should be stitched end-to-start", async () => {
            const engine = new OffsetEngine({
                joinType: "sharp",
                capType: "flat",
                exportModule
            });
            const pathData = "M 0 0 L 10 0 L 10 10 L 20 20";
            const result = await engine.processPath(pathData, 1);

            console.log("TEST: stitched continuity in multi-segment path");
            console.log("Input path:", pathData);

            const contour = result.contours[0];
            console.log("Contour segments count:", contour.segments.length);

            const unstitchedPairs = [];
            for (let i = 0; i < contour.segments.length - 1; i++) {
                const seg1 = contour.segments[i];
                const seg2 = contour.segments[i + 1];
                const stitched = areSegmentsStitched(seg1, seg2);
                if (!stitched) {
                    unstitchedPairs.push(i);
                    console.log(`  UNSTITCHED at pair ${i}-${i + 1}: gap=${Math.sqrt(
                        Math.pow(seg2.start.x - seg1.end.x, 2) + 
                        Math.pow(seg2.start.y - seg1.end.y, 2)
                    )}`);
                }
            }

            // MUST FAIL: expect all pairs stitched
            expect(unstitchedPairs).toEqual([]);
        });

        it("round-cap offset segments should be stitched", async () => {
            const engine = new OffsetEngine({
                joinType: "round",
                capType: "round",
                exportModule
            });
            const pathData = "M 0 0 V 10";
            const result = await engine.processPath(pathData, 2);

            console.log("TEST: stitched continuity with round caps");
            console.log("Input path:", pathData);
            console.log("Offset distance: 2");

            const contour = result.contours[0];
            console.log("Contour segments count:", contour.segments.length);

            const unstitchedPairs = [];
            for (let i = 0; i < contour.segments.length - 1; i++) {
                const seg1 = contour.segments[i];
                const seg2 = contour.segments[i + 1];
                const stitched = areSegmentsStitched(seg1, seg2);
                if (!stitched) {
                    unstitchedPairs.push(i);
                }
            }

            // MUST FAIL: expect all pairs stitched
            expect(unstitchedPairs).toEqual([]);
        });
    });

    describe("No Implicit Extra Closure Segment", () => {
        it("already-closed contour should not add extra closure segment", async () => {
            const engine = new OffsetEngine({
                joinType: "sharp",
                capType: "flat",
                exportModule
            });
            const pathData = "M 0 0 L 10 0 L 10 10 L 0 10 Z";
            const result = await engine.processPath(pathData, 1);

            console.log("TEST: no implicit closure in already-closed contour");
            console.log("Input path:", pathData);
            console.log("Input: already closed (ends with Z)");

            const contour = result.contours[0];
            console.log("Contour closed:", contour.closed);
            console.log("Contour segments count:", contour.segments.length);

            // For a closed rectangle, offset should produce closed contour
            // But it should NOT add an extra closure segment if first and last already meet
            const firstStart = contour.segments[0].start;
            const lastEnd = contour.segments[contour.segments.length - 1].end;
            
            console.log(`  First segment start: ${JSON.stringify(firstStart)}`);
            console.log(`  Last segment end: ${JSON.stringify(lastEnd)}`);
            
            const firstAndLastConnected = pointsEqual(firstStart, lastEnd);
            console.log(`  First-last connected: ${firstAndLastConnected}`);

            // Count closure segments (duplicate start point at end)
            let implicitClosureSegments = 0;
            const lastSeg = contour.segments[contour.segments.length - 1];
            const secondToLastSeg = contour.segments[contour.segments.length - 2];
            
            // If last segment's end connects back to first segment's start,
            // AND there's an extra segment that's degenerate or redundant, flag it
            if (lastSeg && secondToLastSeg && 
                pointsEqual(lastSeg.end, firstStart) && 
                pointsEqual(lastSeg.start, secondToLastSeg.end)) {
                // This might be a parasitic closure segment
                if (pointsEqual(lastSeg.start, lastSeg.end)) {
                    implicitClosureSegments++;
                }
            }

            // MUST FAIL: expect no extra closure segments
            expect(implicitClosureSegments).toBe(0);
        });

        it("open contour with both-sides closure should not duplicate closure segment", async () => {
            const engine = new OffsetEngine({
                joinType: "sharp",
                capType: "flat",
                exportModule
            });
            const pathData = "M 0 0 V 10";
            const result = await engine.processPath(pathData, 1, { mode: "two-sides-flat-caps" });

            console.log("TEST: no duplicate closure in two-sides-caps mode");
            console.log("Input path:", pathData);
            console.log("Mode: two-sides-flat-caps");

            const contour = result.contours[0];
            console.log("Contour closed:", contour.closed);
            console.log("Contour segments count:", contour.segments.length);

            // If closed, first and last should connect
            if (contour.closed) {
                const firstStart = contour.segments[0].start;
                const lastEnd = contour.segments[contour.segments.length - 1].end;
                
                console.log(`  First segment start: ${JSON.stringify(firstStart)}`);
                console.log(`  Last segment end: ${JSON.stringify(lastEnd)}`);

                // Should NOT have a parasitic closure segment
                // Check for degenerate segments at the boundary
                let degenerateClosureCount = 0;
                for (let i = contour.segments.length - 2; i < contour.segments.length; i++) {
                    if (i >= 0 && isZeroLengthSegment(contour.segments[i])) {
                        degenerateClosureCount++;
                    }
                }

                // MUST FAIL: expect no degenerate closure segments
                expect(degenerateClosureCount).toBe(0);
            }
        });

        it("single-segment offset should not have parasitic closure loop", async () => {
            const engine = new OffsetEngine({
                joinType: "sharp",
                capType: "flat",
                exportModule
            });
            const pathData = "M 5 5 L 15 15";
            const result = await engine.processPath(pathData, 1);

            console.log("TEST: single-segment path parasitic closure");
            console.log("Input path:", pathData);

            const contour = result.contours[0];
            console.log("Contour closed:", contour.closed);
            console.log("Contour segments count:", contour.segments.length);

            // For a single open segment, we expect:
            // - Two offset lines (left and right caps, or just one if one-sided)
            // - No parasitic closure loop
            
            // Check for pattern: segment ends at start (indicating closure attempt)
            let parasiteCount = 0;
            for (let i = 0; i < contour.segments.length - 1; i++) {
                const seg = contour.segments[i];
                const nextSeg = contour.segments[i + 1];
                // If a segment ends where another starts AND they're redundant
                if (pointsEqual(seg.end, nextSeg.start) && pointsEqual(seg.start, nextSeg.end)) {
                    parasiteCount++;
                    console.log(`  Potential parasitic loop at segments ${i}-${i + 1}`);
                }
            }

            // MUST FAIL: expect no parasitic loops
            expect(parasiteCount).toBe(0);
        });
    });

    describe("Composite Invariant Checks", () => {
        it("all segments must satisfy: no zero-length AND stitched AND no parasites", async () => {
            const engine = new OffsetEngine({
                joinType: "round",
                capType: "round",
                exportModule
            });
            const pathData = "M 0 0 L 5 5 L 10 0 L 10 10";
            const result = await engine.processPath(pathData, 1);

            console.log("TEST: composite invariant check");
            console.log("Input path:", pathData);

            const contour = result.contours[0];
            const violations = {
                zeroLength: [],
                unstitched: [],
                parasites: []
            };

            // Check 1: No zero-length segments
            contour.segments.forEach((seg, idx) => {
                if (isZeroLengthSegment(seg)) {
                    violations.zeroLength.push(idx);
                }
            });

            // Check 2: Stitched continuity
            for (let i = 0; i < contour.segments.length - 1; i++) {
                if (!areSegmentsStitched(contour.segments[i], contour.segments[i + 1])) {
                    violations.unstitched.push(i);
                }
            }

            // Check 3: No parasitic loops
            for (let i = 0; i < contour.segments.length - 1; i++) {
                const seg = contour.segments[i];
                const nextSeg = contour.segments[i + 1];
                if (pointsEqual(seg.end, nextSeg.start) && pointsEqual(seg.start, nextSeg.end)) {
                    violations.parasites.push(i);
                }
            }

            console.log("Violations found:", violations);

            // MUST FAIL: expect zero violations
            expect(violations).toEqual({
                zeroLength: [],
                unstitched: [],
                parasites: []
            });
        });
    });
});
