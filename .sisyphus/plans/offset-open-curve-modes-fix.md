# Offset Open-Curve Regression Fix + Mode System

## TL;DR

> **Quick Summary**: Исправляем критический дефект open-curve offset (лишний 12-сегментный контур для одной линии) и вводим явные режимы оффсета с TAB-переключением.
>
> **Deliverables**:
>
> - Стабильная open-curve pipeline без паразитных контуров/дегенератов
> - Режимы offset:
>   - Open contour: `one-sided` (default), `two-sides-no-close`, `two-sides-round-caps`, `two-sides-flat-caps`
>   - Closed contour: `one-sided`, `two-sides-no-close`
> - TDD-набор инвариантных тестов (contour count, segment topology, closure, bbox/area)
> - E2E QA infrastructure for TAB/mode UX (`@playwright/test`, config, `test:e2e` script)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves + final verification
> **Critical Path**: RED tests → Engine topology fixes → mode routing → OffsetTool TAB integration

---

## Context

### Original Request

Пользователь сообщил критическую регрессию: offset для одной линии даёт «ужасный» результат с лишним контуром и множеством сегментов. Плюс требуется режимная модель поведения оффсета с TAB-переключением.

### Interview Summary

- Подтверждён general fix (не hotfix только под single-line).
- Для `two-sides-no-close`: результат должен быть **2 separate open contours** (для open paths).
- Направление one-sided: по **nearest segment normal** относительно курсора.
- Test strategy: **TDD**.

### Research + Metis Synthesis

- Наиболее вероятный корень дефекта: несогласованность сегментных endpoints vs arc metadata после stitching/reversal.
- Главные зоны риска: `OffsetEngine._stitchSegments`, `OffsetCapper.capBothSides`, post-serialization normalization path.
- Выявлен пробел тестов: раньше не проверялись topology invariants (contour count, stitched continuity, degenerate rejection).

---

## Work Objectives

### Core Objective

Сделать предсказуемый и топологически корректный offset pipeline для open/closed contours и добавить режимы, точно соответствующие UX-правилам пользователя.

### Concrete Deliverables

- Engine mode routing с явными режимами.
- Fix topology/stitch consistency для open path.
- TAB cycling в OffsetTool согласно типу контура.
- TDD regression suite для single-line/open modes + closed regression guard.

### Definition of Done

- [ ] Single-line (`M 0 0 V 10`, offset=1) больше не создаёт паразитный «12-сегментный» контур.
- [ ] Open contour default = one-sided в сторону курсора.
- [ ] Open TAB cycle: two-sides-no-close → two-sides-round-caps → two-sides-flat-caps.
- [ ] Closed TAB cycle: one-sided → two-sides-no-close.
- [ ] Все новые TDD тесты проходят.
- [ ] Существующие offset regression tests не сломаны.

### Must Have

- Чёткий mode contract в Engine API.
- Топологические инварианты в тестах (contour/segment counts + continuity).
- Нулевая деградация текущего closed-curve поведения.
- Семантика `two-sides-no-close` для **closed contour**: два независимых closed контура (outer + inner).

### Must NOT Have (Guardrails)

- Не добавлять новые типы join/cap вне `sharp|round` и `flat|round`.
- Не трогать `OffsetCurveEvaluator` математику без доказанного дефекта.
- Не делать крупный архитектурный рефактор UI state machine.
- Не возвращать «combined polyline» для `two-sides-no-close` open mode.

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: **TDD**
- **Framework**: Vitest

### QA Policy

Каждая задача включает agent-executed QA: unit/integration (Vitest), плюс runtime checks для TAB UX.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (TDD foundation + invariant scaffolding):
├── Task 1: Add RED tests for single-line topology invariants
├── Task 2: Add RED tests for mode routing (open/closed)
├── Task 3: Add RED tests for cursor-side one-sided behavior contract
├── Task 4: Add RED tests for degenerate/continuity invariants
├── Task 5: Add baseline regression guard for existing task-6/f3 suites
└── Task 6: Add test utilities (point epsilon/topology assertions)

Wave 2 (Engine fixes + mode implementation):
├── Task 7: Fix stitching/topology consistency in OffsetEngine
├── Task 8: Harden capBothSides/open path assembly semantics
├── Task 9: Implement explicit offsetMode routing in Engine
├── Task 10: Implement cursor-side sign resolution hook/contract
└── Task 11: Pass all RED→GREEN engine tests

Wave 3 (Tool integration + UX behavior):
├── Task 12: Setup Playwright E2E infrastructure
├── Task 13: Add OffsetTool mode state and TAB cycling rules
├── Task 14: Wire mode + cursor-side into engine call path
├── Task 15: Add popup mode indicator/update text
├── Task 16: End-to-end runtime QA scenarios (open+closed)
└── Task 17: Final regression run (build/test/dev/e2e)

Wave FINAL:
├── F1 Plan compliance audit
├── F2 Code quality review
├── F3 Manual QA evidence pass
└── F4 Scope fidelity check
```

### Dependency Matrix

- 1-6: None → 7-11
- 7: 1,4,6 → 9,11
- 8: 1,4,6 → 9,11
- 9: 2,7,8 → 11,13
- 10: 3 → 13
- 11: 7,8,9 → 12-17
- 12: 11 → 13-17
- 13: 11,12 → 14-17
- 14: 9,10,13 → 15-17
- 15: 14 → 16-17
- 16: 14,15 → 17
- 17: 11-16 → FINAL

---

## TODOs

- [x] 1. RED: Single-line topology invariants

  **What to do**:
  - Add failing tests for `M 0 0 V 10`, `offset=1`.
  - Assert no parasitic contour and expected topology per mode.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`test-facade`]

  **Parallelization**: Wave 1; Blocks 7-11; Blocked By: None.

  **References**:
  - `tests/task-6-offsetengine-qa.spec.js` — current integration patterns.
  - `tests/f3-functional-qa.spec.js` — existing scenario style.

  **Acceptance Criteria**:
  - [ ] Fails on current broken behavior.
  - [ ] Asserts contour count + closure + segment count.

  **QA Scenarios**:
  - Scenario: RED test for single-line open default
    - Tool: Bash
    - Steps:
      1. Add tests in `tests/offset-topology.spec.js` for `M 0 0 V 10`, `offset=1`, mode=`one-sided`.
      2. Run: `npx vitest run tests/offset-topology.spec.js -t "single-line one-sided"`
    - Expected Result: FAIL before fix (RED)
    - Evidence: `.sisyphus/evidence/task-1-red-topology.txt`

- [x] 2. RED: Mode routing contract tests

  **What to do**:
  - Add failing tests for modes:
    - open: one-sided / two-sides-no-close / two-sides-round-caps / two-sides-flat-caps
    - closed: one-sided / two-sides-no-close

  **Recommended Agent Profile**: `quick` + `test-facade`
  **Parallelization**: Wave 1; Blocks 9,11.
  **Acceptance Criteria**: Mode-specific expected contour structures defined and failing pre-fix.
  **QA Scenarios**:
  - Scenario: RED mode-routing tests
    - Tool: Bash
    - Steps:
      1. Add tests in `tests/offset-modes.spec.js` for all open/closed modes.
      2. Run: `npx vitest run tests/offset-modes.spec.js`
    - Expected Result: FAIL before mode implementation
    - Evidence: `.sisyphus/evidence/task-2-red-modes.txt`
      **Evidence**: `.sisyphus/evidence/task-2-red-modes.txt`

- [x] 3. RED: Cursor-side one-sided behavior tests

  **What to do**:
  - Add failing tests for nearest-segment-normal sign selection contract.

  **Recommended Agent Profile**: `deep` + `cad-geometry`
  **Parallelization**: Wave 1; Blocks 10,13.
  **Acceptance Criteria**: deterministic side selection assertions using fixed cursor points.
  **Evidence**: `.sisyphus/evidence/task-3-red-cursor-side.txt`

  **QA Scenarios**:
  - Scenario: RED cursor-side contract
    - Tool: Bash
    - Steps:
      1. Add tests in `tests/offset-cursor-side.spec.js` using fixed cursor coordinates.
      2. Run: `npx vitest run tests/offset-cursor-side.spec.js`
    - Expected Result: FAIL before sign-resolution hook exists
    - Evidence: `.sisyphus/evidence/task-3-red-cursor-side.txt`

- [x] 4. RED: Degenerate/continuity invariants

  **What to do**:
  - Add failing assertions: no zero-length segments, stitched continuity (end==next.start), no implicit extra closure segment when already closed.

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 1; Blocks 7,8,11.
  **Acceptance Criteria**: RED tests fail on current defect path.
  **Evidence**: `.sisyphus/evidence/task-4-red-invariants.txt`

  **QA Scenarios**:
  - Scenario: RED continuity/degenerate checks
    - Tool: Bash
    - Steps:
      1. Add continuity tests in `tests/offset-invariants.spec.js` (end==next.start, no zero-length).
      2. Run: `npx vitest run tests/offset-invariants.spec.js`
    - Expected Result: FAIL before stitch fix
    - Evidence: `.sisyphus/evidence/task-4-red-invariants.txt`

- [x] 5. Baseline regression guard

  **What to do**:
  - Freeze current known-good suites (task-6/f3) as non-regression gate.

  **Recommended Agent Profile**: `quick` + `test-facade`
  **Parallelization**: Wave 1; Blocks 16.
  **Acceptance Criteria**: baseline pass snapshot stored.
  **Evidence**: `.sisyphus/evidence/task-5-baseline-guard.txt`

  **QA Scenarios**:
  - Scenario: baseline regression pass
    - Tool: Bash
    - Steps:
      1. Run: `npx vitest run tests/task-6-offsetengine-qa.spec.js tests/f3-functional-qa.spec.js`
    - Expected Result: PASS (baseline before feature changes)
    - Evidence: `.sisyphus/evidence/task-5-baseline-guard.txt`

- [x] 6. Test topology helper utilities

  **What to do**:
  - Add shared test helpers for EPS comparisons and contour topology checks.

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 1; Blocks 7-16.
  **Acceptance Criteria**: helpers consumed by RED tests.
  **Evidence**: `.sisyphus/evidence/task-6-test-helpers.txt`

  **QA Scenarios**:
  - Scenario: helper usage compile/runtime
    - Tool: Bash
    - Steps:
      1. Import helpers from at least 2 new spec files.
      2. Run: `npx vitest run tests/offset-topology.spec.js tests/offset-invariants.spec.js`
    - Expected Result: Tests execute using helper functions (RED acceptable)
    - Evidence: `.sisyphus/evidence/task-6-test-helpers.txt`

- [x] 7. Fix OffsetEngine stitching/topology consistency

  **What to do**:
  - Correct `_stitchSegments` behavior for capped open contours.
  - Prevent redundant closure in `_ensureClosedWhenNeeded` when already closed.
  - Keep arc metadata consistent after endpoint adjustments.

  **Must NOT do**: do not rewrite entire pipeline.
  **Recommended Agent Profile**: `ultrabrain` + `cad-geometry`
  **Parallelization**: Wave 2; Blocked By 1,4,6.
  **Acceptance Criteria**: Task 1/4 tests turn GREEN for stitching/closure cases.
  **Evidence**: `.sisyphus/evidence/task-7-engine-stitch-fix.txt`

  **QA Scenarios**:
  - Scenario: stitch/closure green
    - Tool: Bash
    - Steps:
      1. Run: `npx vitest run tests/offset-topology.spec.js tests/offset-invariants.spec.js -t "single-line|continuity|closure"`
    - Expected Result: PASS after fix
    - Evidence: `.sisyphus/evidence/task-7-engine-stitch-fix.txt`

  - Scenario: negative (no redundant close segment)
    - Tool: Bash
    - Steps:
      1. Add assertion: already closed capped contour does not append extra closing line.
      2. Run targeted test above.
    - Expected Result: PASS
    - Evidence: `.sisyphus/evidence/task-7-engine-stitch-fix.txt`

- [x] 8. Harden capBothSides semantics

  **What to do**:
  - Ensure assembly order and reversed side semantics produce stable topology.
  - Validate against line and arc open contours.

  **Recommended Agent Profile**: `deep` + `cad-geometry`
  **Parallelization**: Wave 2; Blocked By 1,4,6.
  **Acceptance Criteria**: no parasitic loops/degenerate connectors in open cases.
  **Evidence**: `.sisyphus/evidence/task-8-capper-fix.txt`

  **QA Scenarios**:
  - Scenario: capBothSides line + arc stability
    - Tool: Bash
    - Steps:
      1. Run: `npx vitest run tests/f3-functional-qa.spec.js -t "capBothSides|round cap|flat cap"`
    - Expected Result: PASS with no degenerate cap segments
    - Evidence: `.sisyphus/evidence/task-8-capper-fix.txt`

- [ ] 9. Implement explicit offsetMode routing in Engine

  **What to do**:
  - Add mode contract to engine options.
  - Implement branch behavior for open/closed modes exactly per requirements.

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 2; Blocked By 2,7,8.
  **Acceptance Criteria**: mode tests GREEN.
  **Evidence**: `.sisyphus/evidence/task-9-mode-routing.txt`

  **QA Scenarios**:
  - Scenario: engine mode routing
    - Tool: Bash
    - Steps:
      1. Run: `npx vitest run tests/offset-modes.spec.js`
    - Expected Result: PASS; expected contour counts/types per mode
    - Evidence: `.sisyphus/evidence/task-9-mode-routing.txt`

- [ ] 10. Cursor-side sign resolution contract

  **What to do**:
  - Add deterministic nearest-segment-normal based sign selection hook consumed by one-sided mode.

  **Recommended Agent Profile**: `deep` + `cad-geometry`
  **Parallelization**: Wave 2; Blocked By 3.
  **Acceptance Criteria**: cursor-side RED tests GREEN.
  **Evidence**: `.sisyphus/evidence/task-10-cursor-sign.txt`

  **QA Scenarios**:
  - Scenario: nearest-normal side selection
    - Tool: Bash
    - Steps:
      1. Run: `npx vitest run tests/offset-cursor-side.spec.js`
    - Expected Result: PASS for fixed cursor points and expected signs
    - Evidence: `.sisyphus/evidence/task-10-cursor-sign.txt`

- [ ] 11. RED→GREEN consolidation for Engine

  **What to do**:
  - Run full engine/unit suite, close all RED from Wave 1.

  **Recommended Agent Profile**: `unspecified-high` + `test-facade`
  **Parallelization**: Wave 2 end; Blocked By 7,8,9.
  **Acceptance Criteria**: all new and old engine tests pass.
  **Evidence**: `.sisyphus/evidence/task-11-engine-green.txt`

  **QA Scenarios**:
  - Scenario: engine consolidation
    - Tool: Bash
    - Steps:
      1. Run: `npx vitest run tests/offset-topology.spec.js tests/offset-modes.spec.js tests/offset-invariants.spec.js tests/task-6-offsetengine-qa.spec.js tests/f3-functional-qa.spec.js`
    - Expected Result: PASS
    - Evidence: `.sisyphus/evidence/task-11-engine-green.txt`

- [ ] 12. Setup Playwright E2E infrastructure

  **What to do**:
  - Add E2E test infra for UI mode verification:
    - install `@playwright/test` (devDependency)
    - install browser binaries (`chromium`)
    - add `playwright.config.*`
    - add script `test:e2e`
    - create `tests/e2e/offset-modes.spec.*` scaffold

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 3; Blocked By 11.
  **Acceptance Criteria**:
  - [ ] `npx playwright --version` works
  - [ ] `npm run test:e2e -- --list` lists e2e tests
        **Evidence**: `.sisyphus/evidence/task-12-playwright-setup.txt`

  **QA Scenarios**:
  - Scenario: E2E infra bootstrapped
    - Tool: Bash
    - Steps:
      1. Run: `npm run test:e2e -- --list`
      2. Run: `npm run test:e2e -- --grep "offset modes smoke"`
    - Expected Result: commands execute; smoke test runnable
    - Evidence: `.sisyphus/evidence/task-12-playwright-setup.txt`

- [ ] 13. OffsetTool mode state + TAB cycle rules

  **What to do**:
  - Add mode state machine in tool level.
  - Implement TAB cycling per contour type (open/closed).

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 3; Blocked By 11,12.
  **Acceptance Criteria**: keyboard cycle order matches spec exactly.
  **Evidence**: `.sisyphus/evidence/task-13-tab-cycle.txt`

  **QA Scenarios**:
  - Scenario: open contour TAB cycle
    - Tool: Bash (Playwright runner)
    - Preconditions: app running (`npm run dev`)
    - Steps:
      1. Draw open line.
      2. Activate OffsetTool.
      3. Press TAB 3 times.
      4. Assert mode sequence: `one-sided` → `two-sides-no-close` → `two-sides-round-caps` → `two-sides-flat-caps`.
    - Expected Result: exact sequence with no skips
    - Evidence: `.sisyphus/evidence/task-13-tab-cycle-open.png`

  - Scenario: closed contour TAB cycle
    - Tool: Bash (Playwright runner)
    - Steps:
      1. Draw closed rectangle.
      2. Activate OffsetTool.
      3. Press TAB twice.
      4. Assert sequence: `one-sided` ↔ `two-sides-no-close`.
    - Expected Result: 2-state cycle only
    - Evidence: `.sisyphus/evidence/task-13-tab-cycle-closed.png`

- [ ] 14. Wire mode + cursor-side into engine call path

  **What to do**:
  - Pass mode and cursor-derived side info from tool into engine request.

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 3; Blocked By 9,10,13.
  **Acceptance Criteria**: runtime one-sided follows cursor side.
  **Evidence**: `.sisyphus/evidence/task-14-wire-mode-cursor.txt`

  **QA Scenarios**:
  - Scenario: cursor-side wire-through
    - Tool: Bash (Playwright runner)
    - Steps:
      1. Hover cursor on opposite sides of same segment before confirming offset.
      2. Apply one-sided offset each time.
      3. Assert produced offset appears on corresponding side.
    - Expected Result: side follows nearest-normal cursor side
    - Evidence: `.sisyphus/evidence/task-14-wire-mode-cursor.txt`

- [ ] 15. Popup mode indicator

  **What to do**:
  - Show active mode label in OffsetTool popup and update on TAB.

  **Recommended Agent Profile**: `visual-engineering`
  **Parallelization**: Wave 3; Blocked By 14.
  **Acceptance Criteria**: visible/accurate mode label.
  **Evidence**: `.sisyphus/evidence/task-15-popup-mode.png`

  **QA Scenarios**:
  - Scenario: popup label correctness
    - Tool: Bash (Playwright runner)
    - Steps:
      1. Open OffsetTool popup.
      2. Cycle TAB through all available states for open contour.
      3. Assert label text equals active mode each step.
    - Expected Result: label always matches internal mode
    - Evidence: `.sisyphus/evidence/task-15-popup-mode.png`

- [ ] 16. Runtime QA matrix (open + closed)

  **What to do**:
  - Execute scenario matrix for each mode with representative contours.

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3; Blocked By 14,15.
  **Acceptance Criteria**: no parasitic loops; expected contour outputs per mode.
  **Evidence**: `.sisyphus/evidence/task-16-runtime-matrix.txt`

  **QA Scenarios**:
  - Scenario: runtime matrix (open contour)
    - Tool: Bash (Playwright runner)
    - Steps:
      1. Create open line `M 0 0 V 10` equivalent via UI.
      2. Test each mode and export/inspect resulting path data.
      3. Assert:
         - one-sided: 1 open contour
         - two-sides-no-close: 2 open contours
         - two-sides-round-caps: 1 closed contour with round caps
         - two-sides-flat-caps: 1 closed contour with flat caps
    - Expected Result: exact topology per mode
    - Evidence: `.sisyphus/evidence/task-16-runtime-open.txt`

  - Scenario: runtime matrix (closed contour)
    - Tool: Bash (Playwright runner)
    - Steps:
      1. Create closed rectangle.
      2. Test both closed modes.
      3. Assert:
         - one-sided: 1 closed contour
         - two-sides-no-close: 2 separate closed contours (outer + inner)
    - Expected Result: exact topology per mode
    - Evidence: `.sisyphus/evidence/task-16-runtime-closed.txt`

- [ ] 17. Final regression run

  **What to do**:
  - Run test/build/dev smoke and capture outputs.

  **Recommended Agent Profile**: `unspecified-high` + `test-facade` + `build-facade`
  **Parallelization**: Wave 3 end; Blocked By 11-16.
  **Acceptance Criteria**:
  - [ ] `npm run test` PASS
  - [ ] `npm run build` PASS
  - [ ] `npm run test:e2e` PASS
  - [ ] key dev flow PASS
        **Evidence**: `.sisyphus/evidence/task-17-final-regression.txt`

  **QA Scenarios**:
  - Scenario: full automated regression
    - Tool: Bash
    - Steps:
      1. Run: `npx vitest run`
      2. Run: `npm run build`
    - Expected Result: both commands PASS
    - Evidence: `.sisyphus/evidence/task-16-final-regression.txt`

  - Scenario: key runtime smoke
    - Tool: Bash (Playwright runner)
    - Preconditions: `npm run dev`
    - Steps:
      1. Open app, draw open and closed contours.
      2. Execute TAB cycles and apply offsets.
      3. Assert no console errors and visible geometry matches mode.
    - Expected Result: smoke PASS
    - Evidence: `.sisyphus/evidence/task-17-runtime-smoke.txt`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. Plan Compliance Audit — `oracle`
- [ ] F2. Code Quality Review — `unspecified-high`
- [ ] F3. Real Manual QA — `unspecified-high`
- [ ] F4. Scope Fidelity Check — `deep`

---

## Commit Strategy

- C1: `test(offset): add RED topology/mode invariant tests`
- C2: `fix(offset): repair open-contour stitching and closure semantics`
- C3: `feat(offset): add explicit mode routing in engine`
- C4: `test(e2e): add Playwright setup for offset mode QA`
- C5: `feat(offset-tool): add TAB mode cycling and cursor-side one-sided behavior`
- C6: `test(offset): finalize regression matrix and invariants`

---

## Success Criteria

### Verification Commands

```bash
npx vitest run tests/task-6-offsetengine-qa.spec.js tests/f3-functional-qa.spec.js
npx vitest run
npm run build
npm run test:e2e
```

### Final Checklist

- [ ] Single-line regression removed
- [ ] Mode system behaves exactly as specified (open/closed)
- [ ] Cursor-side one-sided default works
- [ ] No topology degenerates introduced
- [ ] All tests + build pass
