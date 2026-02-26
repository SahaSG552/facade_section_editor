import BaseTool from "./BaseTool.js";
import LoggerFactory from "../../core/LoggerFactory.js";
import { EV } from "../EditorVisualConfig.js";
import { evaluateMathExpression } from "../../utils/utils.js";

const log = LoggerFactory.createLogger("RectTool");
const SVG_NS = "http://www.w3.org/2000/svg";

// ─── Ghost builders ──────────────────────────────────────────────────────────

function _line(a, b, cls = null) {
    const l = document.createElementNS(SVG_NS, "line");
    l.setAttribute("x1", a.x);
    l.setAttribute("y1", a.y);
    l.setAttribute("x2", b.x);
    l.setAttribute("y2", b.y);
    if (cls) l.classList.add(cls);
    return l;
}

function _dot(p) {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.setAttribute("r", EV.r.ghostEndpoint);
    c.classList.add(EV.cls.ghostEndpoint);
    return c;
}

/**
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @returns {{x:number,y:number}[]}
 */
function _axisAlignedCorners(p1, p2) {
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;
    return [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
    ];
}

/**
 * @param {{x:number,y:number}[]} corners
 * @returns {SVGGElement}
 */
function _buildPolygonGhost(corners) {
    const g = document.createElementNS(SVG_NS, "g");
    for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        g.appendChild(_line(a, b));
    }
    for (const c of corners) g.appendChild(_dot(c));
    return g;
}

/**
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @returns {SVGGElement}
 */
function _buildWidthGhost(p1, p2) {
    const g = document.createElementNS(SVG_NS, "g");
    g.appendChild(_line(p1, p2));
    g.appendChild(_dot(p1));
    g.appendChild(_dot(p2));
    return g;
}

/**
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @param {number} heightSigned
 * @returns {{x:number,y:number}[]|null}
 */
function _orientedRectCorners(p1, p2, heightSigned) {
    const vx = p2.x - p1.x;
    const vy = p2.y - p1.y;
    const len = Math.hypot(vx, vy);
    if (len < 1e-9) return null;
    const nx = -vy / len;
    const ny =  vx / len;
    const off = { x: nx * heightSigned, y: ny * heightSigned };
    return [
        { x: p1.x, y: p1.y },
        { x: p2.x, y: p2.y },
        { x: p2.x + off.x, y: p2.y + off.y },
        { x: p1.x + off.x, y: p1.y + off.y },
    ];
}

// ─── RectTool ─────────────────────────────────────────────────────────────────

/**
 * RectTool — draw rectangles in two modes.
 *
 * **rect2pt**:
 *   1. Click → first corner
 *   2. Move  → ghost axis-aligned rectangle + width input
 *   3. Enter width → height input (or click to finish from cursor)
 *   4. Enter height → commit
 *
 * **rect3pt**:
 *   1. Click → first corner
 *   2. Move  → ghost width line + width input
 *   3. Click → width line fixed (P2)
 *   4. Move  → ghost rectangle by perpendicular height + height input
 *   5. Click or Enter height → commit
 *
 * ### Cancel / step-back UX
 * - **RMB**: return to previous step; if no previous step, cancel command.
 * - **ESC**: cancel command.
 *
 * Produced geometry: 4 line segments in one contour.
 */
export default class RectTool extends BaseTool {
    /**
     * @param {"rect2pt"|"rect3pt"} [mode="rect2pt"]
     */
    constructor(mode = "rect2pt") {
        super();
        this._mode  = mode;
        this.id     = mode;

        /** @private @type {0|1|2} */
        this._phase = 0;

        /** @private @type {{x:number,y:number}|null} */
        this._pt1 = null;
        /** @private @type {{x:number,y:number}|null} */
        this._pt2 = null;
        /** @private @type {{x:number,y:number}|null} */
        this._cursorPos = null;

        /** @private @type {number|null} */
        this._fixedWidth = null;
        /** @private @type {number|null} */
        this._fixedHeight = null;

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
        this._fixedWidth = null; this._fixedHeight = null;
    }

    hasActiveCommand() { return this._phase > 0; }

    /**
     * Rect2pt must ignore ortho snap while placing the second point.
     * Keep other snap types by recomputing snap with ortho disabled.
     * @private
     * @param {{x:number,y:number}} pos
     * @param {MouseEvent} [e]
     * @returns {{x:number,y:number}}
     */
    _toolPos(pos, e) {
        if (this._mode !== "rect2pt" || !e || !this.ctx?.canvas?.snapManager) return pos;
        const raw = this.ctx.canvas.screenToSVG(e);
        const sm = this.ctx.canvas.snapManager;
        const wasOrtho = !!sm.enabled.ortho;
        sm.enabled.ortho = false;
        const snapped = sm.snap(raw, this._pt1 ?? null, this.ctx.state?.segments ?? [], e);
        sm.enabled.ortho = wasOrtho;
        return { x: snapped.x, y: snapped.y };
    }

    // ─── Pointer events ───────────────────────────────────────────────────────

    onPointerDown(pos, e) {
        const p = this._toolPos(pos, e);
        if (this._mode === "rect2pt") {
            if (this._phase === 0) {
                this._pt1  = p;
                this._phase = 1;
                this._showPopup(e, "width");
            } else if (this._phase === 1) {
                this._commitRect2ptFromCursor(p);
                this._reset();
            } else if (this._phase === 2) {
                this._commitRect2ptFromCursor(p);
                this._reset();
            }
        } else {
            if (this._phase === 0) {
                this._pt1  = p;
                this._phase = 1;
                this._showPopup(e, "width");
            } else if (this._phase === 1) {
                this._pt2  = this._resolveRect3ptP2(p);
                this._phase = 2;
                this._showPopup(e, "height");
            } else if (this._phase === 2) {
                this._commitRect3ptFromCursor(p);
                this._reset();
            }
        }
    }

    onPointerMove(pos, e) {
        const p = this._toolPos(pos, e);
        this._cursorPos = p;
        if (this._popup && e) this._positionPopup(e);

        if (!this._pt1) return;

        if (this._mode === "rect2pt") {
            if (this._phase === 1) {
                const corners = _axisAlignedCorners(this._pt1, p);
                this.ctx.canvas.setGhost(_buildPolygonGhost(corners));
                this._setPopupValue(Math.abs(p.x - this._pt1.x));
            } else if (this._phase === 2 && this._fixedWidth != null) {
                const p2 = this._rect2ptP2FromWidthAndCursor(this._fixedWidth, p);
                const corners = _axisAlignedCorners(this._pt1, p2);
                this.ctx.canvas.setGhost(_buildPolygonGhost(corners));
                this._setPopupValue(Math.abs(p.y - this._pt1.y));
            }
            return;
        }

        if (this._phase === 1) {
            const p2 = this._resolveRect3ptP2(p);
            this.ctx.canvas.setGhost(_buildWidthGhost(this._pt1, p2));
            const w = Math.hypot(p2.x - this._pt1.x, p2.y - this._pt1.y);
            this._setPopupValue(w);
        } else if (this._phase === 2 && this._pt2) {
            const hSigned = this._rect3ptHeightSigned(p);
            const corners = _orientedRectCorners(this._pt1, this._pt2, hSigned);
            if (corners) this.ctx.canvas.setGhost(_buildPolygonGhost(corners));
            this._setPopupValue(Math.abs(hSigned));
        }
    }

    onPointerUp(_pos, _e) {}

    onConfirm(_pos, _e) {
        if (this._phase === 0) return false;

        if (this._phase === 2) {
            this._phase = 1;
            this._pt2 = null;
            this._fixedHeight = null;
            this._showPopup(_e, "width");
            if (this._cursorPos) this.onPointerMove(this._cursorPos, _e);
            return true;
        }

        this._reset();
        return true;
    }

    onDblClick(_pos, _e) {
        if (this._mode === "rect2pt" && this._phase > 0) {
            this._reset();
            return;
        }
        if (this._mode === "rect3pt" && this._phase > 0) {
            this._reset();
        }
    }

    onKeyDown(e) {
        if (e.key === "Escape") {
            if (this._phase > 0) {
                this._reset();
                return true;
            }
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

        if (!this._inputFocused && e.key.length === 1 && /[\d.\-+{}a-zA-Z_/*()]/.test(e.key)) {
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

    _commitRect2ptFromCursor(cursor) {
        if (!this._pt1) return;
        if (this._phase === 1) {
            const corners = _axisAlignedCorners(this._pt1, cursor);
            this._commitAsLines(corners);
            return;
        }
        if (this._phase === 2 && this._fixedWidth != null) {
            const p2 = this._rect2ptP2FromWidthAndCursor(this._fixedWidth, cursor);
            const corners = _axisAlignedCorners(this._pt1, p2);
            this._commitAsLines(corners);
        }
    }

    _commitRect3ptFromCursor(cursor) {
        if (!this._pt1 || !this._pt2) return;
        const hSigned = this._fixedHeight != null
            ? this._signedHeightFromMagnitude(this._fixedHeight, cursor)
            : this._rect3ptHeightSigned(cursor);
        const corners = _orientedRectCorners(this._pt1, this._pt2, hSigned);
        if (!corners) return;
        this._commitAsLines(corners);
    }

    /**
     * @param {number} width
     * @param {{x:number,y:number}} cursor
     * @returns {{x:number,y:number}}
     */
    _rect2ptP2FromWidthAndCursor(width, cursor) {
        const xDir = (cursor.x - this._pt1.x) >= 0 ? 1 : -1;
        return { x: this._pt1.x + xDir * Math.abs(width), y: cursor.y };
    }

    /**
     * @param {{x:number,y:number}} cursor
     * @returns {{x:number,y:number}}
     */
    _resolveRect3ptP2(cursor) {
        if (!this._pt1) return cursor;
        if (this._fixedWidth == null) return cursor;
        const vx = cursor.x - this._pt1.x;
        const vy = cursor.y - this._pt1.y;
        const len = Math.hypot(vx, vy);
        if (len < 1e-9) return { x: this._pt1.x + this._fixedWidth, y: this._pt1.y };
        return {
            x: this._pt1.x + (vx / len) * this._fixedWidth,
            y: this._pt1.y + (vy / len) * this._fixedWidth,
        };
    }

    /**
     * @param {{x:number,y:number}} cursor
     * @returns {number}
     */
    _rect3ptHeightSigned(cursor) {
        const vx = this._pt2.x - this._pt1.x;
        const vy = this._pt2.y - this._pt1.y;
        const len = Math.hypot(vx, vy);
        if (len < 1e-9) return 0;
        const nx = -vy / len;
        const ny =  vx / len;
        return (cursor.x - this._pt1.x) * nx + (cursor.y - this._pt1.y) * ny;
    }

    /**
     * @param {number} h
     * @param {{x:number,y:number}} cursor
     * @returns {number}
     */
    _signedHeightFromMagnitude(h, cursor) {
        const sign = this._rect3ptHeightSigned(cursor) >= 0 ? 1 : -1;
        return sign * Math.abs(h);
    }

    /**
     * @param {{x:number,y:number}[]} corners
     */
    _commitAsLines(corners) {
        if (!this.ctx?.state || !Array.isArray(corners) || corners.length !== 4) return;
        const edges = [
            [corners[0], corners[1]],
            [corners[1], corners[2]],
            [corners[2], corners[3]],
            [corners[3], corners[0]],
        ];
        const minEdge = Math.min(...edges.map(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y)));
        if (minEdge < 1e-6) {
            log.warn("RectTool: degenerate rectangle — skipping");
            return;
        }

        const st = this.ctx.state;
        const contourId = st.activeContourId ?? st._nextContourId++;
        const createdIds = [];
        for (const [start, end] of edges) {
            const id = `seg-${st._nextSegmentId++}`;
            st.segments.push({
                id,
                selected: false,
                contourId,
                type: "line",
                data: { start: { ...start }, end: { ...end } },
                cmdHint: "L",
            });
            createdIds.push(id);
        }
        st.insertAfterSegId = createdIds[createdIds.length - 1] ?? null;
        st._pushHistory("Add rectangle");
        st._notifySegments();
        st.setSelection(createdIds);
        log.debug("RectTool: committed rectangle contour", { contourId });
    }

    // ─── Floating dimension / radius popup ────────────────────────────────────

    /**
     * Show/update a floating popup.
     * @param {MouseEvent} e
     * @param {"width"|"height"} kind
     * @private
     */
    _showPopup(e, kind) {
        this._removePopup();
        this._inputFocused = false;

        const popup = document.createElement("div");
        popup.className = "arc-radius-popup";

        const label = document.createElement("span");
        label.textContent = kind === "width" ? "W =" : "H =";
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
                this._commitFromInput(inp, hint, kind);
            } else if (ev.key === "Escape") {
                this._reset();
            }
        });
    }

    /**
     * Parse number/formula input.
     * @param {HTMLInputElement} inp
     * @param {HTMLElement} hint
     * @param {"width"|"height"} kind
     * @private
     */
    _commitFromInput(inp, hint, kind) {
        const raw = (inp.value ?? "").trim();
        const val = this._parseInputValue(raw);
        if (!Number.isFinite(val) || val <= 0) {
            inp.classList.add("arc-radius-error");
            if (hint) hint.textContent = "Enter a number > 0";
            setTimeout(() => inp.classList.remove("arc-radius-error"), 2000);
            return;
        }

        if (this._mode === "rect2pt") {
            if (kind === "width" && this._phase === 1) {
                this._fixedWidth = val;
                this._phase = 2;
                this._showPopup(null, "height");
                return;
            }
            if (kind === "height" && this._phase === 2) {
                this._fixedHeight = val;
                if (!this._pt1) return;
                const cursor = this._cursorPos ?? { x: this._pt1.x + this._fixedWidth, y: this._pt1.y + val };
                const yDir = (cursor.y - this._pt1.y) >= 0 ? 1 : -1;
                const p2 = {
                    x: this._pt1.x + ((cursor.x - this._pt1.x) >= 0 ? 1 : -1) * Math.abs(this._fixedWidth ?? 0),
                    y: this._pt1.y + yDir * Math.abs(val),
                };
                this._commitAsLines(_axisAlignedCorners(this._pt1, p2));
                this._reset();
            }
            return;
        }

        if (this._mode === "rect3pt") {
            if (kind === "width" && this._phase === 1) {
                this._fixedWidth = val;
                if (this._cursorPos) this.onPointerMove(this._cursorPos, null);
                return;
            }
            if (kind === "height" && this._phase === 2) {
                this._fixedHeight = val;
                const cursor = this._cursorPos ?? this._pt1;
                this._commitRect3ptFromCursor(cursor);
                this._reset();
            }
        }
    }

    /**
     * @param {string} raw
     * @returns {number}
     */
    _parseInputValue(raw) {
        if (!raw) return NaN;
        const direct = Number(raw);
        if (Number.isFinite(direct)) return direct;

        const vars = this.ctx?.state?.variableValues ?? {};
        try {
            const expr = raw.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, n) => {
                const v = vars[n];
                return v !== undefined && !Number.isNaN(Number(v)) ? String(v) : "0";
            });
            const v = Number(evaluateMathExpression(expr));
            return Number.isFinite(v) ? v : NaN;
        } catch (_) {
            return NaN;
        }
    }

    /**
     * @param {number} value
     */
    _setPopupValue(value) {
        if (!this._popup || this._inputFocused) return;
        const inp = this._popup.querySelector("input");
        if (inp) inp.value = Number(value).toFixed(3);
    }

    /** @private */
    _positionPopup(e) {
        if (!this._popup) return;
        if (!e) return;
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
        this._fixedWidth = null; this._fixedHeight = null;
        this._removePopup();
        this.ctx?.canvas.clearGhost();
    }
}
