/**
 * UI Module
 * Handles user interface management including themes, panels, and UI state
 */
import BaseModule from "../core/BaseModule.js";

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

        return Promise.resolve();
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const html = document.documentElement;
        const themeToggle = document.getElementById("theme-toggle");
        const svg = themeToggle.querySelector("svg");

        if (html.classList.contains("dark")) {
            // Switch to light theme
            html.classList.remove("dark");
            localStorage.setItem("theme", "light");
            // Change to sun icon for light theme
            svg.innerHTML =
                '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>';
            themeToggle.title = "Switch to Dark Theme";
        } else {
            // Switch to dark theme
            html.classList.add("dark");
            localStorage.setItem("theme", "dark");
            // Change to moon icon for dark theme
            svg.innerHTML =
                '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>';
            themeToggle.title = "Switch to Light Theme";
        }
    }

    /**
     * Initialize theme from localStorage or system preference
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem("theme");
        const themeToggle = document.getElementById("theme-toggle");
        const svg = themeToggle.querySelector("svg");

        if (savedTheme === "dark") {
            document.documentElement.classList.add("dark");
            // Set moon icon for dark theme
            svg.innerHTML =
                '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path>';
            themeToggle.title = "Switch to Light Theme";
        } else {
            // Default to light theme
            document.documentElement.classList.remove("dark");
            // Set sun icon for light theme
            svg.innerHTML =
                '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>';
            themeToggle.title = "Switch to Dark Theme";
        }
    }

    /**
     * Toggle left panel visibility
     */
    toggleLeftPanel() {
        const leftPanel = document.getElementById("left-panel");
        const isSmallScreen = window.innerWidth <= 768;

        if (isSmallScreen) {
            // Overlay mode for small screens
            if (leftPanel.classList.contains("overlay-visible")) {
                // Hide panel
                leftPanel.classList.remove("overlay-visible");
                leftPanel.classList.add("collapsed");
                leftPanel.style.display = "none";
            } else {
                // Show panel
                leftPanel.classList.remove("collapsed");
                leftPanel.classList.add("overlay-visible");
                leftPanel.style.display = "flex";
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
            (window.innerWidth > 1000 || rightMenu.style.display === "flex");

        if (isVisible) {
            // Hide panel
            rightMenu.classList.add("collapsed");
            if (window.innerWidth <= 1000) {
                rightMenu.style.display = "none";
            }
        } else {
            // Show panel
            rightMenu.classList.remove("collapsed");
            if (window.innerWidth <= 1000) {
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
        const canvasModule = this.app.getModule("canvas");
        if (!canvasModule || !canvasModule.canvasManager) return;

        const canvasManager = canvasModule.canvasManager;
        const oldWidth = canvasManager.canvasParameters.width;
        const oldHeight = canvasManager.canvasParameters.height;

        // Update canvas parameters
        const canvas = document.getElementById("canvas");
        canvasManager.canvasParameters.width =
            canvas.getBoundingClientRect().width;
        canvasManager.canvasParameters.height =
            canvas.getBoundingClientRect().height;

        // Adjust pan to maintain relative position
        canvasManager.panX =
            (canvasManager.panX / oldWidth) *
            canvasManager.canvasParameters.width;
        canvasManager.panY =
            (canvasManager.panY / oldHeight) *
            canvasManager.canvasParameters.height;

        canvasManager.updateViewBox();
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
        const canvasModule = this.app.getModule("canvas");
        if (canvasModule && canvasModule.canvasManager) {
            canvasModule.canvasManager.resize();
            // Update all canvas elements after resize
            this.emit("canvas:resized");
        }

        // Auto-show panels when screen becomes wide enough
        const leftPanel = document.getElementById("left-panel");
        const rightMenu = document.getElementById("right-menu");

        // Show left panel when screen is wider than 768px
        if (window.innerWidth > 768 && leftPanel) {
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

        // Show right menu when screen is wider than 1000px
        if (window.innerWidth > 1000 && rightMenu) {
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
}

export default UIModule;
