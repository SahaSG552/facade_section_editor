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

## 2026-04-16 Task 9 Complete
- Added 18 derived tokens with color-mix(in oklch, ...) for opacity variants
- Accent opacity: 8%, 15%, 35%, 40%, 50%, 60%, 75%, 80%
- Text opacity: 25%, 35%, 50%, 70%, 85%
- Border opacity: 50%
- Surface hover: 90% surface + 10% text
- Added --color-destructive, --color-success, --color-warning semantic tokens
- Replaced all hsl(var(--X) / Y) patterns with derived tokens (20+ replacements)
- Last pattern replaced: hsl(var(--destructive, 0 72% 51%)) → var(--color-destructive)
- Build ✅, Tests ✅ (275 passing)
- Commit: 69ebc2a

## 2026-04-16 Bug Fixes
- Theme toggle was broken: UIModule still used .dark class which was removed in Task 6
- Fixed by delegating to ThemeService which uses color-scheme + data-theme
- Added EventBus listener for theme:changed events (keeps toggle icon in sync)
- Action button SVG icons increased from 12px to 20px (user request)
- Commit: b15866c

## 2026-04-16 Task 10 Complete
- Replaced hardcoded fill/stroke in BitsManager SVG icon creation
- createSVGIcon: fill="white"→var(--color-surface), stroke="black"→var(--color-icon)
- createActionIcon: fill="white"→var(--color-surface), fill="black"→var(--color-icon)
- Action strokes: green→var(--color-success), orange→var(--color-warning), red→var(--color-destructive)
- Placeholder innerShape: default fill white→var(--color-surface), stroke black→var(--color-icon)
- IMPORTANT: SVG setAttribute with var() works in Chrome 66+, Firefox 63+, Safari 15+ (SVG2)
- Build ✅, Tests ✅ (275 passing)
- Commit: 771160b

## 2026-04-16 Task 11 Complete
- Created src/ui/breakpoints.js with BREAKPOINTS constants + MEDIA_QUERIES matchMedia objects
- CSS breakpoints unified: 800→768, 500→640, 1200→1280, 1000→1024, 480→640
- JS replaced window.innerWidth with MEDIA_QUERIES.MD/LG.matches
- Added sync comments to all CSS @media queries
- Build ✅, Tests ✅ (275 passing)
- Commit: 43d8ce4
