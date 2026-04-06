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
import { 
  buildUShapeBridge, 
  buildTangentBridge,
} from "./OffsetRules.js";

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

  // Step 1: Offset each segment and track mapping to originals
  const offsetSegments = [];
  const segmentMapping = []; // Maps offsetSegments[i] → segments[j]
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const offset = offsetSegment(segment, distance);

    if (!offset) {
      // offsetSegment returned null (e.g., arc degenerated to radius <= 0)
      // Skip this segment entirely - no placeholder generation
      // Join logic will reconnect neighbors naturally through existing sharp/concave trim logic
      log.debug(
        `buildOffsetContour: segment ${i} (${segment.type}) offset returned null, skipping segment`
      );
      continue;
    }

    offsetSegments.push(offset);
    segmentMapping.push(i); // Track which original segment this offset came from
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
    
    result.push(current);

    // Only process joins for closed contours or between consecutive segments
    if (closed || i < numSegs - 1) {
      const next = offsetSegments[nextIdx];
      const originalIdx = segmentMapping[i]; // Get original segment index
      const original = segments[originalIdx];

      const inTangent = getTangent(current, "end");
      const outTangent = getTangent(next, "start");
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
          // Sharp mode: Build tangent-based U-bridge (V-H-V)
          const p0 = current.end;
          const p3 = next.start;
          const leg = Math.abs(distance);
          
          // Compute bridge points using tangents and offset distance
          const p1 = {
            x: p0.x + inTangent.x * leg,
            y: p0.y + inTangent.y * leg
          };
          const p2 = {
            x: p3.x - outTangent.x * leg,
            y: p3.y - outTangent.y * leg
          };

          // Create bridge segments, skipping degenerate segments
          const bridgeSegments = [];
          
          // Segment p0 -> p1
          const dist01 = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
          if (dist01 > EPSILON) {
            bridgeSegments.push({
              type: "line",
              start: clonePoint(p0),
              end: clonePoint(p1),
            });
          }
          
          // Segment p1 -> p2
          const dist12 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
          if (dist12 > EPSILON) {
            bridgeSegments.push({
              type: "line",
              start: clonePoint(p1),
              end: clonePoint(p2),
            });
          }
          
          // Segment p2 -> p3
          const dist23 = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2);
          if (dist23 > EPSILON) {
            bridgeSegments.push({
              type: "line",
              start: clonePoint(p2),
              end: clonePoint(p3),
            });
          }

          // If all three segments degenerate, try buildTangentBridge
          if (bridgeSegments.length === 0) {
            const tangent = buildTangentBridge(current, next);
            if (tangent) {
              result.push(tangent);
            } else {
              // Last resort: arc join
              log.warn("Tangent connection: all bridge segments degenerated, using arc join");
              const originalVertex = original.end;
              result.push(createArcJoin(current.end, next.start, originalVertex, distance));
            }
          } else {
            result.push(...bridgeSegments);
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

  log.debug(
    `buildOffsetContour: returning ${finalSegments.length} segments`
  );
  return finalSegments;
}

export { getTangent, computeJoinType, lineLineIntersection };
