# Agent Progress Log - Profile Bit Type с 2D Cross-Section SVG Editor

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

**Завершённые инструменты:** CursorTool (выделение цепочек, box-select), MoveTool (перемещение цепочек, welded-vertex), LineTool (базовый), MirrorTool (базовый), ArcTool (arc3pt + arc2pt с типизированным радиусом / переменными {d})

**В работе:** Этап 3.3 — реализация оставшихся инструментов рисования

---

## Ключевые архитектурные решения и исправления

### PathEditor ↔ Canvas синхронизация (реализовано)
PathEditor — единственный источник правды для сырого текста пути (включая M, Z, {формулы}).
- **Текст → канвас**: `pathEditor.onChange` → `_importPath(path, {resetHistory:false})` — пересоздаёт сегменты, не трогает текст. Флаг `_pathEditorIsSource = true` на время обработки.
- **Канвас → текст**: `state.onSegmentsChange` → `syncToPathEditor()` — экспортирует числовой путь и вызывает `pathEditor.setPath()` только если `_pathEditorIsSource === false`.
- **Инициализация**: `_rebuildLineSegIds()` строит row→segId карту без вызова `setPath()` — формулы не затираются.

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

## Следующие шаги (Этап 3)

1. ✅ Визуальная проверка пройдена (fit, сетка, padding)
2. ✅ Кнопка `Edit` в preview для `profile` типа
3. ✅ Переключение preview/edit режим на том же canvas
4. ✅ Базовая структура редактора (`src/editor/`) с адаптацией к CanvasManager
5. ✅ CursorTool (выделение цепочек), MoveTool (перемещение, welded-vertex)
6. ✅ PathEditor двусторонняя синхронизация (text ↔ canvas, M/Z/формулы сохраняются)
7. ✅ ArcTool — arc3pt и arc2pt режимы, Floyd-радиус по формуле `{varname}` (Line полная, Circle, Rect — ещё не готовы)
8. Добавить детальную систему привязок (object snap: endpoint, midpoint, intersection)
9. Добавить зеркалирование и ось
10. Реализовать инструменты редактирования (Trim, Fillet, Chamfer, Offset…)

---

*Последнее обновление: 25.06.2026*