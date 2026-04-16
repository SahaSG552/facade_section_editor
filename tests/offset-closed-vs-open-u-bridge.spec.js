/**
 * Regression test: closed and open U-contours with line→arc sharp join.
 *
 * Geometry:
 *   Closed: M -10 0 L 10 0 L 10 30 A 13 13 0 0 0 -10 30 L -10 0
 *   Open:   M 60 0 L 60 30 A 13 13 0 0 0 40 30 L 40 0  (same arc geometry, x+50)
 *
 * Arc: r=13, sweepFlag=0, center at y=38.3066 (both contours).
 * Arc-line separation split: d=1.5  (arc equatorial freeze).
 * Arc collapse distance:     d=13   (arc radius → 0).
 *
 * Expected invariant (per offset d):
 *   Both contours produce identical "upper" structure (arc / П-bridge / walls).
 *   Closed has exactly 1 extra segment (bottom).
 *   Bridge height = max(0, d - 1.5) for d ≤ 13, then continues to grow.
 *
 * Reported bug: at the offset step where the arc collapses (d=13) the closed
 * contour's П-bridge (and its legs) disappears even though the open contour
 * retains the correct bridge-like structure.
 */

import { describe, it, expect } from "vitest";
import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

// ─── Contour definitions ─────────────────────────────────────────────────────

const CLOSED_PATH = "M -10 0 L 10 0 L 10 30 A 13 13 0 0 0 -10 30 L -10 0";
const OPEN_PATH   = "M 60 0 L 60 30 A 13 13 0 0 0 40 30 L 40 0";

const ARC_CENTER_Y = 38.30662386291807; // center of both arcs (Y-down screen coords)
const ARC_SEPARATION_D = 1.5;           // d at which arc-line tangency fires
const ARC_COLLAPSE_D   = 13;            // d at which arc radius → 0

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract comparable metrics from an offset result's segment array.
 * Positions are returned in absolute screen coordinates (Y-down), so the
 * open contour at x+50 and the closed contour at x=0 share the same Y metrics.
 */
function extractMetrics(segs) {
  const arcs  = segs.filter(s => s.type === "arc");
  const lines = segs.filter(s => s.type === "line");

  // Arc
  const arcCount  = arcs.length;
  const arcRadius = arcCount > 0 ? (arcs[0].arc?.radius ?? null) : null;

  // Vertical extremes
  const allY = segs.flatMap(s => [s.start.y, s.end.y]);
  const maxY = allY.length > 0 ? Math.max(...allY) : 0;
  const minY = allY.length > 0 ? Math.min(...allY) : 0;

  // Bridge height: distance above the equatorial level (ARC_CENTER_Y).
  // Positive only when the П-bridge extends above the arc center.
  const bridgeHeight = maxY > ARC_CENTER_Y + 1e-4
    ? +(maxY - ARC_CENTER_Y).toFixed(4)
    : 0;

  // Detect whether there is a flat horizontal connector at the equatorial level
  // (the "wrong" result when the bridge collapses to a single line).
  const hasEquatorialConnector = lines.some(s =>
    Math.abs(s.start.y - ARC_CENTER_Y) < 0.1 &&
    Math.abs(s.end.y   - ARC_CENTER_Y) < 0.1
  );

  // Leg count: lines that lie strictly above the equatorial level on both endpoints
  const bridgeLegCount = lines.filter(s =>
    Math.min(s.start.y, s.end.y) > ARC_CENTER_Y + 0.1
  ).length;

  return {
    segCount: segs.length,
    arcCount,
    arcRadius: arcRadius != null ? +arcRadius.toFixed(6) : null,
    maxY: +maxY.toFixed(4),
    minY: +minY.toFixed(4),
    bridgeHeight,
    bridgeLegCount,
    hasEquatorialConnector,
  };
}

/**
 * Run an outward offset of magnitude `d` on the closed or open contour.
 *
 * Closed U (CCW in screen / area>0): left-of-traversal is inward, so outward
 *   requires distance < 0 for the builder.  processPath for closed contours
 *   does NOT flip the sign → pass -d.
 *
 * Open U (area>0): the engine applies  openEffectiveDistance = -distance  →
 *   pass +d so the engine flips to -d internally, giving leftward = outward.
 */
async function offsetOutward(engine, path, isClosed, d) {
  if (d === 0) {
    // Zero distance: return source parsed as-is (no offset call needed)
    const r = await engine.processPath(path, isClosed ? -1e-12 : 1e-12, {
      trimSelfIntersections: false,
      joinType: "sharp",
      capType: "flat",
    });
    return r;
  }
  return engine.processPath(path, isClosed ? -d : d, {
    trimSelfIntersections: false,
    joinType: "sharp",
    capType: "flat",
  });
}

// ─── Test ────────────────────────────────────────────────────────────────────

describe("closed vs open U-contour: П-bridge consistency", () => {
  it("sequential outward offsets d=0…30 produce matching upper structure", async () => {
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({ exportModule, joinType: "sharp", capType: "flat" });

    const divergences = [];
    const stepLog     = [];

    for (let d = 0; d <= 30; d++) {
      const cr = await offsetOutward(engine, CLOSED_PATH, true,  d);
      const or = await offsetOutward(engine, OPEN_PATH,   false, d);

      const closedSegs = cr.contours?.[0]?.segments ?? [];
      const openSegs   = or.contours?.[0]?.segments ?? [];

      const cm = extractMetrics(closedSegs);
      const om = extractMetrics(openSegs);

      const entry = { d, closed: cm, open: om };
      stepLog.push(entry);

      // ── Invariant checks ──────────────────────────────────────────────────

      // 1. Closed has exactly 1 more segment than open (the bottom segment).
      //    Exception: d=0 (no offset applied) is informational only.
      const segDiff = cm.segCount - om.segCount;

      // 2. Arc count must match.
      const arcCountMatch = cm.arcCount === om.arcCount;

      // 3. Arc radius must match (when arc is present).
      const arcRadiusMatch =
        cm.arcRadius === null
          ? om.arcRadius === null
          : Math.abs((cm.arcRadius ?? 0) - (om.arcRadius ?? 0)) < 0.01;

      // 4. Bridge height must match.
      const bridgeHeightMatch =
        Math.abs(cm.bridgeHeight - om.bridgeHeight) < 0.1;

      // 5. When d > ARC_SEPARATION_D and d <= ARC_COLLAPSE_D, both should have
      //    a П-bridge (legs above equatorial level).
      const shouldHaveBridge = d > ARC_SEPARATION_D;
      const closedHasBridge  = cm.bridgeLegCount > 0;
      const openHasBridge    = om.bridgeLegCount > 0;

      const isDiverging = d > 0 && (
        segDiff !== 1 ||
        !arcCountMatch ||
        !arcRadiusMatch ||
        !bridgeHeightMatch
      );

      if (isDiverging) {
        divergences.push({ d, segDiff, arcCountMatch, arcRadiusMatch, bridgeHeightMatch, ...entry });
      }
    }

    // ── Report ─────────────────────────────────────────────────────────────
    console.log("\n=== Offset d=0…30 step-by-step ===");
    for (const { d, closed: cm, open: om } of stepLog) {
      const flag = d > 0 && (
        cm.segCount - om.segCount !== 1 ||
        cm.arcCount !== om.arcCount ||
        Math.abs(cm.bridgeHeight - om.bridgeHeight) >= 0.1
      ) ? " ← DIVERGE" : "";
      console.log(
        `d=${String(d).padStart(2)}: ` +
        `closed segs=${cm.segCount} arcR=${cm.arcRadius ?? "none"} bridgeH=${cm.bridgeHeight} legs=${cm.bridgeLegCount}` +
        `  |  ` +
        `open  segs=${om.segCount} arcR=${om.arcRadius ?? "none"} bridgeH=${om.bridgeHeight} legs=${om.bridgeLegCount}` +
        flag
      );
    }

    if (divergences.length > 0) {
      console.log(`\nFirst divergence at d=${divergences[0].d}:`, divergences[0]);
    }

    expect(divergences, `Divergences detected:\n${JSON.stringify(divergences, null, 2)}`).toHaveLength(0);
  });

  // ── Exact regression: bridge must survive arc collapse ──────────────────

  it("closed contour at d=13: matches open contour (arc collapsed, no bridge above equatorial)", async () => {
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({ exportModule, joinType: "sharp", capType: "flat" });

    const closedResult = await offsetOutward(engine, CLOSED_PATH, true,  13);
    const openResult   = await offsetOutward(engine, OPEN_PATH,   false, 13);

    const closedSegs = closedResult.contours?.[0]?.segments ?? [];
    const openSegs   = openResult.contours?.[0]?.segments   ?? [];

    console.log(`\nclosed d=13 (${closedSegs.length} segs):`);
    closedSegs.forEach((s, i) => {
      const r = s.arc ? ` r=${s.arc.radius?.toFixed(3)}` : "";
      console.log(`  ${i} ${s.type} (${s.start.x.toFixed(4)},${s.start.y.toFixed(4)})→(${s.end.x.toFixed(4)},${s.end.y.toFixed(4)})${r}`);
    });

    const cm = extractMetrics(closedSegs);
    const om = extractMetrics(openSegs);

    // At d=13 the arc collapses exactly; both contours should have the same bridge behavior.
    // Closed has 1 extra segment (bottom).
    expect(cm.segCount - om.segCount, "closed should have exactly 1 more segment than open (bottom)").toBe(1);
    expect(cm.arcCount,   "closed d=13: arc should be gone").toBe(0);
    expect(cm.bridgeHeight, "closed d=13: bridge height should match open").toBeCloseTo(om.bridgeHeight, 1);
  });

  it("open contour at d=13: neighbors connect (no bridge legs above equatorial)", async () => {
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({ exportModule, joinType: "sharp", capType: "flat" });

    const result = await offsetOutward(engine, OPEN_PATH, false, 13);
    const segs   = result.contours?.[0]?.segments ?? [];

    console.log(`\nopen d=13 (${segs.length} segs):`);
    segs.forEach((s, i) => {
      const r = s.arc ? ` r=${s.arc.radius?.toFixed(3)}` : "";
      console.log(`  ${i} ${s.type} (${s.start.x.toFixed(4)},${s.start.y.toFixed(4)})→(${s.end.x.toFixed(4)},${s.end.y.toFixed(4)})${r}`);
    });

    const { arcCount } = extractMetrics(segs);
    // Arc collapsed — should be gone
    expect(arcCount, "open d=13: arc should have collapsed").toBe(0);
  });

  it("closed contour at d=12: П-bridge exists (pre-collapse)", async () => {
    const exportModule = new ExportModule();
    const engine = new OffsetEngine({ exportModule, joinType: "sharp", capType: "flat" });

    const result = await offsetOutward(engine, CLOSED_PATH, true, 12);
    const segs   = result.contours?.[0]?.segments ?? [];

    const { bridgeHeight, bridgeLegCount } = extractMetrics(segs);

    // At d=12: bridge height ≈ 12 - 1.5 = 10.5
    expect(bridgeHeight, "closed d=12: bridge height ≈ 10.5").toBeCloseTo(10.5, 0);
    expect(bridgeLegCount, "closed d=12: bridge must have leg segments").toBeGreaterThan(0);
  });
});
