import eventBus from "../core/eventBus.js";
import LoggerFactory from "../core/LoggerFactory.js";
import appState from "../state/AppState.js";

/**
 * CSGScheduler centralizes debounced CSG application to avoid scattered timers.
 */
class CSGScheduler {
    constructor({ delay = 200 } = {}) {
        this.delay = delay;
        this.timer = null;
        this.applyFn = null;
        this.log = LoggerFactory.createLogger("CSGScheduler");
    }

    /**
     * Configure the scheduler with the function that performs the CSG operation.
     * @param {Function} applyFn - function (apply:boolean) => void
     */
    configure(applyFn) {
        this.applyFn = applyFn;
        this.log.info("Configured CSGScheduler");
    }

    /** Cancel pending schedule */
    cancel() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
            eventBus.emit("csg:cancelled");
            this.log.debug("Cancelled pending CSG schedule");
        }
    }

    /** Schedule a CSG application */
    schedule(apply = true) {
        if (!this.applyFn) {
            this.log.warn("applyFn not configured; skipping schedule");
            return;
        }
        if (!appState.is3DActive()) {
            this.log.debug("Skip CSG schedule: 3D inactive");
            return;
        }
        if (this.timer) {
            clearTimeout(this.timer);
        }
        eventBus.emit("csg:scheduled", { apply, delay: this.delay });
        this.timer = setTimeout(() => {
            this.timer = null;
            try {
                this.applyFn(apply);
                eventBus.emit("csg:applied", { apply });
                this.log.debug("CSG applied", { apply });
            } catch (error) {
                this.log.error("Error applying CSG:", error);
            }
        }, this.delay);
    }
}

const csgScheduler = new CSGScheduler();
export default csgScheduler;
