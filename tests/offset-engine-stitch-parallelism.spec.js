import { describe, it, expect } from "vitest";
import ExportModule from "../src/export/ExportModule.js";
import { calculateOffsetFromPathData } from "../src/operations/OffsetEngine.js";

function unitDir(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
}

describe("OffsetEngine stitch preserves segment direction", () => {
  it("keeps diagonal segment parallel for arc-collapse contour at d=3.8", () => {
    const sourcePath = "M 0 0 L 12 0 L 12 5 L 1.9581 9.1841 A 1.4142 1.4142 0 0 1 0 7.8787 L 0 0 Z";
    const exportModule = new ExportModule();

    const offsetPath = calculateOffsetFromPathData(sourcePath, 3.8, {
      exportModule,
      trimSelfIntersections: false,
      useArcApproximation: true,
    });

    const parsed = exportModule.dxfExporter.parseSVGPathSegments(offsetPath, 0, 0, (y) => y, false);
    const skewLine = parsed.find((seg) => {
      if (!seg || seg.type !== "line") return false;
      const dx = Math.abs(seg.end.x - seg.start.x);
      const dy = Math.abs(seg.end.y - seg.start.y);
      return dx > 1e-6 && dy > 1e-6;
    });

    expect(skewLine).toBeDefined();

    const sourceDiag = {
      start: { x: 12, y: 5 },
      end: { x: 1.9581, y: 9.1841 },
    };

    const u1 = unitDir(sourceDiag.start, sourceDiag.end);
    const u2 = unitDir(skewLine.start, skewLine.end);
    const parallelScore = Math.abs(u1.x * u2.x + u1.y * u2.y);

    expect(parallelScore).toBeGreaterThan(0.999);
  });
});
