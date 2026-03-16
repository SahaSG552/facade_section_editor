# OffsetProcessor / OffsetTool Correctness-First Hardening Plan

## TL;DR

> **Quick Summary**: Incrementally harden `CustomOffsetProcessor` and `OffsetTool` toward maximum geometric correctness for mixed line+arc offsets, while preserving your strict invariants (no arc angle expansion, fixed arc center, deterministic neighbor reconciliation, bridge persistence, and one-way degeneracy removal).
>
> **Deliverables**:
> - Stable and deterministic offset/join behavior for critical arc/line edge cases
> - Completed micro-gap hardening for arc-arc joins
> - Automated regression suite for processor/tool invariants (tests-after)
> - Agent-executed QA evidence for all critical scenarios
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 execution waves + final verification wave
> **Critical Path**: T1 → T2 → T5 → T9 → T11 → T15

---

## Context

### Original Request
Refactor `OffsetProcessor` logic deeply, validate against explicit geometry rules, research best public approaches, and adapt implementation toward better correctness and precision.

### Interview Summary
**Key Decisions**:
- Priority: **Correctness-first** (visual differences acceptable if mathematically better)
- Refactor mode: **Staged hardening** (incremental), not full rewrite
- Test strategy: **YES (Tests-after)**

**Research Findings (Codebase)**:
- Current flow mostly implements required rules, but has fragility in tolerance consistency, sign/coordinate conversions, and join mutation-order sensitivity.
- No dedicated automated tests for `CustomOffsetProcessor`/`OffsetTool`.

**Research Findings (External)**:
- Best fit: arc-native pipeline patterns (CavalierContours-like), strengthened with robust predicate/tolerance policies and deterministic intersection ranking.
- Clipper/CGAL are valuable references but not directly arc-native in core usage patterns.

### Metis Review
**Main Gaps Addressed in this plan**:
- Lock scope to staged hardening (no full algorithm rewrite)
- Add explicit guardrails against scope creep
- Make tolerance policy explicit and auditable
- Add end-to-end and edge-case verification against your six strict rules

---

## Work Objectives

### Core Objective
Deliver a correctness-first, production-stable offset pipeline for line+arc contours in `CustomOffsetProcessor` and `OffsetTool`, with deterministic join behavior and verified handling of degeneracy/bridges.

### Concrete Deliverables
- Hardened join/intersection/degeneracy logic in `src/operations/CustomOffsetProcessor.js`
- Hardened orchestration/sign-convention handling in `src/editor/tools/OffsetTool.js` (only where needed for correctness boundaries)
- Automated tests for core invariants and critical regressions
- Evidence package in `.sisyphus/evidence/`

### Definition of Done
- [ ] All plan tasks completed with evidence artifacts
- [ ] All critical geometry rules have automated regression tests
- [ ] Determinism checks pass on repeated runs
- [ ] Final verification wave (F1-F4) all APPROVE

### Must Have
- No arc-angle expansion during joining/trimming
- Arc center consistency for arc offsets
- Degenerate segments removed without reversal
- Bridge segments handled as first-class segments until self-degenerate
- Sequential neighbor reconciliation preserved

### Must NOT Have (Guardrails)
- No full engine rewrite to a different architecture in this plan
- No addition of global optimization replacing local neighbor reconciliation
- No reversal fallback for degenerate line/arc segments
- No manual-only acceptance criteria
- No touching unrelated BREP modules except references/tests

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — verification must be agent-executed.

### Test Decision
- **Infrastructure exists**: PARTIAL (existing tests in `brep_reference`, not in target modules)
- **Automated tests**: Tests-after
- **Framework target**: Vitest (+ happy-dom/jsdom as needed)

### QA Policy
Every task includes agent-executed QA scenarios with explicit evidence path.

- **Frontend/UI checks**: Playwright where preview behavior must be validated in UI
- **Module/API checks**: Bash + test commands (`vitest`, `node`, project scripts)
- **Evidence path convention**: `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation + test scaffolding):
- T1, T2, T3, T4, T5

Wave 2 (Rule-level tests in parallel):
- T6, T7, T8, T9, T10

Wave 3 (Core hardening implementations):
- T11, T12, T13, T14

Wave 4 (Regression + determinism + packaging):
- T15, T16, T17

Wave FINAL (Independent parallel review):
- F1, F2, F3, F4

### Dependency Matrix (FULL)
- T1: blocked by — ; blocks T11
- T2: blocked by — ; blocks T11, T12, T13, T15
- T3: blocked by — ; blocks T11, T12
- T4: blocked by — ; blocks T7, T8, T9, T11
- T5: blocked by — ; blocks T6, T7, T8, T9, T10, T15, T16
- T6: blocked by T5 ; blocks T11
- T7: blocked by T4, T5 ; blocks T11
- T8: blocked by T4, T5 ; blocks T12
- T9: blocked by T4, T5 ; blocks T11, T12
- T10: blocked by T5 ; blocks T13
- T11: blocked by T1, T2, T3, T4, T6, T7, T9 ; blocks T15, T16
- T12: blocked by T2, T3, T8, T9 ; blocks T15
- T13: blocked by T2, T5, T10 ; blocks T15
- T14: blocked by T1 ; blocks T15
- T15: blocked by T2, T5, T11, T12, T13, T14 ; blocks T17, F1-F4
- T16: blocked by T5, T11 ; blocks F2
- T17: blocked by T15 ; blocks F1

### Agent Dispatch Summary
- **Wave 1**: T1 quick, T2 quick, T3 unspecified-high, T4 deep, T5 quick
- **Wave 2**: T6 quick, T7 deep, T8 deep, T9 unspecified-high, T10 unspecified-high
- **Wave 3**: T11 deep, T12 deep, T13 unspecified-high, T14 quick
- **Wave 4**: T15 deep, T16 unspecified-high, T17 writing
- **Final**: F1 oracle, F2 unspecified-high, F3 unspecified-high(+playwright if UI), F4 deep

---

## TODOs

- [ ] 1. Audit current implementation vs 6 strict rules

  **What to do**:
  - Produce rule-by-rule matrix for `CustomOffsetProcessor` + `OffsetTool` with code references.
  - Confirm where current logic already satisfies requirements and where behavior is partial.

  **Must NOT do**:
  - Do not change behavior in this task.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: cross-function reasoning over geometry invariants.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `threejs-mastery`: unrelated to 2D offset processor.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T11, T14
  - **Blocked By**: None

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - core offset/join/degeneracy behavior.
  - `src/editor/tools/OffsetTool.js` - sign/orchestration and preview integration.
  - `.sisyphus/drafts/offset-processor-refactor.md` - captured user constraints.

  **Acceptance Criteria**:
  - [ ] Matrix file/section added to plan notes with all 6 rules tagged Implemented/Partial/Missing.
  - [ ] Each rule links to concrete function/section evidence.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Rule evidence completeness
    Tool: Bash
    Preconditions: Repository available
    Steps:
      1. Extract rule matrix artifact from planning notes.
      2. Verify all 6 rules have at least one code reference.
      3. Verify no rule marked "implemented" without evidence.
    Expected Result: 6/6 rules covered with evidence.
    Failure Indicators: Missing rule, missing reference, unsupported claim.
    Evidence: .sisyphus/evidence/task-1-rule-matrix.txt

  Scenario: Contradiction detection
    Tool: Bash
    Preconditions: Same artifact available
    Steps:
      1. Compare rule tags against known fragility list.
      2. Check any "implemented"+"fragile" areas are flagged partial where appropriate.
    Expected Result: No hidden contradictions in rule table.
    Evidence: .sisyphus/evidence/task-1-contradiction-check.txt
  ```

  **Commit**: NO

- [ ] 2. Formalize tolerance model and numeric guardrails

  **What to do**:
  - Define named tolerance constants and usage policy (intersection, join closeness, stitch).
  - Map each tolerance to specific operation class.

  **Must NOT do**:
  - Do not alter algorithm flow yet.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `modern-javascript-patterns`: not required for planning policy.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T11, T12, T13, T15
  - **Blocked By**: None

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - current EPSILON/magic thresholds.
  - External: CavalierContours tolerance notes and robust predicate guidance.

  **Acceptance Criteria**:
  - [ ] Tolerance policy table exists (name, value/strategy, scope).
  - [ ] All current magic numeric thresholds mapped to policy.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Tolerance table completeness
    Tool: Bash
    Preconditions: Policy table generated
    Steps:
      1. Verify constants for geometry epsilon, join tolerance, stitch tolerance exist.
      2. Verify each has operation scope and rationale.
    Expected Result: 3/3 tolerance classes documented.
    Evidence: .sisyphus/evidence/task-2-tolerance-table.txt

  Scenario: Ambiguity guard
    Tool: Bash
    Preconditions: Policy table generated
    Steps:
      1. Check no tolerance is reused across unrelated operations without note.
      2. Validate precedence rules for conflicting thresholds.
    Expected Result: Deterministic tolerance selection rules.
    Evidence: .sisyphus/evidence/task-2-tolerance-guard.txt
  ```

  **Commit**: NO

- [ ] 3. Lock coordinate/sign convention contract

  **What to do**:
  - Document end-to-end sign and axis conversion contract between `OffsetTool` and processor.
  - Define invariant checks for offset direction, arc sweep, and Y inversion boundaries.

  **Must NOT do**:
  - Do not introduce new conversion paths in this task.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T11, T12
  - **Blocked By**: None

  **References**:
  - `src/editor/tools/OffsetTool.js` - contour serialization/parsing.
  - `src/operations/CustomOffsetProcessor.js` - `offsetDistance = -offset` semantics.

  **Acceptance Criteria**:
  - [ ] Contract includes editor-space vs SVG-space mapping and offset sign truth table.
  - [ ] At least 3 invariant assertions defined for regression tests.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Sign truth-table validation
    Tool: Bash
    Preconditions: Contract artifact prepared
    Steps:
      1. Validate mapping for positive/negative offset with clockwise/counterclockwise contour.
      2. Validate expected outward/inward side labels.
    Expected Result: No ambiguous sign branch remains.
    Evidence: .sisyphus/evidence/task-3-sign-table.txt

  Scenario: Axis inversion guard
    Tool: Bash
    Preconditions: Contract artifact prepared
    Steps:
      1. Verify exactly one inversion boundary from editor Y to SVG Y and back.
      2. Verify no double inversion paths documented.
    Expected Result: Single well-defined inversion boundary.
    Evidence: .sisyphus/evidence/task-3-axis-guard.txt
  ```

  **Commit**: NO

- [ ] 4. Define deterministic intersection ranking policy

  **What to do**:
  - Specify tie-break and ranking policy for multiple candidate intersections (line-line, line-arc, arc-arc).
  - Include fallback path order: geometric intersection → tangent miter → bridge.

  **Must NOT do**:
  - Do not change code in this task.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T7, T8, T9, T11
  - **Blocked By**: None

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - `applyMiterJoin` candidate selection.
  - External: arc-native offset ranking practices (closest-to-source and no-angle-expansion constraints).

  **Acceptance Criteria**:
  - [ ] Ranking policy defines deterministic tie-breakers.
  - [ ] Policy explicitly prohibits arc-angle expansion during ranking acceptance.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Deterministic tie-break replay
    Tool: Bash
    Preconditions: Ranking policy document prepared
    Steps:
      1. Run candidate ordering simulation for symmetric case inputs.
      2. Re-run simulation 10 times.
      3. Compare selected candidate IDs across runs.
    Expected Result: Same candidate chosen in all runs.
    Evidence: .sisyphus/evidence/task-4-tiebreak-replay.txt

  Scenario: No-angle-expansion filter
    Tool: Bash
    Preconditions: Ranking policy document prepared
    Steps:
      1. Inject candidate that would extend arc sweep.
      2. Validate policy rejects this candidate before tie-break.
    Expected Result: Expanding candidate always rejected.
    Evidence: .sisyphus/evidence/task-4-no-arc-expand-filter.txt
  ```

  **Commit**: NO

- [ ] 5. Bootstrap automated test harness for target modules (tests-after baseline)

  **What to do**:
  - Add/prepare test runner for root module tests (Vitest preferred).
  - Ensure DOM-dependent geometry helpers are runnable in test environment (happy-dom/jsdom setup as needed).

  **Must NOT do**:
  - Do not harden geometry logic in this task.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T6, T7, T8, T9, T10, T15, T16
  - **Blocked By**: None

  **References**:
  - `package.json` - script integration.
  - Existing `brep_reference` test style for compatibility cues.

  **Acceptance Criteria**:
  - [ ] `npm run test` executes target-module tests in CI/local environment.
  - [ ] At least one smoke test confirms harness stability.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Test harness smoke run
    Tool: Bash
    Preconditions: test config committed
    Steps:
      1. Run npm run test.
      2. Capture summary output.
      3. Verify exit code is 0.
    Expected Result: harness executes and returns PASS.
    Evidence: .sisyphus/evidence/task-5-harness-smoke.txt

  Scenario: DOM dependency validation
    Tool: Bash
    Preconditions: DOM env configured in test harness
    Steps:
      1. Run dedicated test invoking path length/self-intersection helpers.
      2. Verify no "document is undefined" failures.
    Expected Result: DOM-dependent helper test passes.
    Evidence: .sisyphus/evidence/task-5-dom-env.txt
  ```

  **Commit**: YES
  - Message: `chore(test): bootstrap root geometry test harness`
  - Files: `package.json`, `vitest config`, `tests/smoke`
  - Pre-commit: `npm run test`

- [ ] 6. Add regression tests for arc center invariance

  **What to do**:
  - Add tests proving arc offset keeps center invariant.
  - Cover inward/outward offsets and multiple sweep directions.

  **Must NOT do**:
  - Do not modify production geometry logic in this task.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11
  - **Blocked By**: T5

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - arc offset behavior.

  **Acceptance Criteria**:
  - [ ] Tests fail if arc center changes after offset.
  - [ ] Tests pass for clockwise and counterclockwise arc cases.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Arc center invariant happy-path
    Tool: Bash
    Preconditions: test suite available
    Steps:
      1. Run targeted arc-center test file.
      2. Assert centerX/centerY equality pre/post offset for fixed inputs.
    Expected Result: all center invariance assertions pass.
    Evidence: .sisyphus/evidence/task-6-arc-center.txt

  Scenario: Negative offset edge case
    Tool: Bash
    Preconditions: same tests include inward offset cases
    Steps:
      1. Run inward offset scenario.
      2. Assert arc is either valid with same center or removed as degenerate.
    Expected Result: no center drift and no invalid reversed arc.
    Evidence: .sisyphus/evidence/task-6-arc-center-negative.txt
  ```

  **Commit**: YES
  - Message: `test(offset): enforce arc center invariance`
  - Files: `tests/offset/arc-center.spec.*`
  - Pre-commit: `npm run test`

- [ ] 7. Add regression tests for no arc-angle expansion rule

  **What to do**:
  - Add tests for trim validation that only allows sweep reduction.
  - Include candidate-intersection cases that would wrongly expand arc angle.

  **Must NOT do**:
  - Do not implement fixes yet.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11
  - **Blocked By**: T4, T5

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - start/end trim validators.

  **Acceptance Criteria**:
  - [ ] Any expansion candidate is rejected in tests.
  - [ ] Valid contraction cases still accepted.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Expansion candidate rejection
    Tool: Bash
    Preconditions: rule tests written
    Steps:
      1. Execute scenario with intersection that extends sweep.
      2. Assert join selection rejects candidate.
    Expected Result: rejected candidate and no expanded arc in output.
    Evidence: .sisyphus/evidence/task-7-no-expand-reject.txt

  Scenario: Contraction acceptance
    Tool: Bash
    Preconditions: contraction scenario included
    Steps:
      1. Execute scenario with valid trimming point.
      2. Assert output arc sweep reduced and valid.
    Expected Result: trimmed arc accepted.
    Evidence: .sisyphus/evidence/task-7-contraction-accept.txt
  ```

  **Commit**: YES
  - Message: `test(offset): enforce no arc-angle expansion`
  - Files: `tests/offset/arc-trim.spec.*`
  - Pre-commit: `npm run test`

- [ ] 8. Add regression tests for degeneracy deletion semantics

  **What to do**:
  - Add tests for line/arc degeneracy removal (no reversal).
  - Verify zero-length outputs are removed and not inverted.

  **Must NOT do**:
  - Do not change production logic in this task.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T12
  - **Blocked By**: T4, T5

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - trim/sanitize degeneracy behavior.

  **Acceptance Criteria**:
  - [ ] Degenerate line (len <= 0) removed in output.
  - [ ] Degenerate arc (radius/sweep <= threshold) removed in output.
  - [ ] No reversed segment appears as fallback.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Degenerate line removal
    Tool: Bash
    Preconditions: test fixtures include collapsing line case
    Steps:
      1. Run targeted degeneracy tests.
      2. Assert collapsed line absent from final segments.
      3. Assert direction vector not reversed for neighboring segments.
    Expected Result: removal without reversal.
    Evidence: .sisyphus/evidence/task-8-line-degenerate.txt

  Scenario: Degenerate arc removal
    Tool: Bash
    Preconditions: fixture includes inward offset collapsing radius
    Steps:
      1. Execute arc-degenerate test.
      2. Assert arc removed and not replaced with reversed segment.
    Expected Result: arc deleted cleanly.
    Evidence: .sisyphus/evidence/task-8-arc-degenerate.txt
  ```

  **Commit**: YES
  - Message: `test(offset): verify degeneracy deletion semantics`
  - Files: `tests/offset/degeneracy.spec.*`
  - Pre-commit: `npm run test`

- [ ] 9. Add regression tests for bridge persistence as first-class segments

  **What to do**:
  - Add tests where bridge between line/arc survives neighbor degeneracy.
  - Verify bridge removed only when bridge itself degenerates.

  **Must NOT do**:
  - Do not harden bridge implementation yet.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T11, T12
  - **Blocked By**: T4, T5

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - `applyMiterJoin` bridge insertion and post-sanitize behavior.

  **Acceptance Criteria**:
  - [ ] Bridge segment remains when adjacent arc degenerates.
  - [ ] Bridge removed only when its own length degenerates.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Bridge survives adjacent arc degeneracy
    Tool: Bash
    Preconditions: line-arc-bridge fixture prepared
    Steps:
      1. Run targeted bridge persistence test.
      2. Assert arc removed but bridge + line remain.
    Expected Result: bridge persists as independent contour element.
    Evidence: .sisyphus/evidence/task-9-bridge-persist.txt

  Scenario: Bridge self-degeneracy removal
    Tool: Bash
    Preconditions: fixture includes near-zero bridge length
    Steps:
      1. Run self-degenerate bridge case.
      2. Assert bridge removed when length <= threshold.
    Expected Result: only self-degenerate bridge removed.
    Evidence: .sisyphus/evidence/task-9-bridge-self-degenerate.txt
  ```

  **Commit**: YES
  - Message: `test(offset): enforce bridge persistence semantics`
  - Files: `tests/offset/bridge-persistence.spec.*`
  - Pre-commit: `npm run test`

- [ ] 10. Add regression tests for sequential neighbor reconciliation

  **What to do**:
  - Add tests proving each segment reconciliation depends on two neighbors in sequence.
  - Include chain and wrap-around cases for closed contours.

  **Must NOT do**:
  - Do not change join algorithm in this task.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T13
  - **Blocked By**: T5

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - join pass sequencing.

  **Acceptance Criteria**:
  - [ ] Closed contour wrap-around behavior validated.
  - [ ] Chain consistency validated with deterministic output ordering.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Closed contour wrap-around
    Tool: Bash
    Preconditions: closed contour fixture available
    Steps:
      1. Run sequential-neighbor test for N segments.
      2. Validate segment N joins segment 1 according to same rule.
    Expected Result: wrap-around reconciliation works identically.
    Evidence: .sisyphus/evidence/task-10-wraparound.txt

  Scenario: Deterministic chain replay
    Tool: Bash
    Preconditions: same fixture and fixed seed ordering
    Steps:
      1. Run scenario 20 times.
      2. Compare serialized output hashes.
    Expected Result: all hashes identical.
    Evidence: .sisyphus/evidence/task-10-chain-determinism.txt
  ```

  **Commit**: YES
  - Message: `test(offset): verify sequential neighbor reconciliation`
  - Files: `tests/offset/neighbor-sequence.spec.*`
  - Pre-commit: `npm run test`

- [ ] 11. Harden deterministic candidate selection in join/intersection

  **What to do**:
  - Apply deterministic ranking/tie-break policy from T4 in `applyMiterJoin`.
  - Ensure selection order is stable for symmetric and near-equal candidates.

  **Must NOT do**:
  - Do not introduce arc-angle expansion acceptance.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential in Wave 3
  - **Blocks**: T15, T16
  - **Blocked By**: T1, T2, T3, T4, T6, T7, T9

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - `applyMiterJoin`, intersection helpers.
  - T4 policy artifact.

  **Acceptance Criteria**:
  - [ ] Deterministic tie-break logic implemented and documented in-code.
  - [ ] Existing rule tests (T6-T10) remain passing.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Symmetric-candidate stability
    Tool: Bash
    Preconditions: deterministic candidate fixtures exist
    Steps:
      1. Run targeted join tests 20 times.
      2. Compare serialized output hashes.
    Expected Result: all runs yield identical output.
    Evidence: .sisyphus/evidence/task-11-stability.txt

  Scenario: Rule-preservation guard
    Tool: Bash
    Preconditions: full offset test suite available
    Steps:
      1. Run no-arc-expansion and degeneracy suites.
      2. Verify no regressions from ranking changes.
    Expected Result: 0 regressions.
    Evidence: .sisyphus/evidence/task-11-rule-guard.txt
  ```

  **Commit**: YES
  - Message: `fix(offset): stabilize intersection candidate ranking`
  - Files: `src/operations/CustomOffsetProcessor.js`, tests
  - Pre-commit: `npm run test`

- [ ] 12. Harden arc-arc micro-gap handling and tangent bridge integration

  **What to do**:
  - Complete pending arc-arc micro-gap hardening tasks.
  - Ensure fallback bridge integration does not violate arc constraints.

  **Must NOT do**:
  - Do not enlarge arc angles to close gaps.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential in Wave 3
  - **Blocks**: T15
  - **Blocked By**: T2, T3, T8, T9

  **References**:
  - `src/operations/CustomOffsetProcessor.js` - arc-arc joins and bridge fallback paths.
  - User-provided validation path case.

  **Acceptance Criteria**:
  - [ ] Arc-arc micro-gaps resolved in target validation cases.
  - [ ] No forbidden arc expansion introduced.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Arc-arc micro-gap regression
    Tool: Bash
    Preconditions: fixture for known micro-gap case prepared
    Steps:
      1. Execute processor on fixture with specified offset.
      2. Assert no micro-gap remains beyond tolerance.
    Expected Result: continuous contour within tolerance.
    Evidence: .sisyphus/evidence/task-12-arc-arc-microgap.txt

  Scenario: Tangent bridge fallback
    Tool: Bash
    Preconditions: non-intersecting arc neighbors fixture prepared
    Steps:
      1. Trigger fallback path.
      2. Assert bridge inserted and arc centers unchanged.
    Expected Result: gap closed by bridge, constraints preserved.
    Evidence: .sisyphus/evidence/task-12-bridge-fallback.txt
  ```

  **Commit**: YES
  - Message: `fix(offset): close arc-arc micro-gaps without arc expansion`
  - Files: `src/operations/CustomOffsetProcessor.js`, tests
  - Pre-commit: `npm run test`

- [ ] 13. Normalize tolerance usage and remove magic thresholds

  **What to do**:
  - Replace magic numeric thresholds with named constants per T2.
  - Ensure all tolerance calls reference the policy table.

  **Must NOT do**:
  - Do not silently loosen tolerances without rationale.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential in Wave 3
  - **Blocks**: T15
  - **Blocked By**: T2, T5, T10

  **References**:
  - `src/operations/CustomOffsetProcessor.js` and related utility callers.

  **Acceptance Criteria**:
  - [ ] No uncategorized tolerance magic numbers remain in targeted modules.
  - [ ] Tolerance comments map to policy names.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Magic-number scan
    Tool: Bash
    Preconditions: tolerance refactor applied
    Steps:
      1. Search for previous raw thresholds in targeted files.
      2. Verify all replaced with named constants.
    Expected Result: zero unintended raw threshold occurrences.
    Evidence: .sisyphus/evidence/task-13-magic-scan.txt

  Scenario: Tolerance behavior sanity
    Tool: Bash
    Preconditions: full test suite available
    Steps:
      1. Run full offset regression suite.
      2. Confirm no broad regression due to threshold normalization.
    Expected Result: suite passes.
    Evidence: .sisyphus/evidence/task-13-sanity.txt
  ```

  **Commit**: YES
  - Message: `refactor(offset): normalize tolerance constants`
  - Files: `src/operations/CustomOffsetProcessor.js`, related utils/tests
  - Pre-commit: `npm run test`

- [ ] 14. Remove dead/invalid integration hooks and clarify optional behaviors

  **What to do**:
  - Resolve invalid or dead integration hooks identified in audit (e.g., nonexistent imports/options wiring).
  - Keep optional behavior interfaces explicit and safe (no runtime breakage).

  **Must NOT do**:
  - Do not introduce hidden no-op behaviors without explicit note.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (parallel with late stage where independent)
  - **Blocks**: T15
  - **Blocked By**: T1

  **References**:
  - `src/operations/CustomOffsetProcessor.js` integration imports/options.

  **Acceptance Criteria**:
  - [ ] No invalid imports remain in target processor path.
  - [ ] Optional flags are either fully wired or explicitly guarded.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Module import integrity
    Tool: Bash
    Preconditions: cleanup applied
    Steps:
      1. Run build/type checks.
      2. Verify no unresolved import/export errors.
    Expected Result: clean module graph for target files.
    Evidence: .sisyphus/evidence/task-14-import-integrity.txt

  Scenario: Optional behavior safety
    Tool: Bash
    Preconditions: optional flags test fixture available
    Steps:
      1. Run with optional flags on/off.
      2. Assert predictable behavior and no runtime exceptions.
    Expected Result: safe toggle behavior.
    Evidence: .sisyphus/evidence/task-14-option-safety.txt
  ```

  **Commit**: YES
  - Message: `fix(offset): remove dead hooks and guard optional flows`
  - Files: `src/operations/CustomOffsetProcessor.js`, tests
  - Pre-commit: `npm run test`

- [ ] 15. Build end-to-end regression suite for user-defined canonical scenarios

  **What to do**:
  - Create integration tests for your canonical shapes and offsets (including provided complex path case).
  - Validate final contour continuity, bridge behavior, and no forbidden reversals.

  **Must NOT do**:
  - Do not use visual-only assertions.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 sequential
  - **Blocks**: T17, F1-F4
  - **Blocked By**: T2, T5, T11, T12, T13, T14

  **References**:
  - User canonical path: `M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8 L -11 11 H 0 H 11 L 11 8 A 7 7 0 0 1 5.5 3.5 A 6 6 0 0 0 0 0` with offset `-7`.
  - `src/editor/tools/OffsetTool.js` integration surface.

  **Acceptance Criteria**:
  - [ ] Canonical scenario tests pass with strict numeric assertions.
  - [ ] Continuity and rule constraints verified for each scenario.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Canonical path regression (happy path)
    Tool: Bash
    Preconditions: e2e fixtures prepared
    Steps:
      1. Execute canonical path offset with distance -7.
      2. Assert continuity, no illegal arc expansion, valid bridges.
    Expected Result: stable expected output and all constraints satisfied.
    Evidence: .sisyphus/evidence/task-15-canonical-regression.txt

  Scenario: Error-path robustness
    Tool: Bash
    Preconditions: invalid/edge geometry fixture prepared
    Steps:
      1. Run malformed/near-degenerate contour inputs.
      2. Assert graceful handling (no crashes, clear rejection/cleanup).
    Expected Result: graceful failure semantics.
    Evidence: .sisyphus/evidence/task-15-error-robustness.txt
  ```

  **Commit**: YES
  - Message: `test(offset): add canonical end-to-end regressions`
  - Files: `tests/offset/e2e/*.spec.*`
  - Pre-commit: `npm run test`

- [ ] 16. Add determinism and repeatability checks

  **What to do**:
  - Add repeated-run snapshot/hash checks for fixed inputs to ensure deterministic output.
  - Include symmetric geometry variants to detect unstable ordering.

  **Must NOT do**:
  - Do not rely on manual visual comparison.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F2
  - **Blocked By**: T5, T11

  **References**:
  - T11 ranking policy and implementation.

  **Acceptance Criteria**:
  - [ ] Hash/snapshot output identical across repeated runs for fixed fixtures.
  - [ ] Any nondeterminism is either removed or explicitly documented with rationale.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Repeatability loop
    Tool: Bash
    Preconditions: determinism test harness ready
    Steps:
      1. Run fixed scenario set 30 times.
      2. Compare output hashes.
    Expected Result: all hashes identical.
    Evidence: .sisyphus/evidence/task-16-repeatability.txt

  Scenario: Symmetry consistency
    Tool: Bash
    Preconditions: mirrored fixtures defined
    Steps:
      1. Run original and mirrored scenarios.
      2. Assert mirrored outputs correspond within tolerance.
    Expected Result: symmetry-preserving behavior.
    Evidence: .sisyphus/evidence/task-16-symmetry.txt
  ```

  **Commit**: YES
  - Message: `test(offset): add deterministic repeatability checks`
  - Files: `tests/offset/determinism.spec.*`
  - Pre-commit: `npm run test`

- [ ] 17. Final technical write-up and migration notes

  **What to do**:
  - Summarize final rule compliance, changed behaviors, and compatibility notes.
  - Document tolerance policy and known intentional behavior shifts due to correctness-first mode.

  **Must NOT do**:
  - Do not leave undocumented behavior changes.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 sequential
  - **Blocks**: F1
  - **Blocked By**: T15

  **References**:
  - All test/evidence artifacts from T1-T16.

  **Acceptance Criteria**:
  - [ ] Document contains explicit before/after behavior notes.
  - [ ] Rule compliance table updated to final state.

  **QA Scenarios (MANDATORY)**:
  ```
  Scenario: Documentation completeness
    Tool: Bash
    Preconditions: write-up generated
    Steps:
      1. Verify all 6 rules have final status and evidence links.
      2. Verify changed behaviors are listed under correctness-first rationale.
    Expected Result: complete traceability document.
    Evidence: .sisyphus/evidence/task-17-doc-completeness.txt

  Scenario: Migration clarity check
    Tool: Bash
    Preconditions: write-up generated
    Steps:
      1. Validate migration notes include impact areas and rollback hints.
      2. Validate no unresolved TODO placeholders remain.
    Expected Result: actionable migration notes.
    Evidence: .sisyphus/evidence/task-17-migration-clarity.txt
  ```

  **Commit**: YES
  - Message: `docs(offset): summarize correctness hardening outcomes`
  - Files: `relevant docs/changelog`
  - Pre-commit: `npm run test`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify every Must Have / Must NOT Have against implementation + evidence artifacts.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run typecheck/lint/tests and static anti-slop checks.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N/N] | VERDICT`

- [ ] F3. **Real QA Replay** — `unspecified-high` (+`playwright` for UI)
  Execute all QA scenarios from all tasks and verify evidence exists.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge [N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Validate 1:1 match between task specs and actual changes; detect scope creep.
  Output: `Tasks [N/N compliant] | Creep [0/N] | VERDICT`

---

## Commit Strategy

- Group A (foundation): T1-T5
- Group B (tests): T6-T10
- Group C (hardening): T11-T14
- Group D (regression/docs): T15-T17

Commit format: `type(scope): description`

---

## Success Criteria

### Verification Commands
```bash
npm run test
npm run build
```

### Final Checklist
- [ ] All strict geometry rules are covered by automated tests
- [ ] No forbidden behaviors introduced
- [ ] Deterministic repeated-run outputs for fixed inputs
- [ ] All final verification agents APPROVE
