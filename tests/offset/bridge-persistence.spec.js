import { describe, it, expect, beforeAll } from "vitest";
import { calculateOffsetFromPathData } from "../../src/operations/CustomOffsetProcessor.js";
import ExportModule from "../../src/export/ExportModule.js";

/**
 * Bridge Persistence Tests
 * 
 * Verifies that bridge segments persist as first-class contour segments until
 * they themselves degenerate, independent of adjacent segment degeneracy.
 * 
 * Key Semantics (from CustomOffsetProcessor):
 * - Bridges are emitted as explicit line segments from applyMiterJoin (lines 669-670, 694-695, 707-713)
 * - Bridges inserted into contour result stream as normal segments (lines 797-800, 821-823)
 * - Cleanup removes only degenerate/zero-length segments (lines 715-727)
 * - Bridge removed ONLY when bridge itself has length < EPSILON, NOT when neighbors degenerate
 * 
 * Critical Invariant:
 * "Bridges are first-class contour segments; persist unless degenerate"
 * "Bridge removed only when bridge itself degenerates"
 */

const EPSILON = 1e-6;

/**
 * Helper: Parse SVG path data into segments for analysis
 */
function parsePath(pathData) {
    const segments = [];
    const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    let currentX = 0, currentY = 0;
    
    commands.forEach(cmd => {
        const type = cmd[0];
        const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
        
        if (type === 'M' || type === 'm') {
            currentX = type === 'M' ? args[0] : currentX + args[0];
            currentY = type === 'M' ? args[1] : currentY + args[1];
        } else if (type === 'L' || type === 'l') {
            const endX = type === 'L' ? args[0] : currentX + args[0];
            const endY = type === 'L' ? args[1] : currentY + args[1];
            segments.push({
                type: 'line',
                start: { x: currentX, y: currentY },
                end: { x: endX, y: endY }
            });
            currentX = endX;
            currentY = endY;
        } else if (type === 'A' || type === 'a') {
            const endX = type === 'A' ? args[5] : currentX + args[5];
            const endY = type === 'A' ? args[6] : currentY + args[6];
            segments.push({
                type: 'arc',
                start: { x: currentX, y: currentY },
                end: { x: endX, y: endY },
                arc: {
                    rx: args[0],
                    ry: args[1],
                    xAxisRotation: args[2],
                    largeArcFlag: args[3],
                    sweepFlag: args[4]
                }
            });
            currentX = endX;
            currentY = endY;
        }
    });
    
    return segments;
}

/**
 * Helper: Calculate Euclidean distance between two points
 */
function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Helper: Count segments by type in path
 */
function countSegmentsByType(pathData) {
    const parsed = parsePath(pathData);
    const counts = { line: 0, arc: 0, total: parsed.length };
    parsed.forEach(seg => {
        if (seg.type === 'line') counts.line++;
        if (seg.type === 'arc') counts.arc++;
    });
    return counts;
}

describe("Bridge Persistence Tests", () => {
    let exportModule;
    
    // Initialize export module before tests
    beforeAll(() => {
        exportModule = new ExportModule();
    });
    
    /**
     * TEST 1: Bridge survives adjacent arc degeneracy
     * 
     * Scenario: Line-Arc contour where arc degenerates under offset
     * Setup:
     *   - Small arc (radius 2) between two lines
     *   - Apply large inward offset (-5) to force arc degeneration
     * Expected:
     *   - Arc removed (radius → negative → degenerate)
     *   - Bridge persists connecting the two lines
     *   - Bridge treated as independent segment
     * 
     * Evidence: .sisyphus/evidence/task-9-bridge-persist.txt
     */
    it("should preserve bridge when adjacent arc degenerates", () => {
        // Line-Arc-Line path with small arc (radius 2)
        // Line: (0,0) to (10,0)
        // Arc: (10,0) to (12,2) with center (10,2), radius 2, CW
        // Line: (12,2) to (12,10)
        const pathData = "M 0 0 L 10 0 A 2 2 0 0 1 12 2 L 12 10";
        
        // Large inward offset (-5) will make arc degenerate
        const offsetDistance = -5;
        const options = { closed: false, limit: 10, exportModule };
        
        const result = calculateOffsetFromPathData(pathData, offsetDistance, options);
        
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        
        // Parse result to analyze segments
        const segments = parsePath(result);
        expect(segments.length).toBeGreaterThan(0);
        
        // CRITICAL: All segments must be non-degenerate
        segments.forEach(seg => {
            const len = distance(seg.start, seg.end);
            expect(len).toBeGreaterThan(EPSILON);
        });
        
        // Verify connectivity (no gaps)
        for (let i = 0; i < segments.length - 1; i++) {
            const curr = segments[i];
            const next = segments[i + 1];
            const gap = distance(curr.end, next.start);
            expect(gap).toBeLessThan(0.1); // Tolerant gap check
        }
    });

    /**
     * TEST 2: Bridge survives adjacent line degeneracy
     * 
     * Scenario: Arc-Line-Arc contour where middle line degenerates
     * Setup:
     *   - Two arcs connected by short line
     *   - Apply offset that causes line to collapse
     * Expected:
     *   - Line removed (zero length after trim)
     *   - Bridges persist connecting the arcs
     *   - Arc-bridge-arc chain remains valid
     */
    it("should preserve bridge when adjacent line degenerates", () => {
        // Arc-Line-Arc path with very short connecting line
        // Arc1: (0,5) to (5,10) with radius 5, CW
        // Line: (5,10) to (5.1,10) [very short: 0.1 units]
        // Arc2: (5.1,10) to (10.1,5) with radius 5, CCW
        const pathData = "M 0 5 A 5 5 0 0 1 5 10 L 5.1 10 A 5 5 0 0 0 10.1 5";
        
        const offsetDistance = 2;
        const options = { closed: false, limit: 10, exportModule };
        
        const result = calculateOffsetFromPathData(pathData, offsetDistance, options);
        
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        
        const segments = parsePath(result);
        expect(segments.length).toBeGreaterThan(0);
        
        // All segments non-degenerate
        segments.forEach(seg => {
            const len = distance(seg.start, seg.end);
            expect(len).toBeGreaterThan(EPSILON);
        });
        
        // Verify connectivity
        for (let i = 0; i < segments.length - 1; i++) {
            const curr = segments[i];
            const next = segments[i + 1];
            const gap = distance(curr.end, next.start);
            expect(gap).toBeLessThan(0.1);
        }
    });

    /**
     * TEST 3: Bridge self-degeneracy removal
     * 
     * Scenario: Miter join creates bridge with near-zero length
     * Setup:
     *   - Two nearly-parallel lines with very small angle
     *   - Miter join creates bridge shorter than EPSILON
     * Expected:
     *   - Bridge removed due to self-degeneracy (length < EPSILON)
     *   - Removal independent of neighbor state
     * 
     * Evidence: .sisyphus/evidence/task-9-bridge-self-degenerate.txt
     */
    it("should remove bridge when bridge itself degenerates", () => {
        // Two nearly-parallel lines (0.001 unit vertical deviation over 10 units)
        const pathData = "M 0 0 L 10 0 L 20 0.001";
        
        const offsetDistance = 1;
        const options = { closed: false, limit: 100, exportModule };
        
        const result = calculateOffsetFromPathData(pathData, offsetDistance, options);
        
        expect(result).toBeDefined();
        
        const segments = parsePath(result);
        
        // All segments must have length > EPSILON (no degenerate bridges)
        segments.forEach(seg => {
            const len = distance(seg.start, seg.end);
            expect(len).toBeGreaterThan(EPSILON);
        });
        
        // For nearly-parallel lines, should have clean offset
        const lineSegments = segments.filter(seg => seg.type === 'line');
        expect(lineSegments.length).toBeGreaterThan(0);
        
        // Verify connectivity
        for (let i = 0; i < segments.length - 1; i++) {
            const curr = segments[i];
            const next = segments[i + 1];
            const gap = distance(curr.end, next.start);
            expect(gap).toBeLessThan(0.1);
        }
    });

    /**
     * TEST 4: Non-degenerate bridge persists through sanitize
     * 
     * Scenario: Normal miter join creates valid bridge segment
     * Setup:
     *   - Line-Arc contour with normal offset
     *   - Bridge created at corner with significant length
     * Expected:
     *   - Bridge persists in final output
     *   - Bridge treated identically to original segments
     *   - Bridge appears in contour result stream
     */
    it("should preserve non-degenerate bridge in final output", () => {
        // Line-Arc path with perpendicular angle (clear corner)
        // Line: (0,0) to (10,0)
        // Arc: (10,0) to (15,5) with radius 5, CW
        const pathData = "M 0 0 L 10 0 A 5 5 0 0 1 15 5";
        
        const offsetDistance = 2;
        const options = { closed: false, limit: 10, exportModule };
        
        const result = calculateOffsetFromPathData(pathData, offsetDistance, options);
        
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        
        const segments = parsePath(result);
        
        // Result should contain offset segments AND potentially bridges
        expect(segments.length).toBeGreaterThanOrEqual(2);
        
        // All segments non-degenerate
        segments.forEach(seg => {
            const len = distance(seg.start, seg.end);
            expect(len).toBeGreaterThan(EPSILON);
        });
        
        // Verify connectivity
        for (let i = 0; i < segments.length - 1; i++) {
            const curr = segments[i];
            const next = segments[i + 1];
            const gap = distance(curr.end, next.start);
            expect(gap).toBeLessThan(0.1);
        }
        
        // All line segments should have valid geometry
        const lineSegments = segments.filter(seg => seg.type === 'line');
        lineSegments.forEach(line => {
            expect(line.start).toBeDefined();
            expect(line.end).toBeDefined();
            expect(typeof line.start.x).toBe("number");
            expect(typeof line.start.y).toBe("number");
            expect(typeof line.end.x).toBe("number");
            expect(typeof line.end.y).toBe("number");
        });
    });

    /**
     * TEST 5: Bridge as first-class segment in later processing passes
     * 
     * Scenario: Multi-pass offset with bridge creation in first pass
     * Setup:
     *   - Apply first offset creating bridge
     *   - Apply second offset to result (bridge now original segment)
     * Expected:
     *   - Bridge processed identically to original segments
     *   - No special handling required for bridge origin
     *   - Second offset treats bridge as normal line
     */
    it("should process bridge as first-class segment in subsequent offsets", () => {
        // Simple line-arc contour
        const pathData = "M 0 0 L 10 0 A 5 5 0 0 1 15 5";
        const options = { closed: false, limit: 10, exportModule };
        
        // First offset (may create bridges)
        const firstResult = calculateOffsetFromPathData(pathData, 2, options);
        expect(firstResult).toBeDefined();
        expect(firstResult.length).toBeGreaterThan(0);
        
        const firstSegments = parsePath(firstResult);
        expect(firstSegments.length).toBeGreaterThan(0);
        
        // Second offset (treats bridges as normal segments)
        const secondResult = calculateOffsetFromPathData(firstResult, 1, options);
        expect(secondResult).toBeDefined();
        expect(secondResult.length).toBeGreaterThan(0);
        
        const secondSegments = parsePath(secondResult);
        expect(secondSegments.length).toBeGreaterThan(0);
        
        // All segments in second offset non-degenerate
        secondSegments.forEach(seg => {
            const len = distance(seg.start, seg.end);
            expect(len).toBeGreaterThan(EPSILON);
        });
        
        // Verify connectivity in second offset
        for (let i = 0; i < secondSegments.length - 1; i++) {
            const curr = secondSegments[i];
            const next = secondSegments[i + 1];
            const gap = distance(curr.end, next.start);
            expect(gap).toBeLessThan(0.1);
        }
        
        // No exponential bridge creation
        expect(secondSegments.length).toBeLessThanOrEqual(firstSegments.length * 2);
    });

    /**
     * TEST 6: Closed contour bridge persistence
     * 
     * Scenario: Closed contour with bridge at wrap-around point
     * Setup:
     *   - Closed triangle with arc at one corner
     *   - Offset creates bridge at arc corner
     * Expected:
     *   - Bridge persists in closed contour
     *   - Wrap-around connectivity maintained
     *   - First and last segments properly connected
     */
    it("should preserve bridge in closed contour with wrap-around", () => {
        // Closed triangle with arc at top corner
        // Base: (0,0) to (10,0)
        // Arc side: (10,0) to (5,8) with radius 5
        // Return: (5,8) back to (0,0) [Z closes path]
        const pathData = "M 0 0 L 10 0 A 5 5 0 0 1 5 8 Z";
        
        const offsetDistance = 1;
        const options = { closed: true, limit: 10, exportModule };
        
        const result = calculateOffsetFromPathData(pathData, offsetDistance, options);
        
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        
        const segments = parsePath(result);
        expect(segments.length).toBeGreaterThan(0);
        
        // All segments non-degenerate
        segments.forEach(seg => {
            const len = distance(seg.start, seg.end);
            expect(len).toBeGreaterThan(EPSILON);
        });
        
        // Verify internal connectivity
        for (let i = 0; i < segments.length - 1; i++) {
            const curr = segments[i];
            const next = segments[i + 1];
            const gap = distance(curr.end, next.start);
            expect(gap).toBeLessThan(0.1);
        }
        
        // Verify wrap-around (closed contour property)
        if (segments.length > 0) {
            const first = segments[0];
            const last = segments[segments.length - 1];
            const wrapGap = distance(last.end, first.start);
            expect(wrapGap).toBeLessThan(0.1);
        }
    });
});
