import { describe, expect, it } from "vitest";
import {
    buildContourResultFromSegments,
    finalizeContourCollection,
} from "../../src/operations/offset/OffsetContourMetadataStage.js";

function makeLine(x1, y1, x2, y2) {
    return {
        type: "line",
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
    };
}

describe("OffsetContourMetadataStage", () => {
    it("builds contour metadata from stitched segments", () => {
        const segments = [
            makeLine(0, 0, 10, 0),
            makeLine(10, 0, 10, 10),
            makeLine(10, 10, 0, 10),
            makeLine(0, 10, 0, 0),
        ];

        const contour = buildContourResultFromSegments(segments, {}, {
            stitchAndQuantizeContourSegments: (value) => value,
            segmentsToSVGPath: () => "M 0 0 L 10 0 L 10 10 L 0 10 Z",
            isNear: (a, b, tolerance = 0.001) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance,
            joinTolerance: 0.001,
            contourToPoints: (value) => [value[0].start, ...value.map((segment) => segment.end)],
            clonePoint: (point) => ({ ...point }),
            signedArea: (points) => {
                let area = 0;
                for (let i = 0; i < points.length; i++) {
                    const a = points[i];
                    const b = points[(i + 1) % points.length];
                    area += a.x * b.y - b.x * a.y;
                }
                return area * 0.5;
            },
        });

        expect(contour).toBeTruthy();
        expect(contour.closed).toBe(true);
        expect(contour.orientation).toBe("ccw");
        expect(contour.absoluteArea).toBeGreaterThan(0);
        expect(contour.bbox).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
    });

    it("orders contours by containment depth then area", () => {
        const contours = [
            {
                pathData: "inner",
                closed: true,
                absoluteArea: 25,
                containmentDepth: 0,
                bbox: { minX: 2, minY: 2, maxX: 7, maxY: 7 },
                samplePoints: [{ x: 2, y: 2 }, { x: 7, y: 2 }, { x: 7, y: 7 }, { x: 2, y: 7 }, { x: 2, y: 2 }],
            },
            {
                pathData: "outer",
                closed: true,
                absoluteArea: 100,
                containmentDepth: 0,
                bbox: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
                samplePoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }],
            },
        ];

        const ordered = finalizeContourCollection(contours, { epsilon: 1e-6 });

        expect(ordered).toHaveLength(2);
        expect(ordered[0].pathData).toBe("outer");
        expect(ordered[1].pathData).toBe("inner");
        expect(ordered[0].containmentDepth).toBe(0);
        expect(ordered[1].containmentDepth).toBeGreaterThanOrEqual(1);
        expect(ordered[0].samplePoints).toBeUndefined();
        expect(ordered[1].samplePoints).toBeUndefined();
    });
});
