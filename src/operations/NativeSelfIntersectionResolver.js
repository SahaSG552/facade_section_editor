/**
 * NativeSelfIntersectionResolver
 *
 * Resolves self-intersections in closed offset contours entirely in native JS,
 * without delegating to Paper.js.  Paper.js `resolveCrossings()` emits cubic
 * Bézier paths that are later approximated back to polylines, destroying arc
 * precision.  This module operates directly on {line, arc} segment objects and
 * preserves them through the entire pipeline.
 *
 * Algorithm — "Swap at crossings" chain splitting:
 *   1. Find all crossing points between non-adjacent segment pairs (L-L, L-A, A-A).
 *   2. Split each segment at all its crossing parameters, producing sub-segments
 *      that share exact endpoints at crossings.
 *   3. Build a directed adjacency graph.  Regular nodes have out-degree 1; crossing
 *      nodes have out-degree 2.
 *   4. Trace all minimal face cycles: at regular nodes continue trivially; at
 *      crossing nodes take the MOST CLOCKWISE (rightmost) outgoing edge.
 *      This decomposes the self-intersecting contour into non-intersecting loops.
 *   5. Compute signed area for each loop; return loops whose sign matches the
 *      source contour (discards backtrack "ear" artifacts).
 */

import LoggerFactory from "../core/LoggerFactory.js";

const log = LoggerFactory.createLogger("NativeSelfIntersectionResolver");

// ─── tolerances ──────────────────────────────────────────────────────────────
const CROSS_EPS   = 1e-7;   // parametric tolerance for crossing detection
const SNAP_GRID   = 5e-5;   // coordinate snapping grid for node identity
const AREA_EPS    = 1e-8;   // minimum loop area to be kept as a valid contour
const MAX_WALK    = 16384;  // max steps for cycle traversal guard

// ─── helpers ─────────────────────────────────────────────────────────────────

function snapKey(x, y) {
  return `${Math.round(x / SNAP_GRID)},${Math.round(y / SNAP_GRID)}`;
}

function clonePt(p) { return { x: p.x, y: p.y }; }

/**
 * Return the arc center {x,y} from any of the supported storage forms.
 * Returns null if center cannot be determined.
 */
function arcCenter(arc) {
  if (arc.center && Number.isFinite(arc.center.x) && Number.isFinite(arc.center.y)) {
    return { x: arc.center.x, y: arc.center.y };
  }
  if (Number.isFinite(arc.centerX) && Number.isFinite(arc.centerY)) {
    return { x: arc.centerX, y: arc.centerY };
  }
  return null;
}

function arcRadius(arc) {
  if (Number.isFinite(arc.radius) && arc.radius > 0) return arc.radius;
  if (Number.isFinite(arc.rx) && arc.rx > 0) return arc.rx;
  return null;
}

/**
 * Map an angle (radians) to the normalised parametric value t ∈ [0, 1] along
 * an arc, travelling in the sweepFlag direction.  Returns NaN if the angle is
 * outside the arc's sweep.
 */
function arcAngleToT(arc, theta) {
  const sf = arc.sweepFlag === 1 ? 1 : 0;
  const start = arc.startAngle;
  const end   = arc.endAngle;

  let span = end - start;
  if (sf === 1 && span < 0) span += 2 * Math.PI;
  if (sf === 0 && span > 0) span -= 2 * Math.PI;
  // span is +ve for sf=1, –ve for sf=0; |span| is the total angular sweep

  let progress = theta - start;
  if (sf === 1 && progress < 0) progress += 2 * Math.PI;
  if (sf === 0 && progress > 0) progress -= 2 * Math.PI;

  if (Math.abs(span) < 1e-12) return NaN;
  return progress / span;   // ∈ [0,1] if angle is on the arc
}

/**
 * Unit departure direction at the START of segment s.
 */
function depDir(s) {
  if (s.type === "line") {
    const dx = s.end.x - s.start.x;
    const dy = s.end.y - s.start.y;
    const len = Math.hypot(dx, dy);
    return len < 1e-12 ? { x: 1, y: 0 } : { x: dx / len, y: dy / len };
  }
  if (s.type === "arc") {
    const arc = s.arc;
    const sa  = arc.startAngle;
    // P(θ) = center + r*(cosθ, sinθ)
    // dP/dθ = r*(-sinθ, cosθ)
    // sf=1 → angle increases → tangent ∝ (-sin sa, cos sa)
    // sf=0 → angle decreases → tangent ∝ ( sin sa, -cos sa)
    return arc.sweepFlag === 1
      ? { x: -Math.sin(sa), y:  Math.cos(sa) }
      : { x:  Math.sin(sa), y: -Math.cos(sa) };
  }
  return { x: 1, y: 0 };
}

/**
 * Unit arrival direction at the END of segment s.
 */
function arrDir(s) {
  if (s.type === "line") return depDir(s); // same direction for lines
  if (s.type === "arc") {
    const arc = s.arc;
    const ea  = arc.endAngle;
    return arc.sweepFlag === 1
      ? { x: -Math.sin(ea), y:  Math.cos(ea) }
      : { x:  Math.sin(ea), y: -Math.cos(ea) };
  }
  return { x: 1, y: 0 };
}

/**
 * Signed left-turn angle from d_in (arrival direction) to d_out (departure).
 * Negative = right turn.  Range (-π, π].
 */
function leftTurn(dIn, dOut) {
  return Math.atan2(dIn.x * dOut.y - dIn.y * dOut.x,
                    dIn.x * dOut.x + dIn.y * dOut.y);
}

// ─── crossing detection ──────────────────────────────────────────────────────

/**
 * Line-Line crossing.
 * @returns {{tA, tB, point}[]}
 */
function crossLL(sA, sB) {
  const ax = sA.start.x, ay = sA.start.y;
  const bx = sA.end.x,   by = sA.end.y;
  const cx = sB.start.x, cy = sB.start.y;
  const dx = sB.end.x,   dy = sB.end.y;
  const rx = bx - ax, ry = by - ay;
  const sx = dx - cx, sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < CROSS_EPS * CROSS_EPS) return [];
  const t = ((cx - ax) * sy - (cy - ay) * sx) / den;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / den;
  const e = CROSS_EPS;
  if (t <= e || t >= 1 - e || u <= e || u >= 1 - e) return [];
  return [{ tA: t, tB: u, point: { x: ax + t * rx, y: ay + t * ry } }];
}

/**
 * Line-Arc crossing.  lineS = line segment; arcS = arc segment.
 * Returns {tA (line param), tB (arc param), point}[].
 */
function crossLA(lineS, arcS) {
  const A  = lineS.start, B = lineS.end;
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
    ? [(-b) / (2 * a)]
    : [(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)];

  const e = CROSS_EPS;
  const results = [];
  for (const tLine of roots) {
    if (tLine <= e || tLine >= 1 - e) continue;
    const px    = A.x + tLine * dx;
    const py    = A.y + tLine * dy;
    const theta = Math.atan2(py - c.y, px - c.x);
    const tArc  = arcAngleToT(arc, theta);
    if (isNaN(tArc) || tArc <= e || tArc >= 1 - e) continue;
    results.push({ tA: tLine, tB: tArc, point: { x: px, y: py } });
  }
  return results;
}

/**
 * Arc-Arc crossing.
 */
function crossAA(sA, sB) {
  const arcA = sA.arc, arcB = sB.arc;
  const cA   = arcCenter(arcA), cB = arcCenter(arcB);
  const rA   = arcRadius(arcA), rB = arcRadius(arcB);
  if (!cA || !cB || !rA || !rB) return [];

  const dx = cB.x - cA.x, dy = cB.y - cA.y;
  const d  = Math.hypot(dx, dy);
  if (d > rA + rB + CROSS_EPS || d < Math.abs(rA - rB) - CROSS_EPS || d < CROSS_EPS) return [];

  const a    = (rA * rA - rB * rB + d * d) / (2 * d);
  const hSq  = rA * rA - a * a;
  const h    = Math.sqrt(Math.max(0, hSq));
  const midX = cA.x + a * (dx / d);
  const midY = cA.y + a * (dy / d);

  const candidates = h < CROSS_EPS
    ? [{ x: midX, y: midY }]
    : [{ x: midX + h * ( dy / d), y: midY + h * (-dx / d) },
       { x: midX + h * (-dy / d), y: midY + h * ( dx / d) }];

  const e = CROSS_EPS;
  const results = [];
  for (const P of candidates) {
    const theta1 = Math.atan2(P.y - cA.y, P.x - cA.x);
    const theta2 = Math.atan2(P.y - cB.y, P.x - cB.x);
    const t1 = arcAngleToT(arcA, theta1);
    const t2 = arcAngleToT(arcB, theta2);
    if (isNaN(t1) || t1 <= e || t1 >= 1 - e) continue;
    if (isNaN(t2) || t2 <= e || t2 >= 1 - e) continue;
    results.push({ tA: t1, tB: t2, point: P });
  }
  return results;
}

/**
 * All crossings between two segments (dispatch by type).
 * @returns {{tA, tB, point}[]}  tA for segA, tB for segB, both ∈ (0,1)
 */
function segmentCrossings(segA, segB) {
  const ta = segA.type, tb = segB.type;
  if (ta === "line" && tb === "line") return crossLL(segA, segB);
  if (ta === "line" && tb === "arc")  return crossLA(segA, segB);
  if (ta === "arc"  && tb === "line") {
    return crossLA(segB, segA).map(c => ({ tA: c.tB, tB: c.tA, point: c.point }));
  }
  if (ta === "arc" && tb === "arc")   return crossAA(segA, segB);
  return [];
}

// ─── segment splitting ────────────────────────────────────────────────────────

/**
 * Split a line segment at local parameter t ∈ (0,1).
 * Returns [first, second].
 */
function splitLine(seg, t, splitPt) {
  const mid = splitPt || {
    x: seg.start.x + t * (seg.end.x - seg.start.x),
    y: seg.start.y + t * (seg.end.y - seg.start.y),
  };
  return [
    { type: "line", start: clonePt(seg.start), end: clonePt(mid) },
    { type: "line", start: clonePt(mid),       end: clonePt(seg.end) },
  ];
}

/**
 * Split an arc segment at local parameter t ∈ (0,1).
 * Returns [first, second].  Preserves all arc metadata.
 */
function splitArc(seg, t) {
  const arc = seg.arc;
  const sf  = arc.sweepFlag === 1 ? 1 : 0;

  let span = arc.endAngle - arc.startAngle;
  if (sf === 1 && span < 0) span += 2 * Math.PI;
  if (sf === 0 && span > 0) span -= 2 * Math.PI;

  const splitAngle = arc.startAngle + t * span;
  const cx = arcCenter(arc).x;
  const cy = arcCenter(arc).y;
  const r  = arcRadius(arc);
  const midPt = { x: cx + r * Math.cos(splitAngle), y: cy + r * Math.sin(splitAngle) };

  const span1 = t * span;
  const span2 = (1 - t) * span;

  function makeArcSeg(startPt, endPt, sa, ea, span_v) {
    const laf = Math.abs(span_v) > Math.PI ? 1 : 0;
    return {
      type: "arc",
      start: clonePt(startPt),
      end:   clonePt(endPt),
      arc: {
        ...arc,
        startAngle:   sa,
        endAngle:     ea,
        largeArcFlag: laf,
        ...(arc.center ? { center: { x: cx, y: cy } } : {}),
      },
    };
  }

  return [
    makeArcSeg(seg.start, midPt, arc.startAngle, splitAngle, span1),
    makeArcSeg(midPt, seg.end, splitAngle, arc.endAngle, span2),
  ];
}

/**
 * Split any segment at local t.  splitPt (optional) is the already-computed
 * split point (avoids re-computation).
 */
function splitSegment(seg, t, splitPt) {
  if (seg.type === "arc") return splitArc(seg, t);
  return splitLine(seg, t, splitPt);
}

// ─── main: find all crossings and build split sub-segments ───────────────────

/**
 * Given an array of segments forming a closed contour, find all self-crossing
 * points and split every segment into sub-segments that share endpoints at
 * crossing nodes.
 *
 * Returns { subSegs, nodeMap } where
 *   subSegs  – Array of {fromKey, toKey, segment}, one per sub-segment
 *   nodeMap  – Map<key, {x,y}>
 */
function buildSplitGraph(segments) {
  const n = segments.length;
  const nodeMap = new Map();

  function addNode(pt) {
    const k = snapKey(pt.x, pt.y);
    if (!nodeMap.has(k)) nodeMap.set(k, { x: pt.x, y: pt.y });
    return k;
  }

  // Register segment endpoints as nodes
  for (const seg of segments) {
    addNode(seg.start);
    addNode(seg.end);
  }

  // Collect all crossing events per segment: [{t, nodeKey, point}]
  const splitTs = Array.from({ length: n }, () => []);

  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // Skip topologically adjacent pairs (share an endpoint)
      const diff = j - i;
      if (diff === 1 || (i === 0 && j === n - 1)) continue;

      const crosses = segmentCrossings(segments[i], segments[j]);
      for (const c of crosses) {
        const key = addNode(c.point);
        splitTs[i].push({ t: c.tA, key, point: c.point });
        splitTs[j].push({ t: c.tB, key, point: c.point });
      }
    }
  }

  // Deduplicate and sort splits per segment
  for (let i = 0; i < n; i++) {
    // Deduplicate by key
    const seen = new Set();
    splitTs[i] = splitTs[i].filter(ev => {
      if (seen.has(ev.key)) return false;
      seen.add(ev.key);
      return true;
    });
    splitTs[i].sort((a, b) => a.t - b.t);
  }

  // Build sub-segments by splitting each original segment at its crossing ts
  const subSegs = [];

  for (let i = 0; i < n; i++) {
    const seg    = segments[i];
    const splits = splitTs[i];
    const startKey = snapKey(seg.start.x, seg.start.y);
    const endKey   = snapKey(seg.end.x, seg.end.y);

    if (splits.length === 0) {
      subSegs.push({ fromKey: startKey, toKey: endKey, segment: seg });
      continue;
    }

    // Walk through sorted splits, always splitting the remaining tail
    let tail       = seg;
    let tailFrom   = startKey;
    let consumed   = 0; // fraction of the original segment already cut off

    for (const { t: tGlobal, key, point } of splits) {
      const tLocal = (tGlobal - consumed) / (1 - consumed);
      if (tLocal <= CROSS_EPS || tLocal >= 1 - CROSS_EPS) continue;

      const [first, rest] = splitSegment(tail, tLocal, point);
      subSegs.push({ fromKey: tailFrom, toKey: key, segment: first });
      tail     = rest;
      tailFrom = key;
      consumed = tGlobal;
    }
    subSegs.push({ fromKey: tailFrom, toKey: endKey, segment: tail });
  }

  return { subSegs, nodeMap };
}

// ─── planar graph traversal ───────────────────────────────────────────────────

/**
 * Extract all minimal directed face cycles from the sub-segment graph.
 *
 * At regular nodes (out-degree 1): trivial continuation.
 * At crossing nodes (out-degree 2): take the most-CW (rightmost-turn) outgoing
 * edge relative to our arrival direction.  This decomposes a figure-eight into
 * two individual petal loops.
 *
 * Returns Array<segment[]> — each element is one closed face cycle.
 */
function traceContours(subSegs, nodeMap) {
  // Build adjacency: fromKey → [{edgeIdx, toKey, segment}]
  const outgoing = new Map();
  for (let idx = 0; idx < subSegs.length; idx++) {
    const e = subSegs[idx];
    if (!outgoing.has(e.fromKey)) outgoing.set(e.fromKey, []);
    outgoing.get(e.fromKey).push({ edgeIdx: idx, toKey: e.toKey, segment: e.segment });
  }

  const visitedEdge = new Array(subSegs.length).fill(false);
  const contours    = [];

  for (let startIdx = 0; startIdx < subSegs.length; startIdx++) {
    if (visitedEdge[startIdx]) continue;

    const cycleParts = [];
    let   curIdx     = startIdx;
    let   steps      = 0;

    while (!visitedEdge[curIdx] && steps++ < MAX_WALK) {
      visitedEdge[curIdx] = true;
      const e = subSegs[curIdx];
      cycleParts.push(e.segment);

      const nextNode = e.toKey;
      const outs     = outgoing.get(nextNode) || [];
      if (outs.length === 0) break;

      // Filter out already-visited edges
      const fresh = outs.filter(o => !visitedEdge[o.edgeIdx]);
      if (fresh.length === 0) break;

      let nextE;
      if (fresh.length === 1) {
        nextE = fresh[0];
      } else {
        // Crossing node: pick most-CW continuation (rightmost turn)
        const arrival = arrDir(e.segment);
        let   bestTurn = Infinity;
        nextE = fresh[0];
        for (const candidate of fresh) {
          const dep  = depDir(candidate.segment);
          const turn = leftTurn(arrival, dep);
          if (turn < bestTurn) {
            bestTurn = turn;
            nextE    = candidate;
          }
        }
      }
      curIdx = nextE.edgeIdx;
    }

    if (cycleParts.length > 0) {
      contours.push(cycleParts);
    }
  }

  return contours;
}

// ─── signed area of a segment array ──────────────────────────────────────────

/**
 * Shoelace signed area.  Uses segment endpoints (chord approximation for arcs).
 * Sufficient for determining winding direction (sign) of a loop.
 */
function signedArea(segs) {
  let area = 0;
  for (const s of segs) {
    area += s.start.x * s.end.y - s.end.x * s.start.y;
  }
  return area / 2;
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Resolve self-intersections in a closed offset contour natively.
 *
 * @param {Array<Object>} segments      – Closed segment chain (line/arc objects).
 * @param {number}        sourceArea    – Signed area of the SOURCE (pre-offset) contour.
 *                                        Used to pick loops with the correct winding.
 * @returns {Array<{segments: Array, area: number}>|null}
 *   Array of clean, non-self-intersecting contour segment arrays with their areas,
 *   or null if no self-intersections were found or the input is invalid.
 */
export function resolveNativeSelfIntersections(segments, sourceArea = 0) {
  if (!Array.isArray(segments) || segments.length < 3) return null;

  // Quick pre-check: need at least one valid arc or enough lines to self-intersect
  // (3 segments cannot self-intersect as a simple closed triangle)
  if (segments.length < 4 && segments.every(s => s.type === "line")) return null;

  try {
    const { subSegs, nodeMap } = buildSplitGraph(segments);

    // If no crossings were introduced, the contour is clean
    const hadCrossings = subSegs.length > segments.length;
    if (!hadCrossings) {
      log.debug("resolveNativeSelfIntersections: no crossings found");
      return null;
    }

    log.debug(
      `resolveNativeSelfIntersections: ${segments.length} segs → ${subSegs.length} sub-segs, ` +
      `${nodeMap.size} nodes`
    );

    const loops = traceContours(subSegs, nodeMap);
    log.debug(`  traced ${loops.length} loop(s)`);

    // Filter loops:
    // 1. Must close (last.end ≈ first.start) – already guaranteed by traversal
    // 2. Must have area above threshold (discard degenerate loops)
    // 3. If sourceArea sign is known, prefer loops with matching sign
    const valid = loops
      .map(segs => ({ segments: segs, area: signedArea(segs) }))
      .filter(c => Math.abs(c.area) > AREA_EPS);

    if (valid.length === 0) {
      log.warn("resolveNativeSelfIntersections: all traced loops have zero area");
      return null;
    }

    // If source winding is known, keep only matching-sign loops.
    // If no source area (0 or unknown), return all valid loops.
    let result = valid;
    if (Math.abs(sourceArea) > AREA_EPS) {
      const sourceSgn = Math.sign(sourceArea);
      const matching  = valid.filter(c => Math.sign(c.area) === sourceSgn);
      if (matching.length > 0) result = matching;
      // If nothing matches (e.g. all inverted), fall through to all valid loops
    }

    log.info(
      `resolveNativeSelfIntersections: → ${result.length} clean contour(s) ` +
      `(areas: ${result.map(c => c.area.toFixed(2)).join(", ")})`
    );
    return result;
  } catch (err) {
    log.error("resolveNativeSelfIntersections failed:", err);
    return null;
  }
}
