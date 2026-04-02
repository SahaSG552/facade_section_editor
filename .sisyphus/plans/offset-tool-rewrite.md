# Offset Tool Rewrite — OCCT-Based Engine

## TL;DR

> **Quick Summary**: Полная перепись offset engine с нуля на основе алгоритма OCCT `Geom2d_OffsetCurve`. Текущий 7-stage pipeline + Clipper заменяется на чистую 5-компонентную архитектуру: Evaluator → ContourBuilder → Capper → Trimmer → Engine.
>
> **Deliverables**:
> - `src/operations/OffsetCurveEvaluator.js` — математическое ядро (line + arc offset)
> - `src/operations/OffsetContourBuilder.js` — contour processing + corner joins (Sharp/Round)
> - `src/operations/OffsetCapper.js` — open curve caps (Flat/Round)
> - `src/operations/OffsetTrimmer.js` — Paper.js Boolean trimming wrapper
> - `src/operations/OffsetEngine.js` — facade/orchestrator (новый вместо CustomOffsetProcessor)
> - `src/operations/offset/` — удалены все 7 старых stage файлов
> - `src/operations/ClipperOffsetProcessor.js` — удалён
> - `tests/offset/` — удалены все 13 тестовых файлов
> - `src/editor/tools/OffsetTool.js` — минимальная адаптация (импорт нового OffsetEngine)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Evaluator → ContourBuilder → Engine → OffsetTool

---

## Context

### Original Request
Пользователь провёл глубокое исследование алгоритма offset на основе OCCT `Geom2d_OffsetCurve`. Текущая реализация даёт неконсистентные результаты. Требуется полная перепись архитектуры и логики с сохранением только переиспользуемой инфраструктуры.

### Interview Summary
**Key Discussions**:
- **Segment types**: Только линии + дуги. Bézier аппроксимируются заранее через arcApproximation.js.
- **Corner joins**: Round + Sharp. Round = дуга радиусом |offset|, Sharp = miter intersection.
- **Self-intersection trimming**: Paper.js Boolean через существующий PaperBooleanProcessor.js.
- **Open curves**: Да, с Flat cap (линия) и Round cap (дуга радиусом |offset|).
- **Infrastructure reuse**: parseSVGPathSegments (ExportModule), arcApproximation.js, PaperBooleanProcessor.js.
- **Delete**: ClipperOffsetProcessor.js + все tests/offset/*.spec.js (13 файлов).
- **Scope**: Только engine. OffsetTool адаптируется минимально — только импорт.
- **Tests**: После реализации (не TDD).

**Research Findings**:
- Текущий pipeline: 7 stages в `src/operations/offset/` + CustomOffsetProcessor + ClipperOffsetProcessor.
- Data structures: segment objects `{type, start, end, arc: {...}}`, contours = Array<Segment>.
- Coordinate system: Y-down (SVG/Paper.js). Clipper использовал Y-flip — больше не нужен.
- PaperBooleanProcessor.js уже реализует `resolveSelfIntersections()` — готовый trimming solver.

### Metis Review
Metis consultation failed (timeout). Gaps identified through self-review below.

---

## Work Objectives

### Core Objective
Создать математически корректный offset engine на основе OCCT формулы, который консистентно обрабатывает линии, дуги, углы и self-intersections.

### Concrete Deliverables
- 5 новых файлов в `src/operations/` (Evaluator, ContourBuilder, Capper, Trimmer, Engine)
- Удаление 9 старых файлов (7 stages + ClipperOffsetProcessor + 13 тестов = 21 файл)
- Минимальная адаптация OffsetTool.js

### Definition of Done
- [ ] `npm run dev` — приложение запускается без ошибок
- [ ] `npm run build` — production build проходит
- [ ] `npm run test` — все оставшиеся тесты проходят (без удалённых)
- [ ] Offset работает на тестовых SVG путях (линии, дуги, mixed, open, closed)
- [ ] Corner joins (Sharp/Round) корректно обрабатываются
- [ ] Self-intersections разрешаются через Paper.js
- [ ] Open curves получают caps

### Must Have
- OCCT формула для offset: `Value(u) = BasisCurve.Value(U) + (Offset * N)` где N = нормаль
- Line offset: perpendicular translation
- Arc offset: concentric arc с radius ± |offset| (зависит от sweep direction)
- Sharp join: miter intersection двух продлённых линий
- Round join: arc радиусом |offset| tangent к обоим offset сегментам
- Flat cap: линия между концами offset
- Round cap: дуга радиусом |offset| между концами offset
- Paper.js Boolean для self-intersection trimming
- Интеграция с OffsetTool (минимальная — только импорт)

### Must NOT Have (Guardrails)
- **NO Clipper** — никаких импортов clipper2-lib-js
- **NO Bézier offset** — только линии и дуги. Bézier аппроксимируются заранее
- **NO Chamfer/Smooth joins** — только Sharp и Round
- **NO fallback stages** — один чистый pipeline без hybrid recovery
- **NO DI factories** — простые imports, без OffsetStageDepsFactory
- **NO metadata stages** — bbox/areas вычисляются по необходимости, не отдельным stage
- **NO старые stage файлы** — никаких ссылок на OffsetPrimitiveKernel, OffsetContourStages, и т.д.
- **NO изменение формата segment objects** — совместимость с существующим кодом

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: Tests-after (сначала реализация, потом тесты)
- **Framework**: Vitest
- **Agent-Executed QA**: ALWAYS (каждый task включает QA scenarios)

### QA Policy
Каждый task включает agent-executed QA scenarios:
- **Engine modules**: Bash (node REPL) — импорт, вызов функций, проверка результатов
- **Paper.js integration**: Playwright — проверка Boolean операций
- **OffsetTool integration**: Playwright — открытие приложения, выбор бита, offset preview

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — math core + utilities):
├── Task 1: Delete old files (Clipper + stages + tests) [quick]
├── Task 2: OffsetCurveEvaluator — math kernel [deep]
├── Task 3: OffsetCapper — open curve caps [quick]
└── Task 4: OffsetTrimmer — Paper.js wrapper [quick]

Wave 2 (Contour processing + orchestration):
├── Task 5: OffsetContourBuilder — contour + corners [deep]
└── Task 6: OffsetEngine — facade/orchestrator [deep]

Wave 3 (Integration + verification):
├── Task 7: OffsetTool adaptation [quick]
└── Task 8: End-to-end QA + build verification [unspecified-high]

Critical Path: Task 2 → Task 5 → Task 6 → Task 7 → Task 8
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix
- **1**: — — 2-7
- **2**: 1 — 5
- **3**: 1 — 5
- **4**: 1 — 5
- **5**: 2, 3 — 6
- **6**: 5 — 7
- **7**: 6 — 8
- **8**: 7 — —

### Agent Dispatch Summary
- **Wave 1**: 4 tasks — T1 → `quick`, T2 → `deep`/`@cad-engineer`, T3 → `quick`, T4 → `quick`
- **Wave 2**: 2 tasks — T5 → `deep`/`@cad-engineer`, T6 → `deep`
- **Wave 3**: 2 tasks — T7 → `quick`, T8 → `unspecified-high`

---

## TODOs

- [ ] 1. Delete Old Offset Files

  **What to do**:
  - Delete `src/operations/ClipperOffsetProcessor.js`
  - Delete all files in `src/operations/offset/` directory (7 files):
    - `OffsetPrimitiveKernel.js`, `OffsetContourStages.js`, `OffsetStageDepsFactory.js`
    - `OffsetNormalizationStage.js`, `OffsetTrimAcceptanceStage.js`, `OffsetFallbackStage.js`
    - `OffsetContourMetadataStage.js`, `OffsetSelfIntersectionStage.js`
  - Delete all files in `tests/offset/` directory (13 spec files)
  - Delete `src/operations/offset/` directory itself (empty after deletion)
  - Delete `tests/offset/` directory itself (empty after deletion)
  - Verify no remaining imports reference deleted files (grep for "ClipperOffsetProcessor", "OffsetPrimitiveKernel", "OffsetContourStages", etc.)

  **Must NOT do**:
  - Do NOT delete `src/operations/PaperBooleanProcessor.js` (needed for trimming)
  - Do NOT delete `src/utils/arcApproximation.js` (needed for arc fitting)
  - Do NOT delete `src/editor/tools/OffsetTool.js` (will be adapted later)
  - Do NOT delete `src/utils/offsetSeries.js` (needed for multi-step preview)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward file deletion + import verification
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `deslop`: Not needed — we know exactly which files to delete

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7 (all depend on clean state)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/operations/ClipperOffsetProcessor.js` — file to delete
  - `src/operations/offset/` — directory to delete (7 files)
  - `tests/offset/` — directory to delete (13 spec files)
  - `src/editor/tools/OffsetTool.js` — check for imports of deleted files

  **Acceptance Criteria**:
  - [ ] `src/operations/ClipperOffsetProcessor.js` does not exist
  - [ ] `src/operations/offset/` directory does not exist
  - [ ] `tests/offset/` directory does not exist
  - [ ] `grep -r "ClipperOffsetProcessor" src/` returns no results
  - [ ] `grep -r "OffsetPrimitiveKernel\|OffsetContourStages\|OffsetNormalizationStage\|OffsetTrimAcceptanceStage\|OffsetFallbackStage\|OffsetContourMetadataStage\|OffsetSelfIntersectionStage\|OffsetStageDepsFactory" src/` returns no results

  **QA Scenarios**:

  ```
  Scenario: Verify deleted files are gone
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: test -f src/operations/ClipperOffsetProcessor.js && echo "EXISTS" || echo "DELETED"
      2. Run: test -d src/operations/offset && echo "EXISTS" || echo "DELETED"
      3. Run: test -d tests/offset && echo "EXISTS" || echo "DELETED"
      4. All three should output "DELETED"
    Expected Result: All three outputs are "DELETED"
    Failure Indicators: Any output is "EXISTS"
    Evidence: .sisyphus/evidence/task-1-delete-verification.txt

  Scenario: Verify no stale imports remain
    Tool: Bash
    Preconditions: Files deleted
    Steps:
      1. Run: grep -rn "ClipperOffsetProcessor\|from.*ClipperOffset" src/ || echo "CLEAN"
      2. Run: grep -rn "OffsetPrimitiveKernel\|OffsetContourStages\|OffsetNormalizationStage\|OffsetTrimAcceptanceStage\|OffsetFallbackStage\|OffsetContourMetadataStage\|OffsetSelfIntersectionStage\|OffsetStageDepsFactory" src/ || echo "CLEAN"
      3. Both should output "CLEAN" (or no matches)
    Expected Result: No stale imports found in src/
    Evidence: .sisyphus/evidence/task-1-import-check.txt
  ```

  **Evidence to Capture:**
  - [ ] Output of file existence checks
  - [ ] Output of import grep checks

  **Commit**: YES
  - Message: `refactor(offset): remove old offset implementation (Clipper + stages + tests)`
  - Files: deleted files only
  - Pre-commit: `npm run test` (should pass with fewer tests)

- [ ] 2. OffsetCurveEvaluator — Math Kernel

  **What to do**:
  Create `src/operations/OffsetCurveEvaluator.js` — чистое математическое ядро offset.

  **Математика (OCCT formula)**:
  - `Value(u) = BasisCurve.Value(U) + Offset * N` где N = нормаль (tangent rotated 90°)
  - Для 2D: rotate tangent T(x,y) by 90° CCW → N(-y, x). Normalize N.
  - Positive offset = along N, negative = opposite N.

  **Line offset**:
  - Tangent constant: T = normalize(end - start)
  - Normal: N = rotate90CCW(T) = (-T.y, T.x)
  - Offset line: start' = start + Offset*N, end' = end + Offset*N
  - Return: `{ type: "line", start: start', end: end' }`

  **Arc offset**:
  - Tangent varies along arc. Но offset circular arc = concentric arc.
  - New radius = original_radius + sign * |offset|
  - Sign зависит от sweep direction и стороны offset:
    - sweepFlag=1 (CCW) + positive offset → radius + offset (outside)
    - sweepFlag=1 (CCW) + negative offset → radius - offset (inside)
    - sweepFlag=0 (CW) + positive offset → radius - offset (inside)
    - sweepFlag=0 (CW) + negative offset → radius + offset (outside)
  - Формула: `newRadius = radius + offset * (sweepFlag === 1 ? 1 : -1)`
  - Center stays the same, startAngle/endAngle stay the same
  - Return: `{ type: "arc", start: start', end: end', arc: { ...updated radius... } }`
  - start' и end' пересчитываются из newRadius + same angles

  **Required functions**:
  - `offsetLine(segment, distance)` → offset line segment
  - `offsetArc(segment, distance)` → offset arc segment
  - `offsetSegment(segment, distance)` → dispatcher by type
  - `rotate90CCW(vec)` → rotate vector 90° counter-clockwise
  - `normalize(vec)` → unit vector
  - `tangentAtArc(angle, center, sweepFlag)` → tangent vector at arc point

  **Must NOT do**:
  - Do NOT handle Bézier segments (caller must approximate first)
  - Do NOT handle corner joins (this is pure per-segment offset)
  - Do NOT handle self-intersections
  - Do NOT modify input segments (return new objects)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Requires precise mathematical implementation with correct sign handling for arc sweep directions
  - **Skills**: `["cad-geometry"]`
    - `cad-geometry`: Domain overlap — computational geometry, offset curves, tangent/normal calculations
  - **Skills Evaluated but Omitted**:
    - `paperjs-mastery`: Not needed — this is pure math, no Paper.js dependency
    - `csg-threejs`: Not needed — 2D only, no 3D CSG

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 3, 4)
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 5 (ContourBuilder depends on Evaluator)
  - **Blocked By**: Task 1 (clean state)

  **References**:
  - `src/utils/arcApproximation.js` — existing arc utilities, understand arc data structure
  - `src/operations/CustomOffsetProcessor.js` — read BEFORE deletion to understand current segment format
  - `src/export/ExportModule.js` — parseSVGPathSegments output format (segment shape)
  - `src/operations/PaperBooleanProcessor.js` — understand what segment format it expects as input

  **Acceptance Criteria**:
  - [ ] `offsetLine` correctly translates line perpendicular to direction
  - [ ] `offsetArc` correctly creates concentric arc with adjusted radius
  - [ ] Arc sweep direction correctly affects radius sign
  - [ ] Negative distance produces opposite-side offset
  - [ ] Input segments are not mutated
  - [ ] All public functions have JSDoc with parameter types and return descriptions

  **QA Scenarios**:

  ```
  Scenario: Line offset — horizontal line, positive distance
    Tool: Bash (node REPL)
    Preconditions: OffsetCurveEvaluator.js created
    Steps:
      1. Create test script that imports OffsetCurveEvaluator
      2. Call offsetLine({type:"line", start:{x:0,y:0}, end:{x:10,y:0}}, 5)
      3. Expected: start={x:0,y:5}, end={x:10,y:5} (offset upward for Y-down + CCW normal)
      4. Log result and compare
    Expected Result: Offset line is parallel, 5 units above original
    Failure Indicators: Offset direction wrong, distance incorrect, or mutation of input
    Evidence: .sisyphus/evidence/task-2-line-offset-positive.txt

  Scenario: Line offset — vertical line, negative distance
    Tool: Bash (node REPL)
    Preconditions: OffsetCurveEvaluator.js created
    Steps:
      1. Call offsetLine({type:"line", start:{x:0,y:0}, end:{x:0,y:10}}, -3)
      2. Expected: offset to the left (negative distance reverses normal)
      3. Log result
    Expected Result: Offset line is 3 units to the left of original
    Evidence: .sisyphus/evidence/task-2-line-offset-negative.txt

  Scenario: Arc offset — CCW arc, positive distance (outside)
    Tool: Bash (node REPL)
    Preconditions: OffsetCurveEvaluator.js created
    Steps:
      1. Call offsetArc with sweepFlag=1, radius=10, distance=3
      2. Expected: newRadius = 10 + 3 = 13 (outside for CCW)
      3. Verify center unchanged, angles unchanged
      4. Verify start/end points lie on new radius
    Expected Result: Concentric arc with radius 13, same center and angles
    Evidence: .sisyphus/evidence/task-2-arc-offset-ccw-positive.txt

  Scenario: Arc offset — CW arc, positive distance (inside)
    Tool: Bash (node REPL)
    Preconditions: OffsetCurveEvaluator.js created
    Steps:
      1. Call offsetArc with sweepFlag=0, radius=10, distance=3
      2. Expected: newRadius = 10 - 3 = 7 (inside for CW)
      3. Verify newRadius > 0 (handle degenerate case where offset >= radius)
    Expected Result: Concentric arc with radius 7
    Failure Indicators: newRadius <= 0 without handling
    Evidence: .sisyphus/evidence/task-2-arc-offset-cw-positive.txt

  Scenario: Input immutability
    Tool: Bash (node REPL)
    Preconditions: OffsetCurveEvaluator.js created
    Steps:
      1. Create segment = {type:"line", start:{x:0,y:0}, end:{x:10,y:0}}
      2. Call offsetSegment(segment, 5)
      3. Verify segment.start === {x:0,y:0} (unchanged)
    Expected Result: Original segment unchanged, new object returned
    Evidence: .sisyphus/evidence/task-2-immutability.txt
  ```

  **Evidence to Capture:**
  - [ ] Each QA scenario output saved to evidence file
  - [ ] Screenshots of REPL output showing correct calculations

  **Commit**: YES (groups with 3, 4)
  - Message: `feat(offset): implement OffsetCurveEvaluator math kernel`
  - Files: `src/operations/OffsetCurveEvaluator.js`
  - Pre-commit: `npm run test`

- [ ] 3. OffsetCapper — Open Curve Caps

  **What to do**:
  Create `src/operations/OffsetCapper.js` — добавляет caps к open curves.

  **Flat cap**:
  - Прямая линия от start of one offset curve к start of opposite side
  - Для open contour: соединяем start точки original curve's offset на +distance и -distance

  **Round cap**:
  - Дуга радиусом |offset| connecting the two endpoints
  - Center = original curve's start (или end) point
  - Sweep direction зависит от orientation

  **Required functions**:
  - `capFlat(startPoint, endPoint)` → line segment cap
  - `capRound(center, radius, startAngle, endAngle, sweepFlag)` → arc cap
  - `capOpenContour(contour, distance, capType)` → adds caps to both ends of open contour

  **Must NOT do**:
  - Do NOT cap closed contours
  - Do NOT modify the original contour segments

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple geometric construction — lines and arcs between known points
  - **Skills**: `["cad-geometry"]`
    - `cad-geometry`: Geometric construction of arc caps between endpoints
  - **Skills Evaluated but Omitted**:
    - `paperjs-mastery`: Not needed — pure math, no Paper.js rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 5 (ContourBuilder uses Capper for open curves)
  - **Blocked By**: Task 1 (clean state)

  **References**:
  - `src/operations/OffsetCurveEvaluator.js` (Task 2) — segment format compatibility
  - `src/utils/arcApproximation.js` — arc construction utilities

  **Acceptance Criteria**:
  - [ ] Flat cap creates line segment between two points
  - [ ] Round cap creates arc with radius = |offset distance|
  - [ ] capOpenContour adds caps at both start and end of open contour
  - [ ] Closed contours are not capped

  **QA Scenarios**:

  ```
  Scenario: Flat cap on open contour
    Tool: Bash (node REPL)
    Preconditions: OffsetCapper.js created
    Steps:
      1. Create open contour: [{type:"line", start:{x:0,y:0}, end:{x:10,y:0}}]
      2. Call capOpenContour(contour, 5, "flat")
      3. Verify cap segments added at start and end
      4. Verify result is a closed loop (last segment end = first segment start)
    Expected Result: Contour with 3 segments (original line + 2 flat caps forming closed loop)
    Evidence: .sisyphus/evidence/task-3-flat-cap.txt

  Scenario: Round cap on open contour
    Tool: Bash (node REPL)
    Preconditions: OffsetCapper.js created
    Steps:
      1. Same open contour as above
      2. Call capOpenContour(contour, 5, "round")
      3. Verify arc caps with radius 5 at both ends
    Expected Result: Contour with arc caps at both ends, forming closed loop
    Evidence: .sisyphus/evidence/task-3-round-cap.txt
  ```

  **Evidence to Capture:**
  - [ ] QA scenario outputs saved to evidence files

  **Commit**: YES (groups with 2, 4)
  - Message: `feat(offset): implement OffsetCapper for open curve caps`
  - Files: `src/operations/OffsetCapper.js`
  - Pre-commit: `npm run test`

- [ ] 4. OffsetTrimmer — Paper.js Boolean Wrapper

  **What to do**:
  Create `src/operations/OffsetTrimmer.js` — wrapper вокруг PaperBooleanProcessor для self-intersection trimming.

  **Logic**:
  - Принимает массив offset сегментов (возможно self-intersecting)
  - Конвертирует сегменты в SVG path string (используя segmentsToSVGPath из arcApproximation.js)
  - Вызывает PaperBooleanProcessor.resolveSelfIntersections(pathData)
  - Парсит результат обратно в массив сегментов
  - Возвращает clean, non-intersecting contour(s)

  **Required functions**:
  - `trimSelfIntersections(segments)` → clean segments array
  - `segmentsToPathString(segments)` → helper using arcApproximation.js
  - `pathStringToSegments(pathString)` → helper using ExportModule.dxfExporter.parseSVGPathSegments

  **Must NOT do**:
  - Do NOT implement own intersection detection
  - Do NOT modify PaperBooleanProcessor.js
  - Do NOT handle non-segment input

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Thin wrapper around existing PaperBooleanProcessor
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `paperjs-mastery`: Not needed — PaperBooleanProcessor already handles Paper.js

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 5 (ContourBuilder uses Trimmer)
  - **Blocked By**: Task 1 (clean state)

  **References**:
  - `src/operations/PaperBooleanProcessor.js` — resolveSelfIntersections function signature
  - `src/utils/arcApproximation.js` — segmentsToSVGPath function
  - `src/export/ExportModule.js` — parseSVGPathSegments function
  - `src/operations/CustomOffsetProcessor.js` — read BEFORE deletion to understand how it currently uses PaperBooleanProcessor

  **Acceptance Criteria**:
  - [ ] Trimmer correctly calls PaperBooleanProcessor.resolveSelfIntersections
  - [ ] Input segments → path string → Paper.js → segments round-trip works
  - [ ] Self-intersecting input produces clean, non-intersecting output
  - [ ] Non-intersecting input passes through unchanged

  **QA Scenarios**:

  ```
  Scenario: Trim self-intersecting contour
    Tool: Bash (node REPL or test script)
    Preconditions: OffsetTrimmer.js created, PaperBooleanProcessor available
    Steps:
      1. Create self-intersecting segments (e.g., concave corner with large offset)
      2. Call trimSelfIntersections(segments)
      3. Verify output has no self-intersections (use Paper.js to check)
    Expected Result: Clean contour without overlapping loops
    Failure Indicators: Output still has self-intersections, or empty result
    Evidence: .sisyphus/evidence/task-4-trim-self-intersecting.txt

  Scenario: Pass-through non-intersecting contour
    Tool: Bash (node REPL)
    Preconditions: OffsetTrimmer.js created
    Steps:
      1. Create simple non-intersecting contour (rectangle offset)
      2. Call trimSelfIntersections(segments)
      3. Verify output matches input (or equivalent)
    Expected Result: Output segments equivalent to input
    Evidence: .sisyphus/evidence/task-4-trim-passthrough.txt
  ```

  **Evidence to Capture:**
  - [ ] QA scenario outputs saved to evidence files

  **Commit**: YES (groups with 2, 3)
  - Message: `feat(offset): implement OffsetTrimmer with Paper.js Boolean`
  - Files: `src/operations/OffsetTrimmer.js`
  - Pre-commit: `npm run test`

- [ ] 5. OffsetContourBuilder — Contour Processing + Corner Joins

  **What to do**:
  Create `src/operations/OffsetContourBuilder.js` — обрабатывает контур: применяет Evaluator к каждому сегменту, обрабатывает углы (Sharp/Round), определяет open/closed.

  **Logic**:
  1. Принимает массив сегментов контура + distance + options
  2. Определяет closed vs open (last segment end ≈ first segment start)
  3. Для каждого сегмента вызывает OffsetCurveEvaluator.offsetSegment()
  4. Для каждой пары соседних offset сегментов:
     - Вычисляет cross product их tangents для определения convex/concave
     - **Convex corner** (gap): применяет join (Sharp или Round)
       - **Sharp join**: найти intersection двух продлённых offset линий
       - **Round join**: создать arc радиусом |offset| tangent к обоим сегментам
     - **Concave corner** (overlap): просто соединить — trimming later handles it
  5. Если open curve: вызывает OffsetCapper.capOpenContour()
  6. Возвращает массив offset сегментов (возможно self-intersecting)

  **Sharp Join (Miter)**:
  - Line-line intersection: продлить оба offset сегмента до пересечения
  - Если miter_length / offset > 4 (miter limit), fallback to Round join

  **Round Join**:
  - Создать arc радиусом |offset| tangent к обоим сегментам
  - Center arc = vertex (original corner point)

  **Convex/Concave Determination**:
  - Cross product of incoming tangent and outgoing tangent at vertex
  - For Y-down: cross > 0 = convex (outward), cross < 0 = concave (inward)
  - Convex → gap → need join. Concave → overlap → no join (trimming handles)

  **Required functions**:
  - `buildOffsetContour(segments, distance, options)` → main entry point
  - `computeJoinType(inTangent, outTangent)` → "convex" | "concave"
  - `applySharpJoin(seg1, seg2)` → extend to intersection
  - `applyRoundJoin(seg1, seg2, vertex, distance)` → arc between segments
  - `lineLineIntersection(p1, d1, p2, d2)` → find intersection point
  - `isClosedContour(segments)` → check if last end ≈ first start

  **Must NOT do**:
  - Do NOT handle self-intersections (delegated to OffsetTrimmer)
  - Do NOT handle Bézier segments
  - Do NOT implement Chamfer or Smooth joins
  - Do NOT modify input segments

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Most complex task — convex/concave detection, join geometry, miter limit
  - **Skills**: `["cad-geometry"]`
    - `cad-geometry`: Line-line intersection, arc construction, convex/concave determination
  - **Skills Evaluated but Omitted**:
    - `paperjs-mastery`: Not needed — pure math, Paper.js only in Trimmer

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 2, 3, 4)
  - **Parallel Group**: Wave 2 (with Task 6)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 2, 3, 4

  **References**:
  - `src/operations/OffsetCurveEvaluator.js` (Task 2)
  - `src/operations/OffsetCapper.js` (Task 3)
  - `src/operations/OffsetTrimmer.js` (Task 4)
  - `src/operations/CustomOffsetProcessor.js` — read BEFORE deletion for current join logic
  - `src/operations/offset/OffsetContourStages.js` — read BEFORE deletion for applyMiterJoin

  **Acceptance Criteria**:
  - [ ] Correctly offsets all segments in a contour
  - [ ] Sharp join creates intersection point for convex corners
  - [ ] Round join creates tangent arc for convex corners
  - [ ] Concave corners left as-is (overlap for trimming)
  - [ ] Open contours get caps, closed do not
  - [ ] Miter limit prevents excessive sharp joins

  **QA Scenarios**:

  ```
  Scenario: Closed rectangle — Sharp join
    Tool: Bash (node REPL)
    Preconditions: OffsetContourBuilder.js + OffsetCurveEvaluator.js created
    Steps:
      1. Create closed rectangle: 4 line segments, 100x100
      2. Call buildOffsetContour(rectangle, 10, {joinType: "sharp"})
      3. Verify 4 offset segments with sharp corners
      4. Verify dimensions ~120x120
    Expected Result: Larger closed rectangle with sharp corners
    Evidence: .sisyphus/evidence/task-5-rectangle-sharp.txt

  Scenario: Closed rectangle — Round join
    Tool: Bash (node REPL)
    Steps:
      1. Same rectangle, joinType: "round"
      2. Verify 4 offset lines + 4 round arc corners
    Expected Result: Rectangle with rounded corners (8 segments)
    Evidence: .sisyphus/evidence/task-5-rectangle-round.txt

  Scenario: Concave L-shape — overlap at concave corner
    Tool: Bash (node REPL)
    Steps:
      1. Create L-shaped contour (concave corner)
      2. Call buildOffsetContour(L_shape, 20, {joinType: "sharp"})
      3. Verify concave corner has overlapping segments (not joined)
    Expected Result: Offset contour with overlapping segments at concave corner
    Evidence: .sisyphus/evidence/task-5-lshape-concave.txt

  Scenario: Open line — Flat cap
    Tool: Bash (node REPL)
    Steps:
      1. Single line segment (open)
      2. Call buildOffsetContour([line], 5, {joinType: "sharp", capType: "flat"})
      3. Verify caps at both ends, closed loop
    Expected Result: Closed loop with flat caps
    Evidence: .sisyphus/evidence/task-5-open-line-flat-cap.txt

  Scenario: Miter limit fallback
    Tool: Bash (node REPL)
    Steps:
      1. Very sharp angle (< 15 degrees)
      2. Call buildOffsetContour(sharp_angle, 10, {joinType: "sharp"})
      3. Verify miter limit triggered, Round join used
    Expected Result: Round join at sharp corner
    Evidence: .sisyphus/evidence/task-5-miter-limit.txt
  ```

  **Evidence to Capture:**
  - [ ] Each QA scenario output saved to evidence file

  **Commit**: YES (groups with 6)
  - Message: `feat(offset): implement OffsetContourBuilder with corner joins`
  - Files: `src/operations/OffsetContourBuilder.js`
  - Pre-commit: `npm run test`

- [ ] 6. OffsetEngine — Facade/Orchestrator

  **What to do**:
  Create `src/operations/OffsetEngine.js` — главный facade, заменяющий CustomOffsetProcessor.js.

  **Orchestration flow**:
  1. Accept input: array of segments OR SVG path string
  2. If SVG path string: parse using ExportModule.dxfExporter.parseSVGPathSegments()
  3. Split segments into contours
  4. For each contour:
     a. OffsetCurveEvaluator.offsetSegment() for each segment
     b. OffsetContourBuilder.buildOffsetContour() for joins
     c. OffsetTrimmer.trimSelfIntersections() for cleanup
  5. Convert result segments to SVG path string
  6. Return: { contours: [segments], pathData: string, metadata: {...} }

  **API (must match CustomOffsetProcessor for OffsetTool compatibility)**:
  ```javascript
  class OffsetEngine {
    constructor(options = {}) {
      // options: { joinType: "sharp"|"round", capType: "flat"|"round", ... }
    }
    async processPath(pathData, distance, options = {}) {
      // Returns: { pathData: string, contours: [...], metadata: {...} }
    }
    async processSegments(segments, distance, options = {}) {
      // Alternative entry point — raw segments input
    }
  }
  ```

  **Must NOT do**:
  - Do NOT implement offset math directly (use Evaluator)
  - Do NOT handle Clipper (deleted)
  - Do NOT implement fallback/recovery logic
  - Do NOT change return format from what OffsetTool expects

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration task — wire all components, maintain API compatibility
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 5)
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 5

  **References**:
  - `src/operations/CustomOffsetProcessor.js` — read BEFORE deletion for API compatibility
  - `src/operations/OffsetCurveEvaluator.js` (Task 2)
  - `src/operations/OffsetContourBuilder.js` (Task 5)
  - `src/operations/OffsetCapper.js` (Task 3)
  - `src/operations/OffsetTrimmer.js` (Task 4)
  - `src/editor/tools/OffsetTool.js` — understand how it calls processor
  - `src/utils/arcApproximation.js` — segmentsToSVGPath function

  **Acceptance Criteria**:
  - [ ] processPath() accepts SVG path string, returns offset result
  - [ ] processSegments() accepts segment array, returns offset result
  - [ ] Return format matches OffsetTool expectations
  - [ ] Options (joinType, capType) passed through correctly
  - [ ] Multiple contours handled
  - [ ] Empty input handled gracefully

  **QA Scenarios**:

  ```
  Scenario: Full pipeline — closed rectangle, Sharp joins
    Tool: Bash (node REPL)
    Preconditions: All offset modules created
    Steps:
      1. new OffsetEngine({joinType: "sharp"})
      2. processPath("M 0 0 L 100 0 L 100 100 L 0 100 Z", 10)
      3. Verify pathData valid SVG, contours array populated
    Expected Result: Valid offset path ~120x120 rectangle
    Evidence: .sisyphus/evidence/task-6-engine-rectangle-sharp.txt

  Scenario: Full pipeline — closed rectangle, Round joins
    Tool: Bash (node REPL)
    Steps:
      1. new OffsetEngine({joinType: "round"})
      2. processPath(same rectangle, 10)
      3. Verify pathData contains arc commands (A) for corners
    Expected Result: Rectangle with rounded corners
    Evidence: .sisyphus/evidence/task-6-engine-rectangle-round.txt

  Scenario: Full pipeline — L-shape with self-intersection trimming
    Tool: Bash (node REPL)
    Steps:
      1. new OffsetEngine({joinType: "sharp"})
      2. processPath(L-shape path, 20)
      3. Verify no self-intersections in result
    Expected Result: Clean L-shape without overlapping loops
    Evidence: .sisyphus/evidence/task-6-engine-lshape.txt

  Scenario: Full pipeline — open curve with Flat cap
    Tool: Bash (node REPL)
    Steps:
      1. new OffsetEngine({joinType: "sharp", capType: "flat"})
      2. processPath("M 0 0 L 100 0", 5)
      3. Verify result is closed loop with caps
    Expected Result: Closed shape with flat caps
    Evidence: .sisyphus/evidence/task-6-engine-open-flat.txt
  ```

  **Evidence to Capture:**
  - [ ] Each QA scenario output saved to evidence file

  **Commit**: YES (groups with 5)
  - Message: `feat(offset): implement OffsetEngine facade/orchestrator`
  - Files: `src/operations/OffsetEngine.js`
  - Pre-commit: `npm run test`

- [ ] 7. OffsetTool Adaptation

  **What to do**:
  Modify `src/editor/tools/OffsetTool.js` — минимальная адаптация для использования нового OffsetEngine.

  **Changes needed**:
  1. Replace import: `import OffsetEngine from "../operations/OffsetEngine.js"`
  2. Remove Clipper vs Custom selection logic — always use OffsetEngine
  3. Update processor instantiation: `this.processor = new OffsetEngine(options)`
  4. Verify API compatibility
  5. Remove Clipper-specific options/flags from UI
  6. Keep all UI logic, preview rendering, segment parsing unchanged

  **Must NOT do**:
  - Do NOT rewrite OffsetTool UI logic
  - Do NOT change preview rendering or user interaction flow

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Minimal import swap + cleanup
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 6)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: Task 6

  **References**:
  - `src/editor/tools/OffsetTool.js` — file to modify
  - `src/operations/OffsetEngine.js` (Task 6) — new import target
  - `src/operations/CustomOffsetProcessor.js` — read BEFORE deletion for current API

  **Acceptance Criteria**:
  - [ ] OffsetTool imports OffsetEngine instead of CustomOffsetProcessor
  - [ ] No references to ClipperOffsetProcessor remain
  - [ ] `npm run dev` — app launches without import errors
  - [ ] Offset preview works in UI

  **QA Scenarios**:

  ```
  Scenario: Build succeeds with no import errors
    Tool: Bash
    Preconditions: OffsetTool adapted, OffsetEngine created
    Steps:
      1. Run: npm run build
      2. Verify exit code 0, no import errors
    Expected Result: Clean build
    Evidence: .sisyphus/evidence/task-7-build-check.txt

  Scenario: No stale Clipper references
    Tool: Bash
    Steps:
      1. Run: grep -n "Clipper\|clipper\|CustomOffsetProcessor" src/editor/tools/OffsetTool.js || echo "CLEAN"
    Expected Result: "CLEAN"
    Evidence: .sisyphus/evidence/task-7-no-clipper-refs.txt
  ```

  **Evidence to Capture:**
  - [ ] Build output
  - [ ] Grep results for stale references

  **Commit**: YES
  - Message: `refactor(offset): adapt OffsetTool to use new OffsetEngine`
  - Files: `src/editor/tools/OffsetTool.js`
  - Pre-commit: `npm run build`

- [ ] 8. End-to-End QA + Build Verification

  **What to do**:
  Финальная верификация: build, lint, test, и runtime QA нового offset engine.

  **Verification steps**:
  1. `npm run build` — production build passes
  2. `npm run test` — all remaining tests pass
  3. `npm run dev` — app launches
  4. Visual QA: open app, draw shapes, apply offset, verify results
  5. Verify no console errors during offset operations

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Comprehensive verification across build, test, and runtime
  - **Skills**: `["test-facade", "build-facade"]`
    - `test-facade`: Run Vitest tests
    - `build-facade`: Run production build

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 7)
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: —
  - **Blocked By**: Task 7

  **References**:
  - All new offset files (Tasks 2-6)
  - `src/editor/tools/OffsetTool.js` (Task 7)

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds
  - [ ] `npm run test` passes
  - [ ] `npm run dev` launches without errors
  - [ ] No console errors during offset operations
  - [ ] Offset produces visually correct results

  **QA Scenarios**:

  ```
  Scenario: Production build succeeds
    Tool: Bash
    Preconditions: All tasks complete
    Steps:
      1. Run: npm run build
      2. Verify exit code 0
    Expected Result: Clean build
    Evidence: .sisyphus/evidence/task-8-build-output.txt

  Scenario: Test suite passes
    Tool: Bash
    Steps:
      1. Run: npm run test
      2. Verify all tests pass
    Expected Result: All remaining tests pass
    Evidence: .sisyphus/evidence/task-8-test-output.txt

  Scenario: App launches and offset works
    Tool: Playwright
    Preconditions: App running on dev server
    Steps:
      1. Navigate to app URL
      2. Draw a rectangle on canvas
      3. Select rectangle, activate Offset tool
      4. Set offset distance to 10
      5. Verify offset preview appears correctly
      6. Screenshot result
    Expected Result: Offset preview shows correct offset shape
    Failure Indicators: No preview, incorrect shape, console errors
    Evidence: .sisyphus/evidence/task-8-offset-preview-screenshot.png
  ```

  **Evidence to Capture:**
  - [ ] Build output log
  - [ ] Test output log
  - [ ] Screenshot of offset preview

  **Commit**: YES
  - Message: `chore(offset): final verification and cleanup`
  - Files: none (verification only)
  - Pre-commit: `npm run build && npm run test`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `refactor(offset): remove old offset implementation (Clipper + stages + tests)` — deleted files only — `npm run test`
- **2-4**: `feat(offset): implement offset math kernel, capper, and trimmer` — OffsetCurveEvaluator.js, OffsetCapper.js, OffsetTrimmer.js — `npm run test`
- **5-6**: `feat(offset): implement contour builder and engine orchestrator` — OffsetContourBuilder.js, OffsetEngine.js — `npm run test`
- **7**: `refactor(offset): adapt OffsetTool to use new OffsetEngine` — OffsetTool.js — `npm run build`
- **8**: `chore(offset): final verification and cleanup` — verification only — `npm run build && npm run test`

---

## Success Criteria

### Verification Commands
```bash
npm run build    # Expected: clean build, no errors
npm run test     # Expected: all remaining tests pass
npm run dev      # Expected: app launches, no console errors
```

### Final Checklist
- [ ] All "Must Have" present (Evaluator, ContourBuilder, Capper, Trimmer, Engine)
- [ ] All "Must NOT Have" absent (no Clipper, no old stages, no Bézier offset)
- [ ] All remaining tests pass
- [ ] OffsetTool works with new OffsetEngine
- [ ] Sharp and Round joins produce correct results
- [ ] Self-intersections trimmed via Paper.js
- [ ] Open curves capped correctly
- [ ] Production build succeeds
