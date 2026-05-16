/**
 * Standalone CJS script to generate CSS from design tokens
 * Run: node tools/gen-css.cjs > output.css
 */

const fs = require('fs');
const path = require('path');

// ===== INLINE TOKENS (from tokens.js) =====
// Warm palette: Canvas Cream #F3F0EE, Ink Black #141413, Signal Orange #CF4500

const primitiveTokens = {
  color: {
    gray: {
      50: '30 6% 94%',
      100: '30 4% 96%',
      200: '30 5% 98%',
      300: '30 5% 90%',
      400: '36 10% 80%',
      500: '30 5% 65%',
      600: '30 2% 41%',
      700: '30 3% 25%',
      800: '240 1% 15%',
      900: '30 3% 8%',
      950: '30 3% 4%',
    },
    orange: {
      50: '20 80% 96%',
      100: '20 75% 90%',
      200: '20 70% 80%',
      300: '18 75% 70%',
      400: '18 89% 59%',
      500: '20 90% 50%',
      600: '20 100% 40%',
      700: '20 88% 32%',
      800: '20 85% 25%',
      900: '20 80% 18%',
    },
    red: {
      50: '10 85% 97%',
      100: '10 80% 91%',
      200: '10 75% 84%',
      300: '10 70% 70%',
      400: '10 75% 60%',
      500: '10 80% 55%',
      600: '10 85% 48%',
      700: '10 90% 42%',
      800: '10 85% 36%',
      900: '10 70% 30%',
    },
    green: {
      50: '120 30% 96%',
      100: '120 28% 88%',
      200: '120 25% 78%',
      300: '120 22% 65%',
      400: '120 28% 50%',
      500: '120 30% 45%',
      600: '120 32% 38%',
      700: '120 35% 32%',
      800: '120 30% 26%',
      900: '120 25% 20%',
    },
    yellow: {
      50: '40 100% 96%',
      100: '40 100% 88%',
      200: '40 95% 78%',
      300: '38 90% 65%',
      400: '38 90% 55%',
      500: '36 95% 50%',
      600: '34 90% 45%',
      700: '32 85% 38%',
      800: '30 80% 32%',
      900: '28 70% 26%',
    },
    blue: {
      50: '223 50% 96%',
      100: '223 48% 88%',
      200: '223 45% 78%',
      300: '223 50% 68%',
      400: '223 52% 58%',
      500: '223 54% 48%',
      600: '223 50% 42%',
      700: '223 48% 36%',
      800: '223 45% 30%',
      900: '223 40% 24%',
    },
    canvas: {
      gridLight: '30 5% 70%',
      gridDark: '30 5% 35%',
      bitOutlineLight: '30 3% 8%',
      bitOutlineDark: '30 4% 85%',
      sceneBgLight: '30 4% 96%',
      sceneBgDark: '30 3% 10%',
      symmetryAxis: '18 89% 59%',
    },
    path: {
      commandBg: '10 75% 55%',
      commandHover: '10 70% 60%',
      modCommandBg: '38 90% 50%',
      modCommandHover: '36 85% 55%',
      paramBg: '120 28% 50%',
      paramHover: '120 25% 55%',
      deleteColor: '32 85% 38%',
    },
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
    '5xl': '128px',
  },
  font: {
    family: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    size: {
      xs: '10px',
      sm: '11px',
      base: '12px',
      lg: '13px',
      xl: '14px',
      '2xl': '16px',
      '3xl': '18px',
      '4xl': '24px',
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
  radius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '20px',
    xl: '40px',
    pill: '999px',
    full: '50%',
  },
  shadow: {
    none: 'none',
    sm: '0 1px 3px rgba(0, 0, 0, 0.06)',
    md: '0 4px 12px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 30px rgba(0, 0, 0, 0.08)',
    xl: '0 24px 48px rgba(0, 0, 0, 0.08)',
    '2xl': '0 70px 110px rgba(0, 0, 0, 0.25)',
  },
  opacity: {
    disabled: 0.5,
    overlay: 0.5,
    hover: 0.06,
    active: 0.10,
    selected: 0.14,
    subtle: 0.04,
  },
};

const semanticTokens = {
  color: {
    bg: {
      default: primitiveTokens.color.gray[50],
      surface: primitiveTokens.color.gray[100],
      elevated: primitiveTokens.color.gray[200],
      inverse: primitiveTokens.color.gray[900],
    },
    text: {
      primary: primitiveTokens.color.gray[900],
      secondary: primitiveTokens.color.gray[700],
      muted: primitiveTokens.color.gray[600],
      inverse: primitiveTokens.color.gray[50],
      onAction: primitiveTokens.color.gray[200],
      link: primitiveTokens.color.blue[500],
    },
    border: {
      default: primitiveTokens.color.gray[400],
      emphasis: primitiveTokens.color.gray[300],
      inverse: primitiveTokens.color.gray[600],
    },
    action: {
      primary: primitiveTokens.color.gray[900],
      primaryHover: primitiveTokens.color.gray[800],
      primaryActive: primitiveTokens.color.gray[950],
      secondary: 'transparent',
      secondaryBorder: primitiveTokens.color.gray[400],
      secondaryHover: primitiveTokens.color.gray[100],
      ghost: 'transparent',
      ghostHover: primitiveTokens.color.gray[100],
      accent: primitiveTokens.color.orange[600],
      accentHover: primitiveTokens.color.orange[500],
      accentActive: primitiveTokens.color.orange[700],
    },
    state: {
      focus: primitiveTokens.color.orange[400],
      focusRing: primitiveTokens.color.orange[400],
      error: primitiveTokens.color.red[500],
      errorBg: primitiveTokens.color.red[100],
      success: primitiveTokens.color.green[500],
      successBg: primitiveTokens.color.green[100],
      warning: primitiveTokens.color.yellow[500],
      warningBg: primitiveTokens.color.yellow[100],
    },
    canvas: {
      grid: primitiveTokens.color.canvas.gridLight,
      bitOutline: primitiveTokens.color.canvas.bitOutlineLight,
      sceneBackground: primitiveTokens.color.canvas.sceneBgLight,
      symmetryAxis: primitiveTokens.color.canvas.symmetryAxis,
    },
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
      headerPadding: primitiveTokens.space.sm + ' ' + primitiveTokens.space.lg,
    },
  },
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
  shadow: {
    card: primitiveTokens.shadow.md,
    dropdown: primitiveTokens.shadow.lg,
    modal: primitiveTokens.shadow.xl,
    tooltip: primitiveTokens.shadow['2xl'],
  },
  radius: {
    none: primitiveTokens.radius.none,
    sm: primitiveTokens.radius.sm,
    md: primitiveTokens.radius.md,
    lg: primitiveTokens.radius.lg,
    xl: primitiveTokens.radius.xl,
    pill: primitiveTokens.radius.pill,
    full: primitiveTokens.radius.full,
  },
};

const breakpointTokens = {
  xs: '320px',
  sm: '480px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

const darkThemeOverrides = {
  'color-bg-default': primitiveTokens.color.gray[950],
  'color-bg-surface': primitiveTokens.color.gray[900],
  'color-bg-elevated': primitiveTokens.color.gray[800],
  'color-bg-inverse': primitiveTokens.color.gray[50],
  'color-text-primary': primitiveTokens.color.gray[50],
  'color-text-secondary': primitiveTokens.color.gray[300],
  'color-text-muted': primitiveTokens.color.gray[500],
  'color-text-inverse': primitiveTokens.color.gray[900],
  'color-text-onAction': primitiveTokens.color.gray[900],
  'color-border-default': primitiveTokens.color.gray[700],
  'color-border-emphasis': primitiveTokens.color.gray[600],
  'color-border-inverse': primitiveTokens.color.gray[300],
  'color-action-primary': primitiveTokens.color.gray[50],
  'color-action-primaryHover': primitiveTokens.color.gray[200],
  'color-action-primaryActive': primitiveTokens.color.gray[300],
  'color-action-secondaryHover': primitiveTokens.color.gray[800],
  'color-action-ghostHover': primitiveTokens.color.gray[800],
  'color-action-accent': primitiveTokens.color.orange[400],
  'color-action-accentHover': primitiveTokens.color.orange[300],
  'color-action-accentActive': primitiveTokens.color.orange[500],
  'color-canvas-grid': primitiveTokens.color.canvas.gridDark,
  'color-canvas-bitOutline': primitiveTokens.color.canvas.bitOutlineDark,
  'color-canvas-sceneBackground': primitiveTokens.color.canvas.sceneBgDark,
  'color-path-command-bg': primitiveTokens.color.red[400],
  'color-path-command-hover': primitiveTokens.color.red[300],
  'color-path-modCommand-bg': primitiveTokens.color.yellow[400],
  'color-path-modCommand-hover': primitiveTokens.color.yellow[300],
  'color-path-param-bg': primitiveTokens.color.green[400],
  'color-path-param-hover': primitiveTokens.color.green[300],
};

function flattenTokens(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const varName = prefix ? `${prefix}-${key}` : key;
    if (typeof value === 'object' && value !== null) {
      flattenTokens(value, varName, result);
    } else {
      result[varName] = value;
    }
  }
  return result;
}

function generateThemeCSS(theme) {
  const lines = [];
  const selector = theme === 'dark' ? '[data-theme="dark"]' : ':root';
  lines.push(`${selector} {`);

  const flatColors = flattenTokens(primitiveTokens.color, 'color');
  const flatSpaces = flattenTokens(primitiveTokens.space, 'space');
  const flatFonts = flattenTokens(primitiveTokens.font, 'font');
  const flatRadius = flattenTokens(primitiveTokens.radius, 'radius');
  const flatShadows = flattenTokens(primitiveTokens.shadow, 'shadow');
  const flatOpacity = flattenTokens(primitiveTokens.opacity, 'opacity');

  for (const [key, value] of Object.entries(flatColors)) lines.push(`  --${key}: ${value};`);
  for (const [key, value] of Object.entries(flatSpaces)) lines.push(`  --${key}: ${value};`);
  for (const [key, value] of Object.entries(flatFonts)) lines.push(`  --${key}: ${value};`);
  for (const [key, value] of Object.entries(flatRadius)) lines.push(`  --${key}: ${value};`);
  for (const [key, value] of Object.entries(flatShadows)) lines.push(`  --${key}: ${value};`);
  for (const [key, value] of Object.entries(flatOpacity)) lines.push(`  --${key}: ${value};`);

  const flatSemColors = flattenTokens(semanticTokens.color, 'color');
  for (const [key, value] of Object.entries(flatSemColors)) {
    lines.push(`  --${key}: ${value};`);
  }

  if (theme === 'dark') {
    for (const [key, value] of Object.entries(darkThemeOverrides)) {
      lines.push(`  --${key}: ${value};`);
    }
  }

  const flatSemSpacing = flattenTokens(semanticTokens.spacing, 'spacing');
  for (const [key, value] of Object.entries(flatSemSpacing)) lines.push(`  --${key}: ${value};`);

  const flatSemTypo = flattenTokens(semanticTokens.typography, 'typography');
  for (const [key, value] of Object.entries(flatSemTypo)) lines.push(`  --${key}: ${value};`);

  const flatSemShadows = flattenTokens(semanticTokens.shadow, 'shadow-semantic');
  for (const [key, value] of Object.entries(flatSemShadows)) lines.push(`  --${key}: ${value};`);

  const flatSemRadius = flattenTokens(semanticTokens.radius, 'radius-semantic');
  for (const [key, value] of Object.entries(flatSemRadius)) lines.push(`  --${key}: ${value};`);

  lines.push('}');
  return lines.join('\n');
}

const breakCSS = `/* Breakpoint definitions for reference */
:root {
${Object.entries(breakpointTokens).map(([k, v]) => `  --breakpoint-${k}: ${v};`).join('\n')}
}`;

console.log(breakCSS + '\n\n' + generateThemeCSS('light') + '\n\n' + generateThemeCSS('dark'));
