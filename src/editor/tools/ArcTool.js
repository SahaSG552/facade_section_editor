import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("ArcTool");
const SVG_NS = "http://www.w3.org/2000/svg";

// ─── Arc geometry helpers ────────────────────────────────────────────────────

/**
 * Compute circumcenter of three points (all in SVG Y-down space).
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @param {{x:number,y:number}} p3
 * @returns {{ cx:number, cy:number, r:number }|null} null if points are collinear
 */
function circumcenter(p1, p2, p3) {
    const ax = p2.x - p1.x, ay = p2.y - p1.y;
    const bx = p3.x - p1.x, by = p3.y - p1.y;
    const D = 2 * (ax * by - ay * bx);
    if (Math.abs(D) < 1e-9) return null; // collinear
    const ux = (by * (ax * ax + ay * ay) - ay * (bx * bx + by * by)) / D;
    const uy = (ax * (bx * bx + by * by) - bx * (ax * ax + ay * ay)) / D;
    return { cx: p1.x + ux, cy: p1.y + uy, r: Math.hypot(ux, uy) };
}

/**
 * Compute circle center from two endpoint points, radius, and SVG arc flags.
 * Works in any consistent coordinate space.
 * @param {{x:number,y:number}} pt1
 * @param {{x:number,y:number}} pt2
 * @param {number} r
 * @param {0|1} largeArc
 * @param {0|1} sweep
 * @returns {{x:number,y:number}|null}
 */
export function arcCenterFromEndpoints(pt1, pt2, r, largeArc, sweep) {
    const dx = (pt1.x - pt2.x) / 2;
    const dy = (pt1.y - pt2.y) / 2;
    const d2 = dx * dx + dy * dy;
    const d  = Math.sqrt(d2);
    if (d < 1e-9) return null;
    const h    = Math.sqrt(Math.max(0, r * r - d2));
    const sign = (largeArc === sweep) ? -1 : 1;
    const nx   = -dy / d;
    const ny   =  dx / d;
    return {
        x: (pt1.x + pt2.x) / 2 + sign * h * nx,
        y: (pt1.y + pt2.y) / 2 + sign * h * ny,
    };
}

/**
 * Determine SVG arc flags for an arc from pt1 → pt2 that passes through ptThrough.
 * All points are in SVG Y-down space.
 * @param {{x:number,y:number}} pt1
 * @param {{x:number,y:number}} pt2
 * @param {{x:number,y:number}} ptThrough
 * @param {number} cx  circle center X
 * @param {number} cy  circle center Y
 * @returns {{ largeArc: 0|1, sweep: 0|1 }}
 */
function arcFlagsViaPoint(pt1, pt2, ptThrough, cx, cy) {
    const a1 = Math.atan2(pt1.y - cy, pt1.x - cx);
    const a2 = Math.atan2(pt2.y - cy, pt2.x - cx);
    const a3 = Math.atan2(ptThrough.y - cy, ptThrough.x - cx);

    // Clockwise angular span from a1 to a2 (in SVG Y-down space, CW = positive angle)
    const spanCW = ((a2 - a1) + 2 * Math.PI) % (2 * Math.PI);
    // Clockwise angular span from a1 to pt3
    const spanP3 = ((a3 - a1) + 2 * Math.PI) % (2 * Math.PI);

    // If pt3 is within the CW arc from pt1 to pt2, then sweep=1 (CW)
    const sweep    = /** @type {0|1} */ (spanP3 < spanCW ? 1 : 0);
    const arcAngle = sweep === 1 ? spanCW : (2 * Math.PI - spanCW);
    const largeArc = /** @type {0|1} */ (arcAngle > Math.PI ? 1 : 0);

    return { largeArc, sweep };
}

/**
 * Build arc segment data for arc2pt mode.
 * Given two endpoints, a radius, and the cursor position (to select which side
 * the arc curves toward), returns the complete arc segment data object.
 *
 * @param {{x:number,y:number}} pt1
 * @param {{x:number,y:number}} pt2
 * @param {number} radius
 * @param {{x:number,y:number}} cursorPos  hint for which side
 * @returns {{ start, end, center, radius, largeArc:0|1, sweep:0|1 }|null}
 */
function arc2ptData(pt1, pt2, radius, cursorPos) {
    const dx   = pt2.x - pt1.x, dy = pt2.y - pt1.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-9 || radius * 2 < dist - 1e-6) return null;

    const mx = (pt1.x + pt2.x) / 2, my = (pt1.y + pt2.y) / 2;
    // Perpendicular unit vector (left of pt1→pt2 direction)
    const nx = -dy / dist, ny = dx / dist;
    const h  = Math.sqrt(Math.max(0, radius * radius - (dist / 2) ** 2));

    // Two candidate centers
    const c1 = { x: mx + h * nx, y: my + h * ny };
    const c2 = { x: mx - h * nx, y: my - h * ny };

    // The arc bows TOWARD the cursor.  The center is on the OPPOSITE side —
    // i.e. the candidate center that is FARTHER from the cursor.
    const d1 = Math.hypot(c1.x - cursorPos.x, c1.y - cursorPos.y);
    const d2 = Math.hypot(c2.x - cursorPos.x, c2.y - cursorPos.y);
    const center = d1 > d2 ? c1 : c2;

    // Get arc flags using the same arcFlagsViaPoint logic that arc3pt uses.
    // Project the cursor onto the circle to get a reference point that is
    // guaranteed to lie on the circle on the cursor's side of the chord.
    const dcLen  = Math.hypot(cursorPos.x - center.x, cursorPos.y - center.y);
    const arcMid = dcLen > 1e-9
        ? { x: center.x + radius * (cursorPos.x - center.x) / dcLen,
            y: center.y + radius * (cursorPos.y - center.y) / dcLen }
        : { x: center.x + radius, y: center.y }; // degenerate fallback
    const { largeArc, sweep } = arcFlagsViaPoint(pt1, pt2, arcMid, center.x, center.y);

    return { start: pt1, end: pt2, center, radius, largeArc, sweep };
}

// ─── Ghost builders ──────────────────────────────────────────────────────────

/**
 * Build a ghost SVG group: arc path + endpoint dots + center dot + dashed radius lines.
 * @param {{x:number,y:number}} pt1
 * @param {{x:number,y:number}} pt2
 * @param {number} r
 * @param {0|1} largeArc
 * @param {0|1} sweep
 * @param {{x:number,y:number}} center
 * @returns {SVGGElement}
 */
function buildArcGhost(pt1, pt2, r, largeArc, sweep, center) {
    const g = document.createElementNS(SVG_NS, "g");

    // Main arc path
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d",
        `M ${pt1.x} ${pt1.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${pt2.x} ${pt2.y}`
    );
    path.setAttribute("fill", "none");
    g.appendChild(path);

    // Dashed radius lines: center → pt1 and center → pt2
    for (const pt of [pt1, pt2]) {
        const dash = document.createElementNS(SVG_NS, "line");
        dash.setAttribute("x1", center.x); dash.setAttribute("y1", center.y);
        dash.setAttribute("x2", pt.x);     dash.setAttribute("y2", pt.y);
        dash.classList.add("editor-ghost-radius");
        g.appendChild(dash);
    }

    // Center dot
    const cdot = document.createElementNS(SVG_NS, "circle");
    cdot.setAttribute("cx", center.x);
    cdot.setAttribute("cy", center.y);
    cdot.setAttribute("r", "0.05");
    cdot.classList.add("editor-ghost-center");
    g.appendChild(cdot);

    // Endpoint dots
    for (const pt of [pt1, pt2]) {
        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", pt.x);
        c.setAttribute("cy", pt.y);
        c.setAttribute("r", "0.05");
        c.classList.add("editor-ghost-endpoint");
        g.appendChild(c);
    }

    return g;
}

/**
 * Build a plain line ghost (used before both endpoints are placed).
 * @param {{x:number,y:number}} pt1
 * @param {{x:number,y:number}} pt2
 * @returns {SVGGElement}
 */
function buildLineGhost(pt1, pt2) {
    const g = document.createElementNS(SVG_NS, "g");
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", pt1.x); line.setAttribute("y1", pt1.y);
    line.setAttribute("x2", pt2.x); line.setAttribute("y2", pt2.y);
    g.appendChild(line);
    for (const pt of [pt1, pt2]) {
        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", pt.x);
        c.setAttribute("cy", pt.y);
        c.setAttribute("r", "0.05");
        c.classList.add("editor-ghost-endpoint");
        g.appendChild(c);
    }
    return g;
}

// ─── ArcTool ─────────────────────────────────────────────────────────────────

/**
 * ArcTool — draw circular arc segments in two modes:
 *
 * **arc3pt** (default / LMB on toolbar button):
 * 1. Click → P1
 * 2. Click → P2 (ghost: line P1→cursor)
 * 3. Move  → live arc through P1, P2, cursor (with center dot + radius lines)
 * 4. Click → commit `arc` segment through P1, P2, P3
 *
 * **arc2pt** (RMB on toolbar button):
 * 1. Click → P1
 * 2. Click → P2 (ghost: line P1→cursor)
 * 3. Floating input appears near cursor — type radius + Enter
 * 4. Move  → live arc preview on either side of the chord; arc follows cursor side
 * 5. Click → commit `arc` segment (minor arc, cursor-chosen side)
 *
 * Both modes produce: `{ type:"arc", data:{ start, end, center, radius, largeArc, sweep } }`
 * where coordinates and `sweep` are stored in SVG Y-down editor space.
 * `exportPathWithMap()` in EditorStateManager negates Y and flips sweep when serialising.
 */
export default class ArcTool extends BaseTool {
    /**
     * @param {'arc3pt'|'arc2pt'} mode
     */
    constructor(mode = "arc3pt") {
        super();
        this.id    = mode;
        this._mode = mode;

        /**
         * Interaction phases:
         *   0 = idle
         *   1 = P1 placed, waiting P2
         *   2 = P2 placed; arc3pt: move→P3; arc2pt: waiting radius input
         *   3 = [arc2pt only] radius confirmed, move→choose side, click→commit
         * @private @type {0|1|2|3}
         */
        this._phase = 0;

        /** @private @type {{x:number,y:number}|null} */ this._pt1       = null;
        /** @private @type {{x:number,y:number}|null} */ this._pt2       = null;
        /** @private @type {number|null}               */ this._radius    = null;
        /** @private @type {{x:number,y:number}|null} */ this._cursorPos = null;

        /** @private @type {HTMLElement|null} — floating radius input popup */
        this._popup = null;
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    activate(ctx) {
        super.activate(ctx);
        this._reset();
        log.debug(`ArcTool(${this._mode}) activated`);
    }

    deactivate() {
        this._removePopup();
        super.deactivate(); // clears ghost
        this._phase = 0; this._pt1 = null; this._pt2 = null;
        this._radius = null; this._cursorPos = null;
    }

    hasActiveCommand() { return this._phase > 0; }

    // ─── Pointer events ──────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        if (this._mode === "arc3pt") {
            if      (this._phase === 0) { this._pt1 = pos; this._phase = 1; }
            else if (this._phase === 1) { this._pt2 = pos; this._phase = 2; }
            else if (this._phase === 2) { this._commitArc3pt(pos); this._reset(); }

        } else { // arc2pt
            if      (this._phase === 0) { this._pt1 = pos; this._phase = 1; }
            else if (this._phase === 1) { this._pt2 = pos; this._phase = 2; this._showPopup(e); }
            else if (this._phase === 3) { this._commitArc2pt(pos); this._reset(); }
        }
    }

    onPointerMove(pos, e) {
        this._cursorPos = pos;

        // Keep popup near the cursor while it is visible
        if (this._popup && e) this._positionPopup(e);

        if (this._phase === 1) {
            this.ctx.canvas.setGhost(buildLineGhost(this._pt1, pos));

        } else if (this._mode === "arc3pt" && this._phase === 2) {
            const c = circumcenter(this._pt1, this._pt2, pos);
            if (c) {
                const flags = arcFlagsViaPoint(this._pt1, this._pt2, pos, c.cx, c.cy);
                this.ctx.canvas.setGhost(
                    buildArcGhost(this._pt1, this._pt2, c.r, flags.largeArc, flags.sweep, { x: c.cx, y: c.cy })
                );
            } else {
                // Collinear: fall back to straight-line ghost
                this.ctx.canvas.setGhost(buildLineGhost(this._pt1, this._pt2));
            }

        } else if (this._mode === "arc2pt" && this._phase === 3) {
            const data = arc2ptData(this._pt1, this._pt2, this._radius, pos);
            if (data) {
                this.ctx.canvas.setGhost(
                    buildArcGhost(data.start, data.end, data.radius, data.largeArc, data.sweep, data.center)
                );
            }
        }
    }

    onPointerUp(_pos, _e) {}

    onConfirm(_pos, _e) {
        if (this._phase > 0) { this._reset(); return true; }
        return false;
    }

    onKeyDown(e) {
        if (e.key === "Escape" && this._phase > 0) { this._reset(); return true; }
        return false;
    }

    // ─── Commit ──────────────────────────────────────────────────────────────

    /** @private */
    _commitArc3pt(pt3) {
        const c = circumcenter(this._pt1, this._pt2, pt3);
        if (!c) { log.warn("ArcTool: collinear points — arc skipped"); return; }
        const flags = arcFlagsViaPoint(this._pt1, this._pt2, pt3, c.cx, c.cy);
        this.ctx.state.addSegment({
            type: "arc",
            data: {
                start: { ...this._pt1 }, end: { ...this._pt2 },
                center: { x: c.cx, y: c.cy }, radius: c.r,
                ...flags,
            },
        });
        log.debug("ArcTool: committed arc3pt r=", c.r.toFixed(3));
    }

    /** @private */
    _commitArc2pt(cursorPos) {
        const pos  = cursorPos ?? this._cursorPos ?? this._pt2;
        const data = arc2ptData(this._pt1, this._pt2, this._radius, pos);
        if (!data) { log.warn("ArcTool: radius too small for chord distance"); return; }
        this.ctx.state.addSegment({ type: "arc", data });
        log.debug("ArcTool: committed arc2pt r=", this._radius);
    }

    // ─── Floating radius popup ────────────────────────────────────────────────

    /** @private */
    _showPopup(e) {
        this._removePopup();

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = "R =";
        popup.appendChild(label);

        const inp = document.createElement("input");
        inp.type        = "number";
        inp.step        = "any";
        inp.min         = "0";
        inp.placeholder = "radius";
        inp.className   = "arc-radius-input";
        popup.appendChild(inp);

        document.body.appendChild(popup);
        this._popup = popup;
        if (e) this._positionPopup(e);

        requestAnimationFrame(() => inp.focus());

        inp.addEventListener("keydown", (ev) => {
            ev.stopPropagation(); // prevent toolbar shortcut interception
            if (ev.key === "Enter") {
                const val  = parseFloat(inp.value);
                const dist = Math.hypot(this._pt2.x - this._pt1.x, this._pt2.y - this._pt1.y);
                if (!isNaN(val) && val * 2 >= dist - 1e-6) {
                    this._radius = val;
                    this._phase  = 3;
                    this._removePopup();
                } else {
                    // Visual shake feedback: radius too small
                    inp.classList.add("arc-radius-error");
                    setTimeout(() => inp.classList.remove("arc-radius-error"), 400);
                }
            } else if (ev.key === "Escape") {
                this._reset();
            }
        });
    }

    /** @private */
    _positionPopup(e) {
        if (!this._popup) return;
        this._popup.style.left = (e.clientX + 14) + "px";
        this._popup.style.top  = (e.clientY + 14) + "px";
    }

    /** @private */
    _removePopup() {
        if (this._popup) { this._popup.remove(); this._popup = null; }
    }

    /** @private */
    _reset() {
        this._phase = 0; this._pt1 = null; this._pt2 = null;
        this._radius = null; this._cursorPos = null;
        this._removePopup();
        this.ctx?.canvas.clearGhost();
    }
}
