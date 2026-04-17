# UI Refactor 2026 - Learnings

## Design Token System Implementation (2026-04-17)

### Completed
✅ Created `src/shared/config/tokens.js` with:
- Primitive tokens: colors (gray, blue, red, green, yellow, canvas, path), spacing (4px module), typography, radius, shadows, opacity
- Semantic tokens: color (bg, text, border, action, state, canvas, path), spacing, typography, shadow, radius
- Breakpoint tokens: xs(320), sm(480), md(768), lg(1024), xl(1280), 2xl(1536)
- Media query helpers

✅ Created `src/shared/config/generateCSS.js` with:
- `generateThemeCSS(theme)` - generates CSS variables for light/dark themes
- `generateBreakpointCSS()` - generates breakpoint CSS
- `generateCompleteThemeCSS()` - combines both
- `generateTokenDocumentation()` - generates markdown reference
- Dark theme overrides for semantic colors

### Token Coverage
- **Colors**: 7 color palettes (gray 11 levels, blue/red/green/yellow 10 levels each) + canvas + path
- **Spacing**: 7 scale levels (xs, sm, md, lg, xl, 2xl, 3xl) following 4px module
- **Typography**: 7 font sizes (xs-3xl), 4 weights (normal, medium, semibold, bold), 3 line heights
- **Shadows**: 5 levels (xs-xl) matching svg.framerlists.com style
- **Opacity**: 6 levels for transparency states
- **Radius**: 6 levels (none, sm, md, lg, xl, full)

### Audit Alignment
All 18 existing CSS variables converted to tokens:
- 15 HSL colors → primitive color tokens
- 3 hex colors (bit-outline, grid-color, scene-background) → canvas color tokens
- 10+ spacing values → spacing scale
- 5 shadow definitions → shadow scale
- 6 font sizes → typography scale
- 3 font weights → typography weights
- 20+ opacity values → opacity scale

### Architecture
Two-layer system following Gravity UI patterns:
1. **Primitive tokens**: Raw HSL values, never used directly
2. **Semantic tokens**: References to primitives, used in components
3. **Dark theme**: Automatic overrides for semantic colors

### Key Patterns
- HSL format for all colors (easy theme manipulation)
- 4px spacing module base (Gravity UI standard)
- Semantic color references prevent direct primitive usage
- Dark theme overrides handled in generateCSS
- Canvas/editor colors separated from UI colors

### Next Steps
- [ ] Integrate generateCSS into build process
- [ ] Update styles.css to use token variables
- [ ] Create ThemeManager for runtime theme switching
- [ ] Update component styles to reference tokens
- [ ] Test light/dark theme switching
- [ ] Validate WCAG contrast compliance
