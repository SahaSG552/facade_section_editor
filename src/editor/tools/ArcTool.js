import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { EV } from "../EditorVisualConfig.js";

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
export function circumcenter(p1, p2, p3) {
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
export function arcFlagsViaPoint(pt1, pt2, ptThrough, cx, cy) {
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
export function arc2ptData(pt1, pt2, radius, cursorPos) {
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
        dash.classList.add(EV.cls.ghostRadius);
        g.appendChild(dash);
    }

    // Center dot
    const cdot = document.createElementNS(SVG_NS, "circle");
    cdot.setAttribute("cx", center.x);
    cdot.setAttribute("cy", center.y);
    cdot.setAttribute("r", EV.r.ghostCenter);
    cdot.classList.add(EV.cls.ghostCenter);
    g.appendChild(cdot);

    // Endpoint dots
    for (const pt of [pt1, pt2]) {
        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", pt.x);
        c.setAttribute("cy", pt.y);
        c.setAttribute("r", EV.r.ghostEndpoint);
        c.classList.add(EV.cls.ghostEndpoint);
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
        c.setAttribute("r", EV.r.ghostEndpoint);
        c.classList.add(EV.cls.ghostEndpoint);
        g.appendChild(c);
    }
    return g;
}

// ─── ArcTool ─────────────────────────────────────────────────────────────────

/**
 * ArcTool — draw circular arc segments via three-point placement, with an
 * optional typed-radius shortcut.
 *
 * **Drawing flow:**
 * 1. Click → P1
 * 2. Click → P2  (ghost: line P1→cursor; radius popup appears, not focused)
 * 3. Move  → live arc through P1, P2, cursor; popup shows current radius.
 * 4. Click → commit arc (circumcenter through P1, P2, cursor).
 *
 * **Radius-input shortcut (phase 3):**
 * - **Tab**          — focus the radius input and select its text.
 * - **Tab** (again)  — blur input, return to cursor-following mode.
 * - **Any digit/.**  — auto-fill input, focus it.
 * - **Enter** (cursor-following) — commit arc via cursor as P3.
 * - **Enter** (input focused)    — commit arc with typed radius; cursor sets side.
 * - **Escape**       — cancel and reset.
 *
 * Produced segment:
 * `{ type:"arc", data:{ start, end, center, radius, largeArc, sweep, arcMode, pt3 } }`
 */
export default class ArcTool extends BaseTool {
    constructor() {
        super();
        this.id = "arc3pt";

        /**
         * Interaction phases:
         *   0 = idle
         *   1 = P1 placed, cursor shows line P1→cursor
         *   2 = P2 placed, cursor follows for P3 (arc ghost + radius popup visible)
         * @private @type {0|1|2}
         */
        this._phase = 0;

        /** @private @type {{x:number,y:number}|null} */ this._pt1       = null;
        /** @private @type {{x:number,y:number}|null} */ this._pt2       = null;
        /** @private @type {{x:number,y:number}|null} */ this._cursorPos = null;

        /** @private — true while the radius input has keyboard focus */
        this._inputFocused = false;

        /** @private @type {HTMLElement|null} — floating radius popup */
        this._popup = null;
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    activate(ctx) {
        super.activate(ctx);
        this._reset();
        log.debug("ArcTool activated");
    }

    deactivate() {
        this._removePopup();
        super.deactivate();
        this._phase = 0; this._pt1 = null; this._pt2 = null;
        this._cursorPos = null; this._inputFocused = false;
    }

    hasActiveCommand() { return this._phase > 0; }

    // ─── Pointer events ──────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        if      (this._phase === 0) { this._pt1 = pos; this._phase = 1; }
        else if (this._phase === 1) { this._pt2 = pos; this._phase = 2; this._showPopup(e); }
        else if (this._phase === 2) {
            // Click always commits using the cursor position as P3.
            this._commitArc3pt(pos);
            this._reset();
        }
    }

    onPointerMove(pos, e) {
        this._cursorPos = pos;
        if (this._popup && e) this._positionPopup(e);

        if (this._phase === 1) {
            this.ctx.canvas.setGhost(buildLineGhost(this._pt1, pos));

        } else if (this._phase === 2) {
            const c = circumcenter(this._pt1, this._pt2, pos);
            if (c) {
                const flags = arcFlagsViaPoint(this._pt1, this._pt2, pos, c.cx, c.cy);
                this.ctx.canvas.setGhost(
                    buildArcGhost(this._pt1, this._pt2, c.r, flags.largeArc, flags.sweep, { x: c.cx, y: c.cy })
                );
                // Update radius display while the user is not typing.
                if (this._popup && !this._inputFocused) {
                    const inp = this._popup.querySelector("input");
                    if (inp) inp.value = c.r.toFixed(3);
                }
            } else {
                // Collinear fallback
                this.ctx.canvas.setGhost(buildLineGhost(this._pt1, this._pt2));
            }
        }
    }

    onPointerUp(_pos, _e) {}

    onConfirm(_pos, _e) {
        if (this._phase === 0) return false;
        if (this._phase === 2) {
            this._phase = 1;
            this._pt2 = null;
            this._removePopup();
            if (this._cursorPos && this._pt1) this.ctx.canvas.setGhost(buildLineGhost(this._pt1, this._cursorPos));
            return true;
        }
        this._reset();
        return true;
    }

    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._phase > 0) { this._reset(); return true; }
            return false;
        }
        if (this._phase !== 2) return false;

        // Tab: toggle focus between cursor-following and radius input.
        if (e.key === "Tab") {
            e.preventDefault();
            if (!this._inputFocused) {
                const inp = this._popup?.querySelector("input");
                if (inp) { inp.focus(); inp.select(); }
            }
            // Tab while input is focused is handled inside the input's keydown listener.
            return true;
        }

        // Enter while cursor-following: commit arc via cursor position.
        if (e.key === "Enter" && !this._inputFocused && this._cursorPos) {
            this._commitArc3pt(this._cursorPos);
            this._reset();
            return true;
        }

        // Typing a digit or decimal: auto-fill input and focus it.
        if (!this._inputFocused && e.key.length === 1 && /[\d.]/.test(e.key)) {
            const inp = this._popup?.querySelector("input");
            if (inp) {
                inp.value = e.key;
                inp.focus();
                inp.setSelectionRange(1, 1);
                e.preventDefault();
                return true;
            }
        }

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
                start:   { ...this._pt1 },
                end:     { ...this._pt2 },
                center:  { x: c.cx, y: c.cy },
                radius:  c.r,
                ...flags,
                arcMode: "arc3pt",
                pt3:     { ...pt3 },
            },
        });
        log.debug("ArcTool: committed arc3pt r=", c.r.toFixed(3));
    }

    /**
     * Commit arc with the radius typed in the popup.
     * The current cursor position determines which side the arc curves toward.
     * @private
     */
    _commitFromInput() {
        const inp  = this._popup?.querySelector("input");
        const hint = this._popup?.querySelector(".arc-radius-hint");
        const raw  = inp?.value?.trim() ?? "";
        const dist = Math.hypot(this._pt2.x - this._pt1.x, this._pt2.y - this._pt1.y);

        const showError = (msg) => {
            if (inp)  { inp.classList.add("arc-radius-error"); setTimeout(() => inp.classList.remove("arc-radius-error"), 2000); }
            if (hint) hint.textContent = msg;
        };

        // Accept {varname} or bare varname — resolve to a number via variableValues.
        const varMatch = raw.match(/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/) ??
                         (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw) ? [null, raw] : null);
        const radiusExpr = varMatch ? `{${varMatch[1]}}` : null;

        let val;
        if (radiusExpr) {
            const resolved = this.ctx.state.variableValues?.[varMatch[1]];
            if (resolved == null || isNaN(Number(resolved))) {
                showError(`Unknown variable — define ${varMatch[1]} in the bit properties`);
                return;
            }
            val = Number(resolved);
        } else {
            val = parseFloat(raw);
            if (isNaN(val) || val <= 0) { showError("Enter a number or {variable}"); return; }
        }

        if (val * 2 < dist - 1e-6) {
            showError(`Min: ${(dist / 2).toFixed(3)}`);
            return;
        }

        const cursor = this._cursorPos ?? this._pt2;
        const result = arc2ptData(this._pt1, this._pt2, val, cursor);
        if (!result) { showError("Radius too small"); return; }

        const { center, radius } = result;
        const dcLen = Math.hypot(cursor.x - center.x, cursor.y - center.y);
        const pt3   = dcLen > 1e-9
            ? { x: center.x + radius * (cursor.x - center.x) / dcLen,
                y: center.y + radius * (cursor.y - center.y) / dcLen }
            : { x: center.x + radius, y: center.y };

        this.ctx.state.addSegment({
            type: "arc",
            data: { ...result, arcMode: "arc2pt", pt3, ...(radiusExpr && { radiusExpr }) },
        });
        log.debug("ArcTool: committed arc (typed radius) r=", val, radiusExpr ?? "");
        this._reset();
    }

    // ─── Floating radius popup ────────────────────────────────────────────────

    /** @private */
    _showPopup(e) {
        this._removePopup();
        this._inputFocused = false;

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = "R =";
        popup.appendChild(label);

        const inp = document.createElement("input");
        inp.type      = "text";
        inp.inputMode = "decimal";
        inp.className = "arc-radius-input";
        // Value is populated dynamically by onPointerMove; start empty.
        popup.appendChild(inp);

        const hint = document.createElement("small");
        hint.className = "arc-radius-hint";
        popup.appendChild(hint);

        document.body.appendChild(popup);
        this._popup = popup;
        if (e) this._positionPopup(e);

        // Track whether the user has keyboard focus in the input.
        inp.addEventListener("focus", () => { this._inputFocused = true; inp.select(); });
        inp.addEventListener("blur",  () => { this._inputFocused = false; });

        inp.addEventListener("keydown", (ev) => {
            ev.stopPropagation();
            if (ev.key === "Tab") {
                ev.preventDefault();
                inp.blur(); // return to cursor-following mode
            } else if (ev.key === "Enter") {
                this._commitFromInput();
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
        this._cursorPos = null; this._inputFocused = false;
        this._removePopup();
        this.ctx?.canvas.clearGhost();
    }
}
