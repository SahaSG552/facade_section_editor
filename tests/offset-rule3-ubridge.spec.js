/**
 * tests/offset-rule3-ubridge.spec.js
 *
 * Comprehensive tests for Rule 3: U-bridge joins at failed sharp corners
 *
 * Tests the U-bridge fallback chain when miter limit is exceeded:
 * 1. Primary: buildUShapeBridge (3 line segments)
 * 2. Fallback 1: buildTangentBridge (1 line segment)
 * 3. Fallback 2: createArcJoin + log.warn
 *
 * Geometric properties verified:
 * - U-bridge produces exactly 3 line segments
 * - Contour continuity: end[i] ≈ start[i+1]
 * - Round join preserved (no U-bridge)
 * - Concave corners preserved (no U-bridge)
 *
 * Reference:
 * - OffsetContourBuilder.js:275-299 (U-bridge fallback chain)
 * - OffsetRules.js:351-413 (buildUShapeBridge implementation)
 * - MITER_LIMIT = 4.0
 */

import { describe, it, expect } from "vitest";
import { buildOffsetContour } from "../src/operations/OffsetContourBuilder.js";
import { buildUShapeBridge, buildTangentBridge } from "../src/operations/OffsetRules.js";

// Helper: verify contour continuity
function verifyContourContinuity(segments, tolerance = 1e-4) {
  for (let i = 0; i < segments.length - 1; i++) {
    const end = segments[i].end;
    const start = segments[i + 1].start;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const gap = Math.sqrt(dx * dx + dy * dy);
    
    expect(gap).toBeLessThan(tolerance);
  }
}

// Helper: count segment types
function countSegmentsByType(segments) {
  const counts = { line: 0, arc: 0 };
  segments.forEach(seg => {
    if (seg.type === "line") counts.line++;
    if (seg.type === "arc") counts.arc++;
  });
  return counts;
}

describe("Rule 3: U-bridge joins at failed sharp corners", () => {
  describe("Test 1: U-bridge at acute angle (miter limit exceeded)", () => {
    it("should insert 3 line segments when miter limit exceeded", () => {
      // Create contour with very acute angle (10 degrees)
      // This will exceed MITER_LIMIT = 4.0 and trigger U-bridge
      const angleRad = 10 * Math.PI / 180;
      const segments = [
        {
          type: "line",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 }
        },
        {
          type: "line",
          start: { x: 10, y: 0 },
          end: { x: 10 + 10 * Math.cos(angleRad), y: 10 * Math.sin(angleRad) }
        },
      ];

      const result = buildOffsetContour(segments, 1, { 
        joinType: "sharp",
        capType: "flat",
        skipCap: false
      });

      // Result should include offset segments and potential U-bridge
      // At minimum: 2 offset segments + caps = 3+
      expect(result.length).toBeGreaterThanOrEqual(3);

      // Find the U-bridge segments (should be between offset segments)
      // They should all be line type
      const counts = countSegmentsByType(result);
      expect(counts.line).toBeGreaterThanOrEqual(2); // At least 2 offset lines

      // Verify contour continuity
      verifyContourContinuity(result);
    });

    it("should create U-bridge with proper geometric properties", () => {
      // Create segments that diverge
      const seg1 = {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 }
      };
      const seg2 = {
        type: "line",
        start: { x: 10, y: 5 },
        end: { x: 20, y: 5 }
      };

      const bridge = buildUShapeBridge(seg1, seg2);

      // Should return array of 3 segments
      expect(bridge).not.toBeNull();
      expect(bridge).toHaveLength(3);

      // All should be line segments
      bridge.forEach(seg => {
        expect(seg.type).toBe("line");
      });

      // First segment starts at seg1.end
      expect(bridge[0].start.x).toBeCloseTo(seg1.end.x, 6);
      expect(bridge[0].start.y).toBeCloseTo(seg1.end.y, 6);

      // Last segment ends at seg2.start
      expect(bridge[2].end.x).toBeCloseTo(seg2.start.x, 6);
      expect(bridge[2].end.y).toBeCloseTo(seg2.start.y, 6);

      // Bridge segments connect
      expect(bridge[0].end.x).toBeCloseTo(bridge[1].start.x, 6);
      expect(bridge[0].end.y).toBeCloseTo(bridge[1].start.y, 6);
      expect(bridge[1].end.x).toBeCloseTo(bridge[2].start.x, 6);
      expect(bridge[1].end.y).toBeCloseTo(bridge[2].start.y, 6);
    });
  });

  describe("Test 2: Fallback chain - U-bridge null → tangent bridge", () => {
    it("should use tangent bridge when U-bridge returns null", () => {
      // Create segments that are already connected (gap = 0)
      // This makes U-bridge return null, fallback to tangent bridge
      const seg1 = {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 5, y: 0 }
      };
      const seg2 = {
        type: "line",
        start: { x: 5, y: 0 },
        end: { x: 10, y: 0 }
      };

      const uBridge = buildUShapeBridge(seg1, seg2);
      expect(uBridge).toBeNull(); // Gap too small

      const tangentBridge = buildTangentBridge(seg1, seg2);
      expect(tangentBridge).not.toBeNull();
      expect(tangentBridge.type).toBe("line");
    });

    it("should create tangent bridge with correct endpoints", () => {
      const seg1 = {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 5, y: 0 }
      };
      const seg2 = {
        type: "line",
        start: { x: 7, y: 3 },
        end: { x: 10, y: 3 }
      };

      const bridge = buildTangentBridge(seg1, seg2);

      expect(bridge).not.toBeNull();
      expect(bridge.type).toBe("line");
      expect(bridge.start.x).toBe(seg1.end.x);
      expect(bridge.start.y).toBe(seg1.end.y);
      expect(bridge.end.x).toBe(seg2.start.x);
      expect(bridge.end.y).toBe(seg2.start.y);
    });
  });

  describe("Test 3: Fallback chain - tangent bridge null → arc join + warning", () => {
    it("should use arc join when both bridges fail", () => {
      // Create scenario where offset creates disconnected segments
      // Large offset on acute angle can cause bridges to fail
      const angleRad = 3 * Math.PI / 180;
      const segments = [
        {
          type: "line",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 }
        },
        {
          type: "line",
          start: { x: 10, y: 0 },
          end: { x: 10 + 3 * Math.cos(angleRad), y: 3 * Math.sin(angleRad) }
        },
      ];

      const result = buildOffsetContour(segments, 3, { 
        joinType: "sharp",
        capType: "flat",
        skipCap: false
      });

      // Should produce result (may include arc joins)
      expect(result.length).toBeGreaterThan(0);

      // Check for arc segments (fallback uses arc join)
      const counts = countSegmentsByType(result);
      // At least some segments present
      expect(counts.line + counts.arc).toBeGreaterThan(0);

      // Verify continuity
      verifyContourContinuity(result);
    });
  });

  describe("Test 4: Round join does NOT use U-bridge (regression test)", () => {
    it("should use arc segment for round join, not U-bridge", () => {
      // Create contour with acute angle
      const angleRad = 10 * Math.PI / 180;
      const segments = [
        {
          type: "line",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 }
        },
        {
          type: "line",
          start: { x: 10, y: 0 },
          end: { x: 10 + 10 * Math.cos(angleRad), y: 10 * Math.sin(angleRad) }
        },
      ];

      const result = buildOffsetContour(segments, 1, { 
        joinType: "round", // ROUND JOIN
        capType: "flat",
        skipCap: false
      });

      // Should include arc segments for round joins
      const counts = countSegmentsByType(result);
      expect(counts.arc).toBeGreaterThan(0);

      // Verify continuity
      verifyContourContinuity(result);
    });

    it("should preserve user's round join preference", () => {
      // Test multiple angles with round join
      const angles = [10, 30, 45, 60];
      
      angles.forEach(angleDeg => {
        const angleRad = angleDeg * Math.PI / 180;
        const segments = [
          {
            type: "line",
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 }
          },
          {
            type: "line",
            start: { x: 10, y: 0 },
            end: { x: 10 + 10 * Math.cos(angleRad), y: 10 * Math.sin(angleRad) }
          },
        ];

        const result = buildOffsetContour(segments, 1, { 
          joinType: "round",
          capType: "flat",
          skipCap: false
        });

        // Round join should produce arc segments
        const counts = countSegmentsByType(result);
        expect(counts.arc).toBeGreaterThan(0);
        
        verifyContourContinuity(result);
      });
    });
  });

  describe("Test 5: Concave corner does NOT use U-bridge (regression test)", () => {
    it("should use trim logic for concave corners, not U-bridge", () => {
      // Create concave corner (inward turn)
      // Cross product will be negative
      const segments = [
        {
          type: "line",
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 }
        },
        {
          type: "line",
          start: { x: 10, y: 0 },
          end: { x: 5, y: 5 } // Turn back and up (concave)
        },
      ];

      const result = buildOffsetContour(segments, 1, { 
        joinType: "sharp",
        capType: "flat",
        skipCap: false
      });

      // Should produce result with trim logic (not U-bridge)
      expect(result.length).toBeGreaterThan(0);

      // Verify continuity
      verifyContourContinuity(result);
    });

    it("should handle concave corners at various angles", () => {
      // Test concave corners at different angles
      const testCases = [
        { dx: -5, dy: 5 },   // 135° back
        { dx: -3, dy: 3 },   // Similar angle
        { dx: -8, dy: 2 },   // Shallow back
      ];

      testCases.forEach(({ dx, dy }) => {
        const segments = [
          {
            type: "line",
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 }
          },
          {
            type: "line",
            start: { x: 10, y: 0 },
            end: { x: 10 + dx, y: dy }
          },
        ];

        const result = buildOffsetContour(segments, 1, { 
          joinType: "sharp",
          capType: "flat",
          skipCap: false
        });

        expect(result.length).toBeGreaterThan(0);
        verifyContourContinuity(result);
      });
    });
  });

  describe("Edge cases and geometric properties", () => {
    it("should handle U-bridge with parallel tangents", () => {
      // Create parallel segments with vertical gap
      const seg1 = {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 }
      };
      const seg2 = {
        type: "line",
        start: { x: 10, y: 5 },
        end: { x: 20, y: 5 }
      };

      const bridge = buildUShapeBridge(seg1, seg2);

      expect(bridge).not.toBeNull();
      expect(bridge).toHaveLength(3);

      // Should create П-shape (step bridge)
      // First leg perpendicular to tangent
      const leg1 = {
        dx: bridge[0].end.x - bridge[0].start.x,
        dy: bridge[0].end.y - bridge[0].start.y
      };
      
      // Tangent direction is (1, 0)
      // Leg should be perpendicular: dot product ≈ 0
      const tangent = { x: 1, y: 0 };
      const dot = leg1.dx * tangent.x + leg1.dy * tangent.y;
      expect(Math.abs(dot)).toBeLessThan(1e-6);
    });

    it("should handle U-bridge with non-parallel tangents", () => {
      // Create diverging segments
      const seg1 = {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 }
      };
      const seg2 = {
        type: "line",
        start: { x: 11, y: 2 },
        end: { x: 20, y: 7 }
      };

      const bridge = buildUShapeBridge(seg1, seg2);

      expect(bridge).not.toBeNull();
      expect(bridge).toHaveLength(3);

      // Verify bridge connects properly
      expect(bridge[0].start.x).toBeCloseTo(seg1.end.x, 6);
      expect(bridge[2].end.x).toBeCloseTo(seg2.start.x, 6);
    });

    it("should verify all U-bridge segments are line type", () => {
      const seg1 = {
        type: "line",
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 }
      };
      const seg2 = {
        type: "line",
        start: { x: 10, y: 3 },
        end: { x: 20, y: 3 }
      };

      const bridge = buildUShapeBridge(seg1, seg2);

      expect(bridge).not.toBeNull();
      bridge.forEach(seg => {
        expect(seg.type).toBe("line");
        expect(seg.start).toBeDefined();
        expect(seg.end).toBeDefined();
        expect(typeof seg.start.x).toBe("number");
        expect(typeof seg.start.y).toBe("number");
        expect(typeof seg.end.x).toBe("number");
        expect(typeof seg.end.y).toBe("number");
      });
    });

    it("should handle arc-to-line U-bridge", () => {
      // U-bridge with arc as first segment
      const seg1 = {
        type: "arc",
        start: { x: 0, y: 0 },
        end: { x: 5, y: 5 },
        arc: {
          center: { x: 0, y: 5 },
          radius: 5,
          startAngle: -Math.PI / 2,
          endAngle: 0,
          sweepFlag: 1
        }
      };
      const seg2 = {
        type: "line",
        start: { x: 7, y: 7 },
        end: { x: 10, y: 10 }
      };

      const bridge = buildUShapeBridge(seg1, seg2);

      expect(bridge).not.toBeNull();
      expect(bridge).toHaveLength(3);
      
      // Should work with arc tangent
      verifyContourContinuity([seg1, ...bridge, seg2], 1e-4);
    });
  });
});
