import { describe, it, expect } from "vitest";

const EPSILON = 1e-6;

/**
 * findMaxArcIntersection Tests
 * 
 * Tests the logic for finding the "maximum intersection point" - the tangent point
 * where arcs would last touch if we expanded them to their maximum possible angle.
 */

function computeAngleDelta(startAngle, endAngle, sweepFlag) {
    let delta = endAngle - startAngle;
    if (sweepFlag === 1 && delta < 0) delta += Math.PI * 2;
    if (sweepFlag === 0 && delta > 0) delta -= Math.PI * 2;
    return delta;
}

function isValidEndTrimOrExpand(arc, I) {
    const θI = Math.atan2(I.y - arc.centerY, I.x - arc.centerX);
    const sweepToI = computeAngleDelta(arc.startAngle, θI, arc.sweepFlag ?? 1);
    return Math.abs(sweepToI) <= 2 * Math.PI + EPSILON;
}

function isValidStartTrimOrExpand(arc, I) {
    const θI = Math.atan2(I.y - arc.centerY, I.x - arc.centerX);
    const sweepFromI = computeAngleDelta(θI, arc.endAngle, arc.sweepFlag ?? 1);
    return Math.abs(sweepFromI) <= 2 * Math.PI + EPSILON;
}

/**
 * Find the "maximum intersection point" for two arcs (mirrors implementation)
 */
function findMaxArcIntersection(arc1, arc2, p1, p2, offset) {
    const c1 = { x: arc1.centerX, y: arc1.centerY };
    const c2 = { x: arc2.centerX, y: arc2.centerY };
    const r1 = arc1.radius || arc1.rx || 0;
    const r2 = arc2.radius || arc2.rx || 0;
    
    if (r1 <= EPSILON || r2 <= EPSILON) return null;
    
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const d = Math.hypot(dx, dy);
    
    if (d < EPSILON) return null;
    
    const ux = dx / d;
    const uy = dy / d;
    
    const delta = (d - r1 - r2) / 2;
    
    if (delta <= -Math.min(r1, r2)) {
        return null;
    }
    
    const r1e = r1 + delta;
    const r2e = r2 + delta;
    
    const tangentPoint = {
        x: c1.x + r1e * ux,
        y: c1.y + r1e * uy
    };
    
    if (!isValidEndTrimOrExpand(arc1, tangentPoint)) {
        return null;
    }
    
    if (!isValidStartTrimOrExpand(arc2, tangentPoint)) {
        return null;
    }
    
    return tangentPoint;
}

describe("findMaxArcIntersection helper", () => {
    it("returns tangent point when circles don't touch", () => {
        // Two circles that are 6 units apart, radii 3 and 3
        // d=6, r1+r2=6, so they're already tangent (d = r1 + r2)
        const arc1 = { centerX: 0, centerY: 0, radius: 3, startAngle: 0, endAngle: Math.PI/2, sweepFlag: 1 };
        const arc2 = { centerX: 6, centerY: 0, radius: 3, startAngle: Math.PI, endAngle: Math.PI/2, sweepFlag: 1 };
        const p1 = { x: 3, y: 0 };
        const p2 = { x: 3, y: 0 };
        
        const tangent = findMaxArcIntersection(arc1, arc2, p1, p2, 1);
        
        // Tangent point should be at (3, 0) - where the circles touch
        expect(tangent).not.toBeNull();
        expect(tangent.x).toBeCloseTo(3, 5);
        expect(tangent.y).toBeCloseTo(0, 5);
    });

    it("returns expanded tangent point when circles don't touch", () => {
        // Two circles that are 8 units apart, radii 3 and 3
        // d=8, r1+r2=6, so they don't touch
        // delta = (8 - 6) / 2 = 1
        // Expanded radii: r1e=4, r2e=4
        // Tangent point: (0,0) + 4*(1,0) = (4, 0)
        const arc1 = { centerX: 0, centerY: 0, radius: 3, startAngle: 0, endAngle: Math.PI/2, sweepFlag: 1 };
        const arc2 = { centerX: 8, centerY: 0, radius: 3, startAngle: Math.PI, endAngle: Math.PI/2, sweepFlag: 1 };
        const p1 = { x: 3, y: 0 };
        const p2 = { x: 5, y: 0 };
        
        const tangent = findMaxArcIntersection(arc1, arc2, p1, p2, 1);
        
        // Tangent point should be at (4, 0)
        expect(tangent).not.toBeNull();
        expect(tangent.x).toBeCloseTo(4, 5);
        expect(tangent.y).toBeCloseTo(0, 5);
    });

    it("returns null for zero or negative radii", () => {
        const arc1 = { centerX: 0, centerY: 0, radius: 0, startAngle: 0, endAngle: Math.PI/2, sweepFlag: 1 };
        const arc2 = { centerX: 5, centerY: 0, radius: 3, startAngle: Math.PI, endAngle: Math.PI/2, sweepFlag: 1 };
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 2, y: 0 };
        
        const tangent = findMaxArcIntersection(arc1, arc2, p1, p2, 1);
        expect(tangent).toBeNull();
    });

    it("returns null for same center", () => {
        const arc1 = { centerX: 0, centerY: 0, radius: 3, startAngle: 0, endAngle: Math.PI/2, sweepFlag: 1 };
        const arc2 = { centerX: 0, centerY: 0, radius: 3, startAngle: Math.PI, endAngle: Math.PI/2, sweepFlag: 1 };
        const p1 = { x: 3, y: 0 };
        const p2 = { x: -3, y: 0 };
        
        const tangent = findMaxArcIntersection(arc1, arc2, p1, p2, 1);
        expect(tangent).toBeNull();
    });

    it("handles circles that already intersect", () => {
        // Two circles that overlap: centers 2 units apart, radii 5 and 5
        // d=2, r1+r2=10, so they intersect at multiple points
        const arc1 = { centerX: 0, centerY: 0, radius: 5, startAngle: 0, endAngle: Math.PI/2, sweepFlag: 1 };
        const arc2 = { centerX: 2, centerY: 0, radius: 5, startAngle: Math.PI, endAngle: Math.PI/2, sweepFlag: 1 };
        const p1 = { x: 5, y: 0 };
        const p2 = { x: 3, y: 0 };
        
        // For intersecting circles, delta = (2 - 10) / 2 = -4
        // r1e = 5 - 4 = 1, r2e = 5 - 4 = 1
        // Tangent point = (0,0) + 1*(2/2, 0) = (1, 0)
        const tangent = findMaxArcIntersection(arc1, arc2, p1, p2, 1);
        
        expect(tangent).not.toBeNull();
        expect(tangent.x).toBeCloseTo(1, 5);
    });
});

describe("findMaxArcIntersection geometry", () => {
    it("tangent point lies on line between centers", () => {
        // Test that tangent point is collinear with centers
        const arc1 = { centerX: 0, centerY: 0, radius: 4, startAngle: 0, endAngle: Math.PI/2, sweepFlag: 1 };
        const arc2 = { centerX: 10, centerY: 5, radius: 4, startAngle: Math.PI, endAngle: Math.PI/2, sweepFlag: 1 };
        const p1 = { x: 4, y: 0 };
        const p2 = { x: 6, y: 3 };
        
        const tangent = findMaxArcIntersection(arc1, arc2, p1, p2, 1);
        
        expect(tangent).not.toBeNull();
        
        // Check collinearity: (tangent - c1) should be parallel to (c2 - c1)
        const dx = arc2.centerX - arc1.centerX;
        const dy = arc2.centerY - arc1.centerY;
        const tx = tangent.x - arc1.centerX;
        const ty = tangent.y - arc1.centerY;
        
        // Cross product should be ~0 for parallel vectors
        const cross = dx * ty - dy * tx;
        expect(Math.abs(cross)).toBeLessThan(EPSILON);
    });

    it("delta is positive when circles don't touch", () => {
        // When d > r1 + r2, delta should be positive
        const arc1 = { centerX: 0, centerY: 0, radius: 3, startAngle: 0, endAngle: Math.PI/2, sweepFlag: 1 };
        const arc2 = { centerX: 10, centerY: 0, radius: 3, startAngle: Math.PI, endAngle: Math.PI/2, sweepFlag: 1 };
        const p1 = { x: 3, y: 0 };
        const p2 = { x: 7, y: 0 };
        
        const tangent = findMaxArcIntersection(arc1, arc2, p1, p2, 1);
        
        expect(tangent).not.toBeNull();
        
        // d=10, r1+r2=6, delta=(10-6)/2=2
        // r1e=5, r2e=5
        // Tangent point = (0,0) + 5*(1,0) = (5, 0)
        expect(tangent.x).toBeCloseTo(5, 5);
    });

    it("delta is zero when circles are tangent", () => {
        // When d = r1 + r2, delta should be zero
        const arc1 = { centerX: 0, centerY: 0, radius: 5, startAngle: 0, endAngle: Math.PI/2, sweepFlag: 1 };
        const arc2 = { centerX: 10, centerY: 0, radius: 5, startAngle: Math.PI, endAngle: Math.PI/2, sweepFlag: 1 };
        const p1 = { x: 5, y: 0 };
        const p2 = { x: 5, y: 0 };
        
        const tangent = findMaxArcIntersection(arc1, arc2, p1, p2, 1);
        
        expect(tangent).not.toBeNull();
        // d=10, r1+r2=10, delta=0
        // Tangent point = (0,0) + 5*(1,0) = (5, 0)
        expect(tangent.x).toBeCloseTo(5, 5);
    });
});
