/**
 * OffsetRules.js - Constants and helpers for the offset rules system
 *
 * Provides:
 * - Constants for offset operations (arc angle extension, tolerances)
 * - Degeneration checks for line and arc segments
 * - Arc center extraction with format compatibility
 * - Arc center restoration on offset segments
 *
 * Used by offset builders, trimmers, and bridge builders to ensure
 * robust handling of edge cases and format variations.
 */

/**
 * Arc angle extension in radians (3 degrees).
 * Used to extend arc angles slightly to ensure proper coverage when
 * building bridges and joining segments.
 *
 * @type {number}
 */
export const ARC_ANGLE_EXTENSION = 3 * Math.PI / 180;

/**
 * Bridge tolerance for numerical comparisons.
 * Used in bridge validation and segment merging.
 *
 * @type {number}
 */
export const BRIDGE_TOLERANCE = 1e-6;

/**
 * Degeneration epsilon for length and angle checks.
 * Below this threshold, segments are considered degenerate.
 *
 * @type {number}
 */
export const DEGENERATION_EPSILON = 1e-9;

/**
 * Check if a line segment is degenerate.
 *
 * A line segment is degenerate when the distance between its start
 * and end points is less than or equal to DEGENERATION_EPSILON.
 *
 * @param {Object} segment - Line segment with {type: "line", start, end}
 * @returns {boolean} True if segment is degenerate (length ≈ 0)
 */
export function isLineDegenerated(segment) {
  if (!segment || segment.type !== "line") {
    return true;
  }

  const { start, end } = segment;
  if (!start || !end) {
    return true;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const epsilonSquared = DEGENERATION_EPSILON * DEGENERATION_EPSILON;

  return lengthSquared <= epsilonSquared;
}

/**
 * Check if an arc segment is degenerate.
 *
 * An arc segment is degenerate when:
 * - No arc data present
 * - Radius ≤ DEGENERATION_EPSILON
 * - Sweep angle magnitude ≤ DEGENERATION_EPSILON (start angle ≈ end angle)
 * - Arc length (radius * |sweep|) ≤ DEGENERATION_EPSILON
 *
 * @param {Object} segment - Arc segment with {type: "arc", start, end, arc}
 * @returns {boolean} True if segment is degenerate
 */
export function isArcDegenerated(segment) {
  if (!segment || segment.type !== "arc") {
    return true;
  }

  const { arc } = segment;
  if (!arc) {
    return true;
  }

  const radius = arc.radius || 0;
  if (radius <= DEGENERATION_EPSILON) {
    return true;
  }

  const startAngle = arc.startAngle || 0;
  const endAngle = arc.endAngle || 0;
  const sweepFlag = arc.sweepFlag !== undefined ? arc.sweepFlag : 1;

  // Compute signed delta based on sweep direction
  let delta = endAngle - startAngle;

  // Adjust delta to sweep direction:
  // sweepFlag = 1 (CCW): delta should be positive
  // sweepFlag = 0 (CW): delta should be negative
  if (sweepFlag === 1 && delta < 0) {
    delta += 2 * Math.PI;
  } else if (sweepFlag === 0 && delta > 0) {
    delta -= 2 * Math.PI;
  }

  // Check angle magnitude
  if (Math.abs(delta) <= DEGENERATION_EPSILON) {
    return true;
  }

  // Check arc length
  const arcLength = Math.abs(radius * delta);
  if (arcLength <= DEGENERATION_EPSILON) {
    return true;
  }

  return false;
}

/**
 * Generic degeneration check that dispatches by segment type.
 *
 * @param {Object} segment - Line or arc segment
 * @returns {boolean} True if segment is degenerate
 */
export function isSegmentDegenerated(segment) {
  if (!segment) {
    return true;
  }

  if (segment.type === "line") {
    return isLineDegenerated(segment);
  }

  if (segment.type === "arc") {
    return isArcDegenerated(segment);
  }

  return true;
}

/**
 * Safely extract arc center from segment.
 *
 * Handles both storage formats:
 * - {center: {x, y}} (normalized format)
 * - {centerX, centerY} (legacy format)
 *
 * @param {Object} segment - Arc segment
 * @returns {Object|null} Arc center as {x, y}, or null if not found
 */
export function getArcCenter(segment) {
  if (!segment || !segment.arc) {
    return null;
  }

  const { arc } = segment;

  // Try normalized format first
  if (arc.center && typeof arc.center === "object") {
    return {
      x: arc.center.x,
      y: arc.center.y,
    };
  }

  // Try legacy format
  if (
    arc.centerX !== undefined &&
    arc.centerY !== undefined &&
    typeof arc.centerX === "number" &&
    typeof arc.centerY === "number"
  ) {
    return {
      x: arc.centerX,
      y: arc.centerY,
    };
  }

  return null;
}

/**
 * Restore original arc center onto an offset segment.
 *
 * Modifies the offset segment's arc center to match the original center,
 * while preserving all other arc properties (radius, angles, sweep).
 * Handles both storage formats.
 *
 * @param {Object} offsetSegment - Arc segment from offset operation
 * @param {Object} originalCenter - Original center as {x, y}
 * @returns {Object} The modified offsetSegment (mutated)
 */
export function preserveArcCenter(offsetSegment, originalCenter) {
  if (!offsetSegment || !offsetSegment.arc || !originalCenter) {
    return offsetSegment;
  }

  const { arc } = offsetSegment;

  // Update normalized format if present
  if (arc.center && typeof arc.center === "object") {
    arc.center.x = originalCenter.x;
    arc.center.y = originalCenter.y;
  }

  // Update legacy format if present
  if (arc.centerX !== undefined) {
    arc.centerX = originalCenter.x;
  }
  if (arc.centerY !== undefined) {
    arc.centerY = originalCenter.y;
  }

  return offsetSegment;
}

/**
 * Compute the signed angular span of an arc in radians.
 *
 * Positive delta indicates CCW sweep (sweepFlag = 1).
 * Negative delta indicates CW sweep (sweepFlag = 0).
 *
 * @param {Object} arc - Arc data with startAngle, endAngle, sweepFlag
 * @returns {number} Signed angular span in radians
 */
export function computeArcDelta(arc) {
  if (!arc) {
    return 0;
  }

  const startAngle = arc.startAngle || 0;
  const endAngle = arc.endAngle || 0;
  const sweepFlag = arc.sweepFlag !== undefined ? arc.sweepFlag : 1;

  let delta = endAngle - startAngle;

  // Adjust delta to sweep direction
  if (sweepFlag === 1 && delta < 0) {
    delta += 2 * Math.PI;
  } else if (sweepFlag === 0 && delta > 0) {
    delta -= 2 * Math.PI;
  }

  return delta;
}

/**
 * Compute arc length from arc radius and angular span.
 *
 * Arc length = |radius * delta|, where delta is the signed angular span.
 *
 * @param {Object} arc - Arc data with radius, startAngle, endAngle, sweepFlag
 * @returns {number} Arc length (always non-negative)
 */
export function computeArcLength(arc) {
  if (!arc) {
    return 0;
  }

  const radius = Math.abs(arc.radius || 0);
  const delta = computeArcDelta(arc);

  return radius * Math.abs(delta);
}

/**
 * Extend arc angles by a given amount in both directions.
 *
 * For intersection search, arcs are allowed to extend their angular
 * range slightly beyond their nominal start/end angles. This ensures
 * that tangential or near-tangential connections with neighboring
 * segments are not missed due to numerical precision.
 *
 * - startAngle is extended by -extension (backwards along the arc)
 * - endAngle is extended by +extension (forwards along the arc)
 * - The extension direction respects the sweep flag:
 *   * CCW (sweepFlag=1): startAngle -= extension, endAngle += extension
 *   * CW  (sweepFlag=0): startAngle += extension, endAngle -= extension
 *     (because CW arcs go in the negative angle direction)
 *
 * @param {Object} arc - Arc data {startAngle, endAngle, sweepFlag}
 * @param {number} extension - Angle extension in radians (positive)
 * @returns {{startAngle: number, endAngle: number}} Extended angles
 */
export function extendArcAngles(arc, extension) {
  if (!arc) return { startAngle: 0, endAngle: 0 };

  const sweep = arc.sweepFlag !== undefined ? arc.sweepFlag : 1;
  let startAngle = arc.startAngle || 0;
  let endAngle = arc.endAngle || 0;

  if (sweep === 1) {
    // CCW: extend start backwards, end forwards
    startAngle -= extension;
    endAngle += extension;
  } else {
    // CW: extend start forwards, end backwards (CW goes negative)
    startAngle += extension;
    endAngle -= extension;
  }

  return { startAngle, endAngle };
}

/**
 * Build a tangent bridge (line) between two offset segments.
 *
 * Creates a line segment from seg1.end to seg2.start.
 * This is used when two offset segments diverge and need
 * to be connected by a straight bridge.
 *
 * The bridge is a regular segment with no special flags —
 * it becomes a permanent part of the contour.
 *
 * @param {Object} seg1 - First segment (line or arc)
 * @param {Object} seg2 - Second segment (line or arc)
 * @returns {Object|null} Bridge segment {type: "line", start, end}, or null if inputs invalid
 */
export function buildTangentBridge(seg1, seg2) {
  if (!seg1 || !seg2 || !seg1.end || !seg2.start) return null;

  return {
    type: "line",
    start: { x: seg1.end.x, y: seg1.end.y },
    end: { x: seg2.start.x, y: seg2.start.y },
  };
}

/**
 * Build a U-shaped bridge between two diverging segments.
 *
 * Creates 3 line segments:
 * 1. Perpendicular from seg1.end (along seg1's normal)
 * 2. Connecting line between the two perpendiculars
 * 3. Perpendicular to seg2.start (along seg2's normal)
 *
 * The bridge length is proportional to the gap between segments.
 * Each perpendicular leg extends by half the gap distance.
 *
 * The bridges are regular segments with no special flags —
 * they become permanent parts of the contour.
 *
 * @param {Object} seg1 - First segment (line or arc)
 * @param {Object} seg2 - Second segment (line or arc)
 * @returns {Array<Object>|null} Array of 3 bridge segments, or null if invalid
 */
export function buildUShapeBridge(seg1, seg2) {
  if (!seg1 || !seg2 || !seg1.end || !seg2.start) return null;

  // Get tangents at the connection points
  const t1 = getTangentAtEnd(seg1);
  const t2 = getTangentAtStart(seg2);

  if (!t1 || !t2) return null;

  // Normals (perpendicular to tangents, pointing outward)
  const n1 = { x: -t1.y, y: t1.x };
  const n2 = { x: -t2.y, y: t2.x };

  // Gap distance
  const dx = seg2.start.x - seg1.end.x;
  const dy = seg2.start.y - seg1.end.y;
  const gap = Math.sqrt(dx * dx + dy * dy);

  if (gap < 1e-9) return null; // Already connected

  // Each leg extends by half the gap
  const legLen = gap / 2;

  // Point 1: seg1.end + n1 * legLen
  const p1 = { x: seg1.end.x + n1.x * legLen, y: seg1.end.y + n1.y * legLen };
  // Point 2: seg2.start + n2 * legLen
  const p2 = { x: seg2.start.x + n2.x * legLen, y: seg2.start.y + n2.y * legLen };

  return [
    { type: "line", start: { x: seg1.end.x, y: seg1.end.y }, end: p1 },
    { type: "line", start: p1, end: p2 },
    { type: "line", start: p2, end: { x: seg2.start.x, y: seg2.start.y } },
  ];
}

/**
 * Get tangent at the END of a segment.
 */
function getTangentAtEnd(segment) {
  if (segment.type === "line") {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-9) return null;
    return { x: dx / len, y: dy / len };
  }
  if (segment.type === "arc" && segment.arc) {
    const angle = segment.arc.endAngle;
    const sweep = segment.arc.sweepFlag !== undefined ? segment.arc.sweepFlag : 1;
    if (sweep === 1) {
      return { x: -Math.sin(angle), y: Math.cos(angle) };
    } else {
      return { x: Math.sin(angle), y: -Math.cos(angle) };
    }
  }
  return null;
}

/**
 * Get tangent at the START of a segment.
 */
function getTangentAtStart(segment) {
  if (segment.type === "line") {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-9) return null;
    return { x: dx / len, y: dy / len };
  }
  if (segment.type === "arc" && segment.arc) {
    const angle = segment.arc.startAngle;
    const sweep = segment.arc.sweepFlag !== undefined ? segment.arc.sweepFlag : 1;
    if (sweep === 1) {
      return { x: -Math.sin(angle), y: Math.cos(angle) };
    } else {
      return { x: Math.sin(angle), y: -Math.cos(angle) };
    }
  }
  return null;
}
