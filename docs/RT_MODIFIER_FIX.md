# RT Modifier Consistency Fix

## Problem

Elements with RT (rotation) modifiers were losing their transforms when:
1. Editing shape attributes (cx, cy, r, etc.) in edit mode
2. Switching between edit and preview modes
3. Sometimes causing the shape itself to be deleted

### Root Cause

The issue was in `ProfileEditor.js` in the `onShapeElementChange` handler (line 2593):

**Before (buggy):**
```javascript
pathEditor.onShapeElementChange = (segId, changes) => {
    // ... shape deletion and creation logic ...
    
    const mergedData = { ...seg.data, ...changes };
    // ... circle pt3 calculation ...
    
    this._pathEditorIsSource = true;
    this.state.updateSegments([{ id: segId, changes: { data: mergedData } }]);
    // ❌ BUG: Only passes `data` in changes, loses `transforms`!
    this.state._pushHistory("Edit shape element");
    this._pathEditorIsSource = false;
};
```

**Problem breakdown:**
1. When PathEditor's shape parameter edit fires `onShapeElementChange(segId, changes)`, the `changes` object contains only the shape attributes that changed (e.g., `{ cx: 15 }`), **not** the transforms array
2. The handler merges changes into `seg.data` and calls `state.updateSegments([{ id: segId, changes: { data: mergedData } }])`
3. The segment update **does not preserve** the existing transforms array
4. Transforms are managed separately via PathEditor's `onChange` event's `elementTransforms` metadata, which are synced via `_syncElementTransformsToState()` later
5. But if shape attribute edit fires first, the segment gets updated **before** the transforms sync happens, causing the transforms to be lost

### How Transforms are Supposed to Flow

```
PathEditor shape attribute edit
    ↓
onShapeElementChange(segId, changes) [changes = {cx: 15}]
    ↓
updateSegments([{id, changes: {data: {...}}}]) ← Should preserve transforms!
    ↓
state.segments[id] updated (potentially loses transforms)
    ↓
Later: elementTransforms metadata arrives and syncs transforms back
```

The race condition: if another shape attribute edit happens before transforms are re-synced, the second edit loses the transforms entirely.

## Solution

**After (fixed):**
```javascript
pathEditor.onShapeElementChange = (segId, changes) => {
    // ... shape deletion and creation logic ...
    
    const mergedData = { ...seg.data, ...changes };
    // ... circle pt3 calculation ...
    
    this._pathEditorIsSource = true;
    
    // ✅ FIX: Preserve transforms array if not explicitly provided in changes
    const updateChanges = { data: mergedData };
    if (!Object.prototype.hasOwnProperty.call(changes, 'transforms') && Array.isArray(seg.transforms)) {
        updateChanges.transforms = seg.transforms;  // Preserve existing transforms
    }
    
    this.state.updateSegments([{ id: segId, changes: updateChanges }]);
    this.state._pushHistory("Edit shape element");
    this._pathEditorIsSource = false;
};
```

### Key Changes

1. **Explicit transforms preservation**: Check if transforms were explicitly provided in the `changes` object
2. **If not provided**: Copy the existing transforms array from the segment into the update
3. **Allows explicit updates**: If transforms are explicitly passed in changes, they will override (for future extensibility)

## Testing

Created comprehensive test suite: `tests/rt-modifier-consistency.spec.js`

Tests verify:
- ✅ RT modifier preserved when editing shape attributes
- ✅ RT modifier preserved when editing multiple attributes
- ✅ Explicit transforms updates work via elementTransforms metadata
- ✅ Shape deletion works correctly (null changes)
- ✅ Round-trip consistency (edit → preview → edit)
- ✅ Multiple modifiers (RT + SC) work correctly

All 6 tests pass.

## Impact

**Files modified:**
- `src/editor/ProfileEditor.js` (line ~2637)

**Test coverage:**
- New: `tests/rt-modifier-consistency.spec.js` (6 tests)
- Existing: All 315+ existing tests still pass

**No breaking changes**: The fix is backward compatible and only adds missing logic to preserve existing data.

## Commit Info

- **Type**: Bug fix
- **Category**: Shape modifier consistency
- **Affected Components**: ProfileEditor, PathEditor, EditorStateManager
- **Build Status**: ✅ Passes

---

## Technical Notes

### Why Transforms Need Separate Handling

Transforms (RT, SC, SX, SY, TR, MT) are stored separately from shape data:

```javascript
segment = {
    id: "seg-123",
    type: "circle",
    data: { center: {x, y}, radius },  // Shape-specific attributes
    transforms: [                         // Transform stack
        { type: "RT", raw: "MOD RT 45", params: ["45"] }
    ]
}
```

This separation is intentional:
- **Shape data**: serialized to/from HTML/PathEditor inline
- **Transforms**: managed as a stack, can contain formulas, updated separately

### ElementTransforms Metadata Flow

```
PathEditor._fireOnChange()
    └─> onChange(path, {
            elementTransforms: [
                { kind: 'shape', segId: '...', transforms: [...] }
            ]
        })
    └─> ProfileEditor.onPathEditorChange()
        └─> _syncElementTransformsToState(meta?.elementTransforms)
```

This metadata sync is the official channel for transforms updates. Shape attribute changes must not interfere with it.
