// Design Tokens for Facade Section Editor
// Based on DESIGN.md — Mastercard-inspired warm editorial aesthetic
// Single source of truth for all design values
//
// Color Palette: Warm cream canvas + ink black + signal orange accents
// Reference: Canvas Cream #F3F0EE, Ink Black #141413, Signal Orange #CF4500

// ============================================================================
// PRIMITIVE TOKENS — Raw values (foundation layer)
// These are never used directly in components
// ============================================================================

export const primitiveTokens = {
  // --------------------------------------------------------------------------
  // Colors (HSL format for easy theme manipulation)
  // Warm palette with slight red-orange undertone
  // --------------------------------------------------------------------------
  color: {
    // Warm gray palette (neutral foundation with warm undertone)
    gray: {
      50: '30 6% 94%',        // Canvas Cream — page background
      100: '30 4% 96%',       // Soft Bone — light surface
      200: '30 5% 98%',       // Lifted Cream — raised surfaces
      300: '30 5% 90%',       // Light border / subtle divider
      400: '36 10% 80%',      // Dust Taupe — muted borders
      500: '30 5% 65%',       // Mid gray — disabled elements
      600: '30 2% 41%',       // Slate Gray — muted text
      700: '30 3% 25%',       // Charcoal alt — secondary text
      800: '240 1% 15%',      // Charcoal — dark surfaces
      900: '30 3% 8%',        // Ink Black — primary text, CTAs, footer
      950: '30 3% 4%',        // Deeper black for dark theme base
    },

    // Orange / Coral palette (primary accent — replaces blue)
    orange: {
      50: '20 80% 96%',
      100: '20 75% 90%',
      200: '20 70% 80%',
      300: '18 75% 70%',
      400: '18 89% 59%',     // Light Signal Orange — decorative arcs
      500: '20 90% 50%',     // Mid orange — hover states
      600: '20 100% 40%',    // Signal Orange — consent/legal actions
      700: '20 88% 32%',     // Clay Brown — secondary links
      800: '20 85% 25%',
      900: '20 80% 18%',
    },

    // Red palette (error states — warm-toned)
    red: {
      50: '10 85% 97%',
      100: '10 80% 91%',
      200: '10 75% 84%',
      300: '10 70% 70%',
      400: '10 75% 60%',
      500: '10 80% 55%',     // Error color
      600: '10 85% 48%',
      700: '10 90% 42%',
      800: '10 85% 36%',
      900: '10 70% 30%',
    },

    // Green palette (success states — warm-leaning green)
    green: {
      50: '120 30% 96%',
      100: '120 28% 88%',
      200: '120 25% 78%',
      300: '120 22% 65%',
      400: '120 28% 50%',
      500: '120 30% 45%',    // Success color
      600: '120 32% 38%',
      700: '120 35% 32%',
      800: '120 30% 26%',
      900: '120 25% 20%',
    },

    // Yellow / Amber palette (warning states)
    yellow: {
      50: '40 100% 96%',
      100: '40 100% 88%',
      200: '40 95% 78%',
      300: '38 90% 65%',
      400: '38 90% 55%',
      500: '36 95% 50%',     // Warning color
      600: '34 90% 45%',
      700: '32 85% 38%',
      800: '30 80% 32%',
      900: '28 70% 26%',
    },

    // Link / info color (dusty blue — minimal use)
    blue: {
      50: '223 50% 96%',
      100: '223 48% 88%',
      200: '223 45% 78%',
      300: '223 50% 68%',
      400: '223 52% 58%',
      500: '223 54% 48%',    // Link Blue — inline links only
      600: '223 50% 42%',
      700: '223 48% 36%',
      800: '223 45% 30%',
      900: '223 40% 24%',
    },

    // Canvas-specific colors (editor elements — keep functional)
    canvas: {
      gridLight: '30 5% 70%',     // Warm gray grid lines (light theme)
      gridDark: '30 5% 35%',      // Grid lines (dark theme)
      bitOutlineLight: '210 60% 35%',  // Blue bit outlines (light)
      bitOutlineDark: '210 40% 70%',  // Blue bit outlines (dark)
      sceneBgLight: '30 4% 96%',      // 3D scene background (light)
      sceneBgDark: '30 3% 10%',       // 3D scene background (dark)
      symmetryAxis: '18 89% 59%',     // Light Signal Orange — symmetry axis
    },

    // Path editor colors (functionally same but warm-toned)
    path: {
      commandBg: '10 75% 55%',       // Command cell bg (red)
      commandHover: '10 70% 60%',
      modCommandBg: '38 90% 50%',    // Mod command bg (amber)
      modCommandHover: '36 85% 55%',
      paramBg: '120 28% 50%',        // Parameter cell bg (green)
      paramHover: '120 25% 55%',
      deleteColor: '32 85% 38%',     // Delete action (dark amber)
    },
  },

  // --------------------------------------------------------------------------
  // Spacing (8px module base — DESIGN.md spec)
  // --------------------------------------------------------------------------
  space: {
    xs: '4px',     // 0.5 unit — tight spacing
    sm: '8px',     // 1 unit — base spacing unit
    md: '16px',    // 2 units — default medium spacing
    lg: '24px',    // 3 units — default large spacing
    xl: '32px',    // 4 units — section spacing
    '2xl': '48px', // 6 units — layout spacing
    '3xl': '64px', // 8 units — page margins
    '4xl': '96px', // 12 units — major sections
    '5xl': '128px',// 16 units — page padding
  },

  // --------------------------------------------------------------------------
  // Typography scale (adapted for CAD tool — denser than marketing)
  // --------------------------------------------------------------------------
  font: {
    family: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    size: {
      xs: '10px',     // Tiny labels, captions
      sm: '11px',     // Small UI text
      base: '12px',   // Default body (CAD apps use smaller text)
      lg: '13px',     // Large body
      xl: '14px',     // Small headings
      '2xl': '16px',  // Medium headings
      '3xl': '18px',  // Section headings (header title)
      '4xl': '24px',  // Large headings
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // --------------------------------------------------------------------------
  // Border radius (DESIGN.md spec — extreme, no in-between)
  // --------------------------------------------------------------------------
  radius: {
    none: '0px',
    sm: '4px',         // Tiny decorative
    md: '8px',         // Minor UI elements
    lg: '20px',        // Buttons primary/secondary (signature radius)
    xl: '40px',        // Hero frames, section containers, large cards
    pill: '999px',     // Full pill — navigation, pills, selectors
    full: '50%',       // Perfect circle — portraits, icon buttons, satellite CTAs
  },

  // --------------------------------------------------------------------------
  // Shadows (soft atmospheric cushioning — DESIGN.md spec)
  // --------------------------------------------------------------------------
  shadow: {
    none: 'none',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06)',           // Subtle lift
    md: '0 4px 12px rgba(0, 0, 0, 0.06)',          // Hover state
    lg: '0 10px 30px rgba(0, 0, 0, 0.08)',         // Cards, panels
    xl: '0 24px 48px rgba(0, 0, 0, 0.08)',         // Elevated cards (DESIGN.md L2)
    '2xl': '0 70px 110px rgba(0, 0, 0, 0.25)',     // Dramatic elevation (DESIGN.md L3)
  },

  // --------------------------------------------------------------------------
  // Opacity scale
  // --------------------------------------------------------------------------
  opacity: {
    disabled: 0.5,
    overlay: 0.5,
    hover: 0.06,        // Very subtle hover (warm aesthetic)
    active: 0.10,
    selected: 0.14,
    subtle: 0.04,
  },
};

// ============================================================================
// SEMANTIC TOKENS — Intent-based (component layer)
// ============================================================================

export const semanticTokens = {
  color: {
    // Backgrounds
    bg: {
      default: primitiveTokens.color.gray[50],     // Canvas Cream — main page
      surface: primitiveTokens.color.gray[100],     // Soft Bone — panels, cards
      elevated: primitiveTokens.color.gray[200],    // Lifted Cream — raised elements
      inverse: primitiveTokens.color.gray[900],     // Ink Black — dark bg
    },

    // Text colors
    text: {
      primary: primitiveTokens.color.gray[900],     // Ink Black
      secondary: primitiveTokens.color.gray[700],   // Charcoal alt
      muted: primitiveTokens.color.gray[600],       // Slate Gray
      inverse: primitiveTokens.color.gray[50],      // On dark backgrounds
      onAction: primitiveTokens.color.gray[200],    // Text on primary buttons (cream)
      link: primitiveTokens.color.blue[500],        // Link Blue
    },

    // Borders
    border: {
      default: primitiveTokens.color.gray[400],     // Dust Taupe
      emphasis: primitiveTokens.color.gray[300],    // Light border
      inverse: primitiveTokens.color.gray[600],     // Inverted borders (dark mode)
    },

    // Actions (primary interactive elements)
    action: {
      primary: primitiveTokens.color.gray[900],     // Ink Black — primary CTA
      primaryHover: primitiveTokens.color.gray[800],// Charcoal — hover
      primaryActive: primitiveTokens.color.gray[950],// Deeper black — active
      secondary: 'transparent',
      secondaryBorder: primitiveTokens.color.gray[400],
      secondaryHover: primitiveTokens.color.gray[100],
      ghost: 'transparent',
      ghostHover: primitiveTokens.color.gray[100],
      // Accent actions (orange)
      accent: primitiveTokens.color.orange[600],    // Signal Orange
      accentHover: primitiveTokens.color.orange[500],
      accentActive: primitiveTokens.color.orange[700],
    },

    // States (feedback colors)
    state: {
      focus: primitiveTokens.color.orange[400],     // Warm focus ring
      focusRing: primitiveTokens.color.orange[400],
      error: primitiveTokens.color.red[500],
      errorBg: primitiveTokens.color.red[100],
      success: primitiveTokens.color.green[500],
      successBg: primitiveTokens.color.green[100],
      warning: primitiveTokens.color.yellow[500],
      warningBg: primitiveTokens.color.yellow[100],
    },

    // Canvas / Editor specific (semantic names)
    canvas: {
      grid: primitiveTokens.color.canvas.gridLight,
      bitOutline: primitiveTokens.color.canvas.bitOutlineLight,
      sceneBackground: primitiveTokens.color.canvas.sceneBgLight,
      symmetryAxis: primitiveTokens.color.canvas.symmetryAxis,
    },

    // Path editor semantic colors
    path: {
      command: {
        bg: primitiveTokens.color.path.commandBg,
        hover: primitiveTokens.color.path.commandHover,
      },
      modCommand: {
        bg: primitiveTokens.color.path.modCommandBg,
        hover: primitiveTokens.color.path.modCommandHover,
      },
      param: {
        bg: primitiveTokens.color.path.paramBg,
        hover: primitiveTokens.color.path.paramHover,
      },
      delete: primitiveTokens.color.path.deleteColor,
    },
  },

  // Spacing semantics
  spacing: {
    component: {
      paddingSm: primitiveTokens.space.xs,
      paddingMd: primitiveTokens.space.sm,
      paddingLg: primitiveTokens.space.md,
      gapSm: primitiveTokens.space.xs,
      gapMd: primitiveTokens.space.sm,
      gapLg: primitiveTokens.space.md,
    },
    layout: {
      panelPadding: primitiveTokens.space.md,
      sectionGap: primitiveTokens.space.lg,
      headerPadding: `${primitiveTokens.space.sm} ${primitiveTokens.space.lg}`,
    },
  },

  // Typography semantics
  typography: {
    body: {
      size: primitiveTokens.font.size.base,
      lineHeight: primitiveTokens.font.lineHeight.normal,
      weight: primitiveTokens.font.weight.normal,
    },
    heading: {
      size: primitiveTokens.font.size['3xl'],
      lineHeight: primitiveTokens.font.lineHeight.tight,
      weight: primitiveTokens.font.weight.semibold,
    },
    label: {
      size: primitiveTokens.font.size.sm,
      weight: primitiveTokens.font.weight.medium,
    },
    caption: {
      size: primitiveTokens.font.size.xs,
      weight: primitiveTokens.font.weight.normal,
    },
  },

  // Shadow semantics
  shadow: {
    card: primitiveTokens.shadow.md,
    dropdown: primitiveTokens.shadow.lg,
    modal: primitiveTokens.shadow.xl,
    tooltip: primitiveTokens.shadow['2xl'],
  },

  // Radius semantics
  radius: {
    none: primitiveTokens.radius.none,
    sm: primitiveTokens.radius.sm,
    md: primitiveTokens.radius.md,
    lg: primitiveTokens.radius.lg,       // 20px — button radius
    xl: primitiveTokens.radius.xl,       // 40px — hero/section
    pill: primitiveTokens.radius.pill,   // 999px — full pill
    full: primitiveTokens.radius.full,   // 50% — circle
  },
};

// ============================================================================
// BREAKPOINT TOKENS
// ============================================================================

export const breakpointTokens = {
  xs: '320px',
  sm: '480px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const mediaQueries = {
  xs: `(min-width: ${breakpointTokens.xs})`,
  sm: `(min-width: ${breakpointTokens.sm})`,
  md: `(min-width: ${breakpointTokens.md})`,
  lg: `(min-width: ${breakpointTokens.lg})`,
  xl: `(min-width: ${breakpointTokens.xl})`,
  '2xl': `(min-width: ${breakpointTokens['2xl']})`,
};

// ============================================================================
// EXPORT
// ============================================================================

export const tokens = {
  primitive: primitiveTokens,
  semantic: semanticTokens,
  breakpoints: breakpointTokens,
  mediaQueries,
};

export default tokens;
