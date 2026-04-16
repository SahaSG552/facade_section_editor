/**
 * Canonical breakpoint definitions — single source of truth.
 *
 * CSS @media queries cannot use var(), so breakpoint values must be
 * hardcoded in CSS. Keep them in sync by adding comments in CSS like:
 *   Breakpoints: SM=640px, MD=768px, LG=1024px, XL=1280px, 2XL=1536px
 *   Keep in sync with src/ui/breakpoints.js
 *
 * These values match Tailwind CSS v4 default breakpoints.
 *
 * @module breakpoints
 */

/**
 * Breakpoint values in pixels.
 * Names match Tailwind responsive prefixes (sm:, md:, lg:, xl:, 2xl:).
 * @type {Readonly<Record<string, number>>}
 */
export const BREAKPOINTS = Object.freeze({
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
});

/**
 * Pre-built matchMedia queries for common breakpoints.
 * Use these instead of window.innerWidth comparisons for consistency
 * and to avoid layout thrashing.
 *
 * Usage:
 *   import { MEDIA_QUERIES } from './breakpoints.js';
 *   if (MEDIA_QUERIES.MD.matches) { // viewport >= 768px }
 *   MEDIA_QUERIES.MD.addEventListener('change', (e) => { ... });
 *
 * @type {Readonly<Record<string, MediaQueryList>>}
 */
export const MEDIA_QUERIES = Object.freeze({
    /** Viewport width >= 640px */
    SM: window.matchMedia(`(min-width: ${BREAKPOINTS.SM}px)`),
    /** Viewport width >= 768px */
    MD: window.matchMedia(`(min-width: ${BREAKPOINTS.MD}px)`),
    /** Viewport width >= 1024px */
    LG: window.matchMedia(`(min-width: ${BREAKPOINTS.LG}px)`),
    /** Viewport width >= 1280px */
    XL: window.matchMedia(`(min-width: ${BREAKPOINTS.XL}px)`),
    /** Viewport width >= 1536px */
    '2XL': window.matchMedia(`(min-width: ${BREAKPOINTS['2XL']}px)`),
});
