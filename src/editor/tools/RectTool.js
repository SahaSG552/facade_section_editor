import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { EV } from "../EditorVisualConfig.js";

const log = LoggerFactory.createLogger("RectTool");
const SVG_NS = "http://www.w3.org/2000/svg";

// ─── Ghost builders ──────────────────────────────────────────────────────────

/**
 * Build a ghost SVG group for a rectangle given two opposite corners.
 * @param {{x:number,y:number}} p1 - First corner
 * @param {{x:number,y:number}} p2 - Opposite corner
 * @param {number} [rx=0]          - Corner radius
 * @returns {SVGGElement}
 */
function buildRectGhost(p1, p2, rx = 0) {
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    const safeRx = Math.min(rx, w / 2, h / 2);

    const g = document.createElementNS(SVG_NS, "g");

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("rx", safeRx);
    rect.setAttribute("fill", "none");
    g.appendChild(rect);

    // Corner dots at p1 and p2
    for (const pt of [p1, p2]) {
        const dot = document.createElementNS(SVG_NS, "circle");
        dot.setAttribute("cx", pt.x);
        dot.setAttribute("cy", pt.y);
        dot.setAttribute("r", EV.r.ghostEndpoint);
        dot.classList.add(EV.cls.ghostEndpoint);
        g.appendChild(dot);
    }

    return g;
}

/**
 * Build a ghost SVG group for a rectangle with rounded corners given two opposite corners
 * and a corner-radius cursor hint position.
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @param {{x:number,y:number}} cursor - Used to derive the corner radius
 * @returns {SVGGElement}
 */
function buildRectGhostRadiusDrag(p1, p2, cursor) {
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    const maxR = Math.min(w, h) / 2;

    // Distance from nearest corner to cursor → radius
    const corners = [
        { x, y }, { x: x + w, y }, { x, y: y + h }, { x: x + w, y: y + h },
    ];
    const nearest = corners.reduce((best, c) => {
        const d = Math.hypot(cursor.x - c.x, cursor.y - c.y);
        return d < best.d ? { d, c } : best;
    }, { d: Infinity, c: corners[0] });
    const rx = Math.min(nearest.d, maxR);

    return buildRectGhost(p1, p2, rx);
}

// ─── RectTool ─────────────────────────────────────────────────────────────────

/**
 * RectTool — draw axis-aligned rectangles in two modes.
 *
 * **rect2pt** (LMB) — two opposite corners:
 *   1. Click → first corner (P1)
 *   2. Move  → ghost rectangle grows + dimension popup
 *   3. Click → commit (axis-aligned, zero corner radius)
 *
 * **rect3pt** (RMB) — two corners + corner radius:
 *   1. Click → first corner (P1)
 *   2. Move  → ghost rect + popup shows W × H
 *   3. Click → opposite corner placed (P2), popup shows R input
 *   4. Move  → corner radius derived from cursor distance to nearest corner
 *   5. Click → commit with corner radius
 *
 * ### Keyboard UX (while popup visible)
 * - **Tab**         — focus/blur popup input
 * - **Enter**       — commit using cursor or typed value
 * - **Escape**      — cancel / reset
 * - **Any digit/.** — auto-fill input and focus
 *
 * Produced segment:
 * `{ type:"rect", data:{ x, y, w, h, rx } }` where (x,y) is the top-left corner in SVG space.
 */
export default class RectTool extends BaseTool {
    /**
     * @param {"rect2pt"|"rect3pt"} [mode="rect2pt"]
     */
    constructor(mode = "rect2pt") {
        super();
        this._mode  = mode;
        this.id     = mode;

        /**
         * rect2pt phases:  0=idle  1=P1 placed (waiting for P2)
         * rect3pt phases:  0=idle  1=P1 placed  2=P2 placed (waiting for radius)
         * @private @type {0|1|2}
         */
        this._phase = 0;

        /** @private @type {{x:number,y:number}|null} First corner */
        this._pt1 = null;
        /** @private @type {{x:number,y:number}|null} Second corner (rect3pt phase 2) */
        this._pt2 = null;
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
        log.debug("RectTool activated, mode=", this._mode);
    }

    deactivate() {
        this._removePopup();
        super.deactivate();
        this._phase = 0; this._pt1 = null; this._pt2 = null;
        this._cursorPos = null; this._inputFocused = false;
    }

    hasActiveCommand() { return this._phase > 0; }

    // ─── Pointer events ───────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        if (this._mode === "rect2pt") {
            if (this._phase === 0) {
                this._pt1  = pos;
                this._phase = 1;
                this._showPopup(e, "dim");
            } else {
                // phase 1 → commit
                this._commitRect(this._pt1, pos, 0);
                this._reset();
            }
        } else {
            // rect3pt
            if (this._phase === 0) {
                this._pt1  = pos;
                this._phase = 1;
                this._showPopup(e, "dim");
            } else if (this._phase === 1) {
                this._pt2  = pos;
                this._phase = 2;
                this._showPopup(e, "radius");
            } else {
                // phase 2 → commit with radius from cursor
                const rx = this._radiusFromCursor(this._pt1, this._pt2, pos);
                this._commitRect(this._pt1, this._pt2, rx);
                this._reset();
            }
        }
    }

    onPointerMove(pos, e) {
        this._cursorPos = pos;
        if (this._popup && e) this._positionPopup(e);

        if (this._phase === 1 && this._pt1) {
            this.ctx.canvas.setGhost(buildRectGhost(this._pt1, pos));
            if (this._popup && !this._inputFocused) {
                const w = Math.abs(pos.x - this._pt1.x);
                const h = Math.abs(pos.y - this._pt1.y);
                const inp = this._popup.querySelector("input");
                if (inp) inp.value = `${w.toFixed(1)} × ${h.toFixed(1)}`;
            }
        } else if (this._phase === 2 && this._pt1 && this._pt2) {
            this.ctx.canvas.setGhost(buildRectGhostRadiusDrag(this._pt1, this._pt2, pos));
            if (this._popup && !this._inputFocused) {
                const rx = this._radiusFromCursor(this._pt1, this._pt2, pos);
                const inp = this._popup.querySelector("input");
                if (inp) inp.value = rx.toFixed(3);
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

        // Popup is only useful in the final phase
        const activePhase = this._mode === "rect2pt" ? 1 : 2;
        if (this._phase !== activePhase) return false;

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

    /**
     * Commit using current cursor position.
     * @private
     */
    _commitFromCursor() {
        if (!this._pt1 || !this._cursorPos) return;
        if (this._mode === "rect2pt") {
            this._commitRect(this._pt1, this._cursorPos, 0);
        } else if (this._phase === 2 && this._pt2) {
            const rx = this._radiusFromCursor(this._pt1, this._pt2, this._cursorPos);
            this._commitRect(this._pt1, this._pt2, rx);
        }
        this._reset();
    }

    /**
     * Commit a rect segment to state.
     * @param {{x:number,y:number}} p1
     * @param {{x:number,y:number}} p2
     * @param {number} rx
     * @private
     */
    _commitRect(p1, p2, rx) {
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        if (w < 1e-6 || h < 1e-6) { log.warn("RectTool: zero-size rect — skipping"); return; }
        const safeRx = Math.max(0, Math.min(rx, w / 2, h / 2));
        this.ctx.state.addSegment({
            type: "rect",
            data: { x, y, w, h, rx: safeRx },
        });
        log.debug("RectTool: committed", { x, y, w, h, rx: safeRx });
    }

    /**
     * Derive corner radius from cursor proximity to the nearest corner of the rect.
     * @param {{x:number,y:number}} p1
     * @param {{x:number,y:number}} p2
     * @param {{x:number,y:number}} cursor
     * @returns {number}
     * @private
     */
    _radiusFromCursor(p1, p2, cursor) {
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        const maxR = Math.min(w, h) / 2;
        const corners = [
            { x, y }, { x: x + w, y }, { x, y: y + h }, { x: x + w, y: y + h },
        ];
        const dists = corners.map(c => Math.hypot(cursor.x - c.x, cursor.y - c.y));
        const minD  = Math.min(...dists);
        return Math.min(minD, maxR);
    }

    // ─── Floating dimension / radius popup ────────────────────────────────────

    /**
     * Show a floating popup.
     * @param {MouseEvent} e
     * @param {"dim"|"radius"} kind — "dim" shows a read-only W×H field; "radius" shows R input
     * @private
     */
    _showPopup(e, kind) {
        this._removePopup();
        this._inputFocused = false;

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = kind === "radius" ? "R =" : "W×H =";
        popup.appendChild(label);

        const inp = document.createElement("input");
        inp.type      = "text";
        inp.inputMode = "decimal";
        inp.className = "arc-radius-input";
        inp.readOnly  = kind === "dim"; // Dimensions are display-only while dragging
        popup.appendChild(inp);

        const hint = document.createElement("small");
        hint.className = "arc-radius-hint";
        popup.appendChild(hint);

        document.body.appendChild(popup);
        this._popup = popup;
        if (e) this._positionPopup(e);

        if (kind === "radius") {
            inp.readOnly = false;
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
    }

    /**
     * Commit using the radius value typed in the popup.
     * @param {HTMLInputElement} inp
     * @param {HTMLElement} hint
     * @private
     */
    _commitFromInput(inp, hint) {
        const val = parseFloat(inp.value.trim());
        if (isNaN(val) || val < 0) {
            inp.classList.add("arc-radius-error");
            if (hint) hint.textContent = "Enter a number ≥ 0";
            setTimeout(() => inp.classList.remove("arc-radius-error"), 2000);
            return;
        }
        if (!this._pt1 || !this._pt2) return;
        this._commitRect(this._pt1, this._pt2, val);
        this._reset();
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
