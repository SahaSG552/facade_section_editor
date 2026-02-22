import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("LineTool");

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * LineTool — draw connected line segments (polyline).
 *
 * ### Interaction flow
 * 1. **First click** — set the start point of the first segment.
 * 2. **Move** — show a ghost/preview line from start to cursor with endpoint circles.
 * 3. **Click** — commit the segment (start → cursor); the endpoint becomes the new
 *                start for the next segment (polyline continues).
 * 4. **Right-click** (`onConfirm`) — finish the polyline; clears in-progress state.
 * 5. **Escape** — cancel current in-progress segment.
 *
 * ### Coordinate note
 * Positions are raw SVG user-space coordinates as returned by EditorCanvas.screenToSVG().
 * The anchor is at (0,0). Y increases downward in SVG space.
 */
export default class LineTool extends BaseTool {
    constructor() {
        super();
        this.id = "line";

        /** @private @type {{ x: number, y: number }|null} — anchor of the current segment */
        this._startPoint = null;
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    activate(ctx) {
        super.activate(ctx);
        this._startPoint = null;
        log.debug("LineTool active");
    }

    deactivate() {
        this._startPoint = null;
        super.deactivate(); // also calls clearGhost()
    }

    // ─── Pointer events ─────────────────────────────────────────────────────

    onPointerDown(pos, _e) {
        if (!this._startPoint) {
            // First click — set start anchor
            this._startPoint = pos;
            log.debug("LineTool: start →", pos);
        } else {
            // Subsequent click — commit segment, continue polyline
            this._commitSegment(pos);
            this._startPoint = pos;
        }
    }

    onPointerMove(pos) {
        if (!this._startPoint) return;
        this.ctx.canvas.setGhost(this._buildGhostGroup(this._startPoint, pos));
    }

    onPointerUp(_pos, _e) {
        // State changes happen in onPointerDown
    }

    /** @inheritdoc */
    hasActiveCommand() { return this._startPoint !== null; }

    /**
     * Right-click confirm — finish the current polyline.
     * @returns {boolean}
     */
    onConfirm(_pos, _e) {
        if (this._startPoint) {
            this._startPoint = null;
            this.ctx.canvas.clearGhost();
            log.debug("LineTool: polyline finished by right-click confirm");
            return true;
        }
        return false;
    }

    onKeyDown(e) {
        if (e.key === "Escape" && this._startPoint) {
            this._startPoint = null;
            this.ctx.canvas.clearGhost();
            return true;
        }
        return false;
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    /**
     * Commit the current start→end segment to the state.
     * @param {{ x: number, y: number }} endPoint
     * @private
     */
    _commitSegment(endPoint) {
        const start = this._startPoint;
        const end   = endPoint;
        if (Math.hypot(end.x - start.x, end.y - start.y) < 1e-6) return;
        this.ctx.state.addSegment({
            type: "line",
            data: { start: { ...start }, end: { ...end } },
        });
        log.debug("LineTool: committed line", start, "→", end);
    }

    /**
     * Build a ghost `<g>`: solid line + filled circles at both endpoints.
     * The .editor-ghost class (applied by EditorCanvas.setGhost) provides stroke colour.
     * @param {{ x: number, y: number }} start
     * @param {{ x: number, y: number }} end
     * @returns {SVGGElement}
     * @private
     */
    _buildGhostGroup(start, end) {
        const g = document.createElementNS(SVG_NS, "g");

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", start.x);
        line.setAttribute("y1", start.y);
        line.setAttribute("x2", end.x);
        line.setAttribute("y2", end.y);
        g.appendChild(line);

        for (const pt of [start, end]) {
            const c = document.createElementNS(SVG_NS, "circle");
            c.setAttribute("cx", pt.x);
            c.setAttribute("cy", pt.y);
            c.setAttribute("r", "0.05");
            c.classList.add("editor-ghost-endpoint");
            g.appendChild(c);
        }

        return g;
    }
}
