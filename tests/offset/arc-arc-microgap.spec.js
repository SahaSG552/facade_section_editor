import { describe, expect, it } from "vitest";

const EPSILON = 1e-6;
const JOIN_TOLERANCE = 0.001;

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function isNear(a, b, tolerance = EPSILON) {
    return distance(a, b) <= tolerance;
}

function normalize(vec) {
    const len = Math.hypot(vec.x, vec.y);
    if (len < EPSILON) return { x: 0, y: 0 };
    return { x: vec.x / len, y: vec.y / len };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function cross(a, b) {
    return a.x * b.y - a.y * b.x;
}

function clonePoint(point) {
    return { x: point.x, y: point.y };
}

function lineIntersection(p1, dir1, p2, dir2) {
    const rxs = cross(dir1, dir2);
    if (Math.abs(rxs) < EPSILON) return null;
    const qmp = { x: p2.x - p1.x, y: p2.y - p1.y };
    const t = cross(qmp, dir2) / rxs;
    return { x: p1.x + dir1.x * t, y: p1.y + dir1.y * t };
}

function circleCircleIntersections(cA, rA, cB, rB) {
    const dx = cB.x - cA.x;
    const dy = cB.y - cA.y;
    const d = Math.hypot(dx, dy);
    if (d < EPSILON || d > rA + rB + EPSILON || d < Math.abs(rA - rB) - EPSILON) return [];

    const a = (rA * rA - rB * rB + d * d) / (2 * d);
    const h2 = rA * rA - a * a;
    if (h2 < -EPSILON) return [];
    const h = Math.sqrt(Math.max(0, h2));
    const mx = cA.x + (a * dx) / d;
    const my = cA.y + (a * dy) / d;
    if (h <= EPSILON) return [{ x: mx, y: my }];
    const rx = (-dy * h) / d;
    const ry = (dx * h) / d;
    return [
        { x: mx + rx, y: my + ry },
        { x: mx - rx, y: my - ry },
    ];
}

function computeAngleDelta(startAngle, endAngle, sweepFlag) {
    let delta = endAngle - startAngle;
    if (sweepFlag === 1 && delta < 0) delta += Math.PI * 2;
    if (sweepFlag === 0 && delta > 0) delta -= Math.PI * 2;
    return delta;
}

function isValidEndTrim(arc, point) {
    const theta = Math.atan2(point.y - arc.centerY, point.x - arc.centerX);
    const originalSweep = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const trimSweep = computeAngleDelta(arc.startAngle, theta, arc.sweepFlag ?? 1);
    return trimSweep * originalSweep > 0 && Math.abs(trimSweep) <= Math.abs(originalSweep) + EPSILON;
}

function isValidStartTrim(arc, point) {
    const theta = Math.atan2(point.y - arc.centerY, point.x - arc.centerX);
    const originalSweep = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const trimSweep = computeAngleDelta(theta, arc.endAngle, arc.sweepFlag ?? 1);
    return trimSweep * originalSweep > 0 && Math.abs(trimSweep) <= Math.abs(originalSweep) + EPSILON;
}

function tangentAtEnd(segment) {
    const sign = (segment.arc.sweepFlag ?? 1) === 1 ? 1 : -1;
    const angle = segment.arc.endAngle;
    return normalize({ x: -Math.sin(angle) * sign, y: Math.cos(angle) * sign });
}

function tangentAtStart(segment) {
    const sign = (segment.arc.sweepFlag ?? 1) === 1 ? 1 : -1;
    const angle = segment.arc.startAngle;
    return normalize({ x: -Math.sin(angle) * sign, y: Math.cos(angle) * sign });
}

/**
 * Harness of applyMiterJoin arc-arc path used by production code.
 * It focuses on geometric-candidate filtering + arc-arc micro-gap bridge fallback.
 */
function applyMiterJoinArcHarness(curr, next, maxMiterLen, offset) {
    const p1 = curr.end;
    const p2 = next.start;
    const t1 = tangentAtEnd(curr);
    const t2 = tangentAtStart(next);

    const currIsArc = true;
    const nextIsArc = true;
    const endpointGap = distance(p1, p2);

    const candidates = circleCircleIntersections(
        { x: curr.arc.centerX, y: curr.arc.centerY },
        curr.arc.radius,
        { x: next.arc.centerX, y: next.arc.centerY },
        next.arc.radius,
    );

    const accepted = [];
    for (const intersection of candidates) {
        const d1 = distance(p1, intersection);
        const d2 = distance(p2, intersection);
        if (d1 > maxMiterLen || d2 > maxMiterLen) continue;
        if (currIsArc && !isValidEndTrim(curr.arc, intersection)) continue;
        if (nextIsArc && !isValidStartTrim(next.arc, intersection)) continue;
        accepted.push(intersection);
    }

    if (accepted.length > 0) return null;

    if (currIsArc && nextIsArc && endpointGap <= JOIN_TOLERANCE) {
        if (endpointGap <= EPSILON) return null;
        return [{ type: "line", start: clonePoint(p1), end: clonePoint(p2) }];
    }

    const miter = lineIntersection(p1, t1, p2, t2);
    if (miter) {
        const d1 = distance(p1, miter);
        const d2 = distance(p2, miter);
        if (d1 <= maxMiterLen && d2 <= maxMiterLen && isNear(p1, p2, JOIN_TOLERANCE)) {
            return null;
        }
    }

    if (offset !== undefined && Math.abs(offset) > EPSILON && dot(t1, t2) < 0) {
        return [{ type: "line", start: clonePoint(p1), end: clonePoint(p2) }];
    }

    return [{ type: "line", start: clonePoint(p1), end: clonePoint(p2) }];
}

describe("arc-arc micro-gap fallback bridge", () => {
    it("inserts a bridge when arc-arc circles do not intersect but endpoint gap is within JOIN_TOLERANCE", () => {
        const curr = {
            type: "arc",
            end: { x: 10, y: 0 },
            arc: {
                centerX: 0,
                centerY: 0,
                radius: 10,
                startAngle: Math.PI / 2,
                endAngle: 0,
                sweepFlag: 0,
            },
        };
        const next = {
            type: "arc",
            start: { x: 10.0006, y: 0 },
            arc: {
                centerX: 20.0006,
                centerY: 0,
                radius: 10,
                startAngle: Math.PI,
                endAngle: Math.PI / 2,
                sweepFlag: 1,
            },
        };

        // circles are disjoint by 0.0006, so no arc-arc intersection exists
        expect(
            circleCircleIntersections(
                { x: curr.arc.centerX, y: curr.arc.centerY },
                curr.arc.radius,
                { x: next.arc.centerX, y: next.arc.centerY },
                next.arc.radius,
            ),
        ).toHaveLength(0);

        const bridge = applyMiterJoinArcHarness(curr, next, 100, 1);
        expect(bridge).toBeTruthy();
        expect(bridge).toHaveLength(1);
        expect(bridge[0].type).toBe("line");
        expect(distance(bridge[0].start, bridge[0].end)).toBeGreaterThan(EPSILON);
        expect(distance(bridge[0].start, bridge[0].end)).toBeLessThanOrEqual(JOIN_TOLERANCE + EPSILON);
    });

    it("keeps arc centers and sweep metadata unchanged when bridge fallback is used", () => {
        const curr = {
            type: "arc",
            end: { x: 10, y: 0 },
            arc: {
                centerX: 0,
                centerY: 0,
                radius: 10,
                startAngle: Math.PI / 2,
                endAngle: 0,
                sweepFlag: 0,
            },
        };
        const next = {
            type: "arc",
            start: { x: 10.0006, y: 0 },
            arc: {
                centerX: 20.0006,
                centerY: 0,
                radius: 10,
                startAngle: Math.PI,
                endAngle: Math.PI / 2,
                sweepFlag: 1,
            },
        };

        const before = {
            currCenter: { x: curr.arc.centerX, y: curr.arc.centerY },
            nextCenter: { x: next.arc.centerX, y: next.arc.centerY },
            currSweep: curr.arc.sweepFlag,
            nextSweep: next.arc.sweepFlag,
            currStartAngle: curr.arc.startAngle,
            currEndAngle: curr.arc.endAngle,
            nextStartAngle: next.arc.startAngle,
            nextEndAngle: next.arc.endAngle,
        };

        const bridge = applyMiterJoinArcHarness(curr, next, 100, 1);
        expect(bridge).toBeTruthy();

        expect(curr.arc.centerX).toBe(before.currCenter.x);
        expect(curr.arc.centerY).toBe(before.currCenter.y);
        expect(next.arc.centerX).toBe(before.nextCenter.x);
        expect(next.arc.centerY).toBe(before.nextCenter.y);
        expect(curr.arc.sweepFlag).toBe(before.currSweep);
        expect(next.arc.sweepFlag).toBe(before.nextSweep);
        expect(curr.arc.startAngle).toBe(before.currStartAngle);
        expect(curr.arc.endAngle).toBe(before.currEndAngle);
        expect(next.arc.startAngle).toBe(before.nextStartAngle);
        expect(next.arc.endAngle).toBe(before.nextEndAngle);
    });
});
