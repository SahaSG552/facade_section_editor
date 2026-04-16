import * as THREE from "three";
import LoggerFactory from "../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("ThemeUtils");

/**
 * Get CSS custom property value from document root
 * @param {string} name - CSS variable name (with or without --)
 * @param {string} [fallback] - Fallback value if variable not found
 * @returns {string} CSS variable value or fallback
 */
export function getCssVar(name, fallback = "") {
  const varName = name.startsWith("--") ? name : `--${name}`;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value || fallback;
}

/**
 * Convert CSS custom property hex color to THREE.Color
 * @param {string} name - CSS variable name (with or without --)
 * @param {string} [fallback] - Fallback hex color if variable not found
 * @returns {THREE.Color} THREE.Color instance
 */
export function cssVarToThreeColor(name, fallback = "#ffffff") {
  const hexColor = getCssVar(name, fallback);
  try {
    return new THREE.Color(hexColor);
  } catch (err) {
    log.warn(`Invalid color value for ${name}: ${hexColor}, using fallback`, err);
    return new THREE.Color(fallback);
  }
}

/**
 * Watch for theme changes and call callback when theme updates
 * Listens for data-theme attribute changes on document root
 * @param {Function} callback - Function to call on theme change, receives new theme name
 * @returns {Function} Unsubscribe function to remove listener
 */
export function watchTheme(callback) {
  // Create MutationObserver to watch for data-theme attribute changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "data-theme") {
        const newTheme = document.documentElement.getAttribute("data-theme") || "light";
        callback(newTheme);
      }
    });
  });

  // Start observing the root element for attribute changes
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // Return unsubscribe function
  return () => {
    observer.disconnect();
  };
}
