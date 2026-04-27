/**
 * ParentContourId Null Safety Test
 * 
 * Verifies that standalone shapes with parentContourId:null
 * are NOT incorrectly embedded as parentContourId:0 due to
 * Number(null) === 0 bug.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import EditorStateManager from '../src/editor/EditorStateManager.js';

describe('ParentContourId Null Safety', () => {
    let state;
    
    beforeEach(() => {
        state = new EditorStateManager();
    });
    
    it('should keep standalone shape standalone (parentContourId:null)', () => {
        // Create a polyline contour with contourId:0
        state.segments.push({
            id: 'seg-1',
            type: 'line',
            contourId: 0,
            data: { start: {x: 0, y: 0}, end: {x: 10, y: 10} },
            transforms: [],
        });
        
        // Create a standalone circle with parentContourId:null
        const circleId = 'seg-2';
        state.segments.push({
            id: circleId,
            type: 'circle',
            contourId: 1,  // own contour
            parentContourId: null,  // explicitly standalone
            data: { center: {x: 50, y: 50}, radius: 5 },
            transforms: [],
        });
        
        // Get elements - should keep circle standalone, not embedded in contour 0
        const elements = state.getElements();
        
        // Find the circle element
        const circleElem = elements.find(e => e.type === 'circle' && e.segId === circleId);
        
        expect(circleElem).toBeDefined();
        expect(circleElem?.parentContourId).toBeUndefined();  // Standalone shapes omit parentContourId
        expect(elements.some(e => e.type === 'polyline' && e.segIds.includes(circleId))).toBeFalsy();  // Not embedded
    });
    
    it('should embed shape when parentContourId:0 is explicit', () => {
        // Create a polyline contour with contourId:0
        state.segments.push({
            id: 'seg-1',
            type: 'line',
            contourId: 0,
            data: { start: {x: 0, y: 0}, end: {x: 10, y: 10} },
            transforms: [],
        });
        
        // Create a circle with explicit parentContourId:0 (should be embedded)
        const circleId = 'seg-2';
        state.segments.push({
            id: circleId,
            type: 'circle',
            contourId: 0,
            parentContourId: 0,  // explicitly embedded
            data: { center: {x: 5, y: 5}, radius: 2 },
            transforms: [],
        });
        
        // Get elements - circle should be embedded in polyline
        const elements = state.getElements();
        
        // Find the polyline - it should include the circle's segId
        const polylineElem = elements.find(e => (e.type === 'polyline' || e.type === 'symmetry') && e.contourId === 0);
        
        expect(polylineElem).toBeDefined();
        expect(polylineElem?.segIds).toContain(circleId);  // Circle should be in polyline's segIds
        
        // Circle should appear as separate element but marked as embedded
        const circleElem = elements.find(e => e.segId === circleId);
        expect(circleElem?.parentContourId).toBe(0);  // Explicitly embedded
    });
    
    it('should preserve standalone status through getElements round-trip', () => {
        // Create structure: polyline (contour 0) + standalone rect (parentContourId:null)
        state.segments.push({
            id: 'seg-1',
            type: 'line',
            contourId: 0,
            data: { start: {x: 0, y: 0}, end: {x: 20, y: 0} },
            transforms: [],
        });
        
        const rectId = 'seg-2';
        state.segments.push({
            id: rectId,
            type: 'rect',
            contourId: 1,
            parentContourId: null,
            data: { x: 0, y: 0, w: 10, h: 10, dirW: 1, dirH: -1, rx: 0 },
            transforms: [
                { type: 'RT', raw: 'MOD RT 45', params: ['45'] }
            ],
        });
        
        // First getElements call
        const elements1 = state.getElements();
        const rect1 = elements1.find(e => e.segId === rectId);
        
        expect(rect1?.parentContourId).toBeUndefined();  // Standalone shapes omit parentContourId
        expect(rect1?.transforms).toHaveLength(1);
        expect(rect1?.transforms?.[0]?.type).toBe('RT');
    });
});
