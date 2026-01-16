# AGENTS.md

## Project Overview

**facade_section_editor** is a modular web application for designing cross-sections of furniture facades using router bits and CNC operations. It supports both 2D and 3D visualization, Boolean and offset operations, and is architected for extensibility and maintainability.

- **Main goal:** Generate and edit facade cross-sections, preview toolpaths, and export for CNC/production.
- **Tech stack:** JavaScript (ESM), Vite, Three.js, Paper.js, Maker.js, Capacitor (for mobile), modular architecture.
- **Key features:**
  - Modular codebase (see ARCHITECTURE.md)
  - 2D/3D synchronized views
  - Boolean/offset operations (switchable engines)
  - Bit (tool) management and visualization
  - Export (DXF, STL planned)
  - Extensible for new bit types, operations, and UI controls

## Setup & Build Commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Capacitor (mobile):
  - Init: `npm run cap:init`
  - Add Android: `npm run cap:add:android`
  - Add iOS: `npm run cap:add:ios`
  - Sync: `npm run cap:sync`
  - Build Android: `npm run cap:build:android`
  - Build iOS: `npm run cap:build:ios`

## Testing Instructions

- See `docs/TESTING_GUIDE.md` for full checklists and manual/console test cases.
- Boolean engine testing: `docs/TESTING_BOOLEAN_ENGINE.md`
- Run all manual tests before merging changes.
- No automated tests yet (add tests for new modules where possible).

## Code Style & Conventions

- Use ES6+ modules and features (import/export, arrow functions, destructuring, etc.)
- Prefer functional patterns and stateless helpers
- Use single quotes, no semicolons (except where required)
- Organize code into modules by domain (see ARCHITECTURE.md)
- Log using `LoggerFactory` (see DEVELOPMENT_CHECKLIST.md)
- Document all public methods (see API_REFERENCE.md)
- UI: Style via `styles/styles.css`, keep UI logic in `ui/` and `panel/`

## Key Modules & Files

- `src/script.js` — Main orchestrator, event coordination
- `src/panel/PanelManager.js` — Panel geometry and anchor
- `src/panel/BitsManager.js` — Bit (tool) shape and profile logic
- `src/canvas/CanvasManager.js` — SVG canvas, zoom, pan
- `src/three/ThreeModule.js` — 3D view, CSG, extrusion
- `src/operations/` — Boolean/offset logic (Paper.js, Maker.js)
- `src/data/` — Bit definitions and storage
- `src/core/` — App bootstrap, DI, event bus
- `src/utils/` — Geometry, offset, export helpers

## Adding Features / Extending

- See `docs/INTEGRATION_GUIDE.md` for step-by-step guides:
  - Adding new bit types (shapes)
  - Adding new operations (e.g., chamfer, v-carve)
  - UI/UX extension patterns
  - Data flow and event bus usage
- Follow module communication patterns (see ARCHITECTURE.md)
- Update API docs for new public methods

## 2D/3D Synchronization

- Always update `buildPanelBitsSignature()` in `ThreeModule.js` when adding bit/operation parameters (see DEVELOPMENT_CHECKLIST.md)
- Ensure all changes in 2D (panel, bits, operations) are reflected in 3D view

## Logging & Debugging

- Use `LoggerFactory` for all new modules
- Log at appropriate levels: debug, info, warn, error
- Add logs for state changes, errors, and important branches

## Boolean & Offset Engines

- Boolean operations: switchable between Maker.js and Paper.js (see TESTING_BOOLEAN_ENGINE.md)
- 3D CSG: uses `three-bvh-csg` (see CSG_IMPLEMENTATION.md)
- Offset: Paper.js and custom offset logic

## Security & Data

- No sensitive data stored; user bits saved in `userBits.json`
- Validate all user input for geometry and bit parameters
- No authentication/authorization by default

## Deployment

- Build with `npm run build` (output in `dist/`)
- For mobile, use Capacitor commands to sync/build for Android/iOS
- Static hosting: deploy `dist/` to any static server

## Agent-Specific Instructions

- Always check for the closest `AGENTS.md` (subfolders may override root)
- Use the documentation index in `docs/DOCUMENTATION_SUMMARY.md` for navigation
- Prefer updating documentation and checklists when adding new features
- Run all manual tests and update test docs/checklists before completing a task
- If unsure, consult `ARCHITECTURE.md` and `API_REFERENCE.md` for module boundaries and method signatures

---

For full documentation, see the `docs/` folder and the summary in `docs/DOCUMENTATION_SUMMARY.md`.
