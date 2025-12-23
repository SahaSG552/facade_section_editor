/**
 * EventBus - Simple event bus for inter-module communication
 * This allows modules to communicate without direct dependencies
 */
class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to subscribe to
     * @param {function} callback - Callback function to execute when event is emitted
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event to unsubscribe from
     * @param {function} callback - Callback function to remove
     */
    off(eventName, callback) {
        if (!this.listeners[eventName]) return;

        const index = this.listeners[eventName].indexOf(callback);
        if (index !== -1) {
            this.listeners[eventName].splice(index, 1);
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - Name of the event to emit
     * @param {...*} [args] - Arguments to pass to callback functions
     */
    emit(eventName, ...args) {
        if (!this.listeners[eventName]) return;

        // Create a copy of the array to prevent issues if listeners are modified during iteration
        const listenersCopy = [...this.listeners[eventName]];

        for (const callback of listenersCopy) {
            try {
                callback(...args);
            } catch (error) {
                console.error(
                    `Error in event callback for ${eventName}:`,
                    error
                );
            }
        }
    }

    /**
     * Subscribe to an event that will be called only once
     * @param {string} eventName - Name of the event to subscribe to
     * @param {function} callback - Callback function to execute when event is emitted
     */
    once(eventName, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(eventName, onceCallback);
        };
        this.on(eventName, onceCallback);
    }

    /**
     * Clear all listeners for a specific event
     * @param {string} eventName - Name of the event to clear listeners for
     */
    clear(eventName) {
        this.listeners[eventName] = [];
    }

    /**
     * Clear all listeners for all events
     */
    clearAll() {
        this.listeners = {};
    }
}

// Singleton instance
const eventBus = new EventBus();

export default eventBus;
