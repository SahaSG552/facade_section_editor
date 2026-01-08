# Arc Approximation for 2D Canvas and 3D Extrusion

## Overview

Аппроксимация кривых Безье в дуги теперь применяется не только к DXF экспорту, но и к:
1. **2D Canvas (Paper.js)** - визуальное отображение offset контуров
2. **3D Extrusion** - пути экструзии для фрез

Это обеспечивает **консистентность** между всеми тремя представлениями геометрии.

## Architecture

### Data Flow

```
Panel Path (SVG) 
    ↓
Paper.js offset() → Bezier curves
    ↓
parseSVGPathSegments() → segments array
    ↓
optimizeSegmentsToArcs() → Bezier → Arc conversion
    ↓
segmentsToSVGPath() → SVG path with arcs
    ↓
├─→ 2D Canvas display (visual)
└─→ window.offsetContours → 3D Extrusion
```

### Files Modified

#### 1. `src/utils/arcApproximation.js` (NEW)
Утилиты для аппроксимации арок:
- `segmentsToSVGPath(segments)` - конвертирует segments обратно в SVG path строку
- `approximatePath(pathData, exportModule, tolerance)` - применяет аппроксимацию к SVG path

**Key Functions:**
```javascript
// Convert segments array back to SVG path string
segmentsToSVGPath(segments) 
// Returns: "M x y L x y A rx ry rotation large-arc sweep x y Z"

// Apply Bezier → Arc approximation
approximatePath(pathData, exportModule, tolerance=0.15)
// Returns: approximated SVG path string
```

#### 2. `src/operations/PaperOffsetProcessor.js` (MODIFIED)
Добавлена поддержка аппроксимации в функцию `calculateOffsetFromSVG()`:

**New Options:**
- `useArcApproximation: boolean` - включить/выключить аппроксимацию
- `arcTolerance: number` - RMS tolerance в мм (default 0.15)
- `exportModule: ExportModule` - экземпляр для parseSVGPathSegments/optimizeSegmentsToArcs

**Usage:**
```javascript
const offsetCalculator = new PaperOffsetCalculator({
    useArcApproximation: true,
    arcTolerance: 0.15,
    exportModule: exportModule
});
```

#### 3. `src/script.js` (MODIFIED)
Функция `updateOffsetContours()` теперь создает `PaperOffsetCalculator` с включенной аппроксимацией:

```javascript
// Get ExportModule for arc approximation
const exportModule = app.getModule("export");

// Create offset calculator with arc approximation
const offsetCalculator = usePaperJsOffset
    ? new PaperOffsetCalculator({
          useArcApproximation: true,
          arcTolerance: 0.15,
          exportModule: exportModule,
      })
    : new OffsetCalculator();
```

## Arc Approximation Algorithm

### Parameters
- **Tolerance:** 0.15mm RMS error (ultra-high precision)
- **Adaptive Levels:** 4 tolerance levels [0.15, 0.225, 0.375, 0.6] mm
- **Sampling:** 256 points per Bezier segment
- **Circle Fitting:** Pratt algebraic method + 2 iterations Newton refinement

### Process
1. **Group consecutive Beziers** - объединяет последовательные Безье кривые
2. **3-point circle fitting** - фиксирует начальную и конечную точки
3. **RMS error validation** - проверяет качество аппроксимации
4. **Adaptive tolerance** - пробует 4 уровня tolerance до успешной конвертации

### Quality Metrics
- Endpoint error: < 0.0001mm
- RMS error: 0.15mm - 0.6mm (adaptive)
- Conversion rate: ~100% (with adaptive tolerance)

## Benefits

### Consistency
Все три представления используют одинаковую геометрию:
- **DXF Export** - дуги вместо сплайнов
- **2D Canvas** - дуги вместо Безье кривых
- **3D Extrusion** - дуги вместо Безье кривых

### Performance
- Меньше точек для рендеринга
- Более быстрые CSG операции в THREE.js
- Меньший размер DXF файлов

### Accuracy
- Сохранение точных конечных точек
- Постоянный радиус для групп Безье
- Метрика RMS error для валидации

## Configuration

### Enable/Disable
Аппроксимация включена по умолчанию для Paper.js offset:
```javascript
usePaperJsOffset = true; // Uses PaperOffsetCalculator with arc approximation
```

### Change Tolerance
Изменить tolerance в `script.js`:
```javascript
const offsetCalculator = new PaperOffsetCalculator({
    useArcApproximation: true,
    arcTolerance: 0.3, // Higher = less accurate but more conversions
    exportModule: exportModule,
});
```

### Disable Arc Approximation
Отключить аппроксимацию:
```javascript
const offsetCalculator = new PaperOffsetCalculator({
    useArcApproximation: false, // Keep Bezier curves
});
```

## Testing

### Visual Verification
1. Откройте приложение
2. Создайте панель с кривыми (не прямоугольник)
3. Добавьте фрезы с offset
4. Проверьте offset контуры в 2D Canvas (должны быть дуги)
5. Проверьте 3D extrusion (должны использовать дуги)

### Console Output
```
Arc approximation: 8/8 Beziers converted (100%)
```

### Compare with DXF
Экспортируйте в DXF и убедитесь, что геометрия совпадает с 2D/3D представлением.

## Troubleshooting

### No Conversion
Если Bezier кривые не конвертируются (0/X converted):
- Увеличьте `arcTolerance` (0.3, 0.5, 1.0)
- Проверьте, что кривые достаточно близки к аркам
- Проверьте консоль на ошибки

### Visual Artifacts
Если видны визуальные артефакты:
- Уменьшите `arcTolerance` для большей точности
- Проверьте RMS error в консоли
- Сравните с DXF экспортом

### Performance Issues
Если производительность медленная:
- Аппроксимация выполняется один раз при создании offset
- Результат кешируется в `window.offsetContours`
- Нет дополнительных вычислений при рендеринге

## Future Improvements

1. **User Control** - добавить UI для включения/выключения аппроксимации
2. **Per-Bit Tolerance** - разные tolerance для разных фрез
3. **Visual Comparison** - overlay оригинальной Bezier и аппроксимированной дуги
4. **Statistics Panel** - показывать conversion rate, RMS errors, etc.
