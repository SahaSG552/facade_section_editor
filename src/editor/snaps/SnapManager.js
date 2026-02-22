/**
 * SnapManager — computes the snapped position for a raw pointer input.
 *
 * Snap types (applied in priority order):
 * 1. **Grid** — round to nearest grid increment
 * 2. **Ortho** — constrain to horizontal/vertical from previous point (when Shift held)
 * 3. **Angle** — constrain to 15° increments from previous point (when Alt held)
 * 4. **Endpoint** — snap to an existing segment endpoint within tolerance
 * 5. **Midpoint** — snap to the midpoint of an existing segment
 * 6. **Center** — snap to center of arc/circle
 * 7. **Intersection** — snap to the intersection of two segments
 *
 * ### Usage
 * ```js
 * const snap = new SnapManager(canvasManager);
 * snap.setEnabled("grid", true);
 * snap.setEnabled("obj", true);
 * const snapped = snap.snap(rawPos, prevPoint, segments);
 * ```
 */
export default class SnapManager {
    /**
     * @param {import("../../canvas/CanvasManager.js").default} canvasManager
     */
    constructor(canvasManager) {
        this.cm = canvasManager;

        /**
         * Which snap types are currently active.
         * @type {Record<string, boolean>}
         */
        this.enabled = {
            grid:  true,
            ortho: true,
            angle: false,
            obj:   false,
        };

        /**
         * Radius in screen pixels within which object-snap will activate.
         * @type {number}
         */
        this.objectSnapRadius = 8;
    }

    // ─── Configuration ──────────────────────────────────────────────────────

    /**
     * Enable or disable a specific snap type.
     * @param {"grid"|"ortho"|"angle"|"obj"} type
     * @param {boolean} active
     */
    setEnabled(type, active) {
        this.enabled[type] = active;
    }

    // ─── Main entry point ────────────────────────────────────────────────────

    /**
     * Compute the best snapped position for a raw pointer position.
     *
     * Priority: object snaps > ortho/angle > grid.
     *
     * @param {{ x: number, y: number }}       pos         - Raw SVG user-space position
     * @param {{ x: number, y: number }|null}  [prevPoint] - Previous anchor (for ortho/angle snap)
     * @param {import("../EditorStateManager.js").PathSegment[]} [segments] - For object-snap candidates
     * @param {KeyboardEvent|MouseEvent|null}  [event]     - Held modifier keys
     * @returns {{ x: number, y: number, snapType: string|null }}
     */
    snap(pos, prevPoint = null, segments = [], event = null) {
        let result = { ...pos, snapType: null };

        // 1. Object snaps (highest priority, preempt other snaps)
        if (this.enabled.obj && segments.length > 0) {
            const objSnap = this._objectSnap(pos, segments);
            if (objSnap) return objSnap;
        }

        // 2. Grid snap
        if (this.enabled.grid) {
            result = this._gridSnap(result);
            result.snapType = "grid";
        }

        // 3. Ortho constraint (holds Shift or ortho mode enabled globally)
        const shiftHeld = event?.shiftKey ?? false;
        if (prevPoint && (this.enabled.ortho || shiftHeld)) {
            result = this._orthoSnap(result, prevPoint);
            result.snapType = "ortho";
        }

        // 4. Angle constraint (holds Alt)
        const altHeld = event?.altKey ?? false;
        if (prevPoint && (this.enabled.angle || altHeld)) {
            result = this._angleSnap(result, prevPoint);
            result.snapType = "angle";
        }

        return result;
    }

    // ─── Snap implementations ────────────────────────────────────────────────

    /**
     * Round both coordinates to the nearest grid increment.
     * @param {{ x: number, y: number }} pos
     * @returns {{ x: number, y: number, snapType: string }}
     * @private
     */
    _gridSnap(pos) {
        const g = this.cm.config.gridSize || 1;
        return {
            x: Math.round(pos.x / g) * g,
            y: Math.round(pos.y / g) * g,
            snapType: "grid",
        };
    }

    /**
     * Constrain to horizontal or vertical from prevPoint (whichever axis is closer).
     * @param {{ x: number, y: number }} pos
     * @param {{ x: number, y: number }} prev
     * @returns {{ x: number, y: number, snapType: string }}
     * @private
     */
    _orthoSnap(pos, prev) {
        const dx = Math.abs(pos.x - prev.x);
        const dy = Math.abs(pos.y - prev.y);
        if (dx >= dy) {
            return { x: pos.x, y: prev.y, snapType: "ortho" };
        } else {
            return { x: prev.x, y: pos.y, snapType: "ortho" };
        }
    }

    /**
     * Constrain angle from prevPoint to the nearest 15° increment.
     * @param {{ x: number, y: number }} pos
     * @param {{ x: number, y: number }} prev
     * @returns {{ x: number, y: number, snapType: string }}
     * @private
     */
    _angleSnap(pos, prev) {
        const dx = pos.x - prev.x;
        const dy = pos.y - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1e-6) return { ...pos, snapType: "angle" };

        const angle = Math.atan2(dy, dx);
        const step = Math.PI / 12; // 15°
        const snappedAngle = Math.round(angle / step) * step;
        return {
            x: prev.x + dist * Math.cos(snappedAngle),
            y: prev.y + dist * Math.sin(snappedAngle),
            snapType: "angle",
        };
    }

    /**
     * Find the nearest object-snap candidate (endpoint, midpoint, center) within tolerance.
     * @param {{ x: number, y: number }} pos
     * @param {import("../EditorStateManager.js").PathSegment[]} segments
     * @returns {{ x: number, y: number, snapType: string }|null}
     * @private
     */
    _objectSnap(pos, segments) {
        const toleranceUnits = this.objectSnapRadius / this.cm.zoomLevel;
        let bestDist = toleranceUnits;
        let bestPoint = null;
        let bestType = null;

        for (const seg of segments) {
            const candidates = this._getCandidatePoints(seg);
            for (const { point, type } of candidates) {
                const d = Math.hypot(pos.x - point.x, pos.y - point.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestPoint = point;
                    bestType = type;
                }
            }
        }

        return bestPoint ? { ...bestPoint, snapType: bestType } : null;
    }

    /**
     * Extract snap candidate points from a segment (endpoints, midpoint, center).
     * @param {import("../EditorStateManager.js").PathSegment} seg
     * @returns {{ point: {x:number, y:number}, type: string }[]}
     * @private
     */
    _getCandidatePoints(seg) {
        // TODO: implement per-type candidate extraction
        return [];
    }
}
