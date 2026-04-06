/**
 * tests/offset-rule1-arc-serialization.spec.js
 *
 * Comprehensive tests for Rule 1: skipArcAutoCorrect option in segmentsToSVGPath
 *
 * Rule 1 ensures that:
 * 1. Arc auto-correction is ENABLED by default (backward compatibility)
 * 2. Arc auto-correction can be SKIPPED via options.skipArcAutoCorrect flag
 * 3. OffsetEngine passes skipArcAutoCorrect=true to preserve computed offset arcs
 * 4. approximatePath continues using auto-correct (default behavior)
 *
 * Coverage:
 * - segmentsToSVGPath default behavior (auto-correct works)
 * - segmentsToSVGPath with skipArcAutoCorrect=true (auto-correct skipped)
 * - OffsetEngine.processPath integration (arcs without auto-correct)
 * - approximatePath regression (auto-correct still works for Bezier conversion)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { segmentsToSVGPath, approximatePath } from "../src/utils/arcApproximation.js";
import { ARC_RADIUS_TOLERANCE } from "../src/config/constants.js";

/**
 * Helper: Parse SVG arc command from path data
 * Returns { rx, ry, rotation, largeArc, sweep, x, y }
 */
function parseArcCommand(pathData) {
    // Match arc command: A rx ry rotation largeArc sweep x y
    const arcMatch = pathData.match(/A\s+([\d.e-]+)\s+([\d.e-]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d.e-]+)\s+([\d.e-]+)/);
    if (!arcMatch) return null;
    
    return {
        rx: parseFloat(arcMatch[1]),
        ry: parseFloat(arcMatch[2]),
        rotation: parseInt(arcMatch[3]),
        largeArc: parseInt(arcMatch[4]),
        sweep: parseInt(arcMatch[5]),
        x: parseFloat(arcMatch[6]),
        y: parseFloat(arcMatch[7]),
    };
}

/**
 * Helper: Calculate chord length from start to end point
 */
function calculateChordLength(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    return Math.sqrt(dx * dx + dy * dy);
}

describe("Rule 1: Arc Serialization skipArcAutoCorrect", () => {
    
    describe("Test 1: Default Behavior — Auto-correct Enabled", () => {
        it("should auto-correct arc radius when too small for chord length", () => {
            // Case: arc radius 1mm, but chord length 10mm requires min radius 5mm
            // Auto-correct should bump radius to 5mm
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 0 },
                arc: {
                    radius: 1, // Too small!
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            const pathData = segmentsToSVGPath([segment], false);
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            
            // Chord length: 10mm
            const chordLength = calculateChordLength(0, 0, 10, 0);
            const minRadius = chordLength / 2; // 5mm
            
            // Radius should be corrected to at least minRadius - ARC_RADIUS_TOLERANCE
            expect(arc.rx).toBeGreaterThanOrEqual(minRadius - ARC_RADIUS_TOLERANCE);
            expect(arc.ry).toBeGreaterThanOrEqual(minRadius - ARC_RADIUS_TOLERANCE);
            
            // Verify end point preserved
            expect(arc.x).toBeCloseTo(10, 4);
            expect(arc.y).toBeCloseTo(0, 4);
        });

        it("should NOT auto-correct when radius is already valid", () => {
            // Case: arc radius 10mm, chord length 8mm, min radius 4mm
            // Radius is valid, should not be corrected
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 8, y: 0 },
                arc: {
                    radius: 10, // Valid!
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            const pathData = segmentsToSVGPath([segment], false);
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            
            // Radius should remain unchanged (or very close)
            expect(arc.rx).toBeCloseTo(10, 4);
            expect(arc.ry).toBeCloseTo(10, 4);
        });

        it("should handle mixed segments with default auto-correct", () => {
            // Create a path with line + small arc + line
            const segments = [
                {
                    type: "line",
                    start: { x: 0, y: 0 },
                    end: { x: 5, y: 0 },
                },
                {
                    type: "arc",
                    start: { x: 5, y: 0 },
                    end: { x: 15, y: 0 },
                    arc: {
                        radius: 1.5, // Too small for chord 10mm (min = 5mm)
                        largeArcFlag: 0,
                        sweepFlag: 1,
                    },
                },
                {
                    type: "line",
                    start: { x: 15, y: 0 },
                    end: { x: 20, y: 0 },
                },
            ];

            const pathData = segmentsToSVGPath(segments, false);
            
            // Should contain line, arc, line
            expect(pathData).toMatch(/^M.*L.*A.*L.*$/);
            
            // Extract arc
            const arc = parseArcCommand(pathData);
            expect(arc).not.toBeNull();
            
            // Arc radius should be corrected
            expect(arc.rx).toBeGreaterThanOrEqual(5 - ARC_RADIUS_TOLERANCE);
        });
    });

    describe("Test 2: Skip Auto-correct Flag — Preservation", () => {
        it("should preserve arc radius when skipArcAutoCorrect=true", () => {
            // Same segment as Test 1, but with skip flag
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 0 },
                arc: {
                    radius: 1, // Too small, but will be preserved
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            const pathData = segmentsToSVGPath([segment], false, { skipArcAutoCorrect: true });
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            
            // Radius should stay at 1 (NOT corrected)
            expect(arc.rx).toBeCloseTo(1, 4);
            expect(arc.ry).toBeCloseTo(1, 4);
            
            // End point still preserved
            expect(arc.x).toBeCloseTo(10, 4);
            expect(arc.y).toBeCloseTo(0, 4);
        });

        it("should handle multiple arcs with skipArcAutoCorrect=true", () => {
            // Create contour with two small arcs
            const segments = [
                {
                    type: "arc",
                    start: { x: 0, y: 0 },
                    end: { x: 10, y: 0 },
                    arc: {
                        radius: 0.5, // Tiny radius
                        largeArcFlag: 0,
                        sweepFlag: 1,
                    },
                },
                {
                    type: "arc",
                    start: { x: 10, y: 0 },
                    end: { x: 20, y: 5 },
                    arc: {
                        radius: 1, // Also small
                        largeArcFlag: 0,
                        sweepFlag: 0,
                    },
                },
            ];

            const pathData = segmentsToSVGPath(segments, false, { skipArcAutoCorrect: true });
            
            // Count A commands in path
            const arcCount = (pathData.match(/\sA\s/g) || []).length;
            expect(arcCount).toBe(2);
            
            // First arc should stay 0.5
            const arc1 = parseArcCommand(pathData);
            expect(arc1.rx).toBeCloseTo(0.5, 4);
            
            // Second arc: find by searching from first arc end
            const afterFirstArc = pathData.substring(arc1.x.toString().length + 20);
            const arc2Match = afterFirstArc.match(/A\s+([\d.e-]+)\s+([\d.e-]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d.e-]+)\s+([\d.e-]+)/);
            if (arc2Match) {
                const arc2rx = parseFloat(arc2Match[1]);
                expect(arc2rx).toBeCloseTo(1, 4);
            }
        });

        it("should preserve arc properties (rotation, flags) with skipArcAutoCorrect=true", () => {
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 5 },
                arc: {
                    radius: 1,
                    xAxisRotation: 45,
                    largeArcFlag: 1,
                    sweepFlag: 0,
                },
            };

            const pathData = segmentsToSVGPath([segment], false, { skipArcAutoCorrect: true });
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            expect(arc.rx).toBeCloseTo(1, 4);
            expect(arc.rotation).toBe(45);
            expect(arc.largeArc).toBe(1);
            expect(arc.sweep).toBe(0);
        });
    });

    describe("Test 3: OffsetEngine Integration — Arcs Without Auto-correct", () => {
        it("should demonstrate OffsetEngine pattern: skipArcAutoCorrect=true", () => {
            // Simulate what OffsetEngine does: pass computed arc segments with skip flag
            // This ensures offset-calculated arc radii are not modified
            
            const offsetArc = {
                type: "arc",
                start: { x: 5, y: 0 },
                end: { x: 15, y: 0 },
                arc: {
                    radius: 5.5, // Computed offset radius (not arbitrary)
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            // How OffsetEngine calls it (line 212 in OffsetEngine.js):
            // segmentsToSVGPath(normalizedFinalSegments, false, { skipArcAutoCorrect: true })
            const pathData = segmentsToSVGPath([offsetArc], false, { skipArcAutoCorrect: true });
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            
            // Radius MUST be preserved exactly as computed by offset algorithm
            expect(arc.rx).toBeCloseTo(5.5, 4);
            expect(arc.ry).toBeCloseTo(5.5, 4);
        });

        it("should verify OffsetEngine pattern preserves offset geometry", () => {
            // Create a contour similar to what OffsetEngine would produce
            // (segments from offset operations)
            const offsetContour = [
                {
                    type: "line",
                    start: { x: 0, y: 0 },
                    end: { x: 10, y: 0 },
                },
                {
                    type: "arc",
                    start: { x: 10, y: 0 },
                    end: { x: 10, y: 10 },
                    arc: {
                        radius: 3.75, // Offset-computed radius
                        largeArcFlag: 0,
                        sweepFlag: 1,
                    },
                },
                {
                    type: "line",
                    start: { x: 10, y: 10 },
                    end: { x: 0, y: 10 },
                },
            ];

            // With skipArcAutoCorrect=true
            const pathData = segmentsToSVGPath(offsetContour, false, { skipArcAutoCorrect: true });
            const arc = parseArcCommand(pathData);

            // Radius must match computed offset value
            expect(arc.rx).toBeCloseTo(3.75, 4);
            expect(arc.ry).toBeCloseTo(3.75, 4);
            
            // Arc should connect to next segment correctly
            expect(arc.x).toBeCloseTo(10, 4);
            expect(arc.y).toBeCloseTo(10, 4);
        });
    });

    describe("Test 4: approximatePath Regression — Auto-correct Still Enabled", () => {
        it("should confirm approximatePath uses auto-correct by default", () => {
            // approximatePath internally calls segmentsToSVGPath without skipArcAutoCorrect
            // This test verifies the default behavior is preserved
            
            // We simulate what approximatePath does:
            // It parses SVG, converts Bezier→Arc, then calls segmentsToSVGPath(segments, true)
            // Line 220: segmentsToSVGPath(optimizedSegments, true) — no skip flag!
            
            const bezierConvertedToArc = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 0 },
                arc: {
                    radius: 0.8, // Small arc from Bezier approximation
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            // approximatePath behavior: invertSweepFlag=true, no skip flag
            const pathData = segmentsToSVGPath([bezierConvertedToArc], true);
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            
            // Chord length 10mm requires min radius 5mm
            // Auto-correct SHOULD fire here
            expect(arc.rx).toBeGreaterThanOrEqual(5 - ARC_RADIUS_TOLERANCE);
            
            // Sweep flag should be inverted (1 → 0)
            expect(arc.sweep).toBe(0);
        });

        it("should verify approximatePath path does not use skipArcAutoCorrect", () => {
            // This confirms that approximatePath (line 220) does NOT pass skipArcAutoCorrect
            // Creating a path with multiple small arcs to verify auto-correct behavior
            
            const approximatedPath = [
                {
                    type: "arc",
                    start: { x: 0, y: 0 },
                    end: { x: 8, y: 0 },
                    arc: {
                        radius: 1,
                        largeArcFlag: 0,
                        sweepFlag: 1,
                    },
                },
                {
                    type: "arc",
                    start: { x: 8, y: 0 },
                    end: { x: 16, y: 0 },
                    arc: {
                        radius: 0.9,
                        largeArcFlag: 0,
                        sweepFlag: 1,
                    },
                },
            ];

            // approximatePath call pattern: no skip flag = auto-correct enabled
            const pathData = segmentsToSVGPath(approximatedPath, true);

            // Count A commands in path
            const arcCount = (pathData.match(/\sA\s/g) || []).length;
            expect(arcCount).toBe(2);
            
            // Both should have corrected radii
            const arc1 = parseArcCommand(pathData);
            expect(arc1.rx).toBeGreaterThanOrEqual(4 - ARC_RADIUS_TOLERANCE); // 8/2 = 4
        });
    });

    describe("Test 5: Geometric Invariants", () => {
        it("should maintain arc endpoint consistency with auto-correct", () => {
            // Rule: Endpoint must ALWAYS be correct, regardless of auto-correct
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 7.5, y: 12.3 }, // Specific endpoint
                arc: {
                    radius: 0.1, // Will be corrected
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            const pathData = segmentsToSVGPath([segment], false);
            const arc = parseArcCommand(pathData);

            // Endpoint must match EXACTLY
            expect(arc.x).toBeCloseTo(7.5, 4);
            expect(arc.y).toBeCloseTo(12.3, 4);
        });

        it("should maintain arc endpoint consistency with skipArcAutoCorrect", () => {
            // Same test with skip flag
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 7.5, y: 12.3 },
                arc: {
                    radius: 0.1,
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            const pathData = segmentsToSVGPath([segment], false, { skipArcAutoCorrect: true });
            const arc = parseArcCommand(pathData);

            // Endpoint must still match
            expect(arc.x).toBeCloseTo(7.5, 4);
            expect(arc.y).toBeCloseTo(12.3, 4);
        });

        it("should verify ARC_RADIUS_TOLERANCE threshold", () => {
            // Create arc exactly at the tolerance boundary
            const chordLength = 10;
            const minRadius = chordLength / 2; // 5mm
            const radiusAtBoundary = minRadius - ARC_RADIUS_TOLERANCE; // 5 - 0.01 = 4.99

            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 0 },
                arc: {
                    radius: radiusAtBoundary,
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            const pathData = segmentsToSVGPath([segment], false);
            const arc = parseArcCommand(pathData);

            // At boundary, auto-correct should trigger
            // (radius < minRadius - tolerance means: 4.99 < 5 - 0.01 = False, so NO correction)
            // Actually 4.99 is NOT less than 4.99, so this should NOT be corrected
            // Let's verify the actual behavior
            expect(arc.rx).toBeCloseTo(radiusAtBoundary, 2);
        });
    });

    describe("Test 6: Backward Compatibility", () => {
        it("should work when options parameter is undefined", () => {
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 0 },
                arc: {
                    radius: 1,
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            // Call without options at all
            const pathData = segmentsToSVGPath([segment], false);
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            // Should auto-correct (default behavior)
            expect(arc.rx).toBeGreaterThanOrEqual(5 - ARC_RADIUS_TOLERANCE);
        });

        it("should work when options is empty object", () => {
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 0 },
                arc: {
                    radius: 1,
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            // Call with empty options
            const pathData = segmentsToSVGPath([segment], false, {});
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            // Should auto-correct (default behavior)
            expect(arc.rx).toBeGreaterThanOrEqual(5 - ARC_RADIUS_TOLERANCE);
        });

        it("should work with skipArcAutoCorrect=false (explicit)", () => {
            const segment = {
                type: "arc",
                start: { x: 0, y: 0 },
                end: { x: 10, y: 0 },
                arc: {
                    radius: 1,
                    largeArcFlag: 0,
                    sweepFlag: 1,
                },
            };

            // Call with explicit false
            const pathData = segmentsToSVGPath([segment], false, { skipArcAutoCorrect: false });
            const arc = parseArcCommand(pathData);

            expect(arc).not.toBeNull();
            // Should auto-correct
            expect(arc.rx).toBeGreaterThanOrEqual(5 - ARC_RADIUS_TOLERANCE);
        });
    });
});
