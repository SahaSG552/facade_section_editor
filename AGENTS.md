# Facade Section Editor

3D furniture facade design application using router bits and CNC operations.

## Stack
- **Runtime**: Vanilla JavaScript (ES Modules)
- **Build**: Vite 7.3, Vitest 4.1
- **3D**: Three.js r182, three-bvh-csg, manifold-3d
- **2D**: Paper.js r12
- **Mobile**: Capacitor 5 (Android/iOS)

## Commands
```bash
npm run dev        # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Run tests (Vitest)
npm run cap:sync  # Sync Capacitor
```

## Architecture

### Key Modules
- `src/app/main.js` — Module registration & dependency container
- `src/core/LoggerFactory.js` — Logging system
- `src/three/ThreeModule.js` — 3D visualization & CSG
- `CanvasManager`, `BitsManager`, `PanelManager` — 2D canvas management
- `InteractionManager` — Mouse/touch handling
- `SelectionManager` — Bit selection state

### Patterns
- **Dependency Injection**: BaseModule class with service container
- **Event Bus**: Global events for cross-module communication
- **Callback Pattern**: Module callbacks for external coordination
- **Signature-Based CSG**: Bit signatures prevent unnecessary 3D rebuilds

## Code Style

### Logging
```javascript
import LoggerFactory from "../core/LoggerFactory.js";
const log = LoggerFactory.createLogger("ModuleName");
log.debug("Debug info"); log.info("Info"); log.warn("Warning"); log.error("Error", err);
```

### JSDoc
All public methods require:
- Parameter types and descriptions
- Return value descriptions
- Exception documentation

### Performance
- Signature caching for ThreeModule
- ResizeObserver for canvas updates
- Proper geometry disposal

## Critical Rules

**NEVER:**
- Modify ThreeModule signatures without updating bit parameters
- Skip coordinate transformation between 2D (Y-down) and 3D (Y-up) systems

**ALWAYS:**
- Test in both 2D and 3D views before committing
- Follow logging standards for all new code

## Key Files
- `docs/ARCHITECTURE.md` — Detailed architecture
- `docs/DEVELOPMENT_CHECKLIST.md` — Development standards

## Dependencies
- Three.js: 3D with BVH-CSG
- manifold-3d: Geometric processing & CSG
- Paper.js: 2D path processing & DXF export

## Coordinate Systems
- SVG/Paper.js: Y-down, origin top-left
- Three.js: Y-up, origin panel center
- Panel anchor: Top-left or bottom-left reference

## Skills & Agents

### Available Agents
Use `@agent-name` to invoke:
- `@cad-engineer` — CAD/CAM geometry expert
- `@threejs-specialist` — Three.js 3D rendering
- `@csg-expert` — CSG operations specialist
- `@facade-designer` — UI/UX designer
- `@facade-tasks` — General tasks

### Available Skills
Use `skill({ name: "skill-name" })`:
- `cad-geometry` — Computational geometry, offset curves, boolean ops
- `paperjs-mastery` — Paper.js path operations
- `csg-threejs` — Three.js CSG and mesh operations
- `test-facade` — Run Vitest tests
- `build-facade` — Build project

### Recommended Libraries
| Library | Purpose | Install |
|---------|---------|---------|
| `manifold-3d` | CSG operations |manifold-3d |
| `three-bvh-csg` | Three.js CSG | three-bvh-csg |
| `polytree` | Octree CSG + spatial | @jgphilpott/polytree |
| `robust-predicates` | Safe floating-point math | robust-predicates |
| `paperjs-offset` | Bezier offsetting | paperjs-offset |
| `paper-clipper` | Fast polygon boolean (WASM) | paper-clipper |
| `geometric` | Point/line math | geometric |
| `2d-geometry` | TypeScript 2D lib | 2d-geometry |

### Key Geometry Patterns

#### Coordinate Transform
```javascript
// Paper.js → Three.js
function paperToWorld(paperPoint, panelCenter, panelHeight) {
  return {
    x: paperPoint.x - panelCenter.x,
    y: panelCenter.y - paperPoint.y,  // Flip Y
    z: 0
  };
}
```

#### Robust Orientation Test
```javascript
import { orient2d } from 'robust-predicates';
const isCCW = orient2d(ax, ay, bx, by, cx, cy) > 0;
```

#### Bit Offset
```javascript
import { PaperOffset } from 'paperjs-offset';
const offsetPath = PaperOffset.offset(path, bitRadius, { join: 'round' });
```

---

## LLM Wiki System

This project uses LLM Wiki pattern for knowledge management.

### Structure
- `raw/` - Source documents (immutable)
- `.wiki/` - Generated wiki pages
- `WIKI.md` - Schema and conventions

### Wiki Pages
- **Entities**: bits.md, operations.md, panels.md, modules.md, libraries.md
- **Concepts**: offset.md, v-carve.md, pocketing.md, coordinate-systems.md, csg.md, extrusion.md
- **Sources**: External documentation summaries

### Operations

**Ingest** - Add new source:
1. Add source to `raw/[category]/`
2. Use: `skill({ name: "ingest-wiki" })`
3. Updates index and log automatically

**Query** - Find information:
1. Start with `.wiki/index.md`
2. Read relevant pages
3. Synthesize answer with citations

**Maintain** - Health check:
1. Use: `skill({ name: "maintain-wiki" })`
2. Fix: contradictions, orphans, gaps
3. Log action

### Key Files
- `.wiki/index.md` - Always read first for knowledge lookup
- `.wiki/log.md` - Recent activity
- `WIKI.md` - Full schema

### Wiki Skills
- `ingest-wiki` - Process new sources
- `query-wiki` - Find information  
- `maintain-wiki` - Health check