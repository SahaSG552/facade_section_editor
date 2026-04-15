/**
 * ThemeService Module
 * Centralized theme management with EventBus integration.
 * Handles theme detection, toggling, system preference, and meta updates.
 */
import BaseModule from "../core/BaseModule.js";
import LoggerFactory from "../core/LoggerFactory.js";

class ThemeService extends BaseModule {
    /** @type {string} localStorage key for theme preference */
    static THEME_KEY = "theme";

    /** @type {Object<string, string>} Available themes */
    static THEMES = Object.freeze({ LIGHT: "light", DARK: "dark" });

    /**
     * Create ThemeService instance
     */
    constructor() {
        super("theme");
        /** @type {string} Current active theme */
        this.currentTheme = ThemeService.THEMES.LIGHT;
        /** @type {Function|null} System preference listener cleanup */
        this._systemPrefHandler = null;
    }

    /**
     * Initialize theme service — detect preference and apply
     */
    async initialize() {
        this.log = LoggerFactory.createLogger("ThemeService");
        this.currentTheme = this.detectTheme();
        this.applyTheme(this.currentTheme);
        this.setupSystemPreferenceListener();
        this.initialized = true;
        this.eventBus.emit("module:theme:initialized", { theme: this.currentTheme });
        this.log.info(`ThemeService initialized with theme: ${this.currentTheme}`);
    }

    /**
     * Detect theme from localStorage or system preference
     * @returns {string} Detected theme ("light" or "dark")
     */
    detectTheme() {
        const stored = localStorage.getItem(ThemeService.THEME_KEY);
        if (stored === ThemeService.THEMES.DARK || stored === ThemeService.THEMES.LIGHT) {
            return stored;
        }
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? ThemeService.THEMES.DARK
            : ThemeService.THEMES.LIGHT;
    }

    /**
     * Apply a theme to the document
     * @param {string} theme - Theme to apply ("light" or "dark")
     */
    applyTheme(theme) {
        this.currentTheme = theme;

        // Set data-theme attribute for CSS targeting
        document.documentElement.setAttribute("data-theme", theme);

        // Set color-scheme style property (drives light-dark() CSS function)
        document.documentElement.style.colorScheme = theme;

        // Maintain .dark class for backward compatibility during migration
        if (theme === ThemeService.THEMES.DARK) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // Persist preference
        localStorage.setItem(ThemeService.THEME_KEY, theme);

        // Update meta theme-color
        this.updateMetaThemeColor(theme);

        // Emit theme change event
        this.eventBus.emit("theme:changed", { theme });
        this.log.debug(`Theme applied: ${theme}`);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const next = this.currentTheme === ThemeService.THEMES.DARK
            ? ThemeService.THEMES.LIGHT
            : ThemeService.THEMES.DARK;
        this.applyTheme(next);
    }

    /**
     * Update the meta theme-color tag for browser chrome
     * @param {string} theme - Current theme
     */
    updateMetaThemeColor(theme) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.content = theme === ThemeService.THEMES.DARK ? "#0d1117" : "#ffffff";
        }
    }

    /**
     * Listen for system color-scheme changes
     * Only applies when user has no explicit localStorage preference
     */
    setupSystemPreferenceListener() {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        this._systemPrefHandler = (e) => {
            // Only follow system preference if user hasn't set an explicit choice
            const hasExplicitChoice = localStorage.getItem(ThemeService.THEME_KEY) !== null;
            if (!hasExplicitChoice) {
                this.applyTheme(e.matches ? ThemeService.THEMES.DARK : ThemeService.THEMES.LIGHT);
            }
        };

        mediaQuery.addEventListener("change", this._systemPrefHandler);
    }

    /**
     * Get current theme
     * @returns {string} Current theme ("light" or "dark")
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * Check if dark theme is active
     * @returns {boolean} True if dark theme
     */
    isDark() {
        return this.currentTheme === ThemeService.THEMES.DARK;
    }

    /**
     * Cleanup on shutdown
     */
    async shutdown() {
        if (this._systemPrefHandler) {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            mediaQuery.removeEventListener("change", this._systemPrefHandler);
            this._systemPrefHandler = null;
        }
        await super.shutdown();
    }
}

export default ThemeService;
