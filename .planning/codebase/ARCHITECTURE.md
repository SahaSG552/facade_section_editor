# Architecture

**Analysis Date:** 2026-03-29

## Pattern Overview

**Overall:** Modular Architecture with Dependency Injection

The facade_section_editor uses a modular architecture based on:
- **Dependency Injection Container** - Manages module instantiation and dependencies
- **BaseModule Pattern** - Common lifecycle (initialize/shutdown) for all modules
- **Event Bus** - Decoupled cross-module communication
- **Callback Pattern** - Module-specific coordination for tight coupling when needed

**Key Characteristics:**
1. Modules registered in `src/app/main.js` with factory functions
2. Each module extends `BaseModule` with lifecycle hooks
3. Singleton services via dependency container
4. Global event bus for state changes and notifications
5. 2D/3D view synchronization via event emissions

## Layers

### Core Layer
- **Purpose:** Application framework and infrastructure
- Location: `src/core/`
- Contains: BaseModule, App, EventBus, DependencyContainer, LoggerFactory
- Depends on: Nothing (foundational)
- Used by: All modules

**Key Classes:**
- `src/core/app.js` - Application bootstrap, module registration/initialization
- `src/core/BaseModule.js` - Base class for all modules with lifecycle
- `src/core/dependencyContainer.js` - Service container (registerService, get, factories)
- `src/core/eventBus.js` - Pub/sub event system (on, off, emit, once)
- `src/core/LoggerFactory.js` - Named logger creation

### Configuration & State Layer
- **Purpose:** Centralized configuration and reactive state
- Location: `src/config/`, `src/state/`
- Contains: AppConfig, AppState
- Depends on: Core (eventBus)
- Used by: All modules

**Key Classes:**
- `src/config/AppConfig.js` - Panel, UI, CSG, mesh repair settings (replaces 30+ globals)
- `src/state/AppState.js` - Reactive state with event emission on changes

### Data Layer
- **Purpose:** Bit data management and persistence
- Location: `src/data/`
- Contains: bitsStore, VariablesManager, defaultBits
- Depends on: Core (nothing directly)
- Used by: BitsManager, PanelManager, script.js

**Key Classes:**
- `src/data/bitsStore.js` - Bit CRUD operations, localStorage persistence
- `src/data/defaultBits.js` - Default bit definitions by group
- `src/data/VariablesManager.js` - Variable token management

### 2D Canvas Layer
- **Purpose:** SVG canvas rendering and manipulation
- Location: `src/canvas/`
- Contains: CanvasManager, CanvasModule, zoomUtils, SVGElementFactory
- Depends on: Core, Data
- Used by: Editor, Interaction

**Key Classes:**
- `src/canvas/CanvasManager.js` - SVG canvas lifecycle, layers, zoom/pan
- `src/canvas/CanvasModule.js` - Module wrapper for canvas
- `src/canvas/PanelCoordinateHelper.js` - Coordinate transformations
- `src/canvas/SVGElementFactory.js` - SVG element creation

### Panel & Bits Layer
- **Purpose:** Panel shape and router bit operations
- Location: `src/panel/`
- Contains: PanelManager, BitsManager, BitsTableManager, PathEditor
- Depends on: Canvas, Data, Operations
- Used by: script.js, ThreeModule

**Key Classes:**
- `src/panel/PanelManager.js` - Panel shape, anchor, dimensions
- `src/panel/BitsManager.js` - Bit CRUD, path assignment, canvas rendering (3339 lines)
- `src/panel/BitsTableManager.js` - Bit table UI and updates
- `src/panel/PathEditor.js` - Path manipulation utilities

### Editor Layer
- **Purpose:** Drawing tools and profile editing
- Location: `src/editor/`
- Contains: EditorStateManager, EditorCanvas, tools, transforms
- Depends on: Canvas, Core
- Used by: script.js

**Key Classes:**
- `src/editor/EditorStateManager.js` - Path state, formula evaluation, transforms (2049 lines)
- `src/editor/EditorCanvas.js` - Rendering + coordinate helpers
- `src/editor/tools/BaseTool.js` - Abstract base for all tools
- `src/editor/tools/*.js` - LineTool, RectTool, CircleTool, FilletTool, etc.

### Operations Layer
- **Purpose:** Geometric computations (offsets, booleans)
- Location: `src/operations/`
- Contains: CustomOffsetProcessor, PaperBooleanProcessor, UpdatePipeline
- Depends on: Data, Three (for CSG integration)
- Used by: Panel, ThreeModule

**Key Classes:**
- `src/operations/CustomOffsetProcessor.js` - Path offset calculations
- `src/operations/PaperBooleanProcessor.js` - 2D polygon boolean operations
- `src/operations/BitDataHelper.js` - Bit data transformation
- `src/operations/UpdatePipeline.js` - Orchestrates update cascade
- `src/operations/offset/` - Offset pipeline stages (kernel, trimming, normalization)

### 3D/Three.js Layer
- **Purpose:** 3D visualization and CSG operations
- Location: `src/three/`
- Contains: ThreeModule, SceneManager, CSGEngine, ExtrusionBuilder
- Depends on: Operations, Canvas (coordinates)
- Used by: Export, UI

**Key Classes:**
- `src/three/ThreeModule.js` - Main 3D module, CSG orchestration (3374 lines)
- `src/three/SceneManager.js` - Three.js scene, camera, renderer, controls
- `src/three/CSGEngine.js` - Three-bvh-csg operations
- `src/three/ExtrusionBuilder.js` - Path to 3D extrusion
- `src/three/ManifoldCSG.js` - manifold-3d integration
- `src/three/SelectionManager.js` - 3D object selection

### Interaction Layer
- **Purpose:** Mouse/touch input handling
- Location: `src/interaction/`
- Contains: InteractionManager
- Depends on: Canvas, Selection
- Used by: script.js

**Key Classes:**
- `src/interaction/InteractionManager.js` - Unified input handler (drag, pan, zoom, touch)

### Scheduling Layer
- **Purpose:** CSG operation scheduling and batching
- Location: `src/scheduling/`
- Contains: CSGScheduler
- Depends on: Three
- Used by: ThreeModule

### Export Layer
- **Purpose:** File export (DXF, STL)
- Location: `src/export/`
- Contains: ExportModule, STLExporter
- Depends on: Three, Operations
- Used by: UI

**Key Classes:**
- `src/export/ExportModule.js` - Export orchestration
- `src/export/STLExporter.js` - STL file generation

### UI Layer
- **Purpose:** User interface management
- Location: `src/ui/`
- Contains: UIModule, pressEvents
- Depends on: Core, Canvas
- Used by: script.js

## Data Flow

### Bit Update Flow (2D → 3D):

1. **User Action** → `InteractionManager`
   - Drag/move bit on canvas
   
2. **Data Update** → `bitsStore.updateBit()`
   - Updates bit position in registry
   
3. **Canvas Update** → `BitsManager.redrawBitsOnCanvas()`
   - Re-renders bit shapes on SVG
   
4. **Operation Compute** → `CustomOffsetProcessor`
   - Calculates offset contours
   
5. **Event Emission** → `eventBus.emit('bits:updated')`
   - Notifies all interested modules
   
6. **3D Rebuild** → `ThreeModule.updatePanel()`
   - Signature check (skip if unchanged)
   - CSG operation execution
   - 3D mesh regeneration

### Panel Dimension Change Flow:

1. **Input Change** → `AppState.setPanelSize(width, height)`
   - State update with event emission

2. **Panel Update** → `PanelManager.updatePanelShape()`
   - SVG path recalculation

3. **Offset Recalc** → Operations pipeline
   - Recompute all offset contours

4. **3D Update** → ThreeModule (via event or direct call)

### Export Flow:

1. **User Request** → UI triggers export
2. **Mesh Prep** → Mesh repair (if enabled)
3. **CSG Execute** → ThreeModule builds final mesh
4. **File Generate** → STLExporter/DXF export
5. **Download** → Browser file download

## Key Abstractions

### Bit Registry Pattern
- Purpose: Centralized bit data management
- Examples: `src/data/bitsStore.js`, `src/bits/BitRegistry.js`
- Pattern: CRUD operations with localStorage persistence

### Signature-Based Caching
- Purpose: Prevent redundant 3D rebuilds
- Examples: `ThreeModule.lastPanelUpdateSignature`
- Pattern: Hash of bit parameters + panel dims; skip rebuild if unchanged

### Update Pipeline
- Purpose: Orchestrate multi-stage updates
- Examples: `src/operations/UpdatePipeline.js`
- Pattern: Chain of responsibility for cascade updates

### Tool Pattern
- Purpose: Extensible drawing/editing
- Examples: `src/editor/tools/BaseTool.js`, `LineTool.js`, etc.
- Pattern: Abstract base with activate/deactivate/event handlers

### Stage Pipeline (Offset)
- Purpose: Handle complex offset cases
- Examples: `src/operations/offset/OffsetContourStages.js`
- Pattern: Multi-stage processing (kernel → trim → normalize → metadata)

## Entry Points

### Primary Entry: `src/script.js`
- Location: `src/script.js` (3852 lines)
- Triggers: DOMContentLoaded
- Responsibilities:
  - Initialize all managers (Canvas, Bits, Panel, Interaction, Selection)
  - Setup event listeners
  - DOM element binding
  - Application state initialization
  - Legacy and new module integration

### Module Registration: `src/app/main.js`
- Location: `src/app/main.js`
- Triggers: Import by script.js
- Responsibilities:
  - Register CanvasModule, BitsModule, ExportModule, UIModule, ThreeModule
  - Export module classes for external use

### Web Entry: `index.html`
- Location: `index.html`
- Triggers: Browser loads page
- Responsibilities:
  - Load main.js module
  - CDN script includes (Capacitor, math.js, bezier-js, hammerjs, stats.js)
  - Canvas SVG container markup

## Error Handling

**Strategy:** Try-catch with logging

**Patterns:**
1. Module initialization wraps in try-catch, logs and re-throws
2. Event bus callbacks wrapped in try-catch per listener
3. CSG operations have fallback strategies (e.g., mesh repair)
4. LoggerFactory provides named loggers per module

**Examples:**
```javascript
// App initialization error handling (src/core/app.js)
try {
    const module = this.container.get(moduleName);
    await module.initialize();
} catch (error) {
    console.error(`Failed to initialize module ${moduleName}:`, error);
    throw error;
}

// Event bus error containment (src/core/eventBus.js)
for (const callback of listenersCopy) {
    try {
        callback(...args);
    } catch (error) {
        console.error(`Error in event callback for ${eventName}:`, error);
    }
}
```

## Cross-Cutting Concerns

**Logging:** LoggerFactory with named loggers per module
```javascript
const log = LoggerFactory.createLogger("ModuleName");
log.debug("Debug info"); log.info("Info"); log.warn("Warning"); log.error("Error", err);
```

**Validation:** Input validation in managers
- Bit tolerance for selection
- Formula expression validation
- Path data validation

**Authentication:** N/A - Client-side only application

**Configuration:** AppConfig singleton with panel, UI, CSG, meshRepair sections

**Coordinate Transformation:** PanelCoordinateHelper
- SVG: Y-down, origin top-left
- Three.js: Y-up, origin panel center

---

*Architecture analysis: 2026-03-29*
