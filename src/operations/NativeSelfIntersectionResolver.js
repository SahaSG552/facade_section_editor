/**
 * NativeSelfIntersectionResolver
 *
 * Resolves self-intersections in closed offset contours entirely in native JS,
 * without delegating to Paper.js.  Paper.js resolveCrossings() emits cubic
 * Bezier paths that are later approximated back to polylines, destroying arc
 * precision.  This module operates directly on {line, arc} segment objects and
 * preserves them through the entire pipeline.
 *
 * Algorithm - "Swap at crossings" chain splitting:
 *   1. Find all crossing points between non-adjacent segment pairs (L-L, L-A, A-A).
 *   2. Split each segment at its crossing parameters -> ordered circular array of
 *      sub-segments 0..N-1 that share exact endpoints at crossings.
 *   3. Build a "next" table initialised to next[i] = (i+1) % N.
 *   4. For every crossing (endIdxA, endIdxB) - the sub-seg indices that END at the
 *      crossing node - SWAP the continuations:
 *        next[endIdxA] = (endIdxB+1) % N
 *        next[endIdxB] = (endIdxA+1) % N
 *      This splits a figure-eight into two separate closed loops at the crossing.
 *   5. Trace all cycles using the modified next[] table.
 *   6. Filter by signed area: keep only loops whose sign matches sourceArea.
 *
 * Why "swap" works:
 *   A closed self-intersecting contour visits each crossing twice (once per lobe).
 *   The "swap" reconnects the exits so that each lobe closes on itself, decomposing
 *   the figure-eight into separate non-intersecting sub-loops.
 */

import LoggerFactory from "../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("NativeSelfIntersectionResolver");

// --- tolerances ---------------------------------------------------------------
const CROSS_EPS = 1e-7;  // parametric tolerance for crossing interior check
const SNAP_GRID = 5e-5;  // coordinate snapping grid for node identity
const AREA_EPS  = 1e-8;  // minimum loop signed area to keep
const NESTED_ARTIFACT_AREA_RATIO = 0.02;

// --- low-level helpers --------------------------------------------------------

function snapKey(x, y) {
  return `${Math.round(x / SNAP_GRID)},${Math.round(y / SNAP_GRID)}`;
}

function clonePt(p) { return { x: p.x, y: p.y }; }

/** Return arc center {x,y} from any storage form; null if unavailable. */
function arcCenter(arc) {
  if (arc.center && Number.isFinite(arc.center.x) && Number.isFinite(arc.center.y)) {
    return { x: arc.center.x, y: arc.center.y };
  }
  if (Number.isFinite(arc.centerX) && Number.isFinite(arc.centerY)) {
    return { x: arc.centerX, y: arc.centerY };
  }
  return null;
}

/** Return arc radius from any storage form; null if unavailable. */
function arcRadius(arc) {
  if (Number.isFinite(arc.radius) && arc.radius > 0) return arc.radius;
  if (Number.isFinite(arc.rx)     && arc.rx     > 0) return arc.rx;
  return null;
}

/**
 * Map angle theta (radians) to parametric t in [0,1] along the arc.
 * Returns NaN if theta is outside the arc's sweep range.
 */
function arcAngleToT(arc, theta) {
  const sf  = arc.sweepFlag === 1 ? 1 : 0;
  let span  = arc.endAngle - arc.startAngle;
  if (sf === 1 && span < 0)  span += 2 * Math.PI;
  if (sf === 0 && span > 0)  span -= 2 * Math.PI;

  let progress = theta - arc.startAngle;
  if (sf === 1 && progress < 0) progress += 2 * Math.PI;
  if (sf === 0 && progress > 0) progress -= 2 * Math.PI;

  if (Math.abs(span) < 1e-12) return NaN;
  return progress / span;
}

// --- crossing detection -------------------------------------------------------

/** Line-segment x Line-segment crossing.  Returns {tA,tB,point}[] with t in (0,1). */
function crossLL(sA, sB) {
  const ax = sA.start.x, ay = sA.start.y;
  const rx = sA.end.x - ax, ry = sA.end.y - ay;
  const cx = sB.start.x, cy = sB.start.y;
  const sx = sB.end.x - cx, sy = sB.end.y - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < CROSS_EPS * CROSS_EPS) return [];

  const t = ((cx - ax) * sy - (cy - ay) * sx) / den;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / den;

  if (t <= CROSS_EPS || t >= 1 - CROSS_EPS) return [];
  if (u <= CROSS_EPS || u >= 1 - CROSS_EPS) return [];
  return [{ tA: t, tB: u, point: { x: ax + t * rx, y: ay + t * ry } }];
}

/** Line-segment x Arc crossing.  Returns {tA(line),tB(arc),point}[] with t in (0,1). */
function crossLA(lineS, arcS) {
  const A   = lineS.start, B = lineS.end;
  const arc = arcS.arc;
  const c   = arcCenter(arc);
  const r   = arcRadius(arc);
  if (!c || !r) return [];

  const dx = B.x - A.x, dy = B.y - A.y;
  const fx = A.x - c.x, fy = A.y - c.y;
  const a  = dx * dx + dy * dy;
  if (a < CROSS_EPS * CROSS_EPS) return [];
  const b    = 2 * (fx * dx + fy * dy);
  const cv   = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * cv;
  if (disc < -CROSS_EPS) return [];

  const sqrtD = Math.sqrt(Math.max(0, disc));
  const roots = disc < CROSS_EPS
    ? [-b / (2 * a)]
    : [(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)];

  const results = [];
  for (const tLine of roots) {
    if (tLine <= CROSS_EPS || tLine >= 1 - CROSS_EPS) continue;
    const px    = A.x + tLine * dx, py = A.y + tLine * dy;
    const theta = Math.atan2(py - c.y, px - c.x);
    const tArc  = arcAngleToT(arc, theta);
    if (isNaN(tArc) || tArc <= CROSS_EPS || tArc >= 1 - CROSS_EPS) continue;
    results.push({ tA: tLine, tB: tArc, point: { x: px, y: py } });
  }
  return results;
}

/** Arc x Arc crossing.  Returns {tA,tB,point}[] with t in (0,1). */
function crossAA(sA, sB) {
  const arcA = sA.arc, arcB = sB.arc;
  const cA   = arcCenter(arcA), cB = arcCenter(arcB);
  const rA   = arcRadius(arcA), rB = arcRadius(arcB);
  if (!cA || !cB || !rA || !rB) return [];

  const dx = cB.x - cA.x, dy = cB.y - cA.y;
  const d  = Math.hypot(dx, dy);
  if (d > rA + rB + CROSS_EPS) return [];
  if (d < Math.abs(rA - rB) - CROSS_EPS) return [];
  if (d < CROSS_EPS) return [];

  const a    = (rA * rA - rB * rB + d * d) / (2 * d);
  const h    = Math.sqrt(Math.max(0, rA * rA - a * a));
  const midX = cA.x + a * (dx / d), midY = cA.y + a * (dy / d);

  const pts = h < CROSS_EPS
    ? [{ x: midX, y: midY }]
    : [{ x: midX + h * ( dy / d), y: midY + h * (-dx / d) },
       { x: midX + h * (-dy / d), y: midY + h * ( dx / d) }];

  const results = [];
  for (const P of pts) {
    const t1 = arcAngleToT(arcA, Math.atan2(P.y - cA.y, P.x - cA.x));
    const t2 = arcAngleToT(arcB, Math.atan2(P.y - cB.y, P.x - cB.x));
    if (isNaN(t1) || t1 <= CROSS_EPS || t1 >= 1 - CROSS_EPS) continue;
    if (isNaN(t2) || t2 <= CROSS_EPS || t2 >= 1 - CROSS_EPS) continue;
    results.push({ tA: t1, tB: t2, point: P });
  }
  return results;
}

/** Dispatch crossing detection by segment type pair. */
function segmentCrossings(segA, segB) {
  const ta = segA.type, tb = segB.type;
  if (ta === "line" && tb === "line") return crossLL(segA, segB);
  if (ta === "line" && tb === "arc")  return crossLA(segA, segB);
  if (ta === "arc"  && tb === "line") {
    return crossLA(segB, segA).map(c => ({ tA: c.tB, tB: c.tA, point: c.point }));
  }
  if (ta === "arc"  && tb === "arc")  return crossAA(segA, segB);
  return [];
}

// --- segment splitting --------------------------------------------------------

/** Split a line at local t in (0,1). */
function splitLine(seg, t, splitPt) {
  const mid = splitPt ?? {
    x: seg.start.x + t * (seg.end.x - seg.start.x),
    y: seg.start.y + t * (seg.end.y - seg.start.y),
  };
  return [
    { type: "line", start: clonePt(seg.start), end: clonePt(mid) },
    { type: "line", start: clonePt(mid),       end: clonePt(seg.end) },
  ];
}

/** Split an arc at local t in (0,1); preserves all arc metadata. */
function splitArc(seg, t) {
  const arc = seg.arc;
  const sf  = arc.sweepFlag === 1 ? 1 : 0;

  let span = arc.endAngle - arc.startAngle;
  if (sf === 1 && span < 0) span += 2 * Math.PI;
  if (sf === 0 && span > 0) span -= 2 * Math.PI;

  const splitAngle = arc.startAngle + t * span;
  const c   = arcCenter(arc);
  const r   = arcRadius(arc);
  const mid = { x: c.x + r * Math.cos(splitAngle), y: c.y + r * Math.sin(splitAngle) };

  function makeArc(startPt, endPt, sa, ea, spanAbs) {
    return {
      type: "arc",
      start: clonePt(startPt),
      end:   clonePt(endPt),
      arc: {
        ...arc,
        startAngle:   sa,
        endAngle:     ea,
        largeArcFlag: Math.abs(spanAbs) > Math.PI ? 1 : 0,
        ...(arc.center ? { center: clonePt(c) } : {}),
      },
    };
  }

  return [
    makeArc(seg.start, mid, arc.startAngle, splitAngle, t * span),
    makeArc(mid, seg.end, splitAngle, arc.endAngle, (1 - t) * span),
  ];
}

/** Split any segment at local t. */
function splitSegment(seg, t, splitPt) {
  return seg.type === "arc" ? splitArc(seg, t) : splitLine(seg, t, splitPt);
}

// --- build split sub-segment array with crossing events ----------------------

/**
 * Split all segments at pairwise crossings and identify crossing events.
 *
 * Returns:
 *   subSegs        - flat ordered array of sub-segments (circular chain 0..N-1)
 *   crossingEvents - [{endIdxA, endIdxB}]: sub-seg index that ENDS at the
 *                    crossing node, for each side A and B of each crossing
 */
function buildSplitSubsegs(segments) {
  const n = segments.length;

  // Per-segment split event list: [{t, xKey, point, role, id}]
  const splitTs = Array.from({ length: n }, () => []);
  let crossingId = 0;
  const crossingsById = [];  // [{xKey}]

  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // Skip the pair that wraps in a closed chain (last seg adjacent to first)
      if (i === 0 && j === n - 1) continue;

      const crosses = segmentCrossings(segments[i], segments[j]);
      for (const c of crosses) {
        const xKey = snapKey(c.point.x, c.point.y);
        const id   = crossingId++;
        crossingsById.push({ xKey });
        splitTs[i].push({ t: c.tA, xKey, point: c.point, role: "A", id });
        splitTs[j].push({ t: c.tB, xKey, point: c.point, role: "B", id });
      }
    }
  }

  // Sort by t per segment; de-duplicate identical crossing points
  for (let i = 0; i < n; i++) {
    splitTs[i].sort((a, b) => a.t - b.t);
    const seen = new Set();
    splitTs[i] = splitTs[i].filter(ev => {
      if (seen.has(ev.xKey)) return false;
      seen.add(ev.xKey);
      return true;
    });
  }

  // Build sub-segments.  Track sub-seg index that ENDS at each crossing (by role).
  const subSegs    = [];
  const xKeyEndIdx = new Map();  // xKey -> {A: idx, B: idx}

  for (let i = 0; i < n; i++) {
    const seg    = segments[i];
    const splits = splitTs[i];

    if (splits.length === 0) {
      subSegs.push(seg);
      continue;
    }

    let tail     = seg;
    let consumed = 0;

    for (const { t: tGlobal, xKey, point, role } of splits) {
      const tLocal = consumed < 1 ? (tGlobal - consumed) / (1 - consumed) : 0;
      if (tLocal <= CROSS_EPS || tLocal >= 1 - CROSS_EPS) continue;

      const [front, rest] = splitSegment(tail, tLocal, point);
      const frontIdx = subSegs.length;
      subSegs.push(front);

      if (!xKeyEndIdx.has(xKey)) xKeyEndIdx.set(xKey, {});
      xKeyEndIdx.get(xKey)[role] = frontIdx;

      tail     = rest;
      consumed = tGlobal;
    }
    subSegs.push(tail);
  }

  // Pair A and B end indices for each crossing
  const crossingEvents = [];
  for (const { xKey } of crossingsById) {
    const rec = xKeyEndIdx.get(xKey);
    if (rec && rec.A !== undefined && rec.B !== undefined) {
      crossingEvents.push({ endIdxA: rec.A, endIdxB: rec.B });
    }
  }

  return { subSegs, crossingEvents };
}

// --- trace closed loops using swapped next[] table ---------------------------

/**
 * Apply "swap at crossing" and trace all resulting closed loops.
 *
 * At each crossing (endIdxA, endIdxB):
 *   original: endIdxA -> endIdxA+1, endIdxB -> endIdxB+1
 *   swapped:  endIdxA -> endIdxB+1, endIdxB -> endIdxA+1
 *
 * This separates a figure-eight into two independent closed loops.
 *
 * @param {Array}  subSegs        - ordered sub-segment array
 * @param {Array}  crossingEvents - [{endIdxA, endIdxB}]
 * @returns {Array<Array>} - one segment array per loop
 */
function traceLoops(subSegs, crossingEvents) {
  const N = subSegs.length;
  if (N === 0) return [];

  const next = Array.from({ length: N }, (_, i) => (i + 1) % N);

  for (const { endIdxA, endIdxB } of crossingEvents) {
    const nA = (endIdxA + 1) % N;
    const nB = (endIdxB + 1) % N;
    next[endIdxA] = nB;
    next[endIdxB] = nA;
  }

  const visited = new Uint8Array(N);
  const loops   = [];

  for (let start = 0; start < N; start++) {
    if (visited[start]) continue;

    const cycle = [];
    let cur = start;

    while (!visited[cur]) {
      visited[cur] = 1;
      cycle.push(subSegs[cur]);
      cur = next[cur];
    }

    if (cycle.length > 0) loops.push(cycle);
  }

  return loops;
}

// --- signed area (shoelace) --------------------------------------------------

function signedArea(segs) {
  let area = 0;
  for (const s of segs) {
    area += s.start.x * s.end.y - s.end.x * s.start.y;
  }
  return area / 2;
}

function computeBBox(segs) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const seg of segs) {
    for (const pt of [seg?.start, seg?.end]) {
      if (!pt) continue;
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

function bboxContains(outer, inner, tol = SNAP_GRID * 4) {
  if (!outer || !inner) return false;
  return (
    inner.minX >= outer.minX - tol &&
    inner.minY >= outer.minY - tol &&
    inner.maxX <= outer.maxX + tol &&
    inner.maxY <= outer.maxY + tol
  );
}

function representativePoint(segs) {
  if (!Array.isArray(segs) || segs.length === 0) return null;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const seg of segs) {
    if (!seg?.start) continue;
    sumX += seg.start.x;
    sumY += seg.start.y;
    count += 1;
  }
  if (count === 0) return null;
  return { x: sumX / count, y: sumY / count };
}

function pointOnSegment(point, a, b, tol = SNAP_GRID * 4) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 <= tol * tol) {
    return Math.hypot(point.x - a.x, point.y - a.y) <= tol;
  }

  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2;
  if (t < -tol || t > 1 + tol) return false;

  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(point.x - proj.x, point.y - proj.y) <= tol;
}

function pointInLoopByChord(point, segs, tol = SNAP_GRID * 4) {
  const vertices = segs.map((seg) => seg?.start).filter(Boolean);
  if (vertices.length < 3) return false;

  for (let i = 0; i < vertices.length; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    if (pointOnSegment(point, a, b, tol)) {
      return true;
    }
  }

  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    const intersects = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || Number.EPSILON) + xi);

    if (intersects) inside = !inside;
  }

  return inside;
}

function pruneNestedArtifactLoops(contours) {
  if (!Array.isArray(contours) || contours.length < 2) {
    return contours;
  }

  const enriched = contours.map((contour) => ({
    ...contour,
    bbox: computeBBox(contour.segments),
    absArea: Math.abs(contour.area),
    sign: Math.sign(contour.area),
  }));

  const kept = enriched.filter((candidate, idx) => {
    if (candidate.absArea <= AREA_EPS) return false;

    return !enriched.some((other, otherIdx) => {
      if (otherIdx === idx) return false;
      if (candidate.sign === 0 || other.sign === 0 || candidate.sign !== other.sign) return false;
      if (other.absArea <= candidate.absArea) return false;
      if (candidate.absArea / other.absArea > NESTED_ARTIFACT_AREA_RATIO) return false;
      if (!bboxContains(other.bbox, candidate.bbox)) return false;

      const probe = representativePoint(candidate.segments);
      return probe ? pointInLoopByChord(probe, other.segments) : false;
    });
  });

  return kept.length > 0 ? kept.map(({ segments, area }) => ({ segments, area })) : contours;
}

// --- public API ---------------------------------------------------------------

/**
 * Resolve self-intersections in a closed offset contour natively.
 *
 * @param {Array<Object>} segments   - Closed segment chain (line/arc objects).
 * @param {number}        sourceArea - Signed area of the source contour.
 * @returns {Array<{segments:Array, area:number}>|null}
 *   Array of clean closed loops, or null if no crossings found or on error.
 */
export function resolveNativeSelfIntersections(segments, sourceArea = 0) {
  if (!Array.isArray(segments) || segments.length < 3) return null;

  try {
    const { subSegs, crossingEvents } = buildSplitSubsegs(segments);

    if (crossingEvents.length === 0) {
      log.debug("resolveNativeSelfIntersections: no interior crossings found");
      return null;
    }

    log.debug(
      `resolveNativeSelfIntersections: ${segments.length} segs -> ` +
      `${subSegs.length} sub-segs, ${crossingEvents.length} crossing(s)`
    );

    const rawLoops = traceLoops(subSegs, crossingEvents);
    log.debug(`  traced ${rawLoops.length} raw loop(s)`);

    const valid = rawLoops
      .map(segs => ({ segments: segs, area: signedArea(segs) }))
      .filter(c => Math.abs(c.area) > AREA_EPS);

    if (valid.length === 0) {
      log.warn("resolveNativeSelfIntersections: all loops have zero area");
      return null;
    }

    let result = valid;
    if (Math.abs(sourceArea) > AREA_EPS) {
      const srcSign = Math.sign(sourceArea);
      const matching = valid.filter(c => Math.sign(c.area) === srcSign);
      if (matching.length > 0) result = matching;
    }

    result = pruneNestedArtifactLoops(result);

    log.info(
      `resolveNativeSelfIntersections: -> ${result.length} clean contour(s) ` +
      `(areas: ${result.map(c => c.area.toFixed(2)).join(", ")})`
    );
    return result;
  } catch (err) {
    log.error("resolveNativeSelfIntersections failed:", err);
    return null;
  }
}
