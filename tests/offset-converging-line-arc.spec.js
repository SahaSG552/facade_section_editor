import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";
import OffsetEngine from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const EPSILON = 1e-6;

describe("OffsetContourBuilder converging sharp fallback", () => {
  it("uses direct/tangent connection (no U-bridge chain) for converging line-arc corner", () => {
    // Crafted line-arc-line topology where the arc->line sharp convex fallback is
    // converging by normal-facing criterion and miter application fails.
    const segments = [
      {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
      },
      {
        type: "arc",
        start: { x: 10, y: 0 },
        end: { x: 8.843730177499369, y: 0.8790014056504958 },
        arc: {
          center: { x: 10, y: 1.2 },
          centerX: 10,
          centerY: 1.2,
          radius: 1.2,
          startAngle: -1.5707963267948966,
          endAngle: -2.8707963267948973,
          sweepFlag: 0,
        },
      },
      {
        type: "line",
        start: { x: 8.843730177499369, y: 0.8790014056504958 },
        end: { x: 8.487238066200382, y: -1.0889704880973776 },
      },
    ];

    const result = buildOffsetContour(segments, -1, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    const arcIndex = result.findIndex((s) => s.type === "arc");
    expect(arcIndex).toBeGreaterThan(0);

    // No 3-line U-bridge chain immediately after the arc.
    const tailTypes = result.slice(arcIndex + 1).map((s) => s.type);
    expect(tailTypes.every((t) => t === "line")).toBe(true);
    expect(tailTypes.length).toBeLessThanOrEqual(2);

    // Arc->next segment should be stitched directly (no gap).
    const arc = result[arcIndex];
    const next = result[arcIndex + 1];
    expect(next?.type).toBe("line");
    const joinGap = Math.hypot(next.start.x - arc.end.x, next.start.y - arc.end.y);
    expect(joinGap).toBeLessThan(1e-6);
  });

  it("preserves outward small-arc branches on the reported closed contour", async () => {
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({
      joinType: "sharp",
      capType: "flat",
      exportModule,
    });

    const path = "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0";
    const result = await engine.processPath(path, 1, {});

    expect(result.contours).toHaveLength(1);
    const contour = result.contours[0];
    const arcs = contour.segments.filter((s) => s.type === "arc");
    expect(arcs).toHaveLength(2);
    // The reported contour must still keep both outward offset arcs in the serialized path.
    // After endpoint correction, the exact large-arc flag can change with the trimmed span,
    // so validate the preserved arc radius rather than a stale flag combination.
    expect(result.pathData).toContain("A 9.011100 9.011100");

    const longestLine = Math.max(
      ...contour.segments
        .filter((s) => s.type === "line")
        .map((s) => Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y))
    );
    expect(longestLine).toBeLessThan(40);
  });

  it("uses intersection trim first for non-diverging sharp line-arc join when intersection exists", () => {
    // Exact user case:
    // M10 10 L2 10 A2 2 0 0 1 0 8 L0 16
    // Inward sharp offset should trim arc->line at real geometric intersection,
    // without inserting a horizontal detour bridge from (-1,8) to (1,8).
    const segments = [
      {
        type: "line",
        start: { x: 10, y: 10 },
        end: { x: 2, y: 10 },
      },
      {
        type: "arc",
        start: { x: 2, y: 10 },
        end: { x: 0, y: 8 },
        arc: {
          center: { x: 2, y: 8 },
          centerX: 2,
          centerY: 8,
          radius: 2,
          startAngle: Math.PI / 2,
          endAngle: Math.PI,
          sweepFlag: 1,
        },
      },
      {
        type: "line",
        start: { x: 0, y: 8 },
        end: { x: 0, y: 16 },
      },
    ];

    const result = buildOffsetContour(segments, -1, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // No intermediate detour bridge should be injected between arc and final line.
    expect(result.map((s) => s.type)).toEqual(["line", "arc", "line"]);

    const hasForbiddenHorizontalBridge = result.some((seg) => {
      if (seg.type !== "line") return false;

      const yAligned =
        Math.abs(seg.start.y - 8) < 1e-6 && Math.abs(seg.end.y - 8) < 1e-6;
      if (!yAligned) return false;

      const spansMinusOneToPlusOne =
        (Math.abs(seg.start.x - (-1)) < 1e-6 && Math.abs(seg.end.x - 1) < 1e-6) ||
        (Math.abs(seg.start.x - 1) < 1e-6 && Math.abs(seg.end.x - (-1)) < 1e-6);

      return spansMinusOneToPlusOne;
    });

    expect(hasForbiddenHorizontalBridge).toBe(false);

    // Arc and following segment must be stitched directly by intersection trim.
    const arcIndex = result.findIndex((s) => s.type === "arc");
    expect(arcIndex).toBeGreaterThanOrEqual(0);
    expect(arcIndex).toBeLessThan(result.length - 1);

    const arc = result[arcIndex];
    const next = result[arcIndex + 1];
    expect(next.type).toBe("line");

    const joinGap = Math.hypot(next.start.x - arc.end.x, next.start.y - arc.end.y);
    expect(joinGap).toBeLessThan(1e-6);

    // Direct arc->line stitch around that corner: no extra join segment in-between.
    expect(arcIndex + 1).toBe(result.length - 1);
  });

  it("drops the tiny nested artifact contour at large outward offset", async () => {
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({
      joinType: "sharp",
      capType: "flat",
      exportModule,
    });

    const path = "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0";
    const result = await engine.processPath(path, 30, {});

    expect(result.contours).toHaveLength(1);
    expect(Math.abs(result.contours[0].area)).toBeGreaterThan(1000);
  });

  it("keeps the second outward arc endpoint on the correct parallel branch", async () => {
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({
      joinType: "sharp",
      capType: "flat",
      exportModule,
    });

    const path = "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0";
    const result = await engine.processPath(path, 1, {});

    expect(result.contours).toHaveLength(1);
    const contour = result.contours[0];
    const arcs = contour.segments.filter((s) => s.type === "arc");
    expect(arcs).toHaveLength(2);

    const secondArc = arcs[1];
    expect(secondArc.end.x).toBeCloseTo(21.690981, 3);
    expect(secondArc.end.y).toBeCloseTo(-0.303953, 3);

    const secondArcIndex = contour.segments.findIndex(
      (s, idx) => s.type === "arc" && idx > contour.segments.findIndex((seg) => seg === arcs[0])
    );
    const nextSeg = contour.segments[secondArcIndex + 1];
    expect(nextSeg?.type).toBe("line");
    expect(nextSeg.start.x).toBeCloseTo(secondArc.end.x, 6);
    expect(nextSeg.start.y).toBeCloseTo(secondArc.end.y, 6);
  });

  it("keeps arc center stable near collapse and removes arc after collapse", () => {
    const segments = [
      {
        type: "line",
        start: { x: 10, y: 10 },
        end: { x: 2, y: 10 },
      },
      {
        type: "arc",
        start: { x: 2, y: 10 },
        end: { x: 0, y: 8 },
        arc: {
          center: { x: 2, y: 8 },
          centerX: 2,
          centerY: 8,
          radius: 2,
          startAngle: Math.PI / 2,
          endAngle: Math.PI,
          sweepFlag: 1,
        },
      },
      {
        type: "line",
        start: { x: 0, y: 8 },
        end: { x: 0, y: 16 },
      },
    ];

    for (const d of [-2, -3]) {
      const result = buildOffsetContour(segments, d, {
        joinType: "sharp",
        capType: "flat",
        skipCap: true,
      });

      const arc = result.find((s) => s.type === "arc");
      if (d === -2) {
        // Around collapse threshold arc may still exist depending on trim path;
        // when present its center must remain fixed.
        if (arc) {
          const center = arc.arc?.center || {
            x: arc.arc?.centerX,
            y: arc.arc?.centerY,
          };
          expect(center.x).toBeCloseTo(2, 6);
          expect(center.y).toBeCloseTo(8, 6);
        }
      }

      if (d === -3) {
        // Past collapse, arc must not remain.
        expect(arc).toBeUndefined();
      }

      // Must not create horizontal detour bridge across y=8 from x<0 to x>0.
      const hasForbiddenHorizontalBridge = result.some((seg) => {
        if (seg.type !== "line") return false;
        if (Math.abs(seg.start.y - 8) > 1e-6 || Math.abs(seg.end.y - 8) > 1e-6) {
          return false;
        }
        const minX = Math.min(seg.start.x, seg.end.x);
        const maxX = Math.max(seg.start.x, seg.end.x);
        return minX < -1e-6 && maxX > 1e-6;
      });

      expect(hasForbiddenHorizontalBridge).toBe(false);
      if (d === -3) {
        expect(result.every((s) => s.type === "line")).toBe(true);
      }

      // For d=-3, verify vertical line continues parallel inward progression (x=3)
      if (d === -3 && result.length >= 2) {
        const firstSeg = result[0];
        const secondSeg = result[1];

        expect(firstSeg.end.x).toBeCloseTo(3, 6);
        expect(secondSeg.start.x).toBeCloseTo(3, 6);
        expect(secondSeg.end.x).toBeCloseTo(3, 6);
      }
    }
  });

  it("enforces strict non-resurrection for degenerated line at |d|=6/7 inward", () => {
    // User repro contour:
    // M10 10 L2 10 A2 2 0 0 1 0 8 L0 16
    const segments = [
      {
        type: "line",
        start: { x: 10, y: 10 },
        end: { x: 2, y: 10 },
      },
      {
        type: "arc",
        start: { x: 2, y: 10 },
        end: { x: 0, y: 8 },
        arc: {
          center: { x: 2, y: 8 },
          centerX: 2,
          centerY: 8,
          radius: 2,
          startAngle: Math.PI / 2,
          endAngle: Math.PI,
          sweepFlag: 1,
        },
      },
      {
        type: "line",
        start: { x: 0, y: 8 },
        end: { x: 0, y: 16 },
      },
    ];

    const resultD6 = buildOffsetContour(segments, -6, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });
    const linesD6 = resultD6.filter((s) => s.type === "line");
    expect(linesD6).toHaveLength(1);
    expect(resultD6).toHaveLength(1);

    const resultD7 = buildOffsetContour(segments, -7, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });

    // No reversed vertical resurrection (downward tiny tail) is allowed.
    const hasReversedVertical = resultD7.some((seg) => {
      if (seg.type !== "line") return false;
      const dx = Math.abs(seg.end.x - seg.start.x);
      const dy = seg.end.y - seg.start.y;
      const isVertical = dx < 1e-6;
      const isDownward = dy < -1e-6;
      return isVertical && isDownward;
    });
    expect(hasReversedVertical).toBe(false);

    // Expected stable topology: single line, no flipped tiny tail.
    expect(resultD7.every((s) => s.type === "line")).toBe(true);
    expect(resultD7).toHaveLength(1);
  });

  it("connects neighbors via miter when closing source line degenerates at d=70", async () => {
    // Regression: at d=70 the short closing line (L -3 0, source len≈11.63)
    // produces only a 0.6-unit offset stub that should be suppressed and the
    // two neighboring offset lines should close via a clean miter join instead
    // of leaving a tiny synthetic bridge.
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({
      joinType: "sharp",
      capType: "flat",
      exportModule,
    });

    const path =
      "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0";
    const result = await engine.processPath(path, 70, {});

    // Must still be a single valid contour.
    expect(result.contours).toHaveLength(1);

    const contour = result.contours[0];
    // No tiny closing bridge: expect 5 segments (not 6).
    expect(contour.segments).toHaveLength(5);

    // All segments must have a chord > 1.0 — the 0.600 stub is gone.
    const chords = contour.segments.map((s) =>
      Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y)
    );
    expect(Math.min(...chords)).toBeGreaterThan(1.0);

    // Contour must be geometrically closed (last.end ≈ first.start).
    const first = contour.segments[0];
    const last = contour.segments[contour.segments.length - 1];
    const closingGap = Math.hypot(
      last.end.x - first.start.x,
      last.end.y - first.start.y
    );
    expect(closingGap).toBeLessThan(1e-6);
  });

  it("suppresses closing bridge across d=73-110 (universal consumed-segment fix)", async () => {
    // Regression: post-hoc Step-4e pruning failed at d=78+ because the stub
    // chord grew above the 10%-of-srcLen threshold.  The universal fix detects
    // a geometrically consumed segment during Step 2 join processing (forward-dot
    // < 0 after the right-side miter) and drops it immediately, then re-miters
    // the surviving neighbors.  This works for any offset distance without
    // hard-coded thresholds.
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({
      joinType: "sharp",
      capType: "flat",
      exportModule,
    });

    const path =
      "M -3 0 L -10 -6 L -23 6 A 8.0111 8.0111 0 0 0 -11 16 L 0 10 L 11.8923 13.1385 A 8.0111 8.0111 0 0 0 21.0615 0.4923 L 5.5077 -7.9385 L -3 0";

    for (const d of [73, 74, 75, 76, 77, 78, 85, 90, 100, 107, 110]) {
      const result = await engine.processPath(path, d, {});
      expect(result.contours, `d=${d} should have 1 contour`).toHaveLength(1);
      const segs = result.contours[0].segments;
      // No bridge — must have the same 5-segment clean contour shape as d=70.
      expect(segs, `d=${d} should have 5 segments`).toHaveLength(5);
      const chords = segs.map((s) =>
        Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y)
      );
      expect(Math.min(...chords)).toBeGreaterThan(5.0);
      // Geometrically closed.
      const first = segs[0];
      const last  = segs[segs.length - 1];
      expect(
        Math.hypot(last.end.x - first.start.x, last.end.y - first.start.y),
        `d=${d} should be geometrically closed`
      ).toBeLessThan(1e-6);
    }
  });
});
