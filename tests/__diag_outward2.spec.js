/**
 * Deep diagnostic for open contour offset problems
 */
import { describe, it } from "vitest";
import { OffsetEngine, calculateOffsetFromPathData } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();
const source = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";
const opts = { offsetSignMode: "direct", trimSelfIntersections: true, exportModule };

function dumpPath(label, pathStr) {
    if (!pathStr) { console.log(`  ${label}: (empty)`); return; }
    console.log(`  ${label}: ${pathStr}`);
}

describe("deep diagnostic - open offset problems", () => {
    it("show all offsets d=-11 through d=-16 (trim=true)", () => {
        for (const d of [-11, -12, -13, -14, -15, -16]) {
            const r = calculateOffsetFromPathData(source, d, opts);
            dumpPath(`d=${d}`, r);
        }
    });

    it("compare trim=true vs trim=false at each distance", () => {
        const optsNoTrim = { ...opts, trimSelfIntersections: false };
        for (const d of [-12, -13, -14, -15]) {
            const rt = calculateOffsetFromPathData(source, d, opts);
            const rnt = calculateOffsetFromPathData(source, d, optsNoTrim);
            console.log(`\nd=${d}`);
            dumpPath("  trim=true ", rt);
            dumpPath("  trim=false", rnt);
        }
    });

    it("sequential: d=-11 then -1 per step vs direct", () => {
        let path = source;
        for (const d of [-11, -1, -1, -1, -1]) {
            const r = calculateOffsetFromPathData(path, d, opts);
            dumpPath(`step d=${d}`, r);
            path = r || path;
        }
    });

    it("single step d=-0.01 on source - is it closed?", () => {
        const r = calculateOffsetFromPathData(source, -0.01, opts);
        dumpPath("d=-0.01", r);
    });

    it("fine scan d=-0.5 to -4 to find exact first closure", () => {
        for (let n = 5; n <= 400; n++) {
            const d = -n * 0.01;
            const r = calculateOffsetFromPathData(source, d, opts);
            if (r && typeof r === 'string') {
                const mCoords = r.match(/^M\s+([\d.-]+)\s+([\d.-]+)/);
                const endMatch = r.match(/L\s+([\d.-]+)\s+([\d.-]+)\s*$/);
                if (mCoords && endMatch) {
                    const startX = parseFloat(mCoords[1]);
                    const endX = parseFloat(endMatch[1]);
                    const startY = parseFloat(mCoords[2]);
                    const endY = parseFloat(endMatch[2]);
                    const closes = Math.abs(startX - endX) < 0.01 && Math.abs(startY - endY) < 0.01;
                    if (closes) {
                        console.log(`FIRST CLOSURE at d=${d.toFixed(2)}: start=(${startX.toFixed(3)},${startY.toFixed(3)}) lastEnd=(${endX.toFixed(3)},${endY.toFixed(3)})`);
                        // Show the full path at this d
                        dumpPath(`d=${d.toFixed(2)} CLOSED`, r);
                        // Also show d one step before
                        const rPrev = calculateOffsetFromPathData(source, d + 0.01, opts);
                        dumpPath(`d=${(d+0.01).toFixed(2)} (prev)`, rPrev);
                        break;
                    }
                }
            }
        }
    });

    it("probe internals around d=-3.81 -> -0.01", async () => {
        const { OffsetEngine } = await import("../src/operations/OffsetEngine.js");
        const engine = new OffsetEngine({ exportModule });

        const at381 = await engine.processPath(source, -3.81, opts);
        console.log("at -3.81 path:", at381.pathData);

        const seg381 = engine._parsePathData(at381.pathData, { exportModule });
        console.log("at -3.81 parsed segs:", seg381.length);

        const nextSplit = engine._findNextSplitDistance(seg381, -0.01);
        console.log("next split from -3.81 by -0.01:", nextSplit);

        const directBuild = engine._buildOpenOffsetWithDegenerationSplits(seg381, -0.01, opts);
        const dump = (name, segs) => {
            console.log(name, Array.isArray(segs) ? segs.length : "n/a");
            if (!Array.isArray(segs)) return;
            segs.forEach((s, i) => {
                console.log(
                    `  [${i}] ${s.type} ${s.start.x.toFixed(6)} ${s.start.y.toFixed(6)} -> ${s.end.x.toFixed(6)} ${s.end.y.toFixed(6)}`
                );
            });
        };

        dump("directBuild segs", directBuild);
    });

    it("probe internals around d=-3 -> -0.82 (actual direct d=-3.82 residual)", async () => {
        const { OffsetEngine } = await import("../src/operations/OffsetEngine.js");
        const engine = new OffsetEngine({ exportModule });

        const at3 = await engine.processPath(source, -3, opts);
        console.log("at -3 path:", at3.pathData);

        const seg3 = engine._parsePathData(at3.pathData, { exportModule });
        console.log("at -3 parsed segs:", seg3.length);

        const nextSplit = engine._findNextSplitDistance(seg3, -0.82);
        console.log("next split from -3 by -0.82:", nextSplit);

        const directBuild = engine._buildOpenOffsetWithDegenerationSplits(seg3, -0.82, opts);
        console.log("directBuild(-0.82) count:", Array.isArray(directBuild) ? directBuild.length : "n/a");
        if (Array.isArray(directBuild)) {
            directBuild.forEach((s, i) => {
                console.log(
                    `  [${i}] ${s.type} ${s.start.x.toFixed(6)} ${s.start.y.toFixed(6)} -> ${s.end.x.toFixed(6)} ${s.end.y.toFixed(6)}`
                );
            });
        }
    });

    it("check repairOpenDegenerateLoop on trim=true d=-3.82 output", async () => {
        const { OffsetEngine } = await import("../src/operations/OffsetEngine.js");
        const engine = new OffsetEngine({ exportModule });
        const raw = await engine.processPath(source, -3.82, opts);
        const rawSegs = raw.contours?.[0]?.segments ?? [];
        console.log("raw d=-3.82 segs:", rawSegs.length, "closed=", engine._isClosedContour(rawSegs));

        const repaired = engine._repairOpenDegenerateLoop(rawSegs);
        console.log("repaired d=-3.82 segs:", repaired?.length ?? 0, "closed=", engine._isClosedContour(repaired));

        if (Array.isArray(repaired)) {
            repaired.forEach((s, i) => {
                console.log(
                    `  [${i}] ${s.type} ${s.start.x.toFixed(6)} ${s.start.y.toFixed(6)} -> ${s.end.x.toFixed(6)} ${s.end.y.toFixed(6)}`
                );
            });
        }
    });
});
