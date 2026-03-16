import { describe, expect, it } from "vitest";

const EPSILON = 1e-6;

function computeAngleDelta(startAngle, endAngle, sweepFlag) {
    let delta = endAngle - startAngle;
    if (sweepFlag === 1 && delta < 0) delta += Math.PI * 2;
    if (sweepFlag === 0 && delta > 0) delta -= Math.PI * 2;
    return delta;
}

function isValidEndTrim(arc, point) {
    const angleAtPoint = Math.atan2(point.y - arc.centerY, point.x - arc.centerX);
    const originalSweep = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const sweepToPoint = computeAngleDelta(arc.startAngle, angleAtPoint, arc.sweepFlag ?? 1);
    return sweepToPoint * originalSweep > 0 && Math.abs(sweepToPoint) <= Math.abs(originalSweep) + EPSILON;
}

function isValidStartTrim(arc, point) {
    const angleAtPoint = Math.atan2(point.y - arc.centerY, point.x - arc.centerX);
    const originalSweep = computeAngleDelta(arc.startAngle, arc.endAngle, arc.sweepFlag ?? 1);
    const sweepFromPoint = computeAngleDelta(angleAtPoint, arc.endAngle, arc.sweepFlag ?? 1);
    return sweepFromPoint * originalSweep > 0 && Math.abs(sweepFromPoint) <= Math.abs(originalSweep) + EPSILON;
}

function pointOnCircle(cx, cy, r, angle) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function sweepMagnitude(startAngle, endAngle, sweepFlag) {
    return Math.abs(computeAngleDelta(startAngle, endAngle, sweepFlag));
}

describe("arc trim validation enforces non-expanding sweeps", () => {
    it("accepts valid end trim that contracts sweep", () => {
        const arc = {
            centerX: 0,
            centerY: 0,
            radius: 10,
            startAngle: 0,
            endAngle: Math.PI / 2,
            sweepFlag: 1,
        };

        const contractionPoint = pointOnCircle(arc.centerX, arc.centerY, arc.radius, Math.PI / 4);
        const sweepBefore = sweepMagnitude(arc.startAngle, arc.endAngle, arc.sweepFlag);
        const sweepAfter = sweepMagnitude(arc.startAngle, Math.atan2(contractionPoint.y, contractionPoint.x), arc.sweepFlag);

        expect(isValidEndTrim(arc, contractionPoint)).toBe(true);
        expect(sweepAfter).toBeLessThanOrEqual(sweepBefore + EPSILON);
    });

    it("rejects expansion candidates for end trim", () => {
        const arc = {
            centerX: 0,
            centerY: 0,
            radius: 10,
            startAngle: 0,
            endAngle: Math.PI / 2,
            sweepFlag: 1,
        };

        // 225° is outside the original 0°→90° sweep and would require expansion.
        const expansionPoint = pointOnCircle(arc.centerX, arc.centerY, arc.radius, (5 * Math.PI) / 4);
        const sweepBefore = sweepMagnitude(arc.startAngle, arc.endAngle, arc.sweepFlag);
        const sweepAfter = sweepMagnitude(arc.startAngle, Math.atan2(expansionPoint.y, expansionPoint.x), arc.sweepFlag);

        expect(isValidEndTrim(arc, expansionPoint)).toBe(false);
        expect(sweepAfter).toBeGreaterThan(sweepBefore + EPSILON);
    });

    it("keeps sweep unchanged when trim is exactly at endpoint", () => {
        const arc = {
            centerX: 0,
            centerY: 0,
            radius: 10,
            startAngle: Math.PI / 6,
            endAngle: (2 * Math.PI) / 3,
            sweepFlag: 1,
        };

        const endpoint = pointOnCircle(arc.centerX, arc.centerY, arc.radius, arc.endAngle);
        const sweepBefore = sweepMagnitude(arc.startAngle, arc.endAngle, arc.sweepFlag);
        const sweepAfter = sweepMagnitude(arc.startAngle, Math.atan2(endpoint.y, endpoint.x), arc.sweepFlag);

        expect(isValidEndTrim(arc, endpoint)).toBe(true);
        expect(Math.abs(sweepAfter - sweepBefore)).toBeLessThanOrEqual(EPSILON);
    });

    it("filters expansion candidate before ranking, selecting valid contraction", () => {
        const currArc = {
            centerX: 0,
            centerY: 0,
            radius: 10,
            startAngle: 0,
            endAngle: Math.PI / 2,
            sweepFlag: 1,
        };
        const nextArc = {
            centerX: 20,
            centerY: 0,
            radius: 10,
            startAngle: Math.PI,
            endAngle: Math.PI / 2,
            sweepFlag: 0,
        };

        // Candidate A is closer but would expand currArc, so it must be discarded.
        const candidateExpand = pointOnCircle(currArc.centerX, currArc.centerY, currArc.radius, (5 * Math.PI) / 4);
        // Candidate B contracts both arcs and should win after filtering.
        const candidateContract = pointOnCircle(currArc.centerX, currArc.centerY, currArc.radius, Math.PI / 4);

        const p1 = pointOnCircle(currArc.centerX, currArc.centerY, currArc.radius, currArc.endAngle);
        const p2 = pointOnCircle(nextArc.centerX, nextArc.centerY, nextArc.radius, nextArc.startAngle);

        const candidates = [candidateExpand, candidateContract];
        let best = null;
        let bestScore = Infinity;

        for (const candidate of candidates) {
            if (!isValidEndTrim(currArc, candidate)) continue;
            if (!isValidStartTrim(nextArc, candidate)) continue;

            const d1 = Math.hypot(p1.x - candidate.x, p1.y - candidate.y);
            const d2 = Math.hypot(p2.x - candidate.x, p2.y - candidate.y);
            const score = d1 + d2;
            if (score < bestScore) {
                best = candidate;
                bestScore = score;
            }
        }

        expect(isValidEndTrim(currArc, candidateExpand)).toBe(false);
        expect(isValidEndTrim(currArc, candidateContract)).toBe(true);
        expect(best).toEqual(candidateContract);

        const sweepBefore = sweepMagnitude(currArc.startAngle, currArc.endAngle, currArc.sweepFlag);
        const sweepAfter = sweepMagnitude(
            currArc.startAngle,
            Math.atan2(candidateContract.y - currArc.centerY, candidateContract.x - currArc.centerX),
            currArc.sweepFlag,
        );
        expect(sweepAfter).toBeLessThanOrEqual(sweepBefore + EPSILON);
    });
});
