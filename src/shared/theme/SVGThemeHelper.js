/**
 * SVG Theme Helper — Resolve CSS variables for SVG element styling
 * 
 * CSS custom properties don't work in SVG inline styles, so we need to
 * compute them from root and apply the actual color value.
 */

class SVGThemeHelper {
  /**
   * Get the computed value of a CSS variable
   * @param {string} varName - CSS variable name (e.g., '--color-bg-surface')
   * @returns {string} - The resolved HSL value (e.g., '30 4% 96%')
   */
  static getCSSVariable(varName) {
    const computed = window.getComputedStyle(document.documentElement);
    return computed.getPropertyValue(varName)?.trim() || '';
  }

  /**
   * Convert HSL variable format to hsl() color string
   * @param {string} hslValue - HSL value (e.g., '30 4% 96%')
   * @returns {string} - Valid CSS color (e.g., 'hsl(30 4% 96%)')
   */
  static hslToColorString(hslValue) {
    if (!hslValue) return 'transparent';
    return `hsl(${hslValue})`;
  }

  /**
   * Set SVG element fill color using CSS variable
   * @param {SVGElement} element - SVG element to style
   * @param {string} varName - CSS variable name
   */
  static setFillFromVariable(element, varName) {
    const varValue = this.getCSSVariable(varName);
    if (varValue) {
      element.style.fill = this.hslToColorString(varValue);
    }
  }

  /**
   * Set SVG element stroke color using CSS variable
   * @param {SVGElement} element - SVG element to style
   * @param {string} varName - CSS variable name
   */
  static setStrokeFromVariable(element, varName) {
    const varValue = this.getCSSVariable(varName);
    if (varValue) {
      element.style.stroke = this.hslToColorString(varValue);
    }
  }

  /**
   * Set both fill and stroke from CSS variables
   * @param {SVGElement} element - SVG element to style
   * @param {string} fillVar - CSS variable name for fill
   * @param {string} strokeVar - CSS variable name for stroke
   */
  static setThemeColors(element, fillVar, strokeVar) {
    this.setFillFromVariable(element, fillVar);
    this.setStrokeFromVariable(element, strokeVar);
  }

  /**
   * Update SVG element colors when theme changes
   * Listen to 'themechange' event to update colors
   * @param {SVGElement} element - SVG element to update
   * @param {string} fillVar - CSS variable name for fill
   * @param {string} strokeVar - CSS variable name for stroke
   */
  static watchThemeChanges(element, fillVar, strokeVar) {
    // Set initial colors
    this.setThemeColors(element, fillVar, strokeVar);
    
    // Update when theme changes
    window.addEventListener('themechange', () => {
      this.setThemeColors(element, fillVar, strokeVar);
    });
  }
}

export default SVGThemeHelper;
