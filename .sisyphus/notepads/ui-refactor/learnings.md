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

## 2026-04-16 Task 6 Complete
- Removed .dark class override block (lines 24-40) from styles.css
- Replaced 193+ hsl(var(--X)) patterns with semantic tokens (var(--color-X))
- ThemeService.applyTheme() no longer adds .dark class — only data-theme + color-scheme
- Simple color references migrated successfully
- Opacity variants (hsl(var(--X) / 0.5)) deferred to Task 9 (color-mix)
- Build ✅, Tests ✅ (275 passing)
- Commit: f8c6371

## 2026-04-16 Task 7 Complete
- Registered 16 semantic color tokens with @property (syntax: '<color>', inherits: true)
- Created styles/layout.css with 0.25s ease transitions for background-color, color, border-color
- Added prefers-reduced-motion support (0.01ms transitions when user prefers reduced motion)
- Transitions apply to body, #app-header, .panel, .modal, button, input, select, textarea
- Build ✅, Tests ✅ (275 passing)
- Commit: f8d2ce5

## 2026-04-16 Task 8 Complete
- Added <meta name="color-scheme" content="light dark"> to index.html
- Verified ThemeService.detectTheme() uses matchMedia for system preference (already implemented in Task 5)
- Verified ThemeService.updateMetaThemeColor() updates theme-color dynamically (already implemented in Task 5)
- System preference respected on first visit, manual toggle overrides
- Build ✅, Tests ✅ (275 passing)
- Commit: 10383ef
