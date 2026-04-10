import { describe, it, expect } from "vitest";
import { calculateOffsetFromPathData } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";
import { calculateOffsetFromPathData as calculateOffsetViaProcessor } from "../src/operations/CustomOffsetProcessor.js";

const exportModule = new ExportModule();

describe("User example: line-arc-line offset", () => {
    it("M 10 10 L 2 10 A 2 2 0 0 1 0 8 L 0 0 offset 1 outward", async () => {
        const pathData = "M 10 10 L 2 10 A 2 2 0 0 1 0 8 L 0 0";
        const result = await new (await import("../src/operations/OffsetEngine.js")).OffsetEngine({ exportModule }).processPath(pathData, 1);

        expect(result.pathData).toBeTruthy();
        expect(result.contours).toHaveLength(1);
        const contour = result.contours[0];
        expect(contour.segments).toHaveLength(3);

        // Check arc segment
        const arcSeg = contour.segments[1];
        expect(arcSeg.type).toBe("arc");

        // Path has positive signed area → effectiveDistance = -1 (legacy negation).
        // With sweepFlag=1 arc and d=-1: r + (-1)*(-1) = 2+1 = 3 (arc grows outward).
        expect(arcSeg.arc.radius).toBeCloseTo(3, 4);
    });

    it("reversed contour: direct d=-3 equals sequential d=-2 then d=-1 after arc degeneration", async () => {
        const pathData = "M 0 16 L 0 8 A 2 2 0 0 0 2 10 L 10 10";
        const engine = new (await import("../src/operations/OffsetEngine.js")).OffsetEngine({ exportModule });

        const direct = await engine.processPath(pathData, -3);
        const step2 = await engine.processPath(pathData, -2);
        const seq = await engine.processPath(step2.pathData, -1);

        expect(direct.pathData).toBe(seq.pathData);
        expect(direct.contours).toHaveLength(1);
        expect(seq.contours).toHaveLength(1);

        const directSegments = direct.contours[0].segments;
        const seqSegments = seq.contours[0].segments;
        expect(directSegments).toHaveLength(seqSegments.length);

        // Expected stable geometry at d=-3:
        // M -3 16 L -3 8 L -3 5 L 3 5 L 3 7 L 10 7
        expect(direct.pathData).toContain("M -3.000000 16.000000");
        expect(direct.pathData).toContain("L -3.000000 8.000000");
        expect(direct.pathData).toContain("L -3.000000 5.000000");
        expect(direct.pathData).toContain("L 3.000000 5.000000");
        expect(direct.pathData).toContain("L 3.000000 7.000000");
        expect(direct.pathData).toContain("L 10.000000 7.000000");
    });

    it("modified contour: sequential +1 offsets in direct mode do not sign-flip after arc degeneration", () => {
        const source = "M 10 10 L 2 10 A 2 2 0 0 1 0 8 L -3 16";
        const paths = [];
        let path = source;

        for (let i = 0; i < 12; i += 1) {
            path = calculateOffsetViaProcessor(path, 1, {
                join: "sharp",
                cap: "flat",
                exportModule,
            });
            paths.push(path);
        }

        // Regression: before fix, sequence entered a 2-cycle from step 8 onward
        // because open-path sign could flip by signed-area heuristic.
        expect(paths[7]).not.toBe(paths[5]);
        expect(paths[8]).not.toBe(paths[6]);
        expect(paths[9]).not.toBe(paths[7]);
    });

    it("modified contour: after neighboring collapse, remaining segment keeps shortening monotonically", () => {
        const source = "M 10 10 L 2 10 A 2 2 0 0 1 0 8 L -3 16";

        const direct10 = calculateOffsetViaProcessor(source, 10, {
            join: "sharp",
            cap: "flat",
            exportModule,
        });
        const direct11 = calculateOffsetViaProcessor(source, 11, {
            join: "sharp",
            cap: "flat",
            exportModule,
        });
        const direct12 = calculateOffsetViaProcessor(source, 12, {
            join: "sharp",
            cap: "flat",
            exportModule,
        });

        const xFromPath = (path) => {
            const match = path.match(/L\s+(-?\d+(?:\.\d+)?)\s+\d+(?:\.\d+)?\s*$/);
            return match ? Number(match[1]) : NaN;
        };

        const x10 = xFromPath(direct10);
        const x11 = xFromPath(direct11);
        const x12 = xFromPath(direct12);

        expect(Number.isFinite(x10)).toBe(true);
        expect(Number.isFinite(x11)).toBe(true);
        expect(Number.isFinite(x12)).toBe(true);
        expect(x11).toBeGreaterThan(x10);
        expect(x12).toBeGreaterThan(x11);
        expect(x12).toBeLessThan(10);
    });

    it("modified contour: concave arc-line divergence builds sharp P-bridge with tangent legs", () => {
        const source = "M 10 10 L 2 10 A 2 2 0 0 1 0 8 L -3 16";
        const path = calculateOffsetViaProcessor(source, -0.5, {
            join: "sharp",
            cap: "flat",
            exportModule,
        });

        // Invariant: no rollback to arc endpoint at y=8 before bridge construction.
        expect(path).toContain("A 1.500000 1.500000 0 0 1");
        expect(path).not.toContain("A 1.500000 1.500000 0 0 1 0.500000 8.000000");

        // Invariant: sharp bridge is built from current arc state (multi-segment connector),
        // not a single direct arc->line stitch.
        const connectorMatches = path.match(/L\s+[-\d.]+\s+[-\d.]+/g) ?? [];
        expect(connectorMatches.length).toBeGreaterThanOrEqual(5);
        expect(path).toContain("L -3.468165 15.824438");
    });

    it("reversed user contour: direct offset preserves pre-separation arc state (no rollback before P-bridge)", () => {
        const source = "M -3 16 L 0 8 A 2 2 0 0 0 2 10 L 10 10";

        const c2 = calculateOffsetViaProcessor(source, 0.06, {
            join: "sharp",
            cap: "flat",
            exportModule,
        });
        const seq = calculateOffsetViaProcessor(c2, 0.7478, {
            join: "sharp",
            cap: "flat",
            exportModule,
        });

        const direct = calculateOffsetViaProcessor(source, 0.8078, {
            join: "sharp",
            cap: "flat",
            exportModule,
        });

        // Direct and two-step must agree on topology and avoid rollback endpoint.
        expect(direct).toContain("A 1.192200 1.192200 0 0 0 2.000000 9.192200");
        expect(seq).toContain("A 1.192200 1.192200 0 0 0 2.000000 9.192200");

        // Regression guard: old wrong result rolled back to a rectangular bridge anchor.
        expect(direct).not.toContain("L 0.807800 8.000000");

        const extractPreArcAnchor = (path) => {
            const match = path.match(/L\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+A\s+1\.192200\s+1\.192200\s+0\s+0\s+0\s+2\.000000\s+9\.192200/);
            if (!match) return null;
            return { x: Number(match[1]), y: Number(match[2]) };
        };

        const directPreArc = extractPreArcAnchor(direct);
        const seqPreArc = extractPreArcAnchor(seq);
        expect(directPreArc).toBeTruthy();
        expect(seqPreArc).toBeTruthy();

        // Anchor before the arc should remain below y=8 (no rollback to rectangular bridge).
        expect(directPreArc.y).toBeLessThan(7.95);
        expect(seqPreArc.y).toBeLessThan(7.95);
    });

    it("mirrored contour: offset symmetry keeps P-bridge topology (no straight bridge fallback)", () => {
        const source = "M -10 10 L -2 10 A 2 2 0 0 0 0 8 L 3 16";
        const path = calculateOffsetViaProcessor(source, 1, {
            join: "sharp",
            cap: "flat",
            exportModule,
        });

        // Mirror-invariant expectation: same phase rule should produce a P-bridge,
        // i.e. multiple connector segments after the arc, not a single straight link.
        expect(path).toContain("A 1.000000 1.000000 0 0 0");
        const lineTokens = path.match(/L\s+[-\d.]+\s+[-\d.]+/g) ?? [];
        expect(lineTokens.length).toBeGreaterThanOrEqual(5);

        // Legacy wrong branch produced a single straight bridge near this segment.
        expect(path).not.toContain("L 0.513437 6.521165");
        expect(path).toContain("L 3.936329 15.648877");
    });

    it("combined symmetric contour: offsets -2..-5 remain consistent (no middle collapse)", () => {
        const source = "M 13 16 L 10 8 A 2 2 0 0 1 8 10 L 0 10 L -8 10 A 2 2 0 0 1 -10 8 L -13 16";

        const extractCenterRun = (path) => {
            const m = path.match(/L\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+L\s+0\.000000\s+(-?\d+\.\d+)\s+L\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)/);
            if (!m) return null;
            return {
                leftX: Number(m[1]),
                leftY: Number(m[2]),
                centerY: Number(m[3]),
                rightX: Number(m[4]),
                rightY: Number(m[5]),
            };
        };

        const expectedCenterY = {
            2: 8,
            3: 7,
            4: 6,
            5: 5,
        };

        for (const mag of [2, 3, 4, 5]) {
            const path = calculateOffsetViaProcessor(source, -mag, {
                join: "sharp",
                cap: "flat",
                exportModule,
            });

            const center = extractCenterRun(path);
            expect(center).toBeTruthy();

            // Center run must stay mirrored around x=0 and keep expected y level.
            expect(Math.abs(center.leftX + center.rightX)).toBeLessThan(0.05);
            expect(Math.abs(center.leftY - center.rightY)).toBeLessThan(0.05);
            expect(center.centerY).toBeCloseTo(expectedCenterY[mag], 3);

            // Regression: old behavior skipped center segment at x=0.
            expect(path).toContain(`L 0.000000 ${expectedCenterY[mag].toFixed(6)}`);
        }
    });
});
