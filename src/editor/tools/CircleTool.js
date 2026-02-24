import BaseTool from "./BaseTool.js";
import { circumcenter, arc2ptData } from "./ArcTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { EV } from "../EditorVisualConfig.js";

const log = LoggerFactory.createLogger("CircleTool");
const SVG_NS = "http://www.w3.org/2000/svg";

// ─── Ghost builders ──────────────────────────────────────────────────────────

/**
 * Build a ghost SVG group for a circle: circle outline + dashed center→pt3
 * radius line + center dot + pt3 dot.
 * @param {{x:number,y:number}} center
 * @param {number} radius
 * @param {{x:number,y:number}} pt3
 * @returns {SVGGElement}
 */
function buildCircleGhost(center, radius, pt3) {
    const g = document.createElementNS(SVG_NS, "g");

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", center.x);
    circle.setAttribute("cy", center.y);
    circle.setAttribute("r", radius);
    circle.setAttribute("fill", "none");
    g.appendChild(circle);

    // Dashed radius line: center → pt3
    const dash = document.createElementNS(SVG_NS, "line");
    dash.setAttribute("x1", center.x); dash.setAttribute("y1", center.y);
    dash.setAttribute("x2", pt3.x);    dash.setAttribute("y2", pt3.y);
    dash.classList.add(EV.cls.ghostRadius);
    g.appendChild(dash);

    // Center dot
    const cdot = document.createElementNS(SVG_NS, "circle");
    cdot.setAttribute("cx", center.x);
    cdot.setAttribute("cy", center.y);
    cdot.setAttribute("r", EV.r.ghostCenter);
    cdot.classList.add(EV.cls.ghostCenter);
    g.appendChild(cdot);

    // pt3 dot (on circumference)
    const pdot = document.createElementNS(SVG_NS, "circle");
    pdot.setAttribute("cx", pt3.x);
    pdot.setAttribute("cy", pt3.y);
    pdot.setAttribute("r", EV.r.ghostEndpoint);
    pdot.classList.add(EV.cls.ghostEndpoint);
    g.appendChild(pdot);

    return g;
}

/**
 * Build a plain line ghost (P1 → cursor) used while awaiting the second click.
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

// ─── CircleTool ──────────────────────────────────────────────────────────────

/**
 * CircleTool — draw full-circle segments in two modes.
 *
 * **circle2pt** — center + radius point:
 *   1. Click → center
 *   2. Move  → ghost circle grows; radius popup shows current radius
 *   3. Click → commit (cursor position becomes pt3)
 *
 * **circle3pt** — circumcircle through three points:
 *   1. Click → P1
 *   2. Click → P2  (line ghost P1→cursor until P2 is set; popup appears)
 *   3. Move  → ghost circle through P1, P2, cursor
 *   4. Click → commit (cursor becomes P3 / pt3)
 *
 * **Radius popup UX** (both modes, same as ArcTool):
 *   - **Tab**          — focus radius input
 *   - **Tab** (again)  — blur, return to cursor-following mode
 *   - **Any digit/.**  — auto-fill input and focus
 *   - **Enter** (cursor-following) — commit using cursor
 *   - **Enter** (input focused)    — commit with typed radius
 *   - **Escape**       — cancel / reset
 *
 * Produced segment:
 * `{ type:"circle", data:{ center, radius, pt3, arcMode, [radiusExpr] } }`
 */
export default class CircleTool extends BaseTool {
    /**
     * @param {"circle2pt"|"circle3pt"} [mode="circle2pt"]
     */
    constructor(mode = "circle2pt") {
        super();
        this._mode = mode;
        this.id    = mode;

        /**
         * circle2pt phases:  0=idle  1=center placed
         * circle3pt phases:  0=idle  1=P1 placed  2=P2 placed
         * @private @type {0|1|2}
         */
        this._phase = 0;

        /** @private @type {{x:number,y:number}|null} center (circle2pt) or P1 (circle3pt) */
        this._pt1 = null;
        /** @private @type {{x:number,y:number}|null} P2 (circle3pt only) */
        this._pt2 = null;
        /** @private @type {{x:number,y:number}|null} latest cursor position */
        this._cursorPos = null;

        /** @private — true while radius input has keyboard focus */
        this._inputFocused = false;
        /** @private @type {HTMLElement|null} */
        this._popup = null;
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────

    activate(ctx) {
        super.activate(ctx);
        this._reset();
        log.debug("CircleTool activated, mode=", this._mode);
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
        if (this._mode === "circle2pt") {
            if (this._phase === 0) {
                this._pt1 = pos;
                this._phase = 1;
                this._showPopup(e);
            } else if (this._phase === 1) {
                // Commit: cursor position becomes pt3
                this._commitCircle2pt(pos);
                this._reset();
            }
        } else {
            // circle3pt
            if      (this._phase === 0) { this._pt1 = pos; this._phase = 1; }
            else if (this._phase === 1) { this._pt2 = pos; this._phase = 2; this._showPopup(e); }
            else if (this._phase === 2) {
                this._commitCircle3pt(pos);
                this._reset();
            }
        }
    }

    onPointerMove(pos, e) {
        this._cursorPos = pos;
        if (this._popup && e) this._positionPopup(e);

        if (this._mode === "circle2pt") {
            if (this._phase === 1) {
                const radius = Math.hypot(pos.x - this._pt1.x, pos.y - this._pt1.y);
                if (radius > 1e-6) {
                    this.ctx.canvas.setGhost(buildCircleGhost(this._pt1, radius, pos));
                    if (this._popup && !this._inputFocused) {
                        const inp = this._popup.querySelector("input");
                        if (inp) inp.value = radius.toFixed(3);
                    }
                }
            }
        } else {
            // circle3pt
            if (this._phase === 1) {
                this.ctx.canvas.setGhost(buildLineGhost(this._pt1, pos));
            } else if (this._phase === 2) {
                const c = circumcenter(this._pt1, this._pt2, pos);
                if (c && c.r > 1e-6) {
                    const pt3 = pos;
                    this.ctx.canvas.setGhost(buildCircleGhost({ x: c.cx, y: c.cy }, c.r, pt3));
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
    }

    onPointerUp(_pos, _e) {}

    onConfirm(_pos, _e) {
        if (this._phase > 0) { this._reset(); return true; }
        return false;
    }

    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._phase > 0) { this._reset(); return true; }
            return false;
        }

        const activePhase = this._mode === "circle2pt" ? 1 : 2;
        if (this._phase !== activePhase) return false;

        // Tab: toggle focus between cursor-following and radius input.
        if (e.key === "Tab") {
            e.preventDefault();
            if (!this._inputFocused) {
                const inp = this._popup?.querySelector("input");
                if (inp) { inp.focus(); inp.select(); }
            }
            return true;
        }

        // Enter while cursor-following: commit using cursor.
        if (e.key === "Enter" && !this._inputFocused && this._cursorPos) {
            if (this._mode === "circle2pt") {
                this._commitCircle2pt(this._cursorPos);
            } else {
                this._commitCircle3pt(this._cursorPos);
            }
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

    // ─── Commit helpers ───────────────────────────────────────────────────────

    /** @private */
    _commitCircle2pt(pt3) {
        const radius = Math.hypot(pt3.x - this._pt1.x, pt3.y - this._pt1.y);
        if (radius < 1e-6) { log.warn("CircleTool: zero radius — skipping"); return; }
        this._commitCircle(this._pt1, radius, pt3, "circle2pt");
    }

    /** @private */
    _commitCircle3pt(pt3) {
        const c = circumcenter(this._pt1, this._pt2, pt3);
        if (!c || c.r < 1e-6) { log.warn("CircleTool: collinear points — circle skipped"); return; }
        this._commitCircle({ x: c.cx, y: c.cy }, c.r, pt3, "circle3pt");
    }

    /**
     * Shared commit — adds the circle segment to state.
     * @private
     * @param {{x:number,y:number}} center
     * @param {number} radius
     * @param {{x:number,y:number}} pt3
     * @param {"circle2pt"|"circle3pt"} arcMode
     * @param {string|undefined} [radiusExpr]
     */
    _commitCircle(center, radius, pt3, arcMode, radiusExpr = undefined) {
        this.ctx.state.addSegment({
            type: "circle",
            data: {
                center:  { ...center },
                radius,
                pt3:     { ...pt3 },
                arcMode,
                ...(radiusExpr && { radiusExpr }),
            },
        });
        log.debug("CircleTool: committed", arcMode, "r=", radius.toFixed(3));
    }

    /**
     * Commit using the radius typed in the popup.
     * - circle2pt: center = _pt1; cursor determines pt3 direction.
     * - circle3pt: use P1/P2 as chord; cursor picks side (arc2ptData logic).
     * @private
     */
    _commitFromInput() {
        const inp  = this._popup?.querySelector("input");
        const hint = this._popup?.querySelector(".arc-radius-hint");
        const raw  = inp?.value?.trim() ?? "";

        const showError = (msg) => {
            if (inp)  { inp.classList.add("arc-radius-error"); setTimeout(() => inp.classList.remove("arc-radius-error"), 2000); }
            if (hint) hint.textContent = msg;
        };

        // Accept {varname} or bare varname
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

        const cursor = this._cursorPos;

        if (this._mode === "circle2pt") {
            // center = _pt1, radius = val, pt3 projects toward cursor
            const center = this._pt1;
            if (!center) { showError("No center placed"); return; }
            const dcLen = cursor ? Math.hypot(cursor.x - center.x, cursor.y - center.y) : 0;
            const pt3 = dcLen > 1e-9 && cursor
                ? { x: center.x + val * (cursor.x - center.x) / dcLen,
                    y: center.y + val * (cursor.y - center.y) / dcLen }
                : { x: center.x + val, y: center.y };
            this._commitCircle(center, val, pt3, "circle2pt", radiusExpr ?? undefined);
            this._reset();

        } else {
            // circle3pt: use P1/P2 chord + cursor side
            if (!this._pt1 || !this._pt2) { showError("Need two points"); return; }
            const dist = Math.hypot(this._pt2.x - this._pt1.x, this._pt2.y - this._pt1.y);
            if (val * 2 < dist - 1e-6) {
                showError(`Min: ${(dist / 2).toFixed(3)}`);
                return;
            }
            const cursorHint = cursor ?? this._pt2;
            const result = arc2ptData(this._pt1, this._pt2, val, cursorHint);
            if (!result) { showError("Radius too small"); return; }
            const { center, radius } = result;
            const dcLen = cursor ? Math.hypot(cursor.x - center.x, cursor.y - center.y) : 0;
            const pt3 = dcLen > 1e-9 && cursor
                ? { x: center.x + radius * (cursor.x - center.x) / dcLen,
                    y: center.y + radius * (cursor.y - center.y) / dcLen }
                : { x: center.x + radius, y: center.y };
            this._commitCircle(center, radius, pt3, "circle3pt", radiusExpr ?? undefined);
            this._reset();
        }
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
        popup.appendChild(inp);

        const hint = document.createElement("small");
        hint.className = "arc-radius-hint";
        popup.appendChild(hint);

        document.body.appendChild(popup);
        this._popup = popup;
        if (e) this._positionPopup(e);

        inp.addEventListener("focus", () => { this._inputFocused = true; inp.select(); });
        inp.addEventListener("blur",  () => { this._inputFocused = false; });

        inp.addEventListener("keydown", (ev) => {
            ev.stopPropagation();
            if (ev.key === "Tab") {
                ev.preventDefault();
                inp.blur();
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
