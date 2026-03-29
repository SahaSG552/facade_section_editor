import { describe, expect, it, vi } from "vitest";
import { applyHybridFallbackStage } from "../../src/operations/offset/OffsetFallbackStage.js";

describe("OffsetFallbackStage", () => {
    it("returns input contour unchanged when fallback is disabled", () => {
        const contour = {
            pathData: "M 0 0 L 10 0",
            fallbackApplied: false,
            fallbackReason: null,
        };

        const out = applyHybridFallbackStage(
            contour,
            {
                referencePathData: contour.pathData,
                options: { enableHybridFallback: false, trimSelfIntersections: true },
            },
            {
                pathHasSelfIntersections: vi.fn(),
                samplePathPoints: vi.fn(),
                isNear: vi.fn(() => false),
                resolveSelfIntersections: vi.fn(),
                shouldAcceptTrimmedPath: vi.fn(),
                normalizeInputContours: vi.fn(),
                normalizeArcAngles: vi.fn(),
                splitSegmentsIntoContours: vi.fn(),
                buildContourResultFromSegments: vi.fn(),
                epsilon: 1e-6,
                log: { warn: vi.fn() },
            },
        );

        expect(out).toEqual([contour]);
    });

    it("emits rejected diagnostic when repair is invalid", () => {
        const contour = {
            pathData: "M 0 0 L 10 10 L 0 10 L 10 0 Z",
            fallbackApplied: false,
            fallbackReason: null,
        };

        const out = applyHybridFallbackStage(
            contour,
            {
                referencePathData: contour.pathData,
                options: {
                    enableHybridFallback: true,
                    trimSelfIntersections: true,
                    fallbackDiagnostics: true,
                },
            },
            {
                pathHasSelfIntersections: vi.fn(() => true),
                samplePathPoints: vi.fn(),
                isNear: vi.fn(() => false),
                resolveSelfIntersections: vi.fn(() => "M 0 0 L 1 1"),
                shouldAcceptTrimmedPath: vi.fn(() => false),
                normalizeInputContours: vi.fn(),
                normalizeArcAngles: vi.fn(),
                splitSegmentsIntoContours: vi.fn(),
                buildContourResultFromSegments: vi.fn(),
                epsilon: 1e-6,
                log: { warn: vi.fn() },
            },
        );

        expect(out).toHaveLength(1);
        expect(out[0].fallbackApplied).toBe(false);
        expect(out[0].fallbackReason).toBe("hybrid-rejected");
    });

    it("returns repaired contours with fallback marker when repair succeeds", () => {
        const contour = {
            pathData: "M 0 0 L 10 10 L 0 10 L 10 0 Z",
            fallbackApplied: false,
            fallbackReason: null,
        };

        const buildContourResultFromSegments = vi.fn((segments) => ({
            pathData: `M ${segments[0][0]} ${segments[0][1]}`,
            segments,
            closed: true,
            orientation: "ccw",
            signedArea: 10,
            absoluteArea: 10,
            bbox: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
            containmentDepth: 0,
            fallbackApplied: false,
            fallbackReason: null,
            samplePoints: [],
        }));

        const out = applyHybridFallbackStage(
            contour,
            {
                referencePathData: contour.pathData,
                options: {
                    enableHybridFallback: true,
                    trimSelfIntersections: true,
                    fallbackDiagnostics: true,
                },
            },
            {
                pathHasSelfIntersections: vi.fn(() => true),
                samplePathPoints: vi.fn(),
                isNear: vi.fn(() => false),
                resolveSelfIntersections: vi.fn(() => "M 0 0 L 1 1 Z"),
                shouldAcceptTrimmedPath: vi.fn(() => true),
                normalizeInputContours: vi.fn(() => [[[0, 0]], [[1, 1]]]),
                normalizeArcAngles: vi.fn(),
                splitSegmentsIntoContours: vi.fn(),
                buildContourResultFromSegments,
                epsilon: 1e-6,
                log: { warn: vi.fn() },
            },
        );

        expect(out).toHaveLength(2);
        expect(out.every((entry) => entry.fallbackApplied === true)).toBe(true);
        expect(out.every((entry) => entry.fallbackReason === "self-intersection")).toBe(true);
        expect(buildContourResultFromSegments).toHaveBeenCalledTimes(2);
    });
});
