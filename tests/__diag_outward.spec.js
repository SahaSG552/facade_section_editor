import { describe, it } from "vitest";
import { calculateOffsetFromPathData } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const exportModule = new ExportModule();
const source = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";
const opts = { offsetSignMode: "direct", trimSelfIntersections: true, exportModule };

describe("outward offset diagnostic", () => {
    it("d=+13 and d=+14 outward", () => {
        const r13 = calculateOffsetFromPathData(source, 13, opts);
        console.log("d=+13:", r13);
        const r14 = calculateOffsetFromPathData(source, 14, opts);
        console.log("d=+14:", r14);
        const r13seq = calculateOffsetFromPathData(r13, 1, opts);
        console.log("seq d=+13->+1:", r13seq);
    });

    it("d=-13 and d=-14 (inward/left direction)", () => {
        const r13 = calculateOffsetFromPathData(source, -13, opts);
        console.log("d=-13:", r13);
        const r14 = calculateOffsetFromPathData(source, -14, opts);
        console.log("d=-14:", r14);
        const r13seq = calculateOffsetFromPathData(r13, -1, opts);
        console.log("seq d=-13->-1:", r13seq);
    });
});
