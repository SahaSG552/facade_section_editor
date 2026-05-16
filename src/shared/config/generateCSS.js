/**
 * CSS Generation from Design Tokens
 *
 * Converts design tokens into CSS custom properties (variables)
 * Supports light and dark theme variants
 *
 * @module generateCSS
 */

import { primitiveTokens, semanticTokens, breakpointTokens } from './tokens.js';

/**
 * Dark theme color overrides
 * Maps semantic colors to darker/lighter variants for dark mode
 */
const darkThemeOverrides = {
  // Backgrounds (inverted — warm dark)
  'color-bg-default': primitiveTokens.color.gray[950],
  'color-bg-surface': primitiveTokens.color.gray[900],
  'color-bg-elevated': primitiveTokens.color.gray[800],
  'color-bg-inverse': primitiveTokens.color.gray[50],

  // Text (inverted)
  'color-text-primary': primitiveTokens.color.gray[50],
  'color-text-secondary': primitiveTokens.color.gray[300],
  'color-text-muted': primitiveTokens.color.gray[500],
  'color-text-inverse': primitiveTokens.color.gray[900],
  'color-text-onAction': primitiveTokens.color.gray[900],

  // Borders (inverted)
  'color-border-default': primitiveTokens.color.gray[700],
  'color-border-emphasis': primitiveTokens.color.gray[600],
  'color-border-inverse': primitiveTokens.color.gray[300],

  // Actions (same primary, adjusted secondary)
  'color-action-primary': primitiveTokens.color.gray[50],
  'color-action-primaryHover': primitiveTokens.color.gray[200],
  'color-action-primaryActive': primitiveTokens.color.gray[300],
  'color-action-secondaryHover': primitiveTokens.color.gray[800],
  'color-action-ghostHover': primitiveTokens.color.gray[800],
  'color-action-accent': primitiveTokens.color.orange[400],
  'color-action-accentHover': primitiveTokens.color.orange[300],
  'color-action-accentActive': primitiveTokens.color.orange[500],

  // Canvas colors (dark theme variants)
  'color-canvas-grid': primitiveTokens.color.canvas.gridDark,
  'color-canvas-bitOutline': primitiveTokens.color.canvas.bitOutlineDark,
  'color-canvas-sceneBackground': primitiveTokens.color.canvas.sceneBgDark,

  // Path editor colors (adjusted for dark theme)
  'color-path-command-bg': primitiveTokens.color.red[400],
  'color-path-command-hover': primitiveTokens.color.red[300],
  'color-path-modCommand-bg': primitiveTokens.color.yellow[400],
  'color-path-modCommand-hover': primitiveTokens.color.yellow[300],
  'color-path-param-bg': primitiveTokens.color.green[400],
  'color-path-param-hover': primitiveTokens.color.green[300],
};

/**
 * Flatten nested token objects into CSS variable names
 *
 * @param {Object} obj — Token object to flatten
 * @param {string} prefix — CSS variable prefix (e.g., 'color')
 * @param {Object} result — Accumulator for flattened tokens
 * @returns {Object} Flattened token object
 */
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

/**
 * Generate CSS custom properties from tokens
 *
 * @param {string} theme — Theme variant: 'light' or 'dark'
 * @returns {string} CSS string with all custom properties
 */
export function generateThemeCSS(theme = 'light') {
  const cssLines = [];

  // Root selector for light theme, [data-theme="dark"] for dark mode
  const selector = theme === 'dark' ? '[data-theme="dark"]' : ':root';
  cssLines.push(`${selector} {`);

  // FIXED: flatten from primitiveTokens.color (not primitiveTokens) to avoid double prefix
  const flatColors = flattenTokens(primitiveTokens.color, 'color');
  const flatSpaces = flattenTokens(primitiveTokens.space, 'space');
  const flatFonts = flattenTokens(primitiveTokens.font, 'font');
  const flatRadius = flattenTokens(primitiveTokens.radius, 'radius');
  const flatShadows = flattenTokens(primitiveTokens.shadow, 'shadow');
  const flatOpacity = flattenTokens(primitiveTokens.opacity, 'opacity');

  // Add primitive color tokens
  for (const [key, value] of Object.entries(flatColors)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add spacing tokens
  for (const [key, value] of Object.entries(flatSpaces)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add font tokens
  for (const [key, value] of Object.entries(flatFonts)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add radius tokens
  for (const [key, value] of Object.entries(flatRadius)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add shadow tokens
  for (const [key, value] of Object.entries(flatShadows)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add opacity tokens
  for (const [key, value] of Object.entries(flatOpacity)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add semantic color tokens
  const flatSemanticColors = flattenTokens(semanticTokens.color, 'color');
  for (const [key, value] of Object.entries(flatSemanticColors)) {
    const cssValue = theme === 'dark' && darkThemeOverrides[key]
      ? darkThemeOverrides[key]
      : value;
    cssLines.push(`  --${key}: ${value};`);
  }

  // Apply dark overrides AFTER semantic defaults so they take precedence
  if (theme === 'dark') {
    for (const [key, value] of Object.entries(darkThemeOverrides)) {
      cssLines.push(`  --${key}: ${value};`);
    }
  }

  // Add semantic spacing tokens
  const flatSemanticSpacing = flattenTokens(semanticTokens.spacing, 'spacing');
  for (const [key, value] of Object.entries(flatSemanticSpacing)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add semantic typography tokens
  const flatSemanticTypography = flattenTokens(semanticTokens.typography, 'typography');
  for (const [key, value] of Object.entries(flatSemanticTypography)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add semantic shadow tokens
  const flatSemanticShadows = flattenTokens(semanticTokens.shadow, 'shadow-semantic');
  for (const [key, value] of Object.entries(flatSemanticShadows)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  // Add semantic radius tokens
  const flatSemanticRadius = flattenTokens(semanticTokens.radius, 'radius-semantic');
  for (const [key, value] of Object.entries(flatSemanticRadius)) {
    cssLines.push(`  --${key}: ${value};`);
  }

  cssLines.push('}');

  return cssLines.join('\n');
}

/**
 * Generate media query CSS for breakpoints
 *
 * @returns {string} CSS string with media query definitions
 */
export function generateBreakpointCSS() {
  const cssLines = [];

  cssLines.push('/* Breakpoint definitions for reference */');
  cssLines.push(':root {');

  for (const [key, value] of Object.entries(breakpointTokens)) {
    cssLines.push(`  --breakpoint-${key}: ${value};`);
  }

  cssLines.push('}');

  return cssLines.join('\n');
}

/**
 * Generate complete theme CSS (light + dark)
 *
 * @returns {string} Complete CSS with both light and dark themes
 */
export function generateCompleteThemeCSS() {
  const lightCSS = generateThemeCSS('light');
  const darkCSS = generateThemeCSS('dark');
  const breakpointCSS = generateBreakpointCSS();

  return `${breakpointCSS}\n\n${lightCSS}\n\n${darkCSS}`;
}

/**
 * Generate CSS variable reference documentation
 *
 * @returns {string} Markdown documentation of all available tokens
 */
export function generateTokenDocumentation() {
  const lines = [];

  lines.push('# Design Token Reference\n');
  lines.push('## DESIGN.md — Warm Editorial Palette\n');

  lines.push('### Colors\n');
  lines.push('```css');
  const flatColors = flattenTokens(primitiveTokens.color, 'color');
  for (const [key, value] of Object.entries(flatColors)) {
    lines.push(`--${key}: ${value};`);
  }
  lines.push('```\n');

  lines.push('### Spacing\n');
  lines.push('```css');
  const flatSpaces = flattenTokens(primitiveTokens.space, 'space');
  for (const [key, value] of Object.entries(flatSpaces)) {
    lines.push(`--${key}: ${value};`);
  }
  lines.push('```\n');

  lines.push('### Typography\n');
  lines.push('```css');
  const flatFonts = flattenTokens(primitiveTokens.font, 'font');
  for (const [key, value] of Object.entries(flatFonts)) {
    lines.push(`--${key}: ${value};`);
  }
  lines.push('```\n');

  lines.push('### Shadows\n');
  lines.push('```css');
  const flatShadows = flattenTokens(primitiveTokens.shadow, 'shadow');
  for (const [key, value] of Object.entries(flatShadows)) {
    lines.push(`--${key}: ${value};`);
  }
  lines.push('```\n');

  lines.push('### Semantic Colors\n');
  lines.push('```css');
  const flatSemanticColors = flattenTokens(semanticTokens.color, 'color');
  for (const [key, value] of Object.entries(flatSemanticColors)) {
    lines.push(`--${key}: ${value};`);
  }
  lines.push('```\n');

  return lines.join('\n');
}

export default {
  generateThemeCSS,
  generateBreakpointCSS,
  generateCompleteThemeCSS,
  generateTokenDocumentation,
};
