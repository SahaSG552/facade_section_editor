import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";

const CANONICAL_PATH = "M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8 L -11 11 H 0 H 11 L 11 8 A 7 7 0 0 1 5.5 3.5 A 6 6 0 0 0 0 0";
const exportModule = new ExportModule();

function parseSegments(pathData) {
    if (!pathData || !String(pathData).trim()) return [];
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

describe("Debug canonical path segments", () => {
    it("shows raw parsed segments", () => {
        const segments = parseSegments(CANONICAL_PATH);
        for (const s of segments) {
            console.log(JSON.stringify({
                type: s.type,
                start: { x: +s.start.x.toFixed(4), y: +s.start.y.toFixed(4) },
                end: { x: +s.end.x.toFixed(4), y: +s.end.y.toFixed(4) },
                arc: s.arc ? {
                    r: +(s.arc.radius || s.arc.rx).toFixed(4),
                    cx: +s.arc.centerX.toFixed(4),
                    cy: +s.arc.centerY.toFixed(4),
                    startA: +(s.arc.startAngle * 180 / Math.PI).toFixed(2),
                    endA: +(s.arc.endAngle * 180 / Math.PI).toFixed(2),
                    sweepFlag: s.arc.sweepFlag,
                    largeArc: s.arc.largeArcFlag
                } : undefined
            }));
        }
        expect(true).toBe(true);
    });
});
