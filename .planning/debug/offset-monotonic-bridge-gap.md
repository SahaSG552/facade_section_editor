---
status: investigating
trigger: "Investigate a monotonic degeneration violation in the offset pipeline and identify the exact root cause and best fix point. Do not edit files; do research only."
created: 2026-04-13T00:00:00Z
updated: 2026-04-13T00:00:00Z
---

## Current Focus

hypothesis: The root failure is not the dropped-gap branch; source line 0 survives join processing long enough to be trimmed from both sides into a short reversed segment. Step 4 then deletes that reversed segment under the strict non-resurrection rule, but the builder does not restitch its neighbors, leaving a closure gap that becomes visible once engine snapping no longer applies.
test: Consolidate the exact code-path evidence and identify the narrowest safe fix point: either prevent the line->arc convex join from creating a reversed consumed line, or reconnect neighbors immediately when that line is removed.
expecting: The best fix point will be the convex sharp line->arc branch around circle-line trim for the consumed line, because it can collapse the line and stitch adjacent survivors before post-filtering, preserving existing non-resurrection behavior.
next_action: finalize root-cause report with code-path evidence, target branch, minimal fix strategy, and regression coverage

## Symptoms

expected: For source path `M 3 5 L 2 9 A 1.4142 1.4142 0 0 1 0 8 V 0 H 10 V 3 L 3 5 Z`, once a small line segment collapses during outward offset, it must not reappear at larger magnitudes.
actual: Engine output at d=-11.5 has 5 segments and no tiny closing line, but at d=-12 and larger it returns 6 segments with a tiny line bridge that grows with distance. Example at d=-13: `M 13.953421 14.786689 A 14.414200 14.414200 0 0 1 -13.000000 6.845029 L -13.000000 -13.000000 L 23.000000 -13.000000 L 23.000000 12.805918 L 13.790815 15.437114 L 13.953421 14.786689 Z`.
errors: no runtime errors.
reproduction: In code, `calculateOffsetFromPathData(sourcePath, -11.5)` gives 5 segments, while `calculateOffsetFromPathData(sourcePath, -12)` gives 6 with a tiny extra line of length ~0.2296. `buildOffsetContour` already returns 5 segments at both distances; `_stitchSegments` inserts the extra line only at -12+ because builder leaves a widening gap.
started: discovered after prior fixes for arc degeneration / stitch resurrection; latest user report says previous fix did not resolve this payload.

## Eliminated

## Evidence

- timestamp: 2026-04-13T00:00:00Z
  checked: supplied investigation context
  found: Builder returns 5 segments at both d=-11.5 and d=-12, but at d=-12 the last line end and first arc start differ materially while at d=-11.5 they are nearly coincident.
  implication: The monotonicity violation is upstream of engine stitching, but manifests only when stitching converts the builder gap into an explicit line segment.

- timestamp: 2026-04-13T00:00:00Z
  checked: supplied investigation context
  found: Raw per-segment offsets still include source line 0 at both distances.
  implication: The source line is not removed in initial offset generation; it is lost or bypassed during downstream collapse/join consolidation.

- timestamp: 2026-04-13T00:00:00Z
  checked: OffsetContourBuilder dropped-gap branch and OffsetEngine.\_stitchSegments
  found: Builder has an explicit dropped-source-gap path keyed off skipped source indices, while engine stitching only snaps tiny closed gaps and otherwise inserts a synthetic line for any remaining closure gap.
  implication: If the builder exits with a real gap after handling a collapsed source feature, the visible reappearing segment is expected downstream and the root fix point is in builder join/collapse logic, not in engine stitching.

- timestamp: 2026-04-13T00:00:00Z
  checked: existing regressions on the same source path and nearby degeneration rules
  found: Current tests cover arc survival, inward degeneration stability, monotonic absence of fully collapsed arcs, and tiny inverted line suppression, but not this closed-contour case where a dropped source line reappears later as a stitched closure bridge.
  implication: The gap is likely in builder monotonic handling for closed dropped-line cases rather than a knowingly accepted engine behavior.

- timestamp: 2026-04-13T00:00:00Z
  checked: runtime probe of buildOffsetContour and raw per-segment offsets for source indices 5, 0, and 1 at d=-11.5/-12/-13
  found: The final surviving last-line endpoint in the 5-segment builder output exactly matches the raw line-line miter from join 5->0, while the final arc start exactly matches the infinite-line circle trim chosen in convex join 0->1.
  implication: Source line 0 is not skipped before join processing; it is first used to trim source 5, then independently trimmed against arc 1, creating a residual segment between those two trim points.

- timestamp: 2026-04-13T00:00:00Z
  checked: residual geometry of source line 0 after adjacent joins
  found: At d=-11.5 the residual line 0 is approximately 0.0112 long and at d=-12 it is approximately 0.2296 long, with direction exactly opposite the source line in both cases (direction dot product = -1).
  implication: The builder's strict non-resurrection filter is correctly deleting a reversed resurrected line; the actual bug is that adjacent survivors are not reconnected after this deletion.

- timestamp: 2026-04-13T00:00:00Z
  checked: OffsetContourBuilder post-processing and OffsetEngine closed-gap stitching
  found: Builder Step 4 removes reversed lines by source direction, but does not stitch neighboring segments after removal. Engine later snaps closed gaps only up to 0.05 and otherwise inserts a line. The d=-11.5 residual gap remains small enough to snap, while the d=-12 residual gap exceeds the snap threshold and becomes an explicit bridge.
  implication: The monotonic violation is created by builder post-join topology, and only revealed by engine stitching once the unhandled post-filter gap grows past the small-gap snap policy.

## Resolution

root_cause: Closed-contour convex line->arc processing around source line 0 consumes that line from both sides into a reversed residual segment: join 5->0 trims its start to the previous miter, then join 0->1 trims its end to the arc-circle intersection beyond the line's original end. The strict non-resurrection rule later removes this reversed line, but the builder never reconnects the surviving previous line and next arc, leaving a real closure gap. Engine \_stitchSegments then materializes that gap as a line once it grows beyond the closed-gap snap threshold.
fix: Best fix point is OffsetContourBuilder's convex sharp current.type === "line" && next.type === "arc" branch: detect when the chosen trim point would reverse or fully consume the current line, and collapse/stitch across that line immediately (using previous-segment support or an equivalent local restitch) instead of creating a reversed line that gets deleted later. Avoid fixing this in OffsetEngine.\_stitchSegments; that would only hide the symptom and weaken useful gap handling elsewhere.
verification: Static code-path analysis plus runtime probes at d=-11.5/-12/-13 confirm the exact join points, reversed residual line direction, and transition from engine snap to synthetic bridge insertion.
files_changed: []
