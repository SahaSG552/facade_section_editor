# CSS Variables Audit

**Date**: 2026-04-17  
**File**: `styles/styles.css`  
**Purpose**: Prepare for token system implementation by cataloging all CSS custom properties

---

## Current Variables

### Colors (HSL Format)

| Variable               | :root Value  | .dark Value  | Category   | Usage                        |
| ---------------------- | ------------ | ------------ | ---------- | ---------------------------- |
| --background           | 0 0% 100%    | 0 0% 9%      | background | Page background              |
| --foreground           | 0 0% 0%      | 0 0% 98%     | text       | Primary text color           |
| --card                 | 0 0% 100%    | 0 0% 9%      | surface    | Card/panel backgrounds       |
| --card-foreground      | 0 0% 0%      | 0 0% 98%     | text       | Text on cards                |
| --primary              | 212 100% 50% | 212 100% 50% | accent     | Primary action color (blue)  |
| --primary-foreground   | 0 0% 100%    | 0 0% 100%    | text       | Text on primary              |
| --secondary            | 0 0% 96%     | 0 0% 15%     | surface    | Secondary backgrounds        |
| --secondary-foreground | 0 0% 0%      | 0 0% 98%     | text       | Text on secondary            |
| --muted                | 0 0% 96%     | 0 0% 15%     | surface    | Muted backgrounds            |
| --muted-foreground     | 0 0% 45%     | 0 0% 65%     | text       | Muted text                   |
| --accent               | 0 0% 96%     | 0 0% 15%     | surface    | Accent backgrounds (hover)   |
| --accent-foreground    | 0 0% 0%      | 0 0% 98%     | text       | Text on accent               |
| --border               | 0 0% 90%     | 0 0% 15%     | border     | Border color                 |
| --input                | 0 0% 96%     | 0 0% 15%     | surface    | Input field backgrounds      |
| --ring                 | 212 100% 50% | 212 100% 50% | accent     | Focus ring (same as primary) |

### Colors (Hex Format - Non-HSL)

| Variable           | :root Value | .dark Value | Category | Issue                         |
| ------------------ | ----------- | ----------- | -------- | ----------------------------- |
| --bit-outline      | #000000     | #e0e0e0     | canvas   | Hardcoded hex (should be HSL) |
| --grid-color       | #000000     | #666666     | canvas   | Hardcoded hex (should be HSL) |
| --scene-background | #f5f5f5     | #1a1a1a     | 3D scene | Hardcoded hex (should be HSL) |

### Spacing & Sizing

| Variable | Value | Usage         | Category      |
| -------- | ----- | ------------- | ------------- |
| --radius | 12px  | border-radius | border-radius |

---

## Hardcoded Values Found

### In Component Styles (Not Using Variables)

**Colors (Hex):**

- `#2f5fb8` - Editor symmetry axis (line 1448) - **SHOULD BE TOKEN**
- `#e63946` - Path cell command color (line 1806) - **SHOULD BE TOKEN**
- `#b07400` - Path cell mod command color (line 1827) - **SHOULD BE TOKEN**
- `#ff6b6b` - Dark theme path cell command (line 1837) - **SHOULD BE TOKEN**
- `#ffd65c` - Dark theme path cell mod command (line 1843) - **SHOULD BE TOKEN**
- `#a96e00` - Path cell mod delete color (line 1904) - **SHOULD BE TOKEN**

**Spacing/Sizing (px):**

- `12px 20px` - Header padding (line 67)
- `8px` - Various button padding (multiple locations)
- `6px` - Various gaps (multiple locations)
- `5px` - Various padding (multiple locations)
- `4px` - Various padding (multiple locations)
- `3px` - Various padding (multiple locations)
- `2px` - Various padding (multiple locations)
- `1px` - Various borders (multiple locations)

**Shadows:**

- `0 1px 3px rgba(0, 0, 0, 0.1)` - Header shadow (line 70)
- `0 2px 10px rgba(0, 0, 0, 0.2)` - Bit list shadow (line 507)
- `0 2px 5px rgba(0, 0, 0, 0.2)` - Action icons shadow (line 588)
- `0 4px 20px rgba(0, 0, 0, 0.3)` - Modal shadow (line 877)
- `0 1px 4px rgba(0,0,0,0.8)` - Arc radius popup shadow (line 1518)

**Opacity/RGBA:**

- `rgba(0, 0, 0, 0.5)` - Modal overlay (line 865)
- `rgba(230, 57, 70, 0.12)` - Path cell command bg (line 1805)
- `rgba(230, 57, 70, 0.25)` - Path cell command hover (line 1815)
- `rgba(245, 183, 0, 0.16)` - Path cell mod command bg (line 1825)
- `rgba(42, 157, 143, 0.08)` - Path cell param bg (line 1848)
- Multiple other rgba values for various states

**Font Sizes (px):**

- `18px` - Header h1 (line 77)
- `14px` - Various text (multiple locations)
- `13px` - Various text (multiple locations)
- `12px` - Various text (multiple locations)
- `11px` - Various text (multiple locations)
- `10px` - Various text (multiple locations)

**Font Weights:**

- `600` - Header h1 (line 78)
- `500` - Various buttons (multiple locations)
- `700` - Various text (multiple locations)
- `400` - Default (not specified)

---

## Inconsistencies & Issues

### 1. **Mixed Color Formats**

- **Issue**: HSL variables for semantic colors, but hardcoded hex for canvas/editor elements
- **Impact**: Inconsistent theming, difficult to maintain
- **Recommendation**: Convert all hex colors to HSL variables

### 2. **Missing Spacing Scale**

- **Issue**: Hardcoded px values throughout (2px, 3px, 4px, 5px, 6px, 8px, 10px, 12px, 20px)
- **Impact**: No consistent spacing system
- **Recommendation**: Create spacing scale tokens (xs, sm, md, lg, xl)

### 3. **Missing Shadow Tokens**

- **Issue**: Multiple shadow definitions hardcoded inline
- **Impact**: Inconsistent elevation system
- **Recommendation**: Create shadow tokens (sm, md, lg)

### 4. **Missing Typography Tokens**

- **Issue**: Font sizes and weights scattered throughout
- **Impact**: No consistent typography scale
- **Recommendation**: Create typography tokens (xs, sm, base, lg, xl)

### 5. **Opacity Values Not Standardized**

- **Issue**: Various opacity values (0.04, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95)
- **Impact**: Inconsistent transparency system
- **Recommendation**: Create opacity scale tokens

### 6. **Primary Color Consistency**

- **Issue**: `--primary` and `--ring` have identical values (212 100% 50%)
- **Impact**: Redundant variable
- **Recommendation**: Consider consolidating or clarifying purpose

### 7. **Accent Color Inconsistency**

- **Issue**: In light theme, `--accent` is 0 0% 96% (very light gray), but used for hover states
- **Impact**: May not provide sufficient contrast for accessibility
- **Recommendation**: Review contrast ratios for WCAG compliance

### 8. **Editor-Specific Colors Not Tokenized**

- **Issue**: Editor colors (symmetry axis, path cells, etc.) are hardcoded
- **Impact**: Cannot easily switch editor themes
- **Recommendation**: Create editor-specific color tokens

---

## Recommendations for Token System

### Phase 1: Core Tokens

1. **Colors**: Convert all hex to HSL, organize by semantic purpose
2. **Spacing**: Create scale (2px, 4px, 6px, 8px, 12px, 16px, 20px, 24px, 32px)
3. **Shadows**: Create elevation system (sm, md, lg)
4. **Typography**: Create scale (10px, 11px, 12px, 13px, 14px, 16px, 18px)

### Phase 2: Component Tokens

1. **Button**: Size, padding, border-radius
2. **Input**: Height, padding, border-radius
3. **Card**: Padding, border-radius, shadow
4. **Modal**: Width, padding, shadow

### Phase 3: Editor Tokens

1. **Canvas**: Grid color, bit outline, scene background
2. **Editor UI**: Tool buttons, snap buttons, action buttons
3. **Path Editor**: Cell colors, command colors, parameter colors
4. **Geometry**: Axis colors, selection colors, ghost colors

---

## Summary Statistics

- **Total CSS Variables**: 15 (HSL) + 3 (Hex) = 18
- **Hardcoded Colors**: 6 hex values in component styles
- **Hardcoded Spacing**: 10+ unique px values
- **Hardcoded Shadows**: 5 unique shadow definitions
- **Hardcoded Font Sizes**: 6 unique sizes
- **Hardcoded Font Weights**: 3 unique weights
- **Hardcoded Opacity Values**: 20+ unique values

---

## Next Steps

1. ✅ Audit complete - all variables cataloged
2. ⏳ Create token design system (spacing, typography, shadows)
3. ⏳ Convert hardcoded values to tokens
4. ⏳ Implement token system in CSS
5. ⏳ Update component styles to use tokens
6. ⏳ Test theming across light/dark modes
7. ⏳ Validate WCAG contrast compliance
