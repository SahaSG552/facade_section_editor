import { describe, it, expect } from 'vitest';
import EditorStateManager from '../src/editor/EditorStateManager.js';
import { isSegmentDegenerated } from '../src/operations/OffsetRules.js';

describe('Shape preservation during modifier edit', () => {
    let state;

    it('shapes (circle, rect, ellipse) should never be considered degenerate', () => {
        // Shapes are never degenerate by definition — only lines/arcs can be
        const shapes = [
            { type: 'circle', data: { center: { x: 5, y: 5 }, radius: 2 } },
            { type: 'rect', data: { x: 0, y: 0, w: 10, h: 10 } },
            { type: 'ellipse', data: { cx: 5, cy: 5, rx: 3, ry: 2 } },
        ];

        shapes.forEach(shape => {
            expect(isSegmentDegenerated(shape)).toBe(false);
        });
    });

    it('shapes with transforms should survive sanitization', () => {
        state = new EditorStateManager();
        
        // Create a rect with RT modifier
        const rectId = 'seg-rect-1';
        state.segments.push({
            id: rectId,
            type: 'rect',
            contourId: 10,
            data: { x: 0, y: 0, w: 10, h: 10 },
            transforms: [{
                type: 'RT',
                raw: 'MOD RT 45',
                params: ['45'],
            }],
        });

        // Create a line in a polyline (should be preserved)
        state.segments.push({
            id: 'seg-line-1',
            type: 'line',
            contourId: 11,
            data: { start: { x: 0, y: 0 }, end: { x: 10, y: 10 } },
        });

        const originalCount = state.segments.length;

        // Sanitize should NOT remove the rect
        state.segments = state.segments.filter((seg) => {
            if (!seg) return false;
            if (isSegmentDegenerated(seg)) return false;
            return true;
        });

        expect(state.segments.length).toBe(originalCount);
        expect(state.segments.find(s => s.id === rectId)).toBeDefined();
        expect(state.segments.find(s => s.id === 'seg-line-1')).toBeDefined();
    });

    it('degenerate lines/arcs should be removed, but shapes preserved', () => {
        state = new EditorStateManager();

        // Add a non-degenerate line
        state.segments.push({
            id: 'seg-good-line',
            type: 'line',
            contourId: 1,
            data: { start: { x: 0, y: 0 }, end: { x: 10, y: 10 } },
        });

        // Add a shape
        state.segments.push({
            id: 'seg-circle',
            type: 'circle',
            contourId: 2,
            data: { center: { x: 5, y: 5 }, radius: 3 },
            transforms: [{ type: 'SC', raw: 'MOD SC 1.5', params: ['1.5'] }],
        });

        // Add a degenerate line (zero length)
        state.segments.push({
            id: 'seg-degen-line',
            type: 'line',
            contourId: 3,
            data: { start: { x: 5, y: 5 }, end: { x: 5, y: 5 } },
        });

        state.segments = state.segments.filter(seg => !isSegmentDegenerated(seg));

        // Should have 2 segments: good line and circle (degenerate line removed)
        expect(state.segments.length).toBe(2);
        expect(state.segments.find(s => s.id === 'seg-good-line')).toBeDefined();
        expect(state.segments.find(s => s.id === 'seg-circle')).toBeDefined();
        expect(state.segments.find(s => s.id === 'seg-degen-line')).toBeUndefined();
    });
});
