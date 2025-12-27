# API Reference

Complete API documentation for all public methods and callbacks in the modular architecture.

## PanelManager

**Location**: `src/panel/PanelManager.js`

### Constructor

```javascript
new PanelManager(config)
```

**Parameters**:
- `canvas` (SVGElement) - The SVG canvas
- `canvasManager` (CanvasManager) - Canvas manager instance
- `bitsManager` (BitsManager) - Bits manager instance
- `isPartVisible` (Function) - Returns boolean indicating if part is visible
- `onPanelUpdate` (Function) - Callback for panel updates
- `onAnchorChange` (Function) - Callback for anchor changes
- `updatePartShape` (Function) - Callback to update part shape
- `updateGridAnchor` (Function) - Callback to update grid anchor
- `getOffsetToDisplay` (Function) - Callback for anchor offset calculation

### Methods

#### Getters

```javascript
getWidth() → number
getHeight() → number
getThickness() → number
getAnchor() → "top-left" | "bottom-left"
```

#### Coordinate Transformation

```javascript
getPanelAnchorOffset() → { x: number, y: number }
```
Returns the offset of the panel anchor point based on current anchor setting.

```javascript
getPanelAnchorCoords() → { x: number, y: number }
```
Returns absolute canvas coordinates of the panel anchor point.

```javascript
transformYForDisplay(y: number, offset?: number) → number
```
Transform a logical Y coordinate to display coordinates (considering anchor). Optional offset for multi-anchor scenarios.

```javascript
transformYFromDisplay(y: number, offset?: number) → number
```
Transform a display Y coordinate back to logical coordinates.

#### Panel Rendering

```javascript
updatePanelShape() → void
```
Render/update the panel rectangle on canvas.

```javascript
updatePanelAnchorIndicator() → void
```
Render/update the anchor point marker (small square at anchor).

```javascript
updateGridAnchor() → void
```
Update grid anchor visualization.

#### Anchor Management

```javascript
cyclePanelAnchor() → void
```
Toggle panel anchor between "top-left" and "bottom-left". Triggers callback `onAnchorChange()`.

```javascript
updateBitsForNewAnchor(bits: Bit[]) → void
```
Recalculate bit positions after anchor change.

```javascript
updateBitsPositions(bits: Bit[]) → void
```
Update bit positions based on their logical coordinates (respects new anchor).

#### Setters

```javascript
setWidth(value: number) → void
setHeight(value: number) → void
setThickness(value: number) → void
setPanelAnchor(anchor: "top-left" | "bottom-left") → void
```

### Callbacks

```javascript
onPanelUpdate() → void
```
Fired when panel dimensions or properties change.

```javascript
onAnchorChange(newAnchor: "top-left" | "bottom-left") → void
```
Fired when anchor is toggled.

---

## BitsTableManager

**Location**: `src/panel/BitsTableManager.js`

### Constructor

```javascript
new BitsTableManager(container: HTMLElement)
```

### Methods

#### Rendering

```javascript
render(bits: Bit[], selectedIndices: number[]) → void
```
Render the complete bits table. Called whenever bits or selection changes.

**Parameters**:
- `bits` - Array of bit objects
- `selectedIndices` - Array of currently selected bit indices

```javascript
createRow(bit: Bit, index: number, selectedIndices: number[]) → HTMLTableRowElement
```
Create a single table row for the given bit. Used internally by `render()`.

#### Event Setup

```javascript
setCallbacks(callbacks: CallbacksObject) → void
```

Register event callbacks. The `callbacks` object can contain any of:

```javascript
{
    onSelectBit: (index: number) => void,
    onChangePosition: (index: number, newX: number, newY: number) => void,
    onCycleAlignment: (index: number) => void,
    onChangeOperation: (index: number, operation: string) => void,
    onChangeColor: (index: number, color: string) => void,
    onDeleteBit: (index: number) => void,
    onReorderBits: (srcIndex: number, destIndex: number) => void,
    onClearSelection: () => void,
    // Helper callbacks
    getAnchorOffset: (bit: Bit) => { x: number, y: number },
    transformYForDisplay: (y: number, offset: number) => number,
    evaluateMathExpression: (expr: string) => number,
    createAlignmentButton: (bit: Bit, index: number) => HTMLElement,
    getOperationsForGroup: (groupId: string) => string[]
}
```

```javascript
attachRightMenuHandler() → void
```
Setup click-outside detection to close the right menu.

### Callback Details

Each callback is triggered by specific user actions:

```javascript
onSelectBit(index: number)
```
Triggered when user clicks a row in the table.

```javascript
onChangePosition(index: number, newX: number, newY: number)
```
Triggered when user edits X or Y coordinate in the table.

```javascript
onCycleAlignment(index: number)
```
Triggered when user clicks the alignment button in the table.

```javascript
onChangeOperation(index: number, operation: string)
```
Triggered when user selects a new operation from the dropdown.

```javascript
onChangeColor(index: number, color: string)
```
Triggered when user picks a new color from the color picker.

```javascript
onDeleteBit(index: number)
```
Triggered when user clicks the delete button.

```javascript
onReorderBits(srcIndex: number, destIndex: number)
```
Triggered when user drags a row to a new position.

```javascript
onClearSelection()
```
Triggered when user clicks on an empty area of the panel (outside any row).

---

## SelectionManager

**Location**: `src/selection/SelectionManager.js`

### Constructor

```javascript
new SelectionManager(config: ConfigObject)
```

**Parameters**:
- `bitsManager` (BitsManager) - For shape recreation
- `mainCanvasManager` (CanvasManager) - For zoom level and canvas
- `getBits` (Function) - Returns array of bit objects
- `isShankVisible` (Function) - Returns boolean
- `onSelectionChange` (Function) - Callback for selection changes

### Methods

#### Selection State

```javascript
getSelectedIndices() → number[]
```
Get array of currently selected bit indices.

```javascript
isSelected(index: number) → boolean
```
Check if a specific bit is selected.

```javascript
toggleSelection(index: number) → void
```
Toggle selection for a bit (select if deselected, deselect if selected). Applies/removes visual highlight and fires `onSelectionChange()`.

```javascript
clearSelection() → void
```
Deselect all bits. Fires `onSelectionChange()`.

```javascript
select(index: number) → void
deselect(index: number) → void
```
Explicitly select or deselect a bit.

#### Visual Highlighting

```javascript
highlightBit(index: number) → void
```
Apply blue stroke highlight to a bit on canvas. Called automatically by `toggleSelection()`.

```javascript
resetBitHighlight(index: number) → void
```
Remove blue stroke highlight from a bit. Called automatically by `toggleSelection()` or when deselecting.

#### Index Maintenance

```javascript
handleDelete(index: number) → void
```
Update all selection indices after a bit is deleted. Decrements all indices > deleted index.

```javascript
handleReorder(srcIndex: number, destIndex: number) → void
```
Update all selection indices after bits are reordered. Maintains selection through the reorder.

### Callback

```javascript
onSelectionChange()
```
Fired whenever selection changes (bit selected, deselected, or cleared). Used to trigger table/canvas refresh.

---

## BitsManager

**Location**: `src/panel/BitsManager.js`

### Constructor

```javascript
new BitsManager(config: ConfigObject)
```

**Parameters**:
- `canvas` (SVGElement) - The SVG canvas
- `canvasManager` (CanvasManager) - Canvas manager for layer access
- `bitsStore` (Object) - Bits database

### Methods

#### Shape Creation

```javascript
createBitShapeElement(
    bit: Bit,
    groupName: string,
    x: number,
    y: number,
    isSelected: boolean = false,
    includeShank: boolean = true
) → SVGElement
```
Create SVG shape for a bit with proper profile and positioning.

**Parameters**:
- `bit` - Bit object with properties: { profile, type, angle, width, diameter, etc. }
- `groupName` - SVG group name (e.g., "bitsOnCanvas")
- `x`, `y` - Canvas position
- `isSelected` - If true, applies blue highlight stroke
- `includeShank` - If true, includes the shank (cylindrical part); if false, hides it

**Returns**: SVG G (group) element containing the shape.

```javascript
createSVGIcon(shape: string, params: Object, size: number = 32) → SVGElement
```
Create a small icon representation of a bit shape for UI display.

**Parameters**:
- `shape` - Shape type (e.g., "Cylindrical", "Conical", "Ball")
- `params` - Shape parameters (diameter, angle, etc.)
- `size` - Icon size in pixels

**Returns**: SVG element representing the bit icon.

#### Bit Profiles

```javascript
assignProfilePathsToBits(bits: Bit[]) → void
```
For each bit, find and assign the corresponding SVG profile path from the bits database.

#### Color

```javascript
getBitFillColor(bit: Bit, isSelected: boolean) → string
```
Get the fill color for a bit (respecting opacity if selected).

---

## InteractionManager

**Location**: `src/interaction/InteractionManager.js`

### Constructor

```javascript
new InteractionManager(config: ConfigObject)
```

**Parameters**:
- `canvas` (SVGElement) - The SVG canvas
- `canvasManager` (CanvasManager) - Canvas manager
- `bitsManager` (BitsManager) - Bits manager
- `getBits` (Function) - Returns array of bits
- `getSelectedIndices` (Function) - Returns selected indices
- `selectBit` (Function) - Select a bit callback
- `updateBitPosition` (Function) - Update bit position callback
- `updateTableCoordinates` (Function) - Sync table callback
- And many more callbacks...

### Methods

#### Setup

```javascript
attach() → void
```
Attach event listeners to the canvas and document.

```javascript
detach() → void
```
Remove event listeners.

#### Configuration

```javascript
setBitTolerance(pixels: number) → void
setAutoScrollMargin(pixels: number) → void
setAutoScrollSpeed(pixelsPerSecond: number) → void
```
Adjust interaction tolerances and speeds.

### Callbacks

The InteractionManager expects callbacks for handling interactions:

```javascript
selectBit(index: number) → void
updateBitPosition(index: number, newX: number, newY: number) → void
updateTableCoordinates() → void
deleteSelectedBits() → void
cyclePanelAnchor() → void
// ... and many others
```

---

## Core Helper Functions in script.js

### Panel Coordinate Helpers

```javascript
getpanelAnchorOffset() → { x: number, y: number }
```
Get the anchor offset (delegates to PanelManager).

```javascript
getPanelAnchorCoords() → { x: number, y: number }
```
Get absolute canvas coordinates of panel anchor (delegates to PanelManager).

```javascript
transformYForDisplay(y: number) → number
```
Transform logical Y to display Y (delegates to PanelManager).

```javascript
transformYFromDisplay(y: number) → number
```
Transform display Y to logical Y (delegates to PanelManager).

### Bit Management

```javascript
selectBit(index: number) → void
```
Select/deselect a bit. Delegates to SelectionManager.

```javascript
resetBitHighlight(index: number) → void
```
Reset visual highlight for a bit. Delegates to SelectionManager.

```javascript
deleteBitFromCanvas(index: number) → void
```
Remove a bit from the canvas with cleanup.

```javascript
cycleAlignment(index: number) → void
```
Cycle bit alignment through available options (left, center, right).

```javascript
updateBitPosition(index: number, newX: number, newY: number) → void
```
Update a bit's position (logical coordinates).

```javascript
drawBitShape(bit: Bit, groupName: string, createFn?: Function) → void
```
Add a new bit to the canvas and update related elements.

### Offset and Phantom Bits

```javascript
updateOffsetContours() → void
```
Calculate and render V-Carve offset paths using OffsetCalculator. Called after bit changes.

```javascript
updatePhantomBits() → void
```
Render preview bits for multiple passes. Only for VC (V-Carve) operations.

```javascript
convertToTopAnchorCoordinates(bit: Bit) → Bit
```
Convert a bit's coordinates from current anchor to top anchor system.

### UI Updates

```javascript
updatepanelShape() → void
```
Render the panel rectangle on canvas (delegates to PanelManager).

```javascript
updatepanelAnchorIndicator() → void
```
Render the anchor point marker (delegates to PanelManager).

```javascript
updatepanelParams() → void
```
Read panel dimensions from UI inputs and update PanelManager.

```javascript
updateBitsPositions() → void
```
Reposition all bits based on logical coordinates (delegates to PanelManager).

```javascript
updateBitsSheet(bits?: Bit[], selectedIndices?: number[]) → void
```
Render bits table via BitsTableManager.

```javascript
redrawBitsOnCanvas() → void
```
Redraw the entire bits layer while preserving transforms/visibility.

### Selection and Table

```javascript
clearBitSelection() → void
```
Clear all selections (delegates to SelectionManager).

```javascript
reorderBits(srcIndex: number, destIndex: number) → void
```
Reorder bits array and update selection (delegates to SelectionManager).

```javascript
handleSelectionChange() → void
```
Callback fired when selection changes. Refreshes table and canvas.

```javascript
handleOperationChange(index: number, operation: string) → void
```
Update a bit's operation and refresh offset/phantom bits.

```javascript
handleColorChange(index: number, color: string) → void
```
Update a bit's color.

---

## Data Structures

### Bit Object

```javascript
{
    id: string,                    // Unique identifier
    name: string,                  // Display name
    profileId: string,             // Reference to profile in bitsStore
    x: number,                     // Logical X coordinate (panel-relative)
    y: number,                     // Logical Y coordinate (panel-relative)
    alignment: "left" | "center" | "right",
    operation: "AL" | "OU" | "IN" | "VC",  // V-Carve operations
    color: string,                 // Hex color for display (#RRGGBB)
    group: string,                 // Bit group (determines available operations)
    profile: {
        width: number,
        height: number,
        diameter: number,
        angle: number,
        // ... other profile parameters
    }
}
```

### Canvas Parameters

```javascript
{
    panelWidth: number,
    panelHeight: number,
    panelThickness: number,
    panelAnchor: "top-left" | "bottom-left",
    bitsOnCanvas: Bit[],
    offsetContours: Path[],
    phantomBits: Bit[]
}
```

---

## Event Flow Examples

### Example 1: Selecting a Bit

```javascript
// User clicks bit in table
// → BitsTableManager calls onSelectBit(5)
// → script.js: selectBit(5)
// → SelectionManager.toggleSelection(5)
// → SelectionManager.highlightBit(5) [adds blue stroke]
// → SelectionManager.onSelectionChange() callback
// → script.js: handleSelectionChange()
// → updateBitsSheet() [table row 5 is highlighted]
// → redrawBitsOnCanvas() [bit 5 shows blue stroke]
```

### Example 2: Moving a Bit

```javascript
// User drags bit on canvas
// → InteractionManager detects drag
// → InteractionManager.updateBitPosition(2, 50, 100)
// → script.js: updateBitPosition(2, 50, 100)
// → bitsOnCanvas[2].x = 50, bitsOnCanvas[2].y = 100
// → updateTableCoordinates()
// → updateBitsSheet() [table shows new coordinates]
// → updateOffsetContours() [offset paths recalculated]
// → updatePhantomBits() [phantom bits repositioned]
// → 3D view updated if enabled
```

### Example 3: Toggling Anchor

```javascript
// User clicks anchor button
// → script.js: cyclepanelAnchor()
// → PanelManager.cyclePanelAnchor()
// → PanelManager.onAnchorChange("bottom-left") callback
// → script.js: anchorChangedCallback()
// → PanelManager.updateBitsForNewAnchor(bits)
// → updatePanelShape() [panel rectangle redrawn]
// → updatePanelAnchorIndicator() [anchor marker moved]
// → updateGridAnchor() [grid anchor updated]
// → redrawBitsOnCanvas() [bits repositioned]
// → updateOffsetContours() [offsets recalculated]
// → updatePhantomBits() [phantom bits repositioned]
```

---

## Common Patterns

### Delegating to a Manager

```javascript
// Don't call internal methods directly
// ❌ panelManager._cycleAnchor()

// Use public methods instead
// ✅ panelManager.cyclePanelAnchor()
```

### Using Callbacks

```javascript
// Setup callbacks when creating a manager
bitsTableManager.setCallbacks({
    onSelectBit: (index) => {
        selectBit(index);
    },
    onDeleteBit: (index) => {
        deleteBitFromCanvas(index);
    }
    // ... other callbacks
});

// Manager will call these callbacks on user interaction
```

### Updating Multiple Elements

```javascript
// When one thing changes, multiple elements need refresh
function handleBitChange() {
    updateBitsSheet();        // Update table
    redrawBitsOnCanvas();     // Update canvas
    updateOffsetContours();   // Update offsets
    updatePhantomBits();      // Update phantom bits
    // 3D view updated automatically via event listeners
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Table doesn't update after bit changes | Call `updateBitsSheet()` |
| Anchor marker doesn't move | Call `updatePanelAnchorIndicator()` |
| Phantom bits in wrong position | Check if `getPanelAnchorCoords()` returns correct values |
| Selection not visually highlighted | Ensure `SelectionManager.highlightBit()` is called |
| Multi-selection not working | Check that InteractionManager passes all selected indices to movement functions |
| Offsets disappear after view toggle | ResizeObserver may not be attached; check `script.js` initialization |

