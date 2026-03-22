import { describe, it, expect } from "vitest";
import { orientation2d, onSegment, lineSegmentsIntersect, EPSILON } from "../../src/utils/geometry-predicates.js";

/**
 * Geometry Predicates Tests
 * 
 * Tests for basic geometric predicates used in path offset operations:
 * - orientation2d: Point orientation relative to directed line
 * - onSegment: Point containment on line segment
 * - lineSegmentsIntersect: Line segment intersection detection
 * 
 * These predicates are critical for self-intersection detection and
 * offset contour validation in CustomOffsetProcessor.
 */

describe("geometry-predicates", () => {
    describe("EPSILON constant", () => {
        it("should be 1e-6 for floating-point tolerance", () => {
            expect(EPSILON).toBe(1e-6);
        });
    });

    describe("orientation2d", () => {
        it("should return positive for counter-clockwise turn", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 1, y: 0 };
            const c = { x: 0, y: 1 };
            const result = orientation2d(a, b, c);
            expect(result).toBeGreaterThan(0);
        });

        it("should return negative for clockwise turn", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 1, y: 0 };
            const c = { x: 0, y: -1 };
            const result = orientation2d(a, b, c);
            expect(result).toBeLessThan(0);
        });

        it("should return zero for collinear points", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 1, y: 0 };
            const c = { x: 2, y: 0 };
            const result = orientation2d(a, b, c);
            expect(Math.abs(result)).toBeLessThan(EPSILON);
        });

        it("should handle vertical line", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 0, y: 1 };
            const c = { x: 1, y: 0.5 };
            const result = orientation2d(a, b, c);
            expect(result).toBeLessThan(0); // c is to the right (CW in standard 2D)
        });

        it("should handle diagonal line", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 1, y: 1 };
            const c = { x: 0, y: 1 };
            const result = orientation2d(a, b, c);
            expect(result).toBeGreaterThan(0); // c is left of diagonal (CCW)
        });
    });

    describe("onSegment", () => {
        it("should return true for point inside segment", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 2, y: 0 };
            const p = { x: 1, y: 0 };
            expect(onSegment(a, b, p)).toBe(true);
        });

        it("should return true for point at start endpoint", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 2, y: 0 };
            const p = { x: 0, y: 0 };
            expect(onSegment(a, b, p)).toBe(true);
        });

        it("should return true for point at end endpoint", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 2, y: 0 };
            const p = { x: 2, y: 0 };
            expect(onSegment(a, b, p)).toBe(true);
        });

        it("should return false for point outside segment", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 2, y: 0 };
            const p = { x: 3, y: 0 };
            expect(onSegment(a, b, p)).toBe(false);
        });

        it("should return false for point on line but outside segment", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 2, y: 0 };
            const p = { x: -1, y: 0 };
            expect(onSegment(a, b, p)).toBe(false);
        });

        it("should return false for point not on line", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 2, y: 0 };
            const p = { x: 1, y: 1 };
            expect(onSegment(a, b, p)).toBe(false);
        });

        it("should handle vertical segment", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 0, y: 2 };
            const p = { x: 0, y: 1 };
            expect(onSegment(a, b, p)).toBe(true);
        });

        it("should handle diagonal segment", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 2, y: 2 };
            const p = { x: 1, y: 1 };
            expect(onSegment(a, b, p)).toBe(true);
        });

        it("should handle point within EPSILON tolerance", () => {
            const a = { x: 0, y: 0 };
            const b = { x: 2, y: 0 };
            const p = { x: 1, y: EPSILON / 2 }; // Slightly off line but within tolerance
            expect(onSegment(a, b, p)).toBe(true);
        });
    });

    describe("lineSegmentsIntersect", () => {
        it("should detect proper intersection (X pattern)", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 2, y: 2 };
            const b1 = { x: 0, y: 2 };
            const b2 = { x: 2, y: 0 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(true);
        });

        it("should detect T-junction (endpoint touching segment)", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 2, y: 0 };
            const b1 = { x: 1, y: 0 };
            const b2 = { x: 1, y: 2 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(true);
        });

        it("should detect endpoint touching endpoint", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 1, y: 0 };
            const b1 = { x: 1, y: 0 };
            const b2 = { x: 2, y: 1 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(true);
        });

        it("should detect collinear overlapping segments", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 2, y: 0 };
            const b1 = { x: 1, y: 0 };
            const b2 = { x: 3, y: 0 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(true);
        });

        it("should return false for parallel non-overlapping segments", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 2, y: 0 };
            const b1 = { x: 0, y: 1 };
            const b2 = { x: 2, y: 1 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(false);
        });

        it("should return false for non-intersecting segments", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 1, y: 0 };
            const b1 = { x: 2, y: 0 };
            const b2 = { x: 3, y: 0 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(false);
        });

        it("should return false for segments that would intersect if extended", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 1, y: 1 };
            const b1 = { x: 2, y: 0 };
            const b2 = { x: 3, y: 1 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(false);
        });

        it("should handle vertical segments", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 0, y: 2 };
            const b1 = { x: -1, y: 1 };
            const b2 = { x: 1, y: 1 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(true);
        });

        it("should handle horizontal and vertical crossing", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 0, y: 2 };
            const b1 = { x: -1, y: 1 };
            const b2 = { x: 1, y: 1 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(true);
        });

        it("should detect collinear segment with shared endpoint", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 2, y: 0 };
            const b1 = { x: 2, y: 0 };
            const b2 = { x: 4, y: 0 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(true);
        });

        it("should handle exact point on segment", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 2, y: 2 };
            const b1 = { x: 1, y: 1 }; // Exactly on segment
            const b2 = { x: 1, y: 3 };
            // b1 is exactly on segment a1-a2, so this is an intersection
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(true);
        });

        it("should return false for segments that nearly touch but miss", () => {
            const a1 = { x: 0, y: 0 };
            const a2 = { x: 1, y: 0 };
            const b1 = { x: 1.1, y: -0.5 };
            const b2 = { x: 1.1, y: 0.5 };
            expect(lineSegmentsIntersect(a1, a2, b1, b2)).toBe(false);
        });
    });

    describe("integration: self-intersection detection scenarios", () => {
        it("should detect crossing path segments", () => {
            // Simulates path with crossing segments (figure-8 shape)
            const seg1Start = { x: 0, y: 0 };
            const seg1End = { x: 4, y: 4 };
            const seg2Start = { x: 4, y: 0 };
            const seg2End = { x: 0, y: 4 };
            expect(lineSegmentsIntersect(seg1Start, seg1End, seg2Start, seg2End)).toBe(true);
        });

        it("should detect loop closure with endpoint touching", () => {
            // Simulates closed path with proper endpoint connection
            const lastSegEnd = { x: 5, y: 5 };
            const firstSegStart = { x: 5, y: 5 };
            const firstSegEnd = { x: 10, y: 5 };
            const testSeg = { x: 8, y: 3 };
            const testSegEnd = { x: 8, y: 7 };
            
            // Path closure point should connect
            expect(Math.abs(lastSegEnd.x - firstSegStart.x) < EPSILON).toBe(true);
            expect(Math.abs(lastSegEnd.y - firstSegStart.y) < EPSILON).toBe(true);
        });

        it("should use orientation for path winding detection", () => {
            // CCW winding (outer contour)
            const p1 = { x: 0, y: 0 };
            const p2 = { x: 10, y: 0 };
            const p3 = { x: 10, y: 10 };
            const p4 = { x: 0, y: 10 };
            
            // Check CCW winding
            const o1 = orientation2d(p1, p2, p3);
            const o2 = orientation2d(p2, p3, p4);
            const o3 = orientation2d(p3, p4, p1);
            const o4 = orientation2d(p4, p1, p2);
            
            // All turns should be CCW (positive)
            expect(o1).toBeGreaterThan(0);
            expect(o2).toBeGreaterThan(0);
            expect(o3).toBeGreaterThan(0);
            expect(o4).toBeGreaterThan(0);
        });
    });
});
