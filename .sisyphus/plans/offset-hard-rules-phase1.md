# Offset Hard Rules — Phase 1 (Rules 0, 1, 3)

## TL;DR

> **Quick Summary**: Внедрить 3 критичных правила в offset pipeline: (0) параллельность сегментов через U-bridges вместо arc join fallback, (1) защита арочных центров от auto-correct при сериализации, (3) П-образные бриджи при failed sharp joins.
>
> **Deliverables**:
> - `segmentsToSVGPath` с флагом `skipArcAutoCorrect` (Rule 1)
> - `OffsetEngine` использует новую сериализацию для оффсетных результатов
> - `OffsetContourBuilder` заменяет `createArcJoin` fallback на `buildUShapeBridge` (Rule 3)
> - Тесты для всех 3 правил
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 2 независимых трека (Rule 1 и Rule 3), затем интеграция
> **Critical Path**: Task 1 → Task 3 → Task 2 → Task 4

---

## Context

### Original Request
Хочу добавить несколько жёстких правил для оффсет инструмента. Phase 1: Rules 0, 1, 3 — параллельность сегментов, защита арочных центров, П-образные бриджи.

### Interview Summary
**Key Discussions**:
- Поэтапное внедрение: начинаем с критичных правил (0, 1, 3), остальные в следующих фазах
- Тесты после реализации (не TDD)
- Arc auto-correct: отдельная функция сериализации без auto-correct
- U-bridge: всегда при failed sharp join (canApply=false)
- buildUShapeBridge (3 сегмента) вместо buildTangentBridge

**Research Findings**:
- `buildUShapeBridge` и `buildTangentBridge` существуют в `OffsetRules.js` но НИГДЕ не импортируются в production
- `OffsetContourBuilder` не импортирует ничего из `OffsetRules.js`
- `createArcJoin` вызывается в 2 местах: (1) sharp fallback, (2) round join mode — менять только (1)
- `segmentsToSVGPath` имеет 2 callers: OffsetEngine и approximatePath — менять только OffsetEngine
- `ARC_RADIUS_TOLERANCE = 0.01mm` — автокоррекция срабатывает при `rx < chordLength/2 - 0.01`

### Metis Review
**Identified Gaps** (addressed):
- buildUShapeBridge возвращает массив, не один сегмент — решено: `result.push(...bridge)`
- buildUShapeBridge может вернуть null — решено: fallback chain с createArcJoin
- Concave corners не затрагиваем — только convex sharp fallback
- Round join mode не меняем — это выбор пользователя
- Сериализация: options parameter вместо дублирования функции

---

## Work Objectives

### Core Objective
Обеспечить инвариант параллельности оффсетных сегментов и защитить арочные центры от искажений при сериализации.

### Concrete Deliverables
- `src/utils/arcApproximation.js` — `segmentsToSVGPath` с опцией `skipArcAutoCorrect`
- `src/operations/OffsetEngine.js` — передача `{ skipArcAutoCorrect: true }` при сериализации
- `src/operations/OffsetContourBuilder.js` — импорт `buildUShapeBridge`, замена fallback
- `tests/offset-rule1-arc-serialization.spec.js` — тесты Rule 1
- `tests/offset-rule3-ubridge.spec.js` — тесты Rule 3
- `tests/offset-rule0-parallelism.spec.js` — тесты Rule 0

### Definition of Done
- [ ] `npm run test` — все существующие тесты проходят, новые тесты для Rules 0, 1, 3 добавлены
- [ ] `npm run build` — production build без ошибок
- [ ] Визуальная проверка: оффсет контура с аркой+линией (из примера пользователя) показывает параллельные сегменты
- [ ] **Tangent connection fix**: арка→линия с касательным соединением создаёт бридж, а не разрыв

### Must Have
- U-bridge при failed sharp join на convex corners
- Skip arc auto-correct для оффсетных результатов сериализации
- Fallback chain: U-bridge → tangent bridge → createArcJoin (last resort)
- **Tangent connection handling**: при cross ≈ 0 (G1 непрерывность) создавать tangent bridge для закрытия разрыва
- Round join mode НЕ меняется (пользовательский выбор)
- Concave corners НЕ меняются (trim, не bridging)

### Must NOT Have (Guardrails)
- НЕТ изменений в `OffsetCurveEvaluator.js` — математика оффсета корректна
- НЕТ изменений в `OffsetCapper.js` или `OffsetTrimmer.js`
- НЕТ новых join типов или конфигурационных опций для бриджей
- НЕТ рефакторинга существующего работающего кода
- НЕТ реализации Rules 2, 5, 6, 7 — это следующие фазы
- НЕТ включения Paper.js trimming
- НЕТ изменения `_stitchSegments`, `_syncArcMetadata`, `_ensureClosedWhenNeeded`
- НЕТ абстракций или паттернов "join strategy" — premature abstraction

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (не TDD)
- **Framework**: Vitest
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks)

### QA Policy
Каждый task включает agent-executed QA сценарии с конкретными шагами, селекторами, ассертами и evidence paths.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 2 независимых трека):
├── Task 1: Rule 1 — skipArcAutoCorrect в segmentsToSVGPath [quick]
├── Task 2: Rule 3 — buildUShapeBridge в OffsetContourBuilder [unspecified-high]
└── Task 3: Rule 1 — OffsetEngine использует новую сериализацию [quick]

Wave 2 (After Wave 1 — интеграция и тесты):
├── Task 4: Rule 1 — Тесты arc serialization [quick]
├── Task 5: Rule 3 — Тесты U-bridge joins [unspecified-high]
└── Task 6: Rule 0 — Тесты параллельности и равноудалённости [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 3 → Task 6
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1), 3 (Wave 2)
```

### Dependency Matrix

- **1**: - → 3, 4
- **2**: - → 5, 6
- **3**: 1 → 4
- **4**: 1, 3 → F1-F4
- **5**: 2 → F1-F4
- **6**: 1, 2, 3 → F1-F4

### Agent Dispatch Summary

- **1**: **3** — T1 → `quick`, T2 → `unspecified-high`, T3 → `quick`
- **2**: **3** — T4 → `quick`, T5 → `unspecified-high`, T6 → `unspecified-high`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Rule 1: Добавить `skipArcAutoCorrect` опцию в `segmentsToSVGPath`

  **What to do**:
  - В `src/utils/arcApproximation.js` добавить третий параметр `options = {}` в функцию `segmentsToSVGPath`
  - Добавить поле `options.skipArcAutoCorrect` (boolean, default false)
  - Обернуть блок auto-correct (строки 63-78) в условие: `if (!options.skipArcAutoCorrect) { ... }`
  - Сохранить обратную совместимость: вызовы без options работают как раньше
  - НЕ менять логику auto-correct, только добавить conditional skip
  - НЕ трогать `approximatePath` — он должен продолжать использовать auto-correct

  **Must NOT do**:
  - НЕ удалять auto-correct блок
  - НЕ менять поведение по умолчанию (auto-correct включён)
  - НЕ трогать другие части функции (line, bezier serialization)
  - НЕ создавать отдельную функцию-дубликат

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Минимальное изменение — добавить options параметр и условный блок
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `test-facade`: Тесты будут в отдельном task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/utils/arcApproximation.js:20-148` — функция `segmentsToSVGPath`, целевая для модификации
  - `src/utils/arcApproximation.js:63-78` — блок auto-correct, который нужно обернуть в условие

  **API/Type References**:
  - `src/config/constants.js` — `ARC_RADIUS_TOLERANCE` используется в auto-correct

  **External References**:
  - callers: `OffsetEngine.js:212` (segmentsToSVGPath(normalizedFinalSegments)) — нужно добавить `{ skipArcAutoCorrect: true }`
  - callers: `arcApproximation.js:216` (segmentsToSVGPath(optimizedSegments, true)) — НЕ менять, оставить auto-correct

  **Acceptance Criteria**:
  - [ ] `segmentsToSVGPath(segments, false)` — auto-correct работает (backward compatible)
  - [ ] `segmentsToSVGPath(segments, false, { skipArcAutoCorrect: true })` — auto-correct пропущен
  - [ ] `approximatePath()` продолжает использовать auto-correct (не передаёт skip флаг)
  - [ ] TypeScript/JSDoc типы обновлены для нового параметра

  **QA Scenarios**:

  ```
  Scenario: Auto-correct работает по умолчанию
    Tool: Bash (Vitest)
    Steps:
      1. Создать тестовый сегмент арки с radius < chordLength/2
      2. Вызвать segmentsToSVGPath([segment], false)
      3. Проверить что в output rx === chordLength/2 (auto-correct сработал)
    Expected Result: Радиус скорректирован до chordLength/2
    Evidence: .sisyphus/evidence/task-1-autocorrect-default.txt

  Scenario: Auto-correct пропущен с флагом skipArcAutoCorrect
    Tool: Bash (Vitest)
    Steps:
      1. Создать тестовый сегмент арки с radius < chordLength/2
      2. Вызвать segmentsToSVGPath([segment], false, { skipArcAutoCorrect: true })
      3. Проверить что в output rx === original radius (НЕ chordLength/2)
    Expected Result: Радиус сохранён оригинальным, не скорректирован
    Evidence: .sisyphus/evidence/task-1-skip-autocorrect.txt
  ```

  **Evidence to Capture**:
  - [ ] Тестовые файлы с результатами обоих сценариев

  **Commit**: YES (groups with 3)
  - Message: `feat(offset): add skipArcAutoCorrect option to segmentsToSVGPath (Rule 1)`
  - Files: `src/utils/arcApproximation.js`
  - Pre-commit: `npm run test`

---

- [x] 2. Rule 3: Заменить `createArcJoin` fallback на `buildUShapeBridge` в `OffsetContourBuilder`

  **What to do**:
  - Импортировать `buildUShapeBridge` и `buildTangentBridge` из `./OffsetRules.js`
  - В `buildOffsetContour`, в ветке `cornerType === "convex"` и `joinType === "sharp"`, заменить fallback (строки 274-283):
    - Вместо `createArcJoin(...)` вызвать `buildUShapeBridge(current, next)`
    - `buildUShapeBridge` возвращает массив из 3 сегментов — использовать `result.push(...bridge)`
    - Если `buildUShapeBridge` возвращает null → fallback на `buildTangentBridge(current, next)`
    - Если и tangent bridge null → fallback на `createArcJoin` (последний резерв) + `log.warn`
  - НЕ менять ветку round join (строки 284-293) — это пользовательский выбор
  - НЕ менять concave corner handling

  **Must NOT do**:
  - НЕ менять round join codepath (joinType !== "sharp")
  - НЕ менять concave corner handling
  - НЕ модифицировать `buildUShapeBridge` или `buildTangentBridge` — они уже работают
  - НЕ добавлять новые опции или конфигурации
  - НЕ рефакторить структуру join loop

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Требует понимания геометрии соединений, работы с массивами сегментов, обработки edge cases
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `cad-geometry`: buildUShapeBridge уже реализован, не нужно переписывать геометрию

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 5, Task 6
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/operations/OffsetContourBuilder.js:251-293` — блок convex corner join, целевой для модификации
  - `src/operations/OffsetContourBuilder.js:274-283` — конкретный fallback на createArcJoin
  - `src/operations/OffsetContourBuilder.js:42-55` — cloneSegment, формат сегментов
  - `src/operations/OffsetRules.js:351-413` — buildUShapeBridge implementation (3 line segments)
  - `src/operations/OffsetRules.js:323-331` — buildTangentBridge implementation (1 line segment)

  **API/Type References**:
  - `buildUShapeBridge(seg1, seg2)` → `{type: "line", start, end}[]` (array of 3 segments) or null
  - `buildTangentBridge(seg1, seg2)` → `{type: "line", start, end}` or null
  - `createArcJoin(p1, p2, vertex, offsetDistance)` → single arc segment

  **Test References**:
  - `tests/offset-rules.spec.js` — существующие тесты для buildUShapeBridge и buildTangentBridge
  - `tests/offset-build-contour-debug.spec.js` — тесты buildOffsetContour

  **WHY Each Reference Matters**:
  - `OffsetContourBuilder.js:251-293`: Здесь находится логика convex join — нужно встроить bridge chain
  - `OffsetRules.js:351-413`: buildUShapeBridge уже реализован, нужно понять формат возвращаемых сегментов
  - `OffsetRules.js:323-331`: buildTangentBridge как fallback если U-bridge не сработал

  **Acceptance Criteria**:
  - [ ] При convex + sharp + failed miter → в результат добавляются 3 line segments (U-bridge)
  - [ ] При convex + sharp + failed miter + failed U-bridge → 1 line segment (tangent bridge)
  - [ ] При convex + sharp + failed miter + failed U-bridge + failed tangent → 1 arc segment (createArcJoin) + log.warn
  - [ ] При convex + round join → arc join (без изменений)
  - [ ] При concave corner → без изменений (trim, не bridging)
  - [ ] Все сегменты в результате имеют корректные start/end точки (непрерывность контура)

  **QA Scenarios**:

  ```
  Scenario: U-bridge при failed sharp join (острый угол)
    Tool: Bash (Vitest)
    Steps:
      1. Создать контур с острым углом (например, L 0 0 → L 1 0 → A 0.5 0.5 ...)
      2. Вызвать buildOffsetContour с joinType: "sharp" и малым offset (чтобы miter limit exceeded)
      3. Проверить что между offset сегментами есть 3 line segments (U-bridge)
      4. Проверить что offset сегменты параллельны оригинальным (dot product normals ≈ 1.0)
    Expected Result: 3 line segments между offset сегментами, параллельность сохранена
    Evidence: .sisyphus/evidence/task-2-ubridge-sharp-join.txt

  Scenario: Fallback chain при null от buildUShapeBridge
    Tool: Bash (Vitest)
    Steps:
      1. Создать контур где buildUShapeBridge вернёт null (gap < 1e-9)
      2. Вызвать buildOffsetContour с joinType: "sharp"
      3. Проверить что используется tangent bridge или createArcJoin как fallback
      4. Проверить что log.warn был вызван
    Expected Result: Fallback сработал, контур непрерывен
    Evidence: .sisyphus/evidence/task-2-fallback-chain.txt

  Scenario: Round join НЕ меняется
    Tool: Bash (Vitest)
    Steps:
      1. Создать контур с convex corner
      2. Вызвать buildOffsetContour с joinType: "round"
      3. Проверить что join — это arc segment (не U-bridge)
    Expected Result: Arc join создан, как раньше
    Evidence: .sisyphus/evidence/task-2-round-join-preserved.txt
  ```

  **Evidence to Capture**:
  - [ ] Скриншоты/вывод тестов для каждого сценария

  **Commit**: YES (standalone)
  - Message: `feat(offset): replace arc join fallback with U-shape bridge (Rule 3)`
  - Files: `src/operations/OffsetContourBuilder.js`
  - Pre-commit: `npm run test`

---

- [x] 3. Rule 1: OffsetEngine использует `skipArcAutoCorrect` при сериализации

  **What to do**:
  - В `src/operations/OffsetEngine.js`, метод `_processSegmentsSync`, строка 212:
    - Заменить `segmentsToSVGPath(normalizedFinalSegments)` на `segmentsToSVGPath(normalizedFinalSegments, false, { skipArcAutoCorrect: true })`
  - Это гарантирует что оффсетные арки не проходят через auto-correct
  - НЕ менять другие вызовы segmentsToSVGPath

  **Must NOT do**:
  - НЕ менять approximatePath в arcApproximation.js
  - НЕ менять другие вызовы segmentsToSVGPath

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Однострочное изменение — добавить options в вызов
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (depends on Task 1 being complete)
  - **Parallel Group**: Wave 1 (after Task 1)
  - **Blocks**: Task 4, Task 6
  - **Blocked By**: Task 1

  **References**:
  - `src/operations/OffsetEngine.js:212` — `let contourPathData = segmentsToSVGPath(normalizedFinalSegments);`
  - `src/utils/arcApproximation.js:20` — segmentsToSVGPath signature (после Task 1)

  **Acceptance Criteria**:
  - [ ] OffsetEngine сериализует арки без auto-correct
  - [ ] approximatePath продолжает использовать auto-correct

  **QA Scenarios**:
  ```
  Scenario: OffsetEngine не применяет auto-correct к аркам
    Tool: Bash (Vitest)
    Steps:
      1. Создать контур с аркой
      2. Вызвать OffsetEngine.processPath с offset
      3. Проверить что в result.pathData радиус арки = вычисленный offset radius (не chordLength/2)
    Expected Result: Радиус арки сохранён
    Evidence: .sisyphus/evidence/task-3-offset-no-autocorrect.txt
  ```

  **Commit**: YES (groups with 1)
  - Message: `feat(offset): add skipArcAutoCorrect option to segmentsToSVGPath (Rule 1)`
  - Files: `src/utils/arcApproximation.js`, `src/operations/OffsetEngine.js`
  - Pre-commit: `npm run test`

---

- [x] 4. Rule 1: Тесты arc serialization без auto-correct

  **What to do**:
  - Создать `tests/offset-rule1-arc-serialization.spec.js`
  - Тесты:
    1. segmentsToSVGPath по умолчанию — auto-correct работает
    2. segmentsToSVGPath с skipArcAutoCorrect — auto-correct пропущен
    3. OffsetEngine.processPath — арки без auto-correct
    4. approximatePath — auto-correct работает (regression)
  - Использовать геометрические инварианты, не пиксельные координаты

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Стандартные Vitest тесты, straightforward assertions

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Tasks 1, 3)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1, Task 3

  **References**:
  - `tests/offset-rules.spec.js` — стиль тестов, паттерны assertions
  - `tests/offset-arc-direct.spec.js` — тесты арочных оффсетов
  - `src/utils/arcApproximation.js:63-78` — auto-correct логика для тестирования

  **Acceptance Criteria**:
  - [ ] 4+ тестов проходят
  - [ ] Покрытие: default behavior, skip flag, OffsetEngine integration, approximatePath regression

  **QA Scenarios**:
  ```
  Scenario: Все тесты Rule 1 проходят
    Tool: Bash (Vitest)
    Steps:
      1. npx vitest run tests/offset-rule1-arc-serialization.spec.js
      2. Проверить: 0 failures, 4+ tests passed
    Expected Result: Все тесты проходят
    Evidence: .sisyphus/evidence/task-4-rule1-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `test(offset): add Rule 1 arc serialization tests`
  - Files: `tests/offset-rule1-arc-serialization.spec.js`
  - Pre-commit: `npm run test`

---

- [x] 5. Rule 3: Тесты U-bridge joins

  **What to do**:
  - Создать `tests/offset-rule3-ubridge.spec.js`
  - Тесты:
    1. U-bridge при failed sharp join (convex corner, miter limit exceeded)
    2. Fallback chain: U-bridge null → tangent bridge
    3. Fallback chain: tangent bridge null → createArcJoin + log.warn
    4. Round join НЕ использует U-bridge (regression)
    5. Concave corner НЕ использует U-bridge (regression)
  - Проверить непрерывность контура (end[i] ≈ start[i+1])
  - Проверить что U-bridge — это 3 line segments

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Требует создания контуров с specific geometric properties (acute angles, miter limit)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 2)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2

  **References**:
  - `tests/offset-rules.spec.js` — существующие тесты buildUShapeBridge
  - `tests/offset-build-contour-debug.spec.js` — паттерны тестирования buildOffsetContour
  - `src/operations/OffsetContourBuilder.js:27` — MITER_LIMIT = 4.0
  - `src/operations/OffsetRules.js:351-413` — buildUShapeBridge implementation

  **Acceptance Criteria**:
  - [ ] 5+ тестов проходят
  - [ ] U-bridge: 3 line segments между offset сегментами
  - [ ] Fallback chain: tangent bridge или arc join при null
  - [ ] Round join: arc segment (не U-bridge)
  - [ ] Concave: без изменений

  **QA Scenarios**:
  ```
  Scenario: Все тесты Rule 3 проходят
    Tool: Bash (Vitest)
    Steps:
      1. npx vitest run tests/offset-rule3-ubridge.spec.js
      2. Проверить: 0 failures, 5+ tests passed
    Expected Result: Все тесты проходят
    Evidence: .sisyphus/evidence/task-5-rule3-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `test(offset): add Rule 3 U-bridge join tests`
  - Files: `tests/offset-rule3-ubridge.spec.js`
  - Pre-commit: `npm run test`

---

- [x] 6. Rule 0: Тесты параллельности и равноудалённости

  **What to do**:
  - Создать `tests/offset-rule0-parallelism.spec.js`
  - Тесты инвариантов:
    1. Offset line segments параллельны оригинальным (dot product normals ≈ 1.0)
    2. Offset line segments равноудалены от оригинальных (perpendicular distance = offsetDistance ± tolerance)
    3. Offset arc segments имеют тот же центр (center unchanged)
    4. Контур с arc+line sharp соединением: сегменты параллельны после U-bridge
    5. Тест на примере пользователя: контур 2 из предоставленных данных
  - Использовать геометрические инварианты, не визуальную проверку

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Требует глубокого понимания геометрии оффсета и создания тестовых контуров

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Tasks 1, 2, 3)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1, Task 2, Task 3

  **References**:
  - `src/operations/OffsetCurveEvaluator.js:125-148` — offsetLine (параллельность через normal)
  - `src/operations/OffsetCurveEvaluator.js:166-240` — offsetArc (сохранение центра)
  - `src/operations/OffsetContourBuilder.js:251-293` — join logic
  - Пользовательский пример контура (из запроса):
    ```json
    [{"type":"polyline","contourId":4,"segIds":["seg-1","seg-2","seg-3"],"lines":[{"text":"M 10 10","segId":"m:4","lineGuid":"14de877b-fa98-4e74-9612-8ae88a1c8dec"},{"text":"L 2 10","segId":"seg-1","lineGuid":"2238baa2-407a-433d-9e5e-b0c62e2f7b88"},{"text":"A 2 2 0 0 1 0 8","segId":"seg-2","lineGuid":"64f79632-70c6-47b6-a5d4-587099b02689"},{"text":"L 0 16","segId":"seg-3","lineGuid":"9fe8b025-58af-4a30-b659-cf5038f88729"}],"transforms":[],"groupId":null,"parentGroupId":null}]
    ```

  **Acceptance Criteria**:
  - [ ] 5+ тестов проходят
  - [ ] Параллельность: dot product normals > 0.999
  - [ ] Равноудалённость: perpendicular distance = offsetDistance ± 1e-6
  - [ ] Центр арки: unchanged после offset
  - [ ] Пример пользователя: сегменты параллельны

  **QA Scenarios**:
  ```
  Scenario: Все тесты Rule 0 проходят
    Tool: Bash (Vitest)
    Steps:
      1. npx vitest run tests/offset-rule0-parallelism.spec.js
      2. Проверить: 0 failures, 5+ tests passed
    Expected Result: Все тесты проходят
    Evidence: .sisyphus/evidence/task-6-rule0-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `test(offset): add Rule 0 parallelism and equidistance invariant tests`
  - Files: `tests/offset-rule0-parallelism.spec.js`
  - Pre-commit: `npm run test`

---

- [ ] 7. Tangent connection: обработка G1 непрерывности (arc→line tangent)

  **What to do**:
  - В `computeJoinType` добавить проверку на tangent connection: `if (Math.abs(c) < EPSILON) return "tangent"`
  - В `buildOffsetContour`, после concave handling, добавить ветку для `cornerType === "tangent"`:
    - Создать tangent bridge между current.end и next.start
    - Использовать `buildTangentBridge(current, next)` для закрытия разрыва
    - Если tangent bridge возвращает null → fallback на createArcJoin
  - НЕ менять convex или concave handling
  - НЕ менять round join behavior

  **Must NOT do**:
  - НЕ менять computeJoinType для convex/concave cases
  - НЕ менять concave trim logic
  - НЕ добавлять новые join types или config options

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Требует понимания геометрии tangent connections и работы с cross product
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (depends on Task 2 being complete)
  - **Parallel Group**: Wave 3 (after Task 2)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2

  **References**:
  - `src/operations/OffsetContourBuilder.js:96-99` — computeJoinType function
  - `src/operations/OffsetContourBuilder.js:310-330` — concave corner handling
  - `src/operations/OffsetRules.js:323-331` — buildTangentBridge implementation
  - Пользовательский пример: contour 4 (arc→line tangent connection)

  **Acceptance Criteria**:
  - [ ] Tangent connection (cross ≈ 0) создаёт tangent bridge
  - [ ] Разрыв между arc end и line start закрыт
  - [ ] Пользовательский пример: contour 4 показывает непрерывный оффсет
  - [ ] Contour 5 (второй пример) тоже работает корректно
  - [ ] Concave и convex handling НЕ изменились

  **QA Scenarios**:
  ```
  Scenario: Tangent connection arc→line создаёт bridge
    Tool: Bash (Vitest)
    Steps:
      1. Создать контур: line → arc → line (tangent connection)
      2. Вызвать buildOffsetContour с joinType: "sharp"
      3. Проверить что между arc offset и line offset есть bridge segment
      4. Проверить непрерывность контура (end[i] ≈ start[i+1])
    Expected Result: Tangent bridge создан, контур непрерывен
    Evidence: .sisyphus/evidence/task-7-tangent-connection.txt

  Scenario: Пользовательский пример contour 4
    Tool: Bash (Vitest)
    Steps:
      1. Загрузить contour 4 из примера пользователя
      2. Вызвать buildOffsetContour с joinType: "sharp"
      3. Проверить что все сегменты соединены (нет разрывов)
      4. Проверить что offset segments параллельны оригинальным
    Expected Result: Непрерывный оффсет, параллельность сохранена
    Evidence: .sisyphus/evidence/task-7-user-contour4.txt
  ```

  **Commit**: YES
  - Message: `fix(offset): handle tangent connections (G1 continuity) with bridge`
  - Files: `src/operations/OffsetContourBuilder.js`
  - Pre-commit: `npm run test`

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1+3**: `feat(offset): add skipArcAutoCorrect option to segmentsToSVGPath (Rule 1)` — `src/utils/arcApproximation.js`, `src/operations/OffsetEngine.js`, `npm run test`
- **2**: `feat(offset): replace arc join fallback with U-shape bridge (Rule 3)` — `src/operations/OffsetContourBuilder.js`, `npm run test`
- **4**: `test(offset): add Rule 1 arc serialization tests` — `tests/offset-rule1-arc-serialization.spec.js`, `npm run test`
- **5**: `test(offset): add Rule 3 U-bridge join tests` — `tests/offset-rule3-ubridge.spec.js`, `npm run test`
- **6**: `test(offset): add Rule 0 parallelism and equidistance invariant tests` — `tests/offset-rule0-parallelism.spec.js`, `npm run test`

---

## Success Criteria

### Verification Commands
```bash
npm run test                                              # Full suite — zero regressions
npx vitest run tests/offset-rules.spec.js                # Existing bridge tests pass
npx vitest run tests/offset-build-contour-debug.spec.js  # Existing contour tests pass
npx vitest run tests/offset-rule1-arc-serialization.spec.js  # New Rule 1 tests
npx vitest run tests/offset-rule3-ubridge.spec.js           # New Rule 3 tests
npx vitest run tests/offset-rule0-parallelism.spec.js       # New Rule 0 tests
npm run build                                             # Production build
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (existing + new)
- [ ] Production build succeeds
- [ ] No changes to forbidden files (OffsetCurveEvaluator, OffsetCapper, OffsetTrimmer)
- [ ] Round join mode unchanged
- [ ] Concave corner handling unchanged
