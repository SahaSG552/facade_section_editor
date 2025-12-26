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
    constructor(moduleName, logLevel = LogLevels.INFO) {
        this.moduleName = moduleName;
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

class LoggerFactory {
    static loggers = new Map();

    static createLogger(moduleName, logLevel = LogLevels.INFO) {
        if (!this.loggers.has(moduleName)) {
            this.loggers.set(
                moduleName,
                new ModuleLogger(moduleName, logLevel)
            );
        }
        return this.loggers.get(moduleName);
    }

    static getLogger(moduleName) {
        return this.loggers.get(moduleName) || this.createLogger(moduleName);
    }

    static getAllLogs() {
        const allLogs = {};
        this.loggers.forEach((logger, name) => {
            allLogs[name] = logger.getLogs();
        });
        return allLogs;
    }

    static setGlobalLogLevel(level) {
        this.loggers.forEach((logger) => logger.setLogLevel(level));
    }

    static clearAllLogs() {
        this.loggers.forEach((logger) => logger.clearLogs());
    }
}

export default LoggerFactory;
export { LoggerFactory, ModuleLogger, LogLevels };
