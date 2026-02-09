/**
 * LoggerFactory - Unified logging system for all modules
 * Provides structured logging with module names and log levels
 * Usage: const log = LoggerFactory.createLogger('ModuleName');
 *        log.info('message', { data });
 */

const LogLevels = {
    DEBUG: "DEBUG",
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
};

class ModuleLogger {
    constructor(moduleName, logLevel = LogLevels.INFO, category = null) {
        this.moduleName = moduleName;
        this.category = category;
        this.logLevel = logLevel;
        this.logs = [];
        this.maxLogs = 1000;
    }

    _formatMessage(level, ...args) {
        const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
        const prefix = `[${timestamp}] [${this.moduleName}:${level}]`;
        return { prefix, args };
    }

    _shouldLog(level) {
        const levels = [
            LogLevels.DEBUG,
            LogLevels.INFO,
            LogLevels.WARN,
            LogLevels.ERROR,
        ];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    _storeLog(level, prefix, args) {
        this.logs.push({ timestamp: Date.now(), level, prefix, args });
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    debug(...args) {
        if (!this._shouldLog(LogLevels.DEBUG)) return;
        const { prefix } = this._formatMessage(LogLevels.DEBUG);
        console.debug(prefix, ...args);
        this._storeLog(LogLevels.DEBUG, prefix, args);
    }

    info(...args) {
        if (!this._shouldLog(LogLevels.INFO)) return;
        const { prefix } = this._formatMessage(LogLevels.INFO);
        console.info(prefix, ...args);
        this._storeLog(LogLevels.INFO, prefix, args);
    }

    warn(...args) {
        if (!this._shouldLog(LogLevels.WARN)) return;
        const { prefix } = this._formatMessage(LogLevels.WARN);
        console.warn(prefix, ...args);
        this._storeLog(LogLevels.WARN, prefix, args);
    }

    error(...args) {
        if (!this._shouldLog(LogLevels.ERROR)) return;
        const { prefix } = this._formatMessage(LogLevels.ERROR);
        console.error(prefix, ...args);
        this._storeLog(LogLevels.ERROR, prefix, args);
    }

    getLogs(filter = {}) {
        let result = this.logs;
        if (filter.level) {
            result = result.filter((log) => log.level === filter.level);
        }
        if (filter.since) {
            result = result.filter((log) => log.timestamp > filter.since);
        }
        return result;
    }

    clearLogs() {
        this.logs = [];
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    setLogLevel(level) {
        if (LogLevels[level]) {
            this.logLevel = level;
        }
    }
}

/**
 * BitLogger - Specialized logger for bit operations
 * Tracks bit creation, modifications, extensions, collisions, etc.
 */
class BitLogger extends ModuleLogger {
    constructor() {
        super("Bits", LogLevels.DEBUG);
        this.bitEvents = [];
        this.maxBitEvents = 5000;
    }

    /**
     * Log bit creation event
     * @param {number} bitIndex - Index of the bit
     * @param {object} bitData - Bit data object
     * @param {string} context - Context (e.g., '2D', '3D', 'phantom')
     */
    bitCreated(bitIndex, bitData, context = "2D") {
        const event = {
            type: "CREATED",
            timestamp: Date.now(),
            bitIndex,
            context,
            diameter: bitData?.diameter,
            operation: bitData?.operation,
            depth: bitData?.depth,
        };
        this._storeBitEvent(event);
        this.debug(`Bit ${bitIndex} created in ${context}`, bitData);
    }

    /**
     * Log extension creation/update
     * @param {number} bitIndex - Index of the bit
     * @param {object} extensionInfo - Extension information
     * @param {boolean} isPhantom - Whether this is a phantom bit
     * @param {number} passIndex - Pass index for multi-pass operations
     */
    extensionUpdated(
        bitIndex,
        extensionInfo,
        isPhantom = false,
        passIndex = null
    ) {
        const event = {
            type: "EXTENSION_UPDATED",
            timestamp: Date.now(),
            bitIndex,
            isPhantom,
            passIndex,
            extension: { ...extensionInfo },
        };
        this._storeBitEvent(event);
        // Log condensed info
        this.info(
            `Extension ${isPhantom ? "phantom " : ""}bit #${bitIndex}${
                passIndex !== null ? ` pass ${passIndex}` : ""
            }: ` +
                `${extensionInfo.height.toFixed(
                    2
                )}mm height, ${extensionInfo.width.toFixed(2)}mm width`
        );
    }

    /**
     * Log shank collision detection
     * @param {number} bitIndex - Index of the bit
     * @param {object} collisionInfo - Collision information
     */
    shankCollision(bitIndex, collisionInfo) {
        const event = {
            type: "SHANK_COLLISION",
            timestamp: Date.now(),
            bitIndex,
            collision: { ...collisionInfo },
        };
        this._storeBitEvent(event);
        this.warn(
            `Shank collision detected for bit ${bitIndex}`,
            collisionInfo
        );
    }

    /**
     * Log bit position/depth update
     * @param {number} bitIndex - Index of the bit
     * @param {object} positionInfo - Position information
     */
    positionUpdated(bitIndex, positionInfo) {
        const event = {
            type: "POSITION_UPDATED",
            timestamp: Date.now(),
            bitIndex,
            position: { ...positionInfo },
        };
        this._storeBitEvent(event);
        this.debug(`Position updated for bit ${bitIndex}`, positionInfo);
    }

    /**
     * Log 3D extrusion creation
     * @param {number} bitIndex - Index of the bit
     * @param {object} extrusionInfo - Extrusion information
     */
    extrusionCreated(bitIndex, extrusionInfo) {
        const event = {
            type: "EXTRUSION_CREATED",
            timestamp: Date.now(),
            bitIndex,
            extrusion: { ...extrusionInfo },
        };
        this._storeBitEvent(event);
        this.debug(`3D extrusion created for bit ${bitIndex}`, extrusionInfo);
    }

    _storeBitEvent(event) {
        this.bitEvents.push(event);
        if (this.bitEvents.length > this.maxBitEvents) {
            this.bitEvents.shift();
        }
    }

    /**
     * Get all events for a specific bit
     * @param {number} bitIndex - Index of the bit
     * @returns {Array} Array of events for the bit
     */
    getBitEvents(bitIndex) {
        return this.bitEvents.filter((e) => e.bitIndex === bitIndex);
    }

    /**
     * Get events by type
     * @param {string} eventType - Event type to filter
     * @returns {Array} Filtered events
     */
    getEventsByType(eventType) {
        return this.bitEvents.filter((e) => e.type === eventType);
    }

    /**
     * Export bit events as JSON
     * @returns {string} JSON string of all bit events
     */
    exportBitEvents() {
        return JSON.stringify(this.bitEvents, null, 2);
    }

    clearBitEvents() {
        this.bitEvents = [];
    }
}

class LoggerFactory {
    static loggers = new Map();
    static bitLogger = null;
    static categoryLevels = new Map();

    // Map known modules to categories for mode-aware log muting
    static moduleCategories = {
        ThreeModule: "ThreeD",
        CSGEngine: "ThreeD",
        ExtrusionBuilder: "ThreeD",
        STLExporter: "ThreeD",
        SceneManager: "ThreeD",
        MaterialManager: "ThreeD",
        CanvasManager: "TwoD",
        Script: "TwoD",
        PanelManager: "TwoD",
        BooleanOperationStrategy: "TwoD",
        BitsManager: "TwoD",
        BitsTableManager: "TwoD",
        SelectionManager: "TwoD",
        CSGScheduler: "CSG",
    };

    static createLogger(
        moduleName,
        logLevel = LogLevels.INFO,
        category = null
    ) {
        if (!this.loggers.has(moduleName)) {
            const resolvedCategory =
                category || this.moduleCategories[moduleName] || null;
            const resolvedLevel = this.categoryLevels.get(resolvedCategory);
            const effectiveLevel = resolvedLevel || logLevel;
            const logger = new ModuleLogger(
                moduleName,
                effectiveLevel,
                resolvedCategory
            );
            this.loggers.set(moduleName, logger);
        }
        return this.loggers.get(moduleName);
    }

    static getLogger(moduleName) {
        return this.loggers.get(moduleName) || this.createLogger(moduleName);
    }

    /**
     * Get the specialized BitLogger instance
     * @returns {BitLogger} The bit logger instance
     */
    static getBitLogger() {
        if (!this.bitLogger) {
            this.bitLogger = new BitLogger();
        }
        return this.bitLogger;
    }

    static getAllLogs() {
        const allLogs = {};
        this.loggers.forEach((logger, name) => {
            allLogs[name] = logger.getLogs();
        });
        return allLogs;
    }

    /**
     * Set log level for a specific category (e.g., "TwoD", "ThreeD", "CSG")
     * and remember it for future loggers created in that category.
     */
    static setCategoryLevel(category, level) {
        if (!category || !LogLevels[level]) return;
        this.categoryLevels.set(category, level);
        this.loggers.forEach((logger) => {
            if (logger.category === category) {
                logger.setLogLevel(level);
            }
        });
    }

    /**
     * Adjust category log levels based on active view mode.
     * mode: "2d" | "3d" | "both"
     */
    static setModeLevels(mode) {
        const high = LogLevels.INFO;
        const low = LogLevels.WARN;

        if (mode === "2d") {
            this.setCategoryLevel("TwoD", high);
            this.setCategoryLevel("ThreeD", low);
            this.setCategoryLevel("CSG", low);
        } else if (mode === "3d") {
            this.setCategoryLevel("TwoD", low);
            this.setCategoryLevel("ThreeD", high);
            this.setCategoryLevel("CSG", high);
        } else {
            // both or fallback
            this.setCategoryLevel("TwoD", high);
            this.setCategoryLevel("ThreeD", high);
            this.setCategoryLevel("CSG", high);
        }
    }

    static setGlobalLogLevel(level) {
        this.loggers.forEach((logger) => logger.setLogLevel(level));
    }

    static clearAllLogs() {
        this.loggers.forEach((logger) => logger.clearLogs());
    }
}

export default LoggerFactory;
export { LoggerFactory, ModuleLogger, BitLogger, LogLevels };
