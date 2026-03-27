# Facade Section Editor - Claude Code

## Overview
This is a 3D modeling application for furniture facade design using router bits and CNC operations.

## Quick Reference
- **Stack**: Vanilla JS, Vite, Three.js, Paper.js
- **Build**: `npm run dev`, `npm run build`, `npm run test`
- **Docs**: See `docs/ARCHITECTURE.md` for full details

## Key Principles
1. **Modular Architecture**: BaseModule with dependency injection, Event Bus for communication
2. **Signature-Based CSG**: ThreeModule uses bit signatures to prevent unnecessary rebuilds
3. **2D/3D Sync**: Real-time coordinate transformation between SVG (Y-down) and Three.js (Y-up)

## Critical Gotchas
- **NEVER modify ThreeModule signatures without updating bit parameters**
- **ALWAYS transform coordinates between 2D and 3D systems**
- **Test in both 2D and 3D views before committing**

## Testing Checklist
- [ ] Add/move/delete bits with proper visualization
- [ ] V-Carve operations with phantom bit calculations
- [ ] View synchronization between 2D and 3D
- [ ] DXF export with proper offset handling

## Important Files
- `src/app/main.js` — Module registration
- `src/core/LoggerFactory.js` — Logging (use for all new code)
- `src/three/ThreeModule.js` — 3D visualization & CSG
- `docs/ARCHITECTURE.md` — Detailed architecture reference

## Reading AGENTS.md
For comprehensive project information, also read `AGENTS.md` in the project root.