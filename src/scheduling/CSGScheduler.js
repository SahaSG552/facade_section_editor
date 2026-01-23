import eventBus from "../core/eventBus.js";
import LoggerFactory from "../core/LoggerFactory.js";
import appState from "../state/AppState.js";

/**
 * CSGScheduler centralizes CSG application with a throttle/queue mechanism.
 * It ensures:
 * 1. Updates are delayed by 'delay' ms (debouncing rapid inputs).
 * 2. Only one operation runs at a time (preventing concurrency issues).
 * 3. Latest state is always applied eventually (droppable intermediate states).
 */
class CSGScheduler {
    constructor({ delay = 50 } = {}) {
        this.delay = delay;
        this.timer = null;
        this.applyFn = null;
        this.log = LoggerFactory.createLogger("CSGScheduler");

        // State
        this.isExecuting = false;
        this.pendingArgs = null;
    }

    /**
     * Configure the scheduler with the function that performs the CSG operation.
     * @param {Function} applyFn - function (apply:boolean) => Promise<void>
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
        }
        this.pendingArgs = null;
        eventBus.emit("csg:cancelled");
        this.log.debug("Cancelled pending CSG schedule");
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

        // Store latest arguments
        this.pendingArgs = { apply };
        eventBus.emit("csg:scheduled", { apply, delay: this.delay });

        // If already executing, the loop will check pendingArgs when done.
        if (this.isExecuting) return;

        // If timer is running, let it run (it will pick up new pendingArgs).
        if (this.timer) return;

        // Start timer
        this.timer = setTimeout(() => this.execute(), this.delay);
    }

    async execute() {
        this.timer = null;
        if (!this.pendingArgs) return;

        this.isExecuting = true;
        const { apply } = this.pendingArgs;
        // Clear pending args so we can detect NEW changes appearing during execution
        this.pendingArgs = null;

        try {
            await this.applyFn(apply);
            eventBus.emit("csg:applied", { apply });
            this.log.debug("CSG applied", { apply });
        } catch (error) {
            this.log.error("Error applying CSG:", error);
        } finally {
            this.isExecuting = false;
            // If new requests arrived during execution, schedule next run
            if (this.pendingArgs) {
                // Schedule next run with delay to avoid choking the UI thread
                this.timer = setTimeout(() => this.execute(), this.delay);
            }
        }
    }
}

const csgScheduler = new CSGScheduler();
export default csgScheduler;
