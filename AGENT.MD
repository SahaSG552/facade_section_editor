# Agent Progress Log - Profile Bit Type с 2D Cross-Section SVG Editor

## ⚠️ АРХИТЕКТУРНЫЕ ПРАВИЛА (ОБЯЗАТЕЛЬНО К СОБЛЮДЕНИЮ)

### PathEditor — главный источник истины для структуры профиля

**PathEditor является источником истины для структуры профиля** (contour, shape, group, symmetry элементы).

Следствия:
- **Canvas-originated changes** (move, rotate, cursor edits) → обновляют `EditorStateManager.segments` напрямую, потом `_syncToPathEditor()` синхронизирует PathEditor.
- **PathEditor-originated changes** (пользователь редактирует текст или порядок элементов) → `onChange` / `onElementOrderChange` являются master источником. `_importPath` + `_realignContourIdsToSourceOrder` + `_restoreStateStructureFromElements` + `_restoreContourLinkMetaFromElements` применяются последовательно для восстановления состояния из snapshot PathEditor'а.
- **Симметрия**: `_restoreContourLinkMetaFromElements` всегда должна вызываться после `_restoreStateStructureFromElements` при PathEditor-originated изменениях — она восстанавливает `linkType`, `parentContourId`, `axis` на сегментах и вызывает `_syncSymmetryContours`.
- **НЕ НУЖНО** вызывать `_syncToPathEditor` в PathEditor-originated ветке — это перезапишет пользовательские правки.

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ: ADVANCED FILLETS + FLIP TOOL SCALING (10.03.2026)

### Fillet Tool Enhancements
- [x] **Mixed Segments**: Реализована поддержка скруглений между любыми типами сегментов (Line-Arc, Arc-Arc).
- [x] **Generalized Geometry**: Введен метод `_filletByOffset` в `filletGeometry.js`, использующий пересечение офсетных кривых для нахождения центра скругления.
- [x] **Arc Trimming**: `FilletTool.js` теперь корректно обрезает дуги, учитывая их длину (`_getSegLength`) для удаления вырожденных сегментов.
- [x] **Preview Ghost**: Исправлено отображение дуговых "остатков" в превью, добавлена поддержка инверсии `sweep` при рисовании в обратном направлении.
- [x] **All Corners**: Режим "All Corners" теперь находит и скругляет углы, образованные дугами.

### Flip Tool 개선
- [x] **Zoom-aware Scaling**: Стрелки направления теперь масштабируются обратно пропорционально уровню зума (`1.8 / zoom`), что делает их видимыми на любых масштабах.

### Refactoring & Documentation
- [x] **Geometry Unification**: Унифицирован формат результата `FilletResult` через фабрику `_createFilletResult`.
- [x] **Code Cleanup**: Сложная логика слияния контуров вынесена в приватный метод `_mergeContoursIfNeeded` в `FilletTool.js`.
- [x] **JSDoc**: Документированы все новые и основные методы в `filletGeometry.js`, `FilletTool.js` и `FlipTool.js`.

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ (27.02.2026)

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ: FLIP TOOL + SYMMETRY DIRECTION (05.03.2026)

### Цель
- Обеспечить противоположное направление отрисовки `Symmetry` относительно исходного path/contour,
  чтобы результат можно было собирать в замкнутый последовательный контур.
- Добавить новый staged-инструмент `Flip` (`F`) для реверса направления выбранных контуров.

### UX требования (зафиксировано)
- `Flip` доступен на панели инструментов как отдельная кнопка.
- Flow: включаем `Flip` → если ничего не выбрано, выполняем выделение (клик/рамка) → `ПКМ` подтверждает selection.
- После подтверждения отображаются маленькие стрелки направления (start/mid/end) на каждом выбранном сегменте.
- Второй `ПКМ` выполняет реверс направления выбранных контуров и завершает команду.
- `Esc` в preview-стадии отменяет команду без изменений.

### План внедрения
- [x] Добавить `Flip` в `EditorToolbar` и назначить hotkey `F`.
- [x] Зарегистрировать `FlipTool` в `ProfileEditor._createTool(...)`.
- [x] Реализовать `FlipTool` staged selection/confirm flow с ghost-стрелками направления.
- [x] Реализовать commit реверса направления по контурам (reverse order + reverse segment direction).
- [x] Обновить `Symmetry` генерацию: mirrored-контуры всегда в противоположном направлении к source.
- [x] `Flip` arrows: увеличен размер и добавлен zoom-aware refresh (не пропадают при zoom/pan в preview stage).
- [ ] Применить тот же Flip-пайплайн к элементам symmetry в отдельной итерации (после UX валидации).

### Следующая задача (backlog)
- [~] Drag-and-drop одной/нескольких команд или целых path-элементов в структуру другого path:
  вставка в конкретную позицию или в конец.
  - [x] Перемещение одиночной команды (sub-line) между разными Path.
  - [x] Вставка целого Path в другой Path по drop на конкретную команду (позиционный insert).
  - [x] Multi-select перенос нескольких команд между Path.
  - [x] Drop целого Path в конец target Path (через end drop-zone в теле path).

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ: OFFSET ALGORITHM IMPROVEMENTS (13.03.2026)

### Задача: Очистка вырождающихся арок и устранение микро-разрывов на соединениях

#### Анализ примера (контуры 10 / 44 / 104)
- **Контур 10** (оригинал): `A 6 6` + `A 7 7` последовательно стыкуются в (-5.5, 3.5)
- **Контур 104** (текущий, плохой): при оффсете=7 арка r=7 вырождается. Текущий код ИНВЕРТИРУЕТ её (переворачивает sweep + добавляет π к углам), создавая `A 0 0` + микро-линии.
- **Контур 44** (ожидаемый): арка r=7 удаляется; арка r=13 расширяется до центра вырожденной арки (-12.07, 1.09); мост от центра к смещённой линии вдоль end-тангента.

#### Математика вырождения
- Центр вырожденной арки = точка соединения всех смежных сегментов после вырождения
- Центр вырожденной арки лежит на окружности предыдущей (arc1_offset, r=13) с допуском ~1.6°
- End-тангент вырожденной арки сохраняется и указывает направление моста к следующему сегменту
- Формула моста: `C + t * endTangent` пересекает продолжение следующей линии → startPoint линии

#### Случай line → degen_arc → line (fillet угла)
- **При вырождении фillet-арки (r→0)**: две соседние линии соединяются под исходным углом в точке C
- End-тангент дуги параллелен следующей линии → `lineIntersection` вернёт null → мост не создаётся
- `joinOffsetSegments` создаёт miter-соединение двух линий в угловой точке автоматически ✓

#### План реализации

#### Задача 1: Вырождающиеся арки (degenerate arcs) — ГЛАВНЫЙ FIX

- [x] **1.1** `offsetArcSegment`: при `newRadius < EPSILON` — возвращать degenerate-маркер `{type:"arc", degenerate:true, ...}` вместо инвертированной арки
- [x] **1.2** В `joinOffsetSegments`: inline-обработка degenerate arc через bidirectional tangent rays из C:
  - `prevDir = (sin(startAngle)*sweepSign, -cos(startAngle)*sweepSign)` — направление ОТ C к предыдущему сегменту
  - `nextDir = (-sin(endAngle)*sweepSign, cos(endAngle)*sweepSign)` — направление ОТ C к следующему сегменту
  - Для prev=line: extend по currDir до пересечения с prevDir-лучом от C
  - Для prev=arc: lineCircleIntersections(C, prevDir, cCenter, cRadius) → updateArcEndpoint
  - Для next=arc: updateArcEndpoint(after, C, true)
  - Для next=line: lineIntersection(C, nextDir, afterLineStart, afterLineDir) → after.start
  - Мост: bridge line bridgeFrom → bridgeTo если dist > 0.01
- [x] **1.3** `sanitizeSegments`: фильтрует дуги с r ≤ EPSILON
- [x] НЕ модифицировать prev.end в pre-pass (это ломало tangent для join с предыдущим сегментом)

#### Задача 2: Микро-разрывы на arc-arc стыках

- [ ] **2.1** Проверить: после фикса задачи 1 остаются ли микро-линии между нормальными (не-degenerate) арками
- [ ] **2.2** Если остаются: проверить `getArcExtensionAngle` на корректность для обоих направлений (к началу и к концу арки)
- [ ] **2.3** При необходимости: уточнить формулу — для sweep=1 точка перед startAngle должна давать малое расширение |ε|, не большое (2π - ε)

#### Валидация
- [ ] Тест: M 0 0 A 6 6 0 0 0 -5.5 3.5 A 7 7 0 0 1 -11 8 L -11 11 H 0 H 11 L 11 8 A 7 7 0 0 1 5.5 3.5 A 6 6 0 0 0 0 0, offset=-7 → должно совпадать с контуром 44
- [ ] Тест: symmetry — одинаковые контуры слева/справа должны давать зеркальный offset
- [ ] Тест: fillet-арка (line+arc+line, r=R, offset=-R) → угловое соединение двух линий без артефактов

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ: OFFSET TOOL (11.03.2026)

### Rhino parity (Offset / OffsetMultiple)
- [x] Изучены команды Rhino 8: `Offset`, `OffsetMultiple`.
- [x] Зафиксирован staged UX: selection -> side pick/dynamic preview -> confirm.
- [x] Зафиксированы corner modes: `Sharp`, `Round`, `Smooth`, `Chamfer`, `None`.
- [x] Зафиксирован `Trim` semantics: при `No` допускаются self-intersections, при `Yes` подрезка на углах.
- [x] Для open curves: `Cap` режимы `None`, `Flat`, `Round`.
- [x] Для multiple: единая сторона относительно курсора; islands (вложенные closed контуры) инвертируют направление относительно контейнера.

### Продуктовые режимы (editor)
- [ ] `Offset` (LMB):
  - [ ] Stage 1 selection (элементы/сегменты/шейпы) + RMB confirm.
  - [ ] Stage 2 dynamic ghost + near-cursor input дистанции (поддержка отрицательных значений).
  - [ ] Stage 3 freeze preview по LMB/Enter и финальный confirm (LMB) / rollback (RMB).
- [ ] `Offset multiple` (RMB):
  - [ ] Ввод `distance count` (по умолчанию count=1).
  - [ ] Динамический предпросмотр всех оффсетов.
  - [ ] Расчёт дистанций последовательности как `partialResults` (вынести в shared util для переиспользования с PhantomBitCalculator).

### Технический план внедрения
- [x] Добавить `OffsetTool` в `src/editor/tools/OffsetTool.js` с базовой staged state-machine (`selecting -> dynamic -> confirming`).
- [x] Зарегистрировать инструмент в `ProfileEditor._createTool(...)` и в `EditorToolbar` dual-mode (LMB offset / RMB offset-multiple).
- [x] Вынести helper генерации последовательности глубин/дистанций (`partialResults`) в `src/utils/offsetSeries.js` и использовать в `PhantomBitCalculator` + `OffsetTool`.
- [ ] Реализовать адаптер сегментов editor <-> SVG path для передачи в `CustomOffsetProcessor` без деградации примитивов там, где возможно.
- [ ] Добавить fallback-пайплайн для сложных self-intersection кейсов через `PaperBooleanProcessor` / Paper.js.
- [ ] Сохранение примитивов:
  - [ ] line/arc по возможности сохранять как line/arc,
  - [ ] shape offset (rect/circle/ellipse) не деградировать в polyline в обычных кейсах.

### Валидация (итеративно с edge-cases)
- [ ] Open/Closed контуры, mixed line+arc, shape-only.
- [ ] Self-intersections: trim vs keep-поведение.
- [ ] Негативные distance, крупные distance, multi-count > 1.
- [ ] Совместимость с undo/redo, symmetry links и formula-параметрами.

### Hotfix / Refactor (11.03.2026)
- [x] Ghost styling унифицирован через CSS `.editor-ghost` для `line/circle/rect/ellipse/path`.
- [x] В `OffsetTool` удалены инлайн-визуальные атрибуты ghost (`stroke/stroke-width/opacity`); в JS оставлены только геометрия + `stroke-dasharray`.
- [x] Удалены мёртвые helper-функции: `createShapeGhostElement`, `shapeToGhostPathData`, `estimatePathOffsetNormal`, `signedAreaOfSegments`.
- [x] Очищен `_captureSources`: убраны неиспользуемые поля `signedArea/isCCW/estimatedNormal` и лишний `pathData` для shape-entry.
- [x] Направление offset стабилизировано для разного обхода open-path через dual-candidate выбор (`+D/-D`) с оценкой смещения центра относительно reference normal.
- [x] Добавлены/уточнены JSDoc для новых transform/offset utility-функций.

### Hotfix batch (05.03.2026)
- [x] Fix: два разных path, соприкасающихся стартовыми точками, больше не склеиваются в одно выделение.
  Selection для line/arc теперь берёт связную компоненту внутри contour, а не все сегменты contourId.
- [x] Fix: Cancel надёжно откатывает даже при входе из plain profilePath без исходного structured snapshot.
  На enter сохраняется fallback snapshot из построенного PathEditor.
- [x] Fix: добавлен drop target в конец path, чтобы переносить команды/целый path в конец, не только перед последней строкой.

### Hotfix follow-up (05.03.2026)
- [x] Fix: копии после Mirror/Move/Rotate больше не выделяются как «одна группа» по клику на canvas.
  Причина: copied segments наследовали `groupId/parentGroupId`; теперь копии по умолчанию декуплируются от source groups.
  Исключения: symmetry flow и mirror-replace path сохраняют group links намеренно.
- [x] UX: убрано видимое `Drop to end`; end drop-zone оставлена невидимой и визуально проявляется только как стандартный drag-over индикатор (как между строками).
- [x] Symmetry formula carry (phase 1): восстановление formula-токенов contour-команд (`L/H/V/A`) из raw PathEditor-строк в state перед `_syncSymmetryContours`.
- [x] Symmetry formula carry (phase 2): рефактор `EditorStateManager` — добавлен affine-миррор токенов координат (`sx/sy/ex/ey`) в SVG-space, чтобы переносились не только `A`-параметры, но и формулы линейных команд.
- [x] Рефактор и документация: добавлены JSDoc к новым helper-функциям (`_buildSvgMirrorAffine`, `_affineExpr`, `_carryMirrorFormulas` и универсальному восстановлению contour-formulas).
- [~] Открытый follow-up: довести универсальный перенос до 100% покрытия редких параметров/edge-cases (например, flags/rotation в `A` при нетривиальных выражениях и смешанных токенах в командах).

- [ ] Универсальная обработка параметров: любой параметр любой команды/элемента/модификатора может содержать формулу.
- [ ] При изменениях с канваса (move/edit):
  - [ ] показывать обновлённые численные значения динамически,
  - [ ] но если исходный параметр содержит формулу/переменную и её вычисленное значение эквивалентно новому — сохранять исходную формулу (не заменять числом).
- [ ] Вынести в универсальную обёртку для текущих и будущих параметров.
- [ ] Применить не только к `Path`, но и к shape-параметрам и параметрам модификаторов.

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ: MOVE/SELECT WORKFLOW (28.02.2026)

- [ ] Перевести `MoveTool` на staged-процесс:
  - [ ] Stage 1: выбор объектов в move-mode (клик toggle + рамка);
  - [ ] Stage 2: RMB подтверждает selection и включает выбор 1-й точки;
  - [ ] Stage 3: 2-я точка (клик или координатный ввод) завершает перенос.
- [ ] Реализовать RMB cancel semantics по стадиям:
  - [ ] Stage 1 (пустое selection): отмена/выход без действия;
  - [ ] Stage 2: отмена обратно в selection stage;
  - [ ] Stage 3: rollback превью-переноса и возврат в selection stage.
- [ ] Перенести point/handle перемещение из `MoveTool` в `CursorTool`.
- [ ] Для перемещения vertex сохранять welded-связность path/polyline (без разрыва контура).

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ: ROTATE TOOL + LOCAL RT (01.03.2026)

### Цель
- Добавить отдельный инструмент `Rotate` рядом с `Move` с staged UX в стиле Rhino:
  1) selection,
  2) center of rotation,
  3) first reference point,
  4) second reference point (live preview + commit).
- Перевести применение `RT` к local frame элемента так, чтобы итоговое поведение move/edit оставалось глобально ожидаемым.

### Инварианты
- [ ] Для `rect/ellipse/circle` сохранять параметрическую форму (без деградации в path).
- [ ] `Move` и редактирование геометрии остаются в глобальной системе координат UX.
- [ ] `RT` отражается в `transforms` консистентно с canvas render/hit-test.
- [ ] Cancel/rollback на любой стадии rotate не оставляет промежуточных изменений.

### План внедрения
- [x] Фаза 1: UI wiring
  - [x] Добавить кнопку `rotate` в `EditorToolbar` рядом с `move`.
  - [x] Зарегистрировать `RotateTool` в `ProfileEditor._createTool(...)`.
- [ ] Фаза 2: RotateTool staged MVP
  - [x] Stage selection + confirm.
  - [x] Stage center/ref1/ref2 с ghost preview.
  - [x] Commit в history (`Rotate`), rollback по `Esc/RMB`.
  - [x] Добавить box-selection в rotate selection stage.
  - [x] Добавить Shift part-selection (включая rect sides), как в `MoveTool`.
  - [x] Добавить welded-обновление точек невыделенных соседей при rotate.
  - [x] Заменить ввод `ref2` в popup на ввод угла поворота (deg) на стадии `pick-to`.
- [ ] Фаза 3: RT local-system migration
  - [ ] Зафиксировать правило pivot/local-frame для shape/path сегментов.
  - [ ] Уточнить сериализацию `MOD RT` при compose нескольких RT.
  - [ ] Привести `EditorCanvas` hit-test/local conversion к единому источнику истины.
- [ ] Фаза 4: Validation
  - [ ] Проверить rotate для line/arc/path/polyline.
  - [ ] Проверить rotate для rect/circle/ellipse с последующим move/edit.
  - [ ] Проверить совместимость formula tokens при rotate+save.

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ: MIRROR / SYMMETRY TOOL (01.03.2026)

### Rhino reference (зафиксировано)
- `Mirror` (Rhino):
  - flow: select objects → pick axis start → pick axis end → live preview;
  - ключевая опция: `Copy` (создать копию vs трансформировать исходный объект).
- `Symmetry` (Rhino):
  - flow аналогичен Mirror (2 точки оси), но зеркальная половина связана с исходной геометрией;
  - continuity options (None/Position/Smooth) для curve/surface в Rhino.

### Принятая продуктовая интерпретация для текущего 2D-редактора
- `Mirror`: создаёт зеркальные **НОВЫЕ** элементы (исходные остаются).
- `Symmetry`: создаёт вторую половину объекта как отдельный симметричный результат
  (позже — подготовка к зависимой/параметрической связи, если потребуется).
- Выделение и selection-UX — как в `Move/Rotate`:
  - click/shift toggle,
  - box selection (LTR/crossing),
  - shift part-selection (включая `rect` sides).

### План внедрения
- [x] Фаза 1: UI/dispatch
  - [x] Перенести кнопку `Mirror` справа от `Rotate`.
  - [x] Сделать dual-mode кнопку: LMB=`mirror`, RMB=`symmetry`.
  - [x] Зарегистрировать `symmetry` в `ProfileEditor._createTool(...)`.
- [ ] Фаза 2: Shared selection reuse
  - [x] Подключить к `MirrorTool` общий selection слой из `shared/selectionUtils.js`.
  - [x] Синхронизировать rect-side highlights и part-selection поведение.
- [ ] Фаза 3: Mirror execution (new elements)
  - [x] Stage 1: selection.
  - [x] Stage 2: axis start.
  - [x] Stage 3: axis end + live preview.
  - [x] Commit: добавить зеркальные сегменты как новые; исходные не менять.
- [ ] Фаза 4: Symmetry execution
  - [x] Reuse mirror-axis interaction (same staged flow).
  - [x] Commit: создать вторую половину объекта по правилам symmetry-mode (MVP = geometric mirror copy).
  - [ ] Зафиксировать MVP continuity policy для 2D (минимум: geometric mirror, без G2-сглаживания).
- [ ] Фаза 5: Validation
  - [ ] Проверить line/arc/path/polyline/rect/ellipse/circle.
  - [ ] Проверить `RT`-модификаторы и selection рамкой у transformed-элементов.
  - [ ] Проверить undo/redo как одну атомарную операцию на commit.

### TODO (refactor: shared geometry math)
- [ ] Вынести дублируемую математику `rotate/mirror/world/raw` и helper `_withRtAngle` из `MirrorTool`/`EditorStateManager` в общий `src/editor/tools/shared/*` модуль с единым API.

## ✅ CANVAS GROUP/UNGROUP + SELECTION UNIFICATION (02.03.2026)

### Унификация модификаторов выделения (все инструменты)

Реализована единая логика клика и рамки для `CursorTool`, `MoveTool`, `RotateTool`, `MirrorTool`:
- **Без модификатора** → выделяет верхний уровень группы (всё поддерево).
- **Shift** → игнорирует группы, выделяет конкретный элемент/контур.
- **Ctrl+Shift** → части элементов (сегменты/стороны rect).

Ключевые изменения:
- В `src/editor/tools/shared/selectionUtils.js` добавлена функция `resolveClickSelectionIds(...)`.
- Все 4 инструмента импортируют `resolveClickSelectionIds` вместо собственных копий логики.

### Баг-фиксы Ungroup

**Проблема 1 (PathEditor):** `ungroupSelection` обрабатывал все вложенные группы, выбранные через расширение, а не только корневые → структура становилась плоской.
- **Фикс:** Работает только с *корневыми* выбранными группами (те, у которых нет другой выбранной группы-предка).

**Проблема 2 (Canvas→PathEditor sync):** `setSelectedElements` подсвечивал все вложенные Group-строки, и `ungroupSelection` обрабатывал их все.
- **Фикс:** `setSelectedElements` теперь подсвечивает только *корневую* полностью-выбранную группу в иерархии.

**Проблема 3 (Canvas Ungroup — итоговая):** При унгруппировке через canvas вся структура становилась плоской из-за двух связанных причин:
- `ungroupSelection` запрашивал `_resolveParentGroupById` *после* того, как первый цикл удалял группы из `_elements` → цепочка предков обрывалась.
- `_expandSelectionToGroups` помечал вложенные строки как selected, а второй цикл `ungroupSelection` их тоже обрабатывал.
- **Фикс:** Снимок `originalParentByGroupId` делается ДО мутаций через `_buildGroupParentMap()`. Логика первого и второго циклов разделена на `if/else`.

**Проблема 4 (Группировка "не тех" элементов):** При Ctrl+клике на строку-потомок выбранной группы `_expandSelectionToGroups` сразу переподсвечивала её.
- **Фикс:** При Ctrl+деселекции строки в `_applyTopLevelSelection` также сбрасываются все строки групп-предков.

### Рефакторинг и унификация (02.03.2026)

**`src/panel/PathEditor.js`:**
- Добавлен приватный метод `_buildGroupParentMap()` — строит `Map<groupId → parentGroupId>` за один проход по `_elements`. Используется как снимок перед мутациями и как общий источник вместо дублирующихся inline-построений.
- `setSelectedElements`: заменён inline-цикл построения `groupParentById` на `_buildGroupParentMap()`; цикл `groupFullySelected` упрощён.
- `_expandSelectionToGroups`: удалена неиспользуемая Map `parentByGroup`; цикл сбора `selectedGroupIds` упрощён до единственного условия.
- `ungroupSelection`: удалена неиспользуемая переменная `group`; inline-построение Map заменено на `_buildGroupParentMap()`.
- `groupSelection`: заменён `selectedRefs.has('group:...')` (шаблонная строка при каждой итерации) на `selectedGroupIdSet.has(gid)` (Set<number>); двойной `.map()` на массив `moved` объединён в один проход.
- `_resolveParentGroupById`: добавлен JSDoc.
- `_applyTopLevelSelection`: расширен JSDoc с описанием всех трёх modifier-режимов и логики деселекции предков.

**`src/editor/tools/shared/selectionUtils.js`:**
- `resolveClickSelectionIds`: `elementGroups` теперь обходится один раз (строятся `parentByGroup` и `childrenMap` совместно), вместо двух проходов — устранён повторный вызов `buildGroupChildrenMap(elementGroups)`.
- Добавлен полный JSDoc для `resolveClickSelectionIds` и `expandSegIdsToGroupClosure`.

**Проверка:**
- `npm run build` — успешно (без ошибок и предупреждений компилятора).

### Баг-фикс: структура становится плоской после сохранения и возврата в edit-режим

**Проблема:** После сохранения фрезы и возврата в edit-режим структура вложенности в PathEditor была корректной до первого изменения на canvas (рисование нового элемента или редактирование существующего). После первого изменения структура становилась плоской.

**Корневая причина — `_sanitizeElementsSnapshot` в `src/editor/ProfileEditor.js`:**
1. В первом обходе `cloned` все `groupId` заранее добавлялись в `usedGroupIds`.
2. При вызове `allocGroupId(candidate)` кандидат **всегда** оказывался в `usedGroupIds` → всегда присваивался новый ID (например, G1→G3, G2→G4).
3. Поле `parentGroupId` при этом копировалось через `_optFiniteId(elem?.parentGroupId)` — т.е. оставалось со **старым** значением (G2.parentGroupId оставался равным 1, хотя теперь нет ни одной группы с ID=1).
4. `_restoreStateStructureFromElements` записывал в `state.elementGroups` эти сломанные `parentGroupId`.
5. При `enter()` с `hasStructuredSource=true` PathEditor **не** перестраивался — он сохранял корректные элементы.
6. При первом canvas-изменении `_syncToPathEditor` вызывался впервые и строил PathEditor из `state.getElements()`, которые содержали сломанную иерархию → структура была плоской.

**Фикс (`src/editor/ProfileEditor.js`, функция `_sanitizeElementsSnapshot`):**
- Добавлен **пред-проход** по всем group-элементам: вызывается `allocGroupId(oldId)` и результат сохраняется в `groupIdRemap: Map<oldId, newId>`.
- В основном `.map()` для group-элементов `groupId` берётся из `groupIdRemap.get(...)`.
- Добавлена функция `remapGroupId(oldId)`, которая возвращает новый ID через `groupIdRemap.get(c) ?? null`.
- Для ВСЕХ типов элементов (`group`, `circle/rect/ellipse`, `path/polyline/symmetry`) `parentGroupId` теперь задаётся через `remapGroupId(elem?.parentGroupId)` — гарантируя консистентность ссылок во всём снимке.

**Проверка:**
- `npm run build` — успешно.

## ✅ MIRROR TOOL MVP: STAGED FLOW + SHARED SELECTION (01.03.2026)

- `src/editor/tools/MirrorTool.js` переведён из TODO-скелета в рабочий инструмент.
- Реализован staged UX:
  - selection stage (click / shift / box / part-selection),
  - axis-start stage,
  - axis-end stage с live ghost preview.
- Реализован commit для `mirror` и `symmetry`:
  - создаются новые зеркальные сегменты,
  - исходные сегменты не модифицируются,
  - операция фиксируется в history (`Mirror` / `Symmetry`).
- Поддержка shared selection:
  - используется `shared/selectionUtils.js`,
  - поведение выделения приведено к `Move/Rotate`.
- Проверка:
  - diagnostics по `MirrorTool.js`/`ProfileEditor.js`/`EditorToolbar.js` — без ошибок,
  - `npm run build` — успешно.

## ✅ COPY TOGGLE UNIFICATION + MULTI-COPY + ISOLATION FIXES (01.03.2026)

- `Move/Rotate/Mirror` приведены к единой copy-toggle модели:
  - без `Ctrl` — preview/commit трансформируют исходные выбранные элементы,
  - с `Ctrl` — preview показывает фантомы, commit создаёт копии и не завершает команду (мультикопии),
  - завершение мультикопирования — по `ПКМ`.
- Для `Mirror` ghost переведён на тот же рендер-пайплайн, что у исходной геометрии
  (`EditorCanvas._buildSegmentElement`), чтобы фантом был 1:1 с оригиналом.
- Выделен общий shared-модуль copy-пайплайна:
  - `src/editor/tools/shared/copyPreviewUtils.js`
  - `collectSegmentSnapshots(...)`
  - `materializeCopiedSegments(...)`
  - `commitCopiedSnapshots(...)`
  - `commitStagedTransformTarget(...)`
  - `transitionCopyMode(...)`
- На shared-copy helpers переведены:
  - `src/editor/tools/MoveTool.js`
  - `src/editor/tools/RotateTool.js`
  - `src/editor/tools/MirrorTool.js`
- Исправлен критичный weld-bug независимых path-объектов:
  - endpoint propagation при move/rotate/point-move в cursor теперь ограничен
    только сегментами того же `contourId`,
  - совпадающие по координатам точки разных контуров больше не тянут друг друга.
- Исправлен `Cancel` в edit-mode:
  - `ProfileEditor` сохраняет snapshot на входе в edit и на `exit(false)`
    полностью восстанавливает структуру PathEditor текущей сессии.
- Проверка после интеграции:
  - diagnostics по `MoveTool/RotateTool/MirrorTool/CursorTool/ProfileEditor/copyPreviewUtils` — без ошибок,
  - `npm run build` — успешно.

## 🚩 ТЕКУЩИЙ ПРИОРИТЕТ: STRUCTURED SYMMETRY GROUP (03.03.2026)

### Цель
Реализовать Symmetry инструмент как структурированный объект PathEditor:
- Результат симметрии — **Symmetry-группа** в PathEditor (тёмно-синяя, read-only дети)
- Работает для **одиночных элементов** (path/shape) И **групп** (с вложенными элементами)
- При изменении оригинальных объектов зеркальные копии **авто-обновляются** (через `_syncSymmetryContours`)

### Архитектура

**Модель данных:**
- `state.elementGroups` получает поля: `linkType:'symmetry'`, `sourceGroupId`, `axis:{p1,p2}`
- Symmetry-сегменты по-прежнему несут `linkType:'symmetry'`, `parentContourId`, `axis`
- Symmetry-сегменты дополнительно несут `groupId` = ID Symmetry-группы
- `state._allocateGroupId()` — новый вспомогательный метод

**Sync механизм (существующий, расширенный):**
- `_syncSymmetryContours()`: per-contour механизм sync остаётся без изменений
- Дополнение: для replacement-сегментов сохраняются `groupId`/`parentGroupId`
- Cleanup: пустые symmetry-группы удаляются из `elementGroups` после sync

**PathEditor:**
- `setElements`: propagate `linkType`/`sourceGroupId`/`axis` на group-элементы
- `_buildGroupRow`: специальный рендер для `linkType='symmetry'` (тёмно-синий header, без rename)
- `_emitTopLevelOrder`: включает `linkType`/`sourceGroupId`/`axis` в group-эмиссию
- Дети symmetry-группы рендерятся с `_inSymmetryGroup: true` → read-only стиль

**ProfileEditor:**
- `_restoreStateStructureFromElements`: восстанавливает `linkType`/`sourceGroupId`/`axis` на `elementGroups`
- `_restoreContourLinkMetaFromElements`: восстанавливает `groupId` на symmetry-сегменты

### Чеклист — ✅ ПОЛНОСТЬЮ ЗАВЕРШЕНО (03.03.2026)
- [x] `EditorStateManager._allocateGroupId()`
- [x] `EditorStateManager.getElements()` → группы с `linkType`/`sourceGroupId`/`axis`
- [x] `EditorStateManager._syncSymmetryContours()` → сохранение `groupId` + cleanup групп
- [x] `MirrorTool._commitMirror` symmetry → создание Symmetry-группы + `groupId` на сегменты
- [x] `PathEditor.setElements` → propagate `linkType`/`sourceGroupId`/`axis` на группы
- [x] `PathEditor._buildGroupRow` → Symmetry-header для `linkType='symmetry'` групп
- [x] `PathEditor._emitTopLevelOrder` → включает sym-метаданные групп
- [x] `PathEditor._isInSymmetryGroup()` helper + `_inSymmetryGroup` flag в `_renderElements`
- [x] `PathEditor._buildPathGroup` → read-only когда `_inSymmetryGroup`
- [x] `PathEditor._buildSubLine` → read-only когда в Symmetry-группе
- [x] `PathEditor._deleteSymmetryGroup()` → вызов `onDeleteSymmetryGroup` callback
- [x] `ProfileEditor._restoreStateStructureFromElements` → restore sym-links на elementGroups
- [x] `ProfileEditor._setupPathEditorCallbacks` → `onDeleteSymmetryGroup` удаляет state-сегменты
- [x] `styles.css` → `.pe-elem-group-symmetry` стиль (тёмно-синий border)
- [x] `npm run build` — успешно

## ✅ НОВЫЙ ПЛАН: TO PATH → STRUCTURED SYMMETRY OBJECT (01.03.2026)

### Продуктовые требования (зафиксировано)
- `Symmetry` работает с **цельными элементами** и **группами**.
- Flow `Symmetry`:
  1) выделение элемента/группы,
  2) выбор 1-й точки оси + live ghost,
  3) выбор 2-й точки оси → создание зеркальной копии и сохранение оси,
  4) формирование Symmetry-группы в PathEditor:
     - Symmetry отображается как отдельный объект-группа,
     - команды Symmetry не редактируются,
     - изменение parent обновляет Symmetry (через `_syncSymmetryContours`),
     - move/rotate/copy работают группой (будущий этап),
     - удаление Symmetry-группы — через кнопку delete на хедере.
- `To Path`:
  - доступен для выделенных non-path элементов и для объектов с Symmetry (будущий этап).

### ЭТАП A — Инструмент To Path (первый внедряемый шаг)
- [x] Добавить `To Path` command в editor-операции.
- [x] Реализовать конвертацию shape → path commands (`M/L/A/Z`), preserving transforms.
- [ ] Реализовать `Symmetry-aware To Path`:
  - если выделена parent/symmetry пара, выполнить merge symmetry commands в parent path,
  - снять symmetry-связь и вернуть обычный редактируемый path.
- [x] Добавить вызов `To Path` из PathEditor context menu (ПКМ на top-level row).
- [ ] История: одна атомарная операция (`To Path`).

### ✅ UPDATE (01.03.2026): TO PATH BASELINE ГОТОВ

- В `EditorStateManager` добавлена атомарная операция `convertSelectionToPath(...)`.
  - Одна history-запись: `To Path`.
  - Перенос selection на созданные line/arc сегменты.
  - Сохранение `contourId` и `transforms`.
- В `ProfileEditor` подключён callback `PathEditor.onToPathRequest`.
- В `PathEditor` добавлен RMB action на top-level rows (`shape/path`) с вызовом `onToPathRequest(...)`.
- Текущий scope конвертации:
  - `circle` → 2 дуги,
  - `rect` (включая rounded `rx`) → line/arc контур,
  - `ellipse` пока **не** конвертируется (deferred до расширения arc-пайплайна под эллиптические дуги).

### ЭТАП B — Структура Symmetry объекта в PathEditor
- [ ] Расширить element schema PathEditor для `type:'symmetry'`.
- [ ] Рендер top-level `Symmetry` row:
  - отдельный стиль (тёмно-синий header),
  - sub-lines визуально read-only (серые),
  - клики по параметрам/командам не открывают inline edit.
- [ ] Отключить line/part selection внутри symmetry sub-lines.
- [ ] Drag/reorder policy: parent и symmetry перемещаются как связанный блок.

### ЭТАП C — Поведение Symmetry Tool
- [ ] Ограничить selection stage до одного цельного элемента.
- [ ] Отключить copy-toggle (`Ctrl`) для symmetry mode.
- [ ] На commit создавать не просто копию, а связанную структуру parent+symmetry с осью.
- [ ] Сразу после commit выделять пару как grouped selection.

### ЭТАП D — Синхронизация и групповые операции
- [ ] При редактировании parent (canvas + PathEditor text edits) пересчитывать symmetry.
- [ ] Move/Rotate/Copy применять к parent+symmetry как к одной группе.
- [ ] Delete parent → каскадное удаление symmetry.
- [ ] Undo/Redo: поддержать атомарность всех операций по группе.

### ЭТАП E — Validation / Regression
- [ ] Сценарии:
  - symmetry create/edit/move/rotate/copy/delete,
  - To Path для shape,
  - To Path для symmetry pair (merge + unlink),
  - rollback/cancel в edit-сессии,
  - отсутствие cross-contour weld side effects.
- [ ] Проверка синхронизации PathEditor ↔ EditorState ↔ Canvas на всех шагах.

### Порядок внедрения (зафиксировано)
1. `To Path` infra + command + history.
2. PathEditor `ПКМ` context menu + `To Path` action.
3. Element schema + UI рендер `Symmetry` (read-only).
4. Symmetry link model + grouped selection/delete.
5. Symmetry tool behavior (single element, axis, linked commit).
6. Grouped move/rotate/copy + final regression pass.

## ✅ РЕФАКТОРИНГ ROTATE TOOL: ОЧИСТКА, ОПТИМИЗАЦИЯ, УНИФИКАЦИЯ (01.03.2026)

- Выполнен технический проход по `src/editor/tools/RotateTool.js` без изменения согласованного UX.
- Очистка:
  - удалена неиспользуемая константа `FORMULA_EQ_EPS`.
- Унификация:
  - введены общие helper-функции `_clone(...)`, `_cloneTransforms(...)`, `_segmentSnapshot(...)`,
  - унифицирован доступ к активному popup-input через `_getPopupInput(...)`.
- Оптимизация:
  - ускорен `_captureOrigins(...)` за счёт `Map` (`id -> segment`) вместо повторных линейных `find(...)`.
- Поддерживаемость:
  - добавлены JSDoc для публичных lifecycle/pointer/keyboard обработчиков.
- Проверка после рефакторинга:
  - diagnostics по `RotateTool.js` — без ошибок,
  - `npm run build` — успешно.

## ✅ SHARED SELECTION LOGIC: MOVE/ROTATE UNIFICATION (01.03.2026)

- Выделена общая логика box/part selection в новый модуль:
  - `src/editor/tools/shared/selectionUtils.js`
  - `computeBoxSelection(...)`
  - `buildSelectionBoxGhost(...)`
- На shared-реализацию переведены оба инструмента:
  - `src/editor/tools/MoveTool.js`
  - `src/editor/tools/RotateTool.js`
- Удалено дублирование кода в инструментах:
  - hit-test геометрия рамки,
  - выбор whole-element vs part selection,
  - построение ghost-рамки selection.
- Подготовлен reuse-контур для следующего инструмента `MirrorTool` (подключение единого selection слоя без копипаста).
- Проверка после унификации:
  - diagnostics по `MoveTool.js` / `RotateTool.js` / `shared/selectionUtils.js` — без ошибок,
  - `npm run build` — успешно.

## ✅ РЕФАКТОРИНГ MOVE TOOL: ОПТИМИЗАЦИЯ И УНИФИКАЦИЯ (01.03.2026)

- Выполнен технический проход по `src/editor/tools/MoveTool.js` без изменения UX staged-workflow.
- Убрано дублирование логики очистки `_expr`:
  - добавлены единые helper-функции `_dropChangedExprKeys(...)` и `_normalizeExprMap(...)`,
  - на них переведены ветки изменения `x/y`, `cx/cy`, `rect x/y/w/h`.
- Удалён неиспользуемый параметр `ltr` из `_segmentBoxHit(...)` и обновлены call-site’ы.
- Добавлены недостающие JSDoc для ключевых методов инструмента:
  - lifecycle (`activate`, `deactivate`),
  - pointer/keyboard handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onConfirm`, `onKeyDown`),
  - preview pipeline (`_applyPreviewTo`).
- Проверка после рефакторинга: compile diagnostics по `MoveTool.js` — без ошибок.

## ✅ РЕФАКТОРИНГ RECT GEOMETRY (28.02.2026)

- Вынесена единая геометрия прямоугольника в `src/editor/geometry/rectGeometry.js`:
  - `getRectGeomLocal(...)`
  - `getRectClampedRx(...)`
  - `getRectCornerPointMap(...)`
  - `getRectCornerInwardMap(...)`
  - `getRectBoundaryPrimitives(...)`
- На общий helper переведены:
  - `EditorCanvas` (рендер selected-corner handles + rect boundary hit-test),
  - `CursorTool` (side/rx drag геометрия).
- Удалены дубли расчётов `dirW/dirH` и corner/inward maps между модулями.

### Зафиксированный инвариант
- Для всех rect интеракций используется **effective direction**:
  - сначала учитывается `dirW/dirH`,
  - затем знак `w/h`,
  - итоговая ориентация берётся из `dx = dirW*w`, `dy = dirH*h`.
- Это предотвращает рассинхрон между preview/hit-test/edit на инверснутых прямоугольниках.

## ✅ ИТОГИ РЕФАКТОРИНГА ПЕРЕД RX (28.02.2026)

### Что выяснили по багфиксам
- Корневая проблема была не в отдельных `X/Y`, а в рассинхронизации нескольких пайплайнов:
  - разный парсинг команд между preview/edit,
  - разный regex для переменных в разных модулях,
  - локальные «частные» правила вместо общей обёртки эквивалентности.
- Самый опасный регресс: split команд внутри формул (`{l}+{y}`) ломал строки PathEditor (`V {` / `l}+{y}`).
- По модификаторам (`RT`) причина неконсистентности: резолв переменных и правила именования отличались от остальной системы.

### Что упростили/унифицировали
- Введён общий utility: `src/utils/variableTokens.js`.
  - Единый формат имени переменной: `[A-Za-z_][A-Za-z0-9_]*`.
  - Единая поддержка `{ var }` (с пробелами внутри фигурных скобок).
- На utility переведены ключевые точки:
  - `BitsManager` (валидация/резолв формул полей и custom vars),
  - `PathEditor.evaluateToken`,
  - `ProfileEditor` (merge формул),
  - `TransformCommands.evalAngle` (`RT`),
  - `RectTool` (ввод параметров в popup).
- Убран лишний UI-ограничитель custom vars:
  - `maxlength` увеличен до 32,
  - имя custom переменной больше не принудительно lower-case,
  - валидация имени приведена к единому правилу.

### Правило на будущее (чтобы снова не разъехалось)
- Любые изменения логики переменных/формул делать только через общий utility/обёртки,
  а не через локальные regex в модулях.
- Любой новый параметр (path/shape/modifier) должен проходить через один и тот же
  путь: `raw token -> evaluate -> equivalence check -> keep formula when equal`.

### Next
- Переходим к багам и комментариям по `Rectangle.rx` на уже упрощённой базе,
  без добавления новых частных веток по отдельным параметрам.

## 🎯 NEXT: АРХИТЕКТУРНЫЙ РЕФАКТОРИНГ PIPELINE PREVIEW/EDIT (28.02.2026)

- [x] Ввести единый source-of-truth: `profileElements` (порядок top-level элементов + строки path/polyline + segId привязки).
- [ ] Убрать fallback-реконструкцию структуры из `profilePath` при наличии валидного `profileElements`.
- [ ] Унифицировать цикл данных без расхождения порядка:
  - [x] `saved -> preview` загружается из `profileElements`,
  - [x] `preview -> edit` передаёт текущий snapshot `profileElements`,
  - [x] `edit -> preview` всегда синкает hidden inputs из `PathEditor` структуры,
  - [x] `modal close(save)` сохраняет актуальный `profileElements` без пересборки.
- [x] Зафиксировать один канал для preview-highlight маппинга строк: canonical `segId` selection для path/shape.
- [ ] Минимизировать legacy API-пути (`setPath`, path-based структурный rebuild) в runtime-переходах, оставить только как fallback для старых данных.

### Принятые архитектурные решения (зафиксировано)

- `profileElements` — структурный source-of-truth между режимами (`preview/edit/save`).
  - `profilePath/rawProfilePath` остаются сериализованным представлением для рендера/совместимости,
    но не должны реконструировать структуру при наличии валидного `profileElements`.

- Единый lifecycle callback-ов PathEditor:
  - При входе в `edit` все preview callback-и сохраняются,
  - в edit-режиме подменяются,
  - при выходе восстанавливаются полностью (`onChange`, `onLineClick`, `onElementOrderChange`,
    `onShapeElementClick`, `onPathElemClick`, `onDeactivate`).

- Единая модель selection mapping в preview:
  - Канонический идентификатор выбора — `segId` (как в edit mode).
  - `PathEditor` отдаёт selected refs как `segId` (fallback: index только если segId отсутствует).
  - Preview highlight строится по выбранным `segId` для всех типов элементов
    (path/polyline rows + shape rows), без двух параллельных моделей selection.

- Восстановление состояния PathEditor унифицировано в один helper:
  - `restorePathEditorState(...)` используется и при инициализации modal, и при rollback на Cancel,
    с приоритетом `profileElements` и legacy fallback в `setPath` только при отсутствии структуры.

- При canvas-originated sync порядок top-level элементов не берётся из произвольного
  `state.getElements()` как абсолют, а приводится к текущему порядку PathEditor snapshot.

- Привязка модификаторов (`transforms`) должна быть только по стабильным ключам:
  - path/polyline: по `contourId` (позиционный fallback допустим только для legacy snapshot),
  - shape: по `segId` (позиционный fallback только для legacy).
  - Любой positional-only маппинг transforms в runtime-пайплайне считается архитектурным дефектом.

- При text-sync в edit mode в `EditorState` импортируется только contours-only path.
  - Shape rows НЕ импортируются через path-сериализацию,
  - shape-структура всегда восстанавливается из `profileElements` snapshot.
  - Это предотвращает деградацию `circle/rect/ellipse -> polyline/path` при MOD/редактировании.

- Сохранение формул остаётся универсальным инвариантом: для любого параметра любой сущности
  (path command / shape attr / modifier param) при численной эквивалентности сохраняется исходный raw token.

- Введён общий utility политики формул: `src/utils/formulaPolicy.js`
  - `isFormulaToken(...)`
  - `evaluateTokenWithVars(...)`
  - Используется для унификации проверки/вычисления formula token (без локальных regex-веток).

- Следующий обязательный шаг унификации: единая policy нормализации Y-параметров
  для всех shape attr и path command args, чтобы исключить точечные sign-flip кейсы
  между preview/edit и между numeric/formula вводом.

- Введён общий utility Y-policy: `src/utils/yPolicy.js`
  - `isShapeYAttr(...)`
  - `shapeStoredToUiNumber(...)`
  - `shapeUiToStoredNumber(...)`
  - Подключён в `PathEditor` и `ProfileEditor` для унифицированной обработки Y у shape-параметров.

## Описание задачи

Добавление нового типа фрезы - **Profile** с произвольным профилем, который можно получить путём отрисовки в редакторе или импорте из другого формата.

---

## Полный план реализации

### ЭТАП 1: Расширение модального окна превью фрезы ✅ ЗАВЕРШЁН

#### 1.1 Увеличение размера превью ✅
- **Файл**: `src/panel/BitsManager.js`, `styles/styles.css`
- [x] Увеличить размер SVG канваса превью с 200x200 на 400x400
- [x] Обновить CSS для `.bit-preview`
- [x] Добавить красный крестик в нижней центральной точке (якорная точка)
- [x] Отобразить ось фрезы пунктирной серой линией вверх от якоря на 5px выше элементов

#### 1.2 Система переменных для формул ✅
- **Файл**: `src/data/VariablesManager.js` (новый)
- [x] Создать класс VariablesManager для управления переменными
- [x] Захардкоженные переменные:
  - `{d}` - Diameter
  - `{l}` - Length  
  - `{a}` - Angle
  - `{h}` - Height
  - `{cr}` - CornerRadius
  - `{f}` - Flat
  - `{sd}` - ShankDiameter
  - `{tl}` - TotalLength
  - `{tn}` - ToolNumber
- [x] Кастомные переменные хранятся в объекте и localStorage
- [x] Привязка переменных к типу фрезы

#### 1.3 Добавление кастомных полей ✅
- **Файл**: `src/panel/BitsManager.js`
- [x] Кнопка "Add Custom Field" в модальном окне
- [x] Модальное окно для создания нового поля (название, имя переменной, значение по умолчанию)
- [x] Возможность удаления кастомных полей
- [x] Предложение уже имеющихся полей при добавлении

---

### ЭТАП 2: Создание нового типа фрезы "Profile" ✅ ЗАВЕРШЁН

#### 2.1 Добавление типа Profile в defaultBits ✅
- **Файл**: `src/data/defaultBits.js`
- [x] Добавить новую категорию `profile`
- [x] Определить структуру данных для profile bit (profilePath, rawProfilePath, variables)

#### 2.2 Рендеринг Profile фрез ✅
- **Файл**: `src/panel/BitsManager.js`
- [x] Создать метод `createBitShapeElement()` для profile типа
- [x] Рендеринг из SVG path данных
- [x] Трансформация координат профиля в SVG координаты
- [x] Интеграция с превью фрезы

#### 2.3 PathEditor - Текстовый редактор SVG путей ✅
- **Файл**: `src/panel/PathEditor.js` (новый)
- [x] Табличное редактирование команд (M, L, H, V, C, S, Q, T, A, Z)
- [x] Кликабельные ячейки для редактирования параметров
- [x] Поддержка переменных `{varName}` в координатах
- [x] Автокомплит команд и переменных
- [x] Drag & drop для reorder строк
- [x] Умная трансформация аргументов при смене команды
- [x] Двойной клик для выделения всего текста

---

### ЭТАП 3: 2D Cross-Section SVG Editor 🔄 В РАБОТЕ

#### 3.0 Canvas Foundation (единый конструктор 2D канвасов) ✅
- **Файлы**:
  - `src/canvas/CanvasManager.js`
  - `src/canvas/zoomUtils.js`
  - `src/panel/PanelManager.js`
  - `src/interaction/InteractionManager.js`
  - `src/panel/BitsManager.js`
  - `src/script.js`
  - `src/core/ManagerFactory.js`
- [x] Переключено панорамирование на правую кнопку мыши (совместимо с 3D UX)
- [x] Устранено двойное применение anchor offset (исправлено смещение при `bottom-left`)
- [x] Унифицированы вычисления `panel origin`/`panel anchor` в `PanelManager`
- [x] Стабилизирована сетка: согласован якорь main/aux grid относительно anchor point
- [x] Добавлено сохранение последнего `fit` и пере-вписывание при resize/изменении layout
- [x] Превью переведено на частично state-driven обновление (без полной пересборки на zoom/pan)
- [x] Сетка переписана на `patternTransform=translate(phase)` — корректное выравнивание по anchor во всех браузерах
- [x] Исправлена коллизия ID паттернов (`url(#id)` резолвится глобально в документе): каждый `CanvasManager` получает уникальный `instanceId`, паттерны именуются `grid-{instanceId}-pattern`

##### 3.0.1 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Fit и Grid логика (обнаружено после тестирования)
**Проблема**: После "исправлений" fit логика всё ещё не центрировала объекты, как Sel кнопка, и сетка была смещена на 0,5px от якорной точки.

**Коренная причина**: 
- Grid anchor вычислялся с ДВОЙНЫМ смещением на `gridSize/2`:
  - В `ManagerFactory.js` линия 32-33: `gridAnchorX = panelX + anchorOffset.x + gridSize/2` ❌
  - В `script.js` линия 243-244: `gridAnchorX = panelX + anchorOffset.x + gridSize/2` ❌
  - Итого: `gridSize/2` добавлялся дважды (визуально: 0,5px смещение сетки)
- `fitAllVisibleElements()` использовал `calculateElementsBBox()` который манипулировал viewBox и портил расчёты:
  - Сохранял viewBox, менял его для расчётов, восстанавливал
  - Это вызывало несоответствие в координатах элементов
  - Собирал только прямых потомков слоя (пропускал вложенные группы в bit shapes)

**Решение**:
- [x] Удалены оба `+ gridSize/2` из расчётов grid anchor (ManagerFactory + script.js)
- [x] Переписана `fitAllVisibleElements()` в `zoomUtils.js`:
  - Добавлена рекурсивная функция `collectVisibleElements()` (проходит всё дерево элементов)
  - Прямое измерение `element.getBBox()` каждого элемента (БЕЗ манипуляции viewBox)
  - Ручное вычисление combined bbox (min/max координаты) как в работающем `zoomToElements()`
  - Try/catch для обработки исключений при измерении элементов
- [x] Приведены padding значения для preview canvas: 30 → 10 (тесней подгонка под требование)
- [x] Добавлена поддержка `lastFitRequest` для сохранения последнего fit при resize

#### 3.1 Архитектура редактора ✅ СКЕЛЕТ СОЗДАН
- **Новые файлы**:
  - `src/editor/ProfileEditor.js` ✅ — главный оркестратор (enter/exit, layout switching, keyboard, tool routing)
  - `src/editor/EditorCanvas.js` ✅ — canvas-расширения (screenToSVG, snap, axis, ghost, hitTest)
  - `src/editor/EditorToolbar.js` ✅ — тулбар с 18 инструментами, keyboard shortcuts, snap controls
  - `src/editor/EditorStateManager.js` ✅ — состояние (segments, tool, selection, undo/redo)
  - `src/editor/TextEditor.js` ✅ — интеграция PathEditor (двусторонний sync)
  - `src/editor/tools/BaseTool.js` ✅ — абстрактный базовый класс инструментов
  - `src/editor/snaps/SnapManager.js` ✅ — привязки (grid, ortho, angle, object snap)

#### 3.2 Кнопка Edit в превью ✅ ЗАВЕРШЁН
- **Файл**: `src/panel/BitsManager.js`
- [x] Добавлена кнопка "Edit" в превью фрезы (только для profile типа)
- [x] Открытие редактора через `ProfileEditor.enter()` — переключение layout (форма скрывается, canvas расширяется)
- [x] `onSave` callback пишет путь обратно в скрытые inputs и вызывает `updateBitPreview()`

#### 3.3 Инструменты рисования

##### Базовые инструменты:
1. [x] **Cursor** — выделение контуров целиком (`getChain`), box-select (L→R / R→L), Delete/Backspace
2. [x] **Move** — перемещение выделенных цепочек, welded-vertex drag (MoveTool)
3. [ ] **Line (Polyline)** - линия по 2 точкам, продолжение полилинии
4. [ ] **Rect2pt** - прямоугольник по начальной и конечной точке
5. [ ] **Rect3pt** - прямоугольник по 3 точкам (линия + перпендикуляр)
6. [ ] **Arc2pt** - арка по 2 точкам и радиусу
7. [ ] **Arc3pt** - арка по 3 точкам
8. [ ] **Circle2pt** - круг по 2 точкам (диаметр)
9. [ ] **Circle3pt** - круг по 3 точкам

##### Инструменты редактирования:
9. [ ] **Trim** - отсечение элементов на пересечении
10. [ ] **Extend** - удлиннение элемента
11. [ ] **Join** - объединение в путь
12. [ ] **Explode** - разбиение пути на элементы
13. [ ] **Fillet** - скругление угла (интерактивно + ввод радиуса)
14. [ ] **Chamfer** - скос угла
15. [ ] **Offset** - оффсет элемента/пути
16. [ ] **Close** - закрытие контура
17. [ ] **Bool** - булево объединение в закрытый контур
18. [ ] **Aux** - вспомогательная линия (параллельно/перпендикулярно/касательно)

#### 3.4 Система привязок
- [ ] Привязка к сетке (toggle + размер сетки)
- [ ] Ортогональная привязка
- [ ] Привязка к углу
- [ ] Привязка к объектам (endpoint, midpoint, intersection, center)

#### 3.5 Интерактивность элементов
- [ ] Выделение элементов с подсветкой контрольных точек
- [ ] Отображение длины/радиуса/угла на элементах
- [ ] Ввод значений и формул при выделении
- [ ] Добавление точек в центр элемента (пиктограммы угол/арка)

#### 3.6 Зеркалирование и ось
- [ ] Отображение оси (пунктирная серая линия)
- [ ] Зеркалирование контура относительно оси в реальном времени
- [ ] Автоматическое замыкание контура при OK

#### 3.7 Текстовый редактор
- [x] Базовая реализация PathEditor
- [x] Интеграция PathEditor в визуальный редактор (двусторонняя синхронизация)
- [x] PathEditor как единственный источник правды для сырого текста пути
- [x] M / Z / формулы из PathEditor не перезаписываются при изменениях с канваса

---

### ЭТАП 4: Валидация и экспорт

#### 4.1 Проверка самопересечений
- **Файл**: `src/editor/ProfileValidator.js` (новый)
- [ ] Проверка контура на самопересечения
- [ ] Предупреждение при попытке закрыть с ошибками

#### 4.2 Экспорт профиля
- [ ] Сохранение SVG path в bitData.profilePath
- [ ] Интеграция с существующей системой DXF экспорта

---

## Структура файлов для создания

```
src/
├── data/
│   └── VariablesManager.js ✅ создан
├── panel/
│   └── PathEditor.js ✅ создан
├── editor/
│   ├── ProfileEditor.js (новый)
│   ├── EditorCanvas.js (новый)
│   ├── EditorToolbar.js (новый)
│   ├── EditorStateManager.js (новый)
│   ├── TextEditor.js (новый - интеграция PathEditor)
│   ├── tools/
│   │   ├── BaseTool.js (новый)
│   │   ├── CursorTool.js (новый)
│   │   ├── LineTool.js (новый)
│   │   ├── RectTool.js (новый)
│   │   ├── ArcTool.js (новый)
│   │   ├── CircleTool.js (новый)
│   │   ├── TrimTool.js (новый)
│   │   ├── ExtendTool.js (новый)
│   │   ├── JoinTool.js (новый)
│   │   ├── ExplodeTool.js (новый)
│   │   ├── FilletTool.js (новый)
│   │   ├── ChamferTool.js (новый)
│   │   ├── OffsetTool.js (новый)
│   │   ├── CloseTool.js (новый)
│   │   ├── BoolTool.js (новый)
│   │   └── AuxTool.js (новый)
│   ├── snaps/
│   │   ├── SnapManager.js (новый)
│   │   └── SnapTypes.js (новый)
│   └── ProfileValidator.js (новый)
```

---

## Референсы

### Понравившиеся редакторы:
- https://github.com/prexen/SvgDrawApp
- https://github.com/kirjavascript/pathTweak
- https://github.com/turnerdev/svg-studio
- https://github.com/RintarouTW/fsg - визуальный стиль (тонкие пунктирные линии, стрелочки)
- https://github.com/rfauver/svg_path_editor - текстовый редактор

### Ключевые визуальные элементы (из fsg):
- Тонкие пунктирные линии для вспомогательных элементов
- Стрелочки для указания направления
- Точки обычные и выделенные (разные стили)
- Отображение угла между линиями

---

## Текущий статус

**Завершено:** Этап 1 и Этап 2 (100%), Этап 3.0 — Canvas Foundation (100%), Этап 3.1 — Архитектура редактора (скелет 100%), Этап 3.2 — кнопка Edit (100%), Этап 3.7 — PathEditor двусторонняя синхронизация (100%)

**Завершённые инструменты:** CursorTool (выделение цепочек, box-select), MoveTool (перемещение цепочек, welded-vertex), LineTool (базовый), MirrorTool (базовый), ArcTool (arc3pt + arc2pt с типизированным радиусом / переменными {d}), CircleTool (circle2pt + circle3pt), RectTool (rect2pt + rect3pt), EllipseTool (ellipse2pt + ellipse3pt)

**В работе:** Этап 3.3 — реализация оставшихся инструментов рисования

---

## Ключевые архитектурные решения и исправления

### PathEditor ↔ Canvas синхронизация (реализовано)
PathEditor — единственный источник правды для сырого текста пути (включая M, Z, {формулы}).
- **Текст → канвас**: `pathEditor.onChange` → `_importPath(path, {resetHistory:false})` — пересоздаёт сегменты, не трогает текст. Флаг `_pathEditorIsSource = true` на время обработки.
- **Канвас → текст**: `state.onSegmentsChange` → `_syncToPathEditor()` — экспортирует числовой путь и вызывает `pathEditor.setPath()` только если `_pathEditorIsSource === false`.
- **Инициализация**: `_rebuildPathEditorElements()` строит row→segId карту без вызова `setPath()` — формулы не затираются.

### Контуры (contourId)
Каждый сегмент имеет `contourId`, проставленный при импорте по номеру команды M. Два блока M всегда остаются раздельными контурами, даже если их вершины совпадают.
- `getChain(segId)` — обходит сегменты одного контура геометрически, возвращая цепочку
- `getSegmentsAtVertex(pt)` — все `{segId, pointKey}` в радиусе ε (для welded-vertex в MoveTool)
- `_sortChains()` — после удаления пересортировывает сегменты внутри каждого контура отдельно; разрыв замкнутого контура становится новой точкой M

### CursorTool / MoveTool: выделение цепочек
- Клик по сегменту → `getChain()` → выделяется вся цепочка целиком
- Клик по вершине в MoveTool → `getSegmentsAtVertex()` → все смежные endpoints двигаются вместе (welded)
- Shift+клик → toggle всей цепочки (добавить/убрать из выделения)

### ArcTool — дуги и параметрические радиусы (реализовано)

**Два режима рисования:**
- `arc3pt` — три клика (P1, P2, P3-через-курсор); circumcenter вычисляет центр и радиус.
- `arc2pt` — два клика + ввод радиуса в popup; сторона дуги определяется курсором.

**Переменные `{varname}` в радиусе** (`radiusExpr`):
- В popup (и inline-редакторе CursorTool/MoveTool) можно ввести `{d}` или просто `d`.
- `ArcTool._commitFromInput` нормализует к `{varname}`, резолвит через `state.variableValues`,
  сохраняет `radiusExpr` в `seg.data`.
- При экспорте пути `exportPathWithMap` использует `radiusExpr ?? r(radius)` — формула
  попадает в текстовый редактор (`A {d} {d} 0 …`) и сохраняется в `profilePath`.
- `_importPath` в `EditorStateManager` разбирает A-аргументы своим токенизатором
  (regex `{var}|numeric`), резолвит переменную через `this.variableValues`.

**Очистка формулы при геометрическом изменении:**
- Перетаскивание ручки pt3 или endpoint → circumcenter пересчитывает радиус → `radiusExpr: undefined`.
- Явный ввод числа → `canvas.updateArcRadius()` удаляет `radiusExpr` через destructuring.
- arc2pt с неизменным радиусом (только смещение endpoint) → `radiusExpr` остаётся.

**Управляющая ручка arc3pt handle:**
- При выделении дуги отображаются две пунктирные линии центр→endpoint (`editor-ghost-radius`),
  точка центра и ромб pt3 handle (`editor-arc-handle`).
- `EditorCanvas.updateArcFromPt3` при перетаскивании ручки: circumcenter через P1, P2, newPos;
  `arcMode` → `"arc3pt"`, `radiusExpr` → `undefined`.

**Canonical функция:** `arcCenterFromEndpoints` живёт в `src/editor/tools/ArcTool.js`
(экспортируется). `EditorStateManager` импортирует её оттуда; дубликата нет.

---

### Сохранение формул при редактировании на канвасе (`_mergeFormulaPath`)

`ProfileEditor._mergeFormulaPath(numericPath, formulaPath, vars)` — модульная helper-функция:
1. Токенизирует оба пути одним regex (команды + числа + `{var}`).
2. Если количество токенов совпадает, проходит позиционно: если formula-токен — `{v}` и
   `vars[v] ≈ numeric` (|diff| < 1e-4) — оставляет `{v}`; иначе берёт числовой токен.
3. При несовпадении числа токенов (изменилась структура пути) возвращает `numericPath`.

Вызывается в `syncToPathEditor()` перед `pathEditor.setPath()` — формулы выживают
при любом движении точек, которое не меняет значение radius.

---

### No-op detection в commit-методах (CursorTool / MoveTool)

`_segDataEqual(a, b)` — сравнивает `start`, `end`, `center`, `radius`, `largeArc`, `sweep`
с точностью EPS=1e-6. Поля `pt3`, `arcMode`, `radiusExpr` намеренно игнорируются.

- `MoveTool._commitMove` — пропускает `_pushHistory` если все сегменты вернулись на место.
- `MoveTool._commitPt3` — пропускает `_pushHistory` если дуга не изменилась (Escape).
- `CursorTool._commitPt3` — аналогично.

Это гарантирует, что формулы в PathEditor не затираются при случайном клике на точку
без реального перемещения.

---

### Ключевые исправления (BitsManager.js)
- **Done button freeze**: `_onSave` теперь использует `pathEditor.setPath(merged)` вместо `pathInput.value = merged` — исключает вызов `getBBox()` на невалидном пути
- **Cancel restore**: `originalRawPath` снимается до `enter()`, восстанавливается в `onClose` если `!editSaved`
- **Preview cache invalidation**: `onClose` сбрасывает `previewRenderState.signature = null` — исключает cache hit после закрытия редактора

---

## Исправленные баги (Этап 3 — патчи 27.06.2026)

### Исправление 1: Circle не откликается на Escape/RMB при pt3-редактировании ✅

**Причина:** `ProfileEditor._registerKeyboard()` перехватывал `Escape` для cursor-tool
и делал `clearSelection()` не проверяя, есть ли активная операция (`_pt3Drag`). В результате
`CursorTool.onKeyDown` (который умеет отменять pt3-drag) никогда не вызывался.

**Исправление:**
- `ProfileEditor.js` — перед `clearSelection()` проверяем `hasActiveCommand()`; если true,
  сначала делегируем `onKeyDown` инструменту.
- `CursorTool.js` — добавлен метод `onConfirm()`: RMB при активном `_pt3Drag` отменяет
  операцию (восстанавливает `origin`), а не подтверждает.

**Затронутые файлы:** `src/editor/ProfileEditor.js`, `src/editor/tools/CursorTool.js`

---

### Исправление 2: Circle разбивается на 2 арки при повторном входе в редактор ✅

**Причина:** `exportPathWithMap()` сериализировал circle-сегменты как `M A A Z` (два
полукруга). При импорте `_importPath()` распознавал только команды M/L/H/V/Z/A и
создавал два arc-сегмента вместо одного circle-сегмента.

**Исправление:** В `_importPath()` после `segments.map()` добавлен пост-процессинг:
сканируем готовые arc-сегменты и ищем паттерн `двух последовательных дуг одного контура`:
- одинаковый радиус
- `largeArc === 1` у обеих
- конец второй дуги совпадает с началом первой (замкнутый полукруг)
- оба endpoint на одной горизонтали

При совпадении два arc-сегмента заменяются одним circle-сегментом с правильными
`center.{x,y}` и `radius`. Переменные (`radiusExpr`) сохраняются.

**Затронутые файлы:** `src/editor/EditorStateManager.js`

---

## Исправленные баги (Этап 3 — M-row сессия)

### Исправление 3: M-строка не выделялась / Escape не снимал выделение ✅

**Причина:** M-строки хранили `segId = null` и обрабатывались через отдельное поле `_activeMContourId`, за обходом `state.clearSelection()`. При нажатии Escape выделение не сбрасывалось.

**Исправление:** M-строки теперь получают синтетический `segId = "m:<contourId>"` через `exportPathWithMap()` в `EditorStateManager`. Этот segId течёт через `state.setSelection()` идентично L/A строкам, поэтому `clearSelection()` правильно срабатывает при Escape и клике на пустое место. `PathEditor.setSelectedElements` распознаёт `ids.has("m:<cid>")` для подсветки заголовка.

**Затронутые файлы:** `src/editor/EditorStateManager.js`, `src/panel/PathEditor.js`, `src/editor/ProfileEditor.js`

---

### Исправление 4: Первый клик на M-строку выделял не M-строку, а L-строку ✅

**Причина:** `_rebuildPathEditorElements()` не передавал `lineSegIds` в `setElements()`, поэтому M-строки имели `segId = null` вместо `"m:<cid>"`. Из-за этого первый клик по M-строке вызывал `onLineClick(null)` и попадал в ветку сегмента ј L/Arc вместо M.

**Исправление:** `_buildElemsWithPaths()` вызывается из `_rebuildPathEditorElements()` (раньше отсутствовал этот вызов), что правильно заполняет `lineSegIds` для каждого элемента и M-строки получают `"m:<cid>"`.

**Затронутые файлы:** `src/editor/ProfileEditor.js`

---

### Исправление 5: M-дот исчезал при зуме ✅

**Причина:** Радиус точки (`3/zoom` SVG единиц) зависит от масштаба, но дот не перерисовывался при зуме — `onZoom` не был интерцептирован.

**Исправление:** В `enter()` запоминаем `canvasManager.config.onZoom` в `_prevOnZoom` и подменяем его обёрткой, которая перезывает оригинал и вызывает `_showMDotForContour()` если есть выделенная M-строка. В `exit()` хук восстанавливается через `_prevOnZoom`.

**Затронутые файлы:** `src/editor/ProfileEditor.js`

---

## Рефактор ProfileEditor.js

### Мотивация

`enter()` был перегружен (~300 строк внутри) из-за вложенных замыканий вместо методов класса.

### Что изменилось
- `_splitCmds(str)` и `_buildElemsWithPaths(...)` вынесены из `enter()` на уровень модуля (чистые функции, не зависят от `this`)
- Все 6 PathEditor-коллбэков извлечены в `_setupPathEditorCallbacks(pathEditor)`
- `syncToPathEditor` замыкание → метод класса `_syncToPathEditor()`
- `_rebuildElements` замыкание → метод класса `_rebuildPathEditorElements()`
- Добавлено поле класса `_currentToolId = null` (ранее отсутствовало в конструкторе)
- Исправлен неверный `@param rowIdx` → `@param contourId` в JSDoc `_showMDotForContour()`
- Исправлен неточный комментарий `"null for M/Z"` → точный опис M/Z сегментации
- `isMRow` условие исправлено с `== null` на `=== null`
- `enter()` теперь является чистым оркестратором из 11 последовательных шагов

**Затронутые файлы:** `src/editor/ProfileEditor.js`

---

## ЭТАП 4: Shape Elements — первоклассные фигуры в редакторе

### Концепция

Текстовый редактор и визуальный холст получают **Shape Elements** — именованные фигуры
(Circle, Rect, Ellipse, Path, Polyline, Polygon) наравне с плоскими path-командами.

Текущее состояние:
- Круг отображается в text-editor как строки `M`, `A`, `A`, `Z` — некрасиво.
- Нет возможности добавить `Rect` или `Ellipse` из UI.

Целевое состояние:
```
Shape Elements panel
┌─────────────────────────────────────────────────────────┐
│  ◇ Path1                                         [+] [×]│
│  ┆  M  x:0    y:0                                       │
│  ┆  L  x:50   y:0                                       │
│  ┆  A  r:10   large:0   sweep:1                         │
│  ┆  Z                                                    │
├─────────────────────────────────────────────────────────┤
│  ○ Circle  cx:25   cy:15   r:10              [+] [×]   │
├─────────────────────────────────────────────────────────┤
│  □ Rect    x:5    y:5    w:40   h:20   rx:2  [+] [×]   │
├─────────────────────────────────────────────────────────┤
│  ⬬ Ellipse cx:25  cy:15  rx:20  ry:10        [+] [×]   │
└─────────────────────────────────────────────────────────┘
```

### Архитектурное решение: profilePath → SVG-контент

**Проблема:** `ExtrusionBuilder.js:1434` оборачивает `profilePath` напрямую:
```js
const svgString = `<svg ...><path d="${bitData.profilePath}"/>`;
```
Это ограничивает формат только path-данными.

**Решение:** `profilePath` хранит **SVG inner content** (фрагмент, не whole-SVG):
```
<path d="M 0 0 L 50 0 Z"/>
<circle cx="25" cy="15" r="10"/>
<rect x="5" y="5" width="40" height="20"/>
```

**Backward compat:** если значение не начинается с `<`, автоматически оборачивается
как `<path d="${value}"/>`.

**`ExtrusionBuilder`** обновляется (одна строка):
```js
const profileContent = value.trimStart().startsWith('<') ? value : `<path d="${value}"/>`;
const svgString = `<svg ...>${profileContent}`;
```
Three.js `SVGLoader` нативно поддерживает `<circle>`, `<rect>`, `<ellipse>` — CSG заработает.

### Новые типы сегментов в EditorStateManager

| Тип       | data-поля                             | Откуда в SVG                     |
|-----------|---------------------------------------|----------------------------------|
| `line`    | start, end                            | M / L / H / V                   |
| `arc`     | start, end, center, radius, ...       | A                                |
| `circle`  | center, radius, radiusExpr?           | `<circle cx cy r/>`              |
| `rect`    | x, y, width, height, rx?, ry?         | `<rect .../>`                    |
| `ellipse` | cx, cy, rx, ry                        | `<ellipse .../>`                 |

### Изменения exportSVGContent (переименование exportPathWithMap)

```
line/arc сегменты одного contourId → <path d="M... L... A... Z"/>
circle → <circle cx cy r/>
rect   → <rect x y width height rx ry/>
ellipse → <ellipse cx cy rx ry/>
```

Возвращает `{ svgContent: string, lineSegIds: Map<segId, position> }`.

### Изменения _importSVGContent (переименование _importPath)

Принимает SVG-фрагмент, парсит элементы:
- `<path d="...">` → токенизирует path commands как сейчас
- `<circle ...>` → circle-сегмент напрямую (cx,cy,r)
- `<rect ...>` → rect-сегмент напрямую  
- `<ellipse ...>` → ellipse-сегмент
- Plain path string (без `<`) → обратная совместимость через _importLegacyPath

### Text Editor UI

| Element type  | Строк | Раскрываемый? | Пример                            |
|---------------|-------|---------------|-----------------------------------|
| Path          | 1+N   | Да (group)    | ◇ Path  M/L/A/Z строки внутри    |
| Circle        | 1     | Нет           | ○ Circle  cx:25  cy:15  r:10     |
| Rect          | 1     | Нет           | □ Rect  x:5  y:5  w:40  h:20    |
| Ellipse       | 1     | Нет           | ⬬ Ellipse  cx:25  cy:15  rx:20   |

### Visual Editor

- **CircleTool** уже есть ✅  
- **RectTool** — новый инструмент (два клика: угол + угол)
- **EllipseTool** — новый инструмент (центр + два радиуса)
- CursorTool **hitTest** обновляется для rect и ellipse
- **Toolbar**: добавить кнопки Rect (□) и Ellipse (⬬)

### План реализации Этапа 4

#### 4.1 — Хранилище и сериализация
- [ ] `EditorStateManager`: добавить типы `rect`, `ellipse`
- [ ] `EditorStateManager.exportSVGContent()` — новый метод (заменяет `exportPathWithMap`)
- [ ] `EditorStateManager._importSVGContent()` — новый метод (заменяет `_importPath`)
- [ ] Deprecated wrappers `exportPathWithMap`/`_importPath` → вызывают новые методы
- [ ] `ExtrusionBuilder` — обновить строку 1434 для SVG-фрагмента + migration guard

#### 4.2 — Text Editor переработка
- [ ] Новый тип строки `shape-element` рядом с `command-row` и `M-row`
- [ ] Рендеринг: для circle/rect/ellipse сегментов — однострочные shape rows
- [ ] Рендеринг: Path-group (line/arc цепочки) — collapsible секция
- [ ] Инлайн редактирование атрибутов фигур (click to edit)
- [ ] Кнопки Add Shape Element (+)

#### 4.3 — Новые инструменты холста
- [ ] `RectTool.js` — click pt1 / pt2 → rect segment
- [ ] `EllipseTool.js` — click center + drag rx / drag ry → ellipse segment  
- [ ] `EditorCanvas._buildSegmentElement` — rect и ellipse рендеринг
- [ ] `EditorCanvas.hitTest` — rect и ellipse hit detection

#### 4.4 — Toolbar
- [ ] `EditorToolbar.js` — кнопки Rect (□) и Ellipse (⬬)
- [ ] Регистрация инструментов в `ProfileEditor`

---

## ЭТАП 5: Улучшения PathEditor и Move-инструмента 🔄 В РАБОТЕ

### 5.1 Единый PathEditor для превью и эдит-режима

**Проблема:** Два разных набора правил для одного редактора — в превью PathEditor полностью автономен, в эдит-режиме добавляется цикл `onChange → _importPath → setElements`. Это приводит к расхождениям: например, "Add path" → добавить команду → путь исчезает.

**Корневая причина:** В text-originated ветке `_syncToPathEditor()` вызывает `setElements([])` когда state ещё не имеет сегментов (e.g. только `M 0 0` — без L/A), уничтожая только что созданный PathEditor-элемент.

**Частичный фикс:** Не вызывать `setElements([])` когда path непустой но segments = [].

**План:**
- [x] Исправить `_syncToPathEditor` — не затирать PathEditor при text-originated + empty segments
- [x] Исправить создание shape-элементов в эдит-режиме (`_create` callback не доходит до canvas)  
- [x] Добавить `circle`, `rect`, `ellipse` в suggestions edit-режима  
- [x] Suggestions: цветные кнопки с названиями (без иконок), каждый тип — свой цвет

### 5.2 Улучшение выделения строк в PathEditor

- [x] Один клик — выбор строки  
- [x] Второй клик по той же — снятие выделения
- [x] CTRL+клик — мультивыбор (toggle каждой строки)
- [x] SHIFT+клик — диапазон от текущей до кликнутой (как в файловых менеджерах)
- [ ] Range/CTRL работают и для shape-row (circle, rect, …)

### 5.3 Drag-and-drop команд между путями

- [ ] Перетащить sub-line (команду) из одного path-group в другой  
- [ ] Перетащить shape-element в path (с конвертацией circle → `M A A Z`, rect → `M L L L Z`, etc.)
- [ ] Перетащить path-element на shape-element (игнорировать или поднять предупреждение)

### 5.4 Улучшение инструмента Move

**Новое поведение:**
- Нет выделения → показать тултип "Select objects first", кликать на объекты/строки PathEditor, ПКМ = подтверждение выделения → переход к перемещению
- Есть выделение → клик в любом месте canvas начинает move (не обязательно на объекте)
- При перемещении двигаются ВСЕ выделенные элементы (circle, rect, ellipse тоже)
- Координатные привязки работают как обычно

- [ ] `MoveTool`: refactor flow — состояние `selecting` / `moving`  
- [ ] Тултип "Select objects, then RMB to confirm"  
- [ ] Всe выделенные сегменты (включая shape-типы) двигаются вместе  
- [ ] Клик в любом месте начинает drag (offset = snapPoint - startSnapPoint)  

### 5.5 Управляющие точки всегда видимы

- [ ] Вершины (start/end) всех line/arc сегментов отображаются всегда (приглушённо)
- [ ] Arc-handle (pt3) отображается для всех дуг
- [ ] При выделении — яркий/акцентный стиль (как сейчас)
- [ ] Без выделения — полупрозрачный серый стиль

---

## ЭТАП 6: Единый PathEditor для Preview/Edit (ВАРИАНТ B) ✅ ЗАВЕРШЁН

### Цель

Сделать `PathEditor` единственным UI-источником структуры (порядок, свёрнутость, выделение, текст команд) для обоих режимов.

**Важно:** сохраняем весь текущий функционал (визуальный редактор, текстовый редактор, формулы, undo/redo, tool-flow), убираем только неконсистентность и сложность поддержки между preview/edit.

### 6.1 Фаза A — Bridge API без ломки текущей логики

- [x] `PathEditor`: добавить non-destructive API привязки сегментов без `setElements()` rebuild:
  - [x] `bindSegmentIds({ lineSegIds, shapeSegIds })`
  - [x] обновление `line.segId` и `elem.segIds` по текущему visual-порядку
  - [x] без перестройки DOM и без потери expanded/order
- [x] `ProfileEditor`: использовать bind-поток при входе в edit (вместо принудительного пересбора структуры там, где это не требуется)
- [x] `ProfileEditor`: выделение синхронизировать отдельным лёгким методом (`selection-only sync`) без полного `_syncToPathEditor()`

### 6.2 Фаза B — Стабилизация синка (минимум rebuild)

- [x] Разделить синк на:
  - [x] **structure sync** (только когда реально изменилась топология)
  - [x] **selection sync** (всегда без rebuild)
- [x] Убрать rebuild на `onSelectionChange`
- [x] Сохранить и переиспользовать текущую структуру PathEditor, если изменились только координаты

### 6.3 Фаза C — Канвас читает модель из PathEditor-совместимого слоя

- [x] Добавить адаптерный слой синка (`PathEditor` in-place + fallback rebuild)
- [x] Привести mapping `lineRefs ↔ segIds` к одному месту
- [x] Убрать дублирование преобразований path/elements в критичных ветках синка

### 6.4 Фаза D — Полный single-source режим

- [x] Сохранить текущую модель инструментов, но перевести edit-flow на единый sync pipeline
- [x] Оставить `setElements()` как совместимый fallback, убрать лишние отдельные entry/special rebuild ветки
- [x] Минимизировать флаги реэнтрантности в рабочих сценариях (selection/line updates идут без rebuild)

### 6.5 Критерии готовности (manual acceptance)

- [x] При переходе preview → edit:
  - [x] порядок элементов 1:1 сохраняется
  - [x] состояние свёрнутости 1:1 сохраняется
  - [x] выделение строк/элементов сохраняется корректно
- [x] При edit → preview:
  - [x] структура PathEditor остаётся консистентной
  - [x] нет «самопроизвольного» раскрытия/пересортировки
- [x] Изменения с канваса не ломают текстовую структуру редактора
- [x] Изменения из текста корректно отображаются на канвасе
- [x] Формулы `{var}` и выражения `{expr}` сохраняются при неизменившемся значении
- [x] Сборка проходит (`npm run build`)

### Итог Этапа 6

- `PathEditor` и `ProfileEditor` переведены на единый sync pipeline между preview/edit.
- Добавлен non-destructive sync для selection, line updates и shape updates.
- Исправлена персистентность порядка top-level элементов между режимами.
- Исправлена персистентность collapsed/expanded состояния (в т.ч. при регенерации contourId).
- Формулы/переменные приоритетны: при неизменённом значении токен формулы сохраняется или восстанавливается.

### 6.6 TODO: Консистентность формул для параметров shape/команд (в работе)

Наблюдение:
- Для path/polyline формулы уже сохраняются стабильно.
- Для shape-параметров (особенно при переходах preview ↔ edit ↔ preview) поведение пока частично неконсистентно: отдельные параметры могут временно отображаться числом в edit-mode или терять формульный токен при сериализации.

Что уже сделано:
- Добавлен formula-priority merge для path/polyline (сравнение по численной эквивалентности, допуск `1e-4`).
- Добавлены локальные улучшения для shape:
  - хранение shape-выражений в `data._expr`;
  - snapshot/restore формул shape-параметров при входе в edit-mode;
  - улучшенная сериализация/десериализация circle (`cx/cy/r`) в raw-path.
- Синк `PathEditor ↔ ProfileEditor` переведён в non-destructive режим с fallback rebuild.

Ограничение текущего подхода:
- Логика формул распределена по нескольким точкам (PathEditor, ProfileEditor, BitsManager, export/import), из-за чего при добавлении новых shape/tool кейсов приходится делать точечные патчи.

### 6.7 План: Universal Param Wrapper (обязательный архитектурный шаг)

Цель: ввести универсальную обёртку для **каждого параметра любой команды/элемента** (аналогично тому, как `evaluateMathExpression` можно применить к любому input).

#### Контракт обёртки `ParamValue`
- `raw: string` — исходный токен (число/`{var}`/выражение)
- `value: number` — вычисленное числовое значение
- `meta: { isFormula:boolean, source:'user'|'import'|'sync', key:string }`
- API:
  - `fromInput(raw, ctx)`
  - `fromNumeric(value, prevRaw, ctx)`
  - `isEquivalent(a, b, eps=1e-4)`
  - `preferRawWhenEquivalent(prevRaw, nextNumeric, ctx)`

#### Где применить
- Path-команды: все токены параметров (`M/L/H/V/A/...`).
- Shape-элементы: все атрибуты (`circle`, `rect`, `ellipse`, будущие элементы).
- Import/export/sync: хранение и восстановление raw/value через единый API без специальных кейсов на тип.

#### TODO-чеклист внедрения
- [ ] Создать модуль `ParamWrapper` (`src/editor/param/ParamWrapper.js` или `src/utils/ParamWrapper.js`).
- [ ] Перевести shape-атрибуты (`_expr`, `radiusExpr` и др.) на единый `ParamValue`-слой.
- [ ] Унифицировать merge логики в `PathEditor/ProfileEditor/BitsManager` через `ParamWrapper`.
- [ ] Унифицировать import/export токенов (path + shape) через `ParamWrapper`.
- [ ] Добавить regression-сценарии: preview→edit→preview для всех параметров `circle/rect/ellipse` и mixed path+shape кейсов.
- [ ] Для новых инструментов/элементов использовать только `ParamWrapper` (запрет ad-hoc formula логики в tool-коде).

---

## Следующие шаги (после Этапа 5)

- Object snap: endpoint, midpoint, intersection
- Зеркалирование и ось
- Trim, Fillet, Chamfer, Offset

---

## ЭТАП 7: Element MOD / SVG Transformations (план)

### Цель

Добавить к top-level элементам (`path/polyline/circle/rect/ellipse`) сущность модификаторов трансформации,
чтобы сохранять исходный тип элемента (например `rect`) и применять геометрию через
`transform` вместо обязательной конвертации в `path`.

Базовый синтаксис в PathEditor:
- `MOD RT 45` → `transform="rotate(45)"`

Расширяемый набор команд (как roadmap):
- `TR` = `translate(...)`
- `SC` = `scale(...)`
- `RT` = `rotate(...)`
- `SX` = `skewX(...)`
- `SY` = `skewY(...)`
- `MT` = `matrix(...)`

На первом шаге реализуется только `RT`.

### 7.1 Фаза A — Data Model Foundation (только RT)

- [x] Ввести унифицированное поле модификаторов для элемента:
  - `elem.transforms: Array<{ type:'RT'|'TR'|'SC'|'SX'|'SY'|'MT', raw:string, params:string[] }>`
- [x] Добавить helper-слой парсинга/сериализации:
  - `MOD RT 45` ↔ объект трансформации
  - объект трансформации ↔ SVG `transform` string
- [ ] Сохранить backward compatibility: элементы без `transforms` работают как раньше.

### 7.2 Фаза B — PathEditor UI/UX (только RT)

- [x] При выделении элемента показывать блок MOD-команд рядом с командами элемента.
- [x] Кнопка `MOD` добавляет `RT` modifier к выбранному top-level элементу.
- [x] Inline-редактирование параметра угла с поддержкой формул/переменных (`{var}` / выражения).
- [ ] ПКМ/ESC поведение для MOD-редактирования совпадает с общими правилами tools.

### 7.3 Фаза C — Serialization / Preview Integration

- [ ] Экспорт в preview/сохранение учитывает `RT` как `transform="rotate(...)"` на элементе.
- [ ] Импорт из сохранённого SVG/внутреннего формата восстанавливает `MOD RT ...`.
- [ ] Не конвертировать `rect/circle/ellipse` в `path` только из-за поворота.

### 7.4 Фаза D — Editor Tools Interop

- [ ] `Rect2pt` по умолчанию создаёт `rect` (ортогональный) + без transform.
- [ ] `Rect3pt` может сохранять прямоугольник как `rect` + `MOD RT angle` (+ width/height).
- [ ] Вычисление `angle` от базовой оси относительно стартовой точки фигуры.
- [ ] Дальнейшее редактирование width/height/angle остаётся параметрическим.

### 7.5 Критерии готовности (RT)

- [ ] Можно добавить `MOD RT` к `rect/circle/path` и увидеть корректный preview.
- [ ] После `preview -> edit -> preview` `MOD RT` не теряется.
- [ ] Формулы в параметрах MOD (например `MOD RT {a}`) сохраняются при неизменённом значении.
- [ ] Сборка проходит (`npm run build`).

### Принцип архитектуры

`MOD` должен работать как универсальный параметрический wrapper для геометрии элемента,
аналогично `evaluateMathExpression` для input-формул:
- один общий contract;
- одинаковый pipeline для parse/eval/serialize;
- без ad-hoc логики под каждый отдельный инструмент.

---

## ЭТАП 8: Полная совместимость Edit/Preview + Pivot Rotate (новый roadmap)

### Цели

1. `Rectangle` и другие primitives (`circle/rect/ellipse`) не деградируют в `polyline/path`
   при любых циклах `edit ↔ preview`.
2. `RT` поворачивает вокруг pivot-точки элемента (не вокруг глобального центра).
3. Добавить CAD-подобный инструмент `Rotate` с hotkey `O`.
4. Модификаторы не разрушают базовую параметрическую модель элемента
   (ширина/высота/центр/радиус остаются каноническими параметрами).

### Зафиксированные решения

- **Источник истины**: канонический `profileElements` (primitives + transforms).
- `profilePath/profileSvg` — **производные** данные для preview/export/legacy.
- Hotkey: `R` остаётся у Rect, `Rotate` назначается на `O`.
- Pivot в Rotate: **обязательный клик pivot** (без неявного default).
- Scope Rotate (MVP+): top-level элементы + под-режим rotate сегментов.

### План внедрения

#### 8.1 Canonical model и persistence
- [ ] Ввести/закрепить `profileElements` в сохранении bit (`BitsManager`, store, payload).
- [ ] Гарантировать, что при наличии `profileElements` hydration в edit идёт из них, а не из path.
- [ ] Оставить `profilePath`/`profileSvg` как derived outputs (для совместимости и 3D).

#### 8.2 Устранение деградации Rectangle/Shape
- [ ] Убрать path-only реконструкцию как основной путь при возврате в edit.
- [ ] Использовать `setElements(...)`/canonical rehydrate для `PathEditor` и `ProfileEditor`.
- [ ] Оставить `_importPath()` только как fallback для legacy данных без `profileElements`.
- [ ] Добавить миграционный fallback: legacy path → one-time reconstruction → canonical save.

#### 8.3 Pivot-aware RT как единая математика
- [ ] Расширить contract RT: `params: [angle, px, py]` (legacy `angle` без pivot поддержать).
- [ ] Централизовать transform math (world↔local с pivot) и применять везде одинаково:
  - [ ] `EditorCanvas` (render + hitTest)
  - [ ] `BitsManager` preview/profileSvg
  - [ ] `TransformCommands` serialize/parse/eval
- [ ] Убрать повороты вокруг глобального origin как дефолт для элементов с заданным pivot.

#### 8.4 Инструмент Rotate (CAD-like)
- [ ] Добавить `Rotate` в `EditorToolbar` (hotkey `O`) и фабрику tools в `ProfileEditor`.
- [ ] Реализовать tool-фазы:
  1) activate/select,
  2) click pivot,
  3) drag angle (фантом фигуры + фантом угол/радиус),
  4) input angle,
  5) commit/cancel.
- [ ] Использовать существующие ghost/overlay подходы (по аналогии с ArcTool).
- [ ] Добавить под-режим поворота сегментов path-группы.

#### 8.5 UX и редактирование после модификатора
- [ ] Обеспечить редактирование/перемещение в базовой системе координат элемента
      (модификатор влияет на отображение, а не «ломает» локальные параметры).
- [ ] Для `rect` сохранить параметричность (`w/h/rx`) после RT и после mode switches.

#### 8.6 Тест-критерии (обязательные)
- [ ] Цикл 10+ раз: `edit → preview → edit` без деградации `rect/circle/ellipse`.
- [ ] RT pivot test: явный pivot не в центре, drag + numeric angle → совпадает в edit/preview/reopen.
- [ ] Legacy test: `MOD RT angle` (без pivot) корректно загружается и работает по fallback.
- [ ] Undo/redo, selection, hit-test не ломаются после Rotate.
- [ ] `npm run build` проходит.

### Порядок выполнения (итеративно)

1) Canonical model + no-degradation pipeline
2) Pivot-aware RT end-to-end
3) Rotate tool MVP
4) Rotate segment-mode
5) Stabilization + regression suite

---

*Последнее обновление: 28.06.2026*

---

## Symmetry Group — сессия исправлений (29.06.2026)

### Исправленные баги

#### 1. `isReadOnlyElem is not defined` в `_buildPathGroup`
**Файл:** `src/panel/PathEditor.js`  
**Причина:** переменные `isReadOnlyElem`, `inSymGroup` объявлялись после первого использования.  
**Исправление:** переменные перенесены в начало функции.

#### 2. Зеркальные элементы отображались как siblings Symmetry-группы (не как дочерние)
**Файл:** `src/editor/tools/MirrorTool.js` → `_commitMirror`  
**Причина:** snapshots создавались с `parentGroupId: null` вместо `parentGroupId: symGroupId`.  
**Исправление:** `parentGroupId: symGroupId` теперь проставляется для всех symmetry-снапшотов.

#### 3. Symmetry-группа отображалась пустой
**Файл:** `src/editor/EditorStateManager.js` → `getElements()`  
**Причина:** группы добавлялись в конец массива → `_renderElements()` регистрировал номер строки группы ПОСЛЕ её дочерних элементов.  
**Исправление:** multi-pass цикл вставляет каждую группу ПЕРЕД первым дочерним элементом.

#### 4. Пустая дополнительная группа появлялась между source-группой и sym-группой
**Файл:** `src/editor/ProfileEditor.js` → `_orderElementsLikePathEditor`  
**Причина:** новые sym-группы попадали в `pool` (не в старый snapshot) и добавлялись в конец `ordered`, смещая другие группы на неверные позиции.  
**Исправление:** sym-группы из `pool` вставляются сразу после последнего потомка source-группы в `ordered`.

#### 5. `linkType`/`sourceGroupId`/`axis` теряются после редактирования текста
**Файл:** `src/panel/PathEditor.js` → `getElementsDebugSnapshot()`  
**Причина:** snapshot для групп не включал поля `linkType`, `sourceGroupId`, `axis`.  
**Исправление:** группы в debug snapshot теперь включают `linkType`, `sourceGroupId`, `axis`.

### Архитектурные изменения

#### `EditorStateManager._syncSymmetryContours` — переписан полностью
Group-driven режим:
- Итерирует `elementGroups` с `linkType:'symmetry'`
- Находит source segs по `groupId === sourceGroupId`
- Добавляет/обновляет/удаляет зеркальные контуры синхронно с source-группой
- Поддерживает contour segs и standalone shapes (circle/rect/ellipse)

#### `MirrorTool` UX — симметрия только для групп
- `_setSingleChainSelection`: в symmetry-mode выделяет всю группу
- `_captureSourceSelection`: auto-группирует несгруппированные сегменты перед захватом
- `_commitMirror`: имя sym-группы = имя source-группы

#### `PathEditor._buildGroupRow` — формат "Symmetry ▼ | groupName"
- Кнопка: `"Symmetry ▼"` для sym-групп
- Имя source-группы — в отдельной read-only param-ячейке

### Статус
- ✅ `npm run build` — успешно
- ✅ `_restoreStateStructureFromElements` уже корректно читал `linkType`/`sourceGroupId`/`axis` из групп

*Последнее обновление: 29.06.2026*

---

## Symmetry Stability + Performance (05.03.2026)

### Что исправлено
- [x] Фикс перепутывания source/symmetry shape после `save -> preview -> edit`:
  - `shape.groupId` теперь сохраняется в snapshot/sanitize и корректно восстанавливается при `enter()`.
  - В restore добавлен fallback `groupId <- parentGroupId`, чтобы ownership не терялся.
- [x] Усилен `EditorStateManager._syncSymmetryContours`:
  - source-группа резолвится только из `linkType != 'symmetry'`.
  - Убран лишний тяжелый пересчёт `getElements()` внутри цикла по sym-группам (считается один раз на sync).

### Рефакторинг
- [x] Вынесена общая геометрическая математика в shared-модуль:
  - `src/editor/tools/shared/transformGeometry.js`
  - Экспорт: `sumRtAngle`, `withRtAngle`, `rotatePoint`, `mirrorPoint`, `worldFromRaw`, `rawFromWorld`, `dot`, `axisAngleDeg`.
- [x] `MirrorTool` переведен на shared helper-ы.
- [x] `EditorStateManager` переведен на shared helper-ы.

### Оптимизация UI/логирования
- [x] В `ProfileEditor._debugLog` добавлен throttle для шумных событий:
  - `state.updateSegments`, `state.syncSymmetryContours`, `syncToPathEditor.canvas`.
- [x] Добавлен cap debug-textarea (хранится последние ~400 строк), чтобы не разгонять reflow/GC при drag.

### Эффект
- Стабильная принадлежность shape к source/symmetry после повторного входа в edit.
- Меньше фризов при перемещении/редактировании элементов в symmetry-сценариях.

*Последнее обновление: 05.03.2026*

---

## Symmetry UX Parity + Pair Binding + Cache (05.03.2026)

### UX parity (selection)
- [x] `MirrorTool` в режиме `symmetry` переведён на тот же selection-flow, что и остальные инструменты:
  - click / shift-toggle / box selection,
  - `Ctrl+Shift` part-selection (включая rect-side выбор) теперь не отключается для symmetry.
- [x] Удалён special-case single-chain selection для symmetry, который ломал рамочное выделение.

### PathEditor pair binding (source group + symmetry)
- [x] При drag source-группы в `PathEditor` её symmetry-группа перемещается вместе с ней.
- [x] Реализовано через расширение `_expandMoveIndicesWithGroupDescendants(...)`:
  - добавляется связанная symmetry-группа по `sourceGroupId`,
  - fallback по `sourceGroupGuid` при remap id.

### Performance
- [x] Добавлен signature-cache в `EditorStateManager._syncSymmetryContours`:
  - key: `symGroupId`,
  - сигнатура: `sourceGroupId + axisSig + sourceSegSignature`.
- [x] При cache-hit зеркальная перестройка пропускается (`cacheHit:true` в debug summary),
      что уменьшает нагрузку на drag/continuous edits.

### Статус
- [x] Build проходит.

*Последнее обновление: 05.03.2026*

---

## Symmetry Regression Fix + Next Roadmap (05.03.2026)

### Фикс регрессии после aggressive cache
- [x] Исправлен баг, при котором symmetry-элементы периодически исчезали/появлялись во время редактирования source-группы.
- [x] Причина: при `cacheHit` в `_syncSymmetryContours` пересчёт пропускался, но существующие mirrored-сегменты не возвращались в рабочий массив.
- [x] Исправление: при `cacheHit` добавлять `prevMirrors` в `work` (retain без rebuild).

### План доработки Symmetry (следующие этапы)
- [ ] Замыкание открытых Path между source Group и Symmetry:
  - [ ] если Path не замкнут, соединять начальные/конечные точки source и symmetry для получения замкнутого контура,
  - [ ] сегменты, выходящие за ось симметрии, отсекать (будущий инструмент `scissors`).
- [ ] Булево объединение замкнутых контуров:
  - [ ] все замкнутые элементы (включая замкнутые Path) объединять со своей symmetry через `boolean union` (будущий инструмент `boolean union`).
- [ ] Конвертация `Symmetry -> Group` (с потерей связи с parent):
  - [ ] действие по `ПКМ` на строке Symmetry в `PathEditor`,
  - [ ] после конвертации Symmetry становится обычной `Group` с независимыми редактируемыми элементами,
  - [ ] удаляются link-поля (`linkType/sourceGroupId/sourceGroupGuid/axis`) и отключается live-sync с parent Group.

*Последнее обновление: 05.03.2026*