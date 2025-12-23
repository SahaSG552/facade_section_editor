/**
 * Main Application Class
 * Coordinates all modules and manages application lifecycle
 */
import dependencyContainer from "./dependencyContainer.js";
import eventBus from "./eventBus.js";

class App {
    constructor() {
        this.container = dependencyContainer;
        this.eventBus = eventBus;
        this.modules = [];
        this.initialized = false;
    }

    /**
     * Register a module
     * @param {function} moduleFactory - Factory function that returns module instance
     * @param {string} name - Module name
     */
    registerModule(moduleFactory, name) {
        this.container.registerService(name, moduleFactory);
        this.modules.push(name);
    }

    /**
     * Initialize all modules
     */
    async initialize() {
        if (this.initialized) {
            console.warn("Application already initialized");
            return;
        }

        console.log("Initializing application...");

        // Initialize modules in order
        for (const moduleName of this.modules) {
            try {
                const module = this.container.get(moduleName);
                if (typeof module.initialize === "function") {
                    await module.initialize();
                    console.log(`Module ${moduleName} initialized`);
                }
            } catch (error) {
                console.error(
                    `Failed to initialize module ${moduleName}:`,
                    error
                );
                throw error;
            }
        }

        this.initialized = true;
        this.eventBus.emit("app:initialized");
        console.log("Application initialized successfully");
    }

    /**
     * Start the application
     */
    async start() {
        if (!this.initialized) {
            await this.initialize();
        }

        this.eventBus.emit("app:started");
        console.log("Application started");
    }

    /**
     * Get a module by name
     * @param {string} name - Module name
     * @returns {*} Module instance
     */
    getModule(name) {
        return this.container.get(name);
    }

    /**
     * Shutdown the application
     */
    async shutdown() {
        console.log("Shutting down application...");

        // Shutdown modules in reverse order
        for (let i = this.modules.length - 1; i >= 0; i--) {
            const moduleName = this.modules[i];
            try {
                const module = this.container.get(moduleName);
                if (typeof module.shutdown === "function") {
                    await module.shutdown();
                    console.log(`Module ${moduleName} shut down`);
                }
            } catch (error) {
                console.error(
                    `Failed to shutdown module ${moduleName}:`,
                    error
                );
            }
        }

        this.eventBus.emit("app:shutdown");
        this.container.reset();
        this.initialized = false;
        console.log("Application shut down successfully");
    }
}

// Singleton instance
const app = new App();

export default app;
