import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { EV } from "../EditorVisualConfig.js";

const log = LoggerFactory.createLogger("EllipseTool");
const SVG_NS = "http://www.w3.org/2000/svg";

// ─── Ghost builders ───────────────────────────────────────────────────────────

/**
 * Build a ghost SVG group for an ellipse.
 * @param {{x:number,y:number}} center
 * @param {number} rx - Horizontal radius
 * @param {number} ry - Vertical radius
 * @returns {SVGGElement}
 */
function buildEllipseGhost(center, rx, ry) {
    const g = document.createElementNS(SVG_NS, "g");

    const el = document.createElementNS(SVG_NS, "ellipse");
    el.setAttribute("cx", center.x);
    el.setAttribute("cy", center.y);
    el.setAttribute("rx", rx);
    el.setAttribute("ry", ry);
    el.setAttribute("fill", "none");
    g.appendChild(el);

    // Center dot
    const cdot = document.createElementNS(SVG_NS, "circle");
    cdot.setAttribute("cx", center.x);
    cdot.setAttribute("cy", center.y);
    cdot.setAttribute("r", EV.r.ghostCenter);
    cdot.classList.add(EV.cls.ghostCenter);
    g.appendChild(cdot);

    // rx handle (right side)
    const rxPt = { x: center.x + rx, y: center.y };
    const rxDot = document.createElementNS(SVG_NS, "circle");
    rxDot.setAttribute("cx", rxPt.x);
    rxDot.setAttribute("cy", rxPt.y);
    rxDot.setAttribute("r", EV.r.ghostEndpoint);
    rxDot.classList.add(EV.cls.ghostEndpoint);
    g.appendChild(rxDot);

    // ry handle (bottom side)
    const ryPt = { x: center.x, y: center.y + ry };
    const ryDot = document.createElementNS(SVG_NS, "circle");
    ryDot.setAttribute("cx", ryPt.x);
    ryDot.setAttribute("cy", ryPt.y);
    ryDot.setAttribute("r", EV.r.ghostEndpoint);
    ryDot.classList.add(EV.cls.ghostEndpoint);
    g.appendChild(ryDot);

    // Dashed axis lines: center → rx handle, center → ry handle
    for (const [tx, ty] of [[rxPt.x, rxPt.y], [ryPt.x, ryPt.y]]) {
        const dash = document.createElementNS(SVG_NS, "line");
        dash.setAttribute("x1", center.x); dash.setAttribute("y1", center.y);
        dash.setAttribute("x2", tx);       dash.setAttribute("y2", ty);
        dash.classList.add(EV.cls.ghostRadius);
        g.appendChild(dash);
    }

    return g;
}

// ─── EllipseTool ─────────────────────────────────────────────────────────────

/**
 * EllipseTool — draw ellipse segments in two modes.
 *
 * **ellipse2pt** (LMB) — center + single radius point:
 *   1. Click → center
 *   2. Move  → ghost circle (rx = ry = dist) + radius popup
 *   3. Click → commit ellipse (rx = ry = dist; edit ry in text editor)
 *
 * **ellipse3pt** (RMB) — center + rx point + ry distance:
 *   1. Click → center
 *   2. Move  → ghost growing circle; Click → set rx
 *   3. Move  → ghost ellipse with ry from cursor Y distance
 *   4. Click → commit with separate rx and ry
 *
 * Produced segment:
 * `{ type:"ellipse", data:{ cx, cy, rx, ry } }`
 */
export default class EllipseTool extends BaseTool {
    /**
     * @param {"ellipse2pt"|"ellipse3pt"} [mode="ellipse2pt"]
     */
    constructor(mode = "ellipse2pt") {
        super();
        this._mode  = mode;
        this.id     = mode;

        /**
         * ellipse2pt phases:  0=idle  1=center placed (waiting for radius)
         * ellipse3pt phases:  0=idle  1=center placed (waiting for rx)  2=rx placed (waiting for ry)
         * @private @type {0|1|2}
         */
        this._phase = 0;

        /** @private @type {{x:number,y:number}|null} center */
        this._center   = null;
        /** @private @type {number} horizontal radius (set in phase 2 of ellipse3pt) */
        this._rx        = 0;
        /** @private @type {{x:number,y:number}|null} Latest cursor position */
        this._cursorPos = null;

        /** @private — true while popup input has keyboard focus */
        this._inputFocused = false;
        /** @private @type {HTMLElement|null} */
        this._popup = null;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    activate(ctx) {
        super.activate(ctx);
        this._reset();
        log.debug("EllipseTool activated, mode=", this._mode);
    }

    deactivate() {
        this._removePopup();
        super.deactivate();
        this._phase = 0; this._center = null; this._rx = 0;
        this._cursorPos = null; this._inputFocused = false;
    }

    hasActiveCommand() { return this._phase > 0; }

    // ─── Pointer events ───────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        if (this._mode === "ellipse2pt") {
            if (this._phase === 0) {
                this._center = pos;
                this._phase  = 1;
                this._showPopup(e);
            } else {
                // phase 1 → commit (rx = ry = dist)
                const r = Math.hypot(pos.x - this._center.x, pos.y - this._center.y);
                this._commitEllipse(this._center, r, r);
                this._reset();
            }
        } else {
            // ellipse3pt
            if (this._phase === 0) {
                this._center = pos;
                this._phase  = 1;
                this._showPopup(e);
            } else if (this._phase === 1) {
                this._rx    = Math.hypot(pos.x - this._center.x, pos.y - this._center.y);
                if (this._rx < 1e-6) return;
                this._phase = 2;
                this._showPopup(e);
            } else {
                // phase 2 → commit with ry = |cursor.y - center.y|
                const ry = Math.abs(pos.y - this._center.y);
                this._commitEllipse(this._center, this._rx, ry);
                this._reset();
            }
        }
    }

    onPointerMove(pos, e) {
        this._cursorPos = pos;
        if (this._popup && e) this._positionPopup(e);

        if (!this._center) return;

        if (this._phase === 1) {
            const r = Math.hypot(pos.x - this._center.x, pos.y - this._center.y);
            if (r > 1e-6) {
                this.ctx.canvas.setGhost(buildEllipseGhost(this._center, r, r));
                if (this._popup && !this._inputFocused) {
                    const inp = this._popup.querySelector("input");
                    if (inp) inp.value = r.toFixed(3);
                }
            }
        } else if (this._phase === 2) {
            const ry = Math.abs(pos.y - this._center.y);
            this.ctx.canvas.setGhost(buildEllipseGhost(this._center, this._rx, Math.max(ry, 1e-6)));
            if (this._popup && !this._inputFocused) {
                const inp = this._popup.querySelector("input");
                if (inp) inp.value = ry.toFixed(3);
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

        if (this._phase === 0) return false;

        if (e.key === "Tab") {
            e.preventDefault();
            if (!this._inputFocused) {
                const inp = this._popup?.querySelector("input");
                if (inp) { inp.focus(); inp.select(); }
            }
            return true;
        }

        if (e.key === "Enter" && !this._inputFocused && this._cursorPos) {
            this._commitFromCursor();
            return true;
        }

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
    _commitFromCursor() {
        if (!this._center || !this._cursorPos) return;
        if (this._mode === "ellipse2pt" && this._phase === 1) {
            const r = Math.hypot(this._cursorPos.x - this._center.x, this._cursorPos.y - this._center.y);
            this._commitEllipse(this._center, r, r);
        } else if (this._mode === "ellipse3pt" && this._phase === 2) {
            const ry = Math.abs(this._cursorPos.y - this._center.y);
            this._commitEllipse(this._center, this._rx, ry);
        }
        this._reset();
    }

    /**
     * Add an ellipse segment to state.
     * @param {{x:number,y:number}} center
     * @param {number} rx
     * @param {number} ry
     * @private
     */
    _commitEllipse(center, rx, ry) {
        if (rx < 1e-6 || ry < 1e-6) { log.warn("EllipseTool: near-zero radius — skipping"); return; }
        this.ctx.state.addSegment({
            type: "ellipse",
            data: { cx: center.x, cy: center.y, rx, ry },
        });
        log.debug("EllipseTool: committed", { cx: center.x, cy: center.y, rx, ry });
    }

    // ─── Floating radius popup ────────────────────────────────────────────────

    /** @private */
    _showPopup(e) {
        this._removePopup();
        this._inputFocused = false;

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = this._phase === 1 ? "Rx =" : "Ry =";
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
                this._commitFromInput(inp, hint);
            } else if (ev.key === "Escape") {
                this._reset();
            }
        });
    }

    /** @private */
    _commitFromInput(inp, hint) {
        const val = parseFloat(inp.value.trim());
        if (isNaN(val) || val <= 0) {
            inp.classList.add("arc-radius-error");
            if (hint) hint.textContent = "Enter a positive number";
            setTimeout(() => inp.classList.remove("arc-radius-error"), 2000);
            return;
        }

        if (!this._center) return;

        if (this._mode === "ellipse2pt") {
            this._commitEllipse(this._center, val, val);
            this._reset();
        } else if (this._phase === 1) {
            // rx committed; switch to phase 2
            this._rx    = val;
            this._phase = 2;
            this._showPopup(null);         // refresh label to "Ry ="
        } else if (this._phase === 2) {
            this._commitEllipse(this._center, this._rx, val);
            this._reset();
        }
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
        this._phase = 0; this._center = null; this._rx = 0;
        this._cursorPos = null; this._inputFocused = false;
        this._removePopup();
        this.ctx?.canvas.clearGhost();
    }
}
