import { describe, it, expect } from "vitest";

import { OffsetEngine } from "../src/operations/OffsetEngine.js";
import ExportModule from "../src/export/ExportModule.js";

const CLOSED_PATH = "M -10 0 L 30 -1 L 10 30 A 13 13 0 0 0 -10 30 L -10 0";
const OPEN_PATH = "M 80 -1 L 60 30 A 13 13 0 0 0 40 30 L 40 0";

const OPTS = {
  joinType: "sharp",
  capType: "flat",
  offsetSignMode: "direct",
  trimSelfIntersections: true,
};

const OPTS_RUNTIME_OPEN = {
  joinType: "sharp",
  capType: "flat",
  offsetSignMode: "direct",
  trimSelfIntersections: false,
};

const EXPECTED_OPEN_D13_SEGMENTS = [
  {
    type: "line",
    start: { x: 102.425168, y: -11.779383 },
    end: { x: 64.200781, y: 47.468418 },
  },
  {
    type: "line",
    start: { x: 64.200781, y: 47.468418 },
    end: { x: 59.619884, y: 54.568807 },
  },
  {
    type: "line",
    start: { x: 59.619884, y: 54.568807 },
    end: { x: 50, y: 48.362431 },
  },
  {
    type: "line",
    start: { x: 50, y: 48.362431 },
    end: { x: 50, y: 49.806624 },
  },
  {
    type: "line",
    start: { x: 50, y: 49.806624 },
    end: { x: 27, y: 49.806624 },
  },
  {
    type: "line",
    start: { x: 27, y: 49.806624 },
    end: { x: 27, y: 38.306624 },
  },
  {
    type: "line",
    start: { x: 27, y: 38.306624 },
    end: { x: 27, y: -11.449869 },
  },
  {
    type: "line",
    start: { x: 27, y: -11.449869 },
    end: { x: 102.425168, y: -11.779383 },
  },
];

function assertSegmentsClose(actualSegments, expectedSegments, precision = 4, label = "segment") {
  expect(actualSegments.length, `${label} count`).toBe(expectedSegments.length);
  for (let i = 0; i < expectedSegments.length; i += 1) {
    const actual = actualSegments[i];
    const expected = expectedSegments[i];

    expect(actual.type, `${label} ${i} type`).toBe(expected.type);
    expect(actual.start?.x ?? NaN, `${label} ${i} start.x`).toBeCloseTo(expected.start.x, precision);
    expect(actual.start?.y ?? NaN, `${label} ${i} start.y`).toBeCloseTo(expected.start.y, precision);
    expect(actual.end?.x ?? NaN, `${label} ${i} end.x`).toBeCloseTo(expected.end.x, precision);
    expect(actual.end?.y ?? NaN, `${label} ${i} end.y`).toBeCloseTo(expected.end.y, precision);
  }
}

describe("exact-collapse continuity at d=13", () => {
  it("open direct d=-13 matches sequential d=-12.99 then d=-0.01 and preserves expected stitched contour", async () => {
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const openDirect = await engine.processPath(OPEN_PATH, -13, OPTS);
    const openStep1 = await engine.processPath(OPEN_PATH, -12.99, OPTS);
    const openSeq = await engine.processPath(openStep1.pathData, -0.01, OPTS);

    const openDirectSegments = openDirect.contours?.[0]?.segments ?? [];
    const openSeqSegments = openSeq.contours?.[0]?.segments ?? [];
    assertSegmentsClose(
      openDirectSegments,
      openSeqSegments,
      4,
      "open direct/seq continuity through exact collapse"
    );

    const openDirectArcs = openDirectSegments.filter((s) => s.type === "arc");
    expect(openDirectArcs.length, "open d=-13 should collapse arc and stitch neighbors").toBe(0);
    assertSegmentsClose(openDirectSegments, EXPECTED_OPEN_D13_SEGMENTS, 4, "open d=-13 stitched contour");

    const closedAfter = await engine.processPath(CLOSED_PATH, -13.5, OPTS);
    expect(closedAfter.contours.length, "closed contour should remain valid after exact collapse").toBe(1);
    expect(closedAfter.contours[0].closed, "post-collapse contour must remain closed").toBe(true);
    expect(closedAfter.pathData.includes("NaN"), "post-collapse path must not contain NaN").toBe(false);
  });

  it("open runtime mode (trim=false): d=-13 stays on stitched branch and d=-14 follows sequential continuation", async () => {
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const direct13 = await engine.processPath(OPEN_PATH, -13, OPTS_RUNTIME_OPEN);
    const direct14 = await engine.processPath(OPEN_PATH, -14, OPTS_RUNTIME_OPEN);
    const seq14 = await engine.processPath(direct13.pathData, -1, OPTS_RUNTIME_OPEN);

    const direct13Segments = direct13.contours?.[0]?.segments ?? [];
    const direct14Segments = direct14.contours?.[0]?.segments ?? [];
    const seq14Segments = seq14.contours?.[0]?.segments ?? [];

    // d=-13 must not keep the detour pair that caused the user-facing degradation.
    expect(direct13Segments.length, "open runtime d=-13 should keep stitched branch without detour collapse artifacts").toBe(8);
    expect(direct13.pathData.includes("45.419103 45.407014"), "open runtime d=-13 must not include the old detour vertex").toBe(false);

    // d=-14 direct must follow the same branch as sequential continuation from d=-13.
    assertSegmentsClose(direct14Segments, seq14Segments, 4, "open runtime d=-14 direct/sequential continuity");
    expect(direct14Segments.length, "open runtime d=-14 should preserve non-degenerated stitched continuation").toBe(8);
  });

  it("open runtime mode (trim=false): non-integer interactive distance past collapse stays on same branch", async () => {
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const interactiveDistance = -13.95;
    const direct = await engine.processPath(OPEN_PATH, interactiveDistance, OPTS_RUNTIME_OPEN);

    const atCollapse = await engine.processPath(OPEN_PATH, -13, OPTS_RUNTIME_OPEN);
    const seq = await engine.processPath(atCollapse.pathData, interactiveDistance + 13, OPTS_RUNTIME_OPEN);

    const directSegments = direct.contours?.[0]?.segments ?? [];
    const seqSegments = seq.contours?.[0]?.segments ?? [];

    assertSegmentsClose(directSegments, seqSegments, 4, "open runtime non-integer direct/sequential continuity");
    expect(directSegments.length, "interactive non-integer continuation should keep stitched branch").toBeGreaterThanOrEqual(7);
  });

  it("trim=true (OffsetTool default): d=-14 direct matches sequential d=-13 then d=-1 (outward collapse continuation)", async () => {
    // Regression for: d=-14 direct (trimSelfIntersections=true) was producing
    // 4 segments instead of 8, losing the intermediate arc-collapse bridge segments.
    // Root cause: preferPathRoundtripPhase1 was gated on trimSelfIntersections===false,
    // so the integer phase used _processSegmentsSync with __disableOpenIntegerPhase=true
    // which bypassed the collapse-aware recursive pass for phase1 at d=-13.
    const engine = new OffsetEngine({
      exportModule: new ExportModule(),
      joinType: "sharp",
      capType: "flat",
    });

    const direct13 = await engine.processPath(OPEN_PATH, -13, OPTS);
    const direct14 = await engine.processPath(OPEN_PATH, -14, OPTS);
    const seq14 = await engine.processPath(direct13.pathData, -1, OPTS);

    const direct14Segments = direct14.contours?.[0]?.segments ?? [];
    const seq14Segments = seq14.contours?.[0]?.segments ?? [];

    assertSegmentsClose(direct14Segments, seq14Segments, 4, "trim=true d=-14 direct/sequential continuity");
    expect(direct14Segments.length, "trim=true d=-14 should preserve all bridge segments (was 4, expect 8)").toBeGreaterThanOrEqual(7);
  });
});
