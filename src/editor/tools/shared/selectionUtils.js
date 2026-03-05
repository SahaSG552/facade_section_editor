import { getRectGeomLocal } from "../../geometry/rectGeometry.js";
import { evalAngle } from "../../transforms/TransformCommands.js";

function sumRtAngle(transforms, vars = {}) {
    const list = Array.isArray(transforms) ? transforms : [];
    let angle = 0;
    for (const t of list) {
        if (String(t?.type ?? "").toUpperCase() !== "RT") continue;
        const v = evalAngle(t?.params?.[0] ?? "", vars);
        if (Number.isFinite(v)) angle += v;
    }
    return angle;
}

function rotatePoint(p, angleDeg) {
    const r = angleDeg * Math.PI / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function toWorldPoint(seg, p, vars = {}) {
    const angle = sumRtAngle(seg?.transforms, vars);
    if (Math.abs(angle) < 1e-9) return { x: p.x, y: p.y };
    return rotatePoint(p, angle);
}

function anyPointInRect(points, minX, maxX, minY, maxY) {
    return points.some(p => ptInRect(p, minX, maxX, minY, maxY));
}

function allPointsInRect(points, minX, maxX, minY, maxY) {
    return points.length > 0 && points.every(p => ptInRect(p, minX, maxX, minY, maxY));
}

function polylineTouchesRect(points, minX, maxX, minY, maxY, closed = false) {
    if (!Array.isArray(points) || points.length === 0) return false;
    if (anyPointInRect(points, minX, maxX, minY, maxY)) return true;
    for (let i = 0; i < points.length - 1; i++) {
        if (segTouchesRect(points[i], points[i + 1], minX, maxX, minY, maxY)) return true;
    }
    if (closed && points.length > 2) {
        if (segTouchesRect(points[points.length - 1], points[0], minX, maxX, minY, maxY)) return true;
    }
    return false;
}

function sampleEllipseWorld(seg, vars = {}, steps = 48) {
    const cx = Number(seg?.data?.cx ?? 0);
    const cy = Number(seg?.data?.cy ?? 0);
    const rx = Math.abs(Number(seg?.data?.rx ?? 0));
    const ry = Math.abs(Number(seg?.data?.ry ?? 0));
    const out = [];
    for (let i = 0; i < steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const p = {
            x: cx + rx * Math.cos(t),
            y: cy + ry * Math.sin(t),
        };
        out.push(toWorldPoint(seg, p, vars));
    }
    return out;
}

function rectCornersWorld(seg, vars = {}) {
    const g = getRectGeomLocal(seg.data);
    const corners = [
        { x: g.xStart, y: g.yStart },
        { x: g.xOpp, y: g.yStart },
        { x: g.xOpp, y: g.yOpp },
        { x: g.xStart, y: g.yOpp },
    ];
    return corners.map(p => toWorldPoint(seg, p, vars));
}

function ptInRect(p, x1, x2, y1, y2) {
    return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
}

function ccw(A, B, C) {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

function segsIntersect(A, B, C, D) {
    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

function segTouchesRect(s, e, x1, x2, y1, y2) {
    if (ptInRect(s, x1, x2, y1, y2) || ptInRect(e, x1, x2, y1, y2)) return true;
    const tl = { x: x1, y: y1 };
    const tr = { x: x2, y: y1 };
    const br = { x: x2, y: y2 };
    const bl = { x: x1, y: y2 };
    return (
        segsIntersect(s, e, tl, tr)
        || segsIntersect(s, e, tr, br)
        || segsIntersect(s, e, br, bl)
        || segsIntersect(s, e, bl, tl)
    );
}

function segmentBoxHit(seg, minX, maxX, minY, maxY, vars = {}) {
    if (seg.type === "circle") {
        const c = toWorldPoint(seg, seg.data.center, vars);
        const radius = Number(seg.data.radius ?? 0);
        const full = c.x - radius >= minX && c.x + radius <= maxX && c.y - radius >= minY && c.y + radius <= maxY;
        const partial = full || c.x + radius >= minX && c.x - radius <= maxX && c.y + radius >= minY && c.y - radius <= maxY;
        return { full, partial };
    }

    if (seg.type === "rect") {
        const corners = rectCornersWorld(seg, vars);
        const full = allPointsInRect(corners, minX, maxX, minY, maxY);
        const partial = full || polylineTouchesRect(corners, minX, maxX, minY, maxY, true);
        return { full, partial };
    }

    if (seg.type === "ellipse") {
        const samples = sampleEllipseWorld(seg, vars);
        const full = allPointsInRect(samples, minX, maxX, minY, maxY);
        const partial = full || polylineTouchesRect(samples, minX, maxX, minY, maxY, true);
        return { full, partial };
    }

    if (seg.type === "line" || seg.type === "arc") {
        const s = toWorldPoint(seg, seg.data.start, vars);
        const en = toWorldPoint(seg, seg.data.end, vars);
        const full = ptInRect(s, minX, maxX, minY, maxY) && ptInRect(en, minX, maxX, minY, maxY);
        const partial = segTouchesRect(s, en, minX, maxX, minY, maxY);
        return { full, partial };
    }

    return { full: false, partial: false };
}

function collectElementSegments(seedSeg, allSegments) {
    if (!seedSeg) return [];
    if (seedSeg.type === "line" || seedSeg.type === "arc") {
        const contourId = seedSeg.contourId ?? 0;
        const contourSegs = allSegments.filter(
            s => (s.type === "line" || s.type === "arc") && (s.contourId ?? 0) === contourId,
        );

        const EPS = 1e-6;
        const eq = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

        // Follow a contour chain using directed continuity rules, so paths that
        // only touch by start-start/end-end vertices are not merged into one selection.
        const visited = new Set([seedSeg.id]);
        const out = [seedSeg];

        // Forward: current.end -> next.start
        let cur = seedSeg;
        for (;;) {
            const next = contourSegs.find((s) => !visited.has(s.id) && eq(cur.data.end, s.data.start));
            if (!next) break;
            visited.add(next.id);
            out.push(next);
            cur = next;
        }

        // Backward: prev.end -> current.start
        cur = seedSeg;
        for (;;) {
            const prev = contourSegs.find((s) => !visited.has(s.id) && eq(s.data.end, cur.data.start));
            if (!prev) break;
            visited.add(prev.id);
            out.unshift(prev);
            cur = prev;
        }

        // Keep embedded/shape segments attached to this contour for parity with prior behavior.
        const contourShapes = allSegments.filter(
            s => (s.type === "circle" || s.type === "rect" || s.type === "ellipse")
                && (s.contourId ?? 0) === contourId,
        );
        return [...out, ...contourShapes];
    }
    return [seedSeg];
}

function getSegDirectGroupId(seg) {
    const gRaw = seg?.groupId;
    if (gRaw !== null && gRaw !== undefined && gRaw !== '') {
        const gid = Number(gRaw);
        if (Number.isFinite(gid) && gid > 0) return gid;
    }
    const pgRaw = seg?.parentGroupId;
    if (pgRaw !== null && pgRaw !== undefined && pgRaw !== '') {
        const pgid = Number(pgRaw);
        if (Number.isFinite(pgid) && pgid > 0) return pgid;
    }
    return null;
}

function buildGroupChildrenMap(elementGroups = []) {
    const map = new Map();
    for (const g of (Array.isArray(elementGroups) ? elementGroups : [])) {
        const gid = Number(g?.groupId);
        if (!Number.isFinite(gid) || gid <= 0) continue;
        const parent = Number(g?.parentGroupId);
        const parentId = Number.isFinite(parent) && parent > 0 ? parent : null;
        if (!map.has(parentId)) map.set(parentId, []);
        map.get(parentId).push(gid);
    }
    return map;
}

function collectGroupSubtreeIds(rootGroupId, childrenMap) {
    const out = new Set();
    if (!Number.isFinite(Number(rootGroupId)) || Number(rootGroupId) <= 0) return out;
    const queue = [Number(rootGroupId)];
    while (queue.length > 0) {
        const gid = queue.shift();
        if (out.has(gid)) continue;
        out.add(gid);
        const children = childrenMap.get(gid) ?? [];
        for (const child of children) queue.push(child);
    }
    return out;
}

function collectSegmentIdsForGroupSubtree(allSegments, subtreeIds) {
    const ids = [];
    for (const seg of allSegments) {
        const gid = getSegDirectGroupId(seg);
        if (Number.isFinite(gid) && subtreeIds.has(gid)) ids.push(seg.id);
    }
    return ids;
}

/**
 * Expand a set of segment IDs to include all sibling segments that share the same
 * top-level ancestor group. Segments not belonging to any group are kept as-is.
 *
 * Used for Shift-click "add to selection" when group-selection mode is active:
 * clicking one segment inside a group selects the entire group subtree.
 *
 * @param {string[]} seedIds        - Initial segment IDs to expand.
 * @param {object[]} allSegments    - Full segment array from editor state.
 * @param {object[]} [elementGroups] - Group descriptor array from editor state.
 * @returns {string[]} Expanded segment IDs (deduplicated).
 */
export function expandSegIdsToGroupClosure(seedIds, allSegments, elementGroups = []) {
    const ids = Array.isArray(seedIds) ? seedIds : [];
    if (ids.length === 0) return [];

    const byId = new Map((Array.isArray(allSegments) ? allSegments : []).map(s => [s.id, s]));
    const childrenMap = buildGroupChildrenMap(elementGroups);
    const expanded = new Set();

    for (const id of ids) {
        const seg = byId.get(id);
        if (!seg) continue;
        const gid = getSegDirectGroupId(seg);
        if (!Number.isFinite(gid)) {
            expanded.add(id);
            continue;
        }
        const subtree = collectGroupSubtreeIds(gid, childrenMap);
        for (const sid of collectSegmentIdsForGroupSubtree(allSegments, subtree)) expanded.add(sid);
    }

    return [...expanded];
}

/**
 * Given a directly-hit segment ID, expand the selection to include all segments
 * that logically belong together:
 * - **No groups / ignoreGroups=true**: returns all segments of the same element
 *   (entire line/arc contour or single shape).
 * - **Default (ignoreGroups=false)**: walks up to the topmost ancestor group that
 *   contains the hit segment, then returns every segment in that group's subtree.
 *
 * @param {string} hitId            - ID of the segment that was hit.
 * @param {object[]} allSegments    - Full segment array from editor state.
 * @param {object[]} [elementGroups] - Group descriptor array from editor state.
 * @param {{ignoreGroups?: boolean}} [opts]
 * @returns {string[]} Resolved segment IDs to select.
 */
export function resolveClickSelectionIds(hitId, allSegments, elementGroups = [], { ignoreGroups = false } = {}) {
    if (!hitId) return [];
    const segments = Array.isArray(allSegments) ? allSegments : [];
    const byId = new Map(segments.map(s => [s.id, s]));
    const seg = byId.get(hitId);
    if (!seg) return [];

    const elementSegs = collectElementSegments(seg, segments);
    const elementIds = [...new Set(elementSegs.map(s => s.id).filter(Boolean))];

    if (ignoreGroups) return elementIds;

    const directGroupId = getSegDirectGroupId(seg);
    if (!Number.isFinite(directGroupId)) return elementIds;

    // Build parentByGroup (gid → parentId) and childrenMap (parentId → [childIds])
    // in a single pass — both are needed for top-group discovery and subtree collection.
    const groups = Array.isArray(elementGroups) ? elementGroups : [];
    const parentByGroup = new Map();
    const childrenMap = new Map();
    for (const g of groups) {
        const gid = Number(g?.groupId);
        if (!Number.isFinite(gid) || gid <= 0) continue;
        const parent = Number(g?.parentGroupId);
        const parentId = Number.isFinite(parent) && parent > 0 ? parent : null;
        parentByGroup.set(gid, parentId);
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        childrenMap.get(parentId).push(gid);
    }

    // Walk up parent chain to find the topmost ancestor group.
    let topGroupId = directGroupId;
    const seen = new Set();
    while (Number.isFinite(topGroupId) && topGroupId > 0 && !seen.has(topGroupId)) {
        seen.add(topGroupId);
        const parent = parentByGroup.get(topGroupId);
        if (!Number.isFinite(parent) || parent <= 0) break;
        topGroupId = parent;
    }

    const subtree = collectGroupSubtreeIds(topGroupId, childrenMap);
    const groupIds = collectSegmentIdsForGroupSubtree(segments, subtree);
    return groupIds.length > 0 ? [...new Set(groupIds)] : elementIds;
}

export function computeBoxSelection(allSegments, start, end, { selectParts = false, variableValues = {}, groupSelectionMode = false, elementGroups = [] } = {}) {
    const ltr = end.x >= start.x;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const sideLineHit = (x1, y1, x2, y2) => {
        const s = { x: x1, y: y1 };
        const e = { x: x2, y: y2 };
        const full = ptInRect(s, minX, maxX, minY, maxY) && ptInRect(e, minX, maxX, minY, maxY);
        const partial = segTouchesRect(s, e, minX, maxX, minY, maxY);
        return ltr ? full : partial;
    };

    if (selectParts) {
        const ids = [];
        const rectSides = new Map();

        for (const seg of allSegments) {
            if (seg.type === "rect") {
                const g = getRectGeomLocal(seg.data);
                const xStart = g.xStart;
                const yStart = g.yStart;
                const xOpp = g.xOpp;
                const yOpp = g.yOpp;
                const p00 = toWorldPoint(seg, { x: xStart, y: yStart }, variableValues);
                const p01 = toWorldPoint(seg, { x: xStart, y: yOpp }, variableValues);
                const p10 = toWorldPoint(seg, { x: xOpp, y: yStart }, variableValues);
                const p11 = toWorldPoint(seg, { x: xOpp, y: yOpp }, variableValues);
                const sides = [];
                if (sideLineHit(p00.x, p00.y, p01.x, p01.y)) sides.push({ role: "x-start", axis: "w" });
                if (sideLineHit(p10.x, p10.y, p11.x, p11.y)) sides.push({ role: "x-opposite", axis: "w" });
                if (sideLineHit(p00.x, p00.y, p10.x, p10.y)) sides.push({ role: "y-start", axis: "h" });
                if (sideLineHit(p01.x, p01.y, p11.x, p11.y)) sides.push({ role: "y-opposite", axis: "h" });
                if (sides.length > 0) {
                    rectSides.set(seg.id, sides);
                    ids.push(seg.id);
                    continue;
                }
            }
            const hit = segmentBoxHit(seg, minX, maxX, minY, maxY, variableValues);
            if (ltr ? hit.full : hit.partial) ids.push(seg.id);
        }

        return { ids, rectSides };
    }

    if (groupSelectionMode) {
        const groupedIds = new Set();
        const childrenMap = buildGroupChildrenMap(elementGroups);
        const directGroupIds = [...new Set(
            allSegments
                .map(seg => getSegDirectGroupId(seg))
                .filter(Number.isFinite)
        )];

        for (const rootGid of directGroupIds) {
            const subtree = collectGroupSubtreeIds(rootGid, childrenMap);
            const segs = allSegments.filter(seg => {
                const gid = getSegDirectGroupId(seg);
                return Number.isFinite(gid) && subtree.has(gid);
            });
            if (segs.length === 0) continue;
            const evals = segs.map(s => segmentBoxHit(s, minX, maxX, minY, maxY, variableValues));
            const pick = ltr
                ? evals.every(v => v.full)
                : evals.some(v => v.partial);
            if (!pick) continue;
            for (const sid of collectSegmentIdsForGroupSubtree(allSegments, subtree)) groupedIds.add(sid);
        }

        const ungroupedSegments = allSegments.filter(seg => !Number.isFinite(getSegDirectGroupId(seg)));
        const elementIds = new Set();
        const visitedElements = new Set();
        for (const seg of ungroupedSegments) {
            const elemKey = (seg.type === "line" || seg.type === "arc")
                ? `c:${seg.contourId ?? 0}`
                : `s:${seg.id}`;
            if (visitedElements.has(elemKey)) continue;
            visitedElements.add(elemKey);

            const elementSegs = collectElementSegments(seg, ungroupedSegments);
            if (elementSegs.length === 0) continue;

            const evals = elementSegs.map(s => segmentBoxHit(s, minX, maxX, minY, maxY, variableValues));
            const pick = ltr
                ? evals.every(v => v.full)
                : evals.some(v => v.partial);
            if (!pick) continue;

            for (const s of elementSegs) elementIds.add(s.id);
        }

        return { ids: [...new Set([...groupedIds, ...elementIds])], rectSides: new Map() };
    }

    const elementIds = new Set();
    const visitedElements = new Set();
    for (const seg of allSegments) {
        const elemKey = (seg.type === "line" || seg.type === "arc")
            ? `c:${seg.contourId ?? 0}`
            : `s:${seg.id}`;
        if (visitedElements.has(elemKey)) continue;
        visitedElements.add(elemKey);

        const elementSegs = collectElementSegments(seg, allSegments);
        if (elementSegs.length === 0) continue;

        const evals = elementSegs.map(s => segmentBoxHit(s, minX, maxX, minY, maxY, variableValues));
        const pick = ltr
            ? evals.every(v => v.full)
            : evals.some(v => v.partial);
        if (!pick) continue;

        for (const s of elementSegs) elementIds.add(s.id);
    }

    return { ids: [...elementIds], rectSides: new Map() };
}

export function buildSelectionBoxGhost(start, end, svgNs = "http://www.w3.org/2000/svg") {
    const ltr = end.x >= start.x;
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    const rect = document.createElementNS(svgNs, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.classList.add("editor-selection-box");
    if (!ltr) rect.classList.add("editor-selection-box--crossing");

    const g = document.createElementNS(svgNs, "g");
    g.appendChild(rect);
    return g;
}
