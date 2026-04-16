# UI Refactoring: Consistent CSS Theming, Dark Mode & Responsive Design

## TL;DR

> **Quick Summary**: Incrementally refactor the facade_section_editor UI from a monolithic 58KB CSS file with `.dark` class theming to a modern, modular CSS architecture using Tailwind CSS v4, native browser APIs (`light-dark()`, `color-scheme`, `@property`, `color-mix()`, `oklch()`, container queries, view transitions, `<dialog>`, popover), and a 3-layer design token system. Fix responsive breakpoints, add smooth theme transitions, and include Capacitor mobile support.
> 
> **Deliverables**:
> - Split CSS architecture (vars.css, reset.css, layout.css, components/, utilities.css)
> - Tailwind CSS v4 integrated with CSS custom properties
> - Modern theming via `color-scheme: light dark` + `light-dark()` + `@property` animated transitions
> - Unified responsive breakpoints (CSS + JS single source of truth)
> - Container queries for component-level responsiveness
> - Native `<dialog>` replacing custom modals
> - Popover API for tooltips
> - View Transitions for panel/state changes
> - SVG UI chrome icons using `currentColor` (CSS-themeable)
> - Capacitor config populated and WebView-tested
> - Smooth dark/light theme switch with `prefers-color-scheme` detection
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 5 waves + final verification
> **Critical Path**: Task 0 (bug fix) → Task 1 (token system) → Task 3 (color-scheme) → Task 7 (responsive) → Task 11 (dialog) → Task 14 (Capacitor) → F1-F4

---

## Context

### Original Request
User wants to refactor the UI of the facade_section_editor 3D application to: (1) make appearance consistent and configurable via CSS, (2) add convenient light/dark theme switching, (3) implement flexible adaptive design for large screens and mobile devices. Inspired by YouTube video "Browser APIs Just Killed Off Your JavaScript Dependencies" about modern native browser APIs replacing npm dependencies.

### Interview Summary
**Key Discussions**:
- **Approach**: Incremental migration (not full rewrite) — lower risk, testable at each step
- **Browser targets**: Raised to 2024+ (Chrome 123+, Safari 17.5+, Firefox 128+) — all selected APIs work natively
- **All modern APIs selected**: light-dark, @property, color-mix, oklch, container queries, view transitions, dialog, popover
- **Tailwind CSS v4** chosen as UI framework
- **Full migration** from `.dark` class to `color-scheme: light dark` + `light-dark()`
- **SVG theming**: Minimal — UI chrome icons only, bit shapes stay data-driven
- **Capacitor**: Included in scope — fix empty config, add forceDarkAllowed, test WebView

**Research Findings**:
- Current project uses single 58KB `styles.css` with CSS variables + `.dark` class
- Theme toggle exists in UIModule.js with localStorage persistence
- Breakpoints mismatched: CSS (800/500px) vs JS (768/1000px)
- SVG fills/strokes set programmatically in 14+ files
- Bug in UIModule.updateCanvasAfterPanelToggle (`canvasManager.canvasManager` → `canvasModule.canvasManager`)
- No CSS reset, no prefers-color-scheme detection, no smooth theme transition
- Capacitor config is empty (0 bytes)
- `light-dark()` requires Chrome 123+/Safari 17.5+/Firefox 120+ — confirmed compatible with chosen 2024+ target
- Tailwind v4 uses CSS-first config via `@theme` blocks

### Metis Review
**Identified Gaps** (addressed):
- Browser target vs API compatibility → **RESOLVED**: Raised to 2024+, all APIs natively supported
- SVG don't inherit `color-scheme` → **ADDRESSED**: Scope limited to UI chrome only, bit shapes excluded
- Canvas/Three.js unaware of theme → **ADDRESSED**: Theme service emits event, consumers handle separately
- Tailwind + CSS variables duplication → **ADDRESSED**: Clear boundary — tokens in vars.css, utilities in Tailwind
- Cascade break on CSS split → **ADDRESSED**: Each split = atomic commit + visual verification
- Android WebView forced dark → **ADDRESSED**: Capacitor included in scope, forceDarkAllowed fix
- UIModule bug → **ADDRESSED**: Wave 0 pre-flight fix as separate commit

---

## Work Objectives

### Core Objective
Transform the UI from a monolithic, partially-themeable state to a modern, modular, fully-responsive design system using native CSS APIs and Tailwind CSS, with smooth light/dark mode switching and Capacitor mobile support.

### Concrete Deliverables
- `styles/vars.css` — 3-layer design token system (primitives → semantic → component) with oklch + light-dark()
- `styles/reset.css` — minimal CSS reset
- `styles/layout.css` — app-level layout with unified breakpoints
- `styles/components/` — individual component stylesheets
- `styles/utilities.css` — utility classes
- `src/ui/ThemeService.js` — centralized theme service with EventBus integration
- Updated `src/ui/UIModule.js` — bug fix + matchMedia + theme service usage
- Updated `index.html` — inline styles removed, dynamic meta theme-color, dialog elements
- Capacitor config populated and tested
- Visual regression baseline screenshots

### Definition of Done
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] Theme toggle works smoothly with animation (no flash)
- [ ] `prefers-color-scheme` auto-detected on first visit
- [ ] App renders identically at 360px, 768px, 1440px viewports
- [ ] All breakpoints unified between CSS and JS
- [ ] `<dialog>` replaces custom modal overlays
- [ ] Dark mode renders correctly with native form controls
- [ ] Capacitor Android build runs with correct theming

### Must Have
- CSS custom properties for ALL colors (no hardcoded hex in components)
- `color-scheme: light dark` + `light-dark()` as theming backbone
- `@property` registered variables for smooth theme transitions
- Unified breakpoints in single source of truth
- Container queries for panel components
- `<dialog>` for modals
- Tailwind CSS v4 integrated
- Capacitor config populated

### Must NOT Have (Guardrails)
- NO changes to CSG/geometry/Three.js rendering pipeline
- NO changes to bit shape color rendering (data-driven SVG colors stay in JS)
- NO new business features
- NO TypeScript migration
- NO component library / design system beyond tokens
- NO micro-interactions / CSS animations beyond theme transition
- NO layout redesign — only make existing layout responsive
- AI slop: NO excessive comments, NO over-abstraction, NO generic variable names
- NO removing `.dark` class until `light-dark()` is fully verified working
- NO touching editor tool SVG colors (ArcTool, CircleTool, etc.)
- NO bundling UIModule bug fix with CSS refactoring commits

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest configured)
- **Automated tests**: Tests-after (add tests for critical paths after implementation)
- **Framework**: Vitest
- **Visual QA**: Agent-executed Playwright scenarios at 3 viewports in both themes

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Use interactive_bash (tmux)
- **API/Backend**: Use Bash (curl)
- **Library/Module**: Use Bash (node REPL) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Pre-flight — bug fix + baseline):
├── Task 0.1: Fix UIModule canvasManager bug [quick]
└── Task 0.2: Capture visual baseline screenshots [quick]

Wave 1 (Foundation — CSS split + tokens + Tailwind):
├── Task 1: Design token system (vars.css with 3-layer oklch tokens + light-dark()) [deep]
├── Task 2: CSS reset (reset.css) [quick]
├── Task 3: Split styles.css into modular files (layout.css, components/, utilities.css) [unspecified-high]
├── Task 4: Tailwind CSS v4 setup + integration with CSS vars [unspecified-high]
└── Task 5: ThemeService module (EventBus-based, DI pattern) [unspecified-high]

Wave 2 (Theming — modern CSS theme system):
├── Task 6: Migrate to color-scheme: light dark + light-dark() theming [deep]
├── Task 7: @property registered variables for smooth theme transitions [deep]
├── Task 8: prefers-color-scheme detection + dynamic meta theme-color [quick]
├── Task 9: color-mix() for derived color variants (hover, pressed, disabled) [quick]
└── Task 10: SVG UI chrome icons → currentColor + CSS variable theming [unspecified-high]

Wave 3 (Responsive — unified breakpoints + container queries):
├── Task 11: Unify breakpoints — single source of truth (CSS + JS) [deep]
├── Task 12: Container queries for panel components [unspecified-high]
├── Task 13: Flexible layout (clamp, min, responsive grid) [unspecified-high]
└── Task 14: Tailwind responsive utilities + mobile viewport optimization [visual-engineering]

Wave 4 (Native APIs — dialog, popover, view transitions):
├── Task 15: Migrate modals to native <dialog> [unspecified-high]
├── Task 16: Popover API for tooltips/dropdowns [quick]
├── Task 17: View Transitions for panel/state changes [deep]
└── Task 18: Inline style cleanup (HTML + JS element.style → CSS classes) [unspecified-high]

Wave 5 (Capacitor + final integration):
├── Task 19: Capacitor config — populate, forceDarkAllowed, WebView theme test [quick]
└── Task 20: Three.js scene background theme awareness [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 0.1 | - | 0.2, 1 | 0 |
| 0.2 | 0.1 | 1 | 0 |
| 1 | 0.2 | 3, 4, 5, 6, 7, 9 | 1 |
| 2 | - | 3 | 1 |
| 3 | 1, 2 | 6, 10, 11, 13 | 1 |
| 4 | 1, 3 | 14 | 1 |
| 5 | 1 | 6, 8, 19 | 1 |
| 6 | 3, 5 | 7, 10 | 2 |
| 7 | 6 | - | 2 |
| 8 | 5 | - | 2 |
| 9 | 1 | 10 | 2 |
| 10 | 6, 9 | 18 | 2 |
| 11 | 3 | 12, 13, 14 | 3 |
| 12 | 11 | - | 3 |
| 13 | 3, 11 | 14 | 3 |
| 14 | 4, 13 | - | 3 |
| 15 | 3 | - | 4 |
| 16 | 3 | - | 4 |
| 17 | 3, 6 | - | 4 |
| 18 | 3, 10 | - | 4 |
| 19 | 5 | 20 | 5 |
| 20 | 19 | - | 5 |

### Agent Dispatch Summary

- **Wave 0**: 2 tasks — T0.1 → `quick`, T0.2 → `quick`
- **Wave 1**: 5 tasks — T1 → `deep`, T2 → `quick`, T3 → `unspecified-high`, T4 → `unspecified-high`, T5 → `unspecified-high`
- **Wave 2**: 5 tasks — T6 → `deep`, T7 → `deep`, T8 → `quick`, T9 → `quick`, T10 → `unspecified-high`
- **Wave 3**: 4 tasks — T11 → `deep`, T12 → `unspecified-high`, T13 → `unspecified-high`, T14 → `visual-engineering`
- **Wave 4**: 4 tasks — T15 → `unspecified-high`, T16 → `quick`, T17 → `deep`, T18 → `unspecified-high`
- **Wave 5**: 2 tasks — T19 → `quick`, T20 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 0.1. Fix UIModule canvasManager bug

  **What to do**:
  - In `src/ui/UIModule.js`, method `updateCanvasAfterPanelToggle()`, fix the bug at line ~172:
    - Change `const canvasManager = canvasManager.canvasManager;` to `const canvasManager = canvasModule.canvasManager;`
  - This is a 1-line fix that prevents canvas from updating after panel toggles

  **Must NOT do**:
  - Do NOT change any other code in UIModule.js
  - Do NOT bundle this fix with any CSS changes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line bug fix, trivial scope
  - **Skills**: [`test-facade`]
    - `test-facade`: Verify tests still pass after fix

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 0.2)
  - **Parallel Group**: Wave 0
  - **Blocks**: Tasks 0.2, 1+
  - **Blocked By**: None

  **References**:
  - `src/ui/UIModule.js:~167-173` — The buggy method `updateCanvasAfterPanelToggle()`. Look for `const canvasManager = canvasManager.canvasManager;` and fix to `canvasModule.canvasManager`.

  **Acceptance Criteria**:
  - [ ] Bug fixed: variable references `canvasModule.canvasManager` not `canvasManager.canvasManager`
  - [ ] `npm run build` succeeds
  - [ ] `npm run test` passes

  **QA Scenarios**:
  ```
  Scenario: Canvas updates after panel toggle
    Tool: Playwright
    Preconditions: App running in dev mode, a bit is placed on canvas
    Steps:
      1. Navigate to http://localhost:5173
      2. Click left panel toggle button
      3. Wait 500ms for layout to settle
      4. Assert canvas element has non-zero width and height
      5. Click left panel toggle again to restore
      6. Assert canvas element still has non-zero dimensions
    Expected Result: Canvas resizes correctly when panels are toggled, no JS errors in console
    Failure Indicators: Canvas has 0 width/height, JS error in console about undefined canvasManager
    Evidence: .sisyphus/evidence/task-0.1-canvas-panel-toggle.png
  ```

  **Commit**: YES
  - Message: `fix(ui): fix canvasManager reference in updateCanvasAfterPanelToggle`
  - Files: `src/ui/UIModule.js`
  - Pre-commit: `npm run build && npm run test`

- [x] 0.2. Capture visual baseline screenshots

  **What to do**:
  - Start the dev server (`npm run dev`)
  - Capture screenshots of the current app in these states:
    - Light theme at 1440px viewport
    - Dark theme at 1440px viewport
    - Light theme at 768px viewport
    - Dark theme at 768px viewport
    - Light theme at 360px viewport
    - Dark theme at 360px viewport
  - Save all screenshots to `.sisyphus/evidence/baseline/`
  - Run `npm run build` and verify it succeeds
  - Run `npm run test` and verify all tests pass
  - Record the exact commit hash as the baseline reference

  **Must NOT do**:
  - Do NOT change any code
  - Do NOT modify any styles

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Screenshot capture only, no code changes
  - **Skills**: [`test-facade`, `build-facade`]
    - `test-facade`: Verify tests pass
    - `build-facade`: Verify build succeeds

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 0.1, but should wait for 0.1 to be safe)
  - **Parallel Group**: Wave 0
  - **Blocks**: Task 1+
  - **Blocked By**: Task 0.1 (should complete first so screenshots reflect bug-fixed state)

  **References**:
  - `index.html` — Main HTML to understand viewport structure
  - `styles/styles.css` — Current CSS to understand theme classes

  **Acceptance Criteria**:
  - [ ] 6 baseline screenshots exist in `.sisyphus/evidence/baseline/`
  - [ ] `npm run build` succeeds
  - [ ] `npm run test` passes
  - [ ] Baseline commit hash recorded

  **QA Scenarios**:
  ```
  Scenario: Baseline screenshots captured
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:5173
      2. Set viewport to 1440x900
      3. Screenshot → .sisyphus/evidence/baseline/light-1440px.png
      4. Click theme toggle to switch to dark
      5. Screenshot → .sisyphus/evidence/baseline/dark-1440px.png
      6. Set viewport to 768x1024
      7. Switch to light, screenshot → .sisyphus/evidence/baseline/light-768px.png
      8. Switch to dark, screenshot → .sisyphus/evidence/baseline/dark-768px.png
      9. Set viewport to 360x800
      10. Switch to light, screenshot → .sisyphus/evidence/baseline/light-360px.png
      11. Switch to dark, screenshot → .sisyphus/evidence/baseline/dark-360px.png
    Expected Result: 6 screenshots captured showing current rendering in both themes at 3 viewports
    Failure Indicators: Missing screenshots, blank screenshots, JS errors
    Evidence: .sisyphus/evidence/baseline/*.png
  ```

  **Commit**: YES
  - Message: `chore: add visual baseline screenshots for regression testing`
  - Files: `.sisyphus/evidence/baseline/` (git add --force)
  - Pre-commit: `npm run build`

- [x] 1. Design token system (vars.css with 3-layer oklch tokens + light-dark())

  **What to do**:
  - Create `styles/vars.css` with 3-layer design token architecture:
    - **Layer 1 — Primitives**: Raw color values using `oklch()` color space
      - `--prim-white`, `--prim-gray-50` through `--prim-gray-950`
      - `--prim-blue-400` through `--prim-blue-700` (accent colors)
      - `--prim-green-500`, `--prim-red-500` (status colors)
    - **Layer 2 — Semantic tokens**: Use `light-dark()` function
      - `--color-background`, `--color-surface`, `--color-surface-raised`
      - `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
      - `--color-accent`, `--color-accent-hover`, `--color-accent-pressed`
      - `--color-border`, `--color-border-strong`
      - `--shadow-sm`, `--shadow-md`
    - **Layer 3 — Component tokens**: Alias semantic tokens for specific components
      - `--panel-bg`, `--panel-border`, `--button-bg`, `--button-hover-bg`
      - `--input-bg`, `--input-border`, `--input-focus-ring`
  - Set `color-scheme: light dark;` on `:root`
  - Map existing CSS variables from `styles/styles.css` :root section to new token names
  - Add `@import url('./vars.css')` at top of `styles/styles.css`

  **Must NOT do**:
  - Do NOT delete existing CSS variables yet (backward compat during migration)
  - Do NOT change any component styles
  - Do NOT modify JS files

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding existing color system and mapping to new tokens
  - **Skills**: [`styling`, `frontend-design`]
    - `styling`: CSS and Tailwind guidelines for token architecture
    - `frontend-design`: Production-grade CSS token design patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 3, 4, 5, 6, 7, 9
  - **Blocked By**: Tasks 0.1, 0.2

  **References**:
  - `styles/styles.css:1-40` — Current `:root` and `.dark` CSS variables. Extract all color values and map to new token names.
  - `src/ui/UIModule.js` — Current theme toggle logic. Understand which variables the `.dark` class overrides.
  - Modern theming pattern: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark — `light-dark()` function syntax and `color-scheme` property
  - oklch color space: perceptually uniform, generates consistent color scales from a single hue value

  **Acceptance Criteria**:
  - [ ] `styles/vars.css` created with 3-layer token system
  - [ ] `color-scheme: light dark;` set on `:root`
  - [ ] All semantic tokens use `light-dark()` function
  - [ ] Primitive tokens use `oklch()` color space
  - [ ] `@import url('./vars.css')` added to top of `styles/styles.css`
  - [ ] `npm run build` succeeds
  - [ ] Visual output unchanged (no regressions)

  **QA Scenarios**:
  ```
  Scenario: Token system renders correctly in both themes
    Tool: Playwright
    Preconditions: App running, vars.css imported
    Steps:
      1. Navigate to http://localhost:5173
      2. Assert body background color matches --color-background token value
      3. Assert body text color matches --color-text-primary token value
      4. Toggle to dark theme
      5. Assert body background resolves to dark value
      6. Assert body text color resolves to dark value
    Expected Result: Tokens resolve correctly in both light and dark modes
    Failure Indicators: Colors don't change on toggle, CSS variable undefined errors
    Evidence: .sisyphus/evidence/task-1-tokens-both-themes.png

  Scenario: oklch tokens are perceptually uniform
    Tool: Bash (node REPL)
    Preconditions: vars.css created
    Steps:
      1. Read vars.css and verify all primitive tokens use oklch() syntax
      2. Verify no hex or hsl values in primitive layer
      3. Verify light-dark() used in semantic layer
    Expected Result: All primitives use oklch(), all semantics use light-dark()
    Failure Indicators: Mixed color syntax, hex values in primitives
    Evidence: .sisyphus/evidence/task-1-token-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(css): add 3-layer design token system with oklch + light-dark()`
  - Files: `styles/vars.css`, `styles/styles.css` (import only)
  - Pre-commit: `npm run build`

- [x] 2. CSS reset (reset.css)

  **What to do**:
  - Create `styles/reset.css` with a minimal modern CSS reset:
    - `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`
    - `html { -moz-text-size-adjust: none; -webkit-text-size-adjust: none; text-size-adjust: none; }`
    - `body { min-height: 100vh; line-height: 1.5; }`
    - Form elements: inherit font, color
    - Remove default button styles that interfere with custom styling
    - `img, picture, video, canvas, svg { display: block; max-width: 100%; }`
    - `input, button, textarea, select { font: inherit; color: inherit; }`
    - `p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }`
    - Remove list styles by default
  - Add `@import url('./reset.css')` before `vars.css` import in `styles/styles.css`
  - Verify that existing body/html margin:0 padding:0 box-sizing styles in styles.css are removed (deduplicated)

  **Must NOT do**:
  - Do NOT use a heavy normalize.css or third-party reset
  - Do NOT change any visual appearance (reset should be minimal)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Well-established pattern, small file
  - **Skills**: [`styling`]
    - `styling`: CSS reset best practices

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3
  - **Blocked By**: None (after Wave 0 complete)

  **References**:
  - `styles/styles.css:1-5` — Current minimal reset (margin:0, padding:0, box-sizing). Deduplicate these when creating reset.css.
  - Modern CSS Reset by Andy Bell: https://piccalil.li/blog/a-more-modern-css-reset/ — Reference for minimal modern reset pattern

  **Acceptance Criteria**:
  - [ ] `styles/reset.css` created with minimal modern reset
  - [ ] `@import url('./reset.css')` added to styles.css before vars.css
  - [ ] Duplicate reset styles removed from styles/styles.css
  - [ ] `npm run build` succeeds
  - [ ] Visual output unchanged

  **QA Scenarios**:
  ```
  Scenario: Reset applied without visual regression
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Navigate to http://localhost:5173
      2. Screenshot at 1440px viewport
      3. Compare with baseline .sisyphus/evidence/baseline/light-1440px.png
    Expected Result: No visual differences compared to baseline
    Failure Indicators: Layout shifts, font size changes, spacing differences
    Evidence: .sisyphus/evidence/task-2-reset-regression.png
  ```

  **Commit**: YES
  - Message: `feat(css): add minimal CSS reset`
  - Files: `styles/reset.css`, `styles/styles.css`
  - Pre-commit: `npm run build`

- [x] 3. Split styles.css into modular files

  **What to do**:
  - Split the monolithic `styles/styles.css` (~58KB) into logical modules:
    - `styles/layout.css` — App-level layout (#app, #left-panel, #canvas-container, #right-menu)
    - `styles/components/` directory with individual component files:
      - `styles/components/panels.css` — Left/right panel styles
      - `styles/components/toolbar.css` — Toolbar button styles
      - `styles/components/forms.css` — Form inputs, selects, bit-form
      - `styles/components/modal.css` — Modal overlay styles
      - `styles/components/bit-list.css` — Bit list and table styles
      - `styles/components/canvas.css` — Canvas container and SVG styles
      - `styles/components/buttons.css` — Button variants
    - `styles/utilities.css` — Utility classes
  - Create `styles/main.css` as the new entry point that imports all modules in correct cascade order:
    ```css
    @import url('./reset.css');
    @import url('./vars.css');
    @import url('./layout.css');
    @import url('./components/panels.css');
    @import url('./components/toolbar.css');
    /* ... etc ... */
    @import url('./utilities.css');
    ```
  - Update `index.html` to link `styles/main.css` instead of `styles/styles.css`
  - Each split = preserve exact same rendered output. Zero visual changes.
  - After split, `styles/styles.css` can be kept as-is temporarily for reference, or removed if all content migrated

  **Must NOT do**:
  - Do NOT add new styles or change any values
  - Do NOT change specificity or cascade order
  - Do NOT remove any selectors — just move them
  - Do NOT add Tailwind utilities yet (that's Task 4)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large file split requiring careful cascade preservation
  - **Skills**: [`styling`]
    - `styling`: CSS organization and cascade understanding

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 1, 2)
  - **Parallel Group**: Wave 1 (sequential after 1, 2)
  - **Blocks**: Tasks 6, 10, 11, 13
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `styles/styles.css` (full file, ~58KB) — Source file to split. Read in sections and categorize each rule block.
  - `index.html` — Current link to `styles/styles.css`. Update to `styles/main.css`.
  - CSS cascade rules: `@import` order matters — later imports override earlier ones. Maintain the same specificity order as the original file.

  **Acceptance Criteria**:
  - [ ] `styles/main.css` created as entry point with correct import order
  - [ ] `index.html` updated to link `styles/main.css`
  - [ ] All component CSS files created in `styles/components/`
  - [ ] `npm run build` succeeds
  - [ ] Visual output identical to baseline (compare screenshots)

  **QA Scenarios**:
  ```
  Scenario: Split preserves visual output exactly
    Tool: Playwright
    Preconditions: App running with new CSS structure
    Steps:
      1. Navigate to http://localhost:5173 at 1440px viewport
      2. Screenshot light theme → compare with baseline
      3. Toggle to dark theme → screenshot → compare with baseline
      4. Set viewport to 768px → screenshot both themes → compare
      5. Set viewport to 360px → screenshot both themes → compare
    Expected Result: All 6 screenshots match baseline within acceptable tolerance
    Failure Indicators: Missing styles, different colors, layout shifts, broken components
    Evidence: .sisyphus/evidence/task-3-split-regression/

  Scenario: Build succeeds with new CSS structure
    Tool: Bash
    Preconditions: CSS files split
    Steps:
      1. Run `npm run build`
      2. Assert exit code 0
      3. Run `npm run test`
      4. Assert exit code 0
    Expected Result: Both build and test pass
    Failure Indicators: Build errors, missing imports, test failures
    Evidence: .sisyphus/evidence/task-3-build-test.txt
  ```

  **Commit**: YES
  - Message: `refactor(css): split styles.css into modular files`
  - Files: `styles/main.css`, `styles/layout.css`, `styles/components/*.css`, `styles/utilities.css`, `index.html`
  - Pre-commit: `npm run build && npm run test`

- [x] 4. Tailwind CSS v4 setup + integration with CSS vars

  **What to do**:
  - Install Tailwind CSS v4: `npm install tailwindcss @tailwindcss/vite`
  - Add `@tailwindcss/vite` plugin to `vite.config.js`
  - Create Tailwind entry in `styles/tailwind.css`:
    ```css
    @import "tailwindcss";
    @theme {
      /* Reference design tokens from vars.css */
      --color-background: var(--color-background);
      --color-surface: var(--color-surface);
      --color-text-primary: var(--color-text-primary);
      /* ... map all semantic tokens ... */
      
      /* Breakpoints */
      --breakpoint-sm: 640px;
      --breakpoint-md: 768px;
      --breakpoint-lg: 1024px;
      --breakpoint-xl: 1280px;
      --breakpoint-2xl: 1536px;
    }
    ```
  - Import `styles/tailwind.css` in `styles/main.css` after reset but before component styles
  - Configure dark mode via `@custom-variant dark (&:where(.dark, .dark *))` for transition compat
  - Verify Tailwind utility classes work alongside existing custom CSS

  **Must NOT do**:
  - Do NOT replace existing CSS with Tailwind utilities yet (gradual adoption)
  - Do NOT remove any existing styles
  - Do NOT configure `tailwind.config.js` (Tailwind v4 uses CSS-first config)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Build tool configuration with integration concerns
  - **Skills**: [`vite`, `styling`]
    - `vite`: Vite plugin configuration
    - `styling`: Tailwind CSS v4 configuration patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5, but after Task 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `vite.config.js` — Add `@tailwindcss/vite` plugin here
  - `styles/main.css` — Import Tailwind entry CSS here
  - `styles/vars.css` — Design tokens to reference in `@theme` block
  - Tailwind v4 docs: CSS-first configuration with `@theme` blocks
  - AGENTS.md: Stack section confirms Vite 7.3 is used

  **Acceptance Criteria**:
  - [ ] `tailwindcss` and `@tailwindcss/vite` installed
  - [ ] `vite.config.js` updated with Tailwind plugin
  - [ ] `styles/tailwind.css` created with `@theme` referencing CSS vars
  - [ ] `styles/main.css` imports tailwind.css
  - [ ] `npm run build` succeeds
  - [ ] Tailwind utility classes available (test with a `bg-blue-500` class)

  **QA Scenarios**:
  ```
  Scenario: Tailwind utilities work alongside existing CSS
    Tool: Playwright
    Preconditions: App running with Tailwind configured
    Steps:
      1. Navigate to http://localhost:5173
      2. Assert existing UI still renders correctly (no regressions)
      3. In browser console, verify `document.querySelector('.bg-blue-500')` returns Tailwind-generated style
    Expected Result: Existing styles unchanged, Tailwind utilities available for use
    Failure Indicators: Missing styles, Tailwind purge removes needed classes, build errors
    Evidence: .sisyphus/evidence/task-4-tailwind-integration.png

  Scenario: Build succeeds with Tailwind
    Tool: Bash
    Steps:
      1. Run `npm run build` — assert exit code 0
      2. Check output for Tailwind CSS in built assets
    Expected Result: Build succeeds, Tailwind CSS present in output
    Failure Indicators: Build error, missing Tailwind output
    Evidence: .sisyphus/evidence/task-4-tailwind-build.txt
  ```

  **Commit**: YES
  - Message: `feat(css): initialize Tailwind CSS v4 with CSS-first config`
  - Files: `package.json`, `vite.config.js`, `styles/tailwind.css`, `styles/main.css`
  - Pre-commit: `npm run build`

- [x] 5. ThemeService module (EventBus-based, DI pattern)

  **What to do**:
  - Create `src/ui/ThemeService.js` following the existing BaseModule pattern:
    ```javascript
    import BaseModule from "../core/BaseModule.js";
    import LoggerFactory from "../core/LoggerFactory.js";
    
    export default class ThemeService extends BaseModule {
      static THEME_KEY = "theme";
      static THEMES = { LIGHT: "light", DARK: "dark" };
      
      async initialize() {
        this.log = LoggerFactory.createLogger("ThemeService");
        this.currentTheme = this.detectTheme();
        this.applyTheme(this.currentTheme);
        this.setupSystemPreferenceListener();
      }
      
      detectTheme() {
        const stored = localStorage.getItem(ThemeService.THEME_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? ThemeService.THEMES.DARK 
          : ThemeService.THEMES.LIGHT;
      }
      
      applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme;
        localStorage.setItem(ThemeService.THEME_KEY, theme);
        this.updateMetaThemeColor(theme);
        this.emit('theme:changed', { theme });
      }
      
      toggleTheme() {
        const next = this.currentTheme === ThemeService.THEMES.DARK 
          ? ThemeService.THEMES.LIGHT 
          : ThemeService.THEMES.DARK;
        this.applyTheme(next);
      }
      
      updateMetaThemeColor(theme) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === 'dark' ? '#0d1117' : '#ffffff';
      }
      
      setupSystemPreferenceListener() {
        window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener('change', (e) => {
            if (!localStorage.getItem(ThemeService.THEME_KEY)) {
              this.applyTheme(e.matches ? ThemeService.THEMES.DARK : ThemeService.THEMES.LIGHT);
            }
          });
      }
    }
    ```
  - Register ThemeService in `src/app/main.js` alongside existing modules
  - Update `src/ui/UIModule.js` to delegate theme logic to ThemeService
  - Update `src/script.js` theme toggle wiring to use ThemeService

  **Must NOT do**:
  - Do NOT remove `.dark` class support yet (backward compat during migration)
  - Do NOT modify Three.js or CanvasManager
  - Do NOT change CSS files

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New module following existing patterns, requires DI integration
  - **Skills**: [`modern-javascript-patterns`]
    - `modern-javascript-patterns`: ES6 module patterns, event-driven architecture

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 6, 8, 19
  - **Blocked By**: Task 1

  **References**:
  - `src/app/main.js` — Module registration pattern. Follow the same registration pattern for ThemeService.
  - `src/core/BaseModule.js` — Base class for all modules. Extend this for ThemeService.
  - `src/ui/UIModule.js:initializeTheme()`, `src/ui/UIModule.js:toggleTheme()` — Current theme implementation. Delegate this logic to ThemeService.
  - `src/script.js:~790-795` — Theme toggle button wiring. Update to call `themeService.toggleTheme()`.

  **Acceptance Criteria**:
  - [ ] `src/ui/ThemeService.js` created extending BaseModule
  - [ ] Registered in `src/app/main.js`
  - [ ] `prefers-color-scheme` detection on first visit
  - [ ] `data-theme` attribute set on `document.documentElement`
  - [ ] `color-scheme` style property set on `document.documentElement`
  - [ ] Meta `theme-color` updated dynamically
  - [ ] System preference listener with localStorage override
  - [ ] `npm run build` succeeds, `npm run test` passes

  **QA Scenarios**:
  ```
  Scenario: ThemeService detects system preference on first visit
    Tool: Bash (node REPL)
    Steps:
      1. Import ThemeService in node REPL
      2. Mock matchMedia to return prefers-color-scheme: dark
      3. Call detectTheme()
      4. Assert returns "dark"
      5. Mock matchMedia to return prefers-color-scheme: light
      6. Call detectTheme()
      7. Assert returns "light"
    Expected Result: detectTheme() follows system preference when no localStorage
    Failure Indicators: Always returns "light" regardless of system preference
    Evidence: .sisyphus/evidence/task-5-theme-detection.txt

  Scenario: ThemeService toggles theme correctly
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Navigate to http://localhost:5173
      2. Clear localStorage
      3. Reload page
      4. Assert document.documentElement has data-theme attribute
      5. Click theme toggle button
      6. Assert data-theme changed
      7. Assert meta[name="theme-color"] content changed
    Expected Result: Theme toggles, data-theme and meta update
    Failure Indicators: data-theme not set, meta not updated
    Evidence: .sisyphus/evidence/task-5-theme-toggle.png
  ```

  **Commit**: YES
  - Message: `feat(theme): add ThemeService module with EventBus integration`
  - Files: `src/ui/ThemeService.js`, `src/app/main.js`, `src/ui/UIModule.js`, `src/script.js`
  - Pre-commit: `npm run build && npm run test`

  - Pre-commit: `npm run build && npm run test`

- [x] 6. Migrate to color-scheme: light dark + light-dark() theming

  **What to do**:
  - Replace the existing `:root { --background: ... }` + `.dark { --background: ... }` pattern with `color-scheme: light dark` + `light-dark()` throughout all CSS files
  - In `styles/vars.css`: verify `color-scheme: light dark;` is on `:root`
  - In all component CSS files: replace hardcoded `hsl(var(--...))` patterns with direct `var(--semantic-token)` references (tokens already resolve via `light-dark()`)
  - Replace any remaining `.dark` class selectors in component CSS with token-based alternatives
  - Remove the `.dark { ... }` override block from CSS
  - Update `ThemeService` to use `data-theme` attribute instead of `.dark` class
  - Ensure `data-theme` attribute on `<html>` sets `color-scheme` property, which drives `light-dark()` resolution

  **Must NOT do**:
  - Do NOT change Three.js rendering colors
  - Do NOT modify bit shape SVG colors
  - Do NOT remove `.dark` class support in JS until CSS migration is verified

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`styling`, `frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 3, 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 7, 10
  - **Blocked By**: Tasks 3, 5

  **References**:
  - `styles/vars.css` — Token definitions with `light-dark()` (created in Task 1)
  - `styles/components/*.css` — Component files to migrate (created in Task 3)
  - `src/ui/ThemeService.js` — Theme toggle logic (created in Task 5)
  - `styles/styles.css:22-38` — Current `.dark` override block to be removed
  - MDN light-dark(): https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark

  **Acceptance Criteria**:
  - [ ] All color references use semantic tokens via `var(--semantic-token)`
  - [ ] `.dark` class override block removed from CSS
  - [ ] `data-theme` attribute drives theme via `color-scheme` property
  - [ ] Theme toggle works correctly (light ↔ dark)
  - [ ] `npm run build` succeeds, visual output unchanged

  **QA Scenarios**:
  ```
  Scenario: light-dark() resolves correctly for both themes
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:5173
      2. Assert data-theme="light"
      3. Screenshot → compare with baseline light-1440px.png
      4. Toggle to dark theme
      5. Assert data-theme="dark"
      6. Screenshot → compare with baseline dark-1440px.png
    Expected Result: Both themes render identically to baseline
    Failure Indicators: Colors don't switch, wrong colors, missing styles
    Evidence: .sisyphus/evidence/task-6-light-dark-migration.png
  ```

  **Commit**: YES
  - Message: `feat(theme): migrate to color-scheme: light dark + light-dark()`
  - Files: `styles/vars.css`, `styles/components/*.css`, `src/ui/ThemeService.js`

- [x] 7. @property registered variables for smooth theme transitions

  **What to do**:
  - Register key CSS custom properties with `@property` to enable smooth transitions:
    ```css
    @property --color-background { syntax: '<color>'; inherits: true; initial-value: #ffffff; }
    @property --color-surface { syntax: '<color>'; inherits: true; initial-value: #f8fafc; }
    @property --color-text-primary { syntax: '<color>'; inherits: true; initial-value: #020617; }
    @property --color-border { syntax: '<color>'; inherits: true; initial-value: #e2e8f0; }
    ```
  - Add transition rules to body and key containers (0.2-0.3s ease)
  - Add `@media (prefers-reduced-motion: reduce)` to disable transitions

  **Must NOT do**:
  - Do NOT add transitions to canvas/SVG elements
  - Do NOT use `transition: all`

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`styling`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: None directly
  - **Blocked By**: Task 6

  **References**:
  - `styles/vars.css` — Register each semantic color token as @property
  - MDN @property: https://developer.mozilla.org/en-US/docs/Web/CSS/@property

  **Acceptance Criteria**:
  - [ ] All semantic color tokens registered with `@property`
  - [ ] Smooth transition (0.2-0.3s) on theme toggle
  - [ ] `prefers-reduced-motion` respected
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Theme transition is smooth
    Tool: Playwright
    Steps:
      1. Navigate in light theme
      2. Click theme toggle
      3. Wait 400ms
      4. Assert body background changed to dark value
    Expected Result: Smooth color transition over ~300ms, no flash
    Failure Indicators: Instant swap, flickering
    Evidence: .sisyphus/evidence/task-7-smooth-transition.png
  ```

  **Commit**: YES
  - Message: `feat(theme): add @property animated theme transitions`
  - Files: `styles/vars.css`, `styles/layout.css`

- [x] 8. prefers-color-scheme detection + dynamic meta theme-color

  **What to do**:
  - Verify ThemeService.detectTheme() uses matchMedia when no localStorage override
  - Add `<meta name="color-scheme" content="light dark">` to index.html
  - Verify ThemeService.updateMetaThemeColor() updates `<meta name="theme-color">`
  - System preference respected on first visit; manual choice overrides

  **Must NOT do**:
  - Do NOT override user's explicit choice with system preference

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`modern-javascript-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 7, 9)
  - **Parallel Group**: Wave 2
  - **Blocked By**: Task 5

  **References**:
  - `src/ui/ThemeService.js` — detectTheme() and updateMetaThemeColor()
  - `index.html` — Add meta tags

  **Acceptance Criteria**:
  - [ ] First visit follows system preference
  - [ ] Manual toggle overrides system
  - [ ] Both meta tags present and dynamic

  **QA Scenarios**:
  ```
  Scenario: System dark preference detected on first visit
    Tool: Playwright
    Steps:
      1. Clear localStorage, emulate prefers-color-scheme: dark
      2. Navigate to http://localhost:5173
      3. Assert data-theme="dark"
    Expected Result: Dark theme on first visit with system dark preference
    Evidence: .sisyphus/evidence/task-8-system-dark.png
  ```

  **Commit**: YES
  - Message: `feat(theme): add prefers-color-scheme detection + dynamic meta theme-color`
  - Files: `src/ui/ThemeService.js`, `index.html`

- [x] 9. color-mix() for derived color variants

  **What to do**:
  - Add derived tokens using `color-mix(in oklch, ...)` to vars.css:
    - `--color-accent-hover`, `--color-accent-pressed`, `--color-accent-disabled`
    - `--color-border-hover`, `--color-surface-hover`
  - Replace hardcoded hover/pressed colors in component CSS with derived tokens

  **Must NOT do**:
  - Do NOT add unused variants; Do NOT replace data-driven colors

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`styling`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 7, 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10
  - **Blocked By**: Task 1

  **References**:
  - `styles/vars.css`, `styles/components/buttons.css`
  - MDN color-mix(): https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix

  **Acceptance Criteria**:
  - [ ] Derived tokens defined with color-mix()
  - [ ] No hardcoded hover colors in component CSS
  - [ ] Derived tokens work in both themes

  **QA Scenarios**:
  ```
  Scenario: Hover states use derived tokens
    Tool: Playwright
    Steps:
      1. Navigate, hover button in light theme
      2. Toggle to dark, hover same button
      3. Assert hover color adapts per theme
    Expected Result: Hover color different in each theme
    Evidence: .sisyphus/evidence/task-9-color-mix-hover.png
  ```

  **Commit**: YES
  - Message: `feat(theme): add color-mix() for derived color variants`
  - Files: `styles/vars.css`, `styles/components/buttons.css`

- [x] 10. SVG UI chrome icons → currentColor + CSS variable theming

  **What to do**:
  - Identify UI chrome SVGs (theme toggle, panel toggles, toolbar, bit type icons)
  - Replace hardcoded fill/stroke with `currentColor` or `fill: var(--color-icon)`
  - Add `--color-icon: light-dark(#374151, #9ca3af)` to semantic tokens
  - Remove inline style from SVG icon elements in index.html
  - Update JS SVG creation to use currentColor where applicable

  **Must NOT do**:
  - Do NOT modify bit shape SVGs (data-driven colors)
  - Do NOT modify editor tool SVGs (ArcTool, CircleTool, etc.)
  - Do NOT change CanvasManager grid patterns or SelectionManager highlights

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`styling`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8, 9 after Task 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 6, 9

  **References**:
  - `index.html` — Inline SVG icons
  - `src/ui/UIModule.js:toggleTheme()` — Icon swap logic
  - `src/panel/BitsManager.js:createSVGIcon()` — Dynamic SVG creation

  **Acceptance Criteria**:
  - [ ] UI chrome icons use currentColor or CSS variable fills
  - [ ] `--color-icon` semantic token defined
  - [ ] Bit shapes remain unchanged
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: UI icons respond to theme change
    Tool: Playwright
    Steps:
      1. Navigate in light theme
      2. Inspect icon fill — assert uses currentColor or CSS var
      3. Toggle to dark theme
      4. Inspect icon fill — assert color changed
    Expected Result: Icons change with theme, bit shapes unchanged
    Evidence: .sisyphus/evidence/task-10-svg-icons-theme.png
  ```

  **Commit**: YES
  - Message: `refactor(svg): migrate UI chrome SVG icons to currentColor`
  - Files: `styles/vars.css`, `index.html`, `src/ui/UIModule.js`, `src/panel/BitsManager.js`

- [x] 11. Unify breakpoints — single source of truth (CSS + JS)

  **What to do**:
  - Define canonical breakpoints in `src/ui/breakpoints.js`:
    ```javascript
    export const BREAKPOINTS = Object.freeze({
      SM: 640, MD: 768, LG: 1024, XL: 1280, '2XL': 1536
    });
    ```
  - ⚠️ **IMPORTANT**: CSS `@media` queries do NOT support `var()` — breakpoint values must be hardcoded in CSS but match the JS constants exactly
  - Use CSS comments to document the breakpoint values and their JS counterparts:
    ```css
    /* Breakpoints: SM=640px, MD=768px, LG=1024px, XL=1280px, 2XL=1536px */
    /* Keep in sync with src/ui/breakpoints.js */
    @media (max-width: 768px) { /* = BREAKPOINTS.MD */ }
    ```
  - Update all CSS `@media` queries to use the canonical values (replace 800px → 768px, 500px → 640px)
  - Update `UIModule.js` to use `BREAKPOINTS.MD` (768) and `BREAKPOINTS.LG` (1024) instead of hardcoded 768/1000
  - Replace `window.innerWidth` checks with `window.matchMedia()` using breakpoint values
  - Add ResizeObserver for panel width monitoring instead of direct DOM measurement

  **Must NOT do**:
  - Do NOT change panel behavior — only unify when breakpoints trigger
  - Do NOT add new responsive features yet

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`modern-javascript-patterns`, `styling`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 12, 13, 14
  - **Blocked By**: Task 3

  **References**:
  - `styles/styles.css` — Current `@media (max-width: 800px)` and `@media (max-width: 500px)`. Replace with `@media (max-width: var(--bp-md))` etc.
  - `src/ui/UIModule.js` — Current `window.innerWidth <= 768` and `> 1000`. Replace with `matchMedia` + BREAKPOINTS constants.
  - Window.matchMedia: https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia

  **Acceptance Criteria**:
  - [ ] Breakpoints defined once in vars.css and breakpoints.js
  - [ ] All CSS @media use consistent breakpoint values
  - [ ] All JS use matchMedia + BREAKPOINTS constants
  - [ ] Zero hardcoded width comparisons in JS
  - [ ] `npm run build` and `npm run test` pass

  **QA Scenarios**:
  ```
  Scenario: CSS and JS breakpoints are synchronized
    Tool: Playwright
    Steps:
      1. Set viewport to 768px — assert left panel overlays
      2. Set viewport to 769px — assert left panel is sidebar
      3. Set viewport to 1024px — assert right menu visible
      4. Set viewport to 1023px — assert right menu collapses
    Expected Result: CSS and JS agree on exact breakpoints
    Failure Indicators: CSS collapses at different width than JS
    Evidence: .sisyphus/evidence/task-11-breakpoints-sync.png
  ```

  **Commit**: YES
  - Message: `refactor(responsive): unify breakpoints (CSS + JS single source)`
  - Files: `styles/vars.css`, `styles/components/*.css`, `src/ui/breakpoints.js`, `src/ui/UIModule.js`

- [x] 12. Container queries for panel components

  **What to do**:
  - Add `container-type: inline-size` to panel containers (left panel, right menu)
  - Write `@container` rules for components inside panels that adapt based on panel width
  - Replace panel-specific `@media` queries with `@container` queries where applicable
  - Example: bit form fields should reflow when panel narrows, not when viewport narrows

  **Must NOT do**:
  - Do NOT remove @media queries entirely (some are viewport-level)
  - Do NOT change component behavior — only trigger mechanism

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`styling`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 13, 14)
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 11

  **References**:
  - `styles/components/panels.css` — Panel containers to add `container-type`
  - `styles/components/forms.css` — Form components to convert to @container
  - CSS Container Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries

  **Acceptance Criteria**:
  - [ ] Panel containers have `container-type: inline-size`
  - [ ] Panel-internal components use `@container` instead of `@media`
  - [ ] Components reflow when panel resizes (not just viewport)

  **QA Scenarios**:
  ```
  Scenario: Form reflows in narrow panel
    Tool: Playwright
    Steps:
      1. Navigate, open right panel with bit form
      2. Narrow right panel to 250px
      3. Assert form fields stack vertically
      4. Widen panel to 500px
      5. Assert form fields are side by side
    Expected Result: Form adapts to panel width, not viewport
    Evidence: .sisyphus/evidence/task-12-container-queries.png
  ```

  **Commit**: YES
  - Message: `feat(responsive): add container queries for panel components`
  - Files: `styles/components/panels.css`, `styles/components/forms.css`

- [ ] 13. Flexible layout (clamp, min, responsive grid)

  **What to do**:
  - Replace fixed widths with flexible values:
    - `#right-menu { width: 500px }` → `width: clamp(320px, 35vw, 500px)`
    - `#left-panel { width: 90px }` → `width: clamp(60px, 6vw, 90px)`
  - Use CSS Grid for app-level layout:
    ```css
    #app {
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-areas: "left canvas right";
    }
    ```
  - Replace hard pixel values with `min()`, `max()`, `clamp()` where appropriate

  **Must NOT do**:
  - Do NOT change the visual layout structure (same 3-column layout)
  - Do NOT redesign the layout

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`styling`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 12, 14)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 3, 11

  **References**:
  - `styles/layout.css` — Current layout with fixed widths. Make flexible.
  - `styles/styles.css` — Contains `#right-menu { width: 500px }` and `#left-panel { width: 90px }`

  **Acceptance Criteria**:
  - [ ] No fixed pixel widths on main layout containers
  - [ ] CSS Grid for app-level layout
  - [ ] Layout adapts smoothly between 360px-1920px viewports
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Layout adapts from 360px to 1920px
    Tool: Playwright
    Steps:
      1. Set viewport to 360px — assert panels collapse, canvas fills screen
      2. Set viewport to 768px — assert left panel overlays, right panel hidden
      3. Set viewport to 1440px — assert full 3-column layout
      4. Set viewport to 1920px — assert layout scales proportionally
    Expected Result: Smooth adaptation across viewport range
    Failure Indicators: Horizontal scroll, content overflow, overlapping elements
    Evidence: .sisyphus/evidence/task-13-flexible-layout.png
  ```

  **Commit**: YES
  - Message: `feat(responsive): flexible layout with clamp/min/responsive grid`
  - Files: `styles/layout.css`

- [ ] 14. Tailwind responsive utilities + mobile viewport optimization

  **What to do**:
  - Apply Tailwind responsive utilities (`sm:`, `md:`, `lg:`, `xl:`) to HTML elements where appropriate
  - Add Tailwind dark mode utilities (`dark:`) for quick dark mode adjustments
  - Optimize touch targets for mobile (min 44px tap targets)
  - Add viewport-appropriate font sizes using Tailwind's responsive typography
  - Test on mobile viewport (360px) and ensure all interactive elements are accessible

  **Must NOT do**:
  - Do NOT replace all existing CSS with Tailwind classes (gradual adoption)
  - Do NOT remove custom CSS that works well

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`styling`, `frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 12, 13)
  - **Parallel Group**: Wave 3
  - **Blocked By**: Tasks 4, 13

  **References**:
  - `index.html` — HTML elements to add Tailwind responsive classes
  - `styles/tailwind.css` — Tailwind configuration with breakpoints
  - Tailwind responsive design: https://tailwindcss.com/docs/responsive-design

  **Acceptance Criteria**:
  - [ ] Tailwind responsive utilities applied where beneficial
  - [ ] Touch targets ≥ 44px on mobile
  - [ ] Font sizes responsive
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Mobile viewport is usable
    Tool: Playwright
    Steps:
      1. Set viewport to 360x800
      2. Assert all buttons are at least 44x44px
      3. Assert text is readable (font-size ≥ 14px)
      4. Assert no horizontal scroll
    Expected Result: Mobile experience is usable
    Failure Indicators: Tiny buttons, unreadable text, horizontal scroll
    Evidence: .sisyphus/evidence/task-14-mobile-optimized.png
  ```

  **Commit**: YES
  - Message: `feat(responsive): Tailwind responsive utilities + mobile optimization`
  - Files: `index.html`, `styles/tailwind.css`

- [ ] 15. Migrate modals to native `<dialog>`

  **What to do**:
  - Replace `BitsManager.openBitModal` custom modal with `<dialog>` element
  - Create `<dialog>` elements in index.html for each modal type:
    ```html
    <dialog id="bit-modal">
      <div class="modal-content"><!-- bit form --></div>
    </dialog>
    ```
  - Use `dialog.showModal()` and `dialog.close()` instead of manual overlay management
  - Style `::backdrop` pseudo-element for modal overlay
  - Ensure focus trap and ESC key work natively
  - Replace `window.alert()` / `window.confirm()` with `<dialog>`-based alternatives

  **Must NOT do**:
  - Do NOT change modal content or business logic
  - Do NOT break existing modal workflows

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-design`, `modern-javascript-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 16, 17, 18)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Task 3

  **References**:
  - `src/panel/BitsManager.js:openBitModal()` — Current modal implementation. Replace with `<dialog>.showModal()`.
  - `styles/components/modal.css` — Current modal styles. Add `::backdrop` styling, update for `<dialog>`.
  - MDN dialog: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog

  **Acceptance Criteria**:
  - [ ] All modals use `<dialog>` element
  - [ ] `::backdrop` styled for overlay
  - [ ] Focus trap works natively
  - [ ] ESC closes modal
  - [ ] No `window.alert()` / `window.confirm()` remaining
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Dialog modal works natively
    Tool: Playwright
    Steps:
      1. Navigate, click "Add Bit" button
      2. Assert <dialog> is open (has [open] attribute)
      3. Assert backdrop is visible
      4. Press ESC key
      5. Assert <dialog> is closed
    Expected Result: Modal opens/closes natively with focus trap
    Failure Indicators: No focus trap, ESC doesn't close, no backdrop
    Evidence: .sisyphus/evidence/task-15-dialog-modal.png
  ```

  **Commit**: YES
  - Message: `refactor(ui): migrate modals to native <dialog>`
  - Files: `index.html`, `src/panel/BitsManager.js`, `styles/components/modal.css`

- [ ] 16. Popover API for tooltips/dropdowns

  **What to do**:
  - Add `popover` attribute to tooltip/dropdown elements
  - Use `popovertarget` attribute on trigger buttons
  - Style popover with `::popover-open` pseudo-class
  - Ensure click-outside-to-close works natively

  **Must NOT do**:
  - Do NOT create new popover UI elements — only migrate existing ones

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15, 17, 18)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Task 3

  **References**:
  - `index.html` — Existing tooltip/dropdown elements
  - MDN Popover API: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API

  **Acceptance Criteria**:
  - [ ] Tooltips/dropdowns use `popover` attribute
  - [ ] Click-outside-to-close works natively
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Popover opens and closes correctly
    Tool: Playwright
    Steps:
      1. Navigate, hover/click tooltip trigger
      2. Assert popover is visible
      3. Click outside popover
      4. Assert popover is hidden
    Expected Result: Native popover behavior works
    Evidence: .sisyphus/evidence/task-16-popover.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add popover API for tooltips/dropdowns`
  - Files: `index.html`, `styles/components/toolbar.css`

- [ ] 17. View Transitions for panel/state changes

  **What to do**:
  - Wrap panel toggle and state changes in `document.startViewTransition()`:
    ```javascript
    async toggleLeftPanel() {
      if (!document.startViewTransition) {
        this.doToggleLeftPanel();
        return;
      }
      const transition = document.startViewTransition(() => {
        this.doToggleLeftPanel();
      });
      await transition.finished;
    }
    ```
  - Add CSS for view transition animations:
    ```css
    ::view-transition-old(root) { animation: 0.2s ease-out both fade-out; }
    ::view-transition-new(root) { animation: 0.2s ease-in both fade-in; }
    ```
  - Feature-detect `document.startViewTransition` with fallback to instant swap
  - Apply to: theme switch, panel toggle, 2D/3D view switch

  **Must NOT do**:
  - Do NOT add transitions that exceed 0.3s
  - Do NOT add transitions on canvas/SVG redraw

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`styling`, `frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15, 16, 18)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Tasks 3, 6

  **References**:
  - `src/ui/UIModule.js` — Panel toggle methods. Wrap with startViewTransition.
  - `src/ui/ThemeService.js` — Theme toggle. Add view transition.
  - View Transitions API: https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API

  **Acceptance Criteria**:
  - [ ] Panel toggles use View Transitions with fallback
  - [ ] Theme switch uses View Transition
  - [ ] Feature detection for browsers without support
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: Panel toggle has smooth animation
    Tool: Playwright
    Steps:
      1. Navigate, click left panel toggle
      2. Assert panel slides/crossfades (not instant)
      3. Click again, assert reverse animation
    Expected Result: Smooth transition animation on panel toggle
    Evidence: .sisyphus/evidence/task-17-view-transitions.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add view transitions for panel/state changes`
  - Files: `src/ui/UIModule.js`, `src/ui/ThemeService.js`, `styles/layout.css`

- [ ] 18. Inline style cleanup (HTML + JS element.style → CSS classes)

  **What to do**:
  - Remove inline `style="..."` attributes from `index.html` elements
  - Create CSS classes for each removed inline style
  - In JS files, replace `element.style.x = ...` with `element.classList.add/remove('class')` where appropriate
  - Priority files: `index.html`, `src/ui/UIModule.js`, `src/script.js`
  - Each replaced inline style should use a CSS variable for theme compatibility

  **Must NOT do**:
  - Do NOT change visual appearance
  - Do NOT replace ALL programmatic styles (some are dynamic and need JS)
  - Do NOT touch CanvasManager or BitsManager dynamic SVG styles (those are data-driven)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`styling`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15, 16, 17)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Tasks 3, 10

  **References**:
  - `index.html` — Inline styles on buttons, selects, divs
  - `src/ui/UIModule.js` — element.style.display assignments
  - `src/script.js` — element.style assignments

  **Acceptance Criteria**:
  - [ ] Zero inline `style="..."` attributes in index.html
  - [ ] JS element.style assignments minimized (only truly dynamic values)
  - [ ] All removed inline styles have equivalent CSS classes
  - [ ] `npm run build` succeeds

  **QA Scenarios**:
  ```
  Scenario: No inline styles in HTML
    Tool: Bash (grep)
    Steps:
      1. Grep index.html for 'style="'
      2. Assert zero matches
    Expected Result: No inline style attributes in HTML
    Evidence: .sisyphus/evidence/task-18-no-inline-styles.txt
  ```

  **Commit**: YES
  - Message: `refactor(style): extract inline styles to CSS classes`
  - Files: `index.html`, `src/ui/UIModule.js`, `src/script.js`, `styles/components/*.css`

- [ ] 19. Capacitor config — populate, forceDarkAllowed, WebView theme test

  **What to do**:
  - Populate `capacitor.config.json` with proper configuration:
    ```json
    {
      "appId": "com.facade.sectioneditor",
      "appName": "Facade Section Editor",
      "webDir": "dist",
      "server": { "androidScheme": "https" },
      "android": {
        "allowMixedContent": false
      }
    }
    ```
  - In Android manifest (`android/app/src/main/AndroidManifest.xml`), set `android:forceDarkAllowed="false"` to prevent WebView from algorithmically darkening the UI
  - Set `<meta name="theme-color">` to work with Android status bar
  - Test that theme toggle works correctly in Android WebView
  - Run `npm run cap:sync` and verify Android build

  **Must NOT do**:
  - Do NOT add Capacitor plugins (not needed for theming)
  - Do NOT change iOS config (focus on Android first)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`build-facade`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 20)
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 20
  - **Blocked By**: Task 5

  **References**:
  - `capacitor.config.json` — Currently empty (0 bytes). Populate with proper config.
  - `android/app/src/main/AndroidManifest.xml` — Add forceDarkAllowed="false".
  - Capacitor docs: https://capacitorjs.com/docs/config

  **Acceptance Criteria**:
  - [ ] capacitor.config.json populated with valid config
  - [ ] forceDarkAllowed="false" set in Android manifest
  - [ ] `npm run cap:sync` succeeds
  - [ ] Theme toggle works in WebView

  **QA Scenarios**:
  ```
  Scenario: Capacitor config is valid
    Tool: Bash
    Steps:
      1. Run `npm run cap:sync`
      2. Assert exit code 0
      3. Verify android/ directory has proper manifest
    Expected Result: Capacitor sync succeeds, Android project configured
    Evidence: .sisyphus/evidence/task-19-capacitor-sync.txt
  ```

  **Commit**: YES
  - Message: `feat(capacitor): populate config + forceDarkAllowed + WebView test`
  - Files: `capacitor.config.json`, `android/app/src/main/AndroidManifest.xml`

- [ ] 20. Three.js scene background theme awareness

  **What to do**:
  - In `ThemeService`, emit `theme:changed` event with current theme
  - In `ThreeModule`, listen for `theme:changed` and update scene background color
  - Map CSS theme colors to Three.js hex values for scene background
  - Ensure 3D view background changes when theme toggles

  **Must NOT do**:
  - Do NOT change Three.js rendering pipeline
  - Do NOT modify CSG operations
  - Do NOT change materials or lighting

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`threejs-fundamentals`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5
  - **Blocked By**: Task 19

  **References**:
  - `src/three/ThreeModule.js` — Scene setup. Add event listener for theme:changed to update scene.background.
  - `src/ui/ThemeService.js` — Emits theme:changed event.
  - Three.js scene.background: https://threejs.org/docs/#api/en/scenes/Scene.background

  **Acceptance Criteria**:
  - [ ] ThreeModule listens for theme:changed
  - [ ] Scene background updates on theme toggle
  - [ ] 3D view looks correct in both themes

  **QA Scenarios**:
  ```
  Scenario: 3D scene background changes with theme
    Tool: Playwright
    Steps:
      1. Navigate, switch to 3D view
      2. Toggle theme to dark
      3. Screenshot 3D view — assert dark background
      4. Toggle theme to light
      5. Screenshot 3D view — assert light background
    Expected Result: 3D scene background matches current theme
    Evidence: .sisyphus/evidence/task-20-threejs-theme.png
  ```

  **Commit**: YES
  - Message: `feat(theme): Three.js scene background theme awareness`
  - Files: `src/three/ThreeModule.js`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

```
Wave 0:
  commit 0.1: "fix(ui): fix canvasManager reference in updateCanvasAfterPanelToggle"
  commit 0.2: "chore: add visual baseline screenshots for regression testing"

Wave 1:
  commit 1.1: "feat(css): add 3-layer design token system with oklch + light-dark()"
  commit 1.2: "feat(css): add minimal CSS reset"
  commit 1.3: "refactor(css): split styles.css into modular files"
  commit 1.4: "feat(css): initialize Tailwind CSS v4 with CSS-first config"
  commit 1.5: "feat(theme): add ThemeService module with EventBus integration"

Wave 2:
  commit 2.1: "feat(theme): migrate to color-scheme: light dark + light-dark()"
  commit 2.2: "feat(theme): add @property animated theme transitions"
  commit 2.3: "feat(theme): add prefers-color-scheme detection + dynamic meta theme-color"
  commit 2.4: "feat(theme): add color-mix() for derived color variants"
  commit 2.5: "refactor(svg): migrate UI chrome SVG icons to currentColor"

Wave 3:
  commit 3.1: "refactor(responsive): unify breakpoints (CSS + JS single source)"
  commit 3.2: "feat(responsive): add container queries for panel components"
  commit 3.3: "feat(responsive): flexible layout with clamp/min/responsive grid"
  commit 3.4: "feat(responsive): Tailwind responsive utilities + mobile optimization"

Wave 4:
  commit 4.1: "refactor(ui): migrate modals to native <dialog>"
  commit 4.2: "feat(ui): add popover API for tooltips/dropdowns"
  commit 4.3: "feat(ui): add view transitions for panel/state changes"
  commit 4.4: "refactor(style): extract inline styles to CSS classes"

Wave 5:
  commit 5.1: "feat(capacitor): populate config + forceDarkAllowed + WebView test"
  commit 5.2: "feat(theme): Three.js scene background theme awareness"
```

---

## Success Criteria

### Verification Commands
```bash
npm run build       # Expected: successful build with no errors
npm run test         # Expected: all tests pass
npm run dev          # Expected: dev server starts, UI loads
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Theme toggle works smoothly with animation
- [ ] prefers-color-scheme auto-detected on first visit
- [ ] App renders correctly at 360px, 768px, 1440px
- [ ] All breakpoints unified
- [ ] <dialog> replaces custom modals
- [ ] Dark mode renders correctly
- [ ] Capacitor Android build runs with correct theming
