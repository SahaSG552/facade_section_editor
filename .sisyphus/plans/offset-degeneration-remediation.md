# Offset Degeneration Remediation Plan (Open Contours)

## TL;DR

> **Quick Summary**: Fix inconsistency between interactive and input offset flows, correct degeneration reconnect behavior for open contours (extension-to-intersection with deterministic tie-break), prevent wrong endpoint elongation, and enforce bevel fallback when no valid forward intersection exists.
>
> **Deliverables**:
> - Deterministic TDD regression suite for the provided degeneration cases
> - Unified interactive/input preprocessing path for targeted offset cases
> - Correct open-contour reconnect rules and fallback behavior
> - No synthetic bridge insertion in targeted degeneration path
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 implementation waves + final verification wave
> **Critical Path**: T1 -> T6 -> T8 -> T10 -> T11 -> T14 -> F1-F4

---

## Context

### Original Request
Investigate and fix incorrect offset behavior for provided contours (11-16) in `OffsetTool`/`OffsetEngine`, specifically:
- interactive vs input inconsistency,
- wrong reconnect after arc/line degeneration,
- wrong endpoint elongation,
- no guessing, follow CLAUDE rules.

### Interview Summary
**Key Decisions**:
- Reconnect after middle-segment degeneration in open contour: **extend neighbors to intersection**.
- If multiple valid intersections: choose **nearest to neighboring endpoints**.
- If no valid forward extension intersection: use **short bevel join** between current endpoints.
- Automated tests strategy: **TDD**.

### Research Findings
- Both flows pass through `OffsetTool.buildOffsetCandidate()` -> `OffsetEngine.calculateOffsetFromPathData()` but options/preprocessing differ.
- Potential divergence points: sign resolution mode, precision/rounding mismatch, and non-unified degeneration/stitch thresholds.
- Existing open-contour direct-connector logic can be overridden later by stitching/collapse-guide paths.

### Metis Review (Applied)
- Lock scope to open-contour degeneration path + parity; avoid global engine refactor.
- Add deterministic tie-break definition.
- Explicit acceptance criteria for parity and no synthetic bridge insertion.

### Operational Defaults (Auto-Resolved)
- **Valid forward intersection**: intersection is valid only if it lies on forward extensions of both neighboring segments (non-negative extension parameters with epsilon tolerance).
- **Nearest-endpoint ranking metric**: minimize sum of extension distances from both neighboring endpoints.
- **Secondary tie-break**: if equal within epsilon, minimize max extension distance; if still equal, use deterministic lexical coordinate order.
- **Parity definition**: targeted interactive/input outputs must be identical in serialized path data and segment topology for fixture set.
- **Scope lock**: closed-contour behavior is non-target, protected by non-regression tests.

---

## Work Objectives

### Core Objective
Make open-contour degeneration behavior deterministic and correct for the reported case while preserving existing closed-contour behavior.

### Concrete Deliverables
- Updated degeneration reconnect logic in offset pipeline (targeted scope)
- Parity behavior between interactive and numeric-input flows for target fixtures
- Regression tests covering arc/line degeneration and fallback

### Definition of Done
- [ ] `npm run test -- tests/offset` passes with new regressions included
- [ ] Target fixtures produce stable, deterministic output across repeated runs
- [ ] Interactive and input flows are parity-equal for target cases

### Must Have
- Open-contour degeneration reconnect via extension-to-intersection
- Deterministic candidate selection and tie-break
- Bevel fallback when no valid forward intersection exists
- No unintended endpoint elongation in target cases

### Must NOT Have (Guardrails)
- No global rewrite of offset engine
- No behavior change to closed-contour topology unless required by failing tests
- No synthetic bridge insertion for the targeted open-contour degeneration reconnect case
- No non-test-backed geometry changes

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - all verification must be agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: TDD
- **Framework**: Vitest (`npm run test`)
- **Mode**: RED -> GREEN -> REFACTOR for each affected behavior slice

### QA Policy
- Every task includes at least:
  - 1 happy-path scenario
  - 1 failure/edge scenario
- Evidence path format:
  - `.sisyphus/evidence/task-{N}-{scenario}.txt`
  - `.sisyphus/evidence/task-{N}-{scenario}.json`

---

## Execution Strategy

### Parallel Execution Waves

```text
Wave 1 (Test scaffolding & reproducibility)
T1, T2, T3, T4, T5

Wave 2 (Flow unification + selection core)
T6, T7, T9, T12, T13

Wave 3 (Degeneration reconnect behavior)
T8, T10, T11

Wave 4 (Regression hardening)
T14, T15

Wave FINAL (Parallel verification)
F1, F2, F3, F4
```

### Dependency Matrix
- T1: - -> T6, T8
- T2: - -> T7, T8
- T3: - -> T9, T11
- T4: - -> T14
- T5: - -> T7, T14
- T6: T1 -> T8, T12
- T7: T2, T5 -> T8, T9
- T8: T1, T2, T6, T7 -> T10, T11
- T9: T3, T7 -> T11, T15
- T10: T8 -> T14
- T11: T3, T8, T9 -> T14
- T12: T6 -> T15
- T13: T6 -> T15
- T14: T4, T5, T10, T11 -> FINAL
- T15: T9, T12, T13 -> FINAL

### Agent Dispatch Summary
- Wave 1: T1 `quick`, T2 `quick`, T3 `quick`, T4 `unspecified-high`, T5 `quick`
- Wave 2: T6 `deep`, T7 `deep`, T9 `unspecified-high`, T12 `unspecified-high`, T13 `quick`
- Wave 3: T8 `deep`, T10 `unspecified-high`, T11 `deep`
- Wave 4: T14 `unspecified-high`, T15 `quick`
- FINAL: F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

---

- [ ] 1. Build canonical failing fixture from provided contour progression

  **What to do**:
  - Create a minimal reproducible fixture derived from contours 11-16 (open contour, arc degeneration, short-line degeneration).
  - Encode fixture as stable test input usable by both interactive-style and input-style test paths.

  **Must NOT do**:
  - Do not simplify away the degeneration points.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6, 8
  - **Blocked By**: None

  **References**:
  - `src/editor/tools/OffsetTool.js` - input/interactive source behavior
  - `tests/offset-open-line-arc-bridge-regression.spec.js` - regression test style

  **Acceptance Criteria**:
  - [ ] Fixture file added and consumed in at least one failing regression test.

  **QA Scenarios**:
  ```
  Scenario: fixture reproduces wrong reconnect behavior
    Tool: Bash (npm run test)
    Preconditions: new fixture and failing test added
    Steps:
      1. Run npm run test -- tests/offset
      2. Verify targeted test fails in expected assertion
    Expected Result: deterministic failure for baseline bug
    Evidence: .sisyphus/evidence/task-1-failing-fixture.txt

  Scenario: fixture remains stable across repeated reads
    Tool: Bash (npm run test)
    Preconditions: fixture loaded by helper
    Steps:
      1. Run the same test twice
      2. Compare serialized fixture hash/summary in logs
    Expected Result: same fixture payload both runs
    Evidence: .sisyphus/evidence/task-1-fixture-stability.txt
  ```

- [ ] 2. Add parity regression test (interactive-style vs input-style)

  **What to do**:
  - Add failing test verifying both flows produce identical serialized output for target fixture and distance.

  **Must NOT do**:
  - Do not relax to visual-only equality.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7, 8
  - **Blocked By**: None

  **References**:
  - `src/editor/tools/OffsetTool.js` - `_distanceFromPointer`, `_parseInput`, `_resolveContourEngineDistance`
  - `tests/offset-cursor-side.spec.js` - parity/assertion patterns

  **Acceptance Criteria**:
  - [ ] Test fails before fix and asserts strict serialized equality requirement for targeted cases.

  **QA Scenarios**:
  ```
  Scenario: parity regression is red before code fix
    Tool: Bash (npm run test)
    Steps:
      1. Run npm run test -- tests/offset-cursor-side.spec.js
      2. Confirm new parity test fails with mismatch diff
    Expected Result: failure proves current inconsistency
    Evidence: .sisyphus/evidence/task-2-parity-red.txt

  Scenario: deterministic mismatch output
    Tool: Bash (npm run test)
    Steps:
      1. Re-run the same spec
      2. Confirm mismatch fields are identical
    Expected Result: deterministic failing snapshot/diff
    Evidence: .sisyphus/evidence/task-2-parity-deterministic.txt
  ```

- [ ] 3. Add reconnect semantics tests (extension intersection + tie-break)

  **What to do**:
  - Add failing tests for open contour degeneration reconnect:
    - extension-to-intersection required,
    - nearest-endpoints tie-break,
    - no synthetic bridge insertion.

  **Must NOT do**:
  - Do not encode permissive behavior that allows bridge when valid forward intersection exists.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 9, 11
  - **Blocked By**: None

  **References**:
  - `src/operations/OffsetContourBuilder.js` - join decision and dropped-gap handling
  - `src/operations/OffsetEngine.js` - stitch stage behavior

  **Acceptance Criteria**:
  - [ ] New tests fail before fix and explicitly detect wrong reconnect point / bridge insertion.

  **QA Scenarios**:
  ```
  Scenario: nearest-endpoint tie-break currently violated
    Tool: Bash (npm run test)
    Steps:
      1. Run npm run test -- tests/offset
      2. Observe failure on tie-break assertion
    Expected Result: failing assertion for wrong chosen intersection
    Evidence: .sisyphus/evidence/task-3-tiebreak-red.txt

  Scenario: synthetic bridge detection
    Tool: Bash (npm run test)
    Steps:
      1. Execute reconnect test case
      2. Assert extra bridge segment count > expected
    Expected Result: red test confirms bridge bug
    Evidence: .sisyphus/evidence/task-3-bridge-red.txt
  ```

- [ ] 4. Add bevel fallback tests for no-valid-forward-intersection

  **What to do**:
  - Add failing tests proving fallback must be short bevel between current endpoints when forward intersection is invalid/unavailable.

  **Must NOT do**:
  - Do not allow fallback to dropping neighbor silently.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 14
  - **Blocked By**: None

  **References**:
  - `src/operations/OffsetContourBuilder.js` - reconnect fallback branches
  - `tests/offset-open-line-arc-bridge-regression.spec.js` - edge-case style

  **Acceptance Criteria**:
  - [ ] Test suite includes no-forward-intersection scenario with expected bevel output contract.

  **QA Scenarios**:
  ```
  Scenario: no-forward-intersection case is red before fallback fix
    Tool: Bash (npm run test)
    Steps:
      1. Run targeted bevel fallback spec
      2. Confirm expected bevel assertion fails
    Expected Result: baseline failing behavior captured
    Evidence: .sisyphus/evidence/task-4-bevel-red.txt

  Scenario: fallback does not create self-intersection in fixture
    Tool: Bash (npm run test)
    Steps:
      1. Execute fallback fixture case
      2. Assert no self-intersection invariant
    Expected Result: currently failing invariant (before fix)
    Evidence: .sisyphus/evidence/task-4-selfint-red.txt
  ```

- [ ] 5. Add deterministic output tests across repeated runs

  **What to do**:
  - Add tests ensuring string-stable output for ambiguous candidate situations.

  **Must NOT do**:
  - Do not use unstable random ordering or floating-sort without tie-break.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7, 14
  - **Blocked By**: None

  **References**:
  - `src/operations/OffsetContourBuilder.js` - candidate ranking decisions
  - `tests/offset-invariants.spec.js` - invariant style

  **Acceptance Criteria**:
  - [ ] Repeated-run determinism test added and initially fails (or proves pre-fix instability).

  **QA Scenarios**:
  ```
  Scenario: repeated runs produce unstable output before tie-break fix
    Tool: Bash (npm run test)
    Steps:
      1. Run determinism spec in loop (within test)
      2. Compare serialized outputs
    Expected Result: instability detected pre-fix
    Evidence: .sisyphus/evidence/task-5-determinism-red.txt

  Scenario: deterministic comparator integrity
    Tool: Bash (npm run test)
    Steps:
      1. Execute comparator helper unit tests
      2. Verify anti-symmetry/transitivity checks
    Expected Result: comparator helper behavior explicit
    Evidence: .sisyphus/evidence/task-5-comparator.txt
  ```

- [ ] 6. Unify normalization path between interactive and input flows

  **What to do**:
  - Ensure both flows use a single normalization/resolution sequence before engine call for target open-contour cases.
  - Remove branch divergence that causes parity mismatch (sign mode/options preprocessing).

  **Must NOT do**:
  - Do not change closed-contour semantics unless tests require it.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 8, 12, 13
  - **Blocked By**: 1

  **References**:
  - `src/editor/tools/OffsetTool.js` - `buildOffsetCandidate`, `_resolveContourEngineDistance`, `_distanceFromPointer`, `_parseInput`
  - `src/operations/OffsetEngine.js` - `_processPathSync`, `_resolveCursorSideDistance`

  **Acceptance Criteria**:
  - [ ] Task 2 parity test turns GREEN without bypassing reconnect rules.

  **QA Scenarios**:
  ```
  Scenario: parity test turns green after normalization unification
    Tool: Bash (npm run test)
    Steps:
      1. Run npm run test -- tests/offset-cursor-side.spec.js
      2. Confirm parity assertion passes
    Expected Result: serialized outputs identical for target fixture
    Evidence: .sisyphus/evidence/task-6-parity-green.txt

  Scenario: non-target behavior unaffected sanity
    Tool: Bash (npm run test)
    Steps:
      1. Run npm run test -- tests/offset
      2. Check unrelated baseline specs still pass
    Expected Result: no broad regressions from normalization change
    Evidence: .sisyphus/evidence/task-6-sanity.txt
  ```

- [ ] 7. Implement deterministic intersection candidate ranking

  **What to do**:
  - Implement nearest-to-endpoints primary rank for valid forward intersections.
  - Add deterministic secondary tie-break to ensure stable results.

  **Must NOT do**:
  - Do not rely on iteration order of floating candidates.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 8, 9
  - **Blocked By**: 2, 5

  **References**:
  - `src/operations/OffsetContourBuilder.js` - join candidate evaluation paths

  **Acceptance Criteria**:
  - [ ] Task 3 tie-break tests and Task 5 determinism tests are GREEN.

  **QA Scenarios**:
  ```
  Scenario: nearest-endpoint tie-break passes
    Tool: Bash (npm run test)
    Steps:
      1. Run targeted tie-break spec
      2. Assert selected intersection id/coordinates
    Expected Result: nearest-endpoints candidate selected
    Evidence: .sisyphus/evidence/task-7-tiebreak-green.txt

  Scenario: repeated-run stability after deterministic ranking
    Tool: Bash (npm run test)
    Steps:
      1. Run determinism spec repeatedly
      2. Confirm identical outputs every run
    Expected Result: string-stable outputs
    Evidence: .sisyphus/evidence/task-7-determinism-green.txt
  ```

- [ ] 8. Implement open-contour degeneration reconnect: extension-to-intersection

  **What to do**:
  - Apply reconnect rule when middle segment degenerates in open contour:
    - extend neighboring segments to valid forward intersection,
    - use ranking from Task 7.

  **Must NOT do**:
  - Do not insert synthetic bridge when valid forward intersection exists.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 10, 11
  - **Blocked By**: 1, 2, 6, 7

  **References**:
  - `src/operations/OffsetContourBuilder.js` - dropped-arc/open reconnect branches
  - `src/operations/OffsetEngine.js` - post-build stitch interactions

  **Acceptance Criteria**:
  - [ ] Reconnect semantics tests (Task 3) turn GREEN.

  **QA Scenarios**:
  ```
  Scenario: valid forward intersection reconnects without bridge
    Tool: Bash (npm run test)
    Steps:
      1. Run reconnect spec
      2. Assert no extra bridge segment in output
      3. Assert neighbor endpoints meet at selected intersection
    Expected Result: direct extension reconnect behavior
    Evidence: .sisyphus/evidence/task-8-reconnect-green.txt

  Scenario: pre-existing finite crossing does not override chosen extension rule
    Tool: Bash (npm run test)
    Steps:
      1. Execute fixture containing already-crossing neighbors
      2. Assert chosen join is the rule-compliant extension intersection
    Expected Result: expected intersection chosen, no topology artifact
    Evidence: .sisyphus/evidence/task-8-crossing-case.txt
  ```

- [ ] 9. Restrict bridge reintroduction in targeted open degeneration path

  **What to do**:
  - Ensure later stitching stages do not add synthetic bridge for already-resolved targeted reconnect.

  **Must NOT do**:
  - Do not disable stitching globally.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 11, 15
  - **Blocked By**: 3, 7

  **References**:
  - `src/operations/OffsetEngine.js` - `_stitchSegments`
  - `src/operations/OffsetContourBuilder.js` - metadata/flags from reconnect phase

  **Acceptance Criteria**:
  - [ ] No-bridge assertions in Task 3 and Task 14 pass.

  **QA Scenarios**:
  ```
  Scenario: stitch stage preserves reconnect without adding bridge
    Tool: Bash (npm run test)
    Steps:
      1. Run targeted reconnect+stitch spec
      2. Inspect segment count and types
    Expected Result: no synthetic bridge segment
    Evidence: .sisyphus/evidence/task-9-stitch-guard.txt

  Scenario: micro-gap unrelated cases still stitch correctly
    Tool: Bash (npm run test)
    Steps:
      1. Run existing stitch-related specs
      2. Confirm behavior unchanged outside scope
    Expected Result: baseline stitching unaffected
    Evidence: .sisyphus/evidence/task-9-nonreg.txt
  ```

- [ ] 10. Implement bevel fallback for no valid forward intersection

  **What to do**:
  - When forward extension intersection is invalid/unavailable, produce short bevel join between current endpoints.

  **Must NOT do**:
  - Do not drop neighbor segment silently.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 14
  - **Blocked By**: 8

  **References**:
  - `src/operations/OffsetContourBuilder.js` - fallback branch point

  **Acceptance Criteria**:
  - [ ] Task 4 bevel fallback tests are GREEN.

  **QA Scenarios**:
  ```
  Scenario: no-forward-intersection uses bevel fallback
    Tool: Bash (npm run test)
    Steps:
      1. Run fallback spec
      2. Assert output contains single bevel join contract
    Expected Result: bevel fallback selected
    Evidence: .sisyphus/evidence/task-10-bevel-green.txt

  Scenario: bevel output remains valid geometry
    Tool: Bash (npm run test)
    Steps:
      1. Run topology invariant check on fallback case
      2. Assert no invalid self-intersection in fixture
    Expected Result: valid output path
    Evidence: .sisyphus/evidence/task-10-topology.txt
  ```

- [ ] 11. Constrain endpoint elongation in open contour collapse path

  **What to do**:
  - Limit endpoint extension side effects in collapse/stitch transitions for targeted open-degeneration path.

  **Must NOT do**:
  - Do not remove useful collapse behavior for unrelated cases.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 14
  - **Blocked By**: 3, 8, 9

  **References**:
  - `src/operations/OffsetEngine.js` - `_buildOpenOffsetMonotonic` / collapse guide
  - `src/operations/OffsetContourBuilder.js` - endpoint mutation helpers

  **Acceptance Criteria**:
  - [ ] Endpoint elongation regression for target fixture is GREEN.

  **QA Scenarios**:
  ```
  Scenario: endpoint elongation regression eliminated
    Tool: Bash (npm run test)
    Steps:
      1. Run target fixture spec
      2. Compare start/end against expected bounds
    Expected Result: no unexpected extension
    Evidence: .sisyphus/evidence/task-11-endpoints-green.txt

  Scenario: open contour still resolves collapse transitions
    Tool: Bash (npm run test)
    Steps:
      1. Execute nearby collapse-distance cases
      2. Assert output remains connected per rule
    Expected Result: no disconnected artifacts
    Evidence: .sisyphus/evidence/task-11-collapse-range.txt
  ```

- [ ] 12. Guard closed-contour behavior (non-regression)

  **What to do**:
  - Add/adjust tests proving closed-contour bridge/topology behavior remains stable.

  **Must NOT do**:
  - Do not silently change closed contour semantics.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 15
  - **Blocked By**: 6

  **References**:
  - Existing closed-contour offset regression specs in `tests/offset`

  **Acceptance Criteria**:
  - [ ] Closed-contour regression set passes unchanged expectations.

  **QA Scenarios**:
  ```
  Scenario: closed contour bridge behavior unaffected
    Tool: Bash (npm run test)
    Steps:
      1. Run closed-contour related specs
      2. Confirm no expectation drift
    Expected Result: all green
    Evidence: .sisyphus/evidence/task-12-closed-nonreg.txt

  Scenario: targeted open fix does not leak into closed mode
    Tool: Bash (npm run test)
    Steps:
      1. Execute mixed open/closed suite
      2. Compare before/after summary
    Expected Result: only targeted open cases changed
    Evidence: .sisyphus/evidence/task-12-scope-guard.txt
  ```

- [ ] 13. Align local precision/tolerance usage in targeted path

  **What to do**:
  - Harmonize precision/tolerance usage for targeted normalization/reconnect path to avoid branch flips from rounding drift.

  **Must NOT do**:
  - Do not globally retune all engine tolerances.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 15
  - **Blocked By**: 6

  **References**:
  - `src/editor/tools/OffsetTool.js` - formatting/rounding points
  - `src/operations/OffsetEngine.js`, `src/operations/OffsetRules.js` - threshold usage

  **Acceptance Criteria**:
  - [ ] Target parity/reconnect tests remain stable under repeated execution.

  **QA Scenarios**:
  ```
  Scenario: precision harmonization removes branch flip instability
    Tool: Bash (npm run test)
    Steps:
      1. Run target specs multiple times
      2. Check identical pass outputs
    Expected Result: stable branch outcomes
    Evidence: .sisyphus/evidence/task-13-precision-stability.txt

  Scenario: no broad numerical drift
    Tool: Bash (npm run test)
    Steps:
      1. Run full offset suite
      2. Confirm no unrelated tolerance regressions
    Expected Result: unchanged non-target behavior
    Evidence: .sisyphus/evidence/task-13-suite-check.txt
  ```

- [ ] 14. Green the full targeted regression pack

  **What to do**:
  - Run and green all newly added targeted tests (parity, reconnect, tie-break, bevel fallback, endpoint elongation).

  **Must NOT do**:
  - Do not weaken assertions to force pass.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: FINAL
  - **Blocked By**: 4, 5, 10, 11

  **References**:
  - Newly added regression specs under `tests/offset`

  **Acceptance Criteria**:
  - [ ] All targeted specs pass locally in one command invocation.

  **QA Scenarios**:
  ```
  Scenario: full targeted regression pack passes
    Tool: Bash (npm run test)
    Steps:
      1. Run npm run test -- tests/offset
      2. Verify all new targeted specs are green
    Expected Result: full pass
    Evidence: .sisyphus/evidence/task-14-target-pack.txt

  Scenario: deterministic pass across reruns
    Tool: Bash (npm run test)
    Steps:
      1. Re-run same command
      2. Confirm identical pass outcomes
    Expected Result: deterministic green state
    Evidence: .sisyphus/evidence/task-14-target-pack-rerun.txt
  ```

- [ ] 15. Run broad offset suite and summarize deltas

  **What to do**:
  - Execute broader offset test suite and produce concise change-impact summary.

  **Must NOT do**:
  - Do not leave unexplained failures.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `vitest`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: FINAL
  - **Blocked By**: 9, 12, 13

  **References**:
  - `tests/offset`

  **Acceptance Criteria**:
  - [ ] Broad suite passes or all failures are documented with root cause and resolution tasks.

  **QA Scenarios**:
  ```
  Scenario: broad suite health check
    Tool: Bash (npm run test)
    Steps:
      1. Run npm run test -- tests/offset
      2. Capture summary of pass/fail by file
    Expected Result: green or fully explained failures
    Evidence: .sisyphus/evidence/task-15-broad-suite.txt

  Scenario: scope-fidelity delta summary
    Tool: Bash
    Steps:
      1. Compare changed tests/files to planned scope
      2. Record any unexpected delta
    Expected Result: no scope creep
    Evidence: .sisyphus/evidence/task-15-scope-delta.txt
  ```

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Validate all Must Have / Must NOT Have against diff + evidence files.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run type/lint/tests; detect slop and unsafe shortcuts.

- [ ] F3. **Real QA Execution** — `unspecified-high`
  Execute all task QA scenarios and collect evidence under `.sisyphus/evidence/final-qa/`.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify no scope creep; only targeted files/logic changed.

---

## Commit Strategy

1. `test(offset): add parity regression fixtures for interactive vs input degeneration cases`
2. `test(offset): add open-contour degeneration reconnect and bevel fallback regressions`
3. `fix(offset): unify interactive/input normalization and deterministic intersection ranking`
4. `fix(offset): apply open-contour reconnect extension and suppress synthetic bridge reintroduction`
5. `fix(offset): constrain endpoint elongation and align local tolerances for targeted path`
6. `test(offset): add closed-contour non-regression coverage and deterministic output checks`

---

## Success Criteria

### Verification Commands
```bash
npm run test -- tests/offset
```

### Final Checklist
- [ ] Interactive and input offsets are parity-equal on target fixtures
- [ ] Degenerated middle segment reconnects by extension-to-intersection (deterministic)
- [ ] No-valid-intersection path uses short bevel fallback
- [ ] No synthetic bridge insertion in targeted open degeneration path
- [ ] Endpoint elongation regression is fixed
- [ ] Closed contour behavior remains regression-safe
