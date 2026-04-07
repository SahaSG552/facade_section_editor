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
  
  const p3 = next.start;

  if (leg <= EPSILON) {
    const tangent = buildTangentBridge(current, next);
    return tangent ? [tangent] : [];
  }

  const normal = { x: -inTangent.y, y: inTangent.x };
  const horizontalGap = Math.abs(p3.x - p0.x) >= Math.abs(p3.y - p0.y);

  let p1;
  let p2;

  if (horizontalGap) {
    const ySign = Math.abs(normal.y) > EPSILON ? Math.sign(normal.y) : 1;
    const yOffset = ySign * leg;
    p1 = { x: p0.x, y: p0.y + yOffset };
    p2 = { x: p3.x, y: p0.y + yOffset };
  } else {
    const xSign = Math.abs(normal.x) > EPSILON ? Math.sign(normal.x) : 1;
    const xOffset = xSign * leg;
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

function getArcCenter(arc) {
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

  return null;
}

function getArcRadius(arc, arcSegment) {
  if (typeof arc?.radius === "number" && Number.isFinite(arc.radius)) {
    const r = Math.abs(arc.radius);
    if (r > EPSILON) {
      return r;
    }
  }

  const center = getArcCenter(arc);
  if (!center || !arcSegment?.start) {
    return null;
  }

  const fallback = Math.hypot(
    arcSegment.start.x - center.x,
    arcSegment.start.y - center.y
  );
  return Number.isFinite(fallback) && fallback > EPSILON ? fallback : null;
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

function findArcLineIntersection(arcSegment, lineSegment, referencePoint) {
  if (arcSegment?.type !== "arc" || lineSegment?.type !== "line" || !arcSegment.arc) {
    return null;
  }

  const center = getArcCenter(arcSegment.arc);
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
    arcSeg.end = clonePoint(joinPoint);
    if (arcSeg.arc) {
      arcSeg.arc.endAngle = arcSeg.arc.startAngle;
    }
  } else {
    arcSeg.start = clonePoint(joinPoint);
    if (arcSeg.arc) {
      arcSeg.arc.startAngle = arcSeg.arc.endAngle;
    }
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
    arcSeg.end = clonePoint(oppositeArcEndpoint);
    if (arcSeg.arc) {
      arcSeg.arc.endAngle = arcSeg.arc.startAngle;
    }
  } else {
    arcSeg.start = clonePoint(oppositeArcEndpoint);
    if (arcSeg.arc) {
      arcSeg.arc.startAngle = arcSeg.arc.endAngle;
    }
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

  if (
    !prevNextIntersection ||
    !Number.isFinite(prevNextIntersection.x) ||
    !Number.isFinite(prevNextIntersection.y)
  ) {
    return false;
  }

  prev.end = clonePoint(prevNextIntersection);
  current.start = clonePoint(prevNextIntersection);
  current.end = clonePoint(prevNextIntersection);
  if (current.arc) {
    current.arc.endAngle = current.arc.startAngle;
  }
  next.start = clonePoint(prevNextIntersection);

  if (closed && nextIdx === 0 && result.length > 0) {
    result[0].start = clonePoint(prevNextIntersection);
  }

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

      const inTangent = getTangent(current, "end");
      const outTangent = getTangent(next, "start");
      const droppedGap = hasDroppedSourceGap(
        currentSourceIndex,
        nextSourceIndex,
        segments.length,
        closed
      );

      if (droppedGap && joinType === "sharp") {
        const skippedSourceIndices = getSkippedSourceIndices(
          currentSourceIndex,
          nextSourceIndex,
          segments.length,
          closed
        );

        let arcRadius = null;
        if (skippedSourceIndices.length === 1) {
          arcRadius = getArcRadiusFromSegment(segments[skippedSourceIndices[0]]);
        }

        const absD = Math.abs(distance);
        const leg = arcRadius != null ? Math.min(absD, arcRadius) : absD;
        const extra = absD - leg;

        const forcedBridge = buildDroppedGapBridge(
          current,
          next,
          inTangent,
          distance,
          { leg, extra }
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
          const sharpJoin = computeSharpJoin(
            current.end,
            inTangent,
            next.start,
            outTangent,
            distance
          );

          if (sharpJoin && sharpJoin.canApply) {
            // Sharp join is valid: trim current at intersection and stitch next segment
            current.end = clonePoint(sharpJoin.intersection);
            next.start = clonePoint(sharpJoin.intersection); // FIX: stitch next segment to close gap

            // For closed contours, the last join (i = numSegs-1, nextIdx = 0)
            // modifies offsetSegments[0].start but result[0] was already pushed
            // with the original start. Update result[0].start to close the loop.
            if (closed && nextIdx === 0 && result.length > 0) {
              result[0].start = clonePoint(sharpJoin.intersection);
            }
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

              if (
                directIntersection &&
                Number.isFinite(directIntersection.x) &&
                Number.isFinite(directIntersection.y)
              ) {
                // Stitch both segments to intersection point
                current.end = clonePoint(directIntersection);
                next.start = clonePoint(directIntersection);
                collapseArcLineAtNearEndpoint(current, next, directIntersection, EPSILON);

                // Update result[0].start for closed contours
                if (closed && nextIdx === 0 && result.length > 0) {
                  result[0].start = clonePoint(directIntersection);
                }
              } else {
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
                  if (closed && nextIdx === 0 && result.length > 0) {
                    result[0].start = clonePoint(next.start);
                  }
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
        // Concave corner with sharp join: trim both segments at their intersection point
        const trimJoin = computeSharpJoin(
          current.end,
          inTangent,
          next.start,
          outTangent,
          distance
        );

        if (trimJoin && trimJoin.canApply) {
          current.end = clonePoint(trimJoin.intersection);
          next.start = clonePoint(trimJoin.intersection);

          // Same fix for closed contours: update result[0].start
          if (closed && nextIdx === 0 && result.length > 0) {
            result[0].start = clonePoint(trimJoin.intersection);
          }
        }
        // If trim can't apply, leave segments as-is (they'll be handled by downstream logic)
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

            if (
              directIntersection &&
              Number.isFinite(directIntersection.x) &&
              Number.isFinite(directIntersection.y)
            ) {
              current.end = clonePoint(directIntersection);
              next.start = clonePoint(directIntersection);
              collapseArcLineAtNearEndpoint(current, next, directIntersection, EPSILON);

              if (closed && nextIdx === 0 && result.length > 0) {
                result[0].start = clonePoint(directIntersection);
              }
            } else {
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
                if (closed && nextIdx === 0 && result.length > 0) {
                  result[0].start = clonePoint(next.start);
                }
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
