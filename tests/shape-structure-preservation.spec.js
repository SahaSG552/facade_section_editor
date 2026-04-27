import { describe, it, expect } from 'vitest';
import EditorStateManager from '../src/editor/EditorStateManager.js';

describe('Shape structure preservation during edit', () => {
    it('shape should not change parentContourId during attribute edit', () => {
        const state = new EditorStateManager();
        
        // Create a polyline
        state.segments.push(
            { id: 'seg-line-1', type: 'line', contourId: 0, data: { start: {x:0, y:0}, end: {x:10, y:10}} },
            { id: 'seg-line-2', type: 'line', contourId: 0, data: { start: {x:10, y:10}, end: {x:20, y:0}} }
        );
        
        // Create a standalone rect
        const rectId = 'seg-rect-1';
        state.segments.push({
            id: rectId,
            type: 'rect',
            contourId: 1,  // own contour (standalone)
            data: { x: 0, y: 0, w: 10, h: 10 },
            transforms: [{type: 'RT', raw: 'MOD RT 45', params: ['45']}],
        });
        
        // Check that shape is standalone (no parentContourId)
        const rectBefore = state.segments.find(s => s.id === rectId);
        expect(rectBefore?.parentContourId).toBeUndefined();
        expect(rectBefore?.contourId).toBe(1);
        
        // Edit shape width
        state.updateSegments([{
            id: rectId,
            changes: {
                data: { ...rectBefore?.data, w: 20 }  // change width
            }
        }]);
        
        // Check that shape is STILL standalone
        const rectAfter = state.segments.find(s => s.id === rectId);
        expect(rectAfter?.parentContourId).toBeUndefined();
        expect(rectAfter?.contourId).toBe(1);  // contourId should NOT change
        expect(rectAfter?.data?.w).toBe(20);   // width should change
    });

    it('exported elements should maintain shape standalone status', () => {
        const state = new EditorStateManager();
        
        // Create polyline
        state.segments.push(
            { id: 'seg-line-1', type: 'line', contourId: 0, data: { start: {x:0, y:0}, end: {x:10, y:10}} }
        );
        
        // Create standalone circle
        state.segments.push({
            id: 'seg-circle-1',
            type: 'circle',
            contourId: 1,  // own contour
            data: { center: {x:5, y:5}, radius: 2 },
        });
        
        // Get elements
        const elements = state.getElements();
        
        // Find the circle element
        const circleElem = elements.find(e => e.segId === 'seg-circle-1');
        expect(circleElem).toBeDefined();
        expect(circleElem?.type).toBe('circle');
        expect(circleElem?.parentContourId).toBeUndefined();  // should be standalone
        
        // Find the polyline element
        const polylineElem = elements.find(e => e.contourId === 0);
        expect(polylineElem).toBeDefined();
        expect(polylineElem?.type).toBe('polyline');
        expect(polylineElem?.segIds).not.toContain('seg-circle-1');  // circle not embedded
    });

    it('shape created while path is active should remain standalone', () => {
        const state = new EditorStateManager();

        // Create a path (line) with contourId=1
        state.segments.push({
            id: 'seg-line-1', type: 'line', contourId: 1,
            data: { start: {x:0, y:0}, end: {x:10, y:0} }
        });
        state._nextContourId = 2;

        // Simulate: user selects path row → activeContourId is set
        state.activeContourId = 1;

        // User creates a circle (e.g. via Add Shape button or tool)
        // _createDefaultShape sets activeContourId=null first, but a raw addSegment without
        // that guard would embed it. Simulate the "accidental embedding" scenario:
        const circle = state.addSegment({
            type: 'circle',
            data: { center: {x: 5, y: 5}, radius: 3 },
        });
        // contourId will be 1 (path's contourId) — this is the "accidental" case
        // But since there's no parentContourId set, getElements() should treat it as standalone.

        const elements = state.getElements();
        const circleElem = elements.find(e => e.segId === circle.id);
        expect(circleElem).toBeDefined();
        expect(circleElem?.type).toBe('circle');
        // CRITICAL: should NOT have parentContourId set (standalone)
        expect(circleElem?.parentContourId).toBeUndefined();

        // Polyline should NOT include the circle in its segIds
        const polylineElem = elements.find(e => e.contourId === 1);
        expect(polylineElem?.type).toBe('polyline');
        expect(polylineElem?.segIds).not.toContain(circle.id);
    });
});
