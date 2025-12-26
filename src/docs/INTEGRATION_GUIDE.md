# Integration Guide & Quick Start

How to work with the modular facade section editor codebase.

## Quick Start for New Features

### Adding a New Bit Type

1. **Define the shape** in `src/panel/BitsManager.js`:

```javascript
// In createBitShapeElement()
case "CustomShape":
    // Define SVG paths or use existing shape utilities
    const path = createCustomPath(bit.profile);
    shapeGroup.appendChild(path);
    break;
```

2. **Register in bit database** in `src/data/defaultBits.js`:

```javascript
const defaultBits = [
    {
        id: "custom-001",
        name: "My Custom Bit",
        profile: "CustomShape",
        width: 10,
        height: 5,
        group: "custom"
    },
    // ... other bits
];
```

3. **Test shape creation**:

```javascript
// In browser console:
const bit = bitsOnCanvas[0];
bitsManager.createBitShapeElement(bit, "test", 100, 100);
```

### Adding a New Operation (e.g., "CA" = Chamfer)

1. **Add operation to bit groups** in `src/data/defaultBits.js`:

```javascript
export function getOperationsForGroup(groupId) {
    const operations = {
        cylindrical: ["AL", "OU", "IN", "VC", "CA"],  // Added "CA"
        conical: ["AL", "OU", "IN", "VC"],
        // ...
    };
    return operations[groupId] || [];
}
```

2. **Add operation handler** in `script.js`:

```javascript
function handleOperationChange(index, operation) {
    const bit = bitsOnCanvas[index];
    bit.operation = operation;
    
    if (operation === "CA") {
        // Handle chamfer operation
        updateChamferShape(index);
    }
    
    updateOffsetContours();
    updatePhantomBits();
}
```

3. **Add UI for operation parameters** (optional):
   - Edit table row creation in `BitsTableManager.js` to add parameter inputs

### Adding a New Panel Control

1. **Add HTML element** in `index.html`:

```html
<div id="my-control">
    <label>My Control</label>
    <input type="number" id="my-input" />
</div>
```

2. **Create event handler** in `script.js`:

```javascript
document.getElementById("my-input").addEventListener("change", (e) => {
    const value = parseFloat(e.target.value);
    // Do something with value
    updateBitsSheet();
    updateOffsetContours();
    updatePhantomBits();
});
```

3. **If affects panel rendering**:

```javascript
// Update PanelManager if needed
panelManager.setCustomProperty(value);
updatepanelShape();
```

---

## Common Integration Scenarios

### Scenario 1: Syncing UI with Canvas

**Problem**: You change something in the UI, and the canvas needs to reflect it.

**Solution Pattern**:
```javascript
// Listen to UI change
input.addEventListener("change", () => {
    // 1. Update application state
    const value = input.value;
    
    // 2. Update relevant manager
    if (isCanvasRelated) {
        panelManager.setSomething(value);
    }
    if (isBitsRelated) {
        // Update bitsOnCanvas array or bit properties
    }
    
    // 3. Refresh UI elements that depend on this
    updateBitsSheet();
    
    // 4. Refresh canvas elements
    updatepanelShape();
    redrawBitsOnCanvas();
    
    // 5. Refresh derived calculations
    updateOffsetContours();
    updatePhantomBits();
});
```

### Scenario 2: Adding a New Selection Mode

**Problem**: Want to add "Select by operation" - select all bits with operation "VC".

**Solution**:
```javascript
// Add new method to SelectionManager
selectByOperation(operation) {
    const bits = getBits();
    this.clearSelection();
    
    bits.forEach((bit, index) => {
        if (bit.operation === operation) {
            this.select(index);  // Note: don't toggle, just select
        }
    });
    
    this.onSelectionChange();
}

// In script.js, expose it
window.selectByOperation = (op) => selectionManager.selectByOperation(op);

// Use from browser console
selectByOperation("VC");  // Select all V-Carve bits
```

### Scenario 3: Multi-Bit Operations

**Problem**: Want to perform an action on all selected bits.

**Solution**:
```javascript
function changeSelectedBitsColor(color) {
    const selectedIndices = selectionManager.getSelectedIndices();
    
    selectedIndices.forEach(index => {
        bitsOnCanvas[index].color = color;
    });
    
    // Refresh everything that shows color
    updateBitsSheet();
    redrawBitsOnCanvas();
}

// Call it
changeSelectedBitsColor("#FF0000");
```

### Scenario 4: Handling Canvas Resize

**Problem**: Canvas is resized (window resize, view toggle, etc.) and you need to refresh something.

**Solution Pattern** (already implemented):
```javascript
// ResizeObserver is already monitoring canvas size changes
// When it detects a change, it automatically calls:
updateOffsetContours();
updatePhantomBits();

// If you need to monitor other elements, add another observer:
const myObserver = new ResizeObserver(() => {
    if (/* size changed */) {
        myRefreshFunction();
    }
});
myObserver.observe(element);
```

### Scenario 5: Undo/Redo

**Problem**: User presses Ctrl+Z to undo.

**Solution Pattern** (not yet implemented, but here's how):
```javascript
// Create an action history
const actionHistory = [];
let historyIndex = -1;

// Before each action that changes state
function beforeAction(actionName) {
    // Save current state
    const snapshot = {
        bitsOnCanvas: JSON.parse(JSON.stringify(bitsOnCanvas)),
        panelWidth: panelManager.getWidth(),
        panelHeight: panelManager.getHeight(),
        panelAnchor: panelManager.getAnchor(),
        name: actionName
    };
    
    actionHistory.push(snapshot);
    historyIndex = actionHistory.length - 1;
}

// After undo button clicked
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const snapshot = actionHistory[historyIndex];
        
        // Restore state
        bitsOnCanvas = JSON.parse(JSON.stringify(snapshot.bitsOnCanvas));
        panelManager.setWidth(snapshot.panelWidth);
        panelManager.setHeight(snapshot.panelHeight);
        // ... restore other state
        
        // Refresh UI
        updateBitsSheet();
        redrawBitsOnCanvas();
        updateOffsetContours();
        updatePhantomBits();
    }
}

// Hook into changes
function updateBitPosition(index, newX, newY) {
    beforeAction(`Move bit ${index}`);
    bitsOnCanvas[index].x = newX;
    bitsOnCanvas[index].y = newY;
    // ... rest of update
}
```

---

## Module Communication Patterns

### Pattern 1: Direct Method Call

**When**: Module B needs information from Module A (no side effects in A).

```javascript
// Module A (BitsManager)
createBitShapeElement(bit, groupName, x, y) { /* ... */ }

// Module B (SelectionManager)
highlightBit(index) {
    const bit = getBits()[index];
    const shape = bitsManager.createBitShapeElement(bit, "temp", x, y, true);
}
```

### Pattern 2: Callback Pattern

**When**: Module A wants to notify Module B when something happens.

```javascript
// Module A (BitsTableManager)
setCallbacks({
    onSelectBit: (index) => { /* ... */ }
});

// Inside BitsTableManager, when user clicks:
callbacks.onSelectBit(5);

// Module B (script.js) provided the callback
bitsTableManager.setCallbacks({
    onSelectBit: (index) => {
        selectBit(index);
    }
});
```

### Pattern 3: Pub/Sub via EventBus

**When**: Multiple modules need to react to an event.

```javascript
// Module A emits event
eventBus.emit("bitMoved", { index, x, y });

// Module B listens
eventBus.on("bitMoved", ({ index, x, y }) => {
    updateTableCoordinates();
});

// Module C also listens
eventBus.on("bitMoved", ({ index, x, y }) => {
    update3DView();
});
```

### Pattern 4: Dependency Injection

**When**: Module needs access to another module's instance.

```javascript
// Create SelectionManager with dependency
const selectionManager = new SelectionManager({
    bitsManager: bitsManager,           // Injected
    mainCanvasManager: mainCanvasManager,
    getBits: () => bitsOnCanvas,
    isShankVisible: () => isPartVisible,
    onSelectionChange: handleSelectionChange
});

// SelectionManager can now use these:
this.bitsManager.createBitShapeElement(bit, ...);
this.mainCanvasManager.getZoomLevel();
```

---

## Testing Checklist for New Features

When adding a new feature, verify:

### UI Update Flow
- [ ] Change is applied to state object
- [ ] `updateBitsSheet()` called if table needed
- [ ] `redrawBitsOnCanvas()` called if canvas needed
- [ ] `updateOffsetContours()` called if offsets needed
- [ ] `updatePhantomBits()` called if phantom bits needed

### Canvas Synchronization
- [ ] Canvas changes reflect immediately in UI
- [ ] UI changes reflect immediately in canvas
- [ ] Selection is maintained through changes
- [ ] Undo doesn't break anything (if using undo)

### Performance
- [ ] Table renders smoothly with 100+ bits
- [ ] Dragging a bit is responsive (60 FPS)
- [ ] View toggle (2D/3D) is smooth
- [ ] No memory leaks on long sessions

### Edge Cases
- [ ] Works with 0 bits
- [ ] Works with 1 bit
- [ ] Works with 100+ bits
- [ ] Works with all anchor positions
- [ ] Works with all operations
- [ ] Works on mobile (touch events)
- [ ] Works with different window sizes

### Integration
- [ ] Doesn't break existing features
- [ ] Works with part view toggle
- [ ] Works with grid toggle
- [ ] Works with zoom/pan
- [ ] Works with 3D view
- [ ] Save/load preserves new data

---

## Debugging Techniques

### Enable Module Logging

```javascript
// In script.js, create debug instance
const DEBUG = {
    panelManager: true,
    bitsTableManager: true,
    selectionManager: true,
    interactionManager: false
};

// Then in modules, add debug logging
if (DEBUG.selectionManager) {
    console.log("Selection changed:", this.selectedIndices);
}
```

### Monitor State Changes

```javascript
// Create observer to track state changes
const stateObserver = {
    bitsOnCanvas: [],
    
    update(newBits) {
        console.log("Bits changed from:", this.bitsOnCanvas, "to:", newBits);
        this.bitsOnCanvas = newBits;
    }
};

// Use it
bitsOnCanvas = [...newBits];
stateObserver.update(bitsOnCanvas);
```

### Track Callback Execution

```javascript
// Wrap callbacks to log when they execute
const wrappedCallback = {
    original: panelManager.onPanelUpdate,
    called: false,
    
    trigger() {
        console.log("Panel updated");
        this.called = true;
        this.original();
    }
};
```

### Validate State Consistency

```javascript
function validateState() {
    const errors = [];
    
    // Check: bitsOnCanvas indices match table rows
    const tableRows = document.querySelectorAll("#bitsTable tbody tr");
    if (tableRows.length !== bitsOnCanvas.length) {
        errors.push(`Table rows (${tableRows.length}) != bits (${bitsOnCanvas.length})`);
    }
    
    // Check: no duplicate bit IDs
    const ids = new Set(bitsOnCanvas.map(b => b.id));
    if (ids.size !== bitsOnCanvas.length) {
        errors.push("Duplicate bit IDs found");
    }
    
    // Check: selection indices are valid
    const selected = selectionManager.getSelectedIndices();
    selected.forEach(idx => {
        if (idx < 0 || idx >= bitsOnCanvas.length) {
            errors.push(`Invalid selection index: ${idx}`);
        }
    });
    
    if (errors.length > 0) {
        console.error("State validation failed:", errors);
    } else {
        console.log("State is consistent ✓");
    }
}

// Run validation
validateState();
```

---

## Next Steps

### Recommended Improvements

1. **Code Splitting**: Split large modules (>1000 lines) into smaller units
2. **Unit Tests**: Add Jest tests for each manager module
3. **E2E Tests**: Add Cypress tests for user workflows
4. **Type Safety**: Add TypeScript definitions or JSDoc comments
5. **Performance**: Profile with DevTools to identify bottlenecks
6. **Accessibility**: Ensure all UI controls are keyboard accessible
7. **Mobile Optimization**: Test on actual mobile devices, not just desktop
8. **Documentation**: Add inline JSDoc comments to public methods

### Architecture Extensions

1. **Plugin System**: Allow loading custom bit types and operations
2. **Theme System**: Allow customizable colors and UI layouts
3. **Localization**: Support multiple languages
4. **Persistence**: Implement save/load with versioning
5. **Collaboration**: Add real-time multi-user editing (if needed)
6. **Analytics**: Track user actions for telemetry
7. **Import/Export**: Support more file formats (SVG, PDF, etc.)

---

## References

- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [README.md](./README.md)
- Source code comments in `src/**/*.js`

