# Facade Section Editor - AI Instructions

## Project Overview
This is a sophisticated 3D modeling application for furniture facade design using router bits and CNC operations. The application features a modular architecture with 2D SVG, 2D Paper.js, and 3D Three.js views, supporting complex bit operations and Constructive Solid Geometry (CSG).

## Architecture & Patterns

### Modular System
- **Dependency Injection**: Uses `BaseModule` class with service container pattern
- **Event Bus**: Global event system for cross-module communication
- **Module Registration**: All modules registered in `src/app/main.js` with dependency container
- **Callback Pattern**: Modules expose callbacks for external coordination

### Key Modules
- **CanvasManager**: SVG canvas management with zoom, pan, and grid
- **BitsManager**: Bit shape creation and profile path assignment
- **PanelManager**: Panel dimensions, anchor, and shape rendering
- **SelectionManager**: Bit selection state and visual highlighting
- **ThreeModule**: 3D visualization with Three.js and CSG operations
- **InteractionManager**: Mouse/touch input handling for canvas interaction

## Development Standards

### Logging
```javascript
import LoggerFactory from "../core/LoggerFactory.js";
const log = LoggerFactory.createLogger("ModuleName");
log.debug("Detailed debug info");
log.info("General operation info");
log.warn("Potential issues");
log.error("Critical errors", errorObject);
```

### JSDoc Requirements
All public methods must have JSDoc with:
- Parameter types and descriptions
- Return value descriptions
- Exception documentation
- Usage examples

### Performance Optimization
- **Signature Caching**: ThreeModule uses bit signatures to prevent unnecessary rebuilds
- **ResizeObserver**: Automatic canvas updates on size changes
- **Memory Management**: Geometry disposal and proper cleanup

## Critical Workflows

### Bit Operations
1. **Adding Bits**: Create bit shape, update table, calculate offsets
2. **Moving Bits**: Update position, recalculate phantom bits and offset contours
3. **V-Carve Operations**: Multi-pass calculations with phantom bit visualization
4. **Pocketing (PO)**: Two-offset system with main and phantom bits

### View Management
- **2D View**: SVG canvas with bit operations and offset visualization
- **2D Paper.js View**: Alternative 2D rendering with path processing
- **3D View**: Three.js with CSG operations and material support
- **View Synchronization**: Real-time updates between 2D and 3D views

### Build System
- **Vite Configuration**: Custom plugins for WASM handling and dependency optimization
- **Mobile Support**: Capacitor integration for Android/iOS deployment
- **Development Scripts**: `npm run dev`, `npm run build`, `npm run preview`

## Complex Patterns

### Coordinate Systems
- **SVG Canvas**: Y-down, origin at top-left
- **Paper.js**: Y-down, origin at top-left
- **Three.js**: Y-up, origin at panel center
- **Panel Anchor**: Top-left or bottom-left reference points

### Path Modification
- **Mitered Extrusion**: For V-Carve operations with sharp corners
- **Round Extrusion**: For standard operations with smooth corners
- **Arc Approximation**: Bezier to arc conversion for DXF compatibility

### CSG Operations
- **Signature-Based**: Bit signatures prevent unnecessary 3D rebuilds
- **Multi-Pass**: V-Carve operations with intermediate depth calculations
- **Material Support**: Different materials with edge display options

## Integration Points

### External Dependencies
- **Three.js**: 3D visualization with BVH-CSG
- **manifold-3d**: Geometric processing and CSG operations
- **Paper.js**: 2D path processing and offset calculations
- **Maker.js**: Path processing and DXF export

### Cross-Module Communication
- **Event Bus**: Global events for application state changes
- **Callback Pattern**: Module-specific coordination
- **Dependency Injection**: Service access across modules

## Testing Checklist
- [ ] Add/move/delete bits with proper visualization
- [ ] V-Carve operations with phantom bit calculations
- [ ] View synchronization between 2D and 3D
- [ ] DXF export with proper offset handling
- [ ] Mobile app functionality via Capacitor
- [ ] Performance with large bit counts

## Key Files
- `src/script.js`: Main application orchestration
- `src/core/app.js`: Application bootstrap and module management
- `src/three/ThreeModule.js`: 3D visualization and CSG operations
- `docs/ARCHITECTURE.md`: Detailed architectural documentation
- `docs/DEVELOPMENT_CHECKLIST.md`: Development standards and patterns

## Important Notes
- Always update ThreeModule signatures when adding new bit parameters
- Use proper coordinate transformations between 2D and 3D systems
- Follow logging and documentation standards for all new code
- Test thoroughly in both 2D and 3D views before committing changes