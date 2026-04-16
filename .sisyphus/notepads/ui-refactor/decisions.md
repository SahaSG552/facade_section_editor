# UI Refactor Decisions

## 2026-04-16 Planning Decisions
- Incremental migration approach (not full rewrite)
- Browser targets raised to 2024+ for native API support
- All modern APIs selected: light-dark, @property, color-mix, oklch, container queries, view transitions, dialog, popover
- Tailwind CSS v4 as UI framework (CSS-first config)
- Full migration from `.dark` class to `color-scheme: light dark` + `light-dark()`
- SVG theming: minimal — UI chrome icons only, bit shapes stay data-driven
- Capacitor: included in scope — fix empty config, add forceDarkAllowed
- 3-layer token system: Primitives (oklch) → Semantic (light-dark()) → Component (aliases)
- Tests-after approach (implement first, add tests for critical paths after)
