import { describe, expect, it, vi } from 'vitest';
import {
 finalizeOffsetTopology,
 resolveOffsetSegmentJoints,
} from '../../src/operations/offset/OffsetContourStages.js';

function makeLine(x1, y1, x2, y2, extra = {}) {
 return {
 type: 'line',
 start: { x: x1, y: y1 },
 end: { x: x2, y: y2 },
 ...extra,
 };
}

describe('OffsetContourStages split', () => {
 it('resolveOffsetSegmentJoints inserts bridge segments from join resolver', () => {
 const segments = [
 makeLine(0, 0, 10, 0),
 makeLine(12, 0, 20, 0),
 ];

 const deps = {
 cloneSegment: (segment) => ({
 ...segment,
 start: { ...segment.start },
 end: { ...segment.end },
 }),
 applyMiterJoin: vi.fn((current, next) => [
 makeLine(current.end.x, current.end.y, next.start.x, next.start.y, {
 isBridge: true,
 }),
 ]),
 };

 const joined = resolveOffsetSegmentJoints(segments, { limit: 10 }, 1, false, deps);

 expect(joined).toHaveLength(3);
 expect(joined[1].isBridge).toBe(true);
 expect(deps.applyMiterJoin).toHaveBeenCalledTimes(1);
 expect(deps.applyMiterJoin.mock.calls[0][4]).toMatchObject({
 phase: 'initial-join',
 allowSquareCapBridge: true,
 });
 });

 it('finalizeOffsetTopology removes degenerate segments and reseals gaps', () => {
 const joinedSegments = [
 makeLine(0, 0, 10, 0),
 makeLine(10, 0, 10, 0, { degenerate: true }),
 makeLine(12, 0, 20, 0),
 ];

 const deps = {
 distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
 EPSILON: 1e-6,
 isNear: (a, b, tolerance = 1e-6) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance,
 joinTolerance: 0.001,
 applyMiterJoin: vi.fn((current, next) => [
 makeLine(current.end.x, current.end.y, next.start.x, next.start.y, {
 isBridge: true,
 }),
 ]),
 cloneSegment: (segment) => ({
 ...segment,
 start: { ...segment.start },
 end: { ...segment.end },
 }),
 clonePoint: (point) => ({ ...point }),
 lineIntersection: () => null,
 dot: (a, b) => a.x * b.x + a.y * b.y,
 log: {
 warn: vi.fn(),
 },
 };

 const finalized = finalizeOffsetTopology(joinedSegments, {}, 1, false, 10, deps);

 expect(finalized.some((segment) => segment.degenerate)).toBe(false);
 expect(finalized.some((segment) => segment.isBridge)).toBe(true);
 expect(deps.applyMiterJoin).toHaveBeenCalledTimes(1);
 expect(deps.applyMiterJoin.mock.calls[0][4]).toMatchObject({
 phase: 'gap-seal',
 allowSquareCapBridge: false,
 });
 });

 it('finalizeOffsetTopology emits ordered debug snapshots to collector', () => {
 const joinedSegments = [
 makeLine(0, 0, 10, 0),
 makeLine(10, 0, 12, 0),
 ];
 const traces = [];

 const deps = {
 distance: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
 EPSILON: 1e-6,
 isNear: (a, b, tolerance = 1e-6) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance,
 joinTolerance: 0.001,
 applyMiterJoin: vi.fn(() => null),
 cloneSegment: (segment) => ({
 ...segment,
 start: { ...segment.start },
 end: { ...segment.end },
 }),
 clonePoint: (point) => ({ ...point }),
 lineIntersection: () => null,
 dot: (a, b) => a.x * b.x + a.y * b.y,
 log: {
 warn: vi.fn(),
 },
 };

 const finalized = finalizeOffsetTopology(joinedSegments, {
 debugTraceCollector: (snapshot) => traces.push(snapshot),
 }, 1, false, 10, deps);

 expect(finalized).toHaveLength(2);
 expect(traces.map((trace) => trace.label)).toEqual([
 '--- After first pass ---',
 '--- After sanitize ---',
 '--- After gapSealPass ---',
 ]);
 expect(traces[0].meta.phase).toBe('initial-join');
 expect(traces[1].meta.phase).toBe('sanitize');
 expect(traces[2].meta.phase).toBe('gap-seal');
 });
});
