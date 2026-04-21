import { describe, it } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();
const source = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";

const OPTS_INPUT = { offsetSignMode: "direct", trimSelfIntersections: true, exportModule };
const OPTS_INTER = { offsetSignMode: "direct", trimSelfIntersections: false, exportModule };

function fmt(segs) {
    if (!segs) return "(null)";
    return segs.map((s, i) => {
        const sx = s.start?.x?.toFixed(3), sy = s.start?.y?.toFixed(3);
        const ex = s.end?.x?.toFixed(3), ey = s.end?.y?.toFixed(3);
        const len = Math.hypot((s.end?.x ?? 0) - (s.start?.x ?? 0), (s.end?.y ?? 0) - (s.start?.y ?? 0)).toFixed(3);
        return `  [${i}] ${s.type} (${sx},${sy})->(${ex},${ey}) len=${len}`;
    }).join("\n");
}

describe("d=-15 geometry deep-dive", () => {
    it("print intermediate paths at each cascade step", async () => {
        const engine = new OffsetEngine({ exportModule });

        console.log("\n=== SOURCE ===");
        console.log(source);

        // d=-13 (arc collapse)
        const r13 = await engine.processPath(source, -13, OPTS_INPUT);
        const segs13 = r13.contours?.[0]?.segments ?? [];
        console.log("\n=== d=-13 (arc collapse) ===");
        console.log("pathData:", r13.pathData);
        console.log("segs:", segs13.length, "closed:", r13.contours?.[0]?.closed);
        console.log("first/last point same?", JSON.stringify(segs13[0]?.start), JSON.stringify(segs13[segs13.length-1]?.end));
        console.log(fmt(segs13));

        // d=-14 (integer-phase cascade, phase2 of d=-13 result by -1)
        const r14 = await engine.processPath(source, -14, OPTS_INPUT);
        const segs14 = r14.contours?.[0]?.segments ?? [];
        console.log("\n=== d=-14 (integer-phase) ===");
        console.log("pathData:", r14.pathData);
        console.log("segs:", segs14.length, "closed:", r14.contours?.[0]?.closed);
        console.log(fmt(segs14));

        // d=-15 CURRENT (after phase1BeyondCollapse guard — gives 4 segs)
        const r15 = await engine.processPath(source, -15, OPTS_INPUT);
        const segs15 = r15.contours?.[0]?.segments ?? [];
        console.log("\n=== d=-15 (CURRENT trim=true) ===");
        console.log("pathData:", r15.pathData);
        console.log("segs:", segs15.length, "closed:", r15.contours?.[0]?.closed);
        console.log(fmt(segs15));

        // Manually compute what d=-15 SHOULD be:
        // Take d=-14 result (8 segs geometrically closed) + process as CLOSED (with Z) by -1
        const d14pathZ = r14.pathData.trimEnd() + " Z";
        console.log("\n=== d=-14 path + Z (for closed phase2) ===");
        console.log(d14pathZ);

        const r14z_1 = await engine.processPath(d14pathZ, -1, OPTS_INPUT);
        const segs14z_1 = r14z_1.contours?.[0]?.segments ?? [];
        console.log("\n=== d=-14+Z then -1 (closed offset) ===");
        console.log("pathData:", r14z_1.pathData);
        console.log("segs:", segs14z_1.length, "closed:", r14z_1.contours?.[0]?.closed);
        console.log(fmt(segs14z_1));

        // Also try trim=false (interactive mode)
        const r15f = await engine.processPath(source, -15, OPTS_INTER);
        const segs15f = r15f.contours?.[0]?.segments ?? [];
        console.log("\n=== d=-15 (trim=false / interactive) ===");
        console.log("pathData:", r15f.pathData);
        console.log("segs:", segs15f.length, "closed:", r15f.contours?.[0]?.closed);
        console.log(fmt(segs15f));

        // And d=-14 trim=false
        const r14f = await engine.processPath(source, -14, OPTS_INTER);
        const segs14f = r14f.contours?.[0]?.segments ?? [];
        console.log("\n=== d=-14 (trim=false / interactive) ===");
        console.log("pathData:", r14f.pathData);
        console.log("segs:", segs14f.length, "closed:", r14f.contours?.[0]?.closed);
        console.log(fmt(segs14f));

        // d=-14+Z then -1 with trim=false
        const r14z_1f = await engine.processPath(d14pathZ, -1, OPTS_INTER);
        const segs14z_1f = r14z_1f.contours?.[0]?.segments ?? [];
        console.log("\n=== d=-14+Z then -1 (closed, trim=false) ===");
        console.log("pathData:", r14z_1f.pathData);
        console.log("segs:", segs14z_1f.length, "closed:", r14z_1f.contours?.[0]?.closed);
        console.log(fmt(segs14z_1f));
    });
});
