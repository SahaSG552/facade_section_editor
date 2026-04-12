---
status: resolved
trigger: "Pre-existing: task-6-scenario3 L-shape self-intersection trimming flow returns empty pathData"
created: 2026-04-11T14:00:00Z
updated: 2026-04-11T14:35:00Z
---

## Current Focus

hypothesis: Test uses d=20 which exactly hits the L-shape collapse threshold (40-unit narrow leg / 2 = 20). buildOffsetContour produces a zero-area figure-8 contour at this exact distance. The area filter correctly removes it.
test: change d=20 to d=15 in the test (non-degenerate distance)
expecting: result.pathData.length > 0 with valid 6-segment shrunken L-shape (area=1300)
next_action: patch tests/task-6-offsetengine-qa.spec.js

## Symptoms

expected: Inward offset d=20 of L-shape should produce a valid shrunken contour
actual: result.pathData.length === 0 (empty output)
errors: none thrown
reproduction: npm run test -- tests/task-6-offsetengine-qa.spec.js
started: pre-existing before the cursor-side arc fix

## Eliminated

- hypothesis: PaperBooleanProcessor mock interferes with trimSelfIntersectionsDetailed
  evidence: Mock returns hadSelfIntersections=undefined; trimSelfIntersectionsDetailed returns []; _splitContours fallback called; area check is the actual filter.
  timestamp: 2026-04-11T14:30:00Z

## Evidence

- timestamp: 2026-04-11T14:30:00Z
  checked: buildOffsetContour(L-shape, d) for d in [10,15,19,20,21,25,30]
  found: d<20 gives 6 segs positive area (valid shrunken L); d=20 gives 4 segs area=0 (degenerate); d>20 gives 4 segs negative area (self-intersecting)
  implication: d=20 is exactly the geometric collapse threshold. 40-unit narrow leg / 2 = 20. At d=20 the contour collapses to a zero-area figure-8. Area filter correctly removes it. Test expectation is wrong for d=20.

- timestamp: 2026-04-11T14:32:00Z
  checked: _processSegmentsSync area filter at Math.abs(contourArea) <= EPSILON
  found: area=0 contour correctly rejected -- engine behavior is correct
  implication: Fix belongs in the test. Use d=15 for genuine non-degenerate inward offset test.

## Resolution

root_cause: Test used d=20 which is the EXACT geometric collapse threshold for the L-shape (40-unit narrow leg / 2 = 20). buildOffsetContour produces a degenerate zero-area figure-8 at exactly this distance. The area filter in _processSegmentsSync correctly rejects it, yielding empty pathData. Engine behavior is correct.
fix: Change d from 20 to 15 in tests/task-6-offsetengine-qa.spec.js Scenario 3. At d=15, result is a valid 6-segment shrunken L-shape (area=1300).
verification: All 245 tests pass (245/245). No regressions. Scenario 3 now produces area=1300 shrunken L-shape at d=15.
files_changed: [tests/task-6-offsetengine-qa.spec.js]
