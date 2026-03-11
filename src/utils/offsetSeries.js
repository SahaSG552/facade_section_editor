/**
 * Build an arithmetic partial series where the last item equals `total`.
 * Used by multi-step depth/offset previews (e.g. VC phantom passes, OffsetMultiple).
 *
 * @param {number} total
 * @param {number} steps
 * @returns {number[]}
 */
export function buildPartialSeries(total, steps) {
    const count = Math.max(1, Number.isFinite(Number(steps)) ? Math.floor(Number(steps)) : 1);
    const t = Number.isFinite(Number(total)) ? Number(total) : 0;
    const out = [];
    for (let i = 0; i < count; i++) {
        out.push((t * (i + 1)) / count);
    }
    return out;
}

/**
 * Build signed offset distances for multiple offset preview/commit.
 *
 * @param {number} distance
 * @param {number} count
 * @returns {number[]}
 */
export function buildOffsetDistanceSeries(distance, count) {
    return buildPartialSeries(distance, count);
}
