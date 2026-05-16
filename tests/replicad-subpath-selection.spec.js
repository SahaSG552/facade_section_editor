import { describe, expect, it } from "vitest";
import ReplicadCanvasModule from "../src/three/ReplicadCanvasModule.js";

describe("ReplicadCanvasModule contour subpath selection", () => {
    it("prefers closed contour over longer open detour", () => {
        const module = new ReplicadCanvasModule();
        const contour = {
            pathData: [
                "M 0 0 L 40 0 L 40 20 L 0 20 Z",
                "M 100 0 L 260 0 L 260 60",
            ].join(" "),
        };

        const selected = module._getContourPathData(contour);

        expect(selected).toContain("Z");
        expect(selected).toContain("M 0 0");
        expect(selected).not.toContain("M 100 0");
    });

    it("falls back to longest open subpath when no closed subpath exists", () => {
        const module = new ReplicadCanvasModule();
        const contour = {
            pathData: [
                "M 0 0 L 10 0",
                "M 100 0 L 260 0 L 260 60",
            ].join(" "),
        };

        const selected = module._getContourPathData(contour);

        expect(selected).toContain("M 100 0");
    });
});
