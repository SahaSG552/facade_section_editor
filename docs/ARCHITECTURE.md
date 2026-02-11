# Facade Section Editor - Architecture Documentation

## Overview

The Facade Section Editor has been refactored from a monolithic script into a modular architecture with separated concerns. This document describes the current module structure, responsibilities, and how they interact.

## Module Structure

```
src/
├── script.js                 # Main orchestrator (initialization, event coordination)
├── panel/
│   ├── PanelManager.js      # Panel dimensions, anchor, shape rendering
│   ├── BitsManager.js       # Bit shape creation, profile path assignment
│   └── BitsTableManager.js  # Bits table UI rendering and interaction
├── selection/
│   └── SelectionManager.js  # Bit selection state and highlighting
├── canvas/
│   ├── CanvasManager.js     # SVG canvas management, zoom, pan, grid
│   ├── CanvasModule.js      # Canvas module wrapper
│   └── zoomUtils.js         # Zoom utility functions
├── interaction/
│   └── InteractionManager.js # Mouse/touch input handling for bits
├── core/
│   ├── app.js              # Application bootstrap and module registration
│   ├── BaseModule.js       # Base class for all modules
│   ├── dependencyContainer.js
│   ├── eventBus.js         # Event pub/sub system
│   ├── LoggerFactory.js    # Logging utility
│   └── platform.js         # Platform detection
├── data/
│   ├── bitsStore.js        # Bit library database and CRUD operations
│   ├── defaultBits.js      # Default bit definitions
│   └── userBits.json       # User-saved bit definitions
├── export/
│   └── ExportModule.js     # DXF export functionality
├── three/
│   ├── ThreeModule.js      # 3D visualization with Three.js
│   ├── SceneManager.js     # 3D scene setup and rendering
│   ├── CSGEngine.js        # Constructive Solid Geometry operations
│   └── ...
├── ui/
│   └── UIModule.js         # UI state, theme, panel toggles
├── utils/
│   ├── utils.js            # General utility functions
│   ├── offsetCalculator.js # V-Carve offset calculations
│   └── dxfExporter.js      # DXF format handling
└── app/
    └── main.js             # Application entry point
```

## Core Modules

### 1. PanelManager (`src/panel/PanelManager.js`)

**Responsibility**: Manages panel dimensions, anchor point, and visual representation.

**Key Methods**:
- `getWidth()`, `getHeight()`, `getThickness()` - Get panel dimensions
- `getAnchor()` - Get current anchor ("top-left" or "bottom-left")
- `getPanelAnchorOffset()` - Get offset based on anchor
- `getPanelAnchorCoords()` - Get panel anchor position in canvas
- `transformYForDisplay(y, offset)` - Transform Y coordinate for display
- `transformYFromDisplay(y, offset)` - Transform Y coordinate from display
- `updatePanelShape()` - Render panel rectangle
- `updatePanelAnchorIndicator()` - Show anchor point marker
- `cyclePanelAnchor()` - Toggle anchor between top and bottom
- `updateBitsForNewAnchor(bits)` - Reposition bits after anchor change
- `updateBitsPositions(bits)` - Reposition bits based on logical coords

**State**:
- `panelWidth`, `panelHeight`, `panelThickness` - Panel dimensions
- `panelAnchor` - Current anchor position
- `partSection`, `partFront` - SVG elements for panel visual

**Integration Points**:
- Callbacks: `onPanelUpdate`, `onAnchorChange`, `updatePartShape`, etc.
- Used by: SelectionManager, script.js, InteractionManager

---

### 2. BitsTableManager (`src/panel/BitsTableManager.js`)

**Responsibility**: Renders and manages the bits table UI in the right panel.

**Key Methods**:
- `render(bits, selectedIndices)` - Render bits table rows
- `createRow(bit, index, selectedIndices)` - Create a table row for a bit
- `setCallbacks(callbacks)` - Register event callbacks
- `attachRightMenuHandler()` - Setup click-outside detection

**Callbacks**:
- `onSelectBit(index)` - Bit row clicked for selection
- `onChangePosition(index, newX, newY)` - Bit coordinates edited
- `onCycleAlignment(index)` - Alignment button clicked
- `onChangeOperation(index, operation)` - Operation dropdown changed
- `onChangeColor(index, color)` - Color picker changed
- `onDeleteBit(index)` - Delete button clicked
- `onReorderBits(srcIndex, destIndex)` - Bit dragged to reorder
- `onClearSelection()` - Click on empty panel area

**Features**:
- Editable X/Y coordinates with math expression support
- Alignment cycle button (left/center/right)
- Operation dropdown (AL, OU, IN, VC, etc.)
- Color picker for bit display color
- Delete button for removing bits
- Drag-to-reorder functionality
- Row highlighting for selected bits
- Click-outside detection to clear selection

---

### 3. SelectionManager (`src/selection/SelectionManager.js`)

**Responsibility**: Manages bit selection state and visual highlighting.

**Key Methods**:
- `getSelectedIndices()` - Get array of selected bit indices
- `isSelected(index)` - Check if bit is selected
- `toggleSelection(index)` - Toggle selection for a bit
- `clearSelection()` - Deselect all bits
- `select(index)` / `deselect(index)` - Select/deselect a specific bit
- `highlightBit(index)` - Apply visual highlight (blue stroke)
- `resetBitHighlight(index)` - Remove visual highlight
- `handleDelete(index)` - Update indices after bit deletion
- `handleReorder(srcIndex, destIndex)` - Update indices after bit reordering

**State**:
- `selectedIndices` - Array of currently selected bit indices

**Integration Points**:
- Callback: `onSelectionChange()` - Fires when selection changes
- Used by: script.js, BitsTableManager, InteractionManager

**Features**:
- Multi-selection support
- Automatic visual highlighting with blue stroke
- Respects shank visibility setting
- Maintains selection indices through reordering and deletion

---

### 4. BitsManager (`src/panel/BitsManager.js`)

**Responsibility**: Creates and manages bit shape elements.

**Key Methods**:
- `createBitShapeElement(bit, groupName, x, y, isSelected, includeShank)` - Create SVG shape for a bit
- `createSVGIcon(shape, params, size)` - Create bit icon for UI
- `assignProfilePathsToBits(bits)` - Assign SVG paths based on bit profiles
- `getBitFillColor(bit, isSelected)` - Get fill color with opacity

**Supported Bit Types**:
- Cylindrical (rectangular)
- Conical (tapered)
- Ball (rounded tip)
- Fillet (rounded corner)
- Bull (bullnose)

**Integration Points**:
- Used by: SelectionManager, script.js for bit rendering
- Depends on: bitsStore for bit definitions

---

### 5. InteractionManager (`src/interaction/InteractionManager.js`)

**Responsibility**: Handles mouse and touch input for canvas interaction.

**Features**:
- Bit dragging with automatic reordering
- Auto-scroll when dragging near edges
- Touch support for mobile
- Context-aware tolerance for bit selection
- Bit tolerance and touch tolerance configuration

**Callbacks**:
- `selectBit(index)` - Select a bit
- `updateBitPosition(index, newX, newY)` - Move a bit
- `updateTableCoordinates()` - Sync table after move
- And many others for canvas interaction

---

## Helper Functions in script.js

### Panel Helpers
- `getpanelAnchorOffset()` - Get anchor offset (delegates to PanelManager)
- `transformYForDisplay()` - Transform Y for display (delegates to PanelManager)
- `transformYFromDisplay()` - Transform Y from display (delegates to PanelManager)
- `getPanelAnchorCoords()` - Get anchor position (delegates to PanelManager)
- `getAnchorOffset(bit)` - Get alignment offset for a bit

### Bit Management
- `updateBitsSheet()` - Render bits table via BitsTableManager
- `selectBit(index)` - Select a bit (delegates to SelectionManager)
- `resetBitHighlight(index)` - Reset highlight (delegates to SelectionManager)
- `deleteBitFromCanvas(index)` - Delete a bit with cleanup
- `cycleAlignment(index)` - Cycle bit alignment (left/center/right)
- `updateBitPosition(index, newX, newY)` - Update bit position
- `drawBitShape(bit, groupName, createFn)` - Add new bit to canvas

### Offset and Phantom Bits
- `updateOffsetContours()` - Calculate and render V-Carve offset paths
- `updatePhantomBits()` - Render preview bits for multiple passes
- `convertToTopAnchorCoordinates(bit)` - Convert coords to top anchor

### UI Updates
- `updatepanelShape()` - Render panel rectangle
- `updatepanelAnchorIndicator()` - Show anchor marker
- `updatepanelParams()` - Update panel from UI inputs
- `updateBitsPositions()` - Reposition all bits
- `redrawBitsOnCanvas()` - Redraw bits layer (preserving transforms)

### Callbacks for TableManager
- `handleOperationChange(index, operation)` - Handle operation change
- `handleColorChange(index, color)` - Handle color change
- `clearBitSelection()` - Clear all selections (delegates to SelectionManager)
- `reorderBits(srcIndex, destIndex)` - Reorder bits (delegates to SelectionManager)
- `handleSelectionChange()` - Refresh table and canvas on selection change

## Data Flow

### Adding a Bit
1. User clicks bit in BitsManager UI
2. `drawBitShape()` is called with bit data
3. Bit object created and added to `bitsOnCanvas`
4. Bit shape rendered via `BitsManager.createBitShapeElement()`
5. `updateBitsSheet()` triggered to refresh table
6. `updateOffsetContours()` and `updatePhantomBits()` refresh

### Selecting a Bit
1. User clicks bit on canvas or row in table
2. `selectBit(index)` called
3. SelectionManager: `toggleSelection(index)` 
4. SelectionManager: `highlightBit(index)` applies blue stroke
5. `handleSelectionChange()` callback fired
6. `updateBitsSheet()` re-renders table with row highlight
7. `redrawBitsOnCanvas()` shows/hides anchor markers

### Moving a Bit
1. User drags bit on canvas (InteractionManager handles)
2. `updateBitPosition(index, newX, newY)` called
3. Bit's logical coords updated: `bit.x = newX`, `bit.y = newY`
4. Bit's group transform updated: `translate(dx, dy)`
5. Multi-selection: all selected bits moved by delta
6. `updateTableCoordinates()` syncs table display
7. `updateOffsetContours()` and `updatePhantomBits()` refresh
8. 3D view updated if enabled

### Toggling Anchor
1. User clicks anchor button
2. `cyclepanelAnchor()` called
3. PanelManager: `cyclePanelAnchor()` toggles anchor
4. PanelManager: Callback `onAnchorChange()` fired
5. Bits repositioned via `updateBitsForNewAnchor()`
6. Panel shape, anchor indicator, and grid anchor refreshed
7. Offset contours and phantom bits recalculated

### Changing Canvas Size (2D/3D/Both View Toggle)
1. User clicks view toggle button (2D/3D/Both)
2. Canvas container size changes
3. ResizeObserver detects size change
4. `updateOffsetContours()` and `updatePhantomBits()` auto-refresh
5. Phantom bits reposition using current anchor coords
6. 3D view resizes and updates

## Key Design Patterns

### Dependency Injection
Modules receive dependencies via constructor config:
```javascript
const manager = new PanelManager({
    canvas: canvas,
    canvasManager: mainCanvasManager,
    bitsManager: bitsManager,
    // ... other deps
});
```

### Callback Pattern
Modules expose callbacks for external coordination:
```javascript
panelManager.setCallbacks({
    onPanelUpdate: () => { /* ... */ },
    onAnchorChange: (anchor) => { /* ... */ },
    // ...
});
```

### Delegation Pattern
High-level functions delegate to modules:
```javascript
function selectBit(index) {
    selectionManager.toggleSelection(index);
    // SelectionManager fires callback, which triggers table/canvas refresh
}
```

### State Centralization
Selection state lives in SelectionManager, not scattered globally:
```javascript
// Before: global let selectedBitIndices = []
// After:  selectionManager.getSelectedIndices()
```

### Canvas Resize Monitoring
ResizeObserver automatically refreshes dependent elements when canvas size changes:
```javascript
const resizeObserver = new ResizeObserver(() => {
    if (/* size changed */) {
        updateOffsetContours();
        updatePhantomBits();
    }
});
resizeObserver.observe(canvas);
```

## Module Initialization Order

1. **CanvasManager** - Canvas and layers setup
2. **BitsManager** - Bit shape factory
3. **PanelManager** - Panel state and rendering
4. **SelectionManager** - Selection state management
5. **BitsTableManager** - Bits table UI
6. **InteractionManager** - Input handling
7. **ThreeModule** - 3D visualization
8. **UIModule** - Theme, panels, responsive behavior

## Testing Checklist

- [ ] Add a bit to canvas
- [ ] Move bit (drag on canvas or edit table coordinates)
- [ ] Select multiple bits
- [ ] Change bit alignment (left/center/right)
- [ ] Change bit operation (AL/OU/IN/VC)
- [ ] Change bit color
- [ ] Delete a bit
- [ ] Reorder bits via drag in table
- [ ] Toggle panel anchor (top-left ↔ bottom-left)
- [ ] Verify phantom bits update after anchor toggle
- [ ] Toggle 2D/3D view
- [ ] Verify phantom bits don't shift when view changes
- [ ] Resize window
- [ ] Toggle left/right panels
- [ ] Test multi-selection movement
- [ ] Test Part view toggle
- [ ] Save and load bit positions
- [ ] Export to DXF
- [ ] Test with different panel sizes

## Performance Considerations

1. **Table Re-rendering**: `updateBitsSheet()` is called frequently but only re-renders rows (not the entire table structure)
2. **Phantom Bits**: Only calculated for VC operations, cleared and recreated on update
3. **Offset Contours**: Uses OffsetCalculator for efficient path offset calculation
4. **Selection**: Multi-selection uses array operations, O(n) where n is selected bits
5. **Canvas Resize**: ResizeObserver debounces phantom bits refresh via size comparison

## Known Issues and Future Improvements

1. **Chunk Size Warning**: Build produces a ~813KB JS file (>500KB limit). Consider code-splitting for production.
2. **Dynamic Module Loading**: bitsStore.js is imported both statically and dynamically, causing Vite to skip code-splitting.
3. **Hardcoded Alignments**: Alignment states (left/center/right) are hardcoded; could be made configurable.
4. **Math Expression Evaluator**: Uses `eval()` internally (via `evaluateMathExpression()`); could be replaced with safer parser.

## Debugging Tips

### Enable Logging
```javascript
const log = LoggerFactory.createLogger("ModuleName");
log.debug("message", { data });
```

### Monitor Selection Changes
```javascript
selectionManager.onSelectionChange = () => {
    console.log("Selected:", selectionManager.getSelectedIndices());
};
```

### Track Canvas Resize
The ResizeObserver logs debug messages:
```
Canvas size changed, refreshing phantom bits
```

### Check Module State
```javascript
// Check PanelManager state
console.log(panelManager.getWidth(), panelManager.getAnchor());

// Check SelectionManager state
console.log(selectionManager.getSelectedIndices());

// Check canvas parameters
console.log(mainCanvasManager.canvasParameters);
```

## Conclusion

The refactored architecture provides:
- **Clear Separation of Concerns**: Each module has a single responsibility
- **Reduced Coupling**: Modules interact via well-defined callbacks and methods
- **Easier Testing**: Modules can be tested independently
- **Better Maintainability**: Feature changes are localized to relevant modules
- **Flexibility**: New features can be added by creating new modules or extending callbacks

All the core functionality is preserved while the code is now more modular and maintainable.
