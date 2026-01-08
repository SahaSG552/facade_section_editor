# Тестирование Paper.js Boolean Engine

## Статус: Phase 1 Complete ✅

Реализован переключатель между maker.js и Paper.js для булевых операций.

## Что сделано

1. ✅ Создан [PaperBooleanProcessor.js](../src/operations/PaperBooleanProcessor.js)
2. ✅ Добавлена кнопка переключения в UI (zoom toolbar)
3. ✅ Обновлена функция `updatePartShape()` с поддержкой обоих engine
4. ✅ Добавлен флаг `usePaperJsBoolean` для переключения

## Как тестировать

### 1. Откройте приложение
```
URL: http://localhost:5174/
```

### 2. Создайте панель и биты
1. Установите размеры панели (по умолчанию 400x600x19)
2. Перетащите несколько битов из левой панели на canvas
3. Включите отображение Part (кнопка **Part**)

### 3. Переключайтесь между engine
**Кнопка в zoom toolbar** (справа от DXF):

- **mkr** (зелёная) = maker.js (текущий, проверенный)
- **ppr** (синяя) = Paper.js (новый)

### 4. Сравните результаты

#### Визуальное сравнение
1. Включите Part view (должен быть серый контур результата)
2. Нажмите **mkr** - увидите результат maker.js
3. Нажмите **ppr** - увидите результат Paper.js
4. Переключайтесь туда-обратно и сравнивайте

#### Использование режима 2D/2Dp
1. Переключитесь на режим **2D/2Dp** (в header)
2. Левый canvas = SVG с maker.js/Paper.js результатом
3. Правый canvas = Paper.js live preview
4. Можно сравнивать параллельно!

## Тестовые сценарии

### Сценарий 1: Простые формы
1. Добавьте 2-3 цилиндрических бита
2. Включите Part
3. Переключайте mkr ⇄ ppr
4. **Ожидаемое**: Результаты должны быть идентичны

### Сценарий 2: Сложные формы
1. Добавьте биты разных типов (conical, ball-nose, fillet)
2. Расположите их близко друг к другу (с перекрытием)
3. Включите Part
4. Переключайте mkr ⇄ ppr
5. **Ожидаемое**: Результаты должны быть близки (возможны минимальные различия на краях)

### Сценарий 3: V-Carve операции
1. Установите операцию VC (V-Carve) для бита
2. Должны появиться phantom биты
3. Включите Part
4. Переключайте mkr ⇄ ppr
5. **Ожидаемое**: Оба engine учитывают phantom биты

### Сценарий 4: Extension биты
1. Добавьте бит который выходит за нижнюю границу панели
2. Должен появиться extension (продление ниже материала)
3. Включите Part
4. Переключайте mkr ⇄ ppr
5. **Ожидаемое**: Extension корректно обрабатывается обоими engine

### Сценарий 5: Производительность
1. Добавьте много битов (10-15 штук)
2. Откройте DevTools → Console
3. Включите Part
4. Переключайте mkr ⇄ ppr и наблюдайте за временем
5. **Ожидаемое**: Paper.js должен быть ≥ maker.js speed

## Логирование

В консоли браузера будут сообщения:

```
[Boolean] Using maker.js
```
или
```
[Boolean] Using Paper.js
```

## Известные ограничения Paper.js (текущие)

1. **Координатная система**: Paper.js использует стандартную canvas систему (Y вниз), SVG может использовать инвертированную. Возможны минимальные смещения.

2. **Path simplification**: Paper.js может упрощать paths (удалять лишние точки), результат будет чище но может отличаться по количеству точек.

3. **Floating point precision**: Небольшие различия в расчётах (< 0.01px) могут быть заметны при сильном zoom.

## Отладка

### Если Paper.js не работает

1. Откройте DevTools → Console
2. Проверьте ошибки
3. Убедитесь что Paper.js загружен: `typeof paper` должен вернуть `"object"`

### Если результаты сильно отличаются

1. Проверьте координаты битов: `console.log(bitsOnCanvas)`
2. Проверьте panel section: `document.getElementById('panel-section')`
3. Используйте debug версию: `paperCalculateResultPolygonDebug()`

### Debug функция

В консоли можно вызвать:

```javascript
import { paperCalculateResultPolygonDebug } from './src/operations/PaperBooleanProcessor.js';

const panelSection = document.getElementById('panel-section');
const result = paperCalculateResultPolygonDebug(panelSection, bitsOnCanvas);

console.log('Panel path:', result.panelPath);
console.log('Bit paths:', result.bitPaths);
console.log('Union:', result.bitsUnion);
console.log('Result:', result.result);
console.log('Path data:', result.pathData);
```

## Метрики успеха

- [ ] Визуальное совпадение результатов maker.js и Paper.js
- [ ] Paper.js обрабатывает все типы битов корректно
- [ ] Paper.js обрабатывает phantom биты корректно
- [ ] Paper.js обрабатывает extensions корректно
- [ ] Производительность Paper.js ≥ maker.js
- [ ] Нет критических ошибок в консоли

## Следующие шаги

После успешного тестирования:

1. Сделать Paper.js engine по умолчанию (`usePaperJsBoolean = true`)
2. Удалить maker.js зависимость
3. Удалить `makerProcessor.js`
4. Начать Phase 2: Offset операции

## Полезные ссылки

- [PaperBooleanProcessor.js](../src/operations/PaperBooleanProcessor.js) - реализация
- [makerProcessor.js](../src/utils/makerProcessor.js) - оригинальная реализация
- [Paper.js Boolean Operations](http://paperjs.org/reference/path/#unite-path) - документация

---

**Создано**: 2026-01-04  
**Статус**: Ready for Testing ✅  
**URL**: http://localhost:5174/
