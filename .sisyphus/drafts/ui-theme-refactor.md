# Draft: UI Theme Refactor

## Requirements (confirmed)
- CSS-темизация: светлая/тёмная тема с переключением
- Консистентный UI через CSS переменные (design tokens)
- Адаптивный дизайн для больших экранов и мобильных устройств
- SVG элементы (контуры фрез, shank, extensions) должны адаптироваться под тему
- 3D канвас (фон + сетка) должен подстраиваться под тему
- Референс для стиля: svg.framerlists.com
- Референс из видео: Browser APIs (CSS variables, color-mix, @layer, native features)

## Technical Decisions
- **Формат токенов**: ГИБРИДНЫЙ — hex для основных цветов, color-mix() для деривативных
- **Механизм темы**: [data-theme="dark"] (framerlists) вместо .dark класса
- **Стиль контролов**: НЕОМОРФНЫЙ (framerlists) — inner border + составные тени + animated indicator
- **Приоритет**: СНАЧАЛА ТЕМИЗАЦИЯ, потом responsive
- **Scope**: ВСЕ компоненты — header, left panel, center canvas, 3D canvas, right panel, modals, SVG bit icons

## Research Findings

### 1. Видео: "Browser APIs Just Killed Off Your JavaScript Dependencies"
- Ключевая идея: использовать нативные CSS возможности вместо JS-зависимостей
- Relevant features: CSS custom properties, @layer, @container, color-mix(), :has()
- CSS color-mix() для деривативных цветов (осветление/затемнение без JS)
- @layer для организации CSS (reset, tokens, components, utilities)
- @container для компонентного responsive design

### 2. SVG Framerlists (референс-сайт)
- Формат токенов: прямые hex значения (не HSL)
- Селектор темы: [data-theme=dark] вместо .dark класса
- Обширная система токенов:
  - --bg-main, --bg-card, --bg-input, --bg-button, --bg-button-hover, --bg-accent
  - --border-default, --border-subtle, --border-input-focus
  - --text-primary, --text-secondary, --text-muted, --text-inverse
  - --shadow-inset, --shadow-drop, --shadow-white (многослойные тени)
  - --btn-inner-bg, --btn-inner-border, --btn-inner-shadow (неоморфные кнопки)
  - --slider-track, --slider-thumb, --slider-track-active
  - --toast-bg, --toast-border, --toast-text (инвертированные тосты)
  - --seg-indicator-bg, --seg-indicator-border, --seg-indicator-shadow
  - --input-bg, --input-shadow
- Стиль: неоморфный с inner borders и составными тенями
- Шрифты: Inter + JetBrains Mono
- Responsive: 1024px (панели скользят) и 768px (compact)
- Segmented controls с анимированным индикатором (cubic-bezier)
- Checkerboard pattern для preview

### 3. Текущее состояние проекта (из explore-агента)

#### CSS архитектура
- styles/styles.css — единственный файл (2730 строк)
- Токены в HSL формате (shadcn-подобный)
- .dark класс для тёмной темы
- Responsive: @media 800px и 500px
- !important используется часто

#### Захардкоженные цвета (КРИТИЧНО для тёмной темы)
- BitsManager.js: circle.fill="white", stroke="black" (~531-533)
- BitsManager.js: createActionIcon fill="white"/"black", stroke green/orange/red (~670-692)
- BitsManager.js: shank fill rgba(64,64,64,0.1) (~943)
- BitsManager.js: default bit fill rgba(204,204,204,0.3) (~956)
- CanvasManager.js: grid colors "#e0e0e0" and "#5f5959ff" (~378-388)
- SceneManager.js: GridHelper 0x888888, 0xcccccc (~220-225)
- ViewCubeGizmo.js: COLORS object 0xdddddd, 0xf2f5ce, 0xcccccc (~64-69)
- ViewCubeGizmo.js: createTextTexture '#ffffff', '#333333' (~262-271)
- index.html: inline styles на grid-select и panel-anchor-btn

#### Что уже работает
- SceneManager уже читает --scene-background CSS variable
- SVG иконки в header используют stroke="currentColor" (OK)
- BitsManager частично использует var(--bit-outline, #000000)

#### Layout проблемы
- Левая панель: фиксированная 90px
- Правая панель: фиксированная 500px
- Нет мобильной адаптации панелей (только collapse)
- Нет sliding panel анимации

## Open Questions
- Формат токенов: HSL (текущий shadcn-стиль) или hex (framerlists)?
- Селектор темы: .dark (текущий) или [data-theme=dark] (framerlists)?
- Стиль кнопок: неоморфный (framerlists) или текущий flat?
- Приоритет: сначала темизация, потом responsive, или вместе?
- Какие компоненты в scope рефакторинга?

## Scope Boundaries
- INCLUDE: CSS theming, dark/light mode, SVG color adaptation, 3D canvas theming, responsive layout
- EXCLUDE: (pending user input)

---

## Additional Reference: Gravity UI (suggested by user)

### What Gravity UI Offers
- **@gravity-ui/uikit-themer** — npm пакет для манипуляции темами
- **50+ React компонентов** — кнопки, модалки, таблицы, селекты, и т.д.
- **Система токенов**:
  - Base colors: --g-color-base-background, --g-color-base-brand, --g-color-base-text
  - Private colors: вычисляются из base colors (brand palette)
  - Utility colors: blue, green, red, yellow, orange, purple, cold-gray
  - Typography: текстовые варианты с font-size, line-height, font-weight
  - Border radius: s, m, l + "inner" variants
- **Theme Provider**: `<ThemeProvider theme="light">` или "dark"
- **SSR support**: генерирует CSS классы на сервере, избегает "flash"
- **Quick Theme Creator**: онлайн инструмент для создания тем на основе бренд-цветов

### Применимые паттерны для нашего проекта
1. **Private colors concept**: использовать color-mix() для генерации палитры из одного brand color
2. **CSS variable naming**: --g-* префикс (или свой, напр. --facade-*)
3. **Border radius system**: primary radius + inner radius (primary - 3px)
4. **Component states**: hover, active, disabled, selected, focus через CSS переменные

### Вопрос о Gravity UI → ОТВЕТ
Пользователь спросил: сложно ли переписать на gravity-ui?

**Ответ: ДА, это большая сложная задача.**
- Gravity UI требует React
- Проект на vanilla JS — нужен полный переписывание архитектуры
- Это месяцы работы

**Решение: Вдохновиться подходом, но реализовать своё.**
- Паттерны именования CSS переменных
- color-mix() для палитры
- Border-radius система
