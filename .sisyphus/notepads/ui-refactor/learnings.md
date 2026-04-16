# UI Refactor Learnings

## 2026-04-16 Session Start
- Project uses vanilla JS (ES Modules), Vite 7.3, Vitest 4.1
- Single 58KB styles.css with CSS variables + `.dark` class theming
- UIModule.js has a bug: `canvasManager.canvasManager` should be `canvasModule.canvasManager`
- Breakpoints mismatched: CSS (800/500px) vs JS (768/1000px)
- SVG fills/strokes set programmatically in 14+ files — only UI chrome icons in scope
- Capacitor config is empty (0 bytes)
- No CSS reset, no prefers-color-scheme detection, no smooth theme transition
- Browser targets: Chrome 123+, Safari 17.5+, Firefox 128+ (2024+)
- CSS `@media` cannot use `var()` — breakpoints must be hardcoded in CSS with comments synced to JS
