# Руководство по миграции на Paper.js

## Обзор

Этот документ описывает постепенную миграцию проекта с SVG/maker.js на Paper.js для улучшения производительности и упрощения кодовой базы.

## Текущий статус (Phase 0)

### ✅ Что уже сделано

1. **Установлен Paper.js**: `npm install paper`
2. **Создан PaperCanvasManager**: [src/canvas/PaperCanvasManager.js](../src/canvas/PaperCanvasManager.js)
3. **Добавлен HTML canvas**: `<canvas id="paper-canvas" resize></canvas>`
4. **Обновлены переключатели вида**:
   - `2D` - SVG canvas (текущая реализация)
   - `2Dp` - Paper.js canvas
   - `3D` - Three.js 3D view
   - `2D/2Dp` - SVG и Paper.js параллельно (для сравнения)
   - `2D/3D` - SVG и Three.js (прежний "Both")
5. **Добавлены CSS стили** для всех режимов отображения
6. **Создана функция синхронизации**: `syncSVGtoPaper()` для копирования данных из SVG в Paper.js

### Как использовать

1. Запустите приложение: `npm run dev`
2. Откройте в браузере: `http://localhost:5173`
3. Используйте кнопки переключения в header:
   - **2D** - работа со стандартным SVG canvas
   - **2Dp** - просмотр Paper.js canvas (автоматически синхронизируется с SVG)
   - **2D/2Dp** - оба canvas параллельно для сравнения

## Архитектура Paper.js

### PaperCanvasManager

Основной класс для управления Paper.js canvas. Имеет аналогичную структуру с CanvasManager.

**Слои (Layers)**:
```javascript
{
    grid: Layer,      // Сетка
    shapes: Layer,    // Панель и основные формы
    offsets: Layer,   // Offset контуры
    bits: Layer,      // Инструменты (биты)
    phantom: Layer,   // Phantom биты для V-Carve
    overlay: Layer    // UI overlay
}
```

**Основные методы**:
- `createPanel(width, height, thickness)` - создать панель
- `addBit(bitData)` - добавить инструмент
- `createOffset(path, distance)` - создать offset (заменяет OffsetCalculator)
- `subtractPaths(path1, path2)` - булева операция вычитания
- `unitePaths(paths)` - булева операция объединения
- `clear()` - очистить canvas
- `fitToView()` - fit to scale
- `exportSVG()` - экспорт в SVG
- `exportPathData()` - экспорт path data для Three.js

### Преимущества Paper.js

#### 1. Offset операции
**До (offsetCalculator.js - 225 строк)**:
```javascript
const calculator = new OffsetCalculator();
const offsetPoints = calculator.calculateOffset(points, distance);
// Ручной расчёт перпендикуляров, пересечений, удаление дублей...
```

**После (Paper.js - 1 строка)**:
```javascript
const offsetPath = path.offset(distance);
// Автоматическая обработка self-intersections, holes, corner joins
```

#### 2. Boolean операции
**До (makerProcessor.js - 234 строки)**:
```javascript
const makerjs = require("makerjs");
const panelModel = createPathData(panelSection, { x: 0, y: 0 });
const bitModels = bitsOnCanvas.map(bit => createPathData(bit));
let unionBits = bitModels[0];
for (let i = 1; i < bitModels.length; i++) {
    unionBits = makerjs.model.combineUnion(unionBits, bitModels[i]);
}
const result = makerjs.model.combineSubtraction(panelModel, unionBits);
const svg = makerjs.exporter.toSVG(result);
// Парсинг SVG для получения path data...
```

**После (Paper.js - ~10 строк)**:
```javascript
const panelPath = new paper.Path.Rectangle({ ... });
let bitsUnion = null;
for (const bit of bitsOnCanvas) {
    const bitPath = createBitPath(bit);
    bitsUnion = bitsUnion ? bitsUnion.unite(bitPath) : bitPath;
}
const result = panelPath.subtract(bitsUnion);
const pathData = result.pathData;
```

#### 3. Hit Testing
**До (ручная проверка bounding boxes)**:
```javascript
function isPointInBit(x, y, bit) {
    // Ручная проверка координат, bounding box, и т.д.
}
```

**После (Paper.js встроенное)**:
```javascript
const hitResult = project.hitTest(point);
if (path.contains(point)) { ... }
```

## План миграции

### Phase 1: Boolean операции (Высокий приоритет)
**Цель**: Заменить maker.js на Paper.js для булевых операций

**Шаги**:
1. Создать `PaperBooleanProcessor.js` в `src/operations/`
2. Реализовать методы:
   - `calculateResultPolygon(panelData, bitsData)` - основной метод
   - `createPanelPath(width, thickness)` - создание панели
   - `createBitPath(bitData)` - создание bit shape
   - `uniteAllBits(bitPaths)` - объединение всех битов
   - `subtractFromPanel(panelPath, bitsUnion)` - вычитание
3. Обновить `updatePartShape()` в script.js для использования Paper.js
4. Протестировать против текущего maker.js результата
5. Удалить `makerProcessor.js` и зависимость maker.js

**Ожидаемый результат**:
- Удаление 234 строк кода
- Ускорение boolean операций
- Более точные результаты

### Phase 2: Offset операции (Высокий приоритет)
**Цель**: Заменить OffsetCalculator на Paper.js offset

**Шаги**:
1. Обновить `updateOffsetContours()` в script.js
2. Заменить:
   ```javascript
   const calculator = new OffsetCalculator();
   const offsetPoints = calculator.calculateOffset(points, offset);
   ```
   на:
   ```javascript
   const path = new paper.Path(points);
   const offsetPath = path.offset(offset);
   ```
3. Экспортировать offsetPath.pathData для SVG отображения
4. Протестировать V-Carve multi-pass операции
5. Удалить `offsetCalculator.js`

**Ожидаемый результат**:
- Удаление 225 строк кода
- Лучшая обработка сложных случаев (self-intersections)
- Более качественные offset контуры

### Phase 3: Bit Shapes (Средний приоритет)
**Цель**: Мигрировать создание bit shapes на Paper.js

**Шаги**:
1. Создать `PaperBitShapeFactory.js` в `src/canvas/`
2. Реализовать методы для каждого типа:
   - `createCylindricalBit(diameter, ...)`
   - `createConicalBit(diameter, angle, ...)`
   - `createBallNoseBit(diameter, ...)`
   - `createFilletBit(diameter, radius, ...)`
   - `createBullNoseBit(diameter, radius, ...)`
3. Обновить `BitsManager.createBitShapeElement()`
4. Тестирование всех типов битов

**Ожидаемый результат**:
- Упрощение кода создания shapes
- Возможность использования Paper.js трансформаций
- Лучшая производительность

### Phase 4: Полная миграция canvas (Низкий приоритет)
**Цель**: Полностью заменить SVG canvas на Paper.js

**Шаги**:
1. Мигрировать все SVG манипуляции на Paper.js API
2. Обновить event handling (click, drag, etc.)
3. Мигрировать zoom/pan логику
4. Обновить grid rendering
5. Мигрировать selection/highlighting
6. Удалить CanvasManager, использовать только PaperCanvasManager

**Ожидаемый результат**:
- Удаление всей SVG DOM манипуляции
- Современный Canvas-based подход
- Упрощение архитектуры

## Текущие ограничения Paper.js

### 1. Canvas vs SVG DOM
Paper.js рисует в HTML5 `<canvas>`, не в SVG DOM. Это значит:
- Нельзя использовать `document.querySelector('#bit-123')`
- Нужно использовать Paper.js API для доступа к элементам
- Event handling отличается (Paper.js события вместо DOM событий)

### 2. Интеграция с Three.js
Paper.js только 2D, Three.js отдельно:
- Экспортируем path data из Paper.js: `path.pathData`
- Передаём в Three.js для extrusion
- Текущая архитектура остаётся, только меняется источник данных

### 3. Zoom & Pan
Paper.js имеет своё:
- `view.zoom` вместо SVG `viewBox`
- `view.center` вместо SVG transform
- Нужна синхронизация с текущими zoom utils

## API Reference

### PaperCanvasManager Methods

#### Создание элементов
```javascript
// Панель
paperCanvasManager.createPanel(width, height, thickness);

// Bit
paperCanvasManager.addBit({
    id: 'bit1',
    x: 100,
    y: 50,
    diameter: 10
});

// Offset
const offsetPath = paperCanvasManager.createOffset(originalPath, distance);
```

#### Boolean операции
```javascript
// Вычитание
const result = paperCanvasManager.subtractPaths(path1, path2);

// Объединение
const union = paperCanvasManager.unitePaths([path1, path2, path3]);
```

#### Управление view
```javascript
// Zoom
paperCanvasManager.zoomIn();
paperCanvasManager.zoomOut();
paperCanvasManager.fitToView();

// Pan
paperCanvasManager.pan(dx, dy);
```

#### Экспорт
```javascript
// SVG export
const svgString = paperCanvasManager.exportSVG();

// Path data (для Three.js)
const pathData = paperCanvasManager.exportPathData();
```

#### Очистка
```javascript
paperCanvasManager.clear();           // Всё
paperCanvasManager.clearBits();       // Только bits
paperCanvasManager.clearOffsets();    // Только offsets
```

## Тестирование

### Ручное тестирование
1. Создайте панель и несколько битов в SVG режиме (2D)
2. Переключитесь на 2Dp - должны увидеть те же элементы
3. Переключитесь на 2D/2Dp - должны видеть оба canvas параллельно
4. Сравните результаты визуально

### Автоматическое тестирование
(TODO: Добавить unit tests для PaperCanvasManager)

## Полезные ссылки

- [Paper.js Documentation](http://paperjs.org/reference/)
- [Paper.js Tutorials](http://paperjs.org/tutorials/)
- [Paper.js Path Offset](http://paperjs.org/reference/path/#offset-offset)
- [Paper.js Boolean Operations](http://paperjs.org/reference/path/#unite-path)
- [Paper.js Examples](http://paperjs.org/examples/)

## Вопросы и ответы

### Q: Нужно ли удалять SVG canvas сразу?
**A**: Нет! Мы держим оба параллельно во время миграции. SVG остаётся как fallback.

### Q: Как будет работать Three.js после миграции?
**A**: Paper.js экспортирует path data через `path.pathData`, который передаётся в Three.js точно так же, как сейчас передаётся SVG path data.

### Q: Что делать с существующими event listeners?
**A**: Постепенно мигрировать на Paper.js события:
- `onMouseDown` вместо `addEventListener('mousedown')`
- `onMouseDrag` вместо ручного tracking mouse move
- `onMouseUp` вместо `addEventListener('mouseup')`

### Q: Можно ли использовать Paper.js только для offset/boolean?
**A**: Да! Можно держать SVG для rendering, но использовать Paper.js только для вычислений offset и boolean. Это hybrid подход.

## Следующие шаги

1. ✅ **Протестировать текущую реализацию**
   - Открыть приложение
   - Переключаться между режимами 2D, 2Dp, 2D/2Dp
   - Убедиться что Paper.js canvas работает

2. **Начать Phase 1: Boolean операции**
   - Создать PaperBooleanProcessor.js
   - Реализовать основные методы
   - Протестировать против maker.js

3. **Начать Phase 2: Offset операции**
   - Обновить updateOffsetContours()
   - Заменить OffsetCalculator на Paper.js
   - Протестировать V-Carve

4. **Документировать результаты**
   - Замерить производительность
   - Сравнить качество результатов
   - Обновить этот документ

---

*Документ создан: 2026-01-04*  
*Последнее обновление: 2026-01-04*
