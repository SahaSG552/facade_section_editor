import { describe, it, expect } from "vitest";

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();
const sourcePath = "M 0 5 L -10 0 L -20 10 L -10 24 L 0 15 L 10 24 L 20 10 L 10 0 L 0 5 Z";

describe("Closed contour inward self-intersection splitting", () => {
    it("splits the hourglass-like contour into two independent closed contours at the self-intersection threshold", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const result = await engine.processPath(sourcePath, -7, { trimSelfIntersections: true });

        expect(result.contours).toHaveLength(2);
        expect(result.contours.every((contour) => contour.closed)).toBe(true);
        expect(result.contours.every((contour) => contour.orientation === "cw")).toBe(true);
        expect(result.contours.every((contour) => contour.segments.length >= 3)).toBe(true);
    });

    it("keeps both split contours alive on deeper inward offsets from the same source contour", async () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const thresholdResult = await engine.processPath(sourcePath, -7, { trimSelfIntersections: true });
        const direct = await engine.processPath(sourcePath, -8, { trimSelfIntersections: true });

        expect(thresholdResult.contours).toHaveLength(2);
        expect(direct.contours).toHaveLength(2);

        const nextAreas = thresholdResult.contours.map((contour) => Math.abs(contour.area)).sort((a, b) => a - b);
        const directAreas = direct.contours.map((contour) => Math.abs(contour.area)).sort((a, b) => a - b);

        expect(nextAreas).toHaveLength(directAreas.length);
        for (let i = 0; i < directAreas.length; i += 1) {
            expect(directAreas[i]).toBeLessThan(nextAreas[i]);
        }
    });

    it("drops nested same-winding artifact loops while keeping the main resolved contour", () => {
        const engine = new OffsetEngine({ joinType: "sharp", capType: "flat", exportModule });
        const outer = [
            { type: "line", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
            { type: "line", start: { x: 10, y: 0 }, end: { x: 10, y: 10 } },
            { type: "line", start: { x: 10, y: 10 }, end: { x: 0, y: 10 } },
            { type: "line", start: { x: 0, y: 10 }, end: { x: 0, y: 0 } },
        ];
        const innerArtifact = [
            { type: "line", start: { x: 3, y: 3 }, end: { x: 4, y: 3 } },
            { type: "line", start: { x: 4, y: 3 }, end: { x: 4, y: 4 } },
            { type: "line", start: { x: 4, y: 4 }, end: { x: 3, y: 4 } },
            { type: "line", start: { x: 3, y: 4 }, end: { x: 3, y: 3 } },
        ];

        const sourceArea = engine._computeSignedArea(outer);
        const selected = engine._selectResolvedClosedContours(
            [
                { segments: outer, area: engine._computeSignedArea(outer) },
                { segments: innerArtifact, area: engine._computeSignedArea(innerArtifact) },
            ],
            outer,
            sourceArea,
        );

        expect(selected).toHaveLength(1);
        expect(selected[0]).toEqual(outer);
    });
});