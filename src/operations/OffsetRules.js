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
