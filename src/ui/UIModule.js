/**
 * UI Module
 * Handles user interface management including themes, panels, and UI state
 */
import BaseModule from "../core/BaseModule.js";
import { BREAKPOINTS, MEDIA_QUERIES } from "./breakpoints.js";

/** SVG path data for sun icon (light theme indicator) */
const SUN_ICON_INNER =
    '<circle cx="12" cy="12" r="4"></circle>' +
    '<path d="M12 2v2"></path><path d="M12 20v2"></path>' +
    '<path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path>' +
    '<path d="M2 12h2"></path><path d="M20 12h2"></path>' +
    '<path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>';

/** SVG path data for moon icon (dark theme indicator) */
const MOON_ICON_INNER =
    '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>';

class UIModule extends BaseModule {
    constructor() {
        super("ui");
        this.leftPanelClickOutsideHandler = null;
        this.rightPanelClickOutsideHandler = null;
    }

    initialize() {
        super.initialize();
        console.log("UIModule initialized");

        // Initialize theme on startup
        this.initializeTheme();

        // Set up responsive panel behavior
        this.setupResponsivePanels();

        // Listen for theme changes from ThemeService
        this.setupThemeChangeListener();

        return Promise.resolve();
    }

    /**
     * Get the ThemeService module from the app container
     * @returns {import("./ThemeService.js").default|null}
     */
    getThemeService() {
        return this.app?.getModule("theme") || null;
    }

    /**
     * Check if dark theme is currently active
     * @returns {boolean}
     */
    isDarkTheme() {
        const themeService = this.getThemeService();
        if (themeService) {
            return themeService.isDark();
        }
        // Fallback: check color-scheme style property
        return document.documentElement.style.colorScheme === "dark";
    }

    /**
     * Update the theme toggle button icon to reflect the current theme
     * @param {string} theme - Current theme ("light" or "dark")
     */
    updateThemeToggleIcon(theme) {
        const themeToggle = document.getElementById("theme-toggle");
        if (!themeToggle) return;

        const svg = themeToggle.querySelector("svg");
        if (!svg) return;

        if (theme === "dark") {
            svg.innerHTML = MOON_ICON_INNER;
            themeToggle.title = "Switch to Light Theme";
        } else {
            svg.innerHTML = SUN_ICON_INNER;
            themeToggle.title = "Switch to Dark Theme";
        }
    }

    /**
     * Toggle between light and dark themes via ThemeService
     */
    toggleTheme() {
        const themeService = this.getThemeService();
        if (themeService) {
            themeService.toggleTheme();
        } else {
            // Fallback: direct color-scheme manipulation if ThemeService not available
            const isDark = this.isDarkTheme();
            const nextTheme = isDark ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", nextTheme);
            document.documentElement.style.colorScheme = nextTheme;
            localStorage.setItem("theme", nextTheme);
            this.updateThemeToggleIcon(nextTheme);
        }
    }

    /**
     * Initialize theme from localStorage or system preference
     * Delegates to ThemeService when available, then updates the toggle icon.
     */
    initializeTheme() {
        const themeService = this.getThemeService();
        let currentTheme;

        if (themeService && themeService.initialized) {
            // ThemeService already initialized — read its state
            currentTheme = themeService.getTheme();
        } else {
            // Determine theme ourselves (ThemeService may not be ready yet)
            const savedTheme = localStorage.getItem("theme");
            if (savedTheme === "dark" || savedTheme === "light") {
                currentTheme = savedTheme;
            } else {
                currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";
            }
            // Apply via color-scheme (the modern way, replaces .dark class)
            document.documentElement.setAttribute("data-theme", currentTheme);
            document.documentElement.style.colorScheme = currentTheme;
        }

        // Update the toggle icon to reflect current theme
        this.updateThemeToggleIcon(currentTheme);
    }

    /**
     * Listen for theme change events from ThemeService
     * Keeps the toggle icon in sync when theme is changed externally
     * (e.g., system preference change, or ThemeService.toggleTheme() called)
     */
    setupThemeChangeListener() {
        const themeService = this.getThemeService();
        if (themeService?.eventBus) {
            themeService.eventBus.on("theme:changed", ({ theme }) => {
                this.updateThemeToggleIcon(theme);
            });
        }
    }

    /**
     * Toggle left panel visibility
     */
    toggleLeftPanel() {
        const leftPanel = document.getElementById("left-panel");
        const isSmallScreen = !MEDIA_QUERIES.MD.matches;
        const isMobile = this.isMobileDevice();

        if (isSmallScreen || isMobile) {
            // Overlay mode for small screens and mobile devices
            if (leftPanel.classList.contains("overlay-visible")) {
                // Hide panel
                leftPanel.classList.remove("overlay-visible");
                leftPanel.classList.add("collapsed");
                leftPanel.style.display = "none";
                // Remove click outside handler
                if (this.leftPanelClickOutsideHandler) {
                    document.removeEventListener(
                        "click",
                        this.leftPanelClickOutsideHandler
                    );
                    this.leftPanelClickOutsideHandler = null;
                }
            } else {
                // Show panel
                leftPanel.classList.remove("collapsed");
                leftPanel.classList.add("overlay-visible");
                leftPanel.style.display = "flex";
                // Add click outside handler to close panel
                this.leftPanelClickOutsideHandler = (e) => {
                    if (
                        !leftPanel.contains(e.target) &&
                        !e.target.closest("#app-header button")
                    ) {
                        this.toggleLeftPanel();
                    }
                };
                // Use setTimeout to avoid immediate trigger
                setTimeout(() => {
                    document.addEventListener(
                        "click",
                        this.leftPanelClickOutsideHandler
                    );
                }, 10);
            }
        } else {
            // Normal collapse/expand mode for larger screens
            leftPanel.classList.toggle("collapsed");
            // Remove overlay classes and styles for normal mode
            leftPanel.classList.remove("overlay-visible");
            leftPanel.style.display = "";
        }

        // Update canvas parameters
        this.updateCanvasAfterPanelToggle();
    }

    /**
     * Toggle right menu visibility
     */
    toggleRightMenu() {
        const rightMenu = document.getElementById("right-menu");

        // Check if panel is currently visible
        const isVisible =
            !rightMenu.classList.contains("collapsed") &&
            (MEDIA_QUERIES.LG.matches || rightMenu.style.display === "flex");

        if (isVisible) {
            // Hide panel
            rightMenu.classList.add("collapsed");
            if (!MEDIA_QUERIES.LG.matches) {
                rightMenu.style.display = "none";
            }
        } else {
            // Show panel
            rightMenu.classList.remove("collapsed");
            if (!MEDIA_QUERIES.LG.matches) {
                rightMenu.style.display = "flex";
            }
        }

        // Update canvas parameters
        this.updateCanvasAfterPanelToggle();
    }

    /**
     * Update canvas after panel toggle
     */
    updateCanvasAfterPanelToggle() {
        // Get canvas manager from app
        const canvasModule = this.app?.getModule("canvas");
        if (!canvasModule || !canvasModule.canvasManager) return;

        const canvasManager = canvasModule.canvasManager;

        // Update canvas parameters
        const canvas = document.getElementById("canvas");
        canvasManager.canvasParameters.width =
            canvas.getBoundingClientRect().width;
        canvasManager.canvasParameters.height =
            canvas.getBoundingClientRect().height;

        canvasManager.updateViewBox();

        // Update Three.js canvas if active
        const threeModule = this.app?.getModule("three");
        if (threeModule && threeModule.sceneManager) {
            setTimeout(() => {
                threeModule.sceneManager.onWindowResize();
            }, 50);
        }
    }

    /**
     * Set up responsive panel behavior
     */
    setupResponsivePanels() {
        window.addEventListener("resize", () => {
            this.handleWindowResize();
        });
    }

    /**
     * Handle window resize for responsive panels
     */
    handleWindowResize() {
        // Get canvas manager
        const canvasModule = this.app?.getModule("canvas");
        if (canvasModule && canvasModule.canvasManager) {
            canvasModule.canvasManager.resize();
            // Update all canvas elements after resize
            this.emit("canvas:resized");
        }

        // Auto-show panels when screen becomes wide enough
        const leftPanel = document.getElementById("left-panel");
        const rightMenu = document.getElementById("right-menu");

        // Show left panel when screen is wider than MD breakpoint
        if (MEDIA_QUERIES.MD.matches && leftPanel) {
            leftPanel.classList.remove("collapsed", "overlay-visible");
            leftPanel.style.display = "";
            if (this.leftPanelClickOutsideHandler) {
                document.removeEventListener(
                    "click",
                    this.leftPanelClickOutsideHandler
                );
                this.leftPanelClickOutsideHandler = null;
            }
        }

        // Show right menu when screen is wider than LG breakpoint
        if (MEDIA_QUERIES.LG.matches && rightMenu) {
            rightMenu.classList.remove("collapsed", "overlay-visible");
            rightMenu.style.display = "";
            if (this.rightPanelClickOutsideHandler) {
                document.removeEventListener(
                    "click",
                    this.rightPanelClickOutsideHandler
                );
                this.rightPanelClickOutsideHandler = null;
            }
        }

        // Update canvas after panel changes
        this.updateCanvasAfterPanelToggle();
    }

    /**
     * Log operation to UI
     */
    logOperation(message) {
        const logElement = document.getElementById("operations-log");
        if (!logElement) return;

        const timestamp = new Date().toLocaleTimeString();
        logElement.textContent = `[${timestamp}] ${message}`;

        // Remove fade-out class if it exists
        logElement.classList.remove("fade-out");

        // Add fade-out class after 5 seconds
        setTimeout(() => {
            logElement.classList.add("fade-out");
        }, 5000);
    }

    /**
     * Show alert dialog
     */
    showAlert(message) {
        alert(message);
    }

    /**
     * Show confirm dialog
     */
    showConfirm(message) {
        return confirm(message);
    }

    /**
     * Create file input dialog
     */
    createFileInput(accept = "*", callback = null) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;

        if (callback) {
            input.onchange = (e) => callback(e.target.files[0]);
        }

        input.click();
        return input;
    }

    /**
     * Check if the current device is a mobile device
     */
    isMobileDevice() {
        return (
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            ) ||
            (!MEDIA_QUERIES.MD.matches && window.innerHeight <= 1024)
        );
    }
}

export default UIModule;
