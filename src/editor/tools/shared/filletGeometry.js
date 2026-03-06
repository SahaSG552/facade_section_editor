/**
 * filletGeometry.js — Pure 2D geometry for fillet (tangent arc) operations.
 *
 * All coordinates are in SVG user-space (Y-down).
 * Functions are stateless and have no side effects.
 *
 * ### Key design decisions (v2)
 * - Segments do NOT need to share an endpoint (cross-path fillet supported)
 * - Arc is always tangent to both lines (built via line-line intersection + bisector)
 * - maxRadius properly computed from intersection to nearest endpoints
 *
 * @module filletGeometry
 */

// ─── Vector helpers ───────────────────────────────────────────────────────────

function _sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function _add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function _scale(v, s) { return { x: v.x * s, y: v.y * s }; }
function _len(v) { return Math.hypot(v.x, v.y); }
function _dot(a, b) { return a.x * b.x + a.y * b.y; }
function _cross(a, b) { return a.x * b.y - a.y * b.x; }
function _norm(v) {
    const l = _len(v);
    if (l < 1e-12) return { x: 0, y: 0 };
    return { x: v.x / l, y: v.y / l };
}

// ─── Line-line intersection ───────────────────────────────────────────────────

/**
 * Find intersection point of two infinite lines.
 * Line 1: p1→p2,  Line 2: p3→p4
 *
 * Returns null for parallel/degenerate lines.
 *
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @param {{x:number,y:number}} p3
 * @param {{x:number,y:number}} p4
 * @returns {{x:number,y:number,t1:number,t2:number}|null}
 *   t1 = parameter along line1 (0=p1, 1=p2),
 *   t2 = parameter along line2 (0=p3, 1=p4)
 */
function lineLineIntersection(p1, p2, p3, p4) {
    const d1 = _sub(p2, p1);
    const d2 = _sub(p4, p3);
    const denom = _cross(d1, d2);
    if (Math.abs(denom) < 1e-12) return null; // parallel or degenerate

    const dp = _sub(p3, p1);
    const t1 = _cross(dp, d2) / denom;
    const t2 = _cross(dp, d1) / denom;

    return {
        x: p1.x + d1.x * t1,
        y: p1.y + d1.y * t1,
        t1,
        t2,
    };
}

// ─── Segment geometry helpers ─────────────────────────────────────────────────

/**
 * For a line segment p1→p2 and an intersection point, find which endpoint
 * is "near" the intersection (i.e., the fillet should trim from this end).
 *
 * Returns the endpoint nearest to the intersection along the line direction.
 *
 * @param {{x:number,y:number}} p1 start
 * @param {{x:number,y:number}} p2 end
 * @param {{x:number,y:number}} intersection
 * @returns {'start'|'end'}
 */
function _nearEndToIntersection(p1, p2, intersection) {
    const d1 = Math.hypot(p1.x - intersection.x, p1.y - intersection.y);
    const d2 = Math.hypot(p2.x - intersection.x, p2.y - intersection.y);
    return d1 <= d2 ? 'start' : 'end';
}

/**
 * Get the "near" and "far" points relative to the intersection.
 * Near = the end that gets trimmed; Far = the end that stays.
 */
function _getNearFarPoints(start, end, intersection) {
    const key = _nearEndToIntersection(start, end, intersection);
    if (key === 'start') return { near: start, far: end, nearKey: 'start', farKey: 'end' };
    return { near: end, far: start, nearKey: 'end', farKey: 'start' };
}

// ─── Core fillet computation ──────────────────────────────────────────────────

/**
 * @typedef {object} FilletResult
 * @property {boolean} valid
 * @property {{x:number,y:number}} center        - arc center
 * @property {{x:number,y:number}} arcStart      - tangent point on seg1
 * @property {{x:number,y:number}} arcEnd        - tangent point on seg2
 * @property {{x:number,y:number}} intersection  - where the two lines meet (extended)
 * @property {string} seg1TrimKey   - 'start' or 'end' — which endpoint of seg1 to move
 * @property {string} seg2TrimKey   - 'start' or 'end' — which endpoint of seg2 to move
 * @property {number} radius
 * @property {number} maxRadius
 * @property {number} sweep         - SVG arc sweep flag
 * @property {number} largeArc      - always 0 for fillet arcs
 * @property {'convex'|'concave'} cornerType
 * @property {string} [failReason]
 */

/**
 * Compute fillet between two LINE segments (may or may not share an endpoint).
 *
 * Algorithm:
 *   1. Extend both lines to find their intersection point.
 *   2. Compute unit direction vectors pointing FROM intersection TOWARD the far end of each seg.
 *   3. Bisector of the angle between these two directions → arc center direction.
 *   4. Center at distance d = R / sin(halfAngle) along bisector from intersection.
 *   5. Tangent points = perpendicular foot from center onto each line.
 *   6. Validate: tangent points must lie on the correct side (between intersection and far end).
 *
 * @param {{x:number,y:number}} s1Start
 * @param {{x:number,y:number}} s1End
 * @param {{x:number,y:number}} s2Start
 * @param {{x:number,y:number}} s2End
 * @param {number} radius
 * @returns {FilletResult}
 */
function filletTwoLines(s1Start, s1End, s2Start, s2End, radius) {
    const fail = (reason) => ({
        valid: false, center: { x: 0, y: 0 }, arcStart: { x: 0, y: 0 },
        arcEnd: { x: 0, y: 0 }, intersection: { x: 0, y: 0 },
        seg1TrimKey: 'start', seg2TrimKey: 'start',
        radius: 0, maxRadius: 0, sweep: 0, largeArc: 0,
        cornerType: 'convex', failReason: reason,
    });

    if (!Number.isFinite(radius) || radius <= 0) return fail('invalid radius');

    // Step 1: Find intersection
    const ix = lineLineIntersection(s1Start, s1End, s2Start, s2End);
    if (!ix) return fail('parallel lines');

    const intersection = { x: ix.x, y: ix.y };

    // Step 2: Determine which endpoints are "near" (to be trimmed) and "far" (to keep)
    const seg1 = _getNearFarPoints(s1Start, s1End, intersection);
    const seg2 = _getNearFarPoints(s2Start, s2End, intersection);

    // Direction vectors: from intersection toward the far end of each segment
    const u1 = _norm(_sub(seg1.far, intersection));
    const u2 = _norm(_sub(seg2.far, intersection));

    if (_len(u1) < 1e-9 || _len(u2) < 1e-9) return fail('degenerate direction');

    // Step 3: Half-angle
    const cosAngle = Math.max(-1, Math.min(1, _dot(u1, u2)));
    // Angle between the two directions (the angle we're filleting)
    const angle = Math.acos(cosAngle);     // 0..π
    const halfAngle = angle / 2;           // 0..π/2
    const sinHalf = Math.sin(halfAngle);
    const tanHalf = Math.tan(halfAngle);

    if (sinHalf < 1e-9) return fail('degenerate angle (collinear)');

    // Step 4: maxRadius
    // Distance from intersection to the far end along each direction
    const dist1 = _dot(_sub(seg1.far, intersection), u1);
    const dist2 = _dot(_sub(seg2.far, intersection), u2);
    const maxTangentDist = Math.min(Math.max(dist1, 0), Math.max(dist2, 0));
    const maxRadius = maxTangentDist * tanHalf;

    if (maxRadius < 1e-9) return fail('segments too short');

    // Clamp radius to maxRadius (segments that degenerate are removed by FilletTool)
    const R = Math.min(radius, maxRadius);
    const tangentDist = R / tanHalf;  // distance from intersection to tangent point along each line
    const centerDist = R / sinHalf;   // distance from intersection to arc center along bisector

    // Step 5: Tangent points = intersection + tangentDist * u_direction
    const arcStart = _add(intersection, _scale(u1, tangentDist));
    const arcEnd = _add(intersection, _scale(u2, tangentDist));

    // Step 6: Arc center = intersection + centerDist * bisector
    const bisector = _norm(_add(u1, u2));
    if (_len(bisector) < 1e-9) return fail('degenerate bisector');
    const center = _add(intersection, _scale(bisector, centerDist));

    // ── SVG arc flags ──────────────────────────────────────────────────────
    // arc from arcStart to arcEnd with given radius.
    // sweep: determined by cross product of (arcStart - center) × (arcEnd - center)
    // In SVG Y-down: positive cross → CCW → sweep=0; negative → CW → sweep=1
    const vStart = _sub(arcStart, center);
    const vEnd = _sub(arcEnd, center);
    const crossResult = _cross(vStart, vEnd);
    const sweep = crossResult < 0 ? 0 : 1;
    const largeArc = 0;

    // Corner type classification
    // To correctly classify convex/concave regardless of segment array order,
    // we determine the likely path direction based on near keys.
    let v_in, v_out;
    if (seg1.nearKey === 'end' && seg2.nearKey === 'start') {
        // Natural path: seg1 -> intersection -> seg2
        v_in = _norm(_sub(intersection, seg1.far));
        v_out = _norm(_sub(seg2.far, intersection));
    } else if (seg1.nearKey === 'start' && seg2.nearKey === 'end') {
        // Natural path: seg2 -> intersection -> seg1
        v_in = _norm(_sub(intersection, seg2.far));
        v_out = _norm(_sub(seg1.far, intersection));
    } else {
        // Fallback: use generic order
        v_in = _norm(_sub(intersection, seg1.far));
        v_out = _norm(_sub(seg2.far, intersection));
    }
    // In SVG Y-down, cross(v_in, v_out) > 0 means clockwise (right turn).
    // Assuming standard CW drawing logic, right turns are convex corners.
    const cross_path = _cross(v_in, v_out);
    const cornerType = cross_path > 0 ? 'convex' : 'concave';

    return {
        valid: true,
        center,
        arcStart,
        arcEnd,
        intersection,
        seg1TrimKey: seg1.nearKey,
        seg2TrimKey: seg2.nearKey,
        radius: R,
        maxRadius,
        sweep,
        largeArc,
        cornerType,
        failReason: '',
    };
}

// ─── Segments-based API ───────────────────────────────────────────────────────

/**
 * Compute RT rotation angle from segment transforms.
 * @param {Array} transforms
 * @param {Record<string,number>} vars
 * @returns {number} radians
 */
function _getRtAngleRad(transforms, vars) {
    if (!Array.isArray(transforms)) return 0;
    let deg = 0;
    for (const t of transforms) {
        if (String(t?.type ?? '').toUpperCase() !== 'RT') continue;
        const raw = String(t?.params?.[0] ?? '').trim();
        const v = Number(raw);
        if (Number.isFinite(v)) { deg += v; continue; }
        const m = raw.match(/^\{([^}]+)\}$/);
        if (m && vars[m[1]] !== undefined) deg += Number(vars[m[1]]);
    }
    return deg * Math.PI / 180;
}

function _rotatePoint(p, angleRad) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/**
 * Convert segment local coords to world space.
 */
function toWorld(localPt, transforms, vars) {
    const angle = _getRtAngleRad(transforms, vars);
    if (Math.abs(angle) < 1e-9) return { x: localPt.x, y: localPt.y };
    return _rotatePoint(localPt, angle);
}

/**
 * Convert world-space coords back to segment local space.
 */
function toLocal(worldPt, transforms, vars) {
    const angle = _getRtAngleRad(transforms, vars);
    if (Math.abs(angle) < 1e-9) return { x: worldPt.x, y: worldPt.y };
    return _rotatePoint(worldPt, -angle);
}

/**
 * Build world-space version of a line segment.
 */
function toWorldSeg(seg, vars) {
    const tr = seg.transforms ?? [];
    return {
        ...seg,
        data: {
            ...seg.data,
            start: toWorld(seg.data.start, tr, vars),
            end: toWorld(seg.data.end, tr, vars),
        },
    };
}

/**
 * Compute fillet for two segments (world-space aware).
 * @param {object} seg1
 * @param {object} seg2
 * @param {number} radius
 * @param {Record<string,number>} [vars={}]
 * @returns {FilletResult|null}
 */
function computeFilletForSegments(seg1, seg2, radius, vars = {}) {
    if (seg1.type === 'line' && seg2.type === 'line') {
        const w1 = toWorldSeg(seg1, vars);
        const w2 = toWorldSeg(seg2, vars);
        return filletTwoLines(
            w1.data.start, w1.data.end,
            w2.data.start, w2.data.end,
            radius
        );
    }
    return null; // line-arc, arc-arc: future extension
}

/**
 * Compute max fillet radius for two segments.
 */
function computeMaxFilletRadius(seg1, seg2, vars = {}) {
    const result = computeFilletForSegments(seg1, seg2, 1e6, vars);
    if (!result || !result.valid) return 0;
    return result.maxRadius;
}

// ─── All-corners API ──────────────────────────────────────────────────────────

const _WELD_EPS = 1e-4;

/**
 * Find shared endpoint between two segments (if any).
 */
function findSharedEndpoint(seg1, seg2) {
    const pts1 = [seg1.data.start, seg1.data.end];
    const pts2 = [seg2.data.start, seg2.data.end];
    for (const p1 of pts1) {
        for (const p2 of pts2) {
            if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < _WELD_EPS) return { x: p1.x, y: p1.y };
        }
    }
    return null;
}

/**
 * Find all fillet-able corners among a set of segments.
 * A "corner" = two segments sharing an endpoint (within weld tolerance).
 * Only line-line in MVP.
 */
function findFilletableCorners(segments, vars = {}) {
    const lines = segments.filter(s =>
        s.type === 'line' && String(s?.linkType ?? '') !== 'symmetry'
    );

    const corners = [];
    const seen = new Set();

    for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            const s1 = lines[i], s2 = lines[j];
            const key = [s1.id, s2.id].sort().join(':');
            if (seen.has(key)) continue;

            const w1 = toWorldSeg(s1, vars);
            const w2 = toWorldSeg(s2, vars);
            const commonPt = findSharedEndpoint(w1, w2);
            if (!commonPt) continue;

            seen.add(key);
            corners.push({ seg1: s1, seg2: s2, commonPt });
        }
    }
    return corners;
}

/**
 * Filter corners by mode.
 */
function filterCornersByMode(corners, mode, testRadius = 1, vars = {}) {
    if (mode === 'all') return corners;
    return corners.filter(corner => {
        const result = computeFilletForSegments(corner.seg1, corner.seg2, testRadius, vars);
        if (!result?.valid) return false;
        return mode === 'convex'
            ? result.cornerType === 'convex'
            : result.cornerType === 'concave';
    });
}

/**
 * Compute dynamic fillet radius from cursor distance to intersection.
 */
function radiusFromCursor(cursorWorld, anchorPt, minRadius = 0.01, maxRadius = Infinity) {
    const dist = Math.hypot(cursorWorld.x - anchorPt.x, cursorWorld.y - anchorPt.y);
    return Math.max(minRadius, Math.min(maxRadius, dist));
}

export {
    lineLineIntersection,
    filletTwoLines,
    computeFilletForSegments,
    computeMaxFilletRadius,
    findSharedEndpoint,
    findFilletableCorners,
    filterCornersByMode,
    radiusFromCursor,
    toWorldSeg,
    toWorld,
    toLocal,
};
