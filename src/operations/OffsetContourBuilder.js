/**
 * OffsetContourBuilder.js - Contour processing with corner joins
 *
 * Orchestrates offset operation across a contour:
 * 1. Offsets each segment (line/arc) using OffsetCurveEvaluator
 * 2. Processes corner joins (Sharp/Round) based on convexity
 * 3. Handles open curves with caps (via OffsetCapper)
 * 4. Returns offset contour with self-intersection potential
 *
 * OCCT-based algorithm with:
 * - Convex/concave detection via cross product
 * - Sharp join: line-line intersection with miter limit
 * - Round join: arc tangent at corner with radius |offset|
 * - Self-intersection resolution delegated to OffsetTrimmer
 */

import LoggerFactory from "../core/LoggerFactory.js";
import {
  offsetSegment,
  normalize,
} from "./OffsetCurveEvaluator.js";
import { capOpenContour } from "./OffsetCapper.js";
import { buildUShapeBridge, buildTangentBridge, isSegmentDegenerated } from "./OffsetRules.js";

const log = LoggerFactory.createLogger("OffsetContourBuilder");

const EPSILON = 1e-6;
const MITER_LIMIT = 4.0;
const POINT_TOLERANCE = 1e-9;

function distance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function pointsEqual(p1, p2, tol = EPSILON) {
  return distance(p1, p2) <= tol;
}

function clonePoint(p) {
  return { x: p.x, y: p.y };
}

function cloneSegment(seg) {
  const cloned = {
    type: seg.type,
    start: clonePoint(seg.start),
    end: clonePoint(seg.end),
  };
  if (seg.arc) {
    cloned.arc = {
      ...seg.arc,
      center: seg.arc.center ? clonePoint(seg.arc.center) : undefined,
      centerX: seg.arc.centerX,
      centerY: seg.arc.centerY,
    };
  }
  return cloned;
}

function buildSharpTangentBridge(current, next, inTangent, outTangent, offsetDistance) {
  const p0 = current.end;
  const p3 = next.start;
  const leg = Math.abs(offsetDistance);

  const p1 = {
    x: p0.x + inTangent.x * leg,
    y: p0.y + inTangent.y * leg,
  };
  const p2 = {
    x: p3.x - outTangent.x * leg,
    y: p3.y - outTangent.y * leg,
  };

  const bridgeSegments = [];

  const dist01 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  if (dist01 > EPSILON) {
    bridgeSegments.push({
      type: "line",
      start: clonePoint(p0),
      end: clonePoint(p1),
    });
  }

  const dist12 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (dist12 > EPSILON) {
    bridgeSegments.push({
      type: "line",
      start: clonePoint(p1),
      end: clonePoint(p2),
    });
  }

  const dist23 = Math.hypot(p3.x - p2.x, p3.y - p2.y);
  if (dist23 > EPSILON) {
    bridgeSegments.push({
      type: "line",
      start: clonePoint(p2),
      end: clonePoint(p3),
    });
  }

  if (bridgeSegments.length === 0) {
    const tangent = buildTangentBridge(current, next);
    return tangent ? [tangent] : [];
  }

  return bridgeSegments;
}

function buildDroppedGapBridge(
  current,
  next,
  inTangent,
  offsetDistance,
  bridgeContext = {}
) {
  const absDistance = Math.abs(offsetDistance);
  const leg =
    typeof bridgeContext.leg === "number" && Number.isFinite(bridgeContext.leg)
      ? bridgeContext.leg
      : absDistance;
  const extra =
    typeof bridgeContext.extra === "number" && Number.isFinite(bridgeContext.extra)
      ? bridgeContext.extra
      : 0;
  const arcRadius =
    typeof bridgeContext.arcRadius === "number" && Number.isFinite(bridgeContext.arcRadius)
      ? bridgeContext.arcRadius
      : null;

  // Compute current segment length with continuous overflow propagation
  const segLen = Math.hypot(
    current.end.x - current.start.x,
    current.end.y - current.start.y
  );
  const overflow = Math.max(0, extra - segLen);
  const propagated = overflow;
  const effectiveExtra = Math.min(Math.max(extra, 0), segLen + propagated);

  const p0 = {
    x: current.end.x - inTangent.x * effectiveExtra,
    y: current.end.y - inTangent.y * effectiveExtra,
  };
  
  // Check if shifting the anchor would reverse the current segment
  // Compute dot product of original direction and new direction
  const origDx = current.end.x - current.start.x;
  const origDy = current.end.y - current.start.y;
  const newDx = p0.x - current.start.x;
  const newDy = p0.y - current.start.y;
  const dotProduct = origDx * newDx + origDy * newDy;
  
  // If dot product is negative or near-zero, segment would reverse or collapse
  // Collapse current segment to zero length at the bridge anchor point
  if (dotProduct <= EPSILON * EPSILON) {
    current.start = clonePoint(p0);
    current.end = clonePoint(p0);
  } else {
    current.end = clonePoint(p0);
  }
  
  let p3 = next.start;

  if (leg <= EPSILON) {
    const tangent = buildTangentBridge(current, next);
    return tangent ? [tangent] : [];
  }

  const normal = { x: -inTangent.y, y: inTangent.x };
  const horizontalGap = Math.abs(p3.x - p0.x) >= Math.abs(p3.y - p0.y);

  // When an arc fully collapsed (arcRadius != null), the offset arc degenerated to its
  // center point at p0. The adjacent line's raw start is the arc's original endpoint
  // shifted by the offset vector — it may lie at a different level than the arc center.
  //
  // For a horizontal bridge: project next.start onto the arc-center level so the exit
  // leg is correct. The arc center in offset coordinates is `extra` units away from p0
  // in the anti-normal direction: arc_center_y = p0.y - normal.y * extra.
  // The bridge depth = |span| / 2 - extra (span = |effectiveP3.x - p0.x|).
  //
  // This formula is derived from the two-step invariant:
  //   offset(base, d1+d2) == offset(offset(base, d1), d2)
  // and works for extra === 0 (exact collapse) and extra > 0 (over-collapse alike).
  let effectiveLeg = leg;
  let effectiveP3 = p3;
  if (arcRadius != null && leg > EPSILON) {
    if (horizontalGap) {
      // Snap p3 to arc-center level and use invariant depth
      const arcCenterY = p0.y - normal.y * extra;
      effectiveP3 = { x: p3.x, y: arcCenterY };
      effectiveLeg = Math.max(0, Math.abs(p3.x - p0.x) / 2 - extra);
    } else {
      // Snap p3 to arc-center level and use invariant depth
      const arcCenterX = p0.x - normal.x * extra;
      effectiveP3 = { x: arcCenterX, y: p3.y };
      effectiveLeg = Math.max(0, Math.abs(p3.y - p0.y) / 2 - extra);
    }
    // Update next.start to reflect the corrected position
    setSegmentEndpoint(next, "start", effectiveP3);
    p3 = effectiveP3;
  }

  let p1;
  let p2;

  if (horizontalGap) {
    const ySign = Math.abs(normal.y) > EPSILON ? Math.sign(normal.y) : Math.sign(inTangent.y) || 1;
    const yOffset = ySign * effectiveLeg;
    p1 = { x: p0.x, y: p0.y + yOffset };
    p2 = { x: p3.x, y: p0.y + yOffset };
  } else {
    const xSign = Math.abs(normal.x) > EPSILON ? Math.sign(normal.x) : Math.sign(inTangent.x) || 1;
    const xOffset = xSign * effectiveLeg;
    p1 = { x: p0.x + xOffset, y: p0.y };
    p2 = { x: p0.x + xOffset, y: p3.y };
  }

  const bridgeSegments = [];

  if (Math.hypot(p1.x - p0.x, p1.y - p0.y) > EPSILON) {
    bridgeSegments.push({
      type: "line",
      start: clonePoint(p0),
      end: clonePoint(p1),
    });
  }

  if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > EPSILON) {
    bridgeSegments.push({
      type: "line",
      start: clonePoint(p1),
      end: clonePoint(p2),
    });
  }

  if (Math.hypot(p3.x - p2.x, p3.y - p2.y) > EPSILON) {
    bridgeSegments.push({
      type: "line",
      start: clonePoint(p2),
      end: clonePoint(p3),
    });
  }

  if (bridgeSegments.length === 0) {
    const tangent = buildTangentBridge(current, next);
    return tangent ? [tangent] : [];
  }

  return bridgeSegments;
}

function getSkippedSourceIndices(currentSourceIndex, nextSourceIndex, sourceCount, closed) {
  if (!closed) {
    const skipped = [];
    for (let idx = currentSourceIndex + 1; idx < nextSourceIndex; idx++) {
      skipped.push(idx);
    }
    return skipped;
  }

  const skipped = [];
  let idx = (currentSourceIndex + 1) % sourceCount;
  while (idx !== nextSourceIndex && skipped.length < sourceCount) {
    skipped.push(idx);
    idx = (idx + 1) % sourceCount;
  }
  return skipped;
}

function getArcRadiusFromSegment(segment) {
  if (!segment || segment.type !== "arc" || !segment.arc) {
    return null;
  }

  const { arc } = segment;
  if (typeof arc.radius === "number" && Number.isFinite(arc.radius)) {
    const radius = Math.abs(arc.radius);
    return radius > EPSILON ? radius : null;
  }

  const centerX =
    arc.center && typeof arc.center.x === "number" && Number.isFinite(arc.center.x)
      ? arc.center.x
      : arc.centerX;
  const centerY =
    arc.center && typeof arc.center.y === "number" && Number.isFinite(arc.center.y)
      ? arc.center.y
      : arc.centerY;

  if (
    typeof centerX !== "number" ||
    !Number.isFinite(centerX) ||
    typeof centerY !== "number" ||
    !Number.isFinite(centerY)
  ) {
    return null;
  }

  const rs = Math.hypot(segment.start.x - centerX, segment.start.y - centerY);
  const re = Math.hypot(segment.end.x - centerX, segment.end.y - centerY);

  const rsValid = Number.isFinite(rs) && rs > EPSILON;
  const reValid = Number.isFinite(re) && re > EPSILON;

  if (rsValid && reValid) {
    return (rs + re) * 0.5;
  }
  if (rsValid) {
    return rs;
  }
  if (reValid) {
    return re;
  }

  return null;
}

function hasDroppedSourceGap(currentSourceIndex, nextSourceIndex, sourceCount, closed) {
  if (!closed) {
    return nextSourceIndex - currentSourceIndex > 1;
  }

  const skipped = (nextSourceIndex - currentSourceIndex - 1 + sourceCount) % sourceCount;
  return skipped > 0;
}

function getTangent(segment, position) {
  if (segment.type === "line") {
    const dir = {
      x: segment.end.x - segment.start.x,
      y: segment.end.y - segment.start.y,
    };
    return normalize(dir);
  }

  if (segment.type === "arc") {
    const arc = segment.arc;

    let angle;
    if (position === "start") {
      angle = arc.startAngle;
    } else {
      angle = arc.endAngle;
    }

    const radiusDir = { x: Math.cos(angle), y: Math.sin(angle) };
    const sweepFlag = arc.sweepFlag !== undefined ? arc.sweepFlag : 1;

    if (sweepFlag === 1) {
      return { x: -radiusDir.y, y: radiusDir.x };
    } else {
      return { x: radiusDir.y, y: -radiusDir.x };
    }
  }

  return { x: 0, y: 0 };
}

function cross(v1, v2) {
  return v1.x * v2.y - v1.y * v2.x;
}

function dot(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Detect if two offset segments face each other across their gap.
 * Uses tangent-derived normals for robust line/arc handling when tangent dot products
 * become near-zero and are numerically ambiguous.
 *
 * Converging criterion:
 * - g = nextStart - currentEnd
 * - nIn = left normal of inTangent
 * - nOut = left normal of outTangent
 * - converging iff dot(nIn, g) > EPSILON and dot(nOut, -g) > EPSILON
 *
 * @param {Object} currentEnd - End point of current segment {x, y}
 * @param {Object} nextStart - Start point of next segment {x, y}
 * @param {Object} inTangent - Tangent at currentEnd {x, y}
 * @param {Object} outTangent - Tangent at nextStart {x, y}
 * @returns {boolean} True if segments are converging (facing each other)
 */
function isConvergingJoin(currentEnd, nextStart, inTangent, outTangent) {
  const gap = {
    x: nextStart.x - currentEnd.x,
    y: nextStart.y - currentEnd.y,
  };

  const inNormal = { x: -inTangent.y, y: inTangent.x };
  const outNormal = { x: -outTangent.y, y: outTangent.x };

  const facingIn = dot(inNormal, gap);
  const facingOut = dot(outNormal, { x: -gap.x, y: -gap.y });

  return facingIn > EPSILON && facingOut > EPSILON;
}

/**
 * Detect if two offset segments are diverging away from each other across the gap.
 * Diverging criterion uses strict opposite-facing normals; tangent-facing/mixed cases
 * are treated as non-diverging and should prefer trim/intersection first.
 *
 * @param {Object} currentEnd - End point of current segment {x, y}
 * @param {Object} nextStart - Start point of next segment {x, y}
 * @param {Object} inTangent - Tangent at currentEnd {x, y}
 * @param {Object} outTangent - Tangent at nextStart {x, y}
 * @returns {boolean} True if segments are diverging
 */
function isDivergingJoin(currentEnd, nextStart, inTangent, outTangent) {
  const gap = {
    x: nextStart.x - currentEnd.x,
    y: nextStart.y - currentEnd.y,
  };

  const inNormal = { x: -inTangent.y, y: inTangent.x };
  const outNormal = { x: -outTangent.y, y: outTangent.x };

  const facingIn = dot(inNormal, gap);
  const facingOut = dot(outNormal, { x: -gap.x, y: -gap.y });

  return facingIn < -EPSILON && facingOut < -EPSILON;
}

function computeJoinType(inTangent, outTangent) {
  const c = cross(inTangent, outTangent);
  if (Math.abs(c) < EPSILON) {
    return "tangent";
  }
  return c > 0 ? "convex" : "concave";
}

function lineLineIntersection(p1, d1, p2, d2) {
  const det = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(det) < EPSILON) {
    return null;
  }

  const dp = { x: p1.x - p2.x, y: p1.y - p2.y };
  // Solve p1 + t1*d1 = p2 + t2*d2.
  // With dp = p1 - p2, both parameters require the negated cross term.
  const t1 = -(dp.x * d2.y - dp.y * d2.x) / det;
  const t2 = -(dp.x * d1.y - dp.y * d1.x) / det;

  // NOTE: Do NOT reject t < 0 here.
  // For miter joins on convex outward corners, offset rays diverge and
  // their intersection lies "behind" one ray start — that's exactly the
  // miter corner we need. The miter limit check in computeSharpJoin
  // validates whether the intersection is within acceptable distance.

  return {
    x: p1.x + t1 * d1.x,
    y: p1.y + t1 * d1.y,
  };
}

/**
 * Convert SVG arc endpoint parametrization to center parametrization.
 *
 * Implements the algorithm from the SVG specification §B.2.4.
 * Only handles circular arcs (rx === ry, xRotation === 0).
 *
 * @param {{x:number,y:number}} p1 - Arc start point.
 * @param {{x:number,y:number}} p2 - Arc end point.
 * @param {number} r - Arc radius (rx = ry).
 * @param {0|1} largeArcFlag - SVG large-arc-flag.
 * @param {0|1} sweepFlag - SVG sweep-flag.
 * @returns {{center:{x:number,y:number}, startAngle:number, endAngle:number}|null}
 */
function svgArcToCenterLocal(p1, p2, r, largeArcFlag, sweepFlag) {
  if (!Number.isFinite(r) || r <= EPSILON) return null;
  const x1p = (p1.x - p2.x) / 2;
  const y1p = (p1.y - p2.y) / 2;
  const dSq = x1p * x1p + y1p * y1p;
  const rSq = r * r;
  if (dSq < EPSILON * EPSILON) return null;
  const numerator = Math.max(0, rSq - dSq);
  const sq = numerator / dSq;
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const f = sign * Math.sqrt(sq);
  const cxp = f * y1p;
  const cyp = -f * x1p;
  const cx = cxp + (p1.x + p2.x) / 2;
  const cy = cyp + (p1.y + p2.y) / 2;
  const startAngle = Math.atan2((p1.y - cy) / r, (p1.x - cx) / r);
  const endAngle = Math.atan2((p2.y - cy) / r, (p2.x - cx) / r);
  return { center: { x: cx, y: cy }, startAngle, endAngle };
}

/**
 * Resolve arc center from arc metadata and optional segment endpoints.
 *
 * Supports:
 * - Modern form: arc.center.x / arc.center.y
 * - Legacy form: arc.centerX / arc.centerY
 * - SVG endpoint form: arc.rx present, center derived from segment.start/end
 *
 * @param {Object} arc - Arc data object.
 * @param {Object|null} [arcSegment] - The arc segment (for SVG endpoint fallback).
 * @returns {{x:number,y:number}|null} Center point, or null when unavailable.
 */
function getArcCenter(arc, arcSegment = null) {
  if (
    arc?.center &&
    typeof arc.center.x === "number" &&
    Number.isFinite(arc.center.x) &&
    typeof arc.center.y === "number" &&
    Number.isFinite(arc.center.y)
  ) {
    return { x: arc.center.x, y: arc.center.y };
  }

  if (
    typeof arc?.centerX === "number" &&
    Number.isFinite(arc.centerX) &&
    typeof arc?.centerY === "number" &&
    Number.isFinite(arc.centerY)
  ) {
    return { x: arc.centerX, y: arc.centerY };
  }

  // SVG endpoint form: derive center from start/end endpoints and radius.
  if (
    Number.isFinite(arc?.rx) &&
    arcSegment?.start &&
    arcSegment?.end
  ) {
    const r = arc.rx;
    const converted = svgArcToCenterLocal(
      arcSegment.start,
      arcSegment.end,
      r,
      arc.largeArcFlag ?? 0,
      arc.sweepFlag ?? 0
    );
    return converted ? converted.center : null;
  }

  return null;
}

function getArcRadius(arc, arcSegment) {
  if (typeof arc?.radius === "number" && Number.isFinite(arc.radius)) {
    const r = Math.abs(arc.radius);
    if (r > EPSILON) {
      return r;
    }
  }

  // SVG endpoint form: rx is the radius.
  if (typeof arc?.rx === "number" && Number.isFinite(arc.rx)) {
    const r = Math.abs(arc.rx);
    if (r > EPSILON) {
      return r;
    }
  }

  const center = getArcCenter(arc, arcSegment);
  if (!center || !arcSegment?.start) {
    return null;
  }

  const fallback = Math.hypot(
    arcSegment.start.x - center.x,
    arcSegment.start.y - center.y
  );
  return Number.isFinite(fallback) && fallback > EPSILON ? fallback : null;
}

/**
 * Update arc endpoint and its angle while preserving center and exact radius.
 *
 * @param {Object} arcSegment - Segment with type "arc"
 * @param {"start"|"end"} endpointKey - Which endpoint to update
 * @param {{x:number,y:number}} point - Target point for endpoint update
 */
function updateArcEndpointAndAngle(arcSegment, endpointKey, point) {
  if (!arcSegment || arcSegment.type !== "arc" || !arcSegment.arc || !point) {
    return;
  }

  const center = getArcCenter(arcSegment.arc, arcSegment);
  const radius = getArcRadius(arcSegment.arc, arcSegment);

  // Fallback: keep topology update even if arc metadata is incomplete.
  if (!center || radius == null) {
    arcSegment[endpointKey] = clonePoint(point);
    return;
  }

  const angle = Math.atan2(point.y - center.y, point.x - center.x);
  const snappedPoint = {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  };

  arcSegment[endpointKey] = snappedPoint;

  if (endpointKey === "start") {
    arcSegment.arc.startAngle = angle;
    if (pointsEqual(snappedPoint, arcSegment.end, EPSILON * 10)) {
      arcSegment.arc.startAngle = arcSegment.arc.endAngle;
    }
  } else {
    arcSegment.arc.endAngle = angle;
    if (pointsEqual(snappedPoint, arcSegment.start, EPSILON * 10)) {
      arcSegment.arc.endAngle = arcSegment.arc.startAngle;
    }
  }
}

function setSegmentEndpoint(segment, endpointKey, point) {
  if (segment?.type === "arc") {
    updateArcEndpointAndAngle(segment, endpointKey, point);
    return;
  }

  segment[endpointKey] = clonePoint(point);
}

function normalizeAngle(angle) {
  const twoPi = Math.PI * 2;
  let out = angle % twoPi;
  if (out < 0) {
    out += twoPi;
  }
  return out;
}

function angularDistanceCCW(fromAngle, toAngle) {
  const twoPi = Math.PI * 2;
  let delta = normalizeAngle(toAngle) - normalizeAngle(fromAngle);
  if (delta < 0) {
    delta += twoPi;
  }
  return delta;
}

function isAngleOnArcSweep(angle, startAngle, endAngle, sweepFlag, tol = EPSILON) {
  if (
    !Number.isFinite(angle) ||
    !Number.isFinite(startAngle) ||
    !Number.isFinite(endAngle)
  ) {
    return false;
  }

  const a = normalizeAngle(angle);
  const s = normalizeAngle(startAngle);
  const e = normalizeAngle(endAngle);

  if (sweepFlag === 1) {
    const total = angularDistanceCCW(s, e);
    const part = angularDistanceCCW(s, a);
    return part <= total + tol;
  }

  const total = angularDistanceCCW(e, s);
  const part = angularDistanceCCW(a, s);
  return part <= total + tol;
}

function isPointOnFiniteLineSegment(point, lineSegment, tol = EPSILON) {
  const xMin = Math.min(lineSegment.start.x, lineSegment.end.x) - tol;
  const xMax = Math.max(lineSegment.start.x, lineSegment.end.x) + tol;
  const yMin = Math.min(lineSegment.start.y, lineSegment.end.y) - tol;
  const yMax = Math.max(lineSegment.start.y, lineSegment.end.y) + tol;

  if (point.x < xMin || point.x > xMax || point.y < yMin || point.y > yMax) {
    return false;
  }

  const dir = {
    x: lineSegment.end.x - lineSegment.start.x,
    y: lineSegment.end.y - lineSegment.start.y,
  };
  const rel = {
    x: point.x - lineSegment.start.x,
    y: point.y - lineSegment.start.y,
  };
  const area2 = Math.abs(cross(dir, rel));
  const dirLen = Math.hypot(dir.x, dir.y);
  return area2 <= tol * Math.max(1, dirLen);
}

/**
 * Finds the self-intersection point between two LINE segments for backtrack-loop detection.
 *
 * Returns the intersection point {x, y} when:
 *   ti ∈ (EPSILON, 1+EPSILON]  — seg[i] is trimmed at or before its natural end.
 *                                  ti < 1 = mid-segment overshoot (e.g. d > collapse distance).
 *                                  ti ≈ 1 = endpoint-on-line (the classic d=collapse-distance case).
 *   tj ∈ (EPSILON, +∞)         — intersection is inside or past seg[j].
 *                                  tj < 1 = normal trim, tj ≥ 1 = seg[j] consumed (caller removes it).
 *
 * Only operates on LINE segments; arcs are skipped to avoid false positives.
 *
 * Returns `tj` alongside the intersection point so callers can distinguish:
 *   - tj < 1  → normal interior trim of seg[j]
 *   - tj ≈ 1  → seg[j] degenerates to zero length (intersection at seg[j].end)
 *   - tj > 1  → seg[j] is fully consumed by the backtrack (caller must remove it)
 *
 * @param {Object} segI - Line segment {type, start, end}
 * @param {Object} segJ - Line segment {type, start, end}
 * @returns {{x:number, y:number, ti:number, tj:number}|null} Intersection point with parametric ti/tj, or null
 */
function findLineSelfIntersection(segI, segJ) {
  if (segI.type !== "line" || segJ.type !== "line") return null;

  const dx1 = segI.end.x - segI.start.x;
  const dy1 = segI.end.y - segI.start.y;
  const dx2 = segJ.end.x - segJ.start.x;
  const dy2 = segJ.end.y - segJ.start.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < EPSILON) return null; // parallel or degenerate

  const cx = segJ.start.x - segI.start.x;
  const cy = segJ.start.y - segI.start.y;

  const ti = (cx * dy2 - cy * dx2) / denom;
  const tj = (cx * dy1 - cy * dx1) / denom;

  // ti must be in (EPSILON, 1+EPSILON]: intersection must be on or before seg[i]'s end,
  // and strictly past its start (ti ≤ 0 would mean seg[i]'s start is at/past the meeting
  // point — a different collapse pattern handled separately via findEntryCollapse).
  if (ti <= EPSILON || ti > 1 + EPSILON) return null;
  // tj: must be > 0 (not at/before seg[j].start).
  // No upper bound: tj > 1 means seg[j] is fully consumed — caller handles it.
  if (tj <= EPSILON) return null;

  return {
    x: segI.start.x + ti * dx1,
    y: segI.start.y + ti * dy1,
    ti,
    tj,
  };
}

/**
 * Detect the "entry consumed" collapse pattern:
 *
 * When the offset distance is large enough that seg[i]'s start is AT or PAST the
 * line of seg[j] (ti ≤ 0 in the intersection formula), the entry segment itself
 * degenerates.  Simultaneously the exit segment is fully consumed (tj > 1+EPSILON).
 *
 * This is Pattern 4: both entry and exit are consumed — remove i..j entirely.
 *
 * Crucially, ti≤0 AND tj≈1 (tj in [1-EPSILON, 1+EPSILON]) must NOT trigger this
 * pattern, because that exact configuration is just a normal connected corner in a
 * closed contour (the segments share an endpoint, not a backtrack).  Only when the
 * exit is *fully consumed past its end* (tj > 1+EPSILON) do we have a genuine collapse.
 *
 * @param {Object} segI - Entry line segment {type, start, end}
 * @param {Object} segJ - Exit line segment {type, start, end}
 * @returns {{ti:number, tj:number}|null} Parametric values if Pattern 4 detected, else null
 */
function findEntryCollapse(segI, segJ) {
  if (segI.type !== "line" || segJ.type !== "line") return null;

  const dx1 = segI.end.x - segI.start.x;
  const dy1 = segI.end.y - segI.start.y;
  const dx2 = segJ.end.x - segJ.start.x;
  const dy2 = segJ.end.y - segJ.start.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < EPSILON) return null; // parallel — no unique intersection

  const cx = segJ.start.x - segI.start.x;
  const cy = segJ.start.y - segI.start.y;

  const ti = (cx * dy2 - cy * dx2) / denom;
  const tj = (cx * dy1 - cy * dx1) / denom;

  // Pattern 4 requires:
  //   ti ≤ EPSILON    → entry start is at or past the intersection (entry consumed)
  //   tj > 1+EPSILON  → exit is fully consumed past its end (not just a shared corner)
  if (ti > EPSILON) return null;         // normal case — handled by findLineSelfIntersection
  if (tj <= 1 + EPSILON) return null;    // shared corner or degenerate exit — not Pattern 4

  return { ti, tj };
}

/**
 * Remove self-intersection backtrack loops from an open offset contour.
 *
 * When a П-bridge (or any narrow U-shape) offset collapses—or overshoots—the
 * raw output can contain a "backtrack loop": a short detour that doubles back
 * and intersects a later segment.  Three patterns are handled:
 *
 *   1. Endpoint-on-line  (ti ≈ 1, tj < 1): seg[i].end lies on the interior of seg[j].
 *      Occurs at exactly d = collapse distance (e.g. legs width = 4, d = 2).
 *
 *   2. Mid-segment cross (ti < 1, tj < 1): seg[i] itself crosses the interior of seg[j].
 *      Occurs when d > collapse distance (e.g. legs width = 4, d = 3).
 *      In this case seg[i] is also shortened to the intersection.
 *
 *   3. Exit degenerate/consumed (ti ≤ 1, tj ≥ 1): the intersection lands at or past seg[j]'s END.
 *      Occurs when d > (bridge_width/2 + leg_length): the exit segment degenerates
 *      to zero length (tj≈1) or is fully consumed (tj>1).  seg[j] is removed entirely
 *      along with the intermediates, leaving only the trimmed seg[i].
 *
 *   4. Entry consumed (ti ≤ 0, tj > 1): the entry segment itself is at or past the
 *      intersection AND the exit is fully consumed past its end.  Both seg[i] and
 *      seg[j] are removed entirely along with all intermediates.  Detected via the
 *      separate `findEntryCollapse` helper.
 *      Guard: seg[i].start ≠ seg[j].end (otherwise they share a corner of a closed
 *      contour — that is normal topology, not a backtrack).
 *      Result may be zero segments when the contour fully degenerates.
 *
 * Algorithm:
 *   For every non-adjacent pair (i, j) with j ≥ i+2:
 *   1. Test Pattern 4 first via findEntryCollapse (handles ti ≤ 0).
 *      Guard: all intermediates LINE + reversal vs seg[j] + seg[i].start ≠ seg[j].end.
 *   2. Test Patterns 1/2/3 via findLineSelfIntersection (requires ti > EPSILON).
 *      Guard: all intermediates LINE + at least one reversal relative to seg[j].
 *   On confirmed backtrack:
 *   - Pattern 4: remove i..j inclusive (everything consumed).
 *   - Pattern 3: trim seg[i].end to intersection, remove i+1..j.
 *   - Pattern 1/2: trim both seg[i].end and seg[j].start, remove i+1..j-1.
 *   Repeat until stable.
 *
 * @param {Array} segments - Offset contour segments
 * @returns {Array} Trimmed segments (may be shorter)
 */
function trimSelfIntersections(segments) {
  const result = [...segments];
  const MAX_LOCAL_BACKTRACK_SPAN = 2;

  // Multi-lobe open contours can contain several independent reversal zones.
  // Running single-loop backtrack trim over such shapes may incorrectly stitch
  // distant zones and collapse the central valid span.
  let reversalCount = 0;
  for (let i = 0; i < result.length - 1; i++) {
    const a = result[i];
    const b = result[i + 1];
    if (a.type !== "line" || b.type !== "line") continue;

    const adx = a.end.x - a.start.x;
    const ady = a.end.y - a.start.y;
    const bdx = b.end.x - b.start.x;
    const bdy = b.end.y - b.start.y;
    const al = Math.hypot(adx, ady);
    const bl = Math.hypot(bdx, bdy);
    if (al <= EPSILON || bl <= EPSILON) continue;

    const dotDir = (adx / al) * (bdx / bl) + (ady / al) * (bdy / bl);
    if (dotDir < -0.5) {
      reversalCount += 1;
      if (reversalCount > 1) {
        return result;
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < result.length - 2; i++) {
      for (let j = i + 2; j < result.length; j++) {
        // Backtrack trimming is intended for local U-loop collapses.
        // Long-range pairs across multiple independent bridge zones can create
        // false positives and collapse valid contour middle spans.
        if (j - i > MAX_LOCAL_BACKTRACK_SPAN) continue;

        // ── Pattern 4: entry consumed (ti ≤ 0) AND exit fully consumed (tj > 1) ──
        //
        // Checked FIRST, before the regular intersection test, because this pattern
        // occurs when d is large enough that seg[i]'s start is already past the exit
        // line — findLineSelfIntersection would reject it (ti ≤ EPSILON).
        //
        // Guard is the same as below: all intermediates must be LINE type and at
        // least one must reverse relative to seg[j].  Additionally, the backtrack
        // must also include a reversal relative to seg[i] itself (to avoid matching
        // a degenerate corner in a closed contour where two segments merely share an
        // endpoint).
        const collapse = findEntryCollapse(result[i], result[j]);
        if (collapse !== null) {
          // Additional guard: all intermediates must be LINE type and at least one
          // must reverse relative to seg[j] (genuine backtrack, not a round join).
          // Also: seg[i].start and seg[j].end must NOT coincide — if they do, these
          // segments are simply connected at a corner of a closed contour, not a backtrack.
          const iStart = result[i].start;
          const jEnd = result[j].end;
          const isSharedCorner =
            Math.abs(iStart.x - jEnd.x) < EPSILON &&
            Math.abs(iStart.y - jEnd.y) < EPSILON;
          if (!isSharedCorner) {
            const segJDx = result[j].end.x - result[j].start.x;
            const segJDy = result[j].end.y - result[j].start.y;
            let allLines4 = true;
            let hasReversalJ = false;
            for (let m = i + 1; m < j; m++) {
              if (result[m].type !== "line") { allLines4 = false; break; }
              const mDx = result[m].end.x - result[m].start.x;
              const mDy = result[m].end.y - result[m].start.y;
              if (mDx * segJDx + mDy * segJDy < -EPSILON) hasReversalJ = true;
            }
            if (allLines4 && hasReversalJ) {
              // Both entry AND exit consumed — remove everything from i through j inclusive.
              log.debug(
                `trimSelfIntersections: entry seg[${i}] and exit seg[${j}] both consumed (Pattern 4), removing ${j - i + 1} segment(s)`
              );
              result.splice(i, j - i + 1);
              changed = true;
              break outer;
            }
          }
        }

        // ── Patterns 1/2/3: normal backtrack (ti > EPSILON) ──
        const pt = findLineSelfIntersection(result[i], result[j]);
        if (pt === null) continue;

        // Guard: verify that the intermediate segments form a genuine backtrack loop,
        // not an acute-angle round join whose LINE segments happen to cross.
        //
        // A genuine backtrack satisfies BOTH:
        //   1. All intermediate segments are LINE type (arc = valid round connector).
        //   2. At least one intermediate points in the OPPOSITE direction to seg[j]
        //      (dot product < -EPSILON).  A round join's neighbours are never reversed
        //      relative to the exiting segment.
        const segJDx = result[j].end.x - result[j].start.x;
        const segJDy = result[j].end.y - result[j].start.y;
        let allLines = true;
        let hasReversal = false;
        for (let m = i + 1; m < j; m++) {
          if (result[m].type !== "line") {
            allLines = false;
            break;
          }
          const mDx = result[m].end.x - result[m].start.x;
          const mDy = result[m].end.y - result[m].start.y;
          if (mDx * segJDx + mDy * segJDy < -EPSILON) {
            hasReversal = true;
          }
        }
        if (!allLines || !hasReversal) continue;

        // Use the parametric tj to determine what is consumed (ti > EPSILON guaranteed here):
        //
        //   tj < 1-EPSILON  → Pattern 1/2: normal trim (both segs partially used)
        //   tj ≥ 1-EPSILON  → Pattern 3: exit consumed/degenerate
        const tjVal = pt.tj;

        if (tjVal >= 1 - EPSILON) {
          // Pattern 3: exit consumed/degenerate — trim entry end, remove intermediates + exit.
          log.debug(
            `trimSelfIntersections: exit seg[${j}] ${tjVal > 1 + EPSILON ? "consumed" : "degenerate"} at (${pt.x.toFixed(4)},${pt.y.toFixed(4)}), removing ${j - i} segment(s) (intermediates + exit)`
          );
          setSegmentEndpoint(result[i], "end", pt);
          result.splice(i + 1, j - i); // remove intermediates AND seg[j]
        } else {
          // Pattern 1/2: normal backtrack trim.
          log.debug(
            `trimSelfIntersections: backtrack loop between seg[${i}] and seg[${j}] at (${pt.x.toFixed(4)},${pt.y.toFixed(4)}), removing ${j - i - 1} intermediate segment(s)`
          );
          setSegmentEndpoint(result[i], "end", pt);
          setSegmentEndpoint(result[j], "start", clonePoint(pt));
          result.splice(i + 1, j - i - 1);
        }
        changed = true;
        break outer;
      }
    }
  }
  return result;
}

function findArcLineIntersection(arcSegment, lineSegment, referencePoint) {
  if (arcSegment?.type !== "arc" || lineSegment?.type !== "line" || !arcSegment.arc) {
    return null;
  }

  const center = getArcCenter(arcSegment.arc, arcSegment);
  const radius = getArcRadius(arcSegment.arc, arcSegment);
  if (!center || radius == null) {
    return null;
  }

  const p1 = lineSegment.start;
  const p2 = lineSegment.end;
  const d = { x: p2.x - p1.x, y: p2.y - p1.y };
  const a = dot(d, d);
  if (a <= EPSILON * EPSILON) {
    return null;
  }

  const f = { x: p1.x - center.x, y: p1.y - center.y };
  const b = 2 * dot(f, d);
  const c = dot(f, f) - radius * radius;
  const disc = b * b - 4 * a * c;

  if (disc < -EPSILON) {
    return null;
  }

  const roots = [];
  if (Math.abs(disc) <= EPSILON) {
    roots.push(-b / (2 * a));
  } else {
    const sqrtDisc = Math.sqrt(Math.max(0, disc));
    roots.push((-b - sqrtDisc) / (2 * a));
    roots.push((-b + sqrtDisc) / (2 * a));
  }

  const validPoints = [];
  for (const t of roots) {
    const point = {
      x: p1.x + t * d.x,
      y: p1.y + t * d.y,
    };

    if (!isPointOnFiniteLineSegment(point, lineSegment, EPSILON)) {
      continue;
    }

    const angle = Math.atan2(point.y - center.y, point.x - center.x);
    if (
      !isAngleOnArcSweep(
        angle,
        arcSegment.arc.startAngle,
        arcSegment.arc.endAngle,
        arcSegment.arc.sweepFlag,
        EPSILON
      )
    ) {
      continue;
    }

    validPoints.push(point);
  }

  if (validPoints.length === 0) {
    return null;
  }

  const reference = referencePoint || arcSegment.end;
  let best = validPoints[0];
  let bestDistance = distance(best, reference);

  for (let i = 1; i < validPoints.length; i++) {
    const candidate = validPoints[i];
    const candidateDistance = distance(candidate, reference);
    if (candidateDistance < bestDistance) {
      best = candidate;
      bestDistance = candidateDistance;
    }
  }

  return best;
}

/**
 * Find the intersection of a full circle (center, radius) with a finite line segment.
 * Unlike findArcLineIntersection, this does NOT enforce arc angular sweep constraints —
 * it finds where the circle geometry meets the line, used for trimming arc endpoints.
 *
 * @param {{x:number,y:number}} center - Circle center
 * @param {number} radius - Circle radius
 * @param {{start:{x,y}, end:{x,y}}} lineSegment - The line segment to intersect
 * @param {{x:number,y:number}} referencePoint - Prefer intersection closest to this point
 * @returns {{x:number,y:number}|null} Best intersection point, or null if none on segment
 */
function findCircleLineSegmentIntersection(center, radius, lineSegment, referencePoint) {
  const p1 = lineSegment.start;
  const p2 = lineSegment.end;
  const d = { x: p2.x - p1.x, y: p2.y - p1.y };
  const a = dot(d, d);
  if (a <= EPSILON * EPSILON) {
    return null;
  }

  const f = { x: p1.x - center.x, y: p1.y - center.y };
  const b = 2 * dot(f, d);
  const c = dot(f, f) - radius * radius;
  const disc = b * b - 4 * a * c;

  if (disc < -EPSILON) {
    return null;
  }

  const roots = [];
  if (Math.abs(disc) <= EPSILON) {
    roots.push(-b / (2 * a));
  } else {
    const sqrtDisc = Math.sqrt(Math.max(0, disc));
    roots.push((-b - sqrtDisc) / (2 * a));
    roots.push((-b + sqrtDisc) / (2 * a));
  }

  const validPoints = [];
  for (const t of roots) {
    const point = { x: p1.x + t * d.x, y: p1.y + t * d.y };
    if (!isPointOnFiniteLineSegment(point, lineSegment, EPSILON)) {
      continue;
    }
    validPoints.push(point);
  }

  if (validPoints.length === 0) {
    return null;
  }

  const ref = referencePoint || p1;
  let best = validPoints[0];
  let bestDist = distance(best, ref);
  for (let i = 1; i < validPoints.length; i++) {
    const candidate = validPoints[i];
    const candidateDist = distance(candidate, ref);
    if (candidateDist < bestDist) {
      best = candidate;
      bestDist = candidateDist;
    }
  }

  return best;
}

/**
 * Find the intersection of a circle with an INFINITE line (no segment bounds check).
 * Used as fallback when the correct intersection lies outside the finite segment —
 * e.g. when a shrinking arc trims a short adjacent line segment.
 *
 * @param {{x:number,y:number}} center - Circle center
 * @param {number} radius - Circle radius
 * @param {{start:{x,y}, end:{x,y}}} lineSegment - Defines the line direction (treated as infinite)
 * @param {{x:number,y:number}} referencePoint - Prefer intersection closest to this point
 * @returns {{x:number,y:number}|null} Best intersection point, or null if no real intersection
 */
function findCircleLineIntersection(center, radius, lineSegment, referencePoint) {
  const p1 = lineSegment.start;
  const p2 = lineSegment.end;
  const d = { x: p2.x - p1.x, y: p2.y - p1.y };
  const a = dot(d, d);
  if (a <= EPSILON * EPSILON) {
    return null;
  }

  const f = { x: p1.x - center.x, y: p1.y - center.y };
  const b = 2 * dot(f, d);
  const c = dot(f, f) - radius * radius;
  const disc = b * b - 4 * a * c;

  // Use a relative tolerance for near-tangent detection to handle floating-point
  // center imprecision (e.g. from SVG endpoint form arc center derivation).
  // When |disc| is small relative to the scale (4*a*radius²), treat as tangent.
  const discTol = 4 * a * radius * radius * 1e-4;
  if (disc < -discTol) {
    return null;
  }

  const roots = [];
  if (disc <= discTol) {
    // Tangent or near-tangent: use the closest point on the infinite line to the center
    roots.push(-b / (2 * a));
  } else {
    const sqrtDisc = Math.sqrt(Math.max(0, disc));
    roots.push((-b - sqrtDisc) / (2 * a));
    roots.push((-b + sqrtDisc) / (2 * a));
  }

  // No segment bounds check — treat line as infinite
  const points = roots.map((t) => ({ x: p1.x + t * d.x, y: p1.y + t * d.y }));
  if (points.length === 0) return null;

  const ref = referencePoint || p1;
  let best = points[0];
  let bestDist = distance(best, ref);
  for (let i = 1; i < points.length; i++) {
    const cd = distance(points[i], ref);
    if (cd < bestDist) {
      best = points[i];
      bestDist = cd;
    }
  }
  return best;
}

function findJoinIntersection(current, next) {
  if (!current || !next) {
    return null;
  }

  if (current.type === "line" && next.type === "line") {
    return lineLineIntersection(
      current.end,
      getTangent(current, "end"),
      next.start,
      getTangent(next, "start")
    );
  }

  if (current.type === "arc" && next.type === "line") {
    return findArcLineIntersection(current, next, current.end);
  }

  if (current.type === "line" && next.type === "arc") {
    return findArcLineIntersection(next, current, current.end);
  }

  // Arc-arc not implemented yet
  return null;
}

function distancePointToInfiniteLine(point, lineStart, lineEnd) {
  const dir = {
    x: lineEnd.x - lineStart.x,
    y: lineEnd.y - lineStart.y,
  };
  const len = Math.hypot(dir.x, dir.y);
  if (len <= EPSILON) {
    return null;
  }

  const rel = {
    x: point.x - lineStart.x,
    y: point.y - lineStart.y,
  };

  return Math.abs(cross(dir, rel)) / len;
}

/**
 * For non-diverging sharp arc-line joins where geometric intersection is absent,
 * collapse arc join endpoint to nearest arc endpoint and preserve line direction
 * by projecting the far endpoint onto the line through joinPoint.
 *
 * @param {Object} current - Current offset segment (mutable)
 * @param {Object} next - Next offset segment (mutable)
 * @param {number} epsilon - Tolerance for degeneration checks
 * @returns {boolean} True when collapse was applied and arc is degenerated
 */
function tryCollapseArcLineJoin(current, next, epsilon = EPSILON) {
  const isArcLine = current?.type === "arc" && next?.type === "line";
  const isLineArc = current?.type === "line" && next?.type === "arc";
  if (!isArcLine && !isLineArc) {
    return false;
  }

  const arcSeg = isArcLine ? current : next;
  const lineSeg = isArcLine ? next : current;

  const distToStart = distancePointToInfiniteLine(
    arcSeg.start,
    lineSeg.start,
    lineSeg.end
  );
  const distToEnd = distancePointToInfiniteLine(
    arcSeg.end,
    lineSeg.start,
    lineSeg.end
  );

  if (distToStart == null || distToEnd == null) {
    return false;
  }

  const collapseToArcStart = distToStart <= distToEnd;

  // Only collapse when nearest endpoint is the non-join-side endpoint.
  // Otherwise this is a no-op and should continue with regular fallback chain.
  if ((isArcLine && !collapseToArcStart) || (isLineArc && collapseToArcStart)) {
    return false;
  }

  const joinPoint = collapseToArcStart
    ? clonePoint(arcSeg.start)
    : clonePoint(arcSeg.end);

  // Collapse arc from join-side endpoint to chosen endpoint
  if (isArcLine) {
    updateArcEndpointAndAngle(arcSeg, "end", joinPoint);
  } else {
    updateArcEndpointAndAngle(arcSeg, "start", joinPoint);
  }

  // Preserve line direction by projecting far endpoint onto line through joinPoint
  if (isArcLine) {
    // arc->line: set line.start = joinPoint, project line.end along original direction
    const dir = {
      x: lineSeg.end.x - lineSeg.start.x,
      y: lineSeg.end.y - lineSeg.start.y,
    };
    const dirLen = Math.hypot(dir.x, dir.y);
    
    if (dirLen > epsilon) {
      const u = { x: dir.x / dirLen, y: dir.y / dirLen };
      const farEnd = lineSeg.end;
      const t = (farEnd.x - joinPoint.x) * u.x + (farEnd.y - joinPoint.y) * u.y;
      lineSeg.start = clonePoint(joinPoint);
      lineSeg.end = {
        x: joinPoint.x + u.x * t,
        y: joinPoint.y + u.y * t,
      };
    } else {
      lineSeg.start = clonePoint(joinPoint);
    }
  } else {
    // line->arc: set line.end = joinPoint, project line.start along original direction
    const dir = {
      x: lineSeg.end.x - lineSeg.start.x,
      y: lineSeg.end.y - lineSeg.start.y,
    };
    const dirLen = Math.hypot(dir.x, dir.y);
    
    if (dirLen > epsilon) {
      const u = { x: dir.x / dirLen, y: dir.y / dirLen };
      const farEnd = lineSeg.start;
      const t = (farEnd.x - joinPoint.x) * u.x + (farEnd.y - joinPoint.y) * u.y;
      lineSeg.end = clonePoint(joinPoint);
      lineSeg.start = {
        x: joinPoint.x + u.x * t,
        y: joinPoint.y + u.y * t,
      };
    } else {
      lineSeg.end = clonePoint(joinPoint);
    }
  }

  return pointsEqual(arcSeg.start, arcSeg.end, epsilon);
}

function collapseArcLineAtNearEndpoint(current, next, joinPoint, epsilon = EPSILON) {
  const isArcLine = current?.type === "arc" && next?.type === "line";
  const isLineArc = current?.type === "line" && next?.type === "arc";
  if (!isArcLine && !isLineArc) {
    return false;
  }

  const arcSeg = isArcLine ? current : next;
  const lineSeg = isArcLine ? next : current;
  const oppositeArcEndpoint = isArcLine ? arcSeg.start : arcSeg.end;
  const tol = Math.max(epsilon * 10, 1e-9);

  if (!pointsEqual(joinPoint, oppositeArcEndpoint, tol)) {
    return false;
  }

  if (isArcLine) {
    updateArcEndpointAndAngle(arcSeg, "end", oppositeArcEndpoint);
  } else {
    updateArcEndpointAndAngle(arcSeg, "start", oppositeArcEndpoint);
  }

  // Preserve line direction by projecting far endpoint onto line through oppositeArcEndpoint
  if (isArcLine) {
    // arc->line: set line.start = oppositeArcEndpoint, project line.end along original direction
    const dir = {
      x: lineSeg.end.x - lineSeg.start.x,
      y: lineSeg.end.y - lineSeg.start.y,
    };
    const dirLen = Math.hypot(dir.x, dir.y);
    
    if (dirLen > epsilon) {
      const u = { x: dir.x / dirLen, y: dir.y / dirLen };
      const farEnd = lineSeg.end;
      const t = (farEnd.x - oppositeArcEndpoint.x) * u.x + (farEnd.y - oppositeArcEndpoint.y) * u.y;
      lineSeg.start = clonePoint(oppositeArcEndpoint);
      lineSeg.end = {
        x: oppositeArcEndpoint.x + u.x * t,
        y: oppositeArcEndpoint.y + u.y * t,
      };
    } else {
      lineSeg.start = clonePoint(oppositeArcEndpoint);
    }
  } else {
    // line->arc: set line.end = oppositeArcEndpoint, project line.start along original direction
    const dir = {
      x: lineSeg.end.x - lineSeg.start.x,
      y: lineSeg.end.y - lineSeg.start.y,
    };
    const dirLen = Math.hypot(dir.x, dir.y);
    
    if (dirLen > epsilon) {
      const u = { x: dir.x / dirLen, y: dir.y / dirLen };
      const farEnd = lineSeg.start;
      const t = (farEnd.x - oppositeArcEndpoint.x) * u.x + (farEnd.y - oppositeArcEndpoint.y) * u.y;
      lineSeg.end = clonePoint(oppositeArcEndpoint);
      lineSeg.start = {
        x: oppositeArcEndpoint.x + u.x * t,
        y: oppositeArcEndpoint.y + u.y * t,
      };
    } else {
      lineSeg.end = clonePoint(oppositeArcEndpoint);
    }
  }

  return true;
}

function stitchCollapsedArcThroughNeighborLineSupport(
  result,
  current,
  next,
  closed,
  nextIdx
) {
  if (!Array.isArray(result) || result.length < 2) {
    return false;
  }

  if (current?.type !== "arc" || next?.type !== "line") {
    return false;
  }

  const prev = result[result.length - 2];
  if (!prev || prev.type !== "line") {
    return false;
  }

  const prevNextIntersection = lineLineIntersection(
    prev.end,
    getTangent(prev, "end"),
    next.start,
    getTangent(next, "start")
  );

  if (!isFinitePoint(prevNextIntersection)) {
    return false;
  }

  prev.end = clonePoint(prevNextIntersection);
  updateArcEndpointAndAngle(current, "start", prevNextIntersection);
  updateArcEndpointAndAngle(current, "end", prevNextIntersection);
  next.start = clonePoint(prevNextIntersection);

  syncClosedLoopStart(result, closed, nextIdx, prevNextIntersection);

  return true;
}

function shouldCollapseArcLineJoin(current, next, epsilon = EPSILON) {
  const currentProbe = cloneSegment(current);
  const nextProbe = cloneSegment(next);
  return tryCollapseArcLineJoin(currentProbe, nextProbe, epsilon);
}

function computeSharpJoin(p1, d1, p2, d2, offsetDistance) {
  const intersection = lineLineIntersection(p1, d1, p2, d2);

  if (!intersection) {
    return null;
  }

  const dist1 = distance(p1, intersection);
  const dist2 = distance(p2, intersection);
  const maxMiterLen = Math.abs(offsetDistance) * MITER_LIMIT;

  const canApply = dist1 <= maxMiterLen && dist2 <= maxMiterLen;

  return { intersection, canApply };
}

/**
 * Check that a point object has finite numeric coordinates.
 *
 * @param {{x:number,y:number}|null|undefined} point
 * @returns {boolean}
 */
function isFinitePoint(point) {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

/**
 * Stitch two neighboring segments at a shared join point.
 *
 * @param {Object} current
 * @param {Object} next
 * @param {{x:number,y:number}} point
 */
function stitchJoinAtPoint(current, next, point) {
  setSegmentEndpoint(current, "end", point);
  setSegmentEndpoint(next, "start", point);
}

/**
 * Keep first segment start synchronized when the final join in a closed
 * contour mutates the stitched connection point.
 *
 * @param {Array<Object>} result
 * @param {boolean} closed
 * @param {number} nextIdx
 * @param {{x:number,y:number}} point
 */
function syncClosedLoopStart(result, closed, nextIdx, point) {
  if (closed && nextIdx === 0 && result.length > 0) {
    result[0].start = clonePoint(point);
  }
}

function createArcJoin(p1, p2, vertex, offsetDistance) {
  const radius = Math.abs(offsetDistance);

  const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  const angle2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);

  // Determine sweep direction by checking which arc (CW or CCW) is the shorter one.
  // For a convex corner with outward offset, the arc should go the "short way" around the vertex.
  // For a concave corner with inward offset, the arc should also go the "short way".
  // The correct sweep is the one that keeps the arc on the same side of the contour as the offset.
  let delta = angle2 - angle1;
  // Normalize to [-PI, PI]
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  // sweepFlag=1 means CCW (increasing angle), sweepFlag=0 means CW (decreasing angle)
  const sweepFlag = delta > 0 ? 1 : 0;

  return {
    type: "arc",
    start: clonePoint(p1),
    end: clonePoint(p2),
    arc: {
      center: clonePoint(vertex),
      radius,
      startAngle: angle1,
      endAngle: angle2,
      sweepFlag,
    },
  };
}

function isClosedContour(segments) {
  if (segments.length < 2) return false;
  const first = segments[0].start;
  const last = segments[segments.length - 1].end;
  return pointsEqual(first, last, POINT_TOLERANCE);
}

/**
 * Build offset contour with corner joins
 *
 * @param {Array} segments - Array of input segments {type, start, end, arc}
 * @param {number} distance - Offset distance (positive/negative)
 * @param {Object} options - Configuration
 * @param {string} [options.joinType="round"] - "sharp" or "round"
 * @param {string} [options.capType="round"] - "flat" or "round"
 * @param {boolean} [options.skipCap=false] - Skip automatic capping of open contours (for two-sided capping in OffsetEngine)
 * @returns {Array} Offset segments (may have self-intersections)
 */
export function buildOffsetContour(segments, distance, options = {}) {
  if (!Array.isArray(segments) || segments.length === 0) {
    log.warn(
      "buildOffsetContour: empty or invalid segments input",
      segments
    );
    return [];
  }

  const joinType = options.joinType || "round";
  const capType = options.capType || "round";
  const skipCap = options.skipCap === true;

  log.debug(
    `buildOffsetContour: processing ${segments.length} segments, distance=${distance}, join=${joinType}, cap=${capType}`
  );

  // Step 1: Offset each segment
  const offsetSegments = [];
  const sourceIndices = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const offset = offsetSegment(segment, distance);

    if (!offset) {
      log.warn(
        `buildOffsetContour: failed to offset segment ${i}, type=${segment.type}`
      );
      continue;
    }

    // Check if offset segment is degenerate (zero-length line or zero-sweep arc)
    if (isSegmentDegenerated(offset)) {
      log.debug(
        `buildOffsetContour: skipping degenerate offset segment ${i}, type=${offset.type}`
      );
      continue;
    }

    offsetSegments.push(offset);
    sourceIndices.push(i);
  }

  if (offsetSegments.length === 0) {
    log.warn("buildOffsetContour: no offset segments produced");
    return [];
  }

  const closed = isClosedContour(segments);
  log.debug(
    `buildOffsetContour: contour is ${closed ? "closed" : "open"}`
  );

  // Step 2: Process corners and joins
  let result = [];
  let droppedGapJoinCount = 0;
  const numSegs = offsetSegments.length;

  for (let i = 0; i < numSegs; i++) {
    const current = cloneSegment(offsetSegments[i]);
    const nextIdx = closed ? (i + 1) % numSegs : i + 1;
    const currentSourceIndex = sourceIndices[i];
    current.__sourceIndex = currentSourceIndex;

    result.push(current);

    // Only process joins for closed contours or between consecutive segments
    if (closed || i < numSegs - 1) {
      const next = offsetSegments[nextIdx];
      const nextSourceIndex = sourceIndices[nextIdx];
      const original = segments[currentSourceIndex];

      // For degenerate segments (zero-length, due to prior join trimming), the
      // tangent from the segment geometry is (0,0). Fall back to the source
      // segment direction so subsequent join logic can still find intersections.
      let inTangent = getTangent(current, "end");
      if (inTangent.x === 0 && inTangent.y === 0) {
        const srcSeg = segments[currentSourceIndex];
        if (srcSeg) inTangent = getTangent(srcSeg, "end");
      }
      const outTangent = getTangent(next, "start");
      const droppedGap = hasDroppedSourceGap(
        currentSourceIndex,
        nextSourceIndex,
        segments.length,
        closed
      );

      if (droppedGap) {
        droppedGapJoinCount += 1;
        // Pre-compute arcRadius of the dropped segment so the directIntersection
        // check below can distinguish "concave arc collapsed exactly" (needs bridge)
        // from "convex / no-arc collapsed" (can use direct intersection).
        const skippedForArcCheck = getSkippedSourceIndices(
          currentSourceIndex,
          nextSourceIndex,
          segments.length,
          closed
        );
        let droppedArcRadius = null;
        if (skippedForArcCheck.length === 1) {
          droppedArcRadius = getArcRadiusFromSegment(
            segments[skippedForArcCheck[0]]
          );
        }

        // Priority rule: prefer a direct intersection over a bridge, but only when
        // the intersection lies "in front of" both segments (t-parameters >= 0).
        // When the intersection is behind next.start (t2 < 0), the two offset
        // lines are already past each other — a bridge is required instead.
        //
        // Special case: when a concave arc collapses at exactly d = arcRadius,
        // t2 == 0 (next.start already sits on the intersection point). The
        // intersection is geometrically valid but the arc produced a П-bridge
        // pocket that must be preserved for offset consistency. We suppress the
        // direct-intersection path whenever a collapsed concave arc is involved
        // and t2 ≤ EPSILON (i.e. t2 == 0 within floating-point tolerance).
        const directIntersection = (() => {
          const pt = findJoinIntersection(current, next);
          if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) return null;

          // For line→line joins, verify the intersection is not behind next.start.
          if (current.type === "line" && next.type === "line") {
            const nextTangent = getTangent(next, "start");
            const dx = pt.x - next.start.x;
            const dy = pt.y - next.start.y;
            const t2 = nextTangent.x * dx + nextTangent.y * dy;
            if (t2 < -EPSILON) return null; // intersection is behind next → need bridge
            // When a concave arc collapsed at the exact offset distance the two
            // adjacent lines meet precisely at next.start (t2 ≈ 0). Using the
            // direct intersection here would skip the П-bridge that the arc
            // pocket requires, violating multi-step offset consistency.
            if (droppedArcRadius != null && t2 <= EPSILON) return null;
          }
          return pt;
        })();

        if (directIntersection) {
          stitchJoinAtPoint(current, next, directIntersection);
          collapseArcLineAtNearEndpoint(current, next, directIntersection, EPSILON);

          syncClosedLoopStart(result, closed, nextIdx, directIntersection);
          continue;
        }

        // No usable direct intersection — check whether segments are diverging or not.
        // Exception: when a concave arc has collapsed at exactly d=arcRadius, we must
        // force the П-bridge regardless of the diverging check (the tangent-bridge path
        // would produce a flat connector instead of the required pocket shape).
        const forceUBridge = droppedArcRadius != null && (() => {
          const pt = findJoinIntersection(current, next);
          if (!pt) return false;
          if (current.type === "line" && next.type === "line") {
            const nextTangent = getTangent(next, "start");
            const dx = pt.x - next.start.x;
            const dy = pt.y - next.start.y;
            const t2 = nextTangent.x * dx + nextTangent.y * dy;
            return t2 <= EPSILON; // exact collapse — directIntersection was suppressed
          }
          return false;
        })();

        const diverging = forceUBridge || isDivergingJoin(
          current.end,
          next.start,
          inTangent,
          outTangent
        );

        if (!diverging) {
          // Non-diverging but no intersection: try tangent bridge before U-bridge
          const tangent = buildTangentBridge(current, next);
          if (tangent) {
            result.push(tangent);
            continue;
          }
        }

        // Segments are diverging (or non-diverging fallbacks failed) — build U-bridge.
        // Re-use droppedArcRadius pre-computed above (same skipped-source lookup).
        const arcRadius = droppedArcRadius;

        const absD = Math.abs(distance);
        const leg = arcRadius != null ? Math.min(absD, arcRadius) : absD;
        const extra = absD - leg;

        const forcedBridge = buildDroppedGapBridge(
          current,
          next,
          inTangent,
          distance,
          { leg, extra, arcRadius }
        );

        if (forcedBridge.length > 0) {
          result.push(...forcedBridge);
          continue;
        }

        const fallbackArc = createArcJoin(
          current.end,
          next.start,
          original.end,
          distance
        );
        result.push(fallbackArc);
        continue;
      }

      const cornerType = computeJoinType(inTangent, outTangent);


      if (cornerType === "convex") {
        const originalVertex = original.end;

        if (joinType === "sharp") {
          // For arc→line or line→arc convex joins, try geometric circle-line intersection first.
          // This gives the correct trim point even when the arc end angle needs to be updated
          // (e.g., when the offset arc's sweep grows beyond the original angular range).
          let lineToArcNoIntersection = false;
          let lineToArcRadius = null;
          const arcLineTrimmed = (() => {
            if (current.type === "arc" && next.type === "line") {
              const center = getArcCenter(current.arc, current);
              const radius = getArcRadius(current.arc, current);
              if (!center || radius == null) return false;
              const pt =
                findCircleLineSegmentIntersection(center, radius, next, current.end) ??
                findCircleLineIntersection(center, radius, next, next.start);
              if (!pt) return false;
              stitchJoinAtPoint(current, next, pt);
              // If arc degenerated (start≈end after trimming), remove it from result.
              // Use a practical chord tolerance (1e-3) to handle floating-point center imprecision.
              const chordLen = Math.hypot(current.start.x - current.end.x, current.start.y - current.end.y);
              if (chordLen < 1e-3) {
                result.pop();
                // Snap previous segment's end to join point to close any floating-point gap
                if (result.length > 0) {
                  setSegmentEndpoint(result[result.length - 1], "end", pt);
                }
              }
              syncClosedLoopStart(result, closed, nextIdx, pt);
              return true;
            }
            if (current.type === "line" && next.type === "arc") {
              const center = getArcCenter(next.arc, next);
              const radius = getArcRadius(next.arc, next);
              lineToArcRadius = radius;
              if (!center || radius == null) return false;
              // For a convex line→arc join, prefer the circle-line intersection
              // closest to next.start (the arc's expected start position).
              // When the offset arc grows (outward), the line may cross the arc circle
              // at an interior point (entering intersection) far from next.start AND
              // at an exiting point just past the line's end that is closer to next.start.
              // findCircleLineSegmentIntersection picks the closest-to-ref point within
              // segment bounds and can return the interior (wrong) crossing; the infinite-
              // line version returns the exit point which is correct. Use whichever is
              // closer to next.start to get the correct trim anchor.
              const ptSeg = findCircleLineSegmentIntersection(center, radius, current, next.start);
              const ptInf = findCircleLineIntersection(center, radius, current, next.start);
              let pt = null;
              if (ptSeg && ptInf) {
                const dSeg = Math.hypot(ptSeg.x - next.start.x, ptSeg.y - next.start.y);
                const dInf = Math.hypot(ptInf.x - next.start.x, ptInf.y - next.start.y);
                pt = dSeg <= dInf ? ptSeg : ptInf;
              } else {
                pt = ptSeg ?? ptInf;
              }
              if (!pt) {
                lineToArcNoIntersection = true;
                return false;
              }
              stitchJoinAtPoint(current, next, pt);
              syncClosedLoopStart(result, closed, nextIdx, pt);
              return true;
            }
            return false;
          })();

          if (arcLineTrimmed) {
            continue;
          }

          // Pre-collapse anti-parallel line->arc case: near-separating geometry where
          // the arc has not collapsed yet, but line/arc already lose intersection.
          // Use sharp tangent bridge legs for orientation-invariant behavior.
          if (lineToArcNoIntersection) {
            const isAntiParallel = dot(inTangent, outTangent) < -0.5;
            const isPreCollapse =
              typeof lineToArcRadius === "number" &&
              Number.isFinite(lineToArcRadius) &&
              Math.abs(distance) + EPSILON < lineToArcRadius;

            if (isAntiParallel && isPreCollapse) {
              const sharpBridge = buildSharpTangentBridge(
                current,
                next,
                inTangent,
                outTangent,
                distance
              );
              if (sharpBridge.length > 0) {
                result.push(...sharpBridge);
                continue;
              }
            }
          }

          const sharpJoin = computeSharpJoin(
            current.end,
            inTangent,
            next.start,
            outTangent,
            distance
          );

          if (sharpJoin && sharpJoin.canApply) {
            // Sharp join is valid: trim current at intersection and stitch next segment
            stitchJoinAtPoint(current, next, sharpJoin.intersection); // FIX: stitch next segment to close gap

            // For closed contours, the last join (i = numSegs-1, nextIdx = 0)
            // modifies offsetSegments[0].start but result[0] was already pushed
            // with the original start. Update result[0].start to close the loop.
            syncClosedLoopStart(result, closed, nextIdx, sharpJoin.intersection);
          } else {
            // Miter limit exceeded: use diverging-only fallback with strict priority for non-diverging
            const diverging = isDivergingJoin(
              current.end,
              next.start,
              inTangent,
              outTangent
            );

            if (!diverging) {
              // Non-diverging (converging or tangent-facing):
              // Order: direct intersection -> tangent bridge -> arc fallback
              const directIntersection = findJoinIntersection(current, next);

              if (isFinitePoint(directIntersection)) {
                // Stitch both segments to intersection point
                stitchJoinAtPoint(current, next, directIntersection);
                collapseArcLineAtNearEndpoint(current, next, directIntersection, EPSILON);

                // Update result[0].start for closed contours
                syncClosedLoopStart(result, closed, nextIdx, directIntersection);
              } else {
                const isAntiParallel = dot(inTangent, outTangent) < -0.5;
                const isLineToArc = current.type === "line" && next.type === "arc";
                const isArcToLine = current.type === "arc" && next.type === "line";

                let isShrinkingPreCollapseArc = false;
                if (isLineToArc || isArcToLine) {
                  const arcSeg = isLineToArc ? next : current;
                  const arcRadius = getArcRadiusFromSegment(arcSeg);
                  if (arcRadius != null) {
                    const sweepFlag = arcSeg.arc?.sweepFlag === 1 ? 1 : 0;
                    const k = sweepFlag === 1 ? -1 : 1;
                    const shrinking = distance * k < 0;
                    const preCollapse = Math.abs(distance) <= arcRadius + EPSILON;
                    isShrinkingPreCollapseArc = shrinking && preCollapse;
                  }
                }

                if (isAntiParallel && isShrinkingPreCollapseArc && (isLineToArc || isArcToLine)) {
                  const antiParallelBridge = buildSharpTangentBridge(
                    current,
                    next,
                    inTangent,
                    outTangent,
                    distance
                  );
                  if (antiParallelBridge.length > 0) {
                    result.push(...antiParallelBridge);
                    continue;
                  }
                }

                const stitchedCollapsedArc =
                  shouldCollapseArcLineJoin(current, next, EPSILON) &&
                  stitchCollapsedArcThroughNeighborLineSupport(
                    result,
                    current,
                    next,
                    closed,
                    nextIdx
                  );

                if (stitchedCollapsedArc) {
                  continue;
                }

                const collapsedArcLine = tryCollapseArcLineJoin(current, next, EPSILON);
                if (collapsedArcLine) {
                  syncClosedLoopStart(result, closed, nextIdx, next.start);
                } else {
                  const tangent = buildTangentBridge(current, next);
                  if (tangent) {
                    result.push(tangent);
                  } else {
                    // Last resort for non-diverging: arc join
                    log.warn(
                      "Non-diverging segments: direct intersection and tangent bridge failed, using arc join"
                    );
                    const arcJoin = createArcJoin(
                      current.end,
                      next.start,
                      originalVertex,
                      distance
                    );
                    result.push(arcJoin);
                  }
                }
              }
            } else {
              // Segments are diverging - use U-bridge fallback chain
              let bridge = buildUShapeBridge(current, next);
              if (!bridge) {
                // U-bridge failed, try tangent bridge
                const tangent = buildTangentBridge(current, next);
                if (!tangent) {
                  // Last resort: arc join with warning
                  log.warn("Both U-bridge and tangent bridge failed, using arc join");
                  const arcJoin = createArcJoin(
                    current.end,
                    next.start,
                    originalVertex,
                    distance
                  );
                  result.push(arcJoin);
                } else {
                  // Tangent bridge returns single segment
                  result.push(tangent);
                }
              } else {
                // U-bridge returns array of 3 segments
                result.push(...bridge);
              }
            }
          }
        } else {
          // Round join
          const arcJoin = createArcJoin(
            current.end,
            next.start,
            originalVertex,
            distance
          );
          result.push(arcJoin);
        }
      } else if (cornerType === "concave" && joinType === "sharp") {
        // Concave corner with sharp join: trim both segments at their intersection point.
        // For arc→line or line→arc joins, use circle-line intersection for geometric accuracy
        // (tangent-tangent approximation fails when the trim point is far from the raw arc end).
        let concaveTrimmed = false;
        // Track whether we attempted a circle-line geometric intersection and it failed
        // (meaning the arc genuinely doesn't reach the line — segments are diverging).
        let circleLineIntersectionFailed = false;
        if (current.type === "arc" && next.type === "line") {
          const center = getArcCenter(current.arc, current);
          const radius = getArcRadius(current.arc, current);
          if (center && radius != null) {
            const pt =
              findCircleLineSegmentIntersection(center, radius, next, current.end) ??
              findCircleLineIntersection(center, radius, next, next.start);
            if (pt) {
              stitchJoinAtPoint(current, next, pt);
              // If arc degenerated (start≈end after trimming), remove it from result.
              // Use a practical chord tolerance (1e-3) to handle floating-point center imprecision.
              const chordLen = Math.hypot(current.start.x - current.end.x, current.start.y - current.end.y);
              if (chordLen < 1e-3) {
                result.pop();
                // Snap previous segment's end to join point to close any floating-point gap
                if (result.length > 0) {
                  setSegmentEndpoint(result[result.length - 1], "end", pt);
                }
              }
              syncClosedLoopStart(result, closed, nextIdx, pt);
              concaveTrimmed = true;
            } else {
              // Circle doesn't intersect the line — arc has shrunk away from the line.
              circleLineIntersectionFailed = true;
            }
          }
        } else if (current.type === "line" && next.type === "arc") {
          const center = getArcCenter(next.arc, next);
          const radius = getArcRadius(next.arc, next);
          if (center && radius != null) {
            const pt =
              findCircleLineSegmentIntersection(center, radius, current, next.start) ??
              findCircleLineIntersection(center, radius, current, next.start);
            if (pt) {
              stitchJoinAtPoint(current, next, pt);
              syncClosedLoopStart(result, closed, nextIdx, pt);
              concaveTrimmed = true;
            } else {
              circleLineIntersectionFailed = true;
            }
          }
        }

        if (!concaveTrimmed) {
          // When the arc's circle genuinely doesn't intersect the adjacent line, the segments
          // are diverging: the arc has shrunk past the point where it can meet the line.
          // In this case, build a bridge instead of forcing a tangent-line intersection
          // (which would produce an incorrect join point outside the actual geometry).
          if (circleLineIntersectionFailed) {
            // The arc's circle no longer intersects the adjacent line — the arc has shrunk
            // past the point where it can geometrically meet the line.
            //
            // Strategy: extend the arc to the angle where its tangent is anti-parallel to the
            // line direction (the "bridge angle"), then snap the line start to the foot of the
            // perpendicular from that bridge point onto the line. This produces a clean П-bridge.
            if (current.type === "arc" && next.type === "line") {
              const center = getArcCenter(current.arc, current);
              const radius = getArcRadius(current.arc, current);
              const lineDir = normalize({
                x: next.end.x - next.start.x,
                y: next.end.y - next.start.y,
              });

              if (center && radius != null && lineDir) {
                // Bridge angle: the angle on the arc circle closest to the line.
                // This is the direction from the arc center perpendicular toward the line.
                // lineNormal = left normal of lineDir
                const lineNormalX = -lineDir.y;
                const lineNormalY = lineDir.x;
                // Signed distance from center to line (positive = center on normal side)
                const P = next.start; // any point on line
                const centerToLine =
                  (P.x - center.x) * lineNormalX + (P.y - center.y) * lineNormalY;
                // Direction from center toward line
                const sign = centerToLine >= 0 ? 1 : -1;
                const dirToLineX = sign * lineNormalX;
                const dirToLineY = sign * lineNormalY;
                const bridgeAngle = Math.atan2(dirToLineY, dirToLineX);

                const bridgePoint = {
                  x: center.x + radius * Math.cos(bridgeAngle),
                  y: center.y + radius * Math.sin(bridgeAngle),
                };

                // Snap the arc end to the bridge point (also updates arc.endAngle)
                setSegmentEndpoint(current, "end", bridgePoint);

                // Snap next.start to the foot of perpendicular from bridgePoint onto the line
                const lineOrigin = next.start; // read after mutation is ok — bridgePoint is computed
                const tProj =
                  (bridgePoint.x - lineOrigin.x) * lineDir.x +
                  (bridgePoint.y - lineOrigin.y) * lineDir.y;
                const lineMatchPoint = {
                  x: lineOrigin.x + lineDir.x * tProj,
                  y: lineOrigin.y + lineDir.y * tProj,
                };
                setSegmentEndpoint(next, "start", lineMatchPoint);

                syncClosedLoopStart(result, closed, nextIdx, lineMatchPoint);
              }
            } else if (current.type === "line" && next.type === "arc") {
              // Symmetric case: line→arc
              const center = getArcCenter(next.arc, next);
              const radius = getArcRadius(next.arc, next);
              const lineDir = normalize({
                x: current.end.x - current.start.x,
                y: current.end.y - current.start.y,
              });

              if (center && radius != null && lineDir) {
                // Bridge angle: closest point on arc circle to the line.
                const lineNormalX = -lineDir.y;
                const lineNormalY = lineDir.x;
                const P = current.end;
                const centerToLine =
                  (P.x - center.x) * lineNormalX + (P.y - center.y) * lineNormalY;
                const sign = centerToLine >= 0 ? 1 : -1;
                const dirToLineX = sign * lineNormalX;
                const dirToLineY = sign * lineNormalY;
                const bridgeAngle = Math.atan2(dirToLineY, dirToLineX);

                const bridgePoint = {
                  x: center.x + radius * Math.cos(bridgeAngle),
                  y: center.y + radius * Math.sin(bridgeAngle),
                };

                // Snap the arc start to the bridge point (also updates arc.startAngle)
                setSegmentEndpoint(next, "start", bridgePoint);

                // Snap current.end to foot of perpendicular from bridgePoint onto the line
                const lineOrigin = current.start;
                const tProj =
                  (bridgePoint.x - lineOrigin.x) * lineDir.x +
                  (bridgePoint.y - lineOrigin.y) * lineDir.y;
                const lineMatchPoint = {
                  x: lineOrigin.x + lineDir.x * tProj,
                  y: lineOrigin.y + lineDir.y * tProj,
                };
                setSegmentEndpoint(current, "end", lineMatchPoint);

                syncClosedLoopStart(result, closed, nextIdx, lineMatchPoint);
              }
            }

            // After extending the arc and snapping the line, recompute tangents and check divergence
            const effectiveInTangent = getTangent(current, "end");
            const effectiveOutTangent = getTangent(next, "start");
            const diverging = isDivergingJoin(
              current.end,
              next.start,
              effectiveInTangent,
              effectiveOutTangent
            );
            if (diverging) {
              let bridge = buildUShapeBridge(current, next);
              if (bridge) {
                result.push(...bridge);
              } else {
                const tangent = buildTangentBridge(current, next);
                if (tangent) {
                  result.push(tangent);
                }
                // If both bridge types fail, leave segments as-is
              }
              continue;
            }
          }

          const trimJoin = computeSharpJoin(
            current.end,
            inTangent,
            next.start,
            outTangent,
            distance
          );

          if (trimJoin && trimJoin.canApply) {
            stitchJoinAtPoint(current, next, trimJoin.intersection);

            // Same fix for closed contours: update result[0].start
            syncClosedLoopStart(result, closed, nextIdx, trimJoin.intersection);
          }
          // If trim can't apply, leave segments as-is (they'll be handled by downstream logic)
        }
      } else if (cornerType === "tangent") {
        // G1 continuous connection: offset segments may have a gap
        const dx = next.start.x - current.end.x;
        const dy = next.start.y - current.end.y;
        const gapDist = Math.sqrt(dx * dx + dy * dy);
        
        if (gapDist < EPSILON) {
          // Already connected, no bridge needed
        } else if (joinType === "sharp") {
          const diverging = isDivergingJoin(
            current.end,
            next.start,
            inTangent,
            outTangent
          );

          if (!diverging) {
            // Non-diverging tangent gap: prioritize geometric trim before bridges.
            const directIntersection = findJoinIntersection(current, next);

            if (isFinitePoint(directIntersection)) {
              stitchJoinAtPoint(current, next, directIntersection);
              collapseArcLineAtNearEndpoint(current, next, directIntersection, EPSILON);

              syncClosedLoopStart(result, closed, nextIdx, directIntersection);
            } else {
              // Anti-parallel tangent check: when inTangent ≈ -outTangent (U-turn geometry)
              // AND the junction is line→arc (not arc→line), isDivergingJoin gives an
              // orientation-dependent result. The same physical junction produces
              // `diverging=false` for a forward line→arc traversal (gap to the right of
              // the left normal), but `diverging=true` for the reversed arc→line case
              // (gap to the left). For line→arc with no direct intersection, the correct
              // resolution is a U-bridge, not tryCollapseArcLineJoin.
              //
              // The arc→line case is intentionally excluded: at large offsets the arc
              // grows outward and the gap is resolved by the arc's sweep trimming or
              // stitch mechanisms that run after this block.
              const isAntiParallel = dot(inTangent, outTangent) < -0.5;
              const isLineToArc = current.type === "line" && next.type === "arc";
              const isArcToLine = current.type === "arc" && next.type === "line";

              // Mirror-invariant anti-parallel policy:
              // - line->arc and arc->line should behave symmetrically;
              // - only apply while the arc is shrinking and has not collapsed yet,
              //   otherwise keep legacy branches for post-collapse processing.
              let isShrinkingPreCollapseArc = false;
              if (isLineToArc || isArcToLine) {
                const arcSeg = isLineToArc ? next : current;
                const arcRadius = getArcRadiusFromSegment(arcSeg);
                if (arcRadius != null) {
                  const sweepFlag = arcSeg.arc?.sweepFlag === 1 ? 1 : 0;
                  const k = sweepFlag === 1 ? -1 : 1;
                  const shrinking = distance * k < 0;
                  const preCollapse = Math.abs(distance) <= arcRadius + EPSILON;
                  isShrinkingPreCollapseArc = shrinking && preCollapse;
                }
              }

              if (isAntiParallel && isShrinkingPreCollapseArc && (isLineToArc || isArcToLine)) {
                const antiParallelBridge = buildSharpTangentBridge(
                  current,
                  next,
                  inTangent,
                  outTangent,
                  distance
                );
                if (antiParallelBridge.length > 0) {
                  result.push(...antiParallelBridge);
                  continue;
                }
              }

              const stitchedCollapsedArc =
                shouldCollapseArcLineJoin(current, next, EPSILON) &&
                stitchCollapsedArcThroughNeighborLineSupport(
                  result,
                  current,
                  next,
                  closed,
                  nextIdx
                );

              if (stitchedCollapsedArc) {
                continue;
              }

              const collapsedArcLine = tryCollapseArcLineJoin(current, next, EPSILON);
              if (collapsedArcLine) {
                syncClosedLoopStart(result, closed, nextIdx, next.start);
              } else {
                const tangent = buildTangentBridge(current, next);
                if (tangent) {
                  result.push(tangent);
                } else {
                  const originalVertex = original.end;
                  result.push(
                    createArcJoin(current.end, next.start, originalVertex, distance)
                  );
                }
              }
            }
          } else {
            const bridgeSegments = buildSharpTangentBridge(
              current,
              next,
              inTangent,
              outTangent,
              distance
            );

            if (bridgeSegments.length > 0) {
              result.push(...bridgeSegments);
            } else {
              // Last resort: arc join
              log.warn(
                "Tangent connection: all bridge segments degenerated, using arc join"
              );
              const originalVertex = original.end;
              result.push(
                createArcJoin(current.end, next.start, originalVertex, distance)
              );
            }
          }
        } else {
          // Round mode: arc join
          const originalVertex = original.end;
          result.push(createArcJoin(current.end, next.start, originalVertex, distance));
        }
      }
    }
  }

  // Step 3: Cap open curves
  let finalSegments = result;
  if (!closed && !skipCap) {
    log.debug(
      `buildOffsetContour: applying ${capType} cap to open contour`
    );
    finalSegments = capOpenContour(
      finalSegments,
      distance,
      capType
    );
  }

  // Step 4: Filter out any degenerate segments (zero-length lines, zero-sweep arcs)
  // These can be introduced by join processing or bridge building
  finalSegments = finalSegments.filter((seg) => {
    const isDegenerate = isSegmentDegenerated(seg);
    if (isDegenerate) {
      log.debug(
        `buildOffsetContour: filtering degenerate segment: ${seg.type}`
      );
    }
    if (isDegenerate) {
      return false;
    }

    // Strict non-resurrection rule:
    // if a line segment trimmed from a source line degenerates, it must not
    // reappear as a flipped tiny segment (opposite direction).
    if (
      seg.type === "line" &&
      typeof seg.__sourceIndex === "number" &&
      Number.isInteger(seg.__sourceIndex) &&
      seg.__sourceIndex >= 0 &&
      seg.__sourceIndex < segments.length
    ) {
      const source = segments[seg.__sourceIndex];
      if (source?.type === "line") {
        const sourceDx = source.end.x - source.start.x;
        const sourceDy = source.end.y - source.start.y;
        const sourceLen = Math.hypot(sourceDx, sourceDy);

        const segDx = seg.end.x - seg.start.x;
        const segDy = seg.end.y - seg.start.y;
        const segLen = Math.hypot(segDx, segDy);

        if (segLen <= EPSILON || sourceLen <= EPSILON) {
          return false;
        }

        const sourceDir = { x: sourceDx / sourceLen, y: sourceDy / sourceLen };
        const segDir = { x: segDx / segLen, y: segDy / segLen };
        if (dot(sourceDir, segDir) <= 0) {
          log.debug(
            `buildOffsetContour: filtering reversed resurrected line from source ${seg.__sourceIndex}`
          );
          return false;
        }
      }
    }

    return true;
  });

  // Step 4b: Enforce monotonic arc degeneration (orientation-inversion check).
  // An arc that has passed through its collapse distance has an inverted orientation:
  // the cross product of (start−center) × (end−center) has the wrong sign for its sweepFlag.
  // Once an arc degenerates (collapses to zero chord), it must not reappear at larger offsets.
  for (let i = finalSegments.length - 1; i >= 0; i--) {
    const seg = finalSegments[i];
    if (seg.type !== "arc") continue;
    const center = getArcCenter(seg.arc, seg);
    if (!center) continue;

    const sx = seg.start.x - center.x, sy = seg.start.y - center.y;
    const ex = seg.end.x - center.x, ey = seg.end.y - center.y;
    const cross = sx * ey - sy * ex;
    const sweepFlag = seg.arc.sweepFlag;
    // sweepFlag=1 (CW in SVG = CCW in standard math): cross must be > 0
    // sweepFlag=0 (CCW in SVG = CW in standard math): cross must be < 0
    const inverted = sweepFlag === 1 ? cross < -EPSILON : cross > EPSILON;
    if (!inverted) continue;

    log.debug(
      `buildOffsetContour: removing orientation-inverted arc (cross=${cross.toFixed(4)}, sweepFlag=${sweepFlag})`
    );
    const prevSeg = i > 0 ? finalSegments[i - 1] : null;
    const nextSeg = i < finalSegments.length - 1 ? finalSegments[i + 1] : null;

    // Compute miter intersection of adjacent offset segments to reconnect them.
    let mitrePt = null;
    if (prevSeg && nextSeg) {
      const d1 = getTangent(prevSeg, "end");
      const d2 = getTangent(nextSeg, "start");
      if (d1 && d2) {
        mitrePt = lineLineIntersection(prevSeg.end, d1, nextSeg.start, d2);
      }
    }

    // Remove the inverted arc.
    finalSegments.splice(i, 1);
    // After splice: index i-1 = prev, index i = next (shifted down by 1).
    const mpt =
      mitrePt && Number.isFinite(mitrePt.x) && Number.isFinite(mitrePt.y)
        ? mitrePt
        : null;
    if (mpt) {
      if (i > 0) setSegmentEndpoint(finalSegments[i - 1], "end", mpt);
      if (i < finalSegments.length)
        setSegmentEndpoint(finalSegments[i], "start", mpt);
    } else {
      // Fallback: snap to saved arc endpoints.
      if (i > 0)
        setSegmentEndpoint(finalSegments[i - 1], "end", clonePoint(seg.start));
      if (i < finalSegments.length)
        setSegmentEndpoint(finalSegments[i], "start", clonePoint(seg.end));
    }
  }

  // Step 4c: Trim self-intersection backtrack loops.
  // When a П-bridge (or any narrow U-shape) collapses at large offsets, the raw
  // offset produces a short "backtrack" segment that doubles back over a later
  // segment. Detect this pattern (seg[i].end lies on interior of seg[j]) and
  // remove the intermediate loop, trimming seg[j].start to seg[i].end.
  // Important: when multiple dropped gaps are present in one open contour,
  // distant bridge zones may be falsely linked by backtrack detection.
  // Keep local trimming for the common single-gap case; skip for multi-gap.
  if (droppedGapJoinCount <= 1) {
    finalSegments = trimSelfIntersections(finalSegments);
  }

  // Strip internal metadata before returning public segments
  for (const seg of finalSegments) {
    if (Object.prototype.hasOwnProperty.call(seg, "__sourceIndex")) {
      delete seg.__sourceIndex;
    }
  }

  log.debug(
    `buildOffsetContour: returning ${finalSegments.length} segments`
  );
  return finalSegments;
}

export { getTangent, computeJoinType, lineLineIntersection, isAngleOnArcSweep, findJoinIntersection };
