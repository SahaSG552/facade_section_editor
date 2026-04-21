import { describe, it, expect } from "vitest";
import ExportModule from "../../src/export/ExportModule.js";

const CANONICAL_PATH = "M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8 L -11 11 H 0 H 11 L 11 8 A 7 7 0 0 1 5.5 3.5 A 6 6 0 0 0 0 0";
const exportModule = new ExportModule();

function parseSegments(pathData) {
    return exportModule.dxfExporter.parseSVGPathSegments(pathData, 0, 0, (y) => y, false);
}

// Copy offsetArcSegment logic here to test
const EPSILON = 1e-6;

function computeAngleDelta(startAngle, endAngle, sweepFlag) {
    let delta = endAngle - startAngle;
    if (sweepFlag === 1 && delta < 0) delta += Math.PI * 2;
    if (sweepFlag === 0 && delta > 0) delta -= Math.PI * 2;
    return delta;
}

function dot(a, b) { return a.x * b.x + a.y * b.y; }
function leftNormal(v) { return { x: -v.y, y: v.x }; }
function normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    return len < EPSILON ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

describe("Debug offsetArcSegment for canonical A 7 7", () => {
    it("traces offset computation for A 7 7 arc", () => {
        const segs = parseSegments(CANONICAL_PATH);
        const arc77 = segs.find(s => s.type === "arc" && (s.arc.radius || s.arc.rx) === 7);
        console.log("A 7 7 arc:", JSON.stringify({
            start: arc77.start,
            end: arc77.end,
            arc: arc77.arc
        }, null, 2));
        
        const arc = arc77.arc;
        const radius = arc.radius || arc.rx;
        const offset = -7;
        
        const delta = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
        const midAngle = arc.startAngle + delta / 2;
        
        const radialVec = { x: Math.cos(midAngle), y: Math.sin(midAngle) };
        const tangSign = (arc.sweepFlag ?? 1) === 1 ? 1 : -1;
        const tangent = { x: -Math.sin(midAngle) * tangSign, y: Math.cos(midAngle) * tangSign };
        const leftN = leftNormal(tangent);
        const radialSign = dot(leftN, radialVec) >= 0 ? 1 : -1;
        
        console.log("startAngle:", arc.startAngle, "endAngle:", arc.endAngle, "sweepFlag:", arc.sweepFlag);
        console.log("delta:", delta, "(should be >0 for CCW ~90deg arc)");
        console.log("midAngle:", midAngle);
        console.log("radialVec:", radialVec);
        console.log("tangent:", tangent);
        console.log("leftNormal(tangent):", leftN);
        console.log("radialSign:", radialSign, "(should be -1 for CCW arc at offset=-7 to expand)");
        
        const newRadius = radius + offset * radialSign;
        console.log("newRadius:", newRadius, "(should be 14 for r=7, offset=-7, radialSign=-1)");
        
        // Correct computation would need angles in radians
        const saRad = arc.startAngle * Math.PI / 180;
        const eaRad = arc.endAngle * Math.PI / 180;
        const deltaCorrect = computeAngleDelta(saRad, eaRad, arc.sweepFlag ?? 1);
        const midRad = saRad + deltaCorrect / 2;
        const radialVecC = { x: Math.cos(midRad), y: Math.sin(midRad) };
        const tangentC = { x: -Math.sin(midRad) * tangSign, y: Math.cos(midRad) * tangSign };
        const leftNC = leftNormal(tangentC);
        const radialSignC = dot(leftNC, radialVecC) >= 0 ? 1 : -1;
        const newRadiusC = radius + offset * radialSignC;
        console.log("\n--- Correct (degrees->radians) ---");
        console.log("saRad:", saRad, "eaRad:", eaRad, "deltaCorrect:", deltaCorrect);
        console.log("radialSignC:", radialSignC);
        console.log("newRadiusC:", newRadiusC);
        
        expect(true).toBe(true);
    });
});
