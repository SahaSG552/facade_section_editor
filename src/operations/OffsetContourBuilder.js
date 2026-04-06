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
            // Miter limit exceeded: use bridge fallback chain
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
    return !isDegenerate;
  });

  log.debug(
    `buildOffsetContour: returning ${finalSegments.length} segments`
  );
  return finalSegments;
}

export { getTangent, computeJoinType, lineLineIntersection };
