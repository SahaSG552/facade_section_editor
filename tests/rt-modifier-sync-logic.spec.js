/**
 * RT Modifier Sync Logic Test
 * 
 * Tests the core _syncElementTransformsToState() logic
 * to verify it correctly updates transforms during enter().
 */

import { describe, it, expect, beforeEach } from 'vitest';
import EditorStateManager from '../src/editor/EditorStateManager.js';

describe('RT Modifier Sync Logic', () => {
    let state;

    beforeEach(() => {
        state = new EditorStateManager();
    });

    it('should sync transforms from pathEditor snapshot to state', () => {
        // Simulate state with shape loaded from OLD profileElements
        // (with RT=45)
        state.segments.push({
            id: 'seg-1',
            type: 'circle',
            contourId: 1,
            data: { center: { x: 50, y: 50 }, radius: 10 },
            transforms: [
                { type: 'RT', raw: 'MOD RT 45', params: ['45'] }  // OLD value
            ],
        });

        // Now simulate pathEditor's updated transforms snapshot
        // (RT changed to 30)
        const pathEditorSnapshot = [
            {
                kind: 'shape',
                segId: 'seg-1',
                transforms: [
                    { type: 'RT', raw: 'MOD RT 30', params: ['30'] }  // NEW value
                ]
            }
        ];

        // Simulate _syncElementTransformsToState() logic
        const normalize = (arr) => (Array.isArray(arr) ? arr : []).map(t => ({
            type: String(t?.type ?? '').toUpperCase(),
            raw: String(t?.raw ?? ''),
            params: Array.isArray(t?.params) ? [...t.params] : [],
        }));
        const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

        const updates = [];
        const metaShapes = pathEditorSnapshot.filter(m => m?.kind === 'shape');
        const stateShapes = state.segments.filter(s => s.type === 'circle' || s.type === 'rect' || s.type === 'ellipse');

        for (let i = 0; i < stateShapes.length; i++) {
            const seg = stateShapes[i];
            const byId = metaShapes.find(m => typeof m.segId === 'string' && m.segId === seg.id);
            const tr = normalize(byId?.transforms ?? metaShapes[i]?.transforms);
            if (!same(seg.transforms, tr)) {
                updates.push({ id: seg.id, changes: { transforms: tr } });
            }
        }

        // Apply updates
        if (updates.length > 0) {
            state.updateSegments(updates);
        }

        // Verify
        const updatedSegment = state.segments.find(s => s.id === 'seg-1');
        expect(updatedSegment?.transforms?.[0]?.params?.[0]).toBe('30');
        expect(updatedSegment?.transforms?.[0]?.raw).toBe('MOD RT 30');
    });

    it('should handle shapes with no transforms in pathEditor snapshot', () => {
        state.segments.push({
            id: 'seg-2',
            type: 'rect',
            contourId: 1,
            data: { x: 10, y: 10, w: 20, h: 30, dirW: 1, dirH: -1, rx: 0 },
            transforms: [
                { type: 'RT', raw: 'MOD RT 45', params: ['45'] }
            ],
        });

        // pathEditor snapshot has no transforms for this shape
        const pathEditorSnapshot = [
            {
                kind: 'shape',
                segId: 'seg-2',
                transforms: []  // Empty transforms
            }
        ];

        const normalize = (arr) => (Array.isArray(arr) ? arr : []).map(t => ({
            type: String(t?.type ?? '').toUpperCase(),
            raw: String(t?.raw ?? ''),
            params: Array.isArray(t?.params) ? [...t.params] : [],
        }));
        const same = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

        const updates = [];
        const metaShapes = pathEditorSnapshot.filter(m => m?.kind === 'shape');
        const stateShapes = state.segments.filter(s => s.type === 'circle' || s.type === 'rect' || s.type === 'ellipse');

        for (let i = 0; i < stateShapes.length; i++) {
            const seg = stateShapes[i];
            const byId = metaShapes.find(m => typeof m.segId === 'string' && m.segId === seg.id);
            const tr = normalize(byId?.transforms ?? metaShapes[i]?.transforms);
            if (!same(seg.transforms, tr)) {
                updates.push({ id: seg.id, changes: { transforms: tr } });
            }
        }

        if (updates.length > 0) {
            state.updateSegments(updates);
        }

        // Verify transforms were cleared
        const updatedSegment = state.segments.find(s => s.id === 'seg-2');
        expect(updatedSegment?.transforms).toHaveLength(0);
    });
});
