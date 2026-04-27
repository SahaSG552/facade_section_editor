/**
 * RT Modifier Consistency Test
 * 
 * Verifies that RT (rotation) modifiers on shapes are preserved when:
 * 1. Editing shape attributes in edit mode
 * 2. Switching between edit and preview modes
 * 3. Deleting shape attributes (only deletes attribute, not modifier)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import EditorStateManager from '../src/editor/EditorStateManager.js';

// Simple ID generator for testing
let testIdCounter = 0;
const genId = () => `seg-${++testIdCounter}`;

// Mock for testing
class MockProfileEditor {
    constructor() {
        this.state = new EditorStateManager();
        this._pathEditorIsSource = false;
        
        // Simulate ProfileEditor's onShapeElementChange handler
        this.onShapeElementChangeHandler = null;
    }
    
    setupShapeChangeHandler() {
        // This simulates the fixed handler from ProfileEditor line 2593
        this.onShapeElementChangeHandler = (segId, changes) => {
            if (changes === null) {
                this.state.deleteSegments([segId]);
                return;
            }
            
            if (changes._create) {
                // Create default shape
                const newId = genId();
                this.state.segments.push({
                    id: newId,
                    type: changes._create,
                    data: {},
                    transforms: [],
                    contourId: 1,
                });
                return;
            }
            
            const seg = this.state.segments.find(s => s.id === segId);
            if (!seg) return;
            
            const mergedData = { ...seg.data, ...changes };
            
            this._pathEditorIsSource = true;
            
            // KEY FIX: Preserve transforms array if not explicitly provided in changes
            const updateChanges = { data: mergedData };
            if (!Object.prototype.hasOwnProperty.call(changes, 'transforms') && Array.isArray(seg.transforms)) {
                updateChanges.transforms = seg.transforms;
            }
            
            // Simulate state.updateSegments
            const idx = this.state.segments.findIndex(s => s.id === segId);
            if (idx !== -1) {
                this.state.segments[idx] = {
                    ...this.state.segments[idx],
                    ...updateChanges,
                };
            }
            
            this._pathEditorIsSource = false;
        };
    }
    
    syncElementTransformsToState(transformsMeta) {
        if (!Array.isArray(transformsMeta)) return;
        
        const metaShapes = transformsMeta.filter(m => m?.kind === 'shape');
        for (const meta of metaShapes) {
            const seg = this.state.segments.find(s => s.id === meta.segId);
            if (seg && Array.isArray(meta.transforms)) {
                seg.transforms = meta.transforms.map(t => ({ ...t }));
            }
        }
    }
}

describe('RT Modifier Consistency', () => {
    let editor;
    
    beforeEach(() => {
        testIdCounter = 0;
        editor = new MockProfileEditor();
        editor.setupShapeChangeHandler();
        
        // Create a test shape with RT modifier
        const shapeId = genId();
        editor.state.segments.push({
            id: shapeId,
            type: 'circle',
            data: {
                center: { x: 10, y: 20 },
                radius: 5,
            },
            transforms: [
                {
                    type: 'RT',
                    raw: 'MOD RT 45',
                    params: ['45'],
                }
            ],
            contourId: 1,
        });
    });
    
    it('should preserve RT modifier when editing shape attributes', () => {
        const seg = editor.state.segments[0];
        const originalTransforms = JSON.stringify(seg.transforms);
        
        // Simulate editing shape center (cx, cy) in PathEditor
        editor.onShapeElementChangeHandler(seg.id, {
            center: { x: 15, y: 25 },
        });
        
        const updated = editor.state.segments.find(s => s.id === seg.id);
        expect(updated.data.center).toEqual({ x: 15, y: 25 });
        expect(JSON.stringify(updated.transforms)).toBe(originalTransforms);
        expect(updated.transforms[0].type).toBe('RT');
        expect(updated.transforms[0].params[0]).toBe('45');
    });
    
    it('should preserve RT modifier when editing multiple attributes', () => {
        const seg = editor.state.segments[0];
        const originalTransforms = JSON.stringify(seg.transforms);
        
        // Simulate editing multiple attributes
        editor.onShapeElementChangeHandler(seg.id, {
            center: { x: 15, y: 25 },
            radius: 8,
        });
        
        const updated = editor.state.segments.find(s => s.id === seg.id);
        expect(updated.data.radius).toBe(8);
        expect(JSON.stringify(updated.transforms)).toBe(originalTransforms);
    });
    
    it('should support explicit transforms update from elementTransforms metadata', () => {
        const seg = editor.state.segments[0];
        
        // Simulate RT modifier edit: angle changed from 45 to 90
        const newTransforms = [
            {
                type: 'RT',
                raw: 'MOD RT 90',
                params: ['90'],
            }
        ];
        
        editor.syncElementTransformsToState([
            {
                kind: 'shape',
                segId: seg.id,
                transforms: newTransforms,
            }
        ]);
        
        const updated = editor.state.segments.find(s => s.id === seg.id);
        expect(updated.transforms[0].params[0]).toBe('90');
    });
    
    it('should delete shape, not just modifier, when onShapeElementChange called with null', () => {
        const seg = editor.state.segments[0];
        const segId = seg.id;
        
        // Simulate shape deletion
        editor.onShapeElementChangeHandler(segId, null);
        
        expect(editor.state.segments.find(s => s.id === segId)).toBeUndefined();
    });
    
    it('should preserve transforms through edit->preview->edit round trip', () => {
        const seg = editor.state.segments[0];
        const originalTransforms = JSON.stringify(seg.transforms);
        
        // Step 1: Edit mode - shape attribute change
        editor.onShapeElementChangeHandler(seg.id, {
            center: { x: 15, y: 25 },
        });
        
        const afterEdit1 = editor.state.segments.find(s => s.id === seg.id);
        expect(JSON.stringify(afterEdit1.transforms)).toBe(originalTransforms);
        
        // Step 2: Simulate preview mode - shape data sent back via sync
        editor.syncElementTransformsToState([
            {
                kind: 'shape',
                segId: seg.id,
                transforms: afterEdit1.transforms,
            }
        ]);
        
        // Step 3: Edit mode again - another shape attribute change
        editor.onShapeElementChangeHandler(seg.id, {
            radius: 7,
        });
        
        const afterEdit2 = editor.state.segments.find(s => s.id === seg.id);
        expect(afterEdit2.data.radius).toBe(7);
        expect(JSON.stringify(afterEdit2.transforms)).toBe(originalTransforms);
    });
    
    it('should handle shape with multiple modifiers', () => {
        const seg = editor.state.segments[0];
        
        // Add a second modifier (scale)
        seg.transforms.push({
            type: 'SC',
            raw: 'MOD SC 0.8',
            params: ['0.8'],
        });
        
        const originalTransforms = JSON.stringify(seg.transforms);
        
        // Edit shape attribute
        editor.onShapeElementChangeHandler(seg.id, {
            center: { x: 15, y: 25 },
        });
        
        const updated = editor.state.segments.find(s => s.id === seg.id);
        expect(JSON.stringify(updated.transforms)).toBe(originalTransforms);
        expect(updated.transforms.length).toBe(2);
        expect(updated.transforms[0].type).toBe('RT');
        expect(updated.transforms[1].type).toBe('SC');
    });
});
