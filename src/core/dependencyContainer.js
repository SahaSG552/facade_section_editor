/**
 * Dependency Container - Simple dependency injection container
 * Manages module instantiation and dependencies
 */
class DependencyContainer {
    constructor() {
        this.services = {};
        this.factories = {};
        this.instances = {};
    }

    /**
     * Register a service (singleton)
     * @param {string} name - Service name
     * @param {function} factory - Factory function that returns the service instance
     * @param {boolean} [singleton=true] - Whether this should be a singleton
     */
    registerService(name, factory, singleton = true) {
        if (this.services[name]) {
            console.warn(`Service ${name} is already registered`);
            return;
        }

        this.services[name] = { factory, singleton };
    }

    /**
     * Register a factory (creates new instance each time)
     * @param {string} name - Factory name
     * @param {function} factory - Factory function that returns a new instance
     */
    registerFactory(name, factory) {
        if (this.factories[name]) {
            console.warn(`Factory ${name} is already registered`);
            return;
        }

        this.factories[name] = factory;
    }

    /**
     * Get a service instance
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    get(name) {
        // Check if it's a service
        if (this.services[name]) {
            const { factory, singleton } = this.services[name];

            if (singleton) {
                // Return existing singleton instance or create new one
                if (!this.instances[name]) {
                    this.instances[name] = factory(this);
                }
                return this.instances[name];
            } else {
                // Create new instance each time
                return factory(this);
            }
        }

        // Check if it's a factory
        if (this.factories[name]) {
            return this.factories[name](this);
        }

        throw new Error(`Service or factory ${name} not found`);
    }

    /**
     * Check if a service or factory is registered
     * @param {string} name - Service/factory name
     * @returns {boolean} True if registered
     */
    has(name) {
        return !!this.services[name] || !!this.factories[name];
    }

    /**
     * Reset the container (clear all instances)
     */
    reset() {
        this.instances = {};
    }
}

// Singleton instance
const dependencyContainer = new DependencyContainer();

export default dependencyContainer;
