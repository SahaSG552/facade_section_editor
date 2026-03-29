import { describe, expect, it } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";
import {
    calculateOffsetContoursFromPathData,
    calculateOffsetFromPathData,
} from "../../src/operations/CustomOffsetProcessor.js";

const exportModule = new ExportModule();

describe("calculateOffsetContoursFromPathData", () => {
    it("returns all contours for a multi-contour path", () => {
        const input = [
            "M 0 0 L 10 0 L 10 10 L 0 10 Z",
            "M 20 0 L 30 0 L 30 10 L 20 10 Z",
        ].join(" ");

        const contours = calculateOffsetContoursFromPathData(input, -1, {
            exportModule,
            offsetSignMode: "direct",
            trimSelfIntersections: true,
        });

        expect(contours.length).toBeGreaterThanOrEqual(2);
        for (const contour of contours) {
            expect(typeof contour.pathData).toBe("string");
            expect(contour.pathData.length).toBeGreaterThan(0);
            expect(Array.isArray(contour.segments)).toBe(true);
            expect(contour.segments.length).toBeGreaterThan(0);
            expect(typeof contour.closed).toBe("boolean");
        }
    });

    it("remains compatible with merged path API", () => {
        const input = "M 0 0 L 10 0 L 10 10 L 0 10 Z";

        const merged = calculateOffsetFromPathData(input, -1, {
            exportModule,
            offsetSignMode: "direct",
            trimSelfIntersections: true,
        });
        const contours = calculateOffsetContoursFromPathData(input, -1, {
            exportModule,
            offsetSignMode: "direct",
            trimSelfIntersections: true,
        });

        expect(typeof merged).toBe("string");
        expect(merged.length).toBeGreaterThan(0);
        expect(contours.length).toBeGreaterThanOrEqual(1);
    });

    it("returns metadata with stable ordering and containment depth", () => {
        const input = [
            "M 0 0 L 40 0 L 40 40 L 0 40 Z",
            "M 10 10 L 30 10 L 30 30 L 10 30 Z",
        ].join(" ");

        const first = calculateOffsetContoursFromPathData(input, 0, {
            exportModule,
            offsetSignMode: "direct",
        });
        const second = calculateOffsetContoursFromPathData(input, 0, {
            exportModule,
            offsetSignMode: "direct",
        });

        expect(first.length).toBe(2);
        expect(second.length).toBe(2);

        const stableProjection = (contours) => contours.map((contour) => ({
            pathData: contour.pathData,
            containmentDepth: contour.containmentDepth,
            absoluteArea: contour.absoluteArea,
            bbox: contour.bbox,
        }));

        expect(stableProjection(first)).toEqual(stableProjection(second));

        expect(first[0].absoluteArea).toBeGreaterThanOrEqual(first[1].absoluteArea);
        expect(first[0].containmentDepth).toBe(0);
        expect(first[1].containmentDepth).toBeGreaterThanOrEqual(1);

        for (const contour of first) {
            expect(["cw", "ccw", "open"]).toContain(contour.orientation);
            expect(typeof contour.signedArea).toBe("number");
            expect(typeof contour.absoluteArea).toBe("number");
            expect(typeof contour.bbox?.minX).toBe("number");
            expect(typeof contour.bbox?.minY).toBe("number");
            expect(typeof contour.bbox?.maxX).toBe("number");
            expect(typeof contour.bbox?.maxY).toBe("number");
            expect(typeof contour.containmentDepth).toBe("number");
            expect(typeof contour.fallbackApplied).toBe("boolean");
            expect(contour.fallbackReason === null || typeof contour.fallbackReason === "string").toBe(true);
        }
    });

    it("emits fallback diagnostics for self-intersecting contour input", () => {
        const bowtie = "M 0 0 L 20 20 L 0 20 L 20 0 Z";

        const contours = calculateOffsetContoursFromPathData(bowtie, 0, {
            exportModule,
            offsetSignMode: "direct",
            trimSelfIntersections: true,
            enableHybridFallback: true,
            fallbackDiagnostics: true,
        });

        expect(contours.length).toBeGreaterThanOrEqual(1);
        for (const contour of contours) {
            expect(typeof contour.fallbackApplied).toBe("boolean");
            expect(contour.fallbackReason === null || typeof contour.fallbackReason === "string").toBe(true);
        }
    });
});
