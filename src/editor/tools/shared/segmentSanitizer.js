import { isSegmentDegenerated } from "../../../operations/OffsetRules.js";

function num(v, d = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
}

/**
 * Remove degenerate contour segments from editor/runtime offset paths.
 *
 * Keeps only valid line/arc segments and drops point-collapsed arcs that can
 * otherwise survive parser rounding and reappear on sequential offsets.
 *
 * @param {Array} segments
 * @returns {Array}
 */
export function sanitizeParsedContourSegments(segments) {
    if (!Array.isArray(segments) || segments.length === 0) return [];

    return segments.filter((seg) => {
        if (!seg) return false;

        const start = seg.data?.start;
        const end = seg.data?.end;

        // Early point-collapse guard: if start≈end, drop immediately.
        if (start && end) {
            const dx = Number(end.x) - Number(start.x);
            const dy = Number(end.y) - Number(start.y);
            const chord2 = dx * dx + dy * dy;
            if (chord2 <= 1e-8) {
                return false;
            }
        }

        const normalized =
            seg.type === "line"
                ? { type: "line", start, end }
                : seg.type === "arc"
                  ? {
                        type: "arc",
                        start,
                        end,
                        arc: {
                            center: seg.data?.center,
                            radius: Math.abs(num(seg.data?.radius)),
                            startAngle: 0,
                            endAngle: Math.PI,
                            sweepFlag: Math.round(num(seg.data?.sweep, 1)),
                        },
                    }
                  : null;

        if (!normalized || isSegmentDegenerated(normalized)) return false;

        return true;
    });
}
