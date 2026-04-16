# UI Theme Refactor - Work Plan

## TL;DR

> **Quick Summary**: Complete UI theming system with light/dark mode, CSS design tokens, SVG/3D canvas adaptation, and responsive design following framerlists.com patterns.

> **Deliverables**:
- CSS design tokens (hex + color-mix()) with [data-theme] selector
- Dark/light theme toggle working across all UI components
- SVG bit icons, shank, contours adapting to theme
- 3D canvas background and grid theming
- Responsive layout with sliding panels

> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Wave 1 tokens → Wave 2 SVG/3D → Wave 3 integration → verification

---

## Context

### Original Request
User wants UI refactoring for consistent design with:
- CSS theming system (light/dark themes)
- Consistent styling via CSS design tokens
- Flexible, adaptive design for large screens and mobile devices
- SVG elements (bit contours, shank, extensions) adapting to theme
- 3D canvas (background, grid) matching theme

### Interview Summary

**Key Decisions Made**:
- **Формат токенов**: ГИБРИДНЫЙ — hex для основных цветов, color-mix() для деривативных
- **Механизм темы**: [data-theme="dark"] (framerlists) — NOT .dark class
- **Стиль контролов**: Неоморфный (framerlists) — inner border + составные тени + animated indicator
- **Приоритет**: СНАЧАЛА ТЕМИЗАЦИЯ, потом responsive
- **Scope**: Все компоненты — header, left panel, center canvas, 3D canvas, right panel, modals, SVG bit icons

**Research Findings from Explore Agent**:
- Current CSS: styles/styles.css (2730 lines), HSL format, .dark class
- Hardcoded colors in JS (~15 locations): BitsManager, CanvasManager (grid), SceneManager (GridHelper), ViewCubeGizmo
- SceneManager already reads --scene-background CSS var (partial work)
- Layout: fixed 90px/500px panels, @media 800px and 500px

### Metis Review (from analysis)

**Identified Gaps** (addressed):
- Need HSL → hex conversion for framerlists compatibility
- JS theme toggle must update SVG grid and Three.js grid on theme switch
- Need sliding panels pattern for mobile (framerlists style: 1024px, 768px)
- SVG icons need CSS variable application instead of hardcoded values

---

## Work Objectives

### Core Objective
Transform UI from mixed HSL/hardcoded colors to unified hex+color-mix() design tokens with full dark/light theme support across all UI surfaces including SVG icons and 3D canvas.

### Concrete Deliverables

- **CSS Design Tokens**: styles/theme.css with --facade-* variables
- **Theme Toggle**: [data-theme] selector working
- **SVG Icons**: Bit shapes, shank using CSS variables
- **3D Canvas**: Background and grid adapting to theme
- **Responsive Layout**: Sliding panels at 1024px, 768px breakpoints

### Definition of Done

- [ ] `document.documentElement.getAttribute('data-theme')` returns 'light' or 'dark'
- [ ] All UI elements visible and properly styled in both themes
- [ ] SVG bit icons visible on both light and dark backgrounds
- [ ] 3D canvas background matches theme
- [ ] 3D grid line colors visible on both backgrounds
- [ ] Layout adapts at 1024px and 768px breakpoints

### Must Have

- Light and dark themes both fully functional
- All SVG elements (bits, shank, extensions) visible in both themes
- 3D canvas background and grid adapting to theme
- Responsive layout with sliding panels

### Must NOT Have (Guardrails)

- Hardcoded SVG fill/stroke colors in JS
- Hardcoded Three.js grid helper colors
- Fixed-width-only responsive layout

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: NO (visual UI verification)
- **Framework**: None

### QA Policy
Every task includes agent-executed QA scenarios via inspection and Playwright-style visual verification.

**Verification approach**: Bash/Puppeteer screenshots comparing light/dark themes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - tokens + infrastructure):
├── 1. CSS Design Tokens (hex + color-mix()) with [data-theme] selector
├── 2. Theme toggle logic with [data-theme] attribute
└── 3. Utility functions (getCssVar, cssVarToThreeColor)

Wave 2 (Core theming - MAX PARALLEL):
├── 4. SVG bit icons theming (BitsManager.js fills/strokes)
├── 5. 2D Canvas grid theming (CanvasManager.js colors)
├── 6. 3D Scene background theming (already works - confirm)
├── 7. 3D Grid theming (SceneManager.js GridHelper)
├── 8. ViewCubeGizmo theming
├── 9. UI components theming (buttons, panels, tables)
├── 10. Header + view toggles theming
├── 11. Right panel theming
└── 12. Modal dialogs theming

Wave 3 (Responsive + Integration):
├── 13. Responsive layout (sliding panels 1024px/768px)
├── 14. Theme toggle callback integration (update all on toggle)
└── 15. Final visual QA (light/dark verification)
```

### Dependency Matrix (abbreviated)

- **1-3**: - - all in Wave 2
- **4**: 1 - 5, 6, 7, 8
- **13**: 1, 2 - 15
- **14**: 1, 2, 4, 5, 6, 7 - 15
- **15**: 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 - final

### Agent Dispatch Summary

- **1**: **3** - T1 → `quick`, T2 → `quick`, T3 → `quick`
- **2**: **9** - T4 → `deep`, T5 → `deep`, T6 → `quick`, T7 → `deep`, T8 → `deep`, T9 → `unspecified-high`, T10 → `unspecified-high`, T11 → `unspecified-high`, T12 → `unspecified-high`
- **3**: **3** - T13 → `unspecified-high`, T14 → `deep`, T15 → `visual-engineering`

---

## TODOs

- [x] 1. **CSS Design Tokens (hex + color-mix()) with [data-theme] selector**

  **What to do**: Create styles/theme.css with comprehensive design tokens following framerlists patterns:
  - Surface colors: --facade-bg-main, --facade-bg-card, --facade-bg-input, --facade-bg-button
  - Text colors: --facade-text-primary, --facade-text-secondary, --facade-text-muted
  - Border colors: --facade-border-default, --facade-border-subtle
  - Brand/accent: --facade-brand, --facade-brand-hover
  - Grid colors: --facade-grid-minor, --facade-grid-major
  - Bit colors: --facade-bit-outline, --facade-bit-fill-default, --facade-shank-fill
  - Use color-mix() for hover/active variants where applicable
  - Include [data-theme="dark"] overrides

  **Must NOT do**: Don't use HSL format (convert existing HSL to hex)

  **References**:
  - styles/styles.css:3-26 - Existing token structure
  - framerlists.com - Pattern reference (hex + color-mix)

- [x] 2. **Theme toggle logic with [data-theme] attribute**

  **What to do**: Update script.js theme toggle to use [data-theme] instead of .dark.class:
  - Change DOM manipulation from classList.add/remove('dark') to setAttribute('data-theme', 'dark'/'light')
  - Support prefers-color-scheme as initial value
  - Store preference in localStorage
  - Apply theme on page load from storage/preference

  **Must NOT do**: Keep old .dark class mechanism

  **References**:
  - index.html:42-56 - Current theme toggle button
  - src/script.js - Theme toggle handler (find pattern)

- [x] 3. **Utility functions (getCssVar, cssVarToThreeColor)**

  **What to do**: Create src/utils/theme.js with:
  - getCssVar(name, fallback) - returns CSS variable value
  - cssVarToThreeColor(name, fallback) - converts CSS var to THREE.Color
  - watchTheme(callback) - calls callback on theme change

  **References**:
  - SceneManager.js:79 - Existing CSS var reading pattern

---

- [x] 4. **SVG bit icons theming (BitsManager.js fills/strokes)**

  **What to do**: Replace hardcoded colors in src/panel/BitsManager.js:
  - createSVGIcon: circle.fill/stroke using var(--facade-icon-bg), var(--facade-icon-stroke)
  - createActionIcon: action colors using var(--facade-action-*)
  - createBitShapeElement: bit fill using var(--facade-bit-fill, --facade-bit-fill-default)
  - Shank fill using var(--facade-shank-fill)
  - Use getCssVar() utility instead of hardcoded "white"/"black"/"green"/etc

  **Must NOT do**: Don't hardcode "white", "black", "green", "orange", "red"

  **References**:
  - BitsManager.js:531-533 - createSVGIcon hardcoded white/black
  - BitsManager.js:670-692 - createActionIcon hardcoded colors
  - BitsManager.js:943 - shank hardcoded rgba
  - BitsManager.js:956 - default bit fill

- [x] 5. **2D Canvas grid theming (CanvasManager.js colors)**

  **What to do**: Replace hardcoded grid colors in src/canvas/CanvasManager.js GridRenderer:
  - "#e0e0e0" → getCssVar('--facade-grid-minor', '#e0e0e0')
  - "#5f5959ff" → getCssVar('--facade-grid-major', '#5f5959')
  - Apply on grid creation and on theme change

  **Must NOT do**: Don't use string literals for grid colors

  **References**:
  - CanvasManager.js:378-388 - Hardcoded grid colors

- [x] 6. **3D Scene background theming** (CONFIRM EXISTING WORK)
- [x] 7. **3D Grid theming (SceneManager.js GridHelper)**
- [x] 8. **ViewCubeGizmo theming**

  **What to do**: Replace hardcoded colors in src/three/ViewCubeGizmo.js:
  - COLORS object values → CSS var lookups
  - createTextTexture: '#ffffff' background → var(--facade-gizmo-bg)
  - createTextTexture: '#333333' text → var(--facade-gizmo-text)

  **References**:
  - ViewCubeGizmo.js:64-69 - COLORS constant
  - ViewCubeGizmo.js:262-271 - createTextTexture

- [x] 9. **UI components theming (buttons, panels, tables)**
- [x] 10. **Header + view toggles theming**
- [x] 11. **Right panel theming**
- [x] 12. **Modal dialogs theming**

  **What to do**: Apply theming to any modal dialogs:
  - Modal overlay with backdrop blur
  - Modal content with proper background
  - Button colors inside modals

  **Must NOT do**: Don't assume white background in modals

- [ ] 13. **Responsive layout (sliding panels 1024px/768px)**

  **What to do**: Add sliding panel behavior:
  - 1024px: panels slide in/out from sides with backdrop
  - 768px: more compact buttons, collapsed panels default
  - framerlists .panel-backdrop pattern
  - Smooth transform transitions

  **References**:
  - framerlists @media(max-width:1024px) - Panel slide pattern

- [ ] 14. **Theme toggle callback integration**

  **What to do**: Connect theme toggle to all themed elements:
  - Register watchTheme callbacks for grid redraw
  - Update ViewCube on theme change
  - Re-render SVG icons if needed

  **Must NOT do**: Don't require full page reload for theme switch

- [ ] 15. **Final visual QA (light/dark verification)**

  **What to do**: Comprehensive verification:
  - Screenshot comparison: light vs dark theme
  - All SVG icons visible in both modes
  - 3D canvas renders properly in both themes
  - No layout breakage at breakpoints

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify: all Must Have present, Must NOT Have absent, all tasks addressed.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  No hardcoded colors remaining in JS files. All colors via CSS variables.

- [ ] F3. **Real Manual QA** — `visual-engineering`
  Run app in both themes. Screenshot verification.

- [ ] F4. **Scope Fidelity Check** — `deep`
  All listed components themed. No unauthorized additions.

---

## Commit Strategy

- Each Wave: One meaningful commit with wave number in message
- Pre-commit: Test in both themes locally

---

## Success Criteria

### Verification Commands
```bash
# Theme check
document.documentElement.getAttribute('data-theme')  # Should be 'light' or 'dark'

# Visual verification (run in browser)
# Toggle theme, verify all elements visible
# Switch between 2D/3D views in both themes
```

### Final Checklist
- [ ] All Must Have items implemented
- [ ] No hardcoded SVG/grid colors in JS
- [ ] Both themes visually verified
- [ ] 3D canvas background and grid adapt
- [ ] Responsive layout works at breakpoints