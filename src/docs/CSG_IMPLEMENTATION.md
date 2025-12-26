# CSG (Constructive Solid Geometry) Implementation

## Overview
Добавлена интеграция библиотеки **three-bvh-csg** для булевых операций в 3D сцене. Теперь 3D вид реагирует на кнопки управления видимостью и операции вычитания фрез из материала панели.

## Установка
Библиотека уже установлена через npm:
```bash
npm install three-bvh-csg
```

## Функциональность

### 1. Кнопка "Bits" (Видимость фрез)
**Файл:** `src/script.js` -> `toggleBitsVisibility()`

Управляет видимостью фрез в обоих представлениях (2D и 3D):
- **2D:** Скрывает/показывает слой фрез на канвасе
- **3D:** Вызывает `threeModule.toggleBitMeshesVisibility()` для скрытия/отображения 3D моделей фрез

```javascript
// Пример использования
toggleBitsVisibility(); // Переключить видимость
```

### 2. Кнопка "Part" (Вычитание фрез из материала)
**Файл:** `src/script.js` -> `togglePartView()`

Применяет/отменяет CSG операцию вычитания фрез из панели:
- **2D:** Показывает/скрывает контур части (партспасе)
- **3D:** Вызывает `threeModule.applyCSGOperation(showPart)` для булевой операции

```javascript
// Пример использования
togglePartView(); // Переключить CSG операцию
```

## API ThreeModule

### `toggleBitMeshesVisibility(visible: boolean)`
Переключает видимость всех мешей фрез.

**Параметры:**
- `visible` (boolean) - true для показания, false для скрытия

**Пример:**
```javascript
window.threeModule.toggleBitMeshesVisibility(true); // Показать фрезы
window.threeModule.toggleBitMeshesVisibility(false); // Скрыть фрезы
```

### `applyCSGOperation(apply: boolean)`
Применяет или отменяет операцию вычитания фрез из панели.

**Параметры:**
- `apply` (boolean) - true для применения CSG, false для отмены

**Пример:**
```javascript
window.threeModule.applyCSGOperation(true); // Вычесть фрезы из панели
window.threeModule.applyCSGOperation(false); // Показать панель и фрезы отдельно
```

## Как это работает

### Видимость фрез
1. Пользователь кликает кнопку "Bits"
2. Срабатывает `toggleBitsVisibility()` в `script.js`
3. Функция вызывает `threeModule.toggleBitMeshesVisibility(bitsVisible)`
4. 3D меши фрез скрываются/показываются

### CSG операция
1. Пользователь кликает кнопку "Part"
2. Срабатывает `togglePartView()` в `script.js`
3. Функция вызывает `threeModule.applyCSGOperation(showPart)`
4. В 3D:
   - Если `showPart = true`: Используется CSG для вычитания всех мешей фрез из панели
   - Если `showPart = false`: Показываются панель и фрезы отдельно

## Технические детали

### CSG Операция
```javascript
// Конвертирование меша в CSG
let panelCSG = CSG.fromMesh(panelMesh);

// Вычитание каждой фрезы
bitMeshes.forEach(bitMesh => {
    const bitCSG = CSG.fromMesh(bitMesh);
    panelCSG = panelCSG.subtract(bitCSG);
});

// Преобразование результата назад в меш
const resultMesh = CSG.toMesh(panelCSG, panelMesh.matrix, panelMesh.material);
```

### Обработка ошибок
Если CSG операция вызывает ошибку, система использует fallback:
```javascript
try {
    // Попытка выполнить CSG операцию
} catch (error) {
    console.error("Error applying CSG operation:", error);
    // Fallback: показать панель и фрезы отдельно
    scene.add(panelMesh);
    bitMeshes.forEach(mesh => scene.add(mesh));
}
```

## Интеграция с существующим кодом

### 2D/3D синхронизация
- Обе кнопки ("Bits" и "Part") теперь обновляют и 2D и 3D представления
- CSG операция использует текущие данные из `window.offsetContours`
- Видимость синхронизируется через глобальные флаги `window.bitsVisible` и `window.showPart`

### Автоматическое обновление
При изменении панели или фрез:
- `updateThreeView()` пересчитывает все 3D меши
- CSG операция переприменяется автоматически если она активна

## Производительность

### Оптимизации
- CSG операция кешируется в `this.partMesh`
- Переиспользуются материалы панели
- Геометрия фрез создается один раз

### Рекомендации
- Для больших моделей с множеством фрез CSG может быть медленной
- Для сложных операций рассмотрите использование Web Workers
- При необходимости высокой производительности используйте лишь просмотр без CSG

## Возможные расширения

1. **Разные операции**: Добавить Union, Intersection в дополнение к Subtract
2. **Кэширование**: Оптимизировать повторные вычисления CSG
3. **UI улучшения**: Добавить прогресс-бар для долгих CSG операций
4. **Экспорт**: Экспортировать результат CSG в STL/STEP формате
