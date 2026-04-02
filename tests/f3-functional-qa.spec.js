/**
 * F3 — Functional QA Test Suite for Offset Tool Rewrite
 *
 * Tests ALL 8 scenarios:
 * A: Line offset
 * B: Arc offset (CCW)
 * C: Sharp join stitching
 * D: Round join arc segment
 * E: capBothSides non-degenerate caps
 * F: SVG arc round-trip preserves center
 * G: Edge case — empty input
 * H: Edge case — zero-distance offset
 */

import { describe, it, expect, vi } from "vitest";

// Mock Paper.js-dependent module so OffsetTrimmer can be imported
vi.mock("../src/operations/PaperBooleanProcessor.js", () => ({
    resolveSelfIntersections: (pathData) => pathData,
}));

import OffsetCurveEvaluator from "../src/operations/OffsetCurveEvaluator.js";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";
import { capBothSides } from "../src/operations/OffsetCapper.js";
import {
    segmentsToPathString,
    pathStringToSegments,
} from "../src/operations/OffsetTrimmer.js";

const { offsetSegment } = OffsetCurveEvaluator;
const TOLERANCE = 0.1;

function approx(a, b, tol = TOLERANCE) {
    return Math.abs(a - b) <= tol;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario A: Line offset
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario A: Line offset", () => {
    const line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
    let result;

    it("A1 — offsetSegment returns a value (no crash)", () => {
        result = offsetSegment(line, 5);
        expect(result).toBeTruthy();
    });

    it("A2 — result is new object (immutability)", () => {
        result = offsetSegment(line, 5);
        expect(result).not.toBe(line);
    });

    it("A3 — |start.y| ≈ 5 (offset distance applied)", () => {
        result = offsetSegment(line, 5);
        expect(result.start).toBeDefined();
        expect(Math.abs(result.start.y)).toBeGreaterThan(4.9);
        expect(Math.abs(result.start.y)).toBeLessThan(5.1);
    });

    it("A4 — start.y ≈ end.y (parallel offset)", () => {
        result = offsetSegment(line, 5);
        expect(approx(result.start.y, result.end.y)).toBe(true);
    });

    it("A5 — X coordinates preserved", () => {
        result = offsetSegment(line, 5);
        expect(approx(result.start.x, 0)).toBe(true);
        expect(approx(result.end.x, 10)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario B: Arc offset (CCW)
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario B: Arc offset (CCW)", () => {
    const arc = {
        type: "arc",
        start: { x: 10, y: 0 },
        end: { x: 0, y: 10 },
        arc: {
            center: { x: 0, y: 0 },
            radius: 10,
            startAngle: 0,
            endAngle: Math.PI / 2,
            sweepFlag: 1,
        },
    };

    it("B1 — offsetSegment returns a value (no crash)", () => {
        const result = offsetSegment(arc, 3);
        expect(result).toBeTruthy();
    });

    it("B2 — result has arc property", () => {
        const result = offsetSegment(arc, 3);
        expect(result.arc).toBeDefined();
    });

    it("B3 — radius = 13 (outer offset of CCW arc)", () => {
        const result = offsetSegment(arc, 3);
        expect(approx(result.arc.radius, 13, TOLERANCE)).toBe(true);
    });

    it("B4 — center unchanged (0, 0)", () => {
        const result = offsetSegment(arc, 3);
        expect(approx(result.arc.center.x, 0, TOLERANCE)).toBe(true);
        expect(approx(result.arc.center.y, 0, TOLERANCE)).toBe(true);
    });

    it("B5 — startAngle preserved = 0", () => {
        const result = offsetSegment(arc, 3);
        expect(approx(result.arc.startAngle, 0, TOLERANCE)).toBe(true);
    });

    it("B6 — endAngle preserved ≈ π/2", () => {
        const result = offsetSegment(arc, 3);
        expect(approx(result.arc.endAngle, Math.PI / 2, TOLERANCE)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario C: Sharp join stitching
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario C: Sharp join produces stitched segments", () => {
    const segments = [
        { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
        { type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
    ];

    it("C1 — returns array with ≥2 segments (no crash)", () => {
        const result = buildOffsetContour(segments, 2, { joinType: "sharp" });
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("C2 — all consecutive segment endpoints stitched (no gaps)", () => {
        const result = buildOffsetContour(segments, 2, { joinType: "sharp" });
        for (let i = 0; i < result.length - 1; i++) {
            const curr = result[i];
            const next = result[i + 1];
            if (curr && next && curr.end && next.start) {
                const gapDist = Math.sqrt(
                    Math.pow(curr.end.x - next.start.x, 2) +
                        Math.pow(curr.end.y - next.start.y, 2),
                );
                expect(gapDist).toBeLessThan(TOLERANCE);
            }
        }
    });

    it("C3 — no zero-length segments in result", () => {
        const result = buildOffsetContour(segments, 2, { joinType: "sharp" });
        const zerolen = result.filter((s) => {
            if (!s.start || !s.end) return false;
            const d = Math.sqrt(
                Math.pow(s.end.x - s.start.x, 2) +
                    Math.pow(s.end.y - s.start.y, 2),
            );
            return d < 1e-6;
        });
        expect(zerolen.length).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario D: Round join produces arc segment
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario D: Round join produces arc segment", () => {
    const segments = [
        { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
        { type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
    ];

    it("D1 — returns array (no crash)", () => {
        const result = buildOffsetContour(segments, 2, { joinType: "round" });
        expect(Array.isArray(result)).toBe(true);
    });

    it("D2 — result contains an arc segment (round join)", () => {
        const result = buildOffsetContour(segments, 2, { joinType: "round" });
        const arcSegs = result.filter((s) => s.type === "arc");
        expect(arcSegs.length).toBeGreaterThan(0);
    });

    it("D3 — round join arc has center property", () => {
        const result = buildOffsetContour(segments, 2, { joinType: "round" });
        const arcSegs = result.filter((s) => s.type === "arc");
        expect(arcSegs[0].arc).toBeDefined();
        expect(arcSegs[0].arc.center).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario E: capBothSides non-degenerate caps
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario E: capBothSides produces non-degenerate caps", () => {
    const pos = [
        { type: "line", start: { x: 0, y: 5 }, end: { x: 10, y: 5 } },
    ];
    const neg = [
        { type: "line", start: { x: 0, y: -5 }, end: { x: 10, y: -5 } },
    ];

    it("E1 — capBothSides returns array without throwing", () => {
        expect(() => capBothSides(pos, neg, 5, "flat")).not.toThrow();
        const result = capBothSides(pos, neg, 5, "flat");
        expect(Array.isArray(result)).toBe(true);
    });

    it("E2 — result is non-empty", () => {
        const result = capBothSides(pos, neg, 5, "flat");
        expect(result.length).toBeGreaterThan(0);
    });

    it("E3 — no degenerate (zero-length) cap segments", () => {
        const result = capBothSides(pos, neg, 5, "flat");
        const degenerate = result.filter((s) => {
            if (!s.start || !s.end) return false;
            const d = Math.sqrt(
                Math.pow(s.end.x - s.start.x, 2) +
                    Math.pow(s.end.y - s.start.y, 2),
            );
            return d < 1e-6;
        });
        expect(degenerate.length).toBe(0);
    });

    it("E4 — first segment start is near x=0 or x=10 (cap region)", () => {
        const result = capBothSides(pos, neg, 5, "flat");
        const first = result[0];
        const nearCap =
            Math.abs(first.start.x - 0) < 1 ||
            Math.abs(first.start.x - 10) < 1;
        expect(nearCap).toBe(true);
    });

    it("E5 — last segment end is near x=0 or x=10 (cap region)", () => {
        const result = capBothSides(pos, neg, 5, "flat");
        const last = result[result.length - 1];
        const nearCap =
            Math.abs(last.end.x - 0) < 1 || Math.abs(last.end.x - 10) < 1;
        expect(nearCap).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario F: SVG arc round-trip preserves center
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario F: SVG arc round-trip preserves center", () => {
    const arcSeg = {
        type: "arc",
        start: { x: 10, y: 0 },
        end: { x: 0, y: 10 },
        arc: {
            center: { x: 0, y: 0 },
            radius: 10,
            startAngle: 0,
            endAngle: Math.PI / 2,
            sweepFlag: 1,
        },
    };

    it("F1 — segmentsToPathString produces non-empty string", () => {
        const pathStr = segmentsToPathString([arcSeg]);
        expect(typeof pathStr).toBe("string");
        expect(pathStr.trim().length).toBeGreaterThan(0);
    });

    it("F2 — pathStringToSegments parses back correctly", () => {
        const pathStr = segmentsToPathString([arcSeg]);
        const parsed = pathStringToSegments(pathStr);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBeGreaterThan(0);
    });

    it("F3 — parsed arc has center property", () => {
        const pathStr = segmentsToPathString([arcSeg]);
        const parsed = pathStringToSegments(pathStr);
        expect(parsed[0].arc).toBeDefined();
        expect(parsed[0].arc.center).toBeDefined();
    });

    it("F4 — center.x ≈ 0 (within 0.1)", () => {
        const pathStr = segmentsToPathString([arcSeg]);
        const parsed = pathStringToSegments(pathStr);
        expect(approx(parsed[0].arc.center.x, 0, TOLERANCE)).toBe(true);
    });

    it("F5 — center.y ≈ 0 (within 0.1)", () => {
        const pathStr = segmentsToPathString([arcSeg]);
        const parsed = pathStringToSegments(pathStr);
        expect(approx(parsed[0].arc.center.y, 0, TOLERANCE)).toBe(true);
    });

    it("F6 — radius ≈ 10 (within 0.1)", () => {
        const pathStr = segmentsToPathString([arcSeg]);
        const parsed = pathStringToSegments(pathStr);
        expect(approx(parsed[0].arc.radius, 10, TOLERANCE)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario G: Edge case — empty input
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario G: Edge case — empty input", () => {
    it("G1 — buildOffsetContour([]) returns [] without crashing", () => {
        expect(() => buildOffsetContour([], 5, {})).not.toThrow();
        const result = buildOffsetContour([], 5, {});
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario H: Edge case — zero-distance offset
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario H: Edge case — zero-distance offset", () => {
    const line = { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };

    it("H1 — offsetSegment(line, 0) does not crash", () => {
        expect(() => offsetSegment(line, 0)).not.toThrow();
    });

    it("H2 — start preserved ≈ (0, 0)", () => {
        const result = offsetSegment(line, 0);
        expect(approx(result.start.x, 0, TOLERANCE)).toBe(true);
        expect(approx(result.start.y, 0, TOLERANCE)).toBe(true);
    });

    it("H3 — end preserved ≈ (10, 0)", () => {
        const result = offsetSegment(line, 0);
        expect(approx(result.end.x, 10, TOLERANCE)).toBe(true);
        expect(approx(result.end.y, 0, TOLERANCE)).toBe(true);
    });
});
