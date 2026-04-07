import { describe, it, expect } from "vitest";
import { sanitizeParsedContourSegments } from "../src/editor/tools/shared/segmentSanitizer.js";
import { isSegmentDegenerated, isArcDegenerated } from "../src/operations/OffsetRules.js";

describe("Sequential offset degeneration", () => {
    it("drops point-like arc while preserving valid neighbors", () => {
        const sanitized = sanitizeParsedContourSegments([
            {
                type: "arc",
                data: {
                    start: { x: 2, y: 12 },
                    end: { x: 2, y: 12 },
                    center: { x: 2, y: 8 },
                    radius: 4,
                    largeArc: 0,
                    sweep: 1,
                },
            },
            {
                type: "line",
                data: {
                    start: { x: 2, y: 12 },
                    end: { x: -2, y: 12 },
                },
            },
        ]);

        expect(sanitized).toHaveLength(1);
        expect(sanitized[0].type).toBe("line");
    });

    it("isArcDegenerated detects editor-format point-collapsed arc", () => {
        const editorArc = {
            type: "arc",
            data: {
                start: { x: 2, y: 12 },
                end: { x: 2, y: 12 },
                center: { x: 2, y: 8 },
                radius: 4,
                largeArc: 0,
                sweep: 1,
            },
        };

        // eslint-disable-next-line no-console
        console.log("isArcDegenerated result:", isArcDegenerated(editorArc));
        expect(isArcDegenerated(editorArc)).toBe(true);
    });

    it("isSegmentDegenerated detects editor-format point-collapsed arc", () => {
        const editorArc = {
            type: "arc",
            data: {
                start: { x: 2, y: 12 },
                end: { x: 2, y: 12 },
                center: { x: 2, y: 8 },
                radius: 4,
                largeArc: 0,
                sweep: 1,
            },
        };

        expect(isSegmentDegenerated(editorArc)).toBe(true);
    });
});
