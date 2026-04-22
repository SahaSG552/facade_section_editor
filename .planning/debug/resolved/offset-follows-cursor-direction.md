---
status: resolved
trigger: "Оффсет для развернутого направления открытого контура идет в противоположную сторону курсора"
created: 2026-04-09T00:00:00Z
updated: 2026-04-11T09:45:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED — convex line→arc join was incorrectly using circle-line intersection that inverted arc orientation when arc grows outward
test: Full test suite 244/245 passing (only pre-existing task-6-scenario3 failure remains)
expecting: cursor-side arc preservation test now passes
next_action: DONE — session complete

## Symptoms

expected: Открытый контур должен смещаться в сторону курсора независимо от направления контура; для замкнутого контура внутрь = отрицательный, наружу = положительный
actual: Для развернутого направления того же открытого контура при курсоре вниз оффсет идет в противоположную сторону при distance=+2
errors: Нет runtime-ошибок, ошибка геометрического поведения (неверная сторона смещения)
reproduction: 1) Вставить пример 1 и сделать offset -2 при курсоре вниз -> корректно. 2) Вставить пример 2 (тот же контур, обратное направление) и сделать offset +2 при курсоре вниз -> смещение идет не к курсору, а в обратную сторону
started: Текущее поведение в текущей реализации выбора стороны для открытого контура

## Eliminated

## Evidence

- timestamp: 2026-04-09T00:00:00Z
  checked: Пользовательское описание 2 геометрически эквивалентных примеров с разной ориентацией
  found: Результат оффсета для открытого контура зависит от направления обхода
  implication: Логика выбора side/sign для open contour не инвариантна к реверсу сегментов

- timestamp: 2026-04-09T00:10:00Z
  checked: src/operations/OffsetEngine.js (\_processPathSync, \_processSegmentsSync)
  found: \_resolveCursorSideDistance сначала выбирает знак от курсора, но в open one-sided далее вызывается buildOffsetContour с effectiveDistance, зависящим от signedArea
  implication: Для open one-sided знак переопределяется логикой ориентации контура, поэтому реверс направления меняет сторону оффсета

- timestamp: 2026-04-09T00:18:00Z
  checked: src/operations/OffsetEngine.js и новый regression test
  found: В open one-sided удалено переопределение знака через signedArea; buildOffsetContour получает distance напрямую
  implication: Выбор стороны для открытого контура теперь определяется cursor-side резолвером, инвариантно к направлению обхода

- timestamp: 2026-04-09T00:22:00Z
  checked: tests/offset-user-example.spec.js
  found: Упал legacy-кейс без cursorPoint (ожидался arc radius≈3, получен 1)
  implication: Полное отключение orientation-based sign для open one-sided ломает старое поведение, нужен условный режим (только для cursor-side)

- timestamp: 2026-04-09T00:28:00Z
  checked: tests/offset-cursor-direction-invariance.spec.js, tests/offset-cursor-side.spec.js, tests/offset-user-example.spec.js
  found: 3/3 files passed, 5/5 tests passed
  implication: Исправление работает для cursor-side инвариантности и не ломает проверенный соседний legacy-путь

- timestamp: 2026-04-09T00:40:00Z
  checked: user feedback after UI verification
  found: Визуально поведение не изменилось в обоих пользовательских примерах
  implication: Вероятна проблема интеграции/передачи опций в runtime-потоке, а не в ядре OffsetEngine

- timestamp: 2026-04-09T00:48:00Z
  checked: src/editor/tools/OffsetTool.js (buildOffsetCandidate, \_doRefreshPreview)
  found: calculateOffsetFromPathData вызывается без sideResolution/cursorPoint; следовательно \_resolveCursorSideDistance в OffsetEngine не активируется
  implication: Объясняет отсутствие видимого эффекта в UI при пройденных unit-тестах ядра

- timestamp: 2026-04-09T00:56:00Z
  checked: src/editor/tools/OffsetTool.js + targeted tests
  found: Добавлена передача sideResolution=nearest-segment-normal и cursorPoint в buildOffsetCandidate для open контуров; cursorPoint конвертируется в path-space с учетом RT transforms и SVG Y-flip
  implication: Runtime preview/commit должны использовать cursor-driven сторону независимо от направления открытого контура

- timestamp: 2026-04-09T00:56:00Z
  checked: npm run test -- tests/offset-cursor-direction-invariance.spec.js tests/offset-cursor-side.spec.js tests/offset-user-example.spec.js
  found: 3/3 files passed, 5/5 tests passed
  implication: Интеграционный патч не сломал проверенные регрессионные кейсы ядра

- timestamp: 2026-04-09T01:06:00Z
  checked: user feedback after integration fix
  found: Сторона смещения теперь корректная, но shape-инвариантность между forward/reversed примером не достигнута
  implication: Осталась самостоятельная ошибка в геометрической сборке offset-контура (не в side-resolution)

- timestamp: 2026-04-09T01:14:00Z
  checked: tests/offset-open-line-arc-reverse-shape-invariance.spec.js
  found: forward(-2) дал 5 сегментов, reversed(+2) дал 6 сегментов; зафиксирован warning "failed to offset segment 1, type=arc" только для reversed случая
  implication: Сбой происходит в arc offset стадии до join processing, что и рождает shape mismatch

- timestamp: 2026-04-09T01:24:00Z
  checked: src/operations/OffsetCurveEvaluator.js
  found: Формула newRadius использовала (sweepFlag === 1 ? -1 : 1), что инвертировано относительно документированной геометрии и ломает зеркальную инвариантность при реверсе
  implication: Исправление на (sweepFlag === 1 ? 1 : -1) выравнивает поведение CW/CCW дуг для эквивалентных open-offset сценариев

## Resolution

root_cause: In OffsetContourBuilder buildOffsetContour convex join for line→arc, findCircleLineSegmentIntersection was used to trim the line to the arc's larger circle. When the arc GROWS (outward cursor-side offset), the intersection point lands at an angle that makes the arc span >180°, creating an inverted-orientation arc. Step 4b orientation check then correctly removes it, leaving only the line. The fix: validate that the intersection point won't invert arc orientation before using it; if it would, fall through to computeSharpJoin which uses tangent directions and produces a valid minor arc.
fix: Added orientation-inversion validation in OffsetContourBuilder.js convex join line→arc case. Before calling stitchJoinAtPoint with the circle-line intersection, compute the cross product of (candidateStart-center)×(end-center) and check against sweepFlag. If the result would be inverted, set lineToArcNoIntersection=true and fall through to computeSharpJoin.
verification: "244/245 tests pass (only pre-existing task-6-scenario3 failure). tests/offset-cursor-side.spec.js 4/4 passing including the new arc preservation test."
files_changed: ["src/operations/OffsetContourBuilder.js"]
