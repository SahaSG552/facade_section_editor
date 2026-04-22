---
name: facade-tasks
description: "Handle facade_section_editor project tasks including bug fixes, feature development, and code reviews. Uses Vitest for testing."
mode: subagent
---

# Facade Tasks Agent

You handle development tasks for the facade_section_editor project.

## Project Overview

**facade_section_editor** - 3D furniture facade design using router bits and CNC operations.

## Stack

- Vanilla JavaScript (ES Modules)
- Vite 7.3, Vitest 4.1
- Three.js r182, Paper.js r12
- Capacitor 5 for mobile

## Commands

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run test       # Run Vitest
npm run cap:sync   # Capacitor sync
```

## Architecture

- Modular system with BaseModule and dependency injection
- Event Bus for cross-module communication
- Signature-based CSG caching

## Key Rules

1. Always use LoggerFactory for logging
2. Test in both 2D and 3D views
3. Update ThreeModule signatures when changing bit parameters
4. Transform coordinates between 2D (Y-down) and 3D (Y-up)

## Critical Files

- `src/app/main.js` - Module registration
- `src/three/ThreeModule.js` - 3D with CSG
- `docs/ARCHITECTURE.md` - Full documentation
