# Offset Snapshot System Implementation

## TL;DR

> **Quick Summary**: Implement stable snapshot-based offset system that captures topological events (bridge appearance, segment degeneracy) and preserves contour state across offset values, fixing the issue where П-bridges disappear when arcs degenerate.
>
> **Deliverables**:
> - Snapshot system in OffsetTool
> - Topology event detector
> - Snapshot-based offset calculation
> - Fix applyMiterJoin to create bridges when neighbor degenerates
> - Fix gapSealPass to preserve bridges after sanitize
> - Fix sanitizeSegments to handle degenerate+bridge correctly
> - Automated tests for snapshot + degenerate behavior
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1 → T2 → T3 → T5

---

## Context

### Original Problem
When dynamically varying offset distance:
- At offset -1: П-bridge appears (arc valid)
- At offset -5: arc degenerates, П-bridge disappears!
- Expected: П-bridge should remain because it was a valid segment at -1

### Root Cause
Current implementation recalculates offset from ORIGINAL contour for each distance. When arc degenerates, NO bridges are created because `applyMiterJoin` returns null for degenerate segments.

### Solution: Two-Pronged Approach

**1. Immediate Fix (T5-T7):**
- Fix applyMiterJoin to create bridges even when neighbor is degenerate
- Fix gapSealPass to preserve bridges after sanitize
- Fix sanitizeSegments to keep bridges when arcs are removed

**2. Stable System (T1-T4, T8-T9):**
- Snapshot system to preserve state across offset values
- Topology event detection
- Snapshot-based offset calculation
- Tests for both approaches

---

## Work Objectives

### Core Objective
Implement stable offset system with snapshot preservation that works consistently across all offset values.

### Concrete Deliverables
- Snapshot storage and management in OffsetTool
- Topology event detector
- Modified offset calculation using snapshots
- Tests verifying snapshot behavior

### Definition of Done
- [ ] Snapshot captured when topology changes
- [ ] Bridge preserved when navigating to intermediate offset
- [ ] Sign change clears history correctly
- [ ] Tests pass

### Must Have
- Snapshot capture on bridge/degenerate/sanitize events
- Correct snapshot selection (floor by absolute value)
- Independent positive/negative stacks
- Fix applyMiterJoin to create bridges even when neighbor degenerates
- Fix sanitizeSegments to preserve bridges when arcs degenerate

### Must NOT Have
- Global algorithm rewrite
- Global path optimization

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: Tests-after
- **Framework**: Vitest

### QA Policy
Every task includes agent-executed QA scenarios with evidence path.

---

## Execution Strategy

### Wave 1 (Foundation):
- T1: Add snapshot storage to OffsetTool
- T2: Create topology event detector

### Wave 2 (Core Implementation):
- T3: Modify _refreshPreview to use snapshots
- T4: Handle sign change correctly

### Wave 3 (Degenerate Fixes):
- T5: Fix applyMiterJoin to create bridges when neighbor degenerates
- T6: Fix gapSealPass to preserve bridges after sanitize
- T7: Fix sanitizeSegments to handle degenerate+bridge correctly

### Wave 4 (Testing):
- T8: Add snapshot behavior tests
- T9: Test edge cases

---

## TODOs

- [x] 1. Add snapshot storage and management to OffsetTool

  **What to do**:
  - Add `this._snapshots = { positive: [], negative: [] }` in constructor/activate
  - Add helper methods:
    - `getSnapshotForOffset(d)` - find closest valid snapshot
    - `captureSnapshot(offset, pathData, segments, topology)` - save state
    - `clearSnapshots()` - reset on tool deactivation
  - Initialize snapshots in `activate()`, clear in `deactivate()`

  **References**:
  - `src/editor/tools/OffsetTool.js:610-650` - constructor pattern
  - `.sisyphus/plans/offset-rules.md` - snapshot selection rules

  **Acceptance Criteria**:
  - [ ] `_snapshots` object exists with positive/negative arrays
  - [ ] Snapshots cleared on new tool activation

- [ ] 2. Create topology event detector

  **What to do**:
  - Create function to detect topology changes between offset results:
    - `detectTopologyChanges(oldSegments, newSegments)` returns:
      - `bridgesAdded`: count of new bridge segments
      - `segmentsDegenerate`: count of degenerate segments
      - `sanitizeRemovals`: segments removed by sanitize
  - Add to OffsetTool as helper method

  **References**:
  - `src/operations/CustomOffsetProcessor.js:728` - bridge detection (`isBridge: true`)
  - `src/operations/offset/OffsetContourStages.js:14` - degenerate detection

  **Acceptance Criteria**:
  - [ ] Function correctly identifies bridge segments
  - [ ] Function correctly identifies degenerate segments

- [ ] 3. Modify _refreshPreview to use snapshots

  **What to do**:
  - After each offset calculation, detect topology changes
  - If topology changed, capture snapshot
  - When calculating offset for a value:
    - Find closest valid snapshot (floor by absolute value)
    - Use snapshot.pathData as input instead of original entry.pathData

  **References**:
  - `src/editor/tools/OffsetTool.js:1181-1228` - current _refreshPreview
  - `.sisyphus/plans/offset-rules.md` - snapshot selection logic

  **Acceptance Criteria**:
  - [ ] Snapshot captured when bridge appears
  - [ ] Snapshot captured when segment degenerates
  - [ ] Intermediate offset uses closest snapshot

- [ ] 4. Handle sign change correctly

  **What to do**:
  - Detect when offset sign changes (positive <-> negative)
  - Clear snapshots when sign changes
  - Start fresh from original contour

  **Acceptance Criteria**:
  - [ ] Sign change clears appropriate snapshot stack
  - [ ] New sign starts from original contour

- [ ] 5. Fix applyMiterJoin to create bridges when neighbor degenerates

  **What to do**:
  - In `applyMiterJoin()` in CustomOffsetProcessor.js:
    - When curr OR next is degenerate, DON'T return null immediately
    - Instead: create bridge between non-degenerate neighbor endpoints
    - This ensures bridges exist even when arcs degenerate
  
  **Current code (lines 620-627)**:
  ```javascript
  if (curr.degenerate || next.degenerate) {
      return null;  // <-- PROBLEM: No bridge created!
  }
  ```
  
  **Fix**: Create bridge between non-degenerate endpoints

  **References**:
  - `src/operations/CustomOffsetProcessor.js:620-627` - applyMiterJoin

  **Acceptance Criteria**:
  - [ ] Bridge created even when arc degenerates
  - [ ] П-bridge lines remain as full contour segments

- [ ] 6. Fix gapSealPass to preserve bridges after sanitize

  **What to do**:
  - After sanitizeSegments in gapSealPass:
    - When connecting neighbors after degenerate removal
    - Don't skip bridge creation just because segment was degenerate
    - Create bridge between the two surviving neighbors

  **References**:
  - `src/operations/offset/OffsetContourStages.js:66-92` - gapSealPass

  **Acceptance Criteria**:
  - [ ] Bridges preserved after sanitize pass

- [ ] 7. Fix sanitizeSegments to handle degenerate+bridge correctly

  **What to do**:
  - Current: sanitize removes ALL degenerate segments
  - Issue: Bridges created from valid arc might be affected
  - Fix: Only remove segments that are:
    1. Actually degenerate (segment.degenerate === true)
    2. AND not bridges (isBridge !== true)
  
  **Note**: Bridges are regular lines, NOT marked degenerate. They should survive sanitize.

  **References**:
  - `src/operations/offset/OffsetContourStages.js:9-22` - sanitizeSegments

  **Acceptance Criteria**:
  - [ ] Bridges survive sanitize
  - [ ] Degenerate arcs still removed

- [ ] 8. Add snapshot behavior tests

  **What to do**:
  - Add test file: `tests/offset/snapshot-system.spec.js`
  - Test scenarios:
    1. Bridge at offset -1 preserved at offset -3
    2. Snapshots at -1, -5: offset -3 uses -1 snapshot
    3. Sign change clears history

  **Acceptance Criteria**:
  - [ ] Bridge preservation test passes
  - [ ] Snapshot selection test passes
  - [ ] Sign change test passes

- [ ] 9. Test edge cases

  **What to do**:
  - Test with multiple sequential offsets
  - Test with degenerate segments
  - Test with sanitize events

  **Acceptance Criteria**:
  - [ ] All edge cases handled correctly

---

## Final Verification Wave

- [ ] F1. **Code Review** - Verify snapshot + degenerate fixes match OFFSET_RULES.md
- [ ] F2. **Tests Pass** - Run `npm run test`
- [ ] F3. **Integration** - Manual test with user's contour example
- [ ] F4. **Bridge Preservation** - Verify П-bridge remains when arc degenerates

---

## Success Criteria

```bash
npm run test
```

All snapshot and degenerate fix tests pass.
