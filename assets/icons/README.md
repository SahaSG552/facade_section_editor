# Icon System - Loadable SVG Icons with Icon Packs

Система подгружаемых SVG иконок с поддержкой icon packs и fallback на текстовые символы.

## Структура

```
assets/icons/
├── default/                    # Default icon pack
│   ├── pack.json              # Pack configuration
│   ├── *.svg                  # Main toolbar icons
│   └── editor/                # Editor toolbar icons
│       └── *.svg
├── preview.html               # Main toolbar gallery
├── editor/
│   └── preview.html          # Editor toolbar gallery
└── all-icons-gallery.html    # Complete gallery
```

## Возможности

### ✅ Загружаемые SVG иконки
- Иконки загружаются асинхронно из `assets/icons/`
- Не увеличивают размер HTML/JS бандла
- Можно заменить SVG файлы без пересборки

### ✅ Icon Packs
- Поддержка нескольких наборов иконок
- Переключение между паками: `iconLoader.switchPack("minimal")`
- Текущий пак: `default`

### ✅ Fallback символы
- Если SVG не загрузился, показывается Unicode символ
- Гарантирует, что интерфейс всегда функционален
- Примеры: `+` (zoom-in), `−` (zoom-out), `↖` (cursor)

### ✅ Кэширование
- Загруженные иконки кэшируются в памяти
- Повторная загрузка мгновенная
- Очистка кэша: `iconLoader.clearCache()`

## Использование

### В HTML (index.html)

```html
<!-- Кнопка с data-icon атрибутом и fallback символом -->
<button id="zoom-in-btn" data-icon="zoom-in" title="Zoom In">+</button>
<button id="save-btn" data-icon="save" title="Save">💾</button>
```

### В JavaScript (EditorToolbar.js)

```javascript
import { iconLoader } from "../ui/IconLoader.js";

// Кнопка с fallback символом
_buttonHTML(t) {
    const fallback = TOOL_FALLBACKS[t.id] || "?";
    return `<button
        data-tool="${t.id}"
        data-icon="${t.id}"
        data-icon-category="editor"
    >${fallback}</button>`;
}

// Загрузка иконок после монтирования
async _loadIcons() {
    const buttons = this._toolbar.querySelectorAll("button[data-icon]");
    
    for (const button of buttons) {
        const iconName = button.dataset.icon;
        const category = button.dataset.iconCategory || "";
        const svgContent = await iconLoader.loadIcon(iconName, category);
        button.innerHTML = svgContent;
    }
}
```

### Автоматическая загрузка

```javascript
import { loadIconsForButtons } from "./ui/IconButton.js";

// Загрузить все иконки в контейнере
await loadIconsForButtons(document.body);
```

## API

### IconLoader

```javascript
import { iconLoader } from "./ui/IconLoader.js";

// Загрузить одну иконку
const svg = await iconLoader.loadIcon("zoom-in");
const editorSvg = await iconLoader.loadIcon("cursor", "editor");

// Загрузить несколько иконок
const icons = await iconLoader.loadIcons([
    { name: "zoom-in" },
    { name: "cursor", category: "editor" }
]);

// Переключить icon pack
await iconLoader.switchPack("minimal");

// Получить текущий pack
const current = iconLoader.getCurrentPack(); // "default"

// Очистить кэш
iconLoader.clearCache();

// Получить fallback символ
const fallback = iconLoader.getFallback("zoom-in"); // "+"
```

### IconButton

```javascript
import { createIconButton, updateButtonIcon } from "./ui/IconButton.js";

// Создать кнопку с иконкой
const button = await createIconButton({
    id: "my-btn",
    iconName: "zoom-in",
    title: "Zoom In",
    className: "toolbar-btn"
});

// Обновить иконку в существующей кнопке
await updateButtonIcon(button, "zoom-out");
```

## Создание нового Icon Pack

1. Создайте директорию: `assets/icons/my-pack/`
2. Скопируйте SVG файлы в структуру:
   ```
   my-pack/
   ├── pack.json
   ├── zoom-in.svg
   ├── zoom-out.svg
   └── editor/
       ├── cursor.svg
       └── line.svg
   ```

3. Создайте `pack.json`:
   ```json
   {
     "name": "my-pack",
     "version": "1.0.0",
     "description": "My custom icon pack",
     "style": {
       "strokeWidth": "1.5",
       "fill": "none",
       "stroke": "currentColor"
     }
   }
   ```

4. Переключите pack:
   ```javascript
   await iconLoader.switchPack("my-pack");
   ```

## Список иконок

### Main Toolbar (13 иконок)
- `zoom-in`, `zoom-out`, `fit-scale`, `zoom-selected`
- `part`, `bits`, `shank`, `export-dxf`, `grid`
- `save`, `save-as`, `load`, `clear`

### Editor Toolbar (22 иконки)

**Draw Tools:**
- `cursor`, `move`, `rotate`, `mirror`, `flip`
- `line`, `arc`, `circle`, `rect`, `ellipse`, `group`

**Edit Tools:**
- `fillet`, `chamfer`, `trim`, `extend`
- `offset`, `clipperOffset`, `join`, `explode`
- `close`, `bool`, `aux-line`

## Примечания

- **Windows**: Файл `aux.svg` переименован в `aux-line.svg` (зарезервированное имя)
- **Производительность**: Иконки загружаются параллельно
- **Безопасность**: SVG вставляется через `innerHTML` (только из доверенных источников)
- **Стиль**: Все иконки используют `stroke="currentColor"` для адаптации к теме

## Галереи

- **Все иконки**: [all-icons-gallery.html](./all-icons-gallery.html)
- **Main toolbar**: [preview.html](./preview.html)
- **Editor toolbar**: [editor/preview.html](./editor/preview.html)
