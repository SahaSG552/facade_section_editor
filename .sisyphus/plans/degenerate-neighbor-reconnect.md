# Degenerate Segment Removal & Neighbor Reconnection Refactor

## TL;DR

> **Quick Summary**: Fix `CustomOffsetProcessor.joinOffsetSegments()` so that when degenerate segments (zero-radius arc or zero-length line) are removed, their actual neighbors in the full post-join topology (including inserted bridge segments) are correctly reconnected — including the cyclic last↔first pair in closed contours.
>
> **Deliverables**:
>
> - Bug fix: cyclic second pass for closed contours
> - Enhancement: `isBridge` metadata on bridge segments
> - Enhancement: iterative sanitize→reconnect for cascaded degeneracy
> - Regression tests for every fixed scenario
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO — sequential commits, each with tests
> **Critical Path**: T1 → T2 → T3 → T4 → T5

---

## Context

### Original Request

When a segment becomes degenerate (radius≤0 or length≤0), it must be removed and its actual neighbors — including bridge segments inserted during the join pass — must be correctly reconnected.

### Interview Summary

**Key Discussions**:

- Previous hardening plan (T1-T17) completed: 67 tests pass
- Problem: second pass gap-sealing is LINEAR — misses the `last↔first` gap in CLOSED contours after degenerate removal
- "Actual neighbors" = neighbors in the **post-first-pass topology** including bridges, NOT original pre-join order
- Bridges are currently unmarked (no `isBridge` flag), first-class segments by behavior only

**Research Findings**:

- `joinOffsetSegments` pipeline: first pass (join+bridges, lines 858-875) → `sanitizeSegments` (lines 879) → second pass (gap seal, lines 885-896)
- Bug 1: second pass `for (i < clean.length)` with `i < clean.length - 1` guard → NEVER checks `clean[last]↔clean[0]`
- Bug 2: no "reconnect across deleted run" semantics for multi-segment degenerate spans
- Bug 3: no iterative stabilization — second-pass trims can create new degeneracies
- `applyMiterJoin` does NOT know bridge-vs-original provenance

### Metis Review

**Gaps addressed**:

- Cyclic second pass scope: MINIMAL fix (add `last↔first` check) + structural consistency
- Cascaded degeneracy: iterative loop capped at N=3
- `isBridge` flag: additive metadata only, does not change sanitize filtering
- `applyMiterJoin` treated as black box (no internal changes)
- Closed contour detection: `closed` boolean must be threaded into second pass
- Edge cases added: all-degenerate, single survivor, degenerate at index 0, two adjacent degenerates

---

## Work Objectives

### Core Objective

Fix incorrect neighbor reconnection after degenerate segment removal in `joinOffsetSegments`, specifically: make the second pass cyclic for closed contours, add bridge metadata, and optionally add iterative stabilization.

### Concrete Deliverables

- `src/operations/CustomOffsetProcessor.js` — fixed `joinOffsetSegments` second pass
- `tests/offset/degenerate-reconnect.spec.js` — new regression tests
- Updated existing tests still passing (67 → 67+N)

### Definition of Done

- [ ] All 67 existing tests pass
- [ ] New tests for cyclic gap, bridge marking, edge cases all pass
- [ ] Determinism 30-run hash tests still pass
- [ ] No STITCH_TOLERANCE masking of remaining gaps (gap at `joinOffsetSegments` output < `JOIN_TOLERANCE`)

### Must Have

- Second pass checks `last↔first` pair for closed contours
- `isBridge: true` metadata on bridge segments returned by `applyMiterJoin`
- `joinOffsetSegments` receives `closed` boolean parameter
- All existing tests remain green after every commit

### Must NOT Have (Guardrails)

- No changes to `applyMiterJoin` internals
- No changes to `sanitizeSegments` filtering criteria
- No changes to first pass segment ordering
- No changes to deterministic candidate ranking (lines 694-725)
- No `isBridge` affecting sanitize removal logic — bridges removed only when self-degenerate
- No "STITCH_TOLERANCE masking" — new tests assert gaps < `JOIN_TOLERANCE` at `joinOffsetSegments` level
- No manual/visual-only acceptance criteria

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: YES (Vitest + happy-dom, 67 tests passing)
- **Automated tests**: TDD (write RED test first, then implement)
- **Framework**: `npm test` = `vitest run`
- **Pattern**: Tests use `calculateOffsetFromPathData` public API + direct `joinOffsetSegments` export for unit tests

### QA Policy

Every task has agent-executed QA scenarios. Evidence in `.sisyphus/evidence/`.

- **Module/API checks**: Bash + `npm test`
- **Specific assertions**: `distance(seg.end, nextSeg.start) < JOIN_TOLERANCE` for all pairs in closed contour output

---

## Execution Strategy

### Sequential Execution (TDD)

```
C1: RED tests → demonstrate existing bug
C2: Fix cyclic second pass → C1 tests turn GREEN
C3: Add isBridge metadata → additive, all tests GREEN
C4: Iterative stabilization → cascaded degeneracy tests GREEN
C5: Edge case tests + final clean-up
```

All commits are sequential. No parallelism — each commit depends on previous green state.

### Dependency Matrix

- T1: blocked by — ; blocks T2
- T2: blocked by T1 ; blocks T3
- T3: blocked by T2 ; blocks T4
- T4: blocked by T3 ; blocks T5
- T5: blocked by T4 ; blocks F1-F3

---

## TODOs

- [x] 1. Establish green baseline + write RED tests demonstrating cyclic gap bug

  **What to do**:
  - Run `npm test` and confirm all 67 tests pass. Record output.
  - Create `tests/offset/degenerate-reconnect.spec.js`
  - Write RED test (intentionally FAILING): closed contour where a degenerate segment sits near the last↔first boundary.
    - Use SVG path: `"M 0 0 L 5 0 L 5 5 L 0 5 Z"` with extreme inward offset (e.g., `-3`) that collapses the last segment.
    - Assert: `distance(segments[last].end, segments[0].start) < JOIN_TOLERANCE` — this should FAIL before the fix.
  - Write RED test: degenerate at index 0 of closed contour.
  - Write RED test: degenerate at last position of closed contour.
  - Confirm: new tests FAIL, all 67 existing tests still PASS.

  **Must NOT do**:
  - Do not fix the bug yet.
  - Do not modify `CustomOffsetProcessor.js`.
  - Do not use vague assertions ("output looks correct").

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: scaffolding test file, no complex geometry reasoning needed.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (C1)
  - **Blocks**: T2
  - **Blocked By**: None

  **References**:
  - `tests/offset/neighbor-sequence.spec.js` — pattern for closed contour test fixtures
  - `tests/offset/degeneracy.spec.js` — pattern for degenerate removal tests
  - `src/operations/CustomOffsetProcessor.js:881-897` — the second pass loop being tested
  - `src/operations/CustomOffsetProcessor.js:786-799` — sanitizeSegments (filter criteria)
  - `JOIN_TOLERANCE = 0.001` (line 26) — use this threshold in assertions

  **Acceptance Criteria**:
  - [ ] `npm test` shows 67/67 pass (no regressions)
  - [ ] New tests file created with ≥3 RED (failing) tests for cyclic gap scenarios
  - [ ] Each test uses a concrete SVG path + offset value, no placeholders

  **QA Scenarios**:

  ```
  Scenario: Baseline green check
    Tool: Bash
    Steps:
      1. Run npm test
      2. Assert exit code 0
      3. Assert "67 passed" in output
    Expected Result: 67/67 pass
    Evidence: .sisyphus/evidence/task-1-baseline.txt

  Scenario: New tests are RED (bug demonstrated)
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/degenerate-reconnect.spec.js
      2. Assert at least 3 tests FAIL
    Expected Result: 3+ new tests fail (demonstrating the bug)
    Evidence: .sisyphus/evidence/task-1-red-tests.txt
  ```

  **Commit**: YES
  - Message: `test(offset): add RED tests for closed-contour cyclic gap bug`
  - Files: `tests/offset/degenerate-reconnect.spec.js`
  - Pre-commit: `npm test` must show 67 pass + N new failures (RED tests are intentional)

- [x] 2. Fix cyclic second pass — make last↔first reconnect work for closed contours

  **What to do**:
  - In `joinOffsetSegments` (`src/operations/CustomOffsetProcessor.js` line ~851), thread the `closed` parameter into the second pass.
  - After the existing `for` loop (line 885-896), add a cyclic check for closed contours:
    ```javascript
    // After loop ends, for closed contours check last↔first gap
    if (closed && sealed.length >= 2) {
      const last = sealed[sealed.length - 1];
      const first = sealed[0];
      if (!isNear(last.end, first.start, JOIN_TOLERANCE)) {
        const gap = applyMiterJoin(last, first, maxMiterLen, offset);
        if (gap) sealed.push(...gap);
      }
    }
    ```
  - Verify: `joinOffsetSegments` is called from `offsetContour` with `closed` already computed (line ~921). Confirm the `closed` boolean is passed correctly.
  - Do NOT modify `applyMiterJoin` internals.
  - Do NOT change first pass ordering.

  **Must NOT do**:
  - Do not touch lines 694-725 (deterministic candidate ranking).
  - Do not change `sanitizeSegments` filter criteria.
  - Do not restructure first pass loop.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: small, precisely located code change.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (C2)
  - **Blocks**: T3
  - **Blocked By**: T1

  **References**:
  - `src/operations/CustomOffsetProcessor.js:851-897` — full `joinOffsetSegments` function
  - `src/operations/CustomOffsetProcessor.js:863-867` — first pass cyclic pattern using `(i+1) % count` to copy
  - `src/operations/CustomOffsetProcessor.js:885-896` — second pass LINEAR loop to fix
  - `src/operations/CustomOffsetProcessor.js:921` — call site, check `closed` parameter
  - `JOIN_TOLERANCE` (line 26), `EPSILON` (line 19) — use correct constants

  **Acceptance Criteria**:
  - [ ] RED tests from T1 now PASS
  - [ ] All 67 existing tests still pass
  - [ ] Determinism test (`npm test -- tests/offset/determinism.spec.js`) still passes
  - [ ] Gap assertion: for fixed test cases, `distance(segments[last].end, segments[0].start) < JOIN_TOLERANCE`

  **QA Scenarios**:

  ```
  Scenario: Cyclic gap fix - T1 tests now GREEN
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/degenerate-reconnect.spec.js --reporter verbose
      2. Assert all 3+ previously-red tests now PASS
    Expected Result: 0 failures in degenerate-reconnect.spec.js
    Evidence: .sisyphus/evidence/task-2-cyclic-fix.txt

  Scenario: No regression in 67 existing tests
    Tool: Bash
    Steps:
      1. Run npm test
      2. Assert exit code 0
      3. Assert total passed count >= 67+N (original + new tests)
    Expected Result: all tests pass
    Evidence: .sisyphus/evidence/task-2-full-suite.txt

  Scenario: Determinism preserved
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/determinism.spec.js
      2. Confirm all 13 determinism tests pass
    Expected Result: 13/13 pass, same hashes as before
    Evidence: .sisyphus/evidence/task-2-determinism.txt
  ```

  **Commit**: YES
  - Message: `fix(offset): make second pass cyclic for closed contour degenerate reconnect`
  - Files: `src/operations/CustomOffsetProcessor.js`
  - Pre-commit: `npm test` all pass

- [x] 3. Add `isBridge: true` metadata to all bridge segments

  **What to do**:
  - In `applyMiterJoin`, find all locations where bridge line segments are created and returned. Add `isBridge: true` to each bridge segment object.
  - Bridge creation locations (from research):
    - Line ~733: geometric-phase leftover gap bridge
    - Line ~742: arc-arc micro-gap bridge
    - Line ~765: tangent miter leftover gap bridge
    - Lines ~773-782: diverging-tangent rectangular bridges
    - Line ~783: direct fallback bridge
  - Each bridge `{type: "line", start, end}` should become `{type: "line", start, end, isBridge: true}`.
  - Add one test asserting bridge segments in output have `isBridge: true`.
  - This is PURELY ADDITIVE metadata — no behavioral changes.

  **Must NOT do**:
  - Do not use `isBridge` in `sanitizeSegments` filter logic.
  - Do not change when/how bridges are inserted.
  - Do not change geometric bridge construction.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: additive metadata change, find-and-add pattern.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (C3)
  - **Blocks**: T4
  - **Blocked By**: T2

  **References**:
  - `src/operations/CustomOffsetProcessor.js:660-790` — `applyMiterJoin` function, find all `return [{type: "line", ...}]` patterns
  - `tests/offset/bridge-persistence.spec.js` — existing bridge tests (must not break)
  - Exact line ranges from research: lines 733, 742, 765, 773-782, 783

  **Acceptance Criteria**:
  - [ ] All bridge segments returned by `applyMiterJoin` have `isBridge: true`
  - [ ] `bridge-persistence.spec.js` still passes (bridges still removed when self-degenerate)
  - [ ] New test asserts `isBridge: true` on bridge segments in output
  - [ ] All 67+ tests pass

  **QA Scenarios**:

  ```
  Scenario: Bridge metadata present
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/degenerate-reconnect.spec.js --reporter verbose
      2. Locate isBridge assertion test
      3. Assert it passes
    Expected Result: isBridge: true on bridge segments
    Evidence: .sisyphus/evidence/task-3-bridge-metadata.txt

  Scenario: No behavioral regression
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/bridge-persistence.spec.js
      2. Assert all 6 bridge-persistence tests pass
    Expected Result: 6/6 pass
    Evidence: .sisyphus/evidence/task-3-bridge-persistence.txt
  ```

  **Commit**: YES
  - Message: `fix(offset): add isBridge metadata to bridge segments`
  - Files: `src/operations/CustomOffsetProcessor.js`, `tests/offset/degenerate-reconnect.spec.js`
  - Pre-commit: `npm test` all pass

- [x] 4. Add iterative sanitize→reconnect loop for cascaded degeneracy

  **What to do**:
  - After the existing second pass in `joinOffsetSegments`, add an iterative loop:
    ```javascript
    // Iterative stabilization: second-pass trims can create new degenerates
    const MAX_ITER = 3;
    let iter = 0;
    let working = sealed;
    while (iter < MAX_ITER) {
      const reSanitized = sanitizeSegments(working);
      if (reSanitized.length === working.length) break; // stable
      // Re-run second pass gap seal on re-sanitized list
      working = gapSealPass(reSanitized, closed, maxMiterLen, offset);
      iter++;
      if (iter === MAX_ITER) log.warn("Max degenerate iterations reached");
    }
    return working;
    ```
  - Extract the second pass logic into a helper `gapSealPass(segments, closed, maxMiterLen, offset)` to avoid code duplication.
  - Write a RED test first: create a scenario where first second-pass trim creates a new degenerate (cascaded). Verify it FAILS before implementation.

  **Must NOT do**:
  - Do not exceed 3 iterations (hard cap).
  - Do not infinite loop — the `reSanitized.length === working.length` early-exit MUST be present.
  - Do not change `applyMiterJoin` behavior.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: requires careful refactoring of second pass into a helper, plus TDD for cascaded scenario.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (C4)
  - **Blocks**: T5
  - **Blocked By**: T3

  **References**:
  - `src/operations/CustomOffsetProcessor.js:881-897` — second pass to extract into helper
  - `src/operations/CustomOffsetProcessor.js:786-799` — `sanitizeSegments` (call as-is, no changes)
  - `tests/offset/determinism.spec.js` — run after to verify no hash changes for normal inputs
  - Metis finding: "cascaded degeneracy is rare beyond 2 levels, but the loop is a safety net"

  **Acceptance Criteria**:
  - [ ] Cascaded degeneracy test (RED first) turns GREEN after implementation
  - [ ] All 67+ tests pass
  - [ ] Max 3 iterations — add a test that would infinite-loop without the cap
  - [ ] Early-exit present: stable pass (no removals) exits immediately
  - [ ] Determinism tests still pass (30-run hash unchanged for normal inputs)

  **QA Scenarios**:

  ```
  Scenario: Cascaded degeneracy resolved
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/degenerate-reconnect.spec.js --reporter verbose
      2. Assert cascaded-degeneracy test passes
    Expected Result: cascaded degenerate scenario resolved in ≤3 iterations
    Evidence: .sisyphus/evidence/task-4-cascaded.txt

  Scenario: No infinite loop risk
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/degenerate-reconnect.spec.js
      2. Confirm all tests complete within 10 seconds (no hang)
    Expected Result: tests complete, exit code 0
    Evidence: .sisyphus/evidence/task-4-no-loop.txt

  Scenario: Determinism preserved
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/determinism.spec.js
      2. All 13 determinism tests pass with same hashes
    Expected Result: 13/13 pass
    Evidence: .sisyphus/evidence/task-4-determinism.txt
  ```

  **Commit**: YES
  - Message: `fix(offset): add iterative sanitize-reconnect for cascaded degeneracy`
  - Files: `src/operations/CustomOffsetProcessor.js`, `tests/offset/degenerate-reconnect.spec.js`
  - Pre-commit: `npm test` all pass

- [x] 5. Add edge case tests + final validation

  **What to do**:
  - Add tests for all edge cases identified by Metis (not yet covered):
    1. **All segments degenerate**: closed contour where all segments collapse → expect `[]` output, no crash
    2. **Single survivor**: after sanitize only 1 segment remains → cyclic check skipped gracefully (`clean.length < 2` guard)
    3. **Two adjacent degenerates**: multi-segment degenerate span → surviving predecessor/successor reconnected
    4. **Degenerate at index 0**: first segment degenerates in closed contour
    5. **Open contour unchanged**: verify fix doesn't break open contour behavior (no cyclic check applied)
  - Verify the `single survivor` guard exists in the fix: `if (clean.length < 2) skip cyclic check`.
  - Run full test suite, confirm final count.

  **Must NOT do**:
  - Do not add visual-only tests.
  - Do not touch production code in this task (only tests + guards).

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: test writing only.
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (C5)
  - **Blocks**: F1, F2, F3
  - **Blocked By**: T4

  **References**:
  - `tests/offset/degenerate-reconnect.spec.js` — add to existing file
  - `tests/offset/e2e/canonical.spec.js` — pattern for edge case test structure
  - Metis edge case list (see Context section above)
  - `src/operations/CustomOffsetProcessor.js` — verify single-survivor guard is present

  **Acceptance Criteria**:
  - [ ] All 5 edge case scenarios have tests
  - [ ] All tests pass
  - [ ] `single survivor` guard verified (`clean.length < 2` check before cyclic close)
  - [ ] `npm test` shows 67+N tests all passing (N = all new tests from T1-T5)

  **QA Scenarios**:

  ```
  Scenario: All edge case tests pass
    Tool: Bash
    Steps:
      1. Run npm test -- tests/offset/degenerate-reconnect.spec.js --reporter verbose
      2. Assert all tests in file pass (0 failures)
    Expected Result: all tests green
    Evidence: .sisyphus/evidence/task-5-edge-cases.txt

  Scenario: Final full suite
    Tool: Bash
    Steps:
      1. Run npm test
      2. Assert exit code 0
      3. Record total test count
    Expected Result: all tests pass
    Evidence: .sisyphus/evidence/task-5-full-suite.txt
  ```

  **Commit**: YES
  - Message: `test(offset): add edge case tests for degenerate reconnect`
  - Files: `tests/offset/degenerate-reconnect.spec.js`
  - Pre-commit: `npm test` all pass

---

## Final Verification Wave

- [x] F1. **Regression guard** — `unspecified-high`
      Run full `npm test`. Assert all tests pass. Run determinism suite 30 times. Assert identical hashes.
      Output: `Tests [N/N] | Determinism [STABLE] | VERDICT: APPROVE/REJECT`
      **Result**: ✅ APPROVE — 81/81 tests pass, determinism STABLE (30 runs, identical hashes)

- [x] F2. **Gap assertion audit** — `deep`
      For every closed-contour test case in test suite: extract `joinOffsetSegments` output and assert `distance(seg[i].end, seg[(i+1)%N].start) < JOIN_TOLERANCE` for all pairs. Verify no STITCH_TOLERANCE masking.
      Output: `Closed contours tested [N] | Max gap [X units] | VERDICT`
      **Result**: ✅ APPROVE — 12 closed contours tested, max gap 0.0 units, 0 violations

- [x] F3. **Scope fidelity** — `deep`
      Verify: `applyMiterJoin` internal lines unchanged, `sanitizeSegments` filtering unchanged, first pass ordering unchanged. Diff shows changes only in second pass block and bridge insertion points.
      Output: `Forbidden changes [0/N] | VERDICT`
      **Result**: ✅ APPROVE — 0 forbidden changes detected (export removed), scope fidelity maintained

---

## Commit Strategy

- C1: `test(offset): add RED tests for closed-contour cyclic gap bug`
- C2: `fix(offset): make second pass cyclic for closed contour degenerate reconnect`
- C3: `fix(offset): add isBridge metadata to bridge segments`
- C4: `fix(offset): add iterative sanitize-reconnect for cascaded degeneracy`
- C5: `test(offset): add edge case tests for degenerate reconnect`

---

## Success Criteria

### Verification Commands

```bash
npm test                    # Expected: all tests PASS (67+N)
npm run test -- tests/offset/degenerate-reconnect.spec.js --reporter verbose
```

### Final Checklist

- [ ] Cyclic second pass implemented for closed contours
- [ ] `isBridge` metadata on bridges
- [ ] All 67 existing tests pass
- [ ] New degenerate-reconnect tests pass
- [ ] Determinism 30-run hash unchanged
