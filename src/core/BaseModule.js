/**
 * Base Module Class
 * Provides common functionality for all modules
 */
import eventBus from "./eventBus.js";

class BaseModule {
    constructor(name) {
        this.name = name;
        this.initialized = false;
        this.eventBus = eventBus;
    }

    /**
     * Initialize the module
     */
    async initialize() {
        if (this.initialized) {
            console.warn(`Module ${this.name} already initialized`);
            return;
        }

        console.log(`Initializing module ${this.name}...`);
        this.setupEventListeners();
        this.initialized = true;
        this.eventBus.emit(`module:${this.name}:initialized`);
        console.log(`Module ${this.name} initialized`);
    }

    /**
     * Setup event listeners for this module
     */
    setupEventListeners() {
        // To be implemented by subclasses
    }

    /**
     * Shutdown the module
     */
    async shutdown() {
        if (!this.initialized) {
            console.warn(`Module ${this.name} not initialized`);
            return;
        }

        console.log(`Shutting down module ${this.name}...`);
        this.cleanupEventListeners();
        this.initialized = false;
        this.eventBus.emit(`module:${this.name}:shutdown`);
        console.log(`Module ${this.name} shut down`);
    }

    /**
     * Cleanup event listeners
     */
    cleanupEventListeners() {
        // To be implemented by subclasses
    }

    /**
     * Get module name
     * @returns {string} Module name
     */
    getName() {
        return this.name;
    }

    /**
     * Check if module is initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.initialized;
    }
}

export default BaseModule;
