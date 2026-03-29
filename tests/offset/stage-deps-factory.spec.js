import { describe, expect, it, vi } from "vitest";
import {
    createContourMetadataStageDeps,
    createContourResultBuilder,
    createSelfIntersectionStageDeps,
    createFallbackStageDeps,
} from "../../src/operations/offset/OffsetStageDepsFactory.js";

describe("OffsetStageDepsFactory", () => {
    it("creates contour metadata deps with required keys", () => {
        const deps = createContourMetadataStageDeps({
            stitchAndQuantizeContourSegments: vi.fn(),
            segmentsToSVGPath: vi.fn(),
            isNear: vi.fn(),
            joinTolerance: 0.001,
            contourToPoints: vi.fn(),
            clonePoint: vi.fn(),
            signedArea: vi.fn(),
        });

        expect(Object.keys(deps).sort()).toEqual([
            "clonePoint",
            "contourToPoints",
            "isNear",
            "joinTolerance",
            "segmentsToSVGPath",
            "signedArea",
            "stitchAndQuantizeContourSegments",
        ]);
    });

    it("builds contour result wrapper with default options", () => {
        const buildContourResultFromSegmentsFn = vi.fn(() => ({ pathData: "M 0 0" }));
        const contourMetadataDeps = { mock: true };
        const defaultOptions = { out: 1 };

        const build = createContourResultBuilder(
            buildContourResultFromSegmentsFn,
            contourMetadataDeps,
            defaultOptions,
        );

        const result = build([1, 2, 3]);

        expect(result).toEqual({ pathData: "M 0 0" });
        expect(buildContourResultFromSegmentsFn).toHaveBeenCalledWith([1, 2, 3], defaultOptions, contourMetadataDeps);
    });

    it("creates fallback deps by combining stage dependencies", () => {
        const deps = createFallbackStageDeps({
            pathHasSelfIntersections: vi.fn(),
            selfIntersectionDeps: { samplePathPoints: vi.fn(), isNear: vi.fn(), epsilon: 1e-6 },
            resolveSelfIntersections: vi.fn(),
            shouldAcceptTrimmedPath: vi.fn(),
            normalizeInputContours: vi.fn(),
            normalizeArcAngles: vi.fn(),
            splitSegmentsIntoContours: vi.fn(),
            buildContourResult: vi.fn(),
            epsilon: 1e-6,
            log: { warn: vi.fn() },
        });

        expect(typeof deps.pathHasSelfIntersections).toBe("function");
        expect(typeof deps.samplePathPoints).toBe("function");
        expect(typeof deps.isNear).toBe("function");
        expect(typeof deps.buildContourResultFromSegments).toBe("function");
        expect(deps.epsilon).toBe(1e-6);
    });

    it("creates self-intersection deps payload", () => {
        const out = createSelfIntersectionStageDeps({
            samplePathPoints: vi.fn(),
            isNear: vi.fn(),
            epsilon: 1e-6,
        });

        expect(Object.keys(out).sort()).toEqual(["epsilon", "isNear", "samplePathPoints"]);
    });
});
