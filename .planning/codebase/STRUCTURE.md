# Codebase Structure

**Analysis Date:** 2026-03-29

## Directory Layout

```
facade_section_editor/
├── src/
│   ├── app/                 # Application bootstrap
│   ├── bits/                # Bit registry and calculations
│   ├── canvas/              # 2D SVG canvas management
│   ├── config/              # Configuration
│   ├── core/                # Core framework (DI, events, logging)
│   ├── data/                # Data stores and defaults
│   ├── editor/              # Editor tools and state
│   ├── export/              # Export functionality
│   ├── interaction/         # Input handling
│   ├── operations/          # Geometric operations
│   ├── panel/               # Panel and bits management
│   ├── scheduling/          # CSG scheduling
│   ├── selection/            # Selection management
│   ├── state/               # Application state
│   ├── three/               # 3D visualization
│   ├── ui/                  # UI module
│   ├── utils/               # Utilities
│   ├── script.js            # Main application entry
│   └── script.js            # Legacy entry point
├── tests/                   # Test files
├── styles/                  # CSS stylesheets
├── docs/                    # Documentation
├── index.html               # Web entry point
├── package.json             # Dependencies
├── vite.config.js           # Build configuration
└── vitest.config.js         # Test configuration
```

## Directory Purposes

### `src/app/`

- **Purpose:** Application module registration and bootstrap
- **Contains:** `main.js` - Module factory registration
- **Key files:** `src/app/main.js`

### `src/bits/`

- **Purpose:** Bit registry and specialized calculations
- **Contains:** BitRegistry, ExtensionCalculator, PhantomBitCalculator
- **Key files:** `BitRegistry.js`, `ExtensionCalculator.js`, `PhantomBitCalculator.js`

### `src/canvas/`

- **Purpose:** 2D SVG canvas management
- **Contains:** CanvasManager, CanvasModule, zoom utilities, coordinate helpers
- **Key files:**
  - `CanvasManager.js` - Main canvas management
  - `CanvasModule.js` - Module wrapper
  - `PanelCoordinateHelper.js` - Coordinate transformations

### `src/config/`

- **Purpose:** Centralized configuration
- **Contains:** AppConfig, constants
- **Key files:**
  - `AppConfig.js` - Central config (replaces 30+ globals)
  - `constants.js` - Magic numbers and constants

### `src/core/`

- **Purpose:** Core framework infrastructure
- **Contains:** BaseModule, App, EventBus, DependencyContainer, LoggerFactory
- **Key files:**
  - `app.js` - Application bootstrap (117 lines)
  - `BaseModule.js` - Module base class (77 lines)
  - `dependencyContainer.js` - DI container (91 lines)
  - `eventBus.js` - Event system (91 lines)
  - `LoggerFactory.js` - Logging

### `src/data/`

- **Purpose:** Data persistence and defaults
- **Contains:** bitsStore, VariablesManager, defaultBits
- **Key files:**
  - `bitsStore.js` - Bit CRUD, localStorage
  - `defaultBits.js` - Default bit definitions
  - `VariablesManager.js` - Variable tokens

### `src/editor/`

- **Purpose:** Drawing tools and profile editing
- **Contains:** EditorStateManager, EditorCanvas, tools, transforms
- **Key files:**
  - `EditorStateManager.js` - Path state (2049 lines)
  - `EditorCanvas.js` - Canvas rendering
  - `tools/BaseTool.js` - Tool base class
  - `tools/*.js` - LineTool, RectTool, CircleTool, FilletTool, etc.
  - `snaps/SnapManager.js` - Snap functionality

### `src/export/`

- **Purpose:** File export
- **Contains:** ExportModule, STLExporter
- **Key files:** `ExportModule.js`, `STLExporter.js`

### `src/interaction/`

- **Purpose:** Mouse/touch input handling
- **Contains:** InteractionManager
- **Key files:** `InteractionManager.js` (916 lines)

### `src/operations/`

- **Purpose:** Geometric computations
- **Contains:** Offset processors, boolean processors, update pipeline
- **Key files:**
  - `CustomOffsetProcessor.js` - Path offset
  - `PaperBooleanProcessor.js` - 2D boolean
  - `BitDataHelper.js` - Bit data transform
  - `UpdatePipeline.js` - Update orchestration
  - `offset/` - Multi-stage offset pipeline

### `src/panel/`

- **Purpose:** Panel and bits management
- **Contains:** PanelManager, BitsManager, BitsTableManager, PathEditor
- **Key files:**
  - `PanelManager.js` - Panel shape (524 lines)
  - `BitsManager.js` - Bit management (3339 lines)
  - `BitsTableManager.js` - Bit table UI

### `src/scheduling/`

- **Purpose:** CSG operation scheduling
- **Contains:** CSGScheduler
- **Key files:** `CSGScheduler.js`

### `src/selection/`

- **Purpose:** Selection state management
- **Contains:** SelectionManager
- **Key files:** `SelectionManager.js`

### `src/state/`

- **Purpose:** Reactive application state
- **Contains:** AppState
- **Key files:** `AppState.js` (177 lines)

### `src/three/`

- **Purpose:** 3D visualization with Three.js
- **Contains:** ThreeModule, SceneManager, CSGEngine, materials, geometry
- **Key files:**
  - `ThreeModule.js` - Main 3D module (3374 lines)
  - `SceneManager.js` - Three.js scene setup
  - `CSGEngine.js` - three-bvh-csg operations
  - `ExtrusionBuilder.js` - Path to 3D
  - `ManifoldCSG.js` - manifold-3d integration

### `src/ui/`

- **Purpose:** User interface
- **Contains:** UIModule, press events
- **Key files:** `UIModule.js`, `pressEvents.js`

### `src/utils/`

- **Purpose:** Utility functions
- **Contains:** Math, geometry, validation helpers
- **Key files:** `utils.js`, `formulaPolicy.js`, `meshRepair.js`, `fillet.js`

## Key File Locations

### Entry Points

- `src/script.js` - Main application (3852 lines)
- `src/app/main.js` - Module registration (25 lines)
- `index.html` - Web entry (HTML + CDN scripts)

### Configuration

- `src/config/AppConfig.js` - Central config class
- `src/config/constants.js` - Magic numbers
- `src/state/AppState.js` - Reactive state

### Core Framework

- `src/core/app.js` - Application bootstrap
- `src/core/BaseModule.js` - Module base
- `src/core/dependencyContainer.js` - DI container
- `src/core/eventBus.js` - Event system
- `src/core/LoggerFactory.js` - Logging

### 2D Canvas

- `src/canvas/CanvasManager.js` - SVG canvas
- `src/panel/BitsManager.js` - Bit rendering (3339 lines)

### 3D Visualization

- `src/three/ThreeModule.js` - Main 3D (3374 lines)
- `src/three/SceneManager.js` - Three.js setup

### Operations

- `src/operations/CustomOffsetProcessor.js` - Offsets
- `src/operations/PaperBooleanProcessor.js` - Booleans
- `src/operations/UpdatePipeline.js` - Update chain

## Naming Conventions

### Files

- **Classes:** CamelCase, e.g., `CanvasManager.js`, `ThreeModule.js`
- **Utilities:** Lowercase with dashes for helpers, e.g., `zoomUtils.js`, `meshRepair.js`
- **Config:** CamelCase, e.g., `AppConfig.js`, `constants.js`

### Directories

- **Modules:** CamelCase for domain areas, e.g., `canvas`, `three`, `panel`
- **Subdirectories:** camelCase for tools, e.g., `editor/tools`, `editor/snaps`
- **Operations:** Lowercase for pipelines, e.g., `operations/offset`

### Classes

- **Modules:** CamelCase ending with Module, e.g., `CanvasModule`, `ThreeModule`
- **Managers:** CamelCase ending with Manager, e.g., `CanvasManager`, `BitsManager`
- **Utilities:** CamelCase or functional, e.g., `LoggerFactory`, `zoomUtils`

### Variables & Functions

- **Functions:** camelCase, e.g., `initialize()`, `updateBit()`
- **Constants:** UPPER_SNAKE_CASE, e.g., `DEFAULT_STROKE_BASE`
- **Private:** Prefix with underscore, e.g., `_startPoint`, `_internalState`

## Where to Add New Code

### New Feature (2D)

- **Primary code:** `src/panel/` or `src/editor/`
- **Tests:** `tests/` (Vitest)
- **Example:** Add new bit type → `src/bits/BitRegistry.js`

### New Feature (3D)

- **Primary code:** `src/three/`
- **Tests:** `tests/`
- **Example:** New material → `src/three/MaterialManager.js`

### New Tool (Editor)

- **Implementation:** `src/editor/tools/NewToolName.js`
- **Base class:** Extend `BaseTool` from `src/editor/tools/BaseTool.js`
- **Register:** Add to tool palette in `src/editor/EditorToolbar.js`

### New Operation

- **Implementation:** `src/operations/` or `src/operations/offset/`
- **Pipeline:** Integrate into `src/operations/UpdatePipeline.js`

### New Utility

- **Implementation:** `src/utils/`
- **Naming:** `utilityName.js` or group related utils

### New Module

- **Implementation:** New directory under `src/`
- **Base:** Extend `BaseModule` from `src/core/BaseModule.js`
- **Registration:** Add to `src/app/main.js`

## Special Directories

### `tests/`

- **Purpose:** Vitest unit tests
- **Structure:** Mirrors src/ structure
- **Config:** `vitest.config.js`

### `docs/`

- **Purpose:** Project documentation
- **Contains:** ARCHITECTURE.md, API_REFERENCE.md, guides
- **Generated:** No (manual)

### `styles/`

- **Purpose:** CSS stylesheets
- **Contains:** `styles.css`

### `.opencode/`, `.claude/`, `.github/`

- **Purpose:** AI agent configs, hooks, workflows
- **Generated:** Yes (agent configs)

---

_Structure analysis: 2026-03-29_
