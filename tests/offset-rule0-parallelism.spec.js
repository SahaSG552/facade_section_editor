/**
 * tests/offset-rule0-parallelism.spec.js
 *
 * Tests for Rule 0: Parallelism and Equidistance Invariants
 *
 * Geometric invariants:
 * 1. Offset line segments are parallel to originals
 * 2. Offset line segments are equidistant from originals
 * 3. Offset arc segments preserve the original center
 * 4. U-bridge connections maintain parallelism after perpendicular legs
 * 5. Real-world contours maintain all invariants
 */

import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";

/**
 * Calculate normalized perpendicular vector (normal) for a line segment.
 * Returns the 90-degree CCW rotated unit vector.
 *
 * @param {LineSegment} segment - Line segment
 * @returns {{x: number, y: number}} Normalized normal vector
 */
function calculateNormal(segment) {
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const length = Math.hypot(dx, dy);
  
  if (length < 1e-10) {
    return { x: 0, y: 0 };
  }
  
  // Rotate 90 degrees CCW: (dx, dy) -> (-dy, dx)
  return {
    x: -dy / length,
    y: dx / length,
  };
}

/**
 * Calculate dot product of two vectors.
 *
 * @param {{x: number, y: number}} v1 - First vector
 * @param {{x: number, y: number}} v2 - Second vector
 * @returns {number} Dot product
 */
function dotProduct(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Calculate perpendicular distance from a point to a line defined by two points.
 *
 * @param {{x: number, y: number}} point - Point to measure from
 * @param {{x: number, y: number}} lineStart - Line start point
 * @param {{x: number, y: number}} lineEnd - Line end point
 * @returns {number} Perpendicular distance
 */
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.hypot(dx, dy);
  
  if (length < 1e-10) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }
  
  // Use cross product to find perpendicular distance
  // distance = |cross product| / |line length|
  const cross = Math.abs(
    (point.x - lineStart.x) * dy - (point.y - lineStart.y) * dx
  );
  
  return cross / length;
}

/**
 * Check if two line segments are parallel within tolerance.
 * Segments are parallel if their direction vectors have dot product ≈ ±1.
 *
 * @param {LineSegment} seg1 - First line segment
 * @param {LineSegment} seg2 - Second line segment
 * @param {number} tolerance - Tolerance for dot product (default: 0.001)
 * @returns {boolean} True if segments are parallel
 */
function areParallel(seg1, seg2, tolerance = 0.001) {
  const dir1 = {
    x: seg1.end.x - seg1.start.x,
    y: seg1.end.y - seg1.start.y,
  };
  const dir2 = {
    x: seg2.end.x - seg2.start.x,
    y: seg2.end.y - seg2.start.y,
  };
  
  const len1 = Math.hypot(dir1.x, dir1.y);
  const len2 = Math.hypot(dir2.x, dir2.y);
  
  if (len1 < 1e-10 || len2 < 1e-10) {
    return false;
  }
  
  // Normalize
  dir1.x /= len1;
  dir1.y /= len1;
  dir2.x /= len2;
  dir2.y /= len2;
  
  const dot = Math.abs(dotProduct(dir1, dir2));
  return Math.abs(dot - 1.0) < tolerance;
}

/**
 * Get arc center from segment, handling both formats.
 *
 * @param {ArcSegment} segment - Arc segment
 * @returns {{x: number, y: number}|null} Arc center or null
 */
function getArcCenter(segment) {
  if (!segment || !segment.arc) return null;
  
  const arc = segment.arc;
  
  if (arc.center) {
    return { x: arc.center.x, y: arc.center.y };
  }
  
  if (typeof arc.centerX === "number" && typeof arc.centerY === "number") {
    return { x: arc.centerX, y: arc.centerY };
  }
  
  return null;
}

describe("Rule 0: Parallelism and Equidistance Invariants", () => {
  it("should maintain parallel offset for horizontal line segments (normal dot product ≈ 1.0)", () => {
    // Test horizontal line: (0, 0) -> (10, 0)
    const segments = [
      {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
      },
    ];
    
    const offsetDistance = 2;
    const result = buildOffsetContour(segments, offsetDistance, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("line");
    
    // Calculate normals for original and offset segments
    const originalNormal = calculateNormal(segments[0]);
    const offsetNormal = calculateNormal(result[0]);
    
    // Normals should point in the same direction (dot product ≈ 1.0)
    const normalDot = dotProduct(originalNormal, offsetNormal);
    expect(Math.abs(normalDot)).toBeCloseTo(1.0, 4);
    
    // Check that segments are parallel
    expect(areParallel(segments[0], result[0], 0.001)).toBe(true);
  });

  it("should maintain equidistant offset for line segments (perpendicular distance = offsetDistance ± tolerance)", () => {
    // Test diagonal line: (0, 0) -> (10, 10)
    const segments = [
      {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      },
    ];
    
    const offsetDistance = 3;
    const result = buildOffsetContour(segments, offsetDistance, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("line");
    
    // Measure perpendicular distance from offset line's start point to original line
    const distStart = perpendicularDistance(
      result[0].start,
      segments[0].start,
      segments[0].end
    );
    
    // Measure perpendicular distance from offset line's end point to original line
    const distEnd = perpendicularDistance(
      result[0].end,
      segments[0].start,
      segments[0].end
    );
    
    // Both distances should equal offsetDistance within tolerance
    expect(distStart).toBeCloseTo(offsetDistance, 6);
    expect(distEnd).toBeCloseTo(offsetDistance, 6);
  });

  it("should preserve arc center when offsetting arc segments (center unchanged)", () => {
    // Test quarter circle arc: center (5, 5), radius 3, CCW from 0° to 90°
    const segments = [
      {
        type: "arc",
        start: { x: 8, y: 5 },
        end: { x: 5, y: 8 },
        arc: {
          center: { x: 5, y: 5 },
          centerX: 5,
          centerY: 5,
          radius: 3,
          startAngle: 0,
          endAngle: Math.PI / 2,
          sweepFlag: 1,
        },
      },
    ];
    
    const offsetDistance = 2;
    const result = buildOffsetContour(segments, offsetDistance, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("arc");
    
    const originalCenter = getArcCenter(segments[0]);
    const offsetCenter = getArcCenter(result[0]);
    
    // Centers should be identical
    expect(offsetCenter.x).toBeCloseTo(originalCenter.x, 6);
    expect(offsetCenter.y).toBeCloseTo(originalCenter.y, 6);
    
    // For CCW arc (sweepFlag=1), positive offset shrinks radius (inward offset)
    // Formula: newRadius = radius + distance * (sweepFlag === 1 ? -1 : 1)
    expect(result[0].arc.radius).toBeCloseTo(segments[0].arc.radius - offsetDistance, 6);
  });

  it("should maintain parallelism after U-bridge connection (arc+line sharp connection)", () => {
    // Create contour with arc followed by line where offset segments diverge
    // Use a CW arc (sweepFlag=0) so offset goes outward and creates gap
    const segments = [
      {
        type: "arc",
        start: { x: 10, y: 5 },
        end: { x: 5, y: 0 },
        arc: {
          center: { x: 5, y: 5 },
          centerX: 5,
          centerY: 5,
          radius: 5,
          startAngle: 0,
          endAngle: -Math.PI / 2,
          sweepFlag: 0,
        },
      },
      {
        type: "line",
        start: { x: 5, y: 0 },
        end: { x: 15, y: 0 },
      },
    ];
    
    const offsetDistance = 2;
    const result = buildOffsetContour(segments, offsetDistance, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });
    
    // Result should contain at least the arc and line segments
    // May have bridge segments if gap exists
    expect(result.length).toBeGreaterThanOrEqual(2);
    
    // Find the offset arc (should be present)
    const offsetArc = result.find(s => s.type === "arc");
    expect(offsetArc).toBeDefined();
    
    // Find offset line segments
    const lineSegments = result.filter(s => s.type === "line");
    expect(lineSegments.length).toBeGreaterThanOrEqual(1);
    
    // Find the main offset line (last line segment or one matching direction)
    const offsetLine = lineSegments.find(seg => {
      const dir = { x: seg.end.x - seg.start.x, y: seg.end.y - seg.start.y };
      return Math.abs(dir.y) < 0.1; // horizontal line
    }) || lineSegments[lineSegments.length - 1];
    
    expect(offsetLine).toBeDefined();
    
    // Original line segment should be parallel to offset line segment
    const originalLine = segments[1];
    expect(areParallel(originalLine, offsetLine, 0.05)).toBe(true);
    
    // Verify arc center is preserved
    const originalCenter = getArcCenter(segments[0]);
    const offsetArcCenter = getArcCenter(offsetArc);
    expect(offsetArcCenter.x).toBeCloseTo(originalCenter.x, 5);
    expect(offsetArcCenter.y).toBeCloseTo(originalCenter.y, 5);
  });

  it("should maintain parallelism and equidistance on user's example contour (contour 2)", () => {
    // User's example contour from original request:
    // M 10 10 → L 2 10 → A 2 2 0 0 1 0 8 → L 0 16
    // This represents:
    // - Line: (10,10) → (2,10)
    // - Arc: center (2,8), radius 2, from (2,10) to (0,8)
    // - Line: (0,8) → (0,16)
    
    const segments = [
      {
        type: "line",
        start: { x: 10, y: 10 },
        end: { x: 2, y: 10 },
      },
      {
        type: "arc",
        start: { x: 2, y: 10 },
        end: { x: 0, y: 8 },
        arc: {
          centerX: 2,
          centerY: 8,
          center: { x: 2, y: 8 },
          radius: 2,
          startAngle: 90,   // degrees (will be converted to radians by offsetArc)
          endAngle: 180,    // degrees
          sweepFlag: 1,
        },
      },
      {
        type: "line",
        start: { x: 0, y: 8 },
        end: { x: 0, y: 16 },
      },
    ];
    
    const offsetDistance = 1;
    const result = buildOffsetContour(segments, offsetDistance, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });
    
    // Should have at least 3 segments (may have bridge segments)
    expect(result.length).toBeGreaterThanOrEqual(3);
    
    // Extract line segments from result
    const lineSegments = result.filter(s => s.type === "line");
    expect(lineSegments.length).toBeGreaterThanOrEqual(2);
    
    // Find arc segment
    const arcSegments = result.filter(s => s.type === "arc");
    expect(arcSegments.length).toBeGreaterThanOrEqual(1);
    const offsetArc = arcSegments[0];
    
    // Test 1: First line segment (horizontal) should be parallel to original
    const firstLine = segments[0];
    const offsetFirstLine = lineSegments[0];
    
    // Check parallelism
    expect(areParallel(firstLine, offsetFirstLine, 0.01)).toBe(true);
    
    // Check equidistance
    const dist1Start = perpendicularDistance(
      offsetFirstLine.start,
      firstLine.start,
      firstLine.end
    );
    const dist1End = perpendicularDistance(
      offsetFirstLine.end,
      firstLine.start,
      firstLine.end
    );
    expect(dist1Start).toBeCloseTo(offsetDistance, 5);
    expect(dist1End).toBeCloseTo(offsetDistance, 5);
    
    // Test 2: Arc center should be preserved
    const originalCenter = getArcCenter(segments[1]);
    const offsetArcCenter = getArcCenter(offsetArc);
    expect(offsetArcCenter.x).toBeCloseTo(originalCenter.x, 5);
    expect(offsetArcCenter.y).toBeCloseTo(originalCenter.y, 5);
    
    // Test 3: Last line segment (vertical) should be parallel to original
    const lastLine = segments[2];
    const offsetLastLine = lineSegments[lineSegments.length - 1];
    
    // Check parallelism
    expect(areParallel(lastLine, offsetLastLine, 0.01)).toBe(true);
    
    // Check equidistance
    const dist3Start = perpendicularDistance(
      offsetLastLine.start,
      lastLine.start,
      lastLine.end
    );
    const dist3End = perpendicularDistance(
      offsetLastLine.end,
      lastLine.start,
      lastLine.end
    );
    expect(dist3Start).toBeCloseTo(offsetDistance, 5);
    expect(dist3End).toBeCloseTo(offsetDistance, 5);
  });

  it("should maintain parallelism for vertical line segments", () => {
    // Test vertical line: (5, 0) -> (5, 10)
    const segments = [
      {
        type: "line",
        start: { x: 5, y: 0 },
        end: { x: 5, y: 10 },
      },
    ];
    
    const offsetDistance = 1.5;
    const result = buildOffsetContour(segments, offsetDistance, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("line");
    
    // Verify parallelism
    expect(areParallel(segments[0], result[0], 0.001)).toBe(true);
    
    // Verify equidistance at both endpoints
    const distStart = perpendicularDistance(
      result[0].start,
      segments[0].start,
      segments[0].end
    );
    const distEnd = perpendicularDistance(
      result[0].end,
      segments[0].start,
      segments[0].end
    );
    
    expect(distStart).toBeCloseTo(offsetDistance, 6);
    expect(distEnd).toBeCloseTo(offsetDistance, 6);
  });

  it("should preserve arc center for CW arc (sweepFlag=0)", () => {
    // Test CW arc: center (0, 0), radius 5, from 0° to -90°
    const segments = [
      {
        type: "arc",
        start: { x: 5, y: 0 },
        end: { x: 0, y: -5 },
        arc: {
          center: { x: 0, y: 0 },
          centerX: 0,
          centerY: 0,
          radius: 5,
          startAngle: 0,
          endAngle: -Math.PI / 2,
          sweepFlag: 0,
        },
      },
    ];
    
    const offsetDistance = 1;
    const result = buildOffsetContour(segments, offsetDistance, {
      joinType: "sharp",
      capType: "flat",
      skipCap: true,
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("arc");
    
    const originalCenter = getArcCenter(segments[0]);
    const offsetCenter = getArcCenter(result[0]);
    
    // Centers should be identical
    expect(offsetCenter.x).toBeCloseTo(originalCenter.x, 6);
    expect(offsetCenter.y).toBeCloseTo(originalCenter.y, 6);
    
    // For CW arc (sweepFlag=0), positive offset grows radius (outward offset)
    // Formula: newRadius = radius + distance * (sweepFlag === 1 ? -1 : 1)
    expect(result[0].arc.radius).toBeCloseTo(segments[0].arc.radius + offsetDistance, 6);
  });
});
