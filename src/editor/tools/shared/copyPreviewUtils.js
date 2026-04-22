export function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

const CONTOUR_CONNECT_EPS = 1e-6;

function _pointNear(a, b, eps = CONTOUR_CONNECT_EPS) {
    if (!a || !b) return false;
    const ax = Number(a.x);
    const ay = Number(a.y);
    const bx = Number(b.x);
    const by = Number(b.y);
    if (![ax, ay, bx, by].every(Number.isFinite)) return false;
    return Math.hypot(ax - bx, ay - by) <= eps;
}

function _segmentEndpoints(seg) {
    if (!seg || (seg.type !== "line" && seg.type !== "arc")) return null;
    const start = seg?.data?.start;
    const end = seg?.data?.end;
    if (!start || !end) return null;
    if (![start.x, start.y, end.x, end.y].every((n) => Number.isFinite(Number(n)))) return null;
    return {
        start: { x: Number(start.x), y: Number(start.y) },
        end: { x: Number(end.x), y: Number(end.y) },
    };
}

/**
 * Build detached segment snapshots for the provided ids from current state.
 * Snapshots keep geometry/transforms but are always unselected.
 * @param {import('../../EditorStateManager.js').default} state
 * @param {string[]} segmentIds
 * @returns {Array<object>}
 */
export function collectSegmentSnapshots(state, segmentIds) {
    const ids = Array.isArray(segmentIds) ? [...new Set(segmentIds)] : [];
    if (!state || ids.length === 0) return [];
    const idSet = new Set(ids);
    return state.segments
        .filter((seg) => idSet.has(seg?.id))
        .filter(Boolean)
        .map((seg) => ({
            ...seg,
            selected: false,
            data: deepClone(seg.data),
            transforms: Array.isArray(seg.transforms) ? deepClone(seg.transforms) : [],
        }));
}

/**
 * Materialize new copied segments from detached snapshots.
 * Assigns fresh segment ids and remaps contour ids consistently per source contour.
 * @param {import('../../EditorStateManager.js').default} state
 * @param {Array<object>} snapshots
 * @param {{preserveGroupLinks?: boolean}} [options]
 * @returns {Array<object>}
 */
export function materializeCopiedSegments(state, snapshots, { preserveGroupLinks = false } = {}) {
    if (!state || !Array.isArray(snapshots) || snapshots.length === 0) return [];

    const contourMap = new Map();
    const contourProgress = new Map();
    const mapContour = (oldContourId, fragmentKey = "base") => {
        const key = `${String(oldContourId ?? "__none__")}::${fragmentKey}`;
        if (!contourMap.has(key)) contourMap.set(key, state._nextContourId++);
        return contourMap.get(key);
    };

    return snapshots.map((seg) => {
        const oldContourId = seg?.contourId;
        const contourKey = String(oldContourId ?? "__none__");
        const endpoints = _segmentEndpoints(seg);
        let fragmentIndex = 0;

        const progress = contourProgress.get(contourKey) ?? {
            fragmentIndex: -1,
            lastEnd: null,
        };

        if (endpoints) {
            const connected = progress.fragmentIndex >= 0 && _pointNear(progress.lastEnd, endpoints.start);
            fragmentIndex = connected ? progress.fragmentIndex : (progress.fragmentIndex + 1);
            contourProgress.set(contourKey, {
                fragmentIndex,
                lastEnd: endpoints.end,
            });
        } else {
            fragmentIndex = progress.fragmentIndex + 1;
            contourProgress.set(contourKey, {
                fragmentIndex,
                lastEnd: null,
            });
        }

        const cloned = {
            ...seg,
            id: `seg-${state._nextSegmentId++}`,
            selected: false,
            contourId: mapContour(oldContourId, `frag:${fragmentIndex}`),
        };
        if (!preserveGroupLinks) {
            delete cloned.groupId;
            delete cloned.parentGroupId;
        }
        return cloned;
    });
}

/**
 * Append copied segments to state as one history operation.
 * @param {object} options
 * @param {import('../../EditorStateManager.js').default} options.state
 * @param {Array<object>} options.snapshots
 * @param {string} options.historyLabel
 * @param {boolean} [options.keepSourceSelection=false]
 * @param {string[]} [options.sourceIds=[]]
 * @param {boolean} [options.preserveGroupLinks=false]
 * @returns {boolean}
 */
export function commitCopiedSnapshots({
    state,
    snapshots,
    historyLabel,
    keepSourceSelection = false,
    sourceIds = [],
    preserveGroupLinks = false,
}) {
    const created = materializeCopiedSegments(state, snapshots, { preserveGroupLinks });
    if (created.length === 0) return false;

    state.segments = [...state.segments, ...created];
    state.insertAfterSegId = created[created.length - 1].id;
    state._pushHistory(historyLabel);
    state._notifySegments();

    if (keepSourceSelection && Array.isArray(sourceIds) && sourceIds.length > 0) {
        state.setSelection([...new Set(sourceIds)]);
    } else {
        state.setSelection(created.map(s => s.id));
    }

    return true;
}

/**
 * Shared flow for transform tools on "pick target" stage.
 * Applies preview, commits transform, and either keeps command active (copy mode)
 * or finalizes it (normal mode).
 * @param {object} options
 * @param {boolean} options.copyMode
 * @param {{x:number,y:number}} options.targetPoint
 * @param {(point:{x:number,y:number}) => void} options.applyPreview
 * @param {(args:{keepSourceSelection:boolean}) => boolean} options.commit
 * @param {() => void} options.refreshPreview
 * @param {() => void} options.finishCommand
 */
export function commitStagedTransformTarget({
    copyMode,
    targetPoint,
    applyPreview,
    commit,
    refreshPreview,
    finishCommand,
}) {
    applyPreview(targetPoint);
    const committed = !!commit({ keepSourceSelection: copyMode });
    if (copyMode && committed) {
        refreshPreview();
        return;
    }
    finishCommand();
}

/**
 * Apply copy-mode transition side effects when Ctrl state changes.
 * Returns next copy-mode state.
 * @param {object} options
 * @param {boolean} options.current
 * @param {boolean} options.next
 * @param {() => void} [options.onEnterCopy]
 * @param {() => void} [options.onExitCopy]
 * @returns {boolean}
 */
export function transitionCopyMode({ current, next, onEnterCopy, onExitCopy }) {
    if (current === next) return current;
    if (next) onEnterCopy?.();
    else onExitCopy?.();
    return next;
}
