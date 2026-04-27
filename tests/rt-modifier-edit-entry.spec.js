/**
 * RT Modifier Edit Entry Test
 * 
 * Verifies that RT modifier values changed in preview mode
 * are correctly applied when entering edit mode.
 * 
 * User scenario:
 * 1. Preview mode: Element has RT 45°
 * 2. User edits RT to 30°
 * 3. User enters edit mode
 * 4. Expected: Element canvas transform should be 30° (new value)
 * 5. Bug: Element canvas transform is 45° (old value)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProfileEditor from '../src/editor/ProfileEditor.js';
import EditorStateManager from '../src/editor/EditorStateManager.js';
import PathEditor from '../src/panel/PathEditor.js';

describe('RT Modifier Edit Entry', () => {
    let profileEditor;
    let pathEditor;
    let mockPathEditorCallbacks;
    
    beforeEach(() => {
        profileEditor = new ProfileEditor();
        pathEditor = new PathEditor(null);
        mockPathEditorCallbacks = {
            onSegmentsChange: vi.fn(),
            onShapeChange: vi.fn(),
        };
    });

    it('should apply updated RT modifier value when entering edit mode', () => {
        // Scenario 1: Create shape with initial RT=45
        const initialElements = [
            {
                type: 'circle',
                segId: 'seg-1',
                data: { center: { x: 50, y: 50 }, radius: 10 },
                transforms: [
                    { type: 'RT', raw: 'MOD RT 45', params: ['45'] }
                ],
                groupId: null,
                parentContourId: null,
                parentGroupId: null,
                linkType: null,
            }
        ];

        // Initialize PathEditor with initial elements
        pathEditor._elements = initialElements.map(e => ({
            ...e,
            transforms: Array.isArray(e.transforms) ? e.transforms : []
        }));

        // Scenario 2: User edits RT to 30 in preview mode
        // This simulates updating the transform value directly in PathEditor
        const updatedElements = JSON.parse(JSON.stringify(initialElements));
        updatedElements[0].transforms[0].params = ['30'];
        updatedElements[0].transforms[0].raw = 'MOD RT 30';
        
        pathEditor._elements[0].transforms[0].params = ['30'];
        pathEditor._elements[0].transforms[0].raw = 'MOD RT 30';

        // Scenario 3: Enter edit mode
        // This should use the updated transforms from PathEditor
        profileEditor.enter({
            modal: {
                classList: { add: () => {}, remove: () => {} },
                addEventListener: () => {},
            },
            canvasManager: {
                getLayer: () => null,
                getSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
                getSize: () => ({ w: 800, h: 600 }),
                addEventListener: () => {},
            },
            profilePath: '',
            profileElements: initialElements,  // These are OLD transforms
            variableValues: {},
            onSave: () => {},
            onClose: () => {},
            pathEditor: pathEditor,  // This has UPDATED transforms
            clearOverlayLayerOnEnter: false,
        });

        // Verify state has updated RT value from PathEditor
        const state = profileEditor.state;
        const shapeSegment = state.segments.find(s => s.id === 'seg-1' || s.type === 'circle');
        
        expect(shapeSegment).toBeDefined();
        expect(shapeSegment?.transforms).toHaveLength(1);
        expect(shapeSegment?.transforms?.[0]?.type).toBe('RT');
        
        // CRITICAL: Should be 30 (from pathEditor), NOT 45 (from profileElements)
        expect(shapeSegment?.transforms?.[0]?.params?.[0]).toBe('30');
        expect(shapeSegment?.transforms?.[0]?.raw).toBe('MOD RT 30');
    });

    it('should preserve RT modifier through state round-trip', () => {
        // Create shape with RT=45
        const initialElements = [
            {
                type: 'rect',
                segId: 'seg-2',
                data: { x: 10, y: 10, w: 20, h: 30, dirW: 1, dirH: -1, rx: 0 },
                transforms: [
                    { type: 'RT', raw: 'MOD RT 45', params: ['45'] }
                ],
            }
        ];

        pathEditor._elements = initialElements.map(e => ({
            ...e,
            transforms: Array.isArray(e.transforms) ? e.transforms : []
        }));

        // Enter with OLD elements
        profileEditor.enter({
            modal: {
                classList: { add: () => {}, remove: () => {} },
                addEventListener: () => {},
            },
            canvasManager: {
                getLayer: () => null,
                getSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
                getSize: () => ({ w: 800, h: 600 }),
                addEventListener: () => {},
            },
            profilePath: '',
            profileElements: initialElements,
            variableValues: {},
            onSave: () => {},
            onClose: () => {},
            pathEditor: pathEditor,
            clearOverlayLayerOnEnter: false,
        });

        const state = profileEditor.state;
        const rectSegment = state.segments.find(s => s.type === 'rect');
        
        // Export elements and verify RT preserved
        const elements = state.getElements();
        const rectElement = elements.find(e => e.type === 'rect');
        
        expect(rectElement?.transforms).toHaveLength(1);
        expect(rectElement?.transforms?.[0]?.type).toBe('RT');
        expect(rectElement?.transforms?.[0]?.params?.[0]).toBe('45');
    });
});
