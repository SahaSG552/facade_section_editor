// Design Tokens for Facade Section Editor
// Based on Gravity UI patterns and svg.framerlists.com visual language
// Single source of truth for all design values

// ============================================================================
// PRIMITIVE TOKENS - Raw values (foundation layer)
// These are never used directly in components
// ============================================================================

export const primitiveTokens = {
  // ----------------------------------------------------------------------------
  // Colors (HSL format for easy theme manipulation)
  // Inspired by svg.framerlists.com: clean blues, neutral grays
  // ----------------------------------------------------------------------------
  color: {
    // Blue palette (primary brand color)
    blue: {
      50: '210 40% 98%',
      100: '210 40% 90%',
      200: '211 35% 80%',
      300: '212 30% 65%',
      400: '212 35% 55%',
      500: '212 100% 50%',   // Primary brand blue
      600: '212 100% 45%',
      700: '212 100% 40%',
      800: '212 100% 35%',
      900: '210 60% 15%',
    },
    
    // Gray palette (neutral foundation)
    gray: {
      50: '0 0% 98%',        // Page background (light)
      100: '0 0% 96%',       // Card/surface backgrounds
      200: '0 0% 90%',       // Borders
      300: '0 0% 80%',
      400: '0 0% 65%',
      500: '0 0% 50%',       // Muted text
      600: '0 0% 45%',
      700: '0 0% 35%',
      800: '0 0% 15%',       // Dark surface
      900: '0 0% 9%',        // Dark background
      950: '0 0% 5%',
    },
    
    // Red palette (error states)
    red: {
      50: '0 85% 98%',
      100: '0 80% 92%',
      200: '0 75% 85%',
      300: '0 70% 70%',
      400: '0 75% 60%',
      500: '0 80% 55%',      // Error color
      600: '0 85% 50%',
      700: '0 90% 45%',
      800: '0 85% 40%',
      900: '0 70% 35%',
    },
    
    // Green palette (success states)
    green: {
      50: '140 60% 96%',
      100: '140 55% 88%',
      200: '140 50% 78%',
      300: '140 45% 65%',
      400: '140 50% 50%',
      500: '140 55% 45%',    // Success color
      600: '140 60% 40%',
      700: '140 65% 35%',
      800: '140 60% 30%',
      900: '140 50% 25%',
    },
    
    // Yellow/Amber palette (warning states)
    yellow: {
      50: '45 100% 96%',
      100: '45 100% 88%',
      200: '45 95% 78%',
      300: '45 90% 65%',
      400: '45 90% 55%',
      500: '40 95% 50%',     // Warning color
      600: '38 90% 45%',
      700: '35 85% 40%',
      800: '32 80% 35%',
      900: '30 70% 30%',
    },
    
    // Canvas-specific colors (editor elements)
    canvas: {
      gridLight: '0 0% 0%',      // Grid lines (light theme)
      gridDark: '0 0% 40%',      // Grid lines (dark theme)
      bitOutlineLight: '0 0% 0%',    // Bit outlines (light)
      bitOutlineDark: '0 0% 88%',    // Bit outlines (dark)
      sceneBgLight: '0 0% 96%',      // 3D scene background (light)
      sceneBgDark: '0 0% 10%',       // 3D scene background (dark)
      symmetryAxis: '212 60% 45%',   // Symmetry axis line
    },
    
    // Path editor colors
    path: {
      commandBg: '0 75% 55%',        // Command cell background (red)
      commandHover: '0 70% 60%',
      modCommandBg: '40 90% 50%',    // Mod command background (amber)
      modCommandHover: '38 85% 55%',
      paramBg: '170 50% 55%',        // Parameter cell background (teal)
      paramHover: '168 45% 60%',
      deleteColor: '35 85% 40%',     // Delete action (dark amber)
    },
  },
  
  // ----------------------------------------------------------------------------
  // Spacing (4px module base - Gravity UI pattern)
  // ----------------------------------------------------------------------------
  space: {
    xs: '4px',    // 1 unit - tight spacing
    sm: '8px',    // 2 units - default small spacing
    md: '16px',   // 4 units - default medium spacing
    lg: '24px',   // 6 units - default large spacing
    xl: '32px',   // 8 units - section spacing
    '2xl': '48px', // 12 units - layout spacing
    '3xl': '64px', // 16 units - page margins
  },
  
  // ----------------------------------------------------------------------------
  // Typography scale
  // ----------------------------------------------------------------------------
  font: {
    family: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    size: {
      xs: '10px',    // Tiny labels, captions
      sm: '11px',    // Small UI text
      base: '12px',  // Default body text (CAD apps use smaller text)
      lg: '13px',    // Large body / small headings
      xl: '14px',    // Default headings
      '2xl': '16px', // Medium headings
      '3xl': '18px', // Large headings (header title)
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,    // Headings
      normal: 1.5,   // Body text
      relaxed: 1.75, // Loose text
    },
  },
  
  // ----------------------------------------------------------------------------
  // Border radius
  // ----------------------------------------------------------------------------
  radius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',   // Current --radius (svg.framerlists.com style)
    xl: '16px',
    full: '9999px',
  },
  
  // ----------------------------------------------------------------------------
  // Shadows (svg.framerlists.com style - soft, subtle elevation)
  // ----------------------------------------------------------------------------
  shadow: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',         // Subtle lift
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',          // Header shadow
    md: '0 2px 10px rgba(0, 0, 0, 0.15)',        // Card/panel shadow
    lg: '0 4px 20px rgba(0, 0, 0, 0.2)',         // Modal/dropdown shadow
    xl: '0 10px 40px rgba(0, 0, 0, 0.25)',       // Overlay shadow
  },
  
  // ----------------------------------------------------------------------------
  // Opacity scale (for transparency states)
  // ----------------------------------------------------------------------------
  opacity: {
    disabled: 0.5,
    overlay: 0.5,
    hover: 0.08,
    active: 0.12,
    selected: 0.16,
    subtle: 0.04,
  },
};

// ============================================================================
// SEMANTIC TOKENS - Intent-based (component layer)
// These reference primitive tokens and are used in actual components
// ============================================================================

export const semanticTokens = {
  color: {
    // Backgrounds
    bg: {
      default: primitiveTokens.color.gray[50],       // Main page background
      surface: primitiveTokens.color.gray[100],      // Cards, panels, surfaces
      elevated: primitiveTokens.color.gray[200],     // Dropdowns, modals, overlays
      inverse: primitiveTokens.color.gray[900],      // Inverted backgrounds (dark mode)
    },
    
    // Text colors
    text: {
      primary: primitiveTokens.color.gray[900],      // Primary body text
      secondary: primitiveTokens.color.gray[600],    // Secondary text (labels)
      muted: primitiveTokens.color.gray[500],        // Muted/disabled text
      inverse: primitiveTokens.color.gray[50],       // Text on dark backgrounds
      onAction: primitiveTokens.color.gray[50],      // Text on action buttons
    },
    
    // Borders
    border: {
      default: primitiveTokens.color.gray[200],      // Default borders
      emphasis: primitiveTokens.color.gray[300],     // Emphasized borders
      inverse: primitiveTokens.color.gray[600],      // Inverted borders (dark mode)
    },
    
    // Actions (primary interactive elements)
    action: {
      primary: primitiveTokens.color.blue[500],
      primaryHover: primitiveTokens.color.blue[600],
      primaryActive: primitiveTokens.color.blue[700],
      secondary: 'transparent',
      secondaryBorder: primitiveTokens.color.gray[300],
      secondaryHover: primitiveTokens.color.gray[100],
      ghost: 'transparent',
      ghostHover: primitiveTokens.color.gray[100],
    },
    
    // States (feedback colors)
    state: {
      focus: primitiveTokens.color.blue[500],        // Focus ring
      focusRing: primitiveTokens.color.blue[500],
      error: primitiveTokens.color.red[500],
      errorBg: primitiveTokens.color.red[100],
      success: primitiveTokens.color.green[500],
      successBg: primitiveTokens.color.green[100],
      warning: primitiveTokens.color.yellow[500],
      warningBg: primitiveTokens.color.yellow[100],
    },
    
    // Canvas/Editor specific (semantic names)
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
  
  // Spacing semantics (component-level spacing)
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
      size: primitiveTokens.font['size']['3xl'],
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
    card: primitiveTokens.shadow.sm,
    dropdown: primitiveTokens.shadow.md,
    modal: primitiveTokens.shadow.lg,
    tooltip: primitiveTokens.shadow.xl,
  },
  
  // Radius semantics
  radius: {
    sm: primitiveTokens.radius.sm,
    md: primitiveTokens.radius.md,
    lg: primitiveTokens.radius.lg,
    full: primitiveTokens.radius.full,
  },
};

// ============================================================================
// BREAKPOINT TOKENS (responsive design)
// ============================================================================

export const breakpointTokens = {
  xs: '320px',    // Small phones
  sm: '480px',    // Regular phones
  md: '768px',    // Tablets
  lg: '1024px',   // Small laptops
  xl: '1280px',   // Desktops
  '2xl': '1536px', // Large desktops
};

// Media query helpers
export const mediaQueries = {
  xs: `(min-width: ${breakpointTokens.xs})`,
  sm: `(min-width: ${breakpointTokens.sm})`,
  md: `(min-width: ${breakpointTokens.md})`,
  lg: `(min-width: ${breakpointTokens.lg})`,
  xl: `(min-width: ${breakpointTokens.xl})`,
  '2xl': `(min-width: ${breakpointTokens['2xl']})`,
};

// ============================================================================
// EXPORT ALL TOKENS
// ============================================================================

export const tokens = {
  primitive: primitiveTokens,
  semantic: semanticTokens,
  breakpoints: breakpointTokens,
  mediaQueries,
};

export default tokens;
